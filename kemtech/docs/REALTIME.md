# Realtime

## WebSocket
- Endpoint `GET /api/ws` (`@fastify/websocket`), xác thực bằng cookie phiên; người dùng chưa đăng nhập bị từ chối.
- Client (`features/realtime/useRealtime.js`) giữ một kết nối, gửi `{"type":"ping"}` định kỳ và tự kết nối lại khi mất.

## Hub hiện diện (`realtime/presence.hub.js`)
Giữ các socket theo người dùng: `add`, `remove`, `isOnline`, `onlineIds`, `sendTo(userId, event, data)`, `sendMany(userIds, event, data)`. Một người có thể mở nhiều tab.
- `GET /api/presence/online`: danh sách người đang online.
- Admin xem số người online qua module `admin`.

## Sự kiện đẩy xuống client
- `notification`: thông báo mới (từ `notifier`).
- `group_message`: tin nhắn nhóm mới; client làm mới danh sách nhóm và số tin chưa đọc.
- Các sự kiện khác của nhóm học (nhắc tên, phản ứng, công việc) đi qua cùng kênh.

## Lưu ý
Hub nằm trong bộ nhớ một tiến trình API, nên chạy nhiều instance cần thêm cơ chế pub/sub (ví dụ Redis).
