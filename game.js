(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const speedEl = document.getElementById('speed');
  const bestEl = document.getElementById('best');
  const wrapToggle = document.getElementById('wrapToggle');
  const restartBtn = document.getElementById('restartBtn');
  const canvasWrap = document.getElementById('canvasWrap');

  // --- config ---
  const GRID = 21;                     // cells per side (odd so snake starts centered)
  const CELL = canvas.width / GRID;
  const BASE_TICK_MS = 120;
  const MIN_TICK_MS = 55;
  const SPEEDUP_PER_POINT = 2.2;       // ms reduction per point
  const GOLDEN_POINTS = 5;
  const GOLDEN_TTL_MS = 6000;          // how long a golden apple sticks around
  const GOLDEN_CHANCE_ON_EAT = 0.22;   // chance to spawn a golden after eating normal

  // --- state ---
  let snake, dir, nextDir, food, goldenFood, goldenExpiresAt;
  let score, best, alive, paused, wrapWalls;
  let lastTick, accumulator;
  let particles, popups;
  let shakeUntil = 0;

  best = Number(localStorage.getItem('snake_best') || 0);
  wrapWalls = localStorage.getItem('snake_wrap') !== '1'; // default walls ON
  bestEl.textContent = best;
  updateWrapButton();

  function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    alive = true;
    paused = false;
    particles = [];
    popups = [];
    goldenFood = null;
    goldenExpiresAt = 0;
    scoreEl.textContent = score;
    speedEl.textContent = '1.0x';
    placeFood();
    accumulator = 0;
    lastTick = performance.now();
    requestAnimationFrame(loop);
  }

  function currentTickMs() {
    return Math.max(MIN_TICK_MS, BASE_TICK_MS - score * SPEEDUP_PER_POINT);
  }

  function randCell() {
    return {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  }

  function cellOccupied(c) {
    if (snake.some(s => s.x === c.x && s.y === c.y)) return true;
    if (food && food.x === c.x && food.y === c.y) return true;
    if (goldenFood && goldenFood.x === c.x && goldenFood.y === c.y) return true;
    return false;
  }

  function placeFood() {
    let c;
    do { c = randCell(); } while (cellOccupied(c));
    food = c;
  }

  function maybeSpawnGolden() {
    if (goldenFood) return;
    if (Math.random() > GOLDEN_CHANCE_ON_EAT) return;
    let c;
    let tries = 0;
    do { c = randCell(); tries++; } while (cellOccupied(c) && tries < 50);
    if (tries >= 50) return;
    goldenFood = c;
    goldenExpiresAt = performance.now() + GOLDEN_TTL_MS;
  }

  // --- main loop (rAF driven, tick-based) ---
  function loop(now) {
    if (!alive) { draw(now); return; }
    const delta = now - lastTick;
    lastTick = now;
    if (!paused) accumulator += delta;

    const tick = currentTickMs();
    while (accumulator >= tick) {
      step();
      accumulator -= tick;
      if (!alive) break;
    }

    // expire golden
    if (goldenFood && now > goldenExpiresAt) {
      goldenFood = null;
    }

    draw(now);
    requestAnimationFrame(loop);
  }

  function step() {
    dir = nextDir;
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (wrapWalls) {
      if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
        return gameOver();
      }
    } else {
      head.x = (head.x + GRID) % GRID;
      head.y = (head.y + GRID) % GRID;
    }

    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      return gameOver();
    }

    snake.unshift(head);

    let ate = false;
    if (food && head.x === food.x && head.y === food.y) {
      score += 1;
      burst(head, '#22c55e');
      popup(head, '+1', '#bbf7d0');
      placeFood();
      maybeSpawnGolden();
      ate = true;
    } else if (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y) {
      score += GOLDEN_POINTS;
      burst(head, '#facc15', 22);
      popup(head, '+' + GOLDEN_POINTS, '#fde68a');
      goldenFood = null;
      ate = true;
    }

    if (ate) {
      scoreEl.textContent = score;
      speedEl.textContent = (BASE_TICK_MS / currentTickMs()).toFixed(1) + 'x';
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem('snake_best', String(best));
      }
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    alive = false;
    shakeUntil = performance.now() + 400;
    canvasWrap.classList.remove('shake');
    // force reflow so animation restarts
    void canvasWrap.offsetWidth;
    canvasWrap.classList.add('shake');
    // big burst at head
    burst(snake[0], '#ef4444', 30);
  }

  // --- particles + popups ---
  function burst(cell, color, count = 14) {
    const cx = cell.x * CELL + CELL / 2;
    const cy = cell.y * CELL + CELL / 2;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  function popup(cell, text, color) {
    popups.push({
      x: cell.x * CELL + CELL / 2,
      y: cell.y * CELL + CELL / 2,
      text, color,
      life: 1,
    });
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y -= 0.6;
      p.life -= 0.02;
      if (p.life <= 0) popups.splice(i, 1);
    }
  }

  // --- drawing ---
  function draw(now) {
    updateParticles();

    // backdrop
    ctx.fillStyle = '#0b1222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }

    // food (pulsing)
    if (food) {
      const pulse = 1 + Math.sin(now / 180) * 0.08;
      drawCell(food, '#ef4444', pulse, true);
    }

    // golden food (shrinks as TTL expires)
    if (goldenFood) {
      const remain = Math.max(0, (goldenExpiresAt - now) / GOLDEN_TTL_MS);
      const pulse = 0.6 + remain * 0.5 + Math.sin(now / 90) * 0.1;
      drawCell(goldenFood, '#facc15', pulse, true);
      // glow
      ctx.save();
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 18;
      drawCell(goldenFood, 'rgba(250,204,21,0.0)', pulse, true);
      ctx.restore();
    }

    // snake with gradient body
    snake.forEach((s, i) => {
      const t = i / Math.max(1, snake.length - 1);
      // head = bright green, tail = teal
      const r = Math.round(34 + (20 - 34) * t);
      const g = Math.round(197 + (184 - 197) * t);
      const b = Math.round(94 + (166 - 94) * t);
      const color = `rgb(${r},${g},${b})`;
      drawCell(s, color, 1, i === 0);
      if (i === 0) {
        // eyes
        const cx = s.x * CELL + CELL / 2;
        const cy = s.y * CELL + CELL / 2;
        const ox = dir.x * CELL * 0.18;
        const oy = dir.y * CELL * 0.18;
        const px = -dir.y * CELL * 0.22;
        const py = dir.x * CELL * 0.22;
        ctx.fillStyle = '#0b1222';
        ctx.beginPath();
        ctx.arc(cx + ox + px, cy + oy + py, CELL * 0.09, 0, Math.PI * 2);
        ctx.arc(cx + ox - px, cy + oy - py, CELL * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // popups
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // overlays
    if (!alive) overlay('Game Over', 'Press R to restart');
    else if (paused) overlay('Paused', 'Press Space to resume');
  }

  function drawCell(cell, color, scale = 1, rounded = false) {
    const pad = (1 - scale) * CELL / 2 + 1;
    const x = cell.x * CELL + pad;
    const y = cell.y * CELL + pad;
    const size = CELL - pad * 2;
    ctx.fillStyle = color;
    if (rounded) {
      const r = Math.min(6, size / 3);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + size, y, x + size, y + size, r);
      ctx.arcTo(x + size, y + size, x, y + size, r);
      ctx.arcTo(x, y + size, x, y, r);
      ctx.arcTo(x, y, x + size, y, r);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }

  function overlay(title, sub) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 12);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 16);
  }

  // --- input ---
  const KEYS = {
    ArrowUp:    { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    ArrowDown:  { x: 0, y: 1  }, s: { x: 0, y: 1  }, S: { x: 0, y: 1  },
    ArrowLeft:  { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0  }, d: { x: 1, y: 0  }, D: { x: 1, y: 0  },
  };

  function queueDir(d) {
    if (!d) return;
    if (d.x === -dir.x && d.y === -dir.y) return; // no 180°
    nextDir = d;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') return reset();
    if (e.key === 't' || e.key === 'T') return toggleWrap();
    if (e.key === ' ') {
      e.preventDefault();
      if (alive) paused = !paused;
      return;
    }
    if (KEYS[e.key]) e.preventDefault();
    queueDir(KEYS[e.key]);
  });

  // touch / swipe
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      queueDir({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      queueDir({ x: 0, y: dy > 0 ? 1 : -1 });
    }
    touchStart = null;
  }, { passive: true });

  // buttons
  restartBtn.addEventListener('click', reset);
  wrapToggle.addEventListener('click', toggleWrap);

  function toggleWrap() {
    wrapWalls = !wrapWalls;
    localStorage.setItem('snake_wrap', wrapWalls ? '0' : '1');
    updateWrapButton();
  }
  function updateWrapButton() {
    wrapToggle.textContent = wrapWalls ? 'Walls: ON' : 'Walls: OFF (wrap)';
    wrapToggle.setAttribute('aria-pressed', wrapWalls ? 'false' : 'true');
  }

  reset();
})();
