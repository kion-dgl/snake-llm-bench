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
        // TODO: load high score from localStorage key HIG_KEY (parse Number, default 0) and call this.resetState() and this.render()
        this.high = Number(localStorage.getItem(HIGH_KEY)) || 0;
        this.resetState();
        this.render();
    }
    /** Begin the game on first Space press: started=true, paused=false, start the tick interval. No-op if already started. */
    start() {
        // TODO: implement per docstring above
        if (this.started)
            return;
        this.started = true;
        this.paused = false;
        this.setTickInterval();
        this.render();
    }
    /** Toggle pause on/off during a running game. If not yet started, behave like start(). When unpausing, re-arm the interval. When pausing, clear it. */
    togglePause() {
        // TODO: implement per docstring above
        if (!this.started) {
            this.start();
            return;
        }
        this.paused = !this.paused;
        if (this.paused) {
            this.clearTickInterval();
        }
        else {
            this.setTickInterval();
        }
        this.render();
    }
    /** Full reset to the initial paused-before-start state, then render. Clears the tick interval if running. */
    restart() {
        // TODO: implement per docstring above
        this.clearTickInterval();
        this.resetState();
        this.render();
    }
    /** Apply pendingDir if it is not the opposite of the current dir, then move the snake one cell, detect wall/self collisions, handle food, and render. Called once per tick interval. */
    step() {
        // TODO: implement per docstring above. On food: grow (don't pop tail), score++, update high if needed, spawn new food, and after every SPEEDUP_EVERY foods reduce tickMs by SPEEDUP_DELTA (floor MIN_TICK_MS) by rearming the interval. On wall/self collision: set alive=false, clear interval, render game-over overlay.
        if (this.pendingDir) {
            const isOpposite = (this.pendingDir.x === -this.dir.x && this.pendingDir.y === -this.dir.y);
            if (!isOpposite) {
                this.dir = this.pendingDir;
            }
            this.pendingDir = null;
        }
        const head = this.snake[0];
        const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };
        // Check for wall collision
        if (newHead.x < 0 ||
            newHead.x >= GRID ||
            newHead.y < 0 ||
            newHead.y >= GRID) {
            this.alive = false;
            this.clearTickInterval();
            this.render();
            return;
        }
        // Check for self collision
        for (let i = 0; i < this.snake.length - (this.snake.length > 1 && this.snake[this.snake.length - 1].x === this.food.x && this.snake[this.snake.length - 1].y === this.food.y ? 0 : 1); i++) {
            if (newHead.x === this.snake[i].x && newHead.y === this.snake[i].y) {
                this.alive = false;
                this.clearTickInterval();
                this.render();
                return;
            }
        }
        this.snake.unshift(newHead); // Add new head
        // Check for food
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score++;
            if (this.score > this.high) {
                this.high = this.score;
                localStorage.setItem(HIGH_KEY, this.high.toString());
            }
            this.spawnFood();
            this.updateScoreDom();
            if (this.score % SPEEDUP_EVERY === 0) {
                this.tickMs = Math.max(MIN_TICK_MS, this.tickMs - SPEEDUP_DELTA);
                this.setTickInterval(); // Re-arm with new speed
            }
        }
        else {
            this.snake.pop(); // Remove tail if no food
        }
        this.render();
    }
    /** Set snake (length 3 at (10,10), (9,10), (8,10) moving right), reset dir/pendingDir/score/tickMs/alive/started/paused, spawn food. */
    resetState() {
        // TODO: implement per docstring above
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
    /** Pick a random Cell that is not currently occupied by the snake. If no empty cell, treat as win (alive=false, render). */
    spawnFood() {
        // TODO: implement per docstring above
        const emptyCells = [];
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                let isOccupied = false;
                for (const segment of this.snake) {
                    if (segment.x === x && segment.y === y) {
                        isOccupied = true;
                        break;
                    }
                }
                if (!isOccupied) {
                    emptyCells.push({ x, y });
                }
            }
        }
        if (emptyCells.length === 0) {
            this.alive = false; // Win condition
            this.clearTickInterval();
            this.render();
            return;
        }
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        this.food = emptyCells[randomIndex];
    }
    /** Update the score and high DOM elements with "Score: N" / "High: N". */
    updateScoreDom() {
        // TODO: implement per docstring above
        this.scoreEl.textContent = `Score: ${this.score}`;
        this.highEl.textContent = `High: ${this.high}`;
    }
    /** Clear and redraw the board: black bg, food, snake body, snake head (distinct color). On not-yet-started, draw centered "Press Space to start". On paused (after first start), draw centered "Paused". On game-over, draw centered "Game Over — press R to restart". Text 20px sans-serif white, centered. */
    render() {
        // TODO: implement per docstring above
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = COLOR_BG;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw food
        this.ctx.fillStyle = COLOR_FOOD;
        this.ctx.fillRect(this.food.x * CELL, this.food.y * CELL, CELL, CELL);
        // Draw snake body
        this.ctx.fillStyle = COLOR_BODY;
        for (let i = 1; i < this.snake.length; i++) {
            this.ctx.fillRect(this.snake[i].x * CELL, this.snake[i].y * CELL, CELL, CELL);
        }
        // Draw snake head
        this.ctx.fillStyle = COLOR_HEAD;
        this.ctx.fillRect(this.snake[0].x * CELL, this.snake[0].y * CELL, CELL, CELL);
        this.ctx.fillStyle = COLOR_TEXT;
        this.ctx.font = "20px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        if (!this.started) {
            this.ctx.fillText("Press Space to start", this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (this.paused) {
            this.ctx.fillText("Paused", this.canvas.width / 2, this.canvas.height / 2);
        }
        else if (!this.alive) {
            this.ctx.fillText("Game Over — press R to restart", this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    /** True iff `cell` lies inside the grid AND is not occupied by `snake` (excluding the soon-to-vacate tail when not growing). */
    wouldCollide(cell, willGrow) {
        // TODO: implement per docstring above
        if (cell.x < 0 || cell.x >= GRID || cell.y < 0 || cell.y >= GRID) {
            return true; // Wall collision
        }
        for (let i = 0; i < this.snake.length - (willGrow ? 0 : 1); i++) {
            if (cell.x === this.snake[i].x && cell.y === this.snake[i].y) {
                return true; // Self collision
            }
        }
        return false;
    }
    setPendingDir(dir) {
        this.pendingDir = dir;
    }
    setTickInterval() {
        this.clearTickInterval();
        this.timer = window.setInterval(() => this.step(), this.tickMs);
    }
    clearTickInterval() {
        if (this.timer !== null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }
}
// ---- top-level wiring (fill in) ----
// TODO: get the canvas, score, high elements from the DOM by id ("game", "score", "high"); cast to HTMLCanvasElement / HTMLElement
// TODO: create `const game = new Game(canvas, scoreEl, highEl);`
// TODO: install a `keydown` listener on `window` that maps arrow keys + WASD to direction vectors, Space to game.togglePause(), R to game.restart(). Call e.preventDefault() on handled keys. For direction presses, set game's pending direction. (Hint: you may need a small public method on Game to accept a pending direction, OR you can re-architect minimally — but keep the three public methods above unchanged.)
const canvas = document.getElementById("game");
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("high");
const game = new Game(canvas, scoreEl, highEl);
window.addEventListener("keydown", (e) => {
    let handled = true;
    let newDir = null;
    switch (e.key) {
        case "ArrowUp":
        case "w":
            newDir = { x: 0, y: -1 };
            break;
        case "ArrowDown":
        case "s":
            newDir = { x: 0, y: 1 };
            break;
        case "ArrowLeft":
        case "a":
            newDir = { x: -1, y: 0 };
            break;
        case "ArrowRight":
        case "d":
            newDir = { x: 1, y: 0 };
            break;
        case " ":
            game.togglePause();
            break;
        case "r":
            game.restart();
            break;
        default:
            handled = false;
            break;
    }
    if (newDir) {
        game.setPendingDir(newDir);
    }
    if (handled) {
        e.preventDefault();
    }
});
