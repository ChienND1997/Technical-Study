# Câu hỏi: Redis chuyên sâu (hỏi xoáy)

Kiến thức gốc: [Redis tổng quan](/go?p=06-Distributed-Systems%2FRedis%2Feasy%2Flt-01-redis-tong-quan-cau-truc-du-lieu.md), [Persistence, Replication, Eviction](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-02-persistence-replication-eviction.md), [Cache pattern](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-03-cache-pattern-van-de-cache.md), [Redis bên trong, Sentinel, Cluster](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-04-redis-noi-bo-cluster-sentinel.md), [Distributed lock, Lua, Streams](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-05-distributed-lock-lua-streams.md).

Cách dùng: đọc **Câu hỏi**, tự trả lời các câu nhỏ trong **Gợi ý suy luận** để nhớ ra khái niệm nền, rồi tự dựng **Lập luận** trước khi đối chiếu với bài. Sau đó nói **Đáp án ngắn** thành tiếng, xem ví dụ, đọc dòng **Nhớ**, và đi qua từng **Hỏi xoáy** (mỗi câu có dòng "Vì sao hỏi tiếp" giải thích vì sao nó là bước kế tiếp). Người phỏng vấn senior thường dừng ở câu xoáy thứ hai hoặc thứ ba để xem bạn hiểu cơ chế hay chỉ nhớ thuộc.

**Về các ví dụ trong bài:** sandbox soạn bài **không có Redis server**, nên các đoạn `redis-cli` và script Lua là **minh họa** (hành vi theo tài liệu Redis, chưa chạy ở đây). Phần **đã chạy thật** là các mô phỏng và phép tính bằng Python/Java: tính hash slot bằng CRC16, Bloom filter, LRU lấy mẫu, kịch bản xen kẽ cache và lock, single-flight, cửa sổ rate limit. Mỗi ví dụ ghi rõ "đã chạy" hoặc "minh họa". Các mô phỏng dùng `dict` giả lập DB/cache và đồng hồ giả, chúng chứng minh **logic của kịch bản**, không đo hiệu năng của Redis thật.

**Tóm tắt:**

- Phạm vi file: Redis chuyên sâu, mỗi câu đi từ một sự cố hoặc giới hạn của Redis tới cơ chế gây ra nó.
- Redis nhanh nhờ dữ liệu trong RAM và thực thi lệnh tuần tự trên một thread (không lock), nhưng một lệnh chậm hay big key chặn mọi client.
- Độ bền do tần suất `fsync` quyết định (RDB mất từ lần chụp cuối, AOF `everysec` mất khoảng 1 giây); replication là bất đồng bộ nên failover có thể mất ghi đã OK.
- Key hết hạn xóa bị động và chủ động, còn eviction chỉ chạy khi chạm `maxmemory`; `MULTI/EXEC` không cho đọc rẽ nhánh, nên "đọc rồi quyết định rồi ghi" cần Lua.
- Cache: ghi DB trước rồi xóa cache kèm TTL; penetration, breakdown, avalanche là ba nguyên nhân khác nhau cần ba cách chữa; hot key và big key không giải bằng thêm node.
- Lock Redis cần token ngẫu nhiên và gỡ nguyên tử, nhưng vẫn không đúng đắn khi tiến trình bị dừng quá TTL, nên cần fencing hoặc ràng buộc ở DB; Cluster chia 16384 slot, lệnh nhiều key cần hash tag.
- Hay bị hỏi xoáy nhất: "Redis một thread mà vẫn nhanh", `SET NX PX` còn thiếu gì, và tranh luận Redlock của Kleppmann với antirez.

## 1. Redis chạy một thread, vì sao vẫn nhanh?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Redis xử lý lệnh trên một thread, vậy mà đạt hàng trăm nghìn lệnh mỗi giây. Vì sao không chậm? Và khi nào nó thật sự chậm?

**Gợi ý suy luận:**
- Một lệnh trên dữ liệu đã nằm trong RAM mất cỡ bao lâu, và có phải chờ đĩa hay chờ lock không?
- Nếu thêm thread để thực thi lệnh thì phải trả thêm chi phí gì (lock, context switch)?
- Một thread phục vụ hàng chục nghìn kết nối bằng cách nào (I/O multiplexing, epoll)?

**Lập luận:** vì dữ liệu nằm trong RAM nên mỗi lệnh chỉ tốn vài micro-giây và không có đĩa để chờ. Vì chỉ một thread thực thi nên không cần lock và không có context switch giữa các lệnh, nên CPU hầu như luôn làm việc có ích; thêm thread chỉ thêm chi phí đồng bộ mà ít lợi. Epoll cho phép một thread phục vụ nhiều kết nối, nên nút thắt thường chuyển sang mạng và băng thông. Cũng vì tuần tự, nên một lệnh chậm làm mọi client khác phải chờ, và đó là điểm yếu của thiết kế này. Điểm dễ nhầm là nghĩ "một thread" nghĩa là Redis chậm hoặc không scale được: đơn vị nhanh ở đây là mỗi lệnh rất rẻ, còn mạng và I/O đã dùng thread phụ từ Redis 6. Điều phải canh là không để lệnh nào chiếm thread lâu (`KEYS *`, `HGETALL` trên key khổng lồ, Lua dài), thay bằng `SCAN`, `UNLINK`, lệnh theo từng phần; và mở rộng bằng nhiều instance hoặc Cluster chứ không bằng thêm lõi.

**Đáp án ngắn:** Thread chính thực thi lệnh tuần tự trên dữ liệu trong RAM. Phần lớn lệnh O(1) hoặc O(log N) chạy trong micro-giây, không có lock hay context switch giữa các lệnh. Nút thắt thường là mạng và băng thông memory.

**Ví dụ (phép tính):** value 10 KB, mạng 1 Gbps (khoảng 125 MB/s):

```text
trần do mạng = 125.000.000 B/s / 10.000 B = 12.500 thao tác/s
```

Dù CPU thực thi được hàng trăm nghìn lệnh/s, bạn chỉ trả về được khoảng 12.500 value 10 KB mỗi giây qua card mạng này. Vì vậy với value lớn, nút thắt là băng thông, và tăng CPU không giúp gì. Ngược lại, một lệnh chậm chặn tất cả: nếu `SMEMBERS` trên set 5 triệu phần tử mất 200 ms thì **mọi client khác chờ 200 ms** (minh họa, đo thật bằng `SLOWLOG GET`):

```text
127.0.0.1:6379> SLOWLOG GET 1
1) 1) (integer) 14                  <- id
   2) (integer) 1760000000          <- thời điểm
   3) (integer) 201433              <- thời gian thực thi tính bằng micro-giây (~200 ms)
   4) 1) "SMEMBERS"
      2) "big:set"
```

_Minh họa, chưa chạy thử trong môi trường này._

**Nhớ:** thực thi lệnh tuần tự trên RAM nên nhanh và nguyên tử; nút thắt là mạng, và một lệnh O(N) chặn tất cả. Xem [Redis bên trong, Sentinel, Cluster](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-04-redis-noi-bo-cluster-sentinel.md).

**Hỏi xoáy 1:** Vậy "một thread" có hoàn toàn đúng không? Còn I/O threads?
_Vì sao hỏi tiếp:_ bạn vừa nói "một thread", câu tự nhiên kế tiếp là kiểm tra xem điều đó đúng đến đâu trong các bản Redis mới.

**Đáp:** Không hoàn toàn. Từ Redis 6.0 có I/O threads để đọc/ghi socket và phân tích lệnh; **thực thi lệnh vẫn ở thread chính**. Ngoài ra còn thread nền cho xóa lazy (`UNLINK`), fsync AOF, và process con cho RDB/AOF rewrite. `io-threads` mặc định là 1; Redis 8 cải tiến I/O threading, hiệu quả phụ thuộc phần cứng và lệnh.

**Hỏi xoáy 2:** Hệ quả thiết kế của việc thực thi tuần tự là gì?
_Vì sao hỏi tiếp:_ đã biết tuần tự, hãy suy ra hệ quả hai mặt: lợi ở tính nguyên tử, hại ở lệnh chậm chặn tất cả.

**Đáp:** Mỗi lệnh nguyên tử, nên `INCR` an toàn không cần lock. Đổi lại, **một lệnh chậm chặn toàn bộ**: `KEYS *`, `SMEMBERS` trên set hàng triệu phần tử, `DEL` một key khổng lồ, hoặc Lua dài. Dùng `SCAN`, `UNLINK`, chia nhỏ key và giữ Lua ngắn.

**Hỏi xoáy 3:** Dịch vụ cần dùng hết 32 nhân thì sao?
_Vì sao hỏi tiếp:_ nếu một thread thực thi là giới hạn, thì muốn dùng nhiều nhân phải mở rộng theo hướng nào.

**Đáp:** Một instance dùng hiệu quả vài nhân cho phần lệnh. Muốn nhiều nhân/RAM thì chạy nhiều instance hoặc Cluster để chia dữ liệu (xem câu 11).

**Sai lầm hay gặp:** Nói "Redis đơn thread nên không bao giờ chậm". Một lệnh O(N) hoặc big key làm chậm mọi client.

## 2. So sánh RDB và AOF. Mất bao nhiêu dữ liệu khi mất điện?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Server Redis bị mất điện đột ngột. Bạn bật RDB hay AOF, và sẽ mất tối đa bao nhiêu dữ liệu? Tại sao "đã ghi" vẫn có thể mất?

**Gợi ý suy luận:**
- RDB chụp toàn cảnh lúc nào, nên dữ liệu ghi sau lần chụp cuối ra sao?
- AOF ghi từng lệnh, nhưng lệnh đó nằm ở đâu trước khi tới đĩa thật (page cache, fsync)?
- Ba mức `appendfsync` đổi gì giữa độ bền và tốc độ?

**Lập luận:** vì memory là nơi dữ liệu sống, nên đĩa chỉ là bản ghi lại để phục hồi. RDB chụp định kỳ nên mất mọi thứ từ lần chụp cuối. AOF ghi nhật ký từng lệnh nên bền hơn, nhưng dữ liệu "đã ghi" mà còn trong page cache của OS thì vẫn mất khi mất điện, nên độ bền thật do tần suất fsync quyết định. Vì vậy `everysec` mất tối đa khoảng 1 giây, `always` gần như không mất nhưng chậm, `no` phụ thuộc OS. Kết hợp cả hai thì AOF lo độ bền, RDB lo backup và khởi động nhanh. Điểm dễ nhầm là tin bật AOF là không bao giờ mất dữ liệu: độ bền phụ thuộc `appendfsync` và cả đĩa, nên `everysec` vẫn có thể mất khoảng 1 giây ghi. Hãy chọn theo mức mất mát chấp nhận được của từng loại dữ liệu: cache thuần thì có thể tắt persistence, dữ liệu phải giữ thì AOF `everysec` kèm RDB để backup và kiểm tra việc khôi phục định kỳ.

**Đáp án ngắn:** RDB là snapshot theo thời điểm (gọn, phục hồi nhanh). AOF ghi từng lệnh ghi; `appendfsync everysec` mất tối đa khoảng 1 giây, `always` gần như không mất nhưng chậm, `no` phụ thuộc OS. Thực tế kết hợp: AOF cho độ bền, RDB cho backup và khởi động nhanh.

**Ví dụ:** cấu hình (minh họa) và phép tính mất mát:

```conf
# RDB: tối thiểu 1 thay đổi/1 giờ, 100/5 phút, 10000/1 phút
save 3600 1 300 100 60 10000
appendonly yes
appendfsync everysec             # fsync mỗi giây
```

```text
Ghi 10.000 lệnh/s, mất điện ở 0,9 s sau lần fsync cuối:
  AOF everysec -> mất khoảng 9.000 lệnh (tối đa ~1 giây dữ liệu; có thể lệch thêm nếu fsync chậm)
  AOF always   -> mất tối đa lệnh đang xử lý, nhưng thông lượng giảm vì fsync mỗi lệnh
  RDB chỉ       -> mất mọi thứ từ lần snapshot cuối, ví dụ tối đa 60 s ghi ở ngưỡng "60 10000"
```

