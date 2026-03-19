# GeoConnect — Hướng Dẫn Deploy Chi Tiết

> Deploy frontend lên **Vercel**, backend lên **Render**, database dùng **MongoDB Atlas**.

---

## Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Chuẩn Bị Trước Khi Deploy](#2-chuẩn-bị-trước-khi-deploy)
3. [Bước 1: Tạo MongoDB Atlas Database](#3-bước-1-tạo-mongodb-atlas-database)
4. [Bước 2: Deploy Backend lên Render](#4-bước-2-deploy-backend-lên-render)
5. [Bước 3: Deploy Frontend lên Vercel](#5-bước-3-deploy-frontend-lên-vercel)
6. [Bước 4: Cấu Hình OAuth (Google & GitHub)](#6-bước-4-cấu-hình-oauth-google--github)
7. [Bước 5: Cấu Hình Cloudinary (Upload Ảnh)](#7-bước-5-cấu-hình-cloudinary-upload-ảnh)
8. [Bước 6: Cấu Hình Email (SMTP)](#8-bước-6-cấu-hình-email-smtp)
9. [Bước 7: Kiểm Tra Sau Deploy](#9-bước-7-kiểm-tra-sau-deploy)
10. [Bảng Tổng Hợp Biến Môi Trường](#10-bảng-tổng-hợp-biến-môi-trường)
11. [Xử Lý Lỗi Thường Gặp](#11-xử-lý-lỗi-thường-gặp)
12. [Cập Nhật & Redeploy](#12-cập-nhật--redeploy)

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Vercel         │  HTTPS  │   Render          │  TCP    │  MongoDB Atlas   │
│   (Frontend)     │ ──────► │   (Backend API)   │ ──────► │  (Database)      │
│                  │         │                   │         │                  │
│  React + Vite    │         │  Express + Node   │         │  Cluster M0 Free │
│  Static hosting  │         │  Socket.io        │         │                  │
└─────────────────┘         └──────────────────┘         └──────────────────┘
     ↑                              ↑
     │                              │
  vercel.json                  render.yaml
  (rewrites API calls)         (service config)
```

| Thành phần | Platform | Thư mục   | URL mẫu                                |
| ---------- | -------- | --------- | --------------------------------------- |
| Frontend   | Vercel   | `client/` | `https://geoconnect.vercel.app`         |
| Backend    | Render   | `server/` | `https://geoconnect-api.onrender.com`   |
| Database   | Atlas    | —         | `mongodb+srv://...@cluster.mongodb.net` |

---

## 2. Chuẩn Bị Trước Khi Deploy

### Tài khoản cần có

- [x] **GitHub** — push code lên repository
- [x] **Vercel** — [vercel.com](https://vercel.com) (đăng nhập bằng GitHub)
- [x] **Render** — [render.com](https://render.com) (đăng nhập bằng GitHub)
- [x] **MongoDB Atlas** — [cloud.mongodb.com](https://cloud.mongodb.com) (miễn phí tier M0)

### Push code lên GitHub

```bash
# Nếu chưa có remote
git remote add origin https://github.com/YOUR_USERNAME/geoconnect.git

# Push toàn bộ code
git add .
git commit -m "chore: prepare for deployment"
git push -u origin main
```

---

## 3. Bước 1: Tạo MongoDB Atlas Database

### 3.1. Tạo Cluster

1. Đăng nhập [cloud.mongodb.com](https://cloud.mongodb.com)
2. Click **"Build a Database"**
3. Chọn **M0 Free Tier** (miễn phí)
4. Chọn cloud provider: **AWS**
5. Chọn region gần nhất (ví dụ: `us-east-1` hoặc `ap-southeast-1`)
6. Đặt tên cluster: `geoconnect-cluster`
7. Click **"Create Deployment"**

### 3.2. Tạo Database User

1. Vào **Database Access** (menu trái)
2. Click **"Add New Database User"**
3. Chọn **Password** authentication
4. Username: `geoconnect-admin`
5. Password: **tạo password mạnh** (click "Autogenerate Secure Password" và **lưu lại**)
6. Database User Privileges: **Atlas admin** (hoặc Read and write to any database)
7. Click **"Add User"**

### 3.3. Cho Phép Network Access

1. Vào **Network Access** (menu trái)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (IP: `0.0.0.0/0`)
   > ⚠️ Cần thiết vì Render dùng dynamic IP. Bảo mật bằng username/password.
4. Click **"Confirm"**

### 3.4. Lấy Connection String

1. Vào **Database** → click **"Connect"** trên cluster
2. Chọn **"Drivers"**
3. Copy connection string, có dạng:

```
mongodb+srv://geoconnect-admin:<password>@geoconnect-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=geoconnect-cluster
```

4. **Thay `<password>`** bằng password đã tạo ở bước 3.2
5. **Thêm tên database** vào URL:

```
mongodb+srv://geoconnect-admin:YOUR_PASSWORD@geoconnect-cluster.xxxxx.mongodb.net/geoconnect?retryWrites=true&w=majority&appName=geoconnect-cluster
```

> Lưu lại URL này — sẽ dùng cho biến `MONGODB_URI` ở Render.

---

## 4. Bước 2: Deploy Backend lên Render

### 4.1. Tạo Web Service

1. Đăng nhập [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Kết nối GitHub repo → chọn repo `geoconnect`
4. Cấu hình:

| Trường              | Giá trị                  |
| ------------------- | ------------------------ |
| **Name**            | `geoconnect-api`         |
| **Region**          | Oregon (US West) hoặc Singapore |
| **Branch**          | `main`                   |
| **Root Directory**  | `server`                 |
| **Runtime**         | `Node`                   |
| **Build Command**   | `npm install`            |
| **Start Command**   | `npm start`              |
| **Instance Type**   | Free (hoặc Starter $7/tháng nếu cần tốc độ) |

### 4.2. Thêm Biến Môi Trường trên Render

Vào tab **"Environment"** → **"Add Environment Variable"**

#### Biến BẮT BUỘC (không có sẽ lỗi)

| Key                  | Value                                           | Ghi chú                              |
| -------------------- | ----------------------------------------------- | ------------------------------------- |
| `NODE_ENV`           | `production`                                    | Bật production mode                   |
| `PORT`               | `10000`                                         | Render mặc định dùng port 10000      |
| `MONGODB_URI`        | `mongodb+srv://...` (từ bước 3.4)               | Connection string MongoDB Atlas       |
| `JWT_ACCESS_SECRET`  | *(tự tạo chuỗi ngẫu nhiên 64 ký tự)*           | Dùng `openssl rand -hex 32` để tạo   |
| `JWT_REFRESH_SECRET` | *(tự tạo chuỗi ngẫu nhiên 64 ký tự, KHÁC secret trên)* | Dùng `openssl rand -hex 32` để tạo   |
| `CLIENT_URL`         | `https://geoconnect.vercel.app`                 | URL frontend trên Vercel (cập nhật sau khi deploy) |

> **Tạo secret ngẫu nhiên:**
> ```bash
> # Chạy 2 lần, mỗi lần cho 1 secret
> openssl rand -hex 32
> # Kết quả ví dụ: a3f8b2c1d4e5f6789012345678901234abcdef0123456789abcdef0123456789
> ```
> Hoặc vào [randomkeygen.com](https://randomkeygen.com) → copy 1 chuỗi 256-bit.

#### Biến TÙY CHỌN (thêm khi cần tính năng)

| Key                    | Value                                           | Tính năng             |
| ---------------------- | ----------------------------------------------- | --------------------- |
| `GOOGLE_CLIENT_ID`     | *(từ Google Cloud Console)*                     | Đăng nhập bằng Google |
| `GOOGLE_CLIENT_SECRET` | *(từ Google Cloud Console)*                     | Đăng nhập bằng Google |
| `GOOGLE_CALLBACK_URL`  | `https://geoconnect-api.onrender.com/api/auth/google/callback` | Google OAuth callback |
| `GITHUB_CLIENT_ID`     | *(từ GitHub Developer Settings)*                | Đăng nhập bằng GitHub |
| `GITHUB_CLIENT_SECRET` | *(từ GitHub Developer Settings)*                | Đăng nhập bằng GitHub |
| `GITHUB_CALLBACK_URL`  | `https://geoconnect-api.onrender.com/api/auth/github/callback` | GitHub OAuth callback |
| `CLOUDINARY_CLOUD_NAME`| *(từ Cloudinary Dashboard)*                     | Upload ảnh            |
| `CLOUDINARY_API_KEY`   | *(từ Cloudinary Dashboard)*                     | Upload ảnh            |
| `CLOUDINARY_API_SECRET`| *(từ Cloudinary Dashboard)*                     | Upload ảnh            |
| `EMAIL_HOST`           | `smtp.gmail.com`                                | Gửi email             |
| `EMAIL_PORT`           | `587`                                           | Gửi email             |
| `EMAIL_USER`           | *(email Gmail của bạn)*                         | Gửi email             |
| `EMAIL_PASS`           | *(App Password từ Google)*                      | Gửi email             |
| `EMAIL_FROM`           | `GeoConnect <noreply@geoconnect.app>`           | Tên hiển thị email    |
| `REDIS_URL`            | *(từ Redis Cloud hoặc Render Redis)*            | Rate limiting + cache |
| `JWT_ACCESS_EXPIRES_IN`| `15m`                                           | Thời hạn access token |
| `JWT_REFRESH_EXPIRES_IN`| `7d`                                           | Thời hạn refresh token|

### 4.3. Deploy

1. Click **"Create Web Service"**
2. Render sẽ tự động build và deploy
3. Chờ log hiện **"Your service is live"**
4. **Lưu lại URL** backend, ví dụ: `https://geoconnect-api.onrender.com`

### 4.4. Kiểm tra Backend hoạt động

Mở browser hoặc dùng curl:

```bash
curl https://geoconnect-api.onrender.com/api/auth/guest -X POST
```

Kết quả mong đợi (JSON với user và token):
```json
{
  "status": "success",
  "data": {
    "user": { "_id": "...", "name": "Guest_...", "isGuest": true },
    "accessToken": "eyJhbG..."
  }
}
```

> ⚠️ **Render Free Tier:** Server sẽ "ngủ" sau 15 phút không có request. Lần đầu truy cập sau khi ngủ sẽ mất ~30-60 giây để "thức dậy". Nâng cấp lên Starter ($7/tháng) để server luôn chạy.

---

## 5. Bước 3: Deploy Frontend lên Vercel

### 5.1. Import Project

1. Đăng nhập [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import từ GitHub → chọn repo `geoconnect`
4. Cấu hình:

| Trường               | Giá trị                |
| -------------------- | ---------------------- |
| **Framework Preset** | Vite                   |
| **Root Directory**   | `client`               |
| **Build Command**    | `npm run build`        |
| **Output Directory** | `dist`                 |
| **Install Command**  | `npm install`          |
| **Node.js Version**  | 20.x                  |

### 5.2. Thêm Biến Môi Trường trên Vercel

Vào **"Environment Variables"** (trong quá trình setup hoặc Settings → Environment Variables sau khi deploy):

| Key                  | Value                                         | Environment         | Ghi chú                    |
| -------------------- | --------------------------------------------- | ------------------- | --------------------------- |
| `VITE_API_URL`       | `https://geoconnect-api.onrender.com`         | Production, Preview | URL backend trên Render     |
| `VITE_GOOGLE_MAPS_KEY` | *(tùy chọn — API key Google Maps)*          | Production, Preview | Chỉ cần nếu dùng Google Maps |
| `VITE_MAPBOX_TOKEN`  | *(tùy chọn — Mapbox token)*                  | Production, Preview | Chỉ cần nếu dùng Mapbox    |

> **Quan trọng:** Biến `VITE_API_URL` PHẢI khớp với URL backend trên Render. Ví dụ:
> - Backend URL: `https://geoconnect-api.onrender.com`
> - `VITE_API_URL`: `https://geoconnect-api.onrender.com`
> - **KHÔNG** thêm `/api` vào cuối — code tự thêm prefix `/api`.

### 5.3. Kiểm tra `vercel.json`

File `client/vercel.json` đã được cấu hình sẵn. Đảm bảo URL backend đúng:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://geoconnect-api.onrender.com/api/$1"
    },
    {
      "source": "/socket.io/(.*)",
      "destination": "https://geoconnect-api.onrender.com/socket.io/$1"
    },
    {
      "source": "/((?!assets|vite\\.svg).*)",
      "destination": "/index.html"
    }
  ]
}
```

> **Nếu backend URL khác** `geoconnect-api.onrender.com`, sửa 2 dòng `destination` trong file này trước khi deploy.

### 5.4. Deploy

1. Click **"Deploy"**
2. Vercel tự build + deploy
3. Chờ status **"Ready"**
4. **Lưu lại URL** frontend, ví dụ: `https://geoconnect.vercel.app`

### 5.5. Cập nhật `CLIENT_URL` trên Render

Quay lại Render Dashboard → service `geoconnect-api` → **Environment** → sửa:

| Key          | Giá trị cũ                  | Giá trị mới                        |
| ------------ | --------------------------- | ---------------------------------- |
| `CLIENT_URL` | `http://localhost:5173`     | `https://geoconnect.vercel.app`    |

Click **"Save Changes"** → Render tự redeploy.

> Bước này **rất quan trọng** — nếu không sửa, CORS sẽ block tất cả request từ frontend.

---

## 6. Bước 4: Cấu Hình OAuth (Google & GitHub)

> Bỏ qua bước này nếu chưa cần đăng nhập bằng Google/GitHub.

### 6.1. Google OAuth

1. Vào [console.cloud.google.com](https://console.cloud.google.com)
2. Tạo project mới hoặc chọn project hiện tại
3. Vào **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
5. Application type: **Web application**
6. Cấu hình:

| Trường                          | Giá trị                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| **Authorized JavaScript origins** | `https://geoconnect.vercel.app`                                 |
| **Authorized redirect URIs**    | `https://geoconnect-api.onrender.com/api/auth/google/callback`   |

7. Copy **Client ID** và **Client Secret**
8. Thêm vào Render Environment:

```
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=https://geoconnect-api.onrender.com/api/auth/google/callback
```

### 6.2. GitHub OAuth

1. Vào [github.com/settings/developers](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Cấu hình:

| Trường                          | Giá trị                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| **Application name**            | GeoConnect                                                       |
| **Homepage URL**                | `https://geoconnect.vercel.app`                                  |
| **Authorization callback URL**  | `https://geoconnect-api.onrender.com/api/auth/github/callback`   |

4. Copy **Client ID** → click **"Generate a new client secret"** → copy **Client Secret**
5. Thêm vào Render Environment:

```
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_CALLBACK_URL=https://geoconnect-api.onrender.com/api/auth/github/callback
```

---

## 7. Bước 5: Cấu Hình Cloudinary (Upload Ảnh)

> Bỏ qua nếu chưa cần upload avatar/ảnh.

1. Đăng ký [cloudinary.com](https://cloudinary.com) (miễn phí)
2. Vào **Dashboard** → copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Thêm vào Render Environment:

```
CLOUDINARY_CLOUD_NAME=dxxxxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 8. Bước 6: Cấu Hình Email (SMTP)

> Bỏ qua nếu chưa cần gửi email (xác minh, đặt lại mật khẩu).

### Dùng Gmail

1. Bật **2-Factor Authentication** trên Google Account
2. Vào [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Tạo App Password cho "Mail" → copy password 16 ký tự
4. Thêm vào Render Environment:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=GeoConnect <noreply@geoconnect.app>
```

> **Lưu ý:** `EMAIL_PASS` là **App Password**, KHÔNG phải mật khẩu Gmail thông thường.

---

## 9. Bước 7: Kiểm Tra Sau Deploy

### Checklist

| # | Kiểm tra                                   | Cách test                                               | Kết quả mong đợi              |
|---|--------------------------------------------|---------------------------------------------------------|-------------------------------|
| 1 | Landing page load                          | Mở `https://geoconnect.vercel.app`                      | Hiện landing page             |
| 2 | Guest login                                | Click "Start Exploring" trên landing                    | Chuyển đến map, tự đăng nhập guest |
| 3 | API kết nối                                | Mở DevTools → Network → xem request `/api/auth/guest`   | Status 201, có token          |
| 4 | Map load                                   | Xem bản đồ có hiện tiles không                          | Map tiles load đúng           |
| 5 | Socket.io                                  | Mở DevTools → Network → WS tab                         | Socket connected              |
| 6 | Đăng ký tài khoản                          | Vào `/register` → tạo account                           | Đăng ký thành công            |
| 7 | Đăng nhập                                  | Vào `/login` → đăng nhập                                | Chuyển đến `/map`             |
| 8 | Google OAuth *(nếu đã cấu hình)*          | Click "Đăng nhập bằng Google"                           | Redirect Google → quay lại app |
| 9 | Upload ảnh *(nếu đã cấu hình Cloudinary)* | Đổi avatar trong Settings                               | Ảnh upload thành công         |
| 10| CORS check                                | DevTools → Console → không có CORS error                | Không có lỗi CORS             |

### Debug CORS

Nếu thấy lỗi CORS trong console:

```
Access to XMLHttpRequest at 'https://geoconnect-api.onrender.com/api/...'
from origin 'https://geoconnect.vercel.app' has been blocked by CORS policy
```

**Nguyên nhân:** `CLIENT_URL` trên Render chưa đúng.

**Fix:** Vào Render → Environment → đảm bảo:
```
CLIENT_URL=https://geoconnect.vercel.app
```
(KHÔNG có dấu `/` ở cuối)

---

## 10. Bảng Tổng Hợp Biến Môi Trường

### Render (Backend) — Tất Cả Biến

| Biến                     | Bắt buộc | Giá trị mẫu                                                       |
| ------------------------ | -------- | ------------------------------------------------------------------ |
| `NODE_ENV`               | Có       | `production`                                                       |
| `PORT`                   | Có       | `10000`                                                            |
| `MONGODB_URI`            | Có       | `mongodb+srv://user:pass@cluster.mongodb.net/geoconnect?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET`      | Có       | *(chuỗi hex 64 ký tự)*                                            |
| `JWT_REFRESH_SECRET`     | Có       | *(chuỗi hex 64 ký tự, khác secret trên)*                          |
| `CLIENT_URL`             | Có       | `https://geoconnect.vercel.app`                                    |
| `JWT_ACCESS_EXPIRES_IN`  | Không    | `15m` (mặc định)                                                  |
| `JWT_REFRESH_EXPIRES_IN` | Không    | `7d` (mặc định)                                                   |
| `GOOGLE_CLIENT_ID`       | Không    | `123...apps.googleusercontent.com`                                 |
| `GOOGLE_CLIENT_SECRET`   | Không    | `GOCSPX-...`                                                      |
| `GOOGLE_CALLBACK_URL`    | Không    | `https://geoconnect-api.onrender.com/api/auth/google/callback`     |
| `GITHUB_CLIENT_ID`       | Không    | `Iv1.xxx`                                                         |
| `GITHUB_CLIENT_SECRET`   | Không    | *(40 ký tự)*                                                      |
| `GITHUB_CALLBACK_URL`    | Không    | `https://geoconnect-api.onrender.com/api/auth/github/callback`     |
| `CLOUDINARY_CLOUD_NAME`  | Không    | `dxxxxxxxxx`                                                      |
| `CLOUDINARY_API_KEY`     | Không    | `123456789012345`                                                 |
| `CLOUDINARY_API_SECRET`  | Không    | *(chuỗi dài)*                                                    |
| `EMAIL_HOST`             | Không    | `smtp.gmail.com`                                                  |
| `EMAIL_PORT`             | Không    | `587`                                                             |
| `EMAIL_USER`             | Không    | `your-email@gmail.com`                                            |
| `EMAIL_PASS`             | Không    | *(App Password 16 ký tự)*                                        |
| `EMAIL_FROM`             | Không    | `GeoConnect <noreply@geoconnect.app>`                             |
| `REDIS_URL`              | Không    | `redis://...`                                                     |

### Vercel (Frontend) — Tất Cả Biến

| Biến                   | Bắt buộc | Giá trị mẫu                                  |
| ---------------------- | -------- | --------------------------------------------- |
| `VITE_API_URL`         | Có       | `https://geoconnect-api.onrender.com`         |
| `VITE_GOOGLE_MAPS_KEY` | Không    | *(API key Google Maps)*                       |
| `VITE_MAPBOX_TOKEN`    | Không    | *(Mapbox access token)*                       |

---

## 11. Xử Lý Lỗi Thường Gặp

### Backend không start trên Render

**Lỗi:** `MongoServerError: bad auth` hoặc `ECONNREFUSED`
**Fix:** Kiểm tra `MONGODB_URI` — password có ký tự đặc biệt phải URL-encode (`@` → `%40`, `#` → `%23`)

**Lỗi:** `Error: secretOrPrivateKey must have a value`
**Fix:** Thiếu `JWT_ACCESS_SECRET` hoặc `JWT_REFRESH_SECRET` — thêm vào Render Environment

**Lỗi:** `Cannot find module`
**Fix:** Đảm bảo Root Directory là `server` và Build Command là `npm install`

### Frontend blank page

**Lỗi:** Trang trắng, không có nội dung
**Fix:** Kiểm tra Vercel → Settings → Root Directory phải là `client`

**Lỗi:** 404 trên refresh
**Fix:** Đảm bảo `client/vercel.json` tồn tại với rewrite `/(.*) → /index.html`

### API calls bị lỗi 502/503

**Lỗi:** Render server đang "ngủ" (Free Tier)
**Fix:** Chờ 30-60 giây, server sẽ tự wake up. Hoặc nâng cấp lên Starter plan.

### Socket.io không kết nối

**Lỗi:** WebSocket connection failed
**Fix:** Kiểm tra `vercel.json` có rewrite cho `/socket.io/(.*)` không

### OAuth redirect lỗi

**Lỗi:** `redirect_uri_mismatch`
**Fix:** URL callback trong Google/GitHub console phải **chính xác** khớp với `GOOGLE_CALLBACK_URL` / `GITHUB_CALLBACK_URL` trên Render

---

## 12. Cập Nhật & Redeploy

### Tự động deploy (khuyên dùng)

Cả Vercel và Render đều hỗ trợ **auto-deploy** khi push code lên GitHub:

```bash
# Sửa code → commit → push
git add .
git commit -m "feat: new feature"
git push origin main
```

- **Vercel:** Tự build + deploy trong ~1-2 phút
- **Render:** Tự build + deploy trong ~3-5 phút

### Manual redeploy

**Vercel:** Dashboard → project → **"Redeploy"**
**Render:** Dashboard → service → **"Manual Deploy"** → **"Deploy latest commit"**

### Thay đổi biến môi trường

- **Render:** Environment tab → sửa value → Save → tự redeploy
- **Vercel:** Settings → Environment Variables → sửa → **phải Redeploy** thủ công (biến mới chỉ có hiệu lực sau khi build lại)

---

## Sơ Đồ Luồng Deploy

```
GitHub Repo (main branch)
    │
    ├──push──► Vercel (auto-detect: client/)
    │              ├── npm install
    │              ├── npm run build (Vite)
    │              ├── Deploy dist/ to CDN
    │              └── Rewrites: /api/* → Render
    │
    └──push──► Render (root: server/)
                   ├── npm install
                   ├── node src/server.js
                   ├── Connect to MongoDB Atlas
                   └── Listen on PORT (10000)
```

---

> **Thời gian ước tính deploy lần đầu: 30-45 phút** (bao gồm tạo tài khoản, database, và cấu hình).
>
> Sau lần đầu, mỗi lần update chỉ cần `git push` — auto deploy trong 2-5 phút.
