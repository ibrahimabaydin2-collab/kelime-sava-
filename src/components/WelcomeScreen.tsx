import React, { useState } from 'react';
import { 
  Swords, Play, Globe, ShieldAlert, Sparkles, 
  Trophy, Users, HelpCircle, ChevronDown, ChevronUp, 
  Copy, Check, Flame, Zap, Target, Edit2, User, Award, CheckCircle2, TrendingUp
} from 'lucide-react';
import { UserProfile, LobbyPlayer, Challenge } from '../types.js';

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
  
  // Dynamic Integrated Dashboard Props
  lobbyPlayers?: LobbyPlayer[];
  activeChallenges?: Challenge[];
  onChallenge?: (player: LobbyPlayer, wordLength: number) => void;
  onAcceptChallenge?: (challengeId: string) => void;
  onDeclineChallenge?: (challengeId: string) => void;
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
  onStartGroupRace,
  lobbyPlayers = [],
  activeChallenges = [],
  onChallenge,
  onAcceptChallenge,
  onDeclineChallenge
}: WelcomeScreenProps) {
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showMissions, setShowMissions] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Profile Inline Editor State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatarUrl || '🧠');

  const AVATAR_PRESETS = ['⚔️', '🧠', '🐺', '🦁', '🧙‍♂️', '🦊', '👾', '🦄', '⚡', '👑', '🎯', '🚀', '🔥', '🐉', '🐼', '🛡️', '🏆', '🦉'];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    onUpdateProfile(editName.trim(), selectedAvatar);
    setIsEditing(false);
  };

  // Determine dynamic warrior title based on dailyScore
  const getWarriorTitle = (score: number) => {
    if (score < 100) return 'Acemi Er 🎖️';
    if (score < 500) return 'Kelime Savaşçısı ⚔️';
    if (score < 1500) return 'Hece Şövalyesi 🛡️';
    if (score < 3000) return 'Kelime Muhafızı 🔮';
    return 'Efsanevi Sözlük Üstadı 👑';
  };

  // Filter other online players
  const otherPlayers = lobbyPlayers.filter(p => p.id !== profile.id);

  const winRate = profile.stats?.gamesPlayed
    ? Math.round(((profile.stats?.gamesWon || 0) / profile.stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="w-full max-w-lg mx-auto space-y-5 px-4 py-2 animate-fade-in" id="welcome-screen-root">
      
      {/* Interactive Savaşçı Kartı (Warrior Profile Card) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden text-white" id="warrior-profile-card">
        {/* Background ambient lighting effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {isEditing ? (
          // Profile Edit Mode
          <div className="space-y-4 relative z-10 text-left animate-scale-up" id="profile-edit-mode">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={13} className="animate-pulse" /> Savaşçı Profilini Düzenle
              </span>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                İptal
              </button>
            </div>

            {/* Avatar Selector Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider block">BİR NİŞAN (AVATAR) SEÇ</label>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-2 bg-black/30 rounded-2xl border border-white/5 max-h-24 overflow-y-auto">
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
              <label className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider block">SAVAŞÇI ADI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Savaşçı adını yaz..."
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
          <div className="space-y-5 relative z-10 text-left animate-fade-in" id="profile-showcase-mode">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Profile Picture/Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-3xl sm:text-4xl shadow-inner relative overflow-hidden ring-4 ring-emerald-500/10 group-hover:ring-emerald-500/30 transition duration-300">
                    {selectedAvatar.length < 4 ? (
                      <span className="select-none animate-bounce" style={{ animationDuration: '4s' }}>{selectedAvatar}</span>
                    ) : (
                      <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                  {/* Small Active Badge */}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center" title="Çevrimiçi Savaşçı">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  </span>
                </div>

                {/* Name & Title */}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase truncate max-w-[160px] sm:max-w-[200px]">
                      {profile.name}
                    </h2>
                    <button 
                      onClick={() => {
                        setEditName(profile.name);
                        setSelectedAvatar(profile.avatarUrl || '🧠');
                        setIsEditing(true);
                      }}
                      className="p-1 rounded bg-white/5 hover:bg-white/15 hover:text-emerald-400 text-gray-450 transition duration-150 cursor-pointer"
                      title="Profili Düzenle"
                    >
                      <Edit2 size={11} />
                    </button>
                  </div>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[10px] font-extrabold uppercase rounded-full tracking-wider font-mono">
                    {getWarriorTitle(profile.dailyScore)}
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">SUNUCU BAĞLANTISI</span>
                <span className={`inline-flex items-center gap-1 text-xs font-extrabold mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {isOnline ? 'AKTİF' : 'ÇEVRİMDIŞI'}
                </span>
              </div>
            </div>

            {/* Warrior Quick Stats Horizontal Bento-Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              {/* Daily Score Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-2.5 sm:p-3 rounded-2xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5">
                <Award size={14} className="text-yellow-400" />
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">GÜNLÜK SKOR</span>
                <span className="text-xs sm:text-sm font-black text-yellow-400">{profile.dailyScore}</span>
              </div>

              {/* Win Streak Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-2.5 sm:p-3 rounded-2xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5">
                <Flame size={14} className={profile.stats?.currentStreak > 0 ? 'text-orange-500 animate-pulse' : 'text-gray-400'} />
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">SAVAŞ SERİSİ</span>
                <span className={`text-xs sm:text-sm font-black ${profile.stats?.currentStreak > 0 ? 'text-orange-500' : 'text-white'}`}>
                  {profile.stats?.currentStreak || 0} 🔥
                </span>
              </div>

              {/* Played Games Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-2.5 sm:p-3 rounded-2xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5">
                <Swords size={14} className="text-blue-400" />
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">TOPLAM MAÇ</span>
                <span className="text-xs sm:text-sm font-black text-blue-400">{profile.stats?.gamesPlayed || 0}</span>
              </div>

              {/* Win Rate Badge */}
              <div className="bg-white/5 hover:bg-white/10 p-2.5 sm:p-3 rounded-2xl border border-white/5 transition duration-150 text-center flex flex-col items-center justify-center space-y-0.5">
                <TrendingUp size={14} className="text-teal-400" />
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">ZAFER ORANI</span>
                <span className="text-xs sm:text-sm font-black text-teal-400">%{winRate}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Play Settings & Action Hub - Simplified centered card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Quick Word Settings */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Word Length Selector */}
            <div className="space-y-1.5 text-left">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase">HARF SAYISI</span>
              <div className="grid grid-cols-6 gap-1 p-1 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-150 dark:border-gray-800">
                {[3, 4, 5, 6, 7, 8].map((len) => (
                  <button
                    key={len}
                    onClick={() => onChangeWordLength(len)}
                    className={`py-1.5 rounded-md text-xs font-bold transition duration-150 ${
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
            <div className="space-y-1.5 text-left">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase">SÖZLÜK MODU</span>
              <div className="grid grid-cols-2 gap-1 bg-gray-50 dark:bg-gray-950 p-1 rounded-lg border border-gray-150 dark:border-gray-800">
                <button
                  onClick={() => onChangeDictionaryMode('tdk_online')}
                  className={`py-1.5 rounded-md text-xs font-bold transition duration-150 flex items-center justify-center gap-1 ${
                    dictionaryMode === 'tdk_online'
                      ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-150 dark:border-gray-800'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <Globe size={12} />
                  <span>TDK</span>
                </button>
                <button
                  onClick={() => onChangeDictionaryMode('no_validation')}
                  className={`py-1.5 rounded-md text-xs font-bold transition duration-150 flex items-center justify-center gap-1 ${
                    dictionaryMode === 'no_validation'
                      ? 'bg-white dark:bg-gray-900 text-amber-500 dark:text-amber-400 shadow-sm border border-gray-150 dark:border-gray-800'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <ShieldAlert size={12} />
                  <span>Serbest</span>
                </button>
              </div>
            </div>
          </div>

          {/* Game Mode Selector - Timed vs Untimed */}
          <div className="space-y-1.5 text-left border-t border-gray-100 dark:border-gray-800 pt-3.5">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 font-mono tracking-wider uppercase flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500 animate-pulse" /> OYUN MODU
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onChangeGameMode('timed')}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2.5 border text-left ${
                  gameMode === 'timed'
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">⏱️</span>
                <div className="flex flex-col">
                  <span className={`text-xs font-black leading-tight ${gameMode === 'timed' ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>Süreli Oyun</span>
                  <span className={`text-[8px] font-bold font-mono tracking-tight leading-none mt-0.5 ${gameMode === 'timed' ? 'text-emerald-100' : 'text-gray-400'}`}>İLK HARF VERİLİR</span>
                </div>
              </button>
              <button
                onClick={() => onChangeGameMode('untimed')}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2.5 border text-left ${
                  gameMode === 'untimed'
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">♾️</span>
                <div className="flex flex-col">
                  <span className={`text-xs font-black leading-tight ${gameMode === 'untimed' ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>Süresiz Oyun</span>
                  <span className={`text-[8px] font-bold font-mono tracking-tight leading-none mt-0.5 ${gameMode === 'untimed' ? 'text-emerald-100' : 'text-gray-400'}`}>SÜRE SINIRI YOKTUR</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Action Play Buttons */}
        <div className="space-y-3 pt-2">
          {/* 1v1 Online Matchmaking */}
          <button
            onClick={onStartMatchmaking}
            disabled={matchmakingStatus === 'queued'}
            className={`w-full flex items-center justify-between font-bold py-3.5 px-5 rounded-xl transition duration-150 active:scale-[0.99] text-sm uppercase tracking-wider border cursor-pointer ${
              matchmakingStatus === 'queued'
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <Swords size={16} className={matchmakingStatus === 'queued' ? 'animate-bounce' : ''} />
              <span>{matchmakingStatus === 'queued' ? 'Eşleşme Aranıyor...' : '1v1 Online Düello'}</span>
            </div>
            <span className="text-xs opacity-80 font-mono">
              {matchmakingStatus === 'queued' ? 'BEKLENİYOR' : 'HEMEN OYNA'}
            </span>
          </button>

          {/* Solo Game */}
          <button
            onClick={onStartSoloGame}
            className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-850 dark:bg-gray-800 dark:hover:bg-gray-750 text-white font-bold py-3 px-5 rounded-xl border border-gray-850 dark:border-gray-750 transition duration-150 active:scale-[0.99] text-sm uppercase tracking-wider cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Play size={14} className="fill-white" />
              <span>Tek Oyuncu Pratik</span>
            </div>
            <span className="text-xs text-gray-400 font-mono">ANTRENMAN</span>
          </button>

          {/* Group Race Tournament */}
          {onStartGroupRace && (
            <button
              onClick={onStartGroupRace}
              className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold py-3 px-5 rounded-xl shadow-sm transition duration-150 active:scale-[0.99] text-sm uppercase tracking-wider cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Trophy size={15} />
                <span>Grup Yarışı (Turnuva)</span>
              </div>
              <span className="text-xs text-slate-900/75 font-mono">YENİ MOD</span>
            </button>
          )}
        </div>

        {/* Matchmaking Queue Banner */}
        {matchmakingStatus === 'queued' && (
          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/40 p-4 rounded-xl text-center space-y-1.5 animate-fade-in">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block font-mono">
              Rakip Aranıyor... ({wordLength} Harf)
            </span>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-normal">
              Aynı sayıda harf seçen aktif bir rakip aranıyor. Lütfen ayrılmayın.
            </p>
          </div>
        )}
      </div>

      {/* Social / Direct Challenges - Simple & Clean */}
      {(activeChallenges.length > 0 || otherPlayers.length > 0) && (
        <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3.5">
          <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Aktif Oyuncular
            </h3>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-bold font-mono">
              {lobbyPlayers.length} Çevrimiçi
            </span>
          </div>

          {/* Active Invitations Received */}
          {activeChallenges.length > 0 && (
            <div className="space-y-2 bg-amber-500/5 p-3 rounded-xl border border-dashed border-amber-500/20 animate-fade-in text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Zap size={11} className="fill-amber-500/20 animate-pulse" />
                Meydan Okuma Daveti!
              </span>
              <div className="space-y-1.5">
                {activeChallenges.map((chal) => (
                  <div key={chal.id} className="bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/50 p-2.5 rounded-lg flex items-center justify-between gap-2">
                    <div className="text-left">
                      <span className="font-bold text-xs text-gray-800 dark:text-white block">{chal.challenger.name}</span>
                      <span className="text-[10px] text-gray-400 block">{chal.wordLength} Harfli Maç</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onDeclineChallenge?.(chal.id)}
                        className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md transition cursor-pointer"
                      >
                        Reddet
                      </button>
                      <button
                        onClick={() => onAcceptChallenge?.(chal.id)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-md transition shadow-sm cursor-pointer"
                      >
                        Kabul Et
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other players online list */}
          {otherPlayers.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {otherPlayers.map((player) => (
                <div key={player.id} className="p-2 bg-gray-50/50 dark:bg-gray-950/25 rounded-xl border border-gray-100 dark:border-gray-850 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs border border-white dark:border-gray-850 shrink-0">
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
                      <span className="text-xs font-bold text-gray-800 dark:text-white block leading-tight">{player.name}</span>
                      <span className="text-[9px] text-gray-400 block font-mono">
                        {player.status === 'playing' ? 'Oyunda' : player.status === 'challenging' ? 'Sırada' : 'Boşta'}
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={player.status !== 'idle'}
                    onClick={() => onChallenge?.(player, wordLength)}
                    className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition duration-150 flex items-center gap-1 cursor-pointer ${
                      player.status === 'idle'
                        ? 'bg-gray-150 hover:bg-emerald-500 dark:bg-gray-800 dark:hover:bg-emerald-500 text-gray-700 dark:text-gray-300 hover:text-white'
                        : 'bg-gray-100 dark:bg-gray-850 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Swords size={10} />
                    <span>Savaş Aç</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Daily Missions - Compact Collapsible */}
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowMissions(!showMissions)}
          className="w-full flex items-center justify-between p-3.5 text-left text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850/40 transition duration-150 cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider">
            <Trophy size={14} className="text-amber-500 animate-pulse" />
            <span className="text-gray-850 dark:text-gray-100">Savaş Görevleri & Başarımlar</span>
          </div>
          {showMissions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showMissions && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/10 space-y-3.5 text-left animate-fade-in">
            {profile.missions && profile.missions.find(m => !m.completed) ? (() => {
              const active = profile.missions.find(m => !m.completed)!;
              const progressPct = Math.min((active.current / active.target) * 100, 100);
              const completedCount = profile.missions.filter(m => m.completed).length;
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-wider">AKTİF HEDEF (SIRADAKİ GÖREV)</span>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-mono">Toplam: {completedCount}/{profile.missions.length} Başarılı</span>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-emerald-500/20 dark:border-emerald-950/50 shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">
                          {active.title}
                        </span>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5 font-medium">{active.description}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">
                        {active.current} / {active.target}
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden shadow-inner mb-1">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={onOpenMissions}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 text-xs transition duration-150"
                  >
                    <Target size={14} />
                    <span>Tüm Görevleri & Sıradaki Kuyruğu Aç</span>
                  </button>
                </div>
              );
            })() : (
              <div className="text-center py-2 space-y-2">
                <Trophy className="mx-auto text-amber-500 animate-bounce" size={24} />
                <p className="text-xs font-bold text-gray-800 dark:text-white">Bütün Görevler Başarıyla Tamamlandı!</p>
                <p className="text-[10px] text-gray-600 dark:text-gray-300">Harikasın, TDK Savaşçısı! Tüm ödülleri kazandın.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accordion - How to Play */}
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowHowToPlay(!showHowToPlay)}
          className="w-full flex items-center justify-between p-3.5 text-left text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850/40 transition duration-150 cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider">
            <HelpCircle size={14} className="text-emerald-500" />
            <span className="text-gray-850 dark:text-gray-100">Nasıl Oynanır & Kurallar</span>
          </div>
          {showHowToPlay ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showHowToPlay && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/10 text-xs text-gray-700 dark:text-gray-200 space-y-3.5 leading-relaxed animate-fade-in text-left">
            <div className="space-y-2.5">
              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-150 dark:border-gray-800/80 shadow-xs">
                <span className="font-bold text-gray-900 dark:text-gray-100 block mb-0.5">1. Harf Renkleri</span>
                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                  Tahmin ettiğiniz kelimedeki doğru yerdeki harfler <span className="text-emerald-500 dark:text-emerald-400 font-bold">Yeşil</span>, yanlış yerdeki harfler ise <span className="text-amber-500 dark:text-amber-400 font-bold">Turuncu</span> renk alır. Gri harfler kelimede yoktur.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-150 dark:border-gray-800/80 shadow-xs">
                <span className="font-bold text-gray-900 dark:text-gray-100 block mb-0.5">2. Canlı Eş Zamanlı Yarış</span>
                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                  Rakibinizle aynı gizli kelimeyi çözmeye çalışırsınız. En az deneme ile en hızlı sürede çözen düellonun kazananı olur.
                </p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-200 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition border border-gray-200 dark:border-gray-850 shadow-xs cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? 'Kopyalandı!' : 'Arkadaşını Davet Et (Link)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
