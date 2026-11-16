# Câu hỏi: Collections, Đồng thời và Java hiện đại

Mỗi câu theo chuỗi suy ngược: **Câu hỏi** (theo hiện tượng, tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả "vì A nên B"), **Đáp án ngắn**, **Nhớ**, rồi **Ví dụ** chạy được và các **Hỏi xoáy** (mỗi cái có dòng "Vì sao hỏi tiếp" giải thích vì sao nó là bước kế tiếp). Kiến thức gốc: [Java Core Medium](/go?p=08-Java%2FJava-Core%2Fmedium%2Findex.md). Nền tảng liên quan: [Java Core cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md), [Concurrency nền tảng](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-13-concurrency-nen-tang.md), [Concurrency thực chiến](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md).

Quy ước: "Đã chạy thử trên JDK 11" nghĩa là output là kết quả thật. "Minh họa" nghĩa là chưa chạy trong môi trường này. Với lỗi concurrency, **số liệu thay đổi mỗi lần chạy**; điều cần nhìn là xu hướng (thiếu, sai) chứ không phải con số cụ thể. Máy kiểm chứng có 2 CPU; máy nhiều nhân sẽ lộ lỗi rõ hơn.

**Tóm tắt:**

- Phạm vi file: collection và concurrency ở mức trung bình, đủ để giải thích cả hành vi lẫn lý do thiết kế.
- `HashMap` biến key thành chỉ số bucket bằng `hashCode`, nhóm va chạm bằng danh sách rồi cây đỏ-đen, và resize khi vượt `0,75 × n`; key đổi sau khi `put` thì không tìm lại được.
- `ConcurrentHashMap` an toàn từng call chứ không an toàn cả chuỗi `get` rồi `put`; dùng `merge`, `compute`, `putIfAbsent` cho thao tác gộp.
- `volatile` chỉ bảo đảm hiển thị và thứ tự, không làm `i++` nguyên tử; `synchronized` thêm loại trừ lẫn nhau; không có happens-before thì thread đọc có thể thấy giá trị cũ mãi.
- Deadlock cần bốn điều kiện nên phá bằng thứ tự lấy lock cố định; thread pool xếp hàng trước và chỉ nở tới `max` khi queue đầy, nên `newFixedThreadPool` với queue vô hạn là bẫy.
- Stream lazy và `parallel()` biến state chung trong lambda thành race; generic bị xóa kiểu lúc chạy nên không `new T()`; proxy chỉ chặn call đi qua nó nên self-invocation mất `@Transactional`.
- Hay bị hỏi xoáy nhất: vì sao `volatile int` đếm vẫn thiếu, `ConcurrentHashMap` mà vẫn mất cập nhật, và `CompletableFuture` mặc định chạy trên pool nào.

## 1. `HashMap` hoạt động thế nào bên trong?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Tìm một key trong `HashMap` chứa cả triệu phần tử mà vẫn gần như tức thì, và khi nhiều key va chạm thì chuyện gì xảy ra? Hãy giải thích cơ chế bên trong.

**Gợi ý suy luận:**
- Muốn truy cập O(1) thì từ lock phải tính ra được một chỉ số mảng: hàm băm (`hashCode`) làm việc này ra sao?
- Nếu kích thước mảng là lũy thừa của 2, phép `hash % n` thay được bằng phép toán bit nào, và vì sao rẻ hơn?
- Hai key khác nhau cho cùng chỉ số thì phải làm gì (va chạm), và nếu chuỗi va chạm quá dài thì tra cứu thành O(?)?
- Mảng đầy dần thì xác suất va chạm đổi thế nào, nên cần làm gì với mảng (load factor, resize)?

**Lập luận:** Vì cần O(1) nên key phải biến thành chỉ số mảng bằng `hashCode`. Vì kích thước mảng là lũy thừa của 2 nên `hash % n` thay được bằng `hash & (n-1)`, chỉ rẻ khi chỉ vài bit thấp được dùng. Mà chỉ bit thấp được dùng nên `HashMap` phải trộn bit cao xuống bit thấp (`h ^ (h >>> 16)`) để `hashCode` tốt ở bit cao vẫn đóng góp. Hai key vẫn có thể rơi vào cùng bucket, nên bucket phải là danh sách; chuỗi dài làm tra cứu tụt về O(n), nên từ 8 phần tử (và bảng từ 64) chuyển sang cây đỏ-đen O(log n), còn bảng nhỏ hơn 64 thì mở rộng bảng cho dễ hơn. Mảng càng đầy càng dễ va chạm, nên vượt `0,75 × n` thì resize gấp đôi và phân phối lại. Điểm dễ nhầm là coi O(1) là bảo đảm tuyệt đối: nó chỉ đúng khi hash phân phối đều, còn khi `hashCode` kém (nhiều key cùng hash) thì suy thoái về O(log n) hoặc O(n). Hệ quả khi thiết kế: key phải bất biến và `hashCode` phân phối tốt, và nếu biết trước số phần tử thì đặt dung lượng ban đầu để tránh resize lặp lại.

**Đáp án ngắn:** Mảng bucket (mặc định 16, cấp phát lười ở lần `put` đầu); chỉ số bucket là `(n-1) & spread(hashCode)`. Va chạm nối thành danh sách, chuỗi dài từ 8 và bảng từ 64 thì thành cây đỏ-đen; vượt `0,75 × n` thì resize gấp đôi.

**Nhớ:** Bảng nhỏ hơn 64 mà chuỗi dài thì `HashMap` resize chứ không tạo cây. Resize xảy ra ở phần tử thứ 13 với bảng 16.

**Ví dụ:** đọc `table` bằng reflection để thấy đúng cơ chế.

```java
HashMap<Integer, String> m = new HashMap<>();
// tableLen(m) doc truong 'table' bang reflection (--add-opens java.base/java.util=ALL-UNNAMED)
for (int i = 1; i <= 13; i++) m.put(i, "v");

// khoa ep va cham: hashCode() luon tra 42
HashMap<Collide, Integer> c = new HashMap<>();
for (int i = 0; i < 12; i++) c.put(new Collide(i), i);
```

```text
moi tao: table=0 (null, cap phat lazy)
sau put thu 1: table.length=16, size=1
sau put thu 12: table.length=16, size=12
sau put thu 13: table.length=32, size=13
-- chi so bucket = (n-1) & spread(hash), n=16:
  apple hashCode=93029210 spread=93030097 -> bucket 1
  banana hashCode=-1396355227 spread=-1396317280 -> bucket 0
  cherry hashCode=-1361513063 spread=-1361552575 -> bucket 1
-- ep va cham: 12 key cung hashCode=42, bang 16 phan tu
  size=8 table.length=16
  size=9 table.length=32
  size=10 table.length=64
  size=12 table.length=64
  loai node trong bucket: TreeNode
```

_Đã chạy thử trên JDK 11._ Ba điều rút ra: (1) resize xảy ra ở phần tử thứ **13** (vượt ngưỡng `16 × 0,75 = 12`); (2) với 12 key cùng hash, bảng tự phình 16, 32, 64 trước, rồi mới thành `TreeNode` (đúng quy tắc chuỗi dài và bảng từ 64); (3) `apple` và `cherry` cùng bucket 1: va chạm là chuyện bình thường.

**Hỏi xoáy 1:** Vì sao lock nên bất biến?
**Vì sao hỏi tiếp:** Từ cơ chế "bucket quyết định bởi `hashCode`", điều gì hỏng nếu key đổi sau khi đã `put`?
**Đáp:** `hashCode` quyết định bucket lúc `put`. Sửa key sau đó làm `hashCode` đổi, phần tử nằm sai bucket và không tìm lại được (demo `MutKey` ở [câu 2 bài Java Core cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md)).

**Hỏi xoáy 2:** Vì sao resize có thể gây vấn đề trong sản phẩm?
**Vì sao hỏi tiếp:** Cơ chế resize sao chép toàn bộ phần tử. Chi phí đó ảnh hưởng gì trong hệ thống thật?
**Đáp:** Resize sao chép và phân phối lại toàn bộ phần tử, một lần O(n), có thể gây giật latency. Biết trước số phần tử thì khởi tạo `new HashMap<>(expected / 0.75f + 1)` để tránh resize nhiều lần.

**Hỏi xoáy 3:** `HashMap` dùng chung giữa các thread thì hỏng thế nào?
**Vì sao hỏi tiếp:** Cơ chế trên không có lock nào bảo vệ. Điều gì xảy ra khi nhiều thread cùng ghi?
**Đáp:** Mất cập nhật (xem câu 2), và ở Java 7 resize đồng thời có thể tạo vòng trong danh sách làm `get` lặp vô hạn. Java 8 sửa vòng đó nhưng vẫn không an toàn.

**Sai lầm hay gặp:** Tin vào thứ tự duyệt, hoặc nghĩ O(1) là "luôn nhanh" trong khi `hashCode` kém làm mọi thứ dồn vào một bucket.

## 2. `ConcurrentHashMap` khác gì `HashMap` và `Hashtable`?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Có người nói "`ConcurrentHashMap` thread-safe nên cứ `get` rồi `put` là đúng". Vì sao tăng một bộ đếm kiểu đó vẫn mất cập nhật, và `ConcurrentHashMap` khác `HashMap`, `Hashtable` chỗ nào?

**Gợi ý suy luận:**
- `get` rồi `put` là mấy bước? Giữa hai bước thread khác có chen vào được không (check-then-act, read-modify-write)?
- An toàn của từng call riêng lẻ có suy ra an toàn cho cả chuỗi call không?
- `Hashtable` lock cả bảng: điều đó đắt thế nào khi nhiều thread? Có cách lock nhỏ hơn không (lock theo bucket, CAS)?

