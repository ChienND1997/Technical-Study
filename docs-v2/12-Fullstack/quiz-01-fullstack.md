# Trắc nghiệm chuyên sâu: Fullstack Architecture & API Integration

## 1. Xác thực, Realtime và Tích hợp Frontend-Backend

### Câu 1: Khi lưu trữ Access Token (JWT) trong ứng dụng Single Page Application (SPA), phương án kiến trúc nào được khuyến nghị để cân bằng giữa bảo mật và trải nghiệm phòng chống cả XSS lẫn CSRF?
- [x] Lưu Access Token trong bộ nhớ JavaScript RAM (biến trong state của app); và lưu Refresh Token trong Cookie có cờ `HttpOnly`, `Secure`, `SameSite=Strict` kết hợp kiểm tra Origin/Referer header.
- [ ] Lưu Access Token trực tiếp trong `localStorage` để tự động duy trì phiên đăng nhập sau mỗi lần người dùng F5 hoặc mở lại trình duyệt.
- [ ] Lưu Access Token trực tiếp trong URL Query parameter (`?access_token=...`) để dễ dàng chia sẻ trạng thái phiên qua các component.
- [ ] Lưu Access Token trong tệp tin Web Worker Cache để dùng chung giữa tất cả các domain con của doanh nghiệp.

> **Giải thích:** Lưu JWT trong `localStorage` cực kỳ nguy hiểm vì bất kỳ đoạn mã độc XSS nào từ thư viện bên thứ ba (npm package) đều có thể đọc `localStorage.getItem("token")` và gửi về server của hacker. Lưu Access Token trong RAM (state của app) khiến XSS không thể dễ dàng đánh cắp vĩnh viễn; khi F5 tải lại trang, SPA tự động gọi API `/refresh` gửi Refresh Token trong Cookie `HttpOnly` (XSS không đọc được) để lấy Access Token mới.

### Câu 2: Trong giao thức truyền thông Realtime, Server-Sent Events (SSE) khác biệt gì so với WebSocket?
- [x] SSE là kênh truyền một chiều từ Server gửi về Client trên nền HTTP thông thường (`text/event-stream`); còn WebSocket là kênh truyền hai chiều song công (Full-duplex) dựa trên kết nối TCP riêng biệt.
- [ ] SSE chỉ hỗ trợ định dạng nhị phân Protobuf, còn WebSocket chỉ hỗ trợ định dạng văn bản JSON thuần túy.
- [ ] SSE yêu cầu client phải liên tục gửi request polling 1 giây/lần, còn WebSocket không cần gửi request định kỳ.
- [ ] SSE không thể vượt qua được các proxy hay tường lửa doanh nghiệp, còn WebSocket thì luôn được cho phép tự do.

> **Giải thích:**
- **SSE (Server-Sent Events)**: Chạy trên HTTP/1.1 hoặc HTTP/2 tiêu chuẩn (`Content-Type: text/event-stream`), tự động reconnect khi mất mạng, vượt qua mọi Proxy/Firewall dễ dàng. Cực kỳ lý tưởng cho luồng tin tức, thông báo notification, stream phản hồi AI của ChatGPT.
- **WebSocket**: Đòi hỏi bước nâng cấp giao thức (HTTP Upgrade to WebSocket), duy trì kết nối TCP hai chiều liên tục. Thích hợp cho game online nhiều người chơi, phòng chat tương tác tức thì cao.

### Câu 3: Chuẩn thiết kế OpenAPI / Swagger mang lại lợi ích cốt lõi nào cho việc cộng tác phát triển hệ thống Fullstack?
- [x] Tạo ra bản Hợp đồng API (API Contract) chuẩn hóa bằng JSON/YAML; từ đó tự động sinh tài liệu giao diện và sinh mã nguồn TypeScript Client SDK giúp Frontend đồng bộ tuyệt đối về kiểu dữ liệu với Backend.
- [ ] Tự động tối ưu hóa các câu lệnh truy vấn SQL của cơ sở dữ liệu dựa trên các endpoint RESTful.
- [ ] Đảm bảo ứng dụng backend không bao giờ bị quá tải bằng cách tự động áp dụng cơ chế cân bằng tải.
- [ ] Tự động mã hóa toàn bộ dữ liệu lưu trong cơ sở dữ liệu của backend bằng các thuật toán bảo mật.

