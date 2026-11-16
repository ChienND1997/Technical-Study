# Câu hỏi: Database và SQL

Kiến thức gốc: [Database](/go?p=02-Database%2Findex.md). Đào sâu cơ chế bên trong: [Database chuyên sâu (hỏi xoáy)](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-22-database-chuyen-sau.md).

Mỗi câu theo chuỗi suy luận: **Câu hỏi** (hỏi theo hiện tượng hoặc tình huống), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả tới đáp án), **Đáp án ngắn** (nói thành tiếng được), **Nhớ** (kiến thức cốt lõi và liên kết bài gốc), rồi **Ví dụ** truy vết được và **Hỏi xoáy** (mỗi câu kèm lý do vì sao là bước tiếp theo). Ví dụ ghi rõ "đã chạy thử" (Python + SQLite trong môi trường soạn tài liệu; output là output thật) hay "minh họa" (cần MySQL/PostgreSQL thật nên chưa chạy ở đây). SQLite chỉ dùng để thể hiện các cơ chế chung của SQL và index; hành vi riêng của MySQL/PostgreSQL được nêu rõ khi khác.

Dữ liệu dùng chung cho các ví dụ truy vấn:

```sql
dept(id, name):            (1,'Dev'), (2,'Ops'), (3,'HR')
emp(id, name, dept_id, salary): (1,'An',1,100), (2,'Binh',1,200), (3,'Chi',2,150), (4,'Dung',NULL,90)
```

**Tóm tắt:**

- Phạm vi file: SQL và database nền tảng, mỗi câu bắt đầu từ một hiện tượng sai kết quả hoặc chậm và quy về cơ chế.
- Thứ tự logic của SELECT là `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`, nên `WHERE` không thấy bí danh và điều kiện trên hàm tổng hợp phải ở `HAVING`.
- `NULL` là "không biết" nên mọi phép so sánh cho UNKNOWN; `NOT IN` với `NULL` trả rỗng, và điều kiện cột bảng phải của LEFT JOIN đặt ở `WHERE` biến nó thành INNER JOIN.
- Index là B+Tree sắp xếp sẵn: bọc hàm, ép kiểu, `LIKE '%abc'` làm mất tác dụng, và index nhiều cột chỉ dùng được theo tiền tố trái; `EXPLAIN` cho thấy ước lượng có lệch thực tế không.
- ACID: rollback cả transaction khi một bước lỗi, MVCC cho đọc không block ghi; write skew xảy ra dưới snapshot isolation và chỉ Serializable hoặc lock mới chặn được.
- Lost update chữa bằng cập nhật nguyên tử, optimistic (`version`) hoặc pessimistic lock; deadlock chữa bằng thứ tự lấy lock cố định và retry; `OFFSET` sâu chậm nên dùng keyset.
- Hay bị hỏi xoáy nhất: `WHERE` khác `HAVING`, vì sao index `(a, b)` không giúp tìm riêng `b`, và migration đổi tên cột không downtime theo expand/contract.

## 1. Bạn viết `select salary*2 as dbl from emp where dbl > 300` thì PostgreSQL báo lỗi không thấy cột `dbl`, nhưng `order by dbl` lại chạy được. Vì sao, và thứ tự thực thi logic của một câu SELECT là gì?

**Gợi ý suy luận:**
- Để lọc hàng bằng `WHERE`, DB cần biết gì trước đó (bảng nào, hàng nào)? Khi đó bí danh đã được tính chưa?
- Giá trị tổng hợp như `sum(salary)` chỉ tồn tại sau bước nào? Điều kiện trên nó phải đặt ở mệnh đề nào?
- `ORDER BY` và `LIMIT` cần dữ liệu đã hoàn chỉnh ở dạng nào để sắp xếp và cắt top N?

**Lập luận:** SQL viết "SELECT trước, FROM sau" cho dễ đọc, nhưng DB không chạy theo thứ tự viết: muốn tính cột đầu ra thì phải biết bảng nào (`FROM`/`JOIN`) và hàng nào (`WHERE`) trước. Vì vậy `WHERE` chạy trước `SELECT`, mà bí danh `dbl` chỉ sinh ra ở `SELECT`, nên `WHERE` chưa thấy nó và PostgreSQL báo lỗi. `ORDER BY` chạy sau `SELECT` nên thấy được bí danh, và đó là chỗ dễ nhầm vì hai mệnh đề trông ngang hàng. Cùng logic đó, `sum(salary)` chỉ có sau `GROUP BY` (vì phải gom nhóm mới tính được), nên điều kiện trên nó phải đặt ở `HAVING`. `DISTINCT` chạy sau `SELECT` và `LIMIT` đứng cuối cùng, nên mới cắt đúng "top N" sau khi đã sắp xếp. Đây là thứ tự logic: optimizer được phép chạy theo thứ tự khác miễn kết quả giống hệt. Hệ quả khi viết: muốn dùng lại biểu thức ở `WHERE` thì lặp biểu thức đó hoặc bọc trong subquery/CTE, và đừng đặt điều kiện tổng hợp ở `WHERE`.

**Đáp án ngắn:** Thứ tự logic: `FROM/JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `DISTINCT`, `ORDER BY`, `LIMIT`. Bí danh tạo ở `SELECT` nên `WHERE` không thấy (PostgreSQL và MySQL báo lỗi), `ORDER BY` thì thấy; điều kiện trên giá trị tổng hợp phải ở `HAVING`.

**Nhớ:** Thứ tự logic quyết định kết quả đúng; optimizer có thể chạy thứ tự khác miễn kết quả giống hệt. Xem [SQL cơ bản](/go?p=02-Database%2Feasy%2Flt-01-sql-co-ban.md).

**Ví dụ:**

```sql
select salary*2 as dbl from emp where dbl > 300;
-- PostgreSQL: ERROR: column "dbl" does not exist   | MySQL: Unknown column 'dbl' in 'where clause'
-- SQLite là ngoại lệ: cho phép, trả [(400,)]. Đừng dựa vào điều này.
-- đúng ở mọi DB
select salary*2 as dbl from emp where salary*2 > 300;

