# Câu hỏi phỏng vấn: Frontend Core & Hiệu năng Web

## 1. Trình duyệt Render trang web (Critical Rendering Path)

**Câu hỏi:** Trình duyệt làm những bước gì từ khi nhận file HTML thô cho đến khi hiển thị các điểm ảnh (Pixel) lên màn hình? Phân biệt Reflow (Layout) và Repaint?

**Đáp an ngắn:** Trình duyệt chuyển HTML -> DOM Tree, CSS -> CSSOM Tree; kết hợp lại thành Render Tree; tính toán hình học (Layout/Reflow); vẽ màu sắc (Paint/Repaint); và tổng hợp các lớp (Composite). Reflow xảy ra khi kích thước/vị trí hình học thay đổi (tốn kém CPU nhất); Repaint xảy ra khi chỉ có màu sắc/giao diện thay đổi mà không ảnh hưởng hình học.

**Gợi ý suy luận:** HTML Parser -> DOM + CSSOM -> Render Tree -> Layout (Kích thước, vị trí) -> Paint (Màu, viền, bóng) -> GPU Compositing.

**Lập luận:** 
- **Reflow**: Khi bạn thay đổi `width`, `height`, `margin`, `padding`, `display`, hoặc đọc các thuộc tính như `offsetHeight`, `scrollTop` -> Trình duyệt bắt buộc phải tính toán lại kích thước và vị trí của phần tử đó VÀ toàn bộ các phần tử cha con xung quanh nó. Đây là tác vụ gây giật lag (jank) khung hình nặng nhất.
- **Repaint**: Khi thay đổi `color`, `background-color`, `visibility` -> Hình học không đổi, chỉ cần tô lại màu.
- **Tối ưu hóa**: Luôn ưu tiên dùng các thuộc tính CSS được xử lý trực tiếp trên GPU Compositor như `transform` (`translate3d`) và `opacity`. Chúng bỏ qua cả Reflow lẫn Repaint, giúp animation đạt 60fps mượt mà.

**Nhớ:** DOM + CSSOM -> Render Tree -> Layout/Reflow (hình học) -> Paint (màu sắc) -> Composite (GPU). Dùng `transform` & `opacity` để tránh Reflow.

## 2. Kỹ thuật Debounce và Throttle

**Câu hỏi:** Phân biệt cơ chế và trường hợp sử dụng thực tế của Debounce và Throttle trong xử lý sự kiện JavaScript?

**Đáp án ngắn:** Debounce trì hoãn thực thi hàm cho đến khi người dùng NGỪNG TƯƠNG TÁC trong một khoảng thời gian nhất định (thích hợp cho ô Search Auto-complete); còn Throttle đảm bảo hàm chỉ được thực thi TỐI ĐA 1 LẦN trong mỗi khoảng thời gian đều đặn (thích hợp cho sự kiện Scroll, Resize, kéo chuột).

**Gợi ý suy luận:** Debounce: Reset timer sau mỗi thao tác -> Chỉ chạy cú chót; Throttle: Khóa lại trong interval -> Chạy định kỳ đều đặn.

**Lập luận:**
- **Debounce**: Giả sử `delay = 300ms`. Người dùng gõ "r", "e", "a", "c", "t" liên tục; mỗi phím bấm sẽ hủy timer cũ và tạo timer mới. Chỉ khi người dùng dừng gõ quá 300ms, hàm gọi API tìm kiếm mới được kích hoạt 1 lần duy nhất, tránh gửi 5 request thừa thãi.
- **Throttle**: Giả sử `interval = 100ms`. Khi người dùng cuộn chuột (Scroll) liên tục sinh ra hàng trăm event mỗi giây; Throttle đảm bảo hàm tính toán vị trí chỉ được kích hoạt mỗi 100ms một lần, giảm tải 90% cho CPU mà giao diện vẫn mượt mà.

**Nhớ:** Debounce: Chờ ngưng thao tác mới chạy (Search input, Form validation); Throttle: Chạy định kỳ tối đa 1 lần/khoảng thời gian (Scroll, Resize).

