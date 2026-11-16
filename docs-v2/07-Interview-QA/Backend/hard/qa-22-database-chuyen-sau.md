# Câu hỏi: Database chuyên sâu (hỏi xoáy)

Kiến thức gốc: [Database](/go?p=02-Database%2Findex.md), đặc biệt [InnoDB bên trong](/go?p=02-Database%2Fmedium%2Flt-07-mysql-innodb-noi-bo.md), [PostgreSQL MVCC, WAL, VACUUM](/go?p=02-Database%2Fmedium%2Flt-08-postgresql-mvcc-wal.md), [EXPLAIN và query planner](/go?p=02-Database%2Fhard%2Flt-09-explain-query-planner-tuning.md), [Lock và deadlock](/go?p=02-Database%2Fhard%2Flt-10-locking-deadlock-database.md), [Replication, partition, vận hành](/go?p=02-Database%2Fhard%2Flt-11-replication-partition-van-hanh.md). Câu hỏi nền tảng hơn: [Database và SQL](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-05-database-sql.md).

**Cách dùng.** Mỗi câu đi theo chuỗi: câu hỏi theo hiện tượng, **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới kiến thức nền), **Lập luận** (chuỗi nhân quả), **Đáp án ngắn**, **Ví dụ** cụ thể, **Nhớ** (kiến thức cốt lõi), rồi các **Hỏi xoáy** (mỗi câu nêu vì sao nó là bước tiếp theo). Hãy che phần lập luận và tự suy ra đáp án từ gợi ý, nói thành tiếng cả chuỗi.

**Về các ví dụ.** Sandbox soạn tài liệu **không có MySQL hay PostgreSQL**. Ví dụ ghi _"Đã chạy thử"_ chạy thật bằng Python, sqlite hoặc Java 11 và dán output thật; sqlite và các mô phỏng dùng để dựng lại **cơ chế** (WAL, B+Tree, snapshot, lock), không phải để giả làm MySQL/PostgreSQL. Ví dụ ghi _"Minh họa, chưa chạy thử"_ là SQL/EXPLAIN/log mẫu: định dạng và con số có thể khác theo phiên bản. Mọi con số thời gian lấy từ sandbox chỉ để so sánh tương đối.

**Tóm tắt:**

- Phạm vi file: database chuyên sâu, đi từ hiện tượng (chậm, mất điện, deadlock) tới cơ chế của B+Tree, WAL, MVCC và lock.
- B+Tree có fan-out hàng nghìn nên cây chỉ cao 3 đến 4 tầng cho cả tỷ dòng; UUID ngẫu nhiên làm page split và phình mọi secondary index vì chúng lưu primary key.
- Write-ahead logging: `COMMIT` chỉ cần log bền (`fsync`), trang dữ liệu flush sau; redo chỉ lưu delta nên cần doublewrite hoặc `full_page_writes` để có trang gốc nguyên vẹn.
- MVCC giữ nhiều phiên bản dòng: InnoDB sửa tại chỗ và cất bản cũ trong undo log, PostgreSQL ghi tuple mới nên cần VACUUM và có nguy cơ bloat, wraparound.
- Truy vấn chậm bất thường thường do ước lượng số dòng lệch; index `(a, b, c)` theo tiền tố trái; keyset thay `OFFSET` sâu.
- Lost update chống bằng cập nhật nguyên tử hoặc optimistic lock; write skew chỉ chặn được bằng `SERIALIZABLE` hoặc lock đại diện; gap lock gây deadlock khi cùng chèn vào khoảng; deadlock xử lý bằng thứ tự lock và retry.
- Hay bị hỏi xoáy nhất: vì sao `COMMIT` xong mất điện vẫn còn dữ liệu, replication lag làm người dùng thấy dữ liệu cũ, và `ALTER` chạy vài giây vẫn làm cả hệ thống đứng.

## 1. Bảng một tỷ dòng mà tìm theo primary key vẫn chỉ mất vài lần đọc đĩa. Vì sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Đĩa được đọc theo đơn vị nào (byte hay trang), và một lần đọc đĩa đắt cỡ nào so với tính toán trong RAM?
- Nếu mỗi trang của cây chứa thật nhiều key, thì mỗi tầng của cây "phân nhánh" được bao nhiêu hướng (fan-out)?
- Số lần đọc trang để chạm tới một dòng bằng đại lượng nào của cây?

**Lập luận:** Mỗi lần đọc đĩa rất đắt và luôn đọc cả một **trang** (16 KB ở InnoDB, 8 KB ở PostgreSQL), nên cách tối ưu là mỗi trang phải chứa càng nhiều key càng tốt. Trang nội bộ của B+Tree chỉ lưu key và con trỏ (khoảng 14 byte mỗi mục với key `BIGINT`), nên chứa được ~1.170 con trỏ. Fan-out lớn nghĩa là mỗi tầng nhân số trang lên ~1.170 lần, vậy cây rất **thấp**. Số lần đọc trang bằng chiều cao cây, tức logarit cơ số ~1.170 của số dòng, nên một tỷ dòng cũng chỉ cỡ 4 tầng. Dữ liệu dòng nằm ở trang lá. Điểm dễ nhầm là nghĩ đọc đĩa mỗi lần là một dòng: đơn vị đọc là trang, nên cái quyết định số lần đọc là số tầng của cây, và các tầng trên cùng luôn nằm sẵn trong buffer pool nên thực tế chỉ 1 đến 2 lần đọc đĩa cho mỗi tra cứu. Hệ quả khi thiết kế: key càng ngắn thì fan-out càng lớn và cây càng thấp, nên chọn primary key nhỏ (số nguyên) và tránh key dài lặp lại ở mọi secondary index.

**Đáp án ngắn:** B+Tree có fan-out hàng nghìn vì trang chỉ chứa key và con trỏ, nên cây chỉ cao 3 đến 4 tầng cho cả tỷ dòng; mỗi tầng là một lần đọc trang, và các tầng trên luôn nằm trong buffer pool.

**Nhớ:** chi phí tìm kiếm = chiều cao cây = logarit theo cơ số fan-out, đơn vị đọc là trang. Xem [InnoDB bên trong](/go?p=02-Database%2Fmedium%2Flt-07-mysql-innodb-noi-bo.md).

**Ví dụ:** tính chiều cao cây (dòng 1 KB nên mỗi trang lá chứa 16 dòng; key `BIGINT` + con trỏ 6 byte):

```text
    1,000,000 dong (1KB/dong): 16 dong/trang la, 62,500 trang la, fan-out noi bo ~1170, chieu cao = 3 -> toi da 3 lan doc trang
  100,000,000 dong (1KB/dong): 16 dong/trang la, 6,250,000 trang la, fan-out noi bo ~1170, chieu cao = 4 -> toi da 4 lan doc trang
1,000,000,000 dong (1KB/dong): 16 dong/trang la, 62,500,000 trang la, fan-out noi bo ~1170, chieu cao = 4 -> toi da 4 lan doc trang
```

_Đã chạy thử (python, phép tính; giả định fill 100%, thực tế thấp hơn một chút nhưng chiều cao thường không đổi)._ Từ 1 triệu lên 1 tỷ dòng (gấp 1.000 lần) chỉ thêm **một** tầng. Các tầng trên cùng luôn nằm trong buffer pool nên thực tế thường chỉ 1 đến 2 lần đọc đĩa thật.

**Hỏi xoáy 1:** Vì sao không dùng cây nhị phân hay hash?
Vì sao hỏi tiếp: sau khi biết cây thấp nhờ fan-out, người phỏng vấn thử các cấu trúc khác để xem bạn hiểu lý do chọn B+Tree.

**Đáp:** Cây nhị phân cao ~log₂(10⁹) ≈ 30 tầng, mỗi tầng một lần đọc đĩa nếu không nằm trong cache. Hash cho tra cứu bằng O(1) nhưng **không hỗ trợ khoảng, `ORDER BY`, tiền tố**; B+Tree có các trang lá nối liền nhau theo thứ tự nên quét khoảng chỉ là đi ngang.

**Hỏi xoáy 2:** Lock dài hơn (UUID dạng chuỗi 36 byte) làm gì với cây?
Vì sao hỏi tiếp: fan-out phụ thuộc kích thước key, nên đổi kiểu key sẽ đổi chiều cao cây.

**Đáp:** Mỗi trang nội bộ chứa ít key hơn (fan-out giảm khoảng 3 đến 4 lần), cây có thể thêm một tầng và mọi index phình ra (câu 3).

**Sai lầm hay gặp:** Nói "B-Tree nhanh vì O(log n)" mà không nói **cơ số của logarit** (fan-out) và đơn vị đọc là trang.

## 2. Vừa `COMMIT` xong thì server mất điện. Vì sao dữ liệu vẫn còn, dù trang dữ liệu chưa kịp ghi xuống đĩa?

**Gợi ý suy luận:**
- Ghi ngẫu nhiên nhiều trang ra đĩa so với ghi nối tiếp vào một file: cái nào nhanh hơn, và vì sao?
- Nếu chỉ ghi "ý định thay đổi" ra nơi bền trước, thì khi sập ta có thể làm gì với nó (khái niệm write-ahead logging)?
- Khi có cả redo log lẫn binlog, hai thứ này có thể lệch nhau ở đâu, và ai quyết định bên nào đúng?

**Lập luận:** Ghi ngẫu nhiên trang dữ liệu thì chậm, ghi nối tiếp vào log thì nhanh, nên DB ghi ý định thay đổi vào log và `fsync` trước, còn trang bẩn nằm trong buffer pool, flush nền sau (write-ahead logging). Vì log đã bền, nếu sập thì chỉ cần phát lại log để dựng lại trang, nên `COMMIT` chỉ cần log bền chứ không cần trang dữ liệu bền. Nhưng InnoDB còn có binlog cho replica và PITR, hai log phải khớp nhau, nên dùng two-phase commit nội bộ: prepare redo, ghi binlog, rồi mới commit redo. Điểm dễ nhầm là tin `COMMIT` nghĩa là dữ liệu đã nằm trong file dữ liệu: nó chỉ nghĩa log bền đã `fsync`, và độ bền thật phụ thuộc cấu hình (`innodb_flush_log_at_trx_commit`, `synchronous_commit`). Khi review, hỏi ứng dụng chấp nhận mất tối đa bao nhiêu transaction cuối khi mất điện, rồi đặt cấu hình `fsync` tương ứng, và kiểm tra cả khả năng của đĩa/RAID có cache ghi.

**Đáp án ngắn:** `COMMIT` chỉ bảo đảm redo log (và binlog nếu bật) đã `fsync`; trang dữ liệu flush sau. Khi sập, InnoDB phát lại redo; redo và binlog được giữ nhất quán bằng two-phase commit.

**Nhớ:** write-ahead logging: log bền trước, trang dữ liệu bền sau. Crash recovery dùng redo, binlog dùng cho replication và PITR. Xem [InnoDB bên trong](/go?p=02-Database%2Fmedium%2Flt-07-mysql-innodb-noi-bo.md).

**Ví dụ:** dựng lại ý tưởng bằng sqlite ở chế độ WAL (cơ chế tương đương về nguyên lý, không phải InnoDB): 200 commit chỉ **nối thêm vào file WAL**, file dữ liệu chưa đổi, đến checkpoint mới ghi trang xuống.

