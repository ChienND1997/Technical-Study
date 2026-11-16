# 1 số thứ sẽ khiến bạn pro Typescript (infer, extends, ternaries)

> Nguồn: [Viblo](https://viblo.asia/p/1-so-thu-se-khien-ban-pro-typescript-infer-extendsternaries-W13VMjKQ4Y7) · Tác giả: Đỗ Tú · Đăng ngày: thg 6 23, 2025 · Thẻ: Advanced, JavaScript, TypeScript
> Đây là bản tóm tắt tuyển chọn bằng lời của KemTech; hãy đọc bản gốc để có đầy đủ nội dung và ví dụ.

## Bài viết nói về gì

Bài viết dành cho lập trình viên frontend đã quen với type, interface và generic, muốn đi sâu hơn vào cách TypeScript xử lý kiểu dữ liệu. Tác giả giới thiệu ba công cụ thường đi cùng nhau: extends, toán tử điều kiện trên kiểu và từ khóa infer, kèm các tình huống áp dụng thực tế.

## Ý chính

- Dùng extends để kế thừa thuộc tính giữa các type hoặc interface, nhưng cách này kém linh hoạt: đổi kiểu ở type gốc thì các type kế thừa phải sửa theo, rất phiền với kiến trúc nhiều tầng.
- Kết hợp generic với điều kiện "T extends ..." giúp kiểu trả về thay đổi theo kiểu đầu vào, giống phép chọn if-else nhưng ở cấp độ type.
- Từ khóa infer chỉ dùng được bên trong conditional type; nó cho phép "bắt" một phần kiểu, ví dụ lấy kiểu phần tử của một mảng rồi đặt tên cho nó.
- Có thể ghép infer với ReturnType và Awaited để suy ra kiểu dữ liệu thực sự mà một hàm bất đồng bộ trả về.
- Những chỗ hay dùng: kiểu của field trong form, bộ xử lý phản hồi API, hệ thống sự kiện, query builder, cấu hình theme, action của state management và props có biến thể.
- Tác giả khuyến khích tự thử nghiệm trên playground để thật sự hiểu cơ chế.

## Kinh nghiệm rút ra

Điểm đáng nhớ là type không chỉ để "gắn nhãn" mà còn có thể tính toán được. Khi thấy mình lặp lại cùng một khai báo kiểu ở nhiều nơi, hãy nghĩ tới việc suy ra kiểu từ một nguồn duy nhất thay vì viết tay từng cái. Tuy vậy, đừng lạm dụng: type quá phức tạp làm thông báo lỗi khó đọc và đồng đội khó bảo trì. Nên bắt đầu từ vài tiện ích nhỏ, có tên rõ ràng. Nội dung liên quan trực tiếp tới các chủ đề TypeScript, JavaScript và Frontend trong KemTech.

## Đọc bản gốc

[1 số thứ sẽ khiến bạn pro Typescript (infer, extends,ternaries)](https://viblo.asia/p/1-so-thu-se-khien-ban-pro-typescript-infer-extendsternaries-W13VMjKQ4Y7)

**Tóm tắt:**
- Generic cộng điều kiện extends cho phép kiểu thay đổi theo đầu vào.
- Infer trích xuất một phần kiểu bên trong conditional type.
- Ghép với ReturnType và Awaited để lấy kiểu kết quả của hàm async.