_Phép tính, chưa chạy Redis._

**Nhớ:** độ bền của AOF do tần suất fsync quyết định; RDB là ảnh theo thời điểm. Xem [Persistence, Replication, Eviction](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-02-persistence-replication-eviction.md).

**Hỏi xoáy 1:** BGSAVE làm gì để "chụp" mà không dừng server?
_Vì sao hỏi tiếp:_ đã biết RDB là ảnh chụp, câu kế tiếp là làm sao chụp mà không dừng server.

**Đáp:** Gọi `fork()`. Process con thấy ảnh memory tại thời điểm fork và ghi ra file; cha tiếp tục phục vụ. Hai process chia sẻ trang memory theo **copy-on-write**: khi cha ghi vào một trang, hệ điều hành sao chép trang đó cho cha.

**Hỏi xoáy 2:** Vậy chi phí và rủi ro của fork là gì?
_Vì sao hỏi tiếp:_ cơ chế fork vừa nêu có cái giá riêng, nên phải hỏi chi phí và rủi ro của nó.

**Đáp:** Fork phải sao chép **bảng trang** nên thời gian tỷ lệ kích thước dataset (10 GB với trang 4 KB là 2.621.440 trang, khoảng 20 MB bảng trang), dataset lớn có thể khựng. Trong lúc con chạy, mỗi trang bị ghi là một bản sao thêm:

```text
Dataset 10 GB, máy 16 GB RAM, trong lúc BGSAVE:
  ghi chạm 5% số trang  -> thêm ~0,5 GB -> ~10,5 GB (an toàn)
  ghi chạm 20%          -> thêm ~2,0 GB -> ~12,0 GB
  ghi chạm 50%          -> thêm ~5,0 GB -> ~15,0 GB (sát 16 GB, OOM-killer có thể giết Redis)
```

_Phép tính đã chạy bằng Python._ Dự phòng RAM, tắt Transparent Huge Pages (THP khiến COW sao chép trang 2 MB thay vì 4 KB), theo dõi `latest_fork_usec` trong `INFO persistence`.

**Hỏi xoáy 3:** AOF `everysec` còn mất gì ngoài 1 giây? Và AOF rewrite để làm gì?
_Vì sao hỏi tiếp:_ sau khi hiểu mất mát của everysec, còn phải hỏi AOF phình theo thời gian thì xử lý ra sao.

**Đáp:** Có thể nhiều hơn một chút khi fsync bị chậm. AOF phình theo thời gian vì ghi mọi lệnh, nên **rewrite** viết lại thành tập lệnh tối thiểu dựng lại trạng thái hiện tại (cũng bằng process con). Từ Redis 7.0 AOF gồm file base và file incr cùng manifest.

**Sai lầm hay gặp:** Tin AOF `everysec` "không mất gì"; hoặc tắt persistence ở master rồi để master khởi động lại **rỗng** làm replica đồng bộ theo trạng thái rỗng và xóa sạch dữ liệu.

## 3. Replication của Redis hoạt động ra sao? Có mất dữ liệu khi failover không?

**Câu hỏi:** Master Redis trả OK cho client rồi chết ngay. Replica được thăng cấp nhưng không có key vừa ghi. Vì sao có thể xảy ra, và bạn giảm rủi ro thế nào?

**Gợi ý suy luận:**
- Master có chờ replica nhận lệnh trước khi trả lời client không (đồng bộ hay async)?
- Khoảng giữa "master trả OK" và "replica nhận được lệnh" nghĩa là gì nếu master chết?
- Khi replica rớt mạng rồi nối lại, nó lấy phần lệnh thiếu từ đâu (offset, backlog)?

**Lập luận:** vì master trả lời client mà không chờ replica (async), nên latency thấp nhưng có một cửa sổ mà lệnh đã được xác nhận mà chưa tới replica. Nếu master chết trong cửa sổ đó, replica được thăng cấp sẽ không có dữ liệu, nên mất ghi dù client đã nhận OK. Muốn thu hẹp cửa sổ thì ép master chờ ack (`WAIT`) hoặc từ chối ghi khi thiếu replica (`min-replicas-*`), đổi lấy latency và tính sẵn sàng. Khi nối lại, replica gửi `PSYNC` kèm offset: nếu phần thiếu còn trong backlog thì chỉ gửi phần thiếu, nếu không thì full resync. Điểm dễ nhầm là nghĩ Redis replication đảm bảo không mất dữ liệu khi failover: nó bất đồng bộ, nên `WAIT` hay `min-replicas` chỉ thu hẹp cửa sổ chứ không xóa hẳn. Nếu dữ liệu không được mất, đừng dùng Redis làm nguồn sự thật duy nhất; hãy ghi vào CSDL bền vững và dùng Redis như cache hoặc queue chấp nhận mất vài bản ghi cuối.

**Đáp án ngắn:** Replica gửi `PSYNC <replid> <offset>`; nếu phần lệnh còn thiếu vẫn nằm trong **replication backlog** (buffer vòng) của master thì chỉ gửi phần thiếu (partial resync), nếu không thì full resync bằng snapshot RDB.

**Ví dụ (timeline mất ghi):**

| Thời điểm | Event |
|---|---|
| t0 | Client gửi `SET order:9 PAID` tới master, master ghi và **trả OK** |
| t0+1 ms | Lệnh chưa kịp truyền sang replica |
| t0+2 ms | Master chết |
| t0+30 s | Sentinel/Cluster thăng cấp replica làm master mới; replica **không có** `order:9` |
| Kết quả | Client đã nhận OK nhưng dữ liệu mất vĩnh viễn |

Giảm rủi ro (minh họa):

```text
SET order:9 PAID
WAIT 1 100        # chờ tối đa 100 ms cho 1 replica xác nhận, trả số replica đã ack
```

```conf
min-replicas-to-write 1       # master từ chối ghi nếu không có >= 1 replica
min-replicas-max-lag 10       # ... với độ trễ tối đa 10 giây
```

_Minh họa, chưa chạy Redis._

**Nhớ:** replication async nên có cửa sổ mất ghi; backlog quyết định partial hay full resync. Xem [Persistence, Replication, Eviction](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-02-persistence-replication-eviction.md).

**Hỏi xoáy 1:** `WAIT` có biến Redis thành nhất quán mạnh không?
_Vì sao hỏi tiếp:_ `WAIT` nghe như cách chữa tận gốc, nên phải kiểm tra nó có thật sự đem lại nhất quán mạnh không.

**Đáp:** Không. `WAIT` chỉ biết có bao nhiêu replica đã nhận lệnh; replica được thăng cấp vẫn có thể là replica **chưa** xác nhận, và master có thể chết trước khi `WAIT` trả về. Nó thu hẹp cửa sổ mất ghi, đổi lấy latency và tính sẵn sàng.

**Hỏi xoáy 2:** Vì sao replica thỉnh thoảng phải full resync dù chỉ rớt mạng vài giây?
_Vì sao hỏi tiếp:_ câu về partial resync nối từ cơ chế backlog: vì sao đôi khi rớt mạng ngắn vẫn phải sao chép lại toàn bộ.

**Đáp:** Partial resync chỉ làm được nếu phần thiếu còn trong backlog. Mặc định `repl-backlog-size` chỉ 1 MB:

```text
Ghi 5 MB/s, mất kết nối 60 s -> phần thiếu = 5 x 60 = 300 MB > backlog 1 MB
=> offset của replica đã bị đẩy khỏi backlog => full resync (fork + gửi RDB + băng thông)
```

Muốn partial resync được thì tăng `repl-backlog-size` lên ≥ 300 MB trong ví dụ này. _Phép tính._

**Hỏi xoáy 3:** Phân vùng mạng thì sao?
_Vì sao hỏi tiếp:_ đã xét một master chết, bước kế là master bị cô lập mà vẫn sống, tức là phân vùng mạng.

**Đáp:** Master bị cô lập vẫn nhận ghi từ client ở phía nó trong khi phía kia bầu master mới; khi nối lại master cũ bị hạ cấp và **ghi của nó bị bỏ**. Hai tham số `min-replicas-*` làm master cô lập tự từ chối ghi sau một lúc.

**Sai lầm hay gặp:** Đọc từ replica rồi mong đọc-sau-ghi nhất quán: replica có latency, đọc ngay sau ghi có thể thấy giá trị cũ.

## 4. Key hết hạn (expire) khác gì bị đuổi (eviction)? Redis xóa key hết hạn thế nào?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Một key đặt TTL 10 giây, sau 11 giây bạn vẫn thấy memory chưa giảm, nhưng `GET` trả nil. Còn khi memory đầy thì Redis bỏ key nào? Hai chuyện này khác nhau thế nào?

**Gợi ý suy luận:**
- Expire trả lời câu hỏi gì về dữ liệu, còn eviction trả lời câu hỏi gì về tài nguyên?
- Để biết chính xác key nào hết hạn hoặc ít dùng nhất cần duy trì cấu trúc toàn cục nào, và tốn gì?
- Nếu thay vào đó chỉ lấy mẫu ngẫu nhiên vài key thì độ chính xác mất bao nhiêu?

**Lập luận:** vì expire là chính sách dữ liệu ("hết giá trị sau giờ X") còn eviction là chính sách tài nguyên ("đầy memory thì bỏ bớt"), nên chúng độc lập và kích hoạt ở thời điểm khác nhau. Duy trì danh sách toàn cục theo hạn hoặc độ gần đây tốn memory và CPU, nên Redis lấy mẫu ngẫu nhiên. Do đó key hết hạn được xóa bị động (khi truy cập) và chủ động (quét mẫu nền), nên memory có thể chưa giải phóng đúng giây nhưng client không bao giờ thấy key quá hạn. Eviction chỉ chạy khi chạm `maxmemory`, theo `maxmemory-policy`. Điểm dễ nhầm là tin key hết hạn là biến mất ngay đúng giây đó, hoặc cho rằng chính sách eviction mặc định bảo vệ dữ liệu quan trọng: với `noeviction`, khi đầy memory thì ghi sẽ lỗi, còn `allkeys-lru` có thể đuổi cả key không có TTL. Khi cấu hình, chọn `maxmemory-policy` đúng với vai trò của instance (cache hay kho dữ liệu) và đặt cảnh báo trước khi chạm `maxmemory`.

**Đáp án ngắn:** Key hết hạn bị xóa **bị động** (khi bị truy cập) và **chủ động** (chu trình nền lấy mẫu key có TTL rồi xóa key quá hạn, lặp tiếp nếu tỷ lệ quá hạn trong mẫu còn cao, có giới hạn thời gian). Eviction chỉ kích hoạt khi chạm `maxmemory`, theo `maxmemory-policy`.

**Ví dụ (minh họa):**

```text
127.0.0.1:6379> SET session:1 abc EX 10
OK
127.0.0.1:6379> TTL session:1
(integer) 9
... sau 11 giây ...
127.0.0.1:6379> GET session:1
(nil)                     <- client KHÔNG BAO GIỜ thấy key đã quá hạn, dù bộ nhớ có thể chưa được giải phóng
```

_Minh họa._ **LRU lấy mẫu chính xác đến đâu (đã chạy mô phỏng):** truy cập phân bố Zipf (có hot key, key nguội), 200.000 lượt đọc, cache chứa 2.000 trên 20.000 key:

```text
LRU chính xác (danh sách đầy đủ)   hit ratio = 0.571
LRU lấy mẫu  1 key                 hit ratio = 0.527
LRU lấy mẫu  5 key                 hit ratio = 0.566
LRU lấy mẫu 10 key                 hit ratio = 0.569
```

