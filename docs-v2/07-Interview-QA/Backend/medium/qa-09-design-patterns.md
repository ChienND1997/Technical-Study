# Câu hỏi: Design Patterns

Kiến thức nền: [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md). Trang này thêm **góc nhìn phỏng vấn**: vì sao pattern tồn tại, ví dụ trước/sau, ví dụ trong JDK và Spring. Interviewer thích hỏi pattern vì định nghĩa rõ ràng và dễ đào sâu; cách ghi điểm là nêu **vấn đề** pattern giải quyết và **cái giá** của nó, không chỉ đọc tên.

Mỗi câu theo chuỗi suy luận: **Câu hỏi** (hỏi theo tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả từ vấn đề tới pattern), **Đáp án ngắn**, **Nhớ**, rồi **Ví dụ** (trước và sau, đa số đã chạy), **Hỏi xoáy** (mỗi câu kèm lý do vì sao là bước tiếp theo) và **Sai lầm hay gặp**. Các ví dụ gộp trong một file `Demo09.java` đã biên dịch và chạy trên JDK 11; output trong bài là output thật. Ví dụ dùng Spring được đánh dấu riêng là minh họa vì môi trường này không có Spring.

**Tóm tắt:**

- Phạm vi file: design pattern trong Java, mỗi pattern được dẫn ra từ một vấn đề thật của code chứ không học thuộc định nghĩa.
- Builder tách thu thập trường khỏi `build()` kiểm tra bất biến một lần; Strategy thay `if/else` theo loại bằng interface được tiêm vào, và thêm loại mới không sửa code cũ.
- Template Method giữ khung cố định (mở, làm, đóng tài nguyên) trong superclass; Decorator bọc object cùng interface để xếp chồng hành vi thay vì nổ subclass theo tổ hợp.
- Flyweight là cache các object bất biến, lý do `Integer.valueOf(100) == Integer.valueOf(100)` đúng còn 1000 thì thường sai.
- Lazy singleton ngây thơ lỗi vì check-then-act; cách đúng là enum, holder idiom, hoặc double-checked locking với `volatile`.
- Factory dời việc chọn class vào một chỗ, Observer đảo chiều phụ thuộc nhưng chạy đồng bộ mặc định, Proxy giữ cùng interface còn Adapter đổi interface.
- Hay bị hỏi xoáy nhất: vì sao `@Transactional` gọi nội bộ không có tác dụng (proxy), double-checked locking thiếu `volatile` hỏng thế nào, và khi nào không nên dùng pattern.

## 1. Một constructor có năm tham số `new Appt("Mimi","0901","",true,false)`, còn setter thì cho tạo object rồi gán dần. Cả hai đều có điểm yếu gì, và Builder giải quyết thế nào?

**Gợi ý suy luận:**
- Người đọc dòng `true, false` có biết mỗi tham số nghĩa là gì không? Thêm tham số tùy chọn thì constructor phải làm gì (overload)?
- Với setter, giữa lúc `new` và lúc gán xong, object ở trạng thái nào? Trường còn `final` được không?
- Nếu tách việc thu thập trường ra một object tạm, thì kiểm tra ràng buộc nên đặt ở đâu để chỉ làm một lần?

**Lập luận:** Có hai cách cổ điển để tạo object nhiều trường, và cả hai đều hỏng một tính chất. Constructor nhiều tham số thì **người đọc không biết tham số nào là gì** (`new Appt("Mimi","0901","",true,false)`: `true, false` là gì?), thêm tham số tùy chọn thì phải thêm overload ("telescoping"). Setter thì cho phép tạo object rồi gán dần, nên có một khoảng thời gian object **tồn tại ở trạng thái chưa hợp lệ** và không thể `final`/bất biến. Builder tách hai việc: *thu thập* các trường ở một object tạm, rồi `build()` **kiểm tra bất biến một lần** và tạo ra object cuối cùng luôn hợp lệ. Điểm dễ nhầm là nghĩ Builder chỉ để "viết cho đẹp": giá trị thật là `build()` kiểm tra bất biến một lần, nên object tạo ra không bao giờ ở trạng thái dở dang và có thể bất biến. Khi class chỉ có hai hoặc ba tham số rõ nghĩa thì constructor là đủ; khi có nhiều tham số tùy chọn, Builder (hoặc `record` kèm static factory) rõ hơn nhiều, và Lombok `@Builder` chỉ nên dùng nếu vẫn kiểm tra được trường bắt buộc.

**Đáp án ngắn:** Class phụ (thường là class lồng tĩnh) có method đặt từng trường trả về chính nó (fluent), cùng method `build()` kiểm tra trường bắt buộc rồi gọi constructor private.

**Nhớ:** Builder tách thu thập trường khỏi tạo object và kiểm tra bất biến một lần ở `build()`. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:**

```java
static final class Appointment {
    private final String petName, ownerPhone, note;
    private Appointment(Builder b) { petName = b.petName; ownerPhone = b.ownerPhone; note = b.note; }
    static Builder builder() { return new Builder(); }

    static final class Builder {
        private String petName, ownerPhone, note = "";       // note có mặc định
        Builder petName(String v)    { petName = v; return this; }
        Builder ownerPhone(String v) { ownerPhone = v; return this; }
        Builder note(String v)       { note = v; return this; }
        Appointment build() {
            if (petName == null || ownerPhone == null)
                throw new IllegalStateException("Thiếu trường bắt buộc");
            return new Appointment(this);
        }
    }
}
```

```text
Appointment[Mimi,0901,]
Appointment[Kiki,0901,tiem phong]            // thứ tự gọi tùy ý
thieu truong -> Thieu truong bat buoc        // build() chặn đối tượng chưa hợp lệ
```

So sánh trước và sau:

| | Constructor nhiều tham số | Setter | Builder |
|---|---|---|---|
| Đọc hiểu | `new Appt("Mimi","0901","",true,false)`: không biết `true,false` là gì | Rõ | Rõ: `.petName("Mimi").note("tiêm phòng")` |
| Trường `final` (bất biến) | Có | Không | Có |
| Trạng thái chưa hợp lệ | Không | Có (giữa các lần gán) | Không (`build()` chặn) |
| Trường tùy chọn | Nhiều overload | Tự nhiên | Tự nhiên, có giá trị mặc định |

Ví dụ trong JDK và Spring: `StringBuilder`, `HttpRequest.newBuilder()`, `UriComponentsBuilder`, `User.withUsername(...)` của Spring Security. Lombok `@Builder` sinh sẵn đoạn trên.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Khi nào không cần Builder?
**Vì sao là bước tiếp theo:** Sau khi Builder có vẻ luôn tốt hơn, hỏi tiếp để xem bạn biết giới hạn: khi nào nó chỉ thêm code thừa.
**Đáp:** Khi có ít trường (đến khoảng 3-4) và tất cả bắt buộc: một constructor hoặc một `record` là đủ, Builder chỉ thêm code. Builder đáng giá khi có nhiều trường tùy chọn hoặc cần kiểm tra ràng buộc giữa các trường.

