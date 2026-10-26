const State = {
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
  rules: ['CalculatorApp', 'TaskManagerWindow', 'Steam', 'NVIDIA GeForce Experience']
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
    const borderAlpha = isFocused ? '1.0' : '0.6';

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

  const luaCode = `-- Generated QuireTWM Config
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
${rulesLua}`;

  document.getElementById('lua-code').textContent = luaCode;
}

function bindControls() {
  const sliders = [
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
    el.addEventListener('input', (e) => {
      State[s.prop] = s.float ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
      valEl.textContent = `${e.target.value}${s.unit}`;
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
    el.addEventListener('input', (e) => {
      State[p.prop] = e.target.value;
      hexEl.textContent = e.target.value;
      updateMockStyles();
    });
  });

  const toggleBtn = document.getElementById('toggle-active-btn');
  toggleBtn.addEventListener('click', () => {
    State.focusedIndex = (State.focusedIndex % 3) + 1;
    toggleBtn.textContent = `Focused: Window ${State.focusedIndex}`;
    updateMockStyles();
  });

  const copyBtn = document.getElementById('copy-lua-btn');
  copyBtn.addEventListener('click', () => {
    const text = document.getElementById('lua-code').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied to clipboard!';
      setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });
  });

  document.getElementById('btn-trigger-spring').addEventListener('click', triggerSpringAnimation);
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

document.addEventListener('DOMContentLoaded', () => {
  bindControls();
  renderRules();
  initRuleInputs();
  updateMockStyles();
});