Cách đọc: lấy mẫu chỉ 5 key (giá trị `maxmemory-samples` mặc định của Redis là 5) đã tiến sát LRU chính xác (0,566 so với 0,571) mà không cần duy trì danh sách toàn cục; lấy 1 key tức là gần như đuổi ngẫu nhiên và tụt rõ. Đây là lý do Redis có tham số `maxmemory-samples` để đổi CPU lấy độ chính xác. _Đã chạy mô phỏng bằng Python, chỉ minh họa xu hướng, không phải đo Redis thật._

**Nhớ:** expire theo dữ liệu, eviction theo tài nguyên; cả hai đều xấp xỉ bằng lấy mẫu. Xem [Persistence, Replication, Eviction](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-02-persistence-replication-eviction.md).

**Hỏi xoáy 1:** Vậy key hết hạn có chiếm memory không?
_Vì sao hỏi tiếp:_ thắc mắc tự nhiên về "memory chưa giảm" là key quá hạn có chiếm chỗ không.

**Đáp:** Có thể, cho đến khi bị truy cập hoặc bị quét trúng. Memory không giải phóng đúng giây hết hạn, nhưng key quá hạn **không bao giờ trả về** cho client.

**Hỏi xoáy 2:** `allkeys-lru` hay `allkeys-lfu`?
_Vì sao hỏi tiếp:_ đã biết eviction cần chính sách, bước tiếp là so sánh hai chính sách phổ biến và khi nào chọn cái nào.

**Đáp:** LRU xem "mới dùng", LFU xem "dùng thường xuyên". LFU chống tốt hơn việc một lần quét lớn xô đẩy các hot key ra khỏi cache; hợp khi phân bố truy cập lệch và ổn định.

**Hỏi xoáy 3:** Đặt `volatile-lru` nhưng ghi vẫn báo OOM. Vì sao?
_Vì sao hỏi tiếp:_ nếu chọn policy sai thì ghi vẫn bị từ chối dù đã cấu hình eviction, và phải giải thích vì sao.

**Đáp:** Các policy `volatile-*` chỉ xét key **có TTL**. Nếu không còn key nào đủ điều kiện, Redis hành xử như `noeviction` và từ chối ghi. Cũng xem `maxmemory` đã tính đủ buffer replication và client chưa. Redis khuyên policy volatile cho trường hợp một instance vừa cache vừa chứa key bền, và cân nhắc tách hai instance.

**Sai lầm hay gặp:** Nhầm expire với eviction; dùng `noeviction` cho cache rồi ngạc nhiên khi ghi bị từ chối.

## 5. MULTI/EXEC, Lua và pipeline khác nhau thế nào? Khi nào dùng cái nào?

**Câu hỏi:** Cần "chỉ trừ kho nếu còn hàng" và hai client chạy cùng lúc. Bạn dùng pipeline, MULTI/EXEC hay Lua, và vì sao hai lệnh `GET` rồi `DECR` rời nhau thì sai?

**Gợi ý suy luận:**
- Giữa hai lệnh rời, client khác có thể chen vào không, và hậu quả là gì với số kho?
- Pipeline giải vấn đề latency hay vấn đề chen ngang?
- Trong MULTI, bạn có đọc được kết quả giữa chừng để rẽ nhánh không?

**Lập luận:** vì hai lệnh rời cho phép client khác chen vào giữa, nên hai client cùng đọc 1 rồi cùng trừ sẽ làm kho âm. Pipeline chỉ gom lệnh vào một lượt đi-về nên giảm latency mạng nhưng không đảm bảo nguyên tử. `MULTI/EXEC` ngăn lệnh khác chen giữa nhưng không cho đọc kết quả giữa chừng để rẽ nhánh. Bài toán "đọc, quyết định, ghi" cần cả ba, nên dùng Lua chạy một bước nguyên tử trên thread thực thi duy nhất. Điểm dễ nhầm là nghĩ `MULTI/EXEC` giống transaction của CSDL: nó không rollback khi một lệnh lỗi lúc chạy và không cho đọc rồi quyết định giữa chừng. Dùng Lua (hoặc `WATCH` kèm retry) cho logic "đọc rồi ghi", giữ script ngắn vì nó chặn thread, và trong Cluster mọi key của script phải cùng một slot.

**Đáp án ngắn:** Pipeline chỉ giảm số round trip (không nguyên tử). `MULTI/EXEC` xếp hàng lệnh rồi chạy liền nhau. Lua chạy một đoạn logic nguyên tử có thể đọc, rẽ nhánh, ghi.

**Ví dụ (trừ kho nguyên tử):** bài toán "chỉ trừ nếu còn hàng". Cách sai bằng hai lệnh rời (race), và cách đúng bằng Lua:

```text
# SAI: hai client cùng đọc 1 rồi cùng trừ => kho âm
GET stock:42          -> "1"
(logic ở ứng dụng: "còn hàng")
DECR stock:42         -> 0     (client khác cũng làm vậy -> -1)
```

```lua
-- ĐÚNG: một lần EVAL, nguyên tử
-- KEYS[1] = stock:42 ; ARGV[1] = số lượng cần trừ
local stock = tonumber(redis.call('GET', KEYS[1]) or '0')
if stock >= tonumber(ARGV[1]) then
  return redis.call('DECRBY', KEYS[1], ARGV[1])   -- trả số còn lại
end
return -1                                          -- không đủ hàng
```

```text
127.0.0.1:6379> EVAL "<script>" 1 stock:42 1
(integer) 0       <- còn lại 0
127.0.0.1:6379> EVAL "<script>" 1 stock:42 1
(integer) -1      <- hết hàng, KHÔNG bị trừ âm
```

_Minh họa, chưa chạy Redis._

**Nhớ:** pipeline giảm round trip, MULTI cách ly lệnh, Lua gói logic đọc-quyết-ghi nguyên tử. Xem [Distributed lock, Lua, Streams](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-05-distributed-lock-lua-streams.md).

**Hỏi xoáy 1:** `MULTI/EXEC` có rollback không?
_Vì sao hỏi tiếp:_ nghe "transaction" thì người ta nghĩ tới rollback, nên phải làm rõ MULTI/EXEC không có rollback.

**Đáp:** Không. Lỗi cú pháp lúc xếp hàng làm hủy cả khối, nhưng lỗi lúc chạy (sai kiểu dữ liệu) chỉ làm lệnh đó lỗi, các lệnh khác vẫn chạy:

```text
127.0.0.1:6379> SET name "abc"
127.0.0.1:6379> MULTI
127.0.0.1:6379(TX)> INCR name        <- chạy sẽ lỗi (không phải số), nhưng xếp hàng được
QUEUED
127.0.0.1:6379(TX)> SET other 1
QUEUED
127.0.0.1:6379(TX)> EXEC
1) (error) ERR value is not an integer or out of range
2) OK                                <- SET other 1 VẪN chạy
```

Nó đảm bảo cách ly và thứ tự, không phải "tất cả hoặc không". _Minh họa._

**Hỏi xoáy 2:** Còn `WATCH`?
_Vì sao hỏi tiếp:_ MULTI không rẽ nhánh được, và còn một cách khác là optimistic lock, nên so sánh WATCH với Lua.

**Đáp:** `WATCH key` là optimistic lock: nếu key đổi trước `EXEC` thì `EXEC` trả `nil` và ứng dụng retry. Dùng được nhưng phải tự viết vòng retry; Lua gọn hơn cho logic ngắn.

**Hỏi xoáy 3:** Trên Cluster có gì cần lưu ý?
_Vì sao hỏi tiếp:_ Lua và transaction gặp ràng buộc riêng khi chạy trên Cluster, nên đó là mối quan tâm kế tiếp.

**Đáp:** Mọi key trong transaction/Lua phải cùng hash slot, nếu không báo `CROSSSLOT`; dùng hash tag `{...}` để ép cùng slot (câu 11). Lua phải khai báo mọi key trong `KEYS`.

**Sai lầm hay gặp:** Viết Lua dài hoặc có vòng lặp lớn: chặn server vì Lua chạy ở thread chính; hoặc tưởng pipeline là nguyên tử.

## 6. Giữ cache và CSDL nhất quán khi ghi như thế nào?

**Câu hỏi:** Khi cập nhật giá sản phẩm, bạn sửa DB rồi xử lý cache thế nào để không bị đọc giá cũ? Nếu hai request ghi cùng lúc thì sao?

**Gợi ý suy luận:**
- Cache và DB là hai hệ thống, vậy có transaction bao trùm cả hai không?
- Nếu cập nhật cache khi ghi, hai writer đến theo thứ tự khác nhau thì cache ra sao?
- Nếu xóa cache thay vì cập nhật thì lần đọc kế tiếp làm gì, và cửa sổ lệch còn ở đâu?

**Lập luận:** vì không có transaction xuyên cache và DB, nên mọi thứ tự thao tác đều có cửa sổ lệch, việc cần làm là chọn thứ tự có cửa sổ nhỏ nhất và tự lành. Cập nhật cache khi ghi nguy hiểm vì thứ tự cập nhật cache có thể khác thứ tự cập nhật DB (kịch bản A). Xóa cache thì lần đọc sau nạp lại từ DB nên tự sửa. Ghi DB trước rồi mới xóa cache thu hẹp race xuống trường hợp hiếm (kịch bản C), còn xóa cache trước làm race dễ xảy ra hơn nhiều (kịch bản D). TTL là lưới an toàn cuối cùng. Điểm dễ nhầm là nghĩ "xóa cache sau khi ghi DB" là hết race: một request đọc cũ vẫn có thể nạp lại giá trị cũ vào cache sau khi bị xóa, nên cần TTL làm lưới an toàn, và nếu cần chắc hơn thì xóa lần hai sau một khoảng ngắn hoặc dùng cơ chế thông báo đổi qua binlog (CDC). Chấp nhận rằng cache chỉ nhất quán cuối cùng, và đừng đưa dữ liệu cần đúng tuyệt đối vào đường đọc chỉ có cache.

**Đáp án ngắn:** Dùng cache-aside: đọc miss thì nạp; khi ghi thì **ghi DB trước, rồi xóa cache** (không cập nhật), kèm TTL làm lưới an toàn.

**Ví dụ (đã chạy mô phỏng tất định, mỗi dòng là một bước xen kẽ):**

```text
-- A. Hai writer CẬP NHẬT cache (update cache)
  W1  ghi DB price=200              DB=200 cache=(trống)
  W2  ghi DB price=300              DB=300 cache=(trống)
  W2  set cache price=300           DB=300 cache=300
  W1  set cache price=200 (đến trễ) DB=300 cache=200
  => CACHE LỆCH DB (cache=200, DB=300) cho đến khi hết TTL

-- B. Writer GHI DB rồi XÓA cache
  W   ghi DB price=200              DB=200 cache=(trống)
  W   xóa cache                     DB=200 cache=(trống)
  R   miss -> đọc DB -> set cache   DB=200 cache=200
  => nhất quán

-- C. Race hiếm: reader đọc DB TRƯỚC khi ghi, nạp cache SAU khi xóa
  R   miss -> đọc DB (được 100)     DB=100 cache=(trống)
  W   ghi DB price=200              DB=200 cache=(trống)
  W   xóa cache                     DB=200 cache=(trống)
  R   nạp cache bằng giá trị cũ 100 DB=200 cache=100
  => CACHE LỆCH DB (cache=100, DB=200) cho đến khi hết TTL

-- D. SAI THỨ TỰ: xóa cache trước, ghi DB sau
  W   xóa cache                     DB=100 cache=(trống)
  R   miss -> đọc DB (vẫn 100) -> set cache   DB=100 cache=100
  W   ghi DB price=200              DB=200 cache=100
  => CACHE LỆCH DB (cache=100, DB=200) cho đến khi hết TTL
```

