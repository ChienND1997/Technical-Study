# Trắc nghiệm chuyên sâu: Redis Core & Cache Architecture

## 1. Cấu trúc dữ liệu, Hiệu năng và Cơ chế Lưu trữ

### Câu 1: Vì sao Redis đạt được tốc độ xử lý hơn 100.000 QPS (Queries Per Second) dù luồng thực thi lệnh chính là Đơn luồng (Single-threaded)?
- [x] Toàn bộ dữ liệu nằm trên bộ nhớ RAM tốc độ cao, sử dụng kiến trúc I/O Multiplexing phi chặn (Non-blocking epoll/kqueue), cấu trúc dữ liệu tối ưu bộ nhớ, và không tiêu tốn chi phí hoán đổi ngữ cảnh luồng (Thread Context Switch overhead).
- [ ] Redis sử dụng cơ chế chia sẻ bộ nhớ phân tán Shared Memory đa tiến trình để xử lý song song các câu lệnh đọc ghi.
- [ ] Redis tự động biên dịch các câu lệnh thành mã bytecode Java và chạy trên nền máy ảo JVM hiệu năng cao.
- [ ] Luồng đơn của Redis chỉ dùng để nhận kết nối mạng, còn toàn bộ việc đọc ghi dữ liệu trên RAM được ủy quyền cho một thread pool đa luồng chạy ngầm.

> **Giải thích:** Nguyên nhân Redis siêu nhanh: 1) Dữ liệu hoàn toàn trên RAM (độ trễ nanosecond so với millisecond của ổ cứng); 2) I/O Multiplexing (epoll) cho phép 1 luồng duy nhất giám sát hàng chục nghìn socket kết nối đồng thời; 3) Thiết kế đơn luồng giúp không cần dùng lock hay mutex, loại bỏ hoàn toàn race condition và context switch. (Lưu ý: từ Redis 6.0+, mạng I/O socket có thể chạy đa luồng, nhưng luồng thực thi lệnh vẫn là đơn luồng).

### Câu 2: Điểm khác biệt cốt lõi giữa hai cơ chế bền vững hóa dữ liệu của Redis: RDB (Snapshot) và AOF (Append Only File) là gì?
- [x] RDB chụp ảnh nhanh toàn bộ dữ liệu tại một thời điểm định kỳ thành tệp nhị phân nhỏ gọn (khôi phục nhanh); còn AOF ghi tuần tự nhật ký từng câu lệnh thay đổi dữ liệu theo thời gian thực (an toàn dữ liệu cao hơn nhưng tệp lớn hơn).
- [ ] RDB chỉ lưu trữ dữ liệu dạng chuỗi (String), trong khi AOF mới có khả năng lưu trữ các cấu trúc dữ liệu phức tạp như Hash và Set.
- [ ] RDB lưu dữ liệu trực tiếp vào bộ nhớ swap của hệ điều hành, còn AOF lưu trữ dữ liệu trên tệp đĩa từ tính.
- [ ] Khi Redis khởi động lại, nếu cả hai cơ chế cùng được bật, Redis sẽ luôn ưu tiên nạp dữ liệu từ tệp RDB và bỏ qua tệp AOF.

> **Giải thích:** RDB (Snapshot) tạo file nhị phân nhỏ, khôi phục dữ liệu cực nhanh khi restart, nhưng nếu server bị sập đột ngột sẽ mất dữ liệu từ lần snapshot gần nhất. AOF (Log ghi) lưu lại từng lệnh `SET`, an toàn tối đa (chỉ mất tối đa 1 giây dữ liệu với cấu hình `appendfsync everysec`), nhưng kích thước file lớn hơn và nạp lại chậm hơn. Thực tế Production khuyến nghị bật cả hai song song.

