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
    this.updateScoreDom();
  }

  /** Begin the game on first Space press: started=true, paused=false, start the tick interval. No-op if already started. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.paused = false;
    this.alive = true;
    this.tickMs = INITIAL_TICK_MS;
    this.timer = window.setInterval(() => this.step(), this.tickMs);
  }

  /** Toggle pause on/off during a running game. If not yet started, behave like start(). When unpausing, re-arm the interval. When pausing, clear it. */
  togglePause(): void {
    if (!this.started) {
      this.start();
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.timer = window.setInterval(() => this.step(), this.tickMs);
    } else {
      this.paused = true;
      if (this.timer) clearInterval(this.timer);
    }
    this.render();
  }

  /** Full reset to the initial paused-before-start state, then render. Clears the tick interval if running. */
  restart(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.resetState();
    this.render();
    this.updateScoreDom();
  }

  /** Apply pendingDir if it is not the opposite of the current dir, then move the snake one cell, detect wall/self collisions, handle food, and render. Called once per tick interval. */
  private step(): void {
    if (this.paused || !this.alive) return;

    if (this.pendingDir) {
      const opposite = { x: -this.dir.x, y: -this.dir.y };
      if (this.pendingDir.x !== opposite.x || this.pendingDir.y !== opposite.y) {
        this.dir = this.pendingDir;
      }
      this.pendingDir = null;
    }

    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    let eating = head.x === this.food.x && head.y === this.food.y;

    if (!this.wouldCollide(head, eating)) {
      this.snake.unshift(head);
      if (eating) {
        this.score++;
        if (this.score > this.high) {
          this.high = this.score;
          localStorage.setItem(HIGH_KEY, this.high.toString());
        }
        this.updateScoreDom();
        if (this.score % SPEEDUP_EVERY === 0) {
          this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
          if (this.timer) {
            clearInterval(this.timer);
            this.timer = window.setInterval(() => this.step(), this.tickMs);
          }
        }
        this.spawnFood();
      } else {
        this.snake.pop();
      }
    } else {
      this.alive = false;
      if (this.timer) clearInterval(this.timer);
    }
    this.render();
  }

  /** Set snake (length 3 at (10,10), (9,10), (8,10) moving right), reset dir/pendingDir/score/tickMs/alive/started/paused, spawn food. */
  private resetState(): void {
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null;
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = false;
    this.spawnFood();
  }

  /** Pick a random Cell that is not currently occupied by the snake. If no empty cell, treat as win (alive=false, render). */
  private spawnFood(): void {
    const cells: Cell[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        cells.push({ x, y });
      }
    }
    const available = cells.filter(c => !this.snake.some(s => s.x === c.x && s.y === c.y));
    if (available.length === 0) {
      this.alive = false;
    } else {
      this.food = available[Math.floor(Math.random() * available.length)];
    }
  }

  /** Update the score and high DOM elements with "Score: N" / "High: N". */
  private updateScoreDom(): void {
    this.scoreEl.textContent = `Score: ${this.score}`;
    this.highEl.textContent = `High: ${this.high}`;
  }

  /** Clear and redraw the board: black bg, food, snake body, snake head (distinct color). On not-yet-started, draw centered "Press Space to start". On paused (after first start), draw centered "Paused". On game-over, draw centered "Game Over — press R to restart". Text 20px sans-serif white, centered. */
  private render(): void {
    this.ctx.fillStyle = COLOR_BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.started && !this.alive) {
      this.drawOverlay("Game Over — press R to restart");
      return;
    }
    if (this.started && this.paused) {
      this.drawOverlay("Paused");
      return;
    }
    if (!this.started) {
      this.drawOverlay("Press Space to start");
      return;
    }

    this.ctx.fillStyle = COLOR_FOOD;
    this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL - 1, CELL - 1);

    this.snake.forEach((part, i) => {
      this.ctx.fillStyle = i === 0 ? COLOR_HEAD : COLOR_BODY;
      this.ctx.fillRect(part.x * CELL, part.y * CELL, CELL - 1, CELL - 1);
    });
  }

  private drawOverlay(text: string): void {
    this.ctx.fillStyle = COLOR_TEXT;
    this.ctx.font = "20px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
  }

  /** True iff `cell` lies inside the grid AND is not occupied by `snake` (excluding the soon-to-vacate tail when not growing). */
  private wouldCollide(cell: Cell, willGrow: boolean): boolean {
    if (cell.x < 0 || cell.x >= GRID || cell.y < 0 || cell.y >= GRID) return true;
    const tailIndex = willGrow ? this.snake.length : this.snake.length - 1;
    for (let i = 0; i < tailIndex; i++) {
      if (this.snake[i].x === cell.x && this.snake[i].y === cell.y) return true;
    }
    return false;
  }

  public setPendingDir(d: Direction): void {
    this.pendingDir = d;
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const highEl = document.getElementById("high") as HTMLElement;

const game = new Game(canvas, scoreEl, highEl);

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  let handled = true;

  if (key === "arrowup" || key === "w") {
    game.setPendingDir({ x: 0, y: -1 });
  } else if (key === "arrowdown" || key === "s") {
    game.setPendingDir({ x: 0, y: 1 });
  } else if (key === "arrowleft" || key === "a") {
    game.setPendingDir({ x: -1, y: 0 });
  } else if (key === "arrowright" || key === "d") {
    game.setPendingDir({ x: 1, y: 0 });
  } else if (key === " ") {
    game.togglePause();
  } else if (key === "r") {
    game.restart();
  } else {
    handled = false;
  }

  if (handled) e.preventDefault();
});