# Lý thuyết 24: Props vs State

Bài này cần nắm [Bài 1](/go?p=09-React%2Feasy%2Flt-01-tu-duy-react-render.md) (render là một hàm thuần của props và state) và [Bài 2](/go?p=09-React%2Feasy%2Flt-02-hooks-co-ban.md) (`useState`).

## Hai nguồn dữ liệu, hai chủ sở hữu khác nhau

Mọi thứ một component hiển thị đều bắt nguồn từ đúng hai nơi: **props** (dữ liệu component cha đưa xuống) và **state** (dữ liệu component tự giữ và tự đổi). Nhầm hai thứ này — sao chép props vào state, hay sửa trực tiếp một prop — là nguồn bug kinh điển bậc nhất của người mới học React.

| | Props | State |
|---|---|---|
| Ai sở hữu | Component cha | Chính component đó |
| Ai được sửa | Chỉ cha (bằng cách render lại component con với props mới) | Chỉ component đó (bằng `setState`) |
| Thay đổi được từ bên trong không? | Không, chỉ đọc (read-only) | Có, qua hàm `set` |
| Khi đổi | Component tự render lại khi cha truyền props mới | Gọi `setState` thì component tự render lại |
| Tồn tại ở đâu | Không "thuộc về" component, chỉ là tham số đầu vào | Gắn với một lần mount cụ thể của component |

**Tóm tắt:**

- Props là dữ liệu component cha đưa xuống, chỉ đọc; state là dữ liệu component tự giữ và tự đổi bằng hàm `set` của chính nó.
- Không bao giờ sửa trực tiếp một prop; muốn đổi giá trị hiển thị thì cha phải render lại component con với props mới.
- `useState(props.x)` chỉ lấy giá trị ban đầu của props ở lần mount; props đổi sau đó không tự đồng bộ vào state.
- Một giá trị tính được từ state hoặc props khác (ví dụ tổng, chuỗi đã format) không nên là state riêng — tính thẳng trong lúc render.
- "Controlled" (React state giữ giá trị) và "uncontrolled" (DOM tự giữ giá trị) là hai cách áp dụng đúng phân biệt props/state cho một ô nhập liệu.

## Props là input chỉ đọc

```tsx
type CardProps = {
  title: string;
  children: React.ReactNode;
};
function Card({ title, children }: CardProps) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

`Card` không được tự ý đổi `title` hay `children` — đó là dữ liệu của component cha. Nếu `Card` muốn "sửa" `title`, cách đúng là gọi một callback prop (ví dụ `onTitleChange`) để cha tự đổi giá trị nó truyền xuống ở lần render sau, chứ không gán trực tiếp vào tham số `title`.

## Bẫy kinh điển: sao chép props vào state

```tsx
// Sai: copy props vào state lúc khởi tạo
function PriceTag({ price }: { price: number }) {
  const [displayPrice, setDisplayPrice] = useState(price); // chỉ chạy lần mount đầu
  // ...
}
```

**Nền tảng:** Giá trị truyền vào `useState(...)` chỉ được dùng đúng một lần, ở lần render đầu tiên (mount). Nếu sau đó `price` đổi ở component cha và cha render lại `PriceTag` với `price` mới, `displayPrice` **không** tự cập nhật theo — nó vẫn giữ giá trị cũ từ lần mount, vì `useState` không "theo dõi" tham số của nó ở các lần render sau.

```tsx
// Đúng: dùng thẳng props, không copy vào state
function PriceTag({ price }: { price: number }) {
  return <span>{price.toLocaleString()}đ</span>;
}
```

Nếu thực sự cần "reset" state khi props đổi (ví dụ state nội bộ của một form cần làm mới khi chuyển sang chỉnh sửa bản ghi khác), cách đúng là đổi `key` của component để React mount lại từ đầu, không phải cố đồng bộ bằng tay trong effect.

**Phải thuộc:** state chỉ lấy giá trị ban đầu từ props ở lần mount, không tự đồng bộ khi props đổi sau đó; dùng trực tiếp props khi có thể, hoặc đổi `key` để reset toàn bộ state nếu cần làm mới theo props.

## Controlled và uncontrolled: props/state áp dụng cho một ô nhập

Ví dụ rõ nhất về ranh giới props/state là một ô input: giá trị của nó có thể do **React state giữ** (controlled) hoặc do **chính DOM giữ** (uncontrolled).

| | Controlled | Uncontrolled |
|---|---|---|
| Nguồn sự thật | State React (`value` + `onChange`) | DOM (đọc qua ref hoặc `FormData`) |
| Render mỗi lần gõ | Có | Không |
| Validate tức thời, format, sync nhiều ô | Dễ | Khó |
| Hiệu năng form lớn | Kém hơn | Tốt hơn |
| Giá trị khởi tạo | `value` | `defaultValue` |

```tsx
// Controlled
const [q, setQ] = useState("");
<input value={q} onChange={e => setQ(e.target.value)} />;

