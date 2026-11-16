# Trắc nghiệm chuyên sâu: Apache Kafka Architecture & Messaging

## 1. Kiến trúc Partition, Offset và Consumer Group

### Câu 1: Đơn vị cơ sở để Apache Kafka thực hiện việc mở rộng quy mô (Scale Out) và xử lý đọc ghi song song là gì?
- [x] Partition (Phân vùng) bên trong một Topic.
- [ ] Toàn bộ một Topic.
- [ ] Consumer Group Coordinator.
- [ ] Schema Registry.

> **Giải thích:** Trong Kafka, mỗi Topic được chia thành nhiều Partition. Một Partition là một hàng đợi nhật ký (Commit Log) tuần tự được lưu trữ trên một Broker. Nhiều Partition cho phép nhiều Consumer trong cùng một Consumer Group đọc dữ liệu song song (mỗi Consumer xử lý 1 hoặc nhiều partition), giúp Kafka đạt thông lượng hàng triệu message mỗi giây.

### Câu 2: Trong Kafka, cơ chế nào giúp một Consumer Group tự động phân chia lại quyền quản lý các Partition giữa các Consumer khi có một Consumer mới tham gia hoặc một Consumer bị chết?
- [x] Consumer Group Rebalance.
- [ ] Broker Leader Election.
- [ ] Log Compaction Cycle.
- [ ] Dynamic Partition Pruning.

> **Giải thích:** Khi số lượng Consumer trong nhóm thay đổi (scale up, scale down) hoặc có node chết (không gửi heartbeat vượt quá `session.timeout.ms`), Group Coordinator sẽ kích hoạt quá trình Rebalance để phân bổ lại quyền đọc các Partition, đảm bảo mọi partition đều được tiêu thụ liên tục và không bị bỏ rơi.

### Câu 3: Kỹ thuật nhân hệ điều hành (OS Kernel) nào giúp Kafka đạt thông lượng truyền dữ liệu mạng từ đĩa cứng (Disk-to-NIC) cực đại?
- [x] Kỹ thuật "Zero-Copy" thông qua lệnh gọi hệ thống `sendfile()` của Linux, cho phép truyền dữ liệu trực tiếp từ OS Page Cache ra Network Socket mà không cần sao chép qua vùng nhớ User Space.
- [ ] Kỹ thuật ghi trực tiếp Direct I/O để bỏ qua hoàn toàn bộ đệm Page Cache của hệ điều hành.
- [ ] Kỹ thuật nén dữ liệu liên tục trong RAM bằng thuật toán Huffman trước khi đẩy vào card mạng.
- [ ] Kỹ thuật gộp tất cả các luồng TCP mạng thành một socket đơn lẻ để giảm chi phí bắt tay TLS.

> **Giải thích:** Thông thường đọc ghi file qua mạng cần 4 lần context switch và 4 lần sao chép dữ liệu giữa Kernel Space và User Space. Zero-Copy (`sendfile`) của Linux cho phép hệ điều hành đưa dữ liệu trực tiếp từ Page Cache vào Network Interface Card (NIC) buffer, giảm tải CPU và tăng tốc độ truyền tải đạt mức tối đa của băng thông mạng phần cứng.

### Câu 4: Cấu hình `acks=all` (hoặc `acks=-1`) trên Kafka Producer có ý nghĩa kỹ thuật gì về mặt đảm bảo an toàn dữ liệu?
- [x] Producer chỉ coi message được gửi thành công khi Leader Partition và TOÀN BỘ các bản sao đồng bộ (In-Sync Replicas - ISR) đã ghi nhận message vào log.
- [ ] Producer gửi bản sao của message tới tất cả các Topic hiện có trong toàn bộ cụm Broker.
- [ ] Producer tự động chuyển đổi phương thức truyền tin sang giao thức UDP để tránh việc chờ xác nhận.
- [ ] Producer chỉ cần Leader Partition ghi nhận vào Page Cache là lập tức nhận phản hồi thành công.