Cách đọc: A cho thấy vì sao **cập nhật cache khi ghi là không an toàn** (thứ tự cập nhật cache khác thứ tự cập nhật DB). B là thread bình thường. C là race **có thật nhưng hiếm** của "ghi DB rồi xóa cache", vì nó đòi hỏi reader đọc DB **chậm hơn** cả một lần ghi DB và một lần xóa cache. D (xóa cache trước) làm race **dễ xảy ra hơn nhiều**, vì khoảng giữa "xóa" và "ghi DB xong" là cả một thao tác ghi DB. _Đã chạy mô phỏng bằng Python (dict giả lập), không phải Redis và DB thật._

**Nhớ:** cache-aside: ghi DB trước, xóa cache sau, kèm TTL; chỉ đạt eventual consistency. Xem [Cache pattern](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-03-cache-pattern-van-de-cache.md).

**Hỏi xoáy 1:** Vì sao xóa chứ không cập nhật cache?
_Vì sao hỏi tiếp:_ kịch bản A dẫn thẳng tới câu hỏi vì sao xóa chứ không cập nhật.

**Đáp:** Xem kịch bản A: hai ghi đồng thời có thể cập nhật cache theo thứ tự khác với DB. Xóa thì lần đọc sau nạp lại từ DB nên tự sửa.

**Hỏi xoáy 2:** Còn giảm race C thế nào?
_Vì sao hỏi tiếp:_ kịch bản C vẫn còn một race hiếm, nên bước tiếp theo là giảm nó.

**Đáp:** TTL ngắn làm lệch tự hết; **delayed double delete** (xóa lại sau một khoảng ngắn, lớn hơn thời gian đọc DB thông thường); hoặc xóa cache qua CDC/binlog để không phụ thuộc thứ tự ở ứng dụng.

**Hỏi xoáy 3:** Nếu bước xóa cache thất bại thì sao?
_Vì sao hỏi tiếp:_ mọi cách trên giả định bước xóa cache thành công, nên phải hỏi nếu nó thất bại.

**Đáp:** Cache cũ tồn tại đến hết TTL. Cần cơ chế **retry**: đẩy yêu cầu xóa vào queue/outbox, hoặc để dịch vụ CDC đọc binlog và xóa cache, tách khỏi thread ghi. Xóa **sau commit** transaction, không phải trước.

**Sai lầm hay gặp:** Xóa cache trước khi ghi DB (kịch bản D) hoặc xóa trong transaction chưa commit (reader nạp lại bản cũ ngay sau đó).

## 7. Phân biệt cache penetration, breakdown và avalanche. Mỗi loại xử lý ra sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** DB bị sập sau một đợt tải dù đã có cache. Bạn kiểm tra thấy ba khả năng: key không tồn tại bị hỏi liên tục, một hot key vừa hết hạn, hoặc rất nhiều key hết hạn cùng giờ. Phân biệt và xử lý từng loại ra sao?

**Gợi ý suy luận:**
- Với key không tồn tại, cache có gì để lưu không, nên lần nào cũng miss?
- Một hot key hết hạn thì bao nhiêu request cùng đi nạp, và có cần tất cả đều nạp không?
- Nhiều key cùng TTL cùng nạp lúc nào, và làm sao rải đều thời điểm hết hạn?

**Lập luận:** vì cache chỉ chắn được tải khi có gì đó để trả, nên ba loại khác nhau ở lý do cache không chắn được. Penetration: key không tồn tại nên luôn miss, chữa bằng cache giá trị null hoặc Bloom filter. Breakdown: một hot key hết hạn và mọi request cùng nạp, chữa bằng để chỉ một request nạp (mutex hoặc single-flight) hoặc hết hạn logic. Avalanche: nhiều key hết hạn đồng loạt hoặc Redis chết, chữa bằng jitter TTL, cache nhiều tầng, HA và bảo vệ DB. Biết đúng loại thì mới chọn đúng thuốc. Điểm dễ nhầm là dùng chung một cách chữa cho cả ba, ví dụ chỉ thêm TTL ngẫu nhiên mà quên key không tồn tại luôn miss hoặc hot key vẫn bị stampede. Khi review, hỏi theo nguyên nhân: key có tồn tại không (null cache, Bloom filter), có phải một key duy nhất (single-flight), hay nhiều key cùng hạn (jitter), và luôn có lớp bảo vệ cho DB (rate limit, circuit breaker) khi cache không đủ.

**Đáp án ngắn:** Penetration: null cache hoặc Bloom filter, kiểm tra tham số. Breakdown: mutex/single-flight hoặc hết hạn logic. Avalanche: jitter TTL, cache nhiều tầng, HA, bảo vệ DB.

**Ví dụ A, single-flight chống breakdown (đã chạy thật trên JDK 11):** 200 request cùng lúc cache miss một hot key; mỗi lần nạp từ DB mất 200 ms.

```java
CompletableFuture<String> f = inflight.computeIfAbsent(key,
        // chỉ một request thật sự gọi DB
        k -> CompletableFuture.supplyAsync(() -> loadFromDb(k)));
// các request còn lại chờ chung kết quả
return f.get();
```

```text
không bảo vệ     : 200 request cùng lúc cache miss -> 200 lần chạm DB
có single-flight : 200 request cùng lúc cache miss -> 1 lần chạm DB
```

_Đã chạy thử trên JDK 11._ Trong nhiều instance, mỗi instance tự single-flight cho mình, tổng còn N lần (số instance); để còn 1 thì thêm lock `SET NX PX` trong Redis (xem hỏi xoáy 2).

**Ví dụ B, jitter TTL chống avalanche (đã chạy bằng Python):** nạp 100.000 key cùng lúc với TTL 3600 s.

```text
TTL cố định      : 100000 key hết hạn CÙNG 1 giây -> 100000 lần nạp lại DB trong 1 giây
TTL jitter ±10%  : đỉnh 176 key/giây (trung bình ~139/giây trải trên 720 giây)
```

Cách đọc: cùng lượng dữ liệu, jitter ±10% biến một cú sập tức thời (100.000 truy vấn/giây) thành dòng đều khoảng 139 đến 176 truy vấn/giây mà DB chịu được. Trong Java: `ttl = base + random.nextInt(base / 5) - base / 10`.

**Ví dụ C, Bloom filter chống penetration (đã chạy mô phỏng, 100.000 phần tử, 100.000 truy vấn id không tồn tại):**

```text
bit/phần tử= 4  k=3   bộ nhớ=  48.8 KB   dương tính giả đo=14.649% (lý thuyết 14.689%)  âm tính giả=0
bit/phần tử= 8  k=6   bộ nhớ=  97.7 KB   dương tính giả đo= 2.127% (lý thuyết  2.158%)  âm tính giả=0
bit/phần tử=10  k=7   bộ nhớ= 122.1 KB   dương tính giả đo= 0.786% (lý thuyết  0.819%)  âm tính giả=0
bit/phần tử=16  k=11  bộ nhớ= 195.3 KB   dương tính giả đo= 0.047% (lý thuyết  0.046%)  âm tính giả=0
```

Cách đọc: với 10 bit mỗi phần tử (khoảng 122 KB cho 100.000 id) chỉ khoảng 0,8% truy vấn id giả lọt xuống DB, và **âm tính giả luôn bằng 0** (id hợp lệ không bao giờ bị block nhầm). Số đo bám sát công thức lý thuyết `(1 - e^(-kn/m))^k`. _Đã chạy mô phỏng bằng Python._

**Nhớ:** penetration là thiếu dữ liệu để cache, breakdown là một hot key, avalanche là nhiều key hoặc cả Redis. Xem [Cache pattern](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-03-cache-pattern-van-de-cache.md).

**Hỏi xoáy 1:** Bloom filter có thể chặn nhầm dữ liệu hợp lệ không?
_Vì sao hỏi tiếp:_ Bloom filter là giải pháp cho penetration, nên phải kiểm tra giới hạn: nó có chặn nhầm dữ liệu hợp lệ không.

**Đáp:** Không có **âm tính giả** (cột cuối bằng 0). Có **dương tính giả**: nói "có" mà thực ra không, khi đó yêu cầu chỉ đi xuống DB một lần. Điều kiện: phải thêm mọi ID hợp lệ **mới** vào filter, nếu không sẽ chặn nhầm dữ liệu mới tạo.

**Hỏi xoáy 2:** Mutex chống stampede nên dùng lock nào? Có cần Redlock không?
_Vì sao hỏi tiếp:_ single-flight trong một instance chưa đủ khi có nhiều instance, nên bước kế là chọn loại lock cho việc này.

**Đáp:** Chỉ để bảo vệ DB khỏi truy vấn trùng, nên `SET lock:key token NX PX 5000` là đủ (thua cuộc cũng chỉ dư vài truy vấn, không sai dữ liệu). Không cần mức an toàn của key đúng đắn. Phương án khác là **hết hạn logic**: trả bản cũ và làm mới nền.

**Hỏi xoáy 3:** Redis sập hoàn toàn thì dịch vụ có chết theo không?
_Vì sao hỏi tiếp:_ đã xử lý ba loại khi Redis còn sống, câu cuối cùng là khi cả Redis sập.

**Đáp:** Nếu không có đường lui thì tải đổ hết vào DB và có thể làm sập DB. Cần timeout ngắn cho Redis, circuit breaker, cache cục bộ (Caffeine), rate limiting/bulkhead trước DB, và Redis có HA.

**Sai lầm hay gặp:** Dùng cùng TTL cố định cho dữ liệu nạp hàng loạt (kịch bản B); không cache giá trị "không tồn tại".

## 8. Hot key và big key gây ra vấn đề gì và xử lý thế nào?

**Câu hỏi:** Một node Redis trong Cluster liên tục quá tải dù các node khác rảnh. Hoặc một lệnh `HGETALL` làm cả hệ thống đứng vài trăm ms. Nguyên nhân có thể là gì và xử lý ra sao?

**Gợi ý suy luận:**
- Lệnh thực thi tuần tự trên một thread, vậy một lệnh xử lý nhiều dữ liệu ảnh hưởng ai?
- Một key nằm ở bao nhiêu node và slot, nên tải của riêng key đó chia được không?
- Dữ liệu của một lệnh trả về qua mạng tốn bao lâu (kích thước chia băng thông)?

**Lập luận:** vì lệnh chạy tuần tự trên một thread, nên một lệnh xử lý key khổng lồ (big key) chặn mọi client. Vì mỗi key nằm trọn trong một node và một slot, nên khi một key chịu truy cập cực lớn (hot key) thì thêm node cũng không chia được tải của nó. Do đó chi phí không chia đều theo số key mà theo kích thước và tần suất từng key. Big key xử lý bằng `UNLINK`, xóa theo batch, chia nhỏ key; hot key xử lý bằng cache cục bộ hoặc nhân bản key có kiểm soát. Điểm dễ nhầm là nghĩ thêm node là giải quyết hot key: một key chỉ nằm trên một node nên node đó vẫn quá tải. Cần giải pháp khác: cache cục bộ trong ứng dụng với TTL ngắn, nhân bản key thành nhiều bản có hậu tố rồi chọn ngẫu nhiên khi đọc, hoặc đọc từ replica. Với big key, phát hiện bằng `--bigkeys` hoặc `MEMORY USAGE`, chia nhỏ cấu trúc và dùng `UNLINK` khi xóa.

**Đáp án ngắn:** Hot key là key chịu tải truy cập cực lớn, thành nút cổ chai của một node/slot. Big key là key giá trị quá lớn hoặc quá nhiều phần tử, gây lệnh chậm, đột biến mạng và xóa chậm.

**Ví dụ (phép tính):**

```text
Hash 1.000.000 field x ~100 B = ~100 MB
HGETALL qua mạng 1 Gbps (125 MB/s) = 0,8 giây truyền 100 MB (và Redis phải dựng cả bản trả lời)
=> trong khoảng thời gian đó mọi client khác chờ ở hàng đợi lệnh.
```

Phát hiện và xử lý (minh họa):

