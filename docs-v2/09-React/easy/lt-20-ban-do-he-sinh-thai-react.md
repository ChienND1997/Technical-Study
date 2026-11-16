# Lý thuyết 20: Bản đồ hệ sinh thái React

Bài này không dạy sâu một công cụ nào — nó trả lời câu hỏi "tôi vừa nghe một cái tên lạ, nó thuộc nhóm nào, và tôi nên đọc tiếp ở đâu?". Đọc bài này trước khi vào các bài chuyên sâu ([Bài 5](/go?p=09-React%2Fmedium%2Flt-05-state-management.md), [Bài 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md), [Bài 16](/go?p=09-React%2Fhard%2Flt-16-styling-headless-ui-react.md), [Bài 17](/go?p=09-React%2Fhard%2Flt-17-graphql-data-layer-react.md)...) để biết vì sao chúng tồn tại và chúng xếp vào đâu trong bức tranh chung.

## React chỉ vẽ UI — mọi thứ khác là lựa chọn của bạn

Đây là điều khiến người mới học React hay bị choáng ngợp: bản thân thư viện `react` chỉ làm đúng một việc — nhận state và props, trả ra một cây mô tả UI (xem [Bài 1](/go?p=09-React%2Feasy%2Flt-01-tu-duy-react-render.md)). React **không** tự quyết định bạn chuyển trang thế nào, gọi API ra sao, hay style bằng gì. Mỗi việc đó là một **nhóm vấn đề** riêng, và cộng đồng tạo ra nhiều thư viện cạnh tranh nhau để giải quyết nhóm đó. Khi ai đó nhắc một cái tên thư viện bạn chưa nghe, câu hỏi đầu tiên nên là "nó giải quyết nhóm vấn đề nào trong danh sách dưới đây?", không phải cố nhớ API của nó ngay.

**Nền tảng:** hiểu React mà không hiểu bản đồ hệ sinh thái giống như biết xây một bức tường gạch nhưng không biết tường đó thuộc ngôi nhà nào — bạn cần biết các mảnh ghép xung quanh (router, state, data, style, test) khớp với nhau ở đâu thì mới dựng được một ứng dụng thật.

## Bản đồ theo nhóm vấn đề

