# Trắc nghiệm chuyên sâu: JavaScript Core & Cơ chế hoạt động

## 1. Concurrency, Event Loop và Scope

### Câu 1: Thứ tự in ra console của đoạn mã sau là gì: `console.log(1); setTimeout(() => console.log(2), 0); Promise.resolve().then(() => console.log(3)); console.log(4);`?
- [x] `1, 4, 3, 2` - Vì code đồng bộ chạy trước (1, 4), sau đó Event Loop ưu tiên giải phóng toàn bộ Microtask queue (Promise: 3) rồi mới lấy tác vụ từ Macrotask queue (setTimeout: 2).
- [ ] `1, 2, 3, 4` - Vì JavaScript thực thi tuần tự từ trên xuống dưới theo thứ tự xuất hiện của mã nguồn.
- [ ] `1, 4, 2, 3` - Vì `setTimeout` với thời gian trễ 0ms được kích hoạt trước khi Microtask queue kịp đăng ký callback.
- [ ] `1, 3, 4, 2` - Vì Promise là tác vụ ưu tiên cao nhất nên callback của nó được chèn vào thực thi ngay giữa các lệnh đồng bộ.

> **Giải thích:** Trong một vòng lặp sự kiện (Event Loop tick): Toàn bộ Call Stack đồng bộ chạy xong -> Engine xử lý hết Microtask Queue (`Promise.then`, `queueMicrotask`, `MutationObserver`) -> Engine mới bốc 1 task từ Macrotask Queue (`setTimeout`, `setInterval`, I/O). Do đó `3` (Microtask) luôn chạy trước `2` (Macrotask).

### Câu 2: Đoạn mã `console.log(typeof null)` trả về kết quả gì và nguyên nhân kỹ thuật là gì?
- [x] Trả về `"object"` - Đây là một lỗi thiết kế lịch sử từ phiên bản đầu tiên của JavaScript, do giá trị `null` được biểu diễn bằng bit cờ nhị phân `000` trùng với mã nhận diện kiểu Object reference.
- [ ] Trả về `"null"` - Vì null là một kiểu dữ liệu nguyên thủy (primitive) độc lập được ECMAScript định nghĩa riêng biệt.
- [ ] Trả về `"undefined"` - Vì trong JavaScript, null và undefined được engine gom chung thành cùng một kiểu dữ liệu rỗng.
- [ ] Trả về `"primitive"` - Vì engine tự động chuyển đổi các kiểu giá trị cơ bản thành định danh phân loại trừu tượng.

> **Giải thích:** Trong bản thiết kế ban đầu của JS năm 1995 của Brendan Eich, kiểu giá trị được lưu ở 3 bit cuối: `000` đại diện cho Object reference. Con trỏ null là địa chỉ 0x00 (toàn bit 0), dẫn đến kiểm tra type tag nhận diện nhầm `null` là object. Lỗi này được giữ nguyên đến nay để tránh phá vỡ tương thích ngược của hàng triệu trang web cổ điển.

### Câu 3: Khái niệm "Temporal Dead Zone" (TDZ) trong JavaScript ES6 xảy ra đối với các khai báo biến nào và hành vi cụ thể là gì?
- [x] Biến khai báo bằng `let` và `const` - Chúng được hoisted lên đầu block scope nhưng chưa được gán giá trị khởi tạo; truy cập vào biến trước dòng khai báo sẽ ném lỗi `ReferenceError`.
- [ ] Biến khai báo bằng `var` - Vì biến var không được cấp phát vùng nhớ trong Call Stack cho đến khi câu lệnh gán được thực thi.
- [ ] Áp dụng cho các hàm khai báo dạng Function Declaration - Vì hàm chỉ có thể được gọi sau khi toàn bộ file JavaScript đã được nạp xong.
- [ ] Biến khai báo bằng `let` và `const` - Nhưng khi truy cập trước dòng khai báo thì engine tự động trả về giá trị `undefined` mà không báo lỗi.