```text
$ redis-cli --bigkeys          # quét SCAN, in key lớn nhất theo từng kiểu
$ redis-cli --hotkeys          # cần maxmemory-policy kiểu LFU
127.0.0.1:6379> MEMORY USAGE user:1000:orders
(integer) 104857600
127.0.0.1:6379> UNLINK user:1000:orders      # xóa ở luồng nền, không chặn luồng chính
```

Xử lý hot key bằng cách replication có kiểm soát (minh họa Java):

```java
String readKey(String key) {                 // đọc: chọn ngẫu nhiên 1 trong N bản sao
    return key + "#" + ThreadLocalRandom.current().nextInt(N);
}
void write(String key, String v) {           // ghi: ghi cả N bản (chấp nhận lệch ngắn)
    for (int i = 0; i < N; i++) redis.set(key + "#" + i, v);
}
```

Cách đọc: N bản sao có thể rơi vào N slot khác nhau (vì hậu tố đổi hash slot), nên tải đọc được chia cho N node. Đổi lại ghi tốn N lần và các bản có thể lệch trong thời gian ngắn. _Minh họa, chưa chạy Redis._

**Nhớ:** big key chặn thread thực thi, hot key dồn tải vào một slot; cả hai không tự giải được bằng cách thêm node. Xem [Redis bên trong, Sentinel, Cluster](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-04-redis-noi-bo-cluster-sentinel.md).

**Hỏi xoáy 1:** Cluster có tự giải quyết hot key không?
_Vì sao hỏi tiếp:_ chữa hot key bằng thêm node là phản xạ thường gặp, nên kiểm tra Cluster có tự giải quyết không.

**Đáp:** Không. Một key nằm trọn trong một slot, một master; thêm node không chia tải cho riêng key đó. Giải pháp: cache cục bộ trong ứng dụng với TTL ngắn, replication key như trên, client-side caching, đọc từ replica.

**Hỏi xoáy 2:** Xóa một big key an toàn thế nào?
_Vì sao hỏi tiếp:_ đã nhận ra big key chặn thread, bước kế là xóa nó mà không gây chính cú chặn đó.

**Đáp:** `UNLINK` (giải phóng memory ở thread nền) thay vì `DEL`. Với tập lớn, xóa từng phần bằng `HSCAN/SSCAN/ZSCAN` rồi `HDEL/SREM/ZREM` theo batch, hoặc chia nhỏ ngay từ thiết kế (shard theo hậu tố, ví dụ `orders:{user}:{bucket}`).

**Sai lầm hay gặp:** `HGETALL`/`SMEMBERS`/`LRANGE 0 -1` trên key lớn; bộ đếm toàn cục `INCR global:counter` trở thành hot key.

## 9. Cài distributed lock đúng cách bằng Redis. Vì sao `SET NX PX` còn cần token và gỡ lock nguyên tử?

**Câu hỏi:** Bạn cài lock bằng `SET key value NX PX 30000`. Có người nói còn thiếu token và bước gỡ lock nguyên tử. Chuyện gì sai nếu chỉ `DEL` thẳng?

**Gợi ý suy luận:**
- Lock có TTL để làm gì, và điều gì xảy ra nếu hết hạn khi người giữ vẫn chưa xong?
- Khi A gọi `DEL`, lock đó còn là của A không, và A có biết điều đó không?
- Giữa "kiểm tra lock của tôi" và "xóa", hai lệnh rời có thể bị chen không?

**Lập luận:** vì lock có TTL để không kẹt mãi khi client chết, nên lock có thể hết hạn và thuộc về người khác mà người cũ không biết. Nếu A xong muộn rồi `DEL` thẳng, A xóa nhầm lock của B, nên C vào được cùng lúc với B. Vì vậy mỗi lần xin lock cần một token ngẫu nhiên để nhận diện "lock này của tôi". Việc kiểm tra token rồi xóa phải nguyên tử (Lua), vì nếu là hai lệnh rời thì lock có thể đổi chủ ngay giữa chúng. Điểm dễ nhầm là chỉ dùng `SET NX` rồi `EXPIRE` bằng hai lệnh (crash giữa hai lệnh để lại lock vĩnh viễn) hoặc `DEL` không kiểm token. Hãy dùng một lệnh `SET key token NX PX ttl`, gỡ bằng script kiểm tra token, đặt TTL dài hơn thời gian xử lý tối đa (hoặc gia hạn khi còn làm), và nhớ lock này chỉ giảm tranh chấp, không thay thế ràng buộc đúng đắn ở DB.

**Đáp án ngắn:** `SET key token NX PX 30000` lấy lock nếu chưa có và tự hết hạn sau 30 giây. Token ngẫu nhiên duy nhất cho mỗi lần xin. Gỡ bằng "xóa nếu giá trị đúng là token của tôi" nguyên tử (`DELEX key IFEQ token` từ Redis 8.4, trước đó dùng Lua).

**Ví dụ (đã chạy mô phỏng với đồng hồ giả; hai kịch bản cùng một diễn biến, chỉ khác cách gỡ lock):**

```text
-- Không dùng token (DEL thẳng)
  t=0   A SET NX PX 10s -> True
  t=12  khóa của A hết hạn (A bị GC pause/chậm 12s, vẫn tưởng mình giữ khóa)
  t=12  B SET NX PX 10s -> True
  t=14  A xong việc, gọi DEL lock:job -> xóa khóa (KHÔNG biết của ai)
  t=14  C SET NX PX 10s -> True (C vào đồng thời với B!)

-- Dùng token + kiểm tra-và-xóa nguyên tử
  t=0   A SET NX PX 10s -> True
  t=12  khóa của A hết hạn
  t=12  B SET NX PX 10s -> True
  t=14  A xong việc, gỡ khóa bằng 'xóa nếu giá trị = A' -> xóa 0 khóa
  t=14  C SET NX PX 10s -> False (C bị chặn, B vẫn độc quyền)
```

Script gỡ lock nguyên tử (Lua, minh họa) và cách gọi bằng Lettuce:

```lua
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
```

```java
String token = UUID.randomUUID().toString();
// lấy khóa
Boolean got = redis.set("lock:job", token, SetArgs.Builder.nx().px(30_000)) != null;
// ... làm việc ...
// gỡ nguyên tử
redis.eval(UNLOCK_SCRIPT, ScriptOutputType.INTEGER, new String[]{"lock:job"}, token);
```

_Mô phỏng đã chạy bằng Python; script Lua và code Lettuce là minh họa, chưa chạy Redis._

**Nhớ:** lock có TTL thì phải có token và gỡ "kiểm tra rồi xóa" nguyên tử. Xem [Distributed lock, Lua, Streams](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-05-distributed-lock-lua-streams.md).

**Hỏi xoáy 1:** Tại sao không `GET` rồi `DEL`?
_Vì sao hỏi tiếp:_ đây là phản ví dụ trực tiếp cho cách làm "GET rồi DEL" mà nhiều người nghĩ là đủ.

**Đáp:** Hai lệnh rời không nguyên tử: giữa chúng lock có thể hết hạn và bị người khác lấy, rồi `DEL` của bạn xóa nhầm. Đó chính xác là kịch bản "không dùng token" ở trên.

**Hỏi xoáy 2:** Nếu việc chạy lâu hơn TTL?
_Vì sao hỏi tiếp:_ token giải quyết người gỡ nhầm, nhưng chưa giải quyết việc lock mất hiệu lực trong lúc đang làm.

**Đáp:** Lock mất hiệu lực và client khác vào được, hai bên cùng nghĩ mình giữ lock. Giải pháp là **gia hạn** (watchdog của Redisson khi không chỉ định `leaseTime`), nhưng tài liệu Redis cảnh báo đừng giả định lock còn giữ chỉ vì process còn sống (GC pause, phân vùng mạng). Với yêu cầu đúng đắn chặt cần **fencing token** ở nơi ghi (câu 10).

**Hỏi xoáy 3:** Dùng master + replica cho lock HA được không?
_Vì sao hỏi tiếp:_ nếu một Redis không đủ HA thì thêm replica, nên phải xem lock có an toàn qua failover không.

**Đáp:** Không an toàn: replication async (câu 3). Master chết trước khi lock tới replica thì replica thăng cấp cho phép client khác lấy cùng lock. Redis tài liệu hóa đúng kịch bản này.

**Sai lầm hay gặp:** Dùng lock Redis để đảm bảo đúng đắn tài chính mà không có ràng buộc ở CSDL (lock dòng, version, `UNIQUE`) hay fencing.

## 10. Redlock là gì và tranh luận Kleppmann với antirez nói về điều gì?

**Câu hỏi:** Một process giữ lock Redis bị GC pause 15 giây, lock hết hạn, process khác vào làm việc, rồi process đầu tỉnh dậy vẫn ghi tiếp. Thuật toán lock có cứu được không? Redlock và tranh luận Kleppmann với antirez nói về điều này thế nào?

**Gợi ý suy luận:**
- Lock dựa trên TTL giả định điều gì về process giữ lock (nó biết mình hết hạn)?
- Một process bị đóng băng có biết mình bị đóng băng không?
- Ai là nơi bảo vệ cuối cùng cho tài nguyên: nơi cấp lock hay nơi ghi?

**Lập luận:** vì lock dựa trên thời gian giả định process giữ lock biết mình đã hết hạn, mà process bị đóng băng (GC pause, page fault) không hề biết, nên khi tỉnh dậy nó vẫn tin mình giữ lock và ghi đè. Vì thuật toán cấp lock không kiểm soát được hành vi này, nên nơi ghi mới là nơi bảo vệ cuối cùng: mỗi lần cấp lock kèm một số tăng đơn điệu (fencing token) và nơi ghi từ chối token nhỏ hơn token đã thấy. Redlock lấy lock trên đa số N master độc lập, nhưng không cung cấp token này. Vì thế chọn theo mục đích: lock cho hiệu quả thì Redis đơn giản đủ, lock cho đúng đắn thì cần fencing hoặc ràng buộc ở CSDL. Điểm dễ nhầm là tin Redlock "an toàn" hơn lock đơn một node cho mọi mục đích: với đúng đắn tài chính, cả hai đều cần fencing token hoặc ràng buộc ở nơi ghi. Khi review, hỏi lock này bảo vệ điều gì: nếu chỉ để tránh làm việc trùng (hiệu quả) thì lock Redis đơn giản đủ; nếu để đảm bảo dữ liệu đúng thì phải có lớp chặn tại CSDL như `version` hoặc UNIQUE.

**Đáp án ngắn:** Redlock dùng N master độc lập (thường 5): client lấy lock trên tất cả với timeout ngắn, được xem là lấy được khi **đa số** thành công và tổng thời gian nhỏ hơn TTL; thời hạn hiệu lực còn lại là TTL trừ thời gian đã tốn. Thất bại thì gỡ lock trên mọi node.

**Ví dụ (timeline vì sao cần fencing token):**

| Thời điểm | Client 1 | Client 2 | Kho dữ liệu |
|---|---|---|---|
| t0 | Lấy lock, nhận **token 33** | | |
| t1 | **Đóng băng** (GC pause 15 s) | | |
| t2 (lock hết hạn) | (vẫn đóng băng) | Lấy lock, nhận **token 34** | |
| t3 | | Ghi kèm token 34 | Chấp nhận (34) |
| t4 | Tỉnh dậy, ghi kèm token 33 | | **Từ chối** vì 33 < 34 |

Phía kho dữ liệu (minh họa, ở đây là SQL):

```sql
UPDATE account
SET balance = :new_balance, last_token = :token
WHERE id = :id AND last_token < :token;   -- 0 dòng bị ảnh hưởng => ghi bị từ chối
```

Không có token, ở t4 Client 1 ghi đè kết quả của Client 2 dù thuật toán lock "đúng". Điểm mấu chốt: **nơi ghi** là nơi bảo vệ cuối cùng, không phải nơi cấp lock. _Minh họa, chưa chạy._

**Nhớ:** lock một mình không bảo vệ được tài nguyên nếu nơi ghi không kiểm tra token. Xem [Distributed lock, Lua, Streams](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-05-distributed-lock-lua-streams.md).

