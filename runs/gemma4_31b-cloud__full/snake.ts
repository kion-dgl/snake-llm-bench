type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

class SnakeGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private scoreElement: HTMLElement;
    
    private readonly gridSize: number = 20;
    private readonly tileCount: number = 20;
    
    private snake: Point[] = [{ x: 10, y: 10 }];
    private food: Point = { x: 5, y: 5 };
    private dx: number = 0;
    private dy: number = 0;
    private nextDx: number = 0;
    private nextDy: number = 0;
    private score: number = 0;
    private isGameOver: boolean = false;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.scoreElement = document.getElementById('score') as HTMLElement;

        window.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.gameLoop();
    }

    private handleKeyPress(e: KeyboardEvent): void {
        switch (e.key) {
            case 'ArrowUp':
                if (this.dy === 0) { this.nextDx = 0; this.nextDy = -1; }
                break;
            case 'ArrowDown':
                if (this.dy === 0) { this.nextDx = 0; this.nextDy = 1; }
                break;
            case 'ArrowLeft':
                if (this.dx === 0) { this.nextDx = -1; this.nextDy = 0; }
                break;
            case 'ArrowRight':
                if (this.dx === 0) { this.nextDx = 1; this.nextDy = 0; }
                break;
        }
    }

    private spawnFood(): void {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
        // Ensure food doesn't spawn inside snake body
        if (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y)) {
            this.spawnFood();
        }
    }

    private update(): void {
        if (this.isGameOver) return;

        this.dx = this.nextDx;
        this.dy = this.nextDy;

        if (this.dx === 0 && this.dy === 0) return;

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
        } else {
            this.snake.pop();
        }
    }

    private draw(): void {
        // Clear Canvas
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Food
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);

        // Draw Snake
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

    private gameLoop(): void {
        this.update();
        this.draw();
        setTimeout(() => this.gameLoop(), 100);
    }
}

new SnakeGame();