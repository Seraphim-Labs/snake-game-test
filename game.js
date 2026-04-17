(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  const GRID = 20;                  // cells per side
  const CELL = canvas.width / GRID; // pixels per cell
  const TICK_MS = 110;

  let snake, dir, nextDir, food, score, best, alive, paused, timer;

  best = Number(localStorage.getItem('snake_best') || 0);
  bestEl.textContent = best;

  function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    alive = true;
    paused = false;
    scoreEl.textContent = score;
    placeFood();
    draw();
    clearInterval(timer);
    timer = setInterval(step, TICK_MS);
  }

  function placeFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
      if (!snake.some(s => s.x === f.x && s.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function step() {
    if (!alive || paused) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // walls
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
      return gameOver();
    }
    // self
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      return gameOver();
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 1;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem('snake_best', String(best));
      }
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    // background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);

    // snake
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#22c55e' : '#16a34a';
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });

    if (!alive) overlay('Game Over — press R');
    else if (paused) overlay('Paused');
  }

  function overlay(text) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  function gameOver() {
    alive = false;
    clearInterval(timer);
    draw();
  }

  const KEYS = {
    ArrowUp:    { x: 0,  y: -1 }, w: { x: 0,  y: -1 }, W: { x: 0,  y: -1 },
    ArrowDown:  { x: 0,  y: 1  }, s: { x: 0,  y: 1  }, S: { x: 0,  y: 1  },
    ArrowLeft:  { x: -1, y: 0  }, a: { x: -1, y: 0  }, A: { x: -1, y: 0  },
    ArrowRight: { x: 1,  y: 0  }, d: { x: 1,  y: 0  }, D: { x: 1,  y: 0  },
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') return reset();
    if (e.key === ' ') { e.preventDefault(); paused = !paused; draw(); return; }
    const d = KEYS[e.key];
    if (!d) return;
    // prevent 180° reversal
    if (d.x === -dir.x && d.y === -dir.y) return;
    nextDir = d;
  });

  reset();
})();
