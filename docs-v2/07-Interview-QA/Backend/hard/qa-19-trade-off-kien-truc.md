# Câu hỏi trade-off kiến trúc (senior)

Kiến thức gốc: [Cách trả lời một bài System Design](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-07-cach-tra-loi-system-design.md), [CAP và Consistency](/go?p=15-System%20Design%2Fhard%2Flt-05-cap-consistency.md), [Microservices với Spring Cloud](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md), [Hexagonal, DDD và Modulith](/go?p=01-Spring-Boot%2Fhard%2Flt-24-hexagonal-ddd-modulith.md), [Chọn loại DB](/go?p=02-Database%2Fhard%2Flt-06-luu-tru-chon-db.md), [Virtual Threads](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md).

Với senior, câu "chọn A hay B" **không có đáp án đúng tuyệt đối**. Người phỏng vấn xem bạn có nêu được ràng buộc, đánh đổi và rủi ro, và có **tính được** hậu quả bằng số hay không. "Tùy" chỉ đáng giá khi bạn nói được "tùy vào cái gì, và ngưỡng ở đâu".

Mỗi câu theo chuỗi suy luận: **Câu hỏi** (tình huống như người phỏng vấn nói), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả từ khái niệm nền tới kết luận), **Đáp án ngắn** (câu nói thành tiếng được), **Ví dụ** (số liệu hoặc mô phỏng), **Nhớ**, rồi các **Hỏi xoáy** (mỗi câu kèm lý do vì sao nó là bước tiếp theo) và **Sai lầm hay gặp**. Mọi con số về chi phí, năng lực, latency là **giả định nêu rõ** để minh họa cách tính; phần chạy được đã chạy bằng Python/JDK 11 (_Đã chạy_). Phần còn lại là _Minh họa, chưa chạy thử_.

**Tóm tắt:**

- Phạm vi file: các quyết định trade-off kiến trúc, mỗi quyết định phải nói được chọn gì, vì sao, đổi lại gì, khi nào đổi hướng.
- Monolith, modular monolith hay microservices: chọn theo số đội và nền tảng vận hành; SQL hay NoSQL: chọn theo mẫu truy cập và nhất quán, thực tế thường dùng cả hai.
- Đồng bộ cho thao tác người dùng đang chờ, async cho phản ứng và việc nền; cache giá trị đến từ hit ratio nhưng dữ liệu cũ sinh ra vì cache và DB không cập nhật nguyên tử.
- Khi mạng đứt, nhất quán hay sẵn sàng quyết định theo từng chức năng; quorum `R + W > N` cho đọc thấy ghi mới nhất, đổi lại giảm khả năng chịu lỗi.
- Thread pool, virtual thread hay reactive tính theo số request đồng thời cần (Little); ORM cho CRUD theo aggregate, SQL thuần cho báo cáo và đường nóng.
- Build hay buy tính cả chi phí lifecycle; REST là mặc định công khai, gRPC nội bộ, GraphQL khi client cần hình dạng linh hoạt; scale theo thứ tự tối ưu, cache, scale lên, replica, rồi mới shard.
- Hay bị hỏi xoáy nhất: "vì sao thêm replica không tăng ghi", "tối ưu sớm có đúng với mọi quyết định không", và trả nợ kỹ thuật hay làm tính năng thuyết phục bằng số liệu.

## Khung trả lời chung

```mermaid
flowchart LR
    A["Bối cảnh"] --> B["Ràng buộc"]
    B --> C["Phương án"]
    C --> D["Quyết định"]
    D --> E["Rủi ro và cách giảm"]
```

| Bước | Nội dung | Ví dụ mở đầu |
|---|---|---|
| Bối cảnh | Ai dùng, quy mô, giai đoạn sản phẩm | "Đội 8 người, sản phẩm mới, tải vừa phải..." |
| Ràng buộc | Nhân lực, thời gian, latency, nhất quán, chi phí | "Cần ra thị trường trong 3 tháng..." |
| Phương án | Hai đến ba lựa chọn thực tế | "Có ba hướng: ..." |
| Quyết định | Chọn một, gắn với ràng buộc | "Tôi chọn X vì ..." |
| Rủi ro | Điều có thể sai và dấu hiệu để đổi hướng | "Nếu thấy ... thì chuyển sang ..." |

Quy tắc vàng: phân biệt quyết định **dễ đảo ngược** và **khó đảo ngược** (DB chính, ranh giới service, giao thức công khai). Dành thời gian suy nghĩ tỉ lệ với độ khó đảo ngược.

## 1. Monolith, modular monolith hay microservices?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Đội 8 người làm sản phẩm mới, sếp muốn "làm microservices cho hiện đại". Bạn thấy chuyện gì sẽ xảy ra, và bạn đề xuất gì?

**Gợi ý suy luận:**
- Một gọi hàm trong cùng process khác gì một call qua mạng (latency, lỗi một phần, transaction)?
- Số đường giao tiếp tăng thế nào khi số dịch vụ tăng, và p99 của từng dịch vụ cộng dồn ra sao?
- Microservices giải bài toán gì: kỹ thuật hay tổ chức (ai phát hành, ai sở hữu)?

**Lập luận:** vì tách dịch vụ biến gọi hàm thành call mạng, nên bạn mất transaction ACID và phải chịu latency, lỗi một phần, eventual consistency. Số đường giao tiếp tăng theo `n(n-1)/2` và xác suất chạm đuôi chậm tăng theo số call nối tiếp, nên chi phí vận hành tăng nhanh hơn số dịch vụ. Đổi lại bạn được triển khai và scale độc lập, mà lợi ích này chỉ có khi có nhiều đội cần phát hành độc lập. Đội 8 người, ranh giới chưa rõ thì chi phí lớn hơn lợi ích, nên chọn modular monolith, tách sau khi có bằng chứng. Điểm dễ nhầm là coi monolith là "lạc hậu" còn microservices là "tiến bộ": một monolith có ranh giới module rõ cho phép tách sau với chi phí thấp, còn microservices dựng sớm với ranh giới sai thì sửa ranh giới rất đắt vì đã thành API công khai và dữ liệu riêng. Khi đề xuất, nêu điều kiện cụ thể để tách (số đội, nhu cầu scale khác nhau, nền tảng vận hành sẵn sàng) thay vì phản đối chung chung.

**Đáp án ngắn:** modular monolith là mặc định cho đội nhỏ hoặc ranh giới nghiệp vụ chưa rõ. Microservices khi nhiều đội cần triển khai và scale độc lập, **và** bạn đã có nền tảng vận hành (CI/CD, quan sát, on-call).

**Ví dụ (tính toán, _Đã chạy bằng Python_):**

```text
Số đường giao tiếp tối đa giữa n dịch vụ = n(n-1)/2:  n=3 -> 3 | n=10 -> 45 | n=30 -> 435
Một request đi qua 6 lời gọi nối tiếp, mỗi lời gọi p99 = 300 ms (p50 = 20 ms):
  xác suất ít nhất 1 lời gọi rơi vào đuôi chậm = 1 - 0,99^6 = 5,85%
```

Hệ quả cụ thể: nhân đôi số service không nhân đôi giá trị mà nhân nhiều lần số việc cần quan sát, và p99 của từng service trở thành "gần p94" của cả request. Dấu hiệu **distributed monolith** (tệ hơn cả hai): phải phát hành nhiều service cùng lúc mới ra được một tính năng; các service chung một DB; một service chết kéo tất cả chết theo.

**Cách nói thành lời:** "Với đội 8 người và ranh giới chưa rõ, tôi chọn modular monolith: ranh giới theo nghiệp vụ, kiểm soát phụ thuộc giữa module bằng kiểm thử kiến trúc. Khi một module cần scale riêng hoặc đội riêng, tôi tách ra. Rủi ro là kỷ luật module bị phá; tôi giảm bằng kiểm thử kiến trúc trong CI."

