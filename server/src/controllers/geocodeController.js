import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { ok } from '../utils/response.js';

export const searchGeocode = asyncHandler(async (req, res) => {
  const { q, lat, lng } = req.query;
  if (!q) throw AppError.badRequest('Query required');

  // Build Nominatim URL with optional location bias
  let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1`;

  // If user location provided, add viewbox bias (±0.5° ≈ 50 km) to prefer nearby results
  if (lat && lng) {
    const latF = parseFloat(lat);
    const lngF = parseFloat(lng);
    if (!Number.isNaN(latF) && !Number.isNaN(lngF)) {
      const delta = 2; // ±2° ≈ 200 km — wide enough to catch local POIs
      url += `&viewbox=${lngF - delta},${latF + delta},${lngF + delta},${latF - delta}`;
      url += '&bounded=0'; // prefer but don't restrict to viewbox
    }
  }

  const response = await fetch(url, { headers: { 'User-Agent': 'GeoConnect/1.0' } });

  const data = await response.json();
  // Pass through raw Nominatim results — frontend expects display_name, lat, lon, type, class, place_id
  return ok(res, data);
});

export const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) throw AppError.badRequest('lat and lng required');

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'User-Agent': 'GeoConnect/1.0' }, signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      return ok(res, { display_name: `${lat}, ${lng}`, error: `Nominatim returned ${response.status}` });
    }

    const data = await response.json();
    return ok(res, data);
  } catch {
    // Nominatim timeout or network error — return coords as fallback
    return ok(res, { display_name: `${lat}, ${lng}`, error: 'Geocode service unavailable' });
  }
});