> **Giải thích:** 
- `acks=0`: Bắn rồi quên (Fire-and-forget), tốc độ cao nhất nhưng dễ mất tin.
- `acks=1`: Chỉ cần Leader ghi xong là trả về thành công (nếu leader chết trước khi replica kịp copy thì mất tin).
- `acks=all` kết hợp `min.insync.replicas=2`: Đảm bảo ít nhất 2 bản sao đã ghi log thành công mới trả về ACK cho Producer, mang lại mức độ tin cậy cao nhất trong hệ thống tài chính/giao dịch.

### Câu 5: Tính năng "Log Compaction" trong Apache Kafka giữ lại dữ liệu theo nguyên tắc nào?
- [x] Giữ lại bản ghi mới nhất (latest record) cho mỗi Message Key và loại bỏ các bản ghi cũ có cùng Key, rất thích hợp cho việc lưu trữ trạng thái hiện tại (State Store/CDC).
- [ ] Tự động nén các file log nhị phân cũ thành định dạng tệp nén để tiết kiệm dung lượng đĩa.
- [ ] Xóa bỏ toàn bộ các message có kích thước lớn hơn 1MB để giải phóng không gian lưu trữ cho Broker.
- [ ] Tự động xóa sạch toàn bộ log trong partition ngay khi có ít nhất một Consumer đọc qua.

> **Giải thích:** Khác với cơ chế xóa theo thời gian thông thường (`delete` retention), Log Compaction quét qua các segment log đã đóng: nếu một key xuất hiện nhiều lần (ví dụ trạng thái tài khoản ngân hàng `ACC_01` thay đổi qua 10 giao dịch), Kafka chỉ giữ lại bản ghi cuối cùng của `ACC_01` và dọn dẹp các bản ghi cũ, giúp ứng dụng khôi phục lại snapshot trạng thái toàn vẹn cực kỳ nhanh chóng.

### Câu 6: Trong Kafka Consumer, sự khác biệt căn bản giữa `commitSync()` và `commitAsync()` khi quản lý Offset thủ công là gì?
- [x] `commitSync()` chặn luồng cho đến khi Broker xác nhận và tự động thử lại nếu gặp lỗi tạm thời; còn `commitAsync()` gửi request commit ngầm phi chặn, thông lượng cao hơn nhưng không tự động retry để tránh lệch thứ tự offset.
- [ ] `commitSync()` chỉ commit offset xuống bộ nhớ RAM của client, còn `commitAsync()` commit trực tiếp vào topic `__consumer_offsets`.
- [ ] `commitSync()` bắt buộc phải truyền danh sách cụ thể từng partition, còn `commitAsync()` chỉ dùng để commit toàn bộ topic.
- [ ] `commitSync()` xóa sạch bộ đệm tin nhắn của consumer, trong khi `commitAsync()` giữ lại tin nhắn để đọc lại.

> **Giải thích:** Thực tế chuẩn mực: Trong vòng lặp tiêu thụ, sử dụng `commitAsync()` để đạt thông lượng cao nhất; và trong khối `finally` trước khi đóng consumer (`consumer.close()`), gọi `commitSync()` một lần duy nhất để chốt chặn toàn bộ offset cuối cùng một cách an toàn.

### Câu 7: Thuật toán phân vùng mặc định của Kafka Producer hiện đại (Sticky Partitioner) sẽ xử lý như thế nào nếu `key` của tin nhắn là `null`?
- [x] Gom các tin nhắn liên tiếp không có key vào cùng một partition cho đến khi đầy một batch rồi mới chuyển sang partition tiếp theo, nhằm tối đa hóa kích thước lô tin nhắn và giảm độ trễ mạng.
- [ ] Luôn luôn gửi toàn bộ các tin nhắn không có key vào Partition có chỉ số 0.
- [ ] Phân phối tuần tự từng tin nhắn theo thuật toán Round-Robin đơn thuần sang lần lượt từng partition bất kể kích thước batch.
- [ ] Báo lỗi ngoại lệ `IllegalArgumentException` và từ chối gửi tin nhắn nếu không cung cấp khóa định tuyến.

