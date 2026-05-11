type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;

class Game {
  private snake: Cell[];
  private dir: Direction;
  private pendingDir: Direction | null = null;
  private food: Cell;
  private score: number = 0;
  private high: number;
  private tickMs: number = INITIAL_TICK_MS;
  private alive: boolean = true;
  private started: boolean = false;
  private paused: boolean = true;
  private interval: number | null = null;
  private ctx: CanvasRenderingContext2D;
  private scoreEl: HTMLElement;
  private highEl: HTMLElement;

  constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
    this.ctx = canvas.getContext('2d')!;
    this.scoreEl = scoreEl;
    this.highEl = highEl;
    const saved = localStorage.getItem('snake.high');
    this.high = saved ? parseInt(saved, 10) : 0;
    this.highEl.textContent = `High: ${this.high}`;
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.dir = { x: 1, y: 0 };
    this.food = this.placeFood();
    this.draw();
  }

  private placeFood(): Cell {
    let pos: Cell;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  private draw(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, 400, 400);

    this.ctx.fillStyle = '#3aa635';
    for (let i = 1; i < this.snake.length; i++) {
      const s = this.snake[i];
      this.ctx.fillRect(s.x * CELL, s.y * CELL, CELL, CELL);
    }
    const head = this.snake[0];
    this.ctx.fillStyle = '#7ed957';
    this.ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);

    this.ctx.fillStyle = '#c0392b';
    this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

    if (!this.started && this.paused) {
      this.drawText('Press Space to start');
    } else if (this.paused && this.started) {
      this.drawText('Paused');
    } else if (!this.alive) {
      this.drawText('Game Over — press R to restart');
    }
  }

  private drawText(text: string): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, 200, 200);
  }

  private updateScore(): void {
    this.scoreEl.textContent = `Score: ${this.score}`;
    if (this.score > this.high) {
      this.high = this.score;
      this.highEl.textContent = `High: ${this.high}`;
      localStorage.setItem('snake.high', this.high.toString());
    }
  }

  private tick = (): void => {
    if (!this.alive || this.paused) return;

    if (this.pendingDir) {
      this.dir = this.pendingDir;
      this.pendingDir = null;
    }

    const head = this.snake[0];
    const newHead: Cell = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
      this.gameOver();
      return;
    }

    const hitBody = this.snake.some((s, i) => {
      if (i === this.snake.length - 1) return false;
      return s.x === newHead.x && s.y === newHead.y;
    });
    if (hitBody) {
      this.gameOver();
      return;
    }

    this.snake.unshift(newHead);

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.updateScore();
      this.food = this.placeFood();
      if (this.score % SPEEDUP_EVERY === 0 && this.tickMs > MIN_TICK_MS) {
        this.tickMs -= SPEEDUP_DELTA;
        this.restartInterval();
      }
    } else {
      this.snake.pop();
    }

    this.draw();
  };

  private gameOver(): void {
    this.alive = false;
    this.stopInterval();
    this.draw();
  }

  private restartInterval(): void {
    this.stopInterval();
    this.interval = window.setInterval(this.tick, this.tickMs);
  }

  private stopInterval(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  start(): void {
    if (!this.started) {
      this.started = true;
      this.paused = false;
      this.restartInterval();
      this.draw();
    }
  }

  togglePause(): void {
    if (!this.started || !this.alive) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.stopInterval();
    } else {
      this.restartInterval();
    }
    this.draw();
  }

  restart(): void {
    this.stopInterval();
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.dir = { x: 1, y: 0 };
    this.pendingDir = null;
    this.food = this.placeFood();
    this.score = 0;
    this.tickMs = INITIAL_TICK_MS;
    this.alive = true;
    this.started = false;
    this.paused = true;
    this.updateScore();
    this.draw();
  }

  setDirection(newDir: Direction): void {
    if (!this.alive || this.paused) return;
    if (this.dir.x === -newDir.x && this.dir.y === -newDir.y) return;
    this.pendingDir = newDir;
  }
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score') as HTMLElement;
const highEl = document.getElementById('high') as HTMLElement;

const game = new Game(canvas, scoreEl, highEl);

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      game.setDirection({ x: 0, y: -1 });
      e.preventDefault();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      game.setDirection({ x: 0, y: 1 });
      e.preventDefault();
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      game.setDirection({ x: -1, y: 0 });
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      game.setDirection({ x: 1, y: 0 });
      e.preventDefault();
      break;
    case ' ':
      if (!game['started']) {
        game.start();
      } else {
        game.togglePause();
      }
      e.preventDefault();
      break;
    case 'r':
    case 'R':
      game.restart();
      e.preventDefault();
      break;
  }
});