### Câu 3: Hiện tượng "Cache Avalanche" (Tuyết lở bộ nhớ đệm) xảy ra trong trường hợp nào và giải pháp phòng chống chuẩn mực là gì?
- [x] Xảy ra khi một lượng lớn key trong cache cùng hết hạn (TTL) tại một thời điểm hoặc Redis server bị sập, khiến toàn bộ request ập thẳng vào database; khắc phục bằng cách thêm độ lệch thời gian ngẫu nhiên (TTL Jitter).
- [ ] Xảy ra khi một key duy nhất có lượng truy cập cực lớn bị xóa khỏi cache; khắc phục bằng cách dùng khóa phân tán Mutex Lock.
- [ ] Xảy ra khi người dùng liên tục truy vấn các ID không hề tồn tại trong database; khắc phục bằng cách sử dụng Bộ lọc Bloom (Bloom Filter).
- [ ] Xảy ra khi dung lượng RAM của Redis vượt quá 80%; khắc phục bằng cách cấu hình chính sách giải phóng bộ nhớ `noeviction`.

> **Giải thích:** Nếu hệ thống đặt TTL cho 1 triệu sản phẩm cùng là 1 giờ (`expire 3600s`), sau đúng 1 giờ toàn bộ 1 triệu key sẽ đồng loạt biến mất. Hàng ngàn request ập vào Database cùng lúc gây "Tuyết lở". Giải pháp: Thêm độ lệch ngẫu nhiên: `TTL = 3600 + random(0, 300)` giây, giúp thời điểm hết hạn phân tán đều.

### Câu 4: Cấu trúc dữ liệu "ZSet" (Sorted Set) trong Redis được cài đặt nội bộ bằng hai cấu trúc dữ liệu nào?
- [x] Bảng băm (Hash Table) để tra cứu điểm số của phần tử trong O(1) và Bảng nhảy (Skip List) để sắp xếp và truy vấn phạm vi theo điểm số trong O(log n).
- [ ] Cây đỏ đen (Red-Black Tree) kết hợp với Danh sách liên kết đôi (Doubly Linked List).
- [ ] Cây B+Tree kết hợp với Cấu trúc mảng động tự co giãn (Dynamic Array).
- [ ] Bộ lọc Bloom (Bloom Filter) kết hợp với Bảng băm mở rộng (Extendible Hashing).

> **Giải thích:** Sorted Set (ZSET) là cấu trúc cực kỳ mạnh mẽ của Redis (dùng cho bảng xếp hạng Leaderboard, Rate Limiting): Hash Table lưu cặp `(element -> score)` giúp lệnh `ZSCORE` đạt O(1); Skip List lưu các phần tử theo thứ tự điểm số tăng dần giúp các lệnh truy vấn khoảng (`ZRANGE`, `ZRANGEBYSCORE`) và thêm/xóa đạt hiệu năng O(log n) với mã nguồn đơn giản hơn cây Red-Black Tree.

### Câu 5: Hiện tượng "Cache Penetration" (Thủng bộ nhớ đệm) phát sinh do nguyên nhân nào và kỹ thuật phòng thủ hữu hiệu nhất là gì?
- [x] Phát sinh khi client liên tục gửi request tìm kiếm các khóa KHÔNG HỀ TỒN TẠI trong cả Cache lẫn Database (như ID âm); khắc phục bằng Bộ lọc Bloom (Bloom Filter) hoặc cache giá trị rỗng/null với TTL ngắn.
- [ ] Phát sinh khi một key có lượng truy cập đột biến bị hết hạn; khắc phục bằng cách cấu hình tính năng Auto-refresh cache ngầm.
- [ ] Phát sinh do mạng giữa máy chủ ứng dụng và Redis bị chập chờn; khắc phục bằng cơ chế tự động thử lại (Retry with Exponential Backoff).
- [ ] Phát sinh khi dữ liệu trong Database bị sửa đổi nhưng cache chưa kịp cập nhật; khắc phục bằng mô hình Write-Through Cache.

