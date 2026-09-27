import * as THREE from 'three';
import { soundEngine } from './audio';
import { ParticleSystem } from './particles';

export type WeatherPreset = 'day' | 'sunset' | 'night' | 'storm' | 'foggy' | 'overcast';

export interface WeatherConfig {
  name: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  ambientIntensity: number;
  isRain: boolean;
  isStorm: boolean;
  targetWetness: number; // 0 to 1
  windSpeed: number;
}

export const WEATHER_PRESETS: Record<WeatherPreset, WeatherConfig> = {
  day: {
    name: 'Clear Day',
    skyColor: 0x38bdf8,
    fogColor: 0xbae6fd,
    fogDensity: 0.0006,
    sunColor: 0xffedd5,
    sunIntensity: 2.2,
    hemiSkyColor: 0xffffff,
    hemiGroundColor: 0x64748b,
    hemiIntensity: 1.2,
    ambientIntensity: 0.85,
    isRain: false,
    isStorm: false,
    targetWetness: 0.0,
    windSpeed: 2.0,
  },
  sunset: {
    name: 'Golden Sunset',
    skyColor: 0x7c2d12,
    fogColor: 0xf97316,
    fogDensity: 0.0011,
    sunColor: 0xfb923c,
    sunIntensity: 2.6,
    hemiSkyColor: 0xfde047,
    hemiGroundColor: 0x431407,
    hemiIntensity: 1.3,
    ambientIntensity: 0.7,
    isRain: false,
    isStorm: false,
    targetWetness: 0.05,
    windSpeed: 3.5,
  },
  night: {
    name: 'Cyber Night',
    skyColor: 0x070b14,
    fogColor: 0x0c1222,
    fogDensity: 0.0012,
    sunColor: 0x60a5fa,
    sunIntensity: 0.8,
    hemiSkyColor: 0x38bdf8,
    hemiGroundColor: 0x0f172a,
    hemiIntensity: 0.65,
    ambientIntensity: 0.45,
    isRain: false,
    isStorm: false,
    targetWetness: 0.1,
    windSpeed: 2.5,
  },
  foggy: {
    name: 'Rolling Fog',
    skyColor: 0x475569,
    fogColor: 0x64748b,
    fogDensity: 0.0035,
    sunColor: 0xe2e8f0,
    sunIntensity: 0.9,
    hemiSkyColor: 0x94a3b8,
    hemiGroundColor: 0x334155,
    hemiIntensity: 0.8,
    ambientIntensity: 0.6,
    isRain: false,
    isStorm: false,
    targetWetness: 0.3,
    windSpeed: 1.5,
  },
  overcast: {
    name: 'Overcast Skies',
    skyColor: 0x334155,
    fogColor: 0x475569,
    fogDensity: 0.0014,
    sunColor: 0xcfd8dc,
    sunIntensity: 1.1,
    hemiSkyColor: 0x94a3b8,
    hemiGroundColor: 0x1e293b,
    hemiIntensity: 0.9,
    ambientIntensity: 0.65,
    isRain: false,
    isStorm: false,
    targetWetness: 0.15,
    windSpeed: 4.0,
  },
  storm: {
    name: 'Thunderstorm',
    skyColor: 0x050a14,
    fogColor: 0x0f172a,
    fogDensity: 0.0025,
    sunColor: 0x38bdf8,
    sunIntensity: 0.4,
    hemiSkyColor: 0x64748b,
    hemiGroundColor: 0x020617,
    hemiIntensity: 0.5,
    ambientIntensity: 0.3,
    isRain: true,
    isStorm: true,
    targetWetness: 1.0, // Maximum mirror reflection wetness
    windSpeed: 14.0,
  },
};

export class WeatherSystem {
  public scene: THREE.Scene;
  public currentPreset: WeatherPreset = 'night';
  public particles: ParticleSystem;
  
  // 24-Hour Day/Night Simulation
  public timeOfDay: number = 20.5; // 8:30 PM
  public timeScale: number = 0.04; // 1 real sec = ~0.04 in-game hrs (1 hr ~ 25 secs)
  public isTimePaused: boolean = false;

