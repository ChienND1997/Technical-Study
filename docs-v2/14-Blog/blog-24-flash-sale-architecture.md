# Kiến trúc Flash Sale: bán triệu đơn trong 1 giây mà không sập

> Nguồn: [Viblo](https://viblo.asia/p/bi-an-kien-truc-flash-sale-ban-hang-trieu-don-trong-1-giay-ma-khong-sap-he-thong-AY4qQkl54Pw) · Tác giả: Trạm Code · Đăng ngày: 22/07/2026 · Thẻ: message queue, Redis, System Design, flash sale
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Giả sử một món hàng giảm sâu chỉ có 100 suất nhưng hàng triệu người bấm mua cùng lúc. Bài phân tích cách thiết kế để chọn đúng 100 người, không bán lố, không làm sập hệ thống và vẫn phản hồi trong vài mili-giây, bằng cách chia nhiệm vụ cho CDN, Redis, hàng đợi tin nhắn và cơ sở dữ liệu.

## Ý chính

- Cách truyền thống là khóa dòng tồn kho trong giao dịch cơ sở dữ liệu. Với hàng triệu request, chúng xếp hàng chờ khóa, cạn connection pool và bị nghẽn do đọc ghi đĩa.
- Kho hàng của đợt sale được nạp trước vào Redis; mỗi lượt mua trừ một đơn vị bằng thao tác nguyên tử, nên không thể có chuyện bán quá số lượng, và hết hàng thì từ chối ngay.
- Sau khi giữ được suất, các việc nặng như tạo đơn, tính giảm giá, phí vận chuyển, gửi email được đẩy vào hàng đợi như Kafka hoặc RabbitMQ.
- Hàng đợi giúp cắt đỉnh tải vì worker xử lý với tốc độ vừa phải, đồng thời tách rời: database tạm ngừng thì tin nhắn vẫn nằm đó chờ xử lý.
- Phần lớn người dùng chỉ xem trang và đồng hồ đếm ngược, nên tài nguyên tĩnh nên phục vụ qua CDN; nút mua chỉ bật sau khi đồng bộ giờ chuẩn.
- Tại API Gateway cần giới hạn tần suất theo IP hoặc token để chặn bot và thao tác spam.

## Kinh nghiệm rút ra

Nguyên tắc cốt lõi là chặn áp lực ở lớp rẻ và nhanh nhất rồi mới đến lớp đắt. Cần tính trước trường hợp Redis và cơ sở dữ liệu lệch nhau, ví dụ người giữ suất nhưng không thanh toán, để có cơ chế hoàn trả. Bài thuộc mảng Hệ thống của KemTech và liên quan DevOps khi chuẩn bị tải, giám sát và mở rộng.

## Đọc bản gốc

[Bí ẩn kiến trúc Flash Sale: Bán hàng triệu đơn trong 1 giây mà không sập hệ thống](https://viblo.asia/p/bi-an-kien-truc-flash-sale-ban-hang-trieu-don-trong-1-giay-ma-khong-sap-he-thong-AY4qQkl54Pw)

**Tóm tắt:**
- Trừ tồn kho nguyên tử trong Redis để không bán lố.
- Hàng đợi cắt đỉnh tải và bảo vệ cơ sở dữ liệu.
- CDN và giới hạn tần suất chặn phần lớn lưu lượng thừa.

