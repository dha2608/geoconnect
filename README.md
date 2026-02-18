# GeoConnect

Location-based social network built with the MERN stack + Leaflet.

## Tech Stack

- **Frontend:** React 18 + Vite, Redux Toolkit, Tailwind CSS, React Leaflet, Framer Motion
- **Backend:** Node.js + Express, MongoDB, Socket.io, JWT Auth, Passport.js OAuth
- **Maps:** OpenStreetMap + Leaflet.js, Nominatim Geocoding, OSRM Routing
- **Deploy:** Vercel (frontend) + Render (backend)

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm

### Installation

```bash
# Install all dependencies
npm run install:all

# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit .env files with your credentials
```

### Development

```bash
# Run both client and server
npm run dev

# Or run separately
npm run dev:client
npm run dev:server
```

### Build

```bash
npm run build
```

## Project Structure

```
geoconnect/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── app/         # Redux store
│   │   ├── components/  # Reusable UI components
│   │   ├── features/    # Feature modules (auth, map, pins, etc.)
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Route pages
│   │   ├── styles/      # Global CSS
│   │   └── utils/       # Utilities
│   └── public/
├── server/              # Express backend
│   └── src/
│       ├── controllers/ # Route handlers
│       ├── middleware/   # Express middleware
│       ├── models/      # Mongoose models
│       ├── routes/      # API routes
│       ├── socket/      # Socket.io handlers
│       └── utils/       # Server utilities
└── README.md
```

## Features

- Interactive map with real-time location sharing
- Pin creation with categories and reviews
- Social features: follow, posts, messaging
- Events with RSVP and map markers
- Google & GitHub OAuth
- Dark glass UI theme

## Deployment

- **Frontend:** Deploy `client/` to Vercel
- **Backend:** Deploy `server/` to Render (see `server/render.yaml`)

## License

MIT
