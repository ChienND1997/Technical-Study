# Câu hỏi: Java Core cơ bản

Mỗi câu hỏi được viết theo chuỗi suy luận: **Câu hỏi** theo tình huống, **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới kiến thức nền), **Lập luận** (chuỗi nhân quả vì A nên B), **Đáp án ngắn** nói được thành tiếng, **Nhớ** (kiến thức cốt lõi), rồi **Ví dụ** chạy được. Mỗi **Hỏi xoáy** nêu thêm vì sao nó là bước tiếp theo logic của câu trước. Kiến thức gốc: [Java Core Easy](/go?p=08-Java%2FJava-Core%2Feasy%2Findex.md).

Quy ước: ví dụ có dòng "Đã chạy thử trên JDK 11" là output thật, copy từ lần chạy. Ví dụ ghi "Minh họa" chưa chạy trong môi trường này (cần Java mới hơn hoặc hạ tầng khác). Thời gian đo (ms) chỉ để so sánh tương đối, thay đổi theo máy.

**Tóm tắt:**

- Phạm vi file: những chỗ Java core hay làm người ta vấp ở mức cơ bản đến trung bình, mỗi chỗ đều quy về một cơ chế cụ thể (địa chỉ, hash, bất biến, thời điểm quyết định).
- `==` so nội dung ô nhớ của biến (địa chỉ với object), còn `equals` do class quyết định; ghi đè `equals` thì bắt buộc ghi đè `hashCode` cùng các field, nếu không `HashSet` và `HashMap` không tìm thấy phần tử.
- `String` bất biến nên chia sẻ an toàn và cache được hash, nhưng nối trong vòng lặp là O(n²), nên dùng `StringBuilder`; Java luôn truyền tham số theo giá trị (với object là bản sao địa chỉ).
- Overload chọn lúc biên dịch theo kiểu khai báo, override chọn lúc chạy theo kiểu thật; `static` chỉ bị che, không override được.
- Interface là contract không giữ state, abstract class chia sẻ state và constructor; `final`, `finally`, `finalize` ở ba tầng khác nhau (biên dịch, control flow, hook của GC).
- Collections: `ArrayList` thắng `LinkedList` nhờ cache locality; `HashMap` O(1) nhờ `hashCode` chọn bucket; stack nằm theo lời gọi hàm, heap nằm theo khả năng truy cập, và GC chỉ thu object không còn tới được từ GC root nên vẫn có memory leak.
- Hay bị hỏi xoáy nhất: vì sao `Integer` 127 `==` 127 là true còn 128 là false, `hashCode` đổi theo state làm phần tử biến mất, và `try { return x; } finally { x = 99; }` trả giá trị nào.

## 1. `==` và `equals()`: khi nào hai thứ "bằng nhau"?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Hai biến `String` cùng chứa chữ "java" mà `==` lúc đúng lúc sai, còn `equals()` thì luôn đúng. Điều gì đang so sánh ở mỗi toán tử?

**Gợi ý suy luận:**
- Một biến kiểu object thực sự chứa gì: bản thân object hay một địa chỉ?
- Nếu `==` chỉ so nội dung ô nhớ của biến, kết quả với hai object khác nhau nhưng cùng nội dung là gì?
- `equals()` là toán tử của ngôn ngữ hay một method bình thường mà class tự định nghĩa?

**Lập luận:** Một biến trong Java chỉ chứa một trong hai thứ: giá trị nguyên thủy (số, boolean) hoặc địa chỉ trỏ tới object trên heap. `==` luôn so nội dung ô nhớ của biến, nên với số nó so giá trị, còn với object nó chỉ hỏi "hai địa chỉ này có là một không". Vì vậy hai object có cùng nội dung nhưng nằm ở hai chỗ trên heap thì `==` trả `false`, dù nhìn bằng mắt thấy giống nhau. `equals()` là method, nên "bằng nhau" là điều do chính class quyết định; nhưng `Object.equals` mặc định chỉ lặp lại `==`, nên class nào không ghi đè thì `equals` cũng chỉ so địa chỉ. Điểm dễ nhầm là tin rằng `equals` tự so nội dung: `String`, `Integer`, `List` đúng vì thư viện đã ghi đè, còn class của bạn thì không. Vì vậy khi viết class dùng làm key hay so sánh, phải ghi đè `equals` kèm `hashCode`, và khi review thấy `==` giữa hai object thì coi là nghi vấn trừ khi chủ ý so địa chỉ (enum, singleton, `null`).

**Đáp án ngắn:** `==` so giá trị trong biến (số, hoặc địa chỉ với object). `equals()` so theo định nghĩa của class, và class phải ghi đè nó (kèm `hashCode`) mới so được nội dung.

**Nhớ:** `==` là so ô nhớ, `equals` là so ý nghĩa. Chỉ dùng `==` cho nguyên thủy, `enum` hoặc khi hỏi "cùng một object không". Gốc: [Java Core Easy](/go?p=08-Java%2FJava-Core%2Feasy%2Findex.md).

**Ví dụ:**

```java
Integer x1 = 127, x2 = 127, y1 = 1000, y2 = 1000;
System.out.println("127==127: " + (x1 == x2) + " | 1000==1000: " + (y1 == y2) + " | 1000.equals(1000): " + y1.equals(y2));
String s1 = "java", s2 = "java", s3 = new String("java");
System.out.println("literal==literal: " + (s1 == s2) + " | literal==new: " + (s1 == s3)
    + " | equals: " + s1.equals(s3) + " | intern()==literal: " + (s3.intern() == s1));
Object o1 = new Object(), o2 = new Object();
System.out.println("Object.equals mac dinh: " + o1.equals(o2));
```

```text
127==127: true | 1000==1000: false | 1000.equals(1000): true
literal==literal: true | literal==new: false | equals: true | intern()==literal: true
Object.equals mac dinh: false
```

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Vì sao `127 == 127` đúng còn `1000 == 1000` sai?
**Vì sao hỏi tiếp:** Ví dụ trên cho thấy `==` so địa chỉ, vậy tại sao với `Integer` nhỏ nó lại "đúng"? Đây là chỗ lý thuyết va vào thực tế.
**Gợi ý suy luận:** Gán `Integer x = 127` gọi hàm nào? Nếu hàm đó muốn tiết kiệm memory cho số hay dùng thì nó làm gì?
**Lập luận:** Autoboxing gọi `Integer.valueOf(int)`. Hàm này giữ một **buffer** các object cho -128 đến 127 nên cùng giá trị trả cùng object, `==` đúng. Ngoài khoảng đó mỗi lần tạo object mới nên hai `1000` có hai địa chỉ, `==` sai. Kết luận: không bao giờ so `Integer`, `Long`, `String` bằng `==`.

**Hỏi xoáy 2:** `s1 == s2` đúng là nhờ đâu?
**Vì sao hỏi tiếp:** Cùng hiện tượng "`==` đúng ngoài ý muốn" nhưng ở `String`, nên phải hỏi cơ chế riêng của nó.
**Gợi ý suy luận:** Literal giống nhau trong cùng chương trình có cần hai bản không? `new String(...)` khác literal ở điểm nào?
**Lập luận:** JVM giữ một bản cho mỗi literal trong **string pool** để tiết kiệm, nên hai literal `"java"` cùng trỏ một object. `new String("java")` buộc tạo object mới ngoài pool nên `==` sai; `intern()` trả về bản trong pool nên lại đúng.

**Sai lầm hay gặp:** So sánh `String` hay `Integer` bằng `==` vì "test vài lần thấy đúng" (chỉ đúng nhờ pool/cache nhỏ). Hậu quả: lỗi xuất hiện khi dữ liệu lớn hơn 127 hoặc chuỗi đến từ nguồn khác (đọc file, JSON).

## 2. Quên `hashCode` khi ghi đè `equals`: vì sao `HashSet` không tìm thấy phần tử?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Tôi ghi đè `equals` đúng, hai object `equals` nhau, nhưng `HashSet.contains` vẫn trả `false`. Lỗi nằm ở đâu và contract giữa `equals` với `hashCode` là gì?

**Gợi ý suy luận:**
- `HashMap`/`HashSet` tìm phần tử qua mấy bước (chọn bucket rồi làm gì)?
- Nếu `hashCode` của hai object "bằng nhau" khác nhau thì chúng rơi vào bucket nào, có bao giờ được đem ra so `equals` không?
- Nếu `hashCode` phụ thuộc trạng thái mà trạng thái bị sửa sau khi đã `put` thì sao?

**Lập luận:** `HashMap` và `HashSet` tìm phần tử theo hai bước: dùng `hashCode` chọn **bucket**, rồi mới dùng `equals` để so các phần tử trong đúng bucket đó. Nếu hai object `equals` nhau mà `hashCode` khác, chúng rơi vào hai bucket khác nhau, nên map không bao giờ đem chúng ra so với nhau và `contains` trả `false`. Do đó mới có contract: hai object `equals` thì bắt buộc cùng `hashCode`. Chiều ngược lại không bắt buộc vì hai object khác nhau vẫn có thể va chạm hash, `equals` sẽ phân xử trong bucket. Điểm dễ nhầm là chỉ ghi đè `equals` vì thấy nó "đủ để so sánh", trong khi nó chỉ đủ cho `List.contains`, còn mọi cấu trúc dựa trên hash đều hỏng. Tương tự, nếu `hashCode` phụ thuộc vào field có thể đổi, phần tử đã `put` vẫn nằm ở bucket cũ trong khi mọi lần tra cứu tính ra bucket mới, nên nó "biến mất". Vì thế khi thiết kế: ghi đè cả hai bằng cùng các field, và dùng field bất biến làm key.

