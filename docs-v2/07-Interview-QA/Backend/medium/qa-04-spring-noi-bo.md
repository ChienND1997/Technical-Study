# Câu hỏi: Spring bên trong

Kiến thức gốc: [Spring Boot Medium](/go?p=01-Spring-Boot%2Fmedium%2Findex.md).

Mỗi câu theo chuỗi suy ngược: **Câu hỏi** (theo hiện tượng, tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả "vì A nên B"), **Đáp án ngắn**, **Nhớ**, **Ví dụ** truy vết được, rồi các **Hỏi xoáy** (mỗi cái có dòng "Vì sao hỏi tiếp" giải thích vì sao nó là bước kế tiếp). Ví dụ ghi rõ "đã chạy thử" (JDK 11 hoặc Python/sqlite trong môi trường soạn tài liệu, output là output thật) hay "minh họa" (cần Spring, Hibernate hoặc database thật nên chưa chạy ở đây).

**Tóm tắt:**

- Phạm vi file: các cơ chế bên trong Spring Boot hay bị hỏi sâu, từ transaction, AOP, JPA tới bảo mật và vận hành.
- `@Transactional` chạy trong proxy: gọi nội bộ không qua proxy nên không có transaction, và mặc định chỉ rollback với `RuntimeException` hoặc `Error`.
- N+1 là hệ quả của lazy loading, chi phí nằm ở số lần đi về DB; sửa bằng `join fetch`, `@EntityGraph`, `@BatchSize` hoặc DTO; `open-in-view` che lỗi lazy nhưng giữ connection lâu.
- Dirty checking dựa trên snapshot trong persistence context, nên entity managed không cần `save` nhưng đọc hàng loạt thì làm memory phình.
- Filter chạy trước `DispatcherServlet`, Interceptor biết handler, `@ControllerAdvice` chỉ xử lý lỗi của MVC; Spring Security là chuỗi filter, 401 là chưa biết bạn là ai, 403 là không đủ quyền.
- JWT chỉ được ký chứ không được mã hóa và không thu hồi tức thì; OAuth2 là ủy quyền, OIDC thêm authentication; `@Async` và `@Scheduled` mất ThreadLocal và chạy nhiều lần khi có nhiều instance.
- Hay bị hỏi xoáy nhất: vì sao `@Transactional(REQUIRES_NEW)` gọi nội bộ không có tác dụng, cache stampede xử lý thế nào, và retry nhân tải lên dịch vụ đang hỏng ra sao.

## 1. `@Transactional` hoạt động thế nào? Vì sao đôi khi không có tác dụng?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn đặt `@Transactional(REQUIRES_NEW)` lên `audit()`, nhưng khi `placeOrder()` gọi `this.audit()` thì không có transaction thứ hai nào, hoặc lỗi xảy ra mà dữ liệu vẫn không rollback. `@Transactional` hoạt động thế nào và vì sao đôi khi không có tác dụng?

**Gợi ý suy luận:**
- Spring không sửa code của bạn. Vậy ai mở transaction, gọi method, rồi commit/rollback: có object nào đứng giữa không (proxy)?
- Bean trong container là proxy hay bean thật? Controller gọi vào cái nào?
- Trong `placeOrder()`, `this` trỏ tới object nào? Call `this.audit()` có đi qua proxy không?

**Lập luận:** Vì Spring không sửa code của bạn, nó bọc bean trong một proxy; chính proxy mở transaction, gọi bean thật, rồi commit hoặc rollback. Controller được tiêm proxy nên `service.placeOrder()` đi qua proxy và có transaction. Nhưng bên trong bean thật, `this` là bean thật chứ không phải proxy, nên `this.audit()` không đi qua proxy, không có transaction riêng và `REQUIRES_NEW` bị bỏ qua. Vậy mọi trường hợp "`@Transactional` không chạy" quy về một điều: call không đến proxy. Điểm dễ nhầm là cho rằng có annotation là đủ: nó chỉ có hiệu lực khi lời gọi đi vào bean qua proxy, và mặc định proxy chỉ rollback với `RuntimeException`/`Error`, nên checked exception vẫn commit nếu không khai báo `rollbackFor`. Khi gặp "không có transaction", việc đầu tiên là hỏi lời gọi có đi qua proxy không (self-invocation, method `private`/`final`), rồi mới xét `rollbackFor` và thread khác.

**Đáp án ngắn:** `@Transactional` chạy trong proxy bọc quanh bean: proxy `begin`, gọi bean thật, rồi `commit` (hoặc `rollback` khi có `RuntimeException`/`Error`). Gọi nội bộ qua `this` không đi qua proxy nên không có transaction.

**Nhớ:** Muốn `audit()` có transaction riêng thì tách sang bean khác và tiêm vào. Chỉ đặt `@Transactional` trên method `public` của bean được tiêm từ ngoài.

**Ví dụ:** mô phỏng đúng cơ chế bằng JDK dynamic proxy. `placeOrder()` gọi `this.audit()`, và `audit()` mong muốn có transaction riêng.

```java
interface OrderService { void placeOrder(); void audit(); }

class OrderServiceImpl implements OrderService {
    public void placeOrder() { System.out.println("  placeOrder: ghi đơn hàng"); this.audit(); }
    public void audit()      { System.out.println("  audit: ghi log kiểm toán (muốn REQUIRES_NEW)"); }
}
// proxy: in "BEGIN tx" trước, "COMMIT" sau mỗi lời gọi đi qua nó
```

Output thật khi chạy `main`:

```text
== gọi từ ngoài qua proxy ==
[proxy] BEGIN tx cho placeOrder
  placeOrder: ghi đơn hàng
  audit: ghi log kiểm toán (muốn REQUIRES_NEW)
[proxy] COMMIT placeOrder
== gọi trực tiếp audit() qua proxy ==
[proxy] BEGIN tx cho audit
  audit: ghi log kiểm toán (muốn REQUIRES_NEW)
[proxy] COMMIT audit
```

Khi `placeOrder` chạy, **không có dòng `BEGIN tx cho audit`**: `audit` chạy bên trong transaction của `placeOrder`, `REQUIRES_NEW` bị bỏ qua. _Đã chạy thử (JDK 11)._

Cách sửa trong Spring (minh họa): tách `audit` sang bean khác để call đi qua proxy của bean đó.

