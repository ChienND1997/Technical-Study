# Câu hỏi phỏng vấn: Java Concurrency & Đa luồng

## 1. ThreadLocal và Nguy cơ Rò rỉ bộ nhớ (Memory Leak)

**Câu hỏi:** `ThreadLocal` hoạt động như thế nào trong Java? Tại sao khi sử dụng `ThreadLocal` trong môi trường Thread Pool (như Tomcat, ExecutorService) bắt buộc phải gọi phương thức `remove()`?

**Đáp an ngắn:** `ThreadLocal` lưu trữ biến riêng biệt cho từng luồng (mỗi Thread giữ một bảng băm `ThreadLocalMap`). Trong Thread Pool, các luồng không bao giờ bị hủy mà được tái sử dụng liên tục cho các request khác nhau; nếu không gọi `remove()`, dữ liệu của request cũ sẽ tồn tại mãi trong bộ nhớ gây Rò rỉ bộ nhớ (Memory Leak) hoặc rò rỉ dữ liệu nhầm sang người dùng khác.

**Gợi ý suy luận:** Vòng đời Thread trong Pool (vĩnh viễn) vs Vòng đời Request (ngắn hạn) -> Khóa WeakReference nhưng Giá trị StrongReference -> Bắt buộc dùng `finally { tl.remove(); }`.

**Lập luận:** `ThreadLocalMap` sử dụng `WeakReference` cho Key (đối tượng ThreadLocal) nhưng lại giữ `StrongReference` cho Value (dữ liệu người dùng, SecurityContext, UserSession). Khi luồng phục vụ xong 1 HTTP request, biến ThreadLocal cục bộ bị dọn dẹp, nhưng luồng của Tomcat vẫn sống trong Pool và tiếp tục giữ tham chiếu Strong tới Value trong bảng băm của nó. Theo thời gian, hàng nghìn object phiên làm việc tích tụ trên Heap gây ra lỗi `OutOfMemoryError: Java heap space`. Hơn nữa, request tiếp theo vô tình rơi vào luồng đó có thể đọc trúng thông tin đăng nhập của người dùng trước!

**Nhớ:** Trong khối `try-finally`, luôn đặt `threadLocal.remove()` bên trong `finally` để dọn dẹp biến luồng sau mỗi request.

## 2. ReentrantLock vs Synchronized

**Câu hỏi:** So sánh từ khóa `synchronized` và lớp `ReentrantLock` trong `java.util.concurrent.locks`. Khi nào nên dùng `ReentrantLock`?

**Đáp án ngắn:** `synchronized` là tính năng cấp ngôn ngữ, tự động giải phóng lock khi hết block (an toàn, dễ dùng); còn `ReentrantLock` là class API linh hoạt hơn: hỗ trợ khóa có thời hạn chờ (`tryLock(timeout)`), khóa có thể bị ngắt (`lockInterruptibly()`), khóa công bằng (Fair Lock), và hỗ trợ nhiều biến điều kiện (`Condition`).

**Gợi ý suy luận:** Tự động mở khóa (synchronized) vs Can thiệp thủ công (ReentrantLock) -> Nhu cầu tránh Deadlock bằng timeout -> Cần phân loại thông báo theo Condition.

**Lập luận:** Với `synchronized`, nếu một luồng bị kẹt khi chờ lock, nó sẽ kẹt vĩnh viễn (không thể hủy, không thể timeout). Với `ReentrantLock`:
1. `tryLock(2, TimeUnit.SECONDS)`: Giúp tránh Deadlock, nếu sau 2 giây không lấy được khóa thì luồng chủ động hủy bỏ tác vụ và báo lỗi.
2. Hỗ trợ Fair Lock (`new ReentrantLock(true)`): Phân bổ khóa theo thứ tự hàng đợi FIFO, chống đói tài nguyên (Thread Starvation).
3. Hỗ trợ nhiều `Condition` (ví dụ `notFull` và `notEmpty` trong `ArrayBlockingQueue`), cho phép đánh thức có chọn lọc nhóm luồng Producer hoặc Consumer mà không cần đánh thức toàn bộ (khác với `notifyAll()` của synchronized).
Lưu ý: Luôn phải giải phóng `lock.unlock()` trong khối `finally`.

**Nhớ:** `synchronized` cho các tác vụ đồng bộ đơn giản; `ReentrantLock` khi cần timeout `tryLock`, fair lock hoặc quản lý nhiều Condition.

