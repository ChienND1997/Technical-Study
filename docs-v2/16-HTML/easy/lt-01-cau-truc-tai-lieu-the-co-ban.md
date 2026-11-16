# Cấu trúc tài liệu HTML và các thẻ cơ bản

Một trang web, dù phức tạp đến đâu, vẫn phải bắt đầu từ một file text thuần được trình duyệt đọc theo một quy tắc cố định: khai báo loại tài liệu, một phần `head` chứa thông tin về trang (không hiển thị), rồi một phần `body` chứa nội dung thật sự hiển thị. Bỏ qua quy tắc này, hoặc dùng sai thẻ cho sai mục đích, trang vẫn có thể "chạy được" trên màn hình của bạn nhưng lại render sai ở trình duyệt khác, đọc sai với người dùng khiếm thị, hoặc xếp hạng kém trên công cụ tìm kiếm — những lỗi không báo bằng thông báo đỏ nào cả.

**Tóm tắt:**

- `<!DOCTYPE html>` không phải thủ tục hình thức: thiếu nó trình duyệt chuyển sang "quirks mode", tái hiện lại hành vi CSS lỗi thời của IE5.
- `head` chứa metadata không hiển thị (title, charset, viewport, link CSS); `body` chứa mọi thứ người dùng thấy.
- Thẻ phải chọn theo **ý nghĩa** (heading, đoạn văn, danh sách, link) chứ không phải theo hình dáng hiển thị — hình dáng là việc của CSS.
- Phân cấp heading (`h1`→`h6`) phải liền mạch, không nhảy cóc, vì trình đọc màn hình và công cụ tìm kiếm dùng nó để hiểu cấu trúc tài liệu.
- Thuộc tính HTML (attribute, trong mã nguồn) và property DOM (trong JavaScript) là hai thứ khác nhau, đa số đồng bộ nhưng không phải luôn luôn (`value` của input là ví dụ kinh điển lệch nhau).
- Void element (`img`, `br`, `input`, `meta`...) không có thẻ đóng vì theo định nghĩa chúng không bao nội dung con.
- Viewport meta tag là điều kiện bắt buộc để responsive CSS hoạt động đúng trên di động, thiếu nó mọi `@media` gần như vô nghĩa trên điện thoại.

## Bộ khung tối thiểu của một trang HTML

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trang của tôi</title>
</head>
<body>
  <h1>Xin chào</h1>
