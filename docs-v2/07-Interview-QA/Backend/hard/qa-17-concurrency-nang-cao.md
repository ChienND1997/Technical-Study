# Câu hỏi: Concurrency nâng cao

Kiến thức gốc: [Java Concurrency](/go?p=08-Java%2FJava-Concurrency%2Findex.md), đặc biệt [Java Memory Model](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-16-java-memory-model.md), [Atomic và nonblocking](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-15-atomic-nonblocking.md), [AQS](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-14-custom-synchronizer-aqs.md), [Liveness](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-10-liveness-hazards.md), [Virtual Threads](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md). Các câu cơ bản hơn: [qa-13](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-13-concurrency-nen-tang.md) và [qa-14](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md).

Ở mức senior, người phỏng vấn không hỏi "`volatile` là gì" mà hỏi **vì sao**, **khi nào hỏng**, **đánh đổi gì**. Mỗi câu đi theo chuỗi để bạn tự suy ngược ra đáp án thay vì học thuộc: **Câu hỏi** (hiện tượng hoặc tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả tới đáp án, gồm nguyên lý ở mức phần cứng/JVM), **Đáp án ngắn** (để nói), **Nhớ** (một dòng cần ghi), kèm **Ví dụ** (chương trình chạy thật kèm output), **Hỏi xoáy** (mỗi câu có dòng **Vì sao hỏi tiếp** giải thích vì sao nó là bước tiếp theo logic), **Dấu hiệu trả lời tốt** và **Sai lầm hay gặp** để tự chấm. Nên che phần Lập luận và đáp án, tự trả lời các gợi ý trước.

**Về độ tin cậy của ví dụ:** ví dụ gắn _Đã chạy thử trên JDK 11_ chạy trong môi trường 2 nhân CPU x86-64; số liệu lỗi concurrency và thời gian **đổi mỗi lần chạy**, chỉ xu hướng là ổn định. Số đo thời gian ở đây là đo thô bằng `System.nanoTime()` để thấy **bậc độ lớn**, không phải benchmark nghiêm túc (muốn nghiêm túc phải dùng JMH, xem câu 14). Ví dụ cần Java 21 hoặc công cụ không có trong sandbox được ghi rõ là _Minh họa, chưa chạy thử_.

**Tóm tắt:**

- Phạm vi file: concurrency nâng cao, đi sâu vào Java Memory Model, lock-free và công cụ nền của `java.util.concurrent`.
- Compiler và CPU được sắp xếp lại thao tác miễn kết quả trong một thread không đổi; JMM chỉ bảo đảm hiển thị qua happens-before, nên kết quả `(0, 0)` là hợp lệ khi thiếu nó.
- Double-checked locking cần `volatile` vì `instance = new X()` gồm nhiều bước có thể bị sắp xếp lại; field `final` có initialization safety chỉ khi `this` không lọt ra trong constructor.
- Công bố an toàn là cách tạo cạnh happens-before (static initializer, `volatile`, lock chung, collection concurrent, `final`).
- CAS là một lệnh CPU, nền của `Atomic*` và các cấu trúc lock-free (Treiber stack, Michael-Scott queue); ABA cần số phiên bản, tranh chấp cao thì `LongAdder` chia ô.
- AQS gói ba thứ chung (state bằng CAS, queue FIFO, park/unpark) để `ReentrantLock`, `Semaphore`, `CountDownLatch` chỉ cần định nghĩa ý nghĩa của `state`; Amdahl chặn mức tăng tốc bởi phần tuần tự.
- Hay bị hỏi xoáy nhất: vì sao thiếu `volatile` trong DCL trả về object dở dang, ABA là gì, và virtual thread bị pinning khi nào.

## 1. Một chương trình hai thread cho kết quả `(0, 0)` mà theo thứ tự chương trình thì không thể: happens-before giải thích điều này thế nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Phần cứng và compiler được sắp xếp lại thao tác trong điều kiện nào (khái niệm: as-if-serial, store buffer)?
- Với một thread thì reordering vô hình, với hai thread thì lộ ra: vì sao?
- JMM cần quy tắc nào để nói "ghi của A chắc chắn thấy được ở B" (khái niệm: happens-before, data race)?

**Lập luận:** Phần cứng và compiler được phép sắp xếp lại thao tác memory để chạy nhanh, miễn là kết quả **trong một thread** không đổi (as-if-serial). Ví dụ CPU có **store buffer**: lệnh ghi được đưa vào hàng đệm riêng của nhân và chưa hiện ra cho nhân khác, trong khi lệnh đọc kế tiếp chạy ngay; hệ quả là nhân khác thấy các thao tác của bạn theo thứ tự khác chương trình. Với một thread điều đó vô hình; với hai thread nó lộ ra. JMM không nói "thứ tự thật", nó định nghĩa **happens-before**: nếu A happens-before B thì ghi của A **chắc chắn thấy được** ở B. Không có cạnh happens-before thì JVM tự do (không phải "chắc chắn sai", mà "không bảo đảm gì"). Vì vậy không có cạnh happens-before thì JVM tự do, và kết quả `(0, 0)` là hợp lệ chứ không phải lỗi phần cứng.

**Đáp án ngắn:** Các cạnh happens-before chính: thứ tự chương trình trong một thread; `unlock` rồi `lock` cùng monitor; ghi `volatile` rồi đọc `volatile` cùng biến; `Thread.start()` và `join()`; bắc cầu. **Data race** = hai truy cập cùng biến từ hai thread, ít nhất một ghi, không có happens-before giữa chúng. Chương trình không có data race thì hành xử như thể tuần tự (sequential consistency).

**Ví dụ:** bài "litmus test" kinh điển. Thread 1: `a = 1; x = b;`. Thread 2: `b = 1; y = a;`. Ban đầu `a = b = 0`. Nếu mọi thứ tuần tự thì ít nhất một thread thấy giá trị 1, tức `(x, y) = (0, 0)` là **không thể**. Chạy 1.000.000 vòng (mỗi vòng dùng ô nhớ mới, hai thread đồng bộ xuất phát bằng spin-barrier để tăng khả năng chồng lấn):

```java
// vòng i: Thread 1: a[i] = 1; x[i] = b[i];     Thread 2: b[i] = 1; y[i] = a[i];
// đếm các cặp (x[i], y[i])
```

```text
(x,y)=(0,0): 55176  (0,1): 467571  (1,0): 470459  (1,1): 6794  tren 1000000 vong
(x,y)=(0,0): 38338  (0,1): 472195  (1,0): 481306  (1,1): 8161  tren 1000000 vong
(x,y)=(0,0): 73553  (0,1): 455848  (1,0): 459114  (1,1): 11485  tren 1000000 vong
```

_Đã chạy thử trên JDK 11._ Cặp `(0,0)` xuất hiện **38 nghìn đến 73 nghìn lần** trên 1 triệu vòng (khoảng 4 đến 7%). Mỗi thread đã ghi xong nhưng thread kia **chưa thấy**, đúng với mô hình store buffer. Đây là ví dụ tái hiện được reordering thật, không phải suy diễn. Giờ biến `a` và `b` thành truy cập kiểu `volatile` (dùng `AtomicIntegerArray.set/get`, tương đương volatile cho từng phần tử), mọi thứ khác giữ nguyên:

```text
volatile: (0,0): 0  (0,1): 375527  (1,0): 264575  (1,1): 359898
volatile: (0,0): 0  (0,1): 437892  (1,0): 382313  (1,1): 179795
```

_Đã chạy thử trên JDK 11._ `(0,0)` về **đúng 0** trên cả hai lần: `volatile` chèn rào memory (trên x86 là lệnh làm cạn store buffer sau mỗi lần ghi), nên ghi hiện ra trước khi lệnh đọc tiếp theo chạy. Đây cũng chính là kiểu kiểm thử mà công cụ jcstress thực hiện ở quy mô lớn.

**Nhớ:** happens-before là quan hệ về tính nhìn thấy, không phải thời gian; không có nó giữa hai truy cập có ghi thì là data race. Xem [Java Memory Model](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-16-java-memory-model.md).

**Hỏi xoáy 1: Happens-before có phải thứ tự theo thời gian đồng hồ không?**
**Vì sao hỏi tiếp:** Câu trả lời dùng chữ "trước", dễ bị hiểu thành thời gian đồng hồ, nên hỏi thẳng chúng có giống nhau không.
**Đáp:** Không. Nó là quan hệ về **tính nhìn thấy**, không phải thời gian: A chạy trước B theo đồng hồ nhưng không có happens-before thì B vẫn có thể không thấy kết quả của A.

**Hỏi xoáy 2: Piggybacking là gì?**
**Vì sao hỏi tiếp:** Tính bắc cầu là lý do một cạnh `volatile` kéo theo cả dữ liệu thường, nên hỏi tiếp về piggybacking.
**Đáp:** Nhờ tính **bắc cầu**: thread A ghi biến thường `data`, rồi ghi `volatile ready = true`; thread B đọc `ready` thấy `true`, rồi đọc `data` sẽ thấy giá trị mới. Cạnh `volatile` kéo theo mọi ghi trước đó. Đó là lý do các class `java.util.concurrent` (`BlockingQueue`, `Future`, `ConcurrentHashMap`) đều "công bố" dữ liệu một cách an toàn cho thread nhận.

**Dấu hiệu trả lời tốt:** nói được happens-before là quan hệ thứ tự từng phần về **tính nhìn thấy**, nêu được ví dụ `(0,0)` và nguyên nhân (store buffer/reordering).
**Sai lầm hay gặp:** nói "volatile ép đọc từ RAM"; hoặc cho "chạy trên máy tôi không lỗi" là bằng chứng đúng (ví dụ trên cho thấy lỗi thật nhưng chỉ ở vài % lần).

## 2. Double-checked locking đã có `synchronized` mà vẫn có thể trả về object dở dang: vì sao cần `volatile`?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- `instance = new Heavy()` gồm những bước bytecode nào (khái niệm: cấp memory, chạy constructor, gán tham chiếu)?
- Bước nào được phép hiện ra trước (khái niệm: reordering)?
- Nhánh kiểm tra không lock của thread khác có cạnh happens-before với thread ghi không?

