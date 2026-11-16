# Trắc nghiệm chuyên sâu: Java Concurrency & Multi-threading

## 1. Thread Safety, Volatile và Đồng bộ hóa

### Câu 1: Từ khóa `volatile` trên một biến trong Java đảm bảo tính chất nào và KHÔNG đảm bảo tính chất nào?
- [x] Đảm bảo tính hiển thị (Visibility - các luồng luôn đọc từ RAM chính) và ngăn chặn việc tái sắp xếp lệnh (Instruction Reordering); nhưng KHÔNG đảm bảo tính nguyên tử (Atomicity) cho các thao tác phức hợp như `count++`.
- [ ] Đảm bảo tính nguyên tử tuyệt đối cho mọi phép toán số học, nhưng không ngăn chặn được việc CPU tái sắp xếp lệnh.
- [ ] Tự động khóa đối tượng bằng cơ chế ReentrantLock để ngăn các luồng khác truy cập cùng lúc vào biến.
- [ ] Đảm bảo biến có thể được chia sẻ an toàn giữa các tiến trình hệ điều hành (Inter-Process Communication) khác nhau.

> **Giải thích:** Mỗi CPU core có L1/L2 Cache riêng. Biến thông thường khi luồng A sửa, giá trị nằm ở Cache L1 của Core 1, luồng B trên Core 2 đọc từ Cache của nó vẫn thấy giá trị cũ. Khai báo `volatile` tạo Memory Barrier (rào cản bộ nhớ): ép buộc ghi xả về RAM và vô hiệu hóa cache của core khác. Tuy nhiên, phép toán `count++` gồm 3 bước: Read -> Modify -> Write, nếu 2 luồng cùng làm vẫn bị race condition ghi đè (muốn nguyên tử phải dùng `AtomicInteger` hoặc `synchronized`).

### Câu 2: Trong Java, phương thức `wait()` và `notify()` thuộc về lớp nào và bắt buộc phải được gọi bên trong ngữ cảnh nào?
- [x] Thuộc về lớp `java.lang.Object`; và bắt buộc phải được gọi bên trong khối hoặc phương thức được đồng bộ hóa `synchronized` trên chính đối tượng đó.
- [ ] Thuộc về lớp `java.lang.Thread`; và có thể được gọi tự do từ bất kỳ phương thức tĩnh (static method) nào.
- [ ] Thuộc về interface `Runnable`; và chỉ được gọi bên trong phương thức `run()` của luồng con.
- [ ] Thuộc về interface `Lock`; và bắt buộc phải được gọi giữa hai câu lệnh `lock()` và `unlock()`.

> **Giải thích:** Trong Java, mỗi đối tượng đều sở hữu một khóa ẩn (Intrinsic Lock hay Monitor). `wait()` làm luồng hiện tại giải phóng Monitor Lock và rơi vào trạng thái WAITING cho đến khi một luồng khác gọi `notify()` trên cùng đối tượng đó. Do phải thao tác trực tiếp với Monitor Lock của đối tượng, chúng bắt buộc phải nằm trong khối `synchronized(obj)`.

### Câu 3: Thuật toán CAS (Compare-And-Swap) được sử dụng trong các lớp `AtomicInteger`, `AtomicReference` hoạt động theo nguyên lý nào?
- [x] So sánh giá trị hiện tại trong ô nhớ với giá trị kỳ vọng; nếu bằng nhau thì cập nhật giá trị mới, nếu không bằng thì thao tác thất bại và luồng chủ động lặp lại (Spin-lock/Retry) mà không bị block luồng OS.
- [ ] Chiếm giữ khóa độc quyền trên toàn bộ bảng bộ nhớ Heap của JVM cho đến khi phép cập nhật hoàn tất.
- [ ] Tạm dừng tất cả các luồng khác trong JVM bằng cơ chế Safepoint trước khi ghi dữ liệu mới.
- [ ] Sử dụng khóa hai giai đoạn (Two-Phase Locking) kết hợp với hàng đợi ưu tiên của hệ điều hành.

> **Giải thích:** CAS là chỉ thị phần cứng cấp độ CPU (như `cmpxchg` trên x86). Đây là kỹ thuật Khóa phi chặn (Non-blocking / Lock-free): Thay vì đưa luồng vào trạng thái ngủ (Sleep/Blocked) tốn kém chi phí context switch của OS, luồng chỉ việc lặp lại vòng xoay (Spin) thử lại cho đến khi thành công. Rất nhanh khi mức độ tranh chấp thấp.