**Hỏi xoáy 2:** Builder có thread-safe không, và kiểm tra bất biến đặt ở đâu?
**Vì sao là bước tiếp theo:** Builder có state thay đổi được, nên hỏi tiếp về thread-safe và vì sao kiểm tra đặt ở `build()` chứ không ở từng setter.
**Đáp:** Không: nó có state thay đổi được nên mỗi thread dùng builder riêng. Kiểm tra ràng buộc đặt ở `build()` chứ không ở từng setter vì ràng buộc thường liên quan **nhiều trường** (ví dụ "ngày kết thúc sau ngày bắt đầu") mà lúc gọi từng setter chưa đủ thông tin.

**Sai lầm hay gặp:** dùng cùng một builder để `build()` nhiều lần rồi sửa tiếp, nên các object chia sẻ danh sách con thay đổi được và ảnh hưởng nhau; hoặc quên kiểm tra trường bắt buộc, dẫn đến `NullPointerException` xa nơi gây lỗi.

## 2. Hàm tính phí có `if (type.equals("card")) ... else if (type.equals("bank")) ...`, mỗi lần thêm loại thanh toán phải sửa lại hàm. Strategy giải quyết thế nào và liên quan gì tới dependency injection?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Mỗi lần thêm loại mới mà phải sửa hàm cũ thì nguyên tắc Open/Closed nào bị phá? Hàm biết quá nhiều về điều gì?
- Nếu client chỉ biết một interface, thì ai quyết định loại cụ thể? Việc "đưa từ ngoài vào" gọi là gì?
- Interface chỉ có một method thì từ Java 8 có thể viết gọn bằng gì?

**Lập luận:** Khi hành vi thay đổi theo *loại* (phí thẻ khác phí chuyển khoản), cách tự nhiên là `if/else` hoặc `switch` theo loại. Cách này có hai cái giá: mỗi khi thêm loại mới phải **sửa lại hàm cũ** (vi phạm Open/Closed) và hàm biết quá nhiều (mọi loại ở một chỗ). Strategy đảo ngược sự phụ thuộc: client chỉ biết một **interface**, còn loại cụ thể do ai đó **đưa vào** từ ngoài. "Đưa vào từ ngoài" chính là dependency injection, nên DI container là cách tự nhiên để cắm Strategy. Điểm dễ nhầm là dùng Strategy khi chỉ có hai nhánh hầu như không bao giờ đổi: lúc đó `if` đơn giản hơn. Dấu hiệu nên dùng là mỗi lần thêm loại mới lại phải mở hàm cũ, hoặc muốn test từng cách tính riêng. Trong Spring, tiêm `Map<String, PaymentFee>` để chọn theo tên bean là cách gọn nhất, và thêm loại mới chỉ là thêm một class.

**Đáp án ngắn:** Encapsulation thuật toán sau một interface, client giữ tham chiếu tới interface đó. Từ Java 8 interface một method thường thành lambda.

**Nhớ:** Strategy encapsulation thuật toán sau interface và đưa vào từ ngoài (chính là DI). Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:**

Trước (mọi loại trong một hàm):

```java
static BigDecimal totalBad(String type, BigDecimal a) {
    if (type.equals("card"))      return a.add(a.multiply(new BigDecimal("0.02")));
    else if (type.equals("bank")) return a.add(BigDecimal.valueOf(5000));
    throw new IllegalArgumentException(type);   // thêm loại mới => sửa hàm này
}
```

Sau (Strategy):

```java
interface PaymentFee { BigDecimal fee(BigDecimal amount); }

static class Checkout {
    private final PaymentFee strategy;               // tiêm qua constructor
    Checkout(PaymentFee s) { this.strategy = s; }
    BigDecimal total(BigDecimal a) { return a.add(strategy.fee(a)); }
}

new Checkout(a -> a.multiply(new BigDecimal("0.02")));   // thẻ: 2%
new Checkout(a -> BigDecimal.valueOf(5000));             // chuyển khoản: phí cố định
```

```text
truoc: 102000.00 / 105000
sau card: 102000.00
sau bank: 105000
Comparator la Strategy: [a, bb, ccc]
doi strategy: [ccc, bb, a]
```

Hai cách ra cùng kết quả, nhưng ở bản sau thêm loại thứ ba (ví dụ ví điện tử) **không sửa** `Checkout`, chỉ thêm một lambda. Và test `Checkout` bằng một strategy giả (`a -> BigDecimal.ZERO`) mà không cần thẻ thật. `Comparator` truyền vào `sort` là Strategy quen thuộc nhất: cùng `List`, đổi `Comparator` là đổi thuật toán so sánh (dòng cuối đảo chiều bằng `.reversed()`).

_Đã chạy thử trên JDK 11._

Trong Spring (minh họa, chưa chạy thử trong môi trường này): nhiều bean cùng implement `PaymentFee`, chọn bằng `@Qualifier`, hoặc tiêm `Map<String, PaymentFee>` để chọn theo key (tên bean là key). `PasswordEncoder` là strategy băm mật khẩu.

**Hỏi xoáy 1:** Khác Template Method ở đâu?
**Vì sao là bước tiếp theo:** Template Method cũng cho thay đổi hành vi nên dễ bị nhầm, hỏi tiếp để phân biệt bằng composition và inheritance.
**Đáp:** Strategy dùng **composition**: truyền object vào, đổi được lúc chạy. Template Method dùng **kế thừa**: chọn subclass lúc biên dịch. Composition lỏng hơn, dễ test hơn nên thường được ưu tiên.

**Hỏi xoáy 2:** Strategy giúp thỏa nguyên tắc SOLID nào?
**Vì sao là bước tiếp theo:** Hỏi tiếp để nối pattern với nguyên tắc thiết kế mà nó thực thi.
**Đáp:** Open/Closed (mở rộng bằng cách thêm cài đặt, không sửa client) và Dependency Inversion (client phụ thuộc interface trừu tượng chứ không phải cài đặt cụ thể).

**Sai lầm hay gặp:** tạo interface cho thứ chỉ có một cài đặt và không bao giờ đổi, thêm tầng gián tiếp vô ích; hoặc để strategy giữ state chia sẻ khi bean là singleton dùng chung nhiều thread.

## 3. Ba nơi trong code đều mở tài nguyên, làm việc, đóng tài nguyên, và đã từng có nơi quên đóng khi có ngoại lệ. Template Method giải quyết việc này thế nào, và khác Strategy ở đâu?

