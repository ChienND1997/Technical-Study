# Câu hỏi: Java hỏi xoáy (bổ sung từ sách phỏng vấn)

Kiến thức gốc: [Java Core](/go?p=08-Java%2FJava-Core%2Findex.md), [Spring Boot](/go?p=01-Spring-Boot%2Findex.md), [Mạng và Bảo mật: HTTP](/go?p=03-Network-Security%2Feasy%2Flt-02-http-chi-tiet.md), [Maven, Gradle](/go?p=04-DevOps%2Fmedium%2Flt-05-maven-gradle-dependency.md).

Bộ này chỉ gồm những câu mà các file Q&A trước chưa có hoặc còn nông. Mỗi câu theo dạng **hỏi xoáy**: người phỏng vấn nghe câu trả lời đầu tiên rồi hỏi tiếp hai lần để xem bạn hiểu cơ chế hay chỉ thuộc lòng. Cách ôn: đọc câu hỏi, che phần còn lại, tự trả lời theo các gợi ý, rồi mới mở **Lập luận** để đối chiếu. Mỗi câu hỏi xoáy được nối với câu trước bằng lý do "vì sao đây là bước hỏi tiếp theo", để bạn đoán trước được người phỏng vấn sẽ đào vào đâu.

Khung mỗi câu: **Câu hỏi** → **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới kiến thức nền) → **Lập luận** (chuỗi nhân quả "vì A nên B") → **Đáp án ngắn** (nói thành tiếng được) → **Nhớ** (kiến thức cốt lõi) → **Ví dụ** (code và output) → **Hỏi xoáy** → **Sai lầm hay gặp**. Quy ước: _Đã chạy thử trên JDK 11_ nghĩa là output là output thật khi chạy trong môi trường soạn (kể cả khi là Java thuần mô phỏng framework); _Minh họa, chưa chạy thử_ nghĩa là đoạn mã cần framework/công cụ không có ở đây (Spring, JUnit, Maven, Mockito).

Nhóm: Logging (1-2), Java tinh vi (3-7), JUnit và mock (8-10), JVM (11-13), HTTP và REST (14-15), Spring (16-19), Maven (20-21), thư viện tiện ích (22).

---

**Tóm tắt:**

- Phạm vi file: những câu Java hỏi xoáy theo tình huống, gom theo nhóm logging, Java tinh vi, JUnit và mock, JVM, HTTP và REST, Spring, Maven.
- Logging: SLF4J là facade còn Logback hay Log4j2 là implementation cắm sau, cần level có chủ đích và trace id trong MDC để lần ra đúng request.
- Java tinh vi: cache `Integer` `-128..127` làm `==` đúng tình cờ, string pool làm `==` trên literal đúng, generic bất biến vì an toàn kiểu, bất biến thật cần sao chép phòng thủ, và `try-with-resources` giữ lỗi gốc.
- Test: JUnit tạo instance mới cho mỗi test, đồ giả gồm stub, mock, spy, fake; tháp test nhiều unit, ít integration, rất ít e2e; Spring cache context và rollback transaction giữ DB sạch.
- JVM: GC chỉ thu object không tới được từ GC root nên vẫn rò rỉ; pod bị OOM-kill dù có `-Xmx` vì heap chỉ là một phần memory của process; không dựa vào `finalize` hay `System.gc()`.
- HTTP: idempotent nghĩa là gọi nhiều lần cho kết quả như một (`PUT` có, `POST` không); status code là contract cho máy đọc; Spring chọn bean theo kiểu rồi `@Primary`, `@Qualifier`, tên.
- Hay bị hỏi xoáy nhất: `127 == 127` đúng mà `128 == 128` sai, `-Xmx1g` mà pod vẫn bị OOM-kill, và Maven chọn phiên bản dependency theo quy tắc nào.

## 1. Ứng dụng của bạn dùng Logback, một thư viện kéo vào lại dùng Log4j2, mà code chỉ gọi `log.info(...)`. Vì sao chạy được, và vì sao không cứ `System.out.println` cho nhanh?

**Gợi ý suy luận:**
- Nếu mỗi thư viện tự chọn một cách ghi log riêng thì ứng dụng có gom, lọc, đổi đích ghi được không? Khái niệm nền: facade (abstract class).
- Một hệ thống log cần những thứ gì ngoài việc in chữ ra màn hình (level, đích ghi, định dạng, ngữ cảnh)?
- `System.out` là một stream dùng chung, nhiều thread cùng ghi thì chuyện gì xảy ra với tốc độ?

**Lập luận:** Vì thư viện bên thứ ba và ứng dụng mỗi bên chọn một công cụ log khác nhau, nếu mỗi bên ghi theo cách riêng thì không thể gom, lọc hay đổi cấu hình tại một chỗ. Nên cần một API chung để mọi bên cùng gọi: đó là SLF4J (facade), còn việc ghi thật được cắm vào sau lúc triển khai (Logback, Log4j2, `java.util.logging`). `println` thiếu mọi thứ một hệ thống log cần: không lọc theo level/package, không xoay file, không kèm thời gian/thread/correlation id, và đồng bộ trên một stream nên chậm khi nhiều thread ghi. Điểm dễ nhầm là thêm dependency logging mà không nhìn tới xung đột binding: nhiều implementation SLF4J trên classpath làm log đi sai chỗ hoặc mất cấu hình. Khi review, mỗi ứng dụng chỉ có một implementation (loại bớt bằng `exclusions`), dùng placeholder `log.info("id={}", id)` thay vì nối chuỗi để tránh tốn công khi level tắt, và đặt cấu hình log ngoài code.

**Đáp án ngắn:** SLF4J là facade, Logback/Log4j2 là implementation cắm sau; Spring Boot mặc định Logback. Không dùng `println` vì không có level, đích ghi, định dạng, ngữ cảnh và chậm do đồng bộ trên một stream.

**Nhớ:** Code gọi facade (SLF4J), chọn implementation lúc triển khai; `println` không phải hệ thống log.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng khác biệt giữa `log.debug("User " + user + " ...")` (nối chuỗi) và `log.debug("User {} ...", user)` khi DEBUG **đang tắt**, gọi 1000 lần:

```text
Noi chuoi (DEBUG tat): toString() bi goi 1000 lan
Tham so {}  (DEBUG tat): toString() bi goi 0 lan
```

Nối chuỗi **luôn** chạy `toString()` (và nối chuỗi) trước khi vào hàm log, dù log bị tắt; tham số `{}` chỉ định dạng khi level được bật. Với object có `toString()` nặng (duyệt collection lớn), chênh lệch là đáng kể. Code Java, _minh họa, chưa chạy thử_:

```java
private static final Logger log = LoggerFactory.getLogger(OrderService.class);
log.debug("Loaded {} items for order {}", items.size(), orderId);   // tham số
// tham số tốn kém thì bọc điều kiện
if (log.isDebugEnabled()) log.debug("Detail: {}", expensiveDump());
// exception là tham số CUỐI, in cả stack trace
log.error("Cannot charge order {}", orderId, ex);
```

**Hỏi xoáy 1:** Gọi `log.debug("User " + user + " logged in")` khác gì `log.debug("User {} logged in", user)`?
_Vì sao hỏi tiếp:_ vừa nói SLF4J lọc theo level, người phỏng vấn muốn biết bạn có hiểu việc lọc xảy ra TRƯỚC hay SAU khi chuỗi được dựng.

**Đáp:** Xem output trên: cách đầu luôn tốn chi phí nối chuỗi. Với SLF4J 2 có thể dùng `log.atDebug().addArgument(() -> tinh()).log(...)` để chỉ tính khi bật.

**Hỏi xoáy 2:** Hai thư viện kéo vào hai implementation khác nhau thì sao?
_Vì sao hỏi tiếp:_ facade cho phép cắm implementation, vậy nếu classpath có nhiều cái cùng lúc thì facade chọn cái nào? Đây là mặt trái của thiết kế cắm rời.

**Đáp:** Classpath có nhiều SLF4J binding thì SLF4J cảnh báo "multiple bindings" và chọn một cái, dễ mất log. Chỉ giữ **một** implementation; loại cái còn lại bằng exclusion hoặc chuyển qua bridge (`jul-to-slf4j`, `log4j-over-slf4j`).

**Sai lầm hay gặp:** Tự viết logger (sách cũng cảnh báo); log exception hai lần (log rồi ném tiếp, tầng trên lại log); `catch` chỉ `e.printStackTrace()`.

## 2. Khách báo lỗi lúc 3 giờ sáng, log production có hàng nghìn request đan xen nhau. Phải log thế nào để lần ra đúng request lỗi mà không làm hệ thống chậm hay lộ dữ liệu?

**Gợi ý suy luận:**
- Ở production bạn có ngồi trước màn hình để debug không? Vậy log đóng vai gì? Khái niệm nền: log là bằng chứng duy nhất.
- Nhiều thread ghi xen kẽ, làm sao biết dòng nào thuộc request nào? Khái niệm nền: correlation id, MDC.
- Log gì thì có hại (mật khẩu, token, payload lớn)? Khái niệm nền: level và dữ liệu nhạy cảm.

**Lập luận:** Vì không ngồi trước màn hình, log là cách duy nhất dựng lại chuyện đã xảy ra, nên mỗi dòng phải có ngữ cảnh. Vì hàng chục thread và nhiều service đan xen, muốn lần theo một request thì mỗi dòng log phải mang định danh request (trace id đặt trong MDC). Vì log cũng tốn I/O và có thể chứa dữ liệu nhạy cảm, phải chọn level có chủ đích và không ghi thông tin bí mật. Điểm dễ nhầm là log nhiều cho an toàn: log quá nhiều chìm thông tin, tốn I/O và có thể làm lộ dữ liệu cá nhân. Hãy log ở ranh giới (vào, ra, lỗi, event nghiệp vụ quan trọng), gắn trace id vào MDC ở filter đầu vào, che dữ liệu nhạy cảm, và log exception một lần ở nơi xử lý cuối cùng thay vì mỗi tầng một lần.

**Đáp án ngắn:** Chọn level có chủ đích (ERROR cần người xử lý, WARN bất thường tự phục hồi, INFO event nghiệp vụ chính, DEBUG/TRACE chẩn đoán, tắt mặc định). Log JSON có cấu trúc kèm correlation/trace id (MDC), không log mật khẩu, token, số thẻ, dữ liệu cá nhân.

**Nhớ:** Log phải truy vết được (trace id), đúng level, và không chứa dữ liệu nhạy cảm.

**Ví dụ:** _Đã chạy thử trên JDK 11._ MDC hoạt động trên `ThreadLocal`, nên khi việc sang thread khác (thread pool, `@Async`) thì giá trị **không tự theo**, và thread tái sử dụng có thể **rò** giá trị của request trước:

```text
[main]                       traceId = trace-abc123
[pool-1-thread-1] khong wrap     traceId = null
[pool-1-thread-1] co wrap        traceId = trace-abc123
request B (cung luong tai su dung) thay traceId = trace-REQUEST-A  <- RO RI
```

Dòng 2: log của việc async mất trace id. Dòng 4: request B bị gắn nhầm id của request A (**dữ liệu sai nguy hiểm hơn là không có**). Cách xử lý, _minh họa, chưa chạy thử_:

```java
// Bọc task: sao chép MDC vào luồng chạy, dọn sau khi xong
static Runnable withMdc(Runnable r) {
    Map<String,String> ctx = MDC.getCopyOfContextMap();
    return () -> {
        Map<String,String> old = MDC.getCopyOfContextMap();
        if (ctx != null) MDC.setContextMap(ctx);
        try { r.run(); } finally { if (old != null) MDC.setContextMap(old); else MDC.clear(); }
    };
}
```

```xml
<!-- logback: mẫu có traceId; dùng AsyncAppender cho đường nóng -->
<pattern>%d %-5level [%thread] [%X{traceId}] %logger{36} - %msg%n</pattern>
```

**Hỏi xoáy 1:** MDC là gì và bẫy của nó?
_Vì sao hỏi tiếp:_ bạn vừa nói "gắn trace id vào mỗi dòng", nên câu tự nhiên là cơ chế gắn đó chạy thế nào, và nó hỏng ở đâu khi việc chuyển sang thread khác.

**Đáp:** `MDC.put(key, value)` gắn giá trị vào `ThreadLocal` để mọi dòng log của thread tự mang theo. Bẫy: xem output trên (mất khi chuyển thread, rò khi không dọn). Xem [ThreadLocal](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md).

**Hỏi xoáy 2:** Log nhiều làm ứng dụng chậm, xử lý thế nào?
_Vì sao hỏi tiếp:_ log đầy đủ ngữ cảnh thì tốn I/O, nên phải hỏi cái giá phải trả và cách giảm nó mà không mất khả năng truy vết.

**Đáp:** Dùng appender **async** (AsyncAppender / Log4j2 async logger), giảm level ở đường nóng, tránh log trong vòng lặp lớn, giới hạn xoay file. Đo trước khi tối ưu.

**Sai lầm hay gặp:** Bật DEBUG ở production "cho chắc" rồi đầy đĩa; log toàn bộ payload (lộ dữ liệu); quên rằng log là dữ liệu nhạy cảm cần authorization. Xem [JDBC, Pool, Logging](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-28-jdbc-connection-pool-logging.md).

