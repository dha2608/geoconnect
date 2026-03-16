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

## Features

- **Interactive Map** — Browse and interact with a live OpenStreetMap canvas powered by Leaflet, with smooth fly-to animations and viewport-driven data loading.
- **Pin System** — Drop pins at any location with categories (restaurant, hotel, coffee, etc.), descriptions, photos, reviews, and check-in support.
- **Real-Time Location** — Live user presence on the map via Socket.io with privacy-aware broadcasting to mutual followers only.
- **Social Graph** — Follow users, view profiles, block/unblock, and discover people nearby based on geolocation.
- **Messaging** — Real-time direct messages and group conversations with read receipts, typing indicators, and media sharing.
- **Events** — Create location-pinned events with RSVP functionality, date/time scheduling, and map markers.
- **Authentication** — Email/password registration with strong password policy, plus Google and GitHub OAuth via Passport.js. JWT access/refresh token rotation with Redis-backed revocation.
- **Dark Glass UI** — Custom dark theme with glassmorphism effects and Framer Motion animations. Supports `prefers-reduced-motion` for accessibility.
- **PWA Ready** — Installable on mobile with offline shell caching via Service Worker.
- **Discovery Feed** — Personalized recommendations, trending pins, suggested users, and category-based exploration.
- **Collections** — Save and organize favorite pins into named collections for easy access.
- **Content Reporting** — User-driven content moderation with admin review dashboard.

---

## Tech Stack

| Layer      | Technology                                                                               |
| ---------- | ---------------------------------------------------------------------------------------- |
| Frontend   | React 18, Vite 5, Redux Toolkit, React Router v6, Tailwind CSS 3                        |
| Maps       | Leaflet.js, React Leaflet, OpenStreetMap tiles, Nominatim geocoding, OSRM routing        |
| Animation  | Framer Motion (with reduced-motion support)                                              |
| Backend    | Node.js 20+, Express 4, MongoDB 6+ (Mongoose ODM)                                       |
| Real-time  | Socket.io 4 (JWT-authenticated connections, per-user rate limiting)                      |
| Auth       | JWT access/refresh rotation, Redis token blacklist, Passport.js (Google, GitHub OAuth)   |
| State      | Redux Toolkit with createEntityAdapter for normalized O(1) lookups, memoized selectors   |
| Validation | Zod (client), express-validator (server), React Hook Form                                |
| Upload     | Cloudinary (image storage and transformation)                                            |
| Security   | Helmet, CORS, HPP, mongo-sanitize, xss-clean, rate limiting (Redis-backed)               |
| Deploy     | Vercel (frontend), Render (backend)                                                      |

---

## Getting Started

See **[INSTALLATION.md](./INSTALLATION.md)** for full setup instructions including MongoDB Atlas, Cloudinary, and OAuth configuration.

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/dha2608/geoconnect.git
cd geoconnect

# 2. Install all dependencies (root + client + server)
npm run install:all

# 3. Configure environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your credentials (see INSTALLATION.md)

# 4. Start development servers (client + server concurrently)
npm run dev
```

The client runs on **http://localhost:5173** and the API server on **http://localhost:5000**.

### Available Scripts

| Command               | Description                                    |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start client and server concurrently           |
| `npm run dev:client`  | Start Vite dev server only (port 5173)         |
| `npm run dev:server`  | Start Express server only (port 5000)          |
| `npm run build`       | Production build for both client and server    |
| `npm run install:all` | Install root, client, and server dependencies  |

### Environment Requirements

| Tool     | Minimum Version | Check Command      |
| -------- | --------------- | ------------------- |
| Node.js  | 20.19.0         | `node --version`    |
| npm      | 10.0.0          | `npm --version`     |
| MongoDB  | 6.0             | `mongod --version`  |
| Git      | 2.30            | `git --version`     |

---

## Project Structure

```
geoconnect/
├── client/                       # React frontend (Vite)
│   ├── public/                   # Static assets, manifest.json, sw.js
│   └── src/
│       ├── api/                  # Axios instances and API modules
│       ├── app/                  # Redux store configuration
│       ├── components/           # Reusable UI components
│       │   ├── auth/             # ProtectedRoute, AuthGuard
│       │   ├── layout/           # Header, Sidebar, AppLayout, BottomNav
│       │   ├── map/              # MapView, SearchBar, PinMarker, RoutingPanel
│       │   └── shared/           # Buttons, modals, loaders, error boundaries
│       ├── features/             # Redux slices (auth, map, pins, posts, events, users, messages, notifications, ui)
│       ├── hooks/                # Custom hooks (useGeolocation, useRequireAuth, useSocket, useMessaging)
│       ├── pages/                # Route-level page components
│       ├── socket/               # Socket.io client setup and event handlers
│       ├── styles/               # Global CSS, Tailwind config, theme variables
│       └── utils/                # Shared utilities (animations, formatting, validation)
│
├── server/                       # Express backend
│   └── src/
│       ├── config/               # Database, Passport, Cloudinary configuration
│       ├── controllers/          # Route handlers for all 13 resource groups
│       ├── middleware/            # Auth, error handling, rate limiting, upload, validation
│       ├── models/               # Mongoose schemas (14 models)
│       ├── routes/               # Express route definitions
│       ├── socket/               # Socket.io event handlers and location manager
│       ├── utils/                # asyncHandler, AppError, response helpers, JWT, Redis
│       └── validators/           # Input validation schemas
│
├── package.json                  # Root scripts (concurrently for dev)
├── README.md                     # This file
├── INSTALLATION.md               # Detailed setup guide (Vietnamese)
├── UPGRADE-PLAN.md               # 5-phase improvement plan (Vietnamese)
└── PROJECT-REPORT.md             # Completion report and code review
```

See [server/README.md](./server/README.md) for the full API reference and [client/README.md](./client/README.md) for frontend architecture details.

---

## API Overview

Base URL: `https://geoconnect-api.onrender.com/api`

