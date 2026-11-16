# Form HTML: nền tảng trước khi có framework

Trước khi React hay bất kỳ thư viện nào "kiểm soát" một ô nhập liệu (xem [Forms cơ bản trong React](/go?p=09-React%2Feasy%2Flt-31-forms-co-ban.md)), trình duyệt đã tự biết làm rất nhiều việc với form: kiểm tra định dạng email, bắt buộc một trường không được để trống, giới hạn một số trong khoảng cho phép — tất cả chỉ bằng attribute, không một dòng JavaScript. Bài này ở lớp dưới cùng: form như một tài liệu HTML thuần, độc lập với bất kỳ framework nào. Hiểu lớp này giúp bạn tận dụng được validate có sẵn của trình duyệt thay vì tự viết lại toàn bộ bằng tay, và hiểu đúng vì sao form submit lại tải lại trang nếu bạn quên `preventDefault`.

**Tóm tắt:**

- `<label>` phải gắn với input qua `for`/`id` (hoặc bọc input bên trong) — thiếu liên kết này, người dùng không thể bấm vào nhãn để focus input, và trình đọc màn hình không đọc được tên trường.
- `type` của `<input>` không chỉ đổi giao diện: `email`/`number`/`date`/`tel` kích hoạt bàn phím phù hợp trên di động và validate định dạng sẵn có của trình duyệt.
- `required`, `pattern`, `min`/`max`, `minlength`/`maxlength` là validate **phía trình duyệt**, chạy trước khi form submit, không thay thế được validate phía server.
- `<fieldset>` + `<legend>` nhóm các input liên quan lại với một tên nhóm — quan trọng với trình đọc màn hình khi có nhiều radio/checkbox cùng chủ đề.
- Form mặc định submit bằng GET (dữ liệu nằm trên URL, có thể bookmark/share, không nên dùng cho dữ liệu nhạy cảm) hoặc POST (dữ liệu nằm trong request body).
- Upload file bắt buộc `enctype="multipart/form-data"`; quên thuộc tính này thì file không hề được gửi đi dù giao diện vẫn hiện tên file đã chọn.
- Constraint Validation API (`checkValidity()`, `reportValidity()`, `setCustomValidity()`) cho phép JavaScript đọc/ghi trạng thái validate gốc của trình duyệt thay vì tự dựng một hệ thống báo lỗi riêng từ đầu.

## Liên kết `label` với input

```html
<!-- Cách 1: for/id -->
<label for="email">Email</label>
<input id="email" type="email" name="email">

<!-- Cách 2: bọc input bên trong label (không cần for/id) -->
<label>
  Email
  <input type="email" name="email">
</label>
```

**Phải thuộc:** Thiếu liên kết `label`↔`input` (ví dụ chỉ đặt một đoạn text cạnh input mà không dùng `<label>`), vùng bấm được để focus input chỉ còn đúng input đó, nhỏ hơn hẳn so với bấm được cả vùng chữ — một lỗi UX nhỏ trên desktop nhưng rất khó chịu trên di động, và là lỗi accessibility bị quét ra ngay bởi mọi công cụ kiểm tra tự động.

## `type` quyết định hành vi, không chỉ hình dạng

| `type` | Hành vi trình duyệt tự có |
|---|---|
| `email` | Bàn phím di động hiện `@`; validate định dạng `x@y.z` cơ bản (không đảm bảo email tồn tại) |
| `number` | Bàn phím số; nút tăng/giảm; `min`/`max`/`step` giới hạn giá trị |
| `date` / `time` / `datetime-local` | Hiện date picker gốc của hệ điều hành, giá trị trả về luôn chuẩn ISO (`YYYY-MM-DD`...) |
| `tel` | Bàn phím số điện thoại trên di động; **không** tự validate định dạng (số điện thoại có quá nhiều định dạng hợp lệ theo từng nước) |
| `url` | Validate chuỗi phải có dạng URL hợp lệ (có scheme) |
| `password` | Ẩn ký tự khi gõ; trình duyệt có thể đề xuất lưu/generate mật khẩu |
| `checkbox` / `radio` | `checkbox` chọn độc lập nhiều cái; `radio` cùng `name` thì chỉ chọn được một |
| `file` | Mở hộp thoại chọn file hệ điều hành; cần `accept` để gợi ý loại file |

**Nền tảng:** Toàn bộ validate ở trên diễn ra **trước khi** sự kiện `submit` được bắn ra, hoàn toàn bằng engine của trình duyệt, không tốn một dòng JavaScript. Nếu một trường `required` đang trống hoặc một `email` sai định dạng, trình duyệt tự chặn submit và hiện tooltip báo lỗi bản địa hóa theo ngôn ngữ hệ thống — đây chính là validate "miễn phí" mà nhiều lập trình viên bỏ qua vì không biết nó tồn tại, rồi tự viết lại y hệt bằng JavaScript.

## Attribute validate có sẵn

```html
<input type="text" name="username" required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+">
<input type="number" name="age" min="0" max="150" step="1">
```

| Attribute | Áp dụng cho | Ý nghĩa |
|---|---|---|
| `required` | Hầu hết input | Không được để trống |
| `pattern` | `text`, `tel`, `email`... | Regex mà giá trị phải khớp (không có dấu `/` bao quanh, không có flag) |
| `minlength` / `maxlength` | Input dạng text | Số ký tự tối thiểu/tối đa |
| `min` / `max` / `step` | `number`, `date`, `range` | Giá trị nhỏ nhất/lớn nhất, bước nhảy |

