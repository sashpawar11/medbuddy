import React from 'react';

interface KeycapProps {
  children: React.ReactNode;
  className?: string;
}

export const Keycap: React.FC<KeycapProps> = ({ children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm bg-surface-recessed border border-border text-[11px] font-mono text-tertiary leading-none select-none ${className}`}
    >
      {children}
    </span>
  );
};
