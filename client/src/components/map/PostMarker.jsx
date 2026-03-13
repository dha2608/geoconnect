/**
 * PostMarker.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Renders small circular avatar markers on the map for geo-located posts.
 * Fetches posts within the current viewport bounds using the existing
 * `postApi.getMapPosts()` endpoint.
 *
 * Features:
 *  • Author avatar as marker icon (falls back to initial)
 *  • Tooltip on hover: post text preview + author name
 *  • Click → open FeedPanel or navigate to post detail
 *  • Debounced viewport-based fetching
 *  • Soft-fade/scale entrance animation
 */

import { useEffect, useRef, memo, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSelector, useDispatch } from 'react-redux';
import { postApi } from '../../api/postApi';

// ─── CSS injection (one-time) ─────────────────────────────────────────────────

const STYLE_ID = 'geoconnect-post-marker-css';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = /* css */ `
    @keyframes postMarkerPop {
      0%   { transform: scale(0); opacity: 0; }
      70%  { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }

    .post-marker {
      position: relative;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      overflow: hidden;
      border: 2.5px solid rgba(139, 92, 246, 0.7);
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.35), 0 2px 6px rgba(0,0,0,0.3);
      animation: postMarkerPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .post-marker:hover {
      transform: scale(1.25);
      box-shadow: 0 0 16px rgba(139, 92, 246, 0.5), 0 4px 12px rgba(0,0,0,0.4);
    }

    .post-marker img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .post-marker-initial {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: white;
      background: rgba(139, 92, 246, 0.7);
    }

    /* Tooltip override */
    .post-tooltip {
      background: rgba(8, 11, 18, 0.94) !important;
      border: 1px solid rgba(139, 92, 246, 0.25) !important;
      border-radius: 10px !important;
      padding: 8px 12px !important;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      white-space: nowrap;
      pointer-events: none !important;
      max-width: 240px;
    }

    .leaflet-tooltip-top.post-tooltip::before {
      border-top-color: rgba(139, 92, 246, 0.25) !important;
    }
  `;
  document.head.appendChild(el);
}

// ─── Icon factory ─────────────────────────────────────────────────────────────

function createPostIcon(author) {
  const avatar = author?.avatar;
  const name = author?.name || author?.username || '?';
  const initial = name.charAt(0).toUpperCase();

  const inner = avatar
    ? `<img src="${avatar}" alt="${initial}" />`
    : `<div class="post-marker-initial">${initial}</div>`;

  return L.divIcon({
    className: '',
    html: `<div class="post-marker">${inner}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    tooltipAnchor: [0, -18],
  });
}

// ─── Tooltip factory ──────────────────────────────────────────────────────────

function buildTooltip(post) {
  const authorName = post.author?.name || post.author?.username || 'User';
  const text = post.text ?? '';
  const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
  const hasImages = Array.isArray(post.images) && post.images.length > 0;

  return /* html */ `
    <div style="font-family:'DM Sans',sans-serif;min-width:120px;max-width:220px;">
      <div style="font-weight:700;color:#f1f5f9;font-size:12px;margin-bottom:3px;">
        ${authorName}
      </div>
      ${preview ? `<div style="color:#94a3b8;font-size:11px;line-height:1.3;
                               overflow:hidden;text-overflow:ellipsis;white-space:normal;
                               display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
        ${preview}
      </div>` : ''}
      ${hasImages ? `<div style="font-size:10px;color:#8b5cf6;margin-top:3px;">📷 ${post.images.length} photo${post.images.length > 1 ? 's' : ''}</div>` : ''}
    </div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PostMarker = memo(function PostMarker() {
  const map = useMap();
  const dispatch = useDispatch();
  const layerRef = useRef(null);
  const postsRef = useRef([]);
  const debounceRef = useRef(null);

  const viewport = useSelector((state) => state.map.viewport);

  // Inject CSS once
  useEffect(() => { injectStyles(); }, []);

  // Create layer group
  useEffect(() => {
    const group = L.layerGroup();
    group.addTo(map);
    layerRef.current = group;
    return () => { map.removeLayer(group); };
  }, [map]);

  // Render posts
  const renderPosts = useCallback((posts) => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    posts.forEach((post) => {
      const coords = post.location?.coordinates;
      if (!coords || (!coords[0] && !coords[1])) return;

      const [lng, lat] = coords;
      const icon = createPostIcon(post.author);

      const marker = L.marker([lat, lng], {
        icon,
        zIndexOffset: 500, // Below events (1000), above default (0)
        riseOnHover: true,
      });

      marker.bindTooltip(buildTooltip(post), {
        permanent: false,
        direction: 'top',
        className: 'post-tooltip',
        opacity: 1,
      });

      // Click → navigate to post (set URL param so FeedPanel or PostDetail opens)
      marker.on('click', () => {
        // Navigate via URL search params for deep linking
        const url = new URL(window.location);
        url.searchParams.set('post', post._id);
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      layerRef.current.addLayer(marker);
    });
  }, []);

  // Fetch posts when viewport changes (debounced)
  useEffect(() => {
    if (!viewport) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await postApi.getMapPosts({
          swLat: viewport.south,
          swLng: viewport.west,
          neLat: viewport.north,
          neLng: viewport.east,
        });
        const posts = Array.isArray(res.data) ? res.data : [];
        postsRef.current = posts;
        renderPosts(posts);
      } catch {
        // Silent fail — don't block map interaction
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [viewport, renderPosts]);

  return null;
});

PostMarker.displayName = 'PostMarker';
export default PostMarker;
