# Hướng dẫn thiết lập Auth bằng Google Apps Script

ArtFlow POS dùng kiến trúc giống VocaNest:

```text
GitHub Pages frontend
  -> Cloudflare Worker proxy
  -> Google Apps Script Web App
  -> Google Sheets / Google Drive
```

Không cần tạo Google Cloud Project hay service account.

## Quy ước đặt tên

| Thành phần | Tên đề xuất |
|---|---|
| Google Sheet | `ArtFlow POS Database - Production` |
| Apps Script project | `ArtFlow POS API - Production` |
| Cloudflare Worker | `artflow-pos-api` |
| Cloudflare secret | `APPS_SCRIPT_URL` |
| Frontend config | `apiUrl` |

Nếu muốn môi trường thử nghiệm:

- Google Sheet: `ArtFlow POS Database - Development`
- Apps Script project: `ArtFlow POS API - Development`
- Worker: `artflow-pos-api-dev`

## Bước 1: Tạo Google Sheet

1. Mở Google Drive.
2. Tạo Google Sheet mới.
3. Đặt tên:

```text
ArtFlow POS Database - Production
```

4. Copy Spreadsheet ID từ URL.

Ví dụ:

```text
https://docs.google.com/spreadsheets/d/1abcDEFghiJKLmnopQRstuVWxyz123456789/edit
```

Spreadsheet ID là:

```text
1abcDEFghiJKLmnopQRstuVWxyz123456789
```

Bạn chưa cần tạo sheet con. Apps Script sẽ tự tạo sheet:

- `users`

## Bước 2: Tạo Apps Script project

1. Mở:

```text
https://script.google.com/
```

2. Bấm `New project`.
3. Đặt tên project:

```text
ArtFlow POS API - Production
```

4. Xóa code mặc định trong `Code.gs`.
5. Copy toàn bộ nội dung file:

```text
apps-script/Code.gs
```

6. Dán vào `Code.gs` trên Apps Script.

## Bước 3: Điền Spreadsheet ID

Trong Apps Script, tìm dòng:

```js
const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
```

Thay bằng Spreadsheet ID thật:

```js
const SPREADSHEET_ID = "1abcDEFghiJKLmnopQRstuVWxyz123456789";
```

Sau đó bấm `Save`.

## Bước 4: Deploy Apps Script Web App

1. Bấm `Deploy`.
2. Chọn `New deployment`.
3. Ở biểu tượng bánh răng, chọn:

```text
Web app
```

4. Điền:

```text
Description: ArtFlow POS API production
```

5. Chọn:

```text
Execute as: Me
Who has access: Anyone
```

6. Bấm `Deploy`.
7. Google sẽ yêu cầu cấp quyền. Bấm `Authorize access`.
8. Copy `Web app URL`.

URL thường có dạng:

```text
https://script.google.com/macros/s/AKfycb.../exec
```

Giữ URL này để đưa vào Cloudflare Secret.

## Bước 5: Cấu hình Worker allowlist

Mở:

```text
cloudflare-worker/wrangler.jsonc
```

Kiểm tra `ALLOWED_ORIGINS`.

Khi chạy local cần có:

```text
http://127.0.0.1:8000
http://localhost:8000
```

Khi deploy GitHub Pages, thêm URL GitHub Pages thật của bạn, ví dụ:

```text
https://ptlocnguyen.github.io
```

## Bước 6: Cài Wrangler và đăng nhập Cloudflare

Trong terminal:

```bash
cd cloudflare-worker
npm install
npx wrangler login
```

Trình duyệt sẽ mở trang Cloudflare để bạn xác nhận quyền.

## Bước 7: Lưu Apps Script URL vào Cloudflare Secret

Chạy:

```bash
npm run secret:apps-script
```

Terminal sẽ hỏi giá trị secret. Dán `Web app URL` của Apps Script vào.

Secret này tên là:

```text
APPS_SCRIPT_URL
```

Không đưa Web App URL trực tiếp vào frontend.

## Bước 8: Tạo secret local cho Wrangler dev

`wrangler secret put` dùng cho Worker trên Cloudflare. Khi chạy local bằng `npm run dev`, Wrangler đọc secret từ file `.dev.vars`.

Tạo file:

```text
cloudflare-worker/.dev.vars
```

Nội dung:

```text
APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

File `.dev.vars` đã được đưa vào `.gitignore`, không commit file này lên GitHub.

## Bước 9: Chạy thử Worker local

```bash
npm run dev
```

Wrangler thường chạy ở:

```text
http://127.0.0.1:8787
```

Vì Worker proxy chỉ nhận `POST`, test nhanh bằng PowerShell:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8787" `
  -Method Post `
  -ContentType "text/plain;charset=utf-8" `
  -Body '{"action":"bootstrapStatus"}'
