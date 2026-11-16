# Trắc nghiệm chuyên sâu: Mạng máy tính & Bảo mật Web

## 1. TCP/IP, HTTP và Giao thức truyền thông

### Câu 1: Quá trình bắt tay 3 bước (3-way handshake) của giao thức TCP diễn ra theo thứ tự nào giữa Client và Server?
- [x] Client gửi gói SYN với ISN khởi tạo -> Server phản hồi SYN-ACK xác nhận ISN client và gửi ISN server -> Client gửi ACK để hoàn tất thiết lập kết nối tin cậy.
- [ ] Client gửi gói ACK thông báo sẵn sàng -> Server phản hồi SYN thiết lập thông lượng -> Client gửi FIN để bắt đầu truyền tải các khối dữ liệu stream.
- [ ] Server chủ động gửi SYN thăm dò cổng lắng nghe -> Client phản hồi SYN-ACK chấp thuận -> Server gửi ACK hoàn tất mở socket 2 chiều.
- [ ] Client gửi RST yêu cầu xóa trạng thái cũ -> Server phản hồi SYN cấp phát buffer -> Client gửi ACK đồng bộ sequence number kết nối.

> **Giải thích:** Quá trình bắt tay 3 bước của TCP: 1) Client gửi gói tin SYN với số thứ tự khởi tạo ngẫu nhiên `ISN_c`; 2) Server gửi lại gói SYN-ACK chứa `ISN_s` của server và `ACK = ISN_c + 1`; 3) Client gửi gói ACK chứa `ACK = ISN_s + 1`. Sau 3 bước này, hai bên đồng bộ được Sequence Number và kênh kết nối song công (full-duplex) được thiết lập an toàn.

### Câu 2: Trong giao thức HTTPS/TLS, mã hóa bất đối xứng (Asymmetric Encryption) được dùng chủ yếu ở giai đoạn nào?
- [x] Chỉ dùng trong giai đoạn bắt tay (TLS Handshake) để xác thực chứng chỉ số (X.509) và trao đổi an toàn khóa đối xứng (Pre-master secret/Session Key).
- [ ] Dùng để mã hóa toàn bộ dữ liệu payload truyền tải qua lại giữa Client và Server trong suốt phiên làm việc vì độ an toàn cao hơn khóa đối xứng.
- [ ] Dùng liên tục ở tầng ứng dụng mỗi khi Client gửi dữ liệu nhạy cảm qua phương thức POST, còn GET dùng mã hóa đối xứng.
- [ ] Dùng để nén và tính toán mã kiểm tra tính toàn vẹn (HMAC) của từng gói tin TCP trước khi truyền qua tầng Network IP.

> **Giải thích:** Mã hóa bất đối xứng (RSA/ECC) tốn rất nhiều tài nguyên tính toán của CPU. Do đó, TLS chỉ dùng khóa công khai/khóa bí mật trong giai đoạn Handshake để xác thực server và thỏa thuận Khóa đối xứng (Session Key - AES-GCM hoặc ChaCha20). Toàn bộ dữ liệu thực tế sau đó được mã hóa bằng khóa đối xứng vì tốc độ xử lý nhanh hơn hàng trăm lần nhờ phần cứng AES-NI.

### Câu 3: Lỗ hổng tấn công Cross-Site Scripting (XSS) cho phép kẻ tấn công thực hiện hành vi nào sau đây?
- [x] Chèn và thực thi các đoạn mã JavaScript độc hại trong ngữ cảnh trình duyệt của nạn nhân, từ đó đánh cắp cookie, token xác thực hoặc chiếm quyền điều khiển phiên.
- [ ] Gửi hàng loạt request giả mạo tới database thông qua SQL Injection để đọc trộm toàn bộ bảng người dùng từ tầng máy chủ.
- [ ] Giả mạo địa chỉ IP nguồn trong header HTTP để vượt qua các bộ lọc tường lửa IP Whitelist của máy chủ API nội bộ.
- [ ] Đọc trộm trực tiếp các file cấu hình nhạy cảm trên máy chủ backend thông qua kỹ thuật khai thác Directory Traversal.