**Gợi ý suy luận:**
- Phần khung nào giống nhau ở mọi nơi, phần nào khác? Nếu để từng nơi tự viết khung thì rủi ro gì?
- Nếu đặt khung ở superclass và subclass chỉ điền bước thay đổi, thì khung nên cho phép ghi đè không (`final`)? Vì sao?
- Kế thừa và composition khác nhau thế nào về thời điểm chọn và độ chặt ràng buộc?

**Lập luận:** Nhiều quy trình có **khung giống nhau, bước giữa khác nhau**: mở tài nguyên, làm việc, đóng tài nguyên (kể cả khi lỗi). Nếu để từng nơi tự viết khung, sớm muộn có nơi quên đóng tài nguyên khi có ngoại lệ. Template Method đặt phần khung (đã được kiểm chứng đúng) ở một chỗ duy nhất trong superclass và để subclass chỉ điền phần thay đổi. Khung là `final` để subclass không thể phá thứ tự. Điểm dễ nhầm là lạm dụng kế thừa để chia sẻ khung: Template Method gắn chặt subclass vào superclass nên khó đổi khung sau này. Với phần khung chỉ là mở và đóng tài nguyên thì `try-with-resources` hoặc một method nhận lambda (như `JdbcTemplate.execute`) đạt cùng mục đích mà không cần cây kế thừa. Hãy dùng Template Method khi nhiều bước cố định với vài điểm biến đổi thật sự.

**Đáp án ngắn:** Superclass định nghĩa method khung (`final`) gọi các bước; bước bắt buộc là `abstract`, bước tùy chọn có cài đặt mặc định (hook).

**Nhớ:** Template Method đặt khung đúng một lần ở superclass để subclass chỉ điền bước thay đổi. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:**

```java
static abstract class ReportJob {
    final List<String> log = new ArrayList<>();
    public final void run() { open(); try { process(); } finally { close(); } }
    protected abstract void process();                       // bước lớp con phải có
    protected void open()  { log.add("open"); }
    protected void close() { log.add("close"); }
}
```

```text
[open, process, close]
[open, process, close] (close van chay khi loi)
```

Lần chạy thứ hai, `process()` ném `RuntimeException` nhưng `close` vẫn chạy, vì khung đã bọc `try/finally`. Subclass chỉ viết nghiệp vụ, **không thể** quên đóng tài nguyên.

| | Template Method | Strategy |
|---|---|---|
| Cơ chế | Kế thừa | Composition |
| Đổi lúc nào | Lúc biên dịch (chọn subclass) | Lúc chạy |
| Ràng buộc | Chặt với superclass | Lỏng, dễ test |

_Đã chạy thử trên JDK 11._

Ví dụ JDK: `HttpServlet.service()` gọi `doGet`/`doPost`; `AbstractList`. Ví dụ Spring (minh họa): `JdbcTemplate`, `TransactionTemplate`, `RestTemplate` lo mở/đóng kết nối và xử lý lỗi; bạn chỉ truyền `RowMapper` hoặc callback (biến thể "template bằng callback" thay inheritance bằng truyền hàm).

**Hỏi xoáy 1:** Vì sao nên đánh dấu method khung là `final`?
**Vì sao là bước tiếp theo:** Khung phải bảo vệ được thứ tự bước, nên hỏi tiếp vì sao đánh dấu `final`.
**Đáp:** Cho phép ghi đè khung thì subclass có thể bỏ qua `finally` hoặc đổi thứ tự, làm mất toàn bộ lý do tồn tại của pattern.

**Hỏi xoáy 2:** Bẫy kinh điển khi gọi method ghi đè trong constructor superclass là gì?
**Vì sao là bước tiếp theo:** Template Method dựa trên inheritance, nên hỏi tiếp một bẫy kinh điển của inheritance: gọi method ghi đè trong constructor superclass.
**Đáp:** Constructor superclass chạy **trước** khi trường của subclass được khởi tạo. Nếu gọi method mà subclass ghi đè và dùng trường của nó, method thấy giá trị mặc định (`null`, `0`) thay vì giá trị bạn nghĩ đã gán.

**Sai lầm hay gặp:** lạm dụng inheritance để tái sử dụng code; superclass thay đổi làm vỡ hàng loạt subclass ("fragile base class"). Ưu tiên Strategy hoặc callback khi có thể.

## 4. Bạn muốn ghi file có đệm, có nén, có mã hóa, mỗi tổ hợp một subclass thì số class bùng nổ. Decorator giải bài toán này thế nào, và JDK dùng nó ở đâu?

**Gợi ý suy luận:**
- Kế thừa cần bao nhiêu subclass cho n hành vi kết hợp tùy ý? Có cách nào chọn tổ hợp lúc chạy?
- Nếu mỗi class bọc cùng interface với object bên trong và ủy quyền xuống nó, client có biết mình đang dùng bản đã bọc không?
- Buffer giữ dữ liệu trong memory thì điều gì xảy ra khi quên `flush`/`close` lớp ngoài cùng?

**Lập luận:** Muốn thêm hành vi (nén, đệm, mã hóa, ghi log) cho một object, kế thừa buộc bạn tạo một subclass cho **mỗi tổ hợp** (`GzipBufferedFileStream`, `EncryptedBufferedFileStream`, ...), số class nổ theo tổ hợp. Decorator thay vì inheritance dùng **bọc**: mỗi class bọc nhận một object *cùng interface*, làm thêm việc của mình rồi **ủy quyền** xuống object bên trong. Chọn tổ hợp bằng cách xếp chồng lúc chạy, và vì cùng interface nên client không biết mình đang dùng bản đã bọc. Điểm dễ nhầm là phân biệt Decorator với Proxy chỉ vì cùng cấu trúc bọc: Decorator thêm hành vi mà client chủ động xếp chồng, còn Proxy kiểm soát truy cập mà client không biết. Cái giá của Decorator là chuỗi bọc khó debug và thứ tự xếp chồng quan trọng (nén rồi mã hóa khác mã hóa rồi nén). Trong JDK, `BufferedInputStream(new GZIPInputStream(...))` là ví dụ quen thuộc.

**Đáp án ngắn:** Các class implement cùng interface, class bọc giữ tham chiếu tới object cùng interface và gọi nó.

**Nhớ:** Decorator thêm hành vi bằng cách bọc cùng interface và ủy quyền, tổ hợp chọn lúc chạy. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:** ghi 100 000 byte `'A'` bằng stream thường và stream bọc nén:

```java
OutputStream out = new GZIPOutputStream(          // nén
        new BufferedOutputStream(                  // đệm
                new FileOutputStream("data.bin"))); // ghi thật (không bọc gì)
```