</body>
</html>
```

**Nền tảng:** Trình duyệt đọc file từ trên xuống, nhưng xử lý theo hai vùng tách biệt: `head` — nơi khai báo "trang này là gì, cần tải thêm gì" — không hiển thị gì cả; `body` — nơi chứa nội dung thật sự được vẽ lên màn hình. Một thẻ đặt sai vùng (ví dụ `<title>` trong `body`) vẫn có thể được trình duyệt "tha thứ" và tự sửa, nhưng không nên trông cậy vào việc đó.

### `<!DOCTYPE html>` quan trọng thế nào

| Có DOCTYPE | Không có DOCTYPE |
|---|---|
| "Standards mode": trình duyệt render theo đặc tả CSS/HTML hiện hành | "Quirks mode": trình duyệt giả lập lại các lỗi render của trình duyệt cũ thập niên 1990 |
| `box-sizing`, `%` height, line-height tính đúng theo spec | Kích thước box, margin tính sai lệch theo quy tắc cũ |

**Phải thuộc:** `<!DOCTYPE html>` là dòng đầu tiên, không phân biệt hoa thường, không cần version (khác hẳn các DOCTYPE dài dòng của HTML4/XHTML) — đây là lý do nó trông "quá đơn giản để là thật", nhưng chính sự đơn giản đó là đặc điểm của HTML5.

## `head`: thông tin không hiển thị nhưng quyết định mọi thứ

| Thẻ | Vai trò |
|---|---|
| `<meta charset="UTF-8">` | Khai báo bảng mã ký tự; đặt sai thì chữ tiếng Việt hiển thị thành ký tự lạ |
| `<meta name="viewport" content="width=device-width, initial-scale=1.0">` | Báo trình duyệt di động không tự thu nhỏ trang để giả lập màn hình desktop |
| `<title>` | Tiêu đề tab trình duyệt, đồng thời là tiêu đề mặc định trên kết quả tìm kiếm |
| `<link rel="stylesheet" href="...">` | Nạp CSS ngoài |
| `<script src="...">` | Nạp JavaScript (vị trí và thuộc tính `async`/`defer` ảnh hưởng tới tốc độ render — xem [Rendering engine và parsing](/go?p=16-HTML%2Fhard%2Flt-07-rendering-engine-parsing-cham-doan.md)) |

**Suy luận:** Vì sao `charset` phải khai báo rất sớm trong `head` (thực tế: trong 1024 byte đầu của file)? Trình duyệt phải biết bảng mã **trước khi** nó bắt đầu diễn giải bất kỳ byte text nào khác trong tài liệu — kể cả chính nội dung `head`. Đặt `charset` quá trễ (ví dụ sau một `<title>` tiếng Việt dài) tạo ra một khoảng thời gian trình duyệt phải đoán bảng mã, và nó có thể đoán sai, khiến những ký tự đứng trước thẻ `charset` hiển thị lỗi trong khi phần sau lại đúng — một lỗi khó tái hiện vì phụ thuộc độ dài nội dung phía trước.

## Chọn thẻ theo ý nghĩa, không theo hình dáng

Một sai lầm rất phổ biến của người mới: thấy đoạn text cần in đậm thì nghĩ ngay đến thẻ nào đó "nhìn đậm", thay vì hỏi "đoạn này có vai trò gì". Hai câu hỏi cho ra hai kết quả khác hẳn nhau.

| Nhu cầu hiển thị | Thẻ sai (chỉ vì hình dáng) | Thẻ đúng (vì ý nghĩa) |
|---|---|---|
| Chữ đậm vì là tiêu đề mục | `<b>` hoặc CSS `font-weight` tùy ý | `<h2>`...`<h6>` theo đúng cấp |
| Chữ đậm vì nhấn mạnh ngữ nghĩa | `<b>` | `<strong>` (trình đọc màn hình nhấn giọng) |
| Chữ nghiêng vì là thuật ngữ nước ngoài | `<i>` tùy tiện | `<i>` **vẫn đúng** ở đây — `<i>` hợp lệ cho văn bản mang giọng khác (tên khoa học, thuật ngữ), không phải luôn luôn sai |
| Một đoạn văn | `<div>` rồi tự thêm margin | `<p>` |
| Một danh sách các mục | Nhiều `<div>` xếp chồng | `<ul>`/`<ol>` + `<li>` |
| Một ảnh minh họa | `<img>` không có `alt` | `<img src="..." alt="mô tả ngắn nội dung ảnh">` |
| Một liên kết điều hướng | `<span onclick="...">` | `<a href="...">` |

**Phải thuộc:** `alt` trên `<img>` không phải tùy chọn làm đẹp — nó là nội dung thay thế khi ảnh không tải được, và là thứ duy nhất trình đọc màn hình đọc được cho người dùng khiếm thị. Ảnh thuần trang trí (không mang thông tin) thì dùng `alt=""` (rỗng, không bỏ hẳn thuộc tính) để trình đọc màn hình chủ động bỏ qua nó thay vì đọc tên file ảnh.

### Phân cấp heading

```html
<h1>Tên sản phẩm</h1>
  <h2>Tính năng</h2>
    <h3>Tính năng A</h3>
    <h3>Tính năng B</h3>
  <h2>Giá</h2>
