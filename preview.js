/* Studio engine state and numerical spring mathematics */

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
});const State = {
  fpsCap: 0,
  idleMode: "pulse",
  closeAnim: "scale",
  moveEasing: "back",
  moveDuration: 0.28,
  trackpadSpeed: 1.2,
  focusFollowsMouse: false,
  scratchpadCmd: "alacritty.exe",
  gapsOut: 14,
  gapsIn: 8,
  rounding: 10,
  borderSize: 2,
  fontFamily: "Segoe UI Variable",
  colActiveHex: '#8bb4fa',
  colInactiveHex: '#313445',
  colBgHex: '#0d0e14',
  colTextHex: '#e6e8ee',
  colDimHex: '#8c8da6',
  stiffness: 160,
  damping: 22,
  mass: 1.0,
  focusedIndex: 1,
  rules: ['CalculatorApp', 'TaskManagerWindow', 'Steam', 'NVIDIA GeForce Experience'],
  keybinds: [
    { label: "Focus Left", combo: "Alt+H", lua: 'function() Quire.focus_direction("left") end' },
    { label: "Focus Right", combo: "Alt+L", lua: 'function() Quire.focus_direction("right") end' },
    { label: "Focus Up", combo: "Alt+K", lua: 'function() Quire.focus_direction("up") end' },
    { label: "Focus Down", combo: "Alt+J", lua: 'function() Quire.focus_direction("down") end' },
    { label: "Move Col Left", combo: "Alt+Shift+H", lua: 'function() Quire.move_column("left") end' },
    { label: "Move Col Right", combo: "Alt+Shift+L", lua: 'function() Quire.move_column("right") end' },
    { label: "Prev Workspace", combo: "Alt+Q", lua: 'function() Quire.cycle_workspace(-1) end' },
    { label: "Next Workspace", combo: "Alt+E", lua: 'function() Quire.cycle_workspace(1) end' },
    { label: "Monitor Left", combo: "Alt+Ctrl+H", lua: 'function() Quire.move_window_to_monitor("left") end' },
    { label: "Monitor Right", combo: "Alt+Ctrl+L", lua: 'function() Quire.move_window_to_monitor("right") end' },
    { label: "Toggle Overview", combo: "Alt+O", lua: 'Quire.toggle_overview' },
    { label: "Toggle Scratchpad", combo: "Alt+Grave", lua: 'Quire.toggle_scratchpad' },
    { label: "Mark Scratchpad", combo: "Alt+Shift+Grave", lua: 'Quire.mark_scratchpad' },
    { label: "Close Window", combo: "Alt+Shift+Q", lua: 'function() if Quire.focused_window then Quire.safe_close_window(Quire.focused_window) end end' },
    { label: "Cycle Preset", combo: "Alt+D", lua: 'Quire.cycle_column_preset' },
    { label: "Toggle Float", combo: "Alt+V", lua: 'Quire.toggle_floating' },
    { label: "Toggle Fullscreen", combo: "Alt+F", lua: 'Quire.toggle_fullscreen' },
    { label: "Toggle Launcher", combo: "Alt+Space", lua: 'launcher.toggle' },
    { label: "Commit / Spawn", combo: "Alt+Return", lua: 'launcher.commit' }
  ],
  apps: [
    { name: "Terminal", path: "wt.exe", args: "" },
    { name: "Explorer", path: "explorer.exe", args: "" },
    { name: "Task Manager", path: "taskmgr.exe", args: "" }
  ]
};

function hexToRgbaNorm(hex, alpha = 1.0) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const r = (parseInt(c.substring(0, 2), 16) / 255).toFixed(2);
  const g = (parseInt(c.substring(2, 4), 16) / 255).toFixed(2);
  const b = (parseInt(c.substring(4, 6), 16) / 255).toFixed(2);
  const a = alpha.toFixed(1);
  return `{ ${r}, ${g}, ${b}, ${a} }`;
}

function updateMockStyles() {
  const screen = document.getElementById('mock-screen');
  const cols = document.querySelectorAll('.mock-col');
  const wins = [
    document.getElementById('win-mock-1'),
    document.getElementById('win-mock-2'),
    document.getElementById('win-mock-3')
  ];

  screen.style.padding = `${State.gapsOut}px`;
  screen.style.gap = `${State.gapsIn}px`;

  cols.forEach(col => {
    col.style.gap = `${State.gapsIn}px`;
  });

  wins.forEach((win, idx) => {
    if (!win) return;
    const isFocused = idx === State.focusedIndex - 1;
    const borderColor = isFocused ? State.colActiveHex : State.colInactiveHex;

    win.style.borderRadius = `${State.rounding}px`;
    win.style.border = `${State.borderSize}px solid ${borderColor}`;
    win.style.backgroundColor = State.colBgHex;

    if (isFocused) {
      win.style.boxShadow = `0 0 16px ${State.colActiveHex}33`;
    } else {
      win.style.boxShadow = 'none';
    }
  });

  generateLua();
}