**Hỏi xoáy 1:** Kleppmann phản biện điểm gì?
_Vì sao hỏi tiếp:_ bạn vừa nêu vấn đề, nên bước kế là nêu cụ thể các luận điểm của Kleppmann.

**Đáp:** Hai điểm chính: (1) process có thể bị tạm dừng sau khi lấy lock nên cần fencing token mà Redlock không cung cấp; (2) giả định về đồng hồ (hệ thống chỉnh giờ, nhảy đồng hồ) có thể khiến lock hết hạn sớm. Ông phân biệt lock cho **hiệu quả** (chấp nhận đôi khi trùng) với lock cho **đúng đắn**.

**Hỏi xoáy 2:** Vậy chọn thế nào trong thực tế?
_Vì sao hỏi tiếp:_ biết hai phía tranh luận thì phải rút ra cách chọn trong thực tế theo mục đích.

**Đáp:** Hiệu quả (tránh chạy trùng cron, tránh nạp cache trùng): lock Redis đơn giản là đủ. Đúng đắn (tiền, tồn kho): đừng phụ thuộc lock; dùng **fencing token** hoặc ràng buộc ở CSDL (cập nhật có điều kiện theo version), hoặc hệ thống có phiên/lease đơn điệu như ZooKeeper/etcd. Tài liệu Redis cũng lưu ý TTL dựa trên đồng hồ treo tường, không đơn điệu.

**Hỏi xoáy 3:** Fencing token lấy ở đâu?
_Vì sao hỏi tiếp:_ fencing token là giải pháp, nên phải nói được số đơn điệu đó lấy từ đâu và Redis có đủ không.

**Đáp:** Cần số **tăng đơn điệu mạnh** qua mọi lần cấp lock: sequence của CSDL, ZooKeeper `zxid`/version, etcd revision. `INCR` trên Redis tăng đơn điệu trong một master nhưng **không an toàn xuyên failover** (replica có thể thiếu giá trị cuối).

**Sai lầm hay gặp:** Cho rằng Redlock "đã giải quyết xong" distributed lock, hoặc ngược lại phủ nhận hoàn toàn mà không phân biệt mục đích sử dụng.

## 11. Redis Cluster phân chia dữ liệu thế nào? MOVED, ASK và hash tag là gì?

**Câu hỏi:** Trên Redis Cluster, `MGET user:42:cart user:42:profile` báo `CROSSSLOT`. Vì sao, và `{user:42}:cart` sửa được thế nào? Client gặp `MOVED` hay `ASK` thì làm gì?

**Gợi ý suy luận:**
- Làm sao chia dữ liệu mà không cần tra cứu tập trung (hàm băm xác định, slot)?
- Hai key khác chuỗi thì thường rơi vào cùng slot hay khác slot, và slot nằm ở node nào?
- Muốn ép các key liên quan vào cùng slot thì cần can thiệp vào phần nào của chuỗi key?

**Lập luận:** vì Cluster ánh xạ mỗi key vào một trong 16384 slot bằng `CRC16(key) mod 16384`, nên hai key khác chuỗi thường rơi vào hai slot khác nhau, có thể ở hai master khác nhau. Do đó thao tác nhiều key không còn nguyên tử trên một node và bị báo `CROSSSLOT`. Hash tag `{...}` làm Redis chỉ băm phần trong ngoặc, nên các key cùng tag vào cùng slot. Khi client gửi nhầm node, `MOVED` báo slot đã thuộc node khác lâu dài (cập nhật bản đồ), còn `ASK` báo slot đang được chuyển (hỏi node đích một lần). Điểm dễ nhầm là dùng lệnh nhiều key (`MGET`, `MULTI`, Lua) trong Cluster mà không thiết kế key trước: chúng chỉ hoạt động khi mọi key cùng slot, nên cần hash tag có chủ đích, nhưng hash tag dồn dữ liệu vào một slot và có thể tạo hot slot. Client phải dùng thư viện hỗ trợ Cluster để tự cập nhật bản đồ khi gặp `MOVED`, và không nên coi `ASK` là cập nhật bản đồ vĩnh viễn.

**Đáp án ngắn:** Mỗi master giữ một tập slot và có thể có replica. Client thông minh giữ bản đồ slot đến node và gửi thẳng đến node đúng.

**Ví dụ (đã chạy, CRC16 XMODEM như Redis; `foo` cho 12182 khớp ví dụ trong tài liệu Redis):**

```text
foo                 -> slot 12182
user:42:cart        -> slot 12984
user:42:profile     -> slot  9133        <- cùng người dùng nhưng KHÁC slot
{user:42}:cart      -> slot 15880
{user:42}:profile   -> slot 15880        <- cùng slot nhờ hash tag {user:42}
user:{42}:cart      -> slot  8000        <- tag là "42", không còn là "user:42"
16384 slot / 3 master -> [5462, 5461, 5461]
```

Cách đọc: `MGET user:42:cart user:42:profile` trên Cluster lỗi `CROSSSLOT` vì hai slot 12984 và 9133 có thể nằm ở hai master khác nhau; đổi thành `{user:42}:cart` và `{user:42}:profile` thì cả hai vào slot 15880 và chạy được (cùng `MULTI`/Lua). Phản hồi khi gửi nhầm node (định dạng theo tài liệu Redis, giá trị minh họa):

```text
(error) MOVED 12182 127.0.0.1:7002        <- slot 12182 thuộc node 7002 (lâu dài): cập nhật bản đồ
(error) ASK 12182 127.0.0.1:7003          <- slot đang chuyển: hỏi 7003 một lần kèm ASKING, chưa cập nhật bản đồ
```

_Tính slot đã chạy bằng Python; phản hồi `MOVED/ASK` là minh họa._

**Nhớ:** slot là đơn vị chia dữ liệu và di chuyển; hash tag ép key cùng slot. Xem [Redis bên trong, Sentinel, Cluster](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-04-redis-noi-bo-cluster-sentinel.md).

**Hỏi xoáy 1:** `MOVED` khác `ASK`?
_Vì sao hỏi tiếp:_ hai mã phản hồi nghe giống nhau, và hiểu chúng là cách chứng tỏ bạn hiểu cơ chế di chuyển slot.

**Đáp:** `MOVED`: slot đã thuộc node khác lâu dài, client cập nhật bản đồ. `ASK`: slot **đang được chuyển** (resharding), client chỉ hỏi node đích một lần và **chưa** cập nhật bản đồ.

**Hỏi xoáy 2:** Hash tag có cái giá gì?
_Vì sao hỏi tiếp:_ hash tag là giải pháp cho CROSSSLOT, nên phải nêu cái giá của việc dồn key vào một slot.

**Đáp:** Dồn nhiều key vào một slot nên một tag quá thô (ví dụ `{tenant}` cho cả tenant lớn) tạo **hot shard**: một node gánh gần hết dữ liệu và tải của tenant đó.

**Hỏi xoáy 3:** Cluster có đảm bảo không mất ghi không?
_Vì sao hỏi tiếp:_ đã xong phần chia dữ liệu, câu cuối là Cluster có đảm bảo không mất ghi không.

**Đáp:** Không. Replication async nên failover có thể mất ghi. Khi phân vùng mạng, phía thiểu số có thể còn nhận ghi trong khoảng `cluster-node-timeout` rồi bị mất khi lành lại. Mặc định `cluster-require-full-coverage yes` làm cả Cluster ngừng nếu một số slot không có master phục vụ.

**Sai lầm hay gặp:** Thiết kế key mà không tính đến hash slot rồi mới phát hiện không dùng được `MULTI`/Lua; dùng nhiều database (Cluster chỉ có database 0).

## 12. Chọn Sentinel hay Cluster? Quorum nghĩa là gì? Split-brain xử lý sao?

**Câu hỏi:** Đội muốn có HA cho Redis. Bạn chọn Sentinel hay Cluster? Vì sao 2 Sentinel là cấu hình sai, và khi mạng bị chia thì split-brain xử lý ra sao?

**Gợi ý suy luận:**
- Bài toán của bạn là thiếu sẵn sàng hay dữ liệu vượt một máy?
- Ai quyết định thay master, và nếu hai nhóm bị chia cắt cùng tự quyết thì chuyện gì xảy ra?
- Đa số của N Sentinel là bao nhiêu, và mất bao nhiêu thì không còn bầu được leader?

**Lập luận:** vì Sentinel giải bài toán sẵn sàng cao cho một tập dữ liệu (một master ghi), còn Cluster giải bài toán dữ liệu không vừa một máy, nên chọn theo vấn đề cần giải. Việc thay master phải do đa số đồng ý, nếu không hai nhóm chia cắt cùng bầu master (split-brain). Vì failover cần Sentinel leader được đa số tất cả Sentinel bầu, nên 2 Sentinel mất 1 là hết failover, còn 3 mới chịu được mất 1. Split-brain giảm bằng `min-replicas-to-write` để master cô lập tự từ chối ghi. Điểm dễ nhầm là chọn Cluster "cho tương lai" khi dữ liệu còn vừa một node: Cluster hạn chế lệnh nhiều key và tăng độ phức tạp vận hành. Với Sentinel, luôn dùng số Sentinel lẻ (ít nhất 3) đặt ở các máy lỗi độc lập, đặt `min-replicas-to-write` để master bị cô lập ngừng nhận ghi, và diễn tập failover để biết thời gian gián đoạn thật.

**Đáp án ngắn:** Chọn Sentinel khi dữ liệu vừa RAM một node; Cluster khi vượt một node hoặc cần mở rộng ghi.

**Ví dụ (phép tính, mỗi cấu hình hỏi: mất 1 Sentinel còn failover được không?):**

| Số Sentinel | Đa số cần để bầu leader | Mất 1 Sentinel | Mất 2 Sentinel |
|---|---|---|---|
| 2 | 2 | Còn 1 < 2: **không failover** | không |
| 3 (quorum=2) | 2 | Còn 2: failover được | Còn 1: không |
| 5 (quorum=3) | 3 | Còn 4: được | Còn 3: được |

Cấu hình tối thiểu cho Sentinel (minh họa):