---

## 3. Test `Integer a = 127, b = 127; a == b` ra `true`, nhưng đổi thành 128 thì ra `false`. Chuyện gì đang xảy ra, và autoboxing còn giấu những bẫy nào khác?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- `Integer` là kiểu giá trị hay object? Toán tử `==` trên object so sánh cái gì? Khái niệm nền: so sánh tham chiếu và `equals`.
- Dòng `Integer a = 127` thực chất gọi hàm gì? Vì sao JVM muốn dùng lại object cho giá trị nhỏ? Khái niệm nền: autoboxing, Flyweight/cache.
- Nếu `Integer` null mà bị ép về `int` thì sao? Khái niệm nền: unboxing.

**Lập luận:** Vì `Integer` là object và `==` so sánh địa chỉ, hai biến chỉ "bằng" khi trỏ cùng một object. Autoboxing gọi `Integer.valueOf`, mà để tiết kiệm memory nó trả lại cùng một object cho các giá trị nhỏ thường dùng (cache `-128..127`, Flyweight). Nên 127 trúng do tình cờ cùng địa chỉ, còn 128 tạo hai object khác nhau. Vậy so sánh giá trị phải dùng `equals`. Chiều ngược lại, unboxing một `Integer` null gọi `intValue()` trên null nên ném NPE. Điểm dễ nhầm là nghĩ 127 và 128 là chuyện "nhớ số": điều cần nhớ là `==` trên object so địa chỉ, và cache chỉ là tối ưu không được đảm bảo. Vì vậy khi review, mọi phép so sánh object bọc ngoài (`Integer`, `Long`) dùng `equals` hoặc unbox có chủ ý, và cẩn thận phép gán từ `Map.get` vào kiểu nguyên thủy có thể ném NPE.

**Đáp án ngắn:** Autoboxing gọi `Integer.valueOf` với cache `-128..127`, `==` so địa chỉ nên chỉ đúng tình cờ ở giá trị nhỏ; so sánh giá trị dùng `equals`. Unboxing `Integer` null ném NPE.

**Nhớ:** `==` trên wrapper là so địa chỉ; boxing có cache nhỏ, có NPE và có chi phí.

**Ví dụ:** _Đã chạy thử trên JDK 11._

```text
127 == 127 : true   128 == 128 : false   128 equals 128 : true
flag=true -> 1
flag=false -> NullPointerException
list.remove(1) xoa PHAN TU o vi tri 1 -> [10, 30, 1]
list.remove(Integer.valueOf(1)) xoa GIA TRI 1 -> [10, 30]
Tong 20 trieu so: Long (boxing) = 199999990000000 mat 264ms; long = 199999990000000 mat 26ms
```

Ba điều từ output. (1) `128 == 128` là `false`: hai object khác nhau. (2) Toán tử ba ngôi `Integer r = flag ? 1 : nullInt;` có kiểu **`int`** (vì một nhánh là `int`), nên nhánh `Integer` bị **unbox khi được chọn**: `flag=true` an toàn, `flag=false` mới NPE. Nghĩa là lỗi **chỉ nổ ở một nhánh**, dễ lọt qua test. (3) `list.remove(1)` trên `List<Integer>` chọn overload `remove(int index)`, không phải xóa giá trị 1; và boxing trong vòng lặp lớn chậm hơn ~10 lần (264 ms so với 26 ms) vì tạo hàng triệu object.

**Hỏi xoáy 1:** Truy cập kiểu nguyên thủy có ném `NullPointerException` được không?
_Vì sao hỏi tiếp:_ bạn vừa nói NPE đến từ unboxing, nên người phỏng vấn kiểm tra bạn có phân biệt đúng chỗ phát sinh lỗi (kiểu bọc, không phải `int`).

**Đáp:** Bản thân `int` không, nhưng **unboxing** từ `Integer` null thì có: `Integer x = null; int y = x;`. Xem ví dụ toán tử ba ngôi ở trên.

**Hỏi xoáy 2:** Biên trên của cache đổi được không?
_Vì sao hỏi tiếp:_ đã biết cache là nguồn gốc của hiện tượng, câu tiếp theo là cache có tùy chỉnh được không, và có nên dựa vào nó không.

**Đáp:** Đổi được bằng `-XX:AutoBoxCacheMax` (chỉ ảnh hưởng `Integer`). Nhưng đừng dựa vào nó: code đúng phải dùng `equals`. `List<Integer>` luôn có chi phí boxing; hot path dùng mảng nguyên thủy hoặc thư viện chuyên dụng.

**Sai lầm hay gặp:** Dùng `==` giữa `Long`/`Integer`; nhầm `remove(int)` và `remove(Object)`.

## 4. `"hello" == "hello"` là `true` nhưng `new String("hello") == "hello"` là `false`, còn `("hel" + "lo") == "hello"` lại `true`. JVM đang giữ chuỗi trong memory như thế nào để ra kết quả đó?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Một chuỗi literal xuất hiện hàng triệu lần trong chương trình, JVM nên giữ một bản hay nhiều bản? Khái niệm nền: string pool.
- Nếu nhiều chỗ dùng chung một object chuỗi, điều kiện nào để việc dùng chung an toàn? Khái niệm nền: bất biến.
- `new` có bao giờ trả lại object có sẵn không? Còn phép `+` giữa hai hằng số được tính lúc nào? Khái niệm nền: hằng số lúc biên dịch.

**Lập luận:** Vì literal lặp lại rất nhiều, JVM giữ một bản duy nhất trong string pool và mọi chỗ dùng chung. Dùng chung chỉ an toàn nếu không ai sửa được, nên `String` bất biến. `new String("a")` luôn cấp phát object mới trên heap, nên khác địa chỉ với literal. `"hel" + "lo"` là hằng số lúc biên dịch nên compiler gộp thành `"hello"` trong pool; còn nối với biến phải tính lúc chạy và tạo object mới. Điểm dễ nhầm là dùng `==` để so chuỗi vì "thấy chạy đúng" với literal; kết quả đổi khi chuỗi đến từ input, nối lúc chạy hay `new`. Luôn dùng `equals` (hoặc `Objects.equals` khi có thể `null`), và chỉ gọi `intern()` khi hiểu rõ chi phí. Hằng số `final` biết lúc biên dịch mới được gộp, biến không `final` thì không.

**Đáp án ngắn:** Literal nạp vào constant pool và dùng chung; `new String("a")` luôn tạo object mới trên heap. Nối bằng hằng số được compiler gộp sẵn, nối lúc chạy tạo object mới.

**Nhớ:** Pool dùng chung được vì `String` bất biến; so sánh nội dung bằng `equals`.

**Ví dụ:** _Đã chạy thử trên JDK 11._

```text
s1 == s2             : true
s1 == s3             : false
s1 == s3.intern()    : true
(part + "lo") == s1  : false
("hel" + "lo") == s1 : true
t.trim() khong gan lai -> t van la [  abc  ]
Noi 20000 so: += mat 377ms, StringBuilder mat 1ms
```

`("hel" + "lo") == s1` là `true` vì cả hai vế là **hằng số lúc biên dịch** nên được gộp thành `"hello"` trong pool; còn `part + "lo"` dùng biến nên phải nối lúc chạy và tạo object mới. `trim()` không đổi chuỗi gốc (trả chuỗi mới). Và `+=` trong vòng lặp tạo 20 000 chuỗi trung gian: chậm hơn `StringBuilder` hàng trăm lần.

**Hỏi xoáy 1:** `intern()` dùng khi nào và có rủi ro gì?
_Vì sao hỏi tiếp:_ pool là chỗ giữ chuỗi dùng chung, nên câu kế là có thể chủ động đưa chuỗi vào pool không và cái giá là gì.

**Đáp:** Khi đọc lượng lớn dữ liệu có nhiều giá trị lặp (tên đối tác, mã sản phẩm), intern giúp giữ một bản. Sách nói pool nằm ở PermGen, nhưng **từ Java 7 pool nằm ở heap** và Java 8 bỏ PermGen (thay bằng Metaspace). Rủi ro: tra cứu pool tốn thời gian, nhồi hàng triệu chuỗi làm tăng áp lực GC; thường thua dedup của G1 (`-XX:+UseStringDeduplication`) hoặc `Map` tự quản.

**Hỏi xoáy 2:** Từ Java 9, `String` lưu thế nào?
_Vì sao hỏi tiếp:_ sau chuyện dùng chung để tiết kiệm memory, bước tiếp theo là tiết kiệm ngay trong từng object chuỗi.

**Đáp:** Compact strings: lưu bằng `byte[]` (Latin-1 khi có thể) thay vì `char[]`, tiết kiệm memory.

**Sai lầm hay gặp:** So sánh chuỗi bằng `==`; vứt giá trị trả về của `trim()/replace()`. Xem [Kiểu dữ liệu và String](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-02-kieu-du-lieu-string.md).

## 5. Bạn viết class `final`, mọi field `private`, không có setter, nhưng code bên ngoài vẫn làm đổi được nội dung object. Vì sao, và field còn phải `final` để làm gì?

**Gợi ý suy luận:**
- Bất biến nghĩa là gì: ai đổi được trạng thái sau khi tạo, kể cả gián tiếp? Khái niệm nền: immutability.
- `final` trên một field cấm gán lại biến hay cấm đổi object mà biến trỏ tới? Khái niệm nền: `final` và tham chiếu.
- Nếu getter trả thẳng danh sách nội bộ thì bên ngoài làm được gì? Khái niệm nền: sao chép phòng thủ.

**Lập luận:** Vì bất biến nghĩa là không ai đổi được trạng thái sau khi tạo, kể cả gián tiếp, mà `final` trên field chỉ cấm gán lại biến chứ không cấm sửa object nó trỏ tới, nên field kiểu `List` vẫn `add` được. Nếu object nội bộ mutable lại lộ ra ngoài (qua getter hoặc constructor giữ tham chiếu của caller) thì bất biến chỉ là ảo giác. Nên phải sao chép phòng thủ và dùng bản bất biến thật. Còn `final` field có thêm tác dụng với Java Memory Model: thread khác thấy giá trị đã khởi tạo xong dù publication không an toàn. Điểm dễ nhầm là nghĩ `final` class và `private` field là đủ cho bất biến; lỗi hay gặp là lưu trực tiếp `List`/`Date` do caller truyền vào hoặc trả thẳng ra qua getter. Khi review, nhìn từng field: nó là kiểu bất biến thật không, nếu không thì có sao chép phòng thủ ở cả constructor và getter không, và có `final` để có bảo đảm của JMM không.

**Đáp án ngắn:** Cần class không kế thừa được, field `private final`, không method nào đổi trạng thái, không để lộ tham chiếu tới thành phần mutable (sao chép phòng thủ). `final` còn cho JMM bảo đảm khả năng hiển thị sau khi khởi tạo.

**Nhớ:** `final` lock biến, không lock object; bất biến thật cần sao chép phòng thủ.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Ba cách giữ danh sách, rồi code bên ngoài sửa danh sách gốc:

```text
Bad  (giu tham chieu):        [101, 102, 999]
View (unmodifiableList):      [101, 102, 999]   <- view doi theo danh sach goc
Good (List.copyOf):           [101, 102]
Bad  bi chen tu getter:       [101, 102, 999, HACK]
Good getter.add -> UnsupportedOperationException
final List van add duoc: [van them duoc]
List.of("a", null) -> NullPointerException
```

`Collections.unmodifiableList` chỉ là **cửa sổ chỉ-đọc** lên danh sách gốc (gốc đổi thì cửa sổ đổi), còn `List.copyOf` là **bản sao bất biến thật**. `final List` vẫn `add` được. Mã đúng:

```java
public final class Booking {
    private final String guest;
    private final List<String> rooms;
    public Booking(String guest, List<String> rooms) {
        this.guest = guest;
        this.rooms = List.copyOf(rooms);      // sao chép phòng thủ + bất biến thật
    }
    public List<String> rooms() { return rooms; }
}
```

**Hỏi xoáy 1:** `final List<String> list` có làm danh sách bất biến không?
_Vì sao hỏi tiếp:_ nếu bạn nói `final` chỉ cố định biến, người phỏng vấn kiểm tra ngay bằng ví dụ quen thuộc nhất.

**Đáp:** Không (xem output: `final List van add duoc`). Muốn bất biến dùng `List.of`/`List.copyOf`.

**Hỏi xoáy 2:** `record` có tự bất biến không?
_Vì sao hỏi tiếp:_ Java hiện đại có công cụ để bớt boilerplate bất biến, nên hỏi xem công cụ đó có che được cái bẫy tham chiếu mutable không.

**Đáp:** `record` làm field `final` và bỏ boilerplate, nhưng component là `List` hay `Date` mutable thì record vẫn hở. Cần `List.copyOf` trong compact constructor.

**Sai lầm hay gặp:** Trả thẳng mảng/`Date`/`List` nội bộ qua getter; tưởng `final` là bất biến. Liên hệ [safe publication](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md).

## 6. `Dog extends Animal` nhưng `List<Dog> dogs; List<Animal> animals = dogs;` không biên dịch được, trong khi mảng `Dog[]` gán cho `Animal[]` lại được. Vì sao, và làm sao viết hàm nhận "list của mọi loại thú"?