> **Giải thích:** OpenAPI đóng vai trò là "nguồn chân lý duy nhất" (Single Source of Truth) giữa FE và BE. Khi Backend cập nhật OpenAPI schema, công cụ `openapi-typescript` hoặc `openapi-generator` tự động sinh ra các interface TypeScript và hàm gọi API chuẩn xác 100%. Lập trình viên Frontend nhận ngay thông báo lỗi đỏ (Type error) khi biên dịch nếu Backend đổi tên hoặc xóa một trường dữ liệu.

### Câu 4: Khi thiết kế tính năng phân trang cho bảng dữ liệu có hàng chục triệu bản ghi, kỹ thuật "Keyset Pagination" (Cursor-based) vượt trội hơn "Offset Pagination" ở điểm nào?
- [x] Tốc độ truy vấn luôn đạt O(1) bất kể ở trang thứ bao nhiêu nhờ tận dụng B-Tree Index trên khóa sắp xếp (`WHERE id > last_seen_id LIMIT 20`), và không bị nhảy trùng hoặc sót bản ghi khi có dữ liệu mới chèn vào.
- [ ] Cho phép người dùng nhảy trực tiếp tới một số trang ngẫu nhiên bất kỳ (ví dụ nhảy thẳng tới trang 50.000) với thời gian phản hồi tức thì.
- [ ] Tự động nén dung lượng bộ nhớ của các bản ghi cũ trên đĩa cứng để giảm thiểu chi phí lưu trữ.
- [ ] Cho phép hiển thị tổng số lượng bản ghi chính xác tuyệt đối mà không cần chạy câu lệnh `COUNT(*)`.

> **Giải thích:** Với `OFFSET 1.000.000 LIMIT 20`, database bắt buộc phải quét và sắp xếp 1.000.020 bản ghi rồi mới vứt bỏ 1 triệu bản ghi đầu tiên, gây ngốn CPU và nghẽn I/O nghiêm trọng. Với Keyset Pagination (Cursor), database chỉ việc tìm kiếm nhị phân trên Index B-Tree tại vị trí `id = last_seen_id` và lấy ngay 20 bản ghi tiếp theo trong vài mili-giây.

### Câu 5: Chiến lược "BFF" (Backend for Frontend) trong kiến trúc microservices giải quyết bài toán gì cho ứng dụng Fullstack?
- [x] Dựng một tầng API Gateway chuyên biệt cho từng loại client (Web BFF, Mobile BFF) để tổng hợp dữ liệu (Aggregation), loại bỏ các trường thừa và điều chỉnh định dạng phản hồi tối ưu nhất cho thiết bị đó.
- [ ] Cho phép chạy toàn bộ cơ sở dữ liệu quan hệ trực tiếp trên trình duyệt của người dùng thông qua WebAssembly.
- [ ] Bắt buộc toàn bộ các microservices backend phải sử dụng chung một ngôn ngữ lập trình duy nhất với frontend.
- [ ] Tự động chuyển đổi các request HTTP đồng bộ thành các tiến trình xử lý hàng đợi tin nhắn bất đồng bộ.

> **Giải thích:** Mỗi loại giao diện có nhu cầu dữ liệu khác nhau: Ứng dụng Desktop cần hiển thị bảng dữ liệu chi tiết nhiều cột; ứng dụng Di động (Mobile App) qua mạng 4G cần ít dữ liệu hơn để tiết kiệm pin và băng thông. Thay vì để một API chung nặng nề hoặc ép Frontend phải gọi 10 API microservices khác nhau để ghép dữ liệu, tầng BFF đứng giữa gom và chế biến dữ liệu vừa vặn cho từng client.

### Câu 6: Khi cấu hình CORS cho ứng dụng SPA gửi kèm Cookie hoặc Authorization Header (`withCredentials: true`), backend bắt buộc phải tuân thủ điều kiện nào?
- [x] Header `Access-Control-Allow-Origin` phải chỉ định cụ thể Origin của client (không được dùng dấu sao `*`), và phải kèm theo `Access-Control-Allow-Credentials: true`.
- [ ] Header `Access-Control-Allow-Origin` bắt buộc phải đặt là `*` để tất cả các tên miền con đều có thể gửi kèm credentials.
- [ ] Backend bắt buộc phải cấu hình vô hiệu hóa giao thức HTTPS để tránh xung đột mã hóa với trình duyệt.
- [ ] Client bắt buộc phải đổi tất cả các phương thức request POST/PUT thành GET để bỏ qua bước Preflight OPTIONS.