**Lập luận:** Vì `get` rồi `put` là hai call riêng nên giữa chúng thread khác có thể ghi, và hai thread cùng đọc 5 rồi cùng ghi 6 sẽ mất một lần tăng. An toàn từng call không suy ra an toàn cả cụm, nên cần thao tác nguyên tử cả cụm (`merge`, `compute`, `putIfAbsent`). Về hiệu năng, `Hashtable` lock toàn bảng nên mọi thread xếp hàng; `ConcurrentHashMap` chỉ lock nút đầu của từng bucket (hoặc dùng CAS khi bucket rỗng) nên các thread ghi vào bucket khác nhau không block nhau. Điểm dễ nhầm là hiểu "thread-safe" là mọi chuỗi thao tác đều đúng; thực ra nó chỉ bảo đảm từng call riêng lẻ không làm hỏng cấu trúc. Khi review, thấy cặp `get` rồi `put` (check-then-act) trên `ConcurrentHashMap` thì thay bằng `merge`, `compute` hoặc `putIfAbsent`, và giữ hàm truyền vào ngắn, không gọi code chậm vì nó chạy lúc đang giữ lock bucket.

**Đáp án ngắn:** `Hashtable` lock toàn bảng nên chậm; `ConcurrentHashMap` lock theo bucket và dùng CAS, nhưng chỉ từng thao tác riêng lẻ an toàn. Muốn đúng với chuỗi thao tác thì dùng thao tác nguyên tử cả cụm như `merge` hay `putIfAbsent`.

**Nhớ:** Java 8+ dùng CAS cho bucket rỗng và `synchronized` trên nút đầu bucket, đọc gần như không lock. Không cho `null` (để `get` không mơ hồ), `size()` chỉ là ước lượng.

**Ví dụ:** 8 thread cùng tăng bộ đếm `"hits"` mỗi thread 10.000 lần.

```java
// SAI: get roi put, hai buoc rieng le
Integer v = map.get("hits"); map.put("hits", v + 1);
// DUNG: mot thao tac nguyen tu
map.merge("hits", 1, Integer::sum);
```

```text
CHM get+put (khong nguyen tu): 41905 / ky vong 80000
CHM merge (nguyen tu)        : 80000 / ky vong 80000
synchronizedMap get+put      : 45127 / ky vong 80000
```

_Đã chạy thử trên JDK 11. Con số mất mát thay đổi mỗi lần chạy._ `ConcurrentHashMap` và `synchronizedMap` đều **mất gần một nửa** cập nhật khi viết `get` rồi `put`: mỗi call an toàn, nhưng khoảng trống giữa hai call thì không. Chỉ thao tác nguyên tử (`merge`) mới đúng.

**Hỏi xoáy 1:** Vậy khi nào `synchronizedMap` đúng?
**Vì sao hỏi tiếp:** Ví dụ cho thấy `synchronizedMap` cũng mất cập nhật. Vậy khi nào nó mới dùng đúng được?
**Đáp:** Khi lock **cả cụm** thao tác bằng `synchronized (map) { ... }` (client-side locking). Nhưng đó là lock toàn map, mất lợi thế của `ConcurrentHashMap`.

**Hỏi xoáy 2:** `computeIfAbsent` có dùng để cache kết quả tốn kém không?
**Vì sao hỏi tiếp:** `merge`/`compute` giúp thao tác nguyên tử. Dùng chúng (`computeIfAbsent`) để cache kết quả tốn kém thì có an toàn không?
**Đáp:** Có, nó chạy hàm tính **tối đa một lần** cho mỗi key. Nhưng hàm tính **không được** sửa chính map đó (có thể deadlock hoặc ném lỗi) và nên ngắn vì giữ lock bucket trong lúc tính.

**Sai lầm hay gặp:** Tin "đã dùng `ConcurrentHashMap` nên thread-safe" rồi viết `if (!map.containsKey(k)) map.put(k, v)`; dùng `putIfAbsent`.

## 3. `ArrayList` mở rộng thế nào? Fail-fast là gì?

**Câu hỏi:** Thêm 40 phần tử vào `ArrayList` thì bên trong xảy ra gì, và vì sao xóa phần tử trong lúc duyệt bằng `for-each` lúc thì ném `ConcurrentModificationException`, lúc lại không?

**Gợi ý suy luận:**
- Mảng có co giãn được không? Nếu "mở rộng" thì thực chất là làm gì?
- Nếu mỗi lần chỉ cộng thêm một hằng số thì chi phí sao chép tổng cộng thế nào, khác gì nhân hệ số?
- Iterator làm sao biết danh sách bị sửa từ bên ngoài? Cái đếm đó (`modCount`) được so ở thời điểm nào?
- Nếu kiểm tra chỉ xảy ra ở `next()` thì có tình huống nào `hasNext()` đã báo hết trước đó không?

**Lập luận:** Vì mảng không co giãn nên mở rộng là cấp mảng mới lớn hơn rồi sao chép. Mở rộng theo hệ số nhân (khoảng 1,5 lần) thì số lần sao chép giảm nhanh, nên chi phí khấu hao còn O(1) mỗi phần tử; nếu chỉ cộng hằng số thì tổng chi phí thành O(n²). Iterator ghi lại `modCount` lúc tạo và so lại ở mỗi `next()`, khác thì ném CME. Mà kiểm tra chỉ ở `next()`, còn `hasNext()` chỉ so `cursor != size`: xóa phần tử kề cuối làm `size` giảm nên `hasNext()` trả `false` trước khi `next()` kịp kiểm tra, vòng lặp thoát yên lặng. Vì thế fail-fast chỉ là cố gắng phát hiện bug chứ không phải bảo đảm. Điểm dễ nhầm là coi việc không thấy CME nghĩa là code đúng: trường hợp xóa phần tử kề cuối thoát yên lặng và có thể bỏ sót phần tử. Vì vậy muốn xóa khi đang duyệt phải dùng `Iterator.remove()` hoặc `removeIf`, và biết trước kích thước thì khởi tạo `new ArrayList<>(n)` để tránh sao chép.

**Đáp án ngắn:** Khi đầy, `ArrayList` cấp mảng mới lớn khoảng 1,5 lần rồi sao chép, nên chi phí thêm khấu hao O(1). Fail-fast dùng `modCount` để phát hiện sửa đổi trong lúc duyệt, nhưng chỉ là cố gắng hết sức, không bảo đảm.

**Nhớ:** Biết trước kích thước thì truyền dung lượng ban đầu. Muốn xóa an toàn khi duyệt: `Iterator.remove()`, `removeIf`.

**Ví dụ:**

```java
ArrayList<Integer> l = new ArrayList<>();
// cap(l) doc elementData.length bang reflection
for (int i = 1; i <= 40; i++) l.add(i);   // in khi dung luong doi

for (String n : names) if (n.equals("B")) names.remove(n);   // names = [A,B,C,D]
```

```text
new ArrayList(): capacity=0
size=1->cap=10  size=11->cap=15  size=16->cap=22  size=23->cap=33  size=34->cap=49
xoa 'B' khi duyet -> ConcurrentModificationException
xoa phan tu ke cuoi khi duyet: KHONG nem loi, ket qua [A, C] (hasNext() tra false vi size doi)
removeIf: [A, C, D]
Iterator.remove: [A, D]
```

_Đã chạy thử trên JDK 11 (dùng `--add-opens java.base/java.util=ALL-UNNAMED` để đọc dung lượng)._ Dòng thứ 2: 10, 15, 22, 33, 49 là mỗi lần nhân khoảng 1,5. Dòng 4 là một góc khuất nổi tiếng: xóa **phần tử kề cuối** khi duyệt không ném lỗi, vì sau khi xóa `size` giảm nên `hasNext()` trả `false` trước khi `next()` kịp kiểm tra `modCount`. Fail-fast chỉ "cố gắng", không phải bảo đảm.

**Hỏi xoáy 1:** Xóa an toàn trong lúc duyệt thế nào?
**Vì sao hỏi tiếp:** Đã biết fail-fast phát hiện sửa đổi trong lúc duyệt. Vậy cách xóa đúng khi đang duyệt là gì?
**Đáp:** `Iterator.remove()`, `removeIf`, hoặc duyệt ngược theo chỉ số, hoặc thu thập rồi `removeAll`.

**Hỏi xoáy 2:** `CopyOnWriteArrayList` khác thế nào?
**Vì sao hỏi tiếp:** Fail-fast chỉ báo lỗi, không bảo vệ gì cả. Có cấu trúc nào cho phép duyệt mà không bao giờ ném CME không, và đổi lại mất gì?
**Đáp:** Mỗi lần ghi sao chép cả mảng, iterator duyệt trên bản chụp (snapshot) nên **không bao giờ ném CME** nhưng thấy dữ liệu cũ. Hợp khi đọc rất nhiều, ghi rất ít (danh sách listener).

**Sai lầm hay gặp:** Tin rằng "không thấy CME nghĩa là an toàn" (xem dòng 4), hoặc dùng `ArrayList` chung giữa thread và đổ lỗi cho `modCount`.

## 4. `synchronized` và `volatile`?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** 4 thread cùng tăng một biến đếm, mỗi thread 100.000 lần. Vì sao `volatile int` vẫn cho kết quả thiếu so với 400.000, và `synchronized` với `volatile` khác nhau ở đâu?

**Gợi ý suy luận:**
- `i++` thật ra gồm mấy bước máy (đọc, cộng, ghi)? Hai thread có thể xen vào giữa các bước đó không?
- Một ghi vào biến chia sẻ cần ba tính chất nào: nguyên tử, hiển thị, thứ tự?
- `volatile` bảo đảm tính chất nào trong ba, và không bảo đảm tính chất nào?
- `synchronized` và CAS (`AtomicInteger`) mỗi bên giải quyết nguyên tử bằng cách nào?

**Lập luận:** Vì `i++` là đọc, cộng, ghi nên hai thread có thể cùng đọc 5 và cùng ghi 6, mất một lần tăng. `volatile` chỉ bảo đảm hiển thị và thứ tự của một biến, không làm cả ba bước thành nguyên tử, nên vẫn mất cập nhật. `synchronized` loại trừ lẫn nhau cho cả khối nên ba bước không bị cắt ngang, đồng thời cho hiển thị và thứ tự. `AtomicInteger` đạt nguyên tử bằng CAS của CPU mà không lock. Vậy `volatile` chỉ hợp khi mỗi lần ghi độc lập với giá trị cũ, như cờ trạng thái. Điểm dễ nhầm là tin `volatile` "làm biến an toàn": nó chỉ an toàn cho đọc hoặc ghi đơn lẻ, còn mọi phép read-modify-write (`i++`, `count = count + 1`) cần nguyên tử thật. Khi review, gặp `volatile` trên một bộ đếm là dấu hiệu lỗi; chọn `AtomicInteger`, `LongAdder` hoặc `synchronized` tùy mức tranh chấp.

