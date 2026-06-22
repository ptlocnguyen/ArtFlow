# Thiết lập Google Drive cho content sản phẩm

ArtFlow có thể tự tạo Google Docs mô tả và bộ folder media khi tạo sản phẩm mới.

## Cấu trúc được tạo tự động

- Trong folder cha tài liệu: `Content - SKU - Tên sản phẩm` (Google Docs)
- Trong folder cha media: `[SKU] Tên sản phẩm`
  - `01_Hinh_anh`
  - `02_Video`
  - `03_Tai_lieu_tham_khao`

## 1. Tạo folder cha

1. Trong Google Drive, tạo folder `ArtFlow - Product Docs`.
2. Tạo folder `ArtFlow - Product Media`.
3. Chia sẻ hai folder cho các thành viên cần xem hoặc cập nhật content.
4. Mở từng folder và sao chép ID trong URL. Ví dụ URL `https://drive.google.com/drive/folders/ABC123` có ID là `ABC123`.

Bạn cũng có thể dùng một folder cha chung cho cả tài liệu và media.

## 2. Tạo Script Properties

1. Mở project Google Apps Script của backend.
2. Chọn **Project Settings** (biểu tượng bánh răng).
3. Tìm **Script Properties** và chọn **Add script property**.
4. Thêm:

| Property | Value |
| --- | --- |
| `PRODUCT_DOCS_PARENT_FOLDER_ID` | ID folder `ArtFlow - Product Docs` |
| `PRODUCT_MEDIA_PARENT_FOLDER_ID` | ID folder `ArtFlow - Product Media` |

Nếu dùng một folder chung, chỉ cần tạo `PRODUCT_CONTENT_ROOT_FOLDER_ID`; hệ thống dùng nó làm fallback cho cả hai loại tài nguyên.

## 3. Deploy và cấp quyền

1. Dán phiên bản mới nhất của `apps-script/Code.gs` vào project Apps Script.
2. Chọn **Deploy > Manage deployments**.
3. Sửa deployment Web App hiện tại và chọn **New version**.
4. Deploy với **Execute as: Me**.
5. Khi Google hỏi quyền mới, chấp thuận quyền truy cập Google Drive và Google Docs.

Lần đầu tạo sản phẩm sau deploy có thể yêu cầu cấp quyền. Tài nguyên được tạo bằng tài khoản sở hữu deployment.

## 4. Kiểm tra

1. Tạo một sản phẩm thử trên trang Sản phẩm.
2. Mở **Chi tiết** của sản phẩm.
3. Kiểm tra bốn link: Google Docs, folder sản phẩm, folder hình ảnh và folder video.
4. Nếu sản phẩm được tạo trước khi cấu hình, bấm **Tạo tài nguyên content** trong màn hình chi tiết.

## Ảnh đại diện

Trường **Link ảnh đại diện** nhận URL ảnh trực tiếp mà người dùng của website có quyền truy cập. Với ảnh trong Google Drive, hãy bảo đảm quyền chia sẻ phù hợp. Folder media vẫn là nơi lưu toàn bộ ảnh/video gốc; ảnh đại diện chỉ dùng để hiển thị nhanh trong danh sách và hồ sơ.