```text
raw=100000 byte, gzip=133 byte
truoc flush: sink=0 byte
sau flush: sink=5 byte
giai nen doc lai duoc 100000 byte
doc sai lop -> ZipException: Not in GZIP format
unmodifiableList.add -> UnsupportedOperationException
nhung view van thay thay doi cua goc: [1, 2, 9]
```

Đọc kết quả:

- **Thêm hành vi không sửa class gốc:** cùng dữ liệu, bọc `GZIPOutputStream` cho 133 byte thay vì 100 000.
- **Cái giá của buffer:** `BufferedOutputStream` giữ dữ liệu trong memory. Ghi 5 byte rồi **chưa flush** thì đích còn `0` byte; sau `flush()` mới có `5` byte. Quên đóng lớp ngoài cùng là mất phần dữ liệu còn trong đệm (vì thế dùng try-with-resources để `close()` tự đẩy dữ liệu).
- **Thứ tự bọc quan trọng:** ghi bằng GZIP thì đọc phải bọc đúng class đối ứng. Đọc dữ liệu thô bằng `GZIPInputStream` cho `ZipException: Not in GZIP format`.
- `Collections.unmodifiableList` cũng là Decorator: chặn `add` nhưng là **view** (chỉ đọc) nên vẫn thấy thay đổi của danh sách gốc (`[1, 2, 9]`), khác với bản sao bất biến `List.copyOf`.

_Đã chạy thử trên JDK 11._

Trong Spring (minh họa): `HttpServletRequestWrapper` bọc request để thêm hành vi; `Filter` bọc thread xử lý.

**Hỏi xoáy 1:** Khác Proxy chỗ nào?
**Vì sao là bước tiếp theo:** Proxy cũng cùng interface và giữ tham chiếu, nên hỏi tiếp để phân biệt bằng ý định chứ không bằng cấu trúc.
**Đáp:** Cấu trúc gần giống (cùng interface, giữ tham chiếu), nhưng **mục đích** khác. Decorator thêm *chức năng* và client thường chủ động xếp chồng. Proxy *kiểm soát truy cập* tới object thật (lazy initialization, kiểm quyền, transaction) và thường tự quản lý lifecycle object thật.

**Hỏi xoáy 2:** Nhược điểm của Decorator?
**Vì sao là bước tiếp theo:** Sau khi thấy lợi ích, hỏi tiếp cái giá để đánh giá cân bằng.
**Đáp:** Nhiều class nhỏ giống nhau gây khó đọc stack trace; danh tính object đổi (`decorated != original`), nên so sánh bằng `==` hoặc `instanceof` có thể sai; thứ tự xếp chồng dễ nhầm.

**Sai lầm hay gặp:** quên đóng hoặc `flush` lớp ngoài cùng, mất dữ liệu trong buffer mà không có ngoại lệ nào báo.

## 5. Vì sao `Integer.valueOf(100) == Integer.valueOf(100)` là true còn với 1000 thì thường false, và Flyweight liên quan gì?

**Gợi ý suy luận:**
- Nếu chương trình cần hàng triệu object giống hệt nhau, tạo từng cái tốn gì (memory, GC)?
- Khi object bất biến, chia sẻ một bản cho mọi chỗ dùng có đổi nghĩa chương trình không?
- `Integer.valueOf` cache khoảng giá trị nào, và `==` so sánh gì (tham chiếu hay giá trị)?

**Lập luận:** Nếu chương trình cần hàng triệu object giống hệt nhau (số `5`, ký tự `'a'`), tạo từng cái là lãng phí memory và GC. Nếu object **bất biến**, chia sẻ một bản cho tất cả chỗ dùng là **không đổi nghĩa chương trình**, vì không ai sửa được nó để ảnh hưởng người khác. Flyweight chính là "cache các object bất biến theo giá trị". Điều kiện bất biến là bắt buộc: nếu object sửa được thì chia sẻ gây lỗi lan. Điểm dễ nhầm là so sánh `Integer` bằng `==` và gặp kết quả đúng với số nhỏ, sai với số lớn: đó là tác dụng phụ của Flyweight (cache `-128..127`), không phải bảo đảm của ngôn ngữ. Vì vậy luôn dùng `equals` cho object bọc ngoài, và khi tự cài pool chia sẻ thì chỉ chia sẻ object bất biến, nếu không một chỗ sửa sẽ ảnh hưởng mọi chỗ còn lại.

**Đáp án ngắn:** Giữ một pool các object bất biến và trả lại object có sẵn thay vì tạo mới. `Integer.valueOf` cache khoảng `-128..127`.

**Nhớ:** Flyweight là cache các object bất biến theo giá trị; `Integer.valueOf` cache `-128..127`. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:**

```java
Integer a1 = Integer.valueOf(127), a2 = Integer.valueOf(127);
Integer c1 = Integer.valueOf(128), c2 = Integer.valueOf(128);
Integer x = 100, y = 100, p = 1000, q = 1000;     // autoboxing gọi valueOf
```

```text
127==127: true  128==128: false  128.equals(128): true
autoboxing 100: true  1000: false
emptyList dung chung: true
```

`127 == 127` là `true` vì cả hai tham chiếu trỏ **cùng một object** trong cache; `128 == 128` là `false` vì ngoài vùng cache mỗi `valueOf` tạo object mới. Còn `equals` so sánh giá trị nên luôn đúng. Autoboxing (`Integer x = 100`) gọi `valueOf`, nên cũng dùng cache: `100 == 100` đúng nhưng `1000 == 1000` sai. `Collections.emptyList()` trả về **cùng một** danh sách rỗng cho mọi call: đây là biến thể Null Object, một danh sách rỗng bất biến dùng chung thay cho `null`.

Ví dụ khác: `String` pool và `String.intern()`, `Boolean.TRUE/FALSE`, `Enum`.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Vì sao `new Integer(5)` bị khuyến cáo bỏ?
**Vì sao là bước tiếp theo:** Câu hỏi về `Integer` dẫn tới hỏi vì sao constructor `new Integer(5)` bị bỏ, vì nó đi vòng qua cache.
**Đáp:** Nó **luôn** tạo object mới, bỏ qua cache nên tốn memory và làm `==` cho kết quả khó đoán; đã deprecated, hãy dùng `valueOf`. Vùng cache trên của `Integer` còn chỉnh được bằng tùy chọn JVM (`-XX:AutoBoxCacheMax`), nên đừng viết code phụ thuộc vào `==` giữa các `Integer`.

**Hỏi xoáy 2:** Vì sao Flyweight chỉ an toàn với object bất biến?
**Vì sao là bước tiếp theo:** Cuối cùng hỏi gốc của điều kiện: nếu object sửa được thì chia sẻ gây hậu quả gì.
**Đáp:** Nhiều nơi cùng giữ một tham chiếu. Nếu object có setter, một nơi sửa sẽ làm mọi nơi khác thấy giá trị đổi mà không hay biết.