> **Giải thích:** Kẻ xấu lợi dụng việc Cache chỉ lưu key có thật: Chúng sinh các ID ngẫu nhiên không tồn tại để ép hệ thống phải truy vấn Database đĩa cứng liên tục. Giải pháp: 1) Cache key rỗng: nếu database không có, lưu tạm `(id -> null)` với TTL 60s; 2) Bloom Filter: Dựng cấu trúc bit filter ở phía trước Redis; nếu Bloom Filter khẳng định "ID này chắc chắn không tồn tại", hệ thống lập tức từ chối request mà không cần gọi Redis hay DB.

### Câu 6: Điểm khác biệt mấu chốt giữa hiện tượng "Cache Breakdown" (Điểm nóng sụp đổ / Hotspot Invalidated) và "Cache Avalanche" là gì?
- [x] Cache Breakdown xảy ra khi CHỈ MỘT KEY CỰC KỲ HOT vừa hết hạn và có hàng nghìn request đồng thời ập vào DB; còn Cache Avalanche là hiện tượng HÀNG LOẠT NHIỀU KEY cùng hết hạn đồng loạt làm tê liệt hệ thống.
- [ ] Cache Breakdown chỉ xảy ra trên cơ sở dữ liệu quan hệ, còn Cache Avalanche xảy ra trên cơ sở dữ liệu NoSQL.
- [ ] Cache Breakdown liên quan đến việc ghi dữ liệu thất bại, còn Cache Avalanche liên quan đến việc đọc dữ liệu bị timeout.
- [ ] Cache Breakdown làm mất toàn bộ dữ liệu trên RAM của Redis, còn Cache Avalanche chỉ làm chậm đường truyền mạng.

> **Giải thích:** 
- Cache Avalanche: Hàng vạn key cùng chết -> Toàn bộ DB bị sập.
- Cache Breakdown: Chỉ 1 key duy nhất chết, nhưng key đó có hàng vạn request/giây -> Đập thẳng vào 1 câu SQL nặng làm DB nghẽn hàng đợi. Giải pháp: Luồng đầu tiên phát hiện cache miss sẽ chiếm Distributed Lock trên Redis để vào DB query và ghi đè cache mới; các luồng khác không chiếm được lock chỉ cần ngủ 50ms rồi thử đọc lại từ Redis.

### Câu 7: Chính sách giải phóng bộ nhớ (Eviction Policy) `allkeys-lru` trong Redis hoạt động như thế nào khi bộ nhớ RAM đạt ngưỡng `maxmemory`?
- [x] Loại bỏ các key có thời gian truy cập gần nhất xa nhất (Least Recently Used) trong TOÀN BỘ không gian key của database, bất kể key đó có cài đặt thời gian hết hạn TTL hay không.
- [ ] Chỉ loại bỏ các key có thời gian truy cập gần nhất xa nhất trong tập hợp các key CÓ CÀI ĐẶT thời gian hết hạn TTL.
- [ ] Loại bỏ các key có tần suất truy cập ít nhất (Least Frequently Used) trong toàn bộ cơ sở dữ liệu.
- [ ] Từ chối thực thi tất cả các lệnh ghi mới và ném ra lỗi `OOM command not allowed` để bảo vệ các dữ liệu hiện có.

> **Giải thích:** 
- `noeviction`: Mặc định, khi đầy RAM sẽ từ chối ghi và trả lỗi `OOM command not allowed`.
- `allkeys-lru`: Chuẩn mực cho hệ thống Cache thuần túy: Xóa key ít dùng nhất trong toàn bộ database.
- `volatile-lru`: Chỉ xóa key ít dùng nhất trong tập các key có gắn TTL (`expire`).
- `allkeys-lfu`: Xóa key có tần suất truy cập ít nhất (Least Frequently Used) - tối ưu hơn LRU nếu có đợt truy cập đột xuất.