> **Giải thích:** Trước Kafka 2.4, khi `key = null`, Producer phân phối vòng tròn Round-robin từng tin nhắn sang các partition, dẫn đến việc các batch bị phân tán nhỏ lẻ (nhiều request mạng nhỏ tốn CPU). Từ Kafka 2.4, Sticky Partitioner gom các message liên tiếp vào 1 partition để lấp đầy 1 batch lớn duy nhất rồi mới "nhảy" sang partition khác, tăng hiệu năng lên gấp nhiều lần.

### Câu 8: Khái niệm "High Watermark" (HW) trong một Partition của Kafka đại diện cho điều gì?
- [x] Là vị trí Offset lớn nhất mà TẤT CẢ các bản sao trong tập hợp In-Sync Replicas (ISR) đều đã ghi chép thành công; Consumer CHỈ ĐƯỢC PHÉP đọc các message nằm dưới ngưỡng này để đảm bảo tính nhất quán.
- [ ] Là vị trí offset cao nhất mà Leader Partition đã ghi nhận vào tệp log cục bộ (Log End Offset).
- [ ] Là ngưỡng dung lượng lưu trữ tối đa của một partition trước khi Kafka tự động kích hoạt tiến trình xóa log cũ.
- [ ] Là số lượng message tối đa mà một Consumer Group được phép tiêu thụ trong một đơn vị thời gian.

> **Giải thích:** Trong 1 partition: Leader ghi message mới nhất tại `LEO` (Log End Offset). Nhưng message đó chỉ được bộc lộ cho Consumer đọc khi tất cả các Follower trong ISR đã sao chép xong (lúc này con trỏ `HW` mới nhích lên). Cơ chế này đảm bảo: Nếu Leader bị chết, một Follower khác lên thay thế sẽ có đầy đủ dữ liệu mà Consumer đã từng nhìn thấy, không bao giờ xảy ra lỗi "thấy dữ liệu rồi lại bị biến mất".

### Câu 9: Điểm cải tiến mang tính lịch sử của kiến trúc KRaft (Kafka Raft Metadata mode) từ Kafka 3.3+ là gì?
- [x] Loại bỏ hoàn toàn sự phụ thuộc vào cụm ZooKeeper bên ngoài; Kafka tự quản lý siêu dữ liệu (Metadata) và bầu cử Controller bằng chính giao thức đồng thuận Raft nội bộ dạng log phân tán.
- [ ] Thay thế hoàn toàn giao thức TCP mạng bằng giao thức HTTP/3 Quic để tăng tốc độ truyền tin nhắn.
- [ ] Chuyển đổi toàn bộ cơ chế lưu trữ log từ đĩa cứng sang các cụm lưu trữ đám mây S3 phân tán.
- [ ] Giới hạn mỗi topic chỉ được phép có tối đa một partition duy nhất để đơn giản hóa việc quản lý thứ tự.

> **Giải thích:** Trước đây, ZooKeeper lưu metadata của Kafka. Khi cụm có hàng trăm nghìn partition, việc đồng bộ giữa ZooKeeper và Controller Broker rất chậm chạp (khi Controller chết, bầu lại mất hàng chục phút). KRaft biến metadata thành một Topic nội bộ dạng log phân tán (Event-driven metadata), giúp cập nhật tức thì, khôi phục thần tốc và đơn giản hóa việc vận hành hạ tầng DevOps (không phải quản lý 2 hệ thống độc lập).

