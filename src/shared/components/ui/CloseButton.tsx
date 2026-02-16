import React from 'react';
import { BiX } from 'react-icons/bi';

interface CloseButtonProps {
  onClick: () => void;
  title?: string;
  className?: string;
}

export const CloseButton: React.FC<CloseButtonProps> = ({ onClick, title = 'Cerrar', className }) => {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-lg border border-red-500/40 text-red-400 hover:text-red-300 hover:border-red-500/60 hover:bg-red-500/10 transition-colors ${className || ''}`}
      title={title}
      aria-label={title}
    >
      <BiX className="w-5 h-5 mx-auto" />
    </button>
  );
};
