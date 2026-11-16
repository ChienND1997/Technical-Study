# Lý thuyết 16: Styling và headless UI trong React — chọn đúng lớp, không chỉ chọn thư viện

Bài [Hiệu năng và kiến trúc](/go?p=09-React%2Fhard%2Flt-10-hieu-nang-kien-truc.md) đã nêu một bảng layer của design system (token, primitive, pattern, tài liệu, phiên bản) và nhắc tên vài công cụ trong một đoạn ngắn. Bài này không lặp lại cái bảng đó — nó đi sâu vào đúng câu hỏi mà bảng đó bỏ ngỏ: **giữa hàng chục lựa chọn (Tailwind, CSS Modules, CSS-in-JS, Radix UI, React Aria, Shadcn UI, Chakra, Material UI...), dựa vào đâu để chọn, và vì sao một số lựa chọn từng phổ biến giờ bị khuyến cáo tránh?**

## Vấn đề nó giải quyết

Styling trong React thực chất là hai quyết định độc lập bị gộp chung: **viết CSS bằng cách nào** (cú pháp, phạm vi, thời điểm tính toán) và **hành vi UI phức tạp (modal, dropdown, combobox) lấy từ đâu** (tự viết, thư viện có sẵn giao diện, hay thư viện chỉ có hành vi). Nhầm lẫn hai trục này dẫn tới chọn sai: ví dụ chọn Chakra UI (một bộ giao diện đầy đủ) rồi vẫn phải ghi đè gần hết style vì thiết kế riêng của công ty, trong khi thứ cần là một thư viện *hành vi* (Radix UI) để tự vẽ giao diện lên trên.

## Các khái niệm cần biết

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| **CSS-in-JS runtime** | Thư viện (styled-components, Emotion) sinh CSS bằng JavaScript **lúc chạy**, chèn `<style>` vào DOM khi component render | Tốn CPU mỗi lần render, và không chạy được bên trong React Server Components (không có `document` ở server, không có "lúc chạy" phía client để chèn style) |
| **CSS-in-JS zero-runtime** | Thư viện (vanilla-extract, Panda CSS, Linaria) biên dịch style thành file `.css` tĩnh **lúc build**, JS lúc chạy chỉ còn tên class | Giữ được cú pháp gần giống CSS-in-JS nhưng không có chi phí runtime, tương thích Server Components |
| **Utility-first CSS (Tailwind)** | Viết style bằng tổ hợp class có sẵn (`flex`, `p-4`, `text-sm`) thay vì đặt tên class riêng | Không cần đặt tên, không cần file CSS riêng, nhưng JSX dài và cần kỷ luật để không trùng lặp tổ hợp |
| **Headless component (component không giao diện)** | Thư viện (Radix UI, React Aria, Ark UI) cung cấp **hành vi và accessibility** của một pattern (focus trap, điều hướng bàn phím, ARIA đúng) nhưng không áp style nào | Bạn toàn quyền style theo design system riêng mà không phải tự cài lại accessibility vốn rất dễ sai |
| **Styled component library** | Thư viện (Chakra UI, Material UI) cung cấp cả hành vi **và** giao diện mặc định sẵn | Ra sản phẩm nhanh nếu chấp nhận giao diện có sẵn; tốn công ghi đè nếu cần giao diện riêng biệt |
| **Copy-paste component (Shadcn UI)** | Không phải dependency trong `package.json`; CLI sinh mã nguồn component (dựng trên Radix UI + Tailwind) thẳng vào thư mục dự án của bạn | Bạn sở hữu và sửa trực tiếp mã nguồn, không bị khoá vào API của một bản phát hành nhất định; đánh đổi là tự chịu trách nhiệm cập nhật |

**Tóm tắt:**