### Câu 10: Tính năng Idempotent Producer (`enable.idempotence=true`) trong Kafka hoạt động theo nguyên lý nào để chống trùng lặp tin nhắn khi xảy ra retry?
- [x] Broker cấp cho mỗi Producer một định danh Producer ID (PID) và mỗi message được gán Sequence Number tự tăng; Broker sẽ từ chối ghi và bỏ qua các message có Sequence Number trùng lặp đã được ghi nhận trước đó.
- [ ] Producer tính toán mã băm SHA-256 của toàn bộ payload và gửi kèm; Broker từ chối nếu phát hiện trùng mã băm trong vòng 24 giờ.
- [ ] Broker tạm thời khóa cứng partition trong 5 giây sau mỗi lần gửi tin để chờ xác nhận từ phía Producer.
- [ ] Producer tự động truy vấn topic để kiểm tra xem message đã tồn tại hay chưa trước khi thực hiện lệnh gửi thực tế.

> **Giải thích:** Khi mạng chập chờn, Producer gửi tin thành công nhưng gói ACK bị mất -> Producer tưởng lỗi nên tự động gửi lại. Với Idempotent Producer: Broker nhận thấy `PID = 100` và `Seq = 5` đã có trong log rồi, Broker sẽ trả về ACK thành công cho Producer nhưng KHÔNG GHI LẶP vào log, giải quyết triệt để vấn đề nhân đôi message mà không tốn chi phí rà soát nặng nề.

### Câu 11: Khái niệm "Consumer Lag" trong hệ thống Kafka là gì và vì sao nó là chỉ số giám sát quan trọng nhất?
- [x] Là khoảng cách chênh lệch giữa Offset mới nhất được ghi trên Broker (Log End Offset) và Offset hiện tại mà Consumer đã xử lý xong (Current Offset); Lag tăng cao thể hiện việc Consumer đang bị quá tải so với tốc độ sinh dữ liệu của Producer.
- [ ] Là thời gian trễ Round-Trip mạng giữa máy chủ chạy Producer và máy chủ chạy Kafka Broker.
- [ ] Là thời gian mà một Consumer phải chờ đợi khi không có bất kỳ message mới nào trong Topic.
- [ ] Là số lượng bản sao Partition bị tụt hậu và rơi ra khỏi danh sách In-Sync Replicas (ISR).

> **Giải thích:** `Consumer Lag = LEO - Current Offset`. Nếu Lag = 0: Consumer đang xử lý thời gian thực theo sát nút Producer. Nếu Lag liên tục tăng (ví dụ từ 100 lên 1.000.000 tin nhắn): Dịch vụ phía sau đang bị nghẽn (do database chậm, lỗi xử lý hoặc thiếu tài nguyên). Đội ngũ SRE/DevOps luôn phải đặt cảnh báo (Alert) trên Consumer Lag để kịp thời mở rộng quy mô (Scale Out) số lượng Consumer trong nhóm.

### Câu 12: Hai tham số cấu hình nào trên Kafka Producer đóng vai trò quyết định trong việc cân bằng giữa Thông lượng (Throughput) và Độ trễ (Latency)?
- [x] `batch.size` (kích thước tối đa của một lô tin nhắn tính bằng byte) và `linger.ms` (thời gian tối đa Producer sẵn sàng chờ đợi để gom thêm tin nhắn trước khi gửi đi).
- [ ] `max.poll.interval.ms` (thời gian chờ poll) và `session.timeout.ms` (thời gian sống của heartbeat).
- [ ] `retries` (số lần gửi lại) và `retry.backoff.ms` (thời gian giãn cách giữa các lần thử lại).
- [ ] `connections.max.idle.ms` (thời gian ngắt kết nối rỗi) và `request.timeout.ms` (thời gian chờ phản hồi).

> **Giải thích:** 
- Mặc định `linger.ms = 0`: Có tin nhắn là bắn ngay lập tức (Độ trễ thấp nhất, nhưng gửi nhiều request nhỏ làm giảm thông lượng tổng thể).
- Đặt `linger.ms = 20` và `batch.size = 65536` (64KB): Producer sẽ chờ tối đa 20ms để gom các tin nhắn đến dồn dập thành một lô lớn gửi một lần. Kết quả: Giảm tải CPU cho Broker gấp 5 lần và tăng thông lượng mạng lên gấp hàng chục lần mà người dùng chỉ trễ thêm 20 mili-giây.

