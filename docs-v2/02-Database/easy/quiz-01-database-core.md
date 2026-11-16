# Trắc nghiệm chuyên sâu: Database, SQL Index & Transaction

## 1. Indexing, B-Tree và ACID Isolation

### Câu 1: Cho một chỉ mục phức hợp (Composite Index) trên 3 cột `(col_a, col_b, col_c)`. Truy vấn nào sau đây KHÔNG THỂ tận dụng được index này do vi phạm Leftmost Prefix Rule (Quy tắc tiền tố bên trái)?
- [x] `WHERE col_b = 10 AND col_c = 20` - Vì thiếu cột đầu tiên `col_a`, cây B-Tree không có điểm bắt đầu để điều hướng tìm kiếm nhị phân.
- [ ] `WHERE col_a = 5 AND col_b = 10 AND col_c = 20` - Tận dụng tối đa cả 3 cột của index theo đúng thứ tự sắp xếp.
- [ ] `WHERE col_a = 5 AND col_b = 10` - Tận dụng được tiền tố `(col_a, col_b)` của cây index để thu hẹp phạm vi tìm kiếm.
- [ ] `WHERE col_a = 5` - Tận dụng được cột đầu tiên `col_a` của index để tìm kiếm nhị phân trực tiếp.

> **Giải thích:** B-Tree index đa cột được sắp xếp tương tự như một cuốn danh bạ điện thoại sắp theo (Họ, Tên lót, Tên). Nếu bạn chỉ biết Tên lót và Tên mà không biết Họ, bạn bắt buộc phải quét toàn bộ danh bạ từ đầu đến cuối (Full Table Scan). Chỉ mục chỉ có hiệu lực khi điều kiện lọc xuất phát từ cột bên trái nhất (`col_a`).

### Câu 2: Trong MySQL InnoDB, "Clustered Index" (Chỉ mục cụm) khác biệt gì so với "Secondary Index" (Chỉ mục phụ)?
- [x] Node lá của Clustered Index lưu trữ trực tiếp toàn bộ dữ liệu các cột của hàng; trong khi Node lá của Secondary Index chỉ lưu giá trị khóa chính (Primary Key).
- [ ] Clustered Index chỉ dùng cho các bảng không có khóa chính, còn Secondary Index bắt buộc phải đi kèm với khóa chính.
- [ ] Clustered Index sử dụng cấu trúc Hash Table trong RAM, còn Secondary Index sử dụng cấu trúc cây B+Tree trên đĩa cứng.
- [ ] Mỗi bảng có thể tạo được nhiều Clustered Index độc lập, nhưng chỉ được phép tạo duy nhất một Secondary Index.

> **Giải thích:** Trong InnoDB, bảng chính là Clustered Index (được tổ chức theo Primary Key). Khi tìm kiếm theo Secondary Index, nếu câu lệnh `SELECT` cần các cột không nằm trong index đó, cơ sở dữ liệu phải lấy Primary Key từ node lá của Secondary Index rồi quay lại tra cứu trong Clustered Index (hiện tượng này gọi là "Table Lookup" / 回表).

### Câu 3: Hiện tượng "Dirty Read" (Đọc dữ liệu rác) là gì và mức độ cô lập (Isolation Level) tối thiểu nào theo chuẩn SQL ngăn chặn được nó?
- [x] Xảy ra khi Transaction A đọc được dữ liệu do Transaction B vừa sửa đổi nhưng Transaction B CHƯA ĐƯỢC COMMIT (và sau đó có thể Rollback); mức độ cô lập tối thiểu ngăn chặn được là `READ COMMITTED`.
- [ ] Xảy ra khi Transaction A đọc đi đọc lại một hàng nhưng mỗi lần đọc lại nhận giá trị khác nhau do Transaction B đã commit; mức độ cô lập tối thiểu là `READ UNCOMMITTED`.
- [ ] Xảy ra khi Transaction A thực hiện lệnh đếm số dòng nhưng xuất hiện thêm dòng mới do Transaction B vừa chèn; mức độ cô lập tối thiểu là `REPEATABLE READ`.
- [ ] Xảy ra khi hai transaction cùng cố gắng cập nhật đồng thời một bản ghi và làm mất dữ liệu của nhau; mức độ cô lập tối thiểu là `SERIALIZABLE`.