```java
@Service class AuditService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void audit() { /* ... */ }
}
@Service class OrderService {
    private final AuditService audit;           // inject, gọi qua proxy
    @Transactional public void placeOrder() { /* ... */ audit.audit(); }
}
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Method `throw new IOException()` (checked) trong `@Transactional`, dữ liệu có rollback không?
**Vì sao hỏi tiếp:** Đã hiểu proxy quyết định có rollback hay không. Vậy với `IOException` (checked) ném ra, proxy xử lý thế nào?
**Đáp:** Không. Quy tắc mặc định lấy từ EJB cũ: chỉ `RuntimeException` và `Error` gây rollback, vì checked exception được xem là tình huống nghiệp vụ "có thể phục hồi". Muốn rollback phải khai báo `@Transactional(rollbackFor = IOException.class)`. Hậu quả điển hình: cập nhật nửa chừng được commit vì exception checked bị ném ra.

**Hỏi xoáy 2:** Bắt exception bằng `try/catch` bên trong method thì sao?
**Vì sao hỏi tiếp:** Proxy chỉ thấy method kết thúc ra sao. Nếu bên trong tự `try/catch` nuốt exception thì proxy thấy gì?
**Đáp:** Proxy chỉ thấy method **kết thúc bình thường**, nên commit. Muốn bắt lỗi mà vẫn rollback phải ném lại, hoặc gọi `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`. Một kịch bản khó hiểu hơn: method trong cùng transaction gọi method khác (cũng `REQUIRED`) bị rollback; transaction đã bị đánh dấu `rollback-only`, nên dù bên ngoài catch, lúc commit vẫn nhận `UnexpectedRollbackException`.

**Hỏi xoáy 3:** Method `private` hoặc `final` có được bọc không?
**Vì sao hỏi tiếp:** Proxy CGLIB là subclass ghi đè method. Điều đó nói gì về method `private` hoặc `final`?
**Đáp:** Proxy CGLIB là **subclass** ghi đè method; `private` và `final` không ghi đè được nên không có advice. Method `protected`/package-private chỉ được hỗ trợ với proxy class ở Spring 6 trở lên; kiểm tra lại theo phiên bản bạn dùng. Quy tắc an toàn: chỉ đặt `@Transactional` trên method `public` của bean được inject từ ngoài.

**Sai lầm hay gặp:** Đặt `@Transactional` trên method `private` hoặc gọi chéo trong cùng class rồi thấy "chạy bình thường" trong test (vì không lỗi), nhưng dữ liệu không rollback khi có lỗi ở production.

## 2. Giải thích AOP và proxy trong Spring.

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Hàng trăm method cần cùng một việc (mở transaction, ghi log, kiểm tra quyền, đo thời gian). AOP giải quyết thế nào trong Spring, và proxy được tạo ở thời điểm nào, bằng loại nào?

**Gợi ý suy luận:**
- Nếu muốn chèn một việc trước và sau mọi call mà không sửa từng method thì cần chặn cái gì (call method)?
- Chặn call khi chạy thì cần một object thay thế bean thật: ai tạo nó, vào lúc nào trong lifecycle bean?
- Object thay thế có thể là class cài interface hoặc subclass: mỗi loại đòi hỏi điều kiện gì?

**Lập luận:** Vì việc lặp lại ở nhiều method nên AOP chặn call method và chèn việc trước và sau. Spring làm điều đó lúc chạy: một `BeanPostProcessor` (bộ tạo auto-proxy) chạy sau khi bean được khởi tạo, và nếu bean khớp pointcut thì thay bean bằng proxy. Proxy có hai dạng: JDK proxy sinh class cài interface (bean phải có interface), CGLIB sinh subclass (class và method không được `final`). Khác với AspectJ sửa bytecode lúc compile, Spring chỉ chặn được call đi qua proxy. Điểm dễ nhầm là nghĩ AOP của Spring chạy cho mọi call như AspectJ; nó chỉ chặn call đi từ bên ngoài vào method `public` của bean được proxy, nên self-invocation, method `private` và class `final` đều lọt qua. Hệ quả: khi cần advice cho call nội bộ thì tách ra bean khác hoặc dùng AspectJ weaving, và đừng đặt logic bắt buộc (như bảo mật) ở nơi có thể bị gọi bỏ qua proxy.

**Đáp án ngắn:** Spring AOP bọc bean trong proxy tại lúc khởi tạo bean, chặn call method để chạy advice trước và sau. Có hai loại proxy: JDK (theo interface) và CGLIB (subclass), Spring Boot mặc định CGLIB.

**Nhớ:** Aspect (module logic xuyên suốt), pointcut (chọn method), advice (`@Before`, `@After`, `@Around`), join point (call method).

Hai loại proxy:

| | JDK dynamic proxy | CGLIB |
|---|---|---|
| Cách tạo | Sinh class implement **interface** | Sinh **subclass** của class mục tiêu |
| Điều kiện | Bean phải có interface | Class không `final`, method không `final` |
| Mặc định trong Spring Boot | Không | **Có** (`spring.aop.proxy-target-class=true`) |

Thuật ngữ: **aspect** (module chứa logic xuyên suốt), **pointcut** (chọn method nào), **advice** (`@Before`, `@After`, `@Around`), **join point** (điểm có thể chặn, trong Spring là call method).

**Ví dụ:** advice `@Around` đo thời gian (minh họa).

```java
@Aspect @Component
class TimingAspect {
    @Around("execution(* com.shop.service..*(..))")
    Object time(ProceedingJoinPoint pjp) throws Throwable {
        long t0 = System.nanoTime();
        try { return pjp.proceed(); }                       // gọi bean thật
        finally { log.info("{} {} ms", pjp.getSignature(), (System.nanoTime() - t0) / 1_000_000); }
    }
}
```

`pjp.proceed()` tương đương dòng `m.invoke(target, a)` trong proxy ở câu 1: advice **là** phần code quanh call bean thật. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao Spring Boot mặc định dùng CGLIB thay vì JDK proxy?
**Vì sao hỏi tiếp:** Cả hai loại đều chặn được call. Vậy vì sao Spring Boot chọn CGLIB làm mặc định?
**Đáp:** Với JDK proxy, lập trình viên inject bằng **kiểu class cụ thể** (`OrderServiceImpl`) sẽ lỗi `ClassCastException` vì proxy chỉ là một `OrderService` (interface), không phải `OrderServiceImpl`. CGLIB là subclass nên cả hai kiểu đều hợp lệ, ít bất ngờ hơn.

**Hỏi xoáy 2:** Proxy CGLIB có gây lỗi gì khó thấy?
**Vì sao hỏi tiếp:** CGLIB là subclass nhưng proxy là object riêng. Điều này gây lỗi khó thấy nào?
**Đáp:** Truy cập **field trực tiếp** trên một proxy CGLIB trả `null` hoặc giá trị mặc định: proxy là object riêng, field nằm trong bean thật; chỉ method mới được ủy quyền. Cũng vì thế nên dùng getter thay vì truy cập field khi nhận một bean đã bị proxy. Ngoài ra method `final` bị bỏ qua advice một cách im lặng. _Minh họa theo cơ chế, chưa chạy thử._

**Sai lầm hay gặp:** Kỳ vọng aspect chạy trên `this.method()` hoặc trên bean tự tạo bằng `new`. Cả hai không đi qua container nên không có proxy.

## 3. Auto-configuration hoạt động ra sao?

**Câu hỏi:** Thêm một starter vào `pom.xml` là có sẵn `ObjectMapper`, `DataSource`... mà không cấu hình gì. Auto-configuration hoạt động thế nào, và vì sao khai báo bean của riêng mình lại "thắng"?

**Gợi ý suy luận:**
- Starter thực chất mang theo cái gì ngoài thư viện (danh sách class cấu hình)?
- Mỗi class cấu hình tự quyết "có nên bật không" bằng điều kiện nào (có class trên classpath, chưa có bean, có property)?
- Nếu bạn đã khai báo một bean cùng kiểu thì điều kiện "chưa có bean" còn đúng không?

**Lập luận:** Vì starter chỉ là danh sách class cấu hình trong file `AutoConfiguration.imports`, lúc khởi động Spring Boot nạp danh sách rồi đánh giá điều kiện của từng class. Điều kiện `OnClass` kiểm tra thư viện có trên classpath, `OnProperty` kiểm tra cấu hình bật, `OnMissingBean` kiểm tra bạn chưa tự khai báo. Vì `OnMissingBean` được đánh giá dựa trên các bean đã đăng ký (bean người dùng được xử lý trước), nên bean của bạn có trước và bản mặc định lùi lại. "Magic" thực chất là: classpath có thư viện X và bạn chưa định nghĩa bean Y thì tạo Y mặc định. Điểm dễ nhầm là coi auto-configuration là ma thuật không kiểm soát được; nó chỉ là danh sách điều kiện, xem được bằng `--debug` (conditions report) và loại trừ bằng `exclude`. Khi một bean mặc định không như ý, đọc báo cáo xem điều kiện nào pass hoặc fail, rồi tự khai báo bean của mình thay vì sửa đồ có sẵn.

**Đáp án ngắn:** Mỗi class auto-config có điều kiện `@Conditional...`; Spring Boot nạp danh sách trong `AutoConfiguration.imports` và chỉ đăng ký class thỏa điều kiện. Bean bạn tự khai báo làm `OnMissingBean` sai nên bản mặc định lùi lại.

**Nhớ:** Điều kiện thường gặp: `OnClass`, `OnMissingBean`, `OnProperty`. Gỡ lỗi bằng `--debug` hoặc `/actuator/conditions`.

**Ví dụ:** một auto-configuration tối giản (minh họa).

```java
@AutoConfiguration
// chỉ khi có Jackson trên classpath
@ConditionalOnClass(ObjectMapper.class)
public class JsonAutoConfig {
    @Bean
    // bạn đã tự khai báo ObjectMapper? thì nhường
    @ConditionalOnMissingBean
    ObjectMapper objectMapper() { return new ObjectMapper(); }
}
```

Khởi động với `--debug` in "Conditions Evaluation Report"; đoạn trích minh họa (nội dung cụ thể phụ thuộc ứng dụng):

```text
Positive matches:
   JsonAutoConfig matched:
      - @ConditionalOnClass found required class 'ObjectMapper'
Negative matches:
   DataSourceAutoConfiguration:
      Did not match:
         - @ConditionalOnClass did not find required class 'javax.sql.DataSource'
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Khai báo `@Bean DataSource` của riêng mình thì chuyện gì xảy ra với auto-config?
**Vì sao hỏi tiếp:** Ví dụ trên dùng `OnMissingBean`. Vậy nếu mình khai báo `@Bean DataSource` riêng thì chuyện gì xảy ra với auto-config?
**Đáp:** `@ConditionalOnMissingBean` thấy đã có bean cùng kiểu nên bản tự động **lùi lại**. Đó là lý do "ghi đè cấu hình mặc định" chỉ cần khai báo bean của bạn, không cần tắt gì.

**Hỏi xoáy 2:** Ứng dụng khởi động nhưng một tính năng "không tự bật"? Gỡ lỗi từ đâu?
**Vì sao hỏi tiếp:** Khi một tính năng không tự bật, ta cần biết điều kiện nào trượt. Gỡ lỗi bắt đầu từ đâu?
**Đáp:** Chạy với `--debug` hoặc mở `/actuator/conditions`, tìm class cấu hình tương ứng ở "Negative matches" để biết điều kiện nào trượt (thiếu thư viện, thiếu property, hay đã có bean khác). Loại trừ rõ ràng bằng `@SpringBootApplication(exclude = ...)` hoặc `spring.autoconfigure.exclude`.

**Sai lầm hay gặp:** Định nghĩa bean của mình **sau** auto-config theo thứ tự nạp và cho rằng thứ tự quyết định; thực tế điều kiện `OnMissingBean` được đánh giá dựa trên các bean đã đăng ký tại thời điểm đó, nên bean người dùng khai báo (được xử lý trước) luôn thắng.

## 4. N+1 là gì và cách khắc phục?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Màn hình danh sách 100 event kèm vé chạy chậm hẳn, log SQL cho thấy hơn 100 câu `SELECT`. Hiện tượng đó là gì, vì sao xảy ra và sửa thế nào?

**Gợi ý suy luận:**
- ORM làm lazy loading bằng cách phát SQL vào lúc nào (khi bạn chạm vào quan hệ)?
- Duyệt N object cha và chạm quan hệ của mỗi cha thì có bao nhiêu câu SQL, mỗi câu tốn gì (một vòng đi về mạng đến DB)?
- Nếu nạp cha cùng quan hệ trong một câu (`JOIN`) hoặc theo batch (`IN`) thì số vòng đi về còn lại bao nhiêu?

**Lập luận:** Vì lazy loading phát SQL khi bạn chạm vào quan hệ, duyệt N cha và chạm quan hệ của từng cha sinh ra N câu cộng một câu lấy cha: 1 + N. Chi phí nằm ở số lần đi về mạng chứ không phải lượng dữ liệu, nên 101 vòng chậm hơn 1 vòng nhiều lần dù dữ liệu như nhau. Vì thế cách sửa là giảm số vòng: nạp cùng lúc (`join fetch`, `@EntityGraph`), nạp theo batch (`@BatchSize`), hoặc truy vấn thẳng DTO. Điểm dễ nhầm là tưởng lỗi nằm ở câu SQL chậm, trong khi từng câu đều nhanh và chỉ số vòng đi về mới là vấn đề; vì thế chỉ nhìn một câu trong log sẽ không thấy. Khi review, bật log SQL ở test, đếm số câu cho một use case và coi đếm tăng theo số dòng là dấu hiệu N+1. Chọn cách sửa theo nhu cầu: cần cả quan hệ thì `join fetch`, chỉ cần vài cột thì DTO, nhiều quan hệ cùng lúc thì `@BatchSize`.

