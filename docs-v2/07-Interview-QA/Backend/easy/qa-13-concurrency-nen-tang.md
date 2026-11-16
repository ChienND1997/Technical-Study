# Câu hỏi: Concurrency nền tảng

Kiến thức gốc: [Java Concurrency](/go?p=08-Java%2FJava-Concurrency%2Findex.md), đặc biệt [Thread Safety](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-02-thread-safety.md) và [Chia sẻ object](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md). Câu hỏi về `ConcurrentHashMap`, deadlock, `synchronized` ở mức chung xem thêm [Collections, Đồng thời và Java hiện đại](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-03-collections-concurrency.md).

**Cách đọc bài này:** mỗi câu theo chuỗi: **Câu hỏi** (tình huống như người phỏng vấn nói), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền, hãy tự trả lời trước khi đọc tiếp), **Lập luận** (chuỗi nhân quả vì A nên B), **Đáp án ngắn** (để nói trong phỏng vấn), **Ví dụ** (chương trình chạy được, có output thật), **Hỏi xoáy** (kèm lý do vì sao là bước tiếp theo) và **Nhớ**. Mọi ví dụ gắn nhãn _Đã chạy thử trên JDK 11_ đều được chạy trong môi trường 2 nhân CPU; với lỗi concurrency, con số **đổi mỗi lần chạy**, chỉ có xu hướng (sai hay đúng) là ổn định.

**Tóm tắt:**

- Phạm vi file: nền tảng concurrency, từ process và thread tới các lỗi và công cụ cơ bản.
- Thread chia sẻ heap và static, chỉ stack là riêng, nên chia sẻ miễn phí cũng là gốc của mọi lỗi concurrency; thêm thread chỉ nhanh với tác vụ chờ I/O, tác vụ CPU bị chặn trên bởi số nhân.
- Race condition xảy ra vì thao tác trông như một lệnh nhưng gồm nhiều bước (đọc, tính, ghi) nên `count++` mất cập nhật; check-then-act cũng vậy và cần thao tác gộp nguyên tử.
- Thread-safe là thuộc tính của state chia sẻ và thay đổi được: đạt bằng không chia sẻ, bất biến hoặc đồng bộ mọi truy cập bằng cùng một cơ chế.
- `synchronized` cho loại trừ lẫn nhau cộng happens-before nhưng phải cùng một lock; `volatile` chỉ cho hiển thị; `Atomic*` dùng CAS; thiếu happens-before thì thread đọc có thể thấy giá trị cũ mãi.
- Object bất biến dùng chung không cần lock (field `final` còn có initialization safety), `ThreadLocal` phải `remove()` trong thread pool, `wait` phải trong `synchronized` và vòng `while`.
- Hay bị hỏi xoáy nhất: vì sao `volatile` không sửa được `count++`, vì sao `ConcurrentHashMap` vẫn có check-then-act, và `run()` khác `start()` thế nào.

## 1. Process và thread khác nhau thế nào?

**Câu hỏi:** Hai thread cùng ghi vào một biến `static` thì thấy nhau, còn hai process thì không. Vì sao, và hệ quả với lỗi concurrency là gì?

**Gợi ý suy luận:**

- Hệ điều hành cấp cho process vùng nhớ như thế nào (không gian địa chỉ ảo riêng)?
- Thread nằm trong process thì dùng chung những vùng nào, riêng những gì (heap, static so với stack)?
- Chia sẻ ô nhớ miễn phí thì đổi lại phải trả giá gì (tranh chấp dữ liệu)?

**Lập luận:** Vì mỗi process có không gian địa chỉ ảo riêng, process này không đọc nổi memory process kia: an toàn nhưng muốn trao đổi phải qua socket/pipe/shared memory, đắt. Thread là đơn vị lập lịch nằm trong một process, nên mọi thread dùng chung heap, static và file đang mở; trao đổi chỉ là đọc/ghi cùng một ô nhớ. Chỉ stack (biến cục bộ, lời gọi hàm), program counter và thanh ghi là riêng. Vì không phải đổi không gian địa chỉ, tạo thread và chuyển ngữ cảnh giữa thread rẻ hơn process. Nhưng chia sẻ miễn phí cũng là nguồn gốc của mọi lỗi concurrency. Điểm dễ nhầm là nói "thread chia sẻ mọi thứ": stack và biến cục bộ là riêng, thứ chia sẻ là heap và static. Hệ quả khi thiết kế: biến cục bộ và tham số tự an toàn, còn object trên heap mà nhiều thread cùng chạm thì phải bảo vệ; vì vậy cách đơn giản nhất để tránh lỗi concurrency là không chia sẻ state thay đổi giữa các thread.

**Đáp án ngắn:** Process là chương trình đang chạy với memory riêng, được OS cô lập. Thread là đơn vị thực thi trong process; chia sẻ heap, riêng stack. Tạo và chuyển ngữ cảnh thread rẻ hơn process vì không đổi không gian địa chỉ.

**Ví dụ:** hai thread cùng thấy `shared` (static, nằm ở vùng chia sẻ), nhưng biến cục bộ của mỗi thread thuộc stack riêng.

```java
public class E12 {
    static int shared = 0;
    public static void main(String[] a) throws Exception {
        int local = 0;
        Thread t = new Thread(() -> {
            int local2 = 100; shared = 7;
            System.out.println("[" + Thread.currentThread().getName() + "] local2=" + local2 + " shared=" + shared);
        });
        t.start(); t.join();
        System.out.println("[main] shared=" + shared + " (cung heap/static), local=" + local + " (stack rieng)");
    }
}
```

```text
[Thread-0] local2=100 shared=7
[main] shared=7 (cung heap/static), local=0 (stack rieng)
```

_Đã chạy thử trên JDK 11._ Thread `main` thấy `shared = 7` do thread kia ghi, không cần gửi message gì.

**Hỏi xoáy 1: Vì sao tạo thread rẻ hơn tạo process?** *Vì sao hỏi tiếp:* Vì ta vừa nói thread dùng chung không gian địa chỉ, câu tiếp theo là cái lợi về chi phí và giới hạn của nó.
**Đáp:** Thread dùng lại bảng trang (page table) và tài nguyên của process; chỉ cần cấp một stack và cấu trúc lập lịch. Process phải dựng không gian địa chỉ mới. Nhưng "rẻ" là tương đối: mỗi platform thread của Java thường dành trước khoảng 1 MB stack (chỉnh bằng `-Xss`) và là một thread thật của OS, nên không tạo vô hạn được. Đó là lý do virtual threads (Java 21) ra đời.

**Hỏi xoáy 2: Hai thread chạy trên hai nhân khác nhau có thấy cùng một biến không?** *Vì sao hỏi tiếp:* Vì dùng chung ô nhớ logic chưa đủ, phần cứng nhiều nhân có cache riêng nên cần hỏi việc "thấy" có thật không.
**Đáp:** Cùng một ô nhớ logic, nhưng mỗi nhân có cache riêng và thanh ghi riêng, nên thấy giá trị mới hay cũ khi không đồng bộ là việc Java Memory Model quyết định (xem câu 9).

**Sai lầm hay gặp:** Nói "thread dùng chung mọi thứ". Sai: stack và biến cục bộ là riêng; thứ chia sẻ là heap và static.

**Nhớ:** process cô lập memory, thread chia sẻ heap/static và riêng stack; chia sẻ là gốc của lỗi concurrency.

