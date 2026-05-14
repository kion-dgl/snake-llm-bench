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
        this.high = Number(localStorage.getItem(HIGH_KEY) ?? 0);
        this.resetState();
        this.render();
    }
    /** Begin the game on first Space press: started=true, paused=false, start the tick interval. No-op if already started. */
    start() {
        if (this.started)
            return;
        this.started = true;
        this.paused = false;
        this.tickMs = INITIAL_TICK_MS;
        this.timer = setInterval(() => this.step(), this.tickMs);
    }
    /** Toggle pause on/off during a running game. If not yet started, behave like start(). When unpausing, re-arm the interval. When pausing, clear it. */
    togglePause() {
        if (!this.started)
            return this.start();
        this.paused = !this.paused;
        if (this.paused) {
            clearInterval(this.timer);
        }
        else {
            this.timer = setInterval(() => this.step(), this.tickMs);
        }
    }
    /** Full reset to the initial paused-before-start state, then render. Clears the tick interval if running. */
    restart() {
        clearInterval(this.timer);
        this.resetState();
        this.render();
    }
    /** Apply pendingDir if it is not the opposite of the current dir, then move the snake one cell, detect wall/self collisions, handle food, and render. Called once per tick interval. */
    step() {
        if (this.pendingDir) {
            if (this.dir.x * this.pendingDir.x + this.dir.y * this.pendingDir.y !== -1) {
                this.dir = this.pendingDir;
                this.pendingDir = null;
            }
        }
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
        this.snake.unshift(head);
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || this.snake.slice(1).some(cell => cell.x === head.x && cell.y === head.y)) {
            this.alive = false;
            clearInterval(this.timer);
            this.render();
            return;
        }
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.updateScoreDom();
            if (this.score > this.high) {
                this.high = this.score;
                localStorage.setItem(HIGH_KEY, String(this.high));
                this.highEl.textContent = `High: ${this.high}`;
            }
            this.spawnFood();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(this.tickMs - SPEEDUP_DELTA, MIN_TICK_MS);
                clearInterval(this.timer);
                this.timer = setInterval(() => this.step(), this.tickMs);
            }
        }
        else {
            this.snake.pop();
        }
        this.render();
    }
    /** Set snake (length 3 at (10,10), (9,10), (8,10) moving right), reset dir/pendingDir/score/tickMs/alive/started/paused, spawn food. */
    resetState() {
        this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this.dir = { x: 1, y: 0 };
        this.pendingDir = null;
        this.score = 0;
        this.tickMs = INITIAL_TICK_MS;
        this.alive = true;
        this.started = false;
        this.paused = true;
        this.updateScoreDom();
        this.spawnFood();
    }
    /** Pick a random Cell that is not currently occupied by the snake. If no empty cell, treat as win (alive=false, render). */
    spawnFood() {
        let emptyCells = [];
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                if (!this.snake.some(cell => cell.x === x && cell.y === y)) {
                    emptyCells.push({ x, y });
                }
            }
        }
        if (emptyCells.length === 0) {
            this.alive = false;
            clearInterval(this.timer);
            this.render();
            return;
        }
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        this.food = emptyCells[randomIndex];
    }
    /** Update the score and high DOM elements with "Score: N" / "High: N". */
    updateScoreDom() {
        this.scoreEl.textContent = `Score: ${this.score}`;
    }
    /** Clear and redraw the board: black bg, food, snake body, snake head (distinct color). On not-yet-started, draw centered "Press Space to start". On paused (after first start), draw centered "Paused". On game-over, draw centered "Game Over — press R to restart". Text 20px sans-serif white, centered. */
    render() {
        this.ctx.fillStyle = COLOR_BG;
        this.ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);
        this.ctx.fillStyle = COLOR_FOOD;
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        for (let i = 0; i < this.snake.length; i++) {
            const cell = this.snake[i];
            this.ctx.fillStyle = i === 0 ? COLOR_HEAD : COLOR_BODY;
            this.ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
        }
        if (!this.started) {
            this.ctx.font = '20px sans-serif';
            this.ctx.fillStyle = COLOR_TEXT;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Press Space to start', GRID * CELL / 2, GRID * CELL / 2);
        }
        else if (this.paused) {
            this.ctx.font = '20px sans-serif';
            this.ctx.fillStyle = COLOR_TEXT;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Paused', GRID * CELL / 2, GRID * CELL / 2);
        }
        else if (!this.alive) {
            this.ctx.font = '20px sans-serif';
            this.ctx.fillStyle = COLOR_TEXT;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Game Over — press R to restart', GRID * CELL / 2, GRID * CELL / 2);
        }
    }
    /** True iff `cell` lies inside the grid AND is not occupied by `snake` (excluding the soon-to-vacate tail when not growing). */
    wouldCollide(cell, willGrow) {
        if (cell.x < 0 || cell.x >= GRID || cell.y < 0 || cell.y >= GRID)
            return true;
        if (willGrow) {
            return this.snake.some(snakeCell => snakeCell.x === cell.x && snakeCell.y === cell.y);
        }
        else {
            return this.snake.slice(1).some(snakeCell => snakeCell.x === cell.x && snakeCell.y === cell.y);
        }
    }
    setPendingDir(dir) {
        this.pendingDir = dir;
    }
}
// ---- top-level wiring (fill in) ----
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            game.setPendingDir({ x: 0, y: -1 });
            break;
        case 'ArrowDown':
            game.setPendingDir({ x: 0, y: 1 });
            break;
        case 'ArrowLeft':
            game.setPendingDir({ x: -1, y: 0 });
            break;
        case 'ArrowRight':
            game.setPendingDir({ x: 1, y: 0 });
            break;
        case 'w':
            game.setPendingDir({ x: 0, y: -1 });
            break;
        case 's':
            game.setPendingDir({ x: 0, y: 1 });
            break;
        case 'a':
            game.setPendingDir({ x: -1, y: 0 });
            break;
        case 'd':
            game.setPendingDir({ x: 1, y: 0 });
            break;
        case ' ':
            game.togglePause();
            break;
        case 'r':
            game.restart();
            break;
        default:
            break;
    }
    e.preventDefault();
});
