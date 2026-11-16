# Kafka giải quyết bài toán gì mà Redis/RabbitMQ không làm được?

> Nguồn: [Viblo](https://viblo.asia/p/kafka-giai-quyet-bai-toan-gi-ma-redisrabbitmq-khong-lam-duoc-ymJXDEqqJkq) · Tác giả: Vinh Phạm · Đăng ngày: 08/04/2026 · Thẻ: kafka, Rabbitmq, Redis
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả cho rằng so sánh Kafka với Redis hay RabbitMQ theo tiêu chí "cái nào nhanh hơn" là đặt sai câu hỏi. Ba công cụ phục vụ ba lớp bài toán khác nhau: Redis xử lý nhanh trong bộ nhớ, RabbitMQ điều phối công việc qua hàng đợi, còn Kafka tổ chức và lưu trữ dòng sự kiện theo thời gian. Bài phân tích khi nào nên chọn Kafka.

## Ý chính

- Hàng đợi truyền thống giả định tin nhắn xử lý xong là biến mất; Kafka ghi sự kiện vào log và giữ lại để đọc lại bất cứ lúc nào.
- Consumer đọc theo vị trí offset, nên có thể lùi về quá khứ để chạy lại logic khi sửa lỗi, đổi nghiệp vụ hoặc dựng lại pipeline dữ liệu.
- Nhiều service độc lập cùng đọc một luồng dữ liệu mà không ảnh hưởng nhau; thêm consumer mới không cần sửa producer.
- Producer chỉ phát sự kiện, consumer tự đăng ký, nên mức ràng buộc giữa các service thấp hơn, phù hợp microservices đang mở rộng.
- Kafka mở rộng bằng cách chia log thành nhiều partition trên nhiều node; đổi lại thứ tự chỉ được đảm bảo trong từng partition.
- Với việc đơn giản như job nền, gửi một lần hoặc cần độ trễ cực thấp, Redis hoặc RabbitMQ thường hợp lý hơn.

## Kinh nghiệm rút ra

Trước khi chọn công nghệ, hãy hỏi dữ liệu có cần lưu lại và đọc lại không, và có bao nhiêu bên cùng tiêu thụ. Đừng đưa Kafka vào chỉ vì nó phổ biến, vì chi phí vận hành cao hơn nhiều. Nội dung này liên quan đến mảng Hệ thống và DevOps của KemTech, đặc biệt khi cân nhắc quan sát và vận hành cụm message broker.

## Đọc bản gốc

[Kafka giải quyết bài toán gì mà Redis/RabbitMQ không làm được?](https://viblo.asia/p/kafka-giai-quyet-bai-toan-gi-ma-redisrabbitmq-khong-lam-duoc-ymJXDEqqJkq)

**Tóm tắt:**
- Kafka là nơi lưu dòng sự kiện, không chỉ là hàng đợi nhanh hơn.
- Replay và nhiều consumer đọc chung là thế mạnh chính.
- Job đơn giản hoặc cần độ trễ thấp thì Redis hoặc RabbitMQ đủ dùng.

