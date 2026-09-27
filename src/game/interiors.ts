import * as THREE from 'three';
import { DoorSystem } from './doors';
import { WorldObject } from './world';

export interface InteractiveProp {
  id: string;
  name: string;
  position: THREE.Vector3;
  type: 'atm' | 'safe' | 'vault_gold' | 'keycard_pickup' | 'armory_bench' | 'cash_stack';
  keycardReward?: string;
  cashReward?: number;
  isLooted?: boolean;
  mesh: THREE.Object3D;
  promptText: string;
}

export class InteriorManager {
  public scene: THREE.Scene;
  public doorSystem: DoorSystem;
  public colliders: WorldObject[] = [];
  public interactiveProps: InteractiveProp[] = [];
  public interiorLights: THREE.Light[] = [];

  constructor(scene: THREE.Scene, doorSystem: DoorSystem) {
    this.scene = scene;
    this.doorSystem = doorSystem;
  }

  public buildAllInteriors() {
    this.buildConvenienceStoreInterior();
    this.buildAmmuNationInterior();
    this.buildBankAndVaultInterior();
    this.buildMarinaSafehouseInterior();
    this.buildUndergroundGarageInterior();
    this.buildPayNSprayInterior();
    this.buildDocksWarehouseInterior();
    this.buildCyberCorpLobbyAndSuite();
    this.buildNexusCasinoInterior();
    this.buildMedicalClinicInterior();
    this.buildDowntownPenthouseInterior();
    this.buildPolicePrecinctInterior();
    this.buildCarDealershipInterior();
    this.buildSniperNestInterior();
  }

  // 1. Gas Station 24/7 Mart Interior
  private buildConvenienceStoreInterior() {
    const cx = -180;
    const cz = 25;
    const flY = 0.05;

    // Interior Floor (Checkerboard Tile)
    const floorGeo = new THREE.PlaneGeometry(24, 16);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling with Fluorescent Lights
    const ceilGeo = new THREE.PlaneGeometry(24, 16);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, 7.8, cz);
    this.scene.add(ceil);

    // Interior Ambient Point Lights
    const storeLight1 = new THREE.PointLight(0xfffbeb, 1.8, 22);
    storeLight1.position.set(cx - 5, 6.5, cz);
    this.scene.add(storeLight1);
    this.interiorLights.push(storeLight1);

    const storeLight2 = new THREE.PointLight(0xfffbeb, 1.8, 22);
    storeLight2.position.set(cx + 5, 6.5, cz);
    this.scene.add(storeLight2);
    this.interiorLights.push(storeLight2);

    // Automatic Sliding Glass Front Entrance Door (🏪 Shop: E ENTER)
    this.doorSystem.addDoor({
      id: 'door_mart_front',
      name: '24/7 Mart Sliding Doors',
      category: 'shop',
      type: 'shop_entrance',
      position: new THREE.Vector3(cx, 0, cz - 8.9),
      rotationY: 0,
      isAutomatic: true,
      sensorRadius: 4.2,
      health: 120,
    });

