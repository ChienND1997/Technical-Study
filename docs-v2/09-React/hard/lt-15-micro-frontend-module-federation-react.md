# Lý thuyết 15: Micro-frontend và Module Federation — phần dành riêng cho React

Bài [Kiến trúc frontend](/go?p=11-Frontend-Core%2Flt-05-kien-truc-frontend.md) đã nói micro-frontend nói chung: vì sao chia nhỏ, các cách ghép (build-time, runtime qua iframe, runtime qua Module Federation) và đánh đổi chung. Bài này không lặp lại phần đó — nó đi vào đúng những vấn đề **xảy ra vì ứng dụng cụ thể là React**, thứ một kiến trúc sư frontend tổng quát dễ bỏ sót cho tới khi gặp trong thực tế.

## Vấn đề nó giải quyết

Module Federation cho phép một ứng dụng "shell" tải module JavaScript từ một ứng dụng "remote" khác tại runtime, như thể đó là import nội bộ. Với React, điều này tạo ra một lớp vấn đề mà các framework không có state toàn cục kiểu hook không gặp: **React có các quy tắc ngầm định yêu cầu chỉ có một bản runtime React cho toàn bộ cây component đang render cùng nhau**. Nếu shell và remote mỗi bên tự bundle một bản `react`/`react-dom` riêng, về mặt kỹ thuật vẫn có hai bản JavaScript hợp lệ nằm trong cùng một trang — nhưng hooks, Context, và cây Fiber (xem [Bài 8](/go?p=09-React%2Fhard%2Flt-08-fiber-concurrent.md)) đều giữ trạng thái nội bộ theo instance của riêng bản React đó, nên một component từ remote dùng `useContext` đọc Context do shell tạo ra (từ bản React khác) sẽ không thấy gì, hoặc tệ hơn, "Invalid hook call" ngay cả khi code hoàn toàn đúng cú pháp.

## Các khái niệm cần biết

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| **Singleton (trong cấu hình Module Federation)** | Khai báo một thư viện chỉ được tồn tại một bản duy nhất, chia sẻ giữa shell và mọi remote | `react`/`react-dom` bắt buộc phải là singleton, nếu không hooks và Context giữa các remote khác nhau sẽ không tương thích |
| **Shared scope** | Vùng các module được các ứng dụng liên bang cùng khai là "chia sẻ", trình quyết định phiên bản nào thực sự được tải | Nếu một remote không khai `react` là shared, nó sẽ tự bundle bản riêng, phá singleton dù shell đã khai đúng |
| **Version negotiation (thương lượng phiên bản)** | Khi các ứng dụng liên bang khai các khoảng phiên bản khác nhau cho cùng một thư viện shared, runtime chọn một bản thoả mãn nhiều nhất (hoặc báo lỗi nếu không thể) | Một remote cũ khai `react: ^17` trong khi shell đã lên `react: ^19` có thể khiến cả hệ thống chọn bản không ai thật sự test kỹ |
| **Bidirectional host-remote (host/remote hai chiều)** | Một ứng dụng vừa là remote (bị tải bởi app khác) vừa là host (tự tải remote khác) | Thường gặp khi một "trang danh mục" tải nhiều widget, mỗi widget lại tự tải widget con |
| **Ranh giới sở hữu route/state** | Quyết định rõ shell hay remote là người giữ nguồn sự thật cho URL hiện tại và state chia sẻ (giỏ hàng, phiên đăng nhập) | Thiếu ranh giới rõ dẫn tới hai bên cùng điều hướng router, gây nhảy trang hoặc mất đồng bộ |

**Tóm tắt:**

