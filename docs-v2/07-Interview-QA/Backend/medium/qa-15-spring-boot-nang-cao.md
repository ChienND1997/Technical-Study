# Câu hỏi: Spring Boot nâng cao (senior)

Bổ sung cho [Spring bên trong](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md): các câu ở đây đi vào **cơ chế, trade-off và tình huống thật** mà người phỏng vấn senior hay hỏi. Kiến thức gốc: [Spring Boot Medium](/go?p=01-Spring-Boot%2Fmedium%2Findex.md), [Spring Boot Hard](/go?p=01-Spring-Boot%2Fhard%2Findex.md).

Mỗi câu theo chuỗi: **Câu hỏi** (tình huống) → **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới kiến thức nền) → **Lập luận** (chuỗi nhân quả tới đáp án) → **Đáp án ngắn** (để nói thành tiếng) → **Ví dụ** (code hoặc kịch bản truy vết được) → **Hỏi xoáy** (kèm lý do vì sao đó là bước tiếp theo) → **Sai lầm hay gặp** → **Nhớ** (kiến thức cốt lõi). Hãy tự trả lời phần Gợi ý trước khi đọc tiếp. Quy ước ghi chú ví dụ: _Đã chạy thử trên JDK 11_ nghĩa là output dán bên dưới là output thật (dùng Java thuần để mô phỏng đúng cơ chế, vì môi trường soạn không có Spring); _Minh họa, chưa chạy thử_ nghĩa là đoạn Spring/cấu hình chưa chạy trong môi trường này.

---

**Tóm tắt:**

- Phạm vi file: Spring Boot nâng cao ở mức production, từ cơ chế bên trong tới vận hành.
- Auto-configuration là danh sách điều kiện (`OnClass`, `OnMissingBean`, `OnProperty`) đọc từ `AutoConfiguration.imports`; debug bằng conditions report (`--debug`).
- Proxy chỉ chặn call đi qua nó nên self-invocation mất AOP; propagation `REQUIRES_NEW` mở transaction độc lập trên connection thứ hai, và checked exception không rollback nếu thiếu `rollbackFor`.
- Transaction, `SecurityContext` và MDC nằm trong ThreadLocal nên không sang `@Async`; chạy việc sau commit bằng `@TransactionalEventListener(AFTER_COMMIT)`.
- Production cần executor riêng cho `@Async`/`@Scheduled`, graceful shutdown cùng readiness và `preStop`, quản lý secret ngoài repo, và theo dõi p99, pool DB, lag.
- Throughput của một tài nguyên bằng số slot chia thời gian giữ slot, nên rút ngắn thời gian giữ connection trước khi tăng pool; WebFlux chỉ đáng khi cả chuỗi non-blocking hoặc cần streaming.
- Hay bị hỏi xoáy nhất: vì sao `@PostConstruct` gọi `@Transactional` không có transaction, JWT không mã hóa payload, và deploy mà không rớt request thế nào.

## 1. Auto-configuration chọn bean thế nào, và bạn debug ra sao khi nó "không chạy" hoặc chạy ngoài ý muốn?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn thêm một starter vào `pom.xml` và một bean `DataSource` tự động xuất hiện, nhưng lúc khác bạn tự khai báo `DataSource` mà Boot vẫn tạo thêm một cái, hoặc auto-config bạn chờ lại không chạy. Boot quyết định tạo bean nào dựa trên cái gì, và bạn debug ra sao?

**Gợi ý suy luận:**

- Boot không biết bạn muốn gì, vậy nó phải đọc một danh sách có sẵn ở đâu (trong jar của starter)?
- Mỗi class cấu hình tự hỏi "điều kiện của tôi đúng không?": những điều kiện nào có ý nghĩa (có class trên classpath, chưa có bean, có property)?
- Để cấu hình mặc định luôn nhường chỗ cho thứ bạn tự khai báo thì cần điều kiện nào, và xử lý thứ tự ra sao?

**Lập luận:** Boot không "phát hiện phép màu": `@SpringBootApplication` bật `@EnableAutoConfiguration`, nó đọc `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` của từng jar để lấy danh sách tên class cấu hình. Mỗi class tự bật hay tắt theo điều kiện: `@ConditionalOnClass` (có thư viện trên classpath), `@ConditionalOnMissingBean` (bạn chưa tự khai báo), `@ConditionalOnProperty`. Vì cấu hình mặc định dùng `OnMissingBean`, nó nhường chỗ cho thứ bạn khai báo. Khi không chạy hoặc chạy ngoài ý muốn, thông tin quyết định nằm ở kết quả đánh giá từng điều kiện, nên cần xem báo cáo đó. Điểm dễ nhầm là nghĩ auto-configuration quyết định theo ý muốn của Boot: nó chỉ đánh giá điều kiện, và kết quả phụ thuộc vào classpath cùng thứ tự đăng ký bean. Khi bean không chạy như kỳ vọng, đừng đoán mà bật `--debug`, đọc "Positive matches" và "Negative matches", rồi sửa bằng cách tự khai báo bean (hoặc `exclude`) chứ không sửa mã nguồn thư viện.

**Đáp án ngắn:** Auto-config đọc danh sách class trong `AutoConfiguration.imports`, mỗi class bật/tắt theo `@Conditional*`. Debug bằng `--debug` (conditions evaluation report) hoặc `/actuator/conditions`, đọc "Negative matches" để biết vì sao X không chạy.

**Ví dụ:** _Minh họa, chưa chạy thử._ Một thư viện cung cấp `DataSource` mặc định và nhường chỗ nếu bạn tự khai báo:

```java
@AutoConfiguration
@ConditionalOnClass(HikariDataSource.class)          // có Hikari trên classpath?
public class MyDataSourceAutoConfig {

    @Bean
    // bạn chưa tự khai báo DataSource?
    @ConditionalOnMissingBean(DataSource.class)
    DataSource dataSource(MyProps p) { /* tạo mặc định */ }
}
```

Chạy `java -jar app.jar --debug`, báo cáo có dạng (rút gọn):

```text
Positive matches:
   MyDataSourceAutoConfig matched:
      - @ConditionalOnClass found required class 'com.zaxxer.hikari.HikariDataSource'
   MyDataSourceAutoConfig#dataSource matched:
      - @ConditionalOnMissingBean (types: javax.sql.DataSource) did not find any beans

Negative matches:
   MongoAutoConfiguration:
      Did not match:
         - @ConditionalOnClass did not find required class 'com.mongodb.client.MongoClient'
```

Đọc "Negative matches" là cách nhanh nhất trả lời "vì sao auto-config X không chạy".

**Hỏi xoáy 1:** Tôi tự khai báo bean `DataSource` rồi mà Boot vẫn tạo thêm một cái nữa, vì sao?
Vì sao hỏi tiếp: Báo cáo điều kiện chỉ giúp nếu bạn hiểu `OnMissingBean` so khớp theo kiểu và theo thời điểm, nên câu tiếp theo là tình huống nó "ngoài ý muốn": đã khai báo `DataSource` mà vẫn bị tạo thêm.

**Đáp:** `OnMissingBean` so khớp theo **kiểu**. Nếu bạn khai báo bean kiểu `HikariDataSource` nhưng điều kiện đang xét kiểu khác (ví dụ interface khác hoặc bean đăng ký **sau** auto-config do thứ tự xử lý), điều kiện vẫn thấy "chưa có". Auto-config được xử lý **sau** cấu hình của người dùng (đó là chủ ý), nên nếu bean của bạn nằm trong một class không được quét thì nó cũng "không tồn tại". Xem conditions report để biết điều kiện nào quyết định.

**Hỏi xoáy 2:** Muốn tắt hẳn một auto-config thì sao?
Vì sao hỏi tiếp: Biết vì sao auto-config chạy rồi, bước tiếp theo là thao tác ngược lại: muốn tắt hẳn một auto-config thì làm gì?

**Đáp:** `@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)` hoặc `spring.autoconfigure.exclude=...`. Dùng khi starter kéo theo thứ bạn không cần (ví dụ có JPA trên classpath nhưng service này không dùng DB).

**Sai lầm hay gặp:** thêm starter rồi quên cấu hình nó cần (có `spring-boot-starter-data-jpa` mà không có DataSource thì app không khởi động); đọc tài liệu mà không xem conditions report nên đoán mò.
*Đào sâu:* tự viết starter (module `autoconfigure` + `AutoConfiguration.imports` + `@ConfigurationProperties`); thứ tự `@AutoConfiguration(after = ...)`. Xem [Auto-configuration](/go?p=01-Spring-Boot%2Fmedium%2Flt-14-autoconfiguration.md).

**Nhớ:** Auto-config là danh sách class có điều kiện (`@Conditional*`), mặc định nhường chỗ cho bean bạn tự khai báo; debug bằng conditions report.

---

## 2. Lifecycle bean có những bẫy nào? Circular dependency xử lý thế nào?

**Câu hỏi:** Bạn gọi method `@Transactional` trong `@PostConstruct` nhưng không có transaction nào, và hai bean tham chiếu lẫn nhau thì app không khởi động. Vì sao, và nên sửa thế nào?

**Gợi ý suy luận:**

- Container phải làm gì trước: tạo object hay bọc proxy? Proxy do bước nào tạo ra (`BeanPostProcessor.after`)?
- Trong constructor và `@PostConstruct`, `this` là object trần hay là proxy?
- Constructor cần các dependency đã tồn tại: nếu A cần B và B cần A thì ai tạo trước?

**Lập luận:** Container **tạo object trước, rồi mới bọc proxy** ở bước `postProcessAfterInitialization`, tức sau constructor và `@PostConstruct`. Vì vậy trong hai chỗ đó `this` còn là object trần và call không đi qua proxy, nên không có transaction hay cache. Với tham chiếu vòng, mỗi bên cần bên kia **đã xong** mới dựng được nên deadlock. Bật cho phép vòng chỉ che vấn đề, nên cách sửa đúng là phá vòng bằng thiết kế. Điểm dễ nhầm là bật `spring.main.allow-circular-references=true` để app chạy được: nó che thiết kế sai và tạo ra object chưa khởi tạo xong khi tiêm. Cách đúng là phá vòng bằng cách tách phần logic chung ra bean thứ ba, đổi chiều phụ thuộc (event, interface), hoặc tiêm lười (`@Lazy`, `ObjectProvider`) khi thực sự cần. Việc cần transaction lúc khởi động thì chạy sau `ApplicationReadyEvent`.