**Đáp án ngắn:** N+1 là một truy vấn lấy N cha rồi mỗi lần chạm quan hệ lazy lại bắn thêm một truy vấn: 1 + N vòng đi về DB. Sửa bằng `join fetch`/`@EntityGraph`, `@BatchSize` hoặc truy vấn DTO.

**Nhớ:** Đổi sang `EAGER` không hết N+1 (vẫn có thể xảy ra với `findAll`) và bắt mọi use case trả tiền cho dữ liệu chỉ vài use case cần.

**Ví dụ:** 100 event, 500 vé; đếm số câu `SELECT` thực sự gửi tới DB.

```python
events = c.execute("select id,name from event").fetchall()
for e in events:
    # mỗi lần lặp = 1 câu SELECT
    c.execute("select code from ticket where event_id=?", (e[0],)).fetchall()
```

Output thật:

```text
N+1 : 101 câu SELECT (1 + N, N = 100 )
join: 1 câu SELECT
```

Cùng một dữ liệu: 101 vòng đi về so với 1. Mỗi vòng đi về giả sử 1 ms thì chênh 100 ms; nhân với số request đồng thời thì thành sự cố. (Đây là mô phỏng bằng SQLite, thể hiện đúng cơ chế đếm câu lệnh; Hibernate sinh câu SQL tương đương.) _Đã chạy thử (Python/sqlite)._

Cách sửa với Hibernate (minh họa):

```java
@Query("select e from Event e join fetch e.tickets where e.id in :ids")
List<Event> findWithTickets(List<Long> ids);          // 1 câu SQL có JOIN

@EntityGraph(attributePaths = "tickets")
List<Event> findByCity(String city);                    // tái dùng truy vấn derived
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Tại sao `@BatchSize` giảm N xuống còn N/size mà không cần `join fetch`?
**Vì sao hỏi tiếp:** `@BatchSize` không dùng `join fetch` mà vẫn giảm N xuống N/size. Cơ chế nào làm được?
**Đáp:** Khi chạm quan hệ lazy của một cha, Hibernate nạp luôn quan hệ cho cả lô cha cùng loại đang nằm trong persistence context bằng `where event_id in (?, ?, ..., ?)`. Với `size = 50` và 100 cha thì còn 2 câu, thay vì 100.

**Hỏi xoáy 2:** Vì sao `join fetch` kèm phân trang trên collection là bẫy?
**Vì sao hỏi tiếp:** `join fetch` có vẻ là lời giải gọn nhất. Vậy khi kết hợp phân trang trên collection thì có vấn đề gì?
**Đáp:** `join` replication dòng cha theo số con, nên `LIMIT` ở SQL cắt sai số cha. Hibernate buộc phải kéo **toàn bộ** kết quả về rồi phân trang trong memory (có cảnh báo trong log). Cách đúng: phân trang trước trên cha (lấy id), rồi nạp con theo `IN` hoặc `@BatchSize`.

**Sai lầm hay gặp:** Đổi sang `EAGER` để "hết N+1". Quan hệ eager vẫn có thể sinh N+1 (khi dùng `findAll`), và còn làm **mọi** use case phải trả tiền cho dữ liệu chỉ vài use case cần.

## 5. Persistence context và dirty checking?

**Câu hỏi:** Bạn sửa `p1.name = "Binh"` mà không gọi `save`, vậy mà DB được cập nhật lúc commit; còn gọi `find` hai lần thì chỉ có một câu `SELECT`. Persistence context làm điều đó thế nào, và vì sao đọc 100 000 entity thì out of memory?

**Gợi ý suy luận:**
- Hibernate cần biết dòng nào đã thay đổi để sinh `UPDATE`: nếu không bắt bạn gọi `save` thì nó phải nhớ gì lúc nạp (snapshot)?
- Lúc flush nó so sánh cái gì với cái gì? Kết quả khác nhau thì làm gì?
- Cùng id gọi `find` lần hai: nên lấy từ đâu thay vì chạm DB (identity map)?
- Entity nạp vào context khi nào mới được thả ra?

**Lập luận:** Vì phải biết dòng nào thay đổi, Hibernate giữ snapshot lúc nạp từng entity managed; khi flush hoặc commit nó so trạng thái hiện tại với snapshot và sinh `UPDATE` cho entity khác biệt (dirty checking), nên không cần `save`. Persistence context cũng là identity map: cùng id thì lấy lại cùng một object, nên `find` lần hai không chạm DB. Mà entity đã nạp nằm lại trong context (kèm snapshot) đến hết transaction, nên đọc hàng loạt làm memory phình. Khi context đóng, proxy lazy không còn session để nạp nên chạm quan hệ lazy khi đó gây `LazyInitializationException`. Điểm dễ nhầm là gọi `save` cho entity đã managed (thừa) hoặc kỳ vọng thay đổi trên entity detached tự được ghi; dirty checking chỉ chạy với entity còn managed trong transaction đang mở. Khi xử lý hàng loạt, dùng phân trang hoặc `flush`/`clear` định kỳ (hoặc truy vấn DTO, stateless) để context không phình.

**Đáp án ngắn:** Persistence context giữ snapshot và identity map trong một transaction; flush so sánh để sinh `UPDATE`, nên entity managed không cần `save`. Chạm quan hệ lazy sau khi context đóng gây `LazyInitializationException`.

**Nhớ:** `save` (persist) chỉ đặt entity vào context; SQL thật gửi lúc flush/commit, nên lỗi ràng buộc có thể nổ muộn hơn dòng `save`.

**Ví dụ:** persistence context tối giản (identity map + snapshot + flush) mô phỏng đúng ba hành vi.

```java
Person p1 = s.find(1L), p2 = s.find(1L);
System.out.println("cùng id -> cùng object? " + (p1 == p2));
p1.name = "Binh";                       // không gọi save()
System.out.println("DB trước flush: " + db.get(1L));
s.flush();
System.out.println("DB sau flush:  " + db.get(1L));
// sau s.close(): tickets.size() -> LazyInitializationException
```

Output thật:

```text
  SQL: select * from person where id=1
cùng id -> cùng object? true
DB trước flush: An
  SQL: update person set name='Binh' where id=1
DB sau flush:  Binh
LazyInitializationException: session đã đóng
```

Chỉ có **một** câu `select` dù gọi `find` hai lần (lần hai lấy từ identity map), và `UPDATE` chỉ sinh ra khi flush. _Đã chạy thử (JDK 11, bản mô phỏng tối giản chứ không phải Hibernate thật)._

**Hỏi xoáy 1:** Dirty checking tốn gì? Có tắt được không?
**Vì sao hỏi tiếp:** Dirty checking so sánh mọi entity managed lúc flush. Chi phí đó là gì và có tránh được không?
**Đáp:** Tốn memory (giữ snapshot) và CPU (so sánh mọi entity managed lúc flush). Với truy vấn chỉ đọc, đặt `@Transactional(readOnly = true)`: Hibernate đặt flush mode thành MANUAL cho session, bỏ qua dirty checking, và nhiều driver có thể định tuyến sang replica.

**Hỏi xoáy 2:** Vì sao một `for` đọc 100 000 entity làm out of memory?
**Vì sao hỏi tiếp:** Vì entity nằm lại trong context, ta có thể gặp tình huống nào khi xử lý hàng loạt?
**Đáp:** Mọi entity nạp đều **nằm lại** trong persistence context (kèm snapshot) cho đến hết transaction. Xử lý hàng loạt phải `flush()` rồi `clear()` theo batch, hoặc dùng stateless session / truy vấn DTO.

**Sai lầm hay gặp:** Gọi `save` rồi tin "đã ghi DB". `save` (persist) chỉ đặt entity vào context; câu SQL thật được gửi lúc flush/commit, và có thể lỗi ràng buộc tại thời điểm đó chứ không phải tại dòng `save`.

## 6. `FetchType.LAZY` và `EAGER`, `open-in-view`?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Mọi quan hệ `EAGER` thì sao, và `spring.jpa.open-in-view` mặc định `true` làm gì khiến cạn connection pool khi tải tăng?

**Gợi ý suy luận:**
- `EAGER` quyết định nạp quan hệ ở thời điểm khai báo entity, trong khi mỗi use case cần dữ liệu khác nhau: có hợp lý không?
- `LAZY` hoãn quyết định đến lúc dùng, nhưng gặp lỗi gì khi session đã đóng?
- Giữ session (và kết nối DB) mở suốt request để lazy không lỗi thì kết nối bị giữ bao lâu, và pool 10 kết nối chịu được bao nhiêu request/s?

**Lập luận:** Vì nhu cầu dữ liệu khác nhau theo use case, khai báo `EAGER` ép mọi truy vấn trả tiền cho dữ liệu chỉ vài chỗ cần, nên nên khai báo `LAZY` và nạp có chủ đích. `LAZY` ngoài session gây `LazyInitializationException`; `open-in-view` (OSIV) giữ session mở suốt request (cả lúc render JSON) để lỗi đó "không bao giờ xảy ra". Cái giá là kết nối DB bị giữ lâu: với pool 10 và mỗi request giữ 400 ms thì throughput chỉ ~25 request/s, trong khi query thật chỉ 20 ms. Nên tắt OSIV để buộc service nạp đủ dữ liệu. Điểm dễ nhầm là đổi `EAGER` sang `LAZY` rồi gặp `LazyInitializationException` và "chữa" bằng bật lại OSIV, tức là che lỗi thiết kế bằng cách giữ kết nối lâu. Nên tắt OSIV, buộc service nạp đủ dữ liệu cho use case (`join fetch`, DTO) và trả DTO ra controller, để thời gian giữ kết nối chỉ bằng thời gian truy vấn.

**Đáp án ngắn:** Khai báo mọi quan hệ `LAZY` và nạp có chủ đích theo use case (`join fetch`, entity graph, DTO). Nên tắt `spring.jpa.open-in-view` vì nó giữ kết nối DB suốt request.

**Nhớ:** Mặc định JPA: `@ManyToOne`/`@OneToOne` là `EAGER`, `@OneToMany` là `LAZY`. Số liệu 25 request/s là phép tính theo giả định.

**Ví dụ:** dòng thời gian của một request với OSIV bật (minh họa, số liệu giả định).

```text
t=0 ms     controller nhận request, mở EntityManager; service chạy query (kết nối DB được mượn)
t=20 ms    service trả entity về controller
t=20..420  serialize JSON, lazy load thêm quan hệ -> thêm query (N+1 bị che giấu), kết nối DB VẪN bị giữ
           (có thể giữ cho đến khi response gửi xong, tùy cấu hình)
