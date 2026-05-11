"use strict";
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
    tickId = null;
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        const storedHigh = localStorage.getItem('snake.high');
        this.high = storedHigh ? parseInt(storedHigh, 10) : 0;
        this.updateHighDisplay();
        this.restart();
    }
    start() {
        if (this.started && this.paused) {
            this.paused = false;
            this.tick();
        }
        else if (!this.started) {
            this.started = true;
            this.paused = false;
            this.tick();
        }
    }
    togglePause() {
        if (!this.started || !this.alive)
            return;
        this.paused = !this.paused;
        if (!this.paused) {
            this.tick();
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
        this.updateScoreDisplay();
        this.spawnFood();
        this.draw();
    }
    spawnFood() {
        let valid = false;
        let x, y;
        while (!valid) {
            x = Math.floor(Math.random() * GRID);
            y = Math.floor(Math.random() * GRID);
            valid = true;
            for (const segment of this.snake) {
                if (segment.x === x && segment.y === y) {
                    valid = false;
                    break;
                }
            }
        }
        this.food = { x, y };
    }
    tick() {
        if (this.tickId) {
            window.clearTimeout(this.tickId);
        }
        if (this.paused || !this.alive) {
            this.draw();
            return;
        }
        if (this.pendingDir) {
            if (this.pendingDir.x !== -this.dir.x || this.pendingDir.y !== -this.dir.y) {
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
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (newHead.x === this.snake[i].x && newHead.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }
        this.snake.unshift(newHead);
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score++;
            this.updateScoreDisplay();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
            }
            this.spawnFood();
        }
        else {
            this.snake.pop();
        }
        this.draw();
        this.tickId = window.setTimeout(() => this.tick(), this.tickMs);
    }
    gameOver() {
        this.alive = false;
        this.paused = true;
        if (this.score > this.high) {
            this.high = this.score;
            localStorage.setItem('snake.high', this.high.toString());
            this.updateHighDisplay();
        }
        this.draw();
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
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            this.ctx.fillStyle = i === 0 ? '#7ed957' : '#3aa635';
            this.ctx.fillRect(segment.x * CELL, segment.y * CELL, CELL, CELL);
        }
        if (!this.started) {
            this.drawOverlay('Press Space to start');
        }
        else if (this.paused) {
            this.drawOverlay('Paused');
        }
        else if (!this.alive) {
            this.drawOverlay('Game Over — press R to restart');
        }
    }
    drawOverlay(text) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }
    setDirection(x, y) {
        if (this.paused || !this.started || !this.alive)
            return;
        if (x === -this.dir.x && y === -this.dir.y)
            return;
        this.pendingDir = { x, y };
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
            if (!game.started) {
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
