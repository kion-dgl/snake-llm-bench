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

  // Game State
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
  private intervalId: number | undefined; // Added to manage the interval

  constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', '2d') as CanvasRenderingContext2D; // Assert type
    this.scoreEl = scoreEl;
    this.highEl = highEl;

    // Initial State Setup
    this.snake = [
      { x: 10, y: 10 }, // Head
      { x: 9, y: 10 }, // Body 1
      { x: 8, y: 10 }  // Body 2
    ];
    this.dir = { x: 1, y: 0 }; // Initial direction: Right
    this.pendingDir = null;
    this.food = { x: 0, y: 0 }; // Placeholder
    this.score = 0;
    this.high = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true; // Starts paused

    this.loadHighScore();
    this.setupListeners();
    this.draw();
  }

  private loadHighScore(): void {
    const storedHigh = localStorage.getItem('snake.high');
    if (storedHigh !== null) {
      this.high = parseInt(storedHigh, 10);
    }
    this.highEl.textContent = `High: ${this.high}`;
  }

  private saveHighScore(): void {
    if (this.score > this.high) {
      this.high = this.score;
      localStorage.setItem('snake.high', this.high.toString());
      this.highEl.textContent = `High: ${this.high}`;
    }
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.handleInput.bind(this));
  }

  private handleInput(e: KeyboardEvent): void {
    const newDir = this.getNewDirection(e);
    if (newDir) {
      // Reverse-into-self prevention
      if (newDir.x !== -this.dir.x || newDir.y !== -this.dir.y) {
        this.pendingDir = newDir;
      }
    }
  }

  private getNewDirection(e: KeyboardEvent): Direction | null {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        return { x: 0, y: -1 };
      case 'ArrowDown':
      case 's':
        return { x: 0, y: 1 };
      case 'ArrowLeft':
      case 'a':
        return { x: -1, y: 0 };
      case 'ArrowRight':
      case 'd':
        return { x: 1, y: 0 };
      case ' ':
        if (!this.started) {
          this.start();
        } else {
          this.togglePause();
        }
        return null; // Space handled separately
      case 'r':
        this.restart();
        return null;
      default:
        return null;
    }
  }

  public start(): void {
    if (!this.started) {
      this.started = true;
      this.paused = false;
      this.run(); // Start the game loop
    }
  }

  public togglePause(): void {
    if (!this.started) return;
    this.paused = !this.paused;
    if (this.paused) {
      // Pause the interval if it's running
      clearInterval(this.intervalId!);
    } else {
      // Resume the interval
      this.run();
    }
    this.draw();
  }

  public restart(): void {
    // Full reset to initial state, paused-before-start
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null;
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;

    this.loadHighScore();
    this.draw();
  }

  private placeFood(): void {
    let newFood: Cell;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID)
      };
    } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    this.food = newFood;
  }

  private tick(): void {
    if (!this.alive) return;

    // 1. Update Direction
    if (this.pendingDir) {
      this.dir = this.pendingDir;
      this.pendingDir = null;
    }

    // 2. Calculate New Head Position
    const head = this.snake[0];
    const newHead: Cell = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    // 3. Check Game Over Conditions (Walls)
    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
      this.alive = false;
      this.gameOver();
      return;
    }

    // 4. Check Self Collision (excluding tail chase)
    // Check against body segments (excluding the tail, which is allowed to be chased)
    for (let i = 1; i < this.snake.length - 1; i++) {
      if (newHead.x === this.snake[i].x && newHead.y === this.snake[i].y) {
        this.alive = false;
        this.gameOver();
        return;
      }
    }

    // 5. Move Snake
    this.snake.unshift(newHead);

    // 6. Check Food Consumption
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.placeFood();
      this.updateSpeed();
    } else {
      // If no food eaten, remove the tail
      this.snake.pop();
    }
  }

  private updateSpeed(): void {
    const newTickMs = Math.max(MIN_TICK_MS, INITIAL_TICK_MS - Math.floor(this.score / SPEEDUP_EVERY) * SPEEDUP_DELTA);
    if (newTickMs !== this.tickMs) {
      this.tickMs = newTickMs;
      // Restart the interval with the new speed
      clearInterval(this.intervalId!);
      this.intervalId = setInterval(this.tick, this.tickMs);
    }
  }

  private gameOver(): void {
    this.started = false;
    this.paused = true;
    if (this.intervalId !== undefined) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
    }
    this.draw(); // Final draw
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Food
    this.ctx.fillStyle = '#c0392b';
    this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

    // Draw Snake
    this.snake.forEach((segment, index) => {
      if (index === 0) {
        // Head
        this.ctx.fillStyle = '#7ed957'; // Brighter green
      } else {
        // Body
        this.ctx.fillStyle = '#3aa635'; // Darker green
      }
      this.ctx.fillRect(segment.x * CELL, segment.y * CELL, CELL, CELL);
    });

    // Draw Pause/Game Over Overlay
    if (!this.started) {
      this.drawPauseOverlay();
    } else if (!this.alive) {
      this.drawGameOverOverlay();
    } else if (this.paused) {
      this.drawPausedOverlay();
    }
  }

  private drawPauseOverlay(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Paused', centerX, centerY);
  }

  private drawGameOverOverlay(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over — press R to restart', centerX, centerY);
  }

  public run(): void {
    if (!this.started) return;
    this.intervalId = setInterval(this.tick, this.tickMs);
  }
}

// --- Initialization ---

const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score') as HTMLElement;
const highEl = document.getElementById('high') as HTMLElement;

const game = new Game(canvas, scoreEl, highEl);

// Start the game loop immediately (it will be paused by default)
game.run();