```text
sau CREATE : db=  4096 B  wal=   8272 B
200 commit : db=  4096 B  wal= 877592 B  (moi commit chi noi them vao WAL)
checkpoint : db= 32768 B  wal=     0 B  (trang bẩn moi duoc ghi vao file du lieu)
```

Và chi phí của việc đồng bộ ổ đĩa mỗi commit (300 commit, sandbox):

```text
synchronous=FULL: 300 commit trong 2.87s = 105 commit/s
synchronous=OFF : 300 commit trong 0.01s = 33,851 commit/s
```

_Đã chạy thử (python + sqlite)._ Con số tuyệt đối thuộc về đĩa ảo của sandbox (rất chậm), nhưng hình dạng thì đúng: **`fsync` mỗi commit là chi phí chủ đạo**, vì vậy các hệ gom nhiều commit vào một lần `fsync` (group commit) để tăng throughput.

**Hỏi xoáy 1:** Server sập sau khi ghi binlog nhưng trước khi commit redo thì sao?
Vì sao hỏi tiếp: hai log (redo và binlog) ghi ở hai thời điểm, nên phải hỏi khi sập xen giữa thì ai quyết định.

**Đáp:** Khởi động lại, redo ở trạng thái _prepared_; InnoDB tra binlog. Transaction có trong binlog (đủ XID) thì **commit**, không có thì **rollback**. Nhờ đó binlog (nguồn của replica và PITR) và dữ liệu không lệch nhau.

**Hỏi xoáy 2:** `innodb_flush_log_at_trx_commit` đặt 0/1/2 thì mất gì?
Vì sao hỏi tiếp: `fsync` mỗi commit là chi phí chủ đạo, nên hỏi nếu nới nó ra thì đổi lấy rủi ro gì.

| Giá trị | Mỗi commit | Mất khi mysqld chết | Mất khi cả máy mất điện |
|---|---|---|---|
| 1 (mặc định) | ghi và `fsync` redo | không | không |
| 2 | ghi ra OS cache, `fsync` mỗi giây | không (đã nằm ở OS) | tối đa ~1 giây |
| 0 | ghi vào log buffer, ghi và `fsync` mỗi giây | tối đa ~1 giây | tối đa ~1 giây |

**Hỏi xoáy 3:** Redo log đã có thì doublewrite buffer để làm gì?
Vì sao hỏi tiếp: nếu redo đã đủ để dựng lại, tại sao còn cần thêm một bản sao trang nữa?

**Đáp:** Redo chỉ lưu **thay đổi** (delta), không sửa được một trang 16 KB đã bị ghi dở (torn page). Doublewrite giữ bản nguyên vẹn của trang để khôi phục. Từ 8.0.20 nó nằm trong file riêng thay vì system tablespace. Xem mô phỏng ở câu 6.

**Sai lầm hay gặp:** Nhầm binlog là thứ dùng cho crash recovery; thực tế crash recovery dùng redo, còn binlog phục vụ replication và PITR.

## 3. Đổi primary key từ `AUTO_INCREMENT` sang UUID ngẫu nhiên, ghi chậm đi và đĩa phình ra. Vì sao?

**Gợi ý suy luận:**
- Trong InnoDB, dòng dữ liệu nằm ở đâu so với primary key (clustered index)?
- Lock tăng dần chèn vào chỗ nào của cây, còn key ngẫu nhiên chèn vào chỗ nào? Khi trang lá đã đầy mà phải chèn vào giữa thì điều gì xảy ra (page split)?
- Secondary index lưu con trỏ về dòng bằng cái gì, và primary key dài ảnh hưởng tới chúng ra sao?

**Lập luận:** Vì dòng nằm ngay trong B+Tree theo primary key, key tăng dần luôn chèn vào "đuôi" cây, còn key ngẫu nhiên chèn vào trang bất kỳ. Trang bất kỳ đã đầy thì phải **tách đôi**, nên các trang chỉ còn ~70% đầy và số trang tăng; buffer pool phải nạp trang ngẫu nhiên thay vì chỉ giữ đuôi cây, nên I/O ngẫu nhiên tăng và cache kém hiệu quả. Thêm nữa, mọi secondary index lưu **primary key** làm con trỏ, nên key dài (16 hoặc 36 byte) bị lặp lại trong tất cả index và làm chúng phình. Điểm dễ nhầm là nghĩ UUID chỉ "dài hơn" một chút: tác động chính là chèn ngẫu nhiên gây page split, buffer pool kém hiệu quả và mọi secondary index phình theo. Nếu bắt buộc dùng UUID, chọn dạng có thứ tự thời gian (UUIDv7, ULID) để chèn lại gần về cuối cây, hoặc giữ primary key nội bộ là số tăng dần và để UUID là cột unique cho bên ngoài.

**Đáp án ngắn:** UUID ngẫu nhiên khiến chèn vào giữa cây, gây page split, phân mảnh, I/O ngẫu nhiên; primary key dài còn bị lặp trong mọi secondary index nên phình tất cả index.

**Nhớ:** InnoDB là clustered index, secondary index trỏ bằng primary key. Xem [InnoDB bên trong](/go?p=02-Database%2Fmedium%2Flt-07-mysql-innodb-noi-bo.md).

**Ví dụ 1 (mô phỏng chia trang kiểu InnoDB: trang lá chứa 100 key; chèn cuối thì tạo trang mới, chèn giữa thì tách 50/50), chèn 100.000 key:**

```text
tang dan   :  1000 trang la, trung binh day 100.0%, so lan tach trang 999
ngau nhien :  1432 trang la, trung binh day  69.8%, so lan tach trang 1431
```

_Đã chạy thử (python, mô phỏng đơn giản)._ Lock ngẫu nhiên: ~43% nhiều trang hơn, mỗi trang chỉ đầy ~70% (trùng giá trị lý thuyết ln 2 ≈ 69%). Thực tế InnoDB với key tăng dần cũng không đầy 100% (khoảng 15/16) nhưng cùng xu hướng.

**Ví dụ 2 (sqlite `WITHOUT ROWID`, primary key 16 byte, cũng là clustered theo PK), 150.000 dòng:**

```text
tang_dan   :  0.55s  file=  7.24 MB  (1768 trang)
ngau_nhien :  1.18s  file=  7.03 MB  (1716 trang)
```

_Đã chạy thử (python + sqlite)._ Thời gian chèn ngẫu nhiên chậm hơn khoảng 2,1 lần. Lưu ý trung thực: **kích thước file ở sqlite gần như không khác**, vì chiến lược chia trang của sqlite không giống InnoDB; đừng suy ra "UUID không làm phình bảng" từ đó. Điều chắc chắn ở cả hai là chi phí chèn vào vị trí ngẫu nhiên.

**Ví dụ 3 (phình secondary index vì lặp lại primary key), 100 triệu dòng, index trên cột `INT` 4 byte:**

```text
PK BIGINT          : moi secondary index ~   1.2 GB cho 100 trieu dong (chua tinh overhead)
PK UUID BINARY(16) : moi secondary index ~   2.0 GB cho 100 trieu dong (chua tinh overhead)
PK UUID CHAR(36)   : moi secondary index ~   4.0 GB cho 100 trieu dong (chua tinh overhead)
```

_Đã chạy thử (python, phép tính)._ Với 5 index thứ cấp, chọn `CHAR(36)` thay vì `BIGINT` phình thêm khoảng 14 GB chỉ riêng phần primary key lặp lại.

**Hỏi xoáy 1:** Nếu vẫn cần UUID phía ứng dụng?
Vì sao hỏi tiếp: nếu nghiệp vụ buộc phải có UUID thì làm sao giữ tính tăng dần của primary key?

**Đáp:** UUID có thành phần thời gian đứng đầu (UUID v7, ULID); hoặc `BINARY(16)` với `UUID_TO_BIN(uuid, 1)` để hoán đổi phần thời gian lên trước (MySQL 8); hoặc `BIGINT AUTO_INCREMENT` làm primary key nội bộ và UUID làm cột unique để lộ ra ngoài.

**Hỏi xoáy 2:** Primary key tăng dần có nhược điểm gì không?
Vì sao hỏi tiếp: hỏi mặt trái của giải pháp vừa nêu để kiểm tra bạn nhìn được đánh đổi.

**Đáp:** Mọi lần chèn dồn vào trang cuối (điểm nóng tranh chấp trên máy ghi cực nhiều thread); và `AUTO_INCREMENT` khó dùng qua nhiều node độc lập (cần Snowflake hoặc dải ID cấp phát). Với tải thông thường, lợi ích lớn hơn nhiều.

**Sai lầm hay gặp:** Chỉ nói "UUID chậm" mà không giải thích page split, phân mảnh và việc primary key lặp lại trong mọi secondary index.

## 4. Cùng một dòng, một transaction đọc mà không bị UPDATE của transaction khác chặn. InnoDB và PostgreSQL làm điều đó khác nhau ra sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Muốn đọc không block ghi, DB phải giữ một thứ gì của dòng cũ (khái niệm nhiều phiên bản, MVCC)?
- Bản cũ được cất ở đâu: sửa tại chỗ rồi cất bản cũ riêng (undo log), hay viết bản mới và để bản cũ nằm lại (tuple trong heap)?
- Bản cũ không ai cần nữa thì ai dọn, và việc dọn đó bị gì chặn lại?

**Lập luận:** Để đọc không block ghi, DB giữ nhiều phiên bản của một dòng và cho mỗi transaction nhìn phiên bản phù hợp với snapshot của nó. InnoDB sửa tại chỗ trong clustered index và đẩy bản cũ vào **undo log**; đọc dùng read view và đi theo chuỗi undo. PostgreSQL không sửa tại chỗ: UPDATE đặt `xmax` cho tuple cũ và chèn tuple mới với `xmin` mới; đọc đối chiếu `xmin`/`xmax` với snapshot. Vì bản cũ nằm ở chỗ khác nhau, nên việc dọn rác cũng khác: InnoDB phải purge undo, PostgreSQL phải VACUUM và chịu bloat. Điểm dễ nhầm là cho rằng hai DB dùng cùng thuật ngữ MVCC thì hành vi giống nhau: InnoDB giữ một bản mới nhất tại chỗ và undo cho bản cũ, còn PostgreSQL giữ cả hai trong heap và cần VACUUM. Hệ quả vận hành khác nhau rõ rệt: MySQL cần theo dõi history list length và transaction dài, PostgreSQL cần theo dõi bloat, `autovacuum` và `idle in transaction`.

**Đáp án ngắn:** Cả hai giữ nhiều phiên bản dòng. InnoDB sửa tại chỗ và cất bản cũ vào undo log; PostgreSQL ghi tuple mới trong heap và để tuple cũ đến khi VACUUM dọn.

**Nhớ:** MVCC khác nhau ở chỗ bản cũ được giữ ở đâu, và hệ quả là purge undo (InnoDB) hay VACUUM và bloat (PostgreSQL). Xem [PostgreSQL MVCC, WAL, VACUUM](/go?p=02-Database%2Fmedium%2Flt-08-postgresql-mvcc-wal.md).

**Ví dụ (mô phỏng quy tắc nhìn thấy của PostgreSQL):** T10 mở snapshot, sau đó T11 `UPDATE balance 100 → 70` và commit:

