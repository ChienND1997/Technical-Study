# Bộ bài tập thuật toán theo mẫu hình

Các bài lý thuyết ở [Algorithms](/go?p=05-Algorithms%2Findex.md) giải thích mẫu hình nhưng chưa có bài để luyện. Trang này liệt kê khoảng 70 bài trên LeetCode theo từng mẫu hình, xếp theo tuần của [lộ trình 12 tuần](/go?p=00-Roadmap%2Flo-trinh-12-tuan.md). Số trong ngoặc là số hiệu bài trên LeetCode.

**Tóm tắt:**

- Khoảng 70 bài LeetCode xếp theo mẫu hình và theo tuần của lộ trình 12 tuần, bổ sung phần luyện cho các bài lý thuyết ở Algorithms.
- Đặt giờ: Easy 15 phút, Medium 25-30 phút, Hard 45 phút; sau 15 phút chưa ra hướng thì xem gợi ý, không xem code.
- Giải xong phải nói thành tiếng time complexity và space complexity; làm lại bài sai sau 7 ngày.
- Thứ tự mẫu hình: Hash và Two pointers, Sliding window, Stack, Linked List, Tree, Heap, Graph, Binary search, Dynamic programming, Backtracking.
- Mọi bài Dynamic programming phải trả lời đủ 4 ý trước khi code: trạng thái, công thức chuyển, trường hợp đầu, thứ tự tính.
- Từ tuần 9 không thêm mẫu hình mới, chỉ làm lại bài sai và trộn bài ngẫu nhiên trong 25 phút.
- Có thêm bài thiết kế mã hay gặp (LRU Cache, Rate Limiter, Bounded Blocking Queue, Hit Counter) và 3 bài concurrency của LeetCode.

## Cách luyện

| Quy tắc | Lý do |
|---|---|
| Đặt giờ: bài Easy 15 phút, Medium 25-30 phút, Hard 45 phút | Giới hạn thời gian buộc phải chọn hướng nhanh |
| Chưa ra hướng sau 15 phút thì xem gợi ý, không xem code | Giữ phần tự nghĩ |
| Giải xong, **nói thành tiếng** time complexity và space complexity | Đây là câu hỏi đầu tiên khi review lời giải |
| Làm lại bài đã sai sau 7 ngày, không xem lời giải | Nhớ lâu hơn làm bài mới |
| Viết bằng Java, dùng đúng `Deque`, `PriorityQueue`, `HashMap` | Đây là các cấu trúc thường dùng khi viết code thật và khi làm bài kiểm tra |
| Mỗi bài ghi một dòng: mẫu hình, bẫy, độ phức tạp | Dùng ôn lại về sau |

Mục tiêu 3 tháng: khoảng 60-70 bài, tức 5-6 bài/tuần. **Chất lượng giải thích** quan trọng hơn số lượng.

## Tuần 1: Array, Hash, Two pointers

| Mẫu hình | Bài |
|---|---|
| Hash | Two Sum (1), Contains Duplicate (217), Valid Anagram (242), Group Anagrams (49), Top K Frequent Elements (347) |
| Prefix và hash | Product of Array Except Self (238), Subarray Sum Equals K (560), Longest Consecutive Sequence (128) |
| Two pointers | Valid Palindrome (125), Two Sum II (167), 3Sum (15), Container With Most Water (11) |

Bẫy hay gặp: quên trường hợp array rỗng; `HashMap` ghi đè key trùng; tràn số `int`.

## Tuần 2: Sliding window, Stack, Queue, Linked List

| Mẫu hình | Bài |
|---|---|
| Sliding window | Best Time to Buy and Sell Stock (121), Longest Substring Without Repeating Characters (3), Longest Repeating Character Replacement (424), Minimum Window Substring (76) |
| Stack | Valid Parentheses (20), Min Stack (155), Daily Temperatures (739), Largest Rectangle in Histogram (84) |
| Linked List | Reverse Linked List (206), Merge Two Sorted Lists (21), Linked List Cycle (141), Remove Nth Node From End of List (19), Reorder List (143) |
| Thiết kế | LRU Cache (146) |

Tự cài LRU Cache hai cách: `LinkedHashMap` và `HashMap` + doubly linked list. Phỏng vấn thường hỏi cách thứ hai.

## Tuần 3: Tree, Heap, Trie

