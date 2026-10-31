# Referensi API Backend — FE POS App

Dokumen ini memetakan **seluruh panggilan HTTP** yang dilakukan aplikasi frontend (`src/services/*`) ke endpoint backend (`BE-POS-App`). Gunakan dokumen ini saat menelusuri dari layar → service → endpoint, atau saat endpoint backend berubah.

> **Checkpoint:** FE `ab03f3ab`; BE `c9fe118` (2026-10-23). Backend endpoint count is documented in `BE-POS-App/API_DOCUMENTATION.md` (544 route handlers + 3 inline routes).

**Sumber kebenaran:** kode di `src/services/` (dokumen ini dihasilkan dari pemindaian seluruh panggilan `axiosInstance.*`). Bila ada perbedaan dengan backend, kode BE adalah sumber kebenaran.

## Konfigurasi HTTP (`src/services/index.js`)

- **Base URL:** `VITE_BASE_URL` (contoh: `https://api-bisa-nota.vercel.app`).
- **Auth:** header `Authorization: Bearer <token>` disuntik otomatis dari token sesi (cookie) pada setiap request.
- **Injeksi store otomatis:**
  - `super_admin`: store dari cookie `activeStore` disuntikkan ke query (GET) atau body (mutasi) **hanya bila** store sudah dipilih dan payload belum membawa scope store sendiri.
  - Non-super-admin: `store` **wajib** dan selalu disuntikkan dari store user (cookie `user`), fallback ke `activeStore`.
  - Opt-out per-request: set `skipStoreInjection: true` pada config axios (untuk endpoint strict-schema).
- **Sesi berakhir:** request baru dibatalkan (`CanceledError`) saat sesi sedang diakhiri, kecuali request revokasi logout.

## Cara membaca entri

Setiap entri berisi:

- **Service** — file & fungsi di FE yang memanggil endpoint.
- **Dikirim** — query/body yang jelas terlihat dari kode service.
- **Dipakai** — bentuk data yang dikembalikan service ke pemanggil.
- **Catatan** — konfigurasi khusus (blob, upload, path dinamis, dsb).

Dokumen terkait:

- `docs/api-response-contracts.md` — kontrak response ERP/akuntansi (envelope, kode error) yang harus diandalkan FE.
- `../../BE-POS-App/docs/order-create-client-contract.md` — siklus hidup idempotency key `POST /order/create`.
- `../../BE-POS-App/API_DOCUMENTATION.md` (repo BE) — katalog lengkap endpoint + contoh response dari sisi backend.

---

## Supplier

### GET `/supplier`
- **Service:** `src/services/supplier.js` → `getAllSupplier(payload)`
- **Dikirim:** query `page` (default 1), `limit` (default 10), `search` (default `""`), `store` (default `""`); `status` hanya bila `payload.status` ada dan ≠ `"all"`; `includeProducts=true` bila `payload.includeProducts`
- **Dipakai:** `res.data` (body apa adanya)
- **Catatan:** —
---