> **Giải thích:** XSS xảy ra khi ứng dụng web hiển thị dữ liệu người dùng mà không escape hoặc sanitize đúng cách. Trình duyệt coi đoạn script đó là mã hợp lệ thuộc origin của trang web và thực thi nó, cho phép kẻ tấn công đọc `document.cookie` (nếu không có HttpOnly), lấy token trong `localStorage`, ghi lại thao tác bàn phím (keylogger), hoặc gửi request ngầm mạo danh nạn nhân.

### Câu 4: Cờ (flag) `HttpOnly` trên Cookie có tác dụng bảo mật quan trọng nào?
- [x] Ngăn chặn mã JavaScript phía client (như `document.cookie`) đọc hoặc thao tác với Cookie, giúp giảm thiểu triệt để nguy cơ đánh cắp Session ID khi xảy ra tấn công XSS.
- [ ] Bắt buộc Cookie chỉ được gửi qua kết nối HTTPS có mã hóa SSL/TLS, ngăn chặn nghe lén trên đường truyền mạng công cộng.
- [ ] Ngăn chặn trình duyệt tự động đính kèm Cookie trong các request xuyên trang (cross-site), giúp bảo vệ ứng dụng khỏi tấn công CSRF.
- [ ] Mã hóa toàn bộ nội dung của Cookie tại bộ nhớ cache của trình duyệt bằng thuật toán bất đối xứng RSA-2048.

> **Giải thích:** Cờ `HttpOnly` là cơ chế bảo vệ cookie quan trọng nhất chống lại XSS: trình duyệt cấm hoàn toàn các script phía client truy cập giá trị cookie này, chỉ có HTTP request của trình duyệt mới tự động đính kèm cookie gửi lên server. (Cần phân biệt với `Secure`: chỉ gửi qua HTTPS; và `SameSite`: chống tấn công CSRF).

### Câu 5: Tấn công Cross-Site Request Forgery (CSRF) lợi dụng cơ chế nào của trình duyệt web?
- [x] Lợi dụng cơ chế tự động đính kèm Cookie xác thực (Session Cookie) của trình duyệt mỗi khi gửi request tới domain mục tiêu, khiến server tưởng nhầm đó là thao tác do chính người dùng chủ động thực hiện.
- [ ] Lợi dụng việc trình duyệt chia sẻ chung vùng nhớ LocalStorage giữa các tab khác domain để đọc trộm Bearer Token.
- [ ] Lợi dụng việc kết nối WebSocket giữa client và server không trải qua bước kiểm tra nguồn gốc Origin Header.
- [ ] Lợi dụng bộ nhớ đệm HTTP Cache của trình duyệt để nạp lại các form thanh toán đã hoàn tất trước đó.

> **Giải thích:** Trong tấn công CSRF, nạn nhân đã đăng nhập vào ngân hàng (đã có cookie xác thực). Kẻ tấn công lừa nạn nhân bấm vào một trang web độc hại chứa form ẩn tự submit tới `https://bank.com/transfer`. Trình duyệt của nạn nhân tự động gửi cookie hợp lệ kèm theo request, khiến máy chủ ngân hàng chấp nhận giao dịch chuyển tiền ngoài ý muốn. Giải pháp: Dùng CSRF Token (Synchronizer Token Pattern) hoặc cấu hình `SameSite=Lax/Strict`.

### Câu 6: Cấu hình thuộc tính `SameSite=Lax` trên Cookie hoạt động như thế nào trong việc phòng chống CSRF?
- [x] Ngăn chặn gửi Cookie trong các request xuyên trang ngầm (Cross-site subrequests như img, iframe, POST form); nhưng vẫn cho phép gửi kèm Cookie khi người dùng nhấp vào liên kết điều hướng thông thường cấp cao nhất (Top-level navigation GET link).
- [ ] Chặn tuyệt đối việc gửi Cookie trong mọi ngữ cảnh xuyên trang, kể cả khi người dùng nhấp vào link GET thông thường từ trang web khác chuyển sang.
- [ ] Cho phép gửi Cookie tự do trong mọi request cross-site (bao gồm cả POST form và AJAX fetch) miễn là giao thức kết nối là HTTPS an toàn.
- [ ] Chỉ chặn gửi Cookie đối với các request sử dụng phương thức PUT hoặc DELETE, còn POST và GET đều được gửi bình thường.

