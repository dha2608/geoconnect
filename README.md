# GeoConnect

> A location-based social network — discover places, share experiences, and connect with people nearby on an interactive map.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## ✨ Features

- 🗺️ **Interactive Map** — Browse and interact with a live OpenStreetMap canvas powered by Leaflet
- 📍 **Pin System** — Drop pins at any location with categories, descriptions, photos, and reviews
- 🔴 **Real-Time Location** — Live user presence on the map via Socket.io
- 👥 **Social Graph** — Follow users, view profiles, and build your network
- 💬 **Messaging** — Real-time direct messages and group conversations
- 📅 **Events** — Create location-pinned events with RSVP and map markers
- 🔐 **Authentication** — Email/password + Google & GitHub OAuth (Passport.js)
- 🌙 **Dark Glass UI** — Custom dark theme with glassmorphism and Framer Motion animations
- 📲 **PWA Ready** — Installable on mobile, offline shell caching via Service Worker

---

## 🛠 Tech Stack

| Layer      | Technology                                                   |
| ---------- | ------------------------------------------------------------ |
| Frontend   | React 18, Vite, Redux Toolkit, React Router v6, Tailwind CSS |
| Maps       | Leaflet.js, React Leaflet, OpenStreetMap, Nominatim, OSRM    |
| Animation  | Framer Motion                                                |
| Backend    | Node.js, Express, MongoDB, Mongoose                          |
| Real-time  | Socket.io (with per-user rate limiting)                      |
| Auth       | JWT (access/refresh rotation, Redis token blacklist), Passport.js (Google, GitHub OAuth) |
| State      | Redux Toolkit (createEntityAdapter, memoized selectors)      |
| Validation | Zod, React Hook Form                                         |
| Security   | Helmet, CORS, HPP, mongo-sanitize, xss-clean, rate limiting  |
| Deploy     | Vercel (frontend), Render (backend)                          |

---

## 🚀 Getting Started

See **[INSTALLATION.md](./INSTALLATION.md)** for full setup instructions.

### Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your credentials

# 3. Start development servers (client + server concurrently)
npm run dev
```

The client runs on **http://localhost:5173** and the server on **http://localhost:5000**.

### Available Scripts

| Command               | Description                           |
| --------------------- | ------------------------------------- |
| `npm run dev`         | Start client + server concurrently    |
| `npm run dev:client`  | Start Vite dev server only            |
| `npm run dev:server`  | Start Express server only             |
| `npm run build`       | Production build (client + server)    |
| `npm run install:all` | Install root, client, and server deps |

---

## 📁 Project Structure

```
geoconnect/
├── client/                  # React frontend (Vite)
│   ├── public/              # Static assets, manifest.json, sw.js
│   └── src/
│       ├── app/             # Redux store configuration
│       ├── components/      # Reusable UI components
│       ├── features/        # Feature modules (auth, map, pins, events…)
│       ├── hooks/           # Custom React hooks
│       ├── pages/           # Route-level page components
│       ├── styles/          # Global CSS + Tailwind config
│       └── utils/           # Shared utility functions
│
├── server/                  # Express backend
│   └── src/
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Express middleware (auth, error, upload)
│       ├── models/          # Mongoose schemas
│       ├── routes/          # API route definitions
│       ├── socket/          # Socket.io event handlers
│       └── utils/           # Server utilities
│
├── package.json             # Root scripts
└── README.md
```

See [server/README.md](./server/README.md) and [client/README.md](./client/README.md) for detailed documentation.

---

## 🌐 API Summary

Base URL: `https://geoconnect-api.onrender.com/api`

| Resource      | Count   | Key Endpoints                                                                 |
| ------------- | ------- | ----------------------------------------------------------------------------- |
| Auth          | 14      | register, login, OAuth (Google/GitHub), token refresh, password reset         |
| Users         | 18      | profile CRUD, follow/block, nearby users, settings                            |
| Pins          | 15      | CRUD, like/save, check-in, viewport/search/trending                           |
| Posts         | 12      | feed, CRUD, like, comments (separate collection)                              |
| Events        | 9       | CRUD, RSVP, viewport/search/upcoming                                          |
| Messages      | 7       | conversations, real-time messaging                                            |
| Notifications | 6       | list, read/clear, unread count                                                |
| Reviews       | 6       | CRUD, helpful votes                                                           |
| Collections   | 8       | CRUD, pin management                                                          |
| Reports       | 7       | content reporting (admin dashboard)                                           |
| Discover      | 4       | feed, recommendations, categories, suggested users                            |
| Geocode       | 2       | forward/reverse geocoding                                                     |
| **Total**     | **111** | See [server/README.md](./server/README.md) for full docs                      |

All protected routes require `Authorization: Bearer <token>`.

---

## 🔧 Recent Improvements

### Phase 1: Security & Stability
- Socket authorization checks + location privacy validation
- Origin-based CSRF protection, graceful shutdown handlers
- Stronger password policy (8+ chars, uppercase, number, special)
- Comprehensive input validation on all endpoints

### Phase 2: Performance & State Management
- Redux normalized stores with `createEntityAdapter` (pins, posts, events)
- Memoized selectors via `createSelector` — eliminates unnecessary re-renders
- `AbortController` on viewport-driven API calls
- Migrated 10+ components to use exported selectors

### Phase 3: Accessibility & UX
- `prefers-reduced-motion` support across all Framer Motion animations
- ARIA labels on all icon buttons, `focus-visible` ring styles
- Live region announcements for toast notifications
- Color contrast fixes (WCAG AA), tablet breakpoint support
- OAuth loading states

### Phase 4: Code Quality & DX
- `asyncHandler` utility — removed ~108 try-catch blocks from 13 controllers
- Consistent response format: `{ success, data, meta }`
- `AppError` class with standardized error codes
- Request ID tracing (`X-Request-ID`) on all responses
- Expanded settings validator (10 specific field checks)

### Phase 5: Scalability
- Comments moved to separate MongoDB collection (was embedded in posts)
- Redis-backed rate limiting (graceful fallback to in-memory)
- MongoDB transactions for atomic account deletion
- Redis token blacklist (revoke on logout/password change)
- Per-user socket event rate limiting
- Compound indexes for common query patterns

---

## ☁️ Deployment

| Target   | Service | Config              |
| -------- | ------- | ------------------- |
| Frontend | Vercel  | `client/` directory |
| Backend  | Render  | `server/render.yaml` |

```bash
# Build for production
npm run build
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push to branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please follow the existing code style and include relevant tests.

---

## 📄 License

[MIT](./LICENSE) © GeoConnect