| Nhóm vấn đề | Giải quyết gì | Vài thư viện thường gặp | Đọc sâu ở đâu |
|---|---|---|---|
| **Routing** | Chuyển trang trong SPA mà không tải lại cả trang; đổi URL khớp với "đang xem cái gì" | React Router, TanStack Router, Next.js (framework có router tích hợp) | [Bài 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md) |
| **State management (toàn cục)** | Chia sẻ một mẩu dữ liệu giữa nhiều component ở xa nhau trong cây, không phải qua Context đơn thuần | Context (có sẵn trong React), Zustand, Redux Toolkit, Jotai | [Bài 5](/go?p=09-React%2Fmedium%2Flt-05-state-management.md) |
| **Server state / data fetching** | Gọi API, cache kết quả, tự động refetch, tránh race condition — khác hẳn state cục bộ trong component | TanStack Query, SWR, RTK Query (REST); Apollo, Relay, urql (GraphQL) | [Bài 5](/go?p=09-React%2Fmedium%2Flt-05-state-management.md) cho TanStack Query, [Bài 17](/go?p=09-React%2Fhard%2Flt-17-graphql-data-layer-react.md) cho GraphQL |
| **Forms & validation** | Theo dõi giá trị nhiều trường, validate, hiện lỗi, submit — mà không viết tay `useState` cho từng trường | React Hook Form, Formik, kết hợp Zod để định nghĩa schema | [Bài 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md), nền tảng ở [Forms cơ bản](/go?p=09-React%2Feasy%2Flt-31-forms-co-ban.md) |
| **Styling** | Viết CSS cho component theo cách nào: utility class, CSS Module, CSS-in-JS, hay dùng sẵn thư viện component | Tailwind CSS, CSS Modules, Radix UI/React Aria (headless), Chakra UI/Material UI (có sẵn giao diện), Shadcn UI | [Bài 16](/go?p=09-React%2Fhard%2Flt-16-styling-headless-ui-react.md) |
| **Animation** | Chuyển động mượt giữa hai trạng thái UI, enter/exit của component | CSS transition thuần, Framer Motion, React Spring | [Bài 11](/go?p=09-React%2Fhard%2Flt-11-animation-react.md) |
| **Type safety** | Bắt lỗi sai kiểu dữ liệu (props sai, state sai hình dạng) lúc biên dịch thay vì lúc chạy | TypeScript, kết hợp Zod để validate dữ liệu thật lúc chạy | [Bài 12](/go?p=09-React%2Fhard%2Flt-12-typescript-nang-cao-cho-react.md) |
| **Testing** | Tự động kiểm tra component hoạt động đúng mà không cần bấm tay | Vitest/Jest (chạy test), React Testing Library (test component), Playwright/Cypress (test E2E) | [Bài 7](/go?p=09-React%2Fmedium%2Flt-07-testing-react.md) |
| **Framework toàn diện** | Gộp sẵn routing, data fetching, build, tối ưu production thành một bộ thay vì tự ghép từng mảnh | Next.js, Astro (ít JS hơn, thiên về nội dung tĩnh) | [Bài 9](/go?p=09-React%2Fhard%2Flt-09-ssr-rsc-nextjs.md) |
| **Quản lý luồng phức tạp** | Mô hình hóa một quy trình nhiều bước (wizard, trạng thái request) để tránh "trạng thái không thể xảy ra" | `useReducer` thuần, XState | [Bài 14](/go?p=09-React%2Fhard%2Flt-14-state-machine-trong-react.md) |

## Cách đọc bảng trên khi gặp một cái tên lạ

Ví dụ thực tế: bạn đọc một bài blog nhắc đến "dùng Zustand với TanStack Query và Zod". Thay vì hoảng vì ba cái tên cùng lúc, tách ra: Zustand thuộc nhóm **state management toàn cục** (lưu một mẩu state UI dùng chung, ví dụ "giỏ hàng đang mở hay đóng"); TanStack Query thuộc nhóm **server state** (lấy và cache dữ liệu từ API, ví dụ "danh sách sản phẩm"); Zod thuộc nhóm **type safety / validation** (đảm bảo dữ liệu từ API hoặc từ form đúng hình dạng mong đợi). Ba thư viện này giải quyết ba vấn đề khác hẳn nhau và thường **dùng cùng lúc trong một ứng dụng**, không cạnh tranh nhau — khác với Zustand và Redux Toolkit, cả hai đều thuộc nhóm state management toàn cục nên mới là lựa chọn loại trừ nhau.

**Phải thuộc:** hai thư viện trong **cùng một hàng** của bảng trên là lựa chọn thay thế nhau (chọn một); hai thư viện ở **hai hàng khác nhau** thường là mảnh ghép bổ sung cho nhau trong cùng một ứng dụng, không phải đối thủ.

## Vì sao không có "một bộ đúng" cho mọi dự án

Không có câu trả lời "nên luôn dùng X" cho bất kỳ hàng nào ở trên — lựa chọn phụ thuộc quy mô team, có cần SSR hay không, team đã quen công cụ nào. Mục tiêu của bài này không phải giúp bạn chọn, mà giúp bạn **định vị** một cái tên mới nghe thấy vào đúng hàng, rồi qua bài chuyên sâu tương ứng để đọc về đánh đổi cụ thể. Một dự án React thật sự thường chọn đúng một (đôi khi không chọn gì, dùng Context tạm) từ mỗi hàng cần dùng, không phải toàn bộ bảng.

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Zustand và TanStack Query có phải hai lựa chọn cạnh tranh nhau cho cùng một việc không?

