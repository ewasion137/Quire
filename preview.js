const StudioState = {
  gapsOut: 14,
  gapsIn: 8,
  rounding: 10,
  borderSize: 2,
  fontFamily: "Segoe UI Variable",
  colActiveHex: '#8bb4fa',
  colInactiveHex: '#313445',
  colBgHex: '#0d0e14',
  colTextHex: '#e6e8ee',
  colDimHex: '#808698',
  stiffness: 160,
  damping: 22,
  mass: 1.0,
  moveDuration: 0.28,
  idleMode: 'pulse',
  moveEasing: 'back',
  focusedIndex: 1,
  rules: ['Spotify.exe', 'TaskManagerWindow', 'NVIDIA Overlay', 'Steam.exe'],
  keybinds: [
    { label: "Focus Left", combo: "Alt+H", lua: 'function() Quire.focus_direction("left") end' },
    { label: "Focus Right", combo: "Alt+L", lua: 'function() Quire.focus_direction("right") end' },
    { label: "Stack Up", combo: "Alt+K", lua: 'function() Quire.focus_direction("up") end' },
    { label: "Stack Down", combo: "Alt+J", lua: 'function() Quire.focus_direction("down") end' },
    { label: "Preset Width", combo: "Alt+D", lua: 'Quire.cycle_column_preset' },
    { label: "Scratchpad", combo: "Alt+Grave", lua: 'Quire.toggle_scratchpad' },
    { label: "Float Client", combo: "Alt+V", lua: 'Quire.toggle_floating' },
    { label: "Launcher", combo: "Alt+Space", lua: 'launcher.toggle' }
  ]
};

function hexToLuaRgba(hex, alpha = 1.0) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(x => x + x).join('');
  const r = (parseInt(clean.substring(0, 2), 16) / 255).toFixed(2);
  const g = (parseInt(clean.substring(2, 4), 16) / 255).toFixed(2);
  const b = (parseInt(clean.substring(4, 6), 16) / 255).toFixed(2);
  return `{ ${r}, ${g}, ${b}, ${alpha.toFixed(1)} }`;
}

function updateMockGeometry() {
  const screen = document.getElementById('mock-screen');
  const leftCol = document.getElementById('mock-col-1');
  const rightCol = document.getElementById('mock-col-2');
  const wins = [
    document.getElementById('win-mock-1'),
    document.getElementById('win-mock-2'),
    document.getElementById('win-mock-3')
  ];

  screen.style.padding = `${StudioState.gapsOut}px`;
  screen.style.gap = `${StudioState.gapsIn}px`;
  leftCol.style.gap = `${StudioState.gapsIn}px`;
  rightCol.style.gap = `${StudioState.gapsIn}px`;

  wins.forEach((w, idx) => {
    if (!w) return;
    const isFocused = (idx + 1 === StudioState.focusedIndex);
    w.style.borderRadius = `${StudioState.rounding}px`;
    w.style.border = `${StudioState.borderSize}px solid ${isFocused ? StudioState.colActiveHex : StudioState.colInactiveHex}`;
    w.style.backgroundColor = StudioState.colBgHex;
    w.style.boxShadow = isFocused ? `0 0 16px ${StudioState.colActiveHex}33` : 'none';
  });

  generateLuaOutput();
}

