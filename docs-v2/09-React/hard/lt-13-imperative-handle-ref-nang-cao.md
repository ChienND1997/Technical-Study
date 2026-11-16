# Lý thuyết 13: API mệnh lệnh trong React — `useImperativeHandle` và sự tiến hoá của `ref`

[Bài 2](/go?p=09-React%2Feasy%2Flt-02-hooks-co-ban.md) đã nói `ref` là một ô chứa tham chiếu bền giữa các lần render, và từ React 19 là một prop thường của function component. Bài này đi sâu vào phần còn lại: khi nào một component **chủ động lộ ra một API mệnh lệnh** (gọi hàm, không chỉ đọc giá trị) qua `ref` của chính nó bằng `useImperativeHandle`, ranh giới giữa dùng đúng chỗ và dùng để né tránh tư duy khai báo của React.

## Vấn đề nó giải quyết

React là khai báo: component render ra UI từ state và props, không ai "gọi hàm" trên component khác để đổi UI của nó. Nhưng một số hành vi thật sự mang bản chất mệnh lệnh mà không component cha nào tự tính ra được bằng state — ví dụ "đặt focus vào ô input này ngay bây giờ", "phát video", "cuộn một phần tử vào khung nhìn", "rung animation một lần". Những việc này là **lệnh tại một thời điểm**, không phải trạng thái tồn tại liên tục; biểu diễn chúng bằng state (`shouldFocus: boolean`) vừa lúng túng (ai đặt lại `false` sau khi đã focus?) vừa sai mô hình. `ref` kèm `useImperativeHandle` cho component con một cách lộ ra đúng một tập hàm hẹp, còn lại vẫn khai báo như bình thường.

## Các khái niệm cần biết

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| **API mệnh lệnh (imperative API)** | Tập hàm gọi để "làm một việc ngay", khác với props/state mô tả "trạng thái hiện tại nên là gì" | Phân biệt được việc nào nên là prop/state, việc nào nên là hàm trên `ref` |
| **`useImperativeHandle(ref, createHandle, deps?)`** | Hook quyết định đúng những gì một component expose ra khi cha cầm `ref` tới nó | Không cho cha truy cập thẳng DOM node hay state nội bộ — chỉ lộ đúng tập hàm được thiết kế |
| **`useRef` nội bộ + `ref` nhận từ cha** | Component vẫn giữ `ref` riêng trỏ DOM node thật, rồi đưa một "mặt nạ" ra ngoài qua `useImperativeHandle` | `ref` nội bộ dùng để thao tác DOM thật; `ref` cha nhận được là API đã được thiết kế, không phải DOM node trần |
| **Escape hatch (lối thoát hiểm)** | Cơ chế React cho phép thoát khỏi mô hình khai báo khi thật sự cần, có đánh đổi rõ ràng | `useImperativeHandle` là một escape hatch; dùng đúng lúc thì tốt, lạm dụng thì phá vỡ lý do dùng React |
| **Ref callback với cleanup (React 19)** | Callback ref có thể trả về một hàm dọn dẹp, chạy khi `ref` đổi hoặc unmount | Đối xứng với `useEffect`, cho phép gắn và tháo side effect gắn theo node mà không cần `useEffect` riêng |

**Tóm tắt:**

- `useImperativeHandle` dùng cho hành vi mang bản chất **lệnh tại một thời điểm** (focus, play, scroll, trigger animation), không phải cho trạng thái nên biểu diễn bằng props/state.
- Nó quyết định đúng tập hàm một component lộ ra qua `ref` của mình, thay vì để cha cầm thẳng DOM node và tự ý thao tác.
- Component vẫn giữ một `ref` nội bộ trỏ DOM thật; `useImperativeHandle` tạo ra "mặt nạ" API khác hẳn, nhỏ hơn, cho `ref` mà cha nhận được.
- Dấu hiệu lạm dụng: gọi hàm trên `ref` để đồng bộ dữ liệu nghiệp vụ, hoặc thay thế hoàn toàn việc truyền props — đó là dùng escape hatch cho việc đáng ra nên khai báo.
- React 19 cho callback ref trả về hàm cleanup, đối xứng với effect, nên một số trường hợp trước đây cần `useImperativeHandle` + `useEffect` phối hợp nay gọn hơn.
- `forwardRef` không còn bắt buộc để nhận `ref` (xem [Bài 2](/go?p=09-React%2Feasy%2Flt-02-hooks-co-ban.md)), nhưng `useImperativeHandle` vẫn cần thiết bất kể cách nhận `ref` nào, vì vấn đề nó giải quyết là "lộ API gì", không phải "nhận `ref` thế nào".

## `useImperativeHandle`: từ DOM node thật tới API được thiết kế

```tsx
type VideoPlayerHandle = {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
};

function VideoPlayer({ src, ref }: { src: string; ref?: React.Ref<VideoPlayerHandle> }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seekTo: (seconds) => { if (videoRef.current) videoRef.current.currentTime = seconds; },
  }), []);

  return <video ref={videoRef} src={src} />;
}

// Component cha:
function Lesson() {
  const playerRef = useRef<VideoPlayerHandle>(null);
  return (
    <>
      <VideoPlayer ref={playerRef} src="/intro.mp4" />
      <button onClick={() => playerRef.current?.seekTo(30)}>Nhảy tới 0:30</button>
    </>
  );
}
```