- React yêu cầu ngầm định chỉ một bản runtime cho cả cây component đang render cùng nhau; hai bản `react`/`react-dom` trong cùng trang phá vỡ hooks và Context giữa shell và remote.
- Module Federation giải quyết bằng khai `react`/`react-dom` (và `react-router`, design system dùng chung nếu có) là **singleton** trong cấu hình chia sẻ, không phải tự nhiên có sẵn.
- Một Context tạo ở shell chỉ đọc được bởi component ở remote nếu cả hai thực sự chạy trên cùng một instance React — singleton đúng cấu hình là điều kiện cần cho việc đó.
- Thương lượng phiên bản giữa nhiều remote khai các khoảng version khác nhau có thể chọn ra một bản không ai kiểm thử kỹ với đúng tổ hợp đó; cần policy version rõ ràng giữa các đội, không chỉ để runtime "tự lo".
- Ranh giới sở hữu route và state chia sẻ (giỏ hàng, phiên đăng nhập) phải quyết định tường minh thuộc về shell hay remote nào — thiếu ranh giới rõ là nguồn lỗi tích hợp phổ biến nhất trong thực tế, nhiều hơn cả lỗi kỹ thuật về bundler.
- Các vấn đề này không có trong bài kiến trúc frontend tổng quát vì chúng bắt nguồn từ cách React cụ thể quản lý state nội bộ qua hook, không phải từ khái niệm micro-frontend nói chung.

## Vì sao hai bản React trong cùng trang lại hỏng, không chỉ "nặng hơn"

```js
// webpack.config.js của shell (ví dụ minh hoạ cấu hình, không phải code chạy được)
new ModuleFederationPlugin({
  name: 'shell',
  remotes: { catalog: 'catalog@https://catalog.example.com/remoteEntry.js' },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
  },
});
```

Nếu dòng `shared` này thiếu, hoặc remote `catalog` không khai `shared` tương ứng trong cấu hình của chính nó, `catalog` sẽ tự đóng gói `react`/`react-dom` riêng vào bundle của nó. Kết quả: trang có hai module `react` độc lập trong bộ nhớ trình duyệt. Mọi hook (`useState`, `useContext`...) đọc trạng thái nội bộ lưu trong instance React đang chạy nó — một component render bởi bản React A nhưng vô tình gọi vào một hàm thuộc bản React B (ví dụ qua `Context.Provider` do B tạo) sẽ không tìm thấy state đúng chỗ, hoặc React tự phát hiện bất nhất và ném lỗi "Invalid hook call: Hooks can only be called inside the body of a function component" — một lỗi mà bản thân code hoàn toàn đúng cú pháp, nguyên nhân nằm hoàn toàn ở tầng bundling.

**Phải thuộc:** singleton không tự động xảy ra chỉ vì bạn dùng Module Federation — nó phải được khai rõ ràng ở **cả hai phía** (host và mọi remote). Thiếu khai ở một remote là đủ để phá singleton cho toàn hệ thống, dù shell đã cấu hình đúng.

## Chia sẻ Context và design system qua ranh giới liên bang

```tsx
// Trong shell: Context và Provider được export như một "API công khai" cho remote dùng
// shared-context.ts (nằm trong gói được cả shell và remote cùng import, qua shared scope)
export const ThemeContext = createContext<Theme>(defaultTheme);
export const useTheme = () => useContext(ThemeContext);

// Remote chỉ import useTheme từ gói chung, không tự tạo Context riêng của nó
function CatalogWidget() {
  const theme = useTheme(); // đọc đúng Context do shell Provider, vì cùng instance React
  return <div style={{ color: theme.primary }}>...</div>;
}
```

Điều kiện để `useTheme()` ở remote đọc đúng giá trị Provider đặt ở shell: (1) `react` là singleton như phần trên, và (2) chính `ThemeContext` phải tới từ **cùng một module instance** — nếu remote import `createContext` rồi tự tạo `ThemeContext` của riêng nó (dù cùng tên, cùng kiểu dữ liệu), đó là hai Context object khác nhau về tham chiếu, và `useContext` của Context B không bao giờ đọc được Provider của Context A. Cách an toàn là đặt chính `ThemeContext`/`useTheme` vào module được khai **shared** (không chỉ `react`), để cả shell và remote cùng dùng một instance của module đó, không phải mỗi bên tự định nghĩa lại.

