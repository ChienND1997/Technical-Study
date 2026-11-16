# Câu hỏi: Hibernate và JPA

Kiến thức gốc: [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md), [JPA bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-16-jpa-internals.md), [Transaction](/go?p=01-Spring-Boot%2Fmedium%2Flt-05-transaction.md). Các câu về N+1, persistence context và `open-in-view` ở mức tổng quát nằm ở [Spring bên trong](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md); trang này đi vào ORM nền tảng, mapping, quan hệ, truy vấn, flush, cache và optimistic lock.

Mỗi câu theo chuỗi: **Câu hỏi** (tình huống hoặc hiện tượng), **Gợi ý suy luận** (các câu hỏi nhỏ dẫn tới khái niệm nền), **Lập luận** (chuỗi nhân quả tới đáp án), **Đáp án ngắn** (nói thành tiếng được), **Nhớ** (kiến thức cốt lõi), rồi ví dụ truy vết được và các câu hỏi xoáy. Ví dụ ghi rõ "đã chạy thử" (JDK 11 hoặc Python/SQLite trong môi trường soạn tài liệu; output là output thật) hay "minh họa" (cần Hibernate/Spring/database thật nên chưa chạy ở đây). Các bản mô phỏng bằng Java chỉ tái hiện **cơ chế**, không phải Hibernate thật.

**Tóm tắt:**

- Phạm vi file: Hibernate và JPA, đi từ lỗi quen thuộc (N+1, lazy, mất cập nhật) về cơ chế persistence context.
- ORM che việc viết SQL chứ không che hậu quả của nó: mỗi lần chạm quan hệ lazy vẫn là một câu SQL, nên phải đọc được SQL sinh ra.
- `SessionFactory` thread-safe dùng chung, còn `Session`/`EntityManager` giữ state một đơn vị công việc nên không chia sẻ giữa thread.
- Quan hệ hai chiều có phía sở hữu (giữ foreign key) quyết định dữ liệu lưu; `LazyInitializationException` xảy ra khi chạm proxy ngoài session, N+1 sửa bằng `join fetch`, entity graph hoặc batch.
- Hibernate gom thay đổi trong persistence context và flush ở điểm đồng bộ, so với snapshot (dirty checking); cache cấp 1 là identity map một session, cấp 2 chia sẻ nhưng có rủi ro dữ liệu cũ.
- `@Version` phát hiện lost update bằng optimistic lock, `cascade` chỉ hợp với quan hệ sở hữu, `equals`/`hashCode` của entity nên dựa trên business key bất biến.
- Hay bị hỏi xoáy nhất: vì sao thêm vào danh sách mà DB không ghi `event_id`, `open-in-view` làm cạn connection pool thế nào, và khi nào không nên dùng ORM.

## 1. Vì sao có ORM, và vì sao nó không làm SQL biến mất?

**Câu hỏi:** Bảng trong DB là hàng và cột, còn code Java của bạn là các object trỏ tới nhau. Nếu tự viết JDBC cho mọi thao tác thì rất lặp. Người ta dùng Hibernate để giải quyết việc đó; vậy nó làm gì, và nó có thật sự che được SQL không?

**Gợi ý suy luận:**
- Một object `Order` có danh sách `OrderLine` và inheritance; bảng có hình dạng gì? Hai mô hình có khớp nhau không (object-relational impedance mismatch)?
- Nếu bạn đổi một field của object, ai phải biết để sinh câu `UPDATE`?
- Mỗi lần chạm một quan hệ, DB có phải làm việc không?

**Lập luận:** Bảng là hàng/cột, object là đồ thị tham chiếu có kế thừa, nên hai mô hình lệch nhau. Muốn dùng object mà lưu vào bảng thì cần một class dịch hai chiều: đọc một dòng thì dựng object, sửa object thì sinh `UPDATE`. Class dịch đó là ORM, và nó tiết kiệm mã lặp lại. Nhưng DB vẫn chỉ hiểu SQL, nên mỗi lần truy cập quan hệ vẫn là một câu SQL, mỗi vòng lặp vẫn có thể là N câu. Vì vậy ORM che việc **viết** SQL chứ không che **hậu quả** của nó. Điểm dễ nhầm là nghĩ dùng ORM thì không cần biết SQL: khi chậm, bạn buộc phải đọc SQL mà Hibernate sinh ra (bật `show_sql` hoặc log `org.hibernate.SQL`), đếm số câu cho một use case và hiểu index cần gì. Dùng ORM cho phần CRUD theo từng object, còn báo cáo và thao tác hàng loạt thường hợp với truy vấn viết tay.

**Đáp án ngắn:** ORM ánh xạ bảng/dòng sang class/object và tự sinh SQL thêm, đọc, sửa, xóa. Hibernate là cài đặt phổ biến nhất của đặc tả JPA. SQL vẫn chạy bên dưới nên phải đọc được SQL sinh ra.

**Nhớ:** Impedance mismatch giữa bảng và object; ORM tiết kiệm mã lặp chứ không xóa SQL. Entity sau khi nạp chỉ là POJO, không phụ thuộc Hibernate hay kết nối DB.

**Ví dụ:** cùng một việc "đổi tên người số 1" bằng JDBC thuần và bằng ORM (minh họa).

```java
// JDBC: bạn tự viết SQL, tự map
try (PreparedStatement ps = con.prepareStatement("update people set full_name = ? where id = ?")) {
    ps.setString(1, "Binh"); ps.setLong(2, 1L); ps.executeUpdate();
}
// JPA/Hibernate: sửa đối tượng, commit thì Hibernate tự sinh SQL
@Transactional void rename(long id, String name) { em.find(Person.class, id).setName(name); }
```

Hibernate log (khi bật `show_sql`):

```sql
select p1_0.id, p1_0.address, p1_0.full_name from people p1_0 where p1_0.id=?
update people set address=?, full_name=? where id=?
```

Lưu ý câu `update` mặc định cập nhật **mọi cột** (không chỉ cột đổi) trừ khi dùng `@DynamicUpdate`: bạn cần biết điều này vì SQL thật khác với suy nghĩ "chỉ đổi một cột". _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Khi nào ORM là lựa chọn tệ?
- Gợi ý: ORM làm việc theo từng object, DB làm việc theo tập hợp. Bài toán nào thuộc loại tập hợp?
- **Lập luận:** nếu cần đổi hàng triệu dòng, ORM phải nạp từng object lên memory rồi sinh từng `UPDATE`, trong khi DB làm trong một câu. Vậy ORM tệ ở thao tác tập hợp.
- **Đáp:** khi bài toán bản chất là thao tác tập hợp (báo cáo, cập nhật hàng loạt). Xem câu 14 với số liệu đếm câu lệnh.

**Hỏi xoáy 2:** "ORM che giấu SQL" có đúng không?
- Gợi ý: nếu ORM che hẳn SQL thì vòng lặp duyệt quan hệ có còn gây N câu truy vấn không?
- **Lập luận:** vì mỗi truy cập quan hệ vẫn đi tới DB, nên che việc viết không có nghĩa che được hậu quả; người dùng ORM giỏi phải đọc được SQL sinh ra.
- **Đáp:** chỉ che việc viết, không che hậu quả. Bật log SQL và hiểu plan của nó.

**Sai lầm hay gặp:** Coi ORM là hộp đen, không bao giờ xem SQL sinh ra, đến khi sản xuất chậm mới phát hiện hàng trăm câu truy vấn cho một trang.

## 2. Hai request chạy cùng lúc dùng chung một `EntityManager` thì sao?

**Câu hỏi:** `SessionFactory`, `Session` và `EntityManager` khác nhau thế nào? Một bạn tạo `EntityManager` bằng tay rồi giữ làm field của một service singleton, cho cả hai request dùng chung. Chuyện gì xảy ra, và vì sao Spring inject `EntityManager` vào singleton thì lại an toàn?

**Gợi ý suy luận:**
- Việc nào nặng và chỉ cần làm một lần khi khởi động (đọc cấu hình, phân tích mapping, tạo pool), việc nào nhẹ và lặp mỗi đơn vị công việc?
- `EntityManager` giữ persistence context chứa trạng thái gì (identity map, snapshot)? Trạng thái có thể thay đổi đó có an toàn khi hai thread cùng ghi không?
- Nếu bean singleton cần một thứ khác nhau theo transaction, Spring có thể đưa vào cái gì đứng ở giữa (proxy)?

**Lập luận:** Phần đắt (cấu hình, metamodel, pool, cache cấp 2) chỉ dựng một lần và chỉ đọc sau đó, nên dùng chung được: đó là `SessionFactory`/`EntityManagerFactory`, thread-safe. Phần rẻ là một đơn vị công việc giữ persistence context với state thay đổi liên tục, nên không thể chia sẻ: đó là `Session`/`EntityManager`, không thread-safe. Vì vậy hai request dùng chung một context sẽ cùng sửa identity map và snapshot không đồng bộ, dẫn tới thấy dữ liệu của nhau, `UPDATE` sai object hoặc `ConcurrentModificationException` ngẫu nhiên. Spring tránh bằng cách inject một proxy dùng chung, mỗi lần gọi trỏ vào `EntityManager` thật của transaction hiện tại, nên singleton vẫn an toàn. Điểm dễ nhầm là tưởng `@PersistenceContext` hay `@Autowired EntityManager` trong singleton là một object dùng chung nguy hiểm: thực ra đó là proxy, mỗi call đi vào `EntityManager` của transaction hiện tại. Khi review, tìm chỗ tự gọi `createEntityManager()` rồi giữ làm field, hoặc truyền entity managed sang thread khác (async), vì lúc đó context bị dùng ngoài transaction và ngoài thread của nó.

