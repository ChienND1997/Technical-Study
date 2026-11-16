# Câu hỏi hành vi thường gặp và cách tiếp cận

Câu hỏi hành vi không phải để thử trí nhớ của bạn, mà để người phỏng vấn thu thập tín hiệu về cách bạn làm việc. Bài này chia các câu hỏi thường gặp ở vòng phỏng vấn kỹ sư cấp cao thành từng nhóm, nói rõ mỗi nhóm đang soi điều gì, và hướng dẫn bạn chọn chuyện phù hợp để kể.

**Tóm tắt:**

- Mỗi câu hỏi hành vi đang tìm một tín hiệu về năng lực, nên bạn trả lời tín hiệu chứ không chỉ câu chữ.
- Câu hỏi thường rơi vào 8 nhóm: ownership, kỹ thuật khó, xung đột, dẫn dắt, thất bại, mơ hồ và ưu tiên, phản hồi, động lực.
- Quy trình chung: đoán tín hiệu cần thấy, chọn chuyện khớp, kể theo STAR, kết bằng kết quả và bài học.
- Câu hỏi thất bại: nhận trách nhiệm, giảm thiệt hại, tìm root cause, thay đổi cụ thể để không lặp lại.
- Câu hỏi xung đột: lắng nghe, dựa trên dữ liệu, disagree and commit, tuyệt đối không nói xấu người khác.
- Một chuyện tốt dùng được cho nhiều nhóm, nên chỉ cần vài chuyện và biết nhấn vào khía cạnh nào.
- Câu hỏi giả định thì trả lời bằng nguyên tắc kèm một ví dụ thật; chưa có chuyện phù hợp thì xin vài giây suy nghĩ.

## Vấn đề nó giải quyết

Cùng một câu "kể về lần bạn bất đồng với đồng nghiệp", người hỏi có thể đang soi cách bạn lắng nghe, hoặc cách bạn chốt vấn đề, hoặc xem bạn có nói xấu người khác không. Nếu không hiểu ý đồ, bạn kể một chuyện hay nhưng trật trọng tâm, và đây là lỗi hay gặp nhất: người nghe không nhận được tín hiệu họ cần, nên đánh giá thấp bạn.

**Nền tảng:** Mỗi câu hỏi hành vi thực chất đang tìm một **tín hiệu** về năng lực (chủ động, tôn trọng, quyết định dựa trên dữ liệu, trung thực). Bạn không trả lời câu chữ mà trả lời tín hiệu: đoán họ cần thấy gì, rồi chọn câu chuyện khớp tín hiệu đó.

## Khi nào dùng

Ôn trước phỏng vấn, và nên đọc lại định kỳ để tự soi mình đang làm tốt và thiếu gì. Bài này giả định bạn đã biết khung STAR; nếu chưa, hãy đọc [bài STAR](/go?p=07-Interview-QA%2FBehavioral%2Feasy%2Flt-01-star-chuan-bi-cau-chuyen.md) trước.

## Cách làm chung

Với mỗi nhóm câu hỏi: xác định họ cần thấy tín hiệu gì ở bạn, chọn câu chuyện khớp tín hiệu đó, kể theo STAR, và kết bằng bài học rút ra.

```mermaid
flowchart LR
    A["Nghe câu hỏi"] --> B["Đoán tín hiệu họ cần thấy"]
    B --> C["Chọn chuyện khớp tín hiệu"]
    C --> D["Kể theo STAR"]
    D --> E["Kết bằng kết quả và bài học"]
```

## Các khái niệm cần biết

- **Tín hiệu (signal)**: bằng chứng trong câu chuyện cho thấy một năng lực, ví dụ chủ động, tôn trọng, ra quyết định dựa trên dữ liệu.
- **Ownership**: coi kết quả của hệ thống là việc của mình, không chỉ phần được giao.
- **Root cause**: lý do sâu xa khiến vấn đề xảy ra, khác với triệu chứng nhìn thấy ngay.
- **Proof of concept (PoC)**: bản thử nghiệm nhỏ chứng minh một ý tưởng khả thi trước khi đầu tư lớn.
- **Disagree and commit**: nêu bất đồng đầy đủ, nhưng khi đã quyết thì thực hiện hết lòng.
- **Influence without authority**: thuyết phục người không thuộc quyền quản lý của bạn.

## Bản đồ nhóm câu hỏi

Câu hỏi hành vi thường rơi vào 8 nhóm: ownership và chủ động; giải quyết vấn đề kỹ thuật; cộng tác và xung đột; dẫn dắt và ảnh hưởng; thất bại và học hỏi; mơ hồ, ưu tiên, thời hạn; phản hồi; động lực và sự phù hợp. Mỗi nhóm bên dưới có câu hỏi mẫu, điều người hỏi muốn thấy, và mẹo kể.

## Từng nhóm

### 1. Ownership

*"Kể về lần bạn làm vượt phạm vi công việc."* / *"Kể về một vấn đề bạn tự phát hiện và sửa."*
**Người hỏi muốn thấy:** bạn coi kết quả là việc của mình, không đợi giao; nhìn thấy gốc rễ chứ không chỉ triệu chứng; theo đến cùng.
**Mẹo:** nêu rõ **vì sao** bạn thấy đó là trách nhiệm của mình và tác động sau đó.

### 2. Kỹ thuật khó

*"Vấn đề kỹ thuật khó nhất bạn từng giải?"* / *"Một lần bạn tối ưu hiệu năng đáng kể."*
**Muốn thấy:** cách phân tích có hệ thống (đo, giả thuyết, loại trừ), cân nhắc phương án, đánh đổi.
**Mẹo:** có số liệu trước/sau; nhắc phương án đã bỏ và lý do.

