# Lý thuyết 29: Component Lifecycle

Bài [Tư duy React và render](/go?p=09-React%2Feasy%2Flt-01-tu-duy-react-render.md) đã nói về **cơ chế** render (ba pha trigger/render/commit cho một lần cập nhật). Bài này nói về một trục khác: **vòng đời** của một component cụ thể, từ lúc nó lần đầu xuất hiện trên cây đến lúc nó biến mất, và những lần cập nhật ở giữa.

## Ba giai đoạn: mount, update, unmount

Một component đi qua đúng ba giai đoạn trong đời nó:

| Giai đoạn | Xảy ra khi nào | Ví dụ việc cần làm |
|---|---|---|
| **Mount** | Component xuất hiện trên cây lần đầu (chưa từng tồn tại ở lần render trước) | Gọi API lấy dữ liệu ban đầu, đăng ký event listener, khởi tạo một thư viện bên thứ ba |
| **Update** | Component đã tồn tại, nay render lại vì props hoặc state đổi | So sánh giá trị cũ/mới, đồng bộ lại một thứ bên ngoài React khi một prop cụ thể đổi |
| **Unmount** | Component bị gỡ khỏi cây (điều kiện render đổi, component cha xoá nó, hay đổi `key`) | Hủy đăng ký event listener, hủy timer, hủy subscription — nếu không, rò rỉ bộ nhớ |

**Tóm tắt:**

- Một component đi qua ba giai đoạn: mount (xuất hiện lần đầu), update (render lại vì props/state đổi), unmount (bị gỡ khỏi cây).
- React hiện đại không có các "lifecycle method" riêng (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount` của class component cũ); cả ba giai đoạn đều được xử lý qua **một** `useEffect` với dependency array và một hàm cleanup.
- Hàm callback của `useEffect` chạy sau mount và sau mỗi update mà dependency đổi; hàm nó trả về (cleanup) chạy trước mỗi lần effect chạy lại, và chạy lần cuối khi unmount.
- Đổi `key` của một component buộc React coi nó là một component **hoàn toàn mới**: unmount bản cũ (chạy cleanup), mount bản mới (chạy lại effect từ đầu) — dù về mặt code đó vẫn là cùng một function component.
- Quên cleanup là nguồn rò rỉ bộ nhớ kinh điển nhất liên quan tới vòng đời trong React hiện đại.

## Một `useEffect` thể hiện cả ba giai đoạn

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createConnection(roomId); // (mount, hoặc update khi roomId đổi): kết nối phòng mới
    connection.connect();

    return () => {
      connection.disconnect(); // cleanup: chạy trước lần effect kế tiếp, và lần cuối khi unmount
    };
  }, [roomId]); // chỉ chạy lại khi roomId đổi

  return <p>Đang ở phòng: {roomId}</p>;
}
```

Đọc đúng trình tự khi `roomId` đổi từ `"general"` sang `"random"` ở một component **đã mount** (không phải lần đầu): React chạy hàm cleanup của lần effect trước (`disconnect()` khỏi `"general"`) **trước**, rồi mới chạy lại thân effect với giá trị mới (`createConnection("random")`). Đây chính là "update" nhìn từ góc độ effect: về bản chất nó là một unmount-rồi-mount thu nhỏ cho riêng effect đó, chứ không phải một sự kiện lifecycle riêng biệt nào khác.

**Phải thuộc:** không có `componentDidMount`/`componentWillUnmount` riêng trong function component; một `useEffect` với dependency đúng và một hàm cleanup diễn tả được cả ba giai đoạn. Mount: effect chạy lần đầu, chưa có cleanup nào trước đó để gọi. Update (khi dependency đổi): cleanup của lần trước chạy, rồi effect chạy lại với giá trị mới. Unmount: chỉ cleanup của lần cuối chạy, không có lần effect mới nào sau đó.

## Đổi `key` ép mount lại từ đầu

```tsx
// Mỗi khi userId đổi, đổi key buộc React coi ProfileForm là component mới:
// unmount bản cũ (cleanup chạy, mọi state nội bộ mất), mount bản mới từ đầu.
<ProfileForm key={userId} userId={userId} />
```

Đây là cách "reset toàn bộ state nội bộ theo props" đúng chuẩn, thay vì cố đồng bộ bằng tay trong một effect (xem bẫy tương tự ở [Props vs State](/go?p=09-React%2Feasy%2Flt-24-props-vs-state.md)).

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Effect có side effect (subscribe, setInterval, addEventListener) nhưng không trả về cleanup | Rò rỉ bộ nhớ, nhiều listener/timer chồng chất sau mỗi lần update | Luôn trả về hàm hủy tương ứng trong `useEffect` |
| Tưởng cleanup chỉ chạy lúc unmount | Bug khó hiểu khi dependency đổi liên tục (ví dụ gõ nhanh) | Nhớ cleanup cũng chạy trước mỗi lần effect chạy lại do dependency đổi, không chỉ lúc unmount |
| Cố đồng bộ state theo props đổi bằng một effect | Code rối, chạy trễ một nhịp | Đổi `key` để mount lại từ đầu, hoặc tính trực tiếp trong render |

## Câu hỏi phỏng vấn thường gặp

Mỗi câu theo chuỗi: câu hỏi, gợi ý suy luận, lập luận, đáp án ngắn, kiến thức cần nhớ. Hãy tự trả lời trước khi đọc tiếp.

### 1. Function component có các lifecycle method như `componentDidMount` không? Vậy làm sao biểu diễn mount/update/unmount?

**Gợi ý suy luận:**
- `useEffect` chạy sau mount lần đầu; nó có chạy lại ở các lần update sau không, và khi nào?
- Hàm mà effect trả về (cleanup) chạy vào những thời điểm nào trong vòng đời?

**Lập luận:** Function component không có lifecycle method riêng của class component cũ. Một `useEffect` với dependency array đúng và hàm cleanup diễn tả được cả ba giai đoạn: thân effect chạy sau mount và sau mỗi update mà dependency đổi (đóng vai "did mount"/"did update"); cleanup chạy trước mỗi lần effect chạy lại và lần cuối cùng khi unmount (đóng vai "will unmount").

**Đáp án ngắn:** Không có lifecycle method riêng; một `useEffect` + cleanup + dependency array thay thế được cả `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`.

**Nhớ:** xem ví dụ `ChatRoom` ở trên — cleanup của lần trước luôn chạy trước khi effect chạy lại.

### 2. Đổi `key` của một component có "update" nó không, hay là chuyện gì khác?

**Gợi ý suy luận:**
- React dùng gì để quyết định một phần tử ở lần render mới có "cùng danh tính" với phần tử ở lần render cũ không?
- Nếu danh tính đổi, React coi đó là cùng một component cập nhật, hay là xoá cái cũ và tạo cái mới?

**Lập luận:** React dùng `key` (cùng với vị trí/loại component) làm danh tính để quyết định "đây có phải cùng một instance không". Đổi `key` khiến React coi phần tử mới là một danh tính hoàn toàn khác, nên nó unmount bản cũ (chạy cleanup, mất toàn bộ state nội bộ) rồi mount bản mới từ đầu — dù mã nguồn của component là y hệt nhau.

**Đáp án ngắn:** Đổi `key` không phải update — nó ép React unmount instance cũ và mount một instance hoàn toàn mới, dùng để reset sạch state nội bộ theo một giá trị bên ngoài.

**Nhớ:** key = danh tính; đổi danh tính = unmount rồi mount lại, không phải update tại chỗ.

Tiếp theo: [Bài 30: Events](/go?p=09-React%2Feasy%2Flt-30-events.md).