select dept_id, sum(salary) s from emp group by dept_id having sum(salary) > 150;
```

Output thật của câu `HAVING`: `[(1, 300)]` (Dev: 100+200=300; Ops: 150 không vượt 150; nhóm `NULL` có tổng 90). Vì sao `HAVING` mà không phải `WHERE`: giá trị `sum(salary)` chỉ tồn tại **sau** `GROUP BY`. _Đã chạy thử (Python/sqlite); thông báo lỗi PostgreSQL/MySQL nêu theo hành vi đã biết, chưa chạy ở đây._

**Hỏi xoáy 1:** `ORDER BY` dùng được bí danh nhưng `WHERE` thì không, vì sao?
**Vì sao là bước tiếp theo:** Câu trả lời trên khiến người nghe thắc mắc vì sao riêng `ORDER BY` thấy được bí danh, nên hỏi để kiểm tra bạn hiểu thứ tự chứ không chỉ thuộc quy tắc.
**Đáp:** Theo thứ tự logic, `ORDER BY` chạy **sau** `SELECT` nên bí danh đã có; `WHERE` chạy trước. Đây cũng là lý do `LIMIT` sau `ORDER BY` mới ra đúng "top N".

**Hỏi xoáy 2:** Thứ tự logic có phải là thứ tự DB thật sự chạy?
**Vì sao là bước tiếp theo:** Sau khi nắm thứ tự logic, câu hỏi tự nhiên là DB có chạy đúng thứ tự đó không, để tách "kết quả đúng" khỏi "cách chạy thật".
**Đáp:** Không. Đó là mô hình ngữ nghĩa; optimizer được phép đổi thứ tự thực thi (đẩy điều kiện xuống trước join, chọn thứ tự join) miễn là kết quả y hệt. Hiểu thứ tự logic để biết **kết quả đúng là gì**, đọc `EXPLAIN` để biết **cách chạy thật**.

**Sai lầm hay gặp:** Đặt điều kiện giá trị tổng hợp trong `WHERE`, hoặc `SELECT` cột không nằm trong `GROUP BY` (MySQL cũ cho qua với kết quả tùy ý, PostgreSQL báo lỗi).

## 2. Bạn muốn liệt kê mọi phòng ban kèm nhân viên lương trên 120 nếu có. Đặt điều kiện `salary > 120` ở `ON` hay ở `WHERE` của LEFT JOIN thì kết quả khác nhau thế nào, và vì sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Join ghép từng cặp hàng theo điều kiện nào? Hàng bên trái không có cặp được xử lý ra sao ở OUTER JOIN (điền gì cho phía thiếu)?
- `WHERE` chạy trước hay sau khi phép ghép đã sinh ra các hàng `NULL`?
- `NULL > 120` cho giá trị gì, và `WHERE` giữ những hàng có kết quả nào?

**Lập luận:** LEFT JOIN giữ mọi hàng bên trái và điền `NULL` cho phía phải khi không có cặp phù hợp. Điều kiện ở `ON` thuộc về bản thân phép ghép: nó chỉ quyết định cặp nào được ghép, nên phòng `HR` không có ai lương trên 120 vẫn còn trong kết quả với nhân viên `NULL`. Điều kiện ở `WHERE` thì chạy sau phép ghép, trên kết quả đã có `NULL`: hàng `HR` có `e.salary = NULL`, mà `NULL > 120` là UNKNOWN, còn `WHERE` chỉ giữ hàng TRUE, nên hàng bị loại. Hệ quả là LEFT JOIN âm thầm thành INNER JOIN, và phòng không có nhân viên đủ điều kiện biến mất khỏi báo cáo mà không có lỗi nào. Điểm dễ nhầm là nghĩ đặt ở đâu cũng như nhau, đúng với INNER JOIN nhưng sai với OUTER JOIN. Quy tắc khi review: lọc cột của bảng phía được giữ (bên trái) ở `WHERE`, còn lọc cột bảng phía phải của LEFT JOIN thì đặt ở `ON`.

**Đáp án ngắn:** INNER chỉ giữ cặp khớp, LEFT giữ mọi hàng bên trái (phía phải `NULL` nếu không khớp), FULL giữ cả hai phía. Điều kiện thuộc về phép ghép đặt ở `ON`; lọc cột bảng phải của LEFT JOIN ở `WHERE` sẽ biến nó thành INNER JOIN.

**Nhớ:** `ON` quyết định ghép, `WHERE` lọc kết quả sau ghép. Xem [SQL cơ bản](/go?p=02-Database%2Feasy%2Flt-01-sql-co-ban.md).

**Ví dụ:** "mọi phòng ban, kèm nhân viên lương > 120 nếu có".

```sql
select d.name, e.name from dept d left join emp e on e.dept_id=d.id and e.salary>120;
select d.name, e.name from dept d left join emp e on e.dept_id=d.id where e.salary>120;
```

Output thật:

```text
điều kiện ở ON   -> [('Dev','Binh'), ('Ops','Chi'), ('HR', None)]
điều kiện ở WHERE-> [('Dev','Binh'), ('Ops','Chi')]
```

Với `ON`, phòng `HR` vẫn xuất hiện (nhân viên `NULL`). Với `WHERE`, hàng `HR` có `e.salary = NULL`, `NULL > 120` là UNKNOWN nên bị loại: LEFT JOIN đã **âm thầm thành INNER**. _Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** Vì sao join hai bảng có thể làm số hàng **tăng** lên?
**Vì sao là bước tiếp theo:** Khi đã hiểu join là ghép từng cặp, câu hỏi tiếp theo là số hàng sau join có thể thay đổi thế nào, vì đây là nguồn sai số liệu thực tế.
**Đáp:** Quan hệ một-nhiều: một phòng khớp nhiều nhân viên cho nhiều hàng. Hệ quả hay gặp: `sum()` trên bảng bên "một" bị cộng lặp sau khi join sang bảng "nhiều". Tổng hợp trước rồi join, hoặc dùng `distinct`/subquery có chủ đích.

**Hỏi xoáy 2:** MySQL không có `FULL JOIN`, làm sao?
**Vì sao là bước tiếp theo:** Hỏi tiếp để xem bạn biết FULL JOIN là phép tập hợp gồm hai phía nên có thể mô phỏng bằng LEFT và RIGHT, khi DB không có sẵn.
**Đáp:** Gộp `LEFT JOIN ... UNION ... RIGHT JOIN`. `UNION` (không `ALL`) khử trùng lặp.

**Sai lầm hay gặp:** Lọc bảng phải ở `WHERE` rồi thắc mắc vì sao mất dòng "không có dữ liệu".

## 3. Vì sao điều kiện `salary >= 100` đặt ở `WHERE` chạy nhanh và đúng, còn dời sang `HAVING` thì sai hoặc chậm? `WHERE` và `HAVING` khác nhau ở đâu?

**Gợi ý suy luận:**
- Trong thứ tự thực thi (câu 1), `GROUP BY` đứng trước hay sau `WHERE`? Lúc `WHERE` chạy, DB đang thao tác trên object nào?
- Sau khi gom nhóm, một nhóm còn mang một giá trị `salary` duy nhất hay nhiều giá trị?
- Lọc sớm làm số hàng phải gom tăng hay giảm?

**Lập luận:** `WHERE` chạy trước `GROUP BY` nên lọc từng hàng thô, và lọc sớm nghĩa là ít hàng phải đưa vào bước gom, rẻ hơn cả về CPU lẫn memory, thậm chí tận dụng được index. `HAVING` chạy sau `GROUP BY` nên chỉ còn các nhóm; lúc đó "lương" của một nhóm không còn là một giá trị đơn, vì vậy `HAVING` chỉ hợp với hàm tổng hợp hoặc cột đã dùng để gom. Do đó đặt `salary >= 100` ở `HAVING` hoặc bị lỗi (vì `salary` không nằm trong `GROUP BY`), hoặc nếu DB cho qua thì gom toàn bộ hàng rồi mới lọc, chậm hơn nhiều. Điểm dễ nhầm là tưởng `HAVING` là "WHERE cho nhóm" nên đặt mọi điều kiện ở đó. Quy tắc: điều kiện nào không phụ thuộc kết quả gom thì luôn đặt ở `WHERE`; chỉ điều kiện trên `SUM`, `COUNT`, `AVG`... mới ở `HAVING`.

**Đáp án ngắn:** `WHERE` lọc hàng trước khi gom (không dùng được hàm tổng hợp), `HAVING` lọc nhóm sau khi gom (dùng được hàm tổng hợp). Điều kiện không phụ thuộc kết quả gom thì đặt ở `WHERE` vì lọc sớm rẻ hơn.

**Nhớ:** Hai mệnh đề lọc ở hai thời điểm khác nhau của thứ tự thực thi. Xem [SQL cơ bản](/go?p=02-Database%2Feasy%2Flt-01-sql-co-ban.md).

**Ví dụ:**

```sql
select dept_id, count(*) from emp where salary >= 100 group by dept_id having count(*) >= 2;
-- WHERE bỏ nhân viên lương < 100 trước khi đếm; HAVING giữ phòng còn >= 2 người
```

Với dữ liệu mẫu: sau `WHERE` còn An, Binh, Chi; nhóm Dev có 2 người nên giữ, nhóm Ops có 1 nên bỏ. Nếu chuyển `salary >= 100` vào `HAVING` thì sai cú pháp/ngữ nghĩa vì `salary` không phải cột gom. _Minh họa theo ngữ nghĩa SQL chuẩn, kết quả suy ra từ dữ liệu mẫu._

**Hỏi xoáy 1:** Có thể viết `HAVING salary > 100` không?
**Vì sao là bước tiếp theo:** Câu trả lời nói `HAVING` làm việc trên nhóm, nên tự nhiên hỏi liệu có dùng cột thường (không gom) trong `HAVING` được không.
**Đáp:** Không với cột không nằm trong `GROUP BY` và không bọc hàm tổng hợp: sau khi gom, "mức lương" của một nhóm không còn là một giá trị duy nhất. (MySQL ở chế độ cũ cho phép với kết quả không xác định.)

**Hỏi xoáy 2:** Tại sao điều kiện ở `WHERE` còn tận dụng được index còn `HAVING` thì không?
**Vì sao là bước tiếp theo:** Sau khi biết hai mệnh đề lọc ở hai tầng khác nhau, hỏi tiếp về hệ quả hiệu năng: tầng nào còn gắn với cột thật của bảng để dùng index.
**Đáp:** `WHERE` tác động lên hàng thật của bảng nên index trên cột đó dùng được; `HAVING` hoạt động trên kết quả đã gom, không còn là cột của bảng.

**Sai lầm hay gặp:** Dồn mọi điều kiện vào `HAVING`, bắt DB gom toàn bộ bảng rồi mới lọc.

## 4. Bảng có 4 nhân viên, một người có `dept_id` là `NULL`. Vì sao `NOT IN (subquery)` có thể trả về rỗng, `COUNT(*)` khác `COUNT(dept_id)`, và `NULL = NULL` không cho TRUE?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- `NULL` nghĩa là "không biết" hay "bằng không/rỗng"? So sánh một thứ với "không biết" cho kết quả gì?
- `WHERE` giữ những hàng có kết quả logic nào trong ba giá trị TRUE, FALSE, UNKNOWN?
- `x NOT IN (1, NULL)` viết lại bằng `AND` thì thành những phép so sánh nào?

**Lập luận:** `NULL` nghĩa là "không biết", nên mọi phép so sánh với nó cho kết quả UNKNOWN (không phải TRUE hay FALSE), kể cả `NULL = NULL`, vì hai giá trị chưa biết không thể khẳng định là bằng nhau. `WHERE` chỉ giữ hàng cho TRUE, nên UNKNOWN bị loại như FALSE. Từ đây suy ra `NOT IN`: `x NOT IN (1, NULL)` tương đương `x <> 1 AND x <> NULL`; vế sau luôn UNKNOWN nên cả biểu thức không bao giờ TRUE và không hàng nào qua, dù trông như "x khác 1 là đủ". Đây là lý do `NOT IN` với subquery có thể chứa `NULL` trả về rỗng. Hàm tổng hợp thì bỏ qua `NULL`, nên `COUNT(cột)` đếm giá trị khác `NULL` và ít hơn `COUNT(*)` đếm mọi hàng. Điểm dễ nhầm là viết `= NULL` và thấy không ra gì. Khi viết: dùng `IS NULL`/`IS NOT NULL`, dùng `NOT EXISTS` thay cho `NOT IN` với subquery, và nhớ cột cho phép `NULL` làm kết quả đếm hoặc trung bình thay đổi.

**Đáp án ngắn:** `NULL` là "không biết" nên so sánh với nó ra UNKNOWN: dùng `IS NULL`, `NOT IN` với danh sách chứa `NULL` không trả hàng nào (dùng `NOT EXISTS`), `COUNT(*)` đếm hàng còn `COUNT(cột)` đếm giá trị khác `NULL`.

**Nhớ:** SQL dùng logic ba giá trị, `WHERE` chỉ giữ TRUE. Xem [SQL cơ bản](/go?p=02-Database%2Feasy%2Flt-01-sql-co-ban.md).

**Ví dụ:**

```sql
select count(*), count(dept_id) from emp;
-- [(4, 3)]  Dung có dept_id NULL nên COUNT(dept_id) ít hơn 1

select name from emp where dept_id not in (select dept_id from emp where dept_id is null or dept_id=2);
-- []      danh sách con chứa NULL => mọi phép NOT IN đều UNKNOWN => không hàng nào qua

