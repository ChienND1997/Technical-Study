# Trắc nghiệm chuyên sâu: Java Core, OOP & JVM Memory

## 1. Ngôn ngữ Java, Bộ nhớ Heap và Garbage Collection

### Câu 1: Sự khác biệt bản chất giữa toán tử so sánh `==` và phương thức `equals()` trong Java đối với các kiểu dữ liệu tham chiếu (Reference Types) là gì?
- [x] `==` so sánh địa chỉ vùng nhớ xem hai biến có cùng trỏ tới một đối tượng trên Heap hay không; còn `equals()` mặc định so sánh địa chỉ nhưng thường được ghi đè (override) để so sánh giá trị nội dung logic bên trong.
- [ ] `==` chỉ áp dụng được cho các kiểu dữ liệu nguyên thủy (primitive types), còn `equals()` mới dùng được cho các kiểu dữ liệu đối tượng.
- [ ] `==` so sánh giá trị băm `hashCode()` của hai đối tượng, trong khi `equals()` so sánh kích thước byte của đối tượng trên bộ nhớ RAM.
- [ ] `==` thực hiện so sánh sâu (Deep comparison) đệ quy tất cả các trường, còn `equals()` chỉ thực hiện so sánh nông tầng đầu tiên.

> **Giải thích:** Với biến kiểu đối tượng, `==` kiểm tra xem hai con trỏ có cùng giữ một địa chỉ bộ nhớ hay không. Nếu hai String có cùng ký tự `"hello"` nhưng được tạo bằng `new String("hello")`, chúng nằm ở 2 ô nhớ khác nhau nên `s1 == s2` ra `false`, trong khi `s1.equals(s2)` duyệt so sánh từng ký tự và trả về `true`.

### Câu 2: Trong Java, vì sao khi ghi đè (override) phương thức `equals()`, lập trình viên BẮT BUỘC phải ghi đè cả phương thức `hashCode()`?
- [x] Để tuân thủ hợp đồng kỹ thuật: Hai đối tượng bằng nhau theo `equals()` bắt buộc phải có cùng mã băm `hashCode()`; nếu vi phạm, các cấu trúc dữ liệu như `HashMap`, `HashSet` sẽ không thể tìm thấy hoặc lưu trữ trùng lặp phần tử.
- [ ] Để JVM có thể tự động sắp xếp các đối tượng theo thứ tự tăng dần trong mảng mà không cần triển khai interface `Comparable`.
- [ ] Để trình thu gom rác (Garbage Collector) nhận diện được các đối tượng rác và giải phóng bộ nhớ nhanh hơn.
- [ ] Để cho phép đối tượng có thể được chuyển đổi thành chuỗi JSON một cách tự động mà không cần thư viện Jackson.

> **Giải thích:** `HashMap` tìm kiếm một phần tử qua 2 bước: 1) Tính `hashCode()` để tìm đúng Bucket; 2) Duyệt các phần tử trong Bucket và dùng `equals()` để xác định đối tượng chính xác. Nếu 2 object bằng nhau theo `equals()` nhưng có `hashCode()` khác nhau, chúng sẽ rơi vào 2 Bucket khác nhau -> Bạn gọi `map.get(key)` sẽ trả về `null` dù key bằng nhau 100%!

### Câu 3: Vùng nhớ Heap trong kiến trúc JVM được chia thành hai thế hệ chính (Young Generation và Old Generation) nhằm mục đích gì?
- [x] Tối ưu hóa hiệu năng thu gom rác dựa trên giả thuyết "Hầu hết các đối tượng đều chết rất nhanh sau khi sinh ra", giúp Minor GC dọn dẹp Young Gen cực nhanh mà không cần quét toàn bộ Heap.
- [ ] Tách riêng các đối tượng được tạo bởi các luồng người dùng và các đối tượng nội bộ do hệ điều hành JVM sinh ra.
- [ ] Phân chia các đối tượng có kích thước dưới 1MB vào Young Gen và các đối tượng lớn hơn 1MB vào Old Gen ngay từ khi khởi tạo.
- [ ] Cho phép Young Gen lưu trữ trên bộ nhớ RAM và Old Gen lưu trữ trực tiếp trên bộ nhớ đệm ổ cứng SSD.

