# Câu hỏi phỏng vấn: Fullstack Architecture & Xuyên tầng

## 1. Thiết kế Xác thực JWT Refresh Token Rotation

**Câu hỏi:** Trình bày cơ chế "Refresh Token Rotation" (Xoay vòng Refresh Token). Kỹ thuật này phát hiện và vô hiệu hóa kẻ tấn công đánh cắp token như thế nào?

**Đáp án ngắn:** Mỗi khi Client dùng Refresh Token để xin cấp Access Token mới, Server lập tức hủy (revoke) Refresh Token cũ và phát hành một Refresh Token mới toanh. Nếu Server phát hiện một Refresh Token ĐÃ BỊ HỦY được sử dụng lại lần thứ 2, Server kết luận token đã bị đánh cắp và ngay lập tức thu hồi toàn bộ nhóm Token (Family) của phiên đăng nhập đó, buộc người dùng đăng nhập lại.

**Gợi ý suy luận:** Token bị đánh cắp -> Cả hacker và người dùng hợp lệ cùng dùng 1 token -> Kẻ nào gọi sau sẽ dùng trúng token đã bị rotate -> Phát hiện xâm nhập (Reuse Detection).

**Lập luận:**
1. Khi đăng nhập, Server cấp `AccessToken_1` (sống 15 phút) và `RefreshToken_1` (sống 7 ngày, thuộc Family ID `F_123`).
2. Sau 15 phút, Client gửi `RefreshToken_1` lên: Server sinh `AccessToken_2` + `RefreshToken_2`, đồng thời đánh dấu `RefreshToken_1` là ĐÃ DÙNG.
3. Nếu hacker trước đó đã nghe lén và có `RefreshToken_1`: Khi hacker mang `RefreshToken_1` lên gọi API, Server kiểm tra DB/Redis thấy `RefreshToken_1` đã nằm trong danh sách ĐÃ HỦY.
4. Server lập tức kích hoạt báo động: Vô hiệu hóa toàn bộ `Family F_123` (hủy luôn cả `RefreshToken_2` đang nằm trên máy người dùng thật). Cả hacker và người dùng đều bị đẩy ra màn hình đăng nhập. Hacker không thể duy trì phiên truy cập vĩnh viễn.

**Nhớ:** Refresh Token Rotation: Dùng 1 lần là hủy và sinh token mới; Phát hiện tái sử dụng (Reuse Detection) -> Hủy toàn bộ Family token của phiên đó.

## 2. Kiểm thử hợp đồng (Contract Testing với Pact)

**Câu hỏi:** Contract Testing (Kiểm thử hợp đồng) trong hệ thống Fullstack giải quyết điểm yếu gì của Mocking Unit Test và End-to-End (E2E) Test?

**Đáp án ngắn:** Khắc phục việc Unit Test dùng Mock dễ bị lỗi thời (Stale Mocks khi Backend đổi API mà FE test vẫn xanh); và khắc phục E2E Test chạy quá chậm, dễ chập chờn (Flaky) và tốn kém môi trường. Contract Test kiểm tra tự động xem phía Consumer (Frontend) và Provider (Backend) có hiểu chung một cấu trúc JSON/Header hay không mà không cần dựng toàn bộ hệ thống thật.

**Gợi ý suy luận:** Frontend mock API -> Backend đổi kiểu dữ liệu -> Unit test FE vẫn pass nhưng lên Production bị crash -> Cần kiểm thử cam kết hợp đồng.

**Lập luận:**
- Trong Unit Test Frontend: Lập trình viên thường mock: `api.getUser = () => ({ id: 1, name: "Alice" })`. Nếu Backend bất ngờ đổi `name` thành `fullName`, Unit Test FE vẫn chạy xanh lét vì mock đâu có đổi! Lên Production app lập tức vỡ giao diện.
- Trong Contract Testing: Phía Consumer (FE) ghi lại kỳ vọng vào file hợp đồng Pact JSON (`"tôi cần field 'name' là string"`). File này được chuyển sang pipeline của Backend: Backend chạy test thực tế trên controller của mình để chứng minh *"Tôi đáp ứng đúng hợp đồng của Consumer"*. Nếu Backend đổi trường mà chưa báo FE, build của Backend sẽ gãy ngay tại CI!

**Nhớ:** Contract Testing: Đảm bảo Frontend và Backend cùng khớp 1 thỏa thuận API (Schema + Status + Headers) độc lập tại CI, loại bỏ rủi ro vỡ API trên Production.

