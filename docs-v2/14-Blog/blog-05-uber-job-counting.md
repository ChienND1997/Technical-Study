# Job Counting: Bài toán Uber giải quyết với Apache Pinot

> Nguồn: [Viblo](https://viblo.asia/p/job-counting-bai-toan-hoc-bua-ma-uber-giai-quyet-trong-tich-tac-018J2KDRLYK) · Tác giả: Sydexa · Đăng ngày: thg 7 6, 2024 · Thẻ: kiến trúc microservices, System Design, OLAP, Big Data
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài mô tả bài toán tưởng đơn giản ở Uber: đếm số chuyến của từng tài xế theo ngày, tuần, tháng để đánh giá và tính tiền, trong khi dữ liệu cực lớn và nằm trên nhiều máy chủ. Uber chọn Apache Pinot, một kho dữ liệu phân tích thời gian thực, và tác giả điểm qua các khó khăn cùng cách xử lý.

## Ý chính

- Pinot là cơ sở dữ liệu phân tán mã nguồn mở, khởi nguồn từ LinkedIn, phù hợp bài toán OLAP nhờ mở rộng ngang, lưu trữ dạng cột và nạp được cả dữ liệu batch lẫn luồng như Kafka.
- Kiến trúc gồm các thành phần như controller, broker, server realtime/offline, segment lưu trữ, cùng Zookeeper và Helix để điều phối cụm.
- Khó khăn thứ nhất là ước tính dung lượng vì mức nén phụ thuộc đặc điểm dữ liệu. Uber nạp thử một mẫu khoảng 10% dữ liệu, đo dung lượng thực, cộng thêm phần dự phòng, rồi chạy thử tải với dữ liệu đầy đủ.
- Khó khăn thứ hai là tốc độ truy vấn theo tài xế, khách và khoảng thời gian. Họ dùng inverted index và bloom filter trên hai cột ID để bỏ qua các segment không liên quan, đồng thời sắp xếp dữ liệu theo tài xế để chuyến của cùng một người nằm gần nhau.
- Khó khăn thứ ba là lưu lượng tăng đột biến giờ cao điểm. Uber thêm jitter, tức độ trễ ngẫu nhiên giữa các lần retry, để các request không dồn cùng lúc.

## Kinh nghiệm rút ra

Muốn truy vấn tổng hợp nhanh trên dữ liệu lớn, hãy chọn kho lưu trữ dạng cột, đánh chỉ mục đúng cột lọc và sắp xếp dữ liệu theo khóa hay truy vấn. Retry nên có jitter để tránh tự gây quá tải. Chủ đề gần với Database và Distributed Systems.

## Đọc bản gốc

[Job Counting: Bài Toán Hóc Búa Mà Uber Giải Quyết "Trong Tích Tắc"](https://viblo.asia/p/job-counting-bai-toan-hoc-bua-ma-uber-giai-quyet-trong-tich-tac-018J2KDRLYK)

**Tóm tắt:**
- Uber đếm chuyến theo tài xế bằng Apache Pinot, kho OLAP thời gian thực.
- Mẫu dữ liệu và thử tải giúp ước tính dung lượng.
- Index, bloom filter, sắp xếp theo tài xế và jitter giúp nhanh, ổn định.