> **Giải thích:** Cả `var`, `let`, `const` đều được hoist. Nhưng `var` được khởi tạo ngay với giá trị `undefined` khi vào scope (truy cập trước không lỗi mà ra `undefined`). Trong khi đó, `let` và `const` nằm trong "vùng chết tạm thời" (TDZ) từ đầu block cho đến khi dòng khai báo được thực thi.

### Câu 4: Trong JavaScript, Arrow Function (`() => {}`) khác biệt gì lớn nhất so với hàm thông thường (`function() {}`) về từ khóa `this`?
- [x] Arrow function không tự tạo ngữ cảnh `this` riêng mà kế thừa (lexical binding) `this` từ scope bao quanh tại thời điểm định nghĩa; và không thể dùng làm constructor (không thể gọi bằng `new`).
- [ ] Arrow function tự động liên kết `this` vào đối tượng toàn cục (`window`/`globalThis`) trong mọi trường hợp bất kể vị trí định nghĩa.
- [ ] Arrow function cho phép ghi đè ngữ cảnh `this` linh hoạt hơn bằng cách gọi các phương thức `call()`, `apply()` hoặc `bind()`.
- [ ] Arrow function chỉ có thể truy cập biến cục bộ của chính nó và hoàn toàn không thể đọc biến từ scope cha bên ngoài.

> **Giải thích:** Arrow function không có thuộc tính `[[Construct]]` (gọi `new` sẽ báo lỗi), không có thuộc tính `prototype`, không có `arguments`, và không tự tạo binding cho `this`. Giá trị `this` bên trong arrow function tương đương với `this` ở scope ngoài nó (Lexical this), và các hàm `call()`, `apply()`, `bind()` không thể thay đổi được `this` của arrow function.

### Câu 5: Kết quả của biểu thức `[] == ![]` trong JavaScript là gì và theo cơ chế ép kiểu (Type Coercion) nào?
- [x] Trả về `true` - Vì `![]` ép kiểu sang boolean thành `false`, sau đó phép so sánh trừu tượng `[] == false` tiếp tục ép cả hai vế về dạng số nguyên: `"" == 0` -> `0 == 0` thành `true`.
- [ ] Trả về `false` - Vì hai mảng là hai vùng nhớ độc lập trong Heap nên phép so sánh luôn cho kết quả sai.
- [ ] Báo lỗi runtime `TypeError: Cannot compare array with boolean` do JavaScript là ngôn ngữ định kiểu an toàn.
- [ ] Trả về `NaN` - Vì toán tử phủ định `!` không thể áp dụng trên đối tượng kiểu dữ liệu mảng rỗng.

> **Giải thích:** Thuật toán Abstract Equality Comparison (ECMAScript):
1. `![]` là phủ định của truthy object -> thành boolean `false`.
2. Biểu thức thành `[] == false`. Khi so sánh Object với Boolean, boolean đổi thành số: `false` -> `0`.
3. Biểu thức thành `[] == 0`. Object đổi sang nguyên thủy bằng `[].valueOf()` rồi `[].toString()` -> chuỗi rỗng `""`.
4. Cuối cùng so sánh `"" == 0` -> `Number("")` là `0` -> `0 == 0` là `true`.

### Câu 6: Khái niệm "Closure" (Bao đóng) trong JavaScript được định nghĩa chính xác nhất là gì?
- [x] Là một hàm có khả năng ghi nhớ và truy cập vào các biến thuộc phạm vi từ vựng (Lexical Scope) của hàm cha bao quanh nó, ngay cả khi hàm cha đó đã hoàn tất thực thi và rời khỏi Call Stack.
- [ ] Là kỹ thuật sử dụng `Object.freeze()` để khóa cứng toàn bộ thuộc tính của một object nhằm ngăn chặn việc sửa đổi.
- [ ] Là một hàm đệ quy tự gọi chính nó liên tục cho đến khi đạt điều kiện dừng để giải phóng tài nguyên.
- [ ] Là cơ chế tự động giải phóng vùng nhớ của các biến cục bộ ngay khi hàm kết thúc để chống rò rỉ bộ nhớ.

