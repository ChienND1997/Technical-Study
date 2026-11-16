# Trắc nghiệm chuyên sâu: Cấu trúc dữ liệu & Thuật toán

## 1. Độ phức tạp thời gian, Cấu trúc dữ liệu nền tảng

### Câu 1: Độ phức tạp thời gian trung bình (Average Time Complexity) của các thao tác Thêm, Xóa, Tìm kiếm trên bảng băm (Hash Table) là bao nhiêu?
- [x] O(1) trung bình cho cả ba thao tác nhờ hàm băm ánh xạ trực tiếp khóa vào chỉ số mảng; trường hợp xấu nhất khi mọi khóa bị xung đột dồn vào một bucket là O(n).
- [ ] O(log n) trong mọi trường hợp do cơ chế cân bằng cây nhị phân được duy trì tự động tại mỗi thao tác thêm xóa.
- [ ] O(1) cho thao tác tìm kiếm, nhưng thao tác thêm mới và xóa luôn tốn chi phí O(n) do phải sắp xếp lại mảng chỉ số.
- [ ] O(n) trung bình do chi phí tính toán lại giá trị băm cho toàn bộ các phần tử hiện có mỗi khi xảy ra va chạm.

> **Giải thích:** Nhờ hàm băm (Hash function) phân phối đều, bảng băm truy xuất trực tiếp ô nhớ qua index trong O(1). Tuy nhiên khi xảy ra đụng độ (Hash Collision), các phần tử trong cùng 1 bucket phải duyệt tuần tự qua danh sách liên kết (O(n)). Trong Java 8+, khi bucket vượt quá 8 phần tử và mảng đủ lớn, nó tự chuyển thành Red-Black Tree để giảm worst-case xuống O(log n).

### Câu 2: Trong thuật toán duyệt đồ thị, khi nào nên sử dụng BFS (Breadth-First Search) thay vì DFS (Depth-First Search)?
- [x] Khi cần tìm đường đi ngắn nhất (Shortest Path) trên đồ thị không có trọng số hoặc đồ thị có trọng số bằng nhau; BFS duyệt theo từng tầng bán kính qua hàng đợi (Queue).
- [ ] Khi cần tìm chu trình trong đồ thị có hướng hoặc sắp xếp topo các đỉnh phụ thuộc; BFS cho thứ tự duyệt sau tự nhiên hơn DFS.
- [ ] Khi không gian bộ nhớ RAM bị hạn chế nghiêm trọng; BFS tiết kiệm bộ nhớ hơn DFS vì không cần lưu trữ trạng thái các nút lân cận.
- [ ] Khi đồ thị có cấu trúc dạng cây với độ sâu rất lớn nhưng số lượng nhánh con tại mỗi đỉnh là vô cùng nhỏ.

> **Giải thích:** BFS duyệt đồ thị theo từng tầng bán kính (tầng 1, tầng 2, tầng 3...). Do đó, ngay khi BFS chạm tới nút đích lần đầu tiên, đường đi đó chắc chắn là đường đi ngắn nhất (số cạnh ít nhất). Điểm đánh đổi: BFS lưu toàn bộ các nút ở tầng hiện tại vào Queue nên tốn bộ nhớ O(V) hơn so với DFS (chỉ tốn theo độ sâu của nhánh đệ quy O(H)).

### Câu 3: Cấu trúc dữ liệu nào hoạt động theo nguyên tắc LIFO (Last In, First Out) và là nền tảng để máy tính thực thi các lệnh gọi hàm đệ quy?
- [x] Stack (Ngăn xếp - phần tử đẩy vào sau cùng sẽ được lấy ra đầu tiên qua các thao tác push/pop).
- [ ] Queue (Hàng đợi - phần tử đưa vào trước sẽ được phục vụ trước theo nguyên tắc FIFO tuần tự).
- [ ] Priority Queue (Hàng đợi ưu tiên - phần tử có độ ưu tiên cao nhất luôn được lấy ra trước bất kể thời gian đến).
- [ ] Deque (Hàng đợi hai đầu - cho phép thêm và xóa phần tử tự do tại cả hai đầu mảng với chi phí O(1)).