**Đáp án ngắn:** Thứ tự: constructor, inject, `Aware`, `postProcessBeforeInitialization`, `@PostConstruct`/`afterPropertiesSet`/`initMethod`, `postProcessAfterInitialization` (tạo proxy AOP), sẵn sàng, `@PreDestroy`. Việc cần proxy thì chạy sau `ApplicationReadyEvent`; circular dependency thì tách bean chung hoặc dùng event. Từ Boot 2.6, tham chiếu vòng bị cấm mặc định.

**Ví dụ:** _Minh họa, chưa chạy thử._ Gọi method `@Transactional` trong `@PostConstruct`:

```java
@Service
class ReportService {
    @PostConstruct
    void warmUp() {
        // KHÔNG có transaction: lúc này chưa có proxy
        loadConfig();
    }

    @Transactional
    void loadConfig() { /* ... */ }
}
```

Muốn chạy việc "sau khi mọi bean sẵn sàng, kể cả proxy" thì lắng nghe `ApplicationReadyEvent`:

```java
@EventListener(ApplicationReadyEvent.class)
// gọi qua proxy của bean khác -> có transaction
void warmUp() { reportService.loadConfig(); }
```

Circular dependency, lỗi khi khởi động:

```text
The dependencies of some of the beans in the application context form a cycle:
   orderService  ┌─────┐
   |  paymentService
   └─────┘
```

Cách sửa đúng là phá vòng bằng thiết kế (tách logic chung sang bean thứ ba, hoặc `OrderService` phát event thay vì gọi `PaymentService`), không phải bật `spring.main.allow-circular-references=true`.

**Hỏi xoáy 1:** Vì sao setter/field injection "chạy được" còn constructor injection thì không với tham chiếu vòng?
Vì sao hỏi tiếp: Boot cấm vòng mặc định, nhưng setter/field injection trước đây "chạy được", nên hỏi tiếp vì sao constructor injection thì deadlock còn setter thì không.

**Đáp:** Constructor cần **cả hai** đã tồn tại mới tạo được object, nên vòng là deadlock tuyệt đối. Setter/field cho phép tạo object rỗng trước rồi gán sau (Spring phơi "early reference" của bean đang tạo dở), nên trông như chạy được, nhưng bean đó có thể bị dùng khi **chưa khởi tạo xong** và có thể là bản chưa bọc proxy. Đó là lý do Boot cấm mặc định.

**Hỏi xoáy 2:** `BeanPostProcessor` khác `BeanFactoryPostProcessor`?
Vì sao hỏi tiếp: Câu trả lời nhắc tới `BeanPostProcessor` là nơi sinh proxy, nên hỏi để phân biệt nó với `BeanFactoryPostProcessor`.

**Đáp:** `BeanFactoryPostProcessor` chạy **trước khi tạo bean**, sửa *định nghĩa* bean (ví dụ thay `${...}` trong cấu hình). `BeanPostProcessor` chạy **với từng bean đã tạo**, sửa hoặc thay thế chính instance (nơi sinh proxy).

**Sai lầm hay gặp:** bật `allow-circular-references` cho xong, lỗi thiết kế ở lại; đặt logic cần proxy trong `@PostConstruct` rồi thắc mắc vì sao không có transaction/cache.
*Đào sâu:* [Lifecycle bean](/go?p=01-Spring-Boot%2Feasy%2Flt-10-bean-lifecycle.md).

**Nhớ:** Proxy sinh ra sau `@PostConstruct`; tham chiếu vòng là lỗi thiết kế, sửa bằng cách phá vòng. Xem [Lifecycle bean](/go?p=01-Spring-Boot%2Feasy%2Flt-10-bean-lifecycle.md).

---

## 3. JDK proxy và CGLIB proxy khác nhau thế nào? Vì sao gọi method nội bộ lại mất AOP?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn đặt `@Transactional(REQUIRES_NEW)` trên `sendEmail`, nhưng khi `placeOrder` trong cùng class gọi `this.sendEmail()` thì không có transaction mới. AOP của Spring hoạt động thế nào mà call nội bộ lại mất tác dụng, và JDK proxy với CGLIB khác nhau ra sao?

**Gợi ý suy luận:**

- Advice (transaction, cache) nằm trong code của bạn hay trong một object đứng trước (proxy)?
- Call `this.xxx()` xuất phát từ đâu, và có đi qua object đứng trước không?
- Proxy có hai cách tạo: implement interface hay kế thừa class. Cách nào ảnh hưởng tới `final` và `private`?

**Lập luận:** AOP của Spring **không sửa code của bạn**, nó đặt một proxy đứng trước và advice chỉ chạy khi call đi **qua** proxy. `this.sendEmail()` là call từ bên trong object thật nên không bao giờ qua proxy, và advice không chạy. JDK proxy implement interface của bean, còn CGLIB tạo subclass và ghi đè method để chèn advice, nên `final` và `private` không ghi đè được. Điểm dễ nhầm là tưởng đổi sang CGLIB hay `proxyTargetClass` sửa được self-invocation: cả hai kiểu proxy đều chỉ chặn call đi qua proxy, nên call nội bộ mất advice dù dùng kiểu nào. Cách sửa gọn nhất là tách method cần advice sang bean khác; `AopContext.currentProxy()` và tự tiêm mình chỉ là cách tạm vì gắn code vào cơ chế proxy.

**Đáp án ngắn:** Call nội bộ không qua proxy nên mất AOP. Sửa: tách sang bean khác, hoặc inject chính mình qua `ObjectProvider`, hoặc `AopContext.currentProxy()`, hoặc AspectJ weaving. Boot mặc định `proxy-target-class=true` nên thường dùng CGLIB.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng đúng cơ chế bằng `java.lang.reflect.Proxy`: advice "transaction" bọc mọi call từ ngoài, còn `placeOrder` gọi `this.sendEmail()`:

```java
interface OrderService { void placeOrder(); void sendEmail(); }
static class OrderServiceImpl implements OrderService {
    public void placeOrder() { System.out.println("  placeOrder: logic"); this.sendEmail(); }
    public void sendEmail()  { System.out.println("  sendEmail: logic"); }
}
// proxy: in [TX BEGIN]/[TX COMMIT] quanh mỗi lời gọi đi qua nó
```

```text
--- goi proxy.placeOrder()
[TX BEGIN] placeOrder
  placeOrder: logic
  sendEmail: logic            <- gọi qua this: KHÔNG có [TX BEGIN] riêng
[TX COMMIT] placeOrder
--- goi proxy.sendEmail()
[TX BEGIN] sendEmail          <- gọi từ ngoài qua proxy: có advice
  sendEmail: logic
[TX COMMIT] sendEmail
```

Nếu `sendEmail` mang `@Transactional(REQUIRES_NEW)` thì khi gọi từ `placeOrder` nó **không** mở transaction mới, vì proxy không được thấy call đó.

Cách sửa, theo thứ tự nên ưu tiên: (1) tách `sendEmail` sang bean khác; (2) inject chính mình qua `ObjectProvider<OrderService>`; (3) `AopContext.currentProxy()` (cần `exposeProxy=true`, xấu về thiết kế); (4) AspectJ weaving khi thật sự cần áp dụng cho call nội bộ.

**Hỏi xoáy 1:** Đặt `@Transactional` trên method `private` thì sao?
Vì sao hỏi tiếp: Hiểu proxy là subclass hoặc interface rồi, câu tiếp theo kiểm tra hệ quả: `@Transactional` trên method `private` thì sao?

**Đáp:** Bị bỏ qua. CGLIB tạo subclass và ghi đè method để chèn advice, nhưng subclass không ghi đè được `private` (cũng như `final`). Với proxy dựa trên interface (JDK proxy) chỉ method `public` của interface được chặn; với proxy dựa trên class, từ Spring 6.0 cả method `protected` và package-visible cũng được hỗ trợ, còn `private` thì không bao giờ.

**Hỏi xoáy 2:** Vì sao `@Async` và `@Transactional` trên cùng một method cho kết quả khó đoán?
Vì sao hỏi tiếp: Khi hai advice cùng bọc một method, thứ tự của chúng quyết định kết quả, nên hỏi: `@Async` và `@Transactional` trên cùng method hoạt động ra sao?

**Đáp:** Cả hai là advice trong một chuỗi interceptor, thứ tự phụ thuộc `@Order`. Nếu `@Async` đứng ngoài, method chạy ở **thread khác** nên transaction (gắn với ThreadLocal của thread gọi) không theo sang; nếu `@Transactional` đứng ngoài mà `@Async` bên trong thì transaction mở ở thread gọi và việc thật chạy ở thread khác. Cả hai đều dễ gây nhầm, nên tách riêng: service async gọi service transactional.

**Sai lầm hay gặp:** `@Transactional` trên method nội bộ rồi tin là có transaction; class `final` (Kotlin mặc định) mà quên plugin `kotlin-spring`, dẫn tới advice bị mất hoặc lỗi proxy.
*Đào sâu:* [AOP và Proxy](/go?p=01-Spring-Boot%2Fmedium%2Flt-13-aop-proxy.md).

**Nhớ:** Advice chỉ chạy khi call đi qua proxy; `this.xxx()` bỏ qua proxy. Xem [AOP và Proxy](/go?p=01-Spring-Boot%2Fmedium%2Flt-13-aop-proxy.md).

---

## 4. Propagation, rollback rule, `readOnly`: giải thích kỹ đến đâu?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Method A (`REQUIRED`) gọi method B (`REQUIRES_NEW`) rồi B ném exception. Cái gì được commit, cái gì rollback? Và nếu exception là checked exception thì sao?

**Gợi ý suy luận:**

- Một transaction vật lý gắn với cái gì (một connection, một thread)? Khi method lồng nhau thì có bao nhiêu commit/rollback?
- Tham gia transaction đang có hay mở cái mới: lỗi bên trong ảnh hưởng thế nào đến transaction chung?
- Mặc định exception loại nào kích hoạt rollback?

**Lập luận:** Một transaction vật lý gắn với **một connection** của **một thread**. Mỗi `@Transactional` lồng nhau chỉ quyết định "tham gia transaction đang có hay mở cái mới". Khi tham gia, chỉ có một commit/rollback duy nhất nên lỗi bên trong làm hỏng cả transaction chung. `REQUIRES_NEW` tạm dừng transaction ngoài, mở transaction độc lập trên connection thứ hai nên commit/rollback riêng. Mặc định chỉ rollback với `RuntimeException`/`Error`; checked exception không rollback trừ khi `rollbackFor`. Điểm dễ nhầm là nghĩ `REQUIRES_NEW` giải quyết lỗi lan: nó dùng connection thứ hai nên không thấy dữ liệu chưa commit của transaction ngoài và có thể chờ lock mà transaction ngoài đang giữ (tự deadlock). Nếu exception được bắt lại ở method ngoài mà transaction chung đã bị đánh dấu rollback-only, commit cuối sẽ ném `UnexpectedRollbackException`. Khi review, kiểm tra từng cặp propagation và nơi bắt exception.