**Gợi ý suy luận:**
- Zustand lưu loại dữ liệu nào: dữ liệu đến từ server, hay trạng thái thuần UI do client tự tạo ra?
- TanStack Query giải quyết việc gì liên quan đến mạng mà Zustand không tự làm (cache, refetch, dedupe request)?

**Lập luận:** Zustand thuộc nhóm state management toàn cục, dùng cho state do chính ứng dụng tạo ra (ví dụ trạng thái mở/đóng của một modal dùng chung). TanStack Query thuộc nhóm server state, chuyên trách việc gọi API, cache theo key, tự động refetch và tránh race condition. Hai nhóm giải quyết hai loại dữ liệu khác hẳn nhau, nên trong thực tế một ứng dụng thường dùng cả hai cùng lúc, không phải chọn một.

**Đáp án ngắn:** Không — chúng thuộc hai nhóm khác nhau (state UI cục bộ dùng chung, so với dữ liệu lấy từ server) và thường được dùng cùng lúc, không cạnh tranh.

**Nhớ:** xem phần "Cách đọc bảng trên khi gặp một cái tên lạ".

### 2. Khi nghe một thư viện React mới lần đầu, bước đầu tiên nên làm gì thay vì học ngay API của nó?

**Gợi ý suy luận:**
- Nếu không biết thư viện đó thuộc nhóm vấn đề nào, học API của nó có giúp bạn biết khi nào nên dùng nó không?
- Xác định đúng nhóm trước có giúp bạn đoán được nó cạnh tranh hay bổ sung với công cụ bạn đang dùng không?

**Lập luận:** Học API trước khi biết thư viện đó giải quyết nhóm vấn đề nào dễ dẫn đến hiểu sai phạm vi của nó (dùng nó để làm việc nó không thiết kế cho, hoặc tưởng nó thay thế được một công cụ khác mà thực ra chúng bổ sung nhau). Xác định đúng nhóm trước giúp bạn biết ngay nó là lựa chọn thay thế cho công cụ nào đang có, hay là mảnh ghép mới hoàn toàn.

**Đáp án ngắn:** Xác định nó thuộc nhóm vấn đề nào (routing, state, data, style, test...) trước, rồi mới học API chi tiết của nó.

**Nhớ:** xem phần "React chỉ vẽ UI — mọi thứ khác là lựa chọn của bạn".

### 3. Vì sao React không đi kèm sẵn một bộ router, một bộ quản lý state chính thức, như một số framework khác?

**Gợi ý suy luận:**
- React tự định nghĩa phạm vi của mình là gì — chỉ riêng "render UI từ state", hay toàn bộ kiến trúc ứng dụng?
- Việc để các nhóm vấn đề khác mở cho nhiều thư viện cạnh tranh có đánh đổi gì so với một framework gộp sẵn mọi thứ (ví dụ Next.js)?

**Lập luận:** React chủ động giới hạn phạm vi của mình ở lớp render UI, để các nhóm vấn đề khác (routing, state, data fetching) là sân chơi mở cho nhiều giải pháp cạnh tranh, mỗi giải pháp tối ưu cho một đánh đổi khác nhau (đơn giản, hiệu năng, tích hợp TypeScript). Đánh đổi là người mới phải tự ghép nhiều mảnh thay vì có sẵn một lựa chọn duy nhất — đây cũng chính là lý do các framework toàn diện như Next.js tồn tại: chúng đóng gói sẵn một bộ lựa chọn mặc định hợp lý thay bạn.

**Đáp án ngắn:** Vì React cố tình chỉ giới hạn phạm vi ở việc render UI, để các vấn đề khác là sân chơi mở; framework như Next.js là lớp đóng gói sẵn các lựa chọn đó cho bạn.

**Nhớ:** xem phần "Vì sao không có 'một bộ đúng' cho mọi dự án", và [Bài 9](/go?p=09-React%2Fhard%2Flt-09-ssr-rsc-nextjs.md) về Next.js.
