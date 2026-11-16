# Câu hỏi: Concurrency thực chiến

Kiến thức gốc: [Java Concurrency](/go?p=08-Java%2FJava-Concurrency%2Findex.md) và [Lộ trình học](/go?p=08-Java%2FJava-Concurrency%2Flo-trinh.md). Câu hỏi nền tảng xem [Concurrency nền tảng](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-13-concurrency-nen-tang.md); phần `ConcurrentHashMap`, `HashMap`, Stream xem [Collections, Đồng thời và Java hiện đại](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-03-collections-concurrency.md).

**Cách đọc:** mỗi câu đi theo chuỗi **Câu hỏi** (tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới kiến thức nền), **Lập luận** (chuỗi nhân quả tới đáp án), **Đáp án ngắn** (để nói thành tiếng), **Ví dụ** chạy được kèm output thật, **Hỏi xoáy** (kèm lý do vì sao đó là bước tiếp theo) và **Nhớ** (kiến thức cốt lõi). Hãy tự trả lời phần Gợi ý trước khi đọc tiếp. Mọi ví dụ gắn nhãn _Đã chạy thử trên JDK 11_ chạy trong môi trường 2 nhân CPU; con số thời gian và lỗi concurrency **đổi mỗi lần chạy**, chỉ xu hướng là ổn định.

**Tóm tắt:**

- Phạm vi file: concurrency thực chiến, thiên về cách cấu hình và vận hành thread pool và các công cụ `java.util.concurrent`.
- Thread pool xếp hàng trước, chỉ nở tới `max` khi queue đầy; `newFixedThreadPool` (queue vô hạn) làm cạn RAM, `newCachedThreadPool` tạo thread vô hạn, nên tự dựng pool với queue có giới hạn và chính sách từ chối rõ.
- Kích thước pool theo loại tác vụ: CPU-bound xấp xỉ số nhân, I/O-bound nhiều hơn theo tỷ lệ chờ trên tính, và bị giới hạn bởi pool kết nối DB phía sau.
- Hủy tác vụ là hợp tác qua interrupt; không nuốt `InterruptedException` (ném lại hoặc đặt lại cờ); graceful shutdown gồm `shutdown`, `awaitTermination`, rồi `shutdownNow`.
- Deadlock phá bằng thứ tự lock cố định, `tryLock` có timeout; producer-consumer dùng `BlockingQueue` có giới hạn tạo backpressure tự nhiên; `CountDownLatch`, `Semaphore`, `CyclicBarrier` đếm theo ba cách khác nhau.
- `CompletableFuture` mặc định dùng `commonPool` ít thread nên tác vụ chặn cần executor riêng; `ReentrantLock` hơn `synchronized` ở timeout và ngắt được; virtual thread giúp tác vụ I/O, không giúp CPU.
- Hay bị hỏi xoáy nhất: 7 tác vụ vào pool `core=2, max=4, queue=2` thì tác vụ nào bị từ chối, vì sao `cancel(true)` chưa chắc dừng tác vụ, và `ReadWriteLock` nâng cấp lock đọc lên ghi bị treo.

## 1. Thread pool gồm những tham số nào? Thread mới được tạo khi nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn cấu hình pool `core=2, max=4`, queue 2 chỗ, rồi đổ 7 tác vụ chậm vào. Pool có tạo đủ 4 thread ngay khi tác vụ thứ 3 đến không? Tác vụ nào bị từ chối, và vì sao?

**Gợi ý suy luận:**

- Tạo thread đắt hay rẻ, và pool sinh ra để giữ cái gì (tái sử dụng, giới hạn tài nguyên)?
- Queue là chỗ đệm: khi thread core đã bận, tác vụ mới nên chờ hay nên khiến pool nở thêm thread?
- Nếu queue không bao giờ đầy thì điều kiện để vượt `core` có xảy ra không?

**Lập luận:** Pool muốn giới hạn tài nguyên và tái sử dụng thread, nên nó chưa vội tạo thread mới. Vì vậy thứ tự là: còn thread core thì tạo thread core, core đủ thì **xếp hàng**, và chỉ khi queue **đầy** mới tạo thêm thread tới `max`. Mà việc mở rộng chỉ xảy ra khi queue đầy, nên kích thước và loại queue quyết định pool hành xử ra sao. Hết `max` và hết chỗ xếp hàng thì phải có chính sách từ chối. Điểm dễ nhầm là tin pool tạo thêm thread ngay khi có việc đến, trong khi nó xếp hàng trước và chỉ nở tới `max` khi queue đầy; vì vậy với queue vô hạn thì `max` không bao giờ được dùng, còn với `SynchronousQueue` thì nở thread ngay. Khi cấu hình, đọc ba tham số `core`, `max`, queue như một bộ ba: chọn loại và kích thước queue trước, vì chính nó quyết định pool có bao giờ vượt `core` hay không.

**Đáp án ngắn:** `ThreadPoolExecutor(core, max, keepAlive, unit, queue, threadFactory, rejectedHandler)`: tạo thread core trước, rồi xếp hàng, queue đầy mới nở tới `max`, vượt nữa thì từ chối. Thread vượt core bị thu hồi sau `keepAlive` khi rảnh.

**Ví dụ:** `core=2, max=4`, queue 2 chỗ, nộp 7 tác vụ (mỗi tác vụ ngủ 1 giây) và in trạng thái ngay sau mỗi lần nộp.

```java
new ThreadPoolExecutor(2, 4, 60, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(2), new ThreadPoolExecutor.AbortPolicy());
```

```text
tac vu 1: nhan  | luong=1, hang doi=0
tac vu 2: nhan  | luong=2, hang doi=0
tac vu 3: nhan  | luong=2, hang doi=1
tac vu 4: nhan  | luong=2, hang doi=2
tac vu 5: nhan  | luong=3, hang doi=2
tac vu 6: nhan  | luong=4, hang doi=2
tac vu 7: TU CHOI (AbortPolicy) | luong=4, hang doi=2
```

_Đã chạy thử trên JDK 11._ Đọc theo thứ tự: 1-2 vào thread core; **3-4 vào queue chứ chưa tạo thread mới**; chỉ khi hàng đầy (5, 6) mới nở ra 3 và 4 thread; tác vụ 7 hết chỗ nên bị từ chối. Tức là với `max` lớn mà queue rất lớn, `max` gần như không bao giờ được dùng.

**Hỏi xoáy 1: Vì sao queue không giới hạn làm `max` vô nghĩa?**
Vì sao hỏi tiếp: Ví dụ trên cho thấy `max` chỉ dùng khi queue đầy, nên câu tự nhiên tiếp theo là: nếu queue không bao giờ đầy thì `max` còn ý nghĩa gì?

**Đáp:** `LinkedBlockingQueue` không bao giờ "đầy", nên điều kiện "queue đầy" không bao giờ xảy ra và pool không bao giờ vượt `core`. `newFixedThreadPool` rơi đúng vào trường hợp này (câu 2).

**Hỏi xoáy 2: Muốn pool nở thread trước khi xếp hàng thì sao?**
Vì sao hỏi tiếp: Đã hiểu pool xếp hàng trước rồi mới nở, bước tiếp theo là hỏi ngược: có cách nào làm pool nở thread trước khi xếp hàng không?

**Đáp:** Dùng `SynchronousQueue` (như `newCachedThreadPool`) hoặc queue tự viết `offer` trả `false` khi còn chỗ tăng thread (cách Tomcat làm với `TaskQueue`). Hiếm khi cần ngoài server.

**Sai lầm hay gặp:** Đặt `core=1, max=100` với queue không giới hạn và tin rằng có tới 100 thread. Thực tế chỉ có 1.

**Nhớ:** Pool ưu tiên xếp hàng hơn tạo thread; `max` chỉ có tác dụng khi queue có giới hạn và đã đầy.

## 2. Vì sao không nên dùng `Executors.newFixedThreadPool` hay `newCachedThreadPool` trong production?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Một dịch vụ dùng `Executors.newFixedThreadPool` chạy ổn mấy tháng, rồi một đợt tải cao làm RAM phình và JVM chết với `OutOfMemoryError`. Dịch vụ khác dùng `newCachedThreadPool` thì chết vì quá nhiều thread. Điều gì chung ở hai trường hợp, và sửa thế nào?

**Gợi ý suy luận:**

- Ở câu 1, queue không giới hạn thì điều kiện "đầy" có xảy ra không? Tác vụ chờ nằm ở đâu (memory)?
- Mỗi thread của OS tốn gì (stack), và số lượng thread lớn gây hại gì?
- Khi tác vụ đến nhanh hơn xử lý, ai phải chịu "áp lực": pool, hay nguồn gửi (backpressure)?

**Lập luận:** `newFixedThreadPool` giới hạn số thread nhưng queue vô hạn, nên tác vụ đến nhanh hơn xử lý sẽ dồn vào RAM mà không có cảnh báo, cuối cùng OOM. `newCachedThreadPool` thì ngược lại: số thread không giới hạn, tải đột biến tạo hàng nghìn thread thật của OS, mỗi thread một stack, nên cạn tài nguyên. Cả hai đều thiếu giới hạn ở một chiều. Hệ thống an toàn phải giới hạn **cả hai** chiều và quyết định sẵn "đầy thì làm gì". Điểm dễ nhầm là nghĩ vấn đề là "chọn sai loại pool" trong khi gốc là thiếu giới hạn ở một chiều và thiếu chính sách khi quá tải. Khi review, mọi pool trong code production cần: kích thước thread hữu hạn, queue có giới hạn, `ThreadFactory` đặt tên, chính sách từ chối rõ ràng, và số liệu giám sát (kích thước queue, số thread đang hoạt động).