> **Giải thích:** Khi một hàm được tạo ra trong JS, nó luôn giữ một liên kết ẩn tới môi trường mà nó sinh ra thông qua thuộc tính nội bộ `[[Environment]]`. Dù hàm cha đã kết thúc (stack frame của cha đã pop ra), các biến mà hàm con vẫn tham chiếu tới sẽ không bị bộ gom rác Garbage Collector thu hồi, tạo nên Closure. Ứng dụng: Tạo biến private, currying, module pattern.

### Câu 7: Điểm khác biệt giữa thuộc tính `prototype` của hàm constructor và thuộc tính `__proto__` của một instance đối tượng là gì?
- [x] `prototype` là thuộc tính của hàm Constructor dùng làm bản thiết kế khuôn mẫu khi tạo object mới qua `new`; còn `__proto__` là con trỏ của instance trỏ tới prototype của Constructor đã sinh ra nó.
- [ ] `prototype` là thuộc tính chỉ đọc của instance; còn `__proto__` là phương thức dùng để thêm thuộc tính mới vào hàm khởi tạo.
- [ ] `prototype` chứa các phương thức tĩnh (static methods); còn `__proto__` chứa các biến trạng thái nội bộ của class.
- [ ] Hai thuộc tính này thực chất là cùng một con trỏ tham chiếu đến cùng một vùng nhớ và có thể dùng thay thế cho nhau ở mọi ngữ cảnh.

> **Giải thích:** Khi bạn tạo `function Person() {}` và `const p = new Person()`, JavaScript gán: `p.__proto__ === Person.prototype`. Khi bạn truy cập `p.sayHello()`, nếu trong `p` không có, JavaScript Engine sẽ lần theo con trỏ `p.__proto__` để tìm trong `Person.prototype`. Chuỗi các con trỏ `__proto__` này tạo nên "Prototype Chain", điểm dừng cuối cùng trỏ về `Object.prototype.__proto__ === null`.

### Câu 8: Điểm khác biệt căn bản giữa ba phương thức `call()`, `apply()` và `bind()` trong JavaScript là gì?
- [x] `call` và `apply` thực thi hàm NGAY LẬP TỨC với `this` được chỉ định (khác nhau ở chỗ `call` nhận tham số rời rạc, `apply` nhận mảng tham số); còn `bind` KHÔNG thực thi ngay mà trả về một hàm mới đã được ghim cố định `this`.
- [ ] `call` thực thi đồng bộ, `apply` thực thi bất đồng bộ, còn `bind` chỉ dùng được trong môi trường Node.js.
- [ ] `call` và `bind` nhận đối số dạng danh sách phẩy, còn `apply` bắt buộc phải truyền đối số dưới dạng một đối tượng JSON.
- [ ] `bind` cho phép thay đổi `this` nhiều lần sau đó, trong khi `call` và `apply` chỉ có thể gán `this` duy nhất một lần.

> **Giải thích:**
- `fn.call(thisArg, arg1, arg2)`: Thực thi ngay, truyền đối số dạng danh sách phẩy.
- `fn.apply(thisArg, [arg1, arg2])`: Thực thi ngay, truyền đối số dạng mảng (Array).
- `const newFn = fn.bind(thisArg, arg1)`: Trả về một hàm mới đã được "ghim" cứng `this` và đối số ban đầu (Currying/Partial application), khi nào cần mới gọi `newFn()`.

### Câu 9: Để thực hiện việc Sao chép sâu (Deep Clone) một đối tượng phức tạp có chứa kiểu dữ liệu `Date`, `Map`, `Set` và hỗ trợ cả tham chiếu vòng (Circular Reference) bằng chuẩn JavaScript hiện đại, phương pháp nào là tối ưu nhất?
- [x] Dùng hàm tích hợp sẵn `structuredClone(obj)`.
- [ ] Dùng cú pháp `JSON.parse(JSON.stringify(obj))`.
- [ ] Dùng hàm `Object.assign({}, obj)`.
- [ ] Dùng cú pháp Spread `{ ...obj }`.

