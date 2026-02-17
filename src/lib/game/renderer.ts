import type { Collectible, Enemy, MovingPlatform, Player } from './entities';
import type { LevelDefinition } from './levels';
import { TILE_SIZE } from './entities';

export interface RenderState {
  level: LevelDefinition;
  player: Player;
  enemies: Enemy[];
  collectibles: Collectible[];
  platforms: MovingPlatform[];
  cameraX: number;
  elapsed: number;
}

export const renderGame = (ctx: CanvasRenderingContext2D, state: RenderState, width: number, height: number) => {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const camX = state.cameraX;

  ctx.fillStyle = '#04111f';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 2; i++) {
    const factor = i === 0 ? 0.2 : 0.4;
    const offset = -(camX * factor) % width;
    ctx.fillStyle = i === 0 ? '#0b2238' : '#12314d';
    for (let x = -width; x < width * 2; x += 80) {
      ctx.fillRect(x + offset, 120 - i * 30, 50, 120);
    }
  }

  state.level.tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      const sx = x * TILE_SIZE - camX;
      const sy = y * TILE_SIZE;
      if (sx + TILE_SIZE < 0 || sx > width) return;
      if (tile === 1) {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(sx + 2, sy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }
      if (tile === 2) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(sx, sy + TILE_SIZE);
        ctx.lineTo(sx + TILE_SIZE / 2, sy + 2);
        ctx.lineTo(sx + TILE_SIZE, sy + TILE_SIZE);
        ctx.fill();
      }
    });
  });

  state.platforms.forEach((p) => {
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(p.x - camX, p.y, p.w, p.h);
  });

  state.collectibles.forEach((c) => {
    if (c.collected) return;
    const pulse = 1 + Math.sin(state.elapsed * 7 + c.pulse) * 0.2;
    ctx.fillStyle = c.secret ? '#22d3ee' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(c.x - camX, c.y, c.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  });

  state.enemies.forEach((e) => {
    if (!e.alive) return;
    ctx.fillStyle = e.type === 'patrol' ? '#fb7185' : '#f97316';
    ctx.fillRect(e.x - camX, e.y, e.w, e.h);
    ctx.fillStyle = '#111827';
    ctx.fillRect(e.x - camX + 2, e.y + 3, 2, 2);
  });

  if (state.player.invuln > 0 && Math.floor(state.elapsed * 20) % 2 === 0) return;

  const frameOffset = state.player.walkFrame % 2 === 0 ? 0 : 1;
  ctx.fillStyle = '#34d399';
  ctx.fillRect(state.player.x - camX, state.player.y, state.player.w, state.player.h);
  ctx.fillStyle = '#111827';
  ctx.fillRect(state.player.x - camX + (state.player.facing === 1 ? 7 : 3), state.player.y + 4, 2, 2);
  ctx.fillStyle = '#065f46';
  ctx.fillRect(state.player.x - camX + 2, state.player.y + state.player.h - 2, 3, 2 + frameOffset);
  ctx.fillRect(state.player.x - camX + 7, state.player.y + state.player.h - 2, 3, 2 + (1 - frameOffset));

  ctx.strokeStyle = '#22d3ee';
  ctx.strokeRect(state.level.exit.x - camX, state.level.exit.y, state.level.exit.w, state.level.exit.h);
};
