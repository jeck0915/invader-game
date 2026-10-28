export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 600;

const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 20;
const PLAYER_SPEED = 320; // px/sec
const PLAYER_COOLDOWN = 0.35; // sec between shots
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 12;
const PLAYER_BULLET_SPEED = 520;
const ENEMY_BULLET_SPEED = 260;
const ENEMY_WIDTH = 32;
const ENEMY_HEIGHT = 24;
const ENEMY_H_GAP = 18;
const ENEMY_V_GAP = 16;
const ENEMY_ROWS = 5;
const ENEMY_COLS = 8;
const ENEMY_STEP_DOWN = 18;
const ENEMY_SHOOT_BASE_INTERVAL = 1.1;

export type GameStatus = "READY" | "PLAYING" | "WAVE_CLEAR" | "GAME_OVER";

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  owner: "player" | "enemy";
}

export interface Enemy {
  row: number;
  col: number;
  alive: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  age: number;
}

export interface Snapshot {
  status: GameStatus;
  score: number;
  lives: number;
  wave: number;
}

const ROW_POINTS = [40, 30, 30, 20, 10];
const ROW_COLORS = ["#ff4d6d", "#ffb703", "#ffb703", "#4dd0e1", "#4dd0e1"];

export class GameEngine {
  width = FIELD_WIDTH;
  height = FIELD_HEIGHT;

