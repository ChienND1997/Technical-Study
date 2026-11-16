# Trắc nghiệm chuyên sâu: DevOps, Docker & CI/CD

## 1. Container hóa, Docker và Quy trình CI/CD

### Câu 1: Điểm khác biệt kiến trúc cốt lõi giữa Container (Docker) và Máy ảo (Virtual Machine - VM) là gì?
- [x] Container dùng chung Host OS Kernel và cô lập ứng dụng bằng cgroups & namespaces; trong khi VM yêu cầu Hypervisor riêng và mỗi máy ảo phải chạy một Guest OS độc lập.
- [ ] Container ảo hóa toàn bộ phần cứng vật lý qua Hypervisor Type-2; trong khi VM chia sẻ trực tiếp nhân hệ điều hành của máy chủ vật lý.
- [ ] Container chỉ chạy được các ứng dụng biên dịch nhị phân; trong khi VM bắt buộc phải chạy các ứng dụng thông dịch qua máy ảo JVM hoặc V8.
- [ ] Container không hỗ trợ giới hạn tài nguyên CPU và RAM; trong khi VM bắt buộc phải cấu hình cứng tài nguyên lúc khởi tạo phần cứng.

> **Giải thích:** Nhờ dùng chung Linux Kernel và tận dụng các tính năng cô lập sẵn có của nhân (Namespace cô lập PID/Network/MNT, Cgroups giới hạn CPU/RAM), container khởi động chỉ mất vài trăm mili-giây và tốn cực ít RAM so với việc phải khởi động cả một Guest OS nặng vài gigabyte trên VM.

### Câu 2: Lệnh nào trong Dockerfile có tác dụng tối ưu hóa kích thước image bằng kỹ thuật "Multi-stage builds"?
- [x] Khai báo nhiều câu lệnh `FROM ... AS builder` và chỉ copy các artifact đã build hoàn thiện sang image chạy cuối cùng bằng lệnh `COPY --from=builder`.
- [ ] Khai báo lệnh `RUN strip --strip-all` trên toàn bộ hệ thống file gốc của image nền tảng trong cùng một layer duy nhất.
- [ ] Sử dụng cờ nén zip trong lệnh `ADD` để giải nén source code trực tiếp vào thư mục đích của container.
- [ ] Gom toàn bộ các gói phụ thuộc runtime và SDK của môi trường phát triển vào một instruction `ENV` duy nhất.

> **Giải thích:** Multi-stage build cho phép giai đoạn 1 chứa đầy đủ SDK, Compiler, Maven/Gradle nặng hàng gigabyte để biên dịch code. Giai đoạn 2 chỉ dùng image siêu nhẹ (ví dụ `eclipse-temurin:21-jre-alpine` hoặc `distroless`) và `COPY --from=builder` duy nhất file `.jar`, giúp giảm kích thước image từ 1.5GB xuống dưới 150MB và giảm thiểu tối đa các lỗ hổng bảo mật.

### Câu 3: Khái niệm "Idempotence" (Tính lũy đẳng) trong Infrastructure as Code (IaC - như Ansible, Terraform) nghĩa là gì?
- [x] Dù thực thi mã khai báo hạ tầng bao nhiêu lần đi nữa, hệ thống đích vẫn luôn đạt đến cùng một trạng thái mong muốn (desired state) mà không gây ra tác dụng phụ hoặc nhân đôi tài nguyên.
- [ ] Hệ thống tự động phục hồi về trạng thái snapshot ban đầu mỗi khi có một tác vụ triển khai gặp lỗi timeout.
- [ ] Toàn bộ hạ tầng đám mây bắt buộc phải bị phá hủy và khởi tạo lại mới từ đầu mỗi khi pipeline CI/CD được kích hoạt.
- [ ] Tốc độ thực thi của script quản lý hạ tầng tỷ lệ thuận với số lượng tài nguyên máy chủ được cấu hình trong file manifest.

> **Giải thích:** Tính lũy đẳng (Idempotent) là nguyên tắc cốt lõi của IaC: Nếu server đã cài Nginx phiên bản 1.24 rồi, chạy lại script Ansible sẽ kiểm tra thấy trạng thái đã thỏa mãn và bỏ qua; chỉ khi trạng thái bị lệch (drift), công cụ mới can thiệp để đưa về đúng trạng thái khai báo.

