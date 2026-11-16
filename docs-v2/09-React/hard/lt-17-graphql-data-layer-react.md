# Lý thuyết 17: GraphQL và tầng dữ liệu trong React — khi nào đáng, khi nào không

Bài [State management](/go?p=09-React%2Fmedium%2Flt-05-state-management.md) đã dạy TanStack Query sâu: query key, `staleTime`/`gcTime`, dedupe request, invalidate. Bài đó giả định backend trả REST. Bài này không nhắc lại TanStack Query — nó trả lời câu hỏi khác: khi nào vấn đề thật sự nằm ở **REST**, không phải ở cách bạn cache nó, và liệu chuyển sang GraphQL (cùng với Apollo, Relay, hay urql) có giải quyết đúng vấn đề đó hay chỉ đổi chỗ phức tạp.

## Vấn đề nó giải quyết

REST gắn chặt vào endpoint: `/users/1` trả đúng những field server quyết định sẵn. Hai vấn đề kinh điển nảy sinh ở quy mô lớn. **Over-fetching**: màn hình chỉ cần tên và avatar của user, nhưng endpoint trả cả địa chỉ, lịch sử đơn hàng, cài đặt — tải về nhiều hơn cần, đặc biệt tốn trên mobile. **Under-fetching**: màn hình cần user **và** 5 bài viết gần nhất của họ **và** số người theo dõi — ba thứ đó nằm ở ba endpoint khác nhau, nên component phải gọi tuần tự hoặc song song nhiều request, mỗi cái cộng thêm ít nhất 1 RTT (xem [Mạng cơ bản](/go?p=03-Network-Security%2Feasy%2Flt-01-tcp-ip-dns.md)). GraphQL giải hai vấn đề này bằng cách lật ngược quyền kiểm soát: **client khai báo chính xác field nào nó cần**, trong một request duy nhất, bất kể các field đó nằm ở "bảng" nào phía server.

## Các khái niệm cần biết

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| **Schema** | Định nghĩa kiểu dữ liệu và quan hệ giữa chúng, dùng chung cho mọi client | Là "hợp đồng" giữa frontend và backend; công cụ sinh type TypeScript tự động từ đây |
| **Resolver** | Hàm phía server quyết định cách lấy giá trị cho một field cụ thể trong schema | Nơi thật sự xảy ra N+1 query nếu không cẩn thận (xem phần dưới) |
| **Fragment** | Khối field được đặt tên, tái sử dụng được trong nhiều query/component | Nền tảng của "fragment colocation": mỗi component tự khai field nó cần |
| **Normalized cache (cache chuẩn hoá)** | Cache lưu theo **định danh đối tượng** (ví dụ `User:1`) thay vì theo key của từng request | Sửa field `name` của `User:1` ở một nơi, mọi UI đang hiển thị user đó tự cập nhật, không cần tự invalidate thủ công |
| **Compiler-driven (Relay)** | Relay dùng babel-plugin đọc fragment lúc build, sinh ra đúng request tối ưu và kiểm tra field có khớp schema không | Bắt lỗi "dùng field chưa khai báo trong fragment" ngay lúc build, không phải lúc chạy |

**Tóm tắt:**

- REST gắn chặt vào endpoint nên dễ over-fetching (tải dư field) hoặc under-fetching (phải gọi nhiều endpoint cho một màn hình); GraphQL để client khai báo đúng field cần trong một request.
- Apollo, Relay, urql đều dùng **normalized cache**: lưu theo định danh đối tượng (`User:1`) chứ không theo key của từng request như TanStack Query — sửa một object ở một nơi, mọi nơi hiển thị object đó tự cập nhật.
- Relay bắt buộc kỷ luật cao hơn Apollo: compiler đọc fragment lúc build, kiểm tra kiểu và tối ưu request; đổi lại, ít tự do tùy biến hơn và đường cong học dốc hơn.
- "Tầng dữ liệu" không miễn phí: thêm GraphQL nghĩa là thêm một tầng schema/resolver phía server, một compiler hoặc runtime cache phức tạp phía client, và một đội phải hiểu cả hai.
- N+1 query (resolver gọi database riêng cho mỗi item trong danh sách) là vấn đề của **tầng server**, không phải do GraphQL hay REST; DataLoader giải quyết bằng cách gộp và dedupe các lần gọi trong cùng một tick.
- REST + TanStack Query (đã học ở [Bài 5](/go?p=09-React%2Fmedium%2Flt-05-state-management.md)) vẫn là lựa chọn đúng cho phần lớn ứng dụng; GraphQL đáng chi phí khi có nhiều client khác nhau (web, mobile, bên thứ ba) cần hình dạng dữ liệu khác nhau từ cùng một backend.