**Sai lầm hay gặp:** so sánh `Integer` bằng `==` (đúng với số nhỏ, sai với số lớn, kiểu lỗi chỉ lộ ở dữ liệu thật); luôn dùng `equals`.

## 6. Lazy singleton kiểu `if (instance == null) instance = new X()` chạy với 50 thread thì tạo ra nhiều thể hiện. Vì sao, cài đặt đúng thế nào, và vì sao nhiều người coi Singleton là anti-pattern?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Việc kiểm tra `null` rồi tạo là một hay hai bước? Hai thread có thể xen vào giữa không (check-then-act)?
- JVM đảm bảo điều gì về việc khởi tạo class (class initialization)? Có tận dụng được để khỏi phải lock không?
- Nếu dùng double-checked locking thì thiếu từ khóa nào sẽ cho thread khác thấy object chưa khởi tạo xong?
- State toàn cục ảnh hưởng việc kiểm thử thế nào?

**Lập luận:** "chỉ một thể hiện" nghe đơn giản nhưng trong môi trường multithreading khó hơn vẻ ngoài. Bản lazy ngây thơ gồm hai bước tách rời: *kiểm tra* `instance == null` rồi *tạo*. Hai thread có thể cùng thấy `null` ở bước kiểm tra trước khi thread nào kịp gán (check-then-act, xem [Thread Safety](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-02-thread-safety.md)) và cùng tạo. Cách sửa tốt nhất tận dụng thứ JVM đã bảo đảm: khởi tạo class (class initialization) được JVM thực hiện **tuần tự và đúng một lần**, nên đặt thể hiện trong trường `static` của một class riêng (holder) là đủ. Điểm dễ nhầm là tin double-checked locking đúng mà quên `volatile`: không có nó, thread khác có thể thấy tham chiếu đã gán nhưng object chưa khởi tạo xong do thứ tự ghi bị sắp xếp lại. Khi review, ưu tiên enum hoặc holder idiom vì ngắn và an toàn; và trong ứng dụng Spring thì thường bỏ hẳn Singleton cài tay để container quản lý một instance mỗi bean.

**Đáp án ngắn:** Ba cách đúng: enum (ngắn nhất), holder idiom (lười, nhờ class loading), double-checked locking (bắt buộc `volatile`).

**Nhớ:** Cách đúng: enum, holder idiom, hoặc double-checked locking với `volatile`. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md) và [Thread Safety](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-02-thread-safety.md).

**Ví dụ:** thử 50 thread cùng gọi `get()` (constructor có `sleep(1ms)` để phóng đại cơ hội đua):

```java
// Sai: kiểm tra rồi tạo, hai bước tách rời
static NaiveSingleton get() { if (instance == null) instance = new NaiveSingleton(); return instance; }

// Đúng 1: holder, JVM bảo đảm lớp Holder chỉ khởi tạo một lần
private static final class Holder { static final HolderSingleton I = new HolderSingleton(); }
static HolderSingleton get() { return Holder.I; }

// Đúng 2: double-checked locking, BẮT BUỘC volatile
private static volatile DclSingleton instance;
static DclSingleton get() {
    DclSingleton c = instance;
    if (c == null) { synchronized (DclSingleton.class) { c = instance;
        if (c == null) instance = c = new DclSingleton(); } }
    return c;
}

// Đúng 3: enum
enum Registry { INSTANCE; }
```

```text
naive: constructor chay 16 lan, so doi tuong khac nhau = 16
holder: constructor chay 1 lan, so doi tuong khac nhau = 1
dcl: constructor chay 1 lan, so doi tuong khac nhau = 1
enum same: true
```

Bản ngây thơ tạo **16 object** trong lần chạy này (con số đổi theo mỗi lần chạy vì là race), tức không còn là singleton. Hai bản đúng chỉ chạy constructor một lần.

_Đã chạy thử trên JDK 11._

**Vì sao `volatile` bắt buộc ở double-checked locking:** `instance = new X()` thực chất là ba việc: cấp phát memory, chạy constructor, gán tham chiếu. Không có `volatile`, trình biên dịch/CPU được phép gán tham chiếu **trước** khi constructor xong. Thread khác thấy `instance != null` ở lần kiểm tra ngoài (không lock) rồi dùng một object **chưa khởi tạo xong**. `volatile` cấm sắp xếp lại này ([Java Memory Model](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-16-java-memory-model.md)).

**Vì sao nhiều người coi là anti-pattern:** singleton tĩnh là state toàn cục ẩn: khó test (không thay bằng bản giả được), che giấu phụ thuộc (hàm gọi `Config.get()` mà chữ ký không cho biết), và thành điểm nghẽn khi nhiều thread dùng chung. Cách hiện đại là để **IoC container quản lý**: bean Spring mặc định có scope `singleton`, tức một thể hiện *cho mỗi container* (không phải mỗi JVM), được tiêm vào nơi cần nên test thay được.

**Hỏi xoáy 1:** Singleton Spring có an toàn multithreading không?
**Vì sao là bước tiếp theo:** Spring cũng dùng "singleton", nên hỏi tiếp xem bạn có nhầm "một thể hiện" với "an toàn multithreading" không.
**Đáp:** Không tự động. Container chỉ bảo đảm tạo **một** thể hiện; sau đó mọi request dùng chung nó, nên bean phải **stateless hoặc thread-safe** (không giữ state thay đổi theo request trong field).

**Hỏi xoáy 2:** Cái gì có thể phá singleton cổ điển?
**Vì sao là bước tiếp theo:** Singleton cổ điển nghe là chắc chắn một thể hiện, nên hỏi tiếp những cách phá nó.
**Đáp:** Reflection (gọi constructor private), deserialization (tạo thể hiện mới nếu không có `readResolve`), nhiều ClassLoader (mỗi cái một bản). Enum được JVM xử lý riêng nên chống cả ba.

**Sai lầm hay gặp:** double-checked locking thiếu `volatile` (lỗi hiếm, chỉ lộ dưới tải, cực khó tái hiện); coi singleton Spring là thread-safe.

## 7. Code rải rác `new EmailNotifier()`, nay cần đổi sang kênh khác theo cấu hình thì phải sửa mọi nơi. Factory giúp thế nào, và static factory method hơn constructor ở điểm nào?

**Gợi ý suy luận:**
- `new ConcreteClass()` gắn nơi gọi vào class nào? Đổi class thì phải sửa bao nhiêu chỗ?
- Nếu việc "chọn class nào" dời vào một chỗ và client chỉ biết interface thì sao?
- Constructor có tên, có thể trả cache hoặc kiểu con không? Còn static factory method thì sao?