| Mẫu hình | Bài |
|---|---|
| Tree traversal | Maximum Depth of Binary Tree (104), Invert Binary Tree (226), Level Order Traversal (102), Validate Binary Search Tree (98) |
| Advanced tree | Lowest Common Ancestor of a Binary Tree (236), Construct Binary Tree from Preorder and Inorder (105), Binary Tree Maximum Path Sum (124), Serialize and Deserialize Binary Tree (297) |
| Heap | Kth Largest Element in an Array (215), Merge k Sorted Lists (23), Find Median from Data Stream (295) |
| Trie | Implement Trie (208) |

## Tuần 4: Graph

| Mẫu hình | Bài |
|---|---|
| BFS/DFS trên lưới | Number of Islands (200), Rotting Oranges (994), Pacific Atlantic Water Flow (417) |
| Graph tổng quát | Clone Graph (133), Course Schedule (207), Course Schedule II (210), Word Ladder (127) |
| Shortest path | Network Delay Time (743) |
| Union-Find | Redundant Connection (684) |

Tuần này thêm 3 bài **concurrency** (LeetCode mục Concurrency): Print in Order (1114), Print FooBar Alternately (1115), Print Zero Even Odd (1116). Mục đích là luyện `Semaphore`, `CountDownLatch`, `wait/notify`.

## Tuần 5: Binary search, Sorting, Khoảng

| Mẫu hình | Bài |
|---|---|
| Binary search | Binary Search (704), Search in Rotated Sorted Array (33), Find Minimum in Rotated Sorted Array (153), Koko Eating Bananas (875), Median of Two Sorted Arrays (4) |
| Intervals | Merge Intervals (56), Non-overlapping Intervals (435) |
| Sorting | Sort an Array (912): tự cài quick sort và merge sort |

## Tuần 6: Dynamic programming I (1D)

| Mẫu hình | Bài |
|---|---|
| Cơ bản | Climbing Stairs (70), House Robber (198), Maximum Product Subarray (152) |
| Subsequence | Longest Increasing Subsequence (300), Word Break (139) |
| Kinh điển | Coin Change (322), Partition Equal Subset Sum (416) |

**Phải thuộc:** Mọi bài dynamic programming đều trả lời đủ 4 ý trước khi viết code: trạng thái là gì (`dp[i]` nghĩa là gì), công thức chuyển, trường hợp đầu, thứ tự tính. Thiếu một trong bốn ý thì chưa nên gõ code.

## Tuần 7: Dynamic programming II (2D, string)

| Mẫu hình | Bài |
|---|---|
| Grid | Unique Paths (62) |
| Chuỗi | Longest Common Subsequence (1143), Edit Distance (72) |
| Ôn lại | Làm lại 3 bài sai từ tuần 6 |

## Tuần 8: Backtracking

| Mẫu hình | Bài |
|---|---|
| Combination, permutation | Subsets (78), Permutations (46), Combination Sum (39) |
| Có ràng buộc | Word Search (79), Palindrome Partitioning (131), N-Queens (51) |

## Tuần 9 trở đi: Ôn và trộn

Không thêm mẫu hình mới. Mỗi tuần:

- Làm lại 3 bài đã sai hoặc giải lâu nhất.
- Làm 2 bài **ngẫu nhiên** trong 25 phút để giống bài kiểm tra thật (không biết trước mẫu hình).
- Một bài thiết kế mã (LRU, rate limiter, hit counter, bounded blocking queue) bằng Java chạy được và có test.

## Bài thiết kế mã hay gặp

| Bài | Ý chính | Tài liệu liên quan |
|---|---|---|
| LRU / LFU Cache | Map + doubly linked list | [LRU Cache](/go?p=15-System%20Design%2Feasy%2F05-lru-cache.md) |
| Rate Limiter | Token bucket, sliding window, thread-safe | [Rate Limiter](/go?p=15-System%20Design%2Feasy%2F03-rate-limiter.md) |
| Bounded Blocking Queue | `ReentrantLock` + `Condition` | [Explicit locks](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-13-explicit-locks.md) |
| Thread Pool đơn giản | Queue, worker, shutdown | [Thread pool](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-08-thread-pool.md) |
| Hit Counter | Time window, bucket | [Hit Counter](/go?p=15-System%20Design%2Feasy%2F06-hit-counter.md) |
| Bảng xếp hạng | `TreeMap` hoặc skip list | [Leaderboard](/go?p=15-System%20Design%2Feasy%2F07-leaderboard.md) |

## Tài liệu tham khảo

- Danh sách chọn lọc kiểu "NeetCode 150" hoặc "Blind 75" trùng phần lớn các bài trên; dùng để tra thêm khi cần.
- Bài lý thuyết trong [Algorithms](/go?p=05-Algorithms%2Findex.md) giải thích mẫu hình, còn trang này cho bài để làm.