**Đáp án ngắn:** `synchronized` cho cả loại trừ lẫn nhau, hiển thị và thứ tự; `volatile` chỉ cho hiển thị và thứ tự của một biến, không làm `i++` nguyên tử. Bộ đếm nên dùng `AtomicInteger` hoặc `LongAdder`.

**Nhớ:** `volatile` hợp cho cờ trạng thái đơn (`running`, `stop`). Hành động phức hợp (đọc rồi ghi, check-then-act) cần `synchronized` hoặc Atomic.

**Ví dụ:** 4 thread, mỗi thread tăng 100.000 lần (kỳ vọng 400.000).

```java
static volatile int vcount = 0;  static int plain = 0;  static int synced = 0;
static AtomicInteger atomic = new AtomicInteger();
race(() -> vcount++);
race(() -> plain++);
race(() -> { synchronized (LOCK) { synced++; } });
race(atomic::incrementAndGet);
```

```text
ky vong 400000
volatile int ++ : 381154
int thuong ++    : 399507
synchronized ++  : 400000
AtomicInteger    : 400000
```

_Đã chạy thử trên JDK 11. Con số mất mát thay đổi mỗi lần chạy, và trên máy ít nhân (2 CPU) lỗi ít lộ hơn; trên máy nhiều nhân mất mát lớn hơn nhiều._ `volatile int` vẫn mất cập nhật: `volatile` làm mỗi lần đọc/ghi thấy giá trị mới nhất nhưng không ngăn hai thread xen vào giữa ba bước của `++`. Chỉ hai dòng cuối đúng.

**Hỏi xoáy 1:** Vậy `volatile` hữu ích ở đâu?
**Vì sao hỏi tiếp:** Nếu `volatile` không cho nguyên tử thì còn hữu ích ở đâu, vì có cần nó không?
**Đáp:** Cờ dừng, công bố một tham chiếu bất biến (`volatile Config config`), double-checked locking. Xem câu 5 cho minh chứng về hiển thị.

**Hỏi xoáy 2:** `AtomicInteger` bên dưới làm gì?
**Vì sao hỏi tiếp:** `AtomicInteger` cho nguyên tử mà không lock. Cơ chế bên dưới là gì và có giới hạn nào?
**Đáp:** CAS (compare-and-swap) của CPU: "nếu giá trị vẫn là X thì ghi Y", lặp lại nếu thất bại. Không lock nhưng tốn khi tranh chấp cao; khi đó dùng `LongAdder` (chia ô, cộng dồn lúc đọc).

**Sai lầm hay gặp:** Dùng `volatile` cho `count++` hoặc cho điều kiện kiểu "nếu ... thì ghi" (check-then-act).

## 5. Java Memory Model và happens-before?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Một thread chạy `while (!stop) n++;`, thread `main` đặt `stop = true` nhưng thread con không bao giờ dừng. Vì sao, và `volatile` sửa điều đó bằng cách nào?

**Gợi ý suy luận:**
- Mỗi CPU có cache và thanh ghi riêng: giá trị thread này ghi có chắc thread kia thấy ngay không?
- Compiler/JIT được sắp xếp lại lệnh hoặc giữ biến trong thanh ghi khi nào (điều kiện về kết quả trong một thread)?
- Khi không có gì ràng buộc giữa thread ghi và thread đọc thì Java Memory Model cho phép điều gì?
- Quan hệ happens-before nói gì về việc ghi này chắc chắn được thấy bởi lần đọc kia?

**Lập luận:** Vì CPU có cache riêng và JIT được phép giữ biến trong thanh ghi miễn kết quả trong một thread không đổi, nên JIT thấy `stopPlain` không đổi trong vòng lặp và đọc nó đúng một lần (hoisting). JMM chỉ bảo đảm thread đọc thấy giá trị mới khi có quan hệ happens-before giữa ghi và đọc; ở đây không có, nên thread con có thể thấy giá trị cũ vĩnh viễn. `volatile` tạo happens-before (ghi `volatile` happens-before đọc sau đó) và buộc đọc lại memory mỗi vòng, nên thread dừng. Vì hành vi này không được đảm bảo và phụ thuộc JIT, CPU, tải, test chạy được không chứng minh code đúng. Điểm dễ nhầm là nghĩ giá trị mới "rồi sẽ tới sau một lúc": JMM không hứa điều đó, thread đọc có thể không bao giờ thấy. Khi chia sẻ cờ hoặc dữ liệu giữa các thread, luôn phải có một cạnh happens-before rõ ràng (`volatile`, lock, `join`, `Future.get`), và đừng suy từ việc "chạy thử thấy ổn".

**Đáp án ngắn:** Không có happens-before giữa ghi và đọc thì thread đọc có thể thấy giá trị cũ mãi; thêm `volatile` (hoặc lock chung) tạo quan hệ đó và sửa lỗi.

**Nhớ:** Các quan hệ chính: mở lock monitor happens-before lần lock sau cùng monitor, ghi `volatile` happens-before đọc sau, `start()` happens-before thread con, thread con happens-before `join()`, cộng tính bắc cầu.

**Ví dụ:** cờ dừng không `volatile` (giải thích có khả năng nhất cho hiện tượng này là JIT nâng phép đọc ra ngoài vòng lặp; JMM không đảm bảo hành vi nào cả).

```java
static boolean stopPlain = false;
static volatile boolean stopVol = false;

Thread t1 = new Thread(() -> { long n = 0; while (!stopPlain) n++; });
t1.setDaemon(true); t1.start();
Thread.sleep(300); stopPlain = true;       // main ghi
t1.join(2000);                             // doi toi da 2 giay
System.out.println("[plain] luong con song: " + t1.isAlive());
// lap lai y het voi stopVol
```

```text
[plain] luong con song sau 2s cho: true
[volatile] luong dung
[volatile] luong con song sau 2s cho: false
```

_Đã chạy thử trên JDK 11 (HotSpot server JIT)._ Vòng lặp không `volatile` **không bao giờ thoát**: JIT thấy `stopPlain` không đổi trong thân vòng lặp nên đưa phép đọc ra ngoài vòng (hoisting), đọc đúng một lần. Thêm `volatile` thì mọi lần kiểm tra đều đọc lại memory và thread dừng. Lưu ý: đây là hành vi **không đảm bảo**; chạy ở chế độ khác có thể "may mắn" thoát, đó chính là điều nguy hiểm.

Timeline tương ứng:

| Bước | Thread `main` | Thread `t1` | Giá trị `stopPlain` t1 nhìn thấy |
|---|---|---|---|
| 1 | | vào vòng lặp, đọc `stopPlain` = false | false |
| 2 | `stopPlain = true` | (JIT đã giữ giá trị trong thanh ghi) | **false (cũ)** |
| 3 | | tiếp tục lặp mãi | false |
| 2' (có `volatile`) | ghi `stopVol = true` | đọc `stopVol` mỗi vòng | **true**, thoát |

**Hỏi xoáy 1:** Hai thread tăng cùng một biến trong `synchronized` khác lock thì sao?
**Vì sao hỏi tiếp:** Happens-before của `synchronized` gắn với một monitor cụ thể. Nếu hai thread dùng lock khác nhau thì sao?
**Đáp:** Không có happens-before (mở lock A không liên quan lần lock B), nên cả loại trừ lẫn hiển thị đều hỏng. Phải dùng **cùng một lock**.

**Hỏi xoáy 2:** Vì sao `Thread.sleep()` không thay được đồng bộ?
**Vì sao hỏi tiếp:** Có người "sửa" bằng `Thread.sleep()`. Vì sao đó không phải lời giải?
**Đáp:** `sleep` không tạo happens-before. Nó chỉ làm tình huống "may mắn" xảy ra thường hơn, bug vẫn còn.

**Sai lầm hay gặp:** "Test chạy được nên đúng". Lỗi hiển thị phụ thuộc JIT, CPU, tải; có thể chỉ xuất hiện trên production.

## 6. Deadlock là gì, tránh thế nào?

**Câu hỏi:** Hai thread treo mãi, không báo lỗi, CPU gần 0%. Đó là hiện tượng gì, phát hiện và tránh thế nào?

**Gợi ý suy luận:**
- Thread 1 giữ lock A chờ B, thread 2 giữ B chờ A: kịch bản đó có thoát được không?
- Để kẹt như vậy cần đủ những điều kiện nào (loại trừ lẫn nhau, giữ-và-chờ, không chiếm đoạt, chờ vòng)? Phá một điều kiện thì sao?
- Điều kiện nào dễ phá nhất trong code thực tế mà không đổi thiết kế (gợi ý: thứ tự lấy lock)?

**Lập luận:** Vì mỗi thread giữ một lock và chờ lock kia nên cả hai chờ vĩnh viễn: đó là deadlock. Deadlock cần đủ bốn điều kiện cùng lúc, nên phá một điều kiện là hết. Phá điều kiện chờ vòng là rẻ nhất: nếu mọi thread đều lấy lock theo cùng một thứ tự cố định toàn cục (A rồi B) thì không thể có vòng. Còn `tryLock(timeout)` phá điều kiện giữ-và-chờ. Để phát hiện, JVM biết thread nào chờ monitor của thread nào, nên `jstack` hoặc `ThreadMXBean.findDeadlockedThreads()` tìm ra vòng. Điểm dễ nhầm là nghĩ deadlock phải kèm lỗi hay CPU cao; thực tế các thread chỉ im lặng chờ nhau, nên phải nhìn thread dump mới thấy. Khi thiết kế, đặt một thứ tự lock toàn cục và tránh gọi code ngoài (callback, method có thể bị override) trong lúc đang giữ lock, vì chúng có thể âm thầm lấy một lock khác theo thứ tự ngược.

**Đáp án ngắn:** Deadlock là chờ vòng tròn giữa các thread; tránh bằng thứ tự lock cố định, giữ lock ngắn, `tryLock(timeout)`, không gọi code lạ khi đang giữ lock. Phát hiện bằng `jstack` hoặc `ThreadMXBean`.