```

Với pool 10 kết nối, nếu mỗi request giữ 400 ms thì throughput tối đa chỉ khoảng 10 / 0,4 = 25 request/s, trong khi query thật chỉ cần 20 ms (500 request/s). _Số liệu tính theo giả định, không đo từ hệ thống thật; minh họa chưa chạy thử._

Cấu hình đúng:

```yaml
spring.jpa.open-in-view: false
```

và chuyển lazy loading vào trong service, ví dụ `@Transactional(readOnly = true)` rồi trả DTO.

**Hỏi xoáy 1:** Tắt OSIV, controller gặp `LazyInitializationException`, sửa thế nào?
**Vì sao hỏi tiếp:** Tắt OSIV thì controller gặp `LazyInitializationException`. Sửa thế nào mà không bật lại?
**Đáp:** Đó chính là lợi ích: lỗi phơi bày chỗ code đang lười tải. Sửa bằng cách nạp đủ trong service (`join fetch`/`@EntityGraph`) và **trả DTO**, không trả entity ra controller. Không bật lại OSIV để "chữa".

**Hỏi xoáy 2:** `@ManyToOne` mặc định là gì và vì sao thành vấn đề?
**Vì sao hỏi tiếp:** Nói về mặc định, `@ManyToOne` là `EAGER`. Điều đó gây vấn đề gì?
**Đáp:** Mặc định của JPA cho `@ManyToOne`/`@OneToOne` là `EAGER`. Truy vấn JPQL không tôn trọng `EAGER`, nên sau câu truy vấn chính, Hibernate bắn thêm truy vấn lẻ cho từng quan hệ: lại là N+1. Đặt `fetch = LAZY` tường minh.

**Sai lầm hay gặp:** Bỏ qua cảnh báo `spring.jpa.open-in-view is enabled by default` khi khởi động rồi gặp sự cố cạn connection pool khi tải tăng.

## 7. Filter, Interceptor và ControllerAdvice khác nhau?

**Câu hỏi:** Ném `IllegalStateException` trong một Filter thì `@RestControllerAdvice` không bắt được và khách nhận trang lỗi 500 mặc định. Filter, Interceptor và ControllerAdvice khác nhau thế nào?

**Gợi ý suy luận:**
- Một request đi qua những tầng nào theo thứ tự (container Servlet, `DispatcherServlet`, controller)?
- Filter đứng trước `DispatcherServlet`: ở thời điểm đó đã biết controller nào sẽ chạy chưa?
- Exception ném trước khi tới `DispatcherServlet` thì có đi vào cơ chế xử lý lỗi của Spring MVC không?

**Lập luận:** Vì ba thành phần nằm ở ba tầng khác nhau của đường đi request: Filter ở tầng Servlet, Interceptor ở Spring MVC (sau `DispatcherServlet`), `@ControllerAdvice` xử lý exception của MVC. Mà Filter đứng trước `DispatcherServlet` nên chưa biết handler nào chạy, còn Interceptor thì biết. Exception ném trong Filter xảy ra trước khi request vào MVC, nên không đến `@ControllerAdvice`, container trả trang lỗi mặc định. Vì vậy trong Filter phải tự ghi phản hồi lỗi hoặc ủy quyền cho `HandlerExceptionResolver`. Điểm dễ nhầm là đặt logic ở sai tầng: kiểm token trong Interceptor thì request tới path không qua MVC (tài nguyên tĩnh, actuator) lọt qua, còn đọc body trong Filter thì phải bọc request vì stream chỉ đọc được một lần. Hệ quả: bảo mật, log, MDC đặt ở Filter; kiểm quyền theo handler ở Interceptor hoặc method security; chuyển exception thành phản hồi ở advice.

**Đáp án ngắn:** Filter ở tầng Servlet (chưa biết controller, dùng cho bảo mật, log, MDC, nén); Interceptor ở tầng MVC (biết handler); `@ControllerAdvice` chuyển exception của MVC thành phản hồi lỗi.

**Nhớ:** Exception trong Filter không vào `@ControllerAdvice`. Logic cần biết controller nào thì đặt ở Interceptor.

Đường đi của request:

```mermaid
flowchart LR
    A["Request"] --> B["Filter (Servlet)"]
    B --> C["DispatcherServlet"]
    C --> D["Interceptor.preHandle"]
    D --> E["Controller"]
    E --> F["Interceptor.postHandle"]
    F --> G["Response"]
    E -.->|"exception"| H["@ControllerAdvice"]
```

| | Filter | Interceptor | `@ControllerAdvice` |
|---|---|---|---|
| Tầng | Servlet | Spring MVC | Spring MVC (xử lý lỗi) |
| Biết handler method | Không | **Có** | Có |
| Dùng cho | Bảo mật, log, MDC, nén | Đo thời gian theo controller, kiểm tra quyền theo annotation | Chuyển exception thành phản hồi lỗi |

**Ví dụ:** exception ném ra trong Filter không đi vào `@ControllerAdvice` (minh họa).

```java
@Component class AuthFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws IOException, ServletException {
        // advice KHÔNG bắt được
        if (req.getHeader("X-Key") == null) throw new IllegalStateException("thiếu key");
        chain.doFilter(req, res);
    }
}
@RestControllerAdvice class Handler {
    // không chạy ở trường hợp trên
    @ExceptionHandler(IllegalStateException.class) ProblemDetail h(IllegalStateException e) { ... }
}
```

Kết quả: khách nhận trang lỗi 500 mặc định của container thay vì JSON lỗi bạn thiết kế, vì request chưa hề tới `DispatcherServlet`. Cách xử lý: tự ghi phản hồi lỗi trong filter, hoặc ủy quyền cho `HandlerExceptionResolver`. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao Spring Security là Filter mà không phải Interceptor?
**Vì sao hỏi tiếp:** Biết Filter chạy trước MVC. Vậy vì sao Spring Security là Filter chứ không phải Interceptor?
**Đáp:** Bảo mật phải chặn request **trước** mọi xử lý của MVC, kể cả tài nguyên tĩnh và request không khớp controller nào. Chỉ tầng Servlet làm được điều đó.

**Hỏi xoáy 2:** Cần đọc body của request trong filter, sau đó controller đọc lại, được không?
**Vì sao hỏi tiếp:** Filter có thể đọc body để log. Điều gì xảy ra nếu controller cũng cần đọc body?
**Đáp:** Body là một thread chỉ đọc một lần; filter đọc xong thì controller thấy rỗng. Phải bọc request bằng `ContentCachingRequestWrapper` (lưu ý: nội dung chỉ có sau khi controller đã đọc) hoặc wrapper tự đệm toàn bộ body.

**Sai lầm hay gặp:** Đặt logic cần biết "controller nào" (ví dụ kiểm tra annotation tùy chỉnh) vào Filter, rồi phải tự phân tích URL.

## 8. Spring Security hoạt động thế nào?

**Câu hỏi:** Gọi `DELETE /orders/7` với token của user thường thì nhận 403, không token thì 401, và mọi controller đều không phải tự kiểm tra gì. Spring Security hoạt động thế nào?

**Gợi ý suy luận:**
- Bảo mật phải chạy trước mọi controller: nó nằm ở tầng nào, và gồm mấy bước nhỏ (đọc token, kiểm CSRF, kiểm quyền)?
- Kết quả authentication lưu ở đâu để các tầng sau hỏi "ai đang gọi?" (SecurityContext gắn thread)?
- Với API gọi bằng header `Authorization`, có cần phiên (session) hay CSRF không?

**Lập luận:** Vì bảo mật phải chặn request trước mọi xử lý, nó là một chuỗi filter (`SecurityFilterChain`) chạy trước `DispatcherServlet`, mỗi filter làm một việc nhỏ. Bước authentication đặt `Authentication` vào `SecurityContext` của thread hiện tại; bước authorization (theo URL hoặc `@PreAuthorize`) so quyền cần có với quyền trong context. Token user thường có `ROLE_USER` nhưng cần `ROLE_ADMIN` nên `AccessDeniedException` (403); không có token thì chưa authentication (401). API dùng header `Authorization` thì không cần phiên (`STATELESS`) và có thể tắt CSRF. Điểm dễ nhầm là phân biệt 401 và 403: 401 là chưa biết bạn là ai (authentication thất bại), 403 là biết bạn nhưng không đủ quyền (authorization). Cũng đừng tin kiểm tra ở frontend, vì chỉ filter chain phía server mới chặn được request tự tạo. Khi review, kiểm tra thứ tự `securityMatchers`, rule cụ thể phải đứng trước rule chung, và `anyRequest().authenticated()` ở cuối để không bỏ sót endpoint.

**Đáp án ngắn:** Spring Security là chuỗi filter chạy trước MVC: authentication rồi đặt `Authentication` vào `SecurityContext`, sau đó authorization theo URL hoặc `@PreAuthorize`. API thường dùng `STATELESS`, JWT trong header, BCrypt cho mật khẩu.

**Nhớ:** 401: chưa authentication. 403: đã authentication nhưng không đủ quyền. Kiểm quyền ở cả tầng nghiệp vụ cho thao tác nhạy cảm.

**Ví dụ:** cấu hình API không phiên (minh họa, Spring Security 6).

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http
        // API dùng header Authorization, không cookie
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(a -> a
            .requestMatchers("/auth/**").permitAll()
            .requestMatchers(HttpMethod.DELETE, "/orders/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        // kiểm tra JWT
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .build();
}
```

