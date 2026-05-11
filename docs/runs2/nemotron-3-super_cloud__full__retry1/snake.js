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
    tickId;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        // definite initialization for strictPropertyInitialization
        this.food = { x: 0, y: 0 };
        this.score = 0;
        const stored = localStorage.getItem('snake.high');
        this.high = stored !== null ? Number(stored) : 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.tickId = null;
        this.spawnFood();
        this.updateScoreDisplay();
        this.updateHighDisplay();
        this.draw();
    }
    start() {
        if (!this.started) {
            this.started = true;
            this.paused = false;
            this.tick();
        }
        else if (this.paused) {
            this.paused = false;
            this.tick();
        }
    }
    togglePause() {
        if (!this.started)
            return;
        this.paused = !this.paused;
        if (!this.paused) {
            this.tick();
        }
        else {
            this.clearTick();
        }
    }
    restart() {
        this.clearTick();
        this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.spawnFood();
        this.score = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.updateScoreDisplay();
        this.updateHighDisplay();
        this.draw();
    }
    setDirection(newDir) {
        if (this.dir.x === -newDir.x && this.dir.y === -newDir.y)
            return;
        this.pendingDir = newDir;
    }
    tick() {
        if (this.alive && !this.paused) {
            this.update();
            this.draw();
            this.tickId = setTimeout(() => this.tick(), this.tickMs);
        }
    }
    clearTick() {
        if (this.tickId !== null) {
            clearTimeout(this.tickId);
            this.tickId = null;
        }
    }
    update() {
        if (this.pendingDir !== null) {
            this.dir = this.pendingDir;
            this.pendingDir = null;
        }
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
        // Wall collision
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
            this.gameOver();
            return;
        }
        // Self collision (ignore tail that will move)
        for (let i = 0; i < this.snake.length - 1; i++) {
            const seg = this.snake[i];
            if (seg.x === head.x && seg.y === head.y) {
                this.gameOver();
                return;
            }
        }
        // Eat food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
            if (this.score > this.high) {
                this.high = this.score;
                localStorage.setItem('snake.high', this.high.toString());
                this.updateHighDisplay();
            }
            this.spawnFood();
            this.snake.unshift(head);
        }
        else {
            this.snake.unshift(head);
            this.snake.pop();
        }
        this.updateScoreDisplay();
    }
    gameOver() {
        this.alive = false;
        this.clearTick();
        this.draw();
    }
    spawnFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID)
            };
        } while (this.snake.some(c => c.x === newFood.x && c.y === newFood.y));
        this.food = newFood;
    }
    updateScoreDisplay() {
        this.scoreEl.textContent = `Score: ${this.score}`;
    }
    updateHighDisplay() {
        this.highEl.textContent = `High: ${this.high}`;
    }
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i = 1; i < this.snake.length; i++) {
            const seg = this.snake[i];
            this.ctx.fillStyle = '#3aa635';
            this.ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
        }
        const head = this.snake[0];
        this.ctx.fillStyle = '#7ed957';
        this.ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        if (!this.started) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Press Space to start', this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (!this.alive) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Game Over — press R to restart', this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (this.paused) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
}
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener('keydown', e => {
    const key = e.key;
    let prevent = false;
    switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            game.setDirection({ x: 0, y: -1 });
            prevent = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            game.setDirection({ x: 0, y: 1 });
            prevent = true;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            game.setDirection({ x: -1, y: 0 });
            prevent = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            game.setDirection({ x: 1, y: 0 });
            prevent = true;
            break;
        case ' ':
            e.preventDefault();
            if (!game.started) {
                game.start();
            }
            else {
                game.togglePause();
            }
            return;
        case 'r':
        case 'R':
            e.preventDefault();
            game.restart();
            return;
    }
    if (prevent) {
        e.preventDefault();
    }
});
