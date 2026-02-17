'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { chipAudio } from '@/lib/game/audio';
import { createPlayer, type Collectible, type Enemy, type MovingPlatform, type Player } from '@/lib/game/entities';
import { getInputState, installKeyboard, clearJump, resetInput, setTouchControl } from '@/lib/game/input';
import { LEVELS, type LevelDefinition } from '@/lib/game/levels';
import { rectsOverlap, simulateEnemy, simulatePlayer, touchesSpike, updatePlatforms } from '@/lib/game/physics';
import { renderGame } from '@/lib/game/renderer';
import {
  STORAGE_KEYS,
  addLeaderboardEntry,
  clearLeaderboard,
  loadLeaderboard,
  loadProgress,
  resetProgress,
  saveProgress,
  type LeaderboardEntry,
  type ProgressData
} from '@/lib/game/storage';

type Scene = 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'victory' | 'leaderboard' | 'settings' | 'levelSelect';

interface RunStats {
  levelScore: number;
  enemyScore: number;
  collectScore: number;
  totalScore: number;
  startTime: number;
  levelTimes: Record<number, number>;
}

const WIDTH = 768;
const HEIGHT = 320;

const cloneLevel = (level: LevelDefinition) => ({
  ...level,
  tiles: level.tiles.map((r) => [...r]),
  enemies: level.enemies.map((e) => ({ ...e })),
  collectibles: level.collectibles.map((c) => ({ ...c })),
  movingPlatforms: level.movingPlatforms.map((p) => ({ ...p }))
});

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const levelRef = useRef<LevelDefinition>(cloneLevel(LEVELS[0]));
  const playerRef = useRef<Player>(createPlayer(LEVELS[0].playerSpawn.x, LEVELS[0].playerSpawn.y));
  const enemiesRef = useRef<Enemy[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const platformsRef = useRef<MovingPlatform[]>([]);
  const cameraRef = useRef(0);
  const [scene, setScene] = useState<Scene>('menu');
  const [levelIndex, setLevelIndex] = useState(1);
  const [hudScore, setHudScore] = useState(0);
  const [hudTime, setHudTime] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [run, setRun] = useState<RunStats>({ levelScore: 0, enemyScore: 0, collectScore: 0, totalScore: 0, startTime: 0, levelTimes: {} });

  const hasContinue = useMemo(() => (progress ? progress.highestUnlockedLevel > 1 || progress.bestTotalScore > 0 : false), [progress]);

  const initLevel = (index: number, keepHearts = true) => {
    const fresh = cloneLevel(LEVELS[index - 1]);
    levelRef.current = fresh;
    playerRef.current = createPlayer(fresh.playerSpawn.x, fresh.playerSpawn.y);
    if (keepHearts) playerRef.current.hearts = hearts;
    else playerRef.current.hearts = 3;
    enemiesRef.current = fresh.enemies;
    collectiblesRef.current = fresh.collectibles;
    platformsRef.current = fresh.movingPlatforms;
    cameraRef.current = 0;
    setLevelIndex(index);
    setHudTime(0);
  };

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setBoard(loadLeaderboard());
    chipAudio.updateSettings(p.settings);
  }, []);

  useEffect(() => installKeyboard(), []);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (scene === 'playing') {
        const level = levelRef.current;
        const player = playerRef.current;
        const input = getInputState();
        const speed = input.sprint ? 130 : 95;
        player.sprinting = input.sprint;

        if (input.left) {
          player.vx = -speed;
          player.facing = -1;
        } else if (input.right) {
          player.vx = speed;
          player.facing = 1;
        } else {
          player.vx *= 0.75;
          if (Math.abs(player.vx) < 4) player.vx = 0;
        }

        if (input.jump && player.grounded) {
          player.vy = -305;
          player.grounded = false;
          clearJump();
          chipAudio.jump();
        }

        updatePlatforms(platformsRef.current, dt);
        simulatePlayer(player, level.tiles, dt, platformsRef.current);

        if (Math.abs(player.vx) > 15 && player.grounded) player.walkFrame += dt * 8;
        if (player.invuln > 0) player.invuln -= dt;

        enemiesRef.current.forEach((enemy) => {
          if (!enemy.alive) return;
          enemy.aiTimer += dt;
          if (enemy.type === 'patrol') {
            enemy.vx = enemy.direction * enemy.speed;
            const edgeX = enemy.x + (enemy.direction === 1 ? enemy.w + 2 : -2);
            const aheadTile = Math.floor(edgeX / 16);
            const footTile = Math.floor((enemy.y + enemy.h + 2) / 16);
            const wallTile = Math.floor((enemy.y + enemy.h / 2) / 16);
            if (level.tiles[wallTile]?.[aheadTile] === 1 || level.tiles[footTile]?.[aheadTile] === 0) enemy.direction *= -1;
          } else {
            enemy.vx = enemy.direction * (enemy.aiTimer % 2.5 < 0.45 ? enemy.speed * 1.8 : enemy.speed * 0.35);
            if (enemy.grounded && enemy.aiTimer % 2.2 < 0.05) {
              enemy.vy = -250;
              enemy.direction = player.x > enemy.x ? 1 : -1;
            }
          }
          simulateEnemy(enemy, level.tiles, dt, platformsRef.current);

          if (rectsOverlap(player.x, player.y, player.w, player.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
            if (player.vy > 0 && player.y + player.h - enemy.y < 8) {
              enemy.alive = false;
              player.vy = -180;
              chipAudio.enemyDefeat();
              setRun((r) => ({ ...r, enemyScore: r.enemyScore + 200, levelScore: r.levelScore + 200, totalScore: r.totalScore + 200 }));
            } else if (player.invuln <= 0) {
              player.hearts -= 1;
              player.invuln = 1.2;
              setHearts(player.hearts);
              chipAudio.hit();
              if (player.hearts <= 0) {
                chipAudio.gameOver();
                setScene('gameOver');
              }
            }
          }
        });

        collectiblesRef.current.forEach((c) => {
          c.pulse += dt;
          if (c.collected) return;
          if (rectsOverlap(player.x, player.y, player.w, player.h, c.x - c.radius, c.y - c.radius, c.radius * 2, c.radius * 2)) {
            c.collected = true;
            chipAudio.collect();
            setRun((r) => ({ ...r, collectScore: r.collectScore + c.value, levelScore: r.levelScore + c.value, totalScore: r.totalScore + c.value }));
          }
        });

        if (touchesSpike(level.tiles, player.x, player.y, player.w, player.h) || player.y > level.height * 16 + 40) {
          if (player.invuln <= 0) {
            player.hearts -= 1;
            player.invuln = 1;
            player.x = level.playerSpawn.x;
            player.y = level.playerSpawn.y;
            setHearts(player.hearts);
            chipAudio.hit();
            if (player.hearts <= 0) {
              chipAudio.gameOver();
              setScene('gameOver');
            }
          }
        }

        cameraRef.current = Math.max(0, Math.min(player.x - WIDTH / 2, level.width * 16 - WIDTH));
        const elapsed = (performance.now() - run.startTime) / 1000;
        setHudTime(elapsed);
        setHudScore(run.totalScore);

        if (rectsOverlap(player.x, player.y, player.w, player.h, level.exit.x, level.exit.y, level.exit.w, level.exit.h)) {
          const levelTime = elapsed;
          const timeBonus = Math.max(0, Math.floor((level.timeTarget - levelTime) * 10));
          const completionBonus = 500;
          const levelTotal = run.levelScore + timeBonus + completionBonus;
          const nextTotal = run.totalScore + timeBonus + completionBonus;
          const nextLevel = levelIndex + 1;
          setRun((r) => ({
            ...r,
            levelScore: 0,
            totalScore: nextTotal,
            levelTimes: { ...r.levelTimes, [levelIndex]: levelTime }
          }));
          setHudScore(nextTotal);

          if (progress) {
            const copy = { ...progress };
            copy.highestUnlockedLevel = Math.max(copy.highestUnlockedLevel, Math.min(3, nextLevel));
            copy.bestScorePerLevel[levelIndex] = Math.max(copy.bestScorePerLevel[levelIndex] || 0, levelTotal);
            copy.fastestTimePerLevel[levelIndex] = Math.min(copy.fastestTimePerLevel[levelIndex] || 9999, levelTime);
            if (nextLevel > 3) copy.bestTotalScore = Math.max(copy.bestTotalScore, nextTotal);
            saveProgress(copy);
            setProgress(copy);
          }

          chipAudio.levelComplete();
          if (nextLevel > 3) {
            addLeaderboardEntry({
              name: progress?.playerName || 'PLAYER',
              totalScore: nextTotal,
              totalTime: Object.values({ ...run.levelTimes, [levelIndex]: levelTime }).reduce((a, b) => a + b, 0),
              date: new Date().toISOString().slice(0, 10)
            });
            setBoard(loadLeaderboard());
            setScene('victory');
          } else {
            setScene('levelComplete');
          }
        }

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) renderGame(ctx, { level, player, enemies: enemiesRef.current, collectibles: collectiblesRef.current, platforms: platformsRef.current, cameraX: cameraRef.current, elapsed: now / 1000 }, WIDTH, HEIGHT);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [scene, run, levelIndex, hearts, progress]);

  useEffect(() => {
    const keyToggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && (scene === 'playing' || scene === 'paused')) {
        setScene((s) => (s === 'paused' ? 'playing' : 'paused'));
      }
    };
    window.addEventListener('keydown', keyToggle);
    return () => window.removeEventListener('keydown', keyToggle);
  }, [scene]);

  const startRun = (level = 1) => {
    chipAudio.unlock();
    resetInput();
    setHearts(3);
    initLevel(level, false);
    setRun({ levelScore: 0, enemyScore: 0, collectScore: 0, totalScore: 0, startTime: performance.now(), levelTimes: {} });
    setScene('playing');
  };

  const continueRun = () => {
    chipAudio.unlock();
    startRun(Math.min(progress?.highestUnlockedLevel || 1, 3));
  };

  const nextLevel = () => {
    initLevel(levelIndex + 1);
    setRun((r) => ({ ...r, startTime: performance.now(), collectScore: 0, enemyScore: 0 }));
    setScene('playing');
  };

  const updateSettings = (muted: boolean, volume: number) => {
    if (!progress) return;
    const next = { ...progress, settings: { muted, volume } };
    setProgress(next);
    saveProgress(next);
    chipAudio.updateSettings(next.settings);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-5xl rounded-xl border border-slate-700 bg-slate-900/90 p-4">
        <h1 className="mb-2 text-2xl font-bold text-cyan-300">Skyward Scrap Runner</h1>
        <p className="mb-4 text-sm text-slate-300">A fully original retro platformer with crystal shards, rogue bots, and floating forge ruins.</p>

        <div className="relative mx-auto w-full max-w-[768px]">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="h-auto w-full rounded border border-slate-700 bg-black [image-rendering:pixelated]" />

          {(scene === 'menu' || scene === 'leaderboard' || scene === 'settings' || scene === 'levelSelect') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 p-4 text-center">
              {scene === 'menu' && (
                <>
                  <button className="w-56 rounded bg-cyan-600 px-4 py-2" onClick={() => startRun(1)}>New Game</button>
                  {hasContinue && <button className="w-56 rounded bg-indigo-600 px-4 py-2" onClick={continueRun}>Continue</button>}
                  <button className="w-56 rounded bg-slate-700 px-4 py-2" onClick={() => setScene('levelSelect')}>Level Select</button>
                  <button className="w-56 rounded bg-slate-700 px-4 py-2" onClick={() => setScene('leaderboard')}>Leaderboard</button>
                  <button className="w-56 rounded bg-slate-700 px-4 py-2" onClick={() => setScene('settings')}>Settings</button>
                </>
              )}

              {scene === 'levelSelect' && (
                <>
                  {[1, 2, 3].map((id) => (
                    <button key={id} disabled={(progress?.highestUnlockedLevel || 1) < id} className="w-56 rounded bg-violet-700 px-4 py-2 disabled:opacity-40" onClick={() => startRun(id)}>
                      Level {id}: {LEVELS[id - 1].name}
                    </button>
                  ))}
                  <button className="mt-2 rounded bg-slate-700 px-4 py-2" onClick={() => setScene('menu')}>Back</button>
                </>
              )}

              {scene === 'leaderboard' && (
                <>
                  <h2 className="text-lg font-semibold">Top 10 Runs</h2>
                  <ul className="space-y-1 text-sm">
                    {board.map((b, i) => <li key={`${b.date}-${i}`}>{i + 1}. {b.name} — {b.totalScore} pts — {b.totalTime.toFixed(1)}s — {b.date}</li>)}
                    {!board.length && <li>No runs yet.</li>}
                  </ul>
                  <button className="rounded bg-red-700 px-4 py-2" onClick={() => { clearLeaderboard(); setBoard([]); }}>Clear Leaderboard</button>
                  <button className="rounded bg-slate-700 px-4 py-2" onClick={() => setScene('menu')}>Back</button>
                </>
              )}

              {scene === 'settings' && progress && (
                <>
                  <div className="w-64 space-y-3 text-left">
                    <label className="flex items-center justify-between">Mute
                      <input type="checkbox" checked={progress.settings.muted} onChange={(e) => updateSettings(e.target.checked, progress.settings.volume)} />
                    </label>
                    <label className="block">Volume: {progress.settings.volume.toFixed(2)}
                      <input className="w-full" type="range" min={0} max={1} step={0.05} value={progress.settings.volume} onChange={(e) => updateSettings(progress.settings.muted, Number(e.target.value))} />
                    </label>
                    <label className="block">Player Initials
                      <input className="w-full rounded bg-slate-800 p-1" maxLength={8} value={progress.playerName} onChange={(e) => {
                        const next = { ...progress, playerName: e.target.value.toUpperCase() || 'PLAYER' };
                        setProgress(next);
                        saveProgress(next);
                      }} />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">Storage keys: {STORAGE_KEYS.PROGRESS_KEY}, {STORAGE_KEYS.LEADERBOARD_KEY}</p>
                  <button className="rounded bg-amber-700 px-4 py-2" onClick={() => { resetProgress(); setProgress(loadProgress()); }}>Reset Progress</button>
                  <button className="rounded bg-slate-700 px-4 py-2" onClick={() => setScene('menu')}>Back</button>
                </>
              )}
            </div>
          )}

          {(scene === 'paused' || scene === 'levelComplete' || scene === 'gameOver' || scene === 'victory') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center">
              {scene === 'paused' && <>
                <h2 className="text-xl font-bold">Paused</h2>
                <button className="rounded bg-emerald-700 px-4 py-2" onClick={() => setScene('playing')}>Resume</button>
                <button className="rounded bg-slate-700 px-4 py-2" onClick={() => startRun(levelIndex)}>Restart Level</button>
                <button className="rounded bg-slate-700 px-4 py-2" onClick={() => setScene('settings')}>Settings</button>
                <button className="rounded bg-rose-700 px-4 py-2" onClick={() => setScene('menu')}>Quit to Menu</button>
              </>}
              {scene === 'levelComplete' && <>
                <h2 className="text-xl font-bold">Level Complete</h2>
                <p>Score: {hudScore} | Time: {hudTime.toFixed(1)}s</p>
                <button className="rounded bg-cyan-700 px-4 py-2" onClick={nextLevel}>Next Level</button>
              </>}
              {scene === 'gameOver' && <>
                <h2 className="text-xl font-bold text-red-300">Game Over</h2>
                <button className="rounded bg-cyan-700 px-4 py-2" onClick={() => startRun(1)}>Restart</button>
                <button className="rounded bg-slate-700 px-4 py-2" onClick={() => setScene('menu')}>Menu</button>
              </>}
              {scene === 'victory' && <>
                <h2 className="text-xl font-bold text-yellow-300">Victory!</h2>
                <p>Total Score: {hudScore}</p>
                <p>Total Time: {Object.values(run.levelTimes).reduce((a, b) => a + b, 0).toFixed(1)}s</p>
                <p>Medal: {hudScore > 5000 ? 'Gold' : hudScore > 3500 ? 'Silver' : 'Bronze'}</p>
                <button className="rounded bg-cyan-700 px-4 py-2" onClick={() => setScene('menu')}>Back to Menu</button>
              </>}
            </div>
          )}
        </div>

        {scene === 'playing' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded bg-slate-800 p-2 text-sm">
            <span>Level {levelIndex}: {LEVELS[levelIndex - 1].name}</span>
            <span>Score: {hudScore}</span>
            <span>Hearts: {'❤'.repeat(hearts)}</span>
            <span>Time: {hudTime.toFixed(1)}s</span>
            <span className="text-xs text-slate-400">P to pause</span>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between md:hidden">
          <div className="flex gap-2">
            <button className="rounded bg-slate-700 px-5 py-4" onTouchStart={() => setTouchControl('left', true)} onTouchEnd={() => setTouchControl('left', false)}>◀</button>
            <button className="rounded bg-slate-700 px-5 py-4" onTouchStart={() => setTouchControl('right', true)} onTouchEnd={() => setTouchControl('right', false)}>▶</button>
          </div>
          <div className="flex gap-2">
            <button className="rounded bg-violet-700 px-5 py-4" onTouchStart={() => setTouchControl('sprint', true)} onTouchEnd={() => setTouchControl('sprint', false)}>RUN</button>
            <button className="rounded bg-cyan-700 px-6 py-4" onTouchStart={() => setTouchControl('jump', true)} onTouchEnd={() => setTouchControl('jump', false)}>JUMP</button>
          </div>
        </div>
      </div>
    </main>
  );
}
