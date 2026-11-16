# Câu hỏi: JVM, Hiệu năng và Hệ phân tán

Kiến thức gốc: [Java Core Hard](/go?p=08-Java%2FJava-Core%2Fhard%2Findex.md), [Spring Boot Hard](/go?p=01-Spring-Boot%2Fhard%2Findex.md), [System Design Hard](/go?p=15-System%20Design%2Fhard%2Findex.md).

Mỗi câu đi theo chuỗi để bạn tự suy ngược ra đáp án thay vì học thuộc: **Câu hỏi** (hiện tượng hoặc tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả tới đáp án), **Đáp án ngắn** (nói thành tiếng trong phỏng vấn), **Nhớ** (một dòng cần ghi), kèm **Ví dụ** (có thể chạy hoặc truy vết được), **Hỏi xoáy** (mỗi câu có dòng **Vì sao hỏi tiếp** giải thích vì sao nó là bước tiếp theo logic) và **Sai lầm hay gặp**. Nên che phần Lập luận và đáp án, tự trả lời các gợi ý trước. Ghi chú trong ví dụ:

- _Đã chạy thử trên JDK 11_ hoặc _Đã chạy mô phỏng bằng Python_: output dán nguyên văn từ lần chạy thật trong môi trường soạn bài (2 nhân, JDK 11, G1 mặc định). Con số thời gian chỉ có ý nghĩa **so sánh tương đối**, máy bạn sẽ khác.
- _Minh họa, chưa chạy thử_: ví dụ để hiểu cơ chế, không phải output thật.

**Tóm tắt:**

- Phạm vi file: JVM, hiệu năng và hệ phân tán ở mức senior, câu hỏi nào cũng có chuỗi suy luận trước khi tới đáp án.
- Chẩn đoán chậm đi từ ngoài vào trong: đo trước, xác định đang chạy hay đang chờ, tầng nào, rồi mới sửa từng thay đổi một.
- `OutOfMemoryError` có nhiều vùng cạn khác nhau (heap, metaspace, thread, direct buffer) và thông báo cho biết vùng nào; leak trong Java là tham chiếu thừa chứ không phải quên giải phóng.
- GC đánh đổi throughput, latency và memory; JIT tối ưu theo hành vi quan sát lúc chạy nên cần warm-up và JMH; ClassLoader định danh class bằng cặp (tên, loader) nên lệch phiên bản thư viện lộ ra thành lỗi liên kết.
- Throughput bị giới hạn bởi tài nguyên hẹp nhất (thường là pool DB), WebFlux và virtual thread cùng giải bài toán thread chờ I/O ở hai tầng khác nhau.
- Hệ phân tán: CAP chỉ có ý nghĩa khi mạng đứt và quyết định theo từng chức năng; 2PC, Saga, Outbox; idempotency chống trùng; lock phân tán cần fencing token; Kafka chỉ bảo đảm thứ tự trong một partition.
- Hay bị hỏi xoáy nhất: "CPU 100% thì làm gì", vì sao lock Redis chưa đủ bảo đảm đúng đắn, và retry nhiều tầng gây retry storm.

## Phần JVM và hiệu năng

### 1. Người dùng báo ứng dụng chậm, bạn bắt đầu điều tra từ đâu và dựa vào bằng chứng nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Một request tốn thời gian ở những chỗ nào? Thời gian đó chỉ có thể là đang chạy hay đang chờ (khái niệm: CPU time và wait time).
- Nếu chỉ tối ưu một đoạn, tối đa được lợi bao nhiêu (khái niệm: định luật Amdahl)?
- CPU thấp mà vẫn chậm nói lên điều gì, và công cụ nào cho thấy thread đang chờ cái gì (khái niệm: thread dump)?

**Lập luận:** "Chậm" là thời gian của một request bị cộng từ nhiều tầng. Thời gian đó chỉ có thể nằm ở hai chỗ: **đang chạy** (CPU) hoặc **đang chờ** (lock, I/O, queue). Đoán mà không đo thường tối ưu đúng chỗ không chiếm thời gian (định luật Amdahl: tăng tốc phần chiếm 5% thời gian tối đa chỉ giúp 5%). Vì vậy việc đầu tiên là đo để biết thời gian nằm ở tầng nào và là chạy hay chờ, rồi mới sửa; mỗi lần chỉ đổi một thứ để biết thay đổi nào có tác dụng. Điểm dễ nhầm là nhìn CPU cao và kết luận ngay "cần thêm máy" hoặc nhìn CPU thấp và kết luận "hệ thống ổn": CPU thấp mà chậm thường nghĩa là đang chờ lock, I/O hay pool kết nối, và phải đọc thread dump mới thấy ai đang chờ ai. Vì vậy khi nhận một báo cáo "chậm", hỏi phạm vi (p99 hay trung bình, một endpoint hay mọi endpoint, từ lúc nào), khoanh tầng bằng trace, rồi mới vào JVM, và ghi lại số đo trước và sau mỗi thay đổi.

**Đáp án ngắn:** đi từ ngoài vào trong. (1) Triệu chứng: p99 hay trung bình, mọi endpoint hay một endpoint, từ lúc nào, sau thay đổi nào. (2) Tầng nào: trace/metric để khoanh LB, service, DB, API ngoài. (3) Trong JVM: CPU cao hay thấp. CPU thấp mà chậm là **đang chờ** (thread dump). CPU cao là **đang tính** (profile, JFR). (4) Mỗi lần chỉ đổi một thứ và đo lại.

**Ví dụ:** service có 3 thread xử lý HTTP, một truy vấn giữ lock rất lâu, các request khác xếp hàng. CPU gần 0% nhưng p99 tăng vọt. Thread dump (lấy bằng `jstack <pid>` hoặc `jcmd <pid> Thread.print`, nên lấy 3 lần cách nhau 5-10 giây rồi so sánh):

```text
"http-1" daemon prio=5 Id=10 TIMED_WAITING
	at java.base@11.0.32.1/java.lang.Thread.sleep(Native Method)
	at Pool2.lambda$main$0(Pool2.java:7)
	-  locked java.lang.Object@add0edd

"http-2" daemon prio=5 Id=11 BLOCKED on java.lang.Object@add0edd owned by "http-1" Id=10
	at Pool2.lambda$main$0(Pool2.java:7)
	-  blocked on java.lang.Object@add0edd

"http-3" daemon prio=5 Id=12 BLOCKED on java.lang.Object@add0edd owned by "http-1" Id=10
...
queue size = 6
```

Cách đọc: `http-1` giữ lock `...@add0edd` và đang `sleep` (trong thực tế là đang chờ I/O hay truy vấn chậm). `http-2`, `http-3` ở trạng thái `BLOCKED ... owned by "http-1"`: chúng không làm gì cả, chỉ chờ. `queue size = 6` là 6 request nằm trong queue vì cả 3 thread đều bị kẹt. Nguyên nhân gốc là **một người giữ lock quá lâu**, tăng số thread không giúp mà chỉ thêm thread bị block. _Đã chạy thử trên JDK 11 (dump lấy bằng `ThreadMXBean`, cùng nguồn dữ liệu với `jstack`)._

**Nhớ:** chậm = chạy (CPU, dùng profiler/JFR) hoặc chờ (lock, I/O, queue, dùng thread dump); đo trước, đổi một thứ mỗi lần.

**Hỏi xoáy 1:** CPU 100% thì làm khác thế nào?
**Vì sao hỏi tiếp:** Câu trả lời trên tách theo CPU thấp hay cao; nhánh CPU cao có cách điều tra khác hẳn nên phải hỏi riêng.
**Đáp:** CPU cao nghĩa là thread đang chạy. `top -H -p <pid>` tìm thread ngốn CPU, đổi id thread sang hex (`printf '%x' <tid>`), tìm `nid=0x...` đó trong thread dump để thấy đang ở hàm nào. Thường gặp: vòng lặp vô hạn, regex backtracking, hoặc **GC chạy liên tục** (các thread `GC Thread` chiếm CPU), khi đó nguyên nhân là heap hết chỗ chứ không phải code nghiệp vụ.

**Hỏi xoáy 2:** Vì sao lấy thread dump nhiều lần thay vì một lần?
**Vì sao hỏi tiếp:** Ví dụ trên dựa vào thread dump, nên người phỏng vấn kiểm tra bạn có hiểu một dump đáng tin đến đâu.
**Đáp:** Một dump là ảnh chụp tại một thời điểm, có thể bắt đúng khoảnh khắc thoáng qua. Một thread xuất hiện ở **cùng một chỗ** trong cả 3 dump mới là điểm nghẽn thật; đây chính là "lấy mẫu" của profiler thô sơ.

**Sai lầm hay gặp:** thấy chậm là tăng thread pool hoặc tăng RAM. Nếu điểm nghẽn là một lock hay một kết nối DB, tăng tài nguyên chỉ chuyển nghẽn sang chỗ khác (thường là DB, làm tình hình xấu hơn).

### 2. Ứng dụng chết vì `OutOfMemoryError`: thông báo lỗi nói gì với bạn và bạn xử lý ra sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- JVM chia memory thành những vùng nào (khái niệm: heap, metaspace, stack thread, memory ngoài heap)?
- Mỗi vùng có giới hạn riêng thì chữ ngay sau `OutOfMemoryError:` cho biết điều gì?
- Cần giữ bằng chứng nào trước khi process chết (khái niệm: heap dump)?

**Lập luận:** JVM chia memory thành nhiều vùng độc lập (heap, metaspace, stack của thread, memory ngoài heap). Mỗi vùng có giới hạn riêng nên "hết memory" có nhiều thông báo khác nhau, và **thông báo chính là chỉ dẫn vùng nào cạn**. Vì thế đọc đúng thông báo là xác định đúng vùng cạn, rồi mới quyết định sửa code, tăng giới hạn hay giảm số thread; heap dump cho bằng chứng thay vì đoán. Điểm dễ nhầm là tăng `-Xmx` cho mọi `OutOfMemoryError`: nếu vùng cạn là Metaspace, stack thread hay memory ngoài heap thì tăng heap không giúp, thậm chí làm tệ hơn vì lấy bớt memory của tiến trình. Hệ quả vận hành: bật sẵn `-XX:+HeapDumpOnOutOfMemoryError` để có bằng chứng ngay lần đầu, và đặt `-Xmx` cùng giới hạn container sao cho còn chỗ cho các vùng ngoài heap.

