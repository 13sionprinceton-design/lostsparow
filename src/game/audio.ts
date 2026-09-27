// Web Audio API procedural sound engine for Novaforge

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private isEngineRunning: boolean = false;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isMuted: boolean = false;
  private radioInterval: number | null = null;
  private currentStationIndex: number = 0;

  constructor() {
    // Lazy init on first user gesture
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch {
      console.warn("AudioContext not supported or blocked");
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playGunshot(type: string) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;

    if (type === 'katana') {
      // Blade swoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.13);
      return;
    }

    if (type === 'rpg') {
      // Rocket whoosh + heavy blast
      const noiseBuffer = this.createNoiseBuffer(0.8);
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.8);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noiseSource.start(t);

      // Bass boom
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
      oscGain.gain.setValueAtTime(0.9, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.65);
      return;
    }

    // Standard firearms (Pistol, SMG, AR, Shotgun, Sniper)
    let duration = 0.2;
    let noiseFilterFreq = 3000;
    let bassFreq = 180;
    let volume = 0.6;

    if (type === 'pistol') {
      duration = 0.15;
      noiseFilterFreq = 4000;
      bassFreq = 220;
      volume = 0.5;
    } else if (type === 'smg') {
      duration = 0.12;
      noiseFilterFreq = 4800;
      bassFreq = 200;
      volume = 0.45;
    } else if (type === 'rifle') {
      duration = 0.22;
      noiseFilterFreq = 3200;
      bassFreq = 160;
      volume = 0.65;
    } else if (type === 'shotgun') {
      duration = 0.35;
      noiseFilterFreq = 2200;
      bassFreq = 120;
      volume = 0.85;
    } else if (type === 'sniper') {
      duration = 0.45;
      noiseFilterFreq = 5000;
      bassFreq = 100;
      volume = 0.9;
    }

    // Noise crack
    const noiseBuffer = this.createNoiseBuffer(duration);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(noiseFilterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSource.start(t);

    // Punch transient
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(bassFreq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + duration * 0.7);
    oscGain.gain.setValueAtTime(volume * 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.7);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  public playReload() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Mag click out
    this.playClickSound(t, 900, 0.05);
    // Mag click in
    this.playClickSound(t + 0.3, 1200, 0.06);
    // Slide rack
    this.playClickSound(t + 0.6, 700, 0.08);
  }

  public playInspect(weaponType: string) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    if (weaponType === 'katana') {
      // Katana blade ping / shimmer
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.5);

      // Secondary metallic harmonic
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2800, t + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.5);
      gain2.gain.setValueAtTime(0.2, t + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.6);
      return;
    }

    // Firearms inspect sound sequence (subtle tilt click, bolt chamber check, settle click)
    // 1. Initial handling rustle / latch click
    this.playClickSound(t, 1100, 0.04);
    // 2. Chamber check / slide pull click
    this.playClickSound(t + 0.35, 1400, 0.05);
    this.playClickSound(t + 0.5, 850, 0.06);
    // 3. Return slide snap
    this.playClickSound(t + 1.4, 1600, 0.04);
    this.playClickSound(t + 1.55, 950, 0.05);
  }

  private playClickSound(time: number, freq: number, dur: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(200, time + dur);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  public playHitmarker(isHeadshot: boolean = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHeadshot ? 1600 : 900, t);
    osc.frequency.setValueAtTime(isHeadshot ? 2200 : 1100, t + 0.03);
    gain.gain.setValueAtTime(isHeadshot ? 0.45 : 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playExplosion() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const duration = 1.2;

    const noiseBuffer = this.createNoiseBuffer(duration);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // Deep sub rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 0.8);
    subGain.gain.setValueAtTime(0.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.85);
  }

  public playTireScreech() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const duration = 0.25;

    const noiseBuffer = this.createNoiseBuffer(duration);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(6, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public startVehicleEngine() {
    if (!this.ctx || !this.sfxGain || this.isEngineRunning) return;
    this.resume();

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.engineOsc.connect(this.engineGain);
    this.engineOsc2.connect(this.engineGain);

    this.engineOsc.start();
    this.engineOsc2.start();
    this.isEngineRunning = true;
  }

  public updateVehicleEngine(speedRatio: number, isAccelerating: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2 || !this.engineGain) return;
    const targetFreq = 45 + speedRatio * 180 + (isAccelerating ? 30 : 0);
    const targetVol = 0.12 + speedRatio * 0.25 + (isAccelerating ? 0.1 : 0);
    
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.08);
  }

  public stopVehicleEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc) this.engineOsc.stop();
      if (this.engineOsc2) this.engineOsc2.stop();
    } catch {
      // ignore
    }
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.isEngineRunning = false;
  }

  public startPoliceSiren() {
    if (!this.ctx || !this.sfxGain || this.sirenOsc) return;
    this.resume();
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    this.sirenGain.connect(this.sfxGain);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

    // LFO modulation for wail
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.5, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenOsc.start();
    lfo.start();
  }

  public stopPoliceSiren() {
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
      } catch {
        // ignore
      }
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  public playCashPickup() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.25, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.12);
    });
  }

  public playMissionFanfare(success: boolean) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = success ? [440, 554.37, 659.25, 880] : [392, 349.23, 311.13, 261.63];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0.3, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.4);
    });
  }

  public playRadioBeat(stationIndex: number) {
    this.currentStationIndex = stationIndex;
    if (this.radioInterval) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    if (stationIndex === 0) return; // Radio OFF

    // Procedural musical synth loop based on station style
    let step = 0;
    const bpm = stationIndex === 1 ? 124 : stationIndex === 2 ? 98 : stationIndex === 3 ? 140 : 85;
    const intervalMs = (60 / bpm / 2) * 1000;

    const synthChords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392], // C
      [196, 246.94, 293.66], // G
    ];

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      const beat = step % 16;
      const chordIdx = Math.floor(step / 4) % 4;

      // Kick drum on 0, 4, 8, 12
      if (beat % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        kickGain.gain.setValueAtTime(0.4, t);
        kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.13);
      }

      // Snare on beat 4, 12
      if (beat === 4 || beat === 12) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.1);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, t);
        const snareGain = this.ctx.createGain();
        snareGain.gain.setValueAtTime(0.2, t);
        snareGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        noise.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(this.musicGain);
        noise.start(t);
      }

      // Synth arpeggio
      if (stationIndex === 1 || stationIndex === 3) {
        const currentChord = synthChords[chordIdx];
        const noteFreq = currentChord[beat % currentChord.length];
        const synOsc = this.ctx.createOscillator();
        const synGain = this.ctx.createGain();
        synOsc.type = stationIndex === 1 ? 'sawtooth' : 'square';
        synOsc.frequency.setValueAtTime(noteFreq * (stationIndex === 1 ? 2 : 1), t);
        synGain.gain.setValueAtTime(0.12, t);
        synGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        synOsc.connect(synGain);
        synGain.connect(this.musicGain);
        synOsc.start(t);
        synOsc.stop(t + 0.16);
      }

      step++;
    }, intervalMs);
  }

  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  public startRain() {
    if (!this.ctx || !this.sfxGain || this.rainNode || this.isMuted) return;
    this.resume();

    const buffer = this.createNoiseBuffer(3.0);
    this.rainNode = this.ctx.createBufferSource();
    this.rainNode.buffer = buffer;
    this.rainNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    this.rainNode.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.sfxGain);

    this.rainNode.start();
  }

  public stopRain() {
    if (this.rainNode) {
      try {
        this.rainNode.stop();
      } catch {
        // ignore
      }
      this.rainNode = null;
      this.rainGain = null;
    }
  }

  public playThunder(intensity: number = 1.0) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dur = 2.2;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // Sub-bass crack
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 1.2);
    oscGain.gain.setValueAtTime(0.7 * intensity, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.25);
  }

  public playFootstep(surface: 'concrete' | 'grass' | 'metal' = 'concrete') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.06);
    const filter = this.ctx.createBiquadFilter();
    
    if (surface === 'grass') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
    } else if (surface === 'metal') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, t);
    } else {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playShellCasingBounce() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2600 + Math.random() * 800, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.04);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playNitroBoost() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Turbine whoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.4);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.4);
    filter.Q.setValueAtTime(4, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playVehicleCrash(impactRatio: number = 1.0) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Metal crunch noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.35);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(1.0, 0.4 + impactRatio * 0.5), t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // Metal clatter osc
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  public playFallDamage() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Body impact thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);

    // Crunch crackle
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.12);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1600, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
  }

  public playHeartbeat() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Lub
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(75, t);
    osc1.frequency.exponentialRampToValueAtTime(35, t + 0.15);
    gain1.gain.setValueAtTime(0.6, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.16);

    // dub
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(65, t + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    gain2.gain.setValueAtTime(0.45, t + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t + 0.18);
    osc2.stop(t + 0.36);
  }

  public playHydrantBurst() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Metal snap pop
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(450, t);
    snapOsc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    snapGain.gain.setValueAtTime(0.6, t);
    snapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    snapOsc.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snapOsc.start(t);
    snapOsc.stop(t + 0.11);

    // Gushing high-pressure water spray
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(1400, t + 0.5);
    filter.frequency.linearRampToValueAtTime(750, t + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.02, t + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playPropCrash(materialType: 'metal' | 'wood' | 'glass' | 'concrete' = 'metal') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.4);
    const filter = this.ctx.createBiquadFilter();

    if (materialType === 'glass') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.linearRampToValueAtTime(4800, t + 0.35);
    } else if (materialType === 'wood') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, t);
      filter.frequency.exponentialRampToValueAtTime(180, t + 0.3);
    } else if (materialType === 'concrete') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.4);
    } else {
      // metal
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(320, t + 0.35);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // Impact thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = materialType === 'glass' ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(materialType === 'glass' ? 2200 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playCarHorn(freq = 380) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.25, t); // Major third harmonic

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.setValueAtTime(0.12, t + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.38);
    osc2.stop(t + 0.38);
  }

  public playDistantSiren() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);

    osc.type = 'sine';
    
    // Distant mellow ambient wailing siren
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.linearRampToValueAtTime(620, t + 1.2);
    osc.frequency.linearRampToValueAtTime(420, t + 2.4);

    gain.gain.setValueAtTime(0.02, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 2.6);
  }

  public playExplosionSound(posDistance = 1.0) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const vol = Math.max(0.2, Math.min(1.0, 1.0 / posDistance));

    // Bass boom
    const bass = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(140, t);
    bass.frequency.exponentialRampToValueAtTime(25, t + 1.2);
    bassGain.gain.setValueAtTime(0.9 * vol, t);
    bassGain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
    bass.connect(bassGain);
    bassGain.connect(this.sfxGain);
    bass.start(t);
    bass.stop(t + 1.3);

    // Fiery noise blast
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.0);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, t);
    filter.frequency.exponentialRampToValueAtTime(90, t + 1.0);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85 * vol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
  }

  public playDoorOpen(type: 'wood' | 'metal' | 'glass_auto' | 'vault' = 'wood') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    if (type === 'glass_auto') {
      // High-tech electric motor sliding whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(340, t + 0.15);
      osc.frequency.linearRampToValueAtTime(180, t + 0.7);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.76);
      return;
    }

    if (type === 'vault') {
      // Massive pneumatic release & heavy metallic latch rumble
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(1.2);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 1.2);
      filter.Q.setValueAtTime(3.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);

      // Low bass groan
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.linearRampToValueAtTime(45, t + 1.0);
      oscGain.gain.setValueAtTime(0.35, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 1.1);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 1.15);
      return;
    }

    if (type === 'metal') {
      // Heavy metal latch click and metallic hinge resonance
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.3);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);
      return;
    }

    // Default: Wood door creak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(240, t + 0.2);
    osc.frequency.linearRampToValueAtTime(150, t + 0.45);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  public playDoorClose(type: 'wood' | 'metal' | 'glass_auto' | 'vault' = 'wood') {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    if (type === 'glass_auto') {
      // Soft glide stop and subtle sensor lock
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.4);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.42);
      return;
    }

    if (type === 'vault') {
      // Heavy hydraulic slam & deadbolt locks engaging
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.52);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.4);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      noise.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(t);
      return;
    }

    if (type === 'metal') {
      // Solid metallic latch slam
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.26);
      return;
    }

    // Default: Wood door solid latch thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playDoorHandleTurn() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playDoorLockedRattle() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Double metallic jiggle
    [0, 0.09, 0.18].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t + offset);
      osc.frequency.exponentialRampToValueAtTime(190, t + offset + 0.06);
      gain.gain.setValueAtTime(0.25, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.07);
    });
  }

  public playKeycardSuccess() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // High-tech rising access granted electronic chime
    const tones = [987.77, 1318.51]; // B5, E6
    tones.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.09);
      gain.gain.setValueAtTime(0.25, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.2);
    });
  }

  public playKeycardDenied() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Low harsh double error buzz
    [0, 0.12].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t + offset);
      gain.gain.setValueAtTime(0.22, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.1);
    });
  }

  public playDoorKickBreach() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Heavy boot impact boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);

    // Explosive wood splinter crackle
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.5);
    filter.Q.setValueAtTime(2.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
  }

  public playDoorShatter() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // High frequency glass shattering burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.6);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3500, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.6);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
  }

  public playLockpicking() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Metallic tumbler pins clicking and tension wrench click
    [0, 0.14, 0.28, 0.42].forEach((offset, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200 + idx * 300, t + offset);
      osc.frequency.exponentialRampToValueAtTime(400, t + offset + 0.04);
      gain.gain.setValueAtTime(0.22, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.05);
    });
  }

  public playAccessCodeKeypad() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Rapid electronic DTMF cypher beeps followed by access chime
    const keypadFreqs = [1209, 1336, 1477, 1209, 1633];
    keypadFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.18, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.07);
    });

    // Final access granted chime
    setTimeout(() => {
      this.playKeycardSuccess();
    }, 450);
  }

  public playElevatorDing() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Classic rich two-tone elevator chime (F#5 -> C#5)
    const tones = [739.99, 554.37];
    tones.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.18);
      gain.gain.setValueAtTime(0.35, t + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.7);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + 0.75);
    });
  }

  public playGarageShutter(opening = true) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Industrial motorized chain gear hum
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(opening ? 90 : 130, t);
    osc.frequency.linearRampToValueAtTime(opening ? 140 : 80, t + 1.2);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.3);

    // Rolling slat rattle noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.2);
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(900, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);
  }

  public stopRadio() {
    if (this.radioInterval) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.ctx) throw new Error("No audio context");
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

export const soundEngine = new SoundEngine();
