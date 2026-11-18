import React, { useEffect, useState } from 'react';
import { HelpCircle, Settings2, Type } from 'lucide-react';
import { ClassRoom, GameMode } from '../types/game';

const COVER_BG_SRC = '/assets/aistudio/Game_cover_art_f8404c6c_3a0be1d3.jpg';
const PLAY_BTN_SRC = '/assets/aistudio/Game_cover_art_fd9e9d30_cd6f86bf.jpg';

interface HomeScreenProps {
  classes: ClassRoom[];
  activeClass: ClassRoom | undefined;
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  onSelectClassAndPlay: (classId: string) => void;
  onStartActiveGame: () => void;
  onOpenSetup: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  activeClass,
  gameMode,
  onSelectGameMode,
  onStartActiveGame,
  onOpenSetup,
}) => {
  const spellCount = activeClass?.words?.length ?? 0;
  const quizCount =
    (activeClass?.quizzes?.length ?? 0) > 0
      ? activeClass?.quizzes?.length ?? 0
      : spellCount >= 2
        ? spellCount
        : 0;
  const canPlayActive = gameMode === 'spell' ? spellCount > 0 : quizCount > 0;
  const [playBtnDataUrl, setPlayBtnDataUrl] = useState<string | null>(null);

  // Strip the checkerboard backdrop from the PLAY! button artwork via edge flood-fill
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const maxW = 640;
        const scale = Math.min(1, maxW / Math.max(1, img.width));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const isCheckerboard = (idx: number): boolean => {
          const a = data[idx + 3];
          if (a < 15) return true;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          // Neutral grey/white checkerboard squares outside the dark brown button outline
          return minC >= 158 && maxC - minC <= 22;
        };

        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const push = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= w || y >= h) return;
          const p = y * w + x;
          if (visited[p]) return;
          if (isCheckerboard(p * 4)) {
            visited[p] = 1;
            queue[tail++] = p;
          }
        };

        for (let x = 0; x < w; x++) {
          push(x, 0);
          push(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          push(0, y);
          push(w - 1, y);
        }

        while (head < tail) {
          const p = queue[head++];
          const x = p % w;
          const y = (p - x) / w;
          data[p * 4 + 3] = 0;
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }

        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (visited[p] || data[p * 4 + 3] === 0) continue;
            const borderTouch =
              visited[p - 1] || visited[p + 1] || visited[p - w] || visited[p + w];
            if (borderTouch) {
              const idx = p * 4;
              const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              if (avg > 175) {
                data[idx + 3] = Math.round(data[idx + 3] * 0.35);
              }
            }
            if (data[p * 4 + 3] > 20) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        if (maxX > minX && maxY > minY) {
          const pad = 4;
          const sx = Math.max(0, minX - pad);
          const sy = Math.max(0, minY - pad);
          const sw = Math.min(w - sx, maxX - minX + pad * 2);
          const sh = Math.min(h - sy, maxY - minY + pad * 2);

          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const cCtx = cropped.getContext('2d');
          if (cCtx) {
            cCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            setPlayBtnDataUrl(cropped.toDataURL('image/png'));
            return;
          }
        }
        setPlayBtnDataUrl(canvas.toDataURL('image/png'));
      } catch {
        setPlayBtnDataUrl(null);
      }
    };
    img.onerror = () => {
      if (!cancelled) setPlayBtnDataUrl(null);
    };
    img.src = PLAY_BTN_SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative flex-1 w-full min-h-[100dvh] overflow-hidden bg-sky-200 select-none">
      {/* Full-screen Game Cover Art */}
      <img
        src={COVER_BG_SRC}
        alt="Bumpy Road! Draw & Spell Game Cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />

      {/* Right-corner Mode Selector + Play Button Overlay */}
      <div className="relative z-10 w-full h-full min-h-[100dvh] flex flex-col items-end justify-end p-5 sm:p-8 md:p-10">
        <div className="flex flex-col items-end gap-3">
          {/* Game Mode Picker */}
          <div
            role="group"
            aria-label="Choose Game Mode"
            className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-white/92 backdrop-blur-xs border-2 border-amber-300 shadow-md"
          >
            <button
              type="button"
              onClick={() => onSelectGameMode('spell')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-display font-bold text-sm sm:text-base transition-all cursor-pointer ${
                gameMode === 'spell'
                  ? 'bg-emerald-500 text-white shadow-sm scale-[1.03]'
                  : 'text-slate-700 hover:bg-amber-50'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Spell Words</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectGameMode('quiz')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-display font-bold text-sm sm:text-base transition-all cursor-pointer ${
                gameMode === 'quiz'
                  ? 'bg-amber-500 text-white shadow-sm scale-[1.03]'
                  : 'text-slate-700 hover:bg-amber-50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Quiz Drive</span>
            </button>
          </div>

          {canPlayActive ? (
            <button
              type="button"
              onClick={onStartActiveGame}
              aria-label={`Play ${activeClass?.name ?? 'Game'}`}
              className="group relative transition-transform duration-150 hover:scale-105 active:scale-95 active:translate-y-1 cursor-pointer focus:outline-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.32)]"
            >
              {playBtnDataUrl ? (
                <img
                  src={playBtnDataUrl}
                  alt="PLAY!"
                  onError={() => setPlayBtnDataUrl(null)}
                  className="w-48 sm:w-60 md:w-72 h-auto object-contain pointer-events-none"
                />
              ) : (
                <span className="inline-flex items-center justify-center px-12 py-4 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-4 border-amber-900 font-display font-extrabold text-3xl sm:text-4xl text-amber-950 tracking-wider shadow-lg">
                  PLAY!
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSetup}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-amber-950 font-display font-bold text-xl border-4 border-amber-900 shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Settings2 className="w-6 h-6" />
              <span>{gameMode === 'quiz' ? 'Add Questions to Play' : 'Add Words to Play'}</span>
            </button>
          )}

          {activeClass && (
            <div className="px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border-2 border-amber-300 shadow-sm text-xs sm:text-sm font-bold text-slate-800">
              {activeClass.name} ·{' '}
              {gameMode === 'quiz'
                ? `${quizCount} ${quizCount === 1 ? 'question' : 'questions'}`
                : `${spellCount} ${spellCount === 1 ? 'word' : 'words'}`}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
