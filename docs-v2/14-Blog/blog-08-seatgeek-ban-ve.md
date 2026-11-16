# Bên trong hệ thống bán vé SeatGeek

> Nguồn: [Viblo](https://viblo.asia/p/ben-trong-he-thong-ban-ve-cho-ngoai-hang-anh-se-co-nhung-gi-kham-pha-he-thong-seatgeek-MG24BkoEJz3) · Tác giả: Sydexa · Đăng ngày: 28/06/2024 · Thẻ: kiến trúc microservices, System Design, Backend, Booking system
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài mô tả cách SeatGeek, nền tảng bán vé sự kiện, chịu được lượng người đổ vào cùng lúc khi mở bán các trận hoặc show lớn. Trọng tâm là một "phòng chờ ảo" xếp hàng người mua trước khi họ chạm tới hệ thống đặt vé thật.

## Ý chính

- Thách thức gồm lượng truy cập tăng vọt trong thời gian ngắn (autoscaling phản ứng không đủ nhanh), nhiều người tranh cùng một chỗ ngồi, gian lận mua gom để bán lại và trải nghiệm người dùng.
- Phòng chờ ảo có hai chế độ: chặn hết khi chưa mở bán, và xếp hàng theo thứ tự đến trước khi đã mở bán. Người mua được vào vùng bảo vệ để thanh toán khi tới lượt.
- Lớp CDN Fastly đứng trước backend, lưu trạng thái sự kiện ở biên để chuyển hướng người dùng vào phòng chờ mà không cần chạm tới máy chủ gốc. Access token cũng được kiểm tra ngay tại đây.
- Luồng xếp hàng: mỗi người nhận một visitor token, kết nối WebSocket tới API gateway, cặp token và thời điểm vào hàng được lưu ở DynamoDB. Một hàm định kỳ đổi token này lấy access token, rồi một hàm Lambda đẩy token mới tới trình duyệt qua WebSocket nhờ DynamoDB Streams.
- Mô hình leaky bucket giới hạn tốc độ cho phép vào từng vùng; khi xô đầy, người dùng bị đưa về hàng chờ và trạng thái này được cache ở CDN.
- Dùng Lambda để tách phòng chờ khỏi môi trường của sản phẩm cần bảo vệ, tránh lỗi dây chuyền. Việc đồng bộ giữa DynamoDB và dữ liệu ở CDN dùng transactional outbox, có thử lại tới khi thành công.

## Kinh nghiệm rút ra

Khi hệ thống dự kiến có đột biến tải, hãy chặn và điều tiết ở lớp ngoài cùng thay vì trông vào scale tự động. Ghi thời điểm vào hàng để đảm bảo công bằng, và tách thành phần bảo vệ khỏi thành phần được bảo vệ. Bài gắn với chủ đề Distributed Systems và Backend của KemTech.

## Đọc bản gốc

[Bên trong hệ thống bán vé cho ngoại hạng anh sẽ có những gì - Khám phá hệ thống Seatgeek](https://viblo.asia/p/ben-trong-he-thong-ban-ve-cho-ngoai-hang-anh-se-co-nhung-gi-kham-pha-he-thong-seatgeek-MG24BkoEJz3)

**Tóm tắt:**
- Phòng chờ ảo xếp hàng người mua để bảo vệ backend khi mở bán.
- CDN biên, DynamoDB và Lambda phối hợp cấp access token.
- Leaky bucket và outbox pattern giữ hệ thống ổn định, nhất quán.

