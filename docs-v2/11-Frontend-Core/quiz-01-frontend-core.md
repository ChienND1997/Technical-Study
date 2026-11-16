# Trắc nghiệm chuyên sâu: Frontend Core, TypeScript & Web Performance

## 1. Web Vitals, Rendering Performance và TypeScript

### Câu 1: Chỉ số Core Web Vitals nào đo lường mức độ ổn định thị giác (Visual Stability) của trang web, phản ánh việc các phần tử DOM bị nhảy layout đột ngột khi tải trang?
- [x] CLS (Cumulative Layout Shift) - Đo tổng số điểm của tất cả các lần dịch chuyển layout bất ngờ trong suốt vòng đời của trang.
- [ ] LCP (Largest Contentful Paint) - Đo thời gian tải xong khối nội dung lớn nhất hiển thị trên màn hình đầu tiên.
- [ ] INP (Interaction to Next Paint) - Đo độ phản hồi và độ trễ khung hình khi người dùng thực hiện tương tác click hoặc gõ phím.
- [ ] FCP (First Contentful Paint) - Đo thời điểm phần tử nội dung DOM đầu tiên được trình duyệt render ra màn hình.

> **Giải thích:** CLS phản ánh trải nghiệm bực bội khi người dùng chuẩn bị bấm vào một nút bấm thì một tấm ảnh hoặc banner quảng cáo tải xong chèn vào phía trên làm nút bấm bị đẩy tụt xuống dưới. Khắc phục CLS: Luôn khai báo trước thuộc tính `width` và `height` (hoặc `aspect-ratio` trong CSS) cho thẻ `<img>` và `<video>`, đặt trước khung chứa (skeleton) cho nội dung tải động.

### Câu 2: Trong TypeScript, từ khóa `unknown` khác biệt gì so với `any`?
- [x] `unknown` là phiên bản an toàn kiểu (Type-safe) của any: Có thể gán bất kỳ giá trị nào cho biến, nhưng KHÔNG ĐƯỢC PHÉP truy cập thuộc tính hoặc gọi hàm cho đến khi thực hiện thu hẹp kiểu (Type Narrowing).
- [ ] `unknown` chỉ chấp nhận kiểu dữ liệu nguyên thủy, trong khi `any` có thể chấp nhận cả các đối tượng phức tạp.
- [ ] `any` bắt buộc phải có giá trị khởi tạo, trong khi `unknown` có thể để trống mà không báo lỗi.
- [ ] `unknown` sẽ tự động chuyển đổi thành kiểu `never` nếu không được gán giá trị trong vòng đời của hàm.

> **Giải thích:** `any` tắt hoàn toàn bộ kiểm tra của TypeScript (bỏ qua mọi an toàn type-check, dễ gây runtime error `is not a function`). Ngược lại, `unknown` buộc lập trình viên phải chứng minh kiểu trước khi sử dụng (ví dụ: `if (typeof x === "string") console.log(x.toUpperCase())`), giữ vững tính an toàn của TypeScript.

### Câu 3: Thuộc tính nào của thẻ `<script>` cho phép trình duyệt tải file JavaScript song song (không chặn phân tích HTML) và thực thi script NGAY LẬP TỨC khi tải xong mà không đảm bảo thứ tự DOM?
- [x] `async`
- [ ] `defer`
- [ ] `crossorigin`
- [ ] `nomodule`

> **Giải thích:**
- `<script src="...">`: Chặn hoàn toàn việc render HTML để tải và chạy script.
- `<script async src="...">`: Tải nền song song; tải xong lúc nào là chạy ngắt quãng HTML lúc đó (không theo thứ tự, không dùng cho code phụ thuộc thư viện khác).
- `<script defer src="...">`: Tải nền song song; chỉ thực thi theo đúng thứ tự file sau khi HTML đã parse xong và trước sự kiện `DOMContentLoaded` (tối ưu nhất cho script ứng dụng).

### Câu 4: Kỹ thuật "Tree Shaking" trong các công cụ đóng gói (Vite, Webpack, Rollup) hoạt động dựa trên cơ chế nào của ngôn ngữ JavaScript?
- [x] Dựa trên cấu trúc tĩnh (Static Structure) của ES Modules (`import`/`export` ở cấp cao nhất), cho phép công cụ phân tích tĩnh đồ thị phụ thuộc và loại bỏ các đoạn mã không được sử dụng (Dead Code).
- [ ] Dựa trên việc nén toàn bộ mã nguồn bằng thuật toán Gzip/Brotli trước khi xuất xưởng ra môi trường production.
- [ ] Dựa trên cú pháp nạp động `require()` của CommonJS để trì hoãn việc tải các hàm chưa được gọi tới.
- [ ] Dựa trên việc phân tích số lần một hàm được gọi lúc runtime để xóa bỏ các hàm có tần suất gọi bằng 0.

