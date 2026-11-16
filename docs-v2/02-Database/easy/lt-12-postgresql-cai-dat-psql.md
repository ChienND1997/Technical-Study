# PostgreSQL từ con số 0: cài đặt và dùng psql

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở, là lựa chọn mặc định của rất nhiều hệ thống backend hiện nay. Bài này đưa bạn từ máy trống đến lúc có một database chạy được, tự gõ lệnh vào `psql`, tạo bảng đầu tiên, thêm và đọc dữ liệu, rồi cho ứng dụng Java kết nối vào. Nền tảng của bài là PostgreSQL 18 (phát hành 25/9/2025).

**Cốt lõi:** PostgreSQL là một server chạy nền lo hộ phần khó của việc lưu dữ liệu: nhiều người ghi cùng lúc, không hỏng khi mất điện, tìm nhanh. Mọi thứ còn lại, từ psql đến ứng dụng Java, chỉ là client kết nối vào server đó.

- Vì mỗi kết nối được một backend process riêng nên số kết nối đồng thời có giới hạn, và ứng dụng dùng connection pool.
- Vì commit chỉ chờ WAL được ghi xuống đĩa nên datafile có thể ghi sau, và dữ liệu đã commit vẫn an toàn khi sập máy.
- Vì một kết nối chỉ làm việc với một database nên muốn gom bảng theo module thì dùng schema.

```mermaid
flowchart LR
    A["Client"] --> B["Backend process"]
    B --> C["WAL ghi trước"]
    C --> D["Commit trả về"]
    D --> E["Datafile ghi sau"]
```

Mô hình tư duy: sơ đồ cho thấy commit đi đến WAL trước còn datafile được cập nhật sau, đó là lý do vừa nhanh vừa bền.

**Tóm tắt:**

- PostgreSQL là server chạy nền: ứng dụng và công cụ (psql, DBeaver) là client kết nối tới qua TCP, cổng mặc định 5432.
- Một server (cluster) chứa nhiều database; mỗi database chứa nhiều schema; mỗi schema chứa bảng, view, index; schema mặc định tên là `public`.
- Kiến trúc đơn giản: process cha `postmaster` lắng nghe, mỗi kết nối được một backend process phục vụ; dữ liệu đi qua `shared buffers` (bộ nhớ), ghi `WAL` trước, rồi mới ra datafile trên đĩa.
- Cách nhanh nhất để thử là Docker: `docker run postgres:18` với biến `POSTGRES_PASSWORD`; từ image 18 trở đi nên gắn volume vào `/var/lib/postgresql`.
- `psql` có hai loại lệnh: SQL (kết thúc bằng dấu chấm phẩy) và lệnh meta bắt đầu bằng dấu gạch chéo ngược như `\l`, `\c`, `\dt`, `\d`, `\x`, `\timing`, `\copy`, `\q`.
- Bảng đầu tiên cần primary key; dùng `identity` để tự sinh id, `text` cho chuỗi, `timestamptz` cho thời gian.
- Ứng dụng Java kết nối bằng JDBC URL `jdbc:postgresql://host:5432/tên_database`, thường qua connection pool.
- Công cụ GUI như DBeaver và pgAdmin giúp xem dữ liệu, nhưng hiểu `psql` vẫn cần thiết vì nó có sẵn ở mọi server.

## Vấn đề nó giải quyết

Một ứng dụng thật cần chỗ lưu dữ liệu mà không mất khi tắt máy, cho nhiều người dùng đọc ghi cùng lúc mà không hỏng, và truy vấn được nhanh khi dữ liệu lớn. Ghi ra file thì không giải quyết được ba điều này: hai tiến trình ghi cùng file dễ ghi đè nhau, mất điện giữa chừng làm file hỏng, và muốn tìm một bản ghi phải đọc cả file. PostgreSQL lo toàn bộ phần đó: giao dịch (transaction), khóa, ghi nhật ký để phục hồi sau sự cố, index để tìm nhanh. Bạn chỉ cần mô tả dữ liệu bằng bảng và hỏi bằng SQL.

## Khi nào dùng, khi nào không