### Câu 4: Trong Kubernetes, đối tượng (Object) nào đảm bảo luôn có một số lượng Pod nhất định đang chạy và tự động thay thế Pod bị sự cố?
- [x] `Deployment` (kết hợp với `ReplicaSet` để duy trì số lượng bản sao mong muốn).
- [ ] `Service` loại ClusterIP (định tuyến gói tin mạng thông qua bảng iptables hoặc IPVS).
- [ ] `ConfigMap` (lưu trữ các biến môi trường và file cấu hình dạng plain text).
- [ ] `Ingress Controller` (điều hướng lưu lượng HTTP bên ngoài vào các Service nội bộ).

> **Giải thích:** `Deployment` quản lý vòng đời khai báo của Pod thông qua `ReplicaSet`. Nó định nghĩa số lượng bản sao mong muốn (`replicas: 3`). Nếu một node gặp sự cố hoặc 1 Pod bị OOMKilled, Controller Manager sẽ tự động phát hiện và sinh Pod mới trên node khác để bù vào, đảm bảo tính sẵn sàng cao (High Availability).

### Câu 5: Trong Git, lệnh `git rebase` khác biệt gì so với `git merge` khi tích hợp nhánh tính năng vào nhánh main?
- [x] `git rebase` đặt các commit của nhánh hiện tại lên đỉnh của nhánh đích, tạo ra lịch sử commit tuyến tính thẳng hàng; còn `git merge` tạo một commit gộp (merge commit) nối hai nhánh và giữ nguyên các nhánh rẽ.
- [ ] `git rebase` xóa hoàn toàn các commit trung gian và chỉ giữ lại một commit duy nhất; còn `git merge` lưu lại toàn bộ các commit con.
- [ ] `git rebase` chỉ áp dụng được với các commit cục bộ chưa push lên remote repository; còn `git merge` chỉ chạy được trên server remote.
- [ ] `git merge` ghi đè toàn bộ thay đổi của nhánh đích bằng code của nhánh nguồn mà không cần giải quyết xung đột (conflict).

> **Giải thích:** `git rebase` tua lại nhánh hiện tại về gốc chung với nhánh đích, sau đó áp dụng tuần tự từng commit lên trên đỉnh nhánh đích. Ưu điểm là log git sạch và dễ đọc, nhưng lưu ý: Không bao giờ rebase trên các nhánh công khai (public/shared branches) vì việc viết lại commit hash sẽ gây xung đột cho các đồng nghiệp cùng làm việc trên nhánh đó.

### Câu 6: Trong Dockerfile, sự khác biệt căn bản giữa chỉ thị `ENTRYPOINT` và `CMD` là gì?
- [x] `ENTRYPOINT` định nghĩa tệp thực thi cố định mặc định của container; còn `CMD` định nghĩa các tham số mặc định truyền vào cho `ENTRYPOINT` và có thể bị ghi đè khi chạy lệnh `docker run <image> [params]`.
- [ ] `ENTRYPOINT` chạy trong quá trình build image trên máy host; còn `CMD` chỉ được kích hoạt khi container bị dừng lại.
- [ ] `ENTRYPOINT` chỉ hỗ trợ cú pháp dạng shell string; còn `CMD` bắt buộc phải sử dụng cú pháp JSON exec array.
- [ ] `ENTRYPOINT` thiết lập các biến môi trường hệ thống; còn `CMD` thiết lập thư mục làm việc mặc định của container.

> **Giải thích:** Cú pháp chuẩn kết hợp: `ENTRYPOINT ["java", "-jar", "app.jar"]` và `CMD ["--server.port=8080"]`. Khi người dùng chạy `docker run myapp --server.port=9090`, giá trị tham số mới sẽ ghi đè lên `CMD` và truyền vào `ENTRYPOINT`, giúp container cực kỳ linh hoạt và chuẩn hóa.

### Câu 7: Khác biệt giữa "Docker Volume" và "Bind Mount" trong việc quản lý dữ liệu bền vững (Persistence Storage) của container là gì?
- [x] Docker Volume được quản lý hoàn toàn bởi Docker bên trong thư mục hệ sinh thái (`/var/lib/docker/volumes/` trên Linux); còn Bind Mount gắn trực tiếp một đường dẫn thư mục cụ thể bất kỳ trên máy host vào container.
- [ ] Docker Volume lưu trữ dữ liệu trực tiếp trong bộ nhớ RAM tạm thời; còn Bind Mount lưu trữ dữ liệu vào hệ thống phân tán S3.
- [ ] Docker Volume sẽ tự động bị xóa sạch ngay khi container dừng lại; còn Bind Mount giữ lại dữ liệu vô thời hạn trên đĩa cứng.
- [ ] Docker Volume chỉ hỗ trợ chế độ chỉ đọc (read-only); còn Bind Mount bắt buộc phải cấp quyền đọc ghi đầy đủ cho tiến trình root.

