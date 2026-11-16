# Trắc nghiệm chuyên sâu: System Design & Kiến trúc Phân tán

## 1. Khả năng mở rộng, Tính sẵn sàng và Định lý CAP

### Câu 1: Định lý CAP (Brewer's CAP Theorem) phát biểu rằng một hệ thống phân tán khi xảy ra Sự cố phân vùng mạng (Network Partition - P) chỉ có thể chọn một trong hai tính chất nào?
- [x] Tính nhất quán dữ liệu (Consistency - C) HOẶC Tính sẵn sàng phục vụ (Availability - A); không thể đồng thời đạt được cả hai.
- [ ] Tính bảo mật dữ liệu (Confidentiality) HOẶC Tính toàn vẹn dữ liệu (Integrity).
- [ ] Thông lượng truy vấn (Throughput) HOẶC Dung lượng lưu trữ đĩa cứng (Storage Capacity).
- [ ] Tính mở rộng theo chiều ngang (Scale-out) HOẶC Tính mở rộng theo chiều dọc (Scale-up).

> **Giải thích:** Khi mạng giữa các node bị đứt kết nối (Partition - P): 1) Nếu chọn Consistency (CP): Hệ thống từ chối ghi dữ liệu hoặc trả về lỗi để tránh việc các node lưu trữ thông tin mâu thuẫn nhau (ưu tiên ngân hàng, tiền tệ); 2) Nếu chọn Availability (AP): Hệ thống vẫn tiếp tục chấp nhận ghi vào các node còn sống dù dữ liệu giữa các node bị lệch nhau tạm thời (Eventual Consistency - mạng xã hội, bình luận).

### Câu 2: Trong kỹ thuật phân vùng dữ liệu (Database Sharding), thuật toán "Consistent Hashing" giải quyết bài toán lớn nào so với phép băm chia dư truyền thống (`hash(key) % N`)?
- [x] Giảm thiểu tối đa số lượng key phải di chuyển lại (Re-hashing) giữa các server khi thêm mới hoặc gỡ bỏ một node lưu trữ; chỉ có `K/N` số lượng key bị ảnh hưởng thay vì phải xáo trộn lại toàn bộ dữ liệu.
- [ ] Tự động chuyển đổi các bảng dữ liệu không có khóa chính thành các bảng có khóa chính duy nhất.
- [ ] Đảm bảo tất cả các câu lệnh truy vấn SQL JOIN đều có thể thực thi trực tiếp trên cùng một node vật lý.
- [ ] Tự động nén dung lượng của các khóa phân vùng xuống còn 16 bit nhị phân.

> **Giải thích:** Với phép băm chia dư cổ điển `key % N`, khi số node `N` thay đổi từ 4 lên 5, hầu hết mọi key đều cho ra kết quả modulo khác, khiến gần như 100% dữ liệu phải dịch chuyển sang node mới (gây sập hệ thống khi scale). Consistent Hashing ánh xạ các node và key lên một Vòng tròn băm (Hash Ring 0 -> 2^32-1); khi thêm node mới, chỉ những key nằm giữa node mới và node liền kề mới phải di chuyển.

### Câu 3: Thuật toán Rate Limiting theo cơ chế Token Bucket (Thùng token) hoạt động theo nguyên lý nào?
- [x] Token được nạp đều đặn vào thùng với tốc độ `r` cho đến khi đầy dung lượng `b`; mỗi request đến phải tiêu thụ 1 token: có token thì được xử lý, hết token thì bị từ chối; hỗ trợ tốt các đợt lưu lượng tăng đột biến (Traffic Burst).
- [ ] Đếm số lượng request trong một cửa sổ thời gian cố định và reset bộ đếm về 0 ngay khi bước sang chu kỳ tiếp theo.
- [ ] Đặt các request đến vào một hàng đợi FIFO có dung lượng cố định và xả request ra xử lý với tốc độ không đổi (Constant Outflow Rate).
- [ ] Ghi lại mốc thời gian (Timestamp) của tất cả các request trong vòng 60 giây gần nhất và loại bỏ các mốc thời gian đã quá hạn.