## 2. Vì sao dùng multithreading, và rủi ro là gì?

**Câu hỏi:** Thêm thread cho 10 tác vụ chờ I/O thì nhanh gần 10 lần, nhưng cho tác vụ tính toán thuần thì không. Vì sao, và multithreading có rủi ro gì?

**Gợi ý suy luận:**

- Thread gọi I/O chậm thì CPU làm gì trong lúc chờ (thread ngủ, CPU rảnh)?
- Máy có bao nhiêu nhân thì tối đa bao nhiêu thread tính toán chạy thật sự cùng lúc (parallel so với đồng thời)?
- Khi nhiều thread chạm vào cùng dữ liệu, thứ tự xen kẽ có dự đoán được không (bộ lập lịch)?

**Lập luận:** Vì CPU nhanh hơn I/O hàng triệu lần nên thread gọi I/O sẽ ngủ và để CPU rảnh; thêm thread cho CPU làm việc khác trong lúc chờ, nên tăng tốc gần bằng số thread khi tác vụ chỉ chờ. Với tính toán thuần, CPU luôn bận nên tốc độ bị chặn trên bởi số nhân (khoảng 2 lần trên máy 2 nhân). Mặt khác, nhiều thread chạm vào dữ liệu chia sẻ với thứ tự xen kẽ không đoán được sinh ra lỗi an toàn, và chuyển ngữ cảnh cùng tranh chấp lock sinh ra chi phí hiệu năng. Điểm dễ nhầm là kỳ vọng thêm thread luôn nhanh hơn: với tác vụ nặng CPU, số thread hợp lý xấp xỉ số nhân, còn với tác vụ chờ I/O mới đáng có nhiều thread hơn nhân, và vượt mức đó chỉ thêm chi phí chuyển ngữ cảnh. Khi cấu hình pool, đo xem tác vụ thiên về CPU hay I/O rồi chọn kích thước tương ứng, và đừng thêm thread trước khi biết điểm nghẽn.

**Đáp án ngắn:** Lợi ích: tận dụng nhiều nhân, không để CPU rỗi khi chờ I/O, server phản hồi tốt. Rủi ro ba nhóm: an toàn (race condition), sống còn (deadlock, starvation, livelock), hiệu năng (chuyển ngữ cảnh, tranh chấp lock).

**Ví dụ:** 10 tác vụ, mỗi tác vụ "chờ I/O" 100 ms (giả lập bằng `sleep`).

```java
static void io() { try { Thread.sleep(100); } catch (InterruptedException e) {} }
// 1 luồng: for (int i = 0; i < 10; i++) io();
// 10 luồng: pool 10 luồng chạy io() song song, CountDownLatch chờ xong
```

```text
10 tac vu cho I/O 100ms, 1 luong : 1005 ms
10 tac vu cho I/O 100ms, 10 luong: 110 ms
```

_Đã chạy thử trên JDK 11._ Tăng tốc gần 10 lần vì thread chỉ **chờ**, không dùng CPU. Nếu tác vụ là tính toán thuần thì trên máy 2 nhân chỉ nhanh tối đa khoảng 2 lần (xem qa-14 câu 4).

**Hỏi xoáy 1: Multithreading có luôn làm chương trình nhanh hơn không?** *Vì sao hỏi tiếp:* Vì ví dụ I/O cho thấy tăng tốc lớn, họ muốn thử bạn có biết trường hợp nó không giúp.
**Đáp:** Không. Phần tuần tự bắt buộc (đoạn trong lock, đoạn phụ thuộc dữ liệu) giới hạn mức tăng tốc theo định luật Amdahl: tăng tốc tối đa = `1 / (F + (1-F)/N)`; với F = 10% phần tuần tự, dù thêm bao nhiêu nhân cũng không quá 10 lần. Thêm nữa, quá nhiều thread tăng chi phí chuyển ngữ cảnh. Xem [Hiệu năng và Scalability](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-11-hieu-nang-scalability.md).

**Sai lầm hay gặp:** Thấy chậm là "thêm thread". Nếu nghẽn là một lock hoặc một DB, thêm thread chỉ chờ lâu hơn.

**Nhớ:** multithreading giúp nhiều nhất với tác vụ chờ I/O; phần tuần tự và lock giới hạn mức tăng tốc (Amdahl).

## 3. Race condition là gì? Cho ví dụ.

**Câu hỏi:** Hai thread, mỗi thread tăng bộ đếm 1.000.000 lần, kết quả luôn nhỏ hơn 2.000.000 và đổi mỗi lần chạy mà không có lỗi nào. Chuyện gì đang xảy ra?

**Gợi ý suy luận:**

- Kết quả có phụ thuộc vào thứ tự hai thread xen kẽ không, và ai quyết định thứ tự đó (bộ lập lịch)?
- Một thao tác trông như một lệnh thực chất gồm mấy bước nhỏ (đọc, tính, ghi)?
- Nếu thread khác chen vào giữa các bước đó thì điều gì bị mất (lost update)?

**Lập luận:** Vì thứ tự xen kẽ do bộ lập lịch quyết định nên không kiểm soát được; nếu kết quả đúng hay sai phụ thuộc vào thứ tự ấy thì đó là race condition. Gốc rễ là thao tác trông như một lệnh nhưng gồm nhiều bước, nên thread khác chen vào giữa. Hai thread cùng đọc `count = 5`, cùng tính 6, cùng ghi 6: mất một lần cộng. Mất cập nhật xảy ra lúc này lúc khác nên số cuối đổi mỗi lần và luôn thấp hơn kỳ vọng, và chương trình không báo lỗi vì không có ngoại lệ nào được ném. Điểm dễ nhầm là tin rằng lỗi không tái hiện thì không phải lỗi: race condition biến mất khi thêm log hoặc chạy debug vì thời gian đổi, và test chạy qua không chứng minh code đúng. Khi review, hỏi với mỗi biến chia sẻ: ai ghi, ai đọc, và cơ chế nào bảo đảm thao tác đọc-sửa-ghi là nguyên tử; sửa bằng `AtomicInteger`, `LongAdder` hoặc `synchronized` thay vì cầu may.

**Đáp án ngắn:** Race condition là lỗi logic mà kết quả phụ thuộc thứ tự xen kẽ của các thread. Ví dụ: hai thread cùng đọc `count = 5`, cùng ghi 6, mất một lần cộng.

**Ví dụ:** hai thread, mỗi thread tăng bộ đếm 1.000.000 lần.

```java
static int plain;
Runnable r = () -> { for (int i = 0; i < 1_000_000; i++) plain++; };
// chạy r trên 2 thread, join, in plain
```

Chạy 3 lần (đổi mỗi lần):

```text
int thuong        = 1723636
int thuong        = 1742749
int thuong        = 1990034
```

_Đã chạy thử trên JDK 11._ Ba lần ra ba kết quả, đều **dưới** 2.000.000. Chương trình không báo lỗi nào, chỉ âm thầm sai: loại lỗi nguy hiểm nhất vì test "chạy được" vẫn có thể pass.

