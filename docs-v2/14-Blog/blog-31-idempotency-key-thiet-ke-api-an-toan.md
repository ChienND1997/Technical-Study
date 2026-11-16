# Idempotency Key: cách Stripe thiết kế API an toàn khi gọi lại nhiều lần

> Nguồn: [Stripe Blog](https://stripe.com/blog/idempotency) · Tác giả: Brandur Leach · Đăng ngày: 22 thg 2, 2017 · Thẻ: thiết kế API, distributed systems, backend, thanh toán
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài xuất phát từ một quan sát thú vị: ngay cả khi chỉ có một client gọi một API, cặp đó vẫn là một hệ thống phân tán thu nhỏ, vì mạng có thể đứt bất cứ lúc nào. Tác giả chia lỗi mạng thành ba loại: request chưa kịp tới server (gọi lại là an toàn), request tới server nhưng server đang xử lý dở thì mất kết nối (server rơi vào trạng thái "lỡ dở", không biết đã làm xong chưa), và request xử lý xong nhưng response bị rớt trên đường về. Ở hai trường hợp sau, client không có cách nào biết chắc thao tác đã xảy ra hay chưa — gọi lại ngay có thể vô tình thực hiện thao tác đó lần thứ hai.

## Ý chính

- Một endpoint gọi là idempotent nếu gọi bao nhiêu lần cũng chỉ gây đúng một lần hiệu ứng phụ. HTTP PUT và DELETE vốn có tính chất này, nhưng một API như "tạo giao dịch thanh toán" thì không khớp với PUT/DELETE một cách tự nhiên.
- Giải pháp: client tự sinh một mã định danh duy nhất cho một thao tác logic (idempotency key) và gửi kèm mỗi lần gọi. Phía Stripe, mã này được gửi qua header `Idempotency-Key` trên các endpoint có hiệu ứng phụ (nằm dưới POST).
- Khi nhận lại đúng key đã thấy trước đó, server xử lý theo ba tình huống: nếu đây là lần đầu thấy key thì xử lý bình thường; nếu request trước đó bị đứt giữa chừng thì tiếp tục hoặc khôi phục trạng thái dở dang (nếu dùng database có ACID, có thể rollback phần dở rồi làm lại từ đầu an toàn); nếu thao tác đã xử lý xong thì trả thẳng lại chính kết quả đã lưu, không chạy lại logic nghiệp vụ.
- Việc này biến "gọi lại khi không chắc" từ một hành động nguy hiểm thành một hành động an toàn tuyệt đối — client cứ retry đến khi nào nhận được xác nhận thành công.
- Bài cũng nhắc tới cách retry nên làm cho đúng: exponential backoff (thời gian chờ tăng theo lũy thừa sau mỗi lần thất bại) kết hợp jitter (thêm độ trễ ngẫu nhiên) để tránh hiện tượng nhiều client cùng retry một lượt gây quá tải dây chuyền (thundering herd).

## Kinh nghiệm rút ra

Bất kỳ API nào có hiệu ứng phụ không thể lặp lại an toàn (trừ tiền, tạo đơn hàng, gửi email) nên có cơ chế idempotency key ngay từ đầu, thay vì chữa cháy sau khi đã có sự cố double-charge trong thực tế. Thiết kế này đặc biệt quan trọng cho hệ thống thanh toán hoặc bất kỳ chỗ nào client buộc phải retry qua mạng không ổn định. Chủ đề gần với Spring Boot (thiết kế REST API thực chiến) và Network & Security (timeout, retry).

## Đọc bản gốc

[Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency)

**Tóm tắt:**
- Lỗi mạng khiến client không biết chắc một request đã thực sự xảy ra hay chưa.
- Idempotency key: client tự gắn mã định danh duy nhất cho mỗi thao tác, gửi qua header riêng.
- Server dùng key để nhận ra request trùng, trả lại đúng kết quả cũ thay vì chạy lại.
- Kết hợp exponential backoff và jitter để retry an toàn, không gây quá tải dây chuyền.