> **Giải thích:** Dựa trên Giả thuyết thế hệ yếu (Weak Generational Hypothesis): *"Hầu hết các đối tượng trong ứng dụng đều chết rất nhanh ngay sau khi sinh ra"*. Bằng cách chia thành Young Gen và Old Gen: JVM chỉ cần dọn rác Young Gen (Minor GC) với thời gian siêu nhanh (vài mili-giây) mà không cần quét toàn bộ bộ nhớ Heap khổng lồ (Major/Full GC).

### Câu 4: Điểm khác biệt cốt lõi giữa `String`, `StringBuilder` và `StringBuffer` trong Java là gì?
- [x] `String` là bất biến (Immutable); `StringBuilder` là khả biến và không an toàn đa luồng nhưng có tốc độ cao nhất; `StringBuffer` là khả biến và an toàn đa luồng nhờ các phương thức được đồng bộ hóa `synchronized`.
- [ ] `String` lưu trữ dữ liệu trên Stack, trong khi `StringBuilder` và `StringBuffer` lưu trữ dữ liệu trên Heap.
- [ ] `String` và `StringBuffer` là các class kế thừa từ `CharSequence`, còn `StringBuilder` là một interface độc lập.
- [ ] `StringBuilder` chỉ hỗ trợ nối chuỗi với độ dài cố định, còn `StringBuffer` tự động co giãn kích thước mảng ký tự bên dưới.

> **Giải thích:** Mỗi phép cộng chuỗi `s += "abc"` trên `String` đều phải tạo một object mới trên Heap và sao chép mảng char/byte, cực kỳ tốn bộ nhớ khi lặp. Trong môi trường đơn luồng (như hàm cục bộ), luôn dùng `StringBuilder` để có hiệu năng cao nhất. Chỉ dùng `StringBuffer` khi nhiều luồng cùng thao tác trên một bộ đệm chuỗi chung.

### Câu 5: Từ khóa `transient` khi khai báo trước một trường thuộc tính của class trong Java có ý nghĩa kỹ thuật gì?
- [x] Chỉ định rằng trường dữ liệu đó sẽ bị bỏ qua và không được lưu lại khi đối tượng được tuần tự hóa (Serialization) sang luồng byte nhị phân.
- [ ] Đảm bảo giá trị của biến luôn được đọc và ghi trực tiếp từ bộ nhớ RAM chính (Main Memory) thay vì bộ đệm CPU Cache.
- [ ] Biến trường thuộc tính thành một hằng số chỉ đọc (read-only) tương tự như từ khóa `final`.
- [ ] Báo cho trình biên dịch biết trường này có thể được gán giá trị bất đồng bộ từ các luồng khác mà không gây lỗi.

> **Giải thích:** Khi một class implements `Serializable`, tất cả thuộc tính đều được đóng gói thành nhị phân. Đặt từ khóa `transient` (ví dụ `private transient String password;` hoặc con trỏ socket/database connection) báo cho JVM bỏ qua trường đó, khi giải nén (Deserialize) thuộc tính này sẽ nhận giá trị mặc định (`null` hoặc `0`), bảo vệ các thông tin nhạy cảm.

### Câu 6: Trong hệ thống phân cấp Ngoại lệ của Java, sự khác biệt căn bản giữa "Checked Exception" và "Unchecked Exception" là gì?
- [x] Checked Exception (kế thừa trực tiếp từ `Exception`) bắt buộc phải được xử lý bằng `try-catch` hoặc khai báo `throws` ngay lúc biên dịch; còn Unchecked Exception (kế thừa từ `RuntimeException` hoặc `Error`) không bắt buộc phải khai báo.
- [ ] Checked Exception làm chương trình dừng thực thi ngay lập tức, trong khi Unchecked Exception cho phép chương trình tiếp tục chạy qua dòng lỗi.
- [ ] Checked Exception chỉ phát sinh trong các ứng dụng máy tính để bàn (Swing/JavaFX), còn Unchecked Exception dùng cho ứng dụng web Spring Boot.
- [ ] `NullPointerException` và `ArrayIndexOutOfBoundsException` là các ví dụ tiêu biểu của Checked Exception.

