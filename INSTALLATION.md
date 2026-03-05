# GeoConnect - Hướng Dẫn Cài Đặt Chi Tiết

## Mục Lục

- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt Nhanh](#cài-đặt-nhanh)
- [Cài Đặt Chi Tiết](#cài-đặt-chi-tiết)
  - [1. Clone Project](#1-clone-project)
  - [2. Cài Đặt Dependencies](#2-cài-đặt-dependencies)
  - [3. Cấu Hình Biến Môi Trường](#3-cấu-hình-biến-môi-trường)
  - [4. Thiết Lập MongoDB](#4-thiết-lập-mongodb)
  - [5. Thiết Lập Cloudinary](#5-thiết-lập-cloudinary)
  - [6. Thiết Lập OAuth (Tùy chọn)](#6-thiết-lập-oauth-tùy-chọn)
  - [7. Chạy Ứng Dụng](#7-chạy-ứng-dụng)
- [Biến Môi Trường Chi Tiết](#biến-môi-trường-chi-tiết)
  - [Server (.env)](#server-env)
  - [Client (.env)](#client-env)
- [Deployment](#deployment)
  - [Deploy Frontend lên Vercel](#deploy-frontend-lên-vercel)
  - [Deploy Backend lên Render](#deploy-backend-lên-render)
- [Khắc Phục Sự Cố](#khắc-phục-sự-cố)

---

## Yêu Cầu Hệ Thống

| Công cụ    | Phiên bản tối thiểu | Kiểm tra               |
| ---------- | -------------------- | ---------------------- |
| **Node.js** | >= 20.19.0          | `node --version`       |
| **npm**     | >= 10.0.0           | `npm --version`        |
| **MongoDB** | >= 6.0              | `mongod --version`     |
| **Git**     | >= 2.30             | `git --version`        |

> **Lưu ý:** Có thể dùng MongoDB Atlas (cloud) thay vì cài MongoDB local.

---

## Cài Đặt Nhanh

```bash
# 1. Clone project
git clone <repo-url> geoconnect
cd geoconnect

# 2. Cài tất cả dependencies
npm run install:all

# 3. Copy file .env mẫu
cp server/.env.example server/.env
cp client/.env.example client/.env

# 4. Sửa server/.env (thêm MongoDB URI, JWT secrets, v.v.)
# 5. Chạy cả frontend + backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/auth

---

## Cài Đặt Chi Tiết

### 1. Clone Project

```bash
git clone <repo-url> geoconnect
cd geoconnect
```

Cấu trúc thư mục:

```
geoconnect/
├── client/          # React frontend (Vite + Tailwind)
├── server/          # Node.js backend (Express + MongoDB)
├── package.json     # Root scripts (concurrently)
├── README.md
└── INSTALLATION.md  # File này
```

### 2. Cài Đặt Dependencies

**Cách 1: Cài tất cả cùng lúc (Khuyến nghị)**

```bash
npm run install:all
```

**Cách 2: Cài từng phần**

```bash
# Root dependencies (concurrently)
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

### 3. Cấu Hình Biến Môi Trường

#### Server

```bash
cp server/.env.example server/.env
```

Mở `server/.env` và cập nhật các giá trị:

```env
# ── Server ─────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── Database ───────────────────────────────────────────
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/geoconnect

# Hoặc MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/geoconnect?retryWrites=true&w=majority

# ── JWT Authentication ─────────────────────────────────
# Tạo secret ngẫu nhiên: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=your_access_secret_here_change_this
JWT_REFRESH_SECRET=your_refresh_secret_here_change_this
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── OAuth (Tùy chọn - bỏ qua nếu chỉ dùng email/guest) ─
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# ── Cloudinary (Upload ảnh) ────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Client URL (CORS) ─────────────────────────────────
CLIENT_URL=http://localhost:5173
```

#### Client

```bash
cp client/.env.example client/.env
```

Mở `client/.env` và cập nhật:

```env
# API & Socket server URL
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000

# Vị trí mặc định khi mở bản đồ [lat, lng]
# Mặc định: TP. Hồ Chí Minh
VITE_MAP_DEFAULT_CENTER=[10.7769,106.7009]
VITE_MAP_DEFAULT_ZOOM=13
```

### 4. Thiết Lập MongoDB

#### Cách A: MongoDB Local

1. Tải và cài [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Khởi động MongoDB service:

```bash
# Windows
net start MongoDB

# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

3. Kiểm tra kết nối:

```bash
mongosh
> show dbs
```

4. Đảm bảo `MONGODB_URI=mongodb://localhost:27017/geoconnect` trong `server/.env`

> Database `geoconnect` sẽ tự động được tạo khi server kết nối lần đầu.

#### Cách B: MongoDB Atlas (Cloud - Khuyến nghị cho production)

1. Đăng ký tại [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Tạo cluster mới (Free Tier M0 miễn phí)
3. Tạo Database User:
   - Database Access → Add New Database User
   - Chọn Password authentication
   - Ghi nhớ username và password
4. Whitelist IP:
   - Network Access → Add IP Address
   - Development: `0.0.0.0/0` (cho phép tất cả)
   - Production: Chỉ IP server cụ thể
5. Lấy Connection String:
   - Clusters → Connect → Drivers → Copy connection string
   - Thay `<password>` bằng password đã tạo
6. Cập nhật `server/.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/geoconnect?retryWrites=true&w=majority
```

### 5. Thiết Lập Cloudinary

Cloudinary dùng để upload và lưu trữ ảnh (avatar, pin images, post images).

1. Đăng ký tại [cloudinary.com](https://cloudinary.com/) (Free tier: 25GB storage, 25GB bandwidth/tháng)
2. Vào Dashboard, lấy thông tin:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`
3. Cập nhật `server/.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret
```

> **Không có Cloudinary?** App vẫn chạy được, chỉ tính năng upload ảnh sẽ không hoạt động.

### 6. Thiết Lập OAuth (Tùy chọn)

#### Google OAuth

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. APIs & Services → Credentials → Create Credentials → OAuth Client ID
4. Application type: **Web application**
5. Authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://your-api-domain.com/api/auth/google/callback`
6. Copy Client ID và Client Secret vào `server/.env`

#### GitHub OAuth

1. Vào [GitHub Developer Settings](https://github.com/settings/developers)
2. OAuth Apps → New OAuth App
3. Cấu hình:
   - Application name: `GeoConnect`
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5000/api/auth/github/callback`
4. Copy Client ID và Client Secret vào `server/.env`

> **Không có OAuth?** App vẫn chạy được với đăng ký email/password và chế độ Guest.

### 7. Chạy Ứng Dụng

#### Chạy cả hai (Khuyến nghị)

```bash
# Từ thư mục gốc
npm run dev
```

Lệnh này dùng `concurrently` để chạy đồng thời server và client.

#### Chạy riêng từng phần

```bash
# Terminal 1 - Backend
npm run dev:server
# hoặc: cd server && npm run dev

# Terminal 2 - Frontend
npm run dev:client
# hoặc: cd client && npm run dev
```

#### Kiểm tra

| Service  | URL                              | Kết quả mong đợi           |
| -------- | -------------------------------- | --------------------------- |
| Frontend | http://localhost:5173            | Trang login GeoConnect      |
| Backend  | http://localhost:5000            | Server running              |
| API Test | http://localhost:5000/api/auth   | JSON response               |
| MongoDB  | Xem console server              | "MongoDB connected" message |

---

## Biến Môi Trường Chi Tiết

### Server (.env)

| Biến | Bắt buộc | Mặc định | Mô tả |
| ---- | -------- | -------- | ----- |
| `PORT` | Không | `5000` | Port chạy backend server |
| `NODE_ENV` | Không | `development` | Môi trường: `development` / `production` |
| `MONGODB_URI` | **Có** | - | Connection string MongoDB. Local: `mongodb://localhost:27017/geoconnect`. Atlas: `mongodb+srv://...` |
| `JWT_ACCESS_SECRET` | **Có** | - | Secret key để ký JWT access token. Nên dùng chuỗi random 64 bytes. Token hết hạn theo `JWT_ACCESS_EXPIRES_IN` |
| `JWT_REFRESH_SECRET` | **Có** | - | Secret key để ký JWT refresh token. Khác với access secret. Token hết hạn theo `JWT_REFRESH_EXPIRES_IN` |
| `JWT_ACCESS_EXPIRES_IN` | Không | `15m` | Thời gian sống access token. Định dạng: `15m`, `1h`, `7d` |
| `JWT_REFRESH_EXPIRES_IN` | Không | `7d` | Thời gian sống refresh token. Dài hơn access token |
| `GOOGLE_CLIENT_ID` | Không | - | Google OAuth 2.0 Client ID. Bỏ trống nếu không dùng Google login |
| `GOOGLE_CLIENT_SECRET` | Không | - | Google OAuth 2.0 Client Secret |
| `GOOGLE_CALLBACK_URL` | Không | - | URL callback sau khi Google auth. Dev: `http://localhost:5000/api/auth/google/callback` |
| `GITHUB_CLIENT_ID` | Không | - | GitHub OAuth App Client ID. Bỏ trống nếu không dùng GitHub login |
| `GITHUB_CLIENT_SECRET` | Không | - | GitHub OAuth App Client Secret |
| `GITHUB_CALLBACK_URL` | Không | - | URL callback sau khi GitHub auth. Dev: `http://localhost:5000/api/auth/github/callback` |
| `CLOUDINARY_CLOUD_NAME` | Không | - | Tên cloud Cloudinary. Bỏ trống nếu không cần upload ảnh |
| `CLOUDINARY_API_KEY` | Không | - | API Key từ Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | Không | - | API Secret từ Cloudinary Dashboard |
| `CLIENT_URL` | Không | `http://localhost:5173` | URL frontend cho CORS whitelist. Production: URL Vercel |

#### Tạo JWT Secret ngẫu nhiên

```bash
# Chạy 2 lần để tạo 2 secret khác nhau
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Client (.env)

| Biến | Bắt buộc | Mặc định | Mô tả |
| ---- | -------- | -------- | ----- |
| `VITE_API_URL` | **Có** | - | URL backend API. Dev: `http://localhost:5000`. Prod: URL Render |
| `VITE_SOCKET_URL` | **Có** | - | URL Socket.io server. Thường cùng với API URL |
| `VITE_MAP_DEFAULT_CENTER` | Không | `[10.7769,106.7009]` | Tọa độ mặc định khi mở bản đồ. Format: `[latitude,longitude]`. Mặc định: TP.HCM |
| `VITE_MAP_DEFAULT_ZOOM` | Không | `13` | Mức zoom mặc định (1-18). 13 = mức thành phố |

> **Lưu ý quan trọng:** Tất cả biến client phải bắt đầu bằng `VITE_` để Vite đưa vào bundle. Sau khi thay đổi biến client, cần restart `npm run dev`.

---

## Deployment

### Deploy Frontend lên Vercel

#### Cách 1: Vercel CLI

```bash
# Cài Vercel CLI
npm i -g vercel

# Deploy từ thư mục client
cd client
vercel
```

#### Cách 2: Vercel Dashboard (Khuyến nghị)

1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com) → Import Project
3. Cấu hình:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Thêm Environment Variables:
   - `VITE_API_URL` = URL backend Render (e.g. `https://geoconnect-api.onrender.com`)
   - `VITE_SOCKET_URL` = Cùng URL với API
   - `VITE_MAP_DEFAULT_CENTER` = `[10.7769,106.7009]`
   - `VITE_MAP_DEFAULT_ZOOM` = `13`
5. Deploy

File `client/vercel.json` đã được cấu hình sẵn SPA rewrites:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Deploy Backend lên Render

#### Cách 1: Render Dashboard (Khuyến nghị)

1. Push code lên GitHub
2. Vào [render.com](https://render.com) → New Web Service
3. Connect repository
4. Cấu hình:
   - **Name:** `geoconnect-api`
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Thêm tất cả Environment Variables từ bảng Server ở trên
6. **Quan trọng:** Cập nhật các URL cho production:
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = URL Vercel frontend
   - `GOOGLE_CALLBACK_URL` = `https://geoconnect-api.onrender.com/api/auth/google/callback`
   - `GITHUB_CALLBACK_URL` = `https://geoconnect-api.onrender.com/api/auth/github/callback`

#### Cách 2: Dùng render.yaml (Auto-config)

File `server/render.yaml` đã được tạo sẵn:

```yaml
services:
  - type: web
    name: geoconnect-api
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      # Thêm các biến khác trong Render Dashboard
```

### Checklist Sau Deploy

- [ ] Frontend load được tại URL Vercel
- [ ] Mở Console (F12) không có lỗi CORS
- [ ] Đăng ký tài khoản mới thành công
- [ ] Đăng nhập thành công
- [ ] Bản đồ hiển thị tiles đúng
- [ ] Tạo pin/post thành công
- [ ] Upload ảnh hoạt động (nếu có Cloudinary)
- [ ] OAuth login hoạt động (nếu đã cấu hình)
- [ ] Socket.io kết nối (kiểm tra tab Network > WS)

---

## Khắc Phục Sự Cố

### MongoDB không kết nối được

```
Error: MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Giải pháp:**
- Kiểm tra MongoDB đang chạy: `mongosh` hoặc `mongo`
- Windows: Services → MongoDB → Start
- Hoặc dùng MongoDB Atlas thay thế

### CORS Error trên browser

```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Giải pháp:**
- Kiểm tra `CLIENT_URL` trong `server/.env` khớp với URL frontend
- Development: `CLIENT_URL=http://localhost:5173`
- Production: `CLIENT_URL=https://your-app.vercel.app`

### JWT Token hết hạn liên tục

**Giải pháp:**
- Tăng `JWT_ACCESS_EXPIRES_IN` (mặc định 15 phút)
- App tự động refresh token, kiểm tra `JWT_REFRESH_SECRET` đã được set

### Cloudinary upload thất bại

```
Error: Must supply cloud_name
```

**Giải pháp:**
- Kiểm tra 3 biến Cloudinary đã được set trong `server/.env`
- Đảm bảo không có dấu cách thừa

### Bản đồ không hiển thị

**Giải pháp:**
- Kiểm tra kết nối internet (map tiles load từ OpenStreetMap)
- Kiểm tra Console cho lỗi Leaflet
- Đảm bảo CSS Leaflet được load (`index.html` đã include)

### OAuth redirect sai

**Giải pháp:**
- Kiểm tra callback URL trong `.env` khớp với URL đã đăng ký trên Google/GitHub
- Development vs Production URL phải khớp chính xác

### Port đang bị dùng

```
Error: listen EADDRINUSE :::5000
```

**Giải pháp:**
```bash
# Tìm process đang dùng port
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Build client thất bại

```bash
# Xóa node_modules và cài lại
cd client
rm -rf node_modules package-lock.json
npm install

# Build lại
npm run build
```

---

## Scripts Có Sẵn

### Root (thư mục gốc)

| Script | Lệnh | Mô tả |
| ------ | ----- | ----- |
| `npm run dev` | `concurrently "npm run dev:server" "npm run dev:client"` | Chạy cả server + client |
| `npm run dev:server` | `cd server && npm run dev` | Chạy server với nodemon |
| `npm run dev:client` | `cd client && npm run dev` | Chạy client với Vite |
| `npm run install:all` | `npm install && cd server && npm install && cd ../client && npm install` | Cài tất cả deps |
| `npm run build` | `cd client && npm run build` | Build frontend cho production |
| `npm start` | `cd server && npm start` | Chạy server production |

### Client

| Script | Lệnh | Mô tả |
| ------ | ----- | ----- |
| `npm run dev` | `vite` | Dev server tại port 5173 |
| `npm run build` | `vite build` | Build production vào `dist/` |
| `npm run preview` | `vite preview` | Preview bản build local |

### Server

| Script | Lệnh | Mô tả |
| ------ | ----- | ----- |
| `npm run dev` | `nodemon src/server.js` | Dev server với auto-reload |
| `npm start` | `node src/server.js` | Production server |

---

## Tech Stack

| Layer | Công nghệ | Phiên bản |
| ----- | --------- | --------- |
| **Frontend** | React + Vite | 18.3 / 5.4 |
| **State** | Redux Toolkit | 2.3 |
| **Map** | React Leaflet + Leaflet | 4.2 / 1.9 |
| **Styling** | Tailwind CSS | 3.4 |
| **Animation** | Framer Motion | 11.11 |
| **Forms** | React Hook Form + Zod | 7.53 / 3.23 |
| **Backend** | Express.js | 4.21 |
| **Database** | MongoDB + Mongoose | 8.8 |
| **Auth** | JWT + Passport.js | - |
| **Real-time** | Socket.io | 4.8 |
| **Upload** | Cloudinary + Multer | - |
| **Geospatial** | Turf.js + OSRM | 7.1 |

---

*Cập nhật lần cuối: 2026-03-11*