```text
heap ban dau : [(1, None, 'balance=100')]
sau T11 UPDATE: [(1, 11, 'balance=100'), (11, None, 'balance=70')]
T10 (snapshot cu, xmax=10) thay : ['balance=100']
T12 (moi)                     thay : ['balance=70']

Khong con snapshot nao cu -> tuple chet co the don: [(1, 11, 'balance=100')]
T10 van mo (oldest xmax=10) -> don duoc: []   <- giao dich dai chan VACUUM
```

_Đã chạy thử (python, mô phỏng tối giản `xmin`/`xmax`; chưa mô hình hóa hint bits, subtransaction, v.v.)._ Mỗi bộ ba là (`xmin`, `xmax`, giá trị). Quan sát hai điều: (1) hai transaction nhìn thấy hai phiên bản khác nhau của cùng một dòng, không lock nhau; (2) tuple cũ chỉ dọn được khi **không còn snapshot nào cần nó**.

| | InnoDB | PostgreSQL |
|---|---|---|
| UPDATE | sửa tại chỗ, bản cũ vào undo | tuple mới trong heap, tuple cũ đánh `xmax` |
| Đọc bản cũ | đi theo chuỗi undo từ read view | quét heap, lọc theo `xmin`/`xmax` |
| Dọn rác | purge undo | VACUUM (heap và index) |
| Triệu chứng khi transaction dài | History list length tăng, undo phình | bloat bảng và index, VACUUM không dọn được |

**Hỏi xoáy 1:** Vì sao transaction mở lâu gây hại ở cả hai hệ?
Vì sao hỏi tiếp: cả hai hệ đều giữ bản cũ, nên bản cũ bị giữ lâu thì hậu quả chung là gì?

**Đáp:** Nó giữ một read view/snapshot cũ nên không bản cũ nào mà nó có thể cần bị dọn (đúng như dòng cuối của output trên). InnoDB: undo và _History list length_ tăng, truy vấn đi chuỗi phiên bản dài. PostgreSQL: VACUUM không loại được tuple chết, bảng và index phình.

**Hỏi xoáy 2:** Ngoài transaction dài, cái gì khác chặn VACUUM của PostgreSQL?
Vì sao hỏi tiếp: ngoài transaction dài, mọi thứ giữ "đường chân trời xmin" đều chặn dọn rác.

**Đáp:** Replication slot không được tiêu thụ, standby bật `hot_standby_feedback` có truy vấn chạy lâu, và prepared transaction (2PC) bị bỏ quên. Cả ba giữ "đường chân trời xmin" lại.

**Hỏi xoáy 3:** Vì sao UPDATE trong PostgreSQL có thể đắt hơn bạn nghĩ, và HOT là gì?
Vì sao hỏi tiếp: tuple mới nằm ở vị trí vật lý mới, vậy index trỏ vào đâu thì phải cập nhật?

**Đáp:** Mọi index trỏ tới vị trí vật lý của tuple, nên tuple mới thường cần thêm entry vào **mọi** index. HOT update tránh điều đó khi không cột index nào đổi và còn chỗ trống trong cùng page; hạ `fillfactor` để chừa chỗ cho HOT.

**Sai lầm hay gặp:** Nói "PostgreSQL không có undo" mà không nêu hệ quả là bloat và nhu cầu VACUUM.

## 5. Bảng PostgreSQL cứ phình dù không INSERT thêm gì. Vì sao cần VACUUM, và chuyện gì nếu tắt autovacuum?

**Gợi ý suy luận:**
- UPDATE/DELETE trong PostgreSQL xử lý tuple cũ thế nào (nhớ lại câu 4)? Chỗ đó có được trả lại ngay không?
- Transaction ID là số bao nhiêu bit, và điều gì xảy ra khi nó chạy hết rồi quay vòng (wraparound)?
- Tuple cũ phải được làm gì (freeze) để không bị coi nhầm là "thuộc về tương lai"?

**Lập luận:** Vì UPDATE/DELETE chỉ **đánh dấu** tuple chết mà không trả chỗ (câu 4), bảng tích tụ rác, nên cần một process dọn. Ngoài ra xid là số 32 bit quay vòng; tuple cũ chưa freeze sẽ bị coi như nằm trong tương lai khi xid quay lại, nên dữ liệu "biến mất". VACUUM giải quyết cả hai: đánh dấu chỗ tái sử dụng, dọn entry index, cập nhật visibility map, và freeze tuple cũ. Tắt autovacuum thì bloat tăng, hiệu năng giảm, và nặng nhất là nguy cơ wraparound. Điểm dễ nhầm là chỉ thấy VACUUM như một việc tốn tài nguyên rồi tắt nó đi, hoặc chạy `VACUUM FULL` thường xuyên (lock độc quyền và viết lại bảng). Cách đúng là để autovacuum chạy, chỉnh ngưỡng cho bảng nóng (`autovacuum_vacuum_scale_factor` nhỏ hơn), tránh transaction dài giữ xid cũ chặn dọn, và giám sát tuổi xid để không chạm wraparound.

**Đáp án ngắn:** VACUUM dọn tuple chết, cập nhật visibility map và freeze xid cũ. Tắt autovacuum thì bảng và index phình, và cuối cùng có nguy cơ transaction ID wraparound khiến PostgreSQL phải dừng nhận ghi.

**Nhớ:** UPDATE/DELETE chỉ đánh dấu chết; xid 32 bit quay vòng nên phải freeze. Xem [PostgreSQL MVCC, WAL, VACUUM](/go?p=02-Database%2Fmedium%2Flt-08-postgresql-mvcc-wal.md).

**Ví dụ (tính bằng python):** bảng 100 triệu dòng, ngưỡng kích hoạt autovacuum `= threshold + scale_factor × số dòng`:

```text
autovacuum_vacuum_scale_factor=0.2: kich hoat khi tuple chet > 20,000,050
autovacuum_vacuum_scale_factor=0.01: kich hoat khi tuple chet > 1,000,050
```

Và thời gian cạn không gian xid (2³¹ ≈ 2,15 tỷ) nếu mọi transaction ghi dùng 1 xid mà không freeze:

```text
  1000 giao dich ghi/s: 2^31 xid het sau ~  24.9 ngay
  5000 giao dich ghi/s: 2^31 xid het sau ~   5.0 ngay
 20000 giao dich ghi/s: 2^31 xid het sau ~   1.2 ngay
```

_Đã chạy thử (python, phép tính)._ Vì vậy PostgreSQL tự chạy autovacuum chống wraparound khi tuổi bảng vượt `autovacuum_freeze_max_age` (mặc định 200 triệu), rất xa mức trần; theo dõi bằng:

