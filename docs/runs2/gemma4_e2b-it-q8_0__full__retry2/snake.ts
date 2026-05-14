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
    private gameInterval: number | null = null;

    constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
        this.canvas = canvas;
        this.scoreEl = scoreEl;
        this.highEl = highEl;

        // Initial State Setup
        this.snake = [
            { x: 10, y: 10 }, // Head
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.dir = { x: 1, y: 0 }; // Moving right
        this.pendingDir: Direction | null = null;
        this.score = 0;
        this.high = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = false;
        this.started = false;
        this.paused = true; // Starts paused

        this.loadHighScore();
        this.draw();
        this.installListeners();
    }

    private loadHighScore(): void {
        const storedHigh = localStorage.getItem('snake.high');
        this.high = storedHigh ? parseInt(storedHigh, 10) : 0;
        this.highEl.textContent = `High: ${this.high}`;
    }

    private installListeners(): void {
        window.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    private handleKeydown(e: KeyboardEvent): void {
        const key = e.key.toUpperCase();

        if (key === 'ARROWUP' || key === 'W') {
            this.setPendingDirection({ x: 0, y: -1 });
        } else if (key === 'ARROWDOWN' || key === 'S') {
            this.setPendingDirection({ x: 0, y: 1 });
        } else if (key === 'ARROWLEFT' || key === 'A') {
            this.setPendingDirection({ x: -1, y: 0 });
        } else if (key === 'ARIGHT' || key === 'D') {
            this.setPendingDirection({ x: 1, y: 0 });
        } else if (key === ' ') {
            e.preventDefault();
            if (!this.started) {
                this.start();
            } else if (this.paused) {
                this.togglePause();
            }
        } else if (key === 'R') {
            this.restart();
        }
    }

    private setPendingDirection(newDir: Direction): void {
        // Reverse-into-self prevention: check if the new direction is the exact opposite of the current direction
        if (newDir.x !== -this.dir.x || newDir.y !== -this.dir.y) {
            this.pendingDir = newDir;
        }
    }

    private startGameLoop(): void {
        if (this.gameInterval !== null) return;

        this.gameInterval = setInterval(() => {
            if (!this.alive) {
                clearInterval(this.gameInterval!);
                this.gameInterval = null;
                return;
            }

            this.moveSnake();
            this.checkCollisions();
            this.checkFood();
            this.updateScore();
            this.updateSpeed();
            this.draw();
        }, this.tickMs);
    }

    private updateSpeed(): void {
        if (this.score > 0 && this.score % SPEEDUP_EVERY === 0) {
            this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
        }
    }

    private moveSnake(): void {
        // Apply pending direction if available
        if (this.pendingDir) {
            this.dir = this.pendingDir;
            this.pendingDir = null; // Consume pending direction
        }

        const head = this.snake[0];
        const newHead: Cell = {
            x: head.x + this.dir.x,
            y: head.y + this.dir.y
        };

        // 1. Check Wall Collision
        if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
            this.gameOver();
            return;
        }

        // 2. Check Self Collision (excluding the tail cell that is about to vacate)
        for (let i = 1; i < this.snake.length; i++) {
            if (newHead.x === this.snake[i].x && newHead.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }

        // Add new head
        this.snake.unshift(newHead);

        // If no food was eaten, remove the tail
        if (this.food.x !== newHead.x || this.food.y !== newHead.y) {
            this.snake.pop();
        }
    }

    private checkFood(): void {
        if (this.snake[0].x === this.food.x && this.snake[0].y === this.food.y) {
            this.score++;
            this.food = this.spawnFood();
        }
    }

    private spawnFood(): Cell {
        let newFood: Cell;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID)
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }

    private updateScore(): void {
        this.scoreEl.textContent = `Score: ${this.score}`;
    }

    private draw(): void {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Apple
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

        // Draw Snake
        this.snake.forEach((segment, index) => {
            if (index === 0) {
                // Head
                ctx.fillStyle = '#7ed957';
            } else {
                // Body
                ctx.fillStyle = '#3aa635';
            }
            ctx.fillRect(segment.x * CELL, segment.y * CELL, CELL, CELL);
        });

        // Draw Status Overlay
        if (!this.started) {
            this.drawStartScreen();
        } else if (this.paused) {
            this.drawPauseScreen();
        } else if (!this.alive) {
            this.drawGameOverScreen();
        }
    }

    private drawStartScreen(): void {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press Space to start', this.canvas.width / 2, this.canvas.height / 2);
    }

    private drawPauseScreen(): void {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height / 2);
    }

    private drawGameOverScreen(): void {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over — press R to restart', this.canvas.width / 2, this.canvas.height / 2);
    }

    public start(): void {
        if (this.started) return;
        this.started = true;
        this.paused = false;
        this.alive = true;
        this.startGameLoop();
    }

    public togglePause(): void {
        if (!this.started) return;
        this.paused = !this.paused;
        if (this.paused) {
            clearInterval(this.gameInterval!);
            this.gameInterval = null;
        } else {
            this.startGameLoop();
        }
        this.draw();
    }

    public restart(): void {
        // Stop any running interval
        if (this.gameInterval !== null) {
            clearInterval(this.gameInterval!);
            this.gameInterval = null;
        }

        // Reset state
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

        this.spawnFood();
        this.updateScore();
        this.draw();
    }

    private gameOver(): void {
        this.alive = false;
        if (this.gameInterval !== null) {
            clearInterval(this.gameInterval!);
            this.gameInterval = null;
        }
        this.draw();
    }
}

// Top-level setup
const canvas = document.getElementById('game') as HTMLCanvasElement;
const scoreEl = document.getElementById('score') as HTMLElement;
const highEl = document.getElementById('high') as HTMLElement;

const game = new Game(canvas, scoreEl, highEl);