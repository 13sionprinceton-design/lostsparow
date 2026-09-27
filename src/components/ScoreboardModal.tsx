import React from 'react';
import { Player } from '../game/player';
import { AISystem } from '../game/ai';
import { Trophy, Users, Shield, Zap, X } from 'lucide-react';

interface ScoreboardModalProps {
  player: Player | null;
  ai: AISystem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({ player, ai, isOpen, onClose }) => {
  if (!isOpen || !player) return null;

  // Build online player list
  const playersList = [
    {
      id: 'p_you',
      name: 'You [Local Player]',
      kills: player.stats.kills,
      deaths: player.stats.deaths,
      cash: player.cash,
      bounty: 0,
      ping: 12,
      isLocal: true,
      color: '#06b6d4',
    },
    ...(ai?.entities
      .filter((e) => e.type === 'bot_player')
      .map((b, idx) => ({
        id: b.id,
        name: b.name || `Rival_${idx}`,
        kills: Math.floor(Math.random() * 8),
        deaths: Math.floor(Math.random() * 4),
        cash: (b.bounty || 2000) * 3,
        bounty: b.bounty || 2000,
        ping: 28 + Math.floor(Math.random() * 20),
        isLocal: false,
        color: '#ec4899',
      })) || []),
  ].sort((a, b) => b.kills - a.kills);

  return (
    <div
      id="scoreboard-modal"
      className="fixed inset-0 z-50 bg-[#020408]/80 backdrop-blur-2xl flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                NOVAFORGE ONLINE MATCH LOBBY
              </h2>
              <p className="text-xs text-white/50 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> 16/32 Operatives Connected • Server: US-East (Virginia)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white/60 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase text-[10px] tracking-widest font-bold">
                <th className="py-3 px-3.5">Rank</th>
                <th className="py-3 px-3.5">Operative Name</th>
                <th className="py-3 px-3.5 text-center">Kills</th>
                <th className="py-3 px-3.5 text-center">Deaths</th>
                <th className="py-3 px-3.5 text-right">Net Worth</th>
                <th className="py-3 px-3.5 text-right">Bounty</th>
                <th className="py-3 px-3.5 text-right">Ping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {playersList.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`hover:bg-white/5 transition ${
                    p.isLocal ? 'bg-blue-600/20 font-bold text-blue-300 rounded-xl' : 'text-white/80'
                  }`}
                >
                  <td className="py-3 px-3.5 text-white/40">#{idx + 1}</td>
                  <td className="py-3 px-3.5 flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ backgroundColor: p.color }} />
                    <span className={p.isLocal ? 'text-blue-300 font-bold' : 'text-white'}>{p.name}</span>
                    {p.isLocal && (
                      <span className="text-[9px] bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-wider">
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-center font-bold text-emerald-400">{p.kills}</td>
                  <td className="py-3 px-3.5 text-center text-white/40">{p.deaths}</td>
                  <td className="py-3 px-3.5 text-right font-bold text-amber-400">
                    ${p.cash.toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5 text-right text-rose-400 font-bold">
                    {p.bounty > 0 ? `$${p.bounty.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-3.5 text-right text-white/40">{p.ping}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