PostgreSQL phù hợp với dữ liệu có cấu trúc và quan hệ (người dùng, đơn hàng, thanh toán), cần tính đúng đắn (transaction, constraint), và cũng xử lý tốt `jsonb`, tìm kiếm văn bản, dữ liệu địa lý qua extension. Nó không phải lựa chọn tối ưu khi bạn chỉ cần cache key-value với độ trễ dưới mili giây (dùng Redis), hoặc lưu hàng chục terabyte log chỉ-thêm cần phân tích cột (dùng kho dữ liệu chuyên dụng). Với ứng dụng nhúng một người dùng, một file như SQLite đơn giản hơn nhiều.

## Các khái niệm cần biết

- **Server, cluster, database**: một lần chạy PostgreSQL là một server quản lý một cluster (một thư mục dữ liệu); trong đó có nhiều database tách biệt. Kết nối luôn gắn với đúng một database.
- **Schema**: không gian tên trong một database, như thư mục chứa bảng. Mặc định là `public`; tên đầy đủ của bảng là `schema.bảng`.
- **Role**: tài khoản (người dùng hoặc nhóm). Role mặc định khi cài là `postgres` (siêu quản trị).
- **Client và server**: `psql`, DBeaver, ứng dụng Java đều là client; chúng nói chuyện với server bằng giao thức riêng của PostgreSQL qua TCP hoặc Unix socket.
- **postmaster**: process cha, lắng nghe kết nối, tạo process con cho mỗi kết nối và các process nền.
- **Backend process**: process phục vụ đúng một kết nối client, phân tích và chạy SQL.
- **shared buffers**: vùng bộ nhớ dùng chung làm cache các page (khối 8 KB) của bảng và index.
- **WAL (write-ahead log)**: nhật ký ghi thay đổi xuống đĩa trước khi sửa datafile, để phục hồi sau sự cố.
- **Datafile**: file thật trên đĩa chứa dữ liệu bảng và index, nằm trong thư mục dữ liệu (`PGDATA`).
- **Cổng 5432**: cổng TCP mặc định của PostgreSQL.
- **Lệnh meta của psql**: lệnh bắt đầu bằng `\`, do `psql` xử lý, không gửi lên server và không cần dấu chấm phẩy.

Cách các đối tượng lồng nhau, đọc từ ngoài vào trong:

```mermaid
flowchart TD
    S["Server PostgreSQL: cổng 5432"] --> CL["Cluster: một thư mục dữ liệu PGDATA"]
    CL --> D1["Database postgres"]
    CL --> D2["Database learn"]
    D2 --> SC1["Schema public"]
    D2 --> SC2["Schema demo"]
    SC2 --> T["Bảng demo.customers"]
    SC2 --> V["View, index, sequence"]
```

## Kiến trúc process ở mức đơn giản

Hình dung PostgreSQL như một nhà hàng: postmaster là quản lý đứng cửa, mỗi khách vào được giao một phục vụ riêng (backend process), tất cả cùng dùng chung quầy nguyên liệu (shared buffers) và một cuốn sổ ghi order (WAL), còn kho (datafile) nằm phía sau.

```mermaid
flowchart TD
    C1["Client: psql"] --> PM["postmaster: lắng nghe cổng 5432"]
    C2["Client: ứng dụng Java"] --> PM
    PM --> B1["Backend process 1"]
    PM --> B2["Backend process 2"]
    B1 --> SB["Shared buffers: cache page 8 KB"]
    B2 --> SB
    B1 --> WAL["WAL: ghi nhật ký trước"]
    B2 --> WAL
    SB --> DF["Datafile trên đĩa"]
    PM --> BG["Process nền: checkpointer, background writer, WAL writer, autovacuum"]
    BG --> SB
    BG --> DF
```

Đọc sơ đồ: client kết nối vào postmaster, nó giao kết nối cho một backend riêng. Backend đọc và sửa page trong shared buffers, đồng thời ghi record vào WAL. Datafile không được ghi ngay mỗi lần sửa: process nền (checkpointer, background writer) ghi các page đã sửa xuống đĩa theo lô. Autovacuum dọn dữ liệu cũ. Từ PostgreSQL 18, hệ I/O bất đồng bộ có thêm các process phụ trợ (mặc định `io_method = worker`); với người mới, chỉ cần biết đây là chi tiết bên trong, không ảnh hưởng cách bạn viết SQL.

Luồng một câu `INSERT` được commit:

```mermaid
sequenceDiagram
    participant App as "Ứng dụng"
    participant BE as "Backend process"
    participant SB as "Shared buffers"
    participant W as "WAL trên đĩa"
    participant D as "Datafile"
    App->>BE: INSERT rồi COMMIT
    BE->>SB: Sửa page trong bộ nhớ
    BE->>W: Ghi record WAL và flush
    W-->>BE: Đã bền vững
    BE-->>App: COMMIT thành công
    SB->>D: Ghi page xuống đĩa sau, ở checkpoint