> **Giải thích:** 
- `SameSite=Strict`: Nghiêm ngặt nhất, không bao giờ gửi cookie nếu xuất phát từ trang khác (kể cả bấm link từ Google sang cũng bị coi là chưa đăng nhập).
- `SameSite=Lax` (mặc định của hầu hết trình duyệt hiện đại): Cân bằng giữa bảo mật và trải nghiệm: Chặn các request POST ngầm từ site độc hại (chống CSRF), nhưng khi bấm link đọc bài viết thông thường thì vẫn giữ trạng thái đăng nhập.
- `SameSite=None`: Cho phép gửi xuyên trang trong mọi tình huống (bắt buộc phải kèm cờ `Secure`).

### Câu 7: Header bảo mật `Content-Security-Policy` (CSP) giúp phòng thủ cuộc tấn công nào hiệu quả nhất?
- [x] Tấn công XSS (Cross-Site Scripting) và Data Injection, bằng cách chỉ định rõ ràng các nguồn domain an toàn (whitelisted sources) mà trình duyệt được phép tải và thực thi script, hình ảnh, CSS.
- [ ] Tấn công tràn bộ đệm RAM (Buffer Overflow) trong tiến trình xử lý request của máy chủ web backend.
- [ ] Tấn công vét cạn mật khẩu (Brute-Force) thông qua việc tự động khóa tài khoản sau nhiều lần thử sai.
- [ ] Tấn công Man-in-the-Middle (MITM) nghe lén thông tin gói tin trên đường truyền cáp quang xuyên lục địa.

> **Giải thích:** CSP là lá chắn phòng thủ chiều sâu (Defense-in-depth) mạnh nhất chống lại XSS: Bằng cách cấu hình `Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com`, trình duyệt sẽ từ chối thực thi bất kỳ đoạn mã script inline nào (`<script>alert(1)</script>`) và chặn toàn bộ việc gửi dữ liệu lén ra domain độc hại bên ngoài.

### Câu 8: Điểm cải tiến mang tính đột phá của giao thức HTTP/2 so với HTTP/1.1 là gì?
- [x] Hỗ trợ Ghép kênh (Multiplexing) nhiều request và response đồng thời trên duy nhất một kết nối TCP, giải quyết triệt để vấn đề nghẽn đầu hàng (Head-of-Line Blocking) ở tầng ứng dụng HTTP.
- [ ] Thay thế hoàn toàn mã hóa TLS bằng cơ chế băm dữ liệu một chiều SHA-512 tại tầng phiên để tăng tốc độ truyền.
- [ ] Loại bỏ hoàn toàn tầng Transport TCP để chạy trực tiếp trên giao thức Data Link nhằm giảm thiểu độ trễ kết nối.
- [ ] Bắt buộc toàn bộ dữ liệu phản hồi phải được định dạng dưới dạng nhị phân Protocol Buffers thay vì JSON và HTML.

> **Giải thích:** Trong HTTP/1.1, mỗi kết nối TCP chỉ xử lý được tuần tự 1 request tại một thời điểm (request sau phải đợi request trước xong, dẫn đến kỹ thuật chữa cháy tạo 6 kết nối TCP song song). HTTP/2 chia nhỏ dữ liệu thành các Frame nhị phân và gửi xen kẽ trên 1 TCP socket duy nhất (Multiplexing), kèm theo nén Header bằng HPACK và tính năng Server Push.

### Câu 9: Giao thức HTTP/3 chuyển sang sử dụng giao thức truyền vận nào để giải quyết vấn đề Head-of-Line Blocking ở tầng Transport (TCP)?
- [x] Giao thức QUIC (chạy trên nền UDP) với cơ chế quản lý các stream độc lập, gói tin bị mất ở stream này không làm gián đoạn các stream khác.
- [ ] Giao thức WebSocket nâng cao hỗ trợ kiểm soát luồng nhị phân và phát hiện rớt gói tin bằng heartbeat.
- [ ] Giao thức SCTP (Stream Control Transmission Protocol) với tính năng đa luồng tích hợp sẵn trên nhân hệ điều hành.
- [ ] Giao thức ICMP với các gói tin echo có gắn cờ kiểm soát độ trễ tối ưu cho thiết bị di động.