### Câu 13: Mô hình "Dead Letter Queue" (DLQ / Topic thư chết) được sử dụng để giải quyết bài toán nào trong Kafka Consumer?
- [x] Chuyển hướng các tin nhắn bị lỗi định dạng nghiêm trọng hoặc dữ liệu không thể xử lý ("Poison Pill") sang một Topic riêng sau một số lần retry nhất định, ngăn không cho Consumer bị kẹt vòng lặp vô tận và tiếp tục xử lý các tin nhắn tiếp theo.
- [ ] Lưu trữ các tin nhắn đã hết hạn thời gian lưu trữ (retention period) để phục vụ việc kiểm toán sau này.
- [ ] Tự động chuyển đổi các tin nhắn văn bản thuần túy sang định dạng nhị phân Avro để nén dung lượng.
- [ ] Phân luồng các tin nhắn có độ ưu tiên thấp sang một cụm broker phụ để giảm tải cho cụm chính.

> **Giải thích:** Nếu không có DLQ: Gặp 1 tin nhắn JSON lỗi cú pháp, Consumer ném Exception, không thể commit offset; vòng lặp sau lại đọc trúng chính tin nhắn đó -> Toàn bộ luồng xử lý bị đóng băng (Poison Pill chặn đứng toàn bộ hệ thống). Với DLQ: Sau 3 lần retry thất bại, ứng dụng bắt lỗi, đẩy message lỗi đó vào `orders-dlq` kèm stack trace lỗi, rồi commit offset để tiếp tục chạy các đơn hàng khác.

### Câu 14: Thuật toán phân bổ partition "Cooperative Sticky Assignor" trong Kafka Consumer vượt trội hơn thuật toán Eager Assignor truyền thống ở điểm nào?
- [x] Không bắt buộc tất cả các Consumer phải tạm dừng tiêu thụ và nhả hết partition trong quá trình Rebalance; nó chỉ thu hồi và chuyển giao các partition thực sự cần di dời, loại bỏ giai đoạn "Stop-the-World".
- [ ] Tự động tăng gấp đôi số lượng partition của topic khi phát hiện số lượng consumer trong nhóm tăng lên.
- [ ] Cho phép nhiều consumer trong cùng một group cùng đọc đồng thời trên một partition duy nhất mà không xung đột.
- [ ] Tự động điều chỉnh kích thước bộ đệm socket mạng của consumer dựa trên tốc độ đọc dữ liệu.

> **Giải thích:** Trong mô hình Eager cũ: Khi 1 consumer mới vào nhóm, toàn bộ cụm consumer phải ngưng làm việc (Stop-the-world), nhả hết partition ra rồi phân chia lại từ đầu (mất 5-10 giây gián đoạn toàn bộ luồng xử lý). Cooperative Rebalance chỉ chuyển dịch partition cần thiết giữa 2 consumer liên quan trong nền, 90% các partition khác vẫn tiếp tục xử lý mượt mà không hề bị dừng 1 mili-giây nào.

### Câu 15: Thuật toán nén dữ liệu nào sau đây được khuyến nghị mạnh mẽ cho Kafka nhờ tỷ lệ nén cao vượt trội kết hợp với tốc độ giải nén siêu nhanh và tốn ít CPU?
- [x] `zstd` (Zstandard).
- [ ] `gzip`.
- [ ] `deflate`.
- [ ] `bzip2`.

> **Giải thích:** So sánh các thuật toán nén trong Kafka:
- `gzip`: Nén nhỏ nhất nhưng ngốn CPU kinh khủng, làm chậm thông lượng.
- `snappy` / `lz4`: Nén nhanh, ít tốn CPU nhưng dung lượng file nén chưa tối ưu.
- `zstd`: Cân bằng hoàn hảo: Tỷ lệ nén gần ngang ngửa gzip nhưng tốc độ giải nén nhanh gần bằng snappy/lz4, giúp tiết kiệm hàng terabyte ổ cứng và băng thông mạng trên cụm Kafka lớn.