**Đáp án ngắn:** Tự dựng `ThreadPoolExecutor` với queue có giới hạn, `ThreadFactory` đặt tên thread và chính sách từ chối rõ ràng, để quá tải được chặn ở rìa thay vì ngốn hết RAM hoặc thread.

**Ví dụ:** nộp 50.000 tác vụ chậm vào `newFixedThreadPool(2)` và 1.500 tác vụ chậm vào `newCachedThreadPool()`.

```text
newFixedThreadPool(2): luong=2, hang doi=49998 (khong gioi han, khong tu choi)
newCachedThreadPool : luong=1500 cho 1500 tac vu
```

_Đã chạy thử trên JDK 11._ 49.998 tác vụ nằm chờ trong memory mà không có cảnh báo nào; với mỗi tác vụ giữ một request hay payload lớn, đó là đường thẳng tới `OutOfMemoryError`. Ngược lại 1.500 tác vụ sinh ra 1.500 thread thật của OS (mỗi thread một stack), đủ làm sập máy khi tải lên hàng chục nghìn. Bản an toàn:

```java
var pool = new ThreadPoolExecutor(
        8, 16, 60, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(200),                    // có giới hạn
        r -> new Thread(r, "order-worker"),               // đặt tên luồng
        new ThreadPoolExecutor.CallerRunsPolicy());       // tạo backpressure
```

**Hỏi xoáy 1: `newSingleThreadExecutor` có an toàn hơn không?**
Vì sao hỏi tiếp: Nếu queue vô hạn là vấn đề, người ta hay nghĩ `newSingleThreadExecutor` thì sao, nên câu này kiểm tra xem bạn có hiểu vấn đề nằm ở queue hay ở số thread.

**Đáp:** Cùng vấn đề queue vô hạn. Bù lại nó bảo đảm thứ tự và chỉ một thread.

**Hỏi xoáy 2: Đặt tên thread để làm gì?**
Vì sao hỏi tiếp: Bản an toàn có `ThreadFactory` đặt tên, nên hỏi tiếp: đặt tên thread có lợi gì thực tế khi vận hành?

**Đáp:** Để đọc thread dump và log: `pool-3-thread-7` không cho biết gì, `order-worker-7` cho biết ngay pool nào đang kẹt.

**Sai lầm hay gặp:** Dùng `Executors.newCachedThreadPool()` cho tác vụ gọi mạng, khi dịch vụ phía dưới chậm thì thread tích lũy không dừng, rồi cả JVM chết.

**Nhớ:** Pool production cần queue có giới hạn, số thread có giới hạn, tên thread rõ ràng và chính sách từ chối chọn có chủ đích.

## 3. Chính sách từ chối (saturation policy) nào chọn khi nào?

**Câu hỏi:** Pool đã đầy cả thread lẫn queue, tác vụ mới vẫn đến. Bạn sẽ báo lỗi, bỏ việc hay làm gì khác, và lựa chọn nào khiến người gửi tự chậm lại?

**Gợi ý suy luận:**

- Khi không còn chỗ, về nguyên tắc chỉ có ba hướng: từ chối ra tiếng, bỏ im lặng, hay đẩy việc về cho người gửi. Mỗi hướng ảnh hưởng gì đến dữ liệu?
- Nếu chính thread gửi tự chạy tác vụ thì nó còn gửi tiếp nhanh được không (backpressure)?
- Ai sẽ biết quá tải đang xảy ra trong từng lựa chọn?

**Lập luận:** Khi queue và thread đều hết chỗ, hệ thống buộc phải chọn: báo lỗi (`AbortPolicy`), bỏ việc (`DiscardPolicy`, `DiscardOldestPolicy`), hoặc làm chậm nguồn gửi (`CallerRunsPolicy`). Chỉ cách thứ ba khiến quá tải **lan ngược** về phía người gửi: người gửi bận chạy tác vụ nên không nộp thêm nhanh hơn khả năng xử lý. Hai cách bỏ việc che giấu quá tải, còn báo lỗi buộc người gọi tự xử lý. Điểm dễ nhầm là chọn `DiscardPolicy` cho "nhẹ nhàng": tác vụ bị bỏ mà không ai biết, khó lần ra khi dữ liệu thiếu. Với việc không được mất thì dùng `AbortPolicy` rồi xử lý lỗi ở nơi gọi (retry, báo lỗi 503), hoặc `CallerRunsPolicy` để tạo backpressure nhưng nhớ rằng nó chạy tác vụ ngay trên thread người gửi nên có thể làm chậm cả request thread.

**Đáp án ngắn:** Muốn lỗi rõ thì `AbortPolicy`, muốn backpressure thì `CallerRunsPolicy`, tác vụ không quan trọng mới cân nhắc `Discard*`.

| Chính sách | Hành vi | Dùng khi |
|---|---|---|
| `AbortPolicy` (mặc định) | Ném `RejectedExecutionException` | Muốn lỗi rõ ràng, người gọi xử lý |
| `CallerRunsPolicy` | Thread gọi tự chạy tác vụ | Muốn **làm chậm nguồn gửi** (backpressure) |
| `DiscardPolicy` | Bỏ lặng lẽ | Tác vụ không quan trọng (cẩn thận, dễ mất dữ liệu) |
| `DiscardOldestPolicy` | Bỏ tác vụ cũ nhất trong queue | Chỉ cần dữ liệu mới nhất |

**Ví dụ:** pool 1 thread, queue 1 chỗ, `CallerRunsPolicy`; nộp 4 tác vụ mỗi tác vụ ngủ 300 ms; in thread chạy và thời gian `execute` trả về.

```text
execute(1) tra ve sau 2 ms
execute(2) tra ve sau 0 ms
  tac vu 1 chay tren [pool-1-thread-1]
  tac vu 3 chay tren [main]
execute(3) tra ve sau 304 ms
  tac vu 4 chay tren [main]
  tac vu 2 chay tren [pool-1-thread-1]
execute(4) tra ve sau 300 ms
```

_Đã chạy thử trên JDK 11._ Tác vụ 3 và 4 không vào pool mà chạy **ngay trên thread `main`** (người gửi), nên `execute(3)` mất 304 ms mới trả về: người gửi bị block lại, không thể nộp tiếp nhanh hơn khả năng xử lý. Đó chính là backpressure.

**Hỏi xoáy 1: `CallerRunsPolicy` nguy hiểm khi nào?**
Vì sao hỏi tiếp: `CallerRunsPolicy` có vẻ là lựa chọn tốt nhất, nên phải hỏi mặt trái: khi người gửi là thread nhận request thì chuyện gì xảy ra?

**Đáp:** Khi người gửi là thread nhận request (Tomcat): nó bị chiếm để chạy tác vụ nên ngừng nhận request mới, kết nối tồn đọng ở tầng TCP. Với nội bộ thì ổn, với thread I/O của server cần cân nhắc. Ngoài ra thứ tự thực thi không còn được bảo toàn (như tác vụ 3 chạy trước tác vụ 2 ở trên).

**Hỏi xoáy 2: `DiscardPolicy` nguy hiểm thế nào?**
Vì sao hỏi tiếp: Cùng logic đó, cần so với chính sách ngược lại: bỏ im lặng có rủi ro gì với dữ liệu?

**Đáp:** Tác vụ biến mất, không log, không lỗi. Nếu đó là lệnh trừ tiền thì mất dữ liệu mà không ai biết.

**Sai lầm hay gặp:** Quên rằng `submit` với `AbortPolicy` ném `RejectedExecutionException` ngay tại thread gọi, không trả vào `Future`.

**Nhớ:** Chính sách từ chối là quyết định về backpressure: báo lỗi, làm chậm người gửi, hoặc bỏ việc (rủi ro mất dữ liệu).

## 4. Chọn kích thước thread pool thế nào cho tác vụ CPU-bound và I/O-bound?

**Câu hỏi:** Cùng một máy 2 nhân, 100 tác vụ chờ I/O 100 ms chạy nhanh hơn rất nhiều khi tăng pool từ 2 lên 100 thread, nhưng 16 tác vụ tính toán thì tăng lên 32 thread cũng không nhanh hơn. Vì sao, và bạn chọn kích thước pool thế nào?

**Gợi ý suy luận:**

- Một nhân CPU chạy được mấy thread tại một thời điểm? Thread thứ hai tranh nhân đó thì được gì, mất gì (chuyển ngữ cảnh)?
- Thread đang chờ I/O có dùng CPU không? Nhân đó làm gì trong lúc chờ?
- Tỷ lệ thời gian chờ so với thời gian tính ảnh hưởng đến số thread cần để lấp đầy CPU thế nào?

**Lập luận:** Một nhân chỉ chạy một thread một lúc. Tác vụ CPU-bound luôn đòi CPU, nên thread vượt số nhân chỉ thêm chuyển ngữ cảnh, không thêm việc xong. Tác vụ I/O-bound phần lớn thời gian ngủ, CPU rảnh, nên nhiều thread xen kẽ lấp đầy khoảng rảnh đó; tỷ lệ chờ/tính càng cao càng cần nhiều thread. Từ đó có công thức gần đúng `số thread ≈ số nhân × (1 + thời gian chờ / thời gian tính)`. Điểm dễ nhầm là áp công thức máy móc: thời gian chờ và thời gian tính phải đo từ hệ thống thật, và số thread tối ưu còn bị giới hạn bởi tài nguyên hạ nguồn như pool kết nối DB (100 thread cùng xin 10 kết nối thì 90 thread chờ). Quy trình: ước lượng bằng công thức, đo throughput và latency với vài kích thước, rồi chọn điểm trước khi throughput ngừng tăng.