> **Giải thích:** Checked Exception (như `IOException`, `SQLException`) đại diện cho các sự cố có thể lường trước được từ môi trường ngoài mà chương trình cần có phương án phục hồi. Unchecked Exception (như `NullPointerException`, `IllegalArgumentException`, `IndexOutOfBoundsException`) đại diện cho các lỗi logic lập trình (bug) do code cẩu thả, không nên bắt bằng try-catch mà phải sửa trực tiếp trong code.

### Câu 7: Đoạn mã `Integer a = 127, b = 127; Integer c = 128, d = 128; System.out.println((a == b) + " " + (c == d));` in ra kết quả gì và vì sao?
- [x] `true false` - Vì JVM có cơ chế Integer Cache lưu trữ sẵn các đối tượng Integer trong khoảng từ -128 đến 127 trong vùng nhớ dùng chung; các số từ 128 trở lên sẽ được tạo thành các đối tượng mới độc lập trên Heap.
- [ ] `true true` - Vì toán tử `==` tự động unbox các đối tượng Wrapper Class về kiểu nguyên thủy `int` trước khi thực hiện phép so sánh giá trị.
- [ ] `false false` - Vì Integer là kiểu đối tượng tham chiếu nên phép toán `==` luôn so sánh địa chỉ vùng nhớ và cho kết quả sai.
- [ ] `false true` - Vì số lớn hơn 128 được JVM tự động ưu tiên nén vào bảng nhớ tĩnh của ClassLoader.

> **Giải thích:** Khi thực hiện Autoboxing `Integer a = 127`, Java ngầm gọi `Integer.valueOf(127)`. Java Language Specification quy định JVM phải cache các giá trị từ -128 đến 127 (`IntegerCache`). Vì vậy `a` và `b` cùng trỏ vào 1 đối tượng duy nhất (`a == b` ra `true`). Còn 128 vượt quá ngưỡng cache nên `c` và `d` là hai object khác nhau trên Heap (`c == d` ra `false`). Bài học: Luôn dùng `.equals()` khi so sánh các Wrapper Class!

### Câu 8: Điểm khác biệt quan trọng về cấu trúc và hiệu năng giữa `ArrayList` và `LinkedList` trong Java là gì?
- [x] `ArrayList` dựa trên Mảng động liên tục trong bộ nhớ, truy xuất theo chỉ số (Random Access) đạt O(1) và thân thiện với CPU Cache; còn `LinkedList` dựa trên Danh sách liên kết đôi, tốn bộ nhớ cho con trỏ Node và truy xuất chỉ số tốn O(n).
- [ ] `LinkedList` luôn có tốc độ chèn và xóa phần tử ở vị trí bất kỳ nhanh hơn `ArrayList` trong mọi bài toán thực tế.
- [ ] `ArrayList` là cấu trúc dữ liệu an toàn đa luồng (Thread-safe) mặc định, trong khi `LinkedList` thì không an toàn đa luồng.
- [ ] `ArrayList` không cho phép chứa các phần tử có giá trị `null`, trong khi `LinkedList` cho phép chứa `null`.

> **Giải thích:** Nhiều người học vẹt rằng "LinkedList thêm/xóa nhanh O(1)". Thực tế: Muốn chèn vào vị trí thứ K, `LinkedList` phải duyệt tuần tự từ đầu đến K tốn O(n)! Hơn nữa, mỗi phần tử trong `LinkedList` tốn thêm 24 byte cho 1 đối tượng `Node` và các con trỏ `prev`, `next`, các node nằm rải rác trên Heap gây cache miss liên tục. Trong 99% trường hợp thực tế, `ArrayList` luôn đánh bại `LinkedList` về hiệu năng.

### Câu 9: Trong kiến trúc bộ nhớ JVM, Biến cục bộ (Local Variables) và Bản thân Đối tượng (Objects) được lưu trữ tại đâu?
- [x] Biến cục bộ và tham chiếu con trỏ được lưu trên Stack Frame của luồng hiện tại; còn bản thân đối tượng thực tế và mảng luôn được cấp phát trên bộ nhớ Heap dùng chung.
- [ ] Cả biến cục bộ và đối tượng đều được lưu trữ hoàn toàn trên vùng nhớ Stack để đảm bảo tốc độ truy xuất nhanh nhất.
- [ ] Biến cục bộ kiểu nguyên thủy lưu trên Heap, còn các đối tượng phức tạp được lưu trữ trên vùng nhớ Metaspace.
- [ ] Biến cục bộ được lưu trữ trên CPU Cache L1/L2, còn đối tượng được lưu trữ trên bộ nhớ ảo (Virtual Memory) của đĩa cứng.

