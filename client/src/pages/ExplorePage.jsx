import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { discoverApi } from '../api/discoverApi';
import { pinApi } from '../api/pinApi';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import LazyImage from '../components/ui/LazyImage';
import { pageVariants, sectionVariants, cardVariants } from '../utils/animations';

const CATEGORY_ICONS = {
  food: '🍕', entertainment: '🎭', shopping: '🛍️', outdoors: '🏕️',
  culture: '🏛️', travel: '✈️', sports: '⚽', health: '💊',
  education: '📚', other: '📍',
};

const CATEGORY_COLORS = {
  food:          'from-accent-warning/20 to-accent-danger/20 border-accent-warning/30',
  entertainment: 'from-accent-violet/20 to-accent-violet/10 border-accent-violet/30',
  shopping:      'from-accent-primary/20 to-accent-secondary/20 border-accent-primary/30',
  outdoors:      'from-accent-success/20 to-accent-success/10 border-accent-success/30',
  culture:       'from-accent-warning/20 to-accent-warning/10 border-accent-warning/30',
  travel:        'from-accent-primary/20 to-accent-primary/10 border-accent-primary/30',
  sports:        'from-accent-danger/20 to-accent-warning/20 border-accent-danger/30',
  health:        'from-accent-secondary/20 to-accent-success/20 border-accent-secondary/30',
  education:     'from-accent-violet/20 to-accent-violet/10 border-accent-violet/30',
  other:         'from-surface-hover to-surface-divider border-surface-divider',
};

// ── Sub-components ────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({ title, subtitle, action, onAction }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-txt-primary">{title}</h2>
        {subtitle && <p className="text-sm text-txt-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button onClick={onAction} className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium transition-colors">
          {action}
        </button>
      )}
    </div>
  );
});