Truy vết `DELETE /orders/7` kèm token của user thường: filter JWT giải mã, đặt `Authentication(roles=USER)`; bộ authorization thấy cần `ROLE_ADMIN` nên ném `AccessDeniedException`, phản hồi 403. Không có token thì 401. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao tắt CSRF là chấp nhận được với API dùng JWT trong header, nhưng nguy hiểm với session cookie?
**Vì sao hỏi tiếp:** Ví dụ tắt CSRF. Vì sao điều đó chấp nhận được với JWT trong header nhưng nguy hiểm với session cookie?
**Đáp:** CSRF lợi dụng việc **trình duyệt tự gắn cookie** vào request tới site đích. Header `Authorization` không bao giờ được trình duyệt tự gắn nên trang giả mạo không thể kích hoạt. Nếu bạn lưu JWT trong cookie thì tự động gắn trở lại, CSRF quay lại.

**Hỏi xoáy 2:** `@PreAuthorize` có chạy khi gọi nội bộ trong cùng class không?
**Vì sao hỏi tiếp:** `@PreAuthorize` là advice của proxy. Vậy gọi nội bộ trong cùng class thì sao?
**Đáp:** Không, giống `@Transactional`: nó là advice của proxy (xem câu 1). Một lỗ hổng authorization kiểu này nguy hiểm hơn lỗ hổng transaction vì lặng lẽ cho phép truy cập.

**Sai lầm hay gặp:** Chỉ bảo vệ ở giao diện (ẩn nút) hoặc chỉ ở URL, còn method trong service thì tự do. Nên kiểm tra quyền ở tầng nghiệp vụ cho thao tác nhạy cảm.

## 9. JWT vs session?

**Câu hỏi:** Một người dùng bị lock tài khoản nhưng access token JWT của họ vẫn gọi API được thêm 10 phút. JWT khác session ở điểm nào dẫn đến chuyện này, và nên chọn cái nào?

**Gợi ý suy luận:**
- Server cần biết "request này của ai": nó có thể nhớ (lưu phiên) hoặc không nhớ (client mang dữ liệu). Mỗi cách đổi lấy gì?
- Nếu dữ liệu nằm trong token do client mang, ai bảo đảm client không sửa nó (chữ ký)?
- Server không nhớ gì thì thu hồi một token đã cấp bằng cách nào?

**Lập luận:** Vì session lưu phía server (id ngẫu nhiên trỏ tới dữ liệu) nên thu hồi tức thì nhưng cần kho dùng chung (Redis) khi nhiều instance. JWT mang dữ liệu trong token được ký để không sửa được, nên server không cần nhớ gì, nhưng vì không nhớ nên không thu hồi tức thì: token còn hiệu lực đến hết hạn. Chữ ký chỉ chứng minh không bị sửa chứ không che nội dung: payload ai cũng đọc được. Vậy chọn theo đánh đổi, và dùng access token ngắn hạn kèm refresh token xoay vòng. Điểm dễ nhầm là nghĩ JWT "an toàn hơn" session mặc định: nó chỉ đổi chỗ phải nhớ. Muốn thu hồi tức thì với JWT phải thêm danh sách đen hoặc phiên bản token, tức là quay lại có state. Vì thế chọn session khi cần thu hồi và kiểm soát tập trung, JWT khi nhiều dịch vụ cần xác minh độc lập; luôn đặt hạn ngắn, lưu refresh token an toàn, và không nhét dữ liệu nhạy cảm vào payload.

**Đáp án ngắn:** Session: server nhớ, thu hồi tức thì nhưng cần kho chung. JWT: tự chứa và được ký, không cần kho nhưng có hiệu lực đến hết hạn. JWT chỉ được ký, không được mã hóa.

**Nhớ:** Không đưa dữ liệu nhạy cảm vào payload; kiểm tra chữ ký trước khi tin claim. Xem [Authentication, Phiên và Token](/go?p=03-Network-Security%2Fmedium%2Flt-05-xac-thuc-phien-token.md).

**Ví dụ:** tạo và kiểm tra một JWT HS256 bằng thư viện chuẩn.

```text
token  : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbiIsInJvbGVzIjpbIlVTRVIiXSwiZXhwIjoxODkzNDU2MDAwfQ.AuSEMJGQpGSoRB1Gv8wlRALJasznIXHXA30WczcOXFk
ai cũng đọc được payload: {"sub":"an","roles":["USER"],"exp":1893456000}
chữ ký sau khi sửa payload còn khớp? False
```

Ba phần (header.payload.signature) chỉ là Base64URL; **ai cũng đọc được** nội dung, nên không đưa dữ liệu nhạy cảm vào payload. Nhưng sửa `roles` thành `ADMIN` thì chữ ký (HMAC-SHA256 trên header.payload) không còn khớp, nên server từ chối. Thư viện kiểm chứng phải **kiểm tra chữ ký trước** khi tin bất kỳ claim nào. _Đã chạy thử (Python)._

**Hỏi xoáy 1:** User bị lock tài khoản nhưng access token JWT của họ còn 10 phút. Xử lý thế nào?
**Vì sao hỏi tiếp:** Từ hệ quả "không thu hồi tức thì", user bị lock mà token còn 10 phút thì xử lý thế nào?
**Đáp:** Đó là hệ quả của "không nhớ". Cách giảm: access token ngắn (vài phút), kiểm tra danh sách thu hồi (denylist) cho các token nhạy cảm, hoặc giữ một "phiên bản token" (`token_version`) trong DB và so sánh. Mỗi cách đều **thêm lại trạng thái** phía server; đó là cái giá không tránh được.

**Hỏi xoáy 2:** HS256 và RS256 khác gì, khi nào chọn cái nào?
**Vì sao hỏi tiếp:** Chữ ký là thứ giữ JWT không bị sửa. Vậy HS256 và RS256 khác nhau thế nào, chọn khi nào?
**Đáp:** HS256 dùng **một secret key chung**: ai kiểm chứng được cũng ký giả được. RS256/ES256 dùng cặp key: chỉ Authorization Server giữ private key; các dịch vụ chỉ cần public key (JWKS) để kiểm chứng. Hệ nhiều dịch vụ nên dùng bất đối xứng.

**Sai lầm hay gặp:** Lưu JWT dài hạn trong `localStorage` rồi bị XSS lấy mất; hoặc chấp nhận `alg: none` do cấu hình thư viện sai.

## 10. OAuth2 và OIDC?

**Câu hỏi:** Một ứng dụng muốn đọc dữ liệu của bạn ở dịch vụ khác mà không được biết mật khẩu của bạn. OAuth2 giải quyết thế nào, và OIDC thêm gì?

**Gợi ý suy luận:**
- Nếu không đưa mật khẩu thì ứng dụng cần mang cái gì để chứng minh được phép (token có phạm vi và thời hạn)?
- Token đó trả lời "được làm gì" hay "người này là ai"? Câu hỏi còn lại cần cái gì thêm?
- Nếu kẻ khác chặn được `code` trên đường redirect thì có đổi ra token được không, và cần thêm bí mật gì để ngăn?

**Lập luận:** Vì ứng dụng không được biết mật khẩu, bên cấp (Authorization Server) cấp cho nó một token có phạm vi và thời hạn: đó là OAuth2, nói về ủy quyền. Token ủy quyền không cho biết người dùng là ai, nên OIDC thêm ID token để authentication. Flow Authorization Code + PKCE chặn việc đánh cắp `code`: client gửi `code_challenge = BASE64URL(SHA256(verifier))` lúc đầu, rồi phải nộp lại `code_verifier` khi đổi token; kẻ chặn `code` không có verifier nên không đổi được. API của bạn là Resource Server và phải kiểm chữ ký, `exp`, `iss`, `aud`, `scope`. Điểm dễ nhầm là dùng OAuth2 thuần để "đăng nhập": access token chỉ nói client được làm gì, không nói người dùng là ai; đăng nhập phải dùng OIDC (ID token). Cũng không tin token chỉ vì chữ ký đúng: phải kiểm `iss`, `aud`, `exp` và `scope`, nếu không token cấp cho dịch vụ khác vẫn được chấp nhận. Mọi client công khai (SPA, mobile) nên dùng Authorization Code với PKCE.

**Đáp án ngắn:** OAuth2 là ủy quyền bằng token có phạm vi và thời hạn; OIDC xây trên OAuth2 để authentication (ID token). Flow chuẩn: Authorization Code + PKCE; Resource Server kiểm chữ ký, `exp`, `iss`, `aud` và `scope`.

**Nhớ:** PKCE: `code_challenge = BASE64URL(SHA256(code_verifier))`. Không kiểm tra `aud` và `iss` thì sẽ chấp nhận token cấp cho dịch vụ khác.

**Ví dụ:** PKCE chặn việc đánh cắp `code`. Client tạo `code_verifier` ngẫu nhiên, gửi lên `code_challenge = BASE64URL(SHA256(verifier))` ở bước đầu; bước đổi code lấy token phải gửi lại `code_verifier`.

```text
code_verifier : dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
code_challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
```

