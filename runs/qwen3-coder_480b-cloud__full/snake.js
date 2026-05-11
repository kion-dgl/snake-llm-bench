// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150; // milliseconds
// Game state
let canvas;
let ctx;
let snake = [];
let food;
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let gameRunning = true;
let gameLoop;
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    // Initialize snake in the middle
    const startX = Math.floor(canvas.width / (CELL_SIZE * 2)) * CELL_SIZE;
    const startY = Math.floor(canvas.height / (CELL_SIZE * 2)) * CELL_SIZE;
    snake = [
        { x: startX, y: startY },
        { x: startX - CELL_SIZE, y: startY },
        { x: startX - CELL_SIZE * 2, y: startY }
    ];
    generateFood();
    document.addEventListener('keydown', handleKeyPress);
    gameLoop = window.setInterval(update, INITIAL_SPEED);
}
function generateFood() {
    const maxX = Math.floor(canvas.width / CELL_SIZE) - 1;
    const maxY = Math.floor(canvas.height / CELL_SIZE) - 1;
    let newFood;
    let overlapping;
    do {
        overlapping = false;
        newFood = {
            x: Math.floor(Math.random() * maxX) * CELL_SIZE,
            y: Math.floor(Math.random() * maxY) * CELL_SIZE
        };
        // Check if food overlaps with snake
        for (const segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                overlapping = true;
                break;
            }
        }
    } while (overlapping);
    food = newFood;
}
function handleKeyPress(event) {
    switch (event.key) {
        case 'ArrowUp':
            if (direction !== 'down')
                nextDirection = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up')
                nextDirection = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right')
                nextDirection = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left')
                nextDirection = 'right';
            break;
    }
}
function update() {
    if (!gameRunning)
        return;
    // Update direction
    direction = nextDirection;
    // Calculate new head position
    const head = { ...snake[0] };
    switch (direction) {
        case 'up':
            head.y -= CELL_SIZE;
            break;
        case 'down':
            head.y += CELL_SIZE;
            break;
        case 'left':
            head.x -= CELL_SIZE;
            break;
        case 'right':
            head.x += CELL_SIZE;
            break;
    }
    // Check collision with walls
    if (head.x < 0 ||
        head.y < 0 ||
        head.x >= canvas.width ||
        head.y >= canvas.height) {
        gameOver();
        return;
    }
    // Check collision with self
    for (const segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }
    // Add new head
    snake.unshift(head);
    // Check if food is eaten
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('score').textContent = `Score: ${score}`;
        generateFood();
    }
    else {
        // Remove tail if no food eaten
        snake.pop();
    }
    draw();
}
function draw() {
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw snake
    ctx.fillStyle = '#00ff00';
    for (const segment of snake) {
        ctx.fillRect(segment.x, segment.y, CELL_SIZE, CELL_SIZE);
    }
    // Draw food
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(food.x, food.y, CELL_SIZE, CELL_SIZE);
    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let j = 0; j <= canvas.height; j += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
    }
}
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    document.getElementById('game-over').style.display = 'block';
}
// Start the game when the page loads
window.addEventListener('load', init);