> **Giải thích:** 
- Spread `{ ...obj }` và `Object.assign` chỉ là sao chép nông (Shallow Copy).
- `JSON.parse(JSON.stringify)` bị mất hàm (`function`), biến `undefined`, biến `Date` thành string, mất `Map`/`Set` và văng lỗi ngay nếu object có tham chiếu vòng (`obj.self = obj`).
- `structuredClone` (có sẵn từ Node 17+ và mọi trình duyệt hiện đại) là chuẩn web hỗ trợ deep clone trọn vẹn thuật toán Structured Clone Algorithm.

### Câu 10: Cấu trúc dữ liệu `WeakMap` khác biệt gì so với `Map` thông thường trong JavaScript?
- [x] Khóa (Key) của `WeakMap` bắt buộc phải là một Object và các khóa này được giữ bằng tham chiếu yếu (Weak Reference); nếu không còn biến nào khác trỏ tới Object đó, nó sẽ tự động bị Garbage Collector thu hồi.
- [ ] `WeakMap` cho phép lưu trữ số lượng phần tử không giới hạn, còn `Map` bị giới hạn tối đa 1.000 phần tử.
- [ ] `WeakMap` hỗ trợ việc duyệt qua các phần tử bằng `for...of` và thuộc tính `.size`, trong khi `Map` thì không hỗ trợ.
- [ ] Khóa của `WeakMap` bắt buộc phải là kiểu nguyên thủy (string, number), còn `Map` chỉ chấp nhận khóa là function.

> **Giải thích:** Vì các key được giữ bằng Weak Reference, `WeakMap` không ngăn cản bộ gom rác dọn dẹp object. Do đó, `WeakMap` không có thuộc tính `.size`, không thể duyệt bằng vòng lặp (`not iterable`) vì rác có thể bị dọn bất cứ lúc nào. Ứng dụng kinh điển: Lưu trữ dữ liệu private của DOM node hoặc cache metadata của đối tượng.

### Câu 11: Điểm khác biệt bản chất giữa hệ thống module CommonJS (`require` / `module.exports`) và ES Modules (`import` / `export`) là gì?
- [x] CommonJS nạp module đồng bộ lúc runtime và sao chép giá trị (value copy); còn ES Modules có cấu trúc tĩnh (static), được phân tích và liên kết trước khi thực thi, hỗ trợ Tree-Shaking và liên kết tham chiếu động (live bindings).
- [ ] CommonJS luôn thực thi bất đồng bộ thông qua Promise; còn ES Modules bắt buộc phải nạp toàn bộ mã nguồn đồng bộ vào bộ nhớ.
- [ ] CommonJS hỗ trợ nạp module có chọn lọc theo từng hàm (named imports); còn ES Modules bắt buộc phải nạp toàn bộ module một lúc.
- [ ] CommonJS chỉ sử dụng được khi chạy trên trình duyệt web; còn ES Modules là chuẩn chuyên dụng của máy chủ Node.js.

> **Giải thích:** Khi dùng `require()`, code chạy đến đâu nạp đến đó (có thể đặt `require` trong câu lệnh `if`). Với ES Modules, mọi câu lệnh `import` được hoisting và phân tích tĩnh thành đồ thị phụ thuộc trước khi bất kỳ dòng code nào chạy. ES Modules xuất ra các Live Bindings (khi giá trị trong module nguồn đổi, bên import tự thấy giá trị mới), trong khi CommonJS chỉ copy giá trị tại thời điểm export.