> **Giải thích:** Theo đặc tả bảo mật của W3C, khi request có cờ credentials (như Cookie phiên hoặc HTTP Authentication), server **tuyệt đối không được** trả về `Access-Control-Allow-Origin: *`. Nếu trả về `*`, trình duyệt sẽ chặn đứng request ngay lập tức để ngăn trang web lừa đảo đọc được dữ liệu cá nhân của người dùng. Server phải kiểm tra danh sách whitelist và trả về đúng Origin của client (ví dụ: `https://app.example.com`).

### Câu 7: Vấn đề lớn nhất của kiến trúc RESTful API mà giao thức GraphQL ra đời để giải quyết là gì?
- [x] Over-fetching (nhận về quá nhiều trường dữ liệu thừa không cần dùng) và Under-fetching (phải gọi nhiều API liên tiếp mới gom đủ dữ liệu hiển thị một màn hình).
- [ ] REST API không hỗ trợ truyền tải dữ liệu dưới định dạng JSON trên môi trường mạng Internet.
- [ ] REST API bắt buộc máy chủ phải mở kết nối TCP hai chiều liên tục với tất cả các client đang trực tuyến.
- [ ] REST API không thể thực hiện các thao tác xác thực người dùng bằng JSON Web Token (JWT).

> **Giải thích:** Trong REST, endpoint `GET /users/1` luôn trả về toàn bộ 50 trường thông tin dù giao diện chỉ cần `name` và `avatar` (Over-fetching). Để hiển thị danh sách bài viết kèm tác giả và bình luận, REST thường bắt FE phải gọi 3 API khác nhau (Under-fetching). GraphQL cho phép Frontend gửi một query mô tả chính xác các trường cần thiết, server trả về đúng JSON theo hình dạng đó trong 1 request duy nhất.

### Câu 8: Khi nhận Webhook từ cổng thanh toán bên thứ ba (như Stripe, VNPay, PayPal), kỹ thuật nào là bắt buộc để đảm bảo an toàn và tính toàn vẹn?
- [x] Kiểm tra chữ ký mật mã (HMAC SHA-256) trong Header bằng Secret Key dùng chung giữa hai bên, và ghi nhận Idempotency Key để chống xử lý trùng lặp (Replay Attack).
- [ ] Chỉ cần kiểm tra IP của máy chủ gửi đến có nằm trong dải mạng nội bộ của doanh nghiệp hay không.
- [ ] Lưu thẳng payload vào database trước khi kiểm tra và gửi email xác nhận ngay cho người dùng.
- [ ] Bắt buộc client phải nhập lại mã PIN bảo mật trước khi webhook được chấp nhận xử lý.

> **Giải thích:** Bất kỳ kẻ tấn công nào cũng có thể giả mạo gửi HTTP POST tới endpoint Webhook công khai của bạn với nội dung "đơn hàng đã thanh toán thành công". Vì vậy:
> 1. Server phải dùng Secret Key bí mật tính lại mã băm HMAC của toàn bộ Request Body và so khớp với Header `X-Signature`.
> 2. Cổng thanh toán có cơ chế tự động gửi lại (retry) khi mạng chập chờn, nên hệ thống phải kiểm tra mã giao dịch (`transaction_id` / idempotency key) để không cộng tiền hay giao hàng 2 lần.

### Câu 9: Vì sao JWT dạng Stateless thuần túy khó thực hiện tính năng "Đăng xuất tức thì" (Immediate Revocation), và giải pháp thực tế tối ưu nhất là gì?
- [x] JWT được tự xác thực bằng chữ ký số ở Backend mà không cần truy vấn DB nên hợp lệ cho tới khi hết hạn (exp); giải pháp là dùng Access Token có TTL ngắn kết hợp lưu Blacklist hoặc `token_version` trong Redis.
- [ ] Vì JWT tự động lưu một bản sao không thể xóa trên bộ nhớ ROM của thiết bị người dùng.
- [ ] Chỉ cần yêu cầu Frontend xóa token khỏi bộ nhớ trình duyệt là token đó lập tức bị vô hiệu hóa trên toàn bộ hệ thống.
- [ ] Giải pháp duy nhất là bắt buộc phải tạo lại cặp khóa bí mật Private/Public Key của máy chủ backend mỗi khi có user logout.

