import { useState } from 'react';
import { X, Award, CheckCircle, BarChart2, Share2, Sparkles, Copy, Check } from 'lucide-react';
import { UserProfile, Badge, DailyMission } from '../types';

interface StatsModalProps {
  profile: UserProfile;
  onClose: () => void;
  onResetStats?: () => void;
}

export default function StatsModal({
  profile,
  onClose,
  onResetStats
}: StatsModalProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'missions' | 'badges'>('stats');
  const [copied, setCopied] = useState(false);

  const stats = profile.stats;
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  
  // Find highest frequency in win distribution for scaling bars
  const maxDistribution = Math.max(...stats.winDistribution, 1);

  // Unlocked badges count
  const unlockedBadgesCount = profile.badges.filter(b => b.unlockedAt).length;

  // Completed missions count
  const completedMissionsCount = profile.missions.filter(m => m.completed).length;

  const handleShare = () => {
    const shareText = `🧩 Kelime Savaşı Türkçe Kelime Oyunu! 

🏆 Günlük Skor: ${profile.dailyScore} Puan
🥇 Galibiyet Oranı: %${winRate}
🔥 En İyi Seri: ${stats.maxStreak} Gün
🎖️ Kazanılan Rozet: ${unlockedBadgesCount}/${profile.badges.length}

Sen de bana meydan oku! 🚀 ${window.location.href}`;

    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="text-emerald-500" size={20} />
            Kişisel Profil & İlerleme
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/55 dark:bg-gray-950/20">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'stats'
                ? 'border-emerald-500 text-emerald-500 bg-white dark:bg-gray-900/40'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <BarChart2 size={16} />
            İstatistikler
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'missions'
                ? 'border-emerald-500 text-emerald-500 bg-white dark:bg-gray-900/40'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <CheckCircle size={16} />
            Görevler ({completedMissionsCount}/{profile.missions.length})
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'badges'
                ? 'border-emerald-500 text-emerald-500 bg-white dark:bg-gray-900/40'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Award size={16} />
            Rozetler ({unlockedBadgesCount}/{profile.badges.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.gamesPlayed}</span>
                  <span className="block text-[9px] sm:text-xs text-gray-400 uppercase font-mono mt-1">Oyun</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-xl sm:text-2xl font-bold text-emerald-500">{winRate}%</span>
                  <span className="block text-[9px] sm:text-xs text-gray-400 uppercase font-mono mt-1">Galibiyet</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-xl sm:text-2xl font-bold text-amber-500">{stats.currentStreak}</span>
                  <span className="block text-[9px] sm:text-xs text-gray-400 uppercase font-mono mt-1">Seri</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-xl sm:text-2xl font-bold text-blue-500">{stats.maxStreak}</span>
                  <span className="block text-[9px] sm:text-xs text-gray-400 uppercase font-mono mt-1">En İyi Seri</span>
                </div>
              </div>

              {/* Solve Distribution */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 font-mono">Deneme Dağılımı</h3>
                <div className="space-y-2">
                  {stats.winDistribution.map((count, index) => {
                    const pct = Math.max((count / maxDistribution) * 100, 5);
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-3">{index + 1}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-6 rounded-lg overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full flex items-center justify-end pr-2 rounded-lg text-xs font-bold text-white transition-all duration-500 ${
                              count > 0 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                          >
                            {count}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Social Share & Reset */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <button
                  onClick={handleShare}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition duration-150"
                >
                  {copied ? <Check size={18} /> : <Share2 size={18} />}
                  {copied ? 'Kopyalandı!' : 'Skorunu Paylaş'}
                </button>
                {onResetStats && (
                  <button
                    onClick={onResetStats}
                    className="py-3 px-4 rounded-xl text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold border border-transparent hover:border-rose-200 transition"
                  >
                    Verileri Sıfırla
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MISSIONS TAB */}
          {activeTab === 'missions' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">
                Günlük görevleri tamamlayarak ekstra rozetler ve puanlar kazanın. Her gün sıfırlanır!
              </p>
              {profile.missions.map((mission) => {
                const progressPct = Math.min((mission.current / mission.target) * 100, 100);
                return (
                  <div
                    key={mission.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      mission.completed
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50'
                        : 'bg-gray-50 dark:bg-gray-950/40 border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${mission.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                          {mission.title}
                        </span>
                        {mission.completed && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                            Tamamlandı
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{mission.description}</p>
                    </div>

                    <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2 sm:gap-0">
                      <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400">
                        {mission.current} / {mission.target}
                      </span>
                      <div className="w-24 bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-1">
                        <div
                          style={{ width: `${progressPct}%` }}
                          className={`h-full rounded-full ${mission.completed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* BADGES TAB */}
          {activeTab === 'badges' && (
            <div className="grid grid-cols-2 gap-3">
              {profile.badges.map((badge) => {
                const isUnlocked = !!badge.unlockedAt;
                return (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center space-y-2 transition duration-200 ${
                      isUnlocked
                        ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50 scale-100'
                        : 'bg-gray-50/55 dark:bg-gray-950/20 border-gray-100 dark:border-gray-800 opacity-60 filter grayscale'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isUnlocked
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-300'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                    }`}>
                      <Award size={24} className={isUnlocked ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isUnlocked ? 'text-amber-800 dark:text-amber-400' : 'text-gray-700 dark:text-gray-400'}`}>
                        {badge.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                        {badge.description}
                      </p>
                      {isUnlocked && badge.unlockedAt && (
                        <span className="block text-[9px] text-amber-500 font-mono mt-1.5">
                          Kazanıldı: {new Date(badge.unlockedAt).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