**Đáp án ngắn:** `REQUIRED` tham gia nếu có, không có thì tạo; `REQUIRES_NEW` mở transaction độc lập trên connection thứ hai; `NESTED` dùng savepoint. Chỉ `RuntimeException`/`Error` rollback mặc định, checked cần `rollbackFor`. `readOnly=true` chỉ là gợi ý tối ưu.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng `REQUIRED`: method trong tham gia transaction ngoài; nó ném lỗi, method ngoài **bắt lại và tiếp tục**:

```text
[BEGIN outer]
  outer: ghi don hang
  [inner] loi -> danh dau ROLLBACK-ONLY
  outer: bat loi, tiep tuc nhu khong co gi
  outer: ghi log thanh cong
[ROLLBACK outer]
=> Transaction rolled back because it has been marked as rollback-only
```

Đây chính là `UnexpectedRollbackException` mà nhiều người gặp: lập trình viên tưởng bắt lỗi là xong, nhưng ngay khi `inner` ném lỗi, transaction chung đã bị đánh dấu *rollback-only*, nên lúc `outer` kết thúc, commit bị đổi thành rollback và Spring báo lỗi. Muốn `inner` thất bại mà `outer` vẫn commit thì `inner` phải ở `REQUIRES_NEW` (hoặc `NESTED`).

Rollback rule, _minh họa, chưa chạy thử_:

```java
@Transactional                                   // chỉ RuntimeException/Error rollback
// vẫn COMMIT save()!
void a() throws IOException { save(); throw new IOException("x"); }

@Transactional(rollbackFor = Exception.class)    // rollback cả checked exception
void b() throws IOException { save(); throw new IOException("x"); }   // ROLLBACK
```

**Hỏi xoáy 1:** `REQUIRES_NEW` có rủi ro gì ở tải cao?
Vì sao hỏi tiếp: `REQUIRES_NEW` cần connection thứ hai, nên hỏi ngay hệ quả tài nguyên ở tải cao.

**Đáp:** Nó cần **thêm một connection** trong khi transaction ngoài vẫn giữ connection của nó. Với pool 10 connection và 10 request đồng thời, cả 10 đều giữ connection ngoài rồi cùng chờ connection thứ hai: **tắc pool (self-deadlock)**, cho tới khi `connectionTimeout` (mặc định 30 giây) làm lỗi hàng loạt.

**Hỏi xoáy 2:** `readOnly = true` thực sự làm gì?
Vì sao hỏi tiếp: Câu trả lời nhắc `readOnly` chỉ là gợi ý, nên hỏi tiếp nó thực sự làm gì.

**Đáp:** Hibernate bỏ flush và dirty checking (nhanh và ít memory), driver/DB có thể tối ưu hoặc chuyển sang replica. Nó **không** đảm bảo DB cấm ghi trên mọi hệ thống, nên không dùng như cơ chế authorization.

**Sai lầm hay gặp:** nuốt exception trong `try/catch` rồi tưởng transaction vẫn sống (xem output trên); dùng `REQUIRES_NEW` để "ghi audit log" mà không tính tắc pool.
*Đào sâu:* [Transaction, Isolation và Lock](/go?p=02-Database%2Fmedium%2Flt-04-transaction-isolation-lock.md); [Transaction](/go?p=01-Spring-Boot%2Fmedium%2Flt-05-transaction.md).

**Nhớ:** Lồng transaction chỉ là chọn tham gia hay mở mới; `REQUIRES_NEW` tốn thêm connection; rollback mặc định chỉ cho unchecked. Xem [Transaction, Isolation và Lock](/go?p=02-Database%2Fmedium%2Flt-04-transaction-isolation-lock.md).

---

## 5. Transaction và `@Async`, thread, event tương tác ra sao?

**Câu hỏi:** Method `@Transactional` lưu đơn hàng rồi gọi `@Async` để gửi thông báo đọc lại đơn đó, nhưng tác vụ async không thấy bản ghi vừa lưu. Vì sao, và làm sao đảm bảo nó chạy sau khi commit?

**Gợi ý suy luận:**

- Trạng thái transaction nằm ở đâu (ThreadLocal của thread hiện tại)? Thread khác có thấy không?
- Thread khác đọc DB trước khi người gọi commit thì có thấy dữ liệu chưa commit không (isolation)?
- Cần một móc nào để chạy việc sau khi transaction đã commit?

**Lập luận:** Trạng thái transaction nằm trong **ThreadLocal** của thread hiện tại, nên `@Async` (chạy ở thread khác) nằm **ngoài** transaction của người gọi. Dữ liệu chưa commit lại bị isolation che đi, nên nếu tác vụ async đọc DB trước khi người gọi commit thì không thấy bản ghi mới. Do đó phải chạy tác vụ **sau commit**. Điểm dễ nhầm là kỳ vọng ThreadLocal "tự theo" sang thread khác: transaction, `SecurityContext` và MDC đều không sang `@Async`. Khi cần, đẩy việc ra sau commit (`@TransactionalEventListener(AFTER_COMMIT)`) hoặc truyền id rồi tác vụ async tự đọc lại; và nếu việc async quan trọng thì dùng outbox thay vì tin vào event trong memory.

**Đáp án ngắn:** Dùng `@TransactionalEventListener(phase = AFTER_COMMIT)` hoặc `TransactionSynchronization.afterCommit` để chạy sau commit; đừng gọi `@Async` ngay trong transaction rồi đọc lại bản ghi vừa ghi.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng: "DB" chỉ cho thread khác thấy dữ liệu đã commit; thread async không thấy ThreadLocal `tx`:

```text
Luong main dang trong TX-1
Luong pool-1-thread-1 thay transaction = null        <- ThreadLocal không sang luồng khác
(SAI)  async doc order-1 -> null                     <- gọi async TRƯỚC commit: không thấy bản ghi
(DUNG) async doc order-1 -> NEW                      <- gọi async SAU commit: thấy
```

Mẫu đúng trong Spring, _minh họa, chưa chạy thử_:

```java
@Service
class OrderService {
    private final ApplicationEventPublisher events;

    @Transactional
    void create(Order o) {
        repo.save(o);
        // chỉ đăng ký, chưa chạy ngay
        events.publishEvent(new OrderCreated(o.getId()));
    }
}

@Component
class Notifier {
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void on(OrderCreated e) { /* gửi email, đọc order: đã commit */ }
}
```

**Hỏi xoáy 1:** Trong listener `AFTER_COMMIT`, tôi `repo.save(...)` nhưng dữ liệu không được lưu, vì sao?
Vì sao hỏi tiếp: Khi đã chạy ở pha `AFTER_COMMIT`, việc ghi dữ liệu trong listener có hành vi lạ, nên hỏi: `repo.save` ở đó vì sao không được lưu?

**Đáp:** Lúc `AFTER_COMMIT` transaction cũ **đã commit xong**, nhưng tài nguyên transaction vẫn còn gắn với thread. Code truy cập dữ liệu ở thời điểm này vẫn "tham gia" transaction cũ, song thay đổi **không còn được commit**. Cần `@Transactional(propagation = REQUIRES_NEW)` trên listener để mở transaction mới thật sự (theo tài liệu của `TransactionSynchronization`).

**Hỏi xoáy 2:** Vậy gửi Kafka sau commit đã an toàn chưa?
Vì sao hỏi tiếp: Hook sau commit cũng có khoảng hở nếu process chết, nên hỏi: gửi Kafka sau commit đã an toàn chưa?

**Đáp:** Chưa. Nếu commit xong rồi process chết **trước khi gửi**, event mất vĩnh viễn (dual write). Đảm bảo thật phải dùng **outbox pattern**: ghi event vào bảng outbox cùng transaction, một process riêng đẩy lên Kafka. Xem [Microservices, Kafka và hệ phân tán](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-16-microservices-kafka-phan-tan.md).

**Sai lầm hay gặp:** gọi `@Async` ngay trong transaction rồi để tác vụ đọc bản ghi vừa tạo (race condition, ra ngẫu nhiên lúc có lúc không); dùng `parallelStream` trong `@Transactional` rồi mong các thread chung transaction.
*Đào sâu:* [Application Event](/go?p=01-Spring-Boot%2Fmedium%2Flt-17-application-events.md), [CQRS và Event Sourcing](/go?p=01-Spring-Boot%2Fhard%2Flt-25-cqrs-event-sourcing.md).

**Nhớ:** Transaction gắn với ThreadLocal nên không theo sang thread khác; việc phụ phải chạy sau commit. Xem [Application Event](/go?p=01-Spring-Boot%2Fmedium%2Flt-17-application-events.md).

---

## 6. `LazyInitializationException`, N+1 và `open-in-view`: chiến lược xử lý ở mức thiết kế?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Màn hình danh sách đơn hàng chạy ổn nhưng log cho thấy hàng trăm câu SQL cho một request, còn nơi khác thì gặp `LazyInitializationException`. Cả hai cùng gốc từ đâu, và bạn xử lý ở mức thiết kế ra sao?

**Gợi ý suy luận:**

- Quan hệ lazy thực chất là gì (proxy rỗng) và nạp bằng cái gì (một câu SQL riêng, cần session còn mở)?
- Duyệt N phần tử mà mỗi phần tử chạm quan hệ lazy thì sinh bao nhiêu câu SQL?
- `open-in-view` bật mặc định che lỗi gì và đổi lại điều gì?

**Lập luận:** Quan hệ lazy là **một proxy rỗng** chờ nạp khi bạn chạm vào, và nạp bằng **một câu SQL riêng** nhờ session còn mở. Hết session thì proxy không nạp được: `LazyInitializationException`. Duyệt N phần tử, mỗi phần tử chạm một quan hệ lazy thì ra N câu SQL cộng một câu lấy danh sách: N+1. `open-in-view` giữ session mở tới tầng view nên che lỗi lazy, nhưng khiến query chạy lén ở tầng view và giữ connection lâu. Vì thế dữ liệu cần dùng phải được quyết định ngay trong service. Điểm dễ nhầm là chữa bằng `FetchType.EAGER` hoặc bật `open-in-view`: một cái làm mọi truy vấn nặng hơn, cái kia che lỗi và giữ connection lâu. Quy trình ổn định: mỗi use case khai báo rõ dữ liệu cần (`JOIN FETCH`, `@EntityGraph` hoặc DTO), tắt OSIV, và đếm số câu SQL trong test để phát hiện N+1 trước khi lên production.

