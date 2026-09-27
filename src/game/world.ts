import * as THREE from 'three';
import { ParticleSystem } from './particles';

export interface WorldObject {
  mesh: THREE.Object3D;
  type: 'building' | 'prop' | 'explosive_barrel' | 'pickup' | 'ramp' | 'hydrant' | 'atm' | 'tree' | 'traffic_light' | 'barrier';
  collider: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
    maxY: number;
    radius?: number;
  };
  pickupType?: 'health' | 'armor' | 'cash' | 'weapon' | 'rpg';
  pickupValue?: number | string;
  health?: number;
  isDead?: boolean;
  isDestroyed?: boolean;
  materialType?: 'metal' | 'wood' | 'glass' | 'concrete';
  onHit?: (impactVel: THREE.Vector3, particles: ParticleSystem) => void;
  // Stunt Ramp Attributes
  rampAngle?: number;
  rampLaunchAngle?: number;
  rampBoost?: number;
  rampRot?: number;
  rampLength?: number;
  rampHeight?: number;
  rampHalfWidth?: number;
  rampApexPos?: THREE.Vector3;
}

export interface RoadWaypoint {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  lane: number;
  isIntersection?: boolean;
  axis?: 'x' | 'z';
}

export interface TrafficLightSystem {
  id: string;
  x: number;
  z: number;
  state: 'NS_GREEN' | 'NS_YELLOW' | 'EW_GREEN' | 'EW_YELLOW';
  timer: number;
  nsMaterials: { red: THREE.MeshBasicMaterial; yellow: THREE.MeshBasicMaterial; green: THREE.MeshBasicMaterial }[];
  ewMaterials: { red: THREE.MeshBasicMaterial; yellow: THREE.MeshBasicMaterial; green: THREE.MeshBasicMaterial }[];
}

export class WorldGenerator {
  public scene: THREE.Scene;
  public colliders: WorldObject[] = [];
  public destructibles: WorldObject[] = [];
  public pickups: WorldObject[] = [];
  public explosiveBarrels: WorldObject[] = [];
  public roadWaypoints: RoadWaypoint[] = [];
  public trafficLights: TrafficLightSystem[] = [];
  
  // Materials for wet road reflection management
  public roadMaterials: THREE.MeshStandardMaterial[] = [];
  public groundMesh!: THREE.Mesh;
  
  // Dynamic Night Lights
  public streetLights: { light: THREE.Light; bulb: THREE.Mesh }[] = [];
  public buildingWindows: THREE.MeshBasicMaterial[] = [];
  public aviationBeacons: { mesh: THREE.Mesh; light?: THREE.PointLight }[] = [];
  public neonSigns: { mesh: THREE.Mesh; baseIntensity: number }[] = [];

  public safehouses: { x: number; z: number; name: string }[] = [];
  public payNSpray: { x: number; z: number; radius: number } = { x: -80, z: 80, radius: 14 };
  public bankLocation = { x: 0, y: 0, z: -150 };

  private beaconTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public buildWorld() {
    this.createGround();
    this.createRoadNetwork();
    this.createDistricts();
    this.createInteractiveProps();
    this.createPickups();
    this.createStuntRamps();
    this.createSafehouses();
  }