**Đáp án ngắn:** CPU-bound: khoảng `số nhân` (hoặc `+1`). I/O-bound: nhiều hơn theo công thức, ví dụ 8 nhân, chờ 90 ms, tính 10 ms thì khoảng 8 × (1 + 9) = 72 thread. Đo thật, và nhớ giới hạn từ tài nguyên khác như connection pool DB.

**Ví dụ 1 (I/O-bound):** 100 tác vụ, mỗi tác vụ "chờ I/O" 100 ms (sleep), máy 2 nhân.

```text
I/O-bound (100 tac vu x 100ms cho):
    2 luong ->  5035 ms
    8 luong ->  1312 ms
   32 luong ->   407 ms
  100 luong ->   197 ms
```

**Ví dụ 2 (CPU-bound):** 16 tác vụ tính toán, mỗi tác vụ cùng một khối lượng việc (khoảng 0,3 đến 0,4 giây trên 1 nhân; lần đo đầu tiên 408 ms còn chịu ảnh hưởng của JIT khởi động).

```text
1 tac vu CPU-bound (do tren 1 luong) ~ 408 ms; may co 2 nhan
  16 tac vu,  1 luong ->  4589 ms
  16 tac vu,  2 luong ->  2289 ms
  16 tac vu,  8 luong ->  2287 ms
  16 tac vu, 32 luong ->  2313 ms
```

_Đã chạy thử trên JDK 11 (mỗi ví dụ một chương trình)._ Với I/O-bound, thêm thread **giảm gần tuyến tính** (5035 → 197 ms). Với CPU-bound, đạt tối đa tại **2 thread = số nhân** (2289 ms); 8 hay 32 thread không nhanh hơn (còn tốn thêm quản lý). Lưu ý để so sánh công bằng, ví dụ CPU dùng **khối lượng việc cố định**, không dùng "đợi tới giờ" (cách đó sẽ trông như thể thêm thread vẫn nhanh hơn, vì thời gian đồng hồ trôi dù không có CPU).

**Hỏi xoáy 1: Vì sao công thức chỉ để khởi điểm?**
Vì sao hỏi tiếp: Công thức cho con số rất gọn, nên cần hỏi vì sao nó chỉ là điểm khởi đầu và còn gì khác giới hạn số thread hữu ích.

**Đáp:** Vì thời gian chờ và tính đổi theo tải, và vì thread còn tranh các tài nguyên hữu hạn khác: 200 thread cùng xin 20 kết nối DB thì 180 thread chỉ xếp hàng chờ kết nối. Kích thước pool phải nhất quán với kích thước connection pool của dịch vụ phía dưới.

**Hỏi xoáy 2: Có nên dùng một pool chung cho mọi loại tác vụ?**
Vì sao hỏi tiếp: Biết cách tính cho một loại tác vụ, câu tiếp theo là tác vụ lẫn lộn: có nên cho chung một pool không?

**Đáp:** Không. Tác vụ chặn lâu chiếm hết thread của pool và làm tác vụ nhanh bị đói; tách pool theo loại (và có giới hạn) cũng giúp cô lập lỗi (bulkhead).

**Sai lầm hay gặp:** Đặt pool = 200 "cho chắc" cho tác vụ CPU-bound, hoặc pool = số nhân cho tác vụ gọi HTTP chậm.

**Nhớ:** CPU-bound thì bằng số nhân; I/O-bound thì nhiều hơn theo tỷ lệ chờ/tính; luôn đối chiếu với tài nguyên hạ nguồn.

## 5. Hủy một tác vụ đang chạy như thế nào?

**Câu hỏi:** Bạn gọi `future.cancel(true)` và nhận `true`, `isCancelled()` cũng báo `true`, nhưng CPU vẫn chạy 100% thêm một lúc. Tác vụ đã dừng chưa, và dừng một tác vụ đang chạy thật sự cần gì?

**Gợi ý suy luận:**

- Vì sao Java bỏ `Thread.stop()`? Dừng thread giữa chừng khi nó đang sửa dữ liệu hoặc giữ lock thì hậu quả gì?
- Nếu không giết được cưỡng bức, thì dừng phải là việc của ai, và tín hiệu là gì (cờ interrupt)?
- Cờ interrupt có tự làm thread dừng không, hay phải có mã kiểm tra hoặc hàm blocking phản ứng với nó?

**Lập luận:** `Thread.stop()` có thể bỏ lock trong trạng thái hỏng, nên Java không có cách giết thread an toàn. Vì vậy hủy là **hợp tác**: bên hủy gửi tín hiệu (interrupt), bên bị hủy tự kiểm tra và dừng ở điểm an toàn. Interrupt chỉ đặt cờ; thread dừng nếu mã của nó kiểm tra cờ hoặc gọi hàm blocking (`sleep`, `wait`, `take`) vốn ném `InterruptedException`. Mã không kiểm tra cờ sẽ chạy hết, dù `Future` đã báo hủy. Điểm dễ nhầm là coi `cancel(true)` là "giết" tác vụ: nó chỉ đặt trạng thái và gửi tín hiệu, còn vòng lặp tính toán không kiểm tra cờ sẽ chạy tiếp, giữ CPU và có thể ghi dữ liệu sau khi đã hủy. Khi viết tác vụ dài, kiểm tra `isInterrupted()` trong vòng lặp, xử lý `InterruptedException` đúng cách, và đảm bảo tác vụ dọn dẹp tài nguyên khi bị hủy.

**Đáp án ngắn:** `cancel(true)` chỉ cập nhật trạng thái `Future` và gửi interrupt; tác vụ dừng thật hay không do mã tác vụ. Tác vụ phải kiểm tra `Thread.currentThread().isInterrupted()` định kỳ hoặc dùng hàm blocking đáp ứng ngắt.

**Ví dụ:** hai tác vụ: một **hợp tác** (kiểm tra cờ ngắt), một **điếc** (vòng lặp không kiểm tra). Cùng bị `cancel(true)` sau 200 ms.

```java
Future<?> deaf   = pool.submit(() -> { long end = now() + 1500; while (now() < end) { } ... });
Future<?> polite = pool.submit(() -> { while (!Thread.currentThread().isInterrupted()) { } ... });
```

```text
deaf.cancel(true)   = true, isCancelled=true
[HOP TAC] thay co interrupt -> dung ngay
polite.cancel(true) = true
[DIEC]    chay het 1.5s, bo ngoai tai cancel(true)
```

_Đã chạy thử trên JDK 11._ Cả hai `cancel` đều trả `true` và `Future` báo đã hủy, nhưng tác vụ điếc **vẫn chạy hết 1,5 giây** trong nền, chiếm thread. `cancel` chỉ cập nhật trạng thái `Future` và gửi interrupt; còn dừng thật hay không do chính mã tác vụ.

**Hỏi xoáy 1: Sao đọc socket `java.io` không bị ngắt?**
Vì sao hỏi tiếp: Hàm blocking đáp ứng ngắt là điều kiện, nên hỏi tiếp trường hợp I/O quen thuộc: đọc socket `java.io` có đáp ứng không và làm sao hủy?

**Đáp:** `InputStream.read` chặn trong hệ điều hành và không kiểm tra cờ ngắt. Cách duy nhất là **đóng** socket/stream từ thread khác để `read` ném `IOException`. NIO `InterruptibleChannel` thì phản ứng với interrupt. Xem [Hủy tác vụ và Shutdown](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-07-huy-va-shutdown.md).

**Hỏi xoáy 2: Dùng cờ `volatile boolean cancelled` thay interrupt được không?**
Vì sao hỏi tiếp: Nếu interrupt là cơ chế chuẩn, cần so với phương án đơn giản hơn: cờ `volatile` có thay được không?

**Đáp:** Được cho vòng lặp tính toán thuần, nhưng cờ **không đánh thức** thread đang ngủ trong `sleep`/`take`; interrupt thì có. Nên dùng interrupt cho tác vụ có điểm chặn.

**Sai lầm hay gặp:** Tin `future.cancel(true)` đã dừng tác vụ. Hậu quả: pool vẫn "bận", tài nguyên không giải phóng.

**Nhớ:** Hủy là hợp tác: interrupt chỉ là tín hiệu, tác vụ phải tự kiểm tra hoặc dùng hàm blocking đáp ứng ngắt.

## 6. Xử lý `InterruptedException` đúng cách thế nào?

**Câu hỏi:** Ứng dụng của bạn không thoát sau khi nhận SIGTERM dù đã gọi `shutdownNow()`. Trong mã có `catch (InterruptedException e) { }` rỗng. Điều gì đã xảy ra với tín hiệu dừng, và sửa thế nào?

**Gợi ý suy luận:**

- Interrupt là message "hãy dừng" gửi tới thread. Khi hàm blocking ném `InterruptedException`, cờ ngắt còn hay bị xóa?
- Nếu `catch` nuốt ngoại lệ, những tầng mã phía trên (và pool) còn biết thread bị yêu cầu dừng không?
- Có những cách nào để message đó tiếp tục đi lên?

**Lập luận:** Hàm blocking bắt được ngắt thì ném `InterruptedException` **và xóa cờ**. Nếu `catch` rồi bỏ qua, tín hiệu biến mất: vòng lặp tiếp tục như chưa có gì, nên `shutdownNow` không làm pool dừng được. Để message còn đến người phía trên, chỉ có hai cách: ném tiếp ngoại lệ, hoặc **đặt lại cờ** bằng `Thread.currentThread().interrupt()` rồi thoát gọn. Điểm dễ nhầm là chỉ ghi log rồi tiếp tục, hoặc ném `RuntimeException` bọc mà không đặt lại cờ: cả hai đều làm mất tín hiệu dừng. Quy tắc: nếu method khai báo được thì ném `InterruptedException` ra tiếp; nếu không (như trong `Runnable`) thì `Thread.currentThread().interrupt()` rồi thoát khỏi công việc đang làm, để pool hay code bên trên còn nhận biết yêu cầu dừng.