> **Giải thích:** 
- `READ UNCOMMITTED`: Cho phép đọc dữ liệu chưa commit -> Bị Dirty Read.
- `READ COMMITTED`: Chỉ đọc dữ liệu đã commit bằng cách dùng snapshot MVCC -> Triệt tiêu Dirty Read.
- `REPEATABLE READ`: Đảm bảo nhiều lần đọc trong 1 transaction luôn thấy dữ liệu giống nhau -> Triệt tiêu Non-Repeatable Read.
- `SERIALIZABLE`: Mức cô lập cao nhất, tuần tự hóa mọi giao dịch.

### Câu 4: Khi nào nên ưu tiên sử dụng "Optimistic Locking" (Khóa lạc quan) thay vì "Pessimistic Locking" (Khóa bi quan - `SELECT ... FOR UPDATE`)?
- [x] Khi hệ thống có tỷ lệ đọc áp đảo (Read-heavy) và tỷ lệ xung đột ghi rất thấp; dùng cột phiên bản (version column) để kiểm tra xung đột lúc commit mà không làm giữ lock vật lý của database.
- [ ] Khi hệ thống xử lý các giao dịch chuyển tiền trực tiếp trong ngân hàng đòi hỏi tính nhất quán tuyệt đối và không được phép retry.
- [ ] Khi cần ngăn chặn triệt để tình trạng Deadlock giữa các tiến trình chạy ngầm thực thi các câu lệnh UPDATE phức tạp.
- [ ] Khi bảng dữ liệu có kích thước quá lớn vượt quá giới hạn bộ nhớ đệm Buffer Pool của database server.

> **Giải thích:** Khóa bi quan (`FOR UPDATE`) chiếm giữ lock vật lý của database ngay khi đọc, làm các transaction khác phải chờ đợi, gây giảm throughput nghiêm trọng. Khóa lạc quan không khóa hàng, cho phép mọi người đọc ghi tự do và chỉ kiểm tra `WHERE id = ? AND version = old_version` lúc update. Nếu số phiên bản đã bị thay đổi, transaction chủ động retry. Thích hợp cho các luồng CRUD thông thường.

### Câu 5: Hiện tượng "N+1 Query" trong ORM (như Hibernate/JPA) phát sinh do nguyên nhân nào và giải pháp khắc phục triệt để nhất là gì?
- [x] Phát sinh khi tải danh sách N bản ghi cha (1 query ban đầu), sau đó vòng lặp gọi getter kích hoạt N query phụ để nạp thực thể con; khắc phục bằng mệnh đề `JOIN FETCH` hoặc `@EntityGraph`.
- [ ] Phát sinh khi câu truy vấn SQL chứa quá N mệnh đề `OR` liên tiếp khiến database không thể sử dụng index; khắc phục bằng cách tách thành toán tử `IN`.
- [ ] Phát sinh do Connection Pool bị cạn kiệt khi có N + 1 luồng đồng thời truy cập; khắc phục bằng cách tăng tham số `maximumPoolSize` trong HikariCP.
- [ ] Phát sinh khi thực hiện phân trang với số trang quá lớn; khắc phục bằng cách chuyển đổi sang phân trang theo kiểu Offset.

> **Giải thích:** Ví dụ lấy 100 User và các Order của họ: 1 query lấy 100 user, sau đó vòng lặp gọi getter làm phát sinh 100 query lấy order cho từng user (`1 + 100 = 101 queries`). Sử dụng `JOIN FETCH u.orders` trong JPQL/HQL sẽ gom lại thành 1 câu SQL JOIN duy nhất, giảm tải 99% round-trip mạng tới database.

### Câu 6: Vì sao hầu hết các RDBMS (PostgreSQL, MySQL) lại chọn cấu trúc Cây B+Tree thay vì Cây B-Tree truyền thống để lưu trữ Index?
- [x] Cây B+Tree chỉ lưu dữ liệu thực tế tại các Node lá (được liên kết bằng Doubly Linked List giúp Range Scan cực nhanh) và các node trung gian chỉ chứa key định tuyến giúp giảm độ cao của cây.
- [ ] Cây B+Tree có tốc độ tìm kiếm một phần tử ngẫu nhiên luôn nhanh hơn B-Tree truyền thống đúng 2 lần.
- [ ] Cây B-Tree chỉ hỗ trợ khóa kiểu số nguyên, trong khi B+Tree mới hỗ trợ kiểu chuỗi ký tự và ngày tháng.
- [ ] Cây B+Tree sử dụng thuật toán băm (hashing) ở tầng gốc để tránh hoàn toàn việc duyệt cây qua các tầng trung gian.