> **Giải thích:** Stack là cấu trúc dữ liệu LIFO: phần tử đẩy vào sau cùng sẽ được lấy ra đầu tiên. Vùng nhớ Call Stack của CPU sử dụng chính cơ chế này để lưu trữ các Stack Frame (biến cục bộ và địa chỉ trả về) của các hàm lồng nhau hoặc đệ quy. Khi hàm kết thúc, stack frame trên cùng được pop ra.

### Câu 4: Cho một mảng đã được sắp xếp tăng dần gồm 1.000.000 phần tử, thuật toán Tìm kiếm Nhị phân (Binary Search) cần tối đa bao nhiêu lần so sánh để tìm thấy một phần tử hoặc khẳng định phần tử đó không tồn tại?
- [x] Tối đa khoảng 20 lần so sánh (do độ phức tạp O(log2 N) và `log2(1.000.000) ≈ 19.93`).
- [ ] Tối đa khoảng 1.000 lần so sánh (tương ứng với căn bậc hai của số lượng phần tử `sqrt(N)`).
- [ ] Tối đa 500.000 lần so sánh (tương ứng với việc kiểm tra một nửa số lượng phần tử của mảng).
- [ ] Tối đa 1.000.000 lần so sánh (tương ứng với trường hợp xấu nhất của duyệt tuyến tính O(N)).

> **Giải thích:** Binary Search loại bỏ 1/2 số lượng phần tử sau mỗi bước so sánh. Với N = 1.000.000 phần tử, độ phức tạp O(log2(N)) chỉ mất tối đa `ceil(log2(1.000.000)) = 20` phép so sánh, thể hiện sức mạnh vượt trội của thuật toán O(log n) so với Linear Search O(n) (phải duyệt 1 triệu lần).

### Câu 5: Điểm khác biệt quan trọng giữa Quy hoạch động (Dynamic Programming) và Đệ quy có nhớ (Memoization) là gì?
- [x] Memoization là tiếp cận từ trên xuống (Top-down) kết hợp cache kết quả bài toán con; còn Dynamic Programming chuẩn thường giải từ dưới lên (Bottom-up) bằng bảng kết quả (Tabulation).
- [ ] Memoization giải quyết các bài toán không có tính chất gối nhau; còn Dynamic Programming chỉ áp dụng cho bài toán có cấu trúc cây nhị phân.
- [ ] Memoization luôn tối ưu hơn về bộ nhớ do không cần cấp phát mảng hoặc bảng lưu trữ trạng thái trung gian.
- [ ] Memoization loại bỏ hoàn toàn việc sử dụng ngăn xếp đệ quy Call Stack thông qua kỹ thuật Tail Call Optimization.

> **Giải thích:** Cả hai đều giải các bài toán có tính chất "Gối nhau của bài toán con" (Overlapping Subproblems) và "Cấu trúc con tối ưu" (Optimal Substructure). Điểm khác: Top-down (Memoization) bắt đầu từ bài toán lớn rồi gọi đệ quy xuống bài toán cơ sở (dễ tràn bộ nhớ call stack nếu độ sâu lớn); Bottom-up (Tabulation) dùng vòng lặp bắt đầu từ bài toán con nhỏ nhất (dp[0], dp[1]) xây dựng dần lên bài toán lớn, tiết kiệm bộ nhớ và tránh chi phí đệ quy.

### Câu 6: Thuật toán sắp xếp QuickSort có độ phức tạp trung bình là O(n log n), nhưng trong trường hợp xấu nhất nó có thể bị thoái hóa về O(n^2) khi nào?
- [x] Khi mảng đã sắp xếp (hoặc ngược chiều) và phần tử chốt (Pivot) luôn chọn là đầu hoặc cuối mảng, dẫn đến phân hoạch lệch hoàn toàn thành `1` và `n - 1`.
- [ ] Khi mảng chứa nhiều phần tử có giá trị âm nằm xen kẽ với các phần tử số dương có độ lớn vượt quá phạm vi số nguyên 32-bit.
- [ ] Khi kích thước mảng vượt quá ngưỡng bộ nhớ đệm L1 Cache của CPU khiến các thao tác hoán đổi phần tử bị nghẽn bus.
- [ ] Khi hàm phân hoạch Partition sử dụng hai con trỏ duyệt từ hai đầu mảng thay vì duyệt tuần tự từ trái qua phải.

