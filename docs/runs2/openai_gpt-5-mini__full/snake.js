"use strict";
const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5; // apples
const SPEEDUP_DELTA = 10; // ms
class Game {
    // Public interface
    constructor(canvas, scoreEl, highEl) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Canvas not supported');
        this.ctx = ctx;
        this.scoreEl = scoreEl;
        this.highEl = highEl;
        // Load high from provided highEl text if already loaded externally
        this.high = Game.loadHigh();
        // Initialize state
        this.restart();
        // Initial render (paused before first start)
        this.draw();
    }
    start() {
        if (this.started) {
            // If already started but paused, resume
            if (!this.alive)
                return;
            if (!this.paused)
                return;
            this.paused = false;
            this.startTick();
            this.draw();
            return;
        }
        // First start
        this.started = true;
        this.paused = false;
        this.startTick();
        this.draw();
    }
    togglePause() {
        if (!this.started || !this.alive)
            return;
        this.paused = !this.paused;
        if (this.paused) {
            this.stopTick();
            this.draw();
        }
        else {
            this.startTick();
        }
    }
    restart() {
        // stop any running tick
        this.stopTick();
        // initial snake: head at (10,10), body at (9,10),(8,10), moving right
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
        this.paused = true;
        this.intervalId = null;
        // spawn initial food
        this.food = this.spawnFood();
        // update DOM
        this.updateScore();
        this.updateHigh();
        // draw initial paused-before-start screen
        this.draw();
    }
    // Private / internal
    // state fields (public shape required in spec comment)
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
    // internal helpers
    canvas;
    ctx;
    scoreEl;
    highEl;
    intervalId = null;
    static loadHigh() {
        const s = localStorage.getItem('snake.high');
        const n = s ? parseInt(s, 10) : 0;
        return Number.isFinite(n) ? n : 0;
    }
    saveHigh() {
        localStorage.setItem('snake.high', String(this.high));
    }
    updateScore() {
        this.scoreEl.textContent = `Score: ${this.score}`;
    }
    updateHigh() {
        this.highEl.textContent = `High: ${this.high}`;
    }
    startTick() {
        if (this.intervalId != null)
            return;
        // Use arrow to bind 'this'
        this.intervalId = window.setInterval(() => this.tick(), this.tickMs);
    }
    stopTick() {
        if (this.intervalId != null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    restartTickIfNeeded(newMs) {
        if (newMs === this.tickMs)
            return;
        this.tickMs = newMs;
        if (this.intervalId != null) {
            // restart interval with new ms
            this.stopTick();
            this.startTick();
        }
    }
    spawnFood() {
        const occupied = new Set();
        for (const s of this.snake)
            occupied.add(`${s.x},${s.y}`);
        let tries = 0;
        while (true) {
            const x = Math.floor(Math.random() * GRID);
            const y = Math.floor(Math.random() * GRID);
            const key = `${x},${y}`;
            if (!occupied.has(key))
                return { x, y };
            tries++;
            // fallback: if too many tries (snake occupies almost all), brute force find free cell
            if (tries > 1000) {
                for (let yy = 0; yy < GRID; yy++) {
                    for (let xx = 0; xx < GRID; xx++) {
                        const k2 = `${xx},${yy}`;
                        if (!occupied.has(k2))
                            return { x: xx, y: yy };
                    }
                }
            }
        }
    }
    tick() {
        if (!this.alive || this.paused)
            return;
        // apply pending direction if any (but prevent exact reverse was already handled on key)
        if (this.pendingDir) {
            this.dir = this.pendingDir;
            this.pendingDir = null;
        }
        const head = this.snake[0];
        const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };
        // wall collision
        if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
            this.die();
            return;
        }
        // determine if will grow (if food eaten)
        const willGrow = (newHead.x === this.food.x && newHead.y === this.food.y);
        // Tail cell that will be vacated (if not growing)
        const tail = this.snake[this.snake.length - 1];
        const allowedTail = willGrow ? null : tail;
        // self-collision: check any segment equal to newHead, except allowedTail
        for (let i = 0; i < this.snake.length; i++) {
            const seg = this.snake[i];
            if (seg.x === newHead.x && seg.y === newHead.y) {
                if (allowedTail && seg.x === allowedTail.x && seg.y === allowedTail.y) {
                    // allowed (chase tail by one)
                }
                else {
                    this.die();
                    return;
                }
            }
        }
        // move: add head
        this.snake.unshift(newHead);
        if (!willGrow) {
            this.snake.pop();
        }
        else {
            // ate food
            this.score += 1;
            if (this.score > this.high) {
                this.high = this.score;
                this.saveHigh();
            }
            this.updateScore();
            this.updateHigh();
            // spawn new food
            this.food = this.spawnFood();
            // adjust speed
            const speedSteps = Math.floor(this.score / SPEEDUP_EVERY);
            const newMs = Math.max(MIN_TICK_MS, INITIAL_TICK_MS - speedSteps * SPEEDUP_DELTA);
            this.restartTickIfNeeded(newMs);
        }
        // redraw
        this.draw();
    }
    die() {
        this.alive = false;
        this.stopTick();
        this.drawGameOver();
    }
    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    drawGridCell(cell, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
    }
    draw() {
        // If game over, drawGameOver will be invoked separately; but draw should also render final board if not over or paused.
        this.clear();
        // draw food
        this.drawGridCell(this.food, '#c0392b');
        // draw snake body & head
        for (let i = this.snake.length - 1; i >= 0; i--) {
            const seg = this.snake[i];
            if (i === 0) {
                // head
                this.drawGridCell(seg, '#7ed957');
            }
            else {
                this.drawGridCell(seg, '#3aa635');
            }
        }
        // overlays
        if (!this.started && this.paused) {
            this.drawCenteredText('Press Space to start');
        }
        else if (this.paused && this.started && this.alive) {
            this.drawCenteredText('Paused');
        }
        else if (!this.alive) {
            this.drawGameOver();
        }
    }
    drawCenteredText(text) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, (GRID * CELL) / 2, (GRID * CELL) / 2);
    }
    drawGameOver() {
        // draw board (already drawn by draw or tick), then overlay
        this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Game Over — press R to restart', (GRID * CELL) / 2, (GRID * CELL) / 2);
    }
    // external controls used by key handler
    handleDirectionInput(d) {
        // ignore reverse of current direction
        if (d.x === -this.dir.x && d.y === -this.dir.y) {
            return;
        }
        this.pendingDir = d;
    }
}
// Top-level setup
const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const game = new Game(canvas, scoreEl, highEl);
// Key handling
window.addEventListener('keydown', (e) => {
    const key = e.key;
    const handledKeys = new Set([
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
        ' ', 'Spacebar', 'r', 'R'
    ]);
    if (!handledKeys.has(key))
        return;
    // prevent default for handled keys
    e.preventDefault();
    if (key === ' ' || key === 'Spacebar') {
        if (!game.started) {
            game.start();
        }
        else {
            game.togglePause();
        }
        return;
    }
    if (key === 'r' || key === 'R') {
        game.restart();
        return;
    }
    // direction keys
    let dir = null;
    if (key === 'ArrowUp' || key === 'w' || key === 'W')
        dir = { x: 0, y: -1 };
    else if (key === 'ArrowDown' || key === 's' || key === 'S')
        dir = { x: 0, y: 1 };
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A')
        dir = { x: -1, y: 0 };
    else if (key === 'ArrowRight' || key === 'd' || key === 'D')
        dir = { x: 1, y: 0 };
    if (dir) {
        game.handleDirectionInput(dir);
        // If game is paused-before-start, do not auto-start; direction just set.
        // If paused after start, direction should be queued but game remains paused.
        // If running, direction will apply on next tick.
    }
});
