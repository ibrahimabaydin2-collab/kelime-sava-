import React, { useState, useEffect } from 'react';
import { 
  Swords, Play, Globe, ShieldAlert, Sparkles, 
  Trophy, Users, HelpCircle, ChevronDown, ChevronUp, 
  Copy, Check, Flame, Zap, Target, Edit2, User, Award, CheckCircle2, TrendingUp,
  Sun, Moon, Sliders, BarChart2, X, ArrowLeft, UserPlus, UserMinus, Clock, Puzzle,
  Bot
} from 'lucide-react';
import { UserProfile, LobbyPlayer, Challenge } from '../types.js';
import { getBaseUrl } from '../utils/api.js';
import { validateUsername } from '../utils/usernameValidation.js';
import { getDailyWordAndLength } from '../data/wordlist.js';

interface WelcomeScreenProps {
  profile: UserProfile;
  onUpdateProfile: (name: string, avatarUrl?: string) => void;
  dictionaryMode: 'tdk_online' | 'no_validation';
  onChangeDictionaryMode: (mode: 'tdk_online' | 'no_validation') => void;
  gameMode: 'timed' | 'untimed';
  onChangeGameMode: (mode: 'timed' | 'untimed') => void;
  wordLength: number;
  onChangeWordLength: (length: number) => void;
  onStartSoloGame: () => void;
  onStartMatchmaking: (matchWordsCount?: number) => void;
  onOpenLobby: () => void;
  onOpenSettings: () => void;
  onOpenMissions?: () => void;
  matchmakingStatus: 'idle' | 'queued';
  isOnline: boolean;
  onStartGroupRace?: (mode?: 'online' | 'offline') => void;
  
  // New Header integration props
  onOpenStats?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  
  // Dynamic Integrated Dashboard Props
  lobbyPlayers?: LobbyPlayer[];
  activeChallenges?: Challenge[];
  onChallenge?: (player: LobbyPlayer, wordLength: number) => void;
  onAcceptChallenge?: (challengeId: string) => void;
  onDeclineChallenge?: (challengeId: string) => void;
  onReconnect?: () => void;
  onStartDailyPuzzle?: () => void;
  isDailyPuzzleCompletedToday?: boolean;
}

