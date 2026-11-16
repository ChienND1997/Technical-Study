# Autocomplete - Bài toán kinh điển trong các hệ thống tìm kiếm

> Nguồn: [Viblo](https://viblo.asia/p/autocomplete-bai-toan-kinh-dien-trong-cac-he-thong-tim-kiem-gwd43jOjVX9) · Tác giả: Sydexa · Đăng ngày: thg 6 22, 2024 · Thẻ: System Design, kiến trúc microservices, autocomplete search, Backend
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bài gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài mở đầu một chuỗi về thiết kế tính năng gợi ý khi gõ tìm kiếm. Tác giả đặt ra yêu cầu, đi từ cách làm ngây thơ bằng SQL đến cấu trúc cây tiền tố có trọng số và kết quả tính sẵn. Phần mở rộng hệ thống được hẹn ở các bài sau.

## Ý chính

- Yêu cầu chính: gợi ý phải hiện kịp lúc người dùng đang gõ, dịch vụ luôn sẵn sàng, chấp nhận nhất quán cuối cùng, kết quả có thứ tự ưu tiên và khớp với tiền tố đã nhập; thường chỉ trả về khoảng 7 gợi ý.
- Cách đơn giản là truy vấn LIKE theo tiền tố rồi sắp xếp, nhưng chậm khi có hàng triệu chuỗi. Sắp xếp theo từ điển rồi tìm nhị phân nhanh hơn nhưng vẫn chưa đủ.
- Trie lưu các chuỗi chung tiền tố trên cùng một đường đi, nên tìm theo tiền tố có chi phí tỷ lệ với độ dài chuỗi gõ vào và tiết kiệm bộ nhớ.
- Cây hậu tố dạng nén gộp các nút chỉ có một nhánh con, giúp cây gọn hơn và đi qua ít nút trung gian hơn.
- Mỗi chuỗi được gán trọng số, ví dụ theo tần suất tìm kiếm hoặc mức độ gần đây, để sắp xếp gợi ý. Tuy nhiên duyệt và sắp xếp cả nhánh con vẫn tốn kém.
- Giải pháp là tính trước kết quả cho các nhánh lớn và lưu trong bảng băm, đánh đổi thêm bộ nhớ lấy tốc độ. Còn lại là chia nhỏ cây, bảo đảm sẵn sàng và lưu cây vào cơ sở dữ liệu.

## Kinh nghiệm rút ra

Khi tính năng cần phản hồi trong vài chục mili giây, hãy chọn cấu trúc dữ liệu đúng và dời việc tính toán nặng sang bước tính trước, chấp nhận dữ liệu hơi cũ. Có thể thử tự cài một Trie nhỏ có trọng số để hiểu rõ. Chủ đề liên quan Database và Distributed Systems.

## Đọc bản gốc

[Autocomplete - Bài toán kinh điển trong các hệ thống tìm kiếm](https://viblo.asia/p/autocomplete-bai-toan-kinh-dien-trong-cac-he-thong-tim-kiem-gwd43jOjVX9)

**Tóm tắt:**
- Trie và cây hậu tố nén giúp tìm theo tiền tố nhanh.
- Trọng số quyết định thứ tự gợi ý.
- Tính sẵn kết quả nhánh lớn, đánh đổi bộ nhớ lấy tốc độ.

