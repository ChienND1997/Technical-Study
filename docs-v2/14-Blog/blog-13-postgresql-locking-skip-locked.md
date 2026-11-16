# PostgreSQL Bài 31: Hệ thống khóa chuyên sâu

> Nguồn: [Viblo](https://viblo.asia/p/postgresql-bai-31-he-thong-khoa-chuyen-sau-table-locks-row-locks-advisory-locks-oKLnqjbaJQO) · Tác giả: HUy Hoàng · Đăng ngày: thg 10 16 · Thẻ: PostgreSQL
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Dù MVCC cho phép đọc và ghi không chặn nhau, PostgreSQL vẫn có một hệ thống khóa riêng để bảo vệ cấu trúc bảng và hỗ trợ các nghiệp vụ cần khóa bi quan. Bài viết chia thành ba tầng: khóa bảng, khóa dòng và advisory lock, kèm các tình huống thực tế trên production.

## Ý chính

- Mọi câu lệnh đều xin khóa mức bảng. SELECT chỉ xin khóa rất nhẹ, còn ALTER TABLE hoặc DROP TABLE xin khóa độc quyền chặn tất cả mọi thao tác khác.
- Nguy cơ lớn là hàng đợi khóa: một ALTER TABLE đang chờ sẽ khiến mọi truy vấn đến sau bị chặn theo, làm hệ thống đứng chỉ sau vài giây.
- CREATE INDEX CONCURRENTLY và VACUUM thường dùng loại khóa không chặn đọc ghi nên an toàn hơn trên môi trường chạy thật.
- Khóa dòng bằng SELECT ... FOR UPDATE giúp tránh race condition khi trừ tiền hoặc tồn kho; FOR NO KEY UPDATE nhẹ hơn và phù hợp phần lớn trường hợp.
- NOWAIT báo lỗi ngay thay vì chờ, còn SKIP LOCKED bỏ qua các dòng đang bị khóa, rất hợp để xây hàng đợi công việc cho nhiều worker.
- Advisory lock là khóa theo tên hoặc số do ứng dụng định nghĩa, dùng để đảm bảo cronjob chỉ chạy trên một instance; khóa tự nhả khi kết nối đứt.

## Kinh nghiệm rút ra

Trước khi chạy thay đổi cấu trúc bảng trên hệ thống đang tải cao, hãy đặt thời gian chờ khóa hợp lý và chọn thời điểm ít truy cập để tránh kẹt hàng đợi. Với Spring Boot, khi cần xử lý tác vụ nền từ bảng, có thể dùng SKIP LOCKED thay vì dựng thêm hạ tầng, nhưng cần cân nhắc quy mô. Chủ đề này thuộc mảng Database và Backend của KemTech.

## Đọc bản gốc

[PostgreSQL Bài 31: Hệ thống khóa chuyên sâu: Table Locks, Row Locks, Advisory Locks](https://viblo.asia/p/postgresql-bai-31-he-thong-khoa-chuyen-sau-table-locks-row-locks-advisory-locks-oKLnqjbaJQO)

**Tóm tắt:**
- ALTER TABLE xin khóa mạnh nhất và có thể kẹt cả hàng đợi truy vấn.
- FOR UPDATE kết hợp SKIP LOCKED cho phép nhiều worker lấy việc không đụng nhau.
- Advisory lock thay thế khóa phân tán đơn giản, tự nhả khi mất kết nối.