> **Giải thích:** Token Bucket là thuật toán Rate Limiting phổ biến nhất (dùng trong AWS, Stripe, Cloudflare): Dung lượng thùng `b` cho phép hệ thống chịu được một đợt tăng vọt request trong tích tắc (miễn là còn token trong thùng), trong khi tốc độ nạp `r` kiểm soát lưu lượng trung bình dài hạn một cách mượt mà và ổn định.

### Câu 4: Điểm khác biệt cốt lõi giữa "Database Replication" (Nhân bản dữ liệu) và "Database Sharding" (Phân mảnh dữ liệu) là gì?
- [x] Replication sao chép toàn bộ tập dữ liệu giống nhau sang nhiều máy chủ (Master-Replica) để tăng năng lực đọc và dự phòng sự cố; còn Sharding chia nhỏ tập dữ liệu thành các phần riêng biệt trên nhiều máy chủ để tăng năng lực ghi và mở rộng dung lượng.
- [ ] Replication chỉ áp dụng được cho cơ sở dữ liệu NoSQL, còn Sharding chỉ dùng cho cơ sở dữ liệu quan hệ SQL.
- [ ] Replication lưu trữ dữ liệu hoàn toàn trên bộ nhớ RAM, trong khi Sharding lưu trữ dữ liệu trên đĩa từ tính.
- [ ] Replication tự động giải quyết các xung đột dữ liệu đa luồng, còn Sharding yêu cầu phải cài đặt các khóa phân tán.

> **Giải thích:**
- **Replication**: Node Master xử lý Ghi, các Node Replica sao chép dữ liệu từ Master để chia sẻ tải Đọc. Nhược điểm: Mọi node đều phải lưu toàn bộ dữ liệu (không giải quyết được khi dữ liệu vượt quá dung lượng ổ cứng của 1 máy).
- **Sharding (Horizontal Partitioning)**: Chia dữ liệu theo hàng ngang: User 1-1M ở Node 1, User 1M-2M ở Node 2. Giúp mở rộng dung lượng ghi và lưu trữ vô hạn (Scale-out).

### Câu 5: Thành phần "Message Queue" (như Kafka, RabbitMQ) mang lại lợi ích kiến trúc quan trọng nào nhất trong hệ thống Microservices?
- [x] Phân rã (Decoupling) sự phụ thuộc trực tiếp giữa các service, làm phẳng các đỉnh đột biến lưu lượng (Traffic Peak Shaving / Buffering), và đảm bảo tính sẵn sàng bất đồng bộ.
- [ ] Tự động phát hiện và vá các lỗ hổng bảo mật trong mã nguồn ứng dụng trước khi triển khai.
- [ ] Đồng bộ hóa cấu trúc bảng dữ liệu tự động giữa tất cả các vi dịch vụ trong hệ thống.
- [ ] Giúp tăng tốc độ xử lý của các câu lệnh tính toán số học nặng về CPU trong dịch vụ.

> **Giải thích:** Nếu Service Đặt hàng gọi trực tiếp HTTP sang Service Thanh toán, khi Service Thanh toán bị chậm hoặc sập, Service Đặt hàng sẽ bị kẹt luồng (Cascading Failure) và sập theo. Khi dùng Message Queue: Service Đặt hàng chỉ việc đẩy message vào hàng đợi và phản hồi khách hàng ngay (vài mili-giây); Service Thanh toán tự lấy message ra xử lý theo tốc độ của nó mà không làm sập hệ thống (Peak Shaving).

