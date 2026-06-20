import React, { useEffect, useRef, useState } from 'react';
import { Ball, Bumper, Flipper, GameMode, LeaderboardEntry, Particle, Peg, ScorePopup, BallColorStyle } from '../types';
import { audio } from './AudioEngine';

interface GameBoardProps {
  gameMode: GameMode;
  onGameStateChange: (stats: {
    score: number;
    ballsRemaining: number;
    multiplier: number;
    multiplierProgress: number;
    pegsCleared: number;
    highStreak: number;
    isPlaying: boolean;
    timeLeft?: number;
  }) => void;
  onNewHighScore: (score: number) => void;
  isMuted: boolean;
  onRestartRequest: () => void;
  gameResetKey: number; // Incrementing this resets the whole board
  ballColorStyle?: BallColorStyle;
}

export default function GameBoard({
  gameMode,
  onGameStateChange,
  onNewHighScore,
  isMuted,
  onRestartRequest,
  gameResetKey,
  ballColorStyle = 'PLASMA_BLUE',
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Time Trial custom variables
  const timeRemainingRef = useRef<number>(60);
  const lastTimerTickRef = useRef<number>(0);
  
  // Game Play State Refs to avoid re-running useEffects
  const scoreRef = useRef(0);
  const ballsRef = useRef(3);
  const multiplierRef = useRef(1);
  const multiplierProgressRef = useRef(0); // 0 to 100
  const pegsClearedRef = useRef(0);
  const currentStreakRef = useRef(0);
  const maxStreakRef = useRef(0);
  
  const isPlayingRef = useRef(false);
  const gameOverRef = useRef(false);

  // Time tracker for multiplier decay
  const lastHitTimeRef = useRef<number>(Date.now());

  // Input States
  const leftFlipperActive = useRef(false);
  const rightFlipperActive = useRef(false);

  // Slingshot Pull/Drag State
  const isDraggingSlingshot = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragCurrent = useRef({ x: 0, y: 0 });
  const maxDragDist = 120;

  // Level elements
  const pegsRef = useRef<Peg[]>([]);
  const bumpersRef = useRef<Bumper[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const ballsListRef = useRef<Ball[]>([]);

  // Flippers
  const leftFlipperRef = useRef<Flipper>({
    x: 160,
    y: 770,
    length: 105,
    angle: 0.2,
    baseAngle: 0.2, // Rads, pointing slightly down-right
    targetAngle: -0.6, // Rapid swipe upwards
    isRight: false,
    angularSpeed: 0.32,
    currentAngularVelocity: 0,
    isActive: false,
  });

  const rightFlipperRef = useRef<Flipper>({
    x: 400,
    y: 770,
    length: 105,
    angle: Math.PI - 0.2,
    baseAngle: Math.PI - 0.2, // pointing slightly down-left
    targetAngle: Math.PI + 0.6, // swipe upwards
    isRight: true,
    angularSpeed: 0.32,
    currentAngularVelocity: 0,
    isActive: false,
  });

  // Dimensions
  const boardWidth = 560;
  const boardHeight = 840;
  const launchLaneWidth = 45;
  const wallRightX = boardWidth - launchLaneWidth; // 515

  // Initialize Board Elements based on Game Mode
  const initBoard = () => {
    // Reset Stats
    scoreRef.current = 0;
    ballsRef.current = gameMode === 'PEG_ZEN' ? 9999 : 3;
    multiplierRef.current = 1;
    multiplierProgressRef.current = 0;
    pegsClearedRef.current = 0;
    currentStreakRef.current = 0;
    maxStreakRef.current = 0;
    isPlayingRef.current = true;
    gameOverRef.current = false;
    lastHitTimeRef.current = Date.now();

    if (gameMode === 'TIME_TRIAL') {
      timeRemainingRef.current = 60;
      lastTimerTickRef.current = Date.now();
    } else {
      timeRemainingRef.current = 0;
    }

    particlesRef.current = [];
    scorePopupsRef.current = [];

    // Create Pegs (Forest of Pegs)
    const newPegs: Peg[] = [];
    
    // Pattern 1: Semi-circular arches and cascading ranks of pegs at the top (Y: 100 to 450)
    // Left bound: 25, Right bound: wallRightX - 25 = 490
    const startX = 40;
    const endX = wallRightX - 40;
    const startY = 120;
    const endY = 440;

    // Outer arch guides (non-dissolving high-value gold pegs!)
    for (let angle = Math.PI * 0.9; angle >= Math.PI * 0.1; angle -= 0.12) {
      const cx = 260 + 200 * Math.cos(angle);
      const cy = 240 + 130 * Math.sin(angle);
      // Keep inside bounds
      if (cx > 20 && cx < wallRightX - 20) {
        newPegs.push({
          id: `arch-${angle}`,
          x: cx,
          y: cy,
          radius: 7,
          type: 'GOLDEN',
          color: '#ffd700',
          points: 100,
          isDissolved: false,
          dissolvedAt: null,
        });
      }
    }

    // Grid layout for Pachinko pegs
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      const rowY = startY + r * 35;
      const columns = r % 2 === 0 ? 11 : 12;
      const spacingX = (endX - startX) / (columns - 1);
      
      for (let c = 0; c < columns; c++) {
        // Skip occasional central cells or specific areas to build cool funnels
        if (r === 3 && (c === 5 || c === 6)) continue;
        if (r === 4 && (c === 4 || c === 5 || c === 6 || c === 7)) continue;
        if (r === 5 && (c === 3 || c === 4 || c === 7 || c === 8)) continue;

        const x = startX + c * spacingX;
        
        // Multiplier pegs nested strategically
        let type: Peg['type'] = 'STANDARD';
        let color = '#3b82f6'; // Neon Blue
        let points = 20;

        if ((r === 2 && (c === 2 || c === columns - 3)) || (r === 6 && c === 5)) {
          type = 'MULTIPLIER';
          color = '#ec4899'; // Neon Hot Pink
          points = 50;
        } else if (Math.random() < 0.12) {
          type = 'GOLDEN';
          color = '#eab308'; // Glowing Gold
          points = 100;
        }

        newPegs.push({
          id: `peg-${r}-${c}`,
          x,
          y: rowY,
          radius: 5,
          type,
          color,
          points,
          isDissolved: false,
          dissolvedAt: null,
        });
      }
    }

    pegsRef.current = newPegs;

    // Create Bumpers
    const newBumpers: Bumper[] = [];
    
    // DELIBERATE BUMPER PLACEMENT (Twin Bumper Trap Sweet Spot!)
    // Place them middle-right so players can angle the ball directly into the trap!
    // Spacing: Just slightly larger than ball diameter (Radius 12 * 2 = 24 pitch)
    // Distance between centers: Bumper 1 R(24) + Bumper 2 R(24) + Gap(14) = 62.
    // When trapped, the ball will hit each at ~100px/s, bouncing back and forth satisfyingly!
    newBumpers.push({
      id: 'trap-left',
      x: 350,
      y: 530,
      radius: 25,
      color: '#f43f5e', // Hot pink rose
      points: 250,
      flashIntensity: 0,
      hitCount: 0,
      scale: 1,
    });
    newBumpers.push({
      id: 'trap-right',
      x: 416, 
      y: 530,
      radius: 25,
      color: '#ec4899', 
      points: 250,
      flashIntensity: 0,
      hitCount: 0,
      scale: 1,
    });

    // Triangle guide rail just above the trap to funnel the ball perfectly
    newPegs.push({
      id: 'trap-guide-1',
      x: 383,
      y: 470,
      radius: 6,
      type: 'GOLDEN',
      color: '#fbbf24',
      points: 50,
      isDissolved: false,
      dissolvedAt: null,
    });

    // Left high-value slingshot bumper
    newBumpers.push({
      id: 'left-kickback',
      x: 140,
      y: 510,
      radius: 30,
      color: '#06b6d4', // Neon Cyan
      points: 150,
      flashIntensity: 0,
      hitCount: 0,
      scale: 1,
    });

    // Middle floating bumpers for general scattering
    newBumpers.push({
      id: 'mid-top-bumper',
      x: 230,
      y: 280,
      radius: 22,
      color: '#a855f7', // Mystic Purple
      points: 200,
      flashIntensity: 0,
      hitCount: 0,
      scale: 1,
    });

    // Mode-Specific Bumper Spawns
    if (gameMode === 'BUMPER_MANIA') {
      newBumpers.push(
        {
          id: 'bonus-left-high',
          x: 100,
          y: 190,
          radius: 20,
          color: '#fb7185',
          points: 300,
          flashIntensity: 0,
          hitCount: 0,
          scale: 1,
        },
        {
          id: 'bonus-right-high',
          x: 420,
          y: 190,
          radius: 20,
          color: '#fb7185',
          points: 300,
          flashIntensity: 0,
          hitCount: 0,
          scale: 1,
        },
        {
          id: 'center-super',
          x: 260,
          y: 440,
          radius: 35,
          color: '#10b981', // Emerald Bumper
          points: 500,
          flashIntensity: 0,
          hitCount: 0,
          scale: 1,
        }
      );
    }

    bumpersRef.current = newBumpers;

    // Reset Balls
    spawnBallInSlingshot();

    // Trigger state callbacks
    triggerStatsUpdate();
  };

  const spawnBallInSlingshot = () => {
    const ballColorMap: Record<BallColorStyle, string> = {
      PLASMA_BLUE: '#06b6d4',
      INFERNO_RED: '#f43f5e',
      ACID_GREEN: '#22c55e',
    };
    const activeColor = ballColorMap[ballColorStyle] || '#22c55e';
    
    ballsListRef.current = [
      {
        x: boardWidth - launchLaneWidth / 2, // 537.5
        y: 780,
        vx: 0,
        vy: 0,
        radius: 11,
        color: activeColor,
        mass: 1.0,
        trail: [],
        isLocked: true,
      },
    ];
    // Reset streak on new spawn
    currentStreakRef.current = 0;
  };

  const triggerStatsUpdate = () => {
    onGameStateChange({
      score: scoreRef.current,
      ballsRemaining: ballsRef.current,
      multiplier: multiplierRef.current,
      multiplierProgress: multiplierProgressRef.current,
      pegsCleared: pegsClearedRef.current,
      highStreak: maxStreakRef.current,
      isPlaying: isPlayingRef.current && !gameOverRef.current,
      timeLeft: timeRemainingRef.current,
    });
  };

  // Setup game reset key trigger
  useEffect(() => {
    initBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameResetKey, gameMode]);

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        leftFlipperRef.current.isActive = true;
        leftFlipperActive.current = true;
        if (!isMuted) audio.playFlipperSnap();
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rightFlipperRef.current.isActive = true;
        rightFlipperActive.current = true;
        if (!isMuted) audio.playFlipperSnap();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        leftFlipperRef.current.isActive = false;
        leftFlipperActive.current = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rightFlipperRef.current.isActive = false;
        rightFlipperActive.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMuted]);

  // Slingshot Pull Drag Handling
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOverRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Physics Coordinate conversions
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check if clicking near the active locked ball (in Slingshot lane)
    const lockedBall = ballsListRef.current.find((b) => b.isLocked);
    if (lockedBall) {
      const dist = Math.hypot(clickX - lockedBall.x, clickY - lockedBall.y);
      if (dist < 40) {
        isDraggingSlingshot.current = true;
        dragStart.current = { x: lockedBall.x, y: lockedBall.y };
        dragCurrent.current = { x: clickX, y: clickY };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingSlingshot.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    dragCurrent.current = { x: mouseX, y: mouseY };
  };

  const handleMouseUp = () => {
    if (!isDraggingSlingshot.current) return;
    isDraggingSlingshot.current = false;

    const lockedBall = ballsListRef.current.find((b) => b.isLocked);
    if (lockedBall) {
      const dx = dragCurrent.current.x - dragStart.current.x;
      const dy = dragCurrent.current.y - dragStart.current.y;
      const dist = Math.hypot(dx, dy);

      // Only launch if dragged a minimum distance
      if (dist > 15) {
        // Limit drag
        const clampedDist = Math.min(dist, maxDragDist);
        const powerRatio = clampedDist / maxDragDist;

        // Vector is opposite direction of drag!
        const angle = Math.atan2(-dy, -dx);
        
        // Launch dynamic force
        const launchSpeed = 16 + powerRatio * 17; // Shoot upwards fast!

        lockedBall.vx = Math.cos(angle) * launchSpeed;
        lockedBall.vy = Math.sin(angle) * launchSpeed;
        lockedBall.isLocked = false;
        
        // Push ball coordinates a bit along vector to escape spring bed
        lockedBall.x += lockedBall.vx * 0.2;
        lockedBall.y += lockedBall.vy * 0.2;

        if (!isMuted) audio.playSlingLaunch(powerRatio);
      } else {
        // Reset position
        lockedBall.x = dragStart.current.x;
        lockedBall.y = dragStart.current.y;
      }
    }
  };

  // Mobile Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameOverRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;
    const touch = e.touches[0];
    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    // Flipper touch toggle bounds: Left half and right half bottom zone
    if (clickY > 550) {
      if (clickX < boardWidth / 2) {
        leftFlipperRef.current.isActive = true;
        leftFlipperActive.current = true;
        if (!isMuted) audio.playFlipperSnap();
      } else if (clickX >= boardWidth / 2 && clickX < wallRightX) {
        rightFlipperRef.current.isActive = true;
        rightFlipperActive.current = true;
        if (!isMuted) audio.playFlipperSnap();
      }
    }

    // Check Slingshot Drag trigger
    const lockedBall = ballsListRef.current.find((b) => b.isLocked);
    if (lockedBall) {
      const dist = Math.hypot(clickX - lockedBall.x, clickY - lockedBall.y);
      if (dist < 50) {
        isDraggingSlingshot.current = true;
        dragStart.current = { x: lockedBall.x, y: lockedBall.y };
        dragCurrent.current = { x: clickX, y: clickY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;
    const touch = e.touches[0];
    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    if (isDraggingSlingshot.current) {
      dragCurrent.current = { x: clickX, y: clickY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingSlingshot.current) {
      handleMouseUp();
    }
    // Release flippers
    leftFlipperRef.current.isActive = false;
    leftFlipperActive.current = false;
    rightFlipperRef.current.isActive = false;
    rightFlipperActive.current = false;
  };

  // Spawn visual score popup
  const spawnScorePopup = (x: number, y: number, text: string, color: string) => {
    scorePopupsRef.current.push({
      id: `popup-${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      scale: 1.0,
      life: 60, // frames
    });
  };

  // Sparkle Splash Particles
  const spawnParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2,
        color,
        alpha: 1.0,
        life: 30 + Math.random() * 30,
        decay: 0.02 + Math.random() * 0.03,
      });
    }
  };

  // Physics, Updates, Rendering Loop
  useEffect(() => {
    let animId = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper: Line/Cap collisions for boundaries
    const gravity = 0.28; // Physics Gravity downward

    const updatePhysics = () => {
      // 1. Decay multiplier over time if inactive
      const now = Date.now();

      // Time Trial Countdown Tracker
      if (isPlayingRef.current && !gameOverRef.current && gameMode === 'TIME_TRIAL') {
        if (now - lastTimerTickRef.current >= 1000) {
          timeRemainingRef.current = Math.max(0, timeRemainingRef.current - 1);
          lastTimerTickRef.current = now;
          triggerStatsUpdate();

          // Time out condition
          if (timeRemainingRef.current <= 0) {
            gameOverRef.current = true;
            isPlayingRef.current = false;
            if (!isMuted) audio.playBallLost();
            onNewHighScore(scoreRef.current);
            triggerStatsUpdate();
          }
        }
      }

      const elapsedSinceHit = now - lastHitTimeRef.current;
      if (elapsedSinceHit > 7000 && multiplierRef.current > 1) {
        multiplierProgressRef.current = Math.max(0, multiplierProgressRef.current - 0.7);
        if (multiplierProgressRef.current <= 0) {
          multiplierRef.current = Math.max(1, multiplierRef.current - 1);
          if (multiplierRef.current > 1) {
            multiplierProgressRef.current = 100;
          }
          triggerStatsUpdate();
        }
      }

      // 2. Update Flippers (Angular kinetics)
      const updateFlipperValue = (flipper: Flipper) => {
        let targetAngle = flipper.baseAngle;
        if (flipper.isActive) {
          targetAngle = flipper.targetAngle;
        }

        // Apply visual angular spring/interpolate
        const diff = targetAngle - flipper.angle;
        flipper.currentAngularVelocity = diff * flipper.angularSpeed;
        flipper.angle += flipper.currentAngularVelocity;
      };

      updateFlipperValue(leftFlipperRef.current);
      updateFlipperValue(rightFlipperRef.current);

      // 3. Update active peg respawns
      pegsRef.current.forEach((peg) => {
        if (peg.isDissolved && peg.dissolvedAt) {
          const dissolveElapsed = now - peg.dissolvedAt;
          const respawnLimit = gameMode === 'PEG_ZEN' ? 9999999 : 8000; // Zenith mode does not respawn automatically
          if (dissolveElapsed > respawnLimit) {
            peg.isDissolved = false;
            peg.dissolvedAt = null;
            spawnParticles(peg.x, peg.y, '#ffffff', 5);
          }
        }
      });

      // 4. Update Balls
      ballsListRef.current.forEach((ball, bIdx) => {
        if (ball.isLocked) {
          // Stay tied to launcher spring
          if (isDraggingSlingshot.current) {
            const dx = dragCurrent.current.x - dragStart.current.x;
            const dy = dragCurrent.current.y - dragStart.current.y;
            const dist = Math.hypot(dx, dy);
            const clampedDist = Math.min(dist, maxDragDist);
            const angle = Math.atan2(dy, dx);

            ball.x = dragStart.current.x + Math.cos(angle) * clampedDist;
            ball.y = dragStart.current.y + Math.sin(angle) * clampedDist;
          } else {
            ball.x = boardWidth - launchLaneWidth / 2;
            ball.y = 780;
          }
          return;
        }

        // Apply physics
        ball.vx *= 0.995; // minor air resistance
        ball.vy += gravity;

        // Cap speed
        const speed = Math.hypot(ball.vx, ball.vy);
        const maxSpeed = 24;
        if (speed > maxSpeed) {
          ball.vx = (ball.vx / speed) * maxSpeed;
          ball.vy = (ball.vy / speed) * maxSpeed;
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Append to tail trail
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 12) ball.trail.shift();

        // Canvas Boundary Collisions (Walls)
        // Ceiling arch arc collision
        const archR = 265;
        const archCx = 260;
        const archCy = 240;
        const distToArchCenter = Math.hypot(ball.x - archCx, ball.y - archCy);
        
        // Ceiling outer bounds check
        if (ball.y < archCy && distToArchCenter > archR - ball.radius) {
          // Reflect off round ceiling dome
          const normalX = (archCx - ball.x) / distToArchCenter;
          const normalY = (archCy - ball.y) / distToArchCenter;
          
          ball.x = archCx - normalX * (archR - ball.radius);
          ball.y = archCy - normalY * (archR - ball.radius);

          const dot = ball.vx * normalX + ball.vy * normalY;
          if (dot < 0) {
            ball.vx -= 1.6 * dot * normalX;
            ball.vy -= 1.6 * dot * normalY;
          }
        }

        // Left outer wall
        if (ball.x < ball.radius) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * 0.65;
        }

        // Right Plunger Lane separator wall: From top point Y:250 down to 840 (at x = wallRightX)
        if (ball.x > wallRightX - ball.radius && ball.y > 220) {
          // If ball is outside plunger lane (left of wallX)
          if (ball.x - ball.vx <= wallRightX) {
            ball.x = wallRightX - ball.radius;
            ball.vx = -ball.vx * 0.65;
          }
          // If ball is inside plunger lane
          else if (ball.x + ball.radius > boardWidth) {
            ball.x = boardWidth - ball.radius;
            ball.vx = -ball.vx * 0.65;
          }
        } else if (ball.x > boardWidth - ball.radius) {
          ball.x = boardWidth - ball.radius;
          ball.vx = -ball.vx * 0.65;
        }

        // 5. Collisions with Pegs
        pegsRef.current.forEach((peg) => {
          if (peg.isDissolved) return;

          const dist = Math.hypot(ball.x - peg.x, ball.y - peg.y);
          if (dist < ball.radius + peg.radius) {
            // Push out of collision
            const overlap = ball.radius + peg.radius - dist;
            const nx = (ball.x - peg.x) / dist;
            const ny = (ball.y - peg.y) / dist;

            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Reflect velocity with bounce damping
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              const elasticity = 0.55;
              ball.vx -= (1 + elasticity) * dot * nx;
              ball.vy -= (1 + elasticity) * dot * ny;
            }

            // HIT ACTION!
            // Peg dissolves!
            peg.isDissolved = true;
            peg.dissolvedAt = now;
            pegsClearedRef.current += 1;

            // Streak & multipliers
            currentStreakRef.current += 1;
            if (currentStreakRef.current > maxStreakRef.current) {
              maxStreakRef.current = currentStreakRef.current;
            }

            // Incremental multiplier bar charge
            let chargePoints = 3;
            if (peg.type === 'GOLDEN') chargePoints = 8;
            if (peg.type === 'MULTIPLIER') chargePoints = 20;

            multiplierProgressRef.current += chargePoints;
            if (multiplierProgressRef.current >= 100) {
              multiplierProgressRef.current = 0;
              multiplierRef.current += 1;
              if (!isMuted) audio.playMultiplierUp(multiplierRef.current);
            }

            // Accumulate Score
            const addScore = peg.points * multiplierRef.current;
            scoreRef.current += addScore;

            // FX Playback
            lastHitTimeRef.current = now;
            if (!isMuted) audio.playPegChime(currentStreakRef.current);

            spawnParticles(peg.x, peg.y, peg.color);
            spawnScorePopup(peg.x, peg.y - 10, `+${addScore}`, peg.color);
            triggerStatsUpdate();
          }
        });

        // 6. Collisions with Bumpers (Highly satisfying elastic push back!)
        bumpersRef.current.forEach((bumper) => {
          const dist = Math.hypot(ball.x - bumper.x, ball.y - bumper.y);
          const bumperTriggerRadius = bumper.radius * bumper.scale;

          if (dist < ball.radius + bumperTriggerRadius) {
            // Resolve overlap
            const overlap = ball.radius + bumperTriggerRadius - dist;
            const nx = (ball.x - bumper.x) / dist;
            const ny = (ball.y - bumper.y) / dist;

            ball.x += nx * overlap;
            ball.y += ny * overlap;

            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              // Heavy bouncy trigger (Restitution > 1)
              const bounceCoefficient = 1.75;
              ball.vx -= (1 + bounceCoefficient) * dot * nx;
              ball.vy -= (1 + bounceCoefficient) * dot * ny;
              
              // Give extra horizontal scatters if hits side
              if (Math.abs(nx) > 0.7) {
                ball.vx += nx * 2;
              }
            }

            // Sound, scale, particles
            bumper.flashIntensity = 1.0;
            bumper.scale = 1.25; // momentary expand
            bumper.hitCount += 1;

            if (!isMuted) audio.playBumperHit();

            // Score with streak & multiplier
            const bonusFactor = currentStreakRef.current > 10 ? 1.5 : 1.0;
            const addScore = Math.floor(bumper.points * multiplierRef.current * bonusFactor);
            scoreRef.current += addScore;

            lastHitTimeRef.current = now;
            spawnParticles(bumper.x, bumper.y, bumper.color, 18);
            
            let popupText = `+${addScore}`;
            if (bonusFactor > 1) popupText += ` TRAP x${bonusFactor}`;
            spawnScorePopup(bumper.x, bumper.y - bumper.radius, popupText, bumper.color);
            triggerStatsUpdate();
          }
        });

        // Decay Bumper Flash Intensity & scale back to normal
        bumpersRef.current.forEach((bumper) => {
          if (bumper.flashIntensity > 0) {
            bumper.flashIntensity -= 0.05;
          }
          if (bumper.scale > 1) {
            bumper.scale -= 0.02;
          }
        });

        // 7. Collisions with Flippers (The highly technical dynamic line bounce)
        const checkFlipperCollision = (flipper: Flipper) => {
          // Flipper ends: Pivot A(x, y), Tip B(x_tip, y_tip)
          const tipX = flipper.x + flipper.length * Math.cos(flipper.angle);
          const tipY = flipper.y + flipper.length * Math.sin(flipper.angle);

          // Locate closest point on f_segment to ball center
          const ax = flipper.x;
          const ay = flipper.y;
          const bx = tipX;
          const by = tipY;

          const abx = bx - ax;
          const aby = by - ay;
          const apx = ball.x - ax;
          const apy = ball.y - ay;

          const abSq = abx * abx + aby * aby;
          let t = (apx * abx + apy * aby) / abSq;
          t = Math.max(0, Math.min(1, t)); // clamp 0 to 1

          const closestX = ax + t * abx;
          const closestY = ay + t * aby;

          const dist = Math.hypot(ball.x - closestX, ball.y - closestY);
          const thickness = 10; // flipper body thickness

          if (dist < ball.radius + thickness / 2) {
            // Overlap resolution
            const overlap = (ball.radius + thickness / 2) - dist;
            const nx = (ball.x - closestX) / dist;
            const ny = (ball.y - closestY) / dist;

            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Calculate exact rotational velocity vector at collision coordinate
            const pxSpeed = flipper.currentAngularVelocity * (t * flipper.length); // speed proportional to distance along arm
            const flipperVelX = -Math.sin(flipper.angle) * pxSpeed;
            const flipperVelY = Math.cos(flipper.angle) * pxSpeed;

            // Relative Velocity
            const relVx = ball.vx - flipperVelX;
            const relVy = ball.vy - flipperVelY;

            const dot = relVx * nx + relVy * ny;
            if (dot < 0) {
              // Bounce
              const elasticity = 0.55;
              const impulseX = -(1 + elasticity) * dot * nx;
              const impulseY = -(1 + elasticity) * dot * ny;

              ball.vx += impulseX;
              ball.vy += impulseY;

              // Smacking upforce if flipper is moving upwards
              if (flipper.currentAngularVelocity * (flipper.isRight ? -1 : 1) > 0) {
                // Slam upwards
                ball.vy -= Math.abs(flipper.currentAngularVelocity) * 18;
                ball.vx += flipperVelX * 0.4;
              }
              
              // Sparkles!
              spawnParticles(closestX, closestY, '#ffffff', 4);
            }
          }
        };

        checkFlipperCollision(leftFlipperRef.current);
        checkFlipperCollision(rightFlipperRef.current);

        // 8. Ball Drainage (Fell to bottom of screen)
        if (ball.y > boardHeight + ball.radius * 2) {
          // Remove ball or trigger ball lost
          ballsListRef.current.splice(bIdx, 1);

          if (ballsListRef.current.length === 0) {
            if (!isMuted) audio.playBallLost();

            ballsRef.current -= 1;
            multiplierRef.current = Math.max(1, multiplierRef.current - 1);
            multiplierProgressRef.current = 0;
            currentStreakRef.current = 0;

            if (ballsRef.current <= 0) {
              gameOverRef.current = true;
              isPlayingRef.current = false;
              onNewHighScore(scoreRef.current);
            } else {
              spawnBallInSlingshot();
            }

            triggerStatsUpdate();
          }
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, boardWidth, boardHeight);

      // --- Retro Arcade Grid Background ---
      ctx.strokeStyle = 'rgba(24, 24, 37, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < boardWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, boardHeight);
        ctx.stroke();
      }
      for (let y = 0; y < boardHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(boardWidth, y);
        ctx.stroke();
      }

      // Draw Arch Dome Guides & Rails
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(260, 240, 265, Math.PI, 0);
      ctx.stroke();

      // Plunger Lane Divisor line
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wallRightX, 220);
      ctx.lineTo(wallRightX, boardHeight);
      ctx.stroke();

      // Triangular kickbacks inside outlanes (slingshot wall nodes)
      // Left Outlane Triangular slinger
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)';
      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(35, 620);
      ctx.lineTo(85, 660);
      ctx.lineTo(35, 700);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Outlane Triangular slinger
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)';
      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wallRightX - 35, 620);
      ctx.lineTo(wallRightX - 85, 660);
      ctx.lineTo(wallRightX - 35, 700);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Slingshot Launcher Spring and Cup structure
      const launcherY = 780;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.beginPath();
      ctx.arc(boardWidth - launchLaneWidth / 2, launcherY + 15, 18, 0, Math.PI, true);
      ctx.fill();

      // Mechanical release springs
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const springTop = isDraggingSlingshot.current 
        ? Math.max(launcherY, dragCurrent.current.y) + 10 
        : launcherY + 15;
      
      ctx.moveTo(boardWidth - launchLaneWidth / 2, springTop);
      ctx.lineTo(boardWidth - launchLaneWidth / 2, boardHeight - 10);
      ctx.stroke();

      // Draw Slingshot drag guide line if active
      if (isDraggingSlingshot.current) {
        const lockedBall = ballsListRef.current.find((b) => b.isLocked);
        if (lockedBall) {
          const dx = dragCurrent.current.x - dragStart.current.x;
          const dy = dragCurrent.current.y - dragStart.current.y;
          const dist = Math.hypot(dx, dy);
          const clamped = Math.min(dist, maxDragDist);
          const ratio = clamped / maxDragDist;

          // Power projection vector
          const pAngle = Math.atan2(-dy, -dx);
          const endProjX = dragStart.current.x + Math.cos(pAngle) * (clamped * 2.5);
          const endProjY = dragStart.current.y + Math.sin(pAngle) * (clamped * 2.5);

          // Dotted power line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // Laser red power indicator
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(dragStart.current.x, dragStart.current.y);
          ctx.lineTo(endProjX, endProjY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Circle overlay indicator
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.beginPath();
          ctx.arc(dragStart.current.x, dragStart.current.y, clamped / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Draw Pegs ---
      pegsRef.current.forEach((peg) => {
        if (peg.isDissolved) return; // Dissolved invisible

        // Outer glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = peg.color;

        ctx.fillStyle = peg.color;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- Draw Bumpers (Flashes & Scale Animations) ---
      bumpersRef.current.forEach((bumper) => {
        const size = bumper.radius * bumper.scale;

        // Giant neon shadow blast
        ctx.shadowBlur = 12 + bumper.flashIntensity * 25;
        ctx.shadowColor = bumper.color;

        // Outer rim
        ctx.fillStyle = bumper.flashIntensity > 0.1 ? '#ffffff' : bumper.color;
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Inner rim
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(15, 15, 25, 0.9)';
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, size * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // High value neon circle hub
        ctx.strokeStyle = bumper.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // Draw points text inside bumper
        ctx.fillStyle = bumper.color;
        ctx.font = `bold ${Math.floor(11 * bumper.scale)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${bumper.points}`, bumper.x, bumper.y);
      });

      // --- Draw Flippers ---
      const drawFlipper = (flipper: Flipper) => {
        const tipX = flipper.x + flipper.length * Math.cos(flipper.angle);
        const tipY = flipper.y + flipper.length * Math.sin(flipper.angle);

        ctx.shadowBlur = 15;
        ctx.shadowColor = flipper.isActive ? '#10b981' : '#ec4899'; // Emerald active green, Pink rest

        // Draw pill shape segment manually
        ctx.strokeStyle = flipper.isActive ? '#10b981' : '#ec4899';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(flipper.x, flipper.y);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Center pivot circle cap
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(flipper.x, flipper.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      drawFlipper(leftFlipperRef.current);
      drawFlipper(rightFlipperRef.current);

      // --- Draw Particles ---
      particlesRef.current.forEach((p, idx) => {
        ctx.shadowBlur = p.radius * p.alpha * 4;
        ctx.shadowColor = p.color;

        ctx.fillStyle = `rgba(${hexToRgb(p.color)}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Update physics inside particle draw to avoid double list iterations
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.life -= 1;

        if (p.alpha <= 0 || p.life <= 0) {
          particlesRef.current.splice(idx, 1);
        }
      });
      ctx.shadowBlur = 0; // reset shadow

      // --- Draw Balls ---
      const trailRGBMap: Record<BallColorStyle, string> = {
        PLASMA_BLUE: '6, 182, 212',
        INFERNO_RED: '244, 63, 94',
        ACID_GREEN: '34, 197, 94',
      };
      const ballColorMap: Record<BallColorStyle, string> = {
        PLASMA_BLUE: '#06b6d4',
        INFERNO_RED: '#f43f5e',
        ACID_GREEN: '#22c55e',
      };
      
      const activeColor = ballColorMap[ballColorStyle] || '#22c55e';
      const activeRGB = trailRGBMap[ballColorStyle] || '34, 197, 94';

      ballsListRef.current.forEach((ball) => {
        // Draw glow path trailing
        if (ball.trail.length > 1) {
          ctx.lineWidth = ball.radius * 0.9;
          ctx.lineCap = 'round';
          for (let i = 1; i < ball.trail.length; i++) {
            const ratio = i / ball.trail.length;
            ctx.strokeStyle = `rgba(${activeRGB}, ${ratio * 0.35})`;
            ctx.beginPath();
            ctx.moveTo(ball.trail[i - 1].x, ball.trail[i - 1].y);
            ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
            ctx.stroke();
          }
        }

        // Main Ball
        ctx.shadowBlur = 15;
        ctx.shadowColor = activeColor;

        ctx.fillStyle = '#ffffff'; // White center hot-glow
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // turn off
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // --- Draw Floating Score Popups ---
      scorePopupsRef.current.forEach((pop, idx) => {
        ctx.fillStyle = `rgba(${hexToRgb(pop.color)}, ${pop.alpha})`;
        ctx.font = `bold ${Math.floor(13 * pop.scale)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);

        // Update popup properties
        pop.y -= 0.55;
        pop.alpha -= 0.016;
        pop.scale += 0.005;
        pop.life -= 1;

        if (pop.alpha <= 0 || pop.life <= 0) {
          scorePopupsRef.current.splice(idx, 1);
        }
      });

      // --- Draw "BOARD CLEARED!" message if no standard pegs remain
      const activePegsCount = pegsRef.current.filter((p) => p.type !== 'GOLDEN' && !p.isDissolved).length;
      if (activePegsCount === 0 && isPlayingRef.current) {
        // Re-generate board and give points
        scoreRef.current += 5000 * multiplierRef.current;
        multiplierRef.current += 1;
        multiplierProgressRef.current = 0;
        
        spawnScorePopup(boardWidth / 2, boardHeight / 2 - 40, "BOARD CLEARED! +5000", "#eab308");
        spawnParticles(boardWidth / 2, boardHeight / 2, "#eab308", 40);

        if (!isMuted) audio.playMultiplierUp(multiplierRef.current);

        // Regenerate pegs
        pegsRef.current.forEach((p) => {
          p.isDissolved = false;
          p.dissolvedAt = null;
        });

        triggerStatsUpdate();
      }

      // Display time remaining if Game Mode is TIME_TRIAL
      if (gameMode === 'TIME_TRIAL' && !gameOverRef.current) {
        ctx.save();
        ctx.font = '900 italic 20px "Space Grotesk", sans-serif';
        ctx.fillStyle = timeRemainingRef.current <= 15 ? '#ef4444' : '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.shadowColor = timeRemainingRef.current <= 15 ? '#ef4444' : '#06b6d4';
        ctx.textAlign = 'center';
        ctx.fillText(`TIME LEFT: ${timeRemainingRef.current}s`, boardWidth / 2, 40);
        ctx.restore();
      }

      // --- Draw Custom HUD inside the Canvas Margins ---
      if (gameOverRef.current) {
        // Overlay Dimming card
        ctx.fillStyle = 'rgba(15, 15, 30, 0.82)';
        ctx.fillRect(0, 0, boardWidth, boardHeight);

        // Neon border highlight around Game Over message box
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.strokeRect(80, 260, boardWidth - 160, 280);

        ctx.fillStyle = 'rgba(236, 72, 153, 0.1)';
        ctx.fillRect(80, 260, boardWidth - 160, 280);

        ctx.font = 'bold 36px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#ec4899';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ec4899';
        ctx.fillText('GAME OVER', boardWidth / 2, 310);
        ctx.shadowBlur = 0;

        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('FINAL SCORE', boardWidth / 2, 360);

        ctx.font = 'bold 44px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#3b82f6';
        ctx.fillText(scoreRef.current.toLocaleString(), boardWidth / 2, 415);

        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#eab308';
        ctx.fillText(`Max Hit Streak: ${maxStreakRef.current}`, boardWidth / 2, 465);

        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Tap RESTART to plunge again!', boardWidth / 2, 505);
      }
    };

    const runLoop = () => {
      updatePhysics();
      draw();
      animId = requestAnimationFrame(runLoop);
    };

    animId = requestAnimationFrame(runLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, isMuted]);

  // Utility to parse hex color to rgb string for alpha manipulations
  const hexToRgb = (hex: string): string => {
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  return (
    <div id="game-board-container" className="relative flex flex-col items-center">
      {/* Interactive Controls & Sling Instruction indicators */}
      <canvas
        id="pinball-canvas"
        ref={canvasRef}
        width={boardWidth}
        height={boardHeight}
        className="block bg-[#020205] border-[4px] border-[#3b82f6]/40 rounded-xl max-h-[76vh] w-full max-w-[560px] cursor-grab active:cursor-grabbing selection:bg-transparent shadow-[0_0_35px_rgba(59,130,246,0.15)]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Floating interactive helper instructions */}
      {!isDraggingSlingshot.current && ballsListRef.current.some((b) => b.isLocked) && (
        <div id="drag-instructions" className="absolute bottom-[80px] text-center pointer-events-none select-none bg-black/80 px-4 py-2 border border-green-500/30 rounded-lg animate-pulse text-xs text-green-400 font-mono">
          ⬇️ DRAG DOWN & RELEASE BALL TO LAUNCH! ⬇️
        </div>
      )}

      {/* Quick Mobile Touch Rails overlay instructions */}
      <div className="flex justify-between w-full max-w-[560px] mt-2 px-2 text-[10px] text-gray-500 font-mono">
        <span>⌨️ [A] or Left arrow flipper</span>
        <span>Tap lower screen edges for mobile flippers 📱</span>
        <span>[D] or Right arrow ⌨️</span>
      </div>
    </div>
  );
}
