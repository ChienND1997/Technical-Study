# HTML ngữ nghĩa: vì sao không nên "div soup"

Nhìn qua, `<div class="header">` và `<header>` tạo ra kết quả y hệt nhau trên màn hình — cả hai đều chỉ là một khối trống không có style riêng. Vì vậy rất nhiều người mới kết luận chúng "như nhau, chọn cái nào cũng được". Kết luận đó đúng với con mắt, nhưng sai với mọi thứ không phải con mắt: trình đọc màn hình, công cụ tìm kiếm, trình duyệt tự động, và cả chính bạn sáu tháng sau đọc lại code. `<div>` không mang ý nghĩa gì ngoài "một khối"; `<header>` nói rõ "đây là phần đầu trang". HTML ngữ nghĩa (semantic HTML) là việc chọn thẻ theo đúng ý nghĩa đó, và bài này đi vào vì sao sự khác biệt tưởng như chỉ là "đặt tên đẹp hơn" lại có hậu quả thật.

**Tóm tắt:**

- Thẻ semantic (`header`, `nav`, `main`, `article`, `section`, `aside`, `footer`) mang ý nghĩa vai trò, trong khi `div`/`span` không mang ý nghĩa gì ngoài "một khối"/"một đoạn inline".
- "Div soup" là một trang chỉ toàn `<div>` lồng nhau, buộc trình đọc màn hình và máy phải suy luận cấu trúc qua `class` — thứ vốn chỉ dành cho CSS, không đảm bảo ổn định.
- Thẻ semantic tự mang theo một ARIA role ngầm định (`nav` → role `navigation`, `main` → role `main`...), nên dùng đúng thẻ nghĩa là được accessibility "miễn phí" mà không cần viết thêm `role`.
- Outline algorithm (coi mỗi `section`/`article` như một "chương" lồng heading riêng) đã bị loại khỏi đặc tả HTML vì không trình duyệt nào triển khai đúng; heading vẫn phải phân cấp thủ công bằng mắt người viết.
- `section` cần một heading con để có ý nghĩa; nếu chỉ để nhóm bố cục thuần CSS mà không có ý nghĩa nội dung riêng, `div` vẫn là lựa chọn đúng.
- `article` đánh dấu nội dung có thể đứng độc lập, tái sử dụng được (một bài blog, một bình luận, một thẻ sản phẩm); `section` đánh dấu một phần của tài liệu lớn hơn, không độc lập.
- Semantic HTML không thay thế ARIA hoàn toàn, nhưng là lớp phòng thủ đầu tiên và rẻ nhất trước khi cần tới ARIA thủ công.

## Vấn đề "div soup" giải quyết gì

```html
<!-- Div soup: chạy đúng, nhưng vô nghĩa với máy -->
<div class="header">
  <div class="nav">...</div>
</div>
<div class="content">
  <div class="post">...</div>
</div>
<div class="footer">...</div>
```

```html
<!-- Semantic: cùng bố cục, nhưng có ý nghĩa -->
<header>
  <nav>...</nav>
</header>
<main>
  <article>...</article>
</main>
<footer>...</footer>
```

Hai đoạn trên render ra **pixel giống hệt nhau** nếu CSS viết đúng (vì cả `div` lẫn `header` mặc định đều là `display: block`, không có style riêng). Khác biệt nằm hoàn toàn ở tầng không nhìn thấy được bằng mắt.

**Nền tảng:** Trình duyệt dựng hai cây song song từ cùng một HTML: cây DOM (để render) và cây accessibility (accessibility tree, để trình đọc màn hình và các công cụ hỗ trợ khác dùng). Thẻ semantic tự động có một vai trò (role) trong cây accessibility; `div`/`span` mặc định không có role nào (role rỗng), nên trình đọc màn hình bỏ qua hoàn toàn ý nghĩa cấu trúc của chúng và chỉ đọc được nội dung text bên trong theo thứ tự tuyến tính — người dùng mất khả năng "nhảy tới phần điều hướng" hay "nhảy tới nội dung chính" bằng phím tắt.

## Các thẻ semantic chính và vai trò ARIA ngầm định

| Thẻ | Vai trò (ARIA role ngầm định) | Dùng khi nào |
|---|---|---|
| `<header>` | `banner` (nếu là con trực tiếp của `body`) | Phần đầu trang hoặc đầu một `article`/`section` (logo, tiêu đề, intro) |
| `<nav>` | `navigation` | Một khối liên kết điều hướng chính, không phải mọi cụm link đều cần `nav` |
| `<main>` | `main` | Nội dung chính, duy nhất, không lặp lại giữa các trang (chỉ một `main` mỗi trang) |
| `<article>` | `article` | Nội dung độc lập, có thể đứng riêng và tái sử dụng (bài viết, bình luận, thẻ sản phẩm) |
| `<section>` | `region` (khi có tên, qua heading hoặc `aria-label`) | Một phần có chủ đề riêng của tài liệu lớn hơn, thường kèm heading |
| `<aside>` | `complementary` | Nội dung liên quan nhưng tách biệt khỏi luồng chính (sidebar, quảng cáo liên quan) |
| `<footer>` | `contentinfo` (nếu là con trực tiếp của `body`) | Phần cuối trang hoặc cuối một `article`/`section` (bản quyền, liên hệ) |

