# Lý thuyết 14: State machine trong React

[Bài 5](/go?p=09-React%2Fmedium%2Flt-05-state-management.md) đã phân loại state (local, lifted, server, URL) và chọn công cụ theo loại. Bài này nói về một trục khác: với state **local nhưng nhiều bước và nhiều nhánh** (wizard nhiều bước, vòng đời một request async, một trình phát nhạc có play/pause/loading/error), vấn đề không phải "đặt state ở đâu" mà là "state được **mô hình hoá** ra sao" — và vì sao mô hình hoá sai cho ra những trạng thái không thể xảy ra trên lý thuyết nhưng vẫn xảy ra trên thực tế.

## Vấn đề nó giải quyết

Một form nhiều bước thường bắt đầu bằng vài cờ rời rạc:

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
const [error, setError] = useState<string | null>(null);
```

Ba biến boolean/nullable độc lập này có `2 × 2 × (null hoặc string)` tổ hợp giá trị — nhưng về nghiệp vụ chỉ có 4 trạng thái hợp lệ: *idle*, *submitting*, *success*, *error*. Phần còn lại (`isSubmitting=true` và `isSuccess=true` cùng lúc, `error` có giá trị mà `isSubmitting` vẫn `true`...) là **trạng thái không thể xảy ra** (impossible state) về mặt nghiệp vụ, nhưng hoàn toàn hợp lệ về mặt kiểu dữ liệu — không có gì ngăn một đường code nào đó (một `setError` quên kèm `setIsSubmitting(false)` sau một lần sửa vội) tạo ra tổ hợp vô nghĩa đó. Nút submit kiểm tra `isSubmitting` để disable, một khối UI khác kiểm tra `isSuccess`, một khối khác kiểm tra `error` — ba điều kiện độc lập, không có gì đảm bảo chúng luôn nhất quán với nhau khi code phát triển qua nhiều lần sửa.

## Các khái niệm cần biết

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| **Trạng thái không thể xảy ra (impossible state)** | Tổ hợp giá trị state hợp lệ về kiểu nhưng vô nghĩa về nghiệp vụ | Là nguồn bug kinh điển của cờ boolean rời rạc; mô hình hoá tốt loại trừ nó ngay ở kiểu dữ liệu |
| **Finite state machine (FSM)** | Mô hình gồm một tập **trạng thái** hữu hạn, một tập **sự kiện**, và một **bảng chuyển trạng thái** quy định sự kiện nào đưa từ trạng thái nào sang trạng thái nào | Tại một thời điểm chỉ ở đúng một trạng thái — không còn tổ hợp cờ mâu thuẫn |
| **Transition (chuyển trạng thái)** | Một hàng trong bảng chuyển: `(trạng thái hiện tại, sự kiện) → trạng thái kế tiếp` | Liệt kê tường minh mọi đường đi hợp lệ; sự kiện không có trong bảng ở trạng thái đó bị bỏ qua có chủ đích |
| **Context (trong XState)** | Dữ liệu đi kèm trạng thái nhưng không làm thay đổi *loại* trạng thái (ví dụ nội dung lỗi, dữ liệu trả về) | Tách rõ "đang ở trạng thái nào" khỏi "dữ liệu chi tiết kèm theo trạng thái đó" |
| **Guard (điều kiện canh)** | Điều kiện phụ quyết định một transition có được phép xảy ra không, ngoài việc khớp sự kiện | Cho phép một sự kiện dẫn tới các trạng thái khác nhau tuỳ điều kiện, mà vẫn tường minh trong định nghĩa máy |
| **Actor model** | Mỗi máy trạng thái chạy như một tiến trình độc lập, nhận message (sự kiện) và tự quản lý trạng thái riêng | Mô hình của XState khi máy trạng thái cần giao tiếp với máy khác (ví dụ form con và wizard cha) |

**Tóm tắt:**

- Nhiều cờ boolean/nullable độc lập cho phép tồn tại những tổ hợp giá trị vô nghĩa về nghiệp vụ (impossible state) dù hợp lệ về kiểu — nguồn bug phổ biến trong luồng nhiều bước.
- Finite state machine thay nhiều cờ rời rạc bằng một trường trạng thái duy nhất cộng một bảng chuyển tường minh, nên tại một thời điểm chỉ có đúng một trạng thái hợp lệ.
- `useReducer` đủ để cài một máy trạng thái đơn giản: state là trạng thái hiện tại, action là sự kiện, hàm reducer chính là bảng chuyển.
- XState thêm vào trên nền tư duy đó: `context` cho dữ liệu kèm trạng thái, `guard` cho điều kiện phụ, actor model cho máy trạng thái giao tiếp với máy khác, và công cụ trực quan hoá biểu đồ trạng thái.
- Ranh giới chọn công cụ: luồng có dưới khoảng 5 trạng thái và không cần giao tiếp giữa nhiều máy thì `useReducer` thuần đã đủ rõ ràng; luồng phức tạp hơn, cần trực quan hoá cho cả đội, hoặc nhiều máy con phối hợp thì XState đáng giá hơn so với chi phí thêm dependency.
- Dấu hiệu cần mô hình hoá lại bằng state machine: UI có đoạn code kiểm tra tổ hợp nhiều cờ cùng lúc (`if (isLoading && !error && !data)`), hoặc từng xảy ra bug "hai trạng thái cùng true" trong thực tế.

## Từ cờ rời rạc sang một trường trạng thái duy nhất

```tsx
// Trước: 3 cờ độc lập, 2×2×2 tổ hợp khả dĩ, chỉ 4 tổ hợp có nghĩa
type BadState = { isSubmitting: boolean; isSuccess: boolean; error: string | null };

