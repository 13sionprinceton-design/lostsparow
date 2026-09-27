import * as THREE from 'three';
import { Vehicle } from './vehicle';
import { Player } from './player';
import { soundEngine } from './audio';
import { BOT_NAMES, WEAPONS } from './constants';
import { VehicleType, WeaponType } from './types';
import { RoadWaypoint, TrafficLightSystem, WorldObject } from './world';
import { Door } from './doors';
import { ParticleSystem } from './particles';

export interface AIEntity {
  id: string;
  type: 'civilian' | 'cop' | 'swat' | 'gangster' | 'bot_player';
  mesh: THREE.Group;
  leftArm?: THREE.Mesh;
  rightArm?: THREE.Mesh;
  leftLeg?: THREE.Mesh;
  rightLeg?: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  heading: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'dead';
  weaponType: WeaponType;
  shootCooldown: number;
  walkAnimTimer: number;
  bounty?: number;
  name?: string;
  isDriving?: boolean;
  vehicle?: Vehicle;
}

export class AISystem {
  public scene: THREE.Scene;
  public entities: AIEntity[] = [];
  public policeVehicles: Vehicle[] = [];
  public ambientTraffic: { vehicle: Vehicle; targetWpIdx: number; hornCooldown: number }[] = [];
  public policeHelicopter?: Vehicle;
  private roadWaypoints: RoadWaypoint[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnInitialPopulation(roadWaypoints: RoadWaypoint[]) {
    this.roadWaypoints = roadWaypoints;

    // 1. Spawn Diverse Civilians & Gangsters on Sidewalks
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 450;
      const z = (Math.random() - 0.5) * 450;
      const isGang = Math.random() < 0.2;
      if (isGang) {
        this.spawnGangster(new THREE.Vector3(x, 0, z));
      } else {
        this.spawnCivilian(new THREE.Vector3(x, 0, z));
      }
    }

    // 2. Spawn Rival Online Player Bots
    BOT_NAMES.slice(0, 10).forEach((name, idx) => {
      const angle = (idx / 10) * Math.PI * 2;
      const x = Math.cos(angle) * 160 + (Math.random() - 0.5) * 40;
      const z = Math.sin(angle) * 160 + (Math.random() - 0.5) * 40;
      this.spawnBotPlayer(name, new THREE.Vector3(x, 0, z));
    });

    // 3. Spawn Traffic Fleet (Sedans, SUVs, Taxis, Sports Cars)
    const trafficTypes: VehicleType[] = ['sedan', 'taxi', 'suv', 'sports', 'motorcycle'];
    for (let i = 0; i < 14; i++) {
      const wpIdx = Math.floor(Math.random() * roadWaypoints.length);
      const wp = roadWaypoints[wpIdx];
      if (wp) {
        const type = trafficTypes[i % trafficTypes.length];
        const heading = Math.atan2(-wp.dirX, -wp.dirZ);
        const v = new Vehicle(this.scene, type, new THREE.Vector3(wp.x, 0, wp.z), heading);
        // Generous initial horn cooldown so cars never honk on game join
        this.ambientTraffic.push({ vehicle: v, targetWpIdx: wpIdx, hornCooldown: 30.0 + Math.random() * 20.0 });
      }
    }
  }

  public spawnCivilian(pos: THREE.Vector3) {
    const shirts = [0x38bdf8, 0xf43f5e, 0x10b981, 0xf59e0b, 0xa855f7, 0x64748b, 0xe2e8f0];
    const pants = [0x1e293b, 0x334155, 0x0f172a, 0x475569];
    const shirtColor = shirts[Math.floor(Math.random() * shirts.length)];
    const pantColor = pants[Math.floor(Math.random() * pants.length)];

    const { group, leftArm, rightArm, leftLeg, rightLeg } = this.createHumanoidMesh(shirtColor, pantColor);
    group.position.copy(pos);
    this.scene.add(group);

    this.entities.push({
      id: 'civ_' + Math.random().toString(36).substring(2, 9),
      type: 'civilian',
      mesh: group,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      position: pos,
      velocity: new THREE.Vector3(),
      health: 40,
      maxHealth: 40,
      heading: Math.random() * Math.PI * 2,
      state: 'patrol',
      weaponType: 'pistol',
      shootCooldown: 0,
      walkAnimTimer: Math.random() * 10,
    });
  }

