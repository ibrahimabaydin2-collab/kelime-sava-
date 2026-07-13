import React, { useState } from 'react';
import { 
  Swords, Play, Globe, ShieldAlert, Sparkles, 
  Trophy, Users, HelpCircle, ChevronDown, ChevronUp, 
  Copy, Check, Flame, Zap, Target, Edit2, User, Award, CheckCircle2, TrendingUp,
  Sun, Moon, Sliders, BarChart2, X, ArrowLeft, UserPlus, UserMinus, Clock
} from 'lucide-react';
import { UserProfile, LobbyPlayer, Challenge } from '../types.js';
import { getBaseUrl } from '../utils/api.js';

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
  onStartGroupRace?: () => void;
  
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
  onDeclineChallenge
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
    if (!editName.trim()) return;
    onUpdateProfile(editName.trim(), selectedAvatar);
    setIsEditing(false);
  };

  // Determine dynamic inclusive player title based on dailyScore
  const getWarriorTitle = (score: number) => {
    if (score < 100) return '1. Seviye: Kelime Kaşifi 🔍';
    if (score < 500) return '2. Seviye: Hece Gezgini 🗺️';
    if (score < 1500) return '3. Seviye: Sözcük Mimarı 🧱';
    if (score < 3000) return '4. Seviye: Dil Sanatçısı 🎨';
    return '5. Seviye: Efsanevi Kelime Bilgesi 👑';
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
      <div className="w-full max-w-2xl mx-auto bg-[#2E3748] rounded-[2.5rem] border-2 border-[#3E485A] p-8 sm:p-10 md:p-12 shadow-2xl relative overflow-hidden text-white flex flex-col justify-center items-stretch gap-y-6 sm:gap-y-8 animate-scale-up" id="welcome-setup-page">
        {/* Decorative ambient glowing background rings */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Glowing 4-point star accent in bottom right */}
        <div className="absolute bottom-6 right-8 text-amber-100/20 animate-pulse select-none pointer-events-none">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c.5 6.5 5.5 11.5 12 12-.5 6.5-5.5 11.5-12 12-.5-6.5-5.5-11.5-12-12 .5-6.5 5.5-11.5 12-12z" />
          </svg>
        </div>

        {/* Absolute-positioned Back Button */}
        <button
          onClick={() => setShowGameSetup(false)}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-xs font-black uppercase bg-[#FAF6E9] hover:bg-[#F3EFE0] active:bg-[#EBE6D5] text-[#2E3748] px-4 py-2 rounded-xl border border-[#EBE6D5] shadow-md transition-all active:scale-95 cursor-pointer z-20"
          id="setup-back-btn"
        >
          <ArrowLeft size={13} className="stroke-[2.5]" />
          <span>Geri Dön</span>
        </button>

        {/* Big centered game logo header */}
        <div className="flex flex-col items-center justify-center gap-1.5 mt-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <Swords className="w-8 h-8 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-[0.18em] text-[#FAF6E9] uppercase drop-shadow-md">
              KELİME SAVAŞI
            </h1>
          </div>
          <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mt-1" />
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-amber-200/50 uppercase mt-0.5">OYUN KURMA PANELİ</span>
        </div>

        {/* Setup Content */}
        <div className="space-y-6 relative z-10" id="action-settings-card">
          <div className="space-y-5" id="game-setup-wizard">
            
            {/* Giant Premium Mode Cards */}
            <div className="grid grid-cols-3 gap-3.5">
              {/* PvP Card */}
              <button
                onClick={() => setSelectedTab('pvp')}
                className={`py-6 px-3 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center cursor-pointer active:scale-95 hover:scale-[1.03] ${
                  selectedTab === 'pvp'
                    ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] font-black shadow-[0_10px_20px_rgba(250,246,233,0.15)] ring-4 ring-amber-400/20'
                    : 'bg-[#3D4756]/40 text-[#FAF6E9]/80 border-white/5 hover:bg-[#3D4756]/70'
                }`}
              >
                <span className="text-3xl drop-shadow-sm filter">⚔️</span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">1v1 DÜELLO</span>
              </button>

              {/* Solo Card */}
              <button
                onClick={() => setSelectedTab('solo')}
                className={`py-6 px-3 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center cursor-pointer active:scale-95 hover:scale-[1.03] ${
                  selectedTab === 'solo'
                    ? 'bg-[#FAF6E9] border-[#FAF6E9] text-[#2E3748] font-black shadow-[0_10px_20px_rgba(250,246,233,0.15)] ring-4 ring-amber-400/20'
                    : 'bg-[#3D4756]/40 text-[#FAF6E9]/80 border-white/5 hover:bg-[#3D4756]/70'
                }`}
              >
                <span className="text-3xl drop-shadow-sm filter">🧩</span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">SOLO PRATİK</span>
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
                  <span className="text-3xl drop-shadow-sm filter">🏆</span>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">GRUP YARIŞI</span>
                </button>
              )}
            </div>

            {/* Parameter Controls specific to selected mode with enlarged fonts and cream highlights */}
            {selectedTab !== 'group' && (
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
                  {selectedTab === 'pvp' && '1v1 DÜELLO MODU AÇIKLAMASI'}
                  {selectedTab === 'group' && 'GRUP YARIŞI MODU AÇIKLAMASI'}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {selectedTab === 'solo' && 'Kendi başınıza pratik yapıp kendinizi test edin! Süreli veya süresiz oynayarak kelime haznenizi genişletin ve yeni rekorlara koşun.'}
                {selectedTab === 'pvp' && 'Canlı rakiplerle kıyasıya rekabet edin! Aynı gizli kelimeyi en az denemede ve en kısa sürede çözerek liderlik sıralamasında yükselin.'}
                {selectedTab === 'group' && 'Arkadaşlarınızla aynı oda koduyla canlı bağlanın! Kimin daha hızlı ve usta bir kelime savaşçısı olduğunu herkese kanıtlayın.'}
              </p>
            </div>

            {/* Full Width Dynamic Launch Button with Sword Icon */}
            {selectedTab === 'solo' && (
              <button
                onClick={() => {
                  onStartSoloGame();
                  setShowGameSetup(false);
                }}
                className="w-full bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.98] active:translate-y-0.5 text-[#2E3748] font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-[0_5px_0_#D9D4C3,0_8px_15px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center uppercase tracking-widest cursor-pointer border border-[#EBE6D5]"
                id="start-solo-btn"
              >
                <Swords size={18} className="text-[#2E3748] mr-2.5 stroke-[2.5]" />
                <span>Tek Oyuncu Savaşını Başlat</span>
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
                <span>{matchmakingStatus === 'queued' ? 'Aranıyor...' : '1v1 Düelloyu Başlat'}</span>
              </button>
            )}

            {selectedTab === 'group' && onStartGroupRace && (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    onStartGroupRace();
                    setShowGameSetup(false);
                  }}
                  className="w-full bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.98] active:translate-y-0.5 text-[#2E3748] font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-[0_5px_0_#D9D4C3,0_8px_15px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center uppercase tracking-widest cursor-pointer border border-[#EBE6D5]"
                  id="start-group-btn"
                >
                  <Swords size={18} className="text-[#2E3748] mr-2.5 stroke-[2.5]" />
                  <span>Grup Yarışını Başlat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return isEditing ? (
    <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto bg-[#2E3748] rounded-[2.5rem] border border-[#3E485A] p-5 sm:p-8 shadow-2xl relative overflow-hidden text-white flex flex-col justify-between gap-y-[3.5vh] sm:gap-5 min-h-[82vh] md:min-h-0 animate-scale-up" id="welcome-screen-root">
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
          maxLength={16}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Takma adınızı yazın..."
          className="w-full bg-[#2E3748]/55 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold text-[#FAF6E9] focus:outline-none focus:ring-2 focus:ring-amber-200/40"
        />
      </div>

      {/* Save / Cancel buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setIsEditing(false)}
          className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition"
        >
          Vazgeç
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={!editName.trim()}
          className="flex-1 py-3 px-4 rounded-xl bg-[#FAF6E9] hover:bg-[#F3EFE0] disabled:opacity-50 text-[#2E3748] text-xs font-black transition shadow-md"
        >
          Onayla
        </button>
      </div>
    </div>
  ) : (
    <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto bg-[#2E3748] rounded-[2.5rem] border border-[#3E485A] p-5 sm:p-8 shadow-2xl relative overflow-hidden text-white flex flex-col justify-between gap-y-[3.5vh] sm:gap-6 min-h-[82vh] md:min-h-0" id="welcome-screen-root">
      
      {/* Glowing 4-point star accent in bottom right */}
      <div className="absolute bottom-6 right-8 text-amber-100/30 animate-pulse select-none pointer-events-none">
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

      {/* Elegant Glowing Book Icon at the top */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        {/* Floating magic/sparkle dots above book */}
        <div className="absolute -top-1.5 flex gap-1 animate-pulse text-amber-200/80">
          <span className="text-[10px] delay-100 animate-bounce">✦</span>
          <span className="text-xs -translate-y-1 animate-bounce">✦</span>
          <span className="text-[9px] delay-200 animate-bounce">✦</span>
        </div>
        <svg className="w-14 h-14 text-amber-100/90 drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>

      {/* App title */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-[0.15em] text-[#FAF6E9] uppercase drop-shadow-md">
          KELİME SAVAŞI
        </h1>
      </div>

      {/* User Profile Section with Halo and Name */}
      <div className="flex items-center justify-center gap-4 py-1 relative z-10">
        <div className="relative">
          {/* Golden Glowing Ring around Avatar */}
          <div 
            className="w-16 h-16 rounded-full bg-[#3D4756] border-2 border-amber-200/60 shadow-[0_0_15px_rgba(251,191,36,0.25)] flex items-center justify-center text-3xl overflow-hidden"
          >
            {profile.avatarUrl && profile.avatarUrl.length > 3 ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="select-none">{profile.avatarUrl || '🧠'}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-3xl font-medium tracking-wide text-[#FAF6E9]">{profile.name}</span>
        </div>
      </div>

      {/* Mini Stats Pill */}
      <div className="flex justify-center items-center gap-3 text-[11px] font-medium text-[#FAF6E9]/80 bg-[#3D4756]/40 px-4 py-1.5 rounded-full border border-white/5 w-fit mx-auto">
        <span className="flex items-center gap-1"><Award size={13} className="text-amber-400" /> {profile.dailyScore} Puan</span>
        <span className="text-white/15">|</span>
        <span className="flex items-center gap-1"><Flame size={13} className="text-orange-400 animate-pulse" /> {profile.stats?.currentStreak || 0} Seri</span>
        <span className="text-white/15">|</span>
        <span className="flex items-center gap-1"><Swords size={13} className="text-blue-400" /> %{winRate} Galibiyet</span>
      </div>

      {/* Direct Challenge Notification */}
      {activeChallenges.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/30 p-3 rounded-2xl space-y-2 animate-pulse text-left relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1">
              <Zap size={11} className="text-amber-500 fill-current animate-bounce" />
              DÜELLO DAVETİ VAR!
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-amber-500/20">
            <div className="text-left max-w-[150px] truncate">
              <span className="font-black text-xs text-[#FAF6E9] block leading-tight">{activeChallenges[0].challenger.name}</span>
              <span className="text-[9px] text-gray-400 block mt-0.5">{activeChallenges[0].wordLength} Harfli</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onDeclineChallenge?.(activeChallenges[0].id)}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 text-[9.5px] font-bold rounded-lg transition"
              >
                Red
              </button>
              <button
                onClick={() => onAcceptChallenge?.(activeChallenges[0].id)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9.5px] font-black rounded-lg transition shadow-sm"
              >
                Kabul
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Play Action Button - 3D retro styled cream button */}
      <div className="w-full flex flex-col gap-2">
        <button
          onClick={() => {
            setShowGameSetup(true);
            setSelectedTab(isOnline ? 'pvp' : 'solo');
          }}
          className="w-full bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.98] active:translate-y-0.5 text-[#2E3748] font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-[0_5px_0_#D9D4C3,0_8px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_0_#D9D4C3,0_6px_10px_rgba(0,0,0,0.15)] transition-all flex items-center justify-center uppercase tracking-wider cursor-pointer border border-[#EBE6D5] relative overflow-hidden"
        >
          <span>OYUNA BAŞLA</span>
        </button>

        {/* Matchmaking Queue Status */}
        {matchmakingStatus === 'queued' && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between animate-fade-in mt-1">
            <div className="text-left">
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Eşleşme Aranıyor...
              </span>
              <span className="text-[9.5px] text-gray-400 block mt-0.5">
                {wordLength} Harf • {selectedMatchWords} Kelime
              </span>
            </div>
            <button
              onClick={() => onStartMatchmaking(selectedMatchWords)}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition shadow"
            >
              Çık
            </button>
          </div>
        )}
      </div>

      {/* Beautiful Cream Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
        {/* Button 1: REKABET */}
        <button
          onClick={onOpenStats}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_#D9D4C3,0_6px_10px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer"
        >
          <Trophy size={24} className="stroke-[2.5]" />
          <span className="text-[11px] font-black uppercase tracking-widest">REKABET</span>
        </button>

        {/* Button 2: ARKADAŞLAR */}
        <button
          onClick={() => setShowFriendsModal(true)}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_#D9D4C3,0_6px_10px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer relative"
        >
          <Users size={24} className="stroke-[2.5]" />
          <span className="text-[11px] font-black uppercase tracking-widest">ARKADAŞLAR</span>
          {friendsList.some(f => lobbyPlayers.some(lp => lp.id === f.id)) && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-[#FAF6E9]" />
          )}
        </button>

        {/* Button 3: AYARLAR */}
        <button
          onClick={onOpenSettings}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_#D9D4C3,0_6px_10px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer"
        >
          <Sliders size={24} className="stroke-[2.5]" />
          <span className="text-[11px] font-black uppercase tracking-widest">AYARLAR</span>
        </button>

        {/* Button 4: KURALLAR */}
        <button
          onClick={() => setShowRulesModal(true)}
          className="bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.97] text-[#2E3748] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_#D9D4C3,0_6px_10px_rgba(0,0,0,0.15)] border border-[#EBE6D5] transition duration-150 cursor-pointer"
        >
          <HelpCircle size={24} className="stroke-[2.5]" />
          <span className="text-[11px] font-black uppercase tracking-widest">KURALLAR</span>
        </button>
      </div>

      {/* Rules Detail Popup Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2rem] p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-up text-left text-white relative overflow-hidden">
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
          <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2rem] p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-up text-left text-white relative overflow-hidden">
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
                        Aktif Oyuncular (Savaşçılar)
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
