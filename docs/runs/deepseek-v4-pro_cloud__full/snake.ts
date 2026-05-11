// snake.ts
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element not found');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D context not available');

const scoreElement = document.getElementById('score');
if (!scoreElement) throw new Error('Score element not found');

const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE; // 20

interface Point {
    x: number;
    y: number;
}

let snake: Point[] = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
];
let direction: Point = { x: 1, y: 0 };
let nextDirection: Point = { x: 1, y: 0 };
let food: Point = { x: 15, y: 15 };
let score = 0;
let gameOver = false;
let gameInterval: number | undefined;

function randomFoodPosition(): Point {
    while (true) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (!snake.some(segment => segment.x === x && segment.y === y)) {
            return { x, y };
        }
    }
}

function draw(): void {
    if (!ctx) return;
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake
    ctx.fillStyle = '#0f0';
    for (const segment of snake) {
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Draw food
    ctx.fillStyle = '#f00';
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Draw game over text
    if (gameOver) {
        ctx.fillStyle = '#fff';
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    }
}

function update(): void {
    if (gameOver) return;

    // Apply the queued direction
    direction = nextDirection;

    // Calculate new head position
    const head = snake[0];
    const newHead: Point = {
        x: head.x + direction.x,
        y: head.y + direction.y,
    };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        gameOver = true;
        stopGame();
        draw();
        return;
    }

    // Insert new head
    snake.unshift(newHead);

    // Self collision (check against body, i.e., everything after the new head)
    const collidesWithBody = snake.slice(1).some(segment => segment.x === newHead.x && segment.y === newHead.y);
    if (collidesWithBody) {
        gameOver = true;
        stopGame();
        draw();
        return;
    }

    // Food consumption
    if (newHead.x === food.x && newHead.y === food.y) {
        score++;
        scoreElement.textContent = `Score: ${score}`;
        food = randomFoodPosition();
        // Do not remove tail → snake grows
    } else {
        snake.pop(); // Remove tail to keep length constant
    }

    draw();
}

function stopGame(): void {
    if (gameInterval !== undefined) {
        clearInterval(gameInterval);
        gameInterval = undefined;
    }
}

function startGame(): void {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = window.setInterval(update, 150);
}

// Keyboard controls
document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (gameOver) return;
    switch (event.key) {
        case 'ArrowUp':
            if (direction.y !== 1) { // Prevent reversing
                nextDirection = { x: 0, y: -1 };
            }
            event.preventDefault();
            break;
        case 'ArrowDown':
            if (direction.y !== -1) {
                nextDirection = { x: 0, y: 1 };
            }
            event.preventDefault();
            break;
        case 'ArrowLeft':
            if (direction.x !== 1) {
                nextDirection = { x: -1, y: 0 };
            }
            event.preventDefault();
            break;
        case 'ArrowRight':
            if (direction.x !== -1) {
                nextDirection = { x: 1, y: 0 };
            }
            event.preventDefault();
            break;
    }
});

// Initial render and game start
draw();
startGame();