**Hỏi xoáy 1: Race condition khác data race thế nào?** *Vì sao hỏi tiếp:* Vì ta mới định nghĩa race condition, bước tiếp theo là phân biệt nó với thuật ngữ dễ lẫn.
**Đáp:** *Data race* là định nghĩa kỹ thuật theo JMM: hai truy cập cùng một biến từ hai thread, ít nhất một ghi, không có quan hệ happens-before. *Race condition* là lỗi logic phụ thuộc thời điểm. Có thể có race condition mà không có data race: ví dụ mọi truy cập đều đồng bộ từng cái nhưng "kiểm tra rồi thêm" bị tách làm hai thao tác đồng bộ riêng (câu 5). Và có data race không gây lỗi nhìn thấy được trên một máy cụ thể, nhưng vẫn là lỗi chương trình.

**Sai lầm hay gặp:** Cho rằng lỗi concurrency sẽ "nổ" ngay. Nó thường chỉ lộ khi tải cao hoặc trên máy nhiều nhân.

**Nhớ:** race condition do thao tác nhiều bước bị chen ngang, và nó âm thầm sai chứ không báo lỗi.

## 4. `count++` có an toàn không? Sửa thế nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** `volatile int count; count++` từ hai thread vẫn mất số. `volatile` đã làm gì và thiếu gì, và sửa đúng bằng cách nào?

**Gợi ý suy luận:**

- `count++` gồm mấy bước thật sự (đọc, cộng, ghi)?
- `volatile` đảm bảo điều gì cho từng lần đọc hoặc ghi, và không đảm bảo điều gì cho cả chuỗi (nhìn thấy so với nguyên tử)?
- Làm sao biến ba bước thành một đơn vị không thể chen vào (lock hoặc CAS)?

**Lập luận:** Vì `count++` biên dịch thành ba bước riêng biệt nên hai thread xen vào giữa thì một bản cập nhật bị ghi đè:

| Thời điểm | Thread A | Thread B | `count` trong memory |
|---|---|---|---|
| 1 | đọc → 5 | | 5 |
| 2 | | đọc → 5 | 5 |
| 3 | tính 6 | tính 6 | 5 |
| 4 | ghi 6 | | 6 |
| 5 | | ghi 6 | 6 (đáng ra 7) |

`volatile` chỉ làm mỗi lần đọc hoặc ghi đi thẳng memory chung và có thứ tự, nhưng không gom ba bước thành một, nên vẫn mất số (chỉ đỡ hơn `int` thường). Muốn đúng phải biến chuỗi ba bước thành một đơn vị không thể chen vào, bằng lock (`synchronized`) hoặc lệnh CPU nguyên tử (CAS trong `AtomicInteger`).

**Đáp án ngắn:** Không an toàn. Dùng `synchronized`, `AtomicInteger.incrementAndGet()`, hoặc `LongAdder` khi tranh chấp cao. `volatile` không sửa được.

**Ví dụ:** cùng bài toán ở câu 3, so sánh bốn cách.

```java
static int plain; static volatile int vol; static int sync; static AtomicInteger atom = new AtomicInteger();
// mỗi biến: 2 luồng x 1_000_000 lần ++ ; sync dùng synchronized (L) { sync++; }
```

```text
int thuong        = 1742749
volatile int      = 1952261
synchronized      = 2000000
AtomicInteger     = 2000000
```

_Đã chạy thử trên JDK 11._ `volatile` đỡ mất hơn `int` thường (vì mỗi lần đọc/ghi đều đi thẳng memory) nhưng **vẫn sai**, vì ba bước vẫn bị chen. Lần chạy khác của `volatile int` thậm chí cho 1782171. Chỉ `synchronized` và `Atomic*` luôn đúng.

**Hỏi xoáy 1: `AtomicInteger` làm sao nguyên tử mà không lock?** *Vì sao hỏi tiếp:* Vì ta đề xuất `Atomic*` làm cách sửa, họ hỏi cơ chế bên dưới.
**Đáp:** Dùng lệnh CPU **compare-and-swap (CAS)**: "nếu ô nhớ vẫn bằng giá trị tôi đã đọc thì ghi giá trị mới, ngược lại báo thất bại". `incrementAndGet` là vòng lặp: đọc, tính, CAS, thất bại thì lặp lại. Không block thread nào, nhưng dưới tranh chấp cao nhiều lần retry tốn CPU (xem [qa-17 câu 5](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md)).

**Sai lầm hay gặp:** `volatile int count; count++` rồi tin là đã thread-safe. Hậu quả: bộ đếm âm thầm thiếu số.

**Nhớ:** `volatile` không làm `count++` nguyên tử; dùng `synchronized` hoặc `Atomic*`.

## 5. Check-then-act và read-modify-write là gì?

**Câu hỏi:** `ConcurrentHashMap` là thread-safe, vậy vì sao `if (!map.containsKey(k)) map.put(k, v)` vẫn có lúc tạo giá trị hai lần?

**Gợi ý suy luận:**

- Hai lệnh `containsKey` và `put` mỗi lệnh có an toàn không, còn cả cặp thì sao (từng lệnh và chuỗi lệnh)?
- Giữa hai lệnh đó, thread khác có thể làm đổi điều kiện đã kiểm tra không (TOCTOU)?
- Cần thao tác có sẵn nào gộp kiểm tra và hành động làm một (`computeIfAbsent`, `putIfAbsent`, `merge`)?

**Lập luận:** Vì mỗi method của `ConcurrentHashMap` an toàn riêng, nhưng cặp `containsKey` rồi `put` là hai thao tác tách rời. Nếu giữa chúng một thread khác thêm key đó thì bước sau chạy trên giả định đã cũ (time-of-check to time-of-use). Đây là check-then-act; tương tự read-modify-write như `count++`. Cả chuỗi phải nguyên tử, nên dùng thao tác gộp như `computeIfAbsent`, nơi map tự đảm bảo hàm tạo chạy trọn vẹn cho key đó. Điểm dễ nhầm là cho rằng dùng class thread-safe là đủ: an toàn từng call không suy ra an toàn cho chuỗi call. Khi review, thấy hai call liên tiếp vào cùng một cấu trúc dùng chung (`containsKey` rồi `put`, `get` rồi `set`) thì hỏi liệu có thao tác gộp nào làm cả chuỗi nguyên tử không, và nếu không thì phải giữ một lock bao quanh cả chuỗi.

**Đáp án ngắn:** Check-then-act là kiểm tra rồi hành động (lazy init, "nếu chưa có thì thêm"); read-modify-write là đọc, tính, ghi (`count++`). Cả chuỗi phải nguyên tử, dùng `putIfAbsent`, `computeIfAbsent`, `merge`.

**Ví dụ:** hai thread cùng "nếu chưa có lock `k` thì tạo". `ConcurrentHashMap` an toàn, nhưng `containsKey` rồi `put` thì không. Đếm số lần "tạo" xảy ra hơn một lần trong 2000 vòng.

```java
// check-then-act
if (!map.containsKey("k")) { created.incrementAndGet(); map.put("k", new Object()); }
// nguyên tử
map.computeIfAbsent("k", k -> { created.incrementAndGet(); return new Object(); });
```

```text
check-then-act: tao trung 29/2000 vong
computeIfAbsent: tao trung 0/2000 vong
```

_Đã chạy thử trên JDK 11 (con số đổi mỗi lần)._ Trong 29 vòng, cả hai thread cùng thấy "chưa có" và cùng tạo: nếu "tạo" là mở kết nối hay trừ tiền thì đó là lỗi thật. Dù `ConcurrentHashMap` là thread-safe, lỗi vẫn xảy ra vì thread-safe cho từng method, không cho cả chuỗi.

