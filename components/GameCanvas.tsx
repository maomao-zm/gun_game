import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Entity, GameStatus, WeaponType, EnemyType } from '../types';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  gameStatus: GameStatus;
}

const GRAVITY = 0.6;
const FRICTION = 0.8;
const PLAYER_SPEED = 6;
const JUMP_FORCE = -14;

// Game Balance Constants
const WEAPONS = {
  rifle: { rate: 10, speed: 12, color: '#facc15', size: {width:8, height:4} },
  spread: { rate: 20, speed: 10, color: '#ef4444', size: {width:10, height:10} },
  laser: { rate: 25, speed: 20, color: '#3b82f6', size: {width:30, height:4} },
  flame: { rate: 4, speed: 7, color: '#f97316', size: {width:6, height:6} }
};

const BOSS_SPAWN_SCORE = 1500;

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const bossActiveRef = useRef<boolean>(false);
  
  // Game State Refs
  const playerRef = useRef<Entity>({
    id: 'player',
    type: 'player',
    weaponType: 'rifle',
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
    left: false, right: false, up: false, down: false, jump: false, fire: false
  });
  
  // HUD State
  const [hudState, setHudState] = useState({ 
    hp: 100, 
    score: 0, 
    weapon: 'rifle' as WeaponType,
    bossHp: 0,
    maxBossHp: 100
  });

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

  const initLevel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    playerRef.current = {
      ...playerRef.current,
      pos: { x: 100, y: canvas.height - 150 },
      vel: { x: 0, y: 0 },
      hp: 100,
      weaponType: 'rifle',
      markedForDeletion: false
    };

    entitiesRef.current = [];
    scoreRef.current = 0;
    frameCountRef.current = 0;
    bossActiveRef.current = false;

    // Create Floor
    platformsRef.current = [
      { id: 'floor', type: 'platform', pos: { x: 0, y: canvas.height - 40 }, size: { width: canvas.width, height: 40 }, vel: {x:0, y:0}, color: '#334155', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
      { id: 'p1', type: 'platform', pos: { x: 300, y: canvas.height - 180 }, size: { width: 200, height: 20 }, vel: {x:0, y:0}, color: '#475569', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
      { id: 'p2', type: 'platform', pos: { x: 600, y: canvas.height - 300 }, size: { width: 200, height: 20 }, vel: {x:0, y:0}, color: '#475569', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
      { id: 'p3', type: 'platform', pos: { x: 100, y: canvas.height - 350 }, size: { width: 150, height: 20 }, vel: {x:0, y:0}, color: '#475569', hp: 1, maxHp: 1, markedForDeletion: false, direction: 1 },
    ];
  }, []);

  const spawnPowerup = (canvasWidth: number, canvasHeight: number) => {
    const types: WeaponType[] = ['spread', 'laser', 'flame'];
    const type = types[Math.floor(Math.random() * types.length)];
    entitiesRef.current.push({
      id: `pw-${Date.now()}`,
      type: 'powerup',
      weaponType: type,
      pos: { x: canvasWidth, y: 200 },
      vel: { x: -3, y: 0 },
      size: { width: 24, height: 24 },
      color: '#fff',
      hp: 1, maxHp: 1, markedForDeletion: false, direction: 1
    });
  };

  const spawnEnemy = (canvasWidth: number, canvasHeight: number) => {
    if (bossActiveRef.current) return;

    const rand = Math.random();
    let type: EnemyType = 'runner';
    let yPos = canvasHeight - 80;
    let color = '#22c55e'; // Green Runner

    if (rand > 0.7) {
      type = 'drone';
      yPos = 50 + Math.random() * 100;
      color = '#a855f7'; // Purple Drone
    } else if (rand > 0.4) {
      type = 'jumper';
      yPos = canvasHeight - 80;
      color = '#f97316'; // Orange Jumper
    }

    entitiesRef.current.push({
      id: `enemy-${Date.now()}`,
      type: 'enemy',
      subtype: type,
      pos: { x: canvasWidth, y: yPos },
      vel: { x: -2, y: 0 },
      size: { width: 32, height: 32 },
      color: color,
      hp: type === 'drone' ? 1 : 3,
      maxHp: 3,
      markedForDeletion: false,
      direction: -1,
      attackTimer: 0,
      isGrounded: false
    });
  };

  const spawnBoss = (canvasWidth: number, canvasHeight: number) => {
    bossActiveRef.current = true;
    entitiesRef.current.push({
      id: 'boss',
      type: 'enemy',
      subtype: 'boss',
      pos: { x: canvasWidth + 100, y: canvasHeight - 300 },
      vel: { x: -1, y: 0 },
      size: { width: 120, height: 200 },
      color: '#ef4444',
      hp: 150,
      maxHp: 150,
      bossPhase: 0, // Entering
      markedForDeletion: false,
      direction: -1,
      attackTimer: 0
    });
  };

  const update = useCallback(() => {
    if (gameStatus !== GameStatus.PLAYING) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameCountRef.current++;
    const player = playerRef.current;

    // --- PLAYER PHYSICS ---
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

    // Bounds & Fall Death
    if (player.pos.x < 0) player.pos.x = 0;
    if (player.pos.x + player.size.width > canvas.width) player.pos.x = canvas.width - player.size.width;
    if (player.pos.y > canvas.height) player.hp = 0;

    // Platforms
    player.isGrounded = false;
    platformsRef.current.forEach(platform => {
      if (
        player.pos.x < platform.pos.x + platform.size.width &&
        player.pos.x + player.size.width > platform.pos.x &&
        player.pos.y + player.size.height > platform.pos.y &&
        player.pos.y + player.size.height < platform.pos.y + platform.size.height + 20 &&
        player.vel.y >= 0
      ) {
        player.isGrounded = true;
        player.vel.y = 0;
        player.pos.y = platform.pos.y - player.size.height;
      }
    });

    // --- SHOOTING LOGIC ---
    if (inputRef.current.fire) {
      const wStats = WEAPONS[player.weaponType || 'rifle'];
      if (frameCountRef.current % wStats.rate === 0) {
        
        const spawnBullet = (vx: number, vy: number, ttl?: number) => {
          entitiesRef.current.push({
            id: `b-${Date.now()}-${Math.random()}`,
            type: 'bullet',
            pos: { 
              x: player.pos.x + (player.direction === 1 ? player.size.width : 0), 
              y: player.pos.y + 16 
            },
            vel: { x: vx, y: vy },
            size: wStats.size,
            color: wStats.color,
            hp: 1, maxHp: 1, 
            markedForDeletion: false, 
            direction: player.direction,
            ttl: ttl,
            penetration: player.weaponType === 'laser' ? 5 : 1
          });
        };

        if (player.weaponType === 'spread') {
          spawnBullet(player.direction * wStats.speed, 0);
          spawnBullet(player.direction * wStats.speed * 0.9, -2);
          spawnBullet(player.direction * wStats.speed * 0.9, 2);
        } else if (player.weaponType === 'flame') {
          spawnBullet(player.direction * wStats.speed, (Math.random() - 0.5) * 2, 30);
        } else {
          // Rifle and Laser
          spawnBullet(player.direction * wStats.speed, 0);
        }
      }
    }

    // --- SPAWNING ---
    if (!bossActiveRef.current && scoreRef.current > BOSS_SPAWN_SCORE && entitiesRef.current.filter(e => e.subtype === 'boss').length === 0) {
      spawnBoss(canvas.width, canvas.height);
    }

    if (frameCountRef.current % 120 === 0) spawnEnemy(canvas.width, canvas.height);
    if (frameCountRef.current % 900 === 0 && !bossActiveRef.current) spawnPowerup(canvas.width, canvas.height);

    // --- ENTITY UPDATE LOOP ---
    let currentBossHp = 0;
    
    entitiesRef.current.forEach(e => {
      if (e.markedForDeletion) return;

      // Gravity for non-flying/bullet entities
      if (e.type !== 'bullet' && e.type !== 'particle' && e.type !== 'powerup' && e.subtype !== 'drone' && e.subtype !== 'boss' && e.type !== 'boss_projectile') {
         e.vel.y += GRAVITY;
      }

      // -- SPECIFIC AI --
      if (e.type === 'powerup') {
        e.pos.x += e.vel.x;
        e.pos.y = 200 + Math.sin(frameCountRef.current * 0.05) * 50;
        if (e.pos.x < -50) e.markedForDeletion = true;
      }
      else if (e.type === 'enemy') {
        if (e.subtype === 'boss') {
          currentBossHp = e.hp;
          // Boss Logic
          if (e.bossPhase === 0) {
            // Enter screen
            e.pos.x = Math.max(canvas.width - e.size.width - 50, e.pos.x + e.vel.x);
            if (e.pos.x <= canvas.width - e.size.width - 50) e.bossPhase = 1;
          } else {
            // Float up and down
            e.pos.y = (canvas.height - 300) + Math.sin(frameCountRef.current * 0.02) * 50;
            
            // Phase switch
            if (e.hp < e.maxHp / 2 && e.bossPhase === 1) e.bossPhase = 2;

            e.attackTimer = (e.attackTimer || 0) + 1;
            const attackRate = e.bossPhase === 2 ? 40 : 80;

            if (e.attackTimer % attackRate === 0) {
               // Fire Boss Projectile
               const angle = Math.atan2((player.pos.y - e.pos.y), (player.pos.x - e.pos.x));
               const speed = e.bossPhase === 2 ? 8 : 5;
               entitiesRef.current.push({
                 id: `bp-${Date.now()}`,
                 type: 'boss_projectile',
                 pos: {x: e.pos.x, y: e.pos.y + e.size.height/2},
                 vel: {x: Math.cos(angle) * speed, y: Math.sin(angle) * speed},
                 size: {width: 12, height: 12},
                 color: e.bossPhase === 2 ? '#ff0000' : '#ffa500',
                 hp: 1, maxHp: 1, markedForDeletion: false, direction: -1
               });
               
               // In phase 2, fire spread too
               if (e.bossPhase === 2) {
                   entitiesRef.current.push({
                     id: `bp-spread-${Date.now()}`,
                     type: 'boss_projectile',
                     pos: {x: e.pos.x, y: e.pos.y + 20},
                     vel: {x: -8, y: 0},
                     size: {width: 16, height: 16},
                     color: '#ff0000',
                     hp: 1, maxHp: 1, markedForDeletion: false, direction: -1
                   });
               }
            }
          }
        } 
        else if (e.subtype === 'drone') {
          e.pos.x += e.vel.x;
          e.pos.y = 100 + Math.sin(frameCountRef.current * 0.05) * 50;
          // Bomb drop
          if (Math.abs(e.pos.x - player.pos.x) < 50 && Math.random() < 0.05) {
             entitiesRef.current.push({
               id: `bomb-${Date.now()}`,
               type: 'boss_projectile', // Re-use type for enemy bullets
               pos: {x: e.pos.x + 16, y: e.pos.y + 32},
               vel: {x: 0, y: 5},
               size: {width: 8, height: 8},
               color: '#fff',
               hp: 1, maxHp: 1, markedForDeletion: false, direction: 1
             });
          }
        } 
        else if (e.subtype === 'jumper') {
          e.pos.x += e.vel.x;
          // Jump logic
          if (e.isGrounded && Math.random() < 0.02) {
            e.vel.y = -12;
            e.vel.x = (player.pos.x - e.pos.x) > 0 ? 4 : -4;
            e.isGrounded = false;
          }
        } 
        else {
          // Runner
          e.pos.x += e.vel.x;
        }

        // Apply Position
        if (e.subtype !== 'boss' && e.subtype !== 'drone') {
          e.pos.x += e.vel.x;
          e.pos.y += e.vel.y;
        }

        // Platforms for enemies
        if (e.subtype !== 'boss' && e.subtype !== 'drone') {
            platformsRef.current.forEach(platform => {
              if (
                  e.pos.x < platform.pos.x + platform.size.width &&
                  e.pos.x + e.size.width > platform.pos.x &&
                  e.pos.y + e.size.height > platform.pos.y &&
                  e.pos.y + e.size.height < platform.pos.y + platform.size.height + 20 &&
                  e.vel.y >= 0
              ) {
                  e.vel.y = 0;
                  e.pos.y = platform.pos.y - e.size.height;
                  e.isGrounded = true;
              }
            });
        }
        
        // Clean up off-screen
        if (e.pos.y > canvas.height + 100) e.markedForDeletion = true;
        if (e.subtype !== 'boss' && e.pos.x < -100) e.markedForDeletion = true;
      }
      else if (e.type === 'bullet' || e.type === 'boss_projectile') {
        e.pos.x += e.vel.x;
        e.pos.y += e.vel.y;
        if (e.ttl) {
          e.ttl--;
          e.vel.y -= 0.1; // Flame floats up
          if (e.ttl <= 0) e.markedForDeletion = true;
        }
        if (e.pos.x < -50 || e.pos.x > canvas.width + 50) e.markedForDeletion = true;
      }
      else if (e.type === 'particle') {
        e.pos.x += e.vel.x;
        e.pos.y += e.vel.y;
        if (e.ttl) {
           e.ttl--;
           if (e.ttl <= 0) e.markedForDeletion = true;
        }
      }
    });

    // --- COLLISIONS ---
    entitiesRef.current.forEach(entity => {
      if (entity.markedForDeletion) return;

      // Player vs Powerup
      if (entity.type === 'powerup') {
        if (isColliding(player, entity)) {
          player.weaponType = entity.weaponType;
          scoreRef.current += 500;
          entity.markedForDeletion = true;
          // Spawn Sparkles
          for(let i=0; i<10; i++) spawnParticle(player.pos.x, player.pos.y, '#fff');
        }
      }
      // Player Bullet vs Enemy
      else if (entity.type === 'bullet') {
        entitiesRef.current.forEach(target => {
          if (target.type === 'enemy' && !target.markedForDeletion) {
             if (isColliding(entity, target)) {
                
                if (target.subtype === 'boss') {
                    // Only damage boss if hitting the core (center) approx
                    target.hp -= 1;
                } else {
                    target.hp -= 1;
                }

                if (entity.penetration && entity.penetration > 1) {
                    entity.penetration--;
                } else {
                    entity.markedForDeletion = true;
                }

                spawnParticle(entity.pos.x, entity.pos.y, target.color);

                if (target.hp <= 0) {
                    if (target.subtype === 'boss') {
                        // Boss Dead
                        scoreRef.current += 5000;
                        bossActiveRef.current = false;
                        for(let i=0; i<50; i++) spawnParticle(target.pos.x + Math.random()*target.size.width, target.pos.y + Math.random()*target.size.height, '#ef4444');
                        target.markedForDeletion = true;
                    } else {
                        scoreRef.current += 100;
                        target.markedForDeletion = true;
                    }
                }
             }
          }
        });
      }
      // Enemy/Projectile vs Player
      else if (entity.type === 'enemy' || entity.type === 'boss_projectile') {
        if (isColliding(player, entity)) {
            player.hp -= 10;
            if (entity.type === 'boss_projectile') entity.markedForDeletion = true;
            
            // Knockback
            player.vel.x = entity.pos.x > player.pos.x ? -10 : 10;
            player.vel.y = -5;
            spawnParticle(player.pos.x, player.pos.y, '#ef4444');
        }
      }
    });

    // Cleanup
    entitiesRef.current = entitiesRef.current.filter(e => !e.markedForDeletion);

    // Sync HUD
    if (frameCountRef.current % 5 === 0) {
      setHudState({ 
          hp: player.hp, 
          score: scoreRef.current, 
          weapon: player.weaponType || 'rifle',
          bossHp: currentBossHp,
          maxBossHp: 150
      });
    }

    if (player.hp <= 0) onGameOver(scoreRef.current);

    // --- RENDER ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=0; x<canvas.width; x+=50) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y=0; y<canvas.height; y+=50) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Platforms
    platformsRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.pos.x, p.pos.y, p.size.width, p.size.height);
        ctx.fillStyle = '#64748b'; ctx.fillRect(p.pos.x, p.pos.y, p.size.width, 4);
    });

    // Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.pos.x, player.pos.y, player.size.width, player.size.height);
    // Bandana
    ctx.fillStyle = '#ef4444'; ctx.fillRect(player.pos.x, player.pos.y, player.size.width, 10);
    // Weapon Visual
    ctx.fillStyle = '#9ca3af';
    const gunLen = player.weaponType === 'laser' ? 35 : player.weaponType === 'spread' ? 25 : 20;
    const gunW = player.weaponType === 'spread' ? 12 : 8;
    ctx.fillRect(player.pos.x + (player.direction===1?20:-5), player.pos.y + 20, gunLen, gunW);

    // Entities
    entitiesRef.current.forEach(e => {
        ctx.fillStyle = e.color;
        
        if (e.type === 'powerup') {
            // Floating capsule
            ctx.beginPath();
            ctx.ellipse(e.pos.x + 12, e.pos.y + 12, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(e.weaponType?.charAt(0).toUpperCase() || '?', e.pos.x + 8, e.pos.y + 16);
        }
        else if (e.subtype === 'boss') {
            // Massive Mech Draw
            ctx.fillStyle = e.bossPhase === 2 ? '#7f1d1d' : '#334155'; // Darker in phase 2
            ctx.fillRect(e.pos.x, e.pos.y, e.size.width, e.size.height);
            
            // Core
            ctx.fillStyle = e.bossPhase === 2 ? '#ef4444' : '#facc15';
            const flicker = Math.random() > 0.9 ? 0 : 1;
            if (flicker) {
                const coreSize = e.bossPhase === 2 ? 40 : 30;
                ctx.fillRect(e.pos.x + 20, e.pos.y + e.size.height/2 - 20, coreSize, 40);
            }
            
            // Guns
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(e.pos.x - 20, e.pos.y + 20, 20, 10);
            ctx.fillRect(e.pos.x - 20, e.pos.y + e.size.height - 30, 20, 10);
        }
        else if (e.subtype === 'drone') {
            ctx.beginPath();
            ctx.arc(e.pos.x + 16, e.pos.y + 16, 16, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(e.pos.x + 8, e.pos.y + 24, 16, 4); // Propeller
        }
        else if (e.type === 'particle') {
            ctx.globalAlpha = e.ttl ? e.ttl / 20 : 1;
            ctx.fillRect(e.pos.x, e.pos.y, e.size.width, e.size.height);
            ctx.globalAlpha = 1;
        }
        else if (e.type === 'bullet') {
             if (player.weaponType === 'flame') {
                ctx.beginPath();
                ctx.arc(e.pos.x, e.pos.y, e.size.width, 0, Math.PI*2);
                ctx.fill();
             } else {
                ctx.fillRect(e.pos.x, e.pos.y, e.size.width, e.size.height);
             }
        }
        else {
            ctx.fillRect(e.pos.x, e.pos.y, e.size.width, e.size.height);
        }
    });

    requestRef.current = requestAnimationFrame(update);
  }, [gameStatus, onGameOver]);

  const isColliding = (r1: Entity, r2: Entity) => {
    return (
        r1.pos.x < r2.pos.x + r2.size.width &&
        r1.pos.x + r1.size.width > r2.pos.x &&
        r1.pos.y < r2.pos.y + r2.size.height &&
        r1.pos.y + r1.size.height > r2.pos.y
    );
  };

  const spawnParticle = (x: number, y: number, color: string) => {
      entitiesRef.current.push({
          id: `p-${Date.now()}-${Math.random()}`,
          type: 'particle',
          pos: {x, y},
          vel: {x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6},
          size: {width: 4, height: 4},
          color: color,
          hp: 1, maxHp: 1, markedForDeletion: false, direction: 1, ttl: 20
      });
  };

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
        initLevel();
        requestRef.current = requestAnimationFrame(update);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameStatus, update, initLevel]);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
        if(canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
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
          <div className="absolute top-4 left-4 right-4 pointer-events-none">
            <div className="flex justify-between items-start retro-font text-white">
                <div className="flex flex-col">
                   <span className="text-yellow-400 text-xs tracking-widest">SCORE</span>
                   <span className="text-2xl">{hudState.score.toString().padStart(6, '0')}</span>
                   <div className="mt-2 flex items-center gap-2">
                       <span className="text-xs text-blue-400">WEAPON</span>
                       <span className="px-2 py-1 bg-blue-900 border border-blue-500 text-xs font-bold uppercase">{hudState.weapon}</span>
                   </div>
                </div>
                
                <div className="flex flex-col items-end">
                   <span className="text-red-400 text-xs tracking-widest mb-1">ARMOR</span>
                   <div className="flex gap-1">
                     {Array.from({length: 10}).map((_, i) => (
                        <div key={i} className={`w-3 h-5 skew-x-[-12deg] border border-slate-900 ${(hudState.hp / 100) * 10 > i ? 'bg-red-500' : 'bg-slate-800'}`} />
                     ))}
                   </div>
                </div>
            </div>

            {/* Boss Health Bar */}
            {hudState.bossHp > 0 && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-1/2">
                    <div className="flex justify-between text-xs text-red-500 font-bold mb-1 retro-font">
                        <span>WARNING: BOSS ENGAGED</span>
                        <span>{Math.ceil((hudState.bossHp / hudState.maxBossHp) * 100)}%</span>
                    </div>
                    <div className="h-4 bg-slate-800 border-2 border-red-900">
                        <div 
                            className="h-full bg-red-600 transition-all duration-200"
                            style={{ width: `${(hudState.bossHp / hudState.maxBossHp) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}
          </div>
      )}
      
      {/* Mobile Hint */}
      {gameStatus === GameStatus.PLAYING && (
         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-slate-500 text-xs opacity-50 font-mono">
            [WASD] Move • [J] Fire • [K] Jump
         </div>
      )}
    </div>
  );
};