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
    private ctx: CanvasRenderingContext2D;

    // State variables
    private snake: Cell[];
    private dir: Direction;
    private pendingDir: Direction | null;
    private food: Cell;
    private score: number;
    private high: number;
    private tickMs: number;
    private alive: boolean = false;
    private started: boolean = false; // True if Space has been pressed at least once
    private paused: boolean = true;

    constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement) {
        this.canvas = canvas;
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.ctx = canvas.getContext('2d')!;

        // Initial State Setup (Matches v1 requirements)
        this.snake = [
            { x: 10, y: 10 }, // Head
            { x: 9, y: 10 },
            { x: 8, y: 10 }  // Tail
        ];
        this.dir = { x: 1, y: 0 }; // Moving right
        this.pendingDir = null;
        this.score = 0;
        this.high = parseInt(localStorage.getItem('snake.high') || '0');
        this.tickMs = INITIAL_TICK_MS;

        // Initial food placement (must not overlap starting snake)
        this.food = this.placeFood();

        this.updateUI();
    }

    private placeFood(): Cell {
        let newFood: Cell;
        do {
            newFood = { 
                x: Math.floor(Math.random() * GRID), 
                y: Math.floor(Math.random() * GRID) 
            };
        } while (this.isOccupied(newFood));
        return newFood;
    }

    private isOccupied(cell: Cell): boolean {
        return this.snake.some(segment => segment.x === cell.x && segment.y === cell.y);
    }

    // --- Public API Methods ---

    start(): void {
        if (!this.started) {
            this.started = true;
            this.paused = false;
            this.draw(); // Initial draw before starting the loop
            this.gameLoopInterval = setInterval(() => this.tick(), this.tickMs);
        }
    }

    togglePause(): void {
        if (!this.started) return;

        if (this.paused) {
            // Resume
            clearInterval(this.gameLoopInterval!);
            this.gameLoopInterval = setInterval(() => this.tick(), this.tickMs);
            this.paused = false;
            this.draw();
        } else {
            // Pause
            clearInterval(this.gameLoopInterval!);
            this.paused = true;
            this.draw();
        }
    }

    restart(): void {
        // Reset all state variables to initial values
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.food = this.placeFood();
        this.score = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false; // Must reset started state so Space is required again
        this.paused = true;

        // Clear any existing interval and redraw the initial board state
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        this.draw();
        this.updateUI();
    }

    // --- Private Game Loop & Logic ---

    private gameLoopInterval: number | null = null;

    private tick(): void {
        if (!this.alive || this.paused) return;

        // 1. Determine actual direction (respecting pending input)
        const nextDir = this.pendingDir !== null ? this.pendingDir : this.dir;
        
        // 2. Calculate new head position
        const oldHead = { ...this.snake[0] };
        const newHead: Cell = { x: oldHead.x + nextDir.x, y: oldHead.y + nextDir.y };

        // 3. Collision Detection
        if (this.checkCollision(newHead)) {
            this.gameOver();
            return;
        }

        // 4. Update Snake Body
        const newSnake = [newHead, ...this.snake];
        
        // Check if food was eaten
        let ateFood = false;
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            ateFood = true;
            this.score++;
            this.tickMs = Math.max(MIN_TICK_MS, INITIAL_TICK_MS - Math.floor(this.score / SPEEDUP_EVERY) * SPEEDUP_DELTA);
            this.food = this.placeFood(); // Spawn new food
        } else {
            // If no food eaten, the tail segment is removed (standard movement)
            newSnake.pop(); 
        }

        this.snake = newSnake;

        // 5. Redraw and Update UI
        this.draw();
        this.updateUI();
    }

    private checkCollision(head: Cell): boolean {
        // Wall collision (Wrap-around is disabled)
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
            return true;
        }

        // Self-collision check: Check if the new head position hits any body segment,
        // excluding the tail cell that is about to vacate (the last element of the current snake).
        for (let i = 0; i < this.snake.length - 1; i++) {
            const segment = this.snake[i];
            if (segment.x === head.x && segment.y === head.y) {
                return true;
            }
        }

        return false;
    }

    private gameOver(): void {
        this.alive = false;
        clearInterval(this.gameLoopInterval!);
        this.gameLoopInterval = null;
        
        // Update high score persistence
        if (this.score > this.high) {
            this.high = this.score;
            localStorage.setItem('snake.high', this.high.toString());
        }

        this.draw(); // Draw the game over screen
    }


    // --- Drawing and UI ---

    private draw(): void {
        const ctx = this.ctx;
        
        // Clear canvas (Black background)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

        if (!this.alive && !this.started) {
            this.drawOverlay("Press Space to start");
            return;
        }
        
        if (this.gameOver()) {
             // Game over state handled by calling drawOverlay in gameOver()
             return;
        }

        // Draw Food (Red)
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);

        // Draw Snake Body and Head
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            if (i === 0) {
                // Head (Brighter Green)
                ctx.fillStyle = '#7ed957';
            } else {
                // Body (Darker Green)
                ctx.fillStyle = '#3aa635';
            }
            // Draw with a slight offset/border effect for visibility if desired, but simple fill is fine per spec.
            ctx.fillRect(segment.x * CELL, segment.y * CELL, CELL - 1, CELL - 1);
        }

        if (this.paused && this.started) {
             this.drawOverlay("Paused");
        } else if (!this.alive && this.started) {
            // Game Over screen is drawn in gameOver()
        }
    }

    private drawOverlay(text: string): void {
        const ctx = this.ctx;
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate center coordinates for the 400x400 canvas
        const centerX = (GRID * CELL) / 2;
        const centerY = (GRID * CELL) / 2;

        ctx.fillText(text, centerX, centerY);
    }


    private updateUI(): void {
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.highEl.textContent = `High: ${this.high}`;
    }
}