Giá trị `code_challenge` tính được trùng với ví dụ trong RFC 7636. Kẻ chặn được `code` trên đường redirect không có `code_verifier` nên không đổi được token. _Đã chạy thử (Python)._

```mermaid
sequenceDiagram
    participant U as "Người dùng"
    participant C as "Client"
    participant A as "Authorization Server"
    participant R as "Resource Server"
    C->>A: "/authorize?code_challenge=...&scope=openid orders.read"
    A->>U: "Đăng nhập và đồng ý"
    A->>C: "redirect kèm code"
    C->>A: "/token (code + code_verifier)"
    A->>C: "access_token + id_token"
    C->>R: "Authorization: Bearer access_token"
```

**Hỏi xoáy 1:** Access token và ID token khác gì? Có dùng ID token để gọi API được không?
**Vì sao hỏi tiếp:** Ta có hai token: access token và ID token. Chúng khác nhau thế nào, có dùng ID token gọi API được không?
**Đáp:** ID token dành cho **client** biết người dùng là ai (audience là client). Access token dành cho **Resource Server** (audience là API). Dùng ID token để gọi API là sai mục đích: API không nên chấp nhận nó.

**Hỏi xoáy 2:** Vì sao bỏ flow Implicit và Resource Owner Password?
**Vì sao hỏi tiếp:** Với mục tiêu "không lộ mật khẩu và token", vì sao các flow Implicit và Resource Owner Password bị bỏ?
**Đáp:** Implicit đưa token thẳng vào URL fragment (dễ lộ, không có PKCE). Password buộc client xử lý mật khẩu người dùng, phá hỏng mục tiêu ban đầu của OAuth2. Cả hai bị loại khỏi khuyến nghị hiện hành.

**Sai lầm hay gặp:** Không kiểm tra `aud` và `iss` ở Resource Server, nên chấp nhận token hợp lệ nhưng cấp cho dịch vụ khác.

## 11. `@Async` và `@Scheduled` có bẫy gì?

**Câu hỏi:** Method `@Async` ghi audit log với `user = null`, hoặc `@PreAuthorize` từ chối dù người gọi đã đăng nhập; còn tác vụ `@Scheduled` chạy hai lần khi có hai instance. Hai annotation này có bẫy gì?

**Gợi ý suy luận:**
- `@Async` chạy method ở thread nào? Transaction, `SecurityContext`, MDC gắn vào đâu (ThreadLocal)?
- Chuyển thread thì những thứ gắn ThreadLocal còn đi theo không?
- `@Scheduled` có biết còn bao nhiêu instance đang chạy cùng ứng dụng không, và mặc định dùng mấy thread?

**Lập luận:** Vì `@Async` đẩy method sang thread khác mà transaction, `SecurityContext` và MDC đều là ThreadLocal, chuyển thread nghĩa là mất chúng: ở thread async "người dùng hiện tại" là null. Vì thế phải sao chép ngữ cảnh tường minh (`TaskDecorator`, `DelegatingSecurityContextAsyncTaskExecutor`). `@Async` cũng là proxy nên gọi nội bộ vô hiệu, và executor cần giới hạn rõ. Với `@Scheduled`, mỗi instance tự chạy tác vụ nên chạy trên mọi instance, mặc định cả một thread nên tác vụ dài chặn tác vụ khác: dùng ShedLock hoặc bộ lập lịch tập trung, thiết kế idempotent. Điểm dễ nhầm là nghĩ annotation tự lo mọi thứ: `@Async` trên method gọi nội bộ vẫn chạy đồng bộ, và nếu không cấu hình executor thì có thể mỗi tác vụ tạo một thread mới hoặc dùng pool mặc định không giới hạn. Với `@Scheduled`, khi chạy nhiều instance phải dùng lock phân tán (ShedLock) hoặc chỉ một instance nắm lịch, và tác vụ phải idempotent vì có thể chạy lặp.

**Đáp án ngắn:** `@Async` là proxy, chạy ở thread khác nên mất transaction, `SecurityContext`, MDC (phải sao chép tường minh) và cần executor có giới hạn. `@Scheduled` mặc định một thread và chạy trên mọi instance, nên cần lock (ShedLock) và tác vụ idempotent.

**Nhớ:** Executor mặc định của Boot có queue không giới hạn; không có Boot thì `SimpleAsyncTaskExecutor` tạo thread mới cho mỗi tác vụ. Khai báo rõ kích thước pool và queue.

**Ví dụ:** `ThreadLocal` đóng vai `SecurityContext`/MDC.

```java
static final ThreadLocal<String> SECURITY_CONTEXT = new ThreadLocal<>();
SECURITY_CONTEXT.set("user=an");
System.out.println("luồng request : " + SECURITY_CONTEXT.get());
System.out.println("luồng @Async  : " + pool.submit(() -> SECURITY_CONTEXT.get()).get());
```

Output thật:

```text
luồng request : user=an
luồng @Async  : null
sau khi sao chép: user=an
```

Trong thread `@Async`, "người dùng hiện tại" là `null`: hậu quả là audit log ghi sai người, hoặc `@PreAuthorize` từ chối. Dòng cuối là cách sửa: **sao chép tường minh** ngữ cảnh khi submit. _Đã chạy thử (JDK 11)._

Trong Spring, dùng `TaskDecorator` (sao chép MDC) và `DelegatingSecurityContextAsyncTaskExecutor` (sao chép SecurityContext); lock tác vụ lập lịch (minh họa):

```java
@Bean TaskExecutor ioExecutor() {
    var ex = new ThreadPoolTaskExecutor();
    // có giới hạn
    ex.setCorePoolSize(8); ex.setMaxPoolSize(16); ex.setQueueCapacity(200);
    ex.setTaskDecorator(task -> { var ctx = MDC.getCopyOfContextMap(); return () -> { MDC.setContextMap(ctx); try { task.run(); } finally { MDC.clear(); } }; });
    return ex;
}

@Scheduled(cron = "0 0 2 * * *")
// ShedLock: chỉ một instance chạy
@SchedulerLock(name = "nightlyReport", lockAtMostFor = "30m")
void nightlyReport() { /* idempotent */ }
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Method `@Async` ném exception, ai nhận?
**Vì sao hỏi tiếp:** Ngoài ngữ cảnh, exception của method `@Async` đi đâu khi trả `void`?
**Đáp:** Với kiểu trả `void`, exception **biến mất** về `AsyncUncaughtExceptionHandler` (mặc định chỉ ghi log), người gọi không biết. Trả `CompletableFuture` để người gọi xử lý lỗi, hoặc đăng ký handler.

**Hỏi xoáy 2:** Method `@Async` có chạy trong transaction của người gọi không?
**Vì sao hỏi tiếp:** Transaction cũng gắn với thread. Vậy method `@Async` có chạy trong transaction của người gọi không?
**Đáp:** Không: transaction gắn với thread người gọi. Nếu người gọi chưa commit mà tác vụ async đã đọc dữ liệu, nó có thể **không thấy** dữ liệu vừa ghi. Giải pháp: kích hoạt async sau commit (`@TransactionalEventListener`, câu 12).

**Sai lầm hay gặp:** Để executor mặc định, rồi tải tăng, queue hoặc số thread tăng vô hạn đến cạn memory.

## 12. Application event và `@TransactionalEventListener`?

**Câu hỏi:** Đơn hàng bị rollback nhưng khách vẫn nhận email xác nhận. `@EventListener` và `@TransactionalEventListener` khác nhau thế nào, và vì sao event nội bộ vẫn không đủ để bảo đảm gửi tin?

**Gợi ý suy luận:**
- `publishEvent` là phát vào queue hay chỉ là gọi hàm gián tiếp: chạy ở thread và transaction nào?
- Nếu handler chạy ngay tại chỗ phát event thì lúc đó dữ liệu đã commit chưa?
- Muốn chỉ gửi sau khi dữ liệu đã commit thật thì cần hoãn handler đến pha nào của transaction?

**Lập luận:** Vì `ApplicationEventPublisher` chỉ là cách gọi hàm gián tiếp, `@EventListener` chạy sync tại chỗ cùng thread và cùng transaction, nên email có thể gửi trước khi commit; nếu sau đó rollback thì email đã đi mà đơn không tồn tại. `@TransactionalEventListener(phase = AFTER_COMMIT)` hoãn handler đến sau khi commit thành công và bỏ qua nếu rollback. Nhưng event nội bộ nằm trong memory nên mất nếu process sập giữa chừng, vì vậy cần bảo đảm thì dùng Outbox + broker. Điểm dễ nhầm là tưởng `@TransactionalEventListener` là kênh tin cậy: nó chỉ đổi thời điểm chạy, không thêm độ bền. Nếu cần "đơn đã lưu thì email chắc chắn được gửi", ghi event vào bảng outbox trong cùng transaction rồi để tiến trình riêng gửi và retry. Cũng lưu ý ở `AFTER_COMMIT` handler chạy khi transaction đã kết thúc, nên muốn ghi DB trong handler phải mở transaction mới (`REQUIRES_NEW`).

**Đáp án ngắn:** `@EventListener` chạy ngay cùng transaction; `@TransactionalEventListener(AFTER_COMMIT)` chạy sau commit thành công và bỏ qua khi rollback. Event nội bộ không bền vững, cần bảo đảm thì dùng Outbox + broker.

**Nhớ:** Ghi dòng "cần gửi" vào bảng outbox trong cùng transaction với dữ liệu để không mất event; coi event nội bộ là queue tin cậy là sai lầm.

**Ví dụ:** hai cách, hai kết cục (minh họa).

```java
@Transactional
public void placeOrder(Order o) {
    repo.save(o);
    publisher.publishEvent(new OrderPlaced(o.getId()));   // phát event
    // ... bước sau đây ném exception -> rollback
}