**Gợi ý suy luận:**
- Nếu gán được thì qua biến `List<Animal>` bạn gọi `add(new Cat())` được không? Danh sách thật chứa gì? Khái niệm nền: an toàn kiểu, bất biến (invariance) của generics.
- Mảng cho phép gán kiểu con thì lỗi tương tự nổ lúc nào? Khái niệm nền: covariant của mảng, `ArrayStoreException`.
- Muốn chỉ đọc hoặc chỉ ghi qua một tham chiếu "mơ hồ" thì cần cú pháp gì? Khái niệm nền: wildcard, PECS.

**Lập luận:** Vì nếu `List<Dog>` gán được cho `List<Animal>`, qua biến mới bạn thêm được `Cat` vào danh sách vốn chỉ chứa `Dog`, phá an toàn kiểu. Nên generics phải bất biến và compiler chặn từ đầu. Mảng cho phép covariant nên lỗi chỉ nổ lúc chạy. Để vẫn viết được hàm dùng chung, wildcard cho phép có kiểm soát: `? extends A` chỉ đọc ra `A` (không biết danh sách thật là kiểu nào nên không thêm được), `? super B` thêm được `B` nhưng đọc ra chỉ là `Object`. Điểm dễ nhầm là nghĩ mảng "tiện hơn" vì gán được kiểu cha: nó chỉ dời lỗi từ biên dịch sang lúc chạy (`ArrayStoreException`). Khi thiết kế hàm tổng quát, áp dụng PECS: tham số chỉ đọc thì `? extends`, chỉ ghi vào thì `? super`; và đừng dùng wildcard ở kiểu trả về vì nó đẩy bất tiện sang người gọi.

**Đáp án ngắn:** Generics của Java bất biến. `List<? extends A>`: đọc ra `A`, không thêm được (producer). `List<? super B>`: thêm `B`, đọc ra chỉ `Object` (consumer). PECS: Producer Extends, Consumer Super.

**Nhớ:** Generics bất biến để an toàn kiểu; wildcard là cách đọc hoặc ghi có kiểm soát (PECS).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Compiler từ chối cả hai chỗ nguy hiểm:

```text
Bad.java:3: error: incompatible types: List<B> cannot be converted to List<A>
    ... List<B> bs = new ArrayList<>(); List<A> as = bs; } }

Bad2.java:3: error: incompatible types: B cannot be converted to CAP#1
    ... List<? extends A> p = new ArrayList<B>(); p.add(new B()); } }
  where CAP#1 is a fresh type-variable:
    CAP#1 extends A from capture of ? extends A
```

Với `List<? extends A>`, trình biên dịch không biết danh sách thật là `List<B>` hay `List<C>` nên không cho thêm gì (trừ `null`). Phần chạy:

```text
Mang covariant: Dog[] gan vao Animal[] roi them Cat -> ArrayStoreException (loi luc CHAY): Cat
Type erasure: List<String>.getClass() == List<Integer>.getClass() ? true
Heap pollution: nap 42 vao List<String> qua raw type, doc ra -> ClassCastException tai cho DOC, khong phai cho nap
? extends: doc ra Number duoc: 1
? super: them Integer duoc, doc ra chi la Object: 7
```

**Hỏi xoáy 1:** "Reified" nghĩa là gì và vì sao Java không có?
_Vì sao hỏi tiếp:_ output cho thấy `List<String>` và `List<Integer>` cùng một class lúc chạy, nên người phỏng vấn hỏi tại sao thông tin kiểu biến mất và hệ quả là gì.

**Đáp:** Reified là thông tin kiểu còn tồn tại **lúc chạy**. Java xóa kiểu generic sau khi biên dịch (**type erasure**) để tương thích với code trước Java 5: output trên cho thấy `List<String>` và `List<Integer>` cùng một class. Hệ quả: không `new T()`, không `new T[10]`, không `x instanceof List<String>`, không overload `f(List<String>)`/`f(List<Integer>)`. Giữ kiểu bằng cách truyền `Class<T>` hoặc "super type token" (Jackson `TypeReference`, Spring `ParameterizedTypeReference`).

**Hỏi xoáy 2:** Heap pollution là gì?
_Vì sao hỏi tiếp:_ kiểu bị xóa lúc chạy nghĩa là compiler là hàng rào duy nhất; vượt hàng rào đó (raw type) thì lỗi xuất hiện ở đâu.

**Đáp:** Biến generic trỏ tới object sai kiểu khai báo (qua raw type hoặc cast không kiểm tra), nên `ClassCastException` nổ ở chỗ **xa nguồn gốc** (xem dòng "Heap pollution": lỗi nổ lúc đọc, không phải lúc nạp 42). Tránh raw type, xử lý cảnh báo unchecked.

**Sai lầm hay gặp:** Viết `List<Object>` mong nhận mọi list; quên PECS khi viết API thư viện. Xem [Generics](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-07-generics.md).

## 7. Production báo lỗi nhưng stack trace chỉ có một lỗi lạ của khâu dọn dẹp, không thấy nguyên nhân thật. Mã `finally` và `close()` có thể làm mất lỗi gốc bằng những cách nào, và cách ném lại exception nào giữ được nó?

**Gợi ý suy luận:**
- Khi xử lý lỗi, thông tin quý nhất là gì? Khái niệm nền: nguyên nhân gốc, `cause` (exception chaining).
- Nếu `finally` hoặc `close()` cũng ném lỗi trong lúc lỗi đầu đang bay, JVM giữ lỗi nào? Khái niệm nền: suppressed exception, try-with-resources.
- Một `return` trong `finally` đi cùng exception đang bay thì exception đó ra sao? Khái niệm nền: thứ tự thực thi của `finally`.

**Lập luận:** Vì thứ quý nhất khi có lỗi là nguyên nhân gốc, mọi bẫy đều là mã dọn dẹp vô tình che mất nó. Ném exception mới mà không truyền exception cũ làm `cause` thì mất chuỗi nguyên nhân. Với `try/finally` tay, lỗi trong `finally` thay thế lỗi gốc, còn `return` trong `finally` nuốt luôn exception. `try-with-resources` giải quyết bằng cách tự gọi `close()` theo thứ tự ngược khai báo và gắn lỗi của `close()` vào lỗi chính dưới dạng suppressed, nên lỗi gốc không bị đè. Điểm dễ nhầm là dùng `catch (Exception e) { throw new RuntimeException(e.getMessage()); }`, làm mất loại và stack trace gốc. Quy tắc khi review: luôn truyền exception gốc làm `cause`, không nuốt (`catch` rỗng), không `return` trong `finally`, và dùng `try-with-resources` cho mọi tài nguyên để lỗi của `close()` không che lỗi chính.

**Đáp án ngắn:** Ném exception mới thì truyền exception gốc làm `cause`. `try-with-resources` tự gọi `close()` theo thứ tự ngược với khai báo; lỗi của `close()` được gắn vào dưới dạng suppressed, không đè lỗi gốc. Không `return` trong `finally`.

**Nhớ:** Giữ nguyên nhân gốc: truyền `cause`, dùng try-with-resources, không `return` trong `finally`.

**Ví dụ:** _Đã chạy thử trên JDK 11._

```text
try-with-resources, than try nem loi va ca hai close() cung nem loi:
  mo A
  mo B
  than try
  dong B
  dong A
  ngoai le nhan duoc: loi trong than try
  suppressed: close B loi
  suppressed: close A loi
try/finally thu cong: finally nem loi DE MAT loi goc:
  ngoai le nhan duoc: loi tu finally (loi goc da mat)
return trong finally: finallyReturn() = 1 (exception 'boom' bi nuot)
Chain: Khoi dong that bai <- Caused by: IOException: khong doc duoc cau hinh
```

Quan sát: `B` mở sau nên đóng trước. Lỗi gốc được giữ, hai lỗi `close` thành suppressed. Với `try/finally` tay thì lỗi của `finally` **đè mất** lỗi gốc, và `return` trong `finally` **nuốt** cả exception (hàm trả `1`, không ai biết có `boom`). Dòng cuối cho thấy `cause` được giữ, nhờ đó stack trace có `Caused by:`.

**Hỏi xoáy 1:** Nếu thân `try` ném exception và `close()` cũng ném thì sao?
_Vì sao hỏi tiếp:_ bạn vừa nói try-with-resources bảo vệ lỗi gốc, nên người phỏng vấn thử đúng tình huống hai lỗi cùng lúc.

**Đáp:** Exception của thân `try` được ném ra, exception từ `close()` thành suppressed (`e.getSuppressed()`). Xem output.

**Hỏi xoáy 2:** `return` trong `finally` làm gì? Checked hay unchecked?
_Vì sao hỏi tiếp:_ sau bẫy "finally che lỗi", câu kế là bẫy cực đoan nhất (nuốt hẳn exception) và cách chọn loại exception khi tự ném.

**Đáp:** Nó nuốt exception đang bay và ghi đè giá trị `return` (xem output). Không `return/break/continue` trong `finally`. Checked hay unchecked: sách nghiêng về unchecked (Spring bọc `SQLException` thành `DataAccessException`); quan trọng là tài liệu hóa và không bắt `Exception` chung chung.

**Sai lầm hay gặp:** `catch (Exception e) {}` rỗng; ném exception mới **không** truyền cause; log rồi ném lại gây log trùng. Xem [Exception](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-04-exception.md).

---

## 8. Test B chỉ qua khi test A chạy trước, đổi thứ tự là đỏ. Vì sao JUnit được thiết kế để điều này không nên xảy ra, và lifecycle một test diễn ra thế nào?

**Gợi ý suy luận:**
- Nếu các test dùng chung trạng thái thì thứ tự chạy ảnh hưởng gì đến kết quả? Khái niệm nền: test độc lập.
- Một field instance của class test sống bao lâu nếu mỗi method test có một instance riêng? Khái niệm nền: instance mới cho mỗi test.
- Thứ gì vẫn chia sẻ được giữa các test dù instance mới (static, DB, file)? Khái niệm nền: trạng thái dùng chung ngoài instance.

**Lập luận:** Vì chia sẻ trạng thái làm thứ tự chạy ảnh hưởng kết quả và một test hỏng kéo theo test khác, JUnit chặn bằng cách tạo instance mới của class test cho mỗi method test, nên field instance không rò giữa các test. Còn việc chuẩn bị tốn kém dùng một lần được tách riêng (`@BeforeClass`/`@BeforeAll`, static). Nhưng static, DB, file vẫn dùng chung được, nên test vẫn có thể phụ thuộc thứ tự nếu bạn tự tạo ra liên kết đó. Điểm dễ nhầm là nghĩ field `static` hay DB dùng chung là "chia sẻ an toàn" giữa các test: chúng sống qua nhiều test nên chính là chỗ gây phụ thuộc thứ tự. Mỗi test nên tự dựng và dọn dữ liệu của mình (hoặc rollback), tránh `static` mutable, và chạy thử với thứ tự ngẫu nhiên để lộ phụ thuộc ngầm sớm.

**Đáp án ngắn:** JUnit 4: `@BeforeClass` (static, một lần), mỗi test tạo instance mới rồi `@Before` → `@Test` → `@After`, cuối cùng `@AfterClass`. JUnit 5: `@BeforeAll`, `@BeforeEach`, `@AfterEach`, `@AfterAll`, `@ExtendWith` thay `@RunWith`.

**Nhớ:** Mỗi test một instance mới; test phải độc lập, không dựa vào thứ tự chạy.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng runner của JUnit bằng reflection (tạo instance mới cho mỗi `@Test`):

```text
@BeforeClass (1 lan)
testA: TAO INSTANCE MOI
  @Before
  testA: instanceCount=1 staticCount=1 instance#763
  @After
testB: TAO INSTANCE MOI
  @Before
  testB: instanceCount=1 staticCount=2 instance#857
  @After
@AfterClass (1 lan)
```

`instanceCount` luôn là 1 (instance mới, không rò giữa test) còn `staticCount` tăng (chia sẻ qua `static`). Đây là nguồn của test phụ thuộc thứ tự. JUnit thật, _minh họa, chưa chạy thử_:

```java
@Test
void rejectEarly() {
    var ex = assertThrows(IllegalArgumentException.class, () -> Account.open(-1));
    assertEquals("Số dư ban đầu không được âm", ex.getMessage());
}

@ParameterizedTest
@CsvSource({"1,10,11", "0,0,0", "10,-5,5", "-1,1,0"})
void add(int a, int b, int expected) { assertEquals(expected, a + b); }
```

**Hỏi xoáy 1:** Thứ tự chạy các test có đáng tin không?
_Vì sao hỏi tiếp:_ output cho thấy `staticCount` vẫn tăng, nên câu kế là hệ quả: có được dựa vào thứ tự đó không.

**Đáp:** Không. Test phải độc lập. Dấu hiệu xấu: test B chỉ qua khi A chạy trước (chia sẻ qua `static`, DB, file).

**Hỏi xoáy 2:** Kiểm tra exception và timeout thế nào cho đúng?
_Vì sao hỏi tiếp:_ khi test đã độc lập, bước tiếp theo là viết assertion đủ chặt cho trường hợp lỗi, nơi test rất dễ qua nhầm.