> **Giải thích:** Mỗi luồng có một vùng nhớ Thread Stack riêng biệt (kích thước thường 1MB, được giải phóng ngay khi hàm kết thúc, thread-safe tuyệt đối). Khi bạn viết `Person p = new Person()`, biến tham chiếu `p` (chứa địa chỉ con trỏ 4 hoặc 8 byte) nằm trên Stack của luồng, còn toàn bộ dữ liệu thực tế của đối tượng `Person` nằm trên bộ nhớ Heap (được quản lý bởi Garbage Collector).

### Câu 10: Từ khóa `final` khi áp dụng cho Biến, Phương thức và Lớp (Class) trong Java mang ý nghĩa tương ứng là gì?
- [x] Biến: Giá trị hoặc tham chiếu không thể gán lại sau khi khởi tạo; Phương thức: Không thể bị ghi đè (override) bởi lớp con; Lớp: Không thể bị kế thừa (extends).
- [ ] Biến: Luôn được đồng bộ hóa an toàn giữa các luồng; Phương thức: Chạy trên luồng nền bất đồng bộ; Lớp: Chỉ có thể tạo duy nhất một thể hiện Singleton.
- [ ] Biến: Tự động giải phóng vùng nhớ khi ra khỏi khối lệnh; Phương thức: Bắt buộc phải trả về kiểu dữ liệu nguyên thủy; Lớp: Tự động triển khai interface `Serializable`.
- [ ] Biến: Giá trị của biến chỉ có thể được đọc từ một file cấu hình; Phương thức: Bắt buộc phải có phạm vi truy cập `public`; Lớp: Không được phép chứa các trường tĩnh (static fields).

> **Giải thích:** 
- Biến final: Hằng số không thể gán lại (nếu là object thì con trỏ cố định, nhưng thuộc tính bên trong object vẫn sửa được).
- Method final: Ngăn lớp con thay đổi logic cốt lõi (tối ưu hóa inlining lúc JIT compile).
- Class final: Ngăn chặn kế thừa (ví dụ `String`, `Integer` là final class để bảo đảm tính an toàn và bất biến).

### Câu 11: Khái niệm "Type Erasure" (Xóa kiểu) trong cơ chế Java Generics hoạt động như thế nào?
- [x] Thông tin kiểu tham số Generic (như `<String>` trong `List<String>`) chỉ được dùng lúc Compile-time để kiểm tra an toàn kiểu; sau đó bị xóa bỏ khỏi Bytecode lúc Runtime và thay bằng kiểu thô `Object` (hoặc bounded type).
- [ ] Trình biên dịch sẽ tự động sinh ra các class bytecode riêng biệt cho từng kiểu dữ liệu cụ thể lúc chạy (tương tự C++ Templates).
- [ ] Toàn bộ các biến được khai báo bên trong class Generic sẽ bị xóa khỏi bộ nhớ Heap ngay khi phương thức kết thúc.
- [ ] Java sẽ ném ra ngoại lệ `ClassCastException` nếu một collection Generic chứa nhiều hơn 1.000 phần tử.

> **Giải thích:** Java bổ sung Generics từ Java 5 nhưng phải đảm bảo tương thích ngược 100% với các file bytecode của Java 1.4 trở về trước. Do đó, lúc runtime, cả `List<String>` và `List<Integer>` đều chỉ là lớp `List` thô (Raw type), dẫn đến việc bạn không thể viết `new T()`, `new T[10]` hoặc `if (list instanceof List<String>)` trong Java.

### Câu 12: Trong Java 8 Stream API, sự khác biệt căn bản giữa "Intermediate Operations" và "Terminal Operations" là gì?
- [x] Intermediate operations (như `filter()`, `map()`) có tính chất lười biếng (Lazy Evaluation), trả về Stream mới và KHÔNG HỀ CHẠY cho đến khi có một Terminal operation (như `collect()`, `count()`) kích hoạt luồng xử lý.
- [ ] Intermediate operations thực thi đồng bộ trên luồng chính, còn Terminal operations luôn thực thi bất đồng bộ thông qua ForkJoinPool.
- [ ] Intermediate operations chỉ áp dụng được cho kiểu số nguyên, còn Terminal operations áp dụng cho mọi kiểu đối tượng.
- [ ] Intermediate operations làm đột biến trực tiếp danh sách nguồn ban đầu, còn Terminal operations tạo ra một bản sao mới.

