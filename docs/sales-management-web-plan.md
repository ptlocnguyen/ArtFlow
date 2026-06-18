# Ke hoach xay dung web quan ly ban hang cho team ca nhan va portfolio

Ngay lap ke hoach: 2026-06-18

## 1. Muc tieu san pham

Xay dung mot web quan ly ban hang nho gon, dung duoc cho team ca nhan va du suc show voi nha tuyen dung nhu mot project full-stack thuc te.

San pham can chung minh duoc:

- Tu duy san pham: hieu quy trinh ban hang, kho, khach hang, bao cao.
- Tu duy frontend: UI quan tri ro rang, responsive, thao tac nhanh.
- Tu duy backend/API: co lop API rieng, validate du lieu, phan quyen, log loi.
- Tu duy cloud/security: public bang GitHub Pages, API qua Cloudflare, khong lo secrets.
- Tu duy data: biet thiet ke schema, backup, import/export, audit thay doi.

## 2. Kien truc de xuat

### Tong quan

```
Nguoi dung
  -> Custom domain qua Cloudflare DNS/CDN
  -> GitHub Pages static frontend
  -> Cloudflare Worker API
  -> Google Sheets / Google Drive
```

### Vai tro tung thanh phan

- GitHub Pages:
  - Host frontend public.
  - Phu hop portfolio vi nha tuyen dung xem duoc code, deployment, UI.
  - Khong chua API key, token, service account secret.

- Cloudflare:
  - Quan ly DNS va custom domain.
  - Proxy/CDN, HTTPS, WAF co ban.
  - Worker lam backend API.
  - Rate limit, CORS, auth middleware, request logging.
  - Co the them Turnstile cho form login/demo de giam spam.

- Google Drive Pro:
  - Luu file lien quan: anh san pham, hoa don PDF, backup CSV/JSON.
  - Khong nen dung file Drive thuan lam database chinh neu co nhieu ghi doc dong thoi.

- Google Sheets:
  - Nen dung lam database nhe cho team ca nhan.
  - De xem/sua du lieu truc tiep khi can.
  - Phu hop MVP, demo va team nho.

## 3. Luu y quan trong ve "Google Drive lam database"

Google Drive/Sheets khong phai database chuyen dung. Neu san pham chi cho team ca nhan, luu luong thap, Sheets co the dung tot cho MVP.

Can thiet ke de sau nay co the chuyen sang Cloudflare D1/PostgreSQL:

- Frontend khong goi truc tiep Google API.
- Moi thao tac du lieu di qua Cloudflare Worker.
- Worker cung cap REST API on dinh.
- Lop repository trong Worker co the doi tu Google Sheets sang D1 ma frontend khong can doi nhieu.

## 4. Stack ky thuat de xuat

### Frontend

- Vite + React + TypeScript.
- Tailwind CSS hoac CSS modules.
- React Router.
- TanStack Query cho fetch/cache API.
- Zod cho validate form.
- Recharts hoac Tremor/Recharts cho bieu do.
- Lucide React cho icon.

### Backend/API

- Cloudflare Workers + TypeScript.
- Hono hoac itty-router de tao API routes gon.
- Google Sheets API cho du lieu bang.
- Google Drive API cho upload/quan ly file.
- JWT/session token nhe cho login team.
- Secrets luu bang Wrangler/Cloudflare dashboard, khong commit len GitHub.

### Deployment

- Frontend build ra static files va deploy GitHub Pages bang GitHub Actions.
- Custom domain tro ve GitHub Pages, DNS quan ly tren Cloudflare.
- API deploy len Cloudflare Workers, vi du `api.artflow.vn`.
- Frontend goi API qua bien moi truong public: `VITE_API_BASE_URL`.

## 5. Module san pham

### MVP bat buoc

1. Tong quan
   - Doanh thu hom nay/thang nay.
   - So don moi.
   - San pham sap het hang.
   - Top san pham ban chay.

2. San pham
   - Them/sua/xoa san pham.
   - SKU, ten, danh muc, gia ban, gia von, ton kho, trang thai.
   - Tim kiem, loc, sap xep.
   - Import/export CSV.