**Hỏi xoáy 1: `computeIfAbsent` có chạy hàm tạo đúng một lần không?** *Vì sao hỏi tiếp:* Vì ta chọn nó làm giải pháp, cần kiểm tra giới hạn bảo đảm của nó.
**Đáp:** Với `ConcurrentHashMap` thì có (hàm được gọi nguyên tử cho key đó, nên hàm phải ngắn và không được tự sửa map). Với `Map.computeIfAbsent` mặc định của `Map`/`HashMap` thì không có bảo đảm đồng thời.

**Sai lầm hay gặp:** Đồng bộ từng thao tác riêng lẻ (`Collections.synchronizedMap`) rồi tin cả chuỗi an toàn.

**Nhớ:** thread-safe từng lệnh không bảo đảm cả chuỗi; dùng thao tác gộp có sẵn.

## 6. Thế nào là thread-safe?

**Câu hỏi:** Một class dùng `ConcurrentHashMap` bên trong, vậy có đủ để gọi nó thread-safe? Và vì sao dùng chung `SimpleDateFormat` giữa hai thread lại cho kết quả sai?

**Gợi ý suy luận:**

- Cần có hai điều kiện nào cùng lúc thì mới có thứ để tranh chấp (chia sẻ và có thể thay đổi)?
- Nếu thiếu một trong hai, ta có những cách nào để tránh tranh chấp (không chia sẻ, bất biến)?
- `SimpleDateFormat` lưu state nội bộ khi parse không (state mutable)?

**Lập luận:** Vì thread-safe là thuộc tính của state chia sẻ và có thể thay đổi, không phải của đoạn mã; thiếu một trong hai vế (không chia sẻ hoặc không thay đổi) thì không có gì để tranh chấp. Từ đó có ba cách đạt thread-safe: không chia sẻ (biến cục bộ, `ThreadLocal`), bất biến, hoặc đồng bộ mọi truy cập bằng cùng một cơ chế. `SimpleDateFormat` giữ state nội bộ khi parse nên dùng chung là chia sẻ cộng thay đổi, sinh lỗi; `DateTimeFormatter` bất biến thì dùng chung được. Dùng `ConcurrentHashMap` không đủ vì lỗi nằm ở chuỗi lệnh (câu 5). Điểm dễ nhầm là gắn nhãn thread-safe cho class chỉ vì nó dùng một class thread-safe bên trong, hoặc cho rằng thread-safe là tính chất tuyệt đối: nó phụ thuộc vào đặc tả (đúng với những tổ hợp call nào). Khi thiết kế, ưu tiên theo thứ tự: không chia sẻ, bất biến, rồi mới đến đồng bộ, và ghi rõ trong tài liệu class mức an toàn nó bảo đảm.

**Đáp án ngắn:** Class thread-safe là class vẫn đúng đặc tả khi nhiều thread gọi đồng thời mà người gọi không phải thêm đồng bộ. Ba cách: không chia sẻ, bất biến, hoặc đồng bộ mọi truy cập bằng cùng một cơ chế.

**Ví dụ:** `SimpleDateFormat` giữ state nội bộ khi parse, nên dùng chung giữa hai thread là sai; `DateTimeFormatter` (bất biến) thì dùng chung được.

```java
// 2 thread cùng gọi shared.parse("2024-03-15")
SimpleDateFormat shared = new SimpleDateFormat("yyyy-MM-dd");
// 2 thread cùng gọi LocalDate.parse("2024-03-15", f)
DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy-MM-dd");
```

```text
SimpleDateFormat dung chung: 386 ngoai le, 345 ket qua sai (tren 40000 lan parse)
DateTimeFormatter (bat bien) dung chung: 0 loi
```

_Đã chạy thử trên JDK 11 (con số đổi mỗi lần)._ Lưu ý: kết quả sai nhưng không ném lỗi (345 lần) còn nguy hiểm hơn ngoại lệ.

**Hỏi xoáy 1: Class không có trạng thái có thread-safe không?** *Vì sao hỏi tiếp:* Vì Lập luận nói cần state chia sẻ và thay đổi, ca không có trạng thái là hệ quả trực tiếp.
**Đáp:** Có, luôn luôn: không có trạng thái để tranh chấp. Đó là lý do bean singleton của Spring (controller, service) an toàn miễn là **không giữ field mutable** chia sẻ giữa các request.

**Hỏi xoáy 2: Gọi từng method thread-safe thì cả chuỗi gọi có thread-safe không?** *Vì sao hỏi tiếp:* Vì nối với câu 5: thread-safe từng phần không suy ra thread-safe tổ hợp.
**Đáp:** Không (xem câu 5). Thread-safe là contract của từng thao tác, không phải của tổ hợp.

**Sai lầm hay gặp:** Gán nhãn "thread-safe" cho một class chỉ vì nó dùng `ConcurrentHashMap`.

**Nhớ:** thread-safe = không chia sẻ, hoặc bất biến, hoặc đồng bộ nhất quán; không phải do dùng một collection.

## 7. `synchronized` làm được gì?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Hai method đều `synchronized` và cùng sửa `count`, nhưng kết quả vẫn lệch. Điều gì sai, và `synchronized` thật sự đảm bảo những gì?

**Gợi ý suy luận:**

- Mỗi object có gì để thread phải giữ khi vào khối `synchronized` (monitor)?
- Hai thread dùng hai lock khác nhau có chặn nhau không (loại trừ lẫn nhau theo từng lock)?
- Ngoài loại trừ, `synchronized` còn cho thread sau thấy gì của thread trước (hiển thị, happens-before)?

**Lập luận:** Vì mỗi object có một monitor và `synchronized` chỉ loại trừ những thread tranh cùng một monitor, hai method dùng hai lock khác nhau không bảo vệ nhau. `synchronized` còn làm việc thứ hai hay bị quên: mọi ghi trước khi nhả lock thấy được bởi thread lấy cùng lock sau đó (happens-before). Vì cả hai phía phải dùng cùng lock mới có hiệu lực này nên cả đọc lẫn ghi đều phải lock. Lock còn là reentrant: thread đang giữ vào lại được chính lock đó, nên không tự kẹt khi gọi method `synchronized` khác của cùng object. Điểm dễ nhầm là chỉ `synchronized` method ghi mà để method đọc không lock: thread đọc không có happens-before nên có thể thấy giá trị cũ hoặc dở dang. Khi review, mỗi biến mutable dùng chung phải có một lock được ghi rõ (`@GuardedBy`) dùng ở mọi chỗ truy cập, và không dùng `String` literal, `Integer` hay object công khai làm lock vì code khác có thể dùng cùng lock đó.

**Đáp án ngắn:** `synchronized` cho loại trừ lẫn nhau và bảo đảm hiển thị. Mọi biến mutable dùng chung phải được bảo vệ bởi cùng một lock ở mọi chỗ truy cập, cả đọc lẫn ghi.

**Ví dụ:** hai method cùng sửa `count` nhưng dùng **hai lock khác nhau** thì không bảo vệ nhau. Thread 1 tăng 1.000.000 lần, thread 2 giảm 1.000.000 lần, kỳ vọng 0.

```java
static void inc() { synchronized (A) { count++; } }   // khóa A
static void dec() { synchronized (B) { count--; } }   // khóa B: khác lock
// bản đúng: cả hai dùng cùng một object ONE
```

