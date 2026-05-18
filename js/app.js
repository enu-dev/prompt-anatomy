/* ============================================
   app.js - UI制御・DOM操作
   ============================================ */

const STORAGE_KEY = 'promptAnatomy:state';

const state = {
  mode: 'diagnose',
  diagnosis: null,
  blocks: { role: '', context: '', task: '', format: '' },
  templateId: null,
  format: 'xml'
};

const BLOCK_META = {
  role:    { name: 'Role',    jp: '役割', color: 'role' },
  context: { name: 'Context', jp: '文脈', color: 'context' },
  task:    { name: 'Task',    jp: '指示', color: 'task' },
  format:  { name: 'Format',  jp: '形式', color: 'format' }
};

/* ============================================
   初期化
   ============================================ */

document.addEventListener('DOMContentLoaded', init);

function init() {
  bindModeTabs();
  bindDiagnosePanel();
  bindBuildPanel();
  renderTemplateChips();
  loadFromStorage();
  renderPreview();
}

/* ============================================
   モード切替
   ============================================ */

function bindModeTabs() {
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });
}

function switchMode(mode) {
  state.mode = mode;

  document.querySelectorAll('.mode-tab').forEach(tab => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  const diagnosePanel = document.getElementById('panel-diagnose');
  const buildPanel = document.getElementById('panel-build');

  if (mode === 'diagnose') {
    diagnosePanel.classList.remove('is-hidden');
    diagnosePanel.removeAttribute('hidden');
    buildPanel.classList.add('is-hidden');
    buildPanel.setAttribute('hidden', '');
  } else {
    diagnosePanel.classList.add('is-hidden');
    diagnosePanel.setAttribute('hidden', '');
    buildPanel.classList.remove('is-hidden');
    buildPanel.removeAttribute('hidden');
  }

  saveToStorage();
}

/* ============================================
   診断モード
   ============================================ */

function bindDiagnosePanel() {
  const input = document.getElementById('diagnose-input');
  const btnDiagnose = document.getElementById('btn-diagnose');
  const btnSampleBad = document.getElementById('btn-sample-bad');
  const btnSampleGood = document.getElementById('btn-sample-good');

  btnDiagnose.addEventListener('click', handleDiagnose);

  btnSampleBad.addEventListener('click', () => {
    input.value = SAMPLES.bad;
    input.focus();
    handleDiagnose();
  });

  btnSampleGood.addEventListener('click', () => {
    input.value = SAMPLES.good;
    input.focus();
    handleDiagnose();
  });
}

function handleDiagnose() {
  const input = document.getElementById('diagnose-input');
  const text = input.value;
  const diagnosis = diagnosePrompt(text);

  state.diagnosis = diagnosis;
  renderDiagnosisResult(text, diagnosis);
}

function renderDiagnosisResult(text, diagnosis) {
  const container = document.getElementById('diagnose-result');

  if (!diagnosis) {
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'diagnose-empty';
    empty.innerHTML = '<div class="empty-icon" aria-hidden="true">📋</div><p>プロンプトを入力してから<br>「診断する」を押してください。</p>';
    container.appendChild(empty);
    return;
  }

  container.innerHTML = '';

  const scoreClass = diagnosis.totalScore >= 80
    ? 'score-high'
    : diagnosis.totalScore >= 50
      ? 'score-mid'
      : 'score-low';

  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'score-display';
  scoreDisplay.innerHTML = `
    <div class="score-label">品質スコア</div>
    <div class="score-value ${scoreClass}" id="score-value">0<span class="score-out-of"> / 100</span></div>
    <div class="score-verdict"></div>
  `;
  container.appendChild(scoreDisplay);

  scoreDisplay.querySelector('.score-verdict').textContent = diagnosis.verdict;

  animateScore(scoreDisplay.querySelector('#score-value'), diagnosis.totalScore);

  const blocksDiv = document.createElement('div');
  blocksDiv.className = 'diagnose-blocks';

  ['role', 'context', 'task', 'format'].forEach(key => {
    const item = diagnosis[key];
    const meta = BLOCK_META[key];

    const blockEl = document.createElement('div');
    blockEl.className = `diagnose-block block-${key}`;

    const statusText = item.level === 'ok'
      ? '○ あり'
      : item.level === 'mid'
        ? '△ 弱い'
        : '× なし';

    const statusClass = `status-${item.level}`;
    const widthPct = Math.round((item.score / 25) * 100);

    blockEl.innerHTML = `
      <div class="diagnose-block-name">
        ${meta.name}<span class="diagnose-block-name-jp">${meta.jp}</span>
      </div>
      <div class="diagnose-block-status ${statusClass}">${statusText}</div>
      <div class="diagnose-block-bar"><div class="diagnose-block-bar-fill" style="width:${widthPct}%"></div></div>
    `;
    blocksDiv.appendChild(blockEl);
  });

  container.appendChild(blocksDiv);

  const advices = ['role', 'context', 'task', 'format']
    .map(k => diagnosis[k].advice)
    .filter(Boolean);

  if (advices.length > 0) {
    const adviceDiv = document.createElement('div');
    adviceDiv.className = 'diagnose-advice';

    const title = document.createElement('div');
    title.className = 'diagnose-advice-title';
    title.textContent = '改善のヒント';
    adviceDiv.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'diagnose-advice-list';
    advices.forEach(advice => {
      const li = document.createElement('li');
      li.textContent = advice;
      list.appendChild(li);
    });
    adviceDiv.appendChild(list);
    container.appendChild(adviceDiv);
  }

  const actionDiv = document.createElement('div');
  actionDiv.className = 'diagnose-action';

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.type = 'button';
  btn.innerHTML = '<span aria-hidden="true">🧱</span><span>構造化する →</span>';
  btn.addEventListener('click', () => {
    const blocks = extractBlocks(text, diagnosis);
    state.blocks = blocks;
    populateBlockInputs();
    switchMode('build');
    renderPreview();
    saveToStorage();
  });
  actionDiv.appendChild(btn);
  container.appendChild(actionDiv);
}

function animateScore(el, target) {
  const duration = 600;
  const startTime = performance.now();
  const startValue = 0;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startValue + (target - startValue) * eased);
    el.firstChild.textContent = String(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/* ============================================
   ビルドモード - テンプレートチップ
   ============================================ */

function renderTemplateChips() {
  const container = document.getElementById('template-chips');
  container.innerHTML = '';

  TEMPLATES.forEach(template => {
    const chip = document.createElement('button');
    chip.className = 'template-chip';
    chip.type = 'button';
    chip.dataset.templateId = template.id;
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', 'false');
    chip.innerHTML = `<span aria-hidden="true">${template.icon}</span><span>${template.name}</span>`;
    chip.addEventListener('click', () => loadTemplate(template.id));
    container.appendChild(chip);
  });
}

function loadTemplate(templateId) {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) return;

  state.templateId = templateId;
  state.blocks = {
    role: template.role,
    context: template.context,
    task: template.task,
    format: template.format
  };

  document.querySelectorAll('.template-chip').forEach(chip => {
    const isActive = chip.dataset.templateId === templateId;
    chip.classList.toggle('is-active', isActive);
    chip.setAttribute('aria-checked', String(isActive));
  });

  populateBlockInputs();
  renderPreview();
  saveToStorage();
}

/* ============================================
   ビルドモード - ブロック入力
   ============================================ */

function bindBuildPanel() {
  document.querySelectorAll('.block-textarea').forEach(textarea => {
    textarea.addEventListener('input', () => {
      const key = textarea.dataset.key;
      state.blocks[key] = textarea.value;
      renderPreview();
      saveToStorage();
    });
  });

  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.format = btn.dataset.format;
      document.querySelectorAll('.format-btn').forEach(b => {
        const isActive = b.dataset.format === state.format;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
      });
      renderPreview();
      saveToStorage();
    });
  });

  document.getElementById('btn-copy').addEventListener('click', handleCopy);
  document.getElementById('btn-clear').addEventListener('click', handleClear);
}