### Câu 4: Trong `ThreadPoolExecutor` của Java, khi số lượng tác vụ (tasks) gửi đến tăng dần, thứ tự tiếp nhận và xử lý chuẩn xác là gì?
- [x] 1) Tạo luồng cho đến `corePoolSize` -> 2) Đẩy task vào `workQueue` (BlockingQueue) -> 3) Tạo thêm luồng mới đến `maximumPoolSize` khi queue đầy -> 4) Kích hoạt `RejectedExecutionHandler` khi vượt quá `maximumPoolSize`.
- [ ] 1) Tạo luồng cho đến `maximumPoolSize` -> 2) Đẩy task vào `workQueue` -> 3) Kích hoạt `RejectedExecutionHandler` khi cả pool và queue đều đầy.
- [ ] 1) Đẩy toàn bộ task vào `workQueue` trước -> 2) Khi queue đầy mới tạo luồng `corePoolSize` -> 3) Mở rộng tới `maximumPoolSize`.
- [ ] 1) Tạo luồng cho đến `corePoolSize` -> 2) Mở rộng tới `maximumPoolSize` -> 3) Đẩy các task còn lại vào `workQueue`.

> **Giải thích:** Quy trình vận hành cốt lõi của `ThreadPoolExecutor`: Trước tiên ưu tiên chạy bằng `corePoolSize` luồng cốt lõi. Khi các luồng cốt lõi đều bận, các task mới được xếp hàng vào `BlockingQueue` để chờ. Chỉ khi Queue đã đầy cứng (ví dụ `ArrayBlockingQueue` hết sức chứa), Pool mới bắt đầu mở rộng tạo thêm luồng tạm thời lên tới `maximumPoolSize`. Nếu vẫn quá tải, kích hoạt handler từ chối (mặc định ném `RejectedExecutionException`).

### Câu 5: Hiện tượng Deadlock (Khóa chết) trong ứng dụng đa luồng Java xảy ra khi nào và biện pháp phòng ngừa chuẩn mực trong thiết kế mã nguồn là gì?
- [x] Xảy ra khi hai hoặc nhiều luồng cùng chờ đợi tài nguyên mà luồng kia đang chiếm giữ tạo thành vòng tròn chờ đợi (Circular Wait); phòng ngừa bằng cách tuân thủ thứ tự chiếm khóa cố định (Lock Ordering) nhất quán.
- [ ] Xảy ra khi số lượng luồng đang chạy vượt quá số lượng CPU Cores thực tế của máy chủ; phòng ngừa bằng cách giới hạn `maximumPoolSize`.
- [ ] Xảy ra khi một luồng chiếm giữ khóa quá 30 giây mà không giải phóng; phòng ngừa bằng cách sử dụng `Thread.sleep()`.
- [ ] Xảy ra khi hai luồng cùng đọc đồng thời một biến không được khai báo `volatile`; phòng ngừa bằng cách chuyển sang `AtomicReference`.

> **Giải thích:** 4 điều kiện cần để xảy ra Deadlock: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Bằng cách phá vỡ điều kiện "Chờ đợi vòng tròn" (Circular Wait) thông qua việc luôn chiếm khóa theo cùng một thứ tự: Luồng A muốn khóa tài nguyên 1 và 2 thì luôn khóa 1 trước 2 sau; Luồng B muốn tài nguyên 1 và 2 cũng PHẢI khóa 1 trước 2 sau (không bao giờ được khóa 2 trước 1 sau). Như vậy không bao giờ có thể hình thành vòng lặp Deadlock.

### Câu 6: Điểm khác biệt cốt lõi giữa `CountDownLatch` và `CyclicBarrier` trong `java.util.concurrent` là gì?
- [x] `CountDownLatch` chỉ đếm ngược một lần duy nhất từ N về 0 và không thể tái sử dụng; còn `CyclicBarrier` cho phép một nhóm N luồng cùng chờ nhau tại điểm hẹn và có thể tự động reset để tái sử dụng nhiều lần lặp lại.
- [ ] `CountDownLatch` chỉ dùng để đồng bộ hóa giữa 2 luồng, còn `CyclicBarrier` dùng cho từ 3 luồng trở lên.
- [ ] `CountDownLatch` thực thi bất đồng bộ trên luồng riêng, còn `CyclicBarrier` bắt buộc phải chạy trên luồng chính của ứng dụng.
- [ ] `CountDownLatch` yêu cầu tất cả các luồng phải có cùng độ ưu tiên (Priority), còn `CyclicBarrier` không yêu cầu độ ưu tiên.

