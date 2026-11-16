# Tìm hiểu Ingress trong Kubernetes với NGINX Ingress

> Nguồn: [Viblo](https://viblo.asia/p/tim-hieu-ingress-trong-kubernetes-tu-ly-thuyet-den-thuc-hanh-voi-nginx-ingress-13VM9n30VY7) · Tác giả: Nguyen Duy Hieu · Đăng ngày: 31/12/2025 · Thẻ: DevOps, ingress, K8s, nginx
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài trả lời câu hỏi quen thuộc của người mới học Kubernetes: làm sao để người dùng bên ngoài truy cập được ứng dụng chạy trong cụm. Tác giả chỉ ra giới hạn của các loại Service, giới thiệu Ingress cùng Ingress Controller, rồi dựng bản demo nhỏ trên minikube với một frontend và một API được định tuyến theo đường dẫn.

## Ý chính

- ClusterIP chỉ dùng được trong nội bộ cụm; NodePort buộc người dùng nhớ cổng cao và chỉ hợp để thử nhanh.
- Loại LoadBalancer cấp một IP công khai cho mỗi service, tốn chi phí trên cloud và không định tuyến theo đường dẫn hay tên miền.
- Ingress đóng vai cổng vào duy nhất: một IP cho cả hệ thống, định tuyến theo domain hoặc path, quản lý TLS tập trung.
- Ingress tự nó chỉ là tập luật; Ingress Controller mới là thành phần lắng nghe cổng 80/443 và chuyển request tới đúng Service. Các lựa chọn phổ biến gồm NGINX, Traefik, HAProxy, Kong.
- Luồng đi của request là Controller, luật Ingress, Service rồi Pod; controller cũng có thể viết lại đường dẫn trước khi chuyển tiếp.
- Lỗi hay gặp: sai path gây 404, quên bật controller, lệch cổng Service, thiếu ánh xạ host, không dùng rewrite khi cần.

## Kinh nghiệm rút ra

Ingress đáng dùng khi có nhiều service cần công khai và muốn gom HTTPS một chỗ; với ứng dụng đơn lẻ hoặc thử tạm, port-forward hay NodePort là đủ. Khi gặp 404, hãy kiểm tra theo chuỗi controller, luật, service, pod. Chủ đề này thuộc mảng DevOps và Network của KemTech, liên quan tới reverse proxy và cân bằng tải.

## Đọc bản gốc

[Tìm hiểu Ingress trong Kubernetes: từ lý thuyết đến thực hành với NGINX Ingress](https://viblo.asia/p/tim-hieu-ingress-trong-kubernetes-tu-ly-thuyet-den-thuc-hanh-voi-nginx-ingress-13VM9n30VY7)

**Tóm tắt:**
- Ingress gom traffic ngoài vào một cổng, định tuyến theo domain hoặc path.
- Cần Ingress Controller thì luật Ingress mới có hiệu lực.
- Ứng dụng nhỏ hoặc thử nghiệm thì không cần Ingress.