```text
hai lock khac nhau: count = -59907 (ky vong 0)
cung mot lock     : count = 0 (ky vong 0)
```

_Đã chạy thử trên JDK 11._ Có `synchronized` trên cả hai nhưng vẫn sai: loại trừ lẫn nhau chỉ có tác dụng giữa những thread tranh **cùng một** lock.

**Hỏi xoáy 1: `synchronized` static khác `synchronized` instance thế nào?** *Vì sao hỏi tiếp:* Vì ta vừa thấy khác lock thì không loại trừ nhau, đây là ca thực tế của việc đó.
**Đáp:** Static dùng lock của object `Class`, instance dùng lock của `this`. Hai lock khác nhau, nên một method static và một method instance cùng `synchronized` **không** loại trừ nhau.

**Hỏi xoáy 2: Vì sao đọc cũng phải lock?** *Vì sao hỏi tiếp:* Vì phần "hiển thị" cần cả hai phía dùng cùng lock, nhiều người chỉ lock phía ghi.
**Đáp:** Vì phần "hiển thị" của `synchronized` chỉ hoạt động khi **cả hai phía** (ghi nhả lock, đọc lấy lock) dùng cùng lock. Đọc không lock có thể thấy giá trị cũ hoặc trạng thái dở dang.

**Sai lầm hay gặp:** `synchronized (new Object())` hoặc lock trên một biến local: mỗi lần là một lock mới nên chẳng loại trừ ai.

**Nhớ:** một biến chia sẻ, một lock, mọi chỗ truy cập; lock khác nhau không block nhau.

## 8. `volatile`, `synchronized` và `Atomic*` khác nhau thế nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Cần một cờ dừng, một bộ đếm, và một cặp biến `lo <= hi`. Mỗi trường hợp chọn `volatile`, `Atomic*` hay `synchronized`, và vì sao?

**Gợi ý suy luận:**

- Giá trị mới có phụ thuộc giá trị cũ không (đọc-sửa-ghi)?
- Có bất biến nào ràng buộc nhiều biến với nhau không (nhiều biến, một bất biến)?
- Mỗi công cụ bảo đảm nguyên tử ở phạm vi nào: một lần đọc/ghi, một biến bằng CAS, hay cả khối?

**Lập luận:** Vì ba công cụ ở ba mức bảo đảm nên chọn theo thứ cần bảo vệ. `volatile`: mỗi lần đọc/ghi một biến đi qua memory chung và có thứ tự, nhưng chuỗi nhiều lệnh thì không nguyên tử. `Atomic*`: thêm đọc-sửa-ghi nguyên tử trên một biến bằng CAS. `synchronized`: nguyên tử cho cả khối và nhiều biến. Cờ không phụ thuộc giá trị cũ nên `volatile` đủ; bộ đếm cần đọc-sửa-ghi nên `Atomic*`; cặp `lo <= hi` là bất biến trên hai biến nên cần `synchronized`/`Lock`, vì kiểm tra rồi ghi trên hai biến `volatile` vẫn vỡ.

| | Nguyên tử | Nhìn thấy | Phù hợp |
|---|---|---|---|
| `volatile` | Chỉ đọc hoặc ghi đơn lẻ | Có | Cờ trạng thái, công bố giá trị bất biến |
| `synchronized` | Cả khối mã | Có | Nhiều biến liên quan, bất biến phức tạp |
| `Atomic*` | Một số thao tác (CAS) trên một biến | Có | Bộ đếm, cập nhật một biến không dùng lock |

**Đáp án ngắn:** Một cờ boolean dùng `volatile`; bộ đếm dùng `Atomic*`/`LongAdder`; nhiều biến cùng giữ một bất biến dùng `synchronized`/`Lock`.

**Ví dụ:** kết quả ở câu 4 (`volatile` sai, `Atomic*` và `synchronized` đúng) và câu 9 (`volatile` làm cờ dừng chạy đúng). Ví dụ khi **không** dùng được `volatile`: hai biến cùng một bất biến.

```java
volatile int lo = 0, hi = 10;                 // bất biến lo <= hi
// check-then-act trên 2 biến volatile: vẫn vỡ
void setLo(int v) { if (v <= hi) lo = v; }
```

**Hỏi xoáy 1: Khi nào `volatile` là đủ?** *Vì sao hỏi tiếp:* Vì ta đã nêu `volatile` phù hợp cho cờ, cần xác định ranh giới chính xác.
**Đáp:** Khi giá trị mới **không phụ thuộc** giá trị cũ, và biến không tham gia bất biến với biến khác. Cờ `stopped`, tham chiếu tới object bất biến vừa được công bố là hai ví dụ điển hình.

**Sai lầm hay gặp:** Dùng `volatile` cho bộ đếm hoặc cho `List` (volatile chỉ áp dụng cho tham chiếu, không làm nội dung list an toàn).

**Nhớ:** chọn theo độ phức tạp của thứ cần bảo vệ; `volatile` chỉ đủ khi giá trị mới không phụ thuộc giá trị cũ.

## 9. Visibility (tính nhìn thấy) là gì? Vì sao thread có thể không thấy giá trị mới?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Một worker lặp `while (!stopped)`; main đặt `stopped = true` nhưng worker chạy mãi. Vì sao, và `volatile` sửa bằng cơ chế nào?

**Gợi ý suy luận:**

- Giá trị của `stopped` có thể được giữ ở những đâu ngoài RAM (thanh ghi do JIT, cache của từng nhân)?
- Compiler/JIT có quyền đưa phép đọc ra ngoài vòng lặp khi không thấy ai ghi trong thread này không (tối ưu hóa)?
- Java Memory Model chỉ bảo đảm thấy giá trị mới khi có quan hệ gì (happens-before)?

**Lập luận:** Vì với một thread các tối ưu (giữ giá trị trong thanh ghi, đệm ghi, đảo thứ tự) là vô hình, JIT đọc `stopped` một lần rồi đưa ra ngoài vòng lặp vì "không ai khác sửa trong thread này". Với nhiều thread, thread đọc có thể thấy giá trị cũ mãi mãi. JMM chỉ bảo đảm thấy giá trị mới khi có quan hệ happens-before (ghi `volatile`, nhả/lấy lock, `start`/`join`). `volatile` tạo cạnh happens-before đó nên JIT không được giữ giá trị cũ, và worker thoát. Lỗi chỉ lộ khi vòng lặp "nóng" được JIT tối ưu, nên chạy debug thường lại đúng. Điểm dễ nhầm là nghĩ `Thread.sleep` hoặc `System.out.println` trong vòng lặp "sửa" lỗi visibility: chúng có thể vô tình tạo đồng bộ nên che lỗi tạm thời, nhưng không bảo đảm. Cờ dừng giữa các thread nên là `volatile boolean` hoặc dùng `interrupt()` hợp tác, và đừng dựa vào việc "chạy thử thấy dừng được".

**Đáp án ngắn:** Thiếu đồng bộ thì không có bảo đảm thread đọc thấy giá trị thread ghi. Sửa bằng `volatile` (cho cờ), hoặc `synchronized`, hoặc class `java.util.concurrent`.

**Ví dụ:** worker lặp tới khi `stopped = true`; main đặt cờ sau 0,5 giây và chờ tối đa 2 giây.

```java
static boolean stopped;            // thiếu volatile
static volatile boolean vstopped;
Thread t = new Thread(() -> { long n = 0; while (!stopped) { n++; } });
```