> **Giải thích:** 
- `CountDownLatch`: Luồng chính gọi `latch.await()` chờ N luồng con chạy xong và gọi `latch.countDown()`. Đếm xong về 0 là vứt đi, không thể tăng lại.
- `CyclicBarrier(N)`: Thích hợp cho bài toán chia giai đoạn (Phased computation): 4 luồng cùng tính toán, ai xong trước thì gọi `barrier.await()` đứng chờ; khi cả 4 luồng cùng tới điểm hẹn thì rào cản mở ra cho cả 4 cùng đi tiếp sang vòng lặp tiếp theo (Barrier tự reset).

### Câu 7: Lớp `Semaphore` trong thư viện `java.util.concurrent` thường được áp dụng cho bài toán thực tế nào?
- [x] Giới hạn số lượng luồng tối đa được phép truy cập đồng thời vào một tài nguyên hoặc dịch vụ bị giới hạn (như Connection Pool, Rate Limiting, giới hạn số luồng gọi API đối tác).
- [ ] Đo lường chính xác thời gian thực thi của từng phương thức phục vụ mục đích giám sát hiệu năng APM.
- [ ] Tự động chuyển đổi các phương thức đồng bộ của một class thành các phương thức bất đồng bộ.
- [ ] Sắp xếp thứ tự ưu tiên thực thi của các luồng dựa trên mức độ quan trọng của nghiệp vụ.

> **Giải thích:** `Semaphore(permits)` duy trì một tập hợp các giấy phép (permits): Luồng muốn vào tài nguyên gọi `semaphore.acquire()` (nếu còn giấy phép thì lấy 1 cái và chạy tiếp, nếu hết giấy phép thì bị chặn chờ). Khi làm xong, luồng gọi `semaphore.release()` để trả lại giấy phép cho luồng khác. Cực kỳ lý tưởng để triển khai Rate Limiting, Connection Pool, hoặc bãi đỗ xe ảo.

### Câu 8: Điểm khác biệt quan trọng giữa interface `Callable<V>` và `Runnable` trong Java là gì?
- [x] `Callable` có phương thức `call()` trả về một giá trị kết quả kiểu V và có thể ném ra Checked Exception; còn `Runnable` có phương thức `run()` trả về `void` và không thể ném ra Checked Exception.
- [ ] `Callable` chỉ chạy được trên môi trường Server-Side, còn `Runnable` chỉ chạy được trên môi trường Client.
- [ ] `Callable` bắt buộc phải được thực thi tuần tự, còn `Runnable` luôn luôn thực thi song song đa luồng.
- [ ] `Callable` không thể gửi vào `ExecutorService` để quản lý luồng, trong khi `Runnable` thì có thể.

> **Giải thích:** `Runnable` (có từ Java 1.0) chỉ phù hợp cho tác vụ "chạy rồi thôi", không biết kết quả thành công hay thất bại. `Callable<V>` (từ Java 5) khi gửi vào `ExecutorService.submit(callable)` sẽ trả về một đối tượng `Future<V>`, cho phép luồng chính gọi `future.get()` để lấy kết quả tính toán hoặc bắt các ngoại lệ xảy ra trong luồng con.

### Câu 9: Trong cấu trúc dữ liệu `ConcurrentHashMap` của Java 8+, cơ chế đồng bộ hóa đã được nâng cấp như thế nào so với việc dùng Khóa phân đoạn (Segment Locks) của Java 7?
- [x] Loại bỏ Segment Locks; sử dụng kết hợp giữa chỉ thị nguyên tử CAS (khi chèn phần tử đầu tiên vào Bucket rỗng) và khóa cục bộ `synchronized` trên chính Node đầu tiên của Bucket; thao tác đọc hoàn toàn không dùng khóa (Lock-free).
- [ ] Khóa toàn bộ bảng băm bằng một con trỏ khóa duy nhất ReentrantLock ở mỗi thao tác đọc và ghi.
- [ ] Sử dụng thuật toán đồng bộ hai pha (Two-Phase Commit) trên từng node để đảm bảo tính nhất quán dữ liệu.
- [ ] Chuyển toàn bộ dữ liệu bảng băm sang lưu trữ trên các mảng tĩnh bất biến (Immutable Arrays).