```

Vì sao như vậy: ghi tuần tự một dòng nhật ký nhanh hơn nhiều so với ghi rải rác nhiều page vào datafile, và nếu máy sập, PostgreSQL phát lại WAL để khôi phục. Chi tiết WAL, MVCC và VACUUM nằm ở [PostgreSQL bên trong](/go?p=02-Database%2Fmedium%2Flt-08-postgresql-mvcc-wal.md); bài này chỉ cần bạn nắm hình tổng thể.

**Nền tảng:** PostgreSQL chạy theo mô hình client-server: một postmaster, mỗi kết nối một backend process riêng. Dữ liệu được sửa trong shared buffers, WAL được ghi xuống đĩa trước khi commit trả về, datafile được cập nhật sau. Vì mỗi kết nối là một process nên số kết nối đồng thời bị giới hạn (`max_connections` mặc định 100).

**Suy luận:** Commit chỉ cần chờ WAL, không chờ datafile, vì WAL đủ để dựng lại mọi thay đổi nếu sập máy. Điều này giải thích hai hiện tượng người mới hay thắc mắc. Thứ nhất, dữ liệu vừa commit vẫn an toàn dù datafile chưa được ghi, và đó là lý do tắt đột ngột không làm mất giao dịch đã commit. Thứ hai, mỗi kết nối tốn một process nên mở hàng nghìn kết nối trực tiếp từ ứng dụng là không bền; ứng dụng dùng connection pool để giữ ít kết nối và dùng lại. Điểm dễ nhầm là nghĩ commit nghĩa là dữ liệu đã nằm trong datafile; thực tế nó mới nằm chắc chắn trong WAL.

## Cài đặt

### Cách 1: Docker (khuyên dùng để học)

Nhanh, dễ xóa, không làm bẩn máy. Cần cài Docker trước.

```bash
docker run --name pg18 \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  -v pg18data:/var/lib/postgresql \
  -d postgres:18