## Over-fetching và under-fetching bằng ví dụ cụ thể

```
// REST: dashboard cần tên, avatar, 3 bài viết gần nhất, số follower — 3 endpoint, 3 round trip (hoặc
// Promise.all song song, nhưng vẫn 3 request riêng, mỗi cái cộng chi phí kết nối/xác thực)
GET /users/1          -> { id, name, avatar, address, settings, ... }   // dư address, settings
GET /users/1/posts?limit=3
GET /users/1/followers/count

// GraphQL: một request, đúng field cần, server tự ghép dữ liệu từ nhiều nguồn bên trong resolver
query Dashboard {
  user(id: "1") {
    name
    avatar
    posts(limit: 3) { title, publishedAt }
    followerCount
  }
}
```

Phía REST, ba request độc lập còn có nghĩa ba lần chịu chi phí TCP/TLS nếu không dùng chung kết nối keep-alive, và ba lần xử lý xác thực ở server. Phía GraphQL, chỉ một request HTTP, server tự điều phối việc lấy `user`, `posts`, `followerCount` từ các nguồn nội bộ (có thể là ba bảng database khác nhau) rồi trả về đúng một hình dạng JSON mà component cần — không hơn, không kém.

**Phải thuộc:** over-fetching = tải dư field không dùng; under-fetching = thiếu field nên phải gọi thêm endpoint khác; GraphQL giải cả hai bằng cách để client khai báo hình dạng response, không phải server áp đặt sẵn.

## Normalized cache: khác biệt cốt lõi so với TanStack Query

TanStack Query cache theo **query key** — mỗi tổ hợp key là một mục cache riêng biệt, không biết `["user", 1]` và `["dashboard"]` có thể cùng chứa dữ liệu của user số 1. Sửa user ở một nơi không tự động cập nhật nơi khác; phải tự `invalidateQueries` đúng key liên quan.

Apollo Client, Relay, và urql mặc định cache theo **định danh đối tượng**: mỗi object trả về có `__typename` + `id` (hoặc field tương đương) được dùng làm khoá chuẩn hoá, ví dụ `User:1`. Khi một mutation trả về `User:1` với `name` mới, cache cập nhật đúng một bản ghi `User:1` duy nhất — **mọi** component đang hiển thị `User:1` (dù qua query nào) tự động nhận giá trị mới mà không cần khai invalidate thủ công.

```graphql
mutation UpdateName {
  updateUser(id: "1", name: "Tên mới") {
    id
    name
  }
}
```

Chỉ cần response trả đúng `id` và `__typename`, cache tự khớp vào object `User:1` đã có, không cần code thêm ở phía client để "báo cho các query khác biết user vừa đổi tên".

**Nền tảng:** TanStack Query cache theo kết quả của từng request (query key); client GraphQL chuẩn hoá theo định danh đối tượng, nên một object được nhiều query khác nhau tham chiếu tới chỉ tồn tại một bản duy nhất trong cache.

## Relay so với Apollo: kỷ luật đổi lấy tối ưu

Cả hai đều dùng fragment để mỗi component tự khai field nó cần (fragment colocation), nhưng mức độ ép buộc khác nhau rõ rệt.

| Tiêu chí | Apollo Client | Relay |
|---|---|---|
| Kiểm tra lúc nào | Chạy lúc runtime; thiếu field chỉ phát hiện khi UI render thiếu dữ liệu | Compiler (babel-plugin) đọc fragment lúc **build**, báo lỗi ngay nếu dùng field chưa khai |
| Query được ghép thế nào | Mỗi `useQuery` gửi đúng document của nó; ghép fragment là tùy chọn, tùy đội tự kỷ luật | Compiler tự động ghép mọi fragment colocate vào đúng một query tối ưu cho cả cây màn hình |
| Độ tự do | Cao — có thể viết query ad-hoc không qua fragment | Thấp hơn — gần như bắt buộc đi qua fragment + hook `useFragment` sinh bởi compiler |
| Đường cong học | Thoải mái hơn, gần giống viết GraphQL tay | Dốc hơn: phải hiểu compiler, generated types, quy ước đặt tên fragment |

Chọn Relay khi đội đủ lớn để giá trị của "compiler bắt lỗi lúc build" vượt chi phí học thêm một tầng công cụ — thường là các tổ chức có nhiều đội cùng sửa một codebase lớn (nơi Relay ra đời: Meta). Chọn Apollo khi muốn cú pháp gần với GraphQL thuần, linh hoạt hơn, và đội không cần ép buộc nghiêm ngặt tới mức đó. `urql` nằm giữa: nhẹ hơn Apollo, cache chuẩn hoá tùy chọn (document cache mặc định, bật `graphcache` nếu cần chuẩn hoá đầy đủ), phù hợp dự án không cần toàn bộ tính năng của Apollo.

