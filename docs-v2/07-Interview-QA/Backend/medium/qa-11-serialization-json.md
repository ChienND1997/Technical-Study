# Câu hỏi: Serialization, XML và JSON

Kiến thức gốc: [JSON, HTTP client và thư viện tiện ích](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md), [I/O và NIO](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-10-io-nio.md), [OWASP Top 10](/go?p=03-Network-Security%2Fmedium%2Flt-04-owasp-web-security.md).

Mỗi câu đi theo chuỗi suy luận: **Câu hỏi** (tình huống hoặc hiện tượng), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả tới đáp án), **Đáp án ngắn** (nói thành tiếng được), **Nhớ** (kiến thức cốt lõi), rồi **Ví dụ**, **Hỏi xoáy** (kèm lý do vì sao là bước tiếp theo) và **Sai lầm hay gặp**.

**Về cách kiểm chứng:** môi trường chạy thử có JDK 11, không có Jackson, Gson, JAXB hay mạng để tải thư viện. Hai loại ví dụ, được đánh dấu rõ:

- **Đã chạy thật:** Java serialization, `ObjectInputFilter`, DOM/SAX/StAX (đều nằm trong JDK). Riêng ví dụ `serialVersionUID` được chạy bằng cách biên dịch hai phiên bản của cùng một class. Output là output thật (`Demo11.java`, `Demo11b.java`, JDK 11).
- **Minh họa:** code Jackson, JAXB, `record` (Java 16+). Cú pháp theo tài liệu của thư viện; chưa chạy thử trong môi trường này.

**Tóm tắt:**

- Phạm vi file: serialization, XML và JSON, tập trung vào chuyện chọn định dạng và các bẫy bảo mật hoặc tương thích.
- Serialization làm phẳng đồ thị object thành byte; Java serialization mang cả mô tả class nên nặng và gắn chặt tên class, còn JSON chỉ mang dữ liệu.
- `transient` bỏ trường khỏi stream nên đọc lại là giá trị mặc định; `serialVersionUID` không khai báo thì mọi thay đổi class đều làm vỡ dữ liệu cũ.
- Deserialization bỏ qua constructor nên kiểm tra bất biến phải đặt lại trong `readObject`; `readObject()` trên dữ liệu ngoài cho kẻ tấn công quyền chọn class chạy.
- XML + XSD cho contract chặt, JAXB bị gỡ khỏi JDK từ Java 11; DOM tốn memory theo kích thước file còn SAX và StAX đọc theo stream.
- JSON gọn nhưng số không phân biệt nguyên và thực nên id lớn dễ bị làm tròn; Jackson khớp theo tên nên đổi tên field là đổi API, `record` đọc được không cần `@JsonCreator`.
- Hay bị hỏi xoáy nhất: vì sao tránh Java serialization trong hệ thống mới, thêm một method mà đọc dữ liệu cũ lỗi, và chọn JSON hay Protobuf cho dịch vụ nội bộ.

## 1. Serialization là gì? Java cung cấp gì sẵn?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Một object `User` trong memory trỏ tới nhiều object khác, nhưng file và socket chỉ nhận dãy byte. Làm sao ghi object đó ra và dựng lại đúng cấu trúc, và vì sao dữ liệu Java ghi ra lại "nặng" hơn JSON?

**Gợi ý suy luận:**
- Memory chương trình có dạng gì (đồ thị object, có thể có vòng), còn đĩa và mạng có dạng gì (dãy byte tuyến tính)?
- Muốn dựng lại thì ngoài giá trị trường còn phải ghi thêm gì (tên class, kiểu trường)?
- Hai quyết định luôn đi cùng: truyền bằng cách nào (stream) và biểu diễn thành định dạng gì?

**Lập luận:** Memory là đồ thị object còn đĩa và mạng chỉ nhận dãy byte, nên serialization là bài toán làm phẳng đồ thị thành byte sao cho dựng lại được cấu trúc cũ. Muốn dựng lại, stream phải mang cả mô tả class (tên class, tên và kiểu từng trường, `serialVersionUID`) chứ không chỉ dữ liệu, nên định dạng Java vừa gắn chặt tên class vừa cồng kềnh. JSON chỉ cần dữ liệu vì hai bên đã biết cấu trúc nhờ DTO, nên nhỏ hơn nhiều. Điểm dễ nhầm là coi serialization chỉ là "lưu object ra file": cùng cơ chế đó là nền của cache phân tán, session chia sẻ, message queue và RPC, nên định dạng chọn ở đây quyết định khả năng tiến hóa và bảo mật của cả hệ thống. Khi thiết kế, dữ liệu rời khỏi JVM nên có định dạng độc lập ngôn ngữ và có kiểm soát phiên bản (JSON, Protobuf), thay vì mặc định `Serializable`.

**Đáp án ngắn:** JDK có sẵn `ObjectOutputStream`/`ObjectInputStream` (dùng mẫu Decorator bọc quanh một stream thật) và marker interface `Serializable`. Đọc phải theo đúng thứ tự đã ghi, và JVM đọc phải có class tương ứng trên classpath.

**Nhớ:** serialization là làm phẳng đồ thị object thành byte, kèm mô tả class. Xem [I/O và NIO](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-10-io-nio.md).

**Ví dụ (đã chạy thật):** class `User` có tên, mật khẩu, tuổi; ghi ra byte rồi xem nội dung:

```java
static byte[] ser(Object o) throws Exception {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    try (ObjectOutputStream s = new ObjectOutputStream(b)) { s.writeObject(o); }
    return b.toByteArray();
}
```

```text
header: AC ED 00 05  (AC ED = magic, 00 05 = version)
tong 75 byte; co chua ten lop 'Demo11$User': true
JSON tuong duong: 22 byte -> {"name":"An","age":30}
```

Giải thích từng phần: `AC ED 00 05` là chữ ký mở đầu mọi stream serialization của Java (magic number và phiên bản giao thức). 75 byte cho ba trường vì stream chứa **cả mô tả class** (tên class đầy đủ `Demo11$User`, tên và kiểu từng trường, `serialVersionUID`) chứ không chỉ dữ liệu. JSON cùng thông tin (trừ mật khẩu) chỉ 22 byte vì mỗi bên đã biết cấu trúc nhờ DTO. Điều đó giải thích hai đặc tính: định dạng Java **gắn chặt với tên class** (đổi tên class là vỡ) và **cồng kềnh**.

_Đã chạy thử trên JDK 11._

Bản dùng `record` (Java 16+, minh họa; chưa chạy thử vì môi trường chỉ có JDK 11):

```java
public record Point(int x, int y) implements Serializable { }
```

