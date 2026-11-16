# Spring đón Virtual Threads: lập trình blocking mà vẫn scale như non-blocking

> Nguồn: [Spring Blog](https://spring.io/blog/2022/10/11/embracing-virtual-threads) · Tác giả: Mark Paluch · Đăng ngày: 11 thg 10, 2022 · Thẻ: Java, Spring Boot, concurrency, hiệu năng
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài viết của đội Spring giới thiệu cách framework chuẩn bị đón Virtual Threads (khi đó mới chỉ là tính năng preview từ Project Loom trên Java 19). Vấn đề cốt lõi mà virtual thread giải quyết: code Spring MVC truyền thống viết theo kiểu blocking (gọi database, gọi HTTP, đọc file đều là lệnh đồng bộ, dễ đọc dễ debug), nhưng mỗi request lại chiếm một thread hệ điều hành (platform thread) tốn bộ nhớ, nên số request đồng thời bị giới hạn bởi số thread tạo được. Đó là lý do nhiều đội phải chuyển sang lập trình bất đồng bộ (WebFlux, reactive) để scale cao hơn — nhưng đổi lại code khó đọc, khó debug hơn hẳn.

## Ý chính

- Virtual thread là thread "ảo", cực nhẹ để tạo (có thể tạo hàng triệu cái), được JVM tự quản lý bên trên một số lượng nhỏ platform thread thật (gọi là carrier thread). Khi một virtual thread bị block (chờ I/O), nó tự "nhường chỗ" để carrier thread phục vụ việc khác, giống hệt cách một HTTP client bất đồng bộ nhường CPU cho tác vụ khác.
- Hệ quả: lập trình kiểu blocking truyền thống (dễ viết, dễ đọc) bỗng có khả năng scale gần như lập trình bất đồng bộ, vì số lượng thread không còn là giới hạn chính nữa — giới hạn thật sự chuyển về số kết nối còn trống trong connection pool, bộ nhớ, và CPU.
- Nhiều chỗ "khóa" vốn chặn cả carrier thread trước đây (như `ReentrantLock`, `CountDownLatch`, `Future.get()`) đã được JDK cập nhật để hoạt động tốt với virtual thread, không còn chặn nhầm carrier thread bên dưới.
- Có một cái bẫy gọi là "pinning": nếu code dùng từ khóa `synchronized` bao quanh một đoạn gọi I/O blocking, virtual thread bên trong đó sẽ bị "ghim" chặt vào carrier thread, mất hết lợi ích nhẹ nhàng của virtual thread. Đội Spring xác nhận họ đang rà lại các chỗ dùng `synchronized` quanh I/O trong chính framework để tránh bẫy này.
- Để bật virtual thread cho Spring Boot (thời điểm bài viết, còn ở dạng cấu hình tay), cần khai báo một `AsyncTaskExecutor` dùng `Executors.newVirtualThreadPerTaskExecutor()` cho tầng xử lý task, và một `TomcatProtocolHandlerCustomizer` để Tomcat xử lý mỗi request servlet trên một virtual thread riêng.

## Kinh nghiệm rút ra

Virtual thread không phải phép màu cho mọi bài toán — nó chỉ thực sự có lợi khi ứng dụng bị giới hạn bởi I/O (gọi database, gọi service khác), và vẫn cần kiểm tra kỹ các đoạn `synchronized` quanh I/O để tránh bị pinning. Với ứng dụng CPU-bound hoặc đã dùng reactive triệt để, lợi ích sẽ ít rõ ràng hơn. Chủ đề gần với Spring Boot (concurrency, virtual threads) và Java Concurrency.

## Đọc bản gốc

[Embracing Virtual Threads](https://spring.io/blog/2022/10/11/embracing-virtual-threads)

**Tóm tắt:**
- Virtual thread là thread cực nhẹ do JVM quản lý, chạy trên một số ít platform thread thật.
- Code blocking truyền thống nay có thể scale cao mà không cần viết lại theo kiểu reactive.
- JDK đã cập nhật nhiều API khóa để không chặn nhầm carrier thread khi dùng virtual thread.
- Bẫy "pinning" xảy ra khi `synchronized` bao quanh I/O blocking — cần rà soát trước khi áp dụng.