### Câu 6: Trong kiến trúc Caching, chiến lược "Write-Back" (hay Write-Behind) khác biệt gì so với "Write-Through"?
- [x] Write-Through ghi đồng thời vào cả Cache và Database trước khi trả về thành công cho client; còn Write-Back CHỈ GHI VÀO CACHE và trả về thành công ngay lập tức, sau đó một tiến trình ngầm mới gom các bản ghi trong cache để xả từ từ xuống Database.
- [ ] Write-Through chỉ dùng để đọc dữ liệu từ cache, còn Write-Back dùng để ghi dữ liệu trực tiếp vào database.
- [ ] Write-Through lưu trữ dữ liệu trên đĩa cứng, trong khi Write-Back lưu trữ dữ liệu trên bộ nhớ RAM.
- [ ] Write-Back đảm bảo không bao giờ bị mất dữ liệu kể cả khi máy chủ cache bị mất điện đột ngột.

> **Giải thích:** Write-Back mang lại tốc độ ghi cực đại và giảm tải tối đa cho Database (thích hợp cho các hệ thống đếm lượt view, theo dõi tọa độ GPS xe công nghệ). Điểm đánh đổi: Nếu server Cache bị sập hoặc cúp điện đột ngột trước khi kịp xả dữ liệu xuống Database, các bản ghi chưa kịp đồng bộ sẽ bị mất vĩnh viễn.

### Câu 7: Thuật toán cân bằng tải "Least Connections" (Ít kết nối nhất) vượt trội hơn "Round Robin" (Vòng tròn luân phiên) trong kịch bản nào?
- [x] Khi thời gian xử lý của các request có sự chênh lệch lớn (ví dụ có request chỉ mất vài mili-giây nhưng có request xử lý file nặng mất nhiều giây); giúp định tuyến request mới tới server đang có ít kết nối active nhất để tránh nghẽn cục bộ.
- [ ] Khi tất cả các request gửi đến đều có thời gian phản hồi đồng nhất và các server backend có cấu hình phần cứng y hệt nhau.
- [ ] Khi hệ thống yêu cầu các request từ cùng một người dùng phải luôn luôn được định tuyến về cùng một máy chủ backend cố định.
- [ ] Khi mạng kết nối giữa Load Balancer và các server backend sử dụng giao thức truyền thông UDP không kết nối.

> **Giải thích:** Round Robin phân phối mù quáng `1 -> 2 -> 3 -> 1`: Nếu Server 1 vô tình nhận 3 request nặng mất 10s xử lý, nó vẫn tiếp tục bị nhồi thêm request mới trong khi Server 2 và 3 đang hoàn toàn rảnh rỗi. Least Connections theo dõi số lượng kết nối active thực tế, đảm bảo tài nguyên giữa các server luôn được san sẻ tối ưu.

### Câu 8: Cấu trúc của định danh duy nhất phân tán theo thuật toán "Twitter Snowflake" (số nguyên 64-bit) bao gồm những thành phần nào?
- [x] 1 bit dấu (0) + 41 bit Timestamp (thời gian tính bằng mili-giây) + 10 bit Machine/Node ID (định danh máy chủ trong cụm) + 12 bit Sequence Number (số thứ tự tự tăng trong cùng 1 mili-giây).
- [ ] 32 bit địa chỉ IPv4 của máy chủ + 16 bit số cổng Port + 16 bit số ngẫu nhiên sinh bởi hàm băm.
- [ ] 48 bit địa chỉ MAC của card mạng máy chủ + 16 bit thời gian thực tính theo đơn vị nano-giây.
- [ ] 64 bit được sinh hoàn toàn ngẫu nhiên bởi bộ sinh số giả ngẫu nhiên bảo mật (CSPRNG).

> **Giải thích:** Snowflake ID là phát minh kiến trúc vĩ đại: 1) Là số nguyên 64-bit (`long`) vừa vặn trong 8 byte (nhỏ gọn hơn UUID 36 ký tự rất nhiều, làm Index B-Tree trong SQL cực nhanh); 2) Tự động sắp xếp tăng dần theo thời gian (Time-sortable) nhờ 41 bit timestamp ở đầu; 3) Mỗi máy chủ sinh ID độc lập trong bộ nhớ cục bộ mà không cần đồng bộ hay khóa tập trung, tốc độ đạt hơn 4 triệu ID/giây trên mỗi node.

