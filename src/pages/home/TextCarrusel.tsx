import React, { useState, useEffect } from 'react';
import { ImSpinner2 } from 'react-icons/im'; // Asegúrate de tener esta librería instalada
import { getGeoData } from '../../shared/services/GetGeoData'; // Ajustar la ruta según tu estructura
import { getQueryData } from '../../shared/services/GetQueryData';
import { useMapStore } from '../../shared/store/mapStore'; // Ajustar la ruta según tu estructura

export const TextCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { updateGeojson } = useMapStore();

  useEffect(() => {
    const fetchData = async () => {
      const data = await getGeoData();
      // Mantener el mismo orden solo mover "SAN SALVADOR" al principio
      const sorted = [...data.data.departamentos];
      sorted.sort((a, b) => {
        if (a === 'SAN SALVADOR') return -1;
        if (b === 'SAN SALVADOR') return 1;
        return 0;
      });

      setDepartamentos(sorted);
      if (data.data.departamentos.length > 0) {
        handleFetchData(sorted[0]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (departamentos.length > 0) {
      handleFetchData(departamentos[activeIndex]);
    }
  }, [activeIndex]);

  const handleFetchData = async (depto: string) => {
    setLoading(true);
    const data = await getQueryData(depto, 'D');
    updateGeojson(data);
    setLoading(false);
  };

  const handlePrev = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + departamentos.length) % departamentos.length);
  };

  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % departamentos.length);
  };

  return (
    <div id="controls-carousel" className="relative w-full" data-carousel="static">
      {/* Carousel wrapper */}
      <div className="relative text-2xl h-8 md:h-6 overflow-hidden rounded-lg flex items-center justify-center">
        {departamentos.map((item, index) => (
          <div
            key={item}
            className={`absolute transition duration-700 ease-in-out transform ${activeIndex === index ? 'opacity-100' : 'opacity-0'} ${activeIndex === index ? 'translate-x-0' : 'translate-x-full'}`}
            data-carousel-item={activeIndex === index ? "active" : ""}
          >
            <div className="flex items-center justify-center w-full h-full text-primary font-bold text-center px-4 cursor-pointer">
              {item}
              {loading && activeIndex === index && (
                <ImSpinner2 className="ml-2 animate-spin" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Slider controls */}
      <button
        type="button"
        className="absolute top-0 left-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
        onClick={handlePrev}
        data-carousel-prev
      >
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary group-hover:bg-primary/60 group-focus:outline-none">
          <svg className="w-4 h-4 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 1L1 5l4 4" />
          </svg>
          <span className="sr-only">Previous</span>
        </span>
      </button>
      <button
        type="button"
        className="absolute top-0 right-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
        onClick={handleNext}
        data-carousel-next
      >
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary group-hover:bg-primary/60 group-focus:outline-none">
          <svg className="w-4 h-4 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4" />
          </svg>
          <span className="sr-only">Next</span>
        </span>
      </button>
    </div>
  );
};
