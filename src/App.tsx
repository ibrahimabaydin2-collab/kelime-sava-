import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  playClickSound,
  playDeleteSound,
  playEnterSound,
  playErrorSound,
  playVictorySound,
  playDefeatSound,
  playCountdownBeepSound,
  suspendAudioContext,
  resumeAudioContext
} from './utils/soundEffects.js';
import GameBoard from './components/GameBoard.js';
import BottomBar from './components/BottomBar.js';
import Keyboard from './components/Keyboard.js';
import Lobby from './components/Lobby.js';
import StatsModal from './components/StatsModal.js';
import MissionsModal from './components/MissionsModal.js';
import WelcomeScreen from './components/WelcomeScreen.js';
import SettingsModal, { AppSettings } from './components/SettingsModal.js';
import AuthScreen from './components/AuthScreen.js';
import BadgeUnlockedModal from './components/BadgeUnlockedModal.js';
import { auth, onAuthStateChanged, fetchUserProfile, saveUserProfileToFirestore, signOutUser, fetchUserProfileByDeviceId, deleteUserProfile, signInAsGuest, clearMatchmakingState } from './lib/firebase.js';
import { UserProfile, GameAttempt, LobbyPlayer, Challenge, RealtimeMatch, DailyMission, Badge, NetworkLogEntry } from './types.js';
import { Swords, RotateCcw, AlertCircle, HelpCircle, Trophy, UserCheck, Flame, Hourglass, HelpCircle as HelpIcon, Sparkles, Upload, Trash2, Image, X, ArrowLeft, Info, Play, Home } from 'lucide-react';
import { getRandomWord, isWordInCuratedList, getDailyWordAndLength } from './data/wordlist.js';
import { turkishUpper, turkishLower, validateTurkishLinguistics } from './utils/turkish.js';
import { getApiUrl, getWsUrl, validateWordClientSide } from './utils/api.js';
import { calculateDynamicScore, verifyScoringAccuracy, getLevelForScore } from './utils/scoring.js';
import { getCachedWord, setCachedWord } from './utils/wordCache.js';
import { scheduleDailyNotifications } from './utils/notifications.js';

const INITIAL_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  winDistribution: [0, 0, 0, 0, 0, 0]
};

const DEFAULT_BADGES: Badge[] = [
  { id: 'first_step', title: 'İlk Adım', description: 'İlk kelime oyununu oyna', iconName: 'Award' },
  { id: 'champion', title: 'Şampiyon', description: 'İlk galibiyetini kazan', iconName: 'Trophy' },
  { id: 'lightning', title: 'Yıldırım Çözücü', description: '10 saniyeden fazla süre varken kelimeyi çöz', iconName: 'Zap' },
  { id: 'flawless', title: 'Kusursuz', description: 'Kelimeyi ilk veya ikinci denemede doğru bil', iconName: 'Star' },
  { id: 'genius', title: 'Zeka Küpü', description: '8 harfli bir kelimeyi başarıyla tamamla', iconName: 'Brain' },
  { id: 'gladiator', title: 'Gladyatör', description: 'Gerçek zamanlı bir arkadaş meydan okumasını kazan', iconName: 'Shield' },
  { id: 'daily_puzzle_solver', title: 'Günlük Bilge', description: 'Günün bulmacasını başarıyla çöz', iconName: 'Calendar' },
  { id: 'word_detective', title: 'Kelime Dedektifi', description: 'Toplam 10 kelimeyi başarıyla çöz', iconName: 'Search' },
  { id: 'word_guru', title: 'Kelime Gurusu', description: 'Toplam 50 kelimeyi başarıyla çöz', iconName: 'Crown' },
  { id: 'word_master', title: 'Kelime Ustası', description: 'Toplam 100 kelimeyi başarıyla çöz', iconName: 'Crown' },
  { id: 'persistent_player', title: 'Azimli Oyuncu', description: 'Toplam 25 oyun oyna', iconName: 'Award' },
  { id: 'quick_draw', title: 'Hızlı Silah', description: 'Bir kelimeyi 5 saniyeden kısa sürede çöz', iconName: 'Zap' },
  { id: 'streak_master', title: 'Seri Katil', description: 'Üst üste 5 galibiyet serisi yakala', iconName: 'Flame' },
  { id: 'legend', title: 'Efsane', description: 'Üst üste 10 galibiyet serisi yakala', iconName: 'Crown' },
  { id: 'perfect_brain', title: 'Kusursuz Deha', description: 'Bir kelimeyi ilk denemede doğru bil', iconName: 'Sparkles' },
  { id: 'mission_seeker', title: 'Görev Avcısı', description: '5 günlük görevi tamamla', iconName: 'Target' },
  { id: 'mission_lord', title: 'Görev Efendisi', description: '20 günlük görevi tamamla', iconName: 'Trophy' },
  { id: 'polymath', title: 'Kelime Bilgini', description: 'Tüm kelime uzunluklarından (3-8 harf) en az birer kelime çöz', iconName: 'Compass' }
];

const DEFAULT_MISSIONS: DailyMission[] = [
  { id: 'm_play_1', title: 'Kelime Avcısı 🔍', description: 'Bugün en az 1 kelime oyunu oyna', target: 1, current: 0, completed: false, type: 'play' },
  { id: 'm_win_1', title: 'İlk Zafer 🏆', description: 'Bugün en az 1 kelimeyi doğru tahmin et', target: 1, current: 0, completed: false, type: 'win' },
  { id: 'm_fast_1', title: 'Yıldırım Hızı ⚡', description: 'Herhangi bir kelimeyi 10 saniyeden fazla süre kala çöz', target: 1, current: 0, completed: false, type: 'fast_solve' },
  
  // 3-letter words
  { id: 'm_solve_3_1', title: 'Üçgen Formülü 🔺', description: '3 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_3' },
  { id: 'm_solve_3_2', title: 'Üç Harf Seri 🔥', description: '3 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_3' },
  { id: 'm_solve_3_3', title: 'Üç Harf Maratonu 🏃', description: '3 harfli 10 kelimeyi başarıyla çöz', target: 10, current: 0, completed: false, type: 'solve_3' },
  { id: 'm_solve_3_4', title: 'Üç Harf Yarım Dalya 🎖️', description: '3 harfli 50 kelimeyi başarıyla çöz', target: 50, current: 0, completed: false, type: 'solve_3' },
  { id: 'm_solve_3_5', title: 'Üç Harf Tam Dalya 👑', description: '3 harfli 100 kelimeyi başarıyla çöz', target: 100, current: 0, completed: false, type: 'solve_3' },
  
  // 4-letter words
  { id: 'm_solve_4_1', title: 'Dört Dörtlük 🟥', description: '4 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_4' },
  { id: 'm_solve_4_2', title: 'Kare Ustası 🧱', description: '4 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_4' },
  { id: 'm_solve_4_3', title: 'Kare Maratonu 🚜', description: '4 harfli 10 kelimeyi başarıyla çöz', target: 10, current: 0, completed: false, type: 'solve_4' },
  { id: 'm_solve_4_4', title: 'Kare Yarım Dalya 🏵️', description: '4 harfli 50 kelimeyi başarıyla çöz', target: 50, current: 0, completed: false, type: 'solve_4' },
  { id: 'm_solve_4_5', title: 'Kare Tam Dalya 🏰', description: '4 harfli 100 kelimeyi başarıyla çöz', target: 100, current: 0, completed: false, type: 'solve_4' },
  
  // 5-letter words
  { id: 'm_solve_5_1', title: 'Beşli Yıldız ⭐', description: '5 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_5' },
  { id: 'm_solve_5_2', title: 'Pentagon Seferi 🎯', description: '5 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_5' },
  { id: 'm_solve_5_3', title: 'Pentagon Maratonu ✈️', description: '5 harfli 10 kelimeyi başarıyla çöz', target: 10, current: 0, completed: false, type: 'solve_5' },
  { id: 'm_solve_5_4', title: 'Beşli Yıldız Yarım Dalya 🎖️', description: '5 harfli 50 kelimeyi başarıyla çöz', target: 50, current: 0, completed: false, type: 'solve_5' },
  { id: 'm_solve_5_5', title: 'Pentagon Tam Dalya 🌌', description: '5 harfli 100 kelimeyi başarıyla çöz', target: 100, current: 0, completed: false, type: 'solve_5' },
  
  // 6-letter words
  { id: 'm_solve_6_1', title: 'Altıncı His 👁️', description: '6 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_6' },
  { id: 'm_solve_6_2', title: 'Hexagon Muhafızı 🛡️', description: '6 harfli 3 kelimeyi başarıyla çöz', target: 3, current: 0, completed: false, type: 'solve_6' },
  { id: 'm_solve_6_3', title: 'Hexagon Maratonu 🏹', description: '6 harfli 10 kelimeyi başarıyla çöz', target: 10, current: 0, completed: false, type: 'solve_6' },
  { id: 'm_solve_6_4', title: 'Hexagon Yarım Dalya ⚜️', description: '6 harfli 50 kelimeyi başarıyla çöz', target: 50, current: 0, completed: false, type: 'solve_6' },
  { id: 'm_solve_6_5', title: 'Hexagon Tam Dalya 🔮', description: '6 harfli 100 kelimeyi başarıyla çöz', target: 100, current: 0, completed: false, type: 'solve_6' },
  
  // 7-letter words
  { id: 'm_solve_7_1', title: 'Yedi Tepe ⛰️', description: '7 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_7' },
  { id: 'm_solve_7_2', title: 'Gökkuşağı Bandı 🌈', description: '7 harfli 2 kelimeyi başarıyla çöz', target: 2, current: 0, completed: false, type: 'solve_7' },
  { id: 'm_solve_7_3', title: 'Yedi Tepe Maratonu 🗺️', description: '7 harfli 10 kelimeyi başarıyla çöz', target: 10, current: 0, completed: false, type: 'solve_7' },
  { id: 'm_solve_7_4', title: 'Gökkuşağı Yarım Dalya 🎡', description: '7 harfli 50 kelimeyi başarıyla çöz', target: 50, current: 0, completed: false, type: 'solve_7' },
  { id: 'm_solve_7_5', title: 'Yedi Cennet Tam Dalya ☀️', description: '7 harfli 100 kelimeyi başarıyla çöz', target: 100, current: 0, completed: false, type: 'solve_7' },
  
  // 8-letter words
  { id: 'm_solve_8_1', title: 'Sekiz Köşe 🕸️', description: '8 harfli bir kelimeyi başarıyla çöz', target: 1, current: 0, completed: false, type: 'solve_8' },
  { id: 'm_solve_8_2', title: 'Kelimelerin Efendisi 👑', description: '8 harfli 2 kelimeyi başarıyla çöz', target: 2, current: 0, completed: false, type: 'solve_8' },
  { id: 'm_solve_8_3', title: 'Zeka Köşesi Maratonu 🧩', description: '8 harfli 10 kelimeyi başarıyla çöz', target: 10, current: 0, completed: false, type: 'solve_8' },
  { id: 'm_solve_8_4', title: 'Sekiz Köşe Yarım Dalya 💎', description: '8 harfli 50 kelimeyi başarıyla çöz', target: 50, current: 0, completed: false, type: 'solve_8' },
  { id: 'm_solve_8_5', title: 'Zeka Küpü Tam Dalya 🧠', description: '8 harfli 100 kelimeyi başarıyla çöz', target: 100, current: 0, completed: false, type: 'solve_8' },
  
  // Advanced
  { id: 'm_streak_2', title: 'Durdurulamaz 🦾', description: 'Üst üste 2 oyun kazan', target: 2, current: 0, completed: false, type: 'streak' },
  { id: 'm_perfect_1', title: 'Kusursuz Akıl 🧠', description: 'Herhangi bir kelimeyi ilk veya ikinci denemede doğru bil', target: 1, current: 0, completed: false, type: 'perfect' }
];

