import React, { useState, useEffect, useRef } from 'react';
import { 
  Swords, Trophy, Users, Clock, Zap, ArrowRight, Home, Play,
  Check, AlertCircle, Sparkles, Award, RotateCcw, ShieldAlert
} from 'lucide-react';
import { UserProfile } from '../types.js';
import { getRandomWord, isWordInCuratedList } from '../data/wordlist.js';
import { turkishUpper, turkishLower } from '../utils/turkish.js';
import { getApiUrl } from '../utils/api.js';

interface GroupRaceProps {
  profile: UserProfile;
  onUpdateScore: (points: number) => void;
  onExit: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  dictionaryMode: 'tdk_online' | 'no_validation';
}

interface Competitor {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isUser: boolean;
  solved: boolean;
  solvedRound: number; // which attempt solved
  solveTime?: number;  // seconds remaining when solved
  currentAttempt: number;
  attemptsFeedback: ('green' | 'orange' | 'grey')[][];
  eliminated: boolean;
  speedFactor: number; // multiplier for action speeds
  targetSolveAttempt: number; // 1-6, or 0 if they fail to solve
}

const TURKISH_BOTS = [
  { name: 'Ahmet 🦁', avatar: '🦁' },
  { name: 'Buse 🐥', avatar: '🐥' },
  { name: 'Kerem 🦊', avatar: '🦊' },
  { name: 'Zeynep 🦄', avatar: '🦄' },
  { name: 'Mert 🐨', avatar: '🐨' },
  { name: 'Defne 🌸', avatar: '🌸' },
  { name: 'Selin 🐸', avatar: '🐸' },
  { name: 'Oktay 🦅', avatar: '🦅' },
  { name: 'Canan 🐼', avatar: '🐼' },
  { name: 'Rüzgar ⚡', avatar: '⚡' },
  { name: 'Ege 🌊', avatar: '🌊' },
  { name: 'Ada 🌴', avatar: '🌴' },
  { name: 'Cem 🚀', avatar: '🚀' },
  { name: 'Elif 🎨', avatar: '🎨' },
  { name: 'Hakan ⚔️', avatar: '⚔️' },
  { name: 'İrem 💎', avatar: '💎' },
  { name: 'Barış 🕊️', avatar: '🕊️' },
  { name: 'Gözde ✨', avatar: '✨' },
  { name: 'Kaan 🔱', avatar: '🔱' },
  { name: 'Aslı 🍀', avatar: '🍀' }
];

