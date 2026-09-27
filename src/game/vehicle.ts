import * as THREE from 'three';
import { VehicleDef, VehicleType } from './types';
import { VEHICLES } from './constants';
import { soundEngine } from './audio';
import { WorldObject } from './world';
import { ParticleSystem } from './particles';

export class Vehicle {
  public id: string;
  public type: VehicleType;
  public def: VehicleDef;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public speed: number = 0;
  public heading: number = 0; // rotation Y
  public steeringAngle: number = 0;
  public health: number;
  public maxHealth: number;
  public isDestroyed: boolean = false;
  public isOccupied: boolean = false;
  public isPlayerDriven: boolean = false;
  public wheels: THREE.Mesh[] = [];
  public frontWheels: THREE.Mesh[] = [];
  
  // Dynamic Lights
  public headlightL!: THREE.SpotLight;
  public headlightR!: THREE.SpotLight;
  public headlightsActive: boolean = true;
  public taillightMatL?: THREE.MeshBasicMaterial;
  public taillightMatR?: THREE.MeshBasicMaterial;
  public sirenLightL?: THREE.PointLight;
  public sirenLightR?: THREE.PointLight;
  public sirenTimer: number = 0;
  
  // Real-life Speedometer & Engine telemetry
  public mph: number = 0;
  public rpm: number = 900;
  public gear: string = 'N';
  public suspensionPitch: number = 0;
  public suspensionRoll: number = 0;
  public driftIntensity: number = 0;
  
  public nitroActive: boolean = false;
  public nitroTime: number = 100; // max 100
  public rotorMesh?: THREE.Mesh;
  public isAirVehicle: boolean = false;
  public altitude: number = 0;
  public verticalSpeed: number = 0;
  public scene: THREE.Scene;

  // Jump Physics & Airborne Stunt Tracking
  public isAirborne: boolean = false;
  public verticalVelocity: number = 0;
  public jumpStartPos: THREE.Vector3 | null = null;
  public jumpAirTime: number = 0;
  public maxJumpY: number = 0;
  public rampLaunchCooldown: number = 0;
  public onStuntCompleted?: (stunt: {
    distance: number;
    height: number;
    airTime: number;
    tier: 'bronze' | 'silver' | 'gold' | 'legendary';
    tierLabel: string;
    reward: number;
  }) => void;

  // Exhaust positions for nitro particles
  public exhaustOffsetL = new THREE.Vector3(-0.6, 0.4, 2.3);
  public exhaustOffsetR = new THREE.Vector3(0.6, 0.4, 2.3);
  public engineHoodOffset = new THREE.Vector3(0, 0.9, -1.6);

  public get isDrifting(): boolean {
    return this.driftIntensity > 0.3;
  }

  public get isHeadlightsOn(): boolean {
    return this.headlightsActive;
  }

  public get telemetry() {
    return {
      mph: this.mph || Math.floor(Math.abs(this.speed) * 2.237),
      kmh: Math.floor(Math.abs(this.speed) * 3.6),
      gear: this.gear || 'N',
      rpm: this.rpm || 900,
      pitch: this.suspensionPitch || 0,
      roll: this.suspensionRoll || 0,
      drifting: this.isDrifting,
    };
  }

  constructor(scene: THREE.Scene, type: VehicleType, position: THREE.Vector3, heading: number = 0) {
    this.id = 'veh_' + Math.random().toString(36).substring(2, 9);
    this.type = type;
    this.def = VEHICLES[type] || VEHICLES.sports;
    this.scene = scene;
    this.position = position.clone();
    this.heading = heading;
    this.health = this.def.durability;
    this.maxHealth = this.def.durability;
    this.isAirVehicle = !!this.def.isAirVehicle;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    this.buildVehicleMesh();
    this.scene.add(this.mesh);
  }

  public toggleHeadlights(): boolean {
    this.headlightsActive = !this.headlightsActive;
    if (this.headlightL) this.headlightL.intensity = this.headlightsActive ? 3.0 : 0;
    if (this.headlightR) this.headlightR.intensity = this.headlightsActive ? 3.0 : 0;
    return this.headlightsActive;
  }