**Đáp án ngắn:** Hai object `equals` thì phải cùng `hashCode`, vì map chọn bucket bằng `hashCode` trước. Key map nên bất biến, vì `hashCode` đổi theo trạng thái thì phần tử không tìm lại được.

**Nhớ:** `equals` phải phản xạ, đối xứng, bắc cầu, nhất quán; ghi đè một thì ghi đè cả hai; key map nên bất biến.

**Ví dụ:**

```java
static class BadKey {
    final String id;
    BadKey(String id) { this.id = id; }
    @Override public boolean equals(Object o) { return o instanceof BadKey && ((BadKey) o).id.equals(id); }
    // QUEN hashCode -> dung hashCode mac dinh (theo dia chi)
}
// GoodKey giong BadKey nhung co: public int hashCode() { return id.hashCode(); }
// MutKey giong GoodKey nhung id KHONG final

Set<BadKey> bad = new HashSet<>(); bad.add(new BadKey("A"));
System.out.println("BadKey: equals=" + new BadKey("A").equals(new BadKey("A"))
    + ", contains=" + bad.contains(new BadKey("A")));

Map<MutKey, String> m = new HashMap<>();
MutKey k = new MutKey("A"); m.put(k, "gia tri");
k.id = "B";   // sua khoa SAU KHI da put
System.out.println("MutKey sau khi doi id: get(k)=" + m.get(k) + ", size=" + m.size()
    + ", get(new MutKey(A))=" + m.get(new MutKey("A")));
```

```text
BadKey: new BadKey(A).equals(...)=true, contains=false
GoodKey contains=true
MutKey sau khi doi id: get(k)=null, size=1, get(new MutKey(A))=null
```

_Đã chạy thử trên JDK 11 (bản đầy đủ có thêm class `GoodKey`)._

Dòng cuối cho thấy phần tử vẫn nằm trong map (`size=1`) nhưng không tìm lại được bằng key cũ lẫn key mới: nó nằm ở bucket tính từ `hashCode` cũ ("A"), còn mọi lần tra cứu sau dùng `hashCode` mới ("B"). Đây là memory leak âm thầm.

**Hỏi xoáy 1:** Nếu `hashCode` luôn trả `42` thì sao?
**Vì sao hỏi tiếp:** Contract chỉ cấm chiều "equals mà khác hash", vậy hash trùng hết có vi phạm không, và hậu quả là gì?
**Gợi ý suy luận:** Mọi phần tử cùng hash thì rơi vào mấy bucket? Tìm trong một bucket dài tốn bao nhiêu?
**Lập luận:** Vẫn đúng contract vì không có cặp `equals` nào khác hash. Nhưng mọi phần tử vào một bucket nên `HashMap` thoái hóa từ O(1) về duyệt chuỗi (hoặc cây đỏ-đen O(log n) từ Java 8 nếu key `Comparable`). Đúng nhưng chậm. Xem demo ép va chạm ở [bài collections](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-03-collections-concurrency.md).

**Hỏi xoáy 2:** `record` có sinh `equals/hashCode` đúng không?
**Vì sao hỏi tiếp:** Nếu viết tay dễ sai thì có cách nào để compiler làm hộ không, và nó có giải quyết hết vấn đề lock bất biến không?
**Gợi ý suy luận:** `record` sinh `equals/hashCode` dựa vào đâu? Nếu một thành phần là `List` sửa được thì hash đổi khi nào?
**Lập luận:** `record` sinh cả hai dựa trên mọi thành phần, nên đúng contract. Nhưng nó chỉ bất biến nông: thành phần là `List` thay đổi được thì `hashCode` vẫn đổi theo. Nên `record` làm key an toàn khi các thành phần cũng bất biến.

**Sai lầm hay gặp:** Ghi đè `equals` mà quên `hashCode` (hoặc ngược lại), hoặc dùng entity JPA có id tự sinh làm key trước khi lưu (id đổi từ `null` sang số, `hashCode` đổi theo).

## 3. Vì sao `String` bất biến, và nối chuỗi trong vòng lặp đắt thế nào?

**Câu hỏi:** Nối chuỗi bằng `+=` 50.000 lần chậm hơn `StringBuilder` hàng trăm lần. Vì sao, và Java thiết kế `String` bất biến để được lợi gì?

**Gợi ý suy luận:**
- Nếu `String` không bao giờ đổi thì nhiều thread, nhiều biến cùng trỏ vào nó có cần lock không?
- `hashCode` của một object không đổi có cần tính lại không?
- Mỗi lần "sửa" một object bất biến thì thực chất tạo ra gì, và sao chép bao nhiêu ký tự?

**Lập luận:** Vì `String` bất biến, một object `String` có thể được chia sẻ tự do: nhiều thread, nhiều biến và string pool cùng trỏ một bản mà không cần lock, vì không ai sửa được nó. Cũng vì nội dung không đổi, `hashCode` chỉ tính một lần rồi cache, nên `String` làm key `HashMap` rất rẻ. Bất biến còn là điều kiện an toàn: đường dẫn file hay URL đã kiểm tra không thể bị đổi giữa lúc kiểm tra và lúc dùng. Cái giá là mỗi lần "sửa" phải tạo một `String` mới và sao chép toàn bộ ký tự cũ sang. Vì vậy `s += x` trong vòng lặp n lần sao chép 1 + 2 + ... + n ký tự, tổng O(n²), nên 50.000 lần mới chậm hàng trăm lần so với `StringBuilder` chỉ nối vào một mảng có thể nới rộng (O(n) khấu hao). Điểm dễ nhầm là tin compiler tự tối ưu mọi phép `+`; nó chỉ gộp trong một biểu thức. Nên quy tắc là nối vài chuỗi cố định thì dùng `+`, nối trong vòng lặp hay số lần chưa biết thì dùng `StringBuilder`.

**Đáp án ngắn:** `String` bất biến để chia sẻ an toàn giữa thread, cache được `hashCode`, dùng được string pool và an toàn bảo mật. Hệ quả là nối chuỗi trong vòng lặp O(n²), nên dùng `StringBuilder`.

**Nhớ:** Bất biến = chia sẻ không cần lock, đổi lại mỗi lần sửa tạo bản mới.

**Ví dụ:**

```java
int n = 50_000;
String s = "";
// moi lan tao String moi, sao chep toan bo
for (int i = 0; i < n; i++) s += "x";
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) sb.append("x");       // ghi them vao mang char co san
String t = "abc"; String u = t.toUpperCase();
System.out.println("t sau toUpperCase: " + t + " | ket qua moi: " + u);
```

```text
n=50000 | += : 812 ms | StringBuilder: 3 ms | cung do dai: true
t sau toUpperCase: abc | ket qua moi: ABC
```

_Đã chạy thử trên JDK 11 (thời gian thay đổi theo máy, tỉ lệ mới quan trọng)._ Gấp đôi `n` thì `+=` tốn khoảng gấp bốn, `StringBuilder` chỉ gấp đôi.

**Hỏi xoáy 1:** Compiler không tối ưu `+` thành `StringBuilder` à?
**Vì sao hỏi tiếp:** Nếu O(n²) là thật thì người ta sẽ hỏi ngay vì sao compiler không tự sửa, nên cần biết giới hạn của tối ưu đó.
**Gợi ý suy luận:** Compiler nhìn thấy gì trong một biểu thức, và trong một vòng lặp thì nó tạo builder ở đâu?
**Lập luận:** Compiler chỉ gộp trong **một biểu thức**. Trong vòng lặp, mỗi lần lặp là một biểu thức riêng nên vẫn tạo builder và `String` mới, tổng O(n²). Từ Java 9 nối chuỗi dùng `invokedynamic` nhanh hơn một hằng số, không đổi bản chất.

**Hỏi xoáy 2:** `StringBuilder` khác `StringBuffer` thế nào?
**Vì sao hỏi tiếp:** Đã chọn builder thay vì `+`, thì chọn loại nào trong hai cái tên gần giống nhau?
**Gợi ý suy luận:** Một builder thường được mấy thread dùng? Đồng bộ từng method có đáng không?
**Lập luận:** `StringBuffer` đồng bộ từng method, tốn chi phí lock. Nhưng builder thường chỉ một thread dùng nên lock thừa. Vậy mặc định dùng `StringBuilder`.

**Sai lầm hay gặp:** Lưu mật khẩu trong `String` (nằm trong pool/heap đến khi GC, không xóa được); dùng `char[]` rồi ghi đè sau khi dùng.

## 4. Java truyền tham số theo giá trị hay theo tham chiếu?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Trong hàm tôi `list.add(...)` thì bên ngoài thấy thay đổi, nhưng `list = new ArrayList<>()` thì bên ngoài không thấy. Vậy Java truyền theo giá trị hay tham chiếu?

**Gợi ý suy luận:**
- Biến kiểu object chứa gì (object hay địa chỉ)?
- Khi gọi hàm, cái gì được sao chép vào tham số?
- Sửa "qua" địa chỉ khác gán địa chỉ mới cho bản sao ở chỗ nào?