  player = { x: FIELD_WIDTH / 2 - PLAYER_WIDTH / 2, y: FIELD_HEIGHT - 48, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
  playerCooldown = 0;
  invulnerableTimer = 0;

  enemies: Enemy[] = [];
  formationX = 60;
  formationY = 70;
  direction = 1;
  moveTimer = 0;
  moveInterval = 0.8;
  pendingStepDown = false;

  bullets: Bullet[] = [];
  explosions: Explosion[] = [];
  enemyShootTimer = ENEMY_SHOOT_BASE_INTERVAL;

  score = 0;
  lives = 3;
  wave = 1;
  status: GameStatus = "READY";

  input = { left: false, right: false, shoot: false };

  constructor() {
    this.spawnWave();
  }

  spawnWave() {
    this.enemies = [];
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        this.enemies.push({ row, col, alive: true });
      }
    }
    this.formationX = 60;
    this.formationY = 70;
    this.direction = 1;
    this.moveTimer = 0;
    this.moveInterval = Math.max(0.18, 0.8 - (this.wave - 1) * 0.08);
    this.pendingStepDown = false;
    this.bullets = this.bullets.filter((b) => b.owner === "player");
    this.enemyShootTimer = ENEMY_SHOOT_BASE_INTERVAL;
  }

  start() {
    this.status = "PLAYING";
  }

  reset() {
    this.player.x = FIELD_WIDTH / 2 - PLAYER_WIDTH / 2;
    this.playerCooldown = 0;
    this.invulnerableTimer = 1;
    this.bullets = [];
    this.explosions = [];
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.status = "PLAYING";
    this.spawnWave();
  }

  nextWave() {
    this.wave += 1;
    this.invulnerableTimer = 1;
    this.spawnWave();
    this.status = "PLAYING";
  }

  enemyPixelPos(e: Enemy) {
    return {
      x: this.formationX + e.col * (ENEMY_WIDTH + ENEMY_H_GAP),
      y: this.formationY + e.row * (ENEMY_HEIGHT + ENEMY_V_GAP),
    };
  }

  aliveEnemies() {
    return this.enemies.filter((e) => e.alive);
  }

  update(dt: number) {
    if (this.status !== "PLAYING") return;

    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    // player movement
    let vx = 0;
    if (this.input.left) vx -= PLAYER_SPEED;
    if (this.input.right) vx += PLAYER_SPEED;
    this.player.x += vx * dt;
    this.player.x = Math.max(8, Math.min(this.width - this.player.width - 8, this.player.x));

    // player shooting
    this.playerCooldown -= dt;
    if (this.input.shoot && this.playerCooldown <= 0) {
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - BULLET_WIDTH / 2,
        y: this.player.y - BULLET_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        vy: -PLAYER_BULLET_SPEED,
        owner: "player",
      });
      this.playerCooldown = PLAYER_COOLDOWN;
    }

    // enemy formation movement
    const alive = this.aliveEnemies();
    this.moveTimer += dt;
    if (alive.length > 0 && this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      const step = 14;
      if (this.pendingStepDown) {
        this.formationY += ENEMY_STEP_DOWN;
        this.direction *= -1;
        this.pendingStepDown = false;
      } else {
        this.formationX += step * this.direction;
        let minX = Infinity;
        let maxX = -Infinity;
        for (const e of alive) {
          const { x } = this.enemyPixelPos(e);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + ENEMY_WIDTH);
        }
        if (minX <= 10 || maxX >= this.width - 10) {
          this.pendingStepDown = true;
        }
      }
      // speed ramps up as fewer enemies remain
      const total = ENEMY_ROWS * ENEMY_COLS;
      const ratio = alive.length / total;
      this.moveInterval = Math.max(0.12, (0.8 - (this.wave - 1) * 0.08) * (0.3 + 0.7 * ratio));
    }

    // enemy shooting
    this.enemyShootTimer -= dt;
    if (this.enemyShootTimer <= 0 && alive.length > 0) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      const { x, y } = this.enemyPixelPos(shooter);
      this.bullets.push({
        x: x + ENEMY_WIDTH / 2 - BULLET_WIDTH / 2,
        y: y + ENEMY_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        vy: ENEMY_BULLET_SPEED,
        owner: "enemy",
      });
      this.enemyShootTimer = Math.max(0.35, ENEMY_SHOOT_BASE_INTERVAL - (this.wave - 1) * 0.1) * (0.5 + Math.random());
    }

    // bullets movement
    for (const b of this.bullets) {
      b.y += b.vy * dt;
    }
    this.bullets = this.bullets.filter((b) => b.y > -20 && b.y < this.height + 20);

    // explosions aging
    for (const ex of this.explosions) ex.age += dt;
    this.explosions = this.explosions.filter((ex) => ex.age < 0.3);

    // collisions: player bullets vs enemies
    for (const b of this.bullets) {
      if (b.owner !== "player") continue;
      for (const e of alive) {
        if (!e.alive) continue;
        const { x, y } = this.enemyPixelPos(e);
        if (this.rectsOverlap(b.x, b.y, b.width, b.height, x, y, ENEMY_WIDTH, ENEMY_HEIGHT)) {
          e.alive = false;
          b.y = -1000; // mark for removal
          this.score += ROW_POINTS[e.row] ?? 10;
          this.explosions.push({ x: x + ENEMY_WIDTH / 2, y: y + ENEMY_HEIGHT / 2, age: 0 });
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.y > -999);

    // collisions: enemy bullets vs player
    if (this.invulnerableTimer <= 0) {
      for (const b of this.bullets) {
        if (b.owner !== "enemy") continue;
        if (this.rectsOverlap(b.x, b.y, b.width, b.height, this.player.x, this.player.y, this.player.width, this.player.height)) {
          b.y = this.height + 1000;
          this.loseLife();
          break;
        }
      }
      this.bullets = this.bullets.filter((b) => b.y < this.height + 999);
    }

    // check enemies reaching player line
    const stillAlive = this.aliveEnemies();
    for (const e of stillAlive) {
      const { y } = this.enemyPixelPos(e);
      if (y + ENEMY_HEIGHT >= this.player.y) {
        this.status = "GAME_OVER";
        return;
      }
    }

    // wave clear
    if (stillAlive.length === 0) {
      this.status = "WAVE_CLEAR";
    }
  }

  loseLife() {
    this.lives -= 1;
    this.invulnerableTimer = 1.2;
    this.explosions.push({ x: this.player.x + this.player.width / 2, y: this.player.y + this.player.height / 2, age: 0 });
    if (this.lives <= 0) {
      this.status = "GAME_OVER";
    }
  }

  rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  snapshot(): Snapshot {
    return { status: this.status, score: this.score, lives: this.lives, wave: this.wave };
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#05030f";
    ctx.fillRect(0, 0, this.width, this.height);

    // starfield (static deterministic pattern)
    ctx.fillStyle = "#2a2a40";
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137) % this.width;
      const sy = (i * 71) % this.height;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const { x, y } = this.enemyPixelPos(e);
      ctx.fillStyle = ROW_COLORS[e.row] ?? "#4dd0e1";
      ctx.fillRect(x, y, ENEMY_WIDTH, ENEMY_HEIGHT);
      ctx.fillStyle = "#05030f";
      ctx.fillRect(x + 6, y + 6, 6, 6);
      ctx.fillRect(x + ENEMY_WIDTH - 12, y + 6, 6, 6);
    }

    // explosions
    for (const ex of this.explosions) {
      const r = 6 + ex.age * 40;
      ctx.strokeStyle = `rgba(255,180,60,${Math.max(0, 1 - ex.age / 0.3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // player (blink while invulnerable)
    if (this.invulnerableTimer <= 0 || Math.floor(this.invulnerableTimer * 10) % 2 === 0) {
      ctx.fillStyle = "#58ffa0";
      const p = this.player;
      ctx.fillRect(p.x, p.y + 10, p.width, p.height - 10);
      ctx.fillRect(p.x + p.width / 2 - 4, p.y, 8, 12);
    }

    // bullets
    for (const b of this.bullets) {
      ctx.fillStyle = b.owner === "player" ? "#ffffff" : "#ff5e5e";
      ctx.fillRect(b.x, b.y, b.width, b.height);
    }
  }
}
