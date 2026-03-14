# GeoConnect Server API

REST API and real-time server for GeoConnect — a location-aware social platform. Built with Express, MongoDB, and Socket.io.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Setup](#3-setup)
4. [Environment Variables](#4-environment-variables)
5. [API Reference](#5-api-reference)
6. [Socket.io Events](#6-socketio-events)
7. [Error Handling](#7-error-handling)
8. [Security](#8-security)
9. [Architecture](#9-architecture)

---

## 1. Overview

The GeoConnect server exposes 111 HTTP endpoints across 13 resource groups, plus a Socket.io layer for real-time messaging, live location sharing, and push notifications.

Key capabilities:

- JWT authentication with access/refresh token rotation and a token blacklist on logout
- Google and GitHub OAuth via Passport.js
- Geospatial queries (nearby users, pins, events) using MongoDB `2dsphere` indexes
- Image uploads to Cloudinary (up to 6 images per post, 5 per pin)
- Redis-backed rate limiting and token blacklist, with automatic fallback to in-memory stores when Redis is unavailable
- Real-time features over Socket.io: direct messaging, typing indicators, and live location sharing

---

## 2. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 20 | ES modules (`"type": "module"`) |
| MongoDB | >= 6 | Local instance or MongoDB Atlas |
| Redis | Any stable | Optional — falls back to in-memory if unavailable |
| Cloudinary account | — | Required for image upload endpoints |

---

## 3. Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

For production:

```bash
npm start
```

---

## 4. Environment Variables

Copy `.env.example` to `.env` and populate all required values before starting the server.

| Variable | Description | Required |
|---|---|---|
| `PORT` | HTTP port the server listens on | No (default: `5000`) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | Yes |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | OAuth only |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret | OAuth only |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | OAuth only |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | OAuth only |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Upload only |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Upload only |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Upload only |
| `CLIENT_URL` | Frontend origin (used for CORS and OAuth redirects) | Yes |
| `REDIS_URL` | Redis connection string | No (falls back to memory) |
| `EMAIL_HOST` | SMTP host for transactional email | Email only |
| `EMAIL_PORT` | SMTP port | Email only |
| `EMAIL_USER` | SMTP username | Email only |
| `EMAIL_PASS` | SMTP password | Email only |

---

## 5. API Reference

All endpoints are prefixed with `/api`. Authenticated routes require a valid `Authorization: Bearer <access_token>` header unless otherwise noted.

### Auth (`/api/auth`) — 14 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | No | Register new user. Accepts optional avatar upload via `multipart/form-data`. |
| `POST` | `/login` | No | Authenticate with email and password. Returns access and refresh tokens. |
| `POST` | `/logout` | Yes | Invalidate session. Clears the refresh token cookie and blacklists the current access token. |
| `POST` | `/refresh` | No | Exchange a valid refresh token for a new access token. |
| `POST` | `/guest` | No | Create a temporary guest session. |
| `PUT` | `/password` | Yes | Change the authenticated user's password. |
| `POST` | `/forgot-password` | No | Send a password reset link to the provided email address. |
| `POST` | `/reset-password` | No | Reset password using a token received via email. |
| `POST` | `/verify-email` | No | Verify email address using the token sent on registration. |
| `POST` | `/resend-verification` | Yes | Resend the email verification link to the authenticated user. |
| `GET` | `/google` | No | Initiate Google OAuth flow. Redirects to Google's authorization page. |
| `GET` | `/google/callback` | No | Google OAuth callback. Completes authentication and redirects to the client. |
| `GET` | `/github` | No | Initiate GitHub OAuth flow. Redirects to GitHub's authorization page. |
| `GET` | `/github/callback` | No | GitHub OAuth callback. Completes authentication and redirects to the client. |

---

### Users (`/api/users`) — 18 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/me` | Yes | Get the authenticated user's full profile. |
| `PUT` | `/me` | Yes | Update profile fields (display name, bio, etc.). |
| `DELETE` | `/me` | Yes | Delete account. Requires password confirmation in the request body. Uses a MongoDB transaction to cascade deletions. |
| `POST` | `/me/avatar` | Yes | Upload or replace the authenticated user's avatar image. |
| `PUT` | `/me/location` | Yes | Update the authenticated user's stored location coordinates. |
| `GET` | `/me/settings` | Yes | Retrieve the authenticated user's preference settings. |
| `PUT` | `/me/settings` | Yes | Update preference settings (notifications, privacy, etc.). |
| `GET` | `/me/blocked` | Yes | List users blocked by the authenticated user. |
| `GET` | `/nearby` | Yes | Find users within a specified radius of provided coordinates. |
| `GET` | `/search` | Yes | Search for users by display name. Supports pagination. |
| `GET` | `/:id` | Yes | Get a user's public profile by ID. |
| `GET` | `/:id/stats` | Yes | Get activity statistics for a user. |
| `GET` | `/:id/followers` | Yes | List followers of a user. Supports pagination. |
| `GET` | `/:id/following` | Yes | List accounts a user is following. Supports pagination. |
| `POST` | `/:id/follow` | Yes | Follow a user. |
| `DELETE` | `/:id/follow` | Yes | Unfollow a user. |
| `POST` | `/:id/block` | Yes | Block a user. |
| `DELETE` | `/:id/block` | Yes | Unblock a user. |

---

### Activity (`/api/users/me/activity`) — 3 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/stats` | Yes | Aggregate activity statistics for the authenticated user. |
| `GET` | `/recent` | Yes | Paginated feed of the authenticated user's recent actions. |
| `GET` | `/heatmap` | Yes | Activity heatmap data suitable for calendar visualizations. |

---

### Notifications (`/api/users/notifications`) — 6 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Yes | Paginated list of notifications for the authenticated user. |
| `GET` | `/unread-count` | Yes | Count of unread notifications. |
| `PUT` | `/read-all` | Yes | Mark all notifications as read. |
| `DELETE` | `/clear` | Yes | Delete all notifications. |
| `PUT` | `/:id/read` | Yes | Mark a single notification as read. |
| `DELETE` | `/:id` | Yes | Delete a single notification. |

---

### Pins (`/api/pins`) — 15 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Yes | Retrieve pins within a viewport bounding box. |
| `GET` | `/search` | Yes | Full-text search across pin titles and descriptions. |
| `GET` | `/nearby` | Yes | Find pins within a radius of given coordinates. |
| `GET` | `/trending` | Yes | Trending pins based on recent engagement. |
| `GET` | `/saved/:userId` | Yes | Pins saved by a specific user. |
| `GET` | `/:id` | Yes | Full details for a single pin. |
| `POST` | `/` | Yes | Create a pin. Accepts up to 5 images via `multipart/form-data`. |
| `PUT` | `/:id` | Yes | Update a pin owned by the authenticated user. |
| `DELETE` | `/:id` | Yes | Delete a pin owned by the authenticated user. |
| `POST` | `/:id/like` | Yes | Like a pin. |
| `DELETE` | `/:id/like` | Yes | Remove a like from a pin. |
| `POST` | `/:id/save` | Yes | Save a pin to the authenticated user's collection. |
| `DELETE` | `/:id/save` | Yes | Remove a pin from saved. |
| `POST` | `/:id/checkin` | Yes | Check in at a pin's location. |
| `DELETE` | `/:id/checkin` | Yes | Undo a check-in. |

---

### Reviews (`/api/pins/:pinId/reviews`) — 6 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Yes | List reviews for a pin. Supports pagination and sorting. |
| `POST` | `/` | Yes | Submit a review for a pin. |
| `PUT` | `/:reviewId` | Yes | Update an existing review owned by the authenticated user. |
| `DELETE` | `/:reviewId` | Yes | Delete a review owned by the authenticated user. |
| `POST` | `/:reviewId/helpful` | Yes | Vote a review as helpful. |
| `DELETE` | `/:reviewId/helpful` | Yes | Remove a helpful vote from a review. |

---

### Posts (`/api/posts`) — 12 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/feed` | Yes | Personalized post feed based on follows and location. |
| `GET` | `/map` | Yes | Posts within a viewport bounding box for map display. |
| `GET` | `/user/:userId` | Yes | Posts authored by a specific user. |
| `POST` | `/` | Yes | Create a post. Accepts up to 6 images via `multipart/form-data`. |
| `GET` | `/:id` | Yes | Full details for a single post. |
| `PUT` | `/:id` | Yes | Update a post owned by the authenticated user. |
| `DELETE` | `/:id` | Yes | Delete a post and cascade-delete its comments. |
| `POST` | `/:id/like` | Yes | Like a post. |
| `DELETE` | `/:id/like` | Yes | Remove a like from a post. |
| `GET` | `/:id/comments` | Yes | Paginated list of comments on a post. |
| `POST` | `/:id/comments` | Yes | Add a comment to a post. |
| `DELETE` | `/:id/comments/:commentId` | Yes | Delete a comment owned by the authenticated user. |

---

### Events (`/api/events`) — 9 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Yes | Events within a viewport bounding box. |
| `GET` | `/upcoming` | Yes | Events occurring in the near future, sorted by start time. |
| `GET` | `/search` | Yes | Search events by title, description, or category. |
| `POST` | `/` | Yes | Create an event. |
| `GET` | `/:id` | Yes | Full details for a single event including RSVP counts. |
| `PUT` | `/:id` | Yes | Update an event owned by the authenticated user. |
| `DELETE` | `/:id` | Yes | Delete an event owned by the authenticated user. |
| `POST` | `/:id/rsvp` | Yes | RSVP to an event. |
| `DELETE` | `/:id/rsvp` | Yes | Cancel an existing RSVP. |

---

### Messages (`/api/messages`) — 7 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/conversations` | Yes | List all conversations for the authenticated user. |
| `POST` | `/conversations` | Yes | Create a new direct or group conversation. |
| `GET` | `/unread-count` | Yes | Total count of unread messages across all conversations. |
| `GET` | `/:conversationId` | Yes | Paginated message history for a conversation. |
| `POST` | `/:conversationId` | Yes | Send a message to a conversation. |
| `PUT` | `/:conversationId/read` | Yes | Mark all messages in a conversation as read. |
| `DELETE` | `/:conversationId/messages/:messageId` | Yes | Delete a message sent by the authenticated user. |

---

### Reports (`/api/reports`) — 7 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Yes | Report a piece of content (pin, post, event, user). |
| `GET` | `/mine` | Yes | List reports submitted by the authenticated user. |
| `GET` | `/` | Admin | List all reports across the platform. |
| `GET` | `/stats` | Admin | Aggregate report statistics by type and status. |
| `GET` | `/:id` | Admin | Full details of a single report. |
| `PUT` | `/:id` | Admin | Update the status or resolution of a report. |
| `DELETE` | `/:id` | Admin | Delete a report record. |

---

### Discover (`/api/discover`) — 4 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/feed` | Yes | Discovery feed mixing trending pins, posts, and events. |
| `GET` | `/recommended` | Yes | Pins recommended based on user history and location. |
| `GET` | `/categories` | Yes | Popular pin categories with counts. |
| `GET` | `/people` | Yes | Suggested users to follow. |

---

### Geocode (`/api/geocode`) — 2 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/search` | Yes | Forward geocoding — convert a place name or address to coordinates. |
| `GET` | `/reverse` | Yes | Reverse geocoding — convert coordinates to a place name or address. |

---

### Collections (`/api/collections`) — 8 routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/mine` | Yes | List collections owned by the authenticated user. |
| `GET` | `/public` | Yes | Browse public collections. |
| `POST` | `/` | Yes | Create a new collection. |
| `GET` | `/:id` | Yes | Full details of a collection including its pins. |
| `PUT` | `/:id` | Yes | Update a collection owned by the authenticated user. |
| `DELETE` | `/:id` | Yes | Delete a collection owned by the authenticated user. |
| `POST` | `/:id/pins/:pinId` | Yes | Add a pin to a collection. |
| `DELETE` | `/:id/pins/:pinId` | Yes | Remove a pin from a collection. |

---

## 6. Socket.io Events

Clients connect to the Socket.io namespace at the server root. A valid JWT must be provided in the `auth.token` handshake option.

All events are subject to per-user rate limiting enforced on the server.

### Client to Server

| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ userId: string }` | Join the personal notification room to receive user-scoped events. |
| `join_conversation` | `{ conversationId: string }` | Join a conversation room to receive messages in real time. |
| `location_update` | `{ lat: number, lng: number }` | Broadcast live location to friends who are tracking the user. |
| `stop_sharing` | — | Stop broadcasting live location. Notifies connected friends. |
| `message_send` | `{ conversationId: string, content: string }` | Send a message in an active conversation. |
| `typing_start` | `{ conversationId: string }` | Signal that the user has started typing in a conversation. |
| `typing_stop` | `{ conversationId: string }` | Signal that the user has stopped typing. |

### Server to Client

| Event | Payload | Description |
|---|---|---|
| `friend_location` | `{ userId: string, lat: number, lng: number }` | A friend's updated live location. |
| `friend_offline` | `{ userId: string }` | A friend has stopped sharing their location. |
| `new_message` | `{ message: object, conversationId: string }` | A new message has arrived in a conversation the client has joined. |
| `notification` | `{ type: string, data: object }` | A real-time notification (new follower, like, comment, etc.). |

---

## 7. Error Handling

All route handlers are wrapped with `asyncHandler`, which catches thrown errors and forwards them to the global error middleware — no uncaught promise rejections escape to the process level.

### Response Shape

Successful responses:

```json
{
  "success": true,
  "data": { }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Pin not found.",
    "requestId": "a3f2c1d9-..."
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | Malformed request body or query parameters. |
| `VALIDATION_FAILED` | 422 | Input failed express-validator rules. |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token. |
| `FORBIDDEN` | 403 | Authenticated but not permitted to perform the action. |
| `NOT_FOUND` | 404 | Requested resource does not exist. |
| `CONFLICT` | 409 | State conflict (e.g., already following, duplicate entry). |
| `RATE_LIMITED` | 429 | Too many requests. Retry after the indicated period. |
| `INTERNAL` | 500 | Unhandled server error. |

Every error response includes an `X-Request-ID` header and the same `requestId` value in the body for log correlation.

---

## 8. Security

| Measure | Implementation |
|---|---|
| HTTP hardening | Helmet — sets secure response headers |
| CORS | Configurable origin allowlist via `CLIENT_URL` |
| Parameter pollution | HPP — removes duplicate query parameters |
| NoSQL injection | mongo-sanitize — strips `$` operators from user input |
| XSS | xss-clean — sanitizes string fields in body and query |
| Rate limiting | express-rate-limit with Redis store; falls back to memory |
| Authentication | JWT access tokens (short-lived) + refresh token rotation |
| Token invalidation | Blacklist stored in Redis (or memory) on logout and password change |
| Socket authentication | JWT verified on handshake; unauthenticated connections are rejected |
| Socket rate limiting | Per-user event rate limits enforced server-side |

---

## 9. Architecture

```
server/src/
├── controllers/        # 13 controllers — business logic using asyncHandler and response helpers
├── middleware/         # auth, rateLimiter, upload (Cloudinary via Multer), pagination
├── models/             # Mongoose 8 schemas: User, Pin, Post, Event, Comment, Review,
│                       #   Notification, Message, Conversation, Collection, Report
├── routes/             # Express route definitions — one file per resource group
├── socket/             # Socket.io event handlers and live location manager
├── utils/
│   ├── asyncHandler.js # Wraps async controllers and forwards errors
│   ├── response.js     # sendSuccess / sendError helpers
│   ├── errors.js       # AppError class and error code constants
│   ├── jwt.js          # Token signing and verification
│   ├── tokenBlacklist.js # Redis-backed (or in-memory) token invalidation
│   ├── redis.js        # Redis client with graceful fallback
│   ├── email.js        # Nodemailer transactional email helpers
│   └── ...
├── validators/         # express-validator chains per resource
└── server.js           # Entry point — app setup, middleware, route mounting, Socket.io init
```

### Request Lifecycle

```
Request
  -> Helmet / CORS / HPP / sanitize / xss
  -> Rate limiter (Redis-backed)
  -> Route match
  -> Auth middleware (JWT verify + blacklist check)
  -> express-validator chain
  -> asyncHandler( controller )
  -> Response helper (sendSuccess / sendError)
  -> Global error middleware (on throw)
```