```

**Nền tảng:** Heading tạo ra một "outline" (dàn ý) của tài liệu mà trình đọc màn hình dùng để nhảy nhanh giữa các mục (giống mục lục), và công cụ tìm kiếm dùng để hiểu phần nào quan trọng hơn phần nào. Nhảy cấp (từ `h1` thẳng xuống `h4` vì nó "nhìn vừa mắt") làm gãy outline đó — không gây lỗi hiển thị, nhưng làm hỏng trải nghiệm của người dùng trình đọc màn hình và tín hiệu SEO, một cái giá vô hình với người viết nhưng rất thật với người dùng.

## Thuộc tính (attribute) và property: hai thế giới gần giống nhau

```html
<input id="ten" value="A">
```

```js
const el = document.getElementById('ten');
el.getAttribute('value'); // "A" — luôn là giá trị ban đầu trong HTML
el.value;                 // giá trị HIỆN TẠI, đổi theo những gì người dùng gõ
el.value = 'B';
el.getAttribute('value'); // vẫn "A" — attribute không tự cập nhật theo property
```

Đã chạy đoạn trên trong console trình duyệt: sau khi gõ hoặc gán `el.value = 'B'`, `getAttribute('value')` vẫn trả về `"A"`. Đây không phải lỗi — attribute phản ánh **trạng thái ban đầu khai báo trong HTML**, còn property phản ánh **trạng thái hiện tại trong bộ nhớ (DOM)**. Với đa số attribute (như `id`, `class`, `href`) hai thứ này đồng bộ với nhau mọi lúc; `value`, `checked`, `selected` là những trường hợp ngoại lệ đáng nhớ vì chúng đại diện cho trạng thái người dùng tương tác, không phải cấu hình tĩnh.

**Suy luận:** Vì sao có sự lệch này? HTML attribute mô tả tài liệu **lúc trình duyệt phân tích cú pháp** (một bản chụp tĩnh), còn DOM property mô tả **đối tượng sống trong bộ nhớ** sau khi trang đã chạy và người dùng đã tương tác. Với phần lớn thuộc tính không đổi theo tương tác, hai khái niệm trùng khít nên người mới dễ tưởng chúng là một. Nhưng với đúng những thuộc tính đại diện cho trạng thái tương tác (gõ chữ vào input, tick checkbox, chọn option), bản chụp tĩnh ban đầu và trạng thái sống hiện tại buộc phải tách ra, nếu không trình duyệt sẽ không biết "giá trị gốc trong HTML" để phục vụ việc như reset form.

## Void element: thẻ không có nội dung con

| Thẻ | Vì sao không cần thẻ đóng |
|---|---|
| `<img>` | Chỉ tham chiếu tới một file ảnh, không chứa nội dung con |
| `<br>` | Chỉ là một dấu xuống dòng |
| `<input>` | Dữ liệu nằm ở attribute (`value`), không phải ở nội dung con |
| `<meta>`, `<link>` | Chỉ mang thông tin qua attribute |

**Phải thuộc:** `<img src="...">` không cần (và không được phép) viết thành `<img src="...">内容</img>` — theo đặc tả, void element không thể có thẻ đóng lẫn nội dung con. XHTML cũ yêu cầu tự đóng dạng `<img ... />`; HTML5 cho phép cả hai cách viết, dấu `/` ở cuối bị bỏ qua.

## Khi nào cần đào sâu, khi nào không

Phần cấu trúc tài liệu này bạn cần nắm **ngay từ đầu**, vì mọi lỗi layout, lỗi accessibility và lỗi SEO khó debug sau này thường bắt nguồn từ việc chọn sai thẻ ở bước này. Phần `head`/metadata nâng cao (Open Graph, structured data) chỉ cần khi trang thực sự cần chia sẻ mạng xã hội tốt hoặc SEO cạnh tranh — xem [SEO, meta tag và structured data](/go?p=16-HTML%2Fmedium%2Flt-05-seo-meta-structured-data.md).

## Điều cần nhớ

- Chọn thẻ theo **ý nghĩa nội dung**, không theo hình dáng hiển thị — hình dáng luôn là việc của CSS.
- `charset` và `viewport` trong `head` không phải thủ tục hình thức: thiếu một trong hai, trang vỡ theo cách rất khó đoán.
- `alt` trên ảnh là nội dung, không phải trang trí — ảnh thuần trang trí dùng `alt=""`, không bỏ hẳn attribute.
