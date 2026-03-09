import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { pinApi } from '../api/pinApi';
import { eventApi } from '../api/eventApi';
import { userApi } from '../api/userApi';

/* ─────────────────────── animation variants ─────────────────────── */
const pageVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/* ─────────────────────── helpers ─────────────────────────────────── */
const CATEGORY_EMOJI = {
  music: '🎵', sports: '⚽', art: '🎨', food: '🍕', tech: '💻',
  nature: '🌿', social: '🎉', fitness: '💪', education: '📚',
  restaurant: '🍽️', bar: '🍺', park: '🌳', landmark: '🏛️',
  shopping: '🛍️', events: '📅', other: '📍',
};

const CATEGORY_GRADIENT = {
  restaurant: 'from-orange-500/25 to-red-500/10',
  bar: 'from-purple-500/25 to-pink-500/10',
  park: 'from-green-500/25 to-emerald-500/10',
  landmark: 'from-blue-500/25 to-cyan-500/10',
  art: 'from-violet-500/25 to-purple-500/10',
  shopping: 'from-pink-500/25 to-rose-500/10',
  music: 'from-yellow-500/25 to-orange-500/10',
  tech: 'from-cyan-500/25 to-blue-500/10',
  sports: 'from-green-500/25 to-teal-500/10',
  other: 'from-slate-500/20 to-slate-600/10',
};

const PIN_BADGE_COLOR = {
  park: 'success', restaurant: 'warning', bar: 'secondary',
  landmark: 'primary', art: 'secondary', shopping: 'danger',
};

const formatEventDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return dateStr;
  }
};