  // Scene Lights
  public sunLight!: THREE.DirectionalLight;
  public hemiLight!: THREE.HemisphereLight;
  public ambientLight!: THREE.AmbientLight;

  // Celestial Meshes
  public sunMesh!: THREE.Mesh;
  public moonMesh!: THREE.Mesh;
  public starField!: THREE.Points;
  public starMaterial!: THREE.PointsMaterial;

  // Road & Surface Wetness Multipliers
  public wetness: number = 0.1;
  public groundMeshes: THREE.Mesh[] = [];
  public roadMaterials: THREE.MeshStandardMaterial[] = [];

  // Wind & Ambient Timers
  public windDirection = new THREE.Vector3(1, 0, 0.4).normalize();
  private windDebrisTimer: number = 0;
  private steamTimer: number = 0;
  private lightningTimer: number = 0;
  private distantSirenTimer: number = 0;
  private targetConfig: WeatherConfig;

  // City Night Lighting state
  public isNightOrDusk: boolean = true;
  public onLightingChange?: (isNight: boolean) => void;

  constructor(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene;
    this.particles = particles;
    this.targetConfig = WEATHER_PRESETS.night;

    this.findOrInitLights();
    this.createCelestialBodies();
  }

  private findOrInitLights() {
    this.scene.children.forEach((c) => {
      if (c instanceof THREE.DirectionalLight && !this.sunLight) {
        this.sunLight = c;
      } else if (c instanceof THREE.HemisphereLight && !this.hemiLight) {
        this.hemiLight = c;
      } else if (c instanceof THREE.AmbientLight && !this.ambientLight) {
        this.ambientLight = c;
      }
    });

    if (!this.sunLight) {
      this.sunLight = new THREE.DirectionalLight(0x93c5fd, 1.8);
      this.sunLight.position.set(150, 200, 100);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 700;
      this.sunLight.shadow.camera.left = -350;
      this.sunLight.shadow.camera.right = 350;
      this.sunLight.shadow.camera.top = 350;
      this.sunLight.shadow.camera.bottom = -350;
      this.sunLight.shadow.bias = -0.0005;
      this.scene.add(this.sunLight);
    }
    if (!this.hemiLight) {
      this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.3);
      this.scene.add(this.hemiLight);
    }
    if (!this.ambientLight) {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      this.scene.add(this.ambientLight);
    }
  }

  private createCelestialBodies() {
    // 1. Sun Sphere with Corona
    const sunGeo = new THREE.SphereGeometry(18, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // 2. Moon Sphere with crater details
    const moonGeo = new THREE.SphereGeometry(14, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.4,
      roughness: 0.9,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // 3. Dynamic Starfield (2,000 twinkling night stars)
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      // Hemisphere dome distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.5; // Upper dome
      const r = 700 + Math.random() * 200;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 30;
      const z = r * Math.sin(phi) * Math.sin(theta);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this.starField = new THREE.Points(starGeo, this.starMaterial);
    this.scene.add(this.starField);
  }

  public registerRoadMaterial(mat: THREE.MeshStandardMaterial) {
    if (!this.roadMaterials.includes(mat)) {
      this.roadMaterials.push(mat);
    }
  }

  public registerGroundMesh(mesh: THREE.Mesh) {
    if (!this.groundMeshes.includes(mesh)) {
      this.groundMeshes.push(mesh);
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        this.registerRoadMaterial(mesh.material);
      }
    }
  }

  public setWeather(preset: WeatherPreset) {
    this.currentPreset = preset;
    this.targetConfig = WEATHER_PRESETS[preset];
    this.particles.setRaining(this.targetConfig.isRain);

    if (this.targetConfig.isRain) {
      soundEngine.startRain();
    } else {
      soundEngine.stopRain();
    }

    // Set time appropriate to preset if switching manually
    if (preset === 'day') this.timeOfDay = 12.0;
    else if (preset === 'sunset') this.timeOfDay = 18.5;
    else if (preset === 'night') this.timeOfDay = 22.0;
  }

  public cycleWeather(): WeatherPreset {
    const order: WeatherPreset[] = ['night', 'day', 'sunset', 'foggy', 'overcast', 'storm'];
    const currIdx = order.indexOf(this.currentPreset);
    const nextIdx = (currIdx + 1) % order.length;
    this.setWeather(order[nextIdx]);
    return this.currentPreset;
  }

  public advanceTime(hours: number) {
    this.timeOfDay = (this.timeOfDay + hours) % 24;
    if (this.timeOfDay < 0) this.timeOfDay += 24;
  }

  public setTimeOfDay(hours: number) {
    this.timeOfDay = hours % 24;
  }

  public getTimeString(): string {
    const hrs = Math.floor(this.timeOfDay);
    const mins = Math.floor((this.timeOfDay % 1) * 60);
    const hStr = hrs.toString().padStart(2, '0');
    const mStr = mins.toString().padStart(2, '0');
    return `${hStr}:${mStr}`;
  }

  public update(delta: number, focusPos: THREE.Vector3) {
    // 1. Advance Day/Night Cycle Clock
    if (!this.isTimePaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.timeScale) % 24;
    }

    // 2. Calculate Celestial Sun & Moon Orbital Trajectory
    // 0 hrs = midnight, 6 hrs = sunrise, 12 hrs = noon, 18 hrs = sunset
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const celestialRadius = 500;
    const sunX = focusPos.x + Math.cos(sunAngle) * celestialRadius;
    const sunY = Math.sin(sunAngle) * celestialRadius;
    const sunZ = focusPos.z + Math.sin(sunAngle * 0.5) * 150;

    const moonAngle = sunAngle + Math.PI;
    const moonX = focusPos.x + Math.cos(moonAngle) * celestialRadius;
    const moonY = Math.sin(moonAngle) * celestialRadius;
    const moonZ = focusPos.z + Math.sin(moonAngle * 0.5) * 150;

    this.sunMesh.position.set(sunX, Math.max(-50, sunY), sunZ);
    this.moonMesh.position.set(moonX, Math.max(-50, moonY), moonZ);
    this.starField.position.copy(focusPos);

    // Is it currently night/dusk?
    const isNightNow = this.timeOfDay < 5.8 || this.timeOfDay > 19.2;
    if (this.isNightOrDusk !== isNightNow) {
      this.isNightOrDusk = isNightNow;
      if (this.onLightingChange) {
        this.onLightingChange(isNightNow);
      }
    }

    // Starfield opacity based on solar elevation
    const starOpacity = THREE.MathUtils.clamp((10 - sunY) / 60, 0, 0.95);
    this.starMaterial.opacity = THREE.MathUtils.lerp(this.starMaterial.opacity, starOpacity, delta * 2.0);

    // 3. Blend Weather Preset and Time-of-Day Lighting
    const cfg = this.targetConfig;
    const isSunUp = sunY > 0;

    // Directional light tracks active celestial body (Sun by day, Moon by night)
    const activeLightPos = isSunUp ? this.sunMesh.position : this.moonMesh.position;
    this.sunLight.position.lerp(activeLightPos, delta * 2.0);

    // Compute ambient & directional intensity based on solar angle
    const sunElevationFactor = THREE.MathUtils.clamp(sunY / 300, -0.2, 1.0);
    const dayFactor = Math.max(0, sunElevationFactor);

    let currentSunIntensity = cfg.sunIntensity;
    let currentSunColor = cfg.sunColor;

    if (!isSunUp) {
      // Moonlight
      currentSunIntensity = 0.5;
      currentSunColor = 0x60a5fa;
    } else if (this.timeOfDay > 17.5 && this.timeOfDay < 20.0) {
      // Sunset glow
      currentSunIntensity = 2.4;
      currentSunColor = 0xf97316;
    } else if (this.timeOfDay > 5.5 && this.timeOfDay < 7.5) {
      // Sunrise rose glow
      currentSunIntensity = 1.8;
      currentSunColor = 0xfb7185;
    }

    // Smooth Sky Color Lerping
    const curSky = this.scene.background instanceof THREE.Color ? this.scene.background : new THREE.Color(0x070b14);
    let targetSkyColor = cfg.skyColor;
    if (this.currentPreset !== 'night' && !isNightNow) {
      if (this.timeOfDay > 18.0) targetSkyColor = 0x7c2d12;
      else if (this.timeOfDay < 7.0) targetSkyColor = 0x1e1b4b;
    }
    curSky.lerp(new THREE.Color(targetSkyColor), delta * 2.0);
    this.scene.background = curSky;

    // Smooth Fog Transitions
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(new THREE.Color(cfg.fogColor), delta * 2.0);
      this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, cfg.fogDensity, delta * 2.0);
    }

    // Light Intensity & Color Lerp
    this.sunLight.color.lerp(new THREE.Color(currentSunColor), delta * 2.0);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, currentSunIntensity, delta * 2.0);

    this.hemiLight.color.lerp(new THREE.Color(cfg.hemiSkyColor), delta * 2.0);
    this.hemiLight.groundColor.lerp(new THREE.Color(cfg.hemiGroundColor), delta * 2.0);
    this.hemiLight.intensity = THREE.MathUtils.lerp(this.hemiLight.intensity, cfg.hemiIntensity * (0.4 + dayFactor * 0.6), delta * 2.0);

    this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, cfg.ambientIntensity * (0.5 + dayFactor * 0.5), delta * 2.0);

    // 4. Wet-Road Reflections & Asphalt Sheen
    this.wetness = THREE.MathUtils.lerp(this.wetness, cfg.targetWetness, delta * 0.8);
    // When wetness is 1.0 (storm/rain): roughness drops to 0.12 (mirror asphalt reflections) and metalness rises to 0.85
    const dynamicRoughness = THREE.MathUtils.lerp(0.85, 0.12, this.wetness);
    const dynamicMetalness = THREE.MathUtils.lerp(0.15, 0.85, this.wetness);

    this.roadMaterials.forEach((mat) => {
      mat.roughness = dynamicRoughness;
      mat.metalness = dynamicMetalness;
    });

    // 5. Rain Ripple Effects on wet pavement
    if (cfg.isRain) {
      if (Math.random() < 0.35) {
        const rx = focusPos.x + (Math.random() - 0.5) * 30;
        const rz = focusPos.z + (Math.random() - 0.5) * 30;
        this.particles.emitWaterRipple(new THREE.Vector3(rx, 0, rz));
      }
    }

    // 6. Windblown Leaves & Paper Debris
    this.windDebrisTimer += delta;
    if (this.windDebrisTimer > 1.2 / Math.max(1, cfg.windSpeed * 0.4)) {
      this.windDebrisTimer = 0;
      this.particles.emitWindDebris(focusPos, this.windDirection);
    }

    // 7. Sewer Steam Ambient Clouds
    this.steamTimer += delta;
    if (this.steamTimer > 2.5) {
      this.steamTimer = 0;
      const sx = focusPos.x + (Math.random() - 0.5) * 60;
      const sz = focusPos.z + (Math.random() - 0.5) * 60;
      this.particles.emitSteam(new THREE.Vector3(sx, 0, sz));
    }

    // 8. Distant City Sirens (Atmosphere)
    this.distantSirenTimer += delta;
    if (this.distantSirenTimer > 75.0 + Math.random() * 45.0) {
      this.distantSirenTimer = 0;
      soundEngine.playDistantSiren();
    }

    // 9. Thunderstorm Lightning Bolts
    if (cfg.isStorm) {
      this.lightningTimer += delta;
      if (this.lightningTimer > 6.0 + Math.random() * 7.0) {
        this.lightningTimer = 0;
        this.particles.triggerLightning();
      }
    }

    // Update particles
    this.particles.update(delta, focusPos);
  }
}
