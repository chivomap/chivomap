import { env } from '../config/env';
import type { SearchResponse } from '../types/search';

const API_URL = env.API_URL;

export interface SearchPlacesParams {
  query: string;
  lat?: number;
  lng?: number;
  limit?: number;
  country?: string;
}

export const searchPlaces = async (params: SearchPlacesParams): Promise<SearchResponse> => {
  const searchParams = new URLSearchParams({
    q: params.query,
    ...(params.lat && { lat: params.lat.toString() }),
    ...(params.lng && { lng: params.lng.toString() }),
    ...(params.limit && { limit: params.limit.toString() }),
    ...(params.country && { country: params.country }),
  });

  const response = await fetch(`${API_URL}/places/search?${searchParams}`);
  
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
};

export const reverseGeocode = async (lat: number, lng: number): Promise<SearchResponse> => {
  const response = await fetch(`${API_URL}/places/reverse?lat=${lat}&lng=${lng}`);
  
  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.statusText}`);
  }

  return response.json();
};