### 3. Xung đột và bất đồng

*"Bạn bất đồng với đồng nghiệp/quản lý về kỹ thuật, bạn xử lý thế nào?"*
**Muốn thấy:** tôn trọng, dựa trên dữ liệu, tìm lợi ích chung, biết **bất đồng nhưng cam kết** (disagree and commit).
**Mẹo:** đừng bôi nhọ người khác; mô tả bạn đã **lắng nghe** quan điểm của họ và cách đi tới quyết định.

### 4. Dẫn dắt không có quyền hạn

*"Bạn thuyết phục đội theo hướng của mình thế nào?"*
**Muốn thấy:** ảnh hưởng bằng dữ liệu, tài liệu thiết kế, thử nghiệm nhỏ (proof of concept), xây đồng thuận.

### 5. Thất bại

*"Kể về sai lầm lớn nhất."* / *"Lỗi production bạn gây ra."*
**Muốn thấy:** trung thực, nhận trách nhiệm, phân tích nguyên nhân hệ thống, thay đổi cụ thể.

Với câu hỏi thất bại, trình tự dưới đây cho thấy bạn trưởng thành: không đổ lỗi, xử lý thiệt hại trước, rồi mới sửa tận gốc. Nếu bạn dừng ở bước "xin lỗi" mà không có thay đổi cụ thể, câu chuyện mất sức nặng.

**Phải thuộc:** Tám nhóm câu hỏi: ownership, kỹ thuật khó, xung đột, dẫn dắt không có quyền hạn, thất bại, mơ hồ và ưu tiên, phản hồi, động lực và sự phù hợp. Câu hỏi thất bại: nhận trách nhiệm, giảm thiệt hại, tìm root cause, thay đổi cụ thể để không lặp lại, và không đổ lỗi. Xung đột: lắng nghe, dựa trên dữ liệu, disagree and commit, không nói xấu người khác.

```mermaid
flowchart LR
    A["Nhận trách nhiệm"] --> B["Giảm thiệt hại"]
    B --> C["Tìm root cause"]
    C --> D["Thay đổi để không lặp lại"]
```

**Suy luận:** Trình tự nhận trách nhiệm, giảm thiệt hại, tìm root cause rồi mới thay đổi được sắp xếp theo mức khẩn cấp và mức đáng tin. Thiệt hại đang diễn ra thì phải chặn trước, vì giải thích nguyên nhân khi hệ thống vẫn đang lỗi cho thấy bạn ưu tiên sai. Chỉ sau khi ổn định mới có dữ liệu đủ để tìm root cause, và chỉ root cause mới dẫn tới thay đổi có khả năng ngăn lỗi lặp lại, trong khi sửa triệu chứng thì lỗi quay lại dưới dạng khác. Điểm dễ nhầm là dừng ở bước xin lỗi hoặc đổ cho quy trình: người nghe hiểu rằng bạn không rút được bài học và sẽ gây lỗi tương tự. Vì vậy khi chuẩn bị chuyện thất bại, hãy chọn chuyện mà bạn nêu được thay đổi cụ thể (test, alert, checklist) và đo được nó có hiệu quả không.

### 6. Mơ hồ và ưu tiên

*"Yêu cầu không rõ thì bạn làm gì?"* / *"Quá nhiều việc cùng gấp?"*
**Muốn thấy:** đặt câu hỏi làm rõ, đưa giả định ra và xác nhận, chia nhỏ để giảm rủi ro, ưu tiên theo tác động/rủi ro và **thông báo sớm** kỳ vọng.

### 7. Phản hồi

*"Bạn nhận/đưa phản hồi khó thế nào?"*
**Muốn thấy:** cởi mở, cụ thể, hành động theo phản hồi, đưa phản hồi kịp thời và tử tế.

### 8. Động lực và phù hợp

*"Vì sao bạn muốn rời công ty hiện tại?"* / *"Vì sao công ty chúng tôi?"* / *"Mục tiêu 3 năm?"*
**Muốn thấy:** bạn hướng tới điều gì (không chỉ trốn khỏi điều gì), đã tìm hiểu công ty, mục tiêu khớp với vai trò.
**Mẹo:** không nói xấu công ty cũ; nêu lý do tích cực và cụ thể.

## Bảng chuyển câu chuyện

Vì một câu chuyện tốt dùng được cho nhiều câu hỏi, bạn không cần 30 chuyện, chỉ cần vài chuyện và biết nhấn vào khía cạnh nào:

| Câu hỏi | Chuyện có thể dùng |
|---|---|
| Ownership, vượt phạm vi | Dự án tự khởi xướng, incident tự nhận xử lý |
| Kỹ thuật khó | Tối ưu hiệu năng, thiết kế lại hệ thống |
| Xung đột | Tranh luận về kiến trúc, mức độ ưu tiên |
| Dẫn dắt | Thuyết phục đổi công cụ/quy trình |
| Thất bại | Incident production, đánh giá sai thời gian |

## Điều cần nhớ

- Nghe kỹ câu hỏi và trả lời **đúng điều được hỏi**; nếu cần, hỏi lại để làm rõ.
- Giữ mỗi câu trả lời khoảng 2 phút; để người phỏng vấn đào sâu.
- Câu hỏi dạng "bạn sẽ làm gì nếu..." (giả định) thì trả lời bằng nguyên tắc và dẫn một ví dụ thật tương tự.
- Trường hợp câu hỏi không khớp chuyện nào, hãy nói thẳng bạn cần một chút thời gian nghĩ; im lặng vài giây tốt hơn kể chuyện lạc đề.
- Luôn kết bằng kết quả và điều học được.