select name from emp e where not exists (select 1 from dept d where d.id=e.dept_id and d.id=2);
-- [('An',), ('Binh',), ('Dung',)]    NOT EXISTS không bị NULL làm hỏng
```

Giải thích truy vết: `x NOT IN (1, NULL)` tương đương `x <> 1 AND x <> NULL`; vế sau luôn UNKNOWN nên cả biểu thức không bao giờ TRUE. _Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** `WHERE col <> 'A'` có trả về hàng có `col IS NULL` không?
**Vì sao là bước tiếp theo:** Từ quy tắc "`WHERE` chỉ giữ TRUE", hệ quả kế tiếp là phép `<>` cũng loại luôn các hàng `NULL`, một bẫy gặp hằng ngày.
**Đáp:** Không: `NULL <> 'A'` là UNKNOWN. Muốn lấy cả hàng `NULL` phải viết `col <> 'A' OR col IS NULL` (hoặc `IS DISTINCT FROM` ở PostgreSQL).

**Hỏi xoáy 2:** `NULL` trong `UNIQUE` thì sao?
**Vì sao là bước tiếp theo:** Khi `NULL` là "không biết", hai `NULL` có coi là trùng nhau không? Câu hỏi này kiểm tra bạn áp dụng cùng logic cho ràng buộc `UNIQUE`.
**Đáp:** Chuẩn SQL coi hai `NULL` là "không bằng nhau" nên cho nhiều `NULL` trong cột `UNIQUE` (MySQL, PostgreSQL mặc định theo đó; SQL Server khác). Cần ràng buộc "chỉ một NULL" phải xử lý riêng.

**Sai lầm hay gặp:** `NOT IN (subquery)` rồi báo cáo ra rỗng khi dữ liệu có một dòng `NULL` ở đâu đó.

## 5. Bảng nhân viên lưu luôn tên trưởng phòng trong từng dòng. Sửa trưởng phòng ở một dòng thì phòng đó thành có hai trưởng phòng. Chuẩn hóa giải quyết việc này thế nào, và khi nào nên chủ động phi chuẩn hóa?

**Gợi ý suy luận:**
- Một sự thật ("trưởng phòng Dev là ai") đang được lưu ở bao nhiêu chỗ? Cập nhật quên một chỗ thì điều gì xảy ra?
- Nếu tách sự thật đó ra bảng riêng thì mỗi lần đổi phải sửa mấy chỗ? Dạng chuẩn nào (1NF, 2NF, 3NF) nói về phụ thuộc vào lock?
- Khi truy vấn đọc quá chậm dù đã tối ưu, đánh đổi nào là chấp nhận được và cần trách nhiệm gì kèm theo?

**Lập luận:** Dữ liệu mâu thuẫn xuất hiện vì một sự thật (ai là trưởng phòng) nằm ở nhiều dòng, và ta chỉ sửa một dòng trong số đó, nên các dòng còn lại nói điều khác. Chuẩn hóa là kỷ luật để mỗi sự thật chỉ lưu ở đúng một chỗ: 1NF yêu cầu giá trị nguyên tử, 2NF yêu cầu mọi cột phụ thuộc toàn bộ primary key, 3NF cấm phụ thuộc bắc cầu (cột phụ thuộc vào cột không phải key). Tách tên trưởng phòng sang bảng phòng ban thì sửa một lần là đúng cho mọi dòng, và không còn bất thường khi thêm, sửa, xóa. Phi chuẩn hóa là đảo ngược có chủ đích: lưu dư để đọc nhanh hơn, đổi lại phải tự giữ các bản sao đồng bộ bằng trigger, job hoặc event, và chấp nhận có lúc lệch. Điểm dễ nhầm là phi chuẩn hóa từ đầu vì "join chậm" khi chưa đo. Hệ quả: thiết kế chuẩn hóa trước, chỉ phi chuẩn hóa chỗ đã đo thấy chậm và có kế hoạch đồng bộ.

**Đáp án ngắn:** Chuẩn hóa để mỗi sự thật lưu một chỗ, tránh dữ liệu mâu thuẫn khi cập nhật (1NF, 2NF, 3NF). Chỉ phi chuẩn hóa có chủ đích khi đọc quá chậm sau khi đã tối ưu, và phải có cơ chế giữ đồng bộ.

**Nhớ:** Chuẩn hóa chống trùng lặp và mâu thuẫn, phi chuẩn hóa đổi tính nhất quán  tốc độ đọc. Xem [Thiết kế schema](/go?p=02-Database%2Feasy%2Flt-02-thiet-ke-schema.md).

**Ví dụ:** bảng chưa chuẩn hóa lưu trưởng phòng trong từng dòng nhân viên.

```sql
emp_flat(emp, dept, dept_head):  ('An','Dev','Hoa'), ('Binh','Dev','Hoa')
update emp_flat set dept_head='Lan' where emp='An';      -- chỉ sửa một dòng
select distinct dept, dept_head from emp_flat;
-- [('Dev','Lan'), ('Dev','Hoa')]   phòng Dev có hai trưởng phòng: dữ liệu mâu thuẫn
```

Chuẩn hóa tách `dept(id, head)` và `emp(dept_id)`: trưởng phòng ở **một** nơi, sửa một lần là đúng cho mọi nhân viên. _Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** Cho ví dụ phi chuẩn hóa hợp lý.
**Vì sao là bước tiếp theo:** Sau khi nói "phi chuẩn hóa có chủ đích", người nghe muốn nghe một ví dụ cụ thể kèm chi phí đi theo.
**Đáp:** Cột `order.total` lưu sẵn tổng tiền thay vì cộng các dòng chi tiết mỗi lần xem. Chi phí: phải cập nhật `total` mỗi khi dòng chi tiết đổi, trong **cùng transaction**.

**Hỏi xoáy 2:** Phi chuẩn hóa có nghĩa là bỏ ràng buộc foreign key?
**Vì sao là bước tiếp theo:** Để chắc bạn không nhầm hai quyết định thiết kế khác nhau: lưu dư dữ liệu và ràng buộc foreign key.
**Đáp:** Không liên quan. Foreign key bảo vệ tính toàn vẹn tham chiếu; phi chuẩn hóa là chọn lưu dư. Hệ thống ghi nặng đôi khi bỏ foreign key để tăng throughput, đó là một đánh đổi riêng, không nên gộp hai khái niệm.

**Sai lầm hay gặp:** Phi chuẩn hóa từ đầu "cho nhanh" khi chưa đo, để lại dữ liệu mâu thuẫn khó sửa.

## 6. Bạn đã tạo index trên `email` nhưng câu `where lower(email) = '...'` vẫn quét toàn bảng. Index hoạt động thế nào, và vì sao hàm, ép kiểu hay `LIKE '%abc'` làm nó vô dụng?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Index lưu giá trị cột theo thứ tự nào, và tìm trong dữ liệu đã sắp xếp mất bao nhiêu bước (B+Tree)?
- Nếu giá trị bị biến đổi (hàm, ép kiểu) trước khi so sánh, thứ tự sắp xếp của index còn dùng được không?
- Với `LIKE '%abc'`, DB có điểm bắt đầu nào để nhảy tới trong dữ liệu đã sắp xếp không?
- Mỗi lần `INSERT/UPDATE`, index phải làm thêm việc gì?

**Lập luận:** Index là một cấu trúc phụ đã sắp xếp (B+Tree) theo giá trị cột đúng như được lưu, nên tìm một giá trị mất O(log n) thay vì quét cả bảng, và quét khoảng thì đi dọc các lá liền nhau. Ràng buộc then chốt là index chỉ hữu ích khi điều kiện so sánh cùng dạng với thứ đã sắp xếp. `lower(email)` hoặc ép kiểu biến giá trị cột thành một thứ index không sắp xếp theo, nên DB đành quét toàn bảng; `LIKE '%abc'` không biết phần đầu của chuỗi nên không có điểm bắt đầu để tìm. Còn index trên chính cột thì quá ít chọn lọc (trả phần lớn bảng) cũng bị optimizer bỏ qua vì đọc tuần tự rẻ hơn nhảy ngẫu nhiên. Cũng vì index là cấu trúc phải cập nhật theo mỗi lần ghi và chiếm memory, nên không nên tạo tràn lan. Cách chữa tương ứng: index theo biểu thức (`lower(email)`), lưu dạng đã chuẩn hóa, và `LIKE 'abc%'` thay cho tiền tố đầu `%`.

**Đáp án ngắn:** Index là B+Tree sắp xếp sẵn nên tìm O(log n) và quét khoảng được. Không dùng được khi bọc hàm trên cột, ép kiểu cột, `LIKE '%abc'`, điều kiện trả phần lớn bảng hoặc thống kê cũ; đổi lại index làm chậm ghi và tốn memory.

**Nhớ:** Index chỉ hữu ích khi so sánh trên đúng giá trị đã sắp xếp. Xem [Index và tối ưu truy vấn](/go?p=02-Database%2Fmedium%2Flt-03-index-toi-uu-truy-van.md).

**Ví dụ:** 20 000 người dùng; tìm theo email, xem kế hoạch của SQLite.

```sql
select * from users where email = 'User500@Mail.com'
   không có index:           SCAN users
   sau create index idx_email: SEARCH users USING INDEX idx_email (email=?)
select * from users where lower(email) = 'user500@mail.com'
   có idx_email nhưng bọc hàm: SCAN users
