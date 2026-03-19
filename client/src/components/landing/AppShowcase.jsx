import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASE_OUT = [0.16, 1, 0.3, 1];

// Simulated map pins with user data
const PINS = [
  {
    id: 1,
    x: 35,
    y: 42,
    color: '#3b82f6',
    name: 'Sarah C.',
    status: 'Exploring cafés',
    avatar: 'S',
    avatarBg: '#3b82f6',
  },
  {
    id: 2,
    x: 62,
    y: 28,
    color: '#8b5cf6',
    name: 'Alex R.',
    status: 'Live sharing',
    avatar: 'A',
    avatarBg: '#8b5cf6',
  },
  {
    id: 3,
    x: 78,
    y: 55,
    color: '#10b981',
    name: 'Emma W.',
    status: 'At the park',
    avatar: 'E',
    avatarBg: '#10b981',
  },
  {
    id: 4,
    x: 22,
    y: 65,
    color: '#f59e0b',
    name: 'James P.',
    status: 'Event nearby',
    avatar: 'J',
    avatarBg: '#f59e0b',
  },
  {
    id: 5,
    x: 50,
    y: 72,
    color: '#06b6d4',
    name: 'Maya L.',
    status: 'Pinned a spot',
    avatar: 'M',
    avatarBg: '#06b6d4',
  },
];