### Câu 12: Thứ tự chuẩn của các giai đoạn trong cơ chế lan truyền sự kiện (Event Propagation) theo tiêu chuẩn W3C là gì?
- [x] 1) Capturing Phase (Sự kiện đi từ Window/Document xuống phần tử mục tiêu) -> 2) Target Phase (Tại phần tử mục tiêu) -> 3) Bubbling Phase (Sự kiện nổi bọt ngược từ phần tử mục tiêu lên lại Window).
- [ ] 1) Bubbling Phase (Nổi bọt từ mục tiêu lên Window) -> 2) Target Phase -> 3) Capturing Phase (Truyền ngược từ Window xuống lại mục tiêu).
- [ ] 1) Target Phase (Xử lý tại mục tiêu) -> 2) Broadcast Phase (Gửi sự kiện đồng thời đến tất cả các phần tử ngang hàng trong DOM).
- [ ] 1) Compile Phase (Phân tích cú pháp sự kiện) -> 2) Dispatch Phase (Gửi trực tiếp đến phần tử mục tiêu mà không qua cây tổ tiên).

> **Giải thích:** Khi bạn bấm vào một nút `<button>` bên trong `<div>`: 1) Sự kiện đi từ đỉnh `window -> document -> html -> body -> div -> button` (Capturing phase); 2) Kích hoạt tại nút `button` (Target phase); 3) Sự kiện nổi bọt ngược trở lại `button -> div -> body -> html -> document -> window` (Bubbling phase). Mặc định `addEventListener` lắng nghe ở pha Bubbling; truyền `{ capture: true }` để lắng nghe ở pha Capturing.

### Câu 13: Phương thức `event.stopPropagation()` khác biệt gì so với `event.stopImmediatePropagation()`?
- [x] `stopPropagation` ngăn sự kiện tiếp tục nổi bọt lên các phần tử tổ tiên; còn `stopImmediatePropagation` vừa ngăn nổi bọt lên tổ tiên, VỪA ngăn chặn các listener khác được gắn trên CÙNG PHẦN TỬ ĐÓ được thực thi tiếp.
- [ ] `stopPropagation` chỉ áp dụng cho sự kiện chuột (`click`), còn `stopImmediatePropagation` chỉ dùng cho sự kiện bàn phím (`keydown`).
- [ ] `stopPropagation` ngăn chặn hành vi mặc định của thẻ HTML (như submit form); còn `stopImmediatePropagation` chỉ dừng việc nổi bọt sự kiện.
- [ ] `stopPropagation` chỉ dừng pha Capturing, còn `stopImmediatePropagation` chỉ dừng pha Bubbling.

> **Giải thích:** Nếu một nút bấm có 3 listener cùng lắng nghe sự kiện `click` (`btn.addEventListener('click', fn1)`, `fn2`, `fn3`). Nếu trong `fn1` bạn gọi `e.stopPropagation()`, thì `fn2` và `fn3` vẫn được thực thi bình thường (chỉ có thẻ cha của nút bấm không nhận được event). Nhưng nếu gọi `e.stopImmediatePropagation()`, `fn2` và `fn3` sẽ bị chặn đứng lập tức và không được gọi.

### Câu 14: Hàm Generator (`function*`) trong JavaScript kiểm soát việc tạm dừng và tiếp tục thực thi mã nguồn bằng cơ chế nào?
- [x] Tạm dừng hàm bằng từ khóa `yield` (trả về giá trị hiện tại) và tiếp tục thực thi bằng cách gọi phương thức `.next()` trên đối tượng Generator Iterator.
- [ ] Tạm dừng hàm bằng từ khóa `await` và tiếp tục chạy khi có sự kiện `resolved` được kích hoạt từ Event Loop.
- [ ] Tạm dừng hàm bằng câu lệnh `return` và tiếp tục bằng cách gọi lại tên hàm với các tham số ban đầu.
- [ ] Tạm dừng hàm bằng lệnh `break` và tiếp tục thực thi chu kỳ tiếp theo bằng lệnh `continue`.

> **Giải thích:** Generator function trả về một Iterator. Khi gọi `gen.next()`, hàm thực thi cho đến khi chạm từ khóa `yield value`, nó tạm dừng lại và trả về `{ value, done: false }`. Lần gọi `gen.next()` tiếp theo sẽ khôi phục lại trạng thái hàm và chạy tiếp từ vị trí tạm dừng đó. Đây chính là nền tảng nguyên lý bên dưới của cú pháp `async / await`.

