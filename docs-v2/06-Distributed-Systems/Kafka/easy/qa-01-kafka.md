# Câu hỏi phỏng vấn: Apache Kafka & Event Streaming

## 1. Ngữ nghĩa chuyển phát Message (Delivery Semantics)

**Câu hỏi:** Phân biệt 3 ngữ nghĩa chuyển phát: At-most-once, At-least-once và Exactly-once trong Kafka? Làm sao để đạt được Exactly-Once Processing?

**Đáp an ngắn:** 
- At-most-once: Có thể mất tin nhưng không bao giờ trùng.
- At-least-once: Không bao giờ mất tin nhưng có thể bị trùng (phổ biến nhất).
- Exactly-once: Không mất tin và chỉ xử lý đúng 1 lần duy nhất; đạt được bằng Idempotent Producer + Kafka Transactions (`read-process-write`) + xử lý lũy đao (Idempotence) ở Consumer phía đích.

**Gợi ý suy luận:** Điểm commit offset: Trước khi xử lý (At-most-once) vs Sau khi xử lý (At-least-once) -> Xử lý mạng chập chờn gây gửi trùng -> Cần Idempotency key.

**Lập luận:** Hầu hết hệ thống microservices chạy ở chế độ **At-least-once** (xử lý xong nghiệp vụ mới commit offset; nếu server crash trước khi commit, khi khởi động lại sẽ đọc lại message đó dẫn đến bị lặp). Để đạt **Exactly-once**:
1. Phía Producer: Bật `enable.idempotence=true` (Broker dùng PID + Sequence Number để tự động hủy các message gửi trùng do mạng chập chờn).
2. Phía Pipeline: Dùng Kafka Transactional API khi đọc từ Topic A và ghi sang Topic B trong cùng 1 transaction nguyên tử.
3. Phía Consumer ngoài cùng (lưu DB/gửi mail): Database phải thiết kế khóa chính hoặc Unique Constraint dựa trên `message_id` nghiệp vụ để dù nhận lại tin lần 2 cũng không bị nhân đôi dữ liệu.

**Nhớ:** Exactly-once = Idempotent Producer + Kafka Transaction API + Consumer Deduplication/Unique Key ở Database đích.

## 2. Thứ tự xử lý Message (Message Ordering) trong Kafka

**Câu hỏi:** Kafka có đảm bảo thứ tự của các tin nhắn trong toàn bộ một Topic không? Làm thế nào để đảm bảo thứ tự xử lý các sự kiện của cùng một người dùng (User)?

**Đáp án ngắn:** Kafka KHÔNG đảm bảo thứ tự trên toàn bộ Topic, mà CHỈ đảm bảo thứ tự tuần tự tuyệt đối bên trong TỪNG PARTITION. Để đảm bảo thứ tự sự kiện của cùng một User, Producer phải chỉ định Message Key là `userId` (hoặc `accountId`), Kafka sẽ băm (hash) key đó để luôn đẩy toàn bộ sự kiện của user vào cùng một Partition duy nhất.

**Gợi ý suy luận:** Topic có nhiều Partition chạy song song -> Thứ tự toàn cục làm mất khả năng scale out -> Hash key gán partition cố định cho cùng 1 entity.

**Lập luận:** Một Partition là một file commit log tuần tự đơn luồng gắn liền với các số Offset tăng dần (0, 1, 2, 3...), nên thứ tự bên trong 1 partition được bảo toàn 100%. Nếu không truyền Key (`key = null`), Kafka phân phối Round-Robin sang các partition khác nhau, các consumer đọc song song sẽ xử lý không theo thứ tự thời gian. Khi truyền `key = userId`, hàm băm `murmur2(userId) % numPartitions` luôn cho ra cùng một partition ID, đảm bảo Consumer nhận tuần tự: Đăng ký -> Nạp tiền -> Mua hàng, không bao giờ bị đảo ngược logic.

**Nhớ:** Kafka chỉ đảm bảo thứ tự trong cùng 1 Partition; Muốn giữ thứ tự theo nghiệp vụ -> Truyền Message Key (như `userId`, `orderId`).

