import { motion } from 'motion/react';

interface GameBoardProps {
  attempts: { word: string; feedback: ('green' | 'orange' | 'grey')[] }[];
  currentAttempt: string;
  wordLength: number;
  maxAttempts?: number;
  boardTheme?: 'classic' | 'ocean' | 'neon' | 'autumn' | 'pastel';
}

export default function GameBoard({
  attempts,
  currentAttempt,
  wordLength,
  maxAttempts = 6,
  boardTheme = 'classic'
}: GameBoardProps) {
  // Pad attempts to maxAttempts (6)
  const rows = [...attempts];
  const isCompleted = rows.length >= maxAttempts;
  
  if (rows.length < maxAttempts) {
    // Add active row
    rows.push({
      word: currentAttempt.padEnd(wordLength, ' '),
      feedback: []
    });
  }
  
  while (rows.length < maxAttempts) {
    rows.push({
      word: ' '.repeat(wordLength),
      feedback: []
    });
  }

  // Determine dynamic cell sizing based on word length to scale perfectly on mobile devices
  const getCellSizeClass = () => {
    if (wordLength === 3) {
      return 'w-[clamp(3rem,min(16vw,9.5vh),6.5rem)] h-[clamp(3rem,min(16vw,9.5vh),6.5rem)] text-3xl sm:text-4xl md:text-5xl border-[3.5px] rounded-2xl';
    }
    if (wordLength === 4) {
      return 'w-[clamp(2.6rem,min(14vw,9vh),6rem)] h-[clamp(2.6rem,min(14vw,9vh),6rem)] text-2xl sm:text-3xl md:text-4xl border-[3.5px] rounded-2xl';
    }
    if (wordLength === 5) {
      return 'w-[clamp(2.2rem,min(11vw,8.5vh),5.5rem)] h-[clamp(2.2rem,min(11vw,8.5vh),5.5rem)] text-2xl sm:text-3xl md:text-4xl border-[3px] rounded-2xl';
    }
    if (wordLength === 6) {
      return 'w-[clamp(2rem,min(9.5vw,8vh),4.75rem)] h-[clamp(2rem,min(9.5vw,8vh),4.75rem)] text-xl sm:text-2xl md:text-3xl border-[2.5px] sm:border-[3px] rounded-xl';
    }
    if (wordLength === 7) {
      return 'w-[clamp(1.9rem,min(8.2vw,7.5vh),4.25rem)] h-[clamp(1.9rem,min(8.2vw,7.5vh),4.25rem)] text-base sm:text-xl md:text-2xl border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl';
    }
    return 'w-[clamp(1.8rem,min(7.2vw,7vh),3.85rem)] h-[clamp(1.8rem,min(7.2vw,7vh),3.85rem)] text-sm sm:text-lg md:text-xl border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl';
  };

  // Determine cell classes based on status
  const getCellClass = (char: string, index: number, isSubmitted: boolean, feedback?: 'green' | 'orange' | 'grey') => {
    const sizeClass = getCellSizeClass();
    const base = `${sizeClass} flex items-center justify-center font-bold uppercase transition-all duration-300 select-none`;
    
    if (!isSubmitted) {
      if (char && char !== ' ') {
        return `${base} border-slate-500 dark:border-slate-400 text-slate-900 dark:text-white bg-white dark:bg-slate-800 scale-105 shadow-sm`;
      }
      return `${base} border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400`;
    }

    // Dynamic colors based on boardTheme
    let greenStyle = 'border-emerald-400 bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20';
    let orangeStyle = 'border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20';
    let greyStyle = 'border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-700 dark:to-slate-800 text-slate-100 dark:text-slate-300 shadow-sm';

    if (boardTheme === 'ocean') {
      greenStyle = 'border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20';
      orangeStyle = 'border-sky-400 bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-lg shadow-sky-400/20';
      greyStyle = 'border-slate-300 dark:border-slate-800 bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-800 dark:to-slate-900 text-slate-100 dark:text-slate-400 shadow-sm';
    } else if (boardTheme === 'neon') {
      greenStyle = 'border-fuchsia-500 bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-fuchsia-500/30';
      orangeStyle = 'border-cyan-400 bg-gradient-to-br from-cyan-400 to-teal-400 text-slate-950 shadow-lg shadow-cyan-400/30';
      greyStyle = 'border-zinc-600 dark:border-zinc-800 bg-gradient-to-br from-zinc-600 to-zinc-700 dark:from-zinc-800 dark:to-zinc-900 text-zinc-100 dark:text-zinc-400 shadow-sm';
    } else if (boardTheme === 'autumn') {
      greenStyle = 'border-orange-500 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20';
      orangeStyle = 'border-amber-500 bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/20';
      greyStyle = 'border-stone-400 dark:border-stone-800 bg-gradient-to-br from-stone-500 to-stone-600 dark:from-stone-800 dark:to-stone-900 text-stone-100 dark:text-stone-300 shadow-sm';
    } else if (boardTheme === 'pastel') {
      greenStyle = 'border-teal-300 bg-gradient-to-br from-teal-200 to-emerald-300 text-teal-950 shadow-md shadow-teal-300/20';
      orangeStyle = 'border-rose-300 bg-gradient-to-br from-rose-200 to-orange-300 text-rose-950 shadow-md shadow-rose-300/20';
      greyStyle = 'border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 text-slate-600 dark:text-slate-300 shadow-sm';
    }

    switch (feedback) {
      case 'green':
        return `${base} ${greenStyle}`;
      case 'orange':
        return `${base} ${orangeStyle}`;
      case 'grey':
        return `${base} ${greyStyle}`;
      default:
        return `${base} border-slate-400 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200`;
    }
  };

  return (
    <div className="flex flex-col gap-[clamp(0.2rem,1.2vh,0.5rem)] my-3 items-center justify-center overflow-x-auto w-full px-2">
      {rows.map((row, rowIndex) => {
        const isSubmitted = rowIndex < attempts.length;
        const isActive = rowIndex === attempts.length && !isCompleted;
        const wordChars = row.word.split('');

        return (
          <div key={rowIndex} className="flex gap-[clamp(0.2rem,1.2vw,0.5rem)]">
            {wordChars.map((char, charIndex) => {
              const feedback = row.feedback?.[charIndex];
              const cellClass = getCellClass(char, charIndex, isSubmitted, feedback);

              return (
                <motion.div
                  key={charIndex}
                  initial={isSubmitted ? { rotateX: 0 } : false}
                  animate={
                    isSubmitted
                      ? {
                          rotateX: [0, 90, 0],
                          transition: { delay: charIndex * 0.15, duration: 0.5 }
                        }
                      : isActive && char !== ' '
                      ? { scale: [1, 1.1, 1] }
                      : {}
                  }
                  className={cellClass}
                  id={`cell-${rowIndex}-${charIndex}`}
                >
                  <span className="font-sans font-bold">
                    {char !== ' ' ? char : ''}
                  </span>
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