### Câu 16: Nếu một Consumer Group có 5 Consumer, nhưng Topic mục tiêu chỉ có 3 Partition, thì hành vi phân bổ sẽ diễn ra như thế nào?
- [x] 3 Consumer được phân bổ mỗi người 1 Partition để xử lý; 2 Consumer còn lại sẽ ở trạng thái nhàn rỗi (Idle / Standby) và không nhận được bất kỳ tin nhắn nào cho đến khi có Consumer trong nhóm gặp sự cố.
- [ ] 2 Partition đầu tiên sẽ được phân bổ cho 2 Consumer đọc chung, còn Partition thứ ba do 1 Consumer phụ trách.
- [ ] Kafka Broker sẽ tự động ném ra ngoại lệ `ConsumerGroupOverCapacityException` và từ chối cấp quyền kết nối.
- [ ] Broker sẽ tự động nhân bản dữ liệu của 2 partition sang các partition ảo để phục vụ 2 consumer còn lại.

> **Giải thích:** Quy tắc bất biến của Kafka: Tại một thời điểm, mỗi Partition chỉ được gán cho DUY NHẤT MỘT Consumer trong cùng một Consumer Group để đảm bảo tính tuần tự của dữ liệu. Do đó: Số lượng Consumer tối đa có thể đọc song song luôn bằng số lượng Partition của Topic. Muốn tăng số lượng consumer hoạt động, bạn bắt buộc phải tăng số lượng partition của topic đó.

### Câu 17: Công cụ Schema Registry (kết hợp với Apache Avro hoặc Protobuf) giải quyết bài toán lớn nào trong kiến trúc Event-Driven với Kafka?
- [x] Quản lý và thực thi hợp đồng dữ liệu (Schema Contract) giữa Producer và Consumer, đảm bảo tính tương thích xuôi và ngược (Backward/Forward Compatibility) khi cấu trúc tin nhắn thay đổi theo thời gian.
- [ ] Tự động mã hóa toàn bộ dữ liệu tin nhắn bằng thuật toán bất đối xứng RSA trước khi gửi qua mạng.
- [ ] Tự động chuyển đổi các tin nhắn dạng hàng đợi thành các bảng dữ liệu quan hệ trong PostgreSQL.
- [ ] Quản lý việc cấp phát quyền đọc ghi chi tiết (ACLs) cho các tài khoản người dùng truy cập vào cụm Kafka.

> **Giải thích:** Nếu Producer tự ý đổi tên trường `user_id` thành `userId`, hàng loạt Consumer bên dưới sẽ bị crash tập thể. Schema Registry đứng ở giữa: Producer phải đăng ký schema trước khi gửi; nếu trường mới làm vỡ tính tương thích ngược (Backward Incompatible), Schema Registry lập tức từ chối request gửi tin của Producer. Đồng thời, Avro chỉ gửi ID của schema thay vì gửi toàn bộ tên trường JSON trong từng payload, giúp giảm kích thước message tới 60-70%.

### Câu 18: Tham số cấu hình `max.poll.interval.ms` trên Kafka Consumer có ý nghĩa gì và nếu xử lý nghiệp vụ quá lâu vượt quá thời gian này thì hậu quả là gì?
- [x] Là thời gian tối đa cho phép giữa hai lần gọi phương thức `poll()`; nếu một lượt xử lý batch của Consumer kéo dài vượt quá thời gian này, Group Coordinator sẽ coi Consumer đó đã chết và kích hoạt Rebalance.
- [ ] Là thời gian tối đa mà Consumer sẽ bị khóa nếu phát hiện tin nhắn bị lỗi định dạng trong tệp nhật ký.
- [ ] Là thời gian định kỳ mà Consumer bắt buộc phải gửi yêu cầu xin cấp phát thêm partition mới từ Broker.
- [ ] Là thời gian tối đa mà một kết nối TCP giữa Consumer và Broker được phép duy trì ở trạng thái rỗi.

