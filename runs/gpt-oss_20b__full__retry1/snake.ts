// snake.ts
interface Position {
  x: number;
  y: number;
}

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

class SnakeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scoreDiv: HTMLDivElement;
  private gameOverDiv: HTMLDivElement;
  private cellSize: number;
  private gridSize: number;
  private snake: Position[];
  private direction: Direction;
  private food: Position;
  private score: number;
  private gameRunning: boolean;

  constructor() {
    this.canvas = document.getElementById('gameCanvas')! as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.scoreDiv = document.getElementById('score')! as HTMLDivElement;
    this.gameOverDiv = document.getElementById('gameOver')! as HTMLDivElement;
    this.cellSize = 20;
    this.gridSize = this.canvas.width / this.cellSize;
    const startX = Math.floor(this.gridSize / 2);
    const startY = Math.floor(this.gridSize / 2);
    this.snake = [{ x: startX, y: startY }];
    this.direction = Direction.Right;
    this.food = this.generateFood();
    this.score = 0;
    this.gameRunning = true;

    window.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeyDown(e));

    requestAnimationFrame(() => this.gameLoop());
  }

  private generateFood(): Position {
    let newFood: Position;
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

  private isOpposite(d1: Direction, d2: Direction): boolean {
    return (d1 === Direction.Up && d2 === Direction.Down) ||
           (d1 === Direction.Down && d2 === Direction.Up) ||
           (d1 === Direction.Left && d2 === Direction.Right) ||
           (d1 === Direction.Right && d2 === Direction.Left);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    let newDirection: Direction | null = null;
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

  private moveSnake(): void {
    const head = this.snake[0];
    let newHead: Position;
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
    } else {
      this.snake.pop();
    }
  }

  private checkCollision(pos: Position): boolean {
    if (pos.x < 0 || pos.x >= this.gridSize || pos.y < 0 || pos.y >= this.gridSize) {
      return true;
    }
    return this.snake.some(segment => segment.x === pos.x && segment.y === pos.y);
  }

  private draw(): void {
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

  private gameLoop(): void {
    if (!this.gameRunning) {
      return;
    }
    this.moveSnake();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  private gameOver(): void {
    this.gameRunning = false;
    this.gameOverDiv.style.display = 'block';
  }
}

new SnakeGame();