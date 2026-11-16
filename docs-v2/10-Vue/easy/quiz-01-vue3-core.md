# Trắc nghiệm chuyên sâu: Vue 3 Core & Component

## 1. Slot và Scope biên dịch

### Câu 1: Vì sao trong template của component cha, nội dung slot mặc định dùng được biến của cha nhưng không dùng được biến của con?
- [x] Vì nội dung slot được biên dịch trong scope của component cha trước khi truyền xuống; dữ liệu nội bộ của component con chỉ có thể truy cập nếu con chủ động truyền ra qua Scoped Slot props.
- [ ] Vì Vue ưu tiên scope của component con ghi đè lên component cha; nếu muốn dùng biến của cha thì phải đặt tên biến trùng khớp giữa hai component.
- [ ] Vì nội dung slot chỉ được liên kết dữ liệu (data binding) lúc runtime sau khi cả cha và con đã mount xong, tại thời điểm đó scope của con đã bị đóng băng.
- [ ] Vì template của cha chỉ nhận được các sự kiện do con phát ra (`emit`), còn slot là phần tử DOM tĩnh không thể chứa bất kỳ biến JavaScript nào.

> **Giải thích:** Vue tuân thủ nguyên tắc Scope Compilation nhất quán: *"Nội dung trong template cha được biên dịch trong scope cha; nội dung trong template con được biên dịch trong scope con"*. Muốn nội dung slot truy cập được dữ liệu từ con, component con phải truyền qua thuộc tính slot: `<slot :item="data">` và cha nhận qua `v-slot="slotProps"`.

### Câu 2: Khi nào nên ưu tiên sử dụng `ref()` thay vì `reactive()` trong Vue 3 Composition API?
- [x] Khi cần quản lý biến kiểu nguyên thủy (primitive) hoặc muốn có khả năng gán lại toàn bộ object/mảng mới mà không làm mất tính phản ứng (reactivity).
- [ ] Khi muốn Vue tự động theo dõi sâu (deep reactivity) mọi thuộc tính lồng nhau bên trong object, vì `reactive()` chỉ tạo shallow reactivity ở tầng đầu tiên.
- [ ] Khi muốn destructure trực tiếp các thuộc tính của object mà không cần gọi thêm hàm hỗ trợ `toRefs()`, vì `ref()` giữ reactivity sau khi destructure.
- [ ] Khi cần truyền state sang component con thông qua props mà không cần khai báo kiểu dữ liệu trong `defineProps()`.

> **Giải thích:** `reactive()` sử dụng JavaScript Proxy và chỉ hoạt động với Object/Array, không hỗ trợ kiểu nguyên thủy (`number`, `string`, `boolean`). Ngoài ra, nếu gán đè một object mới (`state = { ... }`), `reactive()` sẽ mất liên kết Proxy ban đầu; trong khi `ref.value = { ... }` vẫn giữ nguyên reactivity một cách an toàn.

### Câu 3: Điểm khác biệt cốt lõi giữa `computed()` và `watch()` trong Vue 3 là gì?
- [x] `computed` tự động theo dõi dependencies, có cơ chế cache kết quả và phải là pure function trả về giá trị; còn `watch` dùng để thực thi side-effects (gọi API, ghi log, hẹn giờ) khi state thay đổi.
- [ ] `computed` chỉ thực thi một lần duy nhất lúc component khởi tạo (không tự chạy lại); còn `watch` sẽ thực thi lại mỗi khi bất kỳ state nào trong component thay đổi.
- [ ] `computed` xử lý các tác vụ bất đồng bộ (async API call); còn `watch` chỉ được phép xử lý các phép tính toán đồng bộ (synchronous).
- [ ] `computed` bắt buộc phải khai báo danh sách dependency bằng mảng tham số thứ hai (như `useMemo` của React); còn `watch` tự động quét dependencies mà không cần khai báo.

