# Đối chiếu bộ ghi chú Java với tài liệu chính thức

Phạm vi: `Java Core`, `Java Concurrency`, tra thêm `Interview-QA`. Cách làm: lấy mục lục các nguồn chính thức, rút thành 137 chủ đề, rà bằng Grep trên toàn bộ ba thư mục rồi đọc đoạn liên quan để chấm độ phủ. Đây là báo cáo chỉ-đọc, không bài học nào bị sửa.

**Tóm tắt:**

- Phần cốt lõi (JVM, JMM, GC, concurrency, collections, generics, exception, Java 17/21) đủ ở mức thực hành vững; MUST phủ >= 2 khoảng 98% (65/66).
- MUST còn thiếu chính là Stream: `flatMap`, `reduce`, primitive stream chỉ có 1 dòng.
- Yếu nhất ở nhóm điểm mới theo phiên bản: Sequenced Collections (Java 21) chưa có, text block mới 1 dòng, Java 22 đến 25 chưa có.
- JVM và concurrency vượt chuẩn tài liệu chính thức (JMM đầy đủ, AQS, virtual thread có thử nghiệm pinning), chỉ cần bổ sung nội bộ G1.
- Bài `lt-09-gui-single-thread.md` (Swing) là thừa so với mục tiêu backend, có thể giữ nhưng không cần ôn.
- Bảng đối chiếu rút 137 chủ đề chia 6 nhóm A đến F; mục 3 liệt kê 14 khoảng trống ưu tiên giảm dần với quy mô ước lượng.
- Một số nguồn (JLS 17, javadoc stream, java.time, JEP 22 đến 24) chỉ đối chiếu từ kiến thức, ghi rõ ở mục 4.

## 1. Kết luận

- Mức tổng thể: **đủ ở mức thực hành vững cho phần cốt lõi** (JVM, JMM, GC, concurrency, collections, generics, exception, Java 17/21). Phần yếu nằm ở rìa API và ở "điểm mới theo phiên bản".
- Chủ đề MUST: 66; số chủ đề MUST có độ phủ >= 2: 65, tức khoảng **98%**. Chủ đề SHOULD có độ phủ >= 2: 29/43 (khoảng 67%).
- MUST còn thiếu (phủ <= 1): chủ yếu `flatMap`/primitive stream/`reduce` trong Stream (chỉ 1 dòng ở bảng ôn). Phần còn lại của danh sách thiếu là SHOULD (xem mục 3).
- Thiếu rõ nhất ở nhóm "điểm mới theo phiên bản": Sequenced Collections (Java 21) chưa có chữ nào, text block mới có 1 dòng, Java 22-25 chưa có (bảng LTS còn ghi 25 là "kế tiếp"; chính `phong-van-tong-hop.md` cũng tự ghi nhận chưa có Java 22+).
- Nhóm sâu của JVM/concurrency vượt chuẩn tài liệu chính thức: JMM có bài riêng với 17.4 đầy đủ, AQS, virtual thread có thử nghiệm pinning, công cụ chẩn đoán. Không cần bổ sung ở nhóm này, trừ nội bộ G1.
- Có 1 bài thừa so với mục tiêu backend: `08-Java/Java-Concurrency/medium/lt-09-gui-single-thread.md` (Swing), có thể giữ nhưng không cần ôn.
- Hạn chế khi đối chiếu: xem mục 4, một số nguồn chỉ đối chiếu từ kiến thức vì không lấy trang mục lục.

## 2. Bảng đối chiếu

Thang độ phủ: 0 không có; 1 chỉ nhắc tên; 2 giải thích cơ chế; 3 có ví dụ code hoặc sơ đồ. Tiền tố liên kết: C = Java Core, X = Java Concurrency, Q = Interview-QA, S = Spring Boot. Nguồn: JT = Java Tutorials, JLS, JVMS, GC = GC Tuning Guide, JEP, API = Javadoc package.


### A. Ngôn ngữ (JT Language Basics, Classes and Objects, Interfaces and Inheritance, Numbers and Strings, Generics, Packages, Annotations; JLS ch. 3-15)