**Lập luận:** `instance = new Heavy()` **không phải một thao tác**. Bytecode (xem dưới) gồm: cấp memory cho object, chạy constructor để ghi các field, rồi gán tham chiếu vào biến. Compiler/CPU được phép làm cho bước **gán tham chiếu hiện ra trước** các ghi field của constructor. Khi đó nhánh kiểm tra **không lock** của một thread khác thấy `instance != null` và dùng ngay một object chưa dựng xong. `volatile` trên `instance` cấm đảo này (ghi các field happens-before việc gán volatile) và tạo cạnh happens-before tới lần đọc. Do đó thread kia thấy `instance != null` nhưng field chưa ghi, và `volatile` tạo cạnh happens-before để chặn reordering đó.

**Đáp án ngắn:** DCL cần `volatile`; cách đơn giản hơn là initialization-on-demand holder hoặc `enum`.

**Ví dụ:** bytecode thật của `instance = new Heavy()` (lấy bằng `javap -c -p`):

```java
static void init() { instance = new Heavy(); }
```

```text
 0: new           #2    // class Holder$Heavy      <- cấp bộ nhớ
 3: dup
 4: invokespecial #3    // Holder$Heavy."<init>"   <- chạy constructor (ghi field)
 7: putstatic     #4    // Field instance          <- gán tham chiếu
10: return
```

_Đã chạy thử trên JDK 11 (biên dịch bằng `javax.tools`, xem bằng `javap`)._ Bytecode xếp `putstatic` **sau** `invokespecial`, nhưng đó chỉ là thứ tự lập trình; JIT và CPU có thể làm cho bước 7 hiện ra trước các ghi của bước 4 khi thiếu `volatile`. Lỗi này **không tái hiện được dễ dàng** trên máy x86 thường (x86 giữ thứ tự giữa các lệnh ghi), nên đừng chờ test bắt được: đây là loại lỗi thấy được trên ARM hoặc sau khi JIT tối ưu mạnh. Bản đúng:

```java
class Holder {
    private static volatile Heavy instance;
    static Heavy get() {
        Heavy h = instance;                       // một lần đọc volatile
        if (h == null) {
            synchronized (Holder.class) {
                h = instance;
                if (h == null) instance = h = new Heavy();
            }
        }
        return h;
    }
}
// bản đơn giản hơn (không cần volatile, không cần khóa):
class Lazy { private static class H { static final Heavy I = new Heavy(); } static Heavy get() { return H.I; } }
```

_Minh họa, không cần chạy._ Holder idiom an toàn vì JVM bảo đảm việc **khởi tạo class** `H` xảy ra một lần, thread-safe, và chỉ khi `H` lần đầu được dùng (lazy).

**Nhớ:** DCL cần `volatile`; lựa chọn đơn giản hơn là holder idiom hoặc `enum`.

**Hỏi xoáy 1: Thêm `synchronized` vào bên trong chưa đủ sao?**
**Vì sao hỏi tiếp:** Người ta thường nghĩ khối `synchronized` bên trong đã đủ, nên hỏi tại sao không.
**Đáp:** Không. Lần kiểm tra đầu `if (instance == null)` nằm **ngoài** khối lock, nên thread đọc không có cạnh happens-before với thread ghi; nó vẫn có thể thấy object dở dang.

**Hỏi xoáy 2: `final` field trong `Heavy` có thay `volatile` được không?**
**Vì sao hỏi tiếp:** Một cách khác để có an toàn là `final` field, nên hỏi nó có thay được `volatile` không.
**Đáp:** Một phần: nếu mọi field của `Heavy` là `final` thì thread nào thấy tham chiếu cũng thấy các field đó đúng (câu 3), nhưng điều đó không áp dụng cho các object mà `Heavy` trỏ tới và không giúp nếu field không `final`. Dùng `volatile` hoặc holder idiom là chắc nhất.

**Dấu hiệu trả lời tốt:** nêu ba bước và lý do reordering; biết lựa chọn holder/enum.
**Sai lầm hay gặp:** nghĩ `synchronized` bên trong là đủ.

## 3. Object chỉ có getter và được công bố qua data race vẫn có thể thấy field mặc định: `final` field bảo đảm gì (initialization safety)?

**Gợi ý suy luận:**
- Field `final` được JMM xử lý khác field thường ở thời điểm nào (khái niệm: freeze cuối constructor)?
- Điều kiện để bảo đảm này có hiệu lực là gì (khái niệm: `this` không thoát trong constructor)?
- Bất biến thật khác bất biến theo quy ước ở đâu?

**Lập luận:** JMM cho riêng field `final` một quy tắc đặc biệt: cuối constructor có một "**freeze**" (rào). Mọi thread thấy tham chiếu tới object, kể cả được công bố qua một data race, **chắc chắn thấy các field `final` đã được gán đúng giá trị** và những gì chúng trỏ tới tại thời điểm freeze. Quy tắc này **chỉ có hiệu lực nếu `this` không bị lộ ra trước khi constructor kết thúc**. Field không `final` không có bảo đảm đó. Vì vậy bất biến thật (mọi field `final`, `this` không thoát) dùng chung được không cần đồng bộ, còn bất biến theo quy ước thì không có bảo đảm.

**Đáp án ngắn:** Bất biến thật (mọi field `final`, không để `this` thoát trong constructor) dùng chung không cần đồng bộ. Phân biệt với "bất biến theo quy ước" (không `final`, chỉ không có setter): loại này **không** có bảo đảm.

**Ví dụ:** chứng minh vế "this không được thoát": constructor khởi động một thread đọc field `final` trước khi nó được gán.

```java
static class Leaky {
    final String name;
    Leaky() {
        new Thread(() -> System.out.println("luong khac thay name = " + Leaky.this.name)).start();
        try { Thread.sleep(200); } catch (InterruptedException e) {}
        this.name = "da-xong";
    }
}
```

```text
luong khac thay name = null
sau constructor name = da-xong
```

_Đã chạy thử trên JDK 11._ Một field `final` mà vẫn bị thấy là `null`: bảo đảm freeze chỉ bắt đầu **sau khi constructor kết thúc**. Mặt tích cực của quy tắc (thấy giá trị đúng dù công bố không an toàn) không tái hiện được trên x86 vì nó vốn hiếm lộ; đây là lý do phải học thuộc quy tắc thay vì chờ test bắt lỗi.

**Nhớ:** `final` + không để `this` thoát = bất biến thật, an toàn kể cả công bố không đồng bộ.

**Hỏi xoáy 1: `final List<String> items` có phải bất biến không?**
**Vì sao hỏi tiếp:** Bảo đảm của `final` chỉ áp cho chính field, nên hỏi trường hợp `final List` có phải bất biến không.
**Đáp:** Tham chiếu `items` được bảo đảm, **nội dung list** thì chỉ được bảo đảm tại thời điểm freeze; nếu về sau ai đó `items.add(...)` thì đó là mutable bình thường và cần đồng bộ. Muốn bất biến thật: `List.copyOf(in)` trong constructor.

**Hỏi xoáy 2: Record và initialization safety?**
**Vì sao hỏi tiếp:** Record là cú pháp hiện đại cho kiểu bất biến, nên hỏi chúng có thừa hưởng bảo đảm này không.
**Đáp:** Field của record là `final`, nên có bảo đảm freeze; nhưng record chỉ bất biến **nông**, nội dung của field kiểu collection vẫn cần sao chép phòng thủ.

**Dấu hiệu trả lời tốt:** phân biệt "bất biến theo quy ước" với "bất biến thật (final + không thoát this)".
**Sai lầm hay gặp:** tin rằng object "chỉ có getter" là thread-safe khi field không `final` và được công bố không an toàn.

## 4. Bạn đưa một object cho thread khác dùng: các cách công bố nào an toàn và vì sao?

**Gợi ý suy luận:**
- Giữa "xây xong" và "bị đọc" cần điều gì để thread đọc thấy trạng thái đầy đủ (khái niệm: happens-before)?
- Những cấu trúc nào tạo cạnh đó (static initializer, `volatile`, lock, collection đồng thời)?
- Object bất biến thật và object mutable cần mức bảo vệ khác nhau thế nào?

**Lập luận:** Công bố đưa tham chiếu của object cho thread khác. Nếu giữa "xây xong" và "bị đọc" không có cạnh happens-before thì thread đọc có thể thấy tham chiếu mà không thấy trạng thái đã ghi (câu 2). Mỗi idiom an toàn thực chất là **một cách tạo cạnh happens-before**: static initializer (class được khởi tạo an toàn), `volatile`/`AtomicReference` (ghi rồi đọc), lock chung, collection concurrent (`put` happens-before `get`), `final`. Vì mỗi idiom an toàn là một cách tạo cạnh happens-before, bất biến thật dùng cách nào cũng được, còn mutable cần công bố an toàn và đồng bộ khi truy cập tiếp.

**Đáp án ngắn:** Các idiom: static initializer; field `volatile` hoặc `AtomicReference`; field `final` của object tạo đúng cách; field được bảo vệ cùng một lock; đặt vào `ConcurrentHashMap`/`BlockingQueue`/`Collections.synchronizedList`. Với object **bất biến thật**, công bố đường nào cũng an toàn. Với object **mutable**, phải công bố an toàn **và** đồng bộ mọi truy cập sau đó.

**Ví dụ:** công bố an toàn **chưa** bảo vệ gì cho các lần sửa sau đó. `HashMap` được tạo xong rồi đưa cho hai thread (công bố an toàn vì `start()` happens-before), nhưng hai thread cùng ghi:

```java
Map<String,Integer> hm = new HashMap<>();   // đưa cho 2 thread qua Thread.start()
// mỗi thread: 200_000 lần hm.merge("k" + (i % 50), 1, Integer::sum);
```

```text
HashMap + 2 luong, tong dem = 399742 (ky vong 400000)
ConcurrentHashMap.merge       = 400000 (ky vong 400000)
```

_Đã chạy thử trên JDK 11 (con số của `HashMap` đổi mỗi lần)._ Tham chiếu tới map thì an toàn, nhưng 258 lần cộng bị mất vì **sửa đồng thời** không được đồng bộ. Công bố an toàn chỉ giải quyết bài toán "thấy object", không giải quyết "sửa object".

**Nhớ:** công bố an toàn = tạo được cạnh happens-before; mutable cần thêm lock, effectively immutable chỉ cần công bố an toàn.

**Hỏi xoáy 1: Effectively immutable là gì?**
**Vì sao hỏi tiếp:** Giữa bất biến và mutable còn loại không sửa sau khi công bố, nên hỏi effectively immutable.
**Đáp:** Object kỹ thuật là mutable nhưng **không bị sửa sau khi công bố** (ví dụ một `Date` hoặc một list build xong rồi chỉ đọc). Loại này chỉ cần công bố an toàn, không cần lock khi đọc; nhưng nếu ai đó vô tình sửa thì mọi bảo đảm mất.

