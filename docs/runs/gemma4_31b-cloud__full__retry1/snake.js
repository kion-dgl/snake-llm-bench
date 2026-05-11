class SnakeGame {
    canvas;
    ctx;
    scoreElement;
    gridSize = 20;
    tileCount = 20;
    snake = [{ x: 10, y: 10 }];
    food = { x: 5, y: 5 };
    dx = 1; // Start moving right immediately
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    score = 0;
    isGameOver = false;
    constructor() {
        const canvasElem = document.getElementById('gameCanvas');
        const scoreElem = document.getElementById('score');
        if (!canvasElem || !scoreElem) {
            throw new Error("Required DOM elements not found");
        }
        this.canvas = canvasElem;
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = scoreElem;
        window.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.gameLoop();
    }
    handleKeyPress(e) {
        switch (e.key) {
            case 'ArrowUp':
                if (this.dy === 0) {
                    this.nextDx = 0;
                    this.nextDy = -1;
                }
                break;
            case 'ArrowDown':
                if (this.dy === 0) {
                    this.nextDx = 0;
                    this.nextDy = 1;
                }
                break;
            case 'ArrowLeft':
                if (this.dx === 0) {
                    this.nextDx = -1;
                    this.nextDy = 0;
                }
                break;
            case 'ArrowRight':
                if (this.dx === 0) {
                    this.nextDx = 1;
                    this.nextDy = 0;
                }
                break;
        }
    }
    spawnFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
        if (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y)) {
            this.spawnFood();
        }
    }
    update() {
        if (this.isGameOver)
            return;
        this.dx = this.nextDx;
        this.dy = this.nextDy;
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        // Wall Collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.isGameOver = true;
            return;
        }
        // Self Collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.isGameOver = true;
            return;
        }
        this.snake.unshift(head);
        // Food Collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.innerText = this.score.toString();
            this.spawnFood();
        }
        else {
            this.snake.pop();
        }
    }
    draw() {
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        this.ctx.fillStyle = '#2ecc71';
        this.snake.forEach(segment => {
            this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        });
        if (this.isGameOver) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    gameLoop() {
        this.update();
        this.draw();
        setTimeout(() => this.gameLoop(), 100);
    }
}
new SnakeGame();