**Lập luận:** Khi gọi hàm, JVM luôn sao chép **giá trị của biến** vào tham số; không có chế độ nào khác. Với số, giá trị đó là chính con số; với object, giá trị đó là địa chỉ, nên hàm nhận một bản sao của địa chỉ và cả hai biến cùng trỏ vào một object. Vì vậy `list.add(...)` đi qua địa chỉ tới object chung, và bên ngoài thấy thay đổi. Còn `list = new ArrayList<>()` chỉ gán lại bản sao địa chỉ bên trong hàm sang object mới, biến của người gọi vẫn giữ địa chỉ cũ nên không thấy gì. Điểm dễ nhầm là ví dụ đầu: "sửa được object bên ngoài" trông giống truyền tham chiếu, nhưng truyền tham chiếu thật phải cho phép hàm đổi chính biến của người gọi, điều Java không có. Hệ quả khi review: hàm nhận object có thể sửa trạng thái object đó (cần sao chép phòng thủ nếu không muốn), nhưng không thể thay object của người gọi.

**Đáp án ngắn:** Java luôn truyền theo giá trị; với object, giá trị đó là bản sao của địa chỉ. Truyền tham chiếu thật (hàm đổi được biến của người gọi) Java không có.

**Nhớ:** Sửa nội dung qua địa chỉ thì thấy ở ngoài, gán địa chỉ mới thì không.

**Ví dụ:**

```java
static void changeContent(List<String> l) { l.add("them"); }
static void changeReference(List<String> l) { l = new ArrayList<>(); l.add("moi"); }
static void changeInt(int v) { v = 99; }
// main:
List<String> items = new ArrayList<>(List.of("goc"));
changeContent(items);     System.out.println("sau changeContent: " + items);
changeReference(items);   System.out.println("sau changeReference: " + items);
int v = 1; changeInt(v); System.out.println("sau changeInt: " + v);
```

```text
sau changeContent: [goc, them]
sau changeReference: [goc, them]
sau changeInt: 1
```

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Hàm `swap(a, b)` cho hai object viết được không?
**Vì sao hỏi tiếp:** Hoán đổi là phép thử kinh điển để phân biệt "theo giá trị" với "theo tham chiếu" thật.
**Gợi ý suy luận:** `swap` nhận gì: biến của người gọi hay bản sao địa chỉ? Hoán đổi hai bản sao có ảnh hưởng biến gốc không?
**Lập luận:** Hàm chỉ có hai bản sao địa chỉ, hoán đổi chúng không đụng tới biến của người gọi. Vì vậy không viết được `swap` thật. Muốn hoán đổi phải sửa **nội dung** hai object hoặc trả về cặp mới.

**Sai lầm hay gặp:** Nghĩ "object truyền theo tham chiếu" nên viết `list = new ArrayList<>()` trong hàm và kỳ vọng người gọi thấy; hậu quả là bug im lặng, không có lỗi biên dịch.

## 5. Abstract class hay interface: chọn cái nào và vì sao?

**Câu hỏi:** Từ Java 8 interface đã có `default` method. Vậy abstract class và interface còn khác nhau ở đâu, và khi thiết kế tôi chọn cái nào?

**Gợi ý suy luận:**
- Interface trả lời "làm được gì", abstract class trả lời "là loại gì": mỗi cái hợp với tình huống nào?
- Nếu cho inheritance **trạng thái** từ nhiều class thì hai field cùng tên xử lý ra sao?
- `default` method thêm khả năng nào mà field thể hiện thì không?

**Lập luận:** Java chỉ cho kế thừa một class vì kế thừa **trạng thái** từ nhiều class gây mơ hồ (vấn đề kim cương: hai cha có cùng field thì con lấy cái nào). Interface không có state thể hiện, nên cài nhiều interface cùng lúc không gây mơ hồ về dữ liệu; vì vậy nó thích hợp để biểu diễn một "contract" mà nhiều class không liên quan cùng tuân theo. Abstract class có field và constructor nên biểu diễn "một loại" chia sẻ cả trạng thái lẫn mã, đổi lại mỗi class chỉ có một cha. `default` method ra đời để interface tiến hóa (thêm method mà không phá các class đã cài), chứ không để biến interface thành abstract class, vì nó vẫn không giữ state. Điểm dễ nhầm là nghĩ Java 8 xóa ranh giới hai thứ; ranh giới vẫn là state và constructor. Khi hai `default` trùng tên từ hai interface, class buộc phải tự giải quyết xung đột. Từ đó quy tắc thiết kế: mặc định chọn interface cho khả năng/contract, chỉ chọn abstract class khi cần chia sẻ state hoặc dựng template method.

**Đáp án ngắn:** Interface là contract, nhiều cái cùng cài, không giữ state thể hiện. Abstract class có field, constructor, chỉ một superclass. Mặc định chọn interface; chọn abstract class khi cần chia sẻ trạng thái hoặc template method.

**Nhớ:** Một superclass vì tránh mơ hồ trạng thái; nhiều interface vì chỉ là contract.

**Ví dụ:** hai `default` method trùng tên buộc bạn phải giải quyết xung đột.

```java
interface A { default String hi() { return "A"; } }
interface B { default String hi() { return "B"; } }
class C implements A, B { }          // khong bien dich duoc
```

```text
D.java:3: error: types A and B are incompatible;
class C implements A, B { }
^
  class C inherits unrelated defaults for hi() from types A and B
```

_Đã chạy thử trên JDK 11 (thông báo lỗi thật của compiler)._ Cách sửa: ghi đè trong `C` và chọn tường minh `A.super.hi()` hoặc `B.super.hi()`.

**Hỏi xoáy 1:** Nếu có `default` rồi thì interface khác abstract class chỗ nào?
**Vì sao hỏi tiếp:** `default` làm mờ ranh giới giữa hai thứ, nên cần chỉ ra điểm khác còn lại.
**Gợi ý suy luận:** Interface có field thể hiện hay constructor không? `default` dùng để làm gì?
**Lập luận:** Interface vẫn không giữ state thể hiện và không có constructor, nên ranh giới "trạng thái" vẫn còn. `default` chỉ để thêm method mới mà không phá các class đã cài.

**Hỏi xoáy 2:** `sealed` thêm gì?
**Vì sao hỏi tiếp:** Khi đã chọn cấu trúc inheritance, người ta hỏi có đóng được tập subclass để compiler kiểm tra giúp không.
**Gợi ý suy luận:** Nếu biết chắc mọi subclass thì `switch` cần nhánh `default` không?
**Lập luận:** (Java 17) `sealed ... permits` giới hạn tập subclass, nên compiler biết `switch` pattern đã đủ trường hợp chưa. Minh họa: `sealed interface Shape permits Circle, Square {}`.

**Sai lầm hay gặp:** Dùng abstract class chỉ để "gom code dùng chung" rồi bị lock không kế thừa thêm được; ưu tiên composition + interface.

## 6. Overload và override: ai quyết định gọi method nào, và lúc nào?

**Câu hỏi:** `print(Object)` và `print(String)` cùng có, tôi truyền một biến `Object` đang giữ chuỗi mà nó gọi `print(Object)`. Còn `a.sound()` với `a` là `Animal` giữ `Dog` thì lại gọi bản của `Dog`. Vì sao hai trường hợp khác nhau?

**Gợi ý suy luận:**
- Lúc biên dịch compiler biết kiểu nào của đối số: khai báo hay thật?
- Lúc chạy JVM chọn method dựa vào kiểu nào của object (gợi ý: bảng method ảo)?
- `static` method có gắn với object cụ thể không?

**Lập luận:** Hai trường hợp khác nhau vì được quyết định ở hai thời điểm với hai nguồn thông tin khác nhau. Compiler chỉ biết kiểu **khai báo** của biến, nên với overload nó chọn method ngay lúc biên dịch theo kiểu đó: biến khai báo `Object` thì ra `print(Object)`, dù thực chất đang giữ `String`. Override là polymorphism: JVM chọn lúc chạy theo kiểu **thật** của object, qua bảng method ảo, nên `Animal a = new Dog()` vẫn gọi `sound()` của `Dog`. `static` không gắn với object, nên không tham gia polymorphism: nó chỉ bị che (hide) và được chọn theo kiểu khai báo như overload. Điểm dễ nhầm là tưởng overload cũng "thông minh" theo kiểu thật, đặc biệt khi truyền biến `Object` hay phần tử của `List<Object>`. Hệ quả khi review: muốn hành vi theo kiểu thật phải dùng override (hoặc `instanceof`/pattern matching), không dựa vào overload.

**Đáp án ngắn:** Overload chọn lúc biên dịch theo kiểu khai báo của đối số; override chọn lúc chạy theo kiểu thật của object. `static` không override được, chỉ bị che.

**Nhớ:** Overload = biên dịch + kiểu khai báo; override = chạy + kiểu thật. Override cần cùng chữ ký, kiểu trả về hiệp biến, không thu hẹp quyền truy cập, không ném thêm checked exception rộng hơn.

**Ví dụ:**