> **Giải thích:** Nếu pivot luôn chia mảng thành `1` và `n - 1`, cây đệ quy có độ sâu n thay vì log n, dẫn đến tổng số phép so sánh là `n + (n-1) + ... + 1 = O(n^2)`. Để khắc phục trong thực tế, các thư viện (như `DualPivotQuicksort` trong Java) áp dụng kỹ thuật chọn Pivot ngẫu nhiên (Randomized Pivot) hoặc chọn Trung vị của ba phần tử (Median-of-three).

### Câu 7: So sánh giữa QuickSort và MergeSort, phát biểu nào sau đây là chuẩn xác nhất?
- [x] MergeSort luôn đảm bảo O(n log n) và là thuật toán ổn định (Stable Sort), nhưng tốn thêm O(n) bộ nhớ phụ; còn QuickSort sắp xếp tại chỗ (In-place) nhanh hơn trong thực tế nhưng không ổn định.
- [ ] MergeSort sắp xếp tại chỗ trong O(1) bộ nhớ phụ; còn QuickSort luôn yêu cầu mảng tạm O(n) để thực hiện bước phân hoạch.
- [ ] QuickSort là thuật toán sắp xếp ổn định đảm bảo thứ tự ban đầu của các phần tử bằng nhau; còn MergeSort làm xáo trộn thứ tự gốc.
- [ ] Cả hai thuật toán đều đảm bảo độ phức tạp thời gian xấu nhất O(n log n) và không tiêu tốn thêm bất kỳ vùng nhớ phụ nào.

> **Giải thích:** "Ổn định" (Stable) nghĩa là giữ nguyên thứ tự ban đầu của các phần tử có giá trị bằng nhau (cực kỳ quan trọng khi sắp xếp đối tượng theo nhiều tiêu chí). Vì MergeSort cần mảng tạm để gộp (Merge) nên tốn O(n) memory. QuickSort hoán đổi phần tử trực tiếp trong mảng gốc nên tận dụng bộ nhớ đệm CPU (Locality of Reference) tuyệt vời, trở thành lựa chọn mặc định cho kiểu nguyên thủy.

### Câu 8: Cấu trúc dữ liệu Min-Heap (Đống nhị phân nhỏ nhất) có tính chất đặc trưng nào?
- [x] Giá trị của mỗi node cha luôn nhỏ hơn hoặc bằng giá trị các node con của nó; do đó phần tử nhỏ nhất luôn nằm ở Node gốc (Root) và truy xuất được trong O(1).
- [ ] Cây luôn được sắp xếp tăng dần từ trái qua phải, cho phép tìm kiếm nhị phân một phần tử bất kỳ trong thời gian O(log n).
- [ ] Thao tác xóa một phần tử bất kỳ ở giữa cây luôn được thực hiện trong thời gian O(1) mà không làm biến dạng cấu trúc heap.
- [ ] Độ cao của Min-Heap luôn lớn gấp đôi độ cao của một cây tìm kiếm nhị phân cân bằng (AVL Tree) có cùng số lượng phần tử.

> **Giải thích:** Heap là một Cây nhị phân gần hoàn chỉnh (Complete Binary Tree) được biểu diễn gọn gàng bằng mảng. Lấy phần tử nhỏ nhất (`peek`) tốn O(1). Thêm mới (`push`) hoặc lấy ra phần tử nhỏ nhất (`pop`) tốn O(log n) do quá trình vun đống (Heapify). Cực kỳ hữu hiệu để giải các bài toán "Top K phần tử" hoặc tìm phần tử thứ K lớn nhất.

### Câu 9: Cây tìm kiếm nhị phân (Binary Search Tree - BST) khi duyệt theo thứ tự giữa (Inorder Traversal: Left -> Root -> Right) sẽ cho ra kết quả gì?
- [x] Một dãy các phần tử được sắp xếp theo thứ tự tăng dần nghiêm ngặt (hoặc không giảm nếu cho phép khóa trùng lặp).
- [ ] Một dãy các phần tử được sắp xếp theo thứ tự giảm dần do các node lớn hơn luôn được thăm trước các node nhỏ hơn.
- [ ] Dãy các giá trị theo thứ tự tầng từ gốc xuống lá tương đương với kết quả của phép duyệt đồ thị theo chiều rộng BFS.
- [ ] Tập hợp các node lá của cây được nhóm lại theo từng nhánh từ trái qua phải.

