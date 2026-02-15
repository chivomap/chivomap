export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface TripLeg {
  type: 'walk' | 'bus';
  from: Location;
  to: Location;
  distance_m: number;
  duration_m: number;
  route_code?: string;
  route_name?: string;
  instructions?: string;
}

export interface TripOption {
  legs: TripLeg[];
  total_transfers: number;
  total_walking_m: number;
  estimated_time_m: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface TripPlanRequest {
  origin: Location;
  destination: Location;
  knownStops?: Location[];
}

export interface TripPlanResponse {
  origin: Location;
  destination: Location;
  options: TripOption[];
  has_stops: boolean;
}

export interface TripPlanResponse {
  options: TripOption[];
}