**Đáp án ngắn:** `Java heap space`: object sống quá nhiều (rò rỉ hoặc heap nhỏ). `Metaspace`: quá nhiều class nạp (ClassLoader không được giải phóng). `unable to create native thread`: quá nhiều thread hoặc hết giới hạn HĐH. `Direct buffer memory`: buffer ngoài heap (NIO, Netty). Luôn bật `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=...` để có bằng chứng, rồi mở bằng Eclipse MAT.

**Ví dụ:** chương trình giữ mọi thứ vào một `static List` rồi cấp phát 1 MB mỗi vòng, chạy với heap 32 MB:

```java
static final List<byte[]> CACHE = new ArrayList<>();   // static: sống đến khi JVM tắt
while (true) { CACHE.add(new byte[1024 * 1024]); }
```

```text
$ java -Xmx32m -Xlog:gc -XX:+HeapDumpOnOutOfMemoryError Leak.java
cached 8 MB
java.lang.OutOfMemoryError: Java heap space
Dumping heap to /tmp/f3/leak.hprof ...
Heap dump file created [19552534 bytes in 0.061 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at Leak.main(Leak.java:6)
```

Log GC của chính lần chạy này cho thấy "dấu hiệu trước khi chết": GC chạy mà heap **không xuống**:

```text
[0.931s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 7M->3M(32M) 11.921ms
[1.489s] GC(7) Pause Young (Normal) (G1 Humongous Allocation) 28M->27M(32M) 3.577ms
[1.510s] GC(9) Pause Full (G1 Humongous Allocation) 29M->27M(32M) 14.191ms
[1.521s] GC(10) Pause Full (G1 Humongous Allocation) 27M->26M(32M) 10.925ms
```

Đọc dòng `Pause Full ... 29M->27M(32M)`: sau Full GC vẫn còn 27 MB trên tổng 32 MB. Dọn được 2 MB nghĩa là gần như toàn bộ object **vẫn được tham chiếu**, đúng đặc trưng rò rỉ chứ không phải heap hơi nhỏ. Trong MAT, "Dominator Tree" sẽ chỉ ra `ArrayList` của `Leak.CACHE` giữ ~26 MB. _Đã chạy thử trên JDK 11._

**Nhớ:** mỗi vùng nhớ có loại OOM riêng; luôn bật `-XX:+HeapDumpOnOutOfMemoryError` rồi phân tích bằng MAT.

**Hỏi xoáy 1:** Tăng `-Xmx` có chữa được không?
**Vì sao hỏi tiếp:** Phản xạ thường gặp khi thấy OOM là tăng `-Xmx`, nên cần kiểm tra cách làm đó chữa được trường hợp nào.
**Đáp:** Chỉ khi heap thật sự nhỏ so với dữ liệu sống hợp lệ. Với rò rỉ, tăng heap chỉ **trì hoãn** thời điểm chết (và Full GC dài hơn). Cách phân biệt: vẽ đường "heap sau GC" theo thời gian. Rò rỉ là đường dốc lên mãi; heap nhỏ là đường phẳng nhưng sát trần.

**Hỏi xoáy 2:** Pod bị `OOMKilled` (exit code 137) có phải `OutOfMemoryError` không?
**Vì sao hỏi tiếp:** Môi trường container cho một kiểu chết giống OOM nhưng không có `OutOfMemoryError`, nên cần phân biệt hai chuyện.
**Đáp:** Không. Đó là kernel (cgroup) giết process khi **tổng** RSS vượt giới hạn container. Tổng gồm heap + metaspace + stack thread + direct buffer + mã JIT. JVM không kịp ném lỗi nào. Khắc phục là chừa chỗ ngoài heap: `-XX:MaxRAMPercentage=70` thay vì đặt `-Xmx` bằng đúng giới hạn container.

**Sai lầm hay gặp:** đặt `-Xmx` bằng 100% RAM container. Heap chiếm hết, phần ngoài heap không còn chỗ, bị `OOMKilled` mà log ứng dụng im lặng.

### 3. Java có GC mà memory vẫn tăng mãi: rò rỉ xảy ra thế nào và thường nằm ở đâu?

**Gợi ý suy luận:**
- GC quyết định một object là rác dựa trên điều gì (khái niệm: reachability từ GC roots)?
- Một object logic không còn cần nhưng vẫn có đường tham chiếu thì GC làm gì?
- Thread sống lâu (pool) giữ những thứ gì gắn với nó (khái niệm: ThreadLocal, static)?

**Lập luận:** GC chỉ thu hồi object **không còn tham chiếu tới được từ GC roots** (biến cục bộ, static, thread sống). Rò rỉ trong Java không phải "quên `free`" mà là **còn đường tham chiếu mà logic không còn cần**. GC không biết ý định của bạn. Vì vậy rò rỉ trong Java luôn là lỗi tham chiếu thừa chứ không phải quên giải phóng, và các nguồn điển hình là những chỗ giữ tham chiếu lâu hơn lifecycle thực. Điểm dễ nhầm là nghĩ ngôn ngữ có GC thì không rò rỉ, và gọi `System.gc()` hay gán `null` để "ép dọn", trong khi object vẫn còn đường tham chiếu thì không gì thu hồi được. Cách tìm đúng là lấy heap dump, xem loại object chiếm nhiều nhất và đường ngắn nhất từ GC root tới chúng, rồi cắt tham chiếu thừa (giới hạn cache, hủy đăng ký listener, `remove()` ThreadLocal).

**Đáp án ngắn:** các nguồn điển hình là `static Map` làm cache không giới hạn, `ThreadLocal` trong thread pool không `remove()`, listener/callback đăng ký mà không hủy, tải cả bảng vào `List`, tag metric có vô hạn giá trị (mỗi giá trị là một object sống mãi), ClassLoader không được giải phóng khi gỡ plugin.

**Ví dụ:** thread pool 4 thread; mỗi task đặt một buffer 8 MB vào `ThreadLocal` rồi xong việc. Thread của pool **sống mãi** nên giá trị `ThreadLocal` gắn với thread cũng sống mãi:

```java
static final ThreadLocal<byte[]> BUF = new ThreadLocal<>();
pool.submit(() -> {
    BUF.set(new byte[8 * 1024 * 1024]);
    try { /* xử lý request */ } finally { if (remove) BUF.remove(); }
});
```

```text
truoc khi chay: 3 MB
khong remove() -> heap dang dung sau GC: 39 MB (pool van song)
co remove()   -> heap dang dung sau GC: 3 MB (pool van song)
```

4 thread × 8 MB = 32 MB bị giữ (3 + 32 ≈ 39 MB sau khi tính overhead). Chỉ thêm một dòng `remove()` trong `finally` là trả về 3 MB. Bản chất: `ThreadLocal` lưu giá trị trong `Thread.threadLocals` của **chính thread**, nên lifecycle giá trị = lifecycle thread, không phải lifecycle request. _Đã chạy thử trên JDK 11, `System.gc()` trước mỗi lần đo._

**Nhớ:** rò rỉ = còn đường tham chiếu tới thứ đã hết dùng; nghi ngờ trước hết static cache, ThreadLocal trong pool, listener không hủy.

**Hỏi xoáy 1:** Vì sao với `new Thread()` dùng một lần thì không rò?
**Vì sao hỏi tiếp:** Ví dụ ThreadLocal chỉ rò khi thread sống lâu, nên cần hỏi vì sao `new Thread()` dùng một lần thì không.
**Đáp:** Thread chết thì `threadLocals` của nó hết tham chiếu và được GC. Vấn đề chỉ xuất hiện khi thread **tái sử dụng** (pool, Tomcat worker) và request nối tiếp nhau.

**Hỏi xoáy 2:** Làm sao tìm ra rò rỉ trong production không dừng dịch vụ?
**Vì sao hỏi tiếp:** Biết nguồn rò chưa đủ, trong production phải tìm được object nào đang phình mà không dừng dịch vụ.
**Đáp:** `jcmd <pid> GC.class_histogram` hai lần cách nhau vài phút, so class nào tăng số lượng; hoặc `jcmd <pid> GC.heap_dump file.hprof` (dừng ngắn) rồi MAT xem dominator tree và "path to GC roots" của object nghi ngờ.

**Sai lầm hay gặp:** tưởng "có GC thì không rò". Cache "tạm" không có giới hạn kích thước hoặc TTL là rò rỉ đợi ngày đủ lớn.

### 4. Pause GC làm API giật, bạn chọn và chỉnh GC thế nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- GC đánh đổi giữa những thứ nào không thể cùng tối đa (khái niệm: throughput, latency, memory)?
- Vì sao GC phải tạm dừng ứng dụng, và chi phí của nó tỉ lệ với đại lượng nào?
- Nếu chi phí tỉ lệ với tốc độ cấp phát thì cách rẻ nhất để giảm là gì?

**Lập luận:** GC đánh đổi ba thứ không thể tối đa cùng lúc: **throughput** (tỉ lệ thời gian chạy code), **latency** (độ dài tạm dừng), **memory**. Nó phải tạm dừng ứng dụng (ít nhất một phần) vì cần nhìn đồ thị object ở trạng thái nhất quán. Chi phí GC tỉ lệ với **lượng object sống và tốc độ cấp phát**, nên cách rẻ nhất là cấp phát ít đi. Nên trước khi đổi bộ GC hay chỉnh cờ, hãy giảm cấp phát và đọc log GC; chỉ chọn bộ GC khác khi mục tiêu throughput hay latency thật sự đòi hỏi. Điểm dễ nhầm là chọn GC "mới nhất" theo danh tiếng thay vì theo mục tiêu đo được: ZGC giảm tạm dừng nhưng tốn thêm CPU và memory, còn Parallel cho throughput cao nhất nhưng tạm dừng dài. Cách làm đúng là bật log GC, đo tạm dừng và tần suất, so với SLO của dịch vụ, và chỉ đổi bộ GC khi số đo cho thấy mục tiêu không đạt dù đã giảm cấp phát.

