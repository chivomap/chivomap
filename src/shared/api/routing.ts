import { env } from '../config/env';
import type { Location } from '../types/trip';

export interface WalkRouteResponse {
  distance_m: number;
  duration_s: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

const API_URL = env.API_URL;

export const getWalkRoute = async (from: Location, to: Location): Promise<WalkRouteResponse> => {
  const fromParam = `${from.lat},${from.lng}`;
  const toParam = `${to.lat},${to.lng}`;
  const response = await fetch(`${API_URL}/routing/foot?from=${fromParam}&to=${toParam}`);

  if (!response.ok) {
    throw new Error(`Walk route failed: ${response.statusText}`);
  }

  return response.json();
};
