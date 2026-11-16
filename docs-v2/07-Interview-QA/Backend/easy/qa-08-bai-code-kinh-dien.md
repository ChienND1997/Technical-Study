# Câu hỏi: Bài code kinh điển khi phỏng vấn Java

Kiến thức gốc: [Thuật toán và CTDL](/go?p=05-Algorithms%2Findex.md), [Generics](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-07-generics.md), [Iterator, Comparator](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-26-iterator-comparator-bigdecimal.md).

Người phỏng vấn ít quan tâm bạn thuộc đáp án. Họ xem bạn **làm rõ đề, xử lý biên, đánh giá độ phức tạp, tự viết test nhỏ** và cải thiện lời giải khi được gợi ý. Quy trình nên theo: hỏi lại đề, nêu cách ngây thơ, nêu độ phức tạp, tối ưu, rồi chạy thử vài ca biên (`0`, `1`, rỗng, `null`, số âm).

Mỗi câu dưới đây theo chuỗi: **Câu hỏi** (tình huống như người phỏng vấn nói), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới kiến thức nền), **Lập luận** (chuỗi nhân quả vì sao lời giải phải như vậy), **Đáp án ngắn** (để nói thành tiếng), **Ví dụ** (code đã chạy, có output thật), **Hỏi xoáy** (kèm lý do vì sao là bước tiếp theo), **Sai lầm hay gặp** và **Nhớ**. Hãy tự trả lời phần Gợi ý trước khi đọc Lập luận. Mọi ví dụ gói trong một file `Demo08.java` đã biên dịch và chạy trên JDK 11; output trong bài là output thật của lần chạy đó.

**Tóm tắt:**

- Phạm vi file: các bài code kinh điển hay gặp trong phỏng vấn, mỗi bài đi từ lỗi hay gặp tới lời giải và độ phức tạp.
- FizzBuzz: 15 là giao của hai luật nên ghép chuỗi cho thêm luật mới rẻ hơn liệt kê tổ hợp; Fibonacci đệ quy thuần là mũ vì tính lặp bài con, memoization hay lặp hai biến đưa về O(n).
- Giai thừa tràn `long` ở 21 mà Java không báo lỗi, nên dùng `Math.multiplyExact` hoặc `BigInteger`; đảo chuỗi cần `char[]` và hai con trỏ chỉ chạy tới giữa.
- Anagram: tính chữ ký (sắp xếp chữ cái) rồi gom vào `Map<String, List<String>>`; palindrome dùng hai con trỏ O(1) memory và nhớ bỏ qua ký tự không phải chữ hoặc số.
- Đảo danh sách liên kết phải lưu `next` trước khi sửa; gộp `Iterator` phải nhảy qua các nguồn rỗng trong `hasNext()`; hàm generic dùng PECS.
- Số nguyên tố chỉ cần thử tới `√n`, và `d * d` kiểu `int` có thể tràn; khi bí thì nói to lời giải brute force kèm độ phức tạp rồi cải tiến.
- Hay bị hỏi xoáy nhất: vì sao đệ quy Fibonacci treo ở `n = 45`, vì sao giai thừa in số âm, và làm sao đảo danh sách mà không cấp phát nút mới.

## 1. FizzBuzz: viết sao cho gọn và mở rộng được?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Bạn được yêu cầu in `1..n`, bội của 3 thay bằng `Fizz`, bội của 5 thay bằng `Buzz`. Viết sao cho số 15 ra đúng và khi sếp thêm luật thứ ba thì sửa ít nhất?

**Gợi ý suy luận:**

- Số 15 vừa chia hết cho 3 vừa chia hết cho 5: hai điều kiện này có loại trừ nhau không (khái niệm giao của hai tập)?
- Nếu dùng chuỗi `if / else if`, nhánh nào bắt số 15 trước (thứ tự kiểm tra)?
- Nếu ghép kết quả từng luật độc lập vào một chuỗi thì chuỗi rỗng mang ý nghĩa gì (giá trị mặc định)?

**Lập luận:** "Bội của 15" không phải điều kiện độc lập: nó là giao của "bội của 3" và "bội của 5". Vì vậy nếu viết `if (i % 3 == 0) ... else if (i % 5 == 0) ...` thì nhánh `% 3` bắt luôn số 15 và `FizzBuzz` không bao giờ xuất hiện. Muốn đúng, hoặc phải liệt kê thêm nhánh tổ hợp, hoặc ghép chuỗi: mỗi luật độc lập cộng thêm một mảnh vào chuỗi, 15 tự thành `Fizz` + `Buzz`. Cách ghép biến giao thành phép cộng, nên thêm luật thứ ba chỉ thêm một toán hạng, trong khi liệt kê tổ hợp cần 2 luật 3 nhánh, 3 luật 7 nhánh (nổ theo cấp số nhân). Chuỗi cuối cùng rỗng nghĩa là không luật nào khớp, lúc đó in chính số `i`.

**Đáp án ngắn:** duyệt `1..n`, với mỗi `i` ghép `"Fizz"` nếu chia hết cho 3 và `"Buzz"` nếu chia hết cho 5; chuỗi rỗng thì in chính số `i`. Trả về `List<String>` thay vì in thẳng để dễ test.

**Ví dụ:**

```java
static List<String> fizzBuzz(int n) {
    List<String> out = new ArrayList<>(n);
    for (int i = 1; i <= n; i++) {
        String s = (i % 3 == 0 ? "Fizz" : "") + (i % 5 == 0 ? "Buzz" : "");
        out.add(s.isEmpty() ? String.valueOf(i) : s);
    }
    return out;
}
```

Chạy `fizzBuzz(15)` và `fizzBuzz(0)`:

```text
[1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz]
n=0 -> []
```

Truy vết ba giá trị đáng chú ý:

| `i` | `i % 3 == 0` | `i % 5 == 0` | Chuỗi ghép | Kết quả |
|---|---|---|---|---|
| 9 | có | không | `"Fizz"` + `""` | `Fizz` |
| 10 | không | có | `""` + `"Buzz"` | `Buzz` |
| 15 | có | có | `"Fizz"` + `"Buzz"` | `FizzBuzz` |
| 7 | không | không | `""` + `""` rỗng | `7` |

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Thêm luật "bội của 7 thành `Bazz`" thì sửa gì? *Vì sao hỏi tiếp:* ở Lập luận ta nói cách ghép chuỗi mở rộng rẻ, ta kiểm chứng ngay bằng một luật mới.
**Đáp:** Thêm đúng một toán hạng `(i % 7 == 0 ? "Bazz" : "")`. Vì mỗi luật độc lập cộng vào chuỗi, số 105 tự ra `FizzBuzzBazz` mà không cần nhánh riêng. Muốn thay luật bằng cấu hình, giữ danh sách cặp `(số chia, từ)` rồi nối: vòng lặp trong vòng lặp, độ phức tạp `O(n · số luật)`.

**Hỏi xoáy 2:** `n <= 0` thì sao, và vì sao trả về danh sách thay vì in? *Vì sao hỏi tiếp:* sau khi đúng với `n` bình thường, bước tiếp theo của người phỏng vấn là biên và khả năng test.
**Đáp:** Vòng lặp `for (i = 1; i <= n; ...)` tự không chạy khi `n <= 0` nên trả danh sách rỗng, đúng với contract "không có phần tử nào". Hàm trả về giá trị là hàm thuần (pure), test bằng `assertEquals`; hàm in thẳng ra `System.out` phải bắt thread xuất mới test được.

