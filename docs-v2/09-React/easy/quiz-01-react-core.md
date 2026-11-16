# Trắc nghiệm chuyên sâu: React Core & Hooks

## 1. Cơ chế State và Lifecycle Hooks

### Câu 1: Khi gọi liên tiếp `setCount(count + 1)` 3 lần trong một event handler (với `count = 0`), giá trị của `count` tăng lên bao nhiêu sau khi component re-render?
- [x] Tăng lên 1, vì trong cùng một lượt render, biến `count` hoạt động như một snapshot cố định và React tự động batching các lệnh cập nhật state lại để render một lần.
- [ ] Tăng lên 3, vì mỗi lần gọi `setState` sẽ kích hoạt cập nhật đồng bộ ngay lập tức và truyền kết quả mới sang câu lệnh tiếp theo.
- [ ] Tăng lên 0, vì React sẽ phát hiện trùng lặp state liên tiếp và hủy bỏ toàn bộ chuỗi cập nhật đó như một vòng lặp vô hạn.
- [ ] Tăng lên 2, vì React áp dụng cơ chế debounce chỉ nhận lệnh gọi đầu tiên và lệnh gọi cuối cùng trong cùng một tick sự kiện.

> **Giải thích:** State trong một lần render của React hoạt động như một snapshot cố định. Ba lần gọi `setCount(count + 1)` với `count = 0` đều tương đương với `setCount(0 + 1)`. Muốn tăng lên 3, bạn phải dùng dạng updater function: `setCount(prev => prev + 1)`.

### Câu 2: Hàm dọn dẹp (cleanup function) trả về trong callback của `useEffect` được thực thi vào thời điểm nào?
- [x] Được gọi trước khi effect của lần render tiếp theo thực thi (nếu dependencies thay đổi), và được gọi khi component unmount khỏi DOM.
- [ ] Được gọi ngay lập tức sau khi hàm callback của effect chạy xong trong cùng một lần render để dọn dẹp bộ nhớ tạm.
- [ ] Chỉ được gọi duy nhất một lần khi toàn bộ ứng dụng bị đóng tab hoặc người dùng refresh lại trình duyệt.
- [ ] Được gọi đồng bộ trước khi cây DOM thực tế được trình duyệt cập nhật các thay đổi từ Virtual DOM.

> **Giải thích:** Cleanup function chạy trước mỗi lần re-run của effect kế tiếp (để hủy subscription/timer/request cũ của lần render trước) và chạy lần cuối khi component unmount khỏi DOM để ngăn chặn rò rỉ bộ nhớ (memory leaks).

### Câu 3: Điểm khác biệt cốt lõi giữa `useMemo` và `useCallback` trong việc tối ưu hóa hiệu năng là gì?
- [x] `useMemo` lưu trữ (cache) kết quả tính toán trả về của một hàm; còn `useCallback` lưu trữ chính tham chiếu của hàm đó (function reference) qua các lần re-render.
- [ ] `useMemo` tự động theo dõi và cập nhật khi DOM thay đổi; còn `useCallback` chỉ kích hoạt lại khi người dùng click vào giao diện.
- [ ] `useMemo` ngăn chặn re-render cho chính component hiện tại; còn `useCallback` chỉ có tác dụng khi truyền hàm xuống component cha.
- [ ] `useMemo` thực thi bất đồng bộ ở giai đoạn idle của trình duyệt; còn `useCallback` bắt buộc phải thực thi đồng bộ ngay lúc render.

> **Giải thích:** `useCallback(fn, deps)` thực chất là cú pháp rút gọn của `useMemo(() => fn, deps)`. Mục đích chính của `useCallback` là giữ nguyên địa chỉ tham chiếu của hàm khi truyền xuống component con đã được tối ưu hóa bằng `React.memo`, tránh con re-render lãng phí.