**Nhớ:** microservices đổi độ phức tạp trong một process lấy độ phức tạp giữa nhiều process; chỉ đáng khi bài toán tổ chức lớn hơn chi phí đó. Xem [Microservices với Spring Cloud](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md).

**Hỏi xoáy 1:** Vì sao tách theo tầng kỹ thuật ("service DB", "service API") là sai?
_Vì sao hỏi tiếp:_ nếu chấp nhận tách, câu tự nhiên kế tiếp là tách theo trục nào, và trục sai làm mất lợi ích duy nhất (độc lập phát hành) ra sao.

**Đáp:** Vì một thay đổi nghiệp vụ thông thường sẽ chạm mọi service đó, nghĩa là bạn phải phát hành đồng bộ nhiều nơi: chi phí phối hợp của microservices mà không có độc lập. Cắt theo **bounded context** (nhóm thay đổi cùng nhau).

**Hỏi xoáy 2:** Khi nào nên tách một module ra khỏi monolith?
_Vì sao hỏi tiếp:_ đã chọn monolith thì phải trả lời được thời điểm rời đi, nếu không "tùy" chỉ là né.

**Đáp:** Khi có bằng chứng: nhu cầu scale khác hẳn (ví dụ xử lý ảnh nặng CPU), nhịp phát hành khác hẳn, hoặc đội riêng vướng nhau trong cùng release. Không tách vì "xu hướng".

**Sai lầm hay gặp:** tách từ ngày đầu khi chưa hiểu miền nghiệp vụ; ranh giới sai rất đắt để sửa vì nó đã thành giao thức mạng và dữ liệu riêng.

## 2. SQL hay NoSQL?

**Câu hỏi:** Hệ thống cần lưu đơn hàng và cả nhật ký hoạt động 20.000 ghi/giây. Có người đề nghị "bỏ hết vào MongoDB cho scale". Bạn phản biện hoặc đồng ý thế nào?

**Gợi ý suy luận:**
- Với mỗi loại dữ liệu, câu hỏi truy vấn có biết trước không (tra theo key hay join tùy ý)?
- Tốc độ ghi và lifecycle dữ liệu tạo ra bao nhiêu TB, và bảo trì một bảng khổng lồ khó ở đâu?
- Cần transaction ACID nhiều bản ghi ở đâu?

**Lập luận:** vì đơn hàng cần join (khách, sản phẩm, thanh toán), báo cáo tùy ý và ACID, nên cần kho quan hệ. Vì nhật ký chỉ ghi nối đuôi và đọc theo khoảng thời gian/key, lại sinh khoảng 126 TB mỗi năm, nên kho tối ưu cho truy cập theo key hoặc bảng phân vùng theo thời gian (bỏ cả partition cũ) hợp hơn. Do hai loại dữ liệu có mẫu truy cập khác nhau, đáp án thực tế là dùng cả hai với ranh giới rõ. Điểm dễ nhầm là chọn theo nhãn "scale" thay vì mẫu truy cập, hoặc nghĩ NoSQL luôn rẻ hơn: mất join và ACID thì logic nghiệp vụ phải tự gánh, và dữ liệu quan hệ nhét vào kho document sẽ trùng lặp và lệch. Hãy bắt đầu từ truy vấn quan trọng nhất và yêu cầu nhất quán của từng loại dữ liệu, ước lượng khối lượng (như 126 TB mỗi năm) để thấy có thực sự vượt một cụm quan hệ hay không, rồi mới chọn.

**Đáp án ngắn:** SQL là mặc định cho dữ liệu nghiệp vụ có quan hệ và cần transaction. NoSQL khi mẫu truy cập đơn giản và đã biết (theo key), ghi rất lớn, hoặc dữ liệu dạng chuỗi thời gian/đồ thị. Thực tế dùng **cả hai** (polyglot) với ranh giới rõ.

**Ví dụ:** nhật ký hoạt động 20.000 ghi/giây, mỗi bản ghi 200 byte (_Đã chạy bằng Python_):

```text
20.000/s x 200 B = 4,0 MB/s = 345,6 GB/ngày = 126,1 TB/năm
```

126 TB/năm dồn vào một bảng quan hệ không phân vùng là bài toán bảo trì khổ (vacuum, index, backup). Mẫu truy cập "ghi nối đuôi theo thời gian, đọc theo khoảng thời gian/key" khớp với kho wide-column/log hoặc bảng SQL **phân vùng theo thời gian** với dữ liệu cũ được loại bỏ bằng cách bỏ cả partition. Ngược lại, đơn hàng (join khách hàng, sản phẩm, thanh toán; báo cáo tùy ý; cần ACID) nên ở SQL. Sự khác biệt đến từ **mẫu truy cập và lifecycle dữ liệu**, không từ tên công nghệ.

**Nhớ:** chọn theo mẫu truy cập và lifecycle dữ liệu, không theo tên công nghệ; SQL linh hoạt truy vấn, NoSQL dự đoán được khi scale. Xem [Chọn loại DB](/go?p=02-Database%2Fhard%2Flt-06-luu-tru-chon-db.md).

**Hỏi xoáy 1:** "NoSQL scale tốt hơn SQL" đúng đến đâu?
_Vì sao hỏi tiếp:_ lý do hay được nêu nhất để chọn NoSQL là scale, nên cần kiểm tra xem tuyên bố đó đúng trong điều kiện nào.

**Đáp:** Đúng với kho được thiết kế để phân vùng ngang và cho phép truy cập theo key. Nhưng PostgreSQL với replica đọc, partitioning và index tốt đã đi rất xa (đa số hệ thống không bao giờ vượt tới). Cái "scale" của NoSQL thường đến từ **bỏ bớt** tính năng (join, transaction đa bản ghi), đó là cái giá.

**Hỏi xoáy 2:** Dùng hai kho thì giữ nhất quán giữa chúng thế nào?
_Vì sao hỏi tiếp:_ đáp án "dùng cả hai" tạo ngay vấn đề hai nơi cùng giữ dữ liệu, nên phải nói được cách đồng bộ.

**Đáp:** Chọn một nguồn sự thật, kho còn lại là bản dẫn xuất cập nhật qua event (outbox, xem [JVM, Hiệu năng và Hệ phân tán](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-06-jvm-hieu-nang-phan-tan.md)); chấp nhận latency đồng bộ và thiết kế consumer idempotent.

**Sai lầm hay gặp:** chọn NoSQL vì "schema linh hoạt" rồi dồn việc kiểm tra dữ liệu vào ứng dụng và tự cài đặt lại join bằng nhiều truy vấn.

## 3. Đồng bộ (REST gọi nhau) hay async (event)?

**Câu hỏi:** Bước checkout gọi lần lượt payment, email, điểm thưởng bằng REST. Thỉnh thoảng đơn hàng thất bại chỉ vì dịch vụ email chậm hoặc chết. Vì sao, và bạn sửa thế nào?

**Gợi ý suy luận:**
- Nếu ba call nối tiếp, latency tổng và xác suất thành công tổng tính thế nào (cộng, nhân)?
- Người dùng có thật sự cần đợi email gửi xong mới được xác nhận đơn không?
- Nếu tách việc ra qua queue, điều gì phải xử lý thêm (trùng lặp, thứ tự)?

