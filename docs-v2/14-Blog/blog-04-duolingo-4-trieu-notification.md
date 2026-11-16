# Con chim xanh Duolingo và bài toán gửi 4 triệu notification trong 5s

> Nguồn: [Viblo](https://viblo.asia/p/con-chim-xanh-duolingo-va-bai-toan-gui-4-trieu-notification-trong-5s-qPoL7RraJvk) · Tác giả: Sydexa · Đăng ngày: thg 7 13, 2024 · Thẻ: System Design, AWS, Backend, Push notification
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài kể lại cách đội kỹ sư Duolingo xây hệ thống đẩy thông báo tới khoảng 4 triệu người dùng gần như tức thì khi quảng cáo của hãng lên sóng Super Bowl. Mục tiêu là khoảng 800.000 thông báo mỗi giây, gấp 80 lần công suất cũ. Tác giả giải thích kiến trúc trên AWS, cách kiểm thử và một chi tiết thú vị về nút bấm kích hoạt.

## Ý chính

- Thời điểm quảng cáo phát sóng không đoán trước được, nên hệ thống chỉ chạy khi nhân viên marketing bấm một nút thủ công; mọi dữ liệu phải được chuẩn bị sẵn từ trước.
- Chuẩn bị theo giai đoạn: vài tháng trước lấy danh sách người nhận từ DynamoDB rồi lưu vào S3; vài giờ trước tăng số worker trên ECS và nạp dữ liệu (kèm ánh xạ user - thiết bị) vào bộ nhớ.
- Khi bấm nút, API đẩy message vào hàng đợi FIFO. Loại hàng đợi này khử trùng lặp theo ID nên hai người bấm cùng lúc cũng không làm người dùng nhận thông báo hai lần.
- Để vượt giới hạn tốc độ của SQS, họ gộp nhiều người dùng (500 iOS hoặc 250 Android) vào một message, rồi các worker gọi APNS và FCM để gửi.
- Kiểm thử gồm tìm điểm nghẽn (hệ thống Python vướng GIL nên phải chỉnh số thread) và chạy thử với người dùng thật tăng dần từ 1 triệu lên 4 triệu. Ngoài ra có "Zombie mode" giúp app giảm request về backend khi tải đột biến.
- Kết quả: 99% thông báo được gửi trong 5,7 giây. Nút được đổi từ tròn sang vuông vì vùng nhận cú bấm vốn là hình vuông, tránh nhầm lẫn.

## Kinh nghiệm rút ra

Với thông báo hàng loạt, hãy tách việc nặng (tính danh sách, nạp cache) ra khỏi thời điểm phát, dùng hàng đợi để chống gửi trùng và gộp batch để vượt giới hạn dịch vụ. Cũng cần tính đến việc người dùng đồng loạt mở app tạo ra làn sóng request ngược. Chủ đề gắn với Distributed Systems và DevOps (scale worker, kiểm thử tải).

## Đọc bản gốc

[Con chim xanh Duolingo và bài toán gửi 4 triệu notification trong 5s](https://viblo.asia/p/con-chim-xanh-duolingo-va-bai-toan-gui-4-trieu-notification-trong-5s-qPoL7RraJvk)

**Tóm tắt:**
- Chuẩn bị dữ liệu sớm, scale worker trước, phát thông báo qua hàng đợi.
- FIFO khử trùng lặp, gộp batch để vượt giới hạn SQS.
- Thử tải tăng dần; 99% thông báo tới nơi trong 5,7 giây.

