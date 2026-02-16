import React, { lazy, Suspense } from 'react';
import { Helmet } from "react-helmet";
import { LayerModal } from '../index';
import { BottomSheet } from '../Map/Features/BottomSheet';
import { NearbyRoutesCTA } from '../Map/Features/NearbyRoutesCTA';
import { useSearchStore } from '../../store/searchStore';

const Map = lazy(() => import('../Map').then(m => ({ default: m.Map })));

const MapLoader = () => (
  <div className="fixed inset-0 bg-primary flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-secondary text-lg">Cargando mapa...</p>
    </div>
  </div>
);

export const MapLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showResults, inputValue, setShowResults } = useSearchStore();

  return (
    <>
      {/* Mapa con lazy loading */}
      <Suspense fallback={<MapLoader />}>
        <Map />
      </Suspense>
      <Helmet>
        {/* Título y descripción */}
        <title>Chivo Map | El Salvador</title>
        <meta name="description" content="Nueva distribución geopolítica del país, incluyendo todos sus distritos, municipios y departamentos. Ideal para educadores, estudiantes y cualquiera interesado en la geografía salvadoreña." />
        <meta name="keywords" content="El Salvador, Mapa Interactivo, Nuevos Municipios, Geografía, Distritos, Municipios, Departamentos" />
        <meta name="author" content="Eliseo Arévalo" />
        <link rel="icon" href="/favicon.ico" />

        {/* Robots */}
        <meta name="robots" content="index, follow" />

        {/* Open Graph para compartir en Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://chivomap.vercel.app" />
        <meta property="og:title" content="Chivo Map | Mapa Interactivo de El Salvador" />
        <meta property="og:description" content="Explora la distribución geopolítica de El Salvador con nuestro mapa interactivo. Ideal para educación y referencia." />
        <meta property="og:image" content="https://chivomap.vercel.app/chivomap.png" />
        <meta property="og:image:alt" content="Chivo Map | Mapa Interactivo de El Salvador" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="Eliseo Arévalo" />
        <meta name="twitter:site" content="@earevalo" />
        <meta name="twitter:title" content="Chivo Map | Mapa Interactivo de El Salvador" />
        <meta name="twitter:description" content="Explora la distribución geopolítica de El Salvador con nuestro mapa interactivo. Ideal para educación y referencia." />
        <meta name="twitter:image" content="https://chivomap.vercel.app/chivomap.png" />
        <meta name="twitter:image:alt" content="Chivo Map | Mapa Interactivo de El Salvador" />
      </Helmet>


      {/* Search backdrop */}
      {showResults && inputValue && (
        <div
          className="fixed inset-0 bg-black/40"
          style={{ zIndex: 59 }}
          onClick={() => setShowResults(false)}
        />
      )}

      {/* Search */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl" style={{ zIndex: 60 }}>
        {children}
      </div>

      {/* Drawer - al mismo nivel que backdrop */}
      <BottomSheet />

      {/* CTA for nearby routes */}
      <NearbyRoutesCTA />

      {/* Espacio vacío reservado para otro contenido */}
      <div className="w-[100px] h-[100px] fixed bottom-[100px] right-2 opacity-80 md:right-4 md:bottom-4 md:w-[120px] md:h-[120px]" style={{ zIndex: 10 }}>
        {/* Contenido adicional opcional */}
      </div>

      {/* Navegación - Oculta temporalmente */}
      {/* <div className="fixed max-h-[80px] gap-2 bottom-2 w-full flex justify-center z-50 out-bottom">
        <Nav />
      </div> */}

      {/* Modal */}
      <LayerModal />
    </>
  );
};
