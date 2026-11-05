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
});