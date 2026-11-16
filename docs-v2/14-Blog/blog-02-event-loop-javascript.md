# Event loop trong Javascript, microtask, macrotask, Promise và các câu hỏi phỏng vấn phổ biến

> Nguồn: [Viblo](https://viblo.asia/p/event-loop-trong-javascript-microtask-macrotask-promise-va-cac-cau-hoi-phong-van-pho-bien-GyZJZjrbJjm) · Tác giả: Mai Trung Đức · Đăng ngày: Jul 13th, 2024 · Thẻ: JavaScript, EventLoop, Promise, Microtask
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài giải thích cách JavaScript, vốn chạy đơn luồng, vẫn xử lý được tác vụ bất đồng bộ nhờ event loop. Tác giả đi qua thứ tự chạy của code đồng bộ, microtask và macrotask, rồi áp dụng vào các câu hỏi phỏng vấn và bài toán chống treo giao diện.

## Ý chính

- Event loop liên tục lấy việc từ call stack; callback của setTimeout, setInterval hay sự kiện nằm ở hàng đợi macrotask, còn then/catch/finally của Promise và MutationObserver nằm ở hàng đợi microtask.
- Thứ tự ưu tiên là code đồng bộ, rồi toàn bộ microtask, sau đó trình duyệt mới render, cuối cùng mới tới một macrotask.
- Phần code sau từ khóa await được xem như microtask. Thân của hàm tạo Promise vẫn chạy đồng bộ.
- Một vòng lặp nặng chạy đồng bộ sẽ chặn main thread và làm trang đứng hình. Cách khắc phục là cắt công việc thành nhiều đợt nhỏ, nghỉ giữa các đợt bằng setTimeout để trình duyệt kịp vẽ lại và cập nhật tiến độ.
- Nếu dùng queueMicrotask để nối các đợt thì vẫn treo, vì microtask phải chạy hết trước khi render.
- Phần FAQ nhắc rằng setTimeout lồng nhau nhiều tầng hoặc ở tab không hoạt động bị trễ thêm, và với delay lớn hơn 0 thì trình duyệt tự đếm giờ rồi mới đẩy callback vào hàng đợi.

## Kinh nghiệm rút ra

Khi gặp thứ tự in log khó đoán, hãy phân loại từng dòng thành đồng bộ, microtask hay macrotask rồi xếp lại theo quy tắc trên. Ở thực tế, tránh tác vụ CPU nặng trên luồng chính, chia nhỏ hoặc chuyển sang worker; với Node.js, cùng cơ chế này giúp hiểu vì sao một đoạn xử lý đồng bộ dài làm cả server chậm. Chủ đề thuộc mảng JavaScript của KemTech.

## Đọc bản gốc

[Event loop trong Javascript, microtask, macrotask, Promise và các câu hỏi phỏng vấn phổ biến](https://viblo.asia/p/event-loop-trong-javascript-microtask-macrotask-promise-va-cac-cau-hoi-phong-van-pho-bien-GyZJZjrbJjm)

**Tóm tắt:**
- Thứ tự chạy: đồng bộ, microtask, render, rồi macrotask.
- Await đẩy phần code phía sau vào hàng đợi microtask.
- Chia nhỏ việc nặng bằng setTimeout để giao diện không bị treo.