function generateLua() {
  const rulesLua = State.rules
    .map(r => `table.insert(Quire.window_rules.float, "${r}")`)
    .join('\n');

  const bindsLua = State.keybinds
    .map(b => `Quire.bind("${b.combo}", ${b.lua})`)
    .join('\n');

  const appsLua = State.apps
    .map(a => {
      const argStr = a.args ? `, args = "${a.args}"` : '';
      return `    { name = "${a.name}", path = "${a.path}"${argStr} }`;
    })
    .join(',\n');

  const luaCode = `-- Generated QuireTWM Config
Quire.config.fps_cap = ${State.fpsCap}
Quire.config.gaps_in = ${State.gapsIn}
Quire.config.gaps_out = ${State.gapsOut}
Quire.config.rounding = ${State.rounding}
Quire.config.border_size = ${State.borderSize}
Quire.config.default_column_width = 1.0

-- Animation & Behavior
Quire.config.idle_mode = "${State.idleMode}"
Quire.config.close_anim = "${State.closeAnim}"
Quire.config.move_easing = "${State.moveEasing}"
Quire.config.move_duration = ${State.moveDuration.toFixed(2)}
Quire.config.trackpad_speed = ${State.trackpadSpeed.toFixed(1)}
Quire.config.focus_follows_mouse = ${State.focusFollowsMouse}
Quire.config.scratchpad_cmd = "${State.scratchpadCmd}"

-- Border Colors (RGBA normalized 0.0 to 1.0)
Quire.config.border_active = ${hexToRgbaNorm(State.colActiveHex, 1.0)}
Quire.config.border_inactive = ${hexToRgbaNorm(State.colInactiveHex, 0.6)}

-- Direct2D Typography & Theme Styling
Quire.theme.font_family  = "${State.fontFamily}"
Quire.theme.bg_color     = ${hexToRgbaNorm(State.colBgHex, 0.92)}
Quire.theme.accent_color = ${hexToRgbaNorm(State.colActiveHex, 1.0)}
Quire.theme.text_color   = ${hexToRgbaNorm(State.colTextHex, 1.0)}
Quire.theme.text_dim     = ${hexToRgbaNorm(State.colDimHex, 0.8)}

-- Sub-Stepped Spring Math
Quire.config.spring = {
    stiffness = ${State.stiffness},
    damping = ${State.damping},
    mass = ${State.mass.toFixed(1)}
}

-- Floating Overrides
${rulesLua}

-- Navigation and Controls Keybindings
${bindsLua}

-- Launcher Applications
Quire.apps = {
${appsLua}
}

-- Workspaces
for i = 1, 9 do
    Quire.bind("Alt+" .. i, function() Quire.switch_workspace(i) end)
    Quire.bind("Alt+Shift+" .. i, function() Quire.move_to_workspace(i) end)
end`;

  document.getElementById('lua-code').textContent = luaCode;
}

function bindControls() {
  const sliders = [
    { id: 'input-fps', prop: 'fpsCap', valId: 'val-fps', unit: ' FPS', autoZero: true },
    { id: 'input-gaps-out', prop: 'gapsOut', valId: 'val-gaps-out', unit: 'px' },
    { id: 'input-gaps-in', prop: 'gapsIn', valId: 'val-gaps-in', unit: 'px' },
    { id: 'input-rounding', prop: 'rounding', valId: 'val-rounding', unit: 'px' },
    { id: 'input-border', prop: 'borderSize', valId: 'val-border', unit: 'px' },
    { id: 'input-move-duration', prop: 'moveDuration', valId: 'val-move-duration', unit: 's', float: true },
    { id: 'input-trackpad-speed', prop: 'trackpadSpeed', valId: 'val-trackpad-speed', unit: 'x', float: true },
    { id: 'input-stiffness', prop: 'stiffness', valId: 'val-stiffness', unit: '' },
    { id: 'input-damping', prop: 'damping', valId: 'val-damping', unit: '' },
    { id: 'input-mass', prop: 'mass', valId: 'val-mass', unit: '', float: true }
  ];

  sliders.forEach(s => {
    const el = document.getElementById(s.id);
    const valEl = document.getElementById(s.valId);
    if (!el || !valEl) return;
    el.addEventListener('input', (e) => {
      const parsed = s.float ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
      State[s.prop] = parsed;
      if (s.autoZero && parsed === 0) {
        valEl.textContent = 'Auto';
      } else {
        valEl.textContent = `${e.target.value}${s.unit}`;
      }
      updateMockStyles();
    });
  });

  const selects = [
    { id: 'select-font', prop: 'fontFamily' },
    { id: 'select-idle', prop: 'idleMode' },
    { id: 'select-close', prop: 'closeAnim' },
    { id: 'select-easing', prop: 'moveEasing' },
    { id: 'select-focus-mouse', prop: 'focusFollowsMouse', boolean: true }
  ];

  selects.forEach(sel => {
    const el = document.getElementById(sel.id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      State[sel.prop] = sel.boolean ? (e.target.value === 'true') : e.target.value;
      generateLua();
    });
  });

  const scratchCmd = document.getElementById('input-scratchpad-cmd');
  if (scratchCmd) {
    scratchCmd.addEventListener('input', (e) => {
      State.scratchpadCmd = e.target.value.trim() || 'alacritty.exe';
      generateLua();
    });
  }

  const pickers = [
    { id: 'col-active', prop: 'colActiveHex', hexId: 'hex-active' },
    { id: 'col-inactive', prop: 'colInactiveHex', hexId: 'hex-inactive' },
    { id: 'col-bg', prop: 'colBgHex', hexId: 'hex-bg' },
    { id: 'col-text', prop: 'colTextHex', hexId: 'hex-text' },
    { id: 'col-dim', prop: 'colDimHex', hexId: 'hex-dim' }
  ];

  pickers.forEach(p => {
    const el = document.getElementById(p.id);
    const hexEl = document.getElementById(p.hexId);
    if (!el || !hexEl) return;
    el.addEventListener('input', (e) => {
      State[p.prop] = e.target.value;
      hexEl.textContent = e.target.value;
      updateMockStyles();
    });
  });

  const toggleBtn = document.getElementById('toggle-active-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      State.focusedIndex = (State.focusedIndex % 3) + 1;
      toggleBtn.textContent = `Focused: Window ${State.focusedIndex}`;
      updateMockStyles();
    });
  }

  const copyBtn = document.getElementById('copy-lua-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = document.getElementById('lua-code').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied to clipboard!';
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
      });
    });
  }

  const triggerBtn = document.getElementById('btn-trigger-spring');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', triggerSpringAnimation);
  }
}

