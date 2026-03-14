import { useEffect, memo, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { clearFlyTo } from '../../features/map/mapSlice';
import MapViewportTracker from './MapViewportTracker';
import UserLocationMarker from './UserLocationMarker';
import MapControls from './MapControls';
import SearchBar from './SearchBar';
import QuickCategories from './QuickCategories';
import NearbyUsersLayer from '../social/NearbyUsersLayer';
import PinClusterLayer from '../pins/PinClusterLayer';
import EventLayer from '../events/EventLayer';
import MapToolbar from './MapToolbar';
import DestinationMarker from './DestinationMarker';
import FriendMarker from './FriendMarker';
import PostMarker from './PostMarker';
import CoordinateDisplay from './CoordinateDisplay';
import MapContextMenu from './MapContextMenu';
import ScaleBar from './ScaleBar';
import WeatherWidget from './WeatherWidget';
import HeatmapLayer from './HeatmapLayer';
import MapBookmarks from './MapBookmarks';
import PinFilterWidget from './PinFilterWidget';

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    className: 'map-dark',
  },
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    className: '',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    className: '',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    className: 'map-satellite',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    className: '',
  },
};

/**
 * MapInner — must live inside <MapContainer> to call useMap().
 * Handles Redux-driven flyTo (e.g. triggered by search results).
 */
function MapInner() {
  const dispatch = useDispatch();
  const map = useMap();
  const flyTo = useSelector((state) => state.map.flyTo);

  useEffect(() => {
    if (!flyTo) return;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 16, { duration: 1.5 });
    dispatch(clearFlyTo());
  }, [flyTo, map, dispatch]);

  return null;
}

/**
 * MapView — root map layout.
 *
 * Hierarchy:
 *   MapContainer (Leaflet root)
 *     ├─ TileLayer
 *     ├─ MapInner        (flyTo watcher)
 *     ├─ MapViewportTracker (sync viewport → Redux)
 *     ├─ UserLocationMarker (pulsing dot)
 *     ├─ PinClusterLayer (clustered pin markers)
 *     ├─ EventLayer      (event markers on map)
 *     ├─ NearbyUsersLayer (nearby user avatars)
 *     ├─ DestinationMarker (red pin for set destination)
 *     ├─ WeatherWidget   (weather info overlay)
 *     ├─ HeatmapLayer   (pin density heatmap canvas)
 *     ├─ MapBookmarks   (save/restore map positions)
 *     ├─ MapControls     (zoom / locate / tile switcher — uses useMap)
 *     └─ MapToolbar      (map tool actions — draw, measure, etc.)
 *   Overlay div (pointer-events-none)
 *     ├─ SearchBar       (floats above the map canvas)
 *     ├─ QuickCategories (category quick-filter)
 *     └─ PinFilterWidget (category/tag filter panel)
 */
const MapView = memo(function MapView() {
  const { center, zoom, tileLayer } = useSelector((state) => state.map);
  const tile = useMemo(
    () => TILE_LAYERS[tileLayer] ?? TILE_LAYERS.dark,
    [tileLayer]
  );

  return (
    <div className={`relative w-full h-full ${tile.className ?? ''}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ background: 'var(--bg-base)' }}
      >
        <TileLayer url={tile.url} attribution={tile.attribution} />
        <MapInner />
        <MapViewportTracker />
        <UserLocationMarker />
        <PinClusterLayer />
        <EventLayer />
        <NearbyUsersLayer />
        <FriendMarker />
        <PostMarker />
        <DestinationMarker />
        <MapContextMenu />
        <CoordinateDisplay />
        <ScaleBar />
        <WeatherWidget />
        <HeatmapLayer />
        <MapBookmarks />
        <MapControls />
        <MapToolbar />
      </MapContainer>

      {/* SearchBar + QuickCategories rendered above the Leaflet canvas */}
      <div className="absolute inset-0 pointer-events-none z-[1000]">
        <SearchBar />
        <QuickCategories />
        <PinFilterWidget />
      </div>
    </div>
  );
});

MapView.displayName = 'MapView';
export default MapView;