**Đáp án ngắn:** `SessionFactory`/`EntityManagerFactory` nặng, tạo một lần, thread-safe. `Session`/`EntityManager` nhẹ, một đơn vị công việc, giữ persistence context, không thread-safe. Dùng chung `EntityManager` giữa thread gây hỏng trạng thái; trong Spring thì inject proxy theo transaction.

**Nhớ:** Lifecycle khác nhau: factory một lần cho ứng dụng, context một lần cho transaction. Lấy Session gốc bằng `entityManager.unwrap(Session.class)`.

| Hibernate gốc | JPA chuẩn | Vai trò |
|---|---|---|
| `SessionFactory` | `EntityManagerFactory` | Nặng, tạo **một lần** cho cả ứng dụng, thread-safe, giữ cấu hình, mapping, pool, cache cấp 2 |
| `Session` | `EntityManager` | Nhẹ, **một đơn vị công việc**, giữ persistence context (cache cấp 1), **không thread-safe** |

**Ví dụ:** vì sao không thể dùng chung một `EntityManager` giữa các thread (minh họa).

```java
@Service class Bad {
    // tạo tay, giữ làm field của singleton
    private final EntityManager em = emf.createEntityManager();
    @Transactional void rename(long id, String n) { em.find(Person.class, id).setName(n); }
}
```

Hai request chạy đồng thời dùng chung một persistence context: identity map và snapshot (xem câu 9) bị cả hai thread cùng sửa không đồng bộ. Hậu quả: thấy dữ liệu của request kia, `UPDATE` sai object, hoặc `ConcurrentModificationException` ngẫu nhiên. Cách đúng: inject `EntityManager` do Spring quản lý (proxy theo transaction) hoặc dùng `JpaRepository`. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao `EntityManagerFactory` đắt, sao không tạo mỗi request?
- Gợi ý: khi khởi động nó phải làm những việc gì với mapping và schema?
- **Lập luận:** nó phân tích toàn bộ mapping, tạo metamodel, sinh câu SQL cố định, và (nếu cấu hình) validate schema. Làm lại mỗi request thì mỗi request trả phí này.
- **Đáp:** vì khối lượng khởi tạo lớn nên làm một lần.

**Hỏi xoáy 2:** Một transaction có thể dùng mấy persistence context?
- Gợi ý: hai method `@Transactional(REQUIRED)` lồng nhau thì có chung transaction không? `REQUIRES_NEW` thì sao?
- **Lập luận:** context gắn theo transaction; REQUIRED tham gia transaction sẵn có nên dùng chung context; `REQUIRES_NEW` mở transaction mới nên context mới, và vì chưa commit nên không thấy thay đổi của bên ngoài.
- **Đáp:** mặc định một context cho mỗi transaction; `REQUIRES_NEW` mở context mới, không thấy thay đổi chưa commit của bên ngoài.

**Sai lầm hay gặp:** Giữ `EntityManager` do tự tạo làm field, hoặc truyền entity giữa các thread rồi chạm quan hệ lazy.

## 3. Entity thiếu constructor không tham số thì Hibernate báo lỗi gì, vì sao?

**Câu hỏi:** Bạn khai báo `@Entity` với `@Id` đầy đủ nhưng chỉ có constructor `Person(String name)`. Khi Hibernate nạp dữ liệu thì báo `No default constructor for entity`. Tại sao, và còn những luật "kỳ lạ" nào khác với class entity (như không `final`)?

**Gợi ý suy luận:**
- Khi đọc một dòng từ DB, Hibernate không biết gọi constructor nào với tham số gì. Nó dựng object bằng cách nào (reflection)?
- Sau khi có object rỗng, nó đưa giá trị cột vào bằng cách nào?
- Muốn trả về một object "giả" để nạp lười, cách đơn giản nhất với một class là gì (kế thừa)? Class `final` thì sao?
- Làm sao biết dòng nào là object nào?

**Lập luận:** Hibernate dựng object bằng reflection: tạo một object rỗng rồi gán từng cột vào field. Vì nó không biết ý nghĩa tham số của constructor bạn tự viết nên chỉ gọi được constructor không tham số; nếu không có thì ném lỗi. Object cần định danh để phân biệt các dòng, nên phải có `@Id`. Để lazy loading, Hibernate trả về một subclass sinh động (proxy) của entity; class `final` không kế thừa được nên mất khả năng này. Từ đó ra bộ luật tối thiểu. Điểm dễ nhầm là dùng `@Data` hoặc `@AllArgsConstructor` của Lombok trên entity rồi thấy lỗi lạ: `@Data` sinh `equals`/`hashCode`/`toString` trên mọi trường (kể cả quan hệ lazy), và class `final` hay `record` không làm entity được. Hãy dùng constructor `protected` không tham số cho Hibernate, constructor có tham số cho code, và giữ entity là class thường không `final`.

**Đáp án ngắn:** Tối thiểu: `@Entity`, một `@Id`, constructor không tham số (có thể `protected`), class và các method truy cập không `final`. Thiếu constructor không tham số thì Hibernate không dựng được object từ dòng dữ liệu.

**Nhớ:** Hibernate dùng reflection và proxy kế thừa, nên entity cần constructor rỗng, không `final`, có `@Id`. Tên bảng/cột khác quy ước thì dùng `@Table`/`@Column`.

**Ví dụ:** mô phỏng việc ORM tạo object từ dòng.

```java
var ctor = c.getDeclaredConstructor();    // ORM tìm constructor KHÔNG tham số
ctor.setAccessible(true);
Object o = ctor.newInstance();
field.set(o, "giá trị từ cột full_name");
```

Output thật với hai class:

```text
WithDefault -> tạo được, name = giá trị từ cột full_name
NoDefault   -> NoSuchMethodException: không có constructor không tham số
```

Class chỉ có `NoDefault(String n)` không dựng được: đó chính là lý do Hibernate báo `No default constructor for entity`. Còn `protected` là đủ (như `WithDefault`) vì Hibernate dùng `setAccessible(true)`. _Đã chạy thử (JDK 11)._

Entity tối thiểu:

```java
@Entity @Table(name = "people")
public class Person {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "full_name", nullable = false, length = 100) private String name;
    protected Person() { }                       // cho Hibernate
    public Person(String name) { this.name = name; }
}
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Từ chuyện proxy, vì sao class entity không nên `final`?
- Gợi ý: proxy của lazy loading là gì so với class entity gốc?
- **Lập luận:** proxy là subclass sinh động của entity, `final` cấm kế thừa, nên không tạo được proxy.
- **Đáp:** class `final` chỉ còn nạp eager (hoặc phải dùng bytecode enhancement).

**Hỏi xoáy 2:** Cũng nói về `@Id`: `IDENTITY`, `SEQUENCE`, `UUID` khác gì, chọn thế nào?
- Gợi ý: ai sinh id và vào lúc nào? Hibernate có cần biết id trước khi `INSERT` không? Id ngẫu nhiên nằm ở đâu trong clustered index?
- **Lập luận:** `IDENTITY` để DB sinh id lúc `INSERT`, nên Hibernate phải insert ngay để biết id, hệ quả là tắt batch insert. `SEQUENCE` lấy trước một dải id (`allocationSize`) nên gom batch được. `UUID` không cần phối hợp DB nhưng id ngẫu nhiên chèn vào giữa clustered index, gây chia tách trang (xem [MySQL InnoDB bên trong](/go?p=02-Database%2Fmedium%2Flt-07-mysql-innodb-noi-bo.md)).
- **Đáp:** ưu tiên `SEQUENCE` trên PostgreSQL/Oracle khi cần batch; `IDENTITY` đơn giản nhưng mất batch; `UUID` tiện nhưng tốn index.

**Sai lầm hay gặp:** Dùng `@Data` của Lombok hoặc `record` làm entity: `record` là `final` và bất biến, không hợp JPA.

## 4. Thêm vé vào danh sách của event mà DB không ghi `event_id`: vì sao?

**Câu hỏi:** Bạn gọi `event.getTickets().add(ticket)` rồi `persist(event)`, nhưng khi lưu thì cột `event_id` của vé là `NULL` và vi phạm ràng buộc. Trong khi code Java trông đã nối hai bên rồi. Vì sao, và các kiểu quan hệ `@ManyToOne`, `@OneToMany`, `@ManyToMany` ánh xạ thế nào?

**Gợi ý suy luận:**
- Trong DB, quan hệ một-nhiều được biểu diễn bằng mấy cột foreign key và nằm ở bảng nào?
- Trong Java, quan hệ hai chiều có mấy tham chiếu? Hai tham chiếu đó đối ứng với mấy cột trong DB?
- Khi hai thứ này lệch nhau, JPA cần quy ước gì để biết nghe bên nào (phía sở hữu)?

**Lập luận:** DB chỉ có một cách biểu diễn: foreign key nằm ở bảng "nhiều". Java có hai tham chiếu (`event.tickets` và `ticket.event`) nhưng DB chỉ có một cột, nên JPA phải chọn một phía quyết định giá trị lưu xuống: phía sở hữu, tức phía ánh xạ tới cột foreign key (`@ManyToOne` với `@JoinColumn`). `@OneToMany(mappedBy = ...)` là phía ngược, không có cột riêng và chỉ là bản phản chiếu. Vì vậy chỉ `list.add()` ở phía ngược thì `ticket.event` vẫn `null`, JPA ghi `event_id = NULL`, vi phạm `NOT NULL`. Phải cập nhật phía sở hữu, hoặc cả hai phía bằng một method tiện ích. Điểm dễ nhầm là nghĩ chỉ cần thêm vào collection là JPA tự đồng bộ hai phía: Java không có ràng buộc đó, nên phải tự giữ cả hai tham chiếu nhất quán bằng một method tiện ích (`addTicket` gán cả `ticket.setEvent(this)`). Khi review quan hệ hai chiều, tìm phía có `mappedBy` và chắc chắn mọi code thay đổi đều đi qua method giữ đồng bộ, và đừng tạo quan hệ hai chiều khi một chiều là đủ.

**Đáp án ngắn:** `@ManyToOne` giữ foreign key và là phía sở hữu; `@OneToMany(mappedBy)` là phía ngược; `@ManyToMany` cần bảng nối, và nếu bảng nối có thêm cột thì tách thành entity riêng. Chỉ phía sở hữu quyết định dữ liệu lưu, nên phải gán `ticket.setEvent(event)`.

**Nhớ:** Foreign key nằm ở bảng "nhiều"; chỉ phía sở hữu được ghi xuống DB. Cập nhật cả hai phía qua method tiện ích.

**Ví dụ:** bảng được tạo ra và hệ quả của việc quên phía sở hữu.

```java
@Entity class Event  { @Id @GeneratedValue Long id;
    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    List<Ticket> tickets = new ArrayList<>(); }
