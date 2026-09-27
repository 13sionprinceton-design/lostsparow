import * as THREE from 'three';
import { WorldGenerator } from './world';
import { Player } from './player';
import { Vehicle } from './vehicle';
import { AISystem } from './ai';
import { MissionManager } from './missions';
import { WeaponType, VehicleType, CameraMode } from './types';
import { WEAPONS, VEHICLES } from './constants';
import { soundEngine } from './audio';
import { ParticleSystem } from './particles';
import { WeatherSystem, WeatherPreset } from './weather';
import { Door, DoorSystem, KEYCARDS } from './doors';
import { InteriorManager, InteractiveProp } from './interiors';
import { StuntSystem } from './stunts';

export interface GameState {
  player: Player;
  world: WorldGenerator;
  ai: AISystem;
  missions: MissionManager;
  stuntSystem: StuntSystem;
  vehicles: Vehicle[];
  particles: ParticleSystem;
  weather: WeatherSystem;
  doorSystem: DoorSystem;
  interiors: InteriorManager;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  isPaused: boolean;
  isAimingSniper: boolean;
  radioStationIndex: number;
  cameraMode: CameraMode;
  currentInteractionPrompt: string | null;
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public world: WorldGenerator;
  public player!: Player;
  public ai: AISystem;
  public missions: MissionManager;
  public stuntSystem: StuntSystem = new StuntSystem();
  public vehicles: Vehicle[] = [];
  public particles: ParticleSystem;
  public weather: WeatherSystem;
  public doorSystem: DoorSystem;
  public interiors: InteriorManager;
  public currentInteractionPrompt: string | null = null;

  // Camera & Perspective Modes
  public cameraMode: CameraMode = 'third_person';

  // Input states
  public keys: Record<string, boolean> = {};
  public mouse = { x: 0, y: 0, isDown: false, isRightDown: false };
  public cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  public cameraDistance = 4.8;
  public cameraHeight = 2.2;
  public aimRaycaster = new THREE.Raycaster();
  public aimTargetPoint = new THREE.Vector3(0, 0, -50);

  // Performance loop
  private lastTime: number = 0;
  private animFrameId: number | null = null;
  private container: HTMLElement;
  public isRunning: boolean = false;
  public isPointerLocked: boolean = false;
  public onStateChange?: () => void;

  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();

