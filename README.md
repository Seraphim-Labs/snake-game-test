# snake-game-test

A tiny vanilla-JS Snake game used as a system test for the repo + Netlify automation.

**Live:** https://snake-game-seraphim-test.netlify.app

## Features
- Gradient snake body with a glowing head + eyes that track direction
- **Speed ramp** — snake accelerates as you score (capped)
- **Golden apples** — bonus fruit worth +5 with a 6s timer (chance to spawn after eating)
- **Wrap mode** — toggle walls on/off with `T` or the button
- Particle bursts on every eat, red explosion on death, screen shake
- Animated `+1` / `+5` score popups
- Touch / swipe controls for mobile
- Pulsing food, subtle grid, persistent best score

## Controls
| Action   | Keys                 |
| -------- | -------------------- |
| Move     | `↑ ↓ ← →` or `WASD`  |
| Pause    | `Space`              |
| Restart  | `R`                  |
| Wrap mode| `T`                  |
| Mobile   | Swipe on the canvas  |

## Stack
Single `index.html` + `styles.css` + `game.js`. No build step, no dependencies.