> **Giải thích:** Dù HTTP/2 giải quyết nghẽn ở tầng HTTP, nhưng nếu 1 gói tin TCP bị rớt trên đường truyền mạng, toàn bộ kết nối TCP bị khựng lại chờ truyền lại (TCP Head-of-Line Blocking). HTTP/3 chạy trên nền QUIC (UDP) xử lý các luồng (Streams) hoàn toàn độc lập: gói tin của luồng ảnh bị rớt thì chỉ luồng ảnh đó chờ, các luồng CSS/JS khác vẫn tiếp tục tải bình thường không hề bị trễ.

### Câu 10: Tại sao khi băm mật khẩu người dùng trong cơ sở dữ liệu, ta KHÔNG ĐƯỢC dùng các hàm băm nhanh như MD5, SHA-1, SHA-256 mà phải dùng BCrypt, PBKDF2 hoặc Argon2?
- [x] Vì MD5 và SHA-256 được thiết kế để tính toán siêu nhanh, khiến phần cứng GPU có thể thử hàng chục tỷ hash mỗi giây để vét cạn; trong khi BCrypt có Salt tự động và Work Factor làm chậm phép tính có chủ đích.
- [ ] Vì SHA-256 là hàm mã hóa hai chiều có thể giải mã ngược lại được nếu biết trước thuật toán sinh khóa đối xứng.
- [ ] Vì các thuật toán SHA-256 và MD5 không đảm bảo tính đơn ánh, dẫn đến tỷ lệ trùng lặp hash (Collision) trên 50% đối với các chuỗi ngắn.
- [ ] Vì BCrypt lưu trữ mật khẩu trực tiếp dưới dạng khóa công khai RSA-4096 trên hệ thống file bảo mật của hệ điều hành.

> **Giải thích:** Hàm băm mật khẩu tốt phải là hàm băm "Chậm" (Slow hash function): BCrypt với `cost = 12` mất khoảng 250ms trên CPU cho 1 lần kiểm tra (người dùng đăng nhập không cảm thấy trễ, nhưng kẻ tấn công muốn thử hàng triệu mật khẩu trong từ điển sẽ mất hàng năm trời). Ngoài ra, cơ chế Salt ngẫu nhiên đảm bảo hai người dùng có cùng mật khẩu `"123456"` sẽ có hai chuỗi hash hoàn toàn khác nhau, vô hiệu hóa bảng tra sẵn Rainbow Table.

### Câu 11: Header `Strict-Transport-Security` (HSTS) bảo vệ người dùng khỏi loại hình tấn công nào?
- [x] Tấn công SSL Stripping (kẻ tấn công ở giữa chặn kết nối HTTP ban đầu và hạ cấp giao thức từ HTTPS an toàn xuống HTTP không mã hóa).
- [ ] Tấn công chèn mã độc vào cơ sở dữ liệu (Blind SQL Injection) thông qua các tham số phân trang của REST API.
- [ ] Tấn công làm cạn kiệt tài nguyên bộ nhớ đệm Redis (Cache Breakdown) bằng cách truy vấn hàng loạt khóa không tồn tại.
- [ ] Tấn công nghe lén dữ liệu trên máy chủ nội bộ thông qua việc đọc trộm các file core dump của tiến trình bị crash.

> **Giải thích:** Khi người dùng gõ `bank.com`, trình duyệt mặc định gửi request HTTP trước rồi mới nhận redirect 301 sang HTTPS. Kẻ tấn công chặn gói tin đầu tiên này và giữ kết nối HTTP với người dùng trong khi nó kết nối HTTPS với ngân hàng (SSL Strip). HSTS ép buộc trình duyệt: *"Trong 1 năm tới (`max-age=31536000`), mọi liên kết tới trang này BẮT BUỘC phải dùng HTTPS ngay từ đầu trên máy client, không bao giờ gửi gói HTTP thô"*.

### Câu 12: Trong luồng xác thực OAuth 2.0 cho các ứng dụng Single Page Application (SPA) hoặc Mobile App, luồng nào được khuyến nghị an toàn nhất thay thế cho Implicit Flow?
- [x] Authorization Code Flow kết hợp PKCE (Proof Key for Code Exchange) để chống giả mạo mã ủy quyền mà không cần lưu trữ client secret.
- [ ] Resource Owner Password Credentials Flow (truyền username và password trực tiếp lên client SPA để lấy token).
- [ ] Client Credentials Flow (dùng client_id và client_secret lưu cứng trong source code JavaScript của trình duyệt).
- [ ] Implicit Flow truyền thẳng access token qua fragment URL `#access_token=...` trên thanh địa chỉ của trình duyệt.

