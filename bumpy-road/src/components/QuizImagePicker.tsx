import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Link2, Upload, X } from 'lucide-react';
import { STICKER_PRESETS } from '../utils/illustrations';
import { fileToDataUrl, removeWhiteBackground, resizeImageDataUrl } from '../utils/imageProcessor';

interface QuizImagePickerProps {
  label: string;
  value: string;
  onChange: (dataUrlOrUrl: string, suggestedLabel?: string) => void;
  tone?: 'amber' | 'emerald' | 'rose' | 'sky';
  requiredHint?: string;
  compact?: boolean;
}

export const QuizImagePicker: React.FC<QuizImagePickerProps> = ({
  label,
  value,
  onChange,
  tone = 'amber',
  requiredHint,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [urlInput, setUrlInput] = useState(
    value && /^(https?:\/\/|\/)/i.test(value) ? value : ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!value) {
      setUrlInput('');
    }
  }, [value]);

  const toneStyles = {
    amber: {
      box: 'bg-amber-50/60 border-amber-200',
      label: 'text-amber-900',
    },
    emerald: {
      box: 'bg-emerald-50/70 border-emerald-300',
      label: 'text-emerald-800',
    },
    rose: {
      box: 'bg-rose-50/60 border-rose-200',
      label: 'text-rose-800',
    },
    sky: {
      box: 'bg-sky-50/60 border-sky-200',
      label: 'text-sky-900',
    },
  }[tone];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const raw = await fileToDataUrl(file);
      const resized = await resizeImageDataUrl(raw);
      const cleaned = await removeWhiteBackground(resized);
      setUrlInput('');
      onChange(cleaned);
    } catch {
      setErrorMsg('Could not load that image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!/^(https?:\/\/|data:image\/|\/)/i.test(trimmed)) {
      setErrorMsg('URL must start with https://, http://, or /.');
      return;
    }
    setErrorMsg(null);
    onChange(trimmed);
  };

  return (
    <div className={`rounded-2xl border-2 ${toneStyles.box} ${compact ? 'p-2.5' : 'p-3.5'} flex flex-col gap-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-extrabold uppercase tracking-wide ${toneStyles.label}`}>
          {label}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setUrlInput('');
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-rose-600 text-[11px] font-bold border border-slate-200 cursor-pointer"
            title="Clear image"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`${
            compact ? 'w-14 h-14' : 'w-20 h-20'
          } rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center p-1.5 shrink-0 overflow-hidden`}
        >
          {isProcessing ? (
            <span className="text-[11px] font-bold text-sky-600">...</span>
          ) : value ? (
            <img
              src={value}
              alt={label}
              referrerPolicy="no-referrer"
              onError={() => setErrorMsg('Could not load image preview.')}
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-300" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setShowStickers((s) => !s)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Stickers</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative flex-1 min-w-0">
              <Link2 className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setUrlInput(val);
                  setErrorMsg(null);
                  if (/^(https?:\/\/|data:image\/|\/)/i.test(val.trim())) {
                    onChange(val.trim());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyUrl();
                  }
                }}
                placeholder="Paste URL..."
                className="w-full pl-6 pr-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyUrl}
              disabled={!urlInput.trim()}
              className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-45 text-slate-700 text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              URL
            </button>
          </div>
        </div>
      </div>

      {requiredHint && !value && (
        <div className="text-[11px] font-semibold text-slate-500">{requiredHint}</div>
      )}

      {errorMsg && (
        <div className="text-[11px] font-bold text-rose-600">{errorMsg}</div>
      )}

      {showStickers && (
        <div className="bg-white rounded-xl border border-amber-200 p-2 grid grid-cols-5 sm:grid-cols-7 gap-1.5">
          {STICKER_PRESETS.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setUrlInput('');
                setErrorMsg(null);
                onChange(st.dataUrl, st.suggestedWord);
                setShowStickers(false);
              }}
              className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-sky-50 border border-transparent hover:border-sky-200 cursor-pointer"
              title={st.label}
            >
              <img src={st.dataUrl} alt={st.label} className="w-8 h-8 object-contain" />
              <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">
                {st.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