function triggerSpringAnimation() {
  const targetWin = document.getElementById('win-mock-1');
  if (!targetWin) return;

  let pos = -50;
  let vel = 0;
  let target = 0;
  let last = performance.now();

  function step(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    const steps = 4;
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force = -State.stiffness * (pos - target) - State.damping * vel;
      vel += (force / State.mass) * sdt;
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

function renderRules() {
  const container = document.getElementById('rules-container');
  if (!container) return;
  container.innerHTML = '';

  State.rules.forEach((rule, idx) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `<span>${rule}</span><span class="tag-remove" data-idx="${idx}">&times;</span>`;
    container.appendChild(tag);
  });

  container.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.target.getAttribute('data-idx'), 10);
      State.rules.splice(i, 1);
      renderRules();
      generateLua();
    });
  });
}

function initRuleInputs() {
  const input = document.getElementById('input-new-rule');
  const addBtn = document.getElementById('btn-add-rule');
  if (!input || !addBtn) return;

  function submitRule() {
    const val = input.value.trim();
    if (!val || State.rules.includes(val)) return;
    State.rules.push(val);
    input.value = '';
    renderRules();
    generateLua();
  }

  addBtn.addEventListener('click', submitRule);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitRule();
  });
}

function renderKeybinds() {
  const container = document.getElementById('binds-container');
  if (!container) return;
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

  container.querySelectorAll('.bind-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      State.keybinds[idx].combo = e.target.value.trim();
      generateLua();
    });
  });
}

function renderApps() {
  const container = document.getElementById('apps-container');
  if (!container) return;
  container.innerHTML = '';

  State.apps.forEach((app, idx) => {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.innerHTML = `
      <div class="app-item-info">
        <span class="app-title">${app.name}</span>
        <span class="app-path">${app.path}</span>
        ${app.args ? `<span class="app-args">${app.args}</span>` : ''}
      </div>
      <span class="tag-remove" data-app-idx="${idx}">&times;</span>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('[data-app-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-app-idx'), 10);
      State.apps.splice(idx, 1);
      renderApps();
      generateLua();
    });
  });
}

function initAppInputs() {
  const nameInput = document.getElementById('app-name');
  const pathInput = document.getElementById('app-path');
  const argsInput = document.getElementById('app-args');
  const addBtn = document.getElementById('btn-add-app');
  if (!nameInput || !pathInput || !argsInput || !addBtn) return;

  function submitApp() {
    const name = nameInput.value.trim();
    const path = pathInput.value.trim();
    const args = argsInput.value.trim();
    if (!name || !path) return;

    State.apps.push({ name, path, args });
    nameInput.value = '';
    pathInput.value = '';
    argsInput.value = '';
    renderApps();
    generateLua();
  }

  addBtn.addEventListener('click', submitApp);
  [nameInput, pathInput, argsInput].forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitApp();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindControls();
  renderRules();
  initRuleInputs();
  renderKeybinds();
  renderApps();
  initAppInputs();
  updateMockStyles();
});
