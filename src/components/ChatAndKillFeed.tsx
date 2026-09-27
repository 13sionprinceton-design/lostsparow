import React, { useState } from 'react';
import { MissionManager } from '../game/missions';
import { Player } from '../game/player';
import { MessageSquare, Send, Skull, Shield, Crosshair, Sparkles, MapPin, Zap, Flame, Award } from 'lucide-react';

interface ChatAndKillFeedProps {
  missions: MissionManager | null;
  player: Player | null;
  onSendChat: (text: string) => void;
}

export const ChatAndKillFeed: React.FC<ChatAndKillFeedProps> = ({ missions, player, onSendChat }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');

  if (!missions) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSendChat(inputVal);
    setInputVal('');
  };

  const activeMission = missions.activeMission;
  const currentStage = activeMission?.stages[missions.currentStageIndex];

  // Calculate distance to active mission target
  let missionDistMeters = 0;
  if (player && currentStage?.targetLocation) {
    const dx = player.position.x - currentStage.targetLocation.x;
    const dz = player.position.z - currentStage.targetLocation.z;
    missionDistMeters = Math.round(Math.sqrt(dx * dx + dz * dz));
  }

  return (
    <>
      {/* 1. TOP-CENTER ACTIVE MISSION HUD BANNER */}
      {activeMission && currentStage && (
        <div id="mission-objective-banner" className="fixed top-18 left-1/2 -translate-x-1/2 z-30 select-none pointer-events-none max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white/5 backdrop-blur-2xl p-4 rounded-3xl border border-white/10 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-400 tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" /> {activeMission.title}
            </div>
            <div className="text-sm font-bold text-white mt-1 flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{currentStage.instruction}</span>
            </div>
            {currentStage.targetLocation && (
              <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                DISTANCE: {missionDistMeters}M
              </div>
            )}
            {currentStage.targetCount && (
              <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                PROGRESS: {currentStage.currentCount || 0} / {currentStage.targetCount} ELIMINATED
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. TOP-RIGHT KILL FEED */}
      <div id="killfeed-container" className="fixed top-18 right-6 z-30 flex flex-col items-end gap-1.5 pointer-events-none select-none max-w-xs">
        {missions.killFeed.map((kf) => {
          if (kf.isStunt || kf.killer === 'Stunt Bonus') {
            return (
              <div
                key={kf.id}
                className="bg-amber-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-amber-400/50 shadow-lg shadow-amber-500/20 text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200 ring-1 ring-amber-400/30"
              >
                <div className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Flame className="w-3 h-3 animate-pulse" />
                </div>
                <span className="font-black text-amber-300 tracking-wider">
                  STUNT BONUS
                </span>
                <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-lg text-[11px] text-amber-200">
                  {kf.victim}
                </span>
              </div>
            );
          }

          if (kf.killer === 'HIDDEN OBJECTIVE') {
            return (
              <div
                key={kf.id}
                className="bg-purple-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-purple-400/50 shadow-lg shadow-purple-500/20 text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200 ring-1 ring-purple-400/30"
              >
                <div className="w-5 h-5 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                  <Award className="w-3 h-3" />
                </div>
                <span className="font-black text-purple-300 tracking-wider">
                  HIDDEN OBJECTIVE
                </span>
                <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-lg text-[11px] text-purple-200">
                  {kf.victim}
                </span>
              </div>
            );
          }

          return (
            <div
              key={kf.id}
              className="bg-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 shadow-md text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200"
            >
              <span className={kf.killer === 'You' ? 'font-bold text-blue-400' : 'text-white/80'}>
                {kf.killer}
              </span>
              <span className="flex items-center gap-1 text-white/40">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] uppercase font-bold text-white/50">[{kf.weapon}]</span>
              </span>
              <span className="text-rose-400 font-semibold">{kf.victim}</span>
            </div>
          );
        })}
      </div>

      {/* 3. BOTTOM-LEFT CHAT BOX */}
      <div id="chat-box-container" className="fixed bottom-6 left-56 z-30 select-none max-w-sm w-full pointer-events-auto">
        {!chatOpen ? (
          <div className="space-y-1.5">
            {/* Show last 3 messages preview */}
            <div className="space-y-1 max-h-24 overflow-hidden pointer-events-none">
              {missions.chatMessages.slice(-3).map((m) => (
                <div
                  key={m.id}
                  className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-xl text-[11px] font-mono border border-white/10 shadow-sm"
                >
                  <span
                    className={`font-bold mr-1.5 ${
                      m.type === 'system'
                        ? 'text-amber-400'
                        : m.type === 'police'
                        ? 'text-rose-400'
                        : m.sender === 'You'
                        ? 'text-blue-400'
                        : 'text-indigo-400'
                    }`}
                  >
                    [{m.sender}]:
                  </span>
                  <span className="text-white/90">{m.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setChatOpen(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-xs font-mono text-white/70 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 transition shadow-lg"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Press T or Click to Chat</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#020408]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> SERVER CHAT & LOGS
              </span>
              <button
                onClick={() => setChatOpen(false)}
                className="text-xs text-white/40 hover:text-white px-1.5 py-0.5 rounded-md hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Message log */}
            <div className="h-40 overflow-y-auto space-y-1.5 text-xs font-mono custom-scrollbar pr-1">
              {missions.chatMessages.map((m) => (
                <div key={m.id} className="leading-tight">
                  <span className="text-[10px] text-white/30 mr-1">{m.timestamp}</span>
                  <span
                    className={`font-bold mr-1.5 ${
                      m.type === 'system'
                        ? 'text-amber-400'
                        : m.type === 'police'
                        ? 'text-rose-400'
                        : m.sender === 'You'
                        ? 'text-blue-400'
                        : 'text-indigo-400'
                    }`}
                  >
                    [{m.sender}]:
                  </span>
                  <span className="text-white/80">{m.text}</span>
                </div>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                autoFocus
                placeholder="Type message or cheat (/spawn, /money, /wanted)..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-400 font-mono backdrop-blur-md"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center shadow-md shadow-blue-600/30"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};
