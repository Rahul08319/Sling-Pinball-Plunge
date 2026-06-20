import { GameMode, LeaderboardEntry, BallColorStyle } from '../types';
import { Volume2, VolumeX, Award, Sparkles, HelpCircle, Gamepad2, Compass, Zap, Sliders } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { audio } from './AudioEngine';

interface NeonDashboardProps {
  score: number;
  ballsRemaining: number;
  multiplier: number;
  multiplierProgress: number;
  pegsCleared: number;
  highStreak: number;
  activeMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetBoard: () => void;
  leaderboard: LeaderboardEntry[];
  onClearLeaderboard: () => void;
  activeBallStyle?: BallColorStyle;
  onBallStyleChange?: (style: BallColorStyle) => void;
}

export default function NeonDashboard({
  score,
  ballsRemaining,
  multiplier,
  multiplierProgress,
  pegsCleared,
  highStreak,
  activeMode,
  onModeChange,
  isMuted,
  onToggleMute,
  onResetBoard,
  leaderboard,
  onClearLeaderboard,
  activeBallStyle = 'PLASMA_BLUE',
  onBallStyleChange,
}: NeonDashboardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [volume, setVolume] = useState(() => Math.round(audio.getVolume() * 100));

  return (
    <div className="flex flex-col gap-5 w-full text-white">
      {/* Top Banner Control Board */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 border border-white/5 bg-black/40 backdrop-blur rounded-xl shadow-xl">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-lg font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Sling-Pinball Plunge
            </h1>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Sys.Engine.Active // Sandbox ver. 2.0.4</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            id="mute-toggle-btn"
            onClick={onToggleMute}
            className={`p-2 px-3 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono uppercase ${
              isMuted
                ? 'border-red-950/40 bg-zinc-950 text-red-400 hover:bg-zinc-900'
                : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Muted' : 'Sound'}</span>
          </button>

          {/* Help Manual */}
          <button
            id="help-toggle-btn"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-2 px-3 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-mono uppercase ${
              showHelp 
                ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400'
                : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Guide</span>
          </button>

          {/* Quick Reload */}
          <button
            id="board-reset-btn"
            onClick={onResetBoard}
            className="p-2 px-4 rounded-lg border border-cyan-500/30 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all font-mono text-xs uppercase font-bold cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.15)]"
          >
            Reset Arena
          </button>
        </div>
      </div>

      {/* Main Grid: Info Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Panel 1: Mode Selectors */}
        <div className="flex flex-col p-4 border border-white/5 bg-black/40 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-zinc-500" />
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
              SELECT GAME MODE
            </h2>
          </div>
          
          <div className="flex flex-col gap-2 mt-1">
            {[
              {
                id: 'CLASSIC' as GameMode,
                name: 'Classic Plunge',
                desc: '3 balls, high stakes multiplier climb.',
                colorClass: 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                activeClass: 'border-cyan-500 ring-1 ring-cyan-500/20 bg-cyan-950/20 text-white',
              },
              {
                id: 'BUMPER_MANIA' as GameMode,
                name: 'Bumper Chaos',
                desc: 'Extra center bumpers. Infinite launches.',
                colorClass: 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                activeClass: 'border-fuchsia-500 ring-1 ring-fuchsia-500/20 bg-fuchsia-950/20 text-white',
              },
              {
                id: 'PEG_ZEN' as GameMode,
                name: 'Zen Sandbox',
                desc: 'No drain levels. Clear at your own pace.',
                colorClass: 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                activeClass: 'border-yellow-500 ring-1 ring-yellow-500/20 bg-yellow-950/20 text-white',
              },
              {
                id: 'TIME_TRIAL' as GameMode,
                name: 'Time Trial',
                desc: '60s countdown. Clear board before time limits!',
                colorClass: 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                activeClass: 'border-rose-500 ring-1 ring-rose-500/20 bg-rose-950/20 text-white',
              },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  if (activeMode !== mode.id) {
                    onModeChange(mode.id);
                  }
                }}
                className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                  activeMode === mode.id ? mode.activeClass : mode.colorClass
                }`}
              >
                <div className="font-bold mb-1 flex items-center justify-between">
                  <span className="uppercase tracking-wider">{mode.name}</span>
                  {activeMode === mode.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">{mode.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Panel 2: Live Multipliers & Target Progress */}
        <div className="flex flex-col p-4 border border-white/5 bg-black/40 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
              CHIME MULTIPLIER
            </h2>
          </div>

          <div className="flex flex-col gap-3 justify-center items-center flex-grow py-2">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase mb-1">active multiplier</span>
              <motion.span
                id="active-multiplier-text"
                key={multiplier}
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 0.3 }}
                className="text-5xl font-black italic text-cyan-400 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                x{multiplier.toFixed(1)}
              </motion.span>
            </div>

            {/* Glowing Multiplier Progression Tube */}
            <div className="w-full flex flex-col gap-1 mt-1">
              <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                <span>Charge Bar</span>
                <span>{score > 0 ? `${pegsCleared} pegs cleared` : 'Uncharged'}</span>
              </div>
              <div className="w-full h-3 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                  style={{ width: `${Math.min(100, Math.max(0, multiplierProgress))}%` }}
                />
              </div>
              <p className="text-[9px] font-mono text-center text-zinc-500 mt-1 leading-tight">
                Chain hits to prevent decay.
              </p>
            </div>
          </div>
        </div>

        {/* Panel 3: High Score Leaderboard logs */}
        <div className="flex flex-col p-4 border border-white/5 bg-black/40 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-400" />
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
                HIGH SCORE ROLL
              </h2>
            </div>
            <button
              onClick={onClearLeaderboard}
              className="text-[9px] text-zinc-500 hover:text-red-400 font-mono uppercase tracking-wider transition-all cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-col gap-1.5 flex-grow font-mono">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.id}
                className={`p-2 rounded flex items-center justify-between text-xs border ${
                  idx === 0
                    ? 'border-yellow-500/20 bg-yellow-500/5 text-yellow-300'
                    : 'border-zinc-900 bg-zinc-950/40 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 font-semibold">#{idx + 1}</span>
                  <span className="font-bold tracking-wide">{entry.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-zinc-500 font-bold">X{entry.multiplierReached}</span>
                  <span className="font-black italic text-zinc-100">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel row 2: Customize Preferences (Volume slider & Ball styles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sound Settings & Independent Master Volume Slider */}
        <div className="flex flex-col p-4 border border-white/5 bg-black/40 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
              MASTER VOLUME ENGINE
            </h2>
          </div>
          
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono uppercase">Master Volume ({volume}%)</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
                {volume === 0 ? 'MUTED' : volume <= 30 ? 'SOFT' : volume <= 70 ? 'MEDIUM' : 'MAX'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                id="master-volume-slider"
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  audio.setVolume(val / 100);
                  if (isMuted && val > 0) {
                    onToggleMute();
                  }
                }}
                className="flex-1 accent-cyan-400 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer range-sm"
              />
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
            <p className="text-[9px] font-mono text-zinc-500">
              Adjust the audio synthesizer master-gain. Sliding above 0% automatically unmutes the device output.
            </p>
          </div>
        </div>

        {/* Visual Pinball Customiser (Plasma Blue, Inferno Red, Acid Green) */}
        <div className="flex flex-col p-4 border border-white/5 bg-black/40 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-fuchsia-400" />
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
              PINBALL EMULATION STYLING
            </h2>
          </div>

          <div className="flex flex-col gap-2.5 py-1">
            <span className="text-xs text-zinc-400 font-mono uppercase mb-0.5">SELECT PARTICLE TRAIL STYLE</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'PLASMA_BLUE' as BallColorStyle,
                  name: 'Plasma',
                  color: 'Cyan Blue',
                  btnClass: 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/20',
                  activeClass: 'border-cyan-400 bg-cyan-950/30 text-cyan-400 ring-1 ring-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.25)]',
                },
                {
                  id: 'INFERNO_RED' as BallColorStyle,
                  name: 'Inferno',
                  color: 'Inferno Red',
                  btnClass: 'border-rose-500/30 text-rose-400 hover:bg-rose-950/20',
                  activeClass: 'border-rose-400 bg-rose-950/30 text-rose-400 ring-1 ring-rose-400/20 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
                },
                {
                  id: 'ACID_GREEN' as BallColorStyle,
                  name: 'Acid',
                  color: 'Acid Green',
                  btnClass: 'border-green-500/30 text-green-400 hover:bg-green-950/20',
                  activeClass: 'border-green-400 bg-green-950/30 text-green-400 ring-1 ring-green-400/20 shadow-[0_0_12px_rgba(34,197,94,0.25)]',
                },
              ].map((style) => (
                <button
                  id={`ball-style-${style.id.toLowerCase()}`}
                  key={style.id}
                  onClick={() => onBallStyleChange?.(style.id)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer font-mono text-[10px] uppercase font-bold flex flex-col gap-0.5 items-center ${
                    activeBallStyle === style.id ? style.activeClass : style.btnClass
                  }`}
                >
                  <span>{style.name}</span>
                  <span className="text-[7.5px] font-normal tracking-tight text-zinc-500">{style.color}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] font-mono text-zinc-500">
              Changes the fluorescent core color and retro chiptune particle residue trailing!
            </p>
          </div>
        </div>
      </div>

      {/* Guide Help Sheet slide down overlay */}
      {showHelp && (
        <motion.div
          id="help-panel"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-5 border border-white/5 bg-[#0a0a0f] rounded-xl flex flex-col gap-3 font-sans shadow-2xl"
        >
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold uppercase tracking-wider text-sm">Plunge Masterclass manual</h3>
          </div>
          <div className="text-xs text-zinc-400 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <p>
                <strong className="text-zinc-200">Slingshot Launching:</strong> Click/tap and drag back from the ball inside the launcher lane (the glowing right groove). Dragging deeper will store launch spring velocity. Let go to project!
              </p>
              <p>
                <strong className="text-zinc-200">Peg Collisions:</strong> Standard Blue Pegs dissolve when hit, accumulating multiplier points and scores. Golden Pegs reward massive bonus counts!
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p>
                <strong className="text-zinc-200">Twin-Bumper Cradle Trap:</strong> In the center-right is a specific set of high-value bumpers. Angle your launch trajectory so the ball falls through the yellow guide, pinning itself in rapid-bouncing motion between them for cascading chimes and intense multiplier multipliers!
              </p>
              <p>
                <strong className="text-zinc-200">Flippers:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 text-white border border-zinc-800 text-[10px]">A</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 text-white border border-zinc-805 text-[10px]">←</kbd> for Left paddle; <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 text-white border border-zinc-800 text-[10px]">D</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 text-white border border-zinc-805 text-[10px]">→</kbd> for Right paddle.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
