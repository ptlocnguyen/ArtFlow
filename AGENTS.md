# ArtFlow POS Architecture Rules

1. Mỗi nghiệp vụ chỉ có một trang sở hữu chính; trang khác chỉ liên kết sâu tới nghiệp vụ đó.
2. HTML chứa cấu trúc trang hoàn chỉnh. JavaScript chỉ nạp dữ liệu, cập nhật trạng thái và xử lý tương tác.
3. Không dựng toàn bộ layout bằng `innerHTML` trong JavaScript; chỉ render danh sách, bảng và trạng thái động.
4. Điều hướng được nhóm theo luồng công việc: bán hàng, cung ứng, tăng trưởng, tài chính, nội bộ và quản trị.
5. Route tác vụ như tạo đơn, tạo phiếu mua và trang thiết lập không chiếm mục menu chính.
6. Dữ liệu và quyền hiện có phải được giữ nguyên khi chuyển vị trí giao diện.
7. Mỗi trang có một mục tiêu chính, một hành động chính và vùng cuộn rõ ràng trên desktop lẫn mobile.
8. Trước khi hoàn tất thay đổi giao diện phải chạy smoke test, kiểm tra tràn ngang, console và ảnh chụp 1440x900 cùng 390x844.