**Đáp án ngắn:** G1 (mặc định từ Java 9) cân bằng, đặt mục tiêu `-XX:MaxGCPauseMillis`. Parallel cho throughput tối đa, chấp nhận tạm dừng dài. ZGC/Shenandoah cho tạm dừng rất ngắn không tăng theo kích thước heap, đổi lại tốn CPU và memory hơn. Chỉnh GC là bước cuối; bước đầu là giảm cấp phát và đọc log (`-Xlog:gc*`).

**Ví dụ:** cùng một chương trình, heap 64 MB, 400.000 vòng; biến thể "alloc" cấp phát `new byte[4096]` mỗi vòng (~1,6 GB rác), biến thể "reuse" dùng lại một buffer:

```text
G1       alloc : so lan pause=  89 full=0 tong=  448.7 ms max= 18.1 ms
G1       reuse : so lan pause=   4 full=0 tong=   86.9 ms max= 40.5 ms
Parallel alloc : so lan pause= 105 full=1 tong=  242.4 ms max= 38.1 ms
Parallel reuse : so lan pause=   2 full=0 tong=   23.5 ms max= 13.8 ms
```

Rút ra ba điều. (1) Không đổi GC, chỉ **giảm cấp phát** đã giảm số lần dừng từ 89 xuống 4 và tổng thời gian dừng gấp ~5 lần. (2) Parallel có tổng thời gian dừng thấp hơn G1 (242 so với 449 ms), đúng bản chất "throughput", dù có 1 lần Full GC. (3) Con số `max` của G1 ở "reuse" (40,5 ms) rơi vào đúng lần GC đầu tiên của process (`GC(0)`, lúc JVM còn nguội); chỉ có 4 mẫu nên không thể kết luận G1 có tạm dừng dài hơn. Một dòng log G1 điển hình để đọc:

```text
GC(1) Pause Young (Normal) (G1 Evacuation Pause) 5M->3M(64M) 13.366ms
         ^loại        ^lý do                        ^trước->sau(tổng heap) ^thời gian dừng
```

_Đã chạy thử trên JDK 11, số liệu phụ thuộc máy và có nhiễu._

**Nhớ:** G1 cân bằng (mặc định), Parallel cho throughput, ZGC/Shenandoah cho pause ngắn; chỉnh GC là bước cuối, sau khi giảm cấp phát.

**Hỏi xoáy 1:** Thấy Full GC lặp lại, bạn nghi gì đầu tiên?
**Vì sao hỏi tiếp:** Log GC xuất hiện Full GC lặp lại là triệu chứng cụ thể nhất, nên hỏi bạn nghi gì đầu tiên.
**Đáp:** Old generation đầy mà không thu được: rò rỉ hoặc heap nhỏ (xem câu 2), hoặc **object lớn** bị cấp phát thẳng vào Old (dòng "Humongous Allocation" ở câu 2). Kiểm tra dòng `->` sau Full GC để biết còn bao nhiêu sống.

**Hỏi xoáy 2:** Vì sao đặt heap thật lớn không phải lúc nào cũng tốt?
**Vì sao hỏi tiếp:** Phản xạ "tăng heap cho nhàn" cần được kiểm tra xem có luôn có lợi không.
**Đáp:** Heap lớn làm mỗi lần thu gom Old lâu hơn (với GC không đồng thời) và làm container dễ `OOMKilled`; ngược lại lấy RAM của page cache hệ điều hành. Với tạm dừng dài, đổi sang bộ GC đồng thời (ZGC) thay vì chỉ tăng heap.

**Sai lầm hay gặp:** bê nguyên bộ cờ GC từ blog (hay từ Java 8) vào Java 17/21. Cờ cũ có thể bị bỏ hoặc làm lệch heuristic mặc định tốt hơn.

### 5. Cùng một đoạn code Java chạy lần đầu chậm hơn hẳn các lần sau, vì sao, và đo hiệu năng thế nào cho đúng?

**Gợi ý suy luận:**
- Bytecode chạy bằng gì lúc đầu, và đoạn nào đáng biên dịch ra mã máy (khái niệm: interpreter, hot code, JIT)?
- JIT tối ưu dựa vào thông tin nào chỉ có lúc chạy (khái niệm: profile, tiered compilation)?
- Nếu kết quả tính toán không được dùng thì trình biên dịch có thể làm gì (khái niệm: dead code elimination)?

**Lập luận:** bytecode là trung gian, chạy bằng interpreter thì mỗi lệnh phải giải mã. JVM chỉ biên dịch ra mã máy phần **nóng** vì biên dịch tốn thời gian, và nó tối ưu dựa trên **hành vi đã quan sát lúc chạy** (profile): nhánh nào hay đi, kiểu thật của object là gì. Vì vậy hiệu năng đạt đỉnh sau khi "ấm". Do đó hiệu năng chỉ đạt đỉnh sau khi JVM đã quan sát và biên dịch phần nóng, nên phải warm-up trước khi đo và phải dùng kết quả để JIT không xóa mất phép tính. Điểm dễ nhầm là tin một con số benchmark tự viết: vòng lặp ngắn đo cả thời gian interpreter, JIT có thể xóa phép tính vì kết quả không dùng, và GC làm số liệu nhiễu. Vì vậy dùng JMH (có warm-up, nhiều fork, `Blackhole`), và với dịch vụ thật thì chú ý phần lớn request đầu sau khi deploy chậm hơn do chưa "ấm", nên khi triển khai cần bước làm ấm trước khi nhận toàn bộ traffic.

**Đáp án ngắn:** tiered compilation: interpreter, rồi C1 (biên dịch nhanh, ít tối ưu), rồi C2 (biên dịch kỹ: inlining, escape analysis, loại code chết). Cần warm-up trước khi đo. Benchmark tay dễ sai; dùng **JMH**.

**Ví dụ 1: ấm lên.** Một hàm tính băm lặp 400.000 lần mỗi vòng, đo 8 vòng:

```text
-Xint (chỉ interpreter): vong 1: 381 ms ... vong 8: 345 ms
mặc định:                vong 1: 44 ms, vong 2: 28 ms, vong 3: 23 ms, vong 4..8: 22-26 ms
```

Interpreter chậm hơn khoảng 15 lần so với mã đã biên dịch. Vòng đầu mặc định chậm gấp đôi vòng ổn định vì còn chạy bytecode và đang biên dịch. Cờ `-XX:+PrintCompilation` cho thấy event:

```text
   1570 1025       2       Warm::work (29 bytes)        <- tier 2: C1
   1799 1026 %     4       Warm::work @ 4 (29 bytes)    <- tier 4: C2, dấu % = OSR (thay thế giữa vòng lặp đang chạy)
```

**Ví dụ 2: bẫy benchmark tay (dead code elimination).** Cùng hàm trên, một vòng **bỏ** kết quả, một vòng **dùng** kết quả:

```text
vong 1: bo ket qua  52006 us | dung ket qua  30104 us
vong 3: bo ket qua   2411 us | dung ket qua  27058 us
vong 6: bo ket qua   2031 us | dung ket qua  22386 us
```

Từ vòng 3, vòng bỏ kết quả nhanh hơn ~10 lần: JIT thấy hàm thuần túy, kết quả không dùng nên **xóa luôn call**. Nếu bạn đo kiểu này sẽ kết luận "hàm chạy 5 ns" trong khi thật ra không chạy gì. JMH chống điều này bằng `Blackhole.consume(...)` và nhiều cơ chế khác. _Cả hai ví dụ đã chạy thử trên JDK 11._

**Nhớ:** tiered compilation: interpreter, C1, C2; đo bằng JMH có warm-up, không dùng `nanoTime()` một lần trong `main`.

**Hỏi xoáy 1:** Cùng mã, vì sao có thể chậm đi sau khi nhiều thread chạy (deoptimization)?
**Vì sao hỏi tiếp:** Mã đã tối ưu dựa trên giả định, nên phải hỏi chuyện gì xảy ra khi giả định sai (deoptimization).
**Đáp:** C2 tối ưu dựa trên giả định (ví dụ "chỉ thấy một subclass tại điểm gọi này nên gọi trực tiếp, không tra bảng ảo"). Khi giả định sai (xuất hiện subclass thứ hai), JVM **hủy** mã đã biên dịch và quay về interpreter rồi biên dịch lại. `-XX:+PrintCompilation` hiển thị `made not entrant`.

**Hỏi xoáy 2:** Ứng dụng khởi động chậm, có cách nào rút ngắn warm-up?
**Vì sao hỏi tiếp:** Biết nguyên nhân khởi động chậm rồi thì câu tiếp theo tự nhiên là rút ngắn nó bằng cách nào.
**Đáp:** CDS/AppCDS (chia sẻ metadata class), CRaC hoặc GraalVM native image (đổi lấy tối ưu runtime yếu hơn), và gọi "đường nóng" trong health check/warm-up trước khi nhận tải thật.

**Sai lầm hay gặp:** so sánh hai thuật toán bằng `System.nanoTime()` một lần trong `main`. Kết quả phản ánh trạng thái JIT chứ không phải thuật toán.

### 6. Cùng một class nhưng `ClassCastException` hoặc `NoSuchMethodError` xuất hiện: class loading đã xảy ra chuyện gì?

**Gợi ý suy luận:**
- JVM xác định danh tính một class bằng những gì (khái niệm: tên + ClassLoader)?
- Nếu hai loader độc lập cùng nạp một file `.class` thì chúng có là một class không?
- Lúc biên dịch dùng thư viện bản A, lúc chạy classpath có bản B thì lỗi gì xuất hiện (khái niệm: linkage error)?

**Lập luận:** JVM định danh một class bằng **cặp (tên đầy đủ, ClassLoader nạp nó)**, không chỉ tên. Việc này cho phép cô lập (ứng dụng web, plugin) nhưng cũng sinh ra những lỗi lạ khi cùng một class được nạp hai lần. Vì class được định danh bằng cặp (tên, loader), nạp hai lần cho ra hai class khác nhau dù cùng mã, và lệch phiên bản thư viện giữa lúc biên dịch với lúc chạy biểu hiện thành lỗi liên kết chứ không phải lỗi cú pháp. Điểm dễ nhầm là coi `NoSuchMethodError` hay `ClassCastException` giữa hai class "trùng tên" là lỗi code, trong khi nguyên nhân là hai bản thư viện hoặc hai loader khác nhau. Khi gặp, in ra vị trí nạp class (`Class.getProtectionDomain().getCodeSource()`), kiểm tra cây dependency (`mvn dependency:tree`), và loại bản trùng thay vì sửa chỗ báo lỗi.