> **Giải thích:** Trong B-Tree, node cha cũng chứa dữ liệu nên chứa được ít key -> cây cao hơn (nhiều I/O đĩa hơn). Trong B+Tree, node nhánh chỉ chứa khóa dẫn đường (routing keys) nên phân nhánh cực lớn (Fan-out hàng trăm con trỏ trên 1 block 16KB), độ cao cây chỉ 3-4 tầng cho hàng triệu bản ghi. Đặc biệt, danh sách liên kết đôi giữa các node lá giúp duyệt khoảng (`WHERE age BETWEEN 20 AND 30`) chỉ cần nhảy tới node lá đầu tiên rồi duyệt tuần tự sang ngang, không phải quay ngược lên node cha.

### Câu 7: Nguyên tắc Write-Ahead Logging (WAL trong PostgreSQL / Redo Log trong InnoDB) đảm bảo tính chất nào trong ACID?
- [x] Đảm bảo tính Bền vững (Durability): Mọi thay đổi dữ liệu bắt buộc phải được ghi tuần tự vào tệp nhật ký trên đĩa trước khi trang dữ liệu thực tế trong bộ nhớ đệm được xả xuống đĩa.
- [ ] Đảm bảo tính Cô lập (Isolation): Ngăn chặn các transaction đang chạy song song nhìn thấy dữ liệu chưa commit của nhau.
- [ ] Đảm bảo tính Nguyên tử (Atomicity): Tự động khôi phục lại trạng thái cũ của ứng dụng khi người dùng hủy bỏ phiên đăng nhập.
- [ ] Đảm bảo tính Nhất quán (Consistency): Tự động kiểm tra tất cả các ràng buộc khóa ngoại và ràng buộc CHECK trước khi thực thi lệnh SQL.

> **Giải thích:** Ghi ngẫu nhiên vào các data pages trên đĩa rất chậm. WAL áp dụng nguyên tắc: Ghi tuần tự (Sequential I/O) vào cuối file log rất nhanh; sau khi WAL ghi xong, transaction được coi là commit thành công. Nếu máy chủ mất điện đột ngột, khi khởi động lại cơ sở dữ liệu sẽ đọc Redo Log để phát lại (Replay) và hoàn tất các trang dữ liệu còn dở dang, đảm bảo 100% không mất dữ liệu đã commit.

### Câu 8: Cơ chế MVCC (Multi-Version Concurrency Control) mang lại ưu thế vượt trội nào cho hệ thống cơ sở dữ liệu quan hệ?
- [x] Cho phép các tác vụ ĐỌC không bị chặn bởi các tác vụ GHI và ngược lại (Readers do not block Writers, Writers do not block Readers) bằng cách phục vụ dữ liệu qua các bản chụp snapshot phiên bản.
- [ ] Tự động chuyển đổi các câu lệnh truy vấn phức tạp nhiều tầng JOIN thành các câu lệnh truy vấn đơn giản một bảng.
- [ ] Đảm bảo tất cả các transaction được thực thi hoàn toàn tuần tự trên một luồng duy nhất để tránh xung đột dữ liệu.
- [ ] Loại bỏ hoàn toàn sự cần thiết của các chỉ mục (Index) trên tất cả các bảng trong cơ sở dữ liệu.

> **Giải thích:** Trước khi có MVCC, luồng đọc phải chiếm Share Lock, luồng ghi chiếm Exclusive Lock -> luồng ghi làm chặn toàn bộ luồng đọc, làm giảm thông lượng thê thảm. Với MVCC, khi cập nhật một hàng, database không ghi đè trực tiếp mà tạo một phiên bản mới (hàng có `xmin`, `xmax` trong Postgres hoặc con trỏ `roll_ptr` trỏ tới Undo Log trong MySQL). Nhờ đó, luồng đọc xem phiên bản cũ, luồng ghi tạo phiên bản mới, hai bên hoàn toàn không xung đột.