**Đáp án ngắn:** Tắt `spring.jpa.open-in-view`; nạp dữ liệu cần thiết bằng `JOIN FETCH`/`@EntityGraph`, dùng DTO projection cho truy vấn đọc, `@BatchSize`/`hibernate.default_batch_fetch_size` để gom.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng đếm truy vấn với 100 sách, mỗi sách một tác giả:

```text
N+1: 101 truy van cho 100 sach
JOIN FETCH: 1 truy van
batch_fetch_size=25: 5 truy van (1 + 4)
```

Trong Spring, _minh họa, chưa chạy thử_:

```java
// Sai: mỗi book.getAuthor().getName() có thể bắn thêm 1 SELECT
List<Book> books = bookRepo.findAll();

// Đúng: lấy đúng dữ liệu cần trong một truy vấn
@Query("select b from Book b join fetch b.author")
List<Book> findAllWithAuthor();

// Hoặc chỉ lấy cột cần, không nạp entity
interface BookView { String getTitle(); String getAuthorName(); }
@Query("select b.title as title, b.author.name as authorName from Book b")
List<BookView> findViews();
```

```yaml
spring:
  jpa:
    open-in-view: false
    properties:
      hibernate.default_batch_fetch_size: 50
```

**Hỏi xoáy 1:** `JOIN FETCH` cho hai collection cùng lúc có sao không?
Vì sao hỏi tiếp: `JOIN FETCH` là công cụ chính để sửa N+1, nên hỏi giới hạn của nó khi nạp hai collection cùng lúc.

**Đáp:** Hibernate báo `MultipleBagFetchException` (với `List`), hoặc nếu đổi sang `Set` thì ra tích Descartes: một sách 10 chương và 5 thẻ thành 50 dòng kết quả cho một sách. Fetch một collection bằng join, các collection còn lại bằng batch fetch hoặc truy vấn riêng.

**Hỏi xoáy 2:** Phân trang kèm `JOIN FETCH` collection có gì lạ?
Vì sao hỏi tiếp: Ứng dụng thật luôn cần phân trang, nên hỏi tiếp: phân trang kèm `JOIN FETCH` collection có gì lạ?

**Đáp:** Không thể `LIMIT` trên tập đã nhân dòng, nên Hibernate **nạp toàn bộ rồi phân trang trong memory** (cảnh báo `HHH90003004`). Hướng xử lý: phân trang theo id gốc trước, rồi nạp quan hệ cho các id đó.

**Sai lầm hay gặp:** sửa lỗi lazy bằng `FetchType.EAGER` toàn cục (mọi truy vấn khác cũng bị kéo theo dữ liệu thừa); trả entity ra controller để Jackson tự chạm quan hệ lazy.
*Đào sâu:* [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md), [JPA bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-16-jpa-internals.md), [Hibernate và JPA (Q&A)](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md).

**Nhớ:** Lazy là proxy cần session; tránh N+1 và lỗi lazy bằng cách quyết định fetch trong service, tắt OSIV. Xem [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md).

---

## 7. `@Async` và `@Scheduled` cấu hình executor thế nào cho production? Virtual threads thay đổi gì?

**Câu hỏi:** Dịch vụ dùng `@Async` chạy ổn, rồi một đợt tải cao làm RAM tăng dần dù số thread không đổi. Bạn cấu hình executor cho `@Async` và `@Scheduled` ra sao, và virtual threads thay đổi gì?

**Gợi ý suy luận:**

- Thread pool có hai núm là số thread và queue. Quy tắc của `ThreadPoolExecutor` về lúc nào vượt core (xem [qa-14 câu 1](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md))?
- Queue không giới hạn thì có bao giờ đầy không, và tải tăng làm gì với memory?
- `@Scheduled` mặc định chạy trên mấy thread, và một job chậm ảnh hưởng gì tới job khác?

**Lập luận:** `ThreadPoolExecutor` chỉ tạo thread vượt core khi **queue đầy**. Queue không giới hạn không bao giờ đầy, nên pool **không bao giờ lớn hơn core** và tải tăng chỉ làm queue phình ra đến cạn RAM. Mặc định Boot dùng `applicationTaskExecutor` với queue không giới hạn cho `@Async`, và `@Scheduled` chạy trên **một thread**, nên một job chậm làm job khác đợi. Vì vậy production cần khai báo executor riêng. Điểm dễ nhầm là tin số thread của pool không đổi nghĩa là an toàn: queue không giới hạn vẫn nuốt RAM, và `@Scheduled` mặc định một thread khiến job chậm làm trễ mọi job khác. Khi cấu hình, đặt tên thread, giới hạn queue, chính sách từ chối rõ ràng, tách pool theo loại tải, và với virtual threads thì giới hạn đồng thời bằng `Semaphore` thay vì kích thước pool.

**Đáp án ngắn:** Khai báo executor riêng: đặt tên thread, giới hạn queue, chọn chính sách từ chối, tách pool theo loại tải. Với tải I/O, virtual threads cho phép mỗi tác vụ một virtual thread thay vì tinh chỉnh pool.

**Ví dụ 1:** _Đã chạy thử trên JDK 11._ Cùng pool `core=2, max=6`, gửi 12 tác vụ chặn:

```text
Queue KHONG gioi han: threads=2 (core=2,max=6), queue=10
  task 10 bi TU CHOI
  task 11 bi TU CHOI
Queue gioi han 4    : threads=6 (core=2,max=6), queue=4
```

Với queue không giới hạn, `max=6` **vô nghĩa** (chỉ có 2 thread, 10 tác vụ chờ). Với queue giới hạn 4, pool mới nở lên 6 thread, và khi cả thread lẫn queue đều đầy thì tác vụ bị từ chối (hai tác vụ cuối), đúng lúc bạn muốn biết hệ thống quá tải.

**Ví dụ 2:** _Đã chạy thử trên JDK 11._ Scheduler một thread: job chậm (1,5 giây) làm trễ job nhanh hẹn lúc 200 ms:

```text
  21ms  [pool-1-thread-1] job CHAM bat dau
1546ms  [pool-1-thread-1] job NHANH (hen luc 200ms)
```

Job nhanh hẹn 200 ms nhưng chạy lúc 1546 ms vì dùng chung một thread. Cấu hình, _minh họa, chưa chạy thử_:

```yaml
spring:
  task:
    scheduling:
      pool:
        size: 4          # mặc định 1
    execution:
      pool:
        core-size: 4
        max-size: 8
        queue-capacity: 100
      thread-name-prefix: app-
      shutdown:
        await-termination: true
        await-termination-period: 30s
```

Virtual threads (Java 21, Boot 3.2+): `spring.threads.virtual.enabled=true` cho Tomcat và executor mặc định. Hợp với tải chờ I/O; không làm code CPU-bound nhanh hơn; pool DB vẫn là nút cổ chai. Ở Java 21, `synchronized` bao quanh thao tác chặn có thể "ghim" carrier thread; kiểm tra lại theo phiên bản Java bạn dùng.

**Hỏi xoáy 1:** Method `void` có `@Async` ném exception thì sao?
Vì sao hỏi tiếp: `@Async` trả về ngay cho người gọi, nên hỏi: method `void` ném exception thì ai nhận lỗi?

**Đáp:** Không có ai nhận exception (người gọi đã quay về từ lâu). Chỉ có `AsyncUncaughtExceptionHandler` mới thấy; nếu không cấu hình thì lỗi chỉ được log. Trả `CompletableFuture` nếu người gọi cần biết lỗi.

**Hỏi xoáy 2:** `@Scheduled` trên 3 instance của service thì chạy mấy lần?
Vì sao hỏi tiếp: Sau khi tách riêng executor, vấn đề khác là nhiều instance, nên hỏi: `@Scheduled` trên 3 instance chạy mấy lần?

**Đáp:** Ba lần, mỗi instance một lần. Cần distributed lock (ShedLock) hoặc chỉ định một instance chạy job.

**Sai lầm hay gặp:** dùng `Executors.newFixedThreadPool` (queue không giới hạn); `fixedRate` mà job chạy lâu hơn chu kỳ nên các lượt xếp chồng; quên `AsyncUncaughtExceptionHandler`.
*Đào sâu:* [Scheduling và Async](/go?p=01-Spring-Boot%2Fmedium%2Flt-18-scheduling-async.md), [Đồng thời và Virtual Threads](/go?p=01-Spring-Boot%2Fhard%2Flt-22-concurrency-virtual-threads.md), [Thread pool trong thực tế](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-08-thread-pool.md).

**Nhớ:** Pool chỉ nở khi queue đầy; executor production phải có giới hạn. Xem [Scheduling và Async](/go?p=01-Spring-Boot%2Fmedium%2Flt-18-scheduling-async.md).

---

## 8. Flow OAuth2/OIDC và JWT trong Spring Security, những sai lầm bảo mật thường gặp?

**Câu hỏi:** Một dev nói "JWT đã mã hóa rồi nên nhét email và quyền vào payload cũng được". Điều này sai ở đâu? Và flow OAuth2/OIDC với JWT trong Spring Security gồm những vai nào, sai lầm bảo mật nào hay gặp?

**Gợi ý suy luận:**

- Chữ ký chứng minh được điều gì (nội dung không bị sửa, do bên giữ lock phát hành) và không chứng minh được điều gì (che giấu nội dung)?
- Resource server cần những gì để kiểm token cục bộ (public key, `iss`, `exp`, `aud`)?
- Ai cấp token, ai kiểm token, ai gọi API: những vai nào trong thread?

**Lập luận:** JWT là **dữ liệu có chữ ký**, không phải dữ liệu **được giấu**: ai cầm token cũng đọc được payload, nên không nhét dữ liệu nhạy cảm vào. Chữ ký chỉ chứng minh nội dung không bị sửa, nên server phải kiểm chữ ký, `iss`, `exp` (và `aud`) chặt, nếu không kẻ khác có thể giả mạo. Flow gồm Authorization Server cấp token, Resource Server (API của bạn) kiểm token, và Client. Điểm dễ nhầm là coi JWT được "mã hóa" vì nhìn chuỗi không đọc được: payload chỉ là Base64URL, ai cũng giải mã được, và thuật toán `alg=none` hoặc đổi HS256 sang RS256 bị lợi dụng nếu server không ép thuật toán. Khi cấu hình Resource Server, ép thuật toán, kiểm `iss`, `aud`, `exp`, dùng token ngắn hạn, và chỉ đặt định danh tối thiểu trong payload (quyền tra thêm ở server nếu cần).