**Đáp án ngắn:** Đừng nuốt `InterruptedException`: ném tiếp, hoặc đặt lại cờ ngắt rồi kết thúc công việc hiện tại.

**Ví dụ:** hai tác vụ trong pool một thread chạy vòng lặp `sleep`; sau 300 ms gọi `shutdownNow()` rồi `awaitTermination(1s)`. Tác vụ 1 **nuốt** ngoại lệ, tác vụ 2 **đặt lại cờ và thoát**.

```java
try { Thread.sleep(200); }
catch (InterruptedException e) {
    if (recover) { Thread.currentThread().interrupt(); return; }   // đúng
    // else: bỏ qua, vòng lặp tiếp tục                             // sai
}
```

```text
nuot InterruptedException -> awaitTermination(1s) = false
khoi phuc co ngat + thoat -> awaitTermination(1s) = true
```

_Đã chạy thử trên JDK 11 (thread đánh dấu daemon để chương trình thoát được)._ Khi nuốt ngoại lệ, `shutdownNow` vô hiệu: pool không bao giờ dừng, ứng dụng "treo khi tắt". Đây là nguyên nhân phổ biến nhất của lỗi "ứng dụng không thoát sau khi nhận SIGTERM".

**Hỏi xoáy 1: Nếu không ném lại được (override `run()`, không có `throws`)?**
Vì sao hỏi tiếp: Khuyên "ném tiếp" không phải lúc nào cũng làm được, nên hỏi: nếu `run()` không có `throws` thì làm gì?

**Đáp:** Khôi phục cờ như trên rồi kết thúc công việc hiện tại. Không bao giờ `catch (InterruptedException e) {}` rỗng.

**Hỏi xoáy 2: Có trường hợp nào nuốt được không?**
Vì sao hỏi tiếp: Quy tắc đã khá tuyệt đối, nên hỏi ngược: có trường hợp nào được phép nuốt không, và điều kiện là gì?

**Đáp:** Chỉ khi bạn *sở hữu* thread và định nghĩa chính sách ngắt của nó (ví dụ thread của bạn kết thúc ngay sau đó). Mã thư viện thì không bao giờ sở hữu thread nên luôn phải truyền đi.

**Sai lầm hay gặp:** Log "interrupted" rồi tiếp tục vòng lặp. Hậu quả: shutdown treo.

**Nhớ:** `InterruptedException` xóa cờ ngắt; phải truyền đi hoặc đặt lại cờ, không bao giờ để catch rỗng.

## 7. Deadlock: điều kiện, cách tránh và cách chẩn đoán?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Hai thread chuyển tiền `transfer(A, B)` và `transfer(B, A)` chạy đồng thời thì ứng dụng treo, CPU gần như nhàn rỗi. Điều gì đã xảy ra, vì sao lock theo thứ tự cố định giúp được, và bạn xác nhận nó bằng cách nào?

**Gợi ý suy luận:**

- Thread 1 giữ lock A chờ B, thread 2 giữ lock B chờ A: ai nhả lock trước?
- Có 4 điều kiện cần cùng lúc để deadlock xảy ra (loại trừ lẫn nhau, giữ-và-chờ, không bị chiếm đoạt, chờ vòng). Phá điều kiện nào rẻ nhất?
- Làm sao thấy được "ai chờ ai" ở một process đang chạy (thread dump)?

**Lập luận:** Deadlock là **chu trình trong đồ thị chờ**: mỗi thread giữ thứ thread kia cần và chờ thứ thread kia giữ, nên không ai tiến. Cần cả bốn điều kiện, phá một là hết. Cách rẻ nhất là phá **chờ vòng**: nếu mọi thread lấy lock theo cùng một thứ tự toàn cục (ví dụ id nhỏ trước) thì chu trình không thể hình thành. Để chẩn đoán, thread dump liệt kê thread BLOCKED và chủ lock, nên đọc được vòng chờ. Điểm dễ nhầm là chỉ nghĩ tới hai lock tường minh: deadlock cũng xảy ra khi giữ lock nội bộ rồi gọi code ngoài (callback, method có thể bị override) mà code đó lấy lock theo thứ tự ngược, hoặc giữa pool và tác vụ chờ nhau (thread pool starvation deadlock). Khi review, tìm chỗ gọi code lạ trong khối `synchronized`, và dùng `tryLock` có timeout ở những chỗ không thể thống nhất thứ tự.

**Đáp án ngắn:** Lock theo **thứ tự cố định**, giữ lock ngắn, dùng `tryLock` có timeout, không gọi mã ngoài khi đang giữ lock. Chẩn đoán bằng thread dump, JVM tự báo "Found one Java-level deadlock".

**Ví dụ:** hai thread lock A rồi B, và B rồi A, mỗi thread ngủ 200 ms giữa hai lần lock để chắc chắn gặp nhau. Chương trình tự phát hiện bằng `ThreadMXBean` (cơ chế cùng nguồn với `jstack`).

```java
Thread t1 = new Thread(() -> { synchronized (A) { sleep(200); synchronized (B) { } } }, "chuyen-A-sang-B");
Thread t2 = new Thread(() -> { synchronized (B) { sleep(200); synchronized (A) { } } }, "chuyen-B-sang-A");
long[] ids = ManagementFactory.getThreadMXBean().findDeadlockedThreads();
```

```text
findDeadlockedThreads -> 2 luong
"chuyen-A-sang-B" BLOCKED cho khoa java.lang.Object@b62fe6d dang bi giu boi "chuyen-B-sang-A"
"chuyen-B-sang-A" BLOCKED cho khoa java.lang.Object@5c1a8622 dang bi giu boi "chuyen-A-sang-B"
```

_Đã chạy thử trên JDK 11._ Đọc output là đọc đồ thị chờ: mỗi thread BLOCKED chờ lock đang do thread kia giữ, tạo thành vòng. Với `jstack <pid>` hoặc `jcmd <pid> Thread.print`, bạn sẽ thấy cùng thông tin và dòng "Found one Java-level deadlock". Bản sửa: ép cùng thứ tự lấy lock.

```java
Account first  = a.id() < b.id() ? a : b;
Account second = a.id() < b.id() ? b : a;
synchronized (first) { synchronized (second) { /* chuyển tiền */ } }
```

**Hỏi xoáy 1: Thread pool có tự deadlock được không dù không có lock?**
Vì sao hỏi tiếp: Hiểu deadlock gắn với lock, bước tiếp theo là hỏi liệu thread pool không dùng lock nào có tự deadlock được không.

**Đáp:** Có: *thread starvation deadlock*, tác vụ cha chờ tác vụ con nằm trong cùng pool đã hết thread. Tái hiện ở [qa-17 câu 12](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md).

**Hỏi xoáy 2: `tryLock` có hết deadlock không?**
Vì sao hỏi tiếp: Phá điều kiện "không bị chiếm đoạt" bằng `tryLock` nghe như lời giải hoàn hảo, nên hỏi: nó có hết rắc rối thật không?

**Đáp:** Nó biến deadlock thành "thất bại sau timeout" (phá điều kiện không bị chiếm đoạt), nhưng bạn phải xử lý thất bại và tránh livelock (cả hai cùng retry mãi); thường thêm trì hoãn ngẫu nhiên. Xem [Liveness hazards](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-10-liveness-hazards.md) và [công cụ chẩn đoán JVM](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md).

**Sai lầm hay gặp:** Lock theo thứ tự tham số (`transfer(from, to)`) thay vì thứ tự toàn cục: `transfer(A,B)` và `transfer(B,A)` deadlock.

**Nhớ:** Deadlock là vòng chờ; phá bằng thứ tự lấy lock toàn cục hoặc `tryLock` timeout, chẩn đoán bằng thread dump.

## 8. Chọn `ConcurrentHashMap`, `CopyOnWriteArrayList` hay `BlockingQueue` khi nào?

**Câu hỏi:** Ba tình huống: một map đếm dùng chung giữa nhiều thread, một danh sách listener hiếm khi đổi nhưng đọc liên tục, và một chỗ chuyền việc giữa hai nhóm thread. Mỗi tình huống nên dùng cấu trúc nào, và vì sao `HashMap` thường lại sai?

**Gợi ý suy luận:**

- Mẫu truy cập của từng tình huống là gì: đọc nhiều hay ghi nhiều, cần lock toàn bộ hay chỉ một phần?
- Nếu mỗi lần ghi sao chép cả mảng thì ghi tốn gì, và đọc được lợi gì?
- `get` rồi `put` hai lệnh rời nhau có nguyên tử không khi hai thread cùng chạy?

**Lập luận:** Mỗi cấu trúc tối ưu cho một mẫu truy cập. `ConcurrentHashMap` chia nhỏ lock (theo bucket + CAS) nên nhiều thread thao tác key khác nhau parallel, và có `merge` nguyên tử. `CopyOnWriteArrayList` sao chép cả mảng mỗi lần ghi để đọc không cần lock và iterator là snapshot, nên chỉ hợp khi đọc rất nhiều, ghi rất ít. `BlockingQueue` là điểm đệm có chặn để chuyền việc. `HashMap` dùng chung thì thao tác đọc-sửa-ghi không nguyên tử nên mất cập nhật. Điểm dễ nhầm là dùng `CopyOnWriteArrayList` cho danh sách ghi thường xuyên (mỗi lần ghi sao chép cả mảng, O(n)) hoặc `ConcurrentHashMap` rồi lại viết `get` rồi `put`. Khi chọn, hỏi tỉ lệ đọc/ghi và liệu thao tác có phải chuỗi nhiều bước không; nếu có thì chọn thao tác gộp (`merge`, `compute`) hoặc `BlockingQueue` cho chuyển việc, thay vì tự khóa quanh cấu trúc.