> **Giải thích:** Nếu chỉ xóa token ở Client, token cũ vẫn hoàn toàn hợp lệ nếu bị kẻ xấu sao chép trước đó. Do tính chất stateless không lưu session trong database, server không biết token đã bị hủy hay chưa. Để giải quyết triệt để:
> - Giữ thời gian sống của Access Token cực ngắn (5 - 15 phút).
> - Khi người dùng bấm Logout hoặc đổi mật khẩu, lưu `jti` (Token ID) vào Redis với thời gian hết hạn bằng thời gian còn lại của token (Blacklist), hoặc tăng `token_version` của người dùng trong DB/Redis.

### Câu 10: Sự khác biệt bản chất giữa Server-Side Rendering (SSR) và Incremental Static Regeneration (ISR) trong các framework fullstack hiện đại là gì?
- [x] SSR render lại toàn bộ mã HTML trên server cho mỗi lượt truy cập (Request-time); còn ISR sinh sẵn trang HTML tĩnh từ trước và tự động kích hoạt tiến trình render lại ngầm trong nền khi hết thời hạn cache (Revalidation).
- [ ] SSR chỉ áp dụng được cho các trang tĩnh không có dữ liệu, còn ISR dùng riêng cho các trang có dữ liệu động.
- [ ] SSR bắt buộc client phải tải toàn bộ cơ sở dữ liệu về trình duyệt trước khi hiển thị nội dung.
- [ ] ISR yêu cầu phải cấu hình cụm máy chủ Kubernetes chuyên dụng, còn SSR có thể chạy trên bất kỳ máy chủ nào.

> **Giải thích:**
> - **SSR**: Server thực thi code JavaScript để tạo HTML cho từng request. Tốt cho dữ liệu thay đổi theo từng giây của từng user, nhưng gây tải lớn cho CPU của server khi lưu lượng truy cập cao.
> - **ISR**: Kết hợp ưu điểm của Static Site (tốc độ CDN cực nhanh) và SSR. Trang được phân phối tĩnh từ CDN; khi hết hạn `revalidate: 60`, user tiếp theo vẫn nhận trang cache ngay lập tức trong khi server kích hoạt render ngầm bản mới để phục vụ các user sau.

### Câu 11: Để tối ưu hóa hiệu năng khi người dùng tải lên các file video hoặc ảnh dung lượng lớn (hàng trăm MB), kiến trúc nào sau đây là chuẩn mực nhất?
- [x] Frontend xin Presigned URL từ Backend, sau đó Frontend stream trực tiếp file từ trình duyệt lên Cloud Object Storage (S3, Cloudflare R2), giảm tải hoàn toàn cho backend.
- [ ] Frontend gửi toàn bộ file qua Backend theo dạng Multipart/form-data để Backend lưu tạm vào ổ cứng rồi mới tải lên Cloud Storage.
- [ ] Chuyển đổi toàn bộ file thành chuỗi Base64 rồi nhúng trực tiếp vào câu lệnh SQL INSERT của cơ sở dữ liệu.
- [ ] Cắt file thành các chuỗi nhị phân nhỏ và gửi tuần tự qua các URL Query Parameter của phương thức GET.

> **Giải thích:** Nếu upload file qua Backend server trung gian:
> - Tốn gấp đôi băng thông mạng (Client -> Server -> S3).
> - Gây tắc nghẽn Worker Thread, nghẽn RAM và nghẽn I/O của server ứng dụng.
> Dùng **Presigned URL**: Backend chỉ làm nhiệm vụ kiểm tra quyền và tạo URL chữ ký bí mật trong vài mili-giây. Trình duyệt client trực tiếp stream dữ liệu lên S3, giải phóng hoàn toàn gánh nặng cho hệ thống backend.