> **Giải thích:** Định nghĩa của BST: Mọi node ở cây con bên trái đều nhỏ hơn node gốc, và node gốc luôn nhỏ hơn mọi node ở cây con bên phải (`Left < Root < Right`). Khi duyệt Inorder (thăm Left trước, rồi thăm Root, rồi thăm Right), thứ tự in ra luôn là một chuỗi giá trị tăng dần nghiêm ngặt.

### Câu 10: Cấu trúc dữ liệu Trie (Cây tiền tố) vượt trội hơn Hash Table trong bài toán nào sau đây?
- [x] Bài toán tìm kiếm tiền tố (Prefix Search / Autocomplete) với thời gian chỉ phụ thuộc vào độ dài từ O(L) mà không phụ thuộc số lượng từ N trong từ điển.
- [ ] Bài toán tra cứu chính xác một từ khóa đơn lẻ với thời gian truy xuất trung bình tiệm cận O(1) trên tập dữ liệu hàng triệu bản ghi.
- [ ] Bài toán tính toán tổng giá trị băm mật mã học của một chuỗi ký tự dài mà không gây ra xung đột băm.
- [ ] Bài toán nén kích thước dữ liệu chuỗi văn bản bằng thuật toán mã hóa cây nhị phân Huffman tĩnh.

> **Giải thích:** Hash Table chỉ tra cứu được toàn bộ từ khóa chính xác (`word === "apple"`). Nó hoàn toàn bất lực trước câu hỏi "Liệt kê các từ bắt đầu bằng 'app'". Trie tổ chức mỗi cạnh là một ký tự; để tìm kiếm tiền tố dài L ký tự, Trie chỉ mất O(L) bước đi từ gốc xuống nhánh con, sau đó duyệt tiếp để lấy toàn bộ danh sách gợi ý tự động (Autocomplete) siêu tốc.

### Câu 11: Thuật toán Dijkstra dùng để tìm đường đi ngắn nhất từ một đỉnh nguồn tới tất cả các đỉnh khác trên đồ thị có điều kiện tiên quyết nào?
- [x] Tất cả các trọng số của các cạnh trên đồ thị bắt buộc phải là số không âm (weight >= 0); thuật toán dùng Min-Heap đạt độ phức tạp O((V + E) log V).
- [ ] Đồ thị bắt buộc phải là đồ thị có hướng không có chu trình (DAG) và số lượng đỉnh không vượt quá 10.000.
- [ ] Đồ thị bắt buộc phải là đồ thị phẳng (Planar Graph) và không tồn tại bất kỳ đỉnh cô lập nào không có cạnh nối.
- [ ] Trọng số của các cạnh bắt buộc phải là các số nguyên dương phân biệt, không được phép có hai cạnh cùng trọng số.

> **Giải thích:** Dijkstra hoạt động theo chiến lược Tham lam (Greedy): Nó luôn chọn đỉnh chưa thăm có khoảng cách ngắn nhất từ nguồn để chốt kết quả và thư giãn (Relax) các cạnh lân cận. Nếu có cạnh âm (Negative weight), giả định "đường đi ngắn nhất đã chốt không thể ngắn hơn" bị phá vỡ hoàn toàn, dẫn đến kết quả sai (muốn xử lý trọng số âm phải dùng Bellman-Ford hoặc SPFA).

### Câu 12: Thuật toán Sắp xếp Tô-pô (Topological Sort) chỉ có thể áp dụng trên loại đồ thị nào?
- [x] Đồ thị có hướng không có chu trình (Directed Acyclic Graph - DAG).
- [ ] Đồ thị vô hướng liên thông có trọng số cạnh dương.
- [ ] Đồ thị hai phía (Bipartite Graph) có thể phân chia các đỉnh thành hai tập độc lập.
- [ ] Đồ thị có chứa ít nhất một chu trình âm để phát hiện thứ tự phụ thuộc vòng tròn.