**Đáp án ngắn:** Map dùng chung: `ConcurrentHashMap`; danh sách đọc nhiều ghi ít: `CopyOnWriteArrayList`; chuyền việc: `BlockingQueue` có giới hạn.

| Cấu trúc | Hợp khi | Lưu ý |
|---|---|---|
| `ConcurrentHashMap` | Map dùng chung, nhiều đọc và ghi | Dùng `merge`, `computeIfAbsent`, `putIfAbsent` cho thao tác nguyên tử; không cho `null` |
| `CopyOnWriteArrayList` | **Đọc rất nhiều, ghi rất ít** (danh sách listener) | Mỗi lần ghi sao chép cả mảng; iterator là snapshot |
| `BlockingQueue` | Chuyền việc giữa thread (producer-consumer) | Chọn có giới hạn để có backpressure |
| `Collections.synchronizedList` | Cần tối thiểu, ít tranh chấp | Duyệt vẫn phải tự lock; thao tác phức hợp không nguyên tử |

**Ví dụ:** sửa danh sách khi đang duyệt, và đếm từ bằng hai thread.

```java
for (Integer x : arrayList) if (x == 2) arrayList.add(99);        // ArrayList
// CopyOnWriteArrayList
for (Integer x : cowList)   if (x == 2) cowList.add(99);
// đếm: 2 thread x 200_000 lần merge("k"+(i%50), 1, Integer::sum) vào HashMap và ConcurrentHashMap
```

```text
ArrayList sua khi duyet -> ConcurrentModificationException
CopyOnWriteArrayList: duyet bang snapshot cu, sau do list = [1, 2, 3, 99]
HashMap + 2 luong, tong dem = 399742 (ky vong 400000)
ConcurrentHashMap.merge       = 400000 (ky vong 400000)
```

_Đã chạy thử trên JDK 11 (con số của `HashMap` đổi mỗi lần)._ `ArrayList` phát hiện sửa-khi-duyệt bằng cờ `modCount` và ném lỗi (fail-fast). `CopyOnWriteArrayList` duyệt bản cũ nên không lỗi, đổi lại ghi tốn O(n). `HashMap` dùng chung giữa thread **mất 258 lần cộng một cách lặng lẽ** (và trong một số phiên bản/tình huống có thể hỏng cấu trúc bucket); `merge` của `ConcurrentHashMap` đúng tuyệt đối.

**Hỏi xoáy 1: Iterator của `ConcurrentHashMap` có fail-fast không?**
Vì sao hỏi tiếp: Đã biết `ConcurrentHashMap` duyệt parallel với ghi, nên hỏi: iterator của nó có fail-fast như `ArrayList` không?

**Đáp:** Không; nó *weakly consistent*: phản ánh trạng thái tại hoặc sau thời điểm tạo iterator, không ném `ConcurrentModificationException`, có thể thấy hoặc không thấy sửa đổi đồng thời.

**Hỏi xoáy 2: Vì sao `ConcurrentHashMap` cấm `null`?**
Vì sao hỏi tiếp: Một quy tắc lạ của `ConcurrentHashMap` là cấm `null`, nên hỏi lý do thiết kế đằng sau trong ngữ cảnh đồng thời.

**Đáp:** Vì `get(k) == null` sẽ mơ hồ: không có lock hay giá trị là `null`? Trong ngữ cảnh đồng thời bạn không thể kiểm tra `containsKey` rồi `get` một cách nguyên tử để phân biệt. Xem [Building blocks](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-05-building-blocks.md).

**Sai lầm hay gặp:** Dùng `CopyOnWriteArrayList` cho danh sách ghi thường xuyên: mỗi lần `add` copy cả mảng, throughput sụp.

**Nhớ:** Chọn cấu trúc theo mẫu truy cập; thao tác phức hợp phải dùng method nguyên tử như `merge`.

## 9. Cài đặt producer-consumer thế nào?

**Câu hỏi:** Producer sinh việc nhanh hơn consumer xử lý. Bạn muốn memory không phình mãi mà producer vẫn không mất việc. Bạn thiết kế thế nào, và kết thúc sạch ra sao?

**Gợi ý suy luận:**

- Nếu buffer không có giới hạn, bên nhanh hơn sẽ làm gì với memory?
- Nếu buffer đầy mà producer phải chờ thì producer bị kéo về tốc độ của ai (backpressure)?
- Consumer đang chờ trên queue rỗng thì biết khi nào hết việc để thoát?

**Lập luận:** Hai bên chạy với tốc độ khác nhau nên cần buffer. Buffer không giới hạn thì bên nhanh làm memory phình mãi, nên chọn queue có giới hạn: producer **chờ khi đầy**, bị kéo xuống đúng tốc độ consumer, đó là backpressure tự nhiên. `BlockingQueue` gói sẵn việc chờ-báo và thread-safe. Còn consumer chặn ở `take` nên cần một tín hiệu kết thúc đi qua chính queue: poison pill. Điểm dễ nhầm là dùng queue không giới hạn "cho yên tâm", khiến memory phình khi producer nhanh hơn, và quên rằng với nhiều consumer thì mỗi consumer cần một poison pill (hoặc truyền lại pill). Với dữ liệu quan trọng, quyết định sẵn điều gì xảy ra khi consumer chết giữa chừng (việc nằm lại queue hay mất), và dùng `offer` có timeout nếu producer không được phép chặn vô hạn.

**Đáp án ngắn:** Producer `put` (chặn khi đầy), consumer `take` (chặn khi rỗng) trên queue có giới hạn; kết thúc sạch bằng poison pill.

**Ví dụ:** queue 3 chỗ; consumer xử lý chậm (300 ms/việc); producer đẩy 8 việc rồi một poison pill. In thời điểm mỗi lần `put` hoàn tất.

```java
BlockingQueue<String> q = new ArrayBlockingQueue<>(3);
// consumer: sleep(300); s = q.take(); if (s == POISON) return;
// producer: for (i = 1..8) q.put("job" + i); q.put(POISON);
```

```text
producer put job1 xong sau   31 ms (hang doi=1)
producer put job2 xong sau   52 ms (hang doi=2)
producer put job3 xong sau   53 ms (hang doi=3)
producer put job4 xong sau  302 ms (hang doi=3)
consumer xu ly job1
consumer xu ly job2
producer put job5 xong sau  621 ms (hang doi=3)
...
producer put job8 xong sau 1524 ms (hang doi=3)
consumer xu ly job8
consumer: nhan poison pill, thoat
```

_Đã chạy thử trên JDK 11 (đã rút gọn các dòng giữa)._ Ba việc đầu vào queue gần như tức thì; từ việc thứ 4 `put` bị **chặn tới khi consumer lấy bớt một việc** (302 ms, 621 ms, 922 ms...), tức producer bị kéo xuống đúng tốc độ consumer (khoảng 300 ms/việc). Queue không bao giờ vượt 3.

**Hỏi xoáy 1: Nhiều consumer thì poison pill thế nào?**
Vì sao hỏi tiếp: Một poison pill chỉ dừng một consumer, nên hỏi: có nhiều consumer thì sao?

**Đáp:** Mỗi consumer cần một poison pill (hoặc consumer gặp pill thì đặt lại pill vào queue trước khi thoát để consumer kế tiếp cũng nhận được).

**Hỏi xoáy 2: `ArrayBlockingQueue` hay `LinkedBlockingQueue`?**
Vì sao hỏi tiếp: Biết `BlockingQueue` là nền, cần chọn hiện thực cụ thể: `ArrayBlockingQueue` hay `LinkedBlockingQueue`?

**Đáp:** Array: một lock, chặn trên rõ ràng, ít cấp phát. Linked: hai lock riêng cho đầu và cuối nên producer và consumer không tranh nhau, throughput cao hơn khi tải nặng, nhưng mặc định không giới hạn (nhớ truyền capacity). `SynchronousQueue` không đệm, chuyền tay trực tiếp.

**Sai lầm hay gặp:** Dùng queue không giới hạn rồi ngạc nhiên vì OOM; hoặc quên rằng consumer chết thì producer chặn mãi trên `put`.

**Nhớ:** Queue có giới hạn làm backpressure tự nhiên; kết thúc bằng poison pill, mỗi consumer một cái.

## 10. `CountDownLatch`, `Semaphore`, `CyclicBarrier` khác nhau thế nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn cần (a) chờ 5 worker khởi động xong rồi mới chạy tiếp, (b) cho tối đa 3 thread cùng gọi một API ngoài, (c) cho N thread đợi nhau cuối mỗi pha rồi cùng sang pha sau. Mỗi nhu cầu dùng công cụ nào, và chúng khác nhau ở đâu?

**Gợi ý suy luận:**

- Ở (a), cái gì được đếm và đếm theo chiều nào, có lặp lại được không?
- Ở (b), thứ bị đếm là gì (giấy phép còn lại), và ai trả lại?
- Ở (c), cổng mở khi đủ số bên tới, rồi tự đặt lại để dùng cho pha sau như thế nào?