Điểm mấu chốt: `playerRef.current` ở component cha **không phải** `HTMLVideoElement`. Nó là object `{ play, pause, seekTo }` do `useImperativeHandle` tạo ra. Cha không thể gọi `playerRef.current.pause.bind(...)` theo cách DOM API thật cho phép, không đọc được `videoRef.current.duration` hay bất kỳ thuộc tính DOM nào khác — đúng chủ đích: `VideoPlayer` kiểm soát chặt chẽ bề mặt API mà nó cam kết, có thể đổi cách cài đặt bên trong (đổi thư viện video) mà không phá API bên ngoài.

**Phải thuộc:** `useImperativeHandle(ref, createHandle, deps)` nhận `ref` của chính component (từ cha truyền xuống), và trả ra object thay thế hoàn toàn cho những gì `ref.current` trỏ tới khi nhìn từ phía cha. `deps` hoạt động như dependency array của `useMemo` — object trả về chỉ tạo lại khi deps đổi, tránh cha nhận một tham chiếu hàm mới mỗi lần render.

## Ranh giới: khi nào là thiết kế đúng, khi nào là mùi code

| Tình huống | Imperative API hợp lý? | Vì sao |
|---|---|---|
| Component input tuỳ chỉnh cần `focus()` khi submit form lỗi | Có | "Đặt focus ngay bây giờ" là lệnh tại một thời điểm, không phải trạng thái tồn tại |
| Modal cần `open()`/`close()` gọi từ xa (ngoài luồng render bình thường, ví dụ từ một event global) | Có, nếu modal thật sự không có "chủ sở hữu" state rõ ràng | Vẫn nên cân nhắc trước: phần lớn modal quản lý tốt hơn bằng state `isOpen` ở cha |
| Đồng bộ dữ liệu form con lên cha mỗi khi người dùng gõ | Không | Đây là luồng dữ liệu bình thường, nên dùng `onChange` callback hoặc state nâng lên, không phải "gọi hàm lấy dữ liệu" qua `ref` |
| Cha cần biết `items.length` của danh sách con để hiện badge | Không | Đây là dữ liệu hiển thị, nên là state/props, không phải hàm đọc qua `ref` |
| Trigger một animation "rung" một lần khi validation sai | Có | Đúng bản chất: một lệnh xảy ra một lần, không phải trạng thái liên tục cần render lại theo |

**Suy luận:** câu hỏi quyết định không phải "có tiện không" mà là "đây có phải một **lệnh tại một thời điểm**, hay là **dữ liệu cần hiển thị liên tục**?". Dữ liệu hiển thị liên tục luôn nên chảy qua props/state theo luồng dữ liệu một chiều của React, vì chỉ luồng đó mới khiến UI luôn nhất quán với dữ liệu sau mỗi lần render. Lệnh tại một thời điểm thì không có "giá trị hiện tại" để render theo — nó chỉ xảy ra rồi thôi, nên hợp lý khi đi qua một lời gọi hàm thay vì một thay đổi state kéo theo re-render không cần thiết.

## Cleanup trên callback ref (React 19): dọn dẹp gắn theo node, không theo effect

Trước React 19, muốn chạy code khi một DOM node cụ thể gắn vào và dọn dẹp khi nó biến mất (ví dụ gắn một thư viện bên thứ ba trực tiếp lên node), thường phải phối hợp `ref` với `useEffect` — nhưng `useEffect` chạy theo vòng đời component, không hoàn toàn khớp với vòng đời của node nếu `ref` đổi object giữa chừng (ví dụ phần tử bị thay bởi điều kiện render khác). React 19 cho callback ref trả về một hàm cleanup, chạy đúng lúc `ref` đó tháo khỏi node:

```tsx
function Tooltip({ text }: { text: string }) {
  const refCallback = (node: HTMLDivElement | null) => {
    if (!node) return;
    const instance = attachThirdPartyTooltip(node, text); // thư viện ngoài, ví dụ Tippy.js
    return () => instance.destroy(); // cleanup: chạy khi node này bị tháo
  };
  return <div ref={refCallback}>{text}</div>;
}
```

Điều này đối xứng với `useEffect(() => { ...; return () => ...; }, deps)`, nhưng gắn chặt vào đúng vòng đời của node DOM thay vì vòng đời của component — hữu ích khi nhiều node khác nhau có thể được gắn cùng một callback ref qua các lần render (ví dụ trong danh sách), vì mỗi node tự có cleanup riêng đúng lúc.

## Bẫy thường gặp