**Lập luận:** `new ConcreteClass()` **gắn chặt** nơi gọi vào một class cụ thể; muốn đổi class phải sửa mọi nơi có `new`. Factory dời việc "chọn class nào và khởi tạo thế nào" vào **một chỗ**, client chỉ cần interface. Static factory method còn hơn constructor ở chỗ có **tên** (`Integer.valueOf`, `List.of`), được phép trả về object cache (câu 5) hoặc kiểu con khác nhau tùy tham số, và không bắt buộc tạo mới. Điểm dễ nhầm là tạo một Factory cho mọi class, kể cả khi chỉ có một cài đặt và không bao giờ đổi, chỉ thêm class và gián tiếp. Dùng Factory khi lựa chọn class phụ thuộc cấu hình, tham số hoặc môi trường; còn với một cài đặt duy nhất, `new` trong DI configuration là đủ. Trong Spring, `@Bean` method và `@ConditionalOnProperty` chính là factory.

**Đáp án ngắn:** Một method (tĩnh hoặc của object factory) nhận tham số rồi trả về interface; class cụ thể bị giấu.

**Nhớ:** Factory giấu việc chọn class cụ thể sau một chỗ duy nhất. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:**

```java
interface Notifier { String send(String m); }

static Notifier notifier(String channel) {
    switch (channel) {
        case "email": return m -> "EMAIL:" + m;
        case "sms":   return m -> "SMS:" + m;
        default:      throw new IllegalArgumentException(channel);
    }
}
```

```text
EMAIL:hi | SMS:hi
fax -> IllegalArgumentException(fax)
List.of: ImmutableCollections$List12  Arrays.asList: Arrays$ArrayList
```

Dòng cuối cho thấy sức mạnh của static factory: gọi `List.of(1, 2)` bạn nhận một class nội bộ (`ImmutableCollections$List12`, tối ưu cho đúng 2 phần tử) mà **không biết và không cần biết** tên class; JDK có thể đổi cài đặt ở phiên bản sau mà code của bạn không đổi. Nơi gọi chỉ phụ thuộc interface `List`. Thêm kênh `push` thì chỉ sửa trong factory.

_Đã chạy thử trên JDK 11._

Ví dụ JDK: `List.of`, `Integer.valueOf`, `Executors.newFixedThreadPool`, `Calendar.getInstance`. Ví dụ Spring (minh họa): `ApplicationContext` là một factory khổng lồ; `@Bean` trong `@Configuration` chính là factory method; `FactoryBean<T>` cho cách tạo bean phức tạp.

**Hỏi xoáy 1:** Factory Method khác Abstract Factory thế nào?
**Vì sao là bước tiếp theo:** Tên "Factory" gom nhiều biến thể, nên hỏi tiếp để phân biệt tạo một sản phẩm với tạo cả họ sản phẩm.
**Đáp:** Factory Method tạo **một** sản phẩm. Abstract Factory tạo cả **họ** object liên quan nhất quán với nhau (ví dụ bộ widget cho một hệ giao diện: nút, ô nhập, hộp thoại cùng phong cách).

**Hỏi xoáy 2:** Thêm kênh mới có phải sửa `switch` không?
**Vì sao là bước tiếp theo:** Factory dùng `switch` vẫn phải sửa khi thêm loại mới, nên hỏi tiếp cách tránh.
**Đáp:** Có, và đó là giới hạn của factory dùng `switch`. Cách giảm: đăng ký kênh vào `Map<String, Supplier<Notifier>>` (hoặc để Spring tiêm `Map<String, Notifier>`) để thêm kênh mà không sửa factory.

**Sai lầm hay gặp:** factory cho mọi class dù chỉ có một cài đặt, thêm tầng vô nghĩa; hoặc để factory trả `null` thay vì ném ngoại lệ khi không nhận ra tham số, lỗi lộ ra xa nơi gây ra.

## 8. Đặt hàng xong cần gửi mail, trừ kho, ghi audit. Nếu `OrderService` tự gọi từng bên thì sao, và Observer giải quyết thế nào?

**Gợi ý suy luận:**
- `OrderService` phụ thuộc vào bao nhiêu bên nếu tự gọi tất cả? Thêm bên mới thì phải sửa ai?
- Nếu subject chỉ biết một danh sách listener qua interface chung thì thêm bên quan tâm cần làm gì?
- Mặc định listener chạy cùng thread với publisher: lỗi ở listener ảnh hưởng ai?

**Lập luận:** Khi một event xảy ra (đặt hàng xong) có nhiều bên cần biết (gửi mail, trừ kho, ghi audit). Nếu `OrderService` tự gọi từng bên thì nó **phụ thuộc vào tất cả** và mỗi bên mới phải sửa nó. Observer đảo chiều: subject chỉ biết "có một danh sách listener" và gọi họ qua interface chung. Thêm bên quan tâm = đăng ký thêm, không sửa subject. Cái giá: control flow trở nên **gián tiếp**, khó theo dõi ai làm gì, và mặc định listener chạy *đồng bộ* trong cùng thread với publisher. Điểm dễ nhầm là tưởng Observer tự bất đồng bộ: listener chạy đồng bộ cùng thread, nên một listener chậm hay ném exception làm chậm hoặc làm hỏng cả flow phát. Cái giá còn là khó theo dõi ai làm gì khi code đã tách rời. Khi dùng với Spring, phân biệt `@EventListener` (cùng transaction) và `@TransactionalEventListener` (sau commit), và nếu bên nhận quan trọng thì cần cơ chế bền vững như outbox thay vì event trong memory.

**Đáp án ngắn:** Subject giữ danh sách observer, có `subscribe` và `publish`; khi publish lặp qua danh sách gọi từng observer.

**Nhớ:** Observer cho subject chỉ biết danh sách listener, đổi lại control flow gián tiếp và mặc định đồng bộ. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:** cài đặt tối giản để thấy cơ chế (Spring `@EventListener` là phiên bản có container quản lý):

```java
interface Listener<E> { void on(E e); }

static class EventBus<E> {
    private final List<Listener<E>> ls = new CopyOnWriteArrayList<>();
    void subscribe(Listener<E> l) { ls.add(l); }
    void publish(E e) { for (Listener<E> l : ls) l.on(e); }   // đồng bộ, tuần tự
}

bus.subscribe(id -> logs.add("mail:" + id));
bus.subscribe(id -> logs.add("stock:" + id));
new OrderService(bus).place("A1");
```

```text
[mail:A1, stock:A1]
loi listener lan len publisher: listener loi
[mail:A1, stock:A1, mail:A2, stock:A2]  <- audit:A2 bi mat vi listener truoc nem loi
```

Phần thứ hai thêm một listener **ném lỗi** rồi một listener `audit`. Với đơn `A2`, listener lỗi làm `publish` dừng giữa chừng: lỗi lan **lên publisher** (nên `place()` thất bại dù đơn đã hợp lệ) và `audit:A2` **không bao giờ được gọi**. Đây chính là hành vi mặc định của `@EventListener` trong Spring: đồng bộ, cùng thread, cùng transaction.