> **Giải thích:** Docker Volume là cơ chế lưu trữ được khuyến nghị chính thức: An toàn, dễ sao lưu, di chuyển giữa các container, không phụ thuộc vào hệ điều hành host. Bind Mount phụ thuộc chặt chẽ vào cấu trúc đường dẫn host (thường dùng trong môi trường dev để hot-reload code từ máy tính vào container).

### Câu 8: Điểm khác biệt quan trọng giữa `Liveness Probe` và `Readiness Probe` trong Kubernetes là gì?
- [x] `Liveness Probe` kiểm tra xem container còn hoạt động không (nếu thất bại, Kubelet sẽ restart container); còn `Readiness Probe` kiểm tra xem Pod đã sẵn sàng phục vụ traffic chưa (nếu thất bại, Service tạm ngừng định tuyến traffic tới Pod mà không restart).
- [ ] `Liveness Probe` kiểm tra mức độ tiêu thụ RAM của tiến trình; còn `Readiness Probe` kiểm tra số lượng kết nối mạng socket đang mở của Pod.
- [ ] `Liveness Probe` chỉ chạy duy nhất một lần khi Pod khởi tạo; còn `Readiness Probe` chạy lặp lại định kỳ trong suốt vòng đời của container.
- [ ] `Liveness Probe` tự động cấp phát thêm CPU khi ứng dụng quá tải; còn `Readiness Probe` thực hiện scale giảm số lượng bản sao.

> **Giải thích:** 
- Khi ứng dụng bị Deadlock hoặc rò rỉ bộ nhớ kẹt luồng -> `Liveness Probe` thất bại -> K8s restart container để tự hồi phục.
- Khi ứng dụng đang khởi động (đang nạp cache, kết nối DB) hoặc đang bị quá tải CPU -> `Readiness Probe` báo chưa sẵn sàng -> K8s tạm thời ngắt Pod khỏi Load Balancer (Service), không đẩy request của khách hàng vào tránh nhận lỗi 502/503.

### Câu 9: Trong Kubernetes, loại Service nào sau đây chỉ cho phép giao tiếp nội bộ bên trong cụm cluster mà KHÔNG công khai ra internet?
- [x] `ClusterIP` (cấp một địa chỉ IP ảo nội bộ, chỉ có các Pod bên trong cluster mới truy cập được).
- [ ] `NodePort` (mở một cổng tĩnh trong dải 30000-32767 trên tất cả các Node vật lý của cụm).
- [ ] `LoadBalancer` (tự động tích hợp và cấp một cân bằng tải đám mây công khai của Cloud Provider).
- [ ] `ExternalName` (ánh xạ Service nội bộ sang một bản ghi CNAME DNS bên ngoài internet).

> **Giải thích:** 
- `ClusterIP` (mặc định): Cấp 1 địa chỉ IP ảo nội bộ trong cụm, chỉ các Pod trong cluster mới gọi được (thích hợp cho Database, Redis, Internal microservices).
- `NodePort`: Mở một cổng tĩnh (30000-32767) trên tất cả các Node vật lý.
- `LoadBalancer`: Tự động cấp một Cloud Load Balancer thực tế (AWS NLB/ALB, GCP LB) có IP công khai ra internet.

### Câu 10: Tín hiệu Linux (Signal) nào được gửi đầu tiên khi chạy lệnh `docker stop` hoặc khi Kubernetes chuẩn bị hủy một Pod để cho phép ứng dụng thực hiện "Graceful Shutdown"?
- [x] `SIGTERM` (Signal 15) - Cho ứng dụng thời gian hoàn tất các request đang xử lý dở dang và giải phóng tài nguyên trước khi hết thời gian chờ.
- [ ] `SIGKILL` (Signal 9) - Lập tức chấm dứt tiến trình ngay trên nhân Linux mà không cho phép ứng dụng can thiệp dọn dẹp.
- [ ] `SIGHUP` (Signal 1) - Thông báo tiến trình nạp lại các file cấu hình mà không làm gián đoạn các luồng thực thi hiện tại.
- [ ] `SIGINT` (Signal 2) - Ngắt tiến trình tương tác từ bàn phím tương đương với tổ hợp phím Ctrl+C trên terminal.

