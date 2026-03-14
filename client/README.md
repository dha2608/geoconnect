# GeoConnect Client

Location-based social network — React 18 single-page application with an interactive map, real-time features, and a glassmorphism UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [Environment Variables](#environment-variables)
5. [Available Scripts](#available-scripts)
6. [Architecture](#architecture)
7. [State Management](#state-management)
8. [Theming](#theming)
9. [Key Features](#key-features)

---

## Overview

GeoConnect Client is a React 18 SPA that lets users drop pins, publish posts, schedule events, and share their real-time location on an interactive OpenStreetMap canvas. All map interactions are viewport-driven — fetching only the data visible in the current bounding box — and every state mutation is reflected immediately across connected clients via Socket.io.

The application is designed for both desktop and mobile. On mobile it degrades gracefully to swipe gestures and a bottom navigation bar; on desktop it exposes keyboard shortcuts and a command palette.

---

## Prerequisites

| Requirement | Version |
| ----------- | ------- |
| Node.js     | >= 20   |
| npm or pnpm | any     |

---

## Setup

```bash
# 1. Move into the client directory
cd client

# 2. Install dependencies
npm install

# 3. Copy the example environment file and fill in your values
cp .env.example .env

# 4. Start the development server
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

---

## Environment Variables

| Variable             | Description                          | Default                   |
| -------------------- | ------------------------------------ | ------------------------- |
| `VITE_API_URL`       | Backend API base URL                 | `http://localhost:5000`   |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps API key (optional)     | —                         |
| `VITE_MAPBOX_TOKEN`  | Mapbox token for alternative tiles (optional) | —            |

All variables must be prefixed with `VITE_` to be exposed to the browser bundle by Vite.

---

## Available Scripts

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start Vite dev server at `http://localhost:5173` |
| `npm run build`   | Production build, output to `dist/`            |
| `npm run preview` | Serve the production build locally             |

---

## Architecture

```
client/src/
├── app/                        # Redux store (configureStore + middleware)
├── api/                        # Axios API modules
│   ├── pinApi.js
│   ├── postApi.js
│   ├── eventApi.js
│   └── ...
├── components/
│   ├── auth/                   # ProtectedRoute
│   ├── events/                 # EventLayer, EventListPanel, CreateEventModal, EventDetailPanel
│   ├── layout/                 # AppLayout, Header, Sidebar, MobileNav
│   ├── map/                    # MapView, PinClusterLayer, HeatmapLayer, PinFilterWidget
│   ├── messages/               # MessagesPanel
│   ├── notifications/          # NotificationPanel
│   ├── pins/                   # PinDetailPanel, CreatePinModal, EditPinModal
│   ├── posts/                  # FeedPanel, PostCard, CreatePostModal
│   ├── search/                 # SearchPanel
│   ├── social/                 # UserProfilePanel
│   └── ui/                     # Button, Input, GlassCard, Avatar, Toast, EmptyState, CommandPalette
├── features/                   # Redux Toolkit slices (one directory per domain)
│   ├── auth/                   # authSlice — JWT, OAuth, guest session
│   ├── events/                 # eventSlice — createEntityAdapter, AbortController
│   ├── map/                    # mapSlice — viewport bounds, tile layer, current location
│   ├── messages/               # messageSlice — conversation threads
│   ├── notifications/          # notificationSlice — unread count + list
│   ├── pins/                   # pinSlice — createEntityAdapter, AbortController, memoized selectors
│   ├── posts/                  # postSlice — createEntityAdapter, sorted by date
│   ├── ui/                     # uiSlice — sidebar state, open panels, modals, device size
│   └── users/                  # userSlice — profile cache, follow graph
├── hooks/                      # Custom React hooks
│   ├── useMapViewport.js
│   ├── useGeolocation.js
│   ├── useKeyboardShortcuts.js
│   └── useSwipeGesture.js
├── pages/                      # Route-level components
│   ├── AuthPage.jsx
│   ├── MapPage.jsx
│   ├── ProfilePage.jsx
│   └── ...
├── socket/                     # Real-time layer
│   ├── socket.js               # Singleton Socket.io client
│   ├── useSocket.js            # Hook — connect/disconnect lifecycle
│   └── useLocationSharing.js   # Hook — broadcast + receive live positions
├── styles/
│   └── index.css               # CSS custom properties, glass theme, dark/light mode
└── utils/
    ├── animations.js           # Framer Motion variants with reduced-motion support
    ├── compressImage.js        # Client-side image compression before upload
    └── notificationSound.js    # Web Audio API notification chime
```

### Dependency Overview

| Concern           | Library                          |
| ----------------- | -------------------------------- |
| Build tool        | Vite 5                           |
| UI framework      | React 18                         |
| Routing           | React Router v6                  |
| State management  | Redux Toolkit                    |
| Map rendering     | Leaflet.js + React Leaflet       |
| Tile provider     | OpenStreetMap (default)          |
| Animations        | Framer Motion                    |
| Styling           | Tailwind CSS 3                   |
| Real-time         | Socket.io-client                 |
| Form validation   | React Hook Form + Zod            |
| Toast alerts      | react-hot-toast                  |

---

## State Management

Redux Toolkit is the single source of truth. Each domain feature owns a self-contained slice directory with its reducer, async thunks, selectors, and types.

### Entity Normalization

Pins, posts, and events use `createEntityAdapter` to store records in a normalized `{ ids, entities }` shape. This eliminates duplication, makes O(1) lookups possible by ID, and keeps update mutations simple.

```
pinAdapter.upsertMany(state, action.payload)   // merge viewport fetch results
pinAdapter.removeOne(state, action.payload)    // delete by ID
```

### Memoized Selectors

All derived data (e.g. "pins visible in the current viewport", "unread notification count") is computed via `createSelector`. Selectors only recompute when their inputs change, preventing unnecessary re-renders on unrelated state updates.

### Viewport-Driven Fetching with AbortController

When the user pans or zooms the map, `mapSlice` emits a new bounding box. Thunks in `pinSlice` and `eventSlice` attach an `AbortController` signal to their Axios requests. If the viewport changes again before the previous request resolves, the in-flight request is cancelled and replaced by a new one targeting the updated bounds. This prevents stale data from overwriting fresher results.

```
// Simplified thunk pattern used in pinSlice
const controller = new AbortController()
const response = await pinApi.fetchByBounds(bounds, { signal: controller.signal })
```

### Slice Summary

| Slice           | Adapter | AbortController | Notes                              |
| --------------- | ------- | --------------- | ---------------------------------- |
| `authSlice`     | No      | No              | JWT tokens, OAuth state, guest mode |
| `mapSlice`      | No      | No              | Viewport bounds, zoom, tile layer  |
| `pinSlice`      | Yes     | Yes             | Memoized viewport selectors        |
| `postSlice`     | Yes     | No              | Sorted descending by `createdAt`   |
| `eventSlice`    | Yes     | Yes             | Date-range filtering               |
| `userSlice`     | No      | No              | Profile cache + follow graph       |
| `messageSlice`  | No      | No              | Conversation threads               |
| `notificationSlice` | No  | No              | Unread count badge                 |
| `uiSlice`       | No      | No              | Panels, modals, device breakpoint  |

---

## Theming

### CSS Custom Properties

All design tokens (colors, spacing, blur radius) live in `src/styles/index.css` as CSS custom properties scoped to `:root`. Dark and light variants override the same property names under `[data-theme="dark"]` and `[data-theme="light"]` selectors.

### Tile-Layer-Driven Theme

The `data-theme` attribute is set on `<html>` by `mapSlice` whenever the user switches tile layers. Satellite imagery applies the dark theme automatically; standard street maps use the light theme.

### Glassmorphism

Cards and panels use `backdrop-filter: blur()` with semi-transparent backgrounds. The `GlassCard` component in `src/components/ui/` encapsulates this pattern so it stays consistent across the application.

### Reduced Motion

`src/utils/animations.js` exports Framer Motion variant objects. Before returning each variant, a `prefers-reduced-motion` media query check replaces transition durations with `0` so all animations resolve instantly for users who opt out of motion.

---

## Key Features

### Interactive Map

- OpenStreetMap base tiles via React Leaflet
- Pin clusters using Leaflet MarkerCluster — groups nearby pins into count bubbles that expand on click
- Heatmap layer rendered by `HeatmapLayer` (canvas-based density visualization)
- Event markers rendered on a separate `EventLayer` so they can be toggled independently
- `PinFilterWidget` filters visible pins by category without re-fetching

### Real-Time Location Sharing

Users can opt in to broadcasting their GPS coordinates to mutual followers. `useLocationSharing` emits position updates over the Socket.io connection and listens for updates from followed users, rendering their live positions as distinct markers on the map.

### Command Palette

Triggered by `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux). The `CommandPalette` component exposes fuzzy-searchable actions: navigate to a user profile, drop a pin at a searched address, toggle the feed panel, and more.

### Keyboard Shortcuts

`useKeyboardShortcuts` registers application-wide shortcuts. Pressing `?` opens a help overlay listing all registered bindings. Shortcuts are disabled when focus is inside a text input.

### Swipe Gestures

`useSwipeGesture` detects horizontal swipe direction and velocity on touch devices. Swiping right from the left edge opens the sidebar; swiping left closes it. The gesture threshold is configurable to avoid conflicts with native scroll behavior.

### Onboarding

First-time users see a guided tour (sequential tooltip overlay) that highlights the map, the pin creation button, the feed panel, and the settings page. A welcome checklist tracks completion of key actions (drop first pin, follow a user, enable location sharing).

### PWA Support

The client ships a web app manifest and service worker. Users can install GeoConnect to their home screen. The service worker caches the app shell for offline load and queues failed mutations (pin creation, post submission) for replay when connectivity is restored.