### Câu 8: Vì sao lệnh `KEYS *` bị nghiêm cấm sử dụng trong môi trường Production của Redis và lệnh nào được khuyến nghị thay thế?
- [x] Vì `KEYS *` quét tuần tự toàn bộ database trên luồng đơn chính, gây chặn (blocking) toàn bộ các request khác cho đến khi quét xong; thay thế bằng lệnh `SCAN` (quét theo con trỏ cursor từng đợt nhỏ phi chặn).
- [ ] Vì `KEYS *` làm tăng kích thước tệp tin log AOF lên gấp đôi khiến hệ điều hành bị cạn kiệt dung lượng đĩa cứng.
- [ ] Vì lệnh `KEYS *` chỉ trả về danh sách các key kiểu String và bỏ qua tất cả các cấu trúc dữ liệu Hash hoặc Set.
- [ ] Thay thế bằng lệnh `HGETALL` vì lệnh này tự động chạy ngầm trên luồng phụ của hệ điều hành.

> **Giải thích:** Thiết kế đơn luồng của Redis đồng nghĩa với việc: Nếu một lệnh chạy mất 5 giây, thì hàng chục nghìn client khác phải xếp hàng chờ đúng 5 giây đó (mạng client lập tức báo lỗi connection timeout). Lệnh `SCAN cursor [MATCH pattern] [COUNT count]` duyệt qua bảng băm theo từng cụm nhỏ (ví dụ 100 key mỗi lượt), trả về con trỏ tiếp theo để client gọi tiếp mà không làm nghẽn server.

### Câu 9: Trong kiến trúc Redis Cluster, dữ liệu được phân chia thành bao nhiêu Khe băm (Hash Slots) và công thức ánh xạ là gì?
- [x] Cố định chính xác 16.384 Hash Slots; công thức ánh xạ: `HASH_SLOT = CRC16(key) mod 16384`.
- [ ] Cố định 1.024 Hash Slots; công thức ánh xạ: `HASH_SLOT = MD5(key) mod 1024`.
- [ ] Cố định 65.536 Hash Slots; công thức ánh xạ: `HASH_SLOT = MurmurHash3(key) mod 65536`.
- [ ] Số lượng Hash Slots tự động co giãn linh hoạt dựa trên tổng số lượng Node Master hiện có trong cụm.

> **Giải thích:** Redis Cluster chia không gian lưu trữ thành 16.384 slots (được phân bổ đều cho các master nodes: ví dụ 3 node thì Node A giữ slot 0-5460, Node B giữ 5461-10922, Node C giữ 10923-16383). Khi thêm hoặc bớt một Node, Redis chỉ cần chuyển một số slot giữa các node mà không cần dừng hệ thống. Nếu muốn các key khác nhau cùng rơi vào một slot (để hỗ trợ transaction), dùng Hash Tag: `{user100}:profile` và `{user100}:orders` sẽ cùng hash theo chuỗi `user100`.

### Câu 10: Sự khác biệt kiến trúc giữa Redis Sentinel và Redis Cluster là gì?
- [x] Sentinel cung cấp tính Năng Sẵn Sàng Cao (High Availability/Failover) cho mô hình Master-Replica đơn lẻ mà không chia nhỏ dữ liệu; còn Cluster cung cấp cả Khả năng Phân mảnh ngang (Sharding trên nhiều master) lẫn High Availability.
- [ ] Sentinel chỉ hỗ trợ đọc dữ liệu từ Replica, còn Cluster bắt buộc tất cả các thao tác đọc và ghi phải đi qua Master.
- [ ] Sentinel lưu trữ toàn bộ dữ liệu trên đĩa cứng, trong khi Cluster lưu trữ toàn bộ dữ liệu trên bộ nhớ RAM.
- [ ] Sentinel không thể tự động phát hiện khi Master bị sập, trong khi Cluster tự động bầu cử thông qua giao thức Raft.

