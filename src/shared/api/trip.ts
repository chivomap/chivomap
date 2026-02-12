import { TripPlanRequest, TripPlanResponse } from '../types/trip';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function planTrip(request: TripPlanRequest): Promise<TripPlanResponse> {
  const response = await fetch(`${API_BASE_URL}/trip/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to plan trip: ${response.statusText}`);
  }

  return response.json();
}
