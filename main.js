import {
  createInitialState,
  queueDirection,
  restartGame,
  startGame,
  stepGame,
  togglePause,
} from "./snake-logic.js";

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");

let state = createInitialState({ width: 20, height: 20, tickMs: 140 });
let timerId = null;
const cells = [];

setupBoard(state.width, state.height);
render();
installListeners();
startLoop();

function setupBoard(width, height) {
  boardEl.style.setProperty("--cols", String(width));
  boardEl.style.setProperty("--rows", String(height));

  for (let i = 0; i < width * height; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    boardEl.append(cell);
    cells.push(cell);
  }
}

function installListeners() {
  startBtn.addEventListener("click", () => {
    state = startGame(state);
    render();
  });

  pauseBtn.addEventListener("click", () => {
    state = togglePause(state);
    render();
  });

  restartBtn.addEventListener("click", () => {
    state = restartGame(state);
    render();
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === " ") {
      event.preventDefault();
      if (state.status === "ready") {
        state = startGame(state);
      } else {
        state = togglePause(state);
      }
      render();
      return;
    }

    const dir = keyToDirection(key);
    if (!dir) return;

    event.preventDefault();
    if (state.status === "ready") {
      state = startGame(state);
    }
    state = queueDirection(state, dir);
    render();
  });

  document.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.getAttribute("data-dir");
      if (!dir) return;
      if (state.status === "ready") {
        state = startGame(state);
      }
      state = queueDirection(state, dir);
      render();
    });
  });
}

function startLoop() {
  if (timerId !== null) clearInterval(timerId);
  timerId = setInterval(() => {
    const nextState = stepGame(state);
    if (nextState !== state) {
      state = nextState;
      render();
    }
  }, state.tickMs);
}

function render() {
  for (const cell of cells) {
    cell.className = "cell";
  }

  if (state.food) {
    getCell(state.food.x, state.food.y)?.classList.add("food");
  }

  state.snake.forEach((segment, index) => {
    const cell = getCell(segment.x, segment.y);
    if (!cell) return;
    cell.classList.add("snake");
    if (index === 0) cell.classList.add("head");
  });

  scoreEl.textContent = String(state.score);
  statusEl.textContent = formatStatus(state);
  pauseBtn.disabled = state.status === "ready" || state.status === "game-over" || state.status === "won";
  startBtn.disabled = state.status === "running";
}

function getCell(x, y) {
  return cells[y * state.width + x] ?? null;
}

function keyToDirection(key) {
  if (key === "arrowup" || key === "w") return "up";
  if (key === "arrowdown" || key === "s") return "down";
  if (key === "arrowleft" || key === "a") return "left";
  if (key === "arrowright" || key === "d") return "right";
  return null;
}

function formatStatus(currentState) {
  switch (currentState.status) {
    case "ready":
      return "Ready";
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "game-over":
      return "Game Over";
    case "won":
      return "Won";
    default:
      return currentState.status;
  }
}