@Entity class Ticket { @Id @GeneratedValue Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "event_id") Event event; }
```

```text
event(id)         ticket(id, event_id)        -- chỉ Ticket có cột khóa ngoại
```

Sai: chỉ cập nhật phía **không sở hữu**:

```java
event.getTickets().add(ticket);      // chỉ sửa danh sách trong bộ nhớ
em.persist(event);
// ticket.event vẫn null -> INSERT INTO ticket (event_id) VALUES (NULL) -> vi phạm NOT NULL (optional=false)
```

Đúng: cập nhật **cả hai phía** bằng một method tiện ích (`addTicket` gán `t.setEvent(this)`), vì phía sở hữu là `ticket.event`. _Minh họa theo cơ chế mapping, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao `@ManyToMany` nên dùng `Set` chứ không `List`?
- Gợi ý: `List` (bag) có định danh cho từng hàng của bảng nối không? Khi xóa một phần tử, Hibernate biết xóa dòng nào?
- **Lập luận:** không có định danh hàng thì Hibernate không chỉ ra được đúng dòng cần xóa, nên xóa toàn bộ các dòng bảng nối của chủ rồi chèn lại. `Set` thì xác định được từng phần tử.
- **Đáp:** `Set` cho phép xóa đúng một dòng bảng nối thay vì xóa hết rồi chèn lại.

**Hỏi xoáy 2:** `@OneToMany` một chiều (không có `mappedBy`) có vấn đề gì?
- Gợi ý: nếu phía "một" là phía sở hữu thì foreign key được đặt khi nào, ở bảng nào?
- **Lập luận:** phía "một" không có cột để ghi, nên Hibernate tạo bảng nối thừa hoặc `INSERT` con rồi thêm `UPDATE` đặt foreign key.
- **Đáp:** SQL thừa. Hai chiều với `mappedBy` (hoặc chỉ `@ManyToOne` rồi truy vấn danh sách khi cần) gọn hơn.

**Sai lầm hay gặp:** Tin rằng `list.add()` ở phía cha là đủ để lưu quan hệ.

## 5. Vì sao đọc quan hệ ngoài transaction lại ném `LazyInitializationException`?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Service trả entity `Event` ra controller, controller gọi `event.getTickets().size()` thì nổ `LazyInitializationException: could not initialize proxy - no Session`. Lazy và eager khác nhau thế nào, mặc định là gì, và vì sao lỗi này xảy ra?

**Gợi ý suy luận:**
- Khi nạp `Event`, `tickets` có cần có sẵn dữ liệu thật ngay không? Nếu hoãn, thứ gì đứng ở chỗ đó (proxy)?
- Muốn proxy thật sự lấy dữ liệu thì nó cần chạy SQL, và SQL cần gì để chạy (session còn mở)?
- Nếu quyết định eager cố định ở khai báo thì điều đó ảnh hưởng mọi use case ra sao?

**Lập luận:** Lazy hoạt động nhờ một object thay thế (proxy) đứng chỗ quan hệ. Proxy chỉ chạy SQL khi bạn gọi vào lần đầu, và việc chạy SQL cần một session còn mở. Nếu session đã đóng khi bạn chạm vào proxy thì không còn nơi nào chạy SQL, nên ném `LazyInitializationException`. Eager thì nạp ngay bằng JOIN hoặc SELECT thêm nên không có lỗi này, nhưng quyết định đó cố định cho mọi use case, kể cả use case không cần. Do đó nên đặt mọi quan hệ `LAZY` rồi nạp có chủ đích cho từng use case. Điểm dễ nhầm là chữa lỗi bằng `FetchType.EAGER` hoặc bật `open-in-view`, cả hai che nguyên nhân thật là ranh giới transaction và hình dạng dữ liệu. Cách đúng là service nạp đủ dữ liệu cho use case (`join fetch`, `@EntityGraph`, hoặc truy vấn DTO) trong transaction và trả DTO cho controller, để không còn gì phải nạp lười bên ngoài.

**Đáp án ngắn:** Lazy dùng proxy chỉ chạy SQL khi chạm lần đầu và cần session còn mở; đóng session rồi chạm thì ném `LazyInitializationException`. Mặc định JPA: `@ManyToOne`/`@OneToOne` eager, `@OneToMany`/`@ManyToMany` lazy. Khuyến nghị đặt `LAZY` và nạp bằng `join fetch` hoặc entity graph.

**Nhớ:** Lazy = proxy + session còn mở. Eager quyết định một lần cho mọi use case, nên đắt.

**Ví dụ:** mô phỏng proxy lazy bằng JDK proxy: `getName()` đã có sẵn từ truy vấn cha, `getTickets()` mới thật sự chạy SQL, và chỉ một lần.

```text
đọc name           -> Concert   (số SQL đã chạy: 0)
  SQL: select * from ticket where event_id=1