```java
static class Animal { String sound() { return "..."; } static String kind() { return "Animal"; } }
static class Dog extends Animal { @Override String sound() { return "Gau"; } static String kind() { return "Dog"; } }
static void print(Object o) { System.out.println("print(Object)"); }
static void print(String s) { System.out.println("print(String)"); }
static void speak(Animal a) { System.out.println("speak(Animal)"); }
static void speak(Dog d)    { System.out.println("speak(Dog)"); }
// main
Animal a = new Dog();
System.out.println("override: " + a.sound());
Object o = "chuoi";
print(o); print("chuoi");
speak(a); speak((Dog) a);
System.out.println("static: " + ((Animal) new Dog()).kind());
```

```text
override (chon luc CHAY, theo kieu that): Gau
print(Object)
print(String)
speak(Animal)
speak(Dog)
static khong override: Animal
```

_Đã chạy thử trên JDK 11._ `print(o)` ra `print(Object)` dù `o` thực chất là `String`, vì overload dựa trên kiểu khai báo `Object`.

**Hỏi xoáy 1:** `@Override` có tác dụng gì nếu không có nó vẫn override?
**Vì sao hỏi tiếp:** Biết override và overload khác nhau thì phải hỏi làm sao tránh nhầm hai thứ đó khi gõ sai chữ ký.
**Gợi ý suy luận:** Viết `equals(Foo)` thay vì `equals(Object)` thì compiler coi đó là gì?
**Lập luận:** Sai chữ ký thì method không còn override mà thành một overload mới, compiler không báo gì. `@Override` bắt compiler kiểm tra thật sự đang override, sai thì báo lỗi ngay.

**Sai lầm hay gặp:** Viết `equals(Foo other)` rồi thắc mắc `HashSet` không hoạt động đúng: đó là overload, không phải override.

## 7. Checked và unchecked exception: bắt buộc xử lý có tốt không?

**Câu hỏi:** Vì sao Java bắt tôi `catch` hoặc `throws` một số ngoại lệ mà không bắt các ngoại lệ khác? Và khi đóng tài nguyên, lỗi của `close()` có thể làm mất lỗi gốc là thế nào?

**Gợi ý suy luận:**
- Sự cố nào là bên ngoài và phục hồi được (I/O, mạng), sự cố nào là lỗi lập trình?
- Nếu bắt buộc khai báo thì chữ ký method và lambda bị ảnh hưởng ra sao?
- Trong `finally`, nếu `close()` ném lỗi thì lỗi đang bay (lỗi nghiệp vụ) đi đâu?

**Lập luận:** Checked exception dùng hệ thống kiểu để buộc người gọi đối mặt với sự cố có thể xảy ra mà phục hồi được (I/O, mạng): chúng là con của `Exception` nhưng không phải `RuntimeException`, nên compiler bắt phải `catch` hoặc `throws`. Cái giá là `throws` lan ra mọi tầng và lambda/stream không ném được checked exception, vì vậy nhiều codebase ưu tiên unchecked rồi xử lý tập trung ở biên. Unchecked (`RuntimeException`, `Error`) dành cho lỗi lập trình hoặc lỗi không phục hồi được, nên bắt buộc xử lý sẽ chỉ sinh ra `catch` rỗng. Phần "mất lỗi gốc" đến từ việc đóng tài nguyên bằng tay: nếu `close()` trong `finally` cũng ném lỗi, lỗi mới thay thế lỗi gốc và dấu vết điều tra biến mất. `try-with-resources` giữ lỗi chính, gắn lỗi của `close()` vào `getSuppressed()`. Điểm dễ nhầm là nghĩ checked là "an toàn hơn"; thực tế `catch` rồi nuốt còn tệ hơn để lỗi nổi lên. Khi review: không nuốt exception, giữ `cause` khi bọc, và dùng `try-with-resources` cho mọi tài nguyên đóng được.

**Đáp án ngắn:** Checked bắt buộc `catch`/`throws`, dành cho sự cố bên ngoài phục hồi được; unchecked là lỗi lập trình. Không nuốt ngoại lệ, giữ `cause` khi bọc, đóng tài nguyên bằng `try-with-resources`.

**Nhớ:** `try-with-resources` giữ cả hai lỗi; đóng tay có thể làm mất lỗi gốc.

**Ví dụ:** bẫy khi đóng tài nguyên bằng tay: lỗi của `close()` **che mất** lỗi nghiệp vụ gốc, còn `try-with-resources` giữ cả hai.

```java
static class Res implements AutoCloseable {
    final String name; Res(String n) { name = n; System.out.println("mo " + n); }
    @Override public void close() { System.out.println("dong " + name); throw new IllegalStateException("loi khi dong " + name); }
}
// Cach thu cong
Res r = new Res("R1");
try { throw new RuntimeException("loi nghiep vu"); } finally { r.close(); }
// try-with-resources
try (Res r2 = new Res("R2")) { throw new RuntimeException("loi nghiep vu"); }
catch (Exception e) { System.out.println("bat duoc: " + e.getMessage() + " | suppressed=" + e.getSuppressed()[0].getMessage()); }
```

```text
mo R1
dong R1
[thu cong] bat duoc: loi khi dong R1 | suppressed=0
mo R2
dong R2
[try-with-resources] bat duoc: loi nghiep vu | suppressed=loi khi dong R2
unchecked: NumberFormatException la RuntimeException? true
checked: IOException la RuntimeException? false
giu cause: goc
```

_Đã chạy thử trên JDK 11._ Dòng 3 cho thấy cách thủ công mất hẳn "loi nghiep vu"; dòng 6 cho thấy `try-with-resources` giữ lỗi chính và gắn lỗi đóng vào `getSuppressed()`.

**Hỏi xoáy 1:** Khi nào nên bọc checked thành unchecked?
**Vì sao hỏi tiếp:** Nếu checked lan khắp nơi gây phiền thì phải hỏi khi nào được phép "hạ cấp" nó.
**Gợi ý suy luận:** Tầng này có làm gì hợp lý với lỗi không? Ai xử lý cuối cùng?
**Lập luận:** Khi tầng này không xử lý được và chỉ muốn lỗi nổi lên tới chỗ xử lý tập trung (ví dụ `@ControllerAdvice`), bọc lại cho gọn. Phải bọc bằng `new RuntimeException("ngữ cảnh", e)` để giữ `cause` (dòng cuối output).

**Hỏi xoáy 2:** `catch (Exception e) { }` rỗng sai ở đâu?
**Vì sao hỏi tiếp:** Đây là cách "xử lý" sai phổ biến nhất khi bị checked exception làm phiền.
**Gợi ý suy luận:** Sau khi nuốt lỗi, chương trình ở trạng thái nào và còn dấu vết nào?
**Lập luận:** Nuốt lỗi khiến chương trình chạy tiếp với trạng thái hỏng mà không còn dấu vết điều tra. Tối thiểu phải log kèm stack trace hoặc ném lại.

**Sai lầm hay gặp:** Log và ném lại cùng một lỗi ở mọi tầng, gây log trùng lặp khó đọc; chỉ log một lần, ở nơi xử lý cuối.

## 8. `final`, `finally`, `finalize`: ba từ giống nhau, ba bản chất khác nhau

**Câu hỏi:** Hàm có `try { return 1; } finally { return 2; }` trả mấy, và còn `try { return x; } finally { x = 99; }` thì sao? Phân biệt `final`, `finally`, `finalize` thế nào?

**Gợi ý suy luận:**
- `final` thuộc thời điểm nào: biên dịch hay chạy? Nó cấm gán lại biến hay cấm đổi nội dung object?
- `finally` điều khiển thread lúc nào, và khi `return` thì giá trị trả về được chốt lúc nào?
- `finalize` do ai gọi, có biết khi nào gọi không?

**Lập luận:** Ba từ chỉ giống nhau về chữ, còn bản chất ở ba tầng khác nhau. `final` là ràng buộc lúc biên dịch: biến không gán lại được (nhưng nội dung object trỏ tới vẫn đổi được), method không override, class không kế thừa. `finally` là control flow lúc chạy: khối này chạy sau try/catch kể cả khi có `return`. Chi tiết quyết định kết quả là khi gặp `return x`, giá trị của `x` được chốt (sao chép) trước khi `finally` chạy, nên sửa `x` trong `finally` không đổi giá trị trả về (`g() = 1`). Ngược lại, `return` ngay trong `finally` thay thế hoàn toàn giá trị cũ (`f() = 2`) và còn nuốt luôn exception đang bay, nên là kiểu code phải tránh. `finalize` là hook của GC, không đảm bảo lúc nào chạy hay có chạy không, nên đã lỗi thời; thay bằng `try-with-resources` hoặc `Cleaner`. Điểm dễ nhầm là nghĩ `finally` sửa được kết quả đã `return`, trong khi chỉ `return` trong `finally` mới làm được.

**Đáp án ngắn:** `final` là cấm đổi lúc biên dịch, `finally` là khối luôn chạy khi rời try, `finalize` là hook GC đã lỗi thời (thay bằng `try-with-resources`/`Cleaner`).

**Nhớ:** `final` lock tham chiếu chứ không lock nội dung; không `return`/`throw` trong `finally`.

**Ví dụ:**

```java
@SuppressWarnings("finally")
static int f() { try { return 1; } finally { return 2; } }
static int g() { int x = 1; try { return x; } finally { x = 99; } }
// f() = 2   g() = 1
final int[] arr = {1, 2}; arr[0] = 100;   // hop le, chi cam gan lai arr
```

```text
f() = 2
g() = 1
finally van chay khi co exception
da bat: x
final tham chieu van doi duoc noi dung: [100, 2]
```

