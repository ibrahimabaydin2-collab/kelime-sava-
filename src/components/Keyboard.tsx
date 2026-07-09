import { motion } from 'motion/react';
import { Delete } from 'lucide-react';

interface KeyboardProps {
  onChar: (value: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  letterStatuses: { [key: string]: 'green' | 'orange' | 'grey' };
  keyboardLayout?: 'Q' | 'F';
  boardTheme?: 'classic' | 'ocean' | 'neon' | 'autumn' | 'pastel';
}

export default function Keyboard({
  onChar,
  onDelete,
  onEnter,
  letterStatuses,
  keyboardLayout = 'Q',
  boardTheme = 'classic'
}: KeyboardProps) {
  const qRows = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['ENTER', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'SIL']
  ];

  const fRows = [
    ['F', 'G', 'Ğ', 'I', 'O', 'D', 'R', 'N', 'H', 'P'],
    ['U', 'A', 'E', 'İ', 'T', 'K', 'M', 'L', 'Y', 'Ş'],
    ['ENTER', 'J', 'Ö', 'V', 'C', 'Z', 'S', 'B', 'Ç', 'SIL']
  ];

  const rows = keyboardLayout === 'F' ? fRows : qRows;

  const getKeyClass = (char: string) => {
    const base = 'flex-1 h-12 sm:h-14 md:h-16 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center transition-colors duration-200 cursor-pointer select-none';
    const status = letterStatuses[char.toLocaleUpperCase('tr-TR')];

    if (char === 'ENTER' || char === 'SIL') {
      return `${base} bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-[10px] sm:text-xs px-2`;
    }

    // Dynamic styles based on boardTheme
    let greenStyle = 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm';
    let orangeStyle = 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm';
    let greyStyle = 'bg-slate-400 dark:bg-slate-800 text-slate-100 dark:text-slate-500 opacity-60';

    if (boardTheme === 'ocean') {
      greenStyle = 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm';
      orangeStyle = 'bg-sky-400 hover:bg-sky-500 text-white shadow-sm';
      greyStyle = 'bg-slate-400 dark:bg-slate-800 text-slate-200 dark:text-slate-550 opacity-60';
    } else if (boardTheme === 'neon') {
      greenStyle = 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white shadow-sm';
      orangeStyle = 'bg-cyan-400 hover:bg-cyan-500 text-slate-950 shadow-sm';
      greyStyle = 'bg-zinc-650 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-550 opacity-60';
    } else if (boardTheme === 'autumn') {
      greenStyle = 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm';
      orangeStyle = 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm';
      greyStyle = 'bg-stone-500 dark:bg-stone-800 text-stone-200 dark:text-stone-500 opacity-60';
    } else if (boardTheme === 'pastel') {
      greenStyle = 'bg-teal-300 hover:bg-teal-400 text-teal-950 shadow-sm';
      orangeStyle = 'bg-rose-300 hover:bg-rose-400 text-rose-950 shadow-sm';
      greyStyle = 'bg-slate-200 dark:bg-slate-850 text-slate-400 dark:text-slate-600 opacity-60';
    }

    switch (status) {
      case 'green':
        return `${base} ${greenStyle}`;
      case 'orange':
        return `${base} ${orangeStyle}`;
      case 'grey':
        return `${base} ${greyStyle}`;
      default:
        return `${base} bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-750`;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 mt-2">
      <div className="flex flex-col gap-1.5 sm:gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((char) => {
              const isAction = char === 'ENTER' || char === 'SIL';
              return (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={char}
                  onClick={() => {
                    if (char === 'ENTER') {
                      onEnter();
                    } else if (char === 'SIL') {
                      onDelete();
                    } else {
                      onChar(char);
                    }
                  }}
                  className={getKeyClass(char)}
                  id={`key-${char}`}
                >
                  {char === 'SIL' ? (
                    <div className="flex items-center gap-0.5">
                      <Delete size={16} />
                      <span className="hidden sm:inline">SİL</span>
                    </div>
                  ) : char === 'ENTER' ? (
                    <span className="font-bold">GİRİŞ</span>
                  ) : (
                    char
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
