# Lý thuyết 34: Custom Hook (Creating Custom Hooks)

Bài này cần nắm [Bài 2](/go?p=09-React%2Feasy%2Flt-02-hooks-co-ban.md) trước.

## Custom hook là gì?

Custom hook là hàm bắt đầu bằng `use` và gọi các hook khác. Nó tách một đoạn logic có state ra khỏi component để tái sử dụng — nhưng mỗi lần gọi tạo **state riêng** của chính lần gọi đó (hook chia sẻ **logic**, không chia sẻ **state**: hai component cùng gọi `useDebouncedValue` thì có hai state debounce hoàn toàn độc lập).

```tsx
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initial;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue] as const;
}
```

**Tóm tắt:**

- Custom hook là hàm tên bắt đầu bằng `use`, gọi các hook khác bên trong để tái sử dụng logic có state.
- Hook chia sẻ **logic**, không chia sẻ **state**: mỗi lần gọi custom hook tạo một state hoàn toàn độc lập cho lần gọi đó.
- Một custom hook tốt có một trách nhiệm duy nhất, tên nói rõ ý định, nhận tham số tối thiểu và trả về giá trị dễ dùng (tuple cho ít giá trị, object cho nhiều).
- Phải dọn dẹp trong cleanup nếu có side effect (timer, subscription), và không đụng `window`/DOM trong phần chạy ngay lúc render để hỗ trợ SSR.
- Không nên tự "bọc lifecycle" (kiểu `useMount`) vì che mất bản chất đồng bộ dependency của effect, dễ gây hiểu lầm khi đọc lại code sau này.

Nguyên tắc thiết kế:

| Nguyên tắc | Lý do |
|---|---|
| Một hook một trách nhiệm, tên nói rõ ý định (`useDebouncedValue`, không phải `useStuff`) | Dễ đọc, dễ test |
| Nhận tham số tối thiểu, trả về tuple (ít giá trị) hoặc object (nhiều) | API dùng gọn |
| Giữ tham chiếu ổn định cho hàm trả về khi cần (`useCallback`) | Người dùng đưa vào dependency an toàn |
| Dọn dẹp trong cleanup | Không rò rỉ |
| Không bọc lifecycle (`useMount`) | Che đi bản chất sync của effect |
| Hỗ trợ SSR: không đụng `window` trong render | Tránh crash và mismatch |
| Kiểu TS chặt, generic khi cần (xem [TypeScript nâng cao](/go?p=11-Frontend-Core%2Flt-02-typescript-nang-cao.md)) | Trải nghiệm dev |

**Phải thuộc:** custom hook chia sẻ logic, không chia sẻ state — mỗi lần một component gọi cùng một custom hook, nó nhận về một state riêng, độc lập hoàn toàn với mọi lần gọi khác, kể cả khi hai component đang gọi cùng một hook cùng lúc.

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Custom hook "chia sẻ state" ngầm | Hiểu sai: mỗi call state riêng | Dùng Context hoặc store nếu thực sự cần chia sẻ state |
| Đụng `window`/`document` ngay trong thân hook (không trong effect) | Crash khi render trên server (SSR) | Chỉ đụng DOM/`window` bên trong `useEffect` |
| Tên hook không bắt đầu bằng `use` | ESLint rule-of-hooks không nhận diện được, mất kiểm tra tĩnh | Luôn đặt tên bắt đầu bằng `use` |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Ô tìm kiếm gọi API mỗi phím. Thiết kế `useDebounce` đúng cách?

**Gợi ý suy luận:**
- Muốn chờ người dùng ngừng gõ thì cần hẹn giờ rồi hủy hẹn khi giá trị đổi. Hủy ở đâu?
- Effect chạy lại khi nào?

**Lập luận:** Vì mỗi lần `value` đổi ta hẹn một timeout cập nhật giá trị debounce, và cleanup của effect hủy timeout cũ, nên chỉ lần cuối sau khoảng chờ mới có hiệu lực. Dependency gồm `value` và `delay` để effect chạy lại đúng khi một trong hai đổi.

**Đáp án ngắn:** Dùng `setTimeout` trong effect, cleanup gọi `clearTimeout`, dependency là `value` và `delay`.

**Nhớ:** Cleanup là cơ chế hủy lần hẹn cũ.

### 2. Hai component cùng gọi `useLocalStorage("theme", "light")`. Chúng có chia sẻ cùng một state không?

**Gợi ý suy luận:**
- Custom hook chia sẻ logic hay chia sẻ state giữa các lần gọi?
- Mỗi lần gọi `useState` bên trong hook tạo ra state gắn với ai?

**Lập luận:** Vì hook chỉ là một hàm chạy logic bên trong component gọi nó, mỗi lần gọi tạo một `useState` riêng gắn với đúng component đó. Hai component gọi cùng một custom hook với cùng tham số vẫn có hai state độc lập trong bộ nhớ React — chúng chỉ tình cờ đọc/ghi cùng một key trong `localStorage`, nên có thể đồng bộ giá trị **qua localStorage**, nhưng state React của chúng không tự đồng bộ real-time với nhau (component kia không tự render lại khi component này gọi `setValue`, trừ khi tự thêm cơ chế lắng nghe sự kiện `storage`).

**Đáp án ngắn:** Không — mỗi lần gọi custom hook tạo state React riêng; chúng chỉ gián tiếp "gặp nhau" qua cùng một key `localStorage`, không tự động đồng bộ qua lại.

**Nhớ:** hook chia sẻ logic, không chia sẻ state.

Tiếp theo: [Bài 35: Hooks Best Practices](/go?p=09-React%2Fmedium%2Flt-35-hooks-best-practices.md).