> **Giải thích:** Java 7 chia bảng thành 16 Segments (chỉ cho phép tối đa 16 luồng ghi đồng thời). Java 8 nâng cấp vượt bậc: Nếu bucket rỗng, chèn bằng CAS không cần khóa (Lock-free O(1)). Nếu bucket đã có phần tử, chỉ khóa `synchronized(firstNode)` của riêng bucket đó! Các luồng ghi vào các bucket khác vẫn diễn ra hoàn toàn song song không hề bị ảnh hưởng. Thao tác ĐỌC (`get`) hoàn toàn không dùng khóa (Lock-free) nhờ từ khóa `volatile` trên các node.

### Câu 10: Vấn đề "False Sharing" (Chia sẻ giả mạo) trong lập trình đa luồng hiệu năng cao phát sinh do nguyên nhân nào?
- [x] Hai biến độc lập được hai luồng trên hai CPU Core khác nhau sử dụng nhưng lại vô tình nằm chung trên cùng một dòng nhớ đệm (Cache Line - 64 byte); thao tác ghi của luồng này làm mất hiệu lực Cache Line của luồng kia.
- [ ] Hai luồng cùng chia sẻ chung một kết nối cơ sở dữ liệu dẫn tới việc tranh chấp gói tin mạng TCP.
- [ ] Hai tiến trình khác nhau trên hệ điều hành cùng đọc ghi đồng thời vào một tệp tin trên đĩa cứng.
- [ ] Bộ nhớ RAM của máy chủ bị phân mảnh khiến hệ điều hành không thể cấp phát các ô nhớ liên tục.

> **Giải thích:** CPU không nạp từng byte riêng lẻ từ RAM mà nạp theo khối Cache Line 64 byte. Nếu biến `x` của Core 1 và biến `y` của Core 2 nằm cạnh nhau trong 64 byte đó: Khi Core 1 sửa `x`, giao thức MESI buộc Core 2 phải hủy dòng cache chứa `y` và nạp lại từ RAM, dù Core 2 không hề đụng vào `x`! Khắc phục: Dùng kỹ thuật đệm ô nhớ (Padding) hoặc annotation `@Contended` của Java 8 để tách các biến ra các dòng Cache Line khác nhau (như trong `LongAdder` và Disruptor).

### Câu 11: Hiện tượng "ABA Problem" trong thuật toán CAS (Compare-And-Swap) là gì và lớp nào trong Java được dùng để giải quyết?
- [x] Xảy ra khi một biến đổi từ A sang B rồi đổi ngược lại về A; CAS kiểm tra thấy giá trị vẫn là A nên tưởng rằng biến chưa từng bị sửa đổi; giải quyết bằng `AtomicStampedReference` (kèm theo số hiệu phiên bản/con dấu).
- [ ] Xảy ra khi hai luồng có cùng tên định danh truy cập đồng thời vào một biến nguyên tử; giải quyết bằng `ThreadLocal`.
- [ ] Xảy ra khi một phương thức đệ quy gọi lặp đi lặp lại 3 lần mà không giải phóng ngăn xếp; giải quyết bằng `AtomicInteger`.
- [ ] Xảy ra khi một giá trị số nguyên vượt quá phạm vi lưu trữ tối đa của kiểu `long`; giải quyết bằng `BigInteger`.

> **Giải thích:** Hãy tưởng tượng bạn có 1 chiếc vali tiền (A). Kẻ trộm lấy vali đi, tiêu hết tiền, rồi để lại 1 chiếc vali rỗng cùng loại (A). Bạn quay lại thấy vali A thì tưởng tiền vẫn còn nguyên! Trong cấu trúc dữ liệu Lock-free Stack/Queue, vấn đề ABA có thể dẫn tới việc giải phóng ô nhớ nhầm gây hỏng toàn bộ liên kết. `AtomicStampedReference` lưu cặp `(Reference, Stamp)`: mỗi lần sửa thì stamp tăng lên 1 (`A:1 -> B:2 -> A:3`), giúp CAS phát hiện ngay việc dữ liệu đã bị biến đổi.