> **Giải thích:** Topological Sort sắp xếp các đỉnh thành một đường thẳng sao cho với mọi cạnh có hướng `u -> v`, đỉnh `u` luôn xuất hiện trước đỉnh `v`. Ứng dụng: Lập lịch các công việc phụ thuộc nhau (như thứ tự môn học tiên quyết, thứ tự biên dịch các package trong Maven/Gradle). Nếu đồ thị có chu trình (A cần B, B cần C, C cần A), bài toán phụ thuộc vòng tròn không thể giải được (Deadlock), thuật toán sẽ báo lỗi.

### Câu 13: Cấu trúc dữ liệu Disjoint Set Union (DSU / Union-Find) khi kết hợp hai kỹ thuật "Nén đường đi" (Path Compression) và "Hợp nhất theo hạng" (Union by Rank) đạt độ phức tạp thời gian cho mỗi thao tác là bao nhiêu?
- [x] Gần như O(1) - chính xác là O(α(n)), với α là hàm ngược Ackermann (trong thực tế với n = 10^80 số hạt trong vũ trụ thì α(n) vẫn <= 4).
- [ ] O(log n) trong trường hợp trung bình và thoái hóa về O(n) trong trường hợp cây bị lệch thành đường thẳng.
- [ ] O(1) tuyệt đối trong mọi tình huống thông qua việc sử dụng bảng băm đồng bộ hai chiều giữa các phần tử.
- [ ] O(n log n) do chi phí cập nhật lại con trỏ đại diện cho toàn bộ các phần tử thuộc tập hợp con sau mỗi thao tác hợp nhất.

> **Giải thích:** DSU dùng để quản lý các tập hợp rời nhau và kiểm tra xem hai phần tử có thuộc cùng một thành phần liên thông hay không (rất mạnh trong thuật toán Kruskal tìm cây khung nhỏ nhất). Kỹ thuật Path Compression gập toàn bộ các node trên đường đi trỏ thẳng vào node đại diện (Root), làm cây phẳng tuyệt đối; Union by Rank luôn gắn cây thấp vào gốc của cây cao hơn, giúp cây không bao giờ bị lệch.

### Câu 14: Kỹ thuật thao tác bit nào sau đây dùng để xóa bit `1` cuối cùng (thấp nhất) của một số nguyên `n` trong O(1)?
- [x] `n & (n - 1)`
- [ ] `n | (n + 1)`
- [ ] `n ^ (n - 1)`
- [ ] `n & (~n + 1)`

> **Giải thích:** Phép toán `n & (n - 1)` là tuyệt chiêu kinh điển trong lập trình: Trừ 1 sẽ biến bit 1 cuối cùng thành 0 và lật toàn bộ các bit 0 phía sau nó thành 1. Khi AND với `n`, bit 1 cuối cùng bị triệt tiêu hoàn toàn. Ứng dụng: Đếm số lượng bit 1 trong một số (Brian Kernighan’s Algorithm) hoặc kiểm tra xem một số có phải là lũy thừa của 2 hay không: `n > 0 && (n & (n - 1)) == 0`. (Lưu ý: `n & (~n + 1)` là kỹ thuật tách riêng bit 1 thấp nhất - Lowbit trong Fenwick Tree).

### Câu 15: Cấu trúc dữ liệu Monotonic Stack (Ngăn xếp đơn điệu) thường được sử dụng tối ưu nhất cho dạng bài toán nào?
- [x] Tìm "Phần tử lớn hơn tiếp theo" (Next Greater Element) hoặc "Phần tử nhỏ hơn gần nhất" cho mỗi vị trí trong một mảng tuần tự trong thời gian O(n).
- [ ] Tìm chu trình ngắn nhất trong đồ thị có hướng thông qua kỹ thuật gán nhãn thời gian vào và ra của đỉnh.
- [ ] Cân bằng lại cây nhị phân tìm kiếm sau mỗi thao tác thêm mới phần tử để duy trì độ cao O(log n).
- [ ] Tính toán giá trị ước chung lớn nhất (GCD) của một tập hợp các số nguyên lớn trong thời gian tuyến tính.