The server exposes **111 endpoints** across 13 resource groups. All protected routes require `Authorization: Bearer <token>`.

| Resource       | Endpoints | Description                                                             |
| -------------- | --------- | ----------------------------------------------------------------------- |
| Auth           | 14        | Register, login, OAuth (Google/GitHub), token refresh, password reset   |
| Users          | 18        | Profile CRUD, follow/block, nearby users, settings, account deletion    |
| Pins           | 15        | CRUD, like/save, check-in, viewport query, text search, trending       |
| Posts          | 12        | Feed, CRUD, like, comments (stored in separate Comment collection)      |
| Events         | 9         | CRUD, RSVP, viewport query, search, upcoming                           |
| Messages       | 7         | Conversations, real-time messaging, read receipts                       |
| Notifications  | 6         | List, mark read/clear, unread count                                     |
| Reviews        | 6         | CRUD, helpful votes                                                     |
| Collections    | 8         | CRUD, add/remove pins from collections                                  |
| Reports        | 7         | Content reporting with admin review                                     |
| Discover       | 4         | Feed, recommendations, categories, suggested users                      |
| Geocode        | 2         | Forward geocoding (Nominatim with location bias) and reverse geocoding  |
| **Total**      | **111**   | Full reference in [server/README.md](./server/README.md)                |

### Real-Time Events (Socket.io)

The server handles authenticated WebSocket connections for:

- **Location sharing** — Broadcast and receive live positions (privacy-validated, mutual followers only)
- **Direct messaging** — Send/receive messages in real-time with typing indicators
- **Notifications** — Push notifications for follows, likes, comments, event RSVPs
- **Online presence** — Track which users are currently online

---

## Upgrade History

The project completed 5 structured improvement phases. Each phase was developed on a dedicated branch and merged into `main`. See [UPGRADE-PLAN.md](./UPGRADE-PLAN.md) for full details and [PROJECT-REPORT.md](./PROJECT-REPORT.md) for the completion report.

### Phase 1 — Security and Stability (Critical)
- Socket room authorization — verify conversation membership before joining
- Location privacy — validate user settings before broadcasting position
- Origin-based CSRF protection on state-changing requests
- Graceful shutdown handlers (SIGTERM/SIGINT) for clean connection draining
- Stronger password policy: minimum 8 characters, requires uppercase, number, and special character
- Comprehensive input validation on all API endpoints

### Phase 2 — Performance and State Management
- Redux normalized stores using `createEntityAdapter` for pins, posts, and events (O(1) lookups)
- Memoized selectors via `createSelector` — eliminates unnecessary re-renders across all slices
- `AbortController` on viewport-driven API calls — cancels stale requests during map pan/zoom
- Granular error boundaries around map, panels, and route components

### Phase 3 — Accessibility and UX
- `prefers-reduced-motion` support across all Framer Motion animations
- ARIA labels on all icon-only buttons, `focus-visible` ring styles for keyboard navigation
- Live region announcements (`aria-live`) for toast notifications
- WCAG AA color contrast fixes (minimum 4.5:1 ratio)
- Responsive tablet breakpoint (768-1024px), OAuth loading states

### Phase 4 — Code Quality and Developer Experience
- `asyncHandler` utility — removed approximately 108 try-catch blocks from 13 controllers
- Standardized response format: `{ success, data, meta }` for all endpoints
- `AppError` class with centralized error codes
- Request ID tracing via `X-Request-ID` header on all responses

### Phase 5 — Scalability
- Comments separated into their own MongoDB collection
- Redis-backed rate limiting with automatic fallback to in-memory
- MongoDB transactions for atomic account deletion with cascading deletes
- Redis token blacklist for JWT revocation on logout and password change
- Per-user socket event rate limiting, compound indexes for common query patterns

---

## Deployment

| Target   | Service | Configuration                                         |
| -------- | ------- | ----------------------------------------------------- |
| Frontend | Vercel  | `client/` directory with SPA rewrites (`vercel.json`) |
| Backend  | Render  | `server/render.yaml` with free tier configuration     |

```bash
# Build for production
npm run build
```

See [INSTALLATION.md](./INSTALLATION.md) for detailed deployment instructions to Vercel and Render.

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and commit: `git commit -m 'feat: add your feature'`
4. Push to your branch: `git push origin feat/your-feature`
5. Open a Pull Request against `main`

Please follow the existing code style and include relevant tests where applicable.

---

## License

[MIT](./LICENSE)