```conf
# quorum = 2: chỉ để xác nhận master "lỗi khách quan"
sentinel monitor mymaster 10.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

Cách đọc: quorum 2 chỉ quyết định **bao nhiêu Sentinel phải đồng ý "master chết"** (ODOWN), còn việc **ủy quyền failover** cần Sentinel dẫn đầu được bầu bởi **đa số tất cả Sentinel**. Vì vậy 2 Sentinel là cấu hình sai (mất 1 là hết failover), và 3 Sentinel nên đặt ở các miền lỗi khác nhau. _Phép tính, cấu hình minh họa._

**Nhớ:** Sentinel cho HA một tập dữ liệu, Cluster cho chia dữ liệu; failover cần đa số Sentinel. Xem [Redis bên trong, Sentinel, Cluster](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-04-redis-noi-bo-cluster-sentinel.md).

**Hỏi xoáy 1:** Split-brain xảy ra thế nào và giảm bằng cách nào?
_Vì sao hỏi tiếp:_ đã chọn công cụ, rủi ro lớn nhất của HA là split-brain, nên phải hỏi cụ thể cơ chế và cách giảm.

**Đáp:** Master bị cô lập vẫn nhận ghi từ một số client trong khi phía kia bầu master mới; khi nối lại master cũ bị hạ cấp và ghi của nó bị bỏ. Giảm bằng `min-replicas-to-write`/`min-replicas-max-lag` (master từ chối ghi khi thiếu replica gần kịp), với cái giá là mất sẵn sàng khi replica rớt.

**Hỏi xoáy 2:** Client xử lý thay đổi master thế nào?
_Vì sao hỏi tiếp:_ failover đổi master, nên phải hỏi client biết master mới bằng cách nào.

**Đáp:** Với Sentinel, client hỏi Sentinel địa chỉ master hiện tại và đăng ký thông báo failover (Lettuce, Jedis hỗ trợ). Với Cluster, client tự làm mới bản đồ slot khi nhận `MOVED`. Cần retry/timeout hợp lý để chịu cửa sổ failover (vài giây đến vài chục giây).

**Hỏi xoáy 3:** Sentinel có chia dữ liệu không?
_Vì sao hỏi tiếp:_ để tránh nhầm Sentinel với Cluster, phải xác nhận Sentinel không chia dữ liệu.

**Đáp:** Không. Mọi dữ liệu nằm trên một master; muốn chia phải dùng Cluster hoặc sharding ở ứng dụng.

**Sai lầm hay gặp:** Triển khai 2 Sentinel hoặc đặt tất cả cùng một máy/AZ; tin failover "không mất gì".

## 13. Khi nào dùng Pub/Sub, Redis Stream hay Kafka?

**Câu hỏi:** Cần gửi message giữa các dịch vụ: chọn Pub/Sub, Redis Stream hay Kafka? Điều gì xảy ra với tin nhắn nếu consumer chết giữa chừng?

**Gợi ý suy luận:**
- Tin nhắn có được lưu lại sau khi gửi không, và ai nhớ consumer đã đọc đến đâu?
- Nếu consumer chết sau khi nhận nhưng trước khi xử lý xong, tin có còn để người khác nhận lại không?
- Dữ liệu nằm ở RAM hay đĩa, và hệ quả với dung lượng và độ bền?

**Lập luận:** vì Pub/Sub không lưu tin (như phát thanh), nên người nghe lỡ là mất tin, chỉ hợp thông báo chấp nhận mất. Stream lưu trong RAM và theo dõi tiến độ từng consumer group qua danh sách chờ ack (PEL), nên consumer chết giữa chừng thì tin vẫn còn và được người khác nhận lại; đó là at-least-once nên xử lý phải idempotent. Kafka lưu trên đĩa, có partition, nên hợp khối lượng lớn, độ bền cao, nhiều consumer độc lập. Vì Stream giới hạn bởi RAM nên quy mô lớn thì Kafka. Điểm dễ nhầm là coi Redis Stream là bản nhẹ của Kafka cho mọi quy mô: nó bị giới hạn bởi RAM và không có hệ sinh thái, retention theo đĩa, partition như Kafka. Hãy chọn theo độ bền, khối lượng và số consumer độc lập cần: Pub/Sub cho tín hiệu chấp nhận mất, Stream cho queue vừa phải trong hệ thống đã có Redis, Kafka khi cần log bền, replay và thông lượng lớn.

**Đáp án ngắn:** Pub/Sub cho thông báo thời gian thực chấp nhận mất. Stream cho queue/event cỡ vừa cần ack, đọc lại. Kafka cho khối lượng lớn, độ bền, nhiều consumer độc lập.

**Ví dụ (minh họa, lifecycle một tin trong Stream):**

```text
127.0.0.1:6379> XGROUP CREATE orders workers $ MKSTREAM
OK
127.0.0.1:6379> XADD orders * order_id 9 amount 120
"1760000000000-0"
127.0.0.1:6379> XREADGROUP GROUP workers w1 COUNT 1 STREAMS orders >
1) 1) "orders"
   2) 1) 1) "1760000000000-0"
         2) 1) "order_id" 2) "9" 3) "amount" 4) "120"     <- w1 nhận tin, tin vào PEL (chưa ack)
... w1 chết trước khi xử lý xong ...
127.0.0.1:6379> XAUTOCLAIM orders workers w2 60000 0-0     <- w2 nhận lại tin kẹt > 60 s
127.0.0.1:6379> XACK orders workers 1760000000000-0        <- xử lý xong, ack
(integer) 1
```

Cách đọc: tin chỉ rời PEL (danh sách chờ ack) khi có `XACK`; consumer chết giữa chừng thì tin vẫn còn và được người khác nhận lại. Đây là **at-least-once**, nên xử lý phải idempotent. _Minh họa, chưa chạy Redis._

**Nhớ:** khác biệt cốt lõi là tin có được lưu và có ai nhớ tiến độ đọc không. Xem [Distributed lock, Lua, Streams](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-05-distributed-lock-lua-streams.md).

**Hỏi xoáy 1:** Giới hạn của Stream so với Kafka?
_Vì sao hỏi tiếp:_ Stream gần với Kafka về mô hình, nên phải nói giới hạn của nó.

**Đáp:** Dữ liệu nằm trong RAM nên bị giới hạn bởi memory và phải cắt tỉa (`MAXLEN`/`MINID`); replication async nên có thể mất tin khi failover; không có mô hình partition và hệ sinh thái như Kafka. Redis 8.6 thêm idempotent production để producer retry không tạo bản trùng (theo thông báo phát hành).

**Hỏi xoáy 2:** Dùng List `LPUSH`/`BRPOP` làm queue được không?
_Vì sao hỏi tiếp:_ List là phương án đơn giản hơn Stream mà nhiều người nghĩ tới, nên phải chỉ ra điểm mất tin của nó.

**Đáp:** Được cho tác vụ nhẹ, nhưng `BRPOP` lấy tin **ra khỏi** queue; consumer chết ngay sau đó là **mất tin**. Mẫu "reliable queue" dùng `LMOVE` sang danh sách đang xử lý, nhưng Stream với consumer group gọn hơn.

**Hỏi xoáy 3:** Pub/Sub có lúc nào đủ dùng?
_Vì sao hỏi tiếp:_ để không kết luận Pub/Sub luôn tệ, cần nêu trường hợp nó đủ dùng.

**Đáp:** Khi mất tin là chấp nhận được và người nhận luôn online: thông báo cache invalidation giữa các instance, trạng thái "đang gõ" trong chat.

**Sai lầm hay gặp:** Dùng Pub/Sub cho message không được mất; quên `XACK`/`MAXLEN` làm PEL và memory phình.

## 14. Thiết kế rate limiter bằng Redis. Cửa sổ cố định có vấn đề gì?

**Câu hỏi:** Rate limit 100 yêu cầu mỗi phút bằng `INCR` theo từng phút. Có người gửi 100 yêu cầu ở giây 59 và 100 yêu cầu ở giây 60. Chuyện gì xảy ra, và bạn thiết kế lại thế nào?

**Gợi ý suy luận:**
- Cửa sổ cố định đếm trong ô thời gian nào, và hai ô liền kề có "nhìn thấy" nhau không?
- Khoảng 2 giây quanh ranh giới cho qua bao nhiêu yêu cầu?
- Phương án chính xác hơn (log, counter, token bucket) tốn memory theo đại lượng nào?

**Lập luận:** vì cửa sổ cố định chỉ đếm trong từng ô thời gian, nên hai ô liền kề không biết nhau, và 100 yêu cầu cuối ô trước cộng 100 yêu cầu đầu ô sau cho qua 200 trong 2 giây (gấp đôi hạn mức). Vì rate limit đúng nghĩa là "trong bất kỳ khoảng T nào", nên cần sliding window hoặc token bucket. Sliding log chính xác nhưng memory tăng theo số yêu cầu, còn token bucket chỉ lưu `tokens` và `last_refill` nên memory cố định mỗi người dùng. Thực hiện trong Lua để nguyên tử. Điểm dễ nhầm là thực hiện `GET` rồi `SET` ở tầng ứng dụng cho bộ đếm hoặc token bucket (race giữa các instance) hoặc quên rằng mỗi key cần TTL để không phình memory. Hãy dùng Lua hoặc `INCR` nguyên tử, chọn thuật toán theo yêu cầu (token bucket cho cho phép bùng nổ, sliding window cho chính xác), và quyết định khi Redis lỗi thì chặn hết (fail closed) hay cho qua hết (fail open).

**Đáp án ngắn:** Cửa sổ cố định: `INCR rl:user:phút` kèm `EXPIRE` lần đầu, vượt ngưỡng thì từ chối. Đơn giản, rẻ, nhưng có **hiện tượng gấp đôi ở biên**. Chính xác hơn: sliding window log (ZSET), sliding window counter, hoặc token bucket.

**Ví dụ (đã chạy mô phỏng):** hạn mức 100 yêu cầu/phút; một người gửi 100 yêu cầu ở giây 59 và 100 yêu cầu ở giây 60 (qua ranh giới cửa sổ).

```text
fixed window : cho qua 200 / 200 request trong khoảng 2 giây (hạn mức 100/phút)
sliding log  : cho qua 100 / 200 request
sliding log bộ nhớ ước lượng: 1.000.000 user x 100 mục x ~70 B = 6.5 GB (ước lượng)
token bucket : 1 Hash/user ~100-150 B => ~119 MB cho 1 triệu user (ước lượng)
```

Cách đọc: cửa sổ cố định để lọt **200 yêu cầu trong 2 giây** (gấp đôi hạn mức) vì mỗi nửa nằm ở một ô khác nhau; sliding log chặn đúng 100 nhưng tốn memory theo số yêu cầu (hàng GB cho 1 triệu người dùng), còn token bucket tốn memory không đổi mỗi người dùng. Memory là **ước lượng**, đo thật bằng `MEMORY USAGE`. _Đã chạy mô phỏng Python._

Lua cho cửa sổ cố định nguyên tử (minh họa; tránh lỗi chết giữa `INCR` và `EXPIRE`):

```lua
-- KEYS[1] = rl:user:42:<phút> ; ARGV[1] = limit ; ARGV[2] = ttl giây
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
if n > tonumber(ARGV[1]) then return 0 else return 1 end
```

**Nhớ:** cửa sổ cố định có gấp đôi ở biên; token bucket cho bùng nổ có kiểm soát với memory không đổi. Xem [Distributed lock, Lua, Streams](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-05-distributed-lock-lua-streams.md).

**Hỏi xoáy 1:** Làm sao tránh lỗi nếu process chết giữa `INCR` và `EXPIRE`?
_Vì sao hỏi tiếp:_ `INCR` và `EXPIRE` là hai lệnh rời, nên rủi ro kế tiếp là process chết giữa chúng.

**Đáp:** Hai lệnh riêng nên key có thể không có TTL mãi mãi và người dùng bị block vĩnh viễn. Gói vào Lua như trên (hoặc `SET key 0 EX ... NX` rồi `INCR`).

**Hỏi xoáy 2:** Token bucket lưu gì và tính thế nào?
_Vì sao hỏi tiếp:_ token bucket được đề nghị làm lời giải, nên phải nói được cách nó tính toán.

**Đáp:** Lưu `tokens` và `last_refill` (một Hash). Mỗi yêu cầu: `tokens = min(capacity, tokens + (now - last_refill) * rate)`; nếu `tokens >= 1` thì trừ 1 và cho qua. Cho phép bùng nổ có kiểm soát (đến `capacity`) rồi giới hạn ở tốc độ trung bình `rate`. Chạy trong Lua để nguyên tử, lấy `now` từ `redis.call('TIME')` để mọi instance dùng chung một đồng hồ.

**Hỏi xoáy 3:** Trên Cluster và khi Redis không khả dụng thì sao?
_Vì sao hỏi tiếp:_ một rate limiter dựa trên Redis phụ thuộc vào Redis, nên phải hỏi khi Redis lỗi thì cho qua hay chặn.

**Đáp:** Key của một người dùng nằm trong một slot nên không cần multi-key. Cần quyết định **fail-open hay fail-closed** khi Redis lỗi (cho qua hay từ chối tất cả); thường fail-open kèm giới hạn cục bộ tạm. Thêm cache cục bộ để giảm số lần gọi Redis.

**Sai lầm hay gặp:** `GET` rồi `SET` rời nhau (race); không tính đồng hồ lệch giữa các instance ứng dụng.

## 15. Redis bỗng chậm theo chu kỳ vài phút, hoặc memory tăng vọt. Bạn điều tra thế nào?

**Câu hỏi:** Redis bỗng chậm theo chu kỳ vài phút một lần, hoặc memory tăng vọt lúc backup. Bạn điều tra từ đâu và theo thứ tự nào?

**Gợi ý suy luận:**
- Vì chỉ một thread thực thi lệnh, thứ gì có thể chiếm thread đó hoặc tài nguyên của nó?
- Việc nào lặp theo chu kỳ (snapshot fork, AOF rewrite, expire hàng loạt, cron của ứng dụng)?
- `SLOWLOG` đo phần nào của latency, và phần nào nó không thấy?

**Lập luận:** vì chỉ một thread thực thi lệnh, nên "Redis chậm" gần như luôn là một việc đang chiếm thread hoặc tài nguyên của nó. Vì nguyên nhân lặp theo chu kỳ, nên nghi tác vụ định kỳ: `BGSAVE` (fork bảng trang, copy-on-write làm memory tăng), AOF rewrite, expire hàng loạt, cron chạy lệnh nặng. Vì `SLOWLOG` chỉ đo thời gian thực thi lệnh, không gồm chờ queue, fork, fsync, swap hay mạng, nên cần thêm `LATENCY`, `INFO persistence` (`latest_fork_usec`), `INFO stats`. Đi từ triệu chứng tới nguyên nhân bằng các công cụ này. Điểm dễ nhầm là kết luận ngay "Redis chậm" mà không phân biệt thời gian lệnh với thời gian chờ ở client hoặc mạng: `SLOWLOG` không thấy phần chờ queue hay mạng. Quy trình: kiểm tra `latency monitor`, `INFO persistence` (fork), kích thước key lớn, `used_memory` so với `maxmemory`, swap và CPU của máy, rồi đối chiếu thời điểm với tác vụ định kỳ; đặt cảnh báo trước thay vì điều tra sau sự cố.

**Đáp án ngắn:** Đi từ triệu chứng đến nguyên nhân: lệnh chậm, fork persistence, expire hàng loạt, big key, swap, mạng. Công cụ: `SLOWLOG`, `LATENCY DOCTOR`, `INFO`, `MEMORY`, `--bigkeys`.

**Ví dụ (minh họa các trường có thật trong `INFO`, giá trị giả định):**

```text
127.0.0.1:6379> INFO persistence
...
rdb_last_bgsave_status:ok
latest_fork_usec:1840000              <- lần fork gần nhất mất 1,84 s: luồng chính bị đứng 1,84 s
...
127.0.0.1:6379> INFO stats
expired_keys:48210330                 <- nhảy vọt đúng giờ: expire hàng loạt
127.0.0.1:6379> LATENCY LATEST
1) 1) "fork"
   2) (integer) 1760000100            <- thời điểm
   3) (integer) 1840                  <- ms gần nhất
   4) (integer) 2310                  <- ms lớn nhất
