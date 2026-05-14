type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;

const COLOR_BG = "#000";
const COLOR_BODY = "#3aa635";
const COLOR_HEAD = "#7ed957";
const COLOR_FOOD = "#c0392b";
const COLOR_TEXT = "#fff";

const HIGH_KEY = "snake.high";

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scoreEl: HTMLElement;
  private highEl: HTMLElement;

  private snake!: Cell[];
  private dir!: Direction;
  private pendingDir: Direction | null = null;
  private food!: Cell;
  private score!: number;
  private high!: number;
  private tickMs!: number;
  private alive!: boolean;
  private started!: boolean;
  private paused!: boolean;
  private timer: number | null = null;

  constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.scoreEl = scoreEl;
    this.highEl = highEl;
    this.high = Number(localStorage.getItem(HIGH_KEY)) || 0;
    this.resetState();
    this.render();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.paused = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.step(), this.tickMs);
  }

  togglePause(): void {
    if (!this.started) {
      this.start();
      return;
    }
    this.paused = !this.paused;
    if (this.paused) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    } else {
      if (this.timer) clearInterval(this.timer);
      this.timer = window.setInterval(() => this.step(), this.tickMs);
    }
    this.render();
  }

  restart(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.resetState();
    this.render();
  }

  private step(): void {
    if (!this.alive || this.paused) return;
    if (this.pendingDir) {
      if (!(this.pendingDir.x === -this.dir.x && this.pendingDir.y === -this.dir.y)) {
        this.dir = this.pendingDir;
      }
      this.pendingDir = null;
    }
    const head = this.snake[0];
    const newHead: Cell = { x: head.x + this.dir.x, y: head.y + this.dir.y };
    const willGrow = newHead.x === this.food.x && newHead.y === this.food.y;
    if (this.wouldCollide(newHead, willGrow)) {
      this.alive = false;
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      this.render();
      return;
    }
    this.snake.unshift(newHead);
    if (willGrow) {
      this.score++;
      if (this.score > this.high) {
        this.high = this.score;
        localStorage.setItem(HIGH_KEY, String(this.high));
      }
      this.updateScoreDom();
      this.spawnFood();
      if (this.score % SPEEDUP_EVERY === 0) {
        this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        this.timer = window.setInterval(() => this.step(), this.tickMs);
      }
    } else {
      this.snake.pop();
    }
    this.render();
  }

  private resetState(): void {
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null;
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;
    this.spawnFood();
    this.updateScoreDom();
  }

  private spawnFood(): void {
    const occupied = new Set(this.snake.map(c => `${c.x},${c.y}`));
    if (occupied.size >= GRID * GRID) {
      this.alive = false;
      this.render();
      return;
    }
    let cell: Cell;
    do {
      cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (occupied.has(`${cell.x},${cell.y}`));
    this.food = cell;
  }

  private updateScoreDom(): void {
    this.scoreEl.textContent = `Score: ${this.score}`;
    this.highEl.textContent = `High: ${this.high}`;
  }

  private render(): void {
    this.ctx.fillStyle = COLOR_BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = COLOR_FOOD;
    this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
    this.ctx.fillStyle = COLOR_BODY;
    for (let i = 1; i < this.snake.length; i++) {
      const c = this.snake[i];
      this.ctx.fillRect(c.x * CELL, c.y * CELL, CELL, CELL);
    }
    if (this.snake.length > 0) {
      const head = this.snake[0];
      this.ctx.fillStyle = COLOR_HEAD;
      this.ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);
    }
    this.ctx.fillStyle = COLOR_TEXT;
    this.ctx.font = "20px sans-serif";
    this.ctx.textAlign = "center";
    if (!this.started) {
      this.ctx.fillText("Press Space to start", this.canvas.width / 2, this.canvas.height / 2);
    } else if (this.paused) {
      this.ctx.fillText("Paused", this.canvas.width / 2, this.canvas.height / 2);
    } else if (!this.alive) {
      this.ctx.fillText("Game Over — press R to restart", this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  private wouldCollide(cell: Cell, willGrow: boolean): boolean {
    if (cell.x < 0 || cell.x >= GRID || cell.y < 0 || cell.y >= GRID) return true;
    const tail = this.snake[this.snake.length - 1];
    for (let i = 0; i < this.snake.length - (willGrow ? 0 : 1); i++) {
      const c = this.snake[i];
      if (c.x === cell.x && c.y === cell.y) return true;
    }
    return false;
  }

  setPendingDir(d: Direction): void {
    this.pendingDir = d;
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const highEl = document.getElementById("high") as HTMLElement;
const game = new Game(canvas, scoreEl, highEl);

window.addEventListener("keydown", (e: KeyboardEvent) => {
  let dir: Direction | null = null;
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dir = { x: 0, y: -1 };
  else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dir = { x: 0, y: 1 };
  else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dir = { x: -1, y: 0 };
  else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dir = { x: 1, y: 0 };
  else if (e.key === " ") { game.togglePause(); e.preventDefault(); return; }
  else if (e.key === "r" || e.key === "R") { game.restart(); e.preventDefault(); return; }
  if (dir) {
    game.setPendingDir(dir);
    e.preventDefault();
  }
});