> **Giải thích:** `computed` được thiết kế cho các phép tính dẫn xuất từ state có sẵn, có cache: nếu state phụ thuộc không đổi thì gọi lại computed sẽ trả về ngay kết quả đã lưu trong bộ nhớ. Ngược lại, `watch` dành riêng cho Side-effects (phản ứng lại sự thay đổi để tạo tác động bên ngoài như gọi API, thao tác DOM trực tiếp).

### Câu 4: Trong `<script setup>`, thứ tự và thời điểm hàm callback của `onMounted` được thực thi là gì?
- [x] Sau khi component đã hoàn tất render ban đầu, tạo ra các DOM node thực tế và gắn chúng vào cây DOM của tài liệu.
- [ ] Ngay khi khối `<script setup>` bắt đầu chạy và các biến reactive vừa được khởi tạo, trước khi Virtual DOM được sinh ra.
- [ ] Ngay sau khi tất cả các component con cháu bên trong đã kích hoạt xong hook `onBeforeMount`, nhưng trước khi chúng tạo DOM node thực tế.
- [ ] Sau khi tất cả các API bất đồng bộ (`fetch`/`axios`) gọi trong `<script setup>` đã nhận phản hồi và cập nhật xong state.

> **Giải thích:** `onMounted` được gọi khi component đã hoàn tất render lần đầu tiên và các DOM nodes đã gắn vào tài liệu. Đây là nơi thích hợp để truy cập DOM trực tiếp thông qua template refs hoặc khởi tạo thư viện bên thứ ba (Canvas, Chart.js).

### Câu 5: Component `<Teleport>` trong Vue 3 hoạt động theo cơ chế nào?
- [x] Di chuyển vị trí render của phần tử DOM thực tế đến một node đích (như `body`), trong khi vị trí logic, luồng dữ liệu (props, state) và quan hệ cha-con trong component tree vẫn giữ nguyên.
- [ ] Di chuyển toàn bộ instance của component sang một cây Virtual DOM riêng biệt và tách rời hoàn toàn khỏi lifecycle của component cha.
- [ ] Sao chép (clone) phần tử DOM sang vị trí đích và tự động đồng bộ hai chiều giữa hai bản sao DOM này bằng MutationObserver.
- [ ] Chuyển component cha thành một Portal tĩnh và ngừng theo dõi reactive state đối với tất cả các phần tử nằm bên trong thẻ Teleport.

> **Giải thích:** `<Teleport to="body">` giải quyết vấn đề kinh điển của Modal/Dialog/Tooltip khi component nằm sâu trong các thẻ cha có `overflow: hidden`, `z-index`, hoặc `position: relative`. Phần hiển thị DOM được đưa ra ngoài, nhưng event bus và props/state vẫn nằm trong scope của component cha.

### Câu 6: Khi cần chia sẻ state giữa các component có quan hệ tổ tiên - con cháu cách nhau nhiều tầng (tránh prop drilling), giải pháp chuẩn mực của Vue 3 là gì và lưu ý về reactivity?
- [x] Dùng cặp `provide(key, value)` ở tổ tiên và `inject(key)` ở con cháu; nếu muốn dữ liệu phản ứng 2 chiều khi thay đổi, giá trị truyền qua provide phải là `ref` hoặc `reactive`.
- [ ] Dùng `defineProps` ở tổ tiên và `defineEmits` ở con cháu, kết hợp cờ `inheritAttrs: true` để truyền xuyên qua các component trung gian.
- [ ] Dùng `useAttrs()` và `useSlots()` ở component con cháu để trích xuất trực tiếp state từ component gốc mà không cần component cha cấp quyền.
- [ ] Dùng `toRef(props, 'key')` tại component trung gian để tự động chuyển tiếp props xuống các tầng dưới mà không cần khai báo lại.

