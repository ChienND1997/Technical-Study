# PostgreSQL Bài 36: Connection Pooling và PgBouncer

> Nguồn: [Viblo](https://viblo.asia/p/postgresql-bai-36-kien-truc-connection-pooling-van-de-max-connections-va-giai-phap-voi-pgbouncer-wd43ExNrLX9) · Tác giả: HUy Hoàng · Đăng ngày: thg 10 17 · Thẻ: PostgreSQL
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Khi hệ thống mở rộng với nhiều container backend, điểm nghẽn đầu tiên của PostgreSQL thường là số lượng kết nối chứ không phải CPU hay đĩa. Bài viết giải thích vì sao lỗi "too many clients" xuất hiện và cách dùng PgBouncer làm lớp trung gian để gom kết nối.

## Ý chính

- Postgres tạo một tiến trình hệ điều hành riêng cho mỗi kết nối, mỗi tiến trình tốn vài MB RAM. Đặt max_connections lên hàng nghìn sẽ ngốn bộ nhớ và gây chuyển ngữ cảnh liên tục.
- Số kết nối thật sự hoạt động đồng thời chỉ nên ở mức vài trăm, tính xấp xỉ theo số nhân CPU và số trục đĩa.
- Pool phía ứng dụng như HikariCP chưa đủ: nếu chạy nhiều pod, mỗi pod giữ một pool thì tổng kết nối xuống database vẫn rất lớn.
- PgBouncer đứng giữa, nhận hàng nghìn kết nối logic và dồn thành số ít kết nối vật lý, request dư sẽ xếp hàng nhẹ nhàng trong bộ nhớ của nó.
- Có ba chế độ pool: session, transaction và statement. Với web hoặc API, transaction pooling thường là lựa chọn tốt nhất vì chỉ giữ kết nối trong lúc giao dịch chạy.
- Cái giá của transaction pooling là mất trạng thái phiên: prepared statement, advisory lock cấp session và các lệnh SET có thể hoạt động sai.

## Kinh nghiệm rút ra

Với ứng dụng Spring Boot, đừng chỉ nâng kích thước pool HikariCP khi gặp lỗi kết nối; hãy tính tổng kết nối của mọi instance nhân với kích thước pool và so với giới hạn của database. Nếu thêm PgBouncer, hãy kiểm tra lại các tính năng phụ thuộc session trước khi lên production. Chủ đề này gắn với mảng Database, Backend và DevOps của KemTech.

## Đọc bản gốc

[PostgreSQL Bài 36: Kiến trúc Connection Pooling, vấn đề Max Connections và giải pháp với PgBouncer](https://viblo.asia/p/postgresql-bai-36-kien-truc-connection-pooling-van-de-max-connections-va-giai-phap-voi-pgbouncer-wd43ExNrLX9)

**Tóm tắt:**
- Mỗi kết nối Postgres là một tiến trình nặng, nên không thể tăng vô hạn.
- PgBouncer gom hàng nghìn kết nối logic thành vài trăm kết nối vật lý.
- Transaction pooling hiệu quả nhất nhưng phải bỏ tính năng gắn với session.