// Sau: một union có phân biệt, đúng 4 trạng thái, không tổ hợp nào khác tồn tại được
type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: { id: string } }
  | { status: 'error'; message: string };
```

Với `FormState`, không có cách nào viết ra giá trị vừa `status: 'submitting'` vừa có `message` — TypeScript (xem [Bài TypeScript nâng cao cho React](/go?p=09-React%2Fhard%2Flt-12-typescript-nang-cao-cho-react.md)) từ chối ngay khi gõ nhầm. Đây chính là discriminated union áp dụng vào bài toán luồng nhiều bước, nhưng phần quan trọng hơn kiểu dữ liệu là cách **chuyển** giữa các trạng thái đó có kiểm soát hay không — đó là việc của bảng chuyển trạng thái.

## `useReducer` làm một máy trạng thái tường minh

```tsx
type Event = { type: 'SUBMIT' } | { type: 'SUCCESS'; id: string } | { type: 'FAILURE'; message: string } | { type: 'RESET' };

function reducer(state: FormState, event: Event): FormState {
  switch (state.status) {
    case 'idle':
      return event.type === 'SUBMIT' ? { status: 'submitting' } : state;
    case 'submitting':
      if (event.type === 'SUCCESS') return { status: 'success', data: { id: event.id } };
      if (event.type === 'FAILURE') return { status: 'error', message: event.message };
      return state; // SUBMIT lặp lại khi đang submitting: bỏ qua có chủ đích
    case 'success':
    case 'error':
      return event.type === 'RESET' ? { status: 'idle' } : state;
  }
}

function useOrderForm() {
  const [state, send] = useReducer(reducer, { status: 'idle' });

  async function submit(payload: OrderPayload) {
    send({ type: 'SUBMIT' });
    try {
      const { id } = await createOrder(payload);
      send({ type: 'SUCCESS', id });
    } catch (e) {
      send({ type: 'FAILURE', message: e instanceof Error ? e.message : 'Lỗi không xác định' });
    }
  }

  return { state, submit, reset: () => send({ type: 'RESET' }) };
}
```

So với reducer thường chỉ cập nhật field, điểm khác biệt ở đây là `switch` chia theo `state.status` trước, rồi mới xét `event.type` — đó chính là bảng chuyển `(trạng thái, sự kiện) → trạng thái kế`, chỉ viết bằng cú pháp JavaScript thường. Một `SUBMIT` gửi tới khi đang `submitting` bị bỏ qua có chủ đích (double-submit không tạo thêm request thứ hai), và điều đó hiện rõ ngay trong code, không ẩn trong một điều kiện `disabled={isSubmitting}` rải rác ở UI.

**Phải thuộc:** bản chất của việc "dùng state machine" không nằm ở thư viện nào được import — nó nằm ở việc **liệt kê tường minh các trạng thái và các chuyển đổi hợp lệ giữa chúng**, thay vì suy ra trạng thái hiện tại bằng cách đọc tổ hợp nhiều biến độc lập. `useReducer` với một `switch` theo trạng thái hiện tại đã là một máy trạng thái, dù không gọi tên "state machine".

## Khi nào XState trả giá xứng đáng hơn `useReducer` thuần

```tsx
import { createMachine, assign } from 'xstate';
import { useMachine } from '@xstate/react';