### Câu 9: Mẫu hình kiến trúc "Saga Pattern" giải quyết bài toán Giao dịch phân tán (Distributed Transactions) giữa các microservices theo cơ chế nào?
- [x] Chia nhỏ giao dịch lớn thành một chuỗi các giao dịch cục bộ tuần tự (Local Transactions); nếu một bước thất bại, Saga sẽ kích hoạt tuần tự các "Giao dịch bù trừ" (Compensating Transactions) để hoàn tác các bước đã làm trước đó.
- [ ] Sử dụng khóa hai pha (Two-Phase Commit - 2PC) để chiếm giữ khóa độc quyền trên tất cả các cơ sở dữ liệu liên quan cho đến khi mọi service xác nhận thành công.
- [ ] Ép buộc tất cả các microservices phải chia sẻ chung một phiên bản cơ sở dữ liệu quan hệ duy nhất và dùng chung một Connection Pool.
- [ ] Tự động chuyển đổi các thao tác ghi dữ liệu thất bại thành các thông báo lỗi gửi trực tiếp qua email cho quản trị viên.

> **Giải thích:** Ví dụ quy trình đặt hàng: 1) Trừ tiền ví -> 2) Trừ kho hàng -> 3) Tạo đơn vận chuyển. Nếu bước 3 bị lỗi (hết shipper): Hệ thống kích hoạt Giao dịch bù trừ: Cộng lại số lượng hàng vào kho -> Hoàn tiền lại vào ví khách hàng. Có hai cách triển khai Saga: Choreography (các service giao tiếp qua Event) và Orchestration (một Orchestrator service trung tâm điều phối toàn bộ luồng).

### Câu 10: Mẫu thiết kế "Circuit Breaker" (Cầu dao ngắt mạch) hoạt động với 3 trạng thái chuẩn nào?
- [x] Closed (Bình thường, cho request đi qua) -> Open (Tỷ lệ lỗi vượt ngưỡng, lập tức ngắt mọi request và trả về fallback) -> Half-Open (Cho phép một số ít request đi qua thử nghiệm để thăm dò xem service đích đã hồi phục hay chưa).
- [ ] Active (Đang hoạt động) -> Inactive (Tạm dừng hoạt động) -> Standby (Chờ dự phòng thay thế).
- [ ] Reading (Chỉ đọc) -> Writing (Chỉ ghi) -> Read-Write (Cả đọc lẫn ghi).
- [ ] Primary (Máy chủ chính) -> Secondary (Máy chủ phụ) -> Quorum (Đồng thuận đa số).

> **Giải thích:** Khi Service B bị sập: Nếu Service A liên tục gọi sang B, hàng ngàn luồng của A sẽ bị treo chờ timeout (Cascading Failure làm sập luôn cả Service A). Circuit Breaker hoạt động như cầu dao điện gia đình: Khi tỷ lệ lỗi vượt quá 50%, cầu dao "BẬT MỞ" (OPEN): Mọi request gọi sang B bị ngắt lập tức và trả về giao diện dự phòng (Fallback UI) trong 0 mili-giây, giúp bảo vệ Service A và cho Service B thời gian để tự hồi phục.

### Câu 11: Mẫu hình kiến trúc "CQRS" (Command Query Responsibility Segregation) đề xuất giải pháp nào cho việc quản lý dữ liệu?
- [x] Tách rời hoàn toàn mô hình xử lý Ghi dữ liệu (Command: Create/Update/Delete - tối ưu hóa nghiệp vụ và toàn vẹn) và mô hình Đọc dữ liệu (Query - tối ưu hóa tốc độ truy vấn, có thể dùng Read DB riêng hoặc Elasticsearch/Redis phi chuẩn hóa).
- [ ] Bắt buộc tất cả các câu truy vấn SELECT phải được thực thi thông qua hàng đợi tin nhắn bất đồng bộ.
- [ ] Hợp nhất toàn bộ dữ liệu của hệ thống vào một bảng cơ sở dữ liệu phẳng duy nhất để loại bỏ các câu lệnh JOIN.
- [ ] Chỉ cho phép các thao tác ghi dữ liệu được thực hiện vào ban đêm và các thao tác đọc dữ liệu vào ban ngày.

