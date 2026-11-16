# Câu hỏi phỏng vấn: System Design & Thiết kế Hệ thống Lớn

## 1. Thiết kế Hệ thống Rút gọn URL (TinyURL / URL Shortener)

**Câu hỏi:** Thiết kế hệ thống rút gọn URL (tương tự bit.ly, tinyurl) phục vụ hàng tỷ liên kết. Làm thế nào để sinh ra chuỗi mã ngắn duy nhất (6-7 ký tự) mà không bị đụng độ (Collision) khi hệ thống chạy phân tán trên nhiều máy chủ?

**Đáp án ngắn:** Sử dụng Mã hóa Base62 (`[0-9a-zA-Z]`) kết hợp với Bộ sinh ID số nguyên tăng dần duy nhất phân tán (Distributed Unique ID Generator như Twitter Snowflake hoặc Ticket Server trong Redis); chuyển đổi số nguyên ID duy nhất đó sang chuỗi Base62.

**Gợi ý suy luận:** Không gian biểu diễn: 62^7 ≈ 3.5 nghìn tỷ liên kết -> MD5/SHA256 dễ bị đụng độ khi cắt ngắn -> Dùng số nguyên ID duy nhất chuyển sang Base62 đảm bảo 0% đụng độ.

**Lập luận:**
1. **Không gian địa chỉ**: Bộ ký tự Base62 gồm 10 chữ số, 26 chữ thường, 26 chữ hoa (`10 + 26 + 26 = 62`). Chuỗi 7 ký tự biểu diễn được `62^7 ≈ 3.521 tỷ` URL ngắn, thừa sức dùng trong 50 năm.
2. **Tại sao không băm MD5/SHA256 rồi cắt ngắn**: Băm MD5 ra 128 bit; nếu cắt lấy 7 ký tự đầu, do nguyên lý chuồng bồ câu (Pigeonhole Principle), xác suất đụng độ cực lớn. Nếu phát hiện đụng độ rồi cộng chuỗi phụ để băm lại thì rất tốn kém truy vấn database.
3. **Giải pháp tối ưu**: Hệ thống dùng cụm sinh ID số nguyên phân tán (Snowflake ID): mỗi URL mới nhận 1 ID duy nhất toàn cầu (ví dụ ID = `1253093870`). Đổi số nguyên này sang hệ số 62 (thuật toán chia lấy dư tương tự đổi số sang nhị phân) ra chuỗi ngắn duy nhất: `"aZ9b1c"`. Đảm bảo 100% không bao giờ đụng độ và không cần kiểm tra lại DB.

**Nhớ:** TinyURL: Sinh số nguyên duy nhất (Snowflake ID) -> Chuyển sang Base62 (62^7 = 3.5 nghìn tỷ mã) -> 100% không bao giờ đụng độ (Zero collision).

## 2. Thiết kế Cơ chế Idempotency cho API Thanh toán

**Câu hỏi:** Làm thế nào để thiết kế một API Thanh toán (Payment API) đạt tính Lũy đao (Idempotent), đảm bảo khách hàng bấm nút "Thanh toán" nhiều lần hoặc mạng chập chờn gửi lại request (Retry) thì tài khoản chỉ bị trừ tiền đúng 1 lần duy nhất?

**Đáp án ngắn:** Sử dụng Khóa lũy đao (Idempotency Key): Client sinh một mã UUID duy nhất gắn vào Header `Idempotency-Key` của request; Server dùng Redis kiểm tra và chiếm khóa (Atomic Lock). Nếu key đã tồn tại và đang xử lý -> trả về trạng thái đang chờ; nếu đã hoàn tất -> trả về ngay kết quả đã lưu trong cache mà không thực thi trừ tiền lần 2.

**Gợi ý suy luận:** Mạng chập chờn (Network timeout) -> Client retry -> Server nhận request trùng -> Cần định danh duy nhất cho mỗi giao dịch logic.

**Lập luận:**
1. Client sinh `Idempotency-Key = UUID` khi mở màn hình thanh toán.
2. Request gửi lên kèm header `Idempotency-Key: e8b5...`.
3. Server thực hiện lệnh nguyên tử `SET lock:idempotency:e8b5 "PROCESSING" NX EX 120` trên Redis:
   - Nếu trả về `0` (Key đã tồn tại): Kiểm tra trạng thái trong DB/Redis. Nếu trạng thái là `COMPLETED`, lấy ngay kết quả cũ (Response body và HTTP status) trả về cho Client. Khách hàng thấy thành công mà thẻ không bị quẹt lần 2!
   - Nếu trả về `1` (Khóa thành công): Server tiến hành trừ tiền thẻ ngân hàng trong Transaction DB, ghi nhận kết quả, cập nhật cache `lock:idempotency:e8b5` thành `COMPLETED` kèm kết quả giao dịch.

**Nhớ:** Idempotency Key (UUID) ở Header + Redis Distributed Lock (SET NX) + Lưu trữ kết quả đã xử lý để trả về tức thì khi bị retry.