**Đáp án ngắn:** quy trình nạp, liên kết (xác minh, chuẩn bị, giải tham chiếu), khởi tạo. Mặc định ủy quyền cho cha trước (nên `java.*` luôn là bản của JDK). `NoSuchMethodError`/`NoClassDefFoundError` lúc chạy thường do **hai phiên bản thư viện** (lúc biên dịch dùng bản A, lúc chạy classpath chứa bản B).

**Ví dụ:** nạp cùng một file `Plugin.class` bằng hai `URLClassLoader` độc lập:

```java
ClassLoader l1 = new URLClassLoader(urls, null);   // parent = null
ClassLoader l2 = new URLClassLoader(urls, null);
Class<?> c1 = l1.loadClass("Plugin"), c2 = l2.loadClass("Plugin");
Object o1 = c1.getDeclaredConstructor().newInstance();
c2.cast(o1);   // ném lỗi
```

```text
cung ten lop: true
cung Class object: false
ClassCastException: Cannot cast Plugin to Plugin
```

Thông báo "Cannot cast Plugin to Plugin" là dấu hiệu kinh điển của hai loader. Hay gặp trong ứng dụng web hot-reload, plugin, hoặc khi cùng một JAR nằm cả ở `WEB-INF/lib` lẫn thư mục chung của server. _Đã chạy thử trên JDK 11._

Cách điều tra lỗi xung đột phiên bản (minh họa, chưa chạy thử):

```text
mvn dependency:tree -Dincludes=com.fasterxml.jackson.core
[INFO] +- com.acme:lib-a:jar:1.0
[INFO] |  \- com.fasterxml.jackson.core:jackson-databind:jar:2.9.0   <- bản nào thắng?
[INFO] \- org.springframework.boot:spring-boot-starter-json
[INFO]    \- com.fasterxml.jackson.core:jackson-databind:jar:2.15.2
```

Maven chọn một bản theo "gần nhất trong cây"; nếu bản được chọn thiếu method mà mã cần thì ra `NoSuchMethodError` lúc chạy, vì biên dịch không báo lỗi đối với thư viện đã có sẵn trong classpath lúc build. Có thể thêm `-verbose:class` để biết class nào được nạp từ JAR nào.

**Nhớ:** class = (tên, ClassLoader); lỗi `NoSuchMethodError`/`NoClassDefFoundError` thường là hai phiên bản thư viện trên classpath.

**Hỏi xoáy 1:** Tại sao `java.lang.String` không thể bị ghi đè bằng class tự viết trùng tên?
**Vì sao hỏi tiếp:** Cơ chế ủy quyền cho cha giải thích vì sao class hệ thống không bị giả mạo, nên hỏi trường hợp `java.lang.String`.
**Đáp:** Ủy quyền cha: yêu cầu nạp `java.lang.String` luôn đi lên bootstrap loader trước và tìm thấy bản của JDK, không bao giờ tới loader của ứng dụng. Ngoài ra cấm tạo class trong gói `java.*` từ loader khác.

**Hỏi xoáy 2:** Container như Tomcat có đảo ngược ủy quyền không?
**Vì sao hỏi tiếp:** Container web lại đảo ngược ủy quyền để cô lập ứng dụng, nên hỏi tiếp cái giá của việc đó.
**Đáp:** Có, với WebappClassLoader: ưu tiên class trong `WEB-INF` trước rồi mới tới cha (trừ class hệ thống), để mỗi ứng dụng web dùng phiên bản thư viện riêng. Cái giá: dễ có "hai bản" cùng class và rò rỉ Metaspace khi redeploy.

**Sai lầm hay gặp:** thêm JAR "cho chắc" vào classpath mà không kiểm tra dependency tree, dẫn tới lỗi chỉ hiện ở môi trường khác.

### 7. Tăng `maxThreads` của Tomcat lên 1000 mà throughput không tăng: nút thắt nằm ở đâu?

**Gợi ý suy luận:**
- Một request đi qua những tài nguyên hữu hạn nào nối tiếp nhau (thread HTTP, kết nối DB, CPU)?
- Throughput của chuỗi nối tiếp bị giới hạn bởi phần tử nào?
- Số request đồng thời liên hệ với tốc độ đến và thời gian xử lý thế nào (định luật Little)?

**Lập luận:** hệ thống có nhiều tài nguyên hữu hạn nối tiếp nhau (thread HTTP, kết nối DB, CPU). **Throughput bị giới hạn bởi tài nguyên hẹp nhất**, và định luật Little cho biết quan hệ: `L = λ × W` (số yêu cầu đồng thời = tốc độ đến × thời gian xử lý). Do đó năng lực thật của hệ thống là min của mọi tài nguyên trong chuỗi, và tăng tài nguyên không phải điểm nghẽn không có tác dụng. Điểm dễ nhầm là thấy request chậm thì tăng số thread Tomcat: nếu điểm nghẽn là pool DB (mặc định 10) thì thêm thread chỉ làm nhiều request hơn xếp hàng chờ kết nối và tăng memory. Định luật Little cho cách kiểm tra nhanh: số request đồng thời bằng tốc độ đến nhân thời gian xử lý; nếu con số đó vượt pool thì phải giảm thời gian giữ kết nối hoặc tăng pool có tính toán, chứ không tăng mọi thứ.

**Đáp án ngắn:** mỗi request chiếm một thread Tomcat (mặc định 200) và, khi cần DB, một kết nối từ pool (HikariCP mặc định 10). Điểm nghẽn thật thường là pool DB chứ không phải thread HTTP. Mọi pool đều phải có giới hạn và queue giới hạn.

**Ví dụ (tính tay bằng định luật Little, giả định 500 request/giây, mỗi request giữ kết nối DB trong thời gian W):**

```text
W = 20 ms  => cần 500 x 0.020 = 10 kết nối đồng thời   => Hikari 10 vừa đủ
W = 200 ms (DB chậm) => cần 500 x 0.200 = 100 kết nối  => pool 10 chỉ phục vụ tối đa 10 / 0.2 = 50 req/s
```

Khi DB chậm 10 lần, năng lực pool tụt từ 500 xuống 50 req/s, trong khi 200 thread Tomcat vẫn nhận request và **đứng chờ kết nối** (mặc định chờ 30 giây rồi báo timeout). Triệu chứng: CPU thấp, thread dump đầy thread ở `HikariPool.getConnection`. Đừng chữa bằng tăng pool lên 200: bạn chỉ dồn thêm tải vào DB đang chậm. Chữa nguyên nhân (truy vấn chậm, lock) và đặt timeout rõ ràng. _Đã tính bằng Python._

**Nhớ:** định luật Little `L = λ × W`; throughput = tài nguyên hẹp nhất, thường là pool DB chứ không phải thread HTTP.

**Hỏi xoáy 1:** Virtual threads có giải quyết bài này không?
**Vì sao hỏi tiếp:** Virtual threads được quảng cáo là chữa vấn đề thread, nên hỏi chúng có phá được nút thắt vừa tính không.
**Đáp:** Chỉ giải quyết phần "một thread HĐH cho mỗi request chờ I/O". Pool DB vẫn là 10 kết nối nên throughput vẫn bị block như trên. Virtual threads cho phép có hàng chục nghìn request đang chờ mà không tốn thread HĐH; chúng xếp hàng chờ kết nối thay vì chiếm thread nặng.

**Hỏi xoáy 2:** Kích thước pool DB nên chọn theo gì?
**Vì sao hỏi tiếp:** Nút thắt là pool DB, nên hỏi kích thước pool đó phải chọn theo đâu.
**Đáp:** Theo năng lực của **DB** (số nhân CPU, số đĩa), không theo số thread ứng dụng. Pool nhỏ vừa phải thường nhanh hơn pool lớn vì giảm tranh chấp ở DB; điểm xuất phát thường là vài chục kết nối cho cả đội ứng dụng, rồi đo.

**Sai lầm hay gặp:** coi `maxThreads=200` là năng lực 200 request đồng thời. Năng lực thật là `min` của mọi tài nguyên trong chuỗi.

### 8. Dịch vụ phải gọi nhiều API chậm: chọn WebFlux hay Spring MVC + virtual threads?

**Gợi ý suy luận:**
- Vấn đề chung của cả hai là gì (một thread HĐH đứng chờ I/O tốn stack và chuyển ngữ cảnh)?
- Một bên đổi mô hình lập trình, bên kia đổi cách lập lịch: mỗi bên bắt người viết code trả giá gì?
- Điều gì xảy ra nếu một call chặn nằm trong event loop?

**Lập luận:** cả hai giải cùng một vấn đề: không để một thread HĐH (tốn ~1 MB stack, chuyển ngữ cảnh đắt) đứng chờ I/O. WebFlux làm bằng cách **đổi mô hình lập trình** (callback/event flow non-blocking). Virtual thread làm bằng cách **đổi cách runtime lập lịch** (chờ I/O thì nhả thread nền), giữ nguyên code tuần tự. Cả hai đều giải cùng một vấn đề ở hai tầng khác nhau; virtual threads giữ code tuần tự nên rẻ cho đội phát triển, còn WebFlux chỉ đáng khi cần streaming và backpressure. Điểm dễ nhầm là chuyển sang WebFlux để "nhanh hơn" cho một dịch vụ CRUD thông thường: nó chỉ có lợi khi toàn bộ chuỗi (driver, thư viện) đều non-blocking, và một lời gọi blocking lọt vào event loop sẽ làm mọi request đứng. Nếu mục tiêu chỉ là chịu nhiều kết nối chờ I/O, virtual thread giữ code tuần tự và thường đủ; hãy để yêu cầu streaming và backpressure quyết định WebFlux.