/* ─────────────────────── Section Title ──────────────────────────── */
function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-lg font-heading font-bold text-txt-primary">{title}</h2>
        {subtitle && <p className="text-xs text-txt-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────── Pin Card ───────────────────────────────── */
function PinCard({ pin, onClick }) {
  const cat = pin.category?.toLowerCase() || 'other';
  const emoji = CATEGORY_EMOJI[cat] || '📍';
  const gradient = CATEGORY_GRADIENT[cat] || CATEGORY_GRADIENT.other;
  const badgeColor = PIN_BADGE_COLOR[cat] || 'primary';
  const likesCount = Array.isArray(pin.likes) ? pin.likes.length : 0;
  const hasImage = Array.isArray(pin.images) && pin.images.length > 0;
  const creatorName = pin.createdBy?.name || pin.createdBy?.username || 'User';

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="glass rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-accent-primary/20 transition-colors duration-200"
    >
      {/* Thumbnail */}
      <div className={`h-36 relative overflow-hidden ${hasImage ? '' : `bg-gradient-to-br ${gradient}`}`}>
        {hasImage ? (
          <img
            src={pin.images[0]}
            alt={pin.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-50 select-none">{emoji}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Category badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge color={badgeColor}>
            {pin.category || 'Other'}
          </Badge>
        </div>
        {/* Like count overlay */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <span className="text-[11px] font-medium text-white">{likesCount}</span>
        </div>
      </div>

      {/* Info row */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-txt-primary truncate mb-2">{pin.title}</h3>
        <div className="flex items-center gap-2">
          <Avatar src={pin.createdBy?.avatar} name={creatorName} size="xs" />
          <span className="text-xs text-txt-muted truncate">{creatorName}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────── Event Card ─────────────────────────────── */
function EventCard({ event, onClick }) {
  const cat = event.category?.toLowerCase() || 'other';
  const emoji = CATEGORY_EMOJI[cat] || '📅';
  const attendeeCount = Array.isArray(event.attendees) ? event.attendees.length : 0;
  const spotsLeft =
    event.maxCapacity > 0 ? event.maxCapacity - attendeeCount : null;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="glass rounded-2xl p-4 cursor-pointer border border-white/5 hover:border-accent-primary/20 transition-colors duration-200"
    >
      <div className="flex items-start gap-3">
        {/* Emoji icon */}
        <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/15 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-txt-primary truncate">{event.title}</h3>
          <p className="text-xs text-accent-primary mt-0.5 font-medium">
            {formatEventDate(event.startTime)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 text-txt-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="text-xs">{attendeeCount} attending</span>
            </div>
            {spotsLeft !== null && (
              <span className={`text-xs font-medium ${spotsLeft <= 5 ? 'text-accent-warning' : 'text-txt-muted'}`}>
                {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────── User Card ──────────────────────────────── */
function UserCard({ targetUser, currentUser }) {
  const isCurrentlyFollowing = currentUser?.following?.some(
    (f) => String(f._id || f) === String(targetUser._id)
  ) ?? false;

  const [following, setFollowing] = useState(isCurrentlyFollowing);
  const [loading, setLoading] = useState(false);
  const isSelf = String(targetUser._id) === String(currentUser?._id);

  const handleFollow = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await userApi.toggleFollow(targetUser._id);
      setFollowing((f) => !f);
    } catch {
      // silent fail — no toast to avoid noise in explore
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors duration-200"
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={targetUser.avatar} name={targetUser.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-txt-primary truncate">{targetUser.name}</p>
          {targetUser.bio ? (
            <p className="text-xs text-txt-muted truncate mt-0.5">{targetUser.bio}</p>
          ) : (
            <p className="text-xs text-txt-muted mt-0.5">GeoConnect member</p>
          )}
        </div>
      </div>
      {!isSelf && (
        <Button
          variant={following ? 'ghost' : 'outline'}
          size="sm"
          className="w-full"
          loading={loading}
          onClick={handleFollow}
        >
          {following ? '✓ Following' : 'Follow'}
        </Button>
      )}
    </motion.div>
  );
}

/* ─────────────────────── Empty State ────────────────────────────── */
function EmptyState({ emoji, title, subtitle }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <span className="text-5xl mb-3 select-none">{emoji}</span>
      <p className="text-sm font-medium text-txt-secondary">{title}</p>
      {subtitle && <p className="text-xs text-txt-muted mt-1">{subtitle}</p>}
    </div>
  );
}

/* ─────────────────────── Loading Grid ───────────────────────────── */
function LoadingGrid({ cols = 3 }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${cols} gap-3`}>
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl h-40 animate-pulse" />
      ))}
    </div>
  );
}

/* ─────────────────────── Main Component ─────────────────────────── */
export default function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [pins, setPins] = useState([]);
  const [events, setEvents] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);

  const [loadingPins, setLoadingPins] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Extract user lat/lng from location (GeoJSON: [lng, lat])
  const userLng = user?.location?.coordinates?.[0];
  const userLat = user?.location?.coordinates?.[1];

  useEffect(() => {
    // Trending pins
    pinApi
      .getTrending()
      .then((res) => setPins(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPins([]))
      .finally(() => setLoadingPins(false));

    // Upcoming events
    eventApi
      .getUpcoming(12)
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));

    // Nearby users (requires location)
    if (userLat && userLng) {
      userApi
        .getNearbyUsers({ lat: userLat, lng: userLng, radius: 50 })
        .then((res) => setNearbyUsers(Array.isArray(res.data) ? res.data : []))
        .catch(() => setNearbyUsers([]))
        .finally(() => setLoadingUsers(false));
    } else {
      setLoadingUsers(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto pb-24 space-y-10 px-1"
    >
      {/* ══════════ HERO ══════════ */}
      <motion.div variants={sectionVariants}>
        <GlassCard animate={false} padding="p-8" className="relative overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/6 via-transparent to-accent-secondary/6 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent-primary/6 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent-secondary/5 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-accent-primary/15 border border-accent-primary/25 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z" />
                </svg>
              </div>
              <Badge color="primary" dot>Explore</Badge>
            </div>
            <h1 className="text-3xl font-heading font-bold text-txt-primary mb-2">
              Discover GeoConnect
            </h1>
            <p className="text-txt-muted leading-relaxed max-w-lg text-sm">
              Trending places, upcoming events, and active people near you — all in one place.
            </p>
          </div>
        </GlassCard>
      </motion.div>

      {/* ══════════ TRENDING PINS ══════════ */}
      <motion.section variants={sectionVariants}>
        <SectionTitle
          icon="🔥"
          title="Trending Pins"
          subtitle="Most-loved spots from the community"
        />
        {loadingPins ? (
          <LoadingGrid cols={3} />
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {pins.length > 0 ? (
              pins.map((pin) => (
                <PinCard
                  key={pin._id}
                  pin={pin}
                  onClick={() => navigate(`/?pin=${pin._id}`)}
                />
              ))
            ) : (
              <EmptyState
                emoji="📍"
                title="No trending pins yet"
                subtitle="Be the first to drop a pin and make it to the top!"
              />
            )}
          </motion.div>
        )}
      </motion.section>

      {/* ══════════ UPCOMING EVENTS ══════════ */}
      <motion.section variants={sectionVariants}>
        <SectionTitle
          icon="📅"
          title="Upcoming Events"
          subtitle="Things happening soon in the GeoConnect world"
        />
        {loadingEvents ? (
          <LoadingGrid cols={3} />
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {events.length > 0 ? (
              events.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  onClick={() => navigate(`/?event=${event._id}`)}
                />
              ))
            ) : (
              <EmptyState
                emoji="🗓️"
                title="No upcoming events"
                subtitle="Create an event and get the community together!"
              />
            )}
          </motion.div>
        )}
      </motion.section>

      {/* ══════════ ACTIVE USERS ══════════ */}
      <motion.section variants={sectionVariants}>
        <SectionTitle
          icon="👥"
          title="Active Users"
          subtitle={
            userLat
              ? 'People exploring near you'
              : 'Enable location sharing to discover nearby users'
          }
        />

        {loadingUsers ? (
          <LoadingGrid cols={3} />
        ) : !userLat ? (
          <GlassCard animate={false} padding="p-8">
            <div className="text-center">
              <span className="text-5xl block mb-3 select-none">📍</span>
              <p className="text-sm font-medium text-txt-secondary mb-1">Location not shared</p>
              <p className="text-xs text-txt-muted">
                Go to Settings → Privacy and enable location sharing to discover nearby users.
              </p>
            </div>
          </GlassCard>
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {nearbyUsers.length > 0 ? (
              nearbyUsers.slice(0, 12).map((u) => (
                <UserCard
                  key={u._id}
                  targetUser={u}
                  currentUser={user}
                />
              ))
            ) : (
              <EmptyState
                emoji="👻"
                title="No users found nearby"
                subtitle="Try increasing your discovery radius in Settings → Privacy."
              />
            )}
          </motion.div>
        )}
      </motion.section>
    </motion.div>
  );
}
