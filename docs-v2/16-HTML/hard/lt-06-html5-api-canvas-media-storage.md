# HTML5 API: Canvas, media, drag-and-drop, File API và lưu trữ client

HTML không chỉ là thẻ đánh dấu tĩnh. Từ HTML5, trình duyệt đi kèm một loạt API JavaScript gắn liền với các thẻ cụ thể: vẽ pixel tùy ý, phát video/audio, kéo-thả file, đọc nội dung file ngay trên máy người dùng mà không cần upload, và lưu dữ liệu ngay trong trình duyệt. Bài này đi qua từng API đủ sâu để bạn biết **khi nào** nó là công cụ đúng, và **khi nào** nó chỉ là một cái búa khiến mọi thứ trông giống cái đinh.

**Tóm tắt:**

- Canvas vẽ **pixel** (bitmap, không giữ cấu trúc từng hình sau khi vẽ); SVG vẽ **đối tượng hình học** (mỗi hình vẫn là một node DOM, có thể style bằng CSS, bắt sự kiện riêng).
- `<video>`/`<audio>` phát media có sẵn trình điều khiển hoặc API JavaScript (`play()`, `pause()`, sự kiện `timeupdate`, `ended`...) để tự dựng giao diện điều khiển riêng.
- Drag-and-drop API gồm hai phía: phần tử được kéo (`draggable="true"`, sự kiện `dragstart`) và vùng nhận thả (`dragover` phải `preventDefault()` thì `drop` mới bắn ra).
- File API cho JavaScript đọc nội dung file người dùng chọn **ngay trên máy**, không cần upload lên server trước — nền tảng của preview ảnh trước khi gửi, hay import CSV phía client.
- `localStorage`/`sessionStorage` lưu cặp key-value dạng string, đồng bộ (block luồng chính), giới hạn khoảng 5-10MB tùy trình duyệt — phù hợp dữ liệu nhỏ, không nhạy cảm.
- `IndexedDB` là database thật trong trình duyệt (bất đồng bộ, hỗ trợ index, lưu được object lớn/binary), phức tạp hơn hẳn nhưng cần thiết khi dữ liệu lớn hoặc cần truy vấn.
- Bốn cơ chế lưu trữ client (cookie, localStorage, sessionStorage, IndexedDB) khác nhau về kích thước, có gửi lên server tự động hay không, và có tồn tại sau khi đóng tab hay không — chọn sai cơ chế là lỗi kiến trúc âm thầm, không báo lỗi runtime.

## Canvas so với SVG: khi nào chọn cái nào

```html
<canvas id="bieu-do" width="400" height="200"></canvas>
<script>
  const ctx = document.getElementById('bieu-do').getContext('2d');
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(10, 10, 100, 50);
</script>
```

| Tiêu chí | Canvas | SVG |
|---|---|---|
| Mô hình dữ liệu | Pixel (bitmap) — sau khi vẽ, không còn biết "hình chữ nhật này" ở đâu, chỉ còn các pixel màu | Đối tượng (vector) — mỗi hình vẫn là một node, truy vấn/sửa/xóa được qua DOM |
| Số lượng đối tượng lớn (hàng chục nghìn điểm) | Mạnh hơn hẳn — chỉ là phép vẽ pixel, không tốn chi phí quản lý DOM node | Chậm dần khi số node DOM quá lớn |
| Tương tác từng phần tử (hover một điểm trong biểu đồ) | Phải tự tính toán tọa độ pixel để biết đang trỏ vào "hình" nào — không có sẵn | Tự nhiên — mỗi hình là một node, tự bắt sự kiện `onmouseover` riêng như bất kỳ phần tử DOM nào |
| Style bằng CSS | Không (phải vẽ lại bằng JavaScript nếu muốn đổi màu) | Có — `fill`, `stroke` style được bằng CSS như phần tử thường |
| Phóng to (zoom) có vỡ hình không | Có — là bitmap, phóng to thì vỡ nét giống ảnh raster | Không — là vector, phóng to bao nhiêu vẫn sắc nét |
| Ví dụ điển hình | Game 2D, chỉnh sửa ảnh, biểu đồ hàng vạn điểm dữ liệu (map nhiệt) | Biểu đồ tương tác (hover từng cột), icon, minh họa cần phóng to |

