const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;
const DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
};
class Game {
    canvas;
    ctx;
    scoreEl;
    highEl;
    snake = [];
    dir = { x: 1, y: 0 };
    pendingDir = null;
    food;
    score = 0;
    high = 0;
    tickMs = INITIAL_TICK_MS;
    alive = true;
    started = false;
    paused = true;
    tickId = null;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.init();
    }
    init() {
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
        this.updateScore();
        this.spawnFood();
        this.draw();
    }
    spawnFood() {
        const occupied = new Set();
        this.snake.forEach(segment => occupied.add(`${segment.x},${segment.y}`));
        const available = [];
        for (let x = 0; x < GRID; x++) {
            for (let y = 0; y < GRID; y++) {
                if (!occupied.has(`${x},${y}`)) {
                    available.push({ x, y });
                }
            }
        }
        this.food = available[Math.floor(Math.random() * available.length)];
    }
    updateScore() {
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.high = Math.max(this.score, this.high);
        this.highEl.textContent = `High: ${this.high}`;
        localStorage.setItem('snake.high', this.high.toString());
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw snake
        this.snake.forEach((segment, index) => {
            this.ctx.fillStyle = index === 0 ? '#7ed957' : '#3aa635';
            this.ctx.fillRect(segment.x * CELL, segment.y * CELL, CELL, CELL);
        });
        // Draw food
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        // Draw overlay text
        if (!this.started && this.paused) {
            this.drawText('Press Space to start');
        }
        else if (this.paused) {
            this.drawText('Paused');
        }
        else if (!this.alive) {
            this.drawText('Game Over — press R to restart');
        }
    }
    drawText(text) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }
    move() {
        if (this.pendingDir) {
            const opposite = { x: -this.dir.x, y: -this.dir.y };
            if (this.pendingDir.x !== opposite.x || this.pendingDir.y !== opposite.y) {
                this.dir = this.pendingDir;
            }
            this.pendingDir = null;
        }
        const head = { ...this.snake[0] };
        head.x += this.dir.x;
        head.y += this.dir.y;
        // Check wall collision
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
            this.gameOver();
            return;
        }
        // Check self collision (ignore tail if it's about to move)
        const tail = this.snake[this.snake.length - 1];
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this.gameOver();
                return;
            }
        }
        // Check food collision
        let grow = false;
        if (head.x === this.food.x && head.y === this.food.y) {
            grow = true;
            this.score++;
            this.updateScore();
            this.spawnFood();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
                if (this.tickId) {
                    clearInterval(this.tickId);
                    this.tickId = window.setInterval(() => this.tick(), this.tickMs);
                }
            }
        }
        // Move snake
        this.snake.unshift(head);
        if (!grow) {
            this.snake.pop();
        }
    }
    gameOver() {
        this.alive = false;
        if (this.tickId) {
            clearInterval(this.tickId);
            this.tickId = null;
        }
        this.draw();
    }
    tick() {
        this.move();
        this.draw();
    }
    start() {
        if (this.started && !this.paused)
            return;
        this.started = true;
        this.paused = false;
        if (this.tickId)
            clearInterval(this.tickId);
        this.tickId = window.setInterval(() => this.tick(), this.tickMs);
        this.draw();
    }
    togglePause() {
        if (!this.started || !this.alive)
            return;
        this.paused = !this.paused;
        if (this.paused) {
            if (this.tickId)
                clearInterval(this.tickId);
            this.tickId = null;
        }
        else {
            this.tickId = window.setInterval(() => this.tick(), this.tickMs);
        }
        this.draw();
    }
    restart() {
        if (this.tickId)
            clearInterval(this.tickId);
        this.init();
        this.draw();
    }
}
// Setup
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const high = localStorage.getItem('snake.high');
const game = new Game(canvas, scoreEl, highEl);
if (high) {
    game['high'] = parseInt(high, 10);
    highEl.textContent = `High: ${game['high']}`;
}
window.addEventListener('keydown', (e) => {
    if (DIRECTIONS[e.key]) {
        game['pendingDir'] = DIRECTIONS[e.key];
        e.preventDefault();
    }
    else if (e.key === ' ') {
        if (!game['started']) {
            game.start();
        }
        else {
            game.togglePause();
        }
        e.preventDefault();
    }
    else if (e.key === 'r' || e.key === 'R') {
        game.restart();
        e.preventDefault();
    }
});