### Câu 12: Điểm khác biệt căn bản giữa `LongAdder` và `AtomicLong` trong môi trường có mức độ tranh chấp đa luồng cực cao (High Contention) là gì?
- [x] `AtomicLong` ép tất cả các luồng cùng tranh chấp CAS trên một ô nhớ duy nhất (gây lãng phí CPU do spin-lock thất bại); còn `LongAdder` phân tán việc cộng dồn trên một mảng các ô nhớ (Cells array) độc lập và chỉ tổng hợp khi gọi `sum()`.
- [ ] `AtomicLong` có độ chính xác cao hơn `LongAdder` do không sử dụng cơ chế làm tròn số thực.
- [ ] `AtomicLong` hỗ trợ các phép toán trên số nguyên âm, trong khi `LongAdder` chỉ hỗ trợ số nguyên dương.
- [ ] `AtomicLong` sử dụng khóa độc quyền của hệ điều hành, trong khi `LongAdder` hoàn toàn không sử dụng CPU.

> **Giải thích:** Khi có hàng trăm luồng cùng gọi `increment()`: Với `AtomicLong`, chỉ 1 luồng CAS thành công, 99 luồng còn lại thất bại và xoay vòng (Spin) làm nóng rực CPU. `LongAdder` (Java 8) áp dụng triết lý "Chia để trị": Nó tạo mảng `Cell[]`, mỗi luồng cộng vào cell riêng của nó bằng mã băm luồng (Thread hash). Khi gọi `sum()`, nó chỉ việc cộng các cell lại, triệt tiêu hoàn toàn sự tranh chấp tại các điểm nóng.

### Câu 13: Khi nào nên ưu tiên sử dụng `CopyOnWriteArrayList` thay vì `Collections.synchronizedList()` hoặc `ArrayList`?
- [x] Khi ứng dụng có tần suất ĐỌC ÁP ĐẢO (Read-heavy) và rất hiếm khi GHI; cho phép duyệt danh sách (Iterate) an toàn đa luồng mà không cần khóa và không bao giờ gặp lỗi `ConcurrentModificationException`.
- [ ] Khi ứng dụng cần thực hiện hàng nghìn thao tác chèn và xóa phần tử liên tục mỗi giây.
- [ ] Khi danh sách chứa hàng triệu phần tử có kích thước dữ liệu lớn nhằm tiết kiệm bộ nhớ Heap.
- [ ] Khi cần đảm bảo các thao tác ghi dữ liệu được hoàn tất với độ trễ thấp nhất có thể.

> **Giải thích:** `CopyOnWriteArrayList` hoạt động đúng như tên gọi: Mỗi khi có thao tác GHI (`add`, `set`, `remove`), nó tạo một bản sao mới tinh của toàn bộ mảng, sửa trên bản sao rồi tráo con trỏ sang mảng mới. Do đó thao tác ghi rất tốn kém (O(n) copy mảng). Bù lại: Mọi thao tác ĐỌC (`get`, duyệt vòng lặp `for`) diễn ra trên bản chụp mảng hiện tại với tốc độ O(1) thuần túy không cần bất kỳ ổ khóa nào, cực kỳ an toàn cho danh sách Event Listeners.

### Câu 14: Điểm vượt trội của `CompletableFuture` trong Java 8 so với `Future` truyền thống của Java 5 là gì?
- [x] Hỗ trợ lập trình bất đồng bộ phi chặn (Non-blocking), cho phép nối chuỗi (Chaining) và kết hợp nhiều tác vụ (`thenApply`, `thenCompose`, `thenCombine`) và xử lý ngoại lệ mượt mà mà không làm nghẽn luồng bằng lệnh `.get()`.
- [ ] Tự động chuyển đổi các tác vụ nặng sang chạy trực tiếp trên card đồ họa GPU thay vì CPU.
- [ ] Cho phép hủy bỏ một tác vụ đang chạy mà không làm gián đoạn trạng thái của luồng worker.
- [ ] Đảm bảo tất cả các tác vụ bất đồng bộ luôn được thực thi theo thứ tự FIFO nghiêm ngặt.

> **Giải thích:** Với `Future`, muốn lấy kết quả bạn phải gọi `future.get()` (lệnh này chặn đứng / block luồng hiện tại cho đến khi có kết quả). Với `CompletableFuture`, bạn có thể viết luồng xử lý phi chặn (Non-blocking): `fetchUser().thenCompose(user -> fetchOrders(user)).thenAccept(orders -> renderUI(orders)).exceptionally(e -> handleErr(e))`, xây dựng các pipeline xử lý bất đồng bộ phức tạp cực kỳ thanh lịch.

