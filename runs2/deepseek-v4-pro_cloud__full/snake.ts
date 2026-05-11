// snake.ts

type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;       // apples
const SPEEDUP_DELTA = 10;      // ms

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scoreEl: HTMLElement;
  private highEl: HTMLElement;

  private snake: Cell[] = [];
  private dir: Direction = { x: 1, y: 0 };
  private pendingDir: Direction | null = null;
  private food: Cell = { x: 0, y: 0 };
  private score: number = 0;
  private high: number = 0;
  private tickMs: number = INITIAL_TICK_MS;
  private alive: boolean = true;
  private started: boolean = false;
  private paused: boolean = true;
  private intervalId: number | null = null;

  constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.scoreEl = scoreEl;
    this.highEl = highEl;

    // load high score
    const stored = localStorage.getItem('snake.high');
    this.high = stored ? parseInt(stored, 10) || 0 : 0;
    this.updateHighDisplay();

    this.resetState();
    this.draw();
  }

  // --- public API ---

  start(): void {
    if (!this.started && this.alive) {
      this.started = true;
      this.paused = false;
      this.startTick();
      this.draw();
    }
  }

  togglePause(): void {
    if (!this.started || !this.alive) return;
    if (this.paused) {
      this.paused = false;
      this.startTick();
    } else {
      this.paused = true;
      this.stopTick();
    }
    this.draw();
  }

  restart(): void {
    this.stopTick();
    this.resetState();
    this.draw();
  }

  changeDirection(dir: Direction): void {
    // ignore exact opposite of current direction
    if (dir.x === -this.dir.x && dir.y === -this.dir.y) return;
    this.pendingDir = dir;
  }

  // --- private helpers ---

  private resetState(): void {
    // initial snake: head (10,10), body (9,10), (8,10)
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null;
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;
    this.updateScoreDisplay();
    this.spawnFood();
  }

  private spawnFood(): void {
    const occupied = new Set(this.snake.map(c => `${c.x},${c.y}`));
    const free: Cell[] = [];
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        if (!occupied.has(`${x},${y}`)) {
          free.push({ x, y });
        }
      }
    }
    // there is always at least one free cell (snake length < 400)
    const rand = Math.floor(Math.random() * free.length);
    this.food = free[rand];
  }

  private startTick(): void {
    this.stopTick();
    this.intervalId = window.setInterval(() => this.tick(), this.tickMs);
  }

  private stopTick(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    if (!this.alive || this.paused) return;

    // apply pending direction
    if (this.pendingDir) {
      this.dir = this.pendingDir;
      this.pendingDir = null;
    }

    const head = this.snake[0];
    const newHead: Cell = {
      x: head.x + this.dir.x,
      y: head.y + this.dir.y,
    };

    // wall collision
    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
      this.gameOver();
      return;
    }

    // check if apple will be eaten
    const willEat = newHead.x === this.food.x && newHead.y === this.food.y;

    // self-collision: exclude tail only if it will be removed (not eating)
    const segmentsToCheck = willEat ? this.snake : this.snake.slice(0, -1);
    if (segmentsToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      this.gameOver();
      return;
    }

    // move
    this.snake.unshift(newHead);
    if (willEat) {
      // grow: do not remove tail
      this.score++;
      this.updateScoreDisplay();
      this.updateHighScoreIfNeeded();
      this.adjustSpeed();
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  private gameOver(): void {
    this.alive = false;
    this.stopTick();
    this.updateHighScoreIfNeeded();
    this.draw();
  }

  private updateHighScoreIfNeeded(): void {
    if (this.score > this.high) {
      this.high = this.score;
      localStorage.setItem('snake.high', String(this.high));
      this.updateHighDisplay();
    }
  }

  private adjustSpeed(): void {
    const newTickMs = Math.max(
      MIN_TICK_MS,
      INITIAL_TICK_MS - Math.floor(this.score / SPEEDUP_EVERY) * SPEEDUP_DELTA
    );
    if (newTickMs !== this.tickMs) {
      this.tickMs = newTickMs;
      // restart interval if currently running
      if (this.started && !this.paused && this.alive) {
        this.startTick();
      }
    }
  }

  private updateScoreDisplay(): void {
    this.scoreEl.textContent = `Score: ${this.score}`;
  }

  private updateHighDisplay(): void {
    this.highEl.textContent = `High: ${this.high}`;
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // draw food
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

    // draw snake
    this.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
      ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
    });

    // overlay text
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!this.alive) {
      ctx.fillText('Game Over — press R to restart', 200, 200);
    } else if (!this.started) {
      ctx.fillText('Press Space to start', 200, 200);
    } else if (this.paused) {
      ctx.fillText('Paused', 200, 200);
    }
  }
}

// --- top-level setup ---
const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score')!;
const highEl = document.getElementById('high')!;

const game = new Game(canvas, scoreEl, highEl);

window.addEventListener('keydown', (e) => {
  const key = e.key;
  let handled = true;

  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      game.changeDirection({ x: 0, y: -1 });
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      game.changeDirection({ x: 0, y: 1 });
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      game.changeDirection({ x: -1, y: 0 });
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      game.changeDirection({ x: 1, y: 0 });
      break;
    case ' ':
      if (!game['started']) { // access private for logic? We'll use public start/togglePause
        game.start();
      } else {
        game.togglePause();
      }
      break;
    case 'r':
    case 'R':
      game.restart();
      break;
    default:
      handled = false;
  }

  if (handled) {
    e.preventDefault();
  }
});