**Đáp án ngắn:** Web/mobile dùng Authorization Code + **PKCE**. OIDC thêm `id_token` (người dùng là ai), `access_token` để gọi API. Trong Spring, `spring-boot-starter-oauth2-resource-server` với `issuer-uri` tự lấy public key (JWKS), kiểm chữ ký, `iss`, `exp`.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Payload của JWT là Base64URL, **không cần key để đọc**; và kẻ tấn công có thể dựng token với `alg=none`:

```text
Token: eyJhbGciOiJSUzI1NiIs....eyJzdWIiOiI0MiIs....CHU_KY_GIA
Ai cung doc duoc payload, khong can khoa: {"sub":"42","email":"an@corp.vn","role":"USER","exp":1893456000}
Token gia (alg=none): eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ...("role":"ADMIN")....
```

Một server cũ kiểm tra "thuật toán gì thì dùng thuật toán đó" sẽ chấp nhận token không chữ ký trên và coi người dùng là ADMIN. Thư viện hiện đại từ chối `alg=none` và bắt bạn **chỉ định thuật toán/lock mong đợi**, không tin header. Cấu hình, _minh họa, chưa chạy thử_:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/corp   # tự lấy JWKS và kiểm iss
```

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a.requestMatchers("/admin/**").hasAuthority("SCOPE_admin")
                                      .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .build();
}
```

**Hỏi xoáy 1:** Vì sao access token không thể "thu hồi" ngay, và xử lý thế nào?
Vì sao hỏi tiếp: Resource server kiểm token cục bộ, nên hỏi hệ quả: vì sao access token không thể thu hồi ngay?

**Đáp:** Resource server kiểm token **cục bộ** bằng chữ ký, không hỏi lại Authorization Server, nên token còn hạn sẽ được chấp nhận dù bạn đã lock tài khoản. Cách xử lý: access token **ngắn hạn** (5-15 phút) cộng refresh token xoay vòng, hoặc kiểm tra danh sách thu hồi/introspection cho thao tác nhạy cảm.

**Hỏi xoáy 2:** Lưu token ở đâu trong trình duyệt?
Vì sao hỏi tiếp: Token tồn tại phía client, nên hỏi tiếp: lưu token ở đâu trong trình duyệt cho an toàn?

**Đáp:** `localStorage` đọc được bằng JavaScript nên một lỗ XSS là mất token. Ưu tiên cookie `HttpOnly` + `Secure` + `SameSite`, hoặc mô hình BFF giữ token phía server. Dùng cookie thì cần bảo vệ CSRF, nên đừng tắt CSRF cho API dùng cookie.

**Sai lầm hay gặp:** không kiểm `aud`/`iss`; nhét dữ liệu nhạy cảm vào payload (ai cũng đọc được); chỉ kiểm "đã đăng nhập" mà không kiểm quyền sở hữu dữ liệu (IDOR: `GET /orders/42` của người khác).
*Đào sâu:* [Spring Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md), [OAuth2 và OIDC](/go?p=01-Spring-Boot%2Fmedium%2Flt-20-oauth2-oidc.md), [Authentication, Phiên và Token](/go?p=03-Network-Security%2Fmedium%2Flt-05-xac-thuc-phien-token.md).

**Nhớ:** JWT có chữ ký chứ không bí mật; kiểm `iss`/`aud`/`exp`, token ngắn hạn. Xem [Spring Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md).

---

## 9. Validation và xử lý lỗi toàn cục: thiết kế thế nào để API nhất quán?

**Câu hỏi:** Hai request cùng đăng ký một email. Code kiểm tra "email đã tồn tại chưa" rồi mới lưu, vậy mà DB vẫn có hai bản ghi trùng. Vì sao, và bạn thiết kế validation cùng xử lý lỗi toàn cục thế nào để API nhất quán?

**Gợi ý suy luận:**

- Giữa bước kiểm tra và bước ghi, request khác có chen vào được không (check-then-act)?
- Nơi nào đảm bảo tính duy nhất một cách nguyên tử (UNIQUE ở DB)?
- Validation ở tầng ứng dụng đóng vai trò gì nếu DB đã là chốt cuối?

**Lập luận:** Kiểm tra rồi mới ghi là **check-then-act**: giữa hai bước, request khác chen vào nên cả hai cùng thấy "chưa tồn tại". Chỉ **ràng buộc nguyên tử ở nơi dữ liệu nằm** (UNIQUE) mới đúng; validation ở tầng ứng dụng chỉ để trả lỗi sớm và dễ đọc. Khi lỗi tới từ nhiều nơi (DTO sai, vi phạm UNIQUE), cần một chỗ tập trung chuyển thành phản hồi thống nhất. Điểm dễ nhầm là nghĩ validation ở controller đủ để bảo đảm duy nhất: nó chỉ trả lỗi sớm và đẹp, còn ràng buộc UNIQUE ở DB mới đúng. Vì vậy cần cả hai và một nơi tập trung chuyển `DataIntegrityViolationException` thành 409 trong `@RestControllerAdvice`, để cả hai request trùng đều nhận phản hồi có cấu trúc thay vì 500.

**Đáp án ngắn:** Ràng buộc trên **DTO** (`@NotBlank`, `@Size`, `@Email`) kích hoạt bằng `@Valid`; `@Validated` ở class cho tham số đơn; quy tắc phụ thuộc DB dựa vào unique constraint. Lỗi toàn cục qua `@RestControllerAdvice` trả `ProblemDetail` (RFC 9457, trước đó RFC 7807).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Hai request đăng ký cùng email đến đồng thời. Kiểm tra rồi ghi cho **2 dòng**; dùng ràng buộc nguyên tử (mô phỏng UNIQUE bằng `Set.add`) cho 1 dòng và request thua nhận 409:

```text
Kiem tra roi ghi: so dong = 2 (sai, mong doi 1)
  DuplicateKey -> tra 409
Co UNIQUE constraint: so dong = 1
```

Spring, _minh họa, chưa chạy thử_:

```java
record SignupRequest(@NotBlank @Email String email, @Size(min = 8) String password) {}

@PostMapping("/signup")
ResponseEntity<Void> signup(@Valid @RequestBody SignupRequest r) {
    service.signup(r);                       // dựa vào UNIQUE(email) ở DB
    return ResponseEntity.status(CREATED).build();
}

@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail dup(DataIntegrityViolationException e) {
        var p = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Email đã tồn tại");
        p.setType(URI.create("https://api.example.com/problems/duplicate-email"));
        return p;
    }
}
```

**Hỏi xoáy 1:** `@Valid` không chạy trên field lồng, vì sao?
Vì sao hỏi tiếp: Validation trên DTO có giới hạn nhất định, nên hỏi: `@Valid` không chạy trên field lồng, vì sao?

**Đáp:** Bean Validation không tự đệ quy vào object lồng; phải đặt `@Valid` ở **field lồng**. Với danh sách thì `List<@Valid Item>`.

**Hỏi xoáy 2:** Vì sao không dùng entity JPA làm DTO nhận request?
Vì sao hỏi tiếp: Câu trả lời nhấn mạnh DTO, nên hỏi lý do không dùng thẳng entity JPA làm DTO nhận request.

**Đáp:** Mass assignment: client gửi thêm field `role` hay `id` và Jackson gán vào entity. DTO là bề mặt contract, entity là chi tiết lưu trữ; tách ra để không lộ trường và không bị client chọc vào.

**Sai lầm hay gặp:** trả `200` kèm cờ lỗi trong body; mỗi controller tự bắt lỗi một kiểu; lộ stack trace hay message nội bộ ra ngoài.
*Đào sâu:* [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md), [Distributed lock và Idempotency](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md).

**Nhớ:** Tính duy nhất do DB đảm bảo; validation chỉ để báo lỗi sớm; lỗi API thống nhất qua `@RestControllerAdvice`. Xem [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md).

---

## 10. Chiến lược test cho một ứng dụng Spring Boot: slice test, Testcontainers và mock?

**Câu hỏi:** Bộ test của dự án chạy 20 phút vì mọi test đều `@SpringBootTest`, nhưng bạn dùng H2 nên vẫn lọt lỗi lên production. Chiến lược test hợp lý là gì?

**Gợi ý suy luận:**

- Test có hai giá thành: thời gian chạy (nạp context) và độ tin cậy (giống production đến đâu). Tầng nào rẻ, tầng nào đắt?
- Test tầng dữ liệu bằng H2 khác DB thật ở điểm nào (dialect, hành vi SQL)?
- Mock ở đâu thì hợp lý: mọi chỗ hay chỉ biên với hệ thống ngoài?

**Lập luận:** Tháp test đặt đúng chỗ giá thành: nhiều test rẻ ở đáy (unit thuần không Spring), ít test đắt nhưng giống thật ở đỉnh. Ở giữa là slice test (`@WebMvcTest`, `@DataJpaTest`) chỉ nạp phần cần thiết. Tầng dữ liệu nên chạy trên DB thật trong container (Testcontainers) vì H2 khác dialect và hành vi. Mock cả repository thì test chỉ kiểm tra mock, nên chỉ mock ở **biên** (dịch vụ ngoài). Điểm dễ nhầm là mock quá nhiều: test dựng mock cho cả repository chỉ kiểm tra rằng mock được gọi, không kiểm tra truy vấn đúng hay sai. Hãy để unit test thuần tập trung vào logic, `@DataJpaTest` cùng Testcontainers kiểm tra truy vấn trên DB thật, và vài test `@SpringBootTest` kiểm tra flow chính từ đầu đến cuối; dùng lại context (cùng cấu hình) để bộ test không phình thời gian.

**Đáp án ngắn:** Unit test thuần, rồi slice test, rồi ít `@SpringBootTest`. Tầng dữ liệu dùng Testcontainers thay H2; mock ở biên dịch vụ ngoài.

**Ví dụ:** _Minh họa, chưa chạy thử._

```java
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = NONE)       // không thay bằng H2
class OrderRepositoryTest {

    // Boot 3.1+: tự nối DataSource tới container
    @Container @ServiceConnection
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");

    @Autowired OrderRepository repo;

    @Test
    void shouldFindByStatus() {
        repo.save(new Order("o1", "NEW"));
        assertThat(repo.findByStatus("NEW")).hasSize(1);
    }
}
```

Vì sao không H2: câu `select ... for update skip locked`, kiểu `jsonb`, hay `ON CONFLICT` của PostgreSQL chạy được trên container thật nhưng **lỗi hoặc cho kết quả khác** trên H2, nên test xanh mà production đỏ.

