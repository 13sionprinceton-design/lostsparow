import * as THREE from 'three';
import { soundEngine } from './audio';
import { ParticleSystem } from './particles';
import { Player } from './player';
import { WorldObject } from './world';

export type DoorCategory =
  | 'normal'     // 🚪 Normal door (E OPEN)
  | 'locked'     // 🔒 Locked door (E LOCKPICK)
  | 'security'   // 🪪 Security door (E USE KEYCARD)
  | 'weak'       // 💥 Weak door (F KICK BREACH)
  | 'garage'     // 🚗 Garage (E OPEN SHUTTER)
  | 'elevator'   // 🛗 Elevator (E CALL ELEVATOR)
  | 'shop'       // 🏪 Shop (E ENTER)
  | 'vault';     // 🏦 Vault (E USE ACCESS CODE)

export type DoorType =
  | 'manual_wood'
  | 'manual_metal'
  | 'auto_glass'
  | 'vault_metal'
  | 'garage_roll'
  | 'elevator'
  | 'weak_wood'
  | 'shop_entrance';

export type DoorState = 'closed' | 'opening' | 'open' | 'closing' | 'broken';

export interface KeycardItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export const KEYCARDS: Record<string, KeycardItem> = {
  bank_vault_pass: {
    id: 'bank_vault_pass',
    name: 'Bank Vault Passcard',
    color: '#f59e0b',
    icon: 'ShieldAlert',
    description: 'Encrypted biometric keycard granting access to Nova Central Bank high-security vault.',
  },
  safehouse_key: {
    id: 'safehouse_key',
    name: 'Marina Condo Keycard',
    color: '#06b6d4',
    icon: 'Key',
    description: 'Smart NFC digital card for the luxury Marina waterfront penthouse.',
  },
  ammunation_vip: {
    id: 'ammunation_vip',
    name: 'Ammu-Nation VIP Pass',
    color: '#ef4444',
    icon: 'Flame',
    description: 'VIP authorization card for the Ammu-Nation Gun Range & Master Armory.',
  },
  bunker_key: {
    id: 'bunker_key',
    name: 'Bunker Workshop Key',
    color: '#10b981',
    icon: 'Cpu',
    description: 'Industrial rolling shutter key for the Underground Safehouse Garage.',
  },
  cyber_corp_badge: {
    id: 'cyber_corp_badge',
    name: 'Cyber Corp Executive Badge',
    color: '#38bdf8',
    icon: 'Zap',
    description: 'High-security cryptographic clearance badge for Cyber Corp executive suites.',
  },
  nexus_vip_card: {
    id: 'nexus_vip_card',
    name: 'Nexus Casino VIP Pass',
    color: '#ec4899',
    icon: 'Sparkles',
    description: 'Gold-embossed VIP card for the high-stakes floor and penthouse suite.',
  },
  police_precinct_key: {
    id: 'police_precinct_key',
    name: 'Precinct Armory Key',
    color: '#3b82f6',
    icon: 'Shield',
    description: 'Heavy duty steel key for police holding cells and evidence lockers.',
  },
  downtown_penthouse_key: {
    id: 'downtown_penthouse_key',
    name: 'Downtown Penthouse RFID',
    color: '#a855f7',
    icon: 'Key',
    description: 'Encrypted RFID transponder for the Downtown luxury penthouse suite.',
  },
  dealership_key: {
    id: 'dealership_key',
    name: 'Aether Motors Showroom Key',
    color: '#f59e0b',
    icon: 'Award',
    description: 'Showroom master electronic keycard for exotic sports car displays.',
  },
};

export class Door {
  public id: string;
  public name: string;
  public category: DoorCategory;
  public type: DoorType;
  public position: THREE.Vector3;
  public rotationY: number;
  public state: DoorState = 'closed';
  public isLocked: boolean;
  public requiredKeycard: string | null;
  public health: number;
  public maxHealth: number;
  public isAutomatic: boolean;
  public sensorRadius: number;
  public autoCloseDelay: number = 3.5;
  public autoCloseTimer: number = 0;
  public targetFloor?: THREE.Vector3; // For elevator teleports
  public targetFloorName?: string;

