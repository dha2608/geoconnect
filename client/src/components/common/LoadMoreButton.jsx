import { memo } from 'react';

const LoadMoreButton = memo(function LoadMoreButton({ onClick, loading, hasMore }) {
  if (!hasMore) return null;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 px-4 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Load More'}
    </button>
  );
});

export default LoadMoreButton;