**Lập luận:** vì call sync nối tiếp nên latency cộng lại (500 ms) và xác suất thành công nhân lại (98,41%), nên dịch vụ yếu nhất kéo cả checkout xuống. Email và điểm thưởng không cần có kết quả trước khi trả lời người dùng, nên đưa sang event: lỗi của chúng không làm hỏng đơn và được retry sau. Cái giá là kết quả không tức thì và event có thể giao hơn một lần, nên consumer phải idempotent. Điểm dễ nhầm là chuyển mọi thứ sang async: việc người dùng cần kết quả ngay (thanh toán thành công hay không) vẫn phải đồng bộ, và async thêm độ phức tạp (trùng lặp, thứ tự, theo dõi). Khi tách, đặt timeout và circuit breaker cho call đồng bộ còn lại, ghi event bằng outbox để không mất, và để consumer idempotent vì event có thể đến nhiều lần.

**Đáp án ngắn:** đồng bộ cho thao tác mà người dùng đang chờ kết quả. Async cho phản ứng event, tích hợp giữa dịch vụ, việc nền, san đỉnh tải.

**Ví dụ (tính toán, _Đã chạy bằng Python_), bước checkout gọi payment (120 ms, 99,9%), email (300 ms, 99%), điểm thưởng (80 ms, 99,5%):**

```text
Đồng bộ hết:      độ trễ = 120 + 300 + 80 = 500 ms; tỉ lệ checkout thành công = 0,999 x 0,99 x 0,995 = 98,41% (1,59% lỗi)
Chỉ payment đồng bộ: trả lời sau 120 ms; tỉ lệ thành công = 99,9%
```

Email chỉ 99% mà kéo cả checkout xuống 98,4%, và người dùng đợi 500 ms thay vì 120 ms. Đưa email và điểm thưởng sang event thì lỗi của chúng không còn làm hỏng đơn hàng; chúng được retry sau. Cái giá: email có thể đến trễ vài giây, và consumer phải **idempotent** vì event có thể giao hơn một lần.

**Nhớ:** đồng bộ ghép nối theo thời gian (latency cộng, xác suất thành công nhân); async tách rời, đổi lấy chịu lỗi nhưng cần idempotent. Xem [Microservices với Spring Cloud](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md).

**Hỏi xoáy 1:** Làm sao đảm bảo "lưu đơn" và "phát event" cùng thành công?
_Vì sao hỏi tiếp:_ vừa đưa việc sang event thì lỗ hổng đầu tiên là hai thao tác ở hai hệ thống khác nhau không nguyên tử.

**Đáp:** Transactional outbox: ghi event vào bảng trong cùng transaction với đơn hàng, process riêng phát ra broker (retry được). Phát trực tiếp trong code luôn có khe hở khi crash giữa hai bước.

**Hỏi xoáy 2:** Khi nào async là lựa chọn tệ?
_Vì sao hỏi tiếp:_ để chứng tỏ bạn không coi async là thuốc chữa mọi thứ, hãy nêu ranh giới mà nó không còn hợp.

**Đáp:** Khi người dùng cần kết quả để đi tiếp (kiểm tra tồn kho trước khi cho thanh toán) hoặc khi bạn không có công cụ theo dõi thread (trace, DLQ, giám sát lag): event flow vô hình rất khó gỡ lỗi.

**Sai lầm hay gặp:** coi event như "gọi hàm từ xa chạy nền" và quên xử lý trùng lặp, thứ tự, và lỗi vĩnh viễn (DLQ).

## 4. Chiến lược cache: cache-aside, write-through hay write-behind?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn thêm cache trước DB, latency giảm nhưng thỉnh thoảng người dùng thấy dữ liệu cũ dù đã cập nhật. Cache mang lại giá trị từ đâu, và dữ liệu cũ sinh ra từ đâu? Bạn chọn chiến lược nào?

**Gợi ý suy luận:**
- Latency trung bình phụ thuộc vào đại lượng nào (tỉ lệ hit)?
- Ghi DB và xóa/cập nhật cache là hai bước riêng: nếu hai thread đan xen thì điều gì xảy ra?
- Nếu ghi vào cache trước rồi mới xuống DB thì rủi ro mất dữ liệu nằm ở đâu?

**Lập luận:** vì latency trung bình `= h × t_cache + (1−h) × (t_cache + t_DB)`, nên giá trị của cache đến từ `h`, và tải DB giảm tỉ lệ với `(1−h)`. Vì cache và DB là hai nơi không cập nhật nguyên tử cùng nhau, nên một thread đọc cũ nạp cache sau khi thread ghi đã xóa sẽ để lại dữ liệu cũ. Do đó cần TTL, xóa lần hai hoặc phiên bản. Chiến lược cũng theo mức "cũ" chấp nhận được: cache-aside cho đọc nhiều, write-through khi cần khớp, write-behind chỉ khi mất dữ liệu được. Điểm dễ nhầm là nghĩ thêm cache là xong: nếu hit ratio thấp thì cache chỉ thêm một chặng và một nguồn dữ liệu cũ, còn xóa cache nhầm thứ tự (xóa trước khi ghi DB) cho phép request khác nạp lại giá trị cũ. Khi review, hỏi hit ratio dự kiến, TTL và ai vô hiệu hóa khi nguồn đổi, chuyện gì xảy ra khi cache chết (stampede), và đo hit ratio thật sau khi triển khai.

**Đáp án ngắn:** cache-aside là mặc định cho ứng dụng đọc nhiều. Write-through khi cần cache luôn khớp. Write-behind chỉ khi chấp nhận rủi ro mất dữ liệu (số đếm, thống kê). Câu khó là **vô hiệu hóa đúng lúc**.

**Ví dụ 1: giá trị của hit ratio (cache 1 ms, DB 20 ms, 3.472 QPS đọc đỉnh; _Đã chạy bằng Python_):**

```text
hit=  0%: độ trễ trung bình 21,00 ms, tải lên DB 3.472 QPS
hit= 50%: 11,00 ms, 1.736 QPS
hit= 90%:  3,00 ms,   347 QPS
hit= 99%:  1,20 ms,    35 QPS
```

Từ 90% lên 99% làm tải DB giảm 10 lần, lớn hơn nhiều so với từ 0% lên 50%. Vì vậy hit ratio cần đo và tối ưu (TTL, kích thước, hot key), không phải "bật cache là xong".

**Ví dụ 2: cache-aside để lại dữ liệu cũ (kịch bản đan xen, _Đã chạy mô phỏng bằng Python_):**

```text
1. A đọc: cache miss, đọc DB được v1
2. B ghi DB = v2, rồi XÓA cache
3. A nạp cache = v1 (giá trị đọc từ trước bước 2)
=> DB = 2 | cache = 1: cache cũ cho đến khi hết TTL hoặc bị xóa lại
```

Không có sai sót nào ở từng bước riêng; lỗi nằm ở **thứ tự đan xen** giữa đọc-rồi-nạp của A và ghi-rồi-xóa của B. Biện pháp: TTL ngắn để giới hạn thời gian sai, xóa cache lần hai sau khoảng trễ ngắn (delayed double delete), hoặc dùng phiên bản/`CAS` khi nạp cache.

**Nhớ:** cache đổi độ mới lấy tốc độ; giá trị nằm ở hit ratio, rủi ro nằm ở việc cache và nguồn không cập nhật nguyên tử. Xem [Chọn loại DB](/go?p=02-Database%2Fhard%2Flt-06-luu-tru-chon-db.md).

**Hỏi xoáy 1:** Cache stampede là gì và chữa thế nào?
_Vì sao hỏi tiếp:_ đã thấy hit ratio quan trọng, câu kế tiếp là điều gì xảy ra ở khoảnh khắc hit ratio của một hot key đột ngột về 0.

**Đáp:** Hot key hết hạn, hàng nghìn request cùng miss rồi cùng đọc DB. Chữa: chỉ một thread nạp lại (lock mutex theo key), làm mới sớm trước khi hết hạn, hoặc thêm jitter vào TTL để không hết hạn đồng loạt.