**Sai lầm hay gặp:** đặt nhánh `% 3` trước nhánh `% 15`, hậu quả là không bao giờ ra `FizzBuzz` và người phỏng vấn thấy bạn không chạy thử `15`.

**Nhớ:** khi các điều kiện giao nhau, đừng xếp thành chuỗi `else if`; biến chúng thành các phần cộng dồn độc lập.

## 2. Fibonacci: trả về cả dãy và trả về số thứ n

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Hàm Fibonacci đệ quy `F(n) = F(n-1) + F(n-2)` chạy rất nhanh với `n = 10` nhưng treo hẳn với `n = 45`. Vì sao, và sửa thế nào?

**Gợi ý suy luận:**

- Vẽ cây call của `F(5)`: bài con nào xuất hiện nhiều lần (bài toán con gối nhau)?
- Số call `C(n)` liên hệ với `C(n-1)` và `C(n-2)` ra sao, tăng theo dạng gì (đa thức hay mũ)?
- Nếu lưu kết quả bài con đã tính thì mỗi bài con tính mấy lần (memoization, quy hoạch động)?
- Fibonacci tăng nhanh cỡ nào so với `int` và `long` (tràn số)?

**Lập luận:** Vì `F(5)` gọi `F(4)` và `F(3)`, mà `F(4)` lại gọi `F(3)` và `F(2)`, nên `F(3)` bị tính hai lần: cùng một bài con bị giải đi giải lại. Số call thỏa `C(n) = C(n-1) + C(n-2) + 1`, tức tăng theo chính dãy Fibonacci, xấp xỉ `φⁿ` với `φ ≈ 1,618`, nên là mũ. Nếu ghi nhớ kết quả (memoization) thì mỗi bài con chỉ tính một lần, cây gọi thành một đường thẳng `O(n)`. Còn nếu đi từ nhỏ lên và chỉ giữ hai giá trị gần nhất thì không cần cả bảng, memory còn `O(1)`. Điểm dễ nhầm là nghĩ "đệ quy thì chậm" nói chung: bản thân đệ quy không chậm, mà là tính lặp cùng bài con. Vì vậy trong phỏng vấn, khi thấy hàm đệ quy gọi nhiều nhánh trùng đối số thì nghĩ ngay tới memoization hoặc quy hoạch động, và nói rõ chuỗi cải thiện từ `O(φⁿ)` xuống `O(n)` rồi `O(1)` memory.

**Đáp án ngắn:** quy ước `F(0)=0, F(1)=1` (phải hỏi lại đề vì có nơi bắt đầu từ `1, 1`). Bốn cách, từ tệ đến tốt: đệ quy thuần `O(φⁿ)`; memoization `O(n)` thời gian `O(n)` memory; lặp hai biến `O(n)` thời gian `O(1)` memory; nhân ma trận hoặc fast doubling `O(log n)` phép toán số học khi `n` rất lớn và dùng `BigInteger`.

**Ví dụ:**

```java
static long calls;
static long slow(int n) { calls++; return n < 2 ? n : slow(n - 1) + slow(n - 2); }

static long memoCalls;
static long memo(int n, Map<Integer, Long> cache) {
    memoCalls++;
    if (n < 2) return n;
    Long hit = cache.get(n);
    if (hit != null) return hit;
    long v = memo(n - 1, cache) + memo(n - 2, cache);
    cache.put(n, v);
    return v;
}

static long iter(int n) {
    long a = 0, b = 1;
    for (int i = 0; i < n; i++) { long t = a + b; a = b; b = t; }
    return a;
}
```

Đếm số call thật:

```text
n=0  F=0       slow:1 goi          memo:1 goi   iter=0
n=1  F=1       slow:1 goi          memo:1 goi   iter=1
n=2  F=1       slow:3 goi          memo:3 goi   iter=1
n=10 F=55      slow:177 goi        memo:19 goi  iter=55
n=20 F=6765    slow:21891 goi      memo:39 goi  iter=6765
n=30 F=832040  slow:2692537 goi    memo:59 goi  iter=832040
slow(40)=102334155 calls=331160281
```

Con số `177` ở `n=10` khớp công thức `2·F(11) − 1 = 2·89 − 1 = 177`; `331160281` ở `n=40` khớp `2·F(41) − 1`. Memo chỉ tốn `2n − 1` call (`n=10` thì 19, `n=30` thì 59): mỗi bài con tính đúng một lần, các lần gặp lại là tra bảng.

Truy vết `iter(5)` với `a, b` ban đầu `0, 1`:

| Vòng `i` | `t = a + b` | `a` sau | `b` sau |
|---|---|---|---|
| (đầu) | | 0 | 1 |
| 0 | 1 | 1 | 1 |
| 1 | 2 | 1 | 2 |
| 2 | 3 | 2 | 3 |
| 3 | 5 | 3 | 5 |
| 4 | 8 | 5 | 8 |

Trả về `a = 5 = F(5)`.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Bao lâu thì `int` và `long` tràn? *Vì sao hỏi tiếp:* kết quả chạy tới đây cho thấy dãy tăng rất nhanh, nên hỏi giới hạn của kiểu số.
**Đáp:** Kết quả chạy: `F(46) = 1836311903` còn vừa `int`; `F(47) = 2971215073` vượt `Integer.MAX_VALUE = 2147483647`, ép về `int` ra `-1323752223`. Với `long`: `F(92) = 7540113804746346429` còn đúng, `F(93)` tràn ra `-6246583658587674878`. Java **không báo lỗi** khi số nguyên tràn (bù hai, quay vòng) nên phải tự chặn: dùng `Math.addExact` hoặc `BigInteger`.

**Hỏi xoáy 2:** Memoization khác quy hoạch động bottom-up ở đâu? *Vì sao hỏi tiếp:* ta vừa dùng cả hai cách để cùng một ý "mỗi bài con một lần", họ muốn xem bạn phân biệt hướng tiếp cận.
**Đáp:** Cùng ý tưởng "mỗi bài con tính một lần". Memoization là **top-down**: viết đệ quy tự nhiên rồi thêm cache, chỉ tính các bài con thật sự cần, nhưng tốn stack: `n` đủ lớn gây `StackOverflowError`. Bottom-up (`iter`) đi từ bài nhỏ lên, không đệ quy, và khi chỉ cần hai giá trị trước thì giảm memory xuống `O(1)`.

**Hỏi xoáy 3:** Với `n = 1_000_000` làm gì? *Vì sao hỏi tiếp:* kết hợp hai điểm trước (tràn số và độ phức tạp), họ đẩy `n` lên cực lớn để thử phương án khác hẳn.
**Đáp:** Kết quả có hàng trăm nghìn chữ số nên phải dùng `BigInteger`; phép cộng số lớn tốn `O(độ dài)` nên vòng lặp không còn là `O(n)` thuần. Dùng fast doubling (`F(2k) = F(k)·(2F(k+1) − F(k))`) để chỉ cần `O(log n)` phép nhân lớn.

**Sai lầm hay gặp:** coi đệ quy thuần là `O(n)` vì "chỉ có hai call"; thực tế `slow(40)` đã cần hơn 331 triệu call. Dùng chung một `HashMap` memo giữa nhiều thread cũng sai vì `HashMap` không an toàn multithreading.