### POST `/supplier`
- **Service:** `src/services/supplier.js` → `addSupplier(payload)`
- **Dikirim:** body `payload` apa adanya (key tidak dibaca di service)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/supplier/${payload.id}`
- **Service:** `src/services/supplier.js` → `editSupplier(payload)`
- **Dikirim:** path `id` (dibaca dari `payload.id`); body `payload` utuh (termasuk `id`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### DELETE `/supplier/${payload.id}`
- **Service:** `src/services/supplier.js` → `deleteSupplier(payload)`
- **Dikirim:** path `id` (dari `payload.id`); tanpa body
- **Dipakai:** `res.data`
- **Catatan:** sukses 200/201/204; selain itu `throw Error(data?.error)`
---

### GET `/supplier/${payload.id}`
- **Service:** `src/services/supplier.js` → `getSupplierById(payload)`
- **Dikirim:** path `id` (dari `payload.id`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/supplier/detail/${payload.id}`
- **Service:** `src/services/supplier.js` → `getSupplierDetail(payload)`
- **Dikirim:** path `id` (dari `payload.id`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `(dinamis)` — unduhan `.xlsx`
- **Service:** `src/services/supplier.js` → helper `downloadBlob(url, filename)`; dipakai oleh `downloadSupplierTemplate()`, `downloadSupplierExcel()`, `downloadSupplierProductTemplate(supplierId)`
- **Dikirim:** query `supplier` hanya pada `downloadSupplierProductTemplate` (bila `supplierId` diisi); lainnya tanpa param
- **Dipakai:** tidak ada nilai kembali — memicu unduhan file di browser
- **Catatan:** `responseType: 'arraybuffer'`; blob MIME xlsx; endpoint: `/supplier/template`, `/supplier/download`, `/supplier/product-template`; nama file: `template-supplier.xlsx`, `<timestamp>-suppliers.xlsx`, `template-supplier-product.xlsx`; (path dibangun dinamis)
---

### POST `/supplier/import`
- **Service:** `src/services/supplier.js` → `uploadSupplierExcel(file)`
- **Dikirim:** body FormData `file`
- **Dipakai:** `res.data` (hasil impor)
- **Catatan:** header `Content-Type: multipart/form-data`
---

### POST `/supplier/${id}/import-products`
- **Service:** `src/services/supplier.js` → `importSupplierProducts({ id, file })`
- **Dikirim:** path `id`; body FormData `file`
- **Dipakai:** `res.data`
- **Catatan:** header `Content-Type: multipart/form-data`
---

### GET `/supplier-category`
- **Service:** `src/services/supplier.js` → `getAllSupplierCategories(params = {})`
- **Dikirim:** query `page` (default 1), `limit` (default 50); `search` bila diisi; `status` bila diisi dan ≠ `"all"`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/supplier-category/${id}`
- **Service:** `src/services/supplier.js` → `getSupplierCategoryById({ id })`
- **Dikirim:** path `id`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/supplier-category`
- **Service:** `src/services/supplier.js` → `addSupplierCategory(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/supplier-category/${id}`
- **Service:** `src/services/supplier.js` → `editSupplierCategory({ id, ...payload })`
- **Dikirim:** path `id`; body sisa `payload` tanpa `id`
- **Dipakai:** `res.data`
- **Catatan:** `id` dikeluarkan dari body (destructuring)
---

### DELETE `/supplier-category/${id}`
- **Service:** `src/services/supplier.js` → `deleteSupplierCategory({ id })`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** sukses 200/201/204; selain itu `throw Error(data?.error || data?.message)`
---

### GET `/supplier-contact/supplier/${supplierId}`
- **Service:** `src/services/supplier.js` → `getSupplierContacts(supplierId)`
- **Dikirim:** path `supplierId`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/supplier-contact/supplier/${supplierId}`
- **Service:** `src/services/supplier.js` → `addSupplierContact({ supplierId, ...payload })`
- **Dikirim:** path `supplierId`; body sisa `payload` tanpa `supplierId`
- **Dipakai:** `res.data`
- **Catatan:** `supplierId` dikeluarkan dari body (destructuring)
---

### PUT `/supplier-contact/${id}`
- **Service:** `src/services/supplier.js` → `editSupplierContact({ id, ...payload })`
- **Dikirim:** path `id`; body sisa `payload` tanpa `id`
- **Dipakai:** `res.data`
- **Catatan:** `id` dikeluarkan dari body (destructuring)
---

### DELETE `/supplier-contact/${id}`
- **Service:** `src/services/supplier.js` → `deleteSupplierContact({ id })`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** sukses 200/201/204; selain itu `throw Error(data?.error || data?.message)`
---

### GET `/supplier-bank-account/supplier/${supplierId}`
- **Service:** `src/services/supplier.js` → `getSupplierBankAccounts(supplierId)`
- **Dikirim:** path `supplierId`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/supplier-bank-account/supplier/${supplierId}`
- **Service:** `src/services/supplier.js` → `addSupplierBankAccount({ supplierId, ...payload })`
- **Dikirim:** path `supplierId`; body sisa `payload` tanpa `supplierId`
- **Dipakai:** `res.data`
- **Catatan:** `supplierId` dikeluarkan dari body (destructuring)
---

### PUT `/supplier-bank-account/${id}`
- **Service:** `src/services/supplier.js` → `editSupplierBankAccount({ id, ...payload })`
- **Dikirim:** path `id`; body sisa `payload` tanpa `id`
- **Dipakai:** `res.data`
- **Catatan:** `id` dikeluarkan dari body (destructuring)
---

### DELETE `/supplier-bank-account/${id}`
- **Service:** `src/services/supplier.js` → `deleteSupplierBankAccount({ id })`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** sukses 200/201/204; selain itu `throw Error(data?.error || data?.message)`
---


## Produk

### GET `/product/get-by-id/${id}`
- **Service:** `src/services/product.js` → `getProductById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/order/customer-reviews`
- **Service:** `src/services/product.js` → `getProductReviews(id)`
- **Dikirim:** query `productId`
- **Dipakai:** `res.data.data` (hanya isi `data`)
- **Catatan:** endpoint modul order, ditulis di service product
---

### GET `/product/get-product`
- **Service:** `src/services/product.js` → `getAllProduct({ location, nameProduct, category, status } = {})`
- **Dikirim:** query `store` (dari `location`), `nameProduct`, `category`, `status` — masing-masing hanya bila diisi (objek `params`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/product/get-product-by-super-admin`
- **Service:** `src/services/product.js` → `getProductByOutlet({ location, search, page })`
- **Dikirim:** query `limit="500"` (selalu); `store` (dari `location`), `search`, `page` — hanya bila diisi (page bila ≠ null)
- **Dipakai:** `res.data`
- **Catatan:** `limit` dipatok 500 (default endpoint 200 baris per komentar F7-02); dipaginasi oleh `getFullProductCatalog` (loop maks 10 halaman, menggabungkan `data`, memakai `pagination.hasMore`). `search` di BE mencocokkan `nameProduct`, `sku` **atau `barcode`** (BE #283) — dipakai juga oleh lookup barcode live kasir (`lookupProductRemote`). `CashierPage` memakai `keepPreviousData` dan menandai hasil dengan toko pemiliknya (`forStore`), jadi kotak cari tidak di-unmount saat hasil baru dimuat dan katalog toko lain tidak pernah tampil saat ganti toko (FE #292)
---

### GET `/ingredient/get-all`
- **Service:** `src/services/product.js` → `getIngredients({ store, search } = {})`
- **Dikirim:** query `limit="500"`, `status="active"` (selalu); `store`, `search` hanya bila diisi
- **Dipakai:** `res.data`
- **Catatan:** endpoint modul ingredient, dibungkus di service product
---

### GET `/product/get-product-all`
- **Service:** `src/services/product.js` → `getAllProductTable({ location, limit, page, statusProduct, search, category, sort })`
- **Dikirim:** query `store` (dari `location`), `page`, `limit`, `status` (dari `statusProduct`) — selalu; `search`, `category`, `sort` — hanya bila diisi
- **Dipakai:** `res.data`
- **Catatan:** URL dirakit bertahap dari string (path dibangun dinamis); `search`/`category` di-`encodeURIComponent`
---

### POST `/product/add-product`
- **Service:** `src/services/product.js` → `addProduct(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** nama produk unik **per tenant** (pemilik `stores` yang dipilih), bukan global: bentrok → `409 { code: "NAME_TAKEN", field: "nameProduct", message: "Product with this name already exists." }` (sebelumnya 400 dan global). Produk tanpa `stores` dicek terhadap semua produk.
---

### PUT `/product/edit-product`
- **Service:** `src/services/product.js` → `editProduct(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### DELETE `/product/delete-product/${payload.id}`
- **Service:** `src/services/product.js` → `deleteProduct(payload)`
- **Dikirim:** path `id` (dari `payload.id`); body `payload` (dikirim lewat `config.data` — DELETE berbody)
- **Dipakai:** `res.data`
- **Catatan:** sukses hanya 200; selain itu `throw Error(data?.error)`
---

### GET `(dinamis)` — unduhan `.xlsx`
- **Service:** `src/services/product.js` → helper `downloadBlob(url, filename)`; dipakai oleh `downloadProductTemplate()`, `downloadProductExcel()`
- **Dikirim:** tanpa param
- **Dipakai:** tidak ada nilai kembali — memicu unduhan file di browser
- **Catatan:** `responseType: 'arraybuffer'`; blob MIME xlsx; endpoint: `/product/template`, `/product/download`; nama file: `template-produk.xlsx`, `<timestamp>-products.xlsx`; (path dibangun dinamis)
---

### POST `/product/import`
- **Service:** `src/services/product.js` → `uploadProductExcel(file)`
- **Dikirim:** body FormData `file`
- **Dipakai:** `res.data` (hasil impor)
- **Catatan:** header `Content-Type: multipart/form-data`
---


## Bahan Baku (Ingredient)

### GET `/ingredient/get-by-id/${id}`
- **Service:** `src/services/ingredient.js` → `getIngredientById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/ingredient/add`
- **Service:** `src/services/ingredient.js` → `addIngredient(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/ingredient/edit/${id}`
- **Service:** `src/services/ingredient.js` → `editIngredient(id, payload)`
- **Dikirim:** path `id`; body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### DELETE `/ingredient/delete/${id}`
- **Service:** `src/services/ingredient.js` → `deleteIngredient(id)`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** sukses 200/204
---

### PUT `/ingredient/adjust-stock/${id}`
- **Service:** `src/services/ingredient.js` → `adjustIngredientStock(id, payload)`
- **Dikirim:** path `id`; body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `(dinamis)` — unduhan `.xlsx`
- **Service:** `src/services/ingredient.js` → helper `downloadBlob(url, filename)`; dipakai oleh `downloadIngredientTemplate()`, `downloadIngredientExcel()`
- **Dikirim:** tanpa param
- **Dipakai:** tidak ada nilai kembali — memicu unduhan file di browser
- **Catatan:** `responseType: 'arraybuffer'`; blob MIME xlsx; endpoint: `/ingredient/download-template`, `/ingredient/download`; nama file: `template-bahan-baku.xlsx`, `<timestamp>-bahan-baku.xlsx`; (path dibangun dinamis)
---

### GET `/ingredient/stock-summary`
- **Service:** `src/services/ingredient.js` → `getIngredientStockSummary({ store, startDate, endDate })`
- **Dikirim:** query `store` (kecuali `"all"`), `startDate`, `endDate` (`YYYY-MM-DD`) — masing-masing hanya bila diisi
- **Dipakai:** `res.data` (`data.items[]` per bahan + `data.menuSold[]`)
- **Catatan:** status selain 200 → `throw Error(data.message)`
---

### GET `/ingredient/product-names`
- **Service:** `src/services/ingredient.js` → `getProductNamesByFilters({ store, category, supplier })`
- **Dikirim:** query `store`, `category`, `supplier` — masing-masing hanya bila diisi
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/ingredient/import`
- **Service:** `src/services/ingredient.js` → `uploadIngredientExcel(payload)`
- **Dikirim:** body `payload` apa adanya (dari pemanggil)
- **Dipakai:** `res.data`
- **Catatan:** header `Content-Type: multipart/form-data`
---


## Kategori Produk (Category)

### GET `/category/get-category-all`
- **Service:** `src/services/category.js` → `getAllCategory()`
- **Dikirim:** query tetap `page=1`, `limit=100`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/category/add-new-category`
- **Service:** `src/services/category.js` → `addCategory(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** nama kategori unik **per tenant** (toko di `store`): bentrok → `409 { code: "NAME_TAKEN", field: "name", message: "Category Sudah Terdaftar" }` (sebelumnya 403 dan global — jangan diperlakukan sebagai error izin)
---

### PUT `/category/edit-category/${payload.get("id")}`
- **Service:** `src/services/category.js` → `editCategory(payload)`
- **Dikirim:** path `id` (dibaca via `payload.get("id")` — payload FormData); body `payload` utuh (FormData)
- **Dipakai:** `res.data`
- **Catatan:** body FormData; error: `data.message || data?.error`. Ganti nama dicek dalam tenant kategori itu: bentrok → `409 NAME_TAKEN` `"Kategori Sudah Tersedia"` (sebelumnya 403)
---

### GET `/category/get-category/${payload.id}`
- **Service:** `src/services/category.js` → `getCategoryById(payload)`
- **Dikirim:** path `id` (dari `payload.id`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### DELETE `/category/delete-category/${payload.id}`
- **Service:** `src/services/category.js` → `deleteCategory(payload)`
- **Dikirim:** path `id` (dari `payload.id`); body `payload` (dikirim lewat `config.data` — DELETE berbody)
- **Dipakai:** `res.data`
- **Catatan:** sukses hanya 200; selain itu `throw Error(data?.error)`
---

### GET `(dinamis)` — unduhan `.xlsx`
- **Service:** `src/services/category.js` → helper `downloadBlob(url, filename)`; dipakai oleh `downloadExcel()`, `downloadTemplate()`
- **Dikirim:** tanpa param
- **Dipakai:** tidak ada nilai kembali — memicu unduhan file di browser
- **Catatan:** `responseType: 'arraybuffer'`; blob MIME xlsx; endpoint: `/category/download`, `/category/download-template`; nama file: `<timestamp>-category.xlsx`, `template-kategori.xlsx`; (path dibangun dinamis)
---

### POST `/category/upload-excel`
- **Service:** `src/services/category.js` → `uploadExcel(payload)`
- **Dikirim:** body `payload` apa adanya (dari pemanggil)
- **Dipakai:** `res.data`
- **Catatan:** header `Content-Type: multipart/form-data`
---


## Promo

### GET `/promo/campaigns`
- **Service:** `src/services/promo.js` → `getCampaigns({ store, page = 1, limit = 10, search, status, type } = {})`
- **Dikirim:** query `page`, `limit` (selalu); `store`, `search` bila diisi; `status` bila diisi dan ≠ `"all"`; `type` bila diisi dan ≠ `"all"`
- **Dipakai:** `res.data` (body apa adanya, via `.then`)
- **Catatan:** tanpa pengecekan status manual — error HTTP menjadi rejected promise axios
---

### GET `/promo/campaigns/${id}`
- **Service:** `src/services/promo.js` → `getCampaignById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `res.data.data` bila ada, fallback `res.data`
- **Catatan:** —
---

### GET `/promo/campaigns/stats`
- **Service:** `src/services/promo.js` → `getCampaignStats({ store } = {})`
- **Dikirim:** query `store` bila diisi
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/promo/campaigns`
- **Service:** `src/services/promo.js` → `createCampaign(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/promo/campaigns/${id}`
- **Service:** `src/services/promo.js` → `updateCampaign(id, payload)`
- **Dikirim:** path `id`; body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/promo/campaigns/${id}/status`
- **Service:** `src/services/promo.js` → `updateCampaignStatus(id, { status })`
- **Dikirim:** path `id`; body `{ status }` (hanya key `status`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### DELETE `/promo/campaigns/${id}`
- **Service:** `src/services/promo.js` → `deleteCampaign(id)`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** —
---


## Auth & User

### POST `/auth/login`
- **Service:** `src/services/auth.js` → `login(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/auth/register`
- **Service:** `src/services/auth.js` → `register(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** endpoint yang sama juga dipakai `createUser()` di `src/services/user.js`
---

### POST `/auth/reset-password/request`
- **Service:** `src/services/auth.js` → `requestResetPassword(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** error: `throw Error(data?.error)`
---

### POST `/auth/reset-password`
- **Service:** `src/services/auth.js` → `resetPassword(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** error: `throw Error(data?.error)`
---

### POST `/auth/logout`
- **Service:** `src/services/auth.js` → `logOut(payload, config)`
- **Dikirim:** body `payload` (boleh `undefined`); `config` axios dari argumen kedua diteruskan apa adanya
- **Dipakai:** `res.data`
- **Catatan:** pemanggil internal `session.js` mengirim config `{ timeout, sessionRevocation: true }`
---

### PUT `/auth/edit-user`
- **Service:** `src/services/auth.js` → `editProfile(payload)`
- **Dikirim:** body FormData yang dibangun dari `payload` (entri bernilai `undefined`/`null` dilewati; `Blob` dipertahankan, lainnya `String`)
- **Dipakai:** `res.data`
- **Catatan:** body multipart FormData (header diatur otomatis oleh axios); error: `data?.error || data?.message`
---

### GET `/auth/context`
- **Service:** `src/services/auth.js` → `getAuthContext()`
- **Dikirim:** tanpa param
- **Dipakai:** `res.data` — seluruh body: `{ message, data: { session, context } }` (per komentar kode)
- **Catatan:** —
---

### GET `/auth/get-user`
- **Service:** `src/services/user.js` → `getUserByLocation(payload)`
- **Dikirim:** query `location` (dari `payload.location`)
- **Dipakai:** `res.data`
- **Catatan:** argumen `payload` utuh juga dilewatkan sebagai config axios
---

### GET `/auth/get-all-user`
- **Service:** `src/services/user.js` → `getAllUsers({ page = 1, limit = 10, search = "" })`
- **Dikirim:** query `page`, `limit`, `search`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/auth/change-profile-user`
- **Service:** `src/services/user.js` → `changeRoleUser(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/auth/change-user-status`
- **Service:** `src/services/user.js` → `changeUserStatus(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---


## Kategori Bahan Baku (Ingredient Category)

### GET `/ingredient-category/get-all`
- **Service:** `src/services/ingredientCategory.js` → `getAllIngredientCategory(params = {})`
- **Dikirim:** query `limit=999` (selalu); `store`, `supplier` — hanya bila diisi
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/ingredient-category/add`
- **Service:** `src/services/ingredientCategory.js` → `addIngredientCategory(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/ingredient-category/get-by-id/${id}`
- **Service:** `src/services/ingredientCategory.js` → `getIngredientCategoryById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/ingredient-category/edit/${payload.id}`
- **Service:** `src/services/ingredientCategory.js` → `editIngredientCategory(payload)`
- **Dikirim:** path `id` (dari `payload.id`); body `payload` utuh (termasuk `id`)
- **Dipakai:** `res.data`
- **Catatan:** error: `data.message || data?.error`
---

### DELETE `/ingredient-category/delete/${id}`
- **Service:** `src/services/ingredientCategory.js` → `deleteIngredientCategory(id)`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** sukses hanya 200; selain itu `throw Error(data?.error)`
---

### GET `(dinamis)` — unduhan `.xlsx`
- **Service:** `src/services/ingredientCategory.js` → helper `downloadBlob(url, filename)`; dipakai oleh `downloadIngredientCategoryTemplate()`, `downloadIngredientCategoryExcel()`
- **Dikirim:** tanpa param
- **Dipakai:** tidak ada nilai kembali — memicu unduhan file di browser
- **Catatan:** `responseType: 'arraybuffer'`; blob MIME xlsx; endpoint: `/ingredient-category/template`, `/ingredient-category/download`; nama file: `ingredient-category-template.xlsx`, `<timestamp>-ingredient-categories.xlsx`; (path dibangun dinamis)
---

### POST `/ingredient-category/import`
- **Service:** `src/services/ingredientCategory.js` → `uploadIngredientCategoryExcel(file)`
- **Dikirim:** body FormData `file`
- **Dipakai:** `res.data` (hasil impor)
- **Catatan:** header `Content-Type: multipart/form-data`
---


## Order

### POST `/order/create`
- **Service:** `src/services/order.js` → `createOrder(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** sukses 200 (replay) / 201
---

### POST `/order/quote`
- **Service:** `src/services/order.js` → `quoteOrder(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/order/customer-tax-rate`
- **Service:** `src/services/order.js` → `getCustomerTaxRate(store)`
- **Dikirim:** query `store` (lewat `params: { store }`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/order/get-orders`
- **Service:** `src/services/order.js` → `getOrdersByStore(payload)`
- **Dikirim:** query `store` (dari `payload.location`), `page`, `limit`, `date`, `status`, `paymentStatus`, `startDate`, `endDate`, `cashRegisterId`, `window` — masing-masing hanya bila diisi
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/order/get-order/${id}`
- **Service:** `src/services/order.js` → `getOrderById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/order/update-status`
- **Service:** `src/services/order.js` → `updateOrderStatus(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---


## Transfer Stok (Stock Transfer)

### POST `/pos/transfer`
- **Service:** `src/services/stock-transfer.js` → `transferStock(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/pos/transfer-history`
- **Service:** `src/services/stock-transfer.js` → `getTransferHistory({ store, page = 1, limit = 10, search, status: filterStatus } = {})`
- **Dikirim:** query `store`, `page` (default 1), `limit` (default 10), `search`, `status` (dari `filterStatus`) — hanya bila nilainya truthy
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/pos/transfer/${id}`
- **Service:** `src/services/stock-transfer.js` → `getTransferById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/pos/transfer/${id}/receive`
- **Service:** `src/services/stock-transfer.js` → `receiveStockTransfer(id)`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/pos/transfer/${id}/cancel`
- **Service:** `src/services/stock-transfer.js` → `cancelStockTransfer(id)`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** —
---


## Tukar Shift (Shift Swap)

### GET `/shift-swap/get-swap`
- **Service:** `src/services/shiftSwap.js` → `getShiftSwaps({ store, page, pageSize, status, mine, from, to })`
- **Dikirim:** query `store`, `page`, `pageSize`, `status`, `mine`, `from`, `to` — masing-masing hanya bila diisi
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/shift-swap/update-swap-status/${id}`
- **Service:** `src/services/shiftSwap.js` → `updateShiftSwapStatus({ id, status })`
- **Dikirim:** path `id`; body `{ status }` (hanya key `status`)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### PUT `/shift-swap/cancel/${id}`
- **Service:** `src/services/shiftSwap.js` → `cancelShiftSwap({ id })`
- **Dikirim:** path `id`; tanpa body
- **Dipakai:** `res.data`
- **Catatan:** —
---

### POST `/shift-swap/create-swap`
- **Service:** `src/services/shiftSwap.js` → `createShiftSwap(payload)`
- **Dikirim:** body `payload` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** —
---


## Tenant

### GET `/tenants`
- **Service:** `src/services/tenant.js` → `getTenants({ page = 1, limit = 20, search, status } = {})`
- **Dikirim:** query `page`, `limit` (selalu); `search` bila diisi; `status` bila diisi dan ≠ `"all"`
- **Dipakai:** `res.data`
- **Catatan:** tanpa pengecekan status manual — error HTTP menjadi rejected promise axios
---

### POST `/tenants`
- **Service:** `src/services/tenant.js` → `createTenant({ code, name })`
- **Dikirim:** body `{ code, name }` (hanya kedua key itu)
- **Dipakai:** `res.data`
- **Catatan:** tanpa pengecekan status manual
---

### PATCH `/tenants/${id}`
- **Service:** `src/services/tenant.js` → `updateTenant(id, changes)`
- **Dikirim:** path `id`; body `changes` apa adanya
- **Dipakai:** `res.data`
- **Catatan:** tanpa pengecekan status manual
---


## Dashboard

### GET `/pos/dashboard/summary`
- **Service:** `src/services/dashboard.js` → `getDashboardSummary(params = {})`
- **Dikirim:** query = seluruh entri `params` yang nilainya bukan `null`/`undefined`/string kosong (key tidak dibaca di service)
- **Dipakai:** `res.data`
- **Catatan:** —
---

### GET `/pos/dashboard/super-admin`
- **Service:** `src/services/dashboard.js` → `getSuperAdminDashboard(params = {})`
- **Dikirim:** query = seluruh entri `params` yang nilainya bukan `null`/`undefined`/string kosong (key tidak dibaca di service)
- **Dipakai:** `res.data`
- **Catatan:** —
---


### DELETE `/tenants/${id}`
- **Service:** `src/services/tenant.js` → `deleteTenant(id)`
- **Dikirim:** path `id`
- **Dipakai:** `res.data`
- **Catatan:** hanya tenant kosong (tanpa store, tanpa member aktif lain); selain itu BE 409 `TENANT_HAS_STORES` / `TENANT_HAS_MEMBERS`
---

## Export Laporan

### GET `/report/export/${key}`
- **Service:** `src/services/export.js` → `exportReport(key, { format, params = {}, filename = `${key}-report` })` (via helper `buildUrl` + `downloadBlob`)
- **Dikirim:** query `format` (selalu) + seluruh entri `params` yang nilainya bukan `undefined`/`null`/string kosong; `key` menjadi segmen path
- **Dipakai:** tidak ada nilai kembali — memicu unduhan file di browser
- **Catatan:** `responseType: 'arraybuffer'`; nama file dari header `content-disposition` server bila ada, fallback `${filename}.<ext>`; MIME per format (`excel` → `.xlsx`, `pdf`, `csv`); (path dibangun dinamis)
---


### GET `/report/data/${key}`
- **Service:** `src/services/reportData.js` → `getReportData(key, params = {})`
- **Dikirim:** query = seluruh entri `params` yang nilainya bukan `undefined`/`null`/string kosong; `key` menjadi segmen path
- **Dipakai:** `res.data.data` (`columns`, `rows`, `totals`, `title`, …) — kolom sama dengan export & `/report/settings`
- **Catatan:** status selain 200 → `throw Error(data.message)`
---

## Expense

### GET `/expense-category/get-all`
- **Service:** `src/services/expense.js` → `getExpenseCategories()`
- **Dikirim:** —
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### POST `/expense-category/add`
- **Service:** `src/services/expense.js` → `addExpenseCategory(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya; key tidak dirinci di service)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/expense-category/edit/:id`
- **Service:** `src/services/expense.js` → `editExpenseCategory(payload)`
- **Dikirim:** body = `payload`; segmen `:id` dari `payload.id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/expense-category/delete/:id`
- **Service:** `src/services/expense.js` → `deleteExpenseCategory(payload)`
- **Dikirim:** segmen `:id` dari `payload.id` (tanpa body)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); status sukses 200/201/204

---

### GET `/expense/get-all`
- **Service:** `src/services/expense.js` → `getAllExpenses(payload)`
- **Dikirim:** query `store` (dari `payload.location`, selalu dikirim — fallback `""`), `page`, `limit`, `search`, `status`, `categoryId`, `isActive`, `startDate`, `endDate` (opsional, hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis — query string dirakit via `URLSearchParams`)

---

### POST `/expense/add`
- **Service:** `src/services/expense.js` → `addExpense(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### POST `/expense/bulk-create`
- **Service:** `src/services/expense.js` → `bulkAddExpenses(items)`
- **Dikirim:** body `{ items }` — `items` dari argumen fungsi
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/expense/edit/:id`
- **Service:** `src/services/expense.js` → `editExpense(payload)`
- **Dikirim:** body = `payload`; segmen `:id` dari `payload.id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### PUT `/expense/approve/:id`
- **Service:** `src/services/expense.js` → `approveExpense(id)`
- **Dikirim:** segmen `:id` dari argumen `id` (tanpa body)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/expense/get-by-id/:id`
- **Service:** `src/services/expense.js` → `getExpenseById(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/expense/get-summary`
- **Service:** `src/services/expense.js` → `getExpenseSummary(payload)`
- **Dikirim:** query `store` (dari `payload.location`), `startDate`, `endDate` — ketiganya selalu dikirim (fallback `""`)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### PUT `/expense/reject/:id`
- **Service:** `src/services/expense.js` → `rejectExpense(id)`
- **Dikirim:** segmen `:id` dari argumen `id` (tanpa body)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### POST `/expense/generate-salary`
- **Service:** `src/services/expense.js` → `generateSalaryExpenses(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/expense/mark-paid/:id`
- **Service:** `src/services/expense.js` → `markExpensePaid(id, payload = {})`
- **Dikirim:** body = `payload` (default `{}` — tanpa key); segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### PUT `/expense/mark-unpaid/:id`
- **Service:** `src/services/expense.js` → `markExpenseUnpaid(id)`
- **Dikirim:** segmen `:id` dari argumen `id` (tanpa body)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### PUT `/expense/set-active/:id`
- **Service:** `src/services/expense.js` → `setExpenseActive(id, isActive)`
- **Dikirim:** body `{ isActive }`; segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/expense/upcoming-payments`
- **Service:** `src/services/expense.js` → `getUpcomingPayments(payload = {})`
- **Dikirim:** query `store` (dari `payload.location`), `days` (keduanya opsional — hanya bila truthy); tanda `?` hanya ditambahkan bila params berisi
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---


## Position

### GET `/position/get-position`
- **Service:** `src/services/position.js` → `getAllPosition()`
- **Dikirim:** —
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### GET `/position/get-position-all`
- **Service:** `src/services/position.js` → `getAllPositionTable({ page = 1, limit = 10, statusRole = "all", search = "" })`
- **Dikirim:** query `page` (default `1`), `limit` (default `10`), `status` (dari `statusRole`, default `all`), `search` (default `""`) — keempatnya selalu dikirim
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### POST `/position/add-new-position`
- **Service:** `src/services/position.js` → `addPosition(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/position/edit-position/:id`
- **Service:** `src/services/position.js` → `editPosition(payload)`
- **Dikirim:** body = `payload`; segmen `:id` dari `payload.id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); pesan error `data.message || data?.error`

---

### GET `/position/get-position/:id`
- **Service:** `src/services/position.js` → `getPositionById(payload)`
- **Dikirim:** segmen `:id` dari `payload.id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/position/get-position-by-department/:departmentId`
- **Service:** `src/services/position.js` → `getPositionByDepartment(departmentId)`
- **Dikirim:** segmen `:departmentId` dari argumen `departmentId`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/position/delete-position/:id`
- **Service:** `src/services/position.js` → `deletePosition(payload)`
- **Dikirim:** segmen `:id` dari `payload.id`; body = `payload` (dikirim lewat opsi `data`)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); body DELETE dikirim melalui opsi `data`

---

### GET `/position/download-template`
- **Service:** `src/services/position.js` → `downloadPositionTemplate()`
- **Dikirim:** —
- **Dipakai:** — (tidak mengembalikan nilai; memicu unduhan berkas `template-position.xlsx` di browser)
- **Catatan:** `responseType: "arraybuffer"`; respons dibungkus `Blob` (XLSX); gagal → `Error("Gagal download template")`

---

### GET `/position/download`
- **Service:** `src/services/position.js` → `downloadPositionExcel()`
- **Dikirim:** —
- **Dipakai:** — (tidak mengembalikan nilai; memicu unduhan berkas `data-position.xlsx` di browser)
- **Catatan:** `responseType: "arraybuffer"`; respons dibungkus `Blob` (XLSX); gagal → `Error("Gagal download data")`

---

### POST `/position/upload`
- **Service:** `src/services/position.js` → `uploadPositionExcel(file)`
- **Dikirim:** body FormData dengan field `file`
- **Dipakai:** seluruh `res.data`
- **Catatan:** header `Content-Type: multipart/form-data`

---


## Goods Receipt

### GET `/goods-receipt/get-all`
- **Service:** `src/services/goods-receipt.js` → `getAllGoodsReceipt(payload)`
- **Dikirim:** query `page`, `limit`, `status`, `poId`, `startDate`, `endDate`, `store`, `search` (semuanya opsional — hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis — `?` selalu ditambahkan meski params kosong)

---

### GET `/goods-receipt/get-by-id/:id`
- **Service:** `src/services/goods-receipt.js` → `getGoodsReceiptById(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/goods-receipt/export`
- **Service:** `src/services/goods-receipt.js` → `exportGoodsReceipt(payload)`
- **Dikirim:** query `status`, `store`, `startDate`, `endDate` (opsional — hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); tanpa `responseType` blob — respons JSON biasa, bukan unduhan berkas

---

### GET `/goods-receipt/by-po/:poId`
- **Service:** `src/services/goods-receipt.js` → `getGoodsReceiptByPO(poId)`
- **Dikirim:** segmen `:poId` dari argumen `poId`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### POST `/goods-receipt/create`
- **Service:** `src/services/goods-receipt.js` → `addGoodsReceipt(payload, files = [])`
- **Dikirim:** dua varian — (a) bila `files` berisi: multipart FormData dengan field `data` = `JSON.stringify(payload)` + satu field `file` per file; (b) tanpa file: body JSON = `payload`
- **Dipakai:** seluruh `res.data`
- **Catatan:** varian multipart memakai header `Content-Type: multipart/form-data`

---

### PUT `/goods-receipt/update/:id`
- **Service:** `src/services/goods-receipt.js` → `editGoodsReceipt(id, payload, files = [])`
- **Dikirim:** dua varian (sama seperti create) — (a) multipart FormData (`data` = JSON string payload, `file` per file); (b) tanpa file: body JSON = `payload`; segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); varian multipart memakai header `Content-Type: multipart/form-data`

---

### DELETE `/goods-receipt/delete/:id`
- **Service:** `src/services/goods-receipt.js` → `deleteGoodsReceipt(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); status sukses 200/204

---

### PATCH `/goods-receipt/status/:id`
- **Service:** `src/services/goods-receipt.js` → `changeGoodsReceiptStatus(id, status)`
- **Dikirim:** body `{ status }`; segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---


## Accounts Receivable

### GET `/accounts-receivable/list`
- **Service:** `src/services/accounts-receivable.js` → `getARList(payload = {})`
- **Dikirim:** query `page`, `limit`, `status`, `store`, `customerId`, `startDate`, `endDate` (semuanya opsional — hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis — `?` selalu ditambahkan)

---

### GET `/accounts-receivable/:id`
- **Service:** `src/services/accounts-receivable.js` → `getARById(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### POST `/accounts-receivable/create`
- **Service:** `src/services/accounts-receivable.js` → `createAR(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### POST `/accounts-receivable/:id/pay`
- **Service:** `src/services/accounts-receivable.js` → `recordARPayment(id, payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya); segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### PUT `/accounts-receivable/:id`
- **Service:** `src/services/accounts-receivable.js` → `updateAR(id, payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya); segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/accounts-receivable/:id`
- **Service:** `src/services/accounts-receivable.js` → `deleteAR(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); status sukses 200/204

---

### GET `/accounts-receivable/aging`
- **Service:** `src/services/accounts-receivable.js` → `getARAging()`
- **Dikirim:** —
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---


## Employee

### GET `/employee/get-employee`
- **Service:** `src/services/employee.js` → `getAllEmployee({ page = 1, limit = 10, search = "", location = "", position = "", status = "" } = {})`
- **Dikirim:** opsi axios `params`: `page`, `limit` (selalu); `search`, `location`, `position`, `status` (hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** tidak memeriksa status HTTP; respons kosong → `Error("No response")`

---

### POST `/employee/add-employee`
- **Service:** `src/services/employee.js` → `addEmployee(payload)`
- **Dikirim:** body FormData hasil `buildFormData(payload)` — semua entri `payload`; `undefined`/`null` dilewati; array → satu bagian per item; `Blob` dipertahankan; nilai lain dikonversi `String(value)`
- **Dipakai:** seluruh `res.data`
- **Catatan:** header tidak dikonfigurasi eksplisit (body berupa FormData)

---

### PUT `/employee/edit-employee`
- **Service:** `src/services/employee.js` → `editEmployee(payload)`
- **Dikirim:** body FormData hasil `buildFormData(payload)` (pola sama dengan add; id ikut di dalam payload); path tanpa segmen `:id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** pesan error `data.message || data?.error`

---

### GET `/employee/get-employee/:id`
- **Service:** `src/services/employee.js` → `getEmployeeById(payload)`
- **Dikirim:** segmen `:id` dari `payload.id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/employee/get-employee-detail/:employeeID`
- **Service:** `src/services/employee.js` → `getEmployeeDetail(employeeID)`
- **Dikirim:** segmen `:employeeID` dari argumen `employeeID`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/employee/delete-employee/:id`
- **Service:** `src/services/employee.js` → `deleteEmployee(payload)`
- **Dikirim:** segmen `:id` dari `payload.id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); status sukses 200/201/204

---

### GET `/auth/generate-employee-id`
- **Service:** `src/services/employee.js` → `generateEmployeeId()`
- **Dikirim:** —
- **Dipakai:** seluruh `res.data`
- **Catatan:** endpoint ber-prefix `/auth` meski service berada di `employee.js`

---


## Role

### GET `/role/get-role`
- **Service:** `src/services/role.js` → `getAllRole()`
- **Dikirim:** —
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### GET `/role/get-role-all`
- **Service:** `src/services/role.js` → `getAllRoleTable({ page = 1, limit = 10, statusRole = "all", search })`
- **Dikirim:** opsi axios `params`: `page`, `limit` (selalu); `status` (dari `statusRole`); `search` (hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** memakai opsi `params` axios (bukan string query manual)

---

### POST `/role/add-new-role`
- **Service:** `src/services/role.js` → `addRole(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/role/edit-role/:id`
- **Service:** `src/services/role.js` → `editRole(payload)`
- **Dikirim:** body = `payload`; segmen `:id` dari `payload.id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); pesan error `data.message || data?.error`

---

### DELETE `/role/delete-role/:id`
- **Service:** `src/services/role.js` → `deleteRole(payload)`
- **Dikirim:** segmen `:id` dari `payload.id`; body = `payload` (dikirim lewat opsi `data`)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); body DELETE dikirim melalui opsi `data`

---

### GET `/role/get-role-by-id/:id`
- **Service:** `src/services/role.js` → `getRoleById(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### PUT `/role/update-access-menu`
- **Service:** `src/services/role.js` → `updateAccessMenu(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---


## BOM

### GET `/bom/get-all`
- **Service:** `src/services/bom.js` → `getAllBom(payload)`
- **Dikirim:** query `page`, `limit`, `search` (opsional); `status` hanya bila diisi dan ≠ `all`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/bom/get-by-id/:id`
- **Service:** `src/services/bom.js` → `getBomById(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### GET `/bom/get-by-product/:productId`
- **Service:** `src/services/bom.js` → `getBomByProduct(productId)`
- **Dikirim:** segmen `:productId` dari argumen `productId`
- **Dipakai:** seluruh `res.data`; `null` bila 404
- **Catatan:** (path dibangun dinamis); 404 (BOM belum ada) ditangkap → `return null`; error lain dilempar; tanpa pemeriksaan status

---

### POST `/bom/add`
- **Service:** `src/services/bom.js` → `addBom(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/bom/edit/:id`
- **Service:** `src/services/bom.js` → `editBom(id, payload)`
- **Dikirim:** body = `payload`; segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/bom/delete/:id`
- **Service:** `src/services/bom.js` → `deleteBom(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); status sukses 200/204

---


## Product Bundle

### GET `/product-bundle/get-all`
- **Service:** `src/services/productBundle.js` → `getBundles(payload)`
- **Dikirim:** query `page`, `limit`, `store`, `status`, `search` (opsional — hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis — tanda `?` hanya bila params berisi)

---

### GET `/product-bundle/get-by-id/:id`
- **Service:** `src/services/productBundle.js` → `getBundleById(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### POST `/product-bundle/create`
- **Service:** `src/services/productBundle.js` → `createBundle(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/product-bundle/update/:id`
- **Service:** `src/services/productBundle.js` → `updateBundle(id, payload)`
- **Dikirim:** body = `payload`; segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/product-bundle/delete/:id`
- **Service:** `src/services/productBundle.js` → `deleteBundle(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); status sukses 200/204; gagal → `Error(data?.message || "Gagal menghapus bundle")`

---

### PATCH `/product-bundle/status/:id`
- **Service:** `src/services/productBundle.js` → `changeBundleStatus(id, status, extra = {})`
- **Dikirim:** body `{ status, ...extra }`; segmen `:id` dari argumen `id`
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---


## Overtime

### GET `/overtime/get-overtime`
- **Service:** `src/services/overtime.js` → `getOvertimes({ store, page, pageSize, status, mine, from, to } = {})`
- **Dikirim:** query `store`, `page`, `pageSize`, `status`, `mine`, `from`, `to` (masing-masing hanya bila truthy)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### POST `/overtime/create-overtime`
- **Service:** `src/services/overtime.js` → `createOvertime(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---

### PUT `/overtime/update-status/:id`
- **Service:** `src/services/overtime.js` → `updateOvertimeStatus({ id, status, note })`
- **Dikirim:** body `{ status, note }`; segmen `:id` dari properti `id` argumen
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### PUT `/overtime/cancel/:id`
- **Service:** `src/services/overtime.js` → `cancelOvertime({ id })`
- **Dikirim:** segmen `:id` dari properti `id` argumen (tanpa body)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis)

---

### POST `/overtime/post-payroll`
- **Service:** `src/services/overtime.js` → `postOvertimePayroll({ store, month })`
- **Dikirim:** body `{ store, month }`
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---


## Shift

### GET `/shift/get-shift`
- **Service:** `src/services/overtime.js` → `getOvertimeShiftOptions({ store })`
- **Dikirim:** query `store` (dari argumen), `page` = `1`, `pageSize` = `100`, `status` = `active` (tiga terakhir hardcoded di service)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); gabungan shift.js — endpoint yang sama juga dipanggil `getAllShift` di `src/services/shift.js` dengan query `store`, `page`, `pageSize` (= `limit`), `status` (= `statusShift`) dari argumennya

---

### GET `/shift/get-shift/:id`
- **Service:** `src/services/shift.js` → `getShiftById(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/shift/dropdown`
- **Service:** `src/services/shift.js` → `getShiftDropdown({ store, statusShift })`
- **Dikirim:** query `store`, `status` (dari `statusShift`) — selalu ditempel
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/shift/add-new-shift`
- **Service:** `src/services/shift.js` → `addShift(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/shift/edit-shift/:id`
- **Service:** `src/services/shift.js` → `editShift(payload)`
- **Dikirim:** body `payload`; `id` di path diambil dari `payload.id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** pesan error diambil dari `data.message || data?.error`

---

### DELETE `/shift/delete-shift/:id`
- **Service:** `src/services/shift.js` → `deleteShift(payload)`
- **Dikirim:** body `payload` (dikirim lewat opsi `{ data: payload }`); `id` di path diambil dari `payload.id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** DELETE dengan body; hanya status 200 diterima; pesan error dari `data?.error`

---


## Notification

### GET `/notification`
- **Service:** `src/services/notification.js` → `getAllNotifications(params = {})`
- **Dikirim:** opsi axios `params` = `params` (diteruskan apa adanya; key tidak dirinci di service)
- **Dipakai:** seluruh `res.data`
- **Catatan:** tanpa pemeriksaan status/error

---

### GET `/notification/unread`
- **Service:** `src/services/notification.js` → `getUnreadCount()`
- **Dikirim:** —
- **Dipakai:** seluruh `res.data`
- **Catatan:** tanpa pemeriksaan status/error

---

### PUT `/notification/:id/read`
- **Service:** `src/services/notification.js` → `markAsRead(id)`
- **Dikirim:** segmen `:id` dari argumen `id` (tanpa body)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis); tanpa pemeriksaan status/error

---

### PUT `/notification/read-all`
- **Service:** `src/services/notification.js` → `markAllAsRead()`
- **Dikirim:** —
- **Dipakai:** seluruh `res.data`
- **Catatan:** tanpa pemeriksaan status/error

---


## Supplier Performance

### GET `/supplier-performance/scores`
- **Service:** `src/services/supplierPerformance.js` → `getSupplierScores({ store, page = 1, limit = 10, search, period, grade } = {})`
- **Dikirim:** query `page`, `limit` (selalu — default `1`/`10`); `store`, `search` (bila truthy); `period`, `grade` (bila truthy dan ≠ `all`)
- **Dipakai:** `res.data` (dikembalikan langsung via `.then((r) => r.data)`)
- **Catatan:** (path dibangun dinamis); tanpa pemeriksaan status/error

---

### GET `/supplier-performance/scores/top`
- **Service:** `src/services/supplierPerformance.js` → `getTopSuppliers({ store, period = "all_time", limit = 5 } = {})`
- **Dikirim:** query `period` (default `all_time`), `limit` (default `5`) — selalu; `store` bila truthy
- **Dipakai:** `res.data` (dikembalikan langsung via `.then((r) => r.data)`)
- **Catatan:** (path dibangun dinamis); tanpa pemeriksaan status/error

---

### GET `/supplier-performance/scores/:id`
- **Service:** `src/services/supplierPerformance.js` → `getSupplierScoreById(id)`
- **Dikirim:** segmen `:id` dari argumen `id`
- **Dipakai:** `res.data` (dikembalikan langsung via `.then((r) => r.data)`)
- **Catatan:** (path dibangun dinamis); tanpa pemeriksaan status/error

---

### POST `/supplier-performance/scores/calculate`
- **Service:** `src/services/supplierPerformance.js` → `calculateSupplierScore(payload)`
- **Dikirim:** body = `payload` (diteruskan apa adanya)
- **Dipakai:** `res.data` (dikembalikan langsung via `.then((r) => r.data)`)
- **Catatan:** tanpa pemeriksaan status/error

---

### PUT `/supplier-performance/scores/:id/notes`
- **Service:** `src/services/supplierPerformance.js` → `updateSupplierScoreNote(id, { notes })`
- **Dikirim:** body `{ notes }`; segmen `:id` dari argumen `id`
- **Dipakai:** `res.data` (dikembalikan langsung via `.then((r) => r.data)`)
- **Catatan:** (path dibangun dinamis); tanpa pemeriksaan status/error

---


## Kitchen

### GET `/order/kitchen`
- **Service:** `src/services/kitchen.js` → `getKitchenOrders(params = {})`
- **Dikirim:** query = seluruh entri `params` via `new URLSearchParams(params)` (diteruskan apa adanya; key tidak dirinci di service)
- **Dipakai:** seluruh `res.data`
- **Catatan:** (path dibangun dinamis — `?` selalu ditambahkan)

---

### PUT `/order/update-item-status`
- **Service:** `src/services/kitchen.js` → `updateOrderItemStatus(id, itemId, itemStatus)`
- **Dikirim:** body `{ id, itemId, itemStatus }`
- **Dipakai:** seluruh `res.data`
- **Catatan:** —

---


## Audit Log

### GET `/audit-log`
- **Service:** `src/services/auditLog.js` → `getAuditLogs(params = {})`
- **Dikirim:** query = semua entri `params` yang bukan `undefined`/`null`/`""` (diteruskan apa adanya; key tidak dirinci di service)
- **Dipakai:** `response.data`
- **Catatan:** (path dibangun dinamis); tanpa pemeriksaan status/error

---


## Stock

### GET `/stock-history/get-all`
- **Service:** `src/services/stock.js` → `getAllStockHistory(payload)`
- **Dikirim:** query `page`, `limit`, `store`, `product`, `itemType`, `ingredient`, `referenceType`, `startDate`, `endDate` (kondisional — hanya bila terisi)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** `StockHistory.jsx` selalu mengirim `itemType` sesuai tab (`ingredient` default, `product`); `ingredient` hanya di tab Bahan Baku, `product` hanya di tab Produk. Butuh BE dengan filter `itemType` (BE #266). Kolom pertama **Toko** (sticky kiri) membaca `storeData.name` per baris — butuh BE yang menyertakan `storeData` (BE #268); tanpa itu tampil "-"

---

### GET `/stock-history/get-by-product/${productId}`
- **Service:** `src/services/stock.js` → `getStockHistoryByProduct(productId)`
- **Dikirim:** path `productId`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### GET `/stock-history/low-stock`
- **Service:** `src/services/stock.js` → `getLowStockProducts()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/stock-history/low-stock-all`
- **Service:** `src/services/stock.js` → `getLowStockAll(payload)`
- **Dikirim:** query `page`, `limit`, `store`, `type`, `search` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/stock-history/auto-generate-po`
- **Service:** `src/services/stock.js` → `autoGeneratePOFromLowStock(payload)`
- **Dikirim:** body = `payload` utuh; bila argumen kosong dikirim `{}`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/stock-opname/check-exists`
- **Service:** `src/services/stock.js` → `checkStockOpnameExists(store)`
- **Dikirim:** query `store` (nilai argumen `store`, selalu disertakan)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/stock-opname/composition-items`
- **Service:** `src/services/stock.js` → `getStockOpnameCompositionItems(store)`
- **Dikirim:** query `store` (nilai argumen `store`, selalu disertakan)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/stock-opname/get-all`
- **Service:** `src/services/stock.js` → `getStockOpname(payload)`
- **Dikirim:** query `page`, `limit`, `store` (dari `payload.location`), `status`, `search`, `startDate`, `endDate` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/stock-opname/get-by-id/${id}`
- **Service:** `src/services/stock.js` → `getStockOpnameById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### POST `/stock-opname/create`
- **Service:** `src/services/stock.js` → `addStockOpname(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/stock-opname/update/${id}`
- **Service:** `src/services/stock.js` → `updateStockOpname(id, payload)`
- **Dikirim:** path `id`; body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/stock-opname/delete/${id}`
- **Service:** `src/services/stock.js` → `deleteStockOpname(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); sukses 200/204; error `data?.message` (fallback `"Gagal menghapus"`)

---

### PATCH `/stock-opname/status/${id}`
- **Service:** `src/services/stock.js` → `changeStockOpnameStatus(id, status)`
- **Dikirim:** path `id`; body `{ status }`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### POST `/stock-opname/upload-excel`
- **Service:** `src/services/stock.js` → `uploadStockOpnameExcel(file, auditDate)`
- **Dikirim:** `FormData` — `file`, `auditDate` (opsional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** header `Content-Type: multipart/form-data`

---

### POST `/pos/adjust`
- **Service:** `src/services/stock.js` → `adjustStock(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/stock-opname/download-excel`
- **Service:** `src/services/stock.js` → `downloadStockOpnameTemplate()`
- **Dikirim:** —
- **Dipakai:** tidak ada return; efek samping unduh file `template-stock-opname.xlsx` (Blob → anchor)
- **Catatan:** `responseType: "arraybuffer"`

---

### POST `/stock-opname/export-selected`
- **Service:** `src/services/stock.js` → `exportStockOpnameByIds(ids)`
- **Dikirim:** body `{ ids }`
- **Dipakai:** tidak ada return; efek samping unduh file `data-stock-opname.xlsx` (Blob → anchor)
- **Catatan:** `responseType: "arraybuffer"`

---


## Department

### GET `/department/get-department`
- **Service:** `src/services/department.js` → `getAllDepartment()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/department/get-department-all`
- **Service:** `src/services/department.js` → `getAllDepartmentTable({ page = 1, limit = 10, statusRole = "all", search = "" })`
- **Dikirim:** query `page`, `limit`, `status` (dari `statusRole`), `search` — selalu dikirim (nilai default `1`, `10`, `"all"`, `""`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/department/add-new-department`
- **Service:** `src/services/department.js` → `addDepartment(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/department/edit-department/${payload.id}`
- **Service:** `src/services/department.js` → `editDepartment(payload)`
- **Dikirim:** path `payload.id`; body = `payload` utuh (masih memuat `id`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### GET `/department/get-department/${payload.id}`
- **Service:** `src/services/department.js` → `getDepartmentById(payload)`
- **Dikirim:** path `payload.id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/department/delete-department/${payload.id}`
- **Service:** `src/services/department.js` → `deleteDepartment(payload)`
- **Dikirim:** path `payload.id`; body = `payload` utuh dikirim via config axios `{ data: payload }`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); body DELETE lewat config `data`; error memakai field `data.error` (bukan `data.message`)

---

### GET `/department/download-template`
- **Service:** `src/services/department.js` → `downloadDepartmentTemplate()`
- **Dikirim:** —
- **Dipakai:** tidak ada return; efek samping unduh file `template-department.xlsx` (Blob → anchor)
- **Catatan:** `responseType: "arraybuffer"`

---

### GET `/department/download`
- **Service:** `src/services/department.js` → `downloadDepartmentExcel()`
- **Dikirim:** —
- **Dipakai:** tidak ada return; efek samping unduh file `data-department.xlsx` (Blob → anchor)
- **Catatan:** `responseType: "arraybuffer"`

---

### POST `/department/upload`
- **Service:** `src/services/department.js` → `uploadDepartmentExcel(file)`
- **Dikirim:** `FormData` — `file`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** header `Content-Type: multipart/form-data`

---


## Report

### GET `/report/sales-summary`
- **Service:** `src/services/report.js` → `getSalesSummary(payload = {})`
- **Dikirim:** query `store`, `filter` (dari `payload.period`) — kondisional
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/report/best-seller`
- **Service:** `src/services/report.js` → `getBestSellerReport(payload = {})`
- **Dikirim:** query `store` (selalu dikirim; string kosong bila tak ada), `startDate`, `endDate`, `limit` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/report/daily`
- **Service:** `src/services/report.js` → `getDailyReport(payload = {})`
- **Dikirim:** query `store`, `startDate`, `endDate` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/report/cash-flow`
- **Service:** `src/services/report.js` → `getCashFlow(payload = {})`
- **Dikirim:** query `store`, `startDate`, `endDate` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/report/profit-per-product`
- **Service:** `src/services/report.js` → `getProfitPerProduct(payload = {})`
- **Dikirim:** query `store`, `startDate`, `endDate` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/reports/sales-summary`
- **Service:** `src/services/report.js` → `getReportingSalesSummary(payload = {})`
- **Dikirim:** query `store`, `startDate`, `endDate`, `page`, `limit` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/reports/product-sales`
- **Service:** `src/services/report.js` → `getReportingProductSales(payload = {})`
- **Dikirim:** query `store`, `startDate`, `endDate`, `page`, `limit` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/reports/category-sales`
- **Service:** `src/services/report.js` → `getReportingCategorySales(payload = {})`
- **Dikirim:** query `store`, `startDate`, `endDate`, `page`, `limit` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/reports/kasir-performance`
- **Service:** `src/services/report.js` → `getReportingKasirPerformance(payload = {})`
- **Dikirim:** query `store`, `startDate`, `endDate`, `page`, `limit` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Backup

### GET `${url}`
- **Service:** `src/services/backup.js` → helper `downloadBlob(url, filename)`, dipakai `downloadMasterDataBackup()`
- **Dikirim:** path `url` (pemakai saat ini mengirim `/export/master-data`; tanpa query/body)
- **Dipakai:** `undefined` (tidak ada return; efek samping unduh file `backup-master-data-<timestamp>.xlsx`)
- **Catatan:** (path dibangun dinamis); `responseType: "arraybuffer"`

---

### POST `/backup/create`
- **Service:** `src/services/backup.js` → `createDatabaseBackup()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/backup/list`
- **Service:** `src/services/backup.js` → `getDatabaseBackups(params)`
- **Dikirim:** query `limit`, `offset` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/backup/download/${id}`
- **Service:** `src/services/backup.js` → `downloadDatabaseBackup(id, filename)`
- **Dikirim:** path `id`
- **Dipakai:** tidak ada return; efek samping unduh file bernama `filename` argumen (fallback `backup-${id}.dump`)
- **Catatan:** (path dibangun dinamis); `responseType: "arraybuffer"`

---

### POST `/backup/restore/${id}`
- **Service:** `src/services/backup.js` → `restoreDatabaseBackup(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/backup/delete/${id}`
- **Service:** `src/services/backup.js` → `deleteDatabaseBackup(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### GET `/backup/schedule`
- **Service:** `src/services/backup.js` → `getBackupSchedule()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/backup/schedule`
- **Service:** `src/services/backup.js` → `setBackupSchedule(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Member Tier

### GET `/member-tier/get-all`
- **Service:** `src/services/member-tier.js` → `getAllMemberTier(params = {})`
- **Dikirim:** query = `params` utuh (key ditentukan pemanggil; tidak diketahui di level service)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/member-tier/add`
- **Service:** `src/services/member-tier.js` → `addMemberTier(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/member-tier/edit/${payload.id}`
- **Service:** `src/services/member-tier.js` → `editMemberTier(payload)`
- **Dikirim:** path `payload.id`; body = `payload` utuh (masih memuat `id`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### GET `/member-tier/detail/${id}`
- **Service:** `src/services/member-tier.js` → `getDetailMemberTier(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/member-tier/delete/${payload.id}`
- **Service:** `src/services/member-tier.js` → `deleteMemberTier(payload)`
- **Dikirim:** path `payload.id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); error memakai field `data.error` (bukan `data.message`)

---

### GET `/member-tier/get-by-points`
- **Service:** `src/services/member-tier.js` → `getMemberTierByPoints(points)`
- **Dikirim:** query `points`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/member-tier/update-members`
- **Service:** `src/services/member-tier.js` → `updateAllMemberTiers()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Table

### GET `/table/get-tables`
- **Service:** `src/services/table.js` → `getTablesByStore(payload)`
- **Dikirim:** query `store` (dari `payload.location`, selalu dikirim; string kosong bila tak ada), `page`, `limit`, `search` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/table/get-availability`
- **Service:** `src/services/table.js` → `getTableAvailability(payload)`
- **Dikirim:** query `store` (dari `payload?.location || ""`, selalu dikirim)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/table/get-tables-with-orders`
- **Service:** `src/services/table.js` → `getTablesWithActiveOrders(payload)`
- **Dikirim:** query `store` (dari `payload?.location || ""`, selalu dikirim)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/table/create`
- **Service:** `src/services/table.js` → `addTable(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/table/update/${id}`
- **Service:** `src/services/table.js` → `editTable({ id, ...payload })`
- **Dikirim:** path `id`; body = sisa objek argumen setelah `id` dibuang (`id` tidak ikut body)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); error `data?.message || data?.error`

---

### PUT `/table/update-status/${id}`
- **Service:** `src/services/table.js` → `updateTableStatus(id, payload)`
- **Dikirim:** path `id`; body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); error `data?.message || data?.error`

---

### DELETE `/table/delete/${id}`
- **Service:** `src/services/table.js` → `deleteTable(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); sukses 200/201/204; error memakai `data.error`

---

### GET `/pos/tables/status`
- **Service:** `src/services/table.js` → `getCashierTables(storeId)`
- **Dikirim:** query `storeId`
- **Dipakai:** `res.data` (`data[]` meja + `unpaidOrders`, `canRelease`, `blockedReason`)
- **Catatan:** panel "Meja" kasir (BA C-16); status selain 200 → `throw Error(data.message)`
---

### PUT `/pos/tables/${id}/release`
- **Service:** `src/services/table.js` → `releaseCashierTable({ id, reason, storeId })`
- **Dikirim:** path `id`; body `{ reason }`; query `storeId`
- **Dipakai:** `res.data`
- **Catatan:** reason wajib; kasir ditolak 409 bila meja masih punya pesanan belum dibayar
---


## Business Trip

### GET `/business-trip/get-all`
- **Service:** `src/services/business-trip.js` → `getAllBusinessTrip(payload)`
- **Dikirim:** query `page`, `limit`, `status`, `search` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/business-trip/get-by-id/${id}`
- **Service:** `src/services/business-trip.js` → `getBusinessTripById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### POST `/business-trip/create`
- **Service:** `src/services/business-trip.js` → `addBusinessTrip(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/business-trip/update/${id}`
- **Service:** `src/services/business-trip.js` → `editBusinessTrip(id, payload)`
- **Dikirim:** path `id`; body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/business-trip/delete/${id}`
- **Service:** `src/services/business-trip.js` → `deleteBusinessTrip(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); sukses 200/204

---

### PATCH `/business-trip/status/${id}`
- **Service:** `src/services/business-trip.js` → `changeBusinessTripStatus(id, status)`
- **Dikirim:** path `id`; body `{ status }`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---


## Reservation

### GET `/reservation`
- **Service:** `src/services/reservation.js` → `getReservations({ page = 1, limit = 10, date, status, store } = {})`
- **Dikirim:** query `page`, `size` (dari param `limit`) — keduanya selalu dikirim (default `1` dan `10`); `date`, `status`, `store` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** tanpa cek status lokal (langsung `return data`)

---

### GET `/reservation/${id}`
- **Service:** `src/services/reservation.js` → `getReservationById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); tanpa cek status lokal

---

### POST `/reservation`
- **Service:** `src/services/reservation.js` → `createReservation(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** tanpa cek status lokal

---

### PUT `/reservation/${id}`
- **Service:** `src/services/reservation.js` → `updateReservation({ id, ...payload })`
- **Dikirim:** path `id`; body = sisa objek argumen setelah `id` dibuang
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); tanpa cek status lokal

---

### DELETE `/reservation/${id}`
- **Service:** `src/services/reservation.js` → `deleteReservation(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); tanpa cek status lokal

---

### GET `/reservation/available-tables/list`
- **Service:** `src/services/reservation.js` → `getAvailableTables({ date, startTime, endTime, store })`
- **Dikirim:** query `date` (selalu disertakan), `startTime`, `endTime`, `store` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** tanpa cek status lokal

---


## Split Bill

### POST `/split-bill/create`
- **Service:** `src/services/split-bill.js` → `createSplitBill(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/split-bill/get-by-order/${orderId}`
- **Service:** `src/services/split-bill.js` → `getSplitBillByOrder(orderId)`
- **Dikirim:** path `orderId`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### PUT `/split-bill/pay/${id}`
- **Service:** `src/services/split-bill.js` → `paySplitBill(id, payload)`
- **Dikirim:** path `id`; body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/split-bill/cancel/${id}`
- **Service:** `src/services/split-bill.js` → `cancelSplitBill(id, payload)`
- **Dikirim:** path `id`; body = `payload` utuh dikirim via config axios `{ data: payload }`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis); body DELETE lewat config `data`; sukses 200/204

---

### POST `/split-bill/merge`
- **Service:** `src/services/split-bill.js` → `mergeSplitBills(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Purchase Return

### GET `/purchase-return/get-all`
- **Service:** `src/services/purchase-return.js` → `getAllPurchaseReturn(payload)`
- **Dikirim:** query `page`, `limit`, `status`, `store`, `search`, `startDate`, `endDate`, `supplier` (semua kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/purchase-return/by-po/${poId}`
- **Service:** `src/services/purchase-return.js` → `getReturnsByPO(poId)`
- **Dikirim:** path `poId`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### GET `/purchase-return/get-by-id/${id}`
- **Service:** `src/services/purchase-return.js` → `getPurchaseReturnById(id)`
- **Dikirim:** path `id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### PATCH `/purchase-return/approve/${id}`
- **Service:** `src/services/purchase-return.js` → `approvePurchaseReturn({ id, resolution = "credit" })`
- **Dikirim:** path `id`; body `{ resolution }` (default `"credit"`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---

### PATCH `/purchase-return/reject/${id}`
- **Service:** `src/services/purchase-return.js` → `rejectPurchaseReturn(id)`
- **Dikirim:** path `id` (tanpa body)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** (path dibangun dinamis)

---


## Attendance

### POST `/attendance/clock`
- **Service:** `src/services/attendance.js` → `clockAttendance(payload)`
- **Dikirim:** body = `payload` utuh
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/attendance/my`
- **Service:** `src/services/attendance.js` → `getMyAttendance({ date } = {})`
- **Dikirim:** query `date` (kondisional)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/attendance/by-shift`
- **Service:** `src/services/attendance.js` → `getAttendanceByShift(shiftId)`
- **Dikirim:** query `shiftId` (selalu disertakan)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Thermal Printer

### POST `/thermal-printer/test-print`
- **Service:** `src/services/thermalPrinter.js` → `testPrint(config = {})`
- **Dikirim:** body = `config` utuh (default `{}`)
- **Dipakai:** `data` (dari `response.data`)
- **Catatan:** tanpa cek status lokal (langsung `return response.data`)

---

### GET `/thermal-printer/status`
- **Service:** `src/services/thermalPrinter.js` → `getPrinterStatus()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `response.data`)
- **Catatan:** tanpa cek status lokal

---

### POST `/thermal-printer/configure`
- **Service:** `src/services/thermalPrinter.js` → `configurePrinter(config)`
- **Dikirim:** body = `config` utuh
- **Dipakai:** `data` (dari `response.data`)
- **Catatan:** tanpa cek status lokal

---


## Delivery

### GET `/delivery/orders`
- **Service:** `src/services/delivery.js` → `getDeliveryOrders({ store, page = 1, limit = 10, search, status, source })`
- **Dikirim:** query `page`, `limit` (selalu); `store`; `search`; `status` (bila bukan `"all"`); `source` (bila bukan `"all"`)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### GET `/delivery/orders/:id`
- **Service:** `src/services/delivery.js` → `getDeliveryOrderById(id)`
- **Dikirim:** —
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---

### POST `/delivery/orders`
- **Service:** `src/services/delivery.js` → `createDeliveryOrder(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### PUT `/delivery/orders/status`
- **Service:** `src/services/delivery.js` → `updateDeliveryStatus({ id, status, note, changedBy, changedByName })`
- **Dikirim:** body `id`, `status`, `note`, `changedBy`, `changedByName`
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### PUT `/delivery/orders/:orderId/assign-driver`
- **Service:** `src/services/delivery.js` → `assignDriver({ orderId, driverId, driverName })`
- **Dikirim:** body `driverId`, `driverName` (`orderId` hanya di path)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---

### PUT `/delivery/orders/:id/cancel`
- **Service:** `src/services/delivery.js` → `cancelDeliveryOrder(id, reason)`
- **Dikirim:** body `reason`
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---

### GET `/delivery/drivers`
- **Service:** `src/services/delivery.js` → `getDrivers({ store, page = 1, limit = 10, search, status })`
- **Dikirim:** query `page`, `limit` (selalu); `store`; `search`; `status` (bila bukan `"all"`)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### GET `/delivery/drivers/:id`
- **Service:** `src/services/delivery.js` → `getDriverById(id)`
- **Dikirim:** —
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---

### POST `/delivery/drivers`
- **Service:** `src/services/delivery.js` → `createDriver(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### PUT `/delivery/drivers/:id`
- **Service:** `src/services/delivery.js` → `updateDriver(payload, id)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---

### DELETE `/delivery/drivers/:id`
- **Service:** `src/services/delivery.js` → `deleteDriver(id)`
- **Dikirim:** — (id hanya di path)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---

### PUT `/delivery/drivers/:id/status`
- **Service:** `src/services/delivery.js` → `updateDriverStatus(id, status)`
- **Dikirim:** body `status`
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---

### GET `/delivery/marketplace-config`
- **Service:** `src/services/delivery.js` → `getMarketplaceConfig(store)`
- **Dikirim:** query `store` (diinterpolasi apa adanya ke URL)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### POST `/delivery/marketplace-config`
- **Service:** `src/services/delivery.js` → `saveMarketplaceConfig(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### GET `/delivery/stats`
- **Service:** `src/services/delivery.js` → `getDeliveryStats(store)`
- **Dikirim:** query `store` (hanya bila diberikan; tanpa store URL tanpa query)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---


## Location

### GET `/location/get-location-public`
- **Service:** `src/services/location.js` → `getAllLocation(status)`
- **Dikirim:** query `status` (hanya bila dikirim)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/location/get-location-all`
- **Service:** `src/services/location.js` → `getAllLocationTable({ page = 1, limit = 10, statusLocation = "all", category = "all", search })`
- **Dikirim:** query `page`, `limit`, `status` (dari `statusLocation`); `category` (bila bukan `"all"`); `search` (bila ada)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### POST `/location/add-new-location`
- **Service:** `src/services/location.js` → `addLocation(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`)

---

### PUT `/location/edit-location`
- **Service:** `src/services/location.js` → `editLocation(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### DELETE `/location/delete-location`
- **Service:** `src/services/location.js` → `deleteLocation(payload)`
- **Dikirim:** body via config `{ data: payload }` (DELETE ber-body; diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### POST `/location/archive-location`
- **Service:** `src/services/location.js` → `archiveLocation(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### POST `/location/reactivate-location`
- **Service:** `src/services/location.js` → `reactivateLocation(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/location/get-location-detail/:id`
- **Service:** `src/services/location.js` → `getLocationDetail({ id })` dan `getLocationById({ id })` (keduanya alias dari internal `_getLocationDetail`)
- **Dikirim:** — (id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### GET `/location/generate-id`
- **Service:** `src/services/location.js` → `generateLocationId()`
- **Dikirim:** —
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/location/store-configuration/:selector`
- **Service:** `src/services/location.js` → `getStoreConfigurationById(id)`
- **Dikirim:** — (selector `loc-<n>` hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** selector dinormalisasi (`loc-<n>`, tanpa leading zero) dan ditolak sebelum request bila bukan id integer positif; cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### GET `/location/store-configuration`
- **Service:** `src/services/location.js` → `getStoreConfigurations(page = 1, limit = 20)`
- **Dikirim:** query `page`, `limit`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### PUT `/location/store-configuration`
- **Service:** `src/services/location.js` → `editStoreConfiguration(payload)`
- **Dikirim:** body = `payload` dengan `id` dinormalisasi ke `loc-<n>` (mendukung FormData; field lain diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** `skipStoreInjection: true`; id divalidasi sebelum request; cek status respons manual (`!== 200` → `Error`)

---


## Inventory

### GET `/inventory/forecast`
- **Service:** `src/services/inventory.js` → `getForecasts(payload = {})`
- **Dikirim:** query `store`, `productId`, `limit` (masing-masing hanya bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### POST `/inventory/forecast/run`
- **Service:** `src/services/inventory.js` → `runForecast(payload = {})`
- **Dikirim:** query `store`, `productId` (tanpa body)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/inventory/dead-stock`
- **Service:** `src/services/inventory.js` → `getDeadStock(payload = {})`
- **Dikirim:** query `store`, `page`, `limit` (masing-masing hanya bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/inventory/expiring-soon`
- **Service:** `src/services/inventory.js` → `getExpiringSoon(payload = {})`
- **Dikirim:** query `store`, `page`, `limit` (masing-masing hanya bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/inventory/valuation`
- **Service:** `src/services/inventory.js` → `getValuation(payload = {})`
- **Dikirim:** query `store` (bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/inventory/batch`
- **Service:** `src/services/inventory.js` → `getBatches(payload = {})`
- **Dikirim:** query `store`, `productId`, `status`, `page`, `limit` (masing-masing hanya bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### POST `/inventory/batch/writeoff`
- **Service:** `src/services/inventory.js` → `postWriteOffExpired(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/inventory/reconcile`
- **Service:** `src/services/inventory.js` → `getReconcile(payload = {})`
- **Dikirim:** query `store` (bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### POST `/inventory/reconcile/fix`
- **Service:** `src/services/inventory.js` → `postReconcile(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---


## Tax Config

### GET `/tax-config`
- **Service:** `src/services/tax-config.js` → `getAllTaxConfig(payload)`
- **Dikirim:** query `store` (dari `payload.location`, bisa string kosong), `page` (default 1), `limit` (default 10), `status` (bila ada dan bukan `"all"`)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/tax-config/effective`
- **Service:** `src/services/tax-config.js` → `getEffectiveTax({ store, channel } = {})`
- **Dikirim:** query `channel` (default `"counter"`); `store` (hanya bila bukan null/undefined/string kosong)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** `skipStoreInjection: true`; cek status respons manual (`!== 200` → `Error`)

---

### POST `/tax-config/add-new-tax-config`
- **Service:** `src/services/tax-config.js` → `addTaxConfig(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`)

---

### PUT `/tax-config/edit-tax-config/:id`
- **Service:** `src/services/tax-config.js` → `editTaxConfig(payload)`
- **Dikirim:** body `payload` (termasuk `id`); id di path dari `payload.id`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### DELETE `/tax-config/delete-tax-config/:id`
- **Service:** `src/services/tax-config.js` → `deleteTaxConfig(payload)`
- **Dikirim:** body via config `{ data: payload }`; id di path dari `payload.id`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error(data?.error)`); (path dibangun dinamis)

---

### GET `/tax-config/get-tax-config/:id`
- **Service:** `src/services/tax-config.js` → `getTaxConfigById(payload)`
- **Dikirim:** — (id di path dari `payload.id`)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### GET `<url>` (helper `downloadBlob`)
- **Service:** `src/services/tax-config.js` → `downloadBlob(url, filename)`; dipanggil `downloadTaxConfigTemplate()` (`/tax-config/template`, `tax-config-template.xlsx`) dan `downloadTaxConfigExcel()` (`/tax-config/download`, `<timestamp>-tax-configs.xlsx`)
- **Dikirim:** — (tanpa query/body)
- **Dipakai:** — (tidak mengembalikan data; memicu unduhan file xlsx di browser)
- **Catatan:** `responseType: "arraybuffer"`; hasil dikemas `Blob` xlsx lalu diunduh via `URL.createObjectURL` + elemen `<a download>`; status ≠ 200 → `Error("Download failed")`; (path dibangun dinamis — dari argumen `url` helper)

---

### POST `/tax-config/import`
- **Service:** `src/services/tax-config.js` → `uploadTaxConfigExcel(file)`
- **Dikirim:** FormData `file`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** headers `Content-Type: multipart/form-data`; cek status respons manual (`!== 200 && !== 201` → `Error`)

---

### PUT `/tax-config/apply/:id`
- **Service:** `src/services/tax-config.js` → `applyTaxConfig(id)`
- **Dikirim:** — (tanpa body; id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---


## Member (member.js + customer.js)

### GET `/member/get-member`
- **Service:** `src/services/member.js` → `getAllMember({ page = 1, limit = 10, nameMember = "", phoneNumber = "", store, tier, statusMember })`; `src/services/customer.js` → `getAllCustomer(params = {})`
- **Dikirim:** query `page`, `limit`, `nameMember`, `phoneNumber`, `tier`, `status` (dari `statusMember`), `store` (bila ada) — dari `getAllMember`; seluruh `params` diteruskan apa adanya — dari `getAllCustomer`
- **Dipakai:** `data` — body respons utuh (keduanya)
- **Catatan:** cek status respons manual (`!== 200` → `Error`) di kedua fungsi

---

### GET `/member/get-member/:id`
- **Service:** `src/services/member.js` → `getMemberById({ id, page, limit } = {})`
- **Dikirim:** query `page`, `limit`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### POST `/member/add-new-member`
- **Service:** `src/services/member.js` → `addMember(payload)`; `src/services/customer.js` → `addCustomer(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya, kedua fungsi)
- **Dipakai:** `data` — body respons utuh (keduanya)
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`) di kedua fungsi. Nama, nomor HP (E.164) dan email member unik **per toko** (member `store: null` berbagi satu kelompok); nomor/email yang sama boleh dipakai member di toko/bisnis lain. Bentrok → `409` `Nama member sudah terdaftar` / `Nomor telepon sudah terdaftar` / `Email sudah terdaftar` (D-05 amendemen A1, 2026-10-31; sebelumnya HP & email global)

---

### PUT `/member/edit-member/:id`
- **Service:** `src/services/member.js` → `editMember(payload)`
- **Dikirim:** body `payload` (termasuk `id`); id di path dari `payload.id`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`); (path dibangun dinamis). HP/email dicek di toko member itu sendiri

---

### DELETE `/member/delete-member/:id`
- **Service:** `src/services/member.js` → `deleteMember({ id } = {})`
- **Dikirim:** — (id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201 && !== 204` → `Error`); (path dibangun dinamis)

---

### PUT `/member/edit-point-member/:phoneNumber`
- **Service:** `src/services/member.js` → `addMemberPoints(phoneNumber, payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya; BE membaca `points`, negatif = kurangi)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`); (path dibangun dinamis). Pencarian member dibatasi toko pemanggil (`?store=` untuk super_admin, disuntik interceptor bila toko dipilih). Super_admin tanpa toko yang nomornya cocok di lebih dari satu toko → `409 { code: "MEMBER_STORE_REQUIRED" }` "Nomor telepon terdaftar di lebih dari satu toko. Pilih toko terlebih dahulu." — tidak ada yang diubah

---

### GET `/pos/member/:id/point-history`
- **Service:** `src/services/member.js` → `getMemberPointHistory({ id, page = 1, limit = 10 })`
- **Dikirim:** query `page`, `limit`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---


## Type Payment

### GET `/type-payment/get-type-payment`
- **Service:** `src/services/type-payment.js` → `getAllTypePaymentListActive({ store, page = 1, limit = 10, statusPayment = "all" })`
- **Dikirim:** query `store` (bila ada), `page`, `limit`, `status` (dari `statusPayment`, selalu dikirim)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/type-payment/get-list-type-payment`
- **Service:** `src/services/type-payment.js` → `getAllTypePayment(payload = {})`
- **Dikirim:** query `store`, `status`, `page`, `limit`, `search` (masing-masing hanya bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/type-payment/get-by-id/:id`
- **Service:** `src/services/type-payment.js` → `getTypePaymentById(id)`
- **Dikirim:** — (id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### POST `/type-payment/add-new-type-payment`
- **Service:** `src/services/type-payment.js` → `addTypePayment(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`)

---

### PUT `/type-payment/edit-type-payment/:id`
- **Service:** `src/services/type-payment.js` → `editTypePayment(payload)`
- **Dikirim:** body `payload` (termasuk `id`); id di path dari `payload.id`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### GET `<url>` (helper `downloadBlob`)
- **Service:** `src/services/type-payment.js` → `downloadBlob(url, filename)`; dipanggil `downloadTypePaymentTemplate()` (`/type-payment/template`) dan `downloadTypePaymentExcel()` (`/type-payment/download`)
- **Dikirim:** — (tanpa query/body)
- **Dipakai:** — (tidak mengembalikan data; memicu unduhan file xlsx di browser)
- **Catatan:** `responseType: "arraybuffer"`; Blob xlsx diunduh via `URL.createObjectURL` + elemen `<a download>`; status ≠ 200 → `Error("Download failed")`; (path dibangun dinamis — dari argumen `url` helper)

---

### POST `/type-payment/import`
- **Service:** `src/services/type-payment.js` → `uploadTypePaymentExcel(file)`
- **Dikirim:** FormData `file`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** headers `Content-Type: multipart/form-data`; cek status respons manual (`!== 200 && !== 201` → `Error`)

---

### DELETE `/type-payment/delete-type-payment/:id`
- **Service:** `src/services/type-payment.js` → `deleteTypePayment(payload)`
- **Dikirim:** body via config `{ data: payload }`; id di path dari `payload.id`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error(data?.error)`); (path dibangun dinamis)

---


## Goods Request

### GET `/goods-request/get-all`
- **Service:** `src/services/goods-request.js` → `getAllGoodsRequest(payload)`
- **Dikirim:** query `page`, `limit`, `status`, `supplier`, `search`, `queryStore` (dari `payload.store`), `startDate`, `endDate` (masing-masing hanya bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); store dikirim sebagai query `queryStore`, bukan `store`

---

### GET `/goods-request/get-by-id/:id`
- **Service:** `src/services/goods-request.js` → `getGoodsRequestById(id)`
- **Dikirim:** — (id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### POST `/goods-request/create`
- **Service:** `src/services/goods-request.js` → `addGoodsRequest(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`)

---

### PUT `/goods-request/update/:id`
- **Service:** `src/services/goods-request.js` → `editGoodsRequest(id, payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya); id hanya di path
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`); (path dibangun dinamis)

---

### DELETE `/goods-request/delete/:id`
- **Service:** `src/services/goods-request.js` → `deleteGoodsRequest(id)`
- **Dikirim:** — (id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 204` → `Error`); (path dibangun dinamis)

---

### PATCH `/goods-request/status/:id`
- **Service:** `src/services/goods-request.js` → `changeGoodsRequestStatus(id, status)`
- **Dikirim:** body `status`; id hanya di path
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status HTTP manual (`!== 200 && !== 201` → `Error`); (path dibangun dinamis)

---


## Shift Template

### GET `/shift-template/get-shift-template`
- **Service:** `src/services/shiftTemplate.js` → `getAllShiftTemplate()`
- **Dikirim:** —
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/shift-template/get-shift-template-all`
- **Service:** `src/services/shiftTemplate.js` → `getAllShiftTemplateTable({ page = 1, limit = 10, statusRole = "all", search = "" })`
- **Dikirim:** query `page`, `limit`, `status` (dari `statusRole`), `search` (selalu dikirim)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/shift-template/get-shift-template/:id`
- **Service:** `src/services/shiftTemplate.js` → `getShiftTemplateById(payload)`
- **Dikirim:** — (id di path dari `payload.id`)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### POST `/shift-template/add-new-shift-template`
- **Service:** `src/services/shiftTemplate.js` → `addShiftTemplate(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`)

---

### PUT `/shift-template/edit-shift-template/:id`
- **Service:** `src/services/shiftTemplate.js` → `editShiftTemplate(payload)`
- **Dikirim:** body `payload` (termasuk `id`); id di path dari `payload.id`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### DELETE `/shift-template/delete-shift-template/:id`
- **Service:** `src/services/shiftTemplate.js` → `deleteShiftTemplate(payload)`
- **Dikirim:** body via config `{ data: payload }`; id di path dari `payload.id`
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error(data?.error)`); (path dibangun dinamis)

---


## Sales Return

### GET `/sales-return/get-all`
- **Service:** `src/services/sales-return.js` → `getAllSalesReturn(payload)`
- **Dikirim:** query `page`, `limit`, `status`, `store`, `startDate`, `endDate` (masing-masing hanya bila ada di payload)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### GET `/sales-return/get-by-id/:id`
- **Service:** `src/services/sales-return.js` → `getSalesReturnById(id)`
- **Dikirim:** — (id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`); (path dibangun dinamis)

---

### POST `/pos/order/:orderId/return`
- **Service:** `src/services/sales-return.js` → `returnOrder(orderId, payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya); `orderId` hanya di path
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 201 && !== 200` → `Error`); (path dibangun dinamis)

---

### PATCH `/sales-return/approve/:id`
- **Service:** `src/services/sales-return.js` → `approveSalesReturn(arg)` — `arg` boleh id, atau `{ id, refundReference }`
- **Dikirim:** body `{ refundReference }` hanya bila `refundReference` non-kosong setelah trim; jika tidak, tanpa body
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`); (path dibangun dinamis)

---

### PATCH `/sales-return/reject/:id`
- **Service:** `src/services/sales-return.js` → `rejectSalesReturn(id)`
- **Dikirim:** — (tanpa body; id hanya di path)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`); (path dibangun dinamis)

---


## Queue

### GET `/queue`
- **Service:** `src/services/queue.js` → `getQueueList({ store, page = 1, limit = 20, search, status, priority } = {})`
- **Dikirim:** query `page`, `limit` (selalu); `store`; `search`; `status` (bila bukan `"all"`); `priority` (bila bukan `"all"`)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### GET `/queue/stats`
- **Service:** `src/services/queue.js` → `getQueueStats({ store } = {})`
- **Dikirim:** query `store` (hanya bila diberikan)
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** —

---

### PUT `/queue/:id/status`
- **Service:** `src/services/queue.js` → `updateQueueStatus(id, { status, tableId, notes })`
- **Dikirim:** body `status`, `tableId`, `notes`; id hanya di path
- **Dipakai:** `r.data` — body respons utuh
- **Catatan:** (path dibangun dinamis)

---


## FAQ

### GET `/faq/faq`
- **Service:** `src/services/faq.js` → `searchFaq({ page = 1, limit = 10, search } = {})`
- **Dikirim:** query `page`, `limit`, `search` (via config `params`)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** —

---

### POST `/faq/faq/ask`
- **Service:** `src/services/faq.js` → `askAi(question, contextData = {})`
- **Dikirim:** body `question`, `data` (dari `contextData`)
- **Dipakai:** `data.answer` (hanya field `answer` dari body respons)
- **Catatan:** —

---


## Price Store

### GET `/pos/product/price-by-store`
- **Service:** `src/services/price-store.js` → `getProductPriceByStore(payload)`
- **Dikirim:** query `productId`, `storeIds` (array digabung koma; default string kosong)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200` → `Error`)

---

### PUT `/pos/product/update-price-by-store`
- **Service:** `src/services/price-store.js` → `updateProductPriceByStore(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` — body respons utuh
- **Catatan:** cek status respons manual (`!== 200 && !== 201` → `Error`)

---


## Cash Register

### POST `/cash-register/open`
- **Service:** `src/services/cash-register.js` → `openCashRegister(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/cash-register/close/:id`
- **Service:** `src/services/cash-register.js` → `closeCashRegister(id, payload)`
- **Dikirim:** body `payload`; `id` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/cash-register/current`
- **Service:** `src/services/cash-register.js` → `getCurrentCashRegister(storeId)`
- **Dikirim:** query `store` (nilai selalu ditempel via template string `?store=${storeId}`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/cash-register/history`
- **Service:** `src/services/cash-register.js` → `getCashRegisterHistory(payload)`
- **Dikirim:** query `page`, `limit`, `store`, `search`, `startDate`, `endDate` (masing-masing hanya bila truthy)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/cash-register/open-registers`
- **Service:** `src/services/cash-register.js` → `getOpenRegisters()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/cash-register/table-reset-preview`
- **Service:** `src/services/cash-register.js` → `getTableResetPreview(storeId)`
- **Dikirim:** query `store`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** komentar kode menegaskan angka dihitung server-side (bukan turunan dari list table/order terpisah)

---

### GET `/cash-register/x-report`
- **Service:** `src/services/cash-register.js` → `getXReport(storeId)`
- **Dikirim:** query `store`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/cash-register/z-report/:registerId`
- **Service:** `src/services/cash-register.js` → `getZReport(registerId)`
- **Dikirim:** — (`registerId` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/cash-register/:registerId/movements`
- **Service:** `src/services/cash-register.js` → `listCashMovements(registerId)`
- **Dikirim:** — (`registerId` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/cash-register/:registerId/movement`
- **Service:** `src/services/cash-register.js` → `createCashMovement(registerId, payload)`
- **Dikirim:** body `payload`; `registerId` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/cash-register/movement/:movementId/decide`
- **Service:** `src/services/cash-register.js` → `decideCashMovement(movementId, decision)`
- **Dikirim:** body `{ decision }`; `movementId` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/cash-register/movement/:movementId/reverse`
- **Service:** `src/services/cash-register.js` → `reverseCashMovement(movementId, payload)`
- **Dikirim:** body `payload`; `movementId` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/cash-register/:registerId/decide-variance`
- **Service:** `src/services/cash-register.js` → `decideCashVariance(registerId, decision)`
- **Dikirim:** body `{ decision }`; `registerId` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Accounting

### GET `/accounting/accounts`
- **Service:** `src/services/accounting.js` → `getAccounts(storeId)`
- **Dikirim:** query `store` (hanya bila `storeId` diisi)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/accounting/accounts`
- **Service:** `src/services/accounting.js` → `createAccount(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/accounting/accounts/:id`
- **Service:** `src/services/accounting.js` → `updateAccount(id, payload)`
- **Dikirim:** body `payload`; `id` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### DELETE `/accounting/accounts/:id`
- **Service:** `src/services/accounting.js` → `deleteAccount(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/accounting/journals`
- **Service:** `src/services/accounting.js` → `getJournals(payload)`
- **Dikirim:** query `store`, `sourceType`, `startDate`, `endDate`, `limit`, `offset` (masing-masing hanya bila truthy)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/accounting/journals`
- **Service:** `src/services/accounting.js` → `createManualJournal(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### DELETE `/accounting/journals/:id`
- **Service:** `src/services/accounting.js` → `deleteJournal(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/accounting/overview`
- **Service:** `src/services/accounting.js` → `getAccountingOverview(payload)`
- **Dikirim:** query `store`, `startDate`, `endDate` (masing-masing hanya bila truthy)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/accounting/trial-balance`
- **Service:** `src/services/accounting.js` → `getTrialBalance(payload)`
- **Dikirim:** query `store`, `startDate`, `endDate` (masing-masing hanya bila truthy)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/accounting/income-statement`
- **Service:** `src/services/accounting.js` → `getIncomeStatement(payload)`
- **Dikirim:** query `store`, `startDate`, `endDate` (masing-masing hanya bila truthy)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/accounting/balance-sheet`
- **Service:** `src/services/accounting.js` → `getBalanceSheet(payload)`
- **Dikirim:** query `store`, `asOf` (masing-masing hanya bila truthy)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Purchase Order

### GET `/purchase-order/get-all`
- **Service:** `src/services/purchase-order.js` → `getAllPurchaseOrder(payload)`
- **Dikirim:** query `stores` (bila diisi), `page` (default `1`), `limit` (default `10`), `search` (default `""`), `status` (bila ≠ `"all"`), `source` (bila ≠ `"all"`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/purchase-order/get-by-id/:id`
- **Service:** `src/services/purchase-order.js` → `getPurchaseOrderById(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/purchase-order/create`
- **Service:** `src/services/purchase-order.js` → `addPurchaseOrder(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/purchase-order/update/:id`
- **Service:** `src/services/purchase-order.js` → `editPurchaseOrder(id, payload)`
- **Dikirim:** body `payload`; `id` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### DELETE `/purchase-order/delete/:id`
- **Service:** `src/services/purchase-order.js` → `deletePurchaseOrder(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** sukses menerima status 200 atau 204

---

### PUT `/purchase-order/cancel/:id`
- **Service:** `src/services/purchase-order.js` → `cancelPurchaseOrder(id)`
- **Dikirim:** — (`id` di path; tanpa body)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/purchase-order/send-to-supplier/:id`
- **Service:** `src/services/purchase-order.js` → `sendToSupplierPurchaseOrder(id)`
- **Dikirim:** — (`id` di path; tanpa body)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/purchase-return/create`
- **Service:** `src/services/purchase-order.js` → `returnPurchaseOrder(id, payload, files = [])`
- **Dikirim:** body `{ purchaseOrder: id, ...payload }`; bila `files` tidak kosong → FormData berisi `data` (JSON string body tersebut) dan `file` (satu entri per `File`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** dua jalur: multipart dengan `headers: { "Content-Type": "multipart/form-data" }` bila ada file, selain itu JSON biasa; endpoint modul Purchase Return tetapi dibungkus di file `purchase-order.js`

---

### GET `/purchase-order/download`
- **Service:** `src/services/purchase-order.js` → `downloadPurchaseOrderExcel()` (helper internal `downloadBlob(url, filename)`)
- **Dikirim:** —
- **Dipakai:** — (efek samping: memicu unduhan file; tidak mengembalikan nilai)
- **Catatan:** via `downloadBlob` → `responseType: "arraybuffer"`; respons diubah menjadi Blob MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` dan diunduh sebagai `${Date.now()}-purchase-orders.xlsx`

---

### GET `/purchase-order/template`
- **Service:** `src/services/purchase-order.js` → `downloadPurchaseOrderTemplate()` (helper internal `downloadBlob(url, filename)`)
- **Dikirim:** —
- **Dipakai:** — (efek samping: memicu unduhan file; tidak mengembalikan nilai)
- **Catatan:** via `downloadBlob` → `responseType: "arraybuffer"`; diunduh sebagai `template-purchase-order.xlsx`

---

### POST `/purchase-order/import`
- **Service:** `src/services/purchase-order.js` → `uploadPurchaseOrderExcel(file)`
- **Dikirim:** FormData `file`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** `headers: { "Content-Type": "multipart/form-data" }`

---


## Production Order

### GET `/production-order/get-all`
- **Service:** `src/services/production-order.js` → `getAllProductionOrder(payload)`
- **Dikirim:** query `page`, `limit`, `status`, `startDate`, `endDate`, `product`, `search` (masing-masing hanya bila truthy)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/production-order/get-by-id/:id`
- **Service:** `src/services/production-order.js` → `getProductionOrderById(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/production-order/create`
- **Service:** `src/services/production-order.js` → `addProductionOrder(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/production-order/update/:id`
- **Service:** `src/services/production-order.js` → `editProductionOrder(id, payload)`
- **Dikirim:** body `payload`; `id` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### DELETE `/production-order/delete/:id`
- **Service:** `src/services/production-order.js` → `deleteProductionOrder(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** sukses menerima status 200 atau 204

---

### PATCH `/production-order/status/:id`
- **Service:** `src/services/production-order.js` → `changeProductionOrderStatus(id, status)`
- **Dikirim:** body `{ status }`; `id` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/production-order/start/:id`
- **Service:** `src/services/production-order.js` → `startProduction(id)`
- **Dikirim:** — (`id` di path; tanpa body)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/production-order/complete/:id`
- **Service:** `src/services/production-order.js` → `completeProduction(id, payload)`
- **Dikirim:** body `payload || {}`; `id` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** body fallback `{}` bila `payload` tidak diberikan

---


## Discount

### GET `/discount/get-discount`
- **Service:** `src/services/discount.js` → `getAllDiscount({ page, limit, location, status, search } = {})`
- **Dikirim:** query `page`, `limit` (selalu ditempel); `store` (dari `location`, bila diisi); `status` (bila diisi dan ≠ `"all"`); `search` (bila diisi, di-`encodeURIComponent`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/discount/add-new-discount`
- **Service:** `src/services/discount.js` → `addDiscount(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/discount/edit-discount/:id`
- **Service:** `src/services/discount.js` → `editDiscount(payload)`
- **Dikirim:** body `payload`; `id` di path diambil dari `payload.id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** pesan error diambil dari `data?.message || data?.error`

---

### DELETE `/discount/delete-discount/:id`
- **Service:** `src/services/discount.js` → `deleteDiscount(payload)`
- **Dikirim:** body `payload` (dikirim lewat opsi `{ data: payload }`); `id` di path diambil dari `payload.id`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** DELETE dengan body; sukses menerima status 200/201/204; pesan error dari `data?.error`

---

### GET `/discount/template`
- **Service:** `src/services/discount.js` → `downloadDiscountTemplate()` (helper internal `downloadBlob(url, filename)`)
- **Dikirim:** —
- **Dipakai:** — (efek samping: memicu unduhan file; tidak mengembalikan nilai)
- **Catatan:** via `downloadBlob` → `responseType: "arraybuffer"`; diunduh sebagai `template-diskon.xlsx`

---

### GET `/discount/download`
- **Service:** `src/services/discount.js` → `downloadDiscountExcel()` (helper internal `downloadBlob(url, filename)`)
- **Dikirim:** —
- **Dipakai:** — (efek samping: memicu unduhan file; tidak mengembalikan nilai)
- **Catatan:** via `downloadBlob` → `responseType: "arraybuffer"`; diunduh sebagai `${Date.now()}-discounts.xlsx`

---

### POST `/discount/import`
- **Service:** `src/services/discount.js` → `uploadDiscountExcel(file)`
- **Dikirim:** FormData `file`
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** `headers: { "Content-Type": "multipart/form-data" }`

---

### GET `/discount/get-discount/:id`
- **Service:** `src/services/discount.js` → `getDiscountById(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/discount/lookup-by-code/:code`
- **Service:** `src/services/discount.js` → `lookupDiscountByCode(code, store)`
- **Dikirim:** query `store` (lewat `params`); `code` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Purchase Payment

### GET `/purchase-payment/by-po/:poId`
- **Service:** `src/services/purchase-payment.js` → `getPaymentsByPO(poId)`
- **Dikirim:** — (`poId` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/purchase-payment/by-supplier/:supplierId`
- **Service:** `src/services/purchase-payment.js` → `getPaymentsBySupplier(supplierId)`
- **Dikirim:** — (`supplierId` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/purchase-payment/list`
- **Service:** `src/services/purchase-payment.js` → `getAllPayments(payload = {})`
- **Dikirim:** query `page`, `limit`, `store`, `startDate`, `endDate`, `supplierId` (masing-masing hanya bila diisi)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/purchase-payment/detail/:id`
- **Service:** `src/services/purchase-payment.js` → `getPaymentById(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/purchase-payment/create`
- **Service:** `src/services/purchase-payment.js` → `recordPayment(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/purchase-payment/ap-dashboard`
- **Service:** `src/services/purchase-payment.js` → `getAPDashboard()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### DELETE `/purchase-payment/delete/:id`
- **Service:** `src/services/purchase-payment.js` → `deletePayment(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** sukses menerima status 200 atau 204

---


## Invoice

### GET `/invoice/setting`
- **Service:** `src/services/invoice.js` → `getInvoiceSetting(store)`
- **Dikirim:** query `store` (lewat `params`)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/invoice/setting`
- **Service:** `src/services/invoice.js` → `updateInvoiceSetting(payload)`
- **Dikirim:** body `payload` (objek biasa atau `FormData`, diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** `headers: { "Content-Type": "multipart/form-data" }` hanya bila `payload` instanceof `FormData`; selain itu headers kosong

---

### POST `/invoice/setting/reset`
- **Service:** `src/services/invoice.js` → `resetInvoiceSetting(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/pos/invoice/wa-text/${orderId}`
- **Service:** `src/services/invoice.js` → `getInvoiceWhatsAppText(orderId)`
- **Dikirim:** path `orderId`
- **Dipakai:** `res.data` (`data.text`) — dibuka lewat `wa.me` di WhatsApp kasir; server tidak mengirim apa pun
- **Catatan:** pengganti `send-wa` / `whatsapp/status` / `whatsapp/restart` (Fonnte dihapus 2026-10-20)

---

### POST `/pos/invoice/send-email`
- **Service:** `src/services/invoice.js` → `sendInvoiceEmail(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

## Parked Cart

### POST `/parked-cart`
- **Service:** `src/services/parked-cart.js` → `createParkedCart(payload)`
- **Dikirim:** body `payload` (diteruskan apa adanya)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/parked-cart`
- **Service:** `src/services/parked-cart.js` → `getParkedCarts({ store, status } = {})`
- **Dikirim:** query `store`, `status` (masing-masing hanya bila diisi)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/parked-cart/:id`
- **Service:** `src/services/parked-cart.js` → `getParkedCart(id)`
- **Dikirim:** — (`id` di path)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/parked-cart/:id/resume`
- **Service:** `src/services/parked-cart.js` → `resumeParkedCart(id)`
- **Dikirim:** — (`id` di path; tanpa body)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### POST `/parked-cart/:id/cancel`
- **Service:** `src/services/parked-cart.js` → `cancelParkedCart(id)`
- **Dikirim:** — (`id` di path; tanpa body)
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## General (Wilayah/Regions)

### GET `/regions/provinces`
- **Service:** `src/services/general.js` → `getProvinces()`
- **Dikirim:** —
- **Dipakai:** array hasil `.map` dari `data.data || []` → `{ kode_prov, nama_provinsi, latitude, longitude }`
- **Catatan:** tanpa pengecekan `status` HTTP; `BASE_URL = "/regions"` konstanta lokal file

---

### GET `/regions/regencies`
- **Service:** `src/services/general.js` → `getCities(provinceId)`
- **Dikirim:** query `province_code` (dari `provinceId`)
- **Dipakai:** array hasil `.map` dari `data.data || []` → `{ kode_kab, nama_kabupaten, latitude, longitude }`
- **Catatan:** tanpa pengecekan `status` HTTP

---

### GET `/regions/districts`
- **Service:** `src/services/general.js` → `getDistricts(cityId)`
- **Dikirim:** query `regency_code` (dari `cityId`)
- **Dipakai:** array hasil `.map` dari `data.data || []` → `{ kode_kec, nama_kecamatan, latitude, longitude }`
- **Catatan:** tanpa pengecekan `status` HTTP

---

### GET `/regions/villages`
- **Service:** `src/services/general.js` → `getVillages(districtId)`
- **Dikirim:** query `district_code` (dari `districtId`)
- **Dipakai:** array hasil `.map` dari `data.data || []` → `{ kode_desa, nama_desa }`
- **Catatan:** tanpa pengecekan `status` HTTP

---

### GET `/regions/postal-codes`
- **Service:** `src/services/general.js` → `getPostalCode(villageId)`
- **Dikirim:** query `village_code` (dari `villageId`)
- **Dipakai:** array hasil `.map` dari `data.data || []` → `{ kode_pos }` (dari `postalCode`)
- **Catatan:** tanpa pengecekan `status` HTTP

---


## Report Config

### GET `/report-config`
- **Service:** `src/services/reportConfig.js` → `getReportConfigs()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### PUT `/report-config/:key`
- **Service:** `src/services/reportConfig.js` → `saveReportConfig(key, config)`
- **Dikirim:** body `{ config }`; `key` di path
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---

### GET `/report-config/meta`
- **Service:** `src/services/reportConfig.js` → `getReportConfigMeta()`
- **Dikirim:** —
- **Dipakai:** `data` (dari `res.data`)
- **Catatan:** —

---


## Waiter Request

### GET `/waiter-request`
- **Service:** `src/services/waiterRequest.js` → `getWaiterRequestList({ store, page = 1, limit = 20, status } = {})`
- **Dikirim:** query `page`, `limit` (selalu); `store` (bila diisi dan ≠ `"all"`); `status` (bila diisi dan ≠ `"all"`)
- **Dipakai:** `r.data` (dari `.then((r) => r.data)`)
- **Catatan:** fungsi ini tidak `async` — langsung mengembalikan promise

---

### PUT `/waiter-request/:id/status`
- **Service:** `src/services/waiterRequest.js` → `updateWaiterRequestStatus(id, { status, notes })`
- **Dikirim:** body `{ status, notes }`; `id` di path
- **Dipakai:** `r.data` (dari `.then((r) => r.data)`)
- **Catatan:** —

---


