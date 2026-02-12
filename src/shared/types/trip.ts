export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface TripLeg {
  type: 'walk' | 'bus';
  from: Location;
  to: Location;
  distance: number;
  duration: number;
  routeCode?: string;
  routeName?: string;
}

export interface TripOption {
  legs: TripLeg[];
  totalDistance: number;
  totalDuration: number;
  transfers: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface TripPlanRequest {
  origin: Location;
  destination: Location;
  knownStops?: Location[];
}

export interface TripPlanResponse {
  options: TripOption[];
}