**Nhớ:** đệ quy có bài con gối nhau thì cần memoization hoặc bottom-up; đệ quy thuần là `O(φⁿ)`. Quy ước `F(0)=0, F(1)=1` phải hỏi lại đề.

## 3. Giai thừa: lặp, đệ quy, tràn số và `BigInteger`

**Câu hỏi:** Bạn tính giai thừa bằng vòng lặp. Với `n = 21` chương trình in ra số âm mà không báo lỗi. Chuyện gì xảy ra và làm sao để lỗi lộ ra?

**Gợi ý suy luận:**

- `long` có bao nhiêu bit, giá trị lớn nhất cỡ bao nhiêu (giới hạn biểu diễn)?
- `n!` tăng nhanh hơn hay chậm hơn hàm mũ (tốc độ tăng)?
- Khi phép nhân vượt giới hạn, Java ném lỗi hay quay vòng (số học bù hai)?
- Có cách nào buộc phép nhân báo lỗi khi tràn, hoặc dùng kiểu không giới hạn (`multiplyExact`, `BigInteger`)?

**Lập luận:** Vì `n!` tăng nhanh hơn mọi hàm mũ nên vấn đề thật là biểu diễn số chứ không phải thuật toán (vòng lặp `n` lần là đủ). `long` 64 bit chứa tối đa khoảng `9,2 × 10¹⁸`: `20!` còn vừa, `21!` thì vượt. Java dùng số học bù hai và quay vòng khi tràn thay vì ném lỗi, nên `21!` ra số âm và chương trình vẫn chạy bình thường: lỗi im lặng. Do đó phải chủ động chặn bằng `Math.multiplyExact` (ném `ArithmeticException`) hoặc chuyển sang `BigInteger` khi cần giá trị lớn. Cách đệ quy `n * factorial(n - 1)` còn thêm một rủi ro nữa: mỗi tầng giữ một frame, nên `n` lớn sẽ `StackOverflowError`.

**Đáp án ngắn:** vòng lặp từ `2` đến `n`, nhân dồn. Dùng `Math.multiplyExact` để biến tràn số thành `ArithmeticException`, hoặc `BigInteger` khi cần giá trị lớn.

**Ví dụ:**

```java
static long factorial(int n) {
    if (n < 0) throw new IllegalArgumentException("n phải >= 0");
    long r = 1;
    for (int i = 2; i <= n; i++) r = Math.multiplyExact(r, i);  // ném khi tràn
    return r;
}

static BigInteger bigFactorial(int n) {
    BigInteger r = BigInteger.ONE;
    for (int i = 2; i <= n; i++) r = r.multiply(BigInteger.valueOf(i));
    return r;
}
```

Output thật:

```text
20! = 2432902008176640000
21! unchecked = -4249290049419214848   (tran am tham)
21! multiplyExact -> long overflow
0! = 1, 1! = 1
25! BigInteger = 15511210043330985984000000
1000! co 2568 chu so
```

Đọc kết quả: `21!` nếu dùng `*` thường cho ra **số âm** `-4249290049419214848` mà không có cảnh báo; `multiplyExact` ném `ArithmeticException: long overflow` nên lỗi lộ ra ngay. `0! = 1` đúng vì vòng lặp bắt đầu từ `2` không chạy, `r` giữ nguyên `1`.

**Đệ quy và "đệ quy đuôi":** `n * factorial(n - 1)` không phải đuôi vì còn phép nhân *sau* khi call trả về, nên frame phải được giữ. Thử `recFact(1_000_000)` cho:

```text
recFact(1_000_000) -> StackOverflowError (da vao sau toi thieu 9533 tang)
```

Với stack mặc định trên máy chạy thử, đệ quy sụp ở khoảng 9500 tầng. Con số này phụ thuộc kích thước stack (`-Xss`) và kích thước frame nên mỗi máy mỗi khác; điều chắc chắn là nó **hữu hạn** và nhỏ hơn nhiều so với `n` có thể gặp.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Viết lại thành đệ quy đuôi `go(n, acc)` có cứu được không? *Vì sao hỏi tiếp:* ta vừa thấy đệ quy tràn stack, bước tự nhiên là hỏi liệu đổi dạng đệ quy có hết tràn không.
**Đáp:** Không. Đệ quy đuôi chỉ có lợi khi trình biên dịch/VM **biến call đuôi thành nhảy (jump)** để tái sử dụng frame. JVM không làm điều đó (Scala biên dịch đệ quy đuôi tự gọi thành vòng lặp ở mức trình biên dịch, Java thì không), nên bản Java vẫn tốn một frame mỗi tầng. Cách đúng: dùng vòng lặp.

**Hỏi xoáy 2:** Độ phức tạp thời gian với `BigInteger` là gì? *Vì sao hỏi tiếp:* dùng `BigInteger` để thoát tràn số, cần hỏi cái giá phải trả về thời gian.
**Đáp:** Không còn `O(n)`. Mỗi phép nhân số lớn tốn thời gian tỉ lệ với số chữ số, mà `n!` có xấp xỉ `n log n` chữ số, nên tổng chi phí lớn hơn `O(n)` đáng kể (`1000!` đã có 2568 chữ số).

**Hỏi xoáy 3:** Tính `n! mod m` thế nào? *Vì sao hỏi tiếp:* nếu chỉ cần phần dư thì có thể không cần số lớn, một biến thể thực tế của bài.
**Đáp:** Lấy modulo sau **mỗi** phép nhân (`r = r * i % m`) để `r` luôn nhỏ hơn `m`, không cần `BigInteger`; nếu `n >= m` thì kết quả là `0` vì `m` xuất hiện trong tích (với `m` nguyên tố hoặc hợp số đều có thừa số chia hết).

**Sai lầm hay gặp:** tin rằng `long` đủ cho mọi `n` trong đề; hậu quả là kết quả sai âm thầm ở `n >= 21`. Quên `0! = 1`.

**Nhớ:** tràn số nguyên trong Java là im lặng; dùng `xxxExact` hoặc `BigInteger`. Dùng vòng lặp thay đệ quy cho giai thừa. `0! = 1`.

## 4. Tìm tất cả anagram của một từ trong danh sách

**Câu hỏi:** Cho danh sách hàng triệu từ, người dùng liên tục hỏi "tìm các anagram của từ này". Thiết kế sao cho mỗi lần hỏi nhanh?

**Gợi ý suy luận:**

- Hai từ là anagram thì chúng giống nhau ở điều gì và khác nhau ở điều gì (cùng đa tập chữ cái, khác thứ tự)?
- Nếu bỏ đi phần "khác nhau" thì mỗi từ còn lại biểu diễn nào chung (dạng chính tắc)?
- Có cấu trúc dữ liệu nào tra theo key trong `O(1)` để gom các từ cùng dạng đó (`HashMap`)?

**Lập luận:** Quan hệ "là anagram" là quan hệ tương đương: giống nhau sau khi bỏ chi tiết thứ tự. Khi muốn bỏ một chi tiết X, ta ánh xạ mỗi phần tử về một dạng chính tắc không phụ thuộc X; ở đây sắp xếp các chữ cái cho ra chữ ký. Mọi từ cùng chữ ký là anagram của nhau, nên gom chúng vào `Map<String, List<String>>` theo chữ ký một lần. Mỗi lần hỏi chỉ cần tính chữ ký của từ cần tìm rồi tra bảng `O(1)`, thay vì so từng từ với từng từ. Key phải là `String` (bất biến, có `equals`/`hashCode` theo nội dung), không phải `char[]`.