### Câu 9: Trong kết quả phân tích kế hoạch thực thi `EXPLAIN` của MySQL, giá trị nào của trường `type` thể hiện hiệu năng truy vấn KÉM NHẤT và cần tối ưu hóa ngay?
- [x] `ALL` - Thể hiện việc database phải quét toàn bộ bảng từ đầu đến cuối (Full Table Scan) do không tận dụng được bất kỳ index nào.
- [ ] `ref` - Thể hiện việc quét các bản ghi khớp với một giá trị không duy nhất thông qua Non-unique Index.
- [ ] `range` - Thể hiện việc quét các bản ghi nằm trong một khoảng giá trị xác định (như `BETWEEN` hoặc `>`, `<`).
- [ ] `const` - Thể hiện việc truy vấn chỉ đọc đúng một dòng duy nhất thông qua Primary Key hoặc Unique Index.

> **Giải thích:** Thứ tự hiệu năng từ tốt nhất đến tệ nhất: `system > const > eq_ref > ref > range > index > ALL`. Khi `type = ALL`, database không dùng được bất kỳ index nào và phải đọc toàn bộ hàng triệu dòng dữ liệu từ đĩa cứng lên bộ nhớ, gây ngốn CPU và nghẽn I/O.

### Câu 10: Lợi ích vượt trội của một "Covering Index" (Chỉ mục bao phủ / Index-Only Scan) là gì?
- [x] Tất cả các cột xuất hiện trong câu lệnh `SELECT`, `WHERE`, `ORDER BY` đều nằm trọn vẹn trong Index, database trả về kết quả ngay từ Index mà không cần tốn I/O tra cứu ngược lại bảng chính (tránh Table Lookup).
- [ ] Tự động chuyển đổi toàn bộ dữ liệu của bảng sang định dạng cột (Columnar format) để nén dung lượng lưu trữ trên đĩa.
- [ ] Cho phép bảng cơ sở dữ liệu tự động scale-out sang nhiều máy chủ vật lý khác nhau mà không cần cấu hình Sharding.
- [ ] Ngăn chặn việc người dùng thực hiện các thao tác cập nhật (UPDATE/DELETE) trên các cột đã được đánh chỉ mục.

> **Giải thích:** Giả sử bạn tạo composite index `(user_id, status, created_at)`. Câu truy vấn: `SELECT status, created_at FROM orders WHERE user_id = 123`. Vì cả 3 cột đều đã có sẵn trong node lá của B-Tree index, database đọc xong index là trả về kết quả ngay cho client (Index-Only Scan), giảm tới 90% số lần đọc đĩa so với việc phải lấy Primary Key rồi quay về Clustered Index đọc tiếp.

### Câu 11: Điểm khác biệt căn bản giữa hiện tượng "Phantom Read" (Đọc bóng ma) và "Non-repeatable Read" (Đọc không lặp lại) là gì?
- [x] Non-repeatable Read xảy ra khi các hàng dữ liệu HIỆN CÓ bị sửa đổi hoặc xóa bởi transaction khác; còn Phantom Read xảy ra khi transaction khác CHÈN THÊM HÀNG MỚI thỏa mãn điều kiện lọc.
- [ ] Non-repeatable Read chỉ xảy ra ở mức cô lập `SERIALIZABLE`, còn Phantom Read xảy ra ở mọi mức độ cô lập.
- [ ] Non-repeatable Read liên quan đến việc đọc dữ liệu từ cache, còn Phantom Read liên quan đến việc đọc dữ liệu từ đĩa cứng.
- [ ] Non-repeatable Read chỉ xuất hiện khi có lỗi phần cứng mạng, còn Phantom Read là hành vi bình thường của database.

> **Giải thích:** 
- Transaction A đọc: `SELECT * WHERE age > 20` ra 5 dòng.
- Transaction B cập nhật 1 người từ age 25 thành 18 -> Transaction A đọc lại thấy chỉ còn 4 dòng -> Non-repeatable Read (giải quyết bằng `REPEATABLE READ`).
- Transaction B chèn thêm 1 người mới age 30 -> Transaction A đọc lại thấy có 6 dòng (xuất hiện dòng mới toanh) -> Phantom Read (giải quyết triệt để ở `SERIALIZABLE` hoặc dùng Gap Lock / Next-Key Lock trong InnoDB).

