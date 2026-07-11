import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  playClickSound,
  playDeleteSound,
  playEnterSound,
  playErrorSound,
  playVictorySound,
  playDefeatSound
} from './utils/soundEffects.js';
import GameBoard from './components/GameBoard.js';
import Keyboard from './components/Keyboard.js';
import Lobby from './components/Lobby.js';
import StatsModal from './components/StatsModal.js';
import MissionsModal from './components/MissionsModal.js';
import WelcomeScreen from './components/WelcomeScreen.js';
import GroupRace from './components/GroupRace.js';
import SettingsModal, { AppSettings } from './components/SettingsModal.js';
import { UserProfile, GameAttempt, LobbyPlayer, Challenge, RealtimeMatch, DailyMission, Badge } from './types.js';
import { Swords, RotateCcw, AlertCircle, HelpCircle, Trophy, UserCheck, Flame, Hourglass, HelpCircle as HelpIcon, Sparkles, Upload, Trash2, Image, X, ArrowLeft } from 'lucide-react';
import { getRandomWord, isWordInCuratedList } from './data/wordlist.js';
import { turkishUpper, turkishLower } from './utils/turkish.js';
import { getApiUrl, getWsUrl } from './utils/api.js';

const INITIAL_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  winDistribution: [0, 0, 0, 0, 0, 0]
};

const DEFAULT_BADGES: Badge[] = [
  { id: 'first_step', title: 'İlk Adım', description: 'İlk kelime oyununu oyna', iconName: 'Award' },
  { id: 'champion', title: 'Şampiyon', description: 'İlk galibiyetini kazan', iconName: 'Award' },
  { id: 'lightning', title: 'Yıldırım Çözücü', description: '10 saniyeden fazla süre varken kelimeyi çöz', iconName: 'Award' },
  { id: 'flawless', title: 'Kusursuz', description: 'Kelimeyi ilk veya ikinci denemede doğru bil', iconName: 'Award' },
  { id: 'genius', title: 'Zeka Küpü', description: '8 harfli bir kelimeyi başarıyla tamamla', iconName: 'Award' },
  { id: 'gladiator', title: 'Gladyatör', description: 'Gerçek zamanlı bir arkadaş meydan okumasını kazan', iconName: 'Award' }
];

const DEFAULT_MISSIONS: DailyMission[] = [
  { id: 'm_play_1', title: 'Kelime Avcısı 🔍', description: 'Bugün en az 1 kelime oyunu oyna', target: 1, current: 0, completed: false, type: 'play' },
  { id: 'm_win_1', title: 'İlk Zafer 🏆', description: 'Bugün en az 1 kelimeyi doğru tahmin et', target: 1, current: 0, completed: false, type: 'win' },
  { id: 'm_fast_1', title: 'Yıldırım Hızı ⚡', description: 'Herhangi bir kelimeyi 10 saniyeden fazla süre kala çöz', target: 1, current: 0, completed: false, type: 'fast_solve' },
  
  // 3-letter words
  { id: 'm_solve_3_1', title: 'Üçgen Formülü 🔺', description: '3 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_3' },
  { id: 'm_solve_3_2', title: 'Üç Harf Seri 🔥', description: '3 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_3' },
  
  // 4-letter words
  { id: 'm_solve_4_1', title: 'Dört Dörtlük 🟥', description: '4 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_4' },
  { id: 'm_solve_4_2', title: 'Kare Ustası 🧱', description: '4 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_4' },
  
  // 5-letter words
  { id: 'm_solve_5_1', title: 'Beşli Yıldız ⭐', description: '5 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_5' },
  { id: 'm_solve_5_2', title: 'Pentagon Seferi 🎯', description: '5 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_5' },
  
  // 6-letter words
  { id: 'm_solve_6_1', title: 'Altıncı His 👁️', description: '6 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_6' },
  { id: 'm_solve_6_2', title: 'Hexagon Muhafızı 🛡️', description: '6 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_6' },
  
  // 7-letter words
  { id: 'm_solve_7_1', title: 'Yedi Tepe ⛰️', description: '7 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_7' },
  { id: 'm_solve_7_2', title: 'Gökkuşağı Bandı 🌈', description: '7 harfli 2 kelimeyi başarıyla çöz', target: 2, current: 0, completed: false, type: 'solve_7' },
  
  // 8-letter words
  { id: 'm_solve_8_1', title: 'Sekiz Köşe 🕸️', description: '8 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_8' },
  { id: 'm_solve_8_2', title: 'Kelimelerin Efendisi 👑', description: '8 harfli 2 kelimeyi başarıyla çöz', target: 2, current: 0, completed: false, type: 'solve_8' },
  
  // Advanced
  { id: 'm_streak_2', title: 'Durdurulamaz 🦾', description: 'Üst üste 2 oyun kazan', target: 2, current: 0, completed: false, type: 'streak' },
  { id: 'm_perfect_1', title: 'Kusursuz Akıl 🧠', description: 'Herhangi bir kelimeyi ilk veya ikinci denemede doğru bil', target: 1, current: 0, completed: false, type: 'perfect' }
];

const triggerVictoryCelebration = (soundEnabled: boolean) => {
  // Play grand synthesized victory chords/arpeggio
  playVictorySound(soundEnabled);

  // Simple primary burst
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
  });

  // Left corner launch
  setTimeout(() => {
    confetti({
      particleCount: 100,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.85 },
      colors: ['#10b981', '#3b82f6', '#f59e0b']
    });
  }, 250);

  // Right corner launch
  setTimeout(() => {
    confetti({
      particleCount: 100,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.85 },
      colors: ['#10b981', '#3b82f6', '#f59e0b']
    });
  }, 400);

  // Multi-burst fireworks effect for 3.5 seconds
  const duration = 3500;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 35, spread: 360, ticks: 75, zIndex: 100 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 60 * (timeLeft / duration);
    
    // Left, center, and right random bursts mimicking grand firework shells
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 },
      colors: ['#10b981', '#3b82f6', '#ec4899']
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 },
      colors: ['#34d399', '#f59e0b', '#8b5cf6']
    });
  }, 350);
};

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('localStorage getItem blocked/unavailable:', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage setItem blocked/unavailable:', e);
    }
  }
};