    // Grocery Aisles & Shelves
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 });
    const snackColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];

    [-4, 4].forEach((sx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2, 3.2, 9), shelfMat);
      shelf.position.set(cx + sx, 1.6, cz);
      shelf.castShadow = true;
      this.scene.add(shelf);

      // Add colorful snack boxes on shelves
      for (let b = -3.5; b <= 3.5; b += 1.2) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.5, 0.8),
          new THREE.MeshStandardMaterial({ color: snackColors[Math.floor(Math.random() * snackColors.length)] })
        );
        box.position.set(cx + sx + 0.6, 2.8, cz + b);
        this.scene.add(box);
      }

      this.colliders.push({
        mesh: shelf,
        type: 'prop',
        collider: { minX: cx + sx - 1.1, maxX: cx + sx + 1.1, minZ: cz - 4.6, maxZ: cz + 4.6, minY: 0, maxY: 3.5 },
      });
    });

    // Wall Beverage Coolers with Glowing Blue Neon
    const coolerMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 });
    const cooler = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 1.2), coolerMat);
    cooler.position.set(cx, 2.25, cz + 7.3);
    this.scene.add(cooler);

    const coolerGlow = new THREE.PointLight(0x38bdf8, 2.0, 10);
    coolerGlow.position.set(cx, 2.5, cz + 6.5);
    this.scene.add(coolerGlow);
    this.interiorLights.push(coolerGlow);

    this.colliders.push({
      mesh: cooler,
      type: 'prop',
      collider: { minX: cx - 5.1, maxX: cx + 5.1, minZ: cz + 6.6, maxZ: cz + 7.9, minY: 0, maxY: 4.5 },
    });

    // Checkout Counter & Cash Register
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 1.6), counterMat);
    counter.position.set(cx - 8, 0.9, cz - 4.5);
    this.scene.add(counter);

    const registerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    registerMesh.position.set(cx - 8, 2.1, cz - 4.5);
    this.scene.add(registerMesh);

    this.colliders.push({
      mesh: counter,
      type: 'prop',
      collider: { minX: cx - 10.3, maxX: cx - 5.7, minZ: cz - 5.4, maxZ: cz - 3.6, minY: 0, maxY: 2.5 },
    });

    // Lootable ATM Machine in Store Corner
    const atmGeo = new THREE.BoxGeometry(1.2, 2.4, 0.9);
    const atmMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const atmMesh = new THREE.Mesh(atmGeo, atmMat);
    atmMesh.position.set(cx + 9.5, 1.2, cz - 6.5);
    this.scene.add(atmMesh);

    this.colliders.push({
      mesh: atmMesh,
      type: 'atm',
      collider: { minX: cx + 8.8, maxX: cx + 10.2, minZ: cz - 7.1, maxZ: cz - 5.9, minY: 0, maxY: 2.5 },
    });

    this.interactiveProps.push({
      id: 'atm_mart',
      name: 'Convenience Store ATM',
      position: atmMesh.position.clone(),
      type: 'atm',
      cashReward: 3500,
      mesh: atmMesh,
      promptText: '[E] Hack & Withdraw ATM Cash ($3,500)',
    });
  }

  // 2. Ammu-Nation Weapon Superstore & Gun Range
  private buildAmmuNationInterior() {
    const cx = -180;
    const cz = -80;
    const flY = 0.05;

    // Gun Store Polished Hardwood Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 24),
      new THREE.MeshStandardMaterial({ color: 0x3f2e1e, roughness: 0.4 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Warm Interior Armory Lights & Crimson Neon
    const redNeon = new THREE.PointLight(0xef4444, 2.2, 28);
    redNeon.position.set(cx, 8.5, cz);
    this.scene.add(redNeon);
    this.interiorLights.push(redNeon);

    const warmLight = new THREE.PointLight(0xfef08a, 1.6, 20);
    warmLight.position.set(cx - 6, 6.0, cz);
    this.scene.add(warmLight);
    this.interiorLights.push(warmLight);

    // Automatic Security Reinforced Entrance Doors (🏪 Shop: E ENTER)
    this.doorSystem.addDoor({
      id: 'door_ammu_front',
      name: 'Ammu-Nation Security Doors',
      category: 'shop',
      type: 'shop_entrance',
      position: new THREE.Vector3(cx, 0, cz + 12.8),
      rotationY: Math.PI,
      isAutomatic: true,
      sensorRadius: 4.2,
      health: 220,
    });

    // Glass Showcase Weapon Displays
    const showcaseMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

    const showcase = new THREE.Mesh(new THREE.BoxGeometry(14, 1.8, 2.2), showcaseMat);
    showcase.position.set(cx, 0.9, cz + 4);
    this.scene.add(showcase);

    this.colliders.push({
      mesh: showcase,
      type: 'prop',
      collider: { minX: cx - 7.2, maxX: cx + 7.2, minZ: cz + 2.8, maxZ: cz + 5.2, minY: 0, maxY: 2.2 },
    });

    // Wall Weapon Racks (Mounted Shotguns, Sniper Rifles)
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const wallRack = new THREE.Mesh(new THREE.BoxGeometry(20, 4.5, 0.4), rackMat);
    wallRack.position.set(cx, 4.5, cz - 11.5);
    this.scene.add(wallRack);

    // Shooting Range in the Back (🪪 Security: E USE KEYCARD)
    this.doorSystem.addDoor({
      id: 'door_ammu_range',
      name: 'VIP Shooting Range Door',
      category: 'security',
      type: 'manual_metal',
      position: new THREE.Vector3(cx + 10, 0, cz - 11.6),
      rotationY: 0,
      isLocked: true,
      requiredKeycard: 'ammunation_vip',
      health: 250,
    });

    // Ammu-Nation VIP Keycard Safe in Office
    const safeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.4, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
    );
    safeMesh.position.set(cx - 12, 0.7, cz + 2);
    this.scene.add(safeMesh);

    this.colliders.push({
      mesh: safeMesh,
      type: 'prop',
      collider: { minX: cx - 12.7, maxX: cx - 11.3, minZ: cz + 1.4, maxZ: cz + 2.6, minY: 0, maxY: 1.6 },
    });

    this.interactiveProps.push({
      id: 'safe_ammunation',
      name: 'Gunsmith Armory Safe',
      position: safeMesh.position.clone(),
      type: 'safe',
      keycardReward: 'ammunation_vip',
      cashReward: 8000,
      mesh: safeMesh,
      promptText: '[E] Crack Armory Safe (VIP Pass & $8,000)',
    });
  }

  // 3. Nova Central Bank & High-Security Vault
  private buildBankAndVaultInterior() {
    const cx = 0;
    const cz = -150;
    const flY = 0.05;

    // Grand Polished Marble Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(56, 46),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.4 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Chandelier Grand Warm Lighting
    const bankLight = new THREE.PointLight(0xfef08a, 2.5, 45);
    bankLight.position.set(cx, 16, cz);
    this.scene.add(bankLight);
    this.interiorLights.push(bankLight);

    // Front Grand Entrance Double Doors (🚪 Normal door: E OPEN)
    this.doorSystem.addDoor({
      id: 'door_bank_entrance',
      name: 'Nova Central Bank Main Doors',
      category: 'normal',
      type: 'manual_wood',
      position: new THREE.Vector3(cx, 0, cz + 24.8),
      rotationY: Math.PI,
      isLocked: false,
      health: 200,
    });

    // Teller Counters with Bulletproof Glass
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const tellerCounter = new THREE.Mesh(new THREE.BoxGeometry(32, 2.2, 2.5), counterMat);
    tellerCounter.position.set(cx, 1.1, cz + 4);
    this.scene.add(tellerCounter);

    this.colliders.push({
      mesh: tellerCounter,
      type: 'prop',
      collider: { minX: cx - 16.2, maxX: cx + 16.2, minZ: cz + 2.6, maxZ: cz + 5.4, minY: 0, maxY: 3.0 },
    });

    // Bank Manager's Office Door (🔒 Locked door: E LOCKPICK / F KICK BREACH)
    this.doorSystem.addDoor({
      id: 'door_bank_manager',
      name: "Bank Manager's Office",
      category: 'locked',
      type: 'manual_wood',
      position: new THREE.Vector3(cx - 20, 0, cz - 4),
      rotationY: Math.PI / 2,
      isLocked: true,
      health: 120,
    });

    // Manager Desk & Vault Passcard Safe
    const managerSafe = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.15 })
    );
    managerSafe.position.set(cx - 24, 0.8, cz - 12);
    this.scene.add(managerSafe);

    this.interactiveProps.push({
      id: 'safe_bank_manager',
      name: "Manager's Keycard Safe",
      position: managerSafe.position.clone(),
      type: 'safe',
      keycardReward: 'bank_vault_pass',
      cashReward: 12000,
      mesh: managerSafe,
      promptText: '[E] Hack Safe (Bank Vault Passcard & $12,000)',
    });

    // 4. Heavy Reinforced Bank Vault Circular Door (🏦 Vault: E USE ACCESS CODE)
    this.doorSystem.addDoor({
      id: 'door_bank_vault',
      name: 'High-Security Bank Vault',
      category: 'vault',
      type: 'vault_metal',
      position: new THREE.Vector3(cx, 0, cz - 12),
      rotationY: 0,
      isLocked: true,
      requiredKeycard: 'bank_vault_pass',
      health: 600,
    });

    // Inside Vault Room: Gold Bullion Pallets & Cash Stacks!
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });

    const goldPallet = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.4, 4.0), goldMat);
    goldPallet.position.set(cx, 0.7, cz - 19);
    this.scene.add(goldPallet);

    this.colliders.push({
      mesh: goldPallet,
      type: 'prop',
      collider: { minX: cx - 2.2, maxX: cx + 2.2, minZ: cz - 21.2, maxZ: cz - 16.8, minY: 0, maxY: 2.0 },
    });

    this.interactiveProps.push({
      id: 'vault_gold_loot',
      name: 'Federal Gold Bullion Pallet',
      position: goldPallet.position.clone(),
      type: 'vault_gold',
      cashReward: 50000,
      mesh: goldPallet,
      promptText: '[E] Loot Bank Vault Gold ($50,000 CASH!)',
    });
  }

  // 4. Marina Luxury Condo Safehouse Interior
  private buildMarinaSafehouseInterior() {
    const cx = -120;
    const cz = 140;
    const flY = 0.05;

    // Hardwood Flooring
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 22),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Modern Luxury Ambient Lights
    const modernLight = new THREE.PointLight(0x38bdf8, 1.8, 22);
    modernLight.position.set(cx, 6.5, cz);
    this.scene.add(modernLight);
    this.interiorLights.push(modernLight);

    // Front Entrance Door with Keypad (🪪 Security: E USE KEYCARD)
    this.doorSystem.addDoor({
      id: 'door_marina_safehouse',
      name: 'Marina Luxury Condo Door',
      category: 'security',
      type: 'manual_wood',
      position: new THREE.Vector3(cx, 0, cz - 10.8),
      rotationY: 0,
      isLocked: true,
      requiredKeycard: 'safehouse_key',
      health: 150,
    });

    // Deep Velvet Sectional Sofa
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.8 });
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 3.5), sofaMat);
    sofa.position.set(cx - 5, 0.7, cz + 2);
    this.scene.add(sofa);

    // Large Wall OLED TV Screen
    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(7, 3.8, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    tvScreen.position.set(cx - 5, 3.5, cz + 10.7);
    this.scene.add(tvScreen);

    this.colliders.push({
      mesh: sofa,
      type: 'prop',
      collider: { minX: cx - 8.2, maxX: cx - 1.8, minZ: cz + 0.1, maxZ: cz + 3.9, minY: 0, maxY: 1.8 },
    });

    // Bedroom Safe containing Safehouse Keycard & Katana
    const condoSafe = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.4, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
    );
    condoSafe.position.set(cx + 8, 0.7, cz + 6);
    this.scene.add(condoSafe);

    this.interactiveProps.push({
      id: 'safe_condo_loot',
      name: 'Master Bedroom Safe',
      position: condoSafe.position.clone(),
      type: 'safe',
      keycardReward: 'safehouse_key',
      cashReward: 15000,
      mesh: condoSafe,
      promptText: '[E] Open Condo Safe (Condo NFC Card & $15,000)',
    });
  }

  // 5. Underground Safehouse Garage & Bunker Workshop
  private buildUndergroundGarageInterior() {
    const cx = -80;
    const cz = -40;
    const flY = 0.05;

    // Industrial Concrete Workshop Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Industrial Fluorescent Yellow Workshop Light
    const bunkerLight = new THREE.PointLight(0xfef08a, 2.2, 28);
    bunkerLight.position.set(cx, 7.5, cz);
    this.scene.add(bunkerLight);
    this.interiorLights.push(bunkerLight);

    // Garage Heavy Metal Rollup Door (🚗 Garage: E OPEN SHUTTER)
    this.doorSystem.addDoor({
      id: 'door_bunker_garage',
      name: 'Underground Bunker Garage Shutter',
      category: 'garage',
      type: 'garage_roll',
      position: new THREE.Vector3(cx, 0, cz + 11.8),
      rotationY: Math.PI,
      isLocked: false,
      health: 350,
    });

    // Hydraulic Car Lift with Chassis
    const liftMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8 });
    const liftPillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.0, 0.8), liftMat);
    liftPillar1.position.set(cx - 3.5, 3.0, cz);
    this.scene.add(liftPillar1);

    const liftPillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.0, 0.8), liftMat);
    liftPillar2.position.set(cx + 3.5, 3.0, cz);
    this.scene.add(liftPillar2);

    // Red Tool Chests & Armory Workbench
    const toolMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7, roughness: 0.3 });
    const toolChest = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 1.4), toolMat);
    toolChest.position.set(cx - 10, 1.1, cz - 6);
    this.scene.add(toolChest);

    this.colliders.push({
      mesh: toolChest,
      type: 'prop',
      collider: { minX: cx - 12.2, maxX: cx - 7.8, minZ: cz - 6.8, maxZ: cz - 5.2, minY: 0, maxY: 2.5 },
    });

    this.interactiveProps.push({
      id: 'bench_bunker_armory',
      name: 'Bunker Armory Workbench',
      position: toolChest.position.clone(),
      type: 'armory_bench',
      keycardReward: 'bunker_key',
      cashReward: 10000,
      mesh: toolChest,
      promptText: '[E] Restock Armory & Loot Bunker Stash ($10,000)',
    });
  }

  // 6. Pay 'N' Spray Auto Repair Garage & Paint Booth
  private buildPayNSprayInterior() {
    const cx = -80;
    const cz = 80;
    const flY = 0.05;

    // Workshop Epoxy Flooring
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 18),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Neon Green Customizer Spotlights
    const sprayLight = new THREE.PointLight(0x10b981, 2.2, 24);
    sprayLight.position.set(cx, 6.5, cz);
    this.scene.add(sprayLight);
    this.interiorLights.push(sprayLight);

    // Front Rollup Garage Shutter Door (🚗 Garage: E OPEN SHUTTER)
    this.doorSystem.addDoor({
      id: 'door_paynspray_roll',
      name: "Pay 'N' Spray Rolling Shutter",
      category: 'garage',
      type: 'garage_roll',
      position: new THREE.Vector3(cx, 0, cz - 9.8),
      rotationY: 0,
      isLocked: false,
      health: 300,
    });

    // Hydraulic Lift with Safety Rails
    const liftMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const liftPole1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), liftMat);
    liftPole1.position.set(cx - 4, 2.75, cz);
    this.scene.add(liftPole1);

    const liftPole2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), liftMat);
    liftPole2.position.set(cx + 4, 2.75, cz);
    this.scene.add(liftPole2);

    // Tire Stacks and Paint Can Racks
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const tireRack = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 1.2), rackMat);
    tireRack.position.set(cx + 7, 1.5, cz + 6.5);
    this.scene.add(tireRack);

    this.colliders.push({
      mesh: tireRack,
      type: 'prop',
      collider: { minX: cx + 3.8, maxX: cx + 10.2, minZ: cz + 5.8, maxZ: cz + 7.2, minY: 0, maxY: 3 },
    });

    // Mechanic Register & Safe
    const registerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const registerMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.0), registerMat);
    registerMesh.position.set(cx - 7.5, 0.7, cz + 6.5);
    this.scene.add(registerMesh);

    this.interactiveProps.push({
      id: 'prop_paynspray_cash',
      name: 'Garage Cash Register',
      position: registerMesh.position.clone(),
      type: 'safe',
      cashReward: 4500,
      mesh: registerMesh,
      promptText: '[E] Loot Garage Repair Cash ($4,500)',
    });
  }

  // 7. Industrial Docks Shipping Warehouse
  private buildDocksWarehouseInterior() {
    const cx = -220;
    const cz = 240;
    const flY = 0.05;

    // Heavy Industrial Concrete Flooring
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 54),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // High-Bay Industrial Overhead Floodlights
    const whLight1 = new THREE.PointLight(0xffedd5, 2.5, 35);
    whLight1.position.set(cx - 10, 14, cz - 10);
    this.scene.add(whLight1);
    this.interiorLights.push(whLight1);

    const whLight2 = new THREE.PointLight(0xffedd5, 2.5, 35);
    whLight2.position.set(cx + 10, 14, cz + 10);
    this.scene.add(whLight2);
    this.interiorLights.push(whLight2);

    // Main Warehouse Loading Bay Heavy Metal Sliding Door (🚗 Garage: E OPEN SHUTTER)
    this.doorSystem.addDoor({
      id: 'door_docks_wh_main',
      name: 'Port Warehouse Bay Doors',
      category: 'garage',
      type: 'garage_roll',
      position: new THREE.Vector3(cx, 0, cz - 26.8),
      rotationY: 0,
      isLocked: false,
      health: 400,
    });

    // Shipping Manager Back Office Door (🔒 Locked door: E LOCKPICK / F KICK BREACH)
    this.doorSystem.addDoor({
      id: 'door_docks_office',
      name: 'Dispatcher Office Door',
      category: 'locked',
      type: 'manual_wood',
      position: new THREE.Vector3(cx + 15, 0, cz + 12),
      rotationY: Math.PI / 2,
      isLocked: true,
      health: 120,
    });

    // Forklift Mesh in Warehouse Center
    const forkliftBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.5, 5.0),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    forkliftBody.position.set(cx - 6, 1.25, cz);
    this.scene.add(forkliftBody);

    this.colliders.push({
      mesh: forkliftBody,
      type: 'prop',
      collider: { minX: cx - 8, maxX: cx - 4, minZ: cz - 2.8, maxZ: cz + 2.8, minY: 0, maxY: 3 },
    });

    // Stacked Cargo Pallets inside
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const cr = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), crateMat);
      cr.position.set(cx - 12 + (i % 2) * 3.5, 1.5, cz + 10 + Math.floor(i / 2) * 3.5);
      this.scene.add(cr);
    }

    // Contraband Weapon & Cash Safe in Office
    const dockSafe = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
    );
    dockSafe.position.set(cx + 18, 0.8, cz + 18);
    this.scene.add(dockSafe);

    this.interactiveProps.push({
      id: 'safe_docks_contraband',
      name: 'Port Contraband Stash Safe',
      position: dockSafe.position.clone(),
      type: 'safe',
      cashReward: 18000,
      mesh: dockSafe,
      promptText: '[E] Crack Contraband Safe & Ammo Cache ($18,000)',
    });
  }

  // 8. Downtown Cyber Corp Skyscraper Lobby & Executive Suite (80, -80)
  private buildCyberCorpLobbyAndSuite() {
    const cx = 80;
    const cz = -80;
    const flY = 0.05;

    // Polished Black Obsidian Glass Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 42),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Glowing Cyan Cyber Overhead Luminescence
    const cyberGlow = new THREE.PointLight(0x06b6d4, 2.5, 30);
    cyberGlow.position.set(cx, 9, cz);
    this.scene.add(cyberGlow);
    this.interiorLights.push(cyberGlow);

    // Main Skyscraper Front Automatic Sliding Glass Doors (🏪 Shop: E ENTER)
    this.doorSystem.addDoor({
      id: 'door_cyber_front',
      name: 'Cyber Corp Main Glass Portal',
      category: 'shop',
      type: 'shop_entrance',
      position: new THREE.Vector3(cx, 0, cz + 22.2),
      rotationY: Math.PI,
      isAutomatic: true,
      sensorRadius: 4.5,
      health: 200,
    });

    // Executive Suite Restricted Elevator Door (🛗 Elevator: E CALL ELEVATOR)
    this.doorSystem.addDoor({
      id: 'door_cyber_elevator',
      name: 'Executive Express Elevator',
      category: 'elevator',
      type: 'elevator',
      position: new THREE.Vector3(cx + 12, 0, cz - 12),
      rotationY: 0,
      targetFloor: new THREE.Vector3(cx, 115, cz),
      targetFloorName: 'Executive Penthouse (Fl 42)',
      health: 400,
    });

    // Executive Suite Restricted Office Door (🪪 Security: E USE KEYCARD)
    this.doorSystem.addDoor({
      id: 'door_cyber_executive',
      name: 'Executive Penthouse Suite Door',
      category: 'security',
      type: 'manual_metal',
      position: new THREE.Vector3(cx - 12, 0, cz - 12),
      rotationY: 0,
      isLocked: true,
      requiredKeycard: 'cyber_corp_badge',
      health: 350,
    });

    // Holographic Circular Reception Counter
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 });
    const reception = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 1.4, 24, 1, false, 0, Math.PI), deskMat);
    reception.position.set(cx, 0.7, cz + 5);
    reception.rotation.y = Math.PI;
    this.scene.add(reception);

    this.colliders.push({
      mesh: reception,
      type: 'prop',
      collider: { minX: cx - 4.8, maxX: cx + 4.8, minZ: cz + 2.5, maxZ: cz + 7.5, minY: 0, maxY: 2 },
    });

    // Illuminated Mainframe Server Racks
    const serverMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.5 });
    [-8, 8].forEach((sx) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(3.5, 6.0, 1.5), serverMat);
      rack.position.set(cx + sx, 3.0, cz - 14);
      this.scene.add(rack);

      this.colliders.push({
        mesh: rack,
        type: 'prop',
        collider: { minX: cx + sx - 1.9, maxX: cx + sx + 1.9, minZ: cz - 15, maxZ: cz - 13, minY: 0, maxY: 6 },
      });
    });

    // Cyber Corp Crypto Terminal & Executive Badge Stash
    const terminalMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.9 })
    );
    terminalMesh.position.set(cx - 14, 0.9, cz + 10);
    this.scene.add(terminalMesh);

    this.interactiveProps.push({
      id: 'terminal_cyber_corp',
      name: 'Cyber Corp Mainframe Node',
      position: terminalMesh.position.clone(),
      type: 'safe',
      keycardReward: 'cyber_corp_badge',
      cashReward: 25000,
      mesh: terminalMesh,
      promptText: '[E] Hack Cyber Mainframe (Executive Badge & $25,000)',
    });
  }

  // 9. Nexus Tower Grand Hotel & Casino (80, 80)
  private buildNexusCasinoInterior() {
    const cx = 80;
    const cz = 80;
    const flY = 0.05;

    // Plush Royal Magenta Carpet
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 36),
      new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Warm Golden Chandelier Lighting
    const casinoChandelier = new THREE.PointLight(0xf59e0b, 2.6, 32);
    casinoChandelier.position.set(cx, 10, cz);
    this.scene.add(casinoChandelier);
    this.interiorLights.push(casinoChandelier);

    // Grand Double Glass Hotel Entrance Doors (🏪 Shop: E ENTER)
    this.doorSystem.addDoor({
      id: 'door_nexus_front',
      name: 'Nexus Grand Casino Portal',
      category: 'shop',
      type: 'shop_entrance',
      position: new THREE.Vector3(cx, 0, cz - 17.8),
      rotationY: 0,
      isAutomatic: true,
      sensorRadius: 4.5,
      health: 220,
    });

    // High Roller VIP Lounge Door (🪪 Security: E USE KEYCARD)
    this.doorSystem.addDoor({
      id: 'door_nexus_vip',
      name: 'High Roller VIP Lounge Door',
      category: 'security',
      type: 'manual_wood',
      position: new THREE.Vector3(cx + 16, 0, cz + 8),
      rotationY: Math.PI / 2,
      isLocked: true,
      requiredKeycard: 'nexus_vip_card',
      health: 200,
    });

    // Blackjack & Roulette Tables (Emerald Felt)
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.6 });
    [-6, 6].forEach((tx) => {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1.2, 16), tableMat);
      table.position.set(cx + tx, 0.6, cz);
      this.scene.add(table);

      this.colliders.push({
        mesh: table,
        type: 'prop',
        collider: { minX: cx + tx - 3.6, maxX: cx + tx + 3.6, minZ: cz - 3.6, maxZ: cz + 3.6, minY: 0, maxY: 1.5 },
      });
    });

    // Cocktail Bar Counter
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 2.5), barMat);
    bar.position.set(cx, 0.8, cz + 12);
    this.scene.add(bar);

    this.colliders.push({
      mesh: bar,
      type: 'prop',
      collider: { minX: cx - 8.2, maxX: cx + 8.2, minZ: cz + 10.5, maxZ: cz + 13.5, minY: 0, maxY: 2 },
    });

    // High Roller Cash Vault & VIP Card Stash
    const casinoSafe = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.1 })
    );
    casinoSafe.position.set(cx - 16, 0.8, cz - 10);
    this.scene.add(casinoSafe);

    this.interactiveProps.push({
      id: 'safe_nexus_casino',
      name: 'Casino Cashier Safe',
      position: casinoSafe.position.clone(),
      type: 'safe',
      keycardReward: 'nexus_vip_card',
      cashReward: 30000,
      mesh: casinoSafe,
      promptText: '[E] Loot Casino Vault (VIP Pass & $30,000)',
    });
  }

  // 10. Apex Holdings Medical Clinic & Emergency Room (-80, -80)
  private buildMedicalClinicInterior() {
    const cx = -80;
    const cz = -80;
    const flY = 0.05;

    // Sterile White Vinyl Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(38, 42),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Clean Blue-White Surgical Room Lighting
    const medLight = new THREE.PointLight(0xe0f2fe, 2.2, 28);
    medLight.position.set(cx, 8, cz);
    this.scene.add(medLight);
    this.interiorLights.push(medLight);

    // ER Sliding Frosted Glass Doors (🏪 Shop: E ENTER)
    this.doorSystem.addDoor({
      id: 'door_clinic_front',
      name: 'Emergency Clinic Automatic Doors',
      category: 'shop',
      type: 'shop_entrance',
      position: new THREE.Vector3(cx, 0, cz + 20.8),
      rotationY: Math.PI,
      isAutomatic: true,
      sensorRadius: 4.5,
      health: 180,
    });

    // Doctor Office Door (🔒 Locked door: E LOCKPICK / F KICK BREACH)
    this.doorSystem.addDoor({
      id: 'door_clinic_office',
      name: 'Chief Physician Office Door',
      category: 'locked',
      type: 'manual_wood',
      position: new THREE.Vector3(cx - 10, 0, cz - 10),
      rotationY: 0,
      isLocked: true,
      health: 120,
    });

    // Triage Hospital Beds
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    [-6, 6].forEach((bx) => {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 5.0), bedMat);
      bed.position.set(cx + bx, 0.6, cz);
      this.scene.add(bed);

      this.colliders.push({
        mesh: bed,
        type: 'prop',
        collider: { minX: cx + bx - 1.4, maxX: cx + bx + 1.4, minZ: cz - 2.6, maxZ: cz + 2.6, minY: 0, maxY: 1.5 },
      });
    });

    // Emergency Medical Supply Cabinet (Medkit & Emergency Cash)
    const medCab = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6 })
    );
    medCab.position.set(cx + 12, 1.1, cz - 12);
    this.scene.add(medCab);

    this.interactiveProps.push({
      id: 'prop_clinic_medkit',
      name: 'Emergency Medicine Dispenser',
      position: medCab.position.clone(),
      type: 'safe',
      cashReward: 6000,
      mesh: medCab,
      promptText: '[E] Restock First Aid & Emergency Funds ($6,000)',
    });
  }

  // 11. Downtown Penthouse Safehouse (140, 140)
  private buildDowntownPenthouseInterior() {
    const cx = 140;
    const cz = 140;
    const flY = 0.05;

    // Dark Oak Luxury Hardwood
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 36),
      new THREE.MeshStandardMaterial({ color: 0x271a10, roughness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Warm Ambient Living Lights
    const warmPentLight = new THREE.PointLight(0xfef08a, 2.2, 26);
    warmPentLight.position.set(cx, 7, cz);
    this.scene.add(warmPentLight);
    this.interiorLights.push(warmPentLight);

    // Smart Reinforced Penthouse Front Door (🪪 Security: E USE KEYCARD)
    this.doorSystem.addDoor({
      id: 'door_penthouse_front',
      name: 'Downtown Penthouse Smart Door',
      category: 'security',
      type: 'manual_metal',
      position: new THREE.Vector3(cx, 0, cz - 17.8),
      rotationY: 0,
      isLocked: true,
      requiredKeycard: 'downtown_penthouse_key',
      health: 300,
    });

    // Modern Curved Sectional Sofa
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(10, 1.4, 3.5), sofaMat);
    sofa.position.set(cx, 0.7, cz + 2);
    this.scene.add(sofa);

    this.colliders.push({
      mesh: sofa,
      type: 'prop',
      collider: { minX: cx - 5.2, maxX: cx + 5.2, minZ: cz + 0.1, maxZ: cz + 3.9, minY: 0, maxY: 1.8 },
    });

    // Penthouse Wall Fireplace
    const fireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const fireplace = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 1.2), fireMat);
    fireplace.position.set(cx, 1.75, cz + 15);
    this.scene.add(fireplace);

    // Bedroom Master Safe
    const pentSafe = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.4, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 })
    );
    pentSafe.position.set(cx - 12, 0.7, cz - 8);
    this.scene.add(pentSafe);

    this.interactiveProps.push({
      id: 'safe_penthouse_master',
      name: 'Penthouse Master Safe',
      position: pentSafe.position.clone(),
      type: 'safe',
      keycardReward: 'downtown_penthouse_key',
      cashReward: 20000,
      mesh: pentSafe,
      promptText: '[E] Unlock Penthouse Safe & RFID Key ($20,000)',
    });
  }

  // 12. Police Precinct & Holding Cells (80, -220)
  private buildPolicePrecinctInterior() {
    const cx = 80;
    const cz = -220;
    const flY = 0.05;

    // Heavy Institutional Tile Flooring
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Blue Police Ambient Lights
    const precinctLight = new THREE.PointLight(0x3b82f6, 2.2, 30);
    precinctLight.position.set(cx, 8, cz);
    this.scene.add(precinctLight);
    this.interiorLights.push(precinctLight);

    // Police Main Entrance Reinforced Double Doors (🚪 Normal door: E OPEN)
    this.doorSystem.addDoor({
      id: 'door_police_front',
      name: 'Precinct Main Entrance',
      category: 'normal',
      type: 'manual_metal',
      position: new THREE.Vector3(cx, 0, cz + 19.8),
      rotationY: Math.PI,
      isLocked: false,
      health: 350,
    });

    // Holding Cell Heavy Iron Bar Door (🪪 Security: E USE KEYCARD)
    this.doorSystem.addDoor({
      id: 'door_police_cell',
      name: 'Lockup Holding Cell Gate',
      category: 'security',
      type: 'manual_metal',
      position: new THREE.Vector3(cx + 12, 0, cz - 8),
      rotationY: 0,
      isLocked: true,
      requiredKeycard: 'police_precinct_key',
      health: 500,
    });

    // Booking Desk
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1.8, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    desk.position.set(cx, 0.9, cz + 6);
    this.scene.add(desk);

    this.colliders.push({
      mesh: desk,
      type: 'prop',
      collider: { minX: cx - 5.2, maxX: cx + 5.2, minZ: cz + 4.8, maxZ: cz + 7.2, minY: 0, maxY: 2 },
    });

    // Evidence Locker Safe
    const evidenceSafe = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9 })
    );
    evidenceSafe.position.set(cx - 14, 0.9, cz - 12);
    this.scene.add(evidenceSafe);

    this.interactiveProps.push({
      id: 'safe_police_evidence',
      name: 'Evidence Confiscation Locker',
      position: evidenceSafe.position.clone(),
      type: 'safe',
      keycardReward: 'police_precinct_key',
      cashReward: 12000,
      mesh: evidenceSafe,
      promptText: '[E] Breach Evidence Safe & Confiscated Cash ($12,000)',
    });
  }

  // 13. Aether Plaza Exotic Car Dealership Showroom (-80, -220)
  private buildCarDealershipInterior() {
    const cx = -80;
    const cz = -220;
    const flY = 0.05;

    // High-Gloss White Showroom Porcelain Tile
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.08, metalness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Bright Daylight LED Floodlights
    const showroomLight = new THREE.PointLight(0xffffff, 2.8, 35);
    showroomLight.position.set(cx, 10, cz);
    this.scene.add(showroomLight);
    this.interiorLights.push(showroomLight);

    // Front Expansive Automatic Curved Glass Showroom Doors (🏪 Shop: E ENTER)
    this.doorSystem.addDoor({
      id: 'door_dealership_front',
      name: 'Aether Motors Panoramic Glass Doors',
      category: 'shop',
      type: 'shop_entrance',
      position: new THREE.Vector3(cx, 0, cz + 22.8),
      rotationY: Math.PI,
      isAutomatic: true,
      sensorRadius: 5.0,
      health: 200,
    });

    // Center Rotating Turntable Pedestal
    const turntableMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.4, 32), turntableMat);
    turntable.position.set(cx, 0.2, cz);
    this.scene.add(turntable);

    // Showcase Vehicle Chassis on Turntable
    const carChassis = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.4, 7.5),
      new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9, roughness: 0.1 })
    );
    carChassis.position.set(cx, 1.1, cz);
    this.scene.add(carChassis);

    this.colliders.push({
      mesh: carChassis,
      type: 'prop',
      collider: { minX: cx - 2.5, maxX: cx + 2.5, minZ: cz - 4.0, maxZ: cz + 4.0, minY: 0, maxY: 2 },
    });

    // Dealership Sales Desk & Safe
    const salesDesk = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    salesDesk.position.set(cx - 14, 0.8, cz + 10);
    this.scene.add(salesDesk);

    const dealSafe = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.4, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
    );
    dealSafe.position.set(cx - 18, 0.7, cz + 10);
    this.scene.add(dealSafe);

    this.interactiveProps.push({
      id: 'safe_dealership_master',
      name: 'Dealership Finance Vault',
      position: dealSafe.position.clone(),
      type: 'safe',
      keycardReward: 'dealership_key',
      cashReward: 14000,
      mesh: dealSafe,
      promptText: '[E] Unlock Showroom Safe & Master Key ($14,000)',
    });
  }

  // 14. Penthouse Sniper Nest Outpost (-120, -80)
  private buildSniperNestInterior() {
    const cx = -120;
    const cz = -80;
    const flY = 0.05;

    // Tactical Metal Mesh Roof Outpost
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, flY, cz);
    this.scene.add(floor);

    // Dim Red Tactical Night Vision Lighting
    const tacticalLight = new THREE.PointLight(0xef4444, 2.0, 22);
    tacticalLight.position.set(cx, 6.5, cz);
    this.scene.add(tacticalLight);
    this.interiorLights.push(tacticalLight);

    // Roof Access Heavy Steel Hatch Door (💥 Weak door: F KICK BREACH)
    this.doorSystem.addDoor({
      id: 'door_sniper_hatch',
      name: 'Tactical Outpost Access Door',
      category: 'weak',
      type: 'weak_wood',
      position: new THREE.Vector3(cx, 0, cz - 13.8),
      rotationY: 0,
      isLocked: false,
      health: 80,
    });

    // Sniper Sandbag Wall & Bench
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const sandbags = new THREE.Mesh(new THREE.BoxGeometry(8, 1.4, 1.5), sandbagMat);
    sandbags.position.set(cx, 0.7, cz + 10);
    this.scene.add(sandbags);

    this.colliders.push({
      mesh: sandbags,
      type: 'prop',
      collider: { minX: cx - 4.2, maxX: cx + 4.2, minZ: cz + 9.1, maxZ: cz + 10.9, minY: 0, maxY: 1.6 },
    });

    // Tactical Sniper Munitions & Recon Cache
    const ammoCrate = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.6 })
    );
    ammoCrate.position.set(cx - 8, 0.6, cz + 4);
    this.scene.add(ammoCrate);

    this.interactiveProps.push({
      id: 'crate_sniper_munitions',
      name: 'Tactical Recon Munitions Stash',
      position: ammoCrate.position.clone(),
      type: 'safe',
      cashReward: 8000,
      mesh: ammoCrate,
      promptText: '[E] Restock Sniper Ammo & Collect Bounty ($8,000)',
    });
  }

  public getClosestInteractiveProp(pos: THREE.Vector3, maxDist = 3.2): InteractiveProp | null {
    let closest: InteractiveProp | null = null;
    let minD = maxDist;

    this.interactiveProps.forEach((prop) => {
      if (prop.isLooted) return;
      const dist = pos.distanceTo(prop.position);
      if (dist < minD) {
        minD = dist;
        closest = prop;
      }
    });

    return closest;
  }
}