**Đáp án ngắn:** tiền xử lý một lần, nhóm các từ theo chữ ký vào `Map<String, List<String>>`; mỗi lần tra tính chữ ký của từ cần tìm rồi tra bảng.

**Ví dụ:**

```java
static String signature(String w) {
    char[] cs = w.toLowerCase(Locale.ROOT).toCharArray();
    Arrays.sort(cs);
    return new String(cs);
}

static class AnagramIndex {
    private final Map<String, List<String>> bySig = new HashMap<>();
    AnagramIndex(Collection<String> words) {
        for (String w : words)
            bySig.computeIfAbsent(signature(w), k -> new ArrayList<>()).add(w);
    }
    List<String> anagramsOf(String w) { return bySig.getOrDefault(signature(w), List.of()); }
}
```

Với danh sách `listen, silent, enlist, google, gogole, cat, act, tac, dog`:

```text
signature(listen)=eilnst
listen -> [listen, silent, enlist]
Act -> [cat, act, tac]
xyz -> []
```

Bảng nhóm bên trong `Map`:

| Lock (chữ ký) | Các từ |
|---|---|
| `eilnst` | listen, silent, enlist |
| `eggloo` | google, gogole |
| `act` | cat, act, tac |
| `dgo` | dog |

Tra `"Act"`: chuyển thường thành `act`, sắp xếp ra `act`, tra bảng thấy ba từ. Tra `"xyz"` không có key nên `getOrDefault` trả danh sách rỗng, không `null`.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Độ phức tạp, và cải thiện thế nào? *Vì sao hỏi tiếp:* lời giải đã chạy đúng, bước tiếp theo luôn là phân tích chi phí và tối ưu.
**Đáp:** Tiền xử lý `O(m · k log k)` (`m` từ, mỗi từ dài khoảng `k`, `log k` đến từ phép sắp xếp). Mỗi lần tra `O(k log k)` để tính chữ ký rồi `O(1)` tra bảng. Nếu bảng chữ cái cố định (26 chữ) thì dùng mảng đếm tần suất 26 phần tử làm key, bỏ được `log k` còn `O(k)`. Khi chỉ cần tra **một lần** thì không cần dựng bảng: duyệt danh sách, so chữ ký từng từ với chữ ký đích.

**Hỏi xoáy 2:** Vì sao lock `Map` phải là chuỗi (bất biến)? *Vì sao hỏi tiếp:* ta dựa vào `Map` để tra nhanh, họ kiểm tra bạn hiểu điều kiện để key dùng đúng.
**Đáp:** `HashMap` đặt key vào bucket dựa trên `hashCode` lúc chèn. Nếu key là object thay đổi được và bị sửa sau đó, `hashCode` đổi, object nằm sai bucket và không tìm thấy nữa. `String` bất biến nên an toàn.

**Hỏi xoáy 3:** Chữ hoa, dấu, Unicode? *Vì sao hỏi tiếp:* dữ liệu thật hiếm khi sạch như ví dụ, đây là cạnh biên của bước chuẩn hóa.
**Đáp:** Dùng `toLowerCase(Locale.ROOT)` để không phụ thuộc locale máy (ví dụ locale Thổ Nhĩ Kỳ biến `I` thành `ı`); dấu thì chuẩn hóa bằng `Normalizer` trước khi sắp xếp. Một từ giống hệt chính nó có tính là anagram hay không là câu hỏi cần hỏi lại đề.

**Sai lầm hay gặp:** dùng key là `char[]` (so sánh theo tham chiếu, không bao giờ khớp) hoặc quên chuẩn hóa chữ hoa/thường, nên `"Act"` không tìm ra `"cat"`.

**Nhớ:** "giống nhau sau khi bỏ X" thì tạo primary key tắc bằng cách loại X rồi nhóm bằng `Map`. Chuẩn hóa hoa/thường bằng `Locale.ROOT`.

## 5. Đảo ngược chuỗi

**Câu hỏi:** Viết hàm đảo ngược một chuỗi. Vì sao không thể đảo ngay trên chuỗi gốc, và nếu vòng lặp chạy hết độ dài thì kết quả là gì?

**Gợi ý suy luận:**

- `String` trong Java có sửa được sau khi tạo không (tính bất biến)?
- Phần tử vị trí `i` đi về đâu sau khi đảo (hoán vị đối xứng `i` và `n-1-i`)?
- Mỗi cặp cần đổi mấy lần, và nếu đổi hai lần thì chuyện gì xảy ra (đối hợp)?
- Một ký tự luôn là một `char` không (cặp surrogate của Unicode)?

**Lập luận:** Vì `String` bất biến nên không đảo tại chỗ được, phải tạo chuỗi mới nên memory tối thiểu `O(n)`; làm việc trên `char[]` rồi dựng lại `String`. Phép đảo hoán đổi `i` với `n-1-i`, tức mỗi cặp chỉ cần đổi một lần. Vì vậy hai con trỏ tiến vào nhau chỉ tới giữa mảng. Nếu duyệt hết độ dài thì mỗi cặp bị đổi hai lần, mà đổi hai lần là trở lại như cũ, nên kết quả không đảo gì cả. Cuối cùng, emoji nằm ngoài BMP gồm hai `char` (cặp surrogate); đảo từng `char` đổi chỗ hai nửa và tạo chuỗi không hợp lệ, nên với Unicode đầy đủ dùng `StringBuilder.reverse()`. Điểm dễ nhầm là hoán đổi hết `n` lần (hoặc dùng `i < n` thay vì `i < j`) làm mỗi cặp bị đổi hai lần nên kết quả không đổi, và quên chuỗi rỗng hoặc một ký tự. Khi viết, kiểm tra ba ca biên: chuỗi rỗng, một ký tự, độ dài lẻ, rồi nói rõ bạn dùng `StringBuilder.reverse()` nếu cần xử lý Unicode.

**Đáp án ngắn:** chuyển sang `char[]`, hai con trỏ `i` (đầu) và `j` (cuối) tiến vào nhau cho đến khi `i >= j`, đổi chỗ rồi tạo `String` mới.

**Ví dụ:**

```java
static String reverse(String s) {
    char[] cs = s.toCharArray();
    for (int i = 0, j = cs.length - 1; i < j; i++, j--) {
        char t = cs[i]; cs[i] = cs[j]; cs[j] = t;
    }
    return new String(cs);
}
```

Và phiên bản lỗi chạy hết độ dài (`i < cs.length`) để thấy hậu quả:

```text
edcba |  | a | ba
chay het do dai: abcde (tro lai nhu cu)
```

Dòng đầu là `reverse("abcde")`, `reverse("")`, `reverse("a")`, `reverse("ab")`. Chuỗi rỗng và một ký tự trả về đúng nhờ điều kiện `i < j` sai ngay từ đầu. Bản lỗi trả về `abcde`, tức **không đảo gì cả**, đúng như phân tích cặp bị đổi hai lần.

Truy vết `reverse("abcd")`:

| Bước | `i` | `j` | Mảng sau khi đổi |
|---|---|---|---|
| đầu | 0 | 3 | `a b c d` |
| 1 | 0 | 3 | `d b c a` |
| 2 | 1 | 2 | `d c b a` |
| kết thúc | 2 | 1 | `i < j` sai, dừng |

**Chữ Unicode ngoài BMP:** emoji như `😀` là **cặp surrogate** (hai `char`). Thử với `"a😀b"`:

