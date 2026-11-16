# Lý thuyết 27: Render Props

Bài này cần nắm [Composition](/go?p=09-React%2Feasy%2Flt-25-composition.md) trước.

## Render prop là gì?

Render prop: component nhận một hàm trả JSX để người dùng quyết định hiển thị. Thay vì component tự vẽ UI cố định, nó chỉ lo phần logic (theo dõi vị trí chuột, kết quả fetch, trạng thái một animation) rồi giao toàn quyền "vẽ gì với dữ liệu đó" cho nơi gọi nó.

```tsx
function MouseTracker({ children }: { children: (pos: { x: number; y: number }) => React.ReactNode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>{children(pos)}</div>;
}
// <MouseTracker>{({ x, y }) => <p>{x},{y}</p>}</MouseTracker>
```

**Tóm tắt:**

- Render prop là một component nhận một hàm (thường qua `children`) trả về JSX, để nơi gọi tự quyết định hiển thị gì với dữ liệu component đó tạo ra.
- Component giữ logic (theo dõi vị trí chuột, fetch, trạng thái animation...); hàm được truyền vào chỉ lo phần hiển thị.
- Custom hook ngày nay là lựa chọn mặc định cho việc chia sẻ **logic** không cần UI, vì không thêm lớp component bọc ngoài.
- Render props vẫn phổ biến ở thư viện khi cần vừa chia sẻ logic **vừa** giao quyền render từng item (ví dụ virtualized list, nơi thư viện quyết định item nào đang hiển thị nhưng để người dùng tự vẽ từng item).
- So với compound components (ghép nhiều component qua Context), render prop chỉ có một component với một "khe" nhận hàm render.

So sánh các pattern chia sẻ logic/UI với nhau:

| Pattern | Dùng khi | Ghi chú |
|---|---|---|
| Custom hook | Tái sử dụng **logic** không cần UI | Lựa chọn mặc định hiện nay, thay phần lớn render props và HOC |
| Render props | Cần chia sẻ logic **và** giao quyền render, hoặc item render trong list virtualization | Vẫn phổ biến ở thư viện (virtualized list, Downshift) |
| HOC | Hiếm, thư viện cũ (`connect`, `withRouter`) | Xem [Higher-Order Components](/go?p=09-React%2Feasy%2Flt-28-higher-order-components.md) |
| Compound components | API nhiều phần ghép nhau | Cần Context, xem [Compound Components](/go?p=09-React%2Feasy%2Flt-26-compound-components.md) |

**Phải thuộc:** render props phù hợp khi cần để nơi dùng quyết định phần render dựa trên dữ liệu nội bộ của component; custom hook gọn hơn khi chỉ cần chia sẻ logic mà không cần giao quyền render UI.

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Lồng nhiều render prop vào nhau ("callback hell" kiểu JSX) | Code thụt lề sâu, khó đọc | Chuyển logic sang custom hook nếu không cần giao quyền render |
| Hàm render tạo mới mỗi lần cha render | Mất tác dụng `memo` ở bên trong nếu có | Ổn định hàm bằng `useCallback` nếu cần |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Custom hook so với render props: chọn thế nào?

**Gợi ý suy luận:**
- Cần chia sẻ logic có state: cách nào ít thêm lớp bọc nhất?
- Khi nào cần giao quyền quyết định "render gì" cho nơi dùng, thay vì chỉ cần dữ liệu?

**Lập luận:** Custom hook tách logic ra mà không thêm lớp component, nên gọn nhất cho chia sẻ logic thuần túy. Render props phù hợp khi, ngoài logic, bạn còn muốn để nơi dùng tự quyết định phần render (ví dụ thư viện virtualized list biết item nào cần hiển thị nhưng không biết nơi gọi muốn vẽ item đó như thế nào).

**Đáp án ngắn:** Hook chia sẻ logic gọn nhất, không thêm lớp bọc; render props khi cần giao quyền render ngoài việc chia sẻ logic.

**Nhớ:** ưu tiên hook trừ khi cần giao quyền render.

Tiếp theo: [Bài 28: Higher-Order Components](/go?p=09-React%2Feasy%2Flt-28-higher-order-components.md).
