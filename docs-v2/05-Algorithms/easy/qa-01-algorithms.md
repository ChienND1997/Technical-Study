# Câu hỏi phỏng vấn: Cấu trúc dữ liệu & Thuật toán

## 1. Kỹ thuật Two Pointers và Sliding Window

**Câu hỏi:** Khi nào nên áp dụng mẫu hình Sliding Window (Cửa sổ trượt)? Phân biệt cửa sổ cố định và cửa sổ co giãn?

**Đáp án ngắn:** Áp dụng cho các bài toán tìm kiếm mảng con/chuỗi con liên tục thỏa mãn một điều kiện tối ưu (tổng lớn nhất, độ dài nhỏ nhất, không chứa ký tự trùng). Cửa sổ cố định giữ nguyên khoảng cách K; cửa sổ co giãn mở rộng con trỏ phải (Right) để thỏa mãn điều kiện và thu hẹp con trỏ trái (Left) để tối ưu kết quả.

**Gợi ý suy luận:** Dữ liệu tuần tự (Array/String) -> Mảng con liên tục (Contiguous Subarray) -> Tránh lặp O(N^2) bằng cách trượt biên trong O(N).

**Lập luận:** Nếu dùng vét cạn duyệt qua mọi cặp chỉ số `(i, j)`, thuật toán tốn O(N^2). Với Sliding Window: Bạn duy trì 2 con trỏ `left` và `right` cùng trượt về phía trước. Khi `right` tăng, bạn cộng dồn phần tử mới vào trạng thái cửa sổ; khi trạng thái vi phạm điều kiện hoặc cần tìm độ dài tối thiểu, bạn tăng dần `left` để loại bớt phần tử cũ ra khỏi cửa sổ. Vì cả `left` và `right` chỉ duyệt qua mỗi phần tử tối đa 1 lần, độ phức tạp giảm ngoạn mục từ O(N^2) xuống O(N).

**Nhớ:** Sliding Window: Xử lý chuỗi con/mảng con liên tục trong O(N); Cố định (K không đổi) vs Co giãn (Right mở rộng, Left thu hẹp).

## 2. Phát hiện chu trình trong Danh sách liên kết (Cycle Detection)

**Câu hỏi:** Thuật toán Rùa và Thỏ (Floyd’s Tortoise and Hare) phát hiện chu trình trong Linked List hoạt động như thế nào và độ phức tạp bộ nhớ là bao nhiêu?

**Đáp án ngắn:** Dùng 2 con trỏ cùng xuất phát từ Head: Rùa (Slow) đi 1 bước mỗi lượt, Thỏ (Fast) đi 2 bước mỗi lượt; nếu có chu trình thì Thỏ chắc chắn sẽ đuổi kịp và gặp Rùa bên trong vòng lặp; độ phức tạp thời gian O(N) và bộ nhớ O(1).

**Gợi ý suy luận:** Không gian O(1) (không dùng HashSet lưu node) -> Tốc độ tương đối: Fast tiếp cận Slow với vận tốc 1 bước/vòng -> Khoảng cách giảm dần đến 0.

**Lập luận:** Nếu dùng HashSet để lưu các node đã đi qua, ta tốn O(N) bộ nhớ. Floyd giải quyết bài toán với O(1) bộ nhớ: Thỏ đi nhanh gấp đôi Rùa. Nếu danh sách thẳng (không chu trình), Thỏ sẽ chạm tới `null` đầu tiên. Nếu có chu trình, sau khi cả 2 đã lọt vào vòng tròn, khoảng cách giữa Thỏ và Rùa sẽ giảm đi 1 đơn vị sau mỗi bước lặp (tương tự 2 vận động viên chạy trên sân vận động khép kín). Vì vậy, Thỏ chắc chắn sẽ bắt kịp Rùa trong không quá một vòng chu trình.

**Nhớ:** Rùa đi 1, Thỏ đi 2; gặp nhau -> có chu trình; Thỏ gặp null -> không chu trình. Thời gian O(N), bộ nhớ O(1).

