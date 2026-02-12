import { create } from 'zustand';
import type { SearchResult } from '../types/search';

interface PlaceSearchStore {
  query: string;
  results: SearchResult[];
  selectedResult: SearchResult | null;
  isSearching: boolean;
  error: string | null;
  
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setSelectedResult: (result: SearchResult | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setError: (error: string | null) => void;
  clearSearch: () => void;
  clearSelectedResult: () => void;
}

export const usePlaceSearchStore = create<PlaceSearchStore>((set) => ({
  query: '',
  results: [],
  selectedResult: null,
  isSearching: false,
  error: null,
  
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setSelectedResult: (result) => set({ selectedResult: result, query: result?.name || '' }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setError: (error) => set({ error }),
  clearSearch: () => set({ query: '', results: [], error: null }),
  clearSelectedResult: () => set({ selectedResult: null, query: '' }),
}));
