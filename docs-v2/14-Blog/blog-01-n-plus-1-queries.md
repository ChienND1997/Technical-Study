# Bài toán N+1 queries và điểm D hồi đại học?

> Nguồn: [Viblo](https://viblo.asia/p/bai-toan-n1-queries-va-diem-d-hoi-dai-hoc-m2vJPoRq4eK) · Tác giả: David Nguyen · Đăng ngày: thg 7 13, 2024 · Thẻ: Hibernate, Spring Data Jpa
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả mở đầu bằng kỷ niệm bị trừ điểm vì đồ án web gọi database theo kiểu lặp: một truy vấn lấy danh sách, rồi mỗi phần tử lại thêm một truy vấn nữa. Từ đó bài giải thích N+1 queries là gì, vì sao Hibernate/JPA dễ dính và có những cách nào để tránh.

## Ý chính

- N+1 xảy ra khi ta chạy thêm N truy vấn để lấy dữ liệu mà lẽ ra một truy vấn là đủ. Với 10 bản ghi sẽ có 11 câu SQL, với hàng trăm bản ghi thì con số tăng theo.
- Quan hệ có kiểu nạp mặc định là EAGER (như many-to-one, one-to-one) vẫn bị N+1, vì Hibernate lặng lẽ nạp dữ liệu liên quan cho từng dòng.
- Đổi sang LAZY chưa giải quyết triệt để: hễ code duyệt vòng lặp và đụng tới dữ liệu liên quan thì các truy vấn phụ vẫn phát sinh.
- Có ba hướng xử lý: JOIN FETCH (một câu duy nhất, nên kết hợp phân trang khi dữ liệu lớn), truy vấn phụ dùng mệnh đề IN, và cấu hình batch size để Hibernate gom nhiều khóa vào một câu IN.
- Về bản chất, các cách này quy về JOIN hoặc IN. Tác giả cho rằng IN có thể nhẹ hơn JOIN trên bảng rất lớn, nhưng kết luận còn phụ thuộc đặc thù hệ thống và loại cơ sở dữ liệu.

## Kinh nghiệm rút ra

Khi dùng Spring Boot với JPA, hãy bật log SQL ở môi trường dev và đếm số câu lệnh cho mỗi API; nếu số câu tăng theo kích thước danh sách thì đó là dấu hiệu N+1. Hãy chủ động chọn JOIN FETCH, truy vấn IN hoặc batch size theo từng trường hợp thay vì tin hoàn toàn vào mặc định của ORM, và đo thực tế trước khi kết luận. Chủ đề này thuộc mảng Database và Spring Boot của KemTech.

## Đọc bản gốc

[Bài toán N+1 queries và điểm D hồi đại học?](https://viblo.asia/p/bai-toan-n1-queries-va-diem-d-hoi-dai-hoc-m2vJPoRq4eK)

**Tóm tắt:**
- N+1 là lặp truy vấn thừa thay vì lấy gộp một lần.
- Hibernate có JOIN FETCH, truy vấn IN và batch size để khắc phục.
- JOIN hay IN tốt hơn tùy dữ liệu; hãy đo trước khi chọn.