**Hỏi xoáy 1:** Test chậm dần theo thời gian, nghi ngờ gì?
Vì sao hỏi tiếp: Dù áp dụng tháp test, thời gian chạy vẫn có thể tăng dần, nên hỏi: nghi ngờ gì khi test chậm dần?

**Đáp:** **Context cache bị vỡ**. Spring cache `ApplicationContext` theo key cấu hình; mỗi tổ hợp `@MockitoBean`, `@TestPropertySource`, `@ActiveProfiles` khác nhau tạo một context mới (nạp lại từ đầu). Gom cấu hình test giống nhau, tránh `@DirtiesContext`.

**Hỏi xoáy 2:** Test async không dùng `Thread.sleep` thì làm sao?
Vì sao hỏi tiếp: Test dịch vụ async hay phải chờ kết quả, nên hỏi tiếp: không dùng `Thread.sleep` thì làm sao?

**Đáp:** Awaitility chờ **điều kiện** với timeout (`await().atMost(5, SECONDS).until(() -> repo.count() == 1)`), vừa nhanh hơn khi xong sớm, vừa ít flaky.

**Sai lầm hay gặp:** `@SpringBootTest` cho mọi thứ; mock cả repository rồi test chỉ kiểm tra được call mock; test phụ thuộc thứ tự hoặc dữ liệu dùng chung.
*Đào sâu:* [Testing cơ bản](/go?p=01-Spring-Boot%2Feasy%2Flt-12-testing-co-ban.md), [Testing nâng cao](/go?p=01-Spring-Boot%2Fhard%2Flt-27-advanced-testing.md).

**Nhớ:** Nhiều test rẻ, ít test đắt; DB thật bằng Testcontainers; mock ở biên. Xem [Testing cơ bản](/go?p=01-Spring-Boot%2Feasy%2Flt-12-testing-co-ban.md).

---

## 11. Observability: bạn cần những gì để biết hệ thống đang khỏe?

**Câu hỏi:** Người dùng báo hệ thống chậm nhưng dashboard cho thấy latency trung bình vẫn 100 ms. Bạn cần những tín hiệu nào để biết hệ thống khỏe, và dùng chúng ra sao?

**Gợi ý suy luận:**

- Metric, trace, log mỗi loại trả lời câu hỏi nào ("có vấn đề không", "ở đâu", "chuyện gì")?
- Vì sao metric rẻ, và thêm nhãn nhiều giá trị (user id) thì chuyện gì xảy ra với số dãy số?
- Trung bình có che được đuôi chậm không? Còn liveness và readiness khác nhau ở hành động nào?

**Lập luận:** Metric trả lời "**có** vấn đề không" (rẻ, tổng hợp), trace trả lời "**ở đâu**" (theo một request), log trả lời "**chuyện gì** đã xảy ra" (chi tiết). Metric rẻ vì mỗi *tổ hợp nhãn* chỉ là một dãy số, nên nhãn cardinality cao nhân số dãy số lên. Trung bình che đuôi chậm, nên phải xem p95/p99. Probe cũng phải đúng ý nghĩa: liveness quyết định restart, readiness quyết định nhận traffic. Điểm dễ nhầm là đặt nhãn metric theo giá trị không giới hạn (user id, URL đầy đủ), tạo vô số chuỗi thời gian làm nặng hệ thống giám sát (cardinality explosion). Nên dùng nhãn có tập giá trị nhỏ (template URL, mã trạng thái), cảnh báo theo p99 và tỉ lệ lỗi, và đặt `traceId` vào log để từ một cảnh báo đi tới đúng request chậm.

**Đáp án ngắn:** Actuator + Micrometer (metrics sang Prometheus), Micrometer Tracing (OpenTelemetry), `traceId` trong MDC. Theo dõi p95/p99, pool DB (active/pending), pool thread, GC, latency gọi ngoài, Kafka lag. Tách liveness và readiness.

**Ví dụ:** _Đã chạy thử (tính bằng Python)._ 20 endpoint × 5 status code, so sánh nhãn `uri` đã chuẩn hóa với nhãn `userId` (100 000 người dùng):

```text
series neu tag uri template: 100
series neu tag userId:       10000000
```

Từ 100 lên 10 triệu dãy số cho **một** metric: máy chủ giám sát cạn memory. Cấu hình, _minh họa, chưa chạy thử_:

```yaml
management:
  endpoints.web.exposure.include: health,info,prometheus
  # /actuator/health/liveness và /readiness
  endpoint.health.probes.enabled: true
  health.livenessstate.enabled: true
  tracing.sampling.probability: 0.1
logging.pattern.level: "%5p [${spring.application.name},%X{traceId},%X{spanId}]"
```

**Hỏi xoáy 1:** Vì sao không đưa kiểm tra DB vào liveness?
Vì sao hỏi tiếp: Probe là phần dễ sai nhất, nên hỏi ngay: vì sao không đưa kiểm tra DB vào liveness?

**Đáp:** Liveness sai thì Kubernetes **restart** pod. DB chậm hay sập, mọi pod cùng fail liveness, bị restart hàng loạt, và đúng lúc DB hồi phục thì cả đàn pod đang khởi động gây thêm tải. DB chỉ nên ảnh hưởng **readiness**.

**Hỏi xoáy 2:** Trung bình 100 ms nhưng người dùng kêu chậm, xem gì?
Vì sao hỏi tiếp: Tình huống mở đầu về trung bình, nên hỏi trực tiếp: trung bình 100 ms nhưng người dùng kêu chậm thì xem gì?

**Đáp:** Phân vị p99. Trung bình che đuôi: 1% request chậm 5 giây vẫn cho trung bình dễ coi. Với hệ thống một request gọi nhiều dịch vụ, xác suất gặp đuôi chậm của ít nhất một dịch vụ lớn hơn nhiều so với p99 của từng dịch vụ.

**Sai lầm hay gặp:** gắn nhãn cardinality cao (user id, URL đầy đủ); log DEBUG ở production; cảnh báo theo ngưỡng cứng thay vì theo SLO.
*Đào sâu:* [Observability](/go?p=01-Spring-Boot%2Fmedium%2Flt-19-observability.md), [Xử lý sự cố, SRE và vận hành](/go?p=04-DevOps%2Fhard%2Flt-07-su-co-sre-observability.md).

**Nhớ:** Metric cho "có không", trace cho "ở đâu", log cho "chuyện gì"; xem phân vị, không chỉ trung bình. Xem [Observability](/go?p=01-Spring-Boot%2Fmedium%2Flt-19-observability.md).

---

## 12. Cấu hình theo môi trường và quản lý secrets đúng cách?

**Câu hỏi:** Lần deploy đêm qua, ứng dụng trỏ nhầm vào DB production từ môi trường staging, và mật khẩu DB nằm trong `application-prod.yml` đã commit. Cấu hình theo môi trường và secret nên được quản lý thế nào?

**Gợi ý suy luận:**

- Nếu code đổi giữa các môi trường thì artifact đã test có còn là cái chạy ở production không?
- Khi nhiều nguồn cấu hình cùng đặt một lock, nguồn nào thắng (thứ tự ưu tiên)?
- Secret nằm trong repo hay image thì ai đọc được?

**Lập luận:** Cấu hình thay đổi theo môi trường nhưng **code thì không được đổi**: cùng một artifact đã test phải là thứ chạy ở production, nên khác biệt phải đến từ bên ngoài. Có nhiều nguồn nên cần thứ tự ưu tiên rõ (cao đè thấp). Secret trong repo hay image là secret đã lộ cho mọi người từng đọc, nên chúng phải đến từ nơi có kiểm soát truy cập. Điểm dễ nhầm là nghĩ ẩn secret trong biến môi trường là đủ: nó vẫn có thể lộ qua `/actuator/env`, log hoặc dump nếu không che. Hãy cấu hình `management.endpoint.env.show-values`, dùng secret manager với khả năng xoay vòng, không commit file cấu hình chứa mật khẩu, và để mỗi môi trường tự lấy cấu hình riêng thay vì dựa vào profile mặc định trỏ vào hạ tầng thật.

**Đáp án ngắn:** Thứ tự ưu tiên: tham số dòng lệnh > biến môi trường > `application-{profile}.yml` > `application.yml`. Gom vào `@ConfigurationProperties` (`@Validated`, fail-fast). Secret qua biến môi trường, Kubernetes Secret, hoặc Vault/Secrets Manager.

**Ví dụ:** _Minh họa, chưa chạy thử._

```yaml
# application.yml (trong repo, KHÔNG có secret)
app:
  payment:
    base-url: http://payment.internal
    timeout: 3s
    # lấy từ môi trường, thiếu thì khởi động thất bại
    api-key: ${PAYMENT_API_KEY}
```

```java
@ConfigurationProperties("app.payment")
@Validated
record PaymentProps(@NotBlank String baseUrl, @NotNull Duration timeout, @NotBlank String apiKey) {}
```

```bash
# Ghi đè bằng biến môi trường: dấu chấm -> gạch dưới, chữ HOA
SPRING_DATASOURCE_URL=jdbc:postgresql://db-prod:5432/app \
APP_PAYMENT_TIMEOUT=5s \
java -jar app.jar --server.port=9090          # tham số dòng lệnh thắng cả hai
```

Fail-fast: thiếu `PAYMENT_API_KEY` thì app **không khởi động** và nói rõ thiếu gì, tốt hơn nhiều so với chạy rồi lỗi ở transaction đầu tiên.

**Hỏi xoáy 1:** Khác nhau giữa profile và cấu hình ngoài?
Vì sao hỏi tiếp: Có profile lẫn cấu hình ngoài dễ gây lẫn lộn vai trò, nên hỏi: khác nhau giữa profile và cấu hình ngoài?

**Đáp:** Profile chọn **bean/hành vi** theo môi trường (`@Profile("prod")` bật bean thật, `dev` bật bean giả). Giá trị khác nhau (URL, mật khẩu) thuộc cấu hình ngoài. Nhồi quá nhiều khác biệt logic vào profile làm môi trường test không còn giống production.

**Hỏi xoáy 2:** Secret nằm trong biến môi trường là an toàn chưa?
Vì sao hỏi tiếp: Chuyển secret sang biến môi trường là bước đầu, nên hỏi: như vậy đã an toàn chưa?

**Đáp:** An toàn hơn trong repo, nhưng vẫn lộ qua `/proc`, `docker inspect`, dump môi trường, hoặc `/actuator/env` nếu mở. Mức cao hơn: kho secret có authorization, kiểm toán và **xoay vòng** tự động.

