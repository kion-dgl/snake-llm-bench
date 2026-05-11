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
    snake;
    dir;
    pendingDir = null;
    food;
    score = 0;
    high = 0;
    tickMs = INITIAL_TICK_MS;
    alive = true;
    started = false;
    paused = true;
    timerId = null;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Canvas not supported');
        this.ctx = ctx;
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        const stored = localStorage.getItem('snake.high');
        this.high = stored ? parseInt(stored, 10) : 0;
        this.updateScoreUI();
        this.reset();
        this.render(); // initial board
    }
    /** Public API */
    start() {
        if (this.started)
            return;
        this.started = true;
        this.paused = false;
        this.scheduleTick();
    }
    togglePause() {
        if (!this.started || !this.alive)
            return;
        this.paused = !this.paused;
        if (!this.paused)
            this.scheduleTick();
        this.render();
    }
    restart() {
        this.clearTimer();
        this.reset();
        this.render();
    }
    /** Private helpers */
    reset() {
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
        this.spawnFood();
        this.updateScoreUI();
    }
    spawnFood() {
        while (true) {
            const candidate = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID),
            };
            const occupied = this.snake.some(s => s.x === candidate.x && s.y === candidate.y);
            if (!occupied) {
                this.food = candidate;
                break;
            }
        }
    }
    scheduleTick() {
        this.clearTimer();
        this.timerId = window.setTimeout(() => this.tick(), this.tickMs);
    }
    clearTimer() {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
    tick() {
        if (!this.alive || this.paused)
            return;
        // Apply pending direction if valid
        if (this.pendingDir) {
            const opposite = this.dir.x + this.pendingDir.x === 0 && this.dir.y + this.pendingDir.y === 0;
            if (!opposite)
                this.dir = this.pendingDir;
            this.pendingDir = null;
        }
        const head = this.snake[0];
        const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };
        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
            this.gameOver();
            return;
        }
        const willEat = newHead.x === this.food.x && newHead.y === this.food.y;
        // Self collision (tail exception when not eating)
        const collision = this.snake.some((segment, idx) => {
            if (!willEat && idx === this.snake.length - 1)
                return false; // tail will move away
            return segment.x === newHead.x && segment.y === newHead.y;
        });
        if (collision) {
            this.gameOver();
            return;
        }
        // Move snake
        this.snake.unshift(newHead);
        if (willEat) {
            this.score++;
            this.updateScoreUI();
            this.spawnFood();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
        }
        else {
            this.snake.pop();
        }
        this.render();
        // Continue ticking
        this.scheduleTick();
    }
    gameOver() {
        this.alive = false;
        this.render(); // draw final board with overlay
    }
    updateScoreUI() {
        this.scoreEl.textContent = `Score: ${this.score}`;
        if (this.score > this.high) {
            this.high = this.score;
            localStorage.setItem('snake.high', String(this.high));
        }
        this.highEl.textContent = `High: ${this.high}`;
    }
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Apple
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        // Snake
        this.snake.forEach((segment, idx) => {
            ctx.fillStyle = idx === 0 ? '#7ed957' : '#3aa635';
            ctx.fillRect(segment.x * CELL, segment.y * CELL, CELL, CELL);
        });
        // Overlays
        if (!this.alive) {
            this.drawOverlay('Game Over — press R to restart');
        }
        else if (this.paused) {
            const text = this.started ? 'Paused' : 'Press Space to start';
            this.drawOverlay(text);
        }
    }
    drawOverlay(text) {
        const ctx = this.ctx;
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }
}
/* ---------- Top‑level setup ---------- */
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener('keydown', (e) => {
    const key = e.key;
    let dir = null;
    if (key === 'ArrowUp' || key === 'w' || key === 'W')
        dir = { x: 0, y: -1 };
    else if (key === 'ArrowDown' || key === 's' || key === 'S')
        dir = { x: 0, y: 1 };
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A')
        dir = { x: -1, y: 0 };
    else if (key === 'ArrowRight' || key === 'd' || key === 'D')
        dir = { x: 1, y: 0 };
    else if (key === ' ') {
        e.preventDefault();
        if (!game['started'])
            game.start(); // first start
        else
            game.togglePause();
        return;
    }
    else if (key === 'r' || key === 'R') {
        e.preventDefault();
        game.restart();
        return;
    }
    if (dir) {
        e.preventDefault();
        // Queue direction change if game is active
        if (game['started'] && game['alive'] && !game['paused']) {
            // ignore opposite direction inside Game via pendingDir logic
            game['pendingDir'] = dir;
        }
    }
});