## N+1 query: vấn đề của resolver, không phải của GraphQL

Một field `posts` trên type `User`, nếu resolver viết ngây thơ, có thể gây N+1: lấy danh sách 20 user (1 query), rồi với **mỗi** user lại tự gọi database lấy `posts` của riêng nó (20 query nữa) — tổng 21 round trip tới database cho một response. Đây là lỗi thiết kế ở tầng resolver, xảy ra y hệt nếu REST endpoint viết sai cách tương tự; không phải lỗi bản chất của GraphQL.

Giải pháp chuẩn là **DataLoader**: trong cùng một tick của event loop, gộp mọi lệnh gọi `posts` cho các user khác nhau thành **một** query `WHERE user_id IN (...)`, rồi tự phân phối kết quả về đúng từng resolver đang chờ. Đây là việc của đội backend viết schema/resolver, nhưng một kỹ sư frontend hiểu GraphQL nên biết hỏi đúng câu "field lồng nhau này có DataLoader chưa?" khi thấy dashboard chậm bất thường dù query ngắn gọn.

**Phải thuộc:** N+1 là vấn đề resolver gọi database riêng lẻ cho từng item trong danh sách; DataLoader gộp và dedupe các lệnh gọi trong cùng tick thành một query duy nhất — đây là trách nhiệm tầng server, GraphQL không tự động tránh được nếu resolver viết sai.

## Khi nào đáng, khi nào REST + TanStack Query vẫn đúng

GraphQL đáng chi phí hạ tầng khi: nhiều loại client (web, mobile, đối tác bên thứ ba) cần hình dạng dữ liệu khác nhau từ cùng backend, và duy trì nhiều endpoint REST riêng cho từng client tốn công hơn duy trì một schema; hoặc khi màn hình thực sự under-fetching nghiêm trọng (phải gọi 5-6 endpoint REST cho một trang). GraphQL **không** đáng khi: chỉ có một client web, backend đã có REST ổn định, và vấn đề thật sự chỉ là cần cache tốt hơn — trường hợp đó TanStack Query giải quyết đủ mà không phải xây thêm schema, resolver, và học một tầng cache chuẩn hoá mới.

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Đổi sang GraphQL chỉ vì "hot", vấn đề thật là thiếu cache tốt | Thêm độ phức tạp hạ tầng mà không giải quyết đúng gốc | Thử TanStack Query trước; chỉ đổi khi xác định rõ là over/under-fetching ở tầng network |
| Resolver gọi database riêng cho mỗi item trong danh sách lồng nhau | N+1 query, chậm tuyến tính theo số lượng item | DataLoader gộp theo tick, hoặc JOIN sẵn ở tầng resolver cha |
| Quên trả `id`/`__typename` trong mutation response | Cache không khớp được vào object đã có, UI không tự cập nhật | Luôn yêu cầu `id` (và field vừa đổi) trong mọi mutation trả về |
| Chọn Relay cho một dự án nhỏ, một đội | Chi phí học compiler và quy ước không tương xứng lợi ích | Dùng Apollo hoặc urql cho quy mô nhỏ–vừa; để Relay cho tổ chức nhiều đội cùng một codebase lớn |

## Câu hỏi phỏng vấn thường gặp

### 1. Over-fetching và under-fetching khác nhau thế nào, và GraphQL giải quyết cả hai bằng cơ chế gì?

**Gợi ý suy luận:**
- Over-fetching xảy ra khi endpoint trả nhiều hơn hay ít hơn field cần?
- Under-fetching thì ngược lại — ai là người quyết định hình dạng response trong REST so với GraphQL?

**Lập luận:** Over-fetching là tải về nhiều field hơn component thực sự dùng, vì endpoint REST trả theo hình dạng cố định sẵn. Under-fetching là thiếu field, buộc phải gọi thêm endpoint khác để lấy phần còn thiếu. Cả hai đều bắt nguồn từ việc **server** quyết định hình dạng response trong REST. GraphQL lật ngược quyền đó: **client** khai báo chính xác field cần trong một query, nên không thể thừa (chỉ khai field dùng) và không thể thiếu (khai đủ field cần, kể cả từ nhiều "nguồn" khác nhau phía server) trong cùng một request.