  // 3D Objects
  public group: THREE.Group;
  public frameMesh: THREE.Group;
  public doorLeafPivot: THREE.Group;
  public doorLeaf2Pivot?: THREE.Group; // Second sliding panel for double auto doors
  public handlePivot?: THREE.Group;
  public handleMesh?: THREE.Mesh;
  public vaultWheelMesh?: THREE.Mesh;
  public keypadMesh?: THREE.Mesh;
  public keypadLedMat?: THREE.MeshBasicMaterial;
  public shutterRollMesh?: THREE.Group;

  // Animation values
  public openProgress: number = 0; // 0.0 (closed) -> 1.0 (open)
  public handleAngle: number = 0; // 0 -> -35 degrees
  public handleAnimTimer: number = 0;
  public vaultWheelAngle: number = 0;
  public swingMaxAngle: number = Math.PI * 0.52;
  public slideDistance: number = 1.4;
  public shutterMaxHeight: number = 3.6;

  // Collision
  public colliderObject?: WorldObject;
  public scene: THREE.Scene;

  constructor(
    scene: THREE.Scene,
    params: {
      id: string;
      name: string;
      category?: DoorCategory;
      type: DoorType;
      position: THREE.Vector3;
      rotationY?: number;
      isLocked?: boolean;
      requiredKeycard?: string | null;
      health?: number;
      isAutomatic?: boolean;
      sensorRadius?: number;
      targetFloor?: THREE.Vector3;
      targetFloorName?: string;
    }
  ) {
    this.scene = scene;
    this.id = params.id;
    this.name = params.name;
    this.type = params.type;

    // Determine category from type / params if not explicit
    if (params.category) {
      this.category = params.category;
    } else if (params.type === 'vault_metal' || params.id.includes('vault')) {
      this.category = 'vault';
    } else if (params.type === 'elevator' || params.id.includes('elevator')) {
      this.category = 'elevator';
    } else if (params.type === 'garage_roll' || params.id.includes('garage') || params.id.includes('shutter') || params.id.includes('spray')) {
      this.category = 'garage';
    } else if (params.type === 'weak_wood' || params.id.includes('weak') || params.id.includes('hatch')) {
      this.category = 'weak';
    } else if (params.type === 'shop_entrance' || params.id.includes('mart') || params.id.includes('ammu') || params.id.includes('clinic') || params.id.includes('dealership') || params.id.includes('casino')) {
      this.category = 'shop';
    } else if (params.requiredKeycard) {
      this.category = 'security';
    } else if (params.isLocked) {
      this.category = 'locked';
    } else {
      this.category = 'normal';
    }

    this.position = params.position.clone();
    this.rotationY = params.rotationY || 0;
    this.isLocked = params.isLocked ?? (this.category === 'locked' || !!params.requiredKeycard || this.category === 'vault');
    this.requiredKeycard = params.requiredKeycard || null;
    this.maxHealth = params.health ?? (this.category === 'weak' ? 60 : this.category === 'vault' ? 1000 : 250);
    this.health = this.maxHealth;
    this.isAutomatic = params.isAutomatic || false;
    this.sensorRadius = params.sensorRadius || 3.8;
    this.targetFloor = params.targetFloor;
    this.targetFloorName = params.targetFloorName;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    this.frameMesh = new THREE.Group();
    this.doorLeafPivot = new THREE.Group();

    this.buildDoorModel();
    this.scene.add(this.group);
  }

  private buildDoorModel() {
    const width = this.category === 'garage' ? 5.6 : this.type === 'auto_glass' || this.type === 'shop_entrance' || this.type === 'elevator' ? 3.0 : 2.0;
    const height = this.category === 'garage' ? 3.8 : 3.2;
    const thickness = 0.14;

    // 1. Outer Door Frame / Pillars
    const frameMat = new THREE.MeshStandardMaterial({
      color: this.category === 'vault' ? 0x334155 : this.category === 'elevator' ? 0x94a3b8 : 0x1e293b,
      roughness: 0.4,
      metalness: 0.8,
    });

    const postGeo = new THREE.BoxGeometry(0.2, height, 0.28);
    const lintelGeo = new THREE.BoxGeometry(width + 0.4, 0.22, 0.28);

    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-width / 2 - 0.1, height / 2, 0);
    this.frameMesh.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(width / 2 + 0.1, height / 2, 0);
    this.frameMesh.add(rightPost);

