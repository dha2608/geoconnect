export const searchGeocode = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Query required' });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`,
      { headers: { 'User-Agent': 'GeoConnect/1.0' } }
    );
    
    const data = await response.json();
    const results = data.map(item => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      address: item.address,
    }));
    
    res.json(results);
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
    res.json({
      displayName: data.display_name,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      address: data.address,
    });
  } catch (error) {
    res.status(500).json({ message: 'Reverse geocoding failed', error: error.message });
  }
};