> **Giải thích:** 
- **Sentinel**: Dành cho hệ thống vừa và nhỏ (dữ liệu dưới vài chục GB, 1 node RAM chứa đủ). Sentinel đóng vai trò "trọng tài" giám sát: nếu Master chết, Sentinel tự động kích hoạt Failover đẩy 1 Slave lên làm Master mới.
- **Cluster**: Dành cho dữ liệu lớn vượt quá dung lượng RAM của 1 máy (hàng trăm GB, hàng triệu QPS). Dữ liệu được chia mảnh (Sharding) trên nhiều Master độc lập.

### Câu 11: Khi chạy các câu lệnh trong khối Transaction của Redis (`MULTI` ... `EXEC`), nếu một lệnh ở giữa bị lỗi cú pháp thực thi (như gọi `INCR` trên key chứa Object), các lệnh còn lại sẽ như thế nào?
- [x] Các lệnh hợp lệ khác trước và sau nó VẪN ĐƯỢC THỰC THI và ghi nhận kết quả bình thường; Redis không hỗ trợ cơ chế Rollback tự động khi gặp lỗi runtime trong khối transaction.
- [ ] Toàn bộ khối transaction sẽ được tự động Rollback về trạng thái ban đầu để đảm bảo tính nguyên tử tuyệt đối.
- [ ] Redis sẽ tạm dừng toàn bộ luồng thực thi và chờ đợi client gửi lệnh xác nhận `COMMIT` hoặc `ROLLBACK` thủ công.
- [ ] Lệnh bị lỗi sẽ được tự động thử lại tối đa 3 lần trên luồng nền trước khi bỏ qua.

> **Giải thích:** Triết lý thiết kế của cha đẻ Redis (Salvatore Sanfilippo): Lỗi runtime trong Redis chỉ xảy ra do lập trình viên viết code ngớ ngẩn (ví dụ gọi lệnh xử lý danh sách `LPUSH` trên một key kiểu chuỗi `String`). Việc không hỗ trợ Rollback giúp cấu trúc bên trong của Redis cực kỳ đơn giản, gọn nhẹ và tối ưu tốc độ tối đa. Muốn có logic phức tạp và kiểm tra điều kiện an toàn, hãy dùng Script Lua.

### Câu 12: Vì sao việc thực thi một đoạn mã Lua Script trên Redis (`EVAL script`) lại đảm bảo tính Nguyên tử (Atomicity) hoàn hảo?
- [x] Vì Redis thực thi toàn bộ script Lua trên luồng đơn chính một cách liên tục; trong suốt thời gian script chạy, không có bất kỳ lệnh nào từ client khác có thể chen ngang vào giữa chừng.
- [ ] Vì Lua Script tự động tạo một vùng nhớ snapshot độc lập và chỉ đồng bộ lại vào cơ sở dữ liệu khi script hoàn tất.
- [ ] Vì engine Lua của Redis chạy trên một tiến trình độc lập và sử dụng thuật toán khóa hai giai đoạn (Two-Phase Locking).
- [ ] Vì Redis tự động chuyển đổi mã Lua thành các transaction ACID chuẩn của cơ sở dữ liệu quan hệ.

> **Giải thích:** Tính nguyên tử tuyệt đối của Lua Script là giải pháp hoàn hảo cho các bài toán nghiệp vụ phức tạp: Đọc dữ liệu -> Kiểm tra điều kiện -> Tính toán -> Ghi dữ liệu (như bài toán Trừ kho hàng Flash Sale, Rate Limiting Token Bucket). Nhờ chạy liên tục không bị gián đoạn, bạn không cần bận tâm về Race Condition giữa các luồng đồng thời. (Lưu ý: Không viết script Lua chạy quá lâu vì sẽ làm treo server).

### Câu 13: Cấu trúc dữ liệu "HyperLogLog" trong Redis (`PFADD`, `PFCOUNT`) giải quyết bài toán nào với hiệu quả bộ nhớ vượt trội?
- [x] Đếm xấp xỉ số lượng phần tử duy nhất (Cardinality Estimation / Unique Visitors) của tập dữ liệu lên đến hàng trăm triệu phần tử với dung lượng bộ nhớ cố định chỉ khoảng 12KB và sai số chuẩn 0.81%.
- [ ] Nén các chuỗi JSON có độ dài lớn để giảm thiểu dung lượng RAM của các key kiểu String.
- [ ] Lưu trữ và tìm kiếm các cặp tọa độ địa lý (Kinh độ/Vĩ độ) trong phạm vi bán kính xác định.
- [ ] Quản lý cấu trúc cây phân cấp nhiều tầng giữa các phòng ban trong doanh nghiệp.

