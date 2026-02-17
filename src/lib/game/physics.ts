import type { Enemy, MovingPlatform, Player } from './entities';
import { TILE_SIZE } from './entities';

const GRAVITY = 900;

const overlaps = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export const rectsOverlap = overlaps;

export const tileAt = (tiles: number[][], tx: number, ty: number) => {
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return 1;
  return tiles[ty][tx];
};

const collidesSolid = (tiles: number[][], x: number, y: number, w: number, h: number) => {
  const startX = Math.floor(x / TILE_SIZE);
  const endX = Math.floor((x + w - 1) / TILE_SIZE);
  const startY = Math.floor(y / TILE_SIZE);
  const endY = Math.floor((y + h - 1) / TILE_SIZE);

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      if (tileAt(tiles, tx, ty) === 1) return true;
    }
  }
  return false;
};

export const touchesSpike = (tiles: number[][], x: number, y: number, w: number, h: number) => {
  const startX = Math.floor(x / TILE_SIZE);
  const endX = Math.floor((x + w - 1) / TILE_SIZE);
  const startY = Math.floor(y / TILE_SIZE);
  const endY = Math.floor((y + h - 1) / TILE_SIZE);

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      if (tileAt(tiles, tx, ty) === 2) return true;
    }
  }
  return false;
};

const applyMotion = (entity: Player | Enemy, tiles: number[][], dt: number, platforms: MovingPlatform[]) => {
  entity.grounded = false;
  entity.vy += GRAVITY * dt;

  let nextX = entity.x + entity.vx * dt;
  if (!collidesSolid(tiles, nextX, entity.y, entity.w, entity.h)) {
    entity.x = nextX;
  } else {
    const step = Math.sign(entity.vx);
    while (Math.abs(entity.x - nextX) > 0.5) {
      const tryX = entity.x + step;
      if (collidesSolid(tiles, tryX, entity.y, entity.w, entity.h)) break;
      entity.x = tryX;
    }
    entity.vx = 0;
  }

  const platform = platforms.find((p) => overlaps(entity.x, entity.y + entity.h + 1, entity.w, 2, p.x, p.y, p.w, p.h));

  let nextY = entity.y + entity.vy * dt;
  if (!collidesSolid(tiles, entity.x, nextY, entity.w, entity.h)) {
    entity.y = nextY;
  } else {
    const step = Math.sign(entity.vy);
    while (Math.abs(entity.y - nextY) > 0.5) {
      const tryY = entity.y + step;
      if (collidesSolid(tiles, entity.x, tryY, entity.w, entity.h)) break;
      entity.y = tryY;
    }
    if (entity.vy > 0) entity.grounded = true;
    entity.vy = 0;
  }

  if (platform && entity.vy >= 0 && entity.y + entity.h <= platform.y + 8) {
    const feetY = entity.y + entity.h;
    if (feetY >= platform.y - 2 && feetY <= platform.y + 8) {
      entity.y = platform.y - entity.h;
      entity.vy = 0;
      entity.grounded = true;
      entity.x += platform.speed * platform.dir * dt;
    }
  }
};

export const simulatePlayer = (player: Player, tiles: number[][], dt: number, platforms: MovingPlatform[]) => {
  applyMotion(player, tiles, dt, platforms);
};

export const simulateEnemy = (enemy: Enemy, tiles: number[][], dt: number, platforms: MovingPlatform[]) => {
  applyMotion(enemy, tiles, dt, platforms);
};

export const updatePlatforms = (platforms: MovingPlatform[], dt: number) => {
  platforms.forEach((platform) => {
    platform.x += platform.speed * platform.dir * dt;
    if (platform.x <= platform.minX) {
      platform.x = platform.minX;
      platform.dir = 1;
    }
    if (platform.x + platform.w >= platform.maxX) {
      platform.x = platform.maxX - platform.w;
      platform.dir = -1;
    }
  });
};
