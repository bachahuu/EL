# TOEIC Learning Lab

Webapp luyện TOEIC kết nối trực tiếp với Supabase.

## Tính năng

- Luyện theo từng TOEIC Part hoặc từng bộ dữ liệu.
- Mỗi lượt tự xáo trộn thứ tự câu hỏi.
- Mỗi lượt tự xáo trộn A/B/C/D nhưng vẫn giữ đúng mapping đáp án.
- Chế độ thi thử giữ thứ tự Part 1 → 7 và xáo trộn câu bên trong từng Part.
- Chấm bài: đáp án đúng màu xanh, lựa chọn sai màu đỏ.
- Hiển thị số câu đúng / tổng số câu và phần trăm.
- Lưu lịch sử làm bài trên trình duyệt.
- Tự nhận thêm dữ liệu Part 1–7 khi được thêm vào `public.toeic_questions` trên Supabase.

## GitHub Pages

Website là static site và có thể publish trực tiếp từ nhánh `main`, thư mục `/ (root)` bằng GitHub Pages.
