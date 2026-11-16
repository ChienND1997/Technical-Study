# Giải phẫu Nginx, Reverse Proxy và nguyên lý Event-Driven

> Nguồn: [Viblo](https://viblo.asia/p/trai-tim-cua-moi-he-thong-backend-giai-phau-nginx-reverse-proxy-va-nguyen-ly-event-driven-AY4qQdxw4Pw) · Tác giả: Huy Hoàng · Đăng ngày: 13/05/2026 · Thẻ: Backend, DevOps, nginx
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả giải thích vì sao Nginx được nhiều hệ thống lớn tin dùng, không chỉ như một web server mà còn là reverse proxy. Bài đi từ bài toán C10K, kiến trúc hướng sự kiện, đến việc đọc hiểu một cấu hình Nginx cho ứng dụng Laravel và vài tinh chỉnh hiệu năng thường bị bỏ qua.

## Ý chính

- Bài toán C10K hỏi làm sao phục vụ mười nghìn kết nối đồng thời. Apache cũ dùng mô hình mỗi request một luồng nên ngốn RAM và dễ quá tải.
- Nginx ra đời năm 2004 với kiến trúc bất đồng bộ hướng sự kiện: một worker xử lý hàng nghìn kết nối bằng event loop, không đứng chờ từng kết nối, nên tốn rất ít bộ nhớ.
- Là reverse proxy, Nginx đứng ở cổng 80/443 và chuyển request tới các ứng dụng chạy ở cổng nội bộ khác nhau; người dùng chỉ thấy một tên miền, không thấy kiến trúc bên trong.
- Với Laravel, chỉ thị try_files thử lần lượt file tĩnh, thư mục, rồi chuyển phần còn lại cho index.php để framework tự định tuyến; thiếu nó sẽ báo 404.
- Nén gzip giúp giảm băng thông của CSS, JS, JSON.
- Lỗi 413 khi upload thường do giới hạn kích thước body của Nginx, dù PHP đã cho phép; ngoài ra có thể đặt thời gian cache dài cho ảnh và tài nguyên tĩnh ở trình duyệt.

## Kinh nghiệm rút ra

Đừng sao chép cấu hình mà không hiểu từng chỉ thị; khi gặp lỗi 404, 413 hay 502, hãy xác định lớp nào chặn request trước tiên. Giới hạn ở Nginx và ở ứng dụng phải khớp nhau. Nội dung nối trực tiếp với mảng DevOps và Network của KemTech, ví dụ reverse proxy, cân bằng tải và kết thúc TLS.

## Đọc bản gốc

[Giải phẫu Nginx, Reverse Proxy và nguyên lý Event-Driven](https://viblo.asia/p/trai-tim-cua-moi-he-thong-backend-giai-phau-nginx-reverse-proxy-va-nguyen-ly-event-driven-AY4qQdxw4Pw)

**Tóm tắt:**
- Nginx dùng event loop nên gánh nhiều kết nối với ít RAM.
- Reverse proxy che các ứng dụng nội bộ sau một tên miền.
- Hiểu try_files, gzip, giới hạn upload và cache giúp tránh lỗi phổ biến.