> **Giải thích:** Cặp `provide / inject` cho phép component tổ tiên cung cấp dữ liệu hoặc hàm xử lý cho tất cả các component con cháu phía dưới mà không cần truyền thủ công qua từng cấp trung gian. Dữ liệu truyền qua `provide` nếu bọc bằng `ref()` hoặc `reactive()` vẫn giữ nguyên tính phản ứng.

### Câu 7: Khi nào và vì sao cần sử dụng hàm `nextTick()` trong Vue 3?
- [x] Khi cần truy cập hoặc tính toán kích thước của DOM ngay sau khi state vừa thay đổi, vì Vue gom nhóm các thay đổi DOM và chỉ xả cập nhật bất đồng bộ ở microtask tiếp theo.
- [ ] Khi cần trì hoãn việc cập nhật reactive state cho đến khi toàn bộ animation chuyển cảnh bằng CSS hoàn tất.
- [ ] Khi muốn ép Vue bỏ qua Virtual DOM Diffing và ghi đè trực tiếp giá trị mới vào DOM thực tế một cách đồng bộ.
- [ ] Khi cần giải phóng bộ nhớ (garbage collection) của các biến reactive không còn được sử dụng trong component.

> **Giải thích:** Khi state thay đổi, Vue không cập nhật DOM ngay lập tức mà gom các thay đổi vào một hàng đợi (Queue) và xả một lượt ở Microtask tiếp theo. Nếu đọc DOM ngay sau dòng gán biến, DOM vẫn là giá trị cũ. Gọi `await nextTick()` giúp tạm dừng cho đến khi DOM đã thực sự được cập nhật hoàn tất.

### Câu 8: Điểm khác biệt quan trọng giữa `watch` và `watchEffect` trong Vue 3 là gì?
- [x] `watch` yêu cầu chỉ định nguồn theo dõi tường minh, mặc định chạy lazy (chỉ chạy khi state đổi) và cung cấp giá trị cũ/mới; còn `watchEffect` tự động thu thập dependencies khi chạy callback và luôn chạy ngay lập tức lúc khởi tạo.
- [ ] `watch` tự động quét tất cả các biến reactive xuất hiện trong hàm callback; còn `watchEffect` bắt buộc phải truyền mảng các biến cần theo dõi ở tham số đầu tiên.
- [ ] `watch` chỉ theo dõi được dữ liệu nguyên thủy (primitive); còn `watchEffect` chỉ dùng được cho đối tượng phức tạp (`reactive()`).
- [ ] `watch` luôn chạy bất đồng bộ sau khi DOM đã cập nhật; còn `watchEffect` luôn chạy đồng bộ trước khi bất kỳ thay đổi nào diễn ra.

> **Giải thích:** `watch(source, callback)` theo dõi rõ ràng `source`, cho phép so sánh giá trị mới và giá trị cũ (`newVal, oldVal`). `watchEffect(callback)` tự động phân tích dependency graph bên trong hàm: biến nào được đọc thì tự đăng ký watcher, và luôn chạy ngay 1 lần lúc setup.

### Câu 9: Khi thực hiện Destructuring ES6 trên một đối tượng `reactive` (ví dụ: `const { count } = state`), hiện tượng gì xảy ra và cách khắc phục chuẩn xác nhất là gì?
- [x] Biến `count` bị mất tính phản ứng vì destructuring chỉ sao chép giá trị nguyên thủy tại thời điểm đó; khắc phục bằng cách dùng `toRefs(state)` hoặc `toRef(state, 'count')`.
- [ ] Biến `count` vẫn giữ nguyên reactivity nhưng biến `state` gốc sẽ bị vô hiệu hóa; khắc phục bằng cách dùng `Object.assign({}, state)`.
- [ ] Trình biên dịch Vue sẽ báo lỗi runtime `TypeError: Cannot destructure reactive object`; khắc phục bằng cách chuyển đổi state sang `shallowReactive`.
- [ ] Biến `count` sẽ chuyển thành một computed property chỉ đọc (read-only); khắc phục bằng cách bọc nó trong hàm `unref()`.

