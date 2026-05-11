type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scoreEl: HTMLElement;
  private highEl: HTMLElement;

  private snake: Cell[];
  private dir: Direction;
  private pendingDir: Direction | null;
  private food: Cell;
  private score: number;
  private high: number;
  private tickMs: number;
  private alive: boolean;
  private started: boolean;
  private paused: boolean;
  private tickId: number | null;

  constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.scoreEl = scoreEl;
    this.highEl = highEl;

    const storedHigh = localStorage.getItem('snake.high');
    this.high = storedHigh ? parseInt(storedHigh, 10) : 0;
    this.highEl.textContent = `High: ${this.high}`;

    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null;
    this.food = { x: 0, y: 0 };
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = false;
    this.started = false;
    this.paused = true;
    this.tickId = null;

    this.initSnake();
    this.spawnFood();
    this.alive = true;
    this.draw();
  }

  private initSnake(): void {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null;
  }

  private spawnFood(): void {
    const occupied = new Set<string>();
    for (const cell of this.snake) {
      occupied.add(`${cell.x},${cell.y}`);
    }

    let x: number;
    let y: number;
    do {
      x = Math.floor(Math.random() * GRID);
      y = Math.floor(Math.random() * GRID);
    } while (occupied.has(`${x},${y}`));

    this.food = { x, y };
  }

  start(): void {
    if (!this.started && this.paused && this.alive) {
      this.started = true;
      this.paused = false;
      this.scheduleTick();
    }
  }

  togglePause(): void {
    if (!this.started || !this.alive) return;

    this.paused = !this.paused;
    if (this.paused) {
      this.cancelTick();
      this.draw();
    } else {
      this.scheduleTick();
    }
  }

  restart(): void {
    this.cancelTick();

    this.initSnake();
    this.spawnFood();
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;

    this.scoreEl.textContent = `Score: ${this.score}`;
    this.draw();
  }

  hasStarted(): boolean {
    return this.started;
  }

  setDirection(newDir: Direction): void {
    if (this.dir.x + newDir.x === 0 && this.dir.y + newDir.y === 0) {
      return;
    }
    this.pendingDir = newDir;
  }

  private scheduleTick(): void {
    this.cancelTick();
    this.tickId = window.setTimeout(() => this.tick(), this.tickMs);
  }

  private cancelTick(): void {
    if (this.tickId !== null) {
      window.clearTimeout(this.tickId);
      this.tickId = null;
    }
  }

  private tick(): void {
    if (this.paused || !this.alive) return;

    if (this.pendingDir !== null) {
      this.dir = this.pendingDir;
      this.pendingDir = null;
    }

    const head = this.snake[0];
    const newHead: Cell = {
      x: head.x + this.dir.x,
      y: head.y + this.dir.y
    };

    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
      this.gameOver();
      return;
    }

    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        this.gameOver();
        return;
      }
    }

    this.snake.unshift(newHead);

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.scoreEl.textContent = `Score: ${this.score}`;

      if (this.score > this.high) {
        this.high = this.score;
        this.highEl.textContent = `High: ${this.high}`;
        localStorage.setItem('snake.high', String(this.high));
      }

      if (this.score % SPEEDUP_EVERY === 0) {
        this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
      }

      this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.draw();
    this.scheduleTick();
  }

  private gameOver(): void {
    this.alive = false;
    this.cancelTick();
    this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#c0392b';
    ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

    for (let i = 0; i < this.snake.length; i++) {
      const cell = this.snake[i];
      ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
      ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!this.alive) {
      ctx.fillText('Game Over — press R to restart', this.canvas.width / 2, this.canvas.height / 2);
    } else if (!this.started) {
      ctx.fillText('Press Space to start', this.canvas.width / 2, this.canvas.height / 2);
    } else if (this.paused) {
      ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height / 2);
    }
  }
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score') as HTMLElement;
const highEl = document.getElementById('high') as HTMLElement;

const game = new Game(canvas, scoreEl, highEl);

window.addEventListener('keydown', (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      e.preventDefault();
      game.setDirection({ x: 0, y: -1 });
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      e.preventDefault();
      game.setDirection({ x: 0, y: 1 });
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault();
      game.setDirection({ x: -1, y: 0 });
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault();
      game.setDirection({ x: 1, y: 0 });
      break;
    case ' ':
      e.preventDefault();
      if (!game.hasStarted()) {
        game.start();
      } else {
        game.togglePause();
      }
      break;
    case 'r':
    case 'R':
      e.preventDefault();
      game.restart();
      break;
  }
});