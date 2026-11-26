# HILL AND STILL — V2.2 Research Website

**Tagline:** Find Your Own Rhythm.

Một website tĩnh dùng để trình diễn và kiểm tra mô hình gợi ý âm nhạc theo trạng thái, mục tiêu và sở thích cá nhân. Phiên bản V2.2 giữ bố cục MAIN và DISCOVER của V2.1, đồng thời chuẩn hóa kiểu chữ tiếng Việt, xử lý ngắt dòng và tăng khả năng đọc trên màn hình nhỏ.

## 1. Cấu trúc dự án

```text
HILL_AND_STILL_V2/
├── index.html
├── style.css
├── app.js
├── supabase-config.js
├── ai/
│   └── recommender.js
├── data/
│   └── sounds.js
├── assets/
│   ├── hero-soundscape.svg
│   └── cover-*.svg
├── docs/
│   ├── ALGORITHM_SPEC_V2.md
│   ├── DATA_AUDIT.md
│   ├── RESEARCH_LIMITATIONS.md
│   ├── SUPABASE_SETUP.md
│   └── songs-300.csv
└── tests/
    ├── recommender.test.js
    └── full-library-audit.test.js
```

## 2. Chạy website

- Cách đơn giản: mở `index.html` bằng Chrome hoặc Edge.
- Cách ổn định hơn: dùng VS Code Live Server hoặc một static hosting như GitHub Pages.
- Không cần cài Node.js để người tham gia sử dụng website. Node.js chỉ cần để chạy các bài test.

## 3. Đưa lên GitHub mới

1. Tạo repository mới, ví dụ `hill-and-still-v2`.
2. Giải nén ZIP này.
3. Mở thư mục `HILL_AND_STILL_V2` và tải **toàn bộ nội dung bên trong** lên root của repository (không tải thêm một lớp thư mục lồng nhau).
4. Commit các file.
5. Nếu muốn xuất bản qua GitHub Pages: vào Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.
6. Mở URL Pages được GitHub cấp để kiểm tra.

## 4. Supabase

`supabase-config.js` đang dùng Project URL và Publishable key của dự án Supabase hiện tại. Publishable key được thiết kế để dùng ở trình duyệt; tuyệt đối không thay bằng `service_role` hoặc database password.

Website dùng:

- RPC: `next_hs_participant_code`
- Table: `public.hs_discover_submissions`
- Các cột: `participant_code`, `condition`, `pre_discover`, `discover_data`, `post_discover`, `consent_to_submit`, `created_at`

Giữ RLS bật. Chỉ cho phép INSERT khi `consent_to_submit = true`; không cấp SELECT cho người dùng ẩn danh. Nếu tạo dự án Supabase mới, xem `docs/SUPABASE_SETUP.md` trước khi cấu hình.

## 5. Thuật toán và điều kiện nghiên cứu

- A: bộ 5 bài tham chiếu cố định, được chọn theo các nhóm thể loại; đây không phải playlist trung tính cảm xúc đã được kiểm định.
- B: chỉ xếp hạng theo thể loại yêu thích.
- C: kết hợp trạng thái hiện tại, mục tiêu cảm xúc và sở thích âm nhạc. B/C cho phép tạo lại danh sách bằng lấy mẫu có trọng số trong nhóm bài có điểm cao; số lần tạo lại và từng danh sách đã hiển thị được lưu trong payload nghiên cứu.
- D: nghỉ yên tĩnh 2 phút, không tạo danh sách nhạc.

V2 là thuật toán gợi ý theo luật (rule-based content matching), không phải mô hình machine learning đã huấn luyện. Điểm xếp hạng là chỉ số tương thích nội bộ, không phải xác suất hoặc hiệu quả trị liệu.

## 6. Giới hạn dữ liệu và diễn giải

- Thư viện gồm 300 bản ghi theo bảng dữ liệu nhóm cung cấp.
- Valence được để `null` vì cả 300 giá trị ban đầu đều là `NA`; thuật toán tự bỏ qua Valence.
- Các trường BPM, Energy, Mood, Goal và Confidence được giữ theo dữ liệu nguồn nhóm cung cấp. Nhãn `Editorial`/Confidence không tự động chứng minh các giá trị đã được xác minh độc lập.
- Website không có trình phát nhạc. Payload gửi Supabase luôn ghi `audio_played: false`.
- Thời lượng trải nghiệm hiện chưa đồng nhất: A/B/C không giới hạn thời gian xem danh sách, trong khi D có bộ đếm nghỉ 2 phút. Đây là yếu tố gây nhiễu khi so sánh các điều kiện; cần chuẩn hóa và thử nghiệm trước nếu muốn so sánh công bằng, hoặc nêu rõ giới hạn khi phân tích.
- Do chưa có phiên nghe nhạc thực tế, kết quả chỉ dùng để đánh giá cách đề xuất, mức độ phù hợp và hài lòng với gợi ý; không kết luận việc nghe nhạc làm thay đổi cảm xúc.
- Trước khi thu thập dữ liệu từ học sinh vị thành niên, nhóm cần tuân thủ quy định đồng thuận/đồng ý tham gia của nhà trường và phụ huynh/người giám hộ khi áp dụng.

## 7. Kiểm tra dữ liệu

Kết quả audit cấu trúc 300 bản ghi nằm trong `docs/DATA_AUDIT.md`. Đây là kiểm tra định dạng, ID và dữ liệu thiếu; không phải xác minh độc lập độ chính xác các chỉ số âm nhạc.

## 8. Giao diện V2.2

- Trang MAIN bỏ khối “THE IDEA” và chú thích dài về phiên bản nghiên cứu; giữ lại hướng dẫn “HOW IT WORKS” theo bố cục ba bước.
- Trang DISCOVER được chia thành hai nhóm trực quan: trạng thái hiện tại (Stress, Energy, Mood) và định hướng (Goal, Genre, Condition).
- Có chỉ báo quy trình ba bước và số lượng 300 bài trong thư viện.
- Bố cục tự chuyển sang một cột trên màn hình nhỏ; mọi ID điều khiển trong `app.js` được giữ nguyên.

## 9. Chạy kiểm thử

Cài Node.js rồi chạy tại thư mục dự án:

```bash
node tests/recommender.test.js
node tests/full-library-audit.test.js
```

Hai bài test kiểm tra logic A/B/C/D, chuẩn hóa schema 13 cột, xử lý Valence thiếu, ID và tổng số 300 bài. Chúng không thay thế kiểm thử trình duyệt và Supabase thật.


## 10. Kiểu chữ và bố cục V2.2

- Dùng Be Vietnam Pro cho văn bản và tiêu đề để hiển thị dấu tiếng Việt đồng nhất; có fallback Segoe UI/Arial khi ngoại tuyến.
- Điều chỉnh chiều rộng và cách ngắt dòng của tiêu đề HOW IT WORKS; cụm “bắt đầu” được giữ cùng nhau.
- Chuẩn hóa line-height, kích thước chữ của biểu mẫu, mô tả, thẻ gợi ý và nút bấm.
- Tinh chỉnh breakpoint điện thoại để hạn chế tiêu đề/nhãn bị ngắt khó đọc.