**Nhớ:** Bốn điều kiện: loại trừ lẫn nhau, giữ-và-chờ, không chiếm đoạt, chờ vòng. Phá một là đủ.

**Ví dụ:**

```java
Thread t1 = new Thread(() -> { synchronized (A) { sleep(100); synchronized (B) { ... } } }, "luong-1");
Thread t2 = new Thread(() -> { synchronized (B) { sleep(100); synchronized (A) { ... } } }, "luong-2");
// sau 500 ms:
ThreadMXBean mx = ManagementFactory.getThreadMXBean();
long[] ids = mx.findDeadlockedThreads();
for (ThreadInfo ti : mx.getThreadInfo(ids)) ...
```

```text
deadlock phat hien: 2 luong
  luong-1 dang cho khoa cua luong-2 (trang thai BLOCKED)
  luong-2 dang cho khoa cua luong-1 (trang thai BLOCKED)
```

_Đã chạy thử trên JDK 11._ Cách sửa: cả hai thread đều lock `A` rồi mới `B`:

```java
Runnable r = () -> { synchronized (A) { sleep(100); synchronized (B) { ... } } };
```

```text
f1 xong
f2 xong
thu tu khoa co dinh A -> B: khong deadlock
```

_Đã chạy thử trên JDK 11 (chương trình riêng, vì cặp lock của ví dụ trên đã kẹt vĩnh viễn)._ Lưu ý khi tự thử: nếu chạy lại cùng cặp lock `A`, `B` sau khi đã deadlock, thread mới cũng kẹt theo; dùng lock mới hoặc chương trình mới.

**Hỏi xoáy 1:** Lock theo thứ tự khi key là hai tài khoản chuyển tiền `from`, `to`?
**Vì sao hỏi tiếp:** Thứ tự cố định dễ nói, nhưng khi key là hai object động như `from`, `to` thì áp dụng thế nào?
**Đáp:** Sắp theo `id` (hoặc `System.identityHashCode` kèm lock phụ khi trùng), luôn lock id nhỏ trước, bất kể ai là `from`.

**Hỏi xoáy 2:** Deadlock khác livelock và starvation?
**Vì sao hỏi tiếp:** Hai thread đứng im vì deadlock. Còn trường hợp thread vẫn chạy mà không tiến triển, hoặc bị bỏ đói, gọi là gì?
**Đáp:** Deadlock: các thread đứng im chờ nhau. Livelock: các thread vẫn chạy nhưng liên tục nhường nhau không tiến triển. Starvation: một thread không bao giờ được giành tài nguyên (ví dụ bị thread ưu tiên cao chiếm mãi).

**Sai lầm hay gặp:** Gọi `listener.onEvent()` (code không do mình kiểm soát) bên trong `synchronized`: listener có thể lấy lock khác và tạo vòng. Đọc thêm: [Liveness hazards](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-10-liveness-hazards.md).

## 7. Thread pool: cấu hình và bẫy?

**Câu hỏi:** Một `ThreadPoolExecutor` với `core=2, max=4, queue=2`, gửi 8 tác vụ treo: tác vụ nào chạy, nào xếp hàng, nào bị từ chối? Và vì sao `newFixedThreadPool` bị coi là nguy hiểm?

**Gợi ý suy luận:**
- Pool tồn tại để làm gì (giới hạn tài nguyên, tái dùng thread)? Khi tác vụ vượt khả năng thì có mấy nơi để đặt: tạo thread, xếp hàng, từ chối?
- Trong ba lựa chọn đó, `ThreadPoolExecutor` thử cái nào trước, cái nào sau? Thread vượt `core` chỉ ra đời khi nào?
- Nếu queue không giới hạn thì điều kiện "queue đầy" có bao giờ đúng không? Hệ quả cho `maximumPoolSize` và memory?

**Lập luận:** Vì pool ưu tiên xếp hàng hơn tạo thread thêm, nên task 1-2 tạo thread core, task 3-4 vào queue (pool vẫn 2 thread). Chỉ khi queue đầy mới tạo thread thứ 3, 4 (task 5-6), và khi đã đủ `max` mà queue vẫn đầy thì task 7-8 bị từ chối. Mà `newFixedThreadPool` dùng `LinkedBlockingQueue` không giới hạn, nên điều kiện "đầy" không bao giờ đúng: không từ chối, `max` vô nghĩa, và tải vượt sức chỉ làm memory phình. `newCachedThreadPool` ngược lại tạo thread không giới hạn. Vì thế nên dùng queue có giới hạn, chính sách từ chối rõ ràng, đặt tên thread. Điểm dễ nhầm là tưởng pool "tăng thread khi có nhiều việc", trong khi nó xếp hàng trước và chỉ tạo thêm khi hàng đầy; với queue vô hạn thì `max` không bao giờ được dùng. Khi cấu hình, chọn queue có giới hạn, `RejectedExecutionHandler` rõ ràng (ví dụ `CallerRunsPolicy` để tạo back-pressure) và đặt tên thread để đọc thread dump.

**Đáp án ngắn:** Thứ tự là tạo thread đến `core`, rồi xếp hàng, hàng đầy thì tạo thêm đến `max`, hết chỗ thì từ chối. `newFixedThreadPool` có queue vô hạn nên cạn memory dưới tải, `newCachedThreadPool` tạo thread vô hạn.

**Nhớ:** Ký hiệu: `ThreadPoolExecutor(core, max, keepAlive, unit, queue, factory, rejectedHandler)`. Queue có giới hạn + chính sách từ chối + tên thread.

**Ví dụ:** `core=2, max=4, queue=2`, gửi 8 tác vụ treo.

```java
new ThreadPoolExecutor(2, 4, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(2),
        threadFactory, new ThreadPoolExecutor.AbortPolicy());
```

```text
task 1: nhan | pool=1 dangChay=1 hangDoi=0
task 2: nhan | pool=2 dangChay=2 hangDoi=0
task 3: nhan | pool=2 dangChay=2 hangDoi=1
task 4: nhan | pool=2 dangChay=2 hangDoi=2
task 5: nhan | pool=3 dangChay=3 hangDoi=2
task 6: nhan | pool=4 dangChay=4 hangDoi=2
task 7: TU CHOI | pool=4 hangDoi=2
task 8: TU CHOI | pool=4 hangDoi=2
newFixedThreadPool(2) queue = LinkedBlockingQueue, remainingCapacity=2147483647
```

_Đã chạy thử trên JDK 11._ Đọc từng bước: task 1-2 tạo thread core; task 3-4 **xếp hàng** (pool vẫn 2); chỉ khi queue đầy, task 5-6 mới tạo thread thứ 3, 4; task 7-8 bị từ chối. Dòng cuối cho thấy `newFixedThreadPool` có sức chứa queue 2.147.483.647: không bao giờ từ chối, chỉ phình memory.

**Hỏi xoáy 1:** Chọn kích thước pool thế nào?
**Vì sao hỏi tiếp:** Ta biết phải có giới hạn. Vậy số thread nên chọn bao nhiêu?
**Đáp:** Tác vụ **CPU-bound**: gần số nhân (`N` hoặc `N+1`). Tác vụ **chặn I/O**: lớn hơn, xấp xỉ `N × (1 + thời gian chờ / thời gian tính)`. Quan trọng hơn: đo, và nhớ giới hạn thật thường là kết nối DB hay dịch vụ ngoài.

**Hỏi xoáy 2:** `CallerRunsPolicy` làm gì?
**Vì sao hỏi tiếp:** Khi bị từ chối, ngoài ném lỗi còn lựa chọn nào làm hệ thống tự giảm tải?
**Đáp:** Khi bị từ chối, chính thread gọi `execute` chạy tác vụ. Hệ quả: nó chậm lại, tự **tạo áp lực ngược** (backpressure) lên nơi gửi. Hợp lý khi muốn hệ thống chậm hơn là mất việc.

**Sai lầm hay gặp:** Một pool dùng chung cho mọi việc: tác vụ chậm chiếm hết thread làm tác vụ nhanh bị đói; và tác vụ trong pool chờ kết quả của tác vụ khác cùng pool gây deadlock kiểu starvation. Xem [Thread pool trong thực tế](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-08-thread-pool.md).

## 8. `Future` và `CompletableFuture`?

**Câu hỏi:** Gọi hai dịch vụ độc lập rồi ghép kết quả: dùng `Future` thì có vấn đề gì, và `CompletableFuture` giải quyết thế nào? Vì sao `commonPool` mặc định có thể bị đói?

**Gợi ý suy luận:**
- `Future.get()` làm gì với thread gọi? Nếu muốn "khi xong A thì làm B" bạn phải làm gì?
- Nếu callback và phép ghép gắn vào chính kết quả thì mô tả "A rồi B" mà không block được không?
- Hai tác vụ độc lập chạy parallel thì tổng thời gian bằng tổng hay bằng cái chậm nhất?
- Tác vụ không chỉ định executor chạy ở pool nào, pool đó có bao nhiêu thread?

**Lập luận:** Vì `Future.get()` chặn thread gọi, muốn nối bước sau bạn phải chặn rồi gọi tiếp, mất lợi ích async. `CompletableFuture` đưa callback và phép ghép vào kết quả (`thenApply`, `thenCompose`, `thenCombine`), nên mô tả "khi xong A thì làm B" non-blocking. Hai tác vụ độc lập khởi chạy cùng lúc nên tổng thời gian bằng cái chậm nhất (~320 ms thay vì ~640 ms). Nếu không truyền executor thì tác vụ chạy trên `ForkJoinPool.commonPool()` chỉ có khoảng số nhân trừ 1 thread, nên tác vụ chặn I/O dễ làm đói pool; vì vậy nên truyền executor riêng. Điểm dễ nhầm là nghĩ `CompletableFuture` tự có thread riêng, trong khi mặc định nó dùng chung `commonPool` của cả JVM, nên một tác vụ chặn có thể làm chậm cả các phần khác. Cũng cần xử lý lỗi (`exceptionally`, `handle`) và timeout, vì exception trong bước async không tự nổi lên nếu không ai gọi `join` hay `get`.

