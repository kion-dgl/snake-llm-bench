"use strict";
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
    score;
    high;
    tickMs;
    alive;
    started;
    paused;
    timerId;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.high = Number(localStorage.getItem('snake.high')) || 0;
        this.highEl.textContent = `High: ${this.high}`;
        this.scoreEl.textContent = `Score: 0`;
        this.resetSnake();
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.food = this.spawnFood();
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.draw();
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        this.paused = false;
        this.alive = true;
        this.scheduleTick();
    }
    togglePause() {
        if (!this.started)
            return;
        this.paused = !this.paused;
        if (!this.paused) {
            this.scheduleTick();
        }
        else {
            this.draw();
        }
    }
    restart() {
        this.clearTimer();
        this.started = false;
        this.paused = true;
        this.alive = true;
        this.tickMs = INITIAL_TICK_MS;
        this.score = 0;
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.resetSnake();
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.food = this.spawnFood();
        this.draw();
    }
    // Public helper for direction changes
    setDirection(dir) {
        if (this.isOpposite(dir))
            return;
        this.pendingDir = dir;
    }
    resetSnake() {
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 },
        ];
    }
    spawnFood() {
        while (true) {
            const x = Math.floor(Math.random() * GRID);
            const y = Math.floor(Math.random() * GRID);
            if (!this.snake.some(seg => seg.x === x && seg.y === y)) {
                return { x, y };
            }
        }
    }
    isOpposite(dir) {
        return this.dir.x + dir.x === 0 && this.dir.y + dir.y === 0;
    }
    scheduleTick() {
        this.timerId = window.setTimeout(() => this.tick(), this.tickMs);
    }
    clearTimer() {
        if (this.timerId !== undefined) {
            clearTimeout(this.timerId);
            this.timerId = undefined;
        }
    }
    tick() {
        if (!this.started || this.paused || !this.alive)
            return;
        if (this.pendingDir && !this.isOpposite(this.pendingDir)) {
            this.dir = this.pendingDir;
        }
        this.pendingDir = null;
        const newHead = {
            x: this.snake[0].x + this.dir.x,
            y: this.snake[0].y + this.dir.y,
        };
        // Wall collision
        if (newHead.x < 0 ||
            newHead.x >= GRID ||
            newHead.y < 0 ||
            newHead.y >= GRID) {
            this.gameOver();
            return;
        }
        const willGrow = newHead.x === this.food.x && newHead.y === this.food.y;
        // Body collision
        for (let i = 0; i < this.snake.length; i++) {
            if (!willGrow && i === this.snake.length - 1)
                continue; // tail will move
            const seg = this.snake[i];
            if (seg.x === newHead.x && seg.y === newHead.y) {
                this.gameOver();
                return;
            }
        }
        // Move snake
        this.snake.unshift(newHead);
        if (!willGrow) {
            this.snake.pop();
        }
        else {
            this.score++;
            this.scoreEl.textContent = `Score: ${this.score}`;
            if (this.score > this.high) {
                this.high = this.score;
                this.highEl.textContent = `High: ${this.high}`;
                localStorage.setItem('snake.high', String(this.high));
            }
            this.food = this.spawnFood();
            if (this.score % SPEEDUP_EVERY === 0 && this.tickMs > MIN_TICK_MS) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
        }
        this.draw();
        this.scheduleTick();
    }
    gameOver() {
        this.alive = false;
        this.paused = true;
        this.draw();
    }
    draw() {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Apple
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        // Snake
        for (let i = 0; i < this.snake.length; i++) {
            const seg = this.snake[i];
            this.ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
            this.ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
        }
        // Overlay text
        let overlay = null;
        if (!this.started) {
            overlay = 'Press Space to start';
        }
        else if (!this.alive) {
            overlay = 'Game Over — press R to restart';
        }
        else if (this.paused) {
            overlay = 'Paused';
        }
        if (overlay) {
            this.ctx.font = '20px sans-serif';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(overlay, this.canvas.width / 2, this.canvas.height / 2);
        }
    }
}
// Top-level setup
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
            game.setDirection({ x: 0, y: -1 });
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            game.setDirection({ x: 0, y: 1 });
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            e.preventDefault();
            game.setDirection({ x: -1, y: 0 });
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            e.preventDefault();
            game.setDirection({ x: 1, y: 0 });
            break;
        case ' ':
            e.preventDefault();
            if (!game['started']) {
                game.start();
            }
            else {
                game.togglePause();
            }
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            game.restart();
            break;
    }
});
