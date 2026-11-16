# Lý thuyết 12: TypeScript nâng cao cho component React

Bài [TypeScript nâng cao](/go?p=11-Frontend-Core%2Flt-02-typescript-nang-cao.md) đã nói về generic, conditional type và discriminated union ở mức ngôn ngữ chung. Bài này áp đúng những công cụ đó vào một chỗ cụ thể: typing cho **props và ref của component React**, nơi một API lỏng lẻo cho phép gọi sai mà vẫn biên dịch được, còn một API chặt khiến lỗi sai hiện ngay trên trình soạn thảo trước khi chạy. Cần nắm trước [Compound components](/go?p=09-React%2Feasy%2Flt-26-compound-components.md) (bài này chỉ bàn phần kiểu, không nhắc lại API) và generic/conditional type ở bài Frontend-Core nêu trên.

## Vấn đề nó giải quyết

Một component nhận `variant="primary" | "danger"` và `onConfirm` chỉ bắt buộc khi `variant="danger"`. Viết bằng object props thường (`{ variant: string; onConfirm?: () => void }`) thì TypeScript không chặn được việc gọi `variant="primary"` kèm `onConfirm`, hay quên `onConfirm` khi `variant="danger"` — cả hai đều là lỗi logic chỉ lộ ra lúc chạy. Một `<Button as="a" href="...">` cần `href` bắt buộc khi `as="a"` nhưng vô nghĩa khi `as="button"`, và `ref` phải trỏ đúng `HTMLAnchorElement` hay `HTMLButtonElement` tùy trường hợp. Kiểu lỏng biến mọi ràng buộc này thành quy ước bằng lời (comment, tài liệu) mà compiler không canh gác được.

## Các khái niệm cần biết

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| **Generic component** | Component có tham số kiểu, như `function Table<T>(props: TableProps<T>)` | Giữ quan hệ kiểu giữa `items: T[]` và `renderRow: (item: T) => ReactNode` thay vì rã rời thành `any` |
| **Polymorphic component** | Component nhận prop `as` (hoặc `asChild`) để đổi phần tử DOM/component gốc được render | Một `Button` vừa render `<button>` vừa render `<a>` mà vẫn đúng kiểu thuộc tính và `ref` theo từng trường hợp |
| **Discriminated union props** | Props là union của nhiều "hình dạng", phân biệt bằng một trường literal chung | Biến tổ hợp prop bất hợp lệ thành lỗi biên dịch thay vì bug lúc chạy |
| **`ComponentPropsWithoutRef<T>`** | Utility type lấy toàn bộ props hợp lệ của một thẻ HTML hoặc component, trừ `ref` | Kế thừa đúng props gốc (`onClick`, `disabled`, `aria-*`...) mà không phải liệt kê tay |
| **`ElementRef<T>` / kiểu của `ref` React 19** | Kiểu phần tử DOM mà một `ref` sẽ trỏ tới | Để `ref` generic của component polymorphic đổi kiểu theo `as` |
| **Exhaustiveness check** | Nhánh `default` gán giá trị còn lại vào biến kiểu `never`, báo lỗi biên dịch nếu thêm case mới mà quên xử lý | Thêm một biến thể prop mới mà quên cập nhật chỗ dùng sẽ bị bắt ngay khi build |

**Tóm tắt:**

