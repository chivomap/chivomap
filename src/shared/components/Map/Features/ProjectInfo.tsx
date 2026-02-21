import React, { useState } from 'react';
import { BiInfoCircle, BiX } from 'react-icons/bi';

export const ProjectInfo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const technologies = [
    'React 18 + TypeScript',
    'MapLibre GL JS',
    'Tailwind CSS',
    'Zustand',
    'Turf.js',
    'Vite'
  ];

  return (
    <>
      {/* Info Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 w-6 h-6 bg-primary/90 hover:bg-primary rounded-full items-center justify-center transition-colors shadow-lg"
        title="Información del proyecto"
      >
        <BiInfoCircle className="text-secondary text-sm" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-primary rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary/20">
              <h2 className="text-lg font-bold text-secondary">ChivoMap</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-secondary/60 hover:text-secondary transition-colors"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Developer */}
              <div>
                <h3 className="font-semibold text-secondary mb-2">Desarrollado por</h3>
                <a 
                  href="https://eliseo-arevalo.github.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
                >
                  Eliseo Arévalo
                </a>
              </div>

              {/* Organization */}
              <div>
                <h3 className="font-semibold text-secondary mb-2">Colaborar en el proyecto</h3>
                <a 
                  href="https://github.com/chivomap" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors underline flex items-center gap-1"
                >
                  <span>github.com/chivomap</span>
                  <span className="text-xs">↗</span>
                </a>
              </div>

              {/* Technologies */}
              <div>
                <h3 className="font-semibold text-secondary mb-2">Tecnologías</h3>
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-1 bg-secondary/20 text-secondary text-xs rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-secondary mb-2">Descripción</h3>
                <p className="text-secondary/80 text-sm">
                  Aplicación web interactiva para visualización y análisis de datos geográficos de El Salvador. 
                  Permite búsqueda de distritos, municipios y departamentos, así como la creación y exportación de polígonos.
                </p>
              </div>

              {/* Version */}
              <div>
                <h3 className="font-semibold text-secondary mb-2">Versión</h3>
                <p className="text-secondary/80 text-sm">v2.0.0 - MapLibre Edition</p>
              </div>

              {/* License */}
              <div>
                <h3 className="font-semibold text-secondary mb-2">Licencia</h3>
                <p className="text-secondary/80 text-sm mb-2">
                  Este proyecto está licenciado bajo <strong>GNU AGPL v3</strong>
                </p>
                <p className="text-secondary/60 text-xs">
                  Software libre y de código abierto. Cualquier uso o modificación debe mantener esta licencia y compartir el código fuente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
