# Hướng dẫn viết CLAUDE.md để Claude Code hiểu đúng dự án

> Nguồn: [Viblo](https://viblo.asia/p/huong-dan-viet-claudemd-de-claude-code-hieu-dung-du-an-cua-ban-1QLxnORx4Aw) · Tác giả: Toan Bui · Đăng ngày: thg 10 24, 2026 · Thẻ: AI, AI Agent, Claude code, LLM
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài mở đầu loạt về dùng Claude Code cho dự án thật. Tác giả hướng dẫn viết CLAUDE.md để coding agent nắm quy ước, ranh giới module và cách kiểm tra của repo, khỏi giải thích lại mỗi phiên. Ví dụ là một monorepo TypeScript giả định.

## Ý chính

- CLAUDE.md chỉ là ngữ cảnh gợi ý cho agent, không phải cơ chế cưỡng chế. Muốn chặn cứng một hành động thì phải dùng hooks hoặc quy tắc từ chối quyền trong settings.
- Trước khi viết, hãy phân loại thông tin: quy tắc chung ổn định, quy tắc theo vùng code, tài liệu tham khảo, và quy trình nhiều bước theo từng loại việc.
- File gốc nên ngắn, dưới khoảng 200 dòng, gồm tổng quan repo, ranh giới package, quy trình làm việc, lệnh kiểm tra và tiêu chí hoàn thành.
- Quy tắc riêng cho API hay UI nên tách vào thư mục rules với mẫu đường dẫn, để agent chỉ nạp khi làm đúng vùng code đó. Import tài liệu vào file không làm giảm lượng ngữ cảnh.
- Tránh chỉ dẫn mâu thuẫn, tiến độ task ngắn hạn và mọi bí mật như khóa API.
- Kiểm thử hành vi bằng task thật, đừng chỉ hỏi agent có hiểu quy tắc không.

## Kinh nghiệm rút ra

Xem CLAUDE.md như tài liệu sống, review cùng code: đổi tên package hay lệnh test là phải sửa theo. Đừng tin lời agent tự báo đã tuân thủ; hãy nhìn kết quả test. Chủ đề thuộc mảng AI Agent và quy ước làm việc nhóm trong KemTech.

## Đọc bản gốc

[Hướng dẫn viết CLAUDE.md để Claude Code hiểu đúng dự án của bạn](https://viblo.asia/p/huong-dan-viet-claudemd-de-claude-code-hieu-dung-du-an-cua-ban-1QLxnORx4Aw)

**Tóm tắt:**
- CLAUDE.md là ngữ cảnh, muốn chặn hành động phải dùng hooks.
- Giữ file gốc ngắn, tách quy tắc theo vùng code.
- Kiểm thử hành vi agent bằng task thật, không tin lời tự báo.

