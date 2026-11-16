# Redis Lock là gì? Đồng bộ hóa dữ liệu trong hệ thống phân tán

> Nguồn: [Viblo](https://viblo.asia/p/redis-lock-la-gi-giai-phap-dong-bo-hoa-du-lieu-trong-he-thong-phan-tan-vbLbjpqmLnk) · Tác giả: Huy Hoàng · Đăng ngày: 30/08/2026 · Thẻ: Redis
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Khi nhiều server cùng chạm vào một tài nguyên chung, chẳng hạn hai người thanh toán cùng một đơn hoặc hai cron job quét cùng một bảng, khóa nằm trong bộ nhớ của từng máy không còn tác dụng. Tác giả giới thiệu khóa phân tán dựa trên Redis như một "trọng tài" chung cho mọi dịch vụ, giải thích nguyên lý, cách tạo khóa cơ bản và những bẫy thường gặp.

## Ý chính

- Redis xử lý lệnh tuần tự trên dữ liệu nằm trong RAM nên rất hợp để làm điểm cấp khóa duy nhất cho nhiều service độc lập.
- Một khóa đúng chuẩn cần ba tính chất: chỉ một bên giữ khóa tại một thời điểm, có thời gian sống để tự hết hạn, và gắn mã định danh ngẫu nhiên của người giữ.
- Thời gian sống giúp tránh deadlock khi client sập giữa chừng; mã định danh giúp tránh việc xóa nhầm khóa của người khác sau khi khóa mình đã hết hạn.
- Cách tạo khóa cơ bản là ghi một khóa chỉ khi nó chưa tồn tại kèm thời gian hết hạn; nếu thành công thì xử lý nghiệp vụ rồi trả khóa, nếu thất bại thì thử lại hoặc báo lỗi.
- Bẫy thứ nhất: công việc chạy lâu hơn thời gian sống khiến khóa bị nhả sớm, hai tiến trình chạy song song. Cần chọn thời gian hợp lý hoặc cơ chế tự gia hạn.
- Bẫy thứ hai: một instance Redis duy nhất là điểm lỗi đơn; hệ thống yêu cầu sẵn sàng cao nên dùng cụm hoặc thuật toán Redlock trên nhiều cụm độc lập.

## Kinh nghiệm rút ra

Khóa phân tán chỉ là lớp bảo vệ bổ sung; với dữ liệu quan trọng như tiền bạc vẫn nên có ràng buộc ở tầng cơ sở dữ liệu để chặn trùng lặp. Khi thiết kế, hãy ước lượng thời gian xử lý tối đa trước khi đặt thời gian sống. Chủ đề này gắn với mảng Hệ thống và DevOps của KemTech, nơi cần theo dõi độ sẵn sàng của chính Redis.

## Đọc bản gốc

[REDIS LOCK LÀ GÌ? GIẢI PHÁP ĐỒNG BỘ HÓA DỮ LIỆU TRONG HỆ THỐNG PHÂN TÁN](https://viblo.asia/p/redis-lock-la-gi-giai-phap-dong-bo-hoa-du-lieu-trong-he-thong-phan-tan-vbLbjpqmLnk)

**Tóm tắt:**
- Redis làm trọng tài cấp khóa cho nhiều service cùng truy cập tài nguyên.
- Khóa cần hết hạn tự động và mã định danh chủ sở hữu.
- Coi chừng tác vụ chạy lâu hơn thời gian sống và Redis đơn lẻ.