**Hỏi xoáy 2: `this` escape là gì?**
**Vì sao hỏi tiếp:** Công bố sớm quá khiến object bị thấy khi chưa xây xong, nên hỏi `this` escape.
**Đáp:** Đăng ký listener, khởi động thread hoặc lưu `this` vào biến tĩnh bên trong constructor: object bị công bố khi chưa xây xong (ví dụ ở câu 3). Cách sửa: factory method.

**Dấu hiệu trả lời tốt:** nói được "effectively immutable chỉ cần công bố an toàn, mutable cần thêm lock".
**Sai lầm hay gặp:** công bố qua field `public` không đồng bộ rồi cho rằng "chỉ đọc nên ổn".

## 5. Counter dùng CAS thỉnh thoảng cho kết quả lạ, hoặc chậm khi nhiều thread: CAS, ABA và `LongAdder` giải thích điều gì?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- CAS làm gì ở mức phần cứng, và thất bại báo hiệu điều gì (khái niệm: `compare-and-swap`)?
- Giá trị A rồi B rồi lại A thì CAS có thấy sự thay đổi không (khái niệm: ABA)?
- Nhiều thread cùng cập nhật một ô gây tranh chấp gì và chia thành nhiều ô giải quyết ra sao (khái niệm: contention, cache line)?

**Lập luận:** CAS (compare-and-swap) là **một lệnh CPU** (trên x86: `lock cmpxchg`): "nếu ô nhớ bằng `expected` thì ghi `new`, trả về thành công hay không", nguyên tử ở mức phần cứng. Các class `Atomic*` xây trên đó: đọc, tính, CAS, thất bại thì lặp lại. Không lock, thread không bị block; thất bại nghĩa là thread khác vừa thay đổi. **Hạn chế:** CAS chỉ so sánh **giá trị**, không biết "đã đổi rồi đổi lại". Dưới tranh chấp cao, nhiều thread cùng CAS **một** ô nhớ: một thắng, số còn lại lặp lại, lãng phí CPU và dội cache line giữa các nhân. Do đó CAS lạc quan nhanh khi ít tranh chấp, ABA cần số phiên bản, và khi tranh chấp cao thì chia ô như `LongAdder` giảm cạnh tranh nhưng đổi lấy `sum()` không chính xác tức thời.

**Đáp án ngắn:** CAS lạc quan, không lock. **ABA:** giá trị A → B → A; CAS thấy "vẫn A" và thành công dù trạng thái bên dưới đã khác; xử lý bằng `AtomicStampedReference` (kèm số phiên bản). `LongAdder` chia bộ đếm thành nhiều ô, mỗi thread ưu tiên ô riêng, `sum()` cộng dồn khi đọc; nhanh hơn khi ghi nhiều nhưng `sum()` không phải ảnh chụp nguyên tử.

**Ví dụ 1 (CAS và ABA, xác định, không ngẫu nhiên):** T1 đọc `A`; T2 đổi `A→B→A`; sau đó T1 CAS `A→C`.

```java
AtomicReference<String> ref = new AtomicReference<>("A");
AtomicStampedReference<String> st = new AtomicStampedReference<>("A", 0);
// T1 đọc ref và st (stamp 0), chờ; T2: ref A->B->A ; st (A,0)->(B,1)->(A,2); T1 CAS
```

```text
CAS loop tang 5 -> 6
compareAndSet(5, 99) khi gia tri la 6 -> false
T1: AtomicReference  CAS(A->C) = true   (thay 'van la A', khong biet da qua B)
T1: StampedReference CAS(A->C) = false  (stamp da doi)
```

_Đã chạy thử trên JDK 11._ `AtomicReference` bị lừa (thành công trong khi lịch sử đã đổi); phiên bản có **stamp** phát hiện được. Trong cấu trúc lock-free (stack/queue) ABA có thể làm hỏng liên kết con trỏ; Java có GC nên node không bị tái sử dụng "ngầm" như C++, nên ABA hiếm hơn nhưng vẫn xảy ra khi bạn tự pool node.

**Ví dụ 2 (tranh chấp ghi):** 2 thread, mỗi thread 20.000.000 lần tăng.

```text
lan 0: AtomicLong  245 ms (=40000000)  |  LongAdder  113 ms (=40000000)
lan 1: AtomicLong  246 ms (=40000000)  |  LongAdder   89 ms (=40000000)
lan 2: AtomicLong  290 ms (=40000000)  |  LongAdder   82 ms (=40000000)
```

_Đã chạy thử trên JDK 11 (đo thô, chỉ 2 nhân; khác biệt sẽ lớn hơn nhiều khi 16 nhân trở lên)._ `LongAdder` nhanh hơn khoảng 2 đến 3 lần ngay cả với 2 thread. Bù lại, đọc `sum()` phải cộng nhiều ô và không nguyên tử với các lần ghi đang chạy.

**Nhớ:** CAS không lock nhưng có ABA; `LongAdder` cho thống kê, `AtomicLong` khi cần giá trị chính xác. Xem [Atomic và nonblocking](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-15-atomic-nonblocking.md).

**Hỏi xoáy 1: Vì sao CAS không "wait-free"?**
**Vì sao hỏi tiếp:** Không lock không có nghĩa là mọi thread đều hoàn thành, nên hỏi vì sao CAS không wait-free.
**Đáp:** Một thread có thể thất bại CAS vô hạn lần nếu bị thread khác liên tục thắng; hệ thống **tổng thể** luôn có tiến triển (lock-free) nhưng từng thread riêng không có giới hạn thời gian (không wait-free).

**Hỏi xoáy 2: False sharing là gì?**
**Vì sao hỏi tiếp:** Chậm bất thường dù không lock thường do phần cứng, nên hỏi false sharing.
**Đáp:** Hai biến khác nhau nằm cùng một **cache line** (thường 64 byte) bị các nhân khác nhau ghi liên tục; mỗi lần ghi làm vô hiệu cache line của nhân kia dù biến độc lập. `LongAdder` dùng `@Contended`/đệm để các ô nằm cache line riêng. Dấu hiệu: chậm bất thường dù không có lock.

**Dấu hiệu trả lời tốt:** chọn `LongAdder` cho thống kê, `AtomicLong` khi cần giá trị chính xác tức thời; không nói "CAS luôn nhanh hơn lock".
**Sai lầm hay gặp:** `LongAdder.sum()` dùng để ra quyết định cần chính xác (ví dụ giới hạn số lượng): có thể đã sai lúc đọc.

## 6. Làm sao một stack hoặc queue chạy đúng với nhiều thread mà không cần lock?

**Gợi ý suy luận:**
- Một thao tác CAS đổi được mấy ô nhớ, và push/pop stack cần đổi mấy con trỏ?
- Queue cần đổi hai con trỏ thì giải quyết trạng thái dở dang thế nào (khái niệm: helping)?
- "Không lock" bảo đảm tiến triển ở mức nào (khái niệm: lock-free, wait-free)?

**Lập luận:** Lock-free dựa trên "một thao tác CAS duy nhất làm trạng thái chuyển từ hợp lệ sang hợp lệ". **Stack Treiber** làm được vì một thao tác `push`/`pop` chỉ đổi **một** con trỏ `head`. **Queue** thì cần đổi **hai** con trỏ (`tail.next` và `tail`) mà CAS chỉ làm được một ô mỗi lần, nên Michael-Scott dùng kỹ thuật **helping**: state trung gian ("đã gắn node nhưng `tail` chưa dời") được thiết kế để **hợp lệ và nhận ra được**, thread nào gặp nó sẽ giúp hoàn tất bước hai thay vì chờ. Do đó Treiber stack chỉ cần một CAS trên `head`, còn Michael-Scott queue phải cho các thread giúp hoàn tất bước dở của nhau để hệ thống luôn tiến triển.

**Đáp án ngắn:** Treiber: `push` tạo node trỏ tới `head`, CAS `head`; `pop` CAS `head` sang `head.next`. Michael-Scott: có node giả, chèn hai bước, và helping. Ưu điểm: thread chậm/treo không block thread khác, không deadlock. Nhược điểm: khó viết đúng, hiệu năng không phải lúc nào hơn lock.

**Ví dụ:** stack Treiber tự viết, kiểm thử bằng 2 thread cùng `push` 200.000 phần tử, rồi `pop` hết và kiểm tra checksum.

```java
class Treiber<E> {
    private static class Node<E> { final E item; Node<E> next; Node(E i){ item = i; } }
    private final AtomicReference<Node<E>> head = new AtomicReference<>();
    void push(E e) { Node<E> n = new Node<>(e), h; do { h = head.get(); n.next = h; } while (!head.compareAndSet(h, n)); }
    E pop() { Node<E> h, nx; do { h = head.get(); if (h == null) return null; nx = h.next; } while (!head.compareAndSet(h, nx)); return h.item; }
}
```

```text
push 400000 phan tu tu 2 luong, pop duoc 400000, tong 80000200000 (ky vong 80000200000)
```

_Đã chạy thử trên JDK 11._ Không mất phần tử nào dù không có lock. (Kiểm thử bằng checksum như vậy chứng minh được sự có mặt của lỗi, không chứng minh sự vắng mặt: xem câu 14.) Trong thực tế dùng `ConcurrentLinkedQueue`/`ConcurrentLinkedDeque` thay vì tự viết.

**Nhớ:** lock-free = luôn có ít nhất một thread tiến triển; queue cần node giả và helping; thực tế dùng thư viện.

**Hỏi xoáy 1: Khác nhau giữa lock-free, wait-free, obstruction-free?**
**Vì sao hỏi tiếp:** Từ "lock-free" hay bị dùng lẫn lộn, nên hỏi phân biệt với wait-free và obstruction-free.
**Đáp:** *Obstruction-free:* một thread chạy một mình thì hoàn thành. *Lock-free:* với mọi thời điểm, ít nhất một thread tiến triển (chấp nhận có thread bị "đói"). *Wait-free:* mọi thread hoàn thành trong số bước hữu hạn. Càng mạnh càng khó xây dựng.

**Hỏi xoáy 2: Vì sao queue cần node giả?**
**Vì sao hỏi tiếp:** Node giả là chi tiết làm queue chạy đúng, nên hỏi vì sao cần nó.
**Đáp:** Để `head` và `tail` luôn trỏ tới node hợp lệ ngay cả khi queue rỗng, tránh trường hợp đặc biệt "queue rỗng" làm hai thread tranh nhau thay đổi cùng lúc cả hai con trỏ.

