import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

/**
 * MedBuddy Official Vector Logo
 * Features stacked medical report documents with medical cross and supportive buddy silhouette.
 */
export const MedBuddyLogo: React.FC<LogoProps> = ({
  className = '',
  size = 32,
  showText = true,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* MedBuddy Vector Icon */}
      <svg
        style={{ width: size, height: size }}
        viewBox="10 -15 295 305"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 select-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mb-blueTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1677E8" />
            <stop offset="0.52" stopColor="#159BD7" />
            <stop offset="1" stopColor="#20B9A5" />
          </linearGradient>
          <linearGradient id="mb-paper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EAF5FF" />
          </linearGradient>
          <filter id="mb-shadow" x="-20%" y="-20%" width="150%" height="150%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
            <feOffset dx="0" dy="6" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#mb-shadow)">
          {/* Stacked background reports */}
          <rect
            x="32"
            y="24"
            width="190"
            height="235"
            rx="30"
            fill="#116FD8"
            opacity="0.9"
            transform="rotate(-8 32 24)"
          />
          <rect
            x="50"
            y="12"
            width="205"
            height="248"
            rx="30"
            fill="url(#mb-blueTeal)"
            transform="rotate(3 50 12)"
          />

          {/* Front report */}
          <path
            d="M72 25h135l61 61v139c0 16-13 29-29 29H72c-16 0-29-13-29-29V54c0-16 13-29 29-29z"
            fill="url(#mb-paper)"
          />
          <path d="M207 25v51c0 6 5 11 11 11h50" fill="#CFE5FA" />

          {/* Medical cross */}
          <rect x="82" y="75" width="65" height="20" rx="7" fill="#18B6A4" />
          <rect x="104.5" y="52.5" width="20" height="65" rx="7" fill="#18B6A4" />

          {/* Report lines */}
          <rect x="162" y="61" width="57" height="10" rx="5" fill="#9ABFE5" />
          <rect x="162" y="82" width="72" height="10" rx="5" fill="#9ABFE5" />
          <rect x="82" y="139" width="154" height="10" rx="5" fill="#A9C9E9" />
          <rect x="82" y="162" width="112" height="10" rx="5" fill="#A9C9E9" />

          {/* Supportive buddy silhouette */}
          <circle cx="236" cy="198" r="28" fill="#20B9A5" />
          <path
            d="M167 230c22-34 55-42 89-25 15 8 27 18 35 30-19 24-51 38-89 38-28 0-52-7-70-20 8-8 19-16 35-23z"
            fill="url(#mb-blueTeal)"
          />
        </g>
      </svg>

      {showText && (
        <span className="text-[17px] font-bold tracking-tight text-primary leading-none select-none">
          Med<span className="text-[#18AFA3] dark:text-[#20B9A5]">Buddy</span>
        </span>
      )}
    </div>
  );
};
