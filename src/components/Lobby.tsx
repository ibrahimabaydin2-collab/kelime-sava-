import { useState } from 'react';
import { Swords, UserCheck, X, Check, Search, ShieldAlert } from 'lucide-react';
import { LobbyPlayer, Challenge } from '../types';

interface LobbyProps {
  players: LobbyPlayer[];
  activeChallenges: Challenge[];
  onChallenge: (player: LobbyPlayer, wordLength: number) => void;
  onAcceptChallenge: (challengeId: string) => void;
  onDeclineChallenge: (challengeId: string) => void;
  selfId: string;
  onClose: () => void;
}

export default function Lobby({
  players,
  activeChallenges,
  onChallenge,
  onAcceptChallenge,
  onDeclineChallenge,
  selfId,
  onClose
}: LobbyProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWordLength, setSelectedWordLength] = useState<number>(5);

  const filteredPlayers = players.filter(
    (p) => p.id !== selfId && p.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950/40">
          <div className="flex items-center gap-2 text-emerald-500 font-bold">
            <Swords size={22} className="animate-bounce" />
            <span className="text-gray-900 dark:text-white">Çevrimiçi Rekabet</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Challenge Request Alerts */}
        {activeChallenges.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1">
              <ShieldAlert size={14} />
              Yeni Meydan Okuma İstekleri:
            </p>
            {activeChallenges.map((chal) => (
              <div
                key={chal.id}
                className="bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between shadow-sm"
              >
                <div>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                    {chal.challenger.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    {chal.wordLength} Harfli Kelime Lingo Savaşı!
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAcceptChallenge(chal.id)}
                    className="p-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm"
                    title="Kabul Et"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => onDeclineChallenge(chal.id)}
                    className="p-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white transition shadow-sm"
                    title="Reddet"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Word Length Selector for Challenges */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
            Meydan Okuma Harf Seçeneği
          </label>
          <div className="flex justify-between gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {[4, 5, 6, 7, 8].map((len) => (
              <button
                key={len}
                onClick={() => setSelectedWordLength(len)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedWordLength === len
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Oyuncu ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            Çevrimiçi Oyuncular ({filteredPlayers.length})
          </h3>

          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs">
              Meydan okuyabileceğiniz çevrimiçi oyuncu bulunamadı.
              <p className="mt-1 text-[10px]">Başka bir tarayıcı sekmesinde oyunu açarak testi yapabilirsiniz!</p>
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {player.avatarUrl ? (
                    <span className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500 flex items-center justify-center bg-gray-200 dark:bg-gray-700 font-bold shrink-0">
                      {player.avatarUrl.length < 4 ? (
                        <span className="text-base leading-none">{player.avatarUrl}</span>
                      ) : (
                        <img src={player.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </span>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {player.name}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {player.status === 'playing' ? (
                        <span className="text-rose-500 font-medium">Oyun İçinde</span>
                      ) : (
                        <span className="text-emerald-500 font-medium">Hazır</span>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onChallenge(player, selectedWordLength)}
                  disabled={player.status === 'playing'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                    player.status === 'playing'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700 shadow-none'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <Swords size={12} />
                  Meydan Oku
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-center text-[10px] text-gray-400 dark:text-gray-500 font-mono">
          Kullanıcı ID: {selfId.substring(0, 8)}...
        </div>
      </div>
    </div>
  );
}
