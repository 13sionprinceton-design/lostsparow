import React from 'react';
import { Player } from '../game/player';
import { WeaponType } from '../game/types';
import { WEAPONS } from '../game/constants';
import { Crosshair, Eye, Sparkles, ShieldAlert } from 'lucide-react';

interface WeaponWheelProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectWeapon: (weapon: WeaponType) => void;
}

export const WeaponWheel: React.FC<WeaponWheelProps> = ({ player, isOpen, onClose, onSelectWeapon }) => {
  if (!player) return null;

  const currentWDef = WEAPONS[player.currentWeapon];
  const currentWState = player.weapons[player.currentWeapon];

  // If Wheel is not open, render Bottom-Right Ammo & Weapon HUD
  if (!isOpen) {
    return (
      <div id="weapon-ammo-hud" className="fixed bottom-6 right-6 flex flex-col items-end gap-2 select-none z-30 pointer-events-auto">
        <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-white/50 tracking-widest uppercase">{currentWDef?.name}</div>
            <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {currentWState?.ammoInMag ?? 0}
              </span>
              <span className="text-sm font-semibold text-white/40 font-mono">
                / {currentWState?.reserveAmmo ?? 0}
              </span>
            </div>
            {player.isReloading ? (
              <div className="text-xs font-bold text-amber-400 animate-pulse mt-0.5 flex items-center justify-end gap-1">
                <Sparkles className="w-3 h-3" /> RELOADING...
              </div>
            ) : player.isInspecting ? (
              <div className="text-xs font-bold text-cyan-400 animate-pulse mt-0.5 flex items-center justify-end gap-1 font-mono tracking-wider">
                <Eye className="w-3 h-3 text-cyan-400" /> INSPECTING...
              </div>
            ) : (
              <button
                id="btn-inspect-weapon"
                onClick={() => player.inspectWeapon()}
                className="mt-1 text-[10px] font-mono text-white/40 hover:text-cyan-400 flex items-center justify-end gap-1 transition group"
                title="Inspect Weapon (Press I)"
              >
                <span className="px-1 py-0.5 rounded bg-white/10 text-[9px] text-white/80 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 font-bold border border-white/10">I</span>
                <span>INSPECT</span>
              </button>
            )}
          </div>

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/15 shadow-inner backdrop-blur-md cursor-pointer hover:border-cyan-500/50 transition"
            style={{ backgroundColor: `${currentWDef?.color}20`, borderColor: `${currentWDef?.color}60` }}
            onClick={() => player.inspectWeapon()}
            title="Click or press 'I' to inspect weapon in 3D"
          >
            <Crosshair className="w-7 h-7" style={{ color: currentWDef?.color }} />
          </div>
        </div>
      </div>
    );
  }

  // Open Radial Weapon Wheel
  const weaponList = Object.keys(WEAPONS) as WeaponType[];

  return (
    <div
      id="weapon-wheel-modal"
      className="fixed inset-0 z-50 bg-[#020408]/80 backdrop-blur-2xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
              <Crosshair className="w-6 h-6 text-blue-400" />
              WEAPON ARSENAL WHEEL
            </h2>
            <p className="text-xs text-white/50">Select weapon or press 1-8 keys to equip instantly</p>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white uppercase tracking-wider transition"
          >
            Close (TAB)
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          {weaponList.map((wKey, idx) => {
            const def = WEAPONS[wKey];
            const state = player.weapons[wKey];
            const isSelected = player.currentWeapon === wKey;
            const isUnlocked = state?.unlocked;

            return (
              <button
                key={wKey}
                disabled={!isUnlocked}
                onClick={() => {
                  if (isUnlocked) {
                    onSelectWeapon(wKey);
                    onClose();
                  }
                }}
                className={`group relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-28 backdrop-blur-md ${
                  isSelected
                    ? 'border-blue-400 bg-blue-600/25 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400'
                    : isUnlocked
                    ? 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                    : 'border-white/5 bg-white/2 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded-md">
                    [{idx + 1}]
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isUnlocked ? def.color : '#64748b' }}
                  />
                </div>

                <div>
                  <div className="text-xs font-bold text-white truncate">{def.name}</div>
                  <div className="text-[11px] font-mono text-white/50 mt-0.5">
                    {isUnlocked ? (
                      `${state?.ammoInMag} / ${state?.reserveAmmo}`
                    ) : (
                      <span className="text-amber-400/90 flex items-center gap-0.5">
                        <ShieldAlert className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Weapon Stats Card */}
        {currentWDef && (
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-blue-400 tracking-widest">{currentWDef.category}</span>
                <h3 className="text-base font-black text-white">{currentWDef.name}</h3>
              </div>
              <span className="text-xs text-white/50 font-mono">Range: {currentWDef.range}m</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">{currentWDef.description}</p>
            {/* Stat Bars */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 text-[11px] font-mono">
              <div>
                <span className="text-white/40 uppercase tracking-wider text-[10px]">DAMAGE</span>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (currentWDef.damage / 350) * 100)}%` }} />
                </div>
              </div>
              <div>
                <span className="text-white/40 uppercase tracking-wider text-[10px]">FIRE RATE</span>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (currentWDef.fireRate / 15) * 100)}%` }} />
                </div>
              </div>
              <div>
                <span className="text-white/40 uppercase tracking-wider text-[10px]">ACCURACY</span>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.max(10, 100 - currentWDef.spread * 600)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