```text
Khong volatile: sau 2s worker con song? true
Co volatile   : sau 2s worker con song? false
```

_Đã chạy thử trên JDK 11._ Worker không `volatile` **không bao giờ thoát**: JIT đã biến `while (!stopped)` thành vòng lặp vô hạn kiểm tra giá trị đã nạp sẵn. Điều này chỉ xảy ra khi vòng lặp "nóng" và được JIT tối ưu, nên chạy ở chế độ debug thường lại "đúng": lỗi do tối ưu hóa là loại điển hình của "test local xanh, production treo".

**Hỏi xoáy 1: `volatile` có ép đọc từ RAM không?** *Vì sao hỏi tiếp:* Vì ta nói `volatile` sửa lỗi, họ kiểm tra bạn hiểu cơ chế chính xác hay chỉ nhớ mô hình sơ sài.
**Đáp:** Cách nói đó gần đúng nhưng không chính xác. `volatile` ép trình biên dịch/CPU **không giữ giá trị trong thanh ghi** và chèn rào memory (memory barrier) để ghi/đọc có thứ tự và hiển thị. Phần cứng hiện đại dùng giao thức cache coherence nên không thật sự "đi về RAM" mỗi lần. Chuẩn xác nhất là nói về **happens-before**.

**Hỏi xoáy 2: `Thread.sleep` hay `println` trong vòng lặp có "chữa" được không?** *Vì sao hỏi tiếp:* Vì thực tế nhiều người "sửa" lỗi bằng cách thêm log, cần hỏi xem có đáng tin không.
**Đáp:** Có thể làm lỗi biến mất vì `println` (đồng bộ nội bộ) hoặc `sleep` ngăn JIT tối ưu, nhưng đó là may mắn, không phải bảo đảm. Sửa đúng là `volatile`.

**Sai lầm hay gặp:** Cho rằng "thread kia ghi xong rồi thì mình đọc được". Không có đồng bộ thì không có bảo đảm nào.

**Nhớ:** không happens-before thì không bảo đảm nhìn thấy; "test local xanh, production treo" là dấu hiệu điển hình.

## 10. Object bất biến (immutable) có lợi gì? Làm thế nào để tạo?

**Câu hỏi:** Một class có mọi field `final` mà người ngoài vẫn sửa được nội dung qua danh sách truyền vào. Vì sao, và vì sao object bất biến lại dùng chung giữa thread mà không cần lock?

**Gợi ý suy luận:**

- Mọi vấn đề đồng thời cần có thứ gì để tranh chấp (state thay đổi)?
- `final` cố định điều gì: tham chiếu hay nội dung của object mà nó trỏ tới?
- Nếu object chứa tham chiếu tới object mutable thì làm sao chặn bên ngoài sửa (sao chép phòng thủ)?

**Lập luận:** Vì mọi vấn đề đồng thời cần có thứ thay đổi để tranh chấp, object bất biến loại bỏ vế đó: không có ghi sau khi tạo nên không có race, không cần lock. Field `final` còn có bảo đảm riêng trong JMM (initialization safety): thread nào thấy tham chiếu cũng thấy field `final` đúng giá trị. Nhưng `final` chỉ cố định tham chiếu, không cố định nội dung của list truyền vào, nên người giữ `src` vẫn sửa được. Do đó phải sao chép phòng thủ khi nhận vào và khi trả ra (`List.copyOf`). Điểm dễ nhầm là tưởng field `final` là đủ để class bất biến, trong khi cần thêm: class không cho kế thừa, không method nào đổi state, và sao chép phòng thủ mọi thành phần mutable. Khi thiết kế object chia sẻ giữa thread (cấu hình, DTO, key của map), mặc định làm nó bất biến, vì chi phí tạo object mới nhỏ hơn nhiều so với chi phí bug concurrency.

**Đáp án ngắn:** Điều kiện: mọi field `final`, không method nào đổi trạng thái, class không cho inheritance, và sao chép phòng thủ các tham chiếu mutable khi nhận vào và khi trả ra.

**Ví dụ:** `final` chỉ cố định **tham chiếu**, không cố định **nội dung** của list truyền vào.

```java
static final class Bad  { private final List<String> items; Bad(List<String> in){ items = in; } }
static final class Good { private final List<String> items; Good(List<String> in){ items = List.copyOf(in); } }
List<String> src = new ArrayList<>(List.of("a","b"));
Bad b = new Bad(src); Good g = new Good(src);
src.add("c");
```

```text
Bad.size()  = 3  (field final nhung doi duoc)
Good.size() = 2  (copyOf)
```

_Đã chạy thử trên JDK 11._ `Bad` trông bất biến nhưng người ngoài vẫn sửa được qua `src`. Với `record` (Java 16+) cùng vấn đề: record chỉ bất biến **nông**, nên field kiểu `List` cần `List.copyOf(...)` trong compact constructor. _(Minh họa record, chưa chạy thử vì môi trường là JDK 11.)_

**Hỏi xoáy 1: `String` bất biến thì `s = s + "x"` là gì?** *Vì sao hỏi tiếp:* Vì có ví dụ bất biến kinh điển nhất trong Java, hỏi để kiểm tra bạn hiểu "bất biến" khác "gán lại".
**Đáp:** Tạo một object `String` mới và gán lại tham chiếu `s`; object cũ không đổi. Vì bất biến, chuỗi dùng chung giữa thread không cần lock, và cho phép string pool.

**Hỏi xoáy 2: Object bất biến có bảo đảm gì khi công bố sai cách?** *Vì sao hỏi tiếp:* Vì lợi ích của bất biến liên quan đến `final` và JMM, nối sang câu 12.
**Đáp:** Nếu mọi field `final` và `this` không rò ra trong constructor thì vẫn an toàn dù công bố qua data race (xem câu 12). Bất biến "theo quy ước" (không `final`, chỉ không có setter) thì **không** có bảo đảm đó.

**Sai lầm hay gặp:** Nghĩ chỉ cần "không có setter" là bất biến, bỏ sót getter trả về list gốc.

**Nhớ:** bất biến thật phải sâu, không chỉ `final`; không có setter chưa đủ.

## 11. `ThreadLocal` là gì? Dùng khi nào và bẫy gì?

**Câu hỏi:** Request 2 của một người dùng khác lại đọc ra tên `alice` của request 1 trong cùng một thread pool. Chuyện gì xảy ra với `ThreadLocal`?

**Gợi ý suy luận:**

- Giá trị `ThreadLocal` được lưu ở đâu (map gắn vào object `Thread`)?
- Thread trong pool sống lâu hay ngắn, và được dùng lại cho request nào (tái sử dụng thread)?
- Nếu không xóa giá trị thì nó còn tồn tại cho tới khi nào (lifecycle giá trị)?

**Lập luận:** Vì `ThreadLocal` lưu giá trị trong một map gắn vào chính object `Thread` nên mỗi thread chỉ chạm bản của mình, không cần đồng bộ (thread confinement). Nhưng map đó sống cùng thread, mà thread trong pool sống rất lâu và được dùng lại cho request khác. Nếu request 1 quên `remove()`, giá trị `alice` vẫn nằm trong map và request 2 trên cùng thread đọc ra, dẫn tới lộ dữ liệu giữa người dùng và memory leak. Vì vậy phải `remove()` trong `finally`. Điểm dễ nhầm là coi `ThreadLocal` là "biến toàn cục an toàn": giá trị gắn với thread chứ không gắn với request, nên trong thread pool phải dọn sau mỗi tác vụ, và giá trị không tự sang thread khác (async, parallel stream). Với Spring, cẩn thận với `SecurityContext` và MDC khi chuyển sang thread khác, và với virtual thread thì nên cân nhắc cách truyền ngữ cảnh tường minh.

