import {
  createInitialState,
  placeFood,
  queueDirection,
  startGame,
  stepGame,
} from "./snake-logic.js";

const resultsEl = document.getElementById("results");
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPoint(actual, expected, message) {
  assert(
    actual.x === expected.x && actual.y === expected.y,
    `${message} (expected ${expected.x},${expected.y}; got ${actual.x},${actual.y})`
  );
}

test("moves one cell per tick in current direction", () => {
  let state = createInitialState({ width: 10, height: 10 });
  state = startGame(state);
  state = stepGame(state);
  assertPoint(state.snake[0], { x: 6, y: 5 }, "head should advance right");
  assert(state.snake.length === 3, "length should stay same without food");
});

test("ignores immediate reverse direction", () => {
  let state = createInitialState({ width: 10, height: 10 });
  state = startGame(state);
  state = queueDirection(state, "left");
  state = stepGame(state);
  assertPoint(state.snake[0], { x: 6, y: 5 }, "reverse should be ignored");
});

test("grows and increases score when eating food", () => {
  let state = createInitialState({ width: 10, height: 10 });
  state = {
    ...state,
    food: { x: 6, y: 5 },
  };
  state = startGame(state);
  state = stepGame(state, () => 0);
  assert(state.score === 1, "score should increment");
  assert(state.snake.length === 4, "snake should grow");
});

test("wall collision ends the game", () => {
  let state = createInitialState({ width: 4, height: 4 });
  state = {
    ...state,
    snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }],
    direction: "right",
    pendingDirection: "right",
  };
  state = startGame(state);
  state = stepGame(state);
  assert(state.status === "game-over", "should end on wall collision");
});

test("food placement avoids snake cells", () => {
  const state = {
    width: 3,
    height: 2,
    snake: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  };
  const food = placeFood(state, () => 0);
  assertPoint(food, { x: 2, y: 1 }, "only free cell should be chosen");
});

run();

function run() {
  let passed = 0;
  for (const { name, fn } of tests) {
    const line = document.createElement("div");
    try {
      fn();
      passed += 1;
      line.className = "pass";
      line.textContent = `PASS ${name}`;
    } catch (error) {
      line.className = "fail";
      line.textContent = `FAIL ${name}: ${error.message}`;
    }
    resultsEl.append(line);
  }

  const summary = document.createElement("p");
  summary.textContent = `${passed}/${tests.length} tests passed`;
  resultsEl.prepend(summary);
}