**Suy luận:** Vì sao validate phía trình duyệt **không bao giờ** được xem là đủ, dù nó chạy đúng? Vì bất kỳ ai cũng có thể gửi request trực tiếp tới server (qua `curl`, Postman, hay chỉnh sửa request bằng DevTools) mà hoàn toàn bỏ qua trình duyệt và mọi `required`/`pattern` của nó. Validate phía trình duyệt chỉ cải thiện **trải nghiệm** của người dùng hợp tác (phản hồi tức thì, không cần round-trip tới server để biết sai) — nó không phải, và không thể là, một lớp bảo mật hay toàn vẹn dữ liệu. Server luôn phải validate lại từ đầu, coi như phía client không hề validate gì cả.

## `fieldset` và `legend`

```html
<fieldset>
  <legend>Giới tính</legend>
  <label><input type="radio" name="gt" value="nam"> Nam</label>
  <label><input type="radio" name="gt" value="nu"> Nữ</label>
</fieldset>
```

**Phải thuộc:** Với một nhóm `radio` cùng `name`, nếu không bọc trong `fieldset`/`legend`, trình đọc màn hình đọc từng lựa chọn rời rạc mà không nói cho người dùng biết "đây là nhóm chọn giới tính" — người dùng nghe tên "Nam", "Nữ" mà không có ngữ cảnh nhóm. `legend` chính là cái tên ngữ cảnh đó, đọc trước mỗi lựa chọn con.

## GET và POST khi submit

```html
<form action="/tim-kiem" method="GET">
  <input type="text" name="q">
</form>
<!-- Submit "react" -> điều hướng tới /tim-kiem?q=react -->

<form action="/dang-ky" method="POST" enctype="multipart/form-data">
  <input type="text" name="ten">
  <input type="file" name="avatar">
</form>
<!-- Dữ liệu nằm trong request body, không hiện trên URL -->
```

| | GET | POST |
|---|---|---|
| Dữ liệu nằm ở | Query string trên URL | Request body |
| Bookmark / chia sẻ link được không | Được (kết quả tìm kiếm là ví dụ kinh điển) | Không — URL không mang dữ liệu đã gửi |
| Giới hạn độ dài | Có (tùy trình duyệt/server, thường vài nghìn ký tự) | Về lý thuyết không giới hạn bởi HTTP |
| Dùng cho dữ liệu nhạy cảm | Không — URL bị lưu trong lịch sử trình duyệt, log server, có thể lộ qua `Referer` header | Phù hợp hơn, nhưng vẫn cần HTTPS để mã hóa trên đường truyền |

**Phải thuộc:** `enctype="multipart/form-data"` là bắt buộc khi form có `<input type="file">` — mặc định `enctype` là `application/x-www-form-urlencoded`, encoding này **không mang được dữ liệu nhị phân của file**, nên thiếu attribute này thì file bị âm thầm bỏ qua lúc submit, trong khi giao diện vẫn hiện đúng tên file người dùng vừa chọn, khiến lỗi rất khó nhận ra nếu không kiểm tra network request thực tế.

## Constraint Validation API: khi JavaScript cần can thiệp

```js
const input = document.querySelector('input[name="username"]');
input.checkValidity();            // true/false, không hiện UI
input.reportValidity();           // chạy check + hiện tooltip lỗi nếu có
input.setCustomValidity('Tên đã tồn tại'); // đặt lỗi tùy biến (ví dụ sau khi gọi API kiểm tra)
input.setCustomValidity('');      // phải tự xóa lỗi tùy biến, nếu không input coi như luôn invalid
```

Đã chạy đoạn trên trong console trình duyệt trên một input thường: `checkValidity()` trả `false` khi input đang trống và có `required`, không hiện gì trên giao diện; `reportValidity()` trả `false` tương tự nhưng đồng thời làm input nhận focus và hiện tooltip lỗi mặc định của trình duyệt. Gọi `setCustomValidity('một chuỗi khác rỗng')` khiến `checkValidity()` luôn trả `false` cho tới khi gọi lại `setCustomValidity('')` — trình duyệt không tự xóa lỗi tùy biến dù người dùng đã sửa giá trị.

**Bẫy thường gặp:** quên gọi `setCustomValidity('')` sau khi lỗi tùy biến đã được xử lý (ví dụ server xác nhận username giờ đã hợp lệ) khiến input bị kẹt ở trạng thái invalid vĩnh viễn dù giá trị hiện tại hoàn toàn hợp lệ.

## Khi nào cần đào sâu, khi nào không

Với form đơn giản (liên hệ, đăng ký cơ bản), attribute validate có sẵn của trình duyệt thường là đủ, không cần viết thêm JavaScript. Khi form phức tạp hơn (validate chéo giữa nhiều trường, validate bất đồng bộ gọi API, hiển thị lỗi theo thiết kế riêng thay vì tooltip mặc định của trình duyệt), đó là lúc cần một thư viện quản lý form ở tầng framework — xem [Forms cơ bản trong React](/go?p=09-React%2Feasy%2Flt-31-forms-co-ban.md) cho bước tiếp theo, hoặc bài về React Hook Form/Zod trong [Routing, forms và data fetching](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md) cho form thực chiến quy mô lớn.

## Điều cần nhớ

- Validate phía trình duyệt (`required`, `pattern`, `type`...) cải thiện trải nghiệm, không thay thế được validate phía server.
- `label` phải liên kết đúng với input qua `for`/`id` hoặc lồng nhau — đây là lỗi accessibility phổ biến và dễ bỏ sót nhất.
- Upload file luôn cần `enctype="multipart/form-data"`, nếu không file bị âm thầm bỏ qua khi submit.
