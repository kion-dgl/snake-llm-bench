// snake.ts content
enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT'
}

class SnakeGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private scoreElement: HTMLElement;
    private gridSize: number = 20;
    private gridWidth: number = 0;
    private gridHeight: number = 0;
    private snake: { x: number; y: number }[];
    private direction: Direction = Direction.RIGHT;
    private nextDirection: Direction = Direction.RIGHT;
    private food: { x: number; y: number } = { x: 0, y: 0 };
    private score: number = 0;
    private gameInterval: number | null = null;
    private isGameOver: boolean = false;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.scoreElement = document.getElementById('score') as HTMLElement;
        
        this.gridWidth = this.canvas.width / this.gridSize;
        this.gridHeight = this.canvas.height / this.gridSize;
        
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        
        this.createFood();
        this.setupInput();
        this.startGame();
    }

    private setupInput(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (this.isGameOver) return;
            
            switch (e.key) {
                case 'ArrowUp':
                    if (this.direction !== Direction.DOWN) {
                        this.nextDirection = Direction.UP;
                    }
                    break;
                case 'ArrowDown':
                    if (this.direction !== Direction.UP) {
                        this.nextDirection = Direction.DOWN;
                    }
                    break;
                case 'ArrowLeft':
                    if (this.direction !== Direction.RIGHT) {
                        this.nextDirection = Direction.LEFT;
                    }
                    break;
                case 'ArrowRight':
                    if (this.direction !== Direction.LEFT) {
                        this.nextDirection = Direction.RIGHT;
                    }
                    break;
            }
        });
    }

    private createFood(): void {
        let validPosition = false;
        while (!validPosition) {
            this.food = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
            
            validPosition = true;
            for (const segment of this.snake) {
                if (segment.x === this.food.x && segment.y === this.food.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }

    private startGame(): void {
        this.gameInterval = window.setInterval(() => {
            this.update();
            this.draw();
        }, 100);
    }

    private update(): void {
        if (this.isGameOver) return;
        
        this.direction = this.nextDirection;
        
        const head = { ...this.snake[0] };
        
        switch (this.direction) {
            case Direction.UP:
                head.y -= 1;
                break;
            case Direction.DOWN:
                head.y += 1;
                break;
            case Direction.LEFT:
                head.x -= 1;
                break;
            case Direction.RIGHT:
                head.x += 1;
                break;
        }
        
        // Check wall collision
        if (head.x < 0 || head.x >= this.gridWidth || 
            head.y < 0 || head.y >= this.gridHeight) {
            this.gameOver();
            return;
        }
        
        // Check self collision
        for (const segment of this.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                this.gameOver();
                return;
            }
        }
        
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.textContent = this.score.toString();
            this.createFood();
        } else {
            this.snake.pop();
        }
    }

    private draw(): void {
        // Clear canvas
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw food
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(
            this.food.x * this.gridSize,
            this.food.y * this.gridSize,
            this.gridSize - 2,
            this.gridSize - 2
        );
        
        // Draw snake
        this.ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            // Make head a different color
            if (i === 0) {
                this.ctx.fillStyle = '#27ae60';
            } else {
                this.ctx.fillStyle = '#2ecc71';
            }
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 2,
                this.gridSize - 2
            );
        }
        
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Press F5 to restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }

    private gameOver(): void {
        this.isGameOver = true;
        if (this.gameInterval !== null) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        this.draw();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});