**Lập luận:** Cả ba là biến thể của việc đếm. `CountDownLatch` đếm **xuống** tới 0 rồi mở cổng một lần: hợp với "chờ N event xong". `Semaphore` đếm **giấy phép còn lại**: acquire trừ, release cộng, nên giới hạn được số thread cùng vào. `CyclicBarrier` đếm **số bên tới** và mở cổng khi đủ rồi tự reset, nên dùng được cho nhiều pha. Điểm dễ nhầm là dùng nhầm công cụ vì cả ba đều "đợi và đếm": `CountDownLatch` dùng một lần và không reset, `CyclicBarrier` tái dùng nhiều pha nhưng cần mọi bên cùng tới (một bên lỗi làm barrier hỏng), còn `Semaphore` không gắn với chuyện chờ nhau mà để giới hạn số bên đồng thời. Khi chọn, hỏi: đang chờ một event xong, giới hạn tài nguyên, hay đồng bộ các pha?

**Đáp án ngắn:** (a) `CountDownLatch`, (b) `Semaphore`, (c) `CyclicBarrier`.

| | Dùng cho | Tái sử dụng |
|---|---|---|
| `CountDownLatch` | Chờ N event xong (khởi động xong, mọi worker xong) | Không |
| `CyclicBarrier` | N thread đợi nhau tại một điểm rồi cùng đi tiếp (theo pha) | Có |
| `Semaphore` | Giới hạn số thread đồng thời vào tài nguyên (API gọi ngoài, kết nối) | Có |

**Ví dụ:** 10 thread cùng xin vào, `Semaphore(3)`; ghi lại số thread đồng thời tối đa. Và một `CyclicBarrier(3)` chia công việc hai pha.

```java
Semaphore permits = new Semaphore(3);
permits.acquire(); try { /* dùng tài nguyên, ghi nhận số đồng thời */ } finally { permits.release(); }
```

```text
Semaphore(3): 10 luong, so luong DONG THOI toi da = 3
luong 1 xong pha 1
luong 2 xong pha 1
luong 3 xong pha 1
  --- ca 3 luong da toi rao, cung di tiep ---
luong 1 bat dau pha 2
luong 3 bat dau pha 2
luong 2 bat dau pha 2
```

_Đã chạy thử trên JDK 11._ Mười thread muốn chạy nhưng mức đồng thời tối đa đúng bằng 3. Ở rào chắn, không thread nào bước sang pha 2 trước khi cả ba hoàn thành pha 1.

**Hỏi xoáy 1: Vì sao `release` phải ở `finally`?**
Vì sao hỏi tiếp: Với `Semaphore`, lỗi kinh điển nằm ở việc nhả giấy phép, nên hỏi: vì sao `release` phải đặt ở `finally`?

**Đáp:** Nếu tác vụ ném ngoại lệ mà không `release`, giấy phép mất vĩnh viễn: sau N lần lỗi, `Semaphore` cạn và mọi thread chờ mãi (rò giấy phép).

**Hỏi xoáy 2: `Phaser` hơn gì?**
Vì sao hỏi tiếp: Nếu `CyclicBarrier` quá cứng vì số bên cố định, câu tiếp theo là công cụ linh hoạt hơn: `Phaser`.

**Đáp:** Số bên tham gia đổi được trong lúc chạy và có nhiều pha. Dùng khi `CyclicBarrier` quá cứng.

**Sai lầm hay gặp:** Dùng `CountDownLatch` lặp lại (nó không reset) hoặc quên `countDown()` trong nhánh lỗi, khiến `await()` chờ mãi.

**Nhớ:** Latch: đếm xuống một lần; Barrier: đợi nhau theo pha, tái dùng; Semaphore: giới hạn số thread đồng thời.

## 11. `CompletableFuture` giải quyết gì? Bẫy thường gặp?

**Câu hỏi:** Bạn gọi hai dịch vụ chậm 300 ms mỗi cái. Viết tuần tự mất 640 ms, nhưng với `CompletableFuture` chỉ ~320 ms. Vì sao? Và những bẫy nào khiến mã `CompletableFuture` trông đúng mà chạy sai hoặc chậm?

**Gợi ý suy luận:**

- `Future.get()` bắt thread làm gì trong lúc chờ? Đăng ký callback thì thread có phải chặn không?
- Nếu hai bước độc lập chạy parallel thì tổng thời gian là tổng hay là bước chậm nhất?
- Lỗi xảy ra trong tác vụ async được ném cho ai, vào lúc nào?
- `supplyAsync` không truyền executor thì chạy trên pool nào, và pool đó có bao nhiêu thread?

**Lập luận:** `Future.get()` chặn một thread, còn `CompletableFuture` cho đăng ký "việc làm tiếp theo" chạy khi kết quả sẵn sàng, nên ghép được thành chuỗi hoặc cây mà non-blocking. Với hai bước độc lập, `thenCombine` cho chạy parallel nên tổng thời gian là bước chậm nhất. Bẫy: lỗi bị giữ trong future, không ai `join/get` thì biến mất; executor mặc định là `ForkJoinPool.commonPool()` chỉ có vài thread, nên việc **chặn** xếp hàng và còn làm đói parallel stream; chuỗi không timeout treo vô hạn nếu nguồn không hoàn thành. Điểm dễ nhầm là tưởng thêm `Async` là chạy trên thread riêng: nếu không truyền executor, mọi bước dùng chung `commonPool`, và một bước chặn I/O có thể làm đói cả `parallelStream`. Khi review, kiểm tra mỗi chuỗi có executor phù hợp, có `orTimeout`/`completeOnTimeout`, và có chỗ nào gọi `join` hay `get` để lỗi không bị nuốt.

**Đáp án ngắn:** `thenApply` (biến đổi), `thenCompose` (nối future khác, như `flatMap`), `thenCombine` (ghép hai kết quả), `allOf`/`anyOf`, `exceptionally`/`handle` (xử lý lỗi), `orTimeout`. Với việc chặn thì truyền executor riêng.

**Ví dụ 1:** gọi `user` (300 ms) và `orders` (300 ms), tuần tự so với parallel bằng `thenCombine`.

```java
CompletableFuture<String> u = CompletableFuture.supplyAsync(() -> slow("user", 300), io);
CompletableFuture<String> o = CompletableFuture.supplyAsync(() -> slow("orders", 300), io);
u.thenCombine(o, (x, y) -> x + "+" + y).join();
```

```text
tuan tu: user+orders 640 ms
thenCombine: user+orders 319 ms
```

**Ví dụ 2:** lỗi chỉ lộ khi `join`, và timeout.

```text
tao future loi xong, chua co gi in ra...
loi chi lo ra khi join(): java.util.concurrent.CompletionException: java.lang.IllegalStateException: DB loi
exceptionally -> fallback(TimeoutException)
```

_Đã chạy thử trên JDK 11 (`orTimeout` có từ Java 9)._ Lỗi trong tác vụ async **không in ra gì** cho tới khi có ai `join/get`; nếu không ai chờ thì lỗi biến mất.

**Ví dụ 3 (bẫy executor mặc định):** `supplyAsync` không truyền executor dùng `ForkJoinPool.commonPool()`. Với `-Djava.util.concurrent.ForkJoinPool.common.parallelism=2`, chạy 6 tác vụ **chặn** 500 ms:

```text
commonPool parallelism = 2
chay tren: ForkJoinPool.commonPool-worker-3
6 tac vu CHAN 500ms tren commonPool: 1508 ms (ky vong 500 neu co du luong)
6 tac vu CHAN 500ms tren pool rieng 6 luong : 509 ms
```

_Đã chạy thử trên JDK 11._ `commonPool` chỉ có vài thread (mặc định số nhân trừ 1), nên 6 tác vụ chặn xếp thành 3 đợt (1508 ms) và còn làm đói mọi thứ khác dùng chung `commonPool` (parallel stream, `CompletableFuture` khác). Pool riêng cho I/O: 509 ms. (Trên máy chỉ có 2 nhân và không đổi tham số, JVM thậm chí không dùng commonPool mà tạo một thread mới mỗi tác vụ, đừng suy ra hành vi sản xuất từ máy nhỏ.)

**Hỏi xoáy 1: `thenApply` và `thenApplyAsync` khác gì?**
Vì sao hỏi tiếp: Chuỗi bước được đẩy sang thread nào là chỗ dễ nhầm, nên hỏi: `thenApply` và `thenApplyAsync` khác nhau thế nào?

**Đáp:** `thenApply` chạy bước tiếp theo trên thread hoàn thành bước trước (hoặc thread đang gọi nếu đã xong), `thenApplyAsync` đẩy sang executor. Chạy việc nặng trong `thenApply` có thể chiếm thread I/O của thư viện HTTP.

**Hỏi xoáy 2: Chuỗi không có timeout thì sao?**
Vì sao hỏi tiếp: Bẫy lỗi bị giữ lại cho thấy một future có thể không bao giờ hoàn thành, nên hỏi tiếp: chuỗi không có timeout thì sao?

**Đáp:** Nếu một nguồn không bao giờ hoàn thành, mọi thứ phụ thuộc treo vô hạn. Luôn `orTimeout`/`completeOnTimeout` ở ranh giới gọi ra ngoài.

**Sai lầm hay gặp:** `supplyAsync(() -> blockingCall())` không có executor; hoặc gọi `.get()` ngay sau mỗi bước, trả về y hệt mô hình đồng bộ.

**Nhớ:** `CompletableFuture` ghép bước non-blocking; luôn truyền executor cho việc chặn, xử lý lỗi và đặt timeout.

## 12. `ReentrantLock` hơn `synchronized` ở đâu? Khi nào vẫn chọn `synchronized`?

**Câu hỏi:** Một thread đang giữ lock 1 giây còn thread bạn cần thì không muốn chờ vô hạn, hoặc muốn bị ngắt khi chờ. Với `synchronized` có làm được không? `ReentrantLock` giải quyết gì, và khi nào bạn vẫn chọn `synchronized`?

