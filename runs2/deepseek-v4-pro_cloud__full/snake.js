// snake.ts
const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5; // apples
const SPEEDUP_DELTA = 10; // ms
class Game {
    canvas;
    ctx;
    scoreEl;
    highEl;
    snake = [];
    dir = { x: 1, y: 0 };
    pendingDir = null;
    food = { x: 0, y: 0 };
    score = 0;
    high = 0;
    tickMs = INITIAL_TICK_MS;
    alive = true;
    started = false;
    paused = true;
    intervalId = null;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        // load high score
        const stored = localStorage.getItem('snake.high');
        this.high = stored ? parseInt(stored, 10) || 0 : 0;
        this.updateHighDisplay();
        this.resetState();
        this.draw();
    }
    // --- public API ---
    start() {
        if (!this.started && this.alive) {
            this.started = true;
            this.paused = false;
            this.startTick();
            this.draw();
        }
    }
    togglePause() {
        if (!this.started || !this.alive)
            return;
        if (this.paused) {
            this.paused = false;
            this.startTick();
        }
        else {
            this.paused = true;
            this.stopTick();
        }
        this.draw();
    }
    restart() {
        this.stopTick();
        this.resetState();
        this.draw();
    }
    changeDirection(dir) {
        // ignore exact opposite of current direction
        if (dir.x === -this.dir.x && dir.y === -this.dir.y)
            return;
        this.pendingDir = dir;
    }
    // --- private helpers ---
    resetState() {
        // initial snake: head (10,10), body (9,10), (8,10)
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
        this.paused = true;
        this.updateScoreDisplay();
        this.spawnFood();
    }
    spawnFood() {
        const occupied = new Set(this.snake.map(c => `${c.x},${c.y}`));
        const free = [];
        for (let x = 0; x < GRID; x++) {
            for (let y = 0; y < GRID; y++) {
                if (!occupied.has(`${x},${y}`)) {
                    free.push({ x, y });
                }
            }
        }
        // there is always at least one free cell (snake length < 400)
        const rand = Math.floor(Math.random() * free.length);
        this.food = free[rand];
    }
    startTick() {
        this.stopTick();
        this.intervalId = window.setInterval(() => this.tick(), this.tickMs);
    }
    stopTick() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    tick() {
        if (!this.alive || this.paused)
            return;
        // apply pending direction
        if (this.pendingDir) {
            this.dir = this.pendingDir;
            this.pendingDir = null;
        }
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.dir.x,
            y: head.y + this.dir.y,
        };
        // wall collision
        if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
            this.gameOver();
            return;
        }
        // check if apple will be eaten
        const willEat = newHead.x === this.food.x && newHead.y === this.food.y;
        // self-collision: exclude tail only if it will be removed (not eating)
        const segmentsToCheck = willEat ? this.snake : this.snake.slice(0, -1);
        if (segmentsToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
            this.gameOver();
            return;
        }
        // move
        this.snake.unshift(newHead);
        if (willEat) {
            // grow: do not remove tail
            this.score++;
            this.updateScoreDisplay();
            this.updateHighScoreIfNeeded();
            this.adjustSpeed();
            this.spawnFood();
        }
        else {
            this.snake.pop();
        }
        this.draw();
    }
    gameOver() {
        this.alive = false;
        this.stopTick();
        this.updateHighScoreIfNeeded();
        this.draw();
    }
    updateHighScoreIfNeeded() {
        if (this.score > this.high) {
            this.high = this.score;
            localStorage.setItem('snake.high', String(this.high));
            this.updateHighDisplay();
        }
    }
    adjustSpeed() {
        const newTickMs = Math.max(MIN_TICK_MS, INITIAL_TICK_MS - Math.floor(this.score / SPEEDUP_EVERY) * SPEEDUP_DELTA);
        if (newTickMs !== this.tickMs) {
            this.tickMs = newTickMs;
            // restart interval if currently running
            if (this.started && !this.paused && this.alive) {
                this.startTick();
            }
        }
    }
    updateScoreDisplay() {
        this.scoreEl.textContent = `Score: ${this.score}`;
    }
    updateHighDisplay() {
        this.highEl.textContent = `High: ${this.high}`;
    }
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // draw food
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        // draw snake
        this.snake.forEach((seg, i) => {
            ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
            ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
        });
        // overlay text
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (!this.alive) {
            ctx.fillText('Game Over — press R to restart', 200, 200);
        }
        else if (!this.started) {
            ctx.fillText('Press Space to start', 200, 200);
        }
        else if (this.paused) {
            ctx.fillText('Paused', 200, 200);
        }
    }
}
// --- top-level setup ---
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener('keydown', (e) => {
    const key = e.key;
    let handled = true;
    switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            game.changeDirection({ x: 0, y: -1 });
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            game.changeDirection({ x: 0, y: 1 });
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            game.changeDirection({ x: -1, y: 0 });
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            game.changeDirection({ x: 1, y: 0 });
            break;
        case ' ':
            if (!game['started']) { // access private for logic? We'll use public start/togglePause
                game.start();
            }
            else {
                game.togglePause();
            }
            break;
        case 'r':
        case 'R':
            game.restart();
            break;
        default:
            handled = false;
    }
    if (handled) {
        e.preventDefault();
    }
});