```

Giải thích từng phần: `--name pg18` đặt tên container; `POSTGRES_PASSWORD` là mật khẩu role `postgres` (bắt buộc); `-p 5432:5432` mở cổng ra máy chủ; `-v pg18data:/var/lib/postgresql` giữ dữ liệu trong một volume để xóa container không mất dữ liệu; `-d` chạy nền. Theo ghi chú của image chính thức, từ phiên bản 18 thư mục dữ liệu nằm sâu hơn một cấp (dưới `/var/lib/postgresql/18/...`), nên volume gắn vào `/var/lib/postgresql` chứ không phải `/var/lib/postgresql/data` như bản cũ; hãy đọc lại trang image `postgres` trên Docker Hub khi dùng. Mật khẩu `secret` chỉ để học, không dùng ở môi trường thật.

```bash
docker logs pg18                                  # xem log khởi động
docker exec -it pg18 psql -U postgres             # mở psql bên trong container
docker stop pg18 && docker start pg18             # tắt, bật lại
docker rm -f pg18 && docker volume rm pg18data    # xóa sạch, làm lại từ đầu
```

### Cách 2: Cài trực tiếp

| Hệ điều hành | Cách cài (kiểm tra trang tải chính thức để biết lệnh hiện hành) |
|---|---|
| Windows | Trình cài đặt (installer) từ trang tải PostgreSQL; đặt mật khẩu cho `postgres`, giữ cổng 5432; có kèm `psql` và pgAdmin |
| macOS | Homebrew: `brew install postgresql@18`, hoặc Postgres.app |
| Ubuntu hoặc Debian | Thêm kho apt chính thức của PostgreSQL (PGDG) rồi `sudo apt install postgresql-18`; kho mặc định của distro có thể chỉ có bản cũ hơn |

Cài trực tiếp tiện cho máy cá nhân dùng lâu dài, nhưng khó giữ nhiều phiên bản cùng lúc; vì thế Docker thường hợp hơn khi học và khi dựng môi trường thử.

**Phải thuộc:** PostgreSQL lắng nghe cổng mặc định 5432; role mặc định là `postgres`. Docker: `docker run -e POSTGRES_PASSWORD=... -p 5432:5432 postgres:18`; biến `POSTGRES_PASSWORD` là bắt buộc.

## Dùng psql

`psql` là client dòng lệnh chính thức. Kết nối:

```bash
psql -h localhost -p 5432 -U postgres -d postgres
# hoặc dùng URI
psql "postgresql://postgres:secret@localhost:5432/postgres"
```

Lệnh meta thường dùng (không cần dấu chấm phẩy):

| Lệnh | Tác dụng |
|---|---|
| `\?` | Liệt kê mọi lệnh meta |
| `\l` | Liệt kê các database |
| `\c tên_db` | Chuyển sang database khác |
| `\dn` | Liệt kê schema |
| `\dt` hoặc `\dt schema.*` | Liệt kê bảng |
| `\d tên_bảng` | Mô tả bảng: cột, kiểu, index, constraint |
| `\du` | Liệt kê role |
| `\x` | Bật hoặc tắt hiển thị dọc (mỗi cột một dòng), tiện khi bảng nhiều cột |
| `\timing` | Bật hoặc tắt hiển thị thời gian chạy mỗi câu |
| `\i file.sql` | Chạy file SQL |
| `\copy` | Nhập hoặc xuất CSV giữa bảng và file trên máy client |
| `\q` | Thoát |

Lệnh SQL thường nhiều dòng và phải kết thúc bằng dấu chấm phẩy; dấu nhắc đổi từ `=#` sang `-#` khi psql đang chờ thêm.

### Database, schema, bảng đầu tiên

```sql
CREATE DATABASE learn;
\c learn

CREATE SCHEMA demo;

CREATE TABLE demo.customers (
    id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       text NOT NULL,
    email      text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

Giải thích: `GENERATED ALWAYS AS IDENTITY` để PostgreSQL tự đánh số 1, 2, 3 cho `id`; `text NOT NULL` là chuỗi bắt buộc; `UNIQUE` không cho trùng email; `timestamptz` lưu thời điểm có múi giờ, mặc định là lúc chèn. Kiểu dữ liệu và constraint được giải thích sâu ở [DDL, DML, kiểu dữ liệu và constraint](/go?p=02-Database%2Feasy%2Flt-14-ddl-dml-kieu-du-lieu-constraint-pg.md).

Kết quả mong đợi (minh họa, định dạng có thể lệch vài khoảng trắng):

```text
postgres=# \c learn
You are now connected to database "learn" as user "postgres".
learn=# \dt demo.*
          List of relations
 Schema |   Name    | Type  |  Owner
--------+-----------+-------+----------
 demo   | customers | table | postgres
```

### INSERT và SELECT đầu tiên

```sql
INSERT INTO demo.customers (name, email)
VALUES ('An', 'an@example.com'),
       ('Binh', 'binh@example.com');

SELECT id, name, email FROM demo.customers ORDER BY id;
```

```text
 id | name |      email
----+------+------------------
  1 | An   | an@example.com
  2 | Binh | binh@example.com