> **Giải thích:** Trong các hệ thống lớn, nhu cầu đọc và ghi hoàn toàn trái ngược nhau: Ghi cần chuẩn hóa (3NF) để tránh mâu thuẫn; Đọc cần phi chuẩn hóa (Elasticsearch, Read replica phẳng) để lấy dữ liệu nhanh mà không cần JOIN. CQRS cho phép bạn scale độc lập 2 bên: Cụm Command dùng PostgreSQL cluster; mỗi khi có thay đổi, sự kiện được bắn qua Kafka để đồng bộ bất đồng bộ sang cụm Query (Elasticsearch) cho người dùng tìm kiếm siêu tốc.

### Câu 12: Trong thiết kế hệ thống Newsfeed mạng xã hội, sự khác biệt giữa "Fan-out on Write" (Push model) và "Fan-out on Read" (Pull model) là gì?
- [x] Fan-out on Write: Khi người dùng đăng bài, hệ thống chủ động đẩy ID bài viết vào Timeline (Inbox) của tất cả followers; còn Fan-out on Read: Người đăng chỉ ghi vào bảng của mình, khi follower mở app thì hệ thống mới kéo và gộp bài viết của những người họ theo dõi.
- [ ] Fan-out on Write chỉ dùng cho bài viết có chứa hình ảnh, còn Fan-out on Read dùng cho bài viết chỉ có chữ.
- [ ] Fan-out on Write lưu trữ dữ liệu trên đĩa cứng, trong khi Fan-out on Read lưu trữ dữ liệu trên bộ nhớ RAM.
- [ ] Fan-out on Write đòi hỏi người dùng phải luôn luôn online, trong khi Fan-out on Read chỉ hoạt động khi người dùng offline.

> **Giải thích:**
- **Fan-out on Write (Push)**: Đọc Timeline siêu nhanh O(1) từ Redis List. Nhưng gặp "Vấn đề người nổi tiếng" (Celebrity Problem): Sơn Tùng M-TP có 10 triệu followers đăng 1 bài -> Hệ thống phải thực hiện 10 triệu thao tác ghi vào 10 triệu timeline trong tích tắc, gây nghẽn hàng đợi!
- **Giải pháp Hybrid thực tế**: Người dùng bình thường dùng Push model (Fan-out on Write); Người nổi tiếng (> 100k followers) dùng Pull model (chỉ kéo bài của họ khi user mở app) để cân bằng tải hoàn hảo.

### Câu 13: Cấu trúc chỉ mục không gian (Spatial Index) nào thường được sử dụng trong các hệ thống định vị lân cận (Proximity Service như Uber, Grab) để tìm kiếm các tài xế trong bán kính nhất định?
- [x] GeoHash hoặc Google S2 Geometry (chuyển đổi tọa độ 2D Kinh độ / Vĩ độ thành chuỗi ký tự 1D hoặc số nguyên 64-bit đại diện cho các ô lưới hình học trên Trái Đất).
- [ ] Cây đỏ đen (Red-Black Tree) thông thường của Java Collections.
- [ ] Bảng băm đa chiều dựa trên hàm băm SHA-256.
- [ ] Cấu trúc danh sách liên kết vòng (Circular Linked List).