    const initialW = container.clientWidth > 0 ? container.clientWidth : (window.innerWidth || 1280);
    const initialH = container.clientHeight > 0 ? container.clientHeight : (window.innerHeight || 720);

    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      initialW / Math.max(initialH, 1),
      0.1,
      1500
    );
    this.camera.position.set(0, 5, 10);

    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(initialW, initialH);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.display = 'block';

    container.appendChild(this.renderer.domElement);

    // Graphic & Simulation Systems
    this.particles = new ParticleSystem(this.scene);
    this.weather = new WeatherSystem(this.scene, this.particles);
    this.world = new WorldGenerator(this.scene);
    this.doorSystem = new DoorSystem(this.scene);
    this.interiors = new InteriorManager(this.scene, this.doorSystem);
    this.ai = new AISystem(this.scene);
    this.missions = new MissionManager();

    this.initWorld();
    this.initInputListeners();

    // Attach ResizeObserver for zero-delay responsive rendering
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(container);
    }

    // Force initial render frame immediately
    this.handleResize();
    this.renderer.render(this.scene, this.camera);
  }

  private initWorld() {
    this.world.buildWorld();
    this.player = new Player(this.scene, this.camera, new THREE.Vector3(0, 0, 0));

    // Build fully furnished 3D building interiors & doors
    this.interiors.buildAllInteriors();
    this.doorSystem.registerAllColliders(this.world.colliders);
    this.world.colliders.push(...this.interiors.colliders);

    // Register road and ground materials for dynamic wetness & mirror reflections
    this.weather.registerGroundMesh(this.world.groundMesh);
    this.world.roadMaterials.forEach((m) => this.weather.registerRoadMaterial(m));

    // Spawn parked vehicles around city
    const carSpawns: { type: VehicleType; pos: THREE.Vector3; heading: number }[] = [
      { type: 'sports', pos: new THREE.Vector3(12, 0, 15), heading: 0 },
      { type: 'suv', pos: new THREE.Vector3(-15, 0, 20), heading: Math.PI / 2 },
      { type: 'taxi', pos: new THREE.Vector3(20, 0, -35), heading: 0 },
      { type: 'sedan', pos: new THREE.Vector3(-25, 0, 45), heading: Math.PI },
      { type: 'motorcycle', pos: new THREE.Vector3(25, 0, -10), heading: -Math.PI / 4 },
      { type: 'police', pos: new THREE.Vector3(-30, 0, -140), heading: Math.PI },
      { type: 'helicopter', pos: new THREE.Vector3(-220, 0, 200), heading: 0 }, // At Docks Helipad
    ];

    carSpawns.forEach((s) => {
      const v = new Vehicle(this.scene, s.type, s.pos, s.heading);
      this.attachVehicleStunts(v);
      this.vehicles.push(v);
    });

    this.ai.spawnInitialPopulation(this.world.roadWaypoints);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    soundEngine.init();
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private animate = (currentTime: number) => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private update(delta: number) {
    const input = {
      forward: !!this.keys['KeyW'] || !!this.keys['ArrowUp'],
      backward: !!this.keys['KeyS'] || !!this.keys['ArrowDown'],
      left: !!this.keys['KeyA'] || !!this.keys['ArrowLeft'],
      right: !!this.keys['KeyD'] || !!this.keys['ArrowRight'],
      sprint: !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'],
      crouch: !!this.keys['KeyC'] || !!this.keys['ControlLeft'],
      jump: !!this.keys['Space'],
      aim: this.mouse.isRightDown,
      shoot: this.mouse.isDown,
    };

    // Update Weather & Atmospheric Simulation
    this.weather.update(delta, this.player.position);

    // Update Physics Particle Engine (Muzzle flashes, casings, tire smoke, sparks)
    this.particles.update(delta);

    // Update Stunt System timers
    this.stuntSystem.update(delta);

    // Calculate crosshair aiming 3D intersection
    this.updateAimRay();

    // 1. Update Player or Vehicle with Solid Building Collisions & Particles
    if (this.player.inVehicle) {
      this.attachVehicleStunts(this.player.inVehicle);
      const vInput = {
        forward: input.forward,
        backward: input.backward,
        left: input.left,
        right: input.right,
        handbrake: input.jump,
        nitro: input.sprint,
        ascend: input.jump,
        descend: input.crouch,
      };
      this.player.inVehicle.update(delta, vInput, this.world.colliders, this.particles);
      this.player.position.copy(this.player.inVehicle.position);
    } else {
      this.player.update(delta, input, this.cameraEuler, this.aimTargetPoint, this.world.colliders);

      // Continuous firing for automatic weapons (SMG, Rifle)
      if (this.mouse.isDown && (this.player.currentWeapon === 'smg' || this.player.currentWeapon === 'rifle')) {
        this.player.shoot(this.aimTargetPoint, this.particles);
      }
    }

    // 1.5 Update World Lighting, Traffic Light Intersections & Aviation Beacons
    this.world.update(delta, this.weather.isNightOrDusk);

    // Update spawned vehicles with solid building collisions
    this.vehicles.forEach((v) => {
      if (v !== this.player.inVehicle) {
        v.update(delta, undefined, this.world.colliders, this.particles);
      }
    });

    // 2. Update AI, Traffic Fleet, Traffic Light Compliance, and Cops
    this.ai.update(
      delta,
      this.player,
      this.world.colliders,
      this.world.trafficLights,
      this.weather.isNightOrDusk,
      (killer, victim, weapon) => {
        this.missions.addKillFeed(killer, victim, weapon);
        this.missions.onEnemyEliminated((reward) => {
          this.player.cash += reward;
          this.player.stats.heistsCompleted++;
        });
      },
      this.doorSystem.doors,
      this.particles
    );

    // 2.5 Update Doors System (Handle animations, auto motion sensors, hinge swings)
    const npcPositions = this.ai.entities.map((e) => e.position);
    this.doorSystem.update(delta, this.player.position, npcPositions, this.particles);

    // Check Player Bullets vs Doors (Shooting doors deals damage and breaks them)
    for (const bullet of this.player.activeBullets) {
      if (bullet.isDead) continue;
      for (const door of this.doorSystem.doors) {
        if (door.state === 'broken') continue;
        const doorCenter = door.position.clone().add(new THREE.Vector3(0, 1.6, 0));
        if (bullet.position.distanceTo(doorCenter) < 1.8) {
          door.takeDamage(bullet.damage, this.particles, 'bullet');
          bullet.isDead = true;
          bullet.traveled = bullet.range + 1;
          this.particles.emitDestructionDebris(
            bullet.position,
            door.type === 'manual_wood' ? 'wood' : door.type === 'auto_glass' ? 'glass' : 'metal',
            8
          );
          break;
        }
      }
    }

    // Check Vehicle Ramming vs Doors
    const curVeh = this.player.inVehicle;
    if (curVeh && Math.abs(curVeh.speed) > 15) {
      for (const door of this.doorSystem.doors) {
        if (door.state === 'broken') continue;
        if (curVeh.position.distanceTo(door.position) < 3.8) {
          const ramDmg = Math.abs(curVeh.speed) * 8;
          door.takeDamage(ramDmg, this.particles, 'impact');
          soundEngine.playExplosion();
        }
      }
    }

    // 3. Update Camera Orbit & Follow
    this.updateCamera(delta);

    // 4. Update World Collisions & Pickups
    this.checkWorldInteractions(delta);

    // Calculate Dynamic Interaction Prompt for UI HUD
    this.updateInteractionPrompt();

    // 5. Update Active Missions & Progress
    this.missions.updateMissionStageProgress(this.player.position, (reward) => {
      this.player.cash += reward;
      this.player.stats.heistsCompleted++;
    });

    // Notify React state listeners periodically
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  private updateAimRay() {
    this.aimRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const hit = this.aimRaycaster.ray.intersectPlane(plane, target);
    if (hit) {
      this.aimTargetPoint.copy(target);
    } else {
      this.aimTargetPoint.copy(this.camera.position).addScaledVector(this.aimRaycaster.ray.direction, 80);
    }
  }

  public toggleCameraMode(): CameraMode {
    this.cameraMode = this.cameraMode === 'first_person' ? 'third_person' : 'first_person';
    this.player.isFirstPerson = this.cameraMode === 'first_person';
    this.missions.addChatMessage(
      'System',
      this.cameraMode === 'first_person' ? '📷 Switched to First-Person (FPS) Mode' : '📷 Switched to Third-Person (TPS) Mode',
      'system'
    );
    if (this.onStateChange) this.onStateChange();
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    this.player.isFirstPerson = mode === 'first_person';
    if (this.onStateChange) this.onStateChange();
  }

  private updateCamera(delta: number) {
    const targetPos = this.player.inVehicle ? this.player.inVehicle.position : this.player.position;

    if (this.player.inVehicle) {
      if (this.cameraMode === 'first_person') {
        // Vehicle First-Person Cockpit View
        const vehHeading = this.player.inVehicle.heading;
        const isAir = this.player.inVehicle.isAirVehicle;

        // Cockpit driver seat offset
        const seatOffset = isAir 
          ? new THREE.Vector3(0, 0.6, 0.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), vehHeading)
          : new THREE.Vector3(-0.35, 0.95, 0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), vehHeading);

        const camPos = targetPos.clone().add(seatOffset);
        this.camera.position.lerp(camPos, 0.85);

        // Cockpit camera rotation (vehicle heading + mouse pitch/look)
        this.camera.rotation.set(this.cameraEuler.x, this.cameraEuler.y, 0, 'YXZ');

        // Dynamic speed FOV
        const speedRatio = Math.abs(this.player.inVehicle.speed) / this.player.inVehicle.def.maxSpeed;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 75 + speedRatio * 18, delta * 8);
        this.camera.updateProjectionMatrix();
      } else {
        // Vehicle Third-Person Chase Camera
        const isAir = this.player.inVehicle.isAirVehicle;
        const chaseDist = isAir ? 18 : 8.5;
        const chaseHeight = isAir ? 6.5 : 3.4;
        const vehHeading = this.player.inVehicle.heading;

        const idealCamX = targetPos.x + Math.sin(vehHeading) * chaseDist;
        const idealCamZ = targetPos.z + Math.cos(vehHeading) * chaseDist;
        const idealCamY = targetPos.y + chaseHeight;

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, idealCamX, delta * 6);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, idealCamY, delta * 6);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, idealCamZ, delta * 6);

        const lookTarget = new THREE.Vector3(targetPos.x, targetPos.y + 1.5, targetPos.z);
        this.camera.lookAt(lookTarget);

        // High-speed dynamic FOV warp
        const speedRatio = Math.abs(this.player.inVehicle.speed) / this.player.inVehicle.def.maxSpeed;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 70 + speedRatio * 18, delta * 5);
        this.camera.updateProjectionMatrix();
      }
    } else {
      if (this.cameraMode === 'first_person') {
        // First-Person On-Foot Camera (Eye-Level FPS)
        const isSniperAim = this.player.isAiming && this.player.currentWeapon === 'sniper';
        const isRegularAim = this.player.isAiming;

        const eyeHeight = this.player.isCrouching ? 1.05 : 1.65;
        const forwardOffset = new THREE.Vector3(0, 0, -0.12).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraEuler.y);

        const camPos = new THREE.Vector3(
          targetPos.x + forwardOffset.x,
          targetPos.y + eyeHeight,
          targetPos.z + forwardOffset.z
        );

        this.camera.position.copy(camPos);
        this.camera.rotation.set(this.cameraEuler.x, this.cameraEuler.y, 0, 'YXZ');

        // FOV zoom for FPS iron sights / scopes
        const targetFov = isSniperAim ? 20 : isRegularAim ? 45 : 75;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 14);
        this.camera.updateProjectionMatrix();
      } else {
        // Third-person Character Orbit Camera
        const isSniperAim = this.player.isAiming && this.player.currentWeapon === 'sniper';
        const isRegularAim = this.player.isAiming;

        const currentDist = isSniperAim ? 0.2 : isRegularAim ? 2.4 : this.cameraDistance;
        const currentHeight = isRegularAim ? 1.8 : this.cameraHeight;
        const shoulderOffset = isRegularAim ? 0.7 : 0;

        // Calculate camera position based on rotation angles
        const rotY = this.cameraEuler.y;
        const rotX = this.cameraEuler.x;

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);

        const offsetX = (sinY * currentDist * cosX) + (cosY * shoulderOffset);
        const offsetZ = (cosY * currentDist * cosX) - (sinY * shoulderOffset);
        const offsetY = currentHeight + (sinX * currentDist);

        const targetCamPos = new THREE.Vector3(
          targetPos.x + offsetX,
          targetPos.y + offsetY,
          targetPos.z + offsetZ
        );

        this.camera.position.lerp(targetCamPos, 0.35);

        const lookTarget = new THREE.Vector3(
          targetPos.x + (cosY * shoulderOffset),
          targetPos.y + 1.6,
          targetPos.z - (sinY * shoulderOffset)
        );
        this.camera.lookAt(this.aimTargetPoint.clone().lerp(lookTarget, isRegularAim ? 0.1 : 0.4));

        // FOV zoom
        const targetFov = isSniperAim ? 25 : isRegularAim ? 50 : 70;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 12);
        this.camera.updateProjectionMatrix();
      }
    }
  }

  private checkWorldInteractions(delta: number) {
    const pPos = this.player.position;

    // 1. Pickups interaction (Cash, Armor, Health, Weapons)
    for (let i = this.world.pickups.length - 1; i >= 0; i--) {
      const p = this.world.pickups[i];
      p.mesh.rotation.y += delta * 2;

      const dist = pPos.distanceTo(p.mesh.position);
      if (dist < 3.5) {
        if (p.pickupType === 'cash') {
          const val = Number(p.pickupValue) || 1500;
          this.player.cash += val;
          this.missions.addChatMessage('Reward', `Collected Cash Drop: +$${val.toLocaleString()}`, 'system');
          soundEngine.playCashPickup();
        } else if (p.pickupType === 'armor') {
          this.player.armor = 100;
          this.missions.addChatMessage('Inventory', 'Body Armor Restored (100%)', 'system');
          soundEngine.playCashPickup();
        } else if (p.pickupType === 'health') {
          this.player.health = Math.min(100, this.player.health + 50);
          this.missions.addChatMessage('Inventory', 'Health Restored (+50 HP)', 'system');
          soundEngine.playCashPickup();
        } else if (p.pickupType === 'weapon' && typeof p.pickupValue === 'string') {
          const wKey = p.pickupValue as WeaponType;
          if (this.player.weapons[wKey]) {
            this.player.weapons[wKey].unlocked = true;
            this.player.weapons[wKey].reserveAmmo += 40;
            this.player.switchWeapon(wKey);
            this.missions.addChatMessage('Armory', `Unlocked Weapon: ${WEAPONS[wKey]?.name || wKey}`, 'system');
            soundEngine.playCashPickup();
          }
        }

        this.scene.remove(p.mesh);
        this.world.pickups.splice(i, 1);
      }
    }

    // 2. Pay 'n' Spray Garage (Repairs Car & Clears Wanted Level)
    const garageDist = Math.sqrt(
      Math.pow(pPos.x - this.world.payNSpray.x, 2) + Math.pow(pPos.z - this.world.payNSpray.z, 2)
    );
    if (garageDist < this.world.payNSpray.radius) {
      if (this.player.inVehicle && (this.player.wantedStars > 0 || this.player.inVehicle.health < this.player.inVehicle.maxHealth)) {
        this.player.inVehicle.repair();
        this.player.wantedStars = 0;
        this.player.wantedTimer = 0;
        soundEngine.stopPoliceSiren();
        soundEngine.playMissionFanfare(true);
        this.missions.addChatMessage('Pay \'n\' Spray', 'Vehicle Repaired & Wanted Level Wiped!', 'system');
      }
    }

    // 3. Explosive Barrels Check (Explode if shot)
    for (let i = this.world.explosiveBarrels.length - 1; i >= 0; i--) {
      const barrel = this.world.explosiveBarrels[i];
      if (barrel.isDead) continue;

      // Check if player bullets hit barrel
      this.player.activeBullets.forEach((b) => {
        if (b.position.distanceTo(barrel.mesh.position) < 2.0) {
          barrel.isDead = true;
          soundEngine.playExplosion();

          // Damage nearby entities & vehicles
          this.ai.entities.forEach((e) => {
            if (e.position.distanceTo(barrel.mesh.position) < 16) {
              e.health -= 180;
            }
          });
          this.vehicles.forEach((v) => {
            if (v.position.distanceTo(barrel.mesh.position) < 18) {
              v.takeDamage(300);
            }
          });

          this.scene.remove(barrel.mesh);
        }
      });
    }
  }

  public tryEnterNearestVehicle(): boolean {
    if (this.player.inVehicle) {
      this.player.exitVehicle();
      return true;
    }

    // Find nearest vehicle within 5m
    let closestVeh: Vehicle | null = null;
    let closestDist = 6.0;

    const allVehs = [...this.vehicles, ...this.ai.policeVehicles, ...this.ai.ambientTraffic.map((t) => t.vehicle)];
    allVehs.forEach((v) => {
      if (!v.isDestroyed) {
        const dist = this.player.position.distanceTo(v.position);
        if (dist < closestDist) {
          closestDist = dist;
          closestVeh = v;
        }
      }
    });

    if (closestVeh) {
      this.attachVehicleStunts(closestVeh);
      this.player.enterVehicle(closestVeh);
      return true;
    }

    return false;
  }

  public attachVehicleStunts(v: Vehicle) {
    if (!v.onStuntCompleted) {
      v.onStuntCompleted = (stunt) => {
        if (this.player.inVehicle === v) {
          this.stuntSystem.onStuntCompleted(stunt, this.player, this.missions);
        }
      };
    }
  }

  public spawnVehicle(type: VehicleType) {
    const pPos = this.player.position;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotationY);
    const spawnPos = new THREE.Vector3(
      pPos.x + forward.x * 6,
      0,
      pPos.z + forward.z * 6
    );

    const v = new Vehicle(this.scene, type, spawnPos, this.player.rotationY);
    this.attachVehicleStunts(v);
    this.vehicles.push(v);
    this.missions.addChatMessage('Delivery', `${v.def.name} delivered right in front of you!`, 'system');
    soundEngine.playCashPickup();
    return v;
  }

  public updateInteractionPrompt() {
    const pPos = this.player.position;

    // Check closest interactive prop (Safe, ATM, Vault Gold, Bunker Armory)
    const closestProp = this.interiors.getClosestInteractiveProp(pPos, 3.2);
    if (closestProp && !closestProp.isLooted) {
      this.currentInteractionPrompt = closestProp.promptText;
      return;
    }

    // Check closest door
    const closestDoor = this.doorSystem.getClosestDoor(pPos, 3.5);
    if (closestDoor) {
      if (closestDoor.state === 'broken') {
        this.currentInteractionPrompt = `${closestDoor.name} (Broken)`;
      } else if (closestDoor.isLocked) {
        const reqKey = closestDoor.requiredKeycard;
        const keyDef = reqKey ? KEYCARDS[reqKey] : null;
        const hasKey = reqKey && this.player.hasKeycard(reqKey);
        if (hasKey) {
          this.currentInteractionPrompt = `[E] Unlock with ${keyDef?.name || 'Keycard'} • [F] Kick Breach`;
        } else {
          this.currentInteractionPrompt = `🔒 Locked! Requires [${keyDef?.name || 'Keycard'}] • [F] Kick Breach`;
        }
      } else if (closestDoor.state === 'open' || closestDoor.state === 'opening') {
        this.currentInteractionPrompt = `[E] Close ${closestDoor.name}`;
      } else {
        this.currentInteractionPrompt = `[E] Open ${closestDoor.name} • [F] Kick Breach`;
      }
      return;
    }

    // Check closest vehicle
    if (!this.player.inVehicle) {
      let closestVeh: Vehicle | null = null;
      let minD = 5.0;
      const allVehs = [...this.vehicles, ...this.ai.policeVehicles, ...this.ai.ambientTraffic.map((t) => t.vehicle)];
      allVehs.forEach((v) => {
        if (!v.isDestroyed) {
          const d = pPos.distanceTo(v.position);
          if (d < minD) {
            minD = d;
            closestVeh = v;
          }
        }
      });
      if (closestVeh) {
        this.currentInteractionPrompt = `[F] Drive ${(closestVeh as Vehicle).def.name}`;
        return;
      }
    } else {
      this.currentInteractionPrompt = `[F] Exit Vehicle`;
      return;
    }

    this.currentInteractionPrompt = null;
  }

  public interactWithWorld() {
    const pPos = this.player.position;

    // 1. Check interactive props (ATMs, Safes, Vault Gold, Bunker Armory)
    const closestProp = this.interiors.getClosestInteractiveProp(pPos, 3.2);
    if (closestProp && !closestProp.isLooted) {
      closestProp.isLooted = true;
      if (closestProp.cashReward) {
        this.player.cash += closestProp.cashReward;
        this.missions.addChatMessage('Loot', `💰 Looted $${closestProp.cashReward.toLocaleString()} from ${closestProp.name}!`, 'system');
        soundEngine.playCashPickup();
      }
      if (closestProp.keycardReward) {
        this.player.addKeycard(closestProp.keycardReward);
        const card = KEYCARDS[closestProp.keycardReward];
        this.missions.addChatMessage('Keycard Acquired', `🔑 Obtained [${card?.name || closestProp.keycardReward}]!`, 'system');
        soundEngine.playKeycardSuccess();
      }
      if (closestProp.type === 'vault_gold') {
        // Robbing the bank vault triggers 4-Star police response!
        this.player.addWantedStars(4);
        this.missions.addChatMessage('ALARM', '🚨 BANK VAULT ALARM TRIGGERED! SWAT SQUADS DISPATCHED!', 'system');
      }
      return;
    }

    // 2. Check doors
    const closestDoor = this.doorSystem.getClosestDoor(pPos, 3.5);
    if (closestDoor) {
      const res = closestDoor.interact(this.player, this.particles);
      this.missions.addChatMessage('Door', res.message, 'system');
      return;
    }

    // 3. Check vehicle enter/exit
    this.tryEnterNearestVehicle();
  }

  public kickBreachNearestDoor() {
    const pPos = this.player.position;
    const closestDoor = this.doorSystem.getClosestDoor(pPos, 3.2);
    if (closestDoor) {
      const res = closestDoor.kickBreach(this.player, this.particles);
      this.missions.addChatMessage('Breach', res.message, 'system');
      return true;
    }
    return false;
  }

  private initInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Handle Key toggles
      if (e.code === 'KeyE') {
        this.interactWithWorld();
      } else if (e.code === 'KeyF' || e.code === 'Enter') {
        // If near door on foot, kick breach door; else vehicle enter/exit
        const pPos = this.player.position;
        const nearDoor = !this.player.inVehicle && this.doorSystem.getClosestDoor(pPos, 3.2);
        if (nearDoor) {
          this.kickBreachNearestDoor();
        } else {
          this.tryEnterNearestVehicle();
        }
      } else if (e.code === 'KeyK') {
        this.kickBreachNearestDoor();
      } else if (e.code === 'KeyV') {
        this.toggleCameraMode();
      } else if (e.code === 'KeyR') {
        this.player.reload();
      } else if (e.code === 'KeyI') {
        this.player.inspectWeapon();
      } else if (e.code === 'KeyL') {
        const on = this.player.toggleFlashlight();
        this.missions.addChatMessage('Tactical', on ? '🔦 Tactical Flashlight: ON' : '🔦 Tactical Flashlight: OFF', 'system');
      } else if (e.code === 'KeyT') {
        const preset = this.weather.cycleWeather();
        this.missions.addChatMessage('Atmosphere', `Weather shifted to: ${preset.toUpperCase()}`, 'system');
      } else if (e.code === 'KeyH') {
        if (this.player.inVehicle) {
          const on = this.player.inVehicle.toggleHeadlights();
          soundEngine.playCarHorn();
          this.missions.addChatMessage('Vehicle', on ? '💡 Headlights: HIGH BEAMS' : '💡 Headlights: OFF', 'system');
        }
      } else if (e.code === 'KeyM') {
        soundEngine.toggleMute();
      } else if (e.code === 'Digit1') this.player.switchWeapon('pistol');
      else if (e.code === 'Digit2') this.player.switchWeapon('smg');
      else if (e.code === 'Digit3') this.player.switchWeapon('rifle');
      else if (e.code === 'Digit4') this.player.switchWeapon('shotgun');
      else if (e.code === 'Digit5') this.player.switchWeapon('sniper');
      else if (e.code === 'Digit6') this.player.switchWeapon('rpg');
      else if (e.code === 'Digit7') this.player.switchWeapon('katana');
      else if (e.code === 'Digit8') this.player.switchWeapon('grenade');
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Pointer Lock & Mouse Look
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      soundEngine.init();
      soundEngine.resume();

      if (!this.isPointerLocked) {
        canvas.requestPointerLock();
      }

      if (e.button === 0) {
        this.mouse.isDown = true;
        // Single shot for pistols/shotgun/sniper/rpg
        this.player.shoot(this.aimTargetPoint, this.particles);
      } else if (e.button === 2) {
        this.mouse.isRightDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.isDown = false;
      if (e.button === 2) this.mouse.isRightDown = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        const sensitivity = this.player.isAiming ? 0.0012 : 0.0022;
        this.cameraEuler.y -= e.movementX * sensitivity;
        this.cameraEuler.x -= e.movementY * sensitivity;
        this.cameraEuler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraEuler.x));
      }
    });

    // Context menu prevent
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Window resize
    window.addEventListener('resize', () => {
      if (!this.container) return;
      this.camera.aspect = this.container.clientWidth / Math.max(this.container.clientHeight, 1);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  public handleResize() {
    if (!this.container) return;
    const w = this.container.clientWidth > 0 ? this.container.clientWidth : (window.innerWidth || 1280);
    const h = this.container.clientHeight > 0 ? this.container.clientHeight : (window.innerHeight || 720);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
