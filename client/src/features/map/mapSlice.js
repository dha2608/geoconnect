import { createSlice } from '@reduxjs/toolkit';

const mapSlice = createSlice({
  name: 'map',
  initialState: {
    center: [10.8231, 106.6297], // Ho Chi Minh City default
    zoom: 13,
    viewport: null, // { north, south, east, west }
    tileLayer: 'dark', // 'dark' | 'satellite' | 'light'
    userLocation: null, // { lat, lng, accuracy }
    isLocating: false,
    locationError: null,
    flyTo: null, // { lat, lng, zoom } - triggers map fly animation, consumed after use
    destination: null, // { lat, lng, name, address } - marked destination on map
    locationPermission: 'prompt', // 'prompt' | 'granted' | 'denied'
  },
  reducers: {
    setCenter: (state, action) => { state.center = action.payload; },
    setZoom: (state, action) => { state.zoom = action.payload; },
    setViewport: (state, action) => { state.viewport = action.payload; },
    setTileLayer: (state, action) => { state.tileLayer = action.payload; },
    setUserLocation: (state, action) => {
      state.userLocation = action.payload;
      state.isLocating = false;
      state.locationError = null;
    },
    setIsLocating: (state, action) => { state.isLocating = action.payload; },
    setLocationError: (state, action) => {
      state.locationError = action.payload;
      state.isLocating = false;
    },
    flyToLocation: (state, action) => { state.flyTo = action.payload; },
    clearFlyTo: (state) => { state.flyTo = null; },
    setDestination: (state, action) => { state.destination = action.payload; },
    clearDestination: (state) => { state.destination = null; },
    setLocationPermission: (state, action) => { state.locationPermission = action.payload; },
  },
});

export const { setCenter, setZoom, setViewport, setTileLayer, setUserLocation, setIsLocating, setLocationError, flyToLocation, clearFlyTo, setDestination, clearDestination, setLocationPermission } = mapSlice.actions;
export default mapSlice.reducer;