const orderMachine = createMachine({
  id: 'order',
  initial: 'idle',
  context: { orderId: null as string | null, errorMessage: null as string | null },
  states: {
    idle: { on: { SUBMIT: 'submitting' } },
    submitting: {
      on: {
        SUCCESS: { target: 'success', actions: assign({ orderId: ({ event }) => event.id }) },
        FAILURE: {
          target: 'error',
          guard: ({ event }) => event.code !== 'CANCELLED', // bỏ qua lỗi do người dùng tự huỷ
          actions: assign({ errorMessage: ({ event }) => event.message }),
        },
      },
    },
    success: { on: { RESET: 'idle' } },
    error: { on: { RESET: 'idle', SUBMIT: 'submitting' } }, // cho thử lại trực tiếp từ error
  },
});

function useOrderForm() {
  const [state, send] = useMachine(orderMachine);
  return { state, send };
}
```

So với `useReducer`, bảng chuyển ở đây được khai báo như **dữ liệu** (`states`, `on`) thay vì nhánh `switch`/`if` trong code mệnh lệnh — công cụ của XState đọc trực tiếp khai báo đó để vẽ ra biểu đồ trạng thái, điều rất có giá trị khi cần cả đội (kể cả người không đọc code) thống nhất về luồng nghiệp vụ. `guard` thêm điều kiện phụ cho một transition (lỗi do huỷ thì không chuyển sang `error`), và `context` tách bạch dữ liệu đi kèm khỏi loại trạng thái. Actor model phát huy khi một máy con (ví dụ máy trạng thái của từng bước trong wizard) cần báo cho máy cha "tôi đã hoàn tất" mà không để cha biết chi tiết cài đặt bên trong bước đó.

| Tiêu chí | `useReducer` thuần | XState |
|---|---|---|
| Số trạng thái và độ phức tạp chuyển đổi | Ít trạng thái, luồng tuyến tính hoặc rẽ nhánh đơn giản | Nhiều trạng thái, nhiều điều kiện phụ, nhiều máy con phối hợp |
| Trực quan hoá cho cả đội (kể cả người không đọc code) | Không có sẵn | Có (XState Visualizer / Stately Studio đọc trực tiếp định nghĩa máy) |
| Chi phí thêm dependency và đường cong học | Không có, chỉ dùng API React sẵn có | Có, cần học khái niệm actor, guard, cú pháp khai báo |
| Kiểm thử | Test hàm reducer thuần (input state + event, kỳ vọng state mới) | Test tương tự qua `machine.transition`, cộng công cụ riêng cho test đường đi |

**Suy luận:** cả hai cách đều dựa trên cùng một ý tưởng gốc — bảng chuyển tường minh thay cho cờ rời rạc. Khác biệt chỉ là bảng đó được viết bằng code mệnh lệnh (`switch`) hay bằng dữ liệu khai báo (object cấu hình). Khi độ phức tạp còn vừa phải, viết tay bằng `useReducer` vẫn rõ ràng và không tốn thêm dependency; khi luồng đủ phức tạp để bản thân bảng chuyển trở thành tài sản cần chia sẻ, trực quan hoá và kiểm thử riêng, XState trả giá xứng đáng hơn.

## Bẫy thường gặp

| Bẫy | Hậu quả | Sửa |
|---|---|---|
| Thêm một cờ boolean mới mỗi khi có một trạng thái mới cần biểu diễn | Số tổ hợp giá trị tăng theo cấp số nhân, ngày càng nhiều tổ hợp vô nghĩa | Gộp các cờ liên quan thành một union có phân biệt ngay khi thêm trạng thái thứ ba |
| Để UI tự suy luận trạng thái bằng cách đọc nhiều điều kiện (`if (isLoading && !error)`) | Logic suy luận trạng thái lặp lại rải rác, dễ lệch nhau giữa các nơi | Tính trạng thái một lần ở nguồn (reducer/machine), UI chỉ đọc `state.status` |
| Dùng XState cho một luồng chỉ có 2-3 trạng thái tuyến tính | Thêm dependency và khái niệm mới mà không ai hưởng lợi | Giữ `useReducer` hoặc thậm chí `useState` đơn giản cho luồng thật sự đơn giản |
| Quên xử lý sự kiện "không hợp lệ ở trạng thái hiện tại" (ví dụ `SUBMIT` khi đang `submitting`) | Nếu không có `return state` mặc định, reducer có thể ném lỗi hoặc rơi vào trạng thái sai | Luôn có nhánh mặc định trả nguyên trạng thái hiện tại cho sự kiện không được định nghĩa ở trạng thái đó |

## Câu hỏi phỏng vấn thường gặp

### 1. Vì sao ba cờ boolean độc lập cho một luồng submit lại là một thiết kế dễ sinh bug?

**Gợi ý suy luận:**
- Với 3 biến boolean/nullable độc lập, có bao nhiêu tổ hợp giá trị khả dĩ về mặt kiểu? Có bao nhiêu tổ hợp thật sự có nghĩa về nghiệp vụ?
- Điều gì ngăn một lần sửa code sau này tạo ra một tổ hợp vô nghĩa?

**Lập luận:** Ba biến độc lập cho phép mọi tổ hợp giá trị của chúng cùng tồn tại về mặt kiểu, trong khi nghiệp vụ chỉ công nhận một số ít tổ hợp là hợp lệ. Không có gì ở tầng kiểu dữ liệu ngăn các phần code khác nhau (được sửa vào các thời điểm khác nhau) vô tình tạo ra một tổ hợp còn lại — ví dụ quên `setIsSubmitting(false)` sau khi đã `setError(...)`.

**Đáp án ngắn:** Vì các cờ độc lập cho phép tồn tại những tổ hợp giá trị vô nghĩa về nghiệp vụ nhưng hợp lệ về kiểu, và không có cơ chế nào ở tầng kiểu ngăn chặn điều đó khi code phát triển qua nhiều lần sửa.

**Nhớ:** nhiều cờ độc lập = nhiều tổ hợp vô nghĩa khả dĩ; một trường trạng thái duy nhất = chỉ các trạng thái được liệt kê mới tồn tại.

### 2. `useReducer` có "là" một state machine không, hay phải dùng thư viện riêng mới tính là state machine?

**Gợi ý suy luận:**
- Định nghĩa của state machine cần những thành phần nào: tập trạng thái, tập sự kiện, bảng chuyển?
- Một hàm reducer với `switch` theo trạng thái hiện tại có đủ ba thành phần đó không?

**Lập luận:** State machine là một mô hình toán học (trạng thái, sự kiện, bảng chuyển), không gắn với thư viện cụ thể nào. Một reducer chia nhánh theo `state.status` trước rồi mới xét sự kiện chính là cách viết tay bảng chuyển đó bằng code mệnh lệnh. XState chỉ là công cụ biểu diễn cùng mô hình đó bằng cấu hình khai báo, kèm thêm actor model và công cụ trực quan hoá.

**Đáp án ngắn:** Có — `useReducer` với nhánh theo trạng thái hiện tại đã là một state machine viết tay; XState là một cách biểu diễn khác (khai báo, có thêm công cụ) cho cùng mô hình.

**Nhớ:** state machine là một ý tưởng, `useReducer` và XState chỉ là hai cách viết nó ra.

### 3. Khi nào nên đổi từ `useReducer` sang XState, và chi phí đánh đổi là gì?

**Gợi ý suy luận:**
- Điều gì khiến bảng chuyển trở nên khó đọc/khó bảo trì chỉ bằng `switch`: số trạng thái, số điều kiện phụ, hay nhu cầu nhiều máy phối hợp?
- Thêm XState vào dự án tốn những gì ngoài dung lượng bundle?

**Lập luận:** Khi số trạng thái và điều kiện phụ tăng đến mức bảng chuyển viết bằng `switch`/`if` lồng nhau khó đọc, hoặc khi cần nhiều máy trạng thái con giao tiếp với nhau (actor model), hoặc khi cả đội (kể cả người không đọc code) cần nhìn thấy luồng nghiệp vụ dưới dạng biểu đồ, lợi ích của cấu hình khai báo và công cụ trực quan hoá vượt chi phí. Chi phí gồm: thêm dependency, đường cong học khái niệm actor/guard, và một tầng trừu tượng mới cho người đọc code sau này.

**Đáp án ngắn:** Đổi khi độ phức tạp của bảng chuyển hoặc nhu cầu phối hợp nhiều máy vượt mức một `switch` còn rõ ràng; đánh đổi là dependency thêm và khái niệm mới phải học.

**Nhớ:** đổi công cụ khi bảng chuyển trở thành tài sản cần chia sẻ và trực quan hoá, không phải mặc định ngay từ đầu.

Tiếp theo: [Bộ câu hỏi phỏng vấn React](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-react-phong-van.md).