3. Khach hang
   - Ten, so dien thoai, email, dia chi, nhom khach.
   - Lich su mua hang.
   - Tong chi tieu, lan mua gan nhat.

4. Don hang
   - Tao don hang.
   - Them san pham vao don.
   - Giam gia, phi ship, ghi chu.
   - Trang thai: draft, pending, paid, shipped, completed, cancelled, returned.
   - Tu dong tru ton kho khi don duoc xac nhan.

5. Kho
   - Dieu chinh ton kho.
   - Nhap hang.
   - Lich su thay doi ton kho.
   - Canh bao ton kho thap.

6. Bao cao
   - Doanh thu theo ngay/thang.
   - Loi nhuan uoc tinh.
   - Doanh thu theo san pham.
   - Doanh thu theo nhan vien/kenh ban neu co.

7. Nguoi dung va phan quyen
   - Admin.
   - Sales.
   - Kho.
   - Viewer/demo.

### Tinh nang portfolio nen co

- Demo mode voi du lieu mau, khong can dang nhap.
- Admin mode cho team that, co login.
- Audit log: ai tao/sua/xoa ban ghi nao.
- Trang "System design" trong README mo ta kien truc.
- Seed data script tao du lieu mau.
- Error boundary va loading skeleton.
- Empty states dep cho bang rong.
- Responsive dashboard cho mobile/tablet.

## 6. Thiet ke Google Sheets database

Mot Google Spreadsheet co cac sheet sau:

### `products`

- id
- sku
- name
- category
- cost_price
- sale_price
- stock_quantity
- low_stock_threshold
- image_file_id
- status
- created_at
- updated_at

### `customers`

- id
- name
- phone
- email
- address
- customer_group
- total_spent
- last_order_at
- note
- created_at
- updated_at

### `orders`

- id
- order_code
- customer_id
- channel
- status
- subtotal
- discount
- shipping_fee
- total
- payment_status
- payment_method
- created_by
- created_at
- updated_at

### `order_items`

- id
- order_id
- product_id
- sku
- product_name
- quantity
- unit_price
- cost_price
- line_total

### `inventory_movements`

- id
- product_id
- type
- quantity
- before_quantity
- after_quantity
- ref_type
- ref_id
- note
- created_by
- created_at

### `users`

- id
- name
- email
- role
- status
- password_hash_or_provider_id
- created_at
- updated_at

### `audit_logs`

- id
- actor_id
- action
- entity_type
- entity_id
- before_json
- after_json
- created_at

## 7. API thiet ke

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Products

- `GET /products`
- `POST /products`
- `GET /products/:id`
- `PUT /products/:id`
- `DELETE /products/:id`
- `POST /products/import`
- `GET /products/export`

### Customers

- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PUT /customers/:id`
- `GET /customers/:id/orders`

### Orders

- `GET /orders`
- `POST /orders`
- `GET /orders/:id`
- `PUT /orders/:id/status`
- `POST /orders/:id/cancel`
- `POST /orders/:id/return`

### Inventory

- `GET /inventory/movements`
- `POST /inventory/adjust`
- `POST /inventory/receive`
- `GET /inventory/low-stock`

### Reports

- `GET /reports/summary`
- `GET /reports/revenue`
- `GET /reports/products`
- `GET /reports/customers`

## 8. UI/UX de show nha tuyen dung

### Layout chinh

- Sidebar trai:
  - Tong quan
  - Ban hang
  - Don hang
  - San pham
  - Kho
  - Khach hang
  - Bao cao
  - Cai dat

- Header:
  - Search nhanh.
  - Nut tao don.
  - User menu.

- Dashboard:
  - KPI cards nho gon.
  - Bieu do doanh thu.
  - Bang don moi.
  - Bang san pham sap het.

### Nguyen tac giao dien

- Uu tien bang du lieu ro rang, thao tac nhanh.
- Khong lam landing page marketing la man hinh dau tien.
- Co loading, empty, error, success states.
- Co filter/search/sort tren cac bang lon.
- Mobile xem duoc dashboard va don hang; desktop la trai nghiem chinh.

## 9. Bao mat va phan quyen

- Khong goi Google API truc tiep tu frontend.
- Khong commit `.env`, service account JSON, refresh token.
- Cloudflare Worker giu secrets.
- CORS chi cho phep domain frontend.
- Rate limit API quan trong.
- Role-based access control:
  - Admin: full access.
  - Sales: tao/sua don, khach hang.
  - Kho: san pham, ton kho, nhap hang.
  - Viewer: chi doc bao cao/demo.
- Audit log cho thao tac ghi.
- Demo public dung dataset rieng, khong dung du lieu that.

## 10. Lo trinh thuc hien

### Giai doan 1: Foundation

- Tao repo GitHub.
- Khoi tao Vite React TypeScript.
- Tao Cloudflare Worker TypeScript.
- Setup GitHub Pages deploy.
- Setup Cloudflare DNS/custom domain.
- Tao Google Spreadsheet schema.
- Tao Worker repository layer doc/ghi Google Sheets.

Ket qua: frontend public goi API health check va doc duoc data mau.

### Giai doan 2: Core CRUD

- Products CRUD.
- Customers CRUD.
- Orders CRUD co order_items.
- Inventory movement khi tao/cap nhat don.
- Basic auth va roles.

Ket qua: team co the quan ly san pham, khach, don hang that.

### Giai doan 3: Dashboard va bao cao

- Dashboard KPI.
- Bao cao doanh thu.
- Bao cao san pham ban chay/ton thap.
- Loc theo thoi gian.
- Export CSV.

Ket qua: project nhin nhu san pham quan tri hoan chinh.

### Giai doan 4: Portfolio polish

- Demo mode voi seed data.
- README chuyen nghiep.
- Architecture diagram.
- Screenshots/GIF.
- Test mot so API va component quan trong.
- Error/loading/empty states.
- Lighthouse/performance/accessibility check.

Ket qua: san pham san sang dua vao CV/GitHub/portfolio.

### Giai doan 5: Nang cap neu can

- Upload anh san pham len Google Drive.
- Hoa don PDF.
- Import Excel/CSV.
- Ket noi Zalo/Facebook hoac webhook ban hang.
- Chuyen database sang Cloudflare D1 neu vuot gioi han Sheets.

## 11. Cau truc repo de xuat

```
artflow-sales/
  apps/
    web/
      src/
        components/
        features/
        pages/
        services/
        hooks/
        styles/
    api/
      src/
        routes/
        repositories/
        services/
        middleware/
        schemas/
  docs/
    architecture.md
    database-schema.md
    api-contract.md
  scripts/
    seed-sheets.ts
    export-backup.ts
  README.md
```

## 12. Tieu chi hoan thanh MVP

- Public frontend truy cap duoc qua custom domain.
- Login duoc cho admin/team.
- CRUD san pham, khach hang, don hang chay on dinh.
- Tao don hang lam thay doi ton kho.
- Dashboard hien so lieu dung tu Google Sheets.
- Co demo data cho nha tuyen dung.
- Secrets khong bi lo tren client/repo.
- README co kien truc, link demo, anh man hinh, huong dan chay local.

## 13. Rui ro va cach giam

- Google Sheets cham khi du lieu lon:
  - Cache doc bang Cloudflare Worker.
  - Phan trang va chi doc range can thiet.
  - Sau nay doi repository sang D1.

- Xung dot khi nhieu nguoi ghi cung luc:
  - Moi ghi qua Worker.
  - Dung updated_at/version de tranh ghi de.
  - Audit log moi thay doi.

- Lo du lieu that khi public:
  - Tach demo spreadsheet va production spreadsheet.
  - Frontend demo chi goi demo API.
  - Admin API can login.

- Bi spam API:
  - Rate limit.
  - Turnstile cho form public neu can.
  - Cloudflare WAF rules co ban.

## 14. Nguon tham khao chinh

- GitHub Pages custom domain va publish source: https://docs.github.com/en/pages
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Google Drive API: https://developers.google.com/workspace/drive/api/guides/about-sdk
- Google Sheets API: https://developers.google.com/workspace/sheets/api/guides/concepts
