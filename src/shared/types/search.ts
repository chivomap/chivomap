export interface SearchResult {
  id: string;
  name: string;
  display_name: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  distance_m?: number;
  address?: {
    street?: string;
    house_number?: string;
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
}

export interface SearchResponse {
  query?: string;
  count: number;
  results: SearchResult[];
  provider?: string;
}