(2 rows)
```

_Minh họa_ (chưa chạy thử trên PostgreSQL vì môi trường soạn bài không có PostgreSQL; cú pháp đã được rà theo tài liệu PostgreSQL 18). Lưu ý bạn không điền `id` và `created_at`: identity và `DEFAULT` lo thay.

Chèn lại email đã có sẽ bị constraint từ chối:

```text
ERROR:  duplicate key value violates unique constraint "customers_email_key"
```

Thử `\x` và `\timing`:

```text
learn=# \x
Expanded display is on.
learn=# SELECT * FROM demo.customers WHERE id = 1;
-[ RECORD 1 ]-----------------------------
id         | 1
name       | An
email      | an@example.com
created_at | 2026-10-30 09:15:02.123456+00
```

`\timing` thêm dòng `Time: 0.512 ms` sau mỗi câu; con số cụ thể phụ thuộc máy.

### Nhập xuất CSV với \copy

```text
\copy demo.customers (name, email) FROM 'customers.csv' CSV HEADER
\copy (SELECT id, name FROM demo.customers ORDER BY id) TO 'out.csv' CSV HEADER
```

`\copy` đọc ghi file trên máy chạy `psql` (client), dùng quyền của bạn. Lệnh SQL `COPY` ghi file trên máy server và đòi quyền đặc biệt, nên với dữ liệu cá nhân hãy dùng `\copy`. Với Docker, `psql` chạy trong container nên đường dẫn file phải nằm trong container (hoặc chạy `psql` từ máy chủ).

**Phải thuộc:** Lệnh meta của psql: `\l` (database), `\c` (đổi database), `\dt` (bảng), `\d tên_bảng` (mô tả bảng), `\x` (hiển thị dọc), `\timing` (đo thời gian), `\copy` (CSV phía client), `\q` (thoát). Câu SQL phải kết thúc bằng dấu chấm phẩy, lệnh meta thì không.

## Công cụ GUI

| Công cụ | Điểm mạnh | Khi dùng |
|---|---|---|
| **DBeaver** (Community miễn phí) | Một công cụ cho nhiều loại database, xem ER diagram, sửa dữ liệu bằng lưới | Làm việc hằng ngày với nhiều DB |
| **pgAdmin** | Công cụ chính thức của cộng đồng PostgreSQL, quản trị role, backup, theo dõi | Quản trị riêng PostgreSQL |
| **psql** | Có sẵn trên mọi server, chạy được trong script | SSH vào server, tự động hóa |

Cách kết nối GUI giống nhau: host `localhost`, cổng `5432`, database `learn`, user `postgres`, mật khẩu bạn đặt. Nếu kết nối từ chối, kiểm tra container có chạy và cổng đã được `-p` mở chưa.

## Kết nối từ ứng dụng

Ứng dụng Java nói chuyện với PostgreSQL qua JDBC driver `org.postgresql:postgresql`. Định dạng URL:

```text
jdbc:postgresql://localhost:5432/learn
```

Với Spring Boot:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/learn
spring.datasource.username=postgres
spring.datasource.password=secret
```

Ở mức giới thiệu, bạn chỉ cần nhớ: URL gồm host, cổng, tên database; user và mật khẩu truyền riêng; Spring Boot tự dùng connection pool (HikariCP) để giữ sẵn một nhóm kết nối thay vì mở mới mỗi request. Mật khẩu thật không để trong file cấu hình đưa lên git mà lấy từ biến môi trường hoặc kho bí mật. Chi tiết pool và transaction ở các bài Spring Boot và [Transaction, Isolation và Lock](/go?p=02-Database%2Fmedium%2Flt-04-transaction-isolation-lock.md).

```mermaid
flowchart LR
    A["Ứng dụng Spring Boot"] --> P["Connection pool: HikariCP"]
    P --> D["JDBC driver PostgreSQL"]
    D -->|"TCP 5432"| S["PostgreSQL server"]
    S --> DB["Database learn"]
```

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách tránh |
|---|---|---|
| Quên dấu chấm phẩy cuối câu SQL | `psql` im lặng chờ thêm, dấu nhắc đổi thành `-#` | Gõ `;`, hoặc `Ctrl+C` để hủy |
| Dùng Docker không gắn volume | Xóa container là mất hết dữ liệu | Luôn gắn `-v` vào đúng thư mục dữ liệu của phiên bản |
| Gắn volume sai đường dẫn với image 18 | Dữ liệu không được giữ, hoặc container báo lỗi | Đọc ghi chú của image `postgres`: bản 18 dùng `/var/lib/postgresql` |
| Nhầm `COPY` với `\copy` | Lỗi quyền hoặc không thấy file | Dùng `\copy` cho file trên máy bạn |
| Kết nối nhầm database (`postgres` thay vì `learn`) | Bảng "biến mất" | Nhìn dấu nhắc `learn=#` hoặc dùng `\conninfo` |
| Dùng role `postgres` cho ứng dụng | Ứng dụng có quyền quá lớn | Tạo role riêng, quyền tối thiểu |
| Để mật khẩu `secret` hoặc mở 5432 ra internet | Bị dò mật khẩu và chiếm database | Mật khẩu mạnh, chỉ mở trong mạng nội bộ, không công khai cổng |
| Tưởng một cluster là một database | Truy vấn chéo database không được | Một kết nối chỉ thấy một database; muốn dùng chung hãy dùng schema |

