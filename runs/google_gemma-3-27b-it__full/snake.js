"use strict";
const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gridSize = 20;
let snake = [{ x: 10, y: 10 }];
let food = { x: 20, y: 20 };
let dx = 0;
let dy = 0;
let score = 0;
let gameRunning = true;
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw food
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
    // Draw snake
    ctx.fillStyle = 'green';
    for (const segment of snake) {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
    }
    // Draw score
    scoreElement.textContent = score.toString();
}
function update() {
    if (!gameRunning)
        return;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    // Game over conditions
    if (head.x < 0 ||
        head.x >= canvas.width / gridSize ||
        head.y < 0 ||
        head.y >= canvas.height / gridSize ||
        snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameRunning = false;
        alert('Game Over! Score: ' + score);
        return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 1;
        generateFood();
    }
    else {
        snake.pop();
    }
    draw();
}
function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)),
            y: Math.floor(Math.random() * (canvas.height / gridSize)),
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    food = newFood;
}
function gameLoop() {
    if (gameRunning) {
        update();
        requestAnimationFrame(gameLoop);
    }
}
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            dx = 0;
            dy = -1;
            break;
        case 'ArrowDown':
            dx = 0;
            dy = 1;
            break;
        case 'ArrowLeft':
            dx = -1;
            dy = 0;
            break;
        case 'ArrowRight':
            dx = 1;
            dy = 0;
            break;
    }
});
generateFood();
gameLoop();