    const lintel = new THREE.Mesh(lintelGeo, frameMat);
    lintel.position.set(0, height + 0.11, 0);
    this.frameMesh.add(lintel);

    this.group.add(this.frameMesh);

    // 2. Door Leaves and Articulations by Category and Type
    if (this.category === 'garage' || this.type === 'garage_roll') {
      // Industrial Rolling Shutter (Horizontally ribbed metal slats)
      this.shutterRollMesh = new THREE.Group();
      const slatCount = 18;
      const slatH = height / slatCount;
      const slatMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.9,
        roughness: 0.35,
      });

      for (let i = 0; i < slatCount; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(width - 0.05, slatH - 0.02, 0.06), slatMat);
        slat.position.set(0, i * slatH + slatH / 2, 0);
        slat.castShadow = true;
        this.shutterRollMesh.add(slat);
      }

      // Overhead Roll Housing Box
      const housingBox = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.3, 0.6, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 })
      );
      housingBox.position.set(0, height + 0.3, 0);
      this.frameMesh.add(housingBox);

      // Warning Yellow/Black Hazard Stripes on bottom lip
      const bottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.12, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5 })
      );
      bottomBar.position.set(0, 0.06, 0);
      this.shutterRollMesh.add(bottomBar);

      this.doorLeafPivot.add(this.shutterRollMesh);
      this.group.add(this.doorLeafPivot);

      // Wall Shutter Switch Box
      const switchBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.35, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      switchBox.position.set(width / 2 + 0.28, 1.6, 0.1);
      this.keypadLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const switchLed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), this.keypadLedMat);
      switchLed.position.set(width / 2 + 0.28, 1.7, 0.16);
      this.group.add(switchBox);
      this.group.add(switchLed);
    } else if (this.category === 'elevator' || this.type === 'elevator') {
      // Brushed Chrome Elevator Doors & Call Panel
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.15,
      });

      // Left Sliding Elevator Door
      const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(width / 2 - 0.02, height - 0.05, 0.08), chromeMat);
      leftDoor.position.set(-width / 4, height / 2, 0);
      leftDoor.castShadow = true;
      this.doorLeafPivot.add(leftDoor);
      this.group.add(this.doorLeafPivot);

      // Right Sliding Elevator Door
      this.doorLeaf2Pivot = new THREE.Group();
      const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(width / 2 - 0.02, height - 0.05, 0.08), chromeMat);
      rightDoor.position.set(width / 4, height / 2, 0);
      rightDoor.castShadow = true;
      this.doorLeaf2Pivot.add(rightDoor);
      this.group.add(this.doorLeaf2Pivot);

      // Floor Display Indicator (Above door)
      const displayPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.28, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      displayPanel.position.set(0, height + 0.2, 0.1);
      this.keypadLedMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const displayLight = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.16), this.keypadLedMat);
      displayLight.position.set(0, height + 0.2, 0.15);
      this.group.add(displayPanel);
      this.group.add(displayLight);

      // Elevator Call Button Panel
      const callPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.4, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
      );
      callPanel.position.set(width / 2 + 0.3, 1.5, 0.1);
      const callBtn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      callBtn.position.set(width / 2 + 0.3, 1.55, 0.14);
      this.group.add(callPanel);
      this.group.add(callBtn);
    } else if (this.category === 'vault' || this.type === 'vault_metal') {
      // Massive Reinforced Circular 8-Spoke Bank Vault Door
      const vaultMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.95,
        roughness: 0.2,
      });
      const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
      });

      // Pivot placed on left hinge
      this.doorLeafPivot.position.set(-width / 2, 0, 0);

      const vaultDoorMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.35, 32), vaultMat);
      vaultDoorMesh.rotation.x = Math.PI / 2;
      vaultDoorMesh.position.set(width / 2, height / 2, 0);
      this.doorLeafPivot.add(vaultDoorMesh);

      // 8-Spoke Rotating Vault Wheel Handle
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(width / 2, height / 2, 0.22);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16), goldTrimMat);
      hub.rotation.x = Math.PI / 2;
      wheelGroup.add(hub);

      for (let s = 0; s < 8; s++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), goldTrimMat);
        spoke.rotation.z = (s * Math.PI) / 4;
        wheelGroup.add(spoke);
      }

      this.vaultWheelMesh = hub;
      this.doorLeafPivot.add(wheelGroup);
      this.group.add(this.doorLeafPivot);

      // Electronic Keypad Terminal with Access Code display
      const keypad = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.55, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      keypad.position.set(width / 2 + 0.45, height / 2, 0.1);
      this.keypadLedMat = new THREE.MeshBasicMaterial({ color: this.isLocked ? 0xef4444 : 0x22c55e });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), this.keypadLedMat);
      led.position.set(width / 2 + 0.45, height / 2 + 0.18, 0.17);
      this.group.add(keypad);
      this.group.add(led);
    } else if (this.type === 'auto_glass' || this.type === 'shop_entrance') {
      // High-Tech Double Sliding Glass Store Entrance Panels
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.9,
      });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });

      // Left Sliding Glass Panel
      const panelGeo = new THREE.BoxGeometry(width / 2 - 0.05, height - 0.1, 0.08);
      const leftPanel = new THREE.Mesh(panelGeo, glassMat);
      leftPanel.position.set(-width / 4, height / 2, 0);

      const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(width / 2, 0.15, 0.1), trimMat);
      leftTrim.position.set(-width / 4, 0.1, 0);

      this.doorLeafPivot.add(leftPanel);
      this.doorLeafPivot.add(leftTrim);
      this.group.add(this.doorLeafPivot);

      // Right Sliding Glass Panel
      this.doorLeaf2Pivot = new THREE.Group();
      const rightPanel = new THREE.Mesh(panelGeo, glassMat);
      rightPanel.position.set(width / 4, height / 2, 0);

      const rightTrim = new THREE.Mesh(new THREE.BoxGeometry(width / 2, 0.15, 0.1), trimMat);
      rightTrim.position.set(width / 4, 0.1, 0);

      this.doorLeaf2Pivot.add(rightPanel);
      this.doorLeaf2Pivot.add(rightTrim);
      this.group.add(this.doorLeaf2Pivot);

      // Overhead Motion Sensor & Status LED
      const sensorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.2), trimMat);
      sensorMesh.position.set(0, height + 0.15, 0);
      this.keypadLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const sensorLed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), this.keypadLedMat);
      sensorLed.position.set(0, height + 0.12, 0.12);
      this.group.add(sensorMesh);
      this.group.add(sensorLed);
    } else {
      // Manual Wooden / Metal Door or Weak Wooden Door with Handle Mechanism
      const isWeak = this.category === 'weak' || this.type === 'weak_wood';
      const leafMat = isWeak
        ? new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9, metalness: 0.05 })
        : this.type === 'manual_wood'
        ? new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75, metalness: 0.1 })
        : new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.85 });

      const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });

      // Hinge Pivot is on left side
      this.doorLeafPivot.position.set(-width / 2, 0, 0);

      const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), leafMat);
      doorLeaf.position.set(width / 2, height / 2, 0);
      doorLeaf.castShadow = true;
      doorLeaf.receiveShadow = true;
      this.doorLeafPivot.add(doorLeaf);

      // Handle Assembly
      this.handlePivot = new THREE.Group();
      this.handlePivot.position.set(width - 0.25, height * 0.48, 0);

      const backplate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, thickness + 0.04), brassMat);
      this.handlePivot.add(backplate);

      const handleSpindle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), brassMat);
      handleSpindle.rotation.x = Math.PI / 2;
      handleSpindle.position.set(0, 0.06, 0.12);
      this.handlePivot.add(handleSpindle);

      const handleLever = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), brassMat);
      handleLever.position.set(0.1, 0.06, 0.18);
      this.handleMesh = handleLever;
      this.handlePivot.add(handleLever);

      const handleLeverBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), brassMat);
      handleLeverBack.position.set(0.1, 0.06, -0.18);
      this.handlePivot.add(handleLeverBack);

      this.doorLeafPivot.add(this.handlePivot);
      this.group.add(this.doorLeafPivot);

      // If security keycard or locked, add small electronic keypad with LED
      if (this.category === 'security' || this.requiredKeycard || this.category === 'locked') {
        const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.08), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        keypad.position.set(width / 2 + 0.35, height * 0.48, 0.08);
        this.keypadLedMat = new THREE.MeshBasicMaterial({ color: this.isLocked ? 0xef4444 : 0x22c55e });
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), this.keypadLedMat);
        led.position.set(width / 2 + 0.35, height * 0.48 + 0.1, 0.13);
        this.group.add(keypad);
        this.group.add(led);
      }
    }
  }

  public registerCollider(colliders: WorldObject[]) {
    const cWidth = this.category === 'garage' ? 5.8 : 2.4;
    const cHeight = this.category === 'garage' ? 3.8 : 3.2;

    const rad = this.rotationY;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const halfX = (cWidth / 2) * Math.abs(cos) + 0.4 * Math.abs(sin);
    const halfZ = (cWidth / 2) * Math.abs(sin) + 0.4 * Math.abs(cos);

    this.colliderObject = {
      mesh: this.group,
      type: 'prop',
      materialType: this.type === 'manual_wood' || this.type === 'weak_wood' ? 'wood' : this.type === 'auto_glass' || this.type === 'shop_entrance' ? 'glass' : 'metal',
      health: this.health,
      collider: {
        minX: this.position.x - halfX,
        maxX: this.position.x + halfX,
        minZ: this.position.z - halfZ,
        maxZ: this.position.z + halfZ,
        minY: this.position.y,
        maxY: this.position.y + cHeight,
      },
      onHit: (vel, particles) => {
        const dmg = Math.max(15, vel.length() * 4.0);
        this.takeDamage(dmg, particles, 'impact');
      },
    };

    colliders.push(this.colliderObject);
  }

  public updateCollider() {
    if (!this.colliderObject) return;
    if (this.state === 'open' || this.state === 'opening' || this.state === 'broken') {
      this.colliderObject.collider.minY = -100;
      this.colliderObject.collider.maxY = -90;
    } else {
      this.colliderObject.collider.minY = this.position.y;
      this.colliderObject.collider.maxY = this.position.y + (this.category === 'garage' ? 3.8 : 3.2);
    }
  }

  /**
   * Returns exact prompt text based on user requirements:
   * 🚪 Normal door    E OPEN / CLOSE
   * 🔒 Locked door    E LOCKPICK
   * 🪪 Security door  E USE KEYCARD
   * 💥 Weak door      F KICK BREACH
   * 🚗 Garage         E OPEN SHUTTER / CLOSE SHUTTER
   * 🛗 Elevator       E CALL ELEVATOR
   * 🏪 Shop           E ENTER
   * 🏦 Vault          E USE ACCESS CODE
   */
  public getInteractionPrompt(player: Player): string {
    if (this.state === 'broken') {
      return `${this.name} (Broken / Breached)`;
    }

    switch (this.category) {
      case 'vault':
        return `🏦 [E] USE ACCESS CODE (${this.name})`;

      case 'elevator':
        return `🛗 [E] CALL ELEVATOR ${this.targetFloorName ? `(${this.targetFloorName})` : ''}`;

      case 'garage':
        return this.state === 'open' || this.state === 'opening'
          ? `🚗 [E] CLOSE SHUTTER (${this.name})`
          : `🚗 [E] OPEN SHUTTER (${this.name})`;

      case 'shop':
        return this.state === 'open'
          ? `🏪 [E] EXIT SHOP (${this.name})`
          : `🏪 [E] ENTER (${this.name})`;

      case 'weak':
        return `💥 [F] KICK BREACH • [E] OPEN (${this.name})`;

      case 'locked':
        return `🔒 [E] LOCKPICK • [F] KICK BREACH (${this.name})`;

      case 'security': {
        const reqKey = this.requiredKeycard;
        const keyDef = reqKey ? KEYCARDS[reqKey] : null;
        const hasKey = reqKey && player.hasKeycard(reqKey);
        if (hasKey) {
          return `🪪 [E] USE KEYCARD (${keyDef?.name || 'Authorized'}) • [F] KICK BREACH`;
        } else {
          return `🪪 [E] USE KEYCARD (Requires [${keyDef?.name || 'Security Keycard'}]) • [F] KICK BREACH`;
        }
      }

      case 'normal':
      default:
        return this.state === 'open' || this.state === 'opening'
          ? `🚪 [E] CLOSE (${this.name})`
          : `🚪 [E] OPEN (${this.name})`;
    }
  }

  public interact(player: Player, particles: ParticleSystem): { success: boolean; message: string } {
    if (this.state === 'broken') {
      return { success: true, message: 'Door is broken.' };
    }

    // 1. Vault Door (E USE ACCESS CODE)
    if (this.category === 'vault') {
      soundEngine.playAccessCodeKeypad();
      this.isLocked = false;
      if (this.keypadLedMat) this.keypadLedMat.color.setHex(0x22c55e);

      setTimeout(() => {
        this.open();
      }, 500);

      return {
        success: true,
        message: `🏦 Access Code [7-4-1-9-2] Verified: 8-Spoke Heavy Vault Unlocked!`,
      };
    }

    // 2. Elevator (E CALL ELEVATOR)
    if (this.category === 'elevator') {
      soundEngine.playElevatorDing();
      this.open();

      if (this.targetFloor) {
        setTimeout(() => {
          player.position.copy(this.targetFloor!);
          soundEngine.playElevatorDing();
        }, 1200);

        return {
          success: true,
          message: `🛗 Elevator arrived! Transporting to ${this.targetFloorName || 'Destination Floor'}...`,
        };
      }

      return { success: true, message: `🛗 Elevator called.` };
    }

    // 3. Locked Door (E LOCKPICK)
    if (this.category === 'locked' && this.isLocked) {
      soundEngine.playLockpicking();
      this.isLocked = false;
      if (this.keypadLedMat) this.keypadLedMat.color.setHex(0x22c55e);

      setTimeout(() => {
        this.open();
      }, 600);

      return {
        success: true,
        message: `🔓 Lock picked successfully! ${this.name} unlocked.`,
      };
    }

    // 4. Security Door (E USE KEYCARD)
    if (this.category === 'security' && this.isLocked) {
      const requiredKey = this.requiredKeycard;
      const hasKey = requiredKey && player.hasKeycard(requiredKey);

      if (hasKey) {
        this.isLocked = false;
        if (this.keypadLedMat) this.keypadLedMat.color.setHex(0x22c55e);
        soundEngine.playKeycardSuccess();
        const keyDef = KEYCARDS[requiredKey];
        const keyName = keyDef ? keyDef.name : 'Security Keycard';

        this.open();
        return { success: true, message: `🪪 Access Granted: Swiped [${keyName}]!` };
      } else {
        soundEngine.playDoorLockedRattle();
        soundEngine.playKeycardDenied();
        this.shakeHandle();
        const keyDef = requiredKey ? KEYCARDS[requiredKey] : null;
        const keyName = keyDef ? keyDef.name : 'Security Keycard';
        return {
          success: false,
          message: `🪪 Access Denied! Requires [${keyName}]. (Kick with [F] to Breach!)`,
        };
      }
    }

    // 5. Garage Shutter (E OPEN SHUTTER / CLOSE SHUTTER)
    if (this.category === 'garage') {
      if (this.state === 'closed' || this.state === 'closing') {
        this.open();
        soundEngine.playGarageShutter(true);
        return { success: true, message: `🚗 Opened motorized shutter: ${this.name}` };
      } else {
        this.close();
        soundEngine.playGarageShutter(false);
        return { success: true, message: `🚗 Closed motorized shutter: ${this.name}` };
      }
    }

    // 6. Shop Entrance (E ENTER)
    if (this.category === 'shop') {
      if (this.state === 'closed' || this.state === 'closing') {
        this.open();
        return { success: true, message: `🏪 Entered ${this.name}` };
      } else {
        this.close();
        return { success: true, message: `🏪 Exited ${this.name}` };
      }
    }

    // 7. Normal / Weak Doors
    if (this.state === 'closed' || this.state === 'closing') {
      this.open();
      return { success: true, message: `Opened ${this.name}` };
    } else {
      this.close();
      return { success: true, message: `Closed ${this.name}` };
    }
  }

  public open() {
    if (this.state === 'broken') return;
    this.state = 'opening';
    this.handleAnimTimer = 0.35;

    if (this.category === 'garage') {
      soundEngine.playGarageShutter(true);
    } else if (this.category === 'elevator') {
      soundEngine.playElevatorDing();
    } else {
      const soundType =
        this.type === 'auto_glass' || this.type === 'shop_entrance'
          ? 'glass_auto'
          : this.category === 'vault' || this.type === 'vault_metal'
          ? 'vault'
          : this.type === 'manual_metal'
          ? 'metal'
          : 'wood';

      soundEngine.playDoorHandleTurn();
      setTimeout(() => {
        soundEngine.playDoorOpen(soundType);
      }, 120);
    }

    this.updateCollider();
  }

  public close() {
    if (this.state === 'broken') return;
    this.state = 'closing';

    if (this.category === 'garage') {
      soundEngine.playGarageShutter(false);
    } else {
      const soundType =
        this.type === 'auto_glass' || this.type === 'shop_entrance'
          ? 'glass_auto'
          : this.category === 'vault' || this.type === 'vault_metal'
          ? 'vault'
          : this.type === 'manual_metal'
          ? 'metal'
          : 'wood';

      soundEngine.playDoorClose(soundType);
    }
  }

  public shakeHandle() {
    this.handleAnimTimer = 0.4;
  }

  public kickBreach(player: Player, particles: ParticleSystem): { destroyed: boolean; message: string } {
    if ((this.state as DoorState) === 'broken') return { destroyed: true, message: 'Already broken.' };

    soundEngine.playDoorKickBreach();
    const kickDamage = this.category === 'weak' ? 150 : 130;
    this.takeDamage(kickDamage, particles, 'kick');

    if ((this.state as DoorState) === 'broken' || this.health <= 0) {
      return { destroyed: true, message: `💥 Breached and smashed open ${this.name}!` };
    } else {
      return {
        destroyed: false,
        message: `Kicked door! Integrity: ${Math.round((this.health / this.maxHealth) * 100)}%`,
      };
    }
  }

  public takeDamage(dmg: number, particles: ParticleSystem, source: 'kick' | 'bullet' | 'explosion' | 'impact' = 'bullet') {
    if (this.state === 'broken') return;
    this.health -= dmg;

    const centerPos = this.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const matType = this.type === 'manual_wood' || this.type === 'weak_wood' ? 'wood' : this.type === 'auto_glass' || this.type === 'shop_entrance' ? 'glass' : 'metal';
    particles.emitDestructionDebris(centerPos, matType, Math.min(22, Math.floor(dmg / 5) + 4));

    if (this.health <= 0) {
      this.breakDoor(particles);
    }
  }

  public breakDoor(particles: ParticleSystem) {
    this.state = 'broken';
    this.health = 0;
    const centerPos = this.position.clone().add(new THREE.Vector3(0, 1.6, 0));

    if (this.type === 'auto_glass' || this.type === 'shop_entrance') {
      soundEngine.playDoorShatter();
      particles.emitDestructionDebris(centerPos, 'glass', 35);
      this.doorLeafPivot.visible = false;
      if (this.doorLeaf2Pivot) this.doorLeaf2Pivot.visible = false;
    } else {
      soundEngine.playDoorKickBreach();
      particles.emitDestructionDebris(centerPos, this.type === 'manual_wood' || this.type === 'weak_wood' ? 'wood' : 'metal', 30);

      this.doorLeafPivot.rotation.z = 0.45;
      this.doorLeafPivot.rotation.y = this.swingMaxAngle * 1.2;
      this.doorLeafPivot.position.y = 0.1;
    }

    this.updateCollider();
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    npcPositions: THREE.Vector3[],
    particles: ParticleSystem
  ) {
    // 1. Automatic Proximity Sensor for Auto Doors & Shops
    if (this.isAutomatic && this.state !== 'broken') {
      const distToPlayer = this.position.distanceTo(playerPos);
      let entityNearby = distToPlayer < this.sensorRadius;

      if (!entityNearby) {
        for (const np of npcPositions) {
          if (this.position.distanceTo(np) < this.sensorRadius) {
            entityNearby = true;
            break;
          }
        }
      }

      if (entityNearby) {
        if (this.state === 'closed' || this.state === 'closing') {
          this.open();
        }
        this.autoCloseTimer = this.autoCloseDelay;
      } else {
        if (this.state === 'open') {
          this.autoCloseTimer -= delta;
          if (this.autoCloseTimer <= 0) {
            this.close();
          }
        }
      }
    }

    // 2. Handle Depressing & Turning Animation
    if (this.handleAnimTimer > 0) {
      this.handleAnimTimer -= delta;
      this.handleAngle = -Math.PI * 0.2 * Math.sin((1 - this.handleAnimTimer / 0.35) * Math.PI);
    } else {
      this.handleAngle = 0;
    }

    if (this.handleMesh) {
      this.handleMesh.rotation.z = this.handleAngle;
    }

    // 3. Vault Wheel 360 Rotation Animation
    if ((this.category === 'vault' || this.type === 'vault_metal') && (this.state === 'opening' || this.state === 'closing')) {
      this.vaultWheelAngle += delta * 4.0;
      if (this.vaultWheelMesh) {
        this.vaultWheelMesh.rotation.z = this.vaultWheelAngle;
      }
    }

    // 4. Smooth Open / Close Animation for All Door Types
    if (this.state === 'opening') {
      const speed = this.category === 'garage' ? 1.2 : this.type === 'auto_glass' || this.type === 'elevator' ? 2.2 : 1.6;
      this.openProgress += delta * speed;
      if (this.openProgress >= 1.0) {
        this.openProgress = 1.0;
        this.state = 'open';
        this.updateCollider();
      }
    } else if (this.state === 'closing') {
      const speed = this.category === 'garage' ? 1.2 : this.type === 'auto_glass' || this.type === 'elevator' ? 2.2 : 1.6;
      this.openProgress -= delta * speed;
      if (this.openProgress <= 0.0) {
        this.openProgress = 0.0;
        this.state = 'closed';
        this.updateCollider();
      }
    }

    // Apply animation transforms
    if (this.state !== 'broken') {
      if (this.category === 'garage') {
        // Vertical lift up into roll box
        const lift = this.openProgress * this.shutterMaxHeight;
        this.doorLeafPivot.position.y = lift;
      } else if (this.type === 'auto_glass' || this.type === 'elevator' || this.type === 'shop_entrance') {
        // Sliding double doors
        const offset = this.openProgress * this.slideDistance;
        this.doorLeafPivot.position.x = -offset;
        if (this.doorLeaf2Pivot) {
          this.doorLeaf2Pivot.position.x = offset;
        }
      } else {
        // Hinge swing rotation
        const ease = 1 - Math.pow(1 - this.openProgress, 3);
        this.doorLeafPivot.rotation.y = ease * this.swingMaxAngle;
      }
    }
  }
}

export class DoorSystem {
  public scene: THREE.Scene;
  public doors: Door[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addDoor(params: {
    id: string;
    name: string;
    category?: DoorCategory;
    type: DoorType;
    position: THREE.Vector3;
    rotationY?: number;
    isLocked?: boolean;
    requiredKeycard?: string | null;
    health?: number;
    isAutomatic?: boolean;
    sensorRadius?: number;
    targetFloor?: THREE.Vector3;
    targetFloorName?: string;
  }): Door {
    const door = new Door(this.scene, params);
    this.doors.push(door);
    return door;
  }

  public registerAllColliders(colliders: WorldObject[]) {
    this.doors.forEach((d) => d.registerCollider(colliders));
  }

  public getClosestDoor(pos: THREE.Vector3, maxDist = 3.5): Door | null {
    let closest: Door | null = null;
    let minD = maxDist;

    this.doors.forEach((d) => {
      const dist = pos.distanceTo(d.position);
      if (dist < minD) {
        minD = dist;
        closest = d;
      }
    });

    return closest;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    npcPositions: THREE.Vector3[],
    particles: ParticleSystem
  ) {
    this.doors.forEach((d) => d.update(delta, playerPos, npcPositions, particles));
  }
}