```text
emoji len(char)=4 codepoints=3
reverse char thuan -> surrogate dao: true
StringBuilder.reverse giu cap surrogate: true
```

Chuỗi có 4 `char` nhưng 3 ký tự thật. Đảo từng `char` làm hai nửa surrogate đổi vị trí, tạo chuỗi không hợp lệ. `new StringBuilder(s).reverse()` xử lý đúng cặp surrogate nên an toàn.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Khi nào dùng `StringBuilder.reverse()`? *Vì sao hỏi tiếp:* ta vừa tự cài hai con trỏ, họ hỏi khi nào nên dùng hàm có sẵn.
**Đáp:** Trong công việc thật, luôn dùng nó vì ngắn và đúng với surrogate. Chỉ tự cài hai con trỏ khi đề yêu cầu "không dùng hàm có sẵn" hoặc khi cần minh họa tư duy.

**Hỏi xoáy 2:** Đảo thứ tự các từ trong câu? *Vì sao hỏi tiếp:* đã nắm đảo chuỗi, biến thể gần nhất là đảo ở mức từ.
**Đáp:** Đảo cả chuỗi rồi đảo lại từng từ (mỗi từ đảo hai lần về đúng chiều), `O(n)` thời gian; hoặc tách bằng khoảng trắng rồi ghép ngược lại. Phải hỏi lại đề về khoảng trắng thừa.

**Sai lầm hay gặp:** duyệt hết độ dài (kết quả không đổi) hoặc đảo bằng nối chuỗi `result = s.charAt(i) + result` trong vòng lặp, ra `O(n²)` vì mỗi phép nối sao chép toàn bộ chuỗi.

**Nhớ:** chuỗi bất biến, đảo là `O(n)` thời gian và memory, dừng ở giữa; `StringBuilder.reverse()` xử lý đúng surrogate.

## 6. Đảo ngược danh sách liên kết tại chỗ

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Đảo ngược một danh sách liên kết đơn mà không cấp phát nút mới. Điều gì làm bài này dễ hỏng ngay ở dòng đầu tiên của vòng lặp?

**Gợi ý suy luận:**

- Nút trong danh sách đơn biết những gì về nút khác (chỉ có con trỏ `next`)?
- Nếu sửa `head.next` ngay thì phần còn lại của danh sách còn truy cập được không (mất tham chiếu)?
- Do đó cần giữ những biến nào, và vì sao không cần nút mới (ba con trỏ, `O(1)` memory)?

**Lập luận:** Danh sách đơn chỉ lưu nút kế tiếp, nên đảo nghĩa là quay mọi mũi tên `next` lại. Nhưng khi quay mũi tên của nút hiện tại, bạn mất đường tới phần còn lại, nên phải lưu `next` vào biến tạm trước khi sửa. Sau đó trỏ `head.next` về `prev`, rồi tiến `prev` và `head` lên một nút. Chỉ đổi hướng liên kết có sẵn, không tạo nút mới, nên memory `O(1)` và thời gian `O(n)`. Khi `head` là `null` thì `prev` đang giữ nút cuối cũ, chính là đầu danh sách mới, vì vậy trả về `prev`. Điểm dễ nhầm là sửa `next` trước khi lưu nút kế tiếp nên mất phần danh sách còn lại, hoặc trả về `head` cũ thay vì `prev`. Khi viết, thử tay trên danh sách rỗng, một nút và hai nút, và nói to ba biến `prev`, `cur`, `next` sau mỗi vòng lặp để người nghe theo dõi được.

**Đáp án ngắn:** lặp một lần, mỗi bước: lưu `next`, trỏ `cur.next` về `prev`, rồi tiến `prev` và `cur` lên. Trả về `prev` vì đó là đầu danh sách mới.

**Ví dụ:**

```java
final class Node<T> {
    T value; Node<T> next;
    Node(T value, Node<T> next) { this.value = value; this.next = next; }

    static <T> Node<T> reverse(Node<T> head) {
        Node<T> prev = null;
        while (head != null) {
            Node<T> next = head.next;   // giữ lại phần còn lại
            head.next = prev;           // quay mũi tên
            prev = head;
            head = next;
        }
        return prev;                    // đầu danh sách mới
    }
}
```

Kết quả chạy:

```text
1->2->3  =>  3->2->1
rong => (rong)
1 nut => 9
```

Truy vết với `1->2->3`:

| Vòng | `head` | `next` (lưu) | `head.next` sau khi sửa | `prev` sau | `head` sau |
|---|---|---|---|---|---|
| 1 | 1 | 2 | `null` | 1 | 2 |
| 2 | 2 | 3 | 1 | 2 | 3 |
| 3 | 3 | `null` | 2 | 3 | `null` |

Vòng lặp dừng khi `head == null`, `prev` trỏ nút `3`, mà `3.next = 2`, `2.next = 1`, `1.next = null`: danh sách `3->2->1`.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Bản đệ quy khác gì? *Vì sao hỏi tiếp:* sau bản lặp, người ta hay hỏi lời giải đệ quy tương đương và cái giá của nó.
**Đáp:** Đảo phần còn lại rồi nối nút hiện tại vào **cuối** danh sách đã đảo. Vẫn `O(n)` thời gian nhưng `O(n)` memory do stack, và danh sách đủ dài gây `StackOverflowError` (xem câu 3). Nên chọn bản lặp.

**Hỏi xoáy 2:** Biến thể thường hỏi tiếp? *Vì sao hỏi tiếp:* đã thành thạo thao tác con trỏ, họ cho thêm bài cùng kỹ thuật.
**Đáp:** Phát hiện chu trình (Floyd: con trỏ nhanh đi hai bước, chậm một bước; gặp nhau nghĩa là có vòng), tìm nút giữa (con trỏ nhanh tới cuối thì con trỏ chậm ở giữa), đảo từng nhóm `k` nút.

**Sai lầm hay gặp:** sửa `head.next` trước khi lưu `next`, hậu quả là mất toàn bộ phần còn lại của danh sách. Trả về `head` cũ (lúc này là `null`) thay vì `prev`. Không xử lý danh sách rỗng (`reverse(null)` đúng ra phải trả `null`).

**Nhớ:** lưu `next` trước khi quay mũi tên; trả về `prev`; xử lý danh sách rỗng.

## 7. Kiểm tra palindrome

**Câu hỏi:** "A man, a plan, a canal: Panama" có phải palindrome không? Viết hàm kiểm tra mà không tốn thêm memory.

**Gợi ý suy luận:**

- Palindrome đối xứng qua tâm thì ký tự `i` phải bằng ký tự nào (đối xứng `n-1-i`)?
- Có cần tạo chuỗi đảo để so sánh không, hay so thẳng hai đầu được (hai con trỏ)?
- Dấu cách, dấu câu và hoa/thường có tính không (làm rõ đề)?