  private buildVehicleMesh() {
    if (this.type === 'helicopter') {
      this.buildHelicopterMesh();
    } else if (this.type === 'motorcycle') {
      this.buildMotorcycleMesh();
    } else {
      this.buildCarMesh();
    }
  }

  private buildCarMesh() {
    const isPolice = this.type === 'police';
    const isSuv = this.type === 'suv';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.def.color,
      metalness: 0.8,
      roughness: 0.25,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
    });
    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });

    const carLength = isSuv ? 5.4 : 4.6;
    const carWidth = isSuv ? 2.4 : 2.1;
    const carHeight = isSuv ? 1.4 : 0.85;

    this.exhaustOffsetL.set(-carWidth * 0.3, 0.4, carLength / 2 + 0.1);
    this.exhaustOffsetR.set(carWidth * 0.3, 0.4, carLength / 2 + 0.1);
    this.engineHoodOffset.set(0, 0.9, -carLength * 0.35);

    // Main Chassis
    const chassisGeo = new THREE.BoxGeometry(carWidth, carHeight, carLength);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.6 + carHeight / 2;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.mesh.add(chassis);

    // Cabin / Roof
    const cabinLength = isSuv ? 3.4 : 2.4;
    const cabinWidth = carWidth * 0.88;
    const cabinHeight = isSuv ? 1.1 : 0.75;
    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, chassis.position.y + carHeight / 2 + cabinHeight / 2 - 0.05, -0.2);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    // Aerodynamic Rear Spoiler for Supercar
    if (this.type === 'sports') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.9, 0.1, 0.5), blackTrimMat);
      wing.position.set(0, chassis.position.y + carHeight / 2 + 0.4, carLength / 2 - 0.3);
      this.mesh.add(wing);
    }

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const wheelRadius = isSuv ? 0.55 : 0.42;
    const wheelWidth = 0.35;

    const wheelOffsets = [
      { x: -carWidth / 2 - 0.05, z: -carLength / 2 + 0.9, isFront: true },
      { x: carWidth / 2 + 0.05, z: -carLength / 2 + 0.9, isFront: true },
      { x: -carWidth / 2 - 0.05, z: carLength / 2 - 0.9, isFront: false },
      { x: carWidth / 2 + 0.05, z: carLength / 2 - 0.9, isFront: false },
    ];

    wheelOffsets.forEach((w) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(w.x, wheelRadius, w.z);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16), wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth + 0.02, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      this.mesh.add(wheelGroup);
      this.wheels.push(tire);
      if (w.isFront) {
        this.frontWheels.push(wheelGroup as unknown as THREE.Mesh);
      }
    });

    // Headlights (Projected SpotLights)
    this.headlightL = new THREE.SpotLight(0xffffff, 3.0, 60, 0.45, 0.4);
    this.headlightL.position.set(-carWidth / 2 + 0.4, 0.8, -carLength / 2 - 0.1);
    this.headlightL.target.position.set(-carWidth / 2 + 0.4, 0.2, -carLength / 2 - 25);
    this.mesh.add(this.headlightL);
    this.mesh.add(this.headlightL.target);

    this.headlightR = new THREE.SpotLight(0xffffff, 3.0, 60, 0.45, 0.4);
    this.headlightR.position.set(carWidth / 2 - 0.4, 0.8, -carLength / 2 - 0.1);
    this.headlightR.target.position.set(carWidth / 2 - 0.4, 0.2, -carLength / 2 - 25);
    this.mesh.add(this.headlightR);
    this.mesh.add(this.headlightR.target);

    // Dynamic Tail / Brake Lights
    this.taillightMatL = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    this.taillightMatR = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });

    const tailGeo = new THREE.BoxGeometry(0.35, 0.14, 0.08);
    const tailMeshL = new THREE.Mesh(tailGeo, this.taillightMatL);
    tailMeshL.position.set(-carWidth / 2 + 0.35, 0.85, carLength / 2 + 0.02);
    this.mesh.add(tailMeshL);

    const tailMeshR = new THREE.Mesh(tailGeo, this.taillightMatR);
    tailMeshR.position.set(carWidth / 2 - 0.35, 0.85, carLength / 2 + 0.02);
    this.mesh.add(tailMeshR);

    // Police Siren Lightbar
    if (isPolice) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.4), blackTrimMat);
      bar.position.set(0, cabin.position.y + cabinHeight / 2 + 0.1, 0);
      this.mesh.add(bar);

      const redGlass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.35), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      redGlass.position.set(-0.4, cabin.position.y + cabinHeight / 2 + 0.1, 0);
      this.mesh.add(redGlass);

      const blueGlass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.35), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
      blueGlass.position.set(0.4, cabin.position.y + cabinHeight / 2 + 0.1, 0);
      this.mesh.add(blueGlass);

      this.sirenLightL = new THREE.PointLight(0xef4444, 2, 25);
      this.sirenLightL.position.set(-0.4, bar.position.y + 0.5, 0);
      this.mesh.add(this.sirenLightL);

      this.sirenLightR = new THREE.PointLight(0x3b82f6, 2, 25);
      this.sirenLightR.position.set(0.4, bar.position.y + 0.5, 0);
      this.mesh.add(this.sirenLightR);
    } else if (this.type === 'taxi') {
      const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.4), taxiSignMat);
      taxiSign.position.set(0, cabin.position.y + cabinHeight / 2 + 0.12, 0);
      this.mesh.add(taxiSign);
    }
  }

  private buildMotorcycleMesh() {
    const frameMat = new THREE.MeshStandardMaterial({ color: this.def.color, metalness: 0.9, roughness: 0.2 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });

    this.exhaustOffsetL.set(0, 0.4, 1.4);
    this.exhaustOffsetR.set(0, 0.4, 1.4);
    this.engineHoodOffset.set(0, 0.8, -0.6);

    // Bike body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 2.6), frameMat);
    body.position.y = 0.7;
    body.castShadow = true;
    this.mesh.add(body);

    // Front fork & Handlebars
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), blackMat);
    bar.position.set(0, 1.2, -0.7);
    this.mesh.add(bar);

    // 2 Wheels
    [-1.0, 1.0].forEach((z, i) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 16), blackMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.45, z);
      wheel.castShadow = true;
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });

    this.headlightL = new THREE.SpotLight(0xffffff, 3.5, 60, 0.5, 0.4);
    this.headlightL.position.set(0, 0.9, -1.3);
    this.headlightL.target.position.set(0, 0.2, -25);
    this.mesh.add(this.headlightL);
    this.mesh.add(this.headlightL.target);

    // Taillight
    this.taillightMatL = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), this.taillightMatL);
    tailMesh.position.set(0, 0.8, 1.32);
    this.mesh.add(tailMesh);
  }

  private buildHelicopterMesh() {
    const heliMat = new THREE.MeshStandardMaterial({ color: this.def.color, metalness: 0.8, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

    // Fuselage
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 5.0), heliMat);
    fuselage.position.y = 2.0;
    this.mesh.add(fuselage);

    // Cockpit Glass Bubble
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 12), glassMat);
    cockpit.position.set(0, 2.0, -2.2);
    cockpit.scale.set(0.9, 0.8, 1.3);
    this.mesh.add(cockpit);

    // Tail Boom
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 6.0, 8), darkMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 2.2, 4.8);
    this.mesh.add(tail);

    // Landing Skids
    const skidL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5), darkMat);
    skidL.rotation.x = Math.PI / 2;
    skidL.position.set(-1.2, 0.3, 0);
    this.mesh.add(skidL);

    const skidR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5), darkMat);
    skidR.rotation.x = Math.PI / 2;
    skidR.position.set(1.2, 0.3, 0);
    this.mesh.add(skidR);

    // Main Rotor Blades
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 3.2, 0);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 9.0), darkMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.05, 0.3), darkMat);
    rotorGroup.add(blade1);
    rotorGroup.add(blade2);
    this.mesh.add(rotorGroup);
    this.rotorMesh = rotorGroup as unknown as THREE.Mesh;
  }

  public update(
    delta: number,
    input?: { forward: boolean; backward: boolean; left: boolean; right: boolean; handbrake: boolean; nitro: boolean; ascend?: boolean; descend?: boolean },
    colliders: WorldObject[] = [],
    particles?: ParticleSystem
  ) {
    if (this.isDestroyed) return;

    // Siren flashing animation
    if (this.sirenLightL && this.sirenLightR) {
      this.sirenTimer += delta * 12;
      const redOn = Math.sin(this.sirenTimer) > 0;
      this.sirenLightL.intensity = redOn ? 3.5 : 0.1;
      this.sirenLightR.intensity = redOn ? 0.1 : 3.5;
    }

    if (this.isAirVehicle) {
      this.updateHelicopterPhysics(delta, input, colliders);
      return;
    }

    // Car / Bike Ground physics
    const accel = this.def.acceleration;
    const maxSpeed = this.def.maxSpeed * (this.nitroActive ? 1.45 : 1.0);
    const turnSpeed = this.def.handling;

    let isBraking = false;
    let isReversing = false;

    if (input && this.isPlayerDriven) {
      // Nitro Boost
      if (input.nitro && this.nitroTime > 5) {
        if (!this.nitroActive) soundEngine.playNitroBoost();
        this.nitroActive = true;
        this.nitroTime = Math.max(0, this.nitroTime - delta * 25);

        // Emit Nitro Flame Particles
        if (particles) {
          const backDir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
          const leftEx = this.position.clone().add(this.exhaustOffsetL.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading));
          const rightEx = this.position.clone().add(this.exhaustOffsetR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading));
          particles.emitNitroFlame(leftEx, rightEx, backDir);
        }
      } else {
        this.nitroActive = false;
        if (this.nitroTime < 100) this.nitroTime += delta * 10;
      }

      // Acceleration & Braking
      if (input.forward) {
        this.speed += accel * delta;
        if (this.speed > maxSpeed) this.speed = maxSpeed;
        this.suspensionPitch = THREE.MathUtils.lerp(this.suspensionPitch, this.nitroActive ? -0.06 : -0.03, delta * 6);
      } else if (input.backward) {
        if (this.speed > 0.5) {
          // Braking
          isBraking = true;
          this.speed = Math.max(0, this.speed - accel * 1.5 * delta);
          this.suspensionPitch = THREE.MathUtils.lerp(this.suspensionPitch, 0.05, delta * 10);
        } else {
          // Reversing
          isReversing = true;
          this.speed = Math.max(-maxSpeed * 0.4, this.speed - accel * 0.8 * delta);
          this.suspensionPitch = THREE.MathUtils.lerp(this.suspensionPitch, -0.02, delta * 5);
        }
      } else {
        // Natural friction coasting
        this.speed *= Math.pow(0.965, delta * 60);
        this.suspensionPitch = THREE.MathUtils.lerp(this.suspensionPitch, 0, delta * 4);
      }

      // Steering & Suspension Roll
      const steerDirection = (this.speed >= 0 ? 1 : -1);
      if (input.left) {
        this.heading += turnSpeed * steerDirection * (Math.abs(this.speed) / maxSpeed) * delta;
        this.steeringAngle = Math.max(this.steeringAngle - delta * 4, -0.45);
        this.suspensionRoll = THREE.MathUtils.lerp(this.suspensionRoll, 0.06 * (Math.abs(this.speed) / maxSpeed), delta * 8);
      } else if (input.right) {
        this.heading -= turnSpeed * steerDirection * (Math.abs(this.speed) / maxSpeed) * delta;
        this.steeringAngle = Math.min(this.steeringAngle + delta * 4, 0.45);
        this.suspensionRoll = THREE.MathUtils.lerp(this.suspensionRoll, -0.06 * (Math.abs(this.speed) / maxSpeed), delta * 8);
      } else {
        this.steeringAngle *= 0.8;
        this.suspensionRoll = THREE.MathUtils.lerp(this.suspensionRoll, 0, delta * 6);
      }

      // Handbrake drift & Skid marks
      if (input.handbrake) {
        isBraking = true;
        this.speed *= 0.94;
        const isTurning = input.left || input.right;
        if (Math.abs(this.speed) > 8 && isTurning) {
          this.heading += (input.left ? 1 : -1) * delta * 2.8;
          soundEngine.playTireScreech();
          this.driftIntensity = Math.min(1.0, this.driftIntensity + delta * 3);

          if (particles) {
            const leftTirePos = this.position.clone().add(new THREE.Vector3(-0.9, 0, 1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading));
            const rightTirePos = this.position.clone().add(new THREE.Vector3(0.9, 0, 1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading));
            particles.addSkidMark(leftTirePos, this.heading, 0.3);
            particles.addSkidMark(rightTirePos, this.heading, 0.3);
            particles.emitTireSmoke(leftTirePos, 1);
            particles.emitTireSmoke(rightTirePos, 1);
            particles.emitTireSparks(leftTirePos, 2);
            particles.emitTireSparks(rightTirePos, 2);
          }
        }
      } else {
        this.driftIntensity = Math.max(0, this.driftIntensity - delta * 2);
      }

      // Update Taillights/Brake light glow
      if (this.taillightMatL && this.taillightMatR) {
        if (isBraking || input.handbrake) {
          this.taillightMatL.color.setHex(0xef4444);
          this.taillightMatR.color.setHex(0xef4444);
        } else if (isReversing) {
          this.taillightMatL.color.setHex(0xffffff);
          this.taillightMatR.color.setHex(0xffffff);
        } else {
          this.taillightMatL.color.setHex(0x7f1d1d);
          this.taillightMatR.color.setHex(0x7f1d1d);
        }
      }

      // Telemetry Calculations (MPH, Gear, RPM)
      this.mph = Math.floor(Math.abs(this.speed) * 2.237);
      const speedRatio = Math.abs(this.speed) / this.def.maxSpeed;

      if (this.speed < -0.5) {
        this.gear = 'R';
        this.rpm = 1200 + Math.floor(Math.abs(this.speed) * 180);
      } else if (Math.abs(this.speed) < 0.8) {
        this.gear = 'N';
        this.rpm = input.forward ? 3200 : 900;
      } else {
        const gearIndex = Math.min(6, Math.max(1, Math.floor(speedRatio * 5.8) + 1));
        this.gear = gearIndex.toString();
        const gearFraction = (speedRatio * 6) % 1;
        this.rpm = Math.floor(1800 + gearFraction * 5200);
      }

      // Engine sound update
      soundEngine.updateVehicleEngine(speedRatio, input.forward || input.nitro);
    } else {
      this.speed *= 0.95;
      this.suspensionPitch = THREE.MathUtils.lerp(this.suspensionPitch, 0, delta * 4);
      this.suspensionRoll = THREE.MathUtils.lerp(this.suspensionRoll, 0, delta * 4);
    }

    // Engine Damage Smoke / Fire
    if (particles && this.health < this.maxHealth * 0.4 && !this.isDestroyed) {
      const hoodPos = this.position.clone().add(this.engineHoodOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading));
      const isBurning = this.health < this.maxHealth * 0.2;
      particles.emitEngineDamageSmoke(hoodPos, isBurning);
    }

    // Apply movement along heading
    const forwardX = -Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);

    const vehRadius = this.type === 'motorcycle' ? 1.0 : this.type === 'suv' ? 2.2 : 1.8;
    const vehHeight = this.type === 'suv' ? 2.2 : 1.6;

    if (this.rampLaunchCooldown > 0) {
      this.rampLaunchCooldown -= delta;
    }

    // Check Ramp Interaction (Driving onto incline and launching)
    let onRampSurface = false;
    for (const obj of colliders) {
      if (obj.type !== 'ramp') continue;
      const c = obj.collider;
      const vehX = this.position.x;
      const vehZ = this.position.z;

      if (vehX >= c.minX && vehX <= c.maxX && vehZ >= c.minZ && vehZ <= c.maxZ) {
        const rampRot = obj.rampRot || 0;
        const rampLength = obj.rampLength || 16;
        const rampHeight = obj.rampHeight || 4.5;
        const rampHalfW = obj.rampHalfWidth || 5;

        // Transform car into ramp local coordinates
        const dx = vehX - obj.mesh.position.x;
        const dz = vehZ - obj.mesh.position.z;
        const cosR = Math.cos(-rampRot);
        const sinR = Math.sin(-rampRot);
        const localX = dx * cosR - dz * sinR;
        const localZ = dx * sinR + dz * cosR;

        if (Math.abs(localX) <= rampHalfW + 1.2 && localZ >= -rampLength / 2 - 1.0 && localZ <= rampLength / 2 + 2.5) {
          onRampSurface = true;
          // Ramp goes from localZ = +rampLength/2 (base, y=0) to localZ = -rampLength/2 (apex, y=rampHeight)
          const inclineT = Math.max(0, Math.min(1, (rampLength / 2 - localZ) / rampLength));
          const rampSurfaceY = inclineT * rampHeight;

          if (this.position.y <= rampSurfaceY + 1.0) {
            this.position.y = THREE.MathUtils.lerp(this.position.y, rampSurfaceY, delta * 18);
            this.suspensionPitch = THREE.MathUtils.lerp(this.suspensionPitch, -(obj.rampAngle || 0.4), delta * 12);

            // Check if reaching apex at high forward speed -> LAUNCH!
            if (localZ <= -rampLength / 2 + 1.5 && this.speed > 6 && this.rampLaunchCooldown <= 0) {
              this.isAirborne = true;
              this.rampLaunchCooldown = 1.2;
              this.jumpStartPos = this.position.clone();
              this.jumpAirTime = 0;
              this.maxJumpY = this.position.y;
              const boostMult = obj.rampBoost || 1.4;
              this.verticalVelocity = Math.max(14, Math.abs(this.speed) * Math.sin(obj.rampAngle || 0.45) * 1.9 * boostMult + 6.0);
              
              soundEngine.playNitroBoost();
              if (particles) {
                particles.emitTireSparks(this.position, 14);
                particles.emitTireSmoke(this.position, 6);
              }
            }
          }
          break;
        }
      }
    }

    // Airborne Parabolic Flight Simulation & Stunt Distance Evaluation
    if (this.isAirborne || (!onRampSurface && this.position.y > 0.05)) {
      if (!this.isAirborne) {
        this.isAirborne = true;
        this.jumpStartPos = this.position.clone();
        this.jumpAirTime = 0;
        this.maxJumpY = this.position.y;
      }

      this.jumpAirTime += delta;
      // Gravity acceleration
      this.verticalVelocity -= 22.0 * delta;
      this.position.y += this.verticalVelocity * delta;
      this.maxJumpY = Math.max(this.maxJumpY, this.position.y);

      // In-air aerodynamic pitch and roll control
      this.suspensionPitch = THREE.MathUtils.lerp(
        this.suspensionPitch,
        this.verticalVelocity > 0 ? -0.18 : 0.22,
        delta * 3.5
      );

      if (input && this.isPlayerDriven) {
        if (input.forward) this.suspensionPitch += delta * 1.8;
        if (input.backward) this.suspensionPitch -= delta * 1.8;
        if (input.left) this.suspensionRoll += delta * 2.5;
        if (input.right) this.suspensionRoll -= delta * 2.5;
      }

      // Check Landing on Ground or elevated platform
      if (this.position.y <= 0 && !onRampSurface) {
        this.position.y = 0;
        this.verticalVelocity = 0;
        this.suspensionPitch = 0.08; // Hard suspension compression dip

        // Calculate Jump Distance and Stunt Evaluation
        if (this.jumpStartPos) {
          const jumpDist = Math.round(
            Math.hypot(this.position.x - this.jumpStartPos.x, this.position.z - this.jumpStartPos.z)
          );
          const jumpHeight = Math.round(this.maxJumpY);
          const airTime = this.jumpAirTime;

          // Stunt Threshold: Jump Distance >= 15m or (Height >= 4m & Airtime >= 0.55s)
          if (jumpDist >= 15 || (jumpHeight >= 4 && airTime >= 0.55)) {
            let stuntTier: 'bronze' | 'silver' | 'gold' | 'legendary' = 'bronze';
            let tierLabel = 'BRONZE STUNT JUMP';
            let reward = 500;

            if (jumpDist >= 75) {
              stuntTier = 'legendary';
              tierLabel = 'LEGENDARY MEGA STUNT';
              reward = 5000;
            } else if (jumpDist >= 50) {
              stuntTier = 'gold';
              tierLabel = 'INSANE GOLD STUNT';
              reward = 2500;
            } else if (jumpDist >= 30) {
              stuntTier = 'silver';
              tierLabel = 'SILVER STUNT JUMP';
              reward = 1000;
            }

            // Trigger Stunt Callback
            if (this.onStuntCompleted) {
              this.onStuntCompleted({
                distance: Math.max(jumpDist, 15),
                height: Math.max(jumpHeight, 3),
                airTime,
                tier: stuntTier,
                tierLabel,
                reward,
              });
            }

            soundEngine.playTireScreech();
            soundEngine.playVehicleCrash(0.4);

            if (particles) {
              particles.emitImpactSparks(this.position, new THREE.Vector3(0, 1, 0), 16);
              particles.emitTireSmoke(this.position, 8);
            }
          }
        }

        this.isAirborne = false;
        this.jumpStartPos = null;
        this.jumpAirTime = 0;
        this.maxJumpY = 0;
      }
    } else if (!onRampSurface) {
      this.position.y = 0;
      this.verticalVelocity = 0;
    }

    // Movement along X with building collision (skipping ramps and pickups)
    const nextX = this.position.x + forwardX * this.speed * delta;
    let hitX = false;
    for (const obj of colliders) {
      if (obj.type === 'pickup' || obj.type === 'ramp') continue;
      const c = obj.collider;
      if (this.position.y < c.maxY && this.position.y + vehHeight > c.minY) {
        if (
          nextX + vehRadius > c.minX &&
          nextX - vehRadius < c.maxX &&
          this.position.z + vehRadius > c.minZ &&
          this.position.z - vehRadius < c.maxZ
        ) {
          hitX = true;
          const impactSpeed = Math.abs(this.speed);
          if (obj.onHit && particles) {
            obj.onHit(new THREE.Vector3(forwardX * impactSpeed, 0, 0), particles);
          }
          if (obj.type === 'explosive_barrel') {
            this.takeDamage(120, particles);
            if (particles) particles.emitVehicleExplosion(obj.mesh.position);
            obj.isDead = true;
            this.scene.remove(obj.mesh);
          } else if (impactSpeed > 8) {
            this.takeDamage(Math.floor(impactSpeed * 0.8), particles);
            soundEngine.playVehicleCrash(impactSpeed / this.def.maxSpeed);
            if (particles) {
              particles.emitImpactSparks(new THREE.Vector3(nextX, 0.8, this.position.z), new THREE.Vector3(forwardX > 0 ? -1 : 1, 0, 0), 12);
            }
          }
          if (forwardX * this.speed > 0) {
            this.position.x = c.minX - vehRadius;
          } else {
            this.position.x = c.maxX + vehRadius;
          }
          this.speed *= -0.3; // Rebound bounce
          break;
        }
      }
    }
    if (!hitX) {
      this.position.x = nextX;
    }

    // Movement along Z with building collision (skipping ramps and pickups)
    const nextZ = this.position.z + forwardZ * this.speed * delta;
    let hitZ = false;
    for (const obj of colliders) {
      if (obj.type === 'pickup' || obj.type === 'ramp' || obj.isDead || obj.isDestroyed) continue;
      const c = obj.collider;
      if (this.position.y < c.maxY && this.position.y + vehHeight > c.minY) {
        if (
          this.position.x + vehRadius > c.minX &&
          this.position.x - vehRadius < c.maxX &&
          nextZ + vehRadius > c.minZ &&
          nextZ - vehRadius < c.maxZ
        ) {
          hitZ = true;
          const impactSpeed = Math.abs(this.speed);
          if (obj.onHit && particles) {
            obj.onHit(new THREE.Vector3(0, 0, forwardZ * impactSpeed), particles);
          }
          if (obj.type === 'explosive_barrel') {
            this.takeDamage(120, particles);
            if (particles) particles.emitVehicleExplosion(obj.mesh.position);
            obj.isDead = true;
            this.scene.remove(obj.mesh);
          } else if (impactSpeed > 8) {
            this.takeDamage(Math.floor(impactSpeed * 0.8), particles);
            soundEngine.playVehicleCrash(impactSpeed / this.def.maxSpeed);
            if (particles) {
              particles.emitImpactSparks(new THREE.Vector3(this.position.x, 0.8, nextZ), new THREE.Vector3(0, 0, forwardZ > 0 ? -1 : 1), 12);
            }
          }
          if (forwardZ * this.speed > 0) {
            this.position.z = c.minZ - vehRadius;
          } else {
            this.position.z = c.maxZ + vehRadius;
          }
          this.speed *= -0.3; // Rebound bounce
          break;
        }
      }
    }
    if (!hitZ) {
      this.position.z = nextZ;
    }

    // World bounds clamp
    this.position.x = Math.max(-550, Math.min(550, this.position.x));
    this.position.z = Math.max(-550, Math.min(550, this.position.z));

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.x = this.suspensionPitch;
    this.mesh.rotation.z = this.suspensionRoll;

    // Rotate wheels
    this.wheels.forEach((w) => {
      w.rotation.x += this.speed * delta * 2;
    });
    this.frontWheels.forEach((fw) => {
      fw.rotation.y = this.steeringAngle;
    });
  }

  private updateHelicopterPhysics(
    delta: number,
    input?: { forward: boolean; backward: boolean; left: boolean; right: boolean; handbrake: boolean; nitro: boolean; ascend?: boolean; descend?: boolean },
    colliders: WorldObject[] = []
  ) {
    if (this.rotorMesh) {
      this.rotorMesh.rotation.y += delta * 35;
    }

    if (input && this.isPlayerDriven) {
      // Altitude control
      if (input.ascend) {
        this.verticalSpeed = Math.min(this.verticalSpeed + delta * 15, 18);
      } else if (input.descend) {
        this.verticalSpeed = Math.max(this.verticalSpeed - delta * 15, -12);
      } else {
        this.verticalSpeed *= 0.95;
      }

      this.altitude = Math.max(0, Math.min(120, this.altitude + this.verticalSpeed * delta));
      this.position.y = this.altitude;

      // Heli Pitch & Forward motion
      if (input.forward) {
        this.speed = Math.min(this.speed + delta * 20, this.def.maxSpeed);
      } else if (input.backward) {
        this.speed = Math.max(this.speed - delta * 15, -15);
      } else {
        this.speed *= 0.97;
      }

      if (input.left) {
        this.heading += delta * 2.2;
      } else if (input.right) {
        this.heading -= delta * 2.2;
      }

      this.mph = Math.floor(Math.abs(this.speed) * 2.237);
      this.gear = 'AIR';
      this.rpm = 4500 + Math.floor(this.altitude * 20);

      const fX = -Math.sin(this.heading);
      const fZ = -Math.cos(this.heading);
      const nextX = this.position.x + fX * this.speed * delta;
      const nextZ = this.position.z + fZ * this.speed * delta;

      const heliRadius = 3.5;
      let hitHeli = false;
      for (const obj of colliders) {
        if (obj.type === 'pickup') continue;
        const c = obj.collider;
        if (this.position.y < c.maxY && this.position.y + 4.0 > c.minY) {
          if (
            nextX + heliRadius > c.minX &&
            nextX - heliRadius < c.maxX &&
            nextZ + heliRadius > c.minZ &&
            nextZ - heliRadius < c.maxZ
          ) {
            hitHeli = true;
            this.takeDamage(45);
            this.speed *= -0.4;
            break;
          }
        }
      }

      if (!hitHeli) {
        this.position.x = nextX;
        this.position.z = nextZ;
      }

      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.heading;
      this.mesh.rotation.z = (input.left ? 0.15 : input.right ? -0.15 : 0);
      this.mesh.rotation.x = (input.forward ? 0.2 : input.backward ? -0.1 : 0);
    }
  }

  public takeDamage(dmg: number, particles?: ParticleSystem) {
    if (this.isDestroyed) return;
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.explode(particles);
    }
  }

  public explode(particles?: ParticleSystem) {
    this.isDestroyed = true;
    if (particles) {
      particles.emitVehicleExplosion(this.position);
    } else {
      soundEngine.playExplosionSound(1.0);
    }
    // Turn mesh charred black
    this.mesh.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).color = new THREE.Color(0x18181b);
      }
    });
  }

  public repair() {
    this.health = this.maxHealth;
    this.isDestroyed = false;
    this.mesh.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).color = new THREE.Color(this.def.color);
      }
    });
  }
}
