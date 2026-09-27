import React from 'react';
import { Player } from '../game/player';
import { WorldGenerator } from '../game/world';
import { AISystem } from '../game/ai';
import { MissionManager } from '../game/missions';
import { WeatherSystem } from '../game/weather';
import { Shield, Heart, Zap, Compass, Star, Gauge, Activity, Lightbulb, Clock, Wrench } from 'lucide-react';

interface RadarMapProps {
  player: Player | null;
  world: WorldGenerator | null;
  ai: AISystem | null;
  missions: MissionManager | null;
  weather?: WeatherSystem | null;
}

export const RadarMap: React.FC<RadarMapProps> = ({ player, world, ai, missions, weather }) => {
  if (!player) return null;

  const pX = player.position.x;
  const pZ = player.position.z;
  const inVeh = player.inVehicle;
  const speedMph = inVeh ? (inVeh.telemetry?.mph ?? inVeh.mph ?? Math.round(Math.abs(inVeh.speed) * 2.237)) : 0;
  const speedKmh = inVeh ? (inVeh.telemetry?.kmh ?? Math.round(Math.abs(inVeh.speed) * 3.6)) : 0;
  const headingDeg = (player.rotationY * 180) / Math.PI;

  const radarRadius = 60; // scale in world meters visible on radar
  const radarPx = 80; // visual half-width px

  const toRadarPos = (x: number, z: number) => {
    // Relative to player
    const dx = x - pX;
    const dz = z - pZ;
    // Rotate with camera heading so radar is oriented forward
    const rad = -player.rotationY;
    const rx = dx * Math.cos(rad) - dz * Math.sin(rad);
    const rz = dx * Math.sin(rad) + dz * Math.cos(rad);

    const mapX = 80 + (rx / radarRadius) * radarPx;
    const mapY = 80 + (rz / radarRadius) * radarPx;
    return { x: mapX, y: mapY, inView: Math.sqrt(rx * rx + rz * rz) < radarRadius };
  };

  const activeMissionStage = missions?.activeMission?.stages[missions.currentStageIndex];
  const missionLoc = activeMissionStage?.targetLocation;
  const missionRadar = missionLoc ? toRadarPos(missionLoc.x, missionLoc.z) : null;
  const sprayRadar = world ? toRadarPos(world.payNSpray.x, world.payNSpray.z) : null;
  const bankRadar = world ? toRadarPos(world.bankLocation.x, world.bankLocation.z) : null;

  return (
    <div id="radar-hud" className="relative flex flex-col items-start select-none">
      {/* Wanted Stars Banner & Real 24h Game Clock */}
      <div className="flex items-center justify-between w-48 mb-2 gap-2">
        <div id="wanted-stars-container" className="flex items-center gap-1 bg-white/5 backdrop-blur-xl px-2.5 py-1 rounded-2xl border border-white/10 shadow-2xl">
          {[1, 2, 3, 4, 5].map((starNum) => {
            const isWanted = player.wantedStars >= starNum;
            const isFlashing = isWanted && player.isEscapingPolice;
            return (
              <Star
                key={starNum}
                className={`w-3.5 h-3.5 transition-all ${
                  isWanted
                    ? isFlashing
                      ? 'text-amber-300 animate-pulse fill-amber-300'
                      : 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'text-white/20'
                }`}
              />
            );
          })}
        </div>

        {weather && (
          <div className="flex items-center gap-1 bg-white/5 backdrop-blur-xl px-2.5 py-1 rounded-2xl border border-white/10 text-[10px] font-mono font-bold text-cyan-300">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{weather.timeString}</span>
          </div>
        )}
      </div>

      {/* Circular Radar Container */}
      <div className="relative w-44 h-44 rounded-full border border-white/15 bg-white/5 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Radar concentric grids */}
        <div className="absolute inset-0 border border-white/10 rounded-full scale-75" />
        <div className="absolute inset-0 border border-white/10 rounded-full scale-50" />
        <div className="absolute inset-0 border border-white/5 rounded-full scale-25" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 -translate-y-1/2" />

        {/* Pay 'n' Spray Icon */}
        {sprayRadar && sprayRadar.inView && (
          <div
            className="absolute w-3 h-3 bg-emerald-400 rounded-full -translate-x-1/2 -translate-y-1/2 border border-white/50 shadow-[0_0_8px_#34d399]"
            style={{ left: `${sprayRadar.x}px`, top: `${sprayRadar.y}px` }}
            title="Pay 'n' Spray"
          />
        )}

        {/* Bank Icon */}
        {bankRadar && bankRadar.inView && (
          <div
            className="absolute w-3 h-3 bg-amber-400 rounded-sm -translate-x-1/2 -translate-y-1/2 border border-white/50 shadow-[0_0_8px_#f59e0b]"
            style={{ left: `${bankRadar.x}px`, top: `${bankRadar.y}px` }}
            title="Nova Central Bank"
          />
        )}

        {/* Mission Objective Marker */}
        {missionRadar && (
          <div
            className="absolute w-3.5 h-3.5 bg-blue-400 rotate-45 -translate-x-1/2 -translate-y-1/2 border border-white animate-ping shadow-[0_0_10px_#60a5fa]"
            style={{
              left: `${Math.max(10, Math.min(160, missionRadar.x))}px`,
              top: `${Math.max(10, Math.min(160, missionRadar.y))}px`,
            }}
          />
        )}

        {/* Police AI Markers */}
        {ai &&
          player.wantedStars > 0 &&
          ai.entities
            .filter((e) => (e.type === 'cop' || e.type === 'swat') && e.state !== 'dead')
            .map((cop) => {
              const cp = toRadarPos(cop.position.x, cop.position.z);
              if (!cp.inView) return null;
              return (
                <div
                  key={cop.id}
                  className="absolute w-2.5 h-2.5 bg-rose-500 rounded-full -translate-x-1/2 -translate-y-1/2 border border-white animate-pulse shadow-[0_0_6px_#f43f5e]"
                  style={{ left: `${cp.x}px`, top: `${cp.y}px` }}
                />
              );
            })}

        {/* Online Bots Markers */}
        {ai &&
          ai.entities
            .filter((e) => e.type === 'bot_player' && e.state !== 'dead')
            .map((bot) => {
              const bp = toRadarPos(bot.position.x, bot.position.z);
              if (!bp.inView) return null;
              return (
                <div
                  key={bot.id}
                  className="absolute w-2 h-2 bg-indigo-400 rounded-full -translate-x-1/2 -translate-y-1/2 border border-white/60 shadow-[0_0_6px_#818cf8]"
                  style={{ left: `${bp.x}px`, top: `${bp.y}px` }}
                />
              );
            })}

        {/* Player Center Blip */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-blue-400 drop-shadow-[0_0_8px_#60a5fa]" />
        </div>

        {/* Compass N Indicator */}
        <div
          className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/50 tracking-wider flex items-center gap-0.5"
          style={{ transform: `rotate(${headingDeg}deg) translateY(-68px)` }}
        >
          <Compass className="w-3 h-3 text-rose-400" />
          <span className="text-rose-400 font-black">N</span>
        </div>
      </div>

      {/* Health, Armor & Stamina Arc Bars */}
      <div className="w-48 mt-2 space-y-1.5 bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl">
        {/* Health */}
        <div className="flex items-center gap-2">
          <Heart className={`w-3.5 h-3.5 ${player.health < 35 ? 'text-rose-400 fill-rose-400 animate-ping' : 'text-emerald-400 fill-emerald-400'} shrink-0`} />
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${player.health < 35 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-green-400'}`}
              style={{ width: `${Math.max(0, player.health)}%` }}
            />
          </div>
          <span className={`text-[11px] font-mono font-bold w-7 text-right ${player.health < 35 ? 'text-rose-400 animate-pulse' : 'text-emerald-300'}`}>
            {Math.round(player.health)}
          </span>
        </div>

        {/* Armor */}
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-blue-400 fill-blue-400 shrink-0" />
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-200"
              style={{ width: `${Math.max(0, player.armor)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-300 w-7 text-right">{Math.round(player.armor)}</span>
        </div>

        {/* Real-Life Stamina & Exhaustion Meter */}
        <div className="flex items-center gap-2">
          <Activity className={`w-3.5 h-3.5 ${player.isExhausted ? 'text-rose-400 animate-pulse' : 'text-cyan-400'} shrink-0`} />
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                player.isExhausted
                  ? 'bg-rose-500 animate-pulse'
                  : player.isSprinting
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-cyan-400 to-teal-300'
              }`}
              style={{ width: `${Math.max(0, player.stamina)}%` }}
            />
          </div>
          <span className={`text-[10px] font-mono font-bold w-7 text-right ${player.isExhausted ? 'text-rose-400' : 'text-cyan-300'}`}>
            {player.isExhausted ? 'EXH' : `${Math.round(player.stamina)}%`}
          </span>
        </div>

        {/* Tactical Flashlight Badge */}
        {player.isFlashlightOn && (
          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-cyan-300">
            <Lightbulb className="w-3 h-3 text-cyan-400" />
            <span>TAC-LIGHT ON (L)</span>
          </div>
        )}

        {/* Real-Life Vehicle Dashboard Telemetry & Damage */}
        {inVeh && (
          <div className="pt-2 border-t border-white/10 space-y-1.5 font-mono">
            {/* Vehicle Header & Speed */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white/80 font-bold tracking-tight">{inVeh.def.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-amber-400">{speedMph}</span>
                <span className="text-[9px] text-white/50 ml-1 font-bold">MPH</span>
              </div>
            </div>

            {/* Vehicle Structural Durability Bar */}
            <div className="flex items-center gap-2 text-[10px]">
              <Wrench className={`w-3 h-3 ${inVeh.health < inVeh.maxHealth * 0.35 ? 'text-rose-500 animate-bounce' : 'text-zinc-400'}`} />
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    inVeh.health < inVeh.maxHealth * 0.3
                      ? 'bg-rose-600 animate-pulse'
                      : inVeh.health < inVeh.maxHealth * 0.6
                      ? 'bg-amber-500'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.max(0, (inVeh.health / inVeh.maxHealth) * 100)}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold ${inVeh.health < inVeh.maxHealth * 0.3 ? 'text-rose-400 animate-pulse' : 'text-white/70'}`}>
                {Math.round((inVeh.health / inVeh.maxHealth) * 100)}%
              </span>
            </div>

            {/* Gear & RPM & Drift Telemetry */}
            <div className="flex items-center justify-between text-[11px] bg-black/40 px-2 py-1 rounded-lg border border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="text-white/50 text-[9px] font-bold uppercase">Gear</span>
                <span className={`font-black px-1.5 py-0.2 rounded text-[10px] ${(inVeh.telemetry?.gear ?? inVeh.gear) === 'R' ? 'bg-rose-500/30 text-rose-300' : 'bg-blue-500/30 text-blue-300'}`}>
                  {inVeh.telemetry?.gear ?? inVeh.gear ?? 'N'}
                </span>
              </div>

              {/* RPM Bar */}
              <div className="flex items-center gap-1 w-20">
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${(inVeh.telemetry?.rpm ?? inVeh.rpm ?? 900) > 6500 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400'}`}
                    style={{ width: `${Math.min(100, ((inVeh.telemetry?.rpm ?? inVeh.rpm ?? 900) / 7500) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Drift Flag */}
              {(inVeh.isDrifting || (inVeh.driftIntensity && inVeh.driftIntensity > 0.3)) && (
                <span className="text-[9px] font-black text-amber-400 bg-amber-400/20 px-1 rounded animate-pulse">
                  DRIFT
                </span>
              )}
            </div>

            {/* Nitro & Headlights */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1 flex-1">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400"
                    style={{ width: `${inVeh.nitroTime}%` }}
                  />
                </div>
              </div>
              <span className="text-[9px] text-white/50">{inVeh.isHeadlightsOn ?? inVeh.headlightsActive ? '💡 HIGH' : 'OFF (H)'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