**Hỏi xoáy 1:** Tham chiếu chung giữa nhiều object thì sao?
*Vì sao là bước tiếp theo:* Vì ghi cả đồ thị chứ không phải cây, ta hỏi cái được ghi chia sẻ giữa hai object sẽ trở thành một hay hai bản khi đọc lại.
**Đáp:** Serialization lưu cả đồ thị và **giữ nguyên chia sẻ**: nếu hai object cùng trỏ tới một `Address`, sau khi đọc lại chúng vẫn trỏ tới **một** `Address` (không bị nhân đôi), kể cả vòng tham chiếu. Điều này JSON thông thường không làm được (sao chép thành hai bản hoặc lặp vô hạn).

**Hỏi xoáy 2:** Vì sao đọc sai thứ tự hoặc sai kiểu thì lỗi?
*Vì sao là bước tiếp theo:* Câu trả lời nhắc stream là dãy byte tuần tự, nên ta hỏi điều gì xảy ra khi phía đọc hiểu sai trình tự.
**Đáp:** Thread là dãy byte tuần tự không có tên trường ngoài mô tả class; `readInt` mà dữ liệu kế tiếp là object sẽ đọc sai byte (ném `StreamCorruptedException`, `OptionalDataException` hoặc `ClassCastException`).

**Sai lầm hay gặp:** tưởng `static` được serialize (không: thuộc class, không thuộc object); dùng serialization làm định dạng lưu trữ lâu dài (xem câu 3 và 5).

## 2. `transient` dùng để làm gì?

**Câu hỏi:** Sau khi đọc lại một object `User` từ byte, trường `password` là `null`, dù lúc ghi nó có giá trị. Vì sao điều này là chủ ý, và bạn cần lưu ý gì sau khi đọc?

**Gợi ý suy luận:**
- Serialization mặc định ghi những trường nào? Có trường nào không nên hoặc không thể ghi (nhạy cảm, gắn với JVM hiện tại, cache)?
- Khi JVM dựng lại object mà không có dữ liệu cho một trường, trường đó nhận giá trị gì (mặc định của kiểu)?
- Code giả định trường không `null` sẽ gặp gì sau khi đọc?

**Lập luận:** Serialization mặc định ghi mọi trường không `static`, nhưng có trường không nên hoặc không thể ghi: mật khẩu, thread, kết nối, cache tính lại được. `transient` đánh dấu "bỏ qua trường này", nên byte không chứa nó. Khi đọc lại, JVM dựng object mà không có giá trị cho trường đó nên nó nhận giá trị mặc định (`null`, `0`, `false`). Hệ quả: logic giả định `password != null` sẽ gặp `NullPointerException`, và trường `transient final` không có cách gán lại. Điểm dễ nhầm là nghĩ `transient` an toàn như một cách "ẩn" dữ liệu nhạy cảm khỏi mọi nơi: nó chỉ áp dụng cho Java serialization, còn Jackson dùng `@JsonIgnore` hoặc `@JsonProperty(access = WRITE_ONLY)` cho mật khẩu. Sau khi đọc lại, phải khôi phục hoặc tính lại trường `transient` (hoặc chấp nhận `null`) thay vì giả định nó có giá trị.

**Đáp án ngắn:** Trường `transient` không vào stream; khôi phục bằng tính lại lười (lazy) hoặc trong `readObject`.

**Nhớ:** `transient` là không ghi, đọc lại ra giá trị mặc định.

**Ví dụ (đã chạy thật):** `User` có `transient String password`. Sau vòng ghi và đọc:

```text
 name=An age=30 password=null  (transient -> null)
```

Mật khẩu `s3cret` không nằm trong 75 byte đã ghi, nên dù ai lấy được byte stream cũng không đọc được nó, và sau khi đọc lại trường là `null`. Cẩn thận: nếu logic của bạn giả định `password != null` thì sẽ gặp `NullPointerException` sau khi deserialize. Trường `transient final` không có cách gán lại sau khi đọc (vì `final`), nên cần cân nhắc khi thiết kế class.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Khôi phục trường `transient` thế nào?
*Vì sao là bước tiếp theo:* Vì sau khi đọc trường bị mặc định, bước tiếp theo là làm sao dựng lại giá trị cần thiết.
**Đáp:** Hoặc tính lại lười ở getter (ví dụ `fullName` suy ra từ `firstName` và `lastName`), hoặc đặt trong `private void readObject(ObjectInputStream)` sau `defaultReadObject()`.

**Hỏi xoáy 2:** `transient` có thay thế mã hóa không?
*Vì sao là bước tiếp theo:* Vì ta dùng `transient` để giấu mật khẩu, ta kiểm tra ranh giới của sự bảo vệ đó.
**Đáp:** Không. `transient` chỉ *không ghi* trường; còn dữ liệu nhạy cảm bạn **có** ghi thì phải mã hóa riêng.

**Sai lầm hay gặp:** quên `transient` cho trường nhạy cảm và để mật khẩu nằm trong dữ liệu session/cache đã serialize.

## 3. `serialVersionUID` là gì? Khi không khai báo thì sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn thêm đúng một method vào class rồi triển khai bản mới, và dữ liệu cache cũ đọc ra `InvalidClassException`. Vì sao thêm một method mà lại làm vỡ dữ liệu, và khai báo gì để tránh?

**Gợi ý suy luận:**
- Dữ liệu serialize sống lâu hơn code (đĩa, cache, JVM khác phiên bản), vậy khi đọc cần kiểm tra điều gì?
- Nếu không khai báo con số phiên bản, JVM lấy nó từ đâu (băm cấu trúc class)?
- Nếu số đó được cố định tay, thêm trường mới thì trường vắng trong dữ liệu cũ nhận gì?

**Lập luận:** Dữ liệu serialize sống lâu hơn code, nên khi đọc JVM phải kiểm tra class hiện tại còn tương thích với class đã ghi không; `serialVersionUID` là con số phiên bản để trả lời. Nếu không khai báo, JVM tự suy ra bằng hàm băm từ cấu trúc class (tên, trường, method), nên mọi thay đổi, kể cả thêm một method, đổi con số và làm vỡ dữ liệu cũ. Khi khai báo tường minh và giữ nguyên, thêm trường mới vẫn đọc được vì trường vắng nhận giá trị mặc định. Điểm dễ nhầm là không khai báo UID rồi thấy mọi thứ chạy tốt, cho tới lúc deploy bản mới khi cache cũ đọc lỗi hàng loạt (và UID tự sinh còn khác nhau giữa các trình biên dịch). Khi review, class `Serializable` nào cũng phải có UID tường minh, và có chủ ý khi tăng nó: tăng nghĩa là cắt đứt dữ liệu cũ, nên cần kế hoạch di chuyển hoặc xóa cache.

**Đáp án ngắn:** Khai báo tường minh `private static final long serialVersionUID = 1L;` và chỉ tăng khi cố ý phá tương thích. Thêm trường mới vẫn tương thích nếu giữ nguyên UID (trường cũ vắng mặt nhận giá trị mặc định).

**Nhớ:** UID tự tính đổi theo mọi thay đổi class; khai báo tay để kiểm soát tương thích.

**Ví dụ (đã chạy thật bằng cách biên dịch hai phiên bản của cùng class):**

