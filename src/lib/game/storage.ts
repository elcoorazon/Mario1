export interface ProgressData {
  highestUnlockedLevel: number;
  bestScorePerLevel: Record<number, number>;
  fastestTimePerLevel: Record<number, number>;
  bestTotalScore: number;
  settings: { muted: boolean; volume: number };
  playerName: string;
}

export interface LeaderboardEntry {
  name: string;
  totalScore: number;
  totalTime: number;
  date: string;
}

const PROGRESS_KEY = 'skyward.scrap.progress.v1';
const LEADERBOARD_KEY = 'skyward.scrap.leaderboard.v1';

const defaultProgress: ProgressData = {
  highestUnlockedLevel: 1,
  bestScorePerLevel: {},
  fastestTimePerLevel: {},
  bestTotalScore: 0,
  settings: { muted: false, volume: 0.4 },
  playerName: 'PLAYER'
};

export const loadProgress = (): ProgressData => {
  if (typeof window === 'undefined') return defaultProgress;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    return {
      ...defaultProgress,
      ...parsed,
      settings: { ...defaultProgress.settings, ...(parsed.settings || {}) },
      bestScorePerLevel: parsed.bestScorePerLevel || {},
      fastestTimePerLevel: parsed.fastestTimePerLevel || {}
    };
  } catch {
    return defaultProgress;
  }
};

export const saveProgress = (progress: ProgressData) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
};

export const resetProgress = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROGRESS_KEY);
};

export const loadLeaderboard = (): LeaderboardEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
};

export const addLeaderboardEntry = (entry: LeaderboardEntry) => {
  const next = [...loadLeaderboard(), entry]
    .sort((a, b) => (b.totalScore === a.totalScore ? a.totalTime - b.totalTime : b.totalScore - a.totalScore))
    .slice(0, 10);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next));
};

export const clearLeaderboard = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEADERBOARD_KEY);
};

export const STORAGE_KEYS = {
  PROGRESS_KEY,
  LEADERBOARD_KEY
};