**Đáp án ngắn:** `Future` chỉ cho chờ và chặn; `CompletableFuture` cho nối chuỗi, ghép, xử lý lỗi và timeout mà non-blocking. Dùng executor riêng cho tác vụ chặn I/O vì `commonPool` ít thread.

**Nhớ:** Chuỗi: `thenApply`, `thenCompose`. Ghép: `thenCombine`, `allOf`. Lỗi: `exceptionally`, `handle`. Timeout: `orTimeout` (Java 9+).

**Ví dụ:**

```java
String seq = slow("user", 300) + "+" + slow("orders", 300);          // tuan tu
CompletableFuture<String> u = CompletableFuture.supplyAsync(() -> slow("user", 300), io);
CompletableFuture<String> o = CompletableFuture.supplyAsync(() -> slow("orders", 300), io);
String par = u.thenCombine(o, (x, y) -> x + "+" + y).join();          // song song

CompletableFuture.<String>supplyAsync(() -> { throw new IllegalStateException("db chet"); }, io)
    .exceptionally(ex -> "du phong (" + ex.getClass().getSimpleName() + " -> " + ex.getCause().getMessage() + ")");
CompletableFuture.supplyAsync(() -> slow("cham", 2000), io).orTimeout(200, TimeUnit.MILLISECONDS).join();
```

```text
tuan tu  : user+orders mat ~640 ms
song song: user+orders mat ~320 ms
exceptionally: du phong (CompletionException -> db chet)
orTimeout -> TimeoutException
thenApply tra ve long nhau: CompletableFuture | thenCompose phang: k1
commonPool parallelism = 1 (CPU=2)
```

_Đã chạy thử trên JDK 11._ Hai tác vụ độc lập chạy parallel giảm thời gian từ ~640 ms xuống ~320 ms. Lưu ý dòng 3: trong `exceptionally`, lỗi gốc bị **bọc** trong `CompletionException`, nên `ex.getCause()` mới là lỗi thật. Dòng 5: `thenApply` với hàm trả về một `CompletableFuture` cho kết quả lồng nhau; `thenCompose` là `flatMap` làm phẳng. Dòng cuối: máy này `commonPool` chỉ có 1 thread, minh họa vì sao dùng nó cho tác vụ chặn là nguy hiểm.

**Hỏi xoáy 1:** `join()` và `get()` khác nhau?
**Vì sao hỏi tiếp:** Nói "non-blocking" nhưng ví dụ vẫn gọi `join()`. Hai cách lấy kết quả `join()` và `get()` khác nhau thế nào?
**Đáp:** `get()` ném checked exception (`InterruptedException`, `ExecutionException`); `join()` ném unchecked `CompletionException`, tiện trong lambda. Cả hai đều **chặn**.

**Hỏi xoáy 2:** `thenApply` và `thenApplyAsync` khác gì?
**Vì sao hỏi tiếp:** Mỗi bước nối có thể chạy ở thread nào. `thenApply` và `thenApplyAsync` khác nhau chỗ nào?
**Đáp:** `thenApply` chạy ở thread hoàn thành bước trước (hoặc thread gọi nếu đã xong); `thenApplyAsync` đẩy sang executor. Chạy việc nặng trong `thenApply` có thể chặn thread quan trọng.

**Sai lầm hay gặp:** Quên xử lý lỗi nên ngoại lệ "biến mất" im lặng; hoặc `join()` ngay sau `supplyAsync` (biến async thành đồng bộ).

## 9. Stream: lazy là gì? Khi nào dùng parallel?

**Câu hỏi:** Một pipeline `filter -> map -> limit(2)` trên 4 phần tử: phần tử cuối có được xử lý không, và vì sao dùng `parallel()` với `forEach(list::add)` lại mất phần tử?

**Gợi ý suy luận:**
- Các thao tác trung gian (`filter`, `map`) chạy ngay hay chỉ ghi lại? Cái gì kích hoạt pipeline?
- Mỗi phần tử đi qua cả pipeline rồi mới đến phần tử sau, hay mỗi thao tác chạy hết cả tập? Hệ quả với `limit`?
- Parallel chia nguồn cho nhiều thread, và lambda ghi vào `ArrayList` ngoài: đó là truy cập gì (nhiều thread ghi một biến chung)?
- `ArrayList` có an toàn khi nhiều thread `add` đồng thời không?

**Lập luận:** Vì stream chỉ mô tả quy trình, các thao tác trung gian chỉ ghi lại và thao tác kết thúc mới kích hoạt. Mỗi phần tử đi qua cả pipeline rồi mới sang phần tử sau, nên `limit(2)` dừng ngay khi đủ hai phần tử và `dddd` không bao giờ được xử lý. Với parallel, nguồn được chia cho nhiều thread, nên `forEach(unsafe::add)` là nhiều thread cùng ghi vào một `ArrayList` không an toàn: đó là race condition và mất phần tử. `collect` đúng vì mỗi thread gom vào thùng riêng rồi gộp, không chia sẻ trạng thái. Điểm dễ nhầm là nghĩ `parallel()` luôn nhanh hơn: việc chia nhỏ, gộp và dùng chung `commonPool` đều có chi phí, nên chỉ có lợi với dữ liệu lớn, thao tác nặng CPU, không chặn và không có state chung. Mặc định dùng stream tuần tự, khi cần song song thì đo trước rồi mới quyết định.

**Đáp án ngắn:** Stream là mô tả quy trình, lazy, xử lý từng phần tử qua cả pipeline nên `limit`/`findFirst` dừng sớm. Parallel biến mọi state chung trong lambda thành race, nên dùng `collect`/`reduce` thay vì ghi vào biến ngoài.

**Nhớ:** Stream chỉ dùng một lần. `parallel()` chỉ đáng khi dữ liệu lớn, tác vụ nặng CPU, nguồn chia tốt, lambda không trạng thái, và đã đo.

**Ví dụ:**

```java
Stream.of("a", "bb", "ccc", "dddd")
    .filter(s -> { System.out.println("  filter " + s); return s.length() > 1; })
    .map(s -> { System.out.println("  map    " + s); return s.toUpperCase(); })
    .limit(2)
    .forEach(s -> System.out.println("  -> " + s));
```

```text
  filter a
  filter bb
  map    bb
  -> BB
  filter ccc
  map    ccc
  -> CCC
dung stream lan 2 -> stream has already been operated upon or closed
```

Nhìn thứ tự in: `bb` đi hết `filter, map, forEach` rồi mới tới `ccc`; sau khi đủ 2 phần tử `limit(2)`, `dddd` **không bao giờ được xử lý**. Đó là lazy + xử lý từng phần tử.

Parallel với state chung (dùng pool 4 thread để tái hiện, vì `commonPool` trên máy kiểm chứng chỉ có 1 thread):

```java
List<Integer> unsafe = new ArrayList<>();
pool.submit(() -> IntStream.range(0, 100_000).parallel().forEach(unsafe::add)).get();
List<Integer> safe = pool.submit(() -> IntStream.range(0, 100_000).parallel().boxed().collect(Collectors.toList())).get();
```

```text
lan 1: size=96962 (ky vong 100000)
lan 2: size=60444 (ky vong 100000)
lan 3: size=98091 (ky vong 100000)
collect(toList): size=100000
```

_Đã chạy thử trên JDK 11. Con số thay đổi mỗi lần chạy. Cách làm sai này còn có thể ném `ArrayIndexOutOfBoundsException` khi mảng nội bộ đang mở rộng (không xảy ra trong ba lần chạy này)._ `forEach(unsafe::add)` thêm vào `ArrayList` không an toàn từ nhiều thread nên mất 3.000 đến 40.000 phần tử; `collect` đúng vì mỗi thread gom vào thùng riêng rồi mới gộp.

**Hỏi xoáy 1:** Vì sao `parallel()` có thể chậm hơn tuần tự?
**Vì sao hỏi tiếp:** Nếu parallel dùng đúng (`collect`) thì có luôn nhanh hơn tuần tự không?
**Đáp:** Chi phí chia, lập lịch, gộp kết quả; nguồn khó chia (`LinkedList`, `Stream.iterate`); thao tác quá rẻ; hộp số boxing. Với tác vụ chặn I/O còn làm đói `commonPool` của cả ứng dụng.

**Hỏi xoáy 2:** `peek` dùng làm gì?
**Vì sao hỏi tiếp:** Để gỡ lỗi pipeline lazy, người ta hay dùng `peek`. Nó đáng tin tới đâu?
**Đáp:** Chỉ để gỡ lỗi. Không đảm bảo chạy nếu có thao tác ngắn mạch (`count()` trên nguồn có kích thước biết trước có thể bỏ qua nó từ Java 9).

**Sai lầm hay gặp:** `forEach` cộng dồn vào biến ngoài hoặc collection ngoài. Dùng `collect`/`reduce`/`sum`.

## 10. Generics và type erasure?

**Câu hỏi:** Vì sao `List<String>` chứa được `Integer` qua raw type mà không lỗi tại chỗ thêm, chỉ nổ `ClassCastException` khi đọc ra, và vì sao không viết được `new T()` hay `instanceof List<String>`?

**Gợi ý suy luận:**
- Generics ra đời ở Java 5 trong khi JVM và mã cũ không biết generics: làm sao giữ tương thích ngược?
- Nếu compiler kiểm tra kiểu rồi bỏ thông tin tham số kiểu, lúc chạy `List<String>` và `List<Integer>` khác gì nhau?
- Thông tin kiểu không còn lúc chạy thì việc nào trở nên bất khả thi (`new T()`, `instanceof`, mảng `T[]`)?
- Mảng giữ kiểu lúc chạy còn generic thì không: điều gì khác nhau khi ghi sai kiểu?