### Câu 12: Kỹ thuật khóa "Next-Key Lock" trong MySQL InnoDB được cấu thành từ hai loại khóa nào để ngăn chặn Phantom Read ở mức `REPEATABLE READ`?
- [x] Record Lock (Khóa trên bản ghi thực tế) kết hợp với Gap Lock (Khóa trên khoảng trống giữa các bản ghi).
- [ ] Shared Lock (Khóa chia sẻ) kết hợp với Exclusive Lock (Khóa độc quyền).
- [ ] Table Lock (Khóa toàn bảng) kết hợp với Intent Lock (Khóa ý định).
- [ ] Page Lock (Khóa trên trang dữ liệu) kết hợp với Row Lock (Khóa trên từng dòng).

> **Giải thích:** Nếu bảng có các id: `1, 5, 10`. Một câu lệnh `WHERE id = 5 FOR UPDATE` trên non-unique index sẽ khóa bản ghi `5` (Record lock) và khóa luôn cả khoảng trống `(1, 5)` và `(5, 10)` (Gap lock). Khi transaction khác cố tình `INSERT` một bản ghi có `id = 3` hoặc `id = 7`, thao tác chèn sẽ bị block, ngăn không cho bóng ma xuất hiện.

### Câu 13: Khi thiết kế cơ sở dữ liệu quy mô lớn, kỹ thuật "Phi chuẩn hóa" (Denormalization) được áp dụng nhằm mục đích gì?
- [x] Giảm bớt số lượng câu lệnh JOIN phức tạp trên các bảng có lưu lượng đọc khổng lồ, chấp nhận dư thừa dữ liệu và xử lý cập nhật phức tạp để đổi lấy tốc độ đọc tối đa.
- [ ] Đảm bảo dữ liệu tuân thủ chuẩn 3NF tuyệt đối và không xuất hiện bất kỳ sự trùng lặp dữ liệu nào giữa các bảng.
- [ ] Tự động mã hóa tất cả các trường dữ liệu nhạy cảm trước khi lưu xuống đĩa cứng.
- [ ] Thu nhỏ kích thước của các file lưu trữ dữ liệu bằng cách gom nhiều bảng vào cùng một tập tin nhị phân.

> **Giải thích:** Chuẩn hóa (3NF) giúp loại bỏ dữ liệu trùng lặp và đảm bảo tính toàn vẹn, nhưng khi query phải JOIN 5-7 bảng làm database quá tải. Trong các hệ thống lớn, người ta thường phi chuẩn hóa có kiểm soát: Lưu thẳng `user_name` vào bảng `orders` để khi hiển thị đơn hàng không cần JOIN sang bảng `users`, tăng tốc độ đọc lên gấp nhiều lần.

### Câu 14: Vì sao trong các hệ thống có lưu lượng giao dịch cực lớn (High-traffic OLTP), người ta thường hạn chế sử dụng Ràng buộc Khóa ngoại (Foreign Key Constraints) ở tầng Database?
- [x] Vì việc kiểm tra khóa ngoại buộc database phải chiếm thêm Shared Lock trên bảng cha mỗi khi ghi vào bảng con, gây nghẽn hiệu năng ghi (Lock contention), dễ dẫn đến Deadlock và gây khó khăn khi Sharding phân tán.
- [ ] Vì cơ sở dữ liệu quan hệ sẽ tự động khóa toàn bộ cơ sở dữ liệu mỗi khi có bản ghi vi phạm ràng buộc khóa ngoại.
- [ ] Vì khóa ngoại làm tăng nguy cơ phát sinh lỗi rò rỉ bộ nhớ (Memory Leak) trong tiến trình chạy ngầm của database server.
- [ ] Vì chuẩn SQL hiện đại đã chính thức loại bỏ cú pháp khóa ngoại khỏi đặc tả kỹ thuật.

> **Giải thích:** Ở quy mô lớn (như Alibaba, YouTube, Grab), tính toàn vẹn dữ liệu được đẩy lên tầng ứng dụng (Application Layer) xử lý thay vì bắt database thực hiện. Khi sharding bảng `orders` sang DB-1 và bảng `users` sang DB-2, database không thể kiểm tra Foreign Key xuyên qua các máy chủ vật lý khác nhau.