**Suy luận:** đây là hệ quả trực tiếp của việc Context dùng **so sánh tham chiếu object**, không so sánh theo tên hay cấu trúc. Module Federation giải quyết "tải code runtime", nhưng *danh tính* của một object (hai lần gọi `createContext()` luôn cho ra hai object khác nhau) là một vấn đề JavaScript thuần, không phải vấn đề bundler — bundler chỉ có thể giúp nếu bạn cố ý khai module đó share, chứ không tự suy luận ra ý định chia sẻ instance.

## Ranh giới sở hữu route và state giữa shell và remote

| Vấn đề | Ai nên là chủ | Vì sao |
|---|---|---|
| URL hiện tại / điều hướng cấp cao | Shell | Chỉ một router nên điều khiển `history`; hai router độc lập (shell và remote) cùng lắng nghe `popstate` dễ đua nhau xử lý một lần chuyển trang |
| Route con bên trong phạm vi một remote (ví dụ tab trong một widget) | Remote đó | Shell không cần biết cấu trúc nội bộ của remote; remote tự quản lý qua router lồng hoặc state nội bộ |
| Phiên đăng nhập, giỏ hàng, các state thật sự toàn cục | Một nguồn duy nhất, thường là shell hoặc một store được khai shared | Nhiều remote tự giữ bản sao riêng của cùng dữ liệu dẫn tới lệch nhau (một remote hiện giỏ hàng cũ trong khi remote khác đã cập nhật) |
| Thông báo lỗi/trạng thái tải của chính remote đó | Remote đó | Một remote lỗi không nên làm hỏng UI của shell hay remote khác — xem thêm Error Boundary theo vùng ở [Bài 10](/go?p=09-React%2Fhard%2Flt-10-hieu-nang-kien-truc.md) |

**Nền tảng:** phần lớn sự cố tích hợp micro-frontend trong thực tế không đến từ cấu hình Module Federation sai, mà từ việc **không ai quyết định rõ ràng** ai sở hữu route nào hay state nào trước khi code được viết — mỗi đội tự giả định phần của mình là nguồn sự thật, và chỉ phát hiện xung đột khi hai remote cùng chạy trên một trang thật.

## Bẫy thường gặp

| Bẫy | Hậu quả | Sửa |
|---|---|---|
| Chỉ khai `shared` ở shell, quên khai ở remote | Remote tự bundle `react` riêng, phá singleton dù shell cấu hình đúng | Mọi ứng dụng liên bang (cả host lẫn remote) đều phải khai cùng một `shared` cho `react`/`react-dom` |
| Mỗi remote tự `createContext` cho cùng một khái niệm (theme, i18n) thay vì import từ module chung | `useContext` không đọc được Provider của bên kia dù cùng tên biến | Đặt Context dùng chung vào một module được khai shared, không để mỗi bên tự định nghĩa |
| Không thống nhất policy version cho các thư viện shared giữa các đội | Thương lượng phiên bản chọn ra tổ hợp không ai kiểm thử kỹ, lỗi chỉ xuất hiện khi các remote chạy cùng nhau trên production | Thống nhất khoảng version được phép, kiểm tra tương thích trong CI trước khi một remote mới được deploy cùng shell |
| Shell và remote đều tự mount router riêng, cả hai cùng lắng nghe điều hướng trình duyệt | Nhảy trang, mất state khi cả hai router cùng phản ứng với một lần chuyển URL | Một router duy nhất ở shell, remote dùng route lồng hoặc nhận route hiện tại như prop/Context, không tự mount router cấp cao |

## Câu hỏi phỏng vấn thường gặp

### 1. Vì sao hai bản `react` trong cùng một trang lại gây lỗi hook, không chỉ tăng kích thước bundle?

