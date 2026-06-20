import { useState, useEffect, useRef } from 'react';
import GameBoard from './components/GameBoard';
import NeonDashboard from './components/NeonDashboard';
import { GameMode, LeaderboardEntry, BallColorStyle } from './types';
import { audio } from './components/AudioEngine';
import { Trophy, Zap, HelpCircle, Gamepad2, Layers, RefreshCw, AlertTriangle, Smile } from 'lucide-react';
import { motion } from 'motion/react';
import NotificationToast, { ToastMessage } from './components/NotificationToast';

export default function App() {
  // Game statistics synced from GameBoard ref/trigger callbacks
  const [score, setScore] = useState(0);
  const [ballsRemaining, setBallsRemaining] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierProgress, setMultiplierProgress] = useState(0);
  const [pegsCleared, setPegsCleared] = useState(0);
  const [highStreak, setHighStreak] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Custom states matching requested features
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [ballColorStyle, setBallColorStyle] = useState<BallColorStyle>('PLASMA_BLUE');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Ref to ensure milestones are only announced once per run
  const triggeredMilestonesRef = useRef<Set<string>>(new Set());

  // App Configurations
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [isMuted, setIsMuted] = useState(false);
  const [gameResetKey, setGameResetKey] = useState(0);

  // Leaderboard lists
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Default initial leaderboard
  const defaultLeaderboard: LeaderboardEntry[] = [
    { id: '1', name: 'CHAMP_NEON', score: 250000, multiplierReached: 8, pegsCleared: 145, date: '2026-06-12' },
    { id: '2', name: 'SLING_MASTER', score: 120000, multiplierReached: 5, pegsCleared: 92, date: '2026-06-15' },
    { id: '3', name: 'PEG_SLAYER', score: 65000, multiplierReached: 3, pegsCleared: 46, date: '2026-06-18' },
  ];

  // Load leaderboard on initial mount
  useEffect(() => {
    const saved = localStorage.getItem('sling_pinball_leaderboard_v1');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        setLeaderboard(defaultLeaderboard);
      }
    } else {
      setLeaderboard(defaultLeaderboard);
      localStorage.setItem('sling_pinball_leaderboard_v1', JSON.stringify(defaultLeaderboard));
    }
  }, []);

  const triggerToast = (title: string, description: string, iconType: 'MILESTONE' | 'MULTIPLIER' | 'JACKPOT') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, title, description, iconType }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleGameStateChange = (stats: {
    score: number;
    ballsRemaining: number;
    multiplier: number;
    multiplierProgress: number;
    pegsCleared: number;
    highStreak: number;
    isPlaying: boolean;
    timeLeft?: number;
  }) => {
    setScore(stats.score);
    setBallsRemaining(stats.ballsRemaining);
    setMultiplier(stats.multiplier);
    setMultiplierProgress(stats.multiplierProgress);
    setPegsCleared(stats.pegsCleared);
    setHighStreak(stats.highStreak);
    setIsPlaying(stats.isPlaying);
    if (stats.timeLeft !== undefined) {
      setTimeLeft(stats.timeLeft);
    }

    // --- Key milestones and achievements popups ---
    // Multiplier milestone checks
    if (stats.multiplier >= 5 && !triggeredMilestonesRef.current.has('mult-5')) {
      triggeredMilestonesRef.current.add('mult-5');
      triggerToast('💥 Multiplier x5 Reached!', 'Your chiptune scores are now multiplied tenfold!', 'MULTIPLIER');
    }
    if (stats.multiplier >= 10 && !triggeredMilestonesRef.current.has('mult-10')) {
      triggeredMilestonesRef.current.add('mult-10');
      triggerToast('⚡ Mega Multiplier x10 Reached!', 'Hyper-acceleration speeds engaged! Watch the points cascade!', 'MULTIPLIER');
    }

    // Pegs dissolved/cleared milestone checks
    if (stats.pegsCleared >= 50 && !triggeredMilestonesRef.current.has('pegs-50')) {
      triggeredMilestonesRef.current.add('pegs-50');
      triggerToast('🎯 50 Pegs Cleared!', 'Outstanding trajectory control! Keep up the plunge depth!', 'MILESTONE');
    }
    if (stats.pegsCleared >= 100 && !triggeredMilestonesRef.current.has('pegs-100')) {
      triggeredMilestonesRef.current.add('pegs-100');
      triggerToast('🏆 100 Pegs Cleared!', 'Pristine board demolition index achieved! Total board mastery.', 'MILESTONE');
    }

    // Score milestones
    if (stats.score >= 100000 && !triggeredMilestonesRef.current.has('score-100k')) {
      triggeredMilestonesRef.current.add('score-100k');
      triggerToast('💰 100,000 Points Club!', 'Entering six-figure elite status on the retro dashboard!', 'JACKPOT');
    }
    if (stats.score >= 500000 && !triggeredMilestonesRef.current.has('score-500k')) {
      triggeredMilestonesRef.current.add('score-500k');
      triggerToast('✨ 500,000 Half-Million!', 'Absolute master of the Twin-Bumper Cradle Trap!', 'JACKPOT');
    }
  };

  const handleNewHighScore = (finalScore: number) => {
    if (finalScore <= 0) return;

    // Direct brief delay to allow canvas screen overlays to draw first
    setTimeout(() => {
      const isEligible = leaderboard.length < 5 || finalScore > leaderboard[leaderboard.length - 1].score;
      if (!isEligible) return;

      const handle = prompt(
        `🏆 CHAMPION! Score: ${finalScore.toLocaleString()} is a NEW HIGH SCORE!\nEnter your retro slot handle (e.g., NEON):`
      ) || 'PLAYER';
      
      const cleanedName = handle.trim().toUpperCase().slice(0, 10).replace(/[^A-Z0-9_]/g, '') || 'CHAMP';

      const newEntry: LeaderboardEntry = {
        id: Date.now().toString(),
        name: cleanedName,
        score: finalScore,
        multiplierReached: multiplier,
        pegsCleared: pegsCleared,
        date: new Date().toISOString().split('T')[0],
      };

      const updated = [...leaderboard, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setLeaderboard(updated);
      localStorage.setItem('sling_pinball_leaderboard_v1', JSON.stringify(updated));

      if (!isMuted) audio.playHighScoreSound();
    }, 100);
  };

  const handleClearLeaderboard = () => {
    if (confirm('Are you sure you want to scrub all active leaderboard logs?')) {
      setLeaderboard(defaultLeaderboard);
      localStorage.setItem('sling_pinball_leaderboard_v1', JSON.stringify(defaultLeaderboard));
    }
  };

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleRestart = () => {
    setGameResetKey((prev) => prev + 1);
    triggeredMilestonesRef.current.clear();
    setToasts([]);
  };

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(circle_at_center,_#111115_0%,_#020205_100%)] text-white py-6 px-4 md:px-8 selection:bg-cyan-500/30">
      
      {/* Dynamic Glowing LED Multiplier Charge Bar from theme */}
      <div className="w-full h-1.5 bg-zinc-900/90 relative z-40 mb-6 rounded-full overflow-hidden border border-white/5">
        <div 
          className="absolute left-0 top-0 h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, multiplierProgress))}%` }}
        />
        <div className="absolute right-4 -top-1.5 text-[8px] font-black text-cyan-400 uppercase tracking-[0.2em]">
          Multiplier Charge: {Math.floor(multiplierProgress)}%
        </div>
      </div>

      {/* Outer viewport centering containment */}
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Main Content Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN A: Interactive 2D Game Board (Cabinet Column) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center">
            
            {/* Visual Cabinet Frame Header containing professional arcade score HUD */}
            <div className="w-full max-w-[560px] bg-[#0c0c12]/95 border-t border-x border-zinc-800 p-5 rounded-t-xl flex justify-between items-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.05),0_15px_40px_rgba(0,0,0,0.6)]">
              
              {/* LED Current Session Score Display */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-1">
                  CURRENT SCORE
                </span>
                <span id="score-counter" className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {score.toLocaleString()}
                </span>
              </div>

              {/* Dynamic stats in header and Pinballs Left */}
              <div className="flex gap-6 items-center flex-wrap sm:flex-nowrap justify-end">
                {gameMode === 'TIME_TRIAL' && (
                  <div className="text-right border-r border-zinc-800 pr-4">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.3em] mb-0.5 block animate-pulse">
                      Time Trial
                    </span>
                    <div className="text-xl font-black italic text-rose-400 font-mono tracking-wide">
                      {timeLeft}s
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.3em] mb-0.5 block">
                    Multiplier
                  </span>
                  <div className="text-xl font-black italic text-cyan-400 font-mono">
                    x{multiplier.toFixed(1)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-[0.3em] mb-0.5 block">
                    Balls Left
                  </span>
                  
                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    {gameMode === 'PEG_ZEN' ? (
                      <span className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                        ∞
                      </span>
                    ) : (
                      Array.from({ length: 3 }).map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            opacity: i < ballsRemaining ? 1 : 0.15,
                            scale: i < ballsRemaining ? [1, 1.2, 1] : 0.8,
                          }}
                          className={`w-3.5 h-3.5 rounded-full ${
                            i < ballsRemaining 
                              ? 'bg-gradient-to-br from-green-300 via-green-500 to-green-700 shadow-[0_0_10px_#22c55e]' 
                              : 'bg-zinc-800'
                          }`}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* The canvas container */}
            <GameBoard
              gameMode={gameMode}
              onGameStateChange={handleGameStateChange}
              onNewHighScore={handleNewHighScore}
              isMuted={isMuted}
              onRestartRequest={handleRestart}
              gameResetKey={gameResetKey}
              ballColorStyle={ballColorStyle}
            />

            {/* Cabinet Footer - Zinc Professional Accent */}
            <div className="w-full max-w-[560px] bg-[#040407] border-b border-x border-zinc-800/80 p-3 rounded-b-xl flex justify-around text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
              <span>MULT x{multiplier}</span>
              <span className="text-zinc-700 font-black">|</span>
              <span>PEGS: {pegsCleared}</span>
              <span className="text-zinc-700 font-black">|</span>
              <span>STREAK: {highStreak}</span>
            </div>
          </div>

          {/* COLUMN B: Metadata Dashboard Controls & Multiplier indicators */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6">
            
            {/* Real-time Game stats card overlaying - Professional Polish Theme */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 border border-white/5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/60">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">MULT PROGRESS</span>
                <span className="text-xl font-black italic text-cyan-400 mt-1">{Math.floor(multiplierProgress)}% CHARGED</span>
              </div>
              <div className="flex flex-col p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/60">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">MAX CHAIN STREAK</span>
                <span className="text-xl font-black italic text-fuchsia-400 mt-1">+{highStreak} HITS</span>
              </div>
              <div className="flex flex-col p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/60">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">TARGETS CLEARED</span>
                <span className="text-xl font-black italic text-yellow-400 mt-1">{pegsCleared} PEGS</span>
              </div>
              <div className="flex flex-col p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/60 justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">TILT SENSOR</span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className={`w-3.5 h-1.5 rounded-sm transition-all ${isPlaying ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-zinc-800'}`} />
                  <div className={`w-3.5 h-1.5 rounded-sm transition-all ${highStreak >= 5 ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' : 'bg-zinc-800'}`} />
                  <div className={`w-3.5 h-1.5 rounded-sm transition-all ${highStreak >= 15 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-zinc-800'}`} />
                  <span className="text-[8px] font-mono text-zinc-500 ml-auto uppercase tracking-tighter">
                    {isPlaying ? 'LIVE' : 'IDLE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dashboard controls component */}
            <NeonDashboard
              score={score}
              ballsRemaining={ballsRemaining}
              multiplier={multiplier}
              multiplierProgress={multiplierProgress}
              pegsCleared={pegsCleared}
              highStreak={highStreak}
              activeMode={gameMode}
              onModeChange={(mode) => setGameMode(mode)}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onResetBoard={handleRestart}
              leaderboard={leaderboard}
              onClearLeaderboard={handleClearLeaderboard}
              activeBallStyle={ballColorStyle}
              onBallStyleChange={setBallColorStyle}
            />

            {/* Interactive feature tips and satisfying sweet spot information */}
            <div className="border border-green-500/20 bg-[#041108]/75 p-4 rounded-xl text-xs text-green-300 leading-relaxed font-sans shadow-lg flex items-start gap-3">
              <Smile className="w-6 h-6 text-green-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-bold uppercase tracking-wider mb-1 text-[13px] text-green-200">
                  Satisfying Loop: The Twin-Bumper Cradle Trap!
                </h4>
                <p className="text-gray-400 leading-normal">
                  Our custom physics system simulates a <strong className="text-green-300 font-bold">Premium Cradle Sweet-Spot</strong> situated right inside the center-right bumpers! If you drag back the slingshot plunger to approximately <strong className="text-green-300">75% capacity</strong> index, the launch vector perfectly channels the ball around the ceiling track, guiding it directly into the narrow slot of the Twin Bumpers. Watch it get pinned, bouncing rapidly, while charging your multiplier bar in a matter of seconds!
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Premium Notification Toasts Overlay Container */}
      <NotificationToast toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