export default function App() {
  // Theme & Menu State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isConnectPage] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/connect';
  });

  // Capacitor Deep Link Listener
  useEffect(() => {
    let isSubscribed = true;
    
    const setupDeepLink = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        
        CapApp.addListener('appUrlOpen', (event: any) => {
          if (!isSubscribed) return;
          console.log('App opened via deep link:', event.url);
          try {
            const parsedUrl = new URL(event.url);
            if (parsedUrl.protocol === 'kelimesavasi:' || parsedUrl.host === 'connect' || parsedUrl.pathname.includes('connect')) {
              const token = parsedUrl.searchParams.get('token');
              const server = parsedUrl.searchParams.get('server');
              
              if (token) {
                window.localStorage.setItem('aistudio_auth_token', token);
                window.sessionStorage.setItem('aistudio_auth_token', token);
              }
              if (server) {
                window.localStorage.setItem('kelimesavasi_server_type', server);
              }
              
              // Force reload to instantly reinitialize and connect
              setTimeout(() => {
                window.location.reload();
              }, 300);
            }
          } catch (e) {
            console.error('Failed to parse app url open event:', e);
          }
        });
      } catch (e) {
        console.log('Capacitor App plugin not available:', e);
      }
    };
    
    setupDeepLink();
    
    return () => {
      isSubscribed = false;
    };
  }, []);

  if (isConnectPage) {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') || '';
    const server = searchParams.get('server') || 'pre';
    const deepLinkUrl = `kelimesavasi://connect?token=${encodeURIComponent(token)}&server=${server}`;
    const webFallbackUrl = `/?___aistudio_auth_token=${encodeURIComponent(token)}`;

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-6 animate-scale-up">
          {/* Header */}
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white text-3xl font-black">
              W
            </div>
            <h2 className="text-xl font-black tracking-tight font-sans">Kelime Savaşı Mobil Bağlantı</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-sans">Telefonunuzdaki yüklü uygulamayı otomatik olarak internete bağlayın</p>
          </div>

          {/* Action Card */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-left font-sans">
              Bu sayfa, telefonunuzdaki Kelime Savaşı APK/AAB uygulamasının bulut sunucularına güvenli bir şekilde erişmesini sağlar.
            </p>

            <button
              onClick={() => {
                window.location.href = deepLinkUrl;
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <Swords size={16} />
              MOBİL UYGULAMADA AÇ VE BAĞLAN
            </button>
          </div>

          {/* Steps */}
          <div className="text-left space-y-3.5 px-1">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Nasıl Bağlanır?</h4>
            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-sans">1</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
                Samsung/Android telefonunuzda Kelime Savaşı uygulamasının yüklü olduğundan emin olun.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-sans">2</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
                Yukarıdaki yeşil <strong>"MOBİL UYGULAMADA AÇ VE BAĞLAN"</strong> butonuna tıklayın.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-sans">3</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
                Telefonunuz onay istediğinde açılmasına izin verin. Uygulama otomatik açılacak ve internete bağlanacaktır!
              </p>
            </div>
          </div>

          {/* Browser Alternative */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => {
                window.location.href = webFallbackUrl;
              }}
              className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer font-sans"
            >
              <span>Veya bu tarayıcıda oynamaya devam et &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    let saved = safeLocalStorage.getItem('kelimesavasi_profile');
    if (!saved) saved = safeLocalStorage.getItem('lingo_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure missions and badges structures are complete and upgraded if old
        if (!parsed.missions || parsed.missions.length < 10) parsed.missions = DEFAULT_MISSIONS;
        if (!parsed.badges) parsed.badges = DEFAULT_BADGES;
        return parsed;
      } catch (e) {
        console.error('Failed parsing profile', e);
      }
    }
    
    // Default profile
    const randomId = `user_${Math.random().toString(36).substring(2, 11)}`;
    const randomNum = Math.floor(100 + Math.random() * 900);
    return {
      id: randomId,
      name: `Oyuncu_${randomNum}`,
      stats: INITIAL_STATS,
      badges: DEFAULT_BADGES,
      missions: DEFAULT_MISSIONS,
      dailyScore: 0,
      lastUpdated: new Date().toISOString()
    };
  });

  // Game Play State
  const [wordLength, setWordLength] = useState<number>(5);
  const [targetWord, setTargetWord] = useState<string>('');
  const [attempts, setAttempts] = useState<GameAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [wordDefinition, setWordDefinition] = useState<string>('');
  const [letterStatuses, setLetterStatuses] = useState<{ [key: string]: 'green' | 'orange' | 'grey' }>({});

  // Welcome Screen & Dictionary Mode State
  const [hasEnteredGame, setHasEnteredGame] = useState<boolean>(() => {
    return safeLocalStorage.getItem('kelimesavasi_entered') === 'true';
  });
  const [dictionaryMode, setDictionaryMode] = useState<'tdk_online' | 'no_validation'>(() => {
    const saved = safeLocalStorage.getItem('kelimesavasi_dict_mode');
    return saved === 'no_validation' ? 'no_validation' : 'tdk_online';
  });
  const [gameMode, setGameMode] = useState<'timed' | 'untimed'>(() => {
    const saved = safeLocalStorage.getItem('kelimesavasi_game_mode');
    return saved === 'untimed' ? 'untimed' : 'timed';
  });

  useEffect(() => {
    safeLocalStorage.setItem('kelimesavasi_game_mode', gameMode);
  }, [gameMode]);

  const [matchmakingStatus, setMatchmakingStatus] = useState<'idle' | 'queued'>('idle');
  const [isGroupRaceActive, setIsGroupRaceActive] = useState<boolean>(false);

  // UI Modals / Alerts
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(false);
  const [showLobbyModal, setShowLobbyModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = safeLocalStorage.getItem('kelimesavasi_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed parsing settings', e);
      }
    }
    return {
      boardTheme: 'classic',
      bgTheme: 'default',
      keyboardLayout: 'Q',
      soundEnabled: true,
      hapticEnabled: true
    };
  });

  useEffect(() => {
    safeLocalStorage.setItem('kelimesavasi_settings', JSON.stringify(settings));
  }, [settings]);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(profile.name);
  const [avatarInput, setAvatarInput] = useState<string | undefined>(profile.avatarUrl);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Real-time Multiplayer State
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [reconnectCounter, setReconnectCounter] = useState<number>(0);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [activeMatch, setActiveMatch] = useState<RealtimeMatch | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const wasOnlineRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleManualReconnect = () => {
    showToast('Sunucuya yeniden bağlanılıyor...', 'info');
    setReconnectCounter((prev) => prev + 1);
  };

  // Apply dark mode to document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    safeLocalStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Persist User Profile
  useEffect(() => {
    safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    safeLocalStorage.setItem('kelimesavasi_entered', hasEnteredGame.toString());
  }, [hasEnteredGame]);

  useEffect(() => {
    safeLocalStorage.setItem('kelimesavasi_dict_mode', dictionaryMode);
  }, [dictionaryMode]);

  // Toast Helper
  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Force HTTPS on remote servers for secure WebSockets
  useEffect(() => {
    if (typeof window !== 'undefined' && 
        window.location.protocol === 'http:' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1' &&
        !window.location.hostname.startsWith('192.168.') &&
        !window.location.hostname.startsWith('10.')) {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
  }, []);

  // Connect to real-time WebSocket on mount or profile change
  useEffect(() => {
    const wsUrl = getWsUrl();
    let pingInterval: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;
    let lastMessageTime = Date.now();

    const connectWS = () => {
      if (isDisposed) return;

      // Safety check: if there is an active socket that is already OPEN or CONNECTING, do NOT create a new one!
      if (socketRef.current) {
        if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket already active or connecting. Skipping duplicate connection attempt.');
          return;
        }
      }

      // Unconditionally clear any pending reconnect timeout before starting a new connection
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      console.log('Connecting to WebSocket at:', wsUrl);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      const connTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timed out (stuck in CONNECTING state). Closing & retrying...');
          try {
            ws.close();
          } catch (e) {
            // ignore
          }
        }
      }, 20000);

      ws.onopen = () => {
        clearTimeout(connTimeout);
        setIsOnline(true);
        wasOnlineRef.current = true;
        lastMessageTime = Date.now();
        // Register client
        ws.send(JSON.stringify({
          type: 'join',
          id: profile.id,
          name: profile.name,
          avatarUrl: profile.avatarUrl
        }));

        // Heartbeat to keep connection alive on serverless platforms (Cloud Run)
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Check if we haven't heard from the server in 25 seconds (stale connection)
            if (Date.now() - lastMessageTime > 25000) {
              console.warn('No server response for 25s (stale/half-open). Closing and reconnecting...');
              try {
                ws.close();
              } catch (e) {
                // ignore
              }
              return;
            }
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 10000);
      };

      ws.onmessage = (event) => {
        lastMessageTime = Date.now();
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'lobby_update':
              setLobbyPlayers(data.players);
              break;

            case 'challenged':
              // Avoid receiving multiple of the same challenge
              setActiveChallenges((prev) => {
                if (prev.some((c) => c.id === data.challenge.id)) return prev;
                return [
                  ...prev,
                  {
                    id: data.challenge.id,
                    challenger: { id: data.challenge.challengerId, name: data.challenge.challengerName },
                    challenged: { id: profile.id, name: profile.name },
                    wordLength: data.challenge.wordLength,
                    status: 'pending'
                  }
                ];
              });
              showToast(`${data.challenge.challengerName} sana meydan okudu!`, 'info');
              break;

            case 'challenge_declined':
              showToast(`${data.challengedName} meydan okumanı reddetti.`, 'error');
              break;

            case 'match_start': {
              const { matchId, targetWord: sharedWord, wordLength: len, opponentId, opponentName } = data;
              showToast(`Maç Başladı! Rakip: ${opponentName}`, 'success');
              
              // Transition to match state
              setWordLength(len);
              setTargetWord(sharedWord);
              setAttempts([]);
              setCurrentAttempt('');
              setGameStatus('playing');
              setSecondsLeft(20);
              setWordDefinition('');
              setLetterStatuses({});
              setShowLobbyModal(false);
              setMatchmakingStatus('idle');
              setHasEnteredGame(true);

              // Set active match reference
              setActiveMatch({
                id: matchId,
                wordLength: len,
                targetWord: sharedWord,
                players: {
                  [profile.id]: {
                    name: profile.name,
                    attempts: [],
                    currentAttempt: 0,
                    completed: false,
                    timeRemaining: 20,
                    score: 0,
                    won: false
                  },
                  [opponentId]: {
                    name: opponentName,
                    attempts: [],
                    currentAttempt: 0,
                    completed: false,
                    timeRemaining: 20,
                    score: 0,
                    won: false
                  }
                },
                status: 'playing'
              });
              break;
            }

            case 'match_update': {
              const { playerUpdate } = data;
              setActiveMatch((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  players: {
                    ...prev.players,
                    [playerUpdate.id]: {
                      ...prev.players[playerUpdate.id],
                      attempts: playerUpdate.attempts,
                      currentAttempt: playerUpdate.currentAttempt,
                      completed: playerUpdate.completed,
                      won: playerUpdate.won,
                      score: playerUpdate.score,
                      timeRemaining: playerUpdate.timeRemaining
                    }
                  }
                };
              });
              break;
            }

            case 'opponent_left':
              showToast('Rakip oyundan ayrıldı!', 'error');
              setGameStatus('won'); // Automatically win if opponent flees
              setActiveMatch(null);
              break;

            case 'match_end': {
              const { winnerId, players: finalPlayers } = data;
              setActiveMatch((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  status: 'ended',
                  winnerId
                };
              });

              if (winnerId === profile.id) {
                showToast('TEBRİKLER! Savaşı Kazandın!', 'success');
                // Award Gladiator Badge
                unlockBadge('gladiator');
                updateDailyScore(200);
              } else if (winnerId === 'draw') {
                showToast('Maç berabere bitti!', 'info');
                updateDailyScore(50);
              } else {
                showToast('Maçı rakibin kazandı. Daha hızlı olmalısın!', 'error');
              }
              break;
            }

            case 'matchmaking_status': {
              setMatchmakingStatus(data.status);
              if (data.status === 'queued') {
                showToast('Eşleşme aranıyor... Lütfen bekleyin.', 'info');
              } else if (data.status === 'idle') {
                showToast('Eşleşme kuyruğundan çıkıldı.', 'info');
              }
              break;
            }
          }
        } catch (e) {
          console.error('Error handling websocket message:', e);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        clearTimeout(connTimeout);
        if (pingInterval) clearInterval(pingInterval);
        
        if (socketRef.current === ws) {
          setIsOnline(false);
          socketRef.current = null;
          
          // Prevent infinite reconnect fights between multiple tabs/windows of the same user ID
          if (event && event.code === 1000 && event.reason === 'Replaced by new connection') {
            console.warn('Connection closed because it was replaced by another active session/tab. Disabling auto-reconnect.');
            showToast('Bağlantı başka bir sekme tarafından devralındı.', 'info');
            return;
          }

          // Attempt reconnect after 3 seconds
          if (!isDisposed) {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectWS, 3000);
          }
        }
      };

      ws.onerror = (err) => {
        clearTimeout(connTimeout);
        console.error(`WebSocket connection error to URL: ${wsUrl}`, err);
        if (socketRef.current === ws) {
          setIsOnline(false);
          try {
            ws.close(); // Guarantees triggering onclose and scheduling reconnect
          } catch (e) {
            // ignore
          }
        }
      };
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socketRef.current || (socketRef.current.readyState !== WebSocket.OPEN && socketRef.current.readyState !== WebSocket.CONNECTING)) {
          console.log('App returned to foreground. Reconnecting WebSocket...');
          if (socketRef.current) {
            try { socketRef.current.close(); } catch (e) {}
          }
          connectWS();
        }
      }
    };

    const handleOnline = () => {
      if (!socketRef.current || (socketRef.current.readyState !== WebSocket.OPEN && socketRef.current.readyState !== WebSocket.CONNECTING)) {
        console.log('Network connection restored. Reconnecting WebSocket...');
        if (socketRef.current) {
          try { socketRef.current.close(); } catch (e) {}
        }
        connectWS();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    connectWS();

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [profile.id, reconnectCounter]);

  // Synchronize profile changes (name/avatar) on the existing WebSocket connection
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'join',
        id: profile.id,
        name: profile.name,
        avatarUrl: profile.avatarUrl
      }));
    }
  }, [profile.id, profile.name, profile.avatarUrl]);

  // Synchronize game updates to WebSocket if in active match
  const syncMatchState = (
    updatedAttempts: GameAttempt[],
    currAttemptNum: number,
    completed: boolean,
    won: boolean,
    score: number
  ) => {
    if (activeMatch && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'game_update',
        matchId: activeMatch.id,
        attempts: updatedAttempts,
        currentAttempt: currAttemptNum,
        completed,
        won,
        score,
        timeRemaining: secondsLeft
      }));
    }
  };

  // Start a new solo game
  const startNewGame = async (length: number = wordLength) => {
    setIsValidating(true);
    setAttempts([]);
    setCurrentAttempt('');
    setGameStatus('playing');
    setSecondsLeft(20);
    setWordDefinition('');
    setLetterStatuses({});
    setWordLength(length);
    setActiveMatch(null); // Clear any active multiplayer match

    let picked = '';
    try {
      const response = await fetch(getApiUrl('/api/random-word'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length })
      });
      const data = await response.json();
      if (data.word) {
        picked = turkishUpper(data.word);
      } else {
        picked = getRandomWord(length);
      }
    } catch (e) {
      console.error('Failed to retrieve random word from server', e);
      picked = getRandomWord(length);
    } finally {
      setTargetWord(picked);
      if (gameMode === 'timed' && picked) {
        setCurrentAttempt(picked[0]);
      } else {
        setCurrentAttempt('');
      }
      setIsValidating(false);
    }
  };

  // Clean up and reset game state when leaving the game screen
  useEffect(() => {
    if (!hasEnteredGame) {
      setGameStatus('idle');
      setAttempts([]);
      setCurrentAttempt('');
      setSecondsLeft(20);
    }
  }, [hasEnteredGame]);

  // Trigger game start automatically when word length, gameMode or entering solo game changes
  useEffect(() => {
    if (hasEnteredGame && !activeMatch) {
      startNewGame(wordLength);
    }
  }, [wordLength, gameMode, hasEnteredGame, activeMatch]);

  // Countdown timer logic
  useEffect(() => {
    if (gameStatus !== 'playing' || isValidating || !hasEnteredGame || gameMode === 'untimed') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time expired - lose game
          clearInterval(timerRef.current!);
          handleGameLoss('Süre Sınırı Aşıldı');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus, attempts.length, isValidating, hasEnteredGame, gameMode]); // Resets interval on attempt submission or validation change or exit or gameMode change

  // Handle Game Loss
  const handleGameLoss = async (reason: string = 'Hakkınız Bitti') => {
    setGameStatus('lost');
    showToast(`Oyunu Kaybettiniz: ${reason}! Doğru Kelime: ${targetWord}`, 'error');
    playDefeatSound(settings.soundEnabled);
    
    // Fetch definition for targetWord so the user can learn its meaning even on loss!
    if (dictionaryMode !== 'no_validation' && targetWord) {
      try {
        const response = await fetch(getApiUrl('/api/validate-word'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: targetWord, length: wordLength })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.definition) {
            setWordDefinition(data.definition);
          }
        }
      } catch (e) {
        console.error('Failed to fetch target word definition on loss', e);
      }
    }

    // Increment gamesPlayed and reset streak
    setProfile((prev) => {
      const newStats = {
        ...prev.stats,
        gamesPlayed: prev.stats.gamesPlayed + 1,
        currentStreak: 0
      };
      return {
        ...prev,
        stats: newStats,
        lastUpdated: new Date().toISOString()
      };
    });

    // Check first step badge
    unlockBadge('first_step');

    // Sync if multiplayer
    syncMatchState(attempts, attempts.length, true, false, 0);
  };

  // Wordle/Lingo Feedback generator
  const evaluateGuess = (guess: string, target: string): ('green' | 'orange' | 'grey')[] => {
    const cleanGuess = turkishUpper(guess);
    const cleanTarget = turkishUpper(target);
    const len = cleanGuess.length;
    const targetLetters = cleanTarget.substring(0, len).split('');
    const guessLetters = cleanGuess.split('');
    const feedback: ('green' | 'orange' | 'grey')[] = Array(len).fill('grey');
    const used = Array(len).fill(false);

    // First pass: mark greens
    for (let i = 0; i < len; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        feedback[i] = 'green';
        used[i] = true;
      }
    }

    // Second pass: mark oranges
    for (let i = 0; i < len; i++) {
      if (feedback[i] === 'green') continue;
      for (let j = 0; j < len; j++) {
        if (!used[j] && targetLetters[j] === guessLetters[i]) {
          feedback[i] = 'orange';
          used[j] = true;
          break;
        }
      }
    }

    return feedback;
  };

  // Submit Guessed Word
  const submitGuess = async () => {
    if (currentAttempt.length !== wordLength) {
      showToast('Lütfen tüm harfleri doldurun!', 'error');
      playErrorSound(settings.soundEnabled);
      return;
    }

    setIsValidating(true);
    const guess = turkishUpper(currentAttempt);

    try {
      let isValid = false;
      let definition = '';

      if (dictionaryMode === 'no_validation') {
        isValid = true;
        definition = 'Doğrulama dışı serbest oyun modu.';
      } else {
        // TDK Online validation
        try {
          const response = await fetch(getApiUrl('/api/validate-word'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: guess, length: wordLength })
          });
          if (response.ok) {
            const data = await response.json();
            isValid = data.valid;
            definition = data.definition || '';
          } else {
            throw new Error('Server returned non-ok status');
          }
        } catch (fetchErr) {
          console.warn('TDK API validation failed, falling back to offline list:', fetchErr);
          isValid = isWordInCuratedList(guess, wordLength);
          if (isValid) {
            definition = 'TDK API bağlantısı kurulamadı. Çevrimdışı sözlük doğrulaması uygulandı.';
            showToast('İnternet bağlantı hatası: Kelime çevrimdışı sözlükle doğrulandı.', 'info');
          } else {
            definition = 'TDK API bağlantı hatası ve kelime çevrimdışı sözlükte de bulunamadı!';
          }
        }
      }

      if (!isValid) {
        showToast(definition || 'Bu kelime sözlükte bulunamadı!', 'error');
        playErrorSound(settings.soundEnabled);
        setIsValidating(false);
        return;
      }

      // Valid word! Submit and check results
      const feedback = evaluateGuess(guess, targetWord);
      const newAttempt: GameAttempt = { word: guess, feedback };
      const updatedAttempts = [...attempts, newAttempt];
      
      // Update local keyboard character coloring
      const newLetterStatuses = { ...letterStatuses };
      guess.split('').forEach((char, index) => {
        const color = feedback[index];
        const prevColor = newLetterStatuses[char];
        if (color === 'green') {
          newLetterStatuses[char] = 'green';
        } else if (color === 'orange' && prevColor !== 'green') {
          newLetterStatuses[char] = 'orange';
        } else if (color === 'grey' && !prevColor) {
          newLetterStatuses[char] = 'grey';
        }
      });
      setLetterStatuses(newLetterStatuses);
      setAttempts(updatedAttempts);
      if (gameMode === 'timed' && !activeMatch && targetWord) {
        setCurrentAttempt(targetWord[0]);
      } else {
        setCurrentAttempt('');
      }

      // Check if won
      const hasWon = feedback.every((f) => f === 'green');
      const scoreAwarded = hasWon ? Math.max(100 + secondsLeft * 5 - updatedAttempts.length * 10, 50) : 0;

      if (hasWon) {
        setGameStatus('won');
        setWordDefinition(definition || 'Kelime başarılı bir şekilde çözüldü.');
        showToast(`TEBRİKLER! Kelimeyi doğru bildiniz! +${scoreAwarded} Puan`, 'success');
        triggerVictoryCelebration(settings.soundEnabled);
        
        // Update user statistics & milestones
        handleGameWin(updatedAttempts.length, scoreAwarded);
      } else if (updatedAttempts.length >= 6) {
        handleGameLoss();
      } else {
        // Continue playing, reset timer back to 20s
        setSecondsLeft(20);
        showToast('Deneme kabul edildi. Süre sıfırlandı!', 'success');
        playEnterSound(settings.soundEnabled);
      }

      // Sync state if in real-time battle
      syncMatchState(updatedAttempts, updatedAttempts.length, hasWon || updatedAttempts.length >= 6, hasWon, scoreAwarded);

    } catch (e) {
      console.error('Failed to validate word', e);
      showToast('Sunucu bağlantı hatası oluştu.', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  // Handle Game Win
  const handleGameWin = (attemptCount: number, scoreAwarded: number) => {
    setProfile((prev) => {
      const newPlayed = prev.stats.gamesPlayed + 1;
      const newWon = prev.stats.gamesWon + 1;
      const newStreak = prev.stats.currentStreak + 1;
      const newMaxStreak = Math.max(newStreak, prev.stats.maxStreak);
      const newDistribution = [...prev.stats.winDistribution];
      
      // AttemptCount is 1-indexed (index 0 corresponds to 1st attempt)
      if (attemptCount >= 1 && attemptCount <= 6) {
        newDistribution[attemptCount - 1] += 1;
      }

      const updatedStats = {
        gamesPlayed: newPlayed,
        gamesWon: newWon,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        winDistribution: newDistribution
      };

      return {
        ...prev,
        stats: updatedStats,
        dailyScore: prev.dailyScore + scoreAwarded,
        lastUpdated: new Date().toISOString()
      };
    });

    // Check badges
    unlockBadge('first_step');
    unlockBadge('champion');
    
    if (secondsLeft > 10) {
      unlockBadge('lightning');
      updateMissionProgress('fast_solve', 1);
    }

    if (attemptCount <= 2) {
      unlockBadge('flawless');
    }

    if (wordLength === 8) {
      unlockBadge('genius');
    }

    // Update Missions
    updateMissionProgress('play', 1);
    updateMissionProgress('win', 1);
    updateMissionProgress('streak', 1);
    
    // Dynamic word-length specific solving missions (solve_3 to solve_8)
    updateMissionProgress(`solve_${wordLength}`, 1);

    // Perfect solve mission (solving in exactly 1 try)
    if (attemptCount === 1) {
      updateMissionProgress('perfect', 1);
    }
  };

  // Profile Badges unlocking
  const unlockBadge = (id: string) => {
    setProfile((prev) => {
      const badges = prev.badges.map((b) => {
        if (b.id === id && !b.unlockedAt) {
          showToast(`🏆 YENİ ROZET KAZANILDI: ${b.title}!`, 'success');
          return { ...b, unlockedAt: new Date().toISOString() };
        }
        return b;
      });
      return { ...prev, badges };
    });
  };

  // Update Mission Progress
  const updateMissionProgress = (type: string, amount: number) => {
    setProfile((prev) => {
      const missions = prev.missions.map((m) => {
        if (m.type === type && !m.completed) {
          const newCurrent = m.current + amount;
          const isCompleted = newCurrent >= m.target;
          if (isCompleted) {
            showToast(`🎯 GÜNLÜK GÖREV TAMAMLANDI: ${m.title}!`, 'success');
          }
          return {
            ...m,
            current: newCurrent,
            completed: isCompleted
          };
        }
        return m;
      });
      return { ...prev, missions };
    });
  };

  // Update Daily Score
  const updateDailyScore = (score: number) => {
    setProfile((prev) => ({
      ...prev,
      dailyScore: prev.dailyScore + score
    }));
  };

  // Reset User stats
  const resetStats = () => {
    if (confirm('Tüm ilerleme ve istatistiklerinizi sıfırlamak istediğinize emin misiniz?')) {
      setProfile((prev) => ({
        ...prev,
        stats: INITIAL_STATS,
        badges: DEFAULT_BADGES,
        missions: DEFAULT_MISSIONS,
        dailyScore: 0
      }));
      showToast('Tüm istatistikler sıfırlandı.', 'info');
    }
  };

  // Handle Character keys typed on physical or virtual keyboard
  const onChar = (char: string) => {
    if (gameStatus !== 'playing' || isValidating) return;
    const normalized = turkishUpper(char);
    if (currentAttempt.length < wordLength && /^[A-ZÇĞİÖŞÜ]$/i.test(normalized)) {
      setCurrentAttempt((prev) => prev + normalized);
      playClickSound(settings.soundEnabled);
    }
  };

  // Handle Backspace
  const onDelete = () => {
    if (gameStatus !== 'playing' || isValidating) return;
    if (gameMode === 'timed' && !activeMatch && currentAttempt.length <= 1) {
      // In solo timed mode, do not allow deleting the first letter hint
      return;
    }
    if (currentAttempt.length > 0) {
      playDeleteSound(settings.soundEnabled);
    }
    setCurrentAttempt((prev) => prev.slice(0, -1));
  };

  // Bind physical keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditingName || showStatsModal || showLobbyModal) return;

      if (e.key === 'Enter') {
        submitGuess();
      } else if (e.key === 'Backspace') {
        onDelete();
      } else {
        const key = turkishUpper(e.key);
        if (key.length === 1 && /^[A-ZÇĞİÖŞÜ]$/i.test(key)) {
          onChar(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAttempt, gameStatus, isValidating, isEditingName, showStatsModal, showLobbyModal]);

  // Handle profile change
  const saveProfile = () => {
    if (nameInput.trim().length === 0) return;
    setProfile((prev) => ({
      ...prev,
      name: nameInput.trim(),
      avatarUrl: avatarInput
    }));
    setIsEditingName(false);
    showToast('Profiliniz başarıyla güncellendi.', 'success');
  };

  // Handle Multiplayer Challenge Actions
  const handleChallengePlayer = (player: LobbyPlayer, length: number) => {
    if (!isOnline || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      showToast('Meydan okumak için sunucuya bağlı olmalısınız.', 'error');
      return;
    }
    socketRef.current.send(JSON.stringify({
      type: 'challenge',
      challengedId: player.id,
      wordLength: length
    }));
    showToast(`${player.name} oyuncusuna meydan okundu, yanıt bekleniyor...`, 'info');
  };

  const handleAcceptChallenge = (challengeId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'challenge_respond',
        challengeId,
        accept: true
      }));
      setActiveChallenges((prev) => prev.filter((c) => c.id !== challengeId));
    }
  };

  const handleDeclineChallenge = (challengeId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'challenge_respond',
        challengeId,
        accept: false
      }));
      setActiveChallenges((prev) => prev.filter((c) => c.id !== challengeId));
    }
  };

  const handleLeaveMatch = () => {
    if (activeMatch && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'leave_match',
        matchId: activeMatch.id
      }));
    }
    setActiveMatch(null);
    startNewGame(wordLength);
  };

  const handleStartMatchmaking = () => {
    if (!isOnline) {
      showToast('Kuyruğa girmek için sunucuya bağlı olmalısınız. Lütfen bekleyin veya çevrimdışı modu oynayın.', 'error');
      return;
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      if (matchmakingStatus === 'queued') {
        socketRef.current.send(JSON.stringify({
          type: 'leave_matchmaking'
        }));
        setMatchmakingStatus('idle');
      } else {
        socketRef.current.send(JSON.stringify({
          type: 'join_matchmaking',
          wordLength
        }));
      }
    }
  };

  const handleUpdateProfile = (name: string, avatarUrl?: string) => {
    setProfile((prev) => ({
      ...prev,
      name,
      avatarUrl
    }));
    setNameInput(name);
    setAvatarInput(avatarUrl);
    showToast('Profiliniz güncellendi.', 'success');
  };

  const getBgThemeClass = () => {
    switch (settings.bgTheme) {
      case 'sapphire':
        return 'bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 text-white';
      case 'forest':
        return 'bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-950 text-white';
      case 'amethyst':
        return 'bg-gradient-to-tr from-slate-950 via-purple-950 to-slate-900 text-white';
      case 'nord':
        return 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-850 text-slate-900 dark:text-slate-100';
      case 'default':
      default:
        return 'bg-gray-50 dark:bg-gray-950 text-gray-950 dark:text-gray-100';
    }
  };

  const opponent = activeMatch ? Object.values(activeMatch.players).find(p => (p as any).name !== profile.name) as any : null;

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${getBgThemeClass()}`}>
      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center py-2 sm:py-4 px-1.5 sm:px-4 max-w-5xl lg:max-w-6xl w-full mx-auto relative">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-20 z-50 left-1/2 transform -translate-x-1/2 px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm font-semibold shadow-lg transition duration-200 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-300'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-300'
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-300'
          }`}>
            <AlertCircle size={16} />
            <span>{toast.message}</span>
          </div>
        )}

        {isGroupRaceActive ? (
          <GroupRace
            profile={profile}
            onUpdateScore={(points) => {
              setProfile((prev) => ({
                ...prev,
                dailyScore: prev.dailyScore + points,
                lastUpdated: new Date().toISOString()
              }));
              updateMissionProgress('play', 1);
            }}
            onExit={() => setIsGroupRaceActive(false)}
            showToast={showToast}
            dictionaryMode={dictionaryMode}
          />
        ) : !hasEnteredGame ? (
          <WelcomeScreen
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            dictionaryMode={dictionaryMode}
            onChangeDictionaryMode={setDictionaryMode}
            gameMode={gameMode}
            onChangeGameMode={setGameMode}
            wordLength={wordLength}
            onChangeWordLength={setWordLength}
            onStartSoloGame={() => {
              setHasEnteredGame(true);
            }}
            onStartMatchmaking={handleStartMatchmaking}
            onOpenLobby={() => setShowLobbyModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenMissions={() => setShowMissionsModal(true)}
            onOpenStats={() => setShowStatsModal(true)}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            matchmakingStatus={matchmakingStatus}
            isOnline={isOnline}
            onReconnect={handleManualReconnect}
            lobbyPlayers={lobbyPlayers}
            activeChallenges={activeChallenges}
            onChallenge={handleChallengePlayer}
            onAcceptChallenge={handleAcceptChallenge}
            onDeclineChallenge={handleDeclineChallenge}
            onStartGroupRace={() => setIsGroupRaceActive(true)}
          />
        ) : (
          <>
            {/* Back to entry screen header */}
            {!activeMatch && (
              <div className="w-full max-w-3xl lg:max-w-4xl flex justify-between items-center mb-3">
                <button
                  onClick={() => {
                    if (gameStatus === 'playing' && attempts.length > 0 && !confirm('Mevcut oyundan çıkıp giriş ekranına dönmek istiyor musunuz?')) {
                      return;
                    }
                    setHasEnteredGame(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-emerald-500 dark:text-gray-300 dark:hover:text-emerald-400 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 rounded-xl shadow-sm hover:shadow transition duration-150 active:scale-[0.97]"
                >
                  <ArrowLeft size={16} className="stroke-[2.5]" />
                  <span>Giriş Ekranına Dön</span>
                </button>

                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-gray-100/70 dark:bg-gray-800/60 px-3 py-2 rounded-xl border border-gray-200/40 dark:border-gray-850">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span>{gameMode === 'timed' ? 'Süreli Oyun' : 'Süresiz Oyun'}</span>
                </div>
              </div>
            )}

            {/* Real-time Match Split View Banner */}
        {activeMatch && (
          <div className="w-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <Swords size={24} className="text-emerald-500" />
              <div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-white">Kelime Savaşı Sürüyor!</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Her iki oyuncu da aynı {wordLength} harfli kelimeyi çözüyor. En az deneme ile en hızlı çözen kazanır!
                </p>
              </div>
            </div>

            {/* Scoreboard Split */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2.5 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                {profile.avatarUrl ? (
                  <span className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500 flex items-center justify-center bg-gray-200 dark:bg-gray-700 font-bold shrink-0">
                    {profile.avatarUrl.length < 4 ? (
                      <span className="text-base leading-none">{profile.avatarUrl}</span>
                    ) : (
                      <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </span>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <span className="text-[10px] text-gray-400 font-bold block">SEN</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{attempts.length} Deneme</span>
                </div>
              </div>

              <div className="text-lg font-bold text-gray-300 font-sans">VS</div>

              <div className="flex items-center gap-2.5 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                {opponent?.avatarUrl ? (
                  <span className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500 flex items-center justify-center bg-gray-200 dark:bg-gray-700 font-bold shrink-0">
                    {opponent.avatarUrl.length < 4 ? (
                      <span className="text-base leading-none">{opponent.avatarUrl}</span>
                    ) : (
                      <img src={opponent.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </span>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {opponent?.name ? opponent.name.charAt(0).toUpperCase() : 'R'}
                  </div>
                )}
                <div className="text-left">
                  <span className="text-[10px] text-gray-400 font-bold block truncate max-w-[80px]">{opponent?.name?.toUpperCase() || 'RAKİP'}</span>
                  <span className="text-sm font-bold text-amber-500">
                    {opponent?.attempts?.length || 0} Deneme
                  </span>
                </div>
              </div>

              <button
                onClick={handleLeaveMatch}
                className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-2 rounded-xl"
              >
                Maçtan Çık
              </button>
            </div>
          </div>
        )}

        {/* Game State Control Panel (Length selector / Reset) */}
        {!activeMatch && (
          <div className="w-full max-w-3xl lg:max-w-4xl flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Harf Sayısı:</span>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                {[3, 4, 5, 6, 7, 8].map((len) => (
                  <button
                    key={len}
                    onClick={() => {
                      if (gameStatus === 'playing' && attempts.length > 0 && !confirm('Mevcut oyunu sıfırlamak istiyor musunuz?')) {
                        return;
                      }
                      setWordLength(len);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      wordLength === len
                        ? 'bg-emerald-500 text-white shadow'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (gameStatus === 'playing' && attempts.length > 0 && !confirm('Oyunu yeniden başlatmak istiyor musunuz?')) return;
                startNewGame(wordLength);
              }}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-500 transition duration-150 flex items-center gap-1 text-xs font-semibold"
              title="Yeni Kelime Al"
            >
              <RotateCcw size={16} />
              Yenile
            </button>
          </div>
        )}

        {/* Game Area Card */}
        <div className="w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col items-center justify-center transition-all duration-200">
          {/* Top Timer & Attempts Tracker */}
          <div className="w-full flex justify-between items-center mb-4 px-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            {gameStatus === 'playing' ? (
              <>
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 font-mono">
                    Deneme: {attempts.length}/6
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {gameMode === 'timed' ? (
                    <>
                      <Hourglass size={16} className={`animate-spin ${secondsLeft <= 5 ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <div className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg border ${
                        secondsLeft <= 5
                          ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-400 animate-pulse'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400'
                      }`}>
                        {secondsLeft} sn
                      </div>
                    </>
                  ) : (
                    <>
                      <Hourglass size={16} className="text-emerald-500 animate-pulse" />
                      <div className="text-xs font-extrabold font-mono px-2.5 py-1 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400">
                        Süresiz ♾️
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full flex justify-center py-0.5 animate-scale-up">
                <span className={`text-xs font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-full border ${
                  gameStatus === 'won'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400'
                    : gameStatus === 'lost'
                    ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900/40 dark:border-slate-805'
                }`}>
                  {gameStatus === 'won' ? '🎉 TEBRİKLER! KAZANDINIZ' : gameStatus === 'lost' ? '💥 SÜRE BİTTİ / ELENDİNİZ' : 'HAZIR'}
                </span>
              </div>
            )}
          </div>

          {/* Game Hint or Mode Banner */}
          {gameMode === 'timed' && gameStatus === 'playing' && !activeMatch && targetWord && (
            <div className="w-full max-w-md mb-4 px-3.5 py-2.5 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 font-mono animate-fade-in shadow-xs">
              <Sparkles size={14} className="animate-pulse text-yellow-500" />
              <span>İPUCU: Kelime <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-sm font-black mx-1 inline-block shadow-sm shadow-emerald-500/20">{targetWord[0]}</span> harfi ile başlıyor!</span>
            </div>
          )}

          {/* Letter Grid */}
          <GameBoard
            attempts={attempts}
            currentAttempt={currentAttempt}
            wordLength={wordLength}
            boardTheme={settings.boardTheme}
          />

          {/* Victory Celebration Showcase (Zafer Gösterisi) */}
          {gameStatus === 'won' && (
            <div className="w-full max-w-lg mt-4 bg-gradient-to-b from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/5 border border-emerald-500/20 dark:border-emerald-500/10 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden animate-scale-up" id="victory-celebration-container">
              {/* Spinning background fireworks glow */}
              <div className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20 flex items-center justify-center">
                <div className="w-72 h-72 rounded-full border-4 border-dashed border-emerald-400 animate-rotate-slow" />
                <div className="absolute w-56 h-56 rounded-full border-2 border-dotted border-teal-400 animate-rotate-slow" style={{ animationDirection: 'reverse' }} />
              </div>

              {/* Celebration Layout with Side Torches (Meşaleler) */}
              <div className="flex justify-between items-center gap-4 relative z-10">
                {/* Left Torch */}
                <div className="hidden sm:block shrink-0 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="relative w-12 h-24 flex flex-col items-center">
                    {/* Rising Sparks */}
                    <div className="absolute -top-10 w-8 h-10 overflow-hidden pointer-events-none">
                      <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-amber-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0s' }} />
                      <div className="absolute bottom-1 left-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.4s' }} />
                      <div className="absolute bottom-0 left-2/3 w-1 h-1 bg-yellow-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.8s' }} />
                    </div>
                    {/* Multilayered Fire */}
                    <div className="relative w-7 h-9 -mb-1 animate-pulse-glow">
                      <div className="absolute inset-x-0 bottom-0 mx-auto w-7 h-9 bg-gradient-to-t from-red-600 via-orange-500 to-transparent rounded-b-full rounded-t-2xl opacity-50 blur-[2px] animate-flicker" />
                      <div className="absolute inset-x-0.5 bottom-0 mx-auto w-5 h-7 bg-gradient-to-t from-red-500 via-amber-400 to-transparent rounded-b-full rounded-t-xl opacity-90 animate-flicker" style={{ animationDuration: '0.14s' }} />
                      <div className="absolute inset-x-1.5 bottom-0.5 mx-auto w-2.5 h-4 bg-gradient-to-t from-yellow-300 to-white rounded-b-full rounded-t-md opacity-100 animate-flicker" style={{ animationDuration: '0.09s' }} />
                    </div>
                    {/* Torch Top Cup */}
                    <div className="w-5 h-4 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 rounded-t-xs rounded-b-md shadow-md border-t border-yellow-300" />
                    {/* Handle */}
                    <div className="w-1.5 h-10 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-600 rounded-b-full shadow" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 text-center space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-center items-center gap-1.5 text-emerald-500">
                      <Sparkles className="animate-spin text-yellow-500" size={18} style={{ animationDuration: '4s' }} />
                      <span className="text-xs font-black uppercase tracking-widest font-mono text-emerald-600 dark:text-emerald-400">ZAFER KAZANILDI</span>
                      <Sparkles className="animate-bounce text-yellow-500" size={18} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                      Kelimelerin Efendisi! 🎉
                    </h3>
                  </div>

                  <div className="py-2.5 px-4 bg-white/70 dark:bg-gray-950/40 rounded-2xl border border-emerald-500/10 shadow-inner inline-block mx-auto">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">Bulunan Kelime</p>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
                      {targetWord}
                    </span>
                  </div>

                  {wordDefinition && (
                    <div className="bg-white/50 dark:bg-gray-950/20 rounded-xl p-3.5 border border-emerald-500/5 text-left max-w-sm mx-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono block mb-1">
                        TDK SÖZLÜK ANLAMI
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic font-sans leading-relaxed">
                        "{wordDefinition}"
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-2.5">
                    <button
                      onClick={() => startNewGame(wordLength)}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition active:scale-95 flex items-center justify-center gap-2"
                      id="victory-retry-button"
                    >
                      <RotateCcw size={15} />
                      <span>YENİ SAVAŞA BAŞLA</span>
                    </button>
                  </div>
                </div>

                {/* Right Torch */}
                <div className="hidden sm:block shrink-0 animate-bounce animate-delay-150" style={{ animationDuration: '3s', animationDelay: '0.3s' }}>
                  <div className="relative w-12 h-24 flex flex-col items-center">
                    {/* Rising Sparks */}
                    <div className="absolute -top-10 w-8 h-10 overflow-hidden pointer-events-none">
                      <div className="absolute bottom-0 left-1/4 w-1.5 h-1.5 bg-amber-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.2s' }} />
                      <div className="absolute bottom-1 left-1/2 w-1 h-1 bg-orange-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.6s' }} />
                      <div className="absolute bottom-0 left-2/3 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-float-up-slow" style={{ animationDelay: '1s' }} />
                    </div>
                    {/* Multilayered Fire */}
                    <div className="relative w-7 h-9 -mb-1 animate-pulse-glow">
                      <div className="absolute inset-x-0 bottom-0 mx-auto w-7 h-9 bg-gradient-to-t from-red-600 via-orange-500 to-transparent rounded-b-full rounded-t-2xl opacity-50 blur-[2px] animate-flicker" style={{ animationDelay: '0.05s' }} />
                      <div className="absolute inset-x-0.5 bottom-0 mx-auto w-5 h-7 bg-gradient-to-t from-red-500 via-amber-400 to-transparent rounded-b-full rounded-t-xl opacity-90 animate-flicker" style={{ animationDuration: '0.14s', animationDelay: '0.05s' }} />
                      <div className="absolute inset-x-1.5 bottom-0.5 mx-auto w-2.5 h-4 bg-gradient-to-t from-yellow-300 to-white rounded-b-full rounded-t-md opacity-100 animate-flicker" style={{ animationDuration: '0.09s', animationDelay: '0.05s' }} />
                    </div>
                    {/* Torch Top Cup */}
                    <div className="w-5 h-4 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 rounded-t-xs rounded-b-md shadow-md border-t border-yellow-300" />
                    {/* Handle */}
                    <div className="w-1.5 h-10 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-600 rounded-b-full shadow" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standard Game Over (Loss) Screen */}
          {gameStatus === 'lost' && (
            <div className="w-full text-center py-6 space-y-4 max-w-sm animate-scale-up" id="game-over-loss-container">
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-rose-500 uppercase tracking-widest font-mono">DENEME HAKKI VEYA SÜRE BİTTİ</p>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Aradığınız kelime şuydu:</h4>
                <strong className="text-2xl text-rose-500 tracking-wider font-extrabold block uppercase">{targetWord}</strong>
              </div>

              {wordDefinition && (
                <div className="p-4 bg-white/70 dark:bg-gray-950/40 rounded-2xl border border-rose-500/15 shadow-inner text-left animate-fade-in">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono block mb-1">
                    TDK SÖZLÜK ANLAMI
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic font-sans leading-relaxed">
                    "{wordDefinition}"
                  </p>
                </div>
              )}

              <button
                onClick={() => startNewGame(wordLength)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/20 text-xs sm:text-sm active:scale-95 transition"
                id="loss-retry-button"
              >
                Yeni Kelime ile Başla
              </button>
            </div>
          )}

          {/* Loading validation block */}
          {isValidating && (
            <div className="text-xs text-gray-400 dark:text-gray-500 animate-pulse font-mono flex items-center gap-1.5 py-1">
              <RotateCcw className="animate-spin" size={12} />
              Sözlük doğrulaması yapılıyor...
            </div>
          )}

          {/* Action Button Above Keyboard */}
          {gameStatus === 'playing' && (
            <div className="w-full max-w-2xl lg:max-w-3xl px-2 mt-4 mb-3">
              <button
                onClick={submitGuess}
                disabled={currentAttempt.length !== wordLength || isValidating}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wider shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border ${
                  currentAttempt.length === wordLength && !isValidating
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 hover:shadow-emerald-500/20 active:scale-[0.98]'
                    : 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                }`}
                id="submit-guess-button-above-keyboard"
              >
                {isValidating ? (
                  <>
                    <RotateCcw className="animate-spin" size={16} />
                    DOĞRULANIYOR...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className={currentAttempt.length === wordLength ? "animate-bounce" : ""} />
                    TAMAM (DENE)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Virtual Keyboard */}
          <Keyboard
            onChar={onChar}
            onDelete={onDelete}
            onEnter={submitGuess}
            letterStatuses={letterStatuses}
            keyboardLayout={settings.keyboardLayout}
            boardTheme={settings.boardTheme}
          />
        </div>


      </>
    )}
  </main>

      {/* Name/Profile Editing Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-100 dark:border-gray-800 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]" id="edit-profile-modal">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profilini Düzenle</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Arkadaşlarının seni rekabet listesinde görebilmesi için ismini ve profil resmini güncelle.
                </p>
              </div>
              <button
                onClick={() => setIsEditingName(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Avatar Preview & Reset */}
            <div className="flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/60">
              <div className="relative">
                {avatarInput ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg">
                    {avatarInput.length < 4 ? (
                      <span className="text-4xl select-none">{avatarInput}</span>
                    ) : (
                      <img src={avatarInput} alt="Avatar önizleme" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-500 text-white font-bold text-3xl flex items-center justify-center shadow-lg">
                    {nameInput ? nameInput.charAt(0).toUpperCase() : 'O'}
                  </div>
                )}
                {avatarInput && (
                  <button
                    onClick={() => setAvatarInput(undefined)}
                    className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition"
                    title="Resmi Kaldır"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500">Profil Resmi Önizlemesi</span>
            </div>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Takma Adınız</label>
              <input
                type="text"
                maxLength={15}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Takma adınızı girin..."
              />
            </div>

            {/* Preset Avatar Emojis */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Hızlı Emoji Seç</label>
              <div className="grid grid-cols-6 gap-2">
                {['🐱', '🦊', '🐼', '🦁', '🐸', '🐨', '🦄', '🦉', '🦖', '🐝', '🎨', '🚀'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setAvatarInput(emoji)}
                    className={`text-2xl p-2 rounded-xl transition duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      avatarInput === emoji ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500' : 'bg-gray-50 dark:bg-gray-950/30'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom File Upload with Drag & Drop */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Kendi Resmini Yükle</label>
              
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result && typeof ev.target.result === 'string') {
                          setAvatarInput(ev.target.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    } else {
                      showToast('Lütfen geçerli bir resim dosyası sürükleyin.', 'error');
                    }
                  }
                }}
                onClick={() => document.getElementById('avatar-file-upload')?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition duration-150 flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-950/10 hover:bg-gray-50 dark:hover:bg-gray-950/20'
                }`}
              >
                <input
                  type="file"
                  id="avatar-file-upload"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result && typeof ev.target.result === 'string') {
                            setAvatarInput(ev.target.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      } else {
                        showToast('Lütfen geçerli bir resim dosyası seçin.', 'error');
                      }
                    }
                  }}
                  className="hidden"
                />
                <Upload size={20} className={isDragging ? 'text-emerald-500 animate-bounce' : 'text-gray-400 dark:text-gray-500'} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Resim seçmek için tıkla veya sürükle</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">PNG, JPG veya GIF desteklenir</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setIsEditingName(false)}
                className="px-4 py-2.5 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition font-semibold"
              >
                İptal
              </button>
              <button
                onClick={saveProfile}
                disabled={nameInput.trim().length === 0}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
                  nameInput.trim().length > 0
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-emerald-500/10'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                Profili Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lobby Modal */}
      {showLobbyModal && (
        <Lobby
          players={lobbyPlayers}
          activeChallenges={activeChallenges}
          onChallenge={handleChallengePlayer}
          onAcceptChallenge={handleAcceptChallenge}
          onDeclineChallenge={handleDeclineChallenge}
          selfId={profile.id}
          onClose={() => setShowLobbyModal(false)}
        />
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <StatsModal
          profile={profile}
          onClose={() => setShowStatsModal(false)}
          onResetStats={resetStats}
        />
      )}

      {/* Missions Modal */}
      {showMissionsModal && (
        <MissionsModal
          profile={profile}
          onClose={() => setShowMissionsModal(false)}
          onStartWordGame={(length) => {
            setWordLength(length);
            setHasEnteredGame(true);
            startNewGame(length);
            setShowMissionsModal(false);
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onChangeSettings={setSettings}
          onClose={() => {
            setShowSettingsModal(false);
            handleManualReconnect();
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onOpenStats={() => setShowStatsModal(true)}
        />
      )}
    </div>
  );
}