**Hỏi xoáy 2:** Write-behind mất dữ liệu ở đâu?
_Vì sao hỏi tiếp:_ bạn vừa nói write-behind chỉ dùng khi chấp nhận mất dữ liệu, nên phải chỉ rõ điểm mất.

**Đáp:** Dữ liệu nằm trong cache (RAM) chờ ghi xuống DB; nếu cache chết trước khi ghi thì mất. Chỉ chấp nhận khi dữ liệu có thể tính lại hoặc mất một ít không sao.

**Sai lầm hay gặp:** chỉ lo tốc độ mà không xác định mức "cũ" chấp nhận được cho từng loại dữ liệu; giá sản phẩm và số dư không cùng độ nhạy.

## 5. Nhất quán hay sẵn sàng khi có phân vùng mạng?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Hệ thống có 3 bản sao dữ liệu, đường mạng giữa hai trung tâm dữ liệu bị đứt. Hệ thống nên từ chối phục vụ hay cứ phục vụ? Và khi mạng bình thường, bạn chỉnh `W`, `R` thế nào?

**Gợi ý suy luận:**
- Để hai bản sao đồng ý với nhau thì cần gì (trao đổi thông tin), và khi đường đứt thì còn những lựa chọn nào?
- Nếu tập bản sao được đọc và tập bản sao được ghi có giao nhau, đọc có thấy ghi mới nhất không?
- Tăng `W` hay `R` thì khả năng chịu lỗi của phía đó thay đổi ra sao?

**Lập luận:** vì đồng thuận cần trao đổi, nên khi mạng đứt chỉ có hai đường: từ chối (giữ nhất quán) hoặc phục vụ tiếp (có thể lệch). Với quorum, nếu `R + W > N` thì tập đọc và tập ghi giao nhau ít nhất một bản sao có giá trị mới nhất, nên đọc thấy ghi mới nhất. Muốn giao nhau thì mỗi phía phải chờ nhiều bản sao hơn, nên mất khả năng chịu lỗi (ví dụ `W=3` thì một nút chết là không ghi được). Vậy mỗi cấu hình là một điểm đánh đổi, nên quyết định theo từng chức năng. Điểm dễ nhầm là nghĩ chọn "nhất quán" hay "sẵn sàng" một lần cho cả hệ thống: nên quyết theo chức năng và theo hậu quả khi sai (số dư sai tốn tiền thật, lượt xem sai gần như vô hại). Cũng nhớ ngay cả khi mạng tốt, lựa chọn W và R đã đổi latency lấy nhất quán, nên cần ghi rõ mức nhất quán mỗi chức năng bảo đảm và cho client biết.

**Đáp án ngắn:** quyết định **theo từng chức năng**: chuyển tiền chọn nhất quán; số lượt xem chọn sẵn sàng. Với kho replication kiểu quorum, `W` (số bản sao xác nhận ghi) và `R` (số bản sao đọc) điều chỉnh đánh đổi.

**Ví dụ (_Đã chạy bằng Python_), N = 3 bản sao:**

```text
W=1 R=1: R+W=2 <= N -> CÓ THỂ đọc dữ liệu cũ;   chịu 2 nút lỗi khi ghi, 2 khi đọc
W=2 R=2: R+W=4 >  N -> đọc thấy ghi mới nhất;    chịu 1 nút lỗi khi ghi, 1 khi đọc
W=3 R=1: R+W=4 >  N -> đọc thấy ghi mới nhất;    chịu 0 nút lỗi khi ghi, 2 khi đọc
W=1 R=3: R+W=4 >  N -> đọc thấy ghi mới nhất;    chịu 2 nút lỗi khi ghi, 0 khi đọc
```

Quy tắc `R + W > N` đảm bảo tập đọc và tập ghi **giao nhau** ít nhất một bản sao có giá trị mới nhất. Muốn giao nhau bắt buộc mất khả năng chịu lỗi ở một phía (ví dụ `W=3` thì một nút chết là không ghi được). Đó là CAP dưới dạng con số: **mỗi cấu hình là một điểm đánh đổi**, không có cấu hình thắng tuyệt đối.

**Nhớ:** khi phân vùng phải chọn C hoặc A; khi bình thường là đánh đổi latency so với nhất quán; `R + W > N` đảm bảo giao nhau. Xem [CAP và Consistency](/go?p=15-System%20Design%2Fhard%2Flt-05-cap-consistency.md).

**Hỏi xoáy 1:** `R + W > N` có đủ để đạt linearizability không?
_Vì sao hỏi tiếp:_ quy tắc giao nhau nghe như đảm bảo mạnh, nên cần kiểm tra giới hạn của nó.

**Đáp:** Không hẳn: còn các tình huống đồng hồ, ghi một phần, sửa lỗi đọc. Nó đảm bảo "thấy ghi đã hoàn tất mới nhất" trong điều kiện lý tưởng; các hệ thực tế thêm cơ chế khác (đồng thuận Raft/Paxos) để đảm bảo mạnh hơn.

**Hỏi xoáy 2:** Eventual consistency cần thêm gì để dùng được?
_Vì sao hỏi tiếp:_ chức năng nào chọn sẵn sàng thì sẽ lệch tạm thời, nên phải nói được cách hội tụ và bù sai lệch.

**Đáp:** Quy tắc hợp nhất xung đột xác định (CRDT, phiên bản), thao tác idempotent, và hành động bù cho trường hợp sai lệch nghiệp vụ (ví dụ bán lố, xem [JVM, Hiệu năng và Hệ phân tán](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-06-jvm-hieu-nang-phan-tan.md) câu 9).

**Sai lầm hay gặp:** chọn một mức nhất quán cho cả hệ thống thay vì từng chức năng, hoặc nói "CAP chọn 2 trong 3" như thể chọn được C và A khi P xảy ra.

## 6. Thread pool, virtual threads hay reactive?

**Câu hỏi:** Dịch vụ nhận 5.000 req/s, mỗi request chờ DB và API ngoài khoảng 100 ms, pool 200 thread thì nghẽn. Bạn tăng pool, chuyển reactive hay dùng virtual thread, và vì sao?

**Gợi ý suy luận:**
- Định luật Little: số request đồng thời cần là bao nhiêu khi biết tốc độ đến và thời gian xử lý?
- Một thread HĐH tốn bao nhiêu memory và chi phí chuyển ngữ cảnh, nên tạo hàng nghìn thread có ổn không?
- Thread đang chờ I/O thì có làm việc gì hữu ích không, và tác vụ nặng CPU có chờ gì không?

**Lập luận:** vì cần `5.000 × 0,1 = 500` request đồng thời mà pool chỉ có 200, nên trần là `200 / 0,1 = 2.000 req/s`. Tăng pool lên hàng nghìn thread HĐH tốn memory và chuyển ngữ cảnh, nên cần cách để thread không đứng chờ I/O. Reactive làm bằng lập trình non-blocking nhưng đổi cả phong cách mã. Virtual thread làm thread đủ rẻ để mỗi request một thread mà vẫn viết tuần tự, nên hợp khi tải chủ yếu là Blocking I/O. Với việc nặng CPU, thread không chờ nên số lõi vẫn là trần. Điểm dễ nhầm là tăng pool lên vài nghìn thread mà không nhìn thấy trần thật nằm ở pool DB hay API ngoài, và nghĩ reactive là cách duy nhất để scale I/O. Quy trình: tính số request đồng thời cần theo định luật Little, tìm tài nguyên hẹp nhất, rồi chọn virtual thread cho code chặn tuần tự (nếu không có `synchronized` quanh I/O) hoặc reactive khi cần streaming và backpressure.

**Đáp án ngắn:** thread pool cho tải vừa và việc nặng CPU. Virtual threads (Java 21) khi nhiều Blocking I/O và muốn giữ mã tuần tự. Reactive khi cần streaming, backpressure chặt, hoặc cả stack đã non-blocking.