> **Giải thích:** Graceful Shutdown là tiêu chuẩn vàng của ứng dụng Cloud-native: Khi nhận `SIGTERM`, server ngưng nhận request mới, hoàn tất việc xử lý các request đang dở dang trong 10-20 giây, commit transaction DB rồi mới tắt tiến trình. Nếu sau `terminationGracePeriodSeconds` (mặc định 30s) mà tiến trình vẫn chưa tắt, hệ điều hành mới gửi `SIGKILL` (không thể chặn) để diệt hẳn tiến trình.

### Câu 11: Quyền phân quyền file Linux `chmod 755 filename` cấp quyền gì cho Chủ sở hữu (Owner), Nhóm (Group) và Người khác (Others)?
- [x] Owner có toàn quyền Đọc, Ghi, Thực thi (rwx - 7); Group và Others có quyền Đọc và Thực thi (r-x - 5).
- [ ] Owner có quyền Đọc và Ghi (rw- - 6); Group và Others có toàn quyền Đọc, Ghi, Thực thi (rwx - 7).
- [ ] Owner chỉ có quyền Thực thi (--x - 1); Group và Others có quyền Đọc và Ghi (rw- - 6).
- [ ] Cả ba đối tượng Owner, Group và Others đều chỉ có quyền Đọc và Thực thi (r-x - 5).

> **Giải thích:** Giá trị nhị phân của quyền: `r = 4`, `w = 2`, `x = 1`.
- `7 = 4 + 2 + 1` (rwx: Read + Write + Execute).
- `5 = 4 + 0 + 1` (r-x: Read + Execute).
- Do đó `755` nghĩa là: Người tạo file có thể sửa code và chạy script; đồng nghiệp và người ngoài chỉ được phép đọc và chạy file chứ không được phép sửa nội dung file.

### Câu 12: Ba trụ cột cốt lõi của Hệ thống Giám sát Toàn diện (The Three Pillars of Observability) trong DevOps là gì?
- [x] Logs (nhật ký sự kiện chi tiết), Metrics (chỉ số đo lường định lượng theo chuỗi thời gian) và Traces (dấu vết phân tán xuyên suốt các service).
- [ ] Continuous Integration, Continuous Delivery và Continuous Deployment.
- [ ] Infrastructure as Code, Configuration Management và Automated Provisioning.
- [ ] Unit Test, Integration Test và End-to-End Regression Test.

> **Giải thích:** 
- **Metrics** (Prometheus): Giúp phát hiện *"Hệ thống đang có vấn đề gì?"* (CPU tăng vọt, HTTP 500 spike).
- **Traces** (Jaeger, OpenTelemetry): Giúp xác định *"Vấn đề đang xảy ra ở microservice nào và tại hàm nào?"* (Theo dõi vòng đời request qua Trace ID và Span ID).
- **Logs** (ELK/Loki): Giúp trả lời *"Chi tiết cụ thể lỗi là gì?"* (Xem stack trace exception chi tiết của dòng log).

### Câu 13: Mô hình thu thập chỉ số (Metric Collection) mặc định của Prometheus hoạt động theo cơ chế nào?
- [x] Mô hình Kéo (Pull model): Prometheus Server định kỳ chủ động gửi request HTTP GET tới endpoint `/metrics` của các ứng dụng mục tiêu (Target Scrape).
- [ ] Mô hình Đẩy (Push model): Các ứng dụng chủ động mở kết nối TCP liên tục và gửi trực tiếp các gói tin metric tới Prometheus.
- [ ] Mô hình Hàng đợi (Queue model): Ứng dụng đẩy message vào Apache Kafka, sau đó Prometheus consumer đọc tuần tự từ partition.
- [ ] Mô hình Quét file (Log scraping): Prometheus đọc định kỳ từ các file text log lưu trên thư mục `/var/log` của hệ điều hành host.

> **Giải thích:** Prometheus nổi tiếng với cơ chế Pull: Nó chủ động kiểm soát tần suất scrape (ví dụ mỗi 15s kéo 1 lần), tránh tình trạng server giám sát bị sập do hàng ngàn ứng dụng đồng loạt "bắn" metric (Push) khi có sự cố. Đối với các tác vụ chạy ngắn hạn (Batch jobs / Cron jobs), Prometheus cung cấp thêm `Pushgateway` để nhận dữ liệu đẩy.