**Dấu hiệu trả lời tốt:** nói được "helping" và vì sao cần; thừa nhận dùng thư viện thay vì tự viết.
**Sai lầm hay gặp:** gọi mọi cấu trúc dùng `Atomic*` là lock-free mà không kiểm tra tiến triển (vòng `while` tự quay với `AtomicBoolean` làm "lock" chỉ là spinlock).

## 7. `ReentrantLock`, `Semaphore`, `CountDownLatch` dùng chung nền tảng nào: AQS hoạt động ra sao?

**Gợi ý suy luận:**
- Mọi bộ đồng bộ cần những thành phần cơ khí nào (trạng thái, queue chờ, ngủ và đánh thức)?
- `state` thay đổi an toàn nhờ gì và queue được xây thế nào (khái niệm: `volatile int`, CAS, queue FIFO)?
- Thread chưa vào được thì ngủ bằng cách nào (khái niệm: park/unpark, không busy wait)?

**Lập luận:** Mọi bộ đồng bộ (lock, semaphore, latch) cần cùng một phần cơ khí: (1) một **trạng thái** để biết "được vào chưa", (2) một **queue FIFO** để xếp các thread chưa vào được, (3) cách **ngủ và đánh thức** thread (không quay vòng). AQS gói ba thứ đó một lần: `state` là `volatile int` thao tác bằng CAS; queue là biến thể của hàng CLH (danh sách liên kết đôi các node); ngủ/đánh thức bằng `LockSupport.park/unpark`. Subclass chỉ quyết định **ý nghĩa** của `state` qua `tryAcquire`/`tryRelease` (độc quyền) hoặc `tryAcquireShared`/`tryReleaseShared` (chia sẻ). Vì ba thành phần đó giống nhau ở mọi bộ đồng bộ nên AQS gói chúng một lần, bộ cụ thể chỉ phải định nghĩa ý nghĩa của `state`.

**Đáp án ngắn:** `acquire`: gọi `tryAcquire`; thất bại thì xếp node vào cuối queue và `park`; được đánh thức thì retry. `release`: gọi `tryRelease`; thành công thì `unpark` node kế tiếp.

| Class | `state` biểu diễn |
|---|---|
| `ReentrantLock` | Số lần chủ sở hữu đã giữ lock (0 là rảnh) |
| `Semaphore` | Số permit còn lại |
| `CountDownLatch` | Số đếm còn lại |
| `ReentrantReadWriteLock` | Nửa trên: số reader; nửa dưới: số lần giữ write lock |
| `FutureTask` | Trạng thái tác vụ (chạy, xong, hủy) |

**Ví dụ:** quan sát AQS qua `ReentrantLock` (xây trên AQS): `state`, reentrancy, và queue.

```java
lock.lock(); lock.lock();                          // main giữ 2 lần
// 3 thread W1..W3 cùng lock.lock()
System.out.println(lock.getHoldCount() + " " + lock.getQueueLength() + " " + lock);
```

```text
main giu khoa: isLocked=true, holdCount=1, hang cho=0
main khoa lai (reentrant): holdCount=2
3 thread xin khoa: hang cho=3, W1 dang xep hang? true, trang thai W1=WAITING
java.util.concurrent.locks.ReentrantLock@7fc229ab[Locked by thread main]
unlock 1 lan: holdCount=1 (van giu, W1 van doi)
unlock lan 2 -> luong ke tiep duoc danh thuc lan luot; hang cho=0, isLocked=false
```

_Đã chạy thử trên JDK 11._ `holdCount` chính là `state` của `ReentrantLock` (đếm số lần vào lại); ba thread chờ nằm trong queue AQS ở trạng thái **WAITING** (đã `park`, không tốn CPU), và chỉ khi `state` về 0 thì node đầu hàng được `unpark`.

**Nhớ:** AQS = `state` + queue FIFO + park/unpark; tách chính sách (`tryAcquire`) khỏi cơ chế. Xem [AQS](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-14-custom-synchronizer-aqs.md).

**Hỏi xoáy 1: Fair và nonfair khác gì ở mức AQS?**
**Vì sao hỏi tiếp:** Chính sách vào key là phần các class khác nhau tự quyết, nên hỏi fair và nonfair khác gì.
**Đáp:** Nonfair: thread mới tới thử `tryAcquire` **trước khi** xếp hàng, nên có thể "chen ngang" thread đang chờ ngay lúc `state` vừa về 0, tránh một lần đánh thức. Fair: kiểm tra `hasQueuedPredecessors()` rồi mới thử, nên luôn theo thứ tự. Số đo: 4 thread × 500.000 lần lock/unlock, nonfair 63 ms so với fair 4.948 ms (_đã chạy thử trên JDK 11_). Cái giá của fair là mỗi lần nhả lock buộc đánh thức thread đầu hàng.

**Hỏi xoáy 2: `Condition` nằm ở đâu?**
**Vì sao hỏi tiếp:** `Condition` là mảnh ghép ngoài lock, nên hỏi nó nằm ở đâu trong AQS.
**Đáp:** Mỗi `Condition` có queue **riêng**; `await` chuyển node từ queue điều kiện, nhả lock, ngủ; `signal` chuyển node đó trở lại queue lock của AQS.

**Dấu hiệu trả lời tốt:** nêu `state` + queue + park/unpark và vì sao tách "chính sách" (`tryAcquire`) khỏi "cơ chế" (queue).
**Sai lầm hay gặp:** nghĩ AQS dùng `synchronized` hay vòng lặp bận (busy wait) để chờ.

## 8. Bạn cần một mutex hoặc latch riêng: tự viết bằng AQS thế nào?

**Gợi ý suy luận:**
- Một bộ đồng bộ mới cần quyết định điều gì (khi nào thread được vào, tức ý nghĩa của `state`)?
- Độc quyền khác chia sẻ ở chỗ nào (`tryAcquire` hay `tryAcquireShared`)?
- Phần ngủ, xếp hàng, đánh thức đã có ở đâu?

**Lập luận:** Muốn có một bộ đồng bộ mới, bạn chỉ cần trả lời "khi nào thread được vào?" bằng cách định nghĩa ý nghĩa của `state`; phần ngủ, xếp hàng, đánh thức đã có sẵn. Mutex: `state` 0 = rảnh, 1 = bị giữ. Latch một lần: `state` 0 = đóng, 1 = mở (chế độ **shared**, mở cho mọi thread chờ cùng lúc). Vì AQS lo hết phần chờ nên bạn chỉ cài `tryAcquire`/`tryRelease` (hoặc bản shared) và không được tự ngủ trong đó. Điểm dễ nhầm là tự ngủ hoặc chờ trong `tryAcquire` (phá cơ chế queue của AQS) và quên rằng `state` chỉ có ý nghĩa mà bạn gán. Hệ quả khi thiết kế: định nghĩa rõ bất biến của `state` (độc quyền hay chia sẻ, reentrant hay không) rồi viết test với nhiều thread, vì lỗi trong lớp đồng bộ tự viết thường chỉ lộ dưới tải; nếu `Semaphore` hay `ReentrantLock` đã đủ thì không nên tự viết.

**Đáp án ngắn:** Cài `tryAcquire`/`tryRelease` cho độc quyền hoặc `tryAcquireShared`/`tryReleaseShared` cho chia sẻ; việc chặn là của AQS, không được tự ngủ trong `tryAcquire`.

**Ví dụ:**

```java
class SimpleMutex {
    private static final class Sync extends AbstractQueuedSynchronizer {
        @Override protected boolean tryAcquire(int ignored) {
            if (compareAndSetState(0, 1)) { setExclusiveOwnerThread(Thread.currentThread()); return true; }
            return false;
        }
        @Override protected boolean tryRelease(int ignored) {
            if (getState() == 0 || getExclusiveOwnerThread() != Thread.currentThread()) throw new IllegalMonitorStateException();
            setExclusiveOwnerThread(null);
            setState(0);          // ghi volatile, công bố các thay đổi trước đó
            return true;
        }
        @Override protected boolean isHeldExclusively() { return getExclusiveOwnerThread() == Thread.currentThread(); }
    }
    private final Sync sync = new Sync();
    void lock() { sync.acquire(1); }  void unlock() { sync.release(1); }
}
class OneShotLatch {
    private static final class Sync extends AbstractQueuedSynchronizer {
        @Override protected int tryAcquireShared(int ignored) { return getState() == 1 ? 1 : -1; }
        @Override protected boolean tryReleaseShared(int ignored) { setState(1); return true; }
    }
    private final Sync sync = new Sync();
    void await() throws InterruptedException { sync.acquireSharedInterruptibly(0); }
    void signal() { sync.releaseShared(0); }
}
```

Kiểm thử: 2 thread × 500.000 lần `lock(); counter++; unlock();`, thử lock lần hai trên cùng thread, và 3 waiter chờ latch:

```text
SimpleMutex: 2 luong x 500000 lan => counter = 1000000
khoa lan 2 cung luong (khong reentrant) tryLock(300ms) = false  -> lock() thuong se tu ket mai
signal() sau 300 ms
waiter 2 qua cong sau 309 ms
waiter 0 qua cong sau 306 ms
waiter 1 qua cong sau 307 ms
```

_Đã chạy thử trên JDK 11._ Counter ra đúng 1.000.000: mutex bảo vệ được cả vùng găng lẫn hiển thị (nhờ `setState(0)` là ghi volatile). Mutex này **không reentrant**: thread đã giữ mà `lock` lần hai sẽ tự chặn (ở đây `tryAcquireNanos` trả `false` sau 300 ms thay vì treo). Latch mở thì **cả ba** waiter qua cổng gần như cùng lúc (~307 ms), đúng ngữ nghĩa shared.

**Nhớ:** định nghĩa `state` và cài `tryAcquire`/`tryRelease`; việc chặn là của AQS; `setState` trong release là điểm tạo happens-before.

**Hỏi xoáy 1: Làm cho mutex reentrant thế nào?**
**Vì sao hỏi tiếp:** Mutex ví dụ chưa cho giữ lại nhiều lần, nên hỏi làm nó reentrant thế nào.
**Đáp:** Dùng `state` đếm số lần giữ; `tryAcquire` thấy chủ sở hữu là thread hiện tại thì `setState(getState()+1)`; `tryRelease` giảm, chỉ trả `true` khi về 0.