> **Giải thích:** Tính chất Lazy của Stream giúp tối ưu hóa hiệu năng vượt bậc: `list.stream().filter(x -> x > 10).findFirst()`. Dù danh sách có 1 triệu phần tử, Stream không lọc cả 1 triệu phần tử rồi mới tìm, mà nó duyệt từng phần tử qua filter: ngay khi gặp phần tử đầu tiên thỏa mãn > 10, Terminal operation `findFirst()` lập tức ngắt toàn bộ pipeline (Short-circuiting), chỉ tốn vài phép tính.

### Câu 13: Vì sao khi thực hiện các phép tính toán liên quan đến Tiền tệ trong Java, lập trình viên bắt buộc phải dùng `BigDecimal` thay vì `double` hay `float`?
- [x] Vì `float` và `double` sử dụng chuẩn biểu diễn nhị phân IEEE 754 nên không thể biểu diễn chính xác tuyệt đối các số thập phân (như `1.0 - 0.9 = 0.09999999999999998`), gây ra sai lệch số dư tích lũy.
- [ ] Vì kiểu `double` và `float` có giới hạn giá trị tối đa quá nhỏ, không thể lưu trữ được các con số trên 1 tỷ đồng.
- [ ] Vì cơ sở dữ liệu quan hệ PostgreSQL và MySQL không hỗ trợ ánh xạ kiểu `double` sang các cột số thực.
- [ ] Vì `BigDecimal` được lưu trữ trực tiếp trên thanh ghi của CPU giúp tốc độ tính toán nhanh hơn gấp 10 lần so với `double`.

> **Giải thích:** Máy tính đếm bằng hệ nhị phân (cơ số 2), các số thập phân như 0.1 hay 0.9 không thể biểu diễn tròn trịa bằng nhị phân (tương tự 1/3 trong hệ thập phân là 0.33333... vô hạn). `BigDecimal` lưu trữ số nguyên không giới hạn kèm theo thang tỉ lệ thập phân (Scale), đảm bảo độ chính xác tuyệt đối đến từng chữ số sau dấu phẩy. Lưu ý: Luôn khởi tạo `BigDecimal` bằng chuỗi: `new BigDecimal("0.1")` thay vì `new BigDecimal(0.1)`.

### Câu 14: Điểm khác biệt quan trọng trong thiết kế giữa Interface và Abstract Class từ phiên bản Java 8 trở đi là gì?
- [x] Một class có thể triển khai nhiều Interface nhưng chỉ kế thừa một Abstract Class duy nhất; ngoài ra Abstract Class có thể chứa biến trạng thái thể hiện (Instance state) và Constructor, còn Interface thì không.
- [ ] Interface không thể chứa bất kỳ phương thức nào có phần thân mã nguồn thực thi, còn Abstract Class thì có thể.
- [ ] Abstract Class không cho phép định nghĩa các phương thức trừu tượng, còn Interface bắt buộc mọi phương thức phải trừu tượng.
- [ ] Interface chỉ có thể được kế thừa bởi các class nằm trong cùng một package, còn Abstract Class có thể kế thừa tự do.

> **Giải thích:** Từ Java 8, Interface có thể chứa code thực thi thông qua `default method` và `static method` (Java 9 có thêm `private method`). Sự khác biệt căn bản còn lại nằm ở Bản chất thiết kế: Abstract Class đại diện cho quan hệ "Là một" (IS-A: `Dog IS-A Animal`) và có thể lưu giữ trạng thái nội bộ qua biến thực thể; còn Interface đại diện cho quan hệ "Có khả năng làm gì" (CAN-DO: `Bird CAN-FLY`, `Airplane CAN-FLY`).

