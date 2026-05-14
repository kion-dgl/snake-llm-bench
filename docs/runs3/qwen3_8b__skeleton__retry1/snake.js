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
        this.high = parseInt(localStorage.getItem(HIGH_KEY) || "0", 10);
        this.resetState();
        this.render();
    }
    start() {
        if (!this.started) {
            this.started = true;
            this.paused = false;
            this.startTick();
        }
    }
    togglePause() {
        if (!this.started) {
            this.start();
        }
        else {
            this.paused = !this.paused;
            if (!this.paused) {
                this.startTick();
            }
            else {
                if (this.timer) {
                    window.clearInterval(this.timer);
                    this.timer = null;
                }
            }
        }
    }
    restart() {
        this.resetState();
        this.render();
        if (this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }
    step() {
        if (this.pendingDir) {
            const opposite = { x: -this.pendingDir.x, y: -this.pendingDir.y };
            if (this.dir.x !== opposite.x || this.dir.y !== opposite.y) {
                this.dir = this.pendingDir;
                this.pendingDir = null;
            }
        }
        const newHead = {
            x: this.snake[0].x + this.dir.x,
            y: this.snake[0].y + this.dir.y
        };
        if (this.wouldCollide(newHead, false)) {
            this.alive = false;
            return;
        }
        let newSnake = [newHead, ...this.snake.slice(0, -1)];
        if (this.food.x === newHead.x && this.food.y === newHead.y) {
            this.score++;
            this.updateScoreDom();
            if (this.score > this.high) {
                this.high = this.score;
                localStorage.setItem(HIGH_KEY, this.high.toString());
            }
            this.spawnFood();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
                if (this.timer) {
                    window.clearInterval(this.timer);
                    this.timer = window.setInterval(() => {
                        if (this.alive && !this.paused) {
                            this.step();
                        }
                    }, this.tickMs);
                }
            }
            newSnake = [newHead, ...this.snake];
        }
        this.snake = newSnake;
        this.render();
    }
    resetState() {
        this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.score = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.spawnFood();
    }
    spawnFood() {
        let newFood = null;
        while (newFood === null) {
            const x = Math.floor(Math.random() * GRID);
            const y = Math.floor(Math.random() * GRID);
            newFood = { x, y };
            if (!this.wouldCollide(newFood, false)) {
                break;
            }
        }
        if (newFood === null) {
            this.alive = false;
        }
        else {
            this.food = newFood;
        }
    }
    updateScoreDom() {
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.highEl.textContent = `High: ${this.high}`;
    }
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = COLOR_BG;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.started) {
            this.ctx.fillStyle = COLOR_TEXT;
            this.ctx.font = "20px sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("Press Space to start", this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (this.paused) {
            this.ctx.fillText("Paused", this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (!this.alive) {
            this.ctx.fillText("Game Over — press R to restart", this.canvas.width / 2, this.canvas.height / 2);
        }
        else {
            this.ctx.fillStyle = COLOR_FOOD;
            this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
            this.ctx.fillStyle = COLOR_BODY;
            for (let i = 1; i < this.snake.length; i++) {
                const seg = this.snake[i];
                this.ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
            }
            this.ctx.fillStyle = COLOR_HEAD;
            const head = this.snake[0];
            this.ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);
        }
    }
    wouldCollide(cell, willGrow) {
        const inGrid = cell.x >= 0 && cell.x < GRID && cell.y >= 0 && cell.y < GRID;
        if (!inGrid)
            return true;
        const isOccupied = this.snake.some((seg, i) => {
            if (i === this.snake.length - 1 && !willGrow) {
                return false;
            }
            return seg.x === cell.x && seg.y === cell.y;
        });
        return isOccupied;
    }
    setPendingDir(dir) {
        this.pendingDir = dir;
    }
    startTick() {
        if (this.timer)
            return;
        this.timer = window.setInterval(() => {
            if (this.alive && !this.paused) {
                this.step();
            }
        }, this.tickMs);
    }
}
// ---- top-level wiring ----
const canvas = document.getElementById("game");
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("high");
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener("keydown", (e) => {
    e.preventDefault();
    switch (e.key) {
        case "ArrowUp":
        case "w":
            game.setPendingDir({ x: 0, y: -1 });
            break;
        case "ArrowDown":
        case "s":
            game.setPendingDir({ x: 0, y: 1 });
            break;
        case "ArrowLeft":
        case "a":
            game.setPendingDir({ x: -1, y: 0 });
            break;
        case "ArrowRight":
        case "d":
            game.setPendingDir({ x: 1, y: 0 });
            break;
        case " ":
            game.togglePause();
            break;
        case "r":
            game.restart();
            break;
    }
});
