import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUserLocation, setIsLocating, setLocationError } from '../features/map/mapSlice';

export default function useGeolocation(options = {}) {
  const dispatch = useDispatch();
  const { userLocation, isLocating, locationError } = useSelector((state) => state.map);
  const watchIdRef = useRef(null);

  const {
    enableHighAccuracy = true,
    maximumAge = 10000,
    timeout = 15000,
    autoWatch = true,
  } = options;

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      dispatch(setLocationError('Geolocation is not supported by your browser'));
      return;
    }

    dispatch(setIsLocating(true));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        dispatch(setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }));
      },
      (error) => {
        let message = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        dispatch(setLocationError(message));
      },
      { enableHighAccuracy, maximumAge, timeout }
    );
  }, [dispatch, enableHighAccuracy, maximumAge, timeout]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const locate = useCallback(() => {
    stopWatching();
    startWatching();
  }, [startWatching, stopWatching]);

  useEffect(() => {
    if (autoWatch) {
      startWatching();
    }
    return () => stopWatching();
  }, [autoWatch, startWatching, stopWatching]);

  return { userLocation, isLocating, locationError, locate, stopWatching };
}
