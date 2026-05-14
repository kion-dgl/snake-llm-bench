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
    const raw = localStorage.getItem(HIGH_KEY);
    this.high = raw !== null ? (Number(raw) || 0) : 0;
    this.resetState();
    this.render();
  }

  /** Begin the game on first Space press: started=true, paused=false, start the tick interval. No-op if already started. */
  start(): void {
    // TODO: implement per docstring above
    if (this.started) return;
    this.started = true;
    this.paused = false;
    if (this.alive) {
      if (this.timer !== null) {
        clearInterval(this.timer);
      }
      this.timer = window.setInterval(() => this.step(), this.tickMs);
    }
    this.render();
  }

  /** Toggle pause on/off during a running game. If not yet started, behave like start(). When unpausing, re-arm the interval. When pausing, clear it. */
  togglePause(): void {
    // TODO: implement per docstring above
    if (!this.started) {
      this.start();
      return;
    }
    if (this.paused) {
      // unpause
      this.paused = false;
      if (this.alive) {
        if (this.timer !== null) {
          clearInterval(this.timer);
        }
        this.timer = window.setInterval(() => this.step(), this.tickMs);
      }
    } else {
      // pause
      this.paused = true;
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
    this.render();
  }

  /** Full reset to the initial paused-before-start state, then render. Clears the tick interval if running. */
  restart(): void {
    // TODO: implement per docstring above
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.resetState();
    this.render();
  }

  /** Apply pendingDir if it is not the opposite of the current dir, then move the snake one cell, detect wall/self collisions, handle food, and render. Called once per tick interval. */
  private step(): void {
    // TODO: implement per docstring above. On food: grow (don't pop tail), score++, update high if needed, spawn new food, and after every SPEEDUP_EVERY foods reduce tickMs by SPEEDUP_DELTA (floor MIN_TICK_MS) by rearming the interval. On wall/self collision: set alive=false, clear interval, render game-over overlay.
    if (!this.alive || this.paused) return;

    // apply pending dir if not opposite
    if (this.pendingDir) {
      const p = this.pendingDir;
      if (!(p.x + this.dir.x === 0 && p.y + this.dir.y === 0)) {
        this.dir = { x: p.x, y: p.y };
      }
      this.pendingDir = null;
    }

    const head = this.snake[0];
    const newHead: Cell = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    const willGrow = newHead.x === this.food.x && newHead.y === this.food.y;

    // check collision (wouldCollide returns true if safe)
    if (!this.wouldCollide(newHead, willGrow)) {
      // collision occurred
      this.alive = false;
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.render();
      return;
    }

    // move snake
    this.snake.unshift(newHead);
    if (!willGrow) {
      this.snake.pop();
    } else {
      // ate food
      this.score++;
      if (this.score > this.high) {
        this.high = this.score;
        try {
          localStorage.setItem(HIGH_KEY, String(this.high));
        } catch {
          // ignore storage errors
        }
      }
      this.spawnFood();
      // speedup after every SPEEDUP_EVERY foods
      if (this.score % SPEEDUP_EVERY === 0) {
        const oldTimerActive = this.timer !== null;
        this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
        if (oldTimerActive && this.alive && !this.paused) {
          if (this.timer !== null) {
            clearInterval(this.timer);
          }
          this.timer = window.setInterval(() => this.step(), this.tickMs);
        }
      }
      this.updateScoreDom();
    }

    this.render();
  }

  /** Set snake (length 3 at (10,10), (9,10), (8,10) moving right), reset dir/pendingDir/score/tickMs/alive/started/paused, spawn food. */
  private resetState(): void {
    // TODO: implement per docstring above
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
    this.paused = false;
    this.spawnFood();
    this.updateScoreDom();
  }

  /** Pick a random Cell that is not currently occupied by the snake. If no empty cell, treat as win (alive=false, render). */
  private spawnFood(): void {
    // TODO: implement per docstring above
    const occupied = new Set<string>();
    for (const s of this.snake) {
      occupied.add(`${s.x},${s.y}`);
    }
    const empties: Cell[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) empties.push({ x, y });
      }
    }
    if (empties.length === 0) {
      // win
      this.alive = false;
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.render();
      return;
    }
    const idx = Math.floor(Math.random() * empties.length);
    this.food = empties[idx];
  }

  /** Update the score and high DOM elements with "Score: N" / "High: N". */
  private updateScoreDom(): void {
    // TODO: implement per docstring above
    this.scoreEl.textContent = `Score: ${this.score}`;
    this.highEl.textContent = `High: ${this.high}`;
  }

  /** Clear and redraw the board: black bg, food, snake body, snake head (distinct color). On not-yet-started, draw centered "Press Space to start". On paused (after first start), draw centered "Paused". On game-over, draw centered "Game Over — press R to restart". Text 20px sans-serif white, centered. */
  private render(): void {
    // TODO: implement per docstring above
    const ctx = this.ctx;
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // draw food
    ctx.fillStyle = COLOR_FOOD;
    ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

    // draw body (excluding head)
    for (let i = 1; i < this.snake.length; i++) {
      const s = this.snake[i];
      ctx.fillStyle = COLOR_BODY;
      ctx.fillRect(s.x * CELL, s.y * CELL, CELL, CELL);
    }

    // draw head
    const head = this.snake[0];
    ctx.fillStyle = COLOR_HEAD;
    ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);

    // overlay text states
    if (!this.started) {
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Press Space to start", this.canvas.width / 2, this.canvas.height / 2);
    } else if (!this.alive) {
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Game Over — press R to restart", this.canvas.width / 2, this.canvas.height / 2);
    } else if (this.paused) {
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Paused", this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  /** True iff `cell` lies inside the grid AND is not occupied by `snake` (excluding the soon-to-vacate tail when not growing). */
  private wouldCollide(cell: Cell, willGrow: boolean): boolean {
    // TODO: implement per docstring above
    if (cell.x < 0 || cell.x >= GRID || cell.y < 0 || cell.y >= GRID) return false;
    const len = this.snake.length;
    const tailIndexToExclude = willGrow ? -1 : len - 1;
    for (let i = 0; i < len; i++) {
      if (i === tailIndexToExclude) continue;
      const s = this.snake[i];
      if (s.x === cell.x && s.y === cell.y) return false;
    }
    return true;
  }

  // Small allowed public helper to accept pending directions from external key handler.
  setPendingDir(d: Direction): void {
    this.pendingDir = d;
  }
}

