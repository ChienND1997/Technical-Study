# Câu hỏi: Microservices, Kafka và hệ phân tán (senior)

Kiến thức gốc: [Microservices với Spring Cloud](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md), [Kafka hướng event](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md), [CQRS và Event Sourcing](/go?p=01-Spring-Boot%2Fhard%2Flt-25-cqrs-event-sourcing.md), [Distributed lock và Idempotency](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md), [Hexagonal, DDD và Modulith](/go?p=01-Spring-Boot%2Fhard%2Flt-24-hexagonal-ddd-modulith.md), [Message Queue](/go?p=15-System%20Design%2Fmedium%2Flt-06-message-queue.md), [CAP và Consistency](/go?p=15-System%20Design%2Fhard%2Flt-05-cap-consistency.md), [Distributed Transactions](/go?p=15-System%20Design%2Fhard%2Flt-10-distributed-transactions.md), [Replication, Sharding, HA](/go?p=02-Database%2Fhard%2Flt-05-replication-sharding-ha.md).

Ở mức senior, người phỏng vấn không chấm câu "định nghĩa" mà chấm **bản chất, tình huống lỗi và quyết định có lý do**. Vì vậy mỗi câu dưới đây được viết để bạn **tự suy ngược** ra đáp án chứ không học thuộc. Chuỗi đọc cho mỗi câu: **Câu hỏi** (hiện tượng hoặc tình huống) → **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền) → **Lập luận** (chuỗi "vì A nên B") → **Đáp án ngắn** (nói thành tiếng được) → **Nhớ** (kiến thức cốt lõi). Sau đó là ví dụ truy vết được, rồi các câu hỏi xoáy (mỗi câu xoáy là bước tiếp theo hợp lý của câu trước) và sai lầm hay gặp. Nên che phần Lập luận, tự trả lời các gợi ý trước rồi mới đối chiếu.

Quy ước ghi chú: _Đã chạy thử trên JDK 11_ nghĩa là output bên dưới do chương trình Java thuần mô phỏng cơ chế chạy thật (không có Kafka/Redis/DB trong môi trường soạn); _Minh họa, chưa chạy thử_ nghĩa là cấu hình/mã chưa chạy ở đây. Mô phỏng nhằm chứng minh **logic và lỗi**, không đo hiệu năng của sản phẩm thật.

---

**Tóm tắt:**

- Phạm vi file: microservices, Kafka và hệ phân tán ở mức senior, mỗi câu đi từ một sự cố thực tế tới nguyên lý.
- Microservices đổi gọi hàm thành call mạng nên mất ACID chung và nhân xác suất lỗi; chỉ đáng khi có nhiều đội cần phát hành độc lập, còn không thì modular monolith.
- Gọi đồng bộ giữ thread của người gọi nên service chậm kéo cả chuỗi (lỗi dây chuyền); `DB + send` là dual write, chữa bằng Outbox, chuỗi nhiều service dùng Saga với bước bù.
- Client không phân biệt được request mất với response mất nên phải retry, do đó bên nhận phải idempotent với key kèm ràng buộc UNIQUE; exactly-once của Kafka chỉ bao trong Kafka.
- Kafka: thứ tự chỉ trong một partition, đổi số partition làm đổi ánh xạ key; commit trước xử lý thì mất, sau thì trùng; retention giữ dữ liệu bất kể ai đọc, lag vượt retention thì mất message.
- Distributed lock dựa vào thời gian nên cần fencing token; CAP chọn theo từng chức năng; retry nhiều tầng gây retry storm nên cần backoff, jitter, circuit breaker, bulkhead.
- Hay bị hỏi xoáy nhất: vì sao tăng partition làm sai thứ tự, TTL hết lúc GC pause thì ai ghi đè ai, và đổi tên cột không downtime theo expand/contract.

## 1. Khi nào nên và không nên dùng microservices?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Một đội 6 người có một monolith chạy ổn. Sếp muốn "chuyển hết sang microservices cho hiện đại". Bạn nói gì, và vì sao một thao tác đi qua 5 service lại kém tin cậy hơn một thao tác trong monolith?

**Gợi ý suy luận:**
- Một gọi hàm trong cùng process khác call qua mạng ở điểm nào (latency, lỗi một phần, transaction)?
- Nếu mỗi service khả dụng 99,9% và bạn gọi sync nối tiếp 5 cái, xác suất cả chuỗi thành công tính thế nào (phép nhân xác suất)?
- Lợi ích duy nhất mà tách service mang lại là gì, và ai được hưởng (triển khai độc lập, nhiều đội)?

**Lập luận:** Vì tách service biến gọi hàm thành call mạng, nên mỗi chặng thêm latency, thêm khả năng lỗi một phần và mất transaction ACID chung. Vì các chặng đồng bộ nối tiếp phải **cùng** thành công, nên độ khả dụng nhân lại: 0,999^5 ≈ 99,5%, tức khoảng 43 giờ ngừng mỗi năm thay vì 8,8 giờ. Đổi lại, thứ bạn nhận được là triển khai và mở rộng độc lập, mà lợi ích này chỉ có giá trị khi có **nhiều đội** cần phát hành không chờ nhau. Đội 6 người, miền nghiệp vụ chưa ổn định, chưa có CI/CD, giám sát, tracing thì chỉ nhận phần chi phí. Nên điểm xuất phát hợp lý là modular monolith, tách dần khi ranh giới đã rõ.

**Đáp án ngắn:** Microservices giải bài toán tổ chức nhiều đội hơn bài toán kỹ thuật, và đổi gọi hàm bền thành call mạng dễ lỗi. Với đội nhỏ hoặc miền chưa ổn định, tôi bắt đầu bằng modular monolith và chỉ tách khi ranh giới nghiệp vụ và nền tảng vận hành đã sẵn sàng.

**Nhớ:** Microservices = đổi độ phức tạp tổ chức lấy độ phức tạp phân tán; độ khả dụng chuỗi đồng bộ là tích các xác suất. Xem [lt-08](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md).

**Ví dụ:** _Đã chạy thử (tính bằng Python)._ Độ khả dụng nhân lên theo chuỗi gọi sync. Mỗi service 99,9%:

```text
1 service  99.9% moi cai -> 99.9 %
2 service  99.9% moi cai -> 99.8 %
3 service  99.9% moi cai -> 99.7 %
5 service  99.9% moi cai -> 99.501 %
```

Một thao tác đi qua 5 service đồng bộ chỉ còn ~99,5%, tức khoảng **43 giờ** ngừng hoạt động mỗi năm thay vì ~8,8 giờ của 99,9%. Trong monolith, năm "service" đó là năm gọi hàm không bao giờ "chập chờn".

**Hỏi xoáy 1:** Đã lỡ tách, làm sao biết mình đang có "distributed monolith"?

- Gợi ý: nếu lợi ích của tách là triển khai độc lập, thì dấu hiệu nào cho thấy lợi ích đó biến mất (deploy cùng nhau, chung dữ liệu, đổi một chỗ chạm nhiều nơi)?
- Lập luận: vì các service vẫn phải phát hành cùng nhau hoặc chung database, nên bạn trả đủ chi phí mạng mà không có độc lập triển khai. Do đó dấu hiệu là release train chung, bảng dùng chung, một thay đổi nghiệp vụ chạm 4 service, A sập thì B, C, D cùng sập.
- Đáp: Là hệ thống tách thành nhiều service nhưng vẫn gắn chặt nhau, có đủ chi phí của microservices mà không có lợi ích.

**Hỏi xoáy 2:** Vậy muốn tách dần từ monolith thì bắt đầu từ đâu?

- Gợi ý: nếu không thể tắt hệ cũ một lần, bạn cần cách nào để chuyển từng phần mà người dùng không biết (class định tuyến phía trước)?
- Lập luận: vì chuyển từng chức năng giúp rủi ro nhỏ và đảo ngược được, nên đặt class định tuyến trước monolith rồi chuyển dần. Vì phần ít dependency dữ liệu tách dễ nhất, nên bắt đầu từ đó.
- Đáp: Strangler fig: chuyển từng chức năng sang service mới sau một class định tuyến, monolith teo dần, bắt đầu từ ranh giới ít dependency dữ liệu.

**Sai lầm hay gặp:** coi microservices là "kiến trúc hiện đại hơn" mặc nhiên; tách theo tầng kỹ thuật (service controller, service DAO) thay vì theo nghiệp vụ.

---

## 2. Vẽ ranh giới service thế nào? Bounded context là gì?

**Câu hỏi:** Sales và Billing đều có "Customer". Nếu cả hai dùng chung một class `Customer` và một bảng `customers`, chuyện gì xảy ra mỗi khi Sales đổi quy tắc xếp hạng? Từ đó ranh giới service nên vẽ ở đâu?

**Gợi ý suy luận:**
- "Khách hàng" với bộ phận bán hàng, kế toán và giao hàng có cùng nghĩa không (ngôn ngữ đổi nghĩa theo ngữ cảnh)?
- Nếu một mô hình chung phục vụ ba bên, một thay đổi của bên này tác động tới ai (coupling)?
- Khi hai service cần nói về cùng một khách hàng, chúng chia sẻ thứ gì là đủ (định danh, không phải cả mô hình)?

**Lập luận:** Vì cùng một từ mang nghĩa khác nhau ở các phần khác nhau của doanh nghiệp, nên ép một mô hình chung làm mô hình phình ra và rối. Vì mọi bên cùng dùng mô hình đó, nên mỗi thay đổi của Sales buộc Billing phải test lại. Do đó ranh giới tốt nằm ở nơi **ngôn ngữ đổi nghĩa**, tức bounded context của DDD. Vì mỗi context có mô hình riêng, nên mỗi service sở hữu dữ liệu riêng và chỉ tham chiếu nhau bằng ID, qua API hoặc event. Điểm dễ nhầm là vẽ ranh giới theo bảng dữ liệu hoặc theo tầng kỹ thuật (service "user", service "database"), tạo ra các service phải gọi nhau liên tục cho mỗi use case và phải deploy cùng nhau. Dấu hiệu ranh giới sai là một thay đổi nghiệp vụ nhỏ buộc sửa nhiều service; ranh giới đúng khiến phần lớn thay đổi nằm gọn trong một service, và dữ liệu dùng chung chỉ đi qua ID, API hoặc event.

**Đáp án ngắn:** Tôi vẽ ranh giới theo bounded context, nơi một thuật ngữ nghiệp vụ đổi nghĩa. Mỗi service sở hữu dữ liệu của mình, không đọc DB của service khác, chỉ chia sẻ ID, API và event.

**Nhớ:** Ranh giới = bounded context; một service một chủ sở hữu dữ liệu. Xem [lt-24](/go?p=01-Spring-Boot%2Fhard%2Flt-24-hexagonal-ddd-modulith.md).

**Ví dụ:** _Minh họa, chưa chạy thử._ Cùng "Customer", hai context hai mô hình:

```java
// Context "Sales": quan tâm khả năng mua
package sales; class Customer { CustomerId id; String name; CreditTier tier; List<Cart> carts; }

// Context "Billing": quan tâm công nợ và kỳ thanh toán
package billing; class Customer { CustomerId id; TaxCode taxCode; List<Invoice> invoices; Money outstanding; }
```

Hai service chỉ chia sẻ `CustomerId`. Khi Sales đổi quy tắc xếp hạng, Billing không phải đổi. Nếu dùng chung một class `Customer` và một bảng `customers`, mỗi thay đổi của Sales làm Billing phải test lại.

**Hỏi xoáy 1:** Nếu hai service luôn phải đổi cùng nhau thì sao?

- Gợi ý: nếu ranh giới đúng thì thay đổi nên nằm gọn trong một bên; việc luôn đổi cùng nhau cho thấy điều gì về coupling?
- Lập luận: vì hai service luôn đổi cùng nhau nên thực chất chúng là một khối nghiệp vụ bị cắt sai chỗ. Chia ra chỉ thêm chi phí mạng và phối hợp phát hành.
- Đáp: Đó là dấu hiệu ranh giới sai, nên gộp lại. Số lần hai service đổi cùng lúc là thước đo coupling tốt hơn mọi sơ đồ.

**Hỏi xoáy 2:** Billing cần tên khách hàng của Sales để in hóa đơn, lấy bằng cách nào mà vẫn không đọc DB của Sales?

- Gợi ý: có hai cách thông tin sang bên kia (hỏi khi cần, hoặc được báo khi đổi). Mỗi cách đánh đổi gì về phụ thuộc lúc chạy và độ cũ của dữ liệu?
- Lập luận: vì Billing không được đọc DB của Sales, nên hoặc gọi API Sales lúc cần (đơn giản nhưng thêm phụ thuộc thời gian chạy), hoặc giữ bản sao tối thiểu cập nhật qua event `CustomerRenamed` (tách rời, nhưng eventual consistency). Chọn theo tần suất đọc và mức chấp nhận dữ liệu cũ.
- Đáp: Gọi API khi cần, hoặc replication dữ liệu tối thiểu qua event vào bảng cục bộ, tùy tần suất đọc và độ cũ chấp nhận được.

**Sai lầm hay gặp:** chia quá nhỏ (nano-service) khiến một tính năng đi qua 6 service; dùng chung DB "cho tiện" (rồi không đổi schema được vì không biết ai dùng).

---

## 3. Giao tiếp đồng bộ (REST/gRPC) hay async (message)?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Service B bỗng chậm 2 giây mỗi request. Vì sao service A, vốn không hỏng gì, cũng bắt đầu trả lời chậm, kể cả với những request không đụng tới B? Và bạn chọn REST hay message cho từng loại tương tác?

**Gợi ý suy luận:**
- Khi A gọi B đồng bộ, thread xử lý của A làm gì trong lúc chờ (bị giữ)?
- A có số thread hoặc connection hữu hạn; nếu nhiều thread bị giữ cùng lúc thì request nội bộ đến sau gặp chuyện gì (cạn tài nguyên)?
- Đặt timeout thay đổi điều gì (nhả thread sớm)? Message qua broker cắt sợi dây nào?

**Lập luận:** Vì gọi sync giữ thread của A cho tới khi B trả lời, nên khi B chậm 2 giây, các thread của A bị giữ 2 giây mỗi cái. Vì A chỉ có số thread hữu hạn (ở ví dụ là 10), nên 10 request treo ở B là đủ chiếm hết, và request nội bộ vô can đến sau phải xếp hàng chờ. Đây là cơ chế lỗi dây chuyền. Timeout cắt cơ chế đó vì nhả thread sớm. Còn message qua broker cắt hẳn sợi dây thời gian: A ghi message rồi đi tiếp, không chờ B. Từ đó quy tắc: cần đáp án ngay thì đồng bộ (luôn kèm timeout); thay đổi trạng thái giữa các miền thì ưu tiên event.

**Đáp án ngắn:** Gọi sync buộc số phận của tôi vào bên được gọi: B chậm thì thread của A cạn và lỗi lan truyền. Truy vấn cần kết quả ngay thì gọi sync có timeout; thay đổi trạng thái giữa các miền thì dùng event, chấp nhận eventual consistency và xử lý trùng lặp.