**Gợi ý suy luận:**

- `synchronized` là cú pháp khối của JVM: chờ lock có chỉnh được tham số (timeout, ngắt) không?
- Nếu lấy key là một gọi hàm thì có thể thêm gì (`tryLock`, timeout, `lockInterruptibly`, nhiều `Condition`)?
- Lock tự nhả khi ra khỏi khối thì ai chịu trách nhiệm nhả lock trong `ReentrantLock`?

**Lập luận:** `synchronized` chờ lock **vô điều kiện**: không ngắt được, không timeout, nên một lock bị giữ lâu làm thread kẹt mãi. `ReentrantLock` là thư viện (xây trên AQS), lấy lock bằng một lời gọi hàm có tham số nên có `tryLock`, timeout, ngắt được, công bằng tùy chọn, nhiều `Condition`. Đổi lại bạn tự chịu trách nhiệm `unlock`, nên chỉ dùng khi thật sự cần các tính năng đó. Điểm dễ nhầm là nghĩ `ReentrantLock` luôn tốt hơn vì nhiều tính năng: bạn phải `unlock` trong `finally`, nếu quên thì lock rò vĩnh viễn, và hiệu năng hai bên hiện gần nhau. Mặc định dùng `synchronized` cho đơn giản; chỉ chuyển sang `ReentrantLock` khi cần `tryLock`, timeout, ngắt được khi chờ, nhiều `Condition`, và với virtual thread ở Java 21 thì ưu tiên nó khi lock bao quanh I/O.

**Đáp án ngắn:** Dùng `ReentrantLock` khi cần timeout, ngắt được khi chờ, `tryLock`, nhiều điều kiện; ngược lại ưu tiên `synchronized` (ngắn gọn, không quên nhả lock, dễ thấy trong thread dump).

**Ví dụ:** thread khác giữ lock 1 giây; thread này thử `tryLock(200ms)`, và một thread chờ bằng `lockInterruptibly` bị ngắt.

```java
if (lock.tryLock(200, TimeUnit.MILLISECONDS)) { try { update(); } finally { lock.unlock(); } }
else { fallback(); }
// lock.lockInterruptibly() trong thread khác, rồi waiter.interrupt()
```

```text
tryLock(200ms) = false sau 201 ms -> chay fallback thay vi ket cho
lockInterruptibly: bi ngat khi dang cho khoa (synchronized khong lam duoc)
```

_Đã chạy thử trên JDK 11._ Với `synchronized`, thread chờ lock **không thể bị ngắt** và không có timeout: một lock bị giữ lâu làm thread kẹt mãi. Bảng chọn:

| Cần | Chọn |
|---|---|
| Khối đơn giản, không tính năng đặc biệt | `synchronized` |
| Timeout, ngắt được khi chờ lock, `tryLock` | `ReentrantLock` |
| Nhiều điều kiện chờ trên một lock | `ReentrantLock` + `Condition` |
| Lock công bằng | `ReentrantLock(true)` (chậm hơn nhiều) |

**Hỏi xoáy 1: Vì sao lock công bằng chậm?**
Vì sao hỏi tiếp: Công bằng là tính năng của `ReentrantLock` nghe rất hấp dẫn, nên hỏi giá phải trả: vì sao lock công bằng chậm?

**Đáp:** Ví dụ 4 thread × 500.000 lần lock/unlock: _Đã chạy thử trên JDK 11_: không công bằng **63 ms**, công bằng **4.948 ms**. Lock không công bằng cho phép thread vừa nhả lock lấy lại ngay (barging), tránh được chuyển ngữ cảnh; lock công bằng bắt buộc đánh thức thread đứng đầu queue mỗi lần, nên mỗi lần nhả lock kéo theo một lần chuyển ngữ cảnh. Chỉ bật fair khi cần tránh đói thật sự. Xem [Explicit locks](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-13-explicit-locks.md).

**Hỏi xoáy 2: JVM đã tối ưu `synchronized` chưa?**
Vì sao hỏi tiếp: Đừng chọn `ReentrantLock` chỉ vì tính năng, nên hỏi: JVM đã tối ưu `synchronized` đến đâu?

**Đáp:** Có nhiều (thin/lightweight lock, lock coarsening, lock elision; biased locking từng có nhưng đã bị gỡ ở các bản JDK mới); chênh lệch hiệu năng với `ReentrantLock` hiện nay nhỏ, nên đừng chọn `ReentrantLock` vì "nhanh hơn".

**Sai lầm hay gặp:** `lock.lock()` đặt **trong** `try` (nếu `lock()` ném lỗi thì `finally` gọi `unlock()` trên lock chưa giữ) hoặc quên `unlock` ở nhánh `return` sớm.

**Nhớ:** `ReentrantLock` cho timeout, ngắt, `tryLock`, `Condition`; không có nhu cầu đó thì dùng `synchronized`.

## 13. `ReadWriteLock` dùng khi nào? Có điểm yếu nào?

**Câu hỏi:** Một cache đọc rất nhiều, ghi hiếm. Bạn muốn nhiều reader chạy parallel. `ReadWriteLock` có vẻ hợp, nhưng một thread giữ lock đọc rồi xin lock ghi thì treo mãi. Vì sao, và khi nào không nên dùng nó?

**Gợi ý suy luận:**

- Nhiều thread đọc cùng lúc có làm hỏng dữ liệu không? Ghi thì sao?
- Lock ghi cần ai nhả hết trước khi lấy được? Nếu chính thread đó đang giữ lock đọc thì ai nhả?
- Quản lý hai loại lock tốn thêm gì, và khi nào chi phí đó lớn hơn lợi ích?

**Lập luận:** Đọc đồng thời không làm hỏng dữ liệu, chỉ ghi cần độc quyền, nên `ReadWriteLock` cho nhiều reader parallel và writer độc quyền. Lock ghi chờ **mọi** reader nhả; thread xin nâng cấp lại là một reader nên tự chờ chính mình, dẫn đến deadlock. Việc quản lý hai lock có chi phí, nên chỉ đáng khi vùng đọc đủ dài và đọc áp đảo ghi. Điểm dễ nhầm là dùng `ReadWriteLock` mọi nơi vì "đọc nhiều": chi phí quản lý hai lock thường lớn hơn lợi ích nếu vùng đọc ngắn, và với đọc cực nhiều thì `StampedLock` (đọc lạc quan) hoặc cấu trúc bất biến thay thế (copy-on-write) còn nhanh hơn. Khi review, tìm đoạn đang giữ lock đọc mà gọi code ghi, vì đó là chỗ treo.

**Đáp án ngắn:** Hợp cho cache, bảng cấu hình đọc nhiều ghi ít. Điểm yếu: không nâng cấp được lock đọc lên ghi (dễ deadlock), có thể đói writer, ghi nhiều thì chậm hơn lock thường.

**Ví dụ:** hai reader cùng giữ lock đọc; sau đó thử nâng cấp (giữ lock đọc rồi xin lock ghi).

```java
rw.readLock().lock();
// nâng cấp: false
try { boolean up = rw.writeLock().tryLock(500, TimeUnit.MILLISECONDS); }
finally { rw.readLock().unlock(); }
```

```text
2 reader cung giu khoa doc luc 8 ms
2 reader cung giu khoa doc luc 10 ms
giu khoa doc roi xin khoa ghi (nang cap) -> false (lock() thuong se treo mai, tu deadlock)
ha khoa doc roi moi lay khoa ghi -> true
```

_Đã chạy thử trên JDK 11._ Hai reader chồng lấn thật (cả hai in ở khoảng 8 đến 10 ms). Khi một thread đang giữ lock đọc xin lock ghi, lock ghi cần **mọi** reader nhả, mà reader duy nhất chính là nó nên chờ vĩnh viễn (ở đây dùng `tryLock` có timeout để tránh treo thật). Cách đúng: nhả lock đọc rồi mới xin lock ghi, và **kiểm tra lại điều kiện** vì giữa hai lần có thể có ai đã sửa.

**Hỏi xoáy 1: Còn `StampedLock`?**
Vì sao hỏi tiếp: Chi phí quản lý lock khiến người ta tìm cách đọc không lock, nên hỏi về `StampedLock` và đọc lạc quan.

**Đáp:** Có chế độ **đọc lạc quan** (`tryOptimisticRead` + `validate`): đọc không lock rồi kiểm tra xem có ghi nào xen vào không, cực rẻ khi đọc nhiều. Đổi lại không reentrant, API dễ dùng sai.

**Hỏi xoáy 2: Có nên thay bằng cách khác?**
Vì sao hỏi tiếp: Nếu lock đọc-ghi vẫn phức tạp, câu tiếp theo là hướng khác: có cấu trúc nào tránh lock hẳn không?

**Đáp:** Thường thử trước `ConcurrentHashMap` hoặc cấu trúc bất biến thay thế nguyên khối (copy-on-write toàn bộ tham chiếu `volatile`).

**Sai lầm hay gặp:** Dùng `ReadWriteLock` cho vùng đọc rất ngắn: chi phí lấy lock lớn hơn việc cần bảo vệ.

**Nhớ:** `ReadWriteLock` hợp khi đọc áp đảo; không nâng cấp đọc lên ghi; nhả lock đọc rồi lấy lock ghi và kiểm tra lại điều kiện.

## 14. Tắt dịch vụ (graceful shutdown) đúng cách?

**Câu hỏi:** Process nhận lệnh tắt khi vẫn còn 6 tác vụ đang chạy hoặc xếp hàng trong pool. Cắt phăng thì mất dữ liệu, chờ mãi thì treo. Bạn tắt đúng cách thế nào?

