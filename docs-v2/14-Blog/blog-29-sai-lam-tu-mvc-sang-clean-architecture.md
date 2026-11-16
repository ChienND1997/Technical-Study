# Sai lầm dễ gặp khi chuyển từ MVC sang Clean Architecture

> Nguồn: [Viblo](https://viblo.asia/p/sai-lam-de-gap-phai-khi-chuyen-tu-mvc-pattern-sang-clean-architecture-BQyJKvBq4Me) · Tác giả: Nguyễn Hải Bình · Đăng ngày: thg 3 6, 2025 · Thẻ: Clean Architecture, Domain-Driven Design (DDD)
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả thấy nhiều blog về Clean Architecture mang theo hiểu lầm từ thói quen MVC. Bài liệt kê năm sai lầm phổ biến cùng cách sửa.

## Ý chính

- Entity của tầng domain bị gắn decorator của ORM hoặc phụ thuộc cơ sở dữ liệu. Domain model phải thuần mô tả nghiệp vụ; phần ánh xạ lưu trữ và cài đặt repository thuộc về tầng infrastructure, domain chỉ giữ interface.
- Đặt business logic trong controller. Controller chỉ là cửa nhận request thuộc infrastructure, việc của nó là gọi đúng use case và xử lý lỗi trả về.
- Coi view là một tầng riêng; thực tế nó cũng chỉ thuộc infrastructure.
- Nhầm use case với domain service. Hành động chỉ tương tác giữa các domain model, như tính phí vận chuyển, nên là domain service.
- Sai chiều phụ thuộc: phải đi từ ngoài vào trong, dùng interface và dependency injection.

## Kinh nghiệm rút ra

Kiểm tra nhanh: mở file domain xem có import ORM hay framework không; nếu có thì ranh giới đã vỡ. Đừng áp máy móc cho dự án nhỏ, nhưng nên tách logic khỏi controller từ đầu. Tác giả ghi bài có ChatGPT hỗ trợ, nên hãy đối chiếu thêm. Chủ đề thuộc mảng Architecture của KemTech, gần với kiến trúc routes, service, repository.

## Đọc bản gốc

[Sai lầm dễ gặp phải khi chuyển từ MVC pattern sang clean architecture](https://viblo.asia/p/sai-lam-de-gap-phai-khi-chuyen-tu-mvc-pattern-sang-clean-architecture-BQyJKvBq4Me)

**Tóm tắt:**
- Domain phải độc lập với ORM, database và framework.
- Logic nghiệp vụ không nằm trong controller mà ở use case hoặc domain service.
- Phụ thuộc đi một chiều vào trong, dùng interface và dependency injection.

