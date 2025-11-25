export enum GameStatus {
  MENU,
  BRIEFING,
  PLAYING,
  GAME_OVER
}

export type WeaponType = 'rifle' | 'spread' | 'laser' | 'flame';
export type EnemyType = 'runner' | 'drone' | 'jumper' | 'boss';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface MissionData {
  codename: string;
  objective: string;
  intel: string;
}

// Game Entities Types (Used inside the canvas logic)
export interface Entity {
  id: string;
  type: 'player' | 'enemy' | 'bullet' | 'particle' | 'platform' | 'powerup' | 'boss_projectile';
  subtype?: EnemyType; // Specific type for enemies
  weaponType?: WeaponType; // For player or powerups
  pos: Vector2;
  vel: Vector2;
  size: Size;
  color: string;
  hp: number;
  maxHp: number;
  markedForDeletion: boolean;
  direction: 1 | -1; // 1 right, -1 left
  isGrounded?: boolean;
  ttl?: number; // Time to live (for particles)
  
  // Advanced logic props
  attackTimer?: number;
  bossPhase?: number; // 0: Entering, 1: Phase 1, 2: Phase 2
  penetration?: number; // How many enemies a bullet can hit
}