**Đáp:** `@Test(expected = Exception.class)` quá rộng: bất kỳ dòng nào ném exception cũng làm test qua, kể cả lỗi môi trường. Dùng `assertThrows` bọc đúng một lệnh và kiểm tra message. `@Timeout` bắt vòng lặp vô hạn/deadlock; không dùng để đo hiệu năng (xem [JMH](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-19-jit-benchmark.md)).

**Sai lầm hay gặp:** Test không có assertion; test phụ thuộc đồng hồ/ngẫu nhiên nên flaky; `Thread.sleep` để chờ thay vì đồng bộ hóa có chủ đích.

## 9. Class `Game` gọi `HighScoreService` đi tới DB thật. Muốn test riêng `Game` mà không đụng DB thì thay phần phụ thuộc bằng gì, và các loại "đồ giả" (stub, mock, spy, fake) khác nhau ở đâu?

**Gợi ý suy luận:**
- Để test một class riêng lẻ, phụ thuộc của nó phải làm gì? Làm sao thay được? Khái niệm nền: dependency injection qua constructor.
- Cái bạn muốn khẳng định là kết quả trả ra hay việc class đó đã gọi ai, mấy lần? Khái niệm nền: kiểm tra state và kiểm tra behavior.
- Muốn dùng một object thật nhưng vẫn ghi lại call thì cần loại đồ giả nào?

**Lập luận:** Vì test một class thì phải thay thứ nó phụ thuộc (DB, mạng) bằng đồ giả, và muốn thay được thì phụ thuộc phải đưa vào qua constructor. Các loại đồ giả khác nhau ở thứ bạn muốn kiểm tra: chỉ cần dữ liệu đầu vào thì dùng stub; cần khẳng định tương tác (gọi mấy lần, tham số gì) thì dùng mock; muốn giữ hành vi thật nhưng vẫn quan sát thì dùng spy; cần cài đặt nhẹ nhưng đúng logic thì dùng fake. Điểm dễ nhầm là mock mọi thứ kể cả class bất biến đơn giản hoặc tự mock thứ bạn không sở hữu rồi đoán hành vi sai. Chỉ thay phần phụ thuộc chậm hoặc không xác định (DB, mạng, thời gian), ưu tiên fake cho phần có logic, dùng mock khi cần kiểm tra tương tác, và tránh verify quá chi tiết làm test gãy mỗi lần refactor.

**Đáp án ngắn:** Stub trả giá trị dựng sẵn; mock vừa trả vừa cho `verify` tương tác; spy bọc object thật và ghi lại call; fake là cài đặt nhẹ có hành vi thật. Phụ thuộc đưa vào qua constructor để thay được.

**Nhớ:** Chọn loại đồ giả theo thứ cần kiểm tra: dữ liệu (stub), tương tác (mock), object thật có ghi nhận (spy), logic nhẹ (fake).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Tự viết bốn loại (không cần Mockito) để thấy bản chất:

```text
STUB (chi tra du lieu dung san):
1. An
2. Binh
3. Chi
MOCK (kiem tra tuong tac): topPlayers duoc goi 1 lan voi n=3
SPY (boc object that, ghi lai loi goi):
    (goi DB that)
    spy.log = [topPlayers(2)]
FAKE (cai dat nhe co hanh vi that): top2 = [Binh, Chi]
```

Stub chỉ trả dữ liệu; mock **ghi nhận** số lần và tham số gọi để bạn khẳng định; spy chạy cả code thật (dòng "goi DB that") nên có thể gây tác dụng phụ; fake tự sắp xếp điểm nên cho kết quả đúng với dữ liệu bạn nạp. Với Mockito, _minh họa, chưa chạy thử_:

```java
HighScoreService service = mock(HighScoreService.class);
when(service.topPlayers(3)).thenReturn(List.of("An", "Bình", "Chi"));
String result = new Game(service).showScores(3);
assertEquals("1. An\n2. Bình\n3. Chi\n", result);
verify(service).topPlayers(3);
```

**Hỏi xoáy 1:** Khi nào không nên mock?
_Vì sao hỏi tiếp:_ sau khi biết mock thay được mọi thứ, người phỏng vấn kiểm tra bạn có biết giới hạn và cái giá khi lạm dụng.

**Đáp:** Không mock kiểu giá trị (record, `String`, `List`), kiểu bạn không sở hữu mà hành vi phức tạp (thư viện đổi là test vỡ), và tầng dữ liệu nếu điều cần kiểm là câu SQL. Mock quá nhiều làm test dính vào cách cài đặt: refactor đúng mà test vẫn đỏ.

**Hỏi xoáy 2:** Kiểm tra state hay interaction?
_Vì sao hỏi tiếp:_ vì mock dính vào cách cài đặt, câu kế là nên khẳng định cái gì để test bền hơn.

**Đáp:** Ưu tiên kết quả quan sát được. `verify` chỉ khi hiệu ứng phụ chính là mục đích (gửi email, ghi audit).

**Sai lầm hay gặp:** `@InjectMocks` che giấu thiếu phụ thuộc; mock cả class đang được test; `when(...)` trên spy gọi nhầm method thật. Xem [Kiểm thử JUnit, Mockito](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-29-kiem-thu-junit-mockito.md).

## 10. Team viết 100 test end-to-end chạy 8 phút và ít unit test, CI chậm và người ta bỏ không chạy test nữa. Chọn tỷ lệ unit, integration, BDD thế nào cho hợp lý, và mỗi loại đổi lấy cái gì?

**Gợi ý suy luận:**
- Test càng giống production thì chạy nhanh hơn hay chậm hơn, ổn định hơn hay dễ hỏng hơn? Khái niệm nền: đánh đổi tốc độ, độ ổn định và độ giống thật.
- Khi một test đỏ, loại test nào giúp định vị lỗi chính xác nhất?
- Ai cần đọc được kịch bản kiểm thử (lập trình viên hay cả product owner, QA)? Khái niệm nền: BDD, Given/When/Then.

**Lập luận:** Vì mỗi loại test đánh đổi tốc độ và độ ổn định lấy độ giống production, càng giống thật càng chậm, càng đắt và càng dễ hỏng vì lý do không liên quan tới code vừa sửa. Nên phản hồi nhanh đến từ nhiều test rẻ ở đáy, ít test ghép nối ở giữa, rất ít end-to-end ở đỉnh (hình tháp). BDD thêm một lớp ngôn ngữ chung, chỉ đáng khi người không kỹ thuật cùng đọc. Điểm dễ nhầm là đo chất lượng bằng số lượng test hoặc phần trăm coverage: một bộ test chậm và dễ hỏng bị bỏ qua còn tệ hơn ít test mà nhanh. Hãy đặt mục tiêu thời gian phản hồi (ví dụ unit test dưới vài phút), chạy e2e riêng trên các flow quan trọng nhất, và sửa hoặc xóa test flaky ngay thay vì để mọi người học cách bỏ qua CI.

**Đáp án ngắn:** Unit test: một đơn vị, không IO, mili giây. Integration test: nhiều phần ghép (DB, HTTP), chậm hơn. BDD (Given/When/Then, Cucumber) dùng làm test chấp nhận, giá trị khi người không kỹ thuật cùng đọc. Tỷ lệ theo hình tháp: nhiều unit, ít integration, rất ít e2e.

**Nhớ:** Test rẻ ở đáy tháp cho phản hồi nhanh; càng lên cao càng chậm, đắt, dễ flaky.

**Ví dụ:** _Đã chạy thử (tính bằng Python)._ Cùng một bộ test, hai hình dạng:

```text
1000 unit x 5ms = 5.0 s ; 100 e2e x 5s = 500 s ( 8.3 phut )
```

Lập trình viên chạy 1000 unit test trong 5 giây sau mỗi lần sửa code, trong khi 100 e2e test mất hơn 8 phút (và mỗi test e2e còn có xác suất flaky). Nếu "hình cốc kem ngược" (ít unit, nhiều UI test), CI chậm và người ta ngừng chạy test. BDD, _minh họa, chưa chạy thử_:

```text
Feature: Cộng hai số
  Scenario Outline: Cộng
    Given hai số <a> và <b>
    When cộng lại
    Then kết quả là <expected>
```

**Hỏi xoáy 1:** Hình tháp kiểm thử là gì?
_Vì sao hỏi tiếp:_ output so sánh 5 giây với 8 phút, nên câu kế là gọi tên mô hình giải quyết chênh lệch đó.

**Đáp:** Nhiều unit ở đáy, ít hơn integration ở giữa, rất ít end-to-end ở đỉnh. Phản hồi nhanh và định vị lỗi chính xác nằm ở đáy.

**Hỏi xoáy 2:** BDD có đáng dùng không?
_Vì sao hỏi tiếp:_ BDD là loại test duy nhất trong ba loại tồn tại vì lý do giao tiếp, không phải kỹ thuật, nên cần hỏi khi nào chi phí của nó xứng đáng.

**Đáp:** Có khi product owner/QA cùng đọc/viết kịch bản; nếu chỉ lập trình viên dùng thì class Gherkin thường thêm chi phí bảo trì mà không thêm lợi ích. Chỉ đặt business flow quan trọng vào BDD.

**Sai lầm hay gặp:** Gọi mọi test dùng JUnit là "unit test"; integration test dùng chung database nên phá nhau (xem câu 18). Xem [Testing nâng cao](/go?p=01-Spring-Boot%2Fhard%2Flt-27-advanced-testing.md).

---

## 11. Java có GC tự dọn rồi, nhưng heap của dịch vụ vẫn tăng dần sau mỗi lần full GC cho tới khi `OutOfMemoryError`. Điều gì giữ các object lại, và đó có phải leak không?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- GC quyết định thu một object dựa trên điều gì: "bạn còn cần" hay "còn tham chiếu tới được"? Khái niệm nền: reachability, GC root.
- Nếu một `static Map` hoặc một ô mảng cũ vẫn trỏ tới object đã hết dùng thì GC có thu được không?
- Muốn điều tra thì quan sát heap lúc nào (trước hay sau GC) và công cụ nào? Khái niệm nền: heap dump.

**Lập luận:** Vì GC chỉ biết object còn tham chiếu tới được từ GC root (biến static, stack thread...) chứ không biết bạn còn cần nó hay không, nên object hết dùng nhưng vẫn bị tham chiếu sẽ không bị thu: đó chính là "leak" trong Java. Heap sau full GC tăng dần nghĩa là có thứ giữ tham chiếu mãi, cuối cùng tràn thành OOM. Điểm dễ nhầm là nghĩ cứ tăng `-Xmx` là xong, hoặc tin rằng `static` collection nhỏ vô hại: collection tĩnh lớn dần theo thời gian và không bao giờ giảm. Khi nghi rò rỉ, lấy heap dump và tìm đường từ GC root tới object chiếm nhiều chỗ, kiểm tra trước ba nguồn kinh điển (cache không giới hạn, listener không hủy, `ThreadLocal` không `remove()`) và đặt giới hạn kích thước cho mọi cache.

**Đáp án ngắn:** Có. Ví dụ kinh điển: stack cài bằng mảng chỉ giảm con trỏ khi `pop` mà không gán `null` ô cũ. Nguyên nhân thực tế: `static` Map/cache không giới hạn; listener đăng ký không hủy; `ThreadLocal` trong thread pool không `remove()`; inner class giữ `this` ngoài; kết nối/stream không đóng; class loader leak.

**Nhớ:** Leak trong Java là "còn tham chiếu nhưng không còn dùng"; GC chỉ thu cái không tới được từ GC root.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Dùng `WeakReference` để biết object có bị GC thu không:

```text
Pop KHONG gan null: object con bi GC thu khong? false  (mang van giu tham chieu o o cu)
Pop co gan null:    object duoc GC thu khong?     true
static Map giu 100 x 100KB: heap sau GC tang ~9 MB (GC khong thu vi con tham chieu toi duoc)
```

Hai stack cùng "đã pop" nhưng một bản giữ tham chiếu ở ô mảng cũ nên object **không bao giờ được thu**. Dòng cuối: `static Map` giữ 100 mảng 100 KB, sau `System.gc()` heap vẫn tăng ~9 MB vì mọi mảng còn tới được. Nếu ứng dụng thêm vào map đó mỗi request thì heap tăng mãi tới `OutOfMemoryError`. Mã sửa:

```java
public E pop() {
    E e = elements[--size];
    elements[size] = null;     // gỡ tham chiếu thừa để GC thu được
    return e;
}
```

**Hỏi xoáy 1:** Nguyên nhân leak phổ biến trong ứng dụng thật?
_Vì sao hỏi tiếp:_ ví dụ stack chỉ là đồ chơi, nên người phỏng vấn muốn bạn chuyển nguyên lý "còn tham chiếu" sang các tình huống thực.

**Đáp:** Liệt kê ở trên. Triệu chứng: heap **sau full GC** tăng dần theo thời gian (không phải heap trước GC), cuối cùng OOM.

**Hỏi xoáy 2:** `WeakReference` giúp được gì? Cách điều tra?
_Vì sao hỏi tiếp:_ nếu leak là tham chiếu mạnh thừa, thì có loại tham chiếu yếu để tránh nó, và khi đã leak thì tìm ra ai đang giữ bằng cách nào.