```sql
SELECT relname, age(relfrozenxid) FROM pg_class WHERE relkind='r' ORDER BY 2 DESC LIMIT 5;
SELECT relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 5;
-- hạ ngưỡng riêng cho bảng khổng lồ
ALTER TABLE big_table SET (autovacuum_vacuum_scale_factor = 0.01);
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Wraparound là gì và hậu quả?
Vì sao hỏi tiếp: lý do thứ hai của VACUUM là xid quay vòng, cần hiểu hậu quả cụ thể.

**Đáp:** Xid là số 32 bit vòng lại sau ~2 tỷ transaction; tuple chưa freeze có thể bị coi như thuộc về tương lai và "biến mất". Để tránh mất dữ liệu PostgreSQL ép autovacuum chống wraparound và nếu vẫn không kịp thì dừng nhận ghi. Theo dõi `age(relfrozenxid)`.

**Hỏi xoáy 2:** Bảng 100 triệu dòng, autovacuum "chạy mãi mà bảng vẫn phình". Chẩn đoán?
Vì sao hỏi tiếp: biết VACUUM làm gì rồi thì hỏi chẩn đoán khi nó chạy mà không hiệu quả.

**Đáp:** Kiểm tra có snapshot cũ chặn không (`pg_stat_activity.xact_start`, `pg_replication_slots`); autovacuum có bị hủy hoặc quá chậm (`autovacuum_vacuum_cost_limit`, `cost_delay` quá khắt khe); và scale factor mặc định 0,2 quá lớn cho bảng khổng lồ (cần 20 triệu tuple chết mới kích hoạt, như tính ở trên). Hạ ngưỡng riêng cho bảng.

**Hỏi xoáy 3:** `VACUUM FULL` khác `VACUUM` thế nào?
Vì sao hỏi tiếp: nếu muốn trả đĩa cho hệ điều hành thì VACUUM thường chưa đủ, vậy lựa chọn nào?

**Đáp:** `VACUUM FULL` viết lại cả bảng vào file mới để trả đĩa cho hệ điều hành nhưng giữ lock độc quyền suốt thời gian chạy. Trên production thay bằng `pg_repack` hoặc làm trong cửa sổ bảo trì.

**Sai lầm hay gặp:** Cho rằng `VACUUM` thường làm file bảng nhỏ lại; thực tế nó chỉ đánh dấu chỗ trống để tái sử dụng.

## 6. Mất điện giữa lúc ghi một trang, WAL/redo vẫn không cứu được trang đó. Vì sao PostgreSQL cần `full_page_writes` còn InnoDB cần doublewrite?

**Gợi ý suy luận:**
- Đĩa ghi theo đơn vị nào (sector) so với trang DB (8 hoặc 16 KB)? Mất điện giữa chừng để lại gì (torn page)?
- Redo/WAL lưu cái gì: cả trang hay chỉ thay đổi (delta)? Delta áp lên trang hỏng thì có ra trang đúng không?
- Vậy cần có sẵn thứ gì để làm điểm xuất phát cho redo?

**Lập luận:** Trang DB lớn hơn sector, nên mất điện giữa chừng có thể để lại trang nửa cũ nửa mới. Redo/WAL chỉ lưu delta ("ghi 100 byte vào offset 9000"), mà delta chỉ áp đúng lên một trang **nguyên vẹn**; áp lên trang hỏng thì vẫn hỏng. Do đó cần một **bản nguyên vẹn** của trang để làm điểm xuất phát rồi mới phát lại redo. InnoDB giữ bản này bằng cách ghi bản sao trang vào vùng doublewrite trước khi ghi vào vị trí thật; PostgreSQL ghi cả trang vào WAL ở lần sửa đầu tiên sau mỗi checkpoint. Điểm dễ nhầm là nghĩ "có WAL là không bao giờ hỏng dữ liệu": WAL chỉ giúp khi trang gốc còn nguyên, nên các cơ chế bảo vệ trang (doublewrite, full page writes) là mắt xích còn lại. Khi tinh chỉnh hiệu năng, tắt hai cơ chế này làm ghi nhanh hơn nhưng đánh đổi rủi ro hỏng trang khi mất điện, nên chỉ làm khi có tầng lưu trữ bảo đảm ghi nguyên tử và hiểu rõ rủi ro.

**Đáp án ngắn:** Redo chỉ lưu delta nên không sửa được trang đã ghi dở. InnoDB dùng doublewrite buffer, PostgreSQL ghi nguyên trang vào WAL (`full_page_writes`) để luôn có bản nguyên vẹn làm gốc.

**Nhớ:** log delta chỉ có nghĩa trên trang nguyên vẹn; torn page cần bản sao trang. Xem [PostgreSQL MVCC, WAL, VACUUM](/go?p=02-Database%2Fmedium%2Flt-08-postgresql-mvcc-wal.md).

**Ví dụ (mô phỏng):** trang 16 KB gồm 4 sector 4 KB, mất điện sau khi ghi 2 sector:

```text
page tren dia sau mat dien: sector0-1 la ban moi, sector2-3 la ban cu
checksum khop ban cu? False | khop ban moi? False => page HONG (torn)
ap redo delta len page hong -> checksum khop ban cu hoac ban moi? False (van hong: redo chi luu thay doi, khong co ban nguyen ven de dung lai)
khoi phuc: lay ban page tu doublewrite, roi ap redo -> True
```

_Đã chạy thử (python, `zlib.crc32` làm checksum)._ Cái giá của cách PostgreSQL: sau checkpoint, khối lượng WAL tăng vọt vì mỗi trang chạm lần đầu ghi nguyên trang:

```text
Sau checkpoint, 1000 page duoc sua lan dau: ghi delta ~100B moi page = 98 KB, full_page_writes ghi nguyen page 8KB = 7.8 MB
```

_Đã chạy thử (python, phép tính; con số 100 B/delta minh họa)._

**Hỏi xoáy 1:** Hệ quả hiệu năng của cách PostgreSQL?
Vì sao hỏi tiếp: ghi nguyên trang vào WAL tốn thêm, nên hỏi cái giá đó xuất hiện lúc nào.

**Đáp:** Đúng như số liệu trên: ngay sau checkpoint WAL phình (gấp ~80 lần trong ví dụ). Checkpoint quá dày làm WAL phình liên tục; tăng `max_wal_size` và `checkpoint_timeout` giảm hiện tượng.

**Hỏi xoáy 2:** Khi nào có thể tắt các cơ chế này?
Vì sao hỏi tiếp: đã có giá hiệu năng thì có lúc nào được phép bỏ cơ chế này không?

**Đáp:** Chỉ khi tầng lưu trữ đảm bảo ghi trang nguyên tử (một số hệ tệp/ổ đĩa) và bạn đã xác nhận điều đó. Tắt sai là hỏng dữ liệu không phục hồi được; kiểm tra lại theo phiên bản và phần cứng.

**Sai lầm hay gặp:** Nghĩ WAL/redo tự thân đã đủ chống hỏng trang.

## 7. Một truy vấn đột nhiên chậm sau một đêm dù không ai đổi code. Bạn làm gì?

**Gợi ý suy luận:**
- SQL chỉ nói "muốn gì"; ai chọn "làm thế nào", và dựa vào dữ liệu nào (thống kê)?
- Code không đổi mà kế hoạch đổi, vậy cái gì đã đổi: dữ liệu, thống kê hay tham số?
- Làm sao biết planner đã tin sai điều gì (so `rows` ước lượng với thực tế)?

**Lập luận:** Planner chọn thuật toán dựa trên thống kê về số dòng và phân bố giá trị. Code không đổi nhưng dữ liệu hoặc thống kê đổi (autovacuum/`ANALYZE` vừa chạy, nạp hoặc xóa lượng lớn, tham số bind hiếm) thì kế hoạch đổi theo. Nguyên nhân gốc phổ biến nhất là **ước lượng số dòng sai**, khiến planner chọn sai thuật toán (ví dụ Nested Loop vì tin chỉ có 1 dòng). Vì vậy việc đầu tiên là lấy kế hoạch thực tế và đối chiếu ước lượng với thực tế, thay vì đoán hoặc thêm index. Điểm dễ nhầm là thấy truy vấn chậm là thêm index mới hoặc ép planner bằng hint ngay, trong khi gốc có thể là thống kê cũ hoặc tham số bind hiếm dẫn tới kế hoạch sai. Quy trình: so kế hoạch cũ và mới, kiểm tra thống kê và độ lệch ước lượng, `ANALYZE` hoặc tăng độ chi tiết thống kê, rồi mới xét index; lưu kế hoạch tốt để so sánh lần sau.

**Đáp án ngắn:** Lấy `EXPLAIN (ANALYZE, BUFFERS)` với tham số thật, so với kế hoạch cũ, tìm nút tốn nhất và nút có `rows` ước lượng lệch xa thực tế; sửa gốc bằng `ANALYZE`, tăng độ chi tiết thống kê hoặc extended statistics.

**Nhớ:** chậm đột ngột thường là thống kê hoặc phân bố đổi dẫn tới kế hoạch đổi, không phải code. Xem [EXPLAIN và query planner](/go?p=02-Database%2Fhard%2Flt-09-explain-query-planner-tuning.md).

**Ví dụ (sqlite, minh họa vì sao thống kê sai gây kế hoạch sai):** bảng 200.000 đơn, 99,9% `DONE` và 0,1% `PENDING`:

```text
so dong thuc te: PENDING = 200 | DONE = 199800
TRUOC ANALYZE: PENDING -> ['SEARCH orders USING INDEX idx_status (status=?)']
TRUOC ANALYZE: DONE    -> ['SEARCH orders USING INDEX idx_status (status=?)']
sqlite_stat1: [('idx_status', '200000 100000')]
SAU ANALYZE : PENDING -> ['SCAN orders']
SAU ANALYZE : DONE    -> ['SCAN orders']
```

_Đã chạy thử (python + sqlite)._ Đọc kỹ: `sqlite_stat1` chỉ lưu **trung bình** "100.000 dòng mỗi giá trị" (giả định phân bố đều). Sau `ANALYZE` planner tin rằng `status='PENDING'` trả 100.000 dòng nên chọn quét cả bảng, dù thực tế chỉ 200 dòng, đáng ra phải dùng index. Trước `ANALYZE` nó lại dùng index cho cả `DONE` (199.800 dòng), một lựa chọn tồi theo chiều ngược lại. Một kế hoạch "đúng" cần biết **phân bố**, không chỉ trung bình.

PostgreSQL lưu thêm danh sách giá trị phổ biến (MCV) và histogram trong `pg_stats` nên xử lý được ca này; nhưng với các **cột tương quan** (vd `city` và `zip`) nó vẫn giả định độc lập. Phát hiện trong EXPLAIN (output minh họa, định dạng khác theo phiên bản):

```text
Nested Loop  (cost=0.85..120.4 rows=1 width=..) (actual time=0.05..3120.4 rows=250000 loops=1)
```

_Minh họa, chưa chạy thử trong môi trường này._ `rows=1` ước lượng so với `rows=250000` thực tế (lệch 250.000 lần) là dấu hiệu kinh điển; nút Nested Loop được chọn vì tin chỉ có 1 dòng.

**Hỏi xoáy 1:** Nguyên nhân phổ biến nhất khiến kế hoạch đổi?
Vì sao hỏi tiếp: từ hiện tượng "đột ngột" suy ra cái gì đổi, hỏi thẳng nguyên nhân hay gặp nhất.

**Đáp:** Thống kê đổi (autovacuum/`ANALYZE` vừa chạy, hoặc thống kê cũ sau khi nạp/xóa lượng lớn), dữ liệu lệch phân phối, hoặc tham số bind hiếm làm planner chọn generic plan không hợp (prepared statement).

**Hỏi xoáy 2:** Ước lượng lệch 100 lần thì sửa thế nào?
Vì sao hỏi tiếp: đã xác định ước lượng sai thì sửa gốc thế nào trước khi dùng hint.

**Đáp:** `ANALYZE`; tăng `SET STATISTICS` cho cột lệch; với các cột tương quan, tạo extended statistics (`CREATE STATISTICS`). MySQL: `ANALYZE TABLE ... UPDATE HISTOGRAM`. Hết cách mới cân nhắc hint hoặc viết lại truy vấn.

**Hỏi xoáy 3:** Sao không cứ `SET enable_seqscan = off`?
Vì sao hỏi tiếp: ai cũng muốn cách nhanh là ép planner, nên hỏi vì sao đó chưa phải lời giải.

**Đáp:** Nó che triệu chứng và gãy khi dữ liệu đổi; Seq Scan nhiều khi là lựa chọn đúng (điều kiện kém chọn lọc, bảng nhỏ, như ca `DONE` ở trên). Dùng nó để chẩn đoán, không cố định.

**Sai lầm hay gặp:** Thêm index ngay mà chưa xem kế hoạch và ước lượng; có thể index sẽ không được dùng (ca `PENDING` sau `ANALYZE` ở trên).

## 8. Có index `(a, b, c)`. Truy vấn nào dùng được, và `WHERE a = 1 AND b > 5 AND c = 3` tận dụng được đến đâu?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Index `(a, b, c)` sắp xếp các entry theo thứ tự nào? Hình dung nó như danh bạ sắp theo họ, rồi tên đệm, rồi tên.
- Khi nào các giá trị `b` của những entry cần tìm nằm liền nhau trong danh sách? Còn `c`?
- Sau một điều kiện khoảng trên `b`, các giá trị `c` còn nằm liên tục không?

**Lập luận:** Index là danh sách có thứ tự: sắp theo `a`, trong cùng `a` sắp theo `b`, trong cùng `(a,b)` sắp theo `c`. Chỉ khi các cột đứng trước **cố định bằng nhau** thì cột kế tiếp mới nằm liên tục. Với `a=1`, các `b` liền nhau nên `b>5` thu hẹp được thành một đoạn. Nhưng trong đoạn đó có nhiều giá trị `b` khác nhau, và `c=3` nằm rải rác trong mỗi `b`, nên không còn liên tục. Do đó `c` chỉ **lọc tiếp** trên các entry đã duyệt chứ không thu hẹp phạm vi. Đây chính là "tiền tố trái". Điểm dễ nhầm là đặt cột theo thứ tự xuất hiện trong `WHERE` thay vì theo cách index dùng: cột lọc bằng `=` đứng trước, cột khoảng đứng sau, và sau cột khoảng các cột còn lại chỉ lọc tiếp. Khi thiết kế, liệt kê các truy vấn chính, chọn một vài index phục vụ được nhiều nhất, và kiểm tra bằng `EXPLAIN` xem điều kiện nào là điều kiện index (thu hẹp phạm vi) và điều kiện nào là lọc.

**Đáp án ngắn:** Index phục vụ tốt `a`, `a,b`, `a,b,c` và `a=` kèm khoảng trên `b`. Với truy vấn này, `a` và `b` thu hẹp phạm vi, `c` chỉ lọc tiếp.

**Nhớ:** thứ tự sắp xếp quyết định tiền tố trái; cột sau điều kiện khoảng không thu hẹp được. Xem [EXPLAIN và query planner](/go?p=02-Database%2Fhard%2Flt-09-explain-query-planner-tuning.md).

**Ví dụ (sqlite, bảng 50.000 dòng, index `(a,b,c)`):**

```text
WHERE a=1 AND b>5 AND c=3
   -> ['SEARCH t USING INDEX idx_abc (a=? AND b>?)']              <- c không nằm trong điều kiện tìm kiếm
WHERE a=1 AND b=5 AND c=3
   -> ['SEARCH t USING INDEX idx_abc (a=? AND b=? AND c=?)']     <- bằng cả ba: dùng đủ