**Lập luận:** Vì cần tương thích ngược, Java dùng type erasure: compiler kiểm tra kiểu, chèn cast và bỏ tham số kiểu, nên lúc chạy `List<String>` và `List<Integer>` cùng là một class `List`. Mà thông tin kiểu không còn nên không thể `new T()`, không `instanceof List<String>`, không tạo `T[]`. Raw type tắt kiểm tra lúc biên dịch, nên ghi `Integer` vào `List<String>` chỉ bị cảnh báo; lỗi nổ ở chỗ cast do compiler chèn khi đọc (heap pollution). Mảng giữ kiểu lúc chạy nên bắt lỗi ngay khi ghi (`ArrayStoreException`), generic thì không: đó là lý do mảng và generic không hợp nhau. PECS cũng suy ra từ đây: `? extends T` an toàn khi lấy ra, `? super T` an toàn khi đưa vào. Điểm dễ nhầm là tin kiểu generic được bảo đảm lúc chạy; nó chỉ được bảo đảm nếu không có raw type hay cast không kiểm tra. Khi review, mọi cảnh báo unchecked là dấu hiệu nguy cơ `ClassCastException` ở chỗ xa nơi gây lỗi, nên không dùng raw type và hạn chế `@SuppressWarnings("unchecked")`.

**Đáp án ngắn:** Kiểu tham số chỉ được kiểm tra lúc biên dịch rồi bị xóa, nên các hạn chế như `new T()` hay `instanceof List<String>` đều do không còn thông tin kiểu lúc chạy. PECS: `? extends` để lấy ra, `? super` để đưa vào.

**Nhớ:** Không overload chỉ khác tham số kiểu. Raw type làm mất kiểm tra và đẩy lỗi ra xa chỗ gây ra.

**Ví dụ:**

```java
List<String> ls = new ArrayList<>(); List<Integer> li = new ArrayList<>();
ls.getClass() == li.getClass();                  // true
List raw = ls; raw.add(42);                      // chi canh bao, van bien dich
String s = ls.get(0);                            // ClassCastException o day

// doc: List<Integer>, List<Double> deu duoc
static double sum(List<? extends Number> src) { ... }
// ghi: List<Number>, List<Object>
static void fill(List<? super Integer> dst) { dst.add(1); dst.add(2); }
Object[] arr = new String[1]; arr[0] = 1;        // ArrayStoreException
```

```text
List<String>.class == List<Integer>.class : true
da them Integer vao List<String>, size=1
loi chi no luc DOC: ClassCastException
sum(List<Integer>) = 6.0 | sum(List<Double>) = 4.0
fill(List<Number>)=[1, 2] fill(List<Object>)=[1, 2]
mang van giu kieu luc chay: ArrayStoreException (generic thi khong)
```

_Đã chạy thử trên JDK 11._ Hai điều đáng thấy: (1) **heap pollution**: `List<String>` chứa `Integer` mà không lỗi tại chỗ thêm, chỉ nổ khi đọc ra; (2) mảng giữ kiểu lúc chạy nên bắt lỗi ngay khi ghi, generic thì không. Đó là lý do mảng và generic "không hợp nhau".

**Hỏi xoáy 1:** Làm sao tạo `T[]` hoặc biết `T` là gì lúc chạy?
**Vì sao hỏi tiếp:** Nếu kiểu bị xóa mà vẫn cần `T[]` hoặc biết `T` lúc chạy thì làm thế nào?
**Đáp:** Truyền `Class<T>` vào (`Array.newInstance(clazz, n)`), hoặc dùng "super type token" như `TypeReference<T>` của Jackson (kiểu tham số được giữ trong subclass ẩn danh).

**Hỏi xoáy 2:** Vì sao `List<Integer>` không phải `List<Number>`?
**Vì sao hỏi tiếp:** Vì mảng giữ kiểu, `String[]` là `Object[]`. Vậy `List<Integer>` có là `List<Number>` không, và vì sao?
**Đáp:** Nếu được, bạn có thể ghi `Double` vào một `List<Integer>` thông qua tham chiếu `List<Number>`. Wildcard `? extends` cho phép **đọc** an toàn nhưng cấm ghi.

**Sai lầm hay gặp:** Dùng raw type (`List` không tham số) "cho gọn", mất toàn bộ kiểm tra kiểu và gây `ClassCastException` ở nơi xa chỗ gây lỗi.

## 11. Reflection dùng để làm gì và rủi ro?

**Câu hỏi:** Spring, Hibernate, Jackson xử lý được class mà chúng chưa từng thấy lúc biên dịch, kể cả đọc field `private`. Reflection cho phép điều đó bằng cách nào, và trả giá gì?

**Gợi ý suy luận:**
- Thông thường tên và kiểu bị buộc cứng lúc biên dịch: framework chung cho mọi class thì cần làm gì khác?
- Nếu tra cứu và gọi theo tên lúc chạy thì compiler còn kiểm tra được lỗi gọi sai không?
- Gọi qua `Method.invoke` khác gọi trực tiếp thế nào về chi phí?
- `setAccessible(true)` phá cái gì, và đầu vào ngoài dùng để chọn class/method thì rủi ro gì?

**Lập luận:** Vì framework phải làm việc chung cho mọi class mà không biết trước, nó đọc thông tin kiểu lúc chạy và gọi theo tên bằng reflection. Vì tra cứu và gọi theo tên nên lỗi chuyển từ biên dịch sang chạy, và vì phải kiểm tra, đóng gói call nên chậm hơn (khoảng 5 lần trong phép đo). `setAccessible` bỏ qua `private`, phá đóng gói (Java 9+ module hạn chế, từ 17 mạnh hơn). Nếu tên class/method lấy từ đầu vào người dùng thì kẻ tấn công chạy được mã tùy ý. Điểm dễ nhầm là nghĩ reflection chậm đến mức không dùng được; thực ra phần chậm là hằng số nhỏ và framework cache sẵn `Method`, `Field`. Mối lo thật là mất kiểm tra lúc biên dịch và bảo mật: không nạp class hay gọi method theo tên lấy từ input chưa kiểm soát, và đặt phạm vi `setAccessible` hẹp nhất có thể.

**Đáp án ngắn:** Reflection đọc và thao tác class, field, method lúc chạy, nền tảng cho DI, ORM, serialization; đổi lại chậm hơn, mất kiểm tra biên dịch, phá đóng gói và có rủi ro bảo mật nếu nạp theo tên từ ngoài.

**Nhớ:** Cũng khó với GraalVM native image (cần khai báo). Không bao giờ `Class.forName` trên chuỗi người dùng nhập.

**Ví dụ:**

```java
static class Secret { private String token = "abc123"; private String reveal(String p) { return p + ":" + token; } }
Field f = Secret.class.getDeclaredField("token"); f.setAccessible(true);
System.out.println("doc field private: " + f.get(s));
f.set(s, "da-bi-doi");
Method m = Secret.class.getDeclaredMethod("reveal", String.class); m.setAccessible(true);
System.out.println("goi method private: " + m.invoke(s, "pre"));
// do chi phi: 20 trieu lan str.length() truc tiep vs Method.invoke
```

```text
doc field private: abc123
goi method private: pre:da-bi-doi
goi truc tiep x20000000: 20 ms | qua Method.invoke: 104 ms (x=true)
```

_Đã chạy thử trên JDK 11 (sau khởi động JIT; tỉ lệ mới quan trọng)._ Gọi qua `Method.invoke` chậm khoảng 5 lần trong phép đo này (JIT vẫn tối ưu được phần nào); và `private` không còn ngăn được ai nếu không có rào module.

**Hỏi xoáy 1:** Làm sao framework giảm chi phí reflection?
**Vì sao hỏi tiếp:** Vì reflection chậm, framework làm gì để giảm chi phí?
**Đáp:** Cache `Method`/`Field` đã tra cứu; `MethodHandle`/`VarHandle` nhanh hơn khi nhúng được; sinh bytecode lúc chạy (ByteBuddy, CGLIB); hoặc sinh code lúc biên dịch (annotation processing, MapStruct, Micronaut).

**Hỏi xoáy 2:** Vì sao Spring chạy chậm lúc khởi động?
**Vì sao hỏi tiếp:** Quét classpath và tạo proxy bằng reflection nhiều. Điều này giải thích hiện tượng nào của Spring?
**Đáp:** Quét classpath, đọc annotation, tạo proxy, bằng reflection. Native image/AOT chuyển phần này sang lúc build.

**Sai lầm hay gặp:** Gọi `Class.forName(tenTuNguoiDung)` hoặc `Method` theo tên từ request: cho phép kẻ tấn công chạy mã tùy ý.

## 12. Dynamic proxy và CGLIB?

**Câu hỏi:** `placeOrder()` gọi `this.audit()` mà `audit()` đánh dấu `@Transactional(REQUIRES_NEW)`, nhưng không có transaction thứ hai nào được mở. Vì sao, và proxy làm việc đó thế nào?

**Gợi ý suy luận:**
- Muốn chèn việc (mở transaction, log) quanh call mà mã gọi không biết thì cần một object đứng giữa có cùng giao diện: nó là gì?
- JDK Proxy sinh class theo interface, CGLIB sinh subclass: subclass của class `final` có tồn tại không?
- Call `this.audit()` bên trong object thật gọi vào object nào: proxy hay chính nó?

**Lập luận:** Vì cần chèn việc mà mã gọi không biết, Spring bọc bean thật trong proxy có cùng giao diện (hoặc là subclass). Proxy chỉ chặn được call đi qua nó. Mà `this.audit()` gọi từ bên trong bean thật, và `this` là object thật chứ không phải proxy, nên call bỏ qua proxy và không có `BEGIN/COMMIT` thứ hai. Với CGLIB, vì dùng subclass và ghi đè method nên class hoặc method `final`/`private` không proxy được. Điểm dễ nhầm là tưởng annotation tự chạy ở mọi nơi; nó chỉ chạy khi lời gọi đi qua proxy. Hệ quả: gọi nội bộ (self-invocation) làm mất `@Transactional`, `@Cacheable`, `@Async`; sửa bằng cách tách method sang bean khác rồi tiêm vào. Method `private` cũng không được proxy.

**Đáp án ngắn:** Proxy là người đứng giữa chèn việc quanh call; nó chỉ thấy call đi qua nó, nên gọi nội bộ (`this.method()`) không có transaction, cache hay async.

**Nhớ:** Nền của AOP, `@Transactional`, `@Async`, `@Cacheable`. Method `private`/`final`, class `final` không proxy được bằng CGLIB.

**Ví dụ:**

