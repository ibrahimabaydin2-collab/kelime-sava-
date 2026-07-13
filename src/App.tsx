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
import AuthScreen from './components/AuthScreen.js';
import { auth, onAuthStateChanged, fetchUserProfile, saveUserProfileToFirestore } from './lib/firebase.js';
import { UserProfile, GameAttempt, LobbyPlayer, Challenge, RealtimeMatch, DailyMission, Badge } from './types.js';
import { Swords, RotateCcw, AlertCircle, HelpCircle, Trophy, UserCheck, Flame, Hourglass, HelpCircle as HelpIcon, Sparkles, Upload, Trash2, Image, X, ArrowLeft, Info } from 'lucide-react';
import { getRandomWord, isWordInCuratedList } from './data/wordlist.js';
import { turkishUpper, turkishLower, validateTurkishLinguistics } from './utils/turkish.js';
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

  // Capacitor Deep Link Listener (Supports both cold-start and warm-start)
  useEffect(() => {
    let isSubscribed = true;
    
    const handleDeepLinkUrl = (urlStr: string) => {
      try {
        console.log('Processing deep link URL:', urlStr);
        // Convert custom scheme to standard HTTPS scheme for seamless and reliable URL parsing
        let cleanUrl = urlStr;
        if (cleanUrl.startsWith('kelimesavasi://')) {
          cleanUrl = cleanUrl.replace('kelimesavasi://', 'https://');
        }
        
        const parsedUrl = new URL(cleanUrl);
        const token = parsedUrl.searchParams.get('token');
        const server = parsedUrl.searchParams.get('server');
        
        if (token) {
          window.localStorage.setItem('aistudio_auth_token', token);
          window.sessionStorage.setItem('aistudio_auth_token', token);
          console.log('Deep link token stored successfully:', token.substring(0, 10) + '...');
        }
        if (server) {
          window.localStorage.setItem('kelimesavasi_server_type', server);
          console.log('Deep link server type stored successfully:', server);
        }
        
        if (token || server) {
          // Force reload to instantly reinitialize connections with new parameters
          setTimeout(() => {
            if (isSubscribed) {
              window.location.reload();
            }
          }, 300);
        }
      } catch (e) {
        console.error('Failed to process deep link URL:', e);
      }
    };

    const setupDeepLink = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        
        // 1. Handle COLD-START deep links (app is opened from completely closed state)
        const launchUrlObj = await CapApp.getLaunchUrl();
        if (launchUrlObj && launchUrlObj.url && isSubscribed) {
          console.log('App launched via cold deep link:', launchUrlObj.url);
          handleDeepLinkUrl(launchUrlObj.url);
        }

        // 2. Handle WARM-START deep links (app is already running in background)
        CapApp.addListener('appUrlOpen', (event: any) => {
          if (!isSubscribed) return;
          console.log('App opened via warm deep link:', event.url);
          if (event.url) {
            handleDeepLinkUrl(event.url);
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
        // Backward-compatibility: if user has already entered the game before, assume name is set
        if (parsed.nameSet === undefined) {
          parsed.nameSet = true;
        }
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
      lastUpdated: new Date().toISOString(),
      nameSet: false // Brand new users must select their nickname and avatar
    };
  });

  // Firebase Auth states
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

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
  const [showDefinitionModal, setShowDefinitionModal] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };
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
      hapticEnabled: true,
      fontFamily: 'poppins'
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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        // Fetch profile from Firestore
        const dbProfile = await fetchUserProfile(user.uid);
        if (dbProfile) {
          setProfile(dbProfile);
          safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(dbProfile));
        } else {
          // If no doc in firestore, sync current profile state
          const updatedProfile = {
            ...profile,
            id: user.uid,
            nameSet: true
          };
          setProfile(updatedProfile);
          await saveUserProfileToFirestore(updatedProfile);
          safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(updatedProfile));
        }
      } else {
        setFirebaseUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
              const { matchId, targetWord: sharedWord, wordLength: len, opponentId, opponentName, matchWordsCount, currentRound, roundsWon } = data;
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
                matchWordsCount: matchWordsCount || 1,
                currentRound: currentRound || 1,
                roundsWon: roundsWon || { [profile.id]: 0, [opponentId]: 0 },
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

            case 'match_round_start': {
              const { matchId, targetWord: sharedWord, currentRound: round, matchWordsCount: total, roundsWon: rw } = data;
              showToast(`Tur ${round}/${total} Başladı! Yeni kelimeyi bul!`, 'success');
              
              setTargetWord(sharedWord);
              setAttempts([]);
              setCurrentAttempt('');
              setGameStatus('playing');
              setSecondsLeft(20);
              setWordDefinition('');
              setLetterStatuses({});

              setActiveMatch((prev) => {
                if (!prev) return null;
                const updatedPlayers: any = {};
                Object.keys(prev.players).forEach((pId) => {
                  updatedPlayers[pId] = {
                    ...prev.players[pId],
                    attempts: [],
                    currentAttempt: 0,
                    completed: false,
                    won: false,
                    timeRemaining: 20
                  };
                });
                return {
                  ...prev,
                  targetWord: sharedWord,
                  currentRound: round,
                  matchWordsCount: total,
                  roundsWon: rw || prev.roundsWon,
                  players: updatedPlayers
                };
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
              const { winnerId, players: finalPlayers, roundsWon: rw } = data;
              setActiveMatch((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  status: 'ended',
                  winnerId,
                  roundsWon: rw || prev.roundsWon
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
        console.warn(`WebSocket connection warning (handled by auto-reconnect) to URL: ${wsUrl}`, err);
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
      console.warn('Could not retrieve random word from server, falling back to local wordlist:', e);
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
    if (gameStatus !== 'playing' || isValidating || !hasEnteredGame || (gameMode === 'untimed' && !activeMatch)) {
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
  }, [gameStatus, attempts.length, isValidating, hasEnteredGame, gameMode, activeMatch]); // Resets interval on attempt submission or validation change or exit or gameMode change

  // Fetch direct definition for the target word when the game ends (won or lost)
  const fetchTargetWordDefinition = async (wordToFetch: string) => {
    if (!wordToFetch) return;
    setWordDefinition('loading');
    try {
      const response = await fetch(getApiUrl('/api/get-definition'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: wordToFetch })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.definition) {
          setWordDefinition(data.definition);
          return;
        }
      }
      setWordDefinition('Bu kelimenin TDK tanımı otomatik olarak yüklenemedi.');
    } catch (e) {
      console.error('Failed to fetch target word definition:', e);
      setWordDefinition('Tanım yüklenirken bağlantı hatası oluştu.');
    }
  };

  const renderWordDefinition = (themeColor: 'emerald' | 'rose') => {
    if (!wordDefinition) return null;

    if (wordDefinition === 'loading') {
      return (
        <div className="w-full max-w-sm mx-auto p-4 bg-black/10 rounded-2xl border border-[#3E485A] flex items-center justify-center gap-2 animate-pulse py-4 text-center my-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-[10px] text-gray-400 font-medium tracking-wide font-sans">
            Kelimenin TDK anlamı yükleniyor...
          </span>
        </div>
      );
    }

    const titleColorClass = themeColor === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
    const borderColorClass = themeColor === 'emerald' ? 'border-emerald-500/15' : 'border-rose-500/15';

    return (
      <div className={`w-full max-w-sm mx-auto p-4 bg-black/25 rounded-2xl border ${borderColorClass} text-left space-y-1.5 transition-all duration-300 shadow-md my-2`}>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-black uppercase tracking-wider ${titleColorClass} font-mono flex items-center gap-1`}>
            📖 TDK SÖZLÜK ANLAMI
          </span>
          <a
            href={`https://sozluk.gov.tr/?ara=${encodeURIComponent(turkishLower(targetWord))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-0.5"
          >
            TDK Resmi Sitesi ↗
          </a>
        </div>
        <p className="text-[11px] text-gray-300 italic font-serif leading-relaxed">
          "{wordDefinition}"
        </p>
      </div>
    );
  };

  // Handle Game Loss
  const handleGameLoss = async (reason: string = 'Hakkınız Bitti') => {
    setGameStatus('lost');
    showToast(`Oyunu Kaybettiniz: ${reason}! Doğru Kelime: ${targetWord}`, 'error');
    playDefeatSound(settings.soundEnabled);
    
    // Fetch definition for targetWord so the user can learn its meaning even on loss!
    if (targetWord) {
      fetchTargetWordDefinition(targetWord);
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
        // TDK Online validation with AbortController timeout to prevent UI hang in timed game
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 seconds timeout

          const response = await fetch(getApiUrl('/api/validate-word'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: guess, length: wordLength }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            isValid = data.valid;
            definition = data.definition || '';
          } else {
            throw new Error('Server returned non-ok status');
          }
        } catch (fetchErr) {
          console.warn('TDK API validation failed or timed out, falling back to local linguistic filters:', fetchErr);
          
          // First, check curated list
          const inCurated = isWordInCuratedList(guess, wordLength);
          if (inCurated) {
            isValid = true;
            definition = 'Kelime çevrimdışı sözlük listesinde onaylandı.';
            showToast('Bağlantı kesik: Kelime çevrimdışı sözlükle doğrulandı.', 'info');
          } else {
            // Second, check heuristic linguistic validation to accept valid words even if offline!
            const linguisticCheck = validateTurkishLinguistics(guess, wordLength);
            if (linguisticCheck.valid) {
              isValid = true;
              definition = 'TDK bağlantısı kurulamadı, ancak Türkçe hece ve harf yapısına göre onaylandı.';
              showToast('Bağlantı kesik: Türkçe dil kurallarına göre kelime onaylandı.', 'info');
            } else {
              isValid = false;
              definition = linguisticCheck.reason || 'Türkçe hece ve harf yapısına uymayan kelime!';
            }
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
        if (targetWord) {
          fetchTargetWordDefinition(targetWord);
        } else {
          setWordDefinition(definition || 'Kelime başarılı bir şekilde çözüldü.');
        }
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
    showConfirm(
      'İstatistikleri Sıfırla',
      'Tüm ilerleme ve istatistiklerinizi sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.',
      () => {
        setProfile((prev) => ({
          ...prev,
          stats: INITIAL_STATS,
          badges: DEFAULT_BADGES,
          missions: DEFAULT_MISSIONS,
          dailyScore: 0
        }));
        showToast('Tüm istatistikler sıfırlandı.', 'info');
      }
    );
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

  const handleStartMatchmaking = (matchWordsCount?: number) => {
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
          wordLength,
          matchWordsCount: matchWordsCount || 3
        }));
      }
    }
  };

  const handleUpdateProfile = async (name: string, avatarUrl?: string) => {
    const updated = {
      ...profile,
      name,
      avatarUrl
    };
    setProfile(updated);
    setNameInput(name);
    setAvatarInput(avatarUrl);
    await saveUserProfileToFirestore(updated);
    showToast('Profiliniz güncellendi.', 'success');
  };

  const getBgThemeClass = () => {
    switch (settings.bgTheme) {
      case 'sapphire':
        return 'bg-[#1a2233] text-[#FAF6E9]';
      case 'forest':
        return 'bg-[#162923] text-[#FAF6E9]';
      case 'amethyst':
        return 'bg-[#221c2e] text-[#FAF6E9]';
      case 'nord':
        return 'bg-[#212733] text-[#FAF6E9]';
      case 'default':
      default:
        return 'bg-[#1F2633] text-[#FAF6E9]';
    }
  };

  const getFontFamilyClass = () => {
    switch (settings.fontFamily) {
      case 'montserrat':
        return 'font-montserrat';
      case 'fredoka':
        return 'font-fredoka';
      case 'inter':
        return 'font-inter';
      case 'pacifico':
        return 'font-pacifico';
      case 'roboto-mono':
        return 'font-roboto-mono';
      case 'poppins':
      default:
        return 'font-poppins';
    }
  };

  const opponent = activeMatch ? Object.values(activeMatch.players).find(p => (p as any).name !== profile.name) as any : null;

  return (
    <div className={`h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col transition-all duration-300 ${getBgThemeClass()} ${getFontFamilyClass()}`}>
      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center py-1.5 sm:py-4 px-1.5 sm:px-4 max-w-full md:max-w-[95vw] lg:max-w-[90vw] w-full mx-auto relative overflow-hidden">
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

        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#FAF6E9] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-[#FAF6E9]/60">Savaşçı Oturumu Hazırlanıyor...</p>
          </div>
        ) : !firebaseUser ? (
          <AuthScreen
            onAuthComplete={(updatedProfile, fUser) => {
              setProfile(updatedProfile);
              setFirebaseUser(fUser);
              safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(updatedProfile));
              
              // Inform websocket if connection is alive
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                  type: 'join',
                  id: updatedProfile.id,
                  name: updatedProfile.name,
                  avatarUrl: updatedProfile.avatarUrl
                }));
              }
              showToast('Başarıyla giriş yapıldı!', 'success');
            }}
            lobbyPlayers={lobbyPlayers}
          />
        ) : isGroupRaceActive ? (
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
            {/* Back to welcome & Compact control panel block */}
            {!activeMatch && (
              <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] flex flex-col gap-2 mb-2 animate-fadeIn">
                {/* Row 1: Back to entry screen, Pes Et & Yenile */}
                <div className="flex justify-between items-center w-full">
                  <button
                    onClick={() => {
                      if (gameStatus === 'playing' && attempts.length > 0) {
                        showConfirm(
                          'Oyundan Çık',
                          'Mevcut oyundan çıkıp giriş ekranına dönmek istiyor musunuz? İlerlemeniz sıfırlanacaktır.',
                          () => {
                            setHasEnteredGame(false);
                          }
                        );
                      } else {
                        setHasEnteredGame(false);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-black uppercase tracking-wider bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] border border-[#EBE6D5] rounded-xl shadow-md transition duration-150 active:scale-[0.97] cursor-pointer"
                  >
                    <span>Giriş Ekranı</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {gameStatus === 'playing' && (
                      <button
                        onClick={() => {
                          showConfirm(
                            'Pes Et',
                            'Pes etmek ve doğru kelimeyi görmek istediğinize emin misiniz?',
                            () => {
                              handleGameLoss('Pes Ettiniz');
                            }
                          );
                        }}
                        className="px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 transition duration-150 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider font-mono cursor-pointer shrink-0"
                        title="Pes Et ve Kelimeyi Gör"
                      >
                        <AlertCircle size={12} className="stroke-[2.5]" />
                        Pes Et
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (gameStatus === 'playing' && attempts.length > 0) {
                          showConfirm(
                            'Oyunu Yeniden Başlat',
                            'Oyunu yeniden başlatmak istiyor musunuz? Mevcut ilerleme sıfırlanacaktır.',
                            () => {
                              startNewGame(wordLength);
                            }
                          );
                        } else {
                          startNewGame(wordLength);
                        }
                      }}
                      className="px-2.5 py-2 rounded-xl bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] border border-[#EBE6D5] font-black transition duration-150 flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono cursor-pointer shrink-0"
                      title="Yeni Kelime Al"
                    >
                      <RotateCcw size={12} className="stroke-[2.5]" />
                      Yenile
                    </button>
                  </div>
                </div>

                {/* Row 2: Harf Sayısı Selector & Mode tag */}
                <div className="flex justify-between items-center w-full bg-[#3D4756]/85 backdrop-blur-md border border-[#3E485A] rounded-xl px-2.5 py-1.5 shadow-sm text-white">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider font-mono">Harf:</span>
                    <div className="flex gap-0.5 bg-black/30 p-0.5 rounded-lg">
                      {[3, 4, 5, 6, 7, 8].map((len) => (
                        <button
                          key={len}
                          onClick={() => {
                            if (gameStatus === 'playing' && attempts.length > 0) {
                              showConfirm(
                                'Harf Sayısını Değiştir',
                                'Mevcut oyunu sıfırlayıp harf sayısını değiştirmek istediğinize emin misiniz?',
                                () => {
                                  setWordLength(len);
                                }
                              );
                            } else {
                              setWordLength(len);
                            }
                          }}
                          className={`w-6.5 h-6.5 rounded-md text-[10px] font-black transition-all duration-150 flex items-center justify-center cursor-pointer ${
                            wordLength === len
                              ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-xs scale-105'
                              : 'text-gray-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {len}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] font-bold text-gray-300 flex items-center gap-1 font-mono uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>{gameMode === 'timed' ? 'Süreli' : 'Süresiz'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Match Split View Banner */}
        {activeMatch && (
          <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-2.5 mb-2.5 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Swords size={20} className="text-emerald-500 shrink-0" />
              <div className="text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-xs text-gray-800 dark:text-white">Kelime Savaşı Sürüyor!</h4>
                  {activeMatch.matchWordsCount && (
                    <span className="text-[9px] font-black font-mono bg-emerald-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      Tur {activeMatch.currentRound}/{activeMatch.matchWordsCount}
                    </span>
                  )}
                </div>
                {activeMatch.roundsWon && (
                  <div className="flex gap-2.5 mt-0.5 text-[10px] font-bold font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400">SEN: {activeMatch.roundsWon[profile.id] || 0}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-amber-500">RAKİP: {activeMatch.roundsWon[opponent?.id || ''] || 0}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scoreboard Split */}
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg shadow-xs border border-gray-100 dark:border-gray-800">
                <div className="text-left">
                  <span className="text-[9px] text-gray-400 font-bold block leading-none">SEN</span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{attempts.length} Dn</span>
                </div>
              </div>

              <div className="text-xs font-bold text-gray-300 font-mono">VS</div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg shadow-xs border border-gray-100 dark:border-gray-800">
                <div className="text-left">
                  <span className="text-[9px] text-gray-400 font-bold block truncate max-w-[50px] leading-none">{opponent?.name?.toUpperCase() || 'RAKİP'}</span>
                  <span className="text-[11px] font-bold text-amber-500">
                    {opponent?.attempts?.length || 0} Dn
                  </span>
                </div>
              </div>

              <button
                onClick={handleLeaveMatch}
                className="text-[10px] bg-rose-500 hover:bg-rose-600 text-white font-extrabold px-2 py-1 rounded-lg cursor-pointer"
              >
                Çık
              </button>
            </div>
          </div>
        )}

        {/* Game Layout Wrapper */}
        <div className="w-full flex flex-col items-center justify-center gap-3 sm:gap-4 relative z-10">
          {/* Game Area Card */}
          <div className="w-full max-w-md bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-between p-4 sm:p-6 min-h-[82vh] max-h-[82vh] h-[82vh] md:min-h-0 md:max-h-none md:h-auto gap-y-2 transition-all duration-200 relative overflow-hidden text-white" id="game-area-card">
          {/* Subtle atmospheric ambient glow inside the card */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Timer & Attempts Tracker */}
          <div className="w-full flex justify-between items-center mb-4 px-2 border-b border-[#3E485A] pb-3 relative z-10">
            {gameStatus === 'playing' ? (
              <>
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-gray-300 font-mono">
                    Deneme: {attempts.length}/6
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(gameMode === 'timed' || activeMatch) ? (
                    <>
                      <Hourglass size={16} className={`animate-spin ${secondsLeft <= 5 ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <div className={`text-sm font-bold font-mono px-2 py-0.5 rounded-lg border ${
                        secondsLeft <= 5
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 animate-pulse'
                          : 'bg-black/25 border-[#3E485A] text-emerald-400'
                      }`}>
                        {secondsLeft} sn
                      </div>
                    </>
                  ) : (
                    <>
                      <Hourglass size={16} className="text-emerald-500 animate-pulse" />
                      <div className="text-xs font-extrabold font-mono px-2 py-0.5 rounded-lg border bg-black/25 border-[#3E485A] text-emerald-400">
                        Süresiz ♾️
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full flex justify-center py-0.5 animate-scale-up">
                <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                  gameStatus === 'won'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : gameStatus === 'lost'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-[#3D4756] border-[#3E485A] text-gray-300'
                }`}>
                  {gameStatus === 'won' ? '🎉 TEBRİKLER! KAZANDINIZ' : gameStatus === 'lost' ? '💥 SÜRE BİTTİ / ELENDİNİZ' : 'HAZIR'}
                </span>
              </div>
            )}
          </div>

          {/* Game Hint or Mode Banner */}
          {gameMode === 'timed' && gameStatus === 'playing' && !activeMatch && targetWord && (
            <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl mb-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 font-mono animate-fade-in shadow-xs">
              <Sparkles size={14} className="animate-pulse text-yellow-500" />
              <span>İPUCU: Kelime <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-xs font-black mx-1 inline-block shadow-sm shadow-emerald-500/20">{targetWord[0]}</span> harfi ile başlıyor!</span>
            </div>
          )}

          {/* Letter Grid */}
          <GameBoard
            attempts={attempts}
            currentAttempt={currentAttempt}
            wordLength={wordLength}
            boardTheme={settings.boardTheme}
            isGameOver={gameStatus !== 'playing'}
          />

          {/* Victory Celebration Showcase (Zafer Gösterisi) */}
          {gameStatus === 'won' && (
            <div className="w-full max-w-lg mt-2 bg-gradient-to-b from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/5 border border-emerald-500/20 dark:border-emerald-500/10 rounded-3xl p-3 sm:p-4 shadow-xl relative overflow-hidden animate-scale-up" id="victory-celebration-container">
              {/* Spinning background fireworks glow */}
              <div className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20 flex items-center justify-center">
                <div className="w-72 h-72 rounded-full border-4 border-dashed border-emerald-400 animate-rotate-slow" />
                <div className="absolute w-56 h-56 rounded-full border-2 border-dotted border-teal-400 animate-rotate-slow" style={{ animationDirection: 'reverse' }} />
              </div>

              {/* Celebration Layout with Side Torches (Meşaleler) */}
              <div className="flex justify-between items-center gap-4 relative z-10">
                {/* Left Torch */}
                <div className="hidden sm:block shrink-0 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="relative w-12 h-20 flex flex-col items-center">
                    {/* Rising Sparks */}
                    <div className="absolute -top-8 w-8 h-8 overflow-hidden pointer-events-none">
                      <div className="absolute bottom-0 left-1/4 w-1 bg-amber-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0s' }} />
                      <div className="absolute bottom-1 left-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.4s' }} />
                      <div className="absolute bottom-0 left-2/3 w-1 h-1 bg-yellow-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.8s' }} />
                    </div>
                    {/* Multilayered Fire */}
                    <div className="relative w-6 h-8 -mb-1 animate-pulse-glow">
                      <div className="absolute inset-x-0 bottom-0 mx-auto w-6 h-8 bg-gradient-to-t from-red-600 via-orange-500 to-transparent rounded-b-full rounded-t-2xl opacity-50 blur-[2px] animate-flicker" />
                      <div className="absolute inset-x-0.5 bottom-0 mx-auto w-4.5 h-6.5 bg-gradient-to-t from-red-500 via-amber-400 to-transparent rounded-b-full rounded-t-xl opacity-90 animate-flicker" style={{ animationDuration: '0.14s' }} />
                      <div className="absolute inset-x-1.5 bottom-0.5 mx-auto.5 w-2 h-3.5 bg-gradient-to-t from-yellow-300 to-white rounded-b-full rounded-t-md opacity-100 animate-flicker" style={{ animationDuration: '0.09s' }} />
                    </div>
                    {/* Torch Top Cup */}
                    <div className="w-4.5 h-3.5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 rounded-t-xs rounded-b-md shadow-md border-t border-yellow-300" />
                    {/* Handle */}
                    <div className="w-1 h-8 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-600 rounded-b-full shadow" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 text-center space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-center items-center gap-1.5 text-emerald-500">
                      <Sparkles className="animate-spin text-yellow-500" size={16} style={{ animationDuration: '4s' }} />
                      <span className="text-[10px] font-black uppercase tracking-widest font-mono text-emerald-600 dark:text-emerald-400">ZAFER KAZANILDI</span>
                      <Sparkles className="animate-bounce text-yellow-500" size={16} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                      Kelimelerin Efendisi! 🎉
                    </h3>
                  </div>

                  <div className="py-1.5 px-3 bg-white/70 dark:bg-gray-950/40 rounded-xl border border-emerald-500/10 shadow-inner inline-block mx-auto">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mb-1 leading-none">Bulunan Kelime</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xl sm:text-2xl font-extrabold tracking-widest uppercase bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-sm filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]">
                        {targetWord}
                      </span>
                      <button
                        onClick={() => {
                          setShowDefinitionModal(true);
                          playClickSound(settings.soundEnabled);
                        }}
                        className="p-1 rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition active:scale-95 cursor-pointer flex items-center justify-center"
                        title="Kelime Anlamı"
                        id="info-definition-btn-victory"
                      >
                        <Info size={16} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row justify-center items-center gap-2">
                    <button
                      onClick={() => startNewGame(wordLength)}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-[11px] py-2 px-4 rounded-lg shadow-md shadow-emerald-500/15 hover:shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      id="victory-retry-button"
                    >
                      <RotateCcw size={14} />
                      <span>YENİ SAVAŞA BAŞLA</span>
                    </button>
                  </div>
                </div>

                {/* Right Torch */}
                <div className="hidden sm:block shrink-0 animate-bounce animate-delay-150" style={{ animationDuration: '3s', animationDelay: '0.3s' }}>
                  <div className="relative w-12 h-20 flex flex-col items-center">
                    {/* Rising Sparks */}
                    <div className="absolute -top-8 w-8 h-8 overflow-hidden pointer-events-none">
                      <div className="absolute bottom-0 left-1/4 w-1.5 h-1.5 bg-amber-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.2s' }} />
                      <div className="absolute bottom-1 left-1/2 w-1 h-1 bg-orange-400 rounded-full animate-float-up-slow" style={{ animationDelay: '0.6s' }} />
                      <div className="absolute bottom-0 left-2/3 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-float-up-slow" style={{ animationDelay: '1s' }} />
                    </div>
                    {/* Multilayered Fire */}
                    <div className="relative w-6 h-8 -mb-1 animate-pulse-glow">
                      <div className="absolute inset-x-0 bottom-0 mx-auto w-6 h-8 bg-gradient-to-t from-red-600 via-orange-500 to-transparent rounded-b-full rounded-t-2xl opacity-50 blur-[2px] animate-flicker" style={{ animationDelay: '0.05s' }} />
                      <div className="absolute inset-x-0.5 bottom-0 mx-auto w-4.5 h-6.5 bg-gradient-to-t from-red-500 via-amber-400 to-transparent rounded-b-full rounded-t-xl opacity-90 animate-flicker" style={{ animationDuration: '0.14s', animationDelay: '0.05s' }} />
                      <div className="absolute inset-x-1.5 bottom-0.5 mx-auto.5 w-2 h-3.5 bg-gradient-to-t from-yellow-300 to-white rounded-b-full rounded-t-md opacity-100 animate-flicker" style={{ animationDuration: '0.09s', animationDelay: '0.05s' }} />
                    </div>
                    {/* Torch Top Cup */}
                    <div className="w-4.5 h-3.5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 rounded-t-xs rounded-b-md shadow-md border-t border-yellow-300" />
                    {/* Handle */}
                    <div className="w-1 h-8 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-600 rounded-b-full shadow" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standard Game Over (Loss) Screen */}
          {gameStatus === 'lost' && (
            <div className="w-full text-center py-2 space-y-2.5 max-w-sm animate-scale-up" id="game-over-loss-container">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-xl space-y-1">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest font-mono">DENEME HAKKI VEYA SÜRE BİTTİ</p>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">Aradığınız kelime şuydu:</h4>
                <div className="flex items-center justify-center gap-1.5">
                  <strong className="text-xl text-rose-500 tracking-wider font-extrabold uppercase leading-none">{targetWord}</strong>
                  <button
                    onClick={() => {
                      setShowDefinitionModal(true);
                      playClickSound(settings.soundEnabled);
                    }}
                    className="p-1 rounded-full text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition active:scale-95 cursor-pointer flex items-center justify-center"
                    title="Kelime Anlamı"
                    id="info-definition-btn-loss"
                  >
                    <Info size={16} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => startNewGame(wordLength)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2 px-6 rounded-lg shadow-md shadow-emerald-500/15 text-[11px] uppercase tracking-wider active:scale-95 transition cursor-pointer"
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

          {/* Action Buttons Above Keyboard */}
          {gameStatus === 'playing' && (
            <div className="w-full max-w-md px-2 mt-2.5 mb-2 flex items-center gap-2" id="action-buttons-above-keyboard-container">
              {/* CLEAR ROW BUTTON (TEMİZLE) */}
              <button
                onClick={() => {
                  if (currentAttempt.length > 0) {
                    setCurrentAttempt('');
                    playDeleteSound(settings.soundEnabled);
                  }
                }}
                disabled={currentAttempt.length === 0 || isValidating}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 border ${
                  currentAttempt.length > 0 && !isValidating
                    ? 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white border-rose-400 hover:shadow-rose-500/20 active:scale-[0.98] cursor-pointer'
                    : 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-200/60 dark:border-gray-800/40 cursor-not-allowed'
                }`}
                id="clear-row-button"
              >
                <Trash2 size={14} />
                <span>TEMİZLE</span>
              </button>

              {/* SUBMIT BUTTON (TAMAM) */}
              <button
                onClick={submitGuess}
                disabled={currentAttempt.length !== wordLength || isValidating}
                className={`flex-[2] py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-md transition-all duration-200 flex items-center justify-center gap-2 border ${
                  currentAttempt.length === wordLength && !isValidating
                    ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white border-emerald-400 hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer'
                    : 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-200/60 dark:border-gray-800/40 cursor-not-allowed'
                }`}
                id="submit-guess-button-above-keyboard"
              >
                {isValidating ? (
                  <>
                    <RotateCcw className="animate-spin" size={14} />
                    DOĞRULANIYOR...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className={currentAttempt.length === wordLength ? "animate-bounce" : ""} />
                    TAMAM (DENE)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Virtual Keyboard */}
          {gameStatus === 'playing' && (
            <Keyboard
              onChar={onChar}
              onDelete={onDelete}
              onEnter={submitGuess}
              letterStatuses={letterStatuses}
              keyboardLayout={settings.keyboardLayout}
              boardTheme={settings.boardTheme}
            />
          )}
        </div>
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

      {/* Word Definition Modal */}
      {showDefinitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" id="definition-modal-container">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setShowDefinitionModal(false)}
          />
          
          {/* Modal Container */}
          <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl relative z-10 overflow-hidden text-white animate-scale-up" id="definition-modal-card">
            {/* Atmospheric light glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Close Button in Upper-Right */}
            <button
              onClick={() => {
                setShowDefinitionModal(false);
                playClickSound(settings.soundEnabled);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
              id="close-definition-modal-button"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="relative z-10 text-left space-y-4">
              <div className="flex items-center gap-2 border-b border-[#3E485A] pb-3 mr-6">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1">
                  📖 TDK KELİME ANLAMI
                </span>
              </div>

              <div className="p-3 bg-black/20 rounded-2xl border border-[#3E485A]/50 text-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono block mb-1">
                  Aranan Kelime
                </span>
                <strong className="text-lg font-black tracking-widest uppercase text-[#FAF6E9]">{targetWord}</strong>
              </div>

              {wordDefinition === 'loading' ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <span className="text-xs text-gray-400 font-medium tracking-wide">
                    Anlamı yükleniyor...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-200 italic font-serif leading-relaxed px-1">
                    "{wordDefinition || 'Bu kelimenin TDK tanımı otomatik olarak yüklenemedi.'}"
                  </p>
                  
                  <div className="pt-2 border-t border-[#3E485A]/30 flex justify-end">
                    <a
                      href={`https://sozluk.gov.tr/?ara=${encodeURIComponent(turkishLower(targetWord))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      Resmi Site ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
          profile={profile}
          lobbyPlayers={lobbyPlayers}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {/* Custom Premium Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
          
          {/* Modal Container */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative z-10 overflow-hidden">
            {/* Atmospheric light glows */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200/50 dark:border-amber-900/30">
                <AlertCircle size={24} className="stroke-[2.5]" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-gray-950 dark:text-white uppercase tracking-wider font-mono">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onConfirm();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black uppercase tracking-wider border border-emerald-400 shadow-md hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
                >
                  Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
