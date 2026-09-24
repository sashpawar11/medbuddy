import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

/**
 * Bespoke Health SVG Logo for MedBuddy
 * Features a modern stylized medical cross integrated with a clinical vitality pulse wave
 * and soft vault geometry.
 */
export const MedBuddyLogo: React.FC<LogoProps> = ({
  className = '',
  size = 32,
  showText = true,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl shadow-xs"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
        }}
      >
        {/* Crisp vector health icon: rounded medical cross + vitality pulse */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[68%] h-[68%] text-white"
        >
          {/* Subtle shield / vault protective boundary */}
          <path
            d="M16 2.5C21.5 2.5 26.5 4.8 27.5 7.5V16C27.5 22.8 21.8 27.8 16 29.5C10.2 27.8 4.5 22.8 4.5 16V7.5C5.5 4.8 10.5 2.5 16 2.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.4"
          />
          {/* Medical cross vertical bar */}
          <rect
            x="13.25"
            y="7"
            width="5.5"
            height="18"
            rx="2.75"
            fill="currentColor"
            fillOpacity="0.3"
          />
          {/* Medical cross horizontal bar */}
          <rect
            x="7"
            y="13.25"
            width="18"
            height="5.5"
            rx="2.75"
            fill="currentColor"
            fillOpacity="0.3"
          />
          {/* Clinical Vitality Pulse Line */}
          <path
            d="M7 16H11L13.5 11L18 21.5L20.5 14L22.5 16H25"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0 leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold tracking-tight text-primary">
              Med<span className="text-teal-600 dark:text-teal-400">Buddy</span>
            </span>
          </div>
          <span className="text-[11px] font-medium text-tertiary tracking-normal mt-0.5">
            Local Health Vault
          </span>
        </div>
      )}
    </div>
  );
};