**Hỏi xoáy 2: Vì sao `tryRelease` dùng `setState` thay vì CAS?**
**Vì sao hỏi tiếp:** Phần release ghi `state` không dùng CAS khiến người ta thắc mắc về an toàn, nên hỏi vì sao dùng `setState`.
**Đáp:** Chỉ chủ sở hữu mới gọi `release` nên không có tranh chấp ghi; nhưng `setState` vẫn là ghi volatile, và chính nó tạo cạnh happens-before cho thread lấy lock sau.

**Dấu hiệu trả lời tốt:** biết `release` ghi `state` là điểm tạo happens-before; mutex trên không reentrant.
**Sai lầm hay gặp:** quên `setExclusiveOwnerThread`, hoặc cho `tryAcquire` chặn/ngủ.

## 9. Thread chờ mãi dù đã có `notify`, hoặc thức dậy khi điều kiện chưa đúng: `wait/notify` hỏng ở đâu?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- `notify` mang thông tin gì, và nếu phát khi chưa ai chờ thì sao (khái niệm: missed signal)?
- Nhiều thread chờ các điều kiện khác nhau trên cùng lock thì `notify` đánh thức nhầm ai?
- Thread dậy rồi có chắc điều kiện còn đúng không (khái niệm: spurious wakeup, điều kiện bị cướp)?

**Lập luận:** `wait/notify` không mang **thông tin**: `notify` chỉ nói "có gì đó vừa đổi", không nói đổi cái gì hay cho ai. Hai hệ quả: (1) nếu tín hiệu phát ra khi chưa ai chờ thì **mất** (không có "memory tín hiệu"); (2) nếu nhiều thread chờ các điều kiện **khác nhau** trên cùng một lock, `notify` có thể đánh thức nhầm thread. Vì vậy phải chờ theo **trạng thái** (predicate) kiểm tra trong vòng lặp dưới cùng lock, không chờ theo "đã có ai gọi `notify`". Do đó phải kiểm tra điều kiện bằng vòng `while` và dùng `notifyAll` (hoặc `Condition` riêng) để không mất tín hiệu hay đánh thức nhầm.

**Đáp án ngắn:** Mẫu chuẩn: `synchronized (lock) { while (!dieuKien) lock.wait(); ... }`. Spurious wakeup và "điều kiện bị cướp" buộc dùng `while`. `notifyAll` an toàn mặc định; `notify` chỉ khi mọi thread chờ cùng điều kiện; hoặc dùng `Condition` riêng cho từng điều kiện.

**Ví dụ 1 (notify đánh thức nhầm):** `waiter-A` chờ điều kiện A, `waiter-B` chờ điều kiện B, cùng một lock. Chỉ điều kiện B trở thành đúng.

```java
synchronized (lock) { bReady = true; lock.notify(); }       // so với lock.notifyAll()
```

```text
notify   : waiter-B VAN KET (tin hieu bi lang phi cho A)
  waiter-B tinh day va thay dieu kien dung
  waiter-A tinh day va thay dieu kien dung
  waiter-B tinh day va thay dieu kien dung
notifyAll: waiter-B da chay xong
  waiter-A tinh day va thay dieu kien dung
```

_Đã chạy thử trên JDK 11 (dòng thụt vào là phần dọn dẹp cuối mỗi lượt)._ Với `notify`, JVM đánh thức `waiter-A` (vào hàng chờ trước); A kiểm tra điều kiện của mình, thấy chưa đúng, lại ngủ; **tín hiệu bị lãng phí** và B kẹt dù điều kiện của B đã đúng. Với `notifyAll` cả hai tỉnh dậy, B thấy điều kiện đúng và chạy.

**Ví dụ 2 (missed signal):** `notify` được gọi **trước** khi waiter bắt đầu `wait()` và waiter chỉ dựa vào tín hiệu (không có predicate).

```text
missed signal: waiter bat dau cho SAU notify -> van ket: true
```

_Đã chạy thử trên JDK 11._ Tín hiệu đã phát ra khi chưa ai nghe nên mất; waiter ngủ mãi. Sửa bằng một biến trạng thái `boolean ready` được đặt dưới lock, và waiter kiểm tra `while (!ready) wait()` trước khi ngủ.

**Nhớ:** `wait` luôn trong `while`; `notifyAll` an toàn mặc định; `Condition` cho nhiều queue điều kiện; thực tế dùng `BlockingQueue`.

**Hỏi xoáy 1: Spurious wakeup có thật không?**
**Vì sao hỏi tiếp:** Dùng `while` có vẻ thừa nếu không ai tự dậy, nên hỏi spurious wakeup có thật không.
**Đáp:** Đặc tả cho phép (một số nền tảng triển khai `wait` bằng cơ chế hệ điều hành có thể tỉnh sớm). Dù hiếm, vòng `while` miễn phí và còn bắt cả trường hợp "điều kiện bị thread khác lấy trước".

**Hỏi xoáy 2: `Condition` giải quyết được gì?**
**Vì sao hỏi tiếp:** Vấn đề đánh thức nhầm có công cụ chuyên biệt, nên hỏi `Condition` giải quyết được gì.
**Đáp:** Cho phép tạo **nhiều queue theo điều kiện** trên một `Lock` (`notFull`, `notEmpty` của bounded buffer), và `signal` đúng điều kiện cần, không còn đánh thức nhầm.

**Dấu hiệu trả lời tốt:** nêu `Condition` cho phép nhiều queue điều kiện; biết thực tế dùng `BlockingQueue` thay vì tự viết.
**Sai lầm hay gặp:** gọi `wait`/`notify` ngoài khối `synchronized` (ném `IllegalMonitorStateException`), dùng `if` thay `while`.

## 10. Thêm nhân CPU mà ứng dụng không nhanh hơn vì tranh chấp lock: đo và giảm thế nào, và Amdahl nói gì?

**Gợi ý suy luận:**
- Một lock làm gì với các thread muốn vào (khái niệm: serialization)?
- Phần tuần tự chặn mức tăng tốc tối đa ra sao (khái niệm: định luật Amdahl)?
- Giảm phần tuần tự bằng các cách nào: thu hẹp phạm vi, tách lock, tránh hot field?

**Lập luận:** Một lock **serialization** mọi thread muốn vào. Thời gian thread giữ lock là phần tuần tự (không parallel hóa được), nên nó chặn mức tăng tốc khi thêm nhân. Amdahl: nếu một phần `F` của công việc bắt buộc tuần tự thì tăng tốc tối đa với `N` nhân là `1 / (F + (1 − F)/N)`. Nghĩa là tối ưu **phần tuần tự** (thường là đoạn giữ lock) đáng giá hơn thêm thread. Do đó thêm nhân chỉ giúp phần parallel được, nên phải đo rồi thu hẹp phần giữ lock thay vì thêm thread. Điểm dễ nhầm là cho rằng tăng thread sẽ tăng throughput đến vô hạn, hoặc kết luận nhanh "do lock chậm" mà không đo. Quy trình: dùng profiler hoặc thread dump xem thread nào BLOCKED trên lock nào, tính phần thời gian trong lock, rồi thu hẹp phạm vi lock, chia nhỏ lock (striping), hoặc đổi sang cấu trúc ít tranh chấp (`LongAdder`, `ConcurrentHashMap`); đo lại sau mỗi thay đổi.

**Đáp án ngắn:** Thứ tự nên thử: (1) **thu hẹp phạm vi lock**, chỉ lock phần chạm state chung; (2) giảm tần suất lấy lock (gom batch); (3) **lock splitting/striping** (nhiều lock cho các nhóm trạng thái độc lập); (4) tránh hot field (dùng `LongAdder`); (5) thay lock độc quyền (`ReadWriteLock`, bất biến, copy-on-write). Đo trước bằng profiler/JFR lock profiling/thread dump.

**Ví dụ 1 (thu hẹp phạm vi lock):** mỗi lần lặp phải **tính toán** (không chạm state chung) rồi cộng kết quả vào một biến chung. 2 thread × 200.000 lần.

```java
// rộng:   synchronized (L) { double v = compute(); total += v; }
// hẹp:    double v = compute(); synchronized (L) { total += v; }
```

```text
2 luong, tinh toan NAM TRONG khoi khoa : 4337 ms
2 luong, chi cap nhat ket qua trong khoa: 1498 ms
```

_Đã chạy thử trên JDK 11._ Chỉ di chuyển dòng `compute()` ra ngoài khối lock đã nhanh hơn gần 3 lần: khi tính toán nằm trong lock, hai thread **chạy lần lượt**; khi nằm ngoài, chúng tính **parallel** và chỉ tuần tự ở phép cộng.

**Ví dụ 2 (Amdahl):** tăng tốc tối đa theo `F` và số nhân (tính bằng công thức):

```text
  F= 5%:  N=2 -> 1.90x  N=4 -> 3.48x  N=8 -> 5.93x  N=16 -> 9.14x  N=64 -> 15.42x  N=vô hạn -> 20.00x
  F=10%:  N=2 -> 1.82x  N=4 -> 3.08x  N=8 -> 4.71x  N=16 -> 6.40x  N=64 ->  8.77x  N=vô hạn -> 10.00x
  F=50%:  N=2 -> 1.33x  N=4 -> 1.60x  N=8 -> 1.78x  N=16 -> 1.88x  N=64 ->  1.97x  N=vô hạn ->  2.00x
```

_Đã chạy thử trên JDK 11 (chương trình in công thức)._ Chỉ 10% công việc nằm trong lock thì 64 nhân cũng chỉ đạt chưa tới 9 lần; 50% thì dù vô hạn nhân cũng chỉ 2 lần. Ví dụ 1 chính là việc giảm `F`.

**Nhớ:** tăng tốc tối đa `1 / (F + (1 − F)/N)`; thu hẹp lock, striping, `LongAdder`, đo trước bằng profiler/JFR.

**Hỏi xoáy 1: Striping có đánh đổi gì?**
**Vì sao hỏi tiếp:** Tách lock thành nhiều lock có vẻ luôn tốt, nên hỏi đánh đổi của striping.
**Đáp:** Thao tác cần **toàn bộ** trạng thái (`size()`, `clear()`, duyệt nhất quán) phải lock mọi sọc, đắt và dễ deadlock nếu thứ tự lấy lock không cố định. Nên chỉ stripe khi các nhóm trạng thái thật sự độc lập.