**Ví dụ 1: số thread cần theo định luật Little (_Đã chạy bằng Python_):**

```text
5.000 req/s, mỗi request chờ I/O 100 ms => cần 5.000 x 0,1 = 500 request đồng thời
pool 200 luồng chỉ phục vụ tối đa 200 / 0,1 = 2.000 req/s
```

**Ví dụ 2: chi phí thread nền tảng (đã đo, JDK 11, heap 64 MB, 2 nhân):**

```text
2000 platform thread: tạo 1318 ms, RSS 80 -> 142 MB
```

Tạo 2.000 thread mất ~1,3 giây và tăng ~62 MB RSS (khoảng 31 KB mỗi thread thực tế, không phải 1 MB vì stack mặc định chỉ được **đặt trước địa chỉ ảo**, không cấp phát hết). Chưa kể chi phí chuyển ngữ cảnh khi hàng nghìn thread cùng chạy. Virtual thread (JDK 21, không chạy được trong môi trường soạn bài) có stack nằm trong heap và tăng giảm theo nhu cầu, nên hàng trăm nghìn thread là khả thi. _Đã chạy thử trên JDK 11 (phần platform thread)._

**Nhớ:** số thread cần `= tốc độ đến × thời gian chờ`; virtual thread rẻ vì nhả thread nền khi chờ I/O, không thêm lõi CPU. Xem [Virtual Threads](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md).

**Hỏi xoáy 1:** Virtual thread có tăng throughput với tác vụ nặng CPU không?
_Vì sao hỏi tiếp:_ để kiểm tra bạn hiểu cơ chế chứ không chỉ nhớ "virtual thread nhanh hơn".

**Đáp:** Không: bản chất của nó là nhả thread nền khi chờ I/O; tác vụ CPU không chờ gì nên số lõi vẫn là trần.

**Hỏi xoáy 2:** Điều gì vẫn là nút thắt khi dùng virtual thread?
_Vì sao hỏi tiếp:_ khi thread không còn là nút thắt, nút thắt dịch xuống tài nguyên bên dưới, nên cần biết nó dịch tới đâu.

**Đáp:** Tài nguyên hạ nguồn hữu hạn (pool kết nối DB 10-50 kết nối, API ngoài có rate limit). Cần giới hạn đồng thời (semaphore) để không dồn hàng nghìn request vào DB; và kiểm tra "pinning" khi chặn trong `synchronized` ở một số phiên bản. Xem [Virtual Threads](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md) và [WebFlux và Reactor](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md).

**Sai lầm hay gặp:** chuyển sang reactive "cho hiệu năng" trong khi 90% thời gian là chờ DB qua JDBC chặn: hiệu năng không đổi mà độ phức tạp tăng.

## 7. ORM hay SQL thuần?

**Câu hỏi:** Trang danh sách tác giả kèm sách chạy nhanh với 10 dòng dữ liệu nhưng chậm khủng khiếp ở production. Code chỉ là vòng lặp qua entity JPA. Chuyện gì xảy ra, và bạn có bỏ ORM không?

**Gợi ý suy luận:**
- Quan hệ `@OneToMany` lazy được nạp khi nào, và vòng lặp truy cập nó sinh bao nhiêu lệnh SQL?
- Chi phí mỗi lệnh tới DB thật gồm gì (latency mạng), nên đếm "số lệnh" hay "thời gian trong memory" mới đúng?
- Ở đâu ánh xạ sang object là thừa (báo cáo, tổng hợp)?

**Lập luận:** vì quan hệ lazy chỉ nạp khi bị duyệt, nên vòng lặp qua 100 tác giả sinh thêm 100 lệnh, tổng 101 (N+1). Vì mỗi lệnh có latency mạng riêng, nên chi phí tỉ lệ với số lệnh chứ không phải khối lượng dữ liệu; dữ liệu nhỏ ở dev che mất lỗi. Cách chữa là nạp bằng một JOIN (`JOIN FETCH`, `@EntityGraph`, `@BatchSize`, projection) và đếm lệnh trong test. Do ORM chỉ giấu SQL chứ không bỏ nó, nên dùng ORM cho CRUD theo aggregate và SQL trực tiếp cho báo cáo, đường nóng. Điểm dễ nhầm là kết luận ORM chậm và bỏ nó, trong khi lỗi nằm ở cách nạp quan hệ; test trên dữ liệu nhỏ che mất N+1. Khi review, đếm số câu SQL cho mỗi use case trong test, và quy định rõ: CRUD theo aggregate dùng JPA, báo cáo và truy vấn tổng hợp dùng projection hoặc SQL, để không dùng ORM sai chỗ lẫn bỏ nó sai chỗ.

**Đáp án ngắn:** ORM cho nghiệp vụ CRUD theo aggregate; SQL thuần/jOOQ/projection cho báo cáo và đường nóng. Dùng cả hai là thực tế phổ biến.

**Ví dụ (đã chạy, SQLite trong memory, 100 tác giả, 2.000 sách; đếm số lệnh SQL):**

```text
N+1:  101 câu lệnh SQL  (1 để lấy tác giả + 100 để lấy sách từng người)   ~8,8 ms (trong bộ nhớ)
JOIN:   1 câu lệnh SQL                                                    ~1,3 ms
```

Thời gian trong memory không phản ánh DB thật; điều quan trọng là **số lệnh**. Với latency mạng 1 ms mỗi lệnh tới DB thật, N+1 tốn khoảng 101 ms, JOIN khoảng 1 ms (tính toán, không đo). Trong JPA, N+1 sinh từ một `@OneToMany` lazy bị duyệt trong vòng lặp. Cách phát hiện: bật log SQL trong test và **đếm lệnh**; cách sửa: `JOIN FETCH`, `@EntityGraph`, `@BatchSize`, hoặc truy vấn projection. _Đã chạy bằng Python + SQLite._

**Nhớ:** ORM giấu SQL chứ không bỏ SQL; phải xem và đếm lệnh được sinh ra. Xem [JPA bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-16-jpa-internals.md).

**Hỏi xoáy 1:** Khi nào `@Transactional` đọc-ghi gây UPDATE ngoài ý muốn?
_Vì sao hỏi tiếp:_ sau SELECT thừa thì chi phí ẩn tiếp theo của ORM là câu lệnh ghi bạn không hề viết.

**Đáp:** Dirty checking: entity đã nạp trong persistence context bị đổi trường (kể cả vô tình, ví dụ chuẩn hóa chuỗi trong getter) thì khi flush/commit Hibernate tự sinh `UPDATE`. Xem [JPA bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-16-jpa-internals.md).

**Hỏi xoáy 2:** Vì sao báo cáo phức tạp không nên làm bằng ORM?
_Vì sao hỏi tiếp:_ để làm rõ nửa "SQL thuần" trong đáp án: nó dành cho chỗ nào và vì sao.

**Đáp:** Báo cáo cần tổng hợp, window function, join tùy ý; ánh xạ sang object vừa thừa vừa chậm. SQL trực tiếp (hoặc view) thể hiện đúng ý và tối ưu được bằng `EXPLAIN`.

**Sai lầm hay gặp:** dùng ORM mà không bao giờ bật log SQL, nên N+1 chỉ lộ ra khi dữ liệu lớn lên ở production.

## 8. Tự xây (build) hay mua / dùng sẵn (buy)?

**Câu hỏi:** Đội đề xuất tự viết hệ thống đăng nhập vì "chỉ mất vài tuần, đỡ trả phí SaaS". Bạn có đồng ý không, và tính thế nào?

**Gợi ý suy luận:**
- Ngoài công viết lần đầu, còn những khoản nào kéo dài mãi (bảo trì, vá bảo mật, on-call)?
- Phí SaaS tăng theo gì (số người dùng), còn chi phí tự xây tăng theo gì?
- Thứ này có tạo khác biệt cạnh tranh hay là phần chuẩn hóa?