## Điểm cần nhớ

- PostgreSQL là server; `psql`, DBeaver, ứng dụng đều là client kết nối cổng 5432.
- Cấu trúc đặt tên: cluster, database, schema, bảng. Schema mặc định là `public`.
- Commit chờ WAL được ghi xuống đĩa; datafile được cập nhật sau.
- Học bằng Docker: `docker run -e POSTGRES_PASSWORD=... -p 5432:5432 -v ... -d postgres:18`.
- Lệnh meta `\l`, `\c`, `\dt`, `\d`, `\x`, `\timing`, `\copy`, `\q`; SQL kết thúc bằng `;`.
- JDBC URL: `jdbc:postgresql://host:5432/database`.

## Phỏng vấn khó: chuỗi hỏi xoáy

Người phỏng vấn senior thường mở bằng một câu dễ rồi xoáy xuống cơ chế, đánh đổi và sự cố thật. Câu trả lời tốt luôn đi từ cốt lõi xuống, không đi từ chỗ học thuộc lên.

### Chuỗi 1: Dữ liệu đã commit không mất khi mất điện

1. **Câu mở:** PostgreSQL bảo đảm dữ liệu đã commit không mất, kể cả khi mất điện, bằng cách nào?
2. **Xoáy 1:** Máy sập lúc nhiều page bẩn còn nằm trong shared buffers, chưa ghi ra datafile. Khởi động lại thì PostgreSQL làm gì?
3. **Xoáy 2:** Có người tắt `fsync` cho nhanh, người khác đặt `synchronous_commit = off`. Rủi ro của hai việc đó khác nhau thế nào?

**Đáp án ngắn:** Commit chỉ trả về sau khi record WAL đã được flush xuống đĩa. WAL là nhật ký ghi tuần tự mọi thay đổi, được ghi trước khi datafile được sửa. Nếu sập khi page bẩn chưa ra datafile, lúc khởi động lại PostgreSQL phát lại WAL để dựng lại các thay đổi đã commit, nên durability đến từ WAL chứ không từ datafile. Page được process nền ghi xuống sau theo lô, ở checkpoint. Tắt `fsync` nghĩa là hệ điều hành chưa chắc đã đưa dữ liệu xuống đĩa, nên mất điện có thể làm hỏng cả dữ liệu; không tắt trên production. `synchronous_commit = off` thì commit không chờ flush WAL, nên khi sập chỉ có thể mất vài giao dịch cuối chứ không hỏng dữ liệu. Chỉ chọn nó khi chấp nhận mất vài giao dịch cuối, không dùng cho dữ liệu tiền bạc.

**Sai lầm hay gặp:**

- Nói "commit là dữ liệu đã nằm trong datafile".
- Gộp `fsync` off với `synchronous_commit` off thành một.
- Không nói được rằng phục hồi sau sập là phát lại WAL.

### Chuỗi 2: Mỗi kết nối một process và giới hạn kết nối

1. **Câu mở:** Kiến trúc kết nối của PostgreSQL ra sao? Một client kết nối thì server tạo ra gì?
2. **Xoáy 1:** Ứng dụng mở 2000 kết nối trực tiếp, hoặc có người tăng `max_connections` lên 5000 cho "khỏi lỗi hết kết nối". Điều gì xảy ra?
3. **Xoáy 2:** Có 10 instance Spring Boot, mỗi instance HikariCP pool 20, còn `max_connections` là 100. Vấn đề ở đâu và xử lý thế nào?

