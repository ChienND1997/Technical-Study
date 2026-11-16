# Câu hỏi phỏng vấn: Java Core & Kiến trúc JVM

## 1. Cơ chế hoạt động của HashMap trong Java 8+

**Câu hỏi:** Trình bày cấu trúc bên trong của `HashMap` trong Java 8+. Quá trình thêm một phần tử bằng lệnh `put(K, V)` diễn ra như thế nào? Khi nào danh sách liên kết chuyển đổi thành Cây Đỏ Đen (Treeify)?

**Đáp án ngắn:** Dựa trên mảng các Node (Array of Buckets); mỗi bucket là một Danh sách liên kết đơn (Linked List). Khi số phần tử trong 1 bucket vượt quá ngưỡng 8 (và tổng dung lượng mảng >= 64), bucket tự chuyển đổi thành Cây Đỏ Đen (Red-Black Tree) để tối ưu thời gian tìm kiếm từ O(N) xuống O(log N).

**Gợi ý suy luận:** Hash code phân phối -> Xung đột (Collision) dùng Chaining -> Tối ưu hóa worst-case chống DoS hash collision bằng Red-Black Tree.

**Lập luận:** Khi gọi `put(key, value)`:
1. JVM tính hash của key bằng hàm `hash(key) = (h = key.hashCode()) ^ (h >>> 16)` để xáo trộn bit cao xuống bit thấp.
2. Tìm chỉ số mảng bằng phép toán bitwise nhanh: `index = (n - 1) & hash` (với `n` là độ dài mảng, luôn là lũy thừa của 2).
3. Nếu ô `table[index]` trống: Tạo node mới chèn vào.
4. Nếu ô đã có phần tử: Duyệt danh sách kiểm tra `key.equals(newKey)`: nếu trùng key thì ghi đè value cũ; nếu không trùng thì thêm vào đuôi.
5. Nếu số node trong bucket đạt 8: Kiểm tra nếu dung lượng mảng `capacity < 64` thì ưu tiên nhân đôi mảng (`resize()`); nếu `capacity >= 64` thì chuyển đổi bucket thành `TreeNode` (Red-Black Tree).

**Nhớ:** Java 8 HashMap = Mảng + Danh sách liên kết + Cây Đỏ Đen (khi bucket > 8 và capacity >= 64, worst case O(log N)).

## 2. String Pool và Tính bất biến (Immutability) của String

**Câu hỏi:** Vì sao lớp `String` trong Java được thiết kế là Bất biến (Immutable) và khai báo `final`?

**Đáp án ngắn:** Giúp tối ưu hóa bộ nhớ với String Constant Pool (tái sử dụng chuỗi trùng lặp), đảm bảo Thread-Safety tuyệt đối (an toàn khi chia sẻ giữa hàng ngàn luồng), tăng cường bảo mật (tham số kết nối DB, mạng không bị sửa lén), và cho phép cache mã băm `hashCode()`.

**Gợi ý suy luận:** Chia sẻ tham chiếu an toàn -> Đa luồng không cần Lock -> Hash code cố định dùng làm Key trong HashMap.

**Lập luận:** 
1. **Bộ nhớ**: Nhờ bất biến, Java có thể tạo một vùng nhớ chung gọi là String Pool. Hàng nghìn biến chứa chuỗi `"ACTIVE"` chỉ trỏ vào 1 địa chỉ duy nhất trên Heap.
2. **Bảo mật**: String được dùng để truyền URL kết nối cơ sở dữ liệu, tên người dùng, mật khẩu. Nếu String là mutable, một luồng khác có thể can thiệp sửa đổi nội dung giữa thời điểm kiểm tra quyền và thời điểm mở kết nối.
3. **Hiệu năng HashMap**: Do chuỗi không bao giờ thay đổi ký tự, mã băm `hash` chỉ cần tính toán 1 lần duy nhất trong hàm khởi tạo và lưu vào biến `private int hash;`. Các lần gọi `hashCode()` sau đó trả về giá trị tức thì trong O(1).

**Nhớ:** String Immutable: Tối ưu String Pool + An toàn đa luồng + Bảo mật kết nối + Cache mã băm hashCode O(1).

