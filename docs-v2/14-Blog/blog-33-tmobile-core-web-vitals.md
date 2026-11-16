# T-Mobile giảm 42% LCP và tăng 60% tỷ lệ chuyển đổi bằng cách nào

> Nguồn: [web.dev Case Studies](https://web.dev/case-studies/t-mobile-case-study) · Tác giả: Lucas Miré, David Lee, Tee Yeow, Bill Dinger (Google/T-Mobile) · Đăng ngày: 19 thg 3, 2025 · Thẻ: hiệu năng web, Core Web Vitals, frontend, business impact
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Vấn đề quen thuộc ở nhiều công ty lớn: đội kỹ thuật biết hiệu năng web quan trọng, nhưng rất khó thuyết phục lãnh đạo ưu tiên ngân sách cho nó khi mọi chỉ số chỉ nằm trong báo cáo Lighthouse nội bộ, không ai thấy được tiền bạc liên quan. Case study của T-Mobile cho thấy cách họ biến chỉ số kỹ thuật (LCP — Largest Contentful Paint, thời gian hiển thị phần nội dung lớn nhất trên trang) thành con số doanh thu cụ thể, từ đó có được sự ủng hộ để làm một chiến dịch tối ưu kéo dài.

## Ý chính

- Lighthouse (đo trong phòng lab) và CrUX (dữ liệu tổng hợp công khai) đều chỉ cho một phần bức tranh. T-Mobile gắn thư viện mã nguồn mở `web-vitals` trực tiếp vào các trang của mình để thu thập dữ liệu thật từ người dùng thật (field data), rồi đổ vào hệ thống phân tích nội bộ.
- Họ vẽ biểu đồ cho thấy khi LCP tăng từ 2 giây lên 7 giây, tỷ lệ chuyển đổi giảm dần và tỷ lệ thoát trang tăng dần — và hiệu ứng này càng rõ sau mốc 2 giây. Từ đó họ ước tính thiệt hại doanh thu cho mỗi 100ms LCP tăng thêm, đủ thuyết phục để lập hẳn một nhóm liên phòng ban xử lý vấn đề này.
- Loạt thay đổi kỹ thuật khá đa dạng: cache và tái cấu trúc API sản phẩm/khuyến mãi qua CDN, cache tài sản tĩnh (JS, CSS) với cấu hình cache hợp lý hơn, nén ảnh và chuyển sang WebP cùng ảnh responsive, preload/prefetch tài nguyên quan trọng, preconnect tới các domain thiết yếu, và nâng cấp nền tảng quản lý nội dung (Adobe Experience Manager) lên bản mới.
- Để duy trì kết quả lâu dài, họ xây dashboard Looker Studio công khai cho toàn công ty xem chỉ số p75 LCP theo thời gian thực, kèm hệ thống cảnh báo tự động gửi email khi một nhóm trang vượt ngưỡng, và quy định các trang phải đạt điểm Lighthouse nhất định trước khi được launch.
- Kết quả công bố: LCP giảm 42%, số lượt than phiền về website giảm 20% (riêng than phiền về tốc độ giảm 34%), và tỷ lệ chuyển đổi của khách có ý định mua hàng tăng 60% so với cùng kỳ.

## Kinh nghiệm rút ra

Muốn một dự án tối ưu hiệu năng được đầu tư nghiêm túc, hãy quy đổi chỉ số kỹ thuật ra ngôn ngữ kinh doanh (doanh thu, tỷ lệ chuyển đổi) thay vì chỉ báo cáo con số Lighthouse. Đo bằng dữ liệu người dùng thật, đặt cảnh báo tự động, và biến việc theo dõi hiệu năng thành việc của cả tổ chức chứ không chỉ một đội. Chủ đề gần với Frontend-Core (Core Web Vitals, critical rendering path).

## Đọc bản gốc

[T-Mobile case study](https://web.dev/case-studies/t-mobile-case-study)

**Tóm tắt:**
- T-Mobile đo LCP bằng dữ liệu người dùng thật, không chỉ dựa vào Lighthouse.
- Quy đổi LCP ra thiệt hại doanh thu ước tính để thuyết phục lãnh đạo đầu tư.
- Tối ưu cache API/tài sản tĩnh, ảnh, preload/preconnect, và nâng cấp nền tảng CMS.
- Kết quả: LCP giảm 42%, than phiền giảm 20-34%, tỷ lệ chuyển đổi tăng 60%.
