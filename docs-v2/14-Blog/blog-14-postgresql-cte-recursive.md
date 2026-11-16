# PostgreSQL Bài 44: CTE và truy vấn đệ quy

> Nguồn: [Viblo](https://viblo.asia/p/postgresql-bai-44-common-table-expressions-cte-va-truy-van-de-quy-recursive-queries-RlL5eOjwLbB) · Tác giả: HUy Hoàng · Đăng ngày: thg 10 17 · Thẻ: PostgreSQL
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài viết hướng dẫn dùng Common Table Expressions để viết SQL phức tạp theo từng khối dễ đọc, rồi mở rộng sang WITH RECURSIVE để duyệt dữ liệu dạng cây như danh mục sản phẩm. Tác giả cũng nhắc tới những chi tiết hiệu năng và cạm bẫy khi dùng.

## Ý chính

- CTE là bảng kết quả tạm có tên, chỉ sống trong một câu lệnh. So với subquery lồng nhau, CTE cho phép đọc từ trên xuống dưới và có thể nối nhiều bước liên tiếp.
- PostgreSQL cho phép đặt INSERT, UPDATE, DELETE trong CTE cùng mệnh đề RETURNING, nên có thể chuyển dữ liệu từ giỏ hàng sang đơn hàng trong một câu lệnh nguyên tử, đỡ vòng đi vòng lại giữa backend và database.
- Từ PostgreSQL 12, CTE chỉ được tham chiếu một lần sẽ được gộp vào truy vấn chính để tận dụng index; nếu dùng từ hai lần trở lên thì được tính trước và lưu tạm. Có thể ép hành vi bằng MATERIALIZED hoặc NOT MATERIALIZED.
- WITH RECURSIVE gồm phần khởi tạo chạy một lần và phần đệ quy tự tham chiếu, lặp cho đến khi không còn dòng mới. Cách này giải quyết cây có độ sâu không biết trước mà JOIN thông thường không làm được.
- Hai bài toán mẫu là lấy toàn bộ cây con từ một nút gốc và dựng đường dẫn breadcrumb từ nút lá ngược lên gốc.
- Dữ liệu bị vòng lặp sẽ khiến truy vấn chạy vô hạn, vì vậy nên kèm bộ đếm độ sâu và đặt giới hạn cứng.

## Kinh nghiệm rút ra

Khi gặp báo cáo SQL dài, hãy tách thành các CTE có tên rõ nghĩa để dễ review và debug. Với dữ liệu cha con như menu hay danh mục, truy vấn đệ quy thường gọn hơn việc lặp truy vấn trong code Java. Đừng quên đo bằng EXPLAIN, vì hành vi materialize có thể ảnh hưởng tốc độ. Chủ đề này thuộc mảng Database của KemTech.

## Đọc bản gốc

[PostgreSQL Bài 44: Common Table Expressions (CTE) và Truy vấn đệ quy (Recursive Queries)](https://viblo.asia/p/postgresql-bai-44-common-table-expressions-cte-va-truy-van-de-quy-recursive-queries-RlL5eOjwLbB)

**Tóm tắt:**
- CTE làm SQL phức tạp dễ đọc, và PostgreSQL cho phép cả thao tác ghi dữ liệu.
- Từ bản 12, CTE dùng một lần được gộp vào truy vấn chính.
- WITH RECURSIVE duyệt cây; luôn giới hạn độ sâu để tránh vòng lặp vô hạn.