> **Giải thích:** Đây là lỗi kinh điển "Rebalance Hell": Lập trình viên kéo về 500 message (`max.poll.records = 500`), xử lý mỗi message mất 1 giây -> tổng thời gian mất 500 giây. Nhưng `max.poll.interval.ms` mặc định là 300 giây (5 phút). Sau 5 phút không thấy gọi lại `poll()`, Coordinator coi consumer đã chết -> Rebalance. Consumer vừa làm xong quay lại thì mất quyền, dẫn đến lỗi commit và vòng lặp rebalance liên tục. Khắc phục: Giảm `max.poll.records` hoặc tăng `max.poll.interval.ms`.

### Câu 19: Để đảm bảo thứ tự tuyệt đối của các tin nhắn trong một Partition khi Producer bật cơ chế gửi lại (`retries > 0`), giá trị của `max.in.flight.requests.per.connection` bắt buộc phải là bao nhiêu nếu KHÔNG BẬT tính năng Idempotence?
- [x] Bắt buộc phải bằng `1` (để tránh trường hợp batch 1 lỗi gửi lại sau trong khi batch 2 đã thành công trước, làm đảo lộn thứ tự offset trên broker).
- [ ] Có thể đặt tùy ý từ 2 đến 5 vì Kafka Broker luôn tự động sắp xếp lại thứ tự trước khi ghi log.
- [ ] Phải đặt bằng `0` để tắt hoàn toàn cơ chế gửi tin nhắn song song trên đường truyền mạng.
- [ ] Phải đặt bằng đúng số lượng partition hiện có của topic mục tiêu.

> **Giải thích:** Giả sử gửi song song Batch 1 và Batch 2: Batch 1 gặp sự cố mạng tạm thời và retry; Batch 2 thành công và được ghi vào offset 100; vài mili-giây sau Batch 1 retry thành công và ghi vào offset 101 -> Thứ tự bị đảo ngược! Đặt `max.in.flight.requests.per.connection = 1` ép Producer chỉ gửi batch tiếp theo khi batch trước đã nhận ACK. (Lưu ý: Nếu bật `enable.idempotence=true`, Kafka cho phép đặt giá trị lên tới `5` mà vẫn bảo toàn thứ tự nhờ Sequence Number).

### Câu 20: Tùy chọn cấu hình `unclean.leader.election.enable = false` (mặc định trong các bản Kafka hiện đại) đánh đổi yếu tố nào để bảo vệ điều gì?
- [x] Đánh đổi Tính sẵn sàng (Availability) để bảo vệ Tính nhất quán và toàn vẹn dữ liệu (Consistency): Khi toàn bộ bản sao trong ISR bị chết, Kafka thà chấp nhận Partition bị offline chứ không bầu một Replica bị tụt hậu lên làm Leader.
- [ ] Đánh đổi dung lượng bộ nhớ RAM của Broker để tăng tốc độ nén dữ liệu của Producer lên mức tối đa.
- [ ] Đánh đổi tính bảo mật của giao thức mạng SSL để đạt được thông lượng truyền dữ liệu không mã hóa cao nhất.
- [ ] Đánh đổi thời gian lưu trữ tin nhắn (retention time) để giảm thiểu số lượng I/O đọc ghi đĩa cứng lúc cao điểm.

> **Giải thích:** Giả sử Leader (offset 100) chết; duy nhất còn lại 1 Replica nhưng replica này bị lag và mới chỉ copy tới offset 80. Nếu bật `unclean = true`: Node lag này lên làm Leader -> 20 message (từ 81 đến 100) đã từng xác nhận với khách hàng sẽ bị xóa sổ vĩnh viễn! Bằng cách đặt `unclean = false`, Kafka kiên quyết chờ đợi cho đến khi một node trong ISR sống lại, bảo vệ tính toàn vẹn tuyệt đối cho các hệ thống tài chính/ngân hàng.
