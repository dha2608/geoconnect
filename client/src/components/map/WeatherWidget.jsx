/**
 * WeatherWidget.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Compact weather display widget rendered INSIDE <MapContainer>.
 * Data comes from the free Open-Meteo API (no API key required).
 *
 * Collapsed state : weather icon + temperature only  (~80 px wide)
 * Expanded (hover): full card — icon, description, humidity, wind
 *
 * Features:
 *  • Reads userLocation from Redux; falls back to map centre
 *  • Auto-refreshes every 15 minutes
 *  • Abort-safe fetch (cancels in-flight request on coord change)
 *  • Graceful error handling — renders nothing if the API fails
 *  • Glass morphism + framer-motion expand animation
 *  • L.DomEvent isolation from the Leaflet canvas
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';

// ── Constants ─────────────────────────────────────────────────────────────────

const REFRESH_MS = 15 * 60 * 1000; // 15 minutes

/**
 * WMO Weather Interpretation Code → icon + description.
 * https://open-meteo.com/en/docs#weathervariables
 */
const WEATHER_CODES = {
  0:  { icon: '☀️',  desc: 'Clear sky' },
  1:  { icon: '🌤️', desc: 'Mainly clear' },
  2:  { icon: '⛅',  desc: 'Partly cloudy' },
  3:  { icon: '☁️',  desc: 'Overcast' },
  45: { icon: '🌫️', desc: 'Foggy' },
  48: { icon: '🌫️', desc: 'Depositing rime fog' },
  51: { icon: '🌦️', desc: 'Light drizzle' },
  53: { icon: '🌦️', desc: 'Moderate drizzle' },
  55: { icon: '🌧️', desc: 'Dense drizzle' },
  61: { icon: '🌧️', desc: 'Slight rain' },
  63: { icon: '🌧️', desc: 'Moderate rain' },
  65: { icon: '🌧️', desc: 'Heavy rain' },
  71: { icon: '🌨️', desc: 'Slight snow' },
  73: { icon: '🌨️', desc: 'Moderate snow' },
  75: { icon: '❄️',  desc: 'Heavy snow' },
  80: { icon: '🌦️', desc: 'Slight showers' },
  81: { icon: '🌧️', desc: 'Moderate showers' },
  82: { icon: '⛈️',  desc: 'Violent showers' },
  95: { icon: '⛈️',  desc: 'Thunderstorm' },
  96: { icon: '⛈️',  desc: 'Thunderstorm w/ hail' },
  99: { icon: '⛈️',  desc: 'Thunderstorm w/ heavy hail' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve a WMO code to { icon, desc }.
 * If the exact code isn't in the map, steps down to the nearest lower key.
 */
function resolveWeather(code) {
  if (WEATHER_CODES[code]) return WEATHER_CODES[code];
  const keys = Object.keys(WEATHER_CODES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (k <= code) return WEATHER_CODES[k];
  }
  return { icon: '🌡️', desc: 'Unknown' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Pulsing placeholder block while weather data is loading. */
function SkeletonBar({ className }) {
  return (
    <div className={`animate-pulse rounded bg-white/10 ${className}`} />
  );
}

/** Single stat pill: icon + value label. */
function StatPill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <span className="text-[11px] text-txt-muted leading-none">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WeatherWidget() {
  const map          = useMap();
  const containerRef = useRef(null);
  const abortRef     = useRef(null);   // AbortController for in-flight fetches
  const timerRef     = useRef(null);   // setInterval handle

  /** { lat, lng, accuracy } | null */
  const userLocation = useSelector((state) => state.map.userLocation);

  const [weather, setWeather] = useState(null);   // parsed weather payload
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [fatalError, setFatalError] = useState(false); // only true when API failed & no cached data

  // ── Leaflet event isolation ────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  // ── Fetch logic ────────────────────────────────────────────────────────────

  const fetchWeather = useCallback(async (lat, lng) => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&timezone=auto`;

      const res = await fetch(url, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const c    = data.current;
      const u    = data.current_units ?? {};

      setWeather({
        temp:     Math.round(c.temperature_2m),
        humidity: c.relative_humidity_2m,
        wind:     Math.round(c.wind_speed_10m),
        code:     c.weather_code,
        units: {
          temp: u.temperature_2m ?? '°C',
          wind: u.wind_speed_10m ?? 'km/h',
        },
      });
      setFatalError(false);
    } catch (err) {
      if (err.name === 'AbortError') return; // request was intentionally cancelled
      // Keep stale data visible; mark fatal only when we have nothing to show
      setFatalError((prev) => prev || !weather);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — no deps needed; reads nothing from closure

  // ── Trigger fetch on mount + userLocation change + 15-min refresh ──────────

  useEffect(() => {
    const lat = userLocation?.lat ?? map.getCenter().lat;
    const lng = userLocation?.lng ?? map.getCenter().lng;

    fetchWeather(lat, lng);

    timerRef.current = setInterval(() => {
      const la = userLocation?.lat ?? map.getCenter().lat;
      const ln = userLocation?.lng ?? map.getCenter().lng;
      fetchWeather(la, ln);
    }, REFRESH_MS);

    return () => {
      clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, [userLocation, fetchWeather, map]);

  // ── Early-out: show subtle error indicator on API failure with no cached data ─

  if (fatalError) {
    return (
      <div
        className="absolute right-16 bottom-12 z-[1000] select-none"
        role="region"
        aria-label="Weather unavailable"
      >
        <div
          className="glass rounded-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-90 transition-opacity"
          onClick={() => {
            setFatalError(false);
            setLoading(true);
            const lat = userLocation?.lat ?? map.getCenter().lat;
            const lng = userLocation?.lng ?? map.getCenter().lng;
            fetchWeather(lat, lng);
          }}
          title="Click to retry"
        >
          <span className="text-lg">⚠️</span>
          <span className="text-xs text-txt-muted">Weather unavailable</span>
        </div>
      </div>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const weatherInfo = weather ? resolveWeather(weather.code) : null;
  const atUserLoc   = Boolean(userLocation?.lat);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Position: bottom-right of the map, sitting above MapControls' bottom padding.
      // right-16 keeps it clear of the right-side control column (right-4, w-10 = 56 px).
      className="absolute right-16 bottom-12 z-[1000] select-none"
      role="region"
      aria-label="Current weather conditions"
    >
      {/* Outer pill animates its width so the expand feels smooth */}
      <motion.div
        layout
        initial={false}
        animate={{ width: hovered && weather ? 'auto' : '82px' }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="glass rounded-xl overflow-hidden"
        style={{ minWidth: 82 }}
      >

        {/* ── Loading skeleton (first load only) ─────────────────────────── */}
        {loading && !weather && (
          <div className="flex items-center gap-2 px-3 py-2.5" aria-busy="true" aria-label="Loading weather">
            <SkeletonBar className="w-7 h-7 rounded-full" />
            <SkeletonBar className="w-10 h-3.5" />
          </div>
        )}

        {/* ── Loaded state ─────────────────────────────────────────────────── */}
        {weather && (
          <AnimatePresence mode="wait" initial={false}>
            {hovered ? (
              /* ── Expanded card ────────────────────────────────────────── */
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="flex flex-col gap-2.5 px-3.5 py-3"
              >
                {/* Header row: big icon + temp + description */}
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {weatherInfo.icon}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-txt-primary leading-none">
                      {weather.temp}{weather.units.temp}
                    </span>
                    <span className="text-[11px] text-txt-muted leading-none whitespace-nowrap">
                      {weatherInfo.desc}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-surface-divider" />

                {/* Stats row: humidity + wind */}
                <div className="flex items-center justify-between gap-4">
                  {/* Humidity — water-drop icon */}
                  <StatPill
                    icon={
                      <svg
                        className="w-3.5 h-3.5 text-blue-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0 0 14 0C19 9.5 12 2 12 2Z" />
                      </svg>
                    }
                    label={`${weather.humidity}%`}
                  />

                  {/* Wind — feather icon */}
                  <StatPill
                    icon={
                      <svg
                        className="w-3.5 h-3.5 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
                        <path d="M10.59 19.41A2 2 0 1 0 14 16H2" />
                        <path d="M15.73 7.73A2.5 2.5 0 1 1 19.5 12H2" />
                      </svg>
                    }
                    label={`${weather.wind} ${weather.units.wind}`}
                  />
                </div>

                {/* Source hint */}
                <span className="text-[10px] text-txt-muted/50 leading-none">
                  {atUserLoc ? '📍 Your location' : '🗺️ Map centre'}
                  {loading && ' · refreshing…'}
                </span>
              </motion.div>
            ) : (
              /* ── Collapsed pill: icon + temperature only ─────────────── */
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="flex items-center gap-1.5 px-2.5 py-2.5"
                title={`${weatherInfo.desc} · ${weather.humidity}% humidity · ${weather.wind} ${weather.units.wind} wind`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {weatherInfo.icon}
                </span>
                <span className="text-sm font-semibold text-txt-primary whitespace-nowrap leading-none">
                  {weather.temp}{weather.units.temp}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
