import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { geocodeApi } from '../../api/geocodeApi';
import { flyToLocation, setDestination } from '../../features/map/mapSlice';

export default function SearchBar() {
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await geocodeApi.search(q);
      setResults(data || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const handleSelect = (result) => {
    dispatch(flyToLocation({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      zoom: 16,
    }));
    setQuery(result.display_name.split(',')[0]);
    setIsOpen(false);
  };

  const handleSetDestination = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',')[0];
    const address = result.display_name;
    dispatch(setDestination({ lat, lng, name, address }));
    dispatch(flyToLocation({ lat, lng, zoom: 16 }));
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="absolute top-4 left-4 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto z-[1001]">
      {/* Search Input */}
      <div className="glass rounded-xl flex items-center gap-2 px-3 py-2.5">
        {/* Search icon */}
        <svg className="w-4 h-4 text-txt-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search locations..."
          className="flex-1 bg-transparent text-sm text-txt-primary placeholder:text-txt-muted outline-none font-body"
        />
        {isLoading && (
          <svg className="w-4 h-4 text-accent-primary animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/>
          </svg>
        )}
        {query && !isLoading && (
          <button onClick={handleClear} className="text-txt-muted hover:text-txt-primary transition-colors flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="mt-2 glass rounded-xl overflow-hidden max-h-72 overflow-y-auto"
          >
            {results.map((result, i) => (
              <div
                key={result.place_id || i}
                className="flex items-center border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group"
              >
                {/* Main area — click to fly to location */}
                <button
                  onClick={() => handleSelect(result)}
                  className="flex-1 px-3 py-2.5 flex items-start gap-3 text-left min-w-0"
                >
                  <svg className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm text-txt-primary truncate">{result.display_name.split(',')[0]}</p>
                    <p className="text-xs text-txt-muted truncate">{result.display_name}</p>
                  </div>
                </button>

                {/* Set as destination button */}
                <button
                  onClick={() => handleSetDestination(result)}
                  title="Set as destination"
                  className="p-2 mr-2 text-txt-muted hover:text-accent-primary transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                  </svg>
                </button>
              </div>
            ))}
          </motion.div>
        )}
        {isOpen && query.length >= 3 && results.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 glass rounded-xl p-4 text-center"
          >
            <p className="text-sm text-txt-muted">No locations found</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