### Câu 15: Tiến trình "VACUUM" (hoặc Auto-vacuum) trong PostgreSQL đảm nhiệm vai trò sống còn nào sau đây?
- [x] Thu dọn các hàng dữ liệu chết (Dead Tuples) sinh ra do các câu lệnh UPDATE/DELETE của cơ chế MVCC, giải phóng không gian để tái sử dụng và ngăn ngừa hiện tượng phình to bảng (Table Bloat) cũng như sự cố tràn số Transaction ID.
- [ ] Tự động tạo bản sao lưu định kỳ cho toàn bộ cơ sở dữ liệu sang định dạng tệp nén trên ổ đĩa phụ.
- [ ] Tự động chuyển đổi các bảng có kích thước lớn sang định dạng bảng phân vùng (Partitioned Table).
- [ ] Quét và sửa chữa các lỗi vật lý trên bề mặt đĩa cứng của máy chủ lưu trữ dữ liệu.

> **Giải thích:** Trong Postgres MVCC, `DELETE` không xóa hàng ngay mà chỉ đánh dấu `xmax`; `UPDATE` là chèn hàng mới và đánh dấu hàng cũ là dead. Nếu không có Auto-vacuum quét dọn các dead tuples, dung lượng bảng sẽ phình to gấp 10 lần (Bloat), làm các câu query quét index bị chậm đi nhiều lần và nguy cơ đứng toàn bộ hệ thống khi TXID đạt 2 tỷ (Wraparound failure).

### Câu 16: Theo khuyến nghị của các kỹ sư phát triển HikariCP, nguyên tắc xác định kích thước tối ưu cho Connection Pool của Database là gì?
- [x] Giữ pool size ở mức nhỏ vừa vặn với số lượng CPU cores (`pool_size = (cpu_core_count * 2) + effective_spindle_count`) để tránh lãng phí tài nguyên CPU cho việc hoán đổi ngữ cảnh luồng (Context Switching).
- [ ] Càng cấp phát nhiều kết nối (ví dụ 1.000 đến 5.000 connections) thì thông lượng xử lý của database càng tăng cao tỷ lệ thuận.
- [ ] Cấu hình pool size bằng đúng số lượng người dùng đồng thời đang đăng nhập trên hệ thống tại giờ cao điểm.
- [ ] Pool size phải luôn luôn bằng tổng số lượng bảng hiện có trong cơ sở dữ liệu nhân với 2.

> **Giải thích:** Ngược với trực giác của nhiều người ("càng nhiều connection càng nhanh"), mỗi connection chiếm bộ nhớ và tranh chấp CPU core của máy chủ database. Nếu mở 1.000 connection trên server 16 cores, CPU dành 90% thời gian chỉ để hoán đổi ngữ cảnh luồng (Context Switching) và tranh chấp khóa I/O. Giữ pool size nhỏ (~20) giúp CPU làm việc hết công suất mà không bị nghẽn context switch.

### Câu 17: Biện pháp chuẩn mực và triệt để nhất để phòng chống lỗ hổng tấn công SQL Injection trong ứng dụng là gì?
- [x] Sử dụng Câu truy vấn có tham số (Parameterized Queries / Prepared Statements) để database biên dịch trước cấu trúc lệnh SQL và đối xử với tham số người dùng nhập như dữ liệu thuần túy (Literals).
- [ ] Sử dụng hàm mã hóa Base64 cho toàn bộ chuỗi người dùng nhập trước khi ghép vào câu lệnh SQL.
- [ ] Thay thế toàn bộ các mệnh đề `WHERE` trong câu lệnh SQL bằng các mệnh đề `HAVING`.
- [ ] Sử dụng thuật toán biểu thức chính quy (Regex) để lọc bỏ từ khóa `OR` và `AND` khỏi chuỗi đầu vào của người dùng.

> **Giải thích:** Với Prepared Statement (`SELECT * FROM users WHERE email = ?`), cơ sở dữ liệu biên dịch trước cấu trúc cú pháp của câu lệnh SQL (Parse & Compile). Khi tham số được truyền vào sau, database coi đó 100% là dữ liệu thuần túy (Literal value), dù người dùng có nhập chuỗi `' OR '1'='1` thì database cũng không bao giờ biên dịch nó thành lệnh SQL thực thi.

