# Tiêu chí tự chấm mock interview

Dùng cho tuần 12 và các lần tự kiểm tra cuối mỗi giai đoạn. Ghi âm buổi mock, nghe lại và chấm từng vòng theo thang 1-5.

**Tóm tắt:**

- Chấm từng vòng theo thang 1-5 trên bản ghi âm buổi mock; mục tiêu là 4 ở vòng thiết kế và vòng sâu, từ 3 trở lên ở các vòng còn lại.
- Điểm 3 là đúng và đủ nhưng chưa nêu trade-off; điểm 4 có cơ chế, trade-off và ví dụ thực tế; điểm 5 còn chủ động cảnh báo bẫy và đưa số liệu.
- Năm vòng: kiến thức Java và Spring (45 phút), code (45 phút, 2 bài), System Design (45-60 phút), sự cố và trade-off (30 phút), hành vi (30 phút).
- Vòng System Design chấm 6 tiêu chí: yêu cầu, ước lượng, thiết kế tổng quan, đào sâu, trade-off, độ tin cậy.
- Vòng sự cố chấm quy trình (ổn định trước, tìm nguyên nhân sau), giả thuyết, công cụ gọi đúng tên và phòng ngừa.
- Sau mỗi buổi chỉ chọn hai điểm yếu thấp nhất để vá trong tuần sau, không cố vá mọi thứ.

## Thang điểm chung

| Điểm | Ý nghĩa |
|---|---|
| 1 | Không trả lời được hoặc sai căn bản |
| 2 | Mức cơ bản: biết tên khái niệm nhưng không giải thích được cơ chế |
| 3 | Mức cơ bản đến vững: đúng và đủ; chưa nêu được trade-off |
| 4 | Mức vững: đúng, giải thích được cơ chế, nêu trade-off và ví dụ thực tế |
| 5 | Mức sâu: như 4 và còn chủ động cảnh báo bẫy, đưa số liệu, đề xuất phương án thay thế |

Gợi ý mục tiêu: **4 ở vòng thiết kế và vòng sâu**, 3 trở lên ở các vòng còn lại.

## Vòng 1: Kiến thức Java và Spring (45 phút)

Chọn 10 câu ngẫu nhiên từ [bộ câu hỏi Backend](/go?p=07-Interview-QA%2FBackend%2Findex.md) hoặc [bộ câu hỏi Frontend và Fullstack](/go?p=07-Interview-QA%2FFrontend%2Findex.md) tùy hướng của bạn.

| Tiêu chí | 1-2 | 3 | 4-5 |
|---|---|---|---|
| Độ chính xác | Sai hoặc mơ hồ | Đúng định nghĩa | Đúng cơ chế bên trong |
| Chiều sâu | Dừng ở "cái gì" | Trả lời được "tại sao" | Trả lời được câu hỏi đào sâu hai tầng |
| Liên hệ thực tế | Không có | Một ví dụ | Ví dụ từ dự án, có số liệu |
| Cách nói | Đọc thuộc | Rõ ràng | Có cấu trúc, tự nêu bẫy |

## Vòng 2: Code (45 phút, 2 bài)

| Tiêu chí | Cách chấm |
|---|---|
| Làm rõ đề | Có hỏi ràng buộc và trường hợp biên trước khi viết |
| Hướng giải | Nêu brute force rồi cải tiến, nói độ phức tạp |
| Code | Chạy đúng, đặt tên rõ, không lặp |
| Kiểm thử | Tự chạy thử ví dụ và trường hợp biên bằng tay |
| Thời gian | Hoàn thành trong giới hạn |

## Vòng 3: System Design (45-60 phút)

| Tiêu chí | Câu hỏi tự hỏi |
|---|---|
| Yêu cầu | Đã làm rõ functional, non-functional, scale chưa? |
| Ước lượng | Có tính QPS, dung lượng, bandwidth và rút ra quyết định từ đó? |
| Thiết kế tổng quan | Có API, data model, component diagram? |
| Đào sâu | Có đi sâu ít nhất hai bottleneck và nêu giải pháp? |
| Trade-off | Mỗi lựa chọn có nói rõ được và mất gì? |
| Độ tin cậy | Có nói lỗi, retry, idempotency, monitoring? |

Xem [Khung giải 45 phút](/go?p=15-System%20Design%2Fhard%2Flt-11-khung-giai-45-phut-vi-du-day-du.md).

## Vòng 4: Sự cố và trade-off (30 phút)

Lấy 2 tình huống từ [qa-18](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-18-tinh-huong-su-co-production.md) và [qa-19](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-19-trade-off-kien-truc.md).

| Tiêu chí | Biểu hiện tốt |
|---|---|
| Quy trình | Ổn định trước, tìm nguyên nhân sau; nêu các bước chẩn đoán cụ thể (log, metric, dump) |
| Giả thuyết | Đưa ra nhiều giả thuyết và cách loại trừ |
| Công cụ | Gọi đúng tên: thread dump, heap dump, `EXPLAIN`, JFR |
| Phòng ngừa | Đề xuất alert, test, thay đổi thiết kế |

## Vòng 5: Hành vi (30 phút)

| Tiêu chí | Biểu hiện tốt |
|---|---|
| Cấu trúc | STAR rõ, không lan man |
| Vai trò cá nhân | Nói rõ bản thân làm gì, không chỉ "nhóm" |
| Kết quả | Có số liệu hoặc tác động cụ thể |
| Bài học | Nêu được điều rút ra và thay đổi sau đó |
| Dẫn dắt | Có ví dụ hướng dẫn người khác, xử lý bất đồng, ra quyết định khó |

## Phiếu chấm mẫu

| Vòng | Điểm | Điểm yếu cụ thể | Bài cần đọc lại |
|---|---|---|---|
| Java, Spring | | | |
| Code | | | |
| System Design | | | |
| Sự cố, trade-off | | | |
| Hành vi | | | |

Sau mỗi buổi, chọn **hai điểm yếu** thấp nhất và dành tuần sau vá chúng, không cố vá mọi thứ.