Trường hợp 1: **không** khai báo UID. Phiên bản 1 ghi dữ liệu, phiên bản 2 chỉ thêm `public void newMethod() {}`:

```text
UID tu tinh v1 = 5001596042903876600
UID tu tinh v2 = -513400637982391127
InvalidClassException: Acc2; local class incompatible: stream classdesc serialVersionUID = 5001596042903876600, local class serialVersionUID = -513400637982391127
```

Chỉ thêm một method (không đụng dữ liệu) mà UID tự tính đổi hoàn toàn, nên **không đọc được dữ liệu cũ**.

Trường hợp 2: **có** khai báo `serialVersionUID = 1L`. Phiên bản 1 ghi `owner` và `balance`, phiên bản 2 thêm trường `note` rồi đọc dữ liệu cũ:

```text
owner=An balance=100 note=null
```

Đọc được; trường mới `note` không có trong dữ liệu cũ nên nhận mặc định `null`. Đây là **tiến hóa tương thích**: thêm trường an toàn khi giữ UID.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Việc gì **không** tương thích dù giữ nguyên UID?
*Vì sao là bước tiếp theo:* Từ việc "thêm trường thì an toàn", ta hỏi ngược lại: thay đổi nào vẫn vỡ.
**Đáp:** Đổi kiểu của trường đã có, đổi superclass, đổi class từ `Serializable` sang không (hoặc ngược lại), đổi tên trường. Dữ liệu cũ khi đó đọc lỗi hoặc cho giá trị sai.

**Hỏi xoáy 2:** IDE cảnh báo thiếu `serialVersionUID` có cần quan tâm không?
*Vì sao là bước tiếp theo:* Sau khi thấy UID tự tính mong manh, ta hỏi nó có mong manh cả giữa các môi trường build không.
**Đáp:** Có nếu class thật sự được serialize (cache, session, RMI). UID tự tính còn **phụ thuộc cả trình biên dịch** (cùng mã nguồn nhưng khác compiler có thể ra UID khác), nên hai máy build khác nhau cũng có thể không đọc được dữ liệu của nhau.

**Sai lầm hay gặp:** để UID tự tính rồi sau khi refactor (thêm hàm) thì không đọc được cache/session cũ, thường lộ ra lúc triển khai bản mới.

## 4. Tùy biến quá trình serialize: `writeObject`, `readObject`, `Externalizable`?

**Câu hỏi:** Constructor của bạn chặn `age < 0`, nhưng sau khi deserialize vẫn có object với `age = -1`. Vì sao kiểm tra trong constructor bị vượt qua, và có những mức tùy biến nào để chặn?

**Gợi ý suy luận:**
- Khi đọc, JVM tạo object bằng cách gọi constructor hay ghi thẳng giá trị vào trường?
- Nếu byte stream bị sửa hay hỏng, thứ gì còn đứng giữa để kiểm tra lại bất biến (hook trong quá trình đọc)?
- Muốn tự kiểm soát toàn bộ định dạng thì phải đánh đổi gì (constructor public không tham số, nhiều công sức)?

**Lập luận:** Với `Serializable`, deserialization không gọi constructor của class: JVM tạo object "trần" rồi ghi thẳng giá trị vào trường từ byte stream, nên mọi kiểm tra bất biến trong constructor bị vượt qua (chỉ constructor không tham số của superclass đầu tiên không Serializable được gọi). Vì vậy cần chèn code vào quá trình đọc để kiểm tra lại, đó là `readObject`. Mức cao nhất `Externalizable` cho bạn tự quyết toàn bộ, đổi lại yêu cầu constructor public không tham số. Do đó ba mức: mặc định, `writeObject`/`readObject`, `Externalizable`. Điểm dễ nhầm là tin rằng constructor luôn bảo vệ bất biến: với Java serialization nó bị bỏ qua, nên object đọc từ nguồn ngoài có thể ở trạng thái mà code của bạn coi là không thể. Biện pháp mạnh nhất là `readObject` kiểm tra lại, hoặc dùng `writeReplace`/`readResolve` (hay serialization proxy) để đi qua constructor thật; với JSON thì Jackson gọi constructor nên tính chất này giữ được.

**Đáp án ngắn:** Dùng `readObject` để kiểm tra lại bất biến sau `defaultReadObject()`; `Externalizable` khi cần kiểm soát hoàn toàn.

**Nhớ:** deserialize không chạy constructor class, nên kiểm tra lại trong `readObject`. Xem [OWASP Top 10](/go?p=03-Network-Security%2Fmedium%2Flt-04-owasp-web-security.md).

| | `Serializable` | `Externalizable` |
|---|---|---|
| Ai quyết định định dạng | JVM (tùy biến một phần) | Bạn |
| Constructor khi đọc | **Không** gọi constructor của class; chỉ gọi constructor không tham số của **superclass đầu tiên không Serializable** | Gọi constructor public không tham số |
| Công sức | Ít | Nhiều |

**Ví dụ (đã chạy thật):** class `User extends Base`, `Base` **không** Serializable. In ra khi constructor chạy:

```text
  [Base() constructor chay]            <- khi new User(...)
  [User(...) constructor chay]
 deserialize:
  [Base() constructor chay]            <- chỉ constructor của Base chạy; User(...) KHÔNG chạy
```

Khi đọc lại, constructor `User(...)` **không chạy** (nên không có kiểm tra gì trong đó), nhưng constructor không tham số của superclass không-Serializable `Base` **có** chạy (JVM cần khởi tạo phần không được serialize). Lỗi thường gặp: superclass không Serializable mà không có constructor không tham số thì deserialization thất bại.

Hậu quả về bất biến: `Unsafe` có constructor chặn `age < 0`. Sửa byte trong stream để `age = -1` (một kẻ tấn công hay file hỏng làm được):

```text
new Unsafe(-1) -> age phai >= 0
deserialize -> age = -1  (constructor khong chay nen kiem tra bi vuot qua)
```

Object với `age = -1` **lọt vào hệ thống** dù constructor cấm. Cách chặn: kiểm tra lại trong `readObject`:

```java
private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
    in.defaultReadObject();
    if (age < 0) throw new InvalidObjectException("age am");   // kiểm tra lại bất biến
}
```

```text
 readObject chan duoc: InvalidObjectException(age am)
```

`Externalizable`: bạn tự viết `writeExternal`/`readExternal`, và JVM gọi **constructor public không tham số**:

```text
  [Ext() public constructor chay]      <- khi new
 doc lai:
  [Ext() public constructor chay]      <- khi deserialize
 v=x
```

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Singleton và enum xử lý thế nào khi deserialize?
*Vì sao là bước tiếp theo:* Vì deserialize bỏ qua constructor, nó cũng có thể tạo thêm thể hiện của class vốn chỉ được phép có một.
**Đáp:** Deserialization tạo một thể hiện **mới**, phá singleton. Cách sửa: thêm `readResolve()` trả về thể hiện duy nhất; enum được JVM xử lý riêng (luôn trả về hằng số có sẵn) nên an toàn nhất.