### Câu 12: Trong kiến trúc phân tán microservices, tiêu chuẩn "W3C Trace Context" với header `traceparent` (hoặc `X-Correlation-ID`) có vai trò gì?
- [x] Gắn một định danh duy nhất xuyên suốt hành trình của một request từ Frontend qua API Gateway và tất cả các microservices hậu cần, phục vụ việc truy vết lỗi (Distributed Tracing) và ghi log tập trung.
- [ ] Tự động mã hóa nội dung của request bằng thuật toán khóa công khai RSA để chống nghe lén.
- [ ] Định tuyến tự động request tới server nào có mức sử dụng RAM thấp nhất trong cụm cluster.
- [ ] Giới hạn số lượng request tối đa mà một người dùng có thể gửi trong một khoảng thời gian nhất định.

> **Giải thích:** Khi người dùng click một nút bấm gây lỗi trên giao diện, request có thể đã đi qua 5 dịch vụ khác nhau: FE -> Gateway -> Order Service -> Payment Service -> Inventory Service. Nhờ có `traceparent` (Trace ID + Span ID), các công cụ quan sát như Jaeger, Zipkin, OpenTelemetry hoặc Datadog có thể gom toàn bộ log và đo đạc thời gian phản hồi của từng bước thành một dòng thời gian duy nhất để định vị chính xác lỗi xảy ra ở đâu.

### Câu 13: Khi nâng cấp cơ sở dữ liệu trên hệ thống Production đang có lượng truy cập lớn, quy trình "Expand and Contract" (Zero-Downtime Migration) gồm các bước chuẩn nào?
- [x] 1) Tạo cột mới cho phép null -> 2) Backend ghi đồng thời cả hai nơi (Dual Write) -> 3) Chuyển đổi dữ liệu cũ (Backfill) -> 4) Đổi code sang đọc nguồn mới -> 5) Xóa bỏ cột cũ.
- [ ] 1) Dừng toàn bộ server trong 2 giờ -> 2) Chạy lệnh ALTER TABLE -> 3) Khởi động lại hệ thống.
- [ ] 1) Tạo bảng mới hoàn toàn -> 2) Đổi tên bảng cũ thành bảng backup -> 3) Khôi phục dữ liệu từ snapshot tuần trước.
- [ ] 1) Xóa trực tiếp cột cũ khỏi database -> 2) Deploy code mới lên server -> 3) Bắt các ngoại lệ phát sinh lúc runtime.

> **Giải thích:** Đổi tên hay xóa một cột trực tiếp trong database khi code backend cũ đang chạy sẽ làm phát sinh ngoại lệ SQL ngay tức thì trên mọi request. Quy trình Expand and Contract đảm bảo tính tương thích ngược hoàn hảo: Database và Backend luôn hỗ trợ song song phiên bản N và N+1, cho phép deploy hệ thống mà không cần downtime dù chỉ một giây.

### Câu 14: Chiến lược phân phiên bản API (API Versioning) theo đường dẫn URI (`/api/v1/users` và `/api/v2/users`) có ưu thế vượt trội nào so với Header-based versioning?
- [x] Tính tường minh cao, dễ dàng kiểm thử trực tiếp trên trình duyệt/cURL, và tương thích tự nhiên với cơ chế lưu bộ nhớ đệm (Caching) của CDN/Browser mà không cần cấu hình phức tạp `Vary: Accept`.
- [ ] Cho phép máy chủ tự động tối ưu hóa tốc độ xử lý câu lệnh SQL lên gấp hai lần.
- [ ] Đảm bảo dữ liệu gửi qua mạng luôn được nén bằng thuật toán Brotli một cách tự động.
- [ ] Ngăn chặn hoàn toàn việc các client cũ gửi request không hợp lệ tới hệ thống.

> **Giải thích:** URI versioning (`/v1`, `/v2`) là chiến lược phổ biến nhất được các ông lớn công nghệ (Google, Stripe, Twitter) sử dụng. Điểm mạnh nhất của nó là cực kỳ trực quan, dễ debug trong Network Tab, và các hệ thống CDN (Cloudflare, Fastly) tự động phân tách cache giữa hai phiên bản theo URL một cách minh bạch mà không lo ngại rủi ro trả nhầm bản cache của v1 cho client v2.