- Props "lỏng" (object phẳng, field optional tùy tiện) cho phép gọi sai mà vẫn biên dịch; discriminated union props biến tổ hợp bất hợp lệ thành lỗi compile-time.
- Generic component giữ được quan hệ kiểu giữa dữ liệu đầu vào (`items: T[]`) và hàm xử lý từng phần tử (`renderRow: (item: T) => ...`), tránh rã kiểu về `any`.
- Polymorphic component (`as`/`asChild`) cần `ComponentPropsWithoutRef<As>` để kế thừa đúng props của phần tử đang render, và kiểu `ref` phải đổi theo `as`.
- `forwardRef` với generic mất khả năng suy luận kiểu tham số type tự nhiên của hàm thường; React 19 cho `ref` là prop thường nên component generic nhận `ref` dễ hơn, nhưng vẫn cần khai báo đúng.
- Gõ kiểu cho compound component (`Tabs.Root`/`Tabs.Item`) bằng cách gắn kiểu con lên hàm cha (`Tabs.Item = TabsItem`) và dùng Context kiểu non-null-asserted có kiểm tra, để dùng `Tabs.Item` ngoài `Tabs.Root` báo lỗi ngay.
- Lạm dụng kiểu chặt đến mức component khó gọi thì phản tác dụng; chỉ chặt ở ranh giới dễ gọi sai nhất (props loại trừ nhau, phần tử gốc đổi theo `as`).

## Generic component: giữ quan hệ kiểu giữa dữ liệu và cách hiển thị

Một bảng dữ liệu dùng chung cho nhiều loại dữ liệu khác nhau là ví dụ kinh điển cần generic:

```tsx
type TableProps<T> = {
  items: T[];
  getRowKey: (item: T) => string | number;
  columns: { header: string; render: (item: T) => React.ReactNode }[];
};

function Table<T>({ items, getRowKey, columns }: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>{columns.map((c) => <th key={c.header}>{c.header}</th>)}</tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={getRowKey(item)}>
            {columns.map((c) => <td key={c.header}>{c.render(item)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Dùng: T được suy luận là User, nên column.render(item) biết item là User
<Table items={users} getRowKey={(u) => u.id} columns={[{ header: 'Tên', render: (u) => u.name }]} />;
```

Không có generic, `TableProps` phải khai `items: unknown[]` và `render: (item: unknown) => ReactNode`, buộc mỗi `render` tự ép kiểu (`item as User`) — đúng chỗ dễ gõ nhầm kiểu mà compiler không còn giúp được. Với generic, TypeScript suy luận `T = User` ngay từ `items={users}` và áp dụng xuyên suốt `getRowKey`, từng `column.render`.

**Phải thuộc:** generic component không phải để component "tổng quát hơn" về mặt UI — nó để giữ **quan hệ kiểu** giữa dữ liệu đầu vào và các hàm xử lý từng phần tử dữ liệu đó, điều một kiểu `unknown`/`any` đơn lẻ không làm được.

## Polymorphic component: `as` đổi phần tử gốc mà vẫn đúng kiểu

```tsx
type AsProp<As extends React.ElementType> = { as?: As };

type PolymorphicProps<As extends React.ElementType, Props> = Props &
  AsProp<As> &
  Omit<React.ComponentPropsWithoutRef<As>, keyof Props | 'as'>;

type ButtonOwnProps = { variant?: 'solid' | 'ghost'; children: React.ReactNode };

function Button<As extends React.ElementType = 'button'>({
  as, variant = 'solid', ...rest
}: PolymorphicProps<As, ButtonOwnProps>) {
  const Component = as ?? 'button';
  return <Component data-variant={variant} {...rest} />;
}

// Không có `as`: props của <button>, rest cho phép onClick, disabled...
<Button variant="ghost" onClick={() => {}}>Lưu</Button>;

// Có as="a": props đổi sang của <a>, href được yêu cầu đúng kiểu, onClick vẫn hợp lệ vì <a> cũng có onClick
<Button as="a" href="/docs" variant="ghost">Xem tài liệu</Button>;

// Sai: <a> không có prop `disabled` hợp lệ về mặt ngữ nghĩa HTML — TS báo lỗi ngay
<Button as="a" disabled />;
```

`ComponentPropsWithoutRef<As>` là chìa khóa: nó đọc đúng tập props hợp lệ của phần tử hiện tại trong `As` (đổi theo giá trị thật được truyền vào `as`), và `Omit<..., keyof Props | 'as'>` loại các prop đã định nghĩa riêng (`variant`) để không đụng độ. `ref` theo mô hình polymorphic cần thêm một tham số kiểu cho chính `ref` (`ElementRef<As>`), vì `ref` trỏ tới DOM node thật của phần tử đang render — một `Button as="a"` phải nhận `ref: Ref<HTMLAnchorElement>`, không phải `HTMLButtonElement`.