**Lập luận:** vì phần mềm là chi phí sống, nên giá tự xây gồm cả bảo trì, vận hành, bảo mật, tuyển người hiểu nó, không chỉ lần viết đầu. Vì phí SaaS tăng tuyến tính theo MAU còn chi phí tự xây gần như cố định, nên có điểm hòa vốn (khoảng vài trăm nghìn MAU trong giả định này), dưới đó SaaS rẻ hơn. Vì authentication là phần chuẩn hóa, không tạo khác biệt cạnh tranh, lại rủi ro bảo mật cao nếu tự viết, nên nên mua, bọc sau giao diện để có đường thoát. Điểm dễ nhầm là so sánh phí SaaS với "vài tuần viết" mà quên chi phí lifecycle: bảo mật, vá lỗi, tuân thủ, trực sự cố và người hiểu hệ thống. Ngược lại, mua cũng có rủi ro khóa chặt nhà cung cấp, nên bọc sau giao diện, có đường xuất dữ liệu, và chỉ tự xây khi đó là năng lực lõi tạo khác biệt cạnh tranh.

**Đáp án ngắn:** build cho **năng lực lõi** tạo khác biệt cạnh tranh; buy cho phần chuẩn hóa (authentication, thanh toán, email, quan sát). Luôn bọc sau một giao diện để có đường thoát.

**Ví dụ (giả định minh họa, _Đã tính bằng Python_): tự xây hệ thống authentication.**

```text
Xây: 2 dev x 3 tháng x 160 h + 0,5 FTE bảo trì (960 h/năm) = 1.920 h; ở $60/giờ ≈ $115.200 năm đầu, ≈ $57.600/năm sau đó
SaaS (giả định $0,02/MAU/tháng):  10.000 MAU = $2.400/năm | 100.000 MAU = $24.000/năm | 1.000.000 MAU = $240.000/năm
```

Điểm hòa vốn nằm quanh **vài trăm nghìn MAU**: dưới đó SaaS rẻ hơn rõ rệt, trên đó tự xây có thể rẻ hơn **nếu** bạn tính cả rủi ro bảo mật và on-call. Số liệu chỉ để minh họa cách tính; bạn cần thay bằng giá thật. Điều thường bị bỏ sót: chi phí cơ hội (đội đó có thể làm tính năng khác) và rủi ro bảo mật khi tự viết mật mã/authentication.

**Nhớ:** tự xây là mua quyền kiểm soát bằng chi phí duy trì vĩnh viễn; mua là đổi chi phí đó lấy phụ thuộc nhà cung cấp. Xem [Cách trả lời một bài System Design](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-07-cach-tra-loi-system-design.md).

**Hỏi xoáy 1:** Làm sao giảm rủi ro phụ thuộc nhà cung cấp?
_Vì sao hỏi tiếp:_ chọn mua thì cái giá bạn vừa nhận là phụ thuộc, nên phải nói cách giữ đường lui.

**Đáp:** Dùng giao thức/tiêu chuẩn mở (OIDC, SQL chuẩn), bọc sau giao diện nội bộ, giữ bản sao dữ liệu có thể xuất, và theo dõi chi phí theo quy mô để biết lúc nào cần xem lại quyết định.

**Hỏi xoáy 2:** "Tự làm cho rẻ" thường sai ở đâu?
_Vì sao hỏi tiếp:_ để xem bạn có thể chỉ ra khoản chi phí bị bỏ sót khi phản biện đề xuất tự làm.

**Đáp:** Chỉ tính công viết, bỏ qua bảo trì, vá lỗi bảo mật, tài liệu, chuyển giao, on-call. Phần mềm là chi phí sống, không phải chi phí một lần.

**Sai lầm hay gặp:** tự xây thứ chuẩn hóa vì "chỉ vài ngày", rồi nhiều năm sau vẫn có người phải giữ nó chạy.

## 9. REST, gRPC hay GraphQL?

**Câu hỏi:** App di động chỉ cần `id`, `name`, `avatar` cho màn hình danh sách nhưng API REST trả cả object. Bạn xử lý thế nào, và khi nào chọn gRPC hay GraphQL thay vì REST?

**Gợi ý suy luận:**
- Ai quyết định hình dạng dữ liệu trả về: server hay client?
- Dữ liệu thừa trên mạng di động ảnh hưởng gì (latency, cước), tính thử với 50 phần tử?
- Giữa hai dịch vụ nội bộ, mã hóa văn bản (JSON) và nhị phân khác nhau ở đâu về kích thước và contract?

**Lập luận:** vì REST để server quyết hình dạng, nên client nhận cả object dù chỉ cần 3 trường, thừa khoảng 10 lần dữ liệu. GraphQL cho client chọn trường nên giải over-fetching, đổi lại truy vấn lồng sâu nặng, cache HTTP khó và N+1 ở resolver. Giữa dịch vụ nội bộ, contract chặt cộng mã hóa nhị phân (bỏ tên trường, bỏ chữ số dạng văn bản) làm gRPC gọn và nhanh. Với API công khai, REST dễ dùng nhất với trình duyệt và công cụ, nên là mặc định. Điểm dễ nhầm là chọn công nghệ theo thời thượng: GraphQL giải over-fetching nhưng thêm bài toán chặn truy vấn quá sâu, N+1 ở resolver và cache; gRPC hiệu quả nhưng trình duyệt cần lớp proxy. Hãy chọn theo người dùng API: công khai và đa dạng thì REST, nội bộ hiệu năng cao thì gRPC, nhiều client khác nhau cần dữ liệu linh hoạt thì GraphQL, và đo thay vì đoán lợi ích.

**Đáp án ngắn:** REST là mặc định cho API công khai. gRPC giữa dịch vụ nội bộ tải cao hoặc cần streaming. GraphQL khi nhiều client cần hình dạng dữ liệu khác nhau.

**Ví dụ 1: over-fetching (_Đã chạy bằng Python_), màn hình danh sách chỉ cần `id`, `name`, `avatar`:**

```text
object đầy đủ: 723 B; chỉ 3 trường cần: 73 B
50 phần tử: 36.150 B (REST trả cả object) so với 3.650 B (chỉ trường cần)  => gấp ~10 lần
```

Trên mạng di động, 10 lần dữ liệu là latency và tiền cước thật; GraphQL (hoặc REST có `fields=`/projection) giải được. Chi phí của GraphQL: truy vấn lồng sâu có thể nặng, cache HTTP khó hơn, N+1 ở resolver.

**Ví dụ 2: biểu diễn nhị phân (minh họa ý tưởng, **không phải** Protobuf thật):** cùng một object 5 trường: JSON gọn 65 byte, bản encapsulation nhị phân kích thước cố định 22 byte. Protobuf thật dùng số hiệu trường và varint nên có số khác, nhưng nguyên lý "bỏ tên trường và chữ số dạng văn bản" cho kết quả cùng chiều. _Đã chạy thử bằng Python (`struct`)._

**Nhớ:** ba lựa chọn khác nhau ở ai quyết định hình dạng dữ liệu và chi phí biểu diễn trên dây. Xem [Cách trả lời một bài System Design](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-07-cach-tra-loi-system-design.md).

**Hỏi xoáy 1:** Thay đổi API mà không phá client?
_Vì sao hỏi tiếp:_ dù chọn giao thức nào, contract là thứ khó đảo ngược nhất, nên câu kế tiếp là tiến hóa nó an toàn.

**Đáp:** Chỉ thêm (trường tùy chọn mới), không đổi nghĩa/xóa; đánh dấu deprecated và đo lượng dùng trước khi gỡ; phiên bản hóa khi phải phá. Với gRPC, đừng đổi số hiệu trường.

