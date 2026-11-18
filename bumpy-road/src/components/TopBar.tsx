import React, { useEffect, useState } from 'react';
import {
  Home,
  Settings2,
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  Car,
  Type,
  HelpCircle,
} from 'lucide-react';
import { AppScreen, AudioSettings, ClassRoom, GameMode } from '../types/game';

const ORB_ICONS_SPRITE_SRC = '/assets/aistudio/Game_cover_art_fbe69390_809f3132.jpg';

type OrbKey = 'home' | 'settings' | 'music' | 'sfx' | 'reset';

interface OrbCropRegion {
  key: OrbKey;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const ORB_REGIONS: OrbCropRegion[] = [
  { key: 'home', x0: 0.02, y0: 0.03, x1: 0.335, y1: 0.485 },
  { key: 'settings', x0: 0.338, y0: 0.03, x1: 0.662, y1: 0.485 },
  { key: 'music', x0: 0.665, y0: 0.03, x1: 0.98, y1: 0.485 },
  { key: 'sfx', x0: 0.16, y0: 0.5, x1: 0.495, y1: 0.97 },
  { key: 'reset', x0: 0.505, y0: 0.5, x1: 0.84, y1: 0.97 },
];

function extractOrbDataUrls(img: HTMLImageElement): Partial<Record<OrbKey, string>> {
  const result: Partial<Record<OrbKey, string>> = {};
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return result;

  for (const region of ORB_REGIONS) {
    const sx0 = Math.floor(iw * region.x0);
    const sy0 = Math.floor(ih * region.y0);
    const sw = Math.max(1, Math.floor(iw * region.x1) - sx0);
    const sh = Math.max(1, Math.floor(ih * region.y1) - sy0);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.drawImage(img, sx0, sy0, sw, sh, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const data = imageData.data;

    // Remove grey/white checkerboard around each glossy orb using edge-seeded flood fill
    const isCheckerboard = (idx: number): boolean => {
      const a = data[idx + 3];
      if (a < 15) return true;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      return minC >= 158 && maxC - minC <= 22;
    };

    const visited = new Uint8Array(sw * sh);
    const queue = new Int32Array(sw * sh);
    let head = 0;
    let tail = 0;

    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= sw || y >= sh) return;
      const p = y * sw + x;
      if (visited[p]) return;
      if (isCheckerboard(p * 4)) {
        visited[p] = 1;
        queue[tail++] = p;
      }
    };

    for (let x = 0; x < sw; x++) {
      push(x, 0);
      push(x, sh - 1);
    }
    for (let y = 0; y < sh; y++) {
      push(0, y);
      push(sw - 1, y);
    }

    while (head < tail) {
      const p = queue[head++];
      const x = p % sw;
      const y = (p - x) / sw;
      data[p * 4 + 3] = 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    let minX = sw;
    let minY = sh;
    let maxX = 0;
    let maxY = 0;

    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const p = y * sw + x;
        if (visited[p] || data[p * 4 + 3] === 0) continue;
        const borderTouch =
          visited[p - 1] || visited[p + 1] || visited[p - sw] || visited[p + sw];
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
      const pad = 2;
      const cx = Math.max(0, minX - pad);
      const cy = Math.max(0, minY - pad);
      const cw = Math.min(sw - cx, maxX - minX + pad * 2);
      const ch = Math.min(sh - cy, maxY - minY + pad * 2);

      const outSize = 140;
      const cropped = document.createElement('canvas');
      cropped.width = outSize;
      cropped.height = outSize;
      const cCtx = cropped.getContext('2d');
      if (cCtx) {
        cCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, outSize, outSize);
        result[region.key] = cropped.toDataURL('image/png');
        continue;
      }
    }
    result[region.key] = canvas.toDataURL('image/png');
  }

  return result;
}

