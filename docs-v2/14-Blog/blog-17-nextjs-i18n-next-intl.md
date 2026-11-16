# Tích hợp đa ngôn ngữ vào Next.js (App Router)

> Nguồn: [Viblo](https://viblo.asia/p/tich-hop-da-ngon-ngu-vao-nextjs-app-router-1j4lQPwdJwl) · Tác giả: sorry i like you (Nhatdeeptry) · Đăng ngày: thg 5 6 (2026) · Thẻ: I18n, nextjs, TypeScript, frontend
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài hướng dẫn cách thêm đa ngôn ngữ (i18n) cho dự án Next.js dùng App Router bằng thư viện next-intl. Tác giả dựa trên tài liệu chính thức, đi từ cấu hình tối giản đến cấu hình sẵn sàng cho production, rồi bổ sung các tình huống thường gặp và những lỗi hay mắc.

## Ý chính

- Có hai hướng: cấu hình đơn giản, đổi ngôn ngữ qua cookie và URL không có tiền tố; hoặc cấu hình routing theo locale với đường dẫn dạng /en/... và /vi/..., tốt hơn cho SEO.
- Bản dịch lưu trong các file JSON theo từng ngôn ngữ; bắt buộc phải bọc cấu hình Next.js bằng plugin của next-intl thì type safety và tích hợp Server Components mới hoạt động.
- Server Component dùng hàm bất đồng bộ để lấy bản dịch, còn Client Component dùng hook; locale được cung cấp cho từng request qua một file cấu hình riêng.
- Với routing, cần khai báo danh sách locale, một middleware (đổi tên thành proxy từ Next.js 16), phân đoạn thư mục [locale] và các tiện ích điều hướng thay cho Link mặc định.
- Muốn trang được render tĩnh phải khai báo tham số tĩnh và gọi setRequestLocale ở cả layout lẫn page, trước các API khác của thư viện.
- Thư viện hỗ trợ ICU để xử lý biến và số nhiều, rich text chứa component, metadata theo locale và kiểm tra key dịch lúc biên dịch.

## Kinh nghiệm rút ra

Bài nhắc rằng i18n nên được quyết định từ đầu dự án, vì thêm sau sẽ kéo theo refactor lớn ở mọi chuỗi chữ và đường dẫn. Hãy chú ý các bẫy nhỏ như quên bọc plugin, gọi sai thứ tự setRequestLocale hay dùng nhầm Link. Việc khai báo kiểu cho key dịch rất đáng làm khi file ngôn ngữ phình to. Đây là kiến thức hữu ích cho mảng Frontend và TypeScript của KemTech.

## Đọc bản gốc

[Tích hợp đa ngôn ngữ vào Next.js (App Router)](https://viblo.asia/p/tich-hop-da-ngon-ngu-vao-nextjs-app-router-1j4lQPwdJwl)

**Tóm tắt:**
- Chọn cấu hình cookie cho nhanh, routing theo locale cho production.
- Server dùng hàm async, client dùng hook, điều hướng dùng tiện ích riêng.
- Render tĩnh cần setRequestLocale đúng thứ tự ở layout và page.