> **Giải thích:** Nếu dùng truy vấn SQL: `WHERE latitude BETWEEN ... AND longitude BETWEEN ...`, database phải quét diện tích hình chữ nhật cực kỳ chậm chạp. GeoHash chia bề mặt Trái Đất thành các ô lưới đệ quy theo hệ nhị phân và mã hóa thành chuỗi Base32 (ví dụ `"w4r8yc"`). Hai địa điểm ở gần nhau sẽ có chung tiền tố (Prefix). Việc tìm tài xế lân cận quy về câu lệnh tìm kiếm tiền tố cực nhanh trên B-Tree Index: `WHERE geohash LIKE 'w4r8y%'`.

### Câu 14: Kỹ thuật Content Delivery Network (CDN) phân phối nội dung tĩnh tới người dùng dựa trên cơ chế định tuyến mạng nào để đưa request tới máy chủ biên (Edge Server) gần nhất?
- [x] Anycast DNS / Anycast BGP Routing (chia sẻ cùng một địa chỉ IP công khai trên nhiều máy chủ trên khắp thế giới, hạ tầng mạng internet tự động định tuyến gói tin tới điểm hiện diện PoP có độ trễ mạng ngắn nhất).
- [ ] Giao thức chuyển tiếp gói tin Point-to-Point Tunneling Protocol (PPTP).
- [ ] Cơ chế broadcast gói tin đồng thời tới tất cả các nhà cung cấp dịch vụ mạng (ISP) trên toàn cầu.
- [ ] Quét địa chỉ MAC của thiết bị người dùng để xác định vị trí địa lý của máy tính cá nhân.

> **Giải thích:** Anycast cho phép hàng trăm máy chủ Edge Server của Cloudflare/Akamai trên toàn cầu cùng mang một địa chỉ IP duy nhất (ví dụ `1.1.1.1`). Giao thức định tuyến BGP của mạng internet sẽ tự động điều hướng gói tin từ máy tính của bạn đi qua tuyến cáp quang ngắn nhất tới Data Center gần bạn nhất (ví dụ ở TP.HCM thay vì phải chạy vòng sang tận Mỹ), giảm thời gian tải trang từ 200ms xuống chỉ còn 5ms.

### Câu 15: Trong kiến trúc Video Streaming quy mô lớn (như YouTube, Netflix), video được xử lý và phân phối qua giao thức nào để thích ứng tự động với tốc độ mạng của người dùng?
- [x] Chuyển mã (Transcoding) thành nhiều độ phân giải khác nhau (360p, 720p, 1080p, 4K), cắt thành các đoạn nhỏ (Chunks 2-6 giây) và phân phối qua giao thức HLS (HTTP Live Streaming) hoặc MPEG-DASH.
- [ ] Tải toàn bộ file video nguyên khối dung lượng lớn về máy người dùng qua giao thức FTP trước khi phát.
- [ ] Truyền trực tiếp luồng nhị phân của camera máy chủ tới client thông qua kết nối Socket TCP thô.
- [ ] Mã hóa toàn bộ khung hình video thành các chuỗi Base64 và nhúng trực tiếp vào các thẻ HTML5.

> **Giải thích:** Truyền phát thích ứng (Adaptive Bitrate Streaming): Video được cắt thành hàng nghìn file nhỏ `.ts` dài vài giây kèm file danh sách `.m3u8`. Trình phát video trên điện thoại liên tục đo tốc độ mạng: Nếu đang đi qua hầm sóng yếu, nó tự động tải các chunk 360p để video không bị dừng đứng hình (buffering); khi ra chỗ sóng 5G khỏe, nó tự động nâng lên chunk 1080p/4K mượt mà. Toàn bộ các chunk nhỏ này được cache trên CDN cực kỳ hiệu quả vì bản chất chúng chỉ là các file tĩnh thông thường qua HTTP GET.