**Gợi ý suy luận:**

- Việc đầu tiên: ngăn việc mới vào, để pool không nhận thêm.
- Việc đang chạy cần bao nhiêu thời gian, và chờ tối đa bao lâu là hợp lý (`awaitTermination`)?
- Quá hạn mà vẫn chưa xong thì lấy gì để ép dừng (interrupt, liên hệ câu 5 và 6), và việc chưa chạy xử lý ra sao?

**Lập luận:** Tắt hợp lệ có ba giai đoạn: (1) **ngừng nhận việc mới** (`shutdown`), (2) **cho việc đang chạy thời gian hoàn tất** (`awaitTermination`), (3) nếu quá hạn thì **ép dừng** bằng interrupt (`shutdownNow`), việc này chỉ hiệu quả khi tác vụ xử lý interrupt đúng. `shutdownNow` còn trả về danh sách tác vụ chưa chạy để ghi lại hoặc chạy bù. Cắt phăng mất dữ liệu, chờ vô hạn thì treo, nên cần cả hạn chót lẫn bước ép dừng. Điểm dễ nhầm là chỉ gọi `shutdownNow()` ngay (mất việc đang dở) hoặc chỉ `shutdown()` mà không `awaitTermination` (process thoát trước khi tác vụ xong). Trong Spring Boot, bật `server.shutdown=graceful` và `spring.lifecycle.timeout-per-shutdown-phase`, và nhớ tác vụ phải xử lý interrupt thì bước ép dừng mới có tác dụng; đặt hạn chót ngắn hơn thời gian orchestrator chờ trước khi gửi SIGKILL.

**Đáp án ngắn:** `shutdown()` rồi `awaitTermination(timeout)`; nếu chưa xong thì `shutdownNow()` và `awaitTermination` lần nữa.

**Ví dụ:** pool 2 thread, 6 tác vụ mỗi cái 500 ms; `shutdown()`, thử nộp thêm việc, chờ 700 ms rồi `shutdownNow()`.

```java
pool.shutdown();
if (!pool.awaitTermination(700, TimeUnit.MILLISECONDS)) {
    List<Runnable> pending = pool.shutdownNow();
}
```

```text
sau shutdown(): nhan viec moi -> RejectedExecutionException
tac vu 2 xong
tac vu 1 xong
awaitTermination(700ms) = false (con viec trong hang doi)
shutdownNow(): tra ve 2 tac vu chua chay
tac vu 3 bi ngat giua chung
tac vu 4 bi ngat giua chung
isTerminated = true
```

_Đã chạy thử trên JDK 11._ Sau `shutdown()` pool không nhận việc mới nhưng vẫn chạy hết việc đã nhận; 700 ms không đủ (6 việc × 500 ms / 2 thread = 1,5 s) nên `shutdownNow()` ngắt hai tác vụ đang chạy (3, 4) và trả về **2 tác vụ chưa từng chạy** (5, 6) để bạn ghi lại hoặc chạy bù.

**Hỏi xoáy 1: Trong Spring Boot thì làm thế nào?**
Vì sao hỏi tiếp: Quy trình này áp dụng cho pool tự quản, nên hỏi: trong Spring Boot thì cấu hình thế nào?

**Đáp:** Bật `server.shutdown=graceful` (ngừng nhận request mới, chờ request đang chạy, thời hạn `spring.lifecycle.timeout-per-shutdown-phase`), và với `ThreadPoolTaskExecutor` đặt `waitForTasksToCompleteOnShutdown` và `awaitTerminationSeconds`; đóng pool tự quản trong `@PreDestroy`.

**Hỏi xoáy 2: Vì sao JVM không thoát dù `main` đã xong?**
Vì sao hỏi tiếp: Quên `shutdown` có hậu quả thấy được ngay, nên hỏi: vì sao JVM không thoát dù `main` đã xong?

**Đáp:** Còn thread **non-daemon** (thread của pool mặc định là non-daemon). JVM chỉ thoát khi mọi thread non-daemon kết thúc. Quên `shutdown` là lỗi kinh điển. Shutdown hook chạy khi JVM nhận tín hiệu tắt nhưng chỉ nên làm việc ngắn.

**Sai lầm hay gặp:** Chỉ gọi `shutdownNow()` ngay (mất việc đang chạy) hoặc chỉ `shutdown()` mà không `awaitTermination` (process thoát trước khi việc xong).

**Nhớ:** Shutdown ba bước: ngừng nhận, chờ có hạn, ép dừng bằng interrupt; thread non-daemon giữ JVM sống.

## 15. Virtual threads (Java 21) dùng khi nào? Có điều cần tránh nào?

**Câu hỏi:** Server thread-per-request bị giới hạn ở vài nghìn kết nối dù CPU gần như rảnh. Virtual thread (Java 21) giải quyết điều gì, vì sao nó không làm tác vụ tính toán nhanh hơn, và có bẫy nào?

**Gợi ý suy luận:**

- Một platform thread tốn bao nhiêu stack, và phần lớn thời gian nó làm gì (chờ I/O)?
- Nếu thread do JVM lập lịch và tháo ra khỏi carrier khi chặn thì carrier làm gì tiếp?
- Với tác vụ CPU-bound, số nhân có đổi không (liên hệ câu 4)?
- Khi virtual thread không tháo được khỏi carrier (khối `synchronized`, native), chuyện gì xảy ra?

**Lập luận:** Platform thread tốn ~1 MB stack và là tài nguyên khan hiếm của OS, mà phần lớn thời gian thread chỉ chờ I/O, nên thread-per-request nghẽn ở hàng nghìn kết nối. Virtual thread do **JVM** lập lịch, rất nhẹ, gắn vào *carrier thread* khi chạy và **tháo ra** khi gặp lệnh chặn để carrier chạy việc khác. Nhờ vậy giữ được mã chặn tuần tự dễ đọc mà đạt hàng trăm nghìn tác vụ chờ đồng thời. CPU không đổi nên tác vụ CPU-bound vẫn bị giới hạn bởi số nhân. Còn nếu không tháo ra được (pinning) thì carrier bị giữ và lợi thế mất. Điểm dễ nhầm là tạo pool virtual thread như pool thread thường: chúng rẻ nên tạo một cái cho mỗi tác vụ (`Executors.newVirtualThreadPerTaskExecutor()`), còn giới hạn đồng thời đặt bằng `Semaphore` theo tài nguyên hạ nguồn. Khi review, tìm `synchronized` bao quanh I/O (pinning ở Java 21, đổi sang `ReentrantLock`), `ThreadLocal` lớn, và cuộc gọi native chặn lâu.

**Đáp án ngắn:** Hợp với tác vụ I/O-bound, mỗi yêu cầu một virtual thread. Không gom vào pool; giới hạn tài nguyên hạ nguồn bằng `Semaphore`; tránh `ThreadLocal` lớn; cẩn thận pinning.

**Ví dụ (Java 21):**

```java
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    // mỗi request một virtual thread
    for (var req : requests) exec.submit(() -> handle(req));
}
```

_Minh họa, chưa chạy thử trong môi trường này (cần Java 21; sandbox dùng JDK 11)._ Kiểm chứng trên máy bạn bằng cách so sánh: 10.000 tác vụ `Thread.sleep(1000)` chạy trong ~1 giây với virtual threads, còn với `newFixedThreadPool(200)` mất ~50 giây (10.000/200 × 1 s). Hiệu ứng này giống hệt ví dụ I/O-bound ở câu 4 (thêm "thread" làm giảm thời gian tuyến tính khi tác vụ chỉ chờ), chỉ khác là virtual thread làm được với số lượng không thể đạt bằng platform thread.

**Hỏi xoáy 1: Pinning là gì?**
Vì sao hỏi tiếp: Điều kiện để virtual thread tháo ra được là then chốt, nên hỏi trực tiếp: pinning là gì và xử lý thế nào?

**Đáp:** Khi virtual thread block bên trong khối `synchronized` (Java 21) hoặc đang gọi native code, nó không tháo ra được khỏi carrier, nên carrier bị giữ và throughput giảm, thậm chí cạn carrier. Giải pháp: đổi sang `ReentrantLock` cho vùng chặn lâu; phát hiện bằng JFR event `jdk.VirtualThreadPinned`. Các bản Java mới hơn đã cải thiện với `synchronized`, hãy kiểm tra theo phiên bản bạn dùng.

**Hỏi xoáy 2: Có cần giới hạn đồng thời không khi đã có virtual thread?**
Vì sao hỏi tiếp: Virtual thread rẻ nên dễ tạo quá nhiều, nên hỏi: có còn cần giới hạn đồng thời với tài nguyên hạ nguồn không?

**Đáp:** Có. 100.000 virtual thread cùng gọi một DB chỉ có 20 kết nối vẫn làm DB sập hoặc xếp hàng vô tận; giới hạn bằng `Semaphore` hoặc kích thước connection pool. Xem [Virtual Threads và Structured Concurrency](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md) và [Đồng thời trong Spring Boot](/go?p=01-Spring-Boot%2Fhard%2Flt-22-concurrency-virtual-threads.md).

**Sai lầm hay gặp:** Gom virtual thread vào `newFixedThreadPool`-kiểu pool (mất hết lợi thế), hoặc kỳ vọng nó tăng tốc tác vụ tính toán.

**Nhớ:** Virtual thread mở rộng số tác vụ chờ I/O, không tăng tốc CPU; giới hạn đồng thời vẫn cần và tránh pinning.

Nguồn: Java Concurrency in Practice (Goetz), kết hợp ghi chú trong docs.

