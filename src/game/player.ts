import * as THREE from 'three';
import { WeaponType, WeaponDef, PlayerStats } from './types';
import { WEAPONS } from './constants';
import { soundEngine } from './audio';
import { Vehicle } from './vehicle';
import { WorldObject } from './world';
import { ParticleSystem } from './particles';

export interface Bullet {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  damage: number;
  range: number;
  traveled: number;
  weaponType: WeaponType;
  mesh: THREE.Mesh;
  isExplosive?: boolean;
  isDead?: boolean;
}

export class Player {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public rotationY: number = 0;
  public velocity: THREE.Vector3 = new THREE.Vector3();

  // Character body parts for animation
  public torsoContainer!: THREE.Group;
  public torsoMesh!: THREE.Mesh;
  public vestMesh!: THREE.Mesh;
  public head!: THREE.Mesh;
  public visorMesh!: THREE.Mesh;
  public leftArm!: THREE.Mesh;
  public rightArm!: THREE.Mesh;
  public leftLeg!: THREE.Mesh;
  public rightLeg!: THREE.Mesh;
  public weaponMesh!: THREE.Group;
  public muzzleFlash!: THREE.PointLight;
  public flashlightLight!: THREE.SpotLight;
  public isFlashlightOn: boolean = false;

  // Real-life Stats & Status
  public isFirstPerson: boolean = false;
  public health: number = 100;
  public maxHealth: number = 100;
  public armor: number = 100;
  public maxArmor: number = 100;
  public keycards: Set<string> = new Set(['safehouse_key']);

  public hasKeycard(id: string): boolean {
    return this.keycards.has(id);
  }

  public addKeycard(id: string) {
    this.keycards.add(id);
  }

  public stamina: number = 100;
  public maxStamina: number = 100;
  public isExhausted: boolean = false;
  public cash: number = 15000;
  public wantedStars: number = 0;
  public wantedTimer: number = 0;
  public isEscapingPolice: boolean = false;
  public currentWeapon: WeaponType = 'pistol';
  public weapons: Record<WeaponType, { ammoInMag: number; reserveAmmo: number; unlocked: boolean }> = {
    pistol: { ammoInMag: 15, reserveAmmo: 90, unlocked: true },
    smg: { ammoInMag: 35, reserveAmmo: 210, unlocked: true },
    rifle: { ammoInMag: 30, reserveAmmo: 180, unlocked: false },
    shotgun: { ammoInMag: 8, reserveAmmo: 48, unlocked: false },
    sniper: { ammoInMag: 5, reserveAmmo: 25, unlocked: false },
    rpg: { ammoInMag: 1, reserveAmmo: 6, unlocked: false },
    katana: { ammoInMag: 1, reserveAmmo: 1, unlocked: true },
    grenade: { ammoInMag: 1, reserveAmmo: 5, unlocked: true },
  };

  // State flags
  public isAiming: boolean = false;
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;
  public isReloading: boolean = false;
  public isInspecting: boolean = false;
  public inspectTimer: number = 0;
  public readonly inspectDuration: number = 2.6;
  public reloadTimer: number = 0;
  public fireTimer: number = 0;
  public isGrounded: boolean = true;
  public inVehicle: Vehicle | null = null;
  public heartbeatTimer: number = 0;
  public stepTimer: number = 0;
  public stats: PlayerStats = {
    kills: 0,
    policeKills: 0,
    headshots: 0,
    deaths: 0,
    heistsCompleted: 0,
    cashEarned: 15000,
    distanceDrivenKm: 0,
    maxWantedStars: 0,
    stuntsCompleted: 0,
    longestJumpMeters: 0,
    stuntCashEarned: 0,
  };

