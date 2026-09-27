import * as THREE from 'three';
import { soundEngine } from './audio';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  mesh?: THREE.Mesh | THREE.Points | THREE.Sprite;
  rotation?: number;
  rotationSpeed?: number;
  gravity?: number;
}

export interface ShellCasing {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
  bounces: number;
}

export interface SkidMark {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public scene: THREE.Scene;
  private particles: Particle[] = [];
  private shellCasings: ShellCasing[] = [];
  private skidMarks: SkidMark[] = [];
  
  // Rain particle system
  public isRaining: boolean = false;
  private rainCount = 1800;
  private rainGeometry!: THREE.BufferGeometry;
  private rainPositions!: Float32Array;
  private rainVelocities!: Float32Array;
  private rainLines!: THREE.LineSegments;
  private rainMaterial!: THREE.LineBasicMaterial;

  // Shared Geometries & Materials for high-performance instanced rendering
  private sparkGeo = new THREE.BufferGeometry();
  private shellGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6);
  private shellMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.2 });
  private smokeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.35, depthWrite: false });
  private fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85, depthWrite: false });
  private nitroMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.9, depthWrite: false });
  private waterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, depthWrite: false });

  // Dynamic Muzzle Flash Light
  public muzzleLight: THREE.PointLight;
  private muzzleLightTimer: number = 0;

  // Lightning Flash Light
  public lightningLight: THREE.DirectionalLight;
  private lightningTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Setup dynamic point light for gunfire illumination
    this.muzzleLight = new THREE.PointLight(0xf59e0b, 0, 18);
    this.scene.add(this.muzzleLight);

    // Setup lightning light
    this.lightningLight = new THREE.DirectionalLight(0xe0f2fe, 0);
    this.lightningLight.position.set(0, 300, 0);
    this.scene.add(this.lightningLight);

    this.initRain();
  }

  private initRain() {
    this.rainPositions = new Float32Array(this.rainCount * 6); // 2 vertices per line (start, end)
    this.rainVelocities = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = Math.random() * 80;
      const z = (Math.random() - 0.5) * 200;
      const len = 0.8 + Math.random() * 0.8;

      this.rainPositions[i * 6] = x;
      this.rainPositions[i * 6 + 1] = y;
      this.rainPositions[i * 6 + 2] = z;

      this.rainPositions[i * 6 + 3] = x - 0.1;
      this.rainPositions[i * 6 + 4] = y - len;
      this.rainPositions[i * 6 + 5] = z;

      this.rainVelocities[i] = 45 + Math.random() * 35;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    this.rainMaterial = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });

    this.rainLines = new THREE.LineSegments(this.rainGeometry, this.rainMaterial);
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
  }

  public setRaining(active: boolean) {
    this.isRaining = active;
    this.rainLines.visible = active;
    this.rainMaterial.opacity = active ? 0.45 : 0.0;
  }

  public triggerLightning() {
    this.lightningTimer = 0.25;
    this.lightningLight.intensity = 3.5;
    soundEngine.playThunder(0.8 + Math.random() * 0.4);
  }

  public emitMuzzleFlash(pos: THREE.Vector3, dir: THREE.Vector3) {
    this.muzzleLight.position.copy(pos).addScaledVector(dir, 0.4);
    this.muzzleLight.intensity = 5.0;
    this.muzzleLightTimer = 0.06;

    // Small starburst muzzle mesh
    const flashGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(pos).addScaledVector(dir, 0.3);
    flashMesh.scale.set(1.5, 0.8, 1.5);
    this.scene.add(flashMesh);

    this.particles.push({
      position: flashMesh.position,
      velocity: new THREE.Vector3(),
      life: 0.04,
      maxLife: 0.04,
      size: 0.12,
      color: new THREE.Color(0xfef08a),
      mesh: flashMesh,
    });
  }

  public ejectShellCasing(origin: THREE.Vector3, rightDir: THREE.Vector3, upDir: THREE.Vector3) {
    const mesh = new THREE.Mesh(this.shellGeo, this.shellMat);
    mesh.position.copy(origin);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    this.scene.add(mesh);

    // Eject velocity: right and slightly up + random spread
    const vel = rightDir.clone().multiplyScalar(2.8 + Math.random() * 1.5)
      .addScaledVector(upDir, 2.2 + Math.random() * 1.2)
      .add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8));

    const angVel = new THREE.Vector3(
      (Math.random() - 0.5) * 25,
      (Math.random() - 0.5) * 25,
      (Math.random() - 0.5) * 25
    );

    this.shellCasings.push({
      mesh,
      velocity: vel,
      angularVelocity: angVel,
      life: 4.0,
      bounces: 0,
    });
  }

  public emitImpactSparks(pos: THREE.Vector3, normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0), count: number = 8) {
    for (let i = 0; i < count; i++) {
      const sparkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
      sparkMesh.position.copy(pos);
      this.scene.add(sparkMesh);

      // Bounce outward along normal
      const vel = normal.clone().multiplyScalar(4 + Math.random() * 6)
        .add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6));

      this.particles.push({
        position: sparkMesh.position,
        velocity: vel,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.45,
        size: 0.04,
        color: new THREE.Color(0xfef08a),
        mesh: sparkMesh,
        gravity: 18,
      });
    }
  }

  public emitTireSmoke(pos: THREE.Vector3, count: number = 2) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 6, 6);
      const mesh = new THREE.Mesh(geo, this.smokeMat.clone());
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4));
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        0.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.5
      );

      this.particles.push({
        position: mesh.position,
        velocity: vel,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 0.35,
        color: new THREE.Color(0xcccccc),
        mesh,
      });
    }
  }

  public emitNitroFlame(leftExhaust: THREE.Vector3, rightExhaust: THREE.Vector3, backDir: THREE.Vector3) {
    [leftExhaust, rightExhaust].forEach((pos) => {
      const geo = new THREE.ConeGeometry(0.12, 0.7, 6);
      const mesh = new THREE.Mesh(geo, this.nitroMat.clone());
      mesh.position.copy(pos).addScaledVector(backDir, 0.35);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), backDir);
      this.scene.add(mesh);

      this.particles.push({
        position: mesh.position,
        velocity: backDir.clone().multiplyScalar(6),
        life: 0.08,
        maxLife: 0.08,
        size: 0.12,
        color: new THREE.Color(0x06b6d4),
        mesh,
      });
    });
  }

  public emitEngineDamageSmoke(enginePos: THREE.Vector3, isBurning: boolean) {
    const geo = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 6, 6);
    const mat = isBurning ? this.fireMat.clone() : this.smokeMat.clone();
    if (!isBurning) {
      (mat as THREE.MeshBasicMaterial).color.setHex(0x222222);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(enginePos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6));
    this.scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 1.2,
      2.0 + Math.random() * 2.5,
      (Math.random() - 0.5) * 1.2
    );

    this.particles.push({
      position: mesh.position,
      velocity: vel,
      life: 0.8 + Math.random() * 0.5,
      maxLife: 1.3,
      size: 0.4,
      color: isBurning ? new THREE.Color(0xf97316) : new THREE.Color(0x222222),
      mesh,
    });
  }

  public emitHydrantGeyser(pos: THREE.Vector3) {
    soundEngine.playHydrantBurst();
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.CylinderGeometry(0.2, 0.55, 1.6, 6);
      const mesh = new THREE.Mesh(geo, this.waterMat.clone());
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.8 + i * 1.4, (Math.random() - 0.5) * 0.6));
      this.scene.add(mesh);

      const vel = new THREE.Vector3((Math.random() - 0.5) * 3, 10 + Math.random() * 6, (Math.random() - 0.5) * 3);
      this.particles.push({
        position: mesh.position,
        velocity: vel,
        life: 0.65,
        maxLife: 0.65,
        size: 0.35,
        color: new THREE.Color(0x38bdf8),
        mesh,
        gravity: 24,
      });
    }
  }

  public emitSteam(pos: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.25, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4));
    this.scene.add(mesh);

    const vel = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4);
    this.particles.push({
      position: mesh.position,
      velocity: vel,
      life: 1.4 + Math.random() * 0.8,
      maxLife: 2.2,
      size: 0.4,
      color: new THREE.Color(0xe2e8f0),
      mesh,
    });
  }

  public emitWindDebris(pos: THREE.Vector3, windDir: THREE.Vector3 = new THREE.Vector3(1, 0, 0.5)) {
    const isLeaf = Math.random() > 0.5;
    const geo = new THREE.PlaneGeometry(0.18, 0.12);
    const colorHex = isLeaf ? (Math.random() > 0.5 ? 0x15803d : 0xd97706) : 0xf8fafc;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 8, 0.5 + Math.random() * 2, (Math.random() - 0.5) * 8));
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    this.scene.add(mesh);

    const vel = windDir.clone().multiplyScalar(4 + Math.random() * 3)
      .add(new THREE.Vector3(0, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2));

    this.particles.push({
      position: mesh.position,
      velocity: vel,
      life: 1.8 + Math.random() * 1.2,
      maxLife: 3.0,
      size: 0.15,
      color: new THREE.Color(colorHex),
      mesh,
      gravity: 1.5,
    });
  }

  public emitDestructionDebris(pos: THREE.Vector3, materialType: 'concrete' | 'metal' | 'wood' | 'glass' = 'metal', count = 12) {
    soundEngine.playPropCrash(materialType);
    let colorHex = 0x64748b;
    if (materialType === 'wood') colorHex = 0x78350f;
    if (materialType === 'glass') colorHex = 0x38bdf8;
    if (materialType === 'concrete') colorHex = 0x94a3b8;

    for (let i = 0; i < count; i++) {
      const size = 0.08 + Math.random() * 0.22;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: materialType === 'glass' ? 0.1 : 0.8,
        metalness: materialType === 'metal' ? 0.8 : 0.2,
        transparent: materialType === 'glass',
        opacity: materialType === 'glass' ? 0.7 : 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8));
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        3 + Math.random() * 8,
        (Math.random() - 0.5) * 10
      );

      this.particles.push({
        position: mesh.position,
        velocity: vel,
        life: 1.2 + Math.random() * 0.8,
        maxLife: 2.0,
        size,
        color: new THREE.Color(colorHex),
        mesh,
        gravity: 22,
      });
    }
  }

  public emitTireSparks(pos: THREE.Vector3, count = 4) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.05, (Math.random() - 0.5) * 0.2));
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        1.5 + Math.random() * 3,
        (Math.random() - 0.5) * 5
      );

      this.particles.push({
        position: mesh.position,
        velocity: vel,
        life: 0.2 + Math.random() * 0.15,
        maxLife: 0.35,
        size: 0.05,
        color: new THREE.Color(0xfef08a),
        mesh,
        gravity: 16,
      });
    }
  }

  public emitVehicleExplosion(pos: THREE.Vector3) {
    soundEngine.playExplosionSound(1.0);

    // 1. Fiery core fireball
    for (let i = 0; i < 18; i++) {
      const geo = new THREE.SphereGeometry(1.2 + Math.random() * 1.5, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xf97316 : 0xfef08a,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2));
      this.scene.add(mesh);

      const vel = new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 7, (Math.random() - 0.5) * 8);
      this.particles.push({
        position: mesh.position,
        velocity: vel,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 1.5,
        color: new THREE.Color(0xf97316),
        mesh,
      });
    }

    // 2. Black smoke plume rising
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.SphereGeometry(1.8 + Math.random() * 1.2, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.75, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3));
      this.scene.add(mesh);

      const vel = new THREE.Vector3((Math.random() - 0.5) * 3, 4 + Math.random() * 4, (Math.random() - 0.5) * 3);
      this.particles.push({
        position: mesh.position,
        velocity: vel,
        life: 1.8 + Math.random() * 1.2,
        maxLife: 3.0,
        size: 2.0,
        color: new THREE.Color(0x111827),
        mesh,
      });
    }

    // 3. Shrapnel chunks
    this.emitDestructionDebris(pos, 'metal', 16);
  }

  public emitWaterRipple(pos: THREE.Vector3) {
    const geo = new THREE.RingGeometry(0.1, 0.25, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.04, pos.z);
    this.scene.add(mesh);

    this.particles.push({
      position: mesh.position,
      velocity: new THREE.Vector3(),
      life: 0.5,
      maxLife: 0.5,
      size: 0.2,
      color: new THREE.Color(0xbae6fd),
      mesh,
    });
  }

  public addSkidMark(pos: THREE.Vector3, heading: number, width: number = 0.3) {
    // Only spawn skidmark every few frames to preserve performance
    if (this.skidMarks.length > 80) {
      const oldest = this.skidMarks.shift();
      if (oldest) this.scene.remove(oldest.mesh);
    }

    const geo = new THREE.PlaneGeometry(width, 0.9);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x090d16,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -heading;
    mesh.position.set(pos.x, 0.02, pos.z);
    this.scene.add(mesh);

    this.skidMarks.push({
      mesh,
      life: 14.0,
      maxLife: 14.0,
    });
  }

  public update(delta: number, focusPos?: THREE.Vector3) {
    // 1. Muzzle light decay
    if (this.muzzleLightTimer > 0) {
      this.muzzleLightTimer -= delta;
      if (this.muzzleLightTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    // 2. Lightning decay
    if (this.lightningTimer > 0) {
      this.lightningTimer -= delta;
      this.lightningLight.intensity = THREE.MathUtils.lerp(this.lightningLight.intensity, 0, delta * 12);
      if (this.lightningTimer <= 0) {
        this.lightningLight.intensity = 0;
      }
    }

    // 3. Update Rain Particle Positions around Camera / Player
    if (this.isRaining && this.rainPositions) {
      const posAttr = this.rainGeometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      const fx = focusPos ? focusPos.x : 0;
      const fz = focusPos ? focusPos.z : 0;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        let y = array[idx + 1] - this.rainVelocities[i] * delta;
        const len = 1.0;

        // Wrap around player / focus
        if (y < 0) {
          y = 50 + Math.random() * 20;
          const rx = fx + (Math.random() - 0.5) * 160;
          const rz = fz + (Math.random() - 0.5) * 160;
          array[idx] = rx;
          array[idx + 2] = rz;
          array[idx + 3] = rx - 0.1;
          array[idx + 5] = rz;
        }

        array[idx + 1] = y;
        array[idx + 4] = y - len;
      }
      posAttr.needsUpdate = true;
    }

    // 4. Update Shell Casings (Physics + Ground Bounce)
    for (let i = this.shellCasings.length - 1; i >= 0; i--) {
      const s = this.shellCasings[i];
      s.life -= delta;
      s.velocity.y -= 22 * delta; // Gravity

      s.mesh.position.addScaledVector(s.velocity, delta);
      s.mesh.rotation.x += s.angularVelocity.x * delta;
      s.mesh.rotation.y += s.angularVelocity.y * delta;
      s.mesh.rotation.z += s.angularVelocity.z * delta;

      // Ground bounce
      if (s.mesh.position.y <= 0.03) {
        s.mesh.position.y = 0.03;
        s.velocity.y = -s.velocity.y * 0.45;
        s.velocity.x *= 0.65;
        s.velocity.z *= 0.65;
        s.angularVelocity.multiplyScalar(0.5);

        if (s.bounces === 0 && Math.abs(s.velocity.y) > 0.8) {
          soundEngine.playShellCasingBounce();
        }
        s.bounces++;
      }

      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shellCasings.splice(i, 1);
      }
    }

    // 5. Update Standard Particles (Smoke, Sparks, Fire, Hydrant)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.gravity) {
        p.velocity.y -= p.gravity * delta;
      }
      p.position.addScaledVector(p.velocity, delta);

      if (p.mesh) {
        p.mesh.position.copy(p.position);
        const progress = 1 - p.life / p.maxLife;

        // Scale & Opacity curves
        const scale = p.size * (1 + progress * 1.5);
        p.mesh.scale.set(scale, scale, scale);

        const mat = (p.mesh as THREE.Mesh).material as THREE.Material;
        if (mat && 'opacity' in mat) {
          mat.opacity = (1 - progress) * 0.8;
        }
      }

      if (p.life <= 0) {
        if (p.mesh) this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // 6. Update Skid Marks Fade
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const sm = this.skidMarks[i];
      sm.life -= delta;
      const mat = (sm.mesh.material as THREE.MeshBasicMaterial);
      mat.opacity = (sm.life / sm.maxLife) * 0.65;

      if (sm.life <= 0) {
        this.scene.remove(sm.mesh);
        this.skidMarks.splice(i, 1);
      }
    }
  }

  public clearAll() {
    this.particles.forEach((p) => p.mesh && this.scene.remove(p.mesh));
    this.shellCasings.forEach((s) => this.scene.remove(s.mesh));
    this.skidMarks.forEach((sm) => this.scene.remove(sm.mesh));
    this.particles = [];
    this.shellCasings = [];
    this.skidMarks = [];
  }
}
