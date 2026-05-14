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
    // TODO: load high score from localStorage key HIG_KEY (parse Number, default 0) and call this.resetState() and this.render()
    this.high = parseInt(localStorage.getItem(HIGH_KEY) || "0");
    this.resetState();
    this.render();
  }

  /** Begin the game on first Space press: started=true, paused=false, start the tick interval. No-op if already started. */
  start(): void {
    if (!this.started) {
      this.started = true;
      this.paused = false;
      this.timer = INITIAL_TICK_MS;
      this.startTimer();
    }
  }

  /** Toggle pause on/off during a running game. If not yet started, behave like start(). When unpausing, re-arm the interval. When pausing, clear it. */
  togglePause(): void {
    if (!this.started) return;

    if (this.paused) {
      this.timer = null;
      this.paused = false;
      this.startTimer();
    } else {
      this.timer = null;
      this.paused = true;
    }
  }

  /** Full reset to the initial paused-before-start state, then render. Clears the tick interval if running. */
  restart(): void {
    this.stopTimer();
    this.resetState();
    this.render();
  }

  /** Apply pendingDir if it is not the opposite of the current dir, then move the snake one cell, detect wall/self collisions, handle food, and render. Called once per tick interval. */
  private step(): void {
    if (!this.alive) return;

    let newDir = this.dir;
    if (this.pendingDir) {
      const dx = this.pendingDir.x - this.dir.x;
      const dy = this.pendingDir.y - this.dir.y;
      // Check if the pending direction is valid (not 180 degree turn)
      if (dx !== 0 || dy !== 0) {
        newDir = this.pendingDir;
      }
      this.pendingDir = null;
    }
    this.dir = newDir;

    const head = this.snake[0];
    const newHead: Cell = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    // 1. Check collisions
    if (this.wouldCollide(newHead, false)) {
      this.alive = false;
      this.stopTimer();
      this.render(); // Render game over state
      return;
    }

    // 2. Check food
    let ateFood = false;
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.updateScoreDom();
      this.spawnFood();
      ateFood = true;
    }

    // 3. Move snake
    this.snake.unshift(newHead);

    if (!ateFood) {
      this.snake.pop();
    }

    // 4. Speed adjustment
    if (ateFood) {
      if (this.score % SPEEDUP_EVERY === 0) {
        this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
        this.startTimer(); // Re-arm the interval with the new speed
      }
    }

    this.render();
  }

  /** Set snake (length 3 at (10,10), (9,10), (8,10) moving right), reset dir/pendingDir/score/tickMs/alive/started/paused, spawn food. */
  private resetState(): void {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = { x: 1, y: 0 }; // Right
    this.pendingDir = null;
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;
    this.timer = null;
    this.spawnFood();
  }

  /** Pick a random Cell that is not currently occupied by the snake. If no empty cell, treat as win (alive=false, render). */
  private spawnFood(): void {
    let newFood: Cell;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID)
      };
    } while (this.snake.some(cell => cell.x === newFood.x && cell.y === newFood.y));
    this.food = newFood;
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

    this.drawFood();
    this.drawSnake();

    if (!this.started) {
      this.drawCenteredText("Press Space to start", this.canvas.width / 2, this.canvas.height / 2);
    } else if (this.paused) {
      this.drawCenteredText("Paused", this.canvas.width / 2, this.canvas.height / 2);
    } else if (!this.alive) {
      this.drawCenteredText("Game Over — press R to restart", this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  /** True iff `cell` lies inside the grid AND is not occupied by `snake` (excluding the soon-to-vacate tail when not growing). */
  private wouldCollide(cell: Cell, willGrow: boolean): boolean {
    // Check boundaries
    if (cell.x < 0 || cell.x >= GRID || cell.y < 0 || cell.y >= GRID) {
      return true; // Wall collision
    }

    // Check self collision (excluding the tail if growing)
    for (const snakeCell of this.snake) {
      if (snakeCell.x === cell.x && snakeCell.y === cell.y) {
        // If growing, the tail position is about to be vacated, so we ignore collision with the tail.
        if (willGrow && snakeCell === this.snake[this.snake.length - 1]) {
          continue;
        }
        return true; // Self collision
      }
    }
    return false;
  }

  private drawFood(): void {
    this.ctx.fillStyle = COLOR_FOOD;
    this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
  }

  private drawSnake(): void {
    this.snake.forEach((cell, index) => {
      if (index === 0) {
        // Head
        this.ctx.fillStyle = COLOR_HEAD;
      } else {
        // Body
        this.ctx.fillStyle = COLOR_BODY;
      }
      this.ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
    });
  }

  private drawCenteredText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = COLOR_TEXT;
    this.ctx.font = "20px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, x, y);
  }

  private startTimer(): void {
    if (this.timer === null) {
      this.timer = this.tickMs;
      this.timerId = setInterval(() => this.step(), this.tickMs);
    }
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timerId);
      this.timer = null;
    }
  }
}

// ---- top-level wiring (fill in) ----
const canvas = document.getElementById("game") as HTMLCanvasElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const highEl = document.getElementById("high") as HTMLElement;

const game = new Game(canvas, scoreEl, highEl);

// Input handling
const handleKeyDown = (e: KeyboardEvent) => {
  const key = e.key.toLowerCase();

  switch (key) {
    case 'arrowup':
    case 'w':
      game.pendingDir = { x: 0, y: -1 };
      e.preventDefault();
      break;
    case 'arrowdown':
    case 's':
      game.pendingDir = { x: 0, y: 1 };
      e.preventDefault();
      break;
    case 'arrowright':
    case 'd':
      game.pendingDir = { x: 1, y: 0 };
      e.preventDefault();
      break;
    case 'arrowleft':
    case 'a':
      game.pendingDir = { x: -1, y: 0 };
      e.preventDefault();
      break;
    case ' ': // Space to start/pause
      game.togglePause();
      e.preventDefault();
      break;
    case 'r': // R to restart
      game.restart();
      e.preventDefault();
      break;
  }
};

window.addEventListener('keydown', handleKeyDown);