> **Giải thích:** Nếu dùng `Set` (`SADD`) để lưu 100 triệu User ID (mỗi ID 32 byte), bạn tốn hơn 3GB RAM! Với `HyperLogLog` (`PFADD`, `PFCOUNT`), Redis sử dụng thuật toán xác suất dựa trên số lượng bit 0 liên tiếp ở đầu chuỗi băm để ước lượng số lượng phần tử. Bất kể bạn đếm 100 người hay 1 tỷ người, bộ nhớ tiêu tốn cố định luôn chỉ là 12KB!

### Câu 14: Điểm vượt trội của Redis Streams (Redis 5.0+) so với cơ chế Redis Pub/Sub truyền thống là gì?
- [x] Redis Streams lưu trữ tin nhắn bền vững trong Append-Only Log, hỗ trợ Consumer Groups, lưu vết trạng thái xác nhận tin nhắn (ACK) và cho phép đọc lại tin nhắn cũ; còn Pub/Sub là cơ chế "bắn rồi quên" (mất tin nhắn nếu subscriber offline).
- [ ] Redis Streams truyền dữ liệu qua giao thức UDP để đạt tốc độ cao hơn so với TCP của Pub/Sub.
- [ ] Redis Streams chỉ cho phép duy nhất một Consumer đọc dữ liệu tại một thời điểm, trong khi Pub/Sub cho phép nhiều Consumer.
- [ ] Redis Streams tự động xóa tin nhắn ngay lập tức sau khi gửi để tiết kiệm bộ nhớ RAM.

> **Giải thích:** Redis Pub/Sub không có hàng đợi tin nhắn: Nếu subscriber bị rớt mạng trong 1 giây, toàn bộ message phát sinh trong 1 giây đó bị bốc hơi hoàn toàn. Redis Streams được thiết kế tương tự như một "Kafka thu nhỏ": Message được lưu thành append-only log, có ID thời gian, hỗ trợ Consumer Group phân chia partition đọc song song, và có bảng PEL (Pending Entries List) đảm bảo message chỉ biến mất khi consumer đã xử lý và gọi lệnh `XACK`.

### Câu 15: Cấu trúc dữ liệu Bitmap trong Redis (`SETBIT`, `GETBIT`, `BITCOUNT`) thường được áp dụng tối ưu cho trường hợp sử dụng nào?
- [x] Theo dõi trạng thái nhị phân của số lượng lớn đối tượng (như điểm danh hàng ngày của user, trạng thái online/offline), tận dụng 1 bit cho mỗi đối tượng để tiết kiệm hàng trăm lần dung lượng RAM.
- [ ] Lưu trữ toàn bộ lịch sử các giao dịch tài chính ngân hàng có giá trị lớn.
- [ ] Lưu trữ nội dung bài viết và các tệp đính kèm đa phương tiện của ứng dụng blog.
- [ ] Lưu trữ phiên làm việc (Session) của người dùng kèm theo token xác thực JWT.

> **Giải thích:** Bitmap không phải là kiểu dữ liệu riêng mà tận dụng trực tiếp kiểu chuỗi `String` (tối đa 512MB = 4.29 tỷ bit). Ví dụ: `SETBIT user:active:2026-11-04 123456 1` đánh dấu user 123456 đã online hôm nay. Lệnh `BITCOUNT` đếm tổng số bit 1 trong tích tắc (tính tổng người online trong ngày), và các phép toán bitwise `BITOP AND/OR` cho phép tính số người dùng hoạt động liên tục trong 7 ngày cực kỳ tối ưu.

