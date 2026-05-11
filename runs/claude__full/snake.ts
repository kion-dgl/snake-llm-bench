type Cell = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const TICK_MS = 120;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score") as HTMLDivElement;

if (!ctx) throw new Error("no 2d context");

let snake: Cell[] = [];
let dir: Cell = { x: 1, y: 0 };
let pendingDir: Cell | null = null;
let food: Cell = { x: 0, y: 0 };
let score = 0;
let alive = true;
let won = false;
let timer: number | null = null;

function reset(): void {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  dir = { x: 1, y: 0 };
  pendingDir = null;
  score = 0;
  alive = true;
  won = false;
  spawnFood();
  updateScore();
  if (timer !== null) clearInterval(timer);
  timer = window.setInterval(tick, TICK_MS);
  render();
}

function updateScore(): void {
  scoreEl.textContent = `Score: ${score}`;
}

function eq(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

function spawnFood(): void {
  const occupied = new Set(snake.map((c) => `${c.x},${c.y}`));
  const free: Cell[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) {
    won = true;
    alive = false;
    return;
  }
  const pick = free[Math.floor(Math.random() * free.length)];
  food = pick!;
}

function tick(): void {
  if (!alive) return;

  if (pendingDir) {
    if (pendingDir.x !== -dir.x || pendingDir.y !== -dir.y) {
      dir = pendingDir;
    }
    pendingDir = null;
  }

  const head = snake[0]!;
  const next: Cell = { x: head.x + dir.x, y: head.y + dir.y };

  if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
    alive = false;
    render();
    return;
  }

  const willEat = eq(next, food);
  const body = willEat ? snake : snake.slice(0, -1);
  for (const c of body) {
    if (eq(c, next)) {
      alive = false;
      render();
      return;
    }
  }

  snake = [next, ...body];

  if (willEat) {
    score += 1;
    updateScore();
    spawnFood();
  }

  render();
}

function render(): void {
  if (!ctx) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#c0392b";
  ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);

  for (let i = 0; i < snake.length; i++) {
    const c = snake[i]!;
    ctx.fillStyle = i === 0 ? "#7ed957" : "#3aa635";
    ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
  }

  if (!alive) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillText(won ? "You win!" : "Game Over", canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 18);
  }
}

function keyToDir(key: string): Cell | null {
  switch (key) {
    case "ArrowUp": case "w": case "W": return { x: 0, y: -1 };
    case "ArrowDown": case "s": case "S": return { x: 0, y: 1 };
    case "ArrowLeft": case "a": case "A": return { x: -1, y: 0 };
    case "ArrowRight": case "d": case "D": return { x: 1, y: 0 };
    default: return null;
  }
}

window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "r" || e.key === "R") {
    reset();
    e.preventDefault();
    return;
  }
  const d = keyToDir(e.key);
  if (d) {
    pendingDir = d;
    e.preventDefault();
  }
});

reset();