_Đã chạy thử trên JDK 11._ `f()` trả 2 vì `return` trong `finally` ghi đè; `g()` trả 1 vì giá trị trả về đã được **chốt** (sao chép) trước khi `finally` chạy.

**Hỏi xoáy 1:** `finally` có luôn chạy không?
**Vì sao hỏi tiếp:** Sau khi biết `finally` chạy cả khi `return` và exception, câu tự nhiên là "có ngoại lệ nào không".
**Gợi ý suy luận:** Cái gì có thể chấm dứt JVM hoặc thread ngay giữa `try`?
**Lập luận:** `finally` chạy khi thread còn sống để thực hiện. Nếu JVM kết thúc trong `try` (`System.exit`, crash, `kill -9`) hoặc thread bị treo vô hạn thì không chạy. Nên gần như luôn, không tuyệt đối.

**Sai lầm hay gặp:** Đặt `return` hoặc `throw` trong `finally` làm mất ngoại lệ gốc.

## 9. `ArrayList` hay `LinkedList`: O(1) trên giấy có thắng thực tế không?

**Câu hỏi:** `LinkedList` chèn đầu O(1) còn `ArrayList` O(n), vậy sao trong thực tế `ArrayList` hầu như luôn thắng, và `get(i)` của `LinkedList` chậm cả trăm lần?

**Gợi ý suy luận:**
- `ArrayList` bố trí memory liền khối: truy cập chỉ số tốn bao nhiêu phép tính?
- `LinkedList` muốn tới phần tử thứ `i` phải làm gì, mỗi bước là một con trỏ nhảy ở đâu trong memory?
- CPU nạp sẵn dữ liệu kế bên vào cache: bố trí nào hưởng lợi?

**Lập luận:** Big-O chỉ đếm số bước, còn máy thật tốn thời gian theo cách dữ liệu nằm trong memory. `ArrayList` là mảng liền khối, nên `get(i)` chỉ là phép cộng địa chỉ, và các phần tử kế bên đã được nạp sẵn vào CPU cache. `LinkedList` gồm các nút rải rác trên heap, nên tới phần tử thứ `i` phải đi qua `i` con trỏ, mỗi bước có thể là một cache miss đắt gấp trăm lần một phép tính. Việc chèn giữa của `LinkedList` chỉ O(1) khi đã đứng sẵn ở vị trí; nhưng tìm được vị trí đó lại tốn O(n), nên tổng không hơn `ArrayList`. Trong khi đó `ArrayList` chèn giữa phải dịch phần tử, nhưng đó là copy mảng liền khối, rất nhanh nhờ phần cứng. Thêm vào đó mỗi nút của `LinkedList` mang overhead (con trỏ trước/sau, header object) làm tốn memory và áp lực GC. Điểm dễ nhầm là chọn `LinkedList` vì "chèn O(1)" mà quên chi phí tìm vị trí. Mặc định dùng `ArrayList`, và `ArrayDeque` cho queue/stack.

**Đáp án ngắn:** `ArrayList`: `get(i)` O(1), thêm cuối O(1) khấu hao, chèn giữa O(n). `LinkedList`: chèn khi đã có vị trí O(1) nhưng tìm O(n) và nhiều cache miss. Mặc định dùng `ArrayList` (hoặc `ArrayDeque` cho queue/stack).

**Nhớ:** Độ phức tạp trên giấy bỏ qua chi phí cache và tìm vị trí.

**Ví dụ:**

```java
List<Integer> al = new ArrayList<>(), ll = new LinkedList<>();
for (int i = 0; i < 100_000; i++) { al.add(i); ll.add(i); }
// truy cap ngau nhien 100000 lan
for (int i = 0; i < n; i++) s += al.get(i);   // vs ll.get(i)
// chen dau 50000 lan
for (int i = 0; i < 50_000; i++) a2.add(0, i);  // vs l2.add(0, i)
```

```text
get(i) x100000: ArrayList=11 ms, LinkedList=4025 ms
add(0,x) x50000: ArrayList=225 ms, LinkedList=14 ms
```

_Đã chạy thử trên JDK 11 (số tuyệt đối thay đổi theo máy)._ `get(i)` của `LinkedList` chậm hơn hơn 300 lần (mỗi lần duyệt nửa danh sách). Chèn đầu thì ngược lại: `LinkedList` thắng vì không phải dịch cả mảng.

**Hỏi xoáy 1:** Vậy khi nào `LinkedList` đáng dùng?
**Vì sao hỏi tiếp:** Nếu `ArrayList` thắng gần hết thì phải xác định chỗ còn lại của `LinkedList`.
**Gợi ý suy luận:** Thao tác nào của `LinkedList` thực sự O(1) không kèm chi phí tìm? Còn có cấu trúc nào làm việc đó tốt hơn?
**Lập luận:** Chỉ khi thao tác chủ yếu ở đầu/cuối (nhưng `ArrayDeque` làm tốt hơn) hoặc chèn giữa qua `ListIterator` trên danh sách rất lớn. Đừng chọn theo "O(1) chèn" mà quên chi phí tìm vị trí và memory (mỗi nút ~24-40 byte overhead).

**Hỏi xoáy 2:** Thêm 2 triệu phần tử cuối, ai nhanh hơn?
**Vì sao hỏi tiếp:** Với thao tác cả hai cùng O(1), người phỏng vấn kiểm tra bạn có kết luận từ số đo nhiễu không.
**Gợi ý suy luận:** Mỗi bên tốn thêm gì (resize mảng, cấp phát nút)? Một lần đo có đủ để kết luận không?
**Lập luận:** Cả hai cùng bậc, kết quả gần nhau và nhiễu (resize mảng với `ArrayList`, cấp phát nút với `LinkedList`). Không kết luận từ một lần đo; dùng JMH khi cần số liệu thật (xem [JIT và Benchmark](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-19-jit-benchmark.md)).

**Sai lầm hay gặp:** Dùng `for (i...) list.get(i)` trên `LinkedList`: biến O(n) thành O(n²).

## 10. `HashMap`, `Hashtable`, `TreeMap`, `LinkedHashMap`: đánh đổi giữa tốc độ, thứ tự và thread-safe

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Vì sao `HashMap` cho key `null` còn `Hashtable`, `ConcurrentHashMap`, `TreeMap` thì ném `NullPointerException`? Và khi in sáu phần tử thì thứ tự của mỗi map khác nhau ra sao?

**Gợi ý suy luận:**
- `TreeMap` sắp xếp bằng cách nào, và `null` có so sánh được không?
- Nếu `get` trả `null` thì có thể là hai nghĩa nào, và khi nhiều thread cùng thao tác có phân biệt an toàn được không?
- Thứ tự duyệt `HashMap` do cái gì quyết định?

**Lập luận:** Mỗi map là một cách đánh đổi giữa tốc độ, thứ tự và thread-safe, và các ràng buộc về `null` suy ra từ cách nó hoạt động. `HashMap` bố trí theo hash (O(1)), nên thứ tự duyệt do giá trị hash quyết định, không được dựa vào; nó cho một key `null` bằng cách xếp vào bucket 0. `TreeMap` giữ cây cân bằng theo `compareTo` (O(log n), có thứ tự), mà `null` không so sánh được với key khác nên bị cấm. `Hashtable` và `ConcurrentHashMap` cấm `null` vì `get` trả `null` sẽ mơ hồ giữa "không có key" và "giá trị là null", và khi nhiều thread cùng thao tác thì không kiểm tra `containsKey` rồi `get` một cách an toàn được. `LinkedHashMap` thêm một danh sách liên kết nối các mục để giữ thứ tự chèn (hoặc truy cập). Điểm dễ nhầm là đoán `Hashtable` "an toàn hơn" nên dùng cho multithreading, trong khi nó lock toàn bảng và lỗi thời. Khi chọn: cần thứ tự thì `LinkedHashMap`/`TreeMap`, cần multithreading thì `ConcurrentHashMap`, còn lại là `HashMap`.

**Đáp án ngắn:** `HashMap`: không đồng bộ, cho một key `null`, O(1). `LinkedHashMap`: giữ thứ tự chèn/truy cập. `TreeMap`: sắp xếp theo key. `Hashtable`: cũ, lock toàn bảng, không dùng. Multithreading dùng `ConcurrentHashMap`.

**Nhớ:** Chọn map theo nhu cầu thứ tự và thread; đừng tin thứ tự của `HashMap`.

**Ví dụ:**

```java
Map<String, Integer> hm = new HashMap<>(); hm.put(null, 1);          // hop le
// NullPointerException
new Hashtable<String, Integer>().put(null, 1);
// NullPointerException
new ConcurrentHashMap<String, Integer>().put("k", null);
// NullPointerException
new TreeMap<String, Integer>().put(null, 1);
// cung 6 khoa chen theo thu tu: banana, apple, cherry, date, elderberry, fig
```

```text
HashMap cho null key: 1
Hashtable.put(null,..) -> NullPointerException
ConcurrentHashMap.put(k,null) -> NullPointerException
TreeMap.put(null,..) -> NullPointerException
HashMap       : [banana, date, apple, cherry, fig, elderberry]
LinkedHashMap : [banana, apple, cherry, date, elderberry, fig]
TreeMap       : [apple, banana, cherry, date, elderberry, fig]
```