**Đáp án ngắn:** Over-fetching = tải dư field; under-fetching = thiếu field phải gọi thêm endpoint; GraphQL giải cả hai bằng cách để client khai báo hình dạng response thay vì server áp đặt sẵn.

**Nhớ:** REST: server quyết định hình dạng. GraphQL: client quyết định hình dạng.

### 2. Cache của Apollo/Relay khác cache của TanStack Query ở điểm nào, và vì sao điều đó quan trọng khi mutation dữ liệu?

**Gợi ý suy luận:**
- TanStack Query cache theo cái gì làm khoá — theo request hay theo object?
- Khi một object được nhiều query khác nhau tham chiếu tới, cache nào tự động đồng bộ cả hai mà không cần code thêm?

**Lập luận:** TanStack Query cache theo **query key** — mỗi tổ hợp key là một mục riêng, không biết hai key khác nhau có thể chứa cùng một object nghiệp vụ. Apollo/Relay/urql cache theo **định danh đối tượng** (`Type:id`), chuẩn hoá mọi object về một bản duy nhất trong cache bất kể nó được trả về từ query nào. Khi mutation trả về object đã đổi, cache chuẩn hoá tự cập nhật bản ghi đó, nên mọi nơi khác đang hiển thị cùng object tự thấy giá trị mới — không cần tự `invalidateQueries` thủ công như với TanStack Query.

**Đáp án ngắn:** TanStack Query cache theo key của từng request; GraphQL client cache theo định danh đối tượng (chuẩn hoá), nên sửa một object ở một nơi tự động cập nhật mọi nơi khác hiển thị object đó, không cần invalidate tay.

**Nhớ:** cache theo request (TanStack Query) so với cache theo object (GraphQL client chuẩn hoá).

### 3. N+1 query trong GraphQL là lỗi của GraphQL hay của ai, và cách sửa chuẩn là gì?

**Gợi ý suy luận:**
- N+1 có xảy ra nếu viết REST endpoint theo cùng kiểu ngây thơ (query danh sách rồi loop query chi tiết từng item) không?
- DataLoader hoạt động ở tầng nào: schema, resolver, hay network?

**Lập luận:** N+1 xảy ra khi resolver của một field lồng nhau (ví dụ `posts` trên mỗi `User`) tự gọi database riêng cho từng item trong danh sách cha, thay vì gộp lại. Đây là lỗi thiết kế ở **tầng resolver/backend**, xảy ra y hệt nếu một REST endpoint viết theo kiểu loop-query-trong-loop. GraphQL không gây ra N+1, cũng không tự tránh được nó. DataLoader sửa bằng cách gộp mọi lệnh gọi cùng loại trong cùng một tick thành một query duy nhất (`WHERE id IN (...)`), dedupe theo khoá, rồi phân phối kết quả về đúng resolver đang chờ.

**Đáp án ngắn:** N+1 là lỗi thiết kế resolver (gọi database riêng cho từng item), không phải lỗi của GraphQL; DataLoader gộp các lệnh gọi trong cùng tick thành một query để sửa.

**Nhớ:** N+1 là vấn đề resolver/backend; DataLoader = gộp theo tick, không phải tính năng của GraphQL tự có sẵn.

### 4. Một dự án chỉ có một client web, backend REST đã ổn định, team đang cân nhắc đổi sang GraphQL vì "cache khó quản". Bạn khuyên gì?

**Gợi ý suy luận:**
- Vấn đề mô tả là do thiếu công cụ cache tốt, hay do thật sự over/under-fetching ở tầng network?
- Đổi sang GraphQL cần thêm những gì ở tầng server mà đội phải gánh?

**Lập luận:** "Cache khó quản" là triệu chứng thiếu công cụ quản lý server state tốt, không phải triệu chứng của sai giao thức network. TanStack Query giải quyết đúng vấn đề này trên nền REST hiện có: cache theo key, dedupe, invalidate, refetch nền — không cần đổi giao thức. Đổi sang GraphQL đòi hỏi xây schema, resolver, và một tầng cache chuẩn hoá mới ở client, trong khi vấn đề gốc (REST có over/under-fetching thật sự không?) chưa được xác nhận là có tồn tại.

**Đáp án ngắn:** Khuyên thử TanStack Query trên nền REST hiện có trước; chỉ cân nhắc GraphQL nếu xác nhận được vấn đề thật là over/under-fetching ở tầng network, không phải chỉ thiếu công cụ cache.

**Nhớ:** "khó quản cache" → thử TanStack Query trước; đổi giao thức chỉ khi vấn đề thật nằm ở hình dạng dữ liệu network.

Tiếp theo: [Bộ câu hỏi phỏng vấn React](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-react-phong-van.md).
