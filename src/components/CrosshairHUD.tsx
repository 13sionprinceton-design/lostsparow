import React from 'react';
import { Player } from '../game/player';
import { WEAPONS } from '../game/constants';

interface CrosshairHUDProps {
  player: Player | null;
}

export const CrosshairHUD: React.FC<CrosshairHUDProps> = ({ player }) => {
  if (!player || player.inVehicle) return null;

  const currentWDef = WEAPONS[player.currentWeapon];
  const isAimingSniper = player.isAiming && player.currentWeapon === 'sniper';
  const isAiming = player.isAiming;
  const isSprinting = player.isSprinting;

  // 1. Fullscreen Sniper Scope Reticle
  if (isAimingSniper) {
    return (
      <div id="sniper-scope-overlay" className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center select-none">
        {/* Dark Vignette border masking outer screen */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.96)_58%)]" />

        {/* Scope Circular Lens Ring */}
        <div className="relative w-[500px] h-[500px] rounded-full border-2 border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center">
          {/* Outer compass degree marks */}
          <div className="absolute top-2 text-[10px] font-mono text-cyan-400">12.8X PLASMA OPTIC</div>
          <div className="absolute bottom-2 text-[10px] font-mono text-cyan-400">RANGE: 180M • CAL: .50 BMG</div>

          {/* Crosshairs */}
          <div className="absolute w-full h-[1.5px] bg-cyan-400/80 shadow-[0_0_8px_#06b6d4]" />
          <div className="absolute h-full w-[1.5px] bg-cyan-400/80 shadow-[0_0_8px_#06b6d4]" />

          {/* Center Red Dot */}
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_6px_#ef4444]" />

          {/* Mil-dot ticks */}
          {[-80, -40, 40, 80].map((offset) => (
            <React.Fragment key={offset}>
              <div
                className="absolute w-2 h-0.5 bg-cyan-400"
                style={{ top: `calc(50% + ${offset}px)`, left: 'calc(50% - 4px)' }}
              />
              <div
                className="absolute h-2 w-0.5 bg-cyan-400"
                style={{ left: `calc(50% + ${offset}px)`, top: 'calc(50% - 4px)' }}
              />
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // 2. Standard Dynamic Crosshair
  const spreadPx = isSprinting ? 22 : isAiming ? 8 : 14;

  return (
    <div id="standard-crosshair" className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center select-none">
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Center Precision Dot */}
        <div className="w-1 h-1 bg-cyan-400 rounded-full drop-shadow-[0_0_4px_#06b6d4]" />

        {/* Top Tick */}
        <div
          className="absolute w-[2px] h-[7px] bg-white/90 rounded-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-all duration-75"
          style={{ top: `calc(50% - ${spreadPx}px - 7px)` }}
        />
        {/* Bottom Tick */}
        <div
          className="absolute w-[2px] h-[7px] bg-white/90 rounded-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-all duration-75"
          style={{ bottom: `calc(50% - ${spreadPx}px - 7px)` }}
        />
        {/* Left Tick */}
        <div
          className="absolute h-[2px] w-[7px] bg-white/90 rounded-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-all duration-75"
          style={{ left: `calc(50% - ${spreadPx}px - 7px)` }}
        />
        {/* Right Tick */}
        <div
          className="absolute h-[2px] w-[7px] bg-white/90 rounded-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-all duration-75"
          style={{ right: `calc(50% - ${spreadPx}px - 7px)` }}
        />
      </div>
    </div>
  );
};