### Câu 4: Vì sao "Rules of Hooks" của React nghiêm cấm việc gọi Hooks bên trong vòng lặp (`for`), câu lệnh điều kiện (`if`), hoặc hàm lồng nhau?
- [x] Vì React quản lý state và effects của Hooks dựa trên thứ tự gọi tuần tự (call order) trong danh sách liên kết của Fiber node; thay đổi thứ tự gọi giữa các render sẽ làm lệch state sang Hook khác.
- [ ] Vì Virtual DOM không thể phân tích cây cú pháp trừu tượng (AST) nếu component có chứa các khối lệnh điều kiện phức tạp.
- [ ] Vì JavaScript Engine không cho phép tạo lexical scope mới bên trong các hàm functional component của React.
- [ ] Vì Hooks chạy trong Web Worker độc lập, việc gọi có điều kiện sẽ làm gián đoạn kênh truyền dữ liệu PostMessage giữa các thread.

> **Giải thích:** Quy tắc "Rules of Hooks" bắt nguồn từ kiến trúc Fiber của React: React không phân biệt hooks theo tên mà theo chỉ số thứ tự thực thi tuần tự. Việc đặt hook trong `if` làm thay đổi thứ tự gọi giữa các render, làm hỏng con trỏ state tương ứng.

### Câu 5: Trong tình huống nào nên sử dụng `useRef` thay vì `useState`?
- [x] Khi cần lưu trữ một giá trị có thể thay đổi (mutable value) qua các lần render mà việc thay đổi giá trị đó KHÔNG cần kích hoạt component re-render lại.
- [ ] Khi cần chia sẻ dữ liệu chung cho nhiều component con cháu mà không muốn truyền qua props.
- [ ] Khi muốn dữ liệu có tính phản ứng hai chiều (two-way binding) tự động với các input form.
- [ ] Khi cần cache lại kết quả của một phép tính toán phức tạp tốn nhiều chu kỳ CPU để tái sử dụng.

> **Giải thích:** Thay đổi `ref.current = newVal` là thao tác gán thuộc tính thuần túy trong JavaScript, hoàn toàn không thông báo cho React scheduler nên không gây re-render component. Thích hợp cho: lưu timer ID, cờ trạng thái kiểm soát lượt render đầu tiên, hoặc tham chiếu element DOM (`<input ref={inputRef} />`).

### Câu 6: Trong môi trường phát triển (Development Mode), tại sao `useEffect` và hàm component của React 18+ (khi bọc trong `StrictMode`) lại thực thi 2 lần khi vừa mount?
- [x] React cố tình kích hoạt chu kỳ mount -> unmount -> remount giả lập để kiểm tra xem effect có hàm cleanup đối ngẫu chuẩn xác và code có tuân thủ tính bất biến (purity) hay không.
- [ ] Do cơ chế Hot Module Replacement (HMR) của công cụ build tự động kích hoạt reload component khi có kết nối WebSocket mới.
- [ ] Do React thực hiện render dự phòng trên một luồng nền để đo lường FPS và thời gian tải trang.
- [ ] Do trình duyệt tự động gửi thêm một request preflight OPTIONS để kiểm tra tính hợp lệ của cây Virtual DOM.

> **Giải thích:** StrictMode kích hoạt cơ chế double-invoking có chủ đích trong môi trường development. Nó kiểm tra xem hiệu ứng có tuân thủ đúng quy tắc "Đối ngẫu" hay không: Kết nối socket -> Ngắt kết nối; Lắng nghe sự kiện -> Hủy lắng nghe. Ở môi trường Production, component chỉ chạy đúng 1 lần bình thường.

### Câu 7: Điểm khác biệt quyết định giữa `useLayoutEffect` và `useEffect` là gì?
- [x] `useLayoutEffect` thực thi đồng bộ ngay sau khi các đột biến DOM được áp dụng nhưng TRƯỚC KHI trình duyệt vẽ (paint) màn hình, thích hợp để đo kích thước và chỉnh vị trí DOM chống giật hình (flicker).
- [ ] `useLayoutEffect` chỉ chạy được trong các Class Component cũ, còn `useEffect` dùng riêng cho Functional Component.
- [ ] `useLayoutEffect` chỉ thực thi trên môi trường Server-Side Rendering (SSR), còn `useEffect` chỉ chạy trên trình duyệt client.
- [ ] `useLayoutEffect` không hỗ trợ mảng phụ thuộc (dependency array), nó luôn luôn chạy lại sau mỗi lần render.