> **Giải thích:** Nếu dùng 2 vòng lặp lồng nhau duyệt tìm phần tử lớn hơn tiếp theo, độ phức tạp là O(n^2). Monotonic Stack duy trì các phần tử trong stack luôn tăng dần hoặc giảm dần nghiêm ngặt: Mỗi khi gặp phần tử mới lớn hơn đỉnh stack, ta liên tục pop đỉnh ra và chốt kết quả cho phần tử bị pop đó. Vì mỗi phần tử chỉ được push vào và pop ra khỏi stack đúng 1 lần duy nhất, toàn bộ thuật toán chạy trong O(n). (Ví dụ kinh điển: Trapping Rain Water, Largest Rectangle in Histogram).

### Câu 16: Khái niệm "Độ phức tạp khấu hao" (Amortized Time Complexity) trong cấu trúc mảng động (như `ArrayList` trong Java hay `std::vector` trong C++) mang ý nghĩa gì?
- [x] Thao tác thêm một phần tử vào cuối mảng (`push_back`) đôi khi tốn O(n) do cấp phát mảng gấp đôi và sao chép dữ liệu; nhưng chi phí này chia đều cho n thao tác thêm trước đó, nên trung bình mỗi lần thêm vẫn là O(1).
- [ ] Chi phí thời gian của thuật toán được đảm bảo không bao giờ vượt quá ngưỡng O(1) trong bất kỳ lần thực thi đơn lẻ nào.
- [ ] Độ phức tạp thời gian tỷ lệ nghịch với dung lượng bộ nhớ RAM còn trống của hệ thống tại thời điểm chạy phương thức.
- [ ] Tổng thời gian thực thi của thuật toán được khấu hao giảm dần sau mỗi lần phương thức được máy ảo JIT biên dịch sang mã máy.

> **Giải thích:** Khi mảng đầy (kích thước n), mảng động cấp phát mảng mới 2n và copy n phần tử (tốn n bước). Nhưng sau lần đó, bạn có thể thêm n phần tử tiếp theo với chi phí chỉ là O(1) cho mỗi lần. Tổng chi phí cho chuỗi n thao tác là O(n), do đó chi phí khấu hao trung bình cho từng thao tác là `O(n) / n = O(1)`.

### Câu 17: Thuật toán Quay lui (Backtracking) khác biệt gì so với thuật toán Vét cạn thông thường (Brute Force)?
- [x] Backtracking có cơ chế "Cắt tỉa nhánh" (Pruning): ngay khi phát hiện trạng thái hiện tại vi phạm ràng buộc, thuật toán lập tức quay lui bỏ qua toàn bộ cây nhánh con phía dưới, tiết kiệm số lượng lớn phép tính.
- [ ] Backtracking chỉ áp dụng được với các bài toán có thể giải quyết tuần tự bằng vòng lặp không đệ quy.
- [ ] Backtracking luôn đảm bảo tìm ra lời giải trong độ phức tạp đa thức O(n^k) đối với mọi bài toán NP-đầy đủ.
- [ ] Backtracking lưu trữ toàn bộ không gian trạng thái đã duyệt vào bảng băm bộ nhớ để tránh duyệt trùng lặp.

> **Giải thích:** Brute force thử mù quáng tất cả mọi khả năng đến tận cùng (ví dụ N-Queens thử đặt cả bàn cờ rồi mới kiểm tra có ăn nhau không). Backtracking kiểm tra ràng buộc ngay sau mỗi quân cờ được đặt: nếu quân cờ mới bị khống chế, nó lập tức quay lui thử ô khác mà không cần đi tiếp vào các hàng dưới (Cắt tỉa nhánh - Pruning), giúp giải được các bài toán Sudoku, N-Queens trong chớp mắt.

### Câu 18: Tính chất nào sau đây của phép toán XOR (`^`) là nền tảng để giải bài toán "Tìm phần tử duy nhất xuất hiện 1 lần trong mảng mà các phần tử khác đều xuất hiện đúng 2 lần"?
- [x] Tính chất tự triệt tiêu: `x ^ x = 0`, `x ^ 0 = x`, kết hợp tính chất giao hoán và kết hợp; XOR toàn bộ mảng sẽ triệt tiêu tất cả các cặp trùng lặp và giữ lại phần tử duy nhất.
- [ ] Phép toán XOR luôn bảo toàn giá trị của bit dấu đối với các số nguyên có dấu biểu diễn bù hai.
- [ ] Phép toán XOR hai số bất kỳ luôn tạo ra kết quả lớn hơn hoặc bằng giá trị lớn nhất trong hai số hạng ban đầu.
- [ ] Phép toán XOR có thể phân rã thành tích của phép toán AND và OR theo định lý De Morgan trong đại số Boolean.