**Gợi ý suy luận:**
- Hook lưu trạng thái của nó ở đâu — trong code component, hay trong instance của thư viện React đang chạy nó?
- Nếu một Context Provider được tạo bởi bản React A, một component chạy bởi bản React B đọc Context đó bằng `useContext` của B thì xảy ra gì?

**Lập luận:** Mỗi hook lưu trạng thái nội bộ (danh sách hook theo thứ tự gọi, cây Fiber) bên trong chính instance của thư viện React đang thực thi nó, không phải trong code component. Hai bản `react` độc lập là hai instance hoàn toàn tách biệt về bộ nhớ, nên Context/state do bản này tạo ra vô nghĩa đối với hook của bản kia — dẫn tới đọc không ra giá trị, hoặc React tự phát hiện bất nhất và ném lỗi "Invalid hook call".

**Đáp án ngắn:** Vì state của hook nằm trong instance thư viện React thực thi nó; hai bản React là hai instance tách biệt, nên Context và state tạo bởi bản này không tương thích với hook chạy trên bản kia.

**Nhớ:** không phải "nặng gấp đôi" — là "hai thế giới hook không nói chuyện được với nhau".

### 2. Khai `react` là singleton trong cấu hình Module Federation có tự động đảm bảo chỉ một bản React chạy không?

**Gợi ý suy luận:**
- Singleton cần được khai ở bao nhiêu phía để có hiệu lực: chỉ host, chỉ remote, hay cả hai?
- Nếu một remote không khai `shared` cho `react`, điều gì xảy ra với remote đó dù host đã khai đúng?

**Lập luận:** Singleton chỉ có hiệu lực khi **mọi** ứng dụng liên bang tham gia (host và từng remote) đều khai cùng một thư viện là shared/singleton trong cấu hình của chính nó. Một remote thiếu khai sẽ tự đóng gói bản `react` riêng, và vì Module Federation không thể ép một remote "phải" chia sẻ nếu remote đó không tự khai, singleton của hệ thống coi như bị phá bởi đúng một mắt xích thiếu cấu hình.

**Đáp án ngắn:** Không tự động — singleton chỉ có hiệu lực khi tất cả các bên (host và mọi remote) đều khai đúng; một remote thiếu cấu hình là đủ để phá singleton toàn hệ thống.

**Nhớ:** singleton là một thoả thuận nhiều bên, không phải một cờ bật một lần ở host là xong.

### 3. Vì sao hai Context cùng tên, cùng kiểu dữ liệu, được tạo ở shell và remote lại là hai Context khác nhau?

**Gợi ý suy luận:**
- `createContext()` trả về gì — một mô tả kiểu dữ liệu, hay một object cụ thể với danh tính riêng?
- Nếu gọi `createContext()` hai lần với cùng tham số, hai kết quả có `===` nhau không?

**Lập luận:** `createContext()` trả về một object runtime cụ thể, và `useContext` tìm Provider gần nhất khớp đúng **tham chiếu** tới chính object đó — không so khớp theo tên biến hay cấu trúc kiểu dữ liệu. Gọi `createContext()` hai lần (một lần trong bundle của shell, một lần trong bundle của remote vì mỗi bên tự định nghĩa) luôn cho ra hai object khác nhau dù giống hệt nhau về kiểu, nên Provider bên này vô hình với `useContext` phía bên kia.

**Đáp án ngắn:** Vì Context là một object cụ thể được so khớp theo tham chiếu, không theo tên hay kiểu dữ liệu; gọi `createContext()` ở hai nơi khác nhau luôn tạo ra hai object khác nhau dù cấu trúc giống hệt.

**Nhớ:** cùng tên không có nghĩa là cùng object; Context phải đến từ đúng một module instance được chia sẻ thật sự.

Tiếp theo: [Bộ câu hỏi phỏng vấn React](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-react-phong-van.md).