**Lập luận:** Vì palindrome là đối xứng qua tâm nên chỉ cần so các cặp `(i, n-1-i)`; không cần dựng chuỗi đảo (tốn `O(n)` memory), hai con trỏ từ hai đầu tiến vào nhau là đủ, `O(1)` memory. Vì đề cho phép bỏ qua dấu câu, mỗi con trỏ phải nhảy qua ký tự không phải chữ hoặc số, và mọi lần nhảy đều phải giữ `i < j` để khỏi vượt biên khi chuỗi toàn ký tự đặc biệt. So sánh không phân biệt hoa/thường vì đề coi `A` và `a` là một. Định nghĩa đề đổi thì đáp án đổi (`"Aa"` là `false` nếu đề "chặt"), nên phải hỏi lại. Điểm dễ nhầm là bỏ qua các ca biên: chuỗi rỗng và chuỗi chỉ gồm ký tự đặc biệt (phải trả `true`), và để con trỏ vượt biên khi nhảy qua ký tự bị bỏ. Hãy hỏi lại định nghĩa với người phỏng vấn trước khi viết, rồi liệt kê hai hoặc ba ca thử trước khi báo xong.

**Đáp án ngắn:** hai con trỏ; bỏ qua ký tự không phải chữ hoặc số ở mỗi đầu; so sánh không phân biệt hoa thường; `O(n)` thời gian, `O(1)` memory.

**Ví dụ:**

```java
static boolean isPalindrome(String s) {
    int i = 0, j = s.length() - 1;
    while (i < j) {
        while (i < j && !Character.isLetterOrDigit(s.charAt(i))) i++;
        while (i < j && !Character.isLetterOrDigit(s.charAt(j))) j--;
        if (Character.toLowerCase(s.charAt(i++)) != Character.toLowerCase(s.charAt(j--))) {
            return false;
        }
    }
    return true;
}
```

Kết quả với các ca biên:

```text
"A man, a plan, a canal: Panama" -> true
"race a car" -> false
"" -> true
"!!!" -> true
"ab" -> false
"Aa" -> true
```

Ba ca đáng bàn: chuỗi rỗng là palindrome (không có cặp nào vi phạm); `"!!!"` cũng `true` vì sau khi bỏ ký tự đặc biệt không còn gì để so; `"Aa"` là `true` chỉ vì so sánh không phân biệt hoa thường. Nếu đề là "chặt" (giữ nguyên mọi ký tự) thì `"Aa"` là `false`.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Vì sao điều kiện `i < j` xuất hiện ở cả vòng lặp trong? *Vì sao hỏi tiếp:* đọc code ta thấy `i < j` lặp lại, họ hỏi bạn có hiểu nó chặn lỗi nào.
**Đáp:** Nếu chuỗi toàn ký tự đặc biệt, vòng lặp trong có thể đẩy `i` qua `j` hoặc vượt khỏi mảng; kiểm tra `i < j` chặn tràn chỉ số `StringIndexOutOfBoundsException`.

**Hỏi xoáy 2:** Tìm palindrome con dài nhất? *Vì sao hỏi tiếp:* kiểm tra một chuỗi đã xong, bài nâng cấp là tìm đoạn đối xứng trong chuỗi.
**Đáp:** Mở rộng từ mỗi tâm (cả tâm là một ký tự và tâm giữa hai ký tự), `O(n²)`; thuật toán Manacher còn `O(n)`.

**Sai lầm hay gặp:** so sánh bằng `==` trên `Character` object, hoặc bỏ sót ca chuỗi rỗng/chuỗi chỉ ký tự đặc biệt.

**Nhớ:** hai con trỏ `O(n)` thời gian, `O(1)` memory; hỏi lại định nghĩa, thử rỗng và chỉ ký tự đặc biệt.

## 8. Gộp nhiều `Iterator` thành một

**Câu hỏi:** Viết một `Iterator` nối nhiều `Iterator` thành một. Vì sao có bản `hasNext()` cho kết quả sai khi giữa các nguồn có nguồn rỗng?

**Gợi ý suy luận:**

- `hasNext()` được contract hứa trả lời câu hỏi nào (còn phần tử kế tiếp, không phải "nguồn hiện tại còn")?
- Phần tử kế tiếp có thể nằm sau mấy nguồn rỗng liên tiếp (cần nhảy nguồn)?
- Gọi `hasNext()` nhiều lần có được làm mất phần tử không (idempotent)?

**Lập luận:** Contract của `hasNext()` là trả lời "còn phần tử tiếp theo không", nên khi iterator hiện tại cạn, phần tử kế có thể nằm sau vài nguồn rỗng liên tiếp. Do đó `hasNext()` phải chủ động nhảy qua các nguồn rỗng bằng vòng lặp cho tới khi tìm được phần tử hoặc hết nguồn. Nếu chỉ kiểm tra `current.hasNext()` thì dừng sớm và trả `false` sai. Vì gọi `hasNext()` nhiều lần phải cho kết quả như nhau, nó chỉ được dịch chuyển giữa các nguồn chứ không được tiêu thụ phần tử; `next()` gọi `hasNext()` để bảo đảm có phần tử rồi mới lấy. Đây là mẫu Iterator kết hợp Composite. Điểm dễ nhầm là cài `hasNext()` có tác dụng phụ (nuốt phần tử) hoặc quên rằng `next()` phải ném `NoSuchElementException` khi hết. Khi review một iterator tự viết, gọi `hasNext()` hai lần liên tiếp phải cho cùng kết quả, và mọi nguồn rỗng ở đầu, giữa, cuối đều phải được thử.

**Đáp án ngắn:** giữ `Iterator<Iterator<T>>` (các nguồn) và `current`. Dùng vòng lặp trong `hasNext()` để nhảy nguồn; `next()` gọi `hasNext()` để bảo đảm có phần tử.

**Ví dụ:**

```java
final class ChainIterator<T> implements Iterator<T> {
    private final Iterator<Iterator<T>> sources;
    private Iterator<T> current = Collections.emptyIterator();

    ChainIterator(List<Iterator<T>> list) { this.sources = list.iterator(); }

    @Override public boolean hasNext() {
        while (!current.hasNext() && sources.hasNext()) current = sources.next();
        return current.hasNext();
    }

    @Override public T next() {
        if (!hasNext()) throw new NoSuchElementException();
        return current.next();
    }
}
```

Dựng bốn nguồn `[1,2]`, `[]`, `[]`, `[3]` rồi chạy:

```text
hasNext x3 lien tiep: truetruetrue
ra: 1 2 3 
rong hoan toan hasNext=false
next() khi het -> NoSuchElementException
```

Điểm quan trọng: gọi `hasNext()` ba lần liên tiếp vẫn `true` và **không làm mất phần tử đầu**, rồi duyệt ra đúng `1 2 3` dù giữa có hai nguồn rỗng. Nếu `hasNext()` chỉ kiểm tra `current.hasNext()` (không nhảy), kết quả sẽ dừng ở `2` và trả `false` sai.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Vì sao khởi tạo `current` bằng iterator rỗng? *Vì sao hỏi tiếp:* trong code có một chi tiết khởi tạo, họ muốn biết nó giải quyết ca biên nào.
**Đáp:** Để không phải xử lý ca `null` và ca danh sách nguồn rỗng: lúc đầu `current.hasNext()` là `false`, vòng lặp trong `hasNext()` tự chuyển sang nguồn đầu tiên.

**Hỏi xoáy 2:** Còn `remove()`? *Vì sao hỏi tiếp:* contract `Iterator` có ba method, ta mới xử lý hai.
**Đáp:** Từ Java 8 `Iterator.remove()` có cài mặc định ném `UnsupportedOperationException`; chỉ cài đặt khi đề yêu cầu (cần nhớ nguồn nào vừa trả phần tử). Nếu không cần tự viết: `Stream.concat`/`flatMap` hoặc `Iterators.concat` của Guava.