**Suy luận:** sở dĩ polymorphic component cần cơ chế riêng (không chỉ "truyền props xuống") là vì tập props hợp lệ **phụ thuộc vào giá trị runtime của `as`**, mà TypeScript phải suy ra ở mức kiểu generic — đây là lý do component polymorphic luôn cần một tham số kiểu (`As extends ElementType`) đại diện cho lựa chọn đó, khác hẳn component thường chỉ có một tập props cố định.

## Discriminated union props: loại trừ tổ hợp sai ngay khi biên dịch

```tsx
type AlertProps =
  | { kind: 'info'; message: string }
  | { kind: 'confirm'; message: string; onConfirm: () => void; confirmLabel: string };

function Alert(props: AlertProps) {
  if (props.kind === 'confirm') {
    // Trong nhánh này TS biết chắc có onConfirm và confirmLabel
    return <div>{props.message}<button onClick={props.onConfirm}>{props.confirmLabel}</button></div>;
  }
  return <div>{props.message}</div>;
}

<Alert kind="confirm" message="Xoá bản ghi?" />; // lỗi biên dịch: thiếu onConfirm, confirmLabel
<Alert kind="info" message="Đã lưu" onConfirm={() => {}} />; // lỗi biên dịch: 'info' không có onConfirm
```

So với cách viết phẳng `{ kind: string; message: string; onConfirm?: () => void; confirmLabel?: string }`, union có phân biệt khiến cả hai lỗi trên không biên dịch được, thay vì chạy tới production rồi mới lộ (bấm nút xác nhận nhưng `onConfirm` là `undefined`). Nguyên tắc chung đã nêu ở bài TypeScript nâng cao — ở đây áp đúng vào props thay vì state.

## `forwardRef` với generic, và sự đơn giản hoá ở React 19

Trước React 19, muốn một component generic nhận `ref` phải qua `forwardRef`, nhưng `forwardRef` tự nó không phải hàm generic nên TypeScript không suy luận được tham số kiểu từ lời gọi — phải khai rõ kiểu hoặc cast:

```tsx
// React 18 và trước: forwardRef "quên" generic, phải ép kiểu lại
const List = forwardRef(function List<T>(
  { items }: { items: T[] }, ref: React.Ref<HTMLUListElement>,
) {
  return <ul ref={ref}>{items.map((item, i) => <li key={i}>{String(item)}</li>)}</ul>;
}) as <T>(props: { items: T[] } & { ref?: React.Ref<HTMLUListElement> }) => React.ReactElement;
```

Dòng `as <T>(...) => ReactElement` ở cuối là cách "nói lại" với TypeScript rằng hàm này vẫn generic — `forwardRef` xoá mất thông tin đó, nên phải khôi phục thủ công.

Từ React 19, `ref` là một prop thường của function component (xem [Bài 2: Ref là prop](/go?p=09-React%2Feasy%2Flt-02-hooks-co-ban.md)), nên component generic nhận `ref` tự nhiên như mọi prop khác, không cần lớp bọc `forwardRef` và không mất khả năng suy luận generic:

```tsx
function List<T>({ items, ref }: { items: T[]; ref?: React.Ref<HTMLUListElement> }) {
  return <ul ref={ref}>{items.map((item, i) => <li key={i}>{String(item)}</li>)}</ul>;
}
```

**Phải thuộc:** vấn đề của `forwardRef` với generic không phải "khó nhớ cú pháp" — `forwardRef` nhận một hàm thường và trả về kiểu `ForwardRefExoticComponent` không generic, nên tham số kiểu `T` của hàm bên trong không lộ ra ngoài được nữa; đó là lý do luôn phải ép kiểu lại. React 19 loại bỏ hẳn lớp bọc đó cho trường hợp dùng `ref` như prop.

