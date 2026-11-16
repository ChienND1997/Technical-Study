# Lý thuyết 31: Forms cơ bản

Bài này ở mức trước khi dùng thư viện. Cần nắm [Bài 2](/go?p=09-React%2Feasy%2Flt-02-hooks-co-ban.md) (`useState`) và [Events](/go?p=09-React%2Feasy%2Flt-30-events.md). Khi form có nhiều trường, cần validate phức tạp, hoặc submit thường xuyên, hãy chuyển sang React Hook Form + Zod ở [Bài 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md) — bài đó không lặp lại nội dung ở đây. Phần markup HTML thuần của form (input type, label, validate có sẵn của trình duyệt) có bài riêng, framework-agnostic, ở [Form cơ bản (HTML)](/go?p=16-HTML%2Feasy%2Flt-03-form-co-ban.md).

## Input có kiểm soát (controlled), dựng từ đầu

"Controlled" nghĩa là **React state** giữ giá trị hiện tại của ô nhập, chứ không phải DOM tự giữ. Mọi lần gõ phím, bạn tự tay lưu giá trị mới vào state rồi để React vẽ lại input với giá trị đó.

**Tóm tắt:**

- Một input controlled luôn cần cả hai: prop `value` (nguồn hiển thị) và handler `onChange` (nguồn cập nhật) — thiếu một vế thì input "đóng băng" hoặc mất kiểm soát.
- Mỗi lần gõ một ký tự đi qua đúng một vòng: DOM hiện tạm thời → `onChange` bắn ra → bạn `setState` → React render lại → input hiện đúng giá trị trong state.
- Form nhiều trường nên gộp vào **một object state**, dùng thuộc tính `name` của input cùng cú pháp "computed property name" (`[name]: value`) để một handler duy nhất phục vụ mọi trường.
- Luôn dùng updater function (`setForm(prev => ...)`) khi cập nhật object state dựa trên giá trị cũ của chính nó.
- Không có ngưỡng số trường cứng nhắc để chuyển sang thư viện form — tín hiệu là validate thủ công bắt đầu lặp lại, hoặc hiệu năng gõ phím đáng chú ý.

```tsx
function NameField() {
  const [name, setName] = useState("");

  return (
    <input
      value={name}                                   // (1) input luôn hiển thị đúng giá trị trong state
      onChange={(e) => setName(e.target.value)}       // (2) mỗi lần gõ, lưu giá trị mới vào state
    />
  );
}
```

Hãy đọc kỹ vòng lặp xảy ra mỗi lần gõ một ký tự: (1) bạn gõ chữ "a", trình duyệt tự thêm "a" vào input *tạm thời*; (2) sự kiện `onChange` bắn ra, bạn đọc `e.target.value` (đã bao gồm "a") và gọi `setName("a")`; (3) React render lại component với `name = "a"`; (4) React thấy prop `value` của input giờ là `"a"`, và vì DOM đã tự hiển thị "a" rồi nên nhìn bề ngoài không có gì thay đổi — nhưng nguồn sự thật bây giờ chính thức là state, không phải DOM. Nếu bạn gọi `setName(name.toUpperCase())` thay vì `setName(e.target.value)`, input sẽ hiện chữ hoa dù bạn gõ chữ thường — minh chứng rằng chính state, không phải thao tác gõ phím, quyết định input hiển thị gì.

**Phải thuộc:** input controlled luôn cần cả hai: prop `value` (nguồn hiển thị) và handler `onChange` (nguồn cập nhật). Chỉ có `value` mà thiếu `onChange` thì input bị "đóng băng", gõ gì cũng không hiện ra (React luôn ép hiển thị đúng giá trị trong state, mà state không đổi).

## Nhiều trường, một handler: mẫu "computed property name"

Viết một state và một handler riêng cho mỗi trường (`name`/`setName`, `email`/`setEmail`, ...) nhanh chóng trở nên dài dòng khi form có nhiều hơn vài trường. Mẫu phổ biến: gộp các trường vào **một object state**, và dùng thuộc tính `name` của input để biết cần cập nhật field nào.

```tsx
type FormState = { name: string; email: string; bio: string };

function ProfileForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", bio: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value })); // [name]: computed property name
  }

  return (
    <>
      <input name="name" value={form.name} onChange={handleChange} />
      <input name="email" value={form.email} onChange={handleChange} />
      <textarea name="bio" value={form.bio} onChange={handleChange} />
    </>
  );
}
```

Chìa khóa là `[name]: value` — cú pháp "computed property name" của JavaScript, cho phép dùng giá trị của một biến (`name`, lấy từ `e.target.name`, khớp với thuộc tính HTML `name="..."` bạn đặt trên mỗi input) làm **tên** thuộc tính trong object, thay vì phải viết cứng tên đó ra. Nhờ vậy một hàm `handleChange` duy nhất phục vụ được mọi trường, miễn là thuộc tính `name` của input khớp đúng tên field trong object state.

**Phải thuộc:** luôn dùng updater function (`setForm((prev) => ...)`, không phải `setForm({ ...form, ... })`) khi cập nhật một object state dựa trên giá trị cũ của chính nó — lý do giống hệt với mọi state khác: state là snapshot, đọc biến `form` ngoài updater có thể là giá trị cũ nếu có nhiều cập nhật xếp hàng liên tiếp.

## Khi nào vài trường local là đủ, khi nào cần thư viện

Mẫu `useState` + `onChange` ở trên xử lý tốt phần lớn form nhỏ: ô tìm kiếm, form đăng nhập hai trường, một ô lọc. Cân nhắc chuyển sang React Hook Form (xem [Bài 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md)) khi gặp bất kỳ dấu hiệu nào sau:

