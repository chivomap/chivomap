import { create } from 'zustand';

interface SearchStore {
  inputValue: string;
  showResults: boolean;
  
  setInputValue: (value: string) => void;
  setShowResults: (show: boolean) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  inputValue: '',
  showResults: false,
  
  setInputValue: (value) => set({ inputValue: value }),
  setShowResults: (show) => set({ showResults: show }),
}));
