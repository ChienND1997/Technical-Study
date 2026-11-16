# React Server Components: component chạy trên server mà không tốn một byte bundle nào

> Nguồn: [React RFC #188](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md) · Tác giả: Sebastian Markbåge, cùng đội React (Andrew Clark, Dan Abramov, Joseph Savona) · Đăng ngày: khởi tạo 21 thg 12, 2020, merge 25 thg 10, 2022 · Thẻ: React, kiến trúc frontend, hiệu năng, Next.js
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

RFC chính thức giải thích lý do React tạo ra một loại component hoàn toàn mới: Server Component, chỉ chạy trên server, chạy một lần cho mỗi request, và không gửi một dòng code nào của chính nó xuống trình duyệt. Vấn đề nó nhắm tới: một thư viện render Markdown hay định dạng ngày tháng, nếu dùng trong component thông thường, sẽ bị đóng gói và tải xuống client dù người dùng chỉ cần xem kết quả tĩnh — RFC đưa ví dụ việc này có thể tốn hơn 240KB JS (hơn 74KB đã nén) chỉ cho một component ghi chú đơn giản.

## Ý chính

- Server Component được phép `await` trực tiếp vào database hay filesystem (`await db.notes.get(id)`), không cần đi qua REST hay GraphQL. Client Component (component thường, có `useState`, `useEffect`) thì vẫn chạy ở trình duyệt như trước, nhận dữ liệu qua props từ Server Component cha.
- Ranh giới được đánh dấu bằng chỉ thị `'use client'` ở đầu file — phiên bản sau này thay cho quy ước đặt tên file `.server.js`/`.client.js` ban đầu. Một file không khai báo gì được coi là "shared", chạy được ở cả hai phía nhưng bị giới hạn bởi quy tắc khắt khe nhất của cả hai (không state, không hiệu ứng, không truy cập dữ liệu server).
- Quy tắc cốt lõi, đúng như RFC viết: Client Component không thể import Server Component, Server Component không được dùng state hay API chỉ có ở trình duyệt, và Client Component chỉ được import Client Component khác. Có một ngoại lệ hay: một Server Component có thể được truyền làm children vào một Client Component (ví dụ `<ClientTabBar><ServerTabContent /></ClientTabBar>`), vì lúc đó cây con server đã được render sẵn thành dữ liệu rồi mới đưa vào.
- Khác với Server-Side Rendering (SSR) truyền thống: SSR chỉ render HTML tĩnh ban đầu của Client Component, trình duyệt vẫn phải tải và chạy lại toàn bộ code đó để hydrate. Server Component thì không tồn tại ở client dưới dạng code — chỉ có kết quả render (một dạng giống JSON, có "chỗ trống" để lấp khi Suspense còn đang chờ dữ liệu) được gửi xuống.
- Khi một phần dữ liệu cần cập nhật, toàn bộ cây Server Component được render lại từ gốc, nhưng React vẫn hợp nhất props mới vào các Client Component đang tồn tại, nên trạng thái như con trỏ đang gõ, animation hay focus không bị mất.

## Kinh nghiệm rút ra

Server Component không thay thế GraphQL/SSR, mà bổ sung một trục mới: cho phép đưa logic lấy dữ liệu và code chỉ-cần-chạy-một-lần hẳn ra khỏi bundle client, giảm tải CPU và dung lượng tải về đáng kể cho những phần không cần tương tác. Khi thiết kế một ứng dụng React/Next.js lớn, nên phân loại ngay từ đầu phần nào thực sự cần state/interactivity (Client) và phần nào chỉ hiển thị dữ liệu (Server). Chủ đề gần với React (SSR, RSC, Next.js) và Kiến trúc frontend.

## Đọc bản gốc

[RFC: React Server Components](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)

**Tóm tắt:**
- Server Component chạy trên server, không gửi code của nó xuống client, được phép truy cập dữ liệu server trực tiếp.
- Ranh giới Server/Client đánh dấu bằng chỉ thị `'use client'`; mặc định là "shared" nếu không khai báo.
- Khác SSR: SSR vẫn phải tải lại code Client Component để hydrate, Server Component thì không tồn tại dưới dạng code ở client.
- Cập nhật dữ liệu render lại cả cây Server Component từ gốc, nhưng vẫn giữ nguyên trạng thái của Client Component đang có.
