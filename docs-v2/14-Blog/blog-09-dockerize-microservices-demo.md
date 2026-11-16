# Dockerize project demo microservices của Google

> Nguồn: [Viblo](https://viblo.asia/p/dockerize-project-demo-microservices-cua-google-0gdJzDqAVz5) · Tác giả: Mai Trung Đức · Đăng ngày: 06/07/2024 · Thẻ: Google Cloud, Docker, microservices, ecommerce
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả hướng dẫn chạy toàn bộ ứng dụng thương mại điện tử mẫu theo kiến trúc microservices của Google Cloud trên máy cá nhân bằng Docker. Qua đó người đọc thấy một hệ nhiều dịch vụ viết bằng nhiều ngôn ngữ được build và chạy cùng nhau ra sao.

## Ý chính

- Dự án gồm 11 dịch vụ chính cộng thêm Redis, mỗi dịch vụ dùng một ngôn ngữ khác nhau (Go, C#, Node.js, Python, Java). Sơ đồ kiến trúc giúp hiểu ai gọi ai, từ đó chia mạng và gỡ lỗi dễ hơn.
- Cách làm là build hai đợt: trước hết các dịch vụ độc lập, sau đó các dịch vụ phụ thuộc như frontend, checkout và bộ sinh tải. Repo đã có sẵn Dockerfile cho từng dịch vụ.
- Dùng docker compose để chạy chung. Chỉ frontend cần mở cổng ra ngoài, còn các dịch vụ khác giao tiếp nội bộ giữa các container.
- Một số container thoát ngay vì thiếu biến môi trường như cổng lắng nghe. Tác giả tìm các biến cần thiết bằng cách đối chiếu file manifest Kubernetes của dự án rồi chép vào compose.
- Trên máy MacBook chip Apple, dịch vụ C# giỏ hàng và bộ sinh tải gặp lỗi tương thích kiến trúc. Cách xử lý gồm chỉ định nền tảng amd64 trong Dockerfile, hoặc build cho kiến trúc arm64 dùng runtime identifier phù hợp.
- Khai báo phụ thuộc giữa các dịch vụ trong compose để thứ tự khởi động khớp với sơ đồ.

## Kinh nghiệm rút ra

Dù Dockerfile có sẵn, môi trường khác nhau vẫn sinh lỗi, nên cần biết đọc log, tra manifest triển khai và hiểu kiến trúc CPU. Hãy vẽ hoặc ghi lại sơ đồ phụ thuộc dịch vụ trước khi triển khai. Bài thuộc chủ đề DevOps và Distributed Systems của KemTech.

## Đọc bản gốc

[Dockerize project demo microservices của Google](https://viblo.asia/p/dockerize-project-demo-microservices-cua-google-0gdJzDqAVz5)

**Tóm tắt:**
- Chạy cả hệ microservices mẫu cục bộ bằng Docker Compose.
- Lỗi thường đến từ biến môi trường và kiến trúc CPU.
- Hiểu sơ đồ phụ thuộc giúp triển khai và debug dễ hơn.