**Nhớ:** Đồng bộ = ràng buộc thời gian và tài nguyên; async = tách rời nhưng eventual consistency. Luôn có timeout. Xem [lt-06 Message Queue](/go?p=15-System%20Design%2Fmedium%2Flt-06-message-queue.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Service A có 10 thread xử lý, gọi service B đang chậm (2 giây). 10 request gọi B đang treo thì 3 request **nội bộ** (chỉ mất vài ms) đến sau:

```text
Khong timeout (cho vo han):        request noi bo tra loi sau: 1937ms 1933ms 1933ms
Timeout 200ms:                     request noi bo tra loi sau: 141ms 141ms 141ms
```

Không timeout: cả 10 thread của A bị B giữ nên request nội bộ **vô can** phải chờ ~1,9 giây. Có timeout 200 ms: thread được nhả sớm, request nội bộ trả lời sau ~140 ms. Đây là cơ chế của **lỗi dây chuyền**: B chậm làm A chậm, rồi những ai gọi A chậm theo.

Cấu hình tối thiểu cho client gọi sync, _minh họa, chưa chạy thử_:

```java
var client = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(300)).build();
// timeout đọc
var req = HttpRequest.newBuilder(uri).timeout(Duration.ofMillis(800)).GET().build();
```

**Hỏi xoáy 1:** Đã chọn event, thì thread nhiều bước nên "ai nghe event nấy phản ứng" hay có một bộ điều phối?

- Gợi ý: nếu không ai giữ bức tranh toàn cục thì khi cần theo dõi hay bù trừ giữa các bước sẽ khó ở đâu?
- Lập luận: vì choreography không có người chỉ huy, mỗi service tự phản ứng, nên rất lỏng lẻo nhưng khó nhìn toàn cảnh thread. Vì orchestration có bộ điều phối giữ state, nên dễ theo dõi và thêm bù trừ, nhưng logic tập trung vào một điểm.
- Đáp: Choreography thì lỏng nhưng khó theo dõi; orchestration thì dễ theo dõi và bù trừ nhưng tập trung logic ở bộ điều phối.

**Hỏi xoáy 2:** Dùng message nhưng vẫn "chờ phản hồi" qua một queue khác có tốt không?
- Gợi ý: sợi dây thời gian mà message vốn muốn cắt còn lại không nếu bạn vẫn đứng chờ?
- Lập luận: vì bạn vẫn bị buộc thời gian vào bên kia, nên mất lợi ích tách rời, mà còn thêm latency và độ phức tạp của broker.
- Đáp: Đó là RPC giả. Cần câu trả lời ngay thì gọi sync có timeout.

**Sai lầm hay gặp:** không đặt timeout (mặc định nhiều thư viện là vô hạn); bắn event mà không nghĩ đến thứ tự và trùng lặp.

---

## 4. Transaction xuyên service: Saga, 2PC và Outbox?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Method của bạn vừa `save()` đơn hàng vào DB vừa `kafkaTemplate.send()` event. Đúng lúc broker down thì chuyện gì xảy ra, và bạn thiết kế lại thế nào? Còn nếu đơn hàng cần đi qua giữ kho, trừ tiền, tạo vận đơn ở ba service khác nhau mà bước ba hỏng thì sao?

**Gợi ý suy luận:**
- DB và broker là hai hệ thống độc lập: có một `COMMIT` chung bao trùm cả hai không (phạm vi của transaction)?
- Nếu muốn "ghi DB" và "gửi message" thành một hành động, bạn có thể đưa chúng về cùng một nơi nào (một transaction DB, rồi gửi sau)?
- Sau khi gửi sau, có thể gửi hai lần không, và bên nhận cần gì (at-least-once, idempotent)?
- Khi không còn ACID giữa các service, một bước đã commit mà bước sau lỗi thì "quay lại" bằng cách nào (transaction bù)?

**Lập luận:** Vì DB và broker là hai hệ thống độc lập, nên không có `COMMIT` chung, và chắc chắn sẽ có lúc một bên thành công, bên kia thất bại: đơn hàng được lưu mà event mất vĩnh viễn. Để cứu, ta đưa hai việc về **một** transaction DB: ghi event vào bảng outbox cùng transaction với dữ liệu nghiệp vụ; một process riêng (poller hoặc CDC như Debezium) đọc outbox rồi đẩy lên broker. Vì process đó có thể gửi xong nhưng mất ACK rồi gửi lại, nên kết quả là at-least-once, và consumer phải idempotent. Với chuỗi nhiều service, 2PC cho tính nguyên tử nhưng lock tài nguyên và coordinator thành điểm nghẽn, nên hiếm dùng giữa service. Saga chấp nhận không có ACID: mỗi bước là transaction cục bộ, bước hỏng thì chạy các bước bù theo thứ tự ngược.

**Đáp án ngắn:** Dual write không an toàn nên tôi dùng outbox: ghi event cùng transaction với dữ liệu, relay gửi lên broker, consumer khử trùng. Với transaction xuyên service tôi dùng saga với bước bù trừ idempotent, vì 2PC lock tài nguyên và có điểm nghẽn.

**Nhớ:** Không có commit chung giữa DB và broker: Outbox + consumer idempotent cho tin nhắn, Saga + bù trừ cho transaction nhiều bước. Xem [lt-10](/go?p=15-System%20Design%2Fhard%2Flt-10-distributed-transactions.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Ba kịch bản liên tiếp:

```text
A. Dual write (DB commit roi moi gui broker):
  loi: broker down
  DB co: [order-1], broker co: []  => LECH, don hang khong bao gio duoc thong bao
B. Outbox:
  relay: broker down, giu lai order-2 trong outbox
  relay: gui order-2 nhung MAT ACK -> se gui lai (trung)
  consumer: xu ly order-2
  consumer: bo qua trung order-2
  DB: [order-2], outbox con: [], consumer da nhan 2 lan nhung xu ly 1 lan
C. Saga:
  giu-kho: OK
  tru-tien: OK
  LOI: tao-van-don that bai -> chay bu tru nguoc
  BU TRU tru-tien
  BU TRU giu-kho
```

(A) đơn hàng được lưu nhưng event mất vĩnh viễn: không ai biết để giao hàng. (B) outbox giữ event cho tới khi gửi được; chấp nhận gửi trùng và để consumer khử trùng. (C) bước 3 thất bại nên các bước đã xong được **bù trừ theo thứ tự ngược**.

Mã Spring, _minh họa, chưa chạy thử_:

```java
@Transactional
public void create(Order o) {
    orderRepo.save(o);
    // cùng transaction
    outboxRepo.save(new OutboxEvent("OrderCreated", o.getId(), toJson(o)));
}
// Tiến trình riêng: select ... from outbox where sent=false order by id; gửi Kafka; đánh dấu sent
```

**Hỏi xoáy 1:** Bước bù trừ có phải là rollback không?

- Gợi ý: sau khi một transaction cục bộ đã commit, người khác có thể đã thấy kết quả của nó chưa? Hành động nào trong thực tế đảo ngược được hoàn toàn (email đã gửi, tiền đã chuyển)?
- Lập luận: vì mỗi bước đã commit và hiển thị cho người khác, nên không thể xóa dấu vết như rollback; chỉ có thể làm một transaction mới mang ý nghĩa ngược lại (hoàn tiền kèm phí). Vì người khác có thể thấy state trung gian, nên cần thiết kế trạng thái như "PENDING" và bù trừ cho từng bước.
- Đáp: Không. Compensation là một transaction mới đảo nghĩa nghiệp vụ và có thể không đảo hoàn toàn.

**Hỏi xoáy 2:** Nếu chính bước bù trừ cũng lỗi thì ai retry?

- Gợi ý: nếu không bù được thì hệ thống mắc kẹt ở trạng thái nào (không nhất quán)? Vậy bước bù cần tính chất gì để retry không gây hại?
- Lập luận: vì không còn cách nào khác để kéo hệ thống về nhất quán, nên bước bù phải retry tới khi thành công; vì retry có thể chạy lặp, nên nó phải idempotent; vì có thể vẫn thất bại, nên cần cảnh báo và xử lý thủ công, và bộ điều phối lưu trạng thái để tiếp tục sau khi sập.
- Đáp: Bước bù phải idempotent và retry đến khi xong, có cảnh báo/xử lý thủ công nếu vẫn lỗi, và trạng thái saga được lưu bền.

**Sai lầm hay gặp:** vừa `save()` vừa `kafkaTemplate.send()` trong cùng method và tin là an toàn (kịch bản A); quên rằng bù trừ cũng có thể lỗi.

---

## 5. Idempotency và "exactly-once" thực tế

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Client gọi thanh toán 100, bị timeout, nên gửi lại. Server đã trừ tiền ở lần đầu nhưng response bị mất. Số dư sẽ ra sao, và làm sao bảo đảm chỉ trừ một lần, kể cả khi hai request giống hệt nhau đến cùng lúc? Kafka nói có "exactly-once" thì đủ chưa?

**Gợi ý suy luận:**
- Khi client không nhận được phản hồi, nó biết được server đã xử lý hay chưa không (mất ở chiều đi hay chiều về)?
- Nếu không biết thì cách duy nhất để chắc ăn là gì, và hệ quả với server (nhận cùng yêu cầu nhiều lần)?
- Làm sao server nhận ra "cùng một yêu cầu" (lock do client sinh)? Kiểm tra rồi ghi có an toàn khi hai request đến đồng thời không (check-then-act, tính nguyên tử)?
- Phạm vi exactly-once của Kafka dừng ở đâu (ranh giới hệ thống)?

**Lập luận:** Vì client không thể phân biệt "request mất" với "response mất", nên cách duy nhất để chắc ăn là gửi lại. Vì gửi lại, nên server sẽ thấy cùng yêu cầu nhiều lần; hệ thống tin cậy thực chất là **at-least-once cộng xử lý idempotent**. Để nhận ra yêu cầu lặp, client sinh idempotency key; server lưu kết quả theo key (UNIQUE) và trả bản cũ khi gặp lại. Nhưng "kiểm tra rồi ghi" bị hở khi hai request cùng key đến đồng thời (cả hai cùng thấy chưa có), nên phải dùng thao tác nguyên tử như ràng buộc UNIQUE. Cuối cùng, vì transaction Kafka chỉ bao trùm Kafka, nên tác động ra ngoài (ghi DB khác, gọi API) vẫn cần idempotency riêng.

**Đáp án ngắn:** Vì không thể biết request hay response bị mất nên client phải retry, do đó server phải idempotent: dùng idempotency key có ràng buộc UNIQUE, ghi cùng transaction với tác động nghiệp vụ. Exactly-once của Kafka không bao phủ tác động ngoài Kafka.

**Nhớ:** At-least-once + idempotent = hiệu ứng exactly-once; khử trùng phải nguyên tử và cùng transaction với tác động. Xem [lt-26](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Thanh toán 100, response bị mất nên client retry:

```text
Khong co idempotency key: client timeout roi retry
  so du = 800 (dung ra 900)
Co Idempotency-Key, retry tuan tu:
  lan 1: RECEIPT-pay-777
  retry: RECEIPT-pay-777
  so du = 900
Hai request CUNG key den DONG THOI:
  RECEIPT-pay-888 / RECEIPT-pay-888  so du = 900
```

Dòng cuối quan trọng: kiểm tra-rồi-ghi không an toàn khi hai request đến **cùng lúc**; phải dùng thao tác **nguyên tử** (ở đây `computeIfAbsent`, trong DB là ràng buộc UNIQUE trên key). Mã Spring, _minh họa, chưa chạy thử_:

```java
@Transactional
public Receipt pay(String idemKey, PayRequest r) {
    try {
        // UNIQUE(idem_key): request thứ hai ném DuplicateKeyException
        idemRepo.insert(idemKey);
    } catch (DuplicateKeyException e) {
        return receiptRepo.findByIdemKey(idemKey); // trả kết quả cũ
    }
    // charge và ghi key cùng một transaction
    return receiptRepo.save(charge(r, idemKey));
}
```

**Hỏi xoáy 1:** Lưu idempotency key ở Redis hay DB? Và key hết hạn rồi mà client retry muộn thì sao?

- Gợi ý: để key và tác động nghiệp vụ cùng đúng hoặc cùng sai thì chúng cần nằm trong cùng một transaction hay không? Key có TTL thì cửa sổ nào còn bảo vệ được?
- Lập luận: vì key trong cùng DB với tác động có thể commit chung, nên đúng tuyệt đối. Vì Redis tách khỏi DB nên có cửa sổ lệch (đã trừ tiền, chưa kịp ghi key). Vì key hết TTL thì mất khả năng nhận ra lặp, nên TTL phải dài hơn thời gian client còn có thể retry.
- Đáp: Ưu tiên lưu key ở cùng DB với tác động; nếu dùng Redis thì chấp nhận cửa sổ lệch, và đặt TTL dài hơn khoảng thời gian retry.

**Hỏi xoáy 2:** Vậy Kafka "exactly-once" có đủ để không trừ tiền hai lần không?

- Gợi ý: transaction Kafka bao trùm những gì (đọc, xử lý, ghi trong Kafka), còn việc trừ tiền ở DB ngoài thì sao?
- Lập luận: vì transaction Kafka không bao trùm hệ thống ngoài, nên consumer vẫn có thể ghi DB hai lần khi xử lý lại; do đó cần idempotency ở bước ghi cuối.
- Đáp: Không nếu việc trừ tiền là ghi DB ngoài hoặc gọi API ngoài.

**Sai lầm hay gặp:** `if (!processed(id)) process(id)` (check-then-act); đặt key do server sinh sau khi xử lý (client retry sẽ không có key).

---

## 6. Kafka: partition, consumer group và thứ tự

**Câu hỏi:** Topic đơn hàng có 3 partition và chạy ổn. Team quyết định tăng lên 4 partition để xử lý nhanh hơn, rồi thấy thỉnh thoảng một đơn hàng bị xử lý "sai thứ tự". Vì sao? Và vì sao khi một tenant lớn chiếm 80% lượng message thì thêm consumer cũng không giúp gì?

**Gợi ý suy luận:**
- Để xử lý parallel thì phải chia dữ liệu; chia rồi thì thứ tự còn được đảm bảo ở mức nào (trong partition, không giữa các partition)?
- Message nào vào partition nào (`hash(key) mod số partition`)? Nếu số partition đổi thì phép chia dư đổi theo ra sao?
- Trong một consumer group, mỗi partition được gán cho mấy consumer? Nếu 80% message cùng key thì chúng cùng rơi vào đâu?

**Lập luận:** Vì muốn parallel phải chia nhỏ, nên Kafka chọn partition làm đơn vị chia, và thứ tự chỉ có **trong** partition. Vì key quyết định partition qua `hash(key) mod N`, nên message cùng key luôn cùng partition, và thứ tự theo thực thể được giữ. Nhưng khi N đổi từ 3 sang 4, kết quả phép chia dư đổi với phần lớn key (ở mô phỏng là 75%), nên các message cũ và mới của cùng một đơn hàng nằm ở hai partition, bị hai consumer xử lý và có thể đảo thứ tự trong lúc chuyển tiếp. Còn hot key: vì cùng key thì cùng partition, và mỗi partition chỉ gán cho **một** consumer trong group, nên toàn bộ 80% tải dồn vào một consumer; thêm consumer không chia được partition đó.

**Đáp án ngắn:** Thứ tự chỉ đảm bảo trong partition, key quyết định partition, nên tăng số partition làm đổi ánh xạ key và có thể đảo thứ tự lúc chuyển. Số consumer hữu ích tối đa bằng số partition, và hot key dồn tải vào một partition mà thêm consumer không giải được.

**Nhớ:** Parallel hóa = mất thứ tự giữa các phần; thứ tự theo key; 1 partition thuộc 1 consumer trong group. Xem [lt-07](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Mô phỏng ánh xạ key sang partition (dùng `hashCode` để minh họa; Kafka thật dùng murmur2 nhưng cùng nguyên lý):

```text
key          | 3 partition | 4 partition
order-1001   |           2 |           3
order-1002   |           0 |           0
order-1003   |           1 |           1
order-1004   |           2 |           2
order-1005   |           0 |           3
order-1006   |           1 |           0
Khi tang 3 -> 4 partition: 7502/10000 key (75%) doi partition
Hot key: tai theo partition = [481, 516, 8495, 508]
```

Hai hệ quả: (1) `order-1001` đang ở partition 2, sau khi tăng thành 4 partition nó sang partition 3, nên các message cũ và mới của cùng một đơn hàng nằm ở **hai partition khác nhau** và có thể bị consumer khác nhau xử lý **đảo thứ tự** trong lúc chuyển tiếp (khoảng 75% key bị ảnh hưởng). (2) Khi 80% message dùng chung một key (tenant lớn), một partition nhận ~85% tải trong khi ba partition còn lại gần như rảnh: thêm consumer không giúp gì.

**Hỏi xoáy 1:** Nếu nghiệp vụ cần thứ tự toàn cục trên cả topic thì sao?

- Gợi ý: thứ tự toàn cục chỉ có khi mọi message đi qua một "hàng" duy nhất; điều đó đánh đổi gì? Và nghiệp vụ thực sự cần thứ tự của cái gì?
- Lập luận: vì thứ tự chỉ có trong partition, nên toàn cục nghĩa là một partition, tức hy sinh parallel. Nhưng thường chỉ cần thứ tự theo thực thể (một đơn hàng, một tài khoản), thứ mà key đã đáp ứng.
- Đáp: Dùng một partition (mất parallel), hoặc xem lại yêu cầu: thường chỉ cần thứ tự theo thực thể, key đã đủ.

**Hỏi xoáy 2:** Còn hot key thì xử lý thế nào?

- Gợi ý: nếu muốn rải tải thì phải làm key bớt giống nhau; đổi lại mất cái gì?
- Lập luận: vì rải bằng hậu tố (`tenant-VIP#0..7`) làm các message của tenant đi nhiều partition, nên mất thứ tự giữa các hậu tố; chỉ làm khi thứ tự theo tenant không bắt buộc. Cách khác là tách tenant lớn sang topic riêng.
- Đáp: Thêm hậu tố vào key để rải (chấp nhận mất thứ tự giữa các hậu tố) hoặc tách tenant lớn sang topic riêng.

**Sai lầm hay gặp:** mong có thứ tự toàn cục trên cả topic; chọn số partition quá nhỏ rồi tăng sau (xem ví dụ); chọn key có phân phối lệch.

---

## 7. Offset, at-least-once, DLQ và rebalance

**Câu hỏi:** Consumer đang xử lý message m3 thì sập. Khởi động lại, m3 có bị mất hay bị xử lý hai lần, tùy vào đâu? Và vì sao một consumer xử lý quá chậm lại khiến cả lô message bị xử lý lặp?

**Gợi ý suy luận:**
- Offset là bookmark; "commit bookmark" và "xử lý message" là một hành động hay hai hành động riêng (cửa sổ sập giữa chúng)?
- Nếu commit trước khi xử lý rồi sập, restart sẽ bắt đầu từ đâu? Nếu commit sau khi xử lý rồi sập đúng giữa hai việc thì sao?
- Group coordinator biết consumer còn sống bằng cách nào (`poll` trong `max.poll.interval.ms`)? Khi coi là chết thì partition đi đâu và đọc từ offset nào?
- Một message "độc" (poison) luôn lỗi thì xử lý ra sao để khỏi chặn cả partition?

**Lập luận:** Vì commit và xử lý là hai hành động riêng, nên giữa chúng luôn có cửa sổ sập. Nếu commit **trước**, sập khi xử lý thì m3 đã được đánh dấu xong nhưng chưa làm: **mất** (at-most-once). Nếu commit **sau**, sập trước commit thì restart đọc lại m3: không mất nhưng có thể **trùng** (at-least-once), nên thực tế chọn at-least-once cộng idempotent. Về rebalance: vì coordinator chỉ biết consumer còn sống qua `poll`, nên xử lý một lô lâu hơn `max.poll.interval.ms` bị coi là chết, partition chuyển sang consumer khác. Vì consumer mới đọc từ offset đã commit cuối cùng, nên lô cũ bị xử lý lặp, còn commit muộn của consumer cũ bị từ chối. Với poison message: retry có giới hạn rồi chuyển sang DLT để non-blocking partition.

**Đáp án ngắn:** Commit trước xử lý thì có thể mất (at-most-once), commit sau thì có thể trùng (at-least-once), nên tôi dùng at-least-once với xử lý idempotent. Xử lý quá `max.poll.interval.ms` gây rebalance và xử lý lặp lô; sửa bằng giảm `max.poll.records`, tăng khoảng thời gian cho phép hoặc đẩy việc nặng sang thread khác. Message độc thì retry có hạn rồi vào DLT.

**Nhớ:** Thứ tự commit/xử lý quyết định mất hay trùng; rebalance do không `poll` kịp. Xem [lt-07](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Năm message, consumer sập quanh message 3:

```text
Commit TRUOC khi xu ly (at-most-once):
  *** consumer sap khi dang xu ly m3 (offset da commit = 3), khoi dong lai
  da xu ly: [m1, m2, m4, m5]
Commit SAU khi xu ly (at-least-once), sap luc dang xu ly m3 (chua xong):
  *** consumer sap khi dang xu ly m3 (offset da commit = 2), khoi dong lai
  da xu ly: [m1, m2, m3, m4, m5]
Sap sau khi XU LY XONG m3 nhung truoc COMMIT: offset=2
  da xu ly: [m1, m2, m3, m3, m4, m5]  => m3 bi xu ly 2 lan
```

Commit trước: **m3 mất** (đã đánh dấu xong nhưng chưa xử lý). Commit sau: không mất; nhưng nếu sập đúng lúc xử lý xong và chưa kịp commit thì **m3 chạy hai lần**. Không có cách commit "nguyên tử cùng xử lý" nếu việc xử lý nằm ngoài Kafka, nên idempotent là bắt buộc.

Timeline rebalance do xử lý chậm, _minh họa, chưa chạy thử_ (`max.poll.interval.ms=300000`, mỗi batch xử lý 6 phút):

| Thời điểm | Event |
|---|---|
| T+0 | Consumer C1 `poll` nhận lô 500 message, bắt đầu xử lý |
| T+5 phút | Quá `max.poll.interval.ms`, group coordinator coi C1 là chết, **rebalance**, partition chuyển sang C2 |
| T+5 phút | C2 đọc từ offset đã commit cuối cùng: lô của C1 **xử lý lặp** |
| T+6 phút | C1 xử lý xong, `commit` bị từ chối vì không còn sở hữu partition (`CommitFailedException`) |

Sửa: giảm `max.poll.records` để mỗi batch kịp trong hạn, hoặc tăng `max.poll.interval.ms`, hoặc đẩy việc nặng sang thread khác và gọi `pause()`.

**Hỏi xoáy 1:** Với message lỗi, retry ngay tại chỗ hay dùng retry topic?

- Gợi ý: nếu retry tại chỗ thì consumer có đọc tiếp message sau không? Nếu chuyển message hỏng sang topic khác thì thứ tự thay đổi ra sao?
- Lập luận: vì retry tại chỗ giữ consumer ở message hỏng, nên bảo toàn thứ tự nhưng cả partition đứng. Vì retry topic cho consumer đi tiếp, nên non-blocking nhưng message hỏng đến sau các message kế tiếp, tức phá thứ tự.
- Đáp: Chọn theo việc thứ tự có bắt buộc không: bắt buộc thì retry tại chỗ có giới hạn, không thì retry topic rồi DLT.

**Hỏi xoáy 2:** Rebalance làm cả group dừng, có cách nào giảm không?

- Gợi ý: nếu chỉ một vài partition cần đổi chủ, có cần bắt mọi consumer nhả hết không?
- Lập luận: vì chế độ eager buộc mọi consumer nhả hết partition rồi gán lại, nên cả group dừng. Cooperative chỉ chuyển những partition cần chuyển, nên phần còn lại tiếp tục chạy.
- Đáp: Dùng cooperative rebalance để chỉ di chuyển các partition cần thiết.

**Sai lầm hay gặp:** xử lý quá lâu trong vòng `poll` gây rebalance liên tục; bắt exception rồi bỏ qua (mất message âm thầm); auto-commit mà không nghĩ đến lỗi giữa chừng.

---

## 8. Kafka: retention, compaction và backpressure

**Câu hỏi:** Một consumer đã đọc hết message rồi, vì sao dữ liệu vẫn nằm trong topic? Một consumer mới vào sau đọc lại được gì? Và nếu một consumer ngừng chạy quá lâu thì điều gì có thể xảy ra, dù broker vẫn khỏe?

**Gợi ý suy luận:**
- Kafka là queue xóa-khi-đọc hay nhật ký ghi nối thêm? Vậy dữ liệu bị xóa vì lý do gì (thời gian, dung lượng)?
- Nếu muốn một topic biểu diễn "trạng thái hiện tại" chứ không phải mọi event, thì giữ bản ghi nào của mỗi key (compaction, tombstone)?
- Consumer đọc theo kiểu kéo hay đẩy? Consumer chậm ảnh hưởng broker thế nào, và khi lag vượt retention thì sao?

**Lập luận:** Vì Kafka là log ghi nối thêm, nên dữ liệu ở lại theo retention (thời gian/dung lượng), không phụ thuộc có ai đọc hay chưa; do đó replay và thêm consumer mới được. Vì có những topic chỉ cần trạng thái mới nhất, nên compaction giữ bản ghi cuối của mỗi key và value `null` (tombstone) báo xóa key; consumer mới đọc log đã compact dựng lại đúng "bảng hiện tại". Vì consumer là bên kéo dữ liệu theo nhịp của mình, nên consumer chậm chỉ làm lag tăng, không làm broker sập. Nhưng vì retention vẫn chạy bất kể ai đọc, nên nếu lag vượt retention thì dữ liệu bị xóa trước khi đọc: mất message. Retention vì thế cũng là quyết định chi phí lưu trữ.

**Đáp án ngắn:** Kafka là log chứ không phải queue xóa-khi-đọc: dữ liệu ở lại theo retention, compaction giữ bản mới nhất mỗi key. Consumer chậm không làm hỏng broker nhưng nếu lag vượt retention thì mất dữ liệu, nên phải cảnh báo lag và đặt retention lớn hơn sự cố dài nhất chấp nhận.

**Nhớ:** Log + retention + compaction = replay và trạng thái mới nhất; pull-based nên backpressure tự nhiên. Xem [lt-07](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Compaction trên log 6 bản ghi:

```text
Log goc (offset:key=value):
  0: user1 = name=An
  1: user2 = name=Binh
  2: user1 = name=An Nguyen
  3: user3 = name=Chi
  4: user2 = null
  5: user1 = name=An N.
Sau compaction (giu ban ghi MOI NHAT moi key, null = tombstone):
  3: user3 = name=Chi
  4: user2 = null
  5: user1 = name=An N.
```

Consumer mới đọc log đã compact sẽ dựng lại đúng "bảng hiện tại" (user1 và user3, user2 đã xóa) mà không phải đọc cả lịch sử. Tính dung lượng (Python): 50 MB/s, giữ 7 ngày, replication factor 3:

```text
Dung luong: 90.7 TB (50MB/s, 7 ngay, RF=3)
Voi nen ~3x: 30.2 TB
```

Con số này cho thấy retention là **quyết định chi phí** chứ không chỉ cấu hình. Cấu hình, _minh họa, chưa chạy thử_:

```properties
# Topic sự kiện: giữ 7 ngày
retention.ms=604800000
# Topic trạng thái: giữ bản mới nhất mỗi key
cleanup.policy=compact
# Độ bền: ghi cần đủ bản sao đồng bộ
min.insync.replicas=2          # cùng acks=all ở producer, RF=3
```

**Hỏi xoáy 1:** Sau compaction, bản ghi cũ có biến mất ngay không? Dùng nó để xóa dữ liệu cá nhân được không?

- Gợi ý: compaction chạy lúc nào và trên phần nào của log (segment không còn active, chạy nền)? Consumer cần thời gian để thấy tombstone thì tombstone phải làm gì (giữ lại một thời gian)?
- Lập luận: vì việc dọn chạy nền trên các segment không còn active, nên bản ghi cũ vẫn đọc được một lúc. Vì consumer cần kịp thấy tombstone, nên tombstone cũng được giữ thêm (`delete.retention.ms`). Do đó không thể dựa vào compaction để xóa tức thì.
- Đáp: Không xóa ngay; yêu cầu như GDPR cần cơ chế khác.

**Hỏi xoáy 2:** Quay lại consumer chậm: khi nào nó gây mất dữ liệu?

- Gợi ý: lag là khoảng cách giữa offset đọc và đầu log; retention xóa theo thời gian bất kể ai đọc. Hai đường này gặp nhau lúc nào?
- Lập luận: vì lag tăng dần còn retention xóa đầu log theo thời gian, nên khi consumer chậm hơn khoảng giữ thì offset nó cần đã bị xóa. Do đó cần cảnh báo lag sớm.
- Đáp: Khi lag vượt retention. Đặt retention lớn hơn thời gian sự cố dài nhất bạn chấp nhận và cảnh báo lag.

**Sai lầm hay gặp:** retention quá ngắn rồi consumer ngừng lâu bị mất dữ liệu; nhầm Kafka với queue xóa-khi-đọc.

---

## 9. CQRS và Event Sourcing: lợi, hại, khi nào dùng?

**Câu hỏi:** Hệ thống ngân hàng cần biết số dư tại bất kỳ thời điểm nào trong quá khứ và có kiểm toán đầy đủ. Bạn lưu dữ liệu thế nào, và chuyện gì xảy ra khi một người vừa nạp tiền xong mở app lại thấy số dư cũ?

**Gợi ý suy luận:**
- Có hai cách lưu cùng một dữ liệu: ghi đè trạng thái hiện tại, hoặc lưu chuỗi việc đã xảy ra. Cách nào làm mất thông tin quá khứ?
- Nếu chỉ lưu event thì trạng thái hiện tại lấy ra bằng cách nào (phát lại), và khi chuỗi có 100 nghìn event thì sao (snapshot)?
- Nếu đường ghi và đường đọc cần hình dạng dữ liệu khác nhau, tách chúng ra có hệ quả gì về latency giữa hai bên (read model cập nhật sau)?

**Lập luận:** Vì ghi đè trạng thái làm mất lịch sử, còn lưu chuỗi event (event sourcing) thì không mất gì, nên bài toán kiểm toán và quay về quá khứ chọn event sourcing: số dư chỉ là kết quả phát lại, và quay về quá khứ là phát lại tới event thứ k. Vì mọi truy vấn phải dựng lại từ lịch sử, nên chuỗi dài cần snapshot, và truy vấn phức tạp cần projection. CQRS tách đường ghi khỏi đường đọc vì hai bên cần hai hình dạng dữ liệu khác nhau. Vì read model được cập nhật sau khi ghi xong, nên có latency, và người dùng vừa ghi có thể thấy dữ liệu cũ. Cách xử lý là read-your-writes: đọc từ phía ghi trong vài giây, hoặc trả dữ liệu mới ngay trong response của lệnh ghi. Hai kỹ thuật này độc lập nhau.

**Đáp án ngắn:** Tôi dùng event sourcing để không mất lịch sử và dựng lại quá khứ, thêm snapshot cho chuỗi dài, và CQRS để tối ưu đọc riêng. Cái giá là truy vấn cần projection, schema event phải tiến hóa, và read model trễ nên cần read-your-writes.

**Nhớ:** Event sourcing = lưu event, trạng thái là phát lại; CQRS = tách ghi/đọc, đổi lấy eventual consistency. Xem [lt-25](/go?p=01-Spring-Boot%2Fhard%2Flt-25-cqrs-event-sourcing.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._

```text
Event store: [Deposited(100), Withdrawn(30), Deposited(50)] -> so du phat lai = 120
Quay ve qua khu (sau 2 su kien): 70
Phat lai 100005 su kien: so du=130; dung snapshot + 2 su kien moi: so du=130 (chi doc 2 su kien thay vi 100005)
CQRS: ghi xong (so du that = 130) nhung read model con tre -> doc thay 120 cho toi khi projection chay
```

Ba điểm: trạng thái chỉ là **kết quả phát lại** nên "quay về quá khứ" miễn phí (70 sau hai event); khi chuỗi dài, **snapshot** tránh phát lại 100 005 event; và read model là bản sao **trễ** nên người dùng vừa ghi xong có thể chưa thấy (cần read-your-writes: đọc từ phía ghi trong vài giây, hoặc trả về dữ liệu mới ngay trong response của lệnh ghi).

**Hỏi xoáy 1:** Sau hai năm muốn đổi cấu trúc một event, làm sao khi các event cũ đã lưu?

- Gợi ý: nếu log là bản ghi những gì đã xảy ra thì có nên sửa nó không? Vậy phiên bản cũ được đọc bằng code mới như thế nào?
- Lập luận: vì event đã lưu là bất biến, nên không sửa tại chỗ. Vì code mới vẫn phải đọc event v1, nên dùng upcasting: khi đọc v1, bộ chuyển đổi nâng lên v2 trong memory (thêm trường mặc định); thay đổi mới thì thêm phiên bản event.
- Đáp: Dùng upcasting và thêm phiên bản event mới, không sửa event cũ.

**Hỏi xoáy 2:** Log bất biến thì xóa dữ liệu cá nhân (GDPR) thế nào?

- Gợi ý: nếu không xóa được bản ghi, có cách nào làm dữ liệu trở nên không đọc được (mã hóa, hủy key) hoặc không đặt nó vào log từ đầu?
- Lập luận: vì không sửa được bản ghi, nên mã hóa dữ liệu cá nhân bằng key riêng cho từng người và hủy key khi cần xóa (crypto-shredding). Hoặc không đưa dữ liệu cá nhân vào event, chỉ tham chiếu ID.
- Đáp: Crypto-shredding hoặc chỉ lưu tham chiếu ID trong event.

**Sai lầm hay gặp:** áp Event Sourcing cho CRUD thông thường; sửa event đã lưu thay vì thêm event bù.

---

## 10. Distributed lock: Redis, ZooKeeper và rủi ro

**Câu hỏi:** Process A lấy distributed lock có TTL 10 giây, rồi bị GC pause 15 giây. Trong lúc đó B lấy được lock và ghi dữ liệu. A tỉnh dậy vẫn tin mình giữ lock và ghi tiếp. Dữ liệu cuối cùng là của ai, và chặn lỗi này ở đâu?

**Gợi ý suy luận:**
- Vì sao distributed lock cần TTL (tránh kẹt khi người giữ lock chết)?
- Một process bị dừng (GC pause, swap) có tự biết nó đã bị dừng và lock đã hết hạn không?
- Nếu kiểm tra "mình còn giữ lock" chỉ ở phía client thì có đáng tin không? Nơi nào mới thấy cả hai lần ghi để từ chối cái cũ (token tăng dần, version)?

**Lập luận:** Vì phải khỏi kẹt khi người giữ lock chết, nên lock có TTL. Vì đồng hồ là cơ chế duy nhất giải phóng lock, nên khi A bị dừng quá TTL, lock hết hạn và B hợp lệ lấy được. Vì A không thể biết mình đã bị dừng, nên tỉnh dậy vẫn tin mình giữ lock và ghi: dữ liệu cũ của A đè dữ liệu mới của B. Kiểm tra phía client không cứu được vì đúng chỗ kiểm tra đó là chỗ A bị sai. Vì thế phải kiểm tra tại nơi dữ liệu nằm: fencing token (số tăng dần kèm lock), storage từ chối token nhỏ hơn token đã thấy (token 33 < 34). Trong DB việc này là optimistic locking với cột `version`.

**Đáp án ngắn:** Distributed lock dựa trên thời gian nên không bảo vệ được tính đúng đắn một mình. Cần fencing token hoặc kiểm tra version tại nơi lưu dữ liệu để từ chối ghi của người giữ lock đã hết hạn.

**Nhớ:** Lock TTL + process có thể bị dừng = phải fencing tại nơi dữ liệu. Xem [lt-26](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ A lấy lock token 33, bị GC pause 15 giây (TTL 10 giây), B lấy lock token 34:

```text
KHONG co fencing token:
  t=0   A lay khoa (token 33), TTL=10s
  t=1   A bi GC pause 15s...
  t=10  khoa het han
  t=11  B lay khoa (token 34) va ghi
  Storage: chap nhan ghi cua B (token 34)
  t=16  A tinh day, TIN la minh van giu khoa, ghi
  Storage: chap nhan ghi cua A (token 33)
  Ket qua cuoi: A                        <- ghi de du lieu moi cua B bang du lieu cu
CO fencing token:
  ...
  Storage: TU CHOI ghi cua A (token 33 < 34)
  Ket qua cuoi: B
```

Cùng một kịch bản, khác biệt nằm ở **kiểm tra token tại nơi dữ liệu nằm**. Trong DB, fencing thường là optimistic locking, _minh họa, chưa chạy thử_:

```sql
UPDATE account SET balance = ?, version = version + 1
-- version cũ của A không khớp nên 0 dòng bị ảnh hưởng
WHERE id = ? AND version = ?;
```

**Hỏi xoáy 1:** Redlock có đủ an toàn để bảo vệ tính đúng đắn không?

- Gợi ý: kịch bản trên cho thấy cái gì làm key sai (đồng hồ, latency không có chặn trên)? Redlock có sinh được fencing token không?
- Lập luận: vì Redlock giả định đồng hồ và latency bị block trên, điều không được đảm bảo, và không sinh được fencing token, nên không đủ cho bài toán cần đúng tuyệt đối. Nếu lock chỉ để tránh làm trùng việc (hiệu quả) thì chấp nhận được.
- Đáp: Có tranh luận (Kleppmann và antirez). Lock để tối ưu thì được; lock để bảo vệ tính đúng đắn thì dùng hệ đồng thuận (ZooKeeper/etcd) kèm fencing, hoặc ràng buộc ở DB.

**Hỏi xoáy 2:** Vậy khi nào không cần distributed lock, chỉ dùng optimistic locking?

- Gợi ý: nếu kiểm tra version nằm ngay ở DB thì còn cần hạ tầng lock không? Điều kiện để retry hợp lý là gì (tranh chấp thấp)?
- Lập luận: vì cập nhật có điều kiện `WHERE version = ?` đúng ở nơi dữ liệu nằm, nên không cần hạ tầng lock; thất bại thì đọc lại và retry, hợp lý khi tranh chấp thấp và thao tác retry được.
- Đáp: Khi tranh chấp thấp và thao tác retry được, optimistic locking thay được distributed lock và đúng hơn.

**Sai lầm hay gặp:** xóa lock của người khác sau khi lock mình hết hạn (phải so giá trị trước khi xóa, bằng Lua `SET key value NX PX ttl`); coi lock Redis là tuyệt đối an toàn; Redis đơn lẻ mất lock khi failover do replication async.

---

## 11. CAP và chọn mức nhất quán

**Câu hỏi:** Người dùng đổi tên, bấm lưu, tải lại trang và thấy tên cũ. Hệ thống có lỗi không? Và khi mạng giữa hai trung tâm dữ liệu đứt, vì sao một thao tác như chuyển tiền và một thao tác như đếm lượt xem lại nên chọn khác nhau?

**Gợi ý suy luận:**
- Ghi vào leader, đọc từ replica có latency sao chép: ngay sau khi ghi, replica đã có bản mới chưa?
- Khi mạng đứt thành hai nửa không nói chuyện được, một nửa còn nhận ghi hay từ chối ghi; mỗi lựa chọn mất đi điều gì (C hoặc A)?
- Hậu quả của dữ liệu cũ khác nhau thế nào giữa số dư tài khoản và lượt xem?
- Nếu có N bản sao, cần bao nhiêu bản ghi (W) và bao nhiêu bản đọc (R) để tập đọc giao tập ghi?

**Lập luận:** Vì replication async nên ngay sau khi ghi, replica có thể vẫn giữ bản cũ trong cửa sổ trễ (dù mạng tốt, PACELC). Người dùng đọc phải replica nên thấy tên cũ, không phải lỗi mà là hệ quả của lựa chọn. Cách xử lý là read-your-writes: trong khoảng ngắn sau khi chính người đó ghi thì đọc từ leader. Khi mạng đứt (partition), hai nửa không thể phối hợp: hoặc cả hai tiếp tục nhận ghi (giữ A, mất C), hoặc một nửa từ chối (giữ C, mất A). Vì đây là lựa chọn theo từng thao tác, nên số dư và đặt chỗ ưu tiên C (sai thì thiệt hại thật), còn giỏ hàng, feed, lượt xem ưu tiên A. Với quorum, vì `R + W > N` nên tập đọc và tập ghi luôn giao nhau ít nhất một nút, đọc luôn thấy bản mới nhất.

**Đáp án ngắn:** Tên cũ do replica trễ, xử lý bằng read-your-writes đọc từ leader sau khi chính người đó ghi. Khi partition thì mỗi thao tác chọn C hay A theo hậu quả của dữ liệu sai; quorum `R + W > N` cho đọc thấy bản mới nhất.

**Nhớ:** Partition buộc chọn C hay A theo từng thao tác; replication lag tồn tại cả khi mạng tốt; `R + W > N`. Xem [lt-05 CAP](/go?p=15-System%20Design%2Fhard%2Flt-05-cap-consistency.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Người dùng đổi tên rồi tải lại trang; replica trễ 300 ms:

```text
Doc replica ngay sau khi ghi (replication lag 300ms): ten cu
Read-your-writes (doc leader trong 1s sau khi chinh nguoi do ghi): ten moi
Sau 400ms replica da bat kip: ten moi
```

Người dùng thấy tên cũ ngay sau khi lưu, tưởng lưu lỗi. Cách xử lý: trong khoảng ngắn sau khi **chính người đó** ghi, đọc từ leader (hoặc gắn version/timestamp vào session để chỉ chấp nhận replica đã bắt kịp). Quorum (Python), N=3:

```text
  W=1, R=1: R+W=2 <= N: co the doc ban cu
  W=2, R=2: R+W=4 > N: dam bao doc thay ban ghi moi nhat
  W=3, R=1: R+W=4 > N: dam bao doc thay ban ghi moi nhat
  W=1, R=3: R+W=4 > N: dam bao doc thay ban ghi moi nhat
  W=2, R=1: R+W=3 <= N: co the doc ban cu
```

`R + W > N` đảm bảo tập bản sao ghi và tập bản sao đọc **luôn giao nhau** ít nhất một nút, nên đọc luôn thấy bản ghi mới nhất (với điều kiện không có lỗi khác).

**Hỏi xoáy 1:** Chữ "C" của CAP có phải chữ "C" của ACID không?

- Gợi ý: một bên nói về việc nhiều bản sao có hiển thị cùng một giá trị mới nhất không, bên kia nói về điều gì với ràng buộc dữ liệu?
- Lập luận: vì C của CAP nói về các bản sao nhìn thấy cùng một thứ tự và giá trị như thể chỉ có một bản (linearizability), còn C của ACID nói về bất biến nghiệp vụ (ràng buộc, foreign key) được giữ qua transaction, nên hai khái niệm khác nhau.
- Đáp: Khác: C của CAP là linearizability, C của ACID là bất biến nghiệp vụ.

**Hỏi xoáy 2:** Vậy có hệ thống nào "CA" không?

- Gợi ý: có thể loại trừ partition trong hệ phân tán không? Câu hỏi đúng lúc đó là gì?
- Lập luận: vì mạng luôn có khả năng đứt, không loại được partition, nên "CA" chỉ đúng với hệ một nút. Câu hỏi đúng là khi partition xảy ra, thao tác này chọn C hay A.
- Đáp: Không có hệ phân tán thật sự "CA"; hãy hỏi thao tác này chọn C hay A khi partition.

**Sai lầm hay gặp:** nói "chọn 2 trong 3" như thể chọn được CA; nhầm hai chữ C; bỏ qua replication lag trong thiết kế đọc từ replica.

---

## 12. Circuit breaker, retry, timeout, bulkhead và retry storm

**Câu hỏi:** Dịch vụ thanh toán đang hỏng (luôn trả 503). Mỗi service phía trên đều có retry 3 lần "cho chắc". Vì sao dịch vụ đó không thể hồi phục, và bạn thiết kế lớp bảo vệ thế nào?

**Gợi ý suy luận:**
- Khi một dịch vụ đang hỏng và cần thời gian hồi phục, mỗi lần gọi thêm làm tải lên nó tăng hay giảm?
- Nếu 3 tầng gọi nhau và mỗi tầng retry 3 lần thì một request gốc thành bao nhiêu call (nhân lên)?
- Nếu 1000 client cùng lỗi lúc t=0 và retry theo mốc cố định thì chúng quay lại lúc nào (đồng bộ), và jitter giải quyết gì?
- Có cách nào để ngừng gọi hẳn một thời gian khi lỗi vượt ngưỡng (circuit breaker)?

**Lập luận:** Vì gọi thêm vào dịch vụ đang hỏng là thêm tải lên thứ đang cần hồi phục, nên retry thiếu kiểm soát biến lỗi nhỏ thành retry storm: 100 request ×3 lần = 300 lần gọi. Vì các tầng nhân lên, 3 tầng mỗi tầng 3 lần cho 27 lần gọi tới hạ nguồn. Vì các client lỗi cùng lúc sẽ quay lại cùng lúc, nên cần backoff lũy thừa kèm jitter để rải lần thử. Vì mục tiêu là dừng làm tải thêm, nên circuit breaker chuyển OPEN sau ngưỡng lỗi và ngừng gọi một thời gian (ở ví dụ chỉ 5 lần gọi). Timeout (dựa trên p99) và bulkhead giữ cho lỗi không lan rộng, và retry chỉ với thao tác idempotent, ở một tầng.

**Đáp án ngắn:** Mỗi call ra ngoài cần bộ bảo vệ theo class: timeout, retry có giới hạn với backoff lũy thừa và jitter (chỉ idempotent, ở một tầng), circuit breaker, bulkhead và fallback. Retry mù nhân tải theo cấp số nhân lên dịch vụ đang hỏng.

**Nhớ:** Khi downstream hỏng, giảm tải chứ không thêm tải: breaker + backoff/jitter + retry ở một tầng. Xem [lt-08](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Hạ nguồn đang hỏng (luôn 503), 100 request, mỗi request thử tối đa 3 lần:

```text
100 request, moi request retry toi da 3 lan, KHONG circuit breaker:
  so lan ha nguon bi goi = 300 (300 = x3 tai len mot he thong dang hong)
  >>> circuit chuyen OPEN sau 5 loi
100 request co circuit breaker (nguong 5 loi): ha nguon chi bi goi 5 lan
Backoff luy thua + jitter (base 100ms, tran 5000ms):
  lan thu 1: cho ngau nhien 0..200ms -> 146ms
  lan thu 2: cho ngau nhien 0..400ms -> 299ms
  lan thu 3: cho ngau nhien 0..800ms -> 278ms
  lan thu 4: cho ngau nhien 0..1600ms -> 1435ms
  lan thu 5: cho ngau nhien 0..3200ms -> 2266ms
```

Khuếch đại qua nhiều tầng (Python): 3 tầng, mỗi tầng tối đa 3 lần thử thì một request gốc có thể thành `3 × 3 × 3 = 27` lần gọi tới hạ nguồn. Jitter làm các client **không retry cùng lúc** (không có jitter, 1000 client cùng lỗi lúc t=0 sẽ cùng quay lại lúc t=200ms, rồi 400ms: sóng đồng bộ).

Cấu hình, _minh họa, chưa chạy thử_ (Resilience4j):

```yaml
resilience4j:
  circuitbreaker.instances.payment:
    sliding-window-size: 20
    failure-rate-threshold: 50        # %
    wait-duration-in-open-state: 10s
    permitted-number-of-calls-in-half-open-state: 3
  retry.instances.payment:
    max-attempts: 3
    wait-duration: 100ms
    enable-exponential-backoff: true
    exponential-backoff-multiplier: 2
    retry-exceptions: [java.io.IOException]
```

**Hỏi xoáy 1:** Đặt timeout bao nhiêu cho hợp lý?

- Gợi ý: nếu timeout bằng trung bình thì bao nhiêu phần trăm request bị cắt oan? Và nếu timeout của tôi lớn hơn timeout của người gọi tôi thì chuyện gì xảy ra với phần việc còn chạy?
- Lập luận: vì trung bình che đuôi chậm, nên dựa vào p99 của hạ nguồn. Vì người gọi tôi sẽ bỏ cuộc trước, nên timeout của tôi phải nhỏ hơn timeout của bên gọi, nếu không bên trong còn xử lý vô ích.
- Đáp: Đặt theo p99 của hạ nguồn và nhỏ hơn timeout của bên gọi mình.

**Hỏi xoáy 2:** Retry là client cố retry, còn phía server khi quá tải thì làm gì?

- Gợi ý: nếu server quá tải mà vẫn nhận hết thì sao? Và client nên phản ứng thế nào khi nhận 503 kèm `Retry-After`?
- Lập luận: vì quá tải mà nhận hết thì mọi thứ cùng chậm, nên server chủ động từ chối bớt (load shedding, `429/503`) để giữ phần còn lại chạy. Vì client retry mù sẽ phá nỗ lực đó, nên client phải tôn trọng `Retry-After`.
- Đáp: Load shedding là server chủ động từ chối bớt; hai bên phối hợp để client không retry mù.

**Sai lầm hay gặp:** retry thao tác không idempotent; timeout mặc định vô hạn; circuit breaker nhưng không có fallback hay cảnh báo.

---

## 13. Service discovery và API Gateway

**Câu hỏi:** Sau một lần autoscale, vài instance của service payment bị thay mới, nhưng client cứng địa chỉ IP trong cấu hình vẫn gọi vào instance đã biến mất. Bạn giải quyết thế nào, và một cổng vào duy nhất cho client bên ngoài nên làm gì và không nên làm gì?

**Gợi ý suy luận:**
- Trong môi trường co giãn, địa chỉ của instance sống bao lâu và cái gì cần ổn định thay thế (tên dịch vụ)?
- Ai biết hiện đang có instance nào khỏe (registry, health check) và client tra cứu bằng cách nào (client-side hoặc server-side)?
- Nếu client cache danh sách quá lâu thì một instance chết gây ra điều gì?
- Cổng vào dùng chung cho mọi client nên có điểm yếu gì nếu nhồi nghiệp vụ vào đó?

**Lập luận:** Vì instance sinh ra và biến mất theo autoscale và deploy, nên địa chỉ chỉ là thứ tạm thời; cứng địa chỉ là hỏng. Cái cần ổn định là tên dịch vụ, và phải có ai đó biết hiện có instance nào khỏe: registry, hoặc trên Kubernetes là Service kèm DNS chỉ gồm pod READY. Vì client cache danh sách, nên instance chết vẫn bị gọi tới hết TTL cache (200 req/s × 30 giây × 1/3 ≈ 2000 request lỗi), do đó cần TTL ngắn, health check chủ động, retry sang instance khác cho thao tác idempotent và graceful shutdown. Vì mọi client bên ngoài đi qua API Gateway, nên nó là chỗ hợp lý cho định tuyến, authentication, rate limit; nhưng vì nó là điểm chung, nên nhồi nghiệp vụ vào đó biến nó thành điểm nghẽn và điểm lỗi chung.

**Đáp án ngắn:** Gọi theo tên dịch vụ qua registry hoặc DNS (Kubernetes Service), có health check và graceful shutdown để không gọi vào instance chết. API Gateway làm định tuyến, authentication, rate limit ở biên, không chứa nghiệp vụ.

**Nhớ:** Địa chỉ tạm thời, tên ổn định; cache discovery quá lâu = gọi vào instance chết; gateway chỉ làm việc ở biên. Xem [lt-08](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md).

**Ví dụ:** _Đã chạy thử (tính bằng Python)._ Client cache danh sách instance 30 giây, tải 200 req/s, 3 instance, một instance chết:

```text
Client cache danh sach 30s, 1/3 instance chet: ~2000 request loi (neu khong retry)
```

(200 req/s × 30 giây × 1/3 request rơi vào instance chết.) Giảm bằng: TTL cache ngắn, health check chủ động loại instance, retry sang instance khác cho thao tác idempotent, và **graceful shutdown** để instance tự rút khỏi discovery trước khi tắt. Cấu hình, _minh họa, chưa chạy thử_:

```yaml
# Kubernetes Service: DNS tên ổn định "payment", chỉ gồm pod đã READY
spec:
  selector: { app: payment }
# Spring Cloud Gateway: định tuyến + rate limit ở biên
spring.cloud.gateway.routes:
  - id: payment
    uri: http://payment:8080
    predicates: [Path=/api/payments/**]
    filters:
      - name: RequestRateLimiter
        args: { redis-rate-limiter.replenishRate: 50, redis-rate-limiter.burstCapacity: 100 }
```

**Hỏi xoáy 1:** Gateway đã authentication rồi thì service bên trong còn cần kiểm tra không?

- Gợi ý: call nội bộ có thể bị lợi dụng không (zero trust)? Gateway biết "ai được xem đơn hàng nào" không?
- Lập luận: vì call nội bộ cũng có thể bị lợi dụng, nên service vẫn kiểm tra token và quyền. Vì authorization theo nghiệp vụ cần dữ liệu của service, nên gateway không thay thế được.
- Đáp: Gateway authentication để chặn sớm, service vẫn kiểm tra token và quyền nghiệp vụ.

**Hỏi xoáy 2:** Các service gọi nhau nội bộ có phải đi qua gateway không?

- Gợi ý: đi qua gateway thêm gì vào đường đi (một chặng, một điểm nghẽn)?
- Lập luận: vì gateway sinh ra cho client bên ngoài, nên gọi nội bộ qua nó chỉ thêm chặng và điểm nghẽn.
- Đáp: Thường không: gọi trực tiếp qua service mesh hoặc DNS nội bộ.

**Sai lầm hay gặp:** gateway làm mọi thứ (thành điểm nghẽn và điểm lỗi chung); client cache địa chỉ quá lâu, gọi vào instance đã chết.

---

## 14. Distributed tracing và quan sát hệ thống

**Câu hỏi:** Trace ID có đầy đủ ở log của request chính nhưng biến mất ở log của tác vụ async. Tệ hơn, có request B lại mang trace ID của request A. Vì sao cả hai chuyện cùng xảy ra, và bạn điều tra "API chậm bất thường" từ đâu?

**Gợi ý suy luận:**
- Trace ID thường lưu ở đâu trong process (ThreadLocal), và nó có tự đi theo khi chuyển sang thread khác, qua mạng hoặc qua queue không?
- Thread trong pool được tái sử dụng: nếu không dọn giá trị ThreadLocal sau khi xong việc thì request sau thấy gì?
- Một request qua nhiều service thì truyền trace ID bằng cách nào (header HTTP, header message)?
- Khi API chậm, đi từ thông tin tổng quát (metric) xuống chi tiết (trace, log) theo thứ tự nào?

**Lập luận:** Vì trace ID nằm ở ThreadLocal và ThreadLocal không tự đi theo khi chuyển thread, nên task chạy ở thread pool không thấy trace ID: log của việc async không gắn được với request gốc. Vì thread pool được tái sử dụng và ThreadLocal chỉ bị xóa khi code xóa, nên nếu không dọn thì thread giữ lại giá trị của request trước: request B bị ghi nhầm là A, và dữ liệu truy vết sai còn nguy hiểm hơn là không có. Vì thế phải bọc `Runnable` để sao chép rồi khôi phục ngữ cảnh (trong Spring dùng `TaskDecorator`). Qua mạng và queue thì truyền bằng header (W3C Trace Context, header Kafka). Với "API chậm": metric xác định endpoint và thời điểm, rồi lấy trace chậm để thấy span tốn nhất, rồi xem log theo trace ID.

**Đáp án ngắn:** ThreadLocal không đi theo thread và không tự dọn, nên async mất trace ID còn thread tái sử dụng rò trace ID cũ; sửa bằng TaskDecorator và context propagation. Điều tra chậm: metric RED, rồi trace p99, rồi span tốn nhất, rồi log theo trace ID.

**Nhớ:** Ngữ cảnh truy vết phải được truyền tường minh qua thread, mạng, queue và dọn sau khi dùng; ba trụ log, metric, trace. Xem [lt-08](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._

```text
[main]                       traceId = trace-abc123
[pool-1-thread-1] khong wrap     traceId = null
[pool-1-thread-1] co wrap        traceId = trace-abc123
request B (cung luong tai su dung) thay traceId = trace-REQUEST-A  <- RO RI
```

Hai lỗi cùng lúc: (1) chuyển sang thread pool **mất** trace ID (log của việc async không gắn được với request gốc); (2) thread tái sử dụng **giữ lại** giá trị của request trước nếu không dọn, nên request B bị ghi nhầm là A (dữ liệu truy vết sai nguy hiểm hơn là không có). Cách sửa: bọc `Runnable` để sao chép rồi **khôi phục** ngữ cảnh; trong Spring dùng `TaskDecorator` hoặc `ContextPropagatingTaskDecorator`; Micrometer cung cấp context propagation.

```java
@Bean
ThreadPoolTaskExecutor executor() {
    var e = new ThreadPoolTaskExecutor();
    // Spring Framework 6.2+; bản cũ hơn tự viết TaskDecorator
    e.setTaskDecorator(new ContextPropagatingTaskDecorator());
    return e;
}
```

**Hỏi xoáy 1:** Cụ thể "API chậm bất thường" điều tra từ đâu?

- Gợi ý: bạn chưa biết endpoint nào, lúc nào, service nào; công cụ nào cho bức tranh rộng trước, công cụ nào cho chi tiết một request?
- Lập luận: vì cần thu hẹp phạm vi trước, nên bắt đầu từ metric (RED) để xác định endpoint và thời điểm. Vì metric không cho thấy một request đi đâu, nên lấy một trace chậm (p99) để tìm span tốn nhất. Cuối cùng span DB thì xem SQL và `EXPLAIN`, span gọi ngoài thì xem service đó, kèm log theo trace ID.
- Đáp: Metric, rồi trace p99, rồi span chiếm thời gian nhất, rồi SQL/`EXPLAIN` hoặc service hạ nguồn, kèm log theo trace ID.

**Hỏi xoáy 2:** Không thể lưu mọi trace, vậy sampling theo tỷ lệ hay theo đuôi?

- Gợi ý: sampling theo tỷ lệ quyết định giữ trace khi nào (lúc bắt đầu), và lúc đó đã biết trace có lỗi hay chậm chưa?
- Lập luận: vì tỷ lệ quyết định trước khi biết kết quả, nên có thể bỏ lỡ đúng trace lỗi hoặc chậm hiếm. Tail-based quyết định sau khi biết kết quả nên giữ được lỗi và chậm, đổi lại collector tốn memory.
- Đáp: Tỷ lệ thì đơn giản nhưng có thể bỏ lỡ trace quan trọng; tail-based giữ lỗi/chậm nhưng tốn tài nguyên ở collector.

**Sai lầm hay gặp:** mất trace ID khi chuyển thread hoặc qua queue; log dữ liệu nhạy cảm; dùng ID người dùng làm nhãn metric (nổ cardinality).

---

## 15. Versioning API và tiến hóa schema event

**Câu hỏi:** Producer thêm field `currency` vào event. Consumer cũ chưa nâng cấp bắt đầu sập. Vì sao, và vì sao việc "đổi tên field cho đẹp" còn nguy hiểm hơn, vì không báo lỗi?

**Gợi ý suy luận:**
- Trong hệ thống nhiều đội, có thể nâng cấp mọi thứ cùng lúc không? Vậy producer và consumer có lúc nào chạy hai phiên bản khác nhau?
- Dữ liệu cũ trong topic Kafka có biến mất khi code mới ra không (code mới đọc dữ liệu cũ)?
- Consumer deserialize chặt (từ chối field lạ) khác deserialize khoan dung thế nào khi gặp field mới?
- Đổi tên field thì consumer cũ tìm field theo tên cũ và thấy gì (null)?

**Lập luận:** Vì không thể nâng cấp mọi thứ cùng lúc, nên luôn có thời gian producer và consumer chạy hai phiên bản. Vì consumer cũ deserialize chặt và gặp field lạ `currency`, nên ném lỗi: cả đàn consumer cũ sập hoặc kẹt ở poison message. Do đó consumer event nên bỏ qua field lạ (`FAIL_ON_UNKNOWN_PROPERTIES=false`). Vì dữ liệu cũ vẫn nằm trong topic và được đọc bằng code mới, nên field mới phải có giá trị mặc định (backward compatible). Vì đổi tên field khiến consumer cũ tìm tên cũ và không thấy, nên nó đọc ra `null` mà không báo lỗi: đây là thay đổi phá vỡ. Muốn đổi tên thì thêm field mới, ghi cả hai một thời gian, rồi bỏ field cũ khi hết consumer cũ.

**Đáp án ngắn:** Producer và consumer luôn lệch phiên bản trong lúc triển khai, nên chỉ thêm field có giá trị mặc định, không đổi kiểu, không xóa field bắt buộc, không đổi tên; consumer bỏ qua field lạ. Đổi tên thì thêm field mới, ghi cả hai, rồi mới bỏ field cũ.

**Nhớ:** Tương thích backward/forward và schema registry; đổi tên = thay đổi phá vỡ. Xem [lt-07](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md).

**Ví dụ:** _Đã chạy thử trên JDK 11._ Producer thêm `currency`; consumer v1 chưa nâng cấp:

```text
Producer da len v2 (them 'currency'), consumer van o v1:
  strict  v1 doc v2: LOI Unknown field: currency -> consumer sap/poison message
  tolerant v1 doc v2: 2:200  (bo qua field la)
Consumer v2 doc event cu v1 (backward): 1:100 VND  (field moi co default)
Doi ten field 'amount' -> 'total' (pha vo): consumer v1 se doc null: 3:null
```

Ba bài học: (1) consumer **chặt** (từ chối field lạ) làm cả đàn consumer sập khi producer nâng cấp, nên cấu hình bỏ qua field lạ (`FAIL_ON_UNKNOWN_PROPERTIES=false` trong Jackson) cho consumer event; (2) consumer mới đọc dữ liệu cũ phải có **giá trị mặc định** cho field mới (backward compatible); (3) **đổi tên field là thay đổi phá vỡ**, consumer cũ đọc ra `null` mà không báo lỗi. Muốn đổi tên thì thêm field mới, ghi **cả hai** một thời gian, rồi bỏ field cũ khi hết consumer.

**Hỏi xoáy 1:** Với thay đổi thêm field, nâng cấp producer trước hay consumer trước?

- Gợi ý: nếu producer lên v2 trước thì consumer v1 sẽ gặp gì (xem ví dụ)? Nếu consumer lên trước thì nó đọc được những dữ liệu nào?
- Lập luận: vì thêm field là backward compatible (code mới đọc được dữ liệu cũ), nên nâng cấp consumer trước: nó đọc được cả cũ lẫn mới, rồi mới đến producer. Với thay đổi forward compatible thì thứ tự ngược lại, nên cần biết chiều tương thích mà registry đang ép.
- Đáp: Backward compatible thì nâng cấp consumer trước; forward thì ngược lại.

**Hỏi xoáy 2:** Với API công khai, biết còn ai dùng v1 trước khi tắt bằng cách nào?

- Gợi ý: không thể đoán ai còn dùng; cái gì quan sát được từ phía server (log, metric theo version và client)?
- Lập luận: vì không đo thì không biết, nên ghi số request theo version và theo client (API key hoặc header). Vì client cần thời gian chuyển, nên thông báo bằng `Deprecation` và `Sunset` rồi tắt khi lưu lượng v1 về 0.
- Đáp: Đo lưu lượng theo version và client, thông báo bằng `Deprecation`/`Sunset`, tắt khi v1 về 0.

**Sai lầm hay gặp:** đổi tên field "cho đẹp"; deserialize chặt khiến field lạ làm consumer cũ sập.

---

## 16. Deploy không downtime và migration an toàn

**Câu hỏi:** Bạn cần đổi tên cột `phone` thành `mobile` trên bảng trăm triệu dòng mà không downtime. Vì sao `ALTER ... RENAME` trực tiếp làm hệ thống lỗi dù code mới đã sẵn sàng, và bạn làm thế nào?

**Gợi ý suy luận:**
- Trong lúc rolling deploy, có lúc nào hai phiên bản code chạy cùng nhau không? Code cũ chạy trên schema mới thì sao?
- Nếu mọi thay đổi chỉ đúng cho một phiên bản thì khoảng chuyển tiếp xảy ra điều gì? Vậy thay đổi cần tương thích theo mấy chiều?
- Có cách nào chia thay đổi thành các bước mà mỗi bước đều chạy được với cả code cũ và mới (mở rộng, ghi kép, chuyển đọc, thu hẹp)?
- Bước nào về sau không thể rollback (mất dữ liệu)?

**Lập luận:** Vì trong rolling deploy luôn có lúc hai phiên bản code chạy cùng nhau, và code cũ vẫn phải chạy trên schema mới (hoặc ngược lại), nên một `RENAME` trực tiếp làm code cũ vỡ ngay tức thì. Do đó mọi thay đổi phải tương thích hai chiều trong thời gian chuyển tiếp: expand and contract. Bản 1 thêm cột `mobile` NULL (code cũ vẫn chạy). Bản 2 ghi cả hai cột và backfill theo batch nhỏ (không lock lâu). Bản 3 chuyển đọc sang `mobile` (còn rollback được về bản 2). Bản 4 mới xóa `phone` vì chỉ khi chắc không cần quay lại. Vì xóa cột là mất dữ liệu, nên bước này không rollback được và được làm sau cùng.

**Đáp án ngắn:** Dùng expand and contract qua 4 bản phát hành: thêm cột mới, ghi kép và backfill, chuyển đọc, rồi mới xóa cột cũ. Mỗi bước tương thích với cả phiên bản code cũ và mới, và bước xóa làm sau cùng.

**Nhớ:** Rolling = hai phiên bản cùng chạy nên mọi thay đổi phải tương thích hai chiều; thêm thì rollback được, xóa thì không. Xem [lt-08](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md).

**Ví dụ:** _Minh họa, chưa chạy thử._ Đổi tên cột `phone` thành `mobile` trên bảng trăm triệu dòng, không downtime. Làm **không** đổi tên trực tiếp (`ALTER ... RENAME` làm code cũ vỡ ngay), mà theo 4 bản phát hành:

| Bản | Schema | Code | Tương thích |
|---|---|---|---|
| 1. Expand | Thêm cột `mobile` NULL (không lock lâu) | Vẫn đọc/ghi `phone` | v_cũ chạy được |
| 2. Dual write | Backfill `mobile` từ `phone` theo batch nhỏ | **Ghi cả hai** cột, đọc `phone` | v1 và v2 cùng chạy được |
| 3. Switch | Giữ nguyên | Ghi cả hai, **đọc `mobile`** | Có thể rollback về bản 2 |
| 4. Contract | Xóa cột `phone` (sau khi chắc chắn) | Chỉ dùng `mobile` | Không rollback được về bản cũ hơn |

```sql
-- Bản 1
ALTER TABLE users ADD COLUMN mobile VARCHAR(20) NULL;

-- Bản 2: backfill theo lô, tránh khóa lâu
UPDATE users SET mobile = phone WHERE id BETWEEN :from AND :to AND mobile IS NULL;
```

Thêm cột `NOT NULL` vào bảng lớn làm thế nào? Thêm cột `NULL` (hoặc có default hằng số, tùy phiên bản DB nhanh hay phải ghi lại bảng), backfill theo batch, thêm ràng buộc sau cùng; kiểm tra tài liệu DB bạn dùng để biết thao tác nào cần lock bảng (PostgreSQL 11 trở lên thêm cột với default hằng số không ghi lại bảng; MySQL 8 có `ALGORITHM=INSTANT` cho nhiều thay đổi).

**Hỏi xoáy 1:** Khi canary đang chạy, dựa vào đâu để tự động rollback?

- Gợi ý: so sánh canary với cái gì để biết nó tệ hơn (bản ổn định trong cùng khoảng thời gian)? Chỉ số nào phản ánh sức khỏe (lỗi, latency, bão hòa)?
- Lập luận: vì tải và thời điểm ảnh hưởng chỉ số, nên so sánh canary với bản ổn định trên cùng khoảng thời gian. Vượt ngưỡng thì rút lưu lượng về 0 để hạn chế thiệt hại.
- Đáp: So sánh tỷ lệ lỗi 5xx, p99, lỗi nghiệp vụ, saturation với bản ổn định; vượt ngưỡng (ví dụ lỗi cao hơn 2 lần trong 5 phút) thì tự rút lưu lượng.

**Hỏi xoáy 2:** Migration nào rollback được và cái nào không?

- Gợi ý: sau khi rollback code, code cũ còn chạy được với schema hiện tại không? Thay đổi nào làm mất dữ liệu?
- Lập luận: vì thêm cột hoặc bảng thì code cũ bỏ qua, nên rollback dễ. Vì xóa hoặc đổi tên cột, mất dữ liệu thì không quay lại được, nên đặt bước contract sau cùng, và dùng feature flag để tách deploy khỏi release.
- Đáp: Thêm thì rollback được; xóa, đổi tên, mất dữ liệu thì không, nên làm sau cùng.

**Sai lầm hay gặp:** migration lock bảng lớn giờ cao điểm; bản mới không đọc được dữ liệu bản cũ ghi (hoặc ngược lại) trong lúc rolling.

---

## Cách luyện câu hỏi senior

| Bước | Việc cần làm |
|---|---|
| 1. Làm rõ | Hỏi lại yêu cầu, quy mô, ràng buộc nghiệp vụ trước khi đề xuất |
| 2. Nêu lựa chọn | Ít nhất hai phương án, mỗi phương án một ưu và một nhược |
| 3. Quyết định | Chọn một, nói **vì sao** trong bối cảnh này |
| 4. Chỗ vỡ | Nói trước nó sẽ hỏng ở đâu và cách phát hiện, xử lý |
| 5. Tiến hóa | Khi quy mô hoặc yêu cầu đổi thì bạn đổi gì |

Xem thêm cách trình bày một bài thiết kế: [Cách trả lời System Design](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-07-cach-tra-loi-system-design.md).

---

Nguồn: tổng hợp từ các bài Microservices, Kafka, Database và System Design trong Learning Docs. Các đoạn mô phỏng chạy trên JDK 11 chỉ minh họa logic (ví dụ ánh xạ key sang partition dùng `hashCode` thay cho murmur2 của Kafka); cấu hình Kafka, Resilience4j, Spring Cloud cần kiểm tra lại theo phiên bản bạn dùng.