**Hỏi xoáy 2:** Khi nào dùng `Externalizable`?
*Vì sao là bước tiếp theo:* Sau khi biết mức tùy biến cao nhất tồn tại, ta hỏi có đáng dùng không.
**Đáp:** Hiếm: khi cần định dạng gọn hoặc kiểm soát tuyệt đối. Đổi lại nhiều việc thủ công và dễ sai (quên constructor public, ghi/đọc lệch thứ tự). Phần lớn trường hợp nên chọn định dạng khác (câu 11).

**Sai lầm hay gặp:** tin rằng kiểm tra trong constructor bảo vệ được bất biến của class `Serializable`; hậu quả là object không hợp lệ xuất hiện sau deserialize.

## 5. Vì sao nên tránh Java serialization trong hệ thống mới?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Vì sao nói gọi `ObjectInputStream.readObject()` trên dữ liệu từ request HTTP có thể dẫn tới thực thi mã từ xa, dù bạn chỉ định "đọc dữ liệu"? Và nếu bắt buộc phải đọc, phòng thế nào?

**Gợi ý suy luận:**
- `readObject()` chọn class để tạo dựa vào đâu (tên class ghi trong thread)?
- Khi object được dựng, code nào của class đó chạy (`readObject`, `readResolve`) và chạy lúc nào?
- Nếu người ghi thread quyết định class nào chạy, kẻ tấn công nối các class vô hại có sẵn thành gì (chuỗi gadget)?

**Lập luận:** `readObject()` chọn class theo tên trong stream, tạo object và chạy code trong class đó, nên người ghi byte stream quyết định code nào của bạn chạy. Nếu stream đến từ nguồn không tin cậy, kẻ tấn công điều khiển được class nào trên classpath được khởi tạo và chuỗi call phát sinh (các class riêng lẻ vô hại nối lại thành thực thi mã tùy ý). Cách phòng là chặn trước khi class được tạo bằng filter allow-list, hoặc tránh Java serialization cho dữ liệu ngoài. Điểm dễ nhầm là nghĩ rủi ro chỉ có khi bạn cố tình nhận object từ ngoài: nó cũng xuất hiện qua cache, message queue, session cookie hoặc thư viện nội bộ đọc dữ liệu mà kẻ tấn công ghi được. Vì vậy mặc định cấm Java deserialization từ nguồn ngoài, cập nhật thư viện có gadget đã biết, và nếu buộc phải đọc thì đặt `ObjectInputFilter` allow-list chặt, đồng thời giới hạn kích thước và độ sâu.

**Đáp án ngắn:** Tránh Java serialization trong hệ thống mới vì: (1) rủi ro deserialization như trên; (2) mong manh, gắn chặt tên class và cấu trúc; (3) chỉ dùng trong JVM, nhị phân khó đọc; (4) cồng kềnh (câu 1); (5) *Effective Java* khuyên dùng JSON hoặc Protobuf. Nếu bắt buộc, đặt `ObjectInputFilter` dạng allow-list.

**Nhớ:** readObject cho người ghi stream quyền chọn code chạy; dùng allow-list. Xem [OWASP Top 10](/go?p=03-Network-Security%2Fmedium%2Flt-04-owasp-web-security.md).

**Ví dụ (đã chạy thật, cố ý vô hại):** class `Evil` chỉ in một dòng trong `readObject` để chứng minh code của class **chạy ngay khi deserialize**, trước cả khi chương trình dùng object:

```text
 khong co bo loc:
  !!! code trong readObject da chay khi deserialize (co the la bat ky code nao)
```

Trong thực tế, thay dòng in bằng call nguy hiểm (qua chuỗi gadget) là thành lỗ hổng thực thi mã. **Biện pháp phòng:** nếu bắt buộc deserialize, đặt **filter** `ObjectInputFilter` (JEP 290, Java 9, có bản vá cho 8) chỉ cho phép danh sách class biết trước:

```java
// chỉ Safe, từ chối mọi lớp khác
ObjectInputFilter allowSafe = ObjectInputFilter.Config.createFilter("Demo11$Safe;!*");
stream.setObjectInputFilter(allowSafe);
```

```text
 co bo loc chi cho phep Demo11$Safe:
 bi chan: InvalidClassException: filter status: REJECTED
 Safe van duoc phep: age=5
```

Cùng thread `Evil`, khi có filter thì bị từ chối *trước khi* code của nó chạy; class được phép (`Safe`) vẫn đọc bình thường. Java 17 bổ sung cấu hình filter theo ngữ cảnh toàn JVM. `record` được deserialize qua constructor chính tắc nên an toàn hơn class thường, nhưng không loại bỏ rủi ro gadget.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Filter kiểu danh sách cho phép (allow-list) hay danh sách chặn (deny-list)?
*Vì sao là bước tiếp theo:* Có filter rồi thì phải chọn chiến lược lọc, và lập luận về gadget cho thấy hai chiến lược không ngang nhau.
**Đáp:** **Allow-list**. Deny-list không bao giờ đủ vì luôn có class gadget mới được phát hiện; allow-list chỉ cho đúng những class bạn chủ định đọc.

**Hỏi xoáy 2:** Nguồn nào "tin cậy"?
*Vì sao là bước tiếp theo:* Mọi biện pháp trên chỉ cần khi nguồn không tin cậy, nên ta xác định ranh giới đó.
**Đáp:** Dữ liệu do chính hệ thống bạn ghi và bảo vệ toàn vẹn (ví dụ có chữ ký/HMAC) mới coi là tin cậy. Dữ liệu từ client, cookie, queue ngoài, hoặc file người dùng tải lên thì **không**.

**Sai lầm hay gặp:** `ObjectInputStream.readObject()` trên dữ liệu từ request HTTP, cookie hoặc cache chia sẻ; hậu quả có thể là thực thi mã từ xa.

## 6. XML dùng khi nào? XSD và JAXB là gì?

**Câu hỏi:** Dự án chạy tốt trên Java 8 nhưng ném `ClassNotFoundException: javax.xml.bind.JAXBContext` khi nâng lên Java 11. Vì sao, và XML với XSD, JAXB dùng để làm gì?

**Gợi ý suy luận:**
- Hai hệ thống khác công nghệ muốn trao đổi dữ liệu có cấu trúc mà vẫn kiểm chứng được cần có "contract" nào (XSD)?
- Ai ánh xạ giữa XML và object Java (JAXB), và sinh class từ contract bằng công cụ nào (`xjc`)?
- Thư viện từng đi kèm JDK mà sau đó bị gỡ thì chuyện gì xảy ra khi nâng phiên bản?