> **Giải thích:** Vì cú pháp ES6 `import { a } from './module'` có cấu trúc cố định và không thể đặt trong câu lệnh `if` hay vòng lặp, Bundler có thể dựng đồ thị phụ thuộc tĩnh (AST Graph) ngay thời điểm build: nếu hàm `b` trong module không được bất kỳ file nào import, toàn bộ mã của hàm `b` sẽ bị loại bỏ khỏi bundle cuối cùng, giúp giảm kích thước file `.js` đáng kể.

### Câu 5: Điểm khác biệt căn bản giữa `localStorage` và `sessionStorage` trong Web Storage API của trình duyệt là gì?
- [x] `localStorage` lưu trữ dữ liệu bền vững qua các phiên duyệt web cho đến khi bị xóa chủ động; còn `sessionStorage` chỉ tồn tại trong vòng đời của tab trình duyệt hiện tại và bị xóa sạch khi đóng tab.
- [ ] `localStorage` được mã hóa tự động bằng khóa công khai SSL, còn `sessionStorage` lưu trữ dữ liệu dưới dạng văn bản thô.
- [ ] `localStorage` chỉ có thể lưu trữ dữ liệu chuỗi ký tự, còn `sessionStorage` hỗ trợ lưu trực tiếp các đối tượng JavaScript.
- [ ] Dữ liệu trong `localStorage` tự động được đính kèm vào mọi HTTP Header khi gửi request, còn `sessionStorage` thì không.

> **Giải thích:** Cả hai đều thuộc Web Storage API (dung lượng khoảng 5MB, không tự gửi lên server như Cookie). Điểm khác: `sessionStorage` gắn liền với Session của 1 tab cụ thể (mở tab mới cùng URL cũng có session storage độc lập, đóng tab là mất). `localStorage` được chia sẻ giữa mọi tab/cửa sổ của cùng một Origin và tồn tại qua các lần tắt mở trình duyệt.

### Câu 6: Chỉ số Core Web Vitals nào đã chính thức thay thế FID (First Input Delay) từ tháng 3/2024 để đo lường toàn diện độ phản hồi tương tác (Responsiveness) của trang web trong suốt phiên sử dụng?
- [x] INP (Interaction to Next Paint)
- [ ] TTFB (Time to First Byte)
- [ ] TBT (Total Blocking Time)
- [ ] DCL (DOMContentLoaded Time)

> **Giải thích:** FID cũ chỉ đo lượt tương tác đầu tiên khi tải trang. INP đo lường toàn bộ các tương tác trong suốt phiên duyệt web của người dùng và lấy tương tác có độ trễ tệ nhất (hoặc gần tệ nhất). Ngưỡng INP tốt là dưới 200ms. Khắc phục INP kém: Tránh chạy các tác vụ JavaScript dài trên main thread (Long Tasks > 50ms), sử dụng `requestIdleCallback()` hoặc đưa tác vụ nặng sang Web Worker.

### Câu 7: Trong CSS Box Model, thuộc tính `box-sizing: border-box` có tác dụng gì giúp đơn giản hóa việc tính toán layout?
- [x] Giá trị của `width` và `height` bao gồm cả nội dung (Content), khoảng đệm (Padding) và đường viền (Border); giúp phần tử không bị phình to kích thước khi thêm padding hoặc border.
- [ ] Tự động gộp khoảng cách lề (Margin) của phần tử vào bên trong khung viền để tránh hiện tượng tràn màn hình.
- [ ] Giữ nguyên kích thước phần Content và tự động tính toán margin bên ngoài để vừa vặn với kích thước màn hình.
- [ ] Đặt kích thước đường viền của phần tử luôn bằng 0 pixel để đảm bảo layout không bị xê dịch.

> **Giải thích:** Mặc định của trình duyệt là `box-sizing: content-box`: Khi bạn đặt `width: 200px` và `padding: 20px`, kích thước thực tế của hộp sẽ nở thành `200 + 20*2 = 240px` (dễ làm vỡ layout). Với `border-box`: Đặt `width: 200px` thì toàn bộ hộp luôn cố định đúng 200px, padding sẽ tự co phần nội dung bên trong lại. Đây là lý do quy tắc reset CSS luôn có: `*, *::before, *::after { box-sizing: border-box; }`.