**Đáp án ngắn:** WebFlux khi cần streaming dữ liệu, backpressure chặt, hoặc toàn bộ stack đã non-blocking. MVC + virtual threads khi muốn code tuần tự, dễ debug mà vẫn scale I/O. Với phần lớn dịch vụ mới, lựa chọn sau thường đủ.

**Ví dụ (minh họa, chưa chạy thử):** cùng một việc "lấy user rồi lấy đơn hàng":

```java
// MVC + virtual threads (spring.threads.virtual.enabled=true): tuần tự, stack trace đọc được
User u = userClient.get(id);
List<Order> o = orderClient.listBy(u.id());
return new Summary(u, o);

// WebFlux: không chặn, nhưng mọi lời gọi phải trả Mono/Flux
return userClient.get(id)
        .flatMap(u -> orderClient.listBy(u.id()).collectList().map(o -> new Summary(u, o)));
```

Phép tính năng lực (định luật Little): 5000 req/s, mỗi request chờ I/O 100 ms ⇒ cần **500 request đồng thời** đang chờ. Pool 200 thread chỉ xử lý được 200 / 0.1 = 2000 req/s. Virtual thread hoặc WebFlux đều vượt trần này, vì cái bị giới hạn không còn là số thread HĐH. _Đã tính bằng Python._

**Nhớ:** WebFlux khi cần streaming, backpressure, stack non-blocking đầu cuối; MVC + virtual threads là mặc định hợp lý cho phần lớn dịch vụ mới.

**Hỏi xoáy 1:** Một thư viện chặn (JDBC) trong WebFlux thì sao?
**Vì sao hỏi tiếp:** Chi phí ẩn lớn nhất của WebFlux là mã chặn lọt vào event loop, nên hỏi trường hợp JDBC.
**Đáp:** Chạy trên thread event loop sẽ **chặn cả event loop**, vài thread bị block là toàn bộ máy dừng. Phải đẩy sang scheduler riêng (`publishOn(boundedElastic())`) hoặc dùng driver non-blocking (R2DBC). Điều này là chi phí ẩn lớn nhất của WebFlux.

**Hỏi xoáy 2:** Virtual thread có lúc nào không giúp được?
**Vì sao hỏi tiếp:** Nếu virtual threads rẻ như vậy thì cần biết giới hạn của chúng, tức khi nào không giúp được.
**Đáp:** (1) Tác vụ nặng CPU (không có gì để nhả). (2) Bị "pin" vào thread nền khi chặn bên trong `synchronized` hoặc gọi native, ở một số phiên bản (kiểm tra theo phiên bản Java bạn dùng). (3) Tài nguyên hạ nguồn hữu hạn (pool DB) vẫn là nút thắt.

**Sai lầm hay gặp:** chọn WebFlux "cho nhanh" cho dịch vụ CRUD thông thường rồi bị bó bởi độ khó debug, mà JDBC chặn vẫn nằm đó.

## Phần hệ phân tán

### 9. Hai replica mất kết nối với nhau mà vẫn nhận ghi: vì sao CAP buộc bạn chọn giữa nhất quán và sẵn sàng?

**Gợi ý suy luận:**
- Hai máy muốn thống nhất cần điều kiện gì (khái niệm: liên lạc được với nhau)?
- Khi đường nối đứt, mỗi bên chỉ có hai lựa chọn nào (từ chối phục vụ hay cứ phục vụ)?
- Mỗi lựa chọn trả giá gì (khái niệm: CP so với AP)?

**Lập luận:** hai máy chỉ có thể thống nhất nếu **nói chuyện được với nhau**. Khi đường truyền đứt (phân vùng), mỗi bên hoặc từ chối phục vụ (giữ nhất quán) hoặc cứ phục vụ (có thể lệch nhau). Không có cách thứ ba, vì không thể biết bên kia đang làm gì. Do đó khi phân vùng xảy ra không có đáp án thứ ba, và vì mạng luôn có thể đứt nên câu hỏi thật là chọn CP hay AP cho từng chức năng. Điểm dễ nhầm là nghĩ "CA" là một lựa chọn: hệ chạy trên mạng không thể bỏ P, nên việc chọn chỉ xuất hiện khi mạng đứt. Cũng đừng gán nhãn CP hay AP cho cả hệ thống: số dư tài khoản có thể cần CP (từ chối khi không chắc), còn giỏ hàng hay lượt xem thường chọn AP (phục vụ dữ liệu hơi cũ). Khi thiết kế, hỏi với từng chức năng: nếu không thể đồng thuận thì từ chối hay trả dữ liệu cũ?

**Đáp án ngắn:** mạng luôn có thể đứt nên P là điều kiện thực tế, câu hỏi thật là CP hay AP **khi phân vùng xảy ra**. Lúc bình thường, đánh đổi là latency so với nhất quán (PACELC). Quyết định theo **từng chức năng**, không theo cả hệ thống.

**Ví dụ (mô phỏng): hai replica của tồn kho, ban đầu cả hai `stock=10`, đường nối bị đứt.**

```text
CP: ghi r1: TU CHOI (khong lien lac duoc r2 de dat quorum)
    doc r2: TU CHOI/ cho (khong dam bao moi nhat)
AP: ghi r1: OK (stock r1=2)               <- khách A mua 8
    ghi r2: OK (r2 van thay stock=10 -> con 5)   <- khách B mua 5
    sau khi noi lai: r1=2 r2=5 -> tong ban 13 tren ton 10 => OVERSELL, can hop nhat/bu tru
```

CP giữ đúng nhưng một số khách thấy lỗi. AP không ai thấy lỗi nhưng bán lố 3 sản phẩm, phải bù (hoàn tiền, xin lỗi) sau đó. Với tồn kho sản phẩm số lượng ít, chọn CP (hoặc giữ chỗ nghiêm ngặt); với số lượt xem, chọn AP vì lệch vài đơn vị vô hại. _Đã chạy mô phỏng bằng Python (logic minh họa, không phải CSDL thật)._

**Nhớ:** P là điều kiện thực tế, không phải lựa chọn; chọn CP hay AP theo từng chức năng, lúc bình thường là latency so với nhất quán (PACELC).

**Hỏi xoáy 1:** "Nhất quán" của C trong CAP có giống C trong ACID không?
**Vì sao hỏi tiếp:** Từ "nhất quán" dễ bị hiểu nhầm, nên hỏi C trong CAP có giống C trong ACID không.
**Đáp:** Không. C trong CAP là **linearizability**: mọi đọc thấy lần ghi gần nhất như thể chỉ có một bản sao. C trong ACID là ràng buộc toàn vẹn (không vi phạm foreign key, số dư không âm).

**Hỏi xoáy 2:** Hệ AP thì "eventual consistency" cần thêm gì để dùng được?
**Vì sao hỏi tiếp:** Chọn AP thì phải sống với lệch dữ liệu, nên hỏi cần thêm gì để hệ eventual consistency dùng được.
**Đáp:** Cách hợp nhất xung đột xác định (last-write-wins có đồng hồ, CRDT, hoặc quy tắc nghiệp vụ), thao tác idempotent, và hành động bù cho trường hợp sai lệch như oversell ở trên.

**Sai lầm hay gặp:** nói "hệ thống của tôi CA". Hệ phân tán không thể bỏ P; "CA" chỉ đúng với một nút duy nhất.

### 10. Đặt hàng đụng ba dịch vụ, bước giữa lỗi: giữ dữ liệu nhất quán bằng 2PC, Saga hay Outbox?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- ACID trên một DB dựa vào điều gì (một nơi duy nhất quyết định commit/rollback)?
- Dữ liệu nằm ở nhiều dịch vụ thì còn nơi đó không, và có hai hướng nào (phối hợp chặn hay chấp nhận state trung gian)?
- Lưu DB rồi gửi event là hai hệ thống, nếu một bên lỗi thì ra sao (khái niệm: dual write)?

**Lập luận:** ACID trên một DB dựa vào việc có **một nơi duy nhất** quyết định commit hay rollback. Khi dữ liệu nằm ở nhiều dịch vụ, không còn nơi đó; phải chọn: dùng giao thức phối hợp (2PC, chặn và có điểm lỗi), hoặc chấp nhận state trung gian và **bù** (Saga). Vì vậy 2PC giữ nhất quán mạnh bằng cách chặn và có điểm lỗi, Saga chấp nhận state trung gian và bù, còn Outbox biến việc phát event thành một ghi trong cùng transaction DB. Điểm dễ nhầm là tin có thể giữ `@Transactional` xuyên nhiều dịch vụ như trong một DB; nó chỉ bao một kết nối. Với phát event, lỗi kinh điển là ghi DB xong rồi gửi message và sập ở giữa, làm hai nơi lệch nhau; Outbox sửa đúng điểm này vì ghi event cùng transaction với dữ liệu. Khi review, mỗi chỗ có "ghi DB rồi gọi dịch vụ khác" cần câu trả lời cho trường hợp sập ở giữa và cho thao tác bù.

**Đáp án ngắn:** 2PC: nhất quán mạnh nhưng giữ lock trong lúc chờ và coordinator là điểm lỗi, ít dùng giữa microservices. Saga: chuỗi transaction cục bộ, mỗi bước có hành động bù, eventual consistency. Outbox: ghi event vào bảng trong **cùng transaction** với dữ liệu nghiệp vụ, process khác chuyển ra broker, tránh "lưu DB xong nhưng gửi event thất bại".

**Ví dụ 1: Saga đặt hàng (truy vết từng bước, minh họa).**

```text
1. Order:     tao don (PENDING)               OK
2. Payment:   tru tien 100                    OK
3. Inventory: giu hang                        THAT BAI (het hang)
   -> bu: Payment hoan 100   (compensating action)
   -> bu: Order doi trang thai CANCELLED
```

Điểm mấu chốt: giữa bước 2 và hoàn tiền, người dùng **thấy tiền đã bị trừ**. Đó là state trung gian hợp lệ trong Saga, nên giao diện phải hiển thị "đang xử lý" chứ không tuyên bố thành công.

**Ví dụ 2: Outbox (đã chạy, SQLite trong memory).** Hai bảng `orders` và `outbox` được ghi trong một transaction; lần thứ hai cố ý lỗi giữa chừng:

```text
  rollback: loi giua chung
outbox: orders = 1 , outbox = 1 (luon bang nhau)
```

Lần thất bại rollback cả hai bảng nên không có "đơn hàng không event" hay "event không đơn hàng". Một process riêng đọc `outbox` có `sent=0`, phát lên broker, rồi đánh dấu đã gửi. Cái giá: event có thể được phát **nhiều hơn một lần** (nếu crash giữa phát và đánh dấu), nên consumer phải idempotent (câu 11). _Đã chạy thử bằng Python + SQLite._

**Nhớ:** 2PC chặn và có coordinator là điểm lỗi; Saga là chuỗi transaction cục bộ cộng hành động bù; Outbox ghi event cùng transaction với dữ liệu.

**Hỏi xoáy 1:** Vì sao không "lưu DB rồi gửi Kafka" trong cùng hàm `@Transactional`?
**Vì sao hỏi tiếp:** Outbox giải bài toán dual write, nên hỏi thẳng vì sao không gửi Kafka trong cùng hàm `@Transactional`.
**Đáp:** Hai hệ thống khác nhau không chung transaction. Nếu Kafka lỗi sau khi DB commit thì mất event; nếu gửi trước rồi DB rollback thì phát event cho thứ không tồn tại. Outbox biến "hai hệ thống" thành "một DB cộng một lần phát có thể retry".

**Hỏi xoáy 2:** Hành động bù thất bại thì sao?
**Vì sao hỏi tiếp:** Saga dựa vào hành động bù, nên hỏi chuyện gì xảy ra khi chính hành động bù thất bại.
**Đáp:** Phải thiết kế bù cũng idempotent và **retry đến khi thành công** (hoặc đưa vào queue cần người xử lý). Saga không có "rollback tự động"; bù là mã nghiệp vụ bạn tự viết và kiểm thử.

**Sai lầm hay gặp:** làm Saga mà quên state trung gian hiển thị cho người dùng, hoặc hành động bù không idempotent nên hoàn tiền hai lần.

### 11. Client không nhận được phản hồi nên gửi lại, và khách bị trừ tiền hai lần: thiết kế idempotency thế nào?

**Gợi ý suy luận:**
- Khi mất phản hồi, bên gửi có phân biệt được "chưa xử lý" với "đã xử lý nhưng phản hồi mất" không?
- Nếu không phân biệt được thì cách duy nhất là gì, và bên nhận phải chịu được điều gì?
- Kiểm tra "đã có chưa" ở tầng code có khe hở gì khi hai request đến cùng lúc (khái niệm: race, ràng buộc UNIQUE)?

**Lập luận:** trong hệ phân tán, "đã gửi" không đồng nghĩa "đã nhận". Khi không nhận được phản hồi, bên gửi **không thể phân biệt** "chưa xử lý" với "đã xử lý nhưng phản hồi mất", nên chỉ còn cách gửi lại. Hệ quả: bên nhận phải chịu được trùng lặp. Idempotent = thực hiện nhiều lần cho kết quả như một lần. Do đó phải có lock idempotency do client sinh và một ràng buộc duy nhất ở DB làm trọng tài, vì kiểm tra rồi ghi ở tầng code vẫn lọt khe thời gian. Điểm dễ nhầm là nghĩ retry chỉ là chuyện của client: bên nhận cũng phải được thiết kế để nhận trùng, vì broker, load balancer hay timeout đều có thể gửi lại. Vì vậy mọi thao tác thay đổi trạng thái (thanh toán, tạo đơn) cần idempotency key, và ràng buộc `UNIQUE` là trọng tài cuối cùng khi hai request trùng chạy song song; trả lại kết quả cũ cho request lặp thay vì báo lỗi.

**Đáp án ngắn:** dùng key idempotency do client sinh (UUID cho mỗi ý định), lưu cùng ràng buộc `UNIQUE` ở DB. Không kiểm tra bằng "có chưa rồi mới chèn" ở tầng code vì có khe hở thời gian.

**Ví dụ (đã chạy, hai thread cùng gửi lock `K1`, ép cả hai kiểm tra trước rồi mới ghi):**

```text
check-then-insert: ['inserted', 'inserted'] -> so dong trong bang = 2      <- trừ tiền 2 lần
UNIQUE constraint : ['duplicate -> tra ket qua cu', 'inserted'] -> so dong = 1
```

Cách sai: `SELECT` thấy chưa có, rồi `INSERT`: hai thread cùng thấy "chưa có" nên cùng chèn. Cách đúng: để **DB phân xử** bằng `UNIQUE INDEX`; thread thua nhận `IntegrityError`/`DuplicateKeyException`, và bạn trả về kết quả đã lưu của lần đầu thay vì xử lý lại. Quy trình đầy đủ cho API thanh toán:

```text
POST /payments   Idempotency-Key: 7f3a...
1. INSERT payment(idem_key, status='PROCESSING')  -- UNIQUE(idem_key)
2. trùng key?  -> đọc bản ghi cũ, trả đúng response đã lưu (không trừ tiền lại)
3. mới?        -> trừ tiền, cập nhật status='DONE', lưu response
```

_Đã chạy thử bằng Python + SQLite (hành vi UNIQUE giống các DB quan hệ khác, cú pháp lỗi khác nhau)._

**Nhớ:** gửi lại là không tránh khỏi nên bên nhận phải idempotent; dùng key do client sinh cộng `UNIQUE` ở DB.

**Hỏi xoáy 1:** Cùng key nhưng nội dung request khác thì sao?
**Vì sao hỏi tiếp:** Lock trùng nhưng nội dung khác là trường hợp biên của chính cơ chế vừa dựng, nên hỏi xử lý ra sao.
**Đáp:** Là lỗi của client (tái sử dụng key sai). Lưu thêm băm của request cùng key; nếu khác thì trả 422/409 thay vì lặng lẽ trả kết quả của request kia.

**Hỏi xoáy 2:** Consumer Kafka idempotent thế nào?
**Vì sao hỏi tiếp:** Cùng nguyên tắc áp dụng cho phía nhận event, nên hỏi consumer Kafka làm idempotent thế nào.
**Đáp:** Lưu `eventId` đã xử lý (bảng có `UNIQUE(event_id)`) **trong cùng transaction** với tác dụng nghiệp vụ, hoặc làm thao tác tự nhiên idempotent (`SET status='PAID'` thay vì `balance = balance - 100`). Hãy xem [Distributed lock và Idempotency](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md).

**Sai lầm hay gặp:** lưu key idempotency trong memory hoặc Redis rồi coi là đủ, nhưng bản ghi này không cùng transaction với tác dụng phụ nên có khe hở khi crash.

### 12. Hai process cùng tin mình đang giữ distributed lock: chuyện này xảy ra thế nào và chữa ra sao?

**Gợi ý suy luận:**
- Vì sao distributed lock cần TTL (khái niệm: lease, chủ lock chết thì lock không kẹt mãi)?
- Chủ lock bị dừng (GC pause) rồi tỉnh dậy thì nó có biết lock đã hết hạn không?
- Qua mạng có phân biệt được "chết" với "chậm" không, và nơi lưu dữ liệu có cách nào từ chối bên cũ (khái niệm: fencing token)?

**Lập luận:** distributed lock dựa vào **thời gian** (TTL/lease) để tránh lock kẹt mãi khi chủ lock chết. Nhưng chủ lock có thể **không chết mà chỉ bị dừng** (GC pause, VM bị tạm dừng) rồi tỉnh dậy và vẫn tin mình giữ lock. Không thể phân biệt "chết" với "chậm" qua mạng. Do đó TTL hết trong lúc chủ lock còn sống sẽ cho hai bên cùng giữ lock, và cách chữa tận gốc là để nơi lưu dữ liệu từ chối token cũ hơn. Điểm dễ nhầm là coi lock Redis như lock trong một JVM: nó chỉ là một thỏa thuận dựa trên thời gian, không ai thực sự ngăn tiến trình cũ tiếp tục ghi sau khi lock hết hạn. Vì vậy với dữ liệu tiền bạc hoặc tồn kho, đừng dựa vào lock để bảo đảm đúng đắn: dùng ràng buộc hoặc cột `version` ở DB (hoặc fencing token) làm lớp bảo vệ cuối, và lock chỉ để giảm tranh chấp.

**Đáp án ngắn:** TTL hết khi việc chưa xong, hoặc failover Redis làm mất lock, đều dẫn tới hai bên cùng nghĩ mình giữ lock. Chữa tận gốc: **fencing token** (số tăng dần cấp kèm lock), nơi lưu dữ liệu từ chối token cũ. Tốt hơn nữa: không dựa vào lock mà dùng ràng buộc/phiên bản ở DB.

**Ví dụ (đã chạy mô phỏng): A lấy lock token 1, bị dừng, lock hết hạn; B lấy lock token 2 và ghi; rồi A tỉnh dậy và ghi.**

```text
fencing=False: B:OK | A:OK | gia tri cuoi = A-ghi-muon          <- dữ liệu cũ đè dữ liệu mới
fencing=True : B:OK | A:TU CHOI (token 1 < 2) | gia tri cuoi = B-ghi
```

Không fencing, ghi muộn của A đè lên B dù A không còn đúng quyền. Có fencing, kho lưu trữ nhớ token lớn nhất đã thấy (2) và từ chối token 1. Phiên bản "không cần lock" tương đương trong DB là cập nhật có điều kiện `UPDATE ... SET v=v+1 WHERE id=? AND v=?` (tối ưu lạc quan, câu 11). _Đã chạy mô phỏng bằng Python._

**Nhớ:** distributed lock dựa vào thời gian nên không tuyệt đối; bảo vệ tính đúng cần fencing token hoặc ràng buộc/phiên bản ở DB.

**Hỏi xoáy 1:** Redlock có giải được vấn đề trên không?
**Vì sao hỏi tiếp:** Redlock thường được nhắc như giải pháp, nên hỏi nó có chữa được tình huống bị dừng không.
**Đáp:** Redlock giảm rủi ro mất lock do một nút Redis hỏng, nhưng **không giải quyết** trễ do process bị dừng (A ở trên) và phụ thuộc giả định về đồng hồ. Với yêu cầu chính xác tuyệt đối cần fencing token hoặc hệ có đồng thuận (ZooKeeper/etcd).