### Câu 16: Khi Redis thực hiện lệnh snapshot chạy ngầm `BGSAVE`, cơ chế "Copy-on-Write" (COW) của hệ điều hành Linux có thể dẫn đến hiện tượng gì về tài nguyên?
- [x] Tiến trình cha và tiến trình con dùng chung bộ nhớ; nhưng nếu có lượng lớn thao tác ghi mới làm sửa đổi các trang bộ nhớ, Linux sẽ nhân bản các trang đó, khiến mức tiêu thụ RAM có thể tăng vọt trong thời gian snapshot.
- [ ] Toàn bộ bộ nhớ RAM của Redis sẽ bị chuyển cưỡng bức vào không gian Swap trên đĩa cứng làm máy chủ bị đơ giật.
- [ ] Tiến trình con sẽ chiếm giữ 100% dung lượng băng thông mạng làm rớt tất cả các kết nối từ client.
- [ ] Dung lượng RAM của máy chủ sẽ tự động giảm đi một nửa do kernel kích hoạt cơ chế nén trang nhớ trong suốt.

> **Giải thích:** Khi gọi `BGSAVE`, tiến trình chính gọi `fork()` tạo tiến trình con để ghi đĩa. Nhờ cơ chế Copy-on-Write, ban đầu hai tiến trình trỏ chung vào các Page bộ nhớ vật lý. Nhưng nếu tiến trình cha ghi sửa 1 page 4KB, kernel sẽ sao chép page đó ra vùng nhớ mới cho cha sửa. Nếu hệ thống có tỷ lệ ghi dữ liệu cực lớn lúc đang snapshot, RAM có thể bị đội lên rất cao, dẫn tới nguy cơ bị hệ điều hành kích hoạt OOM Killer diệt tiến trình Redis.

### Câu 17: Kỹ thuật "Pipelining" trong Redis mang lại lợi ích hiệu năng chủ yếu ở khía cạnh nào?
- [x] Cho phép client gửi liên tiếp một mảng nhiều lệnh trong một gói mạng TCP mà không cần đợi kết quả của từng lệnh, giảm thiểu số lần round-trip mạng (RTT) và tối ưu hóa chi phí đọc ghi socket.
- [ ] Cho phép thực hiện các thao tác ghi dữ liệu song song trên nhiều CPU cores khác nhau của máy chủ.
- [ ] Tự động chuyển đổi các câu lệnh truy vấn phức tạp thành các chỉ mục tìm kiếm văn bản toàn văn (Full-Text Search).
- [ ] Đảm bảo tính nguyên tử tuyệt đối cho toàn bộ các lệnh tương tự như một khối transaction hoàn chỉnh.

> **Giải thích:** Thông thường: Client gửi lệnh 1 -> đợi mạng 1ms -> nhận kết quả -> gửi lệnh 2 -> đợi mạng 1ms (chạy 10.000 lệnh mất 10 giây). Với Pipelining: Client gom cả 10.000 lệnh bắn 1 lượt qua socket TCP, Redis xử lý tuần tự trên RAM và trả về 1 mảng 10.000 kết quả trong 1 lượt mạng duy nhất (chỉ mất 10-20ms), tăng thông lượng lên gấp 50-100 lần.

### Câu 18: Cơ chế xóa các key đã hết hạn (TTL Expired Keys) trong Redis được thực hiện như thế nào để cân bằng giữa hiệu năng CPU và dung lượng RAM?
- [x] Kết hợp giữa Xóa thụ động (Lazy Deletion - chỉ xóa khi có client truy cập trúng key đó) và Xóa chủ động định kỳ (Active Periodic - quét ngẫu nhiên một số lượng key có TTL định kỳ để dọn dẹp các key quá hạn).
- [ ] Tạo một luồng hẹn giờ riêng biệt cho từng key ngay khi key được gán TTL để xóa chính xác từng mili-giây.
- [ ] Quét tuần tự toàn bộ database cứ mỗi 1 giây một lần để đảm bảo không có bất kỳ key quá hạn nào tồn tại trong RAM.
- [ ] Chỉ xóa key khi dung lượng bộ nhớ RAM của máy chủ đạt đến ngưỡng cảnh báo 100%.

