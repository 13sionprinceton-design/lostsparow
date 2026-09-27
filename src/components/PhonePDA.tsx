import React, { useState } from 'react';
import { Player } from '../game/player';
import { MissionManager } from '../game/missions';
import { VehicleType, WeaponType } from '../game/types';
import { WEAPONS, VEHICLES, RADIO_STATIONS } from '../game/constants';
import { soundEngine } from './../game/audio';
import gameLogoImg from '../assets/images/novaforge_game_logo_1787648448233.jpg';
import {
  Smartphone,
  Car,
  Briefcase,
  Crosshair,
  Radio,
  Terminal,
  DollarSign,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Heart,
  Monitor,
} from 'lucide-react';

interface PhonePDAProps {
  player: Player | null;
  missions: MissionManager | null;
  isOpen: boolean;
  onClose: () => void;
  onSpawnVehicle: (type: VehicleType) => void;
  onSelectStation: (index: number) => void;
  activeRadioStation: number;
  onOpenSupport?: () => void;
  onOpenDownloadPC?: () => void;
}

type AppId = 'home' | 'missions' | 'vehicles' | 'weapons' | 'radio' | 'cheats' | 'bank';

export const PhonePDA: React.FC<PhonePDAProps> = ({
  player,
  missions,
  isOpen,
  onClose,
  onSpawnVehicle,
  onSelectStation,
  activeRadioStation,
  onOpenSupport,
  onOpenDownloadPC,
}) => {
  const [activeApp, setActiveApp] = useState<AppId>('home');
  const [cheatInput, setCheatInput] = useState('');

  if (!isOpen || !player) return null;

  const handleStartMission = (missionId: string) => {
    if (missions?.startMission(missionId)) {
      setActiveApp('home');
      onClose();
    }
  };

  const handleBuyWeapon = (wKey: WeaponType) => {
    const def = WEAPONS[wKey];
    if (player.cash >= def.price) {
      player.cash -= def.price;
      player.weapons[wKey].unlocked = true;
      player.weapons[wKey].reserveAmmo += def.magazineSize * 3;
      player.switchWeapon(wKey);
      soundEngine.playCashPickup();
      missions?.addChatMessage('Bank', `Purchased ${def.name} for -$${def.price.toLocaleString()}`, 'system');
    }
  };

  const handleBuyAmmo = (wKey: WeaponType) => {
    const def = WEAPONS[wKey];
    const cost = Math.round(def.price * 0.1) || 500;
    if (player.cash >= cost) {
      player.cash -= cost;
      player.weapons[wKey].reserveAmmo += def.magazineSize * 2;
      soundEngine.playCashPickup();
      missions?.addChatMessage('Armory', `Refilled Ammo for ${def.name}`, 'system');
    }
  };

  const executeCheat = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (clean.includes('car') || clean.includes('sports')) {
      onSpawnVehicle('sports');
    } else if (clean.includes('heli') || clean.includes('chopper')) {
      onSpawnVehicle('helicopter');
    } else if (clean.includes('bike') || clean.includes('motorcycle')) {
      onSpawnVehicle('motorcycle');
    } else if (clean.includes('suv') || clean.includes('tank')) {
      onSpawnVehicle('suv');
    } else if (clean.includes('wanted 5') || clean.includes('stars 5')) {
      player.addWantedStars(5);
    } else if (clean.includes('clear') || clean.includes('police')) {
      player.wantedStars = 0;
      soundEngine.stopPoliceSiren();
    } else if (clean.includes('money') || clean.includes('cash')) {
      player.cash += 50000;
      soundEngine.playCashPickup();
    } else if (clean.includes('god') || clean.includes('health')) {
      player.health = 100;
      player.armor = 100;
      soundEngine.playMissionFanfare(true);
    } else if (clean.includes('rpg') || clean.includes('weapons')) {
      (Object.keys(player.weapons) as WeaponType[]).forEach((k) => {
        player.weapons[k].unlocked = true;
        player.weapons[k].reserveAmmo = 999;
      });
      soundEngine.playCashPickup();
    }
    setCheatInput('');
  };

  return (
    <div id="phone-pda-modal" className="fixed bottom-6 right-6 z-50 select-none animate-in slide-in-from-bottom-8 duration-300">
      {/* Smartphone Outer Shell */}
      <div className="relative w-84 h-[530px] bg-white/5 border border-white/20 rounded-[40px] shadow-2xl overflow-hidden flex flex-col p-2.5 backdrop-blur-2xl ring-1 ring-white/10">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/60 backdrop-blur-md rounded-full z-30 flex items-center justify-between px-3 border border-white/10">
          <div className="w-2 h-2 rounded-full bg-white/20 border border-white/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Screen Bezel */}
        <div className="relative w-full h-full bg-[#020408]/85 rounded-[32px] overflow-hidden flex flex-col pt-6 border border-white/10 backdrop-blur-xl">
          {/* Top Status Bar */}
          <div className="px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-white/50 border-b border-white/10">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold">5G</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                ${player.cash.toLocaleString()}
              </span>
              <button onClick={onClose} className="p-0.5 hover:text-white transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* App Header (if in sub app) */}
          {activeApp !== 'home' && (
            <div className="px-3.5 py-2 bg-white/5 backdrop-blur-md flex items-center justify-between border-b border-white/10">
              <button
                onClick={() => setActiveApp('home')}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 uppercase tracking-wider"
              >
                ◀ Home
              </button>
              <span className="text-xs font-black text-white uppercase tracking-wider">
                {activeApp}
              </span>
              <div className="w-10" />
            </div>
          )}

          {/* App Content Canvas */}
          <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
            {/* 1. HOME SCREEN APP GRID */}
            {activeApp === 'home' && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <img
                    src={gameLogoImg}
                    alt="NovaForge Logo"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl border border-cyan-400/40 shadow-md shadow-cyan-500/20 object-cover"
                  />
                  <div className="flex-1 text-left">
                    <div className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold">NOVA OS 18.4</div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">SECURE CYBER PDA</h3>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 px-1">
                  {/* Quick Jobs / Heists */}
                  <button
                    onClick={() => setActiveApp('missions')}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/20">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-white/80">Heists</span>
                  </button>

                  {/* Apex Motors */}
                  <button
                    onClick={() => setActiveApp('vehicles')}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/20">
                      <Car className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-white/80">Vehicles</span>
                  </button>

                  {/* Ammu-Nation */}
                  <button
                    onClick={() => setActiveApp('weapons')}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shadow-md shadow-rose-500/20">
                      <Crosshair className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-white/80">Armory</span>
                  </button>

                  {/* Radio Stations */}
                  <button
                    onClick={() => setActiveApp('radio')}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-400 shadow-md shadow-pink-500/20">
                      <Radio className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-white/80">Radio</span>
                  </button>

                  {/* Cheats / Dev Terminal */}
                  <button
                    onClick={() => setActiveApp('cheats')}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-white/80">Cheats</span>
                  </button>

                  {/* Maze Bank Account */}
                  <button
                    onClick={() => setActiveApp('bank')}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/20">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-white/80">Account</span>
                  </button>

                  {/* Support NovaForge App */}
                  <button
                    onClick={() => {
                      if (onOpenSupport) {
                        onOpenSupport();
                        onClose();
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-gradient-to-b from-rose-500/10 to-amber-500/10 hover:from-rose-500/20 hover:to-amber-500/20 border border-rose-500/30 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 p-0.5 shadow-md shadow-rose-500/20">
                      <div className="w-full h-full bg-[#0b1120] rounded-[14px] flex items-center justify-center">
                        <Heart className="w-5 h-5 text-rose-400 fill-rose-400/40" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-rose-300">Support</span>
                  </button>

                  {/* Download PC Client App */}
                  <button
                    onClick={() => {
                      if (onOpenDownloadPC) {
                        onOpenDownloadPC();
                        onClose();
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 backdrop-blur-md hover:scale-105 transition shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-300">PC Client</span>
                  </button>
                </div>

                {/* Active Mission Quick Banner */}
                {missions?.activeMission && (
                  <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active Objective</div>
                    <div className="text-xs font-black text-white truncate">{missions.activeMission.title}</div>
                    <div className="text-[11px] text-white/60 mt-1 line-clamp-2">
                      {missions.activeMission.stages[missions.currentStageIndex]?.instruction}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. HEISTS & MISSIONS APP */}
            {activeApp === 'missions' && (
              <div className="space-y-2.5">
                {missions?.availableMissions.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.clientAvatar}</span>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">{m.title}</div>
                          <div className="text-[10px] text-white/50">{m.client}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        +${m.rewardCash.toLocaleString()}
                      </span>
                    </div>

                    <p className="text-[11px] text-white/60 leading-relaxed">{m.description}</p>

                    <button
                      onClick={() => handleStartMission(m.id)}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-lg shadow-blue-600/30"
                    >
                      ACCEPT CONTRACT <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 3. APEX VEHICLE DELIVERY APP */}
            {activeApp === 'vehicles' && (
              <div className="space-y-2.5">
                {(Object.keys(VEHICLES) as VehicleType[]).map((vKey) => {
                  const v = VEHICLES[vKey];
                  return (
                    <div key={vKey} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">{v.name}</div>
                          <div className="text-[10px] text-white/50 font-mono">
                            Max Speed: {Math.round(v.maxSpeed * 3.6)} KM/H
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: v.color }} />
                      </div>

                      <button
                        onClick={() => {
                          onSpawnVehicle(vKey);
                          setActiveApp('home');
                          onClose();
                        }}
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1"
                      >
                        DELIVER INSTANTLY <Car className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. AMMU-NATION APP */}
            {activeApp === 'weapons' && (
              <div className="space-y-2.5">
                {(Object.keys(WEAPONS) as WeaponType[]).map((wKey) => {
                  const def = WEAPONS[wKey];
                  const state = player.weapons[wKey];
                  return (
                    <div key={wKey} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">{def.name}</div>
                          <div className="text-[10px] text-white/50 font-mono">
                            Damage: {def.damage} | Mag: {def.magazineSize}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {def.price === 0 ? 'FREE' : `$${def.price.toLocaleString()}`}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {!state?.unlocked ? (
                          <button
                            disabled={player.cash < def.price}
                            onClick={() => handleBuyWeapon(wKey)}
                            className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-blue-600/20"
                          >
                            BUY WEAPON
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                player.switchWeapon(wKey);
                                setActiveApp('home');
                                onClose();
                              }}
                              className="flex-1 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-blue-400 text-xs font-bold uppercase tracking-wider transition"
                            >
                              EQUIP
                            </button>
                            {def.category !== 'melee' && (
                              <button
                                onClick={() => handleBuyAmmo(wKey)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-xs font-bold transition"
                              >
                                +AMMO
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. RADIO STATIONS APP */}
            {activeApp === 'radio' && (
              <div className="space-y-2">
                {RADIO_STATIONS.map((station, idx) => {
                  const isPlaying = activeRadioStation === idx;
                  return (
                    <button
                      key={station.id}
                      onClick={() => {
                        onSelectStation(idx);
                        soundEngine.playRadioBeat(idx);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between backdrop-blur-md ${
                        isPlaying
                          ? 'border-blue-400 bg-blue-600/25 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{station.name}</div>
                        <div className="text-[10px] text-white/50">{station.genre} • {station.dj}</div>
                      </div>
                      {isPlaying ? (
                        <Volume2 className="w-5 h-5 text-blue-400 animate-pulse" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-white/30" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 6. GTA CHEAT CONSOLE APP */}
            {activeApp === 'cheats' && (
              <div className="space-y-3">
                <div className="text-[11px] text-white/60">
                  Execute classic GTA cheat codes or tap the quick buttons below:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => executeCheat('sports')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-blue-300 transition"
                  >
                    🚗 Supercar
                  </button>
                  <button
                    onClick={() => executeCheat('chopper')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-blue-300 transition"
                  >
                    🚁 Chopper
                  </button>
                  <button
                    onClick={() => executeCheat('wanted 5')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-rose-300 transition"
                  >
                    ⭐ 5-Star Wanted
                  </button>
                  <button
                    onClick={() => executeCheat('clear')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-emerald-300 transition"
                  >
                    🛡️ Clear Cops
                  </button>
                  <button
                    onClick={() => executeCheat('cash')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-amber-300 transition"
                  >
                    💰 +$50,000
                  </button>
                  <button
                    onClick={() => executeCheat('weapons')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-indigo-300 transition"
                  >
                    🔫 All Weapons
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeCheat(cheatInput);
                  }}
                  className="mt-3 flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type code (e.g. money, rpg)..."
                    value={cheatInput}
                    onChange={(e) => setCheatInput(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-400 backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-600/20"
                  >
                    Run
                  </button>
                </form>
              </div>
            )}

            {/* 7. BANK & LIFETIME STATS APP */}
            {activeApp === 'bank' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-md">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono font-bold">
                    MAZE BANK OF NOVAFORGE
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono mt-1">
                    ${player.cash.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center justify-center gap-1 mt-0.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Account Verified & Secure
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs font-mono backdrop-blur-md">
                  <div className="flex justify-between text-white/70">
                    <span>Total Kills</span>
                    <span className="font-bold text-white">{player.stats.kills}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Police Eliminated</span>
                    <span className="font-bold text-rose-400">{player.stats.policeKills}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Headshots</span>
                    <span className="font-bold text-amber-400">{player.stats.headshots}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Heists Completed</span>
                    <span className="font-bold text-blue-400">{player.stats.heistsCompleted}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Distance Driven</span>
                    <span className="font-bold text-white">
                      {player.stats.distanceDrivenKm.toFixed(1)} KM
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Home Indicator Pill */}
          <div className="py-2 flex justify-center bg-black/30 backdrop-blur-md">
            <button
              onClick={() => (activeApp === 'home' ? onClose() : setActiveApp('home'))}
              className="w-24 h-1 bg-white/20 rounded-full hover:bg-white/40 transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