> **Giải thích:** `reactive` hoạt động thông qua Proxy bọc ngoài object gốc. Phép destructuring `const { count } = state` trích xuất giá trị nguyên thủy ra một biến độc lập, làm mất liên kết với getter/setter của Proxy. Hàm `toRefs(state)` chuyển đổi từng thuộc tính của object thành một `ref` tương ứng, giữ vững reactivity khi destructure.

### Câu 10: Component `<KeepAlive>` quản lý vòng đời (lifecycle) của các component được bọc bên trong như thế nào khi chuyển đổi qua lại?
- [x] Component không bị unmount mà chuyển sang trạng thái inactive (cache trong RAM); kích hoạt hook `onDeactivated` khi rời đi và `onActivated` khi quay lại thay vì chạy lại `onMounted` / `onUnmounted`.
- [ ] Component vẫn bị unmount và hủy DOM bình thường, nhưng toàn bộ state được tự động tuần tự hóa và lưu tạm vào `sessionStorage`.
- [ ] Component được giữ nguyên trên DOM thực tế và chỉ ẩn đi bằng CSS `visibility: hidden` mà không thay đổi bất kỳ trạng thái lifecycle nào.
- [ ] Component chỉ cache lại template HTML tĩnh, còn toàn bộ reactive state và API call bên trong `<script setup>` đều phải thực thi lại từ đầu.

> **Giải thích:** Khi chuyển đổi giữa các component bằng `<component :is="...">`, mặc định component cũ bị unmount và hủy state. Bọc bằng `<KeepAlive>` sẽ giữ instance của component trong bộ nhớ cache. Component được kích hoạt hook `onActivated` và `onDeactivated` thay vì `onMounted` và `onUnmounted`.

### Câu 11: Trong tình huống nào nên chọn `v-show` thay vì `v-if` để tối ưu hiệu năng?
- [x] Khi phần tử cần được bật/tắt hiển thị thường xuyên liên tục (như dropdown menu, tooltip, accordion), vì `v-show` chỉ toggle thuộc tính CSS `display` và không tốn chi phí mount/unmount DOM node.
- [ ] Khi phần tử chứa nhiều logic nặng và ít khi được người dùng mở ra, nhằm tiết kiệm tài nguyên khởi tạo ban đầu khi trang tải.
- [ ] Khi cần áp dụng điều kiện hiển thị trên thẻ `<template>` hoặc muốn kết hợp với các nhánh rẽ điều kiện `v-else` và `v-else-if`.
- [ ] Khi cần bảo vệ component con không thực thi lifecycle hook `onMounted` cho đến khi điều kiện trở thành `true`.

> **Giải thích:** `v-if` có chi phí chuyển đổi (toggle cost) cao hơn vì phải mount/unmount DOM nodes, nhưng chi phí khởi tạo ban đầu thấp (nếu false thì không làm gì). `v-show` luôn mount ban đầu, toggle siêu nhanh bằng CSS. Nguyên tắc: Nếu bật tắt thường xuyên -> dùng `v-show`; nếu điều kiện ít khi đổi -> dùng `v-if`.

### Câu 12: Vì sao khi render danh sách bằng `v-for`, việc sử dụng `index` làm `:key` là một bad practice khi danh sách có thể thay đổi (thêm, xoá, sắp xếp)?
- [x] Vì `index` của các phần tử sẽ bị dịch chuyển khi thêm/xóa ở đầu hoặc giữa mảng, khiến thuật toán Virtual DOM Diffing tái sử dụng sai các DOM node và giữ lại state cục bộ (như input text, checkbox) của phần tử khác.
- [ ] Vì Vue sẽ bỏ qua hoàn toàn thuật toán Virtual DOM và ép trình duyệt phải render lại toàn bộ trang web từ đầu nếu phát hiện key là số nguyên.
- [ ] Vì `index` làm giảm tốc độ tính toán của JavaScript do Vue phải ép kiểu từ number sang string trong mỗi lần render.
- [ ] Vì dùng `index` sẽ vi phạm tiêu chuẩn bảo mật dữ liệu và gây rò rỉ bộ nhớ (memory leak) trên trình duyệt di động.