**Sai lầm hay gặp:** dùng đệ quy để nhảy nguồn rỗng (với hàng nghìn nguồn rỗng liên tiếp gây tràn stack), hoặc để `hasNext()` có tác dụng phụ làm mất phần tử khi gọi lặp.

**Nhớ:** `hasNext()` nhảy nguồn rỗng và không có tác dụng phụ; `next()` ném `NoSuchElementException` khi hết.

## 9. Viết hàm generic: biến đổi một danh sách thành danh sách khác

**Câu hỏi:** Vì sao `List<Integer>` không gán được cho `List<Number>` dù `Integer` là con của `Number`? Viết hàm `mapList` dùng được với nhiều kiểu.

**Gợi ý suy luận:**

- Nếu `List<Integer>` được coi là `List<Number>` thì có thể `add` kiểu nào vào (tính an toàn kiểu)?
- Lúc chạy, thông tin `T` còn tồn tại không (xóa kiểu, type erasure)?
- Đọc ra và ghi vào khác nhau ra sao về kiểu cần chấp nhận (producer / consumer, PECS)?

**Lập luận:** Nếu `List<Integer>` được coi là `List<Number>` thì có thể nhét `Double` vào danh sách thực chất toàn `Integer`, phá an toàn kiểu; vì vậy generic bất biến và kiểm tra chỉ ở lúc biên dịch (thông tin kiểu bị xóa khỏi bytecode). Để nới bất biến một cách an toàn dùng wildcard theo PECS. Với danh sách nguồn ta chỉ đọc, nên dùng `? extends A` (producer) và không được `add`. Với hàm biến đổi ta chỉ đưa `A` vào, nên dùng `? super A` (consumer), nhờ đó một `Function<Object, ...>` cũng dùng được. Cũng do xóa kiểu mà không viết được `new T[n]`. Điểm dễ nhầm là dùng `List<Object>` hay raw type để "linh hoạt", đánh mất kiểm tra kiểu lúc biên dịch. Nhớ quy tắc PECS: hàm chỉ đọc từ danh sách thì `? extends`, chỉ ghi vào thì `? super`, và khi vừa đọc vừa ghi thì dùng đúng kiểu tham số, không wildcard.

**Đáp án ngắn:** hàm nhận danh sách nguồn kiểu `A`, phép biến đổi `Function<A, B>`, trả danh sách `B`. Dùng wildcard để hàm dùng được với nhiều kiểu hơn.

**Ví dụ:**

```java
static <A, B> List<B> mapList(List<? extends A> in, Function<? super A, ? extends B> f) {
    List<B> out = new ArrayList<>(in.size());
    for (A a : in) out.add(f.apply(a));
    return out;
}

static <T extends Comparable<? super T>> T max(Collection<? extends T> c) {
    Iterator<? extends T> it = c.iterator();
    T best = it.next();                       // ném NoSuchElementException nếu rỗng
    while (it.hasNext()) { T x = it.next(); if (x.compareTo(best) > 0) best = x; }
    return best;
}
```

Kết quả:

```text
[5, 3, 4]                       // mapList(List.of("acing","the","java"), String::length)
[6, 18, 8] max=9 maxStr=zebra   // nhân đôi [3,9,4] thành List<Number>; max Integer; max String
max(rong) -> NoSuchElementException
```

Đáng chú ý: `mapList(ints, x -> (Number) (x * 2))` cho ra `List<Number>` từ `List<Integer>` nhờ `? extends B`. Bất biến hiện rõ khi viết thử `List<Number> n = new ArrayList<Integer>();` sẽ **lỗi biên dịch**.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** PECS nghĩa là gì trong hàm trên? *Vì sao hỏi tiếp:* chữ ký hàm dùng cả `extends` lẫn `super`, họ hỏi lý do chọn từng cái.
**Đáp:** `List<? extends A> in` là **nguồn** (producer): ta chỉ *đọc* `A` ra, dùng được cả `List<Integer>` khi `A = Number`, nhưng không được *thêm* vào (không biết kiểu con cụ thể). `Function<? super A, ...>` là **đích** (consumer): nó *nhận* `A`, nên một `Function<Object, ...>` cũng dùng được vì `Object` là cha của `A`.

**Hỏi xoáy 2:** `<T extends Comparable<? super T>>` khác `<T extends Comparable<T>>` thế nào? *Vì sao hỏi tiếp:* áp dụng PECS vào ràng buộc so sánh là ca thực tế nhất.
**Đáp:** Dạng đầu chấp nhận subclass mà `compareTo` được khai báo ở superclass. Ví dụ `class Apple extends Fruit implements Comparable<Fruit>`: `Apple` không phải `Comparable<Apple>` nhưng là `Comparable<? super Apple>` nên dạng đầu vẫn so sánh được các `Apple`; dạng sau thì loại nó.

**Hỏi xoáy 3:** Vì sao không viết `new T[n]`? *Vì sao hỏi tiếp:* xóa kiểu là gốc của bất biến, họ hỏi một hệ quả trực tiếp khác của nó.
**Đáp:** Do xóa kiểu, lúc chạy không biết `T` là gì nên không thể tạo mảng đúng kiểu mà mảng cần kiểm tra kiểu lúc chạy. Dùng `ArrayList<T>`, hoặc `(T[]) new Object[n]` với cảnh báo unchecked.

**Sai lầm hay gặp:** dùng raw type (`List` không tham số) làm mất kiểm tra biên dịch, lỗi `ClassCastException` bị đẩy ra lúc chạy; cố `add` vào `List<? extends X>`.

**Nhớ:** generic bất biến; PECS (Producer Extends, Consumer Super); `T extends Comparable<? super T>` cho so sánh; không dùng raw type.

## 10. Số nguyên tố

**Câu hỏi:** Kiểm tra `2147483647` có phải số nguyên tố không mà không thử hơn hai tỷ ước. Vì sao chỉ cần thử tới căn bậc hai, và có bẫy gì trong vòng lặp?

**Gợi ý suy luận:**

- Nếu `n = a × b` thì `a` và `b` có thể cùng lớn hơn `√n` không (tích sẽ ra sao)?
- Ước lớn của `n` có đi cặp với ước nhỏ không (tính đối xứng của phép chia)?
- Biểu thức `d * d` kiểu `int` có thể vượt giới hạn khi nào (tràn số)?

**Lập luận:** Nếu `n = a × b` mà cả hai đều lớn hơn `√n` thì tích đã lớn hơn `n`, vô lý; nên ít nhất một thừa số không vượt `√n`. Ước lớn luôn đi cặp với một ước nhỏ, nên nếu không có ước nào trong `2..√n` thì cũng không có ước nào lớn hơn. Vì vậy chỉ cần thử tới `√n` và độ phức tạp là `O(√n)`; bỏ các số chẵn thì còn một nửa. Điều kiện dừng viết `d * d <= n`, mà `d * d` kiểu `int` tràn khi `d ≈ 46341`, nên phải ép `(long) d * d`. Liệt kê nhiều số nguyên tố cùng lúc thì sàng Eratosthenes, gạch từ `i*i` vì bội nhỏ hơn đã bị gạch bởi thừa số nhỏ hơn.

**Đáp án ngắn:** loại `n < 2` và số chẵn (trừ `2`), rồi thử các ước lẻ `3, 5, 7, ...` đến `√n`. Liệt kê mọi số nguyên tố đến `N` thì dùng sàng Eratosthenes `O(N log log N)`.

**Ví dụ:**

