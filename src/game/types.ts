export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type WeaponType = 
  | 'pistol' 
  | 'smg' 
  | 'rifle' 
  | 'shotgun' 
  | 'sniper' 
  | 'rpg' 
  | 'grenade' 
  | 'katana';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  category: 'pistol' | 'smg' | 'rifle' | 'heavy' | 'melee' | 'throwable';
  damage: number;
  fireRate: number; // rounds per second
  magazineSize: number;
  reserveAmmo: number;
  maxAmmo: number;
  range: number;
  spread: number;
  recoil: number;
  reloadTime: number; // in seconds
  price: number;
  unlocked: boolean;
  color: string;
  description: string;
  bulletSpeed: number;
  isExplosive?: boolean;
}

export type VehicleType = 'sports' | 'suv' | 'motorcycle' | 'police' | 'helicopter' | 'taxi' | 'sedan';

export type CameraMode = 'first_person' | 'third_person';

export interface VehicleDef {
  id: VehicleType;
  name: string;
  maxSpeed: number; // m/s
  acceleration: number;
  handling: number;
  braking: number;
  durability: number;
  color: string;
  hasSiren?: boolean;
  isAirVehicle?: boolean;
  price: number;
}

export interface PlayerStats {
  kills: number;
  policeKills: number;
  headshots: number;
  deaths: number;
  heistsCompleted: number;
  cashEarned: number;
  distanceDrivenKm: number;
  maxWantedStars: number;
  stuntsCompleted?: number;
  longestJumpMeters?: number;
  stuntCashEarned?: number;
}

export type StuntTier = 'bronze' | 'silver' | 'gold' | 'legendary';

export interface StuntBonusEvent {
  distance: number;
  height: number;
  airTime: number;
  tier: StuntTier;
  tierLabel: string;
  reward: number;
}

export interface Mission {
  id: string;
  title: string;
  client: string;
  clientAvatar: string;
  description: string;
  rewardCash: number;
  rewardXP: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  targetLocation: Vector3D;
  stages: MissionStage[];
  completed: boolean;
}

export interface MissionStage {
  id: string;
  instruction: string;
  type: 'reach_location' | 'eliminate_targets' | 'steal_vehicle' | 'hack_vault' | 'survive_police';
  targetLocation?: Vector3D;
  targetCount?: number;
  currentCount?: number;
  timeLimit?: number; // seconds
  isCompleted: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  dj: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: 'system' | 'player' | 'bot' | 'police' | 'radio';
  timestamp: string;
}

export interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: WeaponType | 'vehicle' | 'explosion' | 'stunt';
  isHeadshot?: boolean;
  isStunt?: boolean;
  stuntData?: StuntBonusEvent;
}

export interface RemotePlayer {
  id: string;
  name: string;
  pos: Vector3D;
  rotY: number;
  health: number;
  armor: number;
  currentWeapon: WeaponType;
  isDriving: boolean;
  vehicleId?: string;
  ping: number;
  bounty: number;
  color: string;
  kills: number;
}