**Hỏi xoáy 2: JIT có tự giảm lock không?**
**Vì sao hỏi tiếp:** JIT cũng có thể giảm lock, nên hỏi có thể dựa vào nó không.
**Đáp:** Có: *lock coarsening* (gộp nhiều lock liên tiếp cùng object) và *lock elision* (bỏ lock khi escape analysis chứng minh object không bị thread khác thấy). Đừng dựa vào đó; thiết kế phạm vi lock hợp lý ngay từ đầu.

**Dấu hiệu trả lời tốt:** nói đo trước; nhắc striping làm khó thao tác toàn cục.
**Sai lầm hay gặp:** thêm thread để "nhanh hơn" mà không xem phần tuần tự và tranh chấp.

## 11. Class có hai field đều là `AtomicInteger` mà bất biến `lo <= hi` vẫn bị phá: thiết kế class thread-safe đúng thế nào?

**Gợi ý suy luận:**
- Thread-safe thật ra là giữ cái gì luôn đúng (khái niệm: invariant)?
- Kiểm tra rồi ghi trên hai biến có nguyên tử không (khái niệm: compound action)?
- Ba hướng nào để quản lý truy cập: nhốt trạng thái, ủy quyền, thêm chức năng vào class có sẵn?

**Lập luận:** Thread-safe là chuyện của **bất biến (invariant)**: các điều kiện luôn đúng của trạng thái (ví dụ `lo <= hi`). Mỗi biến riêng lẻ an toàn **chưa chắc** giữ được bất biến liên quan **nhiều biến**, vì kiểm tra-rồi-ghi trên hai biến không nguyên tử. Vì vậy các biến cùng một bất biến phải được bảo vệ bởi **cùng một lock**. Vì bất biến liên quan nhiều biến phải được bảo vệ bởi cùng một lock, ủy quyền cho field thread-safe chỉ hợp lệ khi các biến độc lập. Điểm dễ nhầm là tin rằng ghép nhiều field thread-safe tạo ra class thread-safe: mỗi `AtomicInteger` an toàn riêng nhưng bất biến liên quan cả hai (`lo <= hi`) cần cập nhật nguyên tử cả cặp, nên phải giữ một lock chung hoặc gói cặp giá trị vào một object bất biến cập nhật bằng CAS. Khi review, liệt kê bất biến của class trước, rồi kiểm tra mỗi bất biến được bảo vệ bởi cùng một cơ chế ở mọi chỗ truy cập.

**Đáp án ngắn:** Ba bước: xác định biến trạng thái, xác định bất biến ràng buộc, thiết lập chính sách quản lý truy cập. **Confinement**: nhốt trạng thái trong một phạm vi (field `private`, một thread, `ThreadLocal`) hoặc mẫu Java monitor. **Delegation**: ủy quyền cho field thread-safe có sẵn, **chỉ hợp lệ khi các biến độc lập**. **Thêm chức năng vào class có sẵn**: sửa trực tiếp, kế thừa, client-side locking (mong manh), hoặc composition (bọc và tự lock, an toàn nhất).

**Ví dụ:** bất biến `lo <= hi` với hai `AtomicInteger` riêng lẻ so với một lock chung. Hai thread cùng chạy: một gọi `setLo(5)`, thread kia gọi `setHi(3)`, từ trạng thái `[0, 10]`; mỗi cái tự kiểm tra bất biến trước khi ghi. Lặp 20.000 vòng, đếm số vòng kết thúc với `lo > hi`.

```java
// SAI: mỗi biến atomic, check-then-act giữa hai biến
void setLo(int v) { if (v > hi.get()) throw new IllegalArgumentException(); lo.set(v); }
void setHi(int v) { if (v < lo.get()) throw new IllegalArgumentException(); hi.set(v); }
// ĐÚNG: một khóa cho cả hai
synchronized void setLo(int v) { if (v > hi) throw new IllegalArgumentException(); lo = v; }
synchronized void setHi(int v) { if (v < lo) throw new IllegalArgumentException(); hi = v; }
```

```text
2 AtomicInteger rieng le: vi pham lo<=hi trong 3/20000 vong
synchronized chung 1 lock: vi pham 0/20000 vong
```

_Đã chạy thử trên JDK 11 (con số đổi mỗi lần, vì cửa sổ tranh chấp rất hẹp)._ Dù cả hai biến đều là `AtomicInteger` (thread-safe), vẫn có vòng kết thúc với `lo = 5, hi = 3`, vi phạm bất biến. Chỉ 3 trên 20.000 vòng: **hiếm nhưng thật**, và chính tính hiếm này làm lỗi lọt qua test. Cùng thiết kế với `synchronized` một lock thì 0 vi phạm.

**Nhớ:** bảo vệ bất biến, không chỉ từng biến; compound action phải nguyên tử; confinement, delegation, composition hơn client-side locking.

**Hỏi xoáy 1: Client-side locking sai ở đâu?**
**Vì sao hỏi tiếp:** Thêm chức năng vào class có sẵn hay dùng client-side locking, nên hỏi nó sai ở đâu.
**Đáp:** Bạn lock bằng lock mà class gốc dùng nội bộ (ví dụ `synchronized (list)` với `Collections.synchronizedList`), nên phụ thuộc chi tiết nội bộ; nếu class gốc đổi cơ chế lock thì mã của bạn hỏng im lặng. Lock nhầm object (`this` thay vì chính list) thì không bảo vệ gì cả.

**Hỏi xoáy 2: Ví dụ `putIfAbsent` bọc quanh list?**
**Vì sao hỏi tiếp:** Một ví dụ cụ thể làm rõ cách đúng, nên hỏi `putIfAbsent` bọc quanh list.
**Đáp:** `synchronized` trên mọi method của class bọc (composition) để "kiểm tra rồi thêm" nguyên tử với mọi thao tác khác trên cùng list:

```java
class SafeList<E> {
    private final List<E> list = new ArrayList<>();
    synchronized boolean putIfAbsent(E e) { boolean absent = !list.contains(e); if (absent) list.add(e); return absent; }
    // mọi truy cập khác cũng synchronized trên cùng this
}
```

**Dấu hiệu trả lời tốt:** nói được compound action phải nguyên tử; thread-safe cho từng method không có nghĩa thao tác ghép an toàn.
**Sai lầm hay gặp:** lock trên `Collections.synchronizedList(...)` bằng `synchronized (this)` thay vì lock trên chính list đó.

## 12. Pool đủ rảnh mà ứng dụng vẫn treo vì tác vụ cha chờ tác vụ con trong cùng pool: đây là deadlock kiểu gì và fairness liên quan ra sao?

**Gợi ý suy luận:**
- Deadlock có cần lock không, hay chỉ cần một vòng chờ tài nguyên?
- Tác vụ cha giữ một thread và chờ con, con cần thread nào (khái niệm: thread starvation deadlock)?
- Lock công bằng và không công bằng đánh đổi throughput với đói thế nào?

**Lập luận:** Deadlock không nhất thiết có lock: chỉ cần một **circular dependency tài nguyên**. Pool có số thread hữu hạn; tác vụ cha giữ một thread và **chờ** tác vụ con; tác vụ con cần một thread **trong cùng pool**. Nếu mọi thread đều bị tác vụ cha chiếm và đang chờ, không còn thread nào chạy tác vụ con: vòng chờ đóng lại. Fairness là chuyện khác: giữa các thread tranh một lock, ai được vào trước; công bằng tuyệt đối đắt vì phải đánh thức theo thứ tự. Do đó khi mọi thread đều bị cha chiếm và chờ, không còn thread cho con và vòng chờ khép kín. Điểm dễ nhầm là nghĩ deadlock chỉ xảy ra với lock tường minh, nên thấy ứng dụng treo mà không có `synchronized` thì bỏ qua. Dấu hiệu nhận ra: thread dump cho thấy mọi thread của pool đều chờ `Future.get()` hoặc `join`, trong khi queue có việc nằm chờ. Cách sửa là tách pool theo tầng tác vụ, hoặc không chặn mà ghép bằng `CompletableFuture`.

**Đáp án ngắn:** Phòng tránh: pool riêng cho tác vụ phụ thuộc nhau, không `get()` chặn trong pool, dùng `CompletableFuture` async hoặc `ForkJoinPool` (work stealing). Fairness: lock công bằng cấp theo thứ tự chờ nhưng throughput thấp hơn nhiều; lock không công bằng nhanh hơn nhưng có nguy cơ đói.

**Ví dụ:** pool 2 thread. Hai tác vụ cha, mỗi tác vụ nộp một tác vụ con vào **cùng pool** rồi `get(1s)`. So với pool cha và pool con **tách riêng**.

```text
Cung pool 2 luong, 2 tac vu cha cho tac vu con trong CUNG pool:
  cung pool: TIMEOUT cho tac vu con 0
  cung pool: TIMEOUT cho tac vu con 1
Tach pool cha/con:
  tach pool: ket qua con 0
  tach pool: ket qua con 1
```

_Đã chạy thử trên JDK 11 (dùng `get` có timeout để chương trình không treo vĩnh viễn)._ Cùng pool: hai thread đều bận chờ, hai tác vụ con nằm trong queue không bao giờ có thread chạy, **không lock nào, vẫn deadlock**. Tách pool: chạy ngay. Nhìn từ thread dump, các thread của pool sẽ cùng ở trạng thái WAITING trong `Future.get`. Số đo công bằng đã nêu ở câu 7 (nonfair 63 ms, fair 4.948 ms cho 4 thread × 500.000 lần).

**Nhớ:** circular dependency tài nguyên là đủ gây deadlock; tách pool, không `get()` chặn trong pool; fair đổi throughput lấy không đói.

**Hỏi xoáy 1: Tăng kích thước pool có chữa được không?**
**Vì sao hỏi tiếp:** Tăng kích thước pool nghe như cách sửa nhanh, nên hỏi nó có chữa tận gốc không.
**Đáp:** Chỉ che. Mức an toàn cần "số thread ≥ số tác vụ cha có thể chờ đồng thời + 1", và dưới tải tăng, lỗi lại xuất hiện. Cách chữa thật là bỏ phụ thuộc (pool riêng, async).

**Hỏi xoáy 2: Khi nào bật fair?**
**Vì sao hỏi tiếp:** Fairness là nửa còn lại của câu hỏi, nên hỏi khi nào đáng bật.
**Đáp:** Khi lock giữ lâu và cần bảo đảm không thread nào đói thật sự (ví dụ ghi log theo thứ tự). Với lock giữ ngắn và tranh chấp nhiều, nonfair gần như luôn tốt hơn.