**Suy luận:** Vì sao Canvas nhanh hơn với số lượng lớn nhưng lại "mù" với từng đối tượng? Vì Canvas về bản chất là một vùng bitmap — mỗi lệnh vẽ (`fillRect`, `drawImage`...) chỉ tô màu lên pixel rồi quên luôn "hình gì vừa được vẽ ở đâu", giống như vẽ bằng bút trên giấy: giấy không nhớ bạn vừa vẽ hình tròn hay hình vuông, chỉ có vết mực. Trình duyệt vì vậy không phải duy trì một cây cấu trúc cho hàng chục nghìn hình, nên vẽ lại toàn bộ cực nhanh — đổi lại, muốn biết "người dùng vừa trỏ chuột vào hình nào", bạn phải tự so sánh tọa độ chuột với tọa độ đã vẽ, trình duyệt không giúp được gì. SVG giữ nguyên mỗi hình như một node DOM thật, nên có đầy đủ sự kiện/CSS miễn phí, nhưng phải trả giá bằng chi phí quản lý một cây lớn khi số lượng node tăng cao.

## `<video>`/`<audio>`: thẻ có sẵn điều khiển, và API để tự dựng

```html
<video id="v" src="demo.mp4" controls></video>
<script>
  const v = document.getElementById('v');
  v.addEventListener('timeupdate', () => console.log(v.currentTime, '/', v.duration));
  v.addEventListener('ended', () => console.log('Đã phát xong'));
  // Tự dựng nút play riêng: bỏ thuộc tính "controls", tự gọi
  // v.play() / v.pause() theo sự kiện click của nút tự thiết kế
</script>
```

| Sự kiện/thuộc tính | Ý nghĩa |
|---|---|
| `loadedmetadata` | Đã biết `duration`, kích thước video, nhưng frame đầu chưa chắc đã có |
| `canplay` | Đủ dữ liệu để bắt đầu phát (có thể còn phải buffer thêm giữa chừng) |
| `timeupdate` | Bắn liên tục khi đang phát — dùng để cập nhật thanh tiến trình tự thiết kế |
| `ended` | Phát xong tới cuối |
| `buffered` | `TimeRanges` — các đoạn đã tải, dùng để vẽ thanh buffer riêng |

**Phải thuộc:** Thuộc tính `controls` cho một thanh điều khiển sẵn có **do trình duyệt tự vẽ, khác nhau giữa các trình duyệt** và không style được bằng CSS theo ý muốn tùy biến hoàn toàn. Muốn giao diện điều khiển đồng nhất giữa các trình duyệt, cách làm là bỏ `controls`, tự vẽ nút bấm/thanh trượt riêng, rồi gọi `play()`/`pause()`/gán `currentTime` theo tương tác của người dùng với giao diện tự vẽ đó.

## Drag-and-drop API

```html
<div id="nguon" draggable="true">Kéo tôi</div>
<div id="dich">Thả vào đây</div>
<script>
  document.getElementById('nguon').addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', 'du-lieu-can-truyen');
  });
  const dich = document.getElementById('dich');
  dich.addEventListener('dragover', (e) => e.preventDefault()); // bắt buộc, nếu không "drop" sẽ không bao giờ bắn
  dich.addEventListener('drop', (e) => {
    e.preventDefault();
    console.log(e.dataTransfer.getData('text/plain')); // "du-lieu-can-truyen"
  });
</script>
```

**Bẫy thường gặp:** quên `e.preventDefault()` trong `dragover` — hành vi mặc định của trình duyệt với hầu hết phần tử là **từ chối** thả, nên nếu không chủ động `preventDefault()` ngay trong `dragover`, sự kiện `drop` sẽ không bao giờ được bắn ra dù con trỏ rõ ràng đang ở trên vùng đích, khiến lỗi trông như "drop không hoạt động" trong khi nguyên nhân nằm ở một sự kiện khác hoàn toàn (`dragover`, không phải `drop`).

## File API: đọc file ngay trên máy người dùng

```html
<input type="file" id="chon-anh" accept="image/*">
<script>
  document.getElementById('chon-anh').addEventListener('change', (e) => {
    const file = e.target.files[0]; // đối tượng File: name, size, type, lastModified
    const reader = new FileReader();
    reader.onload = () => {
      document.querySelector('img').src = reader.result; // data URL, preview ngay, chưa hề upload
    };
    reader.readAsDataURL(file);
  });
</script>
```

