# Copilot instructions

## Language

- Conduct all conversations with the user in Japanese, including answers, explanations, and clarifying questions, unless the user explicitly requests another language.

## Project overview

そらいろアドベンチャー is a single-page side-scrolling platform game implemented with plain HTML, CSS, and JavaScript.

- `index.html` defines the canvas, HUD, restart button, touch controls, and user-facing instructions.
- `style.css` styles and responsively scales the game UI; touch buttons are shown on coarse-pointer devices.
- `script.js` owns the game state, level data, input, physics, collision detection, camera, canvas rendering, and animation loop.
- `README.md` describes how to launch and play the game.

The canvas has a fixed 960×540 coordinate space while CSS scales it to fit the page. World objects use world coordinates; `cameraX` scrolls the rendered world while the background uses slower parallax movement.

## Build, test, and run

There is no package manifest or configured build, automated test, or lint command.

- Run locally with `python3 -m http.server 8000` from the repository root and open `http://localhost:8000`; opening `index.html` directly also works.
- Check JavaScript syntax with `node --check script.js`.
- For a focused manual check, verify keyboard movement and jumping, coin collection and HUD updates, falling/reset behavior, reaching the goal, and touch controls on a touch-capable device. There is no individual automated test command.

## Code conventions and coupled behavior

- Keep the implementation browser-native and lightweight; the game currently has no framework, bundler, or external runtime dependencies.
- Treat `platforms` and `coinLocations` in `script.js` as level source data. Platform entries drive both platform rendering and landing collision checks; update both paths if changing how an object behaves.
- Keep canvas coordinates, `WORLD_WIDTH`, the goal position, and camera bounds consistent when changing level dimensions or adding world objects.
- `resetGame()` initializes the player, coins, camera, game state, and HUD together. Keep reset behavior synchronized with any new state.
- Keyboard and pointer controls share the `keys` set. Touch buttons map through their `data-key` attributes; preserve this shared input path when changing controls.
- `index.html` element IDs and data attributes are queried directly by `script.js`; keep those hooks aligned when changing the UI.
- Keep player-visible text in Japanese, consistent with the README and existing game UI.