**Lập luận:** XML ra đời để hai hệ thống khác công nghệ trao đổi dữ liệu mà vẫn kiểm chứng được: định dạng là văn bản, XSD là contract mô tả cấu trúc hợp lệ. JAXB phiên dịch giữa XML và object Java, và gắn `xjc` vào build thì lệch contract lộ ra ngay lúc biên dịch. JAXB đã bị gỡ khỏi JDK từ Java 11 (JEP 320), nên dự án phụ thuộc vào nó phải thêm dependency riêng, nếu không sẽ lỗi `ClassNotFoundException` khi nâng Java. Điểm dễ nhầm là tưởng lỗi `ClassNotFoundException` là lỗi môi trường tạm thời: nó phản ánh JDK đã dọn các module Java EE (JAXB, JAX-WS) khỏi JDK từ Java 11. Khi nâng JDK, tìm mọi `javax.xml.bind` trong code và thư viện, thêm dependency Jakarta XML Binding tương ứng (và `jakarta.*` nếu lên Boot 3), thay vì giữ JDK cũ.

**Đáp án ngắn:** XSD mô tả cấu trúc hợp lệ và dùng để validate. JAXB: `xjc` sinh class Java từ XSD; `Unmarshaller` đọc XML thành object, `Marshaller` ghi ra. Gắn `xjc` vào bước `generate-sources` của Maven: đổi schema mà code không khớp thì build lỗi ngay. **JAXB đã bị gỡ khỏi JDK từ Java 11**, phải thêm dependency riêng (`jakarta.xml.bind` và một implementation như Glassfish JAXB).

**Nhớ:** XSD là contract, JAXB là ánh xạ XML-object, và JAXB không còn trong JDK từ 11.

**Ví dụ (đã chạy thật phần kiểm tra JAXB; phần code là minh họa):** kiểm tra JAXB có sẵn trong JDK 11 không:

```java
Class.forName("javax.xml.bind.JAXBContext")   // ClassNotFoundException => không có
```

```text
 JAXB co san trong JDK 11? false
```

Một dự án cũ chạy tốt trên Java 8 (JAXB đi kèm) sẽ ném `ClassNotFoundException: javax.xml.bind.JAXBContext` khi nâng lên Java 11 cho tới khi thêm dependency. Mã dùng JAXB (minh họa, chưa chạy thử vì không có thư viện):

```java
// Team: lớp do xjc sinh ra
JAXBContext ctx = JAXBContext.newInstance(Team.class);
Team team = (Team) ctx.createUnmarshaller().unmarshal(new File("team.xml"));
ctx.createMarshaller().marshal(team, System.out);
```

Lỗi thường gặp: `JAXBContext` phải trỏ đúng class/package chứa class sinh ra, nếu không `Marshaller` không nhận ra class.

_Phần kiểm tra JAXB đã chạy thử trên JDK 11; phần mã JAXB là minh họa._

**Hỏi xoáy 1:** XSD khác DTD thế nào?
*Vì sao là bước tiếp theo:* Vì XSD là contract của XML, ta hỏi vì sao nó thay thế cách mô tả cũ.
**Đáp:** XSD bản thân là XML, có kiểu dữ liệu phong phú (số, ngày, enumeration, ràng buộc độ dài) và namespace; DTD cũ chỉ mô tả cấu trúc thô, không có kiểu. XSD được dùng trong tích hợp hiện đại.

**Hỏi xoáy 2:** Vì sao nhiều ứng dụng mới bỏ XML?
*Vì sao là bước tiếp theo:* Sau khi thấy sức mạnh của XML, câu hỏi phản biện là vì sao nó không còn là mặc định cho API mới.
**Đáp:** Dài dòng, nặng để parse, ít thân thiện với JavaScript; JSON nhẹ hơn cho API web. XML còn giữ chỗ ở SOAP, cấu hình, tích hợp doanh nghiệp, tài liệu (Office, SVG).

**Sai lầm hay gặp:** nâng Java 8 lên 11 và quên thêm JAXB, hoặc dùng thư viện `javax.xml.bind` với Spring Boot 3 (cần `jakarta.xml.bind`).

## 7. SAX, DOM và StAX khác nhau thế nào? (chỉ cần nhận biết)

**Câu hỏi:** Bạn phải xử lý file XML 2 GB và một file nhỏ cần duyệt tự do. Chọn DOM, SAX hay StAX, và vì sao chúng khác nhau?

**Gợi ý suy luận:**
- Giữ cả file trong RAM thì memory tăng theo gì (kích thước file)?
- Nếu parser đọc theo thread và chỉ giữ phần đang xử lý, memory thay đổi ra sao?
- Ai điều khiển nhịp đọc: parser đẩy event vào bạn (push) hay bạn chủ động kéo (pull)?

**Lập luận:** Ba cách khác nhau chỉ ở ai control flow đọc và giữ bao nhiêu trong memory. DOM nạp toàn bộ cây vào RAM nên duyệt tự do nhưng tốn memory theo kích thước file. SAX và StAX đọc theo stream, chỉ giữ phần đang xử lý nên memory cố định bất kể file lớn đến đâu. SAX đẩy event vào code bạn (push, bạn tự giữ state), StAX để bạn chủ động kéo (pull, như một vòng lặp). Điểm dễ nhầm là chọn DOM cho mọi file vì dễ dùng, rồi gặp `OutOfMemoryError` khi file lớn, hoặc ngược lại dùng SAX cho thao tác cần duyệt lại nhiều lần. Quy tắc: kích thước và kiểu truy cập quyết định; file lớn xử lý một lượt thì StAX/SAX, file nhỏ cần truy cập ngẫu nhiên thì DOM. Cũng nhớ tắt xử lý external entity (XXE) trên mọi parser XML nhận dữ liệu ngoài.

**Đáp án ngắn:** File lớn dùng SAX hoặc StAX (StAX dễ viết logic hơn); file nhỏ cần duyệt hoặc sửa tự do dùng DOM.

**Nhớ:** DOM giữ cả cây, SAX đẩy event, StAX bạn kéo.

**Ví dụ (đã chạy thật):** cùng một XML đọc bằng ba cách:

```java
String xml = "<team><player pos=\"GK\">Lan</player><player pos=\"FW\">Minh</player></team>";
```

```text
 DOM  (cay trong RAM, duyet tuy y): Lan(GK) Minh(FW)
 SAX  (push, su kien): [start:team, start:player, text:Lan, end:player, start:player, text:Minh, end:player, end:team]
 StAX (pull, minh chu dong): [Lan, Minh]
```

- **DOM** dựng cây rồi hỏi "mọi thẻ `player`", truy cập thuộc tính `pos` tùy ý.
- **SAX** không có cây: parser gọi bạn từng event `start`, `text`, `end` theo thứ tự. Muốn biết "đang ở trong thẻ nào" bạn phải **tự giữ state**, nên logic phức tạp khó viết.
- **StAX** như vòng lặp bạn điều khiển: `next()` đến phần tử cần, đọc rồi đi tiếp, dừng sớm được.