**Hỏi xoáy 2:** Khi nào distributed lock vẫn hợp lý?
**Vì sao hỏi tiếp:** Nếu lock không tuyệt đối thì cần biết khi nào vẫn dùng nó hợp lý.
**Đáp:** Khi sai sót chỉ tốn hiệu năng chứ không sai dữ liệu (ví dụ tránh hai worker cùng chạy một job nặng, có thể chạy lặp mà không hỏng). Còn dùng nó để bảo vệ tính đúng tuyệt đối thì phải có lớp bảo vệ thứ hai ở nơi lưu dữ liệu.

**Sai lầm hay gặp:** `SETNX` không có TTL (kẹt vĩnh viễn nếu chủ lock chết) hoặc TTL cố định ngắn hơn thời gian xử lý trong ngày tải cao.

### 13. Cùng một đơn hàng mà event "hủy" đến trước "tạo" trên Kafka: Kafka bảo đảm thứ tự và giao nhận tới đâu?

**Gợi ý suy luận:**
- Kafka mở rộng bằng cách nào (khái niệm: partition)?
- Thứ tự chỉ có nghĩa trong một dãy tuần tự, vậy bảo đảm nằm ở phạm vi nào?
- Muốn các bản ghi của cùng một object đi cùng dãy thì chọn gì (khái niệm: key)?

**Lập luận:** Kafka mở rộng bằng cách **chia log thành partition độc lập**. Thứ tự chỉ có nghĩa trong một dãy tuần tự, nên chỉ được bảo đảm trong **một partition**. Hai partition xử lý parallel thì không có thứ tự tương đối. Đây là sự đánh đổi trực tiếp giữa parallel và thứ tự. Do đó thứ tự chỉ có trong một partition, muốn thứ tự theo object thì dùng cùng key, và vì mặc định at-least-once nên consumer phải chịu được trùng lặp. Điểm dễ nhầm là nghĩ Kafka bảo đảm thứ tự toàn cục của topic; nó chỉ bảo đảm trong một partition, và tăng số partition sau này làm đổi cách ánh xạ key sang partition, phá thứ tự của dữ liệu cũ. Khi thiết kế, chọn key theo thứ tự cần giữ (id đơn hàng, id tài khoản), tính trước số partition cho tải tương lai, và viết consumer idempotent vì giao hàng mặc định là at-least-once.

**Đáp án ngắn:** muốn thứ tự theo một object (đơn hàng, tài khoản) thì dùng **cùng key** để các bản ghi vào cùng partition. Mặc định at-least-once nên consumer phải idempotent; exactly-once cần producer idempotent và transaction. Số consumer hữu ích tối đa trong một group bằng số partition; lỗi lặp lại chuyển sang dead-letter topic.

**Ví dụ (đã chạy; hàm băm đơn giản hóa `hashCode() % số partition`, Kafka thật dùng murmur2 nhưng nguyên lý giống):**

```text
key         3 partition -> 4 partition
order-1001  2 -> 3   <-- doi partition
order-1002  0 -> 0
order-1003  1 -> 1
order-1004  2 -> 2
order-1005  0 -> 3   <-- doi partition
order-1006  1 -> 0   <-- doi partition
```

Cùng key luôn vào cùng partition khi số partition **không đổi**. Khi tăng từ 3 lên 4, 3 trong 6 key chuyển partition: bản ghi mới của `order-1001` nằm ở partition khác với các bản ghi cũ còn chưa xử lý, **mất thứ tự** trong giai đoạn chuyển tiếp. Vì vậy phải ước lượng số partition từ đầu (dư một chút) và tránh tăng sau này với topic cần thứ tự theo key. _Đã chạy thử trên JDK 11._

**Nhớ:** thứ tự chỉ trong một partition; cùng key thì cùng partition; at-least-once nên consumer cần idempotent.

**Hỏi xoáy 1:** Cùng key vẫn bị đảo thứ tự, vì sao?
**Vì sao hỏi tiếp:** Đã dùng cùng key mà thứ tự vẫn lệch là tình huống thực tế khó nhất, nên hỏi nguyên nhân.
**Đáp:** Producer có `retries` và `max.in.flight.requests.per.connection > 1` mà **không** bật idempotence: lô 1 lỗi, lô 2 đến trước, lô 1 gửi lại đến sau. Bật `enable.idempotence=true` (broker dùng số thứ tự theo producer để giữ đúng thứ tự). Nguyên nhân khác: dùng retry topic đẩy bản ghi lỗi sang topic khác, hoặc consumer xử lý parallel nhiều thread.

**Hỏi xoáy 2:** At-least-once sinh trùng lặp ở đâu?
**Vì sao hỏi tiếp:** At-least-once nghĩa là có thể nhận trùng, nên hỏi trùng sinh ra ở khâu nào.
**Đáp:** Consumer xử lý xong nhưng crash **trước khi commit offset**, nên restart đọc lại từ offset cũ. Chữa bằng idempotent consumer (câu 11), không phải bằng cách commit sớm hơn (commit trước khi xử lý đổi thành at-most-once: có thể mất).

**Sai lầm hay gặp:** tin "Kafka giữ thứ tự" ở mức toàn topic, hoặc cho nhiều hơn số partition consumer rồi thắc mắc vì sao một số consumer ngồi không.

### 14. Một dịch vụ hạ nguồn chậm kéo sập cả chuỗi: timeout, retry và circuit breaker phối hợp thế nào để chặn?

**Gợi ý suy luận:**
- Dịch vụ chậm làm người gọi giữ thread và kết nối lâu hơn thì điều gì xảy ra tiếp (khái niệm: sự cố dây chuyền)?
- Mỗi cơ chế chặn kiểu lan nào: chờ vô hạn, lỗi thoáng qua, đổ tải vào chỗ đang hỏng?
- Retry mà không kiểm soát có thể làm hạ nguồn đang hỏng tệ hơn không (khái niệm: backoff, jitter)?

**Lập luận:** lỗi trong hệ phân tán có tính **lan truyền**: một dịch vụ chậm khiến người gọi giữ thread và kết nối lâu hơn, hết tài nguyên, rồi nó cũng chậm theo (sự cố dây chuyền). Mỗi cơ chế chặn một kiểu lan: timeout chặn chờ vô hạn, retry che lỗi tạm thời, circuit breaker ngừng đổ tải vào chỗ đang hỏng. Do đó mỗi cơ chế phải có giới hạn: timeout chặn việc chờ, retry có backoff và jitter chỉ cho thao tác idempotent, breaker từ chối nhanh để hạ nguồn kịp hồi phục. Điểm dễ nhầm là bật retry ở nhiều tầng cùng lúc: nếu mỗi tầng retry 3 lần thì một lỗi ở tầng cuối có thể sinh 27 lần gọi, khuếch đại đúng lúc dịch vụ đang yếu. Khi thiết kế, retry ở một tầng (thường gần client nhất), tổng thời gian chờ nhỏ hơn timeout của người gọi, timeout giảm dần từ ngoài vào trong, và có bulkhead để một dịch vụ chậm không chiếm hết thread của cả hệ thống.

**Đáp án ngắn:** timeout giới hạn thời gian chờ, retry (có backoff và **jitter**, chỉ cho thao tác idempotent) xử lý lỗi thoáng qua, circuit breaker mở khi tỉ lệ lỗi vượt ngưỡng, từ chối nhanh rồi thử dò lại sau một thời gian. Timeout giảm dần từ ngoài vào trong.

**Ví dụ 1: bão retry (tính toán).** Gateway thử tối đa 3 lần gọi service A; A thử tối đa 3 lần gọi B; B thử 3 lần gọi DB:

```text
1 tang, thu toi da 3 lan -> 3x tai len tang trong cung
2 tang                   -> 9x
3 tang                   -> 27x
```

Khi DB hơi chậm, mỗi request người dùng có thể biến thành 27 truy vấn, đúng lúc DB yếu nhất, và nó **sập hẳn**. Quy tắc: chỉ retry ở **một tầng** (thường tầng gần người dùng nhất), các tầng trong để lỗi nổi lên.

**Ví dụ 2: circuit breaker (mô phỏng, ngưỡng 3 lỗi liên tiếp, nghỉ 5 đơn vị thời gian).**

```text
t0:OK(CLOSED) t1:ERR(CLOSED) t2:ERR(CLOSED) t3:ERR(OPEN) t4:FAST_FAIL(OPEN) t5:FAST_FAIL(OPEN)
t6:FAST_FAIL(OPEN) t7:FAST_FAIL(OPEN) t8:OK(CLOSED)
```

Sau 3 lỗi, breaker **mở**: từ t4 đến t7 call bị từ chối ngay (`FAST_FAIL`) mà không chạm dịch vụ hỏng, giúp nó có thời gian hồi phục và giúp người gọi không giữ thread. Hết thời gian nghỉ (t8), breaker cho thử một call (half-open); thành công thì đóng lại, thất bại thì mở tiếp.

**Ví dụ 3: jitter (đã mô phỏng).** 1000 client cùng lỗi lúc t=0 và cùng đợi 2 giây rồi retry:

```text
khong jitter -> dinh 1000 req/100ms      <- tất cả quay lại đúng cùng một thời điểm
full jitter  -> dinh 67 req/100ms        <- phân tán đều trong 2 giây
```

_Cả ba đã chạy mô phỏng bằng Python._

**Nhớ:** timeout, retry (backoff + jitter), circuit breaker và fallback bổ trợ nhau; timeout giảm dần từ ngoài vào trong.

**Hỏi xoáy 1:** Timeout ở mỗi tầng nên đặt thế nào?
**Vì sao hỏi tiếp:** Nhiều tầng cùng có timeout, nên hỏi các giá trị phải quan hệ với nhau thế nào.
**Đáp:** Tầng ngoài > tổng thời gian tầng trong cộng dự phòng. Ví dụ client 3 s, gateway 2,5 s, service 2 s, DB 1 s. Nếu tầng trong dài hơn tầng ngoài, tầng ngoài đã bỏ cuộc mà tầng trong vẫn tiếp tục làm việc vô ích.