### Câu 8: Điểm khác biệt căn bản về triết lý bố cục giữa CSS Flexbox và CSS Grid Layout là gì?
- [x] Flexbox được thiết kế cho bố cục một chiều (1-Dimensional: theo hàng ngang HOẶC theo cột dọc); còn CSS Grid được thiết kế cho bố cục hai chiều (2-Dimensional: kiểm soát đồng thời cả hàng và cột cùng lúc).
- [ ] Flexbox chỉ hoạt động với các phần tử có chiều rộng cố định, còn CSS Grid chỉ hoạt động với các phần tử co giãn linh hoạt.
- [ ] Flexbox bắt buộc phải khai báo số lượng phần tử con trước, còn CSS Grid tự động sinh phần tử con lúc runtime.
- [ ] Flexbox sử dụng GPU để tính toán vị trí, trong khi CSS Grid tính toán vị trí thuần túy trên CPU.

> **Giải thích:** 
- Dùng Flexbox khi: Sắp xếp các phần tử thành một hàng ngang (Navbar, danh sách button, badge) hoặc căn giữa một phần tử bên trong hộp (`justify-content: center; align-items: center`).
- Dùng CSS Grid khi: Thiết kế toàn bộ khung xương trang web (Page Layout: Header, Sidebar, Main Content, Footer) hoặc hiển thị danh sách thẻ card dạng lưới phức tạp nhiều hàng nhiều cột.

### Câu 9: Thứ tự ưu tiên (Specificity Hierarchy) của các bộ chọn CSS được xếp hạng từ cao xuống thấp như thế nào?
- [x] Inline styles (`style="..."`) > ID Selector (`#id`) > Class / Attribute / Pseudo-class (`.class`, `[type]`, `:hover`) > Element / Pseudo-element (`div`, `p`, `::before`).
- [ ] ID Selector > Inline styles > Class Selector > Element Selector.
- [ ] Class Selector > Attribute Selector > ID Selector > Element Selector.
- [ ] Element Selector > Class Selector > ID Selector > Inline styles.

> **Giải thích:** Công thức tính điểm Specificity chuẩn: `(Inline, ID, Class, Element)`.
- `style="color: red"`: Điểm `(1, 0, 0, 0)` = 1000.
- `#nav`: Điểm `(0, 1, 0, 0)` = 100.
- `.nav-item:hover`: Điểm `(0, 0, 2, 0)` = 20.
- `div p`: Điểm `(0, 0, 0, 2)` = 2.
Lưu ý: `!important` nằm ngoài hệ thống điểm và ghi đè tất cả (trừ khi có `!important` khác với điểm specificity cao hơn).

### Câu 10: Trong TypeScript, các Utility Types `Partial<T>`, `Pick<T, K>` và `Omit<T, K>` có tác dụng tương ứng là gì?
- [x] `Partial<T>`: Biến tất cả các thuộc tính của T thành tùy chọn (`optional ?`); `Pick<T, K>`: Trích xuất một tập con các thuộc tính K từ T; `Omit<T, K>`: Loại bỏ các thuộc tính K ra khỏi T và giữ lại phần còn lại.
- [ ] `Partial<T>`: Đóng băng tất cả các thuộc tính của T; `Pick<T, K>`: Đổi tên thuộc tính; `Omit<T, K>`: Gán giá trị mặc định cho thuộc tính.
- [ ] `Partial<T>`: Xóa bỏ các thuộc tính kiểu hàm; `Pick<T, K>`: Chọn kiểu dữ liệu cha; `Omit<T, K>`: Gộp hai kiểu dữ liệu lại.
- [ ] `Partial<T>`: Biến thuộc tính thành bắt buộc; `Pick<T, K>`: Lọc các thuộc tính kiểu số; `Omit<T, K>`: Chuyển đổi thuộc tính thành mảng.

> **Giải thích:** Đây là các công cụ biến đổi kiểu (Mapped Types) quyền năng của TypeScript:
- `type UserUpdate = Partial<User>`: Thích hợp cho API update `PATCH` (người dùng có thể chỉ gửi mỗi `email`).
- `type UserPreview = Pick<User, "id" | "name">`: Chỉ lấy `id` và `name`.
- `type UserWithoutPassword = Omit<User, "password">`: Loại bỏ trường nhạy cảm `password`.