  private createGround() {
    // Massive city terrain grid with high-fidelity PBR asphalt & grass
    const groundGeo = new THREE.PlaneGeometry(1200, 1200, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.15,
    });
    this.roadMaterials.push(groundMat);
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Ocean on the West edge (Marina Beach) with specular shoreline
    const waterGeo = new THREE.PlaneGeometry(600, 1200);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.05,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(-600, -0.3, 0);
    water.rotation.x = -Math.PI / 2;
    this.scene.add(water);
  }

  private createRoadNetwork() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x18202f,
      roughness: 0.75,
      metalness: 0.2,
    });
    this.roadMaterials.push(roadMat);

    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });

    // Main Avenue Grid (Multi-lane North-South and East-West boulevards)
    const roadWidth = 26;
    const roadCoords = [
      { axis: 'z' as const, pos: 0, length: 800 },
      { axis: 'z' as const, pos: 160, length: 800 },
      { axis: 'z' as const, pos: -160, length: 800 },
      { axis: 'z' as const, pos: 320, length: 600 },
      { axis: 'x' as const, pos: 0, length: 800 },
      { axis: 'x' as const, pos: 180, length: 800 },
      { axis: 'x' as const, pos: -180, length: 800 },
      { axis: 'x' as const, pos: -320, length: 600 },
    ];

    roadCoords.forEach((r) => {
      let geo: THREE.PlaneGeometry;
      let x = 0, z = 0;
      if (r.axis === 'z') {
        geo = new THREE.PlaneGeometry(roadWidth, r.length);
        x = r.pos;
      } else {
        geo = new THREE.PlaneGeometry(r.length, roadWidth);
        z = r.pos;
      }
      const road = new THREE.Mesh(geo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.05, z);
      road.receiveShadow = true;
      this.scene.add(road);

      // Yellow Center Double Dash Markings
      const dashCount = Math.floor(r.length / 14);
      for (let i = 0; i < dashCount; i++) {
        const offset = -r.length / 2 + i * 14 + 7;
        const dashGeo = r.axis === 'z' ? new THREE.PlaneGeometry(0.6, 6) : new THREE.PlaneGeometry(6, 0.6);
        const dash1 = new THREE.Mesh(dashGeo, yellowMat);
        dash1.rotation.x = -Math.PI / 2;

        if (r.axis === 'z') {
          dash1.position.set(x, 0.06, offset);
          // Multi-lane waypoint navigation for traffic AI
          this.roadWaypoints.push({ x: x - 5.5, z: offset, dirX: 0, dirZ: 1, lane: 0, axis: 'z' });
          this.roadWaypoints.push({ x: x + 5.5, z: offset, dirX: 0, dirZ: -1, lane: 1, axis: 'z' });
        } else {
          dash1.position.set(offset, 0.06, z);
          this.roadWaypoints.push({ x: offset, z: z - 5.5, dirX: 1, dirZ: 0, lane: 0, axis: 'x' });
          this.roadWaypoints.push({ x: offset, z: z + 5.5, dirX: -1, dirZ: 0, lane: 1, axis: 'x' });
        }
        this.scene.add(dash1);
      }

      // Concrete Sidewalk Curbs with ADA Ramps
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
      this.roadMaterials.push(sidewalkMat);

      const curbGeo = r.axis === 'z' ? new THREE.BoxGeometry(3.5, 0.35, r.length) : new THREE.BoxGeometry(r.length, 0.35, 3.5);
      const curb1 = new THREE.Mesh(curbGeo, sidewalkMat);
      const curb2 = new THREE.Mesh(curbGeo, sidewalkMat);
      curb1.receiveShadow = true;
      curb2.receiveShadow = true;

      if (r.axis === 'z') {
        curb1.position.set(x - roadWidth / 2 - 1.75, 0.18, 0);
        curb2.position.set(x + roadWidth / 2 + 1.75, 0.18, 0);
      } else {
        curb1.position.set(0, 0.18, z - roadWidth / 2 - 1.75);
        curb2.position.set(0, 0.18, z + roadWidth / 2 + 1.75);
      }
      this.scene.add(curb1);
      this.scene.add(curb2);
    });

    // Create 4-Way Traffic Lights at main Avenue Intersections
    const intersections = [
      { x: 0, z: 0 },
      { x: 160, z: 0 },
      { x: -160, z: 0 },
      { x: 0, z: 180 },
      { x: 0, z: -180 },
      { x: 160, z: 180 },
      { x: -160, z: -180 },
    ];

    intersections.forEach((inter) => {
      this.createIntersectionTrafficLights(inter.x, inter.z);
    });

    // Elevated Highway Overpass
    this.createElevatedHighway();
  }

  private createIntersectionTrafficLights(x: number, z: number) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

    const system: TrafficLightSystem = {
      id: `tl_${x}_${z}`,
      x,
      z,
      state: Math.random() > 0.5 ? 'NS_GREEN' : 'EW_GREEN',
      timer: 0,
      nsMaterials: [],
      ewMaterials: [],
    };

    // 4 Corner Traffic Light Poles
    const offsets = [
      { dx: 14, dz: 14, rot: Math.PI, isNS: true },
      { dx: -14, dz: 14, rot: Math.PI / 2, isNS: false },
      { dx: -14, dz: -14, rot: 0, isNS: true },
      { dx: 14, dz: -14, rot: -Math.PI / 2, isNS: false },
    ];

    offsets.forEach((off) => {
      const poleGroup = new THREE.Group();
      poleGroup.position.set(x + off.dx, 0, z + off.dz);
      poleGroup.rotation.y = off.rot;

      // Vertical post
      const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 6.5, 8), postMat);
      poleMesh.position.y = 3.25;
      poleGroup.add(poleMesh);

      // Horizontal mast arm over lane
      const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), postMat);
      armMesh.rotation.z = Math.PI / 2;
      armMesh.position.set(-2.8, 6.2, 0);
      poleGroup.add(armMesh);

      // Traffic Signal Box
      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.5), housingMat);
      boxMesh.position.set(-4.5, 5.8, 0);
      poleGroup.add(boxMesh);

      // Red, Yellow, Green Lenses
      const redMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
      const yellowMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x003300 });

      const redLens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), redMat);
      redLens.position.set(-4.5, 6.3, 0.26);
      poleGroup.add(redLens);

      const yellowLens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), yellowMat);
      yellowLens.position.set(-4.5, 5.8, 0.26);
      poleGroup.add(yellowLens);

      const greenLens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), greenMat);
      greenLens.position.set(-4.5, 5.3, 0.26);
      poleGroup.add(greenLens);

      if (off.isNS) {
        system.nsMaterials.push({ red: redMat, yellow: yellowMat, green: greenMat });
      } else {
        system.ewMaterials.push({ red: redMat, yellow: yellowMat, green: greenMat });
      }

      this.scene.add(poleGroup);

      // Add to destructible objects
      const destructible: WorldObject = {
        mesh: poleGroup,
        type: 'traffic_light',
        materialType: 'metal',
        health: 50,
        collider: {
          minX: x + off.dx - 1,
          maxX: x + off.dx + 1,
          minZ: z + off.dz - 1,
          maxZ: z + off.dz + 1,
          minY: 0,
          maxY: 7,
        },
        onHit: (vel, particles) => {
          poleGroup.rotation.z += 0.8;
          poleGroup.position.y -= 1.0;
          particles.emitDestructionDebris(poleGroup.position, 'metal', 10);
        },
      };
      this.colliders.push(destructible);
      this.destructibles.push(destructible);
    });

    this.trafficLights.push(system);
  }

  private createElevatedHighway() {
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const railingMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.4 });

    const hwLength = 400;
    const hwWidth = 20;
    const hwGeo = new THREE.BoxGeometry(hwLength, 1.5, hwWidth);
    const hw = new THREE.Mesh(hwGeo, bridgeMat);
    hw.position.set(80, 14, -80);
    hw.castShadow = true;
    hw.receiveShadow = true;
    this.scene.add(hw);

    this.colliders.push({
      mesh: hw,
      type: 'building',
      collider: {
        minX: 80 - hwLength / 2,
        maxX: 80 + hwLength / 2,
        minZ: -80 - hwWidth / 2,
        maxZ: -80 + hwWidth / 2,
        minY: 13,
        maxY: 16,
      },
    });

    // Support pillars
    for (let x = -100; x <= 260; x += 60) {
      const pillarGeo = new THREE.CylinderGeometry(2, 2.5, 14, 12);
      const pillar = new THREE.Mesh(pillarGeo, bridgeMat);
      pillar.position.set(x, 7, -80);
      pillar.castShadow = true;
      this.scene.add(pillar);

      this.colliders.push({
        mesh: pillar,
        type: 'prop',
        collider: { minX: x - 2, maxX: x + 2, minZ: -82, maxZ: -78, minY: 0, maxY: 14 },
      });
    }

    // Glowing cyan guardrails
    const railGeo = new THREE.BoxGeometry(hwLength, 1.2, 0.6);
    const rail1 = new THREE.Mesh(railGeo, railingMat);
    rail1.position.set(80, 15.2, -80 - hwWidth / 2 + 0.3);
    const rail2 = new THREE.Mesh(railGeo, railingMat);
    rail2.position.set(80, 15.2, -80 + hwWidth / 2 - 0.3);
    this.scene.add(rail1);
    this.scene.add(rail2);

    // Entry Ramp to Highway
    const rampGeo = new THREE.BoxGeometry(80, 1.2, 18);
    const ramp = new THREE.Mesh(rampGeo, bridgeMat);
    ramp.position.set(-150, 7, -80);
    ramp.rotation.z = 0.175;
    this.scene.add(ramp);
    this.colliders.push({
      mesh: ramp,
      type: 'ramp',
      collider: { minX: -190, maxX: -110, minZ: -89, maxZ: -71, minY: 0, maxY: 14 },
    });
  }

  private createDistricts() {
    this.createDowntownMetropolis();
    this.createCommercialStripAndGasStation();
    this.createCentralPark();
    this.createIndustrialDocks();
    this.createCentralBank();
    this.createServicesDistrict();
    this.createMarinaPromenade();
  }

  private createDowntownMetropolis() {
    const buildingPalettes = [0x1e293b, 0x0f172a, 0x1e1b4b, 0x18181b, 0x312e81, 0x0c4a6e, 0x27272a];
    const neonPalettes = [0x06b6d4, 0xec4899, 0xf59e0b, 0x8b5cf6, 0x10b981, 0x3b82f6];

    const skyscrapers = [
      // Core Downtown Towers
      { x: 80, z: -80, w: 45, d: 45, h: 155, neon: 0x06b6d4, sign: 'CYBER CORP', spire: true },
      { x: 80, z: 80, w: 50, d: 40, h: 125, neon: 0xec4899, sign: 'NEXUS TOWER', helipad: true },
      { x: -80, z: -80, w: 42, d: 46, h: 140, neon: 0x8b5cf6, sign: 'APEX HOLDINGS', spire: true },
      { x: 80, z: -220, w: 45, d: 45, h: 105, neon: 0xf59e0b, sign: 'SOLARIS ENERGY' },
      { x: -80, z: -220, w: 52, d: 52, h: 175, neon: 0x10b981, sign: 'AETHER PLAZA', spire: true, helipad: true },
      // Midtown High-Rises
      { x: 240, z: -80, w: 40, d: 40, h: 90, neon: 0x06b6d4, sign: 'QUANTUM LABS' },
      { x: 240, z: 80, w: 45, d: 40, h: 85, neon: 0xec4899 },
      { x: 240, z: -220, w: 38, d: 45, h: 100, neon: 0xf59e0b, spire: true },
      { x: -80, z: 220, w: 40, d: 40, h: 80, neon: 0x8b5cf6 },
      { x: 80, z: 220, w: 45, d: 45, h: 95, neon: 0x06b6d4 },
      // Penthouse Sniper Nest
      { x: -120, z: -80, w: 32, d: 32, h: 38, neon: 0xec4899, sign: 'VIP PENTHOUSE' },
    ];

    skyscrapers.forEach((b, idx) => {
      const col = buildingPalettes[idx % buildingPalettes.length];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.35,
        metalness: 0.65,
      });

      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Window Matrix Emissive Texture / Grids
      this.addSkyscraperWindows(b.x, b.h, b.z, b.w, b.d, b.neon);

      // Rooftop Architectural Crown / Helipad
      if (b.helipad) {
        const padGeo = new THREE.CylinderGeometry(8, 8, 0.4, 16);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(b.x, b.h + 0.2, b.z);
        this.scene.add(pad);

        const ringGeo = new THREE.RingGeometry(6.5, 7.5, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(b.x, b.h + 0.45, b.z);
        this.scene.add(ring);
      }

      // Spire with Blinking Red Aviation Warning Light
      if (b.spire) {
        const spireMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 1.2, 22, 8),
          new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })
        );
        spireMesh.position.set(b.x, b.h + 11, b.z);
        this.scene.add(spireMesh);

        const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.set(b.x, b.h + 22.5, b.z);
        this.scene.add(beaconMesh);

        const beaconLight = new THREE.PointLight(0xef4444, 2.0, 30);
        beaconLight.position.set(b.x, b.h + 22.5, b.z);
        this.scene.add(beaconLight);

        this.aviationBeacons.push({ mesh: beaconMesh, light: beaconLight });
      }

      // Holographic Signboard
      if (b.sign) {
        this.createHolographicSign(b.x, b.h * 0.75, b.z + b.d / 2 + 1.2, b.sign, b.neon);
      }

      this.colliders.push({
        mesh,
        type: 'building',
        collider: {
          minX: b.x - b.w / 2,
          maxX: b.x + b.w / 2,
          minZ: b.z - b.d / 2,
          maxZ: b.z + b.d / 2,
          minY: 0,
          maxY: b.h,
        },
      });
    });
  }

  private addSkyscraperWindows(x: number, h: number, z: number, w: number, d: number, neonHex: number) {
    // Front and Back Glowing Window Panes
    const windowMat = new THREE.MeshBasicMaterial({
      color: neonHex,
      transparent: true,
      opacity: 0.75,
    });
    this.buildingWindows.push(windowMat);

    const levels = Math.floor(h / 8);
    for (let i = 1; i < levels; i++) {
      const y = i * 8;
      // Front strip
      const stripGeoF = new THREE.BoxGeometry(w * 0.75, 2.2, 0.4);
      const stripF = new THREE.Mesh(stripGeoF, windowMat);
      stripF.position.set(x, y, z + d / 2 + 0.1);
      this.scene.add(stripF);

      // Back strip
      const stripB = new THREE.Mesh(stripGeoF, windowMat);
      stripB.position.set(x, y, z - d / 2 - 0.1);
      this.scene.add(stripB);
    }
  }

  private createHolographicSign(x: number, y: number, z: number, text: string, colorHex: number) {
    const signGeo = new THREE.BoxGeometry(26, 6, 0.5);
    const signMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(x, y, z);
    this.scene.add(signMesh);
    this.neonSigns.push({ mesh: signMesh, baseIntensity: 0.85 });
  }

  private createCommercialStripAndGasStation() {
    // 1. Fully Modelled Gas Station at (x: -180, z: 0)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(32, 1.5, 22), canopyMat);
    canopy.position.set(-180, 7, 0);
    this.scene.add(canopy);

    // Canopy Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    [-10, 10].forEach((px) => {
      [-6, 6].forEach((pz) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 12), pillarMat);
        pillar.position.set(-180 + px, 3.5, pz);
        this.scene.add(pillar);
      });
    });

    // 4 Gas Pumps (Explosive when rammed or shot!)
    const pumpGeo = new THREE.BoxGeometry(1.6, 2.8, 1.2);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7, roughness: 0.3 });

    [-6, 6].forEach((px) => {
      [-3, 3].forEach((pz) => {
        const pump = new THREE.Mesh(pumpGeo, pumpMat);
        pump.position.set(-180 + px, 1.4, pz);
        this.scene.add(pump);

        const obj: WorldObject = {
          mesh: pump,
          type: 'explosive_barrel',
          health: 30,
          collider: {
            minX: -180 + px - 0.8,
            maxX: -180 + px + 0.8,
            minZ: pz - 0.6,
            maxZ: pz + 0.6,
            minY: 0,
            maxY: 2.8,
          },
        };
        this.colliders.push(obj);
        this.explosiveBarrels.push(obj);
      });
    });

    // Convenience Store Building behind pumps
    const storeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const store = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 18), storeMat);
    store.position.set(-180, 4, 25);
    this.scene.add(store);

    this.createHolographicSign(-180, 8.5, 15.5, '24/7 MART & GAS', 0xf59e0b);

    this.colliders.push({
      mesh: store,
      type: 'building',
      collider: { minX: -193, maxX: -167, minZ: 16, maxZ: 34, minY: 0, maxY: 8 },
    });
  }

  private createCentralPark() {
    // City Central Park with lawns, trees, benches at (x: 80, z: -150)
    const parkGrassMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.9,
      metalness: 0.1,
    });
    const grassPatch = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), parkGrassMat);
    grassPatch.rotation.x = -Math.PI / 2;
    grassPatch.position.set(80, 0.08, -150);
    this.scene.add(grassPatch);

    // Park Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });

    for (let i = 0; i < 14; i++) {
      const tx = 55 + (i % 4) * 16 + (Math.random() - 0.5) * 4;
      const tz = -175 + Math.floor(i / 4) * 16 + (Math.random() - 0.5) * 4;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 6, 8), trunkMat);
      trunk.position.y = 3;
      tree.add(trunk);

      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5), leavesMat);
      crown.position.y = 7;
      tree.add(crown);

      tree.position.set(tx, 0, tz);
      this.scene.add(tree);

      this.colliders.push({
        mesh: tree,
        type: 'tree',
        collider: { minX: tx - 1, maxX: tx + 1, minZ: tz - 1, maxZ: tz + 1, minY: 0, maxY: 9 },
      });
    }

    // Park Benches
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
    [
      { x: 70, z: -150, rot: 0 },
      { x: 90, z: -150, rot: Math.PI },
      { x: 80, z: -140, rot: Math.PI / 2 },
    ].forEach((bp) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1), benchMat);
      bench.position.set(bp.x, 0.5, bp.z);
      bench.rotation.y = bp.rot;
      this.scene.add(bench);
    });
  }

  private createCentralBank() {
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.3, metalness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.3,
    });

    const bankBuilding = new THREE.Mesh(new THREE.BoxGeometry(60, 28, 50), bankMat);
    bankBuilding.position.set(0, 14, -150);
    bankBuilding.castShadow = true;
    bankBuilding.receiveShadow = true;
    this.scene.add(bankBuilding);

    // Bank Columns
    for (let c = -20; c <= 20; c += 10) {
      const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 26, 16), goldMat);
      colMesh.position.set(c, 13, -123);
      colMesh.castShadow = true;
      this.scene.add(colMesh);
    }

    this.colliders.push({
      mesh: bankBuilding,
      type: 'building',
      collider: { minX: -30, maxX: 30, minZ: -175, maxZ: -125, minY: 0, maxY: 28 },
    });
  }

  private createIndustrialDocks() {
    const dockColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x64748b];
    // Stacked shipping containers
    for (let i = 0; i < 18; i++) {
      const row = i % 6;
      const stack = Math.floor(i / 6);
      const col = dockColors[i % dockColors.length];

      const contGeo = new THREE.BoxGeometry(14, 5.5, 6);
      const contMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0.4 });
      const cont = new THREE.Mesh(contGeo, contMat);
      const cx = -260 + row * 16 + (stack % 2) * 4;
      const cy = 2.75 + stack * 5.6;
      const cz = 160 + (i % 3) * 18;
      cont.position.set(cx, cy, cz);
      cont.castShadow = true;
      cont.receiveShadow = true;
      this.scene.add(cont);

      this.colliders.push({
        mesh: cont,
        type: 'prop',
        collider: { minX: cx - 7, maxX: cx + 7, minZ: cz - 3, maxZ: cz + 3, minY: cy - 2.75, maxY: cy + 2.75 },
      });
    }

    // Industrial Warehouse
    const whMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const wh = new THREE.Mesh(new THREE.BoxGeometry(50, 20, 60), whMat);
    wh.position.set(-220, 10, 240);
    wh.castShadow = true;
    this.scene.add(wh);
    this.colliders.push({
      mesh: wh,
      type: 'building',
      collider: { minX: -245, maxX: -195, minZ: 210, maxZ: 270, minY: 0, maxY: 20 },
    });
  }

  private createServicesDistrict() {
    // Pay 'n' Spray Garage (Repairs Car & Clears Wanted Stars)
    const sprayMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
    const garage = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 20), sprayMat);
    garage.position.set(-80, 5, 80);
    this.scene.add(garage);

    this.createHolographicSign(-80, 11, 69.5, "PAY 'N' SPRAY REPAIR", 0x34d399);

    // Ammu-Nation Weapon Superstore
    const ammuMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
    const ammu = new THREE.Mesh(new THREE.BoxGeometry(32, 12, 26), ammuMat);
    ammu.position.set(-180, 6, -80);
    this.scene.add(ammu);

    this.createHolographicSign(-180, 13, -66.5, 'AMMU-NATION ARSENAL', 0xef4444);

    this.colliders.push({
      mesh: garage,
      type: 'building',
      collider: { minX: -92, maxX: -68, minZ: 70, maxZ: 90, minY: 0, maxY: 10 },
    });

    this.colliders.push({
      mesh: ammu,
      type: 'building',
      collider: { minX: -196, maxX: -164, minZ: -93, maxZ: -67, minY: 0, maxY: 12 },
    });
  }

  private createMarinaPromenade() {
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d });

    for (let z = -250; z <= 250; z += 35) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 12, 8), palmTrunkMat);
      trunk.position.set(-310, 6, z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      trunk.castShadow = true;
      this.scene.add(trunk);

      for (let l = 0; l < 5; l++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 5), palmLeafMat);
        leaf.position.set(-310, 12, z);
        leaf.rotation.z = Math.PI / 2 + 0.4;
        leaf.rotation.y = (l * Math.PI * 2) / 5;
        this.scene.add(leaf);
      }

      this.colliders.push({
        mesh: trunk,
        type: 'prop',
        collider: { minX: -312, maxX: -308, minZ: z - 2, maxZ: z + 2, minY: 0, maxY: 12 },
      });
    }
  }

  private createInteractiveProps() {
    // 1. Destructible Fire Hydrants with High-Pressure Eruption
    const hydrantGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.4, 8);
    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.3 });

    const hydrantPositions = [
      { x: 15, z: 15 },
      { x: -15, z: 15 },
      { x: 15, z: -15 },
      { x: -15, z: -15 },
      { x: 145, z: 15 },
      { x: -145, z: 15 },
      { x: 15, z: 165 },
      { x: -15, z: 165 },
      { x: 15, z: -165 },
      { x: -15, z: -165 },
    ];

    hydrantPositions.forEach((pos) => {
      const mesh = new THREE.Mesh(hydrantGeo, hydrantMat);
      mesh.position.set(pos.x, 0.7, pos.z);
      mesh.castShadow = true;
      this.scene.add(mesh);

      const hydrantObj: WorldObject = {
        mesh,
        type: 'hydrant',
        materialType: 'metal',
        health: 25,
        collider: {
          minX: pos.x - 0.6,
          maxX: pos.x + 0.6,
          minZ: pos.z - 0.6,
          maxZ: pos.z + 0.6,
          minY: 0,
          maxY: 1.5,
        },
        onHit: (vel, particles) => {
          mesh.rotation.z += 1.2;
          mesh.position.y -= 0.3;
          particles.emitHydrantGeyser(mesh.position);
          particles.emitDestructionDebris(mesh.position, 'metal', 6);
        },
      };
      this.colliders.push(hydrantObj);
      this.destructibles.push(hydrantObj);
    });

    // 2. Destructible Road Construction Barriers & Warning Cones
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
    const barrierPositions = [
      { x: 30, z: 45, rot: 0 },
      { x: 35, z: 45, rot: 0 },
      { x: -50, z: -120, rot: Math.PI / 4 },
      { x: 110, z: 60, rot: -Math.PI / 2 },
    ];

    barrierPositions.forEach((bp) => {
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 0.6), barrierMat);
      bMesh.position.set(bp.x, 0.7, bp.z);
      bMesh.rotation.y = bp.rot;
      bMesh.castShadow = true;
      this.scene.add(bMesh);

      const barrierObj: WorldObject = {
        mesh: bMesh,
        type: 'barrier',
        materialType: 'wood',
        health: 15,
        collider: {
          minX: bp.x - 2.5,
          maxX: bp.x + 2.5,
          minZ: bp.z - 1,
          maxZ: bp.z + 1,
          minY: 0,
          maxY: 1.5,
        },
        onHit: (vel, particles) => {
          particles.emitDestructionDebris(bMesh.position, 'wood', 14);
          this.scene.remove(bMesh);
          barrierObj.isDestroyed = true;
        },
      };
      this.colliders.push(barrierObj);
      this.destructibles.push(barrierObj);
    });

    // 3. Explosive Red Fuel Barrels
    const barrelGeo = new THREE.CylinderGeometry(1.1, 1.1, 2.8, 16);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x991b1b,
      emissiveIntensity: 0.4,
    });

    const barrelPositions = [
      { x: 35, z: -40 },
      { x: 38, z: -42 },
      { x: -140, z: 40 },
      { x: -210, z: 150 },
      { x: -213, z: 153 },
      { x: 140, z: -160 },
      { x: 190, z: 60 },
      { x: 220, z: -90 },
      { x: -60, z: -140 },
    ];

    barrelPositions.forEach((pos) => {
      const mesh = new THREE.Mesh(barrelGeo, barrelMat);
      mesh.position.set(pos.x, 1.4, pos.z);
      mesh.castShadow = true;
      this.scene.add(mesh);

      const obj: WorldObject = {
        mesh,
        type: 'explosive_barrel',
        health: 20,
        collider: {
          minX: pos.x - 1.2,
          maxX: pos.x + 1.2,
          minZ: pos.z - 1.2,
          maxZ: pos.z + 1.2,
          minY: 0,
          maxY: 2.8,
        },
      };
      this.colliders.push(obj);
      this.explosiveBarrels.push(obj);
    });

    // 4. Street Lamps with Dynamic Night Illumination Cones
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let x = -220; x <= 220; x += 70) {
      for (let z = -220; z <= 220; z += 70) {
        if (Math.abs(x) === 70 || Math.abs(x) === 140 || Math.abs(z) === 70 || Math.abs(z) === 140) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 11, 8), lampMat);
          post.position.set(x + 14, 5.5, z + 14);
          this.scene.add(post);

          const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.3), lampMat);
          arm.position.set(x + 12.5, 10.8, z + 14);
          this.scene.add(arm);

          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), bulbMat);
          bulb.position.set(x + 11.2, 10.5, z + 14);
          this.scene.add(bulb);

          const spot = new THREE.SpotLight(0xfef08a, 2.5, 38, Math.PI / 4, 0.5, 1.2);
          spot.position.set(x + 11.2, 10.4, z + 14);
          spot.target.position.set(x + 11.2, 0, z + 14);
          this.scene.add(spot);
          this.scene.add(spot.target);

          this.streetLights.push({ light: spot, bulb });
        }
      }
    }
  }

  private createPickups() {
    const pickupItems = [
      { type: 'cash' as const, value: 1500, x: 25, z: 25, color: 0x22c55e },
      { type: 'cash' as const, value: 3000, x: -60, z: -70, color: 0x22c55e },
      { type: 'cash' as const, value: 5000, x: 0, z: -140, color: 0x22c55e },
      { type: 'health' as const, value: 50, x: -35, z: 45, color: 0xef4444 },
      { type: 'armor' as const, value: 100, x: 45, z: -35, color: 0x3b82f6 },
      { type: 'weapon' as const, value: 'rpg', x: -120, z: -80, color: 0xa855f7 },
      { type: 'weapon' as const, value: 'sniper', x: 80, z: -80, color: 0x06b6d4 },
      { type: 'weapon' as const, value: 'shotgun', x: -220, z: 170, color: 0xf59e0b },
    ];

    pickupItems.forEach((p) => {
      const geo = new THREE.OctahedronGeometry(1.2, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: p.color,
        emissive: p.color,
        emissiveIntensity: 0.8,
        metalness: 0.8,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, 1.8, p.z);
      this.scene.add(mesh);

      const pickupObj: WorldObject = {
        mesh,
        type: 'pickup',
        pickupType: p.type,
        pickupValue: p.value,
        collider: {
          minX: p.x - 2,
          maxX: p.x + 2,
          minZ: p.z - 2,
          maxZ: p.z + 2,
          minY: 0,
          maxY: 4,
        },
      };
      this.pickups.push(pickupObj);
    });
  }

  private createStuntRamps() {
    // High-visibility materials for stunt ramps
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.6,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.4,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
    });
    const neonCyanMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
    });
    const neonAmberMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
    });
    const neonRedMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
    });

    // 8 Strategic Stunt Ramps spread across the entire city
    const rampDefinitions = [
      // 1. Downtown Intersection Mega Jump (Leaps across 4-way traffic avenue)
      { x: 30, z: 120, rot: 0, launchAngle: 0.38, boost: 1.3, length: 16, height: 4.5, width: 10, name: 'Downtown Intersection Launch' },
      // 2. Marina Shoreline Ocean Sky Ramp (Jumps out over the coast and pier)
      { x: -280, z: 20, rot: Math.PI / 2, launchAngle: 0.46, boost: 1.6, length: 18, height: 5.5, width: 12, name: 'Marina Sky Launch' },
      // 3. West Commercial Strip Rooftop Leap
      { x: -140, z: -20, rot: Math.PI / 2, launchAngle: 0.40, boost: 1.35, length: 16, height: 4.8, width: 10, name: 'Commercial Strip Leap' },
      // 4. East Central Park Canal Ramp (Launches over trees and park promenade)
      { x: 120, z: -140, rot: -Math.PI / 2, launchAngle: 0.42, boost: 1.4, length: 16, height: 5.0, width: 10, name: 'Central Park High Leap' },
      // 5. Highway Overpass Gap Daredevil Ramp (Jumps across highway median gap)
      { x: -60, z: -80, rot: 0, launchAngle: 0.48, boost: 1.65, length: 18, height: 5.8, width: 11, name: 'Highway Gap Mega Ramp' },
      // 6. North Boulevard Expressway Ramp (High speed straightaway jump)
      { x: 0, z: -260, rot: Math.PI, launchAngle: 0.42, boost: 1.45, length: 17, height: 5.0, width: 10, name: 'North Boulevard Apex' },
      // 7. Industrial Docks Cargo Leap Ramp (Leaps over cargo containers)
      { x: -220, z: 220, rot: -Math.PI / 4, launchAngle: 0.44, boost: 1.5, length: 16, height: 5.2, width: 10, name: 'Docks Container Jump' },
      // 8. East Metropolis Skyscraper Gap Ramp (Ultra Gold Stunt)
      { x: 220, z: 140, rot: -Math.PI / 2, launchAngle: 0.50, boost: 1.8, length: 20, height: 6.5, width: 12, name: 'Metropolis Sky Flight' },
    ];

    rampDefinitions.forEach((r) => {
      const rampGroup = new THREE.Group();
      rampGroup.position.set(r.x, 0, r.z);
      rampGroup.rotation.y = r.rot;

      // 1. Incline Ramp Platform
      const rampGeo = new THREE.BoxGeometry(r.width, 0.8, r.length);
      const rampMesh = new THREE.Mesh(rampGeo, yellowMat);
      rampMesh.position.set(0, r.height / 2, 0);
      rampMesh.rotation.x = -r.launchAngle;
      rampMesh.castShadow = true;
      rampMesh.receiveShadow = true;
      rampGroup.add(rampMesh);

      // 2. High-contrast Hazard Chevrons / Stripes on ramp deck
      const numStripes = 6;
      for (let i = 0; i < numStripes; i++) {
        const stripeGeo = new THREE.BoxGeometry(r.width * 0.92, 0.05, 0.8);
        const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
        const stripeZ = -r.length / 2 + (i + 1) * (r.length / (numStripes + 1));
        const stripeY = (i + 1) * (r.height / (numStripes + 1));
        stripeMesh.position.set(0, stripeY + 0.42, stripeZ);
        stripeMesh.rotation.x = -r.launchAngle;
        rampGroup.add(stripeMesh);
      }

      // 3. Side Guard Rails & Glowing Neon Light Strips
      const railGeo = new THREE.BoxGeometry(0.5, 1.4, r.length);
      const leftRail = new THREE.Mesh(railGeo, baseMat);
      leftRail.position.set(-r.width / 2 + 0.25, r.height / 2 + 0.6, 0);
      leftRail.rotation.x = -r.launchAngle;
      rampGroup.add(leftRail);

      const rightRail = new THREE.Mesh(railGeo, baseMat);
      rightRail.position.set(r.width / 2 - 0.25, r.height / 2 + 0.6, 0);
      rightRail.rotation.x = -r.launchAngle;
      rampGroup.add(rightRail);

      // Neon LED Edge Strips
      const neonGeo = new THREE.BoxGeometry(0.15, 0.15, r.length);
      const leftNeon = new THREE.Mesh(neonGeo, neonCyanMat);
      leftNeon.position.set(-r.width / 2 + 0.05, r.height / 2 + 1.2, 0);
      leftNeon.rotation.x = -r.launchAngle;
      rampGroup.add(leftNeon);

      const rightNeon = new THREE.Mesh(neonGeo, neonCyanMat);
      rightNeon.position.set(r.width / 2 - 0.05, r.height / 2 + 1.2, 0);
      rightNeon.rotation.x = -r.launchAngle;
      rampGroup.add(rightNeon);

      // 4. Ground Approach Arrows / Launch Pad Runway Markings
      const arrowGeo = new THREE.BoxGeometry(r.width * 0.6, 0.04, 3.5);
      const arrowMesh = new THREE.Mesh(arrowGeo, neonAmberMat);
      arrowMesh.position.set(0, 0.02, r.length / 2 + 3.0);
      rampGroup.add(arrowMesh);

      // 5. Flashing Warning Hazard Beacons at base
      const beaconGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
      const beaconL = new THREE.Mesh(beaconGeo, neonAmberMat);
      beaconL.position.set(-r.width / 2 - 0.6, 0.6, r.length / 2 + 1.0);
      rampGroup.add(beaconL);

      const beaconR = new THREE.Mesh(beaconGeo, neonAmberMat);
      beaconR.position.set(r.width / 2 + 0.6, 0.6, r.length / 2 + 1.0);
      rampGroup.add(beaconR);

      // Apex launch point in world coordinates (top edge of ramp)
      const apexLocal = new THREE.Vector3(0, r.height, -r.length / 2);
      const apexWorld = apexLocal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), r.rot).add(new THREE.Vector3(r.x, 0, r.z));

      this.scene.add(rampGroup);

      // Register Stunt Ramp Collider with launch physics
      const halfSize = Math.max(r.length, r.width) / 2 + 2;
      this.colliders.push({
        mesh: rampGroup,
        type: 'ramp',
        collider: {
          minX: r.x - halfSize,
          maxX: r.x + halfSize,
          minZ: r.z - halfSize,
          maxZ: r.z + halfSize,
          minY: 0,
          maxY: r.height + 4.0,
        },
        rampAngle: r.launchAngle,
        rampLaunchAngle: r.launchAngle,
        rampBoost: r.boost,
        rampRot: r.rot,
        rampLength: r.length,
        rampHeight: r.height,
        rampHalfWidth: r.width / 2,
        rampApexPos: apexWorld,
      });
    });
  }

  private createSafehouses() {
    this.safehouses = [
      { x: -120, z: 140, name: 'Marina Luxury Condo' },
      { x: 140, z: 140, name: 'Downtown Penthouse' },
      { x: -80, z: -40, name: 'Underground Garage Bunker' },
    ];
  }

  public update(delta: number, isNightOrDusk: boolean) {
    // 1. Cycle Traffic Light Intersection Controllers
    this.trafficLights.forEach((tl) => {
      tl.timer += delta;
      if (tl.state === 'NS_GREEN' && tl.timer > 10.0) {
        tl.state = 'NS_YELLOW';
        tl.timer = 0;
      } else if (tl.state === 'NS_YELLOW' && tl.timer > 3.0) {
        tl.state = 'EW_GREEN';
        tl.timer = 0;
      } else if (tl.state === 'EW_GREEN' && tl.timer > 10.0) {
        tl.state = 'EW_YELLOW';
        tl.timer = 0;
      } else if (tl.state === 'EW_YELLOW' && tl.timer > 3.0) {
        tl.state = 'NS_GREEN';
        tl.timer = 0;
      }

      // Update NS Materials
      tl.nsMaterials.forEach((m) => {
        if (tl.state === 'NS_GREEN') {
          m.green.color.setHex(0x22c55e);
          m.yellow.color.setHex(0x333300);
          m.red.color.setHex(0x330000);
        } else if (tl.state === 'NS_YELLOW') {
          m.green.color.setHex(0x003300);
          m.yellow.color.setHex(0xeab308);
          m.red.color.setHex(0x330000);
        } else {
          m.green.color.setHex(0x003300);
          m.yellow.color.setHex(0x333300);
          m.red.color.setHex(0xef4444);
        }
      });

      // Update EW Materials
      tl.ewMaterials.forEach((m) => {
        if (tl.state === 'EW_GREEN') {
          m.green.color.setHex(0x22c55e);
          m.yellow.color.setHex(0x333300);
          m.red.color.setHex(0x330000);
        } else if (tl.state === 'EW_YELLOW') {
          m.green.color.setHex(0x003300);
          m.yellow.color.setHex(0xeab308);
          m.red.color.setHex(0x330000);
        } else {
          m.green.color.setHex(0x003300);
          m.yellow.color.setHex(0x333300);
          m.red.color.setHex(0xef4444);
        }
      });
    });

    // 2. Night Dynamic Street Lighting & Windows
    const targetLampIntensity = isNightOrDusk ? 2.8 : 0.0;
    this.streetLights.forEach((sl) => {
      sl.light.intensity = THREE.MathUtils.lerp(sl.light.intensity, targetLampIntensity, delta * 3.0);
      (sl.bulb.material as THREE.MeshBasicMaterial).color.setHex(isNightOrDusk ? 0xfef08a : 0x475569);
    });

    const targetWindowOpacity = isNightOrDusk ? 0.85 : 0.25;
    this.buildingWindows.forEach((winMat) => {
      winMat.opacity = THREE.MathUtils.lerp(winMat.opacity, targetWindowOpacity, delta * 2.0);
    });

    // 3. Blinking Red Skyscraper Aviation Beacons
    this.beaconTimer += delta;
    const isBeaconLit = Math.sin(this.beaconTimer * 4.0) > 0;
    this.aviationBeacons.forEach((b) => {
      (b.mesh.material as THREE.MeshBasicMaterial).color.setHex(isBeaconLit ? 0xef4444 : 0x330000);
      if (b.light) b.light.intensity = isBeaconLit ? 2.5 : 0.0;
    });

    // 4. Subtle Neon Signs Pulse
    const neonPulse = 0.8 + Math.sin(this.beaconTimer * 3.0) * 0.15;
    this.neonSigns.forEach((s) => {
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = s.baseIntensity * neonPulse;
    });
  }
}