function generateLuaOutput() {
  const rulesLua = StudioState.rules
    .map(r => `table.insert(Quire.window_rules.float, "${r}")`)
    .join('\n');

  const bindsLua = StudioState.keybinds
    .map(b => `Quire.bind("${b.combo}", ${b.lua})`)
    .join('\n');

  const code = `-- QuireTWM Hardware Surface Configuration
Quire.config.gaps_out = ${StudioState.gapsOut}
Quire.config.gaps_in = ${StudioState.gapsIn}
Quire.config.rounding = ${StudioState.rounding}
Quire.config.border_size = ${StudioState.borderSize}
Quire.config.default_column_width = 1.0

-- Direct2D Color Targets
Quire.config.border_active = ${hexToLuaRgba(StudioState.colActiveHex, 1.0)}
Quire.config.border_inactive = ${hexToLuaRgba(StudioState.colInactiveHex, 0.6)}

-- Sub-Stepped Spring Numerical Solver
Quire.config.spring = {
    stiffness = ${StudioState.stiffness},
    damping = ${StudioState.damping},
    mass = ${Number(StudioState.mass).toFixed(1)}
}

-- Motion Profiles & Hardware Overlay
Quire.config.idle_mode = "${StudioState.idleMode}"
Quire.config.move_easing = "${StudioState.moveEasing}"
Quire.config.move_duration = ${Number(StudioState.moveDuration).toFixed(2)}
Quire.theme.font_family = "${StudioState.fontFamily}"

-- Overrides
${rulesLua}

-- Keybindings
${bindsLua}
`;

  document.getElementById('lua-code').textContent = code;
}

function initTactileDials() {
  document.querySelectorAll('.tactile-dial').forEach(dial => {
    const param = dial.dataset.param;
    const min = parseFloat(dial.dataset.min);
    const max = parseFloat(dial.dataset.max);
    const step = parseFloat(dial.dataset.step);
    const isFloat = dial.dataset.float === 'true';
    const numDisplay = dial.querySelector('.dial-num');
    const cursor = dial.querySelector('.dial-cursor');

    function updateValue(val) {
      val = Math.max(min, Math.min(max, val));
      StudioState[param] = isFloat ? parseFloat(val.toFixed(2)) : Math.round(val);
      numDisplay.textContent = StudioState[param];

      const pct = (val - min) / (max - min);
      cursor.style.left = `${pct * 100}%`;
      updateMockGeometry();
    }

    let dragging = false;
    let startX = 0;
    let startVal = 0;

    dial.addEventListener('mousedown', (e) => {
      dragging = true;
      dial.classList.add('dragging');
      startX = e.clientX;
      startVal = StudioState[param];
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const deltaX = e.clientX - startX;
      const sensitivity = (max - min) / 260;
      let nextVal = startVal + deltaX * sensitivity;
      nextVal = Math.round(nextVal / step) * step;
      updateValue(nextVal);
    });

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      dial.classList.remove('dragging');
    });

    const initVal = StudioState[param];
    const pct = (initVal - min) / (max - min);
    cursor.style.left = `${pct * 100}%`;
  });
}

function initColors() {
  const mapping = [
    { id: 'col-active', param: 'colActiveHex', hexId: 'hex-active', prevId: 'preview-col-active' },
    { id: 'col-inactive', param: 'colInactiveHex', hexId: 'hex-inactive', prevId: 'preview-col-inactive' },
    { id: 'col-bg', param: 'colBgHex', hexId: 'hex-bg', prevId: 'preview-col-bg' },
    { id: 'col-text', param: 'colTextHex', hexId: 'hex-text', prevId: 'preview-col-text' }
  ];

  mapping.forEach(m => {
    const picker = document.getElementById(m.id);
    const hexSpan = document.getElementById(m.hexId);
    const prev = document.getElementById(m.prevId);

    function syncColor(val) {
      StudioState[m.param] = val;
      hexSpan.textContent = val;
      prev.style.backgroundColor = val;
      updateMockGeometry();
    }

    picker.addEventListener('input', (e) => syncColor(e.target.value));
    prev.addEventListener('click', () => picker.click());
    syncColor(picker.value);
  });
}

function initRules() {
  const container = document.getElementById('rules-container');
  const input = document.getElementById('input-new-rule');
  const addBtn = document.getElementById('btn-add-rule');

  function renderTags() {
    container.innerHTML = '';
    StudioState.rules.forEach((rule, idx) => {
      const tag = document.createElement('span');
      tag.className = 'rule-tag';
      tag.innerHTML = `<span>${rule}</span><span class="tag-kill" data-idx="${idx}">&times;</span>`;
      container.appendChild(tag);
    });

    container.querySelectorAll('.tag-kill').forEach(k => {
      k.addEventListener('click', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        StudioState.rules.splice(i, 1);
        renderTags();
        generateLuaOutput();
      });
    });
  }

  function addRule() {
    const val = input.value.trim();
    if (!val || StudioState.rules.includes(val)) return;
    StudioState.rules.push(val);
    input.value = '';
    renderTags();
    generateLuaOutput();
  }

  addBtn.addEventListener('click', addRule);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addRule();
  });
  renderTags();
}

