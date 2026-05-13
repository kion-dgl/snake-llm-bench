type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;

class Game {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private scoreEl!: HTMLElement;
    private highEl!: HTMLElement;

    private snake: Cell[] = [];
    private dir: Direction = { x: 1, y: 0 };
    private pendingDir: Direction | null = null;
    private food!: Cell;
    private score: number = 0;
    private high: number = 0;
    private tickMs: number = INITIAL_TICK_MS;
    private alive: boolean = true;
    private started: boolean = false;
    private paused: boolean = true;
    private timer: number | null = null;

    constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.high = parseInt(localStorage.getItem('snake.high') || '0');
        this.restart();
    }

    restart(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.score = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.spawnFood();
        this.updateUI();
        this.draw();
    }

    start(): void {
        this.started = true;
        this.paused = false;
        this.tick();
    }

    togglePause(): void {
        if (!this.started) {
            this.start();
            return;
        }
        this.paused = !this.paused;
        if (!this.paused) this.tick();
    }

    private tick(): void {
        if (!this.alive || this.paused) return;

        this.update();
        this.draw();

        if (this.alive) {
            this.timer = window.setTimeout(() => this.tick(), this.tickMs);
        }
    }

    private update(): void {
        if (this.pendingDir) {
            this.dir = this.pendingDir;
            this.pendingDir = null;
        }

        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

        // Wall collision
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
            this.gameOver();
            return;
        }

        // Body collision (ignore tail cell as it vacates)
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            if (this.score > this.high) {
                this.high = this.score;
                localStorage.setItem('snake.high', this.high.toString());
            }
            this.updateUI();
            this.spawnFood();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
        } else {
            this.snake.pop();
        }
    }

    private spawnFood(): void {
        let valid = false;
        while (!valid) {
            this.food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
            valid = !this.snake.some(s => s.x === this.food.x && s.y === this.food.y);
        }
    }

    private gameOver(): void {
        this.alive = false;
        this.draw();
    }

    private updateUI(): void {
        this.scoreEl.innerText = `Score: ${this.score}`;
        this.highEl.innerText = `High: ${this.high}`;
    }

    private draw(): void {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL - 1, CELL - 1);

        this.snake.forEach((seg, i) => {
            this.ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
            this.ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL - 1, CELL - 1);
        });

        if (!this.started) {
            this.drawOverlay('Press Space to start');
        } else if (this.paused) {
            this.drawOverlay('Paused');
        } else if (!this.alive) {
            this.drawOverlay('Game Over — press R to restart');
        }
    }

    private drawOverlay(text: string): void {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }

    public setDirection(nx: number, ny: number): void {
        if (nx === -this.dir.x && ny === -this.dir.y) return;
        this.pendingDir = { x: nx, y: ny };
    }
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score') as HTMLElement;
const highEl = document.getElementById('high') as HTMLElement;
const game = new Game(canvas, scoreEl, highEl);

window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'r'].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowUp': case 'w': game.setDirection(0, -1); break;
        case 'ArrowDown': case 's': game.setDirection(0, 1); break;
        case 'ArrowLeft': case 'a': game.setDirection(-1, 0); break;
        case 'ArrowRight': case 'd': game.setDirection(1, 0); break;
        case ' ': game.togglePause(); break;
        case 'r': case 'R': game.restart(); break;
    }
});