```java
interface OrderService { void placeOrder(); void audit(); }
class OrderServiceImpl implements OrderService {
    // goi noi bo
    public void placeOrder() { System.out.println("    placeOrder() chay"); this.audit(); }
    public void audit()      { System.out.println("    audit() chay"); }
}
OrderService proxy = (OrderService) Proxy.newProxyInstance(loader, new Class[]{OrderService.class},
    (p, m, args) -> {
        System.out.println("  [proxy] BEGIN transaction truoc " + m.getName());
        try { return m.invoke(target, args); }
        finally { System.out.println("  [proxy] COMMIT sau " + m.getName()); }
    });
proxy.placeOrder();
proxy.audit();
```

```text
proxy class: $Proxy0 (sinh luc chay) | implements interface: true
goi proxy.placeOrder():
  [proxy] BEGIN transaction truoc placeOrder
    placeOrder() chay
    audit() chay
  [proxy] COMMIT sau placeOrder
goi proxy.audit() truc tiep:
  [proxy] BEGIN transaction truoc audit
    audit() chay
  [proxy] COMMIT sau audit
```

_Đã chạy thử trên JDK 11 (JDK Proxy; CGLIB cần thư viện ngoài nên chưa chạy)._ Khi `placeOrder()` gọi `this.audit()`, **không** có `BEGIN/COMMIT` thứ hai: call đi thẳng vào object thật. Nếu `audit()` được đánh dấu `@Transactional(REQUIRES_NEW)`, transaction riêng đó **sẽ không được tạo**. Đây là nguyên nhân kinh điển của "annotation không có tác dụng".

**Hỏi xoáy 1:** Cách sửa self-invocation?
**Vì sao hỏi tiếp:** Đã hiểu vì sao self-invocation hỏng. Vậy sửa nó thế nào?
**Đáp:** Tách `audit()` sang bean khác và tiêm vào; hoặc tiêm chính proxy (`@Lazy` self) / `AopContext.currentProxy()`; hoặc dùng AspectJ weaving (sửa bytecode, không dùng proxy). Tách bean là rõ ràng nhất.

**Hỏi xoáy 2:** Spring chọn JDK Proxy hay CGLIB?
**Vì sao hỏi tiếp:** Nói về JDK Proxy và CGLIB, Spring thực tế chọn cái nào mặc định?
**Đáp:** Bean có interface thì JDK Proxy theo mặc định chung của Spring, nhưng Spring Boot cấu hình `spring.aop.proxy-target-class=true` nên mặc định dùng **CGLIB** (subclass) cho cả trường hợp có interface. Chi tiết ở [AOP và Proxy](/go?p=01-Spring-Boot%2Fmedium%2Flt-13-aop-proxy.md).

**Sai lầm hay gặp:** Đặt `@Transactional` lên method `private` hoặc gọi nội bộ rồi kết luận "Spring lỗi"; thực ra proxy không bao giờ thấy call đó.

## 13. `Optional` dùng đúng thế nào?

**Câu hỏi:** Có nên khai báo tham số, field hay trả về `Optional`, và tại sao `orElse(expensive())` có thể gọi `expensive()` dù đã có giá trị?

**Gợi ý suy luận:**
- `null` là quy ước ngầm "có thể vắng" mà người gọi dễ quên. Nếu đưa nó vào kiểu trả về thì điều gì thay đổi với người gọi?
- Với tham số hay field, `Optional` thêm class bọc nhưng có buộc ai quyết định gì không?
- Đối số của một gọi hàm trong Java được tính khi nào: trước hay sau khi vào hàm?

**Lập luận:** Vì `Optional` đưa "có thể vắng" vào kiểu trả về nên người gọi buộc phải xử lý, thay vì quên kiểm tra `null`. Tham số, field, phần tử collection không có người "nhận kết quả" để ép quyết định, nên chỉ thêm class bọc, không có lợi. Về `orElse`, Java tính đối số trước khi gọi hàm, nên `expensive()` luôn chạy dù `Optional` đã có giá trị; `orElseGet` nhận `Supplier` nên chỉ gọi khi vắng. Điểm dễ nhầm là dùng `Optional.get()` không kiểm tra, chỉ đổi NPE thành `NoSuchElementException`. Hãy dùng `orElseThrow`, `ifPresentOrElse` hoặc `map`/`flatMap`, và với tham số hay field thì overload hoặc giá trị mặc định rõ ràng thay vì `Optional`.

**Đáp án ngắn:** Dùng `Optional` làm kiểu trả về, biến đổi bằng `map`/`flatMap`, lấy giá trị bằng `orElseThrow`/`orElseGet`; `orElse` luôn tính đối số còn `orElseGet` chỉ tính khi cần.

**Nhớ:** Không dùng làm tham số, field, phần tử collection; không gọi `get()` không kiểm tra.

**Ví dụ:** `orElse` **luôn tính** đối số, `orElseGet` chỉ tính khi cần.

```java
Optional<String> present = Optional.of("co gia tri");
present.orElse(expensive());              // expensive() van duoc goi
present.orElseGet(C13::expensive);        // expensive() KHONG duoc goi
Optional<String> empty = Optional.empty();
empty.orElseGet(C13::expensive);     // luc nay moi goi

Optional.ofNullable(db.get("u1")).map(m -> m.get("city")).map(String::toUpperCase).orElse("N/A");
```

```text
orElse(expensive()) khi DA co gia tri:
  (expensive() duoc goi)
  -> co gia tri
orElseGet(this::expensive) khi DA co gia tri:
  -> co gia tri
orElseGet khi VANG mat:
  (expensive() duoc goi)
  -> mac dinh
HANOI | N/A
```

_Đã chạy thử trên JDK 11._ Dòng 2 cho thấy `orElse(expensive())` gọi `expensive()` **dù đã có giá trị** (nếu hàm đó truy vấn DB thì thật tốn kém); `orElseGet` truyền một `Supplier` nên chỉ gọi khi cần. Dòng cuối: chuỗi `map` thay cho nhiều `if (x != null)` lồng nhau.

**Hỏi xoáy 1:** `map` và `flatMap` của `Optional` khác nhau?
**Vì sao hỏi tiếp:** Chuỗi `map` ở ví dụ giúp bỏ `if (x != null)` lồng nhau. Khi hàm biến đổi cũng trả `Optional` thì dùng gì?
**Đáp:** `map` bọc kết quả thêm một class `Optional`; `flatMap` dùng khi hàm đã trả `Optional` (tránh `Optional<Optional<T>>`), giống `thenApply` và `thenCompose` ở câu 8.

**Sai lầm hay gặp:** `if (opt.isPresent()) return opt.get(); else ...` (viết lại `if null`, không có lợi); `Optional<List<T>>` (trả về danh sách rỗng đủ rồi).

## 14. Virtual threads?

**Câu hỏi:** Vì sao một server thread-per-request chỉ chịu được vài nghìn kết nối, và virtual thread giúp chịu hàng chục nghìn mà vẫn viết code tuần tự? Có làm tác vụ CPU nặng nhanh hơn không?

**Gợi ý suy luận:**
- Một thread OS tốn khoảng bao nhiêu memory và chi phí chuyển ngữ cảnh? Tạo vài chục nghìn thread như vậy thì sao?
- Một request điển hình dành phần lớn thời gian làm gì (chờ I/O)? Thread OS lúc đó đang làm gì?
- Nếu JVM gỡ virtual thread khỏi thread OS (carrier) khi nó chờ I/O thì thread OS làm được gì trong lúc đó?
- Tác vụ CPU nặng có "chờ" để nhường thread OS không?

**Lập luận:** Vì thread OS đắt (stack khoảng 1 MB, chuyển ngữ cảnh nặng), thread-per-request chỉ chịu vài nghìn. Mà phần lớn thời gian request là chờ I/O, thread OS ngồi không. Virtual thread để JVM gỡ virtual thread khỏi carrier khi nó chờ I/O, nên hàng chục nghìn virtual thread chia sẻ vài thread OS. Tác vụ CPU nặng không chờ nên không có gì để nhường: virtual thread không làm CPU nhanh hơn. Hệ quả: không cần pool virtual thread (tạo rẻ), giới hạn thật chuyển sang tài nguyên khác như kết nối DB; và `synchronized` quanh I/O ở Java 21 ghim virtual thread vào carrier làm mất lợi ích. Điểm dễ nhầm là nghĩ virtual thread tăng throughput cho mọi loại tải và cần pool như thread thường; giới hạn đồng thời nên đặt bằng `Semaphore` theo tài nguyên (ví dụ pool kết nối DB) chứ không bằng số thread. Khi review, tìm `synchronized` bao quanh I/O (đổi sang `ReentrantLock`) và `ThreadLocal` lớn, vì mỗi virtual thread cũng có bản riêng.

**Đáp án ngắn:** Virtual thread (Java 21) giải quyết chờ I/O: virtual thread rẻ, nhả thread OS khi chờ nên chịu được rất nhiều request chặn tuần tự. Không làm CPU nhanh hơn, không cần pool, tránh `synchronized` quanh I/O dài.

**Nhớ:** `Executors.newVirtualThreadPerTaskExecutor()` hoặc `Thread.ofVirtual().start(...)`. Giới hạn thật là kết nối DB/dịch vụ ngoài; bản sau đã cải thiện ghim, kiểm tra theo phiên bản.

**Ví dụ:**

```java
// Java 21: 10_000 tac vu, moi tac vu cho 1 giay (gia lap I/O)
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 10_000).forEach(i -> executor.submit(() -> {
        Thread.sleep(Duration.ofSeconds(1));
        return i;
    }));
}   // close() cho tat ca xong
// Voi pool co dinh 200 luong nen tang: ~10_000 / 200 * 1s = ~50 giay.
// Voi luong ao: ~1-2 giay (cac luong ao cung cho, khong chiem luong OS).
```

_Minh họa, chưa chạy thử trong môi trường này (cần JDK 21; môi trường kiểm chứng chỉ có JDK 11). Số 50 giây là phép tính lý thuyết từ 10.000/200 × 1 giây, không phải số đo; thời gian thật của virtual thread thay đổi theo máy._