### Câu 15: Trong Java, khi một luồng đang ở trạng thái ngủ `Thread.sleep()` hoặc chờ `wait()`, nếu luồng khác gọi `interrupt()` trên nó thì hành vi diễn ra là gì?
- [x] Luồng đang ngủ sẽ ngay lập tức bị đánh thức, cờ ngắt (Interrupted status) được xóa về `false`, và JVM sẽ ném ra ngoại lệ `InterruptedException`.
- [ ] Luồng đó sẽ bị hệ điều hành tiêu diệt (kill) cưỡng bức ngay lập tức và giải phóng toàn bộ tài nguyên.
- [ ] Luồng vẫn tiếp tục ngủ đủ thời gian đã định và chỉ xử lý tín hiệu ngắt sau khi đã thức dậy.
- [ ] JVM sẽ tự động khởi động lại toàn bộ tiến trình ứng dụng để tránh lỗi bế tắc luồng.

> **Giải thích:** Cơ chế Interruption trong Java là cơ chế Hợp tác (Cooperative): Gọi `t.interrupt()` không giết chết luồng mà chỉ gửi một tín hiệu (đặt cờ ngắt thành true). Nếu luồng đang bị chặn bởi các phương thức nhạy cảm với ngắt (`sleep`, `wait`, `join`), nó sẽ đón nhận bằng cách ném `InterruptedException`. Lập trình viên bắt buộc phải xử lý ngoại lệ này đúng đắn: hoặc ném tiếp ra ngoài, hoặc khôi phục lại cờ ngắt bằng `Thread.currentThread().interrupt()`.

### Câu 16: Trạng thái luồng nào sau đây trong Java đại diện cho việc một luồng đang chờ để giành được Khóa ẩn (Monitor Lock / `synchronized`)?
- [x] `BLOCKED`
- [ ] `WAITING`
- [ ] `TIMED_WAITING`
- [ ] `RUNNABLE`

> **Giải thích:** Phân biệt rõ các trạng thái của luồng trong Java:
- `BLOCKED`: Luồng sẵn sàng chạy nhưng đang đứng chờ để vào khối `synchronized` do một luồng khác đang chiếm giữ khóa Monitor.
- `WAITING`: Luồng chủ động gọi `wait()`, `join()`, hoặc `LockSupport.park()` để chờ một luồng khác đánh thức.
- `TIMED_WAITING`: Luồng chờ có thời hạn (`Thread.sleep(1000)`, `wait(1000)`).
- `RUNNABLE`: Luồng đang thực thi trong JVM (có thể đang dùng CPU hoặc chờ hệ điều hành cấp phát time-slice).

### Câu 17: Thuật toán "Work-Stealing" (Đánh cắp công việc) trong `ForkJoinPool` hoạt động theo cơ chế nào?
- [x] Mỗi worker thread có một hàng đợi hai đầu (Deque) riêng; khi một worker đã hoàn thành hết nhiệm vụ của mình, nó sẽ chủ động lấy bớt nhiệm vụ từ đuôi hàng đợi của một worker khác đang bận rộn để xử lý.
- [ ] Luồng quản lý trung tâm sẽ cưỡng bức thu hồi các tác vụ chưa hoàn thành từ các worker chạy chậm để giao cho worker chạy nhanh.
- [ ] Các worker thread sẽ cạnh tranh chiếm đoạt tài nguyên bộ nhớ đệm CPU của nhau để tăng tốc độ tính toán.
- [ ] Tác vụ sẽ tự động được chia nhỏ và gửi sang các máy chủ khác trong cùng mạng nội bộ.

> **Giải thích:** `ForkJoinPool` (nền tảng của Java Parallel Streams) được thiết kế cho các bài toán Chia để trị (Fork and Join): Chia nhỏ bài toán thành các bài toán con đệ quy. Thuật toán Work-Stealing giải quyết bài toán mất cân bằng tải (Load Imbalance): Luồng làm việc với hàng đợi của nó theo kiểu LIFO (đẩy vào và lấy ra ở đầu `head`), nhưng khi rảnh rỗi nó sẽ sang hàng đợi của luồng khác lấy trộm ở đuôi `tail` (FIFO), giảm thiểu tối đa xung đột khóa giữa các worker.