**Sai lầm hay gặp:** `application-prod.yml` chứa mật khẩu trong repo; thay code chỉ để đổi cấu hình; chạy production với profile `default` nên dùng nhầm DB dev.
*Đào sâu:* [Cấu hình và Profile](/go?p=01-Spring-Boot%2Feasy%2Flt-11-config-profile.md).

**Nhớ:** Một artifact, nhiều môi trường nhờ cấu hình ngoài; secret không bao giờ vào repo hay image. Xem [Cấu hình và Profile](/go?p=01-Spring-Boot%2Feasy%2Flt-11-config-profile.md).

---

## 13. Graceful shutdown: làm sao deploy mà không rớt request?

**Câu hỏi:** Mỗi lần deploy, một số người dùng thấy lỗi 502 hoặc request bị cắt giữa chừng. Làm sao deploy mà không rớt request?

**Gợi ý suy luận:**

- Tắt process có hai cách: SIGKILL (dang dở) hay SIGTERM (báo trước, ngừng nhận việc mới, làm nốt việc cũ). Việc đang chạy được gì ở mỗi cách?
- Dù đã graceful, load balancer có biết ngay là pod sắp tắt không?
- Executor tự khai báo có tự chờ việc đang chạy khi tắt không?

**Lập luận:** Kéo phích (SIGKILL) thì mọi thứ dang dở, nên cần cách thứ hai: nhận SIGTERM, ngừng nhận việc mới, làm nốt việc cũ trong thời hạn. Nhưng **người ngoài chưa biết** bạn sắp tắt: load balancer vẫn gửi request tới pod, nên cần có độ trễ (`preStop`) và readiness để gỡ pod khỏi nhóm trước khi tắt. Pool tự khai báo thì phải được dặn chờ việc khi tắt. Điểm dễ nhầm là nghĩ bật `server.shutdown=graceful` là đủ: nếu load balancer chưa gỡ pod thì request mới vẫn tới, và nếu `terminationGracePeriodSeconds` ngắn hơn thời gian chờ thì bị SIGKILL cắt ngang. Trên Kubernetes, kết hợp readiness chuyển thất bại, `preStop` ngắn, thời gian chờ shutdown hợp lý, và executor tự khai báo phải được dặn chờ tác vụ khi tắt.

**Đáp án ngắn:** `server.shutdown=graceful` (chờ tối đa `spring.lifecycle.timeout-per-shutdown-phase`, mặc định 30 s); executor tự khai báo đặt `setWaitForTasksToCompleteOnShutdown(true)` và `awaitTermination`.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Hai thanh toán đang xử lý (800 ms) thì có lệnh tắt:

```text
Cach 1: shutdownNow() (khong graceful)
  [thanh-toan-1] bat dau
  [thanh-toan-2] bat dau
  [thanh-toan-1] BI NGAT giua chung
  [thanh-toan-2] BI NGAT giua chung
Cach 2: shutdown() + awaitTermination (graceful)
  [thanh-toan-1] bat dau
  [thanh-toan-2] bat dau
  request moi -> tu choi
  [thanh-toan-1] XONG
  [thanh-toan-2] XONG
  xong het trong han: true
```

Trên Kubernetes còn một khe: sau khi pod nhận tín hiệu dừng, **load balancer có thể vẫn gửi traffic thêm vài giây** vì việc gỡ endpoint diễn ra async. Cấu hình, _minh họa, chưa chạy thử_:

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

```yaml
# Kubernetes (rút gọn)
terminationGracePeriodSeconds: 45           # PHẢI lớn hơn 30s + preStop
lifecycle:
  preStop:
    exec: { command: ["sleep", "5"] }       # chờ LB gỡ endpoint rồi mới SIGTERM
```

Kịch bản thời gian: `T+0` pod `Terminating`, `preStop` ngủ 5 s (LB gỡ pod) → `T+5` SIGTERM, Spring ngừng nhận mới, chờ tối đa 30 s → `T+35` xong; nếu quá `T+45` bị SIGKILL.

**Hỏi xoáy 1:** `terminationGracePeriodSeconds` đặt 30 và timeout Spring 30 thì sao?
Vì sao hỏi tiếp: Hai timeout (Kubernetes và Spring) chồng lên nhau dễ sai, nên hỏi: `terminationGracePeriodSeconds` đặt 30 và timeout Spring 30 thì sao?

**Đáp:** Thời gian `preStop` cũng tính vào 30 giây, nên Spring chỉ còn khoảng 25 giây; request kéo dài hơn bị SIGKILL cắt giữa chừng. Luôn đặt grace period **lớn hơn** tổng `preStop` + timeout shutdown.

**Hỏi xoáy 2:** Consumer Kafka thì sao khi tắt?
Vì sao hỏi tiếp: Không chỉ HTTP mới có việc dang dở, nên hỏi tiếp: consumer Kafka xử lý thế nào khi tắt?

**Đáp:** Cần dừng `poll`, xử lý xong lô đang cầm và commit offset trước khi thoát; nếu bị cắt giữa chừng, offset chưa commit nên message được xử lý lại (at-least-once), vì vậy xử lý phải idempotent.

**Sai lầm hay gặp:** grace period ngắn hơn thời gian xử lý nên pod bị SIGKILL; đóng pool DB trước khi tác vụ dùng nó xong.
*Đào sâu:* [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md).

**Nhớ:** Graceful là ngừng nhận việc mới và chờ việc cũ; grace period phải lớn hơn `preStop` cộng timeout shutdown. Xem [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md).

---

## 14. Hikari pool và Tomcat thread pool: cỡ bao nhiêu là hợp lý?

**Câu hỏi:** Ứng dụng có Tomcat 200 thread và Hikari 10 connection. Tải tăng thì bạn tăng pool DB lên 200 nhưng hệ thống còn chậm hơn. Vì sao, và cỡ bao nhiêu là hợp lý?

**Gợi ý suy luận:**

- Throughput của một tài nguyên giới hạn tính thế nào (số slot chia thời gian giữ slot, Định luật Little)?
- Tăng số thread phía trước thì throughput DB có tăng, hay chỉ hàng chờ dài hơn?
- DB chỉ có vài lõi và đĩa: nhiều truy vấn đồng thời hơn thì gây tranh chấp gì?

**Lập luận:** Throughput của một tài nguyên bị giới hạn = **số slot ÷ thời gian giữ slot**, nên `throughput ≤ poolSize / thời gian giữ connection`. Tăng thread phía trước không làm tăng throughput, chỉ làm hàng chờ dài hơn. Muốn tăng thật thì trước hết phải rút ngắn **thời gian giữ connection**. Còn tăng pool vô độ làm DB bị tranh chấp, nên cỡ pool phải tính theo khả năng của DB. Điểm dễ nhầm là tăng pool để "giải quyết chậm": nếu mỗi request giữ connection 400 ms vì gọi HTTP trong transaction thì tăng pool chỉ chuyển nút thắt sang DB. Cách làm: đo thời gian giữ connection, rút ngắn transaction, và tính tổng connection mọi instance không vượt `max_connections` của DB; cỡ pool nhỏ vừa đủ thường nhanh hơn pool lớn.

**Đáp án ngắn:** Mặc định Hikari 10, Tomcat 200, phải xem cùng nhau. Rút ngắn thời gian giữ connection (transaction nhỏ, không gọi HTTP ngoài trong transaction, tắt OSIV) trước khi tăng pool; tổng connection của mọi instance không vượt `max_connections` của DB.

**Ví dụ:** _Đã chạy thử trên JDK 11._ 200 thread "Tomcat" tranh pool DB trong 2 giây:

```text
pool=10, giu connection 50ms (chi query)          -> 195 req/s (ly thuyet: 10/0.050 = 200)
pool=10, giu 550ms (query + goi HTTP ngoai 500ms) -> 18 req/s (ly thuyet: 10/0.550 = 18)
pool=50, giu 550ms                                -> 90 req/s (ly thuyet: 50/0.550 = 91)
```

Cùng pool 10, chỉ vì **giữ connection trong lúc chờ HTTP ngoài 500 ms**, throughput tụt từ ~200 xuống ~18 req/s (giảm 11 lần). Tăng pool lên 50 chỉ cứu được tới 90 req/s mà còn đẩy 5 lần số connection lên DB. Cách đúng là **đừng giữ connection khi chờ ngoài**: gọi HTTP trước hoặc sau transaction.

Tính nhu cầu theo Little (Python): tải 400 req/s, giữ 50 ms → cần `400 × 0,05 = 20` connection đồng thời; giữ 550 ms → `400 × 0,55 = 220`. Chỉ số cần xem: `hikaricp.connections.active/pending/timeout` (pending > 0 kéo dài là dấu hiệu nghẽn).

```yaml
spring.datasource.hikari:
  maximum-pool-size: 20
  connection-timeout: 3000      # đừng để 30s: thà lỗi nhanh còn hơn cả đàn luồng treo
  leak-detection-threshold: 20000
```

**Hỏi xoáy 1:** DB chỉ 8 lõi, vì sao pool 200 thường **chậm hơn** pool 20?
Vì sao hỏi tiếp: Kết luận "đừng tăng pool" nghe ngược trực giác, nên hỏi: DB chỉ 8 lõi, vì sao pool 200 thường chậm hơn pool 20?

**Đáp:** DB chỉ chạy hiệu quả khi số truy vấn đang chạy gần số lõi và đĩa; hơn nữa chỉ tạo tranh chấp lock, chuyển ngữ cảnh, thrashing cache. Công thức tham khảo của Hikari: `(số lõi × 2) + số đĩa hiệu dụng`, rồi **đo**.

**Hỏi xoáy 2:** Có 10 pod, mỗi pod pool 20, DB `max_connections=100`?
Vì sao hỏi tiếp: Pool tính cho một instance, nhưng ứng dụng chạy nhiều pod, nên hỏi: 10 pod mỗi pod pool 20, DB `max_connections=100` thì sao?

**Đáp:** Tổng 200 > 100, pod mới khởi động sẽ lỗi "too many connections". Khi autoscale lên 15 pod còn tệ hơn. Dùng PgBouncer/proxy để dồn connection, hoặc tính ngược `poolSize = max_connections × 0,8 ÷ số pod tối đa`.

**Sai lầm hay gặp:** tăng `maximumPoolSize` lên hàng trăm khi DB đang nghẽn; để `connection-timeout` mặc định 30 s nên request treo lâu mới báo lỗi.
*Đào sâu:* [Memory JVM và GC](/go?p=01-Spring-Boot%2Fhard%2Flt-23-jvm-memory-gc.md), [Hiệu năng và Scalability](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-11-hieu-nang-scalability.md).

