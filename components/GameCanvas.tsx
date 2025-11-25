import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Entity, GameStatus } from '../types';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  gameStatus: GameStatus;
}

const GRAVITY = 0.6;
const FRICTION = 0.8;
const PLAYER_SPEED = 6;
const JUMP_FORCE = -14;
const BULLET_SPEED = 12;
const ENEMY_SPAWN_RATE = 100; // Frames

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Game State Refs (Mutable for performance loop)
  const playerRef = useRef<Entity>({
    id: 'player',
    type: 'player',
    pos: { x: 100, y: 300 },
    vel: { x: 0, y: 0 },
    size: { width: 32, height: 48 },
    color: '#3b82f6',
    hp: 100,
    maxHp: 100,
    markedForDeletion: false,
    direction: 1,
    isGrounded: false
  });

  const entitiesRef = useRef<Entity[]>([]);
  const platformsRef = useRef<Entity[]>([]);
  const scoreRef = useRef<number>(0);
  const inputRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    fire: false
  });
  
  // React State for HUD updates (less frequent)
  const [hudState, setHudState] = useState({ hp: 100, score: 0 });

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'ArrowLeft': case 'KeyA': inputRef.current.left = true; break;
        case 'ArrowRight': case 'KeyD': inputRef.current.right = true; break;
        case 'ArrowUp': case 'KeyW': inputRef.current.up = true; break;
        case 'ArrowDown': case 'KeyS': inputRef.current.down = true; break;
        case 'Space': case 'KeyK': 
          if (!inputRef.current.jump && playerRef.current.isGrounded) {
             playerRef.current.vel.y = JUMP_FORCE;
             playerRef.current.isGrounded = false;
          }
          inputRef.current.jump = true; 
          break;
        case 'KeyJ': case 'ShiftLeft': inputRef.current.fire = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'ArrowLeft': case 'KeyA': inputRef.current.left = false; break;
        case 'ArrowRight': case 'KeyD': inputRef.current.right = false; break;
        case 'ArrowUp': case 'KeyW': inputRef.current.up = false; break;
        case 'ArrowDown': case 'KeyS': inputRef.current.down = false; break;
        case 'Space': case 'KeyK': inputRef.current.jump = false; break;
        case 'KeyJ': case 'ShiftLeft': inputRef.current.fire = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize Level
  const initLevel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset Player
    playerRef.current = {
      ...playerRef.current,
      pos: { x: 100, y: canvas.height - 150 },
      vel: { x: 0, y: 0 },
      hp: 100,
      markedForDeletion: false
    };

    entitiesRef.current = [];
    scoreRef.current = 0;
    frameCountRef.current = 0;

    // Create Floor
    platformsRef.current = [
      { id: 'floor', type: 'platform', pos: { x: 0, y: canvas.height - 40 }, size: { width: canvas.width, height: 40 }, vel: {x:0, y:0}, color: '#334155', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
      { id: 'p1', type: 'platform', pos: { x: 300, y: canvas.height - 180 }, size: { width: 200, height: 20 }, vel: {x:0, y:0}, color: '#475569', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
      { id: 'p2', type: 'platform', pos: { x: 600, y: canvas.height - 300 }, size: { width: 200, height: 20 }, vel: {x:0, y:0}, color: '#475569', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
      { id: 'p3', type: 'platform', pos: { x: 100, y: canvas.height - 350 }, size: { width: 150, height: 20 }, vel: {x:0, y:0}, color: '#475569', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
    ];
  }, []);


  // Main Game Loop
  const update = useCallback(() => {
    if (gameStatus !== GameStatus.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameCountRef.current++;

    // --- PHYSICS & LOGIC ---

    const player = playerRef.current;

    // Player Movement
    if (inputRef.current.left) {
      player.vel.x = -PLAYER_SPEED;
      player.direction = -1;
    } else if (inputRef.current.right) {
      player.vel.x = PLAYER_SPEED;
      player.direction = 1;
    } else {
      player.vel.x *= FRICTION;
    }

    player.vel.y += GRAVITY;
    player.pos.x += player.vel.x;
    player.pos.y += player.vel.y;

    // Player Shooting
    if (inputRef.current.fire && frameCountRef.current % 10 === 0) {
      entitiesRef.current.push({
        id: `bullet-${Date.now()}-${Math.random()}`,
        type: 'bullet',
        pos: { x: player.pos.x + (player.direction === 1 ? player.size.width : 0), y: player.pos.y + 16 },
        vel: { x: player.direction * BULLET_SPEED, y: 0 },
        size: { width: 8, height: 4 },
        color: '#facc15', // Yellow
        hp: 1,
        maxHp: 1,
        markedForDeletion: false,
        direction: player.direction
      });
    }

    // World Bounds
    if (player.pos.x < 0) player.pos.x = 0;
    if (player.pos.x + player.size.width > canvas.width) player.pos.x = canvas.width - player.size.width;
    if (player.pos.y > canvas.height) {
        player.hp = 0; // Fall to death
    }

    // Platform Collisions (Player)
    player.isGrounded = false;
    platformsRef.current.forEach(platform => {
      // Simple AABB for feet
      if (
        player.pos.x < platform.pos.x + platform.size.width &&
        player.pos.x + player.size.width > platform.pos.x &&
        player.pos.y + player.size.height > platform.pos.y &&
        player.pos.y + player.size.height < platform.pos.y + platform.size.height + 20 && // Tolerance
        player.vel.y >= 0
      ) {
        player.isGrounded = true;
        player.vel.y = 0;
        player.pos.y = platform.pos.y - player.size.height;
      }
    });

    // Enemy Spawning
    if (frameCountRef.current % ENEMY_SPAWN_RATE === 0) {
       const isLeft = Math.random() > 0.5;
       entitiesRef.current.push({
         id: `enemy-${Date.now()}`,
         type: 'enemy',
         pos: { x: isLeft ? 0 : canvas.width - 32, y: canvas.height - 200 }, // Start high
         vel: { x: isLeft ? 2 : -2, y: 0 },
         size: { width: 32, height: 32 },
         color: '#ef4444', // Red
         hp: 2,
         maxHp: 2,
         markedForDeletion: false,
         direction: isLeft ? 1 : -1,
         isGrounded: false
       });
    }

    // Entity Updates
    entitiesRef.current.forEach(entity => {
      // Physics
      if (entity.type === 'enemy') {
         entity.vel.y += GRAVITY;
         entity.pos.x += entity.vel.x;
         entity.pos.y += entity.vel.y;

         // Enemy Platform Collision
         platformsRef.current.forEach(platform => {
            if (
                entity.pos.x < platform.pos.x + platform.size.width &&
                entity.pos.x + entity.size.width > platform.pos.x &&
                entity.pos.y + entity.size.height > platform.pos.y &&
                entity.pos.y + entity.size.height < platform.pos.y + platform.size.height + 20 &&
                entity.vel.y >= 0
            ) {
                entity.vel.y = 0;
                entity.pos.y = platform.pos.y - entity.size.height;
            }
         });
         // Screen wrap for enemies
         if (entity.pos.y > canvas.height + 100) entity.markedForDeletion = true;
      } 
      else if (entity.type === 'bullet') {
        entity.pos.x += entity.vel.x;
        // Cull bullets
        if (entity.pos.x < 0 || entity.pos.x > canvas.width) entity.markedForDeletion = true;
      } 
      else if (entity.type === 'particle') {
          entity.pos.x += entity.vel.x;
          entity.pos.y += entity.vel.y;
          if (entity.ttl) {
            entity.ttl--;
            if (entity.ttl <= 0) entity.markedForDeletion = true;
          }
      }
    });

    // Collision Detection (Bullets vs Enemies / Player vs Enemies)
    entitiesRef.current.forEach(entity => {
      if (entity.markedForDeletion) return;

      if (entity.type === 'bullet') {
         // Check vs Enemies
         entitiesRef.current.forEach(target => {
            if (target.type === 'enemy' && !target.markedForDeletion) {
                if (
                    entity.pos.x < target.pos.x + target.size.width &&
                    entity.pos.x + entity.size.width > target.pos.x &&
                    entity.pos.y < target.pos.y + target.size.height &&
                    entity.pos.y + entity.size.height > target.pos.y
                ) {
                    // Hit!
                    entity.markedForDeletion = true;
                    target.hp--;
                    if (target.hp <= 0) {
                        target.markedForDeletion = true;
                        scoreRef.current += 100;
                        // Explosion particles
                        for(let i=0; i<8; i++) {
                            entitiesRef.current.push({
                                id: `part-${Date.now()}-${i}`,
                                type: 'particle',
                                pos: {x: target.pos.x + 16, y: target.pos.y + 16},
                                vel: {x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6},
                                size: {width: 4, height: 4},
                                color: '#f97316',
                                hp: 1, maxHp: 1, markedForDeletion: false, direction: 1, ttl: 20
                            });
                        }
                    }
                }
            }
         });
      } else if (entity.type === 'enemy') {
          // Check vs Player
          if (
            entity.pos.x < player.pos.x + player.size.width &&
            entity.pos.x + entity.size.width > player.pos.x &&
            entity.pos.y < player.pos.y + player.size.height &&
            entity.pos.y + entity.size.height > player.pos.y
          ) {
             player.hp -= 1; // Take damage
             entity.markedForDeletion = true;
             // Knockback
             player.vel.x = entity.pos.x > player.pos.x ? -10 : 10;
             player.vel.y = -5;
          }
      }
    });

    // Cleanup
    entitiesRef.current = entitiesRef.current.filter(e => !e.markedForDeletion);

    // Sync HUD occasionally (every 10 frames to save React renders)
    if (frameCountRef.current % 10 === 0) {
        setHudState({ hp: player.hp, score: scoreRef.current });
    }

    // Check Game Over
    if (player.hp <= 0) {
        onGameOver(scoreRef.current);
    }

    // --- RENDER ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=0; x<canvas.width; x+=50) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y=0; y<canvas.height; y+=50) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Draw Platforms
    platformsRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        // Main block
        ctx.fillRect(p.pos.x, p.pos.y, p.size.width, p.size.height);
        // Highlight top
        ctx.fillStyle = '#64748b';
        ctx.fillRect(p.pos.x, p.pos.y, p.size.width, 4);
        // Tech details
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(p.pos.x + 10, p.pos.y + 8, 10, 8);
        ctx.fillRect(p.pos.x + p.size.width - 20, p.pos.y + 8, 10, 8);
    });

    // Draw Player
    ctx.fillStyle = player.color;
    // Body
    ctx.fillRect(player.pos.x, player.pos.y, player.size.width, player.size.height);
    // Bandana/Head
    ctx.fillStyle = '#ef4444'; 
    ctx.fillRect(player.pos.x, player.pos.y, player.size.width, 10);
    // Gun
    ctx.fillStyle = '#9ca3af';
    if (player.direction === 1) {
        ctx.fillRect(player.pos.x + 20, player.pos.y + 20, 20, 8);
    } else {
        ctx.fillRect(player.pos.x - 10, player.pos.y + 20, 20, 8);
    }

    // Draw Entities
    entitiesRef.current.forEach(e => {
        ctx.fillStyle = e.color;
        if (e.type === 'particle') {
            ctx.globalAlpha = e.ttl ? e.ttl / 20 : 1;
            ctx.fillRect(e.pos.x, e.pos.y, e.size.width, e.size.height);
            ctx.globalAlpha = 1;
        } else if (e.type === 'enemy') {
            // Robot body
            ctx.fillRect(e.pos.x, e.pos.y, e.size.width, e.size.height);
            // Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(e.pos.x + (e.direction === 1 ? 20 : 4), e.pos.y + 8, 8, 4);
            ctx.fillStyle = '#ef4444'; // Glowing red eye
            ctx.fillRect(e.pos.x + (e.direction === 1 ? 22 : 6), e.pos.y + 9, 4, 2);
        } else {
            ctx.fillRect(e.pos.x, e.pos.y, e.size.width, e.size.height);
        }
    });

    requestRef.current = requestAnimationFrame(update);
  }, [gameStatus, onGameOver]);

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
        initLevel();
        requestRef.current = requestAnimationFrame(update);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameStatus, update, initLevel]);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
        if(canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            // Re-init floor on resize if needed or handle dynamic scaling
            initLevel(); 
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [initLevel]);

  return (
    <div className="relative w-full h-full bg-slate-900">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD Overlay */}
      {gameStatus === GameStatus.PLAYING && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center select-none font-bold text-white retro-font">
            <div className="flex flex-col">
               <span className="text-yellow-400 text-sm">P1 SCORE</span>
               <span className="text-2xl tracking-widest">{hudState.score.toString().padStart(6, '0')}</span>
            </div>
            
            {/* Health Bar */}
            <div className="flex flex-col items-end">
               <span className="text-red-400 text-sm mb-1">UNIT INTEGRITY</span>
               <div className="flex gap-1">
                 {Array.from({length: 10}).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-6 transform skew-x-[-12deg] border border-slate-900 ${
                        (hudState.hp / 100) * 10 > i ? 'bg-red-500' : 'bg-slate-700'
                      }`} 
                    />
                 ))}
               </div>
            </div>
          </div>
      )}
      
      {/* Mobile Controls Hint */}
      {gameStatus === GameStatus.PLAYING && (
         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-slate-500 text-xs opacity-50 font-mono">
            [WASD] Move • [J] Fire • [K] Jump
         </div>
      )}
    </div>
  );
};