  public spawnGangster(pos: THREE.Vector3) {
    const { group, leftArm, rightArm, leftLeg, rightLeg } = this.createHumanoidMesh(0x7c2d12, 0x18181b, true);
    group.position.copy(pos);
    this.scene.add(group);

    this.entities.push({
      id: 'gang_' + Math.random().toString(36).substring(2, 9),
      type: 'gangster',
      mesh: group,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      position: pos,
      velocity: new THREE.Vector3(),
      health: 80,
      maxHealth: 80,
      heading: Math.random() * Math.PI * 2,
      state: 'patrol',
      weaponType: Math.random() > 0.5 ? 'smg' : 'pistol',
      shootCooldown: 0,
      walkAnimTimer: Math.random() * 10,
    });
  }

  public spawnBotPlayer(name: string, pos: THREE.Vector3) {
    const colors = [0xec4899, 0xa855f7, 0x10b981, 0xf59e0b, 0x06b6d4, 0xef4444];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const { group, leftArm, rightArm, leftLeg, rightLeg } = this.createHumanoidMesh(col, 0x0f172a, true);
    group.position.copy(pos);
    this.scene.add(group);

    const weapons: WeaponType[] = ['smg', 'rifle', 'shotgun', 'sniper'];
    const assignedWeapon = weapons[Math.floor(Math.random() * weapons.length)];

    this.entities.push({
      id: 'bot_' + Math.random().toString(36).substring(2, 9),
      type: 'bot_player',
      name,
      mesh: group,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      position: pos,
      velocity: new THREE.Vector3(),
      health: 120,
      maxHealth: 120,
      heading: Math.random() * Math.PI * 2,
      state: 'patrol',
      weaponType: assignedWeapon,
      shootCooldown: 0,
      bounty: 2500 + Math.floor(Math.random() * 3000),
      walkAnimTimer: Math.random() * 10,
    });
  }

  public spawnPoliceOfficer(pos: THREE.Vector3, isSwat: boolean = false) {
    const shirtCol = isSwat ? 0x111827 : 0x1e3a8a;
    const pantCol = isSwat ? 0x18181b : 0x0f172a;
    const { group, leftArm, rightArm, leftLeg, rightLeg } = this.createHumanoidMesh(shirtCol, pantCol, true, isSwat);
    group.position.copy(pos);
    this.scene.add(group);

    this.entities.push({
      id: (isSwat ? 'swat_' : 'cop_') + Math.random().toString(36).substring(2, 9),
      type: isSwat ? 'swat' : 'cop',
      mesh: group,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      position: pos,
      velocity: new THREE.Vector3(),
      health: isSwat ? 160 : 90,
      maxHealth: isSwat ? 160 : 90,
      heading: Math.random() * Math.PI * 2,
      state: 'chase',
      weaponType: isSwat ? 'rifle' : 'smg',
      shootCooldown: 0.5,
      walkAnimTimer: 0,
    });
  }

  public spawnPoliceSquad(playerPos: THREE.Vector3, wantedStars: number) {
    const spawnCount = wantedStars >= 4 ? 4 : 2;
    for (let i = 0; i < spawnCount; i++) {
      const angle = (i / spawnCount) * Math.PI * 2;
      const spawnX = playerPos.x + Math.cos(angle) * 70;
      const spawnZ = playerPos.z + Math.sin(angle) * 70;
      const isSwat = wantedStars >= 3;
      this.spawnPoliceOfficer(new THREE.Vector3(spawnX, 0, spawnZ), isSwat);
    }

    if (wantedStars >= 2 && this.policeVehicles.length < 3) {
      const pv = new Vehicle(this.scene, 'police', new THREE.Vector3(playerPos.x + 85, 0, playerPos.z + 85));
      this.policeVehicles.push(pv);
    }

    if (wantedStars >= 4 && !this.policeHelicopter) {
      this.policeHelicopter = new Vehicle(this.scene, 'helicopter', new THREE.Vector3(playerPos.x + 100, 45, playerPos.z + 100));
      this.policeHelicopter.altitude = 45;
    }
  }

