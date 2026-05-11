"use strict";
// snake.ts
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const gameOverDiv = document.getElementById('gameOver');
const cellSize = 20;
const gridSize = canvas.width / cellSize; // 20
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
    Direction[Direction["Left"] = 2] = "Left";
    Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));
let snake = [{ x: 9, y: 9 }];
let direction = Direction.Right;
let food = generateFood();
let score = 0;
let gameRunning = true;
function generateFood() {
    let newFood;
    while (true) {
        newFood = {
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize),
        };
        if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
            break;
        }
    }
    return newFood;
}
function isOpposite(d1, d2) {
    return (d1 === Direction.Up && d2 === Direction.Down) ||
        (d1 === Direction.Down && d2 === Direction.Up) ||
        (d1 === Direction.Left && d2 === Direction.Right) ||
        (d1 === Direction.Right && d2 === Direction.Left);
}
function moveSnake() {
    const head = snake[0];
    let newHead;
    switch (direction) {
        case Direction.Up:
            newHead = { x: head.x, y: head.y - 1 };
            break;
        case Direction.Down:
            newHead = { x: head.x, y: head.y + 1 };
            break;
        case Direction.Left:
            newHead = { x: head.x - 1, y: head.y };
            break;
        case Direction.Right:
            newHead = { x: head.x + 1, y: head.y };
            break;
    }
    if (checkCollision(newHead)) {
        gameOver();
        return;
    }
    snake.unshift(newHead);
    if (newHead.x === food.x && newHead.y === food.y) {
        score += 1;
        scoreDiv.textContent = `Score: ${score}`;
        food = generateFood();
    }
    else {
        snake.pop();
    }
}
function checkCollision(pos) {
    if (pos.x < 0 || pos.x >= gridSize || pos.y < 0 || pos.y >= gridSize) {
        return true;
    }
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw food
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
    // Draw snake
    ctx.fillStyle = 'green';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * cellSize, segment.y * cellSize, cellSize, cellSize);
    });
}
function gameLoop() {
    if (!gameRunning)
        return;
    moveSnake();
    draw();
    requestAnimationFrame(gameLoop);
}
function gameOver() {
    gameRunning = false;
    gameOverDiv.style.display = 'block';
}
window.addEventListener('keydown', (e) => {
    let newDirection = null;
    switch (e.key) {
        case 'ArrowUp':
            newDirection = Direction.Up;
            break;
        case 'ArrowDown':
            newDirection = Direction.Down;
            break;
        case 'ArrowLeft':
            newDirection = Direction.Left;
            break;
        case 'ArrowRight':
            newDirection = Direction.Right;
            break;
    }
    if (newDirection !== null && !isOpposite(direction, newDirection)) {
        direction = newDirection;
    }
});
requestAnimationFrame(gameLoop);