### Câu 16: Trong thiết kế hệ thống Flash Sale với lưu lượng truy cập đột biến (hàng triệu người cùng bấm mua số lượng hàng có hạn), luồng xử lý tồn kho tối ưu nhất là gì?
- [x] Nạp trước số lượng tồn kho vào Redis, sử dụng mã Lua Script để kiểm tra và trừ kho hàng nguyên tử trên RAM; chỉ những request trừ kho thành công mới được đẩy vào Kafka để dịch vụ phía sau tạo đơn hàng và trừ kho trong Database.
- [ ] Cho toàn bộ hàng triệu request truy cập đồng thời vào chạy câu lệnh `UPDATE products SET stock = stock - 1 WHERE id = ?` trên cơ sở dữ liệu quan hệ.
- [ ] Khóa toàn bộ bảng cơ sở dữ liệu bằng Table Lock để đảm bảo các giao dịch được thực thi hoàn toàn tuần tự.
- [ ] Cho phép tất cả các đơn hàng đều được tạo thành công trong database và sau đó gửi email xin lỗi khách hàng nếu bị thiếu hàng.

> **Giải thích:** Nếu cho hàng triệu request đập thẳng vào MySQL: Câu lệnh `UPDATE ... WHERE id = 1` sẽ tạo ra sự tranh chấp hàng (Row Lock Contention) khốc liệt trên duy nhất 1 dòng dữ liệu, làm cạn kiệt thread pool và sập toàn bộ database trong 2 giây. Với giải pháp Redis + Lua: Redis xử lý 100.000 QPS trên RAM, 1.000 người đầu tiên trừ thành công thì nhận vé vào mua, 999.000 người đến sau nhận thông báo "Hết hàng" ngay tại tầng Redis chỉ trong vài mili-giây mà Database không hề bị ảnh hưởng.

### Câu 17: Hệ thống Rút gọn URL (như Bitly / TinyURL) thường sử dụng giải thuật nào để chuyển đổi số nguyên ID tự tăng thành chuỗi ký tự ngắn gọn 6-7 ký tự?
- [x] Thuật toán chuyển đổi cơ số sang Base62 (`[0-9a-zA-Z]`), đảm bảo tính ánh xạ 1-1 (Bijective) và hoàn toàn không bao giờ xảy ra đụng độ (Zero Collision).
- [ ] Băm số ID bằng thuật toán MD5 rồi lấy 6 ký tự đầu tiên của chuỗi băm.
- [ ] Sử dụng thuật toán nén LZW để nén chuỗi ký tự số thành chuỗi nhị phân ngắn hơn.
- [ ] Mã hóa số ID bằng thuật toán mã hóa công khai RSA 2048-bit.

> **Giải thích:** Không gian Base62 gồm 62 ký tự (10 số + 26 chữ thường + 26 chữ hoa). Một chuỗi 7 ký tự Base62 có thể biểu diễn `62^7 ≈ 3.521 tỷ` liên kết duy nhất. Thuật toán chuyển đổi tương tự như đổi từ hệ thập phân sang hệ nhị phân (chia lấy phần dư liên tục cho 62). Ưu điểm tuyệt đối: Hai số nguyên khác nhau chắc chắn cho ra hai chuỗi Base62 khác nhau 100%, không cần phải kiểm tra đụng độ trong database.

### Câu 18: Kỹ thuật phân vùng dữ liệu theo phương pháp Băm (Hash-based Sharding) có nhược điểm lớn nhất là gì?
- [x] Khó khăn và tốn kém tài nguyên khi cần thêm hoặc bớt các Shard mới (phải di chuyển lại dữ liệu), và kém hiệu quả khi thực hiện các câu truy vấn quét phạm vi (Range Queries buộc phải broadcast query tới tất cả các Shard).
- [ ] Dữ liệu luôn bị tập trung cục bộ vào duy nhất một Shard máy chủ khiến các Shard khác bị nhàn rỗi.
- [ ] Không thể sử dụng các khóa chính có kiểu dữ liệu là chuỗi ký tự (UUID).
- [ ] Bắt buộc tất cả các máy chủ Shard phải có cùng một địa chỉ IP nội bộ.