export default function WelcomeScreen({
  profile,
  onUpdateProfile,
  dictionaryMode,
  onChangeDictionaryMode,
  gameMode,
  onChangeGameMode,
  wordLength,
  onChangeWordLength,
  onStartSoloGame,
  onStartMatchmaking,
  onOpenLobby,
  onOpenSettings,
  onOpenMissions,
  matchmakingStatus,
  isOnline,
  onReconnect,
  onStartGroupRace,
  onOpenStats,
  darkMode,
  onToggleDarkMode,
  lobbyPlayers = [],
  activeChallenges = [],
  onChallenge,
  onAcceptChallenge,
  onDeclineChallenge,
  onStartDailyPuzzle,
  isDailyPuzzleCompletedToday = false
}: WelcomeScreenProps) {
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showMissions, setShowMissions] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedMatchWords, setSelectedMatchWords] = useState<number>(3);
  
  // Game setup states
  const [showGameSetup, setShowGameSetup] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'solo' | 'pvp' | 'group'>('solo');

  // Friend list state with local storage persistence
  const [friendsList, setFriendsList] = useState<{ id: string; name: string; avatarUrl?: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ks_friends_list') || '[]');
    } catch {
      return [];
    }
  });

  const [friendsTab, setFriendsTab] = useState<'friends' | 'find'>('friends');
  const [friendsSearchTerm, setFriendsSearchTerm] = useState<string>('');
  
  // Daily Puzzle reset countdown timer state
  const [timeLeftToReset, setTimeLeftToReset] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0); // Next midnight
      const diffMs = nextMidnight.getTime() - now.getTime();
      
      const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
      const seconds = Math.max(0, Math.floor((diffMs % (1000 * 60)) / 1000));
      
      const pad = (num: number) => String(num).padStart(2, '0');
      setTimeLeftToReset(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    calculateTimeLeft();
    const timerId = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerId);
  }, []);

  const isFriend = (playerId: string) => friendsList.some(f => f.id === playerId);

  const addFriend = (player: LobbyPlayer) => {
    if (isFriend(player.id)) return;
    const updated = [...friendsList, { id: player.id, name: player.name, avatarUrl: player.avatarUrl }];
    setFriendsList(updated);
    localStorage.setItem('ks_friends_list', JSON.stringify(updated));
  };

  const removeFriend = (playerId: string) => {
    const updated = friendsList.filter(f => f.id !== playerId);
    setFriendsList(updated);
    localStorage.setItem('ks_friends_list', JSON.stringify(updated));
  };

  // Profile Inline Editor State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatarUrl || '🧠');
  const [isTouched, setIsTouched] = useState<boolean>(false);

  const error = isTouched || editName !== profile.name ? validateUsername(editName, lobbyPlayers || [], profile.id) : null;

  React.useEffect(() => {
    setEditName(profile.name);
  }, [profile.name]);

  const AVATAR_PRESETS = ['⚔️', '🧠', '🐺', '🦁', '🧙‍♂️', '🦊', '👾', '🦄', '⚡', '👑', '🎯', '🚀', '🔥', '🐉', '🐼', '🛡️', '🏆', '🦉'];

  const handleCopyLink = () => {
    const baseUrl = getBaseUrl();
    const shareLink = baseUrl ? baseUrl : (window.location.origin || window.location.href);
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = () => {
    setIsTouched(true);
    const validationError = validateUsername(editName, lobbyPlayers || [], profile.id);
    if (validationError) return;
    onUpdateProfile(editName.trim(), selectedAvatar);
    setIsEditing(false);
    setIsTouched(false);
  };

  // Determine dynamic inclusive player title based on dailyScore
  const getWarriorTitle = (score: number) => {
    const level = Math.floor(0.5 + Math.sqrt(0.25 + 0.08 * score));
    let title = 'Kelime Kaşifi 🔍';
    if (level === 1) title = 'Kelime Kaşifi 🔍';
    else if (level === 2) title = 'Hece Gezgini 🗺️';
    else if (level === 3) title = 'Sözcük Mimarı 🧱';
    else if (level === 4) title = 'Dil Sanatçısı 🎨';
    else if (level < 10) title = 'Usta Sözlükçü 📚';
    else if (level < 20) title = 'Kelime Savaşçısı ⚔️';
    else if (level < 50) title = 'Cümle Muhafızı 🛡️';
    else if (level < 100) title = 'Edebiyat Şövalyesi 🎖️';
    else if (level < 250) title = 'Leksikograf Şefi 🎓';
    else if (level < 500) title = 'Dil Bilimci Profesör 🧠';
    else title = 'Efsanevi Kelime Bilgesi 👑';

    return `${level}. Seviye: ${title}`;
  };

  // Calculate detailed progress towards the next level
  const getLevelProgress = (score: number) => {
    const level = Math.floor(0.5 + Math.sqrt(0.25 + 0.08 * score));
    const currentLevelScore = 12.5 * (level * level - level);
    const nextLevelScore = 12.5 * ((level + 1) * (level + 1) - (level + 1));
    const range = nextLevelScore - currentLevelScore;
    const progressInLevel = score - currentLevelScore;
    const percent = range > 0 ? Math.min(100, Math.max(0, (progressInLevel / range) * 100)) : 100;

    // Derive title
    let title = 'Kelime Kaşifi 🔍';
    if (level === 1) title = 'Kelime Kaşifi 🔍';
    else if (level === 2) title = 'Hece Gezgini 🗺️';
    else if (level === 3) title = 'Sözcük Mimarı 🧱';
    else if (level === 4) title = 'Dil Sanatçısı 🎨';
    else if (level < 10) title = 'Usta Sözlükçü 📚';
    else if (level < 20) title = 'Kelime Savaşçısı ⚔️';
    else if (level < 50) title = 'Cümle Muhafızı 🛡️';
    else if (level < 100) title = 'Edebiyat Şövalyesi 🎖️';
    else if (level < 250) title = 'Leksikograf Şefi 🎓';
    else if (level < 500) title = 'Dil Bilimci Profesör 🧠';
    else title = 'Efsanevi Kelime Bilgesi 👑';

    return {
      level,
      title,
      currentLevelScore: Math.round(currentLevelScore),
      nextLevelScore: Math.round(nextLevelScore),
      percent,
      progressInLevel: Math.round(progressInLevel),
      range: Math.round(range)
    };
  };

  // Filter other online players
  const otherPlayers = lobbyPlayers.filter(p => p.id !== profile.id);

  // Get all friends with status
  const friendsWithStatus = friendsList.map(friend => {
    const onlineInfo = lobbyPlayers.find(lp => lp.id === friend.id);
    return {
      ...friend,
      isOnline: !!onlineInfo,
      status: onlineInfo?.status || 'offline',
      avatarUrl: onlineInfo?.avatarUrl || friend.avatarUrl
    };
  }).sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.name.localeCompare(b.name, 'tr-TR');
  });

  const nonFriendsOnline = otherPlayers.filter(p => !isFriend(p.id));
  const playersToSearch = nonFriendsOnline.filter(p => 
    p.name.toLocaleLowerCase('tr-TR').includes(friendsSearchTerm.toLocaleLowerCase('tr-TR'))
  );

  const winRate = profile.stats && profile.stats.gamesPlayed > 0 
    ? Math.round((profile.stats.gamesWon / profile.stats.gamesPlayed) * 100) 
    : 0;

  if (showGameSetup) {
    return (
      <div className="w-full max-w-2xl mx-auto card-theme rounded-[2.5rem] border-2 p-8 sm:p-10 md:p-12 shadow-2xl relative overflow-hidden flex flex-col justify-center items-stretch gap-y-6 sm:gap-y-8 animate-scale-up" id="welcome-setup-page">
        {/* Decorative ambient glowing background rings */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Glowing 4-point star accent in bottom right */}
        <div className="absolute bottom-6 right-8 text-amber-100/20 animate-pulse select-none pointer-events-none">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c.5 6.5 5.5 11.5 12 12-.5 6.5-5.5 11.5-12 12-.5-6.5-5.5-11.5-12-12 .5-6.5 5.5-11.5 12-12z" />
          </svg>
        </div>

        {/* Header section with back button and centered title */}
        <div className="w-full flex flex-col md:grid md:grid-cols-5 items-center gap-4 border-b border-[#3E485A]/40 pb-6 relative z-10" id="setup-header-section">
          <div className="md:col-span-1 w-full flex justify-start">
            <button
              onClick={() => setShowGameSetup(false)}
              className="flex items-center gap-1.5 text-xs font-black uppercase bg-[#FAF6E9] hover:bg-[#F3EFE0] active:bg-[#EBE6D5] text-[#2E3748] px-4 py-2 rounded-xl border border-[#EBE6D5] shadow-md transition-all active:scale-95 cursor-pointer"
              id="setup-back-btn"
            >
              <ArrowLeft size={13} className="stroke-[2.5]" />
              <span>Geri Dön</span>
            </button>
          </div>
          
          <div className="md:col-span-3 flex flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center justify-center gap-3">
              <Swords className="w-6 h-6 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-light font-serif tracking-[0.2em] text-[#FAF6E9] uppercase drop-shadow-md leading-none">
                KELİME SAVAŞI
              </h1>
            </div>
            <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mt-1.5" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-amber-200/50 uppercase mt-1">OYUN KURMA PANELİ</span>
          </div>

          <div className="hidden md:block md:col-span-1" />
        </div>

        {/* Setup Content */}
        <div className="space-y-6 relative z-10" id="action-settings-card">
          <div className="space-y-5" id="game-setup-wizard">
            
            {/* Giant Premium Mode Cards */}
            <div className="grid grid-cols-3 gap-3.5">
              {/* Solo Card */}
              <button
                onClick={() => setSelectedTab('solo')}
                className={`py-6 px-3 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center cursor-pointer active:scale-95 hover:scale-[1.03] ${
                  selectedTab === 'solo'
                    ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] font-black shadow-[0_10px_20px_rgba(250,246,233,0.15)] ring-4 ring-emerald-400/35'
                    : 'bg-[#3D4756]/40 text-[#FAF6E9]/80 border-white/5 hover:bg-[#3D4756]/70'
                }`}
              >
                <Puzzle className={`w-8 h-8 ${selectedTab === 'solo' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">SOLO PRATİK</span>
              </button>

              {/* PvP Card */}
              <button
                onClick={() => setSelectedTab('pvp')}
                className={`py-6 px-3 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center cursor-pointer active:scale-95 hover:scale-[1.03] ${
                  selectedTab === 'pvp'
                    ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] font-black shadow-[0_10px_20px_rgba(250,246,233,0.15)] ring-4 ring-amber-400/20'
                    : 'bg-[#3D4756]/40 text-[#FAF6E9]/80 border-white/5 hover:bg-[#3D4756]/70'
                }`}
              >
                <Swords className={`w-8 h-8 ${selectedTab === 'pvp' ? 'text-amber-600' : 'text-amber-400'}`} />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">CANLI DÜELLO</span>
              </button>

              {/* Group Card */}
              {onStartGroupRace && (
                <button
                  onClick={() => setSelectedTab('group')}
                  className={`py-6 px-3 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center cursor-pointer active:scale-95 hover:scale-[1.03] ${
                    selectedTab === 'group'
                      ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] font-black shadow-[0_10px_20px_rgba(250,246,233,0.15)] ring-4 ring-amber-400/20'
                      : 'bg-[#3D4756]/40 text-[#FAF6E9]/80 border-white/5 hover:bg-[#3D4756]/70'
                  }`}
                >
                  <Trophy className={`w-8 h-8 ${selectedTab === 'group' ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">GRUP YARIŞI</span>
                </button>
              )}
            </div>

            {/* Parameter Controls specific to selected mode with enlarged fonts and cream highlights */}
            {selectedTab !== 'group' ? (
              <div className="space-y-5 bg-[#3D4756]/30 p-5 sm:p-6 rounded-[2rem] border border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Word Length Selector */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black text-amber-300/80 font-mono tracking-wider uppercase block">HARF SAYISI SEÇİMİ</span>
                    <div className="grid grid-cols-6 gap-1.5 p-1 bg-black/35 rounded-xl border border-white/5">
                      {[3, 4, 5, 6, 7, 8].map((len) => (
                        <button
                          key={len}
                          onClick={() => onChangeWordLength(len)}
                          className={`py-2 rounded-lg text-sm font-black transition-all duration-200 active:scale-90 ${
                            wordLength === len
                              ? 'bg-[#FAF6E9] text-[#2E3748] shadow-md ring-2 ring-amber-400/20'
                              : 'text-[#FAF6E9]/75 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {len}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dictionary Mode Selector */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black text-amber-300/80 font-mono tracking-wider uppercase block">SÖZLÜK DENETİMİ</span>
                    <div className="grid grid-cols-2 gap-1.5 bg-black/35 p-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => onChangeDictionaryMode('tdk_online')}
                        className={`py-2 rounded-lg text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 ${
                          dictionaryMode === 'tdk_online'
                            ? 'bg-[#FAF6E9] text-[#2E3748] shadow-md ring-2 ring-amber-400/20'
                            : 'text-[#FAF6E9]/75 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Globe size={13} className="stroke-[2.5]" />
                        <span>TDK Aktif</span>
                      </button>
                      <button
                        onClick={() => onChangeDictionaryMode('no_validation')}
                        className={`py-2 rounded-lg text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 ${
                          dictionaryMode === 'no_validation'
                            ? 'bg-[#FAF6E9] text-[#2E3748] shadow-md ring-2 ring-amber-400/20'
                            : 'text-[#FAF6E9]/75 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <ShieldAlert size={13} className="stroke-[2.5]" />
                        <span>Serbest</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mode-specific secondary settings */}
                {selectedTab === 'solo' ? (
                  <div className="space-y-2 text-left border-t border-white/5 pt-4">
                    <span className="text-[10px] font-black text-amber-300/80 font-mono tracking-wider uppercase flex items-center gap-1">
                      <Zap size={12} className="text-amber-400 animate-pulse fill-amber-400/20" /> SÜRE VE ZAMAN KURALI
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => onChangeGameMode('timed')}
                        className={`py-3 px-4 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2.5 border active:scale-95 cursor-pointer ${
                          gameMode === 'timed'
                            ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] shadow-md ring-2 ring-amber-400/20'
                            : 'bg-black/20 text-[#FAF6E9]/75 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <span>⏱️ Süreli Oyun (20 sn)</span>
                      </button>
                      <button
                        onClick={() => onChangeGameMode('untimed')}
                        className={`py-3 px-4 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2.5 border active:scale-95 cursor-pointer ${
                          gameMode === 'untimed'
                            ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] shadow-md ring-2 ring-amber-400/20'
                            : 'bg-black/20 text-[#FAF6E9]/75 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <span>♾️ Süresiz Oyun</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-left border-t border-white/5 pt-4">
                    <span className="text-[10px] font-black text-amber-300/80 font-mono tracking-wider uppercase flex items-center gap-1">
                      <Swords size={12} className="text-amber-400" /> DÜELLO SÜRESİNCEKİ TUR SAYISI
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedMatchWords(3)}
                        className={`py-3 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 border active:scale-95 cursor-pointer ${
                          selectedMatchWords === 3
                            ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] shadow-md ring-2 ring-amber-400/20'
                            : 'bg-black/20 text-[#FAF6E9]/75 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <span>3 Kelime (Hızlı Savaş)</span>
                      </button>
                      <button
                        onClick={() => setSelectedMatchWords(5)}
                        className={`py-3 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 border active:scale-95 cursor-pointer ${
                          selectedMatchWords === 5
                            ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] shadow-md ring-2 ring-amber-400/20'
                            : 'bg-black/20 text-[#FAF6E9]/75 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <span>5 Kelime (Uzun Savaş)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5 bg-[#3D4756]/35 p-5 sm:p-6 rounded-[2rem] border border-white/10 animate-scale-up text-left relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-black text-amber-300 font-mono tracking-wider uppercase">
                    Grup Yarışı Oyun Modunu Seçin
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Çevrimiçi Savaş */}
                  <button
                    onClick={() => {
                      onStartGroupRace && onStartGroupRace('online');
                      setShowGameSetup(false);
                    }}
                    className="group bg-[#1E2532]/90 hover:bg-[#1E2532] border border-white/5 hover:border-emerald-500/50 rounded-[1.5rem] p-4 text-left transition-all duration-300 hover:shadow-[0_4px_25px_rgba(16,185,129,0.15)] active:scale-[0.98] cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 w-12 h-12 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-full blur-lg transition duration-300"></div>
                    <div className="flex items-center gap-3.5 relative z-10">
                      <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 group-hover:scale-110 group-hover:text-emerald-300 transition duration-300 shadow-inner shrink-0 animate-fade-in">
                        <Globe size={20} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#FAF6E9] group-hover:text-emerald-300 transition duration-300 flex items-center gap-1.5">
                          Çevrimiçi Savaş
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
                          Arkadaşlarınızla oda kodu ile canlı bağlanıp düello yapın.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Yapay Zekaya Karşı */}
                  <button
                    onClick={() => {
                      onStartGroupRace && onStartGroupRace('offline');
                      setShowGameSetup(false);
                    }}
                    className="group bg-[#1E2532]/90 hover:bg-[#1E2532] border border-white/5 hover:border-amber-500/50 rounded-[1.5rem] p-4 text-left transition-all duration-300 hover:shadow-[0_4px_25px_rgba(245,158,11,0.15)] active:scale-[0.98] cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 w-12 h-12 bg-amber-500/5 group-hover:bg-amber-500/10 rounded-full blur-lg transition duration-300"></div>
                    <div className="flex items-center gap-3.5 relative z-10">
                      <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400 group-hover:scale-110 group-hover:text-amber-300 transition duration-300 shadow-inner shrink-0 animate-fade-in">
                        <Bot size={20} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#FAF6E9] group-hover:text-amber-300 transition duration-300">
                          Yapay Zekaya Karşı
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
                          19 akıllı bota karşı bekleme süresi olmadan hemen oynayın.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Sleek Dark Info Panel */}
            <div className="bg-black/35 border border-white/5 rounded-2xl p-4 text-left space-y-1 relative overflow-hidden" id="mode-info-panel">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                {selectedTab === 'solo' && <Zap size={40} />}
                {selectedTab === 'pvp' && <Swords size={40} />}
                {selectedTab === 'group' && <Trophy size={40} />}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest font-mono">
                  {selectedTab === 'solo' && 'SOLO PRATİK MODU AÇIKLAMASI'}
                  {selectedTab === 'pvp' && 'CANLI DÜELLO MODU AÇIKLAMASI'}
                  {selectedTab === 'group' && 'GRUP YARIŞI MODU AÇIKLAMASI'}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {selectedTab === 'solo' && 'Kendi başınıza pratik yapıp kendinizi test edin! Süreli veya süresiz oynayarak kelime haznenizi genişletin ve yeni rekorlara koşun.'}
                {selectedTab === 'pvp' && 'Canlı rakiplerle kıyasıya rekabet edin! Aynı gizli kelimeyi en az denemede ve en kısa sürede çözerek liderlik sıralamasında yükselin.'}
                {selectedTab === 'group' && 'Arkadaşlarınızla aynı oda koduyla canlı bağlanın! Kimin daha hızlı ve usta bir kelime bükücü olduğunu herkese kanıtlayın.'}
              </p>
            </div>

            {/* Full Width Dynamic Launch Button with Puzzle Icon */}
            {selectedTab === 'solo' && (
              <button
                onClick={() => {
                  onStartSoloGame();
                  setShowGameSetup(false);
                }}
                className="w-full bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.98] active:translate-y-0.5 text-[#2E3748] font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-[0_5px_0_#D9D4C3,0_8px_15px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center uppercase tracking-widest cursor-pointer border border-[#EBE6D5]"
                id="start-solo-btn"
              >
                <Puzzle size={18} className="text-emerald-600 mr-2.5 stroke-[2.5] fill-emerald-600/15" />
                <span>Solo Oyununu Başlat</span>
              </button>
            )}

            {selectedTab === 'pvp' && (
              <button
                onClick={() => {
                  onStartMatchmaking(selectedMatchWords);
                  setShowGameSetup(false);
                }}
                disabled={matchmakingStatus === 'queued' || !isOnline}
                className={`w-full font-black text-base sm:text-lg py-4 px-6 rounded-2xl active:scale-[0.98] active:translate-y-0.5 transition-all flex items-center justify-center uppercase tracking-widest cursor-pointer border-2 ${
                  !isOnline
                    ? 'bg-black/20 text-gray-500 border-white/5 cursor-not-allowed opacity-60'
                    : matchmakingStatus === 'queued'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                    : 'bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] border-[#EBE6D5] shadow-[0_5px_0_#D9D4C3,0_8px_15px_rgba(0,0,0,0.2)]'
                }`}
                id="start-pvp-btn"
              >
                <Swords size={18} className={`mr-2.5 stroke-[2.5] ${matchmakingStatus === 'queued' ? 'animate-bounce' : 'text-[#2E3748]'}`} />
                <span>{matchmakingStatus === 'queued' ? 'Aranıyor...' : 'Canlı Düelloyu Başlat'}</span>
              </button>
            )}


          </div>
        </div>
      </div>
    );
  }

  return isEditing ? (
    <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto card-theme rounded-[2.5rem] border p-5 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between gap-y-[3.5vh] sm:gap-5 min-h-[82vh] md:min-h-0 animate-scale-up" id="welcome-screen-root">
      {/* Sparkles / Title */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <span className="text-sm font-bold font-mono text-amber-200 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles size={14} className="animate-pulse" /> Profilini Düzenle
        </span>
        <button 
          onClick={() => setIsEditing(false)}
          className="text-xs text-[#FAF6E9]/70 hover:text-white transition"
        >
          Kapat
        </button>
      </div>

      {/* Avatar Selector Grid */}
      <div className="space-y-3 text-left">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-wider block font-sans">BİR AVATAR SEÇİN</label>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              id="custom-avatar-upload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const MAX_WIDTH = 128;
                      const MAX_HEIGHT = 128;
                      let width = img.width;
                      let height = img.height;

                      if (width > height) {
                        if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                        }
                      } else {
                        if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                        }
                      }

                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        setSelectedAvatar(dataUrl);
                      }
                    };
                    img.src = reader.result as string;
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor="custom-avatar-upload"
              className="text-[9.5px] bg-[#FAF6E9] hover:bg-[#F3EFE0] text-slate-900 font-black px-3 py-1.5 rounded-xl transition duration-150 cursor-pointer uppercase tracking-wider flex items-center gap-1 shadow-sm"
            >
              <span>Fotoğraf Yükle 📸</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 p-2.5 bg-black/30 rounded-2xl border border-white/5 max-h-32 overflow-y-auto">
          {selectedAvatar && selectedAvatar.length >= 4 && (
            <button
              type="button"
              onClick={() => setSelectedAvatar(selectedAvatar)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition duration-150 active:scale-90 relative overflow-hidden ring-2 ring-amber-400 scale-105 shadow"
            >
              <img src={selectedAvatar} alt="Custom Avatar" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
            </button>
          )}
          {AVATAR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSelectedAvatar(preset)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition duration-150 active:scale-90 hover:bg-white/10 ${
                selectedAvatar === preset 
                  ? 'bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-900 scale-105 shadow' 
                  : ''
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Name Input */}
      <div className="space-y-2 text-left">
        <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-wider block font-sans">TAKMA ADINIZ</label>
        <input
          type="text"
          maxLength={26}
          value={editName}
          onChange={(e) => {
            setEditName(e.target.value);
            setIsTouched(true);
          }}
          placeholder="Takma adınızı yazın..."
          className={`w-full bg-[#2E3748]/55 border ${error ? 'border-rose-500 focus:ring-rose-400/40' : 'border-white/5 focus:ring-amber-200/40'} rounded-xl px-4 py-2.5 text-sm font-bold text-[#FAF6E9] focus:outline-none focus:ring-2`}
        />
        {error && (
          <p className="text-xs text-rose-400 font-semibold px-1 mt-1 animate-fade-in">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Save / Cancel buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            setIsEditing(false);
            setIsTouched(false);
          }}
          className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition"
        >
          Vazgeç
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={!editName.trim() || !!error}
          className="flex-1 py-3 px-4 rounded-xl bg-[#FAF6E9] hover:bg-[#F3EFE0] disabled:opacity-50 text-[#2E3748] text-xs font-black transition shadow-md"
        >
          Onayla
        </button>
      </div>
    </div>
  ) : (
    <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto card-theme rounded-3xl border p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-start gap-y-3 sm:gap-y-4 min-h-0" id="welcome-screen-root">
      
      {/* Glowing 4-point star accent in bottom right */}
      <div className="absolute bottom-6 right-8 text-amber-100/20 animate-pulse select-none pointer-events-none">
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c.5 6.5 5.5 11.5 12 12-.5 6.5-5.5 11.5-12 12-.5-6.5-5.5-11.5-12-12 .5-6.5 5.5-11.5 12-12z" />
        </svg>
      </div>

      {/* Connection status with instant reconnect absolute-positioned at the top right */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/25 border border-white/5 rounded-full px-2.5 py-0.5 text-[8px] font-bold text-amber-200/80">
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        <span>{isOnline ? 'AKTİF' : 'ÇEVRİMDIŞI'}</span>
        {!isOnline && onReconnect && (
          <button
            onClick={onReconnect}
            className="text-[7px] px-1 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 rounded font-black transition cursor-pointer"
          >
            BAĞLAN
          </button>
        )}
      </div>

      {/* App Title and Logo combined to save vertical space */}
      <div className="flex items-center justify-center gap-2 mt-1 relative z-10" id="welcome-header-title">
        <Swords size={18} className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse shrink-0" />
        <h1 className="text-xl sm:text-2xl font-serif font-light tracking-[0.2em] text-[#FAF6E9] uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
          KELİME SAVAŞI
        </h1>
      </div>

      {/* User Profile Section - Shrunk to save space */}
      <div className="flex flex-col items-center justify-center gap-1 py-1 relative z-10">
        <div className="relative">
          {/* Golden Glowing Ring around Avatar - Compacted */}
          <div 
            className="w-14 h-14 rounded-full bg-[#3D4756] border-2 border-amber-200/60 shadow-[0_0_12px_rgba(251,191,36,0.35)] flex items-center justify-center text-2xl overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            {profile.avatarUrl && profile.avatarUrl.length > 3 ? (
               <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
               <span className="select-none">{profile.avatarUrl || '🧠'}</span>
            )}
          </div>
          
          {/* Elegant feather decorative absolute-positioned */}
          <div className="absolute -bottom-1 -right-2.5 w-8 h-8 text-amber-200/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] pointer-events-none transform rotate-[15deg]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
              <path d="M20 4c-3.5 1-7.5 4.5-9.5 8.5C9.5 14.5 9 17 8.5 20c3-.5 5.5-1 7.5-3 4-2 7.5-6 8.5-9.5" fill="rgba(251, 191, 36, 0.1)" />
              <path d="M6 21c4-4 11-10 14-13" strokeWidth="2" />
            </svg>
          </div>
        </div>
        
        <span className="text-sm font-serif tracking-widest text-amber-100/95 font-normal lowercase leading-none mt-1">{profile.name}</span>
      </div>

      {/* Mini Stats Pill - Shrunk */}
      <div className="flex justify-center items-center gap-2.5 text-[10px] font-medium text-[#FAF6E9]/80 bg-[#3D4756]/40 px-3 py-1 rounded-full border border-white/5 w-fit mx-auto my-0.5">
        <span className="flex items-center gap-1"><Award size={11} className="text-amber-400" /> {profile.dailyScore} Puan</span>
        <span className="text-white/10">|</span>
        <span className="flex items-center gap-1"><Flame size={11} className="text-orange-400 animate-pulse" /> {profile.stats?.currentStreak || 0} Seri</span>
        <span className="text-white/10">|</span>
        <span className="flex items-center gap-1"><Swords size={11} className="text-blue-400" /> %{winRate} Galibiyet</span>
      </div>

      {/* Direct Challenge Notification */}
      {activeChallenges.length > 0 && (
        <div className="bg-amber-500/10 border border-dashed border-amber-500/30 p-2 rounded-xl space-y-1 animate-pulse text-left relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1">
              <Zap size={10} className="text-amber-500 fill-current animate-bounce" />
              DÜELLO DAVETİ VAR!
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg border border-amber-500/20">
            <div className="text-left max-w-[150px] truncate">
              <span className="font-black text-xs text-[#FAF6E9] block leading-tight">{activeChallenges[0].challenger.name}</span>
              <span className="text-[8.5px] text-gray-400 block mt-0.5">{activeChallenges[0].wordLength} Harfli</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onDeclineChallenge?.(activeChallenges[0].id)}
                className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-gray-300 text-[8.5px] font-bold rounded transition"
              >
                Red
              </button>
              <button
                onClick={() => onAcceptChallenge?.(activeChallenges[0].id)}
                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[8.5px] font-black rounded transition shadow-sm"
              >
                Kabul
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARD 1: Main Play Action Button - 3D retro styled cream button */}
      <div className="w-full flex flex-col gap-1.5" id="main-play-section">
        <button
          onClick={() => {
            setShowGameSetup(true);
            setSelectedTab('solo');
          }}
          className="w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-amber-300 active:scale-[0.98] active:translate-y-0.5 text-[#1E2532] py-3.5 px-5 rounded-xl shadow-[0_4px_0_#D97706,0_8px_15px_rgba(251,191,36,0.3)] hover:shadow-[0_3px_0_#D97706,0_6px_10px_rgba(251,191,36,0.2)] border-2 border-amber-200 transition-all flex items-center justify-center uppercase tracking-wider cursor-pointer relative overflow-hidden ring-4 ring-amber-400/20"
          style={{ textShadow: '0px 1px 2px rgba(255,255,255,0.4)' }}
        >
          <Swords size={18} className="mr-2 text-[#1E2532] stroke-[3]" />
          <span className="font-black tracking-[0.1em] drop-shadow-sm text-slate-900 text-sm sm:text-base">OYUNA BAŞLA</span>
        </button>

        {/* Matchmaking Queue Status */}
        {matchmakingStatus === 'queued' && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg flex items-center justify-between animate-fade-in mt-1">
            <div className="text-left">
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Eşleşme Aranıyor...
              </span>
              <span className="text-[9px] text-gray-400 block mt-0.5">
                {wordLength} Harf • {selectedMatchWords} Kelime
              </span>
            </div>
            <button
              onClick={() => onStartMatchmaking(selectedMatchWords)}
              className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[8.5px] uppercase tracking-wider rounded transition shadow"
            >
              Çık
            </button>
          </div>
        )}
      </div>

      {/* CARD 2: Seviye Göstergesi Kartı (MaterialCardView) */}
      <div className="w-full bg-[#FAF6E9] border border-[#EBE6D5] rounded-xl p-2.5 shadow-[0_3px_0_#D9D4C3,0_4px_8px_rgba(0,0,0,0.1)] flex items-center justify-between gap-2.5 text-left">
        <div className="flex items-center gap-2.5 w-full">
          <div className="w-8 h-8 rounded-lg bg-[#FEF9E6] border border-[#E2DCBF] flex items-center justify-center shrink-0">
            <Trophy size={16} className="text-amber-500 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8.5px] font-black text-amber-700 tracking-wider font-mono uppercase">Mevcut Seviye</div>
            <div className="text-[11px] font-black text-[#2E3748] truncate mt-0.5">{getWarriorTitle(profile.dailyScore)}</div>
            {(() => {
              const progress = getLevelProgress(profile.dailyScore);
              return (
                <div className="w-full mt-1">
                  <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${progress.percent}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_6px_rgba(245,158,11,0.2)]"
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-gray-500 font-mono mt-0.5 leading-none">
                    <span>{progress.currentLevelScore} P</span>
                    <span className="text-amber-700 font-semibold">
                      {progress.level < 5 ? `${progress.progressInLevel}/${progress.range} P` : 'Maks Seviye!'}
                    </span>
                    <span>{progress.level < 5 ? `${progress.nextLevelScore} P` : '∞'}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* CARD 3: Günün Bulmacası (Daily Puzzle) Card */}
      <div className="w-full">
        {isDailyPuzzleCompletedToday ? (
          <div className="w-full relative overflow-hidden bg-[#FAF6E9] border border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-[0_3px_0_#D9D4C3,0_4px_8px_rgba(0,0,0,0.1)] text-left animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-yellow-500/5 pointer-events-none" />
            <div className="flex items-center gap-2.5 min-w-0 z-10">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white rounded-lg flex items-center justify-center border border-amber-300 shadow-sm shrink-0">
                <Award size={16} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7.5px] font-black bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1 py-0.5 rounded uppercase tracking-wider font-mono">TAMAMLANDI</span>
                  <h4 className="text-[8.5px] font-bold tracking-[0.1em] text-[#2E3748]/60 uppercase font-sans">Günün Bulmacası</h4>
                </div>
                <p className="text-xs font-black text-[#2E3748] truncate mt-0.5">Bugünün kelimesini çözdün! 🎉</p>
                <p className="text-[8.5px] text-amber-700 font-bold mt-0.5 flex items-center gap-1">
                  <span>Sıfırlanma:</span>
                  <span className="font-mono text-amber-600">{timeLeftToReset}</span>
                </p>
              </div>
            </div>
            <div className="bg-[#FEF9E6] text-amber-700 border border-amber-400/45 rounded-lg px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-widest shrink-0 flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
              <span>BİLGE</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onStartDailyPuzzle?.()}
            className="w-full relative group overflow-hidden bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.98] border border-[#EBE6D5] rounded-xl p-2.5 flex items-center justify-between gap-2 text-left transition-all duration-300 shadow-[0_3px_0_#D9D4C3,0_4px_8px_rgba(0,0,0,0.1)] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            <div className="flex items-center gap-2.5 min-w-0 z-10">
              <div className="w-8 h-8 bg-[#FAF6E9] text-amber-600 rounded-lg flex items-center justify-center border border-[#E2DCBF] group-hover:scale-105 transition duration-300 shadow-sm shrink-0">
                <Puzzle size={16} className="text-amber-600 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7.5px] font-black bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">GÜNLÜK</span>
                  <h4 className="text-[8.5px] font-bold tracking-[0.15em] text-[#2E3748]/60 uppercase font-sans">Günün Bulmacası</h4>
                </div>
                <p className="text-xs font-black text-[#2E3748] truncate mt-0.5">{getDailyWordAndLength().length} Harfli Gizemli Kelime</p>
                <p className="text-[8.5px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <span>Kalan:</span>
                  <span className="font-mono text-amber-700 font-bold">{timeLeftToReset}</span>
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-[9px] uppercase tracking-widest rounded-md transition-all duration-200 shadow-sm flex items-center gap-1 shrink-0 group-hover:translate-x-1">
              <span>Oyna</span>
              <Play size={8} className="fill-current" />
            </div>
          </button>
        )}
      </div>

      {/* Beautiful Cream Action Grid */}
      <div className="grid grid-cols-4 gap-2 w-full" id="bottom-buttons-grid">
        {/* Button 1: REKABET */}
        <button
          onClick={onOpenStats}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_#D9D4C3,0_4px_8px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer"
        >
          <Trophy size={18} className="stroke-[2.5]" />
          <span className="text-[9px] font-black uppercase tracking-wider">REKABET</span>
        </button>

        {/* Button 2: ARKADAŞLAR */}
        <button
          onClick={() => setShowFriendsModal(true)}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_#D9D4C3,0_4px_8px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer relative"
        >
          <Users size={18} className="stroke-[2.5]" />
          <span className="text-[9px] font-black uppercase tracking-wider">ARKADAŞ</span>
          {friendsList.some(f => lobbyPlayers.some(lp => lp.id === f.id)) && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse border border-[#FAF6E9]" />
          )}
        </button>

        {/* Button 3: AYARLAR */}
        <button
          onClick={onOpenSettings}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_#D9D4C3,0_4px_8px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer"
        >
          <Sliders size={18} className="stroke-[2.5]" />
          <span className="text-[9px] font-black uppercase tracking-wider">AYARLAR</span>
        </button>

        {/* Button 4: KURALLAR */}
        <button
          onClick={() => setShowRulesModal(true)}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_#D9D4C3,0_4px_8px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer"
        >
          <HelpCircle size={18} className="stroke-[2.5]" />
          <span className="text-[9px] font-black uppercase tracking-wider">KURALLAR</span>
        </button>
      </div>

      {/* Rules Detail Popup Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-theme rounded-[2rem] p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-up text-left relative overflow-hidden">
            {/* Glowing 4-point star accent in bottom right */}
            <div className="absolute bottom-6 right-8 text-amber-100/15 animate-pulse select-none pointer-events-none">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c.5 6.5 5.5 11.5 12 12-.5 6.5-5.5 11.5-12 12-.5-6.5-5.5-11.5-12-12 .5-6.5 5.5-11.5 12-12z" />
              </svg>
            </div>

            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-[#FAF6E9] uppercase tracking-wide flex items-center gap-2">
                  <HelpCircle size={18} className="text-amber-400" />
                  Nasıl Oynanır & Kurallar
                </h3>
                <p className="text-[10px] text-amber-100/50 font-mono font-bold uppercase mt-0.5">
                  TDK KELİME SAVAŞI REHBERİ & PUANLAMA SİSTEMİ
                </p>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs leading-relaxed text-[#FAF6E9]/90 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {/* Rule 1: Harf Renkleri */}
              <div className="bg-[#3D4756]/40 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Sparkles size={14} />
                  <span>1. Harf Renkleri & İpuçları</span>
                </div>
                <p className="text-[11px] leading-normal text-gray-300">
                  Tahmin ettiğiniz kelimedeki harfler size gizli kelimeye giden yolu gösterir:
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-1.5 text-center">
                    <span className="text-emerald-400 font-black block text-[11px]">YEŞİL</span>
                    <span className="text-[9px] text-gray-300 block">Doğru harf, doğru yer</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-1.5 text-center">
                    <span className="text-amber-400 font-black block text-[11px]">TURUNCU</span>
                    <span className="text-[9px] text-gray-300 block">Harf var, yeri yanlış</span>
                  </div>
                  <div className="bg-gray-500/10 border border-gray-500/25 rounded-lg p-1.5 text-center">
                    <span className="text-gray-400 font-black block text-[11px]">GRİ</span>
                    <span className="text-[9px] text-gray-300 block">Harf kelimede yok</span>
                  </div>
                </div>
              </div>

              {/* Rule 2: Puanlama Sistemi */}
              <div className="bg-[#3D4756]/40 p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Award size={14} />
                  <span>2. Puanlama Sistemi</span>
                </div>
                <p className="text-[11px] leading-normal text-gray-300">
                  Kelimeyi doğru bildiğinizde kazandığınız skor dinamik olarak hesaplanır:
                </p>
                <div className="space-y-1.5 text-[11px] bg-black/20 p-2.5 rounded-lg text-gray-300 font-mono">
                  <div className="flex justify-between">
                    <span>🌟 Taban Ödül:</span>
                    <span className="text-[#FAF6E9] font-bold">+100 Puan</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1">
                    <span>⏱️ Süre Bonusu:</span>
                    <span className="text-emerald-400 font-bold">Kalan her saniye x 5 Puan</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1">
                    <span>🚫 Tahmin Cezası:</span>
                    <span className="text-rose-400 font-bold">Her yanlış tahmin için -10 Puan</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1 text-[10px] text-amber-300/80">
                    <span>🛡️ En Düşük Limit:</span>
                    <span>Doğru bildiğinizde en az 50 Puan garantidir!</span>
                  </div>
                </div>
              </div>

              {/* Rule 3: Süre Kuralları */}
              <div className="bg-[#3D4756]/40 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Clock size={14} />
                  <span>3. Süre Kuralları (⏱️ Süreli Oyun)</span>
                </div>
                <p className="text-[11px] leading-normal text-gray-300">
                  Süreli oyun modunda her geçerli tahmin girdikten sonra süre sayacı tekrar <strong className="text-white">20 saniyeye</strong> sıfırlanır. Bu sayede hızlı düşünen ve kelimeleri seri bilen oyuncular devasa zaman bonusları toplayabilirler!
                </p>
              </div>

              {/* Rule 4: TDK & Dil Kuralları Doğrulaması */}
              <div className="bg-[#3D4756]/40 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldAlert size={14} />
                  <span>4. Akıllı Kelime Doğrulama</span>
                </div>
                <p className="text-[11px] leading-normal text-gray-300">
                  Rastgele harf tuşlanmasını önlemek için tüm kelimeler TDK (Türk Dil Kurumu) veri tabanı ile anlık doğrulanır. 
                  İnternet kesildiğinde ise gelişmiş yapay zeka algoritmalı <strong className="text-white">Türkçe Hece ve Harf Uyumu Koruması</strong> devreye girerek geçerli Türkçe kelimeleri oynamaya devam etmenizi sağlar.
                </p>
              </div>

              {/* Rule 5: Çok Oyunculu Düellolar */}
              <div className="bg-[#3D4756]/40 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Swords size={14} />
                  <span>5. Canlı Düello & Grup Yarışları</span>
                </div>
                <p className="text-[11px] leading-normal text-gray-300">
                  Arkadaşlarınızla lobide buluşarak veya rastgele eşleşme ile canlı düello başlatabilirsiniz. İki taraf da aynı gizli kelimeyi çözmeye çalışır. Kelimeyi en az denemede ve en kısa sürede çözen taraf düelloyu kazanır ve hanesine devasa <strong className="text-amber-400">+100 Savaş Puanı</strong> yazdırır!
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 bg-[#3D4756]/30 hover:bg-[#3D4756]/60 text-gray-300 px-3 py-2 rounded-xl text-[10px] font-bold transition border border-white/5 cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? 'Kopyalandı!' : 'Arkadaş Davet Et'}</span>
              </button>

              <button
                onClick={() => setShowRulesModal(false)}
                className="bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] font-black text-xs px-4 py-2 rounded-xl shadow-md transition cursor-pointer"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Friends Modal (Aktif Arkadaşlar) */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-theme rounded-[2rem] p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-up text-left relative overflow-hidden">
            {/* Glowing 4-point star accent in bottom right */}
            <div className="absolute bottom-6 right-8 text-amber-100/15 animate-pulse select-none pointer-events-none">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c.5 6.5 5.5 11.5 12 12-.5 6.5-5.5 11.5-12 12-.5-6.5-5.5-11.5-12-12 .5-6.5 5.5-11.5 12-12z" />
              </svg>
            </div>

            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-[#FAF6E9] uppercase tracking-wide flex items-center gap-2">
                  <Users size={18} className="text-amber-400" />
                  Arkadaşlarım
                </h3>
                <p className="text-[10px] text-amber-100/50 font-mono font-bold uppercase mt-0.5">
                  LOBİDEKİ OYUNCULAR ({lobbyPlayers.length})
                </p>
              </div>
              <button
                onClick={() => setShowFriendsModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Custom Tab Selection inside Friends modal */}
            <div className="flex bg-black/20 p-1 rounded-xl">
              <button
                onClick={() => setFriendsTab('friends')}
                className={`flex-1 py-1.5 text-[10.5px] font-black uppercase rounded-lg transition-all text-center cursor-pointer ${
                  friendsTab === 'friends'
                    ? 'bg-[#FAF6E9] text-[#2E3748] shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Arkadaşlarım ({friendsList.length})
              </button>
              <button
                onClick={() => setFriendsTab('find')}
                className={`flex-1 py-1.5 text-[10.5px] font-black uppercase rounded-lg transition-all text-center cursor-pointer ${
                  friendsTab === 'find'
                    ? 'bg-[#FAF6E9] text-[#2E3748] shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Oyuncu Bul ({nonFriendsOnline.length})
              </button>
            </div>

            {/* Active Invitations/Challenges Received inside Friends list */}
            {activeChallenges.length > 0 && (
              <div className="space-y-1.5 bg-amber-500/10 p-3 rounded-xl border border-dashed border-amber-500/30 animate-pulse text-left">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Zap size={10} className="fill-amber-500/20 animate-pulse" />
                  Meydan Okuma Daveti Var!
                </span>
                <div className="space-y-1">
                  {activeChallenges.map((chal) => (
                    <div key={chal.id} className="bg-slate-850/80 border border-amber-500/25 p-2.5 rounded-lg flex items-center justify-between gap-1.5 shadow-sm">
                      <div className="text-left">
                        <span className="font-bold text-[11px] text-[#FAF6E9] block leading-tight">{chal.challenger.name}</span>
                        <span className="text-[9px] text-gray-450 block">{chal.wordLength} Harfli Maç</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onDeclineChallenge?.(chal.id)}
                          className="px-2.5 py-1 bg-[#3D4756] hover:bg-[#3D4756]/80 text-gray-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
                        >
                          Reddet
                        </button>
                        <button
                          onClick={() => onAcceptChallenge?.(chal.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black rounded-lg transition shadow-sm cursor-pointer"
                        >
                          Kabul Et
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search input for adding friends tab */}
            {friendsTab === 'find' && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Oyuncu adı ile ara..."
                  value={friendsSearchTerm}
                  onChange={(e) => setFriendsSearchTerm(e.target.value)}
                  className="w-full bg-black/25 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
            )}

            <div className="space-y-2 text-xs leading-relaxed text-gray-300 max-h-[40vh] overflow-y-auto pr-1">
              {!isOnline ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-xs font-bold font-mono text-rose-450">ÇEVRİMDIŞI MOD</p>
                  <p className="text-[10px] mt-1 text-gray-400/85">Arkadaşlarını görebilmek ve savaş açabilmek için internet bağlantısı gerekir.</p>
                </div>
              ) : friendsTab === 'friends' ? (
                friendsWithStatus.length === 0 ? (
                  otherPlayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-xs font-black font-mono text-amber-450">HENÜZ ARKADAŞIN YOK 🏜️</p>
                      <p className="text-[10px] mt-1 text-gray-400/85">
                        Şu anda oyunda başka aktif oyuncu bulunmuyor. Daha sonra tekrar kontrol etmeyi deneyebilirsin!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-fade-in">
                      <div className="text-left py-1 text-amber-200/85 font-black uppercase text-[9px] tracking-wider font-mono">
                        Aktif Oyuncular
                      </div>
                      {otherPlayers.map((player) => (
                        <div key={player.id} className="p-2.5 bg-[#3D4756]/45 rounded-xl border border-white/5 flex items-center justify-between text-left animate-scale-up">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#3D4756] flex items-center justify-center font-bold text-xs border border-white/10 shrink-0 relative">
                              {player.avatarUrl ? (
                                player.avatarUrl.length < 4 ? (
                                  <span className="text-sm select-none">{player.avatarUrl}</span>
                                ) : (
                                  <img src={player.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                                )
                              ) : (
                                <span className="text-gray-400">{player.name.charAt(0).toUpperCase()}</span>
                              )}
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#2E3748] bg-emerald-500 animate-pulse" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-[#FAF6E9] block leading-none">{player.name}</span>
                              <span className="text-[8.5px] text-gray-400 block font-mono mt-0.5 uppercase tracking-wide">
                                {player.status === 'playing' ? '🎮 Oyunda' : player.status === 'challenging' ? '⚔️ Sırada' : '🟢 Boşta'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 font-sans">
                            <button
                              disabled={player.status !== 'idle'}
                              onClick={() => {
                                onChallenge?.(player, wordLength);
                                setShowFriendsModal(false);
                              }}
                              className={`text-[9.5px] px-2.5 py-1 rounded-lg font-black uppercase transition duration-150 flex items-center gap-1 cursor-pointer ${
                                player.status === 'idle'
                                  ? 'bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] shadow-sm'
                                  : 'bg-[#3D4756]/20 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <Swords size={10} />
                              <span>Meydan Oku</span>
                            </button>
                            <button
                              onClick={() => addFriend(player)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer"
                              title="Arkadaş Ekle"
                            >
                              <UserPlus size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    {friendsWithStatus.map((friend) => (
                      <div key={friend.id} className="p-2.5 bg-[#3D4756]/45 rounded-xl border border-white/5 flex items-center justify-between text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#3D4756] flex items-center justify-center font-bold text-xs border border-white/10 shrink-0 relative">
                            {friend.avatarUrl ? (
                              friend.avatarUrl.length < 4 ? (
                                <span className="text-sm select-none">{friend.avatarUrl}</span>
                              ) : (
                                <img src={friend.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                              )
                            ) : (
                              <span className="text-gray-400">{friend.name.charAt(0).toUpperCase()}</span>
                            )}
                            <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#2E3748] ${
                              friend.isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                            }`} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-[#FAF6E9] block leading-none">{friend.name}</span>
                            <span className="text-[8.5px] text-gray-400 block font-mono mt-0.5 uppercase tracking-wide">
                              {friend.isOnline ? (
                                friend.status === 'playing' ? '🎮 Oyunda' : friend.status === 'challenging' ? '⚔️ Sırada' : '🟢 Boşta'
                              ) : (
                                '⚪ Çevrimdışı'
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {friend.isOnline && (
                            <button
                              disabled={friend.status !== 'idle'}
                              onClick={() => {
                                const originalPlayer = lobbyPlayers.find(p => p.id === friend.id);
                                if (originalPlayer) {
                                  onChallenge?.(originalPlayer, wordLength);
                                  setShowFriendsModal(false);
                                }
                              }}
                              className={`text-[9.5px] px-2.5 py-1 rounded-lg font-black uppercase transition duration-150 flex items-center gap-1 cursor-pointer ${
                                friend.status === 'idle'
                                  ? 'bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] shadow-sm'
                                  : 'bg-[#3D4756]/20 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <Swords size={10} />
                              <span>Meydan Oku</span>
                            </button>
                          )}
                          <button
                            onClick={() => removeFriend(friend.id)}
                            className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Arkadaşı Sil"
                          >
                            <UserMinus size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                playersToSearch.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-xs font-black font-mono text-amber-450">OYUNCU YOK 🏜️</p>
                    <p className="text-[10px] mt-1 text-gray-400/85">
                      Şu anda ekleyebileceğiniz aktif başka çevrimiçi oyuncu bulunmuyor. Arkadaşlarınızı davet edebilirsiniz!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {playersToSearch.map((player) => (
                      <div key={player.id} className="p-2.5 bg-[#3D4756]/45 rounded-xl border border-white/5 flex items-center justify-between text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#3D4756] flex items-center justify-center font-bold text-xs border border-white/10 shrink-0">
                            {player.avatarUrl ? (
                              player.avatarUrl.length < 4 ? (
                                <span className="text-sm select-none">{player.avatarUrl}</span>
                              ) : (
                                <img src={player.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                              )
                            ) : (
                              <span className="text-gray-400">{player.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-black text-[#FAF6E9] block leading-none">{player.name}</span>
                            <span className="text-[8.5px] text-gray-400 block font-mono mt-0.5 uppercase tracking-wide">
                              🟢 ÇEVRİMİÇİ
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => addFriend(player)}
                          className="text-[9.5px] px-2.5 py-1 rounded-lg font-black uppercase transition duration-150 flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm cursor-pointer"
                        >
                          <UserPlus size={10} />
                          <span>Arkadaş Ekle</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 bg-[#3D4756]/30 hover:bg-[#3D4756]/60 text-gray-300 px-3 py-2 rounded-xl text-[10px] font-bold transition border border-white/5 cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? 'Kopyalandı!' : 'Arkadaş Davet Et'}</span>
              </button>

              <button
                onClick={() => setShowFriendsModal(false)}
                className="bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] font-black text-xs px-4 py-2 rounded-xl shadow-md transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
