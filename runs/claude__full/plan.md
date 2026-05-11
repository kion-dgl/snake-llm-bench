# Snake — implementation plan

## 1. Data structures
- `GRID = 20` cells per side, `CELL = 20` px → 400×400 canvas.
- `snake: Cell[]` where `Cell = { x: number; y: number }`. Head is `snake[0]`. Start length 3, centered, moving right.
- `dir: Cell` current movement vector (e.g. `{x:1,y:0}`).
- `pendingDir: Cell | null` — direction queued by last keypress, applied at the start of the next tick. This prevents two same-tick presses from reversing the snake into itself.
- `food: Cell` — random empty cell.
- `score: number`, `alive: boolean`.

## 2. Game loop
- Single `setInterval` at 120ms (≈8 ticks/sec). One function `tick()` does update + render.
- No requestAnimationFrame — grid game, fixed tick is simpler and deterministic.

## 3. Input
- `keydown` on `window`. Map ArrowUp/Down/Left/Right (and WASD) to vectors.
- Reject a press whose vector is the exact opposite of the *current committed* `dir`. Store the accepted vector in `pendingDir`; `tick()` consumes it.

## 4. Render
- Black background, snake green, head a slightly brighter green, food red.
- Score shown in a sibling `<div id="score">` (DOM text), not on the canvas, so the "Score" string is unambiguously present and selectable.
- On game-over, draw a translucent overlay + "Game Over — press R to restart" message on the canvas, and stop the tick (clear the interval).

## 5. Game-over conditions
- Wall: next head `x < 0 || x >= GRID || y < 0 || y >= GRID`.
- Self: next head equals any existing body cell. Computed against the body *after* removing the tail when no food is eaten (so chasing your own tail by one cell is legal).

## 6. Score
- Increment on food eaten. When food is eaten, do not pop the tail (snake grows by 1) and spawn a new food on a random empty cell. If no empty cell exists, win state (treated as game-over with a win message).
