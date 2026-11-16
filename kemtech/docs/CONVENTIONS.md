# Quy ước viết mã

## Chung
- Code rõ ràng, ngắn gọn, không trừu tượng hóa thừa. Comment bằng tiếng Anh (một dòng JSDoc cho hàm công khai); thông báo cho người dùng bằng tiếng Việt.
- Kiểm tra comment: `npm run lint:comments` ở thư mục gốc.

## Backend (`apps/api/src/modules/<tên>/`)
- `<tên>.repository.js`: chỉ chứa SQL, trả về row thô (snake_case). Hàm nhận `exec = db` để chạy trong transaction.
- `<tên>.service.js`: nghiệp vụ, không import `zod` hay `pg`, nên test được không cần DB.
- `<tên>.routes.js`: validate bằng zod và trả HTTP. Đường dẫn viết **không** có tiền tố `/api`.
- `<tên>.test.js`: `node:test` với fake viết tay.
- Factory: `createXRepository(db)`, `createXService({...})`, mặc định export `xRoutes(app, { service })`. Ghép nối ở `container.js` và `app.js`.
- Lỗi: ném `BadRequestError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError` (`common/errors.js`). Phản hồi lỗi luôn là `{ "error": "thông báo" }`; lỗi 500 chỉ trả `Internal Server Error` và ghi chi tiết vào log.
- Migration: file SQL `db/migrations/NNNN_*.sql`, chạy theo tên, mỗi file một transaction. Không sửa file đã áp dụng, hãy thêm file mới.

## Frontend (`apps/web/src/`)
- `features/<tên>/` (trang, `api.js`, `queries.js`), `shared/` (component, lib dùng chung), `app/` (router, providers), `layout/`.
- Import bằng alias `@/...`. Gọi API qua `api.js`, dữ liệu qua TanStack Query.
- Style trong `styles/global.css` và `styles/practice.css` (trang Quiz và Mock); dùng biến CSS (`--brand`, `--line`, ...) để hỗ trợ giao diện sáng/tối.
- Lỗi 5xx được che bằng thông báo chung; lỗi 4xx hiển thị `error` từ API.