- Styling là hai trục độc lập: cách viết CSS (Tailwind, CSS Modules, CSS-in-JS) và nguồn hành vi UI phức tạp (tự viết, headless, hay styled sẵn) — nhầm hai trục dẫn tới chọn sai công cụ.
- CSS-in-JS runtime (styled-components, Emotion) tốn CPU mỗi render và không chạy được trong React Server Components vì không có bước "chèn style lúc chạy" ở server; đây là lý do hệ sinh thái đang dịch chuyển sang Tailwind, CSS Modules, hoặc CSS-in-JS zero-runtime.
- Headless UI (Radix UI, React Aria, Ark UI) tách hành vi/accessibility khỏi giao diện, cho bạn toàn quyền style mà vẫn có sẵn điều hướng bàn phím và ARIA đúng chuẩn — nền tảng phổ biến nhất để tự xây design system riêng.
- Shadcn UI không phải dependency: nó sinh mã nguồn (dựng trên Radix UI + Tailwind) vào chính dự án của bạn, khác hẳn Chakra UI/Material UI là thư viện cài qua `npm install` với giao diện mặc định sẵn.
- `createPortal` của `react-dom` là cơ chế các pattern như Dialog/Tooltip/Dropdown (dù tự viết hay từ headless UI) dùng để thoát khỏi `overflow: hidden`/`z-index` của cha mà vẫn giữ nguyên Context và event bubbling theo cây React.
- Quyết định đúng phụ thuộc vào độ trưởng thành của design system nội bộ và yêu cầu accessibility, không phải vào thư viện nào "hot" nhất.

## Vì sao CSS-in-JS runtime mất dần vị thế

`styled-components` và Emotion từng là mặc định suốt nhiều năm vì cho phép viết CSS ngay trong file component, tự động scope theo class ngẫu nhiên, và nhận trực tiếp props để tính style động. Cái giá: mỗi lần component render, thư viện phải tính lại chuỗi CSS, sinh class name, và chèn (hoặc cập nhật) thẻ `<style>` trong `<head>` — toàn bộ việc này chạy bằng JavaScript lúc runtime, cộng thêm vào thời gian render vốn đã tốn ở các list dài hoặc component render lại nhiều.

Vấn đề nặng hơn xuất hiện với React Server Components (xem [Bài 9](/go?p=09-React%2Fhard%2Flt-09-ssr-rsc-nextjs.md)): một Server Component chạy trên server và không có giai đoạn "hydrate rồi chèn style vào DOM lúc chạy" ở phía client cho riêng nó — nó chỉ xuất ra HTML. CSS-in-JS runtime được thiết kế quanh giả định luôn có một client component đang chạy để chèn `<style>`, nên hầu hết các thư viện này (bản cũ của styled-components, Emotion) không hoạt động đúng bên trong cây Server Component mà không bọc thêm lớp `"use client"`, làm mất chính lợi ích của RSC là giảm JavaScript gửi xuống trình duyệt.

**Phải thuộc:** CSS-in-JS runtime tính CSS lúc chạy nên tốn chi phí mỗi render và xung đột với mô hình Server Components; CSS-in-JS zero-runtime (vanilla-extract, Panda CSS) biên dịch ra `.css` tĩnh lúc build nên tránh được cả hai vấn đề, còn Tailwind/CSS Modules chưa bao giờ có vấn đề này vì vốn đã tĩnh.

## Headless UI: tách hành vi khỏi giao diện

Một modal "đúng" không chỉ là một `<div>` có `position: fixed`. Nó cần: focus bị nhốt bên trong modal khi mở (focus trap), `Esc` đóng được, click ra ngoài đóng được, focus quay lại đúng phần tử đã mở modal khi đóng, và thuộc tính ARIA (`role="dialog"`, `aria-modal`) đúng để trình đọc màn hình hiểu đây là một lớp phủ. Tự viết đúng toàn bộ phần này cho mọi pattern (Dialog, Dropdown, Combobox, Tooltip, Tabs...) là công sức lớn và dễ sai ở các trường hợp biên.

Headless UI giải quyết đúng vấn đề này: Radix UI, React Aria (của Adobe) và Ark UI cung cấp hook/component đã cài sẵn toàn bộ hành vi và accessibility, nhưng xuất ra phần tử DOM **không có style nào áp sẵn** — bạn tự quyết định class, CSS, hoặc CSS-in-JS để vẽ giao diện lên trên các "khối xương" đó.

