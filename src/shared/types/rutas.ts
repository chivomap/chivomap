// Tipos para las rutas de transporte

export interface RutaNearby {
  codigo: string;
  nombre: string;
  tipo: string;
  subtipo: string;
  sentido: string;
  departamento: string;
  kilometros: number;
  distancia_m: number;
  geometry?: {
    type: 'LineString';
    low: [number, number][];
    med: [number, number][];
    high: [number, number][];
    ultra: [number, number][];
  };
}

export interface RutaMetadata {
  codigo: string;
  nombre: string;
  sentido: string;
  tipo: string;
  subtipo: string;
  departamento: string;
  kilometros: number;
}

export type RutaLineCoord = [number, number] | [number, number, number];
export type RutaLineCoords = RutaLineCoord[];
export type RutaMultiLineCoords = RutaLineCoord[][];

export interface RutaGeometry {
  type: 'LineString' | 'MultiLineString';
  coordinates: RutaLineCoords | RutaMultiLineCoords;
}

export interface RutaProperties {
  Código_de: string;
  Nombre_de_: string;
  SENTIDO: string;
  TIPO: string;
  SUBTIPO: string;
  DEPARTAMEN: string;
  Kilómetro: string;
  CANTIDAD_D: number;
  Shape_Leng: number;
}

export interface RutaFeature {
  type: 'Feature';
  properties: RutaProperties;
  geometry: RutaGeometry;
}

export interface RutaDetailResponse {
  codigo: string;
  count: number;
  routes: RutaFeature[];
}

export interface NearbyResponse {
  location: {
    lat: number;
    lng: number;
  };
  radius_km: number;
  count: number;
  routes: RutaNearby[];
}

export interface SearchResponse {
  query: string;
  count: number;
  results: RutaMetadata[];
}

export interface ListResponse {
  filters: {
    departamento: string;
    tipo: string;
    subtipo: string;
  };
  count: number;
  results: RutaMetadata[];
}

export interface RutasMetadataResponse {
  departamentos: string[];
  tipos: string[];
  subtipos: string[];
}

// Tipos para el mapa
export type TipoRuta = 'POR AUTOBUS' | 'POR MICROBUSES';
export type SubtipoRuta = 'URBANO' | 'INTERURBANO' | 'INTERDEPARTAMENTAL';

export const RUTA_COLORS: Record<SubtipoRuta, string> = {
  'URBANO': '#3b82f6',           // Blue
  'INTERURBANO': '#22c55e',      // Green
  'INTERDEPARTAMENTAL': '#f59e0b' // Orange
};