> **Giải thích:** Ứng dụng SPA (React, Vue) và Mobile là "Public Client" - không thể lưu trữ an toàn `client_secret` (hacker dễ dàng dịch ngược code JS/APK để lấy secret). Implicit Flow trả Access Token thẳng về URL hash rất dễ bị lộ. Authorization Code Flow with PKCE dùng cặp mã ngẫu nhiên `code_verifier` và `code_challenge` sinh động trên mỗi phiên đăng nhập, loại bỏ hoàn toàn nhu cầu về `client_secret` mà vẫn chống được tấn công chặn mã Auth Code.

### Câu 13: Điểm khác biệt quan trọng giữa OAuth 2.0 và OpenID Connect (OIDC) là gì?
- [x] OAuth 2.0 là khuôn khổ Ủy quyền truy cập (Authorization - cấp quyền cho ứng dụng truy cập API thay mặt user); còn OIDC là tầng Nhận thực danh tính (Authentication - xác nhận user là ai, trả về ID Token dạng JWT).
- [ ] OAuth 2.0 chỉ hoạt động trên mạng nội bộ Intranet, trong khi OIDC bắt buộc phải có kết nối Internet công cộng thông qua DNS toàn cầu.
- [ ] OAuth 2.0 bắt buộc sử dụng chứng chỉ số X.509 để mã hóa gói tin, còn OIDC chỉ sử dụng chuỗi khóa bí mật HMAC-SHA256.
- [ ] OAuth 2.0 quản lý phiên đăng nhập thông qua Stateful Session Cookie, còn OIDC chỉ dùng Stateless LocalStorage.

> **Giải thích:** OAuth 2.0 chỉ trả về `Access Token` (chìa khóa phòng khách sạn: dùng để mở cửa phòng nhưng chìa khóa không in tên ai). OIDC là một tầng mỏng xây dựng phía trên OAuth 2.0, bổ sung thêm `id_token` (chứng minh nhân dân: chứa thông tin `sub`, `email`, `name` đã được ký số) để ứng dụng biết chính xác danh tính người đăng nhập.

### Câu 14: Kỹ thuật "Subresource Integrity" (SRI) trên các thẻ `<script>` tải từ CDN bên ngoài có vai trò gì?
- [x] Cung cấp mã băm mã hóa (ví dụ `integrity="sha384-..."`) để trình duyệt kiểm tra; nếu file script trên CDN bị sửa đổi hoặc chèn mã độc, trình duyệt lập tức từ chối thực thi script đó.
- [ ] Tự động định tuyến tải file JavaScript từ máy chủ CDN có khoảng cách địa lý gần nhất nhằm giảm thiểu Round Trip Time.
- [ ] Cho phép trình duyệt nén mã JavaScript tải từ CDN bằng thuật toán Brotli trước khi lưu vào bộ nhớ cache.
- [ ] Bỏ qua chính sách cùng nguồn gốc (Same-Origin Policy) để cho phép script trên CDN đọc toàn bộ cookie của domain chính.

> **Giải thích:** Khi dùng CDN bên thứ ba (`<script src="https://cdn.com/lib.js">`), nếu server CDN bị hack, hàng triệu trang web dùng thư viện đó sẽ bị chèn mã độc. Thuộc tính SRI bắt buộc trình duyệt băm file tải về và so khớp với chuỗi `integrity`: chỉ cần sai khác 1 ký tự, trình duyệt lập tức chặn file và báo lỗi bảo mật, bảo vệ người dùng an toàn tuyệt đối.

