# Snake — v2 spec (stricter, playtest-comparable)

Build a Snake game with the **exact** mechanics, controls, and layout below. Same constraints as v1 (vanilla TypeScript + HTML5 Canvas, no frameworks, no imports, two files), but with much tighter rules so all games are directly comparable on a phone playtest.

---

## Mechanics

- **Grid**: 20 cells × 20 cells.
- **Cell size**: 20 px. So the canvas is exactly **400×400 px**.
- **Starting snake**: length 3, head at `(10, 10)`, body trailing to `(9, 10)` and `(8, 10)`. Moving **right**.
- **Initial tick interval**: 150 ms.
- **Speed-up**: after every **5 apples eaten**, the tick interval decreases by **10 ms**. Minimum tick interval: **60 ms**.
- **Apple spawn**: exactly one apple at any time, placed on a random cell that is not currently occupied by the snake. When an apple is eaten, snake grows by 1 segment and a new apple spawns.
- **Game-over conditions**: head moves into a wall (out of grid) or into any other body segment. The snake may chase its own tail by exactly one cell — i.e. the tail cell that is *about* to vacate is not counted as a collision.
- **Pause state**: the game **starts paused**. The page renders the initial board, but the snake does not move until the player presses Space.
- **Reverse-into-self prevention**: a key that requests the exact opposite of the current direction is ignored.
- **Wrap-around**: none. Walls kill.

## Controls

| Key | Action |
|---|---|
| Arrow Up / W | Set direction up |
| Arrow Down / S | Set direction down |
| Arrow Left / A | Set direction left |
| Arrow Right / D | Set direction right |
| Space | Start the game on first press; toggle pause/resume thereafter |
| R | Restart from initial state. Works at any time, including during game-over. |

Listen for keys on `window` or `document`. Call `e.preventDefault()` on the keys you handle so the page doesn't scroll.

## On-screen UI

The page **must** contain, in this order, top to bottom:

1. A heading `<h1>Snake</h1>`.
2. A line of text containing the literal substring `Score: N` where N is the current score (count of apples eaten this run).
3. A line of text containing the literal substring `High: N` where N is the highest score seen so far. **Persist this value in `localStorage` under the key `snake.high`** so it survives reloads.
4. The 400×400 canvas with a 1px or 2px border so the play field is visible.
5. A line of help text: `Arrow keys or WASD to move · Space to start/pause · R to restart`.

When the game is **paused before first start**, draw the text `Press Space to start` centered on the canvas.
When the game is **paused after first start**, draw the text `Paused` centered on the canvas.
When the game is **over**, draw `Game Over — press R to restart` centered on the canvas, and **stop the tick** (don't keep clearing/redrawing every frame).

## Colors

- Page background: `#111`
- Canvas background: `#000`
- Snake body: `#3aa635` (darker green)
- Snake head: `#7ed957` (brighter green)
- Apple: `#c0392b`
- Text overlays on canvas: `#fff`, 20px sans-serif, centered

## Code structure (module outline)

Two files, **exactly** these names:

### `index.html`

- `<!doctype html>`, viewport meta, `<title>Snake</title>`.
- Inline `<style>` block containing only the page-level styles above.
- DOM elements: `<h1>`, score line (`<div id="score">Score: 0</div>`), high line (`<div id="high">High: 0</div>`), `<canvas id="game" width="400" height="400">`, help text.
- Loads JS via `<script src="snake.js" defer></script>` — **no `type="module"`**.

### `snake.ts`

Use this structure verbatim — same type names, same exported-or-not surface, same property shapes. You may add private helper methods inside `Game` but do not rename or remove anything below.

```typescript
type Cell = { x: number; y: number };
type Direction = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const SPEEDUP_EVERY = 5;       // apples
const SPEEDUP_DELTA = 10;      // ms

class Game {
  // Required public methods:
  constructor(canvas: HTMLCanvasElement, scoreEl: HTMLElement, highEl: HTMLElement);
  start(): void;          // begins the tick (called from Space when paused before first start)
  togglePause(): void;    // pauses or resumes during play
  restart(): void;        // full reset to initial state, paused-before-start
  // Private state must include at minimum:
  //   snake: Cell[]; dir: Direction; pendingDir: Direction | null;
  //   food: Cell; score: number; high: number;
  //   tickMs: number; alive: boolean; started: boolean; paused: boolean;
}

// Top-level setup (no exports):
//   - get canvas/score/high elements
//   - load high from localStorage.getItem('snake.high')
//   - new Game(canvas, scoreEl, highEl)
//   - install window keydown listener
```

The class must compile under `--strict` including `strictPropertyInitialization` and `strictNullChecks`. Use `!` definite-assignment, inline initializers, or constructor-body assignments as needed.

## Output format

Output exactly two fenced code blocks, in this order, nothing else. No prose, no explanation, no preamble.

```html
<!-- index.html content -->
```

```typescript
// snake.ts content
```
