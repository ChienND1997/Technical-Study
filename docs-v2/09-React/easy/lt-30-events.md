# Lý thuyết 30: Events

Bài này cần nắm [Bài 1](/go?p=09-React%2Feasy%2Flt-01-tu-duy-react-render.md) (state là snapshot) trước.

## Sự kiện trong React không phải sự kiện DOM gốc

Khi bạn viết `onClick`, `onChange`, tham số nhận được không phải là `Event` gốc của trình duyệt, mà là một **`SyntheticEvent`** — một lớp bọc của React quanh sự kiện gốc, có cùng giao diện (cùng tên thuộc tính và phương thức như `preventDefault()`, `target`, `currentTarget`) nhưng hoạt động giống nhau trên mọi trình duyệt, kể cả những trình duyệt cũ có API sự kiện hơi khác nhau.

```tsx
function SaveButton() {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    console.log(e.currentTarget); // phần tử đã gắn handler, không phải phần tử bị bấm trúng
  }
  return <button onClick={handleClick}>Lưu</button>;
}
```

**Tóm tắt:**

- Prop sự kiện (`onClick`, `onChange`, `onSubmit`...) nhận được một `SyntheticEvent` — lớp bọc thống nhất của React quanh sự kiện gốc của trình duyệt, không phải `Event` gốc.
- Từ React 17 trở đi không còn "event pooling": object sự kiện không bị tái sử dụng/xóa sạch, nên đọc thuộc tính của nó an toàn ngay cả trong code bất đồng bộ (sau `await`, trong `setTimeout`).
- `e.currentTarget` là phần tử đã gắn handler; `e.target` là phần tử thực sự bị tác động (có thể là một con cháu sâu hơn bên trong, do sự kiện nổi bọt lên).
- Submit một `<form>` HTML mặc định sẽ tải lại trang; gọi `e.preventDefault()` trong `onSubmit` để tự xử lý bằng JavaScript thay vì để trình duyệt điều hướng.
- Gắn `onSubmit` vào thẻ `<form>` (không phải `onClick` vào nút submit) để bấm Enter trong bất kỳ ô nào cũng kích hoạt đúng luồng.

Một chi tiết lịch sử hay bị hỏi: trước React 17, `SyntheticEvent` dùng kỹ thuật "event pooling" — object sự kiện bị tái sử dụng và các thuộc tính bị xóa sạch ngay sau khi handler chạy xong, nên đọc `e.target` trong một callback bất đồng bộ (`setTimeout`, sau một `await`) sẽ ra `null`. Từ React 17 trở đi, pooling đã bị bỏ hoàn toàn — `SyntheticEvent` không còn bị tái sử dụng, nên bạn truy cập `e` ở đâu, lúc nào cũng an toàn, kể cả sau một `await`.

**Phải thuộc:** từ React 17 trở đi không còn event pooling; bạn không cần gọi `e.persist()` (API đó đã biến mất) và có thể đọc thuộc tính của `e` một cách an toàn trong code bất đồng bộ.

## `<form onSubmit>` và `preventDefault`

Hành vi mặc định của trình duyệt khi submit một `<form>` là **tải lại trang** và gửi dữ liệu theo kiểu HTTP truyền thống. Trong một ứng dụng React xử lý submit bằng JavaScript, bạn hầu như luôn muốn chặn hành vi mặc định đó lại.

```tsx
function LoginForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // chặn tải lại trang
    // gọi API đăng nhập ở đây
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* các input */}
      <button type="submit">Đăng nhập</button>
    </form>
  );
}
```

Gắn `onSubmit` vào thẻ `<form>` (không phải `onClick` vào nút submit) để bấm Enter trong bất kỳ ô nào của form cũng kích hoạt đúng luồng — đó là hành vi mặc định của HTML form mà bạn vẫn giữ được. Nút `type="submit"` nằm trong `<form>` sẽ tự kích hoạt sự kiện `submit` của form cha mà không cần gắn handler riêng vào nút. Dựng một input controlled hoàn chỉnh và xử lý nhiều trường cùng lúc, xem [Forms cơ bản](/go?p=09-React%2Feasy%2Flt-31-forms-co-ban.md).

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Quên `e.preventDefault()` trong `onSubmit` | Trang tải lại, mất toàn bộ state | Luôn gọi ở đầu handler submit |
| Đặt `onClick` vào nút submit thay vì `onSubmit` vào `<form>` | Bấm Enter trong ô input không submit được | Gắn `onSubmit` vào thẻ `<form>` |
| Nhầm `e.target` với `e.currentTarget` khi sự kiện nổi bọt | Đọc nhầm phần tử con thay vì phần tử đã gắn handler | Dùng `e.currentTarget` khi cần chính xác phần tử gắn handler |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Vì sao hầu như luôn gọi `e.preventDefault()` trong `onSubmit` của một SPA React?

**Gợi ý suy luận:**
- Hành vi mặc định của trình duyệt khi một `<form>` HTML được submit là gì (tải lại trang, điều hướng)?
- Trong một ứng dụng xử lý toàn bộ logic bằng JavaScript phía client, hành vi đó có còn phù hợp không?

**Lập luận:** HTML form vốn được thiết kế để tự gửi request và tải trang mới — hành vi hợp lý cho web truyền thống nhưng phá vỡ hoàn toàn một SPA (mất toàn bộ state trong bộ nhớ, trải nghiệm giật cục). `preventDefault()` chặn đúng hành vi mặc định đó, để bạn tự quyết định làm gì tiếp theo (gọi API bằng `fetch`, cập nhật state) mà không rời trang.

**Đáp án ngắn:** Để chặn trình duyệt tải lại trang theo kiểu submit HTML truyền thống, giữ quyền kiểm soát luồng xử lý bằng JavaScript.

**Nhớ:** xem phần "`<form onSubmit>` và `preventDefault`".

### 2. `SyntheticEvent` của React 17+ có cần gọi `e.persist()` không, vì sao?

**Gợi ý suy luận:**
- "Event pooling" nghĩa là object sự kiện bị tái sử dụng/xóa thuộc tính khi nào?
- Từ React 17, cơ chế đó còn tồn tại không?

**Lập luận:** Trước React 17, React tái sử dụng (pool) object `SyntheticEvent` để tiết kiệm bộ nhớ, và xóa sạch thuộc tính ngay sau khi handler đồng bộ chạy xong; `e.persist()` tồn tại để "giữ" một bản không bị xóa khi cần dùng bất đồng bộ. Từ React 17, pooling bị loại bỏ hoàn toàn, nên object sự kiện không còn bị tái sử dụng hay xóa sạch, và `e.persist()` không còn cần thiết (API cũng đã bị gỡ bỏ).

**Đáp án ngắn:** Không cần, vì từ React 17 không còn event pooling nên `e.persist()` đã bị loại bỏ khỏi API.

**Nhớ:** đây là một câu hỏi lịch sử hay gặp để kiểm tra bạn có cập nhật kiến thức theo phiên bản không.

Tiếp theo: [Bài 31: Forms cơ bản](/go?p=09-React%2Feasy%2Flt-31-forms-co-ban.md).
