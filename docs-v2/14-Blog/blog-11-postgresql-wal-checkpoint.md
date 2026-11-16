# PostgreSQL Bài 33: Cơ chế WAL, Checkpoint và Crash Recovery

> Nguồn: [Viblo](https://viblo.asia/p/postgresql-bai-33-co-che-wal-write-ahead-logging-checkpoint-va-kien-truc-khoi-phuc-tham-hoa-crash-recovery-13VM9dw5VY7) · Tác giả: HUy Hoàng · Đăng ngày: thg 10 16 · Thẻ: PostgreSQL
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài viết giải thích cách PostgreSQL giữ lời hứa "đã COMMIT là không mất dữ liệu" mà vẫn chạy nhanh. Tác giả đi từ luồng dữ liệu trong bộ nhớ, đến nhật ký ghi trước (WAL), tiến trình checkpoint, rủi ro trang bị rách và cuối cùng là quy trình hồi phục sau khi máy chủ sập nguồn.

## Ý chính

- Khi cập nhật, Postgres sửa trang dữ liệu ngay trên RAM (trang này gọi là dirty page) chứ không ghi thẳng xuống file dữ liệu, vì ghi ngẫu nhiên xuống đĩa rất chậm.
- Quy tắc WAL: mọi thay đổi phải được ghi vào nhật ký và đẩy xuống đĩa trước khi báo COMMIT thành công. Nhật ký chỉ ghi nối tiếp nên nhanh hơn nhiều so với ghi rải rác.
- Checkpoint định kỳ đẩy các dirty page xuống đĩa, đánh dấu mốc, cho phép dọn hoặc tái dùng file WAL cũ và rút ngắn thời gian khởi động lại.
- Để tránh dồn tải I/O, có thể tăng khoảng cách giữa các checkpoint và dàn trải việc ghi đĩa qua hai tham số checkpoint_timeout và checkpoint_completion_target.
- Trang dữ liệu 8 KB có thể bị ghi dở nếu mất điện giữa chừng (torn page). Cơ chế full page writes lưu cả ảnh trang vào WAL ở lần sửa đầu tiên sau checkpoint để sửa lỗi này.
- Khi khởi động sau sự cố, Postgres đọc mốc checkpoint gần nhất rồi phát lại (redo) WAL đến cuối để dựng lại trạng thái trước lúc sập.

## Kinh nghiệm rút ra

Hiểu WAL giúp ta giải thích được nhiều hiện tượng khi vận hành: vì sao ổ đĩa chứa WAL nên nhanh, vì sao thời gian phục hồi phụ thuộc khoảng cách checkpoint, và vì sao WAL còn là nền tảng của replication và backup theo thời điểm. Khi tinh chỉnh hệ thống, hãy cân bằng giữa tải I/O đỉnh và thời gian phục hồi thay vì chỉ chạy theo tốc độ ghi. Chủ đề này thuộc mảng Database và liên quan tới DevOps của KemTech.

## Đọc bản gốc

[PostgreSQL Bài 33: Cơ chế WAL (Write-Ahead Logging), Checkpoint và kiến trúc khôi phục thảm họa](https://viblo.asia/p/postgresql-bai-33-co-che-wal-write-ahead-logging-checkpoint-va-kien-truc-khoi-phuc-tham-hoa-crash-recovery-13VM9dw5VY7)

**Tóm tắt:**
- WAL ghi tuần tự xuống đĩa trước COMMIT, đảm bảo bền vững mà vẫn nhanh.
- Checkpoint xả dirty page định kỳ, giúp dọn WAL và phục hồi nhanh.
- Sau sự cố, Postgres redo WAL từ mốc checkpoint; full page writes chữa trang rách.

