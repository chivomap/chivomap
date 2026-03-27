import { create } from 'zustand';
import { Location, TripPlanResponse } from '../types/trip';

type FocusedInput = 'origin' | 'destination' | null;

interface TripPlannerState {
  origin: Location | null;
  destination: Location | null;
  tripPlan: TripPlanResponse | null;
  selectedOptionIndex: number | null;
  focusedLegIndex: number | null;
  isSelectingOrigin: boolean;
  isSelectingDestination: boolean;
  focusedInput: FocusedInput;

  setOrigin: (location: Location | null) => void;
  setDestination: (location: Location | null) => void;
  setTripPlan: (plan: TripPlanResponse | null) => void;
  setSelectedOptionIndex: (index: number | null) => void;
  setFocusedLegIndex: (index: number | null) => void;
  setIsSelectingOrigin: (selecting: boolean) => void;
  setIsSelectingDestination: (selecting: boolean) => void;
  setFocusedInput: (input: FocusedInput) => void;
  swapLocations: () => void;
  reset: () => void;
}

export const useTripPlannerStore = create<TripPlannerState>((set, get) => ({
  origin: null,
  destination: null,
  tripPlan: null,
  selectedOptionIndex: null,
  focusedLegIndex: null,
  isSelectingOrigin: false,
  isSelectingDestination: false,
  focusedInput: null,

  setOrigin: (location) => set({ origin: location }),
  setDestination: (location) => set({ destination: location }),
  setTripPlan: (plan) => set({ tripPlan: plan }),
  setSelectedOptionIndex: (index) => set({ selectedOptionIndex: index }),
  setFocusedLegIndex: (index) => set({ focusedLegIndex: index }),
  setIsSelectingOrigin: (selecting) => set({
    isSelectingOrigin: selecting,
    ...(selecting && { isSelectingDestination: false }),
  }),
  setIsSelectingDestination: (selecting) => set({
    isSelectingDestination: selecting,
    ...(selecting && { isSelectingOrigin: false }),
  }),
  setFocusedInput: (input) => set({ focusedInput: input }),
  
  swapLocations: () => {
    const { origin, destination } = get();
    set({ origin: destination, destination: origin });
  },
  
  reset: () => set({
    origin: null,
    destination: null,
    tripPlan: null,
    selectedOptionIndex: null,
    focusedLegIndex: null,
    isSelectingOrigin: false,
    isSelectingDestination: false,
    focusedInput: null,
  }),
}));