### Câu 11: Chiến lược Caching nào của Service Worker (PWA) sẽ trả về dữ liệu trong Cache NGAY LẬP TỨC để người dùng không phải chờ đợi, đồng thời âm thầm gửi request mạng để cập nhật bản mới vào Cache cho lần sau?
- [x] Stale-While-Revalidate
- [ ] Cache-First (Cache Falling Back to Network)
- [ ] Network-First (Network Falling Back to Cache)
- [ ] Network-Only

> **Giải thích:** `Stale-While-Revalidate` là chiến lược cân bằng hoàn hảo giữa Tốc độ và Tính mới: Người dùng mở trang web thấy nội dung hiển thị trong 0 mili-giây từ Cache (Stale). Trong nền, Service Worker tự động fetch API mới từ máy chủ; khi có dữ liệu mới, nó ghi đè vào cache (Revalidate) để lần mở tiếp theo có nội dung cập nhật mới nhất.

### Câu 12: Web Worker trong trình duyệt được sử dụng với mục đích chính là gì?
- [x] Thực thi các tác vụ tính toán nặng tốn CPU (như xử lý ảnh, mã hóa dữ liệu) trên một luồng nền độc lập, ngăn không làm đơ hoặc nghẽn luồng giao diện chính (UI Main Thread).
- [ ] Can thiệp và chỉnh sửa trực tiếp cấu trúc cây DOM của trang web từ một tiến trình độc lập.
- [ ] Tự động gửi cookie xác thực và token của người dùng tới các domain bên thứ ba.
- [ ] Bắt và xử lý các sự kiện click chuột của người dùng trước khi sự kiện tới được cây Virtual DOM.

> **Giải thích:** Trình duyệt chạy giao diện người dùng (Render, Event Listener, JS) trên 1 luồng chính duy nhất. Nếu bạn giải một thuật toán nặng mất 3 giây, toàn bộ trang web sẽ bị đóng băng (không click, không scroll được). Web Worker chạy trên OS thread riêng biệt, giao tiếp với luồng chính qua thông điệp `postMessage()` và `onmessage`. Lưu ý: Web Worker không thể truy cập trực tiếp vào `window`, `document` hoặc DOM.

### Câu 13: Thẻ `<link rel="preload">` khác gì so với `<link rel="prefetch">` về mặt hành vi tải tài nguyên của trình duyệt?
- [x] `preload` yêu cầu trình duyệt tải tài nguyên quan trọng NGAY LẬP TỨC với độ ưu tiên cao phục vụ trang hiện tại; còn `prefetch` tải tài nguyên ở chế độ nhàn rỗi với độ ưu tiên thấp để chuẩn bị trước cho TRANG TIẾP THEO.
- [ ] `preload` chỉ áp dụng cho các tệp tin CSS và hình ảnh, còn `prefetch` dùng riêng cho các tệp tin JavaScript.
- [ ] `preload` lưu trữ tài nguyên vĩnh viễn trong IndexedDB, còn `prefetch` chỉ lưu tạm trên RAM.
- [ ] `preload` tự động thực thi mã nguồn của file sau khi tải xong, còn `prefetch` chỉ tải về mà không thực thi.

> **Giải thích:**
- `<link rel="preload" href="font.woff2" as="font">`: Tải font chữ hoặc ảnh Hero LCP gấp ngay từ đầu để tránh hiện tượng chữ bị giật nháy (FOIT).
- `<link rel="prefetch" href="/checkout.js">`: Khi người dùng đang ở trang Giỏ hàng, trình duyệt lúc rảnh rỗi sẽ tải trước script của trang Thanh toán, giúp khi bấm "Thanh toán" trang mới mở lên tức thì.

### Câu 14: Hiện tượng "Margin Collapsing" (Chập lề) trong CSS xảy ra trong trường hợp nào?
- [x] Xảy ra khi lề trên và lề dưới (Vertical Margins) của hai phần tử Block liền kề tiếp xúc nhau, chúng sẽ bị gộp lại thành MỘT KHOẢNG LỀ DUY NHẤT có kích thước bằng giá trị lớn nhất của hai lề đó thay vì cộng dồn.
- [ ] Xảy ra khi lề trái và lề phải (Horizontal Margins) của hai phần tử inline chạm nhau trên cùng một dòng văn bản.
- [ ] Xảy ra khi các phần tử con bên trong một container Flexbox có tổng margin vượt quá chiều rộng của container.
- [ ] Xảy ra khi một phần tử có thuộc tính `position: absolute` đè lên phần tử cha có `position: relative`.