const triggerVictoryCelebration = (soundEnabled: boolean) => {
  // Play grand synthesized victory chords/arpeggio
  playVictorySound(soundEnabled);

  // Extremely lightweight, single-frame burst of minimal particles to guarantee 0% WebView crashes/reloads
  try {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#10b981', '#34d399', '#f59e0b']
    });
  } catch (e) {
    console.error('Confetti failed to trigger safely:', e);
  }
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
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('localStorage removeItem blocked/unavailable:', e);
    }
  }
};

function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const nav = (window.navigator || {}) as any;
  const scr = (window.screen || {}) as any;
  const userAgent = nav.userAgent || '';
  const language = nav.language || '';
  const screenWidth = scr.width || 0;
  const screenHeight = scr.height || 0;
  const colorDepth = scr.colorDepth || 0;
  
  // Combine factors to build a fingerprint
  const rawFingerprint = `${userAgent}|${language}|${screenWidth}x${screenHeight}|${colorDepth}`;
  
  // Deterministic 32-bit hash
  let hash = 0;
  for (let i = 0; i < rawFingerprint.length; i++) {
    const char = rawFingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  
  return 'fp_' + Math.abs(hash).toString(36);
}

export default function App() {
  const [deviceId] = useState<string>(() => {
    let id = safeLocalStorage.getItem('kelimesavasi_device_id');
    if (!id) {
      id = generateDeviceFingerprint();
      safeLocalStorage.setItem('kelimesavasi_device_id', id);
    }
    return id;
  });

  // Theme & Menu State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return true; // Default to Gece Modu (Night Mode) for the initial visit
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
        if (!parsed.missions) {
          parsed.missions = DEFAULT_MISSIONS;
        } else {
          // Merge default missions to ensure any newly added missions are present
          const existingIds = parsed.missions.map((m: any) => m.id);
          DEFAULT_MISSIONS.forEach(mission => {
            if (!existingIds.includes(mission.id)) {
              parsed.missions.push({
                ...mission,
                current: 0,
                completed: false
              });
            }
          });
        }
        if (!parsed.badges) {
          parsed.badges = DEFAULT_BADGES;
        } else {
          // Merge default badges to ensure any newly added badges are present
          const existingIds = parsed.badges.map((b: any) => b.id);
          DEFAULT_BADGES.forEach(badge => {
            if (!existingIds.includes(badge.id)) {
              parsed.badges.push(badge);
            }
          });
        }
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
  const [isDailyPuzzle, setIsDailyPuzzle] = useState<boolean>(false);
  const [isDailyPuzzleCompletedToday, setIsDailyPuzzleCompletedToday] = useState<boolean>(() => {
    const todayDateStr = getDailyWordAndLength().dateStr;
    const localCompleted = safeLocalStorage.getItem('kelimesavasi_daily_completed_date') === todayDateStr ||
                           safeLocalStorage.getItem('last_played_date') === todayDateStr;
    
    // Check AndroidBridge SharedPreferences if running in hybrid app
    if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.getDailyPuzzleLastPlayedDate) {
      try {
        const nativeDate = (window as any).AndroidBridge.getDailyPuzzleLastPlayedDate();
        const nativeCompleted = (window as any).AndroidBridge.getDailyPuzzleIsCompleted();
        if (nativeDate === todayDateStr && nativeCompleted) {
          return true;
        }
      } catch (e) {
        console.error("Error reading native SharedPreferences for daily puzzle status:", e);
      }
    }
    return localCompleted;
  });
  const [targetWord, setTargetWord] = useState<string>('');
  const [attempts, setAttempts] = useState<GameAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [isAppActive, setIsAppActive] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [wordDefinition, setWordDefinition] = useState<string>('');
  const [letterStatuses, setLetterStatuses] = useState<{ [key: string]: 'green' | 'orange' | 'grey' }>({});

  // Welcome Screen & Dictionary Mode State
  const [hasEnteredGame, setHasEnteredGame] = useState<boolean>(false);

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

  // Settings state moved up to avoid block scope issues with notification effects
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

  // Retention notification state
  const [retentionNotification, setRetentionNotification] = useState<{ message: string } | null>(null);

  // Retention notification effect
  useEffect(() => {
    const isNotificationOn = settings.notificationEnabled !== false;
    const lastActiveStr = safeLocalStorage.getItem('kelimesavasi_last_active_time');
    const currentTime = Date.now();
    
    if (lastActiveStr && isNotificationOn) {
      try {
        const lastActiveTime = new Date(lastActiveStr).getTime();
        const diffMs = currentTime - lastActiveTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (diffDays >= 3) {
          const RETENTION_MESSAGES = [
            'Kelimeler seni özledi, günün bulmacasını kaçırma! 🧩',
            'Zihnini çalıştırmaya ne dersin? Yeni bulmaca hazır! ⚡',
            'Günün gizemli kelimesini çözüp "Günlük Bilge" rozetini kapmaya hazır mısın? 🎖️',
            'Oyuncu! Kelime tahtası boş kaldı, bugün zekanı konuşturma zamanı! ⚔️',
            'Zirvedeki yerini korumak için bugün de kelimeleri avla! 🏆'
          ];
          const randomMsg = RETENTION_MESSAGES[Math.floor(Math.random() * RETENTION_MESSAGES.length)];
          setRetentionNotification({ message: randomMsg });
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Kelime Savaşı', { body: randomMsg, icon: '/favicon.ico' });
          } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Kelime Savaşı', { body: randomMsg, icon: '/favicon.ico' });
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed checking retention inactivity', e);
      }
    }
    
    safeLocalStorage.setItem('kelimesavasi_last_active_time', new Date().toISOString());
  }, [settings.notificationEnabled]);

  // Load Daily Puzzle completion status from database on app start or when deviceId becomes available
  useEffect(() => {
    if (!deviceId) return;
    const checkDailyStatusOnStart = async () => {
      try {
        const response = await fetch(`/api/daily-puzzle?deviceId=${encodeURIComponent(deviceId)}`);
        if (response.ok) {
          const data = await response.json();
          const todayDateStr = getDailyWordAndLength().dateStr;
          if (data.solved || data.failed) {
            safeLocalStorage.setItem('kelimesavasi_daily_completed_date', todayDateStr);
            safeLocalStorage.setItem('last_played_date', todayDateStr);
            safeLocalStorage.setItem('is_daily_completed', 'true');
            if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.saveDailyPuzzleStatus) {
              try {
                (window as any).AndroidBridge.saveDailyPuzzleStatus(todayDateStr, true);
              } catch (e) {
                console.error(e);
              }
            }
            setIsDailyPuzzleCompletedToday(true);
          }
        }
      } catch (e) {
        console.error('Error fetching initial daily puzzle status:', e);
      }
    };
    checkDailyStatusOnStart();
  }, [deviceId]);

  // Manage app background / foreground state (visibility change, focus/blur)
  useEffect(() => {
    const handleAppActive = () => {
      setIsAppActive(true);
      resumeAudioContext();
    };

    const handleAppInactive = () => {
      setIsAppActive(false);
      suspendAudioContext();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppActive();
      } else {
        handleAppInactive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleAppActive);
    window.addEventListener('blur', handleAppInactive);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleAppActive);
      window.removeEventListener('blur', handleAppInactive);
    };
  }, []);

  // Daily Puzzle Morning Notification scheduler effect
  useEffect(() => {
    scheduleDailyNotifications();
  }, [settings.notificationEnabled]);

  // Expose retention notification simulator helper
  useEffect(() => {
    (window as any).__simulateRetentionNotification = () => {
      const RETENTION_MESSAGES = [
        'Kelimeler seni özledi, günün bulmacasını kaçırma! 🧩',
        'Zihnini çalıştırmaya ne dersin? Yeni bulmaca hazır! ⚡',
        'Günün gizemli kelimesini çözüp "Günlük Bilge" rozetini kapmaya hazır mısın? 🎖️',
        'Oyuncu! Kelime tahtası boş kaldı, bugün zekanı konuşturma zamanı! ⚔️',
        'Zirvedeki yerini korumak için bugün de kelimeleri avla! 🏆'
      ];
      const randomMsg = RETENTION_MESSAGES[Math.floor(Math.random() * RETENTION_MESSAGES.length)];
      setRetentionNotification({ message: randomMsg });
      showToast('3 Günlük Hareketsizlik Algılandı! Bildirim Simüle Edildi.', 'info');
    };
    return () => {
      delete (window as any).__simulateRetentionNotification;
    };
  }, []);

  // UI Modals / Alerts
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(false);
  const [showLobbyModal, setShowLobbyModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showDefinitionModal, setShowDefinitionModal] = useState<boolean>(false);
  const [showCongratsModal, setShowCongratsModal] = useState<boolean>(false);
  const [unlockedBadgeToShow, setUnlockedBadgeToShow] = useState<Badge | null>(null);
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

  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(profile.name);
  const [avatarInput, setAvatarInput] = useState<string | undefined>(profile.avatarUrl);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Real-time Multiplayer State
  const [networkLogs, setNetworkLogs] = useState<NetworkLogEntry[]>([]);

  const addNetworkLog = useCallback((type: 'info' | 'error' | 'success' | 'sent' | 'received', message: string) => {
    const timestamp = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    const newEntry: NetworkLogEntry = { timestamp, type, message };
    setNetworkLogs((prev) => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, 10);
    });
  }, []);

  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [reconnectCounter, setReconnectCounter] = useState<number>(0);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [activeMatch, setActiveMatch] = useState<RealtimeMatch | null>(null);
  const [rematchRequested, setRematchRequested] = useState<boolean>(false);
  const [opponentRematchRequested, setOpponentRematchRequested] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const wasOnlineRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMatchmakingRef = useRef<number | null>(null);

  const handleManualReconnect = () => {
    addNetworkLog('info', 'Manuel yeniden bağlanma tetiklendi.');
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
    let active = true;
    let resolved = false;

    // 15-second graceful fallback timeout for the "Oturum Hazırlanıyor..." screen
    const timeoutId = setTimeout(() => {
      if (active && !resolved) {
        resolved = true;
        console.warn('Firebase Auth/Profile initialization timed out (15s). Falling back gracefully in background.');
        setAuthLoading(false);
      }
    }, 15000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      try {
        // Clear previous session states to avoid residual game leaks
        setAttempts([]);
        setCurrentAttempt('');
        setGameStatus('idle');
        setIsValidating(false);

        if (user) {
          setFirebaseUser(user);
          // Check if we have a pending restoration profile
          const pendingRestorationJson = safeLocalStorage.getItem('pending_restoration_profile');
          if (pendingRestorationJson) {
            const restoredProfile = JSON.parse(pendingRestorationJson);
            // Move/Create the restored profile to the new authenticated uid
            const updatedProfile = {
              ...restoredProfile,
              id: user.uid,
              deviceId: deviceId, // ensure bound
              nameSet: true
            };
            setProfile(updatedProfile);
            await saveUserProfileToFirestore(updatedProfile);
            // Delete the old profile document to keep usernames unique and avoid duplicate deviceId
            if (restoredProfile.id && restoredProfile.id !== user.uid) {
              await deleteUserProfile(restoredProfile.id);
            }
            safeLocalStorage.removeItem('pending_restoration_profile');
            safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(updatedProfile));
            if (updatedProfile.name) {
              safeLocalStorage.setItem('saved_username', updatedProfile.name);
            }
            showToast(`Profiliniz başarıyla geri yüklendi: ${updatedProfile.name}! 🎉`, 'success');
          } else {
            // Normal fetch
            const dbProfile = await fetchUserProfile(user.uid);
            if (active) {
              if (dbProfile) {
                // If the profile does not have deviceId set, or has a different deviceId, bind it!
                if (!dbProfile.deviceId || dbProfile.deviceId !== deviceId) {
                  dbProfile.deviceId = deviceId;
                  await saveUserProfileToFirestore(dbProfile);
                }
                setProfile(dbProfile);
                safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(dbProfile));
                if (dbProfile.name) {
                  safeLocalStorage.setItem('saved_username', dbProfile.name);
                }
              } else {
                // No profile exists for this UID. Let's trigger device profile recovery now that we are successfully authenticated!
                try {
                  const existingProfile = await fetchUserProfileByDeviceId(deviceId);
                  if (existingProfile && existingProfile.id !== user.uid) {
                    console.log('Found existing profile associated with deviceId. Auto-recovering profile...', existingProfile);
                    const updatedProfile = {
                      ...existingProfile,
                      id: user.uid,
                      deviceId: deviceId,
                      nameSet: true
                    };
                    setProfile(updatedProfile);
                    await saveUserProfileToFirestore(updatedProfile);
                    // Delete the old profile document to keep usernames unique and avoid duplicate deviceId
                    if (existingProfile.id) {
                      await deleteUserProfile(existingProfile.id);
                    }
                    safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(updatedProfile));
                    if (updatedProfile.name) {
                      safeLocalStorage.setItem('saved_username', updatedProfile.name);
                    }
                    showToast(`Profiliniz başarıyla geri yüklendi: ${updatedProfile.name}! 🎉`, 'success');
                  } else {
                    // No existing profile found with this deviceId. Sync current profile state
                    const savedUsername = safeLocalStorage.getItem('saved_username');
                    const savedProfileStr = safeLocalStorage.getItem('kelimesavasi_profile');
                    let finalName = savedUsername || profile.name;
                    if (savedProfileStr) {
                      try {
                        const parsed = JSON.parse(savedProfileStr);
                        if (parsed && parsed.name) finalName = parsed.name;
                      } catch (e) {}
                    }
                    const updatedProfile = {
                      ...profile,
                      id: user.uid,
                      name: finalName,
                      deviceId: deviceId,
                      nameSet: true
                    };
                    setProfile(updatedProfile);
                    await saveUserProfileToFirestore(updatedProfile);
                    safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(updatedProfile));
                    if (updatedProfile.name) {
                      safeLocalStorage.setItem('saved_username', updatedProfile.name);
                    }
                  }
                } catch (deviceCheckErr) {
                  console.error('Error during automatic device profile recovery after auth:', deviceCheckErr);
                  // Sync current profile state as fallback
                  const updatedProfile = {
                    ...profile,
                    id: user.uid,
                    deviceId: deviceId,
                    nameSet: true
                  };
                  setProfile(updatedProfile);
                  await saveUserProfileToFirestore(updatedProfile);
                  safeLocalStorage.setItem('kelimesavasi_profile', JSON.stringify(updatedProfile));
                }
              }
            }
          }
          if (active && !resolved) {
            resolved = true;
            setAuthLoading(false);
            clearTimeout(timeoutId);
          }
        } else {
          if (active) {
            setFirebaseUser(null);
            const savedUsername = safeLocalStorage.getItem('saved_username');
            const savedProfileStr = safeLocalStorage.getItem('kelimesavasi_profile');
            if (savedUsername || savedProfileStr) {
              console.log('Returning anonymous or registered user session detected. Auto-signing in as guest to prevent AuthScreen flash...');
              try {
                await signInAsGuest();
                console.log('Auto-sign in as guest succeeded inside Auth listener.');
              } catch (guestErr) {
                console.error('Auto guest login failed in Auth listener:', guestErr);
                if (active && !resolved) {
                  resolved = true;
                  setAuthLoading(false);
                  clearTimeout(timeoutId);
                }
              }
            } else {
              // Truly new visitor. Stop loading and show registration/login.
              if (active && !resolved) {
                resolved = true;
                setAuthLoading(false);
                clearTimeout(timeoutId);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error during onAuthStateChanged processing:', err);
        if (active && !resolved) {
          resolved = true;
          setAuthLoading(false);
          clearTimeout(timeoutId);
        }
      }
    });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
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
      addNetworkLog('info', `Bağlantı kuruluyor: ${wsUrl.split('?')[0]}`);
      const ws = new WebSocket(wsUrl);

      const originalSend = ws.send.bind(ws);
      ws.send = (data: any) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type !== 'ping') {
            addNetworkLog('sent', `Giden mesaj: ${parsed.type}`);
          }
        } catch (e) {
          addNetworkLog('sent', 'Veri gönderildi');
        }
        originalSend(data);
      };

      socketRef.current = ws;

      const connTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timed out (stuck in CONNECTING state). Closing & retrying...');
          addNetworkLog('error', 'Bağlantı zaman aşımına uğradı (CONNECTING durumunda takıldı).');
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
        addNetworkLog('success', 'Bağlantı başarıyla kuruldu.');
        // Register client
        ws.send(JSON.stringify({
          type: 'join',
          id: profile.id,
          name: profile.name,
          avatarUrl: profile.avatarUrl
        }));

        // If there is a pending matchmaking start, trigger it on this brand new clean socket
        if (pendingMatchmakingRef.current !== null) {
          const matchWordsCount = pendingMatchmakingRef.current;
          pendingMatchmakingRef.current = null;
          console.log(`Auto-triggering pending matchmaking join on new connection for ${wordLength} letters, ${matchWordsCount} words.`);
          ws.send(JSON.stringify({
            type: 'join_matchmaking',
            wordLength,
            matchWordsCount
          }));
          setMatchmakingStatus('queued');
        }

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
          if (data.type !== 'pong') {
            addNetworkLog('received', `Gelen mesaj: ${data.type}`);
          }
          
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

            case 'match_reconnect': {
              const { matchId, targetWord: sharedWord, wordLength: len, opponentId, opponentName, matchWordsCount, currentRound, roundsWon, attempts: reconAttempts, currentAttempt: reconCurrAttempt, completed, timeRemaining } = data;
              showToast(`Maça Kaldığın Yerden Devam Ediyorsun! ⚡`, 'info');
              
              setWordLength(len);
              setTargetWord(sharedWord);
              setAttempts(reconAttempts || []);
              setCurrentAttempt('');
              setGameStatus('playing');
              setSecondsLeft(timeRemaining !== undefined ? timeRemaining : 20);
              setWordDefinition('');
              
              // Recompute letter status from reconnected attempts
              const letterStatusesMap: { [key: string]: 'green' | 'orange' | 'grey' } = {};
              if (reconAttempts && reconAttempts.length > 0) {
                reconAttempts.forEach((attempt: any) => {
                  attempt.feedback.forEach((feedbackItem: string, index: number) => {
                    const letter = attempt.word[index];
                    const currentStatus = letterStatusesMap[letter];
                    if (feedbackItem === 'green') {
                      letterStatusesMap[letter] = 'green';
                    } else if (feedbackItem === 'orange' && currentStatus !== 'green') {
                      letterStatusesMap[letter] = 'orange';
                    } else if (feedbackItem === 'grey' && !currentStatus) {
                      letterStatusesMap[letter] = 'grey';
                    }
                  });
                });
              }
              setLetterStatuses(letterStatusesMap);
              setShowLobbyModal(false);
              setMatchmakingStatus('idle');
              setHasEnteredGame(true);
              setRematchRequested(false);
              setOpponentRematchRequested(false);

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
                    attempts: reconAttempts || [],
                    currentAttempt: reconCurrAttempt || 0,
                    completed: completed || false,
                    timeRemaining: timeRemaining !== undefined ? timeRemaining : 20,
                    score: data.score || 0,
                    won: false
                  },
                  [opponentId]: {
                    name: opponentName,
                    attempts: data.opponentStatus?.attempts || [],
                    currentAttempt: data.opponentStatus?.currentAttempt || 0,
                    completed: data.opponentStatus?.completed || false,
                    timeRemaining: data.opponentStatus?.timeRemaining !== undefined ? data.opponentStatus.timeRemaining : 20,
                    score: data.opponentStatus?.score || 0,
                    won: false
                  }
                },
                status: 'playing'
              });
              break;
            }

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
              setRematchRequested(false);
              setOpponentRematchRequested(false);

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
              const { playerUpdate, roundsWon } = data;
              setActiveMatch((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  roundsWon: roundsWon || prev.roundsWon,
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

            case 'match_next_word': {
              const { targetWord: newWord, roundsWon: rw, currentRound: round } = data;
              showToast(`Yeni kelime başladı! Başarılar! 🚀`, 'success');
              
              setTargetWord(newWord);
              setAttempts([]);
              setCurrentAttempt('');
              setGameStatus('playing');
              setSecondsLeft(20);
              setWordDefinition('');
              setLetterStatuses({});

              setActiveMatch((prev) => {
                if (!prev) return null;
                const updatedPlayers = { ...prev.players };
                Object.keys(updatedPlayers).forEach((pId) => {
                  updatedPlayers[pId] = {
                    ...updatedPlayers[pId],
                    attempts: [],
                    currentAttempt: 0,
                    completed: false,
                    won: false,
                    timeRemaining: 20
                  };
                });
                return {
                  ...prev,
                  targetWord: newWord,
                  currentRound: round,
                  roundsWon: rw || prev.roundsWon,
                  players: updatedPlayers
                };
              });
              break;
            }

            case 'rematch_requested': {
              const { by } = data;
              if (by !== profile.id) {
                setOpponentRematchRequested(true);
                showToast('Rakip tekrar oynamak istiyor! 🔄', 'info');
              }
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
                  roundsWon: rw || prev.roundsWon,
                  players: finalPlayers || prev.players
                };
              });

              if (targetWord) {
                fetchTargetWordDefinition(targetWord);
              }

              if (winnerId === profile.id) {
                showToast('TEBRİKLER! Savaşı Kazandın!', 'success');
                // Award Gladiator Badge
                unlockBadge('gladiator');
                updateDailyScore(200);
                triggerVictoryCelebration(settings.soundEnabled);
              } else if (winnerId === 'draw') {
                showToast('Maç berabere bitti!', 'info');
                updateDailyScore(50);
              } else {
                showToast('Maçı rakibin kazandı. Daha hızlı olmalısın!', 'error');
                playDefeatSound(settings.soundEnabled);
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
        
        addNetworkLog('error', `Bağlantı kesildi. Kod: ${event.code}${event.reason ? `, Sebep: ${event.reason}` : ''}`);
        
        if (socketRef.current === ws) {
          setIsOnline(false);
          socketRef.current = null;
          
          // Prevent infinite reconnect fights between multiple tabs/windows of the same user ID
          if (event && event.code === 1000 && event.reason === 'Replaced by new connection') {
            console.warn('Connection closed because it was replaced by another active session/tab. Disabling auto-reconnect.');
            addNetworkLog('info', 'Otomatik yeniden bağlanma iptal edildi (başka aktif oturum algılandı).');
            showToast('Bağlantı başka bir sekme tarafından devralındı.', 'info');
            return;
          }

          // Attempt reconnect after 3 seconds
          if (!isDisposed) {
            addNetworkLog('info', '3 saniye sonra otomatik yeniden bağlanma denenecek.');
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectWS, 3000);
          }
        }
      };

      ws.onerror = (err) => {
        clearTimeout(connTimeout);
        console.warn(`WebSocket connection warning (handled by auto-reconnect) to URL: ${wsUrl}`, err);
        addNetworkLog('error', 'Soket bağlantı hatası oluştu.');
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
    score: number,
    kelime_bulundu_zamani?: number | null
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
        timeRemaining: secondsLeft,
        kelime_bulundu_zamani: kelime_bulundu_zamani || null
      }));
    }
  };

  // Yumuşak Sıfırlama (Soft Reset) Fonksiyonu
  // WebView'da sıfırdan reload yapmadan, reklamları etkilemeden ve performansı bozmadan oyunu temizler.
  const softResetGame = (length: number = wordLength, isDaily: boolean = isDailyPuzzle) => {
    // Optimize AdMob Banner layouts and pause/resume drawing engines on native Android solo game reset
    // This MUST be called at the absolute beginning before any state or DOM updates to lock the native layouts
    if (!activeMatch && typeof window !== 'undefined' && (window as any).AndroidBridge) {
      try {
        if ((window as any).AndroidBridge.onSoloGameReset) {
          (window as any).AndroidBridge.onSoloGameReset();
        }
      } catch (e) {
        console.error("Error calling onSoloGameReset via AndroidBridge:", e);
      }
    }

    // Stop all timer intervals synchronously first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 1. Deneme sayısı sıfırlansın (attempts array'ini boşaltmak deneme sayısını 0 yapar)
    setAttempts([]);
    setCurrentAttempt('');
    
    // 2. Ekrandaki harf kutularının içindeki text'leri temizler ve CSS renk sınıflarını (yeşil/sarı/gri) kaldırır
    // (attempts array'i ve currentAttempt temizlendiğinde React GameBoard component'i otomatik olarak her şeyi varsayılana sıfırlar)
    
    // 3. Oyun klavyesindeki harflerin (sarı/yeşil/gri) durumlarını sıfırla
    setLetterStatuses({});
    
    // 4. Listeden veya API'den yeni kelime değişkenini (targetWord) arka planda güncelle
    let picked = '';
    if (isDaily) {
      const dailyInfo = getDailyWordAndLength();
      picked = dailyInfo.word;
      length = dailyInfo.length;
      setWordLength(length);
    } else {
      const isLevel1 = getLevelForScore(profile.dailyScore) === 1;
      picked = getRandomWord(length, isLevel1);
    }

    setTargetWord(picked);
    setGameStatus('playing');
    setSecondsLeft(20);
    setWordDefinition('');
    setActiveMatch(null); // Çoklu oyuncu oda bağlantısını temizle
    setShowCongratsModal(false); // Tebrikler modalını kapat
  };

  // Start a new solo game
  const startNewGame = async (length: number = wordLength, isDaily: boolean = isDailyPuzzle) => {
    setIsValidating(true);
    softResetGame(length, isDaily);
    setIsValidating(false);
  };

  // Clean up and reset game state when leaving the game screen
  useEffect(() => {
    if (!hasEnteredGame) {
      setGameStatus('idle');
      setAttempts([]);
      setCurrentAttempt('');
      setSecondsLeft(20);
      setShowCongratsModal(false);
    }
  }, [hasEnteredGame]);

  // Trigger game start automatically when word length, gameMode or entering solo game changes
  useEffect(() => {
    if (hasEnteredGame && !activeMatch) {
      startNewGame(wordLength);
    }
  }, [wordLength, gameMode, hasEnteredGame, activeMatch]);

  const handleLeaveMatchToMenu = useCallback(async () => {
    console.log('Centralized cleanup: returning to main menu');
    setHasEnteredGame(false);
    setIsDailyPuzzle(false);
    setActiveMatch(null);
    setGameStatus('idle');
    setMatchmakingStatus('idle');
    setAttempts([]);
    setCurrentAttempt('');
    setSecondsLeft(20);
    setShowCongratsModal(false);
    setShowLobbyModal(false);
    pendingMatchmakingRef.current = null;

    // WebSocket cleanup and reconnection block
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'leave_matchmaking' }));
          socketRef.current.send(JSON.stringify({ type: 'leave_match' }));
        }
      } catch (e) {
        console.error("Error sending leave messages over WebSocket:", e);
      }
      try {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close();
      } catch (e) {
        console.error("Error closing socket in handleLeaveMatchToMenu:", e);
      }
      socketRef.current = null;
    }

    // Force trigger a fresh, clean WebSocket connection on return to menu
    setReconnectCounter((prev) => prev + 1);

    try {
      if (profile && profile.id) {
        await clearMatchmakingState(profile.id);
      }
    } catch (err) {
      console.warn('Database cleanup failed in handleLeaveMatchToMenu:', err);
    }
  }, [profile.id]);

  // Expose yeniKelimeyeBasla globally for Android Native WebView integration
  useEffect(() => {
    (window as any).yeniKelimeyeBasla = () => {
      console.log('Android Native integration triggered: yeniKelimeyeBasla');
      startNewGame(wordLength);
    };
    (window as any).anaMenuyeDon = async () => {
      console.log('Android Native integration triggered: anaMenuyeDon');
      await handleLeaveMatchToMenu();
    };
    return () => {
      delete (window as any).yeniKelimeyeBasla;
      delete (window as any).anaMenuyeDon;
    };
  }, [wordLength, handleLeaveMatchToMenu]);

  // Countdown timer logic
  useEffect(() => {
    // Pause timer if app is not active (backgrounded)
    if (!isAppActive || gameStatus !== 'playing' || isValidating || !hasEnteredGame || isDailyPuzzle || (gameMode === 'untimed' && !activeMatch) || activeMatch) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      // If the game status changes to anything other than playing, immediately abort and clear
      if (gameStatusRef.current !== 'playing') {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time expired - lose game or complete word in active match
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (activeMatch) {
            showToast(`Süre bitti! Rakibin tamamlaması bekleniyor...`, 'error');
            syncMatchState(attempts, attempts.length, true, false, 0);
          } else {
            handleGameLoss('Süre Sınırı Aşıldı');
          }
          return 0;
        }
        const nextSec = prev - 1;
        if (nextSec <= 5 && nextSec >= 1) {
          playCountdownBeepSound(settings.soundEnabled, nextSec);
        }
        return nextSec;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAppActive, gameStatus, attempts.length, isValidating, hasEnteredGame, gameMode, activeMatch, isDailyPuzzle, targetWord]); // Resets interval on attempt submission or validation change or exit or gameMode change

  // Fetch direct definition for the target word
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
      setWordDefinition('Bu kelimenin resmi sözlük tanımına şu an ulaşılamıyor.');
    } catch (e) {
      console.error('Failed to fetch target word definition:', e);
      setWordDefinition('Bu kelimenin resmi sözlük tanımına şu an ulaşılamıyor.');
    }
  };

  // Prefetch target word definition in the background when the target word is determined (active game)
  useEffect(() => {
    if (targetWord) {
      fetchTargetWordDefinition(targetWord);
    } else {
      setWordDefinition('');
    }
  }, [targetWord]);

  const renderWordDefinition = (themeColor: 'emerald' | 'rose') => {
    if (!wordDefinition) return null;

    if (wordDefinition === 'loading') {
      return (
        <div className="w-full max-w-sm mx-auto p-4 bg-black/10 rounded-2xl border border-[#3E485A] flex items-center justify-center gap-2 animate-pulse py-4 text-center my-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-[10px] text-gray-400 font-medium tracking-wide font-sans">
            Kelime anlamı yükleniyor...
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
            📖 KELİME ANLAMI
          </span>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(turkishLower(targetWord) + ' ne demek')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-0.5"
          >
            Google'da Ara ↗
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
    // Stabilize AdMob banner views on Android when game is over to prevent recalculation layout loops
    // This MUST be called at the absolute beginning before any state or DOM updates to freeze/prevent layout loop flickering
    if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.preventAdLayoutLoops) {
      try {
        (window as any).AndroidBridge.preventAdLayoutLoops();
      } catch (e) {
        console.error("Error calling preventAdLayoutLoops on loss:", e);
      }
    }

    setGameStatus('lost');
    
    // Stop all timer intervals synchronously first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    showToast(`Oyunu Kaybettiniz: ${reason}! Doğru Kelime: ${targetWord}`, 'error');
    playDefeatSound(settings.soundEnabled);
    
    // Fetch definition for targetWord so the user can learn its meaning even on loss!
    if (targetWord) {
      fetchTargetWordDefinition(targetWord);
    }

    if (isDailyPuzzle) {
      const { dateStr } = getDailyWordAndLength();
      safeLocalStorage.setItem('kelimesavasi_daily_completed_date', dateStr);
      safeLocalStorage.setItem('last_played_date', dateStr);
      safeLocalStorage.setItem('is_daily_completed', 'true');
      if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.saveDailyPuzzleStatus) {
        try {
          (window as any).AndroidBridge.saveDailyPuzzleStatus(dateStr, true);
        } catch (e) {
          console.error(e);
        }
      }
      setIsDailyPuzzleCompletedToday(true);
      syncDailyPuzzleProgress(attempts, false, true);
      scheduleDailyNotifications();
    }

    // Increment gamesPlayed and reset streak
    setProfile((prev) => {
      const newStats = {
        ...prev.stats,
        gamesPlayed: prev.stats.gamesPlayed + 1,
        currentStreak: 0
      };

      const badgesToUnlockOnLoss = new Set<string>();
      if (newStats.gamesPlayed >= 1) {
        badgesToUnlockOnLoss.add('first_step');
      }
      if (newStats.gamesPlayed >= 25) {
        badgesToUnlockOnLoss.add('persistent_player');
      }

      const newlyUnlocked: Badge[] = [];
      const updatedBadges = prev.badges.map((b) => {
        if (badgesToUnlockOnLoss.has(b.id) && !b.unlockedAt) {
          const unlockedB = { ...b, unlockedAt: new Date().toISOString() };
          newlyUnlocked.push(unlockedB);
          return unlockedB;
        }
        return b;
      });

      if (newlyUnlocked.length > 0) {
        setTimeout(() => {
          newlyUnlocked.forEach((b, idx) => {
            setTimeout(() => {
              showToast(`🏆 YENİ ROZET KAZANILDI: ${b.title}!`, 'success');
              if (idx === 0) {
                setUnlockedBadgeToShow(b);
              }
            }, idx * 1000);
          });
        }, 500);
      }

      return {
        ...prev,
        stats: newStats,
        badges: updatedBadges,
        lastUpdated: new Date().toISOString()
      };
    });

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
    const isAnyPlayerSolved = activeMatch ? Object.values(activeMatch.players).some((p: any) => p.won) : false;
    const localCompleted = activeMatch?.players[profile.id]?.completed || activeMatch?.status === 'ended' || isAnyPlayerSolved;
    if (localCompleted || gameStatus !== 'playing') {
      return;
    }

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
      let isConnectionError = false;

      if (dictionaryMode === 'no_validation') {
        isValid = true;
        definition = 'Doğrulama dışı serbest oyun modu.';
      } else {
        // 1. Check local persistent cache
        const cached = getCachedWord(guess, wordLength);
        if (cached) {
          isValid = cached.valid;
          definition = cached.definition;
        } else {
          // 2. Local heuristic check first (linguistics)
          const linguisticCheck = validateTurkishLinguistics(guess, wordLength);
          if (!linguisticCheck.valid) {
            isValid = false;
            definition = linguisticCheck.reason;
            setCachedWord(guess, wordLength, { valid: false, definition: linguisticCheck.reason });
          } else {
            // 3. Robust client-side validation (Local List + Wikisözlük fallback)
            try {
              const res = await validateWordClientSide(guess, wordLength);
              isValid = res.valid;
              definition = res.definition;
              setCachedWord(guess, wordLength, { valid: res.valid, definition: res.definition });
            } catch (validationErr: any) {
              console.error('[Kelime Doğrulama] Ön yüz doğrulaması başarısız oldu:', validationErr);
              // Fallback if everything is broken - let the user play
              isValid = true;
              definition = 'Kelime anlamı şu anda doğrulanamadı ancak kelime geçerlidir.';
            }
          }
        }
      }

      if (!isValid) {
        if (isConnectionError) {
          showToast('Bağlantı hatası oluştu.', 'error');
        } else {
          showToast('Kelime sözlükte bulunamadı.', 'error');
        }
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
      setCurrentAttempt('');

      // Check if won
      const hasWon = feedback.every((f) => f === 'green');

      if (isDailyPuzzle) {
        const solved = hasWon;
        const failed = !hasWon && updatedAttempts.length >= 6;
        syncDailyPuzzleProgress(updatedAttempts, solved, failed);
      }
      let scoreAwarded = 0;
      if (hasWon) {
        if (isDailyPuzzle) {
          scoreAwarded = 5;
        } else {
          const attemptsCount = updatedAttempts.length;
          scoreAwarded = calculateDynamicScore(wordLength, secondsLeft, attemptsCount, isDailyPuzzle);
          
          // Verification function to ensure scoring accuracy and reject invalid edge cases
          if (!verifyScoringAccuracy(scoreAwarded)) {
            console.warn(`Scoring verification failed for calculated score: ${scoreAwarded}. Falling back to 50.`);
            scoreAwarded = 50;
          }
        }
      }

      if (activeMatch) {
        if (hasWon) {
          showToast(`TEBRİKLER! Savaşı Kazandın!`, 'success');
          playEnterSound(settings.soundEnabled);
          
          // Get opponent info
          const opponentEntry = Object.entries(activeMatch.players).find(([pId]) => pId !== profile.id);
          const loserId = opponentEntry ? opponentEntry[0] : 'rakip_id';
          const loserName = opponentEntry ? (opponentEntry[1] as any).name : 'Rakip';
          const loserScore = opponentEntry ? ((opponentEntry[1] as any).score || 0) : 0;
          
          // Sync match state first
          syncMatchState(updatedAttempts, updatedAttempts.length, true, true, scoreAwarded, Date.now());

          // Stop all timer intervals
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Set game status to block keyboard listeners
          setGameStatus('idle');
          
          // Force set isMatchEndedRef.current to true so keyboard listener ignores any events
          isMatchEndedRef.current = true;
          
          // Close the websocket to stop receiving or sending any more messages
          if (socketRef.current) {
            try {
              socketRef.current.close();
            } catch (e) {
              console.error("Error closing socket:", e);
            }
            socketRef.current = null;
          }

          // Redirect instantly to ResultActivity via AndroidBridge
          if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
            try {
              (window as any).AndroidBridge.loadAdBackground();
              if ((window as any).AndroidBridge.redirectToResultActivity) {
                console.log("Instantly directing winner to native ResultActivity via AndroidBridge...");
                (window as any).AndroidBridge.redirectToResultActivity(
                  profile.id,
                  profile.name,
                  scoreAwarded,
                  loserId,
                  loserName,
                  loserScore,
                  activeMatch.targetWord || targetWord || '',
                  true // isWinner = true
                );
              }
            } catch (e) {
              console.error("Error calling native AndroidBridge:", e);
            }
          }
        } else if (updatedAttempts.length >= 6) {
          showToast(`6 tahmin hakkınız tükendi! Rakibin de tamamlaması bekleniyor... Doğru kelime: ${targetWord}`, 'info');
          playDefeatSound(settings.soundEnabled);
          
          // Send completed=true, won=false state to the server and wait
          syncMatchState(updatedAttempts, updatedAttempts.length, true, false, 0);
        } else {
          playEnterSound(settings.soundEnabled);
          syncMatchState(updatedAttempts, updatedAttempts.length, false, false, 0);
        }
      } else {
        if (hasWon) {
          setGameStatus('won');
          
          // Stop all timer intervals synchronously first to avoid background ticks or flickering
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Stabilize AdMob banner views on Android when game is over/won to prevent recalculation layout loops
          if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.preventAdLayoutLoops) {
            try {
              (window as any).AndroidBridge.preventAdLayoutLoops();
            } catch (e) {
              console.error("Error calling preventAdLayoutLoops on win:", e);
            }
          }
          
          setShowCongratsModal(true);
          if (targetWord) {
            fetchTargetWordDefinition(targetWord);
          } else {
            setWordDefinition(definition || 'Kelime başarılı bir şekilde çözüldü.');
          }
          if (isDailyPuzzle) {
            showToast(`☀️ GÜNLÜK BULMACA TAMAMLANDI! +${scoreAwarded} Puan & 'Günlük Bilge' Rozeti!`, 'success');
          } else {
            showToast(`TEBRİKLER! Kelimeyi doğru bildiniz! +${scoreAwarded} Puan`, 'success');
          }
          triggerVictoryCelebration(settings.soundEnabled);
          
          // Update user statistics & milestones
          handleGameWin(updatedAttempts.length, scoreAwarded);
        } else if (updatedAttempts.length >= 6) {
          handleGameLoss();
        } else {
          // Continue playing, reset timer back to 20s
          setSecondsLeft(20);
          if (gameMode === 'timed' && !isDailyPuzzle) {
            showToast('Deneme kabul edildi. Süre sıfırlandı!', 'success');
          }
          playEnterSound(settings.soundEnabled);
        }
      }

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

      // Beş puandan fazla ödül hiçbir şekilde verilmesin. Puan silme diye de bir ceza olmasın.
      const cappedScoreAwarded = scoreAwarded > 0 ? Math.min(scoreAwarded, 5) : 0;
      const newScore = prev.dailyScore + cappedScoreAwarded;
      setTimeout(() => {
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
          scoreEl.innerText = `${newScore} Puan`;
        }
      }, 0);

      // Missions to update progress
      const missionIncrements: { [key: string]: number } = {
        play: 1,
        win: 1,
        streak: 1,
        [`solve_${wordLength}`]: 1,
      };
      if (secondsLeft > 10) {
        missionIncrements['fast_solve'] = 1;
      }
      if (attemptCount === 1) {
        missionIncrements['perfect'] = 1;
      }

      // Compute updated missions and collect newly completed ones
      const newlyCompletedMissions: typeof prev.missions = [];
      const updatedMissions = prev.missions.map((m) => {
        const inc = missionIncrements[m.type];
        if (inc && !m.completed) {
          const newCurrent = m.current + inc;
          const isCompleted = newCurrent >= m.target;
          const updatedM = {
            ...m,
            current: newCurrent,
            completed: isCompleted
          };
          if (isCompleted) {
            newlyCompletedMissions.push(updatedM);
          }
          return updatedM;
        }
        return m;
      });

      // Determine which badges should be unlocked
      const badgesToUnlock = new Set<string>();
      if (updatedStats.gamesPlayed >= 1) {
        badgesToUnlock.add('first_step');
      }
      if (updatedStats.gamesWon >= 1) {
        badgesToUnlock.add('champion');
      }
      if (secondsLeft > 10) {
        badgesToUnlock.add('lightning');
      }
      if (attemptCount <= 2) {
        badgesToUnlock.add('flawless');
      }
      if (wordLength === 8) {
        badgesToUnlock.add('genius');
      }
      if (isDailyPuzzle) {
        const { dateStr } = getDailyWordAndLength();
        safeLocalStorage.setItem('kelimesavasi_daily_completed_date', dateStr);
        safeLocalStorage.setItem('last_played_date', dateStr);
        safeLocalStorage.setItem('is_daily_completed', 'true');
        setTimeout(() => {
          if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.saveDailyPuzzleStatus) {
            try {
              (window as any).AndroidBridge.saveDailyPuzzleStatus(dateStr, true);
            } catch (e) {
              console.error(e);
            }
          }
          setIsDailyPuzzleCompletedToday(true);
        }, 0);
        badgesToUnlock.add('daily_puzzle_solver');
        scheduleDailyNotifications();
      }
      if (updatedStats.gamesWon >= 10) {
        badgesToUnlock.add('word_detective');
      }
      if (updatedStats.gamesWon >= 50) {
        badgesToUnlock.add('word_guru');
      }
      if (updatedStats.gamesWon >= 100) {
        badgesToUnlock.add('word_master');
      }
      if (updatedStats.gamesPlayed >= 25) {
        badgesToUnlock.add('persistent_player');
      }
      if (secondsLeft >= 15) {
        badgesToUnlock.add('quick_draw');
      }
      if (updatedStats.currentStreak >= 5) {
        badgesToUnlock.add('streak_master');
      }
      if (updatedStats.currentStreak >= 10) {
        badgesToUnlock.add('legend');
      }
      if (attemptCount === 1) {
        badgesToUnlock.add('perfect_brain');
      }
      const totalCompletedMissions = updatedMissions.filter(m => m.completed).length;
      if (totalCompletedMissions >= 5) {
        badgesToUnlock.add('mission_seeker');
      }
      if (totalCompletedMissions >= 20) {
        badgesToUnlock.add('mission_lord');
      }
      const solve3 = updatedMissions.find(m => m.type === 'solve_3')?.current || 0;
      const solve4 = updatedMissions.find(m => m.type === 'solve_4')?.current || 0;
      const solve5 = updatedMissions.find(m => m.type === 'solve_5')?.current || 0;
      const solve6 = updatedMissions.find(m => m.type === 'solve_6')?.current || 0;
      const solve7 = updatedMissions.find(m => m.type === 'solve_7')?.current || 0;
      const solve8 = updatedMissions.find(m => m.type === 'solve_8')?.current || 0;
      if (solve3 >= 1 && solve4 >= 1 && solve5 >= 1 && solve6 >= 1 && solve7 >= 1 && solve8 >= 1) {
        badgesToUnlock.add('polymath');
      }

      // Compute updated badges array and collect newly unlocked badges
      const newlyUnlockedBadges: Badge[] = [];
      const updatedBadges = prev.badges.map((b) => {
        if (badgesToUnlock.has(b.id) && !b.unlockedAt) {
          const unlockedBadge = { ...b, unlockedAt: new Date().toISOString() };
          newlyUnlockedBadges.push(unlockedBadge);
          return unlockedBadge;
        }
        return b;
      });

      // Safely schedule UI toasts and modals on the macro-task event queue
      setTimeout(() => {
        let staggerDelay = 100;
        
        // Show newly completed missions
        newlyCompletedMissions.forEach((m) => {
          setTimeout(() => {
            showToast(`🎯 GÜNLÜK GÖREV TAMAMLANDI: ${m.title}!`, 'success');
          }, staggerDelay);
          staggerDelay += 800;
        });

        // Show newly unlocked badges and trigger modal
        newlyUnlockedBadges.forEach((b, idx) => {
          setTimeout(() => {
            showToast(`🏆 YENİ ROZET KAZANILDI: ${b.title}!`, 'success');
            if (idx === 0) {
              setUnlockedBadgeToShow(b);
            }
          }, staggerDelay);
          staggerDelay += 1000;
        });
      }, 0);

      return {
        ...prev,
        stats: updatedStats,
        dailyScore: newScore,
        badges: updatedBadges,
        missions: updatedMissions,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  // Profile Badges unlocking
  const unlockBadge = (id: string) => {
    setProfile((prev) => {
      let newlyUnlocked: Badge | null = null;
      const badges = prev.badges.map((b) => {
        if (b.id === id && !b.unlockedAt) {
          showToast(`🏆 YENİ ROZET KAZANILDI: ${b.title}!`, 'success');
          newlyUnlocked = { ...b, unlockedAt: new Date().toISOString() };
          return newlyUnlocked;
        }
        return b;
      });
      if (newlyUnlocked) {
        setUnlockedBadgeToShow(newlyUnlocked);
      }
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
    // Beş puandan fazla ödül hiçbir şekilde verilmesin. Puan silme diye de bir ceza olmasın.
    if (score <= 0) return;
    const cappedScore = Math.min(score, 5);
    setProfile((prev) => {
      const newScore = prev.dailyScore + cappedScore;
      setTimeout(() => {
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
          scoreEl.innerText = `${newScore} Puan`;
        }
      }, 0);
      return {
        ...prev,
        dailyScore: newScore
      };
    });
  };

  // Reset User stats
  const resetStats = () => {
    showConfirm(
      'İstatistikleri Sıfırla',
      'Tüm ilerleme ve istatistiklerinizi sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.',
      () => {
        setTimeout(() => {
          const scoreEl = document.getElementById('score');
          if (scoreEl) {
            scoreEl.innerText = '0 Puan';
          }
        }, 0);
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
    const isAnyPlayerSolved = activeMatch ? Object.values(activeMatch.players).some((p: any) => p.won) : false;
    const localCompleted = activeMatch?.players[profile.id]?.completed || activeMatch?.status === 'ended' || isAnyPlayerSolved;
    if (gameStatus !== 'playing' || isValidating || localCompleted) return;
    const normalized = turkishUpper(char);
    if (currentAttempt.length < wordLength && /^[A-ZÇĞİÖŞÜ]$/i.test(normalized)) {
      setCurrentAttempt((prev) => prev + normalized);
      playClickSound(settings.soundEnabled);
    }
  };

  // Handle Backspace
  const onDelete = () => {
    const isAnyPlayerSolved = activeMatch ? Object.values(activeMatch.players).some((p: any) => p.won) : false;
    const localCompleted = activeMatch?.players[profile.id]?.completed || activeMatch?.status === 'ended' || isAnyPlayerSolved;
    if (gameStatus !== 'playing' || isValidating || localCompleted) return;
    if (currentAttempt.length > 0) {
      playDeleteSound(settings.soundEnabled);
    }
    setCurrentAttempt((prev) => prev.slice(0, -1));
  };

  // References to keep the physical keyboard listener persistent and prevent listener duplication/conflicts
  const currentAttemptRef = useRef(currentAttempt);
  const gameStatusRef = useRef(gameStatus);
  const isValidatingRef = useRef(isValidating);
  const isEditingNameRef = useRef(isEditingName);
  const showStatsModalRef = useRef(showStatsModal);
  const showLobbyModalRef = useRef(showLobbyModal);
  const showCongratsModalRef = useRef(showCongratsModal);
  const wordLengthRef = useRef(wordLength);
  const onCharRef = useRef(onChar);
  const onDeleteRef = useRef(onDelete);
  const submitGuessRef = useRef(submitGuess);
  const isMatchEndedRef = useRef(false);

  useEffect(() => {
    currentAttemptRef.current = currentAttempt;
    gameStatusRef.current = gameStatus;
    isValidatingRef.current = isValidating;
    isEditingNameRef.current = isEditingName;
    showStatsModalRef.current = showStatsModal;
    showLobbyModalRef.current = showLobbyModal;
    showCongratsModalRef.current = showCongratsModal;
    wordLengthRef.current = wordLength;
    onCharRef.current = onChar;
    onDeleteRef.current = onDelete;
    submitGuessRef.current = submitGuess;
    isMatchEndedRef.current = isMatchEnded;
  });

  // Bind physical keyboard listeners exactly once on mount to prevent double keypresses and WebView input lag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.metaKey || 
        e.ctrlKey || 
        e.altKey || 
        isEditingNameRef.current || 
        showStatsModalRef.current || 
        showLobbyModalRef.current ||
        showCongratsModalRef.current ||
        gameStatusRef.current !== 'playing' ||
        isValidatingRef.current ||
        isMatchEndedRef.current
      ) {
        return;
      }

      if (e.key === 'Enter') {
        submitGuessRef.current();
      } else if (e.key === 'Backspace') {
        onDeleteRef.current();
      } else {
        const key = turkishUpper(e.key);
        if (key.length === 1 && /^[A-ZÇĞİÖŞÜ]$/i.test(key)) {
          onCharRef.current(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleLeaveMatch = async () => {
    if (activeMatch && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'leave_match',
        matchId: activeMatch.id
      }));
    }
    setActiveMatch(null);
    setHasEnteredGame(false);
    startNewGame(wordLength);

    // Clean up matchmaking and room states in Firestore
    try {
      if (profile && profile.id) {
        await clearMatchmakingState(profile.id);
      }
    } catch (err) {
      console.warn('Database cleanup failed in handleLeaveMatch:', err);
    }
  };



  const handleStartMatchmaking = async (matchWordsCount?: number) => {
    if (!isOnline) {
      showToast('Kuyruğa girmek için sunucuya bağlı olmalısınız. Lütfen bekleyin veya çevrimdışı modu oynayın.', 'error');
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      showToast('Sunucu bağlantısı kuruluyor, lütfen birkaç saniye sonra tekrar deneyin.', 'info');
      setReconnectCounter(prev => prev + 1);
      return;
    }

    if (matchmakingStatus === 'queued') {
      socketRef.current.send(JSON.stringify({
        type: 'leave_matchmaking'
      }));
      setMatchmakingStatus('idle');
      try {
        if (profile && profile.id) {
          await clearMatchmakingState(profile.id);
        }
      } catch (err) {
        console.warn('Database cleanup failed in handleStartMatchmaking leave:', err);
      }
    } else {
      // RADICAL CLEANUP BEFORE STARTING MATCHMAKING
      console.log("Radical matchmaking starting: performing complete database and socket cleanup first...");
      setMatchmakingStatus('idle');
      setActiveMatch(null);
      setGameStatus('idle');
      setAttempts([]);
      setCurrentAttempt('');
      
      try {
        if (profile && profile.id) {
          await clearMatchmakingState(profile.id);
        }
      } catch (err) {
        console.warn('Database cleanup failed in handleStartMatchmaking join:', err);
      }

      // No redundant leave messages or timeout! Connect immediately to prevent race conditions.
      socketRef.current.send(JSON.stringify({
        type: 'join_matchmaking',
        wordLength,
        matchWordsCount: matchWordsCount || 1
      }));
      setMatchmakingStatus('queued');
    }
  };

  const syncDailyPuzzleProgress = async (updatedAttempts: GameAttempt[], solved: boolean, failed: boolean) => {
    try {
      await fetch('/api/daily-puzzle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          attempts: updatedAttempts,
          solved,
          failed
        })
      });
    } catch (e) {
      console.error('Error syncing daily puzzle progress:', e);
    }
  };

  const todayDateStr = getDailyWordAndLength().dateStr;

  const handleStartDailyPuzzle = async () => {
    if (isDailyPuzzleCompletedToday) {
      showToast('Bugünkü hakkınızı doldurdunuz, yeni kelime yarın gelecek!', 'info');
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`/api/daily-puzzle?deviceId=${encodeURIComponent(deviceId)}`);
      if (!response.ok) {
        throw new Error('Could not fetch daily puzzle status');
      }
      const data = await response.json();
      const dailyInfo = getDailyWordAndLength();

      if (data.solved || data.failed) {
        showToast('Bugünkü hakkınızı doldurdunuz, yeni kelime yarın gelecek!', 'info');
        safeLocalStorage.setItem('kelimesavasi_daily_completed_date', dailyInfo.dateStr);
        safeLocalStorage.setItem('last_played_date', dailyInfo.dateStr);
        safeLocalStorage.setItem('is_daily_completed', 'true');
        if (typeof window !== 'undefined' && (window as any).AndroidBridge && (window as any).AndroidBridge.saveDailyPuzzleStatus) {
          try {
            (window as any).AndroidBridge.saveDailyPuzzleStatus(dailyInfo.dateStr, true);
          } catch (e) {
            console.error(e);
          }
        }
        setIsDailyPuzzleCompletedToday(true);
        scheduleDailyNotifications();
        setIsValidating(false);
        return;
      }

      setIsDailyPuzzle(true);
      setHasEnteredGame(true);
      
      setWordLength(dailyInfo.length);
      setTargetWord(dailyInfo.word);
      setSecondsLeft(20);
      setWordDefinition('');
      setLetterStatuses({});
      setActiveMatch(null);

      if (data.attempts && data.attempts.length > 0) {
        setAttempts(data.attempts);
        setCurrentAttempt('');
        
        const letterStatusesMap: { [key: string]: 'green' | 'orange' | 'grey' } = {};
        data.attempts.forEach((attempt: GameAttempt) => {
          attempt.feedback.forEach((feedbackItem, index) => {
            const letter = attempt.word[index];
            const status = feedbackItem;
            const currentStatus = letterStatusesMap[letter];
            if (status === 'green') {
              letterStatusesMap[letter] = 'green';
            } else if (status === 'orange' && currentStatus !== 'green') {
              letterStatusesMap[letter] = 'orange';
            } else if (status === 'grey' && !currentStatus) {
              letterStatusesMap[letter] = 'grey';
            }
          });
        });
        setLetterStatuses(letterStatusesMap);
        showToast('Kaldığınız yerden devam ediyorsunuz!', 'success');
      } else {
        setAttempts([]);
        setCurrentAttempt('');
      }

      setGameStatus('playing');
    } catch (error) {
      console.error('Error loading daily puzzle:', error);
      setIsDailyPuzzle(true);
      setHasEnteredGame(true);
      const dailyInfo = getDailyWordAndLength();
      startNewGame(dailyInfo.length, true);
    } finally {
      setIsValidating(false);
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
        return 'bg-app-sapphire text-theme-primary';
      case 'forest':
        return 'bg-app-forest text-theme-primary';
      case 'amethyst':
        return 'bg-app-amethyst text-theme-primary';
      case 'nord':
        return 'bg-app-nord text-theme-primary';
      case 'default':
      default:
        return 'bg-app-default text-theme-primary';
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
  const isMatchEnded = !!(activeMatch && (activeMatch.status === 'ended' || Object.values(activeMatch.players).some((p: any) => p.won)));

  // Triggers when 1v1 match ends (isMatchEnded turns true) or when user exits a match, loading AdMob asynchronously in the background and freeing layout calculations
  useEffect(() => {
    if (isMatchEnded && activeMatch) {
      console.log("1v1 Match ended. Executing layout freeze and scheduling background AdMob banner load.");
      
      // Force block game input states immediately
      setGameStatus('idle');

      // Stop all timer intervals
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Force set isMatchEndedRef.current to true so keyboard listener ignores any events
      isMatchEndedRef.current = true;

      // Identify Winner & Loser
      const playersList = Object.entries(activeMatch.players);
      let winnerId = '';
      let winnerName = 'Bilinmeyen Oyuncu';
      let winnerScore = 0;
      let loserId = '';
      let loserName = 'Bilinmeyen Oyuncu';
      let loserScore = 0;

      const winnerEntry = playersList.find(([_, pState]: [string, any]) => pState.won);
      if (winnerEntry) {
        winnerId = winnerEntry[0];
        winnerName = (winnerEntry[1] as any).name || 'Oyuncu';
        winnerScore = (winnerEntry[1] as any).score || 0;

        const loserEntry = playersList.find(([pId, _]: [string, any]) => pId !== winnerId);
        if (loserEntry) {
          loserId = loserEntry[0];
          loserName = (loserEntry[1] as any).name || 'Oyuncu';
          loserScore = (loserEntry[1] as any).score || 0;
        }
      } else if (activeMatch.winnerId && activeMatch.winnerId !== 'draw') {
        winnerId = activeMatch.winnerId;
        const winnerPlayer = activeMatch.players[winnerId];
        if (winnerPlayer) {
          winnerName = (winnerPlayer as any).name || 'Oyuncu';
          winnerScore = (winnerPlayer as any).score || 0;
        }

        const loserEntry = playersList.find(([pId, _]: [string, any]) => pId !== winnerId);
        if (loserEntry) {
          loserId = loserEntry[0];
          loserName = (loserEntry[1] as any).name || 'Oyuncu';
          loserScore = (loserEntry[1] as any).score || 0;
        }
      } else {
        // Fallback or Tie
        const sorted = [...playersList].sort((a: any, b: any) => (b[1].score || 0) - (a[1].score || 0));
        if (sorted[0]) {
          winnerId = sorted[0][0];
          winnerName = (sorted[0][1] as any).name || 'Oyuncu';
          winnerScore = (sorted[0][1] as any).score || 0;
        }
        if (sorted[1]) {
          loserId = sorted[1][0];
          loserName = (sorted[1][1] as any).name || 'Oyuncu';
          loserScore = (sorted[1][1] as any).score || 0;
        }
      }

      if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
        try {
          (window as any).AndroidBridge.loadAdBackground();
          if ((window as any).AndroidBridge.redirectToResultActivity) {
            console.log("Directing both players to native ResultActivity...");
            (window as any).AndroidBridge.redirectToResultActivity(
              winnerId,
              winnerName,
              winnerScore,
              loserId,
              loserName,
              loserScore,
              activeMatch.targetWord || '',
              winnerId === profile.id // isWinner
            );
          }
        } catch (e) {
          console.error("Error calling native AndroidBridge:", e);
        }
      }
    }
  }, [isMatchEnded, activeMatch]);

  const isAndroidApp = typeof window !== 'undefined' && !!(window as any).AndroidBridge;

  return (
    <div className={`h-screen max-h-screen overflow-hidden flex flex-col transition-all duration-300 ${getBgThemeClass()} ${getFontFamilyClass()} ${isAndroidApp ? 'android-hybrid' : ''}`}>
      {/* Safe Space for Future Top Banner Ad */}
      <div className="h-[50px] w-full shrink-0 flex items-center justify-center border-b border-[#3E485A]/15 bg-black/35 text-[#FAF6E9]/40 font-mono text-[9px] tracking-widest select-none uppercase" id="top-ad-placeholder">
      </div>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-stretch justify-stretch w-full max-w-full relative overflow-hidden">
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
            <p className="text-sm font-bold text-[#FAF6E9]/60">Kullanıcı Oturumu Hazırlanıyor...</p>
          </div>
        ) : !firebaseUser ? (
          <AuthScreen
            onAuthComplete={(updatedProfile, fUser) => {
              // Ensure deviceId is stored on the registered/logged-in profile!
              if (!updatedProfile.deviceId || updatedProfile.deviceId !== deviceId) {
                updatedProfile.deviceId = deviceId;
                saveUserProfileToFirestore(updatedProfile);
              }
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
        ) : !hasEnteredGame ? (
          <WelcomeScreen
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onUpdateFriends={async (newFriends: string[]) => {
              const updated = {
                ...profile,
                friends: newFriends
              };
              setProfile(updated);
              await saveUserProfileToFirestore(updated);
            }}
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
            onStartDailyPuzzle={handleStartDailyPuzzle}
            isDailyPuzzleCompletedToday={isDailyPuzzleCompletedToday}
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
                            setIsDailyPuzzle(false);
                          }
                        );
                      } else {
                        setHasEnteredGame(false);
                        setIsDailyPuzzle(false);
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
                        if (isDailyPuzzle) {
                          showConfirm(
                            'Yeniden Dene',
                            'Günün Bulmacasını sıfırlayıp tekrar denemek istiyor musunuz?',
                            () => {
                              startNewGame(wordLength, true);
                            }
                          );
                          return;
                        }
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
        <div className="w-full flex-1 min-h-0 flex flex-col items-stretch justify-stretch gap-0.5 sm:gap-1 relative z-10">
          {/* Game Area Card */}
          <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto card-theme rounded-[1.5rem] border border-[#3E485A]/30 p-2 sm:p-3 shadow-2xl flex flex-col items-center justify-between flex-1 min-h-0 overflow-hidden gap-y-0.5 transition-all duration-200 relative text-white" id="game-area-card">
          {/* Subtle atmospheric ambient glow inside the card */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          {isMatchEnded && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
              <h2 className="text-xl font-black text-white tracking-wide mb-2 uppercase">DÜELLO TAMAMLANDI!</h2>
              <p className="text-xs text-slate-400">Sonuç ekranına güvenli bir şekilde yönlendiriliyorsunuz...</p>
            </div>
          )}

          {/* Top Timer & Attempts Tracker */}
          {!isMatchEnded && (
            <div className="w-full flex justify-between items-center mb-2 px-1 border-b border-[#3E485A]/40 pb-2 relative z-10">
              {gameStatus === 'playing' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" />
                    <span className="text-xs font-bold text-gray-300 font-mono">
                      Deneme: {attempts.length}/6
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {gameMode === 'timed' && !activeMatch && !isDailyPuzzle ? (
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
          )}

          {/* Spacer A */}
          {gameStatus === 'playing' && !isMatchEnded && (
            <div className="flex-1 min-h-[0.25rem] sm:min-h-[0.5rem]" />
          )}

          {/* Letter Grid */}
          {!isMatchEnded && (
            <GameBoard
              attempts={attempts}
              currentAttempt={currentAttempt}
              wordLength={wordLength}
              boardTheme={settings.boardTheme}
              isGameOver={gameStatus !== 'playing'}
            />
          )}

          {/* Victory Celebration is now handled via the lightweight showCongratsModal popup to prevent layout shifts, lag and WebView/AdMob crashes */}

          {/* Standard Game Over (Loss) Screen */}
          {gameStatus === 'lost' && !activeMatch && (
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

              <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
                <button
                  onClick={() => startNewGame(wordLength)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-5 rounded-xl shadow-md shadow-emerald-500/15 text-[11px] uppercase tracking-wider active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                  id="loss-retry-button"
                >
                  <RotateCcw size={12} className="stroke-[2.5]" />
                  <span>Yeni Kelime ile Başla</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound(settings.soundEnabled);
                    setHasEnteredGame(false);
                    setIsDailyPuzzle(false);
                  }}
                  className="bg-slate-700 hover:bg-slate-650 text-slate-200 font-bold py-2.5 px-5 rounded-xl border border-[#3E485A] text-[11px] uppercase tracking-wider active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                  id="loss-back-to-lobby-button"
                >
                  <ArrowLeft size={12} className="stroke-[2.5]" />
                  <span>Ana Sayfaya Dön</span>
                </button>
              </div>
            </div>
          )}

          {/* Spacer B */}
          {gameStatus === 'playing' && (
            <div className="flex-1 min-h-[0.25rem] sm:min-h-[0.5rem]" />
          )}

          {/* Loading validation block */}
          {isValidating && (
            <div className="text-xs text-gray-400 dark:text-gray-500 animate-pulse font-mono flex items-center gap-1.5 py-1 shrink-0">
              <RotateCcw className="animate-spin" size={12} />
              Sözlük doğrulaması yapılıyor...
            </div>
          )}

          {/* Action Buttons Above Keyboard */}
          {!isMatchEnded && (gameStatus === 'playing' || !activeMatch) && !(activeMatch && activeMatch.players[profile.id]?.completed) && (
            <BottomBar
              currentGuess={currentAttempt}
              wordLength={wordLength}
              isValidating={isValidating}
              onClear={() => {
                if (currentAttempt.length > 0) {
                  setCurrentAttempt('');
                  playDeleteSound(settings.soundEnabled);
                }
              }}
              onSubmit={submitGuess}
              disabled={gameStatus !== 'playing'}
            />
          )}

          {/* Spacer C */}
          {!isMatchEnded && (gameStatus === 'playing' || !activeMatch) && !(activeMatch && activeMatch.players[profile.id]?.completed) && (
            <div className="flex-1 min-h-[0.25rem] sm:min-h-[0.5rem]" />
          )}

          {/* Virtual Keyboard */}
          {!isMatchEnded && (gameStatus === 'playing' || !activeMatch) && !(activeMatch && activeMatch.players[profile.id]?.completed) && (
            <Keyboard
              onChar={onChar}
              onDelete={onDelete}
              onEnter={submitGuess}
              letterStatuses={letterStatuses}
              keyboardLayout={settings.keyboardLayout}
              boardTheme={settings.boardTheme}
              disabled={gameStatus !== 'playing'}
            />
          )}

          {/* Waiting for Opponent Card */}
          {!isMatchEnded && activeMatch && activeMatch.players[profile.id]?.completed && activeMatch.status !== 'ended' && (
            <div className="w-full max-w-sm mx-auto bg-slate-900/95 border border-amber-500/25 rounded-3xl p-5 text-center space-y-4 shadow-xl animate-scale-up" id="opponent-waiting-container">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin flex items-center justify-center">
                    <Hourglass size={18} className="text-amber-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-sm font-black text-[#FAF6E9] tracking-wide mt-3 uppercase">RAKİP BEKLENİYOR...</h3>
                <p className="text-[10px] text-gray-400 mt-1 max-w-xs leading-normal">
                  Siz kelimeyi tamamladınız. Rakibinizin de kelimeyi bitirmesi bekleniyor. Lütfen bekleyin.
                </p>
              </div>

              {/* Opponent Status Display */}
              {Object.entries(activeMatch.players).map(([pId, pState]: [string, any]) => {
                const isOpponent = pId !== profile.id;
                if (!isOpponent) return null;
                return (
                  <div key={pId} className="bg-black/25 rounded-2xl border border-white/5 p-3 flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-300 uppercase tracking-wide">{pState.name}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      <span className="text-amber-400 font-bold uppercase">Tahmin Yapıyor...</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Multiplayer Results Card (Tek Tur Sonuç Ekranı) */}
          {activeMatch && activeMatch.status === 'ended' && (
            <div className="w-full max-w-sm sm:max-w-md mx-auto bg-slate-900/95 border-2 border-amber-500/30 rounded-3xl p-4 sm:p-5 text-center shadow-2xl animate-scale-up flex flex-col justify-between max-h-[85vh] overflow-hidden" id="multiplayer-results-container">
              <div className="flex justify-center shrink-0">
                {activeMatch.winnerId === profile.id ? (
                  <div className="relative flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full flex items-center justify-center border border-yellow-300 shadow-lg animate-bounce">
                      <Trophy size={24} className="text-slate-950 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-1.5 font-mono">DÜELLO GALİBİ</span>
                    <h2 className="text-xl font-black text-[#FAF6E9] uppercase tracking-wide leading-none mt-0.5">ZAFER SENİN!</h2>
                  </div>
                ) : activeMatch.winnerId === 'draw' ? (
                  <div className="relative flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                      <Swords size={24} className="text-amber-400 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5 font-mono font-bold">DURUM</span>
                    <h2 className="text-xl font-black text-amber-300 uppercase tracking-wide leading-none mt-0.5">BERABERE!</h2>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center">
                    <div className="w-12 h-12 bg-[#1E1E1E] rounded-full flex items-center justify-center border border-rose-500/25 shadow-lg">
                      <X size={24} className="text-rose-500 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-1.5 font-mono">DÜELLO MAĞLUBU</span>
                    <h2 className="text-xl font-black text-rose-500 uppercase tracking-wide leading-none mt-0.5">KAYBETTİNİZ</h2>
                  </div>
                )}
              </div>

              {/* Word Definition Section inside Results Card */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-3 my-2 text-left shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">ARANAN SÖZCÜK</span>
                  <span className="text-[9px] font-mono text-amber-400 font-bold">{targetWord.length} Harfli</span>
                </div>
                <div className="flex items-center gap-1.5 my-0.5">
                  <strong className="text-xl font-black tracking-widest text-[#FAF6E9] uppercase leading-none">{targetWord}</strong>
                  <button
                    onClick={() => {
                      setShowDefinitionModal(true);
                      playClickSound(settings.soundEnabled);
                    }}
                    className="p-1 rounded-full text-amber-400 hover:bg-amber-400/10 transition active:scale-95"
                    title="Anlamını Gör"
                  >
                    <Info size={14} className="stroke-[2.5]" />
                  </button>
                </div>
                {wordDefinition && wordDefinition !== 'loading' ? (
                  <p className="text-[10px] text-gray-300 italic font-serif leading-relaxed line-clamp-2">
                    "{wordDefinition}"
                  </p>
                ) : wordDefinition === 'loading' ? (
                  <p className="text-[10px] text-gray-400 italic animate-pulse">Sözlük anlamı yükleniyor...</p>
                ) : null}
              </div>

              {/* Player Round Statistics */}
              <div className="bg-black/25 rounded-2xl border border-white/5 p-3 mb-2 space-y-1.5 shrink-0">
                <h4 className="text-[9px] font-black text-amber-300/80 tracking-widest uppercase font-mono text-left font-bold">OYUNCU DETAYLARI</h4>
                {Object.entries(activeMatch.players).map(([pId, playerState]: [string, any]) => {
                  const isSelf = pId === profile.id;
                  return (
                    <div key={pId} className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${playerState.won ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className={`font-black uppercase tracking-wider ${isSelf ? 'text-amber-400' : 'text-gray-300'}`}>
                          {playerState.name} {isSelf ? '(Sen)' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span className="text-gray-400">Deneme:</span>
                        <span className={playerState.won ? 'text-emerald-400' : 'text-rose-400'}>
                          {playerState.won ? `${playerState.attempts.length} / 6` : 'BİLEMEDİ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Buttons Block - No Scroll & Balanced */}
              <div className="space-y-2 mt-auto shrink-0 pt-1">
                {/* Rematch Button */}
                <button
                  disabled={rematchRequested}
                  onClick={() => {
                    playClickSound(settings.soundEnabled);
                    setRematchRequested(true);
                    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                      socketRef.current.send(JSON.stringify({
                        type: 'request_rematch',
                        matchId: activeMatch.id
                      }));
                    }
                    showToast('Yarışmayı tekrarlama isteği gönderildi!', 'success');
                  }}
                  className={`w-full font-black text-xs py-2 px-3 rounded-xl shadow-md transition-all uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 ${
                    rematchRequested
                      ? 'bg-slate-800 text-gray-500 border border-white/5 cursor-not-allowed'
                      : opponentRematchRequested
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'
                      : 'bg-amber-500 hover:bg-amber-600 text-[#1E293B]'
                  }`}
                  id="rematch-btn"
                >
                  <RotateCcw size={14} className={`stroke-[2.5] ${rematchRequested ? '' : 'animate-spin'}`} />
                  <span>
                    {rematchRequested
                      ? 'İstek Gönderildi...'
                      : opponentRematchRequested
                      ? 'Yarışmayı Tekrarla (Rakip İstiyor!)'
                      : 'Yarışmayı Tekrarla'}
                  </span>
                </button>

                {/* Back and Home Row */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playClickSound(settings.soundEnabled);
                      handleLeaveMatchToMenu();
                    }}
                    className="bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-[#FAF6E9] font-black text-xs py-2 px-3 rounded-xl shadow-md transition-all uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 border border-white/5"
                    id="match-back-btn"
                  >
                    <ArrowLeft size={14} className="stroke-[2.5]" />
                    <span>Geri</span>
                  </button>

                  <button
                    onClick={() => {
                      playClickSound(settings.soundEnabled);
                      handleLeaveMatchToMenu();
                    }}
                    className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.98] text-[#2E3748] font-black text-xs py-2 px-3 rounded-xl shadow-md transition-all uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
                    id="match-home-btn"
                  >
                    <Home size={14} className="stroke-[2.5]" />
                    <span>Ana Sayfa</span>
                  </button>
                </div>
              </div>
            </div>
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
                  📖 SÖZLÜK ANLAMI
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
                    "{wordDefinition || 'Bu kelimenin resmi sözlük tanımına şu an ulaşılamıyor.'}"
                  </p>
                  
                  {/* If there was an error, show a retry button */}
                  {(wordDefinition.includes('hata') || wordDefinition.includes('yüklenemedi') || wordDefinition.includes('bağlantı') || wordDefinition.includes('ulaşılamıyor')) && (
                    <button
                      onClick={() => fetchTargetWordDefinition(targetWord)}
                      className="w-full mt-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 px-4 rounded-xl text-xs font-bold transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw size={12} />
                      <span>Tekrar Yüklemeyi Dene</span>
                    </button>
                  )}
                  
                  <div className="pt-2 border-t border-[#3E485A]/30 flex justify-end">
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(turkishLower(targetWord) + ' ne demek')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      Google'da Ara ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Congrats / Victory Modal */}
      {showCongratsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" id="congrats-modal-container">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200 cursor-pointer"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              startNewGame(wordLength);
              setShowCongratsModal(false);
            }}
          />
          
          {/* Modal Container */}
          <div className="bg-[#2E3748] border-2 border-emerald-500/30 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl relative z-10 overflow-hidden text-white animate-scale-up text-center space-y-4" id="congrats-modal-card">
            {/* Soft decorative glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-lg mb-3">
                <Trophy size={24} className="animate-bounce" />
              </div>
              <h3 className="text-base font-black text-emerald-400 uppercase tracking-widest font-mono">Tebrikler! Doğru Bildiniz</h3>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">Kelimelerin Efendisi!</p>
            </div>

            {/* Found Word Display */}
            <div className="p-3.5 bg-black/30 rounded-2xl border border-white/5 space-y-1 text-center relative z-10">
              <span className="text-[9px] text-gray-400 uppercase font-mono tracking-widest block">BULUNAN KELİME</span>
              <strong className="text-2xl font-black tracking-widest text-[#FAF6E9] uppercase block leading-none">{targetWord}</strong>
              
              {/* Word Definition */}
              {wordDefinition && wordDefinition !== 'loading' ? (
                <p className="text-[11px] text-gray-300 italic font-serif leading-relaxed line-clamp-3 mt-1.5">
                  "{wordDefinition}"
                </p>
              ) : wordDefinition === 'loading' ? (
                <p className="text-[10px] text-gray-400 italic animate-pulse mt-1.5">Anlamı yükleniyor...</p>
              ) : null}
            </div>

            {/* Action buttons matching the loss restart button but themed in emerald */}
            <div className="flex flex-col gap-2 relative z-10">
              <button
                onClick={() => {
                  playClickSound(settings.soundEnabled);
                  startNewGame(wordLength);
                  setShowCongratsModal(false);
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                id="congrats-new-game-button"
              >
                <RotateCcw size={14} />
                <span>Yeni Kelimeye Başla</span>
              </button>

               <button
                onClick={() => {
                  playClickSound(settings.soundEnabled);
                  handleLeaveMatchToMenu();
                  setShowCongratsModal(false);
                }}
                className="w-full bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs py-2.5 px-4 rounded-xl border border-[#3E485A] transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                id="congrats-back-to-lobby-button"
              >
                <ArrowLeft size={14} />
                <span>Ana Sayfaya Dön</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retention / "Seni Özledik" Notification Modal */}
      {retentionNotification && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#252D45] border-2 border-amber-500/50 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/20 mx-auto mb-4.5 shadow-lg shadow-amber-500/5">
              <Sparkles size={32} className="animate-pulse" />
            </div>

            <h3 className="text-xl font-black text-[#FAF6E9] tracking-tight">Seni Özledik! ☀️</h3>
            
            <p className="text-sm text-gray-300 mt-3 leading-relaxed">
              {retentionNotification.message}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => {
                  setRetentionNotification(null);
                  handleStartDailyPuzzle();
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 px-4 rounded-xl shadow-lg transition-all duration-150 active:scale-[0.98] uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={14} className="fill-current" />
                Günün Bulmacasını Çöz
              </button>

              <button
                onClick={() => setRetentionNotification(null)}
                className="w-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 cursor-pointer"
              >
                Kapat
              </button>
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
          networkLogs={networkLogs}
          onReconnect={handleManualReconnect}
        />
      )}

      {/* Badge Unlocked Popup Animation */}
      <BadgeUnlockedModal
        badge={unlockedBadgeToShow}
        onClose={() => setUnlockedBadgeToShow(null)}
        soundEnabled={settings.soundEnabled}
      />

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

      {/* Safe Space for Future Bottom Banner Ad */}
      <div className="h-[50px] w-full shrink-0 flex items-center justify-center border-t border-[#3E485A]/15 bg-black/35 text-[#FAF6E9]/40 font-mono text-[9px] tracking-widest select-none uppercase mt-auto" id="bottom-ad-placeholder">
      </div>
    </div>
  );
}