// email ĐÃ GỬI dù rollback
@EventListener                                   void a(OrderPlaced e) { mail.send(e); }
// không gửi nếu rollback
@TransactionalEventListener(phase = AFTER_COMMIT) void b(OrderPlaced e) { mail.send(e); }
```

Timeline: `save` → `publishEvent` → (A chạy ngay, gửi email) → lỗi → rollback → đơn không tồn tại nhưng khách nhận email xác nhận. Với B: handler chờ đến commit nên khách chỉ nhận email khi đơn đã lưu. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Trong handler `AFTER_COMMIT` ghi thêm vào DB thì sao?
**Vì sao hỏi tiếp:** Handler `AFTER_COMMIT` chạy khi transaction đã kết thúc. Nếu nó ghi thêm vào DB thì sao?
**Đáp:** Transaction đã kết thúc nhưng tài nguyên còn gắn; thay đổi ghi trong handler **không được commit** trừ khi handler mở transaction mới (`@Transactional(propagation = REQUIRES_NEW)`). Đây là bẫy gây "ghi mà không thấy dữ liệu".

**Hỏi xoáy 2:** Commit xong, process sập trước khi handler chạy thì sao?
**Vì sao hỏi tiếp:** AFTER_COMMIT vẫn chạy trong memory. Nếu process sập đúng giữa commit và handler thì sao?
**Đáp:** Event mất vĩnh viễn: email/message không bao giờ gửi. Để không mất, ghi một dòng "cần gửi" vào bảng **outbox trong cùng transaction** với dữ liệu, rồi một process riêng đọc bảng này và đẩy ra broker (xem [Kafka hướng event](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md)).

**Sai lầm hay gặp:** Xem event nội bộ là queue tin cậy.

## 13. Cache: `@Cacheable` và các vấn đề?

**Câu hỏi:** Hot key vừa hết hạn, 50 thread cùng đi nạp DB và cơ sở dữ liệu quá tải. `@Cacheable` có những vấn đề gì và xử lý ra sao?

**Gợi ý suy luận:**
- Cache giữ hai bản sao của dữ liệu: khi bản gốc đổi mà cache chưa đổi thì thấy gì?
- Khi hot key hết hạn, nhiều thread cùng thấy "chưa có" thì mỗi thread sẽ làm gì?
- Lock không tồn tại mà luôn bị hỏi thì mỗi lần có vào DB không?

**Lập luận:** Vì cache đổi tính đúng của dữ liệu lấy tốc độ, hai bản sao có thể lệch (invalidation, dữ liệu cũ). Vì nhiều thread cùng thấy "chưa có" khi hot key hết hạn nên cùng đi nạp DB (stampede): ví dụ 50 lần chạm DB cho một giá trị. Sửa bằng cách serialization việc nạp theo key (`computeIfAbsent`, `@Cacheable(sync = true)` trong một JVM, distributed lock khi nhiều instance). Key không tồn tại luôn trượt cache nên mỗi lần vào DB (penetration). `@Cacheable` cũng là proxy nên gọi nội bộ vô hiệu. Điểm dễ nhầm là coi cache chỉ cải thiện tốc độ: nó thêm một nguồn sự thật thứ hai cần đồng bộ. Khi review, hỏi ba câu: dữ liệu cũ tới mức nào còn chấp nhận được (TTL), ai xóa hoặc cập nhật khi nguồn đổi (`@CacheEvict`), và khi cache chết thì ứng dụng vẫn chạy được không. Với key không tồn tại thì cache cả kết quả rỗng (TTL ngắn) hoặc dùng bloom filter.

**Đáp án ngắn:** Vấn đề của cache là invalidation, stampede, penetration và dữ liệu cũ; xử lý bằng TTL, lock đúng, serialization việc nạp theo key. Ứng dụng vẫn phải chạy khi cache chết.

**Nhớ:** `@Cacheable(sync = true)` chỉ hiệu lực trong cùng JVM. Cache không TTL không chiến lược xóa thì dữ liệu cũ tồn tại mãi.

**Ví dụ:** 50 thread cùng yêu cầu một hot key vừa hết hạn, mỗi lần nạp DB mất 100 ms.

```java
// cách 1: check-then-load
String v = cache.get(k); if (v == null) { v = loadFromDb(k); cache.put(k, v); }
// cách 2: chỉ một luồng nạp, các luồng khác chờ kết quả
cache.computeIfAbsent(k, StampedeDemo::loadFromDb);
```

Output thật:

```text
check-then-load (cache stampede): số lần chạm DB = 50
computeIfAbsent (chỉ 1 luồng nạp)  : số lần chạm DB = 1
```

50 thread cùng thấy "trống" nên cùng đi nạp: 50 lần chạm DB cho một giá trị. Bản chất của việc sửa là **serialization việc nạp theo key**. _Đã chạy thử (JDK 11, trong một JVM; với nhiều instance cần distributed lock hoặc TTL ngẫu nhiên)._

Trong Spring, tương đương là `@Cacheable(sync = true)` (chỉ hiệu lực trong cùng JVM):

```java
@Cacheable(cacheNames = "products", key = "#id", sync = true)
public Product find(long id) { return repo.findById(id).orElseThrow(); }
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao nên cộng ngẫu nhiên vào TTL?
**Vì sao hỏi tiếp:** TTL đặt cố định dễ làm nhiều lock hết hạn cùng lúc. Có cách nào trải điều đó ra theo thời gian?
**Đáp:** Nếu 10 000 lock cùng nạp lúc 00:00 với TTL 1 giờ, chúng hết hạn **đồng loạt** lúc 01:00 và tạo cơn sóng nạp DB (avalanche). Thêm jitter (ví dụ ±10%) trải sự hết hạn ra theo thời gian.

**Hỏi xoáy 2:** Sửa DB rồi mới xóa cache, hay xóa cache rồi mới sửa DB?
**Vì sao hỏi tiếp:** Để giảm dữ liệu cũ, khi cập nhật nên sửa DB trước hay xóa cache trước?
**Đáp:** Cả hai đều có cửa sổ lệch. Xóa cache trước: thread khác đọc DB cũ rồi ghi lại cache cũ. Sửa DB trước rồi xóa cache (cache-aside chuẩn) lệch hiếm hơn nhưng vẫn có. Cần mạnh hơn thì thêm TTL ngắn làm lưới an toàn hoặc dùng event thay đổi (CDC). Xem [Redis: cache pattern](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-03-cache-pattern-van-de-cache.md).

**Sai lầm hay gặp:** Cache không có TTL và không có chiến lược xóa, nên dữ liệu cũ tồn tại mãi.

## 14. Làm sao quan sát một ứng dụng Spring Boot?

**Câu hỏi:** Hệ thống chậm bất thường lúc 2 giờ sáng. Bạn quan sát một ứng dụng Spring Boot thế nào để trả lời được "cái gì bất thường, vì sao, và ở dịch vụ nào"?

**Gợi ý suy luận:**
- Ba câu cần trả lời: cái gì bất thường, vì sao, ở đâu trong chuỗi dịch vụ: mỗi câu hợp với loại dữ liệu nào (metric, log, trace)?
- Ba loại dữ liệu đó liên kết với nhau bằng cái gì nếu không muốn ba đống rời rạc (`traceId`)?
- Nên cảnh báo theo triệu chứng người dùng thấy hay từng nguyên nhân kỹ thuật?

**Lập luận:** Vì cần ba câu trả lời khác nhau, ta dùng ba trụ cột: metric cho "cái gì bất thường" (Micrometer, RED cho dịch vụ, USE cho tài nguyên), log có cấu trúc cho "vì sao", trace (OpenTelemetry) cho "ở đâu". Vì chỉ khi chúng liên kết được qua `traceId` (đưa vào MDC) thì bạn mới đi từ cảnh báo tới span chậm tới dòng log cụ thể. Cảnh báo theo triệu chứng người dùng thấy (lỗi, latency) vì nguyên nhân kỹ thuật thì quá nhiều. Health probe liveness/readiness cho hạ tầng biết khi nào restart, khi nào ngừng gửi lưu lượng. Điểm dễ nhầm là chỉ nhìn log hoặc chỉ nhìn metric: log trả lời "vì sao" nhưng không cho biết quy mô, metric cho biết quy mô nhưng không chỉ ra request nào. Vì thế đảm bảo mọi log có `traceId`, mọi request có thể truy từ dashboard sang trace sang log, và đặt cảnh báo theo SLO người dùng cảm nhận thay vì theo từng CPU hay memory.

**Đáp án ngắn:** Dùng metric, log có cấu trúc kèm `traceId` và trace, liên kết bằng `traceId`; thêm health probe liveness/readiness và cảnh báo theo triệu chứng người dùng.

**Nhớ:** Metric: Micrometer, RED/USE. Trace: OpenTelemetry. Đừng gán nhãn metric có số phần tử vô hạn (userId, URL đầy đủ).

**Ví dụ (minh họa):**

```text
# log có cấu trúc, cùng traceId xuyên qua các dịch vụ
{"ts":"2026-10-21T08:01:02Z","level":"ERROR","traceId":"4bf92f3577b34da6","svc":"order","msg":"payment timeout","orderId":7}

# p99 độ trễ HTTP theo PromQL (Micrometer xuất http_server_requests_seconds)
histogram_quantile(0.99, sum by (le, uri) (rate(http_server_requests_seconds_bucket[5m])))
```

```yaml
management:
  endpoints.web.exposure.include: health,info,prometheus
  endpoint.health.probes.enabled: true      # /actuator/health/liveness và /readiness
```

Quy trình: cảnh báo p99 tăng → xem metric theo `uri` để khoanh vùng endpoint → lấy một `traceId` chậm → mở trace thấy span nào dài → đọc log có cùng `traceId` ở dịch vụ đó. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao dùng p99 mà không dùng trung bình?
**Vì sao hỏi tiếp:** Cảnh báo p99 latency tăng. Vì sao nhìn p99 chứ không phải trung bình?
**Đáp:** Trung bình che đuôi: nếu 1% request mất 10 s và 99% mất 50 ms thì trung bình chỉ khoảng 150 ms nhưng 1 trong 100 người dùng chịu 10 s. Với một trang gọi nhiều dịch vụ, xác suất gặp đuôi chậm còn cao hơn.

