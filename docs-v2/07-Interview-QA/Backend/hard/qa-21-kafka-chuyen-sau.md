# Câu hỏi: Kafka chuyên sâu (hỏi xoáy)

Kiến thức gốc: [Kafka tổng quan](/go?p=06-Distributed-Systems%2FKafka%2Feasy%2Flt-01-kafka-tong-quan.md), [Producer, Consumer và giao nhận](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md), [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [Kafka bên trong](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-04-kafka-noi-bo-replication.md), [Exactly-once và vận hành](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md). Câu hỏi rộng hơn về hệ phân tán: [Microservices, Kafka và hệ phân tán](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-16-microservices-kafka-phan-tan.md).

**Cách dùng.** Mỗi câu đi theo một chuỗi để bạn tự suy ngược ra đáp án thay vì học thuộc: **Câu hỏi** (một hiện tượng hoặc tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi "vì A nên B"), **Đáp án ngắn** (nói thành tiếng được trong phỏng vấn), **Nhớ** (kiến thức cốt lõi và bài gốc). Sau đó là các **Hỏi xoáy**, mỗi câu là bước tiếp theo hợp lý của câu trước và cũng theo chuỗi trên. Hãy che phần Lập luận, tự trả lời từ Gợi ý suy luận rồi mới đối chiếu.

**Về các ví dụ.** Sandbox soạn tài liệu không có Kafka. Các ví dụ ghi _"Đã chạy thử"_ là mô phỏng logic (Python, Java thuần, sqlite) mà tôi chạy thật và dán output thật; chúng dựng lại **cơ chế**, không phải broker thật. Các đoạn cấu hình, code Spring và output lệnh Kafka ghi _"Minh họa, chưa chạy thử"_: định dạng có thể khác theo phiên bản.

**Tóm tắt:**

- Phạm vi file: Kafka chuyên sâu, câu hỏi nào cũng bắt đầu từ một hiện tượng hỏng rồi dẫn tới cơ chế.
- Kafka nhanh vì ghi tuần tự vào log và dùng page cache của OS, đọc bằng `sendfile`; độ bền đến từ replication chứ không từ `fsync` mỗi bản ghi.
- Thứ tự chỉ có trong một partition (cùng key thì cùng partition); `acks=all` chỉ chờ ISR hiện tại nên cần `min.insync.replicas ≥ 2` và tắt unclean leader election.
- Idempotent producer chống trùng do retry bằng PID và sequence nhưng chỉ trong một phiên và một partition; consumer commit trước xử lý thì mất, sau thì trùng.
- Rebalance liên tục thường do xử lý quá `max.poll.interval.ms`; lag lệch ở một partition khác lag đều ở mọi partition và cần chẩn đoán khác nhau.
- "Exactly-once" chỉ bao trùm chuỗi đọc Kafka, xử lý, ghi Kafka nhờ transaction; tác động ra ngoài (DB, API) vẫn cần idempotent; dual write chữa bằng Outbox.
- Hay bị hỏi xoáy nhất: vì sao tăng số partition làm đảo thứ tự, `acks=all` có chắc không mất dữ liệu, và poison pill xử lý thế nào.

## 1. Mọi bản ghi đều ghi ra đĩa mà Kafka vẫn đạt hàng trăm nghìn bản ghi mỗi giây. Vì sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Thao tác nào trên đĩa thật sự đắt: "ghi" hay "tìm vị trí" và "đợi đĩa xác nhận"? (ghi tuần tự so với ngẫu nhiên, `fsync`)
- Nếu log chỉ nối thêm vào cuối, hệ điều hành gom và sắp xếp việc ghi ra sao? (page cache)
- Nếu không `fsync` từng bản ghi thì độ bền lấy từ đâu? (replication)

**Lập luận:** Chi phí lớn của đĩa nằm ở việc dò vị trí ngẫu nhiên và việc đồng bộ từng thao tác, không phải ở bản thân việc ghi byte. Log của Kafka chỉ nối thêm vào cuối nên mọi lần ghi là tuần tự, nhanh hơn ghi ngẫu nhiên nhiều bậc. Vì dữ liệu đi qua page cache của OS, OS gom nhiều lần ghi nhỏ thành lần ghi lớn và flush nền, đồng thời page cache nằm ngoài heap nên không chịu GC. Khi đọc, `sendfile` đẩy thẳng từ page cache ra socket nên không copy qua user space. Việc không `fsync` mỗi bản ghi lẽ ra làm mất bền, nhưng Kafka bù bằng cách replication sang nhiều broker, nên độ bền đến từ replication chứ không từ đồng bộ đĩa.

**Đáp án ngắn:** Kafka ghi tuần tự (chỉ nối cuối log), dựa vào page cache của OS để gom ghi và đọc zero-copy, cộng producer gom và nén theo batch. Độ bền lấy từ replication trên nhiều broker chứ không từ `fsync` mỗi bản ghi.

**Ví dụ:** hiệu ứng của "đồng bộ từng bản ghi" so với "ghi tuần tự rồi flush theo batch" (1 KB mỗi bản ghi, trong sandbox của tôi):

```python
# fsync sau mỗi bản ghi  vs  ghi liên tục, flush một lần ở cuối
f.write(rec); f.flush(); os.fsync(f.fileno())   # kiểu 1
f.write(rec)                                    # kiểu 2 (flush một lần cuối)
```

```text
fsync moi ban ghi : 2000 ban ghi -> 17.307s = 116 ban ghi/s
ghi tuan tu, flush 1 lan cuoi: 200000 ban ghi -> 0.799s = 250,322 ban ghi/s
```

_Đã chạy thử (python)._ Con số tuyệt đối phụ thuộc đĩa của sandbox (đĩa ảo, fsync rất chậm) nên **đừng dùng làm benchmark Kafka**; điểm cần rút ra là chênh lệch khoảng ba bậc độ lớn giữa hai cách. Đó là lý do Kafka không `fsync` mỗi bản ghi mà để OS flush nền (`log.flush.interval.*` mặc định để OS quyết định) và dựa vào replication.

**Nhớ:** Nhanh nhờ tuần tự, page cache, gom batch, zero-copy; bền nhờ replication. Xem [Kafka tổng quan](/go?p=06-Distributed-Systems%2FKafka%2Feasy%2Flt-01-kafka-tong-quan.md).

**Hỏi xoáy 1:** Nếu không `fsync` mỗi bản ghi, broker sập thì bản ghi chưa flush đi đâu? Sao dám nói là bền?
**Gợi ý suy luận:** Một bản ghi được ack khi có mặt ở bao nhiêu broker? (`acks=all`, `min.insync.replicas`) Kịch bản nào mất cả các bản sao cùng lúc?
**Lập luận:** Vì với `acks=all` và `min.insync.replicas=2`, bản ghi chỉ được ack khi ít nhất 2 broker đã nhận, nên một broker sập mất phần chưa flush thì bản sao kia vẫn còn. Rủi ro chỉ còn khi nhiều broker mất đồng thời trước khi flush (mất điện cả rack), nên rải replica qua các rack/AZ (`broker.rack`) để giảm.
**Đáp án ngắn:** Bền nhờ replication: ack chỉ khi đủ bản sao. Còn rủi ro mất đồng thời nhiều broker, giảm bằng rải rack/AZ.

**Hỏi xoáy 2:** Câu 1 nói zero-copy giúp nhanh. Có tình huống nào lợi ích này biến mất?
**Gợi ý suy luận:** `sendfile` chỉ có lợi khi dữ liệu đi nguyên xi từ cache ra socket. Điều gì buộc dữ liệu phải qua user space? (mã hóa, chuyển định dạng)
**Lập luận:** Vì TLS phải mã hóa dữ liệu ở user space, byte không còn đi thẳng từ page cache ra socket, nên mất lợi ích `sendfile`. Tương tự khi broker phải chuyển đổi định dạng bản ghi (down-conversion) cho client cũ, nó phải đọc và sửa dữ liệu trong user space.
**Đáp án ngắn:** Không luôn luôn: bật TLS hoặc down-conversion cho client cũ làm mất zero-copy.

**Hỏi xoáy 3:** Cho broker 64 GB RAM, đặt heap JVM 64 GB có nhanh hơn không?
**Gợi ý suy luận:** Dữ liệu nóng của Kafka nằm ở đâu, heap hay page cache? Heap lớn thì GC ra sao?
**Lập luận:** Vì dữ liệu nóng nằm ở page cache ngoài heap, RAM dành cho heap là RAM bị lấy khỏi page cache. Heap lớn còn kéo dài các lần GC. Nên thường chỉ cấp heap vài GB (ví dụ 6 GB) và để phần RAM còn lại cho OS làm cache.
**Đáp án ngắn:** Thường không tốt: heap lớn làm GC lâu và giành RAM của page cache, thứ Kafka thực sự dựa vào.

**Sai lầm hay gặp:** Trả lời "nhanh vì ghi vào RAM". Kafka ghi vào **file** thông qua page cache; điểm mấu chốt là tuần tự, gom batch và replication.

## 2. Hai consumer đọc cùng topic nhưng thấy thứ tự bản ghi khác nhau giữa các thực thể. Kafka đảm bảo thứ tự đến mức nào?

**Gợi ý suy luận:**
- Offset tăng dần được gán trong phạm vi nào, topic hay partition? (partition là một log)
- Hai partition có chung bộ đếm offset hay chung queue không?
- Muốn các bản ghi của một thực thể giữ thứ tự thì phải ép chúng vào đâu? (key, `hash(key) mod N`)

**Lập luận:** Vì mỗi partition là một log riêng với offset tăng dần, thứ tự chỉ được định nghĩa bằng vị trí trong log đó. Giữa các partition không có log chung nên không có thứ tự chung. Do đó muốn giữ thứ tự theo thực thể, ta ép mọi bản ghi của thực thể vào cùng một partition bằng key, vì `hash(key) mod N` luôn cho cùng kết quả. Đáp án là thứ tự chỉ đảm bảo trong từng partition. Điểm dễ nhầm là tin hai consumer cùng group hay cùng topic "đọc theo cùng một thứ tự toàn cục": mỗi partition độc lập, nên thứ tự tương đối giữa hai thực thể ở hai partition khác nhau không được định nghĩa. Khi thiết kế, quyết định trước đơn vị cần giữ thứ tự (đơn hàng, tài khoản) và dùng nó làm key; nếu thật sự cần thứ tự toàn cục thì phải chấp nhận một partition và mất khả năng đọc song song.

**Đáp án ngắn:** Chỉ đảm bảo thứ tự trong một partition. Cùng key thì cùng partition (`hash(key) mod số partition`) nên thứ tự theo key được giữ; không có thứ tự toàn topic.

**Ví dụ:** producer gửi hai lô cùng lúc (`max.in.flight.requests.per.connection=2`): lô 0 `[A,B]` bị mất gói rồi đến muộn nhờ retry, lô 1 `[C,D]` đến trước. Mô phỏng broker có và không có kiểm tra sequence của idempotent producer:

```text
idempotence = False
  batch seq=1 ['C', 'D'] -> nhan
  batch seq=0 ['A', 'B'] -> nhan
  log cuoi: ['C', 'D', 'A', 'B']          <- ĐẢO THỨ TỰ, cùng key vẫn sai
idempotence = True
  batch seq=1 -> OutOfOrderSequence, tu choi (producer gui lai theo thu tu)
  batch seq=0 ['A', 'B'] -> nhan
  batch seq=1 ['C', 'D'] -> nhan           (sau khi retry theo thứ tự)
  log cuoi: ['A', 'B', 'C', 'D']
```

_Đã chạy thử (python, mô phỏng đơn giản hóa kiểm tra sequence của broker)._ Với idempotence bật (mặc định từ Kafka 3.0, hiệu lực thực sự từ 3.0.1; kiểm tra lại theo phiên bản) và `max.in.flight ≤ 5`, broker dùng (PID, sequence) để giữ thứ tự khi retry.

**Nhớ:** Thứ tự = trong một partition; cùng key thì cùng partition. Xem [Kafka tổng quan](/go?p=06-Distributed-Systems%2FKafka%2Feasy%2Flt-01-kafka-tong-quan.md) và [Producer, Consumer và giao nhận](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md).

**Hỏi xoáy 1:** Đã dùng cùng key rồi mà thứ tự vẫn đảo, ngoài retry còn nguyên nhân nào?
**Gợi ý suy luận:** Điều gì đổi partition của key? Điều gì đưa một bản ghi sang đường khác? Điều gì xử lý parallel sau khi đọc?
**Lập luận:** Vì thứ tự dựa trên "cùng key, cùng partition, đọc tuần tự", phá một mắt xích là mất thứ tự. (a) Đổi số partition làm `hash mod N` đổi nên key chuyển partition (xem câu 11). (b) `@RetryableTopic` đưa bản ghi lỗi sang topic khác nên nó xử lý sau các bản ghi kế tiếp cùng key. (c) Consumer giao bản ghi cho pool nhiều thread thì thứ tự xử lý không còn là thứ tự đọc.
**Đáp án ngắn:** Đổi số partition, retry topic, và xử lý multithreading sau khi poll đều phá thứ tự theo key.

**Hỏi xoáy 2:** Nghiệp vụ đòi thứ tự toàn cục thì làm sao?
**Gợi ý suy luận:** Thứ tự toàn topic đòi hỏi mấy log? Nghiệp vụ thật sự cần thứ tự giữa những thực thể nào?
**Lập luận:** Vì thứ tự chỉ có trong một log, thứ tự toàn cục cần đúng một partition, tức hy sinh parallel. Nhưng hầu hết nghiệp vụ chỉ cần thứ tự theo thực thể (đơn hàng, tài khoản), mà điều đó đã đạt được bằng key.
**Đáp án ngắn:** Một partition duy nhất (mất parallel), hoặc xem lại yêu cầu vì thường chỉ cần thứ tự theo thực thể.

**Hỏi xoáy 3:** Nếu không đặt key (key `null`) thì sao?
**Gợi ý suy luận:** Khi không có key, producer chọn partition bằng gì?
**Lập luận:** Vì không có key để băm, producer phân phối theo chiến lược sticky/round-robin theo batch, nên các bản ghi liên quan rơi vào các partition khác nhau và không có đảm bảo thứ tự. Nếu thứ tự quan trọng thì phải có key.
**Đáp án ngắn:** Không đảm bảo thứ tự giữa các bản ghi liên quan; cần thứ tự thì phải đặt key.

**Sai lầm hay gặp:** Nghĩ Kafka giữ thứ tự thời gian gửi giữa các key khác nhau; hậu quả là thiết kế consumer giả định event của hai thực thể đến đúng thứ tự.

## 3. Đã đặt `acks=all` mà vẫn nghe chuyện mất dữ liệu. `acks=all` có nghĩa là không mất dữ liệu không?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Chữ "all" là tất cả bản sao theo replication factor, hay tất cả bản sao đang theo kịp? (ISR)
- ISR có cố định không? Nếu bản sao chậm bị loại, ISR co về mấy?
- Nếu ISR chỉ còn leader thì "chờ tất cả" khác gì `acks=1`? Cần đặt sàn ở đâu? (`min.insync.replicas`)

**Lập luận:** Vì "all" nghĩa là tất cả bản sao trong ISR hiện tại, và ISR co giãn (bản sao chậm bị loại), nên ISR có thể co về 1 và khi đó `acks=all` chỉ chờ leader, không khác `acks=1`. Muốn có cam kết thật phải đặt sàn cho kích thước ISR bằng `min.insync.replicas`: dưới sàn, broker từ chối ghi thay vì ghi lỏng lẻo. Nên cam kết thật sự là `acks=all` cộng `min.insync.replicas ≥ 2` (với RF=3). Điểm dễ nhầm là nghĩ `acks=all` một mình là đủ, đặc biệt khi ISR có thể co về 1 trong lúc broker lỗi hoặc nâng cấp cuốn chiếu. Cấu hình cam kết bền cần bộ ba: `acks=all`, `min.insync.replicas ≥ 2` với RF=3, và `unclean.leader.election.enable=false`; đổi lại, khi mất đủ broker thì ghi bị từ chối, nên ứng dụng phải xử lý `NotEnoughReplicas` (retry, báo lỗi) thay vì coi đó là sự cố bất thường.

**Đáp án ngắn:** Chưa chắc. "all" chỉ là tất cả bản sao trong ISR hiện tại; phải kèm `min.insync.replicas ≥ 2` (RF=3) để ISR không co về 1, nếu không broker từ chối ghi.

**Ví dụ:** RF=3, `min.insync.replicas=2`, `acks=all`. Mô phỏng từng bước (LEO = offset cuối của mỗi bản sao, HW = high watermark = min LEO trong ISR):

| Bước | ISR | LEO (B1/B2/B3) | HW | Kết quả |
|---|---|---|---|---|
| Khởi tạo | B1,B2,B3 | 0/0/0 | 0 | |
| Ghi 5 bản ghi | B1,B2,B3 | 5/5/5 | 5 | ack |
| B3 chậm, rời ISR; ghi thêm 3 | B1,B2 | 8/8/5 | 8 | ack (ISR=2 ≥ min=2) |
| B2 chết; thử ghi | B1 | 8/8/5 | 8 | **NotEnoughReplicas**, producer nhận lỗi |

```text
B3 roi ISR, ghi them 3      ISR=['B1', 'B2'] leader=B1 LEO={'B1': 8, 'B2': 8, 'B3': 5} HW=8
tu choi: NotEnoughReplicas (ISR=['B1'] < min.insync=2)
```

_Đã chạy thử (python, mô phỏng)._ Ghi chú: ở bước thứ ba các bản ghi offset 5..7 đã được **ack** khi ISR chỉ còn 2 broker; chúng chỉ nằm ở B1 và B2, B3 không có (xem hỏi xoáy 2).

**Nhớ:** `acks=all` bảo đảm "mọi bản sao trong ISR", độ bền thật đến từ `acks=all` cộng `min.insync.replicas`. Xem [Producer, Consumer và giao nhận](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md) và [Kafka bên trong](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-04-kafka-noi-bo-replication.md).

**Hỏi xoáy 1:** Với RF=3 và `min.insync.replicas=2`, hai broker sập cùng lúc thì chuyện gì xảy ra?
**Gợi ý suy luận:** ISR còn mấy? So với sàn thì sao? Dữ liệu đã ack trước đó nằm ở đâu?
**Lập luận:** Vì ISR còn 1 nhỏ hơn sàn 2, broker từ chối ghi và producer nhận `NotEnoughReplicas`. Dữ liệu đã ack trước đó vẫn còn trên broker sống sót. Vậy hệ thống giữ độ bền và đánh đổi bằng tính sẵn sàng ghi.
**Đáp án ngắn:** Không ghi được (`NotEnoughReplicas`), nhưng dữ liệu đã ack vẫn an toàn: ưu tiên độ bền hơn khả năng ghi.

**Hỏi xoáy 2:** Nếu thiết lập đúng như vậy thì dữ liệu đã ack có thể mất không, và khi nào?
**Gợi ý suy luận:** Ở bảng trên, bản ghi offset 5..7 nằm ở broker nào? Nếu hai broker đó sập và B3 quay lại làm leader thì B3 có những bản ghi nào? (`unclean.leader.election.enable`)
**Lập luận:** Vì B3 rời ISR từ lúc LEO=5, nó không có offset 5..7. Nếu B1 và B2 sập và `unclean.leader.election.enable=true`, B3 được bầu làm leader với LEO=5, nên 3 bản ghi đã ack biến mất. Với `unclean=false`, partition offline cho tới khi một broker thuộc ISR cũ sống lại và không mất gì. Hai nguyên nhân khác: `min.insync.replicas=1`, hoặc mất đồng thời nhiều broker trước khi flush.
**Đáp án ngắn:** Có: unclean leader election bật, `min.insync.replicas=1`, hoặc mất nhiều broker cùng lúc trước khi flush.

```text
unclean.leader.election=false: ISR rong -> partition offline cho den khi B1 hoac B2 (thuoc ISR cu) song lai; khong mat ban ghi da ack
unclean.leader.election=true : B3 thanh leader voi LEO=5; B1,B2 co LEO=8 -> MAT 3 ban ghi (offset 5..7) du producer da nhan ack acks=all
```

_Đã chạy thử (python, mô phỏng)._

**Hỏi xoáy 3:** Vậy cứ đặt `min.insync.replicas` thật cao cho an toàn?
**Gợi ý suy luận:** Sàn càng cao thì cần bao nhiêu broker sống mới ghi được? Khi nâng cấp cuốn chiếu, mỗi lúc tắt một broker thì sao?
**Lập luận:** Vì ghi chỉ được khi ISR ≥ sàn, sàn càng cao thì càng ít broker được phép lỗi. Đặt bằng RF thì mất một broker (kể cả lúc nâng cấp cuốn chiếu) là không ghi được.
**Đáp án ngắn:** Càng cao càng bền nhưng càng dễ mất khả năng ghi; cân bằng thường là RF=3, min=2.

**Sai lầm hay gặp:** Đặt `acks=all` rồi quên `min.insync.replicas` của topic (mặc định 1): hệ quả là tin rằng đã bền nhưng thực tế chỉ có một bản sao.

## 4. Producer retry vì mất ack thì bản ghi bị trùng. Idempotent producer chống trùng thế nào và giới hạn ở đâu?

**Gợi ý suy luận:**
- Khi ack bị mất, producer có biết bản ghi đã tới broker hay chưa? Vậy nó nên làm gì?
- Để broker nhận ra "bản này tôi đã ghi", mỗi bản ghi cần mang thông tin gì? (số thứ tự theo producer và partition)
- Thông tin đó sống bao lâu? Nếu producer khởi động lại thì định danh của nó ra sao?

**Lập luận:** Vì producer không phân biệt được "ack mất" với "bản ghi chưa tới", nó buộc phải retry, và retry tạo bản trùng. Để broker nhận ra trùng, broker cấp cho producer một PID và producer đánh sequence tăng dần theo từng partition. Broker nhớ sequence cuối của mỗi PID: trùng thì bỏ qua (vẫn ack), nhảy cóc thì từ chối. Nhưng chính vì key nhận biết là PID, và PID chỉ gắn với phiên của producer, nên chống trùng chỉ đúng trong một phiên và một partition. Điểm dễ nhầm là coi idempotent producer là "exactly-once" toàn bộ: nó chỉ chống trùng do retry trong một phiên và một partition, còn trùng ở consumer hay giữa các lần restart thì không. Khi review, ghi rõ ở từng đoạn của đường dữ liệu (producer tới broker, broker tới consumer, consumer tới đích) ai bảo đảm không trùng, và đoạn nào dựa vào idempotency của chính ứng dụng.

**Đáp án ngắn:** Broker cấp PID, producer gán sequence tăng dần cho mỗi partition, broker bỏ qua bản trùng và từ chối nhảy cóc. Kết quả là không trùng và đúng thứ tự trong một phiên, một partition; không chống được trùng xuyên phiên.

**Ví dụ:**

```text
Producer PID=7 gui seq=0 'A'; broker ghi xong nhung ack bi mat mang
Producer retry seq=0 'A' -> ack (trung, khong ghi lai)
log: ['A']

Producer khoi dong lai -> PID moi=8, gui lai 'A' (ung dung gui lai)
seq=0 'A' -> ack | log: ['A', 'A']   <- TRUNG, idempotence khong chong duoc xuyen phien
```

_Đã chạy thử (python, mô phỏng PID/sequence)._

**Nhớ:** Idempotent producer = (PID, sequence), phạm vi một phiên và một partition. Xem [Producer, Consumer và giao nhận](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md) và [Exactly-once và vận hành](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md).

**Hỏi xoáy 1:** Từ ví dụ trên: producer khởi động lại thì sao, làm cách nào bền qua restart?
**Gợi ý suy luận:** Cái gì làm broker nhận ra "producer cũ"? Có định danh nào ổn định qua lần khởi động không?
**Lập luận:** Vì restart cấp PID mới nên broker không nối được với bản ghi cũ. Muốn nối được, cần một định danh ổn định: `transactional.id` (PID gắn với id này) hoặc business key ở tầng ứng dụng.
**Đáp án ngắn:** Nhận PID mới nên không chống được trùng; dùng transaction với `transactional.id` ổn định hoặc idempotency ở tầng ứng dụng.

**Hỏi xoáy 2:** Idempotence có chống được việc consumer xử lý lại cùng một bản ghi không?
**Gợi ý suy luận:** Idempotence nằm ở phía producer hay consumer? Trùng ở consumer đến từ đâu? (commit offset, xem câu 5)
**Lập luận:** Vì idempotence chỉ bảo vệ đường producer tới broker, còn trùng ở consumer sinh ra do xử lý rồi chưa kịp commit, hai việc này khác tầng. Nên phải xử lý idempotent ở đích.
**Đáp án ngắn:** Không, đó là bài toán at-least-once phía consumer (câu 5).

**Hỏi xoáy 3:** Bật idempotence thì ràng buộc cấu hình gì?
**Gợi ý suy luận:** Để giữ thứ tự và không mất ack khi retry thì cần ack mức nào, retry ra sao, số lô parallel tối đa bao nhiêu?
**Lập luận:** Vì broker phải xác nhận đủ bản sao và producer phải được retry, cần `acks=all`, `retries > 0`, và `max.in.flight.requests.per.connection ≤ 5` (giới hạn broker theo dõi sequence). Cấu hình mâu thuẫn (ví dụ `acks=1` khi bật idempotence tường minh) khiến client báo lỗi hoặc tắt tùy phiên bản; kiểm tra lại theo phiên bản.
**Đáp án ngắn:** `acks=all`, `retries > 0`, `max.in.flight ≤ 5`.

**Sai lầm hay gặp:** Cho rằng bật idempotence là có exactly-once đầu-cuối; hậu quả là bỏ qua việc làm consumer idempotent.

## 5. Consumer sập giữa chừng, khởi động lại thì mất tin hoặc xử lý trùng. Điều gì quyết định chiều hỏng?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Kafka biết điều gì: "bạn đã xử lý xong" hay chỉ "offset nào đã commit"?
- "Xử lý" (ở đích ngoài Kafka) và "commit offset" có thể là một thao tác nguyên tử không?
- Nếu hai việc không nguyên tử, thì thứ tự của chúng quyết định điều gì khi sập ở giữa?

**Lập luận:** Vì Kafka chỉ biết offset đã commit và đích xử lý nằm ngoài Kafka, hai việc xử lý và commit không thể nguyên tử với nhau, nên luôn có một khoảng ở giữa mà process sập được. Nếu commit trước rồi mới xử lý, sập ở giữa thì bản ghi đã được coi là xong nhưng chưa làm, nên mất (at-most-once). Nếu xử lý trước rồi mới commit, sập ở giữa thì khởi động lại đọc lại từ offset cũ nên xử lý trùng (at-least-once). Auto commit làm ranh giới này mờ vì commit chạy theo đồng hồ chứ không theo tiến độ xử lý. Điểm dễ nhầm là bật auto-commit rồi tin nó "an toàn mặc định": commit chạy theo đồng hồ chứ không theo tiến độ xử lý, nên có thể commit cả lô chưa xử lý xong, hoặc xử lý xong mà chưa commit. Khi thiết kế, tắt auto-commit cho dữ liệu quan trọng, commit sau khi xử lý xong, và làm bước xử lý idempotent để at-least-once không gây hậu quả khi trùng.

**Đáp án ngắn:** Thứ tự xử lý và commit. Commit trước thì sập là mất (at-most-once); xử lý trước, commit sau thì sập là trùng (at-least-once). Vì vậy phải xử lý idempotent.

**Ví dụ:** 6 bản ghi (offset 10..15), consumer sập tại bản ghi offset 12:

```text
commit_truoc: da xu ly truoc khi sap=[10, 11]; offset da commit=13; sau restart doc lai=[13, 14, 15]
   -> MAT: [12]   TRUNG: []
xu_ly_truoc: da xu ly truoc khi sap=[10, 11, 12]; offset da commit=12; sau restart doc lai=[12, 13, 14, 15]
   -> MAT: []   TRUNG: [12]
```

_Đã chạy thử (python)._ Đây là thử nghiệm tối thiểu: ở at-least-once, bản ghi 12 đã được xử lý nhưng chưa commit nên bị xử lý lại; ở at-most-once, bản ghi 12 đã bị coi là xong dù chưa xử lý nên không bao giờ được xử lý.

Cách viết đúng (at-least-once, commit thủ công):

```java
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
while (true) {
    ConsumerRecords<String, String> recs = consumer.poll(Duration.ofMillis(500));
    // xử lý TRƯỚC
    for (ConsumerRecord<String, String> r : recs) handleIdempotently(r);
    // commit SAU (offset+1 được thư viện tự tính)
    consumer.commitSync();
}
```

_Minh họa, chưa chạy thử trong môi trường này._

**Nhớ:** Xử lý và commit không nguyên tử; commit sau xử lý thì được at-least-once, và lấy idempotent làm lưới đỡ. Xem [Producer, Consumer và giao nhận](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md).

**Hỏi xoáy 1:** Auto commit gây mất tin ở kịch bản cụ thể nào?
**Gợi ý suy luận:** Auto commit chạy theo đồng hồ ở lần `poll` kế tiếp. Nếu việc xử lý được giao sang thread khác thì lúc commit, thread kia đã xong chưa?
**Lập luận:** Vì auto commit commit offset của cả lô ở vòng `poll` tiếp theo, trong khi thread khác có thể vẫn đang xử lý, nên process sập thì tin đã commit mà chưa xử lý, đúng kịch bản "commit trước" ở trên.
**Đáp án ngắn:** Giao lô cho thread async, `poll` kế tiếp tự commit cả lô, sập trước khi thread kia xong thì mất tin.

**Hỏi xoáy 2:** Ngoài sập, còn khi nào xử lý trùng?
**Gợi ý suy luận:** Khi partition chuyển từ consumer này sang consumer khác thì consumer mới bắt đầu đọc từ đâu? (rebalance, câu 6)
**Lập luận:** Vì consumer mới đọc từ offset đã commit, nếu consumer cũ chưa kịp commit phần đã xử lý thì phần đó bị đọc lại. Commit trong `onPartitionsRevoked` giảm nhưng không loại bỏ hẳn.
**Đáp án ngắn:** Rebalance: partition đổi chủ trước khi consumer cũ commit kịp.

**Hỏi xoáy 3:** Đã chấp nhận có thể trùng, thiết kế thế nào để trùng không gây hại?
**Gợi ý suy luận:** Làm sao đích nhận ra "việc này làm rồi"? Có thể kiểm tra và ghi trong cùng transaction không?
**Lập luận:** Vì trùng không tránh được, ta làm đích idempotent: dùng key tự nhiên với upsert (`INSERT ... ON CONFLICT DO NOTHING`), hoặc bảng `processed_event(event_id PRIMARY KEY)` ghi cùng transaction DB với nghiệp vụ, hoặc cập nhật có điều kiện theo phiên bản.
**Đáp án ngắn:** Xử lý idempotent ở đích: unique key, upsert hoặc bảng event đã xử lý trong cùng transaction.

**Sai lầm hay gặp:** Commit bằng offset của bản ghi vừa xử lý thay vì **offset + 1**: lần khởi động sau đọc lại đúng bản ghi cuối cùng đã xử lý (ví dụ commit 15 thay vì 16 làm bản ghi offset 15 bị xử lý lại).

## 6. Consumer group cứ rebalance liên tục, partition bị chuyển qua lại. Vì sao, và giảm bằng cách nào?

**Gợi ý suy luận:**
- Làm sao group coordinator biết một thành viên còn sống? Có mấy "đồng hồ" độc lập? (heartbeat, `max.poll.interval.ms`)
- Nếu xử lý một lô mất lâu hơn khoảng cho phép giữa hai lần `poll` thì coordinator kết luận gì?
- Partition của consumer bị loại được giao cho ai, và họ đọc lại từ đâu?

**Lập luận:** Vì coordinator cần biết thành viên còn sống và còn tiến triển, nó có hai đồng hồ: heartbeat từ thread nền chứng minh process sống, và khoảng giữa hai lần `poll` chứng minh thread xử lý còn chạy. Hễ một trong hai quá hạn, thành viên bị coi là chết và partition bị chia lại. Nếu xử lý một lô chậm hơn `max.poll.interval.ms`, consumer bị loại, partition giao cho người khác, họ đọc lại đúng lô chưa commit, cũng quá hạn và bị loại, rồi lặp mãi. Vậy nguyên nhân gốc thường là xử lý chậm so với khoảng cho phép, không phải mạng chập chờn, và cách chữa là giảm lượng việc mỗi lần `poll` hoặc tách việc nặng khỏi vòng `poll`.

**Đáp án ngắn:** Thường do xử lý một lô lâu hơn `max.poll.interval.ms` nên consumer bị loại và lô bị giao lại, lặp vô hạn. Giảm `max.poll.records`, tách việc nặng ra thread riêng (có `pause`/`resume`), dùng static membership và cooperative assignor.

**Ví dụ:** mỗi bản ghi cần 800 ms (gọi dịch vụ ngoài), `max.poll.records=500` (mặc định), `max.poll.interval.ms=300000` (5 phút):

```text
xu ly 1 lo = 500 x 800ms = 400s ; max.poll.interval.ms = 300s -> VUOT => bi day khoi group
max.poll.records an toan (chiem <=50% khoang) ~ 187
```

_Đã chạy thử (python, phép tính)._ Lifecycle lỗi: consumer xử lý 400 s → quá 300 s → bị loại → partition giao cho người khác → họ đọc lại **cùng lô chưa commit** → họ cũng quá hạn → lặp mãi. Sửa:

```properties
max.poll.records=100            # 100 x 0,8s = 80s, còn dư rất xa khoảng 300s
# hoặc đưa việc nặng sang luồng riêng và dùng pause()/resume()
# static membership: khởi động lại nhanh không kích hoạt rebalance
group.instance.id=orders-consumer-1
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor
```

_Minh họa, chưa chạy thử trong môi trường này._ Với Kafka 4.0, giao thức mới (KIP-848) bật bằng `group.protocol=consumer` (kiểm tra lại theo phiên bản của client và broker).

**Nhớ:** Rebalance xảy ra khi thành viên vào/ra/bị coi là chết; chết được đo bằng heartbeat và `max.poll.interval.ms`. Xem [Producer, Consumer và giao nhận](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md) và [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md).

**Hỏi xoáy 1:** Hai cơ chế "chết" nói trên khác nhau thế nào?
**Gợi ý suy luận:** Heartbeat chạy ở thread nào? Một process khỏe mà thread xử lý kẹt thì heartbeat còn gửi được không?
**Lập luận:** Vì heartbeat chạy ở thread nền, nó vẫn gửi đều dù thread xử lý kẹt, nên chỉ chứng minh process sống (chu kỳ `heartbeat.interval.ms`, hạn `session.timeout.ms`). `max.poll.interval.ms` chứng minh thread xử lý còn tiến triển. Do đó process khỏe nhưng kẹt trong xử lý (ví dụ chờ một HTTP bị treo) vẫn bị đẩy khỏi group. Điểm dễ nhầm là tăng `session.timeout.ms` để hết rebalance trong khi nguyên nhân thật là xử lý một lô quá lâu: heartbeat vẫn gửi nhưng `max.poll.interval.ms` bị vượt. Cách chữa đúng là giảm `max.poll.records` hoặc rút ngắn xử lý (đưa lời gọi chậm ra ngoài vòng `poll`), dùng cooperative rebalance và `group.instance.id` để restart không làm đổi chủ partition.
**Đáp án ngắn:** Heartbeat = process còn sống; `max.poll.interval.ms` = thread xử lý còn tiến triển.

**Hỏi xoáy 2:** Khi rebalance xảy ra, cooperative rebalance và KIP-848 khác kiểu cũ ở chỗ nào?
**Gợi ý suy luận:** Kiểu cũ có cần mọi consumer trả lại toàn bộ partition không? Có cách nào chỉ chuyển phần cần chuyển?
**Lập luận:** Vì kiểu eager cũ bắt mọi consumer thu hồi toàn bộ partition rồi nhận lại, cả group đứng yên một lúc (stop-the-world). Cooperative chỉ chuyển phần partition cần chuyển, phần còn lại chạy tiếp. KIP-848 chuyển phần lớn điều phối sang broker và bỏ rào chắn đồng bộ toàn group.
**Đáp án ngắn:** Eager thu hồi hết rồi chia lại; cooperative chỉ chuyển phần cần chuyển; KIP-848 đẩy điều phối sang broker.

**Hỏi xoáy 3:** Xử lý nặng thì đẩy sang thread riêng được không?
**Gợi ý suy luận:** Vòng `poll` phải tiếp tục để không quá hạn. Khi nào được phép commit? Partition bị thu hồi giữa chừng thì sao?
**Lập luận:** Vì `poll` phải được gọi đều, ta dùng `pause` partition khi thread riêng còn bận; vì commit chỉ đúng khi việc đã xong, ta commit sau khi thread xử lý hoàn tất; và vì partition có thể bị thu hồi giữa chừng, phải xử lý trường hợp đó. Làm sai thì sinh mất hoặc trùng tin.
**Đáp án ngắn:** Được, nhưng vẫn `poll` đều (có `pause`), chỉ commit sau khi xong, và xử lý việc partition bị thu hồi.

**Sai lầm hay gặp:** Tăng `session.timeout.ms` để "chữa" rebalance trong khi nguyên nhân là xử lý chậm; chỉ làm phát hiện consumer chết chậm hơn.

## 7. Consumer lag đang tăng. Chẩn đoán từng bước thế nào?

**Gợi ý suy luận:**
- Lag được tính bằng hiệu của hai offset nào? Khi nào nó tăng? (tốc độ vào so với tốc độ ra)
- Lag tăng ở mọi partition hay chỉ một vài partition? Hai trường hợp này gợi ý nguyên nhân gì khác nhau?
- Nếu lag toàn cục, tốc độ xử lý hơn tốc độ vào bao nhiêu thì mới đuổi kịp, và mất bao lâu?

**Lập luận:** Vì lag = `log-end-offset − committed offset`, nó tăng khi tốc độ vào lớn hơn tốc độ ra. Việc đầu tiên là xem lag ở mọi partition hay chỉ vài partition. Nếu chỉ vài partition, ta nghi key lệch (hot partition) hoặc một bản ghi nặng/độc kẹt consumer của partition đó, không phải thiếu công suất chung. Nếu lag đều, ta nghi tổng công suất consumer, nút thắt downstream, hoặc rebalance liên tục. Thời gian đuổi kịp bằng lag chia cho phần dư công suất, nên dư ít thì đuổi rất lâu. Điểm dễ nhầm là thêm consumer ngay khi thấy lag tăng: nếu lag chỉ ở vài partition (key lệch, bản ghi độc) hoặc nút thắt ở downstream thì thêm consumer không giúp, còn nếu consumer đã bằng số partition thì cũng vô ích. Hãy chẩn đoán theo thứ tự: lag đều hay lệch, consumer có rebalance liên tục không, thời gian xử lý mỗi bản ghi và downstream, rồi mới quyết định tăng partition và consumer có kế hoạch.

**Đáp án ngắn:** Dùng `kafka-consumer-groups.sh --describe`, metric `records-lag-max`, log rebalance và thread dump. Xem lag lệch hay đều: lệch thì hot partition hoặc bản ghi độc; đều thì thiếu công suất hoặc nút thắt downstream.

**Ví dụ:** output minh họa (định dạng có thể khác theo phiên bản):

```text
$ kafka-consumer-groups.sh --bootstrap-server b1:9092 --describe --group payments
GROUP     TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG      CONSUMER-ID
payments  orders  0          1,204,330       1,204,361       31       c-1
payments  orders  1          1,198,002       1,198,020       18       c-2
payments  orders  2            402,118       1,801,774       1,399,656  c-3     <-- chỉ partition 2 lag
```

_Minh họa, chưa chạy thử trong môi trường này._ Chỉ partition 2 lag → nghi key lệch (hot partition) hoặc bản ghi nặng/độc kẹt c-3, không phải thiếu công suất nói chung.

Tính thời gian đuổi kịp khi lag là toàn cục: produce 12.000 bản ghi/s, consume 9.000/s trong 10 phút, rồi scale consumer lên 15.000/s:

```text
produce=12000/s consume=9000/s -> lag tang 3000/s: sau 10 phut lag=1,800,000
scale consumer len 15000/s: thoi gian duoi kip = lag/(consume-produce) = 1,800,000/3,000 = 600s (10.0 phut)
```

_Đã chạy thử (python, phép tính)._ Quan trọng: nếu chỉ tăng tới 12.500/s (dư 500/s) thì cần 1.800.000 / 500 = 3.600 s (1 giờ); dư càng ít đuổi kịp càng lâu.

**Nhớ:** Lag tăng khi vào > ra; phân biệt lag lệch (một partition) với lag đều. Xem [Kafka bên trong](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-04-kafka-noi-bo-replication.md) và [Exactly-once và vận hành](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md).

**Hỏi xoáy 1:** Chỉ một partition lag thì nghi gì?
**Gợi ý suy luận:** Một partition nhận bản ghi theo key. Nếu một key chiếm phần lớn lưu lượng thì partition nào gánh? Một bản ghi nặng làm consumer của partition đó thế nào?
**Lập luận:** Vì cùng key đi cùng partition, key lệch (ví dụ một khách hàng lớn chiếm 80% lưu lượng) làm một partition quá tải. Một bản ghi nặng hoặc độc cũng chỉ chặn consumer giữ partition đó. Nên kiểm tra phân bố key và bản ghi tại offset đang đứng; cân nhắc thêm hậu tố vào key để rải nếu thứ tự cho phép.
**Đáp án ngắn:** Hot partition do key lệch, hoặc một bản ghi nặng/độc kẹt consumer của partition đó.

**Hỏi xoáy 2:** Lag tăng mà consumer lại đang rảnh?
**Gợi ý suy luận:** Điều gì chặn consumer đọc dù còn dữ liệu? (`read_committed` và LSO, rebalance liên tục, fetch bảo thủ)
**Lập luận:** Vì consumer `read_committed` chỉ đọc tới LSO (last stable offset), một transaction mở lâu giữ LSO lại nên consumer không đọc qua nó. Hoặc consumer đang rebalance liên tục nên không giữ partition nào, hoặc cấu hình fetch quá bảo thủ.
**Đáp án ngắn:** Transaction mở lâu giữ LSO, rebalance liên tục, hoặc cấu hình fetch quá bảo thủ.

**Hỏi xoáy 3:** Đã thêm consumer mà lag không giảm?
**Gợi ý suy luận:** Số consumer hữu ích tối đa trong một group bằng gì? Nếu chậm ở DB thì thêm consumer làm gì với DB?
**Lập luận:** Vì mỗi partition chỉ được một consumer trong group đọc, consumer vượt số partition ngồi không. Còn nếu nút thắt ở downstream (DB, API) thì thêm consumer chỉ tăng tải cho nó. Giải pháp: ghi theo batch, tối ưu truy vấn, tăng partition có kế hoạch (câu 11).
**Đáp án ngắn:** Consumer đã bằng số partition, hoặc nút thắt ở downstream.

**Sai lầm hay gặp:** Chỉ nhìn lag theo số bản ghi; cần nhìn cả **tuổi** của bản ghi cũ nhất chưa xử lý (1 triệu bản ghi lag ở tốc độ 100k/s chỉ là 10 giây, nhưng 1.000 bản ghi ở tốc độ 1/s là 17 phút).

## 8. Gửi output rồi mới commit offset thì sập sẽ ra trùng. "Exactly-once" của Kafka thực sự là gì?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Trong vòng consume-transform-produce, có hai việc nào phải xảy ra cùng nhau? (ghi kết quả, ghi lại đã đọc đến đâu)
- Nếu hai việc đó nằm trong cùng một hệ có transaction thì có làm nguyên tử được không? Nếu đích là hệ khác thì sao?
- Consumer cần đọc kiểu gì để không thấy dữ liệu của transaction chưa commit? (`read_committed`)

**Lập luận:** Vì sập giữa "gửi output" và "commit offset" gây trùng, cách chữa là làm hai việc này nguyên tử. Cả output (topic Kafka) và offset (cũng là topic Kafka) cùng nằm trong Kafka, nên transaction Kafka gom chúng làm một: cùng commit hoặc cùng hủy. Idempotent producer chống trùng do retry, và consumer `read_committed` chỉ thấy dữ liệu đã commit. Do đó ta đạt "hiệu ứng đúng một lần" trong phạm vi Kafka. Nếu đích là DB ngoài thì Kafka không thể gom hai hệ vào một transaction, nên chỉ còn at-least-once cộng idempotent ở đích. Điểm dễ nhầm là nghĩ bật "exactly-once" là ứng dụng không bao giờ trùng: nó chỉ bao trùm chuỗi đọc Kafka, xử lý, ghi Kafka, còn tác động ra ngoài (ghi DB, gọi API, gửi email) vẫn có thể lặp. Khi review, với mỗi tác động ngoài Kafka hỏi nó có idempotent không, và nhớ transaction có chi phí (độ trễ, `transactional.id` ổn định cho mỗi instance), nên chỉ dùng khi thực sự cần.

**Đáp án ngắn:** Hiệu ứng ghi đúng một lần trong phạm vi Kafka, nhờ idempotent producer, transaction ghi output cùng offset của consumer, và consumer `read_committed`. Kafka Streams bật bằng `processing.guarantee=exactly_once_v2`. Không bao trùm DB ngoài.

**Ví dụ:** consume-transform-produce, sập sau khi gửi output nhưng trước khi commit offset:

```text
khong transaction (gui roi moi commit offset) -> output = ['A', 'B', 'A', 'B', 'C'] offset = 3
transaction (output+offset nguyen tu)        -> output = ['A', 'B', 'C'] offset = 3
```

_Đã chạy thử (python, mô phỏng)._ Không transaction: `A,B` đã gửi rồi, offset chưa tiến, restart xử lý lại `A,B` → trùng. Có transaction: output của lô chưa commit bị **hủy** cùng offset, lần chạy lại tạo output đúng một lần.

```java
// transactional.id ổn định, duy nhất mỗi instance
producer.initTransactions();
while (true) {
    // isolation.level=read_committed, auto-commit=false
    var recs = consumer.poll(Duration.ofMillis(500));
    if (recs.isEmpty()) continue;
    producer.beginTransaction();
    try {
        for (var r : recs) producer.send(new ProducerRecord<>("out", r.key(), transform(r.value())));
        producer.sendOffsetsToTransaction(offsetsOf(recs), consumer.groupMetadata());
        producer.commitTransaction();
    } catch (ProducerFencedException e) { producer.close(); throw e; }
    catch (KafkaException e) { producer.abortTransaction(); /* seek về offset đã commit */ }
}
```

_Minh họa, chưa chạy thử trong môi trường này._

**Nhớ:** Exactly-once = nguyên tử giữa "ghi kết quả" và "ghi offset" trong Kafka; có phạm vi. Xem [Exactly-once và vận hành](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md).

**Hỏi xoáy 1:** Trong đoạn code trên, `sendOffsetsToTransaction` đóng vai trò gì?
**Gợi ý suy luận:** Offset đã đọc của input thường commit riêng. Nếu đưa nó vào cùng transaction với output thì hai thứ có số phận ra sao?
**Lập luận:** Vì offset input được gom vào cùng transaction với output, chúng cùng commit hoặc cùng hủy. Nên sập ở đâu cũng không có trạng thái "đã ghi output mà chưa tiến offset", và đó là mắt xích biến at-least-once thành hiệu ứng đúng một lần.
**Đáp án ngắn:** Đưa offset đã đọc vào cùng transaction với output để chúng nguyên tử.

**Hỏi xoáy 2:** Nếu kết quả ghi vào database ngoài thay vì topic Kafka?
**Gợi ý suy luận:** Transaction Kafka có phạm vi nào? Làm sao đặt "dữ liệu" và "vị trí đã đọc" vào cùng một hệ?
**Lập luận:** Vì transaction Kafka không bao trùm DB, ta không gom được hai hệ. Nên hoặc làm DB idempotent (unique key, upsert), hoặc lưu offset trong cùng transaction DB với dữ liệu rồi `seek` từ DB khi khởi động. Không làm vậy thì chỉ là at-least-once.
**Đáp án ngắn:** Phải idempotent ở DB hoặc lưu offset cùng transaction DB; nếu không chỉ là at-least-once.

**Hỏi xoáy 3:** `transactional.id` đặt sai thì xảy ra gì?
**Gợi ý suy luận:** Làm sao Kafka chặn producer "zombie" cũ? (epoch gắn với id) Hai instance dùng chung id thì sao? Id đổi mỗi lần chạy thì sao?
**Lập luận:** Vì Kafka chặn zombie bằng epoch của cùng một id, hai instance cùng id sẽ fence nhau liên tục. Còn id đổi mỗi lần khởi động thì bản zombie cũ mang id khác nên không bị block. Cần id ổn định và duy nhất mỗi instance (ví dụ gắn với partition được giao).
**Đáp án ngắn:** Cùng id: fence nhau; id đổi mỗi lần: zombie không bị block. Cần id ổn định, duy nhất mỗi instance.

**Sai lầm hay gặp:** Trả lời "Kafka hỗ trợ exactly-once" mà không nêu giới hạn phạm vi; người nghe hiểu là hệ thống end-to-end không bao giờ trùng.

## 9. Vì sao consumer không thấy bản ghi mới nhất dù leader đã có? ISR, high watermark và leader election liên hệ thế nào?

**Gợi ý suy luận:**
- Nếu leader sập ngay sau khi consumer đọc một bản ghi mà follower chưa có thì chuyện gì với bản ghi đó?
- Ranh giới "bản ghi an toàn" nên được đặt ở đâu so với các bản sao theo kịp? (HW, min LEO của ISR)
- Leader mới nên chọn từ tập nào để chắc chắn có mọi bản ghi tới ranh giới đó?

**Lập luận:** Vì leader sập có thể làm mất bản ghi mà follower chưa có, lộ bản ghi đó cho consumer là nguy hiểm: consumer sẽ thấy lịch sử "đổi" sau khi leader mới lên. Nên Kafka chỉ cho consumer đọc tới high watermark (HW) = min LEO của các bản sao trong ISR, chính là phần mà mọi bản sao theo kịp đã có. Vì ISR chắc chắn có mọi bản ghi tới HW, leader mới luôn được bầu từ ISR.

**Đáp án ngắn:** Follower sao chép từ leader, ISR là tập bản sao theo kịp, HW = min(LEO trong ISR) và consumer chỉ đọc tới HW. Leader sập thì controller bầu leader mới từ ISR.

**Ví dụ (dùng lại bảng ở câu 3):** sau khi B3 rời ISR, `LEO={B1:8, B2:8, B3:5}`, HW=8 vì chỉ xét ISR=[B1,B2]. Nếu B3 vẫn trong ISR thì HW=5 và consumer chỉ đọc tới offset 4: **một follower chậm kìm HW lại**, đó là lý do `replica.lag.time.max.ms` loại follower chậm khỏi ISR (30 giây mặc định ở các bản gần đây; kiểm tra lại theo phiên bản).

**Nhớ:** HW là ranh giới an toàn; leader mới đến từ ISR. Xem [Kafka bên trong](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-04-kafka-noi-bo-replication.md).

**Hỏi xoáy 1:** Vì sao consumer không đọc được bản ghi mới nhất chỉ có ở leader?
**Gợi ý suy luận:** Nếu leader sập, bản ghi đó còn ở đâu? Consumer đã thấy nó rồi thì thấy gì sau khi leader mới lên?
**Lập luận:** Vì bản ghi chỉ có ở leader sẽ mất khi leader sập, consumer đã thấy nó sẽ thấy lịch sử bị đổi khi leader mới lên. HW chặn rủi ro này.
**Đáp án ngắn:** Để tránh lộ bản ghi có thể biến mất nếu leader sập; HW chặn việc đó.

**Hỏi xoáy 2:** Một follower bị chậm thì chuyện gì?
**Gợi ý suy luận:** Follower chậm kìm HW ra sao? Cơ chế nào đưa nó ra khỏi ISR, và ISR co thì `acks=all` đổi thế nào?
**Lập luận:** Vì follower chậm kìm HW, nó bị loại khỏi ISR khi tụt quá `replica.lag.time.max.ms`. ISR co lại nên `acks=all` chỉ chờ các bản sao còn lại; nếu dưới `min.insync.replicas` thì ghi bị từ chối.
**Đáp án ngắn:** Bị loại khỏi ISR, ISR co lại, và nếu dưới sàn thì ghi bị từ chối.

**Hỏi xoáy 3:** Nếu chỉ dùng HW để cắt log khi bản sao cũ quay lại, có vấn đề gì? Leader epoch giải quyết thế nào?
**Gợi ý suy luận:** HW có thể chưa cập nhật kịp khi leader đổi. Làm sao biết chính xác điểm phân kỳ giữa hai log?
**Lập luận:** Vì HW có thể chưa cập nhật đúng lúc leader đổi, cắt log theo HW có thể mất hoặc lệch dữ liệu. Leader epoch gán số thế hệ cho mỗi lần đổi leader; bản sao quay lại hỏi leader mới "epoch của tôi kết thúc ở offset nào" và cắt log đúng điểm phân kỳ.
**Đáp án ngắn:** Leader epoch cho biết đúng điểm phân kỳ, tránh dựa vào HW dễ lệch khi đổi leader.

**Sai lầm hay gặp:** Coi ISR là tập cố định bằng replication factor; hậu quả là đánh giá sai độ bền khi ISR đã co.

## 10. Toàn bộ ISR mất hết, partition offline. Có nên bật unclean leader election để hồi phục nhanh?

**Gợi ý suy luận:**
- Khi không còn bản sao ISR nào, ta còn hai lựa chọn nào? (chờ, hoặc chọn bản sao lạc hậu)
- Mỗi lựa chọn đánh đổi giữa nhất quán và sẵn sàng ra sao? (CAP thu nhỏ)
- Bản sao lạc hậu thiếu những bản ghi nào, và khi nó thành leader thì các bản sao đầy đủ làm gì?

**Lập luận:** Vì không còn ISR, hoặc ta chờ một bản sao ISR cũ sống lại (partition offline, không mất dữ liệu), hoặc chọn bản sao lạc hậu còn sống (sống ngay nhưng thiếu các bản ghi nó chưa nhận). Đó là CAP thu nhỏ: giữ nhất quán thì mất sẵn sàng, ngược lại thì mất dữ liệu. Nếu chọn bản sao lạc hậu, các broker đầy đủ quay lại làm follower sẽ cắt log về điểm phân kỳ, nên bản ghi đã ack nhưng nó thiếu mất vĩnh viễn. Do đó mặc định `unclean.leader.election.enable=false`.

**Đáp án ngắn:** Mặc định tắt: partition offline đến khi một bản sao ISR cũ trở lại, không mất dữ liệu. Bật thì sống ngay nhưng mất các bản ghi bản sao lạc hậu chưa có, kể cả bản đã ack.

**Ví dụ:** dùng đúng mô phỏng ở câu 3:

```text
unclean.leader.election=false: ISR rong -> partition offline cho den khi B1 hoac B2 (thuoc ISR cu) song lai; khong mat ban ghi da ack
unclean.leader.election=true : B3 thanh leader voi LEO=5; B1,B2 co LEO=8 -> MAT 3 ban ghi (offset 5..7) du producer da nhan ack acks=all
```

_Đã chạy thử (python, mô phỏng)._ Sau đó, khi B1/B2 quay lại làm follower của B3, chúng **cắt log** về điểm phân kỳ nên 3 bản ghi này mất vĩnh viễn.

**Nhớ:** Unclean election = đổi dữ liệu lấy sẵn sàng. Xem [Kafka bên trong](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-04-kafka-noi-bo-replication.md).

**Hỏi xoáy 1:** Khi nào chấp nhận bật?
**Gợi ý suy luận:** Loại dữ liệu nào mất vài bản ghi vẫn ổn, loại nào thì không?
**Lập luận:** Vì bật là chấp nhận mất dữ liệu đã ack, chỉ hợp với dữ liệu chịu mất để đổi sẵn sàng (metric, log truy cập), không hợp với transaction tài chính.
**Đáp án ngắn:** Với dữ liệu chấp nhận mất (metric, log truy cập); không cho transaction tài chính.

**Hỏi xoáy 2:** Hậu quả cho consumer đã commit offset 8 nhưng log mới chỉ tới 5?
**Gợi ý suy luận:** Offset đã commit nằm ngoài phạm vi log mới. Consumer xử lý tình huống này bằng cấu hình nào? (`auto.offset.reset`)
**Lập luận:** Vì offset 8 vượt cuối log là 5, consumer gặp `OffsetOutOfRange` và hành xử theo `auto.offset.reset`: `latest` có thể bỏ qua dữ liệu, `earliest` đọc lại từ đầu.
**Đáp án ngắn:** `OffsetOutOfRange`, xử lý theo `auto.offset.reset` (bỏ qua hoặc đọc lại từ đầu).

**Hỏi xoáy 3:** Kafka 4.0 có cải thiện gì?
**Gợi ý suy luận:** Nếu có tập bản sao được bảo đảm có dữ liệu tới HW thì bầu từ đó an toàn hơn thế nào?
**Lập luận:** Vì vấn đề gốc là bầu nhầm bản sao thiếu dữ liệu, ELR (Eligible Leader Replicas, KIP-966) giữ tập bản sao chắc chắn có dữ liệu tới HW để bầu an toàn hơn. Ở 4.0 vẫn là preview (kiểm tra lại theo phiên bản bạn dùng).
**Đáp án ngắn:** ELR (KIP-966) bầu leader từ tập bản sao chắc chắn đủ dữ liệu; còn preview ở 4.0.

**Sai lầm hay gặp:** Bật unclean election để "hồi phục nhanh" mà không nhận ra đang đánh đổi dữ liệu đã ack.

## 11. Topic đang chạy bị lag, tăng số partition để "chữa" có an toàn không?

**Gợi ý suy luận:**
- Partition của một bản ghi có key được chọn bằng công thức nào? (`hash(key) mod N`)
- Đổi N thì kết quả của phép chia dư đổi ra sao với các key cũ?
- Bản ghi cũ ở partition cũ còn bản mới ở partition mới thì thứ tự và trạng thái theo key thế nào?

**Lập luận:** Vì partition = `hash(key) mod N`, đổi N làm phép chia dư đổi, nên nhiều key rơi sang partition khác. Bản ghi cũ vẫn nằm ở partition cũ trong khi bản mới vào partition mới, nên trong giai đoạn chuyển, thứ tự theo key bị mất. Consumer cũng khác nhau xử lý hai nửa lịch sử của cùng key. Vậy tăng được (không giảm được) nhưng không vô hại.

**Đáp án ngắn:** Tăng được nhưng không an toàn: đổi `hash mod N` làm nhiều key chuyển partition, mất thứ tự theo key và trạng thái theo key trong lúc chuyển. Nên ước lượng dư từ đầu.

**Ví dụ:** dùng hàm murmur2 của partitioner mặc định (tự cài lại theo thuật toán, 10.000 key `user-0..user-9999`):

```text
Tang 6 -> 8 partition: 7462/10000 key doi partition (74.62%)
Tang 6 -> 12 partition: 5039/10000 key doi partition (50.39%)
user-42: 6 partition -> p4, 8 partition -> p4
user-43: 6 partition -> p2, 8 partition -> p6
order-9001: 6 partition -> p3, 8 partition -> p7
```

_Đã chạy thử (Java 11, `java M2.java`)._ Từ 6 lên 8, khoảng 3/4 key đổi partition; từ 6 lên bội số 12 thì khoảng một nửa. Cụ thể `user-43` đang ở p2 rồi chuyển sang p6: bản ghi cũ của user-43 nằm ở p2, bản mới ở p6, consumer khác nhau xử lý.

Cách ước lượng số partition từ đầu:

```text
Throughput mục tiêu 200MB/s; producer ~25MB/s/partition, consumer ~10MB/s/partition
so partition >= max(T/Tp, T/Tc) = 20
```

_Đã chạy thử (python, phép tính; số 25 và 10 MB/s chỉ là giả định, phải đo trên hệ của bạn)._

**Nhớ:** Số partition là một phần của hàm chọn partition theo key; chọn dư từ đầu. Xem [Kafka tổng quan](/go?p=06-Distributed-Systems%2FKafka%2Feasy%2Flt-01-kafka-tong-quan.md).

**Hỏi xoáy 1:** Consumer giữ state theo key (cache, aggregate) bị ảnh hưởng thế nào?
**Gợi ý suy luận:** Trạng thái của key nằm ở consumer giữ partition nào? Sau khi key chuyển partition thì ai nhận bản ghi mới?
**Lập luận:** Vì trạng thái gắn với consumer giữ partition cũ, khi key chuyển, consumer khác nhận bản ghi mới mà không có trạng thái cũ, nên tính sai hoặc trạng thái bị chia nhỏ. Với Kafka Streams, state store và topic repartition/changelog gắn theo số partition nên đổi số partition topic nguồn gần như bắt buộc dựng lại ứng dụng.
**Đáp án ngắn:** Trạng thái bị chia đôi hoặc tính sai; Kafka Streams thường phải dựng lại ứng dụng.

**Hỏi xoáy 2:** Với topic compact thì sao?
**Gợi ý suy luận:** Compaction chạy theo từng partition hay toàn topic? Cùng key giờ nằm ở mấy partition?
**Lập luận:** Vì compaction làm theo từng partition và cùng key có thể nằm ở hai partition sau khi đổi, nó không gộp được bản cũ với bản mới.
**Đáp án ngắn:** Compaction không gộp được bản cũ và mới của cùng key khi chúng ở hai partition.

**Hỏi xoáy 3:** Vậy cách làm an toàn là gì?
**Gợi ý suy luận:** Nếu không muốn key đổi chỗ giữa chừng thì cần dựng một chỗ mới và chuyển sang theo thứ tự nào?
**Lập luận:** Vì vấn đề là key đổi chỗ khi thread vẫn chạy, ta ước lượng dư từ đầu. Nếu bắt buộc đổi: tạo topic mới với số partition đích, dừng producer, drain consumer ở topic cũ, rồi chuyển thread sang topic mới.
**Đáp án ngắn:** Ước lượng dư từ đầu; nếu bắt buộc, dùng topic mới và chuyển thread sau khi drain topic cũ.

**Sai lầm hay gặp:** Tăng partition giữa giờ cao điểm để "chữa lag" mà không tính đến thứ tự và trạng thái; hậu quả là lỗi dữ liệu khó tái hiện.

## 12. Topic ghi cập nhật liên tục nhưng chỉ cần giá trị mới nhất mỗi key. Log compaction hoạt động ra sao và dùng khi nào?

**Gợi ý suy luận:**
- Dữ liệu là "event" (mỗi bản ghi đều quan trọng) hay "trạng thái" (chỉ giá trị mới nhất quan trọng)? Retention theo thời gian hợp loại nào?
- Nếu chỉ giữ bản mới nhất mỗi key thì dung lượng tỷ lệ với số key hay số lần cập nhật?
- Làm sao biểu diễn "xóa key" trong một log chỉ nối thêm? Offset có bị đánh số lại không?

**Lập luận:** Vì với dữ liệu trạng thái chỉ bản mới nhất mỗi key có ý nghĩa, retention theo thời gian không hợp (có thể xóa mất key hiếm cập nhật). Compaction giữ bản ghi mới nhất mỗi key nên dung lượng tỷ lệ với số key, không với số lần cập nhật. Log cleaner viết lại các segment đã đóng và bỏ bản trùng key; vì log chỉ nối thêm nên việc xóa key biểu diễn bằng tombstone (value `null`) giữ thêm `delete.retention.ms` để consumer kịp thấy. Offset không bị đánh số lại nên log có "lỗ hổng".

**Đáp án ngắn:** `cleanup.policy=compact`: cleaner bỏ bản ghi cũ trùng key ở các segment đã đóng, giữ bản mới nhất. Offset giữ nguyên, xóa key bằng tombstone. Dùng cho dữ liệu trạng thái, không dùng khi cần lịch sử event.

**Ví dụ:**

```text
Truoc compaction:
  offset 0 u1 v1
  offset 1 u2 v1
  offset 2 u1 v2
  offset 3 u3 v1
  offset 4 u2 None      <- tombstone xoa u2
  offset 5 u1 v3
  offset 6 u4 v1
  offset 7 u3 v2
Sau compaction (segment active tu offset 6 khong bi compact):
  offset 4 u2 None
  offset 5 u1 v3
  offset 6 u4 v1
  offset 7 u3 v2
```

_Đã chạy thử (python, mô phỏng)._ Quan sát: offset 0..3 biến mất (đã có bản mới hơn của u1, u3, và u2 đã bị xóa); offset **không đánh số lại**; tombstone u2 còn giữ một thời gian rồi bị loại. Nếu u3 ở offset 3 và 7 thì chỉ offset 7 sống sót.

**Nhớ:** Retention hợp event, compaction hợp trạng thái; offset không đổi, xóa bằng tombstone. Xem [Kafka bên trong](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-04-kafka-noi-bo-replication.md).

**Hỏi xoáy 1:** Compaction có xóa ngay bản ghi cũ không?
**Gợi ý suy luận:** Cleaner chạy nền lúc nào? Segment đang ghi có bị viết lại không?
**Lập luận:** Vì cleaner chạy nền khi tỷ lệ "bẩn" vượt `min.cleanable.dirty.ratio`, và segment active không bị compact, phần đuôi log vẫn chứa nhiều bản cùng key.
**Đáp án ngắn:** Không, chạy nền và bỏ qua segment active.

**Hỏi xoáy 2:** Consumer mới đọc topic compact từ đầu thấy gì?
**Gợi ý suy luận:** Lịch sử cũ của key còn không? Phần đuôi chưa compact thì thế nào?
**Lập luận:** Vì mỗi key chỉ còn bản mới nhất (cộng các bản ở đuôi chưa compact), consumer thấy trạng thái hiện tại chứ không có lịch sử đầy đủ. Do đó hợp để khôi phục bảng trạng thái, changelog của Kafka Streams, `__consumer_offsets`.
**Đáp án ngắn:** Trạng thái mới nhất mỗi key, không có lịch sử đầy đủ.

**Hỏi xoáy 3:** Cần xóa dữ liệu cá nhân theo yêu cầu thì làm gì?
**Gợi ý suy luận:** Xóa key trong log dùng cơ chế nào? Nó có tức thì không? Dữ liệu còn ở đâu nữa?
**Lập luận:** Vì xóa key dùng tombstone và compaction không tức thì, ta gửi tombstone rồi tính `delete.retention.ms` cùng nhịp chạy cleaner. Dữ liệu còn ở backup, topic dẫn xuất và hệ đích nên phải xử lý ở đó nữa.
**Đáp án ngắn:** Gửi tombstone cho key đó, chờ compaction, đồng thời xử lý các bản sao ở nơi khác.

**Sai lầm hay gặp:** Dùng compaction khi nghiệp vụ cần lịch sử event đầy đủ (ví dụ sổ cái transaction); lịch sử bị cắt mà không ai báo.

## 13. Một bản ghi hỏng (poison pill) làm consumer kẹt mãi một chỗ. Xử lý retry và dead letter topic thế nào?

**Gợi ý suy luận:**
- Consumer đọc tuần tự và chỉ commit tiến lên. Một bản ghi luôn thất bại thì các bản ghi sau nó ra sao?
- Lỗi nào đáng retry, lỗi nào retry vô ích? (lỗi tạm so với lỗi vĩnh viễn)
- Lỗi deserialize xảy ra ở đâu so với vòng xử lý? Có bị bắt không?

**Lập luận:** Vì consumer chỉ commit tiến lên, một bản ghi luôn thất bại sẽ chặn mọi bản ghi đứng sau nó nếu ta cứ thử mãi. Do đó phải phân loại lỗi: lỗi tạm thì retry có ích, lỗi vĩnh viễn (dữ liệu sai) thì retry vô ích và nên cách ly sang dead letter topic. Lỗi deserialize xảy ra trước vòng xử lý nên nếu không bắt, consumer kẹt; vì thế dùng `ErrorHandlingDeserializer` để biến nó thành lỗi xử lý được, rồi `DefaultErrorHandler` kèm `DeadLetterPublishingRecoverer` chuyển bản ghi sang DLT sau số lần thử.

**Đáp án ngắn:** Phân loại lỗi: lỗi tạm retry có giới hạn, lỗi dữ liệu đẩy thẳng sang DLT. Trong Spring dùng `ErrorHandlingDeserializer`, `DefaultErrorHandler` và `DeadLetterPublishingRecoverer` để consumer không kẹt.

**Ví dụ:**

```java
@Bean
DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template) {
    // -> topic orders.DLT (cùng partition)
    var recoverer = new DeadLetterPublishingRecoverer(template);
    // thử lại 3 lần cách nhau 1s
    var handler = new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));
    // lỗi dữ liệu: thẳng vào DLT
    handler.addNotRetryableExceptions(IllegalArgumentException.class);
    return handler;
}
```

```properties
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
spring.kafka.consumer.properties.spring.deserializer.value.delegate.class=org.springframework.kafka.support.serializer.JsonDeserializer
```

_Minh họa, chưa chạy thử trong môi trường này; giá trị mặc định và tên class kiểm tra lại theo phiên bản Spring Kafka._ Quan sát thứ tự: bản ghi offset 7 độc, các offset 8, 9 bình thường.

| Cách xử lý | Offset 7 | Offset 8, 9 | Thứ tự theo key |
|---|---|---|---|
| Retry tại chỗ (`DefaultErrorHandler`) | thử 3 lần rồi sang DLT | **chờ** trong lúc retry | giữ |
| `@RetryableTopic` | chuyển sang topic retry | xử lý ngay | **7 đến muộn sau 8, 9** |

**Nhớ:** Phân loại lỗi tạm và lỗi vĩnh viễn; DLT cần cảnh báo và replay. Xem [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md).

**Hỏi xoáy 1:** Từ bảng trên: retry tại chỗ khác `@RetryableTopic` thế nào?
**Gợi ý suy luận:** Cái nào chặn partition? Cái nào cho bản ghi lỗi "đi đường khác"? Hệ quả với thứ tự là gì?
**Lập luận:** Vì retry tại chỗ giữ bản ghi lỗi ở lại partition nên chặn các bản ghi sau nhưng giữ thứ tự. Retry topic đưa bản ghi lỗi sang topic khác nên non-blocking nhưng bản lỗi đến muộn, mất thứ tự theo key. Chọn theo việc thứ tự có quan trọng không.
**Đáp án ngắn:** Tại chỗ: chặn nhưng giữ thứ tự; retry topic: non-blocking nhưng đảo thứ tự.

**Hỏi xoáy 2:** Backoff dài khi retry tại chỗ gây vấn đề gì?
**Gợi ý suy luận:** Thread consumer bị block bao lâu? So với `max.poll.interval.ms` (câu 6) thì sao?
**Lập luận:** Vì thread consumer bị block suốt thời gian backoff, nếu vượt `max.poll.interval.ms` thì consumer bị loại, rebalance và bản ghi giao lại, vòng lặp tệ hơn. Backoff dài nên dùng retry topic.
**Đáp án ngắn:** Chặn thread, vượt `max.poll.interval.ms` gây rebalance; backoff dài nên dùng retry topic.

**Hỏi xoáy 3:** DLT có vấn đề vận hành gì?
**Gợi ý suy luận:** Bản ghi nằm ở DLT rồi thì ai biết và ai xử lý tiếp?
**Lập luận:** Vì không có cảnh báo và quy trình phát lại, DLT thành nơi dữ liệu biến mất lặng lẽ. Cần giữ key, header lý do lỗi (exception, topic/offset gốc), cảnh báo khi DLT có bản ghi, và công cụ replay về topic gốc.
**Đáp án ngắn:** Cần cảnh báo, header lý do lỗi và công cụ replay, nếu không DLT chỉ là chỗ chôn dữ liệu.

**Sai lầm hay gặp:** Tin rằng mặc định đã có DLT; thực tế `DefaultErrorHandler` mặc định chỉ retry vài lần rồi **ghi log và bỏ qua** bản ghi (kiểm tra lại theo phiên bản).

## 14. Cụm Kafka phải vận hành thêm một cụm ZooKeeper, và controller đổi thì mất nhiều thời gian. KRaft thay đổi gì, vì sao Kafka chuyển?

**Gợi ý suy luận:**
- Metadata cụm (topic, partition, leader, ISR) cần cơ chế đồng thuận nào? Trước đây giao cho hệ nào?
- Khi controller mới lên, nó phải làm gì với metadata nếu metadata nằm ở hệ khác?
- Nếu metadata là một log event replication bằng Raft ngay trong Kafka thì controller mới có sẵn gì?

**Lập luận:** Vì metadata cần được đồng thuận, trước đây Kafka giao cho ZooKeeper, một hệ phân tán thứ hai với mô hình vận hành riêng, và controller mới phải nạp lại toàn bộ metadata khi lên làm leader nên chậm. KRaft biến metadata thành một log event replication bằng Raft ngay trong Kafka, nên controller dự phòng đã có sẵn log và lên nhanh. Kết quả là một hệ thống thay vì hai, phục hồi controller nhanh và nâng trần số partition.

**Đáp án ngắn:** KRaft lưu metadata trong một log Raft nội bộ của Kafka thay vì ZooKeeper: một hệ thay vì hai, controller phục hồi nhanh, nâng trần số partition. Kafka 4.0 là bản lớn đầu tiên chạy hoàn toàn không cần ZooKeeper (kiểm tra lại theo phiên bản).

**Ví dụ:** cấu hình KRaft tối thiểu cho một node vừa là broker vừa là controller (cụm nhỏ), và số node chịu lỗi của quorum:

```properties
process.roles=broker,controller
node.id=1
# cách khai báo tĩnh; bản mới có quorum động (kiểm tra theo phiên bản)
controller.quorum.voters=1@k1:9093,2@k2:9093,3@k3:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
controller.listener.names=CONTROLLER
```

_Minh họa, chưa chạy thử trong môi trường này._

```text
quorum 1 controller chiu duoc 0 node loi (can da so 1)
quorum 3 controller chiu duoc 1 node loi (can da so 2)
quorum 5 controller chiu duoc 2 node loi (can da so 3)
```

_Đã chạy thử (python, phép tính `(n-1)//2`)._ Quorum chẵn không lợi: 4 controller vẫn chỉ chịu 1 node lỗi (cần đa số 3), tốn hơn 3 mà không tốt hơn.

**Nhớ:** KRaft = metadata là log Raft trong Kafka; quorum cần đa số. Xem [Kafka bên trong](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-04-kafka-noi-bo-replication.md).

**Hỏi xoáy 1:** Quorum nên có mấy controller, và vai trò từng node?
**Gợi ý suy luận:** Raft cần đa số để bầu leader. Với n node, chịu được bao nhiêu node lỗi (xem bảng trên)?
**Lập luận:** Vì cần đa số, quorum số lẻ (3 hoặc 5) là tối ưu, số chẵn không lợi hơn. Một controller là leader (active), các controller còn lại là follower của log metadata. Mỗi node khai báo `process.roles` là broker, controller hoặc cả hai (combined hợp cụm nhỏ/dev; cụm lớn nên tách).
**Đáp án ngắn:** 3 hoặc 5 controller, một active, còn lại follower; cụm lớn tách vai trò.

**Hỏi xoáy 2:** Cụm đang chạy ZooKeeper muốn lên 4.0 thì làm thế nào?
**Gợi ý suy luận:** 4.0 còn chế độ ZooKeeper không? Vậy phải làm gì trước khi lên?
**Lập luận:** Vì 4.0 không còn chế độ ZooKeeper, không nâng thẳng được: phải chuyển sang KRaft trước. 3.9 là bản cuối hỗ trợ ZooKeeper nên lộ trình thường là lên 3.9, di chuyển sang KRaft, rồi lên 4.x.
**Đáp án ngắn:** Lên 3.9, di chuyển sang KRaft, rồi mới lên 4.x.

**Hỏi xoáy 3:** Ảnh hưởng đến client?
**Gợi ý suy luận:** Client kết nối tới đâu? Bản 4.0 thay đổi gì ở API và Java?
**Lập luận:** Vì client vẫn kết nối qua `bootstrap.servers`, cách kết nối không đổi. Nhưng 4.0 bỏ nhiều API deprecated, yêu cầu Java 17 cho broker và Java 11 cho client, nên phải đọc hướng dẫn nâng cấp trước.
**Đáp án ngắn:** Client vẫn dùng `bootstrap.servers`, nhưng cần kiểm tra API bị bỏ và yêu cầu phiên bản Java.

**Sai lầm hay gặp:** Cho rằng KRaft chỉ là "bỏ ZooKeeper" và bỏ qua lộ trình di chuyển; hậu quả là cụm không nâng được lên 4.0.

## 15. Đội muốn dùng Kafka làm queue tác vụ, một việc chậm kéo theo các việc sau nó. Khi nào chọn Kafka, khi nào chọn queue truyền thống?

**Gợi ý suy luận:**
- Kafka theo dõi tiến độ bằng gì: offset của cả lô, hay trạng thái từng tin? Queue truyền thống thì sao?
- Trong một partition, một việc chậm ảnh hưởng các việc sau như thế nào? (head-of-line blocking)
- Bài toán là event flow cần phát lại và nhiều bên đọc, hay queue tác vụ cần ack từng tin?

**Lập luận:** Vì Kafka là log bền đọc theo vị trí (consumer tự giữ offset, bản ghi không bị xóa khi đọc), đơn vị ack là offset, tức cả lô. Queue truyền thống thì broker theo dõi từng tin, ack/nack từng tin và xóa khi xong. Do đó trong một partition, việc chậm chặn các việc sau nó (head-of-line blocking), còn work queue thật thì bất kỳ consumer rảnh nào lấy việc tiếp theo. Vậy Kafka hợp event flow khối lượng lớn, nhiều bên đọc, cần phát lại và thứ tự theo key; queue hợp queue tác vụ cần ack từng tin, routing phong phú, retry/DLQ sẵn.

**Đáp án ngắn:** Kafka cho event flow lớn, nhiều bên đọc, phát lại, thứ tự theo key. Queue (RabbitMQ, SQS) cho queue tác vụ cần ack từng tin, routing, retry/DLQ sẵn, throughput vừa phải.

**Ví dụ:** head-of-line blocking khi dùng Kafka làm work queue. 3 partition, 9 việc (mỗi việc 100 ms), việc số 1 mất 5 giây:

```text
ban ghi 0 (partition 0) xong luc 100ms
ban ghi 1 (partition 1) xong luc 5000ms
ban ghi 2 (partition 2) xong luc 100ms
...
ban ghi 4 (partition 1) xong luc 5100ms
ban ghi 7 (partition 1) xong luc 5200ms
```

_Đã chạy thử (python, mô phỏng)._ Việc 4 và 7 chỉ cần 100 ms nhưng nằm sau việc chậm trong cùng partition nên xong lúc 5,1 s và 5,2 s. Với work queue thật (mỗi việc ack riêng, bất kỳ consumer rảnh nào lấy), chúng xong trong khoảng 100 ms.

**Nhớ:** Kafka = log bền, ack theo offset; queue = ack từng tin. Xem [Kafka tổng quan](/go?p=06-Distributed-Systems%2FKafka%2Feasy%2Flt-01-kafka-tong-quan.md).

**Hỏi xoáy 1:** Vẫn muốn work queue (ack từng việc) trên Kafka thì có cách nào?
**Gợi ý suy luận:** Consumer group giới hạn parallel bằng gì? Muốn nhiều consumer chia tin trong cùng partition thì cần ack ở mức nào?
**Lập luận:** Vì consumer group giới hạn parallel bằng số partition và ack theo offset, nó không hợp work queue. _Share groups_ (KIP-932, early access từ 4.0, được tuyên bố sẵn sàng production ở 4.2) nhắm vào đúng khoảng trống này: nhiều consumer chia tin trong cùng partition và ack từng bản ghi. Vì mới, phải kiểm tra phiên bản và giới hạn trước khi dùng.
**Đáp án ngắn:** Share groups (KIP-932) nhắm vào việc này; còn mới nên kiểm tra phiên bản.

**Hỏi xoáy 2:** Dùng Kafka cho kiểu request-reply cần latency thấp?
**Gợi ý suy luận:** Producer gom batch có thêm latency không? Ai lo ghép cặp request với reply?
**Lập luận:** Vì producer gom batch (`linger.ms`) thêm latency và Kafka không có sẵn reply, bạn phải tự lo correlation id và topic trả lời. Nên RPC (gRPC/REST) hoặc queue có reply thường hợp hơn.
**Đáp án ngắn:** Làm được nhưng không phải thế mạnh; RPC hoặc queue có reply thường hợp hơn.

**Hỏi xoáy 3:** Chi phí vận hành so sánh?
**Gợi ý suy luận:** Kafka bắt bạn quản lý những gì? Dung lượng lưu trữ tính ra sao?
**Lập luận:** Vì Kafka cần quản lý partition, retention, lag, nâng cấp và dung lượng (ví dụ 50 MB/s × 7 ngày × RF=3 ≈ 86,5 TB, đã tính bằng python), đội nhỏ nhu cầu nhỏ thì queue dạng dịch vụ rẻ hơn về vận hành.
**Đáp án ngắn:** Kafka tốn công vận hành và dung lượng; nhu cầu nhỏ thì queue dịch vụ rẻ hơn.

**Sai lầm hay gặp:** Chọn Kafka vì "phổ biến" cho nhu cầu queue tác vụ nhỏ; hậu quả là tự dựng hạ tầng nặng và vẫn gặp head-of-line blocking.

## 16. Ghi DB xong rồi gửi Kafka, sập ở giữa thì đơn có mà event mất. Dual write sai ở đâu, outbox sửa thế nào?

**Gợi ý suy luận:**
- DB và Kafka có chung transaction không? Giữa hai thao tác liên tiếp có khoảng nào sập được?
- Đổi thứ tự hai thao tác (gửi Kafka trước, ghi DB sau) thì lỗi đổi chiều ra sao?
- Làm sao thu hai việc thành một việc nguyên tử, và việc còn lại làm sao chắc chắn xong?

**Lập luận:** Vì DB và Kafka là hai hệ độc lập không có transaction chung, hai thao tác liên tiếp luôn có một khoảng ở giữa để sập, và dù sắp xếp thứ tự nào cũng có một chiều lỗi: DB đổi mà event mất, hoặc event ra mà DB không đổi. Outbox thu hai việc thành một việc nguyên tử bằng cách ghi dữ liệu và một dòng `outbox` trong cùng transaction DB. Việc gửi sang Kafka được giao cho một relay (poller hoặc CDC như Debezium) đọc `outbox` và gửi lặp lại cho tới khi xong, rồi đánh dấu đã gửi. Vì relay có thể sập sau khi gửi nhưng trước khi đánh dấu, outbox cho at-least-once, nên consumer phải idempotent.

**Đáp án ngắn:** Dual write không nguyên tử vì không có transaction chung. Outbox ghi dữ liệu và dòng outbox trong cùng transaction DB; relay (poller hoặc CDC) gửi sang Kafka cho tới khi xong. Event có thể trùng nên consumer phải idempotent theo `event_id`.

**Ví dụ:** dùng sqlite (có transaction thật) mô phỏng bảng `orders` và `outbox`; đơn 2 lỗi giữa chừng, relay sập sau khi gửi:

```text
  rollback: loi giua chung
orders : [(1, 'NEW'), (3, 'NEW')]
outbox : [(1, 'evt-1', 0), (2, 'evt-3', 0)]
=> don 2 khong ton tai VA khong co su kien: nguyen tu nho cung transaction DB
  relay sap sau khi gui evt-1 nhung truoc khi danh dau sent
Kafka nhan: ['evt-1', 'evt-1', 'evt-3']   -> evt-1 TRUNG, consumer phai idempotent bang event_id
```

_Đã chạy thử (python + sqlite)._ Đây là bằng chứng cho hai điều: (1) rollback bỏ cả đơn lẫn event, không có trạng thái "nửa vời"; (2) outbox cho **at-least-once**, nên event có thể trùng và consumer phải xử lý idempotent theo `event_id`.

**Nhớ:** Không có transaction chung thì dùng outbox: nguyên tử ở DB, gửi lặp lại ở relay, idempotent ở consumer. Xem [Exactly-once và vận hành](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md) và [Microservices, Kafka và hệ phân tán](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-16-microservices-kafka-phan-tan.md).

**Hỏi xoáy 1:** Outbox có tránh được trùng không?
**Gợi ý suy luận:** Nếu relay gửi xong rồi sập trước khi đánh dấu `sent` thì lần chạy sau làm gì?
**Lập luận:** Vì relay gửi lại dòng chưa đánh dấu, event đã gửi sẽ bị gửi lần nữa (như `evt-1` ở trên). Nên event cần `eventId` và consumer phải idempotent.
**Đáp án ngắn:** Không, outbox cho at-least-once; consumer idempotent theo `eventId`.

**Hỏi xoáy 2:** Relay dùng polling hay CDC?
**Gợi ý suy luận:** Polling thêm tải gì và gặp khó khăn gì khi chạy nhiều relay? CDC đọc nguồn nào?
**Lập luận:** Vì polling đơn giản nhưng thêm tải truy vấn và latency, và khó giữ thứ tự khi nhiều relay chạy parallel. CDC đọc log của DB (binlog/WAL) nên giữ thứ tự commit và ít tải hơn, đổi lại thêm hạ tầng (Debezium, Kafka Connect).
**Đáp án ngắn:** Polling đơn giản nhưng tốn tải và khó giữ thứ tự; CDC giữ thứ tự commit, đổi lại thêm hạ tầng.

**Hỏi xoáy 3:** Kafka transaction có thay được outbox không?
**Gợi ý suy luận:** Transaction Kafka gom được những hệ nào? (câu 8)
**Lập luận:** Vì Kafka transaction không bao trùm DB của bạn, nó chỉ giải bài toán Kafka sang Kafka, không phải DB sang Kafka.
**Đáp án ngắn:** Không; Kafka transaction không bao trùm DB.

**Sai lầm hay gặp:** Bọc `kafkaTemplate.send` trong `@Transactional` của DB và tin rằng nó nguyên tử; `send` là async và không tham gia transaction DB, nên sập sau commit vẫn mất event.

## Cách luyện câu hỏi hỏi xoáy

1. Che phần **Lập luận** và **Đáp án ngắn**, đọc **Gợi ý suy luận** rồi tự trả lời thành tiếng trước.
2. Mở đầu bằng khái niệm nền (vì sao cơ chế này tồn tại) rồi mới nêu cấu hình.
3. Luôn nêu **đánh đổi** (độ bền và sẵn sàng, thứ tự và parallel, throughput và latency).
4. Với mỗi cấu hình, chuẩn bị một **kịch bản sự cố** (ví dụ dòng thời gian sập broker) mà nó giải thích được; người phỏng vấn senior thường bắt bạn "vẽ" lại từng bước.
5. Với điều phụ thuộc phiên bản (KRaft, KIP-848, share groups, ELR, mặc định của idempotence), nêu rõ phiên bản và kiểm tra tài liệu trước khi cam kết.

Nguồn: tài liệu chính thức Apache Kafka (kafka.apache.org), kiểm tra ngày 2026-10-21.

