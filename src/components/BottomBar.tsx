import React from 'react';
import { Trash2, Sparkles, RotateCcw } from 'lucide-react';

interface BottomBarProps {
  currentGuess: string;
  wordLength: number;
  isValidating: boolean;
  disabled?: boolean;
  onClear: () => void;
  onSubmit: () => void;
}

export default function BottomBar({
  currentGuess,
  wordLength,
  isValidating,
  disabled = false,
  onClear,
  onSubmit,
}: BottomBarProps) {
  const isClearDisabled = currentGuess.length === 0 || isValidating || disabled;
  const isSubmitDisabled = currentGuess.length !== wordLength || isValidating || disabled;

  return (
    <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto px-1 sm:px-2 my-0 flex items-center gap-2 relative z-10 shrink-0" id="bottom-control-bar-container">
      {/* CLEAR ROW BUTTON (TEMİZLE) */}
      <button
        onClick={onClear}
        disabled={isClearDisabled}
        className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 border ${
          !isClearDisabled
            ? 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white border-rose-400/50 hover:shadow-rose-500/25 active:scale-[0.98] cursor-pointer'
            : 'bg-[#242D3D]/65 text-slate-500 border-[#3E485A]/40 shadow-none cursor-not-allowed'
        }`}
        id="clear-row-button"
      >
        <Trash2 size={14} />
        <span>TEMİZLE</span>
      </button>

      {/* SUBMIT BUTTON (DENE) */}
      <button
        onClick={onSubmit}
        disabled={isSubmitDisabled}
        className={`flex-[2] py-2.5 sm:py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-md transition-all duration-200 flex items-center justify-center gap-2 border ${
          !isSubmitDisabled
            ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white border-emerald-400/50 hover:shadow-emerald-500/25 active:scale-[0.98] cursor-pointer'
            : 'bg-[#242D3D]/65 text-slate-500 border-[#3E485A]/40 shadow-none cursor-not-allowed'
        }`}
        id="submit-guess-button"
      >
        {isValidating ? (
          <>
            <RotateCcw className="animate-spin" size={14} />
            DOĞRULANIYOR...
          </>
        ) : (
          <>
            <Sparkles size={14} className={currentGuess.length === wordLength ? "animate-bounce text-emerald-300" : ""} />
            DENE
          </>
        )}
      </button>
    </div>
  );
}
