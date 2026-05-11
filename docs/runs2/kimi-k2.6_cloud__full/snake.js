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
    pendingDir;
    food;
    score;
    high;
    tickMs;
    alive;
    started;
    paused;
    timer;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.food = { x: 0, y: 0 };
        this.score = 0;
        this.high = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.timer = null;
        this.resetState();
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
        this.updateUI();
    }
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
        if (!this.paused) {
            this.scheduleTick();
        }
        this.draw();
    }
    restart() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.resetState();
        this.draw();
    }
    scheduleTick() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (!this.alive || this.paused)
            return;
        this.timer = window.setTimeout(() => {
            this.tick();
        }, this.tickMs);
    }
    tick() {
        if (!this.alive || this.paused)
            return;
        if (this.pendingDir) {
            this.dir = this.pendingDir;
            this.pendingDir = null;
        }
        const head = this.snake[0];
        const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };
        if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
            this.gameOver();
            return;
        }
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
                this.gameOver();
                return;
            }
        }
        this.snake.unshift(newHead);
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score++;
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
            this.food = this.spawnFood();
            this.updateUI();
        }
        else {
            this.snake.pop();
        }
        this.draw();
        this.scheduleTick();
    }
    gameOver() {
        this.alive = false;
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.score > this.high) {
            this.high = this.score;
            localStorage.setItem('snake.high', String(this.high));
            this.updateUI();
        }
        this.draw();
    }
    spawnFood() {
        const occupied = new Set();
        for (const seg of this.snake) {
            occupied.add(`${seg.x},${seg.y}`);
        }
        let x, y;
        do {
            x = Math.floor(Math.random() * GRID);
            y = Math.floor(Math.random() * GRID);
        } while (occupied.has(`${x},${y}`));
        return { x, y };
    }
    updateUI() {
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
            const seg = this.snake[i];
            if (i === 0) {
                ctx.fillStyle = '#7ed957';
            }
            else {
                ctx.fillStyle = '#3aa635';
            }
            ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
        }
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (!this.started) {
            ctx.fillText('Press Space to start', this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (!this.alive) {
            ctx.fillText('Game Over — press R to restart', this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (this.paused) {
            ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    setDirection(d) {
        if (!this.alive)
            return;
        const opposite = d.x === -this.dir.x && d.y === -this.dir.y;
        if (opposite)
            return;
        this.pendingDir = d;
    }
}
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const savedHigh = localStorage.getItem('snake.high');
const initialHigh = savedHigh ? parseInt(savedHigh, 10) : 0;
const game = new Game(canvas, scoreEl, highEl);
game['high'] = isNaN(initialHigh) ? 0 : initialHigh;
game['updateUI']();
window.addEventListener('keydown', (e) => {
    const key = e.key;
    let handled = false;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        game.setDirection({ x: 0, y: -1 });
        handled = true;
    }
    else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        game.setDirection({ x: 0, y: 1 });
        handled = true;
    }
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        game.setDirection({ x: -1, y: 0 });
        handled = true;
    }
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        game.setDirection({ x: 1, y: 0 });
        handled = true;
    }
    else if (key === ' ') {
        if (!game['started']) {
            game.start();
        }
        else {
            game.togglePause();
        }
        handled = true;
    }
    else if (key === 'r' || key === 'R') {
        game.restart();
        handled = true;
    }
    if (handled) {
        e.preventDefault();
    }
});