const CategoryChip = memo(function CategoryChip({ category, count, isActive, onClick }) {
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  return (
    <motion.button
      variants={cardVariants}
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border backdrop-blur-sm transition-all duration-200 bg-gradient-to-br ${colorClass} ${isActive ? 'ring-2 ring-accent-violet shadow-lg shadow-accent-violet/10' : 'hover:shadow-md'}`}
    >
      <span className="text-xl">{CATEGORY_ICONS[category] || '📍'}</span>
      <div className="text-left">
        <div className="text-sm font-medium text-txt-primary capitalize">{category}</div>
        <div className="text-xs text-txt-muted">{count} {count === 1 ? 'place' : 'places'}</div>
      </div>
    </motion.button>
  );
});

const TrendingPinCard = memo(function TrendingPinCard({ pin, onClick }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden glass border border-surface-divider hover:border-accent-violet/30 transition-all duration-300"
    >
      <div className="relative h-40 overflow-hidden">
        {pin.images?.[0] ? (
          <LazyImage src={pin.images[0]} alt={pin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 flex items-center justify-center">
            <span className="text-4xl">{CATEGORY_ICONS[pin.category] || '📍'}</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm capitalize">
            {pin.category}
          </span>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
          <svg className="w-3 h-3 text-accent-danger" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
          <span className="text-xs text-white font-medium">{pin.likes?.length || pin.likesCount || 0}</span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-txt-primary text-sm truncate">{pin.title}</h3>
        {pin.address && <p className="text-xs text-txt-muted mt-1 truncate">{typeof pin.address === 'object' ? pin.address.display || pin.address.name || '' : pin.address}</p>}
        {pin.createdBy && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-5 h-5 rounded-full bg-surface-hover overflow-hidden flex-shrink-0">
              {pin.createdBy.avatar ? <img src={pin.createdBy.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-accent-primary/20 flex items-center justify-center text-[10px] font-bold text-accent-primary">{pin.createdBy.name?.[0]}</div>}
            </div>
            <span className="text-xs text-txt-muted truncate">{pin.createdBy.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const EventCard = memo(function EventCard({ event, onClick }) {
  const startDate = event.startDate ? new Date(event.startDate) : null;
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group cursor-pointer flex gap-3 p-3 rounded-xl glass border border-surface-divider hover:border-accent-violet/30 transition-all"
    >
      {startDate && (
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-accent-primary/10 flex flex-col items-center justify-center">
          <span className="text-xs font-medium text-accent-primary uppercase">{startDate.toLocaleDateString('en', { month: 'short' })}</span>
          <span className="text-lg font-bold text-accent-primary leading-none">{startDate.getDate()}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-txt-primary truncate">{event.title}</h3>
        <p className="text-xs text-txt-muted mt-0.5 truncate">{event.location?.address || event.address || 'Location TBD'}</p>
        {event.attendees && (
          <div className="flex items-center gap-1 mt-1.5">
            <svg className="w-3.5 h-3.5 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
            <span className="text-xs text-txt-muted">{event.attendees?.length || 0} attending</span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const UserCard = memo(function UserCard({ user, onClick }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group cursor-pointer flex flex-col items-center gap-2 p-4 rounded-2xl glass border border-surface-divider hover:border-accent-violet/30 transition-all"
    >
        <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-surface-divider group-hover:ring-accent-violet/30 transition-all">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-primary/30 to-accent-primary/10 flex items-center justify-center text-lg font-bold text-accent-primary">{user.name?.[0]?.toUpperCase()}</div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <div className="font-medium text-sm text-txt-primary truncate">{user.name}</div>
        {user.bio && <p className="text-xs text-txt-muted truncate mt-0.5">{user.bio}</p>}
        <div className="text-xs text-txt-muted mt-1">
          {user.followers?.length || 0} followers
        </div>
      </div>
    </motion.div>
  );
});

const RecommendedPinCard = memo(function RecommendedPinCard({ pin, onClick }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="group cursor-pointer flex gap-3 p-2.5 rounded-xl hover:bg-surface-hover/50 transition-all"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
        {pin.images?.[0] ? (
          <LazyImage src={pin.images[0]} alt={pin.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 flex items-center justify-center text-2xl">
            {CATEGORY_ICONS[pin.category] || '📍'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-medium text-sm text-txt-primary truncate">{pin.title}</h3>
        <p className="text-xs text-txt-muted mt-0.5 capitalize">{pin.category}</p>
        <div className="flex items-center gap-2 mt-1">
          {pin.averageRating > 0 && (
            <div className="flex items-center gap-0.5">
              <svg className="w-3 h-3 text-accent-warning" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              <span className="text-xs text-txt-muted">{pin.averageRating.toFixed(1)}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <svg className="w-3 h-3 text-accent-danger" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
            <span className="text-xs text-txt-muted">{pin.likes?.length || pin.likesCount || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function LoadingGrid({ count = 6, type = 'card' }) {
  if (type === 'category') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="w-36 h-16 rounded-2xl flex-shrink-0" />
        ))}
      </div>
    );
  }
  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  // Data states
  const [categories, setCategories] = useState([]);
  const [trendingPins, setTrendingPins] = useState([]);
  const [recommendedPins, setRecommendedPins] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [discoverFeed, setDiscoverFeed] = useState(null);

  // Loading states
  const [loading, setLoading] = useState(true);

  // Active category filter
  const [activeCategory, setActiveCategory] = useState(null);
  const [filteredPins, setFilteredPins] = useState([]);
  const [loadingFiltered, setLoadingFiltered] = useState(false);

  // Fetch all data on mount — single batch via Promise.allSettled
  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      discoverApi.getPopularCategories({}),
      pinApi.getTrending(),
      discoverApi.getRecommended({ limit: 8 }),
      discoverApi.getSuggestedUsers(),
      discoverApi.getFeed(),
    ]).then(([catResult, trendResult, recResult, sugResult, feedResult]) => {
      if (cancelled) return;

      if (catResult.status === 'fulfilled') {
        setCategories(Array.isArray(catResult.value.data) ? catResult.value.data : []);
      }
      if (trendResult.status === 'fulfilled') {
        const items = trendResult.value.data?.data || trendResult.value.data;
        setTrendingPins(Array.isArray(items) ? items.slice(0, 8) : []);
      }
      if (recResult.status === 'fulfilled') {
        const items = recResult.value.data?.data || recResult.value.data;
        setRecommendedPins(Array.isArray(items) ? items : []);
      }
      if (sugResult.status === 'fulfilled') {
        const items = sugResult.value.data?.data || sugResult.value.data;
        setSuggestedUsers(Array.isArray(items) ? items : []);
      }
      if (feedResult.status === 'fulfilled') {
        setDiscoverFeed(feedResult.value.data);
      }

      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  // Handle category filter
  const handleCategoryClick = useCallback((cat) => {
    if (activeCategory === cat) {
      setActiveCategory(null);
      setFilteredPins([]);
      return;
    }
    setActiveCategory(cat);
    setLoadingFiltered(true);
    pinApi.searchPins(cat)
      .then((res) => {
        const items = res.data?.data || res.data;
        setFilteredPins(Array.isArray(items) ? items.slice(0, 12) : []);
      })
      .catch(() => setFilteredPins([]))
      .finally(() => setLoadingFiltered(false));
  }, [activeCategory]);

  // Stable navigation callbacks
  const navigateToMap = useCallback(() => navigate('/'), [navigate]);
  const navigateToSettings = useCallback(() => navigate('/settings'), [navigate]);
  const navigateToTrending = useCallback(() => navigate('/?filter=trending'), [navigate]);
  const navigateToEvents = useCallback(() => navigate('/?panel=events'), [navigate]);
  const navigateToPin = useCallback((id) => navigate(`/?pin=${id}`), [navigate]);
  const navigateToProfile = useCallback((id) => navigate(`/profile/${id}`), [navigate]);
  const navigateToEvent = useCallback((id) => navigate(`/?event=${id}`), [navigate]);
  const clearFilter = useCallback(() => { setActiveCategory(null); setFilteredPins([]); }, []);

  const feedEvents = discoverFeed?.sections?.find(s => s.type === 'upcoming_events')?.data || [];

  return (
    <motion.div
      className="h-full overflow-y-auto scrollbar-thin"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Hero ── */}
        <motion.div variants={sectionVariants} className="relative overflow-hidden rounded-3xl glass border border-surface-divider p-6 sm:p-10">

          {/* Animated mesh gradient background */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/15 via-accent-secondary/5 via-50% to-accent-violet/15" />
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-accent-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-accent-secondary/10 rounded-full blur-3xl" />
          </motion.div>

          {/* Floating decorative orbs */}
          <motion.div
            className="absolute top-5 right-12 w-14 h-14 rounded-full bg-gradient-to-br from-accent-primary/25 to-accent-secondary/25 blur-2xl"
            animate={{ y: [-5, 5, -5], x: [0, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-6 left-8 w-9 h-9 rounded-full bg-gradient-to-br from-accent-violet/25 to-accent-primary/25 blur-xl"
            animate={{ y: [4, -4, 4], x: [-3, 3, -3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />
          <motion.div
            className="absolute top-1/2 right-1/3 w-6 h-6 rounded-full bg-accent-secondary/20 blur-lg"
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />

          <div className="relative">
            {/* Bold gradient title */}
            <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                Discover
              </span>
              {user?.name && (
                <span className="text-txt-primary">{`, ${user.name.split(' ')[0]}`}</span>
              )}
            </h1>

            {/* Lighter subtitle */}
            <p className="text-txt-muted mt-3 max-w-md text-sm sm:text-base font-body leading-relaxed">
              Explore trending places, upcoming events, and connect with people around you.
            </p>

            {/* Animated stat counters */}
            <div className="flex gap-6 mt-5">
              {[
                { value: '12K+', label: 'Places' },
                { value: '500+', label: 'Events' },
                { value: '2K+', label: 'Users' },
              ].map(({ value, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.13, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col"
                >
                  <span className="font-heading text-xl font-bold text-txt-primary leading-none">{value}</span>
                  <span className="text-xs text-txt-muted font-body mt-0.5">{label}</span>
                </motion.div>
              ))}
            </div>

            {/* Search bar + CTA row */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => navigate('/?panel=search')}
                className="flex items-center gap-2 flex-1 sm:max-w-xs px-4 py-2.5 rounded-xl glass border border-surface-divider text-txt-muted text-sm hover:border-accent-primary/50 hover:text-txt-secondary transition-all group"
              >
                <svg className="w-4 h-4 shrink-0 group-hover:text-accent-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="truncate">Search places, events…</span>
              </button>
              <motion.button
                onClick={navigateToMap}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-semibold shadow-lg shadow-accent-primary/30 hover:opacity-90 transition-opacity shrink-0"
              >
                Open Map
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Popular Categories ── */}
        <motion.section variants={sectionVariants}>
          <SectionHeader title="Popular Categories" subtitle="Explore places by category" />
          {loading ? (
            <LoadingGrid count={6} type="category" />
          ) : categories.length > 0 ? (
            <motion.div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin" variants={pageVariants}>
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.category}
                  category={cat.category}
                  count={cat.count}
                  isActive={activeCategory === cat.category}
                  onClick={() => handleCategoryClick(cat.category)}
                />
              ))}
            </motion.div>
          ) : null}
        </motion.section>

        {/* ── Filtered by Category ── */}
        <AnimatePresence>
          {activeCategory && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionHeader
                title={`${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Places`}
                action="Clear filter"
                onAction={clearFilter}
              />
              {loadingFiltered ? (
                <LoadingGrid count={6} />
              ) : filteredPins.length > 0 ? (
                <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-4" variants={pageVariants} initial="hidden" animate="visible">
                  {filteredPins.map((pin) => (
                    <TrendingPinCard key={pin._id} pin={pin} onClick={() => navigateToPin(pin._id)} />
                  ))}
                </motion.div>
              ) : (
                <EmptyState title="No places found" description={`No ${activeCategory} places found nearby`} icon="map-pin" />
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Trending Places ── */}
        <motion.section variants={sectionVariants}>
          <SectionHeader title="Trending Places" subtitle="Most popular spots right now" action="View all" onAction={navigateToTrending} />
          {loading ? (
            <LoadingGrid count={6} />
          ) : trendingPins.length > 0 ? (
            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={pageVariants}>
              {trendingPins.map((pin) => (
                <TrendingPinCard key={pin._id} pin={pin} onClick={() => navigateToPin(pin._id)} />
              ))}
            </motion.div>
          ) : (
            <EmptyState title="No trending places yet" description="Be the first to add a place!" icon="map-pin" />
          )}
        </motion.section>

        {/* ── Two-column: Recommended + Events ── */}
        <div className="grid md:grid-cols-5 gap-6">
          {/* Recommended for You */}
          <motion.section variants={sectionVariants} className="md:col-span-3">
            <SectionHeader title="Recommended for You" subtitle="Based on your interests" />
            {loading ? (
              <LoadingGrid count={4} type="list" />
            ) : recommendedPins.length > 0 ? (
              <div className="glass rounded-2xl border border-surface-divider divide-y divide-surface-divider">
                {recommendedPins.map((pin) => (
                  <RecommendedPinCard key={pin._id} pin={pin} onClick={() => navigateToPin(pin._id)} />
                ))}
              </div>
            ) : (
              <EmptyState title="No recommendations yet" description="Save and like some places to get personalized recommendations" icon="sparkles" />
            )}
          </motion.section>

          {/* Upcoming Events */}
          <motion.section variants={sectionVariants} className="md:col-span-2">
            <SectionHeader title="Upcoming Events" subtitle="Don't miss out" action="View all" onAction={navigateToEvents} />
            {loading ? (
              <LoadingGrid count={3} type="list" />
            ) : feedEvents.length > 0 ? (
              <div className="space-y-3">
                {feedEvents.map((event) => (
                  <EventCard key={event._id} event={event} onClick={() => navigateToEvent(event._id)} />
                ))}
              </div>
            ) : (
              <EmptyState title="No upcoming events" description="Create an event to get started" icon="calendar" />
            )}
          </motion.section>
        </div>

        {/* ── People You Might Know ── */}
        <motion.section variants={sectionVariants}>
          <SectionHeader title="People You Might Know" subtitle="Connect with the community" />
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
            </div>
          ) : suggestedUsers.length > 0 ? (
            <motion.div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" variants={pageVariants}>
              {suggestedUsers.map((u) => (
                <UserCard key={u._id} user={u} onClick={() => navigateToProfile(u._id)} />
              ))}
            </motion.div>
          ) : (
            <EmptyState title="No suggestions yet" description="Follow some users to discover more people" icon="users" />
          )}
        </motion.section>

        {/* ── Footer spacing ── */}
        <div className="h-8" />
      </div>
    </motion.div>
  );
}