_Đã chạy thử trên JDK 11._ Thứ tự của `HashMap` hoàn toàn do hash quyết định (có thể khác giữa các phiên bản Java), không được dựa vào.

**Hỏi xoáy 1:** Làm LRU cache bằng gì?
**Vì sao hỏi tiếp:** Thứ tự truy cập của `LinkedHashMap` là ứng dụng thực tế nhất của việc có thứ tự.
**Gợi ý suy luận:** LRU cần biết mục nào dùng lâu nhất: map nào giữ được thứ tự truy cập? Khi vượt dung lượng thì ai xóa?
**Lập luận:** `LinkedHashMap` với `accessOrder=true` đưa mục vừa `get` lên cuối, nên mục cũ nhất nằm đầu; ghi đè `removeEldestEntry` để xóa nó khi vượt dung lượng. Không đồng bộ: bọc `Collections.synchronizedMap` hoặc dùng Caffeine.

**Sai lầm hay gặp:** Tin vào thứ tự duyệt `HashMap` (test pass trên máy mình rồi sai ở Java khác); dùng `HashMap` chung giữa nhiều thread.

## 11. Stack và heap: biến nằm đâu, và `StackOverflowError` khác `OutOfMemoryError` thế nào?

**Câu hỏi:** Đệ quy không có điểm dừng ném `StackOverflowError`, còn giữ mãi mảng lớn thì ném `OutOfMemoryError`. Hai vùng nhớ này khác nhau ở đâu?

**Gợi ý suy luận:**
- Dữ liệu gắn với gọi hàm sống tới khi nào, và ai giải phóng nó?
- Object sống tới khi nào, và ai dọn?
- Mỗi thread có vùng riêng hay chung?

**Lập luận:** Stack và heap khác nhau ở gắn với cái gì. Stack gắn với lời gọi hàm: vào hàm thì cấp một khung (biến cục bộ, tham chiếu, địa chỉ trả về), ra hàm thì giải phóng ngay theo LIFO, nên rất rẻ và mỗi thread có một stack riêng. Vì vậy đệ quy không điểm dừng chồng khung mãi cho đến khi cạn kích thước stack: `StackOverflowError`. Heap gắn với khả năng truy cập: object sống chừng nào còn đường tham chiếu tới nó, do GC dọn, và chia sẻ giữa mọi thread. Khi ta giữ quá nhiều object còn tới được mà GC không thu hồi, heap đầy: `OutOfMemoryError: Java heap space`. Điểm dễ nhầm là nghĩ tăng `-Xmx` chữa được `StackOverflowError` (stack chỉnh bằng `-Xss`, và thường lỗi nằm ở đệ quy thiếu điểm dừng), hoặc nghĩ `OutOfMemoryError` luôn do heap nhỏ trong khi thường là rò rỉ tham chiếu. Chẩn đoán: stack trace lặp một chuỗi hàm là đệ quy; heap dump cho thấy ai đang giữ object.

**Đáp án ngắn:** Stack: khung gọi hàm, biến cục bộ nguyên thủy và tham chiếu, mỗi thread một cái. Heap: object và mảng, dùng chung, do GC dọn. Đệ quy quá sâu gây `StackOverflowError`, heap đầy gây `OutOfMemoryError`.

**Nhớ:** Stack theo lifecycle call, heap theo khả năng truy cập.

**Ví dụ:**

```java
static int depth = 0;
static void recurse() { depth++; recurse(); }
try { recurse(); } catch (StackOverflowError e) { System.out.println("sau ~" + depth); }

List<byte[]> keep = new ArrayList<>();
try { while (true) keep.add(new byte[1024 * 1024]); }      // chay voi -Xmx32m
catch (OutOfMemoryError e) { System.out.println("OOM sau khi giu " + keep.size() + " MB: " + e.getMessage()); }
```

```text
StackOverflowError o do sau ~10703 (phu thuoc -Xss va kich thuoc frame)
OOM sau khi giu 13 MB: Java heap space
```

_Đã chạy thử trên JDK 11 (`java -Xmx32m`). Độ sâu 10703 phụ thuộc máy và JIT._ Với `-Xmx32m` chỉ giữ được 13 MB trước khi OOM vì heap còn chia vùng young/old và GC cần chỗ làm việc.

**Hỏi xoáy 1:** Biến cục bộ `int x = 5` nằm đâu? Còn `Integer y = 5`?
**Vì sao hỏi tiếp:** Biết hai vùng nhớ rồi thì kiểm tra bằng ví dụ cụ thể phân biệt nguyên thủy và object.
**Gợi ý suy luận:** Biến cục bộ nằm trong khung nào? `Integer` là nguyên thủy hay object?
**Lập luận:** `x` là biến cục bộ nguyên thủy nên nằm trong khung stack. `y` là tham chiếu nằm trong stack, trỏ tới object `Integer` trên heap (hoặc buffer). JIT có thể dùng escape analysis để cấp trên stack hoặc loại bỏ, nhưng đó là tối ưu, không phải ngữ nghĩa.

**Hỏi xoáy 2:** Chỉnh kích thước thế nào?
**Vì sao hỏi tiếp:** Hiểu hai lỗi rồi thì hỏi cách cấu hình để chữa.
**Gợi ý suy luận:** Mỗi vùng có tham số riêng nào? Heap co giãn lúc chạy có tốn kém không?
**Lập luận:** Stack mỗi thread chỉnh bằng `-Xss`; heap bằng `-Xms/-Xmx`. Đặt `-Xms = -Xmx` trên server để tránh co giãn heap lúc chạy.

**Sai lầm hay gặp:** Tăng `-Xss` để "chữa" đệ quy sâu thay vì chuyển sang vòng lặp/giới hạn độ sâu; nhân với hàng nghìn thread thì cạn memory.

## 12. Garbage Collection: vì sao có GC mà vẫn memory leak?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Java có GC tự dọn rác, vậy mà cache `static` vẫn làm chương trình `OutOfMemoryError`. GC thực sự thu hồi cái gì?

**Gợi ý suy luận:**
- GC quyết định thu hồi theo tiêu chí "còn cần" hay "còn tới được"?
- Những thứ nào luôn được coi là điểm xuất phát (GC root)?
- Phần lớn object sống lâu hay chết sớm, và điều đó gợi ý cách tổ chức heap thế nào?

**Lập luận:** GC thu hồi object không còn **tới được** từ các GC root (biến cục bộ trên stack, field `static`, thread đang chạy...), chứ không biết object còn **cần** hay không. Vì vậy nếu một tham chiếu vô tình còn giữ, như cache tĩnh không giới hạn, listener chưa hủy đăng ký hay `ThreadLocal` trong thread pool, thì object vẫn "tới được" và không bao giờ bị thu hồi dù chẳng còn ai dùng: đó là rò rỉ trong ngôn ngữ có GC. Do đó "có GC" nghĩa là hết lo giải phóng thủ công, chứ không hết lo lifecycle của tham chiếu. Về hiệu năng, vì phần lớn object chết rất sớm (giả thuyết thế hệ), heap được chia thành Young thu hồi thường xuyên và rẻ, Old hiếm hơn và đắt hơn. Điểm dễ nhầm là gán `null` hay gọi `System.gc()` để "ép dọn": cái đáng làm là cắt tham chiếu thừa, giới hạn kích thước cache và `remove()` `ThreadLocal`. Khi nghi rò rỉ, lấy heap dump và tìm đường từ GC root tới object chiếm nhiều chỗ.

**Đáp án ngắn:** GC thu hồi object không còn tới được từ GC root. Rò rỉ xảy ra khi tham chiếu thừa còn giữ object (cache tĩnh, listener, `ThreadLocal`). Heap chia Young/Old vì đa số object chết sớm.

**Nhớ:** GC đo "tới được", không đo "còn cần".

**Ví dụ:**

```java
Object strong = new Object();
// khong ai giu manh
WeakReference<Object> weak = new WeakReference<>(new Object());
// van co 'strong' giu
WeakReference<Object> weakOfStrong = new WeakReference<>(strong);
System.gc(); Thread.sleep(100);
System.out.println("khong con tham chieu manh: " + weak.get());
System.out.println("con tham chieu manh      : " + (weakOfStrong.get() != null ? "con song" : "null"));

// cache tinh khong bao gio xoa
static final Map<Integer, byte[]> CACHE = new HashMap<>();
try { for (int i = 0; ; i++) CACHE.put(i, new byte[1024 * 1024]); }
catch (OutOfMemoryError e) { System.out.println("cache tinh giu " + CACHE.size() + " MB roi OOM"); }
```

```text
doi tuong khong con tham chieu manh: weak.get() = null
doi tuong con tham chieu manh      : weak.get() = con song
ro ri: cache tinh giu 29 MB, roi OOM
```

_Đã chạy thử trên JDK 11 (`-Xmx64m`). `System.gc()` chỉ là gợi ý; kết quả này ổn định trên HotSpot nhưng không được đảm bảo._ Dòng cuối là rò rỉ điển hình: không có `new` nào bị "quên giải phóng", chỉ là cache giữ tham chiếu mãi.