> **Giải thích:** Luồng vẽ của React: State đổi -> Render VDOM -> Cập nhật DOM thực tế -> `useLayoutEffect` chạy đồng bộ (chặn paint) -> Trình duyệt vẽ ra màn hình (Paint) -> `useEffect` chạy bất đồng bộ. Nếu bạn cần đo kích thước phần tử và thay đổi vị trí ngay lập tức, `useLayoutEffect` sẽ ngăn người dùng nhìn thấy cảnh phần tử bị giật vị trí (flickering).

### Câu 8: Khi bọc một component bằng `React.memo`, component đó vẫn sẽ bị re-render ngoài ý muốn trong trường hợp nào sau đây?
- [x] Component cha truyền vào một inline arrow function hoặc inline object chưa được bọc bởi `useCallback`/`useMemo`, khiến tham chiếu props thay đổi ở mỗi lần cha re-render.
- [ ] Component con có sử dụng các biến CSS inline style được định nghĩa bằng các giá trị màu sắc tĩnh.
- [ ] Component con được đặt bên trong thẻ `<section>` hoặc `<article>` thay vì thẻ `<div>` truyền thống.
- [ ] Component cha chỉ cập nhật một state nguyên thủy (primitive boolean) không liên quan tới component con.

> **Giải thích:** `React.memo` là Higher-Order Component dùng cho memoization. Mặc định nó so sánh nông (`prevProp === nextProp`). Nếu bạn truyền một inline object `style={{ color: 'red' }}` hoặc inline arrow function `onClick={() => doSomething()}`, mỗi lần cha render sẽ sinh địa chỉ tham chiếu mới, khiến `React.memo` vô tác dụng (cần kết hợp `useCallback`/`useMemo`).

### Câu 9: Điểm hạn chế lớn nhất về hiệu năng của React Context API khi quản lý global state là gì?
- [x] Tất cả các component tiêu thụ (`useContext`) đều bị re-render mỗi khi giá trị Provider thay đổi tham chiếu, ngay cả khi component đó chỉ đọc một trường dữ liệu không hề bị biến đổi.
- [ ] Context chỉ lưu trữ được tối đa 10 biến state trong cùng một Provider, nếu vượt quá sẽ bị tràn ngăn xếp (stack overflow).
- [ ] Context bắt buộc dữ liệu phải là chuỗi JSON, không thể truyền trực tiếp function hoặc các object phức tạp.
- [ ] Dữ liệu trong Context sẽ bị xóa sạch mỗi khi người dùng cuộn chuột quá nhanh trên màn hình.

> **Giải thích:** Không giống như Redux hay Zustand có cơ chế selector lọc state (`useSelector(state => state.user.name)`), React Context kích hoạt re-render toàn bộ các consumer khi object Provider thay đổi tham chiếu. Giải pháp: Tách `UserContext` và `ThemeContext` riêng biệt, hoặc tách `StateContext` và `DispatchContext` độc lập.

### Câu 10: Điểm khác biệt bản chất giữa "Controlled Component" và "Uncontrolled Component" trong React là gì?
- [x] Controlled Component để React quản lý hoàn toàn giá trị của form qua `state` và `onChange` (React là single source of truth); còn Uncontrolled Component để DOM tự lưu giá trị và lấy ra khi cần qua `ref`.
- [ ] Controlled Component bắt buộc phải sử dụng thư viện bên thứ ba như Formik; còn Uncontrolled Component chỉ dùng mã JavaScript thuần.
- [ ] Controlled Component chỉ gửi được dữ liệu dạng URL-encoded; còn Uncontrolled Component mới gửi được JSON lên server.
- [ ] Controlled Component không thể kiểm tra tính hợp lệ (validate) của dữ liệu trước khi người dùng nhấn nút Submit.

> **Giải thích:** Với Controlled Component: `<input value={name} onChange={e => setName(e.target.value)} />`, React là nguồn chân lý duy nhất (Single Source of Truth), cho phép validate dữ liệu theo từng phím bấm. Uncontrolled component: `<input ref={inputRef} />`, dữ liệu nằm trong DOM node, đọc giá trị bằng `inputRef.current.value` khi submit, cú pháp tương tự HTML truyền thống.