  private createHumanoidMesh(shirtColor: number, pantsColor: number, hasWeapon: boolean = false, isSwat: boolean = false) {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirtMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    group.add(torso);

    // Tactical Vest for SWAT
    if (isSwat) {
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.46), darkMat);
      vest.position.y = 1.35;
      group.add(vest);
    }

    // Head & Hair/Helmet
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat);
    head.position.y = 2.05;
    head.castShadow = true;
    group.add(head);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.44), darkMat);
    cap.position.y = 2.22;
    group.add(cap);

    // Animated Limbs: Left & Right Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-0.46, 1.3, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0.46, 1.3, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Weapon in Right Hand
    if (hasWeapon) {
      const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.6), darkMat);
      gunMesh.position.set(0.46, 0.9, -0.3);
      group.add(gunMesh);
    }

    // Animated Limbs: Left & Right Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.9, 0.24);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.2, 0.45, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.2, 0.45, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    return { group, leftArm, rightArm, leftLeg, rightLeg };
  }

  public update(
    delta: number,
    player: Player,
    colliders: WorldObject[],
    trafficLights: TrafficLightSystem[],
    isNightOrDusk: boolean,
    onKillFeed: (killer: string, victim: string, weapon: WeaponType) => void,
    doors?: Door[],
    particles?: ParticleSystem
  ) {
    const pPos = player.position;

    // 1. Update Pedestrians & Humanoid NPCs
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.state === 'dead') continue;

      const distToPlayer = e.position.distanceTo(pPos);

      // Walk cycle animation
      const isMoving = e.velocity.lengthSq() > 0.1;
      if (isMoving) {
        e.walkAnimTimer += delta * 9.0;
        const swing = Math.sin(e.walkAnimTimer) * 0.45;
        if (e.leftLeg) e.leftLeg.rotation.x = swing;
        if (e.rightLeg) e.rightLeg.rotation.x = -swing;
        if (e.leftArm) e.leftArm.rotation.x = -swing;
        if (e.rightArm && e.state !== 'attack' && e.state !== 'chase') e.rightArm.rotation.x = swing;
      }

      // Check nearby doors for NPC interaction
      if (doors) {
        for (const door of doors) {
          if (door.state === 'broken') continue;
          const distToDoor = e.position.distanceTo(door.position);
          if (distToDoor < 3.2) {
            if (door.state === 'closed' || door.state === 'closing') {
              if (!door.isLocked) {
                // Civilian or patrol cop opens the door
                door.open();
              } else if ((e.type === 'cop' || e.type === 'swat') && player.wantedStars >= 2 && particles) {
                // Police SWAT breach kick open locked doors to pursue player!
                door.kickBreach(player, particles);
              }
            }
          }
        }
      }

      if (e.type === 'civilian') {
        // Civilians flee if player has wanted level or is shooting nearby
        if (player.wantedStars > 0 && distToPlayer < 40) {
          e.state = 'flee';
          const away = new THREE.Vector3().subVectors(e.position, pPos).normalize();
          e.heading = Math.atan2(away.x, away.z);
          e.velocity.x = away.x * 6.5;
          e.velocity.z = away.z * 6.5;
        } else {
          e.state = 'patrol';
          if (Math.random() < 0.02) e.heading += (Math.random() - 0.5) * 1.5;
          e.velocity.x = Math.sin(e.heading) * 2.2;
          e.velocity.z = Math.cos(e.heading) * 2.2;
        }
      } else if (e.type === 'cop' || e.type === 'swat') {
        if (player.wantedStars > 0 && distToPlayer < 220) {
          e.state = 'chase';
          const toPlayer = new THREE.Vector3().subVectors(pPos, e.position).normalize();
          e.heading = Math.atan2(toPlayer.x, toPlayer.z);

          if (distToPlayer > 20) {
            e.velocity.x = toPlayer.x * 7.0;
            e.velocity.z = toPlayer.z * 7.0;
          } else {
            // Combat range strafing
            e.velocity.x = toPlayer.z * 1.8;
            e.velocity.z = -toPlayer.x * 1.8;

            e.shootCooldown -= delta;
            if (e.shootCooldown <= 0 && distToPlayer < 45) {
              e.shootCooldown = e.type === 'swat' ? 0.3 : 0.7;
              soundEngine.playGunshot(e.weaponType);
              player.takeDamage(e.type === 'swat' ? 14 : 8);
            }
          }
        } else {
          e.state = 'patrol';
          e.velocity.set(0, 0, 0);
        }
      } else if (e.type === 'gangster' || e.type === 'bot_player') {
        if (distToPlayer < 35 && (player.wantedStars > 0 || Math.random() < 0.04)) {
          e.state = 'attack';
          const toPlayer = new THREE.Vector3().subVectors(pPos, e.position).normalize();
          e.heading = Math.atan2(toPlayer.x, toPlayer.z);
          e.velocity.x = toPlayer.x * 5.2;
          e.velocity.z = toPlayer.z * 5.2;

          e.shootCooldown -= delta;
          if (e.shootCooldown <= 0) {
            e.shootCooldown = 0.55;
            soundEngine.playGunshot(e.weaponType);
            player.takeDamage(11);
          }
        } else {
          if (Math.random() < 0.02) e.heading += (Math.random() - 0.5) * 2;
          e.velocity.x = Math.sin(e.heading) * 4.0;
          e.velocity.z = Math.cos(e.heading) * 4.0;
        }
      }

      // Step position with obstacle collision
      const nextX = e.position.x + e.velocity.x * delta;
      const nextZ = e.position.z + e.velocity.z * delta;
      let blocked = false;

      for (const obj of colliders) {
        if (obj.type === 'pickup' || obj.isDead || obj.isDestroyed) continue;
        const c = obj.collider;
        if (
          nextX + 0.6 > c.minX &&
          nextX - 0.6 < c.maxX &&
          nextZ + 0.6 > c.minZ &&
          nextZ - 0.6 < c.maxZ &&
          e.position.y < c.maxY &&
          e.position.y + 1.8 > c.minY
        ) {
          blocked = true;
          e.heading += Math.PI / 2 + (Math.random() - 0.5);
          break;
        }
      }

      if (!blocked) {
        e.position.x = nextX;
        e.position.z = nextZ;
      }

      e.mesh.position.copy(e.position);
      e.mesh.rotation.y = e.heading;
    }

    // 2. Update Ambient Traffic Fleet & Traffic Light Respect
    this.ambientTraffic.forEach((t) => {
      const v = t.vehicle;
      if (v.isDestroyed || this.roadWaypoints.length === 0) return;

      // Auto toggle headlights at night/dusk
      if (isNightOrDusk !== v.headlightsActive) {
        v.toggleHeadlights();
      }

      const curWp = this.roadWaypoints[t.targetWpIdx];
      if (!curWp) return;

      const toWp = new THREE.Vector3(curWp.x - v.position.x, 0, curWp.z - v.position.z);
      const distToWp = toWp.length();

      if (distToWp < 6.0) {
        // Advance to next waypoint along road
        t.targetWpIdx = (t.targetWpIdx + 1) % this.roadWaypoints.length;
      }

      // Check Intersection Traffic Lights
      let shouldStopForLight = false;
      for (const tl of trafficLights) {
        const dTl = v.position.distanceTo(new THREE.Vector3(tl.x, 0, tl.z));
        if (dTl < 22 && dTl > 6) {
          const isNS = curWp.axis === 'z';
          if (isNS && (tl.state === 'EW_GREEN' || tl.state === 'NS_YELLOW')) {
            shouldStopForLight = true;
            break;
          } else if (!isNS && (tl.state === 'NS_GREEN' || tl.state === 'EW_YELLOW')) {
            shouldStopForLight = true;
            break;
          }
        }
      }

      // Check distance to player vehicle (Honk horn gently only if blocked by player car)
      const distToPlayerCar = v.position.distanceTo(pPos);
      if (distToPlayerCar < 9 && player.inVehicle) {
        t.hornCooldown -= delta;
        if (t.hornCooldown <= 0) {
          t.hornCooldown = 20.0 + Math.random() * 10.0;
          soundEngine.playCarHorn(380);
        }
        shouldStopForLight = true;
      }

      if (shouldStopForLight) {
        v.speed = Math.max(0, v.speed - delta * 25);
      } else {
        const targetHeading = Math.atan2(-curWp.dirX, -curWp.dirZ);
        v.heading = THREE.MathUtils.lerp(v.heading, targetHeading, delta * 3.5);
        v.speed = Math.min(v.speed + delta * 14, 22);
      }

      v.update(delta, undefined, colliders);
    });

    // 3. Update Police Cruisers
    this.policeVehicles.forEach((pv) => {
      if (pv.isDestroyed) return;
      const dist = pv.position.distanceTo(pPos);
      if (player.wantedStars > 0 && dist < 220) {
        const toPlayer = new THREE.Vector3().subVectors(pPos, pv.position).normalize();
        const targetHeading = Math.atan2(-toPlayer.x, -toPlayer.z);
        pv.heading = THREE.MathUtils.lerp(pv.heading, targetHeading, delta * 3.5);
        pv.speed = Math.min(pv.speed + delta * 22, 40);
        pv.update(delta, undefined, colliders);
      }
    });

    // 4. Update Police Helicopter
    if (this.policeHelicopter && !this.policeHelicopter.isDestroyed) {
      if (player.wantedStars >= 4) {
        const toPlayer = new THREE.Vector3().subVectors(pPos, this.policeHelicopter.position).normalize();
        this.policeHelicopter.heading = Math.atan2(-toPlayer.x, -toPlayer.z);
        this.policeHelicopter.position.x += toPlayer.x * 26 * delta;
        this.policeHelicopter.position.z += toPlayer.z * 26 * delta;
        this.policeHelicopter.position.y = 45;
        this.policeHelicopter.update(delta, undefined, colliders);
      }
    }

    // Check Player bullets hitting AI
    this.checkBulletHits(player, onKillFeed);
  }

  private checkBulletHits(player: Player, onKillFeed: (killer: string, victim: string, weapon: WeaponType) => void) {
    for (let bIdx = player.activeBullets.length - 1; bIdx >= 0; bIdx--) {
      const b = player.activeBullets[bIdx];

      for (let eIdx = this.entities.length - 1; eIdx >= 0; eIdx--) {
        const e = this.entities[eIdx];
        if (e.state === 'dead') continue;

        const hitDist = b.position.distanceTo(new THREE.Vector3(e.position.x, 1.2, e.position.z));
        if (hitDist < 1.4) {
          const isHeadshot = b.position.y > e.position.y + 1.6;
          const damage = b.damage * (isHeadshot ? 2.5 : 1.0);
          e.health -= damage;

          soundEngine.playHitmarker(isHeadshot);
          if (isHeadshot) player.stats.headshots++;

          if (e.health <= 0) {
            e.state = 'dead';
            e.mesh.rotation.x = Math.PI / 2;
            e.mesh.position.y = 0.2;
            player.stats.kills++;

            const victimName = e.name || (e.type === 'cop' ? 'VCPD Officer' : e.type === 'swat' ? 'SWAT Operative' : e.type === 'gangster' ? 'Syndicate Enforcer' : 'Civilian');
            onKillFeed('You', victimName, b.weaponType);

            if (e.type === 'cop' || e.type === 'swat') {
              player.stats.policeKills++;
              player.addWantedStars(1);
              player.cash += 800;
            } else if (e.type === 'bot_player' || e.type === 'gangster') {
              const reward = e.bounty || 1500;
              player.cash += reward;
              soundEngine.playCashPickup();
            } else {
              player.addWantedStars(1);
              player.cash += 250;
              soundEngine.playCashPickup();
            }
          }

          this.scene.remove(b.mesh);
          player.activeBullets.splice(bIdx, 1);
          break;
        }
      }
    }
  }
}
