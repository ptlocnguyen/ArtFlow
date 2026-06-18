# ArtFlow POS

> Hệ thống quản lý bán hàng nội bộ cho team ArtFlow, triển khai frontend tĩnh trên GitHub Pages và lưu dữ liệu qua Google Apps Script.

[![Frontend](https://img.shields.io/badge/Frontend-GitHub_Pages-24292f?style=for-the-badge&logo=github)](https://pages.github.com/)
[![API](https://img.shields.io/badge/API-Cloudflare_Workers-f38020?style=for-the-badge&logo=cloudflare)](https://developers.cloudflare.com/workers/)
[![Data](https://img.shields.io/badge/Data-Google_Sheets%2FDrive-34a853?style=for-the-badge&logo=googledrive&logoColor=white)](https://developers.google.com/workspace)

ArtFlow POS là ứng dụng quản lý bán hàng dành cho team cá nhân. Hệ thống không mở đăng ký công khai; admin cấp tài khoản nhân viên trực tiếp trong ứng dụng. Frontend gọi Cloudflare Worker, Worker proxy request sang Google Apps Script để ghi dữ liệu vào Google Sheet/Drive.

## Điểm chính

- Trang đăng nhập riêng tại `index.html`.
- Các màn hình nghiệp vụ được tách riêng trong `pages/`.
- Không hardcode tài khoản admin trên giao diện.
- Khởi tạo admin đầu tiên qua Google Apps Script.
- Đăng nhập bằng session token qua Cloudflare Worker proxy.
- Quản lý tài khoản nhân viên cho admin.
- Dashboard doanh thu, lợi nhuận ước tính, đơn cần xử lý và cảnh báo kho.
- Quản lý sản phẩm, khách hàng, đơn hàng, tồn kho và báo cáo nhanh.
- Có loading overlay, toast thông báo và trạng thái nút đang xử lý.
- Chạy trực tiếp trên GitHub Pages, không cần build step.

## Cấu trúc dự án

```text
ArtFlow/
  index.html
  pages/
    dashboard.html
    orders.html
    products.html
    customers.html
    inventory.html
    reports.html
    users.html
  assets/
    css/
      base.css
      app.css
    js/
      config.js
      data.js
      storage.js
      app.js
    images/
      artflow-pos-logo.svg
  apps-script/
    Code.gs
  cloudflare-worker/
    src/index.js
    package.json
    wrangler.jsonc
  docs/
    google-sheets-worker-auth-setup.md
    sales-management-platform-research.md
    sales-management-web-plan.md
```

## Chạy local

```bash
python -m http.server 8000
```

Mở:

```text
http://127.0.0.1:8000
```

Frontend cần `apiUrl` trong `assets/js/config.js` để đăng nhập thật. Khi test local với Worker, giá trị thường là:

```js
apiUrl: "http://127.0.0.1:8787"
```

## Deploy GitHub Pages

1. Push repository lên GitHub.
2. Mở `Settings` -> `Pages`.
3. Chọn `Deploy from a branch`.
4. Chọn branch chính và thư mục root.
5. Mở URL GitHub Pages được tạo.

## Hướng phát triển tiếp theo

- Chuyển CRUD sản phẩm, khách hàng, đơn hàng và kho từ localStorage sang Apps Script.
- Tạo các sheet thật: `products`, `customers`, `orders`, `order_items`, `inventory_logs`.
- Thêm nhập đơn từ Shopee, TikTok Shop, Lazada bằng CSV.
- Thêm trang quản lý kênh bán để theo dõi phí sàn, trạng thái đối soát và tồn kho theo nền tảng.
