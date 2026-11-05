const Sim = {
  currentX: 0,
  targetX: 0,
  velocityX: 0,
  stiffness: 160,
  damping: 22,
  mass: 1.0,
  activeCol: 1,
  presets: ['col-lg', 'col-md', 'col-sm'],
  presetIndex: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartCurrentX: 0
};

function solveNumericalSpring(curr, vel, target, stiffness, damping, mass, dt) {
  const steps = 4;
  const sdt = Math.min(dt, 0.033) / steps;
  for (let i = 0; i < steps; i++) {
    const force = -stiffness * (curr - target) - damping * vel;
    vel += (force / mass) * sdt;
    curr += vel * sdt;
  }
  return { curr, vel };
}

function initRibbonSimulator() {
  const stage = document.getElementById('stage');
  const track = document.getElementById('track');
  const columns = Array.from(document.querySelectorAll('.col'));
  const statOffset = document.getElementById('stat-offset');
  const statCol = document.getElementById('stat-col');
  const statRatio = document.getElementById('stat-ratio');

  function updateCamera(colIdx) {
    Sim.activeCol = Math.max(1, Math.min(columns.length, colIdx));
    const targetCol = columns[Sim.activeCol - 1];

    columns.forEach((col, idx) => {
      const box = col.querySelector('.window-box');
      if (box) {
        box.classList.toggle('active', idx === Sim.activeCol - 1);
      }
    });

    const stageWidth = stage.clientWidth;
    const colLeft = targetCol.offsetLeft;
    const colWidth = targetCol.clientWidth;

    Sim.targetX = Math.max(0, colLeft - (stageWidth - colWidth) / 2);

    const ratioLabel = targetCol.classList.contains('col-lg') ? '100%' :
                       targetCol.classList.contains('col-md') ? '66%' : '50%';
    statCol.textContent = `${Sim.activeCol}/${columns.length}`;
    statRatio.textContent = ratioLabel;
  }

  let lastTime = performance.now();
  function renderFrame(now) {
    const dt = Math.max(0.001, (now - lastTime) / 1000);
    lastTime = now;

    if (!Sim.isDragging) {
      const step = solveNumericalSpring(
        Sim.currentX, Sim.velocityX, Sim.targetX,
        Sim.stiffness, Sim.damping, Sim.mass, dt
      );
      Sim.currentX = step.curr;
      Sim.velocityX = step.vel;
    }

    track.style.transform = `translate3d(${-Sim.currentX.toFixed(2)}px, 0, 0)`;
    statOffset.textContent = `${Math.round(Sim.currentX)}px`;

    requestAnimationFrame(renderFrame);
  }
  requestAnimationFrame(renderFrame);

  document.getElementById('sim-prev').addEventListener('click', () => updateCamera(Sim.activeCol - 1));
  document.getElementById('sim-next').addEventListener('click', () => updateCamera(Sim.activeCol + 1));

  document.getElementById('sim-cycle').addEventListener('click', () => {
    const col = columns[Sim.activeCol - 1];
    Sim.presetIndex = (Sim.presetIndex + 1) % Sim.presets.length;
    col.className = `col ${Sim.presets[Sim.presetIndex]}`;
    setTimeout(() => updateCamera(Sim.activeCol), 30);
  });

  const scratchBtn = document.getElementById('sim-scratch');
  const scratchPanel = document.getElementById('sim-scratchpad-panel');
  scratchBtn.addEventListener('click', () => {
    scratchPanel.classList.toggle('visible');
  });

  const launcherBtn = document.getElementById('sim-launcher');
  const launcherPanel = document.getElementById('sim-launcher-panel');
  launcherBtn.addEventListener('click', () => {
    launcherPanel.classList.toggle('visible');
  });

  columns.forEach((col, idx) => {
    col.addEventListener('click', () => updateCamera(idx + 1));
  });

  stage.addEventListener('mousedown', (e) => {
    if (e.target.closest('.scratchpad-overlay') || e.target.closest('.launcher-overlay')) return;
    Sim.isDragging = true;
    Sim.dragStartX = e.clientX;
    Sim.dragStartCurrentX = Sim.currentX;
  });

  window.addEventListener('mousemove', (e) => {
    if (!Sim.isDragging) return;
    const delta = e.clientX - Sim.dragStartX;
    Sim.currentX = Math.max(0, Sim.dragStartCurrentX - delta);
    Sim.targetX = Sim.currentX;
    Sim.velocityX = 0;
  });

  window.addEventListener('mouseup', () => {
    if (!Sim.isDragging) return;
    Sim.isDragging = false;
    let closestIdx = 1;
    let minDiff = Infinity;
    const stageWidth = stage.clientWidth;

    columns.forEach((col, idx) => {
      const colCenter = col.offsetLeft + col.clientWidth / 2;
      const viewCenter = Sim.currentX + stageWidth / 2;
      const diff = Math.abs(colCenter - viewCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx + 1;
      }
    });
    updateCamera(closestIdx);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') updateCamera(Sim.activeCol - 1);
    if (e.key === 'ArrowRight') updateCamera(Sim.activeCol + 1);
    if (e.key === 'Escape') {
      scratchPanel.classList.remove('visible');
      launcherPanel.classList.remove('visible');
    }
  });

  updateCamera(1);
}

function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const payload = btn.getAttribute('data-copy');
      if (!payload) return;
      navigator.clipboard.writeText(payload).then(() => {
        const tag = btn.querySelector('.copy-tag') || btn;
        const prev = tag.textContent;
        tag.textContent = 'Copied';
        setTimeout(() => { tag.textContent = prev; }, 1400);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initRibbonSimulator();
  initCopyButtons();
});