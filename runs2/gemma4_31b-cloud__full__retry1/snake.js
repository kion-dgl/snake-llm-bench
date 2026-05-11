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
    timer = null;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        const savedHigh = localStorage.getItem('snake.high');
        this.high = savedHigh ? parseInt(savedHigh, 10) : 0;
        this.restart();
    }
    start() {
        if (!this.started) {
            this.started = true;
            this.paused = false;
            this.runTick();
        }
    }
    togglePause() {
        if (this.started && this.alive) {
            this.paused = !this.paused;
            if (!this.paused) {
                this.runTick();
            }
            else if (this.timer !== null) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }
    }
    restart() {
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
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.spawnFood();
        this.updateUI();
        this.draw();
    }
    spawnFood() {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID)
            };
            if (!this.snake.some(seg => seg.x === newFood.x && seg.y === newFood.y))
                break;
        }
        this.food = newFood;
    }
    updateUI() {
        this.scoreEl.innerText = `Score: ${this.score}`;
        this.highEl.innerText = `High: ${this.high}`;
    }
    runTick() {
        if (!this.alive || this.paused)
            return;
        this.update();
        this.draw();
        this.timer = window.setTimeout(() => this.runTick(), this.tickMs);
    }
    update() {
        if (this.pendingDir) {
            this.dir = this.pendingDir;
            this.pendingDir = null;
        }
        const head = {
            x: this.snake[0].x + this.dir.x,
            y: this.snake[0].y + this.dir.y
        };
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
            this.gameOver();
            return;
        }
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
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
        }
        else {
            this.snake.pop();
        }
    }
    gameOver() {
        this.alive = false;
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.draw();
    }
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        this.snake.forEach((seg, i) => {
            this.ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
            this.ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
        });
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        if (!this.started) {
            this.ctx.fillText('Press Space to start', 200, 200);
        }
        else if (this.paused && this.alive) {
            this.ctx.fillText('Paused', 200, 200);
        }
        else if (!this.alive) {
            this.ctx.fillText('Game Over — press R to restart', 200, 200);
        }
    }
    setDirection(nx, ny) {
        if (nx === -this.dir.x && ny === -this.dir.y)
            return;
        this.pendingDir = { x: nx, y: ny };
    }
}
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            e.preventDefault();
            game.setDirection(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            game.setDirection(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            e.preventDefault();
            game.setDirection(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            e.preventDefault();
            game.setDirection(1, 0);
            break;
        case ' ':
            e.preventDefault();
            if (!game.started)
                game.start();
            else
                game.togglePause();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            game.restart();
            break;
    }
});