- Form có nhiều hơn khoảng năm, sáu trường, và viết tay quy tắc validate cho từng trường (bắt buộc, định dạng email, độ dài tối thiểu) bắt đầu lặp lại và dễ sai sót.
- Mỗi lần gõ một ký tự ở một trường, toàn bộ component form re-render (vì state nằm chung một object ở component cha) — form càng lớn, chi phí vẽ lại càng đáng kể dù React thường vẫn đủ nhanh cho form cỡ vừa.
- Cần hiển thị lỗi theo từng trường, theo thời điểm (khi gõ xong, khi rời khỏi trường, hay chỉ khi submit) một cách nhất quán trên nhiều form khác nhau trong cùng ứng dụng.
- Cần đồng bộ kiểu dữ liệu của form với kiểu dữ liệu gửi lên API (đó là việc Zod đảm nhiệm cùng React Hook Form).

**Phải thuộc:** không có ngưỡng số trường cứng nhắc nào — nguyên tắc là nhận ra dấu hiệu "mã validate thủ công đang lặp lại" hoặc "hiệu năng gõ phím bắt đầu đáng chú ý" thì đó là lúc đổi công cụ, không phải đổi ngay từ form đầu tiên.

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Thiếu `onChange` khi có `value` | Input "đóng băng", gõ không hiện | Luôn đi kèm `value` với `onChange` |
| `setForm({ ...form, [name]: value })` khi có nhiều `setForm` xếp hàng | Mất dữ liệu của lần cập nhật trước | Dùng updater `setForm((prev) => ...)` |
| Thuộc tính `name` của input không khớp tên field trong state | `[name]: value` ghi vào sai key, tạo field rác | Đặt `name="..."` khớp đúng tên trong object state |
| Validate thủ công cho form lớn, nhiều trường | Code lặp lại, dễ sót trường hợp | Chuyển sang React Hook Form + Zod |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. "Controlled input" nghĩa là gì, và vì sao cần cả `value` lẫn `onChange`?

**Gợi ý suy luận:**
- Nếu chỉ có `value` mà không có `onChange`, khi bạn gõ phím thì state có đổi không? React có render lại input với giá trị mới không?
- Ai đang thật sự "giữ" giá trị hiển thị trên input: DOM tự nhớ, hay component?

**Lập luận:** Controlled nghĩa là React state là nguồn sự thật duy nhất cho giá trị input; input chỉ hiển thị đúng những gì state đang có. `onChange` là đường duy nhất để đưa thao tác gõ phím của người dùng vào lại state; thiếu nó, gõ phím tạo ra giá trị tạm trong DOM nhưng state không đổi, nên ở lần render kế tiếp React vẫn ép input hiển thị đúng giá trị cũ trong state — nhìn như ô nhập bị khóa cứng.

**Đáp án ngắn:** Controlled = state quyết định giá trị hiển thị; cần `onChange` để đồng bộ thao tác gõ phím của người dùng ngược lại vào state, nếu không input sẽ không phản hồi gõ phím.

**Nhớ:** xem phần "Input có kiểm soát (controlled), dựng từ đầu".

### 2. Mẫu `[name]: value` trong một handler `onChange` dùng chung cho nhiều trường hoạt động nhờ cơ chế gì?

**Gợi ý suy luận:**
- `e.target.name` lấy giá trị từ đâu trên input?
- JavaScript có cho phép dùng giá trị của một biến làm tên thuộc tính khi tạo object không?

**Lập luận:** Mỗi input được đặt thuộc tính HTML `name="..."` khớp với tên field trong state. Trong handler, `e.target.name` đọc đúng chuỗi đó. Cú pháp `{ [name]: value }` của JavaScript (computed property name) dùng giá trị của biến `name` làm tên thuộc tính thay vì viết cứng, nên cùng một hàm cập nhật đúng field tương ứng với bất kỳ input nào gọi nó.

**Đáp án ngắn:** Nhờ thuộc tính `name` trên input khớp với tên field, và cú pháp computed property name `[bien]: gia_tri` của JavaScript cho phép tạo key object động từ giá trị biến đó.

**Nhớ:** xem phần "Nhiều trường, một handler".

### 3. Khi nào nên chuyển từ `useState` thủ công sang một thư viện quản lý form?

**Gợi ý suy luận:**
- Nếu một form có mười trường, mỗi trường cần ít nhất một quy tắc validate, viết tay có còn gọn không?
- Hiệu năng gõ phím có bị ảnh hưởng nếu toàn bộ form re-render mỗi ký tự, với form rất lớn?

**Lập luận:** `useState` thủ công hoàn toàn ổn với form nhỏ. Tín hiệu nên đổi công cụ là khi logic validate bắt đầu lặp lại giữa các trường hoặc giữa các form khác nhau trong ứng dụng, khi cần hiển thị lỗi nhất quán theo nhiều thời điểm khác nhau, hoặc khi form đủ lớn mà chi phí re-render mỗi ký tự trở nên đáng chú ý.

**Đáp án ngắn:** Khi validate thủ công lặp lại/dễ sai, khi cần quản lý lỗi nhất quán trên nhiều form, hoặc khi form đủ lớn để hiệu năng re-render đáng chú ý — không phải theo một ngưỡng số trường cố định.

**Nhớ:** xem phần "Khi nào vài trường local là đủ, khi nào cần thư viện", và [Bài 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md) cho React Hook Form + Zod.

Tiếp theo: [Bài 20: Bản đồ hệ sinh thái React](/go?p=09-React%2Feasy%2Flt-20-ban-do-he-sinh-thai-react.md).