### Câu 14: Trong công cụ Terraform, file `terraform.tfstate` có vai trò sống còn nào?
- [x] Lưu trữ bản đồ ánh xạ (Mapping) giữa mã nguồn khai báo `.tf` với các tài nguyên thực tế đã tạo trên Cloud; mất file này Terraform không thể nhận diện được hạ tầng hiện hữu.
- [ ] Lưu trữ các thông tin biến bí mật (Secret Variables) dưới dạng mã hóa một chiều để phục vụ phân quyền CI/CD pipeline.
- [ ] Lưu lại lịch sử các câu lệnh shell được thực thi trên máy chủ ảo thông qua provisioner `remote-exec`.
- [ ] Chuyển đổi các định dạng template hạ tầng của AWS CloudFormation sang định dạng tương thích với Azure Resource Manager.

> **Giải thích:** State file là "bộ nhớ" của Terraform. Khi chạy `terraform plan`, Terraform so sánh mã `.tf` với file `.tfstate` và trạng thái thực tế trên Cloud để tính toán ra delta (thay đổi). Trong môi trường làm việc nhóm, `terraform.tfstate` bắt buộc phải lưu trên Remote Backend (như AWS S3) kết hợp DynamoDB để Khóa trạng thái (State Locking), tránh việc 2 người cùng chạy lệnh gây xung đột hạ tầng.

### Câu 15: Chiến lược phân nhánh "Trunk-Based Development" khác biệt gì so với "GitFlow" truyền thống?
- [x] Các lập trình viên thường xuyên merge các nhánh nhỏ có vòng đời ngắn (1-2 ngày) trực tiếp vào nhánh chính (Trunk/Main) và kết hợp Feature Flags; tránh tích tụ xung đột lớn (Merge Hell).
- [ ] Trunk-Based chỉ cho phép triển khai code lên môi trường production từ nhánh `hotfix`, tuyệt đối không triển khai từ `main`.
- [ ] GitFlow duy trì một nhánh duy nhất không phân nhánh con; còn Trunk-Based tạo ra hàng chục nhánh release chạy song song nhiều tháng.
- [ ] Trunk-Based yêu cầu đóng băng toàn bộ commit của toàn đội trong suốt thời gian diễn ra đợt kiểm thử Regression Testing.

> **Giải thích:** GitFlow duy trì nhiều nhánh sống lâu (develop, release, hotfix, feature hàng tháng trời), dẫn tới việc merge code cực kỳ đau đớn và chậm trễ. Trunk-Based (được áp dụng tại Google, Netflix, Meta) chủ trương: Mọi người tích hợp code liên tục vào `main` mỗi ngày, code chưa hoàn thiện được ẩn sau Feature Flags (cờ bật tắt tính năng), giúp pipeline CI/CD kiểm thử và deploy liên tục ra production.

### Câu 16: Lệnh Linux nào sau đây dùng để kiểm tra dung lượng ổ đĩa còn trống của toàn bộ các phân vùng hệ thống theo định dạng dễ đọc (Human-readable)?
- [x] `df -h`
- [ ] `du -sh *`
- [ ] `free -m`
- [ ] `iostat -xz 1`

> **Giải thích:** 
- `df -h` (Disk Free): Hiển thị tỷ lệ sử dụng dung lượng của các phân vùng ổ đĩa (`/`, `/var`, `/home`) dưới dạng GB/MB.
- `du -sh *` (Disk Usage): Hiển thị kích thước của từng thư mục cụ thể để tìm thư mục chiếm nhiều dung lượng.
- `free -m`: Kiểm tra dung lượng bộ nhớ RAM (Total, Used, Free, Cache).
- `iostat`: Kiểm tra hiệu năng đọc ghi I/O của thiết bị lưu trữ.

### Câu 17: Trong quy trình CI/CD, bước "Static Application Security Testing" (SAST - như SonarQube) được thực hiện ở giai đoạn nào?
- [x] Phân tích trực tiếp trên mã nguồn tĩnh trước khi ứng dụng được biên dịch hoặc đóng gói, giúp phát hiện sớm các lỗ hổng bảo mật, lỗi cú pháp và nợ kỹ thuật (Code Smells).
- [ ] Gửi các gói tin request độc hại vào endpoint HTTP của ứng dụng đang chạy thực tế trên môi trường Staging (DAST).
- [ ] Giám sát hành vi runtime của các tiến trình container đang chạy thực tế để phát hiện tấn công zero-day (RASP).
- [ ] Kiểm tra khả năng chịu tải của cụm máy chủ web thông qua việc mô phỏng hàng triệu người dùng đồng thời.