> **Giải thích:** Nếu phần tử A có `margin-bottom: 30px` và phần tử B nằm ngay dưới nó có `margin-top: 20px`: Khoảng cách thực tế giữa A và B KHÔNG PHẢI là `30 + 20 = 50px`, mà sẽ bị chập lại chỉ còn `max(30, 20) = 30px`. Lưu ý: Margin ngang (Horizontal) không bao giờ bị chập, và các phần tử nằm trong Flexbox hoặc CSS Grid không bị Margin Collapsing.

### Câu 15: Đơn vị CSS `rem` khác biệt căn bản gì so với đơn vị `em`?
- [x] `rem` luôn tính toán tỷ lệ kích thước dựa trên font chữ của phần tử GỐC (`<html>`, mặc định 16px); còn `em` tính toán tỷ lệ dựa trên kích thước font chữ của CHÍNH PHẦN TỬ ĐÓ hoặc phần tử CHA trực tiếp (gây hiệu ứng nhân dồn khi lồng nhau).
- [ ] `rem` là đơn vị đo chiều dài tuyệt đối tương tự như `px`, còn `em` là đơn vị đo chiều dài tương đối.
- [ ] `rem` chỉ sử dụng được khi định dạng kích thước lề (margin/padding), còn `em` chỉ dùng cho thuộc tính `font-size`.
- [ ] `rem` tự động co giãn theo chiều rộng khung nhìn (Viewport Width), trong khi `em` cố định theo màn hình.

> **Giải thích:** Nếu thẻ con lồng nhau 3 cấp cùng đặt `font-size: 1.2em`: Cấp 1 = `16 * 1.2 = 19.2px`, Cấp 2 = `19.2 * 1.2 = 23.04px`, Cấp 3 = `27.6px` (bị phình to ngoài tầm kiểm soát). Dùng `rem` giúp toàn bộ hệ thống kích thước (typography, spacing) quy chuẩn thống nhất theo `<html>`. Khi người dùng chỉnh kích thước font trong cài đặt hệ điều hành/trình duyệt, toàn bộ giao diện co giãn hài hòa tự động.

### Câu 16: Kỹ thuật "Discriminated Unions" (Tagged Unions) trong TypeScript là gì và mang lại lợi ích gì?
- [x] Tạo một tập hợp các Type có chung một thuộc tính phân biệt dạng hằng số chuỗi (literal discriminant), giúp TypeScript tự động thu hẹp kiểu (Type Narrowing) chính xác trong các câu lệnh `switch` hoặc `if`.
- [ ] Tự động gộp tất cả các thuộc tính của nhiều interface lại thành một kiểu đối tượng duy nhất có kiểm tra xung đột kiểu.
- [ ] Chuyển đổi một Type phức tạp thành một mảng các chuỗi đại diện cho tên của các thuộc tính lúc runtime.
- [ ] Cho phép định nghĩa một kiểu dữ liệu có thể tự động ép kiểu sang bất kỳ kiểu nguyên thủy nào mà không cần Type Cast.

> **Giải thích:**
```ts
type State = 
  | { status: "loading" }
  | { status: "success", data: string }
  | { status: "error", error: Error };
```
Khi bạn viết `if (state.status === "success")`, bên trong khối if TypeScript tự động biết chắc chắn `state.data` tồn tại và không cho phép bạn truy cập `state.error`, triệt tiêu hoàn toàn các lỗi runtime undefined.

### Câu 17: Định dạng hình ảnh thế hệ mới nào sau đây (Next-Gen Image Formats) mang lại tỷ lệ nén tốt nhất hiện nay, giảm tới 30-50% dung lượng so với WebP và JPEG mà vẫn giữ nguyên chất lượng?
- [x] AVIF (AV1 Image File Format)
- [ ] BMP
- [ ] GIF
- [ ] PNG-8

> **Giải thích:** AVIF (dựa trên bộ codec video mã nguồn mở AV1) là bước tiến công nghệ vượt bậc so với WebP: Nó nén file nhỏ hơn WebP khoảng 20-30% và nhỏ hơn JPEG tới 50%, hỗ trợ dải màu rộng (HDR), độ sâu 10/12-bit màu và độ trong suốt (Alpha channel). Sử dụng thẻ `<picture>` để phục vụ fallback: `<source srcset="img.avif" type="image/avif"><source srcset="img.webp" type="image/webp"><img src="img.jpg">`.