**Hỏi xoáy 2:** Liveness và readiness khác nhau thế nào, đặt nhầm hậu quả gì?
**Vì sao hỏi tiếp:** Health probe có hai loại. Liveness và readiness khác nhau thế nào, đặt nhầm thì sao?
**Đáp:** Liveness hỏi "process còn sống không", thất bại thì **khởi động lại** nó. Readiness hỏi "nhận lưu lượng được chưa", thất bại thì **ngừng gửi request** (không restart). Đưa kiểm tra DB vào liveness: DB chậm thì mọi pod bị restart hàng loạt, làm sự cố nặng hơn.

**Sai lầm hay gặp:** Gán nhãn metric có số phần tử vô hạn (userId, URL đầy đủ) làm bùng nổ memory hệ thống metric.

## 15. Gọi dịch vụ khác thế nào cho an toàn?

**Câu hỏi:** Một dịch vụ phụ thuộc bắt đầu chậm gấp trăm lần, và dịch vụ của bạn cũng sập dù code không lỗi. Gọi dịch vụ khác thế nào cho an toàn?

**Gợi ý suy luận:**
- Một call mạng không có timeout thì có kết thúc chắc chắn không, và nó giữ gì trong lúc chờ (một thread)?
- Với 200 thread, mỗi call 50 ms và 5000 ms cho throughput tối đa bao nhiêu (định luật Little)?
- Khi dịch vụ phụ thuộc đã yếu, nên tiếp tục gửi (retry) hay ngừng gửi (circuit breaker)?

**Lập luận:** Vì call không timeout có thể treo mãi và mỗi call treo giữ một thread, dịch vụ phụ thuộc chậm thì thread của bạn cạn dần. Theo định luật Little, 200 thread với 50 ms cho 4 000 req/s, với 5 000 ms chỉ còn 40 req/s: chậm 100 lần thì throughput của bạn giảm 100 lần, đó là cascading failure. Timeout chặn mức tụt này; circuit breaker mở mạch để trả lỗi ngay thay vì xếp hàng; retry chỉ cho thao tác idempotent và có backoff. Điểm dễ nhầm là chỉ đặt timeout cho kết nối mà quên timeout đọc, hoặc đặt retry cho mọi lỗi: retry thao tác không idempotent có thể trừ tiền hai lần, và retry đồng loạt khi dịch vụ đang sập khuếch đại tải (retry storm). Vì vậy retry có giới hạn, có backoff và jitter, chỉ cho thao tác idempotent; ngoài ra dùng bulkhead để một dịch vụ chậm không chiếm hết thread của mọi dịch vụ khác.

**Đáp án ngắn:** Đặt timeout (kết nối và đọc), retry có backoff chỉ cho thao tác idempotent, circuit breaker, bulkhead, fallback và truyền `traceId`.

**Nhớ:** Client có timeout mặc định vô hạn là bẫy. Throughput tối đa ≈ số thread / thời gian xử lý.

**Ví dụ:** tính theo định luật Little (số thread đồng thời = tốc độ × thời gian xử lý). Dịch vụ có 200 thread Tomcat.

| Latency dịch vụ phụ thuộc | Số request/s tối đa với 200 thread |
|---|---|
| 50 ms | 200 / 0,05 = **4 000** |
| 5 000 ms (dịch vụ phụ thuộc chậm, không timeout) | 200 / 5 = **40** |

Một dịch vụ phụ thuộc chậm 100 lần làm throughput của **bạn** giảm 100 lần, dù code của bạn không đổi. Timeout 500 ms chặn mức tụt này; circuit breaker mở mạch để trả lỗi ngay thay vì xếp hàng. (Phép tính số học, không phải đo thực tế.)

```java
RestClient client = RestClient.builder()
    .requestFactory(ClientHttpRequestFactories.get(ClientHttpRequestFactorySettings.DEFAULTS
        .withConnectTimeout(Duration.ofMillis(300)).withReadTimeout(Duration.ofMillis(800))))
    .build();

@CircuitBreaker(name = "pay", fallbackMethod = "payLater")
@Retry(name = "pay")                       // chỉ khi gọi này idempotent
PaymentResult pay(Order o) { return client.post().uri("/pay").body(o).retrieve().body(PaymentResult.class); }
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao retry có thể làm sự cố tệ hơn?
**Vì sao hỏi tiếp:** Retry nghe có vẻ giúp. Vì sao nó có thể làm sự cố tệ hơn?
**Đáp:** Dịch vụ phụ thuộc đang quá tải, mỗi client retry 3 lần: tải **tăng gấp 4** đúng lúc nó yếu nhất (retry storm). Cần backoff có jitter, giới hạn số lần, và circuit breaker để ngừng gửi.

**Hỏi xoáy 2:** Retry một lệnh `POST /pay` có an toàn không?
**Vì sao hỏi tiếp:** Ngay cả khi retry hợp lý, `POST /pay` bị gửi lại thì có an toàn không?
**Đáp:** Chỉ khi nó **idempotent**: gửi kèm `Idempotency-Key`, server lưu kết quả theo key và trả lại thay vì trừ tiền lần hai. Xem [Distributed lock và Idempotency](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md).

**Sai lầm hay gặp:** Dùng client có timeout mặc định là vô hạn (hoặc rất dài) mà không đặt lại.

## 16. Phân trang hiệu quả?

**Câu hỏi:** Trang số 500 của danh sách tải mất vài giây trong khi trang 1 tức thì. Vì sao `OFFSET` chậm dần, và phân trang hiệu quả nên làm thế nào?

**Gợi ý suy luận:**
- `OFFSET n` có nhảy thẳng tới hàng n không, hay DB phải đọc rồi bỏ n hàng đầu?
- Nếu dùng giá trị của hàng cuối trang trước làm điểm bắt đầu và index hỗ trợ `WHERE`, chi phí có còn phụ thuộc độ sâu không?
- Có hai bản ghi cùng giá trị cột sắp xếp thì dùng cột nào để phân biệt (duy nhất)?

**Lập luận:** Vì `OFFSET n` buộc DB đọc rồi bỏ n hàng đầu mới tới hàng cần lấy, trang càng sâu càng chậm. Keyset pagination dùng giá trị của hàng cuối trang trước làm điểm bắt đầu (`WHERE (created_at, id) < (?, ?)`) và đi thẳng tới đó bằng index, nên chi phí không phụ thuộc độ sâu. Vì giá trị cột sắp xếp có thể trùng, cần thêm cột duy nhất (`id`) làm tiebreaker, và `ORDER BY` phải khớp với index. Điểm dễ nhầm là tưởng thêm index vào cột sắp xếp là đủ với `OFFSET`: DB vẫn phải đếm qua n dòng đầu. Đổi lại, keyset không nhảy được tới trang bất kỳ và cần thứ tự ổn định, nên chọn theo nhu cầu: có số trang và dữ liệu nhỏ thì `Pageable`, danh sách lớn hoặc cuộn vô hạn thì keyset. Khi dùng, đảm bảo cột sắp xếp (kèm `id`) nằm trong một index cùng thứ tự `ORDER BY`.

**Đáp án ngắn:** `Pageable` ổn cho trang nhỏ, nông; với dữ liệu lớn hoặc cuộn vô hạn dùng keyset dựa trên giá trị hàng cuối kèm index khớp với `ORDER BY`.

**Nhớ:** Giới hạn kích thước trang, chỉ cho sắp xếp theo cột trong danh sách trắng. `Page` chạy thêm `count(*)`, dùng `Slice` nếu không cần tổng.

**Ví dụ:** 20 000 dòng, lấy 3 dòng sau 10 000 dòng đầu, cùng thứ tự `created_at DESC, id DESC`.

```sql
-- offset: DB đọc và bỏ 10 000 dòng
select id from users order by created_at desc, id desc limit 3 offset 10000;
-- keyset: bắt đầu từ giá trị cuối trang trước (created_at=10000, id=10000)
select id from users where (created_at, id) < (10000, 10000)
order by created_at desc, id desc limit 3;
```

Output thật, hai cách cho **cùng kết quả**:

```text
offset 10000: [(10000,), (9999,), (9998,)]
keyset      : [(10000,), (9999,), (9998,)]
plan: SEARCH users USING COVERING INDEX idx_created (created_at<?)
```

Kế hoạch của keyset là SEARCH theo index (đi thẳng tới vị trí), còn offset phải đi qua 10 000 mục trước. Phép so sánh dòng `(a, b) < (x, y)` không phải DB nào cũng hỗ trợ cú pháp này (PostgreSQL và MySQL có; nếu không có thì viết `a < x OR (a = x AND b < y)`). _Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** Hai bản ghi có cùng `created_at` thì keyset thế nào?
**Vì sao hỏi tiếp:** Keyset cần cột sắp xếp để định vị. Hai bản ghi cùng `created_at` thì sao?
**Đáp:** Đó là lý do cần cột thứ hai **duy nhất** (`id`) làm tiebreaker; thiếu nó thì bản ghi trùng giá trị bị lặp hoặc bị bỏ sót giữa các trang.

**Hỏi xoáy 2:** Keyset đánh đổi gì?
**Vì sao hỏi tiếp:** Keyset nhanh nhưng chắc có đánh đổi. Là gì?
**Đáp:** Không nhảy tới "trang số 57", chỉ đi tiếp/lùi; và `ORDER BY` phải khớp với index đã tạo. Hợp với feed, danh sách vô hạn, xuất dữ liệu; không hợp với giao diện cần chọn số trang.

**Sai lầm hay gặp:** Cho client truyền tên cột sắp xếp tự do: vừa là lỗ hổng injection, vừa buộc DB sắp xếp theo cột không có index.

