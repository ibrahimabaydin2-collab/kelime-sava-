import React, { useState } from 'react';
import { 
  Swords, Play, Globe, ShieldAlert, Sparkles, 
  Trophy, Users, HelpCircle, ChevronDown, ChevronUp, 
  Copy, Check, Flame, Zap, Target, Edit2, User, Award, CheckCircle2, TrendingUp,
  Sun, Moon, Sliders, BarChart2, X, ArrowLeft
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

  const winRate = profile.stats?.gamesPlayed
    ? Math.round(((profile.stats?.gamesWon || 0) / profile.stats.gamesPlayed) * 100)
    : 0;

  if (showGameSetup) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4 px-3 py-3 animate-scale-up animate-fade-in" id="welcome-setup-page">
        {/* Beautiful Game Setup Navbar */}
        <div className="flex justify-between items-center bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 dark:border-gray-800 rounded-2xl p-3 shadow-lg text-white">
          <button
            onClick={() => setShowGameSetup(false)}
            className="flex items-center gap-1.5 text-xs font-black text-gray-300 hover:text-white transition bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/5 cursor-pointer animate-fade-in"
          >
            <ArrowLeft size={14} />
            <span>Geri Dön</span>
          </button>
          
          <div className="flex items-center gap-2">
            <img 
              src="./logo.svg" 
              alt="Kelime Savaşı Logo" 
              className="w-5.5 h-5.5 rounded-lg animate-pulse"
              referrerPolicy="no-referrer"
            />
            <div className="text-right animate-fade-in">
              <h2 className="text-xs font-black text-white uppercase tracking-tight leading-none">
                Yeni Savaş Kur
              </h2>
              <p className="text-[7.5px] text-emerald-400 font-mono tracking-wider mt-0.5 leading-none">
                MODUNU BELİRLE
              </p>
            </div>
          </div>
        </div>

        {/* Setup Content - The frosted glass card */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-150 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 relative overflow-hidden" id="action-settings-card">
          {/* Decorative subtle atmospheric color splash inside settings card */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* STEP-BY-STEP GAME SETUP WIZARD */}
          <div className="space-y-4" id="game-setup-wizard">
            {/* Mode Tab Selector - Styled as premium large cards/buttons */}
            <div className="grid grid-cols-3 gap-2">
              {/* PvP Tab */}
              <button
                onClick={() => setSelectedTab('pvp')}
                className={`py-3.5 px-2 rounded-2xl border transition duration-150 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer ${
                  selectedTab === 'pvp'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 border-gray-150 dark:border-gray-850 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                <span className="text-xl">⚔️</span>
                <span className="text-[10px] font-black uppercase tracking-wider leading-none">1v1 Düello</span>
              </button>

              {/* Solo Tab */}
              <button
                onClick={() => setSelectedTab('solo')}
                className={`py-3.5 px-2 rounded-2xl border transition duration-150 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer ${
                  selectedTab === 'solo'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 border-gray-150 dark:border-gray-850 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                <span className="text-xl">🧩</span>
                <span className="text-[10px] font-black uppercase tracking-wider leading-none">Solo Pratik</span>
              </button>

              {/* Group Tab */}
              {onStartGroupRace && (
                <button
                  onClick={() => setSelectedTab('group')}
                  className={`py-3.5 px-2 rounded-2xl border transition duration-150 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer ${
                    selectedTab === 'group'
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 border-gray-150 dark:border-gray-850 hover:bg-gray-100 dark:hover:bg-gray-900'
                  }`}
                >
                  <span className="text-xl">🏆</span>
                  <span className="text-[10px] font-black uppercase tracking-wider leading-none">Grup Yarışı</span>
                </button>
              )}
            </div>

            {/* Parameter Controls specific to selected mode */}
            {selectedTab !== 'group' && (
              <div className="space-y-4 bg-gray-50/50 dark:bg-gray-950/25 p-4 rounded-2xl border border-gray-150 dark:border-gray-850/65">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Word Length Selector */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase">HARF SAYISI</span>
                    <div className="grid grid-cols-6 gap-1 p-0.5 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-150 dark:border-gray-800">
                      {[3, 4, 5, 6, 7, 8].map((len) => (
                        <button
                          key={len}
                          onClick={() => onChangeWordLength(len)}
                          className={`py-1.5 rounded-md text-[12px] font-black transition duration-150 ${
                            wordLength === len
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-250 dark:hover:bg-gray-800'
                          }`}
                        >
                          {len}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dictionary Mode Selector */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase">SÖZLÜK MODU</span>
                    <div className="grid grid-cols-2 gap-1 bg-gray-50 dark:bg-gray-950 p-0.5 rounded-lg border border-gray-150 dark:border-gray-800">
                      <button
                        onClick={() => onChangeDictionaryMode('tdk_online')}
                        className={`py-1.5 rounded-md text-[12px] font-black transition duration-150 flex items-center justify-center gap-1.5 ${
                          dictionaryMode === 'tdk_online'
                            ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-150 dark:border-gray-800'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-250 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Globe size={12} />
                        <span>TDK</span>
                      </button>
                      <button
                        onClick={() => onChangeDictionaryMode('no_validation')}
                        className={`py-1.5 rounded-md text-[12px] font-black transition duration-150 flex items-center justify-center gap-1.5 ${
                          dictionaryMode === 'no_validation'
                            ? 'bg-white dark:bg-gray-900 text-amber-500 dark:text-amber-400 shadow-sm border border-gray-150 dark:border-gray-800'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-250 dark:hover:bg-gray-800'
                        }`}
                      >
                        <ShieldAlert size={12} />
                        <span>Serbest</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mode-specific secondary settings */}
                {selectedTab === 'solo' ? (
                  <div className="space-y-1.5 text-left border-t border-gray-100 dark:border-gray-850 pt-3">
                    <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase flex items-center gap-1">
                      <Zap size={11} className="text-amber-500 animate-pulse" /> SÜRE DURUMU
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onChangeGameMode('timed')}
                        className={`py-2 px-3 rounded-xl text-[12px] font-black transition duration-150 flex items-center justify-center gap-2 border text-left cursor-pointer ${
                          gameMode === 'timed'
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-150 dark:border-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span>⏱️ Süreli Oyun</span>
                      </button>
                      <button
                        onClick={() => onChangeGameMode('untimed')}
                        className={`py-2 px-3 rounded-xl text-[12px] font-black transition duration-150 flex items-center justify-center gap-2 border text-left cursor-pointer ${
                          gameMode === 'untimed'
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-150 dark:border-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span>♾️ Süresiz Oyun</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-left border-t border-gray-100 dark:border-gray-850 pt-3">
                    <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase flex items-center gap-1">
                      <Swords size={11} className="text-emerald-500" /> DÜELLO TUR SAYISI (KAÇ KELİME)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedMatchWords(3)}
                        className={`py-2 rounded-xl text-[12px] font-black transition duration-150 flex items-center justify-center gap-1.5 border cursor-pointer ${
                          selectedMatchWords === 3
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-900 text-gray-650 dark:text-gray-400 border-gray-150 dark:border-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span>3 Kelime (3 Tur)</span>
                      </button>
                      <button
                        onClick={() => setSelectedMatchWords(5)}
                        className={`py-2 rounded-xl text-[12px] font-black transition duration-150 flex items-center justify-center gap-1.5 border cursor-pointer ${
                          selectedMatchWords === 5
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-900 text-gray-650 dark:text-gray-400 border-gray-150 dark:border-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span>5 Kelime (5 Tur)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Launch Actions */}
            {selectedTab === 'solo' && (
              <button
                onClick={() => {
                  onStartSoloGame();
                  setShowGameSetup(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black py-4 px-5 rounded-2xl border border-emerald-400 shadow-md hover:shadow-lg transition-all duration-150 active:scale-[0.98] text-xs uppercase tracking-widest cursor-pointer"
              >
                <Play size={14} className="fill-white" />
                <span>Tek Oyuncu Başlat</span>
              </button>
            )}

            {selectedTab === 'pvp' && (
              <button
                onClick={() => {
                  onStartMatchmaking(selectedMatchWords);
                  setShowGameSetup(false);
                }}
                disabled={matchmakingStatus === 'queued' || !isOnline}
                className={`w-full flex items-center justify-center gap-2 font-black py-4 px-5 rounded-2xl transition-all duration-150 active:scale-[0.98] text-xs uppercase tracking-widest border cursor-pointer ${
                  !isOnline
                    ? 'bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-60'
                    : matchmakingStatus === 'queued'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-lg shadow-orange-500/20 animate-pulse'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 shadow-md'
                }`}
              >
                <Swords size={14} className={matchmakingStatus === 'queued' ? 'animate-bounce' : ''} />
                <span>{matchmakingStatus === 'queued' ? 'Aranıyor...' : '1v1 Düello Başlat'}</span>
              </button>
            )}

            {selectedTab === 'group' && onStartGroupRace && (
              <div className="space-y-3">
                <div className="bg-amber-500/5 border border-dashed border-amber-500/25 p-3 rounded-xl text-left space-y-1">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block font-mono">GRUP TURNUVASI YARIŞI</span>
                  <p className="text-[10.5px] text-gray-500 dark:text-gray-400 leading-normal">
                    Aynı oda koduyla bağlanan tüm arkadaşlarınızla gerçek zamanlı olarak en hızlı kim kelimeyi bulacak yarışın!
                  </p>
                </div>
                <button
                  onClick={() => {
                    onStartGroupRace();
                    setShowGameSetup(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-600 text-slate-950 font-black py-4 px-5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-150 active:scale-[0.98] text-xs uppercase tracking-widest cursor-pointer border border-yellow-300/40"
                >
                  <Trophy size={14} />
                  <span>Grup Yarış Odası Kur / Katıl</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return isEditing ? (
    <div className="w-full max-w-md mx-auto bg-[#2E3748] rounded-[2.5rem] border border-[#3E485A] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white flex flex-col gap-5 animate-scale-up" id="welcome-screen-root">
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
    <div className="w-full max-w-md mx-auto bg-[#2E3748] rounded-[2.5rem] border border-[#3E485A] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white flex flex-col gap-6" id="welcome-screen-root">
      
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
            onClick={() => {
              setEditName(profile.name);
              setSelectedAvatar(profile.avatarUrl || '🧠');
              setIsEditing(true);
            }}
            className="w-16 h-16 rounded-full bg-[#3D4756] border-2 border-amber-200/60 shadow-[0_0_15px_rgba(251,191,36,0.25)] flex items-center justify-center text-3xl overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
          >
            {profile.avatarUrl && profile.avatarUrl.length > 3 ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="select-none">{profile.avatarUrl || '🧠'}</span>
            )}
          </div>
          <button 
            onClick={() => {
              setEditName(profile.name);
              setSelectedAvatar(profile.avatarUrl || '🧠');
              setIsEditing(true);
            }}
            className="absolute -bottom-1 -right-1 bg-amber-400 hover:bg-amber-300 text-slate-950 p-1.5 rounded-full shadow-md transition"
            title="Profili Düzenle"
          >
            <Edit2 size={10} strokeWidth={2.5} />
          </button>
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

      {/* Glassmorphic Nickname Input Box */}
      <div className="w-full bg-[#4B5563]/40 border border-white/10 rounded-2xl p-4 text-left shadow-inner space-y-1">
        <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-widest block font-sans">KULLANICI ADINIZ</label>
        <input
          type="text"
          maxLength={16}
          value={editName}
          onChange={(e) => {
            const newVal = e.target.value;
            setEditName(newVal);
            if (newVal.trim().length > 0) {
              onUpdateProfile(newVal.trim(), profile.avatarUrl);
            }
          }}
          placeholder="Kullanıcı adınızı yazın..."
          className="w-full bg-[#2E3748]/55 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-200/40 focus:border-transparent transition"
        />
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

      {/* Beautiful Cream 2x2 Action Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
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
          {otherPlayers.length > 0 && (
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
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <HelpCircle size={18} className="text-emerald-500" />
                  Nasıl Oynanır & Kurallar
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-bold uppercase mt-0.5">
                  TDK KELİME SAVAŞI REHBERİ
                </p>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300 max-h-[50vh] overflow-y-auto pr-1">
              <div className="bg-gray-50 dark:bg-gray-950/45 p-3 rounded-xl border border-gray-150 dark:border-gray-850">
                <span className="font-bold text-gray-900 dark:text-white block mb-0.5">1. Harf Renkleri</span>
                <p className="text-[11px] leading-normal text-gray-600 dark:text-gray-400">
                  Tahmin ettiğiniz kelimedeki doğru yerdeki harfler <span className="text-emerald-500 dark:text-emerald-400 font-bold">Yeşil</span>, yanlış yerdeki harfler ise <span className="text-amber-500 dark:text-amber-400 font-bold">Turuncu</span> renk alır. Gri harfler kelimede yoktur.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950/45 p-3 rounded-xl border border-gray-150 dark:border-gray-850">
                <span className="font-bold text-gray-900 dark:text-white block mb-0.5">2. Canlı Eş Zamanlı Yarış</span>
                <p className="text-[11px] leading-normal text-gray-600 dark:text-gray-400">
                  Rakibinizle aynı gizli kelimeyi çözmeye çalışırsınız. En az deneme ile en hızlı sürede çözen düellonun kazananı olur.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950/45 p-3 rounded-xl border border-gray-150 dark:border-gray-850">
                <span className="font-bold text-gray-900 dark:text-white block mb-0.5">3. TDK Sözlük Doğrulaması</span>
                <p className="text-[11px] leading-normal text-gray-600 dark:text-gray-400">
                  Girdiğiniz her tahminin TDK sözlüğünde yer alması gerekir. Çözülemeyen kelimelerin anlamlarını oyun bittiğinde görebilirsiniz.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-[10px] font-bold transition border border-gray-150 dark:border-gray-850 cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? 'Kopyalandı!' : 'Arkadaş Davet Et'}</span>
              </button>

              <button
                onClick={() => setShowRulesModal(false)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition cursor-pointer"
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
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <Users size={18} className="text-teal-500" />
                  Aktif Arkadaşlar
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-bold uppercase mt-0.5">
                  ÇEVRİMİÇİ OYUNCU LİSTESİ ({lobbyPlayers.length})
                </p>
              </div>
              <button
                onClick={() => setShowFriendsModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Active Invitations/Challenges Received inside Friends list */}
            {activeChallenges.length > 0 && (
              <div className="space-y-1.5 bg-amber-500/5 p-3 rounded-xl border border-dashed border-amber-500/20 animate-fade-in text-left">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap size={10} className="fill-amber-500/20 animate-pulse" />
                  Meydan Okuma Daveti Var!
                </span>
                <div className="space-y-1">
                  {activeChallenges.map((chal) => (
                    <div key={chal.id} className="bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/50 p-2.5 rounded-lg flex items-center justify-between gap-1.5 shadow-xs">
                      <div className="text-left">
                        <span className="font-bold text-[11px] text-gray-800 dark:text-white block leading-tight">{chal.challenger.name}</span>
                        <span className="text-[9px] text-gray-400 block">{chal.wordLength} Harfli Maç</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onDeclineChallenge?.(chal.id)}
                          className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
                        >
                          Reddet
                        </button>
                        <button
                          onClick={() => onAcceptChallenge?.(chal.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition shadow-sm cursor-pointer"
                        >
                          Kabul Et
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs leading-relaxed text-gray-700 dark:text-gray-300 max-h-[45vh] overflow-y-auto pr-1">
              {!isOnline ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-xs font-bold font-mono">ÇEVRİMDIŞI MOD</p>
                  <p className="text-[10px] mt-1 text-gray-400/85">Arkadaşlarını görebilmek ve savaş açabilmek için internet bağlantısı gerekir.</p>
                </div>
              ) : otherPlayers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-xs font-black font-mono">LOBİ BOŞ 🏜️</p>
                  <p className="text-[10px] mt-1 text-gray-400/85">Şu anda başka aktif arkadaşın yok. Aşağıdaki butondan davet linkini kopyalayıp arkadaşına gönderebilirsin!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {otherPlayers.map((player) => (
                    <div key={player.id} className="p-2.5 bg-gray-50/50 dark:bg-gray-950/25 rounded-xl border border-gray-100 dark:border-gray-850 flex items-center justify-between text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs border border-white dark:border-gray-800 shrink-0">
                          {player.avatarUrl ? (
                            player.avatarUrl.length < 4 ? (
                              <span className="text-sm select-none">{player.avatarUrl}</span>
                            ) : (
                              <img src={player.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                            )
                          ) : (
                            <span className="text-gray-500">{player.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-black text-gray-800 dark:text-white block leading-none">{player.name}</span>
                          <span className="text-[8.5px] text-gray-400 block font-mono mt-0.5 uppercase tracking-wide">
                            {player.status === 'playing' ? '🎮 Oyunda' : player.status === 'challenging' ? '⚔️ Sırada' : '🟢 Boşta'}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={player.status !== 'idle'}
                        onClick={() => {
                          onChallenge?.(player, wordLength);
                          setShowFriendsModal(false);
                        }}
                        className={`text-[9.5px] px-2.5 py-1 rounded-lg font-black uppercase transition duration-150 flex items-center gap-1 cursor-pointer ${
                          player.status === 'idle'
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-850 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Swords size={10} />
                        <span>Meydan Oku</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-[10px] font-bold transition border border-gray-150 dark:border-gray-850 cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? 'Kopyalandı!' : 'Arkadaş Davet Et'}</span>
              </button>

              <button
                onClick={() => setShowFriendsModal(false)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition cursor-pointer"
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
