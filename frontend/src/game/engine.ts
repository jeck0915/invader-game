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
const ENEMY_PIXEL = 4; // sprites are drawn on an 8x6 grid, 4px per cell
const ENEMY_H_GAP = 18;
const ENEMY_V_GAP = 16;
const ENEMY_ROWS = 5;
const ENEMY_COLS = 8;
const ENEMY_STEP_DOWN = 18;
const ENEMY_SHOOT_BASE_INTERVAL = 1.1;
const MAX_DIVERS = 2;
const DIVE_SPEED_BASE = 150;

const BARRIER_CELL = 4;
const BARRIER_COUNT = 4;
// classic bunker silhouette: solid block with an arch cut out of the bottom
const BARRIER_SHAPE = [
  "00111111100",
  "01111111110",
  "11111111111",
  "11111111111",
  "11111111111",
  "11111111111",
  "11100000111",
  "11000000011",
];
const BARRIER_COLS = BARRIER_SHAPE[0].length;
const BARRIER_ROWS = BARRIER_SHAPE.length;
const BARRIER_WIDTH = BARRIER_COLS * BARRIER_CELL;
const BARRIER_HEIGHT = BARRIER_ROWS * BARRIER_CELL;
const BARRIER_Y = FIELD_HEIGHT - 150;

export type GameStatus = "READY" | "PLAYING" | "WAVE_CLEAR" | "GAME_OVER";

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  owner: "player" | "enemy";
  blocked?: boolean;
}

export interface Barrier {
  x: number;
  y: number;
  cells: boolean[][];
}

export interface Enemy {
  row: number;
  col: number;
  alive: boolean;
  diving: boolean;
  diveX: number;
  diveY: number;
  diveVX: number;
  diveVY: number;
  diveShot: boolean;
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
// retro green monochrome palette, brighter near the top of the formation
const ROW_COLORS = ["#baffc9", "#7cffb2", "#58ffa0", "#3ddc84", "#2bb673"];

type EnemyType = "squid" | "crab" | "octopus";

function enemyType(row: number): EnemyType {
  if (row === 0) return "squid";
  if (row === 1 || row === 2) return "crab";
  return "octopus";
}

// 8x6 dot-matrix sprites, two animation frames per type (classic alien walk-cycle)
const SPRITES: Record<EnemyType, { a: string[]; b: string[] }> = {
  squid: {
    a: ["00111100", "01111110", "11111111", "11011011", "11111111", "10111101"],
    b: ["00111100", "01111110", "11111111", "11011011", "11111111", "01011010"],
  },
  crab: {
    a: ["01100110", "10111101", "11111111", "01111110", "11000011", "10011001"],
    b: ["01100110", "10111101", "11111111", "01111110", "11000011", "01100110"],
  },
  octopus: {
    a: ["00011000", "00111100", "01111110", "11111111", "11111111", "10100101"],
    b: ["00011000", "00111100", "01111110", "11111111", "11111111", "11000011"],
  },
};

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
  legFrame = false;

  diveTimer = 3;

  bullets: Bullet[] = [];
  explosions: Explosion[] = [];
  enemyShootTimer = ENEMY_SHOOT_BASE_INTERVAL;
  barriers: Barrier[] = [];

  score = 0;
  lives = 3;
  wave = 1;
  status: GameStatus = "READY";

  input = { left: false, right: false, shoot: false };

  constructor() {
    this.createBarriers();
    this.spawnWave();
  }

  createBarriers() {
    this.barriers = [];
    const spacing = this.width / (BARRIER_COUNT + 1);
    for (let i = 0; i < BARRIER_COUNT; i++) {
      const x = spacing * (i + 1) - BARRIER_WIDTH / 2;
      const cells = BARRIER_SHAPE.map((line) => line.split("").map((c) => c === "1"));
      this.barriers.push({ x, y: BARRIER_Y, cells });
    }
  }