## Gõ kiểu cho compound component để dùng sai báo lỗi ngay

Bài [Compound components](/go?p=09-React%2Feasy%2Flt-26-compound-components.md) đã nói API và Context đứng sau mô hình `Tabs.Root`/`Tabs.Item`. Phần kiểu cần thêm hai việc: gắn các component con thành property của component cha, và làm Context báo lỗi rõ ràng khi dùng sai chỗ thay vì trả `undefined` âm thầm.

```tsx
type TabsContextValue = { activeId: string; setActiveId: (id: string) => void };
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`${componentName} phải nằm trong <Tabs.Root>`);
  return ctx;
}

function TabsRoot({ children, defaultId }: { children: React.ReactNode; defaultId: string }) {
  const [activeId, setActiveId] = useState(defaultId);
  return <TabsContext.Provider value={{ activeId, setActiveId }}>{children}</TabsContext.Provider>;
}

function TabsItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeId, setActiveId } = useTabsContext('Tabs.Item');
  return <button aria-selected={activeId === id} onClick={() => setActiveId(id)}>{children}</button>;
}

export const Tabs = { Root: TabsRoot, Item: TabsItem };
```

Hai điểm đáng chú ý về kiểu: `TabsContext` khai là `TabsContextValue | null` chứ không ép `as TabsContextValue` — ép kiểu giả vờ Context luôn có giá trị sẽ khiến lỗi "dùng `Tabs.Item` ngoài `Tabs.Root`" biến thành `undefined.setActiveId is not a function` khó dò lúc chạy, thay vì thông điệp rõ ràng lúc gọi. Và gom `TabsRoot`/`TabsItem` vào object `Tabs` (thay vì `Tabs.Item = TabsItem` gán tay sau khi khai hàm) giữ cho cả object lẫn từng hàm con đều có kiểu rõ ràng, IDE gợi ý được `Tabs.Item` ngay khi gõ `Tabs.`.

## Bẫy thường gặp

| Bẫy | Hậu quả | Sửa |
|---|---|---|
| Props "lỏng" với nhiều field optional thay vì discriminated union | Gọi sai tổ hợp vẫn biên dịch, lỗi lộ ra lúc chạy | Union có trường literal phân biệt (`kind`, `variant`) cho các tổ hợp loại trừ nhau |
| `forwardRef<T>` generic rồi quên ép kiểu lại | Mất suy luận generic, caller phải tự ép kiểu | Ép kiểu lại tường minh (React 18-), hoặc chuyển sang `ref` là prop (React 19) |
| Context compound component không cho `null` | Lỗi runtime khó hiểu khi dùng ngoài phạm vi | Context kiểu `T \| null`, hàm đọc Context ném lỗi rõ ràng khi `null` |
| Polymorphic component không `Omit` đúng key trùng | Prop riêng (`variant`) và prop kế thừa từ `as` đụng độ, TS báo lỗi khó hiểu | `Omit<ComponentPropsWithoutRef<As>, keyof Props \| 'as'>` |
| Generic hoá mọi thứ kể cả khi chỉ có một kiểu dữ liệu thực tế | Code khó đọc hơn, không ai hưởng lợi | Chỉ generic khi component thực sự dùng cho nhiều kiểu dữ liệu khác nhau |

## Câu hỏi phỏng vấn thường gặp

### 1. Vì sao props phẳng với field optional lại nguy hiểm hơn discriminated union?

**Gợi ý suy luận:**
- Một field optional có nghĩa là "có thể có hoặc không" theo kiểu, nhưng ý nghĩa thật có thể là "bắt buộc khi field khác bằng X".
- Compiler có thấy được ràng buộc "khi nào bắt buộc" đó không nếu chỉ khai `?`?

**Lập luận:** `?` chỉ nói "có thể thiếu", không nói "thiếu khi nào là hợp lệ, khi nào là lỗi". Discriminated union mã hoá đúng ràng buộc đó thành nhiều "hình dạng" tách biệt, nên tổ hợp sai không còn là một giá trị hợp lệ của kiểu — compiler từ chối trước khi chạy.

