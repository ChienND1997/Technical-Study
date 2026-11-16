# Câu hỏi phỏng vấn: Redis & Hệ thống Cache

## 1. Khóa phân tán với Redis (Distributed Lock)

**Câu hỏi:** Làm sao để cài đặt Khóa phân tán (Distributed Lock) an toàn bằng lệnh `SET` trong Redis? Tại sao không được dùng lệnh `SETNX` kết hợp với lệnh `EXPIRE` riêng biệt?

**Đáp án ngắn:** Phải dùng lệnh đơn nguyên tử: `SET lock_key unique_value NX PX 30000`. Nếu tách `SETNX` và `EXPIRE` thành 2 lệnh rời nhau, hệ thống có thể bị crash ngay sau lệnh `SETNX`, khiến key không bao giờ có hạn sử dụng và gây ra Deadlock vĩnh viễn.

**Gợi ý suy luận:** Tính nguyên tử (Atomicity) -> Sự cố crash giữa 2 lệnh -> Deadlock -> Giá trị ngẫu nhiên `unique_value` để tránh xóa nhầm lock của tiến trình khác.

**Lập luận:** Có 2 nguyên tắc sống còn khi làm Distributed Lock với Redis:
1. **Tính nguyên tử khi chiếm khóa**: Lệnh `SET key val NX PX 30000` đảm bảo chỉ tạo key nếu chưa có (`NX`) và gán hạn sử dụng 30 giây (`PX`) trong cùng 1 chu kỳ CPU của Redis. Không thể bị ngắt quãng giữa chừng.
2. **Tính an toàn khi giải phóng khóa**: Giá trị `unique_value` (thường là UUID + Thread ID) đảm bảo khi tiến trình A chạy quá 30s (lock tự hết hạn), tiến trình B chiếm được lock mới; lúc này tiến trình A chạy xong không được phép tự tiện xóa lock vì sẽ xóa nhầm lock của B! Giải phóng khóa bắt buộc phải dùng script Lua để kiểm tra: `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`.

**Nhớ:** Khóa bằng `SET key uuid NX PX ttl` (nguyên tử); Mở khóa bằng Lua script so sánh đúng UUID trước khi DEL.

## 2. Chiến lược Cache-Aside và Đồng bộ dữ liệu

**Câu hỏi:** Trong mô hình Cache-Aside, khi cập nhật dữ liệu, ta nên "Cập nhật Database rồi Xóa Cache" hay "Cập nhật Database rồi Cập nhật luôn Cache"?

**Đáp án ngắn:** Nên chọn "Cập nhật Database rồi Xóa Cache" (Cache Invalidation). Việc cập nhật trực tiếp cache dễ gây bất đồng bộ do tranh chấp thứ tự ghi (Race condition) và lãng phí tài nguyên nếu dữ liệu ít khi được đọc lại.

**Gợi ý suy luận:** Race condition khi 2 luồng cùng ghi -> Đọc nhiều ghi ít (Lazy loading) -> Xóa cache để lần đọc sau tự nạp lại bản mới nhất.

**Lập luận:** Giả sử Luồng 1 và Luồng 2 cùng cập nhật dữ liệu: Luồng 1 ghi DB trước, Luồng 2 ghi DB sau. Nhưng do độ trễ mạng, Luồng 2 ghi đè Cache trước, rồi Luồng 1 mới ghi đè Cache sau cùng. Kết quả: Database lưu giá trị của Luồng 2 nhưng Cache lại lưu giá trị cũ của Luồng 1 -> Sai lệch vĩnh viễn! Bằng cách Xóa Cache (`DELETE cache_key`), lần đọc tiếp theo gặp Cache Miss sẽ tự động vào Database lấy dữ liệu chuẩn xác nhất nạp lại vào cache (Lazy Load), vừa an toàn vừa tránh tính toán cache cho những bản ghi ít người xem.

**Nhớ:** Quy tắc vàng Cache-Aside: Ghi Database trước -> Xóa Cache sau (Update DB then Evict Cache).