  spawnWave() {
    this.enemies = [];
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        this.enemies.push({
          row,
          col,
          alive: true,
          diving: false,
          diveX: 0,
          diveY: 0,
          diveVX: 0,
          diveVY: 0,
          diveShot: false,
        });
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
    this.diveTimer = Math.max(1.2, 3.2 - (this.wave - 1) * 0.3);
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
    this.createBarriers();
    this.spawnWave();
  }

  nextWave() {
    this.wave += 1;
    this.invulnerableTimer = 1;
    this.spawnWave();
    this.status = "PLAYING";
  }

  enemyPixelPos(e: Enemy) {
    if (e.diving) {
      return { x: e.diveX, y: e.diveY };
    }
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

    const alive = this.aliveEnemies();
    const formationAlive = alive.filter((e) => !e.diving);
    const divingAlive = alive.filter((e) => e.diving);

    // enemy formation movement (divers are decoupled from the grid)
    this.moveTimer += dt;
    if (formationAlive.length > 0 && this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      this.legFrame = !this.legFrame;
      const step = 14;
      if (this.pendingStepDown) {
        this.formationY += ENEMY_STEP_DOWN;
        this.direction *= -1;
        this.pendingStepDown = false;
      } else {
        this.formationX += step * this.direction;
        let minX = Infinity;
        let maxX = -Infinity;
        for (const e of formationAlive) {
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

    // breakaway diving attack
    this.diveTimer -= dt;
    if (this.diveTimer <= 0 && formationAlive.length > 0 && divingAlive.length < MAX_DIVERS) {
      const diver = formationAlive[Math.floor(Math.random() * formationAlive.length)];
      const { x, y } = this.enemyPixelPos(diver);
      diver.diving = true;
      diver.diveX = x;
      diver.diveY = y;
      const targetX = this.player.x + this.player.width / 2 - ENEMY_WIDTH / 2;
      diver.diveVX = Math.max(-80, Math.min(80, (targetX - x) * 0.6));
      diver.diveVY = DIVE_SPEED_BASE + this.wave * 8;
      diver.diveShot = false;
      this.diveTimer = Math.max(1.0, 2.6 - (this.wave - 1) * 0.2) + Math.random();
    }

    // advance divers
    for (const e of divingAlive) {
      e.diveX += e.diveVX * dt;
      e.diveY += e.diveVY * dt;
      if (!e.diveShot && e.diveY > this.formationY + 40) {
        e.diveShot = true;
        this.bullets.push({
          x: e.diveX + ENEMY_WIDTH / 2 - BULLET_WIDTH / 2,
          y: e.diveY + ENEMY_HEIGHT,
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          vy: ENEMY_BULLET_SPEED * 1.2,
          owner: "enemy",
        });
      }
      if (e.diveY > this.height + 30) {
        e.alive = false;
        e.diving = false;
      }
    }

    // enemy shooting (formation enemies)
    this.enemyShootTimer -= dt;
    if (this.enemyShootTimer <= 0 && formationAlive.length > 0) {
      const shooter = formationAlive[Math.floor(Math.random() * formationAlive.length)];
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

    // bullets vs barriers (either side's bullets get absorbed, eroding the shield)
    for (const b of this.bullets) {
      for (const barrier of this.barriers) {
        if (
          b.x + b.width < barrier.x ||
          b.x > barrier.x + BARRIER_WIDTH ||
          b.y + b.height < barrier.y ||
          b.y > barrier.y + BARRIER_HEIGHT
        ) {
          continue;
        }
        let hit = false;
        for (let row = 0; row < BARRIER_ROWS && !hit; row++) {
          for (let col = 0; col < BARRIER_COLS; col++) {
            if (!barrier.cells[row][col]) continue;
            const cx = barrier.x + col * BARRIER_CELL;
            const cy = barrier.y + row * BARRIER_CELL;
            if (this.rectsOverlap(b.x, b.y, b.width, b.height, cx, cy, BARRIER_CELL, BARRIER_CELL)) {
              barrier.cells[row][col] = false;
              b.blocked = true;
              hit = true;
              break;
            }
          }
        }
        if (hit) break;
      }
    }
    this.bullets = this.bullets.filter((b) => !b.blocked);

    // explosions aging
    for (const ex of this.explosions) ex.age += dt;
    this.explosions = this.explosions.filter((ex) => ex.age < 0.3);

    // collisions: player bullets vs enemies (formation + divers)
    for (const b of this.bullets) {
      if (b.owner !== "player") continue;
      for (const e of alive) {
        if (!e.alive) continue;
        const { x, y } = this.enemyPixelPos(e);
        if (this.rectsOverlap(b.x, b.y, b.width, b.height, x, y, ENEMY_WIDTH, ENEMY_HEIGHT)) {
          e.alive = false;
          e.diving = false;
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

    // collisions: diving enemies ramming the player
    if (this.invulnerableTimer <= 0) {
      for (const e of divingAlive) {
        if (!e.alive) continue;
        if (this.rectsOverlap(e.diveX, e.diveY, ENEMY_WIDTH, ENEMY_HEIGHT, this.player.x, this.player.y, this.player.width, this.player.height)) {
          e.alive = false;
          e.diving = false;
          this.explosions.push({ x: e.diveX + ENEMY_WIDTH / 2, y: e.diveY + ENEMY_HEIGHT / 2, age: 0 });
          this.loseLife();
          break;
        }
      }
    }

    // check formation enemies reaching player line
    const stillFormationAlive = this.aliveEnemies().filter((e) => !e.diving);
    for (const e of stillFormationAlive) {
      const { y } = this.enemyPixelPos(e);
      if (y + ENEMY_HEIGHT >= this.player.y) {
        this.status = "GAME_OVER";
        return;
      }
    }

    // wave clear (all enemies gone, including any mid-dive)
    if (this.aliveEnemies().length === 0) {
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
    ctx.fillStyle = "#020803";
    ctx.fillRect(0, 0, this.width, this.height);

    // starfield (static deterministic pattern)
    ctx.fillStyle = "#123524";
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137) % this.width;
      const sy = (i * 71) % this.height;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // enemies (dot-matrix sprites)
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const { x, y } = this.enemyPixelPos(e);
      const sprite = SPRITES[enemyType(e.row)];
      const rows = this.legFrame ? sprite.b : sprite.a;
      ctx.fillStyle = ROW_COLORS[e.row] ?? "#58ffa0";
      for (let ry = 0; ry < rows.length; ry++) {
        const line = rows[ry];
        for (let rx = 0; rx < line.length; rx++) {
          if (line[rx] === "1") {
            ctx.fillRect(x + rx * ENEMY_PIXEL, y + ry * ENEMY_PIXEL, ENEMY_PIXEL, ENEMY_PIXEL);
          }
        }
      }
    }

    // barriers
    ctx.fillStyle = "#2d9e62";
    for (const barrier of this.barriers) {
      for (let row = 0; row < BARRIER_ROWS; row++) {
        for (let col = 0; col < BARRIER_COLS; col++) {
          if (barrier.cells[row][col]) {
            ctx.fillRect(barrier.x + col * BARRIER_CELL, barrier.y + row * BARRIER_CELL, BARRIER_CELL, BARRIER_CELL);
          }
        }
      }
    }

    // explosions
    for (const ex of this.explosions) {
      const r = 6 + ex.age * 40;
      ctx.strokeStyle = `rgba(140,255,170,${Math.max(0, 1 - ex.age / 0.3)})`;
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
      ctx.fillStyle = b.owner === "player" ? "#d4ffe0" : "#1f5c38";
      ctx.fillRect(b.x, b.y, b.width, b.height);
    }
  }
}