### Câu 15: Trong giao thức bắt tay TLS 1.3, tính năng "0-RTT Resumption" (Zero Round Trip Time) mang lại lợi ích gì và có rủi ro bảo mật tiềm ẩn nào?
- [x] Giúp Client đã từng kết nối có thể gửi dữ liệu ứng dụng (HTTP request) ngay trong gói tin đầu tiên mà không cần chờ bắt tay; nhưng có nguy cơ bị tấn công phát lại (Replay Attacks).
- [ ] Cho phép Client và Server bỏ qua hoàn toàn việc mã hóa dữ liệu đường truyền; nhưng dễ bị nhà mạng nghe lén thông tin cá nhân.
- [ ] Tự động gia hạn chứng chỉ số SSL khi gần hết hạn; nhưng có nguy cơ bị Certificate Authority thu hồi quyền phát hành.
- [ ] Giúp tăng gấp đôi kích thước payload của gói tin TCP; nhưng dễ gây hiện tượng phân mảnh gói tin (IP Fragmentation).

> **Giải thích:** TLS 1.3 giảm thời gian bắt tay từ 2-RTT xuống 1-RTT. Với 0-RTT Resumption, client tái sử dụng thông tin khóa đã thỏa thuận từ phiên trước để gửi ngay request HTTP đầu tiên. Tuy nhiên, nếu kẻ tấn công nghe lén và gửi lại chính gói tin 0-RTT đó (Replay Attack), chúng có thể nhân đôi các thao tác không an toàn (như gọi lại lệnh thanh toán nếu API không có Idempotency Key).

### Câu 16: Lỗ hổng Server-Side Request Forgery (SSRF) xảy ra khi nào?
- [x] Khi máy chủ web bị kẻ tấn công thao túng để gửi các yêu cầu mạng giả mạo từ chính máy chủ đó tới các dịch vụ nội bộ (Intranet) hoặc Cloud Metadata API (`169.254.169.254`) vốn không công khai ra ngoài.
- [ ] Khi client gửi request liên tục với tần số cao vượt ngưỡng cho phép, khiến máy chủ backend bị tràn bộ nhớ và sập tiến trình.
- [ ] Khi kẻ tấn công chèn mã độc JavaScript vào trình duyệt để ép người dùng gửi request chuyển tiền ngoài ý muốn.
- [ ] Khi cơ sở dữ liệu phân tán bị mất phân vùng mạng (Network Partition), dẫn đến hiện tượng đọc dữ liệu cũ chưa đồng bộ.

> **Giải thích:** Thường xảy ra ở các tính năng như "Nhập ảnh từ URL" (`POST /fetch-avatar?url=...`). Kẻ tấn công truyền `url=http://169.254.169.254/latest/meta-data/iam/security-credentials/`. Máy chủ web nằm trong mạng nội bộ AWS sẽ gửi request lấy credential và trả về cho hacker, làm lộ toàn bộ quyền truy cập tài nguyên đám mây của doanh nghiệp.

### Câu 17: Tính chất "Forward Secrecy" (Bảo mật chuyển tiếp / Perfect Forward Secrecy - PFS) trong mã hóa TLS đảm bảo điều gì?
- [x] Đảm bảo rằng dù Khóa bí mật dài hạn (Private Key) của máy chủ có bị lộ trong tương lai, kẻ tấn công cũng không thể giải mã được các gói tin dữ liệu phiên làm việc đã thu thập được từ trước đó.
- [ ] Đảm bảo mật khẩu của người dùng được tự động thay đổi định kỳ 30 ngày một lần mà không cần xác nhận qua email.
- [ ] Đảm bảo gói tin TCP luôn được chuyển tiếp tự động sang máy chủ dự phòng (Failover Server) ngay khi máy chủ chính gặp sự cố.
- [ ] Đảm bảo các request HTTP/1.1 được tự động nâng cấp chuyển tiếp lên giao thức HTTP/2 mà không cần cấu hình thêm Nginx.

> **Giải thích:** Trước đây dùng RSA Key Exchange: Khóa phiên được mã hóa bằng Public Key của server. Nếu 5 năm sau hacker lấy được Private Key của server, chúng có thể giải mã toàn bộ dữ liệu mạng mà chúng đã ghi lại từ 5 năm trước. Với PFS (dùng trao đổi khóa Diffie-Hellman tạm thời ECDHE), mỗi phiên kết nối sinh ra một cặp khóa tạm thời (Ephemeral key) độc lập và hủy ngay sau đó, đảm bảo lịch sử quá khứ luôn an toàn tuyệt đối.

