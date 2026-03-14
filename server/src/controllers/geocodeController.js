import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { ok } from '../utils/response.js';

export const searchGeocode = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw AppError.badRequest('Query required');

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1`,
    { headers: { 'User-Agent': 'GeoConnect/1.0' } }
  );

  const data = await response.json();
  // Pass through raw Nominatim results — frontend expects display_name, lat, lon, type, class, place_id
  return ok(res, data);
});

export const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) throw AppError.badRequest('lat and lng required');

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
    { headers: { 'User-Agent': 'GeoConnect/1.0' } }
  );

  const data = await response.json();
  // Pass through raw Nominatim result
  return ok(res, data);
});
