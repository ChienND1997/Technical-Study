# Lý thuyết 22: Lists and Keys

Bài này cần nắm [JSX](/go?p=09-React%2Feasy%2Flt-21-jsx.md) trước (nhúng biểu thức `{}` bằng JavaScript bình thường).

## Render danh sách bằng `.map()`

React không có cú pháp lặp riêng trong JSX. Muốn vẽ một danh sách, bạn dùng đúng `.map()` của JavaScript để biến một mảng dữ liệu thành một mảng element.

```tsx
const todos = [
  { id: "t1", text: "Mua sữa" },
  { id: "t2", text: "Đọc sách" },
];

function TodoList() {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

**Tóm tắt:**

- React render danh sách bằng `.map()` của JavaScript thuần, không có cú pháp lặp riêng trong JSX.
- `key` là danh tính ổn định của mỗi phần tử, giúp React khớp đúng phần tử cũ với phần tử mới giữa hai lần render.
- Dùng `index` làm key chỉ an toàn khi danh sách tĩnh tuyệt đối (không thêm/xóa/sắp xếp lại) — gần như không bao giờ an toàn trong thực tế.
- Index làm key sai có thể khiến state (giá trị input, toggle) của một dòng bị gắn nhầm sang dòng khác sau khi mảng đổi.
- Luôn ưu tiên một id ổn định có sẵn trong dữ liệu (id từ database, uuid đã lưu) làm key.

Vì sao cần `key`? Hãy hình dung không có nó. Lần render đầu, React vẽ ra ba dòng `<li>`. Lần render sau, mảng `todos` đổi — có thể thêm một phần tử ở đầu, xóa một phần tử ở giữa, hay sắp xếp lại. React nhận được một mảng `<li>` mới toanh và phải trả lời: "dòng nào trong mảng mới **là** dòng nào trong mảng cũ, và dòng nào là dòng hoàn toàn mới?" Không có cách nào để biết điều đó chỉ từ nội dung chữ bên trong — hai dòng "Mua sữa" ở hai thời điểm khác nhau có phải cùng một việc không? `key` chính là câu trả lời bạn cung cấp: nó là **danh tính ổn định** của mỗi phần tử, độc lập với vị trí của nó trong mảng.

Xem cụ thể bug xảy ra thế nào nếu dùng chỉ số mảng (`index`) làm key, với một danh sách việc cần làm có ô input ghi chú đang gõ dở:

```tsx
// Sai: key là index
{todos.map((todo, index) => (
  <li key={index}>
    <input defaultValue={todo.note} />
    {todo.text}
  </li>
))}
```

Giả sử bạn đang gõ ghi chú cho dòng thứ hai ("Đọc sách", index 1), rồi dòng đầu tiên ("Mua sữa", index 0) bị xóa khỏi mảng. Sau khi xóa, "Đọc sách" trượt lên index 0. Với key là index, React thấy "phần tử ở key 0 vẫn tồn tại" — nó **không** biết đó giờ là một todo khác hẳn, nên nó **giữ nguyên** DOM node `<input>` cũ (cùng key = cùng danh tính, theo góc nhìn của React) thay vì tạo input mới. Kết quả: ô ghi chú bạn đang gõ cho "Đọc sách" lại hiện lên y nguyên nhưng gắn vào dòng "Mua sữa" đã biến mất trước đó — nội dung gõ dở bị gán nhầm dòng.

```tsx
// Đúng: key là id ổn định của chính dữ liệu, không phụ thuộc vị trí
{todos.map((todo) => (
  <li key={todo.id}>
    <input defaultValue={todo.note} />
    {todo.text}
  </li>
))}
```

Với `key={todo.id}`, khi "Mua sữa" (id `t1`) bị xóa, React thấy đúng phần tử mang id `t1` biến mất và chỉ unmount đúng node đó; phần tử mang id `t2` ("Đọc sách") giữ nguyên danh tính của nó dù vị trí đổi, nên input và state của nó không bị xáo trộn.

**Phải thuộc:** dùng index làm key chỉ an toàn khi danh sách **tĩnh tuyệt đối** (không bao giờ thêm, xóa, chèn giữa, hay sắp xếp lại) — tức gần như không bao giờ an toàn trong thực tế. Luôn ưu tiên một id ổn định có sẵn trong dữ liệu (id từ database, uuid đã lưu) làm key.

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Quên `key` khi `.map()` | React cảnh báo trong console, và state dễ gắn sai dòng | Luôn thêm `key` bằng id ổn định |
| Dùng `index` làm key với danh sách đổi thứ tự | State (input, toggle) trượt sang dòng khác | Dùng id từ dữ liệu |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Vì sao danh sách render trong React cần `key`, và index có phải lúc nào cũng dùng được không?

**Gợi ý suy luận:**
- Khi mảng dữ liệu đổi (thêm, xóa, sắp xếp lại), React cần biết "phần tử nào trong mảng mới là phần tử nào trong mảng cũ" dựa vào thông tin gì?
- Nếu dùng vị trí (index) làm danh tính, chèn hoặc xóa ở đầu mảng thì vị trí của các phần tử còn lại có đổi không?

**Lập luận:** `key` là danh tính ổn định giúp React khớp đúng phần tử cũ với phần tử mới giữa hai lần render, để biết giữ state ở đâu và unmount/tạo mới ở đâu. Index gắn danh tính với vị trí; khi mảng chèn, xóa, hay sắp xếp lại, vị trí của các phần tử còn lại dịch đi, nên React khớp nhầm phần tử này với state của phần tử khác (ví dụ trượt nội dung ô input đang gõ dở sang dòng khác).

**Đáp án ngắn:** Key cho React biết danh tính ổn định của từng phần tử để khớp đúng dòng cũ với dòng mới; index chỉ an toàn khi danh sách tuyệt đối không bao giờ đổi thứ tự/thêm/xóa ở giữa, nên gần như luôn nên dùng id thật thay vì index.

**Nhớ:** xem ví dụ chi tiết "input trượt dòng" ở phần "Render danh sách bằng `.map()`".

Tiếp theo: [Bài 23: Conditional Rendering](/go?p=09-React%2Feasy%2Flt-23-conditional-rendering.md).