> **Giải thích:** Vì `a ^ b ^ a = (a ^ a) ^ b = 0 ^ b = b`. Khi duyệt qua mảng và XOR dồn tất cả các số vào một biến `result = 0`, các cặp số giống nhau gặp nhau sẽ tự động biến thành 0 và biến mất, cuối cùng trong `result` chỉ còn sót lại duy nhất con số đơn độc. Thuật toán chạy trong O(n) thời gian và O(1) bộ nhớ tuyệt đối.

### Câu 19: Khác biệt cốt lõi giữa "Thuật toán Tham lam" (Greedy Algorithm) và "Quy hoạch động" (Dynamic Programming) là gì?
- [x] Greedy đưa ra lựa chọn tối ưu cục bộ tốt nhất tại thời điểm hiện tại và không bao giờ xem xét lại; trong khi Dynamic Programming xem xét tất cả các quyết định khả dĩ của bài toán con để tìm ra giải pháp tối ưu toàn cục.
- [ ] Greedy luôn đảm bảo tìm được nghiệm tối ưu toàn cục cho mọi bài toán tối ưu hóa tổ hợp; còn Dynamic Programming chỉ tìm được nghiệm xấp xỉ.
- [ ] Greedy bắt buộc phải duyệt qua toàn bộ không gian trạng thái bằng đệ quy; còn Dynamic Programming chỉ dùng một biến đếm duy nhất.
- [ ] Dynamic Programming không đòi hỏi bài toán phải có tính chất cấu trúc con tối ưu (Optimal Substructure) như Greedy.

> **Giải thích:** Greedy chạy siêu nhanh vì không cần ghi nhớ lịch sử (chỉ cần tham lam chọn cái ngon nhất trước mắt: ví dụ thuật toán Huffman, Dijkstra, Kruskal). Nhưng Greedy chỉ đúng khi bài toán thỏa mãn "Greedy Choice Property". Nếu bài toán có sự phụ thuộc phức tạp (như bài toán Cái túi 0/1 Knapsack), Greedy sẽ cho ra kết quả sai và bắt buộc phải dùng Quy hoạch động để cân nhắc toàn bộ các nhánh lựa chọn.

### Câu 20: Trong bài toán "Two Pointers" (Hai con trỏ) trên một mảng để tìm cặp số có tổng bằng Target (`nums[i] + nums[j] == target`), điều kiện tiên quyết nào của mảng là bắt buộc để thuật toán hoạt động chính xác trong O(n)?
- [x] Mảng bắt buộc phải được sắp xếp theo thứ tự tăng dần (Sorted Array); khi đó nếu tổng nhỏ hơn target thì tăng con trỏ trái (left++), nếu tổng lớn hơn target thì giảm con trỏ phải (right--).
- [ ] Mảng bắt buộc phải chứa các phần tử liên tiếp nhau không có khoảng trống về giá trị số học.
- [ ] Mảng bắt buộc phải có kích thước là lũy thừa của 2 để con trỏ có thể hội tụ chính xác tại điểm giữa.
- [ ] Tất cả các phần tử trong mảng bắt buộc phải mang giá trị dương và không được vượt quá giá trị của target.

> **Giải thích:** Nếu mảng chưa sắp xếp, tăng con trỏ trái hay giảm con trỏ phải không biết trước tổng sẽ tăng hay giảm, buộc phải dùng Hash Table O(n) bộ nhớ. Khi mảng đã sắp xếp: `nums[left] + nums[right]`: Nếu tổng < Target -> bắt buộc phải tăng `left` để tìm số lớn hơn; Nếu tổng > Target -> bắt buộc phải giảm `right` để tìm số nhỏ hơn. Thuật toán duyệt qua mảng trong đúng O(n) thời gian và O(1) bộ nhớ phụ.