**Hỏi xoáy 1:** Vì sao chia thế hệ?
**Vì sao hỏi tiếp:** Câu trả lời trên nhắc Young/Old mà chưa giải thích lý do thiết kế.
**Gợi ý suy luận:** Nếu đa số object chết trẻ thì quét vùng nào thường xuyên là có lợi? Chi phí thu hồi phụ thuộc số object sống hay chết?
**Lập luận:** Giả thuyết thế hệ yếu: đa số object chết trẻ. Thu hồi Young nhỏ rất nhanh vì chỉ sao chép số ít object còn sống, tránh quét cả heap mỗi lần.

**Hỏi xoáy 2:** `static` có gây rò rỉ không?
**Vì sao hỏi tiếp:** Từ định nghĩa "tới được từ GC root" thì phải hỏi nguồn rò rỉ thực tế là gì.
**Gợi ý suy luận:** `static` field có phải GC root không? Nó sống tới khi nào?
**Lập luận:** Biến `static` là GC root nên mọi thứ nó trỏ tới sống đến khi class được dỡ. Ba nguồn rò rỉ kinh điển: cache tĩnh không giới hạn, listener không hủy đăng ký, `ThreadLocal` trong thread pool không `remove()`.

**Sai lầm hay gặp:** Gọi `System.gc()` thủ công "cho chắc" (có thể gây dừng thế giới lâu); tìm rò rỉ bằng đoán thay vì heap dump (xem [công cụ chẩn đoán JVM](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md)).

## 13. `static` thực sự nghĩa là gì, và thứ tự khởi tạo ra sao?

**Câu hỏi:** Khối `static` và khối instance khác nhau thế nào, và vì sao biến `static` đổi được lại nguy hiểm?

**Gợi ý suy luận:**
- Thành viên thuộc từng object khác thành viên thuộc class ở chỗ nào (có `this` không)?
- Class được nạp/khởi tạo mấy lần, object được tạo mấy lần?
- Nếu nhiều thread hoặc nhiều request dùng chung một biến thì chuyện gì xảy ra?

**Lập luận:** `static` chuyển một thành viên từ "thuộc từng object" sang "thuộc class": chỉ có một bản, tồn tại từ lúc class được khởi tạo, và vì không gắn với object nên không có `this`. Thứ tự khởi tạo suy ra từ đó: khối `static` chạy **một lần** khi class được khởi tạo (class cha trước class con), còn instance block và constructor chạy mỗi lần `new`, theo thứ tự cha rồi con. Vì có một bản dùng chung cho cả chương trình, biến `static` thay đổi được chính là state toàn cục: mọi test đều chạm vào nó nên khó cô lập, và nhiều thread cùng ghi thì sinh lỗi concurrency mà không có object nào để lock riêng. Điểm dễ nhầm là nghĩ `static` "nhanh hơn" hoặc "an toàn hơn" vì chỉ có một bản; thật ra nó chỉ làm tăng phạm vi ảnh hưởng của mọi thay đổi. Hệ quả khi thiết kế: dùng `static final` cho hằng và hàm tiện ích thuần túy (không state), còn mọi thứ có state nên là instance được inject.

**Đáp án ngắn:** `static` thuộc class, chia sẻ giữa mọi instance, khối `static` chạy một lần khi khởi tạo class. Trạng thái `static` mutable là state toàn cục nên gây khó test và lỗi multithreading.

**Nhớ:** Thứ tự: static cha, static con (một lần), rồi mỗi `new`: instance block + constructor cha, rồi con.

**Ví dụ:** thứ tự khởi tạo.

```java
static class P {
    static { System.out.println("1. static block P (chay 1 lan khi nap lop)"); }
    { System.out.println("3. instance block P"); }
    P() { System.out.println("4. constructor P"); }
}
static class C extends P {
    static int count = 0;
    static { System.out.println("2. static block C"); }
    { System.out.println("5. instance block C"); }
    C() { super(); count++; System.out.println("6. constructor C"); }
}
// main: new C(); new C();
```

```text
--- new C() lan 1
1. static block P (chay 1 lan khi nap lop)
2. static block C
3. instance block P
4. constructor P
5. instance block C
6. constructor C
--- new C() lan 2
3. instance block P
4. constructor P
5. instance block C
6. constructor C
count (static, dung chung) = 2
```

_Đã chạy thử trên JDK 11._ Thứ tự: static cha, static con (một lần), rồi mỗi lần `new`: instance block + constructor cha, instance block + constructor con.

**Hỏi xoáy 1:** Vì sao `static` method không override được?
**Vì sao hỏi tiếp:** Từ việc `static` không gắn với object, hệ quả trực tiếp là về polymorphism ở câu 6.
**Gợi ý suy luận:** Override cần chọn theo gì lúc chạy? `static` có object không?
**Lập luận:** Override cần polymorphism theo kiểu thật của **object**; `static` không gắn với object nên chỉ bị "che" và chọn theo kiểu khai báo (xem output của câu 6).

**Hỏi xoáy 2:** `static` có an toàn multithreading không?
**Vì sao hỏi tiếp:** Biết `static` là state chung thì phải hỏi cái gì an toàn, cái gì không.
**Gợi ý suy luận:** Ai bảo đảm khối `static` chạy một lần? Dữ liệu `static` sửa được thì ai bảo vệ?
**Lập luận:** JVM bảo đảm khởi tạo class chỉ một thread chạy khối `static`, nên khởi tạo an toàn. Nhưng **dữ liệu `static` thay đổi được** thì không (xem câu 2 và câu 4 của [bài collections và concurrency](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-03-collections-concurrency.md)). Idiom "holder" tận dụng khởi tạo class an toàn để tạo lazy singleton.

**Sai lầm hay gặp:** Lưu trạng thái request trong biến `static` của service: dữ liệu người dùng này lẫn sang người khác.

## 14. Autoboxing che giấu những bẫy nào?

**Câu hỏi:** `int v = map.get("khong-co")` ném NPE, cộng dồn bằng `Long` chậm hơn `long` khoảng 20 lần, và `list.remove(1)` đôi khi xóa không đúng ý. Cùng một cơ chế nào đứng sau?

**Gợi ý suy luận:**
- Compiler chèn call gì khi bạn gán `int` vào `Integer` và ngược lại?
- Nguyên thủy có thể là `null` không, còn object thì sao?
- Mỗi lần boxing có tạo object mới không (nhớ buffer -128..127)?

**Lập luận:** Autoboxing là việc compiler tự chèn `Integer.valueOf` hoặc `intValue()` thay bạn, nên nó giấu đi hai thứ: việc tạo object và khả năng `null`. Từ đó suy ra bốn bẫy. Thứ nhất, `get` trả `null` rồi unboxing gọi `intValue()` trên `null` nên NPE, dù dòng code chỉ là một phép gán. Thứ hai, mỗi phép `+=` với `Long` tạo ra một object mới, nên trong vòng lặp nóng tốn cấp phát và áp lực GC, chậm cả chục lần so với `long`. Thứ ba, `==` giữa hai object bọc ngoài khoảng buffer -128 đến 127 so địa chỉ nên sai, và nó chỉ đúng trong khoảng nhỏ nên lỗi hiện ra thất thường. Thứ tư, `list.remove(1)` có hai overload (`remove(int index)` và `remove(Object)`), đối số `int` chọn theo chỉ số chứ không theo giá trị. Điểm dễ nhầm là coi `Integer` và `int` như nhau vì code gần như giống hệt. Khi review: vòng lặp nóng dùng kiểu nguyên thủy, không so `==` giữa object bọc, và cẩn thận `Map.get` gán thẳng vào kiểu nguyên thủy.

**Đáp án ngắn:** Bẫy: unboxing `null` gây NPE, `==` giữa object bọc ngoài buffer, chậm và tốn memory khi bọc trong vòng lặp nóng, và `remove(int)` với `remove(Object)`.

**Nhớ:** Boxing giấu chi phí cấp phát và `null`.

**Ví dụ:**

```java
Map<String, Integer> m = new HashMap<>();
int v = m.get("khong-co");                 // NullPointerException (unboxing null)
Long l3 = 128L, l4 = 128L;  l3 == l4;      // false
// moi vong lap tao Long moi
Long boxed = 0L; for (long i = 0; i < 50_000_000L; i++) boxed += i;
long prim = 0;   for (long i = 0; i < 50_000_000L; i++) prim += i;
List<Integer> li = new ArrayList<>(List.of(10, 20, 30));
li.remove(1);                       // xoa theo CHI SO 1
li.remove(Integer.valueOf(10));     // xoa theo GIA TRI 10
```

```text
unboxing null -> NullPointerException
Long 127==127: true | 128==128: false
new Integer(5)==new Integer(5): false
tong 50 trieu: Long(boxed)=700 ms, long=30 ms, bang nhau: true
remove(1) (index) : [10, 30]
remove(Integer 10): [30]
```

_Đã chạy thử trên JDK 11 (compiler cảnh báo `new Integer` đã deprecated)._ Cộng dồn bằng `Long` chậm khoảng 20 lần vì mỗi phép `+=` tạo một object `Long` mới.

**Hỏi xoáy 1:** Làm sao tránh chi phí boxing với collection số?
**Vì sao hỏi tiếp:** Đã thấy chi phí thì phải hỏi cách tránh khi dữ liệu lớn.
**Gợi ý suy luận:** Nếu bỏ hẳn object bọc thì dùng cấu trúc nào chứa số trực tiếp?
**Lập luận:** Dùng stream nguyên thủy (`IntStream`, `LongStream`), mảng nguyên thủy, hoặc thư viện collection nguyên thủy (Eclipse Collections, fastutil) khi dữ liệu lớn, vì chúng không tạo object cho mỗi số.

