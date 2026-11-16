# Timeout, Retry và Jitter: ba công cụ chống sập dây chuyền của AWS

> Nguồn: [AWS Builder's Library](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) · Tác giả: Marc Brooker (AWS) · Đăng ngày: 5 thg 12, 2019 · Thẻ: distributed systems, resilience, backend, system design
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài viết của một kỹ sư AWS giải quyết câu hỏi tưởng chừng cơ bản nhưng rất dễ làm sai: khi một service gọi service khác qua mạng, nên chờ bao lâu, có nên gọi lại khi lỗi, và gọi lại như thế nào để không tự biến một sự cố nhỏ thành sập toàn hệ thống. Mục tiêu không phải tránh lỗi hoàn toàn (không thể), mà là tránh để một tỷ lệ lỗi nhỏ bị khuếch đại thành outage toàn phần.

## Ý chính

- Timeout là thời gian tối đa client chờ một request. Không đặt timeout thì một request treo sẽ giữ chặt tài nguyên phía gọi (thread, connection, bộ nhớ) cho tới khi hệ thống cạn kiệt. Cách chọn giá trị: chấp nhận một tỷ lệ false-timeout nhỏ (ví dụ 0,1%), rồi lấy đúng mốc percentile latency tương ứng (ví dụ p99.9) của dịch vụ được gọi làm timeout.
- Nghịch lý của retry: retry giúp vượt qua lỗi tạm thời, nhưng khi lỗi đến từ quá tải, retry lại đổ thêm dầu vào lửa. Bài đưa ví dụ rất trực quan: một chuỗi gọi 5 tầng, mỗi tầng tự ý retry 3 lần, tải xuống tầng cuối (database) có thể nhân lên 3^5 = 243 lần so với bình thường — gần như chắc chắn không bao giờ hồi phục được nếu cứ để vậy.
- Cách giảm hiệu ứng khuếch đại: chỉ retry ở đúng một điểm trong toàn bộ chuỗi gọi (thường là tầng ngoài cùng) thay vì để mọi tầng tự retry độc lập; giới hạn chặt số lần retry; và dùng cơ chế kiểu token bucket cục bộ — còn token thì được retry, hết token thì chỉ gọi lại theo một nhịp cố định, thay vì retry vô hạn hay dùng circuit breaker (vốn có hành vi "chuyển trạng thái" khó test và có thể kéo dài thời gian hồi phục).
- Chỉ nên retry các thao tác an toàn khi lặp lại (idempotent) — các API chỉ đọc thường an toàn, còn API tạo tài nguyên thì chưa chắc, trừ khi tự nó có cơ chế chống trùng (ví dụ idempotency token).
- Backoff (tăng dần thời gian chờ giữa các lần retry, thường theo cấp số nhân) giúp giảm tải, nhưng nếu nhiều client cùng thất bại và cùng backoff theo đúng công thức, chúng sẽ lại cùng retry vào đúng một thời điểm. Jitter — thêm một khoảng ngẫu nhiên vào thời gian chờ — giải quyết đúng vấn đề đó, rải các lần retry ra theo thời gian thay vì dồn cục.

## Kinh nghiệm rút ra

Timeout, retry, backoff và jitter không phải bốn mảnh ghép độc lập mà là một bộ công cụ đi cùng nhau: thiếu timeout thì tài nguyên bị giữ chặt, retry không kiểm soát thì khuếch đại tải, backoff không có jitter thì vẫn gây dồn cục. Khi thiết kế bất kỳ lời gọi giữa hai service nào, hãy hỏi đủ cả bốn câu hỏi này, không chỉ mỗi "có nên retry không". Chủ đề gần với Network & Security (timeout, retry) và System Design (resilience, circuit breaker).

## Đọc bản gốc

[Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)

**Tóm tắt:**
- Timeout nên đặt dựa trên percentile latency thực tế của dịch vụ được gọi, không đoán bừa.
- Retry không kiểm soát ở nhiều tầng có thể khuếch đại tải lên dịch vụ cuối theo cấp số nhân.
- Chỉ retry ở một điểm, giới hạn số lần, và chỉ retry thao tác idempotent.
- Backoff cần thêm jitter (độ trễ ngẫu nhiên) để tránh nhiều client cùng retry một lượt.
