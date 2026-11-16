# Lý thuyết 21: JSX

Bài này dành cho người mới quen JavaScript thuần, DOM và bắt đầu đọc JSX lần đầu. Cần nắm [Bài 1](/go?p=09-React%2Feasy%2Flt-01-tu-duy-react-render.md) (render chỉ tính ra một cây mô tả, chưa chạm DOM) trước khi đọc bài này.

## JSX không phải là HTML

JSX trông giống HTML nhưng thực ra chỉ là cú pháp rút gọn cho một lời gọi hàm bình thường. Trình biên dịch (Babel, SWC, hay compiler của framework) biến mỗi thẻ JSX thành một lời gọi tạo "element" — một object JavaScript thuần mô tả "tôi muốn có một thẻ/component loại này với props này".

```tsx
// Bạn viết:
const el = <h1 className="title">Xin chào</h1>;

// Trình biên dịch biến thành (bản rút gọn, tên hàm thật là `jsx` hoặc `jsxs`):
const el = React.createElement("h1", { className: "title" }, "Xin chào");
```

**Nền tảng:** JSX chỉ là cú pháp; kết quả cuối cùng luôn là một object JavaScript thuần (`{ type: "h1", props: { className: "title", children: "Xin chào" } }`, lược giản). Vì nó chỉ là dữ liệu nên có thể gán vào biến, truyền qua props, lưu trong mảng — đúng như mọi giá trị JavaScript khác. Hiểu điều này giải thích vì sao bạn viết được `{dieuKien && <Thong_bao />}` ngay giữa JSX: đó chỉ là một biểu thức JavaScript bình thường được nhúng vào.

Vì JSX là JavaScript, nó có vài quy tắc khác HTML: `class` phải viết `className` (vì `class` là từ khóa JS), thuộc tính viết `camelCase` (`onClick`, không phải `onclick`), và mọi thẻ phải đóng (`<img />`, không phải `<img>`).

**Tóm tắt:**

- JSX chỉ là cú pháp rút gọn, được trình biên dịch dịch thành lời gọi hàm tạo element (`React.createElement` hoặc `jsx`), kết quả là một object JavaScript thuần.
- Vì chỉ là dữ liệu JS bình thường, JSX gán được vào biến, truyền qua props, lưu trong mảng — không có cú pháp template riêng nào.
- Cặp `{}` nhúng một **biểu thức** JavaScript vào JSX, không phải câu lệnh (`if`, `for` trực tiếp không hợp lệ).
- `class` phải viết `className`, thuộc tính viết `camelCase`, và mọi thẻ phải tự đóng.
- Một component chỉ trả về một node gốc; Fragment (`<>...</>`) gói nhiều node mà không sinh thêm thẻ DOM thật.

## Nhúng biểu thức với `{}`

Bất cứ chỗ nào trong JSX, cặp dấu `{}` cho phép chèn một **biểu thức** JavaScript (không phải câu lệnh — không viết `if`, `for` trực tiếp bên trong).

```tsx
function Greeting({ name, unread }: { name: string; unread: number }) {
  return (
    <div>
      <p>Xin chào, {name.toUpperCase()}!</p>
      <p>Bạn có {unread} tin nhắn mới.</p>
    </div>
  );
}
```

`name.toUpperCase()` và `unread` đều là biểu thức hợp lệ. `if (x) { ... }` thì không — phải chuyển thành biểu thức (ternary) hoặc tính trước ở ngoài rồi gán vào biến. Cách dùng `{}` để render có điều kiện hay render danh sách có bài riêng: xem [Lists and Keys](/go?p=09-React%2Feasy%2Flt-22-lists-and-keys.md) và [Conditional Rendering](/go?p=09-React%2Feasy%2Flt-23-conditional-rendering.md).

## Fragment: trả về nhiều phần tử mà không thêm thẻ thừa

Một component chỉ được trả về **một** node gốc. Muốn trả hai đoạn JSX cạnh nhau mà không bọc thêm một `<div>` vô nghĩa (làm hỏng CSS Flexbox/Grid của cha, hoặc phá cấu trúc `<table>`), dùng Fragment — cú pháp `<>...</>`.

```tsx
function UserRow({ name, email }: { name: string; email: string }) {
  return (
    <>
      <td>{name}</td>
      <td>{email}</td>
    </>
  );
}
```

Fragment không tạo thẻ DOM nào cả — nó chỉ là một cách "gói" nhiều node thành một giá trị trả về hợp lệ. Khi cần key cho từng Fragment (ví dụ lặp Fragment trong danh sách), dùng dạng đầy đủ `<React.Fragment key={...}>`, vì `<>` rút gọn không nhận được prop.

