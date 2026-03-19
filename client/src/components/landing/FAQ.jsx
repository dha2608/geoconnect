import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASE_OUT = [0.16, 1, 0.3, 1];

const FAQ_DATA = [
  {
    q: 'What makes GeoConnect different from other social networks?',
    a: 'GeoConnect is built around real-world locations. Instead of following timelines, you explore an interactive map to discover people, events, and places near you. Every connection starts with a shared location experience.',
  },
  {
    q: 'Is my location data private and secure?',
    a: "Absolutely. You control exactly what location data is shared and with whom. We use end-to-end encryption for all location sharing, and you can go invisible anytime. Your precise location is never stored on our servers — only the pins you choose to create.",
  },
  {
    q: 'Can I use GeoConnect without sharing my live location?',
    a: "Yes! Live location sharing is completely optional. You can browse the map, create pins at places you've visited, join events, and connect with others without ever enabling real-time tracking.",
  },
  {
    q: 'How do events and meetups work?',
    a: 'Anyone can create location-based events visible on the map. Nearby users get notified, and you can RSVP, chat with attendees, and get directions — all within the app. From coffee meetups to community gatherings.',
  },
  {
    q: 'Is GeoConnect free to use?',
    a: 'GeoConnect is free for all core features — mapping, connecting, messaging, and events. Premium features like advanced analytics, unlimited collections, and priority event promotion are available with GeoConnect Pro.',
  },
  {
    q: 'What platforms is GeoConnect available on?',
    a: 'GeoConnect is available as a web app (works on any modern browser), with native iOS and Android apps coming soon. Your data syncs seamlessly across all devices.',
  },
];

function FAQItem({ item, index, isOpen, onToggle }) {
  return (
    <div
      className="group"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <button
        className="w-full flex items-center gap-4 py-5 px-1 text-left cursor-pointer"
        onClick={onToggle}
      >
        {/* Number */}
        <span className="text-[11px] font-mono text-white/20 w-6 shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Question */}
        <span
          className="flex-1 text-sm md:text-base font-medium transition-colors duration-300"
          style={{ color: isOpen ? '#fff' : 'rgba(255,255,255,0.6)' }}
        >
          {item.q}
        </span>

        {/* Toggle icon */}
        <motion.div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300"
          style={{
            background: isOpen
              ? 'rgba(59,130,246,0.15)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isOpen ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke={isOpen ? '#3b82f6' : 'rgba(255,255,255,0.4)'}
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </motion.div>
      </button>

      {/* Answer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-10 pr-10">
              {/* Accent line */}
              <div
                className="w-8 h-[2px] rounded-full mb-3"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                }}
              />
              <p className="text-sm text-white/45 leading-relaxed">
                {item.a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header accent */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="h-[1px] flex-1"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)',
          }}
        />
        <span className="text-[11px] font-mono tracking-[0.3em] text-white/20 uppercase">
          Common Questions
        </span>
        <div
          className="h-[1px] flex-1"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)',
          }}
        />
      </div>

      {/* FAQ items */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {FAQ_DATA.map((item, i) => (
          <FAQItem
            key={i}
            item={item}
            index={i}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