### Câu 18: Sự khác biệt bản chất giữa Xác thực (Authentication) và Phân quyền (Authorization) là gì?
- [x] Authentication trả lời câu hỏi "Bạn là ai?" (xác minh danh tính qua mật khẩu, OTP, vân tay); còn Authorization trả lời câu hỏi "Bạn có quyền thực hiện hành vi gì?" (kiểm tra vai trò và quyền hạn đối với tài nguyên).
- [ ] Authentication là cơ chế bảo mật phía Client (Front-end), còn Authorization là cơ chế bảo mật hoàn toàn phía Server (Back-end).
- [ ] Authorization luôn phải diễn ra trước Authentication trong quy trình xử lý Filter Chain của một Web Application chuẩn.
- [ ] Authentication sử dụng mã trạng thái HTTP 403 Forbidden, còn Authorization sử dụng mã trạng thái HTTP 401 Unauthorized.

> **Giải thích:** Luôn ghi nhớ quy tắc: Xác thực danh tính (Authentication / 401 Unauthorized) phải thành công trước; sau đó hệ thống mới kiểm tra xem danh tính này có quyền truy cập tài nguyên quản trị hay không (Authorization / 403 Forbidden).

### Câu 19: Lỗ hổng bảo mật "Broken Object Level Authorization" (BOLA / IDOR) trong REST API xảy ra khi nào?
- [x] Khi API nhận định danh ID của tài nguyên từ request của client (như `GET /api/documents/1234`) mà không kiểm tra xem người dùng đang đăng nhập có thực sự sở hữu hoặc có quyền xem tài nguyên đó hay không.
- [ ] Khi máy chủ cơ sở dữ liệu không thiết lập chỉ mục (Index) trên khóa chính, dẫn đến câu truy vấn bị timeout khi tải dữ liệu lớn.
- [ ] Khi token JWT truyền trong Header Authorization bị hết hạn sử dụng nhưng server không trả về mã lỗi 401 Unauthorized.
- [ ] Khi hai client đồng thời gửi request cập nhật cùng một bản ghi mà không sử dụng cơ chế khóa lạc quan (Optimistic Locking).

> **Giải thích:** IDOR (Insecure Direct Object Reference / BOLA - Lỗ hổng số 1 trong OWASP API Top 10): Người dùng A đăng nhập hợp lệ với User ID 1. Họ sửa URL thành `GET /invoices/999` (hóa đơn của người dùng B). Nếu server chỉ kiểm tra "đã đăng nhập chưa" mà quên kiểm tra `invoice.userId === currentUser.id`, người dùng A sẽ đọc trộm toàn bộ dữ liệu riêng tư của người dùng B.

### Câu 20: Tấn công Slowloris là dạng tấn công DoS hoạt động theo cơ chế nào?
- [x] Kẻ tấn công mở hàng nghìn kết nối HTTP tới máy chủ và gửi header cực kỳ chậm chạp từng phần nhỏ, giữ cho socket luôn mở và chiếm dụng toàn bộ Connection/Thread Pool khiến server không thể tiếp nhận client mới.
- [ ] Kẻ tấn công khuếch đại lưu lượng UDP thông qua các máy chủ DNS mở để làm nghẽn hoàn toàn băng thông đường truyền của nhà cung cấp mạng.
- [ ] Kẻ tấn công liên tục gửi các payload nén khổng lồ (Zip Bomb) để làm cạn kiệt dung lượng đĩa cứng lưu trữ tạm thời của máy chủ web.
- [ ] Kẻ tấn công khai thác lỗ hổng tràn số nguyên trong thư viện OpenSSL để chiếm quyền điều khiển root từ xa trên máy chủ Linux.

> **Giải thích:** Slowloris không cần băng thông lớn (không cần botnet triệu máy tính). Nó khai thác mô hình đa luồng blocking (1 thread cho 1 kết nối): Mở kết nối, gửi `User-Agent: Mozilla/5.0...` rồi cứ mỗi 10 giây gửi 1 dòng header rác. Máy chủ kiên nhẫn chờ đợi header kết thúc (`\r\n\r\n`), làm cạn kiệt thread pool. Phòng chống: Dùng kiến trúc Non-blocking I/O (Nginx, Envoy) hoặc cấu hình `client_header_timeout` ngắn.