WHERE a=1 ORDER BY b LIMIT 10
   -> ['SEARCH t USING INDEX idx_abc (a=?)']                      <- không có bước sort
WHERE a=1 ORDER BY c LIMIT 10
   -> ['SEARCH t USING INDEX idx_abc (a=?)', 'USE TEMP B-TREE FOR ORDER BY']   <- phải sort
SELECT a,b,c ... WHERE a=1 AND b=5
   -> ['SEARCH t USING COVERING INDEX idx_abc (a=? AND b=?)']    <- không cần quay lại bảng

entry duyet trong (a=1,b>5) = 4500, sau khi loc c=3 con 642  -> c chi la loc tiep, khong thu hep pham vi
```

_Đã chạy thử (python + sqlite)._ Con số cuối là bằng chứng: engine phải đi qua **4.500** entry rồi mới loại còn **642**. Lưu ý: sqlite còn có _skip-scan_ (với `b=5 AND c=3` nó in `ANY(a)`), còn MySQL/PostgreSQL xử lý khác (kiểm tra lại theo phiên bản); quy tắc tiền tố trái là mô hình an toàn để nhớ.

**Hỏi xoáy 1:** Thứ tự cột nên đặt thế nào?
Vì sao hỏi tiếp: hiểu thứ tự sắp xếp rồi thì suy ra cách đặt thứ tự cột.

**Đáp:** Cột lọc bằng đứng trước, cột khoảng sau, cột phục vụ `ORDER BY` cuối. Với `WHERE a=? ORDER BY b LIMIT k`, index `(a, b)` trả ra đã đúng thứ tự và `LIMIT` dừng sớm, không sort (xem hai dòng `ORDER BY` ở trên).

**Hỏi xoáy 2:** Covering index giúp gì và có giá nào?
Vì sao hỏi tiếp: nếu index chứa đủ cột cần đọc thì có thể bỏ bước nào, và đổi lại gì?

**Đáp:** Trả lời hoàn toàn từ index, bỏ bước quay lại bảng (InnoDB) hoặc đọc heap (PostgreSQL `Index Only Scan`, còn phụ thuộc visibility map sạch). Giá: index to hơn, ghi chậm hơn, tốn memory.

**Hỏi xoáy 3:** Có nên index mọi cột dùng trong `WHERE`?
Vì sao hỏi tiếp: vì index giúp đọc, người ta hay lạm dụng, nên hỏi chi phí phía ghi.

**Đáp:** Không. Mỗi index làm chậm ghi (mỗi INSERT cập nhật mọi index), tốn đĩa và RAM, và cho planner thêm lựa chọn để chọn sai. Mỗi index phải phục vụ một truy vấn đã đo; gỡ index không dùng.

**Sai lầm hay gặp:** Thuộc lòng "tiền tố trái" mà không giải thích được cơ chế thứ tự sắp xếp, và quên rằng cột sau điều kiện khoảng không thu hẹp phạm vi.

## 9. Trang 5 thì nhanh, trang 25.000 thì chậm dù đã có index. Vì sao `OFFSET` sâu chậm, và keyset pagination giải quyết thế nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- `OFFSET n` có "nhảy" thẳng tới dòng thứ n không, hay DB phải đi qua n dòng đầu rồi bỏ đi?
- Chi phí đó tăng theo yếu tố nào, và index có giúp bỏ qua dòng không?
- Nếu thay "bỏ n dòng" bằng "bắt đầu sau key X", DB có thể dùng index để làm gì?

**Lập luận:** `OFFSET n` buộc DB sinh ra rồi bỏ n dòng đầu, nên chi phí tăng tuyến tính theo độ sâu; index chỉ giúp sắp xếp, không giúp bỏ n dòng. Keyset đổi điều kiện thành "key nhỏ hơn key của dòng cuối trang trước", nên DB nhảy thẳng vào đúng vị trí trong index rồi đọc `LIMIT` dòng, chi phí không phụ thuộc độ sâu.

**Đáp án ngắn:** `OFFSET` phải duyệt và bỏ n dòng nên chậm dần khi sâu. Keyset dùng `WHERE (created_at, id) < (?, ?) ORDER BY ... LIMIT 20` với index đúng thứ tự để nhảy thẳng tới vị trí.

**Nhớ:** keyset = điều kiện theo key của dòng cuối trang trước, cần index đúng thứ tự. Xem [EXPLAIN và query planner](/go?p=02-Database%2Fhard%2Flt-09-explain-query-planner-tuning.md).

**Ví dụ (sqlite, 600.000 dòng, trung bình 5 lần chạy):**

```text
OFFSET       0:     0.02 ms
OFFSET    1000:     0.02 ms
OFFSET  100000:     1.26 ms
OFFSET  500000:     6.46 ms
KEYSET (cung vi tri 500000):   0.03 ms
cung ket qua: True
['SEARCH posts USING COVERING INDEX idx_c (created_at<?)']
```

_Đã chạy thử (python + sqlite)._ `OFFSET` tăng gần tuyến tính theo độ sâu (từ 0,02 lên 6,46 ms, tức hơn 300 lần) trong khi keyset giữ ~0,03 ms, và hai cách cho **cùng kết quả**. Trên bảng thật với trang rộng, chênh lệch là giây so với mili-giây. Với MySQL, so sánh row constructor `(a,b) < (?,?)` có thể không dùng index tốt ở một số phiên bản: viết `a < ? OR (a = ? AND id < ?)` và kiểm tra bằng EXPLAIN.

**Hỏi xoáy 1:** Vì sao cần cả `id` trong key sắp xếp?
Vì sao hỏi tiếp: keyset dựa vào thứ tự key, vậy nếu key sắp xếp trùng nhau thì chuyện gì xảy ra?

**Đáp:** `created_at` không duy nhất: trong dữ liệu mẫu ba dòng chung một giây (`599999, 599998, 599997` cùng `1700199999`). Thiếu cột phá hòa, các dòng cùng giá trị bị lặp hoặc bỏ sót giữa hai trang. Key sắp xếp phải **duy nhất và xác định**.

**Hỏi xoáy 2:** Hạn chế của keyset?
Vì sao hỏi tiếp: giải pháp nào cũng có cái giá, hỏi keyset không làm được gì.

**Đáp:** Không nhảy tới trang tùy ý, khó tính tổng số trang; phải có index đúng thứ tự. Đổi lại ổn định khi dữ liệu thay đổi (không lặp/sót khi có dòng chèn mới ở đầu) và latency không đổi theo độ sâu.

**Sai lầm hay gặp:** Chỉ thêm index mà vẫn dùng `OFFSET` lớn: index giúp sắp xếp, không giúp việc bỏ n dòng.

## 10. Hai request cùng đọc số dư 100 rồi cùng trừ 30, cuối cùng số dư là 70 thay vì 40. Làm sao chống lost update?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- "Đọc, tính ở ứng dụng, ghi lại" gồm mấy bước, và giữa chúng transaction khác chen vào được không?
- Nếu dồn phép tính vào một câu lệnh thì ai bảo đảm tính nguyên tử?
- Nếu không dồn được, làm sao DB phát hiện rằng dòng đã bị đổi từ lúc mình đọc (phiên bản, lock)?

**Lập luận:** Ba bước đọc, tính, ghi là tách rời, nên giữa chúng transaction khác có thể ghi xen vào và bị ghi đè: cả hai cùng đọc 100 và cùng ghi 70. Cách chữa tốt nhất là loại bỏ khoảng hở: dồn phép tính vào một câu lệnh để DB thực hiện nguyên tử (`SET balance = balance - 30 WHERE ... AND balance >= 30`). Khi không dồn được, ta để DB phát hiện xung đột bằng cột `version` (optimistic lock) hoặc giữ lock dòng bằng `SELECT ... FOR UPDATE` (pessimistic lock). Điểm dễ nhầm là nghĩ đặt mức isolation cao hơn tự sửa lost update ở mọi DB: ở `READ COMMITTED` nó xảy ra, ở `REPEATABLE READ` PostgreSQL phát hiện xung đột và báo lỗi (cần retry) còn MySQL có thể vẫn cho qua, và `SERIALIZABLE` đắt hơn. Cách ít rủi ro nhất là cập nhật nguyên tử trong một câu, và với logic phức tạp thì optimistic lock kèm retry.

**Đáp án ngắn:** Dùng câu lệnh nguyên tử có điều kiện và kiểm tra số dòng bị ảnh hưởng; nếu không được thì optimistic lock bằng `version`, pessimistic lock `FOR UPDATE`, hoặc isolation cao kèm retry.

**Nhớ:** lost update đến từ read-modify-write tách rời; transaction không tự lock dòng đã đọc. Xem [Lock và deadlock](/go?p=02-Database%2Fhard%2Flt-10-locking-deadlock-database.md).

**Ví dụ (sqlite, số dư 100, mỗi bên trừ 30):**

```text
1) read-modify-write (SAI): hai request cung doc 100, moi ben tru 30
   so du cuoi = 70 (dung phai la 40)
2) cau lenh nguyen tu co dieu kien
   yeu cau 1: dong anh huong=1 OK
   yeu cau 2: dong anh huong=1 OK
   yeu cau 3: dong anh huong=1 OK
   yeu cau 4: dong anh huong=0 TU CHOI (khong du so du)
   so du cuoi = 10
3) khoa lac quan bang version
   A: UPDATE ... WHERE version=0 -> dong anh huong=1 thanh cong
   B: UPDATE ... WHERE version=0 -> dong anh huong=0 XUNG DOT -> doc lai va thu lai
   so du cuoi = (70, 1)