| | DOM | SAX | StAX |
|---|---|---|---|
| Memory | Cả cây | Cố định | Cố định |
| Điều khiển | Bạn | Parser (push) | Bạn (pull) |
| Sửa tài liệu | Có | Không | Không (có writer riêng) |
| File lớn | Không hợp | Hợp | Hợp |

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** File XML 2 GB dùng cái nào?
*Vì sao là bước tiếp theo:* Đây là phép thử trực tiếp của tiêu chí memory vừa nêu.
**Đáp:** SAX hoặc StAX (theo thread); DOM sẽ cần RAM lớn gấp nhiều lần kích thước file nên dễ `OutOfMemoryError`. StAX dễ viết logic hơn SAX.

**Hỏi xoáy 2:** Còn bảo mật khi parse XML từ nguồn ngoài?
*Vì sao là bước tiếp theo:* Bất kể chọn parser nào, dữ liệu từ ngoài luôn là bước tiếp theo cần cảnh giác.
**Đáp:** Phải tắt xử lý thực thể ngoài (XXE: XML External Entity) và DTD không cần thiết, nếu không kẻ tấn công đọc được file cục bộ hoặc gọi mạng nội bộ qua tài liệu XML độc hại ([OWASP](/go?p=03-Network-Security%2Fmedium%2Flt-04-owasp-web-security.md)).

**Sai lầm hay gặp:** dùng DOM cho file lớn; parse XML người dùng gửi lên mà không tắt XXE.

## 8. JSON là gì? Khác XML ở đâu?

**Câu hỏi:** Một REST API trả về `{"id": 9007199254740993}` nhưng JavaScript đọc ra `9007199254740992`. Vì sao, và JSON khác XML ở những điểm nào dẫn tới chuyện đó?

**Gợi ý suy luận:**
- XML mô tả gì (tài liệu có markup), JSON mô tả gì (cấu trúc dữ liệu với vài loại giá trị)?
- JSON chỉ có một kiểu số, vậy số được hiện thực bằng gì ở phía JavaScript (số thực 64 bit)?
- Thiếu bớt tính năng (schema, chú thích, kiểu ngày) đem lại lợi gì và buộc bạn tự làm gì?

**Lập luận:** XML mô tả tài liệu có markup (thẻ, thuộc tính, namespace, chú thích), còn JSON chỉ mô tả cấu trúc dữ liệu với sáu loại giá trị: object, mảng, chuỗi, số, boolean, `null`. Thiếu bớt tính năng nên JSON gọn, ánh xạ thẳng vào map/list và là kiểu gốc của JavaScript, vì thế thành chuẩn REST. Cái giá là số không phân biệt nguyên và thực: JavaScript biểu diễn số bằng số thực 64 bit chính xác tới `2^53`, nên id lớn hơn bị làm tròn âm thầm. Do đó id dài nên gửi dưới dạng chuỗi. Điểm dễ nhầm là nghĩ JSON "không có kiểu": nó có sáu loại giá trị nhưng số không phân biệt nguyên và thực, và không có kiểu ngày giờ hay số thập phân chính xác. Vì vậy id 64 bit, số tiền và ngày giờ phải có quy ước rõ ràng (chuỗi cho id lớn, chuỗi hoặc đơn vị nhỏ nhất cho tiền, ISO-8601 cho thời gian), nếu không sai lệch sẽ lặng lẽ xuất hiện ở client.

**Đáp án ngắn:** JSON ít dài dòng, dễ đọc, chuẩn của web/mobile; đổi lại không có schema chặt như XSD (có JSON Schema nhưng ít dùng), không có chú thích, không có kiểu ngày giờ riêng, số không phân biệt nguyên/thực.

**Nhớ:** JSON gọn vì ít tính năng; số lớn gửi dạng chuỗi. Xem [JSON, HTTP client và thư viện tiện ích](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md).

**Ví dụ:** cùng một dữ liệu:

```xml
<player pos="GK"><name>Lan</name><age>30</age></player>      <!-- 55 ký tự -->
```

```json
{"pos":"GK","name":"Lan","age":30}                            // 34 ký tự
```

| | XML + XSD | JSON |
|---|---|---|
| Độ dài | Dài (thẻ đóng lặp tên) | Ngắn |
| Schema | XSD mạnh, phổ biến | JSON Schema, ít dùng |
| Chú thích, namespace | Có | Không |
| Phân biệt thuộc tính / nội dung | Có | Không (chỉ có lock/giá trị) |
| Phù hợp | Tích hợp doanh nghiệp, SOAP, tài liệu | REST API, web, mobile |

Bẫy phổ biến của "số trong JSON": `{"id": 9007199254740993}` có thể bị JavaScript đọc thành `9007199254740992` vì số JSON được hiện thực bằng số thực 64 bit (chính xác tới `2^53`); nên gửi id dài dưới dạng **chuỗi**.

**Hỏi xoáy 1:** Làm sao biểu diễn ngày giờ trong JSON?
*Vì sao là bước tiếp theo:* Vì JSON thiếu kiểu ngày, ta hỏi quy ước thay thế là gì.
**Đáp:** JSON không có kiểu ngày; quy ước là chuỗi ISO-8601 (`2026-10-21T08:00:00Z`) hoặc số epoch. Thống nhất quy ước trong contract API; ISO-8601 dễ đọc và không mơ hồ múi giờ khi có hậu tố `Z`/offset.

**Hỏi xoáy 2:** Còn kiểm tra cấu trúc dữ liệu đầu vào?
*Vì sao là bước tiếp theo:* Vì JSON cũng thiếu schema chặt, ta hỏi việc kiểm tra cấu trúc chuyển cho ai.
**Đáp:** JSON không tự kiểm tra; phải validate ở tầng ứng dụng (Bean Validation trên DTO) hoặc bằng JSON Schema.

**Sai lầm hay gặp:** gửi số nguyên lớn (id 64 bit) dưới dạng số JSON cho client JavaScript và nhận sai id âm thầm.

## 9. Đọc và ghi JSON trong Java với Jackson?

**Câu hỏi:** Client gửi thêm một trường `extra` mà DTO không có, và API ném `UnrecognizedPropertyException`. Vì sao, và vì sao Spring Boot lại không bị lỗi này? Rộng hơn, Jackson ánh xạ JSON với object Java bằng cách nào?

**Gợi ý suy luận:**
- Jackson biết khớp lock JSON với trường Java bằng gì (reflection và tên)?
- Khi gặp lock không có trong class thì mặc định nên bỏ qua hay báo lỗi?
- Cấu hình đắt còn ánh xạ rẻ thì object cấu hình nên tạo mấy lần?