> **Giải thích:** SAST phân tích cây cú pháp trừu tượng (AST) của source code: Phát hiện các lỗi như hardcode password/secret key trong code, dùng hàm băm yếu (MD5), lỗi SQL Injection, biến chưa khởi tạo... Bắt lỗi bảo mật tại pha SAST (Shift-Left Security) tiết kiệm chi phí khắc phục gấp hàng chục lần so với khi lỗi đã lọt lên môi trường Production.

### Câu 18: Lệnh `git cherry-pick <commit-hash>` dùng để làm gì?
- [x] Sao chép và áp dụng duy nhất một commit cụ thể từ một nhánh khác sang nhánh hiện tại mà không cần phải merge toàn bộ lịch sử của nhánh đó.
- [ ] Gộp tất cả các commit trên nhánh tính năng thành một commit duy nhất trước khi tạo Pull Request vào nhánh chính.
- [ ] Hủy bỏ hoàn toàn các thay đổi của commit đó trên cây thư mục làm việc và đưa con trỏ HEAD về vị trí trước đó.
- [ ] So sánh sự sai khác chi tiết giữa commit được chỉ định và trạng thái hiện tại của Stage Index.

> **Giải thích:** Cực kỳ hữu ích trong xử lý Hotfix: Một lỗi nghiêm trọng trên nhánh `main` được đồng nghiệp sửa trên nhánh `develop` tại commit `abc1234`. Thay vì merge toàn bộ nhánh `develop` (vốn chứa nhiều tính năng chưa test xong) vào `main`, bạn chỉ việc đứng ở `main` và chạy `git cherry-pick abc1234` để đưa riêng bản sửa lỗi đó vào production an toàn.

### Câu 19: Lợi ích lớn nhất của việc sử dụng mạng "Overlay Network" trong Docker Swarm hoặc Kubernetes (như Calico, Flannel, Cilium) là gì?
- [x] Cho phép các container chạy trên các máy chủ vật lý (Hosts) khác nhau có thể giao tiếp trực tiếp với nhau thông qua địa chỉ IP riêng của chúng một cách trong suốt.
- [ ] Giúp container chia sẻ chung vùng nhớ RAM vật lý của máy chủ host để tăng tốc độ giao tiếp liên tiến trình.
- [ ] Ngăn chặn hoàn toàn việc các tiến trình bên trong container gửi dữ liệu ra ngoài mạng Internet công cộng.
- [ ] Tự động chuyển đổi các request REST API dạng văn bản sang giao thức nhị phân gRPC tại tầng transport.

> **Giải thích:** Khi scale ứng dụng ra cụm 100 máy chủ, Container A trên Server 1 cần gọi thẳng sang Container B trên Server 2. Overlay Network đóng gói (encapsulate) gói tin mạng của container (bằng VXLAN/Geneve) và truyền qua mạng hạ tầng vật lý của các host, giải quyết bài toán định tuyến mạng phân tán trong kiến trúc microservices.

### Câu 20: Tùy chọn `--restart=unless-stopped` khi chạy lệnh `docker run` có tác dụng gì?
- [x] Docker daemon sẽ tự động khởi động lại container khi nó bị crash hoặc khi máy chủ host khởi động lại, trừ khi container đó đã bị người dùng chủ động dừng bằng lệnh `docker stop`.
- [ ] Container sẽ tự động bị xóa bỏ hoàn toàn khỏi hệ thống ngay khi tiến trình chính bên trong trả về mã thoát exit code bằng 0.
- [ ] Docker daemon sẽ cố gắng khởi động lại container vô hạn lần, kể cả sau khi người dùng đã chủ động thực thi lệnh `docker stop`.
- [ ] Container chỉ được phép chạy tối đa 24 giờ liên tục, sau đó hệ thống sẽ dừng container để thu hồi bộ nhớ RAM.

> **Giải thích:** Chính sách restart policy chuẩn mực cho các service background (Nginx, Database, API):
- `no`: Không bao giờ tự restart.
- `always`: Luôn tự restart kể cả khi user đã cố tình bấm `docker stop` (sau khi reboot host nó lại tự bật dậy).
- `unless-stopped`: Hoàn hảo nhất cho production: Tự phục hồi khi crash hoặc reboot server, nhưng tôn trọng lệnh `docker stop` của quản trị viên khi bảo trì.
