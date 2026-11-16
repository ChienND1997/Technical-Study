# Validating unknown in TypeScript Without a Schema Library

> Nguồn: [Viblo](https://viblo.asia/p/validating-unknown-in-typescript-without-a-schema-library-type-guards-assertion-functions-and-a-40-line-mini-validator-oKLnqjM3JQO) · Tác giả: EME GUG · Đăng ngày: Oct 15th (2026) · Thẻ: JavaScript, TypeScript, webdev
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Tác giả chỉ ra một lỗi rất phổ biến trong code TypeScript: ép kiểu dữ liệu từ API bằng từ khóa as rồi coi như đã an toàn. Bài trình bày cách kiểm tra dữ liệu chưa biết kiểu bằng type guard, assertion function và một bộ validator nhỏ tự viết, không cần Zod hay thư viện schema.

## Ý chính

- Ép kiểu bằng as chỉ là lời hứa với compiler; sau khi build, TypeScript biến mất nên không còn gì kiểm tra lời hứa đó, và any từ JSON.parse hay res.json dễ lan khắp code.
- Mọi dữ liệu băng qua ranh giới hệ thống (API, localStorage, postMessage, WebSocket, biến môi trường) nên mang kiểu unknown cho tới khi được chứng minh.
- Type guard thủ công cần nhớ các bẫy: null cũng là object, NaN vẫn là number, mảng cũng là object. Các bản TypeScript mới giúp thu hẹp kiểu bằng toán tử in và tự suy ra predicate cho hàm đơn giản.
- Bộ validator composable gồm các guard nhỏ ghép lại, kiểu được suy ra từ chính validator nên không phải khai báo hai lần; hạn chế là thuộc tính optional chưa tách bạch được với giá trị undefined.
- Assertion function đặt ở tầng gọi API sẽ ném lỗi ngay tại biên, kèm tên endpoint và payload, thay vì để lỗi nổ muộn ở giao diện.
- Dùng thư viện khi cần lỗi theo đường dẫn, chuyển đổi dữ liệu, union phức tạp hoặc sinh JSON Schema.

## Kinh nghiệm rút ra

Nguyên tắc đáng áp dụng: kiểm tra một lần ở biên, bên trong chỉ tin vào kiểu. Có thể bắt đầu bằng cách tìm các chỗ dùng as và any trong lớp gọi API, bật các rule ESLint chặn any lan rộng, rồi dần thay bằng validation thật. Hiểu cơ chế tự viết cũng giúp bạn debug khi suy luận kiểu của thư viện bị sai. Chủ đề gắn với TypeScript, JavaScript và Frontend trong KemTech.

## Đọc bản gốc

[Validating unknown in TypeScript Without a Schema Library](https://viblo.asia/p/validating-unknown-in-typescript-without-a-schema-library-type-guards-assertion-functions-and-a-40-line-mini-validator-oKLnqjM3JQO)

**Tóm tắt:**
- Ép kiểu bằng as không kiểm tra gì ở runtime.
- Dữ liệu ngoài vào là unknown, validate một lần tại biên.
- Tự viết guard nhỏ cho dự án gọn, dùng thư viện khi nhu cầu phức tạp.

