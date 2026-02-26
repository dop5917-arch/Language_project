export const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
});

export function createInitialState(config = {}, rng = Math.random) {
  const width = config.width ?? 20;
  const height = config.height ?? 20;
  const tickMs = config.tickMs ?? 140;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const snake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ];

  const baseState = {
    width,
    height,
    tickMs,
    snake,
    direction: "right",
    pendingDirection: "right",
    food: null,
    score: 0,
    status: "ready",
    tickCount: 0,
    message: "Press Start",
  };

  return {
    ...baseState,
    food: placeFood(baseState, rng),
  };
}

export function placeFood(state, rng = Math.random) {
  const occupied = new Set(state.snake.map(keyForPoint));
  const free = [];

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) free.push({ x, y });
    }
  }

  if (free.length === 0) return null;
  const index = Math.floor(rng() * free.length);
  return free[Math.max(0, Math.min(index, free.length - 1))];
}

export function startGame(state) {
  if (state.status === "ready" || state.status === "paused") {
    return {
      ...state,
      status: "running",
      message: "",
    };
  }
  return state;
}

export function togglePause(state) {
  if (state.status === "running") {
    return { ...state, status: "paused", message: "Paused" };
  }
  if (state.status === "paused") {
    return { ...state, status: "running", message: "" };
  }
  return state;
}

export function restartGame(state, rng = Math.random) {
  return createInitialState(
    { width: state.width, height: state.height, tickMs: state.tickMs },
    rng
  );
}

export function queueDirection(state, nextDirection) {
  if (!DIRECTIONS[nextDirection]) return state;

  const current = state.pendingDirection ?? state.direction;
  const canReverse = state.snake.length <= 1;
  if (!canReverse && isOpposite(current, nextDirection)) return state;
  if (current === nextDirection) return state;

  return { ...state, pendingDirection: nextDirection };
}

export function stepGame(state, rng = Math.random) {
  if (state.status !== "running") return state;

  const directionName = state.pendingDirection ?? state.direction;
  const vector = DIRECTIONS[directionName];
  const head = state.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };

  if (isWallCollision(nextHead, state.width, state.height)) {
    return {
      ...state,
      direction: directionName,
      status: "game-over",
      message: "Game over",
    };
  }

  const ateFood = !!state.food && pointsEqual(nextHead, state.food);
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some((segment) => pointsEqual(segment, nextHead))) {
    return {
      ...state,
      direction: directionName,
      status: "game-over",
      message: "Game over",
    };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!ateFood) nextSnake.pop();

  const nextScore = state.score + (ateFood ? 1 : 0);
  const nextBase = {
    ...state,
    snake: nextSnake,
    direction: directionName,
    pendingDirection: directionName,
    score: nextScore,
    tickCount: state.tickCount + 1,
  };

  if (!ateFood) return nextBase;

  const nextFood = placeFood({ ...nextBase, food: null }, rng);
  if (!nextFood) {
    return {
      ...nextBase,
      food: null,
      status: "won",
      message: "You win",
    };
  }

  return {
    ...nextBase,
    food: nextFood,
  };
}

function isWallCollision(point, width, height) {
  return point.x < 0 || point.y < 0 || point.x >= width || point.y >= height;
}

function isOpposite(a, b) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function pointsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function keyForPoint(point) {
  return `${point.x},${point.y}`;
}