```java
static boolean isPrime(int n) {
    if (n < 2) return false;
    if (n % 2 == 0) return n == 2;
    for (int d = 3; (long) d * d <= n; d += 2) {
        if (n % d == 0) return false;
    }
    return true;
}
```

Kết quả:

```text
2 3 5 7 11 13 17 19 23 29 31 37     // isPrime(i), i < 40
isPrime(1)=false (0)=false (-7)=false (2)=true (2147483647)=true
isPrime(MAX_INT) vong lap ~23170 lan chia (chi so le), ket qua true
sang den 100: 25 so nguyen to
```

Với số nguyên tố lớn nhất của `int` (`2147483647`), vòng lặp chỉ chạy khoảng `√n / 2 ≈ 23170` lần, thay vì hơn hai tỷ lần của cách ngây thơ thử mọi ước từ `2` đến `n-1`. Phép ép `(long) d * d` quan trọng: `d * d` kiểu `int` sẽ tràn khi `d ≈ 46341` và vòng lặp có thể chạy sai hoặc không dừng.

Sàng Eratosthenes đến `100` đánh dấu hợp số, bắt đầu gạch từ `i*i` (vì bội nhỏ hơn đã bị gạch bởi thừa số nhỏ hơn) và tìm ra `25` số nguyên tố, khớp với số thực tế đến 100.

_Đã chạy thử trên JDK 11._

**Hỏi xoáy 1:** Vì sao gạch bội từ `i*i` chứ không từ `2*i`? *Vì sao hỏi tiếp:* cùng ý "cặp ước" của phần Lập luận, áp dụng sang sàng.
**Đáp:** Mọi bội `k·i` với `k < i` đã bị gạch khi xử lý thừa số nguyên tố nhỏ của `k`. Bắt đầu từ `i*i` tiết kiệm công mà không bỏ sót.

**Hỏi xoáy 2:** Số rất lớn (vài trăm chữ số) làm sao? *Vì sao hỏi tiếp:* cách `O(√n)` vẫn quá chậm khi `n` khổng lồ.
**Đáp:** `BigInteger.isProbablePrime(certainty)` dùng kiểm tra xác suất kiểu Miller-Rabin: nhanh, nhưng kết luận "hợp số" là chắc chắn còn "nguyên tố" chỉ đúng với xác suất rất cao (sai số giảm theo `certainty`).

**Sai lầm hay gặp:** quên `n < 2` (coi `1`, `0`, số âm là nguyên tố), quên số `2` là số chẵn duy nhất nguyên tố, hoặc tính `d * d` bằng `int` gây tràn.

**Nhớ:** thử ước đến `√n`, loại `n < 2`, xét riêng `2`, ép `long` khi bình phương; liệt kê nhiều số thì dùng sàng.

## 11. Cách làm bài khi bị block: danh sách việc cần nói thành lời

**Câu hỏi:** Giữa buổi phỏng vấn bạn bí, không nghĩ ra lời giải tối ưu. Nên làm gì trong năm phút tiếp theo?

**Gợi ý suy luận:**

- Người phỏng vấn thực sự muốn đo điều gì: kết quả cuối hay cách bạn suy nghĩ (tiêu chí đánh giá)?
- Nếu bạn im lặng thì họ có thể gợi ý đúng chỗ kẹt không (thông tin nhận được)?
- Lời giải đúng nhưng chậm so với lời giải nhanh nhưng sai biên: cái nào đáng giá hơn (tính đúng đắn trước)?

**Lập luận:** Người phỏng vấn đánh giá quá trình suy nghĩ nhiều hơn kết quả cuối. Vì im lặng không cho họ thông tin gì, còn nói to một lời giải sai nhưng có lập luận thì họ có thể gợi ý đúng chỗ bạn kẹt; gợi ý không phải điểm trừ mà là cách họ mô phỏng làm việc chung. Do đó nên theo một khung cố định: làm rõ đề, nêu lời giải đơn giản kèm độ phức tạp, tối ưu có nêu đánh đổi, rồi chạy thử ca biên. Một lời giải đúng cộng phân tích tốt thắng lời giải tối ưu mà sai biên. Điểm dễ nhầm là nghĩ phải ra đáp án tối ưu ngay lần đầu và vì thế im lặng. Cách làm thực dụng: nói ngay lời giải brute force kèm độ phức tạp (đó là điểm sàn), chỉ ra phần lặp hoặc thừa, rồi cải tiến từng bước; nếu vẫn bí, hỏi một câu làm rõ cụ thể thay vì xin đáp án.

**Đáp án ngắn:** theo một khung cố định để không bị kẹt:

- Nhắc lại đề bằng lời mình, hỏi về kích thước dữ liệu, trùng lặp, `null`, có sắp xếp trước không.
- Đưa lời giải đơn giản trước, nêu độ phức tạp, rồi nêu đánh đổi thời gian và memory khi tối ưu.
- Viết hàm nhỏ có tên rõ ràng, tách phần tính toán khỏi phần in ra để dễ test.
- Chạy thử trước khi kết luận: rỗng, một phần tử, biên số, đầu vào lớn.
- Nếu đề bảo "tự cài đặt" một chức năng có trong thư viện, **không** gọi hàm thư viện đó; nếu chỉ là phần phụ của bài lớn hơn, dùng hàm thư viện cho nhanh.

**Ví dụ:** áp dụng khung vào "đảo chuỗi" (câu 5) trong buổi phỏng vấn:

| Bước | Điều bạn nói |
|---|---|
| Làm rõ | "Chuỗi có thể rỗng hoặc `null` không? Có Unicode ngoài BMP không?" |
| Cách ngây thơ | "Duyệt từ cuối nối vào chuỗi mới, nhưng nối `String` trong vòng lặp là `O(n²)`." |
| Cải tiến | "Dùng `char[]` và hai con trỏ đến giữa, `O(n)` thời gian, `O(n)` memory vì `String` bất biến." |
| Ca biên | "Thử `""`, `"a"`, `"ab"`, `"abcd"`, `"a😀b"`." |
| Mở rộng | "Nếu có emoji thì dùng `StringBuilder.reverse()`." |

**Hỏi xoáy 1:** Nếu không nghĩ ra lời giải tối ưu thì sao? *Vì sao hỏi tiếp:* đây chính là tình huống mở đầu của câu hỏi.
**Đáp:** Đưa lời giải đúng nhưng chậm, nêu rõ nó chậm ở đâu (vòng lặp lồng nhau, tính lặp) và hỏi người phỏng vấn muốn đánh đổi hướng nào. Lời giải đúng cộng phân tích tốt thắng lời giải tối ưu mà sai biên.

**Hỏi xoáy 2:** Có nên viết test không? *Vì sao hỏi tiếp:* ca biên là bước cuối của khung đã nêu, họ hỏi bạn có làm thật không.
**Đáp:** Nên, dù chỉ là vài dòng `main` hay bảng ca thử bằng lời. Việc tự đưa ra ca biên chứng tỏ bạn nghĩ về tính đúng đắn, điều đội ngũ cần ở một lập trình viên.

**Sai lầm hay gặp:** lao vào viết code ngay không làm rõ đề, hoặc im lặng khi kẹt thay vì nói điều mình đang thử.

**Nhớ:** nói to quá trình, làm rõ đề, đúng trước nhanh sau, tự thử ca biên.

Nguồn: Java Programming Interviews Exposed (Markham), Chương 7.

