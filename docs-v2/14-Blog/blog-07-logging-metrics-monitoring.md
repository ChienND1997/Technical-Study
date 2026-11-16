# Logging, Metrics, Monitoring, Notification, Automation trong dự án lớn

> Nguồn: [Viblo](https://viblo.asia/p/logging-metrics-monitoring-notification-automation-nhung-cong-cu-khong-the-thieu-trong-cac-du-an-lon-x7Z4DAkDJnX) · Tác giả: Tờ Mờ Sáng học Lập trình · Đăng ngày: 17/06/2024 · Thẻ: System Design, Logging, Monitoring, Automation
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả giới thiệu năm nhóm công cụ mà hệ thống quy mô lớn gần như luôn cần: ghi log, đo số liệu, giám sát, cảnh báo và tự động hóa. Với website nhỏ thì chúng có thể thừa, nhưng khi người dùng đông thì thiếu chúng sẽ rất khó vận hành.

## Ý chính

- Logging là ghi lại sự kiện, hành động người dùng và lỗi để debug, kiểm toán hành vi và phân tích xem chức năng nào dùng nhiều. Công cụ nhắc tới là ELK Stack và Splunk.
- Không nên ghi log tràn lan: với lượng người dùng lớn, log sinh ra quá nhiều có thể làm máy chủ log quá tải. Hãy theo quy ước log của dự án và hỏi người có kinh nghiệm.
- Metrics là các con số đo sức khỏe hệ thống, chia thành ba tầng: theo máy chủ (CPU, bộ nhớ, đĩa), theo cụm dịch vụ (database, cache) và chỉ số kinh doanh (người dùng hoạt động mỗi ngày, doanh thu).
- Monitoring dựa trên log và metrics để theo dõi và tìm nguyên nhân gốc; cặp Prometheus với Grafana được nhắc tới như lựa chọn quen thuộc.
- Notification đẩy cảnh báo tới đúng người (ví dụ qua webhook Slack) khi tài nguyên chạm ngưỡng, dịch vụ ngừng hoạt động hoặc xuất hiện exception.
- Automation gồm CI (build và test mỗi lần commit), Continuous Delivery (đưa lên staging) và Continuous Deployment (tự động lên production). Tác giả lưu ý nhiều nhóm vẫn deploy production thủ công hoặc thử với một nhóm khách hàng nhỏ trước, vì staging và production là hai môi trường khác nhau.

## Kinh nghiệm rút ra

Khi làm backend, hãy xem khả năng quan sát (log có chọn lọc, metrics, cảnh báo) là một phần của tính năng chứ không phải việc làm sau. Hãy tập đặt mức log hợp lý, quyết định ngưỡng cảnh báo sớm và hiểu rõ khác biệt Delivery với Deployment trước khi thiết kế pipeline. Nội dung liên quan trực tiếp tới chủ đề DevOps và Distributed Systems của KemTech.

## Đọc bản gốc

[LOGGING, METRICS, MONITORING, NOTIFICATION, AUTOMATION - NHỮNG CÔNG CỤ KHÔNG THỂ THIẾU TRONG CÁC DỰ ÁN LỚN](https://viblo.asia/p/logging-metrics-monitoring-notification-automation-nhung-cong-cu-khong-the-thieu-trong-cac-du-an-lon-x7Z4DAkDJnX)

**Tóm tắt:**
- Năm trụ cột vận hành: log, metrics, giám sát, cảnh báo, tự động hóa.
- Ghi log có chọn lọc để tránh quá tải hệ thống log.
- Delivery khác Deployment ở bước đưa lên production có tự động hay không.

