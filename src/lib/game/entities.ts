export const TILE_SIZE = 16;

export type EnemyType = 'patrol' | 'hopper';

export interface EntityBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
}

export interface Player extends EntityBase {
  hearts: number;
  facing: -1 | 1;
  sprinting: boolean;
  invuln: number;
  walkFrame: number;
}

export interface Enemy extends EntityBase {
  type: EnemyType;
  direction: -1 | 1;
  speed: number;
  alive: boolean;
  aiTimer: number;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  radius: number;
  value: number;
  collected: boolean;
  pulse: number;
  secret?: boolean;
}

export interface MovingPlatform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  speed: number;
  dir: 1 | -1;
}

export const createPlayer = (x: number, y: number): Player => ({
  id: 'player',
  x,
  y,
  w: 12,
  h: 14,
  vx: 0,
  vy: 0,
  grounded: false,
  hearts: 3,
  facing: 1,
  sprinting: false,
  invuln: 0,
  walkFrame: 0
});