**Nhớ:** Throughput bằng slot chia thời gian giữ slot; giảm thời gian giữ connection trước khi tăng pool; tính tổng trên mọi pod. Xem [Memory JVM và GC](/go?p=01-Spring-Boot%2Fhard%2Flt-23-jvm-memory-gc.md).

---

## 15. Khi nào dùng Spring Batch thay vì `@Scheduled` hay vòng lặp tự viết?

**Câu hỏi:** Job xử lý 5 triệu bản ghi đã chạy được 3 giờ thì lỗi ở bản ghi thứ 700 000. Vòng lặp tự viết dưới `@Scheduled` phải chạy lại từ đầu. Khi nào nên dùng Spring Batch?

**Gợi ý suy luận:**

- Xử lý hàng triệu bản ghi có chắc chắn lỗi giữa chừng không (mạng, dữ liệu bẩn, deploy)?
- Muốn tiếp tục từ chỗ lỗi thì cần ghi nhớ điều gì, ở đâu?
- Gom nhiều bản ghi vào một transaction duy nhất rủi ro gì?

**Lập luận:** Xử lý hàng triệu bản ghi **chắc chắn sẽ lỗi giữa chừng**, nên câu hỏi thật là "lỗi ở bản ghi thứ 700 000 thì chạy lại từ đầu hay tiếp tục?". Muốn tiếp tục thì phải lưu **điểm đã commit**, và muốn điểm đó chính xác thì xử lý theo batch, mỗi batch một transaction. Spring Batch cung cấp đúng thứ đó, trong khi `@Scheduled` chỉ là bộ hẹn giờ. Điểm dễ nhầm là dùng Spring Batch cho mọi tác vụ định kỳ: với việc nhỏ chạy vài giây thì `@Scheduled` cộng distributed lock đơn giản hơn. Dùng Batch khi cần khả năng chạy lại tiếp tục, chunk, skip/retry và theo dõi tiến độ, đồng thời thiết kế bước xử lý idempotent để lần chạy lại không ghi trùng.

**Đáp án ngắn:** `Job` gồm `Step`, mỗi Step xử lý theo chunk (đọc/xử lý/ghi theo batch, mỗi chunk một transaction). `JobRepository` lưu metadata để restart, có skip/retry, theo dõi tiến độ, partitioning.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng chunk 5, 12 bản ghi, lỗi ở bản ghi 8, rồi chạy lại:

```text
Chay job tu item 1
  commit chunk 1..5
  LOI o item 8 -> rollback chunk dang xu ly (6..10)
Sua loi du lieu, chay lai cung tham so:
Chay job tu item 6
  commit chunk 6..10
  commit chunk 11..12
  Job HOAN TAT
Tong item da ghi: 12, co trung? false
```

Item 1-5 đã commit không bị xử lý lại; chunk 6-10 bị rollback **toàn bộ** (kể cả 6, 7 đã xử lý xong) rồi làm lại, nên 12 bản ghi chỉ được ghi đúng một lần. Với Spring Batch thật, _minh họa, chưa chạy thử_:

```java
@Bean
Step importStep(JobRepository repo, PlatformTransactionManager tx) {
    return new StepBuilder("importStep", repo)
        .<Row, Entity>chunk(1000, tx)           // mỗi 1000 bản ghi một transaction
        .reader(reader()).processor(processor()).writer(writer())
        .faultTolerant().skip(BadRowException.class).skipLimit(100)
        .retry(DeadlockLoserDataAccessException.class).retryLimit(3)
        .build();
}
```

**Hỏi xoáy 1:** Chọn kích thước chunk thế nào?
Vì sao hỏi tiếp: Chunk là đơn vị transaction, nên hỏi: chọn kích thước chunk thế nào?

**Đáp:** Chunk lớn: ít commit hơn (nhanh) nhưng transaction dài, giữ lock lâu, lỗi thì làm lại nhiều. Chunk nhỏ: ngược lại. Thường 100-1000, đo trên dữ liệu thật.

**Hỏi xoáy 2:** Hai instance cùng chạy một job thì sao?
Vì sao hỏi tiếp: Dùng với nhiều instance triển khai thật, nên hỏi: hai instance cùng chạy một job thì sao?

**Đáp:** Spring Batch xác định "một lần chạy" bằng `JobParameters`; cùng tham số mà job đang chạy sẽ báo `JobExecutionAlreadyRunningException`. Nhưng với `@Scheduled` trên nhiều instance, mỗi instance tự khởi chạy, nên vẫn cần distributed lock hoặc chỉ định một instance kích hoạt.

**Sai lầm hay gặp:** nhồi cả triệu bản ghi vào một transaction; đọc bằng `OFFSET` lớn (càng về sau càng chậm, nên đọc theo con trỏ hoặc lock); job không idempotent nên chạy lại nhân đôi dữ liệu.
*Đào sâu:* [Spring Batch](/go?p=01-Spring-Boot%2Fhard%2Flt-28-spring-batch.md).

**Nhớ:** Batch lưu điểm đã commit để chạy tiếp thay vì chạy lại; xử lý theo chunk, mỗi chunk một transaction. Xem [Spring Batch](/go?p=01-Spring-Boot%2Fhard%2Flt-28-spring-batch.md).

---

## 16. WebFlux hay Spring MVC: chọn theo tiêu chí nào?

**Câu hỏi:** Team muốn dùng WebFlux "cho nhanh" cho một dịch vụ CRUD gọi JDBC. Bạn chọn WebFlux hay Spring MVC, và theo tiêu chí nào?

**Gợi ý suy luận:**

- Trong MVC, một thread giữ suốt một request, kể cả lúc chờ I/O: tốn gì (stack ~1 MB)?
- Trong mô hình reactive, ít thread và không bao giờ ngủ: nếu một thread event loop bị block thì điều gì xảy ra với các request khác?
- JDBC có chặn không, và virtual threads (Java 21) thay đổi gì với mã kiểu chặn?

**Lập luận:** MVC giữ **một thread cho cả request**, kể cả lúc chờ I/O, nên số kết nối đồng thời bị giới hạn bởi số thread. Reactive dùng **ít thread không bao giờ ngủ**, nhả thread khi chờ I/O; đổi lại, nếu **một** thread event loop bị block thì mọi request trên thread đó cùng đứng. JDBC là API chặn, nên dùng nó trong WebFlux phá mất lợi thế. Từ Java 21, virtual threads cho phép mã chặn vẫn scale, nên với CRUD gọi JDBC thì MVC đơn giản hơn. Điểm dễ nhầm là chọn WebFlux vì tin nó "nhanh hơn": lợi ích là chịu nhiều kết nối chờ I/O với ít thread, không phải tốc độ mỗi request, và nó có chi phí học và debug cao hơn. Chỉ chọn khi toàn bộ chuỗi (client, driver, thư viện) non-blocking hoặc cần streaming và backpressure; ngược lại MVC với virtual threads thường đủ.

**Đáp án ngắn:** MVC đơn giản, dễ debug, hệ sinh thái JDBC/JPA trưởng thành. WebFlux hợp khi số kết nối đồng thời rất lớn chủ yếu chờ I/O, streaming, hoặc cả chuỗi (client tới DB) đều non-blocking.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng event loop một thread; request 2 gọi JDBC **chặn** 1 giây:

```text
request 1 den luc    0ms, xong luc    7ms (cho    7ms)
request 2 den luc   63ms, xong luc 1063ms (cho 1000ms)  <- goi JDBC CHAN
request 3 den luc  113ms, xong luc 1065ms (cho  952ms)
request 4 den luc  164ms, xong luc 1066ms (cho  902ms)
```

Request 3 và 4 vốn chỉ cần vài mili giây nhưng phải chờ ~900-950 ms, **chỉ vì request 2 chặn event loop**. Trên Netty thật, số thread event loop ≈ số lõi (ví dụ 8), nên 8 request chặn đồng thời là cả server đứng. Đây là lý do "gọi JDBC trong WebFlux" là lỗi nặng.

Đoạn code lỗi, _minh họa, chưa chạy thử_:

```java
@GetMapping("/users/{id}")
Mono<User> get(@PathVariable String id) {
    return Mono.just(jdbcRepo.findById(id));        // SAI: findById CHẶN event loop
}
// Đúng nếu bắt buộc dùng API chặn: cô lập sang scheduler riêng
return Mono.fromCallable(() -> jdbcRepo.findById(id)).subscribeOn(Schedulers.boundedElastic());
// Tốt hơn: R2DBC / client reactive từ đầu
```

**Hỏi xoáy 1:** Khi nào WebFlux thật sự thắng MVC (kể cả có virtual threads)?
Vì sao hỏi tiếp: Với virtual threads, lợi thế của WebFlux hẹp lại, nên hỏi: khi nào WebFlux thật sự thắng MVC?

**Đáp:** Khi cần **backpressure** (nhả/giữ nhịp dữ liệu giữa producer và consumer), streaming hai chiều (SSE, WebSocket với số lượng rất lớn), hoặc kết hợp nhiều nguồn async theo toán tử. Với CRUD gọi DB qua JDBC, MVC cộng virtual threads thường đơn giản và đủ nhanh.

**Hỏi xoáy 2:** Phát hiện "chặn trong event loop" ở đâu?
Vì sao hỏi tiếp: Chặn trong event loop là rủi ro lớn nhất khi chọn WebFlux, nên hỏi: phát hiện nó ở đâu?

**Đáp:** Thư viện BlockHound ném lỗi khi có call chặn trên thread không-chặn; hoặc quan sát metric latency event loop và thread dump thấy thread `reactor-http-nio-*` ở trạng thái `WAITING`/`TIMED_WAITING` trong code JDBC.

**Sai lầm hay gặp:** WebFlux nhưng gọi JDBC/JPA/`Thread.sleep`/`.block()` bên trong; chọn reactive vì "hiện đại" mà không có bài toán I/O đồng thời thật sự.
*Đào sâu:* [WebFlux và Reactor](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md), [Virtual Threads và Structured Concurrency](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md).

**Nhớ:** MVC một thread một request; WebFlux ít thread không được chặn; virtual threads thu hẹp khoảng cách. Xem [WebFlux và Reactor](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md).

---

Nguồn: tổng hợp từ các bài Spring Boot, Database và Java Concurrency trong Learning Docs; các cấu hình mặc định (Hikari, Tomcat, shutdown, virtual threads, `@MockitoBean`) nên kiểm tra lại theo phiên bản Spring Boot bạn dùng. Ví dụ đánh dấu _Đã chạy thử_ là Java thuần mô phỏng cơ chế, chạy trên JDK 11 trong môi trường soạn thảo.