**Đáp:** Object chỉ còn `WeakReference` trỏ tới bị thu ở lần GC kế (dùng cho cache tự dọn, `WeakHashMap`); `SoftReference` thu khi thiếu memory. Điều tra: `-XX:+HeapDumpOnOutOfMemoryError`, `jcmd <pid> GC.heap_dump`, mở bằng Eclipse MAT xem dominator tree và đường dẫn tới GC root. Xem [chẩn đoán JVM](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md).

**Sai lầm hay gặp:** Gọi `System.gc()` để "chữa" leak; tăng `-Xmx` thay vì tìm nguyên nhân.

## 12. Container giới hạn 1 GB, bạn đặt `-Xmx1g` mà pod vẫn bị OOM-kill, trong khi log không có `OutOfMemoryError`. Vì sao, và các cờ memory JVM nào cần đặt? `-Xms` bằng `-Xmx` để làm gì?

**Gợi ý suy luận:**
- Heap có phải toàn bộ memory của process JVM không? Còn gì nằm ngoài heap (stack thread, metaspace, direct buffer)? Khái niệm nền: bố cục memory process.
- Ai là bên giết process khi vượt giới hạn container: JVM hay hệ điều hành? Khái niệm nền: OOM-kill.
- Heap nới ra co lại lúc chạy thì có cái giá gì? Khái niệm nền: `-Xms`, `-Xmx`.

**Lập luận:** Vì JVM xin memory từ hệ điều hành theo giới hạn bạn cho (hoặc mặc định theo RAM máy) và heap chỉ là một phần memory process, nếu tổng (heap, stack, metaspace, direct buffer...) vượt giới hạn container thì hệ điều hành giết process, JVM không có cơ hội ném lỗi đẹp. Vì vậy phải để heap thấp hơn giới hạn container (ví dụ `-XX:MaxRAMPercentage`). Còn đặt `-Xms = -Xmx` thì heap cố định, tránh pause do nới hoặc co heap, đổi lại chiếm RAM ngay từ đầu. Điểm dễ nhầm là chỉ đặt `-Xmx` bằng đúng giới hạn container: heap chỉ là một phần memory, còn metaspace, stack thread, code cache, direct buffer và overhead của JVM cần thêm chỗ. Hãy để heap khoảng 60 đến 75% giới hạn bằng `-XX:MaxRAMPercentage`, theo dõi memory của process (không chỉ heap), và giới hạn số thread cùng kích thước direct buffer.

**Đáp án ngắn:** `-Xmx` heap tối đa, `-Xms` heap ban đầu, `-Xss` stack mỗi thread. `-Xms = -Xmx` làm heap cố định: tránh pause do nới/co heap, đổi lại chiếm RAM ngay. Trong container dùng `-XX:MaxRAMPercentage`.

**Nhớ:** Heap chỉ là một phần memory process; vượt giới hạn container thì bị OOM-kill chứ không có `OutOfMemoryError`.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Máy soạn có ~3,9 GB RAM, 2 CPU:

```text
mac dinh:                       maxMemory (heap toi da) = 980 MB, availableProcessors = 2
-Xmx64m:                        maxMemory (heap toi da) = 64 MB
-XX:MaxRAMPercentage=10:        maxMemory (heap toi da) = 392 MB
-Xmx32m, nap 1MB den khi het:   OutOfMemoryError sau 27 MB: Java heap space
```

Mặc định heap tối đa ≈ **1/4 RAM** (980 MB trên 3,9 GB). `MaxRAMPercentage=10` cho 392 MB (10% RAM). Khi heap 32 MB, chương trình nạp được ~27 MB trước khi `OutOfMemoryError: Java heap space` (phần còn lại dành cho object khác của JVM). Cấu hình khuyến nghị cho container, _minh họa, chưa chạy thử_:

```bash
java -XX:MaxRAMPercentage=75 -XX:+HeapDumpOnOutOfMemoryError -Xlog:gc* -jar app.jar
```

**Hỏi xoáy 1:** PermGen sách nhắc còn không?
_Vì sao hỏi tiếp:_ bạn vừa nói memory process có nhiều vùng ngoài heap, nên người phỏng vấn kiểm tra vùng chứa metadata class và cách nó đã đổi qua các phiên bản.

**Đáp:** Không. Java 8 bỏ PermGen, metadata class nằm ở **Metaspace** (native memory), giới hạn bằng `-XX:MaxMetaspaceSize`. Lỗi tương ứng: `OutOfMemoryError: Metaspace` (thường do class loader leak hoặc sinh class động quá nhiều).

**Hỏi xoáy 2:** Chạy trong container cần lưu ý gì?
_Vì sao hỏi tiếp:_ đây là tình huống mở đầu câu hỏi, giờ gom lại thành quy tắc cấu hình cụ thể.

**Đáp:** JVM hiện đại nhận biết giới hạn cgroup (Java 10+, backport 8u191). Heap chỉ là một phần: còn Metaspace, stack các thread, direct buffer, code cache; đặt heap bằng 100% giới hạn thì bị OOM-kill. Dưới khoảng 32 GB heap, JVM dùng compressed oops (con trỏ nén) nên tiết kiệm; vượt ngưỡng đó mức dùng memory nhảy vọt.

**Sai lầm hay gặp:** Đặt `-Xss` rất lớn thay vì sửa đệ quy sâu; để mặc định ở production mà không đo. Xem [GC chuyên sâu](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-18-gc-chuyen-sau.md).

## 13. Đồng nghiệp đóng kết nối DB trong `finalize()` và flush log trong shutdown hook, rồi gọi `System.gc()` "cho chắc". Việc dọn dẹp đó có đáng tin không, khi process bị kill bất ngờ?

**Gợi ý suy luận:**
- Ai quyết định khi nào GC chạy và khi nào một object được finalize? Khái niệm nền: GC không xác định thời điểm.
- Process có thể kết thúc bằng những cách nào (thoát bình thường, `System.exit`, `halt`, `kill -9`)? Hook chạy ở cách nào? Khái niệm nền: shutdown hook.
- Muốn giải phóng tài nguyên chắc chắn thì dùng cơ chế gắn với phạm vi mã, không phụ thuộc GC là gì? Khái niệm nền: try-with-resources, `Cleaner`.

**Lập luận:** Vì thời điểm GC chạy và thời điểm process tắt không do bạn quyết định, mã dựa vào "chắc chắn sẽ chạy lúc X" sẽ gãy: `finalize()` có thể chạy muộn hoặc không bao giờ chạy, shutdown hook không chạy khi process bị kill đột ngột. Nên `System.gc()` chỉ là gợi ý và thường che một leak; tài nguyên phải đóng bằng try-with-resources, còn hook chỉ làm việc dọn dẹp "cố gắng hết sức". Điểm dễ nhầm là dựa vào finalizer hay shutdown hook cho việc bắt buộc đúng (đóng kết nối, ghi dữ liệu quan trọng): chúng không đảm bảo chạy hay chạy đúng lúc. Việc bắt buộc phải gắn với phạm vi rõ ràng (`try-with-resources`, `@PreDestroy`, graceful shutdown), còn `System.gc()` nên được xem là dấu hiệu cần điều tra nguyên nhân gốc.

**Đáp án ngắn:** `System.gc()` chỉ là gợi ý, thường là mùi code (che leak). `finalize()` chạy khi nào và có chạy hay không là không xác định, bị deprecated for removal từ Java 18; thay bằng `try-with-resources` và `java.lang.ref.Cleaner`. Shutdown hook chạy khi JVM tắt bình thường.

**Nhớ:** Không dựa vào thời điểm GC hay shutdown hook cho việc bắt buộc; đóng tài nguyên bằng try-with-resources.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Cùng một chương trình đăng ký hook, ba cách kết thúc:

```text
== normal  (main ket thuc binh thuong)
che do: normal
  main ket thuc binh thuong
  [hook] dong ket noi, flush log
== exit    (System.exit)
che do: exit
  [hook] dong ket noi, flush log
== halt    (Runtime.halt)
che do: halt
```

Hook chạy với kết thúc bình thường và `System.exit`, **không chạy** với `Runtime.halt` (và tương tự với `kill -9`, crash JVM). Vì vậy việc **bắt buộc** (ví dụ ghi dữ liệu) không thể chỉ dựa vào hook; phải thiết kế để mất điện giữa chừng vẫn đúng (ghi trước, idempotent).

**Hỏi xoáy 1:** Shutdown hook chạy khi nào, không chạy khi nào?
_Vì sao hỏi tiếp:_ bạn nói hook không đáng tin tuyệt đối, nên người phỏng vấn đòi ranh giới cụ thể: trường hợp nào chạy, trường hợp nào không.

**Đáp:** Xem output. Thêm: các hook chạy **đồng thời, không có thứ tự**, nên giữ chúng ngắn và độc lập; đừng khởi động thread mới hay phụ thuộc dịch vụ khác đã bị hook khác tắt. Spring Boot đăng ký hook để đóng context và hỗ trợ graceful shutdown.

**Hỏi xoáy 2:** Native method là gì?
_Vì sao hỏi tiếp:_ tài nguyên native là lý do chính cần `finalize`/`Cleaner`, nên câu kế là native method và cái giá khi bước ra ngoài sự quản lý của JVM.

**Đáp:** Method khai báo `native`, cài bằng C/C++ qua JNI. Đổi lại mất an toàn memory và tính portable, lỗi có thể làm sập JVM. Hướng hiện đại: Foreign Function & Memory API (chính thức từ Java 22).

**Sai lầm hay gặp:** Dựa vào `finalize` để giải phóng tài nguyên; công việc nặng trong shutdown hook làm process không tắt kịp. Xem [concurrency: hủy và shutdown](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-07-huy-va-shutdown.md).

---

## 14. Client gọi API thanh toán, mạng rớt mất phản hồi, client không biết đã trừ tiền chưa và muốn gửi lại. Gửi lại `PUT` thì ổn nhưng gửi lại `POST` có thể trừ tiền hai lần. Vì sao, và safe/idempotent nghĩa là gì?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Khi mất phản hồi, client có biết yêu cầu đã chạy chưa? Nên điều nó cần biết về method là gì? Khái niệm nền: retry an toàn.
- Gọi một lần và gọi nhiều lần cho kết quả cuối giống nhau thì gọi là gì? Khái niệm nền: idempotent.
- `PUT` đặt tài nguyên tại URI đã biết, còn `POST` để server tạo cái mới với id do nó cấp: lặp lại hai lần khác nhau thế nào?

**Lập luận:** Vì mạng có thể làm mất phản hồi, client phải biết gửi lại có an toàn không. Method idempotent (kết quả cuối như nhau dù gọi một hay nhiều lần) thì gửi lại thoải mái. `PUT` đặt tài nguyên tại URI đã xác định nên lặp lại vẫn ra cùng trạng thái. `POST` để server tạo tài nguyên mới với id do nó cấp nên mỗi lần gọi thêm một bản ghi, không idempotent. Cần retry `POST` thanh toán thì phải thêm cơ chế khử trùng (`Idempotency-Key`). Điểm dễ nhầm là nghĩ HTTP method tự bảo đảm idempotent: nó chỉ là quy ước, server cài sai (ví dụ `PUT` cộng dồn giá trị) vẫn gây lỗi khi retry. Với `POST` có tác động tiền bạc, yêu cầu client gửi `Idempotency-Key`, lưu kết quả theo key kèm ràng buộc UNIQUE, và trả lại kết quả cũ khi gặp lại.

**Đáp án ngắn:** Safe: không đổi trạng thái (`GET`, `HEAD`, `OPTIONS`). Idempotent: `GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`. `POST` không idempotent, `PATCH` nói chung cũng không. `PUT` thay thế toàn bộ tài nguyên tại URI đã biết; `POST` xử lý/tạo tài nguyên con và server cấp id.

**Nhớ:** Idempotent là điều kiện để retry an toàn; `PUT` đặt trạng thái, `POST` thêm xử lý.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Một HTTP server nhỏ thật (`com.sun.net.httpserver`) và `HttpClient` gọi lặp lại:

```text
PUT /users/42 -> 200
PUT /users/42 -> 200   (lap lai: trang thai cuoi KHONG doi, users=1)
POST /users -> 201 Location=/users/1
POST /users -> 201 Location=/users/2   (lap lai: tao THEM, users=3)
DELETE /users/42 -> 204
DELETE /users/42 -> 404   (trang thai cuoi van la 'da xoa')
GET /users/42 -> 404
PATCH /users/1 -> 405
```

`PUT` hai lần: vẫn chỉ một user 42. `POST` hai lần: tạo user 1 và user 2 (tổng 3 user kể cả user 42 từ trước). `DELETE` lần hai trả `404`, **response khác nhưng trạng thái cuối giống nhau** (đã xóa): idempotent không có nghĩa là response giống hệt. Với `POST` nguy hiểm khi retry (thanh toán), dùng header `Idempotency-Key`:

```http
POST /payments
Idempotency-Key: 8f1c3a52-...   # server lưu kết quả theo key và trả lại bản cũ nếu trùng
```