**Hỏi xoáy 1:** Vì sao không nên pool virtual thread?
**Vì sao hỏi tiếp:** Virtual thread rẻ nên có nên tái dùng bằng pool như thread thường? Và nếu cần giới hạn đồng thời thì làm sao?
**Đáp:** Pool sinh ra để chia sẻ tài nguyên **đắt**; virtual thread rẻ nên tạo mỗi tác vụ một thread. Muốn **giới hạn đồng thời** thì dùng `Semaphore`, không giới hạn bằng số thread.

**Hỏi xoáy 2:** `ThreadLocal` với virtual thread?
**Vì sao hỏi tiếp:** Mỗi virtual thread có thể mang `ThreadLocal`. Với hàng triệu thread thì có vấn đề gì?
**Đáp:** Dùng được, nhưng với hàng triệu virtual thread mỗi thread giữ một bản thì tốn memory; hướng thay thế là `ScopedValue`. Chi tiết: [Virtual Threads và Structured Concurrency](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md).

**Sai lầm hay gặp:** Kỳ vọng virtual thread làm tác vụ CPU nặng nhanh hơn, hoặc vẫn đặt `synchronized` quanh call I/O dài (ghim carrier).

## 15. SOLID, nêu ví dụ?

**Câu hỏi:** Thêm một loại giảm giá mới mà phải mở lại hàm cũ để thêm `else if` thì vi phạm điều gì, và SOLID nói chung giải quyết vấn đề gốc nào?

**Gợi ý suy luận:**
- Khi sửa code đang chạy tốt để thêm tính năng, rủi ro gì với phần cũ?
- Nếu mỗi loại giảm giá là một mục đăng ký riêng thì thêm loại mới có phải sửa hàm chung không?
- Năm nguyên tắc S, O, L, I, D mỗi cái nhắm vào kiểu đau nào của thay đổi?

**Lập luận:** Vì sửa code đã chạy tốt dễ gây lỗi hồi quy cho các nhánh cũ, ý chung của SOLID là thay đổi nên có chỗ để đi mà không buộc sửa code cũ. Bản `if-else` buộc mở và sửa hàm mỗi lần thêm loại: vi phạm Open/Closed. Bản dùng `Map<String, Discount>` chỉ thêm mục mới nên mở rộng không sửa. Các nguyên tắc còn lại cùng một hướng: S (sửa chỗ này khỏi vỡ chỗ kia), L (subclass không phá contract), I (không phụ thuộc method không dùng), D (không gắn chặt vào chi tiết). Điểm dễ nhầm là áp SOLID máy móc cho mọi class và sinh ra lớp interface thừa. Cách đo thực tế là hỏi: nếu yêu cầu này đổi thì phải sửa mấy chỗ? Chỗ nào thật sự hay đổi (loại giảm giá, kênh gửi) thì mới tách điểm mở rộng, chỗ ổn định thì giữ đơn giản.

**Đáp án ngắn:** SOLID là hệ quả của một ý: thay đổi nên có chỗ để đi. S: một lý do thay đổi. O: mở rộng không sửa. L: subclass thay được superclass. I: interface nhỏ. D: phụ thuộc trừu tượng, chi tiết được tiêm vào.

**Nhớ:** Ví dụ trước/sau Open/Closed: bản `if-else` bắt sửa hàm, bản `Map` chỉ thêm mục.

**Ví dụ (Open/Closed):** thêm loại giảm giá mới.

```java
// Truoc: them loai giam gia = sua ham (vi pham Open/Closed)
static double before(String type, double price) {
    if (type.equals("VIP")) return price * 0.8;
    else if (type.equals("NEW")) return price * 0.9;
    return price;
}
// Sau: them loai moi = dang ky them, khong sua code cu
interface Discount { double apply(double price); }
static final Map<String, Discount> REG = new HashMap<>();
static { REG.put("VIP", p -> p * 0.8); REG.put("NEW", p -> p * 0.9); }
static double after(String type, double price) { return REG.getOrDefault(type, p -> p).apply(price); }

REG.put("BLACKFRIDAY", p -> p * 0.5);    // mo rong KHONG sua ham after()
```

```text
before VIP: 80.0 | after VIP: 80.0
them BLACKFRIDAY khong sua ham after(): 50.0
```

_Đã chạy thử trên JDK 11._ Quan sát: bản "trước" bắt buộc **mở lại và sửa** hàm (rủi ro hồi quy cho mọi loại cũ); bản "sau" chỉ thêm một mục. Trong Spring, `Map<String, Discount>` có thể được tiêm tự động từ mọi bean `Discount`.

**Hỏi xoáy 1:** Ví dụ vi phạm Liskov?
**Vì sao hỏi tiếp:** Open/Closed đã thấy qua ví dụ. Với Liskov, một vi phạm điển hình trông thế nào?
**Đáp:** `Square extends Rectangle` mà `setWidth` cũng đổi chiều cao: mã dùng `Rectangle` giả định hai cạnh độc lập sẽ sai. Dấu hiệu: subclass ném `UnsupportedOperationException` hoặc thu hẹp điều kiện đầu vào.

**Hỏi xoáy 2:** Áp dụng SOLID quá tay thì sao?
**Vì sao hỏi tiếp:** Nếu áp dụng nguyên tắc thái quá thì sao?
**Đáp:** Interface cho mọi class, hàng chục class nhỏ mà chỉ có một cài đặt: tăng chi phí đọc hiểu mà không có nhu cầu thay đổi thật. Tách khi đã thấy **hai lý do thay đổi** thật sự. Xem [SOLID và Design Pattern](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md).

**Sai lầm hay gặp:** Học thuộc định nghĩa mà không nêu được ví dụ "trước/sau" như trên.

## 16. Thiết kế class bất biến?

**Câu hỏi:** Hai class đều có field `final List<String> tags`, nhưng chỉ một class thật sự bất biến. Vì sao, và vì sao bất biến tốt cho multithreading?

**Gợi ý suy luận:**
- `final` trên field cố định cái gì: tham chiếu hay nội dung object nó trỏ tới?
- Nếu người gọi vẫn giữ tham chiếu tới `ArrayList` gốc, hoặc getter trả thẳng list, thì ai sửa được nội dung?
- Một object không đổi sau khi tạo thì còn cần lock không, có thể chia sẻ giữa thread không?

**Lập luận:** Vì `final` chỉ cố định tham chiếu, nên nếu constructor lưu thẳng list truyền vào và getter trả thẳng list, bên ngoài vẫn sửa được nội dung: đây là bất biến nông. Sao chép phòng thủ (`List.copyOf`) ngay ở constructor cắt liên hệ với list gốc, và `copyOf` trả list không sửa được nên getter an toàn. Với multithreading, vì không có ghi sau khi xây dựng nên không có race, không cần lock và chia sẻ tự do; `final` field còn có bảo đảm riêng của JMM (initialization safety). Điểm dễ nhầm là tưởng field `final` là bất biến, trong khi nó chỉ cố định tham chiếu. Khi thiết kế, sao chép phòng thủ ở cả constructor lẫn getter nếu trả về collection thay đổi được, hoặc dùng `List.copyOf` với nội dung bất biến, và ưu tiên `record` cho dữ liệu thuần.

**Đáp án ngắn:** Bất biến thật cần class `final`, field `final` và `private`, không setter, sao chép phòng thủ collection/mutable ở constructor và getter. Bất biến loại bỏ cả họ lỗi concurrency vì không có ghi sau khi tạo.

**Nhớ:** Dùng `List.copyOf`, `Collections.unmodifiableList`, `Instant` thay `Date`; không để `this` thoát trong constructor; hoặc dùng `record` (cẩn thận thành phần mutable).

**Ví dụ:**

```java
static final class Mutable   { private final List<String> tags; Mutable(List<String> t)   { this.tags = t; }              List<String> tags() { return tags; } }
static final class Immutable { private final List<String> tags; Immutable(List<String> t) { this.tags = List.copyOf(t); }  List<String> tags() { return tags; } }

List<String> src = new ArrayList<>(List.of("java", "spring"));
Mutable m = new Mutable(src); Immutable i = new Immutable(src);
src.add("HACK");
System.out.println("Mutable   : " + m.tags());
System.out.println("Immutable : " + i.tags());
i.tags().add("x");
m.tags().add("LEAK");
```

```text
Mutable  sau khi sua danh sach goc: [java, spring, HACK]
Immutable sau khi sua danh sach goc: [java, spring]
sua getter cua Immutable -> UnsupportedOperationException
Mutable bi sua tu ben ngoai qua getter: [java, spring, HACK, LEAK]
```

_Đã chạy thử trên JDK 11 (`List.copyOf` có từ Java 10)._ Cả hai class đều có field `final`, nhưng chỉ `Immutable` thật sự bất biến: `Mutable` bị sửa từ danh sách gốc lẫn qua getter. Đây là bất biến **nông** và là lỗi hay gặp nhất.

**Hỏi xoáy 1:** Vì sao bất biến tốt cho multithreading?
**Vì sao hỏi tiếp:** Đã thấy bất biến tránh được race. Vì sao `final` field còn được JMM bảo đảm riêng?
**Đáp:** Không có ghi sau khi xây dựng, nên không có tranh đua; và `final` field còn có bảo đảm riêng của JMM: thread khác thấy object đã xây dựng xong (initialization safety) kể cả khi công bố không an toàn. Đọc thêm: [Java Memory Model](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-16-java-memory-model.md).

**Hỏi xoáy 2:** Bất biến có chậm vì phải tạo bản mới?
**Vì sao hỏi tiếp:** Bất biến phải tạo bản mới mỗi lần đổi. Chi phí đó có đáng ngại không?
**Đáp:** Có chi phí cấp phát, nhưng JVM tạo object ngắn hạn rất rẻ; phần lớn trường hợp không phải nút cổ chai. Với cấu trúc lớn dùng cấu trúc dữ liệu persistent (chia sẻ phần không đổi).

**Sai lầm hay gặp:** `final List<String> tags` rồi tưởng bất biến; hoặc trả `Date` thay đổi được ra ngoài.

---

Nguồn: kiểm chứng bằng chương trình chạy trên JDK 11 (2 CPU, kết quả đồng thời thay đổi mỗi lần chạy); khái niệm tham chiếu *Java Concurrency in Practice* (Goetz) và *Effective Java* (Bloch).

