import { Sun, Moon, BarChart2, Award, Users, RefreshCw, Sliders, Target } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenStats: () => void;
  onOpenBadges: () => void;
  onOpenMissions: () => void;
  onOpenLobby: () => void;
  onOpenSettings: () => void;
  playerName: string;
  avatarUrl?: string;
  onEditName: () => void;
  dailyScore: number;
  isOnline: boolean;
}

export default function Header({
  darkMode,
  setDarkMode,
  onOpenStats,
  onOpenBadges,
  onOpenMissions,
  onOpenLobby,
  onOpenSettings,
  playerName,
  avatarUrl,
  onEditName,
  dailyScore,
  isOnline
}: HeaderProps) {
  return (
    <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="./logo.svg" 
            alt="Kelime Savaşı Logo" 
            className="w-10 h-10 rounded-xl shadow-md shadow-emerald-500/25 transition duration-300 hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans flex items-center gap-2">
              Kelime Savaşı
              <span className="text-xs font-normal text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                Türkçe
              </span>
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
              6 Hak • 20 Saniye
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Daily Score Display */}
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Skor</span>
            <span className="text-sm font-semibold text-amber-500">{dailyScore} Puan</span>
          </div>

          {/* Player Name */}
          <button
            onClick={onEditName}
            className="flex items-center gap-2 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 pl-2 pr-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 transition duration-150 font-medium max-w-[150px]"
          >
            {avatarUrl ? (
              <span className="w-6 h-6 rounded-full overflow-hidden border border-emerald-500 flex items-center justify-center bg-gray-200 dark:bg-gray-700 font-bold shrink-0">
                {avatarUrl.length < 4 ? (
                  <span className="text-sm leading-none">{avatarUrl}</span>
                ) : (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                )}
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shrink-0">
                {playerName ? playerName.charAt(0).toUpperCase() : 'O'}
              </span>
            )}
            <span className="truncate">{playerName || 'Oyuncu'}</span>
          </button>

          {/* Lobby Button */}
          <button
            onClick={onOpenLobby}
            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150"
            title="Arkadaş Listesi & Rekabet"
          >
            <Users size={20} />
            <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </button>

          {/* Missions Button */}
          <button
            onClick={onOpenMissions}
            className="p-2 rounded-lg text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition duration-150 relative"
            title="Savaş Görevleri"
            id="header-missions-btn"
          >
            <Target size={20} className="animate-pulse" />
          </button>

          {/* Stats Button */}
          <button
            onClick={onOpenStats}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150"
            title="İstatistikler"
          >
            <BarChart2 size={20} />
          </button>

          {/* Badges Button */}
          <button
            onClick={onOpenBadges}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150"
            title="Rozetler"
          >
            <Award size={20} />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150"
            title="Ayarlar"
            id="settings-button-header"
          >
            <Sliders size={20} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-150"
            title={darkMode ? 'Gündüz Modu' : 'Gece Modu'}
          >
            {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