| Bẫy | Hậu quả | Sửa |
|---|---|---|
| Expose toàn bộ DOM node qua `ref` thay vì `useImperativeHandle` | Cha thao tác DOM trực tiếp, component con không còn kiểm soát được bề mặt API, khó đổi cách cài đặt sau này | `useImperativeHandle` trả về đúng tập hàm cố ý thiết kế |
| Dùng `useImperativeHandle` để cha "lấy dữ liệu" từ con định kỳ | Phá vỡ luồng dữ liệu một chiều, UI không tự đồng bộ khi dữ liệu đổi mà không ai gọi lại hàm | Nâng state lên cha hoặc dùng callback `onChange`, để React tự re-render khi dữ liệu đổi |
| Quên truyền `deps` cho `useImperativeHandle`, tạo object mới mỗi render | Không sai về mặt chức năng, nhưng cha dùng object đó trong `useEffect` dependency sẽ chạy lại effect liên tục | Truyền `deps` đúng những giá trị object trả về thực sự phụ thuộc |
| Gắn thư viện bên thứ ba bằng `useEffect` + ref object thường trong danh sách có node đổi liên tục | Cleanup không khớp đúng node đã bị tháo, rò rỉ instance thư viện | Dùng callback ref trả cleanup (React 19) gắn chặt với đúng vòng đời node |

## Câu hỏi phỏng vấn thường gặp

### 1. Khi nào nên dùng `useImperativeHandle`, khi nào là dấu hiệu thiết kế sai?

**Gợi ý suy luận:**
- Thứ bạn muốn làm có "giá trị hiện tại" cần render theo không, hay chỉ là một hành động xảy ra một lần?
- Nếu thay bằng một state ở cha và truyền prop xuống, cách đó có tự nhiên hơn không?

**Lập luận:** Nếu thứ cần làm là một lệnh tại một thời điểm (focus, play, scroll, trigger animation một lần) thì không có "giá trị" nào để render theo — biểu diễn bằng state sẽ lúng túng (ai đặt lại cờ sau khi lệnh đã chạy?). Nếu là dữ liệu cần hiển thị liên tục hoặc đồng bộ qua lại, bản chất đó phải đi qua props/state để UI luôn nhất quán, dùng `ref` để "lấy dữ liệu" sẽ phá luồng một chiều.

**Đáp án ngắn:** Dùng khi đó là lệnh tại một thời điểm, không có trạng thái liên tục cần render theo; là dấu hiệu sai khi dùng để thay thế luồng dữ liệu props/state bình thường.

**Nhớ:** lệnh thì qua hàm trên `ref`; dữ liệu thì qua props/state.

### 2. `useImperativeHandle` trả về object khác gì so với việc cha cầm thẳng DOM node qua `ref`?

**Gợi ý suy luận:**
- Nếu cha cầm thẳng `HTMLVideoElement`, cha có thể làm gì mà component gốc không chủ đích cho phép?
- Điều gì xảy ra nếu sau này component đổi cách cài đặt bên trong (đổi thư viện video)?

**Lập luận:** Cầm thẳng DOM node nghĩa là cha có toàn quyền trên mọi thuộc tính/phương thức của node đó, kể cả những thứ component gốc không muốn cho dùng, và mọi thay đổi cài đặt bên trong (đổi cấu trúc DOM, đổi thư viện) có nguy cơ phá cha đang dùng trực tiếp node cũ. `useImperativeHandle` chặn lại, chỉ lộ đúng tập hàm được thiết kế, nên cài đặt bên trong đổi thế nào cũng không ảnh hưởng cha miễn tập hàm công khai còn giữ nguyên.

**Đáp án ngắn:** `useImperativeHandle` giới hạn bề mặt API lộ ra, tách biệt cài đặt bên trong khỏi API công khai; cầm thẳng DOM node thì không có ranh giới đó.

**Nhớ:** `useImperativeHandle` là hợp đồng API; DOM node thật là chi tiết cài đặt.

### 3. Callback ref trả cleanup (React 19) giải quyết vấn đề gì mà `useEffect` không giải quyết gọn bằng?

**Gợi ý suy luận:**
- Vòng đời của một `useEffect` gắn theo cái gì — component hay một DOM node cụ thể?
- Trong một danh sách mà các node bị thay đổi qua lại, `useEffect` với dependency là `ref.current` có đáng tin cậy không?

**Lập luận:** `useEffect` chạy theo vòng đời re-render của component, còn callback ref chạy đúng lúc một node cụ thể được gắn hoặc tháo — với danh sách mà các phần tử bị thêm/bớt/thay đổi, vòng đời của node và vòng đời của effect không nhất thiết khớp nhau, dẫn tới cleanup chạy sai thời điểm hoặc nhắm sai node. Callback ref trả cleanup gắn chặt đúng với vòng đời node, đối xứng `setup`/`cleanup` giống effect nhưng theo đúng đối tượng cần theo dõi.

**Đáp án ngắn:** Nó gắn setup/cleanup đúng theo vòng đời của từng DOM node cụ thể, điều `useEffect` theo vòng đời component không đảm bảo chính xác khi node đổi qua lại (như trong danh sách).

**Nhớ:** callback ref cleanup theo node; `useEffect` cleanup theo lần chạy effect của component.

Tiếp theo: [Bộ câu hỏi phỏng vấn React](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-react-phong-van.md).