**Hỏi xoáy 1:** Sách ghi "dùng PUT để đặt nội dung mới, POST để ghi đè nội dung đã có". Đúng không?
_Vì sao hỏi tiếp:_ nếu bạn hiểu PUT idempotent còn POST thì không, bạn sẽ phát hiện câu sách cũ này đảo ngược; đây là cách kiểm tra bạn hiểu bản chất hay thuộc lòng.

**Đáp:** Gần như **ngược** với quy ước hiện hành (RFC 9110): PUT = "đặt tài nguyên *này* thành *thế này*", idempotent; POST = "xử lý cái này", không idempotent. Ôn từ sách cũ nên đối chiếu RFC.

**Hỏi xoáy 2:** Idempotent có nghĩa response giống hệt nhau không? Làm sao làm `POST` thanh toán an toàn khi retry?
_Vì sao hỏi tiếp:_ output `DELETE` trả 204 rồi 404 gợi ngờ về định nghĩa, và `POST` không idempotent nhưng thanh toán vẫn phải retry được, nên cần cách bù.

**Đáp:** Không (xem `DELETE` ở trên). Với `POST` thanh toán: `Idempotency-Key` và server khử trùng bằng ràng buộc UNIQUE. Xem [Distributed lock và Idempotency](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md).

**Sai lầm hay gặp:** Dùng `GET` để thay đổi dữ liệu (crawler/prefetch làm xóa dữ liệu); nói "idempotent" nhưng cài đặt tăng bộ đếm mỗi lần gọi.

## 15. API trả `200` kèm body `{"error":...}` cho mọi lỗi, và client gọi dịch vụ khác không đặt timeout. Điều gì hỏng khi monitoring, proxy, retry đọc status code, và một dịch vụ chậm kéo theo bên gọi thế nào?

**Gợi ý suy luận:**
- Ai ngoài con người đọc status code (client, proxy, retry logic, monitoring) để ra quyết định gì? Khái niệm nền: status code là contract cho máy đọc.
- Lỗi do client khác lỗi do server ở chỗ nào, và hệ quả với việc retry? Khái niệm nền: 4xx và 5xx.
- Gọi một dịch vụ chậm không có timeout thì thread của bên gọi ra sao? Khái niệm nền: timeout, cạn pool thread.

**Lập luận:** Vì status code là contract cho máy đọc, client, proxy, retry logic, monitoring dựa vào đó để quyết định (retry? cache? cảnh báo?), trả `200` cho lỗi làm hỏng mọi quyết định tự động đó. Phân nhóm `4xx` (lỗi client, retry vô ích) và `5xx` (lỗi server, có thể retry) cho máy biết hành động tiếp theo. Còn thiếu timeout thì mỗi call tới dịch vụ chậm giữ một thread mãi, pool cạn và lỗi lan sang bên gọi (xem [Microservices, câu 3](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-16-microservices-kafka-phan-tan.md)). Điểm dễ nhầm là dùng `200` cho mọi phản hồi với lý do "request tới được server": monitoring không thấy lỗi, cache và proxy lưu nhầm, retry không kích hoạt. Hãy trả status đúng nghĩa, chuẩn hóa body lỗi (ví dụ `ProblemDetail`), và đặt timeout kết nối cùng timeout đọc cho mọi lời gọi ra ngoài.

**Đáp án ngắn:** `2xx` thành công, `3xx` chuyển hướng/cache, `4xx` lỗi do client, `5xx` lỗi do server. Hay dùng: `200`, `201` (kèm `Location`), `204`, `400`, `401`, `403`, `404`, `405`, `409` (xung đột), `422` (sai nghiệp vụ), `429`, `500`, `502/504`, `503` (kèm `Retry-After`).

**Nhớ:** Status code đúng cho máy ra quyết định; mọi call ra ngoài phải có timeout.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Cùng server nhỏ: một endpoint bị rate limiting, một endpoint chậm 1,5 giây, client đặt timeout 500 ms:

```text
GET /limited -> 429
GET /slow voi timeout 500ms -> HttpTimeoutException sau 512ms (khong treo luong 1.5s)
```

`429` cho client biết "đừng gọi dồn nữa" (server kèm `Retry-After: 30` trong ví dụ). Timeout cắt call chậm sau ~512 ms thay vì treo thread 1,5 giây; nếu mỗi request đều treo như vậy, pool thread cạn rất nhanh. Mã client, _minh họa, chưa chạy thử_ (cùng thư viện đã dùng ở ví dụ trên):

```java
var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
var req = HttpRequest.newBuilder(URI.create("https://api.example.com/users/42"))
        .timeout(Duration.ofSeconds(3)).GET().build();
var res = client.send(req, HttpResponse.BodyHandlers.ofString());
if (res.statusCode() != 200) throw new IllegalStateException("Upstream " + res.statusCode());
```

**Hỏi xoáy 1:** `401` khác `403` ra sao? Khi nào trả `404` thay vì `403`?
_Vì sao hỏi tiếp:_ trong nhóm `4xx`, cặp dễ nhầm nhất và liên quan bảo mật là hai mã này, nên người phỏng vấn kiểm tra bạn có hiểu ranh giới authentication và authorization.

**Đáp:** `401` = chưa biết bạn là ai (thiếu/sai credential); `403` = biết bạn nhưng không được phép. Một số API cố ý trả `404` cho người không có quyền xem để không lộ tài nguyên tồn tại: quyết định bảo mật, cần nhất quán.

**Hỏi xoáy 2:** Gọi dịch vụ khác bằng HTTP trong Java nên làm gì?
_Vì sao hỏi tiếp:_ phần sau của câu hỏi là phía client: biết quy ước status code rồi thì viết mã gọi thế nào để không bị dịch vụ chậm kéo sập.

**Đáp:** `java.net.http.HttpClient` (Java 11) hoặc `RestClient`/`WebClient` trong Spring (`RestTemplate` ở chế độ bảo trì). Luôn đặt **connect và read timeout**, tái sử dụng client (connection pool), chỉ **retry** thao tác idempotent kèm backoff + giới hạn, xử lý `5xx/429` riêng (tôn trọng `Retry-After`).

**Sai lầm hay gặp:** Trả `200` kèm body `{"error":...}`; dùng `500` cho mọi lỗi nghiệp vụ; không timeout. Xem [HTTP chi tiết](/go?p=03-Network-Security%2Feasy%2Flt-02-http-chi-tiet.md) và [REST Controller](/go?p=01-Spring-Boot%2Feasy%2Flt-03-rest-controller.md).

---

## 16. Ứng dụng Spring có hai bean cùng implement `Dictionary`, và `SpellChecker` cần một `Dictionary`. Container chọn bean nào, khi nào báo lỗi, và nếu hai bean cần nhau qua constructor thì chuyện gì xảy ra?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Container có thông tin chắc chắn nhất nào để biết "chỗ cần này, đưa bean nào"? Khái niệm nền: khớp theo kiểu.
- Khi kiểu không đủ phân biệt thì cần thêm thông tin gì, và thông tin nào mong manh, thông tin nào tường minh? Khái niệm nền: `@Qualifier`, `@Primary`, tên tham số.
- Để dựng A phải có B, để dựng B phải có A thì dựng cái nào trước? Khái niệm nền: circular dependency.

**Lập luận:** Vì container chỉ biết chắc kiểu, nó tìm ứng viên theo kiểu: một cái thì dùng, không có thì lỗi `NoSuchBeanDefinitionException`. Có nhiều cái thì cần thêm thông tin: `@Primary`, `@Qualifier`, rồi mới tới khớp tên tham số; tên tham số là thông tin ngầm, đổi tên biến là hỏng, nên nên nói rõ bằng `@Qualifier`/`@Primary`. Hết cách thì `NoUniqueBeanDefinitionException`. Với circular dependency qua constructor, không bên nào dựng xong trước, nên không dựng được. Điểm dễ nhầm là dựa vào khớp tên tham số để chọn bean: đổi tên biến hay biên dịch không giữ tên tham số là hỏng. Hãy nói rõ ý định bằng `@Primary` cho mặc định chung và `@Qualifier` cho điểm cần chọn riêng, và với circular dependency qua constructor thì phá vòng bằng thiết kế (tách bean thứ ba, dùng event) thay vì bật cho phép vòng.

**Đáp án ngắn:** Một ứng viên thì dùng; không có thì `NoSuchBeanDefinitionException`; nhiều thì thử `@Primary`, `@Qualifier`, rồi khớp **tên** tham số/field, cuối cùng `NoUniqueBeanDefinitionException`. Có thể inject `List<Dictionary>`/`Map<String, Dictionary>` để nhận tất cả.

**Nhớ:** Tìm bean theo kiểu trước, phân biệt bằng `@Primary`/`@Qualifier`; không dựa vào tên tham số ngầm.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng thứ tự quyết định của Spring bằng một container nhỏ (đây là mô phỏng quy tắc, không phải code Spring):

```text
0 bean : NoSuchBeanDefinitionException: khong co bean kieu Dictionary
1 bean : FileDictionary
2 bean : NoUniqueBeanDefinitionException: [fileDictionary, webDictionary] (tham so 'dictionary' khong khop ten nao)
2 bean + ten tham so 'webDictionary': WebDictionary   <- chay duoc nho TEN, doi ten bien la hong
2 bean + @Qualifier("fileDictionary"): FileDictionary
2 bean + @Primary tren webDictionary: WebDictionary
```

Code Spring, _minh họa, chưa chạy thử_:

```java
@Service
class SpellChecker {
    private final Dictionary dictionary;
    // một constructor: không cần @Autowired
    SpellChecker(@Qualifier("fileDictionary") Dictionary dictionary) {
        this.dictionary = dictionary;
    }
}
```

**Hỏi xoáy 1:** Vì sao nên inject bằng constructor thay vì field?
_Vì sao hỏi tiếp:_ ví dụ code đã dùng constructor, nên người phỏng vấn hỏi lý do chọn nó, cũng là bước đệm sang chuyện circular dependency.

**Đáp:** Phụ thuộc rõ ràng, field `final` (bất biến, thread-safe), unit test chỉ cần `new` kèm mock không cần Spring, và lộ thiết kế sai (constructor quá nhiều tham số = class làm quá nhiều việc). Field injection dùng reflection và dễ NPE ngoài container.

**Hỏi xoáy 2:** Hai bean phụ thuộc lẫn nhau qua constructor thì sao?
_Vì sao hỏi tiếp:_ constructor injection buộc phụ thuộc phải có sẵn lúc dựng, nên mặt trái của nó là circular dependency không dựng nổi.

**Đáp:** Không dựng được: `BeanCurrentlyInCreationException`. Từ Spring Boot 2.6 tham chiếu vòng bị cấm mặc định. Chữa cháy bằng `@Lazy` hoặc setter injection, nhưng đó là triệu chứng của thiết kế: tách trách nhiệm hoặc dùng event. Xem [IoC và DI](/go?p=01-Spring-Boot%2Feasy%2Flt-02-ioc-di.md).

**Sai lầm hay gặp:** Dựa vào khớp theo tên ngầm; dùng `ApplicationContext.getBean` khắp nơi (service locator).

## 17. Mỗi truy vấn JDBC tay phải lặp khung mở connection, statement, đóng, bắt lỗi, và đã có lần quên `close()` làm cạn pool. `JdbcTemplate` của Spring loại bỏ vấn đề đó bằng cách nào?

**Gợi ý suy luận:**
- Trong mọi truy vấn, phần nào luôn giống nhau và phần nào thay đổi (SQL, cách ánh xạ dòng)? Khái niệm nền: Template Method.
- Chỗ dễ quên nhất của khung đó là gì, và quên thì hậu quả với connection pool ra sao? Khái niệm nền: rò rỉ connection.
- `SQLException` là checked, ép bắt ở mọi nơi: có cách nào gọn hơn? Khái niệm nền: dịch sang `DataAccessException` unchecked.

**Lập luận:** Vì code JDBC tay có cùng một khung lặp lại ở mọi truy vấn và chỗ dễ quên nhất là đóng, nên đặt khung vào thư viện (Template Method): khung cố định do `JdbcTemplate` giữ nên không thể quên đóng, phần thay đổi (SQL, tham số, ánh xạ dòng bằng `RowMapper`) do bạn truyền vào. Nó cũng dịch `SQLException` checked thành `DataAccessException` unchecked để code gọi gọn hơn. Điểm dễ nhầm là tự mở `Connection` trong code rồi để `JdbcTemplate` làm phần còn lại: hãy để nó lấy kết nối từ `DataSource` để quản lý transaction đúng, dùng tham số `?` thay vì nối chuỗi SQL, và nhớ `queryForObject` ném exception khi không có dòng nào. Với truy vấn phức tạp hoặc nhiều thay đổi, cân nhắc `NamedParameterJdbcTemplate`.

**Đáp án ngắn:** `JdbcTemplate` lo mở/đóng tài nguyên và dịch `SQLException` (checked) thành `DataAccessException` (unchecked); bạn cung cấp SQL, tham số, `RowMapper`.

**Nhớ:** Template Method: khung cố định do thư viện giữ nên không quên đóng; bạn chỉ truyền phần thay đổi.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng khung template và so với JDBC tay có 10 lần quên đóng trong 1000 lần gọi:

```text
1000 lan goi template: mo 1000 connection, dong 1000  (khong ro ri, khong code finally thu cong)
JDBC tho co 10 lan quen close: mo 1000, dong 990 -> ro ri 10 connection (pool 10 se can!)
```

Mười connection rò rỉ đủ để cạn một pool 10 connection và treo cả ứng dụng. _Đã chạy thử bằng Python (SQLite)_: tham số `?` khác nối chuỗi, nguyên lý giống JDBC `PreparedStatement`:

```text
Noi chuoi  : SELECT ... WHERE name = 'x' OR '1'='1'  -> [('an',), ('admin',)] (lay ra TAT CA user)
Tham so '?': tim name = "x' OR '1'='1"  -> [] (chuoi doc nhu GIA TRI, khong phai SQL)
```

Spring, _minh họa, chưa chạy thử_:

```java
List<User> users = jdbc.query(
    "select id, name from users where status = ?",
    (rs, i) -> new User(rs.getString("id"), rs.getString("name")),
    "ACTIVE");
jdbc.update("insert into users(id, name) values (?, ?)", UUID.randomUUID().toString(), "Dũng");
```

**Hỏi xoáy 1:** Tham số `?` có tác dụng gì ngoài sạch code?
_Vì sao hỏi tiếp:_ ví dụ code dùng `?` thay vì nối chuỗi, nên người phỏng vấn hỏi lý do thật đằng sau lựa chọn đó: an toàn hơn là gọn hơn.

**Đáp:** Chống **SQL injection**: giá trị gửi tách biệt khỏi câu lệnh nên không bị hiểu là SQL (xem output SQLite). Tên bảng/cột không tham số hóa được, phải whitelist.

**Hỏi xoáy 2:** `JdbcTemplate` có hoạt động trong transaction của Spring không?
_Vì sao hỏi tiếp:_ template tự mở và đóng connection, nên câu kế là nó lấy connection ở đâu để nhiều call vẫn nằm chung một transaction.

**Đáp:** Có. `@Transactional` gắn một `Connection` vào thread hiện tại; `JdbcTemplate` (qua `DataSourceUtils`) lấy đúng connection đó, nên nhiều call chia sẻ một transaction. Nếu bạn tự `dataSource.getConnection()` ngoài cơ chế này thì đi ngoài transaction. Xem [Transaction](/go?p=01-Spring-Boot%2Fmedium%2Flt-05-transaction.md) và [JDBC, Pool, Logging](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-28-jdbc-connection-pool-logging.md).

**Sai lầm hay gặp:** Bắt `DataAccessException` rồi nuốt; `queryForObject` mà không xử lý `EmptyResultDataAccessException`.

## 18. Bộ test tích hợp Spring chạy chậm vì nạp context nhiều lần, và test này để lại dữ liệu làm hỏng test khác. Spring tăng tốc và giữ DB sạch bằng cách nào, và cách đó có che mất lỗi nào không?

**Gợi ý suy luận:**
- Nạp context Spring tốn bao lâu, và có thể dùng lại giữa các test cùng cấu hình không? Khái niệm nền: cache context.
- Muốn mỗi test để lại DB nguyên trạng thì làm gì với transaction? Khái niệm nền: rollback sau test.
- Nếu không bao giờ commit thì cái gì phụ thuộc vào commit sẽ không xảy ra (thread khác đọc, listener `AFTER_COMMIT`)? Khái niệm nền: phạm vi transaction.

**Lập luận:** Vì nạp context rất đắt (giây), Spring cache context theo cấu hình để các test cùng cấu hình dùng lại. Giữ DB sạch bằng cách chạy test trong transaction rồi rollback: dữ liệu chưa bao giờ commit nên không để lại gì. Nhưng "chưa bao giờ commit" cũng nghĩa là mọi thứ phụ thuộc vào commit không xảy ra: thread khác không thấy dữ liệu, listener `AFTER_COMMIT` không chạy, ràng buộc DB chỉ lộ khi flush. Điểm dễ nhầm là nghĩ `@Transactional` trên test luôn đúng với hành vi production: test không thấy những gì chỉ xảy ra sau commit (listener `AFTER_COMMIT`, thread khác, ràng buộc kiểm tra lúc commit). Với những trường hợp đó, dùng test không rollback kèm dọn dữ liệu rõ ràng hoặc Testcontainers với dữ liệu riêng, và dùng `@DirtiesContext` ít thôi vì nó buộc nạp lại context.

**Đáp án ngắn:** `@SpringBootTest` nạp context một lần và cache cho các test cùng cấu hình; `@DirtiesContext` buộc nạp lại (đắt). `@Transactional` trên test: rollback sau mỗi test.

**Nhớ:** Context được cache (đắt); `@Transactional` trong test là rollback nên che mọi hành vi dựa vào commit.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng test transactional với "DB" chỉ cho thread khác thấy dữ liệu đã commit:

```text
Test @Transactional (mac dinh ROLLBACK):
  trong test: tim u1 -> An (cung luong, thay)
  luong khac (async/server that) tim u1 -> null (chua commit nen KHONG thay)
  sau test: DB sach = true, AFTER_COMMIT listener da KHONG chay (khong co commit)
Chay that voi commit:
  AFTER_COMMIT listener chay
  DB co: {u1=An}  -> du lieu ton tai giua cac test, can don dep
```

Ba hệ quả của rollback: thread khác (server thật trên random port, `@Async`) **không thấy** dữ liệu của test; `@TransactionalEventListener(AFTER_COMMIT)` **không chạy**; và ràng buộc DB chỉ được kiểm khi flush (cần `flush()` để lộ lỗi). Mã, _minh họa, chưa chạy thử_:

```java
@SpringBootTest
@Transactional
class UserRepositoryIT {
    @Autowired UserRepository repo;
    @Test
    void saveAndFind() {
        repo.save(new User("u1", "Dũng"));
        // ép SQL chạy để lộ vi phạm ràng buộc
        repo.flush();
        assertTrue(repo.findById("u1").isPresent());
    }   // rollback tự động
}
```

**Hỏi xoáy 1:** Rollback tự động có che lỗi nào không?
_Vì sao hỏi tiếp:_ cách giữ DB sạch tiện nhưng đổi hành vi so với production, nên người phỏng vấn hỏi ngay cái giá của sự tiện đó.

**Đáp:** Có (ba hệ quả ở trên). Trường hợp đó phải dọn thủ công (`@Sql`, xóa dữ liệu) hoặc dựng DB mới mỗi class test.

**Hỏi xoáy 2:** H2 in-memory hay DB thật khi test?
_Vì sao hỏi tiếp:_ vẫn cùng chủ đề "test có giống production không", chuyển từ hành vi transaction sang loại DB bên dưới.

**Đáp:** H2 nhanh nhưng khác hành vi (kiểu dữ liệu, dialect, lock, JSON) nên test qua mà production hỏng. Ưu tiên **Testcontainers** chạy đúng loại DB production; dùng slice test (`@DataJpaTest`, `@WebMvcTest`) để nạp ít. Xem [Testing nâng cao](/go?p=01-Spring-Boot%2Fhard%2Flt-27-advanced-testing.md).

**Sai lầm hay gặp:** `@DirtiesContext` khắp nơi làm CI chậm; test dùng chung dữ liệu seed nên phá nhau; tin test `@Transactional` giống hành vi production.

## 19. Controller của bạn nhét cả logic nghiệp vụ lẫn truy cập DB, nên mỗi lần test phải dựng DB và server thật. Viết controller thế nào để test nhanh, và `MockMvc` kiểm tra được những gì mà gọi thẳng method thì không?

**Gợi ý suy luận:**
- Code dễ test khi nó làm mấy việc và phụ thuộc vào thứ gì? Khái niệm nền: một trách nhiệm, phụ thuộc thay được.
- Controller mỏng chỉ cần giả phụ thuộc nào? Khái niệm nền: mock service.
- Gọi thẳng method của controller thì những bước nào của thread web bị bỏ qua (ánh xạ URL, JSON, validation)? Khái niệm nền: `DispatcherServlet`, `MockMvc`.

**Lập luận:** Vì test dễ khi code chỉ làm một việc và phụ thuộc vào thứ thay được, controller mỏng (nhận request, validate, gọi service, trả kết quả) có đúng một lý do để đổi và một dependency cần giả (service), nên test không cần DB hay server thật. Gọi thẳng method sẽ bỏ qua cả flow web, còn `MockMvc` giả lập flow qua `DispatcherServlet` trong cùng process nên kiểm được ánh xạ URL, JSON, validation, status code. Điểm dễ nhầm là dùng `MockMvc` như test hoàn chỉnh của cả hệ thống: nó kiểm tra lớp web, không kiểm tra DB hay mạng thật. Dùng `@WebMvcTest` kèm mock service cho lớp web, `@SpringBootTest` cho vài flow tích hợp, và giữ controller mỏng để test nghiệp vụ nằm ở service với unit test nhanh.

**Đáp án ngắn:** Logic nghiệp vụ nằm ở service, inject qua constructor. `MockMvc` giả lập flow qua `DispatcherServlet` trong cùng process, kiểm tra status, header, JSON.

**Nhớ:** Controller mỏng, phụ thuộc inject được; `MockMvc` kiểm cả thread web mà không cần server thật.