> **Giải thích:** Khi dùng `index` làm key: nếu xóa phần tử đầu tiên, phần tử thứ hai có index mới là 0 -> Vue tưởng node 0 không đổi nên giữ nguyên DOM và các state nội bộ (như text input, checkbox đã tích), dẫn tới lỗi hiển thị sai dữ liệu nghiêm trọng. Luôn dùng ID duy nhất của bản ghi làm key (`item.id`).

### Câu 13: Sự khác biệt bản chất giữa `ref()` và `shallowRef()` trong việc kích hoạt trigger re-render là gì?
- [x] `ref()` đệ quy biến đổi tất cả các thuộc tính lồng nhau bên trong thành reactive (deep); còn `shallowRef()` chỉ theo dõi và trigger cập nhật khi thuộc tính `.value` được gán lại một đối tượng mới hoàn toàn.
- [ ] `shallowRef()` chỉ theo dõi tầng đầu tiên của object, khi thay đổi `shallowObj.value.prop = 123` thì giao diện vẫn tự động re-render như thường.
- [ ] `shallowRef()` chỉ dùng được cho kiểu dữ liệu nguyên thủy (number, string), không thể lưu trữ object hay mảng.
- [ ] `ref()` bắt buộc phải đi kèm với `computed()`, còn `shallowRef()` có thể hoạt động độc lập mà không cần compiler hỗ trợ.

> **Giải thích:** `ref()` sẽ duyệt đệ quy toàn bộ object bên trong để tạo reactivity sâu. Với một mảng chứa 10.000 đối tượng hoặc khi bọc các instance phức tạp (như Three.js scene, Leaflet map), việc tạo proxy sâu làm chậm trình duyệt. `shallowRef` chỉ phản ứng khi bạn thay đổi `myRef.value = newObj`, giúp tối ưu hóa hiệu năng tối đa.

### Câu 14: Macro `defineModel()` (giới thiệu từ Vue 3.4) giúp đơn giản hóa cú pháp hai chiều `v-model` như thế nào so với cách viết truyền thống?
- [x] Tự động khai báo cả prop `modelValue` và sự kiện `update:modelValue` ngầm định, trả về một `ref` có thể đọc và gán trực tiếp để đồng bộ hai chiều với component cha.
- [ ] Cho phép component con tự ý sửa đổi trực tiếp prop của component cha mà không cần phát ra sự kiện (mutate props directly).
- [ ] Tự động kết nối component với store của Pinia mà không cần gọi hàm `useStore()`.
- [ ] Chuyển đổi component con thành một form control chuẩn HTML5 độc lập với Vue runtime.

> **Giải thích:** Trước Vue 3.4, để tạo v-model ở component con, bạn phải khai báo `defineProps(['modelValue'])` và `defineEmits(['update:modelValue'])`. Từ Vue 3.4, `defineModel()` tự động xử lý cả prop và emit ngầm định, trả về một `ref` có thể đọc và gán trực tiếp: `const model = defineModel()`.

### Câu 15: Trong kiến trúc Virtual DOM của Vue 3, cơ chế "Patch Flags" và "Hoist Static" tối ưu hóa quá trình re-render như thế nào?
- [x] Trích xuất các node HTML tĩnh ra khỏi hàm render để không tạo lại khi render (Hoisting), và gắn cờ nhị phân (Patch Flag) để thuật toán Diffing chỉ kiểm tra đúng thuộc tính động (text, class) mà không cần duyệt toàn bộ cây DOM.
- [ ] Chuyển đổi toàn bộ template Vue thành WebGL canvas để tận dụng card đồ họa GPU thay vì render DOM thông thường.
- [ ] Tự động chuyển đổi các biểu thức JavaScript trong template thành mã WebAssembly để tăng tốc độ tính toán lúc runtime.
- [ ] Nén toàn bộ Virtual DOM thành chuỗi Base64 trước khi so sánh phiên bản cũ và mới để tiết kiệm RAM.