// --- Initialization Logic ---

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const scoreEl = document.getElementById('score') as HTMLElement;
    const highEl = document.getElementById('high') as HTMLElement;

    if (!canvas || !scoreEl || !highEl) {
        console.error("Required DOM elements not found.");
        return;
    }

    const gameInstance = new Game(canvas, scoreEl, highEl);

    // Keydown Listener Setup
    window.addEventListener('keydown', (e: KeyboardEvent) => {
        let handled = false;
        let nextDir: Direction | null = null;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
                nextDir = { x: 0, y: -1 };
                handled = true; break;
            case 'ArrowDown':
            case 's':
                nextDir = { x: 0, y: 1 };
                handled = true; break;
            case 'ArrowLeft':
            case 'a':
                nextDir = { x: -1, y: 0 };
                handled = true; break;
            case 'ArrowRight':
            case 'd':
                nextDir = { x: 1, y: 0 };
                handled = true; break;
            case ' ': // Spacebar
                e.preventDefault(); // Prevent scrolling
                if (!gameInstance.started) {
                    // First press starts the game
                    gameInstance.start();
                } else if (gameInstance.alive && !gameInstance.paused) {
                    // Pausing during play
                    gameInstance.togglePause();
                } else if (gameInstance.alive && gameInstance.paused) {
                     // Resuming from pause
                    gameInstance.togglePause();
                }
                return; // Space handles state change, no direction update needed
            case 'r':
                e.preventDefault();
                gameInstance.restart();
                return;
        }

        if (handled) {
            e.preventDefault(); // Prevent scrolling for directional keys

            // 1. Check if the requested move is opposite of current direction
            const oppositeDir: Direction = { x: -gameInstance['dir'].x, y: -gameInstance['dir'].y };
            if (nextDir.x === oppositeDir.x && nextDir.y === oppositeDir.y) {
                return; // Ignore reverse input
            }

            // 2. Update pending direction only if the game is active/started
            if (gameInstance.alive && !gameInstance['paused']) {
                gameInstance['pendingDir'] = nextDir;
            } else if (!gameInstance['started']) {
                 // If not started, we ignore directional inputs until Space is pressed
            }
        }
    });

    // Initial draw to show the starting board state (pre-start)
    gameInstance.draw(); 
});