# Top Các Lỗ Hổng Bảo Mật (1) SQL Injection

> Nguồn: [Viblo](https://viblo.asia/p/top-cac-lo-hong-bao-mat-1-sql-injection-aAY4q7jQLPw) · Tác giả: NGUYỄN ANH TUẤN · Đăng ngày: thg 7 5, 2024 · Thẻ: Sql Injection, JavaScript, Node.js, Security
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài mở đầu loạt về các lỗ hổng bảo mật, tập trung vào SQL Injection trong ứng dụng Node.js Express. Tác giả giải thích cơ chế, các dạng tấn công phổ biến, các biện pháp phòng chống và một ví dụ dự án mẫu theo hướng an toàn.

## Ý chính

- SQL Injection xảy ra khi dữ liệu người dùng được ghép thẳng vào câu truy vấn mà không kiểm soát, khiến cấu trúc câu lệnh bị thay đổi. Hậu quả gồm lộ dữ liệu nhạy cảm, sửa hoặc xóa dữ liệu, thậm chí mất quyền kiểm soát máy chủ.
- Bài phân biệt ba dạng: dựa vào thông báo lỗi, dựa vào toán tử UNION, và dạng mù khi ứng dụng không phản hồi trực tiếp mà kẻ tấn công suy luận từ phản ứng gián tiếp.
- Phòng chống cốt lõi: không tin đầu vào, dùng câu lệnh có tham số (prepared statement) để dữ liệu luôn được coi là dữ liệu chứ không phải mã SQL.
- Các lớp bổ trợ gồm ORM như Sequelize, kiểm tra và làm sạch đầu vào bằng thư viện validate, stored procedure, và cấp cho tài khoản database quyền tối thiểu.
- WAF, rate limit hay header bảo mật chỉ là lớp phòng thủ phụ, không thay thế việc viết truy vấn đúng. Tác giả cũng liệt kê công cụ kiểm thử và nhắc chỉ quét hệ thống mình có quyền.

## Kinh nghiệm rút ra

Khi review code backend, hãy soi những chỗ dùng template string để dựng câu SQL và thay bằng tham số hóa; đừng chỉ dựa vào việc lọc ký tự. Đặt tài khoản kết nối database ở mức quyền thấp nhất, bật kiểm tra bảo mật trong CI/CD. Dù bài dùng Node.js, nguyên tắc áp dụng y hệt với Spring Boot hay bất kỳ stack nào. Chủ đề thuộc mảng Security và Database của KemTech.

## Đọc bản gốc

[Top Các Lỗ Hổng Bảo Mật (1) SQL Injection](https://viblo.asia/p/top-cac-lo-hong-bao-mat-1-sql-injection-aAY4q7jQLPw)

**Tóm tắt:**
- SQL Injection đến từ việc ghép chuỗi đầu vào vào câu truy vấn.
- Truy vấn có tham số là phòng tuyến chính, kèm ORM và validate.
- Giới hạn quyền database và dùng WAF làm lớp bảo vệ bổ sung.