**Dấu hiệu trả lời tốt:** phân biệt deadlock/starvation/livelock; biết chẩn đoán bằng thread dump.
**Sai lầm hay gặp:** tăng kích thước pool để "chữa" deadlock rồi lại gặp khi tải tăng.

## 13. Dịch vụ tắt mà JVM không thoát, hoặc tác vụ bị hủy vẫn chạy tiếp: thiết kế cancellation và shutdown đúng thế nào?

**Gợi ý suy luận:**
- Vì sao không thể giết thread cưỡng bức an toàn (khái niệm: hủy hợp tác)?
- Tín hiệu chuẩn là gì và `InterruptedException` làm gì với cờ (khái niệm: interrupt)?
- Ai sở hữu thread thì phải chịu trách nhiệm dừng nó thế nào (khái niệm: `shutdown`, `awaitTermination`, `shutdownNow`)?

**Lập luận:** Java không cho giết thread cưỡng bức an toàn (có thể dừng giữa lúc sửa dữ liệu, bỏ lock trong trạng thái hỏng), nên hủy là **hợp tác**: bên hủy báo hiệu, bên bị hủy tự dừng ở điểm an toàn. Tín hiệu chuẩn là cờ ngắt (interrupt) và hàm blocking ném `InterruptedException` (đồng thời xóa cờ). Ai **sở hữu** thread mới có quyền quyết định chính sách ngắt; mã thư viện không sở hữu nên phải truyền tín hiệu đi tiếp. Do đó hủy là báo hiệu rồi thread tự dừng ở điểm an toàn, và dịch vụ phải có quy trình dừng theo bước. Điểm dễ nhầm là chỉ gọi `shutdownNow()` rồi nghĩ mọi thứ đã dừng: nó chỉ gửi interrupt, tác vụ không đáp ứng ngắt (vòng lặp không kiểm tra cờ, I/O chặn kiểu cũ) vẫn chạy và giữ JVM sống nếu thread không phải daemon. Khi thiết kế, mỗi tác vụ dài phải có điểm kiểm tra hủy, tài nguyên chặn phải đóng được từ bên ngoài, và quy trình tắt có hạn chót để orchestrator không phải SIGKILL.

**Đáp án ngắn:** Quy tắc: không nuốt `InterruptedException` (ném lại hoặc khôi phục cờ); tác vụ chạy lâu kiểm tra cờ định kỳ; Blocking I/O kiểu cũ không ngắt được nên phải đóng socket; `ExecutorService`: `shutdown()` → `awaitTermination` → `shutdownNow()`; consumer dừng bằng poison pill hoặc cờ + ngắt; thread chết bất thường cần `UncaughtExceptionHandler`; shutdown hook chỉ làm việc ngắn.

**Ví dụ:** ba class lỗi hay gặp về lifecycle, đều đã tái hiện ở [qa-14](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md): nuốt interrupt khiến `shutdownNow` vô hiệu (`awaitTermination = false`, câu 6); `cancel(true)` không dừng tác vụ không kiểm tra cờ (câu 5); `shutdown` + `shutdownNow` trả về danh sách việc chưa chạy (câu 14). Thêm ví dụ về **lỗi bị nuốt**: so sánh `execute` và `submit` khi tác vụ ném lỗi, và thread chết bất thường có handler:

```java
t.setUncaughtExceptionHandler((th, ex) -> System.out.println("handler bat duoc: [" + th.getName() + "] " + ex.getMessage()));
// lỗi vào Future
pool.submit(() -> { throw new RuntimeException("loi trong submit"); });
// lỗi tới handler
p2.execute(() -> { throw new RuntimeException("loi trong execute"); });
```

```text
UncaughtExceptionHandler bat duoc: [worker-1] luong chet bat thuong
submit(): loi bi nuot vao Future, khong in gi (neu khong goi get())
execute(): handler bat duoc loi trong execute
```

_Đã chạy thử trên JDK 11._ Lỗi trong `submit` **không in ra gì** nếu không bao giờ `get()` kết quả: tác vụ chết im lặng. Với `execute`, handler nhận được lỗi. Trong dịch vụ thật, hãy đặt handler cho `ThreadFactory` hoặc luôn tiêu thụ `Future`.

**Nhớ:** không nuốt `InterruptedException`; `shutdown` rồi `awaitTermination` rồi `shutdownNow`; `Future.cancel(true)` chỉ ngắt, tác vụ tự quyết.

**Hỏi xoáy 1: `Future.cancel(true)` làm gì chính xác?**
**Vì sao hỏi tiếp:** `Future.cancel(true)` thường bị hiểu là dừng ngay, nên hỏi chính xác nó làm gì.
**Đáp:** Đánh dấu `Future` là đã hủy và gọi `interrupt()` lên thread đang chạy tác vụ (nếu `true`). Tác vụ dừng hay không tùy mã của nó: tác vụ vòng lặp không kiểm tra cờ vẫn chạy tiếp (ví dụ ở qa-14 câu 5).

**Hỏi xoáy 2: Thiết kế dịch vụ có thể "drain" việc dở khi tắt?**
**Vì sao hỏi tiếp:** Ở mức hệ thống, dừng mà không mất việc dở là yêu cầu thực tế, nên hỏi drain.
**Đáp:** Tách ba trạng thái: nhận việc, chỉ xử lý nốt, dừng. `shutdown()` ngừng nhận; chờ queue rỗng; hết hạn thì `shutdownNow()` và ghi lại danh sách việc chưa chạy (để chạy bù khi khởi động lại). Spring Boot: `server.shutdown=graceful` cùng `awaitTerminationSeconds` của executor.

**Dấu hiệu trả lời tốt:** nói `Future.cancel(true)` chỉ ngắt thread, tác vụ có tuân thủ hay không phụ thuộc code; thiết kế lifecycle dịch vụ (khởi động, dừng, kiểm tra).
**Sai lầm hay gặp:** `catch (InterruptedException e) {}` rỗng; dùng `Thread.stop()`; quên `shutdown` làm JVM không thoát vì thread non-daemon.

## 14. Test đồng thời chạy xanh trăm lần rồi vẫn lỗi trên production: kiểm thử đáng tin thế nào?

**Gợi ý suy luận:**
- Lỗi concurrency phụ thuộc điều gì (khái niệm: thời điểm xen kẽ)?
- Một lần chạy xanh chứng minh được gì?
- Cách nào tăng xác suất bắt lỗi (nhiều lần lặp, nhiều thread, jcstress, JMH)?

**Lập luận:** Lỗi concurrency phụ thuộc **thời điểm xen kẽ**, nên một lần chạy "xanh" chỉ chứng minh rằng **lần xen kẽ đó** không lỗi. Kiểm thử không chứng minh sự đúng đắn, chỉ **tăng xác suất bắt lỗi** bằng cách (a) chạy rất nhiều lần, (b) tạo ra nhiều kiểu xen kẽ (nhiều thread hơn số nhân, latency ngẫu nhiên, đồng bộ xuất phát), (c) kiểm tra **bất biến/checksum** thay vì kết quả chính xác từng bước. Do đó kiểm thử chỉ tăng xác suất bắt lỗi chứ không chứng minh đúng, nên phải kết hợp stress test, công cụ chuyên dụng và thiết kế dễ suy luận. Điểm dễ nhầm là coi test xanh nhiều lần là bằng chứng đúng, và dùng `Thread.sleep` để "sắp xếp" thứ tự (flaky và không thể chứng minh gì). Hãy kiểm tra bất biến sau nhiều vòng với số thread lớn hơn số nhân, dùng latch để các thread xuất phát cùng lúc, thêm jcstress cho những chỗ phụ thuộc JMM, và xem lỗi concurrency như lỗi thiết kế cần giảm state chia sẻ, không chỉ cần test nhiều hơn.

**Đáp án ngắn:** Test đúng đắn: bất biến + checksum, nhiều thread, lặp nhiều. **jcstress**: litmus test trên nhiều thread để bắt kết quả vi phạm JMM. **JMH** cho hiệu năng (warm-up JIT, tránh dead-code elimination, báo cáo phân phối p99). Test liveness/rò rỉ: thread dump, đếm thread/tài nguyên sau khi dừng. Bổ trợ: code review, static analysis (SpotBugs, Error Prone).

**Ví dụ:** kiểm thử bằng checksum một stack **không đồng bộ** và một stack có `synchronized`: 2 producer `push` 1..20.000, 2 consumer `pop`, cuối cùng so tổng đã đẩy với tổng đã lấy ra (cộng phần còn lại); 30 vòng.

```java
// producer: s.push(i); pushed.addAndGet(i);    consumer: v = s.pop(); if (v != null) popped.addAndGet(v);
// cuối vòng: pop nốt phần còn lại; sai nếu pushed != popped hoặc có ngoại lệ
```

```text
ArrayDeque khong dong bo: 18/30 vong sai (checksum lech hoac ngoai le)
Co synchronized         : 0/30 vong sai (checksum lech hoac ngoai le)
```

_Đã chạy thử trên JDK 11 (đổi mỗi lần)._ Test bắt lỗi ở 18 trên 30 vòng nhờ: dùng cổng `CountDownLatch` để mọi thread xuất phát cùng lúc, nhiều thread tranh nhau, và kiểm tra **tổng** thay vì từng phần tử. Bản có `synchronized` qua cả 30 vòng nhưng điều đó chỉ làm tăng độ tin cậy, không phải chứng minh. Bài litmus test ở câu 1 chính là một "jcstress thu nhỏ". Hai công cụ **chưa chạy** trong môi trường này: JMH và jcstress (cần Maven và thư viện bên ngoài); cách dùng nằm ở tài liệu của OpenJDK.

**Nhớ:** test không chứng minh đúng; dùng stress, jcstress, JMH, thread dump; tránh `sleep`, dùng latch/Awaitility.

**Hỏi xoáy 1: Vì sao `Thread.sleep` trong test là mùi xấu?**
**Vì sao hỏi tiếp:** `Thread.sleep` trong test là phản xạ phổ biến, nên hỏi vì sao nó là mùi xấu.
**Đáp:** `sleep(100)` để "chờ thread kia xong" là đoán thời gian: máy chậm thì test chập chờn (flaky), máy nhanh thì lãng phí thời gian. Dùng `CountDownLatch`, `Future.get(timeout)`, hoặc Awaitility chờ theo **điều kiện**.