**Ví dụ:** _Minh họa, chưa chạy thử._ Test class web, mock service:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean UserService service;          // Boot 3.4+; trước đó dùng @MockBean

    @Test
    void found() throws Exception {
        when(service.find("42")).thenReturn(new UserDto("42", "Dũng"));
        mvc.perform(get("/users/42"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.name").value("Dũng"));
    }

    @Test
    void notFound() throws Exception {
        when(service.find("0")).thenThrow(new UserNotFoundException("0"));
        // kiểm tra @ControllerAdvice
        mvc.perform(get("/users/0")).andExpect(status().isNotFound());
    }
}
```

Test này kiểm tra những thứ test gọi thẳng method **bỏ qua**: ánh xạ URL, serialization JSON, validation, status code và xử lý lỗi toàn cục.

**Hỏi xoáy 1:** `@WebMvcTest` nạp những gì? Khác `@SpringBootTest` ra sao?
_Vì sao hỏi tiếp:_ ví dụ code mock `UserService`, nên người phỏng vấn hỏi vì sao không cần service thật, tức phạm vi context được nạp.

**Đáp:** Chỉ class web (controller, `@ControllerAdvice`, filter, converter, validation), **không** nạp service/repository nên phải mock. Nhanh hơn nhiều, nhưng không chứng minh các tầng ghép đúng; cần thêm vài test tích hợp.

**Hỏi xoáy 2:** Spring biến object thành JSON và chọn view template ra sao?
_Vì sao hỏi tiếp:_ test `jsonPath` chạy được vì có bước chuyển object thành JSON, nên câu kế là bước đó hoạt động thế nào trong thread MVC.

**Đáp:** `@RestController` ghi kết quả vào body qua `HttpMessageConverter` (Jackson cho JSON, chọn theo `Accept`). Với HTML, `@Controller` trả tên view và `ViewResolver` ghép với engine (Thymeleaf, FreeMarker). Xem [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md).

**Sai lầm hay gặp:** Nhét logic và truy cập DB vào controller; test controller bằng gọi thẳng method nên bỏ qua validation, serialization, security filter.

---

## 20. Bạn chạy `mvn package` và thấy cả test chạy, test hỏng thì không có jar; nhưng chạy `mvn compiler:compile` thì chỉ biên dịch. Vì sao hai lệnh hành xử khác nhau, và `package`, `install`, `deploy` khác nhau thế nào?

**Gợi ý suy luận:**
- Một build có thứ tự phụ thuộc thế nào (đóng gói trước hay biên dịch trước)? Khái niệm nền: chuỗi bước có thứ tự.
- Phase (mốc) và goal (việc thật của plugin) khác nhau ở đâu? Chạy một phase thì các phase trước nó ra sao? Khái niệm nền: lifecycle, phase, goal.
- Artifact được đặt ở đâu sau mỗi bước (thư mục `target`, repository máy, repository từ xa)?

**Lập luận:** Vì build là chuỗi bước có thứ tự phụ thuộc (không thể đóng gói trước khi biên dịch), Maven đặt tên các mốc (phase) theo thứ tự cố định, còn việc thật do các goal của plugin gắn vào mốc. Chạy một phase nghĩa là chạy mọi phase trước nó, nên `mvn package` đi qua `validate`, `compile`, `test` rồi mới `package`; test hỏng thì dừng, không có jar. `mvn compiler:compile` gọi thẳng một goal nên không chạy phase nào trước. Điểm dễ nhầm là chạy `mvn package -DskipTests` rồi tin build "xanh", hoặc nghĩ `mvn clean` tự chạy trước build. Hãy hiểu rõ phase nào chạy plugin goal nào, dùng `mvn verify` cho CI để chạy cả integration test, và không bỏ qua test trên nhánh chính.

**Đáp án ngắn:** Ba lifecycle: `clean`, `default`, `site`. `default`: `validate → compile → test → package → verify → install → deploy`. `mvn clean` không tự chạy trước build; gõ `mvn clean package`.

**Nhớ:** Phase là mốc có thứ tự, goal là việc cụ thể; chạy một phase là chạy mọi phase trước nó.

**Ví dụ:** _Đã chạy thử trên JDK 11_ (mô phỏng **đơn giản hóa** lifecycle: Maven thật có thêm phase như `process-resources`, `test-compile`, và goal gắn vào phụ thuộc kiểu packaging):

```text
mvn package  ->
   phase validate  [(khong co goal mac dinh)]
   phase compile  [compiler:compile]
   phase test  [surefire:test]
   phase package  [jar:jar]
mvn install  ->
   phase validate ... phase package  [jar:jar]
   phase verify  [failsafe:verify]
   phase install  [install:install]
mvn compiler:compile  -> chay DUNG 1 goal, khong chay phase nao truoc
```

`mvn package` chạy từ `validate` đến `package` (có cả `test`: nên test hỏng thì không có jar); `mvn compiler:compile` là một **goal**, không chạy phase nào trước (thiếu `resources` nên thiếu file cấu hình trong `target/classes`). Lệnh thường dùng, _minh họa, chưa chạy thử_:

```bash
mvn clean package                  # dọn rồi build, ra target/app.jar
mvn -DskipTests package            # biên dịch test nhưng không chạy
mvn clean verify                   # chạy cả integration test (failsafe)
```

**Hỏi xoáy 1:** `package`, `install`, `deploy` khác gì nhau?
_Vì sao hỏi tiếp:_ bạn đã biết thứ tự phase, nên câu kế là ba phase cuối đưa artifact tới những đâu.

**Đáp:** `package` tạo artifact trong `target/`; `install` chép vào **local repository** (`~/.m2/repository`) để module khác trên máy dùng; `deploy` đẩy lên **repository từ xa** (Nexus, Artifactory) cho cả team/CI. Artifact đóng gói chưa chứa dependency; muốn chạy một file cần fat jar (câu 21).

**Hỏi xoáy 2:** Unit test và integration test chạy ở đâu? Bỏ qua test thế nào?
_Vì sao hỏi tiếp:_ phase `test` nằm trước `package`, nên hỏi tiếp test chạy ở phase nào theo loại và cách tắt chúng khi cần.

**Đáp:** `surefire` chạy unit test (`*Test`) ở phase `test`; `failsafe` chạy integration test (`*IT`) ở `integration-test`/`verify`, và vẫn dọn tài nguyên ở `post-integration-test` trước khi báo lỗi. `-DskipTests` biên dịch nhưng không chạy test; `-Dmaven.test.skip=true` **bỏ cả biên dịch test**, nên module dùng `test-jar` sẽ hỏng.

**Sai lầm hay gặp:** Nhầm phase và goal; commit artifact SNAPSHOT vào bản release; chạy `install` ở CI mà không dọn `~/.m2`.

## 21. Build xanh, nhưng chạy lên thì `NoSuchMethodError` trong Guava dù bạn đã khai báo bản Guava mới. Maven chọn phiên bản nào khi cây dependency có nhiều phiên bản cùng artifact, và làm sao ép một phiên bản duy nhất, rồi đóng gói thành file chạy được?

**Gợi ý suy luận:**
- Thư viện phụ thuộc thư viện khác thì hình thành cấu trúc gì? Trên classpath mỗi class có thể có mấy phiên bản? Khái niệm nền: dependency tree bắc cầu.
- Khi có nhiều phiên bản, Maven chọn theo mới nhất hay theo gần gốc nhất? Khái niệm nền: nearest-wins.
- Lỗi do chọn nhầm phiên bản sẽ lộ lúc biên dịch hay lúc chạy? Cách ép một phiên bản cho cả cây là gì? Khái niệm nền: `dependencyManagement`, BOM.

**Lập luận:** Vì thư viện phụ thuộc thư viện khác tạo thành một cây, mà trên classpath mỗi class chỉ có một phiên bản, Maven phải chọn một bằng quy tắc cố định: gần gốc nhất thắng, không phải mới nhất thắng. Nên nếu một nhánh sâu cần bản mới hơn thì code biên dịch ổn nhưng lúc chạy gặp bản cũ hơn, và nổ `NoSuchMethodError`. Chữa bằng cách ép một phiên bản cho cả cây qua `dependencyManagement`/BOM, rồi kiểm tra bằng `dependency:tree`. Điểm dễ nhầm là nghĩ khai báo phiên bản mới ở cây trên là Maven dùng bản đó cho mọi nhánh: quy tắc "gần gốc nhất" chỉ áp dụng nếu bạn khai báo hoặc quản lý tường minh. Hãy dùng `dependencyManagement`/BOM để cố định phiên bản cho cả cây, chạy `mvn dependency:tree` để xem bản nào thực sự được chọn, và dùng `enforcer` để chặn xung đột phiên bản.

**Đáp án ngắn:** Scope: `compile`, `provided`, `runtime`, `test`, `import` (BOM). Nearest-wins (ngang cấp thì khai báo trước thắng). Cố định phiên bản bằng `dependencyManagement`/BOM.

**Nhớ:** Nearest-wins, không phải newest-wins; xung đột phiên bản lộ lúc chạy, nên ép phiên bản bằng BOM.

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng thuật toán nearest-wins cho cây: `app → libA → guava:31.0` và `app → libB → libC → guava:33.0`:

```text
Cay: app -> libA -> guava:31.0 ; app -> libB -> libC -> guava:33.0 (moi hon, sau hon)
Nearest-wins chon: {libA=1.0, libB=1.0, guava=31.0, libC=1.0}
=> guava 31.0 (gan goc hon), KHONG phai ban moi nhat 33.0; libC dung API chi co o 33.0 se NoSuchMethodError luc chay
```

`libC` được biên dịch với Guava 33.0 và gọi một method chỉ có ở 33.0; nhưng khi chạy classpath chỉ có Guava 31.0, nên nổ `NoSuchMethodError` **lúc chạy** dù mọi thứ biên dịch bình thường. Cách chữa, _minh họa, chưa chạy thử_:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>com.google.guava</groupId><artifactId>guava</artifactId>
      <version>33.0.0-jre</version>            <!-- ép MỘT phiên bản cho cả cây -->
    </dependency>
    <dependency>                                <!-- hoặc nhập BOM -->
      <groupId>org.springframework.boot</groupId><artifactId>spring-boot-dependencies</artifactId>
      <version>3.3.5</version><type>pom</type><scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

```bash
mvn dependency:tree -Dverbose          # tìm artifact xuất hiện nhiều phiên bản
```

**Hỏi xoáy 1:** Gặp `NoSuchMethodError` lúc chạy dù compile bình thường, nghi ngờ gì?
_Vì sao hỏi tiếp:_ đây là triệu chứng thực tế của nearest-wins; người phỏng vấn kiểm tra bạn có suy ngược từ triệu chứng về nguyên nhân và cách tìm không.

**Đáp:** Xung đột phiên bản bắc cầu (output trên). `mvn dependency:tree -Dverbose` tìm artifact trùng, cố định trong `dependencyManagement` hoặc `<exclusions>`; plugin enforcer (`dependencyConvergence`) phát hiện sớm.

**Hỏi xoáy 2:** Đóng gói một jar chạy được kèm mọi thư viện?
_Vì sao hỏi tiếp:_ sau khi cây dependency đã thống nhất phiên bản, bước cuối là gói cả cây vào một file; artifact thường không chứa dependency.

**Đáp:** `maven-shade-plugin` hoặc `maven-assembly-plugin` (`jar-with-dependencies`) gộp class vào một jar (cần xử lý trùng `META-INF/services`). Với Spring Boot dùng `spring-boot-maven-plugin` `repackage` tạo nested jar chạy được bằng `java -jar`. Xem [Maven và Gradle](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-27-build-tool-maven-gradle.md).

**Sai lầm hay gặp:** Ghi cứng version rải rác thay vì BOM/property; scope `compile` cho thư viện chỉ dùng khi test; dùng khoảng phiên bản (`[1.0,)`) làm build không tái lập được.

## 22. Dự án kéo cả Guava chỉ để dùng `Lists.newArrayList` và `StringUtils.isBlank`. Vì sao trước đây cần các thư viện này, còn bây giờ có nên bỏ không, và dependency thừa gây hại gì?

**Gợi ý suy luận:**
- Commons và Guava ra đời để lấp chỗ thiếu nào của JDK cũ? Khái niệm nền: lý do tồn tại của thư viện tiện ích.
- Khi JDK đã có sẵn chính những tiện ích đó thì dependency ngoài còn mang lại giá trị gì? Mỗi dependency thêm rủi ro gì? Khái niệm nền: xung đột phiên bản bắc cầu, bề mặt lỗ hổng.
- Thứ nào JDK vẫn chưa có (cache có eviction, `Multimap`)?

**Lập luận:** Vì Commons và Guava ra đời để lấp chỗ thiếu của JDK cũ, khi JDK bổ sung chính những tiện ích đó thì dependency ngoài không còn đáng giá, mà còn thêm bề mặt xung đột phiên bản và lỗ hổng bảo mật (mỗi dependency là một rủi ro bắc cầu, như câu 21). Nên ưu tiên JDK cho những việc nó đã làm được, và chỉ giữ thư viện ngoài cho thứ JDK chưa có. Điểm dễ nhầm là thêm cả thư viện chỉ để dùng một hàm nhỏ: mỗi dependency kéo theo cây phụ thuộc, nguy cơ xung đột phiên bản và lỗ hổng bảo mật. Quy tắc: kiểm tra JDK đã có tiện ích tương đương chưa (`List.of`, `String.isBlank`, `Objects.requireNonNull`), và chỉ giữ thư viện ngoài khi nó mang lại giá trị JDK chưa có (cache, collection đặc biệt).

**Đáp án ngắn (mức nhận biết):** Commons (Lang: `StringUtils`; IO: `IOUtils`, `FileUtils`) và Guava (`ImmutableList`, `Multimap`, `BiMap`, `Cache`, `Preconditions`, `Splitter/Joiner`). Nhiều thứ JDK đã có sẵn.

**Nhớ:** Dùng JDK nếu đã đủ; mỗi dependency thêm là một rủi ro xung đột và bảo mật.

| Việc cần làm | Cách trong JDK hiện đại |
|---|---|
| Danh sách/map bất biến | `List.of`, `Map.of`, `List.copyOf` (Java 9-10) |
| Sao chép `InputStream` sang `OutputStream` | `in.transferTo(out)` (Java 9) |
| Đọc/ghi cả file | `Files.readString`, `Files.writeString` (Java 11) |
| Kiểm tra null | `Objects.requireNonNull`, `Optional` |
| Chuỗi rỗng/khoảng trắng, lặp | `isBlank`, `strip`, `repeat` (Java 11) |
| Ngày giờ | `java.time` (thay Joda Time từ Java 8) |

**Ví dụ:** _Đã chạy thử trên JDK 11._ Chính kết quả ở **câu 5** minh họa lý do không thay `List.copyOf` bằng `unmodifiableList` khi cần bất biến thật (view đổi theo danh sách gốc: `[101, 102, 999]`), và `List.of("a", null)` ném `NullPointerException` (khác `ArrayList`, vốn cho null). Thay `StringUtils.isBlank` bằng JDK:

```java
String s = "   ";
System.out.println(s.isBlank());            // true (Java 11), không cần Commons
System.out.println("ab".repeat(3));         // ababab
```

**Hỏi xoáy 1:** Khi nào vẫn đáng dùng Guava hoặc Commons?
_Vì sao hỏi tiếp:_ sau khi nói "ưu tiên JDK", câu tự nhiên là ngoại lệ: phần nào thư viện ngoài vẫn đáng giá.

**Đáp:** Khi cần thứ JDK chưa có (`Multimap`, `Cache` có eviction, `RateLimiter`). Đừng thêm thư viện chỉ để dùng một hàm nhỏ.

**Hỏi xoáy 2:** Collection "bất biến" của Guava/`List.of` khác `Collections.unmodifiableList` ra sao?
_Vì sao hỏi tiếp:_ bảng thay thế liệt kê `List.of` thay `ImmutableList`; người phỏng vấn kiểm tra bạn có nhớ chỗ "thay thế" không hoàn toàn giống nhau, nối lại câu 5.

**Đáp:** `List.of`/`ImmutableList` thật sự bất biến (không cho `null`, ném lỗi khi sửa); `unmodifiableList` chỉ là **view** chặn ghi, danh sách gốc đổi thì view đổi theo (xem câu 5). Muốn bất biến thật thì sao chép (`List.copyOf`).

**Sai lầm hay gặp:** Kéo cả Guava chỉ để dùng `Lists.newArrayList`; phụ thuộc phiên bản Guava khác nhau giữa các thư viện (xem câu 21). Xem [JSON, HTTP, thư viện tiện ích](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md).

---

Nguồn: Java Programming Interviews Exposed (Markham), Chương 6, 8, 9, 10, 14, 16, 18, 19; bổ sung từ ghi chú trong docs. Mọi output đánh dấu _Đã chạy thử_ do chương trình Java thuần (hoặc Python cho SQLite) chạy trong môi trường soạn thảo trên JDK 11; ví dụ cần Spring/JUnit/Mockito/Maven không chạy được ở đó nên ghi _Minh họa, chưa chạy thử_.

