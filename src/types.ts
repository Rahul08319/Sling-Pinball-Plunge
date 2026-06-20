export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  multiplierReached: number;
  pegsCleared: number;
  date: string;
}

export type GameMode = 'CLASSIC' | 'BUMPER_MANIA' | 'PEG_ZEN' | 'TIME_TRIAL';

export type BallColorStyle = 'PLASMA_BLUE' | 'INFERNO_RED' | 'ACID_GREEN';

export type SoundTheme = 'RETRO_ARCADE' | 'CYBER_SYNTH' | 'MINIMALIST_ZEN';

export type PegType = 'STANDARD' | 'GOLDEN' | 'MULTIPLIER' | 'PORTAL';

export interface Peg {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: PegType;
  color: string;
  points: number;
  isDissolved: boolean;
  dissolvedAt: number | null; // Null if active, timestamp when dissolved
}

export interface Bumper {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  points: number;
  flashIntensity: number; // 0 to 1 for hit animate
  hitCount: number;
  scale: number; // For satisfying expand-on-hit bounce
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  mass: number;
  trail: { x: number; y: number }[];
  isLocked: boolean; // Sitting in slingshot
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  decay: number;
}

export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  life: number;
}

export interface Flipper {
  x: number;
  y: number;
  length: number;
  angle: number; // Current angle in radians
  baseAngle: number; // Rest angle
  targetAngle: number; // Maximum swing angle
  isRight: boolean;
  angularSpeed: number;
  currentAngularVelocity: number;
  isActive: boolean;
}
