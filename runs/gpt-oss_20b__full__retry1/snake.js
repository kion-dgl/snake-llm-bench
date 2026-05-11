"use strict";
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
    Direction[Direction["Left"] = 2] = "Left";
    Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));
class SnakeGame {
    canvas;
    ctx;
    scoreDiv;
    gameOverDiv;
    cellSize;
    gridSize;
    snake;
    direction;
    food;
    score;
    gameRunning;
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreDiv = document.getElementById('score');
        this.gameOverDiv = document.getElementById('gameOver');
        this.cellSize = 20;
        this.gridSize = this.canvas.width / this.cellSize;
        const startX = Math.floor(this.gridSize / 2);
        const startY = Math.floor(this.gridSize / 2);
        this.snake = [{ x: startX, y: startY }];
        this.direction = Direction.Right;
        this.food = this.generateFood();
        this.score = 0;
        this.gameRunning = true;
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        requestAnimationFrame(() => this.gameLoop());
    }
    generateFood() {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize),
            };
            if (!this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
                break;
            }
        }
        return newFood;
    }
    isOpposite(d1, d2) {
        return (d1 === Direction.Up && d2 === Direction.Down) ||
            (d1 === Direction.Down && d2 === Direction.Up) ||
            (d1 === Direction.Left && d2 === Direction.Right) ||
            (d1 === Direction.Right && d2 === Direction.Left);
    }
    handleKeyDown(e) {
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
        if (newDirection !== null && !this.isOpposite(this.direction, newDirection)) {
            this.direction = newDirection;
        }
    }
    moveSnake() {
        const head = this.snake[0];
        let newHead;
        switch (this.direction) {
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
        if (this.checkCollision(newHead)) {
            this.gameOver();
            return;
        }
        this.snake.unshift(newHead);
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 1;
            this.scoreDiv.textContent = `Score: ${this.score}`;
            this.food = this.generateFood();
        }
        else {
            this.snake.pop();
        }
    }
    checkCollision(pos) {
        if (pos.x < 0 || pos.x >= this.gridSize || pos.y < 0 || pos.y >= this.gridSize) {
            return true;
        }
        return this.snake.some(segment => segment.x === pos.x && segment.y === pos.y);
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw food
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(this.food.x * this.cellSize, this.food.y * this.cellSize, this.cellSize, this.cellSize);
        // Draw snake
        this.ctx.fillStyle = 'green';
        this.snake.forEach(segment => {
            this.ctx.fillRect(segment.x * this.cellSize, segment.y * this.cellSize, this.cellSize, this.cellSize);
        });
    }
    gameLoop() {
        if (!this.gameRunning) {
            return;
        }
        this.moveSnake();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    gameOver() {
        this.gameRunning = false;
        this.gameOverDiv.style.display = 'block';
    }
}
new SnakeGame();