```tsx
// Ví dụ cấu trúc (minh hoạ, không phải code chạy được): Radix UI Dialog chỉ lo hành vi,
// toàn bộ class là Tailwind do bạn tự quyết định giao diện.
import * as Dialog from '@radix-ui/react-dialog';

function ConfirmDialog({ open, onOpenChange, onConfirm }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6">
          <Dialog.Title className="text-lg font-semibold">Xác nhận xoá?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-600">
            Hành động này không thể hoàn tác.
          </Dialog.Description>
          <button onClick={onConfirm}>Xoá</button>
          <Dialog.Close aria-label="Đóng">×</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

`Dialog.Portal` ở trên không phải trùng tên ngẫu nhiên với khái niệm portal của React — Radix UI dùng chính `createPortal` của `react-dom` bên trong để render `Overlay`/`Content` vào `document.body` thay vì vào đúng vị trí `ConfirmDialog` nằm trong cây DOM. Lý do: nếu modal render tại chỗ, nó sẽ bị cắt bởi bất kỳ cha nào có `overflow: hidden`, bị đè `z-index` sai bởi context stacking của cha, hoặc bị lệch vị trí bởi `transform` của cha. `createPortal(children, domNode)` cho phép DOM thực tế của modal nằm ở `document.body` (thoát hoàn toàn khỏi các giới hạn CSS đó) trong khi **Context và event bubbling vẫn đi theo cây React logic**, không theo cây DOM thực tế — một `onClick` bên trong modal vẫn nổi bọt lên đúng component cha trong React, dù về mặt DOM nó không nằm bên trong cha đó.

**Phải thuộc:** headless UI (Radix UI, React Aria, Ark UI) tách hành vi/accessibility khỏi giao diện; `createPortal` cho overlay thoát `overflow`/`z-index`/`transform` của cha nhưng vẫn giữ Context và event bubbling theo cây React, không theo cây DOM.

## Shadcn UI không phải một dependency

Điểm dễ hiểu lầm nhất: Shadcn UI **không nằm trong `package.json` như một thư viện**. Lệnh CLI của nó (`npx shadcn add dialog`) sinh ra file mã nguồn component (dựng sẵn trên Radix UI cho hành vi và Tailwind cho style) rồi copy thẳng vào thư mục `components/ui` của dự án bạn. Từ thời điểm đó, đó là code của bạn — sửa trực tiếp, không cần chờ một bản phát hành mới hay lo ngại breaking change từ thư viện.

So sánh với Chakra UI hoặc Material UI: cả hai cài qua `npm install`, import component từ package, và có giao diện mặc định hoàn chỉnh theo đúng design language riêng của thư viện (Material Design cho MUI). Muốn đổi giao diện khác hẳn thiết kế gốc thường phải ghi đè theme sâu, đôi khi khó hơn viết lại từ đầu bằng headless UI.

| Tiêu chí | Headless (Radix/React Aria) | Shadcn UI | Styled đầy đủ (Chakra/MUI) |
|---|---|---|---|
| Cách lấy | `npm install`, import component không style | CLI copy mã nguồn vào dự án | `npm install`, import component có style sẵn |
| Ai sở hữu code UI | Bạn (tự viết style) | Bạn (code đã copy vào) | Thư viện (bạn chỉ chỉnh theme) |
| Tốc độ ra sản phẩm ban đầu | Chậm hơn (phải tự style mọi thứ) | Trung bình (có sẵn style Tailwind mặc định, sửa được ngay) | Nhanh nhất nếu chấp nhận giao diện mặc định |
| Phù hợp khi | Design system riêng đã trưởng thành, cần kiểm soát CSS tuyệt đối | Cần khởi động nhanh nhưng vẫn muốn toàn quyền sửa sau này | Sản phẩm nội bộ, MVP, không cần giao diện khác biệt |

**Phải thuộc:** Shadcn UI sinh mã nguồn vào dự án (bạn sở hữu, không phải dependency theo dõi version), khác hẳn Chakra UI/Material UI là package đầy đủ có giao diện mặc định; cả ba đều khác headless UI thuần (Radix/React Aria) vốn không cung cấp style nào.

## Khung quyết định

1. **Đã có design system riêng, cần kiểm soát CSS tuyệt đối?** → Headless UI (Radix UI hoặc React Aria nếu cần hỗ trợ accessibility sâu hơn cho các pattern phức tạp như date picker) + Tailwind hoặc CSS Modules để style.
2. **Cần khởi động nhanh nhưng không muốn bị khoá vào một thư viện mãi mãi?** → Shadcn UI: có sẵn style hợp lý, nhưng là code của bạn nên sửa tự do về sau.
3. **Sản phẩm nội bộ, team nhỏ, không có nhu cầu giao diện khác biệt?** → Chakra UI hoặc Material UI: nhanh nhất, chấp nhận trông giống nhiều sản phẩm khác dùng cùng thư viện.
4. **Đang cân nhắc CSS-in-JS vì muốn style ngay trong file component?** → Chọn bản zero-runtime (vanilla-extract, Panda CSS) thay vì runtime (styled-components, Emotion), đặc biệt nếu dự án dùng hoặc có kế hoạch dùng React Server Components.

## Bẫy thường gặp

| Bẫy | Hậu quả | Cách sửa |
|---|---|---|
| Chọn styled library đầy đủ (Chakra/MUI) rồi ghi đè gần hết style vì thiết kế riêng | Code theme phức tạp hơn tự viết, vẫn không khớp 100% | Đánh giá độ lệch thiết kế trước khi chọn; lệch nhiều thì dùng headless UI ngay từ đầu |
| Dùng CSS-in-JS runtime trong dự án có React Server Components | Lỗi hoặc phải bọc `"use client"` tràn lan, mất lợi ích RSC | Chuyển sang Tailwind, CSS Modules, hoặc CSS-in-JS zero-runtime |
| Tự viết modal không dùng portal | Bị cắt bởi `overflow: hidden` hoặc đè sai `z-index` của cha ở một số màn hình | Dùng `createPortal` render vào `document.body`, hoặc dùng sẵn `Dialog.Portal` của headless UI |
| Coi Shadcn UI là "thư viện cần cập nhật version" | Chờ một bản phát hành mới không tồn tại; bỏ lỡ việc tự sửa trực tiếp | Nhớ đây là mã nguồn đã copy vào dự án — cập nhật nghĩa là sửa tay hoặc chạy lại CLI có kiểm soát |

## Câu hỏi phỏng vấn thường gặp

### 1. Vì sao CSS-in-JS runtime (styled-components, Emotion) gặp khó khi dự án chuyển sang dùng React Server Components?

**Gợi ý suy luận:**
- CSS-in-JS runtime tính CSS ở đâu, vào lúc nào?
- Một Server Component có giai đoạn "chạy ở client" để làm việc đó không?

**Lập luận:** CSS-in-JS runtime sinh chuỗi CSS và chèn thẻ `<style>` vào DOM bằng JavaScript lúc component render ở client. Server Component chỉ chạy ở server và xuất ra HTML tĩnh, không có giai đoạn chạy JavaScript ở client dành riêng cho chính nó để làm việc chèn style đó — nên các thư viện này thường cần ép phần dùng chúng thành `"use client"`, kéo theo chính phần code đáng ra có thể ở server (giảm JS gửi xuống) lại phải chạy ở client.

**Đáp án ngắn:** Vì chúng cần một bước chạy JavaScript ở client để chèn style, trong khi Server Component không có bước đó cho riêng nó — phải ép thành Client Component, mất lợi ích giảm JS của RSC.

**Nhớ:** CSS-in-JS runtime cần "lúc chạy ở client"; Server Component không có "lúc chạy ở client" cho chính nó.

### 2. Khác biệt cốt lõi giữa headless UI (Radix UI, React Aria) và một styled component library (Chakra UI, Material UI) là gì?

**Gợi ý suy luận:**
- Cả hai đều lo phần nào: chỉ hành vi, chỉ giao diện, hay cả hai?
- Nếu cần giao diện khác hẳn thiết kế mặc định, bên nào tốn công sửa hơn?

**Lập luận:** Headless UI chỉ cung cấp hành vi và accessibility (focus trap, điều hướng bàn phím, ARIA đúng), không áp bất kỳ style nào — bạn viết toàn bộ CSS. Styled component library cung cấp cả hành vi lẫn giao diện mặc định hoàn chỉnh theo design language riêng của thư viện đó. Muốn giao diện khác biệt hoàn toàn, sửa một styled library đầy đủ thường tốn công ghi đè theme hơn là style từ đầu trên nền headless.

**Đáp án ngắn:** Headless UI chỉ lo hành vi/accessibility, bạn tự style; styled library lo cả hai nhưng giao diện mặc định khó đổi khác hẳn mà không tốn nhiều công ghi đè.

**Nhớ:** headless = hành vi; styled đầy đủ = hành vi + giao diện mặc định.

### 3. Shadcn UI có phải một thư viện giống Chakra UI không? Vì sao phân biệt này quan trọng?

**Gợi ý suy luận:**
- Component của Shadcn UI nằm trong `node_modules` hay trong thư mục mã nguồn dự án bạn?
- Điều đó ảnh hưởng gì tới việc "cập nhật version" hay tự sửa component?

**Lập luận:** Chakra UI là package cài qua `npm install`, nằm trong `node_modules`, cập nhật bằng cách nâng version. Shadcn UI dùng CLI để sinh mã nguồn (dựng trên Radix UI + Tailwind) và copy thẳng vào thư mục dự án — từ đó nó là code của bạn, không còn là dependency được theo dõi version. Phân biệt này quan trọng vì nó đổi hẳn cách bạn "cập nhật" (sửa tay hoặc chạy lại CLI có kiểm soát, so với bump version) và ai chịu trách nhiệm khi có breaking change.

**Đáp án ngắn:** Không — Shadcn UI sinh mã nguồn vào dự án thay vì là dependency; bạn sở hữu và tự chịu trách nhiệm cập nhật, khác hẳn mô hình cài-qua-npm của Chakra UI.

**Nhớ:** Shadcn UI = CLI sinh code vào dự án bạn; Chakra UI = dependency thật trong `node_modules`.

### 4. `createPortal` giải quyết vấn đề gì cho một component Modal, và vì sao Context vẫn hoạt động xuyên qua nó?

**Gợi ý suy luận:**
- Nếu Modal render tại đúng vị trí nó nằm trong JSX, điều gì có thể cắt hoặc đè sai nó về mặt CSS?
- React theo dõi quan hệ cha-con bằng cây DOM thực tế hay bằng cây component logic?

**Lập luận:** Nếu Modal render tại chỗ trong cây DOM, nó bị giới hạn bởi `overflow: hidden`, `z-index` (stacking context), hoặc `transform` của bất kỳ cha nào trên đường đi. `createPortal(children, domNode)` cho phép DOM thực tế của Modal nằm ở nơi khác (thường `document.body`), thoát các giới hạn đó. Context và event bubbling trong React không đi theo cây DOM thực tế mà theo **cây component logic** (ai render ra ai trong JSX), nên dù Modal nằm ở `document.body` về mặt DOM, nó vẫn đọc đúng Context của cha logic và sự kiện bên trong nó vẫn nổi bọt lên đúng handler của cha đó.

**Đáp án ngắn:** `createPortal` cho DOM thực tế thoát `overflow`/`z-index`/`transform` của cha; Context và event bubbling vẫn hoạt động vì React theo dõi quan hệ cha-con theo cây component logic, không theo vị trí DOM thực tế.

**Nhớ:** portal tách vị trí DOM khỏi vị trí logic; Context/event đi theo logic, không theo DOM.

Tiếp theo: [Bộ câu hỏi phỏng vấn React](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-react-phong-van.md).