```

Cách đọc: `latest_fork_usec` = 1.840.000 µs, tức Redis khựng khoảng 1,84 s mỗi lần `BGSAVE` (do fork bảng trang của dataset lớn); khớp với lịch `save` thì tìm ra thủ phạm. Phép tính memory khi backup (dataset 10 GB): ghi chạm 20% số trang thì thêm khoảng 2,0 GB (xem câu 2). _Giá trị `INFO` là giả định để minh họa; phép tính đã chạy bằng Python._

**Nhớ:** tìm việc chiếm thread theo chu kỳ; SLOWLOG không thấy fork, fsync, chờ. Xem [Redis bên trong, Sentinel, Cluster](/go?p=06-Distributed-Systems%2FRedis%2Fhard%2Flt-04-redis-noi-bo-cluster-sentinel.md).

**Hỏi xoáy 1:** Chậm theo chu kỳ đều đặn gợi ý gì?
_Vì sao hỏi tiếp:_ triệu chứng "chu kỳ đều" là manh mối lớn nhất, nên phải hỏi nó gợi ý gì.

**Đáp:** Tác vụ định kỳ: **BGSAVE/AOF rewrite** (xem `latest_fork_usec`, thời điểm khựng khớp lịch `save`), **expire hàng loạt** (nhiều key cùng TTL hết cùng lúc, xem `expired_keys`; cách chữa là jitter TTL, câu 7), cron ứng dụng chạy lệnh nặng, hoặc fsync AOF chậm.

**Hỏi xoáy 2:** Memory tăng gần gấp đôi lúc backup. Giải thích?
_Vì sao hỏi tiếp:_ memory tăng lúc backup liên quan trực tiếp tới cơ chế fork đã học ở câu 2.

**Đáp:** Copy-on-write sau `fork`: trong lúc process con ghi RDB, mọi ghi của cha làm sao chép trang. Ghi nhiều và trang rải rác thì nhiều trang bị nhân đôi. Dự phòng RAM, tắt THP, lên lịch backup ngoài giờ cao điểm hoặc backup từ replica.

**Hỏi xoáy 3:** `SLOWLOG` trống nhưng client vẫn thấy chậm. Có thể vì sao?
_Vì sao hỏi tiếp:_ khi công cụ đầu tiên (SLOWLOG) trống mà vẫn chậm, cần biết còn nhìn vào đâu.

**Đáp:** `SLOWLOG` chỉ đo **thời gian thực thi lệnh**, không gồm chờ queue, mạng, fork hay fsync. Kiểm tra `LATENCY`, `CLIENT LIST` (số kết nối), swap của hệ điều hành, latency mạng, và các lệnh nhanh nhưng **cực nhiều** (xem `INFO commandstats`).

**Sai lầm hay gặp:** Chạy `MONITOR` hoặc `KEYS` trên production để "xem thử" và làm tình hình tệ hơn.

## 16. Redis hiện nay là mã nguồn mở không? Valkey là gì và nên chọn thế nào?

**Câu hỏi:** Pháp chế hỏi: "Redis còn là mã nguồn mở không? Valkey là gì và nên chọn cái nào?" Bạn trả lời thế nào dựa trên điều đã biết?

**Gợi ý suy luận:**
- Giấy phép quyết định bạn được làm gì, nhất là khi cung cấp dịch vụ thương mại?
- Khi một dự án đổi giấy phép, cộng đồng có thể phản ứng ra sao (fork)?
- Chọn phiên bản dựa trên ràng buộc pháp lý, nhu cầu tính năng hay dịch vụ managed?

**Lập luận:** vì giấy phép quyết định quyền sử dụng và phân phối, nên câu hỏi này là về pháp lý và quản trị chứ không phải kỹ thuật. Redis đổi từ BSD 3-Clause sang RSALv2/SSPLv1 từ 7.4, rồi Redis 8 thêm AGPLv3, nên câu "Redis còn open source không" phải nêu rõ phiên bản và lựa chọn giấy phép. Cộng đồng phản ứng bằng fork Valkey (Linux Foundation, BSD 3-Clause). Vì vậy quyết định dựa vào giấy phép, tính năng cần và dịch vụ managed, còn kết luận pháp lý thuộc về pháp chế.

**Đáp án ngắn:** Lịch sử giấy phép theo redis.io: BSD 3-Clause đến 7.2.x; từ 7.4 chuyển sang song giấy phép nguồn-sẵn-có RSALv2/SSPLv1; từ Redis 8 thêm lựa chọn **AGPLv3** (được OSI công nhận) bên cạnh hai giấy phép kia. Valkey là bản fork từ Redis 7.2.4, ra mắt tháng 3/2024 dưới Linux Foundation, giấy phép BSD 3-Clause.

**Ví dụ (cách kiểm tra bạn đang chạy gì, minh họa):**

```text
$ redis-server --version
Redis server v=8.0.0 sha=00000000:0 malloc=jemalloc-5.3.0 bits=64 build=...     <- ví dụ định dạng
127.0.0.1:6379> INFO server
redis_version:8.0.0
server_name:redis        <- Valkey báo server_name:valkey (kiểm tra theo bản bạn dùng)
```

Bảng ra quyết định:

| Tiêu chí | Redis (7.4+ / 8) | Valkey |
|---|---|---|
| Giấy phép | RSALv2/SSPLv1; Redis 8 thêm AGPLv3 | BSD 3-Clause |
| Quản trị | Công ty Redis | Linux Foundation |
| Tính năng tích hợp | Redis 8 gộp JSON, time series, cấu trúc xác suất, query engine | Module chính thức riêng, kiểm tra theo bản |
| Dịch vụ managed | Redis Cloud và các nhà cung cấp có giấy phép | Một số đám mây cung cấp Valkey |

_Minh họa, chưa chạy._

**Nhớ:** nêu rõ phiên bản và giấy phép khi nói về Redis; Valkey là fork BSD từ Redis 7.2.4. Xem [Redis tổng quan](/go?p=06-Distributed-Systems%2FRedis%2Feasy%2Flt-01-redis-tong-quan-cau-truc-du-lieu.md).

**Hỏi xoáy 1:** Redis 8 khác gì về tính năng so với các bản trước?
_Vì sao hỏi tiếp:_ nếu Redis 8 là bản mới nhất thì người nghe sẽ hỏi nó khác các bản trước ở điểm nào.

**Đáp:** Theo thông báo Redis 8 GA (01/05/2025), các module từng phân phối riêng (JSON, time series, các cấu trúc xác suất như Bloom filter/Cuckoo/Count-Min/Top-k/t-digest) và Redis Query Engine được tích hợp vào một bản phân phối; thêm vector set (beta); I/O threading mới và nhiều cải tiến hiệu năng; lệnh hash `HGETDEL`/`HGETEX`/`HSETEX`. Các bản 8.x sau tiếp tục bổ sung; **kiểm tra lại số phiên bản mới nhất và tính năng theo tài liệu hiện hành**.

**Hỏi xoáy 2:** Tổ chức nên chọn Redis hay Valkey?
_Vì sao hỏi tiếp:_ đã biết hai nhánh, bước kế là biến thông tin thành quyết định cho tổ chức.

**Đáp:** Phụ thuộc: (1) ràng buộc giấy phép (AGPL có nghĩa vụ copyleft mạng; BSD thoáng hơn); (2) nhu cầu tính năng (cấu trúc/tìm kiếm tích hợp của Redis 8 so với module của Valkey); (3) dịch vụ managed đang dùng. Với cache/lock/bộ đếm thông thường, hai bên **tương thích lệnh** cho tập lõi, nhưng nên kiểm thử khi nâng cấp hoặc chuyển đổi và không giả định mọi lệnh/phiên bản mới có ở cả hai.

**Hỏi xoáy 3:** Ứng dụng Java của bạn có bị ảnh hưởng bởi giấy phép không?
_Vì sao hỏi tiếp:_ người hỏi thực tế quan tâm ứng dụng của họ có bị ràng buộc không, nên đó là câu cuối.

**Đáp:** Dùng Redis như một dịch vụ backend không sửa đổi thường không kích hoạt nghĩa vụ copyleft của AGPL theo cách hiểu phổ biến; nhưng sửa mã Redis rồi cung cấp như dịch vụ mạng thì có. Đây là vấn đề pháp lý nên xin ý kiến pháp chế; tôi không phải luật sư. Client library (Lettuce, Jedis, Redisson) có giấy phép riêng cần kiểm tra.

**Sai lầm hay gặp:** Nói "Redis không còn open source" hoặc "luôn BSD" mà không nêu rõ phiên bản và lựa chọn giấy phép.

Nguồn: tài liệu chính thức Redis (redis.io), gồm trang "Distributed Locks with Redis", thông báo Redis 8 GA, trang so sánh Redis và Valkey; kiểm tra ngày 21/10/2026. Số phiên bản mới nhất và giá trị mặc định cần kiểm tra lại theo phiên bản đang dùng. Các ví dụ mô phỏng (hash slot CRC16, Bloom filter, LRU lấy mẫu, kịch bản xen kẽ cache và lock, single-flight, rate limit) đã chạy bằng Python 3 và JDK 11 trong sandbox; các đoạn `redis-cli`, Lua, Lettuce chưa chạy trên Redis thật.

