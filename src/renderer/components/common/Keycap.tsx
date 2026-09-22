import React from 'react';

interface KeycapProps {
  children: React.ReactNode;
  className?: string;
}

export const Keycap: React.FC<KeycapProps> = ({ children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center justify-center keycap-glyph px-1.5 py-0.5 rounded-xs text-[11px] font-mono text-mute font-medium leading-none select-none ${className}`}
    >
      {children}
    </span>
  );
};