> **Giải thích:** Nếu tạo 1 timer riêng cho mỗi key -> tốn hàng triệu luồng CPU. Nếu quét cả DB -> nghẽn server. Redis kết hợp thông minh: 1) Lazy deletion: Khi client gọi `GET key`, Redis kiểm tra nếu quá hạn thì xóa ngay và trả về `nil`; 2) Active periodic: Mỗi 100ms, Redis lấy ngẫu nhiên 20 key có gắn TTL, xóa các key quá hạn; nếu tỷ lệ key quá hạn vượt quá 25%, nó lặp lại bước này ngay để giải phóng RAM nhanh chóng.

### Câu 19: Trong thuật toán khóa phân tán "Redlock", điều kiện để một client được coi là đã chiếm khóa thành công trên cụm N Master độc lập là gì?
- [x] Client phải chiếm được khóa thành công trên đa số cụm Master (tối thiểu `N/2 + 1` nodes) VÀ tổng thời gian tiêu tốn để chiếm khóa phải nhỏ hơn thời gian hiệu lực (Validity Time) của khóa.
- [ ] Client bắt buộc phải chiếm được khóa thành công trên 100% tất cả các cụm Master mà không được phép thiếu bất kỳ node nào.
- [ ] Client chỉ cần chiếm được khóa thành công trên node Master đầu tiên phản hồi trong cụm.
- [ ] Client phải nhận được sự xác nhận đồng thuận thông qua thuật toán Two-Phase Commit từ dịch vụ điều phối trung tâm.

> **Giải thích:** Mô hình 1 Master duy nhất có rủi ro: Master chết trước khi kịp đồng bộ khóa sang Slave -> Slave lên làm Master mới và cấp khóa trùng cho tiến trình khác. Redlock triển khai 5 Master hoàn toàn độc lập (không master-slave): Client gửi lệnh khóa tới cả 5 máy; chỉ khi 3/5 máy xác nhận thành công và thời gian trôi qua chưa làm hết hạn khóa thì khóa mới được coi là hợp lệ, mang lại độ tin cậy cực cao.

### Câu 20: Cấu trúc dữ liệu tối ưu bộ nhớ "Listpack" (chuẩn hóa thay thế Ziplist từ Redis 7.0+) khắc phục nhược điểm kỹ thuật nào của Ziplist?
- [x] Khắc phục triệt để vấn đề "Cập nhật dây chuyền" (Cascading Updates) của Ziplist: Việc thay đổi kích thước một phần tử không còn làm biến đổi trường độ dài của các phần tử phía sau, tránh việc tái cấp phát bộ nhớ liên tục trong O(N²).
- [ ] Cho phép các phần tử trong danh sách được tự động phân mảnh và lưu trữ trên các vùng nhớ không liên tục trong RAM.
- [ ] Tự động mã hóa nội dung của các chuỗi nhị phân để phòng chống tấn công chèn mã độc vào bộ đệm.
- [ ] Loại bỏ hoàn toàn giới hạn kích thước tối đa của một danh sách liên kết trong Redis.

> **Giải thích:** Ziplist lưu trường `previous_entry_length` ở đầu mỗi phần tử để hỗ trợ duyệt ngược từ đuôi lên đầu. Nếu 1 phần tử tăng từ 253 byte lên 254 byte, trường độ dài của node sau phải nở từ 1 byte thành 5 byte, kích hoạt phản ứng dây chuyền làm toàn bộ các node phía sau phải nở theo (Cascading Update rất chậm). Listpack đưa thông tin độ dài về cuối mỗi entry và không phụ thuộc vào node trước, giúp thao tác luôn an toàn trong O(N).
