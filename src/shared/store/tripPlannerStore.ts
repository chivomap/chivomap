import { create } from 'zustand';
import { Location, TripPlanResponse } from '../types/trip';

interface TripPlannerState {
  origin: Location | null;
  destination: Location | null;
  tripPlan: TripPlanResponse | null;
  isSelectingOrigin: boolean;
  isSelectingDestination: boolean;
  
  setOrigin: (location: Location | null) => void;
  setDestination: (location: Location | null) => void;
  setTripPlan: (plan: TripPlanResponse | null) => void;
  setIsSelectingOrigin: (selecting: boolean) => void;
  setIsSelectingDestination: (selecting: boolean) => void;
  swapLocations: () => void;
  reset: () => void;
}

export const useTripPlannerStore = create<TripPlannerState>((set, get) => ({
  origin: null,
  destination: null,
  tripPlan: null,
  isSelectingOrigin: false,
  isSelectingDestination: false,
  
  setOrigin: (location) => set({ origin: location }),
  setDestination: (location) => set({ destination: location }),
  setTripPlan: (plan) => set({ tripPlan: plan }),
  setIsSelectingOrigin: (selecting) => set({ isSelectingOrigin: selecting }),
  setIsSelectingDestination: (selecting) => set({ isSelectingDestination: selecting }),
  
  swapLocations: () => {
    const { origin, destination } = get();
    set({ origin: destination, destination: origin });
  },
  
  reset: () => set({
    origin: null,
    destination: null,
    tripPlan: null,
    isSelectingOrigin: false,
    isSelectingDestination: false,
  }),
}));