_Đã chạy thử trên JDK 11._

Trong Spring (minh họa, chưa chạy thử trong môi trường này):

```java
@Service class OrderService {
    private final ApplicationEventPublisher events;
    OrderService(ApplicationEventPublisher e) { this.events = e; }
    void place(long id) { /* lưu đơn */ events.publishEvent(new OrderPlaced(id)); }
}
@Component class MailListener {
    @EventListener void on(OrderPlaced e) { /* gửi mail */ }
}
```

**Hỏi xoáy 1:** Làm sao để lỗi gửi mail không làm hỏng đơn hàng?
**Vì sao là bước tiếp theo:** Vì listener chạy sync trong cùng thread, hỏi tiếp làm sao lỗi của nó không làm hỏng đơn hàng.
**Đáp:** Hai hướng: chạy listener **async** (`@Async`) để lỗi không lan lên publisher, hoặc dùng `@TransactionalEventListener(phase = AFTER_COMMIT)` để chỉ chạy sau khi đơn đã commit (mail lỗi cũng không rollback đơn). Với yêu cầu độ tin cậy cao dùng message broker (Kafka): Observer ở tầng hệ thống, kèm retry và lưu bền.

**Hỏi xoáy 2:** Rủi ro memory leak là gì?
**Vì sao là bước tiếp theo:** Subject giữ tham chiếu tới listener, nên hỏi tiếp về lifecycle và memory.
**Đáp:** Subject giữ tham chiếu mạnh tới mọi listener. Nếu listener là object có lifecycle ngắn mà quên hủy đăng ký, nó không bao giờ được GC. `java.util.Observable` cũ bị deprecated từ Java 9 vì thiết kế yếu.

**Sai lầm hay gặp:** coi listener là "chuyện của bên kia" nên quên rằng nó chạy trong cùng transaction và thread; lỗi hoặc chậm ở listener kéo cả request.

## 9. Cả Proxy và Adapter đều "đứng giữa" hai bên. Khi nào bạn gọi là Proxy, khi nào là Adapter, và vì sao `@Transactional` gọi từ method khác trong cùng bean lại không có tác dụng?

**Gợi ý suy luận:**
- Object đứng giữa giữ cùng interface với object thật hay đổi sang interface khác?
- Mục đích là kiểm soát truy cập (quyền, transaction, log, lazy) hay phiên dịch giữa hai thành phần không khớp?
- Proxy động của JDK và CGLIB tạo proxy bằng cách nào (interface hay sinh subclass)?

**Lập luận:** Cả hai đều "đứng giữa" nhưng giải hai vấn đề khác. **Proxy** giữ *cùng interface* với object thật và đứng chặn để làm việc phụ (kiểm quyền, transaction, ghi log, cache, lazy initialization): client không biết mình đang nói với proxy. **Adapter** *đổi interface* này sang interface khác để hai thành phần vốn không khớp nhau làm việc được: nó không thêm hành vi mà phiên dịch. Điểm dễ nhầm là nghĩ proxy của Spring "thay đổi" object: nó bọc object thật, nên `this` bên trong bean vẫn là object gốc. Vì vậy `@Transactional` gọi từ method khác trong cùng bean không đi qua proxy và không có transaction hay advice nào chạy. Cách chữa là tách method sang bean khác, còn Adapter thì xuất hiện khi ghép thư viện có interface khác với interface của hệ thống bạn.

**Đáp án ngắn:** Proxy = cùng interface, kiểm soát truy cập. Adapter = khác interface, dịch giữa hai bên.

**Nhớ:** Proxy cùng interface và kiểm soát truy cập, Adapter đổi interface để phiên dịch. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ Proxy:** bọc `RealService` bằng proxy động của JDK, ghi lại các call đi qua:

```java
interface Service { String hello(String n); String twice(String n); }
class RealService implements Service {
    public String hello(String n) { return "hello " + n; }
    public String twice(String n) { return hello(n) + "," + hello(n); } // gọi nội bộ
}

Service proxy = (Service) Proxy.newProxyInstance(loader, new Class<?>[]{Service.class},
    (p, method, args) -> { calls.add(method.getName()); return method.invoke(real, args); });

proxy.hello("An");
proxy.twice("An");
```

```text
hello An
hello An,hello An
proxy thay cac loi goi: [hello, twice]  (hello ben trong twice KHONG qua proxy)
```

Điểm mấu chốt: proxy ghi nhận `hello` và `twice` (hai call từ **bên ngoài**), nhưng hai lần `hello` bên trong `twice` **không đi qua proxy**: chúng là `this.hello(...)` gọi thẳng object thật. Đây chính là **self-invocation**: trong Spring, `@Transactional`/`@Cacheable`/`@Async` là proxy bọc bean, nên gọi method có annotation từ *trong cùng bean* sẽ **bỏ qua** logic của proxy (không mở transaction, không cache). Cách xử lý: tách sang bean khác, hoặc tiêm chính bean (qua proxy) để gọi.

**Ví dụ Adapter:** `InputStreamReader` biến `InputStream` (byte) thành `Reader` (ký tự):

```java
Reader r = new InputStreamReader(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8);
```

```text
Adapter InputStream->Reader: xin chao
```

`Arrays.asList(...)` cũng là Adapter: biến mảng thành `List` (giao diện danh sách bao mảng gốc).

_Đã chạy thử trên JDK 11._

Trong Spring (minh họa): AOP tạo proxy cho `@Transactional`, `@Async`, `@Cacheable`, `@PreAuthorize`; dùng JDK dynamic proxy khi bean có interface, CGLIB (sinh subclass) khi không. Hibernate dùng proxy cho lazy loading. `HandlerAdapter` trong Spring MVC là Adapter. Xem [AOP và Proxy](/go?p=01-Spring-Boot%2Fmedium%2Flt-13-aop-proxy.md).

**Hỏi xoáy 1:** Vì sao proxy CGLIB không bọc được class hoặc method `final`?
**Vì sao là bước tiếp theo:** Proxy CGLIB tạo bằng cách sinh subclass, nên hỏi tiếp giới hạn của kỹ thuật đó với `final`.
**Đáp:** CGLIB tạo proxy bằng cách **sinh subclass** ghi đè method để chèn logic. Không thể kế thừa class `final` hay ghi đè method `final`, nên với chúng proxy không can thiệp được (annotation bị bỏ qua hoặc báo lỗi tùy trường hợp).

**Hỏi xoáy 2:** Khác Decorator ở đâu?
**Vì sao là bước tiếp theo:** Cấu trúc proxy giống Decorator, nên hỏi tiếp để phân biệt bằng ý định.
**Đáp:** Về cấu trúc gần giống, về ý định khác: Decorator thêm *chức năng* và client chủ động xếp chồng; Proxy *kiểm soát truy cập* và client thường không biết nó có mặt.