function initKeybinds() {
  const container = document.getElementById('binds-container');
  container.innerHTML = '';
  StudioState.keybinds.forEach((b, idx) => {
    const item = document.createElement('div');
    item.className = 'keymap-item';
    item.innerHTML = `
      <span class="keymap-label">${b.label}</span>
      <input type="text" class="keymap-bind" data-idx="${idx}" value="${b.combo}">
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('.keymap-bind').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const i = parseInt(e.target.dataset.idx, 10);
      StudioState.keybinds[i].combo = e.target.value.trim();
      generateLuaOutput();
    });
  });
}

function initSelects() {
  document.getElementById('select-font').addEventListener('change', (e) => {
    StudioState.fontFamily = e.target.value;
    generateLuaOutput();
  });

  document.getElementById('select-idle').addEventListener('change', (e) => {
    StudioState.idleMode = e.target.value;
    generateLuaOutput();
  });

  document.getElementById('select-easing').addEventListener('change', (e) => {
    StudioState.moveEasing = e.target.value;
    generateLuaOutput();
  });
}

function triggerSpringImpulse() {
  const targetWin = document.getElementById('win-mock-1');
  if (!targetWin) return;

  let pos = -50;
  let vel = 0;
  const target = 0;
  let last = performance.now();

  function step(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    const steps = 4;
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force = -StudioState.stiffness * (pos - target) - StudioState.damping * vel;
      vel += (force / StudioState.mass) * sdt;
      pos += vel * sdt;
    }

    targetWin.style.transform = `translateY(${pos.toFixed(2)}px)`;
    if (Math.abs(pos - target) > 0.1 || Math.abs(vel) > 0.1) {
      requestAnimationFrame(step);
    } else {
      targetWin.style.transform = 'translateY(0px)';
    }
  }
  requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', () => {
  initTactileDials();
  initColors();
  initRules();
  initKeybinds();
  initSelects();
  updateMockGeometry();

  document.getElementById('btn-trigger-spring').addEventListener('click', triggerSpringImpulse);

  const toggleBtn = document.getElementById('toggle-active-btn');
  toggleBtn.addEventListener('click', () => {
    StudioState.focusedIndex = (StudioState.focusedIndex % 3) + 1;
    toggleBtn.textContent = `Focused: Window ${StudioState.focusedIndex}`;
    updateMockGeometry();
  });

  const copyBtn = document.getElementById('copy-lua-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('lua-code').textContent).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied to clipboard';
      setTimeout(() => { copyBtn.textContent = orig; }, 1400);
    });
  });
});/* Studio engine state and numerical spring mathematics */

const State = {
  gapsOut: 14,
  gapsIn: 8,
  rounding: 10,
  borderSize: 2,
  stiffness: 160,
  damping: 22,
  mass: 1.0,
  idleMode: 'pulse',
  closeAnim: 'scale',
  focusFollowsMouse: false,
  colActiveHex: '#8bb4fa',
  colInactiveHex: '#313445',
  colBgHex: '#0d0e14',
  rules: ['Spotify.exe', 'CalculatorApp', 'Steam.exe', 'TaskManagerWindow'],
  keybinds: [
    { label: "Focus Left", combo: "Alt+H", lua: 'function() Quire.focus("left") end' },
    { label: "Focus Right", combo: "Alt+L", lua: 'function() Quire.focus("right") end' },
    { label: "Move Col Left", combo: "Alt+Shift+H", lua: 'function() Quire.move_col("left") end' },
    { label: "Move Col Right", combo: "Alt+Shift+L", lua: 'function() Quire.move_col("right") end' },
    { label: "Cycle Preset", combo: "Alt+D", lua: 'Quire.cycle_column_preset' },
    { label: "Toggle Overview", combo: "Alt+O", lua: 'Quire.toggle_overview' }
  ],
  columns: [
    { widthRatio: 0.66, windows: [{ title: 'core.cpp - Visual Studio' }, { title: 'git status' }] },
    { widthRatio: 0.50, windows: [{ title: 'Terminal pwsh' }] },
    { widthRatio: 0.66, windows: [{ title: 'Discord' }] }
  ],
  activeCol: 0,
  activeWin: 0
};

const Sim = {
  currX: 0,
  targetX: 0,
  velX: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartCam: 0
};

function solveSpring(curr, vel, target, k, c, m, dt) {
  const steps = 4;
  const sdt = Math.min(dt, 0.05) / steps;
  for (let i = 0; i < steps; i++) {
    const f = -k * (curr - target) - c * vel;
    vel += (f / m) * sdt;
    curr += vel * sdt;
  }
  return { curr, vel };
}

function hexToRgbaNorm(hex, alpha = 1.0) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = (parseInt(c.substring(0, 2), 16) / 255).toFixed(2);
  const g = (parseInt(c.substring(2, 4), 16) / 255).toFixed(2);
  const b = (parseInt(c.substring(4, 6), 16) / 255).toFixed(2);
  return `{ ${r}, ${g}, ${b}, ${alpha.toFixed(1)} }`;
}

function generateLua() {
  const rulesLua = State.rules
    .map(r => `table.insert(Quire.window_rules.float, "${r}")`)
    .join('\n');

  const bindsLua = State.keybinds
    .map(b => `Quire.bind("${b.combo}", ${b.lua})`)
    .join('\n');

  const luaCode = `-- QuireTWM Engine Output
Quire.config.gaps_in = ${State.gapsIn}
Quire.config.gaps_out = ${State.gapsOut}
Quire.config.rounding = ${State.rounding}
Quire.config.border_size = ${State.borderSize}

-- Kinematics
Quire.config.spring = {
    stiffness = ${State.stiffness},
    damping = ${State.damping},
    mass = ${State.mass.toFixed(1)}
}

Quire.config.idle_mode = "${State.idleMode}"
Quire.config.close_anim = "${State.closeAnim}"
Quire.config.focus_follows_mouse = ${State.focusFollowsMouse}

-- Hardware Swapchain Palette
Quire.config.border_active = ${hexToRgbaNorm(State.colActiveHex, 1.0)}
Quire.config.border_inactive = ${hexToRgbaNorm(State.colInactiveHex, 0.6)}
Quire.theme.bg_color = ${hexToRgbaNorm(State.colBgHex, 0.95)}

-- Floating Overrides
${rulesLua}

-- Hotkey Bindings
${bindsLua}`;

  document.getElementById('lua-code').textContent = luaCode;
}

function renderMockStage() {
  const stage = document.getElementById('mock-stage');
  const track = document.getElementById('mock-track');
  const hudStats = document.getElementById('hud-stats');
  track.innerHTML = '';

  track.style.padding = `${State.gapsOut}px`;
  track.style.gap = `${State.gapsIn}px`;

  const stageWidth = stage.clientWidth || 460;
  const usableWidth = stageWidth - State.gapsOut * 2;

  State.columns.forEach((col, colIdx) => {
    const colEl = document.createElement('div');
    colEl.className = 'mock-column';
    colEl.style.width = `${Math.round(usableWidth * col.widthRatio)}px`;
    colEl.style.gap = `${State.gapsIn}px`;

    col.windows.forEach((win, winIdx) => {
      const isFocused = colIdx === State.activeCol && winIdx === State.activeWin;
      const winEl = document.createElement('div');
      winEl.className = `mock-win ${isFocused ? 'active' : ''}`;
      winEl.style.borderRadius = `${State.rounding}px`;
      winEl.style.border = `${State.borderSize}px solid ${isFocused ? State.colActiveHex : State.colInactiveHex}`;
      winEl.style.backgroundColor = State.colBgHex;

      if (isFocused) {
        winEl.style.boxShadow = `0 0 16px ${State.colActiveHex}33`;
      }

      winEl.innerHTML = `
        <div class="mock-win-bar">
          <span class="mock-win-title">${win.title}</span>
          <span class="mock-win-dot"></span>
        </div>
        <div class="mock-win-body">
          <div class="code-line" style="width: 70%"></div>
          <div class="code-line" style="width: 45%"></div>
          <div class="code-line" style="width: 85%"></div>
        </div>
      `;

      winEl.addEventListener('click', (e) => {
        e.stopPropagation();
        State.activeCol = colIdx;
        State.activeWin = winIdx;
        focusColumn(colIdx);
        renderMockStage();
      });

      colEl.appendChild(winEl);
    });

    track.appendChild(colEl);
  });

  const activeRatio = Math.round(State.columns[State.activeCol].widthRatio * 100);
  hudStats.textContent = `Column ${State.activeCol + 1} of ${State.columns.length} (${activeRatio}%)`;
}

function focusColumn(colIdx) {
  const stage = document.getElementById('mock-stage');
  const track = document.getElementById('mock-track');
  const stageWidth = stage.clientWidth || 460;
  const colElements = track.children;
  if (!colElements[colIdx]) return;

  const targetCol = colElements[colIdx];
  const offsetLeft = targetCol.offsetLeft;
  const colWidth = targetCol.clientWidth;

  Sim.targetX = offsetLeft - (stageWidth - colWidth) / 2;
  if (Sim.targetX < 0) Sim.targetX = 0;
}

function initRibbonPhysics() {
  const stage = document.getElementById('mock-stage');
  const track = document.getElementById('mock-track');

  let lastTime = performance.now();
  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (!Sim.isDragging) {
      const res = solveSpring(
        Sim.currX, Sim.velX, Sim.targetX,
        State.stiffness, State.damping, State.mass, dt
      );
      Sim.currX = res.curr;
      Sim.velX = res.vel;
    }

    track.style.transform = `translate3d(${-Sim.currX}px, 0, 0)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  stage.addEventListener('mousedown', (e) => {
    Sim.isDragging = true;
    Sim.dragStartX = e.clientX;
    Sim.dragStartCam = Sim.currX;
  });

  window.addEventListener('mousemove', (e) => {
    if (!Sim.isDragging) return;
    const delta = e.clientX - Sim.dragStartX;
    Sim.currX = Sim.dragStartCam - delta;
    Sim.velX = 0;
  });

  window.addEventListener('mouseup', () => {
    if (!Sim.isDragging) return;
    Sim.isDragging = false;
    Sim.targetX = Math.max(0, Sim.currX);
  });

  document.getElementById('btn-add-window').addEventListener('click', () => {
    State.columns[State.activeCol].windows.push({ title: 'New Process' });
    State.activeWin = State.columns[State.activeCol].windows.length - 1;
    renderMockStage();
  });

  document.getElementById('btn-cycle-col-width').addEventListener('click', () => {
    const ratios = [0.50, 0.66, 1.0];
    const curr = State.columns[State.activeCol].widthRatio;
    const nextIdx = (ratios.indexOf(curr) + 1) % ratios.length;
    State.columns[State.activeCol].widthRatio = ratios[nextIdx];
    renderMockStage();
    focusColumn(State.activeCol);
  });
}

function initScrubbers() {
  const scrubbers = document.querySelectorAll('.scrubber-card');

  scrubbers.forEach(card => {
    const param = card.getAttribute('data-param');
    const min = parseFloat(card.getAttribute('data-min'));
    const max = parseFloat(card.getAttribute('data-max'));
    const step = parseFloat(card.getAttribute('data-step'));
    const unit = card.getAttribute('data-unit') || '';
    const isFloat = card.getAttribute('data-float') === 'true';

    const handle = card.querySelector('.scrubber-handle');
    const valDisplay = document.getElementById(`val-${param}`);

    function updatePos(val) {
      const pct = Math.max(0, Math.min(1, (val - min) / (max - min)));
      handle.style.left = `${(pct * 100).toFixed(2)}%`;
      valDisplay.textContent = isFloat ? `${val.toFixed(1)}${unit}` : `${val}${unit}`;
    }

    updatePos(State[param]);

    let activeDrag = false;
    let startX = 0;
    let startVal = State[param];

    function onPointerMove(e) {
      if (!activeDrag) return;
      const dx = e.clientX - startX;
      const range = max - min;
      const deltaVal = (dx / 180) * range;
      let next = startVal + deltaVal;

      next = Math.round(next / step) * step;
      next = Math.max(min, Math.min(max, next));

      State[param] = isFloat ? parseFloat(next.toFixed(2)) : parseInt(next, 10);
      updatePos(State[param]);
      renderMockStage();
      generateLua();
    }

    function onPointerUp() {
      if (!activeDrag) return;
      activeDrag = false;
      card.classList.remove('dragging');
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
    }

    card.addEventListener('mousedown', (e) => {
      activeDrag = true;
      startX = e.clientX;
      startVal = State[param];
      card.classList.add('dragging');
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
    });
  });
}

function initSelectsAndPickers() {
  const idleSel = document.getElementById('select-idle');
  idleSel.addEventListener('change', (e) => {
    State.idleMode = e.target.value;
    generateLua();
  });

  const closeSel = document.getElementById('select-close');
  closeSel.addEventListener('change', (e) => {
    State.closeAnim = e.target.value;
    generateLua();
  });

  const mouseSel = document.getElementById('select-focus-mouse');
  mouseSel.addEventListener('change', (e) => {
    State.focusFollowsMouse = e.target.value === 'true';
    generateLua();
  });

  const pickers = [
    { id: 'col-active', key: 'colActiveHex', hexId: 'hex-active' },
    { id: 'col-inactive', key: 'colInactiveHex', hexId: 'hex-inactive' },
    { id: 'col-bg', key: 'colBgHex', hexId: 'hex-bg' }
  ];

  pickers.forEach(p => {
    const el = document.getElementById(p.id);
    const hex = document.getElementById(p.hexId);
    el.addEventListener('input', (e) => {
      State[p.key] = e.target.value;
      hex.textContent = e.target.value;
      renderMockStage();
      generateLua();
    });
  });

  document.getElementById('copy-lua-btn').addEventListener('click', () => {
    const code = document.getElementById('lua-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('copy-lua-btn');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1400);
    });
  });
}

function initRules() {
  const container = document.getElementById('rules-container');
  const input = document.getElementById('input-new-rule');
  const btn = document.getElementById('btn-add-rule');

  function render() {
    container.innerHTML = '';
    State.rules.forEach((rule, idx) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `<span>${rule}</span><span class="tag-remove" data-idx="${idx}">&times;</span>`;
      container.appendChild(tag);
    });

    container.querySelectorAll('.tag-remove').forEach(t => {
      t.addEventListener('click', (e) => {
        const i = parseInt(e.target.getAttribute('data-idx'), 10);
        State.rules.splice(i, 1);
        render();
        generateLua();
      });
    });
  }

  function add() {
    const val = input.value.trim();
    if (!val || State.rules.includes(val)) return;
    State.rules.push(val);
    input.value = '';
    render();
    generateLua();
  }

  btn.addEventListener('click', add);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add();
  });

  render();
}

function initKeybinds() {
  const container = document.getElementById('binds-container');
  container.innerHTML = '';

  State.keybinds.forEach((bind, idx) => {
    const item = document.createElement('div');
    item.className = 'bind-item';
    item.innerHTML = `
      <span class="bind-label">${bind.label}</span>
      <input type="text" class="bind-input" data-idx="${idx}" value="${bind.combo}">
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('.bind-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const i = parseInt(e.target.getAttribute('data-idx'), 10);
      State.keybinds[i].combo = e.target.value.trim();
      generateLua();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initScrubbers();
  initSelectsAndPickers();
  initRules();
  initKeybinds();
  renderMockStage();
  focusColumn(0);
  initRibbonPhysics();
  generateLua();
});