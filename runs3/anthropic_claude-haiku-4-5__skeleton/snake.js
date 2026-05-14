"use strict";
const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;
const SPEEDUP_DELTA = 10;
const COLOR_BG = "#000";
const COLOR_BODY = "#3aa635";
const COLOR_HEAD = "#7ed957";
const COLOR_FOOD = "#c0392b";
const COLOR_TEXT = "#fff";
const HIGH_KEY = "snake.high";
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
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("no 2d context");
        this.ctx = ctx;
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        const stored = localStorage.getItem(HIGH_KEY);
        this.high = stored ? Number(stored) : 0;
        this.resetState();
        this.render();
    }
    setPendingDir(d) {
        this.pendingDir = d;
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        this.paused = false;
        this.timer = window.setInterval(() => this.step(), this.tickMs);
    }
    togglePause() {
        if (!this.started) {
            this.start();
            return;
        }
        this.paused = !this.paused;
        if (this.paused) {
            if (this.timer !== null) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }
        else {
            this.timer = window.setInterval(() => this.step(), this.tickMs);
        }
        this.render();
    }
    restart() {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.resetState();
        this.render();
    }
    step() {
        if (this.pendingDir !== null) {
            const opposite = (this.dir.x === -this.pendingDir.x && this.dir.y === -this.pendingDir.y);
            if (!opposite) {
                this.dir = this.pendingDir;
            }
            this.pendingDir = null;
        }
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.dir.x,
            y: head.y + this.dir.y,
        };
        const willGrow = newHead.x === this.food.x && newHead.y === this.food.y;
        if (this.wouldCollide(newHead, willGrow)) {
            this.alive = false;
            if (this.timer !== null) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.render();
            return;
        }
        this.snake.unshift(newHead);
        if (willGrow) {
            this.score++;
            if (this.score > this.high) {
                this.high = this.score;
                localStorage.setItem(HIGH_KEY, String(this.high));
            }
            this.updateScoreDom();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
                if (this.timer !== null) {
                    clearInterval(this.timer);
                    this.timer = window.setInterval(() => this.step(), this.tickMs);
                }
            }
            this.spawnFood();
        }
        else {
            this.snake.pop();
        }
        this.render();
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
        this.paused = false;
        this.spawnFood();
        this.updateScoreDom();
    }
    spawnFood() {
        let food;
        let found = false;
        for (let attempts = 0; attempts < 1000; attempts++) {
            food = {
                x: Math.floor(Math.random() * GRID),
                y: Math.floor(Math.random() * GRID),
            };
            if (!this.snake.some(cell => cell.x === food.x && cell.y === food.y)) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.alive = false;
            if (this.timer !== null) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.render();
            return;
        }
        this.food = food;
    }
    updateScoreDom() {
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.highEl.textContent = `High: ${this.high}`;
    }
    render() {
        this.ctx.fillStyle = COLOR_BG;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = COLOR_FOOD;
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        this.ctx.fillStyle = COLOR_BODY;
        for (let i = 1; i < this.snake.length; i++) {
            const cell = this.snake[i];
            this.ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
        }
        this.ctx.fillStyle = COLOR_HEAD;
        const head = this.snake[0];
        this.ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);
        this.ctx.fillStyle = COLOR_TEXT;
        this.ctx.font = "20px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        if (!this.started) {
            this.ctx.fillText("Press Space to start", centerX, centerY);
        }
        else if (this.paused) {
            this.ctx.fillText("Paused", centerX, centerY);
        }
        else if (!this.alive) {
            this.ctx.fillText("Game Over — press R to restart", centerX, centerY);
        }
    }
    wouldCollide(cell, willGrow) {
        if (cell.x < 0 || cell.x >= GRID || cell.y < 0 || cell.y >= GRID) {
            return true;
        }
        for (let i = 0; i < this.snake.length; i++) {
            const bodyCell = this.snake[i];
            if (willGrow || i < this.snake.length - 1) {
                if (bodyCell.x === cell.x && bodyCell.y === cell.y) {
                    return true;
                }
            }
        }
        return false;
    }
}
const canvas = document.getElementById("game");
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("high");
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "arrowup" || key === "w") {
        e.preventDefault();
        game.setPendingDir({ x: 0, y: -1 });
    }
    else if (key === "arrowdown" || key === "s") {
        e.preventDefault();
        game.setPendingDir({ x: 0, y: 1 });
    }
    else if (key === "arrowleft" || key === "a") {
        e.preventDefault();
        game.setPendingDir({ x: -1, y: 0 });
    }
    else if (key === "arrowright" || key === "d") {
        e.preventDefault();
        game.setPendingDir({ x: 1, y: 0 });
    }
    else if (key === " ") {
        e.preventDefault();
        game.togglePause();
    }
    else if (key === "r") {
        e.preventDefault();
        game.restart();
    }
});