**Lập luận:** Jackson là bộ ánh xạ dùng reflection để đọc getter/field khi ghi và gọi constructor/setter/field khi đọc, khớp theo tên, nên contract JSON phụ thuộc tên trường Java: đổi tên là đổi API và lỗi sai tên chỉ lộ lúc chạy. Mặc định `FAIL_ON_UNKNOWN_PROPERTIES = true` nên trường lạ gây lỗi; Spring Boot tắt tùy chọn này để chịu được trường lạ. Vì cấu hình (module, tính năng) đắt còn ánh xạ rẻ, `ObjectMapper` được tạo một lần và dùng chung. Điểm dễ nhầm là coi đổi tên field Java là thay đổi nội bộ vô hại: nó làm đổi contract JSON và client cũ sẽ lỗi hoặc thiếu dữ liệu mà không có lỗi biên dịch. Hãy khóa tên JSON bằng `@JsonProperty` ở DTO công khai, thêm test serialize/deserialize cho contract, và quyết định có chấp nhận trường lạ hay không dựa trên chính sách tương thích của API.

**Đáp án ngắn:** `ObjectMapper` là class trung tâm: `readValue(source, Type.class)` đọc, `writeValueAsString(obj)` ghi. `ObjectMapper` thread-safe **sau khi cấu hình xong**. Annotation thường dùng: `@JsonProperty` (đổi tên), `@JsonIgnore`, `@JsonFormat` (định dạng ngày), `@JsonInclude` (bỏ `null`), `@JsonCreator` (chọn constructor cho object bất biến).

**Nhớ:** Jackson khớp theo tên bằng reflection; tạo `ObjectMapper` một lần. Xem [JSON, HTTP client và thư viện tiện ích](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md).

**Ví dụ (minh họa; Jackson không có trong môi trường chạy thử):**

```java
ObjectMapper mapper = new ObjectMapper();            // tạo một lần, dùng chung
String json = """
        {"name":"Lan","position":"GK","age":30,"extra":"khong-biet"}""";

Player p = mapper.readValue(json, Player.class);                       // JSON -> object
String out = mapper.writeValueAsString(p);                             // object -> JSON
List<Player> list = mapper.readValue(listJson, new TypeReference<List<Player>>() {});
```

Điểm hay bị hỏi trong ví dụ:

- Trường `extra` không có trong `Player`: mặc định `FAIL_ON_UNKNOWN_PROPERTIES = true` thì Jackson **ném `UnrecognizedPropertyException`**. Spring Boot tắt tùy chọn này để chịu được trường lạ (client gửi thêm trường không làm hỏng API).
- Với `List<Player>` phải dùng `TypeReference` vì **xóa kiểu** (type erasure): `readValue(json, List.class)` chỉ cho `List<LinkedHashMap>`, không phải `List<Player>`.
- Trường `null` mặc định vẫn được ghi (`"name": null`); đổi bằng `@JsonInclude(NON_NULL)`.

Gson là thư viện thay thế gọn hơn, đủ cho nhu cầu cơ bản, nhưng hệ sinh thái Spring mặc định dùng Jackson.

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao dùng chung một `ObjectMapper`?
*Vì sao là bước tiếp theo:* Lập luận trên dựa vào việc cấu hình đắt, nên ta hỏi cụ thể cái gì đắt và vì sao dùng chung vẫn an toàn.
**Đáp:** Khởi tạo đắt (nạp module, dựng cache serializer/deserializer theo class bằng reflection). Dùng chung tận dụng cache; thread-safe sau cấu hình nhưng **không được đổi cấu hình** khi đã chạy multithreading.

**Hỏi xoáy 2:** Bẫy bảo mật của Jackson?
*Vì sao là bước tiếp theo:* Vì Jackson dựng object theo dữ liệu đến, ta nối lại với rủi ro chọn class từ nguồn không tin cậy ở câu 5.
**Đáp:** Polymorphism với `enableDefaultTyping`/`@JsonTypeInfo` không giới hạn cho JSON chọn **class nào được tạo**, tương tự lỗ hổng deserialization ở câu 5. Chỉ cho phép danh sách subclass rõ ràng. Chi tiết ở [bài JSON](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md).

**Sai lầm hay gặp:** tạo `new ObjectMapper()` trong mỗi request (chậm, nhiều rác); serialize thẳng entity JPA ra ngoài (lộ trường nội bộ, lỗi lazy loading, vòng tham chiếu vô hạn).

## 10. Jackson với `record` và object bất biến?

**Câu hỏi:** Với class bất biến không có setter, Jackson dựng object từ JSON bằng cách nào, và vì sao `record` đọc được mà không cần chú thích còn class thường thì cần `@JsonCreator`?

**Gợi ý suy luận:**
- Không có setter thì không thể "tạo rỗng rồi gán dần"; vậy phải gọi gì với đủ tham số?
- Tên tham số constructor có còn sau khi biên dịch không, và Jackson biết key JSON nào ứng với tham số nào bằng cách nào?
- `record` lưu tên thành phần ở đâu (trong định nghĩa) và có constructor nào (chính tắc)?

**Lập luận:** Object bất biến không có setter, nên Jackson phải gọi constructor với đủ tham số và biết key JSON nào ứng với tham số nào. Với class thường, tên tham số bị biên dịch bỏ nên phải chú thích (`@JsonCreator` kèm `@JsonProperty`). `record` giải quyết tận gốc: tên thành phần là một phần định nghĩa và có constructor chính tắc, nên Jackson từ 2.12 ánh xạ được không cần chú thích. Và vì Jackson gọi constructor, kiểm tra bất biến trong đó có chạy, khác với Java serialization (câu 4). Điểm dễ nhầm là nghĩ Jackson cần `@JsonCreator` cho mọi class bất biến: với `record`, hoặc với class biên dịch có `-parameters` và dùng `ParameterNamesModule` thì không cần. Khi dùng class thường, thiếu annotation sẽ lỗi lúc chạy chứ không phải lúc biên dịch, nên cần test deserialize cho mọi DTO đầu vào.

**Đáp án ngắn:** Dùng `record` làm DTO: bất biến, gọn, an toàn multithreading. Với class bất biến thường dùng `@JsonCreator` trên constructor và `@JsonProperty` trên tham số. Ngày giờ `java.time` cần module `jackson-datatype-jsr310` (Spring Boot đăng ký sẵn) và nên ghi dạng ISO-8601 thay vì timestamp.

**Nhớ:** bất biến cần constructor; `record` có sẵn tên thành phần. Xem [Chia sẻ object](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md).

**Ví dụ (minh họa; cần Java 16+ và Jackson, chưa chạy thử vì môi trường chỉ có JDK 11):**

```java
public record PlayerDto(String name, String position) { }

PlayerDto p = mapper.readValue("{\"name\":\"Lan\",\"position\":\"GK\"}", PlayerDto.class);
// p.name() = "Lan", p.position() = "GK"; không có setter nên không đổi được
```

Với class bất biến thường:

```java
public final class Money {
    private final long amount; private final String currency;
    @JsonCreator
    public Money(@JsonProperty("amount") long amount, @JsonProperty("currency") String currency) {
        if (amount < 0) throw new IllegalArgumentException();
        this.amount = amount; this.currency = currency;
    }
    public long getAmount() { return amount; }
    public String getCurrency() { return currency; }
}
```