**Hỏi xoáy 2:** Retry thao tác `POST` tạo đơn có an toàn không?
**Vì sao hỏi tiếp:** Retry chỉ an toàn với thao tác idempotent, nên hỏi trường hợp `POST` tạo đơn.
**Đáp:** Chỉ khi thao tác idempotent (câu 11). Không có lock idempotency thì retry có thể tạo hai đơn.

**Sai lầm hay gặp:** retry ở mọi tầng và không có jitter; hoặc đặt breaker mà không có hành vi dự phòng (fallback) nên người dùng chỉ thấy lỗi nhanh hơn.

### 15. Đội 5 người, hệ thống mới: bạn bắt đầu bằng monolith hay microservices và vì sao?

**Gợi ý suy luận:**
- Microservices đổi loại phức tạp nào lấy loại nào (gọi hàm và ACID lấy mạng và eventual consistency)?
- Chi phí đó chỉ đáng trả khi lợi ích nào lớn hơn (khái niệm: độc lập tổ chức, scale, triển khai)?
- Có cách nào giữ ranh giới rõ mà chưa phải trả chi phí mạng (khái niệm: modular monolith)?

**Lập luận:** microservices đổi **độ phức tạp trong process** (gọi hàm, transaction ACID) lấy **độ phức tạp giữa các process** (mạng, eventual consistency, vận hành). Nó chỉ có lợi khi bài toán tổ chức (nhiều đội cần độc lập) lớn hơn chi phí này. Vì vậy khi chưa có nhiều đội cần độc lập, monolith tổ chức tốt rẻ hơn, và tách service chỉ nên làm khi có lý do rõ. Điểm dễ nhầm là tách service theo lớp kỹ thuật hoặc theo bảng dữ liệu thay vì theo năng lực nghiệp vụ, tạo ra "monolith phân tán" gọi nhau liên tục và phải deploy cùng nhau. Dấu hiệu chưa nên tách: một đội, ít thay đổi độc lập, chưa có CI/CD, quan sát và đội vận hành. Hãy bắt đầu bằng modular monolith có ranh giới rõ, rồi tách dần phần thực sự cần scale hoặc triển khai riêng.

**Đáp án ngắn:** bắt đầu bằng monolith tổ chức tốt (modular monolith), tách khi có lý do rõ: nhiều đội, nhu cầu scale hoặc triển khai độc lập khác nhau. Mỗi service có dữ liệu riêng.

**Ví dụ (tính toán):** số đường giao tiếp tối đa giữa n dịch vụ là n(n-1)/2:

```text
n=3 : toi da 3 cap
n=10: toi da 45 cap
n=30: toi da 435 cap
```

Và latency cộng dồn: một request đi qua 6 call nối tiếp, mỗi call nhanh ở p50 (20 ms) nhưng p99 = 300 ms. Xác suất ít nhất một call rơi vào đuôi chậm: 1 − 0,99^6 ≈ **5,85%**, nghĩa là p99 của từng service trở thành "p94" của cả request. Gộp 6 call vào cùng một process loại bỏ cả hai chi phí. Dấu hiệu của **distributed monolith**: phải triển khai nhiều service cùng lúc mới ra được một tính năng; hai service dùng chung một DB; một service chết kéo cả hệ thống chết đồng bộ. Khi đó bạn trả đủ chi phí của microservices mà không nhận lợi ích nào. _Đã tính bằng Python._

**Nhớ:** microservices đổi độ phức tạp trong process lấy độ phức tạp giữa các process; bắt đầu bằng modular monolith, tách khi có lý do.

**Hỏi xoáy 1:** Ranh giới service nên cắt theo gì?
**Vì sao hỏi tiếp:** Khi đã quyết tách thì sai lầm lớn nhất là cắt sai, nên hỏi ranh giới cắt theo gì.
**Đáp:** Theo **bounded context** nghiệp vụ (nhóm thay đổi cùng nhau), không theo tầng kỹ thuật ("service DB", "service API"). Tiêu chí kiểm tra: một thay đổi nghiệp vụ thông thường chỉ nên chạm một service.

**Hỏi xoáy 2:** Làm sao tách dần từ monolith?
**Vì sao hỏi tiếp:** Hệ thống đang chạy là monolith thì cần cách tách an toàn từng bước.
**Đáp:** Mô hình strangler: tách module ít kết dính trước, đặt sau một giao diện, chuyển dữ liệu dần; trước đó tách module bên trong monolith (xem [Hexagonal, DDD và Modulith](/go?p=01-Spring-Boot%2Fhard%2Flt-24-hexagonal-ddd-modulith.md)).

**Sai lầm hay gặp:** tách theo số lượng bảng hay theo mong muốn công nghệ, rồi dùng chung database vì "tách dữ liệu khó".

### 16. Một vùng (AZ) của nhà cung cấp cloud chết, hệ thống của bạn có sống sót không và thiết kế thế nào để sống?

**Gợi ý suy luận:**
- Thành phần nối tiếp và parallel ảnh hưởng độ sẵn sàng tổng thế nào (khái niệm: tích xác suất, nhân bội)?
- Hai bản sao chung nguyên nhân lỗi thì dư thừa còn tác dụng không?
- Khôi phục cần mục tiêu nào về thời gian và về dữ liệu mất (khái niệm: RTO, RPO)?

**Lập luận:** độ sẵn sàng của hệ nhiều thành phần là **tích** các xác suất nếu nối tiếp (càng nhiều dependency càng giảm) và được **nhân bội** nếu parallel độc lập (dư thừa làm tăng). Dư thừa chỉ có tác dụng khi các bản sao **không chung nguyên nhân lỗi**. Do đó phải rải thành phần có trạng thái qua nhiều AZ độc lập, loại điểm lỗi duy nhất, đặt RTO và RPO rõ ràng và diễn tập thật. Điểm dễ nhầm là nghĩ có replica là có sẵn sàng cao: replica cùng AZ, cùng nguồn điện hoặc cùng cấu hình sai thì chết cùng lúc, và failover chưa từng diễn tập thường không chạy khi cần. Khi thiết kế, tính độ sẵn sàng theo chuỗi phụ thuộc (mỗi dependency nối tiếp nhân thêm xác suất lỗi), cho mỗi chức năng quan trọng có chế độ suy giảm (degraded mode), và định kỳ diễn tập failover để biết RTO và RPO thật.

**Đáp án ngắn:** nhiều AZ cho mọi thành phần có trạng thái, ứng dụng stateless, DB có replica và failover đã diễn tập, không điểm lỗi duy nhất, đặt RTO/RPO rõ ràng, kiểm thử bằng chaos engineering. Đa vùng tăng độ tin cậy nhưng tăng mạnh độ phức tạp và chi phí dữ liệu.

**Ví dụ (tính toán):**

```text
1 AZ, 99.9%                       -> downtime ~ 526 phút/năm
2 AZ độc lập (lý tưởng)           -> 99.9999%  ~ 0.53 phút/năm
5 dịch vụ nối tiếp, mỗi cái 99.9% -> 99.501%   ~ 2623 phút/năm (hơn 43 giờ)
```

Hai bài học từ con số. Thứ nhất, hai AZ độc lập tốt hơn rất nhiều, nhưng "độc lập" là giả định lý tưởng: nếu cả hai cùng phụ thuộc một DB chính, một dịch vụ DNS hay một bản triển khai lỗi, độ sẵn sàng thật thấp hơn nhiều. Thứ hai, **chuỗi phụ thuộc đồng bộ** làm tụt độ sẵn sàng: 5 dịch vụ 99,9% nối tiếp chỉ còn 99,5%. Cách chống: ngắt phụ thuộc không thiết yếu (fallback, async), giảm số bước đồng bộ. _Đã tính bằng Python._

**Nhớ:** dư thừa chỉ hiệu quả khi không chung nguyên nhân lỗi; RTO là thời gian khôi phục, RPO là dữ liệu chấp nhận mất.

**Hỏi xoáy 1:** RTO và RPO khác nhau thế nào, và chúng quyết định gì?
**Vì sao hỏi tiếp:** Thiết kế dư thừa cần mục tiêu đo được, nên hỏi RTO và RPO quyết định gì.
**Đáp:** RTO là thời gian chấp nhận được để **khôi phục dịch vụ**; RPO là lượng dữ liệu chấp nhận được **mất** (tính theo thời gian). RPO ≈ 0 đòi hỏi replication đồng bộ (tốn latency ghi), RPO vài giây cho phép replication async (có thể mất vài transaction cuối khi failover).

**Hỏi xoáy 2:** Failover tự động có luôn an toàn?
**Vì sao hỏi tiếp:** Tự động failover nghe an toàn nhưng có thể gây hại, nên hỏi nó có luôn an toàn không.
**Đáp:** Không: nếu replica được nâng làm primary khi primary cũ chỉ bị cô lập chứ chưa chết, sẽ có **hai primary** (split-brain) và dữ liệu phân kỳ. Cần cơ chế đồng thuận/fencing và diễn tập định kỳ, không chỉ cấu hình trên giấy.

**Sai lầm hay gặp:** có sơ đồ đa AZ nhưng chưa bao giờ diễn tập; ngày sự cố mới phát hiện cấu hình chuyển đổi sai hoặc dung lượng AZ còn lại không đủ gánh toàn bộ tải.

## Tổng kết cách trả lời ở mức senior

- Luôn đi từ **bản chất** (vì sao cơ chế tồn tại) tới **chứng cứ** (số liệu, log, dump), không dừng ở định nghĩa.
- Nói rõ **đánh đổi** bạn nhận khi chọn một hướng, và dấu hiệu cho thấy nên đổi hướng.
- Gắn với công cụ cụ thể (`jcmd`, `jstack`, `-Xlog:gc*`, MAT, `EXPLAIN`) và số đo, không chỉ lý thuyết.

Xem thêm: [Tình huống sự cố production](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-18-tinh-huong-su-co-production.md), [Concurrency cấp senior](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md), [Kafka chuyên sâu](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-21-kafka-chuyen-sau.md).

Nguồn: kiến thức tổng hợp từ ghi chú trong docs; ví dụ chạy thử trên OpenJDK 11 và Python 3 (SQLite) trong môi trường soạn bài.