```

Index có sẵn nhưng `lower(email)` biến giá trị so sánh thành thứ **index không sắp xếp theo**, nên quay về quét toàn bảng. Cách sửa: index trên biểu thức (`create index ... on users (lower(email))`, PostgreSQL và SQLite hỗ trợ; MySQL 8 hỗ trợ functional index) hoặc chuẩn hóa dữ liệu khi lưu. _Đã chạy thử (Python/sqlite; PostgreSQL/MySQL cho kế hoạch tương tự về nguyên lý)._

**Hỏi xoáy 1:** Vì sao `LIKE 'abc%'` dùng được index còn `LIKE '%abc'` thì không?
**Vì sao là bước tiếp theo:** Câu trả lời nhắc đến `LIKE` nên hỏi tiếp để bạn giải thích bằng thứ tự sắp xếp, vì sao tiền tố dùng được còn hậu tố không.
**Đáp:** Chuỗi bắt đầu bằng `abc` nằm **liền kề** trong thứ tự sắp xếp nên tìm điểm bắt đầu rồi đọc tiếp; còn kết thúc bằng `abc` nằm rải rác khắp nơi. (Collation/ngôn ngữ và cấu hình `LIKE` ảnh hưởng điều này ở từng DB.)

**Hỏi xoáy 2:** Tạo index cho mọi cột có được không?
**Vì sao là bước tiếp theo:** Khi đã biết index giúp đọc nhưng làm chậm ghi, hỏi tiếp cái giá: có nên tạo index cho mọi cột không.
**Đáp:** Không. Mỗi index tốn dung lượng và làm chậm mọi ghi; cột chọn lọc kém (giới tính, trạng thái 3 giá trị) thường không đáng. Tạo index theo truy vấn thực tế, xóa index không dùng.

**Sai lầm hay gặp:** Thêm index nhưng truy vấn so sánh `varchar` với số (ép kiểu cột) nên index không bao giờ được dùng, và không ai biết vì không đọc kế hoạch.

## 7. Có index `(city, age)`. Vì sao `where age = 30` vẫn quét toàn bảng trong khi `where city = 'HN'` lại dùng được index? Thứ tự cột trong index nhiều cột quyết định điều gì?

**Gợi ý suy luận:**
- Index `(a, b, c)` sắp xếp theo cột nào trước, rồi cột nào trong cùng giá trị? Hình dung danh bạ sắp theo (họ, tên).
- Các hàng có `age = 30` nằm liền nhau hay rải rác qua từng nhóm `city`?
- Nếu index đã chứa mọi cột truy vấn cần thì có cần quay về bảng không?

**Lập luận:** Index `(city, age)` được sắp theo `city` trước, rồi trong từng `city` sắp theo `age`, giống danh bạ sắp theo họ rồi tên. Tìm theo `city`, hoặc theo `(city, age)`, có một điểm bắt đầu chung nên nhảy tới được ngay. Còn các hàng `age = 30` nằm rải rác trong từng nhóm `city`, không có điểm bắt đầu chung, nên phải duyệt hết: đó là quy tắc tiền tố trái (leftmost prefix). Từ đó suy ra cách chọn thứ tự cột: cột lọc bằng `=` đặt trước, cột khoảng hoặc sắp xếp đặt sau, vì sau cột khoảng thì các cột kế tiếp không còn nằm liền nhau để tìm. Điểm dễ nhầm là nghĩ index nhiều cột "bao" được mọi cột trong nó theo bất kỳ thứ tự nào; thực tế `(a, b)` không thay được index riêng cho `b`. Nếu index chứa đủ cột truy vấn cần (covering) thì trả lời thẳng từ index, khỏi đọc bảng. Khi thiết kế, liệt kê các truy vấn chính rồi chọn thứ tự cột phục vụ được nhiều truy vấn nhất.

**Đáp án ngắn:** Index `(a, b, c)` dùng được cho `a`, `(a, b)`, `(a, b, c)` nhưng không hiệu quả cho riêng `b`. Đặt cột `=` trước, cột khoảng/sắp xếp sau; covering index tránh được bước quay về bảng.

**Nhớ:** Tiền tố trái: index nhiều cột giống danh bạ sắp theo (họ, tên). Xem [Index và tối ưu truy vấn](/go?p=02-Database%2Fmedium%2Flt-03-index-toi-uu-truy-van.md).

**Ví dụ:** index `(city, age)` trên 20 000 hàng.

```text
where city='HN' and age=30  -> SEARCH ... USING INDEX idx_city_age (city=? AND age=?)
where city='HN'             -> SEARCH ... USING INDEX idx_city_age (city=?)
where age=30                -> SCAN users            (bỏ qua tiền tố, không dùng được)
```

Truy vết: với `age=30` không có `city`, các hàng `age=30` nằm rải rác trong từng nhóm `city`, không có điểm bắt đầu chung. _Đã chạy thử (Python/sqlite). Một số DB có skip scan có điều kiện (kiểm tra lại theo phiên bản); đừng dựa vào nó._

**Hỏi xoáy 1:** `(city, age)` hay `(age, city)` tốt hơn?
**Vì sao là bước tiếp theo:** Từ quy tắc tiền tố trái, câu tiếp theo là chọn thứ tự cột cụ thể cho hai trường hợp `(city, age)` và `(age, city)`.
**Đáp:** Phụ thuộc truy vấn. Nếu phần lớn truy vấn luôn có `city` (và đôi khi thêm `age`) thì `(city, age)`. Nếu `age` đơn lẻ cũng được lọc thường xuyên thì cần index riêng cho `age`. Quy tắc nhanh: cột `=` trước, cột chọn lọc cao thường ưu tiên, cột range cuối.

**Hỏi xoáy 2:** Covering index giúp gì?
**Vì sao là bước tiếp theo:** Hỏi tiếp để xem bạn biết lợi ích của việc index chứa đủ cột cần, một hệ quả của việc index là cấu trúc riêng đã sắp xếp.
**Đáp:** Tránh bước "quay về bảng" lấy cột còn lại (đọc ngẫu nhiên, đắt). Trong plan thấy `COVERING INDEX` (SQLite) hoặc `Index Only Scan` (PostgreSQL), `Using index` (MySQL).

**Sai lầm hay gặp:** Tạo `(a)` và `(a, b)` cùng lúc: index đầu thừa vì `(a, b)` đã phục vụ truy vấn theo `a`.

## 8. Một truy vấn đột nhiên chậm. Bạn chạy `EXPLAIN` và thấy `Seq Scan` với `rows=5` nhưng thực tế 4870 hàng. Đọc kế hoạch này để biết chuyện gì đang xảy ra và sửa thế nào?

**Gợi ý suy luận:**
- Optimizer chọn kế hoạch dựa trên dữ liệu nào (ước lượng số hàng từ thống kê)? Ước lượng lệch xa thì kế hoạch chọn có còn tốt không?
- Plan nào đáng ngờ: quét tuần tự bảng lớn, `Sort` ra đĩa, `Nested Loop` trên tập lớn? Ở đâu thấy số hàng bị loại bỏ?
- `EXPLAIN` và `EXPLAIN ANALYZE` khác nhau ở chỗ có chạy thật hay không, và điều đó có rủi ro gì với `UPDATE/DELETE`?

**Lập luận:** `EXPLAIN` hiển thị kế hoạch dựa trên **ước lượng** từ thống kê, nên đọc nó là so sánh ước lượng với thực tế để tìm chỗ optimizer đoán sai. Ở đây ước lượng 5 hàng nhưng thực tế 4870 (lệch gần 1000 lần): điều đó nghĩa là thống kê cũ hoặc không đủ, và kế hoạch được chọn dựa trên giả định sai. Khi optimizer tưởng chỉ có vài hàng thì quét toàn bảng (`Seq Scan`) là hợp lý, nhưng với 4870 hàng cần lấy từ một bảng lớn thì thiếu index phù hợp trên cột lọc mới là gốc. Vì vậy cách chữa gồm hai việc: tạo index trên `customer_id` (hoặc cột đang lọc) và chạy `ANALYZE` để cập nhật thống kê, để optimizer chuyển sang `Index Scan`. `EXPLAIN ANALYZE` chạy thật nên đo được thời gian thật và số hàng thật; điểm dễ nhầm là chạy nó với câu `INSERT/UPDATE/DELETE` trên production, vì nó thực sự ghi dữ liệu, nên phải bọc trong transaction rồi rollback. Dùng dữ liệu cỡ production, vì kế hoạch thay đổi theo kích thước bảng.

**Đáp án ngắn:** Đọc `EXPLAIN` để tìm chỗ ước lượng lệch thực tế, `Seq Scan` trên bảng lớn, `Sort` ra đĩa, `Nested Loop` trên tập lớn. Dùng `EXPLAIN ANALYZE` (chạy thật) với dữ liệu cỡ production, và cẩn thận với câu ghi.

**Nhớ:** Truy vấn chậm thường do ước lượng sai hoặc thiếu index. Xem [EXPLAIN và query planner](/go?p=02-Database%2Fhard%2Flt-09-explain-query-planner-tuning.md).

**Ví dụ (minh họa, số liệu giả định):**

```sql
EXPLAIN ANALYZE select * from orders where customer_id = 42;

Seq Scan on orders  (cost=0.00..18334.00 rows=5 width=64) (actual time=0.02..95.4 rows=4870 loops=1)
  Filter: (customer_id = 42)
  Rows Removed by Filter: 995130
