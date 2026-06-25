# ArtFlow POS

> Hệ thống quản lý bán hàng nội bộ dành cho đội ngũ ArtFlow, hỗ trợ bán hàng, sản phẩm, khách hàng, mua hàng, kho, kế toán, báo cáo, nhân sự và nhật ký hoạt động trên một giao diện web thống nhất.

[![Frontend](https://img.shields.io/badge/Frontend-GitHub_Pages-24292f?style=for-the-badge&logo=github)](https://pages.github.com/)
[![API](https://img.shields.io/badge/API-Cloudflare_Workers-f38020?style=for-the-badge&logo=cloudflare)](https://developers.cloudflare.com/workers/)
[![Backend](https://img.shields.io/badge/Backend-Google_Apps_Script-4285f4?style=for-the-badge&logo=googleappsscript&logoColor=white)](https://developers.google.com/apps-script)
[![Data](https://img.shields.io/badge/Data-Google_Sheets_%2F_Drive-34a853?style=for-the-badge&logo=googledrive&logoColor=white)](https://developers.google.com/workspace)
[![Language](https://img.shields.io/badge/Language-Vanilla_JS-f7df1e?style=for-the-badge&logo=javascript&logoColor=111)](https://developer.mozilla.org/docs/Web/JavaScript)

## 1. Tổng quan

ArtFlow POS là ứng dụng quản lý bán hàng nội bộ, được xây dựng theo hướng nhẹ, dễ triển khai và không cần máy chủ riêng.

Hệ thống gồm bốn lớp:

```text
Người dùng
   │
   ▼
Frontend tĩnh trên GitHub Pages
   │  POST JSON
   ▼
Cloudflare Worker
   │  proxy có kiểm soát CORS
   ▼
Google Apps Script Web App
   │
   ├── Google Sheets: dữ liệu nghiệp vụ
   └── Google Drive: tài nguyên sản phẩm và chứng từ
```

Frontend được viết bằng HTML, CSS và JavaScript thuần, không sử dụng framework và không cần build. Cloudflare Worker đóng vai trò cổng API trung gian, kiểm tra origin, giới hạn kích thước request và chuyển tiếp yêu cầu tới Google Apps Script.

## 2. Chức năng chính

### 2.1. Xác thực và phân quyền

- Khởi tạo tài khoản quản trị viên đầu tiên khi hệ thống chưa có admin.
- Đăng nhập bằng email và mật khẩu.
- Lưu phiên bằng token, kiểm tra phiên qua API.
- Đăng xuất và thu hồi phiên.
- Không mở đăng ký tài khoản công khai.
- Quản trị viên tạo, khóa, mở khóa và xóa tài khoản nhân viên.
- Ẩn trang và thao tác không phù hợp với quyền của người dùng.

Các vai trò hiện có:

| Vai trò | Quyền chính |
|---|---|
| `admin` | Toàn quyền, kế toán, thanh toán nhà cung cấp, nhân viên và lịch sử hoạt động |
| `sales` | Quản lý khách hàng, tạo và xử lý đơn bán |
| `inventory` | Quản lý sản phẩm, mua hàng và tồn kho |
| `viewer` | Chỉ xem dữ liệu được phép truy cập |

### 2.2. Dashboard

- Tổng hợp doanh thu thuần.
- Tính giá vốn, lãi gộp, lãi ròng và biên lãi.
- Biểu đồ doanh thu gần đây.
- Danh sách đơn hàng mới.
- Cảnh báo tồn kho thấp.
- Điều hướng nhanh tới các nghiệp vụ liên quan.

### 2.3. Sản phẩm

- Tạo, sửa, ngừng bán và kích hoạt lại sản phẩm.
- Quản lý SKU, barcode, danh mục, thương hiệu, đơn vị, xuất xứ, chất liệu và kích thước.
- Quản lý giá vốn, giá bán, lãi trên sản phẩm và tỷ lệ biên lãi.
- Theo dõi tồn kho và ngưỡng tồn thấp.
- Quản lý trạng thái nội dung sản phẩm.
- Gắn người phụ trách content.
- Lưu mô tả ngắn, đặc điểm nổi bật, khách hàng mục tiêu và từ khóa SEO.
- Lưu liên kết Website, Shopee, TikTok Shop, Facebook và bài đăng liên quan.
- Tạo tài nguyên Google Docs/Drive cho từng sản phẩm khi backend đã cấu hình.
- Quản lý danh mục, thương hiệu và đơn vị tính.
- Bộ lọc nhanh theo trạng thái, tồn kho, biên lãi, content và tài nguyên.
- Nhập, xuất sản phẩm bằng Excel.
- Tải file Excel mẫu có hướng dẫn và định dạng sẵn.

### 2.4. Khách hàng

- Tạo, sửa, ngừng theo dõi và kích hoạt lại khách hàng.
- Quản lý tên, số điện thoại, email, nhóm khách hàng và ghi chú.
- Theo dõi tổng chi tiêu và lần mua gần nhất.
- Nhập và xuất danh sách khách hàng bằng Excel.
- Tải file mẫu nhập khách hàng.

### 2.5. Đơn hàng và bán hàng

- Tạo đơn bán từ danh sách sản phẩm đang hoạt động.
- Tìm và lọc sản phẩm theo từ khóa, danh mục và tồn kho.
- Hiển thị ảnh, SKU, giá bán và lượng tồn khi chọn sản phẩm.
- Chọn khách hàng có sẵn hoặc tạo nhanh khách hàng mới.
- Quản lý số lượng, đơn giá, giảm giá và phí giao hàng.
- Chọn kênh bán: POS, Website, Shopee, Lazada, TikTok Shop hoặc Facebook.
- Quản lý phương thức và trạng thái thanh toán.
- Quản lý trạng thái giao hàng, đơn vị vận chuyển và mã vận đơn.
- Cập nhật tiến trình xử lý đơn.
- Hoàn tất hoặc hủy đơn theo điều kiện nghiệp vụ.
- Trả hàng khách mua.
- Hoàn tiền và ghi nhận giao dịch kế toán.
- Tạo PDF hóa đơn/phiếu bán hàng thông qua backend.
- Theo dõi giá trị gốc, giá trị trả hàng và giá trị thuần của đơn.

### 2.6. Mua hàng và nhà cung cấp

- Quản lý nhà cung cấp.
- Tạo và sửa phiếu mua hàng.
- Theo dõi trạng thái phiếu mua và thanh toán.
- Nhận hàng vào kho.
- Thanh toán một phần hoặc toàn bộ công nợ nhà cung cấp.
- Theo dõi ngày đến hạn và nhóm tuổi nợ.
- Trả hàng cho nhà cung cấp.
- Ghi nhận dư có và bù trừ dư có vào phiếu mua.
- Xem lịch sử giao dịch và công nợ theo nhà cung cấp.
- Tạo phiếu mua từ danh sách sản phẩm đang hoạt động.

### 2.7. Kho hàng

- Tổng hợp tổng số lượng tồn và giá trị tồn theo giá vốn.
- Hiển thị SKU tồn nhiều nhất.
- Thống kê SKU hết hàng.
- Tính số lượng đề xuất nhập thêm theo ngưỡng tồn.
- Danh sách kiểm soát SKU với bộ lọc:
  - Danh mục.
  - Hết hàng, sắp hết, đủ hàng hoặc tồn cao.
  - Sắp xếp theo rủi ro, tồn kho, giá trị hoặc tên.
- Nhập kho thủ công.
- Điều chỉnh tăng hoặc giảm tồn.
- Thao tác nhanh trên từng SKU.
- Cảnh báo các sản phẩm cần ưu tiên nhập.
- Lịch sử biến động kho:
  - Tồn ban đầu.
  - Nhập kho.
  - Bán hàng.
  - Hủy đơn.
  - Điều chỉnh.
  - Nhận hàng mua.
  - Hủy nhập.
  - Trả hàng nhà cung cấp.

### 2.8. Kế toán

- Quản lý tài khoản tiền:
  - Tiền mặt.
  - Ngân hàng.
  - Ví/COD.
  - Loại khác.
- Quản lý danh mục thu và chi.
- Ghi nhận giao dịch thu/chi.
- Theo dõi số dư đầu kỳ và số dư hiện tại.
- Ẩn hoặc kích hoạt lại tài khoản và danh mục.
- Đối soát số dư thực tế với số liệu hệ thống.
- Theo dõi lịch sử đối soát và chênh lệch.
- Theo dõi công nợ bán hàng.
- Ghi nhận khoản thu cho từng đơn hàng.
- Tự liên kết một số giao dịch với đơn bán, phiếu mua và hoàn tiền.

### 2.9. Báo cáo

- Báo cáo doanh thu thuần.
- Giá vốn thực.
- Lãi gộp và biên lãi gộp.
- Chi phí vận hành.
- Lãi ròng.
- Lọc theo thời gian và kênh bán.
- So sánh với kỳ trước.
- Phân tích lợi nhuận theo ngày.
- Phân tích chi phí theo danh mục.
- Lợi nhuận theo sản phẩm.
- Hiệu quả theo kênh bán.
- Xuất báo cáo Excel nhiều sheet, có định dạng, bộ lọc và định dạng tiền tệ.

### 2.10. Nhân viên và lịch sử hoạt động

- Danh sách nhân viên và vai trò.
- Tạo tài khoản nhân viên.
- Khóa, mở khóa hoặc xóa tài khoản.
- Chỉ quản trị viên được truy cập.
- Nhật ký hoạt động có:
  - Thời gian.
  - Người thực hiện.
  - Hành động.
  - Loại đối tượng.
  - Mã tham chiếu.
  - Dữ liệu chi tiết dạng JSON.
- Tìm kiếm và lọc nhật ký theo loại đối tượng và thời gian.

## 3. Kiến trúc kỹ thuật

### 3.1. Frontend

- HTML5, CSS3 và JavaScript thuần.
- Mỗi nghiệp vụ chính là một trang HTML riêng.
- Giao diện responsive cho desktop, tablet và mobile.
- Bảng có sticky header trên desktop và chuyển sang dạng card trên mobile.
- Có loading overlay, toast, modal và skeleton.
- Sử dụng `localStorage` làm cache/fallback trạng thái phía trình duyệt.
- Sử dụng `sessionStorage` cho một số thông tin phiên cục bộ.
- Dùng `xlsx-js-style` để đọc, tạo và xuất file Excel.
- Không cần Node.js để chạy frontend.

### 3.2. Cloudflare Worker

Worker có các nhiệm vụ:

- Chỉ chấp nhận `POST` và `OPTIONS`.
- Kiểm tra CORS theo `ALLOWED_ORIGINS`.
- Cho phép localhost phục vụ phát triển.
- Giới hạn request tối đa 2 MB.
- Timeout upstream sau 25 giây.
- Kiểm tra JSON và trường `action`.
- Không lưu cache response API.
- Không đưa trực tiếp Apps Script URL vào frontend.
- Chuyển tiếp payload tới Google Apps Script bằng `text/plain;charset=utf-8`.

### 3.3. Google Apps Script

Google Apps Script là backend nghiệp vụ thực tế, nhận trường `action` và xử lý:

- Xác thực và phiên đăng nhập.
- CRUD sản phẩm, khách hàng, nhân viên và nhà cung cấp.
- Đơn bán, trả hàng và hoàn tiền.
- Phiếu mua, nhận hàng, thanh toán và trả nhà cung cấp.
- Biến động tồn kho.
- Thu chi, tài khoản tiền, danh mục và đối soát.
- Nhật ký hoạt động.
- Tạo tài nguyên Google Drive và Google Docs.
- Tạo PDF hóa đơn/phiếu bán hàng.

> Thư mục `apps-script/` đang nằm trong `.gitignore`. Vì vậy mã Apps Script không được đưa lên repository công khai theo cấu hình hiện tại. Khi triển khai trên môi trường mới, cần có mã backend Apps Script tương ứng và deploy dưới dạng Web App.

### 3.4. Luồng gọi API

Frontend không gọi các URL REST riêng biệt. Hàm `actionForPath()` ánh xạ đường dẫn nội bộ sang tên action, sau đó gửi một request POST tới Worker:

```json
{
  "action": "listProducts",
  "token": "session-token",
  "otherField": "..."
}
```

Worker giữ nguyên payload và chuyển tiếp tới Apps Script.

## 4. Cấu trúc thư mục

```text
ArtFlow/
├── index.html                      # Đăng nhập và khởi tạo admin
├── site.webmanifest                # Thông tin ứng dụng web
├── .nojekyll                       # Giữ nguyên tài nguyên khi deploy GitHub Pages
├── .gitignore
├── README.md
│
├── pages/
│   ├── dashboard.html              # Tổng quan
│   ├── orders.html                 # Danh sách đơn bán
│   ├── order-create.html           # Tạo đơn bán
│   ├── products.html               # Sản phẩm và content
│   ├── customers.html              # Khách hàng
│   ├── purchasing.html             # Nhà cung cấp và phiếu mua
│   ├── purchase-create.html        # Tạo/sửa phiếu mua
│   ├── inventory.html              # Kho và biến động tồn
│   ├── accounting.html             # Thu chi, công nợ, đối soát
│   ├── reports.html                # Báo cáo lợi nhuận
│   ├── users.html                  # Nhân viên
│   └── activity.html               # Nhật ký hoạt động
│
├── assets/
│   ├── css/
│   │   ├── base.css                # Biến giao diện và style nền tảng
│   │   └── app.css                 # Layout và style nghiệp vụ
│   ├── images/
│   │   └── artflow-pos-logo.svg
│   ├── js/
│   │   ├── config.js               # Tên app, API URL, storage key
│   │   ├── data.js                 # Seed/fallback data
│   │   ├── storage.js              # Cache trạng thái phía trình duyệt
│   │   └── app.js                  # Toàn bộ UI, API và nghiệp vụ frontend
│   └── vendor/
│       ├── xlsx.bundle.js
│       └── xlsx-js-style.LICENSE
│
├── cloudflare-worker/
│   ├── src/
│   │   └── index.js                # CORS và proxy tới Apps Script
│   ├── package.json
│   ├── package-lock.json
│   └── wrangler.jsonc
│
├── apps-script/                     # Backend Apps Script, đang bị gitignore
└── docs/                            # Tài liệu nội bộ, đang bị gitignore
```

## 5. Yêu cầu môi trường

### Chạy frontend

- Python 3 hoặc một static web server tương đương.
- Trình duyệt hiện đại.

### Chạy Cloudflare Worker

- Node.js 18 trở lên.
- npm.
- Tài khoản Cloudflare.
- Wrangler CLI, được cài qua dependency của project.

### Backend

- Một Google Sheet dùng làm cơ sở dữ liệu.
- Một dự án Google Apps Script gắn với Sheet hoặc có quyền truy cập Sheet.
- Apps Script Web App được deploy và trả về JSON.
- Quyền Google Drive nếu sử dụng chức năng tài nguyên và PDF.

## 6. Cấu hình frontend

Mở:

```text
assets/js/config.js
```

Cấu hình hiện tại có dạng:

```js
window.ARTFLOW_POS_CONFIG = {
  appName: "ArtFlow POS",
  apiUrl: "https://artflow-pos-api.<subdomain>.workers.dev",
  storageKey: "artflow-pos.v2"
};
```

Ý nghĩa:

| Thuộc tính | Mô tả |
|---|---|
| `appName` | Tên hiển thị của ứng dụng |
| `apiUrl` | URL Cloudflare Worker |
| `storageKey` | Tiền tố khóa lưu cache và token trong trình duyệt |

Không đặt Google Apps Script URL hoặc thông tin bí mật trong file này.

## 7. Chạy local

### 7.1. Cài dependency Worker

```bash
cd cloudflare-worker
npm install
```

### 7.2. Khai báo Apps Script URL cho Worker

Đăng nhập Cloudflare:

```bash
npx wrangler login
```

Tạo secret:

```bash
npm run secret:apps-script
```

Sau đó dán URL Apps Script Web App có dạng:

```text
https://script.google.com/macros/s/.../exec
```

### 7.3. Chạy Worker local

```bash
npm run dev
```

Wrangler thường chạy tại:

```text
http://127.0.0.1:8787
```

### 7.4. Trỏ frontend về Worker local

Tạm thời sửa `assets/js/config.js`:

```js
apiUrl: "http://127.0.0.1:8787"
```

### 7.5. Chạy frontend

Từ thư mục gốc:

```bash
python -m http.server 8000
```

Mở:

```text
http://127.0.0.1:8000
```

Không nên mở trực tiếp file HTML bằng `file://`, vì trình duyệt có thể chặn request hoặc xử lý đường dẫn không đúng.

## 8. Khởi tạo hệ thống lần đầu

Khi Google Sheet chưa có quản trị viên:

1. Mở trang đăng nhập.
2. Hệ thống gọi `bootstrapStatus`.
3. Form chuyển sang chế độ **Khởi tạo quản trị viên**.
4. Nhập tên, email và mật khẩu.
5. Backend tạo tài khoản admin đầu tiên.
6. Đăng nhập bằng tài khoản vừa tạo.

Mật khẩu phải được backend băm và lưu kèm salt; không lưu mật khẩu dạng văn bản thuần.

## 9. Triển khai Cloudflare Worker

### 9.1. Cập nhật origin được phép

Mở:

```text
cloudflare-worker/wrangler.jsonc
```

Ví dụ:

```jsonc
{
  "vars": {
    "ALLOWED_ORIGINS": "https://yourname.github.io,http://localhost:8000,http://127.0.0.1:8000"
  }
}
```

Nếu GitHub Pages dùng đường dẫn repository, chỉ cần khai báo origin:

```text
https://yourname.github.io
```

Không thêm phần `/repository-name` vào origin.

### 9.2. Tạo secret production

```bash
cd cloudflare-worker
npm run secret:apps-script
```

### 9.3. Deploy

```bash
npm run deploy
```

Sau deploy, Cloudflare trả URL dạng:

```text
https://artflow-pos-api.<subdomain>.workers.dev
```

Cập nhật URL này vào `assets/js/config.js`.

## 10. Triển khai frontend lên GitHub Pages

1. Commit và push repository lên GitHub.
2. Mở **Settings → Pages**.
3. Chọn **Deploy from a branch**.
4. Chọn branch chính, thường là `main`.
5. Chọn thư mục `/ (root)`.
6. Lưu cấu hình.
7. Mở URL GitHub Pages được cấp.
8. Kiểm tra URL đó đã có trong `ALLOWED_ORIGINS`.
9. Kiểm tra `assets/js/config.js` đang trỏ tới Worker production.

Lệnh push cơ bản:

```bash
git add .
git commit -m "Update ArtFlow POS"
git push origin main
```

## 11. Dữ liệu phía trình duyệt

`storage.js` lưu một bản state cục bộ bằng `localStorage`. State này gồm sản phẩm, khách hàng, đơn hàng, kế toán, nhà cung cấp và các danh sách liên quan.

Vai trò của local storage:

- Giữ seed data khi chưa tải được backend.
- Làm cache giao diện sau khi dữ liệu được tải từ API.
- Giảm tình trạng giao diện trống trong một số luồng.

Nguồn dữ liệu nghiệp vụ chính vẫn phải là Google Apps Script/Google Sheets. Không nên coi local storage là cơ sở dữ liệu production.

Để xóa cache của phiên bản hiện tại, chạy trong DevTools Console:

```js
localStorage.removeItem("artflow-pos.v2");
localStorage.removeItem("artflow-pos.v2.authToken");
sessionStorage.clear();
location.reload();
```

## 12. Các action API frontend đang sử dụng

Các nhóm action chính:

### Xác thực

```text
bootstrapStatus
setupAdmin
login
me
logout
```

### Nhân viên và nhật ký

```text
listUsers
createUser
toggleUser
deleteUser
listAuditLogs
```

### Sản phẩm

```text
listProducts
createProduct
updateProduct
archiveProduct
createProductOption
updateProductOption
toggleProductOption
importProducts
provisionProductContent
provisionMissingProductContent
testProductContentConfiguration
```

### Khách hàng

```text
listCustomers
createCustomer
updateCustomer
archiveCustomer
importCustomers
```

### Đơn hàng

```text
listOrders
createOrder
createOrderReceiptPdf
updateOrderStatus
updateOrderFulfillment
cancelOrder
returnOrder
refundOrder
```

### Kho

```text
listStockMovements
receiveStock
adjustStock
```

### Kế toán

```text
getAccountingData
createCashTransaction
archiveCashTransaction
createAccountingAccount
updateAccountingAccount
archiveAccountingAccount
createAccountingReconciliation
createAccountingCategory
updateAccountingCategory
archiveAccountingCategory
```

### Mua hàng

```text
getPurchasingData
createSupplier
updateSupplier
archiveSupplier
createPurchaseOrder
updatePurchaseOrder
receivePurchaseOrder
payPurchaseOrder
cancelPurchaseOrder
returnPurchaseOrder
applySupplierCredit
```

### Tải dữ liệu theo trang

```text
getPageData
```

Backend Apps Script phải hỗ trợ đúng các action mà frontend gọi.

## 13. Bảo mật

Các nguyên tắc hiện có:

- Apps Script URL được lưu trong Cloudflare secret `APPS_SCRIPT_URL`.
- Worker giới hạn origin bằng `ALLOWED_ORIGINS`.
- Worker không cho phép phương thức ngoài `POST` và `OPTIONS`.
- Worker giới hạn request 2 MB.
- Response API dùng `Cache-Control: no-store`.
- Giao diện không hardcode tài khoản quản trị.
- Trang quản trị được kiểm tra vai trò ở frontend.
- Mỗi request có thể kèm session token.

Các yêu cầu bắt buộc ở backend:

- Luôn kiểm tra token và quyền cho từng action.
- Không chỉ dựa vào việc ẩn nút ở frontend.
- Băm mật khẩu bằng thuật toán phù hợp và salt riêng.
- Có thời hạn phiên và cơ chế thu hồi token.
- Kiểm tra dữ liệu đầu vào.
- Ghi audit log cho thao tác quan trọng.
- Dùng `LockService` hoặc cơ chế khóa khi cập nhật tồn kho, đơn hàng và số dư.
- Không trả stack trace hoặc thông tin bí mật về frontend.
- Hạn chế quyền của Apps Script và thư mục Drive.

## 14. Quy ước nghiệp vụ đáng chú ý

- Sản phẩm ngừng bán không được chọn để tạo giao dịch mới.
- Tồn kho được cập nhật thông qua biến động kho, không nên sửa trực tiếp ngoài luồng nghiệp vụ.
- Đơn hủy chỉ được hủy khi chưa có thu tiền, trả hàng hoặc hoàn tiền.
- Trả hàng và hoàn tiền là hai nghiệp vụ riêng.
- Giá trị doanh thu báo cáo sử dụng doanh thu thuần sau trả hàng.
- Giá vốn báo cáo giảm theo số lượng hàng đã trả.
- Chi phí vận hành không bao gồm giao dịch nhập hàng và hoàn tiền.
- Quyền thanh toán nhà cung cấp chỉ dành cho admin.
- Kế toán và đối soát chỉ dành cho admin.
- Trang nhân viên và lịch sử hoạt động chỉ dành cho admin.

## 15. Nhập và xuất Excel

Hệ thống dùng `assets/vendor/xlsx.bundle.js`.

Chức năng hiện có:

- Tải mẫu nhập sản phẩm.
- Nhập sản phẩm từ `.xlsx` hoặc `.csv`.
- Xuất danh mục sản phẩm.
- Tải mẫu nhập khách hàng.
- Nhập khách hàng từ `.xlsx` hoặc `.csv`.
- Xuất danh sách khách hàng.
- Xuất báo cáo lợi nhuận nhiều sheet.

Giới hạn được frontend kiểm tra:

- Tối đa 500 dòng mỗi lần nhập.
- Tối đa 5 MB mỗi file.
- Sản phẩm bắt buộc có SKU, tên, danh mục, giá và tồn kho hợp lệ.
- Giá bán không được thấp hơn giá vốn trong luồng nhập hiện tại.
- Khách hàng bắt buộc có tên và số điện thoại.
- Email khách hàng phải hợp lệ nếu được cung cấp.

## 16. Lỗi thường gặp

### `Frontend báo chưa cấu hình backend`

Kiểm tra `apiUrl` trong:

```text
assets/js/config.js
```

### `Forbidden origin`

Thêm đúng origin frontend vào `ALLOWED_ORIGINS`, sau đó deploy lại Worker:

```bash
cd cloudflare-worker
npm run deploy
```

### `Proxy is not configured`

Worker chưa có secret:

```bash
npm run secret:apps-script
```

### `Apps Script URL không trả JSON`

Kiểm tra:

- URL kết thúc bằng `/exec`.
- Deployment là **Web app**.
- Apps Script trả JSON cho request POST.
- Deployment đang dùng version mới nhất.
- Quyền truy cập phù hợp với kiến trúc proxy.

### `Upstream service unavailable`

Có thể do:

- Apps Script lỗi.
- Request chạy quá 25 giây.
- Mạng hoặc dịch vụ Google tạm gián đoạn.
- URL secret không còn hợp lệ.

### Giao diện vẫn dùng CSS hoặc JavaScript cũ

- Nhấn `Ctrl + F5` hoặc `Ctrl + Shift + R`.
- Mở DevTools → Network → bật **Disable cache**.
- Kiểm tra GitHub Pages đã deploy commit mới.
- Kiểm tra đường dẫn file CSS/JS đúng.

### Dữ liệu hiển thị cũ

Xóa cache local:

```js
localStorage.removeItem("artflow-pos.v2");
location.reload();
```

### Sửa Apps Script nhưng web chưa thay đổi

Trong Apps Script:

1. Save.
2. Deploy.
3. Manage deployments.
4. Edit deployment.
5. Chọn version mới.
6. Deploy lại.

Nếu tạo deployment mới và URL thay đổi, cập nhật lại secret Worker.

## 17. Kiểm tra nhanh sau khi triển khai

Nên test theo thứ tự:

1. Khởi tạo admin hoặc đăng nhập.
2. Tạo tài khoản `sales`, `inventory` và `viewer`.
3. Kiểm tra menu và thao tác theo từng vai trò.
4. Tạo sản phẩm mới.
5. Nhập kho.
6. Tạo khách hàng.
7. Tạo đơn bán và hoàn tất đơn.
8. Kiểm tra tồn kho giảm.
9. Thử trả hàng và hoàn tiền.
10. Kiểm tra giao dịch kế toán.
11. Tạo nhà cung cấp và phiếu mua.
12. Nhận hàng, kiểm tra tồn kho tăng.
13. Thanh toán phiếu mua.
14. Kiểm tra công nợ.
15. Kiểm tra báo cáo lợi nhuận.
16. Xuất Excel.
17. Kiểm tra nhật ký hoạt động.
18. Kiểm tra giao diện trên desktop và mobile.

## 18. Giới hạn hiện tại

- Frontend tập trung phần lớn logic trong một file `assets/js/app.js`, nên cần cẩn thận khi mở rộng.
- Chưa có build pipeline, unit test hoặc end-to-end test trong repository.
- Google Sheets phù hợp quy mô nhỏ và vừa, nhưng có thể chậm khi dữ liệu tăng lớn.
- Local storage chỉ là cache/fallback, không phù hợp làm nguồn dữ liệu chính.
- Mã Apps Script và tài liệu nội bộ đang bị loại khỏi Git theo `.gitignore`.
- Chưa có hệ thống migration schema dữ liệu.
- Việc đồng thời ghi dữ liệu phụ thuộc vào cơ chế khóa và kiểm tra ở Apps Script.
- Một số chỉ số báo cáo được tính ở frontend từ dữ liệu đã tải về.

## 19. Hướng phát triển đề xuất

- Tách `app.js` thành các module theo nghiệp vụ.
- Thêm pagination phía backend cho bảng dữ liệu lớn.
- Thêm kiểm thử tự động.
- Thêm schema version và migration cho Google Sheets.
- Thêm quản lý nhiều kho và chuyển kho.
- Thêm kiểm kho theo phiên.
- Thêm giữ tồn cho đơn chưa giao và tồn khả dụng.
- Thêm nhập đơn từ các sàn thương mại điện tử.
- Thêm đối soát COD và phí sàn.
- Thêm phân quyền chi tiết theo hành động.
- Thêm rate limit và Cloudflare WAF.
- Thêm cơ chế backup và phục hồi dữ liệu.
- Cân nhắc chuyển dữ liệu giao dịch lớn sang Cloudflare D1, PostgreSQL hoặc hệ quản trị cơ sở dữ liệu phù hợp.

## 20. Ghi chú repository

Các thư mục sau đang bị bỏ qua bởi Git:

```text
apps-script/
docs/
node_modules/
.wrangler/
.env*
.dev.vars
secrets.json
service-account*.json
credentials*.json
token*.json
```

Không commit secret, URL backend riêng tư, token hoặc tệp xác thực vào repository.

## 21. License

Repository hiện chưa khai báo tệp `LICENSE` cho mã nguồn ArtFlow POS.

Thư viện `xlsx-js-style` đi kèm giấy phép riêng tại:

```text
assets/vendor/xlsx-js-style.LICENSE
```

Cần bổ sung giấy phép dự án trước khi phân phối công khai hoặc cho phép bên thứ ba tái sử dụng.