**Phải thuộc:** Cùng một thẻ có thể mang vai trò khác nhau tùy **vị trí lồng**: `<header>` ở gốc `body` mang role `banner`, nhưng `<header>` bên trong một `<article>` chỉ là phần đầu của bài viết đó, không mang role `banner`. Một trang chỉ nên có một `<main>`; nhiều `<header>`/`<footer>`/`<nav>`/`<article>` là hợp lệ.

## `section` so với `div`: ranh giới hay gây nhầm

```html
<!-- Đúng: section có heading, mang ý nghĩa nội dung riêng -->
<section>
  <h2>Đánh giá của khách hàng</h2>
  ...
</section>

<!-- Sai: section chỉ để chia layout CSS, không có ý nghĩa nội dung -->
<section class="grid-3-cols">
  <div>...</div><div>...</div><div>...</div>
</section>
```

**Suy luận:** Vì sao `section` "cần" một heading mà `div` thì không? `section` tồn tại để nói "đây là một phần có chủ đề riêng của tài liệu" — và một "chủ đề" theo định nghĩa phải có tên để nhận diện, tên đó chính là heading (hoặc `aria-label`/`aria-labelledby` khi không muốn hiện heading trên màn hình). Một khối chỉ tồn tại để CSS Grid/Flexbox chia 3 cột không mang "chủ đề nội dung" nào cả — nó là nhu cầu trình bày thuần túy, nên `div` là lựa chọn ngữ nghĩa chính xác hơn, dù `section` vẫn "chạy được" về mặt kỹ thuật. Một đặc tả không phát lỗi khi bạn dùng sai `section`/`div` theo nghĩa này — đây là ranh giới chỉ công cụ kiểm tra accessibility và con mắt đồng nghiệp review code mới bắt được.

## `article` so với `section`

| Tiêu chí | `article` | `section` |
|---|---|---|
| Đứng độc lập được không | Có — mang đủ ý nghĩa nếu lấy ra khỏi ngữ cảnh (RSS feed, chia sẻ riêng) | Không — chỉ có ý nghĩa như một phần của tài liệu bao quanh |
| Lồng nhau | Một `article` có thể chứa `article` khác (bài viết chứa bình luận, mỗi bình luận cũng là một `article`) | `section` lồng `section` để phân cấp chủ đề con |
| Ví dụ | Bài blog, bình luận, thẻ sản phẩm trong danh sách | "Giới thiệu", "Tính năng", "Giá" trong một trang landing page |

## Lịch sử ngắn của outline algorithm (vì sao heading vẫn phải tự phân cấp)

Đặc tả HTML5 ban đầu định nghĩa một "outline algorithm": mỗi `section`/`article` tự mở một cấp heading mới, nên về lý thuyết bạn có thể dùng `<h1>` lặp lại trong mọi `section` mà vẫn ra đúng cấp bậc tùy theo độ sâu lồng. Trên thực tế, **không trình duyệt chính nào triển khai thuật toán này**, và các công cụ hỗ trợ (trình đọc màn hình) cũng chưa bao giờ dựa vào nó. Vì khoảng cách giữa đặc tả và thực thi quá lớn và kéo dài nhiều năm, đặc tả HTML hiện hành (HTML Living Standard) đã chính thức loại bỏ outline algorithm.

**Phải thuộc:** Vì outline algorithm không tồn tại trong thực tế, bạn vẫn phải tự quản lý phân cấp heading (`h1`→`h6`) bằng tay trên toàn trang, giống hệt như khi không có `section`/`article` nào cả — các thẻ semantic nhóm nội dung về mặt vai trò, nhưng không tự động sắp xếp lại cấp heading cho bạn.

## Khi nào `div`/`span` vẫn là lựa chọn đúng

`div` và `span` không "tệ" — chúng là công cụ đúng khi bản thân khối/đoạn đó **không mang ý nghĩa nội dung riêng**, chỉ tồn tại để CSS hoặc JavaScript có một điểm neo (ví dụ một wrapper để `overflow: hidden`, một `span` để tô màu một từ bằng CSS). Ép một khối thuần kỹ thuật như vậy phải mang một thẻ semantic nào đó (ví dụ `<section>` cho mọi `div` bố cục) còn gây hại hơn: nó tạo ra các "region" accessibility giả, không có tên, khiến trình đọc màn hình liệt kê hàng chục "region không tên" không giúp ích gì cho người dùng.

## Điều cần nhớ

- Thẻ semantic mang vai trò ARIA ngầm định miễn phí; `div`/`span` thì không — chọn sai thẻ nghĩa là bỏ lỡ accessibility miễn phí, không phải lỗi hiển thị.
- `section` cần một heading (hoặc `aria-label`) để có ý nghĩa; nếu không, `div` mới là lựa chọn đúng.
- Outline algorithm đã bị loại khỏi đặc tả — heading vẫn phải được người viết phân cấp thủ công, không có thẻ nào tự làm thay.