export default function GroupRace({
  profile,
  onUpdateScore,
  onExit,
  showToast,
  dictionaryMode
}: GroupRaceProps) {
  // Game phases: 'lobby' | 'playing' | 'elimination' | 'ended'
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'elimination' | 'ended'>('lobby');
  const [lobbyCountdown, setLobbyCountdown] = useState<number>(15); // Quick 15s join countdown to keep user action intense, but user can skip!
  const [lobbyPlayers, setLobbyPlayers] = useState<{ name: string; avatar: string; isUser: boolean; ready: boolean }[]>([]);
  
  // Tournament details
  const [currentRound, setCurrentRound] = useState<number>(1); // 1, 2, 3, 4
  const [wordLength, setWordLength] = useState<number>(5); // 5 -> 6 -> 7 -> 8
  const [targetWord, setTargetWord] = useState<string>('');
  const [wordDefinition, setWordDefinition] = useState<string>('');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [roundTimer, setRoundTimer] = useState<number>(45);
  
  // User game play state
  const [userGuesses, setUserGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [letterStatuses, setLetterStatuses] = useState<{ [key: string]: 'green' | 'orange' | 'grey' }>({});
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [userFinished, setUserFinished] = useState<boolean>(false);
  const [userSolved, setUserSolved] = useState<boolean>(false);

  // Live feed log
  const [liveLogs, setLiveLogs] = useState<{ time: string; text: string; icon?: string }[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard layout for TR
  const KEYBOARD_ROWS = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'],
  ];

  // Initialize lobby with joining players
  useEffect(() => {
    if (phase === 'lobby') {
      // Add user first
      setLobbyPlayers([{ name: profile.name, avatar: profile.avatarUrl || '👤', isUser: true, ready: true }]);
      setLobbyCountdown(15);
      
      const botJoinInterval = setInterval(() => {
        setLobbyPlayers((prev) => {
          if (prev.length >= 20) {
            clearInterval(botJoinInterval);
            return prev;
          }
          // Pick a random bot that isn't already in
          const availableBots = TURKISH_BOTS.filter(b => !prev.some(p => p.name === b.name));
          if (availableBots.length === 0) return prev;
          
          const newBot = availableBots[Math.floor(Math.random() * availableBots.length)];
          
          // Log join event
          const randomStatus = Math.random() > 0.3;
          return [...prev, { ...newBot, isUser: false, ready: randomStatus }];
        });
      }, 700);

      const countInterval = setInterval(() => {
        setLobbyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countInterval);
            clearInterval(botJoinInterval);
            // Auto start
            startTournament();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(botJoinInterval);
        clearInterval(countInterval);
      };
    }
  }, [phase]);

  // Handle scrolling of logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLogs]);

  // Start the actual tournament rounds
  const startTournament = () => {
    // We make sure the lobby has exactly 20 players. If less, backfill
    setLobbyPlayers((prev) => {
      let currentList = [...prev];
      const needed = 20 - currentList.length;
      if (needed > 0) {
        const availableBots = TURKISH_BOTS.filter(b => !currentList.some(p => p.name === b.name));
        for (let i = 0; i < Math.min(needed, availableBots.length); i++) {
          currentList.push({ ...availableBots[i], isUser: false, ready: true });
        }
      }
      
      // Map them to competitors
      const mappedCompetitors: Competitor[] = currentList.map((p, index) => {
        const isUser = p.isUser;
        const speedFactor = 0.5 + Math.random() * 1.5; // Bot speed factor
        const targetSolveAttempt = Math.random() > 0.15 ? Math.floor(Math.random() * 4) + 2 : 0; // 2, 3, 4, 5, or fail (0)
        
        return {
          id: isUser ? 'user' : `bot_${index}`,
          name: p.name,
          avatar: p.avatar,
          isBot: !isUser,
          isUser,
          solved: false,
          solvedRound: 0,
          currentAttempt: 0,
          attemptsFeedback: [],
          eliminated: false,
          speedFactor,
          targetSolveAttempt
        };
      });

      setCompetitors(mappedCompetitors);
      return currentList;
    });

    setCurrentRound(1);
    setupRound(1, 20);
  };

  // Setup the words and values for a round
  const setupRound = async (roundNum: number, activeCount: number) => {
    const nextWordLength = roundNum === 1 ? 5 : roundNum === 2 ? 6 : roundNum === 3 ? 7 : 8;
    setWordLength(nextWordLength);
    setCurrentRound(roundNum);
    setRoundTimer(45);
    setUserGuesses([]);
    setCurrentGuess('');
    setLetterStatuses({});
    setUserFinished(false);
    setUserSolved(false);
    setPhase('playing');
    setLiveLogs([{ time: '00:00', text: `🚩 Tur ${roundNum} Başladı! ${nextWordLength} harfli gizemli kelimeyi en hızlı bulan üst tura çıkar.` }]);

    // Fetch word from API or fallback
    try {
      const response = await fetch(getApiUrl('/api/random-word'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length: nextWordLength })
      });
      const data = await response.json();
      if (data.word) {
        setTargetWord(turkishUpper(data.word));
      } else {
        setTargetWord(getRandomWord(nextWordLength));
      }
    } catch (e) {
      setTargetWord(getRandomWord(nextWordLength));
    }

    // Initialize competitor states for this round
    setCompetitors((prev) => {
      return prev.map(c => {
        if (c.eliminated) return c;
        
        // Re-randomize bot targets for the new word
        const targetSolveAttempt = Math.random() > 0.15 ? Math.floor(Math.random() * 4) + 2 : 0;
        return {
          ...c,
          solved: false,
          solvedRound: 0,
          solveTime: undefined,
          currentAttempt: 0,
          attemptsFeedback: [],
          targetSolveAttempt
        };
      });
    });

    // Start timer & bot simulator
    startRoundTimer();
    startBotSimulation(nextWordLength);
  };

  // Timer loop
  const startRoundTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRoundTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (simulationRef.current) clearInterval(simulationRef.current);
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Simulation of other players' actions in real-time
  const startBotSimulation = (len: number) => {
    if (simulationRef.current) clearInterval(simulationRef.current);
    
    // Check state and trigger periodic bot actions
    simulationRef.current = setInterval(() => {
      setCompetitors((prevCompetitors) => {
        const timeElapsed = 45 - roundTimer;
        let logsToAdd: { time: string; text: string; icon?: string }[] = [];
        
        const nextList = prevCompetitors.map((c) => {
          if (c.eliminated || c.isUser || c.solved) return c;

          // Check if bot should perform an action based on their speed factor
          const actionChance = 0.12 * c.speedFactor;
          if (Math.random() < actionChance) {
            const nextAttemptNum = c.currentAttempt + 1;
            
            // Check if this action results in solving
            if (c.targetSolveAttempt > 0 && nextAttemptNum >= c.targetSolveAttempt) {
              // Bot solved!
              const solvedTime = roundTimer;
              const feedback: ('green' | 'orange' | 'grey')[] = Array(len).fill('green');
              
              logsToAdd.push({
                time: `00:${String(timeElapsed).padStart(2, '0')}`,
                text: `${c.name} Kelimeyi ÇÖZDÜ! 🎉 (${nextAttemptNum}. denemede)`,
                icon: '🎉'
              });

              return {
                ...c,
                solved: true,
                solvedRound: nextAttemptNum,
                solveTime: solvedTime,
                currentAttempt: nextAttemptNum,
                attemptsFeedback: [...c.attemptsFeedback, feedback]
              };
            } else if (nextAttemptNum >= 6) {
              // Bot failed all attempts
              const feedback: ('green' | 'orange' | 'grey')[] = Array(len).fill('grey');
              logsToAdd.push({
                time: `00:${String(timeElapsed).padStart(2, '0')}`,
                text: `${c.name} hakkını doldurdu ve elendi! ❌`,
                icon: '❌'
              });
              return {
                ...c,
                currentAttempt: nextAttemptNum,
                attemptsFeedback: [...c.attemptsFeedback, feedback],
                solved: false
              };
            } else {
              // Intermediate attempt: generate some orange and green highlights
              const feedback: ('green' | 'orange' | 'grey')[] = Array(len).fill('grey').map(() => {
                const r = Math.random();
                if (r < 0.25) return 'green';
                if (r < 0.5) return 'orange';
                return 'grey';
              });

              logsToAdd.push({
                time: `00:${String(timeElapsed).padStart(2, '0')}`,
                text: `${c.name} ${nextAttemptNum}. tahminini yaptı...`,
              });

              return {
                ...c,
                currentAttempt: nextAttemptNum,
                attemptsFeedback: [...c.attemptsFeedback, feedback]
              };
            }
          }
          return c;
        });

        if (logsToAdd.length > 0) {
          setLiveLogs((prevLogs) => [...prevLogs, ...logsToAdd]);
        }

        return nextList;
      });
    }, 1100);
  };

  // End of the current round
  const endRound = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (simulationRef.current) clearInterval(simulationRef.current);
    
    setPhase('elimination');
    
    // Sort survivors
    setCompetitors((prev) => {
      // Calculate results
      const userCompIndex = prev.findIndex(c => c.isUser);
      let updated = [...prev];
      
      // Update user state inside competitors list
      if (userCompIndex !== -1) {
        updated[userCompIndex] = {
          ...updated[userCompIndex],
          solved: userSolved,
          solvedRound: userSolved ? userGuesses.length : 0,
          solveTime: userSolved ? roundTimer : undefined,
          currentAttempt: userGuesses.length,
          attemptsFeedback: userGuesses.map(g => evaluateGuessLocally(g, targetWord))
        };
      }

      // Determine who gets eliminated in this round
      // Rules:
      // Tur 1 (20 players) -> Top 10 advance
      // Tur 2 (10 players) -> Top 5 advance
      // Tur 3 (5 players) -> Top 2 advance
      // Tur 4 (2 players) -> Winner takes all
      const targetSurvivors = currentRound === 1 ? 10 : currentRound === 2 ? 5 : currentRound === 3 ? 2 : 1;
      
      // Filter out players who were already eliminated in previous rounds
      const roundParticipants = updated.filter(c => !c.eliminated);
      
      // Sort round participants
      // 1. Solved: fewer attempts first, then more time remaining (higher solveTime) first
      // 2. Unsolved: higher currentAttempt (more effort) first
      const sortedParticipants = [...roundParticipants].sort((a, b) => {
        if (a.solved && !b.solved) return -1;
        if (!a.solved && b.solved) return 1;
        
        if (a.solved && b.solved) {
          if (a.solvedRound !== b.solvedRound) {
            return a.solvedRound - b.solvedRound; // Less attempts wins
          }
          return (b.solveTime || 0) - (a.solveTime || 0); // More seconds left wins
        }
        
        // Neither solved
        return b.currentAttempt - a.currentAttempt;
      });

      // Mark elminated
      const survivorIds = sortedParticipants.slice(0, targetSurvivors).map(s => s.id);
      
      const finalCompetitors = updated.map(c => {
        if (c.eliminated) return c; // Already out
        if (!survivorIds.includes(c.id)) {
          return { ...c, eliminated: true };
        }
        return c;
      });

      // Check user survival
      const userComp = finalCompetitors.find(c => c.isUser);
      if (userComp) {
        if (userComp.eliminated) {
          showToast('Bu turda elendiniz!', 'error');
        } else {
          showToast('Tebrikler, üst tura yükseldiniz! 🎉', 'success');
          // Update score slightly for surviving a round
          onUpdateScore(currentRound * 15);
        }
      }

      // If round is 4, end the tournament
      if (currentRound === 4) {
        setPhase('ended');
        // Give heavy bonus points to final champion
        const champion = finalCompetitors.find(c => !c.eliminated);
        if (champion && champion.isUser) {
          onUpdateScore(100); // 100 bonus tournament win points!
        }
      }

      return finalCompetitors;
    });
  };

  // Locally evaluate guess for rendering competitor grids
  const evaluateGuessLocally = (guess: string, target: string): ('green' | 'orange' | 'grey')[] => {
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    const feedback: ('green' | 'orange' | 'grey')[] = Array(wordLength).fill('grey');
    const used = Array(wordLength).fill(false);

    for (let i = 0; i < wordLength; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        feedback[i] = 'green';
        used[i] = true;
      }
    }

    for (let i = 0; i < wordLength; i++) {
      if (feedback[i] === 'green') continue;
      for (let j = 0; j < wordLength; j++) {
        if (!used[j] && targetLetters[j] === guessLetters[i]) {
          feedback[i] = 'orange';
          used[j] = true;
          break;
        }
      }
    }

    return feedback;
  };

  // Keyboard press handler
  const handleKeyPress = (key: string) => {
    if (userFinished) return;

    if (key === 'ENTER') {
      submitUserGuess();
    } else if (key === 'BACK' || key === 'BACKSPACE') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (currentGuess.length < wordLength && /^[a-zA-ZğüşıöçĞÜŞİÖÇ]$/.test(key)) {
      setCurrentGuess((prev) => turkishUpper(prev + key));
    }
  };

  // Submit guess
  const submitUserGuess = async () => {
    if (currentGuess.length !== wordLength) {
      showToast(`Lütfen ${wordLength} harfli bir kelime girin!`, 'error');
      return;
    }

    setIsValidating(true);
    let isValid = false;

    if (dictionaryMode === 'no_validation') {
      isValid = true;
    } else {
      // Check server validation
      try {
        const response = await fetch(getApiUrl('/api/validate-word'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: currentGuess, length: wordLength })
        });
        if (response.ok) {
          const data = await response.json();
          isValid = data.valid;
        } else {
          isValid = isWordInCuratedList(currentGuess, wordLength);
        }
      } catch (e) {
        isValid = isWordInCuratedList(currentGuess, wordLength);
      }
    }

    if (!isValid) {
      showToast('Bu kelime sözlükte bulunamadı!', 'error');
      setIsValidating(false);
      return;
    }

    // Process guess
    const feedback = evaluateGuessLocally(currentGuess, targetWord);
    const updatedGuesses = [...userGuesses, currentGuess];
    setUserGuesses(updatedGuesses);
    setCurrentGuess('');
    setIsValidating(false);

    // Update keys color status
    const newKeys = { ...letterStatuses };
    currentGuess.split('').forEach((char, idx) => {
      const color = feedback[idx];
      const prev = newKeys[char];
      if (color === 'green') newKeys[char] = 'green';
      else if (color === 'orange' && prev !== 'green') newKeys[char] = 'orange';
      else if (color === 'grey' && !prev) newKeys[char] = 'grey';
    });
    setLetterStatuses(newKeys);

    // Check if won
    if (currentGuess === targetWord) {
      setUserSolved(true);
      setUserFinished(true);
      showToast('Kelimeyi doğru çözdünüz! Rakipleri bekleyin.', 'success');
      
      setLiveLogs((prev) => [
        ...prev,
        {
          time: `00:${String(45 - roundTimer).padStart(2, '0')}`,
          text: `SİZ (${profile.name}) Kelimeyi çözdünüz! 🌟 (${updatedGuesses.length}. deneme)`,
          icon: '🌟'
        }
      ]);

      // If all other active bots are already finished or solved, fast-forward round end
      const otherActive = competitors.filter(c => !c.eliminated && !c.isUser && !c.solved);
      if (otherActive.length === 0) {
        setTimeout(endRound, 2000);
      }
    } else if (updatedGuesses.length >= 6) {
      setUserFinished(true);
      showToast('Hakkınız bitti! Tur sonunu bekleyin.', 'error');
      
      setLiveLogs((prev) => [
        ...prev,
        {
          time: `00:${String(45 - roundTimer).padStart(2, '0')}`,
          text: `SİZ (${profile.name}) elendiniz! 💀`,
          icon: '💀'
        }
      ]);
    }
  };

  // Keyboard physical mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      
      if (e.key === 'Enter') {
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACK');
      } else {
        handleKeyPress(turkishUpper(e.key));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, userFinished, phase, wordLength]);

  // Clean up
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, []);

  // Filter survivors and eliminated
  const activeCompetitors = competitors.filter(c => !c.eliminated || c.isUser);
  const userCompetitor = competitors.find(c => c.isUser);
  const isUserEliminated = userCompetitor?.eliminated;

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-6 animate-fade-in" id="group-race-main-container">
      
      {/* 1. PHASE: LOBBY */}
      {phase === 'lobby' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-white shadow-2xl space-y-8 relative overflow-hidden" id="group-lobby-card">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 transform rotate-6 animate-pulse">
              <Swords size={40} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Online <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Grup Yarışı</span> Turnuvası
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Sınır 20 kişidir. 1 dakika içinde düello alanında toplanan tüm savaşçılar aynı anda, aynı gizli kelimelerle elenerek finale doğru kıyasıya yarışır!
            </p>
          </div>

          {/* Countdown timer & launch button */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center space-y-4 max-w-md mx-auto">
            <div className="flex justify-center items-center gap-3">
              <Clock size={20} className="text-amber-500 animate-spin" />
              <span className="text-sm font-bold text-slate-300">Geri Sayım Başladı:</span>
              <span className="text-2xl font-extrabold font-mono text-amber-500">{lobbyCountdown} saniye</span>
            </div>
            
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${(lobbyCountdown / 15) * 100}%` }}
              ></div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={onExit}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Vazgeç / Çık
              </button>
              <button
                onClick={() => startTournament()}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/15"
              >
                Süre Beklemeden Başlat
              </button>
            </div>
          </div>

          {/* Connected players grid (Up to 20 players) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} />
                Düello Meydanındaki Savaşçılar ({lobbyPlayers.length}/20)
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold">
                Aktif Katılım Sürüyor
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {lobbyPlayers.map((player, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 transition transform hover:scale-105 duration-150 ${
                    player.isUser 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-slate-950/40 border-slate-800/80'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xl shadow-inner shrink-0">
                    {player.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-extrabold truncate block text-slate-200">
                      {player.name}
                    </span>
                    <span className={`text-[9px] font-bold block ${player.ready ? 'text-emerald-400' : 'text-slate-500 animate-pulse'}`}>
                      {player.ready ? 'HAZIR ✔' : 'KATILIYOR...'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Placeholder slots to show 20 size limit */}
              {Array.from({ length: Math.max(0, 20 - lobbyPlayers.length) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="border border-dashed border-slate-800 p-3 rounded-2xl flex items-center justify-center text-slate-700 min-h-[58px]">
                  <span className="text-[10px] font-mono tracking-wider">Açık Slot #{lobbyPlayers.length + idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. PHASE: ACTIVE TOURNAMENT PLAYING */}
      {phase === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="group-race-battlefield">
          
          {/* LEFT: Game play Board (8 columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Round info and Timer row */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-3xl shadow-lg flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl text-white shadow-md">
                  <Award size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                    TUR #{currentRound} <span className="text-amber-500 font-extrabold">({wordLength} Harf)</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                    Kalan Savaşçı Sayısı: {competitors.filter(c => !c.eliminated).length} / 20
                  </p>
                </div>
              </div>

              {/* Timer wheel */}
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <Clock size={16} className={`animate-pulse ${roundTimer < 15 ? 'text-rose-500' : 'text-emerald-500'}`} />
                <span className={`font-mono text-lg font-extrabold ${roundTimer < 15 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                  00:{String(roundTimer).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Wordle Grid block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center space-y-5 relative">
              {isUserEliminated && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-3xl z-40 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <ShieldAlert size={48} className="text-rose-500" />
                  <h3 className="text-xl font-bold text-white">Yarıştan Elendiniz!</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Bu turda elendiniz ancak diğer savaşçıların kıyasıya düellosunu canlı olarak izleyip kimin kazanacağını görebilirsiniz!
                  </p>
                  <button
                    onClick={endRound}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-rose-500/10"
                  >
                    Canlı Sıralamayı Gör
                  </button>
                </div>
              )}

              {/* Grid representation */}
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, rowIdx) => {
                  const guess = userGuesses[rowIdx] || '';
                  const isCurrent = rowIdx === userGuesses.length && !userFinished;
                  const feedback = userGuesses[rowIdx] ? evaluateGuessLocally(guess, targetWord) : [];

                  return (
                    <div key={rowIdx} className="flex gap-2 justify-center">
                      {Array.from({ length: wordLength }).map((_, colIdx) => {
                        let letter = '';
                        if (isCurrent) {
                          letter = currentGuess[colIdx] || '';
                        } else if (userGuesses[rowIdx]) {
                          letter = guess[colIdx] || '';
                        }

                        const status = feedback[colIdx];
                        let bgClass = 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white';
                        if (status === 'green') bgClass = 'bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/10';
                        else if (status === 'orange') bgClass = 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/10';
                        else if (status === 'grey') bgClass = 'bg-slate-400 border-slate-500 text-white';

                        return (
                          <div
                            key={colIdx}
                            className={`w-10 h-10 sm:w-12 sm:h-12 border-[3px] rounded-xl flex items-center justify-center text-sm sm:text-base font-extrabold select-none transition-all duration-300 ${bgClass} ${
                              isCurrent && letter ? 'scale-105 border-emerald-500 ring-2 ring-emerald-500/15' : ''
                            }`}
                          >
                            {letter}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Guesses loader indicator */}
              {isValidating && (
                <div className="text-xs text-emerald-500 font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  Sözlükte Kelime Sorgulanıyor...
                </div>
              )}
            </div>

            {/* Virtual Keyboard */}
            {!isUserEliminated && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 rounded-3xl shadow-lg">
                <div className="space-y-1.5 sm:space-y-2 max-w-2xl mx-auto">
                  {KEYBOARD_ROWS.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-1 sm:gap-1.5 justify-center">
                      {rowIdx === 2 && (
                        <button
                          onClick={() => handleKeyPress('ENTER')}
                          className="flex-1 sm:flex-none px-3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-[10px] sm:text-xs transition active:scale-95"
                        >
                          GİRİŞ
                        </button>
                      )}
                      
                      {row.map((char) => {
                        const status = letterStatuses[char];
                        let bgClass = 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200';
                        if (status === 'green') bgClass = 'bg-emerald-500 text-white shadow-sm';
                        else if (status === 'orange') bgClass = 'bg-amber-500 text-white shadow-sm';
                        else if (status === 'grey') bgClass = 'bg-slate-400 text-slate-100';

                        return (
                          <button
                            key={char}
                            onClick={() => handleKeyPress(char)}
                            className={`h-9 sm:h-12 w-8 sm:w-10 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center transition active:scale-95 ${bgClass}`}
                          >
                            {char}
                          </button>
                        );
                      })}

                      {rowIdx === 2 && (
                        <button
                          onClick={() => handleKeyPress('BACK')}
                          className="flex-1 sm:flex-none px-3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-[10px] sm:text-xs transition active:scale-95"
                        >
                          SİL
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Live Feed and Competitors Standings (4 columns) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Live Competition stand */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-3xl shadow-xl space-y-4 flex flex-col max-h-[440px]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} />
                  Sıralama ({competitors.filter(c => !c.eliminated).length} Savaşçı)
                </span>
                <span className="text-[9px] font-extrabold bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full uppercase">
                  {currentRound === 1 ? 'TOP 10 TUR ATLAR' : currentRound === 2 ? 'TOP 5 TUR ATLAR' : currentRound === 3 ? 'TOP 2 TUR ATLAR' : 'ŞAMPİYONLUK MAÇI'}
                </span>
              </div>

              {/* Scrollable list */}
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {activeCompetitors.map((c, idx) => {
                  return (
                    <div 
                      key={c.id} 
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 transition duration-150 ${
                        c.isUser 
                          ? 'bg-emerald-500/10 border-emerald-500/20 shadow-sm' 
                          : c.eliminated 
                          ? 'bg-slate-50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-850 opacity-40' 
                          : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-850/45'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm shadow-inner shrink-0">
                          {c.avatar}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-extrabold truncate block ${c.isUser ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {c.name} {c.isUser && '(SİZ)'}
                          </span>
                          
                          {/* visual guessing squares representing effort */}
                          <div className="flex gap-0.5 mt-0.5">
                            {Array.from({ length: 6 }).map((_, i) => {
                              const attempted = i < c.currentAttempt;
                              const solvedRow = c.solved && i === c.currentAttempt - 1;
                              return (
                                <div 
                                  key={i} 
                                  className={`w-2 h-2 rounded-sm ${
                                    solvedRow 
                                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/10' 
                                      : attempted 
                                      ? 'bg-amber-500' 
                                      : 'bg-slate-200 dark:bg-slate-800'
                                  }`}
                                ></div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {c.solved ? (
                          <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Çözdü ✔
                          </span>
                        ) : c.eliminated ? (
                          <span className="text-[10px] font-semibold text-rose-500">
                            Elendi
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {c.currentAttempt}/6 Tahmin
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live broadcast terminal logs */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-3xl shadow-xl flex flex-col h-[180px] text-xs font-mono">
              <div className="flex justify-between items-center pb-1 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Canlı Savaş Akışı</span>
                <span className="text-rose-500 animate-pulse">● CANLI</span>
              </div>

              <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin text-slate-300">
                {liveLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start leading-tight">
                    <span className="text-slate-500 text-[10px]">{log.time}</span>
                    <p className="flex-1 text-[11px]">
                      {log.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PHASE: ELIMINATION SUMMARY */}
      {phase === 'elimination' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center" id="elimination-results">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tur #{currentRound} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Savaş Raporu</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold uppercase">
              Gizli Kelime: <span className="text-emerald-500 font-extrabold underline">{targetWord}</span>
            </p>
          </div>

          {/* Results dashboard list */}
          <div className="max-w-2xl mx-auto border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 text-left border-b border-slate-100 dark:border-slate-800 flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Savaşçı Adı</span>
              <span>Tur Skoru / Durumu</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {[...competitors].sort((a, b) => {
                // Survivors first, then elminated
                if (!a.eliminated && b.eliminated) return -1;
                if (a.eliminated && !b.eliminated) return 1;
                
                // If both same state, sort by performance
                if (a.solved && !b.solved) return -1;
                if (!a.solved && b.solved) return 1;
                
                if (a.solved && b.solved) {
                  if (a.solvedRound !== b.solvedRound) return a.solvedRound - b.solvedRound;
                  return (b.solveTime || 0) - (a.solveTime || 0);
                }
                return b.currentAttempt - a.currentAttempt;
              }).map((c, idx) => {
                return (
                  <div 
                    key={c.id} 
                    className={`px-4 py-3 flex justify-between items-center text-left ${
                      c.isUser ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{c.avatar}</span>
                      <div>
                        <span className={`text-xs font-extrabold block ${c.isUser ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {c.name} {c.isUser && '(SİZ)'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {c.solved ? `${c.solvedRound}. denemede çözdü` : 'Çözemedi'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {c.eliminated ? (
                        <span className="text-[10px] font-extrabold bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full border border-rose-500/15 uppercase">
                          Elendi 💀
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/15 uppercase">
                          Tur Atladı 🚀
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Survival banner controls */}
          <div className="pt-4 max-w-md mx-auto space-y-4">
            {isUserEliminated ? (
              <div className="space-y-3 p-4 bg-rose-500/5 border border-rose-200 dark:border-rose-900 rounded-2xl">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  Maalesef elendiniz ancak diğer robotların turlarını izleyip şampiyonu görebilirsiniz!
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={onExit}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Lobiye Dön / Çık
                  </button>
                  <button
                    onClick={() => {
                      // Let them advance as spectator
                      const nextRoundNum = currentRound + 1;
                      setupRound(nextRoundNum, competitors.filter(c => !c.eliminated).length);
                    }}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-md shadow-amber-500/10"
                  >
                    Turu İzle (Seyirci)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-emerald-500/5 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  Harika performans! Bir sonraki {currentRound === 3 ? 'Şampiyonluk' : 'Eleme'} Turuna yükseldiniz.
                </p>
                <button
                  onClick={() => {
                    const nextRoundNum = currentRound + 1;
                    setupRound(nextRoundNum, competitors.filter(c => !c.eliminated).length);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 px-6 rounded-xl text-xs transition shadow-md shadow-emerald-500/15"
                >
                  <span>Sonraki Tur ({currentRound === 3 ? 'BÜYÜK FİNAL!' : 'Zorlu Eşleşme'})</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PHASE: END OF TOURNAMENT */}
      {phase === 'ended' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 text-white shadow-2xl space-y-8 text-center relative overflow-hidden animate-fade-in" id="tournament-champion-board">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Winner announcement */}
          <div className="space-y-4 max-w-md mx-auto">
            <div className="inline-flex p-5 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full shadow-lg shadow-amber-500/15 text-white animate-bounce">
              <Trophy size={48} />
            </div>

            {(() => {
              const champion = competitors.find(c => !c.eliminated);
              const isUserChampion = champion?.isUser;

              if (isUserChampion) {
                return (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/15 uppercase tracking-widest">
                      🏆 TURNUVA ŞAMPİYONU 🏆
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      Büyük Zafer!
                    </h1>
                    <p className="text-xs text-slate-400">
                      Tüm rakiplerinizi elenerek geride bıraktınız ve kupayı kaldırdınız! <strong>+100 Savaş Puanı</strong> hanenize eklendi.
                    </p>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50 uppercase tracking-widest">
                      TURNUVA SONA ERDİ
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Şampiyon: {champion?.name || 'Bilinmiyor'}
                    </h1>
                    <p className="text-xs text-slate-400">
                      Turnuva finalinde rakibiniz zafere ulaştı. Antrenman yapıp bir dahaki sefere kupayı siz kazanın!
                    </p>
                  </div>
                );
              }
            })()}
          </div>

          {/* Tournament Summary Grid */}
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-850 p-4 rounded-2xl text-left space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yarış Sonuç Özet Raporu</span>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Toplam Savaşçı Limit</span>
                <span className="font-bold text-slate-100">20 Kişi</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Elenme Turları</span>
                <span className="font-bold text-slate-100">4 Eleme Aşaması</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-400">Sizin Ulaştığınız Aşama</span>
                <span className="font-extrabold text-emerald-400 uppercase">
                  {isUserEliminated ? `Tur ${currentRound} (Elenildi)` : 'ŞAMPİYONLUK (KAZANDINIZ)'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center pt-2 max-w-sm mx-auto">
            <button
              onClick={onExit}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Home size={14} />
              <span>Ana Sayfaya Dön</span>
            </button>
            <button
              onClick={() => {
                setPhase('lobby');
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15"
            >
              <RotateCcw size={14} />
              <span>Yeni Grup Yarışı Aç</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