**Đáp án ngắn:** Dùng `ThreadLocal` cho object không thread-safe nhưng tạo tốn kém, hoặc ngữ cảnh theo yêu cầu. Luôn `remove()` trong `finally`; nếu không, dữ liệu rò sang yêu cầu kế tiếp trên cùng thread.

**Ví dụ:** pool một thread phục vụ 4 "request" liên tiếp; request 1 quên `remove`.

```java
static final ThreadLocal<String> USER = new ThreadLocal<>();
// R1: USER.set("alice")  (quên remove)      R2: in USER.get()
// R3: USER.set("bob"); try { ... } finally { USER.remove(); }     R4: in USER.get()
```

```text
Request 1 [pool-1-thread-1] dat USER=alice (quen remove)
Request 2 [pool-1-thread-1] doc USER=alice
Request 3 dat USER=bob
Request 4 doc USER=null
```

_Đã chạy thử trên JDK 11._ Request 2 là người dùng **khác** nhưng đọc ra `alice`: lỗi bảo mật thật sự (lộ dữ liệu giữa người dùng) mà không có ngoại lệ nào. Sau `remove()` ở request 3, request 4 mới sạch.

**Hỏi xoáy 1: Vì sao `ThreadLocal` có thể gây memory leak?** *Vì sao hỏi tiếp:* Vì ta đã nói giá trị sống cùng thread, hệ quả nghiêm trọng nhất là memory leak.
**Đáp:** `ThreadLocalMap` giữ **giá trị** bằng tham chiếu mạnh; key là weak reference. Khi `ThreadLocal` biến mất nhưng thread (pool) còn sống thì giá trị vẫn nằm trong map cho tới khi bị dọn, nên class lớn (cả classloader trong web app) có thể bị giữ lại.

**Hỏi xoáy 2: Với virtual threads thì sao?** *Vì sao hỏi tiếp:* Vì số thread lên hàng triệu làm bẫy của `ThreadLocal` phình to, đây là xu hướng hiện đại.
**Đáp:** Mỗi virtual thread có `ThreadLocal` riêng, mà số virtual thread có thể là hàng triệu nên chi phí memory tăng; `ScopedValue` (bất biến, phạm vi rõ) là hướng thay thế. Xem [ThreadLocal, Fork/Join](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md).

**Sai lầm hay gặp:** Dùng `ThreadLocal` trong filter/interceptor mà không `remove()` ở `finally`.

**Nhớ:** `ThreadLocal` sống theo thread, trong pool thì sống lâu; `remove()` trong `finally`.

## 12. Safe publication là gì? Làm sao công bố object an toàn?

**Câu hỏi:** Một field `final` của object vừa tạo lại bị thread khác đọc ra `null`. Làm sao có thể, và công bố object thế nào cho an toàn?

**Gợi ý suy luận:**

- Trình biên dịch/CPU có được đảo thứ tự ghi field và ghi tham chiếu không (reordering)?
- Thread khác thấy tham chiếu khác `null` thì có chắc thấy field đã xong không (happens-before giữa xây xong và đọc)?
- Nếu constructor để `this` lọt ra ngoài thì chuyện gì xảy ra (this-escape)?

**Lập luận:** Vì không có gì ép các ghi field phải thấy được trước khi tham chiếu được thấy, thread khác có thể thấy tham chiếu khác `null` nhưng field vẫn ở giá trị mặc định. Bảo đảm của `final` chỉ có hiệu lực sau khi constructor kết thúc và chỉ khi `this` không bị lộ trước đó. Nếu constructor khởi động thread hay đăng ký listener thì `this` thoát ra khi object chưa xong, nên thread kia thấy `name = null`. Công bố an toàn nghĩa là tạo cạnh happens-before giữa "xây xong" và "bị đọc". Điểm dễ nhầm là thấy object "tạo xong rồi mới đưa cho thread khác" là an toàn: nếu cách đưa không có happens-before (gán vào field thường, không lock) thì thread kia vẫn có thể thấy trạng thái dở dang. Khi review, kiểm tra cách công bố (field `volatile`, `final`, lock chung, hoặc queue thread-safe) và không để `this` lọt ra khỏi constructor, nhất là bằng việc đăng ký listener hay khởi động thread.

**Đáp án ngắn:** Công bố an toàn bằng: static initializer; field `volatile`/`AtomicReference`; field `final` của object tạo đúng cách; field bảo vệ cùng một lock; hoặc collection thread-safe. Không để `this` lọt ra trong constructor.

**Ví dụ:** this-escape: constructor khởi động một thread đọc `name` trước khi `name` được gán, ngay cả khi `name` là `final`.

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

_Đã chạy thử trên JDK 11._ Một field `final` mà vẫn bị thấy là `null`: bảo đảm của `final` chỉ có hiệu lực **sau khi constructor kết thúc**, và chỉ khi `this` không bị lộ trước đó. Về reordering công bố không an toàn (thấy object nửa chừng qua field `public` thường): trên x86 rất khó tái hiện vì CPU này giữ thứ tự ghi; nó hay lộ trên ARM hoặc khi JIT tối ưu mạnh. Đừng suy ra "không sao" từ việc không thấy lỗi.

**Hỏi xoáy 1: Đăng ký listener trong constructor có sao không?** *Vì sao hỏi tiếp:* Vì đây là ca thực tế của this-escape ta vừa nêu.
**Đáp:** Có: thực chất đã đưa `this` cho code ngoài khi object chưa dựng xong (this-escape). Cách đúng là dùng static factory method: tạo object xong xuôi rồi mới đăng ký.

**Hỏi xoáy 2: Double-checked locking sai ở đâu?** *Vì sao hỏi tiếp:* Vì đây là mẫu công bố kinh điển hay sai do thiếu `volatile`.
**Đáp:** Thiếu `volatile` trên biến instance: lần đọc không lock có thể thấy tham chiếu trước khi constructor xong. Xem [qa-17 câu 2](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md).

**Sai lầm hay gặp:** Gán object vào field `public static` không `volatile` rồi để nhiều thread dùng.

**Nhớ:** công bố cần happens-before; không rò `this` trong constructor.

## 13. `wait`, `notify`, `notifyAll` dùng ra sao?

**Câu hỏi:** Consumer cần chờ queue có phần tử mà không muốn quay vòng đốt CPU. Dùng `wait`/`notify` thế nào, và vì sao phải trong `synchronized` và vòng `while`?

**Gợi ý suy luận:**

- Chờ một điều kiện mà không đốt CPU thì thread phải làm gì với lock đang giữ (nhả monitor, vào hàng chờ)?
- Nếu kiểm tra điều kiện và `wait()` không nằm trong cùng khối lock thì thread khác có thể chen vào lúc nào (nguyên tử so với đổi điều kiện)?
- Tỉnh dậy có nghĩa là điều kiện còn đúng không (đánh thức giả, bị thread khác lấy trước)?

