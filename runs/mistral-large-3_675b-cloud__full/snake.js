class SnakeGame {
    canvas;
    ctx;
    snake;
    direction;
    nextDirection;
    food;
    score;
    gameOver;
    gridSize;
    tileCount;
    scoreElement;
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        this.snake = [{ x: 10, y: 10 }];
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        this.food = this.generateFood();
        this.score = 0;
        this.gameOver = false;
        this.scoreElement = document.getElementById('score');
        this.setupEventListeners();
        this.gameLoop();
    }
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    if (this.direction !== 'DOWN')
                        this.nextDirection = 'UP';
                    break;
                case 'ArrowDown':
                    if (this.direction !== 'UP')
                        this.nextDirection = 'DOWN';
                    break;
                case 'ArrowLeft':
                    if (this.direction !== 'RIGHT')
                        this.nextDirection = 'LEFT';
                    break;
                case 'ArrowRight':
                    if (this.direction !== 'LEFT')
                        this.nextDirection = 'RIGHT';
                    break;
            }
        });
    }
    generateFood() {
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === food.x && segment.y === food.y));
        return food;
    }
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw snake
        this.snake.forEach((segment, index) => {
            this.ctx.fillStyle = index === 0 ? '#4CAF50' : '#8BC34A';
            this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize, this.gridSize);
            this.ctx.strokeStyle = '#fff';
            this.ctx.strokeRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize, this.gridSize);
        });
        // Draw food
        this.ctx.fillStyle = '#F44336';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize, this.gridSize);
    }
    update() {
        if (this.gameOver)
            return;
        this.direction = this.nextDirection;
        // Calculate new head position
        const head = { ...this.snake[0] };
        switch (this.direction) {
            case 'UP':
                head.y--;
                break;
            case 'DOWN':
                head.y++;
                break;
            case 'LEFT':
                head.x--;
                break;
            case 'RIGHT':
                head.x++;
                break;
        }
        // Check for collisions
        if (head.x < 0 || head.x >= this.tileCount ||
            head.y < 0 || head.y >= this.tileCount ||
            this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver = true;
            alert('Game Over! Your score: ' + this.score);
            return;
        }
        // Add new head
        this.snake.unshift(head);
        // Check if food is eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.scoreElement.textContent = this.score.toString();
            this.food = this.generateFood();
        }
        else {
            // Remove tail if no food eaten
            this.snake.pop();
        }
    }
    gameLoop() {
        this.update();
        this.draw();
        setTimeout(() => this.gameLoop(), 100);
    }
}
// Start the game when the page loads
window.addEventListener('load', () => {
    new SnakeGame();
});