```

_Đã chạy thử (python + sqlite; xen kẽ hai "phiên" tuần tự để tái tạo đúng thứ tự gây lỗi)._ Cách (1): `UPDATE acct SET balance = balance - 30 WHERE id=1 AND balance >= 30`, kiểm tra **số dòng bị ảnh hưởng** (`0` nghĩa là bị từ chối); yêu cầu thứ 4 bị block đúng vì chỉ còn 10. Cách (3): `UPDATE ... WHERE id=? AND version=?`; bên thua nhận `0 dòng` và phải đọc lại. Trong JPA, cột `@Version` làm đúng điều này và ném `OptimisticLockException`.

**Hỏi xoáy 1:** Optimistic lock thất bại thì làm gì, khi nào chọn nó?
Vì sao hỏi tiếp: optimistic lock phát hiện xung đột sau khi xảy ra, nên hỏi lúc thất bại thì xử lý ra sao.

**Đáp:** `0 dòng` nghĩa là xung đột: đọc lại và retry, hoặc báo người dùng (như ví dụ B). Hợp khi tranh chấp thấp hoặc thao tác kéo dài qua nhiều request (người dùng sửa form), vì không giữ lock lúc chờ.

**Hỏi xoáy 2:** `REPEATABLE READ` của PostgreSQL có chặn lost update không?
Vì sao hỏi tiếp: isolation cao hơn có tự bảo vệ được không, để kiểm tra bạn biết mức nào chặn gì.

**Đáp:** Có. Ghi vào dòng mà transaction khác đã sửa và commit sau snapshot sẽ lỗi `serialization_failure`, ứng dụng phải retry. Nhưng nó **không** chặn write skew (câu 11). Ở `READ COMMITTED` của PostgreSQL và MySQL thì không có cơ chế này.

**Hỏi xoáy 3:** `SELECT` kiểm tra tồn kho rồi `UPDATE` ở `READ COMMITTED` sai ở đâu?
Vì sao hỏi tiếp: đây là biến thể thực tế nhất của lost update (kiểm tra rồi mới sửa).

**Đáp:** `SELECT` thường không lock nên hai request cùng thấy "còn hàng" rồi cùng trừ (đúng ca 1 ở trên). Gộp thành một câu lệnh có điều kiện, hoặc `SELECT ... FOR UPDATE`, hoặc `@Version`.

**Sai lầm hay gặp:** Tin rằng bọc trong `@Transactional` là đủ an toàn; transaction không tự lock dòng đã đọc.

## 11. Hai bác sĩ cùng xin nghỉ trực, mỗi người đều thấy còn đủ người, nhưng kết quả là không còn ai trực. Đó là hiện tượng gì và chặn thế nào?

**Gợi ý suy luận:**
- Snapshot isolation phát hiện xung đột ghi-ghi trong trường hợp nào (cùng một dòng bị ghi hai lần)?
- Nếu hai transaction ghi vào hai dòng khác nhau, DB có thấy xung đột không?
- Muốn DB thấy xung đột, ta phải làm cho hai bên ghi vào cái gì chung?

**Lập luận:** Cơ chế phát hiện xung đột của snapshot isolation chỉ thấy khi hai transaction ghi **cùng một dòng**. Ở đây mỗi bên đọc cùng điều kiện "còn 2 người trực" trên snapshot của mình rồi ghi dòng của chính mình, nên không dòng nào bị ghi hai lần và DB không thấy gì, nhưng cùng nhau họ phá ràng buộc chung: đó là **write skew**. Để chặn, hoặc dùng `SERIALIZABLE` để DB theo dõi phụ thuộc đọc-ghi, hoặc ép cả hai cùng ghi một dòng đại diện để biến nó thành xung đột ghi-ghi. Điểm dễ nhầm là nghĩ Repeatable Read (snapshot) ngăn mọi dị thường: write skew chỉ lộ khi ràng buộc liên quan nhiều dòng như "ít nhất một người trực". Khi review, tìm các quy tắc kiểu tổng, số lượng, hoặc "không trùng khoảng thời gian" được kiểm tra trong code rồi ghi, và bảo vệ chúng bằng `SERIALIZABLE` kèm retry, lock dòng đại diện hoặc exclusion constraint ở DB.

**Đáp án ngắn:** Đó là write skew: hai transaction đọc cùng điều kiện và ghi hai dòng khác nhau, nên không bị phát hiện. Chặn bằng `SERIALIZABLE` kèm retry, hoặc lock/ghi một dòng đại diện chung, hoặc constraint.

**Nhớ:** `REPEATABLE READ` (snapshot) non-blocking write skew; chỉ `SERIALIZABLE` hoặc xung đột tường minh mới chặn. Xem [Lock và deadlock](/go?p=02-Database%2Fhard%2Flt-10-locking-deadlock-database.md).

**Ví dụ (mô phỏng snapshot isolation):**

```text
sau khi ca hai commit: {'alice': 'off', 'bob': 'off'} | so nguoi truc = 0 <- vi pham rang buoc >=1
co dong guard: alice -> commit
co dong guard: bob   -> XUNG DOT ghi-ghi tren dong guard -> retry/abort
so nguoi truc = 1
```

_Đã chạy thử (python, mô phỏng)._ Dòng đầu: mỗi transaction kiểm tra "còn ≥ 2 người" trên snapshot của mình rồi ghi dòng của chính mình, nên cả hai thành công. Cách chặn ở hai dòng sau: bắt cả hai cùng cập nhật một dòng **đại diện** (`guard`), biến nó thành xung đột ghi-ghi; bên đến sau phải retry và thấy lại điều kiện mới.

```sql
-- PostgreSQL: exclusion/serializable
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) FROM doctors WHERE on_call;       -- cả hai cùng thấy 2
UPDATE doctors SET on_call=false WHERE name='alice';
COMMIT;   -- một trong hai bị hủy với lỗi 40001, ứng dụng retry
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Mức isolation nào chặn được?
Vì sao hỏi tiếp: biết DB không thấy xung đột thì hỏi tầng isolation nào bắt được.

**Đáp:** `SERIALIZABLE`. PostgreSQL dùng SSI: theo dõi phụ thuộc đọc-ghi và hủy một transaction với lỗi `40001`. MySQL biến `SELECT` thành `FOR SHARE`, chặn bằng lock. Cả hai cần ứng dụng retry.

**Hỏi xoáy 2:** Nếu không muốn dùng `SERIALIZABLE`?
Vì sao hỏi tiếp: `SERIALIZABLE` có giá, nên hỏi phương án thay thế ở mức ứng dụng.

**Đáp:** Lock tường minh một dòng đại diện (ví dụ dòng của ca trực, như `guard` ở trên), hoặc đưa ràng buộc vào constraint/bảng mà cả hai cùng phải ghi, hoặc dùng exclusion constraint (PostgreSQL).

**Sai lầm hay gặp:** Nghĩ `REPEATABLE READ` là "an toàn như tuần tự"; hậu quả là ràng buộc nghiệp vụ bị phá lặng lẽ, rất khó tái hiện.

## 12. Hai session cùng `SELECT ... FOR UPDATE` một id chưa tồn tại rồi cùng INSERT, một bên bị deadlock. Gap lock và next-key lock của InnoDB là gì?

**Gợi ý suy luận:**
- Để `REPEATABLE READ` không bị phantom (dòng mới hiện ra giữa hai lần đọc), InnoDB phải ngăn việc gì?
- Khoảng chưa có dòng nào thì lock cái gì được (khoảng giữa các entry của index)?
- Hai gap lock của hai transaction có xung đột nhau không, và chúng chặn thao tác nào?

**Lập luận:** Muốn không có phantom, InnoDB phải ngăn **chèn vào khoảng** đã quét, chứ không chỉ lock dòng đang tồn tại. Khoảng chưa có dòng nên nó lock **khoảng giữa các entry của index** (gap). Gap lock chỉ ngăn chèn nên hai transaction có thể cùng giữ gap lock trên một khoảng mà không chờ nhau. Nhưng rồi cả hai cùng INSERT vào khoảng đó thì mỗi bên chờ gap lock của bên kia: chu trình chờ, tức deadlock. Điểm dễ nhầm là nghĩ `SELECT ... FOR UPDATE` trên key không tồn tại thì không lock gì: ở `REPEATABLE READ` InnoDB vẫn lấy gap lock, và hai transaction cùng lấy rồi cùng chèn sẽ tự deadlock. Cách tránh: dùng `INSERT ... ON DUPLICATE KEY` hoặc `INSERT ... ON CONFLICT` một câu, hạ xuống `READ COMMITTED` khi chấp nhận phantom, hoặc dựa vào ràng buộc UNIQUE thay vì kiểm tra rồi chèn.

**Đáp án ngắn:** Record lock lock một entry, gap lock lock khoảng trống (chỉ ngăn chèn), next-key lock là record cộng gap trước nó, mặc định ở `REPEATABLE READ`. Hai bên cùng giữ gap lock rồi cùng chèn vào khoảng sẽ deadlock.

**Nhớ:** InnoDB lock trên index, có cả lock khoảng để chặn phantom. Xem [Lock và deadlock](/go?p=02-Database%2Fhard%2Flt-10-locking-deadlock-database.md).

**Ví dụ (id 10 và 20 tồn tại, id 15 chưa có):**

| Bước | Session A | Session B |
|---|---|---|
| 1 | `BEGIN; SELECT * FROM t WHERE id=15 FOR UPDATE;` (giữ gap lock `(10,20)`) | |
| 2 | | `BEGIN; SELECT * FROM t WHERE id=15 FOR UPDATE;` (cũng giữ gap lock `(10,20)`, không chờ) |
| 3 | `INSERT INTO t(id) VALUES(15);` → **chờ** gap lock của B | |
| 4 | | `INSERT INTO t(id) VALUES(15);` → **chờ** gap lock của A |
| 5 | | InnoDB phát hiện chu trình chờ, rollback một bên, báo lỗi **1213** |

_Minh họa, chưa chạy thử trong môi trường này (không có MySQL); đây là kịch bản thường gặp, kiểm tra lại theo phiên bản và cấu hình._ Phần "phát hiện chu trình chờ" là một bài toán đồ thị đơn giản (mô phỏng):

```text
do thi cho: {'T1': ['T2'], 'T2': ['T1'], 'T3': ['T1']}
chu trinh: ['T1', 'T2', 'T1'] -> DB rollback mot giao dich (nan nhan), vd giao dich re hon de rollback
chuoi cho khong chu trinh: None -> chi cho den khi T2 commit hoac timeout
```

_Đã chạy thử (python)._ Lưu ý T3 chỉ **chờ** T1 chứ không nằm trong chu trình, nên không bị chọn làm nạn nhân.

**Hỏi xoáy 1:** Làm sao giảm loại deadlock này?
Vì sao hỏi tiếp: nguyên nhân là kiểm tra rồi chèn trên khoảng chung, nên hỏi cách bỏ kịch bản đó.

**Đáp:** Dùng `INSERT ... ON DUPLICATE KEY UPDATE`/unique constraint thay vì "kiểm tra rồi chèn"; hạ xuống `READ COMMITTED` nếu nghiệp vụ cho phép (gap lock phần lớn tắt); hoặc retry khi gặp lỗi 1213.

**Hỏi xoáy 2:** Thiếu index trên cột `WHERE` của một `UPDATE` thì sao?
Vì sao hỏi tiếp: lock nằm trên index, vậy không có index thì lock trải rộng đến đâu?

**Đáp:** InnoDB phải quét và lock mọi entry đã duyệt, thực tế gần như lock cả bảng; một câu `UPDATE` trông vô hại chặn mọi ghi khác. Lock nằm trên **index**, không phải trên "dòng" trừu tượng.

**Hỏi xoáy 3:** Vì sao gap lock có thể làm tăng deadlock khi chuyển từ `READ COMMITTED` lên `REPEATABLE READ`?
Vì sao hỏi tiếp: hỏi ngược lại để xem bạn gắn deadlock với mức isolation.

**Đáp:** Ở `REPEATABLE READ` mặc định của InnoDB, nhiều câu đọc-có-lock lấy next-key lock phủ cả khoảng, nên nhiều transaction giữ khoảng chồng nhau rồi cùng chèn (kịch bản ở trên). `READ COMMITTED` chủ yếu chỉ lock record.

**Sai lầm hay gặp:** Chỉ nói "lock dòng" mà không biết lock nằm trên index và có loại lock khoảng.

## 13. Log báo lỗi deadlock (1213 hoặc `40P01`) lúc cao điểm. Làm sao đọc và xử lý?

**Gợi ý suy luận:**
- Deadlock là gì về mặt đồ thị chờ, và vì sao các bên không tự thoát được?
- Khi mọi thread lấy lock theo cùng một thứ tự thì có thể có chu trình không?
- Phía ứng dụng, khi DB hy sinh một transaction thì phải làm gì?