**Đáp án ngắn:** `postmaster` lắng nghe cổng 5432 và tạo một backend process riêng cho mỗi kết nối; process đó phân tích, chạy SQL, đọc ghi shared buffers và ghi WAL. Vì mỗi kết nối là một process nên số kết nối đồng thời bị giới hạn bởi `max_connections`, mặc định 100. Tăng lên hàng nghìn không làm query nhanh hơn vì CPU và đĩa có hạn; chỉ thêm RAM tiêu thụ, context switch và hàng đợi. Với 10 instance nhân pool 20 là 200 kết nối, vượt 100, instance sau cùng sẽ gặp lỗi hết kết nối, mà còn phải chừa chỗ cho công cụ quản trị. Cách xử lý: giảm pool mỗi instance (pool nhỏ thường nhanh hơn pool lớn) và đặt một pooler như PgBouncer ở giữa. Quy tắc tính: tổng kết nối bằng số instance nhân kích thước pool phải nhỏ hơn giới hạn của database, và khi autoscale ngang thì con số này tăng theo. Có thể xem số kết nối theo trạng thái qua `pg_stat_activity`.

**Sai lầm hay gặp:**

- Nghĩ "nhiều kết nối hơn thì nhanh hơn".
- Chỉ tính pool của một instance, quên nhân số instance.
- Nói mỗi kết nối là một thread (thực tế là một process).

## Câu hỏi tự kiểm tra

Với mỗi câu, thử trả lời theo gợi ý trước rồi mới đọc phần lập luận.

1. Một server PostgreSQL có thể có nhiều database, mỗi database có nhiều schema. Vì sao vẫn cần schema?
   - **Gợi ý suy luận:** một kết nối thấy được bao nhiêu database? Muốn gom bảng theo module trong cùng database thì làm gì?
   - **Lập luận và đáp án:** một kết nối chỉ làm việc với một database, truy vấn chéo database không dùng được như truy vấn thường. Schema là không gian tên trong cùng database: các module (ví dụ `billing`, `shop`) dùng schema riêng nhưng vẫn JOIN được với nhau và dùng chung transaction.
2. Vì sao commit nhanh dù datafile chưa được ghi?
   - **Gợi ý suy luận:** nếu máy sập ngay sau commit, dữ liệu dựng lại từ đâu?
   - **Lập luận và đáp án:** commit chỉ chờ WAL được flush xuống đĩa; WAL đủ thông tin để phát lại thay đổi khi khởi động lại. Datafile được ghi sau bởi process nền, nên commit không phải chờ nhiều lần ghi rải rác.
3. Bạn chạy `docker rm -f pg18` và mất hết dữ liệu. Thiếu gì khi chạy container?
   - **Gợi ý suy luận:** dữ liệu của container nằm ở đâu nếu không có volume?
   - **Lập luận và đáp án:** thiếu volume gắn vào thư mục dữ liệu, nên dữ liệu nằm trong lớp ghi của container và biến mất cùng nó. Cần `-v pg18data:/var/lib/postgresql` (với image 18).
4. Gõ `SELECT * FROM customers` trong database `learn` báo `relation "customers" does not exist` dù bạn vừa tạo `demo.customers`. Vì sao?
   - **Gợi ý suy luận:** tên không có schema được tìm trong những schema nào?
   - **Lập luận và đáp án:** mặc định PostgreSQL tìm trong `search_path`, thường là `"$user", public`, không gồm `demo`. Phải viết `demo.customers` hoặc `SET search_path TO demo, public`.
5. `\copy` khác `COPY` ở đâu và khi nào dùng cái nào?
   - **Gợi ý suy luận:** file nằm trên máy nào, và quyền của ai được dùng?
   - **Lập luận và đáp án:** `\copy` là lệnh của psql, đọc ghi file trên máy client bằng quyền của bạn; `COPY` chạy trên server, đọc ghi file trên máy server và đòi quyền đặc biệt. Nhập CSV từ máy cá nhân thì dùng `\copy`.
6. JDBC URL `jdbc:postgresql://db.internal:5432/shop` gồm những thành phần nào và username đặt ở đâu?
   - **Gợi ý suy luận:** đọc từng đoạn sau `//`.
   - **Lập luận và đáp án:** host `db.internal`, cổng `5432`, database `shop`. Username và mật khẩu không nằm trong URL mà truyền qua cấu hình (`spring.datasource.username`, `spring.datasource.password`) hoặc tham số riêng; mật khẩu nên lấy từ biến môi trường hoặc kho bí mật.

Nguồn: tài liệu chính thức PostgreSQL 18 (Tutorial, psql, Server Setup, Release Notes 18), trang image `postgres` trên Docker Hub và tài liệu PostgreSQL JDBC Driver, kiểm tra ngày 2026-10-30.