**Lập luận:** Vì `wait()` nhả monitor và đưa thread vào hàng chờ của object, còn `notify` đánh thức một thread. Việc kiểm tra điều kiện và `wait()` phải nguyên tử so với thay đổi điều kiện, nên chúng bắt buộc nằm trong `synchronized` của chính object đó (ngoài khối sẽ ném `IllegalMonitorStateException`). Thread tỉnh dậy không có nghĩa điều kiện còn đúng (bị thread khác lấy trước, hoặc đánh thức giả), nên điều kiện luôn kiểm tra trong vòng `while`. Điểm dễ nhầm là dùng `if` thay vì `while` quanh `wait()`, hoặc dùng `notify()` khi có nhiều thread chờ các điều kiện khác nhau nên đánh thức nhầm thread và treo. Mặc định dùng `notifyAll()` kèm vòng `while`, và trong code mới ưu tiên `BlockingQueue` hoặc `Condition`, vì chúng gói sẵn mẫu này và ít chỗ sai hơn.

**Đáp án ngắn:** Mẫu chuẩn: `synchronized (lock) { while (!dieuKien) lock.wait(); ...}` và bên báo `synchronized (lock) { doiTrangThai(); lock.notifyAll(); }`. Code mới nên dùng `BlockingQueue`/`Condition`.

**Ví dụ:** consumer chờ queue có phần tử; producer thêm rồi `notifyAll`. Thử gọi `wait` ngoài `synchronized`.

```java
try { lock.wait(); } catch (IllegalMonitorStateException e) { System.out.println("wait ngoai synchronized -> " + e); }
synchronized (q) { while (q.isEmpty()) q.wait(); return q.remove(); }       // consumer
// producer
synchronized (q) { q.add(42); q.notifyAll(); }
```

```text
wait ngoai synchronized -> java.lang.IllegalMonitorStateException
consumer: hang rong, wait()
producer: them 42, notifyAll()
consumer: lay 42
```

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1: Vì sao `while` mà không phải `if`?** *Vì sao hỏi tiếp:* Vì Lập luận nêu vòng `while` mà chưa chứng minh, đây là phần cần chứng minh.
**Đáp:** Hai lý do: *spurious wakeup* (thread tỉnh mà không ai báo, JVM/OS cho phép) và *điều kiện bị cướp*: có hai consumer chờ, producer thêm một phần tử rồi `notifyAll`, consumer A lấy mất, consumer B tỉnh dậy thấy queue rỗng lại. Dùng `if` thì B gọi `remove()` trên hàng rỗng và lỗi.

**Hỏi xoáy 2: `notify` có đủ không?** *Vì sao hỏi tiếp:* Vì sau khi chọn `notifyAll` ở mẫu chuẩn, cần hỏi vì sao không dùng `notify`.
**Đáp:** Chỉ khi mọi thread chờ cùng một điều kiện. Khác điều kiện thì `notify` có thể đánh thức nhầm và tín hiệu bị lãng phí. Ví dụ tái hiện ở [qa-17 câu 9](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md).

**Sai lầm hay gặp:** Gọi `wait` ngoài `synchronized` (ngoại lệ như trên) hoặc dùng `if`.

**Nhớ:** `wait` trong `synchronized` và trong `while`; ưu tiên `BlockingQueue`.

## 14. Có những cách nào để tạo và chạy một thread? `Runnable` khác `Callable` ra sao?

**Câu hỏi:** Gọi `thread.run()` thay vì `start()` thì không chạy parallel, và lỗi trong `submit` biến mất nếu không gọi `get()`. Vì sao, và `Runnable` khác `Callable` ra sao?

**Gợi ý suy luận:**

- `Thread` vừa là việc cần làm vừa là nơi chạy: tách hai thứ này ra thì được gì (tác vụ so với cơ chế chạy)?
- `start()` làm gì mà `run()` không làm (tạo thread thật của OS)?
- Nếu tác vụ cần trả giá trị hoặc ném checked exception thì dùng gì, và lỗi đi về đâu (`Callable`, `Future`)?

**Lập luận:** Vì gộp việc và nơi chạy khiến mã khó tái sử dụng, nên tách tác vụ (`Runnable`/`Callable`) khỏi cơ chế chạy (`Executor`). `start()` nhờ OS tạo thread thật rồi gọi `run()` trên thread mới; gọi `run()` trực tiếp chỉ là gọi hàm thường trên thread hiện tại, nên không parallel. `Callable` thêm hai thứ `Runnable` thiếu: trả giá trị và ném checked exception; ngoại lệ được đóng gói vào `Future`, nên nếu không gọi `get()` thì lỗi không lộ ra. Điểm dễ nhầm là gọi `run()` trực tiếp (chạy trên thread hiện tại) và tin rằng đã chạy parallel, hoặc dùng `submit` rồi không bao giờ gọi `get()` nên nuốt mất exception. Quy tắc: dùng `execute` khi không cần kết quả (exception đi tới uncaught handler), `submit` khi cần `Future`; và luôn tạo thread qua `ExecutorService` với tên rõ ràng để dễ debug.

**Đáp án ngắn:** Thô: `new Thread(r).start()`. Nên dùng: giao tác vụ cho `ExecutorService`. Giá trị trả về và lỗi lấy qua `Future.get()`.

**Ví dụ:**

```java
Runnable r = () -> System.out.println("chay tren: " + Thread.currentThread().getName());
r.run();                                   // chạy ngay trên main
Thread t = new Thread(r, "T-moi"); t.start(); t.join();
t.start();                                 // lần 2
Future<Integer> f = pool.submit(() -> 6 * 7);
Future<?> bad = pool.submit(() -> { throw new IllegalStateException("loi trong tac vu"); });
```

```text
chay tren: main
chay tren: T-moi
start() lan 2 -> java.lang.IllegalThreadStateException
Callable tra ve 42
loi chi lo ra khi get(): java.lang.IllegalStateException: loi trong tac vu
```

_Đã chạy thử trên JDK 11._ Hai điều dễ bị bỏ sót: `run()` không tạo thread; và lỗi trong `submit` **không in ra gì** nếu không bao giờ gọi `get()`.

**Hỏi xoáy 1: `execute` khác `submit` thế nào khi tác vụ ném lỗi?** *Vì sao hỏi tiếp:* Vì ta vừa nói lỗi đóng gói vào `Future`, cần so với đường không đóng gói.
**Đáp:** `execute(Runnable)` để ngoại lệ thoát ra cho `UncaughtExceptionHandler` (mặc định in stack trace và thread chết). `submit` bắt ngoại lệ lưu vào `Future`; nếu bỏ `Future` thì lỗi mất tăm. Ví dụ ở [qa-17 câu 13](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md).

**Hỏi xoáy 2: Vì sao nên tách "tác vụ" khỏi "cách chạy"?** *Vì sao hỏi tiếp:* Vì đó là lý do thiết kế đứng sau toàn bộ câu trả lời.
**Đáp:** Để đổi chính sách chạy (số thread, queue, lập lịch, virtual thread) mà không sửa tác vụ. Xem [Thực thi tác vụ](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-06-task-execution.md).

**Sai lầm hay gặp:** Gọi `thread.run()` rồi thắc mắc vì sao không chạy parallel; hoặc bỏ `Future` của `submit` và mất lỗi.

**Nhớ:** `start()` mới tạo thread; `Callable` trả giá trị; lỗi trong `submit` chỉ lộ khi `get()`.

Nguồn: Java Concurrency in Practice (Goetz), kết hợp ghi chú trong docs.