// Uncontrolled
<input name="q" defaultValue="" />; // đọc bằng new FormData(form) khi submit
```

**Phải thuộc:** Controlled: React state giữ giá trị (`value` + `onChange`), render mỗi lần gõ, dễ validate và format. Uncontrolled: DOM giữ giá trị (`defaultValue`, đọc qua ref hoặc `FormData`), nhẹ hơn cho form lớn. Không đổi một ô từ uncontrolled sang controlled giữa chừng (value từ `undefined` thành chuỗi). Dựng một input controlled từ đầu, từng bước, xem [Events](/go?p=09-React%2Feasy%2Flt-30-events.md) và [Forms cơ bản](/go?p=09-React%2Feasy%2Flt-31-forms-co-ban.md).

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Sao chép props vào state (`useState(props.x)`) | State không theo props khi đổi | Dùng trực tiếp props, hoặc đổi `key` để reset |
| Sửa trực tiếp một prop | Vi phạm nguyên tắc chỉ đọc, bug khó dò | Gọi callback để cha tự đổi props truyền xuống |
| Value của input là `undefined` rồi thành chuỗi | Cảnh báo controlled/uncontrolled | Khởi tạo chuỗi rỗng |
| Lưu giá trị tính được (derived) làm state riêng | Hai nguồn sự thật lệch nhau | Tính thẳng trong render từ props/state gốc |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Vì sao không nên `useState(props.x)`?

**Gợi ý suy luận:**
- Giá trị truyền vào `useState` được dùng ở lần render nào?
- Props đổi ở lần render sau thì state có tự đổi theo không?

**Lập luận:** Giá trị khởi tạo chỉ dùng ở lần mount. Props đổi sau đó không cập nhật state, nên hai nguồn sự thật lệch nhau. Dùng props trực tiếp, hoặc nếu muốn reset khi props đổi thì đổi `key`.

**Đáp án ngắn:** State chỉ lấy giá trị ban đầu, không sync khi props đổi; dùng props trực tiếp hoặc reset bằng key.

**Nhớ:** tránh sao chép props vào state.

### 2. Controlled và uncontrolled khác gì, chọn khi nào?

**Gợi ý suy luận:**
- Giá trị của ô input được giữ ở đâu: state React hay chính DOM?
- Nếu cần validate hoặc format ngay mỗi lần gõ thì cần React biết giá trị ở lúc nào?
- Form rất lớn thì mỗi lần gõ render lại có đắt không?

**Lập luận:** Controlled: React giữ giá trị trong state, mỗi thay đổi đi qua React, nên dễ validate, format, phản hồi tức thời, nhưng mỗi lần gõ có thể render. Uncontrolled: DOM giữ giá trị, đọc khi cần (ref hoặc khi submit), nhẹ hơn cho form lớn. Chọn theo việc có cần phản hồi theo từng lần gõ không.

**Đáp án ngắn:** Controlled: React giữ giá trị, tiện validate/format; uncontrolled: DOM giữ, nhẹ hơn cho form lớn. Chọn theo nhu cầu phản hồi tức thời.

**Nhớ:** ai giữ nguồn sự thật của giá trị.

Tiếp theo: [Bài 25: Composition](/go?p=09-React%2Feasy%2Flt-25-composition.md).