// ---- top-level wiring (fill in) ----
// TODO: get the canvas, score, high elements from the DOM by id ("game", "score", "high"); cast to HTMLCanvasElement / HTMLElement
// TODO: create `const game = new Game(canvas, scoreEl, highEl);`
// TODO: install a `keydown` listener on `window` that maps arrow keys + WASD to direction vectors, Space to game.togglePause(), R to game.restart(). Call e.preventDefault() on handled keys. For direction presses, set game's pending direction. (Hint: you may need a small public method on Game to accept a pending direction, OR you can re-architect minimally — but keep the three public methods above unchanged.)

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
const scoreEl = document.getElementById("score") as HTMLElement | null;
const highEl = document.getElementById("high") as HTMLElement | null;

if (!canvas || !scoreEl || !highEl) {
  throw new Error("Missing DOM elements");
}

const game = new Game(canvas, scoreEl, highEl);

window.addEventListener("keydown", (e: KeyboardEvent) => {
  let handled = false;
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      game.setPendingDir({ x: 0, y: -1 });
      handled = true;
      break;
    case "ArrowDown":
    case "KeyS":
      game.setPendingDir({ x: 0, y: 1 });
      handled = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      game.setPendingDir({ x: -1, y: 0 });
      handled = true;
      break;
    case "ArrowRight":
    case "KeyD":
      game.setPendingDir({ x: 1, y: 0 });
      handled = true;
      break;
    case "Space":
      game.togglePause();
      handled = true;
      break;
    case "KeyR":
      game.restart();
      handled = true;
      break;
    default:
      break;
  }
  if (handled) e.preventDefault();
});