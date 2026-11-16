# Lột trần sự thật về JWT (Phần 1): Cú lừa "Stateless" và nỗi đau Đăng xuất

> Nguồn: [Viblo](https://viblo.asia/p/lot-tran-su-that-ve-jwt-phan-1-cu-lua-stateless-va-noi-dau-dang-xuat-pPLkNB9eJRZ) · Tác giả: Bách Nguyễn Ngọc · Đăng ngày: thg 2 25, 2026 · Thẻ: jwt, Java Developer
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả giải thích vì sao JWT hay được ca ngợi trong tutorial nhưng gây đau đầu khi lên production: bản chất của JWT, khái niệm stateless bị hiểu sai, và bài toán đăng xuất, thu hồi token.

## Ý chính

- JWT chỉ là định dạng truyền thông tin có chữ ký, không phải công cụ xác thực hoàn chỉnh. Payload chỉ được mã hóa Base64, ai cầm token cũng đọc được, nên đừng nhét dữ liệu nhạy cảm vào.
- Chữ ký giúp server kiểm tra token bằng khóa bí mật mà không cần truy vấn database. Đó là điểm mạnh nhất, nhưng cũng là lý do token không thể bị thu hồi.
- Đăng xuất bằng JWT thực chất chỉ là xóa token phía client. Token cũ vẫn hợp lệ đến khi hết hạn, nên khóa tài khoản khẩn cấp gần như bất lực.
- Chữa cháy đều có giá: token sống ngắn làm trải nghiệm tệ, danh sách đen trên Redis đưa hệ thống về stateful.
- Access token ngắn kèm refresh token dài ổn về trải nghiệm, nhưng refresh token vẫn phải lưu phía server để thu hồi.
- Khuyến nghị: refresh token trong cookie HttpOnly, Secure, SameSite Strict; access token giữ trong bộ nhớ để giảm rủi ro XSS và CSRF.

## Kinh nghiệm rút ra

Trước khi chọn JWT, hãy hỏi mình có cần thu hồi quyền ngay không; nếu có, session phía server có thể đơn giản và an toàn hơn. Nếu vẫn dùng JWT, thiết kế sẵn vòng đời refresh token. Chủ đề thuộc mảng Security của KemTech, tiếp nối bài SQL Injection.

## Đọc bản gốc

[Lột trần sự thật về JWT (Phần 1)](https://viblo.asia/p/lot-tran-su-that-ve-jwt-phan-1-cu-lua-stateless-va-noi-dau-dang-xuat-pPLkNB9eJRZ)

**Tóm tắt:**
- JWT được ký chứ không được mã mật, payload ai cũng đọc được.
- Stateless khiến việc đăng xuất và thu hồi token trở nên khó.
- Dùng access token ngắn, refresh token trong cookie HttpOnly.

