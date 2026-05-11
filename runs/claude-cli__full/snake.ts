type Point = { x: number; y: number };
type Dir = { x: number; y: number };

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const scoreEl = document.getElementById("score") as HTMLSpanElement;

const CELL = 20;
const COLS = canvas.width / CELL;
const ROWS = canvas.height / CELL;
const TICK_MS = 100;

let snake: Point[] = [];
let dir: Dir = { x: 1, y: 0 };
let pendingDir: Dir = { x: 1, y: 0 };
let food: Point = { x: 0, y: 0 };
let score = 0;
let gameOver = false;
let lastTick = 0;

function placeFood(): void {
  while (true) {
    const f: Point = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) {
      food = f;
      return;
    }
  }
}

function reset(): void {
  snake = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  dir = { x: 1, y: 0 };
  pendingDir = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  scoreEl.textContent = "0";
  placeFood();
}

function step(): void {
  if (gameOver) return;
  dir = pendingDir;
  const head: Point = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    gameOver = true;
    return;
  }
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver = true;
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = String(score);
    placeFood();
  } else {
    snake.pop();
  }
}

function draw(): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#e33";
  ctx.fillRect(food.x * CELL, food.y * CELL, CELL, CELL);

  ctx.fillStyle = "#4f4";
  for (const s of snake) {
    ctx.fillRect(s.x * CELL, s.y * CELL, CELL - 1, CELL - 1);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px sans-serif";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 20);
  }
}

function loop(ts: number): void {
  if (ts - lastTick >= TICK_MS) {
    lastTick = ts;
    step();
    draw();
  }
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e: KeyboardEvent) => {
  switch (e.key) {
    case "ArrowUp":
      if (dir.y !== 1) pendingDir = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      if (dir.y !== -1) pendingDir = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      if (dir.x !== 1) pendingDir = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      if (dir.x !== -1) pendingDir = { x: 1, y: 0 };
      break;
    case "r":
    case "R":
      reset();
      break;
  }
});

reset();
requestAnimationFrame(loop);