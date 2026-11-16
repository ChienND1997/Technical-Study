# Cloudflare đếm request như thế nào để chặn tấn công mà không làm chậm người dùng thật

> Nguồn: [Cloudflare Blog](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/) · Đăng ngày: 7 thg 6, 2017 · Thẻ: rate limiting, distributed systems, kiến trúc hệ thống lớn
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài toán nghe đơn giản: giới hạn số request mỗi IP được gọi trong một khoảng thời gian, để chặn brute-force đăng nhập hay lạm dụng API tốn tài nguyên. Nhưng ở quy mô của Cloudflare — traffic trải khắp hàng trăm điểm hiện diện (PoP) trên toàn cầu — đếm chính xác số request của một IP không hề đơn giản: đếm riêng từng server thì sai (một IP có thể chạm nhiều server), mà đặt một bộ đếm trung tâm duy nhất thì độ trễ và rủi ro sập điểm duy nhất là không chấp nhận được.

## Ý chính

- Nhờ anycast, traffic của một IP thường luôn đổ về cùng một PoP, nên Cloudflare chỉ cần đếm chung trong phạm vi một PoP (qua một cụm Twemcache được chia dữ liệu bằng consistent hashing), không cần đồng bộ toàn cầu.
- Họ so sánh bốn cách đếm: cửa sổ cố định (fixed window) — đơn giản nhưng cho phép spike ngay tại ranh giới reset cửa sổ; sliding log — ghi lại timestamp từng request, chính xác nhất nhưng tốn bộ nhớ khủng khiếp khi ngưỡng cho phép lớn; leaky bucket — chính xác và rẻ nhưng cần nhiều thao tác không thể atomic trên memcache, dễ lỗi khi bị tấn công dồn dập; và sliding window counter — lựa chọn cuối cùng.
- Sliding window counter chỉ giữ hai con số cho mỗi key: số request của cửa sổ hiện tại và cửa sổ liền trước. Tốc độ ước tính = (số request cửa sổ trước) × (tỷ lệ phần cửa sổ trước vẫn còn nằm trong "cửa sổ trượt" hiện tại) + (số request cửa sổ hiện tại). Cách này giả định request rải đều trong cửa sổ trước, nên chỉ là xấp xỉ chứ không tuyệt đối chính xác.
- Thử nghiệm trên 400 triệu request từ 270.000 nguồn khác nhau cho thấy sai lệch trung bình giữa tốc độ ước tính và tốc độ thật chỉ khoảng 6%, và chỉ 0,003% request bị xử lý sai (cho qua nhầm hoặc chặn nhầm) — không có trường hợp chặn nhầm người dùng hợp lệ nào.
- Để không làm chậm request hợp lệ, việc tăng bộ đếm chạy bất đồng bộ (không nằm trên đường xử lý chính). Khi một IP vượt ngưỡng, hệ thống chỉ đặt một cờ đánh dấu, và các request tiếp theo chỉ cần kiểm tra cờ đó thay vì tính toán lại từ đầu.

## Kinh nghiệm rút ra

Khi cần đếm sự kiện ở quy mô phân tán lớn, đổi một chút độ chính xác (xấp xỉ thay vì tuyệt đối) để đạt bộ nhớ hằng số và thao tác atomic đơn giản thường đáng giá hơn nhiều so với cố gắng đếm chính xác tuyệt đối. Nguyên lý sliding window counter này áp dụng được cho bất kỳ bài toán rate limiting nào, không chỉ ở Cloudflare. Chủ đề gần với System Design (rate limiter) và Network & Security.

## Đọc bản gốc

[How we built rate limiting capable of scaling to millions of domains](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)

**Tóm tắt:**
- Đếm request theo IP ở quy mô toàn cầu không thể dùng một bộ đếm trung tâm hay đếm riêng từng server.
- Sliding window counter chỉ cần hai con số mỗi key, ước tính tốc độ bằng cách pha trộn cửa sổ hiện tại và cửa sổ trước.
- Đổi lấy một phần nhỏ độ chính xác (sai số trung bình 6%) để có bộ nhớ hằng số và thao tác atomic đơn giản trên memcache.
- Tăng bộ đếm chạy bất đồng bộ để không làm chậm request hợp lệ trên đường xử lý chính.