**Hỏi xoáy 2:** Vì sao gRPC khó dùng trực tiếp từ trình duyệt?
_Vì sao hỏi tiếp:_ lý do "REST mặc định cho API công khai" cần một bằng chứng kỹ thuật cụ thể, và đây là bằng chứng đó.

**Đáp:** Trình duyệt không điều khiển đầy đủ HTTP/2 như gRPC cần (trailer, framing); cần gRPC-Web hoặc gateway dịch.

**Sai lầm hay gặp:** thêm gRPC hoặc GraphQL "cho hiện đại" trong khi chỉ có một client và tải thấp; chi phí vận hành thêm không có lợi tương ứng.

## 10. Scale lên (vertical) hay scale ra (horizontal)?

**Câu hỏi:** Hệ thống chậm, sếp bảo "thêm máy đi". Bạn thêm 8 máy ứng dụng rồi 3 read replica cho DB, nhưng ghi vẫn nghẽn. Vì sao, và thứ tự mở rộng hợp lý là gì?

**Gợi ý suy luận:**
- Phần nào của công việc chia được cho nhiều máy, phần nào không (lock, một primary ghi)?
- Định luật Amdahl: với phần tuần tự `s`, tăng tốc tối đa là bao nhiêu?
- Read replica phục vụ thao tác gì và không phục vụ thao tác gì?

**Lập luận:** vì chỉ phần parallel hóa được mới hưởng lợi từ thêm máy, nên tăng tốc tối đa là `1/s` dù thêm bao nhiêu máy (20% tuần tự thì trần 5x). Với DB, phần tuần tự thường là ghi vào một primary. Read replica chỉ nhân bản dữ liệu để đọc, nên không tăng năng lực ghi. Do đó phải thu hẹp phần tuần tự trước (tối ưu truy vấn, cache), rồi scale lên primary, sau cùng mới sharding vì nó phức tạp nhất. Tầng ứng dụng stateless thì scale ra dễ. Điểm dễ nhầm là tưởng thêm replica đọc làm ghi nhanh hơn, hoặc scale ra tầng ứng dụng mà quên mỗi instance thêm kết nối vào DB (có thể vượt `max_connections`). Khi mở rộng, thứ tự thường là: đo nút thắt, tối ưu truy vấn và index, cache, scale lên, read replica, và cuối cùng sharding; mỗi bước phức tạp hơn nên chỉ làm khi bước trước đã hết tác dụng.

**Đáp án ngắn:** tầng ứng dụng stateless thì scale ra dễ. Với DB, thứ tự thường là: tối ưu truy vấn/index, cache, scale lên, read replica, rồi mới sharding. Mỗi bước sau phức tạp hơn bước trước.

**Ví dụ (_Đã chạy bằng Python_), tăng tốc theo số máy `n` khi phần parallel hóa là `p`:**

```text
p = 0,95: n=2 -> 1,9x | n=8 -> 5,9x | n=32 -> 12,5x | n=128 -> 17,4x | trần = 20x
p = 0,80: n=2 -> 1,7x | n=8 -> 3,3x | n=32 -> 4,4x  | n=128 -> 4,8x  | trần = 5x
```

Với 20% phần tuần tự (ví dụ giữ lock tuần tự hay ghi vào một primary), 128 máy chỉ nhanh 4,8 lần: **máy thứ 129 gần như vô nghĩa**. Với DB đọc/ghi 90/10: read replica giảm tải **đọc** nhưng **không** tăng năng lực ghi; nếu primary ghi tối đa 1.000 ghi/s thì tổng ghi tối đa vẫn là 1.000 dù thêm 3 replica. Tăng năng lực ghi cần scale lên primary hoặc sharding.

**Nhớ:** trần tăng tốc là `1/s` (Amdahl); read replica không tăng năng lực ghi. Xem [CAP và Consistency](/go?p=15-System%20Design%2Fhard%2Flt-05-cap-consistency.md).

**Hỏi xoáy 1:** Thứ gì ngăn một dịch vụ scale ra?
_Vì sao hỏi tiếp:_ tầng ứng dụng "scale ra dễ" chỉ đúng khi stateless, nên phải chỉ ra điều gì phá tính stateless.

**Đáp:** Trạng thái gắn với một máy: session trong memory, file cục bộ, lock trong JVM, job chạy theo lịch ở một nơi, cache cục bộ cần nhất quán. Đưa trạng thái ra ngoài (Redis, DB, object storage) trước khi thêm máy.

**Hỏi xoáy 2:** Vì sao scale lên trước khi shard?
_Vì sao hỏi tiếp:_ thứ tự trong đáp án có một bước ngược trực giác (đắt hơn nhưng làm trước), cần giải thích.

**Đáp:** Sharding làm phức tạp truy vấn xuyên shard, transaction, di cư dữ liệu. Một máy lớn hơn mua thời gian bằng tiền rẻ hơn công sức nhiều lần, miễn là chưa chạm trần.

**Sai lầm hay gặp:** thêm máy khi nút thắt là một lock hoặc một primary; chi phí tăng mà throughput không tăng (xem Amdahl ở trên).

## 11. Tối ưu sớm hay đo trước?

**Câu hỏi:** Một request mất 100 ms, đồng nghiệp muốn dành cả tuần viết lại thuật toán trong logic nghiệp vụ cho nhanh gấp đôi. Bạn có đồng ý không? Vậy "tối ưu sớm là gốc rễ của điều xấu" có đúng với mọi quyết định không?

**Gợi ý suy luận:**
- Nếu một phần chiếm tỉ lệ `f` thời gian và nhanh gấp `k` lần, tổng thời gian giảm tối đa bao nhiêu?
- Làm sao biết thời gian đang đi đâu (profiler, trace)?
- Quyết định nào sửa sau rất đắt dù có đo (mô hình dữ liệu, partition key)?

**Lập luận:** vì mức giảm tối đa là `f(1 − 1/k)`, nên tối ưu phần chỉ chiếm 5% thời gian thì tổng giảm chỉ 2,5% dù nhanh gấp đôi, còn phần DB chiếm 70% thì giảm 35%. Vậy phải đo trước để biết `f` của từng phần. Nhưng với quyết định khó đảo ngược, không có profile nào cứu được sau khi dữ liệu đã lớn, nên phải cân nhắc từ đầu. Do đó: đo trước với tối ưu vi mô, nghĩ sớm với kiến trúc khó đảo ngược. Điểm dễ nhầm là trích câu "tối ưu sớm là gốc rễ của điều xấu" để bỏ qua mọi tính toán hiệu năng ban đầu: câu đó nói về tối ưu vi mô, không nói về mô hình dữ liệu hay ranh giới dịch vụ. Quy tắc: đo trước khi tối ưu mã, nhưng ước lượng quy mô và chọn kiến trúc đủ cho 10 lần tải hiện tại ngay từ đầu, vì thứ đó sửa sau rất đắt.

**Đáp án ngắn:** đo trước đối với tối ưu mức mã (vi mô). Nhưng **cân nhắc sớm** quyết định kiến trúc khó đảo ngược (mô hình dữ liệu, partition key, ranh giới service, giao thức công khai), vì sửa sau rất đắt.

**Ví dụ (_Đã chạy bằng Python_): một request 100 ms, profile cho thấy DB 70 ms, serialization 20 ms, logic 5 ms, khác 5 ms. Làm từng phần nhanh gấp đôi:**

```text
tối ưu DB            gấp đôi -> 65,0 ms (giảm 35,0%)
tối ưu serialization gấp đôi -> 90,0 ms (giảm 10,0%)
tối ưu logic         gấp đôi -> 97,5 ms (giảm  2,5%)
```

