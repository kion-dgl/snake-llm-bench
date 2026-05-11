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
    pendingDir;
    food;
    score;
    high;
    tickMs;
    alive;
    started;
    paused;
    gameInterval;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.snake = [];
        this.dir = { x: 1, y: 0 }; // Moving right
        this.pendingDir = null;
        this.food = { x: 0, y: 0 }; // Will be set on reset
        this.score = 0;
        this.high = parseInt(localStorage.getItem('snake.high') || '0', 10);
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.gameInterval = null;
        this.highEl.textContent = `High: ${this.high}`;
        this.reset();
        this.draw();
    }
    reset() {
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 },
        ];
        this.dir = { x: 1, y: 0 }; // Moving right
        this.pendingDir = null;
        this.score = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.paused = true;
        this.started = false;
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.spawnFood();
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
    }
    spawnFood() {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID),
            };
            let collision = false;
            for (const segment of this.snake) {
                if (segment.x === newFood.x && segment.y === newFood.y) {
                    collision = true;
                    break;
                }
            }
            if (!collision) {
                this.food = newFood;
                break;
            }
        }
    }
    update() {
        if (!this.alive || this.paused) {
            return;
        }
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
        // Self collision (excluding the very last segment if it's about to move)
        for (let i = 1; i < this.snake.length - (this.snake[this.snake.length - 1].x === this.food.x && this.snake[this.snake.length - 1].y === this.food.y ? 0 : 1); i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }
        this.snake.unshift(head); // Add new head
        // Food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.scoreEl.textContent = `Score: ${this.score}`;
            if (this.score > this.high) {
                this.high = this.score;
                this.highEl.textContent = `High: ${this.high}`;
                localStorage.setItem('snake.high', this.high.toString());
            }
            this.spawnFood();
            if (this.score > 0 && this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
                this.setGameInterval();
            }
        }
        else {
            this.snake.pop(); // Remove tail if no food eaten
        }
        this.draw();
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw snake
        for (let i = 0; i < this.snake.length; i++) {
            this.ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635'; // Head vs body color
            this.ctx.fillRect(this.snake[i].x * CELL, this.snake[i].y * CELL, CELL, CELL);
        }
        // Draw food
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        // Draw overlay text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        if (!this.alive) {
            this.ctx.fillText('Game Over — press R to restart', this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (this.paused) {
            if (!this.started) {
                this.ctx.fillText('Press Space to start', this.canvas.width / 2, this.canvas.height / 2);
            }
            else {
                this.ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height / 2);
            }
        }
    }
    setGameInterval() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
        this.gameInterval = setInterval(() => this.update(), this.tickMs);
    }
    start() {
        if (!this.started && this.paused) {
            this.started = true;
            this.paused = false;
            this.setGameInterval();
            this.draw();
        }
    }
    togglePause() {
        if (this.alive && this.started) {
            this.paused = !this.paused;
            if (this.paused) {
                if (this.gameInterval) {
                    clearInterval(this.gameInterval);
                    this.gameInterval = null;
                }
            }
            else {
                this.setGameInterval();
            }
            this.draw();
        }
    }
    restart() {
        this.reset();
        this.draw();
    }
    gameOver() {
        this.alive = false;
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        this.draw();
    }
    setDirection(newDir) {
        if (!this.alive || this.paused)
            return;
        // Prevent reversing into self
        if ((newDir.x === -this.dir.x && newDir.y === -this.dir.y) ||
            (newDir.x === this.dir.x && newDir.y === this.dir.y)) {
            return;
        }
        this.pendingDir = newDir;
    }
}
// Top-level setup
const gameCanvas = document.getElementById('game');
const scoreDisplay = document.getElementById('score');
const highDisplay = document.getElementById('high');
const game = new Game(gameCanvas, scoreDisplay, highDisplay);
window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            game.setDirection({ x: 0, y: -1 });
            e.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            game.setDirection({ x: 0, y: 1 });
            e.preventDefault();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            game.setDirection({ x: -1, y: 0 });
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            game.setDirection({ x: 1, y: 0 });
            e.preventDefault();
            break;
        case ' ':
            if (!game['started']) { // Access private property for initial start check
                game.start();
            }
            else {
                game.togglePause();
            }
            e.preventDefault();
            break;
        case 'r':
        case 'R':
            game.restart();
            e.preventDefault();
            break;
    }
});