**Nền tảng:** `File` (và `FileList` khi chọn nhiều file) là đối tượng JavaScript mô tả file người dùng chọn, hoàn toàn nằm trong bộ nhớ trình duyệt — chưa có byte nào được gửi lên mạng. `FileReader` đọc nội dung đó theo nhiều định dạng (`readAsDataURL` cho base64 dùng ngay trong `<img src>`, `readAsText` cho file text, `readAsArrayBuffer` cho xử lý nhị phân thô). Đây là cách preview ảnh/đọc trước nội dung CSV hoạt động mà không cần một round-trip server nào — chỉ khi người dùng thực sự submit, file mới được gửi đi (và lúc đó mới cần `enctype="multipart/form-data"`, xem [Form HTML](/go?p=16-HTML%2Feasy%2Flt-03-form-co-ban.md)).

## Lưu trữ phía client: bốn cơ chế, bốn mục đích khác nhau

| Cơ chế | Dung lượng | Gửi tự động lên server? | Sống sót qua | Đồng bộ/bất đồng bộ |
|---|---|---|---|---|
| Cookie | ~4KB | Có — gửi kèm mọi HTTP request cùng domain | Theo `expires`/`max-age` đặt khi tạo | Đồng bộ |
| `sessionStorage` | ~5-10MB (tùy trình duyệt) | Không | Đóng tab là mất | Đồng bộ |
| `localStorage` | ~5-10MB (tùy trình duyệt) | Không | Tồn tại vĩnh viễn tới khi bị xóa thủ công | Đồng bộ (block luồng chính khi đọc/ghi) |
| `IndexedDB` | Rất lớn (hàng trăm MB tới vài GB, tùy đĩa trống) | Không | Tồn tại vĩnh viễn tới khi bị xóa thủ công | Bất đồng bộ, hỗ trợ transaction và index |

**Phải thuộc:** Cookie là cơ chế **duy nhất trong bốn cơ chế này tự động gửi lên server** cùng mọi request — đây vừa là lý do nó phù hợp cho session/auth token, vừa là lý do nó giới hạn rất nhỏ (gửi kèm mọi request thì không thể để nó phình to). `localStorage`/`sessionStorage`/`IndexedDB` chỉ sống trong trình duyệt, server hoàn toàn không biết chúng tồn tại trừ khi JavaScript chủ động gửi dữ liệu đó đi qua một request riêng.

**Suy luận:** Vì sao `localStorage` "đồng bộ" lại là một vấn đề thực sự, không chỉ là chi tiết lý thuyết? Vì JavaScript trên trình duyệt chạy đơn luồng (xem [JavaScript runtime và event loop](/go?p=11-Frontend-Core%2Flt-01-javascript-runtime-event-loop.md)) — bất kỳ lệnh gọi `localStorage.getItem`/`setItem` nào cũng **chặn** toàn bộ luồng chính cho tới khi đọc/ghi xong vào đĩa, dù lượng dữ liệu nhỏ thường chỉ mất vài mili-giây. Với dữ liệu lớn hoặc đọc/ghi liên tục (ví dụ lưu trạng thái game mỗi frame), độ trễ đồng bộ đó cộng dồn thành giật lag thấy rõ. `IndexedDB` được thiết kế bất đồng bộ ngay từ đầu chính vì lý do này — đổi lại API của nó phức tạp hơn hẳn (transaction, object store, index) để đạt được hiệu năng đó.

## Khi nào cần đào sâu, khi nào không

Canvas/drag-and-drop/File API chỉ cần đào sâu khi tính năng thực sự đòi hỏi (vẽ, kéo thả, xử lý file phía client) — phần lớn ứng dụng CRUD thông thường không bao giờ chạm tới chúng. Lưu trữ client thì ngược lại: gần như mọi ứng dụng web đều dùng ít nhất một trong bốn cơ chế, nên hiểu đúng khi nào chọn cơ chế nào là kiến thức nền tảng, không phải kiến thức chuyên biệt.

## Điều cần nhớ

- Canvas vẽ pixel (nhanh với số lượng lớn, mù với từng đối tượng); SVG vẽ đối tượng DOM thật (chậm hơn với số lượng lớn, nhưng có sẵn sự kiện/CSS cho từng hình).
- Drag-and-drop bắt buộc `preventDefault()` trong `dragover`, nếu không `drop` không bao giờ bắn ra dù giao diện trông như đang hoạt động.
- Chỉ cookie tự động gửi lên server cùng mọi request; ba cơ chế còn lại (`sessionStorage`, `localStorage`, `IndexedDB`) chỉ sống trong trình duyệt.