đọc tickets lần 1  -> [T1, T2, T3]
đọc tickets lần 2  -> [T1, T2, T3]   (số SQL đã chạy: 1)
LazyInitializationException: could not initialize proxy - no Session
```

Dòng cuối: proxy tạo ra rồi **session đóng** trước khi chạm: không còn nơi nào để chạy SQL, nên ném lỗi. Đó là nguồn gốc `LazyInitializationException` thật. _Đã chạy thử (JDK 11; mô phỏng cơ chế, không phải Hibernate)._

**Hỏi xoáy 1:** Làm sao kiểm tra một quan hệ đã được nạp chưa mà không kích hoạt nó?
- Gợi ý: gọi `.size()` trên proxy thì chuyện gì xảy ra với nó?
- **Lập luận:** chạm vào proxy chính là cách kích hoạt nạp, nên cần cách hỏi trạng thái mà không chạm vào dữ liệu.
- **Đáp:** `Hibernate.isInitialized(entity.getTickets())`, hoặc đếm số câu SQL trong log/`generate_statistics`.

**Hỏi xoáy 2:** Sửa `LazyInitializationException` bằng cách chuyển sang `EAGER` có đúng không?
- Gợi ý: eager áp cho mọi truy vấn hay chỉ chỗ đang lỗi?
- **Lập luận:** eager là quyết định cố định, nên mọi truy vấn đều kéo thêm dữ liệu kể cả khi không cần. Nguyên nhân thật là truy cập ngoài transaction.
- **Đáp:** chữa triệu chứng bằng cách trả giá vĩnh viễn. Cách đúng: nạp đủ trong service (`join fetch`/`@EntityGraph`/DTO) rồi trả DTO ra ngoài tầng transaction.

**Sai lầm hay gặp:** Để mặc định `@ManyToOne` là eager rồi nhìn thấy một truy vấn danh sách sinh ra hàng trăm truy vấn con.

## 6. Vì sao một màn hình danh sách sinh ra hàng trăm câu SQL, và xử lý thế nào? (góc nhìn chi tiết)

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Trang danh sách 100 event chạy chậm, log cho thấy 1 câu lấy danh sách rồi 100 câu lấy vé. Hiện tượng gì đang xảy ra (N+1), có những cách xử lý nào, và mỗi cách có bẫy gì?

**Gợi ý suy luận:**
- Mỗi lần chạm quan hệ lazy của một cha thì có bao nhiêu chuyến đi tới DB? Duyệt N cha thì bao nhiêu?
- Muốn giảm số chuyến, ta có thể gom lại bằng những dạng câu SQL nào (JOIN, `IN`, chỉ lấy cột cần)?
- Nếu JOIN hai collection cùng lúc thì số dòng kết quả là bao nhiêu (tích Descartes)? `LIMIT` đếm dòng hay đếm cha?

**Lập luận:** Mỗi lần chạm quan hệ lazy là một chuyến đi về DB, nên duyệt N cha là 1 + N chuyến. Mọi giải pháp đều là gom nhiều chuyến thành ít chuyến: JOIN (một chuyến), `IN (...)` theo batch, hoặc chỉ lấy đúng cột cần. Nhưng JOIN collection nhân dòng: hai collection cho tích 3 x 4 = 12 dòng. Và `LIMIT` áp lên dòng chứ không lên cha, nên phân trang trên join collection cắt sai. Vì vậy với `ToMany` cần phân trang hoặc có nhiều collection thì chọn nạp theo batch thay vì JOIN. Điểm dễ nhầm là chữa N+1 bằng `join fetch` cho mọi trường hợp: join hai collection nhân dòng (tích Descartes) và `LIMIT` cắt sai khi có join collection (Hibernate cảnh báo và phân trang trong memory). Khi review, đếm số câu SQL trong test (ví dụ bằng công cụ đếm query) và chọn cách theo hình dạng dữ liệu: một collection thì `join fetch`, nhiều collection hoặc cần phân trang thì `@BatchSize` hoặc hai truy vấn.

**Đáp án ngắn:** N+1 là 1 câu lấy cha rồi N câu lấy con. Xử lý bằng `join fetch`, `@EntityGraph`, `@BatchSize` hoặc truy vấn DTO. Cẩn thận join nhiều collection (nhân dòng) và phân trang cùng join collection.

**Nhớ:** Giải pháp N+1 là giảm số chuyến đi tới DB; JOIN collection nhân dòng và phá phân trang.

| Cách | Ví dụ | Khi nào |
|---|---|---|
| `join fetch` | `select e from Event e join fetch e.tickets where e.id = :id` | Một use case cụ thể cần cả hai |
| `@EntityGraph` | `@EntityGraph(attributePaths = "tickets")` trên repository | Tái dùng truy vấn derived của Spring Data |
| `@BatchSize` | `@BatchSize(size = 50)` trên quan hệ | Nạp lazy nhưng gom theo batch `where id in (...)` |
| Truy vấn DTO | `select new ...Summary(e.name, count(t)) ...` | Chỉ cần vài cột |

**Ví dụ chạy được (mô phỏng bằng SQLite):** 1 event có 3 vé và 4 nhà tài trợ; nạp 100 cha, kích thước lô 50.

```text
batch size=50: số câu SELECT để nạp con của 100 cha: 2        (thay vì 100)
join fetch 2 collection: 1 event, 3 ticket, 4 sponsor -> 12 dòng (3 x 4, tích Descartes)
phân trang + join collection: [(1,'T1'), (1,'T2')]  <- LIMIT 2 chỉ lấy 2 vé của 1 event
```

Hai bẫy trong cùng ví dụ: (1) `join fetch` **hai collection** cùng lúc làm số dòng thành tích 3 × 4 = 12 (đã chuẩn bị cho `MultipleBagFetchException` ở dạng `List`); (2) `LIMIT` áp lên **dòng** chứ không lên **cha**, nên phân trang trên join collection cắt sai; Hibernate phải kéo toàn bộ về rồi phân trang trong memory (cảnh báo `HHH000104`). Cách đúng: phân trang cha trước (lấy id) rồi nạp con bằng `IN`/`@BatchSize`. _Đã chạy thử (Python/sqlite) để thấy cơ chế số dòng; Hibernate sinh SQL tương đương._

**Hỏi xoáy 1:** Chọn `join fetch` hay `@BatchSize`?
- Gợi ý: JOIN với quan hệ `ToOne` thêm mấy dòng cho mỗi cha? Với `ToMany` thì sao, và nếu có phân trang?
- **Lập luận:** `ToOne` không nhân dòng nên JOIN gọn; `ToMany` nhân dòng và phá phân trang, còn `@BatchSize` nạp con theo `IN` mà không nhân dòng.
- **Đáp:** `join fetch` cho `ToOne` và use case cần nạp ngay; `@BatchSize` cho `ToMany` khi cần phân trang hoặc có nhiều collection.

**Hỏi xoáy 2:** Phát hiện N+1 thế nào trước khi lên production?
- Gợi ý: N+1 là hiện tượng về số câu lệnh, vậy ta đo đại lượng nào và chặn bằng gì?
- **Lập luận:** nếu đo được số câu SQL mỗi use case thì đặt ngưỡng và để test thất bại khi vượt.
- **Đáp:** đếm số câu SQL trong test (`hibernate.generate_statistics`, hoặc thư viện đếm câu lệnh), khẳng định "danh sách 20 phần tử dùng đúng ≤ 3 câu SQL".

**Sai lầm hay gặp:** Kiểm thử với 3 dòng dữ liệu nên N+1 vô hình; lên production với 3000 dòng mới lộ.

## 7. Xóa một vé mà cả event bị xóa theo: `cascade` và `orphanRemoval` hoạt động thế nào?

**Câu hỏi:** Một lệnh `em.remove(ticket)` lại xóa cả event cùng mọi vé còn lại. Nguyên nhân là `cascade`. Vậy `cascade` là gì, `orphanRemoval` khác `cascade = REMOVE` ở điểm nào, và khi nào dùng đúng?

**Gợi ý suy luận:**
- Mặc định JPA xem mỗi entity là độc lập hay phụ thuộc? Lưu cha có tự lưu con không?
- Con "thuộc về" cha nghĩa là gì (đơn hàng và dòng hàng)? Khi nào việc xóa lan sang là hợp lý?
- Một con bị gỡ khỏi collection của cha nhưng cha vẫn còn: nó "mồ côi", nên xóa hay giữ?

**Lập luận:** Mặc định JPA xem mỗi entity độc lập: lưu cha không lưu con. `cascade` thêm quy tắc "thao tác trên cha thì áp cho con", hợp lý khi con thuộc về cha (không có đơn thì dòng hàng vô nghĩa). `REMOVE` lan việc xóa từ cha xuống con. `orphanRemoval` mở rộng: con bị gỡ khỏi collection là mồ côi và bị xóa dù cha vẫn còn, khác `REMOVE` chỉ chạy khi cha bị xóa. Nếu đặt `cascade` ở quan hệ chia sẻ (như `@ManyToOne` về event) thì xóa một vé sẽ lan lên event rồi xuống mọi vé, nên cascade chỉ hợp với quan hệ sở hữu. Điểm dễ nhầm là đặt `CascadeType.ALL` cho mọi quan hệ cho tiện, rồi một lần `remove` lan ra ngoài ý muốn hoặc `merge` ghi đè dữ liệu của entity khác. Quy tắc: cascade chỉ đặt ở phía cha sở hữu lifecycle của con (đơn hàng với dòng hàng), không đặt ở `@ManyToOne` và không đặt `REMOVE` giữa các entity độc lập; `orphanRemoval` chỉ khi con không được chia sẻ.

**Đáp án ngắn:** `cascade` truyền `PERSIST`, `MERGE`, `REMOVE`, `REFRESH`, `DETACH` hoặc `ALL` từ cha sang con; `orphanRemoval = true` xóa con khi bị gỡ khỏi collection dù cha còn. Chỉ dùng cho quan hệ sở hữu, không đặt `ALL` mặc định.

**Nhớ:** Cascade nói "con không tồn tại ngoài cha". Với quan hệ chia sẻ, cascade biến thao tác nhỏ thành xóa dây chuyền.

**Ví dụ:** truy vết SQL (minh họa).

```java
Event e = em.find(Event.class, 1L);     // có tickets T1, T2, T3
e.getTickets().remove(0);               // gỡ T1 khỏi danh sách
// orphanRemoval=true  -> DELETE FROM ticket WHERE id = ?   (T1 bị xóa khỏi DB)
// orphanRemoval=false -> không xóa, nhưng nếu phía sở hữu event_id không đổi thì T1 vẫn còn trong DB
em.remove(e);
// cascade REMOVE -> DELETE ticket T2, T3 trước, rồi DELETE event
```

Nguy hiểm: `CascadeType.ALL` đặt trên `@ManyToOne`.

```java
@ManyToOne(cascade = CascadeType.ALL) Event event;   // trên Ticket
// cascade REMOVE sang Event -> xóa luôn sự kiện, và sự kiện (cascade tiếp) xóa mọi vé khác
em.remove(ticket);
```

Một lệnh xóa một vé dây chuyền xóa cả event và mọi vé còn lại. _Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao cascade chỉ hợp với quan hệ "sở hữu" (composition)?
- Gợi ý: với vé và event, xóa một vé có nghĩa xóa event không?
- **Lập luận:** cascade khẳng định con không tồn tại ngoài cha. Quan hệ chia sẻ không thỏa điều đó, nên xóa một phía không có nghĩa xóa phía kia.
- **Đáp:** nếu không, cascade biến thao tác nhỏ thành xóa dây chuyền.

**Hỏi xoáy 2:** Cascade của JPA khác `ON DELETE CASCADE` của DB thế nào?
- Gợi ý: ai thực hiện việc xóa con (ứng dụng hay DB), và Hibernate có biết con đã bị xóa không?
- **Lập luận:** JPA cascade chạy ở tầng ứng dụng: nạp con rồi phát lệnh xóa từng con, nên có callback và theo dõi quan hệ. `ON DELETE CASCADE` xóa trong DB một câu, Hibernate không được báo nên context có thể giữ object đã "chết".
- **Đáp:** JPA ở tầng ứng dụng, DB nhanh hơn nhưng để context lệch.

**Sai lầm hay gặp:** Đặt `CascadeType.ALL` mặc định cho mọi quan hệ.

## 8. Truy vấn nối chuỗi từ input người dùng bị lộ dữ liệu: JPQL, HQL, Criteria nên dùng thế nào?

**Câu hỏi:** Một đồng nghiệp viết `createQuery("... where name = '" + name + "'")` và test với `x' OR '1'='1` thì trả về toàn bộ dữ liệu. Vì sao, cách đúng là gì, và HQL, JPQL, Criteria API khác nhau thế nào?

**Gợi ý suy luận:**
- Khi nối chuỗi người dùng vào câu lệnh, DB nhận một chuỗi duy nhất; nó phân biệt được đâu là lệnh, đâu là dữ liệu không?
- Nếu tham số được gửi tách khỏi câu lệnh thì cấu trúc câu lệnh còn bị đổi được không?
- JPQL/HQL viết trên cái gì (entity/thuộc tính hay bảng/cột)? Khi điều kiện thay đổi theo input thì dựng truy vấn bằng cách nào ngoài nối chuỗi?

**Lập luận:** Chuỗi nối vào được DB hiểu là lệnh, nên đầu vào độc hại đổi được cấu trúc truy vấn (`OR '1'='1'` luôn đúng). Tham số có tên được gửi tách khỏi câu lệnh, nên cùng chuỗi đó chỉ là dữ liệu. JPQL/HQL truy vấn trên mô hình object (entity, thuộc tính) và Hibernate dịch sang SQL cho dialect cụ thể, nên không cần biết tên bảng/cột. Khi điều kiện tùy chọn thì dựng truy vấn bằng object (Criteria) thay vì nối chuỗi, tránh cả lỗi cú pháp lẫn injection. Điểm dễ nhầm là nghĩ ORM tự chống injection: chỉ khi dùng tham số có tên (hoặc Criteria, Spring Data derived query) thì mới an toàn; nối chuỗi vào JPQL, HQL hay `@Query` native vẫn bị tấn công. Khi review, tìm mọi chỗ cộng chuỗi vào câu truy vấn, và với `ORDER BY` động (không tham số hóa được) thì kiểm tra tên cột bằng allow-list.

**Đáp án ngắn:** HQL là ngôn ngữ của Hibernate, JPQL là tập con chuẩn của JPA, cả hai truy vấn trên entity. Criteria API dựng truy vấn bằng code, hợp truy vấn động; native SQL khi cần tính năng riêng của DB. Luôn dùng tham số có tên, không nối chuỗi.

**Nhớ:** Tham số tách khỏi câu lệnh thì dữ liệu không thành lệnh. JPQL/HQL làm việc trên entity, không phải bảng.

**Ví dụ:** JPQL và SQL tương ứng (minh họa).

```java
em.createQuery("""
    select e.name from Person p join p.tickets t join t.event e where p.name = :name
    """, String.class).setParameter("name", "Eric").getResultList();
