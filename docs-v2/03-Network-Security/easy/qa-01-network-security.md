# Câu hỏi phỏng vấn: Mạng & Bảo mật Web

## 1. Giao thức HTTP/HTTPS và Bắt tay TCP

**Câu hỏi:** Quá trình bắt tay 3 bước (3-way handshake) của TCP giải quyết bài toán gì và vì sao cần 3 bước mà không phải 2 bước?

**Đáp án ngắn:** Đảm bảo cả hai bên cùng kiểm chứng được khả năng gửi và nhận dữ liệu, đồng bộ hóa số thứ tự gói tin ban đầu (ISN), ngăn chặn các gói tin cũ bị trễ từ kết nối trước gây hiểu nhầm.

**Gợi ý suy luận:** Kênh song công (Full-duplex) -> Client kiểm tra Server, Server kiểm tra Client -> Bài toán gói tin trễ (delayed duplicate SYN).

**Lập luận:** Nếu chỉ có 2 bước (Client gửi SYN, Server trả SYN-ACK và mở kết nối ngay): Nếu gói SYN cũ từ kết nối trước bị trễ trong mạng vô tình bay tới Server, Server sẽ mở ngay một kết nối mới và cấp phát tài nguyên trong khi Client thực tế không hề muốn kết nối, gây lãng phí bộ nhớ và dễ bị tấn công SYN Flood. Bước ACK thứ 3 của Client là lời xác nhận chắc chắn rằng kết nối hiện tại là hợp lệ và cả 2 bên đều sẵn sàng trao đổi dữ liệu hai chiều.

**Nhớ:** 3 bước: Đồng bộ ISN hai chiều + Kiểm tra kênh song công gửi/nhận + Tránh gói tin trễ mở kết nối ma.

## 2. CORS (Cross-Origin Resource Sharing)

**Câu hỏi:** CORS là cơ chế bảo vệ Server hay bảo vệ Client? Trình duyệt gửi Preflight Request (OPTIONS) khi nào?

**Đáp án ngắn:** CORS là cơ chế của trình duyệt bảo vệ người dùng (Client) khỏi các trang web độc hại; Preflight Request được gửi trước các request không phải "Simple Request" (như có method PUT/DELETE hoặc có header tuỳ chỉnh như Authorization).

**Gợi ý suy luận:** Same-Origin Policy trên trình duyệt -> Server xử lý nhưng trình duyệt chặn đọc -> Preflight thăm dò quyền trước khi gửi dữ liệu thật.

**Lập luận:** Nhiều người nhầm rằng CORS là tường lửa bảo vệ server. Thực chất, nếu không có trình duyệt (ví dụ dùng curl hay Postman), bạn gửi request tới server vẫn được xử lý bình thường. CORS là chính sách bảo vệ tài nguyên trên trình duyệt của người dùng. Khi request có header lạ hoặc method làm thay đổi dữ liệu (PUT/DELETE/PATCH), trình duyệt tự động gửi 1 request `OPTIONS` trước để hỏi: "Server có cho phép domain này gửi header/method này không?". Nếu server trả về `Access-Control-Allow-Origin` phù hợp, trình duyệt mới gửi request nghiệp vụ chính thức.

**Nhớ:** CORS là chốt chặn của Browser bảo vệ Client; Preflight OPTIONS gửi thăm dò cho các Non-Simple requests (PUT, DELETE, custom headers).

