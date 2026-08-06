# Information Architecture Refactor

## Mục tiêu

Đợt tái cấu trúc này giảm trùng lặp nghiệp vụ, đưa mỗi công việc về đúng không gian và giữ nguyên API, dữ liệu cùng phân quyền đang vận hành.

## Điều hướng

- **Tổng quan:** Tổng quan.
- **Bán hàng:** Đơn hàng, Khách hàng. Tạo đơn là route tác vụ từ nút hành động.
- **Hàng hóa & cung ứng:** Sản phẩm, Tính giá, Kho hàng, Mua hàng, Nhà cung cấp.
- **Kênh bán & tăng trưởng:** Kênh bán, Content.
- **Tài chính:** Kế toán, Báo cáo.
- **Làm việc nội bộ:** Team Hub, Biên bản họp, Xin vía.
- **Quản trị:** Nhân viên, Cài đặt, Lịch sử hoạt động.

## Quyền sở hữu nghiệp vụ

- `accounting.html`: tổng quan kế toán, dòng tiền, công nợ, payout, lương, thuế/chứng từ.
- `accounting-settings.html`: tài khoản tiền, danh mục thu chi và quy tắc kế toán TMĐT.
- `reports.html`: phân tích lãi lỗ chi tiết theo thời gian, sản phẩm và kênh.
- `purchasing.html`: vòng đời phiếu mua hàng.
- `suppliers.html`: hồ sơ và lịch sử nhà cung cấp.
- Công nợ phải trả nhà cung cấp chỉ được phân tích trong tab Công nợ của Kế toán.
- `channels.html`: giám sát map SKU, tồn và các vấn đề đồng bộ.
- `channel-settings.html`: tạo và chỉnh cấu hình kênh bán.
- `team.html`: việc cần làm, kế hoạch, quyết định.
- `meeting-minutes.html` và `team-pricing.html`: route nghiệp vụ độc lập.

## Nguyên tắc triển khai

Các trang mới dùng lại API và modal hiện có. Cấu trúc trang nằm trong HTML; bộ render chỉ cập nhật danh sách, bảng, KPI và trạng thái lọc. Mọi liên kết chéo dùng deep link thay vì sao chép toàn bộ màn hình nghiệp vụ.