| Chủ đề (nguồn) | Mức | Phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Primitive type, literal, Unicode escape (JLS 3, 4) | MUST | 3 | [C lt-02](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-02-kieu-du-lieu-string.md), [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md) | Có pitfall số học đã chạy thử |
| Variable, scope, cast, numeric promotion, compound assignment (JLS 5, 6) | MUST | 3 | [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md) |  |
| Operator, bitwise, bit shift `<<` `>>` `>>>`, precedence (JLS 15) | SHOULD | 1 | [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md) | Chỉ có ví dụ cắt bit khi cast; không có mục toán tử bit và dịch bit. `>>>` chỉ lộ ra trong ví dụ hash của HashMap |
| Control flow, nhãn break/continue (JLS 14) | SHOULD | 2 | [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md), [C lt-35](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-35-tu-khoa-java.md) | Nhãn chỉ nhắc tên |
| Array, array nhiều chiều, `Arrays`, `System.arraycopy`, covariance của mảng (JLS 10) | SHOULD | 2 | [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md), [C lt-05](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-05-collections-co-ban.md) | Không có `arraycopy`, `Arrays.fill`, `ArrayStoreException` |
| Wrapper, autoboxing, Integer cache, so sánh `==` | MUST | 3 | [C lt-02](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-02-kieu-du-lieu-string.md), [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md), [Q qa-01](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md) |  |
| String immutable, string pool, `intern`, StringBuilder/Buffer | MUST | 3 | [C lt-02](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-02-kieu-du-lieu-string.md), [Q qa-01](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) |  |
| String API Java 11-21 (`strip`, `repeat`, `lines`, `formatted`, `chars`), StringJoiner | SHOULD | 1 | [C lt-02](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-02-kieu-du-lieu-string.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Chỉ rải rác `repeat`, `formatted`; chưa có bảng API hay dùng |
| Text block `"""` (JEP 378, Java 15) | SHOULD | 1 | [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md) | Chỉ 1 dòng trong bảng tính năng; thiếu quy tắc thụt lề, `\` nối dòng, `\s` |
| Unicode: UTF-16, surrogate pair, `codePoint`, compact strings | SHOULD | 2 | [Q qa-08](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-08-bai-code-kinh-dien.md), [C lt-02](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-02-kieu-du-lieu-string.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Chủ yếu nằm ở bài code kinh điển |
| Class, object, constructor, thứ tự khởi tạo | MUST | 3 | [C lt-03](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-03-oop.md), [C lt-25](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-25-enum-object-inner-class.md) |  |
| Access modifier, encapsulation | MUST | 3 | [C lt-03](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-03-oop.md) |  |
| Inheritance, override, LSP, polymorphism, covariant return, composition | MUST | 3 | [C lt-03](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-03-oop.md), [C lt-25](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-25-enum-object-inner-class.md) |  |
| Abstract class vs interface; `default`, `static`, `private` method trong interface (JT Interfaces) | MUST | 2 | [C lt-35](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-35-tu-khoa-java.md), [C lt-03](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-03-oop.md) | `default` và xung đột diamond có đủ; `static`/`private` interface method chỉ lướt |
| Nested, inner, local, anonymous class (JT Nested Classes) | MUST | 2 | [C lt-25](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-25-enum-object-inner-class.md), [C lt-03](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-03-oop.md) | Có rủi ro leak tham chiếu ngoài ở C31 |
| Enum, EnumMap/EnumSet, enum có hành vi | MUST | 3 | [C lt-25](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-25-enum-object-inner-class.md), [C lt-35](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-35-tu-khoa-java.md) |  |
| `equals`/`hashCode`/`toString`/`clone`/`finalize` của Object | MUST | 3 | [C lt-25](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-25-enum-object-inner-class.md), [Q qa-01](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md) |  |
| Generics: bounded type, wildcard, PECS, erasure, heap pollution | MUST | 3 | [C lt-07](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-07-generics.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Bridge method chỉ nhắc ở Q23 |
| Generic qua reflection (`getGenericType`, super type token, `TypeReference`) | SHOULD | 0 | - | Nền của Jackson `TypeReference`, Spring `ResolvableType`; chưa có chữ nào |
| Varargs, `@SafeVarargs` | NICE | 1 | [C lt-07](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-07-generics.md) |  |
| Record (JEP 395) | MUST | 3 | [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md), [C lt-03](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-03-oop.md), [Q qa-01](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md) |  |
| Sealed class/interface + `permits` (JEP 409) | MUST | 3 | [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md), [C lt-03](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-03-oop.md) |  |
| switch biểu thức, `yield` (JEP 361) | MUST | 3 | [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md), [C lt-35](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-35-tu-khoa-java.md) |  |
| Pattern matching: `instanceof`, `switch`, record pattern (JEP 394, 441, 440) | MUST | 3 | [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md) |  |
| `var` (JEP 286) và giới hạn dùng | SHOULD | 2 | [C lt-35](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-35-tu-khoa-java.md), [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md) |  |
| Unnamed patterns/variables `_` (JEP 443 preview 21, final 22), unnamed class/instance main (JEP 445) | NICE | 0 | - | Chỉ cần 3-4 dòng báo trạng thái |
| String Templates (JEP 430 preview 21; đã bị rút khỏi bản 23) | NICE | 0 | - | Cần 1 dòng cảnh báo 'đừng dùng, đã rút' |
| Lambda, functional interface, method reference, effectively final (JT Lambda) | MUST | 3 | [C lt-09](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-09-lambda-stream.md) | Method reference chỉ nhắc 1 lần |
| Exception: checked/unchecked, try-with-resources, suppressed, chaining, tự định nghĩa (JT Exceptions, JLS 11) | MUST | 3 | [C lt-04](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-04-exception.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) |  |
| Chi phí exception: `fillInStackTrace`, `StackWalker` | NICE | 1 | [C lt-04](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-04-exception.md) | Có câu 'đừng ném trong hot loop' |
| `assert` | NICE | 1 | [C lt-35](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-35-tu-khoa-java.md) |  |
| Package, import, import static, classpath, JAR (JT Packages) | MUST | 2 | [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md), [C lt-22](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-22-modules-version-ecosystem.md) | Manifest, multi-release JAR chưa có |
| Annotation: `@Retention`/`@Target`, tự viết, đọc bằng reflection (JT Annotations) | MUST | 3 | [C lt-11](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-11-reflection-annotation.md) | Có validator tự viết chạy được |
| Annotation nâng cao: `@Repeatable`, `@Inherited`, `@Documented`, type annotation (JSR 308) | NICE | 0 | - |  |
| Annotation processor (JSR 269, `AbstractProcessor`, AutoService) | SHOULD | 1 | [C lt-11](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-11-reflection-annotation.md) | Chỉ 2 câu; không có cơ chế vòng xử lý, không ví dụ |
| Reflection: `Class`, `Method`, `Field`, `setAccessible`, chi phí, rủi ro (JT Reflection) | MUST | 3 | [C lt-11](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-11-reflection-annotation.md), [C lt-21](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-21-dynamic-proxy-methodhandle.md), [C lt-22](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-22-modules-version-ecosystem.md) |  |
| Reflection phụ: `-parameters`, `Modifier`, `Array`, record component | NICE | 1 | [C lt-11](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-11-reflection-annotation.md) |  |
| Dynamic proxy, MethodHandle, VarHandle, LambdaMetafactory | SHOULD | 3 | [C lt-21](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-21-dynamic-proxy-methodhandle.md), [C lt-17](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-17-java-memory-model-sau.md) | LambdaMetafactory chỉ gián tiếp qua `invokedynamic` |
| Iterator, ListIterator, fail-fast, Comparable/Comparator, TimSort | MUST | 3 | [C lt-26](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-26-iterator-comparator-bigdecimal.md), [C lt-08](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-08-collections-noi-bo.md) |  |
| Functional interface trong `java.util.function` (Supplier, UnaryOperator, BiFunction...) | SHOULD | 2 | [C lt-09](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-09-lambda-stream.md) |  |
| Collections Framework: List/Set/Map/Queue/Deque, chọn đúng cấu trúc (JT Collections) | MUST | 3 | [C lt-05](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-05-collections-co-ban.md), [C lt-08](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-08-collections-noi-bo.md), [Q qa-01](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md) |  |
| HashMap bên trong: bucket, resize, treeify, LinkedHashMap LRU, TreeMap | MUST | 3 | [C lt-08](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-08-collections-noi-bo.md), [Q qa-01](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-01-java-core-co-ban.md), [C phong-van](/go?p=08-Java%2FJava-Core%2Fphong-van-tong-hop.md) | Red-black tree không giải thích |
| Immutable collection: `List.of`, `copyOf`, `unmodifiable*` | MUST | 3 | [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md), [C lt-23](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-23-api-design-effective-java.md) |  |
| Sequenced Collections (JEP 431, Java 21): `getFirst`, `getLast`, `reversed()`, `SequencedMap` | SHOULD | 0 | - | Tính năng Java 21 duy nhất của collection; cần mục ngắn trong C05 hoặc C06 |
| Collection đặc biệt: WeakHashMap, IdentityHashMap, BitSet, PriorityQueue, ArrayDeque | NICE | 2 | [C lt-08](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-08-collections-noi-bo.md), [C lt-31](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md) | IdentityHashMap, BitSet chưa có |
| Concurrent collection: ConcurrentHashMap, CopyOnWrite, BlockingQueue (JT Concurrent Collections) | MUST | 3 | [X lt-05](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-05-building-blocks.md), [Q qa-14](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md), [C lt-08](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-08-collections-noi-bo.md) |  |
| ConcurrentSkipListMap/Set, ConcurrentLinkedQueue/Deque | SHOULD | 1 | [X lt-05](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-05-building-blocks.md), [X lt-15](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-15-atomic-nonblocking.md) | Chỉ nhắc tên |
| Stream: pipeline lazy, `collect`, `groupingBy`, `partitioningBy`, `toMap` (JT Aggregate Operations) | MUST | 3 | [C lt-09](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-09-lambda-stream.md) |  |
| Stream: `flatMap`, `reduce`, `iterate`/`generate`, `mapToInt`/primitive stream | MUST | 1 | [C lt-09](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-09-lambda-stream.md), [C phong-van](/go?p=08-Java%2FJava-Core%2Fphong-van-tong-hop.md) | `flatMap` chỉ 1 dòng ở PV (7.4), `IntStream` mới lướt; thiếu ví dụ code |
| Parallel stream và bẫy | MUST | 3 | [C lt-09](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-09-lambda-stream.md), [C lt-31](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md) |  |
| Stream mới: `toList`, `mapMulti`, `takeWhile`/`dropWhile`, `Collectors.teeing`, Gatherers (JEP 485, Java 24) | NICE | 1 | [C lt-09](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-09-lambda-stream.md), [C phong-van](/go?p=08-Java%2FJava-Core%2Fphong-van-tong-hop.md) | `takeWhile`, `teeing` chưa có |
| Spliterator, Collector tự viết | NICE | 1 | [C lt-26](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-26-iterator-comparator-bigdecimal.md) |  |
| Optional | MUST | 3 | [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md), [Q qa-03](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-03-collections-concurrency.md) |  |

### B. Số, văn bản, ngày giờ (JT Numbers and Strings, Date Time, Regex, Internationalization)

| Chủ đề (nguồn) | Mức | Phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| BigDecimal, RoundingMode, BigInteger | MUST | 3 | [C lt-26](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-26-iterator-comparator-bigdecimal.md), [Q qa-08](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-08-bai-code-kinh-dien.md) | `MathContext` chưa có |
| `Math.*Exact`, `floorMod`, tràn số, NaN/Infinity | SHOULD | 2 | [C lt-24](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-24-cu-phap-nen-tang.md), [Q qa-08](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-08-bai-code-kinh-dien.md) |  |
| Random: SecureRandom, ThreadLocalRandom, SplittableRandom, RandomGenerator (JEP 356) | SHOULD | 2 | [C lt-33](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-33-mat-ma-hoc-trong-java.md), [X lt-10](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-10-liveness-hazards.md) | Chưa nói chọn loại nào cho việc gì |
| java.time: Instant, LocalDate, ZonedDateTime, Duration, Period, DST (JT Date Time) | MUST | 3 | [C lt-15](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-15-date-time-text.md) | Có ví dụ múi giờ bằng số |
| DateTimeFormatter, parse lỗi, kiểu legacy Date/Calendar/SimpleDateFormat không thread-safe | MUST | 2 | [C lt-15](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-15-date-time-text.md), [X lt-03](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md) |  |
| `TemporalAdjusters`, `YearMonth`, `ChronoField`, inject `Clock` | NICE | 2 | [C lt-15](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-15-date-time-text.md), [C lt-29](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-29-kiem-thu-junit-mockito.md) | Inject `Clock` có ở bài test |
| Regex: Pattern/Matcher, named group, ReDoS (JT Regex) | MUST | 2 | [C lt-15](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-15-date-time-text.md) | Thiếu flags, lookaround, greedy vs reluctant, `replaceAll` với nhóm |
| Locale, `NumberFormat`, `toLowerCase(Locale.ROOT)` | SHOULD | 2 | [C lt-15](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-15-date-time-text.md) |  |
| i18n: ResourceBundle, MessageFormat, Collator, Normalizer (JT Internationalization) | NICE | 0 | [Q qa-08](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-08-bai-code-kinh-dien.md) | Spring `MessageSource` thay thế trong thực tế |

### C. I/O, NIO, mạng, JDBC (JT Essential I/O, Custom Networking, JDBC; javadoc java.nio)

| Chủ đề (nguồn) | Mức | Phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| I/O stream, Reader/Writer, Charset, UTF-8 mặc định (JEP 400) | MUST | 3 | [C lt-10](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-10-io-nio.md) |  |
| NIO.2: `Path`, `Files`, `list`/`walk`/`lines`, ghi nguyên tử, chống path traversal | MUST | 2 | [C lt-10](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-10-io-nio.md) |  |
| NIO.2 nâng cao: WatchService, file attribute/POSIX, `walkFileTree`, symlink, PathMatcher | NICE | 0 | - |  |
| NIO: Buffer, Channel, FileChannel, memory-mapped, `transferTo` | SHOULD | 2 | [C lt-10](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-10-io-nio.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) |  |
| NIO: Selector, non-blocking socket, multiplexing (nền của Netty/Tomcat NIO) | SHOULD | 1 | [C phong-van](/go?p=08-Java%2FJava-Core%2Fphong-van-tong-hop.md) | Chỉ nhắc tên; Redis epoll giải thích ở bài Redis nhưng không nối về Java |
| java.net: Socket/ServerSocket, URI/URL, InetAddress, cache DNS của JVM | SHOULD | 1 | [X lt-07](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-07-huy-va-shutdown.md), [C lt-30](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md) | Socket xuất hiện như ví dụ cancel task, chưa có bài mạng cơ bản |
| `java.net.http.HttpClient` (Java 11) | MUST | 2 | [C lt-10](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-10-io-nio.md), [C lt-30](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md) |  |
| Serialization: `serialVersionUID`, `readObject`, `ObjectInputFilter`, record | MUST | 3 | [Q qa-11](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-11-serialization-json.md), [C lt-10](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-10-io-nio.md) |  |
| Process API: `ProcessBuilder`, `ProcessHandle`, `Runtime` | NICE | 0 | [X lt-07](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-07-huy-va-shutdown.md) | Chỉ có shutdown hook |
| JDBC: Connection, PreparedStatement, pool, transaction (JT JDBC) | MUST | 3 | [C lt-28](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-28-jdbc-connection-pool-logging.md) |  |
| Logging: SLF4J/Logback, `java.util.logging`, `System.Logger` | SHOULD | 2 | [C lt-28](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-28-jdbc-connection-pool-logging.md) |  |

### D. Concurrency (JT Concurrency, JLS 17, javadoc java.util.concurrent)

| Chủ đề (nguồn) | Mức | Phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Thread: lifecycle, `start`/`join`, interrupt, daemon, UncaughtExceptionHandler | MUST | 3 | [C lt-12](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-12-thread-co-ban.md), [X lt-01](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-01-gioi-thieu-dong-thoi.md), [X lt-07](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-07-huy-va-shutdown.md) |  |
| `synchronized`, monitor, `wait`/`notify` | MUST | 3 | [C lt-12](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-12-thread-co-ban.md), [X lt-02](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-02-thread-safety.md), [X lt-14](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-14-custom-synchronizer-aqs.md) |  |
| `volatile`, JMM (JLS 17.4), happens-before, safe publication, `final` field, DCL | MUST | 3 | [X lt-16](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-16-java-memory-model.md), [C lt-17](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-17-java-memory-model-sau.md), [X lt-03](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md) |  |
| Atomic, CAS, LongAdder, ABA, VarHandle | MUST | 3 | [X lt-15](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-15-atomic-nonblocking.md), [C lt-13](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-13-java-util-concurrent.md) |  |
| ReentrantLock, Condition, `tryLock`, fairness, ReadWriteLock | MUST | 3 | [X lt-13](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-13-explicit-locks.md) |  |
| StampedLock (optimistic read) | SHOULD | 2 | [X lt-13](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-13-explicit-locks.md), [Q qa-14](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md) | Có cơ chế, chưa có code |
| AQS, `LockSupport.park/unpark` | SHOULD | 2 | [X lt-14](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-14-custom-synchronizer-aqs.md), [Q qa-17](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md) |  |
| Synchronizer: CountDownLatch, CyclicBarrier, Semaphore, Exchanger | MUST | 3 | [X lt-05](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-05-building-blocks.md), [X lt-14](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-14-custom-synchronizer-aqs.md) |  |
| Phaser | NICE | 1 | [C lt-13](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-13-java-util-concurrent.md), [Q qa-14](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md) |  |
| Executor framework, `ThreadPoolExecutor` (tham số, rejection, kích thước), ScheduledExecutor | MUST | 3 | [X lt-06](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-06-task-execution.md), [X lt-08](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-08-thread-pool.md) |  |
| Future, FutureTask, CompletionService, `invokeAll`/`invokeAny` | MUST | 3 | [X lt-06](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-06-task-execution.md), [X lt-05](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-05-building-blocks.md) |  |
| CompletableFuture: composition, lỗi, timeout | MUST | 3 | [C lt-13](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-13-java-util-concurrent.md), [Q qa-14](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-14-concurrency-thuc-chien.md) |  |
| Fork/Join, work stealing | SHOULD | 3 | [C lt-31](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md) |  |
| BlockingQueue, producer-consumer, `SynchronousQueue` | MUST | 3 | [X lt-05](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-05-building-blocks.md), [X lt-08](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-08-thread-pool.md) |  |
| DelayQueue, LinkedTransferQueue, TransferQueue | NICE | 1 | [X lt-06](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-06-task-execution.md) |  |
| ThreadLocal, InheritableThreadLocal, leak | MUST | 3 | [C lt-31](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md), [X lt-03](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md) |  |
| Virtual threads (JEP 444), pinning, JEP 491 (Java 24) | MUST | 3 | [C lt-20](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md), [Q qa-17](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-17-concurrency-nang-cao.md) |  |
| Structured Concurrency, Scoped Values (preview ở 21; Scoped Values final ở 25, JEP 506) | SHOULD | 2 | [C lt-20](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md), [C lt-31](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md) | Cần cập nhật trạng thái theo bản 25 |
| Liveness: deadlock, livelock, starvation | MUST | 3 | [X lt-10](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-10-liveness-hazards.md) |  |
| Hiệu năng concurrency: Amdahl, contention, false sharing, `@Contended` | SHOULD | 2 | [X lt-11](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-11-hieu-nang-scalability.md), [C lt-17](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-17-java-memory-model-sau.md) |  |
| Thiết kế class thread-safe, immutable, confinement | MUST | 3 | [X lt-04](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-04-thiet-ke-lop-thread-safe.md), [X lt-02](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-02-thread-safety.md), [X lt-03](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md) |  |
| Cancel task, shutdown, shutdown hook | MUST | 3 | [X lt-07](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-07-huy-va-shutdown.md) |  |
| Concurrency testing | SHOULD | 3 | [X lt-12](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-12-kiem-thu-dong-thoi.md) |  |
| Reactive Streams, `java.util.concurrent.Flow`, `SubmissionPublisher` | NICE | 0 | [S lt-21](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md) | Spring WebFlux có bài riêng; chỉ thiếu API chuẩn của JDK |
| GUI single-thread (Swing/AWT) | SKIP | 3 | [X lt-09](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-09-gui-single-thread.md) | Cố ý ngoài phạm vi backend; bài này là thừa |

### E. JVM (JVMS ch. 2-6, HotSpot GC Tuning Guide, JEP)

| Chủ đề (nguồn) | Mức | Phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Vùng nhớ runtime: heap, stack frame, Metaspace, code cache, native memory (JVMS 2.5, 2.6) | MUST | 3 | [C lt-16](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-16-jvm-architecture-classloading.md), [C lt-02](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-02-kieu-du-lieu-string.md), [S lt-23](/go?p=01-Spring-Boot%2Fhard%2Flt-23-jvm-memory-gc.md) |  |
| Class loading, linking, initialization (JVMS 5) | MUST | 3 | [C lt-16](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-16-jvm-architecture-classloading.md) | `<clinit>` thread-safe có nêu |
| Class loader: phân cấp, parent delegation, tự viết, Metaspace leak | MUST | 3 | [C lt-16](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-16-jvm-architecture-classloading.md), [Q qa-06](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-06-jvm-hieu-nang-phan-tan.md) |  |
| Context ClassLoader (`Thread.getContextClassLoader`), ServiceLoader/JDBC/fat JAR | SHOULD | 0 | [X lt-08](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-08-thread-pool.md) | Chỉ xuất hiện 1 lần trong bài thread pool, không giải thích |
| Định dạng file class: magic, constant pool, attribute, `javap` (JVMS 4) | SHOULD | 1 | [C lt-16](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-16-jvm-architecture-classloading.md) | Chỉ lệnh `javap -c -p` |
| Bytecode instruction set: `invoke*`, `invokedynamic`, stack-based (JVMS 6, 2.11) | SHOULD | 2 | [C lt-16](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-16-jvm-architecture-classloading.md), [C lt-21](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-21-dynamic-proxy-methodhandle.md) |  |
| Verification, StackMapTable (JVMS 4.10) | NICE | 1 | [C lt-16](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-16-jvm-architecture-classloading.md) |  |
| Bố cục object: header, mark word, compressed oops, căn lề, JOL | SHOULD | 1 | [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Chỉ nhắc compressed oops 1 lần; chưa có bảng kích thước object |
| GC cơ bản: reachability, generation, mark/sweep/compact, STW | MUST | 3 | [C lt-18](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-18-gc-chuyen-sau.md) |  |
| Chọn collector: Serial, Parallel, G1, ZGC, Shenandoah, Epsilon | MUST | 2 | [C lt-18](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-18-gc-chuyen-sau.md), [Q qa-06](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-06-jvm-hieu-nang-phan-tan.md) | Có bảng so sánh; Epsilon chưa có |
| G1 bên trong: region, young/mixed, concurrent marking, remembered set, card table, IHOP, evacuation failure | SHOULD | 1 | [C lt-18](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-18-gc-chuyen-sau.md), [Q qa-06](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-06-jvm-hieu-nang-phan-tan.md) | Có humongous và dòng log 'Evacuation Pause'; thiếu chu kỳ marking và mixed collection |
| ZGC phân thế hệ (JEP 439), colored pointer, barrier | SHOULD | 2 | [C lt-18](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-18-gc-chuyen-sau.md) |  |
| Đọc log GC, quy trình chỉnh GC, `-Xlog:gc` | MUST | 3 | [C lt-18](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-18-gc-chuyen-sau.md), [C lt-32](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md), [Q qa-06](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-06-jvm-hieu-nang-phan-tan.md) |  |
| GC Tuning Guide: ergonomics, chọn heap trong container (`MaxRAMPercentage`), mục tiêu pause/throughput | MUST | 2 | [C lt-18](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-18-gc-chuyen-sau.md), [S lt-23](/go?p=01-Spring-Boot%2Fhard%2Flt-23-jvm-memory-gc.md) | Ergonomics (server-class machine, mặc định theo CPU/RAM) chưa nêu |
| Reference: Soft/Weak/Phantom, ReferenceQueue, Cleaner, `finalize` bị loại bỏ | SHOULD | 3 | [C lt-31](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md) |  |
| JIT: tiered, C1/C2, inlining, escape analysis, deoptimization, warmup | SHOULD | 3 | [C lt-19](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-19-jit-benchmark.md) |  |
| JMH, benchmark đúng cách | SHOULD | 3 | [C lt-19](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-19-jit-benchmark.md) |  |
| Chẩn đoán: jcmd, jstack, jmap, jstat, JFR, heap dump, NMT, async-profiler | MUST | 3 | [C lt-32](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md), [Q qa-18](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-18-tinh-huong-su-co-production.md) |  |
| Dạng OutOfMemoryError và memory leak | MUST | 3 | [S lt-23](/go?p=01-Spring-Boot%2Fhard%2Flt-23-jvm-memory-gc.md), [Q qa-18](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-18-tinh-huong-su-co-production.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) |  |
| JMX/MBean | NICE | 1 | [C lt-32](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md) |  |
| Java agent, Instrumentation, ASM/ByteBuddy, Class-File API | NICE | 2 | [C lt-21](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-21-dynamic-proxy-methodhandle.md) |  |
| JNI và Foreign Function & Memory API (JEP 442 preview 21; final ở 22, JEP 454) | NICE | 1 | [C lt-35](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-35-tu-khoa-java.md), [Q qa-23](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Mức biết tên là đủ |
| Vector API (incubator) | NICE | 0 | - |  |
| AOT: CDS/AppCDS, GraalVM native image, AOT cache (JEP 483/514/515), CRaC | SHOULD | 2 | [C lt-34](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-34-he-sinh-thai-framework-build-nang-cao.md), [C lt-19](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-19-jit-benchmark.md) | AOT cache/Leyden của bản 24-25 chưa có |
| Safepoint, time-to-safepoint | NICE | 1 | [C lt-32](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md) |  |

### F. Module, phiên bản, công cụ, bảo mật, thiết kế

| Chủ đề (nguồn) | Mức | Phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| JPMS: `module-info`, `exports`/`opens`, `--add-opens`, JEP 403 | MUST | 3 | [C lt-22](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-22-modules-version-ecosystem.md) | Có tái hiện lỗi `opens` |
| ServiceLoader / SPI | SHOULD | 3 | [C lt-22](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-22-modules-version-ecosystem.md) |  |
| `jlink`, `jpackage`, `jdeps`, multi-release JAR | NICE | 1 | [C lt-22](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-22-modules-version-ecosystem.md) | `jpackage` và multi-release chưa có |
| Công cụ JDK: `javac`, `jar`, `jshell`, `javadoc` | NICE | 1 | [C lt-01](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-01-tu-duy-java-jvm.md) |  |
| Bản đồ phiên bản 9-21 theo JEP và LTS | SHOULD | 2 | [C lt-22](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-22-modules-version-ecosystem.md), [C lt-06](/go?p=08-Java%2FJava-Core%2Feasy%2Flt-06-java-hien-dai.md) | Bảng LTS còn ghi 25 là 'kế tiếp'; mốc 9-16 (var 10, HttpClient 11, switch 14) có rải rác |
| Tính năng Java 22-25 (FFM final, unnamed `_`, Gatherers, flexible constructor body, module import, compact object headers JEP 519, JEP 491) | SHOULD | 1 | [C phong-van](/go?p=08-Java%2FJava-Core%2Fphong-van-tong-hop.md), [C lt-20](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md) | PV tự ghi 'Java 22+ chưa có'; chỉ JEP 491 có ở C20 |
| Build: Maven, Gradle, quản lý dependency | SHOULD | 3 | [C lt-27](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-27-build-tool-maven-gradle.md), [C lt-34](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-34-he-sinh-thai-framework-build-nang-cao.md) |  |
| Test: JUnit, Mockito | SHOULD | 3 | [C lt-29](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-29-kiem-thu-junit-mockito.md) |  |
| JSON/HTTP/thư viện tiện ích | SHOULD | 3 | [C lt-30](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-30-json-http-thu-vien-tien-ich.md) |  |
| Mật mã trong Java: MessageDigest, Cipher, KeyStore, TLS, SecureRandom | SHOULD | 3 | [C lt-33](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-33-mat-ma-hoc-trong-java.md) |  |
| Security Manager bị loại bỏ (JEP 411, 486) | NICE | 0 | - | 1 dòng |
| Thiết kế API: Effective Java, defensive copy, backward compatibility | MUST | 3 | [C lt-23](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-23-api-design-effective-java.md) |  |
| SOLID và design pattern | MUST | 3 | [C lt-14](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-14-solid-design-patterns.md) |  |
| Swing/AWT/JavaFX, Applet, RMI/CORBA, JNI chi tiết | SKIP | 0 | - | Cố ý không cần |

## 3. Khoảng trống cần bổ sung (ưu tiên giảm dần)

Chỉ liệt kê chủ đề MUST/SHOULD có độ phủ <= 1. Số từ là ước lượng cho phần viết thêm, theo văn phong rút gọn của bộ ghi chú.

| # | Mức | Khoảng trống | Đề xuất cụ thể | Quy mô |
|---|---|---|---|---|
| 1 | MUST | Stream: `flatMap`, `reduce`, `iterate`/`generate`, primitive stream | Thêm mục "Biến đổi nâng cao" vào `08-Java/Java-Core/medium/lt-09-lambda-stream.md`: 1 ví dụ `flatMap` (danh sách đơn hàng thành dòng hàng), `mapToInt().sum()`, `reduce` có identity, `Stream.iterate` có điều kiện dừng | 250 từ + 3 đoạn code |
| 2 | SHOULD | Sequenced Collections (Java 21) | Thêm mục vào `08-Java/Java-Core/easy/lt-05-collections-co-ban.md`: `SequencedCollection/Set/Map`, `getFirst/getLast/reversed`, bảng class nào cài (`List`, `Deque`, `LinkedHashSet/Map`, `TreeSet/Map`; `HashSet` không); thêm dòng vào bảng tính năng của lt-06 | 200 từ |
| 3 | SHOULD | Java 22-25 và cập nhật trạng thái preview | Tạo bài mới `08-Java/Java-Core/hard/lt-36-java-22-den-25-diem-moi.md`: bảng JEP theo bản (FFM final 22, `_` final 22, Gatherers 24, JEP 491 pinning 24, Scoped Values final 25, flexible constructor body 25, module import 25, compact object headers 25, AOT cache 24-25, Security Manager gỡ 24, String Templates bị rút 23); sửa dòng "25 LTS kế tiếp" ở lt-22 thành đã phát hành | 600-800 từ |
| 4 | SHOULD | Nội bộ G1: chu kỳ young/mixed, concurrent marking, remembered set, card table, IHOP, evacuation failure | Thêm mục "G1 bên trong" vào `08-Java/Java-Core/hard/lt-18-gc-chuyen-sau.md`: sơ đồ mermaid chu kỳ (young only, concurrent start, remark, cleanup, mixed), giải thích log Q06, 4 cờ chỉnh phổ biến | 400 từ + 1 sơ đồ |
| 5 | SHOULD | Context ClassLoader, SPI/JDBC/fat JAR, leak khi redeploy | Thêm mục vào `08-Java/Java-Core/hard/lt-16-jvm-architecture-classloading.md` ngay sau phần Class Loader; nối sang ServiceLoader ở lt-22 | 250 từ + 1 ví dụ |
| 6 | SHOULD | NIO Selector, non-blocking socket, multiplexing | Thêm mục "Selector" vào `08-Java/Java-Core/medium/lt-10-io-nio.md` (ví dụ echo server 25 dòng) và liên kết tới Netty/Tomcat NIO, epoll bên Redis | 300 từ + 1 ví dụ |
| 7 | SHOULD | java.net cơ bản: Socket/ServerSocket, URI/URL, DNS cache của JVM (`networkaddress.cache.ttl`) | Thêm mục "Mạng ở mức JDK" vào `08-Java/Java-Core/medium/lt-10-io-nio.md` hoặc `08-Java/Java-Core/medium/lt-30-json-http-thu-vien-tien-ich.md`; nhấn mạnh timeout (connect/read) và DNS cache khi chạy trên cloud | 250 từ |
| 8 | SHOULD | Text block và API String hiện đại (`strip`, `repeat`, `lines`, `formatted`, `chars`), StringJoiner | Thêm mục "String thế hệ mới" vào `08-Java/Java-Core/easy/lt-02-kieu-du-lieu-string.md`: bảng 8 API với phiên bản, quy tắc thụt lề text block | 250 từ |
| 9 | SHOULD | Bố cục object: header, mark word, compressed oops, JOL | Thêm mục "Một object tốn bao nhiêu byte" vào `08-Java/Java-Core/easy/lt-02-kieu-du-lieu-string.md` (liền mạch với phần heap), kèm kết quả JOL cho `Integer`, `Long[]`, record; nhắc JEP 519 | 300 từ |
| 10 | SHOULD | Toán tử bit và dịch bit (`<<`, `>>`, `>>>`, mặt nạ bit, `& 0xFF`) | Thêm mục vào `08-Java/Java-Core/easy/lt-24-cu-phap-nen-tang.md`: bảng toán tử, ví dụ cờ quyền và hash spread của HashMap | 200 từ |
| 11 | SHOULD | Generic qua reflection (`getGenericSuperclass`, super type token) | Thêm mục vào `08-Java/Java-Core/medium/lt-07-generics.md` hoặc `08-Java/Java-Core/medium/lt-11-reflection-annotation.md`: vì sao `TypeReference` hoạt động dù erasure | 200 từ + 1 ví dụ |
| 12 | SHOULD | Annotation processor | Mở rộng mục cuối của `08-Java/Java-Core/medium/lt-11-reflection-annotation.md`: vòng xử lý, `AbstractProcessor`, `@AutoService`, vì sao Lombok/MapStruct chạy được, 1 processor tối thiểu | 300 từ + 1 ví dụ |
| 13 | SHOULD | ConcurrentSkipListMap/Set | Thêm 1 hàng và 5 dòng vào mục "Concurrent collection" của `08-Java/Java-Core/medium/lt-08-collections-noi-bo.md` (khi nào cần map đã sắp xếp đồng thời) | 100 từ |
| 14 | SHOULD | Định dạng file class và object layout ở mức đọc `javap -v` | Thêm 1 mục "Đọc `javap -v`" vào `08-Java/Java-Core/hard/lt-16-jvm-architecture-classloading.md`: magic, version, constant pool, attribute chính; xác minh StackMapTable | 250 từ |

Ghi chú nhỏ cho NICE (không bắt buộc): `jpackage`/multi-release JAR, WatchService và file attribute, `ProcessBuilder`, i18n (ResourceBundle/MessageFormat), TemporalAdjusters, Phaser/DelayQueue, Flow/SubmissionPublisher (1 đoạn nối sang WebFlux), unnamed patterns/String Templates (3 dòng trạng thái), regex nâng cao (lookaround, greedy/reluctant).

## 4. Nguồn đã tra

Lấy được bằng công cụ web (đã đọc mục lục hoặc nội dung chính):

- https://docs.oracle.com/javase/tutorial/reallybigindex.html (mục lục toàn bộ Java Tutorials, dùng cho các trail Language, Collections, Concurrency, I/O, Date Time, Regex, Reflection, JDBC, Generics...)
- https://docs.oracle.com/javase/specs/jls/se21/html/index.html (mục lục JLS 21)
- https://docs.oracle.com/javase/specs/jvms/se21/html/index.html (mục lục JVMS 21)
- https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html (javadoc `java.util.concurrent`)
- https://docs.oracle.com/en/java/javase/21/gctuning/introduction-garbage-collection-tuning.html (trang mở đầu HotSpot GC Tuning Guide; chỉ trang này, chưa mở các chương con)
- https://openjdk.org/projects/jdk/21/ (danh sách JEP của JDK 21)
- https://openjdk.org/projects/jdk/17/ (danh sách JEP của JDK 17)
- https://openjdk.org/projects/jdk/25/ (trang là bản chụp trước ngày phát hành, chỉ dùng để đối chiếu tên JEP; trạng thái GA lấy từ kiến thức)

Không lấy được hoặc không thử, ghi "từ kiến thức, chưa đối chiếu nguồn":

- JLS 17 (chỉ dùng JLS 21, mục lục chương giống nhau ở các phần được đối chiếu).
- Javadoc package overview của `java.util.stream`, `java.time`, `java.nio`, `java.nio.file`: từ kiến thức, chưa đối chiếu nguồn.
- JEP của JDK 9-16, 18-20, 22-24 và trang JDK 22-24: từ kiến thức (riêng 22-25 chỉ có JDK 25 ở trên), chưa đối chiếu nguồn.
- Các chương con của HotSpot GC Tuning Guide (Parallel, G1, ZGC, ergonomics): từ kiến thức, chưa đối chiếu nguồn.
- Instruction set JVMS chương 6 chỉ tham khảo mục lục, không đối chiếu từng lệnh (không cần cho ghi chú rút gọn).