### Câu 15: Kỹ thuật "Optimistic UI Update" (Cập nhật giao diện lạc quan) mang lại trải nghiệm người dùng như thế nào và cách xử lý khi thao tác thất bại?
- [x] Giao diện cập nhật trạng thái mới ngay lập tức khi người dùng thao tác (độ trễ 0ms) trước khi nhận phản hồi từ server; nếu API trả về lỗi thì tự động Rollback lại trạng thái cũ và hiển thị thông báo lỗi.
- [ ] Giao diện sẽ khóa toàn bộ màn hình và hiển thị loading spinner cho đến khi server xác nhận thành công 100%.
- [ ] Tự động ghi nhận thao tác thành công vào cơ sở dữ liệu SQLite cục bộ của trình duyệt và bỏ qua việc gọi API lên server.
- [ ] Tự động thử lại thao tác vô hạn lần trong nền cho đến khi server phản hồi thành công mà không báo cho người dùng.

> **Giải thích:** Thay vì hiển thị loading spinner xoay tròn gây cảm giác chậm chạp và đơ giật cho ứng dụng, Optimistic UI dự đoán server sẽ xử lý thành công và render kết quả ngay lập tức (độ trễ 0ms). Các thư viện như React Query / TanStack Query hoặc SWR hỗ trợ `onMutate` lưu snapshot trạng thái trước đó, và `onError` rollback dữ liệu nguyên vẹn nếu server từ chối request.