> **Giải thích:** Phân mảnh theo Hash (`shard_id = hash(user_id) % num_shards`) giúp phân bổ dữ liệu cực kỳ đồng đều (không bị điểm nóng Hotspot). Nhưng nhược điểm: Nếu muốn query `WHERE created_at BETWEEN '2026-11-01' AND '2026-11-04'`, vì dữ liệu bị băm rải rác khắp nơi, ứng dụng bắt buộc phải gửi câu lệnh tới tất cả các Shard (Scatter-Gather) rồi tự gộp lại ở tầng ứng dụng, làm giảm hiệu năng truy vấn khoảng.

### Câu 19: Trong kiến trúc Microservices, giao thức gRPC (dựa trên HTTP/2 và Protocol Buffers) vượt trội hơn REST API (JSON qua HTTP/1.1) ở những điểm nào cho giao tiếp nội bộ giữa các service?
- [x] Kích thước payload nhị phân nhỏ hơn rất nhiều so với JSON, tốc độ tuần tự hóa (Serialization) siêu nhanh, hỗ trợ Streaming hai chiều toàn thời gian, và thực thi kiểm tra kiểu nghiêm ngặt (Strict Contract) thông qua file `.proto`.
- [ ] gRPC không yêu cầu máy chủ phải mở kết nối mạng mà truyền dữ liệu trực tiếp qua bộ nhớ chia sẻ của hệ điều hành.
- [ ] gRPC tự động chuyển đổi các service backend thành các ứng dụng không trạng thái (Stateless).
- [ ] gRPC cho phép các service giao tiếp với nhau mà không cần biết địa chỉ mạng hoặc tên miền của nhau.

> **Giải thích:** JSON là định dạng văn bản (Text-based) chứa nhiều ký tự thừa lặp đi lặp lại (`"username": "...", "email": "..."`), tốn băng thông và tốn CPU để parse chuỗi. Protocol Buffers mã hóa dữ liệu thành nhị phân gọn gàng theo số thứ tự trường (Field Tag), kích thước chỉ bằng 1/3-1/5 JSON và tốc độ parse nhanh gấp 5-10 lần, kết hợp với HTTP/2 Multiplexing biến gRPC thành chuẩn mực vàng cho giao tiếp giữa hàng nghìn microservices nội bộ.

### Câu 20: Mẫu thiết kế "Bulkhead Pattern" (Vách ngăn cách ly sự cố) trong hệ thống phân tán được áp dụng như thế nào để ngăn chặn sự cố dây chuyền (Cascading Failure)?
- [x] Cô lập các tài nguyên quan trọng (như Thread Pools, Connection Pools, bộ nhớ đệm) thành các ngăn riêng biệt cho từng dịch vụ hoặc nghiệp vụ; sự cố cạn kiệt tài nguyên ở một ngăn sẽ không làm ảnh hưởng tới hoạt động của các ngăn khác.
- [ ] Tự động chuyển đổi các request gặp sự cố sang một đường truyền mạng dự phòng độc lập.
- [ ] Bắt buộc tất cả các microservices phải được triển khai trên các vùng địa lý khác nhau trên thế giới.
- [ ] Khởi động lại toàn bộ các máy chủ trong cụm cluster ngay khi phát hiện có một dịch vụ bị phản hồi chậm.

> **Giải thích:** Trong ứng dụng phân tán: Nếu bạn dùng chung 1 Thread Pool cho tất cả các tác vụ (thanh toán, gửi mail, xem báo cáo): Khi dịch vụ gửi mail bị chậm, nó chiếm sạch 100% số luồng của Thread Pool, khiến tính năng cốt lõi là thanh toán cũng bị chết đứng theo! Áp dụng Bulkhead: Chia Thread Pool riêng biệt: Pool 1 dành riêng cho Thanh toán (30 luồng), Pool 2 dành riêng cho Gửi mail (10 luồng). Dù việc gửi mail có bị treo hoàn toàn thì luồng thanh toán vẫn hoạt động bình thường, bảo vệ sự sống còn của toàn hệ thống.