### Câu 18: Sự khác biệt kỹ thuật căn bản giữa kiểu dữ liệu `CHAR(10)` và `VARCHAR(10)` trong SQL là gì?
- [x] `CHAR(10)` có độ dài cố định, chuỗi ngắn hơn sẽ được tự động bù khoảng trắng cho đủ 10 byte; còn `VARCHAR(10)` có độ dài thay đổi, chỉ lưu đúng số byte thực tế của chuỗi cộng thêm byte tiền tố lưu độ dài.
- [ ] `CHAR(10)` chỉ lưu trữ được các ký tự số, trong khi `VARCHAR(10)` mới lưu trữ được các ký tự chữ cái và ký hiệu đặc biệt.
- [ ] `CHAR(10)` lưu trữ dữ liệu trực tiếp trong bộ nhớ RAM, trong khi `VARCHAR(10)` lưu trữ dữ liệu trên đĩa cứng.
- [ ] `CHAR(10)` hỗ trợ bảng mã đa ngôn ngữ Unicode, còn `VARCHAR(10)` chỉ hỗ trợ bảng mã ASCII 7-bit.

> **Giải thích:** `CHAR(n)` thích hợp cho dữ liệu có độ dài cố định tuyệt đối (như mã MD5, mã bưu điện, mã quốc gia ISO-2 `'VN'`, `'US'`), giúp tránh phân mảnh dữ liệu khi update. `VARCHAR(n)` tiết kiệm bộ nhớ khi độ dài biến đổi (như tên người, email, địa chỉ).

### Câu 19: Trong mô hình cơ sở dữ liệu Master-Replica, hiện tượng "Replication Lag" (Độ trễ nhân bản) thường dẫn tới sự cố nghiệp vụ nào và cách giải quyết?
- [x] Sự cố "Đọc sau khi ghi" (Read-Your-Own-Writes issue): Khách hàng vừa cập nhật dữ liệu xong, màn hình reload lại đọc từ Replica chưa kịp đồng bộ nên vẫn thấy dữ liệu cũ; khắc phục bằng cách định tuyến các request sau khi ghi về Master.
- [ ] Dữ liệu trên máy chủ Master sẽ bị tự động rollback về phiên bản trước đó nếu Replica không phản hồi kịp thời.
- [ ] Toàn bộ các kết nối từ ứng dụng đến máy chủ Master sẽ bị ngắt kết nối đột ngột để chờ Replica đồng bộ xong.
- [ ] Các câu lệnh INSERT tiếp theo trên Master sẽ bị khóa vô thời hạn cho đến khi Replica xác nhận đã ghi xong.

> **Giải thích:** Vì nhân bản dữ liệu qua mạng thường là bất đồng bộ (Asynchronous Replication), Replica luôn đi sau Master vài trăm mili-giây đến vài giây. Giải pháp cho bài toán Read-Your-Own-Writes: Sau khi user thực hiện thao tác POST/PUT, ứng dụng gắn cookie thời gian `just_updated=true` trong 5 giây, các request GET tiếp theo trong 5 giây đó sẽ được định tuyến thẳng về Master để đọc dữ liệu mới nhất.

### Câu 20: Khi thực hiện phân trang trên bảng dữ liệu lớn, vì sao câu lệnh `SELECT ... LIMIT 20 OFFSET 5000000` lại gây nghẽn hiệu năng nghiêm trọng và giải pháp thay thế là gì?
- [x] Vì database vẫn phải đọc và duyệt qua đủ 5.000.020 bản ghi rồi mới loại bỏ 5.000.000 bản ghi đầu để lấy 20 bản ghi cuối; giải pháp là dùng phân trang theo con trỏ (Keyset / Cursor-based Pagination) với điều kiện `WHERE id > last_seen_id`.
- [ ] Vì chuẩn SQL chỉ cho phép giá trị của OFFSET tối đa là 1.000.000, vượt quá sẽ gây lỗi tràn bộ nhớ.
- [ ] Vì câu lệnh OFFSET lớn sẽ tự động chiếm giữ Exclusive Table Lock trên toàn bộ bảng dữ liệu trong suốt thời gian truy vấn.
- [ ] Vì cơ sở dữ liệu sẽ tự động chuyển câu truy vấn sang quét toàn bộ các bảng khác có liên kết khóa ngoại.

> **Giải thích:** `OFFSET` không có phép màu nào để "nhảy cóc" qua 5 triệu dòng nếu không dùng index cursor: Nó phải đọc từng trang đĩa, tính toán thứ tự đủ 5 triệu lẻ 20 dòng rồi mới lấy 20 dòng cuối. Chuyển sang Keyset Pagination: `WHERE id < last_id ORDER BY id DESC LIMIT 20` giúp database nhảy thẳng tới đúng vị trí trên cây B-Tree trong O(1).