**Lập luận:** Deadlock là chu trình chờ nhau, không bên nào tự thoát, nên DB buộc phải rollback một transaction làm nạn nhân. Vì vậy nó là hiện tượng bình thường dưới tải, và ứng dụng đúng là **retry cả transaction**. Gốc của chu trình là **thứ tự lấy lock không nhất quán** giữa các thread; nếu mọi người lấy theo cùng thứ tự (ví dụ id nhỏ trước) thì chu trình không thể hình thành. Để tìm ra chu trình thật cần đọc log chẩn đoán của DB. Điểm dễ nhầm là coi deadlock là bug phải loại bỏ hoàn toàn, hoặc retry mà không giới hạn. Ở hệ thống có tải, nên có retry giới hạn kèm backoff, giữ thứ tự lấy lock thống nhất, transaction ngắn, và bảo đảm truy vấn có index đúng để lock ít dòng nhất (không có index thì lock lan rộng và tăng xác suất deadlock).

**Đáp án ngắn:** Đọc `LATEST DETECTED DEADLOCK` (MySQL) hoặc `log_lock_waits`, `pg_locks` (PostgreSQL) để tìm thứ tự lock lệch nhau; chữa bằng chuẩn hóa thứ tự lấy lock, giữ transaction ngắn, và retry khi gặp lỗi.

**Nhớ:** deadlock = chu trình chờ; phá chu trình bằng thứ tự lock nhất quán, và luôn có retry. Xem [Lock và deadlock](/go?p=02-Database%2Fhard%2Flt-10-locking-deadlock-database.md).

**Ví dụ (Java 11):** hai chuyển khoản ngược chiều 1→2 và 2→1; một bên lock theo (from, to), bên kia theo id tăng dần:

```text
khoa theo thu tu tu nhien (from, to): T1=DEADLOCK (cho khoa 2 qua 1s) | T2=DEADLOCK (cho khoa 1 qua 1s)
khoa theo thu tu id tang dan: T1=OK | T2=OK
```

_Đã chạy thử (Java 11, `ReentrantLock.tryLock` có timeout để mô phỏng việc chờ)._ Cùng hai thao tác, chỉ đổi **thứ tự lấy lock** (luôn id nhỏ trước) là hết deadlock vì không thể có chu trình khi mọi người đều lấy theo cùng một thứ tự. Trong SQL: sắp xếp danh sách ID trước khi cập nhật hàng loạt (`ORDER BY id` trong `SELECT ... FOR UPDATE`).

Phản hồi của ứng dụng khi gặp deadlock (Spring):

```java
@Retryable(retryFor = {CannotAcquireLockException.class, DeadlockLoserDataAccessException.class},
           maxAttempts = 3, backoff = @Backoff(delay = 50, multiplier = 2))
@Transactional
public void transfer(long from, long to, BigDecimal amount) { ... }
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Hai nguyên nhân hàng đầu và cách chữa?
Vì sao hỏi tiếp: đọc được log rồi thì cần biết các nguyên nhân gốc thường gặp để chữa tận gốc.

**Đáp:** Thứ tự truy cập khác nhau giữa các business flow (chuẩn hóa thứ tự lock, như ví dụ Java); và transaction quá dài hoặc thiếu index làm key quá nhiều dòng.

**Hỏi xoáy 2:** Deadlock khác "chờ lock quá lâu" thế nào?
Vì sao hỏi tiếp: hai hiện tượng đều là "chờ lock" nhưng khác bản chất, dễ nhầm khi chẩn đoán.

**Đáp:** Deadlock là chu trình, DB tự phá ngay. Chờ quá lâu là chuỗi chờ **không chu trình** (một transaction giữ lock lâu), chỉ kết thúc bằng timeout (`innodb_lock_wait_timeout`, mặc định 50 giây) hoặc khi người giữ commit; thường do transaction chạy lâu hoặc quên commit.

**Sai lầm hay gặp:** Không có retry, để lỗi deadlock trả thẳng ra người dùng.

## 14. Người dùng vừa sửa hồ sơ xong, tải lại trang vẫn thấy dữ liệu cũ vì đọc từ replica. Giải quyết thế nào?

**Gợi ý suy luận:**
- Replication async nghĩa là bản ghi tới replica vào lúc nào so với lúc commit trên primary?
- Trong khoảng trễ đó, đọc từ replica vi phạm tính chất nào (read-your-writes)?
- Để chọn đúng nơi đọc, ứng dụng cần biết thông tin gì về vị trí log (GTID, LSN)?

**Lập luận:** Bản ghi trên primary đến replica sau một khoảng trễ, nên đọc từ replica trong khoảng đó thấy dữ liệu cũ dù hệ thống "hoạt động đúng". Muốn đọc được thứ mình vừa ghi, ứng dụng phải **biết** mình đã ghi đến vị trí log nào, rồi chỉ đọc từ nơi đã đạt vị trí đó. Nếu replica chưa đạt thì đọc primary. Cách thô hơn là sau khi ghi thì đọc primary vài giây. Điểm dễ nhầm là chỉ đọc từ replica cho mọi truy vấn vì "scale đọc", rồi gặp lỗi chỉ lộ ở người dùng vừa ghi. Hãy phân loại đường đọc: đọc cần nhất quán với chính người dùng thì dùng read-your-writes (theo GTID/LSN hoặc đọc primary trong vài giây), đọc báo cáo chịu trễ được thì replica, và theo dõi replication lag làm chỉ số cảnh báo.

**Đáp án ngắn:** Lấy vị trí log sau khi ghi (GTID hoặc LSN) và chỉ cho replica phục vụ khi đã áp dụng đến vị trí đó, nếu không thì đọc primary; truy vấn cần nhất quán mạnh thì đọc thẳng primary.

**Nhớ:** replica async có lag nên cần read-your-writes theo vị trí log. Xem [Replication, partition, vận hành](/go?p=02-Database%2Fhard%2Flt-11-replication-partition-van-hanh.md).

**Ví dụ (mô phỏng):**

```text
primary LSN=1, replica da ap dung den LSN=0 (lag)
doc thang tu replica -> None   <- du lieu CU (None)
doc co min_lsn = 1 -> primary (replica chua dat LSN 1): ('ten moi', 1)
sau khi replica duoi kip (applied=1) -> replica: ('ten moi', 1)
```

_Đã chạy thử (python, mô phỏng)._ Quy tắc `if replica.applied >= min_lsn then đọc replica else đọc primary` cho đúng kết quả mà vẫn đẩy đa số lượt đọc sang replica. Với PostgreSQL, `pg_current_wal_lsn()` trên primary và `pg_last_wal_replay_lsn()` trên replica cho hai giá trị cần so (kiểm tra lại cú pháp theo phiên bản).

**Hỏi xoáy 1:** Replication đồng bộ có giải quyết được không và giá nào?
Vì sao hỏi tiếp: nguyên nhân là async, vậy đổi sang đồng bộ thì sao?

**Đáp:** Bán đồng bộ/đồng bộ khiến commit đợi replica xác nhận, giảm hoặc loại mất dữ liệu khi primary chết (RPO thấp) và có thể giúp nhất quán, nhưng cộng một vòng mạng vào latency ghi, và nếu replica đồng bộ chậm hoặc chết có thể treo ghi tùy cấu hình.

**Hỏi xoáy 2:** Vì sao `Seconds_Behind_Source` không đáng tin tuyệt đối?
Vì sao hỏi tiếp: ta đo lag để quyết định đọc ở đâu, nên hỏi số đo đó đáng tin đến mức nào.

**Đáp:** Nó đo theo timestamp của event đang áp dụng, nên có thể về 0 khi queue còn nhiều hoặc sai khi tải ghi dồn cục; dùng thêm bảng heartbeat để đo latency thực.

**Sai lầm hay gặp:** Coi replica là nơi đọc mọi thứ mà không phân loại truy vấn cần nhất quán (màn hình sau khi sửa hồ sơ, số dư sau chuyển tiền).

## 15. Primary không liên lạc được, hệ thống tự promote replica, rồi primary cũ hóa ra vẫn sống và hai bên cùng nhận ghi. Split-brain xảy ra thế nào và phòng ra sao?

**Gợi ý suy luận:**
- Qua mạng, "primary đã chết" và "primary chỉ không liên lạc được" có phân biệt được không?
- Nếu hai nơi cùng nhận ghi thì dữ liệu hai bên có hợp nhất tự động được không?
- Làm sao đảm bảo chỉ một bên được quyền ghi (đa số, fencing)?

**Lập luận:** Không phân biệt được hai tình huống trên, nên nếu promote replica khi primary vẫn sống thì **hai nơi cùng nhận ghi** và dữ liệu phân kỳ, không có cách hợp nhất an toàn. Vì vậy phải bảo đảm hai điều: quyền làm primary chỉ trao cho **đa số** (hai nhóm tách rời không thể cùng đạt đa số vì hai đa số luôn giao nhau), và kẻ cũ phải bị **fencing** để dù vẫn nghĩ mình là primary cũng không ghi được nữa. Điểm dễ nhầm là nghĩ failover tự động chỉ là "promote nhanh": phần khó là chắc chắn primary cũ không còn ghi (fencing) và tránh quyết định khi chỉ mất liên lạc tạm thời. Khi thiết kế, dùng bộ điều phối có đa số (Patroni với etcd, orchestrator, nhóm Raft), số node lẻ, và có quy trình cho dữ liệu primary cũ đã ghi mà chưa tới replica (reconcile hoặc loại bỏ có kiểm soát).

**Đáp án ngắn:** Split-brain do promote khi primary cũ vẫn sống. Phòng bằng bầu primary theo đa số (consensus/lease), fencing primary cũ trước khi promote, và số node lẻ hoặc witness.

**Nhớ:** không phân biệt được chết với mất liên lạc, nên cần đa số và fencing. Xem [Replication, partition, vận hành](/go?p=02-Database%2Fhard%2Flt-11-replication-partition-van-hanh.md).

**Ví dụ (mô phỏng fencing bằng epoch; kho lưu trữ từ chối ghi của epoch cũ):**

```text
primary epoch=1 ghi 'a': ghi
-- mang bi cat; failover: replica len primary voi epoch=2 --
primary moi epoch=2 ghi 'b': ghi
primary cu (van tuong minh la primary) ghi 'c' voi epoch=1: TU CHOI (epoch 1 < 2): primary cu bi chan
log: [(1, 'a'), (2, 'b')]
3 node: can da so 2; hai nhom tach khong the cung dat da so (vi 2*2 > 3)
5 node: can da so 3; hai nhom tach khong the cung dat da so (vi 3*2 > 5)
```

_Đã chạy thử (python, mô phỏng)._ Hai ý: (1) epoch/fencing token làm kẻ cũ **không thể** gây hại dù nó vẫn "nghĩ" mình là primary; (2) đa số cho đảm bảo hai phân vùng mạng không thể cùng bầu primary (vì hai đa số luôn giao nhau).

**Hỏi xoáy 1:** Sau failover, primary cũ quay lại thì sao?
Vì sao hỏi tiếp: fencing chặn ghi, nhưng primary cũ có thể còn dữ liệu chưa sang replica nên hỏi xử lý sau đó.

**Đáp:** Không được tự làm primary. Nó có thể chứa transaction chưa sang replica nên phải cấu hình lại làm replica (PostgreSQL thường dùng `pg_rewind` để đưa về điểm phân kỳ) và các transaction dư phải đối chiếu hoặc bỏ.

**Hỏi xoáy 2:** Ứng dụng cần chuẩn bị gì cho failover?
Vì sao hỏi tiếp: failover vẫn làm đứt kết nối và transaction đang chạy, ứng dụng phải chịu được.

**Đáp:** Timeout kết nối ngắn, retry có backoff, kết nối lại sau khi chuyển, và idempotency vì transaction đang chạy lúc chuyển mất, kết quả không rõ (đã commit hay chưa).

**Sai lầm hay gặp:** Cấu hình failover tự động nhưng không có fencing; hậu quả là hai primary cùng ghi.

## 16. Cần thêm cột hoặc đổi kiểu cột trên bảng 500 triệu dòng mà không downtime. `ALTER` chỉ chạy vài giây mà cả hệ thống vẫn đứng. Vì sao và làm sao?

**Gợi ý suy luận:**
- `ALTER TABLE` cần loại lock metadata nào, và muốn lấy nó thì phải chờ ai?
- Trong lúc `ALTER` đang chờ, các truy vấn mới đến sau xếp hàng thế nào (FIFO)?
- Với thay đổi lớn, có cách nào làm từng bước mà code cũ và mới đều chạy được (expand rồi contract)?

**Lập luận:** `ALTER` cần lock metadata độc quyền, nhưng muốn lấy nó phải chờ mọi truy vấn đang giữ lock xung đột. Trong lúc chờ, queue lock là FIFO nên **mọi truy vấn mới phía sau cũng xếp hàng sau nó**: một truy vấn dài vô tình khiến `ALTER` "nhanh" chặn cả hệ thống. Vì thế phải để DDL thất bại nhanh (`lock_timeout`) và retry. Với thay đổi lớn thì chia bước tương thích hai chiều: thêm cột mới, ghi cả hai, backfill theo batch, chuyển đọc, rồi mới xóa cột cũ. Điểm dễ nhầm là nghĩ DDL "chạy vài giây là an toàn": vấn đề là thời gian chờ lấy lock chứ không phải thời gian chạy, và một truy vấn dài hay `idle in transaction` làm cả queue đứng. Khi chạy migration, đặt `lock_timeout` ngắn kèm retry, kiểm tra không có transaction dài, chạy lúc tải thấp, dùng công cụ online cho thay đổi nặng, và theo dõi replica lag trong lúc backfill.

**Đáp án ngắn:** Dùng thao tác online (`INSTANT`, thêm cột mặc định hằng số ở PostgreSQL 11+, gh-ost/pt-osc, cột mới kèm backfill theo batch), đặt `lock_timeout` ngắn, tránh chạy khi có truy vấn dài, theo dõi replica lag.

**Nhớ:** nguy hiểm nằm ở việc chờ lock, không phải thời gian chạy; migration phải tương thích hai chiều. Xem [Replication, partition, vận hành](/go?p=02-Database%2Fhard%2Flt-11-replication-partition-van-hanh.md).

**Ví dụ (tính bằng python):** truy vấn báo cáo chạy 30 giây đang giữ lock chia sẻ; `ALTER` xin lock độc quyền; hệ thống nhận 200 truy vấn/giây:

```text
  200 truy van/s x 30s = 6,000 truy van xep hang sau ALTER (ke ca SELECT don gian)
  voi lock_timeout=2s: ALTER that bai sau 2s, chi ~ 400 truy van bi tre roi giai phong