### Câu 18: Lớp `StampedLock` trong Java 8 mang lại cải tiến vượt trội nào so với `ReentrantReadWriteLock`?
- [x] Bổ sung chế độ Đọc lạc quan (Optimistic Read qua `tryOptimisticRead()`): Luồng đọc lấy con dấu stamp và đọc dữ liệu mà không cần chiếm khóa; giúp loại bỏ hoàn toàn hiện tượng đói khóa ghi (Write Starvation).
- [ ] Cho phép nhiều luồng ghi cùng ghi đồng thời vào một biến chia sẻ mà không gây ra xung đột dữ liệu.
- [ ] Tự động chuyển đổi các thao tác đọc ghi sang lưu trữ trực tiếp trên bộ nhớ đệm đĩa cứng.
- [ ] Hỗ trợ tính năng tái nhập khóa (Reentrancy) vô hạn lần mà không tiêu tốn bộ nhớ ngăn xếp.

> **Giải thích:** Trong `ReentrantReadWriteLock`: Nếu có liên tục các luồng đọc (Read Lock), luồng ghi (Write Lock) sẽ bị bỏ đói (Starvation) mãi mãi không thể vào được. Với `StampedLock.tryOptimisticRead()`: Luồng đọc không hề khóa, cho phép luồng ghi thoải mái vào ghi. Nếu luồng ghi vào, `validate()` trả về false, lúc này luồng đọc mới chủ động nâng cấp lên Khóa đọc bi quan (Pessimistic Read Lock) truyền thống.

### Câu 19: Khái niệm "Happens-Before Relationship" trong Java Memory Model (JMM) định nghĩa điều gì?
- [x] Đảm bảo rằng các thao tác cập nhật bộ nhớ của Hành động A được hiển thị (Visible) một cách chắc chắn cho Hành động B, và thứ tự của A luôn đi trước B trong góc nhìn của các luồng khác.
- [ ] Quy định rằng tất cả các luồng con phải hoàn tất trước khi luồng chính của ứng dụng kết thúc.
- [ ] Bắt buộc các câu lệnh truy vấn cơ sở dữ liệu phải được thực thi trước khi ghi log ra màn hình console.
- [ ] Đảm bảo rằng việc cấp phát vùng nhớ Heap luôn diễn ra trước khi nạp mã bytecode của Class.

> **Giải thích:** Trình biên dịch JIT và CPU thường xuyên tái sắp xếp thứ tự lệnh (Instruction Reordering) để tối ưu hiệu năng phần cứng. Quy tắc Happens-Before là bảo chứng thép của JMM:
- Thao tác mở khóa (Unlock) trên Monitor happens-before mọi thao tác khóa (Lock) tiếp theo trên cùng Monitor đó.
- Ghi vào biến `volatile` happens-before mọi thao tác đọc tiếp theo từ biến `volatile` đó.
- `thread.start()` happens-before mọi hành động bên trong luồng con đó.

### Câu 20: Trong mẫu thiết kế "Double-Checked Locking" khi khởi tạo Singleton an toàn đa luồng, từ khóa nào là BẮT BUỘC phải có trên biến instance và vì sao?
- [x] Bắt buộc phải có từ khóa `volatile` để ngăn chặn việc CPU và JIT Compiler tái sắp xếp chỉ thị (Instruction Reordering) trong quá trình cấp phát và khởi tạo đối tượng.
- [ ] Bắt buộc phải có từ khóa `transient` để tránh việc đối tượng Singleton bị sao chép khi gửi qua mạng.
- [ ] Bắt buộc phải có từ khóa `final` để đảm bảo địa chỉ vùng nhớ của đối tượng không bị thay đổi sau khi tạo.
- [ ] Bắt buộc phải có từ khóa `native` để ủy quyền việc cấp phát vùng nhớ cho hệ điều hành máy chủ.

> **Giải thích:** Lệnh `instance = new Singleton()` trong bytecode thực chất gồm 3 bước: 1) Cấp phát vùng nhớ; 2) Gọi constructor khởi tạo object; 3) Trỏ biến `instance` vào vùng nhớ. Do tối ưu hóa CPU, bước 3 có thể bị đảo lên trước bước 2 (biến đã có địa chỉ nhưng object bên trong chưa khởi tạo xong). Nếu không có `volatile`, luồng B kiểm tra `if (instance == null)` thấy khác null sẽ lập tức lấy object "nửa mùa" chưa khởi tạo xong ra dùng, dẫn tới lỗi hỏng dữ liệu hoặc NullPointerException nghiêm trọng!