**Sai lầm hay gặp:** Khai báo `Integer count` trong DTO rồi tính toán mà không kiểm tra `null`; hoặc khai báo tích lũy `Long total = 0L` trong vòng lặp lớn.

## 15. `record`, `sealed`, `var`: bớt nghi thức mà không đổi mô hình kiểu

**Câu hỏi:** Ba tính năng này bỏ bớt code lặp ở đâu, và có làm mất kiểm tra kiểu tĩnh của Java không?

**Gợi ý suy luận:**
- Một class "chỉ chứa dữ liệu bất biến" cần những phần lặp nào (constructor, accessor, `equals`, `hashCode`, `toString`)?
- Nếu biết tập subclass đã đóng thì `switch` cần nhánh `default` không?
- Nếu compiler đã biết kiểu ở vế phải thì bạn cần gõ lại không, và kiểu có thành động không?

**Lập luận:** Ba tính năng cùng một ý: khai báo ý định để compiler sinh phần lặp lại và kiểm tra thay bạn, chứ không đổi mô hình kiểu tĩnh. `record` khai báo "đây chỉ là dữ liệu bất biến", nên compiler sinh đúng chuẩn constructor, getter, `equals`, `hashCode`, `toString` từ các thành phần. `sealed ... permits` khai báo "tập subclass đã đóng", nên `switch` pattern kiểm tra được đã đủ trường hợp, và thêm subclass mà quên cập nhật thì thành lỗi biên dịch thay vì lỗi lúc chạy. `var` chỉ bỏ việc gõ lại kiểu mà compiler đã suy ra từ vế phải ngay lúc biên dịch, nên biến vẫn có kiểu tĩnh cố định, không phải kiểu động. Điểm dễ nhầm là nghĩ `record` bất biến sâu: nó chỉ bất biến nông, thành phần là `List` thay đổi được thì `hashCode` vẫn đổi. Khi dùng: `record` cho dữ liệu truyền qua lại, `sealed` cho tập trường hợp đóng, và chỉ `var` khi kiểu đã rõ ở vế phải.

**Đáp án ngắn:** `record`: class dữ liệu bất biến (nông). `sealed`: giới hạn inheritance, mạnh khi kết hợp `switch` pattern. `var`: suy luận kiểu biến cục bộ lúc biên dịch, không phải kiểu động.

**Nhớ:** Cả ba giảm nghi thức, không đổi mô hình kiểu.

**Ví dụ:**

```java
record Point(int x, int y) {
    // compact constructor
    Point { if (x < 0) throw new IllegalArgumentException("x < 0"); }
}
sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}

static double area(Shape s) {
    return switch (s) {                       // khong can default: compiler biet da du
        case Circle c -> Math.PI * c.r() * c.r();
        case Square q -> q.side() * q.side();
    };
}
var list = new ArrayList<String>();           // kieu van la ArrayList<String>
```

_Minh họa, chưa chạy thử trong môi trường này (cần Java 17+ cho `sealed`/`record`, Java 21 cho `switch` pattern; môi trường kiểm chứng ở đây là JDK 11)._ Hành vi theo đặc tả: thêm `record Triangle(...) implements Shape` mà không cập nhật `area` thì **lỗi biên dịch**, thay vì lỗi lúc chạy.

**Hỏi xoáy 1:** `record` có thật sự bất biến không?
**Vì sao hỏi tiếp:** Chữ "bất biến" của record cần được kiểm chứng ở thành phần bên trong.
**Gợi ý suy luận:** `final` field lock tham chiếu hay nội dung? Thành phần `List` thì sao?
**Lập luận:** Các field là `final` nên không gán lại, nhưng nếu thành phần là object thay đổi được (`List`) thì nội dung vẫn đổi. Dùng `List.copyOf` trong compact constructor để bất biến sâu.

**Hỏi xoáy 2:** `var` có làm code khó đọc?
**Vì sao hỏi tiếp:** Bỏ kiểu đi thì phải hỏi đánh đổi về đọc hiểu.
**Gợi ý suy luận:** Người đọc có tự suy ra kiểu từ vế phải được không?
**Lập luận:** Nếu vế phải không lộ kiểu (`var x = service.process()`) thì khó đọc. Nên dùng khi kiểu rõ từ vế phải (`new`, factory) hoặc quá dài (generic lồng nhau).

**Sai lầm hay gặp:** Dùng `record` cho entity JPA (cần constructor không tham số, setter, proxy), hoặc thêm nhánh `default` vào `switch` trên `sealed` làm mất kiểm tra đủ trường hợp.

## 16. Làm sao tránh `NullPointerException` từ gốc thiết kế?

**Câu hỏi:** Thay vì rải `if (x != null)` khắp nơi, tôi nên thiết kế thế nào để NPE ít xảy ra?

**Gợi ý suy luận:**
- Kiểu `String` cho bạn biết giá trị có thể vắng mặt không?
- Có thể làm sự vắng mặt "hiện ra" trong kiểu bằng cách nào (`Optional`), hoặc loại bỏ nó (collection rỗng)?
- Nên phát hiện lỗi `null` ở đâu: gần nơi gây ra hay xa nơi gây ra?

**Lập luận:** NPE không phải lỗi của `null` mà là lỗi thiết kế không nói rõ "ở đây có thể vắng mặt": mọi tham chiếu đều có thể là `null` mà kiểu không cho biết chỗ nào. Vì vậy `if (x != null)` rải khắp nơi chỉ vá triệu chứng và còn quên chỗ. Cách chữa gốc có ba hướng. Thứ nhất, làm sự vắng mặt hiện ra trong kiểu: `Optional` cho giá trị trả về "có thể không có", để người gọi bắt buộc nghĩ tới trường hợp rỗng. Thứ hai, loại bỏ sự vắng mặt khi có thể: trả collection rỗng thay vì `null`, hoặc dùng null object. Thứ ba, thất bại sớm tại biên bằng `Objects.requireNonNull` để lỗi hiện gần nguyên nhân thay vì nổ xa ở chỗ khác. Điểm dễ nhầm là dùng `Optional` cho tham số hoặc field, làm thêm một cách thất bại (chính `Optional` có thể là `null`) và tốn thêm object. Khi review: kiểu trả về mơ hồ thì `Optional`, collection không bao giờ `null`, và kiểm tra tham số ở đầu hàm.

**Đáp án ngắn:** Không trả `null` cho collection; dùng `Optional` cho kiểu trả về "có thể không có"; `requireNonNull` ở đầu hàm; so sánh `"literal".equals(x)`. Không dùng `Optional` làm tham số hay field.

**Nhớ:** Biến "vắng mặt" thành một phần của kiểu, và thất bại sớm.

**Ví dụ:**

```java
static Optional<String> cityOf(Map<String, String> db, String id) { return Optional.ofNullable(db.get(id)); }
cityOf(db, "u1").map(String::toUpperCase).orElse("khong ro");     // HANOI
cityOf(db, "u9").map(String::toUpperCase).orElse("khong ro");     // khong ro
cityOf(db, "u9").orElseThrow(() -> new NoSuchElementException("khong thay u9"));
// false khi s == null, khong NPE
"admin".equals(s);
// that bai SOM, thong bao ro
Objects.requireNonNull(s, "s khong duoc null");
// NullPointerException ngay khi tao
List.of("a", null);
```

```text
HANOI
khong ro
khong thay u9
"admin".equals(null) = false
fail-fast: s khong duoc null
List.of khong chua null: 
  List.of("a", null) -> NPE
```

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Vì sao `Optional` không nên là tham số hay field?
**Vì sao hỏi tiếp:** Vừa nói dùng `Optional` thì phải vạch ranh giới chỗ nào không dùng.
**Gợi ý suy luận:** Tham số `Optional` có thể là `null` không? Nó có `Serializable` không, và tốn gì cho mỗi giá trị?
**Lập luận:** Tham số `Optional` vẫn có thể là `null` (thêm một cách thất bại), `Optional` không `Serializable` và thêm một class bọc cho mỗi giá trị. Thiết kế đúng là overload method, hoặc nhận giá trị thường và quy ước rõ.

**Hỏi xoáy 2:** Thông báo NPE khó đọc thì sao?
**Vì sao hỏi tiếp:** Dù thiết kế tốt, NPE vẫn xảy ra và cần chẩn đoán nhanh.
**Gợi ý suy luận:** Thông báo cũ chỉ nói gì? Có cách nào cho biết biểu thức nào null?
**Lập luận:** Từ Java 14 (bật mặc định từ 15) có "helpful NPE messages" chỉ rõ biểu thức null (`Cannot invoke "String.length()" because "s" is null`). Giúp chẩn đoán, nhưng không thay thế thiết kế để không phát sinh NPE.

**Sai lầm hay gặp:** Gọi `optional.get()` không kiểm tra (đổi NPE thành `NoSuchElementException`, không cải thiện gì); `Optional.of(x)` với `x` có thể null (ném NPE tại chỗ, dùng `ofNullable`).

---

Nguồn: kiểm chứng bằng chương trình chạy trên JDK 11; khái niệm tham chiếu *Effective Java* (Bloch) và tài liệu Java SE. Số liệu thời gian chỉ mang tính so sánh tương đối.