### Câu 11: Hook `useReducer` thường được ưu tiên lựa chọn thay cho `useState` khi nào?
- [x] Khi logic state phức tạp, có nhiều nhánh hành vi (actions) làm thay đổi các trường dữ liệu phụ thuộc lẫn nhau, hoặc khi state tiếp theo phụ thuộc mật thiết vào state trước đó.
- [ ] Khi muốn dữ liệu tự động lưu xuống LocalStorage của trình duyệt mỗi khi state thay đổi.
- [ ] Khi muốn component render nhanh hơn mà không cần thông qua giai đoạn đối soát Virtual DOM Diffing.
- [ ] Khi chỉ có một biến cờ boolean đơn giản cần bật/tắt qua lại giữa true và false.

> **Giải thích:** `useReducer(reducer, initialState)` đưa mô hình luồng dữ liệu đơn hướng (tương tự Redux) vào trong component: `(state, action) => newState`. Nó tách rời toàn bộ logic nghiệp vụ cập nhật dữ liệu ra khỏi UI component, giúp code dễ đọc, dễ viết Unit Test và dễ bảo trì khi nghiệp vụ mở rộng.

### Câu 12: Hook `useTransition` trong React 18 mang lại giá trị gì cho trải nghiệm người dùng?
- [x] Cho phép đánh dấu một tác vụ cập nhật state là "Non-urgent" (không khẩn cấp) để React có thể tạm ngắt (interrupt) tiến trình render nặng đó, ưu tiên xử lý tức thì các tương tác gõ phím/click của người dùng.
- [ ] Tự động thêm hiệu ứng CSS transition thời lượng 300ms cho mọi thẻ HTML nằm bên trong component.
- [ ] Trì hoãn việc render component con cho đến khi tất cả các hình ảnh trên trang web đã được tải xuống hoàn tất.
- [ ] Chuyển đổi mã nguồn của component thành một Web Component độc lập có thể tái sử dụng trên các framework khác.

> **Giải thích:** `const [isPending, startTransition] = useTransition()`. Khi người dùng gõ vào ô tìm kiếm: Cập nhật text trong input là tác vụ khẩn cấp (Urgent) chạy ngay; việc lọc và render danh sách 10.000 kết quả được bọc trong `startTransition(() => setList(results))` (Non-urgent). Nếu người dùng gõ tiếp, React sẵn sàng ngắt (interrupt) tiến trình render dở dang để phục vụ phím mới, chống đơ giao diện.

### Câu 13: Trong kiến trúc React Server Components (RSC), điểm khác biệt cốt lõi của Server Component so với Client Component là gì?
- [x] Server Component chỉ chạy trên Server, không đóng gói mã JavaScript của nó vào client bundle (Zero Bundle Size), và có thể truy cập trực tiếp database/filesystem; còn Client Component chạy ở cả hai nơi và hỗ trợ state/interactivity.
- [ ] Server Component chỉ render ra chuỗi HTML tĩnh một lần lúc build time (SSG) và không thể nhận bất kỳ request động nào.
- [ ] Server Component bắt buộc phải được viết bằng ngôn ngữ backend (như Node.js hoặc Python) chứ không dùng JSX.
- [ ] Client Component không thể chứa hoặc render Server Component như một phần tử con bên trong cây giao diện.

> **Giải thích:** Server Components (mặc định trong Next.js App Router) chạy trên server và trả về kết quả dạng luồng JSON đặc biệt mô tả cây giao diện, giúp giảm kích thước file `.js` tải về client. Client Component (có chỉ thị `'use client'`) là nơi duy nhất được sử dụng các API trình duyệt, sự kiện tương tác (`onClick`), và các React Hooks có state (`useState`, `useEffect`).

### Câu 14: Đối với Error Boundary trong React, loại lỗi nào sau đây KHÔNG THỂ bị bắt bởi Error Boundary?
- [x] Lỗi phát sinh bên trong các Event Handlers (ví dụ: `onClick`), lỗi trong các tác vụ bất đồng bộ (`setTimeout`, `fetch`), và lỗi xảy ra trong quá trình Server-Side Rendering.
- [ ] Lỗi phát sinh trong hàm `render()` của các component con trong cây phân cấp.
- [ ] Lỗi xảy ra trong các phương thức vòng đời (lifecycle methods) của các component con.
- [ ] Lỗi `TypeError: Cannot read properties of undefined` xảy ra khi truy cập thuộc tính trong phần JSX của component con.

