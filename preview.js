const State = {
  fpsCap: 100,
  gapsOut: 14,
  gapsIn: 8,
  rounding: 10,
  borderSize: 2,
  colActiveHex: '#8bb4fa',
  colInactiveHex: '#313445',
  colBgHex: '#0d0e14',
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
    { label: "Cycle Preset", combo: "Alt+D", lua: 'Quire.cycle_column_preset' },
    { label: "Toggle Float", combo: "Alt+V", lua: 'Quire.toggle_floating' },
    { label: "Toggle Fullscreen", combo: "Alt+F", lua: 'Quire.toggle_fullscreen' },
    { label: "Toggle Launcher", combo: "Alt+Space", lua: 'launcher.toggle' },
    { label: "Commit / Spawn", combo: "Alt+Return", lua: 'launcher.commit' }
  ]
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

-- Palette Colors (RGBA normalized 0.0 to 1.0)
Quire.config.border_active = ${hexToRgbaNorm(State.colActiveHex, 1.0)}
Quire.config.border_inactive = ${hexToRgbaNorm(State.colInactiveHex, 0.6)}

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

  const pickers = [
    { id: 'col-active', prop: 'colActiveHex', hexId: 'hex-active' },
    { id: 'col-inactive', prop: 'colInactiveHex', hexId: 'hex-inactive' },
    { id: 'col-bg', prop: 'colBgHex', hexId: 'hex-bg' }
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