### Câu 15: Đối tượng `Proxy` trong JavaScript cung cấp khả năng nào sau đây?
- [x] Cho phép can thiệp và định nghĩa lại các hành vi cơ bản của một đối tượng (như đọc thuộc tính `get`, ghi thuộc tính `set`, kiểm tra tồn tại `has`, xóa thuộc tính `deleteProperty`) thông qua các hàm bẫy (Traps).
- [ ] Cho phép sao chép sâu toàn bộ cây đối tượng mà không tốn dung lượng bộ nhớ heap.
- [ ] Tự động chuyển đổi các phương thức đồng bộ của một class thành các hàm bất đồng bộ trả về Promise.
- [ ] Cho phép một đối tượng có thể kế thừa cùng lúc từ nhiều class cha khác nhau (Multiple Inheritance).

> **Giải thích:** `const proxy = new Proxy(target, handler)`. Handler chứa các hàm bẫy (Traps) như `get(target, prop, receiver)` và `set(...)`. Mỗi khi có thao tác truy cập thuộc tính trên proxy, hàm bẫy tương ứng được kích hoạt. Proxy chính là nền tảng cốt lõi xây dựng hệ thống Reactivity của Vue 3 và MobX.

### Câu 16: Sự khác biệt kỹ thuật giữa `Object.freeze()` và `Object.seal()` là gì?
- [x] `Object.freeze()` ngăn chặn việc thêm, xóa thuộc tính và KHÔNG CHO PHÉP sửa đổi giá trị hiện có; còn `Object.seal()` ngăn việc thêm và xóa thuộc tính nhưng VẪN CHO PHÉP sửa đổi giá trị của các thuộc tính hiện có.
- [ ] `Object.freeze()` thực hiện đóng băng sâu (deep freeze) toàn bộ các object lồng nhau; còn `Object.seal()` chỉ đóng băng tầng đầu tiên.
- [ ] `Object.freeze()` chỉ áp dụng được cho mảng; còn `Object.seal()` chỉ áp dụng được cho các đối tượng plain object.
- [ ] `Object.freeze()` xóa bỏ toàn bộ prototype chain của đối tượng; còn `Object.seal()` vẫn giữ lại prototype chain nguyên vẹn.

> **Giải thích:** 
- `Object.seal(obj)`: Đặt `configurable: false` cho mọi thuộc tính (không thêm mới, không xóa được), nhưng `writable` vẫn là true nên bạn vẫn gán `obj.name = "new"` được.
- `Object.freeze(obj)`: Đặt cả `configurable: false` và `writable: false` (khóa cứng 100%, không thể sửa giá trị). Lưu ý: Cả hai chỉ đóng băng ở tầng nông (Shallow).

### Câu 17: Kiểu dữ liệu nguyên thủy `Symbol` trong JavaScript mang lại đặc tính kỹ thuật cốt lõi nào?
- [x] Luôn sinh ra một giá trị duy nhất (unique) và bất biến, thường được dùng làm khóa thuộc tính để tránh xung đột tên thuộc tính khi mở rộng object và bị bỏ qua trong các phép duyệt thuộc tính thông thường (`for...in`, `Object.keys`).
- [ ] Tự động chuyển đổi thành một số nguyên tự tăng khi thực hiện các phép toán số học.
- [ ] Cho phép định nghĩa các thuộc tính có khả năng tự động unwrap giá trị khi gọi trong template HTML.
- [ ] Là một cấu trúc dữ liệu lưu trữ các cặp key-value có thứ tự tương tự như mảng.

> **Giải thích:** Mỗi lần gọi `Symbol("desc")` đều sinh ra một giá trị độc nhất vô nhị trong bộ nhớ (`Symbol("id") === Symbol("id")` ra `false`). Các thuộc tính có key là Symbol sẽ bị bỏ qua trong `for...in`, `Object.keys()` và `JSON.stringify()`, giúp thư viện bên ngoài có thể gắn metadata vào object mà không sợ xung đột tên thuộc tính của người dùng.

