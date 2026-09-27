import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { RadarMap } from './components/RadarMap';
import { WeaponWheel } from './components/WeaponWheel';
import { PhonePDA } from './components/PhonePDA';
import { CrosshairHUD } from './components/CrosshairHUD';
import { ChatAndKillFeed } from './components/ChatAndKillFeed';
import { ScoreboardModal } from './components/ScoreboardModal';
import { TouchControls } from './components/TouchControls';
import { SupportModal } from './components/SupportModal';
import { DownloadPCModal } from './components/DownloadPCModal';
import { WeaponType, VehicleType } from './game/types';
import { RADIO_STATIONS } from './game/constants';
import { soundEngine } from './game/audio';
import gameLogoImg from './assets/images/novaforge_game_logo_1787648448233.jpg';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  Smartphone,
  Crosshair,
  Trophy,
  HelpCircle,
  Sparkles,
  Zap,
  Eye,
  CloudRain,
  Sun,
  Moon,
  Search,
  Heart,
  Download,
  Monitor,
} from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isStarted, setIsStarted] = useState(true);
  const [showQuickHint, setShowQuickHint] = useState(true);
  const [isWeaponWheelOpen, setIsWeaponWheelOpen] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isDownloadPCOpen, setIsDownloadPCOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeRadioStation, setActiveRadioStation] = useState(1);
  const [, setTick] = useState(0); // Force re-render periodically for HUD

  // Initialize Game Engine on mount and start rendering immediately
  useEffect(() => {
    if (!containerRef.current) return;
    const gameInstance = new GameEngine(containerRef.current);
    setEngine(gameInstance);
    gameInstance.start();

    // Auto-hide quick hint after 6 seconds
    const hintTimeout = setTimeout(() => {
      setShowQuickHint(false);
    }, 7000);

    // Update HUD state loop
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 100);

    return () => {
      clearTimeout(hintTimeout);
      clearInterval(interval);
      gameInstance.stop();
    };
  }, []);

  const handleSpawnVehicle = (type: VehicleType) => {
    if (engine) {
      engine.spawnVehicle(type);
    }
  };

  const handleSelectRadioStation = (idx: number) => {
    setActiveRadioStation(idx);
    soundEngine.playRadioBeat(idx);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCameraMode = () => {
    if (engine) {
      engine.toggleCameraMode();
    }
  };

  const handleCycleWeather = () => {
    if (engine) {
      const p = engine.weather.cycleWeather();
      engine.missions.addChatMessage('Atmosphere', `Weather adjusted: ${p.toUpperCase()} (T)`, 'system');
    }
  };

  const handleInspectWeapon = () => {
    if (engine) {
      engine.player.inspectWeapon();
    }
  };

  const handleSelectWeapon = (weapon: WeaponType) => {
    if (engine) {
      engine.player.switchWeapon(weapon);
    }
  };

  const handleSendChat = (text: string) => {
    if (!engine) return;
    const clean = text.trim();
    engine.missions.addChatMessage('You', clean, 'player');

    // Check if it's a command
    if (clean.startsWith('/')) {
      const cmd = clean.toLowerCase();
      if (cmd.includes('car') || cmd.includes('spawn sports')) engine.spawnVehicle('sports');
      else if (cmd.includes('heli') || cmd.includes('chopper')) engine.spawnVehicle('helicopter');
      else if (cmd.includes('bike')) engine.spawnVehicle('motorcycle');
      else if (cmd.includes('suv')) engine.spawnVehicle('suv');
      else if (cmd.includes('wanted 5') || cmd.includes('stars 5')) engine.player.addWantedStars(5);
      else if (cmd.includes('clear')) {
        engine.player.wantedStars = 0;
        soundEngine.stopPoliceSiren();
      } else if (cmd.includes('money')) {
        engine.player.cash += 50000;
        soundEngine.playCashPickup();
      } else if (cmd.includes('god') || cmd.includes('heal')) {
        engine.player.health = 100;
        engine.player.armor = 100;
      }
    }
  };

  const currentPreset = engine?.weather?.currentPreset || 'day';

  return (
    <div className="relative w-screen h-screen bg-[#020408] overflow-hidden text-white font-sans select-none">
      {/* Low Health Heartbeat Red Vignette Warning */}
      {engine?.player && engine.player.health > 0 && engine.player.health <= 35 && (
        <div className="absolute inset-0 pointer-events-none z-30 border-[16px] border-rose-600/40 shadow-[inset_0_0_80px_rgba(225,29,72,0.6)] animate-pulse" />
      )}

      {/* Frosted Glass Ambient Lighting Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-900/10 rounded-full blur-[150px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-indigo-900/20 rounded-full blur-[100px]" />
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="relative z-0 w-full h-full cursor-crosshair" />

      {/* Crosshair & Sniper Scope HUD */}
      {isStarted && <CrosshairHUD player={engine?.player || null} />}

      {/* DYNAMIC INTERACTION PROMPT BANNER (Doors, Keycards, Safes, ATMs, Vault) */}
      {isStarted && engine?.currentInteractionPrompt && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-black/75 backdrop-blur-2xl border border-white/20 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-sm shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold tracking-wide uppercase font-mono text-cyan-300">
              {engine.currentInteractionPrompt}
            </div>
          </div>
        </div>
      )}

      {/* KEYCARDS & PASSES BADGES (Top Center HUD) */}
      {isStarted && engine?.player && engine.player.keycards.size > 0 && (
        <div className="fixed top-20 right-6 z-30 flex flex-col items-end gap-1.5 pointer-events-none">
          <div className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest">
            Security Keycards
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {Array.from(engine.player.keycards).map((kId: string) => {
              const names: Record<string, string> = {
                safehouse_key: 'Marina Condo Card',
                ammunation_vip: 'Ammu-Nation VIP',
                bank_vault_pass: 'Bank Vault Passcard',
                bunker_key: 'Bunker Workshop Key',
                cyber_corp_badge: 'Cyber Corp Badge',
                nexus_vip_card: 'Nexus Casino VIP',
                police_precinct_key: 'Precinct Armory Key',
                downtown_penthouse_key: 'Penthouse RFID',
                dealership_key: 'Showroom Master Key',
              };
              return (
                <span
                  key={kId}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold font-mono tracking-wider shadow-lg flex items-center gap-1.5 backdrop-blur-md"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {names[kId] || kId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP STATUS BAR - Frosted Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 px-4 sm:px-8 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="relative group flex items-center justify-center">
            <img
              src={gameLogoImg}
              alt="NovaForge Ultra 3D Game Emblem Logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-2xl border border-cyan-400/50 shadow-lg shadow-cyan-500/25 object-cover group-hover:scale-105 transition-transform duration-300 ring-1 ring-white/20"
            />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl opacity-40 blur-sm -z-10 group-hover:opacity-75 transition-opacity" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 flex items-center gap-2">
              NOVAFORGE
              <span className="text-[10px] not-italic tracking-widest font-mono font-bold bg-blue-600/30 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                ULTRA 3D
              </span>
            </h1>
            <div className="text-[10px] text-white/40 tracking-wider uppercase font-medium flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>DYNAMIC ATMOSPHERE & REAL PHYSICS</span>
            </div>
          </div>
        </div>

        {/* Action Controls in Top Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Download for PC Client Button (Highlight Button) */}
          <button
            onClick={() => setIsDownloadPCOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/25 via-teal-500/25 to-emerald-600/25 hover:from-emerald-500/35 hover:via-teal-500/35 hover:to-emerald-600/35 border border-emerald-400/50 text-emerald-300 hover:text-white text-xs font-black uppercase tracking-wider backdrop-blur-md transition shadow-lg shadow-emerald-500/15 cursor-pointer animate-pulse hover:animate-none"
            title="Download Standalone PC Edition / 1-Click Desktop App"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Download for PC</span>
            <span className="sm:hidden">PC</span>
            <span className="hidden md:inline-block text-[9px] font-mono font-bold bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-400/30">
              ZIP/PWA
            </span>
          </button>

          {/* Support NovaForge Button (Highlight Button) */}
          <button
            onClick={() => setIsSupportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-amber-500/20 hover:from-rose-500/30 hover:via-pink-500/30 hover:to-amber-500/30 border border-rose-400/40 text-rose-300 hover:text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md transition shadow-lg shadow-rose-500/10 cursor-pointer"
            title="Support NovaForge Development"
          >
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400/40" />
            <span className="hidden sm:inline">Support</span>
          </button>

          {/* Weather & Atmosphere Switcher (Day / Sunset / Night / Storm) */}
          <button
            onClick={handleCycleWeather}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-mono font-bold text-white/90 backdrop-blur-md transition shadow-sm"
            title="Cycle Atmosphere Weather (T)"
          >
            {currentPreset === 'rain' ? (
              <CloudRain className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
            ) : currentPreset === 'night' ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline uppercase text-[11px]">
              {currentPreset} (T)
            </span>
          </button>

          {/* Inspect Weapon Button */}
          <button
            onClick={handleInspectWeapon}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 backdrop-blur-md transition"
            title="Inspect Current Weapon (I)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-300" />
            <span className="text-[11px] font-mono">Inspect (I)</span>
          </button>

          {/* Radio Station badge */}
          <button
            onClick={() => setIsPhoneOpen(true)}
            className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 backdrop-blur-md transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[120px] font-mono text-[11px]">{RADIO_STATIONS[activeRadioStation]?.name}</span>
          </button>

          {/* Sound Mute Button */}
          <button
            onClick={handleToggleMute}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white backdrop-blur-md transition"
            title="Toggle Audio (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>

          {/* Camera Perspective Mode Button (1st Person / 3rd Person) */}
          <button
            onClick={handleToggleCameraMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md transition shadow-sm font-bold text-xs uppercase tracking-wider ${
              engine?.cameraMode === 'first_person'
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
            }`}
            title="Toggle 1st / 3rd Person Camera (V)"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">
              {engine?.cameraMode === 'first_person' ? '1st Person (V)' : '3rd Person (V)'}
            </span>
            <span className="sm:hidden">
              {engine?.cameraMode === 'first_person' ? '1P' : '3P'}
            </span>
          </button>

          {/* Phone Button */}
          <button
            onClick={() => setIsPhoneOpen(!isPhoneOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md transition shadow-sm"
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Phone</span>
          </button>

          {/* Weapon Wheel Button */}
          <button
            onClick={() => setIsWeaponWheelOpen(!isWeaponWheelOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-blue-600/30"
          >
            <Crosshair className="w-4 h-4" />
            <span className="hidden sm:inline">Arsenal</span>
          </button>

          {/* Scoreboard Button */}
          <button
            onClick={() => setIsScoreboardOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white backdrop-blur-md transition"
            title="Leaderboard & Players"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>

          {/* Help Button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white backdrop-blur-md transition"
            title="Controls & Instructions"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </header>

      {/* RADAR MINIMAP HUD (Bottom-Left) */}
      {isStarted && (
        <div className="fixed bottom-6 left-6 z-30 pointer-events-none">
          <div className="pointer-events-auto">
            <RadarMap
              player={engine?.player || null}
              world={engine?.world || null}
              ai={engine?.ai || null}
              missions={engine?.missions || null}
              weather={engine?.weather || null}
            />
          </div>
        </div>
      )}

      {/* WEAPON AMMO HUD & WEAPON WHEEL */}
      {isStarted && (
        <WeaponWheel
          player={engine?.player || null}
          isOpen={isWeaponWheelOpen}
          onClose={() => setIsWeaponWheelOpen(false)}
          onSelectWeapon={handleSelectWeapon}
        />
      )}

      {/* CYBER SMARTPHONE PDA */}
      <PhonePDA
        player={engine?.player || null}
        missions={engine?.missions || null}
        isOpen={isPhoneOpen}
        onClose={() => setIsPhoneOpen(false)}
        onSpawnVehicle={handleSpawnVehicle}
        onSelectStation={handleSelectRadioStation}
        activeRadioStation={activeRadioStation}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenDownloadPC={() => setIsDownloadPCOpen(true)}
      />

      {/* SUPPORT NOVAFORGE MODAL */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* DOWNLOAD FOR PC MODAL */}
      <DownloadPCModal
        isOpen={isDownloadPCOpen}
        onClose={() => setIsDownloadPCOpen(false)}
      />

      {/* CHAT, KILLFEED & MISSION OBJECTIVE BANNER */}
      {isStarted && (
        <ChatAndKillFeed
          missions={engine?.missions || null}
          player={engine?.player || null}
          onSendChat={handleSendChat}
        />
      )}

      {/* ONLINE LEADERBOARD MODAL */}
      <ScoreboardModal
        player={engine?.player || null}
        ai={engine?.ai || null}
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
      />

      {/* TOUCH CONTROLS FOR MOBILE */}
      {isStarted && (
        <TouchControls
          engine={engine}
          onOpenPhone={() => setIsPhoneOpen(true)}
          onOpenWeaponWheel={() => setIsWeaponWheelOpen(true)}
        />
      )}

      {/* QUICK OPERATIVE BRIEFING TOAST */}
      {showQuickHint && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-lg w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white uppercase tracking-wider">
                  Next-Gen Graphics & Real Mechanisms Active
                </div>
                <div className="text-[11px] text-white/70">
                  <span className="text-cyan-300 font-bold">I</span> Inspect Weapon • <span className="text-cyan-300 font-bold">T</span> Atmosphere Weather • <span className="text-cyan-300 font-bold">L</span> Flashlight • <span className="text-cyan-300 font-bold">Shift</span> Sprint Stamina • <span className="text-cyan-300 font-bold">V</span> 1st/3rd Person
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowQuickHint(false)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-bold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* CONTROLS & HELP MODAL - Frosted Glass */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#020408]/80 backdrop-blur-2xl flex items-center justify-center p-4"
          onClick={() => setIsHelpOpen(false)}
        >
          <div
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 text-left relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" /> Operational Directives & Controls
              </h2>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-wider rounded-lg transition"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-white/70">
              <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-1.5 font-mono">
                <div className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">Controls & Mechanisms</div>
                <div><span className="text-cyan-300 font-bold">E:</span> Open / Close Door • Unlock with Keycard • Hack ATM & Loot Safes</div>
                <div><span className="text-cyan-300 font-bold">F / K:</span> Kick & Breach Door / Drive Nearest Vehicle</div>
                <div><span className="text-white font-bold">W, A, S, D:</span> Move Character / Steer Vehicle</div>
                <div><span className="text-cyan-300 font-bold">I:</span> Inspect Weapon (3D First-Person & Third-Person Animation)</div>
                <div><span className="text-cyan-300 font-bold">T:</span> Cycle Weather Presets (Day / Golden Sunset / Cyber Night / Storm)</div>
                <div><span className="text-cyan-300 font-bold">L:</span> Toggle Tactical Weapon Flashlight</div>
                <div><span className="text-white font-bold">V:</span> Switch 1st-Person (FPS) & 3rd-Person (TPS) Camera</div>
                <div><span className="text-white font-bold">Mouse Look:</span> Orbit Camera & Aim with Crosshair</div>
                <div><span className="text-white font-bold">Left Click:</span> Shoot (Splinters Wood/Glass/Metal on Doors)</div>
                <div><span className="text-white font-bold">Right Click:</span> ADS / Scope Zoom</div>
                <div><span className="text-white font-bold">Shift:</span> Sprint (Consumes Stamina) / Nitro Boost in Car</div>
                <div><span className="text-white font-bold">Space:</span> Jump / Handbrake Drift in Car / Helicopter Ascend</div>
                <div><span className="text-white font-bold">C / Ctrl:</span> Crouch / Helicopter Descend</div>
                <div><span className="text-white font-bold">H:</span> Toggle High-Beam Headlights & Car Horn</div>
                <div><span className="text-white font-bold">R:</span> Reload Weapon</div>
                <div><span className="text-white font-bold">1 to 8:</span> Switch Weapons</div>
                <div><span className="text-white font-bold">P:</span> Open Smartphone PDA (Contracts, Delivery, Cheats)</div>
              </div>

              <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-1.5">
                <div className="text-amber-400 font-bold uppercase text-[10px] tracking-widest font-mono">Advanced Real-Life Mechanics</div>
                <p>• <span className="text-white font-semibold">Vehicle Dynamics:</span> Realistic spring-damper suspension physics, body pitch during braking, tire skids, and engine smoke when damaged.</p>
                <p>• <span className="text-white font-semibold">Player Stamina & Fall Damage:</span> Sustained sprinting causes physical exhaustion; falling from high structures causes real velocity-based impact damage.</p>
                <p>• <span className="text-white font-semibold">Atmospheric Engine:</span> Dynamic sun positioning, volumetric rain particles, water ripple geysers, and realistic lighting reflections.</p>
              </div>

              {/* PC Standalone Quick Download Link */}
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  setIsDownloadPCOpen(true);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Download Standalone PC Edition (ZIP / 1-Click App)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