### Câu 18: Cơ chế Hot Module Replacement (HMR) trong Vite hoạt động dựa trên tiêu chuẩn nào để cập nhật code tức thì mà không cần tải lại toàn bộ trang web?
- [x] Dựa trên chuẩn Native ES Modules (ESM) của trình duyệt và kết nối WebSocket: Khi sửa 1 file, Vite chỉ biên dịch duy nhất module đó và gửi thông báo qua WebSocket để trình duyệt nạp lại đúng module bị thay đổi, giữ nguyên state ứng dụng.
- [ ] Dựa trên việc đóng gói lại toàn bộ ứng dụng thành một bundle mới và nạp lại toàn bộ cây DOM từ đầu.
- [ ] Dựa trên việc lưu trữ toàn bộ trạng thái của ứng dụng vào LocalStorage trước khi ép trình duyệt reload trang.
- [ ] Dựa trên việc giả lập môi trường Node.js trực tiếp bên trong Service Worker của trình duyệt.

> **Giải thích:** Khác với Webpack cổ điển (mỗi lần sửa 1 dòng code phải bundle lại cả cây ứng dụng mất vài giây), Vite tận dụng trình duyệt hiện đại tự phân giải `import`. Khi sửa code component, Vite chỉ xử lý đúng file đó trong vài mili-giây (Sub-millisecond) và tráo đổi module trên DOM qua HMR API mà form dữ liệu bạn đang nhập dở vẫn nguyên vẹn.

### Câu 19: Khái niệm "Block Formatting Context" (BFC) trong CSS được kích hoạt bằng thuộc tính nào sau đây và giải quyết được vấn đề gì?
- [x] Kích hoạt bằng `display: flow-root`, `overflow: hidden`, hoặc `display: flex/grid`; giúp ôm trọn các phần tử con có thuộc tính `float` (Clearfix) và ngăn chặn hiện tượng chập lề (Margin Collapsing) với các phần tử bên ngoài.
- [ ] Kích hoạt bằng `position: relative` kết hợp với `z-index: 1`; giúp đưa phần tử lên tầng hiển thị cao nhất của trang.
- [ ] Kích hoạt bằng `text-align: justify`; giúp căn đều hai lề của đoạn văn bản dài.
- [ ] Kích hoạt bằng `box-shadow: none`; giúp loại bỏ bóng mờ xung quanh phần tử.

> **Giải thích:** BFC là một vùng render độc lập trên trang: Các phần tử bên trong BFC sẽ không ảnh hưởng hoặc làm lệch layout của các phần tử bên ngoài nó. Thuộc tính hiện đại sạch sẽ nhất để tạo BFC mà không gây tác dụng phụ che khuất nội dung (như `overflow: hidden`) là sử dụng `display: flow-root`.

### Câu 20: Trong TypeScript, toán tử `satisfies` (giới thiệu từ TypeScript 4.9) mang lại ưu thế gì so với việc khai báo kiểu thông thường (`const x: Type = ...`)?
- [x] Kiểm tra biểu thức có thỏa mãn cấu trúc của Type hay không, NHƯNG VẪN GIỮ NGUYÊN KIỂU SUY LUẬN CHÍNH XÁC NHẤT (Narrowest inferred type) của biến thay vì ép rộng kiểu thành Type tổng quát.
- [ ] Tự động chuyển đổi các thuộc tính tùy chọn (`optional`) thành các thuộc tính bắt buộc lúc runtime.
- [ ] Tự động tạo ra các phương thức getter và setter cho tất cả các trường dữ liệu của đối tượng.
- [ ] Cho phép ghi đè các thuộc tính chỉ đọc (`readonly`) của interface mà không bị trình biên dịch báo lỗi.

> **Giải thích:**
```ts
type Colors = Record<string, string | number[]>;
// Cách cũ: palette bị ép kiểu thành (string | number[]), gọi palette.red.toUpperCase() sẽ báo lỗi!
const palette1: Colors = { red: "#ff0000", green: [0, 255, 0] };
// Với satisfies: TS kiểm tra đúng cấu trúc Colors, nhưng VẪN BIẾT "red" là string!
const palette2 = { red: "#ff0000", green: [0, 255, 0] } satisfies Colors;
palette2.red.toUpperCase(); // Hợp lệ 100%!
```
