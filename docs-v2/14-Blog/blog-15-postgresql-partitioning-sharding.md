# PostgreSQL Bài 37: Table Partitioning và Sharding

> Nguồn: [Viblo](https://viblo.asia/p/postgresql-bai-37-kien-truc-phan-manh-du-lieu-table-partitioning-phan-vung-va-sharding-K9Vy8OjbLQR) · Tác giả: HUy Hoàng · Đăng ngày: thg 10 17 · Thẻ: PostgreSQL
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Khi một bảng như orders hay logs lên tới hàng trăm triệu dòng, index thông thường không còn đủ. Bài viết giới thiệu hai hướng chia để trị: phân vùng bảng trên một máy chủ và sharding trên nhiều máy chủ, cùng điều kiện nên dùng từng hướng.

## Ý chính

- Bảng quá lớn gây hai vấn đề: index không còn vừa bộ nhớ nên cache miss tăng, và các tác vụ bảo trì như VACUUM, tạo index hay xóa dữ liệu cũ trở nên rất lâu.
- Partitioning chia một bảng logic thành nhiều bảng con trên cùng máy; ứng dụng vẫn truy vấn bảng cha và Postgres tự định tuyến dữ liệu.
- Có ba kiểu phân vùng: theo khoảng (thời gian hoặc dải số), theo danh sách giá trị (quốc gia, tenant) và theo băm để dàn đều tải.
- Partition pruning cho phép planner bỏ qua các phân vùng không liên quan khi điều kiện lọc dùng đúng cột phân vùng, nhờ đó giảm mạnh lượng dữ liệu phải quét.
- Xóa dữ liệu cũ chỉ cần gỡ hoặc drop một phân vùng, xong trong vài mili-giây, không sinh bloat hay lượng WAL lớn như câu DELETE hàng loạt.
- Sharding rải dữ liệu lên nhiều máy, thường qua postgres_fdw hoặc extension Citus; phù hợp SaaS đa tenant nhưng phức tạp hơn nhiều, nhất là JOIN và giao dịch phân tán.

## Kinh nghiệm rút ra

Thứ tự hợp lý khi dữ liệu phình to là tối ưu index và truy vấn trước, sau đó tới partitioning, và chỉ chọn sharding khi một máy chủ thật sự không đáp ứng nổi. Khi thiết kế bảng log hoặc giao dịch trong ứng dụng Spring Boot, nên chọn cột phân vùng trùng với điều kiện lọc phổ biến và lên kế hoạch tạo phân vùng mới trước khi hết hạn. Chủ đề này thuộc mảng Database và Backend của KemTech.

## Đọc bản gốc

[PostgreSQL Bài 37: Kiến trúc phân mảnh dữ liệu: Table Partitioning (Phân vùng) và Sharding](https://viblo.asia/p/postgresql-bai-37-kien-truc-phan-manh-du-lieu-table-partitioning-phan-vung-va-sharding-K9Vy8OjbLQR)

**Tóm tắt:**
- Phân vùng chia bảng lớn thành bảng con, planner chỉ quét phần liên quan.
- Drop một phân vùng cũ nhanh hơn nhiều so với DELETE hàng loạt.
- Sharding chỉ nên dùng khi một máy chủ không còn đủ sức.

