const Sim = {
  currentX: 0,
  targetX: 0,
  velocityX: 0,
  stiffness: 160,
  damping: 22,
  mass: 1.0,
  activeCol: 1,
  presets: ['col-large', 'col-medium', 'col-half'],
  presetIndex: 0
};

function solveSpring(curr, vel, target, stiffness, damping, mass, dt) {
  const steps = 4;
  const sdt = Math.min(dt, 0.05) / steps;
  for (let i = 0; i < steps; i++) {
    const force = -stiffness * (curr - target) - damping * vel;
    vel += (force / mass) * sdt;
    curr += vel * sdt;
  }
  return { curr, vel };
}

function initRibbon() {
  const stage = document.getElementById('stage');
  const track = document.getElementById('track');
  const columns = Array.from(document.querySelectorAll('.column'));
  const stats = document.getElementById('viewport-stats');

  function updateCamera(colIndex) {
    Sim.activeCol = Math.max(1, Math.min(columns.length, colIndex));
    const targetCol = columns[Sim.activeCol - 1];

    columns.forEach((col, idx) => {
      const card = col.querySelector('.win-card');
      if (card) {
        card.classList.toggle('active', idx === Sim.activeCol - 1);
      }
    });

    const stageWidth = stage.clientWidth;
    const colLeft = targetCol.offsetLeft;
    const colWidth = targetCol.clientWidth;

    Sim.targetX = colLeft - (stageWidth - colWidth) / 2;
    if (Sim.targetX < 0) Sim.targetX = 0;

    const ratioLabel = targetCol.classList.contains('col-large') ? '100%' :
                       targetCol.classList.contains('col-medium') ? '66%' : '50%';
    stats.textContent = `Column ${Sim.activeCol}/${columns.length} (${ratioLabel})`;
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const res = solveSpring(
      Sim.currentX, Sim.velocityX, Sim.targetX,
      Sim.stiffness, Sim.damping, Sim.mass, dt
    );

    Sim.currentX = res.curr;
    Sim.velocityX = res.vel;

    track.style.transform = `translate3d(${-Sim.currentX}px, 0, 0)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  document.getElementById('btn-left').addEventListener('click', () => updateCamera(Sim.activeCol - 1));
  document.getElementById('btn-right').addEventListener('click', () => updateCamera(Sim.activeCol + 1));

  document.getElementById('btn-preset').addEventListener('click', () => {
    const col = columns[Sim.activeCol - 1];
    Sim.presetIndex = (Sim.presetIndex + 1) % Sim.presets.length;
    col.className = `column ${Sim.presets[Sim.presetIndex]}`;
    setTimeout(() => updateCamera(Sim.activeCol), 50);
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') updateCamera(Sim.activeCol - 1);
    if (e.key === 'ArrowRight') updateCamera(Sim.activeCol + 1);
  });

  columns.forEach((col, idx) => {
    col.addEventListener('click', () => updateCamera(idx + 1));
  });

  updateCamera(1);
}

function initSpotlight() {
  const cards = document.querySelectorAll('.spotlight-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.background = `radial-gradient(circle 260px at ${x}px ${y}px, rgba(139, 180, 250, 0.08), rgba(18, 20, 29, 0.75))`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    });
  });
}

function initCopyButtons() {
  const buttons = document.querySelectorAll('.copy-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-copy');
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const status = btn.querySelector('.copy-status') || btn;
        const original = status.textContent;
        status.textContent = 'Copied!';
        setTimeout(() => {
          status.textContent = original;
        }, 1600);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initRibbon();
  initSpotlight();
  initCopyButtons();
});