**Phải thuộc:** một component chỉ trả về một node gốc; Fragment (`<>...</>` hoặc `<React.Fragment>`) gói nhiều node lại mà không sinh thêm thẻ DOM thật, dùng khi bọc thêm `<div>` sẽ phá cấu trúc (bảng, danh sách định nghĩa, Flex/Grid con trực tiếp).

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Viết `if` trực tiếp bên trong `{}` | Lỗi cú pháp, JSX chỉ nhận biểu thức | Chuyển thành ternary hoặc tính trước ngoài JSX |
| Quên bọc Fragment khi trả hai node | Lỗi "Adjacent JSX elements must be wrapped" | `<>...</>` |
| `class="..."` thay vì `className="..."` | Thuộc tính bị bỏ qua, không có style | Luôn dùng `className` |
| Dùng `<>` rút gọn nhưng cần key | Fragment không nhận được prop `key` | Dùng `<React.Fragment key={...}>` dạng đầy đủ |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. JSX có phải là một ngôn ngữ template riêng của React không?

**Gợi ý suy luận:**
- Khi biên dịch, một thẻ JSX biến thành cái gì — một chuỗi HTML, hay một giá trị JavaScript?
- Nếu nó chỉ là một lời gọi hàm, nó có thể xuất hiện ở bất cứ đâu một biểu thức JS được phép xuất hiện không?

**Lập luận:** JSX chỉ là cú pháp rút gọn, được trình biên dịch dịch thành lời gọi hàm tạo element (`React.createElement` hoặc `jsx`), và kết quả là một object JavaScript thuần. Vì nó chỉ là dữ liệu JS bình thường, nó gán được vào biến, truyền qua props, lưu trong mảng — không có "phép màu" riêng nào của một ngôn ngữ template.

**Đáp án ngắn:** Không, JSX chỉ là cú pháp dịch thành lời gọi hàm tạo ra object JS thuần.

**Nhớ:** xem phần "JSX không phải là HTML" ở trên.

### 2. Vì sao JSX không cho viết `if` trực tiếp bên trong `{}`, và cách thay thế là gì?

**Gợi ý suy luận:**
- Cặp `{}` trong JSX chấp nhận biểu thức hay câu lệnh?
- `if` trong JavaScript là biểu thức có giá trị hay là một câu lệnh điều khiển luồng?

**Lập luận:** Vì `{}` trong JSX chỉ chèn được giá trị của một biểu thức (thứ có thể gán cho một biến), còn `if` là câu lệnh điều khiển luồng chứ không trả về giá trị, nên nó không hợp lệ trực tiếp bên trong `{}`. Cách thay thế: chuyển logic rẽ nhánh thành một biểu thức (ternary, `&&`) hoặc tính toán trước bên ngoài JSX rồi mới nhúng biến kết quả vào.

**Đáp án ngắn:** `{}` chỉ nhận biểu thức, `if` là câu lệnh nên không hợp lệ; dùng ternary/`&&` hoặc tính trước ngoài JSX.

**Nhớ:** xem phần "Nhúng biểu thức với `{}`".

### 3. Vì sao đôi khi cần bọc Fragment thay vì một `<div>` bình thường?

**Gợi ý suy luận:**
- Một component được phép trả về bao nhiêu node gốc?
- Nếu nội dung đó nằm trong một `<table>` hoặc một container Flex, thêm một `<div>` bọc ngoài có ảnh hưởng gì đến cấu trúc DOM mong đợi?

**Lập luận:** Vì React yêu cầu một node gốc duy nhất, bạn cần một cách "gói" nhiều node JSX cạnh nhau lại. Dùng `<div>` để gói thì luôn tạo thêm một thẻ DOM thật, có thể phá cấu trúc nơi trình duyệt mong một quan hệ cha-con cụ thể (ví dụ `<tr>` phải chứa trực tiếp `<td>`, không phải `<div><td>`). Fragment giải quyết đúng vấn đề này: gói nhiều node mà không sinh thêm thẻ nào.

**Đáp án ngắn:** Vì một component chỉ trả về một node gốc, và đôi khi thêm `<div>` bọc ngoài sẽ phá cấu trúc DOM yêu cầu (bảng, Flex/Grid con trực tiếp); Fragment gói nhiều node mà không tạo thẻ thật.

**Nhớ:** xem phần "Fragment" ở trên.

Tiếp theo: [Bài 22: Lists and Keys](/go?p=09-React%2Feasy%2Flt-22-lists-and-keys.md).
