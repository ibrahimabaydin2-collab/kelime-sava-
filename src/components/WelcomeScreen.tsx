import React, { useState } from 'react';
import { 
  Swords, Play, Globe, ShieldAlert, Sparkles, 
  Trophy, Users, HelpCircle, ChevronDown, ChevronUp, 
  Copy, Check, Flame, Zap, Target, Edit2, User, Award, CheckCircle2, TrendingUp,
  Sun, Moon, Sliders, BarChart2, X
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
  onStartMatchmaking: () => void;
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

  // Profile Inline Editor State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatarUrl || '🧠');

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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 px-3 py-1.5 animate-fade-in" id="welcome-screen-root">

      {/* Interactive Oyuncu Profil Kartı (Player Profile Card) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 dark:border-gray-800 rounded-3xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden text-white" id="player-profile-card">
        {/* Background ambient lighting effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Unified App Header (Integrated Inside Warrior Card) */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5 relative z-10 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img 
                src="./logo.svg" 
                alt="Kelime Savaşı Logo" 
                className="w-8 h-8 rounded-xl shadow-lg border border-emerald-500/15 transition duration-500 hover:rotate-6"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-left">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase leading-none drop-shadow-md">
                Kelime Savaşı
              </h1>
              <p className="text-[8px] sm:text-[8.5px] text-emerald-400 font-mono font-bold tracking-wider uppercase mt-0.5 leading-none">
                KELİME BULMACA DÜELLOSU
              </p>
            </div>
          </div>
          
          {/* Connection status with instant reconnect */}
          <div className="flex items-center gap-1.5 bg-black/45 border border-white/10 rounded-full px-2.5 py-1 shadow-inner">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[8px] sm:text-[8.5px] font-black text-gray-250 font-mono tracking-wider uppercase leading-none">
              {isOnline ? 'AKTİF' : 'ÇEVRİMDIŞI'}
            </span>
            {!isOnline && onReconnect && (
              <button
                onClick={onReconnect}
                className="text-[7.5px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 rounded font-black transition duration-150 cursor-pointer animate-pulse ml-1"
              >
                BAĞLAN
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          // Profile Edit Mode
          <div className="space-y-4 relative z-10 text-left animate-scale-up" id="profile-edit-mode">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={13} className="animate-pulse" /> Profilinizi Düzenleyin
              </span>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                İptal
              </button>
            </div>

            {/* Avatar Selector Grid with Custom Photo Upload */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider block">BİR NİŞAN (AVATAR) SEÇ</label>
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
                    className="text-[9.5px] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 font-black px-2.5 py-1 rounded-lg transition duration-150 cursor-pointer uppercase font-mono tracking-wider flex items-center gap-1"
                  >
                    <span>Fotoğraf Yükle 📸</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-2 bg-black/30 rounded-2xl border border-white/5 max-h-24 overflow-y-auto">
                {/* Show custom uploaded photo if present */}
                {selectedAvatar && selectedAvatar.length >= 4 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(selectedAvatar)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition duration-150 active:scale-90 relative group overflow-hidden ${
                      selectedAvatar.length >= 4
                        ? 'ring-2 ring-emerald-500 scale-105 shadow-md shadow-emerald-500/25'
                        : ''
                    }`}
                  >
                    <img src={selectedAvatar} alt="Custom Avatar" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[7px] font-black opacity-0 group-hover:opacity-100 transition duration-150 text-white leading-none">SEÇİLİ</span>
                  </button>
                )}
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedAvatar(preset)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition duration-150 active:scale-90 hover:bg-white/10 ${
                      selectedAvatar === preset 
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 scale-110 shadow-lg shadow-emerald-500/20' 
                        : ''
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input field */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider block">OYUNCU ADI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Oyuncu adını yaz..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={!editName.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  <CheckCircle2 size={13} />
                  <span>KAYDET</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Profile Showcase Mode
          <div className="space-y-4 relative z-10 text-left animate-fade-in" id="profile-showcase-mode">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Profile Picture/Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl shadow-inner relative overflow-hidden ring-2 ring-emerald-500/10 group-hover:ring-emerald-500/30 transition duration-300">
                    {selectedAvatar.length < 4 ? (
                      <span className="select-none animate-bounce" style={{ animationDuration: '4s' }}>{selectedAvatar}</span>
                    ) : (
                      <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                </div>

                {/* Name & Title */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider block">AKTİF OYUNCU</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase truncate max-w-[160px] sm:max-w-[200px]">
                      {profile.name}
                    </h2>
                    <button 
                      onClick={() => {
                        setEditName(profile.name);
                        setSelectedAvatar(profile.avatarUrl || '🧠');
                        setIsEditing(true);
                      }}
                      className="p-1 rounded bg-white/5 hover:bg-white/15 hover:text-emerald-400 text-gray-400 transition duration-150 cursor-pointer"
                      title="Profili Düzenle"
                    >
                      <Edit2 size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Oyuncu Seviyesi / Unvanı */}
              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block font-bold leading-none">OYUNCU UNVANI</span>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-[9px] font-extrabold uppercase rounded-full tracking-wider font-mono">
                  {getWarriorTitle(profile.dailyScore)}
                </span>
              </div>
            </div>

            {/* Warrior Quick Stats Horizontal Bento-Grid */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
              {/* Daily Score Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-1.5 sm:p-3 rounded-xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5 animate-pulse" style={{ animationDuration: '6s' }}>
                <Award size={12} className="text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider block leading-none">SKOR</span>
                <span className="text-xs sm:text-sm font-black text-yellow-400">{profile.dailyScore}</span>
              </div>

              {/* Win Streak Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-1.5 sm:p-3 rounded-xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5">
                <Flame size={12} className={profile.stats?.currentStreak > 0 ? 'text-orange-500 animate-pulse' : 'text-gray-400'} />
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider block leading-none">SERİ</span>
                <span className={`text-xs sm:text-sm font-black ${profile.stats?.currentStreak > 0 ? 'text-orange-500' : 'text-white'}`}>
                  {profile.stats?.currentStreak || 0} 🔥
                </span>
              </div>

              {/* Played Games Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-1.5 sm:p-3 rounded-xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5">
                <Swords size={12} className="text-blue-400" />
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider block leading-none">MAÇ</span>
                <span className="text-xs sm:text-sm font-black text-blue-400">{profile.stats?.gamesPlayed || 0}</span>
              </div>

              {/* Win Rate Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-1.5 sm:p-3 rounded-xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5">
                <TrendingUp size={12} className="text-teal-400" />
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider block leading-none">KAZANMA</span>
                <span className="text-xs sm:text-sm font-black text-teal-400">%{winRate}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Play Settings & Action Hub - Simplified centered card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Quick Word Settings */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Word Length Selector */}
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase">HARF SAYISI</span>
              <div className="grid grid-cols-6 gap-0.5 p-0.5 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-150 dark:border-gray-800">
                {[3, 4, 5, 6, 7, 8].map((len) => (
                  <button
                    key={len}
                    onClick={() => onChangeWordLength(len)}
                    className={`py-1 rounded-md text-xs font-bold transition duration-150 ${
                      wordLength === len
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* Dictionary Mode Selector */}
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase">SÖZLÜK MODU</span>
              <div className="grid grid-cols-2 gap-0.5 bg-gray-50 dark:bg-gray-950 p-0.5 rounded-lg border border-gray-150 dark:border-gray-800">
                <button
                  onClick={() => onChangeDictionaryMode('tdk_online')}
                  className={`py-1 rounded-md text-xs font-bold transition duration-150 flex items-center justify-center gap-1 ${
                    dictionaryMode === 'tdk_online'
                      ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-150 dark:border-gray-800'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <Globe size={11} />
                  <span>TDK</span>
                </button>
                <button
                  onClick={() => onChangeDictionaryMode('no_validation')}
                  className={`py-1 rounded-md text-xs font-bold transition duration-150 flex items-center justify-center gap-1 ${
                    dictionaryMode === 'no_validation'
                      ? 'bg-white dark:bg-gray-900 text-amber-500 dark:text-amber-400 shadow-sm border border-gray-150 dark:border-gray-800'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <ShieldAlert size={11} />
                  <span>Serbest</span>
                </button>
              </div>
            </div>
          </div>

          {/* Game Mode Selector - Timed vs Untimed */}
          <div className="space-y-1 text-left border-t border-gray-100 dark:border-gray-800 pt-2.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase flex items-center gap-1">
              <Zap size={11} className="text-amber-500 animate-pulse" /> OYUN MODU
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeGameMode('timed')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2 border text-left cursor-pointer ${
                  gameMode === 'timed'
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-sm">⏱️</span>
                <span className={`text-xs font-black leading-tight ${gameMode === 'timed' ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>Süreli Oyun</span>
              </button>
              <button
                onClick={() => onChangeGameMode('untimed')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2 border text-left cursor-pointer ${
                  gameMode === 'untimed'
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-sm">♾️</span>
                <span className={`text-xs font-black leading-tight ${gameMode === 'untimed' ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>Süresiz Oyun</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Play Buttons */}
        <div className="space-y-2 pt-1">
          {/* 1v1 Online Matchmaking */}
          <button
            onClick={onStartMatchmaking}
            disabled={matchmakingStatus === 'queued' || !isOnline}
            className={`w-full flex items-center justify-between font-bold py-2.5 px-4 rounded-xl transition duration-150 active:scale-[0.99] text-xs uppercase tracking-wider border cursor-pointer ${
              !isOnline 
                ? 'bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-60'
                : matchmakingStatus === 'queued'
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <Swords size={14} className={matchmakingStatus === 'queued' ? 'animate-bounce' : ''} />
              <span>{matchmakingStatus === 'queued' ? 'Eşleşme Aranıyor...' : '1v1 Online Düello'}</span>
            </div>
            <span className="text-[10px] opacity-80 font-mono">
              {!isOnline ? 'ÇEVRİMDIŞI' : matchmakingStatus === 'queued' ? 'BEKLENİYOR' : 'HEMEN OYNA'}
            </span>
          </button>

          {/* Solo Game - Made Primary */}
          <button
            onClick={onStartSoloGame}
            className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-850 dark:bg-gray-800 dark:hover:bg-gray-750 text-white font-bold py-2.5 px-4 rounded-xl border border-gray-850 dark:border-gray-750 transition duration-150 active:scale-[0.99] text-xs uppercase tracking-wider cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Play size={12} className="fill-white" />
              <span>Tek Oyuncu Pratik</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">SOLO OYNA</span>
          </button>

          {/* Group Race Tournament */}
          {onStartGroupRace && (
            <button
              onClick={onStartGroupRace}
              className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl shadow-sm transition duration-150 active:scale-[0.99] text-xs uppercase tracking-wider cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Trophy size={13} />
                <span>Grup Yarışı (Turnuva)</span>
              </div>
              <span className="text-[10px] text-slate-900/75 font-mono">YENİ MOD</span>
            </button>
          )}
        </div>

        {/* Matchmaking Queue Banner */}
        {matchmakingStatus === 'queued' && (
          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/40 p-2.5 rounded-xl text-center space-y-1 animate-fade-in text-left">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block font-mono">
              Rakip Aranıyor... ({wordLength} Harf)
            </span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
              Aynı sayıda harf seçen aktif bir rakip aranıyor. Lütfen ayrılmayın.
            </p>
          </div>
        )}

        {/* Direct Challenge Notification on Main Screen */}
        {activeChallenges.length > 0 && (
          <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/30 p-3 rounded-xl space-y-2 animate-pulse text-left relative overflow-hidden mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
                <Zap size={11} className="text-amber-500 fill-current animate-bounce" />
                DÜELLO DAVETİ VAR!
              </span>
              <button 
                onClick={() => setShowFriendsModal(true)}
                className="text-[9px] font-bold text-amber-600 dark:text-amber-400 underline hover:text-amber-700 cursor-pointer"
              >
                Tümünü Gör
              </button>
            </div>
            <div className="flex items-center justify-between bg-white dark:bg-gray-950 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
              <div className="text-left">
                <span className="font-black text-xs text-gray-800 dark:text-gray-150 block leading-tight">
                  {activeChallenges[0].challenger.name}
                </span>
                <span className="text-[9px] text-gray-400 block mt-0.5">
                  {activeChallenges[0].wordLength} Harfli Maç Teklifi
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onDeclineChallenge?.(activeChallenges[0].id)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 text-[9.5px] font-bold rounded transition cursor-pointer"
                >
                  Reddet
                </button>
                <button
                  onClick={() => onAcceptChallenge?.(activeChallenges[0].id)}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9.5px] font-black rounded transition shadow-sm cursor-pointer"
                >
                  Savaşa Gir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side rectangular folder cards ("dosya misali yanyana" - 4 columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5" id="welcome-bottom-folders">
        {/* Card 1: Savaş Görevleri */}
        <button
          onClick={onOpenMissions}
          className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-850/40 transition duration-150 cursor-pointer text-left flex flex-col justify-between h-14 relative overflow-hidden shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500/50 group"
        >
          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition" />
          <div className="flex items-center gap-1 text-[8.5px] font-extrabold font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none">
            <Trophy size={10} className="text-amber-500 animate-pulse" />
            <span>GÖREVLER</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] font-black text-gray-850 dark:text-gray-100 block leading-tight">Savaş Görevleri</span>
          </div>
        </button>

        {/* Card 2: Nasıl Oynanır */}
        <button
          onClick={() => setShowRulesModal(true)}
          className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-850/40 transition duration-150 cursor-pointer text-left flex flex-col justify-between h-14 relative overflow-hidden shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500/50 group"
        >
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition" />
          <div className="flex items-center gap-1 text-[8.5px] font-extrabold font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">
            <HelpCircle size={10} className="text-emerald-500" />
            <span>KURALLAR</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] font-black text-gray-850 dark:text-gray-100 block leading-tight">Nasıl Oynanır?</span>
          </div>
        </button>

        {/* Card 3: Oyun Ayarları */}
        <button
          onClick={onOpenSettings}
          className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-850/40 transition duration-150 cursor-pointer text-left flex flex-col justify-between h-14 relative overflow-hidden shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500/50 group"
        >
          <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition" />
          <div className="flex items-center gap-1 text-[8.5px] font-extrabold font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 leading-none">
            <Sliders size={10} className="text-blue-500" />
            <span>AYARLAR</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] font-black text-gray-850 dark:text-gray-100 block leading-tight">Oyun Ayarları</span>
          </div>
        </button>

        {/* Card 4: Aktif Arkadaşlar */}
        <button
          onClick={() => setShowFriendsModal(true)}
          className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-850/40 transition duration-150 cursor-pointer text-left flex flex-col justify-between h-14 relative overflow-hidden shadow-xs hover:border-teal-500 dark:hover:border-teal-500/50 group"
        >
          <div className="absolute top-0 right-0 w-12 h-12 bg-teal-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-teal-500/10 transition" />
          <div className="flex items-center gap-1 text-[8.5px] font-extrabold font-mono uppercase tracking-wider text-teal-600 dark:text-teal-400 leading-none">
            <Users size={10} className="text-teal-500" />
            <span className="flex items-center gap-1">
              ARKADAŞLAR
              {otherPlayers.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </span>
          </div>
          <div className="flex items-center justify-between w-full leading-none">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-850 dark:text-gray-100 block truncate leading-none">Aktif Arkadaşlar</span>
            {otherPlayers.length > 0 && (
              <span className="text-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold px-1 rounded scale-90 sm:scale-100">
                {otherPlayers.length}
              </span>
            )}
          </div>
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
