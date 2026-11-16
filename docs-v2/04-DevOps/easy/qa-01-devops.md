# Câu hỏi phỏng vấn: DevOps, Docker & CI/CD

## 1. Vòng đời Container và Cơ chế Caching

**Câu hỏi:** Thứ tự các chỉ thị trong Dockerfile ảnh hưởng thế nào đến tốc độ build image (Build Cache)? Làm sao tối ưu thứ tự?

**Đáp án ngắn:** Docker cache theo từng layer từ trên xuống dưới; nếu một layer thay đổi (như code nguồn), tất cả layer phía sau bắt buộc phải build lại từ đầu. Tối ưu bằng cách đặt các file ít thay đổi (file cấu hình dependency `package.json`, `pom.xml`) lên trước để tải thư viện, sau đó mới `COPY` code nghiệp vụ vào sau.

**Gợi ý suy luận:** Layer caching -> Tần suất thay đổi: Dependencies (thấp) vs Business Code (cao) -> Giữ cache cho bước tải thư viện nặng.

**Lập luận:** Khi Docker build, nó so sánh checksum của các dòng lệnh và file được copy. Nếu bạn viết `COPY . .` trước `npm install`, mỗi lần sửa 1 dòng code, lệnh `COPY . .` bị vô hiệu hóa cache, kéo theo lệnh `npm install` phải tải lại hàng nghìn package từ internet, làm build mất 5-10 phút. Nếu tách thành: 1) `COPY package*.json ./`, 2) `RUN npm install`, 3) `COPY . .`, thì khi sửa code, Docker tái sử dụng 100% cache của bước tải thư viện và build xong chỉ trong 5 giây.

**Nhớ:** Đặt layer ít đổi (Dependencies/Configs) lên trước, layer hay đổi (Source Code) ra sau cùng để tận dụng Docker layer cache.

## 2. Chiến lược triển khai Blue-Green vs Canary

**Câu hỏi:** Phân biệt chiến lược triển khai Blue-Green Deployment và Canary Deployment trong môi trường Production?

**Đáp án ngắn:** Blue-Green duy trì 2 môi trường giống hệt nhau và chuyển đổi 100% lượng truy cập tức thì (Zero-downtime, rollback tức thì); còn Canary chuyển dần dần một tỷ lệ nhỏ traffic (ví dụ 5%) sang phiên bản mới để kiểm tra lỗi thực tế trước khi tăng dần lên 100%.

**Gợi ý suy luận:** Tốc độ chuyển đổi & Rủi ro -> Blue-Green: All-or-nothing (tốn gấp đôi tài nguyên) -> Canary: Thử nghiệm thực tế theo tỷ lệ nhỏ (tiết kiệm tài nguyên, kiểm soát rủi ro).

**Lập luận:** Blue-Green đảm bảo không có downtime và rollback cực nhanh (chỉ cần trỏ lại Load Balancer về môi trường cũ nếu có lỗi). Tuy nhiên chi phí hạ tầng cao vì phải chạy song song 2 cụm máy chủ đủ tải 100%. Canary lại cực kỳ mạnh mẽ cho các hệ thống lớn (Facebook, Netflix): chỉ 2-5% người dùng tiếp cận bản mới, kết hợp giám sát metric (error rate, latency) tự động; nếu phát sinh lỗi thì chỉ ảnh hưởng 5% user đó và pipeline tự động hủy deploy mà không ảnh hưởng 95% còn lại.

**Nhớ:** Blue-Green: Chuyển 100% ngay qua Load Balancer, tốn tài nguyên; Canary: Chuyển theo tỷ lệ phần trăm (5% -> 25% -> 100%) để dò lỗi an toàn.