Execution Time: 96.1 ms
```

Dấu hiệu: ước lượng `rows=5` nhưng thực `rows=4870` (lệch ~1000 lần: thống kê sai); loại bỏ gần 1 triệu hàng để lấy 4870 (quét cả bảng). Sau `create index on orders(customer_id)` và `ANALYZE orders`, kế hoạch chuyển sang `Index Scan` (hoặc `Bitmap Heap Scan` khi nhiều hàng khớp) và thời gian giảm mạnh. _Minh họa, chưa chạy thử trong môi trường này; các con số là giả định để chỉ cách đọc._

**Hỏi xoáy 1:** Index có sẵn mà vẫn `Seq Scan`: các nguyên nhân?
**Vì sao là bước tiếp theo:** Sau khi biết kế hoạch tốt là dùng index, trường hợp khó là đã có index mà vẫn `Seq Scan`: hỏi để liệt kê các nguyên nhân thay vì ép dùng index.
**Đáp:** (1) Điều kiện không khớp index (hàm/ép kiểu/tiền tố trái); (2) truy vấn trả phần lớn bảng nên quét tuần tự rẻ hơn; (3) thống kê cũ/sai; (4) bảng quá nhỏ. Kiểm tra từng nguyên nhân thay vì ép dùng index.

**Hỏi xoáy 2:** `EXPLAIN` và `EXPLAIN ANALYZE` khác nhau thế nào, cái nào nguy hiểm?
**Vì sao là bước tiếp theo:** Hỏi tiếp để phân biệt hai lệnh cùng tên mà khác bản chất, vì dùng nhầm `EXPLAIN ANALYZE` trên câu ghi có thể đổi dữ liệu thật.
**Đáp:** `EXPLAIN` chỉ hiện kế hoạch dự kiến (không chạy). `EXPLAIN ANALYZE` **chạy thật** và đo; với câu ghi (`UPDATE`/`DELETE`) dữ liệu thật bị thay đổi nếu không rollback.

**Sai lầm hay gặp:** Tối ưu trên bảng dev vài trăm dòng: kế hoạch ở production (hàng triệu dòng) hoàn toàn khác.

## 9. Chuyển tiền gồm hai bước trừ tiền, bước thứ hai vi phạm `CHECK (bal >= 0)`. Số dư cuối là 40, -20 hay 100, và ACID bảo đảm điều đó bằng gì?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Gợi ý suy luận:**
- Nhóm hai bước phải trông như một bước không thể chia: nếu lỗi giữa chừng thì điều gì xảy ra với bước đã làm (Atomicity)?
- Sau khi lỗi, dữ liệu có còn thỏa ràng buộc không (Consistency)? Nhiều người ghi cùng lúc thì sao (Isolation)?
- Đã commit rồi mà sập điện thì dữ liệu giữ lại nhờ cơ chế nào (Durability, nhật ký ghi trước)?

**Lập luận:** Bước thứ hai vi phạm `CHECK (bal >= 0)` nên câu lệnh lỗi, và vì hai bước nằm trong cùng một transaction nên DB rollback cả hai. Atomicity là "tất cả hoặc không gì cả", nên bước thứ nhất đã trừ cũng bị hoàn tác và số dư về 100, không phải 40 (không có kết quả nửa vời). Consistency nghĩa là DB chỉ chuyển từ trạng thái hợp lệ sang trạng thái hợp lệ, nhờ các ràng buộc như `CHECK`, `UNIQUE`, foreign key được kiểm tra khi commit hoặc từng câu. Isolation ngăn các transaction chạy đồng thời nhìn thấy hoặc làm hỏng công việc dở dang của nhau (mức độ tùy isolation level). Durability bảo đảm khi đã báo commit thì dữ liệu không mất: DB ghi nhật ký (WAL) xuống đĩa trước rồi mới báo, nên sau sập có thể phát lại log. Điểm dễ nhầm là hiểu Consistency của ACID là "nhất quán giữa các replica" (đó là chuyện khác) hoặc coi mọi lỗi tự rollback: ở ứng dụng, phải đặt `@Transactional` hoặc `BEGIN/COMMIT` đúng ranh giới thì các bước mới thuộc cùng một transaction.

**Đáp án ngắn:** ACID gồm Atomicity (tất cả hoặc không), Consistency (từ trạng thái hợp lệ sang hợp lệ), Isolation (đồng thời không làm hỏng nhau), Durability (đã commit thì không mất, nhờ WAL). Ở ví dụ số dư cuối là 100.

**Nhớ:** ACID biến một nhóm thao tác thành một bước không thể chia. Xem [Transaction, isolation và lock](/go?p=02-Database%2Fmedium%2Flt-04-transaction-isolation-lock.md).

**Ví dụ:** chuyển tiền, tài khoản có ràng buộc `bal >= 0`.

```sql
begin;
update acc set bal = bal - 60 where id = 1;   -- 100 -> 40
update acc set bal = bal - 60 where id = 1;   -- 40 -> -20: vi phạm CHECK
-- lỗi => rollback
select * from acc;   -- [(1, 100), (2, 0)]  : cả hai bước đều bị hủy, không còn "40"
```

Lỗi: `CHECK constraint failed: bal>=0`. Sau rollback, số dư là **100** chứ không phải 40: bước thứ nhất đã hoàn tác theo bước thứ hai. _Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** "Consistency" của ACID có phải là consistency của CAP?
**Vì sao là bước tiếp theo:** Từ chữ C trong ACID, hỏi tiếp để tránh nhầm với C trong CAP vì hai chữ cùng tên nhưng khác nghĩa.
**Đáp:** Không. C trong ACID là toàn vẹn ràng buộc nghiệp vụ trong một DB. C trong CAP là tính tuyến tính giữa các bản sao. Nhầm hai khái niệm này là lỗi phỏng vấn phổ biến.

**Hỏi xoáy 2:** Durability có đảm bảo tuyệt đối không?
**Vì sao là bước tiếp theo:** Chữ D nghe như tuyệt đối, nên hỏi để xem bạn biết nó phụ thuộc cấu hình ghi đĩa.
**Đáp:** Phụ thuộc cấu hình: nếu tắt `fsync`/nới lỏng (`innodb_flush_log_at_trx_commit=2`, `synchronous_commit=off`), vài giây gần nhất có thể mất khi sập. Đổi độ bền lấy tốc độ là lựa chọn có ý thức.

**Sai lầm hay gặp:** Nghĩ "dùng transaction" là đủ an toàn mà không biết mức isolation đang dùng cho phép dị thường nào (câu 10).

## 10. Hai bác sĩ cùng xin nghỉ, mỗi transaction đều thấy "còn 2 người trực" nên đều được duyệt, và cuối cùng không còn ai trực. Đây là dị thường gì, mức isolation nào cho phép và cách chặn?

**Gợi ý suy luận:**
- Chạy mọi transaction lần lượt thì chắc đúng nhưng chậm. Các mức isolation nới dần sự nghiêm ngặt, mỗi nấc cho phép thêm dị thường nào?
- Hai transaction này ghi hai hàng khác nhau hay cùng một hàng? Lock hàng có phát hiện xung đột không?
- Mỗi transaction đọc từ ảnh chụp (snapshot) của riêng nó, vậy ràng buộc "ít nhất một người" được kiểm tra trên dữ liệu nào?

**Lập luận:** Hai transaction cùng đọc ảnh chụp "còn 2 người trực" nên mỗi bên đều thấy việc xin nghỉ là hợp lệ. Chúng ghi hai hàng khác nhau (mỗi bác sĩ một hàng), nên không có xung đột lock trên cùng hàng và cả hai đều commit được. Kết quả gộp vi phạm luật "ít nhất một người trực" dù từng transaction nhìn riêng đều hợp lệ: đó là write skew, một dị thường khác lost update vì không ghi đè cùng một hàng. Snapshot isolation (Repeatable Read của PostgreSQL) cho phép chuyện này, vì nó chỉ ngăn đọc thay đổi, không phát hiện xung đột trên tập đã đọc. Muốn chặn có hai hướng: nâng lên Serializable (DB phát hiện và hủy một bên), hoặc dùng `SELECT ... FOR UPDATE` trên tập hàng đã đọc để buộc hai transaction xung đột và chờ nhau. Điểm dễ nhầm là tin mức Repeatable Read "đủ an toàn" cho mọi ràng buộc liên hàng. Khi review, mỗi luật nghiệp vụ kiểu "tổng hoặc số lượng phải đạt X" cần được bảo vệ bằng lock, Serializable hoặc ràng buộc ở DB, và code phải retry khi bị hủy.

**Đáp án ngắn:** Dị thường gồm dirty read, non-repeatable read, phantom read, cộng thêm lost update và write skew. Ví dụ trên là write skew: snapshot isolation cho phép, Serializable (hoặc lock tập đã đọc) mới chặn được.

**Nhớ:** Biết nấc isolation nào cho phép dị thường nào thì mới biết code của mình lộ ở đâu. Xem [Transaction, isolation và lock](/go?p=02-Database%2Fmedium%2Flt-04-transaction-isolation-lock.md).

**Ví dụ:** write skew: luật "luôn có ít nhất một bác sĩ trực", hiện có An và Binh trực.

| Bước | Transaction 1 (An xin nghỉ) | Transaction 2 (Binh xin nghỉ) |
|---|---|---|
| 1 | đọc: số bác sĩ trực = 2 → được nghỉ | đọc: số bác sĩ trực = 2 → được nghỉ |
| 2 | `UPDATE` An: nghỉ | `UPDATE` Binh: nghỉ |
| 3 | commit | commit |

Hai transaction ghi **hai hàng khác nhau** nên không xung đột lock hàng, nhưng kết quả không còn bác sĩ nào trực: vi phạm luật mà từng transaction đều "đúng" trên ảnh chụp của nó. Snapshot isolation cho phép điều này; Serializable (hoặc `SELECT ... FOR UPDATE` trên tập đã đọc) ngăn được. _Minh họa theo timeline, chưa chạy thử vì cần DB nhiều transaction thật._

**Hỏi xoáy 1:** Mức mặc định nào bảo vệ khỏi lost update?
**Vì sao là bước tiếp theo:** Sau khi thấy dị thường là chuyện của đọc-sửa-ghi, hỏi tiếp mức mặc định có tự bảo vệ khỏi lost update hay không.
**Đáp:** Không mức nào tự bảo vệ nếu bạn đọc-sửa-ghi ở tầng ứng dụng (xem câu 12 với ví dụ chạy được). Cần `UPDATE` nguyên tử, `FOR UPDATE`, optimistic lock, hoặc Serializable kèm xử lý retry.

**Hỏi xoáy 2:** Serializable có nghĩa là DB chạy tuần tự thật không?
**Vì sao là bước tiếp theo:** Đáp án nói dùng Serializable, nên hỏi tiếp để làm rõ "Serializable" thực chất bảo đảm điều gì và bạn phải làm gì khi nhận lỗi.
**Đáp:** Không. Chỉ đảm bảo **kết quả tương đương** một thứ tự tuần tự nào đó. PostgreSQL dùng SSI (phát hiện và hủy transaction gây circular dependency, nên bạn **phải** retry khi nhận lỗi serialization failure); InnoDB thêm lock đọc.

**Sai lầm hay gặp:** Chuyển lên Serializable "cho chắc" mà không có logic retry, rồi gặp lỗi `could not serialize access` lẻ tẻ ở tải cao.

## 11. Một transaction A đang đọc giữa chừng, transaction B sửa và commit cùng hàng đó mà không bị block, còn A vẫn thấy giá trị cũ. DB làm được điều đó bằng cách nào, và cái giá là gì?

**Gợi ý suy luận:**
- Nếu dùng lock thì người đọc và người ghi có tranh nhau không? Có cách nào để không sửa tại chỗ?
- Mỗi lần ghi tạo ra gì (phiên bản mới)? Người đọc nhìn phiên bản nào, tại thời điểm nào?
- Các phiên bản cũ còn ai dùng thì chưa dọn được; transaction chạy rất lâu ảnh hưởng gì đến việc dọn?

**Lập luận:** Nếu DB sửa tại chỗ thì người đọc phải chặn người ghi (hoặc ngược lại) để không thấy dữ liệu dở dang. MVCC tránh việc đó: mỗi lần ghi tạo ra một phiên bản mới của hàng, còn người đọc tiếp tục đọc phiên bản đúng với ảnh chụp lúc transaction của mình bắt đầu (PostgreSQL giữ phiên bản cũ trong chính bảng, InnoDB giữ trong undo log). Vì thế A vẫn thấy giá trị cũ và B không phải chờ, nên đọc không block ghi và ghi không block đọc, hai bên chỉ xung đột khi cùng ghi một hàng. Nhưng phiên bản cũ không tự biến mất: phải có tiến trình dọn (VACUUM ở PostgreSQL, purge ở InnoDB) và chỉ dọn được phiên bản mà không transaction nào còn cần. Do đó một transaction chạy lâu, kể cả chỉ đọc, giữ ảnh chụp cũ và chặn việc dọn, làm bảng phình và truy vấn chậm dần. Điểm dễ nhầm là mở transaction rồi gọi API ngoài, hay để phiên `idle in transaction`. Khi vận hành, giám sát tuổi của transaction dài nhất và giữ transaction ngắn.

**Đáp án ngắn:** MVCC giữ nhiều phiên bản của hàng, người đọc thấy ảnh chụp nhất quán nên đọc và ghi không block nhau. Cái giá là phải dọn phiên bản cũ, và transaction chạy lâu làm việc dọn bị kẹt.

**Nhớ:** MVCC giải quyết xung đột đọc-ghi, không thay lock cho ghi-ghi. Xem [PostgreSQL MVCC và WAL](/go?p=02-Database%2Fmedium%2Flt-08-postgresql-mvcc-wal.md).

**Ví dụ:** mô phỏng ảnh chụp bằng SQLite chế độ WAL, hai kết nối A (đọc) và B (ghi).

```text
A begin; A đọc bal         -> (100,)
B update bal=500 và commit  ; B đọc -> (500,)
A đọc lại (transaction cũ)  -> (100,)     A vẫn thấy ảnh chụp lúc bắt đầu
A commit; A đọc            -> (500,)      transaction mới thấy dữ liệu mới
```

B ghi và commit **không bị block** bởi A đang đọc, và A vẫn thấy giá trị nhất quán 100 suốt transaction của mình. Đó là bản chất "đọc không block ghi". (SQLite WAL chỉ minh họa ý tưởng ảnh chụp; MVCC của InnoDB lưu bản cũ trong undo log, PostgreSQL lưu nhiều phiên bản ngay trong bảng.) _Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** Vì sao một transaction để mở nhiều giờ gây hại?
**Vì sao là bước tiếp theo:** Câu trả lời nhấn mạnh phải dọn phiên bản cũ, nên hỏi tiếp transaction mở lâu gây hại thế nào.
**Đáp:** Nó giữ "ảnh chụp cũ nhất", nên mọi phiên bản mới hơn thời điểm đó không được dọn (undo history list phình ở InnoDB; bloat và vacuum bị block ở PostgreSQL). Giám sát transaction chạy lâu (`pg_stat_activity`, `information_schema.innodb_trx`) và đặt `idle_in_transaction_session_timeout`.

**Hỏi xoáy 2:** MVCC có thay thế lock không?
**Vì sao là bước tiếp theo:** Vì MVCC nghe như "không còn cần lock", hỏi tiếp để làm rõ phạm vi: nó giải quyết loại xung đột nào và loại nào vẫn cần lock.
**Đáp:** Không. MVCC giải quyết **đọc-ghi**; hai **ghi** vào cùng hàng vẫn cần lock hàng (người sau chờ người trước commit).

**Sai lầm hay gặp:** Mở transaction đầu request, gọi API bên ngoài mất vài giây rồi mới commit: giữ ảnh chụp và có thể giữ cả kết nối/lock.

## 12. Hai khách cùng mua món cuối cùng, tồn kho đọc ra là 10 ở cả hai request nhưng sau đó chỉ còn 9 thay vì 8. Vì sao, và pessimistic lock, optimistic lock hay `UPDATE` nguyên tử giải quyết thế nào?

**Gợi ý suy luận:**
- Giữa lúc đọc và lúc ghi ở tầng ứng dụng, người khác có thể chen vào không? Khi đó điều gì xảy ra với giá trị cũ đã đọc (lost update)?
- Có thể ngăn xung đột ngay từ lúc đọc (bi quan) hay phát hiện lúc ghi rồi retry (lạc quan)? Cái nào hợp khi tranh chấp cao, cái nào khi thấp?
- Nếu phép tính chạy bên trong DB thì còn khoảng hở giữa đọc và ghi không?

**Lập luận:** Hai request cùng đọc tồn kho 10, mỗi bên tự tính 9 ở tầng ứng dụng và cùng ghi 9, nên một lần trừ bị mất: đó là lost update, hệ quả của chuỗi đọc, sửa, ghi không nguyên tử. Có ba hướng sửa, khác nhau ở chỗ phát hiện xung đột. Pessimistic lock (`SELECT ... FOR UPDATE`) lock hàng ngay khi đọc nên người sau phải chờ, hợp khi tranh chấp cao nhưng giữ lock lâu hơn. Optimistic lock thêm cột `version` và `UPDATE ... WHERE version = ?`; nếu ảnh hưởng 0 hàng nghĩa là có người đã sửa, phải đọc lại và retry, không lock nên hợp khi tranh chấp thấp. Với phép trừ đơn giản, `UPDATE stock SET qty = qty - 1 WHERE id=? AND qty > 0` tính ngay bên trong DB dưới lock hàng nên không có khoảng hở nào, và điều kiện `qty > 0` còn chặn bán lố. Điểm dễ nhầm là dùng optimistic mà quên xử lý retry, hoặc dùng `FOR UPDATE` ngoài transaction nên lock nhả ngay. Chọn theo mức tranh chấp, và ưu tiên cập nhật nguyên tử khi được.

**Đáp án ngắn:** Lost update xảy ra khi đọc-sửa-ghi ở tầng ứng dụng. Bi quan (`FOR UPDATE`) hợp khi tranh chấp cao, lạc quan (cột `version`) hợp khi tranh chấp thấp, và phép trừ đơn giản dùng `UPDATE` nguyên tử là gọn nhất.

**Nhớ:** Bi quan ngăn xung đột, lạc quan phát hiện xung đột; chọn theo tần suất tranh chấp. Xem [Locking và deadlock](/go?p=02-Database%2Fhard%2Flt-10-locking-deadlock-database.md).

**Ví dụ chạy được:** bán 2 sản phẩm cùng lúc, tồn kho ban đầu 10.

```text
-- A và B cùng đọc qty=10 ở tầng ứng dụng, rồi cùng ghi qty = 10 - 1:
bán 2 cái, tồn kho còn: 9 (đúng ra là 8)      <- lost update
-- cùng việc bằng UPDATE nguyên tử qty = qty - 1:
tồn kho còn: 8
```

Optimistic lock: hai người cùng đọc `version=3`; người thứ nhất `UPDATE ... WHERE version=3` thành công (1 hàng, `version` thành 4); người thứ hai `UPDATE ... WHERE version=3` ảnh hưởng **0 hàng**, nghĩa là xung đột, phải đọc lại và retry:

```text
writer A (version=3): rowcount = 1
writer B (vẫn giữ version=3): rowcount = 0 => xung đột
khách 1 -> rowcount 1        (UPDATE stock SET qty=qty-1 WHERE qty>0)
khách 2 -> rowcount 0        (hết hàng, không bán quá)
```

_Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** Vì sao `UPDATE ... SET qty = qty - 1` an toàn còn "đọc rồi ghi" thì không?
**Vì sao là bước tiếp theo:** Ví dụ cho thấy `qty = qty - 1` an toàn còn đọc-rồi-ghi thì không, nên hỏi tiếp để lý giải bằng nơi phép tính được thực hiện.
**Đáp:** Biểu thức tính **bên trong DB**, dưới lock hàng, nên mỗi lần dùng giá trị mới nhất. Còn đọc ra ứng dụng rồi tính và ghi lại để lộ một khoảng hở giữa đọc và ghi cho người khác chen vào.

**Hỏi xoáy 2:** Lạc quan thất bại thì làm gì? Có retry vô hạn được không?
**Vì sao là bước tiếp theo:** Với optimistic lock, trường hợp tự nhiên kế tiếp là khi nó thất bại thì làm gì, và khi nào nên đổi sang bi quan.
**Đáp:** Retry giới hạn số lần (ví dụ 3), với backoff; nếu vẫn thất bại thì báo lỗi cho người dùng. Nếu xung đột thường xuyên thì lạc quan lãng phí (làm đi làm lại): chuyển sang bi quan.

**Sai lầm hay gặp:** Kiểm tra `if (qty > 0)` ở ứng dụng rồi mới trừ: hai request cùng thấy `qty = 1` và cùng bán, âm tồn kho.

## 13. Hai transaction chuyển tiền chéo (1 sang 2 và 2 sang 1) cùng chạy thì một bên nhận lỗi deadlock. Chuyện gì đã xảy ra, DB xử lý thế nào, và ứng dụng cần làm gì để giảm?

**Gợi ý suy luận:**
- Mỗi transaction giữ lock hàng nào và chờ lock hàng nào? Chuỗi chờ có khép thành vòng không?
- Khi mọi bên đều chờ nhau mãi, DB có chờ vô hạn được không, hay phải phá vòng bằng cách nào?
- Nếu mọi transaction luôn lấy lock theo cùng một thứ tự thì vòng chờ có hình thành được không?

**Lập luận:** T1 giữ lock hàng 1 và chờ hàng 2, T2 giữ hàng 2 và chờ hàng 1, nên hai bên chờ nhau thành một vòng và không bên nào tiến được. DB không thể để chờ mãi, nên thấy vòng (phát hiện deadlock) và hủy một transaction làm nạn nhân để phá vòng; transaction bị hủy nhận lỗi và ứng dụng phải bắt rồi retry cả transaction. Vì deadlock chỉ xảy ra khi có vòng, cách chắc chắn nhất là không cho vòng hình thành: luôn lock theo một thứ tự cố định (ví dụ id nhỏ trước), khi đó người đến sau chỉ chờ người đến trước và không bao giờ ngược lại. Ngoài ra giữ transaction ngắn và có index đúng để lock ít hàng nhất, vì càng giữ nhiều lock càng lâu thì xác suất giẫm chân nhau càng cao. Điểm dễ nhầm là nghĩ deadlock là bug phải loại hết: ở hệ thống có tải, nó có thể xảy ra, nên retry là một phần thiết kế. Đừng giữ transaction mở khi gọi hệ thống ngoài, vì sẽ kéo dài thời gian lock.

**Đáp án ngắn:** Deadlock là vòng chờ lock, DB hủy một transaction để phá vòng và ứng dụng phải retry. Giảm bằng cách truy cập theo thứ tự cố định, transaction ngắn, index đúng, không giữ transaction khi gọi hệ thống ngoài.

**Nhớ:** Thứ tự lấy lock cố định chặn vòng chờ từ gốc. Xem [Locking và deadlock](/go?p=02-Database%2Fhard%2Flt-10-locking-deadlock-database.md).

**Ví dụ:** chuyển tiền chéo giữa tài khoản 1 và 2.

| Thời điểm | T1: chuyển 1 → 2 | T2: chuyển 2 → 1 |
|---|---|---|
| 1 | `UPDATE acc SET ... WHERE id=1` (lock hàng 1) | `UPDATE acc SET ... WHERE id=2` (lock hàng 2) |
| 2 | `UPDATE acc SET ... WHERE id=2` → **chờ** T2 | `UPDATE acc SET ... WHERE id=1` → **chờ** T1 |
| 3 | vòng chờ: DB hủy một transaction | |

Thông báo điển hình: PostgreSQL `ERROR: deadlock detected`; MySQL `ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction`. Cách sửa: luôn lock **id nhỏ trước**: cả hai transaction cùng lấy lock hàng 1 rồi hàng 2, nên người sau chỉ chờ người trước chứ không thành vòng.

```java
long first = Math.min(from, to), second = Math.max(from, to);
// lock/update theo thứ tự first rồi second, bất kể chiều chuyển tiền
```

_Minh họa theo timeline, chưa chạy thử vì cần DB nhiều transaction thật; thông báo lỗi nêu theo tài liệu hai DB._

**Hỏi xoáy 1:** Deadlock có xảy ra trên một hàng duy nhất không?
**Vì sao là bước tiếp theo:** Ví dụ deadlock có hai hàng, nên hỏi tiếp liệu chỉ một hàng duy nhất có thể deadlock không, để lộ cơ chế nâng cấp lock.
**Đáp:** Có, qua **nâng cấp lock**: hai transaction cùng đọc hàng với lock chia sẻ rồi cùng muốn nâng lên lock ghi: mỗi bên chờ bên kia nhả lock chia sẻ. Cách tránh: lấy lock ghi ngay từ đầu (`SELECT ... FOR UPDATE`).

**Hỏi xoáy 2:** Thiếu index gây deadlock thế nào?
**Vì sao là bước tiếp theo:** Câu trả lời nhắc "index đúng", nên hỏi tiếp vì sao thiếu index lại tăng khả năng deadlock.
**Đáp:** Câu `UPDATE ... WHERE col = ?` không có index quét cả bảng và có thể lock nhiều hàng hơn cần thiết (InnoDB lock các hàng đã quét). Nhiều hàng bị lock thì xác suất hai transaction giẫm lên nhau theo thứ tự khác nhau tăng mạnh.

**Sai lầm hay gặp:** Bắt lỗi deadlock rồi chỉ ghi log mà không retry, nên thao tác của người dùng mất.

## 14. Người dùng vừa đặt hàng xong, chuyển sang trang "đơn của tôi" thì thấy trống, vài chục mili giây sau mới có. Thêm replica cũng không giúp ghi nhanh hơn. Vì sao, và replication khác sharding ở đâu?

**Gợi ý suy luận:**
- Replication sao chép cùng dữ liệu hay chia dữ liệu khác nhau? Mỗi replica phải làm gì với mọi ghi từ primary?
- Replica async nhận bản ghi ngay hay có latency (replication lag)? Đọc từ replica ngay sau ghi thấy gì?
- Muốn tăng throughput ghi và dung lượng vượt một máy thì phải chia dữ liệu ra sao, và phép truy vấn chéo shard khó đi thế nào?

**Lập luận:** Replication nhân bản cùng một dữ liệu sang nhiều node, nên chia được tải đọc và chịu được lỗi một node, nhưng mọi lần ghi vẫn phải đi qua primary và mỗi replica phải áp dụng lại toàn bộ các thay đổi đó, nên thêm replica không làm ghi nhanh hơn. Vì replica thường nhận thay đổi bất đồng bộ, nó có độ trễ (replication lag): người dùng vừa ghi vào primary rồi đọc ngay từ replica có thể thấy dữ liệu cũ, đó là hiện tượng "đơn trống". Sharding là hướng khác: chia dữ liệu **khác nhau** ra nhiều node nên tăng được cả ghi lẫn dung lượng, đổi lại truy vấn chéo shard, join và transaction phân tán khó hơn nhiều. Điểm dễ nhầm là coi replica đọc là cách mở rộng ghi, hoặc shard sớm khi chưa cần. Cách xử lý đọc sau ghi: đọc từ primary trong một khoảng ngắn sau khi ghi (read-your-writes). Thứ tự thử: index, cache, replica đọc, nâng cấu hình, rồi mới shard.

**Đáp án ngắn:** Replication: tăng đọc và chịu lỗi nhưng không tăng ghi, có replication lag. Sharding: tăng ghi và dung lượng nhưng truy vấn chéo shard và transaction phân tán khó. Thử index, cache, replica đọc, nâng cấu hình trước khi shard.

**Nhớ:** Replication replication, sharding phân chia. Xem [Replication, Partitioning, Sharding và HA](/go?p=02-Database%2Fhard%2Flt-05-replication-sharding-ha.md).

**Ví dụ:** hiệu ứng latency (minh họa, số liệu giả định).

```text
t=0 ms     ứng dụng ghi đơn #7 vào primary, nhận OK
t=0 ms     ứng dụng chuyển hướng người dùng sang trang "đơn của tôi", truy vấn replica
t=0..80 ms replica chưa nhận bản ghi #7 -> người dùng thấy "không có đơn"
t=80 ms    replica nhận xong
```

Cách xử lý: đọc từ primary trong một khoảng ngắn sau khi ghi, hoặc ghim phiên người dùng vào primary, hoặc dùng replica đồng bộ cho các thread đòi hỏi (đánh đổi latency ghi). Với sharding, ví dụ shard theo `user_id % 4`: truy vấn "tổng đơn hàng toàn hệ thống" phải hỏi cả 4 shard rồi gộp; chuyển tiền giữa hai user ở hai shard cần transaction phân tán (2PC hoặc saga). _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao thêm replica không tăng được khả năng ghi?
**Vì sao là bước tiếp theo:** Từ kết luận "replication không tăng ghi", hỏi tiếp để xem bạn giải thích được vì sao bằng việc replica phải áp dụng lại mọi thay đổi.
**Đáp:** Mọi ghi vẫn đi qua primary, và mỗi replica phải **áp dụng lại toàn bộ thay đổi** đó. Thêm replica chia sẻ việc đọc chứ không làm giảm lượng ghi mà mỗi node phải xử lý. Throughput ghi bị giới hạn bởi một node.

**Hỏi xoáy 2:** Chọn shard key thế nào?
**Vì sao là bước tiếp theo:** Khi đã chấp nhận sharding, bước quyết định kế tiếp là chọn shard key, vì chọn sai sẽ gây shard nóng và truy vấn chéo shard.
**Đáp:** Chọn shard key phối đều (tránh shard nóng) và khớp với truy vấn chính để đa số truy vấn chỉ vào **một** shard. Đổi shard key về sau rất đắt (di chuyển dữ liệu). Xem [Replication, Partitioning, Sharding và HA](/go?p=02-Database%2Fhard%2Flt-05-replication-sharding-ha.md).

**Sai lầm hay gặp:** Shard sớm khi chưa chạm trần của một máy mạnh kèm index và cache hợp lý.

## 15. Phân trang bằng `OFFSET 10000` càng về trang sâu càng chậm. Vì sao, và keyset pagination giữ chi phí không đổi bằng cách nào?

**Gợi ý suy luận:**
- Để trả về trang sâu, DB phải làm gì với 10000 hàng đứng trước (đọc rồi bỏ)? Chi phí tăng theo yếu tố nào?
- Nếu lấy giá trị của hàng cuối trang trước làm điểm bắt đầu tìm trong index đã sắp xếp thì còn phải đi qua các hàng trước không?
- Hai hàng có cùng giá trị sắp xếp thì cần thêm gì để thứ tự xác định?

**Lập luận:** `OFFSET n` buộc DB phải đọc rồi bỏ n hàng đầu mới tới hàng cần lấy, nên chi phí tăng tuyến tính theo độ sâu: trang 500 phải đi qua hàng chục nghìn hàng chỉ để vứt. Keyset pagination đổi cách hỏi: thay vì "bỏ qua n hàng", nó hỏi "các hàng sau hàng cuối của trang trước", tức dùng giá trị `(created_at, id)` của hàng cuối làm điểm bắt đầu và đi thẳng tới đó qua index đã sắp xếp, nên chi phí chỉ phụ thuộc kích thước trang, không phụ thuộc độ sâu. Vì giá trị cột sắp xếp có thể trùng, cần thêm cột duy nhất (`id`) làm tiebreaker để các hàng cùng thời điểm không bị lặp hoặc rớt giữa hai trang, và index phải khớp với `ORDER BY` để không phải sort lại. Đổi lại, keyset không nhảy được tới trang tùy ý, và thứ tự sắp xếp phải ổn định. Điểm dễ nhầm là chỉ thêm index vào cột sắp xếp rồi vẫn dùng `OFFSET`. Chọn theo nhu cầu: danh sách lớn hoặc cuộn vô hạn thì keyset, có số trang cố định và dữ liệu nhỏ thì `OFFSET` vẫn chấp nhận được.

**Đáp án ngắn:** Thay `OFFSET n` bằng điều kiện `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 20`. Hiệu năng ổn định theo độ sâu nhưng không nhảy được tới trang tùy ý.

**Nhớ:** Keyset tìm bằng index thay vì đọc bỏ hàng. Xem [Spring bên trong, câu 16](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md).

**Ví dụ:** 20 000 dòng, lấy 3 dòng sau 10 000 dòng đầu.

```text
offset 10000: [(10000,), (9999,), (9998,)]
keyset      : [(10000,), (9999,), (9998,)]        cùng kết quả
plan keyset : SEARCH users USING COVERING INDEX idx_created (created_at<?)
```

Keyset đi **thẳng** tới vị trí qua index; offset phải đi qua 10 000 mục. Chi tiết và câu hỏi xoáy ở [Spring bên trong, câu 16](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md). _Đã chạy thử (Python/sqlite)._

**Hỏi xoáy 1:** Cột sắp xếp có thể sửa đổi (ví dụ `updated_at`) thì sao?
**Vì sao là bước tiếp theo:** Keyset phụ thuộc vào thứ tự sắp xếp ổn định, nên hỏi tiếp điều gì xảy ra khi cột sắp xếp có thể bị sửa.
**Đáp:** Hàng "nhảy" vị trí khi bị sửa nên có thể xuất hiện hai lần hoặc bị bỏ sót giữa các trang. Dùng cột bất biến (`created_at`, `id`) hoặc chấp nhận hiện tượng đó.

**Hỏi xoáy 2:** Làm sao tạo con trỏ trang cho API?
**Vì sao là bước tiếp theo:** Keyset cần giá trị hàng cuối của trang trước, nên hỏi tiếp cách đưa nó qua API cho client.
**Đáp:** Mã hóa `(created_at, id)` của hàng cuối thành chuỗi không trong suốt (`cursor`), client gửi lại ở request sau.

**Sai lầm hay gặp:** Bỏ tiebreaker nên các bản ghi cùng thời điểm bị lặp hoặc rớt giữa các trang.

## 16. Đội muốn bỏ Postgres để dùng NoSQL vì "nhanh hơn, scale được". Bạn hỏi lại gì và chọn SQL hay NoSQL dựa trên tiêu chí nào?

**Gợi ý suy luận:**
- Mỗi loại kho tối ưu cho kiểu truy cập nào và từ bỏ thứ gì (join, ràng buộc, transaction)?
- Truy vấn quan trọng nhất của hệ thống là đọc một object theo key hay tổng hợp, lọc đa dạng?
- Dữ liệu có lớn tới mức một máy không chịu nổi ghi không, hay chỉ vài chục GB?

**Lập luận:** Không có "nhanh hơn" hay "scale được" nói chung, vì mỗi loại kho tối ưu cho một kiểu truy cập và đánh đổi những thứ khác. Quan hệ mạnh ở truy vấn đa dạng, ràng buộc toàn vẹn và transaction ACID, nhưng khó co giãn ghi ngang. NoSQL (document, key-value, wide-column) mạnh ở co giãn ngang và đọc theo key, đổi lại bỏ join, ràng buộc và nhiều khi cả transaction đa bản ghi, nên phần nhất quán chuyển sang ứng dụng. Vì vậy câu hỏi cần đặt trước là: truy vấn quan trọng nhất là gì, cần nhất quán tới mức nào, và khối lượng ghi thực tế có vượt quá một node Postgres đã tối ưu không (nhiều hệ thống chưa chạm giới hạn đó). Điểm dễ nhầm là chọn theo xu hướng hoặc con số benchmark không cùng tải với mình, rồi mất join và ràng buộc mà không đổi được gì thật. Mặc định quan hệ cho dữ liệu cốt lõi; chỉ thêm kho NoSQL khi có nhu cầu rõ rệt, và nhớ mỗi kho thêm vào là thêm chi phí vận hành và đồng bộ.

**Đáp án ngắn:** Mặc định quan hệ cho dữ liệu cốt lõi. Chọn NoSQL khi cần scale ghi rất lớn, truy cập đơn giản theo key hoặc dữ liệu đặc thù (đồ thị, chuỗi thời gian, tìm kiếm). Mỗi kho thêm vào là thêm chi phí vận hành và đồng bộ.

**Nhớ:** Chọn kho theo mô hình truy cập, không theo khẩu hiệu. Xem [Lưu trữ và chọn DB](/go?p=02-Database%2Fhard%2Flt-06-luu-tru-chon-db.md).

**Ví dụ:** cùng yêu cầu "đơn hàng và các dòng hàng", hai mô hình (minh họa).

| | Quan hệ | Document |
|---|---|---|
| Lưu | `orders` + `order_items` (2 bảng) | 1 document `order` chứa mảng `items` |
| Đọc một đơn | JOIN hai bảng | 1 lần đọc theo key |
| "Tổng doanh thu theo sản phẩm" | `GROUP BY product_id` đơn giản | Phải duyệt và gom mọi document (hoặc dựng index/aggregation) |
| Sửa giá một sản phẩm trên mọi đơn cũ | `UPDATE products` (nếu tham chiếu) | Phải sửa từng document chứa bản sao |

Mỗi bên thắng ở một dòng khác nhau: không bên nào thắng tất cả. Chọn theo **truy vấn quan trọng nhất của hệ thống**. _Minh họa, không đo hiệu năng._

**Hỏi xoáy 1:** NoSQL có phải là "không cần schema"?
**Vì sao là bước tiếp theo:** Một lý do thường nghe cho NoSQL là "không cần schema", nên hỏi tiếp xem bạn có biết schema đã đi đâu.
**Đáp:** Schema vẫn tồn tại, chỉ **chuyển vào code ứng dụng**. Dữ liệu cũ mới lẫn lộn phiên bản khiến mọi chỗ đọc phải xử lý nhiều dạng.

**Hỏi xoáy 2:** Khi dùng cả hai thì dữ liệu nằm ở đâu là "nguồn sự thật"?
**Vì sao là bước tiếp theo:** Khi hệ thống dùng nhiều kho, câu hỏi kế tiếp là kho nào là nguồn sự thật và các kho còn lại đồng bộ ra sao.
**Đáp:** Chọn **một** nơi là nguồn sự thật (thường là DB quan hệ), các kho khác (cache, search, analytic) là **bản dẫn xuất** được cập nhật qua event/CDC và chấp nhận trễ.

**Sai lầm hay gặp:** Chọn NoSQL vì "scale" khi dữ liệu chỉ vài chục GB và cần join, rồi tự cài lại join trong code.

## 17. Bạn cần đổi `full_name` thành `first_name`/`last_name` trên bảng hàng trăm triệu dòng mà không gián đoạn. Vì sao không `ALTER ... RENAME` ngay, và làm theo trình tự nào?

**Gợi ý suy luận:**
- Khi triển khai cuốn chiếu, code cũ và code mới có chạy parallel không? Code cũ còn đọc cột nào?
- Một số lệnh DDL lock bảng: lock lâu thì ghi bị block ra sao? Có công cụ tạo index hoặc đổi schema không lock không?
- Có thể chia thay đổi thành các bước nhỏ, mỗi bước an toàn riêng và quay lui được không?

**Lập luận:** Khi deploy, có lúc các instance cũ và mới chạy cùng nhau, nên instance cũ vẫn đọc `full_name`: đổi tên ngay sẽ gây lỗi hàng loạt đúng lúc đang triển khai. Thêm vào đó DDL trên bảng hàng trăm triệu dòng có thể lấy lock rất lâu và chặn mọi ghi. Từ hai ràng buộc đó suy ra nguyên tắc: mỗi bước thay đổi phải tương thích ngược với phiên bản code trước và không giữ lock lâu, nên chia thành nhiều bước độc lập theo mẫu expand/contract. Thứ nhất, thêm cột mới (nullable hoặc default hằng) để không phải viết lại bảng. Thứ hai, ghi cả hai cột. Thứ ba, backfill theo batch nhỏ cho dữ liệu cũ để không giữ lock và không làm replica trễ. Thứ tư, chuyển đọc sang cột mới. Cuối cùng, ở lần phát hành sau mới xóa cột cũ, khi chắc không còn code nào dùng. Điểm dễ nhầm là gộp tất cả vào một migration "cho gọn", làm mất đường lui. Dùng `CREATE INDEX CONCURRENTLY` hoặc công cụ online schema change, và luôn có kế hoạch quay lui cho từng bước.

**Đáp án ngắn:** Dùng expand/contract: thêm cột mới (nullable hoặc default hằng), ghi cả hai, backfill theo batch, chuyển đọc, rồi xóa cột cũ ở lần sau. Dùng `CREATE INDEX CONCURRENTLY` hoặc công cụ online schema change, và luôn có kế hoạch quay lui.

**Nhớ:** Schema phải tương thích với code đang chạy và không giữ lock lâu. Xem [Replication, partition và vận hành](/go?p=02-Database%2Fhard%2Flt-11-replication-partition-van-hanh.md).

**Ví dụ:** đổi cột `full_name` thành `first_name`/`last_name` (PostgreSQL, minh họa).

```sql
-- Bước 1: expand (không phá code cũ)
alter table users add column first_name text, add column last_name text;