> **Giải thích:** Error Boundary là Class Component cài đặt `componentDidCatch` hoặc `static getDerivedStateFromError`. Nó hoạt động như một khối `try-catch` bọc quanh cây Virtual DOM. Vì Event Handler chạy sau khi quá trình render đã hoàn tất, lỗi trong `onClick` phải dùng `try-catch` thông thường chứ Error Boundary không can thiệp được.

### Câu 15: Cổng kết nối `createPortal` trong thư viện `react-dom` giải quyết bài toán gì?
- [x] Cho phép render các phần tử con vào một nút DOM thực tế nằm ngoài cây DOM phân cấp của component cha (như `document.body`) trong khi sự kiện (Events) vẫn nổi bọt qua cây component React bình thường.
- [ ] Tách component ra một iframe độc lập để tránh bị xung đột mã nguồn CSS với trang web chính.
- [ ] Cho phép component chia sẻ bộ nhớ Heap trực tiếp với một ứng dụng React khác đang chạy trên cùng trình duyệt.
- [ ] Tự động chuyển đổi các request API bên trong component thành các kết nối Socket hai chiều.

> **Giải thích:** `createPortal(children, domNode)` cực kỳ quan trọng khi xây dựng Modal, Dialog, Tooltip, Hovercard. Nó giúp phần tử thoát khỏi các thẻ cha bị dính thuộc tính CSS `overflow: hidden`, `z-index`, hoặc `transform` mà vẫn giữ nguyên liên kết về mặt React Context và Event Bubbling.

### Câu 16: Thuật toán Reconciliation trong React áp dụng chiến lược giả định (heuristics) nào để đạt độ phức tạp O(n) thay vì O(n³)?
- [x] Hai phần tử có kiểu khác nhau (ví dụ từ `<div>` sang `<span>`) sẽ sinh ra các cây khác nhau (phá hủy và tạo mới); và danh tính của các phần tử trong danh sách được xác định ổn định qua thuộc tính `key`.
- [ ] Luôn so sánh đệ quy từng thuộc tính của tất cả các node trong toàn bộ cây DOM mà không bỏ qua bất kỳ nhánh nào.
- [ ] Giả định rằng không có bất kỳ component nào trong ứng dụng được phép thay đổi cấu trúc sau lần render đầu tiên.
- [ ] Chỉ so sánh các node ở cấp độ gốc (root node) và bỏ qua việc kiểm tra các component con bên dưới.

> **Giải thích:** Thuật toán Reconciliation của React có độ phức tạp O(n) dựa trên 2 giả định thực tế: 1) Hai phần tử có kiểu khác nhau (ví dụ từ `<div>` sang `<span>`) sẽ sinh ra cây khác nhau hoàn toàn (React phá hủy cây cũ và tạo mới); 2) Lập trình viên có thể chỉ định phần tử nào ổn định qua các lần render bằng thuộc tính `key`.

### Câu 17: Bản chất của `SyntheticEvent` trong React là gì và vì sao React lại sử dụng nó?
- [x] Là một đối tượng bao bọc cross-browser chuẩn hóa xung quanh Native Event của trình duyệt, giúp các phương thức và thuộc tính sự kiện hoạt động đồng nhất trên mọi trình duyệt.
- [ ] Là một cơ chế giả lập sự kiện chỉ dùng riêng trong môi trường test (Jest/React Testing Library) để kiểm thử component.
- [ ] Là một luồng dữ liệu phản ứng (Reactive Stream) tự động đồng bộ hóa các sự kiện DOM vào Redux Store.
- [ ] Là một lớp bảo mật ngăn chặn người dùng mở công cụ Developer Tools của trình duyệt khi đang tương tác với ứng dụng.

