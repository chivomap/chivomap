import { create } from 'zustand';

type Tab = 'info' | 'annotations' | 'tripPlanner';
type SheetState = 'peek' | 'half' | 'full';

interface BottomSheetStore {
  activeTab: Tab;
  sheetState: SheetState;
  setActiveTab: (tab: Tab) => void;
  setSheetState: (state: SheetState) => void;
  openAnnotations: () => void;
}

export const useBottomSheetStore = create<BottomSheetStore>((set) => ({
  activeTab: 'info',
  sheetState: 'peek',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSheetState: (state) => set({ sheetState: state }),
  openAnnotations: () => set({ activeTab: 'annotations', sheetState: 'half' }),
}));