-- Bước 3: backfill theo lô, mỗi lô một transaction ngắn
update users set first_name = split_part(full_name,' ',1),
                 last_name  = substr(full_name, length(split_part(full_name,' ',1)) + 2)
where id between 1 and 10000 and first_name is null;      -- lặp cho từng khoảng id

-- index mà không chặn ghi
create index concurrently idx_users_last_name on users(last_name);

-- Bước 5: contract (một lần phát hành sau, khi không còn code nào đọc full_name)
alter table users drop column full_name;
```

Vì sao không `ALTER ... RENAME` ngay: code đang chạy ở các instance chưa được cập nhật vẫn đọc `full_name`, sẽ lỗi hàng loạt giữa lúc deploy. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Thêm cột `NOT NULL DEFAULT 'x'` có an toàn không?
**Vì sao là bước tiếp theo:** Bước expand thường thêm cột `NOT NULL DEFAULT`, nên hỏi tiếp lệnh đó có viết lại bảng và lock lâu không.
**Đáp:** Tùy DB và phiên bản. PostgreSQL từ 11 thêm cột với default hằng **không** viết lại bảng; MySQL 8.0 có `ALGORITHM=INSTANT` cho nhiều trường hợp. Phiên bản cũ phải viết lại cả bảng và lock lâu. Luôn kiểm tra trên bản sao dữ liệu thật trước (kiểm tra lại theo phiên bản bạn dùng).

**Hỏi xoáy 2:** Backfill theo batch để làm gì?
**Vì sao là bước tiếp theo:** Bước backfill là phần dễ làm sập hệ thống nhất, nên hỏi tiếp vì sao phải làm theo batch.
**Đáp:** Một câu `UPDATE` toàn bảng giữ lock rất lâu, sinh log khổng lồ, làm replica trễ, và khó dừng. Lô nhỏ cho phép dừng, tiếp tục, và nhường tài nguyên cho tải thật.

**Sai lầm hay gặp:** Chạy `ALTER TABLE` trên bảng hàng trăm triệu dòng vào giờ cao điểm mà không biết lệnh đó có lock hay không.

