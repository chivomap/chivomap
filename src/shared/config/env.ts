interface EnvConfig {
  API_URL: string;
  API_TIMEOUT: number;
  MAP_DEFAULT_LAT: number;
  MAP_DEFAULT_LNG: number;
  MAP_DEFAULT_ZOOM: number;
  MAP_MIN_ZOOM: number;
  NODE_ENV: string;
  ENABLE_CONSOLE_LOGS: boolean;
  FEATURE_TRIP_PLANNER: boolean;
  FEATURE_ROUTE_ARROWS: boolean;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[`VITE_${key}`];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable VITE_${key} is required`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = getEnvVar(key, defaultValue?.toString());
  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable VITE_${key} must be a number`);
  }
  return parsed;
};

const getEnvBoolean = (key: string, defaultValue = false): boolean => {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
};

export const env: EnvConfig = {
  API_URL: getEnvVar('API_URL'),
  API_TIMEOUT: getEnvNumber('API_TIMEOUT', 10000),
  MAP_DEFAULT_LAT: getEnvNumber('MAP_DEFAULT_LAT', 13.758960),
  MAP_DEFAULT_LNG: getEnvNumber('MAP_DEFAULT_LNG', -89.653892),
  MAP_DEFAULT_ZOOM: getEnvNumber('MAP_DEFAULT_ZOOM', 9),
  MAP_MIN_ZOOM: getEnvNumber('MAP_MIN_ZOOM', 8),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  ENABLE_CONSOLE_LOGS: getEnvBoolean('ENABLE_CONSOLE_LOGS', true),
  FEATURE_TRIP_PLANNER: getEnvBoolean('FEATURE_TRIP_PLANNER', false),
  FEATURE_ROUTE_ARROWS: getEnvBoolean('FEATURE_ROUTE_ARROWS', false),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