function populateBlockInputs() {
  document.querySelectorAll('.block-textarea').forEach(textarea => {
    const key = textarea.dataset.key;
    textarea.value = state.blocks[key] || '';
  });
}

function handleClear() {
  state.blocks = { role: '', context: '', task: '', format: '' };
  state.templateId = null;
  populateBlockInputs();
  document.querySelectorAll('.template-chip').forEach(chip => {
    chip.classList.remove('is-active');
    chip.setAttribute('aria-checked', 'false');
  });
  renderPreview();
  saveToStorage();
}

/* ============================================
   プレビュー描画
   ============================================ */

function renderPreview() {
  const codeEl = document.getElementById('preview-code');
  if (!codeEl) return;

  const { role, context, task, format } = state.blocks;
  const hasAny = role || context || task || format;

  if (!hasAny) {
    codeEl.textContent = 'テンプレートを選ぶか、ブロックを埋めてください。';
    return;
  }

  if (state.format === 'xml') {
    codeEl.innerHTML = buildXmlPreview(role, context, task, format);
  } else {
    codeEl.textContent = buildPlainPreview(role, context, task, format);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function buildXmlPreview(role, context, task, format) {
  const parts = [];

  if (role) {
    parts.push(
      `<span class="tag-role">&lt;role&gt;</span>\n${escapeHtml(role)}\n<span class="tag-role">&lt;/role&gt;</span>`
    );
  }
  if (context) {
    parts.push(
      `<span class="tag-context">&lt;context&gt;</span>\n${escapeHtml(context)}\n<span class="tag-context">&lt;/context&gt;</span>`
    );
  }
  if (task) {
    parts.push(
      `<span class="tag-task">&lt;task&gt;</span>\n${escapeHtml(task)}\n<span class="tag-task">&lt;/task&gt;</span>`
    );
  }
  if (format) {
    parts.push(
      `<span class="tag-format">&lt;format&gt;</span>\n${escapeHtml(format)}\n<span class="tag-format">&lt;/format&gt;</span>`
    );
  }

  return parts.join('\n\n');
}

function buildPlainPreview(role, context, task, format) {
  const parts = [];
  if (role)    parts.push(`# 役割\n${role}`);
  if (context) parts.push(`# 前提\n${context}`);
  if (task)    parts.push(`# 指示\n${task}`);
  if (format)  parts.push(`# 出力形式\n${format}`);
  return parts.join('\n\n');
}

function buildPlainText() {
  const { role, context, task, format } = state.blocks;
  if (state.format === 'xml') {
    const parts = [];
    if (role)    parts.push(`<role>\n${role}\n</role>`);
    if (context) parts.push(`<context>\n${context}\n</context>`);
    if (task)    parts.push(`<task>\n${task}\n</task>`);
    if (format)  parts.push(`<format>\n${format}\n</format>`);
    return parts.join('\n\n');
  }
  return buildPlainPreview(role, context, task, format);
}

/* ============================================
   コピー機能
   ============================================ */

async function handleCopy() {
  const text = buildPlainText();
  if (!text.trim()) return;

  const btn = document.getElementById('btn-copy');
  const label = btn.querySelector('.copy-label');
  const originalLabel = label.textContent;

  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    fallbackCopy(text);
  }

  btn.classList.add('is-copied');
  label.textContent = 'Copied!';

  setTimeout(() => {
    btn.classList.remove('is-copied');
    label.textContent = originalLabel;
  }, 1800);
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (e) {
    // fail silently
  }
  document.body.removeChild(textarea);
}

/* ============================================
   localStorage
   ============================================ */

function saveToStorage() {
  try {
    const payload = {
      mode: state.mode,
      blocks: state.blocks,
      templateId: state.templateId,
      format: state.format,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // localStorage 利用不可（プライベートブラウズ等）でも動作継続
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (data.blocks) {
      state.blocks = {
        role: data.blocks.role || '',
        context: data.blocks.context || '',
        task: data.blocks.task || '',
        format: data.blocks.format || ''
      };
    }
    if (data.format) state.format = data.format;
    if (data.templateId) state.templateId = data.templateId;

    populateBlockInputs();

    if (state.templateId) {
      document.querySelectorAll('.template-chip').forEach(chip => {
        const isActive = chip.dataset.templateId === state.templateId;
        chip.classList.toggle('is-active', isActive);
        chip.setAttribute('aria-checked', String(isActive));
      });
    }

    document.querySelectorAll('.format-btn').forEach(btn => {
      const isActive = btn.dataset.format === state.format;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    if (data.mode && data.mode !== 'diagnose') {
      switchMode(data.mode);
    }
  } catch (e) {
    // 復元失敗時は初期状態のまま
  }
}
