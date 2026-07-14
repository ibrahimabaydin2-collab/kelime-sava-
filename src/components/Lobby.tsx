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
      <div className="card-theme border border-[#3E485A]/30 rounded-[2.2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-200 relative">
        {/* Glowing ornament */}
        <div className="absolute bottom-4 right-4 text-amber-100/10 animate-pulse select-none pointer-events-none">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c.5 6.5 5.5 11.5 12 12-.5 6.5-5.5 11.5-12 12-.5-6.5-5.5-11.5-12-12 .5-6.5 5.5-11.5 12-12z" />
          </svg>
        </div>

        {/* Header */}
        <div className="p-5 border-b border-[#3E485A] flex justify-between items-center bg-[#3D4756]/45">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-md shadow-amber-500/20">
              <Swords size={20} className="animate-pulse" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-[#FAF6E9]">Çevrimiçi Rekabet</h2>
              <p className="text-[10px] text-gray-400">Aktif oyuncularla lingo savaşı yapın</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Challenge Request Alerts */}
        {activeChallenges.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              <ShieldAlert size={14} />
              Yeni Savaş Meydan Okumaları:
            </p>
            {activeChallenges.map((chal) => (
              <div
                key={chal.id}
                className="bg-[#2E3748] p-3 rounded-xl border border-amber-500/30 flex items-center justify-between shadow-md"
              >
                <div className="text-left">
                  <span className="font-bold text-[#FAF6E9] text-sm">
                    {chal.challenger.name}
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    {chal.wordLength} Harfli Kelime Lingo Savaşı!
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onAcceptChallenge(chal.id)}
                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm cursor-pointer"
                    title="Kabul Et"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => onDeclineChallenge(chal.id)}
                    className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition shadow-sm cursor-pointer"
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
        <div className="p-4 border-b border-[#3E485A] space-y-2 text-left">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Meydan Okuma Harf Seçeneği
          </label>
          <div className="flex justify-between gap-1 bg-black/30 p-1 rounded-xl border border-[#3E485A]">
            {[4, 5, 6, 7, 8].map((len) => (
              <button
                key={len}
                onClick={() => setSelectedWordLength(len)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedWordLength === len
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#3E485A]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Oyuncu ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2E3748] border border-[#3E485A] rounded-xl pl-9 pr-4 py-2 text-sm text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 max-h-[250px]">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-left mb-2">
            Çevrimiçi Oyuncular ({filteredPlayers.length})
          </h3>

          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs font-medium space-y-1">
              <span>Meydan okuyabileceğiniz çevrimiçi oyuncu bulunamadı.</span>
              <p className="text-[10px] text-gray-500 leading-normal">Başka bir tarayıcı sekmesinde oyunu açarak testi yapabilirsiniz!</p>
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-[#3D4756]/35 p-3 rounded-xl border border-[#3E485A] flex items-center justify-between hover:border-amber-500/25 transition duration-150"
              >
                <div className="flex items-center gap-2.5 text-left">
                  {player.avatarUrl ? (
                    <span className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/40 flex items-center justify-center bg-gray-200 font-bold shrink-0">
                      {player.avatarUrl.length < 4 ? (
                        <span className="text-base leading-none">{player.avatarUrl}</span>
                      ) : (
                        <img src={player.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </span>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0 border border-amber-500/20">
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-[#FAF6E9] text-sm block leading-tight">
                      {player.name}
                    </span>
                    <span className="text-[10px] block mt-0.5">
                      {player.status === 'playing' ? (
                        <span className="text-rose-400 font-bold">Oyun İçinde</span>
                      ) : (
                        <span className="text-amber-400 font-bold">Müsait</span>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onChallenge(player, selectedWordLength)}
                  disabled={player.status === 'playing'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    player.status === 'playing'
                      ? 'bg-[#3D4756]/20 border border-white/5 text-gray-500 cursor-not-allowed'
                      : 'bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] border border-[#EBE6D5] shadow-sm'
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
        <div className="p-4 border-t border-[#3E485A] text-center text-[10px] text-gray-500 font-mono bg-[#3D4756]/30">
          Kullanıcı ID: {selfId.substring(0, 8)}...
        </div>
      </div>
    </div>
  );
}
