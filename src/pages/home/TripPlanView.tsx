import React from 'react';
import { BiX, BiWalk } from 'react-icons/bi';
import { FaBus } from 'react-icons/fa';
import { MdArrowBack } from 'react-icons/md';
import { useTripPlannerStore } from '../../shared/store/tripPlannerStore';

export const TripPlanView: React.FC<{ onBack: () => void; onClose: () => void }> = ({ onBack, onClose }) => {
  const { tripPlan } = useTripPlannerStore();

  if (!tripPlan || tripPlan.options.length === 0) {
    return (
      <div className="w-full relative flex flex-col gap-3 pointer-events-auto">
        <div className="relative group">
          <div className="absolute inset-0 bg-secondary/20 rounded-xl blur" />
          <div className="relative bg-primary backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={onBack} className="p-1 hover:bg-white/10 rounded transition-colors">
                <MdArrowBack className="w-6 h-6 text-white/60 hover:text-white" />
              </button>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
                <BiX className="w-6 h-6 text-white/60 hover:text-white" />
              </button>
            </div>
            <p className="text-center text-white/60">No se encontraron rutas</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-500/20 text-green-300 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      low: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return colors[confidence as keyof typeof colors] || colors.low;
  };

  return (
    <div className="w-full relative flex flex-col gap-3 pointer-events-auto max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="relative group sticky top-0 z-10">
        <div className="absolute inset-0 bg-secondary/20 rounded-xl blur" />
        <div className="relative bg-primary backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl p-4">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="p-1 hover:bg-white/10 rounded transition-colors">
              <MdArrowBack className="w-6 h-6 text-white/60 hover:text-white" />
            </button>
            <h2 className="text-lg font-semibold text-white">Opciones de viaje</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
              <BiX className="w-6 h-6 text-white/60 hover:text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {tripPlan.options.map((option, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute inset-0 bg-secondary/20 rounded-xl blur" />
            <div className="relative bg-primary backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">
                    {formatDuration(option.totalDuration)}
                  </span>
                  <span className="text-sm text-white/60">
                    ({formatDistance(option.totalDistance)})
                  </span>
                </div>
                <span className={`px-2 py-1 rounded border text-xs font-medium ${getConfidenceBadge(option.confidence)}`}>
                  {option.confidence === 'high' ? 'Alta' : option.confidence === 'medium' ? 'Media' : 'Baja'}
                </span>
              </div>

              {option.transfers > 0 && (
                <div className="text-sm text-white/60 mb-3">
                  {option.transfers} transbordo{option.transfers > 1 ? 's' : ''}
                </div>
              )}

              <div className="space-y-3">
                {option.legs.map((leg, legIdx) => (
                  <div key={legIdx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {leg.type === 'walk' ? (
                        <BiWalk className="w-5 h-5 text-white/60" />
                      ) : (
                        <FaBus className="w-5 h-5 text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {leg.type === 'bus' && leg.routeCode && (
                          <span className="px-2 py-0.5 bg-secondary text-white text-xs font-bold rounded">
                            {leg.routeCode}
                          </span>
                        )}
                        <span className="text-sm font-medium text-white">
                          {leg.type === 'walk' ? 'Caminar' : leg.routeName || 'Bus'}
                        </span>
                      </div>
                      <div className="text-xs text-white/60">
                        {formatDistance(leg.distance)} • {formatDuration(leg.duration)}
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {leg.from.name} → {leg.to.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
