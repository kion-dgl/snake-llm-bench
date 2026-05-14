type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;

class Game {
  private snake: Cell[] = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  private dir: Direction = { x: 1, y: 0 };
  private pendingDir: Direction | null = null;
  private food: Cell = this.randomCell();
  private score: number = 0;
  private high: number = parseInt(localStorage.getItem('snake.high') || '0', 10);
  private tickMs: number = INITIAL_TICK_MS;
  private alive: boolean = false;
  private started: boolean = false;
  private paused: boolean = true;

  constructor(private canvas: HTMLCanvasElement, private scoreEl: HTMLElement, private highEl: HTMLElement) {
    this.highEl.textContent = `High: ${this.high}`;
    window.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  start(): void {
    if (!this.started) {
      this.score = 0;
      this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      this.dir = { x: 1, y: 0 };
      this.food = this.randomCell();
      this.alive = true;
      this.paused = false;
      this.scoreEl.textContent = `Score: ${this.score}`;
    }
    if (!this.paused) {
      this.tick();
    }
  }

  togglePause(): void {
    this.paused = !this.paused;
    if (this.paused && !this.started) {
      this.canvas.getContext('2d')!.fillText('Press Space to start', 100, 200);
    } else if (this.paused) {
      this.canvas.getContext('2d')!.fillText('Paused', 150, 200);
    }
  }

  restart(): void {
    this.start();
  }

  private tick(): void {
    if (!this.alive || this.paused) return;

    const head: Cell = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || this.snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
      this.alive = false;
      this.canvas.getContext('2d')!.fillText('Game Over — press R to restart', 50, 200);
      return;
    }

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.snake.push({ x: head.x, y: head.y });
      this.food = this.randomCell();
      if (this.score % SPEEDUP_EVERY === 0) {
        this.tickMs = Math.max(this.tickMs - SPEEDUP_DELTA, MIN_TICK_MS);
      }
    } else {
      this.snake.pop();
      this.snake.unshift(head);
    }

    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
    ctx.fillStyle = '#7ed957';
    ctx.fillRect(this.snake[0].x * CELL, this.snake[0].y * CELL, CELL, CELL);
    for (let i = 1; i < this.snake.length; i++) {
      ctx.fillStyle = '#3aa635';
      ctx.fillRect(this.snake[i].x * CELL, this.snake[i].y * CELL, CELL, CELL);
    }

    setTimeout(() => this.tick(), this.tickMs);
  }

  private randomCell(): Cell {
    let cell: Cell;
    do {
      cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (this.snake.some(segment => segment.x === cell.x && segment.y === cell.y));
    return cell;
  }

  private handleKeydown(e: KeyboardEvent): void {
    e.preventDefault();
    const key = e.key.toLowerCase();
    if (key === 'space') {
      this.togglePause();
    } else if (key === 'r') {
      this.restart();
    } else if (['w', 'a', 's', 'd'].includes(key)) {
      const newDir: Direction | null = key === 'w' ? { x: 0, y: -1 } :
        key === 'a' ? { x: -1, y: 0 } :
        key === 's' ? { x: 0, y: 1 } :
        { x: 1, y: 0 };
      if (this.pendingDir !== null && this.pendingDir.x * newDir.x + this.pendingDir.y * newDir.y !== 0) {
        return;
      }
      this.pendingDir = newDir;
    }
  }
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score')!;
const highEl = document.getElementById('high')!;
new Game(canvas, scoreEl, highEl);