type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;       // apples
const SPEEDUP_DELTA = 10;      // ms

const DIR_UP: Direction = { x: 0, y: -1 };
const DIR_DOWN: Direction = { x: 0, y: 1 };
const DIR_LEFT: Direction = { x: -1, y: 0 };
const DIR_RIGHT: Direction = { x: 1, y: 0 };

class Game {
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

  private ctx: CanvasRenderingContext2D;
  private scoreEl: HTMLElement;
  private highEl: HTMLElement;
  private tickInterval: number | null;

  constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
    this.ctx = canvas.getContext('2d')!;
    this.scoreEl = scoreEl;
    this.highEl = highEl;

    // Initial state
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = DIR_RIGHT;
    this.pendingDir = null;
    this.food = this.spawnFood();
    this.score = 0;
    this.high = parseInt(localStorage.getItem('snake.high') || '0', 10);
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;
    this.tickInterval = null;

    this.updateScore();
    this.draw();
  }

  private spawnFood(): Cell {
    const positions: Cell[] = [];
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        positions.push({ x, y });
      }
    }

    const available = positions.filter(pos => 
      !this.snake.some(segment => segment.x === pos.x && segment.y === pos.y)
    );

    if (available.length === 0) {
      // Shouldn't happen unless snake fills entire grid
      return { x: 0, y: 0 };
    }

    const index = Math.floor(Math.random() * available.length);
    return available[index];
  }

  private updateScore(): void {
    this.scoreEl.textContent = `Score: ${this.score}`;
    this.highEl.textContent = `High: ${this.high}`;
  }

  private saveHigh(): void {
    if (this.score > this.high) {
      this.high = this.score;
      localStorage.setItem('snake.high', String(this.high));
      this.updateScore();
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GRID * CELL, GRID * CELL);

    // Draw snake
    this.snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
      ctx.fillRect(segment.x * CELL, segment.y * CELL, CELL, CELL);
    });

    // Draw food
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

    // Draw overlay text
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!this.started && this.paused) {
      ctx.fillText('Press Space to start', GRID * CELL / 2, GRID * CELL / 2);
    } else if (this.paused) {
      ctx.fillText('Paused', GRID * CELL / 2, GRID * CELL / 2);
    } else if (!this.alive) {
      ctx.fillText('Game Over — press R to restart', GRID * CELL / 2, GRID * CELL / 2);
    }
  }

  private tick(): void {
    if (this.paused || !this.alive) return;

    if (this.pendingDir) {
      // Prevent reverse movement
      if (
        this.pendingDir.x !== -this.dir.x ||
        this.pendingDir.y !== -this.dir.y
      ) {
        this.dir = this.pendingDir;
      }
      this.pendingDir = null;
    }

    const head = this.snake[0];
    const newHead = {
      x: head.x + this.dir.x,
      y: head.y + this.dir.y
    };

    // Check wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID ||
      newHead.y < 0 ||
      newHead.y >= GRID
    ) {
      this.alive = false;
      this.saveHigh();
      this.draw();
      return;
    }

    // Check self collision (but allow moving into tail's current position)
    const collision = this.snake.slice(0, -1).some(
      segment => segment.x === newHead.x && segment.y === newHead.y
    );
    if (collision) {
      this.alive = false;
      this.saveHigh();
      this.draw();
      return;
    }

    this.snake.unshift(newHead);

    // Check food
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.updateScore();

      // Speed up every 5 apples
      if (this.score % SPEEDUP_EVERY === 0) {
        this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
          this.tickInterval = setInterval(() => this.tick(), this.tickMs);
        }
      }

      this.food = this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.paused = false;
    this.tickInterval = window.setInterval(() => this.tick(), this.tickMs);
    this.draw();
  }

  togglePause(): void {
    if (!this.started || !this.alive) return;
    this.paused = !this.paused;
    this.draw();
  }

  restart(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = DIR_RIGHT;
    this.pendingDir = null;
    this.food = this.spawnFood();
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;

    this.updateScore();
    this.draw();
  }

  setDirection(newDir: Direction): void {
    this.pendingDir = newDir;
  }
}

// Setup
const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score')!;
const highEl = document.getElementById('high')!;

const game = new Game(canvas, scoreEl, highEl);

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      e.preventDefault();
      game.setDirection(DIR_UP);
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      e.preventDefault();
      game.setDirection(DIR_DOWN);
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault();
      game.setDirection(DIR_LEFT);
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault();
      game.setDirection(DIR_RIGHT);
      break;
    case ' ':
      e.preventDefault();
      if (!game.started) {
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