```

_Đã chạy thử (python, phép tính đơn giản hóa)._ Kịch bản thật:

```sql
-- PostgreSQL: DDL thất bại nhanh thay vì xếp hàng 30 giây
SET lock_timeout = '2s';
-- PG 11+: không viết lại bảng
ALTER TABLE orders ADD COLUMN channel text DEFAULT 'web';
-- thất bại thì thử lại sau; thành công thì xong gần như tức thì
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao `ALTER` "nhanh" vẫn làm sập hệ thống?
Vì sao hỏi tiếp: kiểm tra bạn hiểu cơ chế queue lock chứ không chỉ nhớ cách phòng.

**Đáp:** Đúng như tính ở trên: nó nhanh khi **đã có lock**, nhưng việc **chờ** lock mới là phần nguy hiểm vì chặn mọi truy vấn đến sau. Phòng bằng `lock_timeout` để DDL thất bại nhanh và retry, và tránh chạy DDL khi có truy vấn dài.

**Hỏi xoáy 2:** Thêm `NOT NULL` hoặc foreign key lên bảng lớn?
Vì sao hỏi tiếp: các thay đổi ràng buộc cũng cần lock, hỏi cách chia nhỏ.

**Đáp:** PostgreSQL: `ADD CONSTRAINT ... NOT VALID` (lock nhẹ, chỉ áp cho dữ liệu mới) rồi `VALIDATE CONSTRAINT` riêng; `CREATE INDEX CONCURRENTLY` cho index. Backfill theo batch nhỏ, ngủ giữa lô, đo replica lag.

**Hỏi xoáy 3:** Có bao giờ đổi tên cột trong một bước không?
Vì sao hỏi tiếp: đổi tên là ca điển hình của thay đổi không tương thích hai chiều.

**Đáp:** Không an toàn khi nhiều phiên bản ứng dụng chạy parallel. Thêm cột mới, ghi cả hai, backfill, chuyển đọc, rồi mới xóa cột cũ ở lần phát hành sau.

**Sai lầm hay gặp:** Chạy `ALTER TABLE` trực tiếp trên production giờ cao điểm vì "chỉ là thêm cột".

## 17. Ứng dụng báo timeout lấy kết nối, đồng nghiệp đề nghị tăng pool lên 200 nhưng database CPU vẫn rảnh. Pool nên cỡ bao nhiêu, vì sao nhiều hơn chưa chắc nhanh hơn?

**Gợi ý suy luận:**
- Database thực sự chạy parallel ở mức nào (số core, số ổ đĩa)? Vượt mức đó thêm kết nối sinh ra chi phí gì?
- Số kết nối đang dùng liên hệ thế nào với throughput và thời gian giữ kết nối (định luật Little)?
- Thời gian giữ kết nối bị yếu tố nào làm phình (HTTP trong transaction, truy vấn chậm, rò rỉ)?

**Lập luận:** DB chỉ chạy parallel thật ở mức số core và ổ đĩa; vượt mức đó, thêm kết nối chỉ thêm chuyển ngữ cảnh và tranh chấp, làm mọi truy vấn chậm đi. Theo định luật Little, số kết nối đang dùng bằng throughput nhân thời gian giữ kết nối, nên biến quan trọng nhất là **thời gian giữ**. Khi pool cạn mà DB còn rảnh thì thủ phạm là transaction giữ kết nối quá lâu, không phải thiếu kết nối; tăng pool chỉ chuyển nút thắt sang database. Điểm dễ nhầm là nghĩ pool càng lớn càng chịu tải tốt: DB chỉ có vài core và một số ổ đĩa, nên quá nhiều kết nối đồng thời tranh nhau thành chậm hơn cho tất cả. Hãy đo thời gian giữ kết nối, đặt pool khoảng vài chục kết nối mỗi instance, tính tổng mọi instance so với `max_connections`, và dùng bộ gom kết nối (PgBouncer) khi số instance lớn.

**Đáp án ngắn:** Điểm xuất phát khoảng `(core × 2) + số ổ đĩa hiệu dụng` rồi đo; thường vài chục kết nối mỗi instance. Pool cạn mà DB rảnh thì rút ngắn transaction (đừng gọi HTTP bên trong), đừng chỉ tăng pool.

**Nhớ:** kết nối cần = throughput × thời gian giữ; nhiều kết nối hơn số core là chuyển ngữ cảnh. Xem [Replication, partition, vận hành](/go?p=02-Database%2Fhard%2Flt-11-replication-partition-van-hanh.md).

**Ví dụ (python, phép tính):**

```text
Pool: Little's law  ket noi dang dung = throughput x thoi gian giu ket noi
  2000 req/s x 20ms giu ket noi = 40 ket noi dong thoi
  2000 req/s x 300ms giu ket noi = 600 ket noi dong thoi

Pool 20 ket noi: throughput toi da = pool / thoi gian giu
  transaction chi chay SQL (50ms): 400 req/s
  transaction co goi HTTP ben trong (50ms SQL + 250ms HTTP): 67 req/s

50 instance x pool 20 = 1000 ket noi toi database (PostgreSQL mac dinh max_connections=100)
cong thuc khoi diem: cores*2 + dia = 17 ket noi cho DB 8 core, 1 dia hieu dung
```

_Đã chạy thử (python, phép tính)._ Bài học: gọi HTTP trong transaction làm **throughput tối đa từ 400 xuống 67 req/s** mà database vẫn rảnh; phản xạ "tăng pool" chỉ chuyển nút thắt sang database.

**Hỏi xoáy 1:** Hệ quả khi ứng dụng scale ngang lên 50 instance?
Vì sao hỏi tiếp: pool tính theo từng instance, nên scale ngang nhân tổng kết nối lên.

**Đáp:** Tổng kết nối = instance × pool = 1.000 ở ví dụ, vượt xa mức DB chịu nổi; cần giảm pool từng instance và/hoặc đặt pooler trung gian (PgBouncer, ProxySQL). Riêng PostgreSQL mỗi kết nối là một process nên càng cần pooler.

**Hỏi xoáy 2:** Triệu chứng của pool cạn và cách phân biệt với database chậm?
Vì sao hỏi tiếp: biết công thức rồi thì hỏi cách nhận diện trên hệ thống thật.

**Đáp:** Thread ứng dụng chờ `getConnection` (timeout) trong khi CPU/I/O database vẫn thấp: thủ phạm là transaction giữ kết nối quá lâu (HTTP trong transaction, truy vấn chậm, rò rỉ kết nối), không phải thiếu kết nối. Xem số kết nối `active`/`pending` của pool và `pg_stat_activity`/`SHOW PROCESSLIST`.

**Sai lầm hay gặp:** Cứ tăng `maximumPoolSize` mỗi khi gặp lỗi timeout; hậu quả là làm nghẽn database và che nguyên nhân gốc là transaction quá dài.

## Cách luyện câu hỏi hỏi xoáy

1. Che phần **Lập luận**, **Đáp án ngắn** và **Đáp**, chỉ đọc câu hỏi và **Gợi ý suy luận**, tự suy ra đáp án thành tiếng cả chuỗi.
2. Mở đầu bằng chuỗi nhân quả (vì sao cơ chế tồn tại), rồi mới nêu cấu hình.
3. Với mỗi cơ chế, chuẩn bị một **dòng thời gian hai transaction** (A/B) hoặc một con số tính tay để minh họa.
4. Nêu **đánh đổi** (ghi nhanh với đọc nhanh, nhất quán với sẵn sàng, không gian với tốc độ).
5. Với điều phụ thuộc phiên bản (skip scan, `INSTANT`, prepared statement của PgBouncer, các giá trị mặc định), nêu rõ "tùy phiên bản" và kiểm tra tài liệu chính thức.

Nguồn: tài liệu chính thức MySQL và PostgreSQL, kiểm tra ngày 2026-10-21.

