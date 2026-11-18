import React from 'react';
import { getLetterPalette } from '../utils/letterStyles';

interface CartoonLetterTileProps {
  char: string;
  sizeClass?: string;
  fontSizeClass?: string;
  className?: string;
}

export const CartoonLetterTile: React.FC<CartoonLetterTileProps> = ({
  char,
  sizeClass = 'w-12 h-12',
  fontSizeClass = 'text-2xl',
  className = '',
}) => {
  const palette = getLetterPalette(char);
  const upper = (char ?? '').trim().toUpperCase().slice(0, 1) || '?';

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[22%] border-[2.5px] border-[#132238] shadow-[0_3px_0_rgba(19,34,56,0.28)] select-none overflow-hidden shrink-0 ${sizeClass} ${className}`}
      style={{ backgroundColor: palette.bgBottom }}
    >
      {/* Inner 3D glossy face */}
      <div
        className="absolute inset-x-[1.5px] top-[1.5px] bottom-[4px] rounded-[18%]"
        style={{
          background: `linear-gradient(180deg, ${palette.bgTop} 0%, ${palette.bg} 34%, ${palette.bg} 100%)`,
        }}
      />

      {/* Top-left glossy highlight */}
      <span
        aria-hidden="true"
        className="absolute top-[11%] left-[12%] w-[18%] h-[10%] rounded-full bg-white/60 -rotate-25 pointer-events-none"
      />
      <span
        aria-hidden="true"
        className="absolute top-[9%] left-[33%] w-[6%] h-[6%] rounded-full bg-white/75 pointer-events-none"
      />

      {/* Sparkle stars */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="absolute top-[10%] right-[10%] w-[18%] h-[18%] text-white/90 pointer-events-none"
        fill="currentColor"
      >
        <path d="M12 0 Q12 12 24 12 Q12 12 12 24 Q12 12 0 12 Q12 12 12 0 Z" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="absolute bottom-[14%] left-[11%] w-[13%] h-[13%] text-white/85 pointer-events-none"
        fill="currentColor"
      >
        <path d="M12 0 Q12 12 24 12 Q12 12 12 24 Q12 12 0 12 Q12 12 12 0 Z" />
      </svg>

      {/* Crisp puffy outlined letter */}
      <svg
        viewBox="0 0 40 40"
        className={`relative z-10 w-[78%] h-[78%] overflow-visible ${fontSizeClass}`}
      >
        <text
          x="20"
          y="22.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#132238"
          fontFamily="Fredoka, Nunito, sans-serif"
          fontWeight="700"
          fontSize="28"
        >
          {upper}
        </text>
        <text
          x="20"
          y="20.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill={palette.letterFill}
          stroke="#132238"
          strokeWidth="4.2"
          strokeLinejoin="round"
          paintOrder="stroke fill"
          fontFamily="Fredoka, Nunito, sans-serif"
          fontWeight="700"
          fontSize="28"
        >
          {upper}
        </text>
      </svg>
    </div>
  );
};
