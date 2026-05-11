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
    cellSize = 20;
    cols;
    rows;
    snake = [];
    direction = Direction.Right;
    nextDirection = Direction.Right;
    food = { x: 0, y: 0 };
    score = 0;
    intervalId = null;
    speed = 100; // ms per step
    scoreElement;
    constructor(canvasId, scoreId) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        if (!canvas || !ctx) {
            throw new Error('Canvas not supported');
        }
        this.canvas = canvas;
        this.ctx = ctx;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
        const scoreEl = document.getElementById(scoreId);
        if (!scoreEl) {
            throw new Error('Score element not found');
        }
        this.scoreElement = scoreEl;
        this.reset();
        this.attachKeyboard();
        this.start();
    }
    reset() {
        this.snake = [
            { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) },
        ];
        this.direction = Direction.Right;
        this.nextDirection = Direction.Right;
        this.placeFood();
        this.score = 0;
        this.updateScore();
    }
    attachKeyboard() {
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    if (this.direction !== Direction.Down)
                        this.nextDirection = Direction.Up;
                    break;
                case 'ArrowDown':
                    if (this.direction !== Direction.Up)
                        this.nextDirection = Direction.Down;
                    break;
                case 'ArrowLeft':
                    if (this.direction !== Direction.Right)
                        this.nextDirection = Direction.Left;
                    break;
                case 'ArrowRight':
                    if (this.direction !== Direction.Left)
                        this.nextDirection = Direction.Right;
                    break;
            }
        });
    }
    start() {
        this.intervalId = window.setInterval(() => this.gameLoop(), this.speed);
    }
    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    gameLoop() {
        this.updateDirection();
        this.moveSnake();
        this.checkCollisions();
        this.draw();
    }
    updateDirection() {
        this.direction = this.nextDirection;
    }
    moveSnake() {
        const head = this.snake[0];
        const newHead = { x: head.x, y: head.y };
        switch (this.direction) {
            case Direction.Up:
                newHead.y -= 1;
                break;
            case Direction.Down:
                newHead.y += 1;
                break;
            case Direction.Left:
                newHead.x -= 1;
                break;
            case Direction.Right:
                newHead.x += 1;
                break;
        }
        this.snake.unshift(newHead);
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 1;
            this.updateScore();
            this.placeFood();
        }
        else {
            this.snake.pop();
        }
    }
    checkCollisions() {
        const head = this.snake[0];
        // Wall collision
        if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
            this.gameOver();
            return;
        }
        // Self collision
        for (let i = 1; i < this.snake.length; i++) {
            const segment = this.snake[i];
            if (head.x === segment.x && head.y === segment.y) {
                this.gameOver();
                return;
            }
        }
    }
    gameOver() {
        this.stop();
        alert(`Game Over! Your score: ${this.score}`);
        this.reset();
        this.start();
    }
    placeFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows),
            };
        } while (this.snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
        this.food = newFood;
    }
    updateScore() {
        this.scoreElement.textContent = `Score: ${this.score}`;
    }
    drawCell(p, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(p.x * this.cellSize, p.y * this.cellSize, this.cellSize, this.cellSize);
    }
    draw() {
        // Clear board
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw food
        this.drawCell(this.food, 'red');
        // Draw snake
        this.snake.forEach((segment, index) => {
            const color = index === 0 ? 'lime' : 'green';
            this.drawCell(segment, color);
        });
    }
}
// Initialise the game when the page is ready
window.addEventListener('load', () => {
    new SnakeGame('gameCanvas', 'score');
});