Một kỹ sư dành cả tuần tối ưu thuật toán trong logic (nghe "hay" nhất) thu về 2,5%; chỉ cần thêm một index cho truy vấn DB là được 35%. Dữ liệu từ profiler/trace quyết định, không phải trực giác. Ngược lại, chọn partition key sai cho một bảng 5 TB sẽ không có "profile" nào cứu được, chỉ có di cư dữ liệu tốn nhiều tháng; đó là loại quyết định phải cân nhắc từ đầu.

**Cách nói thành lời:** "Tôi không tối ưu vi mô khi chưa có mục tiêu hiệu năng (SLO) và số đo. Nhưng tôi không bỏ qua lựa chọn khó đảo ngược như partition key. Phần còn lại tôi viết đơn giản, đặt sẵn đo lường, rồi tối ưu chỗ nghẽn thật." Xem [JIT, Hiệu năng và Benchmark](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-19-jit-benchmark.md).

**Nhớ:** lợi ích tối đa của một tối ưu là `f(1 − 1/k)`; phân biệt tối ưu vi mô (đo trước) với quyết định khó đảo ngược (nghĩ sớm).

**Hỏi xoáy 1:** Làm sao biết nên tối ưu chỗ nào?
_Vì sao hỏi tiếp:_ "đo trước" chỉ có nghĩa khi bạn nói được đo bằng công cụ nào.

**Đáp:** Profiler (flame graph, JFR), trace phân tán để biết thời gian đi đâu, truy vấn chậm của DB. Kết hợp với Amdahl để ước tính lợi ích tối đa **trước** khi bắt tay làm.

**Hỏi xoáy 2:** "Tối ưu sớm là gốc rễ của mọi điều xấu" có nghĩa là không bao giờ nghĩ tới hiệu năng?
_Vì sao hỏi tiếp:_ để tránh hiểu sai câu châm ngôn thành "đừng bao giờ lo hiệu năng", điều mâu thuẫn với nửa sau đáp án.

**Đáp:** Không. Câu gốc nói về tối ưu vi mô khi chưa biết chỗ nghẽn. Thiết kế dữ liệu và kiến trúc hợp lý từ đầu là việc khác.

**Sai lầm hay gặp:** microbenchmark không dùng JMH (xem [qa-06](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-06-jvm-hieu-nang-phan-tan.md) câu 5) rồi kết luận sai.

## 12. Trả nợ kỹ thuật hay làm tính năng mới?

**Câu hỏi:** Sếp cần tính năng mới gấp, còn đội muốn dừng lại dọn một module khó hiểu. Bạn quyết định và thuyết phục thế nào?

**Gợi ý suy luận:**
- Nợ kỹ thuật "tính lãi" bằng gì mỗi tuần (giờ làm chậm, sự cố)?
- So chi phí trả một lần với lãi hằng kỳ thì hoàn vốn sau bao lâu?
- Nợ nằm trên đường đi hằng ngày khác gì nợ nằm ở góc ít ai chạm?

**Lập luận:** vì nợ làm chậm mọi việc chạm vào nó mỗi tuần, nên có thể quy ra "lãi" bằng giờ: 4 người × 3 giờ × 48 tuần = 576 giờ/năm. So với chi phí trả 160 giờ, hoàn vốn sau khoảng 13 tuần, nên đáng trả. Nếu chỉ 1 giờ/tuần thì hoàn vốn 160 tuần, không đáng. Vì quản lý quyết định bằng chi phí và rủi ro, nên cần số liệu của chính đội, và trả nợ gắn với việc đang làm để không tốn thêm một dự án riêng. Điểm dễ nhầm là đặt câu hỏi "trả nợ hay làm tính năng" như một lựa chọn một mất một còn. Cách thuyết phục tốt là gắn nợ với số liệu (giờ mất mỗi tuần, số sự cố, thời gian đưa tính năng ra), đề xuất trả nợ dần gắn với việc đang làm (quy tắc để lại sạch hơn lúc đến) và dành một phần năng lực cố định mỗi sprint, thay vì xin một dự án viết lại lớn không có điểm dừng.

**Đáp án ngắn:** quy nợ ra thời gian và sự cố để thuyết phục bằng số liệu; trả nợ **gắn với việc đang làm** (để lại sạch hơn lúc đến), dành một phần năng lực cố định mỗi sprint, tránh "dự án viết lại toàn bộ" nếu không có lộ trình tăng dần.

**Ví dụ (giả định minh họa, _Đã tính bằng Python_): 4 dev mỗi người mất 3 giờ/tuần vì một module khó hiểu, 48 tuần/năm; trả nợ cần 160 giờ.**

```text
chi phí lãi: 4 x 3 x 48 = 576 giờ/năm = 0,3 FTE
trả nợ 160 giờ -> hoàn vốn sau 160 / (4 x 3) = 13,3 tuần
```

Với "lãi" 12 giờ/tuần, bỏ 160 giờ trả nợ hoàn vốn trong chưa đầy một quý, sau đó lợi ~0,3 FTE mỗi năm. Câu chuyện này thuyết phục quản lý hơn "mã xấu quá". Nếu lãi chỉ 1 giờ/tuần (ít ai chạm vào), hoàn vốn mất 160 tuần: không đáng ưu tiên.

**Nhớ:** nợ kỹ thuật có lãi; so lãi hằng kỳ với chi phí trả một lần, và nói bằng số. Xem [Code review, giao tiếp kỹ thuật và ra quyết định](/go?p=07-Interview-QA%2FBehavioral%2Fmedium%2Flt-03-code-review-giao-tiep-quyet-dinh.md).

**Hỏi xoáy 1:** Làm sao thuyết phục quản lý đầu tư vào việc không có tính năng mới?
_Vì sao hỏi tiếp:_ có phép tính hoàn vốn rồi thì trở ngại còn lại là đưa nó tới người ra quyết định bằng đúng ngôn ngữ của họ.

**Đáp:** Dùng số đo của chính đội: lead time, tỉ lệ lỗi sau phát hành, giờ mất do sự cố, thời gian onboarding. Nói bằng ngôn ngữ của họ (chi phí, rủi ro, tốc độ giao hàng).

**Hỏi xoáy 2:** Khi nào nên viết lại thay vì sửa dần?
_Vì sao hỏi tiếp:_ trả nợ ở quy mô lớn dễ trượt thành "viết lại hết", nên cần nói rõ vì sao thường không nên.

**Đáp:** Hiếm khi. Viết lại tạo hai hệ thống phải duy trì, mất tri thức ẩn trong mã cũ, và thường vượt ước lượng. Ưu tiên cách "bóp nghẹt" (strangler): thay từng phần sau giao diện ổn định.

**Sai lầm hay gặp:** trả nợ lan man không gắn với việc nào, hoặc không đo lãi nên không biết khoản nào đáng trả.

## Điều người phỏng vấn senior chấm

| Điểm | Dấu hiệu tốt | Dấu hiệu xấu |
|---|---|---|
| Hỏi bối cảnh | Hỏi quy mô, ràng buộc trước khi chọn | Chọn công nghệ ngay |
| Tính được | Dẫn số liệu và phép tính làm căn cứ | Chỉ nói định tính |
| Nêu đánh đổi | Nói rõ được và mất gì | Chỉ nói ưu điểm |
| Tư duy rủi ro | Nêu rủi ro và dấu hiệu để đổi hướng | Tin chắc tuyệt đối |
| Thực dụng | Chọn thứ đơn giản nhất đủ dùng | Chạy theo công nghệ mới |
| Đảo ngược được | Phân biệt quyết định dễ và khó đổi | Coi mọi quyết định như nhau |

Nguồn: các bài liên kết ở đầu trang; số liệu giả định nêu rõ trong từng câu, phần tính toán và mô phỏng chạy bằng Python 3, đo thread bằng OpenJDK 11.