**Hỏi xoáy 2: Có cách nào làm test xác định (deterministic)?**
**Vì sao hỏi tiếp:** Flaky vì không xác định, nên hỏi có làm test deterministic được không.
**Đáp:** Tách logic khỏi lập lịch: tiêm executor giả chạy tác vụ đồng bộ ngay trên thread gọi, hoặc điều khiển thứ tự bằng latch trong test. Chỉ giải quyết logic, không thay thế test stress cho sự an toàn multithreading.

**Dấu hiệu trả lời tốt:** thừa nhận test không chứng minh đúng, chỉ làm tăng độ tin cậy; kết hợp thiết kế dễ suy luận (bất biến, ít state chung).
**Sai lầm hay gặp:** một test chạy xanh một lần rồi kết luận thread-safe.

## 15. Chuyển dịch vụ sang virtual threads (Java 21) mà throughput không như kỳ vọng: pinning, `ThreadLocal` và structured concurrency ảnh hưởng thế nào?

**Gợi ý suy luận:**
- Virtual thread gắn vào carrier thread khi nào và nhả ra khi nào (khái niệm: carrier, park)?
- Điều gì giữ virtual thread dính vào carrier khi chặn (khái niệm: pinning, `synchronized`)?
- `ThreadLocal` nhân lên theo số thread thì có hậu quả gì?

**Lập luận:** Platform thread là thread thật của OS, đắt. Virtual thread là một **object Java** do JVM lập lịch: khi chạy được gắn vào một *carrier thread* (platform thread), khi gặp lệnh chặn trên I/O hoặc `LockSupport.park` thì JVM **tách** nó khỏi carrier (lưu stack lên heap) để carrier chạy virtual thread khác. Vì thế hàng trăm nghìn virtual thread chờ I/O chỉ cần vài carrier. Điều này chỉ giúp tác vụ **chờ**; CPU-bound vẫn bị giới hạn bởi số nhân. Vì virtual thread chỉ nhả carrier khi chặn đúng cách, pinning và ThreadLocal nặng triệt tiêu lợi ích khi số thread lên hàng trăm nghìn.

**Đáp án ngắn:**
- **Pinning:** virtual thread không tách được khỏi carrier khi chặn bên trong khối `synchronized` (Java 21) hoặc khi gọi native code; carrier bị giữ, throughput giảm, có thể cạn carrier. Giải pháp: `ReentrantLock` cho vùng chặn lâu; phát hiện bằng JFR event `jdk.VirtualThreadPinned`. Các bản Java mới hơn đã giảm vấn đề với `synchronized`, kiểm tra theo phiên bản bạn dùng.
- **`ThreadLocal`:** vẫn hoạt động nhưng mỗi virtual thread có bản riêng; với hàng triệu thread tốn memory, nên hạn chế và cân nhắc `ScopedValue`.
- **Không dùng pool cho virtual thread:** tạo mới mỗi tác vụ; giới hạn tài nguyên hạ nguồn bằng `Semaphore`.
- **Structured concurrency:** coi các tác vụ con là một đơn vị cùng lifecycle (cha chỉ xong khi con xong, lỗi/hủy lan truyền đúng); API còn ở dạng preview ở nhiều bản, cần kiểm tra theo JDK.

**Ví dụ (Java 21):**

```java
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 10_000).forEach(i -> exec.submit(() -> { Thread.sleep(Duration.ofSeconds(1)); return i; }));
// 10.000 tác vụ chờ 1s: xong sau ~1s; fixed pool 200 thread cần ~50s (10.000/200 x 1s)
}
// phát hiện pinning:  java -Djdk.tracePinnedThreads=full ...   hoặc JFR event jdk.VirtualThreadPinned
```

_Minh họa, chưa chạy thử trong môi trường này (cần Java 21; sandbox dùng JDK 11)._ Cùng nguyên lý với ví dụ I/O-bound ở [qa-14 câu 4](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md) (thời gian giảm gần tuyến tính theo số thread vì tác vụ chỉ chờ), chỉ khác là virtual thread đạt số lượng platform thread không thể.

**Nhớ:** virtual thread tăng throughput khi nhiều tác vụ chờ I/O, không làm code nhanh hơn; tránh pinning và pool cố định cho virtual thread.

**Hỏi xoáy 1: Lập lịch virtual thread khác platform thread thế nào?**
**Vì sao hỏi tiếp:** Cách lập lịch khác platform thread là nền để hiểu hành vi CPU, nên hỏi so sánh lập lịch.
**Đáp:** Virtual thread được lập lịch **hợp tác** tại điểm chặn (nhường carrier khi chặn), không bị cắt theo time slice như platform thread do OS; một virtual thread chạy vòng lặp CPU thuần sẽ chiếm carrier cho tới khi xong.

**Hỏi xoáy 2: Thư viện dùng `ThreadLocal` nặng thì sao?**
**Vì sao hỏi tiếp:** `ThreadLocal` là thư viện cũ gặp hệ thống mới, nên hỏi trường hợp dùng nặng.
**Đáp:** Mỗi virtual thread sẽ tạo bản `ThreadLocal` riêng (ví dụ cache buffer lớn), nhân lên theo số thread; cần xem lại hoặc dùng `ScopedValue`.

**Dấu hiệu trả lời tốt:** nói rõ virtual thread không làm code chạy nhanh hơn mà **tăng throughput khi nhiều tác vụ chờ I/O**; biết phát hiện pinning.
**Sai lầm hay gặp:** gom virtual thread vào fixed pool; dùng `synchronized` bao quanh call I/O chậm.

## 16. Dự án mới: bạn chọn virtual threads hay reactive (WebFlux), căn cứ vào đâu?

**Gợi ý suy luận:**
- Cả hai giải bài toán nào và ở chỗ nào khác nhau (người lập trình hay runtime gánh việc)?
- Reactive trả giá gì về độ khó viết và debug?
- Lỗi nào nghiêm trọng khi trộn code chặn vào mô hình non-blocking?

**Lập luận:** Cả hai giải cùng bài toán (nhiều tác vụ chờ I/O trên ít thread thật) nhưng ở hai chỗ khác nhau: reactive bắt **người lập trình** viết mã non-blocking (callback/operator, mỗi bước là một mảnh nhỏ) để thread không bao giờ chờ; virtual thread cho **runtime** gánh việc đó nên mã vẫn chặn tuần tự quen thuộc. Reactive trả giá bằng độ phức tạp mã và debug; virtual thread trả giá bằng việc phải tự xử lý backpressure và giới hạn tài nguyên. Do đó nên chọn theo loại bài toán và năng lực đội chứ không tuyên bố một bên thay thế bên kia.

| Tiêu chí | Virtual threads | Reactive (Reactor/WebFlux) |
|---|---|---|
| Mô hình lập trình | Code chặn tuần tự, dễ đọc, dễ debug | Pipeline async, callback/operator |
| Stack trace, debug | Giống code thường | Khó đọc, cần công cụ hỗ trợ |
| Backpressure | Không có sẵn; tự xử lý bằng queue/semaphore | Có sẵn trong Reactive Streams |
| Thư viện | Dùng được thư viện chặn hiện có (JDBC) | Cần driver non-blocking (R2DBC) cho hiệu quả |
| Streaming dữ liệu liên tục, ghép nhiều nguồn | Làm được nhưng thủ công | Điểm mạnh |
| Chi phí học | Thấp | Cao |
| Rủi ro | Pinning, `ThreadLocal`, giới hạn tài nguyên hạ nguồn | Một call chặn làm tắc event loop |

**Đáp án ngắn:** Dịch vụ CRUD/transaction dùng JDBC, đội quen mô hình chặn: **virtual threads** là mặc định hợp lý. Chọn **reactive** khi cần streaming, backpressure rõ ràng, hoặc toàn hệ thống đã non-blocking đầu cuối. Không trộn bừa bãi: gọi code chặn trong event loop reactive là lỗi nghiêm trọng.

**Ví dụ:** cùng một việc "lấy user và đơn hàng rồi ghép" viết theo hai phong cách (cả hai có thể chạy parallel):

```java
// Virtual threads: mã chặn tuần tự, song song bằng hai tác vụ con
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    var user   = exec.submit(() -> userRepo.find(id));       // chặn thoải mái
    var orders = exec.submit(() -> orderRepo.findBy(id));
    return new Page(user.get(), orders.get());
}
// Reactive: mỗi bước là một operator, driver phải non-blocking
// userRepo/orderRepo trả Mono
Mono.zip(userRepo.find(id), orderRepo.findBy(id), Page::new);
```

_Minh họa, chưa chạy thử (cần Java 21 và Reactor). So sánh để thấy khác biệt phong cách, không phải số đo._ Với code chặn, một exception có stack trace đầy đủ ngay tại dòng lỗi; với pipeline reactive stack trace bị cắt thành các mảnh bên trong operator (cần `Hooks.onOperatorDebug()` hoặc checkpoint để dựng lại).

**Nhớ:** CRUD/JDBC: virtual threads; streaming và backpressure: reactive; vẫn cần giới hạn đồng thời ở biên.

**Hỏi xoáy 1: Backpressure với virtual thread xử lý thế nào?**
**Vì sao hỏi tiếp:** Chọn virtual threads không làm hết nhu cầu kiểm soát tải, nên hỏi backpressure xử lý thế nào.
**Đáp:** Không có sẵn: 100.000 virtual thread vẫn cùng gọi một DB. Phải giới hạn bằng `Semaphore`/kích thước connection pool/queue có chặn ở ranh giới vào hệ thống.

**Hỏi xoáy 2: Reactive còn đáng chọn khi nào?**
**Vì sao hỏi tiếp:** Sau khi cân nhắc thì cần biết reactive còn thắng ở đâu.
**Đáp:** Event flow liên tục (SSE, WebSocket, streaming), ghép nhiều nguồn async với backpressure chuẩn, hoặc khi toàn bộ stack (driver, client) đã non-blocking và đội đã quen.

**Dấu hiệu trả lời tốt:** đưa ra tiêu chí và đánh đổi, không tuyên bố "một bên thay thế hoàn toàn bên kia".
**Sai lầm hay gặp:** cho rằng virtual thread loại bỏ nhu cầu giới hạn đồng thời; kết nối DB vẫn hữu hạn.
*Đào sâu:* [Spring Boot: Đồng thời và Virtual Threads](/go?p=01-Spring-Boot%2Fhard%2Flt-22-concurrency-virtual-threads.md); [WebFlux và Reactor](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md).

Nguồn: Java Concurrency in Practice (Goetz), kết hợp ghi chú trong docs.