### Câu 15: Lớp `Optional<T>` trong Java 8 được thiết kế nhằm mục đích chính nào và trường hợp nào bị coi là sử dụng sai mục đích (Anti-pattern)?
- [x] Thiết kế để làm kiểu trả về (Return type) cho các phương thức có khả năng không tìm thấy kết quả nhằm tường minh hóa nguy cơ null; phản mẫu hình là dùng `Optional` làm kiểu dữ liệu của thuộc tính class (Field) hoặc tham số hàm.
- [ ] Thiết kế để thay thế hoàn toàn tất cả các kiểu dữ liệu nguyên thủy nhằm tăng tính hướng đối tượng cho Java.
- [ ] Thiết kế để tự động đồng bộ hóa các luồng khi truy cập đồng thời vào một biến chia sẻ chung.
- [ ] Thiết kế để nén dung lượng bộ nhớ của các đối tượng rỗng trên bộ nhớ Heap.

> **Giải thích:** `Optional` là giải pháp thay thế thanh lịch cho việc trả về `null` (giúp người gọi hàm nhìn vào chữ ký method là biết ngay cần xử lý trường hợp rỗng bằng `.orElse()`, `.orElseGet()`, `.map()`). Dùng `Optional` làm biến thực thể (Field) gây tốn thêm bộ nhớ wrapper và không thể serialize được.

### Câu 16: Bộ gom rác thế hệ mới "ZGC" (Z Garbage Collector) trong Java hiện đại có đặc tính kỹ thuật vượt trội nào?
- [x] Đạt thời gian tạm dừng ứng dụng (Stop-The-World pause time) dưới 1 mili-giây trên các bộ nhớ Heap dung lượng khổng lồ (từ vài GB lên tới 16TB) nhờ thực hiện các pha đánh dấu và di dời đối tượng đồng thời cùng luồng ứng dụng.
- [ ] ZGC không bao giờ cần phải thực hiện việc dọn dẹp các đối tượng trong thế hệ Young Generation.
- [ ] ZGC chỉ hoạt động khi ứng dụng được biên dịch bằng trình biên dịch mã máy GraalVM Native Image.
- [ ] ZGC hoàn toàn không tiêu tốn tài nguyên chu kỳ CPU của máy chủ trong suốt quá trình dọn rác.

> **Giải thích:** Trước đây, bộ gom rác Parallel hay G1 khi dọn Heap 64GB có thể gây Stop-The-World (đứng hình ứng dụng) vài giây tới vài chục giây làm đứt kết nối mạng. ZGC sử dụng con trỏ màu (Colored Pointers) và rào cản tải (Load Barriers) để vừa di chuyển dọn dẹp đối tượng trên Heap vừa cho phép các luồng Java tiếp tục chạy song song, đưa thời gian dừng hệ thống về mức sub-millisecond.

### Câu 17: Tính năng Virtual Threads (Project Loom) được chuẩn hóa trong Java 21 LTS mang lại lợi ích đột phá nào cho kiến trúc backend?
- [x] Cho phép tạo hàng triệu luồng ảo siêu nhẹ do JVM quản lý trên một số ít luồng hệ điều hành thực tế, giúp lập trình viên viết code đồng bộ (blocking I/O) đơn giản mà vẫn đạt thông lượng cực đại tương đương lập trình phản ứng (Reactive).
- [ ] Tự động chuyển đổi các câu lệnh SQL đồng bộ thành các tiến trình xử lý song song trên nhiều node phân tán.
- [ ] Loại bỏ hoàn toàn sự xuất hiện của các ngoại lệ `OutOfMemoryError` trong toàn bộ vòng đời ứng dụng.
- [ ] Tăng tốc độ thực thi của các thuật toán tính toán nặng về CPU lên gấp 10 lần nhờ cơ chế đa luồng ảo.

> **Giải thích:** Luồng hệ điều hành (Platform Thread) rất nặng (tốn 1MB stack và chi phí context switch của OS kernel, 1 server chỉ chịu được 2.000-5.000 luồng là cạn RAM). Virtual Thread chỉ tốn vài trăm byte bộ nhớ trên Heap: Khi luồng ảo gặp thao tác chặn I/O (gọi DB, gọi HTTP), JVM tự động tháo (unmount) luồng ảo ra và gắn luồng ảo khác vào luồng OS thực thi, đạt thông lượng triệu kết nối đồng thời với cú pháp code tuần tự dễ hiểu.