**Sai lầm hay gặp:** gọi method `@Transactional` từ method khác trong cùng bean và tin rằng có transaction; hậu quả là dữ liệu không rollback khi lỗi.

## 10. Học xong nhiều pattern, bạn thấy chỗ nào cũng muốn dùng. Làm sao quyết định có nên dùng pattern không, và chọn cái nào?

**Gợi ý suy luận:**
- Pattern là tên gọi của lời giải cho vấn đề nào? Dùng khi chưa gặp vấn đề thì trả chi phí gì mà chưa nhận lợi ích gì?
- Lambda, `record` hay composition đơn giản có đủ cho bài toán không?
- Ngôn ngữ đã hấp thụ những pattern nào (Iterator, Strategy, Visitor)?

**Lập luận:** Pattern là **tên gọi cho lời giải đã được kiểm chứng của một vấn đề lặp lại**, không phải mục tiêu. Mỗi pattern đổi sự đơn giản trực tiếp lấy sự linh hoạt: thêm class, thêm gián tiếp. Chỉ đáng đổi khi bạn thật sự gặp vấn đề mà nó giải (khó thêm biến thể, khó test, trùng lặp). Dùng sớm là trả chi phí mà chưa nhận lợi ích. Điểm dễ nhầm là học thuộc 23 pattern rồi tìm chỗ áp dụng, thay vì nhận ra vấn đề trước. Câu hỏi hữu ích khi review: "yêu cầu nào đang đổi, và chỗ đổi đó đã có điểm mở rộng chưa?". Nếu chưa có vấn đề thật, giữ code đơn giản, và nhớ ngôn ngữ hiện đại đã hấp thụ nhiều pattern (lambda cho Strategy, `record` cho value object, pattern matching cho Visitor).

**Đáp án ngắn:** Bắt đầu từ **vấn đề**, rồi hỏi liệu lambda, `record` hoặc composition đơn giản có đủ không. Một số pattern đã được ngôn ngữ hấp thụ: Iterator tự viết thay bằng `for-each` và stream; Strategy thành lambda; Visitor thành pattern matching trên `sealed` (Java 17+).

**Nhớ:** Bắt đầu từ vấn đề, mỗi pattern đổi sự đơn giản lấy sự linh hoạt. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Ví dụ:** cùng bài toán chọn thuật toán, bốn mức độ phức tạp tăng dần:

| Mức | Cách | Khi nào hợp |
|---|---|---|
| 1 | `if/else` | Hai biến thể, ít đổi |
| 2 | `Map<String, Function<...>>` hoặc lambda | Vài biến thể, thêm sửa thường xuyên |
| 3 | Strategy (interface + class riêng) | Mỗi biến thể có logic riêng phức tạp, cần test riêng |
| 4 | Strategy + Factory + DI container | Biến thể thay đổi theo cấu hình, nhiều đội cùng thêm |

Trong câu 2, bước từ mức 1 lên mức 3 chỉ xứng đáng vì thêm loại phí mới là việc xảy ra thường xuyên. Nếu chỉ có hai loại phí cố định, mức 1 là lựa chọn đúng.

**Hỏi xoáy 1:** Cho một ví dụ bạn không dùng pattern dù có thể?
**Vì sao là bước tiếp theo:** Phỏng vấn thường muốn nghe quyết định không dùng pattern, nên hỏi tiếp để bạn nêu một ví dụ cụ thể.
**Đáp:** Nên có sẵn một câu chuyện: ví dụ "chỉ có hai biến thể và không ai nói sẽ thêm; tôi để `if/else` có comment thay vì dựng Strategy, và sẽ refactor khi biến thể thứ ba xuất hiện". Nêu được *khi nào không dùng* và *khi nào refactor* là điểm cộng lớn.

**Hỏi xoáy 2:** Một tình huống có thể chọn nhiều pattern: biện luận thế nào?
**Vì sao là bước tiếp theo:** Khi nhiều pattern cùng khả thi, hỏi tiếp để kiểm tra khả năng biện luận bằng tiêu chí.
**Đáp:** Chọn thuật toán có thể là Strategy hoặc Template Method. Nêu tiêu chí: cần đổi lúc chạy (Strategy), khung cố định nhiều bước dùng chung (Template), muốn tránh kế thừa (Strategy), và nêu ví dụ bạn đã từng làm.

**Sai lầm hay gặp:** học thuộc 23 pattern GoF rồi áp dụng khắp nơi ("pattern-itis"); hoặc bị hỏi "pattern nào bạn hay dùng" mà chỉ kể tên, không nêu được vấn đề nó giải hay cái giá.

## Bảng tổng hợp

| Pattern | Vấn đề giải quyết | Cái giá | Ví dụ JDK | Ví dụ Spring |
|---|---|---|---|---|
| Builder | Nhiều tham số, object hợp lệ và bất biến | Thêm class phụ | `StringBuilder`, `HttpRequest.newBuilder()` | `UriComponentsBuilder`, `User.withUsername` |
| Strategy | Hoán đổi thuật toán lúc chạy | Thêm interface | `Comparator` | `PasswordEncoder`, bean cùng interface |
| Template Method | Khung cố định, bước thay đổi | Kế thừa chặt | `HttpServlet`, `AbstractList` | `JdbcTemplate`, `TransactionTemplate` |
| Decorator | Thêm hành vi bằng cách bọc | Nhiều class nhỏ, thứ tự dễ nhầm | `BufferedOutputStream`, `Collections.unmodifiableList` | `HttpServletRequestWrapper`, Filter |
| Flyweight, Null Object | Chia sẻ object bất biến | Bắt buộc bất biến | `Integer.valueOf`, `Collections.emptyList` | `Optional.empty()` |
| Singleton | Một thể hiện duy nhất | State toàn cục, khó test | `Runtime.getRuntime()`, enum | Bean scope `singleton` |
| Factory | Ẩn việc chọn class cụ thể | Thêm gián tiếp | `List.of`, `Executors.*` | `BeanFactory`, `FactoryBean`, `@Bean` |
| Observer | Thông báo cho nhiều bên | Control flow gián tiếp | `PropertyChangeListener` | `ApplicationEvent`, `@EventListener` |
| Proxy | Kiểm soát truy cập object | Self-invocation bỏ qua proxy | `java.lang.reflect.Proxy` | AOP: `@Transactional`, `@Async` |
| Adapter | Đổi interface | Thêm tầng dịch | `InputStreamReader`, `Arrays.asList` | `HandlerAdapter` trong MVC |

Nguồn: Java Programming Interviews Exposed (Markham), Chương 6.