// Sidebar nav items
const NAV_ITEMS = [
  {
    icon: (
      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    ),
    label: 'Map',
    active: true,
  },
  {
    icon: (
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    label: 'Explore',
    active: false,
  },
  {
    icon: (
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
    label: 'Messages',
    active: false,
  },
  {
    icon: (
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    label: 'Events',
    active: false,
  },
  {
    icon: (
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
    label: 'Profile',
    active: false,
  },
];

function PinMarker({ pin, isExpanded, onClick }) {
  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        zIndex: isExpanded ? 30 : 10,
      }}
      onClick={onClick}
      whileHover={{ scale: 1.15 }}
    >
      {/* Ping */}
      <motion.div
        className="absolute -inset-2 rounded-full"
        style={{ background: pin.color, opacity: 0.15 }}
        animate={{ scale: [1, 2, 1], opacity: [0.15, 0, 0.15] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          delay: pin.id * 0.4,
        }}
      />

      {/* Pin dot */}
      <div
        className="w-3.5 h-3.5 rounded-full relative"
        style={{
          background: pin.color,
          boxShadow: `0 0 12px ${pin.color}60`,
          border: '2px solid rgba(255,255,255,0.3)',
        }}
      />

      {/* Expanded profile card */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <div
              className="rounded-xl p-3 backdrop-blur-md"
              style={{
                background: 'rgba(5,8,16,0.9)',
                border: `1px solid ${pin.color}25`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${pin.color}10`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: pin.avatarBg }}
                >
                  {pin.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {pin.name}
                  </p>
                  <p className="text-white/40 text-[10px] truncate">
                    {pin.status}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2.5">
                <div
                  className="flex-1 text-center py-1 rounded-md text-[10px] font-medium text-white/70"
                  style={{ background: `${pin.color}15`, border: `1px solid ${pin.color}20` }}
                >
                  View Profile
                </div>
                <div
                  className="flex-1 text-center py-1 rounded-md text-[10px] font-medium text-white"
                  style={{ background: pin.color }}
                >
                  Connect
                </div>
              </div>
              {/* Arrow */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45"
                style={{
                  background: 'rgba(5,8,16,0.9)',
                  borderRight: `1px solid ${pin.color}25`,
                  borderBottom: `1px solid ${pin.color}25`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AppShowcase() {
  const [expandedPin, setExpandedPin] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div
      className="relative w-full max-w-4xl mx-auto rounded-xl sm:rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(5,8,16,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow:
          '0 25px 80px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)',
        aspectRatio: '16/10',
        maxHeight: 'min(60vh, 500px)',
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center px-2.5 py-1.5 gap-2 sm:px-4 sm:py-2.5 sm:gap-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        {/* URL bar */}
        <div
          className="flex-1 flex items-center gap-2 px-3 py-1 rounded-md max-w-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <svg
            className="w-3 h-3 text-green-500/60"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[11px] text-white/30 font-mono">
            geoconnect.app/map
          </span>
        </div>
      </div>

      {/* App body */}
      <div className="flex h-[calc(100%-36px)]">
        {/* Sidebar */}
        <div
          className="w-14 flex flex-col items-center py-3 gap-1 shrink-0"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            }}
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-white" fill="currentColor">
              <path d="M10 2C6.5 2 4 4.5 4 7.5c0 4 6 10.5 6 10.5s6-6.5 6-10.5C16 4.5 13.5 2 10 2zm0 7.5a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>

          {/* Nav items */}
          {NAV_ITEMS.map((item, i) => (
            <div
              key={i}
              className="relative w-10 h-10 rounded-lg flex items-center justify-center group cursor-pointer transition-colors"
              style={{
                background: item.active
                  ? 'rgba(59,130,246,0.15)'
                  : 'transparent',
              }}
            >
              {item.active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-500" />
              )}
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke={item.active ? '#3b82f6' : 'rgba(255,255,255,0.3)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
            </div>
          ))}

          {/* Bottom spacer + user avatar */}
          <div className="mt-auto">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                border: '2px solid rgba(59,130,246,0.3)',
              }}
            >
              Y
            </div>
          </div>
        </div>

        {/* Main map area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Map background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, #0a0f1a 0%, #0d1420 30%, #081018 60%, #0b1220 100%)',
            }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Simplified continent shapes */}
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.06]"
              viewBox="0 0 800 500"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Europe */}
              <path
                d="M370 120 Q390 100 420 110 L440 130 Q435 150 420 160 L400 155 Q380 145 370 130Z"
                fill="#3b82f6"
              />
              {/* Africa */}
              <path
                d="M380 180 Q400 170 420 180 L430 220 Q425 280 400 310 Q385 295 375 260 L370 210Z"
                fill="#10b981"
              />
              {/* N. America */}
              <path
                d="M120 80 Q180 60 220 90 L240 140 Q230 180 200 200 Q170 190 140 170 L115 120Z"
                fill="#8b5cf6"
              />
              {/* S. America */}
              <path
                d="M200 240 Q230 230 250 250 L260 300 Q240 360 220 380 Q200 350 195 300Z"
                fill="#f59e0b"
              />
              {/* Asia */}
              <path
                d="M460 90 Q520 70 580 85 L620 120 Q630 160 610 190 Q570 200 530 185 L480 150 Q460 130 460 110Z"
                fill="#06b6d4"
              />
              {/* Australia */}
              <path
                d="M600 300 Q640 290 670 310 L680 340 Q660 360 630 355 Q605 340 600 320Z"
                fill="#ef4444"
              />
            </svg>

            {/* Road-like lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.03]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path d="M10 30 Q30 25 50 35 T90 30" fill="none" stroke="#3b82f6" strokeWidth="0.3" />
              <path d="M5 50 Q25 45 45 55 T95 50" fill="none" stroke="#8b5cf6" strokeWidth="0.3" />
              <path d="M15 70 Q35 65 55 75 T85 70" fill="none" stroke="#06b6d4" strokeWidth="0.3" />
            </svg>
          </div>

          {/* Interactive pin markers */}
          {PINS.map((pin) => (
            <PinMarker
              key={pin.id}
              pin={pin}
              isExpanded={expandedPin === pin.id}
              onClick={() =>
                setExpandedPin(expandedPin === pin.id ? null : pin.id)
              }
            />
          ))}

          {/* Search bar */}
          <div
            className="absolute top-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md"
            style={{
              background: 'rgba(5,8,16,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <svg
              className="w-3.5 h-3.5 text-white/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-[11px] text-white/25">
              Search locations, people, events...
            </span>
            <span className="ml-auto text-[9px] text-white/15 font-mono px-1.5 py-0.5 rounded border border-white/10">
              /K
            </span>
          </div>

          {/* Create pin FAB */}
          <motion.div
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
            }}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </motion.div>

          {/* Notification popup */}
          <AnimatePresence>
            {showNotif && (
              <motion.div
                className="absolute top-16 right-3 w-56 rounded-xl p-3 backdrop-blur-md cursor-pointer"
                style={{
                  background: 'rgba(5,8,16,0.9)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                onClick={() => setShowNotif(false)}
              >
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                    A
                  </div>
                  <div>
                    <p className="text-[11px] text-white/80">
                      <span className="font-medium">Alex R.</span> shared a new location
                    </p>
                    <p className="text-[9px] text-white/30 mt-0.5">2 min ago</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat popup */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                className="absolute bottom-4 left-4 w-60 rounded-xl overflow-hidden cursor-pointer"
                style={{
                  background: 'rgba(5,8,16,0.9)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                onClick={() => setShowChat(false)}
              >
                {/* Chat header */}
                <div
                  className="px-3 py-2 flex items-center gap-2"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold">
                    S
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">
                    Sarah C.
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" />
                </div>
                {/* Messages */}
                <div className="px-3 py-2 space-y-1.5">
                  <div className="flex justify-start">
                    <div
                      className="px-2.5 py-1 rounded-lg text-[10px] text-white/70"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      Found an amazing café here!
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="px-2.5 py-1 rounded-lg text-[10px] text-white bg-blue-500/80">
                      Send me the pin!
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-trigger popups with hover zones */}
          <div
            className="absolute top-12 right-0 w-12 h-12"
            onMouseEnter={() => setShowNotif(true)}
            onMouseLeave={() => setTimeout(() => setShowNotif(false), 2000)}
          />
          <div
            className="absolute bottom-0 left-0 w-12 h-12"
            onMouseEnter={() => setShowChat(true)}
            onMouseLeave={() => setTimeout(() => setShowChat(false), 2000)}
          />

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-16 flex flex-col gap-1">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 text-xs cursor-pointer"
              style={{
                background: 'rgba(5,8,16,0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              +
            </div>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 text-xs cursor-pointer"
              style={{
                background: 'rgba(5,8,16,0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              −
            </div>
          </div>

          {/* User count badge */}
          <div
            className="absolute bottom-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(5,8,16,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-white/40 font-mono">
              247 nearby
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
