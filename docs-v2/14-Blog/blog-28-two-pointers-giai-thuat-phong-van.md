# Kỹ thuật Two Pointers trong thuật toán

> Nguồn: [Viblo](https://viblo.asia/p/ky-thuat-two-pointers-trong-thuat-toan-PwlVmeZPV5Z) · Tác giả: Phan Trần Hiếu Nhân · Đăng ngày: thg 3 25, 2025 · Thẻ: Algorithms, Array golang, leet code, Coding Interview
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Một bài nhập môn ngắn về kỹ thuật hai con trỏ, thường gặp khi luyện LeetCode và phỏng vấn thuật toán. Tác giả là backend engineer dùng Golang, minh họa bằng bài Two Sum trên mảng đã sắp xếp: kiểm tra xem có cặp số nào cộng lại bằng giá trị mục tiêu hay không.

## Ý chính

- Cách ngây thơ là duyệt mọi cặp bằng hai vòng lặp lồng nhau, tốn thời gian bậc hai theo kích thước mảng.
- Kỹ thuật hai con trỏ khai thác việc mảng đã được sắp xếp: đặt một con trỏ ở đầu, một con trỏ ở cuối, mỗi con trỏ đại diện cho một số của cặp đang xét.
- Nếu tổng lớn hơn mục tiêu, mọi cặp dùng phần tử bên phải hiện tại với số nào ở bên trái cũng đều quá lớn, nên chỉ cần lùi con trỏ phải.
- Nếu tổng nhỏ hơn mục tiêu, lập luận đối xứng cho phép tiến con trỏ trái. Mỗi bước loại bỏ cả một loạt cặp không cần xét.
- Vòng lặp dừng khi tìm thấy cặp hoặc hai con trỏ gặp nhau, độ phức tạp thành tuyến tính.
- Cuối bài có danh sách bài luyện như 3-Sum và Valid Palindrome.

## Kinh nghiệm rút ra

Điều đáng nhớ là câu hỏi "mỗi bước loại bỏ được những khả năng nào, và vì sao an toàn?". Gặp mảng hoặc chuỗi có thứ tự, hãy nghĩ đến hai con trỏ trước khi viết vòng lặp lồng nhau, và nói to lập luận đó khi phỏng vấn. Chủ đề thuộc mảng thuật toán và phỏng vấn của KemTech.

## Đọc bản gốc

[Kỹ thuật Two Pointers trong thuật toán](https://viblo.asia/p/ky-thuat-two-pointers-trong-thuat-toan-PwlVmeZPV5Z)

**Tóm tắt:**
- Hai con trỏ ở hai đầu mảng đã sắp xếp, tiến dần vào nhau.
- So sánh tổng với mục tiêu để biết nên dịch con trỏ nào.
- Giảm độ phức tạp từ bậc hai xuống tuyến tính.