**Đáp án ngắn:** Field optional không diễn tả được ràng buộc có điều kiện; discriminated union biến ràng buộc đó thành nhiều kiểu con loại trừ nhau, nên gọi sai là lỗi biên dịch.

**Nhớ:** optional nói "có thể thiếu"; union nói "chỉ được là một trong các hình dạng này".

### 2. Generic component và component nhận `props: any` khác nhau ở đâu?

**Gợi ý suy luận:**
- Cả hai đều "nhận được mọi kiểu dữ liệu" — khác nhau ở chỗ nào xảy ra sau đó?
- Khi gọi `render(item)`, kiểu của `item` ở hai cách là gì?

**Lập luận:** `any` tắt hoàn toàn kiểm tra kiểu từ điểm đó trở đi, nên `item.title` sai chính tả vẫn biên dịch. Generic giữ nguyên kiểu thật đi xuyên suốt (`T` được suy ra từ `items`), nên mọi chỗ dùng `item` bên trong vẫn được kiểm tra đúng như kiểu gốc.

**Đáp án ngắn:** `any` tắt kiểm tra kiểu; generic giữ kiểu thật xuyên suốt component, chỉ "chưa biết cụ thể là gì" cho tới khi được gọi.

**Nhớ:** generic hoãn việc xác định kiểu tới lúc gọi, `any` bỏ hẳn việc kiểm tra.

### 3. Polymorphic component cần những gì để `ref` luôn đúng kiểu theo `as`?

**Gợi ý suy luận:**
- `ref` của `<Button as="a">` phải trỏ kiểu DOM nào, của `<Button as="button">` thì sao?
- Một kiểu `ref` cố định có thể đúng cho cả hai trường hợp không?

**Lập luận:** Vì phần tử DOM thật đổi theo `as`, kiểu của `ref` cũng phải là một hàm của `As` (ví dụ dùng `ElementRef<As>`), không thể cố định một kiểu DOM. Thiếu bước này, `ref` sẽ mang kiểu mặc định (thường là của phần tử gốc `button`), sai khi `as` đổi sang phần tử khác.

**Đáp án ngắn:** Kiểu `ref` phải tham số hoá theo `As` (ví dụ `ElementRef<As>`), không cố định một kiểu DOM.

**Nhớ:** `as` đổi phần tử thật thì kiểu của mọi thứ gắn với phần tử đó (props kế thừa, `ref`) phải đổi theo.

### 4. Vì sao Context của compound component không nên ép kiểu bỏ qua `null`?

**Gợi ý suy luận:**
- Nếu `createContext<T>(defaultValue)` bắt buộc một giá trị mặc định mà bạn không có giá trị thật, bạn thường làm gì?
- Khi `Tabs.Item` bị dùng ngoài `Tabs.Root`, ép kiểu `as T` cho kết quả gì lúc chạy so với kiểm tra `null`?

**Lập luận:** Ép `as T` chỉ đánh lừa compiler, không tạo ra giá trị thật; lúc chạy Context vẫn trả `null`/`undefined`, và lỗi xuất hiện muộn hơn, khó hiểu hơn (gọi method trên `undefined`). Khai `T | null` và kiểm tra tường minh biến lỗi dùng sai thành một thông báo rõ ràng ngay tại nơi gọi.

**Đáp án ngắn:** Ép kiểu bỏ qua `null` không tạo ra giá trị thật, chỉ trì hoãn và làm mơ hồ lỗi lúc chạy; kiểm tra `null` tường minh báo lỗi đúng chỗ, đúng lý do.

**Nhớ:** kiểu chỉ "nói dối" compiler, không đổi hành vi runtime — ép kiểu sai chỗ luôn trả giá sau.

Tiếp theo: [Bộ câu hỏi phỏng vấn React](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-react-phong-van.md).
