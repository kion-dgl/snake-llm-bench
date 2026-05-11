const TILE_SIZE = 20;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const MOVE_INTERVAL = 100;
const canvas = document.getElementById("game");
const ctxMaybe = canvas.getContext("2d");
if (!ctxMaybe) {
    throw new Error("Unable to get 2D context");
}
const ctx = ctxMaybe;
const scoreEl = document.getElementById("score");
let snake = [];
let food = { x: 0, y: 0 };
let dx = 1;
let dy = 0;
let nextDx = 1;
let nextDy = 0;
let score = 0;
let gameOver = false;
let lastMoveTime = 0;
function placeFood() {
    let x;
    let y;
    do {
        x = Math.floor(Math.random() * GRID_WIDTH);
        y = Math.floor(Math.random() * GRID_HEIGHT);
    } while (snake.some((seg) => seg.x === x && seg.y === y));
    food = { x, y };
}
function reset() {
    snake = [{ x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) }];
    dx = 1;
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    score = 0;
    gameOver = false;
    lastMoveTime = 0;
    placeFood();
}
function move() {
    dx = nextDx;
    dy = nextDy;
    const head = snake[0];
    const newHead = { x: head.x + dx, y: head.y + dy };
    if (newHead.x < 0 ||
        newHead.x >= GRID_WIDTH ||
        newHead.y < 0 ||
        newHead.y >= GRID_HEIGHT) {
        gameOver = true;
        return;
    }
    if (snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        gameOver = true;
        return;
    }
    snake.unshift(newHead);
    if (newHead.x === food.x && newHead.y === food.y) {
        score += 1;
        placeFood();
    }
    else {
        snake.pop();
    }
}
function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(food.x * TILE_SIZE, food.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.fillStyle = "#2ecc71";
    for (const seg of snake) {
        ctx.fillRect(seg.x * TILE_SIZE, seg.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    if (gameOver) {
        ctx.fillStyle = "#fff";
        ctx.font = "30px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
    }
    scoreEl.textContent = String(score);
}
function gameLoop(timestamp) {
    if (!lastMoveTime) {
        lastMoveTime = timestamp;
    }
    if (timestamp - lastMoveTime >= MOVE_INTERVAL) {
        if (!gameOver) {
            move();
        }
        lastMoveTime = timestamp;
    }
    draw();
    requestAnimationFrame(gameLoop);
}
window.addEventListener("keydown", (e) => {
    if (gameOver) {
        if (e.key === " ") {
            reset();
        }
        return;
    }
    switch (e.key) {
        case "ArrowUp":
            if (dy === 0) {
                nextDx = 0;
                nextDy = -1;
            }
            break;
        case "ArrowDown":
            if (dy === 0) {
                nextDx = 0;
                nextDy = 1;
            }
            break;
        case "ArrowLeft":
            if (dx === 0) {
                nextDx = -1;
                nextDy = 0;
            }
            break;
        case "ArrowRight":
            if (dx === 0) {
                nextDx = 1;
                nextDy = 0;
            }
            break;
    }
});
reset();
requestAnimationFrame(gameLoop);