### Câu 18: Điểm khác biệt căn bản giữa hai interface `Comparable<T>` và `Comparator<T>` trong Java là gì?
- [x] `Comparable` định nghĩa thứ tự sắp xếp tự nhiên nội tại bên trong chính Class thông qua phương thức `compareTo()`; còn `Comparator` là một lớp độc lập bên ngoài định nghĩa các chiến lược sắp xếp tùy biến linh hoạt qua phương thức `compare()`.
- [ ] `Comparable` chỉ dùng để sắp xếp các phần tử theo thứ tự giảm dần, còn `Comparator` chỉ dùng để sắp xếp theo thứ tự tăng dần.
- [ ] `Comparable` chỉ áp dụng được cho mảng tĩnh, còn `Comparator` chỉ áp dụng được cho các cấu trúc dữ liệu Collection.
- [ ] `Comparable` bắt buộc phải sử dụng biểu thức Lambda, trong khi `Comparator` không hỗ trợ cú pháp Functional Interface.

> **Giải thích:** Class `Student implements Comparable<Student>` định nghĩa sắp xếp mặc định theo ID (`this.id - o.id`). Khi bạn muốn cung cấp thêm nhiều tiêu chí sắp xếp khác cho người dùng (sắp theo Tên, sắp theo Điểm trung bình GPA, sắp theo Tuổi), bạn tạo các `Comparator`: `Comparator.comparing(Student::getName)` hoặc `Comparator.comparingDouble(Student::getGpa).reversed()` cực kỳ linh hoạt mà không cần sửa đổi mã nguồn gốc của class `Student`.

### Câu 19: Trong khối lệnh `try-catch-finally`, nếu cả khối `try` và khối `finally` đều chứa câu lệnh `return`, hành vi thực thi của Java là gì?
- [x] Giá trị trả về của câu lệnh `return` trong khối `finally` sẽ luôn ghi đè và thay thế hoàn toàn giá trị trả về (hoặc ngoại lệ) của khối `try`.
- [ ] Giá trị của câu lệnh `return` trong khối `try` sẽ được ưu tiên giữ nguyên, câu lệnh `return` trong `finally` sẽ bị bỏ qua.
- [ ] Trình biên dịch `javac` sẽ báo lỗi cú pháp biên dịch `Unreachable statement` và từ chối tạo file bytecode.
- [ ] JVM sẽ ném ra ngoại lệ runtime `IllegalStateException` ngay khi phương thức chuẩn bị kết thúc.

> **Giải thích:** Đây là một cạm bẫy kinh điển: Khối `finally` luôn được đảm bảo thực thi trước khi luồng điều khiển thoát khỏi phương thức. Nếu đặt `return` hoặc `throw` bên trong `finally`, nó sẽ hủy bỏ toàn bộ giá trị return hoặc exception chưa kịp ném ra ở khối `try`. Quy tắc vàng: Tuyệt đối không bao giờ đặt câu lệnh `return` bên trong khối `finally`!

### Câu 20: Kỹ thuật Java Reflection cung cấp khả năng gì và đi kèm với những đánh đổi (Trade-offs) kỹ thuật nào?
- [x] Cho phép kiểm tra, khởi tạo và can thiệp động vào các Class, Method, Field lúc Runtime (kể cả private); đánh đổi bằng việc giảm hiệu năng thực thi, mất kiểm tra an toàn kiểu lúc biên dịch và làm suy yếu tính đóng gói.
- [ ] Tự động tối ưu hóa mã bytecode thành mã máy cục bộ, nhưng làm tăng gấp đôi dung lượng file `.class` sau khi build.
- [ ] Cho phép ứng dụng Java có thể gọi trực tiếp các thư viện mã nguồn C++ mà không cần thông qua giao tiếp JNI (Java Native Interface).
- [ ] Đảm bảo ứng dụng không bao giờ bị tấn công lỗ hổng bảo mật Deserialization khi nạp dữ liệu từ xa.

> **Giải thích:** Reflection là "ma thuật" đứng sau hầu hết các Framework lớn như Spring (DI, AOP), Hibernate (ORM), Jackson (JSON serialization). Nhờ Reflection, Spring có thể đọc annotation `@Autowired` và set giá trị vào private field. Tuy nhiên, vì bỏ qua bộ tối ưu hóa của JIT Compiler và kiểm tra quyền bảo mật (Security check) ở mỗi lần gọi, Reflection tốn nhiều chu kỳ CPU hơn cuộc gọi phương thức thông thường.