Khác với Java serialization (câu 4), Jackson gọi **constructor**, nên kiểm tra `amount < 0` **có chạy**: JSON `{"amount": -5, ...}` bị từ chối. Đây là một lý do JSON an toàn hơn cho bất biến. Ưu điểm của bất biến: không lo thread-safety ([Chia sẻ object](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md)) và dễ suy luận.

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao không dùng được record với Jackson cũ hơn 2.12?
*Vì sao là bước tiếp theo:* Vì cơ chế dựa vào việc Jackson nhận ra tên tham số, ta hỏi điều gì xảy ra khi bản cũ chưa có hỗ trợ đó.
**Đáp:** Trước đó Jackson tìm setter/field/constructor có chú thích; record không có setter và tên tham số constructor không được nhận ra mà không có hỗ trợ riêng, nên lỗi hoặc ra object rỗng.

**Hỏi xoáy 2:** Vì sao ngày giờ nên là ISO-8601 thay vì timestamp?
*Vì sao là bước tiếp theo:* Câu trả lời nhắc `java.time` cần module riêng, nên ta hỏi chọn định dạng đầu ra nào.
**Đáp:** Người đọc và mọi ngôn ngữ hiểu ngay, kèm múi giờ; timestamp số mơ hồ giây hay mili giây. Bật `WRITE_DATES_AS_TIMESTAMPS=false`.

**Sai lầm hay gặp:** dùng entity JPA làm DTO nhận từ client (cho phép client gán cả trường không nên gán: mass assignment); thiếu module `jsr310` nên `LocalDate` serialize ra cấu trúc lạ hoặc lỗi.

## 11. Chọn định dạng nào khi nào?

**Câu hỏi:** Hai microservice nội bộ trao đổi nhiều dữ liệu, một bên nâng cấp trước. Bạn chọn JSON, XML, Protobuf hay Java serialization, và dựa vào tiêu chí nào?

**Gợi ý suy luận:**
- Có bốn trục đánh đổi: dễ đọc cho người, kích thước và tốc độ, schema và tiến hóa tương thích, độc lập ngôn ngữ. Nhu cầu của bạn nặng ở trục nào?
- Hai dịch vụ nâng cấp lệch phiên bản thì định dạng nào có quy tắc tiến hóa rõ ràng?
- Định dạng nào có rủi ro bảo mật riêng (câu 5) hoặc gắn chặt tên class?

**Lập luận:** Mỗi định dạng đánh đổi giữa bốn trục: dễ đọc, kích thước và tốc độ, schema và tiến hóa, độc lập ngôn ngữ. JSON thắng ở dễ đọc và phổ dụng; nhị phân có schema (Protobuf, Avro) thắng ở kích thước, tốc độ và quy tắc tiến hóa nên hai dịch vụ lệch phiên bản vẫn đọc được nhau; Java serialization thua ở hầu hết trục và có rủi ro bảo mật, chỉ còn lợi thế là có sẵn. Vì vậy với microservice nội bộ cần hiệu năng và tiến hóa thì chọn nhị phân có schema, còn API cho trình duyệt thì JSON. Điểm dễ nhầm là chọn theo thói quen thay vì theo tiêu chí: JSON dễ debug nhưng tốn băng thông và không có schema chặt; Protobuf nhỏ và nhanh nhưng cần công cụ để xem dữ liệu và quản lý file `.proto`. Khi thiết kế, hỏi: ai là client (trình duyệt hay dịch vụ nội bộ), dữ liệu có sống lâu không (cần tiến hóa), và có yêu cầu hiệu năng đo được không, rồi mới chọn.

**Đáp án ngắn:** JSON cho REST API và trình duyệt; XML + XSD cho tích hợp cũ cần schema chặt; Protobuf/Avro cho nội bộ hiệu năng cao và schema tiến hóa; tránh Java serialization.

**Nhớ:** chọn theo bốn trục đánh đổi; tách DTO khỏi entity. Xem [JSON, HTTP client và thư viện tiện ích](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md).

| Nhu cầu | Gợi ý |
|---|---|
| REST API, giao tiếp trình duyệt/mobile | JSON (Jackson) |
| Tích hợp hệ thống cũ, SOAP, cần schema chặt | XML + XSD |
| Hiệu năng cao, nội bộ giữa microservice, schema tiến hóa | Protobuf, Avro (nhị phân, có schema) |
| Lưu cache chỉ trong JVM, tạm thời | Tránh Java serialization nếu được; dùng JSON hoặc nhị phân có schema |
| Cấu hình | YAML/properties, XML tùy hệ sinh thái |

**Ví dụ:** cùng một object `{name:"An", age:30}` qua các định dạng (kích thước đo được ở câu 1 cho Java và JSON):

| Định dạng | Kích thước | Ghi chú |
|---|---|---|
| Java serialization | 75 byte (đã đo; gồm cả mô tả class, trường `password` đã loại nhờ `transient`) | Gắn chặt tên class |
| JSON | 22 byte (đã đo; chỉ `name` và `age`) | Đọc được bằng mắt |
| Protobuf | khoảng chục byte (ước lượng: mã trường + giá trị, không có tên trường) | Cần file `.proto` hai bên chia sẻ |

Dòng Protobuf là ước lượng, chưa đo trong môi trường này.

Nguyên tắc: đặt **contract dữ liệu** (DTO) tách khỏi entity miền; không serialize thẳng entity JPA ra ngoài (rò rỉ dữ liệu, lỗi lazy loading, vòng tham chiếu).

**Hỏi xoáy 1:** Vì sao microservice nội bộ hay chọn Protobuf thay vì JSON?
*Vì sao là bước tiếp theo:* Từ bảng chọn, ta kiểm chứng lập luận cho dòng nhị phân có schema.
**Đáp:** Nhỏ hơn và nhanh hơn, có **schema bắt buộc** và quy tắc tiến hóa rõ (thêm trường mới với số hiệu mới, không đổi số hiệu cũ) nên hai dịch vụ nâng cấp lệch phiên bản vẫn đọc được nhau. Đổi lại: cần công cụ sinh code, khó đọc bằng mắt và khó debug bằng `curl`.

**Hỏi xoáy 2:** Khi nào JSON vẫn tốt hơn dù chậm hơn?
*Vì sao là bước tiếp theo:* Sau khi nêu ưu điểm của Protobuf, ta hỏi trường hợp ngược lại để không chọn theo cảm tính.
**Đáp:** Khi cần debug dễ, client là trình duyệt, tích hợp với bên thứ ba, hoặc lưu lượng không lớn tới mức kích thước và tốc độ là nút thắt.

**Sai lầm hay gặp:** chọn định dạng theo thói quen mà không xét tiến hóa schema; hậu quả là hai dịch vụ không thể nâng cấp độc lập. Tối ưu sớm sang nhị phân khi JSON chưa phải nút thắt.

Nguồn: Java Programming Interviews Exposed (Markham), Chương 15.