  // Bullets & Projectiles
  public activeBullets: Bullet[] = [];
  private animTimer: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, initialPos = new THREE.Vector3(0, 0, 0)) {
    this.scene = scene;
    this.camera = camera;
    this.position = initialPos.clone();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.buildCharacterModel();
    this.setupFlashlight();
    this.scene.add(this.mesh);
  }

  private setupFlashlight() {
    this.flashlightLight = new THREE.SpotLight(0xffffff, 0, 50, 0.45, 0.3);
    this.flashlightLight.position.set(0, 1.4, 0);
    this.flashlightLight.target.position.set(0, 1.4, -20);
    this.mesh.add(this.flashlightLight);
    this.mesh.add(this.flashlightLight.target);
  }

  public toggleFlashlight(): boolean {
    this.isFlashlightOn = !this.isFlashlightOn;
    if (this.flashlightLight) {
      this.flashlightLight.intensity = this.isFlashlightOn ? 3.5 : 0;
    }
    soundEngine.playReload();
    return this.isFlashlightOn;
  }

  private buildCharacterModel() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.6 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.4, metalness: 0.3 });

    // Torso Container
    this.torsoContainer = new THREE.Group();
    this.torsoContainer.position.y = 1.35;
    this.mesh.add(this.torsoContainer);

    // Torso Mesh
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    this.torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
    this.torsoMesh.castShadow = true;
    this.torsoContainer.add(this.torsoMesh);

    // Tactical Vest on Torso
    const vestGeo = new THREE.BoxGeometry(0.75, 0.6, 0.45);
    this.vestMesh = new THREE.Mesh(vestGeo, vestMat);
    this.vestMesh.position.set(0, 0, 0);
    this.torsoContainer.add(this.vestMesh);

    // Head with Cyber Sunglasses
    const headGeo = new THREE.BoxGeometry(0.4, 0.45, 0.4);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.set(0, 0.68, 0);
    this.head.castShadow = true;
    this.torsoContainer.add(this.head);

    this.visorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xec4899 })
    );
    this.visorMesh.position.set(0, 0.05, 0.15);
    this.head.add(this.visorMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    this.leftArm = new THREE.Mesh(armGeo, jacketMat);
    this.leftArm.position.set(-0.48, 0.1, 0);
    this.leftArm.castShadow = true;
    this.torsoContainer.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, jacketMat);
    this.rightArm.position.set(0.48, 0.1, 0);
    this.rightArm.castShadow = true;
    this.torsoContainer.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.25, 0.9, 0.25);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.2, 0.45, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.2, 0.45, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    // Weapon Attachment to Right Arm
    this.weaponMesh = new THREE.Group();
    this.weaponMesh.position.set(0, -0.35, 0.3);
    this.rightArm.add(this.weaponMesh);
    this.updateWeaponModel();

    // Muzzle flash point light
    this.muzzleFlash = new THREE.PointLight(0xfef08a, 0, 8);
    this.muzzleFlash.position.set(0, 0, 0.8);
    this.weaponMesh.add(this.muzzleFlash);
  }

  public updateWeaponModel() {
    // Clear old weapon geometry
    while (this.weaponMesh.children.length > 1) {
      this.weaponMesh.remove(this.weaponMesh.children[1]);
    }

    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const neonMat = new THREE.MeshBasicMaterial({ color: WEAPONS[this.currentWeapon]?.color || 0x06b6d4 });

    if (this.currentWeapon === 'katana') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.1), neonMat);
      blade.position.set(0, 0.5, 0);
      this.weaponMesh.add(blade);
    } else if (this.currentWeapon === 'rpg') {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8), gunMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.2, 0.2);
      this.weaponMesh.add(tube);
    } else if (this.currentWeapon === 'sniper') {
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 1.6), gunMat);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), neonMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.15, 0);
      this.weaponMesh.add(barrel);
      this.weaponMesh.add(scope);
    } else {
      // Pistol, SMG, AR, Shotgun
      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.7), gunMat);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.6), neonMat);
      trim.position.set(0, 0.1, 0);
      this.weaponMesh.add(gunBody);
      this.weaponMesh.add(trim);
    }
  }

  public inspectWeapon() {
    if (this.inVehicle || this.isReloading) return;
    this.isInspecting = true;
    this.inspectTimer = this.inspectDuration;
    soundEngine.playInspect(this.currentWeapon);
  }

  public switchWeapon(type: WeaponType) {
    if (this.weapons[type]?.unlocked) {
      this.currentWeapon = type;
      this.isReloading = false;
      this.isInspecting = false;
      this.inspectTimer = 0;
      this.updateWeaponModel();
      soundEngine.playReload();
    }
  }

  public reload() {
    const wDef = WEAPONS[this.currentWeapon];
    const wState = this.weapons[this.currentWeapon];
    if (!wDef || !wState || this.isReloading) return;
    if (wState.ammoInMag >= wDef.magazineSize || wState.reserveAmmo <= 0) return;

    this.isReloading = true;
    this.isInspecting = false;
    this.inspectTimer = 0;
    this.reloadTimer = wDef.reloadTime;
    soundEngine.playReload();
  }

  public shoot(aimTargetPoint: THREE.Vector3, particles?: ParticleSystem): Bullet | null {
    if (this.inVehicle) return null;
    const wDef = WEAPONS[this.currentWeapon];
    const wState = this.weapons[this.currentWeapon];
    if (!wDef || !wState) return null;

    if (this.isReloading || this.fireTimer > 0) return null;

    this.isInspecting = false;
    this.inspectTimer = 0;

    if (wState.ammoInMag <= 0) {
      this.reload();
      return null;
    }

    // Deduct Ammo
    wState.ammoInMag--;
    this.fireTimer = 1 / wDef.fireRate;

    // Trigger Gun Sound
    soundEngine.playGunshot(this.currentWeapon);

    // Muzzle Flash
    this.muzzleFlash.intensity = 5;
    setTimeout(() => {
      if (this.muzzleFlash) this.muzzleFlash.intensity = 0;
    }, 50);

    // Calculate Fire Direction with spread
    const startPos = new THREE.Vector3();
    let dir = new THREE.Vector3();
    const rightVec = new THREE.Vector3(1, 0, 0);

    if (this.isFirstPerson) {
      // In first person, shoot directly from camera forward vector with razor precision
      this.camera.getWorldDirection(dir);
      dir.x += (Math.random() - 0.5) * (wDef.spread * 0.6);
      dir.y += (Math.random() - 0.5) * (wDef.spread * 0.6);
      dir.z += (Math.random() - 0.5) * (wDef.spread * 0.6);
      dir.normalize();

      startPos.copy(this.camera.position).addScaledVector(dir, 0.4);
      // Slight offset to match right-hand weapon view
      rightVec.applyQuaternion(this.camera.quaternion);
      startPos.addScaledVector(rightVec, 0.15);
      startPos.y -= 0.08;
    } else {
      this.weaponMesh.getWorldPosition(startPos);
      startPos.y += 0.1;

      dir = new THREE.Vector3().subVectors(aimTargetPoint, startPos).normalize();
      dir.x += (Math.random() - 0.5) * wDef.spread;
      dir.y += (Math.random() - 0.5) * wDef.spread;
      dir.z += (Math.random() - 0.5) * wDef.spread;
      dir.normalize();

      rightVec.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    }

    // Emit Real-Life Muzzle Flash and Eject Spent Brass Shell Casing
    if (particles && this.currentWeapon !== 'katana' && this.currentWeapon !== 'grenade') {
      particles.emitMuzzleFlash(startPos, dir);
      particles.ejectShellCasing(startPos, rightVec, new THREE.Vector3(0, 1, 0));
    }

    // Create 3D Tracer Bullet Mesh
    const bulletGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6);
    const bulletMat = new THREE.MeshBasicMaterial({ color: wDef.color });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    bulletMesh.position.copy(startPos);
    bulletMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(bulletMesh);

    const bullet: Bullet = {
      position: startPos,
      direction: dir,
      speed: wDef.bulletSpeed,
      damage: wDef.damage,
      range: wDef.range,
      traveled: 0,
      weaponType: this.currentWeapon,
      mesh: bulletMesh,
      isExplosive: !!wDef.isExplosive,
    };
    this.activeBullets.push(bullet);

    // If magazine empty, auto reload
    if (wState.ammoInMag === 0 && wState.reserveAmmo > 0) {
      this.reload();
    }

    return bullet;
  }

  public update(
    delta: number,
    input: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      sprint: boolean;
      crouch: boolean;
      jump: boolean;
      aim: boolean;
      shoot: boolean;
    },
    cameraEuler: THREE.Euler,
    aimPoint: THREE.Vector3,
    colliders: WorldObject[] = []
  ) {
    // If inside a vehicle, hide player mesh & let vehicle handle motion
    if (this.inVehicle) {
      this.mesh.visible = false;
      this.position.copy(this.inVehicle.position);
      this.stats.distanceDrivenKm += (Math.abs(this.inVehicle.speed) * delta) / 1000;
      return;
    }
    this.mesh.visible = true;

    // Handle Fire cooldown & Reloading timer
    if (this.fireTimer > 0) this.fireTimer -= delta;
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const wDef = WEAPONS[this.currentWeapon];
        const wState = this.weapons[this.currentWeapon];
        const needed = wDef.magazineSize - wState.ammoInMag;
        const take = Math.min(needed, wState.reserveAmmo);
        wState.ammoInMag += take;
        wState.reserveAmmo -= take;
      }
    }

    // Weapon inspection timer
    if (this.isInspecting) {
      this.inspectTimer -= delta;
      if (this.inspectTimer <= 0) {
        this.isInspecting = false;
        this.inspectTimer = 0;
      }
    }

    // Wanted stars decay / escape timer
    if (this.wantedStars > 0) {
      if (this.isEscapingPolice) {
        this.wantedTimer += delta;
        if (this.wantedTimer >= 18) {
          // Escaped police!
          this.wantedStars = Math.max(0, this.wantedStars - 1);
          this.wantedTimer = 0;
          if (this.wantedStars === 0) {
            soundEngine.stopPoliceSiren();
          }
        }
      }
    }

    // Real-Life Stamina & Exhaustion Mechanism
    const wantsSprint = input.sprint && !input.aim && !input.crouch && !this.isExhausted;
    if (wantsSprint && (input.forward || input.backward || input.left || input.right)) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - delta * 22);
      if (this.stamina <= 0) {
        this.isExhausted = true;
      }
    } else {
      this.isSprinting = false;
      this.stamina = Math.min(100, this.stamina + delta * 24);
      if (this.isExhausted && this.stamina > 30) {
        this.isExhausted = false;
      }
    }

    this.isAiming = input.aim;
    this.isCrouching = input.crouch;

    // Critical Health Heartbeat Pulse
    if (this.health > 0 && this.health <= 35) {
      this.heartbeatTimer += delta;
      const rate = this.health < 20 ? 0.75 : 1.1;
      if (this.heartbeatTimer >= rate) {
        this.heartbeatTimer = 0;
        soundEngine.playHeartbeat();
      }
    }

    // Character rotation towards camera look direction or aim
    this.rotationY = cameraEuler.y;
    this.mesh.rotation.y = this.rotationY;

    // Calculate movement vector relative to camera
    const moveDir = new THREE.Vector3();
    if (input.forward) moveDir.z -= 1;
    if (input.backward) moveDir.z += 1;
    if (input.left) moveDir.x -= 1;
    if (input.right) moveDir.x += 1;

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);

      const baseSpeed = this.isSprinting ? 12.5 : this.isCrouching ? 3.5 : 6.5;
      this.velocity.x = moveDir.x * baseSpeed;
      this.velocity.z = moveDir.z * baseSpeed;

      // Walking & Running animation with Footstep Sound synthesis
      const cadence = this.isSprinting ? 16 : 9;
      this.animTimer += delta * cadence;
      this.leftLeg.rotation.x = Math.sin(this.animTimer) * 0.7;
      this.rightLeg.rotation.x = -Math.sin(this.animTimer) * 0.7;
      this.leftArm.rotation.x = -Math.sin(this.animTimer) * 0.6;
      if (!this.isAiming) {
        this.rightArm.rotation.x = Math.sin(this.animTimer) * 0.6;
      }

      if (this.isGrounded) {
        this.stepTimer += delta * (this.isSprinting ? 15 : 9);
        if (this.stepTimer >= Math.PI) {
          this.stepTimer = 0;
          const surface = this.position.y > 0.5 ? 'metal' : (Math.abs(this.position.x) > 300 || Math.abs(this.position.z) > 300) ? 'grass' : 'concrete';
          soundEngine.playFootstep(surface);
        }
      }
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.stepTimer = 0;
    }

    // Jump / Gravity physics
    if (input.jump && this.isGrounded) {
      this.velocity.y = 8.5;
      this.isGrounded = false;
    }

    const prevVelocityY = this.velocity.y;
    if (!this.isGrounded) {
      this.velocity.y -= 22 * delta; // Gravity
    }

    // Move along X with collision resolution
    const pRadius = 0.6;
    const playerHeight = this.isCrouching ? 1.2 : 1.9;
    const nextX = this.position.x + this.velocity.x * delta;
    let collidedX = false;

    for (const obj of colliders) {
      if (obj.type === 'pickup') continue;
      const c = obj.collider;
      // Check vertical overlap
      if (this.position.y < c.maxY && this.position.y + playerHeight > c.minY) {
        if (
          nextX + pRadius > c.minX &&
          nextX - pRadius < c.maxX &&
          this.position.z + pRadius > c.minZ &&
          this.position.z - pRadius < c.maxZ
        ) {
          collidedX = true;
          // Clamp to boundary edge
          if (this.velocity.x > 0) {
            this.position.x = c.minX - pRadius;
          } else if (this.velocity.x < 0) {
            this.position.x = c.maxX + pRadius;
          }
          this.velocity.x = 0;
          break;
        }
      }
    }
    if (!collidedX) {
      this.position.x = nextX;
    }

    // Move along Z with collision resolution
    const nextZ = this.position.z + this.velocity.z * delta;
    let collidedZ = false;

    for (const obj of colliders) {
      if (obj.type === 'pickup') continue;
      const c = obj.collider;
      if (this.position.y < c.maxY && this.position.y + playerHeight > c.minY) {
        if (
          this.position.x + pRadius > c.minX &&
          this.position.x - pRadius < c.maxX &&
          nextZ + pRadius > c.minZ &&
          nextZ - pRadius < c.maxZ
        ) {
          collidedZ = true;
          if (this.velocity.z > 0) {
            this.position.z = c.minZ - pRadius;
          } else if (this.velocity.z < 0) {
            this.position.z = c.maxZ + pRadius;
          }
          this.velocity.z = 0;
          break;
        }
      }
    }
    if (!collidedZ) {
      this.position.z = nextZ;
    }

    // Move along Y (vertical / rooftop support & Realistic Fall Damage)
    const nextY = this.position.y + this.velocity.y * delta;
    let supportedGroundY = 0;
    let hitCeiling = false;

    for (const obj of colliders) {
      if (obj.type === 'pickup') continue;
      const c = obj.collider;
      // Check if horizontally within building/prop footprint
      if (
        this.position.x + pRadius > c.minX &&
        this.position.x - pRadius < c.maxX &&
        this.position.z + pRadius > c.minZ &&
        this.position.z - pRadius < c.maxZ
      ) {
        // Landing on top / rooftop
        if (this.position.y >= c.maxY - 0.6 && nextY <= c.maxY) {
          if (c.maxY > supportedGroundY) {
            supportedGroundY = c.maxY;
          }
        } else if (this.velocity.y > 0 && this.position.y + playerHeight <= c.minY && nextY + playerHeight >= c.minY) {
          // Hit head on bottom of elevated highway/bridge
          hitCeiling = true;
          this.velocity.y = 0;
          this.position.y = c.minY - playerHeight;
        }
      }
    }

    if (!hitCeiling) {
      if (nextY <= supportedGroundY) {
        // Just Landed on Ground / Rooftop
        if (!this.isGrounded && prevVelocityY < -13) {
          // Calculate realistic velocity-based Fall Damage
          const fallDmg = Math.floor((Math.abs(prevVelocityY) - 12) * 6);
          if (fallDmg > 0) {
            this.takeDamage(fallDmg);
            soundEngine.playFallDamage();
          }
        }
        this.position.y = supportedGroundY;
        this.velocity.y = 0;
        this.isGrounded = true;
      } else {
        this.position.y = nextY;
        this.isGrounded = false;
      }
    } else {
      if (this.position.y <= supportedGroundY) {
        this.position.y = supportedGroundY;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    }

    // World boundary
    this.position.x = Math.max(-550, Math.min(550, this.position.x));
    this.position.z = Math.max(-550, Math.min(550, this.position.z));

    this.mesh.position.copy(this.position);

    // Manage body parts visibility in First-Person vs Third-Person mode
    if (this.isFirstPerson) {
      this.torsoMesh.visible = false;
      this.vestMesh.visible = false;
      this.head.visible = false;
      this.visorMesh.visible = false;
      this.leftArm.visible = false;
      this.leftLeg.visible = false;
      this.rightLeg.visible = false;
      this.rightArm.visible = true;
      this.weaponMesh.visible = true;

      // Position gun and arm in front of camera view in FPS
      const bobbing = isMoving ? Math.sin(this.animTimer * 1.6) * 0.025 : 0;
      if (this.isAiming) {
        this.isInspecting = false;
        this.inspectTimer = 0;
        this.rightArm.position.set(0.0, 0.22 + bobbing, -0.28);
        this.rightArm.rotation.set(-Math.PI / 2 + cameraEuler.x, 0, 0);
      } else if (this.isInspecting) {
        // Calculate inspection progress 0.0 -> 1.0
        const p = Math.min(1.0, Math.max(0.0, 1.0 - this.inspectTimer / this.inspectDuration));

        if (this.currentWeapon === 'katana') {
          // Katana Sword Inspection Animation:
          // Phase 1 (0 to 0.35): Bring blade diagonally across screen, tilt edge to inspect sharpness
          // Phase 2 (0.35 to 0.70): Rotate sword horizontally, admire blade glow & metallic sheen
          // Phase 3 (0.70 to 0.90): Quick flourish spin & ready stance
          // Phase 4 (0.90 to 1.00): Return to normal grip
          if (p < 0.35) {
            const t = p / 0.35;
            const easeT = Math.sin(t * Math.PI * 0.5);
            this.rightArm.position.set(
              THREE.MathUtils.lerp(0.28, 0.05, easeT),
              THREE.MathUtils.lerp(0.08, 0.25, easeT),
              THREE.MathUtils.lerp(-0.32, -0.35, easeT)
            );
            this.rightArm.rotation.set(
              THREE.MathUtils.lerp(-Math.PI / 2.15, -Math.PI / 3.0, easeT) + cameraEuler.x * 0.4,
              THREE.MathUtils.lerp(0.08, 0.6, easeT),
              THREE.MathUtils.lerp(0, -0.8, easeT)
            );
          } else if (p < 0.70) {
            const t = (p - 0.35) / 0.35;
            const wave = Math.sin(t * Math.PI);
            this.rightArm.position.set(
              0.05 + Math.sin(t * Math.PI) * 0.08,
              0.25 + Math.cos(t * Math.PI) * 0.03,
              -0.35
            );
            this.rightArm.rotation.set(
              -Math.PI / 3.0 + wave * 0.3 + cameraEuler.x * 0.4,
              0.6 - t * 1.2,
              -0.8 + t * 1.6
            );
          } else if (p < 0.90) {
            const t = (p - 0.70) / 0.20;
            this.rightArm.position.set(
              THREE.MathUtils.lerp(0.05, 0.22, t),
              THREE.MathUtils.lerp(0.25, 0.12, t),
              THREE.MathUtils.lerp(-0.35, -0.32, t)
            );
            this.rightArm.rotation.set(
              THREE.MathUtils.lerp(-Math.PI / 3.0, -Math.PI / 2.15, t) + cameraEuler.x * 0.5,
              THREE.MathUtils.lerp(-0.6, 0.08, t),
              THREE.MathUtils.lerp(0.8, 0, t)
            );
          } else {
            const t = (p - 0.90) / 0.10;
            this.rightArm.position.set(
              THREE.MathUtils.lerp(0.22, 0.28, t),
              THREE.MathUtils.lerp(0.12, 0.08 + bobbing, t),
              -0.32
            );
            this.rightArm.rotation.set(-Math.PI / 2.15 + (cameraEuler.x * 0.6), 0.08, 0);
          }
        } else {
          // Standard Firearm (Pistol, SMG, AR, Shotgun, Sniper, RPG) Inspection Animation:
          // 4-Phase CS:GO / Cyberpunk weapon inspection:
          // Phase 1 (0.0 to 0.30): Lift weapon up toward eye level, tilt left +45° to inspect receiver & fire selector
          // Phase 2 (0.30 to 0.65): Rotate weapon right -50° to inspect ejection port, chamber slide, magazine well
          // Phase 3 (0.65 to 0.85): Slight cocking flick & align sights
          // Phase 4 (0.85 to 1.00): Smooth recovery to rest stance
          if (p < 0.30) {
            const t = p / 0.30;
            const easeT = Math.sin(t * Math.PI * 0.5);
            this.rightArm.position.set(
              THREE.MathUtils.lerp(0.28, 0.12, easeT),
              THREE.MathUtils.lerp(0.08, 0.22, easeT),
              THREE.MathUtils.lerp(-0.32, -0.26, easeT)
            );
            this.rightArm.rotation.set(
              THREE.MathUtils.lerp(-Math.PI / 2.15, -Math.PI / 2.3, easeT) + (cameraEuler.x * 0.5),
              THREE.MathUtils.lerp(0.08, -0.45, easeT),
              THREE.MathUtils.lerp(0, 0.65, easeT)
            );
          } else if (p < 0.65) {
            const t = (p - 0.30) / 0.35;
            const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);
            this.rightArm.position.set(
              THREE.MathUtils.lerp(0.12, 0.18, easeT),
              THREE.MathUtils.lerp(0.22, 0.19, easeT),
              THREE.MathUtils.lerp(-0.26, -0.29, easeT)
            );
            this.rightArm.rotation.set(
              THREE.MathUtils.lerp(-Math.PI / 2.3, -Math.PI / 2.0, easeT) + (cameraEuler.x * 0.5),
              THREE.MathUtils.lerp(-0.45, 0.55, easeT),
              THREE.MathUtils.lerp(0.65, -0.60, easeT)
            );
          } else if (p < 0.85) {
            const t = (p - 0.65) / 0.20;
            const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);
            this.rightArm.position.set(
              THREE.MathUtils.lerp(0.18, 0.24, easeT),
              THREE.MathUtils.lerp(0.19, 0.14, easeT),
              THREE.MathUtils.lerp(-0.29, -0.31, easeT)
            );
            this.rightArm.rotation.set(
              THREE.MathUtils.lerp(-Math.PI / 2.0, -Math.PI / 2.15, easeT) + (cameraEuler.x * 0.55),
              THREE.MathUtils.lerp(0.55, 0.15, easeT),
              THREE.MathUtils.lerp(-0.60, 0.05, easeT)
            );
          } else {
            const t = (p - 0.85) / 0.15;
            const easeT = Math.sin(t * Math.PI * 0.5);
            this.rightArm.position.set(
              THREE.MathUtils.lerp(0.24, 0.28, easeT),
              THREE.MathUtils.lerp(0.14, 0.08 + bobbing, easeT),
              THREE.MathUtils.lerp(-0.31, -0.32, easeT)
            );
            this.rightArm.rotation.set(
              -Math.PI / 2.15 + (cameraEuler.x * 0.6),
              THREE.MathUtils.lerp(0.15, 0.08, easeT),
              THREE.MathUtils.lerp(0.05, 0, easeT)
            );
          }
        }
      } else {
        this.rightArm.position.set(0.28, 0.08 + bobbing, -0.32);
        this.rightArm.rotation.set(-Math.PI / 2.15 + (cameraEuler.x * 0.6), 0.08, 0);
      }
    } else {
      this.torsoMesh.visible = true;
      this.vestMesh.visible = true;
      this.head.visible = true;
      this.visorMesh.visible = true;
      this.leftArm.visible = true;
      this.leftLeg.visible = true;
      this.rightLeg.visible = true;
      this.rightArm.visible = true;
      this.weaponMesh.visible = true;
      this.rightArm.position.set(0.48, 0.1, 0);

      // Aiming and Inspect arm poses in 3rd person
      if (this.isInspecting) {
        const p = Math.min(1.0, Math.max(0.0, 1.0 - this.inspectTimer / this.inspectDuration));
        const wave = Math.sin(p * Math.PI);
        this.rightArm.rotation.set(-Math.PI / 2.4 - wave * 0.3, -wave * 0.4, wave * 0.5);
        this.leftArm.rotation.set(-Math.PI / 2.5 - wave * 0.2, wave * 0.3, -wave * 0.4);
      } else if (this.isAiming) {
        this.rightArm.rotation.x = -Math.PI / 2 + 0.1;
        this.leftArm.rotation.x = -Math.PI / 2 + 0.2;
      }
    }

    // Update active bullets with building collision
    this.updateBullets(delta, colliders);
  }

  private updateBullets(delta: number, colliders: WorldObject[] = []) {
    for (let i = this.activeBullets.length - 1; i >= 0; i--) {
      const b = this.activeBullets[i];
      const step = b.speed * delta;
      b.position.addScaledVector(b.direction, step);
      b.traveled += step;
      b.mesh.position.copy(b.position);

      // Check collision with solid buildings and props
      let hitBuilding = false;
      for (const obj of colliders) {
        if (obj.type === 'pickup') continue;
        const c = obj.collider;
        if (
          b.position.x >= c.minX &&
          b.position.x <= c.maxX &&
          b.position.z >= c.minZ &&
          b.position.z <= c.maxZ &&
          b.position.y >= c.minY &&
          b.position.y <= c.maxY
        ) {
          hitBuilding = true;
          break;
        }
      }

      if (hitBuilding || b.traveled >= b.range || b.position.y <= 0) {
        if (b.isExplosive) {
          soundEngine.playExplosion();
        }
        this.scene.remove(b.mesh);
        this.activeBullets.splice(i, 1);
      }
    }
  }

  public takeDamage(amount: number) {
    if (this.armor > 0) {
      const armorAbsorb = Math.min(this.armor, amount * 0.7);
      this.armor -= armorAbsorb;
      amount -= armorAbsorb;
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
    }
  }

  public die() {
    this.stats.deaths++;
    soundEngine.playExplosion();
    // Respawn at Hospital / Safehouse after brief timeout
    setTimeout(() => {
      this.health = 100;
      this.armor = 100;
      this.position.set(0, 0, 0);
      this.wantedStars = 0;
      this.wantedTimer = 0;
      soundEngine.stopPoliceSiren();
    }, 2500);
  }

  public addWantedStars(stars: number) {
    this.wantedStars = Math.min(5, this.wantedStars + stars);
    this.wantedTimer = 0;
    this.isEscapingPolice = false;
    if (this.wantedStars > this.stats.maxWantedStars) {
      this.stats.maxWantedStars = this.wantedStars;
    }
    soundEngine.startPoliceSiren();
  }

  public enterVehicle(vehicle: Vehicle) {
    this.inVehicle = vehicle;
    vehicle.isOccupied = true;
    vehicle.isPlayerDriven = true;
    soundEngine.startVehicleEngine();
  }

  public exitVehicle() {
    if (!this.inVehicle) return;
    this.position.copy(this.inVehicle.position);
    this.position.x += 3.0; // Exit to the side
    this.inVehicle.isOccupied = false;
    this.inVehicle.isPlayerDriven = false;
    this.inVehicle = null;
    soundEngine.stopVehicleEngine();
  }
}