> **Giải thích:** Đây là đột phá kiến trúc của Vue 3: Compiler phân tích template và gắn cờ nhị phân (Patch Flag, ví dụ `/* TEXT */ 1`). Khi state đổi, Virtual DOM không cần duyệt đệ quy cả cây (O(N) theo kích thước template) mà chỉ cần nhảy thẳng tới các dynamic nodes (O(M) theo số lượng ràng buộc động).

### Câu 16: Điểm khác biệt quan trọng trong thiết kế kiến trúc giữa Pinia và Vuex 4 là gì?
- [x] Pinia loại bỏ hoàn toàn tầng `mutations` (chỉ còn State, Getters, Actions hỗ trợ cả sync/async), có thiết kế phẳng tự nhiên (flat stores) và hỗ trợ type inference TypeScript toàn diện mà không cần boilerplate phức tạp.
- [ ] Pinia yêu cầu tất cả các action bắt buộc phải là hàm đồng bộ (synchronous), nếu muốn gọi API bất đồng bộ thì phải chuyển vào Getters.
- [ ] Pinia bắt buộc toàn bộ state phải được định nghĩa trong một cây module lồng nhau duy nhất (single nested state tree) tương tự Redux.
- [ ] Pinia không hỗ trợ devtools time-travel debugging và không thể tích hợp được với Vue Router.

> **Giải thích:** Pinia là store chính thức được khuyến nghị thay thế Vuex. Pinia cực kỳ gọn nhẹ (chỉ ~1KB), cú pháp tương đồng với Composition API (`defineStore` dạng setup store), loại bỏ sự phân chia rườm rà giữa `mutations` (đồng bộ) và `actions` (bất đồng bộ) của Vuex cổ điển.

### Câu 17: Khi một component con sử dụng `<script setup>`, tại sao component cha không thể tùy ý truy cập các biến nội bộ của con qua Template Ref nếu không dùng `defineExpose`?
- [x] Vì component dùng `<script setup>` mặc định ở chế độ đóng kín (closed-by-default); chỉ các thuộc tính và hàm được khai báo tường minh qua `defineExpose({...})` mới xuất hiện trên instance công khai của component.
- [ ] Vì Vue tự động mã hóa tên các biến nội bộ của component con thành các ký tự ngẫu nhiên trong quá trình build để bảo vệ bản quyền mã nguồn.
- [ ] Vì Template Ref chỉ dùng để tham chiếu tới các thẻ HTML nguyên bản (`div`, `input`), không thể gán vào custom component.
- [ ] Vì component cha chỉ có thể đọc dữ liệu của con thông qua sự kiện `v-on`, cấm hoàn toàn mọi hình thức tham chiếu trực tiếp.

> **Giải thích:** Component dùng `<script setup>` mặc định được đóng kín (closed): Component cha dù dùng `ref="childRef"` cũng không thể đọc được state hay method bên trong con. Nếu muốn cha gọi được hàm của con (ví dụ `childRef.value.openModal()`), component con phải khai báo tường minh: `defineExpose({ openModal })`.

### Câu 18: Quy ước chuẩn mực khi thiết kế một "Composable" (Custom Composition Function) trong Vue 3 là gì?
- [x] Tên hàm bắt đầu bằng tiền tố `use` (ví dụ: `useUser`, `useEventListener`), nhận tham số có thể là giá trị thô hoặc `ref`/`getter`, và trả về một plain object chứa các `ref` để dễ dàng destructure mà không mất tính phản ứng.
- [ ] Hàm bắt buộc phải trả về một đối tượng `reactive()` thay vì các `ref`, để component gọi không phải viết `.value` khi sử dụng.
- [ ] Toàn bộ state bên trong Composable phải là biến toàn cục (module-level singleton) để tất cả các component dùng chung mà không thể tạo state riêng biệt.
- [ ] Composable bắt buộc phải chứa ít nhất một hook `onMounted` và một hook `onUnmounted`, nếu không Vue sẽ từ chối thực thi.