### Câu 18: Kỹ thuật Currying trong Functional Programming với JavaScript được hiểu chính xác là gì?
- [x] Chuyển đổi một hàm nhận nhiều đối số `f(a, b, c)` thành một chuỗi các hàm lồng nhau mà mỗi hàm chỉ nhận một đối số duy nhất: `f(a)(b)(c)`.
- [ ] Kỹ thuật thực thi hàm nhiều lần lặp đi lặp lại cho đến khi hàm trả về kết quả khác null.
- [ ] Kỹ thuật gộp nhiều hàm độc lập thành một hàm duy nhất để giảm thiểu số lượng lời gọi trong Call Stack.
- [ ] Kỹ thuật ghi nhớ (memoization) kết quả của một hàm dựa trên tham số truyền vào để tăng tốc độ tính toán.

> **Giải thích:** Currying tận dụng Closure để lưu trữ dần dần các tham số qua từng lượt gọi: `const add = a => b => a + b; const add5 = add(5); console.log(add5(3)); // 8`. Kỹ thuật này giúp tái sử dụng hàm cực kỳ cao, tạo ra các hàm chuyên biệt hóa (higher-order functions) từ một hàm tổng quát.

### Câu 19: Toán tử Nullish Coalescing (`??`) khác biệt gì so với toán tử OR logic (`||`) trong việc chọn giá trị mặc định?
- [x] `??` chỉ trả về vế phải khi vế trái là `null` hoặc `undefined`; còn `||` trả về vế phải với BẤT KỲ giá trị falsy nào của vế trái (bao gồm cả số `0`, chuỗi rỗng `""`, `NaN`, và `false`).
- [ ] `??` chỉ kiểm tra kiểu dữ liệu boolean, còn `||` kiểm tra mọi kiểu dữ liệu trong JavaScript.
- [ ] `??` luôn đánh giá cả hai vế cùng một lúc, còn `||` áp dụng cơ chế short-circuiting chỉ đánh giá vế đầu tiên.
- [ ] `??` ném ra ngoại lệ nếu vế trái chưa được khai báo, còn `||` tự động gán giá trị mặc định mà không báo lỗi.

> **Giải thích:** Đây là lỗi kinh điển khi gán giá trị mặc định: `const timeout = userConfig.timeout || 3000`. Nếu người dùng chủ ý cấu hình `timeout = 0`, toán tử `||` coi `0` là falsy và gán nhầm thành `3000`! Dùng `userConfig.timeout ?? 3000` sẽ giữ nguyên giá trị `0` vì `0` không phải là `null` hay `undefined`.

### Câu 20: Trong cơ chế Garbage Collection của V8 Engine, thuật toán Mark-and-Sweep giải quyết nhược điểm gì của thuật toán Reference Counting cổ điển?
- [x] Giải quyết triệt để vấn đề rò rỉ bộ nhớ do tham chiếu vòng (Circular Reference) giữa các đối tượng không còn với tới được từ các nút gốc (GC Roots).
- [ ] Tăng tốc độ dọn dẹp bộ nhớ bằng cách giải phóng ngay lập tức các biến khi chúng vừa ra khỏi scope mà không cần đợi chu kỳ quét.
- [ ] Tự động nén toàn bộ bộ nhớ Heap về 0 byte sau mỗi lần thực thi hàm.
- [ ] Ngăn chặn việc tạo ra các biến toàn cục (global variables) trong mã nguồn JavaScript.

> **Giải thích:** Thuật toán Reference Counting cũ chỉ đếm số con trỏ trỏ tới object (nếu Object A trỏ B và B trỏ A thì count luôn >= 1, gây rò rỉ bộ nhớ vĩnh viễn). V8 sử dụng "Mark-and-Sweep": Xuất phát từ Root (biến toàn cục, call stack, DOM tree), duyệt theo đồ thị đối tượng và đánh dấu các node với tới được. Mọi đối tượng không được đánh dấu (không tiếp cận được từ Root) sẽ bị coi là rác và bị quét dọn sạch sẽ, dù chúng có tham chiếu vòng với nhau.