### Câu 16: Khi một client gửi quá nhiều request trong thời gian ngắn và nhận về mã trạng thái HTTP 429 Too Many Requests, header nào được server gửi kèm để hướng dẫn client thời điểm có thể thử lại?
- [x] Header `Retry-After` (chỉ định số giây hoặc thời điểm cụ thể) kết hợp với các header như `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- [ ] Header `Location` chỉ định đường dẫn chuyển hướng sang trang đăng nhập của hệ thống.
- [ ] Header `Content-Security-Policy` thông báo danh sách các domain bị cấm truy cập.
- [ ] Header `Cache-Control: no-store` yêu cầu client không được lưu trữ phản hồi vào bộ nhớ đệm.

> **Giải thích:** Khi triển khai thuật toán Token Bucket hoặc Leaky Bucket để bảo vệ backend khỏi bị tấn công DoS, mã `429 Too Many Requests` đi kèm header `Retry-After: 30` thông báo cho client biết rằng họ đã vượt quá hạn mức cho phép và cần đợi đúng 30 giây nữa mới được phép gửi lại request tiếp theo.

### Câu 17: Header bảo mật `Content-Security-Policy` (CSP) giúp ngăn chặn loại hình tấn công nào hiệu quả nhất?
- [x] Tấn công XSS (Cross-Site Scripting) và Data Injection, bằng cách quy định danh sách trắng các nguồn domain đáng tin cậy được phép tải script, hình ảnh, style và cấm thực thi mã inline script không an toàn.
- [ ] Tấn công tràn bộ đệm (Buffer Overflow) trong mã nguồn nhị phân của máy chủ web.
- [ ] Tấn công DDoS bằng cách gửi hàng triệu gói tin TCP SYN làm tê liệt hạ tầng mạng.
- [ ] Tấn công Man-in-the-Middle (MITM) bằng cách ép buộc trình duyệt chỉ kết nối qua HTTPS.

> **Giải thích:** CSP là lá chắn phòng thủ chiều sâu vững chắc nhất cho Frontend. Nếu hacker lợi dụng được một lỗ hổng trong bình luận để chèn thẻ `<script src="https://evil-hacker.com/steal-cookie.js"></script>`, trình duyệt có bật CSP sẽ lập tức chặn việc tải file script này lại vì domain `evil-hacker.com` không nằm trong danh sách trắng cho phép trong header CSP.

### Câu 18: Trong kiến trúc Micro-frontends sử dụng Webpack Module Federation, cơ chế "Shared Dependencies" giải quyết bài toán gì?
- [x] Cho phép các micro-app chạy độc lập nhưng dùng chung một bản sao duy nhất trong RAM (Runtime Singleton) của các thư viện lớn (như `react`, `react-dom`), tránh việc mỗi app tải riêng một bản gây phình bundle.
- [ ] Bắt buộc tất cả các micro-frontends phải chia sẻ chung một kho lưu trữ mã nguồn Git duy nhất (Monorepo).
- [ ] Tự động đồng bộ hóa CSS style giữa các component của các nhóm phát triển khác nhau.
- [ ] Cho phép một micro-app có thể truy cập trực tiếp vào biến cục bộ trong file của micro-app khác mà không cần export.

> **Giải thích:** Nếu một trang web ghép từ 5 micro-frontends khác nhau mà mỗi app lại tự đóng gói bản `react` và thư viện UI component riêng, tổng dung lượng tải trang có thể lên tới 10MB-20MB. Module Federation cho phép khai báo `shared: { react: { singleton: true, requiredVersion: '^18.0.0' } }`, đảm bảo chỉ có một instance React duy nhất được tải và tái sử dụng cho tất cả các micro-app.

### Câu 19: Hiện tượng "Database Connection Exhaustion" thường xảy ra trong kiến trúc Serverless (AWS Lambda, Vercel Functions) vì lý do gì, và giải pháp triệt để là gì?
- [x] Do các hàm Serverless scale-out độc lập theo hàng nghìn tiến trình riêng biệt và mỗi tiến trình mở kết nối DB riêng; giải pháp là đặt một Connection Pooler đứng giữa (như PgBouncer, AWS RDS Proxy hoặc Prisma Accelerate).
- [ ] Do cơ sở dữ liệu quan hệ không hỗ trợ việc kết nối thông qua giao thức mạng internet công cộng.
- [ ] Do thời gian thực thi tối đa của một hàm Serverless bị giới hạn ở mức 15 phút.
- [ ] Do các hàm Serverless tự động ngắt kết nối database ngay khi hoàn tất câu lệnh SELECT đầu tiên.

> **Giải thích:** Trong ứng dụng server truyền thống (Node.js/Spring Boot), một instance cố định duy trì một Connection Pool khoảng 10-20 kết nối. Nhưng trong Serverless, khi có 1.000 request ập đến cùng lúc, 1.000 Lambda instance được sinh ra, cố mở 1.000 kết nối TCP đồng thời tới PostgreSQL, khiến database sập nguồn vì tràn RAM. PgBouncer đứng giữa đóng vai trò gom và tái sử dụng hàng nghìn kết nối serverless vào một số lượng kết nối thực tế vừa vặn với database.

### Câu 20: Khi thiết kế API cho thao tác thanh toán tài chính hoặc chuyển tiền, cơ chế nào bảo vệ hệ thống không bị trừ tiền hai lần khi mạng của khách hàng bị chập chờn và họ bấm nút gửi lại?
- [x] Client sinh một chuỗi UUID duy nhất đặt vào Header `Idempotency-Key`; Backend dùng Redis lưu trạng thái key này kèm Distributed Lock để nếu nhận trùng key thì trả về ngay kết quả giao dịch trước đó mà không trừ tiền lại.
- [ ] Yêu cầu người dùng phải xác thực lại mật khẩu tài khoản trước mỗi lần thực hiện gửi lại request.
- [ ] Backend lưu tạm thời các request vào mảng bộ nhớ RAM của Controller và tự động xóa sau 5 giây.
- [ ] Chuyển toàn bộ các giao dịch thanh toán sang thực hiện vào ban đêm khi lưu lượng truy cập hệ thống thấp.

> **Giải thích:** Tính lũy đẳng (Idempotency) là nguyên tắc sống còn của API giao dịch tài chính. Khi client gửi `Idempotency-Key: 7b9a5e4c-...`:
> 1. Server kiểm tra Redis: Nếu key đang xử lý, chặn request trùng.
> 2. Nếu key đã xử lý xong và có kết quả lưu trong cache, trả về nguyên vẹn kết quả thành công trước đó.
> 3. Nếu chưa từng xử lý, server thực hiện thanh toán trong Database Transaction và lưu kết quả vào Redis. Nhờ đó dù người dùng có bấm 5 lần liên tiếp hay mạng bị rớt gói tin ACK, tài khoản chỉ bị trừ tiền duy nhất 1 lần.
