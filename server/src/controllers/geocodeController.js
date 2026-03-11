export const searchGeocode = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Query required' });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1`,
      { headers: { 'User-Agent': 'GeoConnect/1.0' } }
    );
    
    const data = await response.json();
    // Pass through raw Nominatim results — frontend expects display_name, lat, lon, type, class, place_id
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Geocoding failed', error: error.message });
  }
};

export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'User-Agent': 'GeoConnect/1.0' } }
    );
    
    const data = await response.json();
    // Pass through raw Nominatim result
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Reverse geocoding failed', error: error.message });
  }
};
