# Lý thuyết 23: Conditional Rendering

Bài này cần nắm [JSX](/go?p=09-React%2Feasy%2Flt-21-jsx.md) trước (nhúng biểu thức `{}` bằng JavaScript bình thường).

## Ba cách render có điều kiện

JSX không có `if/else` như một câu lệnh nhúng trực tiếp được, nhưng có ba cách viết biểu thức điều kiện quen thuộc, mỗi cách hợp với một tình huống.

| Cách viết | Cú pháp | Hợp khi nào |
|---|---|---|
| Toán tử `&&` | `{dieuKien && <Thing />}` | Chỉ cần hiện/ẩn một thứ, không có nhánh "còn lại" |
| Ternary (`? :`) | `{dieuKien ? <A /> : <B />}` | Cần đúng hai nhánh, cả hai đều ngắn |
| Early return | `if (!data) return <Spinner />;` rồi code bình thường bên dưới | Nhiều nhánh, hoặc thân component sẽ rối nếu nhồi hết vào JSX |

**Tóm tắt:**

- JSX không có `if/else` nhúng trực tiếp; thay vào đó dùng ba cách viết biểu thức: `&&`, ternary, hoặc early return.
- `&&` hợp khi chỉ cần hiện/ẩn một thứ mà không có nhánh "còn lại".
- Ternary hợp khi cần đúng hai nhánh ngắn gọn; early return hợp khi có nhiều trạng thái/nhánh rõ rệt.
- `{count && <Thing />}` với `count` là số có thể render ra chữ "0" trơ trọi khi `count` bằng 0, vì `&&` trả về nguyên vế trái khi vế trái falsy.
- `null`, `undefined`, `false` thì React bỏ qua không render gì, nhưng số `0` và chuỗi rỗng thì không (chuỗi rỗng không hiện gì nên khó thấy, nhưng `0` thì hiện rõ).

```tsx
function UserCard({ user }: { user: User | null }) {
  // Early return: tách nhánh "chưa có dữ liệu" ra khỏi phần chính,
  // phần JSX chính bên dưới không cần lo trường hợp user là null nữa
  if (!user) return <p>Đang tải...</p>;

  return (
    <div className="card">
      <h2>{user.name}</h2>
      {/* && : chỉ hiện huy hiệu khi có, không có "nhánh else" nào cần */}
      {user.isPro && <span className="badge">PRO</span>}
      {/* ternary: đúng hai trạng thái rõ ràng */}
      {user.online ? <span>🟢 Đang hoạt động</span> : <span>⚪ Ngoại tuyến</span>}
    </div>
  );
}
```

### Bẫy kinh điển: `{count && <Thing />}` khi `count` là số

Toán tử `&&` trả về vế trái nếu vế trái là "falsy", và JSX render thẳng bất cứ giá trị nào bạn đưa vào `{}` — kể cả khi giá trị đó là số `0`, nó vẫn in ra chữ số `0` lên màn hình (chuỗi `"0"` không "falsy" theo nghĩa JSX, nó là nội dung hợp lệ cần vẽ).

```tsx
function Badge({ count }: { count: number }) {
  // Sai: khi count = 0, biểu thức trả về 0 (không phải false),
  // và React render số 0 ra màn hình thành chữ "0" nằm trơ trọi
  return <div>{count && <span className="badge">{count}</span>}</div>;
}
```

```tsx
function Badge({ count }: { count: number }) {
  // Đúng: ép về boolean thật bằng so sánh, hoặc dùng ternary
  return <div>{count > 0 && <span className="badge">{count}</span>}</div>;
}
```

**Phải thuộc:** `&&` trong JSX chỉ an toàn khi vế trái chắc chắn là `true`/`false` thật. Với số, luôn so sánh tường minh (`count > 0 && ...`) thay vì để nguyên biến số làm điều kiện; `null`, `undefined` và `false` thì React bỏ qua không render gì, nhưng `0` và chuỗi rỗng `""` thì không (chuỗi rỗng thì không hiện gì nên khó thấy, nhưng `0` thì hiện rõ).

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| `{count && <X/>}` với `count` có thể là `0` | Hiện chữ "0" vô nghĩa trên UI | `count > 0 && <X/>` |
| Viết `if` trực tiếp bên trong `{}` | Lỗi cú pháp, JSX chỉ nhận biểu thức | Chuyển thành ternary hoặc early return |
| Lồng nhiều ternary vào nhau | Khó đọc, dễ lẫn nhánh | Tách thành early return |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. `{count && <Badge/>}` có vấn đề gì khi `count` bằng 0?

**Gợi ý suy luận:**
- Toán tử `&&` trả về gì khi vế trái là `0`? Giá trị đó có phải `false` không?
- React xử lý thế nào khi giá trị cần render là số `0` — nó bỏ qua như với `null`/`false`, hay vẽ ra?

**Lập luận:** `0 && X` trả về `0` (không phải `false`), vì `&&` trả nguyên vế trái khi vế trái falsy. React coi `null`, `undefined`, `false` là "không render gì", nhưng `0` là một giá trị hợp lệ cần vẽ ra, nên nó in chữ số "0" lên màn hình — một kết quả không ai mong muốn khi ý định ban đầu chỉ là "ẩn huy hiệu lúc chưa có gì".

**Đáp án ngắn:** Khi `count = 0`, biểu thức trả về `0` chứ không phải `false`, và React vẽ `0` ra màn hình; sửa bằng cách so sánh tường minh `count > 0 && ...`.

**Nhớ:** xem phần "Bẫy kinh điển" ở trên; `null`/`undefined`/`false` thì React không render, `0` và `""` thì có hiển thị (hoặc không hiển thị gì nhưng vẫn là giá trị, dễ gây nhầm lẫn khác).

### 2. Khi nào nên dùng early return thay vì ternary lồng nhau trong JSX?

**Gợi ý suy luận:**
- Nếu một component có ba, bốn trạng thái khác nhau cần hiển thị hoàn toàn khác nhau (đang tải, lỗi, rỗng, có dữ liệu), viết hết bằng ternary lồng trong một biểu thức JSX có dễ đọc không?
- Early return có cho phép phần code phía dưới "giả định" điều gì đã đúng không?

**Lập luận:** Ternary lồng nhiều tầng rất khó đọc và dễ lẫn nhánh. Early return tách mỗi trạng thái thành một `if` riêng, trả về sớm; nhờ vậy phần JSX chính ở cuối hàm không cần lo các trường hợp đã được xử lý phía trên (ví dụ không cần kiểm tra `user` có null nữa vì nhánh đó đã return rồi). Ternary và `&&` vẫn hợp lý cho một điều kiện đơn giản, cục bộ, không đáng tách thành nhánh riêng.

**Đáp án ngắn:** Dùng early return khi có nhiều trạng thái/nhánh rõ rệt (loading, error, empty, data) để phần JSX chính không phải xử lý lại các trường hợp đã loại; dùng ternary/`&&` cho một điều kiện đơn, cục bộ.

**Nhớ:** xem bảng "Ba cách render có điều kiện".

Tiếp theo: [Bài 24: Props vs State](/go?p=09-React%2Feasy%2Flt-24-props-vs-state.md).
