"use strict";
const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5; // apples
const SPEEDUP_DELTA = 10; // ms
class Game {
    canvas;
    scoreEl;
    highEl;
    ctx;
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
    timeoutId = null;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.ctx = canvas.getContext('2d');
        this.high = parseInt(localStorage.getItem('snake.high') || '0', 10);
        this.highEl.innerText = `High: ${this.high}`;
        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.food = { x: 0, y: 0 };
        this.score = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = false;
        this.started = false;
        this.paused = true;
        this.restart();
    }
    start() {
        if (!this.started) {
            this.started = true;
            this.paused = false;
            this.alive = true;
            this.loop();
        }
        else if (this.paused && this.alive) {
            this.togglePause();
        }
    }
    togglePause() {
        if (!this.alive)
            return;
        this.paused = !this.paused;
        if (!this.paused) {
            this.loop();
        }
        else {
            if (this.timeoutId !== null) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        }
        this.draw();
    }
    restart() {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
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
        this.scoreEl.innerText = `Score: 0`;
        this.spawnFood();
        this.draw();
    }
    spawnFood() {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID)
            };
            const collision = this.snake.some(s => s.x === newFood.x && s.y === newFood.y);
            if (!collision)
                break;
        }
        this.food = newFood;
    }
    loop() {
        if (this.paused || !this.alive)
            return;
        this.update();
        this.draw();
        if (this.alive) {
            this.timeoutId = window.setTimeout(() => this.loop(), this.tickMs);
        }
    }
    update() {
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
        // Body collision (allowing tail to vacate)
        // The tail cell is at snake.length - 1. 
        // If we are NOT eating food, the tail will move.
        const isEating = head.x === this.food.x && head.y === this.food.y;
        const tailIndex = isEating ? this.snake.length : this.snake.length - 1;
        for (let i = 0; i < tailIndex; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this.gameOver();
                return;
            }
        }
        this.snake.unshift(head);
        if (isEating) {
            this.score++;
            this.scoreEl.innerText = `Score: ${this.score}`;
            if (this.score > this.high) {
                this.high = this.score;
                this.highEl.innerText = `High: ${this.high}`;
                localStorage.setItem('snake.high', this.high.toString());
            }
            if (this.score % SPEEDUP_EVERY === 0 && this.tickMs > MIN_TICK_MS) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
            this.spawnFood();
        }
        else {
            this.snake.pop();
        }
    }
    gameOver() {
        this.alive = false;
        this.draw();
    }
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw Food
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        // Draw Snake
        for (let i = 0; i < this.snake.length; i++) {
            this.ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
            this.ctx.fillRect(this.snake[i].x * CELL, this.snake[i].y * CELL, CELL, CELL);
        }
        // Overlays
        if (!this.alive) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, 400, 400);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over — press R to restart', 200, 200);
        }
        else if (this.paused) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, 400, 400);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.started ? 'Paused' : 'Press Space to start', 200, 200);
        }
    }
    handleInput(key) {
        let dx = 0;
        let dy = 0;
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                dx = 0;
                dy = -1;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                dx = 0;
                dy = 1;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                dx = -1;
                dy = 0;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                dx = 1;
                dy = 0;
                break;
            case ' ':
                this.handleSpace();
                return;
            case 'r':
            case 'R':
                this.restart();
                return;
            default: return;
        }
        // Prevent reverse
        if (dx !== 0 || dy !== 0) {
            if (dx === -this.dir.x && dy === -this.dir.y)
                return;
            this.pendingDir = { x: dx, y: dy };
        }
    }
    handleSpace() {
        if (!this.started) {
            this.start();
        }
        else {
            this.togglePause();
        }
    }
}
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener('keydown', (e) => {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'r', 'R', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
    if (keys.includes(e.key)) {
        e.preventDefault();
        game.handleInput(e.key);
    }
});