> **Giải thích:** Mỗi trình duyệt (Chrome, Safari, Firefox, IE cổ điển) có cách xử lý event khác nhau. React tạo ra `SyntheticEvent` để chuẩn hóa các phương thức như `stopPropagation()`, `preventDefault()`. Từ React 17+, các event listener được gắn vào root DOM container (`#root`) thay vì gắn vào `document`, giúp nhiều ứng dụng React có thể nhúng lồng nhau an toàn.

### Câu 18: Vì sao React yêu cầu lập trình viên phải duy trì tính bất biến (Immutability) của state và cấm đột biến trực tiếp (ví dụ: `state.push(item)`)?
- [x] Vì React so sánh sự thay đổi của state bằng phép so sánh tham chiếu nông (`prev !== next`); nếu đột biến trực tiếp object cũ, tham chiếu vùng nhớ không đổi khiến React bỏ qua việc kích hoạt re-render.
- [ ] Vì JavaScript sẽ ném ngoại lệ `ReadOnlyError` và dừng thực thi chương trình nếu ta thay đổi giá trị của một biến object.
- [ ] Vì đột biến trực tiếp sẽ làm mất đồng bộ giữa bộ nhớ cache của trình duyệt và cơ sở dữ liệu trên máy chủ backend.
- [ ] Vì React Compiler chỉ cho phép thực hiện các thao tác ghi dữ liệu một lần duy nhất trong toàn bộ vòng đời component.

> **Giải thích:** Tính bất biến (Immutability) là hòn đá tảng của React. Khi bạn viết `arr.push(x)`, địa chỉ vùng nhớ của `arr` không đổi (`oldArr === newArr`). Bộ so sánh của React thấy tham chiếu giống nhau nên kết luận "không có gì mới" -> giao diện không cập nhật. Luôn dùng cú pháp spread: `setArr([...arr, x])` hoặc hàm sinh mảng mới như `.map()`, `.filter()`.

### Câu 19: Hook `useId` trong React 18 được thiết kế nhằm mục đích chính nào?
- [x] Sinh ra chuỗi định danh duy nhất ổn định giữa cả Server-Side Rendering (SSR) và Client Hydration, ngăn ngừa lỗi Hydration Mismatch cho các thuộc tính trợ năng (`htmlFor`, `aria-describedby`).
- [ ] Sinh ra mã UUID phiên bản 4 ngẫu nhiên để làm khóa chính (Primary Key) khi lưu bản ghi vào database.
- [ ] Định danh địa chỉ IP và mã vân tay thiết bị (Fingerprint) của người dùng để phục vụ phân tích bảo mật.
- [ ] Tạo ra một chuỗi hash từ mã nguồn JSX để kiểm tra xem component có bị sửa đổi trái phép hay không.

> **Giải thích:** Nếu dùng `Math.random()` để gán `id="input-123"` cho `<input>`: Trên server render ra ID số 1, nhưng khi client hydrate lại render ra ID số 2 -> Báo lỗi Hydration Mismatch đỏ lòm console. `useId()` sinh ra ID dựa trên vị trí của component trong cây Fiber, đảm bảo ID trên server và client trùng khớp 100%.

### Câu 20: Khi một component cha bị re-render, hành vi mặc định của tất cả các component con trực thuộc là gì nếu không có tối ưu hóa?
- [x] Tất cả các component con đều sẽ được thực thi lại hàm render theo một cách đệ quy, bất kể props của chúng có thay đổi giá trị hay không.
- [ ] React sẽ tự động so sánh props của từng component con, nếu props không đổi thì con sẽ tự động bỏ qua render.
- [ ] Chỉ những component con nào có khai báo ít nhất một hook `useState` hoặc `useEffect` mới bị render lại theo cha.
- [ ] Component con sẽ giữ nguyên kết quả render cũ trong RAM và chỉ render lại khi người dùng trực tiếp click vào nó.

> **Giải thích:** Đây là ngộ nhận số 1 của người học React: Nhiều người nghĩ "props không đổi thì con không re-render". Thực tế trong React: Khi cha re-render, React mặc định gọi lại toàn bộ hàm của các component con trong cây. Chỉ khi component con được bọc bằng `React.memo` (hoặc con được truyền qua `props.children` đã được khởi tạo từ trước), React mới kiểm tra props để bỏ qua việc chạy lại hàm của con.