interface TopBarProps {
  screen: AppScreen;
  classes: ClassRoom[];
  activeClassId: string;
  gameMode: GameMode;
  audioSettings: AudioSettings;
  canResetPath: boolean;
  onNavigate: (screen: AppScreen) => void;
  onSelectClass: (classId: string) => void;
  onSelectGameMode: (mode: GameMode) => void;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
  onResetPath: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  screen,
  classes,
  activeClassId,
  gameMode,
  audioSettings,
  canResetPath,
  onNavigate,
  onSelectClass,
  onSelectGameMode,
  onToggleSfx,
  onToggleMusic,
  onResetPath,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orbIcons, setOrbIcons] = useState<Partial<Record<OrbKey, string>>>({});

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        setOrbIcons(extractOrbDataUrls(img));
      } catch {
        // Fallback to vector icons if canvas extraction fails
      }
    };
    img.onerror = () => {
      if (!cancelled) setOrbIcons({});
    };
    img.src = ORB_ICONS_SPRITE_SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (typeof document.documentElement?.requestFullscreen === 'function') {
          await document.documentElement.requestFullscreen();
        }
      } else if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be restricted by iframe sandbox permissions
    }
  };

  // On Home screen: transparent floating header showing ONLY the zoom/fullscreen button
  if (screen === 'home') {
    return (
      <header className="fixed top-0 inset-x-0 z-30 w-full bg-transparent pointer-events-none">
        <div className="w-full px-3 sm:px-5 h-16 flex items-center justify-end">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="pointer-events-auto inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-b from-sky-300 via-sky-500 to-blue-700 text-white border-[2.5px] border-sky-900 shadow-[0_4px_0_rgba(12,74,110,0.45),0_6px_14px_rgba(0,0,0,0.22)] hover:scale-105 active:scale-95 active:translate-y-0.5 transition-transform cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 drop-shadow-xs" />
            ) : (
              <Maximize2 className="w-5 h-5 drop-shadow-xs" />
            )}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-transparent">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left Zone: Glossy Orb Buttons (Home / Settings / Play / Class Dropdown) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            title="Home"
            aria-label="Home"
            className="relative inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 active:translate-y-0.5 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]"
          >
            {orbIcons.home ? (
              <img
                src={orbIcons.home}
                alt="Home"
                onError={() => setOrbIcons((prev) => ({ ...prev, home: undefined }))}
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <span className="w-full h-full rounded-full bg-emerald-500 text-white border-2 border-emerald-900 flex items-center justify-center">
                <Home className="w-5 h-5" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('setup')}
            title="Class & Word Settings"
            aria-label="Class & Word Settings"
            className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 active:translate-y-0.5 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] ${
              screen === 'setup' ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-transparent' : ''
            }`}
          >
            {orbIcons.settings ? (
              <img
                src={orbIcons.settings}
                alt="Class & Word Settings"
                onError={() => setOrbIcons((prev) => ({ ...prev, settings: undefined }))}
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <span className="w-full h-full rounded-full bg-sky-600 text-white border-2 border-sky-950 flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </span>
            )}
          </button>

          {screen !== 'play' && (
            <button
              type="button"
              onClick={() => onNavigate('play')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-display font-bold text-sm bg-gradient-to-b from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700 border-2 border-emerald-900 shadow-[0_3px_0_#064e3b] transition-transform hover:scale-105 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              title="Play Game"
            >
              <Car className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Play</span>
            </button>
          )}

          {/* Quick Class Dropdown */}
          <div className="relative min-w-0 max-w-[165px] sm:max-w-[230px]">
            <select
              aria-label="Select Class or Unit"
              value={activeClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="w-full appearance-none bg-white/85 backdrop-blur-xs hover:bg-white text-slate-800 font-bold text-xs sm:text-sm pl-3.5 pr-8 py-2 rounded-full border-2 border-sky-300 shadow-xs focus:outline-none focus:border-sky-500 transition-colors truncate cursor-pointer"
            >
              {classes.length === 0 ? (
                <option value="">No Classes</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({(cls.words ?? []).length})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-600 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Game Mode Switcher (Spell Words vs Quiz Drive) */}
          <div
            role="group"
            aria-label="Game Mode"
            className="inline-flex items-center bg-white/85 backdrop-blur-xs border-2 border-sky-300 rounded-full p-0.5 shadow-xs shrink-0"
          >
            <button
              type="button"
              onClick={() => onSelectGameMode('spell')}
              title="Spelling Mode: Connect letters in order"
              className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
                gameMode === 'spell'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Spell</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectGameMode('quiz')}
              title="Quiz Mode: Drive to the right answer"
              className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
                gameMode === 'quiz'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Quiz</span>
            </button>
          </div>
        </div>

        {/* Right Zone: Glossy Orb SFX / Music / Reset Path / Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Sound & Music Glossy Orbs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSfx}
              aria-pressed={audioSettings.sfxEnabled}
              title={audioSettings.sfxEnabled ? 'Sound Effects: On' : 'Sound Effects: Off'}
              aria-label={audioSettings.sfxEnabled ? 'Sound Effects: On' : 'Sound Effects: Off'}
              className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 active:translate-y-0.5 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] ${
                audioSettings.sfxEnabled ? '' : 'opacity-45 grayscale-[35%]'
              }`}
            >
              {orbIcons.sfx ? (
                <img
                  src={orbIcons.sfx}
                  alt="SFX"
                  onError={() => setOrbIcons((prev) => ({ ...prev, sfx: undefined }))}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <span className="w-full h-full rounded-full bg-amber-500 text-white border-2 border-amber-900 flex items-center justify-center">
                  {audioSettings.sfxEnabled ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                </span>
              )}
              {!audioSettings.sfxEnabled && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span className="w-9 h-1 bg-rose-600 rounded-full rotate-45 border border-white shadow-xs" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleMusic}
              aria-pressed={audioSettings.musicEnabled}
              title={audioSettings.musicEnabled ? 'Background Music: On' : 'Background Music: Off'}
              aria-label={audioSettings.musicEnabled ? 'Background Music: On' : 'Background Music: Off'}
              className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 active:translate-y-0.5 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] ${
                audioSettings.musicEnabled ? '' : 'opacity-45 grayscale-[35%]'
              }`}
            >
              {orbIcons.music ? (
                <img
                  src={orbIcons.music}
                  alt="Music"
                  onError={() => setOrbIcons((prev) => ({ ...prev, music: undefined }))}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <span className="w-full h-full rounded-full bg-purple-600 text-white border-2 border-purple-950 flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </span>
              )}
              {!audioSettings.musicEnabled && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span className="w-9 h-1 bg-rose-600 rounded-full rotate-45 border border-white shadow-xs" />
                </span>
              )}
            </button>
          </div>

          {/* Reset Path Glossy Orb */}
          <button
            type="button"
            onClick={onResetPath}
            disabled={!canResetPath}
            title="Reset Path"
            aria-label="Reset Path"
            className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 transition-all drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] ${
              canResetPath
                ? 'cursor-pointer hover:scale-105 active:scale-95 active:translate-y-0.5'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            {orbIcons.reset ? (
              <img
                src={orbIcons.reset}
                alt="Reset Path"
                onError={() => setOrbIcons((prev) => ({ ...prev, reset: undefined }))}
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <span className="w-full h-full rounded-full bg-rose-600 text-white border-2 border-rose-950 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </span>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-b from-sky-300 via-sky-500 to-blue-700 text-white border-[2.5px] border-sky-900 shadow-[0_3px_0_rgba(12,74,110,0.45)] hover:scale-105 active:scale-95 active:translate-y-0.5 transition-transform shrink-0 cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 drop-shadow-xs" />
            ) : (
              <Maximize2 className="w-5 h-5 drop-shadow-xs" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
