const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;
class Game {
    canvas;
    ctx;
    scoreEl;
    highEl;
    snake;
    dir;
    pendingDir = null;
    food;
    score;
    high;
    tickMs;
    alive;
    started;
    paused;
    timer = null;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('No 2D context');
        this.ctx = ctx;
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        const stored = localStorage.getItem('snake.high');
        this.high = stored ? parseInt(stored, 10) || 0 : 0;
        this.resetState();
        this.updateHud();
        this.draw();
    }
    resetState() {
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
        this.food = this.spawnFood();
    }
    spawnFood() {
        const occupied = new Set(this.snake.map(c => c.y * GRID + c.x));
        const free = [];
        for (let i = 0; i < GRID * GRID; i++) {
            if (!occupied.has(i))
                free.push(i);
        }
        if (free.length === 0)
            return { x: 0, y: 0 };
        const idx = free[Math.floor(Math.random() * free.length)];
        return { x: idx % GRID, y: Math.floor(idx / GRID) };
    }
    start() {
        if (!this.alive)
            return;
        if (this.started && !this.paused)
            return;
        this.started = true;
        this.paused = false;
        this.scheduleTick();
        this.draw();
    }
    togglePause() {
        if (!this.alive)
            return;
        if (!this.started) {
            this.start();
            return;
        }
        this.paused = !this.paused;
        if (this.paused) {
            this.clearTimer();
        }
        else {
            this.scheduleTick();
        }
        this.draw();
    }
    restart() {
        this.clearTimer();
        this.resetState();
        this.updateHud();
        this.draw();
    }
    setDirection(nx, ny) {
        if (!this.alive)
            return;
        if (nx === -this.dir.x && ny === -this.dir.y)
            return;
        this.pendingDir = { x: nx, y: ny };
    }
    clearTimer() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    scheduleTick() {
        this.clearTimer();
        this.timer = window.setTimeout(() => {
            this.timer = null;
            this.tick();
        }, this.tickMs);
    }
    tick() {
        if (!this.alive || this.paused || !this.started)
            return;
        if (this.pendingDir) {
            if (!(this.pendingDir.x === -this.dir.x && this.pendingDir.y === -this.dir.y)) {
                this.dir = this.pendingDir;
            }
            this.pendingDir = null;
        }
        const head = this.snake[0];
        const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };
        if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
            this.gameOver();
            return;
        }
        const eating = newHead.x === this.food.x && newHead.y === this.food.y;
        const lastIdx = this.snake.length - 1;
        for (let i = 0; i < this.snake.length; i++) {
            if (!eating && i === lastIdx)
                continue;
            if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
                this.gameOver();
                return;
            }
        }
        this.snake.unshift(newHead);
        if (eating) {
            this.score += 1;
            if (this.score > this.high) {
                this.high = this.score;
                localStorage.setItem('snake.high', String(this.high));
            }
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
            this.food = this.spawnFood();
            this.updateHud();
        }
        else {
            this.snake.pop();
        }
        this.draw();
        this.scheduleTick();
    }
    gameOver() {
        this.alive = false;
        this.clearTimer();
        this.draw();
    }
    updateHud() {
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.highEl.textContent = `High: ${this.high}`;
    }
    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        for (let i = 0; i < this.snake.length; i++) {
            ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
            const s = this.snake[i];
            ctx.fillRect(s.x * CELL, s.y * CELL, CELL, CELL);
        }
        if (!this.alive) {
            this.drawCenterText('Game Over — press R to restart');
        }
        else if (this.paused && !this.started) {
            this.drawCenterText('Press Space to start');
        }
        else if (this.paused) {
            this.drawCenterText('Paused');
        }
    }
    drawCenterText(text) {
        const ctx = this.ctx;
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }
}
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener('keydown', (e) => {
    const k = e.key;
    let handled = true;
    switch (k) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            game.setDirection(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            game.setDirection(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            game.setDirection(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            game.setDirection(1, 0);
            break;
        case ' ':
        case 'Spacebar':
            game.togglePause();
            break;
        case 'r':
        case 'R':
            game.restart();
            break;
        default:
            handled = false;
    }
    if (handled)
        e.preventDefault();
});