```

```sql
select e1_0.name from people p1_0
  join person_ticket pt on pt.person_id = p1_0.id
  join ticket t1_0 on t1_0.id = pt.ticket_id
  join event e1_0 on e1_0.id = t1_0.event_id
where p1_0.full_name = ?
```

Vì sao **bắt buộc dùng tham số có tên**: dữ liệu người dùng nối vào chuỗi được hiểu là **lệnh**. Chạy thật với SQLite:

```text
nối chuỗi : [('Eric','s1'), ('Ann','s2')]     với name = "x' OR '1'='1"  -> lộ hết dữ liệu
tham số   : []                                  cùng chuỗi nhưng được coi là DỮ LIỆU
```

Tham số được gửi **tách khỏi** câu lệnh nên không thể thay đổi cấu trúc. _Đã chạy thử (Python/sqlite) cho phần injection; câu SQL sinh ra từ JPQL là minh họa._

**Hỏi xoáy 1:** Truy vấn có nhiều điều kiện tùy chọn thì viết thế nào?
- Gợi ý: nếu không nối chuỗi thì còn cách nào thêm điều kiện khi có giá trị?
- **Lập luận:** dựng truy vấn bằng object cho phép thêm điều kiện theo từng giá trị mà vẫn dùng tham số.
- **Đáp:** `Specification`/Criteria hoặc Querydsl; tránh nối chuỗi JPQL (dễ sai và dễ injection). Hoặc `(:p is null or e.x = :p)` nhưng plan có hạn chế.

**Hỏi xoáy 2:** Trả về entity hay DTO?
- Gợi ý: entity vào persistence context có snapshot và theo dõi thay đổi; bạn cần điều đó khi nào?
- **Lập luận:** chỉ khi sửa mới cần theo dõi; còn chỉ đọc thì phần đó là chi phí thừa, và DTO lấy ít cột, không có quan hệ lazy nên không N+1.
- **Đáp:** entity khi cần sửa, DTO (projection) khi chỉ đọc.

**Sai lầm hay gặp:** Ghép `"... where name = '" + name + "'"` vào `createQuery`.

## 9. Gọi `setName()` mà DB vẫn chưa đổi: khi nào SQL thật sự được gửi?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Trong một transaction bạn gọi `person.setName("Binh")` rồi truy vấn theo tên "Binh" và vẫn tìm thấy, dù lúc đó DB còn tên cũ. Khi nào Hibernate gửi SQL, và flush khác commit thế nào?

**Gợi ý suy luận:**
- Nếu gửi SQL ngay khi gọi `setName()`, chi phí là gì (số chuyến đi về)? Vậy nên gom thay đổi ở đâu (persistence context)?
- Để biết phải ghi gì khi gom, Hibernate so sánh trạng thái hiện tại với cái gì (snapshot)?
- Nếu truy vấn chạy trước khi thay đổi được ghi, kết quả có khớp với object trong memory không?

**Lập luận:** Gửi SQL cho từng lần `setName` thì tốn nhiều chuyến đi về, nên Hibernate gom các thay đổi trong persistence context (kèm snapshot lúc nạp) và chỉ ghi ra DB ở điểm đồng bộ gọi là flush, khi đó nó so trạng thái hiện tại với snapshot để biết phải sinh `UPDATE` nào. Nhưng gom lại có hệ quả: nếu một truy vấn chạy ngay sau `setName` trong khi DB còn tên cũ, nó sẽ không thấy thay đổi đang chờ và trả kết quả sai. Vì vậy ở chế độ `AUTO`, Hibernate flush trước khi chạy truy vấn có thể bị ảnh hưởng bởi các thay đổi chờ ghi (nên truy vấn theo "Binh" vẫn tìm thấy), và flush lần nữa khi commit. Flush chỉ đẩy câu lệnh vào transaction của DB chứ chưa commit: rollback vẫn hủy mọi thứ đã flush. Điểm dễ nhầm là tưởng thấy SQL trong log nghĩa là dữ liệu đã được lưu vĩnh viễn, hoặc nghĩ `save()` ghi ngay. Hệ quả khi debug: lỗi ràng buộc thường nổ ở lúc flush hoặc commit, xa dòng code gây ra nó, nên cần biết điểm flush để tìm đúng nguyên nhân.

**Đáp án ngắn:** Với `FlushModeType.AUTO`, SQL được gửi khi flush: trước truy vấn có thể bị ảnh hưởng và khi commit, hoặc khi gọi `em.flush()`. Flush chưa phải commit, rollback vẫn hủy hết.

**Nhớ:** Persistence context gom thay đổi, flush so với snapshot rồi ghi. Flush không bằng commit.

**Ví dụ:** mô phỏng persistence context với flush trước truy vấn.

```text
-- session 1 đọc hai lần id=1: chỉ 1 SQL (cache cấp 1)
  SQL: select name from person where id=1
