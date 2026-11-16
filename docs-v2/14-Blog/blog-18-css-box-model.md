# Khám phá mô hình hộp CSS: Nền tảng cho bố cục web

> Nguồn: [Viblo](https://viblo.asia/p/kham-pha-mo-hinh-hop-css-nen-tang-cho-bo-cuc-web-EbNVQAjRVvR) · Tác giả: Gung Typical · Đăng ngày: thg 10 1, 2024 · Thẻ: CSS, development
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài giải thích mô hình hộp (box model), khái niệm nền tảng quyết định cách trình duyệt tính kích thước và khoảng cách của mọi phần tử HTML. Tác giả đi qua bốn lớp cấu thành, thuộc tính box-sizing và lý do việc hiểu rõ mô hình này giúp bố cục ổn định hơn.

## Ý chính

- Mỗi phần tử là một hình chữ nhật gồm bốn lớp từ trong ra ngoài: nội dung, phần đệm (padding), viền (border) và lề (margin).
- Vùng nội dung chứa chữ, ảnh hoặc phần tử con và được chỉnh bằng width, height; padding là khoảng trống bên trong viền; margin là khoảng cách tới các phần tử xung quanh.
- Mặc định, width và height chỉ áp dụng cho vùng nội dung, nên thêm padding hoặc viền sẽ làm tổng kích thước lớn hơn con số đã khai báo.
- Giá trị border-box tính cả padding và viền vào width và height, nhờ đó định cỡ phần tử dễ đoán hơn và ít vỡ layout.
- Hiểu mô hình hộp giúp giữ bố cục nhất quán, quản lý khoảng cách khi làm responsive, dò lỗi tràn khung hoặc khoảng cách lạ, và viết CSS gọn hơn.

## Kinh nghiệm rút ra

Đây là kiến thức nhập môn nhưng là nguồn gốc của rất nhiều lỗi giao diện khó hiểu. Khi một phần tử không khớp kích thước mong đợi, hãy mở DevTools xem sơ đồ hộp trước khi sửa mò. Nhiều dự án đặt border-box cho toàn bộ phần tử ngay từ đầu để tránh phải cộng trừ thủ công, nhưng cần nhớ rằng margin vẫn nằm ngoài kích thước và có thể gộp (collapse) theo chiều dọc. Chủ đề này thuộc nhóm kiến thức cơ bản của Frontend trong KemTech, đứng trước Flexbox và Grid.

## Đọc bản gốc

[Khám phá mô hình hộp CSS: Nền tảng cho bố cục web](https://viblo.asia/p/kham-pha-mo-hinh-hop-css-nen-tang-cho-bo-cuc-web-EbNVQAjRVvR)

**Tóm tắt:**
- Mỗi phần tử gồm nội dung, padding, viền và margin.
- Mặc định kích thước chỉ tính vùng nội dung.
- Border-box gộp padding và viền vào kích thước, giúp bố cục dễ đoán.

