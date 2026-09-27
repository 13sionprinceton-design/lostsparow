import React from 'react';
import { GameEngine } from '../game/engine';
import { Crosshair, Car, RotateCcw, Smartphone, Zap, Shield, Search, Lightbulb } from 'lucide-react';

interface TouchControlsProps {
  engine: GameEngine | null;
  onOpenPhone: () => void;
  onOpenWeaponWheel: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ engine, onOpenPhone, onOpenWeaponWheel }) => {
  if (!engine) return null;

  const handleTouchKey = (code: string, isPressed: boolean) => {
    engine.keys[code] = isPressed;
  };

  const handleShoot = (isDown: boolean) => {
    engine.mouse.isDown = isDown;
    if (isDown) {
      engine.player.shoot(engine.aimTargetPoint, engine.particles);
    }
  };

  const handleAim = (isDown: boolean) => {
    engine.mouse.isRightDown = isDown;
  };

  return (
    <div id="touch-controls-overlay" className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 md:hidden select-none">
      {/* Top Mobile Bar */}
      <div className="flex justify-between items-center pointer-events-auto">
        <button
          onClick={onOpenPhone}
          className="p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-cyan-400 active:scale-95 transition shadow-lg"
        >
          <Smartphone className="w-6 h-6" />
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => engine.player.inspectWeapon()}
            className="p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-cyan-300 active:scale-95 transition shadow-lg font-bold text-xs flex items-center gap-1"
            title="Inspect Weapon"
          >
            <Search className="w-4 h-4" />
            <span>INSPECT</span>
          </button>
          <button
            onClick={() => engine.player.toggleFlashlight()}
            className="p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-yellow-300 active:scale-95 transition shadow-lg"
            title="Flashlight"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenWeaponWheel}
            className="p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-amber-400 active:scale-95 transition shadow-lg"
          >
            <Crosshair className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Virtual Controls */}
      <div className="flex justify-between items-end pb-2">
        {/* Left D-Pad Controls */}
        <div className="pointer-events-auto grid grid-cols-3 gap-1.5 w-36 h-36">
          <div />
          <button
            onTouchStart={() => handleTouchKey('KeyW', true)}
            onTouchEnd={() => handleTouchKey('KeyW', false)}
            className="rounded-xl bg-slate-900/70 active:bg-cyan-600 border border-slate-700/80 text-white font-bold flex items-center justify-center text-lg"
          >
            ▲
          </button>
          <div />
          <button
            onTouchStart={() => handleTouchKey('KeyA', true)}
            onTouchEnd={() => handleTouchKey('KeyA', false)}
            className="rounded-xl bg-slate-900/70 active:bg-cyan-600 border border-slate-700/80 text-white font-bold flex items-center justify-center text-lg"
          >
            ◀
          </button>
          <button
            onTouchStart={() => handleTouchKey('KeyS', true)}
            onTouchEnd={() => handleTouchKey('KeyS', false)}
            className="rounded-xl bg-slate-900/70 active:bg-cyan-600 border border-slate-700/80 text-white font-bold flex items-center justify-center text-lg"
          >
            ▼
          </button>
          <button
            onTouchStart={() => handleTouchKey('KeyD', true)}
            onTouchEnd={() => handleTouchKey('KeyD', false)}
            className="rounded-xl bg-slate-900/70 active:bg-cyan-600 border border-slate-700/80 text-white font-bold flex items-center justify-center text-lg"
          >
            ▶
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => engine.tryEnterNearestVehicle()}
              className="w-12 h-12 rounded-full bg-blue-600/80 active:bg-blue-500 border border-blue-400 text-white flex items-center justify-center shadow-lg"
            >
              <Car className="w-5 h-5" />
            </button>
            <button
              onClick={() => engine.player.reload()}
              className="w-12 h-12 rounded-full bg-slate-800/80 active:bg-slate-700 border border-slate-600 text-amber-400 flex items-center justify-center shadow-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onTouchStart={() => handleAim(true)}
              onTouchEnd={() => handleAim(false)}
              className="w-14 h-14 rounded-full bg-slate-800/90 active:bg-cyan-600 border border-cyan-500/50 text-cyan-300 font-bold text-xs flex items-center justify-center shadow-lg"
            >
              AIM
            </button>

            <button
              onTouchStart={() => handleShoot(true)}
              onTouchEnd={() => handleShoot(false)}
              className="w-16 h-16 rounded-full bg-rose-600/90 active:bg-rose-500 border-2 border-rose-400 text-white font-black text-sm flex items-center justify-center shadow-xl shadow-rose-600/30"
            >
              FIRE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