-- đổi tên trong session 1 rồi truy vấn theo tên mới
DB còn là: An
  (auto flush trước truy vấn)
  SQL: update person set name='Binh' where id=1
  SQL: select id from person where name='Binh'
kết quả truy vấn: [1]
```

Sau `set`, DB **vẫn còn "An"**; chỉ khi truy vấn theo tên chạy thì `UPDATE` mới được gửi **trước** (auto flush), nên truy vấn tìm ra id 1. Nếu không flush trước, truy vấn sẽ trả rỗng dù object trong memory đã tên "Binh". _Đã chạy thử (JDK 11; mô phỏng cơ chế)._

Trong Spring:

```java
@Transactional
public void buyTicket(long personId, long ticketId) {
    Person p = em.find(Person.class, personId);
    p.getTickets().add(em.find(Ticket.class, ticketId));     // chưa có SQL ghi nào
// commit -> flush -> INSERT vào bảng nối
}
```

_Minh họa, chưa chạy thử trong môi trường này._

**Hỏi xoáy 1:** Vì sao `persist` với `IDENTITY` lại `INSERT` ngay?
- Gợi ý: Hibernate cần gì để đặt entity vào identity map, và ai cấp giá trị đó với `IDENTITY`?
- **Lập luận:** nó cần id; `IDENTITY` thì id chỉ có sau khi DB chạy `INSERT`, nên phải insert ngay và mất khả năng gom batch (xem câu 3).
- **Đáp:** vì id do DB cấp lúc `INSERT`.

**Hỏi xoáy 2:** `@Transactional(readOnly = true)` làm gì ở tầng Hibernate?
- Gợi ý: nếu biết transaction không ghi thì cần dirty checking và flush không?
- **Lập luận:** không ghi thì bỏ được cả hai, nên nhanh hơn và tránh ghi nhầm.
- **Đáp:** Spring đặt flush mode MANUAL cho session: không tự flush, bỏ qua dirty checking. Không phải cấm ghi ở tầng DB trừ khi driver/DB hỗ trợ.

**Sai lầm hay gặp:** Bắt exception ràng buộc quanh `save()` trong khi lỗi chỉ xuất hiện ở lúc flush/commit, lệch khỏi dòng bạn mong đợi.

## 10. Cùng một id đọc hai lần chỉ chạy một SQL, nhưng session khác lại chạy lại: cache cấp 1 và cấp 2?

**Câu hỏi:** Trong một session, đọc `id=1` hai lần chỉ sinh một câu SQL; mở session thứ hai đọc lại thì lại có SQL. Hiện tượng này do cache cấp 1 hay cấp 2, hai loại khác nhau thế nào, và cache cấp 2 có rủi ro gì với nhiều instance ứng dụng?

**Gợi ý suy luận:**
- Nếu trong một session hai lần `find(1)` trả về hai object khác nhau rồi bạn sửa cả hai, chuyện gì xảy ra khi ghi (ghi đè nhau)? Vậy cần đảm bảo gì về cùng id (identity map)?
- Cache muốn dùng chung giữa nhiều session thì phải nằm ở đâu (cấp `SessionFactory`)?
- Khi dữ liệu đổi ở một instance, cache cục bộ của instance khác có biết không?

**Lập luận:** Để tránh hai bản sao của cùng một dòng bị sửa rồi ghi đè nhau, trong một session cùng id phải cho cùng một object (identity map). Đó là cache cấp 1: điều kiện đúng đắn, luôn bật, phạm vi một session, nên đọc lần hai không cần SQL; session khác có context riêng nên lại SQL. Muốn tăng hiệu năng giữa các session thì cần cache chia sẻ ở `SessionFactory`: cache cấp 2, tùy chọn. Vì chia sẻ nên có rủi ro dữ liệu cũ: nếu cache cục bộ và instance A sửa dữ liệu thì cache của B vẫn giữ giá trị cũ, nên chỉ đáng dùng với dữ liệu đọc nhiều, ít đổi. Điểm dễ nhầm là nghĩ cache cấp 2 là "miễn phí hiệu năng": nó thêm bài toán invalidation, và với nhiều instance cần cache phân tán hoặc cơ chế đồng bộ, nếu không mỗi instance giữ một bản cũ khác nhau. Khi dùng, chỉ bật cho entity đọc nhiều ít đổi, đặt TTL hợp lý, và đo hit ratio trước khi quyết định giữ; còn cache cấp 1 thì lo ngược lại: giữ transaction ngắn để context không phình.

**Đáp án ngắn:** Cấp 1 nằm trong persistence context, luôn bật, một session. Cấp 2 nằm trong `SessionFactory`, tùy chọn (Ehcache, Infinispan, Caffeine qua JCache, bật bằng `@Cacheable` hoặc `@Cache`), chia sẻ giữa session, hợp dữ liệu đọc nhiều ít đổi. Query cache kém hiệu quả nếu bảng bị ghi liên tục.

**Nhớ:** Cấp 1 là điều kiện đúng đắn (identity map), cấp 2 là cache hiệu năng kèm rủi ro dữ liệu cũ.

**Ví dụ:** mô phỏng hai session.

```text
session 1 đọc hai lần id=1 -> chỉ 1 SQL (cache cấp 1)
session 2 đọc id=1         -> SQL lại (cache cấp 1 không dùng chung giữa session)
```

Cache cấp 2 (nếu bật) chen vào giữa: session 2 lấy từ cache cấp 2 thay vì DB. Với cache cấp 2 cục bộ và 3 instance ứng dụng, instance A sửa dữ liệu thì cache instance B **vẫn giữ giá trị cũ** đến khi hết hạn hoặc được vô hiệu hóa (cần cache phân tán hoặc TTL ngắn). _Đã chạy thử (JDK 11; mô phỏng) cho phần cấp 1; ví dụ nhiều instance là phân tích, chưa chạy._

**Hỏi xoáy 1:** Cache cấp 2 của Hibernate khác `@Cacheable` của Spring Cache thế nào?
- Gợi ý: cái được lưu là gì (entity theo id hay kết quả method), và ai lo việc vô hiệu hóa?
- **Lập luận:** cấp 2 cache theo entity và Hibernate biết khi nào mình sửa nên tự vô hiệu; Spring Cache cache kết quả method theo key bạn chọn nên bạn tự vô hiệu.
- **Đáp:** hai tầng khác nhau, có thể dùng cùng nhau.

**Hỏi xoáy 2:** Cache cấp 2 có thay được tối ưu truy vấn và index không?
- Gợi ý: cache theo id giúp được truy vấn theo điều kiện không?
- **Lập luận:** nó chỉ cứu việc đọc đúng cùng id nhiều lần; truy vấn theo điều kiện vẫn đi vào DB.
- **Đáp:** không. Truy vấn chậm nên sửa bằng index và truy vấn đúng trước.

**Sai lầm hay gặp:** Bật cache cấp 2 cho bảng được ghi liên tục, nhận lại dữ liệu cũ và chi phí đồng bộ.

## 11. Hai người cùng sửa một bản ghi, người lưu sau không được đè mất người trước: `@Version` làm sao?

**Phải thuộc:** Câu này là câu cốt lõi, gặp rất thường xuyên.

**Câu hỏi:** Hai người cùng mở form sửa vé, đều đọc `version = 3`, người 1 lưu xong rồi người 2 mới lưu. Làm sao hệ thống không để người 2 âm thầm đè mất thay đổi của người 1, mà không giữ lock DB trong lúc người dùng suy nghĩ?

**Gợi ý suy luận:**
- Nếu mỗi `UPDATE` kèm điều kiện "chỉ ghi nếu phiên bản vẫn như lúc tôi đọc", thì khi ai đó đã sửa trước, điều kiện đó đúng hay sai?
- Điều kiện sai thì `UPDATE` ảnh hưởng bao nhiêu dòng, và ứng dụng suy ra điều gì từ con số đó?
- Cơ chế này giữ lock DB suốt lúc người dùng nghĩ không? Điều đó hợp với thread nào?

**Lập luận:** Mỗi lần ghi, Hibernate chạy `update ... set version = version mới where id = ? and version = phiên bản đã đọc`. Người 1 ghi với điều kiện `version = 3` đúng, nên 1 dòng đổi và version thành 4. Người 2 cũng kèm `version = 3` nhưng DB lúc này là 4, nên điều kiện sai, 0 dòng bị ảnh hưởng. Hibernate thấy 0 dòng thì hiểu có người sửa trước và ném `OptimisticLockException`. Đây là phát hiện lost update chứ không ngăn nó, và vì không giữ lock nên hợp flow mở form, sửa, lưu kéo dài. Điểm dễ nhầm là nghĩ `@Version` ngăn lost update: nó chỉ phát hiện và báo lỗi, việc xử lý (đọc lại, hợp nhất hoặc báo người dùng) vẫn là của ứng dụng. Khi dùng, luôn bắt `OptimisticLockException` ở tầng thích hợp và đặt chính sách retry hoặc thông báo; còn tranh chấp rất cao và không chịu được retry thì cân nhắc pessimistic lock hoặc cập nhật nguyên tử bằng câu `UPDATE`.

**Đáp án ngắn:** Thêm cột `@Version`; mỗi lần ghi kèm điều kiện phiên bản và tăng nó. 0 dòng bị ảnh hưởng thì ném `OptimisticLockException` (Spring bọc thành `ObjectOptimisticLockingFailureException`); ứng dụng đọc lại và retry hoặc báo người dùng.

**Nhớ:** Optimistic lock phát hiện xung đột lúc ghi, không lock lúc đọc; số dòng bị ảnh hưởng bằng 0 là tín hiệu.

**Ví dụ chạy được:** hai người cùng đọc `version = 3`.

```java
@Entity class Ticket { @Id @GeneratedValue Long id; @Version Long version; String holder; }
// SQL Hibernate sinh ra (tham số): update ticket set holder=?, version=? where id=? and version=?
//   với giá trị thật: version mới = 4, điều kiện version = 3
```

```text
người 1 lưu (đã đọc version 3): 1 dòng -> thành công, version thành 4
người 2 lưu (cũng đã đọc version 3): 0 dòng -> OptimisticLockException
[(1, 'Binh', 4)]
```

Người 1 thắng; người 2 thấy số dòng bằng 0 và phải đọc lại bản mới (`version = 4`) trước khi sửa tiếp, thay vì âm thầm đè mất thay đổi của người 1. _Đã chạy thử (Python/sqlite) với đúng câu SQL kiểm tra phiên bản; việc Hibernate ném `OptimisticLockException` là hành vi theo đặc tả._

**Hỏi xoáy 1:** Khi nào chọn lạc quan, khi nào bi quan (`PESSIMISTIC_WRITE`, `select ... for update`)?
- Gợi ý: xung đột hiếm hay thường xuyên thì làm đi làm lại tốn hơn, và lock giữ lâu có chấp nhận được không?
- **Lập luận:** lạc quan không lock nên hợp transaction dài và xung đột hiếm; nếu xung đột thường xuyên thì retry liên tục lãng phí, còn lock trong việc sửa ngắn thì rẻ.
- **Đáp:** lạc quan khi xung đột hiếm và transaction dài/qua nhiều request; bi quan khi xung đột thường xuyên và việc sửa ngắn (như trừ tồn kho khi bán hàng nóng).

**Hỏi xoáy 2:** `@Version` có bảo vệ khi sửa bằng `UPDATE` JPQL hàng loạt không?
- Gợi ý: câu cập nhật hàng loạt có đi qua persistence context và snapshot không?
- **Lập luận:** không đi qua, nên Hibernate không tự thêm điều kiện và tăng version.
- **Đáp:** không, trừ khi bạn tự thêm `set version = version + 1`. Phải nhớ khi kết hợp cả hai kiểu ghi.

**Sai lầm hay gặp:** Bắt `OptimisticLockException` rồi chỉ log, nên thay đổi của người dùng biến mất mà không ai biết.

## 12. Entity nằm trong `HashSet` rồi `contains` trả `false` sau khi lưu: viết `equals` và `hashCode` thế nào?

**Câu hỏi:** Bạn thêm một entity mới (chưa có `id`) vào `HashSet`, sau đó lưu để `id` được sinh, rồi `set.contains(entity)` trả `false` dù object vẫn ở đó. Vì sao, và nên viết `equals`/`hashCode` cho entity ra sao?

**Gợi ý suy luận:**
- `HashSet` đặt object vào ô theo `hashCode` tại thời điểm nào, và tra cứu dùng `hashCode` tại thời điểm nào?
- Nếu `hashCode` tính từ `id`, mà `id` sinh sau khi lưu thì `hashCode` có đổi không?
- Collection lazy hoặc quan hệ hai chiều đưa vào `equals`/`hashCode`/`toString` thì gây gì?

**Lập luận:** `HashSet` đặt object vào ô theo `hashCode` lúc thêm. Nếu `hashCode` phụ thuộc `id` mà `id` chỉ có sau khi lưu, thì lúc thêm `hashCode` tính từ `null`, lúc tra cứu tính từ `42`: hai giá trị khác nhau nên tìm sai ô và `contains` trả `false`. Object vẫn nằm trong tập nhưng như biến mất, kéo theo thêm trùng và xóa không được ở `@ManyToMany` dùng `Set`. Vì vậy `hashCode` phải ổn định suốt lifecycle: dùng business key bất biến, hoặc hằng số khi không có. Và không đưa collection lazy vào vì sẽ kích hoạt nạp hoặc đệ quy vô hạn. Điểm dễ nhầm là dùng `id` sinh tự động trong `equals`/`hashCode` vì "dễ", hoặc dùng mọi trường (kể cả quan hệ lazy) khiến mỗi lần gọi kích hoạt truy vấn. Cách ổn định là business key bất biến, hoặc `equals` so id khi đã có kèm `hashCode` hằng số, và khi dùng Set cho quan hệ nhiều-nhiều thì kiểm tra thêm, xóa bằng test vì lỗi này chỉ hiện ở hành vi chứ không có lỗi biên dịch.

**Đáp án ngắn:** Dùng business key bất biến (mã vé, email, ISBN). Nếu không có, `equals` so sánh id chỉ khi id khác `null`, còn `hashCode` trả hằng số (ví dụ `getClass().hashCode()`). Không đưa collection lazy vào `equals`/`hashCode`/`toString`.

**Nhớ:** `hashCode` phải không đổi suốt thời gian object ở trong tập băm; id sinh sau khi lưu thì không đủ ổn định.

**Ví dụ chạy được:** `hashCode` theo `id` so với theo mã nghiệp vụ.

```java
Set<BadTicket> bad = new HashSet<>(); BadTicket t = new BadTicket("T-1"); bad.add(t);
t.id = 42L;                                 // "lưu vào DB": id được sinh
bad.contains(t);                            // false
```

Output thật:

```text
hashCode theo id  -> contains sau khi có id? false
hashCode theo mã nghiệp vụ -> contains? true
```

Object vẫn nằm trong tập nhưng `contains` trả `false`: nó nằm ở ô tính theo `hashCode` cũ (`id = null`), còn lần tra cứu dùng `hashCode` mới (`id = 42`). Hậu quả với `@ManyToMany` dùng `Set`: phần tử "biến mất", thêm trùng, xóa không được. _Đã chạy thử (JDK 11)._

**Hỏi xoáy 1:** Vì sao `getClass()` trong `equals` có thể sai với entity?
- Gợi ý: nếu Hibernate trả về proxy thì class thật của object là gì so với class entity?
- **Lập luận:** proxy là subclass sinh động nên `a.getClass() != b.getClass()` dù cùng bản ghi.
- **Đáp:** dùng `Hibernate.getClass(obj)` hoặc `instanceof` có chủ đích.

**Hỏi xoáy 2:** Vì sao Lombok `@Data` trên entity là nguồn lỗi?
- Gợi ý: `@Data` sinh `equals`/`hashCode`/`toString` dựa trên những field nào? Có gồm quan hệ lazy và hai chiều không?
- **Lập luận:** gồm mọi field, nên chạm quan hệ lazy gây truy vấn bất ngờ, hai chiều gây đệ quy vô hạn (`event.toString` gọi `ticket.toString` gọi `event.toString`...), và `hashCode` đổi khi field đổi.
- **Đáp:** vì nó sinh trên mọi field kể cả quan hệ.

**Sai lầm hay gặp:** Sinh `equals`/`hashCode` bằng IDE trên mọi field của entity.

## 13. Lỗi trong ứng dụng Spring Boot nằm ở Boot, ở Spring hay ở Hibernate? Hai cách dùng khác nhau ra sao?

**Câu hỏi:** Dùng Hibernate/JPA trong Spring Boot khác gì dùng Hibernate thuần? Khi `repo.save()` bỗng sinh thêm một câu `select` thừa, hoặc khi `ddl-auto=update` chạy ở production, bạn xác định nguyên nhân ở đâu?

**Gợi ý suy luận:**
- Spring Boot thay Hibernate hay lo phần hạ tầng quanh nó (tạo factory, mở/đóng session theo transaction, sinh repository)?
- `save()` phải quyết định `persist` hay `merge`: dựa vào dấu hiệu nào để biết entity "mới"? Nếu không biết thì phải làm gì (hỏi DB)?
- `ddl-auto=update` có xóa hay đổi kiểu cột không, có lịch sử để quay lui không?

**Lập luận:** Spring Boot không thay Hibernate mà lo hạ tầng quanh nó: tạo `EntityManagerFactory` từ cấu hình, quản lý transaction qua proxy, sinh repository. Biết ranh giới đó thì định vị lỗi: cấu hình ở Boot, transaction ở Spring, SQL ở Hibernate. Với `save()`, Spring Data xem entity là mới khi id (hoặc `@Version`) là `null` và gọi `persist`; nếu id tự gán, nó không biết nên gọi `merge`, và `merge` phải `SELECT` trước để biết insert hay update. Còn `ddl-auto=update` chỉ thêm, không xóa/đổi kiểu, không có lịch sử, nên không phù hợp production. Điểm dễ nhầm là sửa `ddl-auto` hoặc thêm annotation cho tới khi chạy được mà không biết lỗi thuộc tầng nào. Cách định vị: bật log SQL và transaction (`logging.level.org.hibernate.SQL`, `org.springframework.transaction`), xem câu lệnh thực sự gửi, rồi đối chiếu với tầng nghi ngờ. Ở production luôn dùng công cụ migration (Flyway hoặc Liquibase) để schema có lịch sử và quay lui được.

**Đáp án ngắn:** Boot tự tạo `EntityManagerFactory`, `@Transactional` quản lý session, `JpaRepository` thay DAO. Với id gán thủ công, `save()` đi qua `merge` kèm `select` thừa; tránh bằng `@Version` hoặc `Persistable.isNew()`. Production dùng `ddl-auto=validate` cùng Flyway/Liquibase.

**Nhớ:** Boot lo hạ tầng quanh Hibernate; `save()` chọn persist/merge theo `isNew`.

| Hibernate thuần | Spring Boot + Spring Data JPA |
|---|---|
| Tự dựng `SessionFactory` từ `hibernate.cfg.xml` | Starter tạo sẵn từ `application.yml` (`spring.datasource.*`, `spring.jpa.*`) |
| Tự mở/đóng session và `beginTransaction/commit` | `@Transactional` quản lý thay bạn (qua proxy) |
| Viết DAO với `session.createQuery` | Interface `JpaRepository`, truy vấn suy ra từ tên method, `@Query` |
| Tự bật `show_sql` | `spring.jpa.show-sql=true` hoặc log `org.hibernate.SQL` |

Cấu hình hay dùng: `spring.jpa.hibernate.ddl-auto`, `spring.jpa.open-in-view=false`, `hibernate.jdbc.batch_size`.

**Ví dụ:** `save()` của Spring Data gọi `persist` hay `merge`? (minh họa)

```java
// entity có id sinh tự động
repo.save(new Ticket());           // id null  -> isNew=true  -> persist -> INSERT
// entity id gán thủ công, không có @Version
repo.save(new Coupon("SALE10"));   // id khác null -> isNew=false -> merge
// log: select ... from coupon where code=?   (merge phải SELECT trước để biết insert hay update)
//      insert into coupon ...
```

Câu `select` thừa này là hệ quả của `merge`: Spring Data xem entity "mới" khi id là `null` (hoặc `@Version` là `null`); với id tự gán thì không biết, phải hỏi DB. Cách tránh: `@Version` hoặc implement `Persistable<ID>` trả `isNew()` đúng. _Minh họa theo cơ chế của `SimpleJpaRepository`, chưa chạy thử trong môi trường này._

`ddl-auto`:

```yaml
# production: chỉ kiểm tra khớp; dùng Flyway/Liquibase để đổi schema
spring.jpa.hibernate.ddl-auto: validate
```

**Hỏi xoáy 1:** Vì sao `ddl-auto=update` nguy hiểm ở production?
- Gợi ý: nó làm được những loại thay đổi nào, có để lại lịch sử không, và nhiều instance khởi động cùng lúc thì sao?
- **Lập luận:** nó chỉ thêm (cột, bảng), không xóa/đổi kiểu; không lịch sử nên không quay lui; có thể chạy `ALTER` lock bảng lớn lúc khởi động mà không ai duyệt; mỗi instance cùng cố đổi schema.
- **Đáp:** dùng migration có phiên bản (Flyway/Liquibase).

**Hỏi xoáy 2:** Khi nào bỏ qua Hibernate và dùng JDBC/jOOQ?
- Gợi ý: nhớ lại ORM yếu ở loại bài toán nào (tập hợp, tính năng riêng DB).
- **Lập luận:** các bài toán đó cần kiểm soát từng câu SQL, nên đi thẳng SQL hợp hơn; phần CRUD vẫn tiện với JPA nên có thể trộn.
- **Đáp:** báo cáo phức tạp, cập nhật hàng loạt, tính năng riêng DB (window function, upsert). Trộn: JPA cho ghi/CRUD, `JdbcTemplate`/jOOQ cho đọc phức tạp.

**Sai lầm hay gặp:** Để `ddl-auto=update` từ môi trường dev sang production vì "chạy được".

## 14. Tăng giá 10% cho 1000 sản phẩm mất 1001 câu SQL: khi nào KHÔNG nên dùng ORM?

**Câu hỏi:** Code nạp từng `Product`, gọi `setPrice` rồi để Hibernate lưu thì sinh 1001 câu SQL, còn một câu `UPDATE` làm được cùng việc. Khi nào nên (hoặc không nên) dùng ORM, và cập nhật hàng loạt thì làm thế nào cho đúng?

**Gợi ý suy luận:**
- ORM tối ưu cho thao tác trên từng object hay trên tập hợp? DB thì sao?
- Nạp 1 triệu object kèm snapshot vào persistence context tốn gì?
- Câu `UPDATE` trực tiếp có đi qua persistence context và `@Version` không? Hệ quả với object đang nằm trong context?

**Lập luận:** ORM tối ưu cho việc làm việc với từng object; DB tối ưu cho tập hợp, cập nhật mọi dòng thỏa điều kiện trong một câu. Khi bài toán thuộc loại tập hợp, đi qua object là đi vòng: 1 `select` cộng 1000 `update`, và kéo 1000 object cùng snapshot vào memory (một triệu dòng sẽ tràn nếu không `flush()` + `clear()` theo batch). Một câu `UPDATE` trực tiếp làm đúng việc trong một chuyến, nhưng bỏ qua persistence context và `@Version`, nên object đang trong context trở nên cũ và phải `em.clear()`. Điểm dễ nhầm là coi ORM là lựa chọn một mất một còn: trong cùng ứng dụng, dùng JPA cho CRUD và quy tắc nghiệp vụ theo từng object, còn báo cáo, nhập liệu hàng loạt và truy vấn tổng hợp dùng `JdbcTemplate`, native query hoặc jOOQ. Khi cập nhật hàng loạt bằng câu `UPDATE` trực tiếp, nhớ `flush` trước, `clear` sau, và tự cập nhật `version` nếu có, vì persistence context không biết gì về thay đổi đó.

**Đáp án ngắn:** Không nên (hoặc không chỉ) dùng ORM cho báo cáo thống kê phức tạp, cập nhật/nhập hàng loạt, truy vấn dùng tính năng riêng của DB, hoặc khi cần kiểm soát từng câu SQL; khi đó dùng `JdbcTemplate`, native query hoặc jOOQ.

**Nhớ:** ORM cho thao tác từng object, SQL cho thao tác tập hợp. Cập nhật trực tiếp thì nhớ `em.clear()` và tự chăm sóc phiên bản.

**Ví dụ chạy được:** tăng giá 10% cho 1000 sản phẩm.

```text
nạp từng dòng và sửa : 1001 câu SQL (1 select + 1000 update)     <- kiểu "nạp entity rồi setPrice"
một câu UPDATE        : 1 câu SQL                                 <- update price set v = v * 1.1
```

Kiểu entity còn kéo 1000 object (kèm snapshot) vào persistence context; với 1 triệu dòng sẽ out of memory nếu không `flush()` + `clear()` theo batch. Câu `UPDATE` trực tiếp (JPQL `update Product p set p.price = p.price * 1.1` hoặc SQL thuần) làm đúng việc trong một chuyến đi, nhưng **bỏ qua** persistence context và `@Version`, nên phải `em.clear()` sau đó và tự chăm sóc phiên bản. _Đã chạy thử (Python/sqlite) cho phần đếm câu lệnh._

**Hỏi xoáy 1:** Nếu vẫn muốn dùng JPA cho insert hàng loạt thì làm sao?
- Gợi ý: những thứ nào làm mất khả năng gom batch (kiểu sinh id), và làm gì để persistence context không phình ra?
- **Lập luận:** `IDENTITY` phải insert ngay nên không gom được, đổi sang `SEQUENCE`; gom theo `hibernate.jdbc.batch_size`; `flush()` rồi `clear()` mỗi batch để context không phình; driver MySQL cần `rewriteBatchedStatements`.
- **Đáp:** cấu hình đủ các điểm trên; nếu vẫn chậm, dùng JDBC batch hoặc công cụ nạp của DB.

**Hỏi xoáy 2:** Nên chọn JPA hay MyBatis/jOOQ cho hệ thống mới?
- Gợi ý: phần lớn công việc là CRUD trên mô hình nghiệp vụ hay là truy vấn phức tạp?
- **Lập luận:** CRUD và mô hình giàu nghiệp vụ hợp ORM; truy vấn phức tạp là lõi thì SQL minh bạch hợp hơn. Hai bên không loại trừ nhau.
- **Đáp:** tùy đội ngũ và bài toán; có thể kết hợp.

**Sai lầm hay gặp:** Dùng một công cụ cho mọi thứ, thay vì chọn theo từng loại truy cập (ghi theo object và đọc theo tập hợp).

Nguồn: Java Programming Interviews Exposed (Markham), Chương 17; ví dụ và phân tích do soạn bổ sung.