> **Giải thích:** Composable là cơ chế tái sử dụng logic mạnh mẽ nhất của Vue 3 (thay thế Mixins thời Vue 2). Quy ước: Tên hàm bắt đầu bằng `use...`, nhận tham số linh hoạt (có thể là giá trị thô hoặc `ref`), sử dụng các lifecycle hooks nếu cần, và trả về `{ data, error, loading }` dạng các `ref` để giữ tính phản ứng khi gọi.

### Câu 19: Trong các Event Modifiers của Vue (`@click.stop`, `@click.prevent`, `@click.self`), sự khác biệt giữa `.stop` và `.self` là gì?
- [x] `.stop` gọi `event.stopPropagation()` để ngăn sự kiện nổi bọt lên các thẻ tổ tiên; còn `.self` chỉ kích hoạt handler nếu chính phần tử gắn directive là đối tượng phát ra sự kiện (`event.target === event.currentTarget`).
- [ ] `.stop` ngăn chặn hành vi mặc định của trình duyệt (như submit form); còn `.self` ngăn chặn việc click đúp nhiều lần liên tiếp.
- [ ] `.self` sẽ chặn đứng sự kiện lan truyền xuống các phần tử con; còn `.stop` chỉ chặn sự kiện lan truyền lên phần tử cha.
- [ ] `.stop` chỉ dùng được trên nút bấm `<button>`; còn `.self` bắt buộc phải dùng trên thẻ `<div>` hoặc `<form>`.

> **Giải thích:** Vue cung cấp các modifiers trực tiếp trên template để tách rời logic xử lý DOM khỏi logic nghiệp vụ:
- `.prevent`: Gọi `event.preventDefault()` (chống reload form khi submit).
- `.stop`: Gọi `event.stopPropagation()` (chống nổi bọt sự kiện lên phần tử cha).
- `.once`: Chỉ kích hoạt sự kiện 1 lần duy nhất.
- `.self`: Chỉ kích hoạt nếu sự kiện xuất phát từ chính phần tử đó chứ không phải từ con.

### Câu 20: Trong template Vue 3, cơ chế Unwrapping tự động của `ref` áp dụng trong trường hợp nào và trường hợp nào bắt buộc phải viết `.value`?
- [x] Vue tự động unwrap các `ref` ở cấp cao nhất (top-level properties) trong ngữ cảnh template; nhưng nếu `ref` nằm sâu trong một plain object lồng nhau (ví dụ: `obj.count`), ta bắt buộc phải viết `{{ obj.count.value }}` (trừ khi object đó được bọc bởi `reactive`).
- [ ] Vue tự động unwrap `ref` ở mọi cấp độ không giới hạn; không bao giờ cần viết `.value` trong bất kỳ biểu thức template nào.
- [ ] Vue chỉ unwrap `ref` khi dùng trong các directive (`v-if`, `v-for`), còn trong cú pháp nội suy `{{ }}` luôn bắt buộc phải viết `.value`.
- [ ] Cơ chế unwrap chỉ hoạt động với `ref` chứa số nguyên, còn `ref` chứa chuỗi (string) hoặc boolean thì bắt buộc phải viết `.value`.

> **Giải thích:** Để mang lại trải nghiệm viết mã ngắn gọn và tự nhiên, Vue Compiler tự động nhận diện và unwrap các `ref` nằm ở top-level của template. Tuy nhiên lưu ý: Nếu ref nằm sâu trong object (ví dụ `{{ obj.nestedRef }}`), Vue sẽ không tự unwrap được mà phải viết rõ `{{ obj.nestedRef.value }}` trừ khi bọc ngoài là `reactive`.
