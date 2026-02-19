import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
  location: { lat: number; lng: number } | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  permissionState: PermissionState | 'unsupported' | null;
}

interface UseGeolocationOptions {
  watch?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onSuccess?: (position: GeolocationPosition) => void;
  onError?: (error: GeolocationPositionError) => void;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 30000,
};

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    watch = false,
    enableHighAccuracy = false,
    timeout = 8000,
    maximumAge = 30000,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    permissionState: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const isRequestingRef = useRef(false);

  const positionOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  };

  // Check permission status
  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, permissionState: 'unsupported' }));
      return;
    }

    if (!navigator.permissions) {
      // Permissions API not supported (older browsers)
      setState((prev) => ({ ...prev, permissionState: 'unsupported' }));
      return;
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        setState((prev) => ({ ...prev, permissionState: result.state }));

        // Listen for permission changes
        result.addEventListener('change', () => {
          setState((prev) => ({ ...prev, permissionState: result.state }));
        });
      })
      .catch(() => {
        // Permissions API failed (some browsers)
        setState((prev) => ({ ...prev, permissionState: 'unsupported' }));
      });
  }, []);

  // Watch position (continuous tracking)
  useEffect(() => {
    if (!watch || !navigator.geolocation) return;

    // Only start watch if permission is granted
    if (state.permissionState !== 'granted') return;

    console.log('🌐 Starting location watch...');

    const successCallback = (position: GeolocationPosition) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      console.log('📍 Location updated:', location);
      setState((prev) => ({ ...prev, location, error: null, loading: false }));
      onSuccess?.(position);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.error('❌ Location watch error:', error);
      setState((prev) => ({ ...prev, error, loading: false }));
      onError?.(error);
    };

    const id = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      positionOptions
    );

    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        console.log('🛑 Stopping location watch');
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [watch, state.permissionState, enableHighAccuracy, timeout, maximumAge]);

  // Get current position (one-time request)
  const getCurrentPosition = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolocation not supported');
        reject(error);
        return;
      }

      // Prevent multiple simultaneous requests
      if (isRequestingRef.current) {
        console.warn('⚠️ Geolocation request already in progress');
        reject(new Error('Request already in progress'));
        return;
      }

      isRequestingRef.current = true;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      console.log('🎯 Requesting current position...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('✅ Location received:', location);
          setState((prev) => ({ ...prev, location, error: null, loading: false }));
          isRequestingRef.current = false;
          onSuccess?.(position);
          resolve(location);
        },
        (error) => {
          console.error('❌ Location error:', error);
          setState((prev) => ({ ...prev, error, loading: false }));
          isRequestingRef.current = false;
          onError?.(error);
          reject(error);
        },
        positionOptions
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, onSuccess, onError]);

  return {
    ...state,
    getCurrentPosition,
  };
};

// Hook simplificado para solo obtener la ubicación actual
export const useCurrentLocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRequestingRef = useRef(false);

  const getLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMsg = 'Tu navegador no soporta geolocalización';
        setError(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      if (isRequestingRef.current) {
        console.warn('⚠️ Geolocation request already in progress');
        reject(new Error('Request already in progress'));
        return;
      }

      isRequestingRef.current = true;
      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLoading(false);
          isRequestingRef.current = false;
          resolve(location);
        },
        (err) => {
          let errorMsg = 'No se pudo obtener tu ubicación';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'Permiso de ubicación denegado. Verifica la configuración de tu navegador.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Ubicación no disponible. Verifica tu conexión GPS.';
              break;
            case err.TIMEOUT:
              errorMsg = 'Tiempo de espera agotado. Intenta de nuevo.';
              break;
          }
          
          setError(errorMsg);
          setLoading(false);
          isRequestingRef.current = false;
          reject(new Error(errorMsg));
        },
        DEFAULT_OPTIONS
      );
    });
  }, []);

  return { getLocation, loading, error };
};
