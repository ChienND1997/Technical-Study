# Lý thuyết 28: Higher-Order Components

Bài này cần nắm [Composition](/go?p=09-React%2Feasy%2Flt-25-composition.md) trước.

## HOC là gì?

Một **HOC (higher-order component)** là một hàm nhận một component và trả về một component mới, có thêm khả năng — giống `Array.map` nhận một hàm và trả về hàm khác, nhưng ở đây "giá trị" được bọc là cả một component. Đây là pattern phổ biến trước khi có hooks (ví dụ `connect` của Redux, `withRouter` của React Router cũ), nay phần lớn được thay bằng custom hook vì hook không thêm một lớp component bọc ngoài.

```tsx
function withLogging<P extends object>(Wrapped: React.ComponentType<P>) {
  return function Logged(props: P) {
    useEffect(() => {
      console.log("mounted:", Wrapped.name);
      return () => console.log("unmounted:", Wrapped.name);
    }, []);
    return <Wrapped {...props} />;
  };
}

const LoggedButton = withLogging(Button);
```

**Tóm tắt:**

- HOC là hàm nhận một component và trả về component mới có thêm khả năng, không sửa component gốc.
- Mỗi lớp HOC bọc thêm một component vào cây, nên nhiều HOC lồng nhau tạo ra nhiều tầng "wrapper hell" khó debug trong React DevTools.
- Hai lỗi kinh điển khi tự viết HOC: quên forward `ref` xuống component gốc, và quên hoist các static method/property của component gốc sang component bọc.
- Custom hook thay thế được phần lớn trường hợp dùng HOC ngày nay vì không thêm lớp component, dễ compose và dễ đọc hơn trong DevTools.
- HOC vẫn còn gặp trong thư viện cũ hơn (`connect` của Redux, `withRouter` của React Router thế hệ trước); viết mới hiếm khi nên chọn pattern này.

## Hai bẫy kinh điển khi tự viết HOC

**Bẫy 1 — quên forward ref:** Component bọc (`Logged` ở ví dụ trên) là một component **mới**; nếu nơi gọi gắn `ref` vào `LoggedButton`, ref đó trỏ vào `Logged`, không trỏ được xuống DOM node thật bên trong `Button`, vì ref không tự "xuyên" qua các lớp component như props thường.

```tsx
// Sửa: bọc thêm forwardRef (React 18) hoặc nhận ref như một prop bình thường (React 19)
function withLogging<P extends object>(Wrapped: React.ComponentType<P>) {
  return forwardRef<HTMLButtonElement, P>(function Logged(props, ref) {
    useEffect(() => { /* ... */ }, []);
    return <Wrapped {...props} ref={ref} />;
  });
}
```

**Bẫy 2 — quên hoist static:** Nếu `Wrapped` có static method/property riêng (`Wrapped.someStatic`), component mới `Logged` không tự có — nó là một hàm khác hoàn toàn. Thư viện `hoist-non-react-statics` tồn tại chính để giải quyết việc này cho HOC viết tay.

**Phải thuộc:** mỗi lớp HOC bọc thêm một component thật vào cây (xem được trong React DevTools dưới dạng nhiều tầng lồng nhau — "wrapper hell"), và ref không tự xuyên qua các lớp đó nên phải forward thủ công; đây là hai lý do chính khiến custom hook (không thêm lớp nào) được ưu tiên hơn ngày nay.

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Quên forward ref qua lớp HOC | Ref gắn vào `LoggedButton` không trỏ tới DOM node thật | `forwardRef` hoặc nhận `ref` như prop (React 19) |
| Quên hoist static method/property | Component bọc thiếu static mà component gốc có | Copy thủ công hoặc dùng `hoist-non-react-statics` |
| Lồng nhiều HOC | "Wrapper hell", khó debug trong DevTools, đặt tên hiển thị rối | Ưu tiên custom hook khi không bắt buộc cần một component bọc |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Vì sao custom hook phần lớn đã thay thế HOC, dù cả hai đều "chia sẻ logic"?

**Gợi ý suy luận:**
- HOC trả về gì — một hàm, hay một component mới nằm trong cây render?
- Mỗi lớp HOC lồng nhau có thêm một tầng component thật không? Hook có thêm tầng nào không?
- `ref` có tự "xuyên" qua một lớp component bọc ngoài để tới DOM node bên trong không?

**Lập luận:** HOC trả về một component mới, nên mỗi lớp HOC lồng nhau thêm một tầng thật vào cây — nhiều HOC chồng lên nhau tạo ra nhiều tầng khó debug trong DevTools ("wrapper hell"). Vì là một lớp component riêng, `ref` không tự xuyên qua nó để tới DOM node của component gốc, phải `forwardRef` thủ công. Custom hook chỉ là một hàm JavaScript chạy bên trong component gọi nó, không tạo thêm tầng nào trong cây và không gặp vấn đề ref, nên gọn và dễ debug hơn.

**Đáp án ngắn:** HOC thêm một lớp component thật mỗi lần bọc (gây wrapper hell và vấn đề forward ref); hook không thêm lớp nào nên gọn và dễ debug hơn.

**Nhớ:** HOC = bọc thêm component; hook = chỉ là một hàm chạy logic.

Tiếp theo: [Bài 29: Component Lifecycle](/go?p=09-React%2Feasy%2Flt-29-component-lifecycle.md).