```

Kết quả mong đợi:

```json
{
  "ok": true,
  "hasAdmin": false
}
```

Nếu thấy lỗi:

```text
Proxy is not configured
```

thì Worker local chưa đọc được `APPS_SCRIPT_URL`. Kiểm tra lại file `cloudflare-worker/.dev.vars`.

## Bước 10: Kết nối frontend local với Worker local

Mở:

```text
assets/js/config.js
```

Tạm thời đặt:

```js
window.ARTFLOW_POS_CONFIG = {
  appName: "ArtFlow POS",
  apiUrl: "http://127.0.0.1:8787",
  storageKey: "artflow-pos.v2"
};
```

Sau đó chạy frontend:

```bash
cd ..
python -m http.server 8000
```

Mở:

```text
http://127.0.0.1:8000
```

Nếu Google Sheet chưa có admin, app sẽ hiện form `Khởi tạo quản trị viên`.

## Bước 11: Khởi tạo admin đầu tiên

Trên web ArtFlow POS:

1. Nhập tên admin.
2. Nhập email thật của bạn.
3. Nhập mật khẩu.
4. Bấm `Tạo tài khoản admin`.

Apps Script sẽ tự tạo sheet `users` và ghi tài khoản vào đó.

Mật khẩu không lưu text thường. Hệ thống lưu:

- `password_hash`
- `salt`

## Bước 12: Deploy Worker

Khi local đã chạy ổn:

```bash
cd cloudflare-worker
npm run deploy
```

Sau deploy, Wrangler sẽ in URL dạng:

```text
https://artflow-pos-api.<your-subdomain>.workers.dev
```

## Bước 13: Kết nối frontend với Worker production

Mở:

```text
assets/js/config.js
```

Đổi:

```js
apiUrl: "http://127.0.0.1:8787"
```

thành:

```js
apiUrl: "https://artflow-pos-api.<your-subdomain>.workers.dev"
```

Sau đó commit và push lên GitHub Pages.

## Bước 14: Test sau deploy

Test theo thứ tự:

1. Mở GitHub Pages URL.
2. Đăng nhập bằng admin đã tạo.
3. Vào trang `Nhân viên`.
4. Tạo một tài khoản nhân viên.
5. Đăng xuất.
6. Đăng nhập bằng tài khoản nhân viên.
7. Kiểm tra nhân viên không thấy trang `Nhân viên` nếu không phải admin.

## Khi sửa Apps Script

Mỗi lần sửa `Code.gs`:

1. Bấm `Save`.
2. Bấm `Deploy`.
3. Chọn `Manage deployments`.
4. Bấm biểu tượng bút chì ở deployment hiện tại.
5. Chọn version mới.
6. Bấm `Deploy`.

Nếu bạn tạo deployment mới và Web App URL đổi, hãy chạy lại:

```bash
cd cloudflare-worker
npm run secret:apps-script
npm run deploy
```

## Lỗi thường gặp

### 1. Apps Script URL không trả JSON

Kiểm tra:

- Deployment type có phải `Web app` không.
- `Who has access` có phải `Anyone` không.
- URL đưa vào secret có kết thúc bằng `/exec` không.

### 2. `Forbidden origin`

Thêm URL frontend vào `ALLOWED_ORIGINS` trong `wrangler.jsonc`.

Ví dụ:

```jsonc
"ALLOWED_ORIGINS": "https://yourname.github.io,http://127.0.0.1:8000"
```

Sau đó deploy lại Worker:

```bash
npm run deploy
```

### 3. Frontend báo chưa cấu hình backend

Kiểm tra:

```text
assets/js/config.js
```

`apiUrl` không được để rỗng.

### 4. Muốn khởi tạo lại admin từ đầu

Trong Google Sheet:

1. Mở sheet `users`.
2. Xóa tất cả dòng bên dưới header.
3. Reload frontend.
4. App sẽ hiện form khởi tạo admin lại.

## Ghi chú bảo mật

- Frontend không chứa tài khoản admin mặc định.
- Apps Script Web App URL được giữ trong Cloudflare Secret, không đưa vào frontend.
- Worker kiểm soát CORS và giới hạn request body.
- Apps Script chạy dưới tài khoản Google của bạn và ghi dữ liệu vào Drive/Google Sheet của bạn.

## Nguồn tham khảo

- Apps Script Web Apps: https://developers.google.com/apps-script/guides/web
- Apps Script deployments: https://developers.google.com/apps-script/concepts/deployments
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
