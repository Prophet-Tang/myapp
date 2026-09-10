// ============ 数据模型 ============

// 1 = 周一 ... 7 = 周日（0 号位留空，方便下标直接取）
const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 默认周计划模板：每个动作有 id（唯一）、name、sets（组）、reps（次）
const DEFAULT_PLAN = {
  1: [
    { id: 'chest-bench',    name: '杠铃卧推',     sets: 4, reps: 8 },
    { id: 'chest-incline',  name: '上斜哑铃卧推', sets: 4, reps: 10 },
    { id: 'chest-fly',      name: '蝴蝶机夹胸',   sets: 3, reps: 12 },
    { id: 'tri-pushdown',   name: '绳索下压',     sets: 3, reps: 12 },
  ],
  2: [
    { id: 'back-pullup',    name: '引体向上',     sets: 4, reps: 8 },
    { id: 'back-row',       name: '杠铃划船',     sets: 4, reps: 8 },
    { id: 'back-pulldown',  name: '高位下拉',     sets: 3, reps: 10 },
    { id: 'bi-curl',        name: '杠铃弯举',     sets: 3, reps: 10 },
  ],
  3: [
    { id: 'leg-squat',      name: '深蹲',         sets: 4, reps: 6 },
    { id: 'leg-deadlift',   name: '硬拉',         sets: 3, reps: 5 },
    { id: 'leg-lunge',      name: '箭步蹲',       sets: 3, reps: 10 },
    { id: 'leg-calf',       name: '提踵',         sets: 4, reps: 15 },
  ],
  4: [
    { id: 'shoulder-ohp',   name: '杠铃推举',     sets: 4, reps: 8 },
    { id: 'shoulder-lat',   name: '哑铃侧平举',   sets: 4, reps: 12 },
    { id: 'shoulder-rear',  name: '反向飞鸟',     sets: 3, reps: 15 },
  ],
  5: [
    { id: 'arm-cgbp',       name: '窄距卧推',     sets: 3, reps: 8 },
    { id: 'arm-curl',       name: '哑铃弯举',     sets: 4, reps: 10 },
    { id: 'arm-skull',      name: '仰卧臂屈伸',   sets: 3, reps: 10 },
  ],
  6: [], // 周六休息
  7: [], // 周日休息
};

const PLAN_KEY = 'fitness-plan-v1';
const LOGS_KEY = 'fitness-logs-v1';

// ============ 工具函数 ============

function pad(n) { return String(n).padStart(2, '0'); }

// 把 Date 转成 'YYYY-MM-DD'（本地时区）
function dateKeyOf(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 今天 1..7（1=周一）
function todayDayIndex() {
  return ((new Date().getDay() + 6) % 7) + 1;
}

// 本周第 dayIndex 天（1..7）对应的 Date
function dateOfThisWeek(dayIndex) {
  const now = new Date();
  const offset = dayIndex - todayDayIndex();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ============ 存取 ============

function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_PLAN));
}

function savePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

// logs 结构：{ 'YYYY-MM-DD': { 动作id: true } }
function loadLogs() {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveLogs(logs) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// ============ 今日打卡 ============

function renderToday() {
  const plan = loadPlan();
  const logs = loadLogs();
  const key = dateKeyOf(new Date());
  const dayIndex = todayDayIndex();
  const exercises = plan[dayIndex] || [];
  const done = logs[key] || {};

  document.getElementById('date-label').textContent = `${DAY_NAMES[dayIndex]} · ${key}`;

  const listEl = document.getElementById('today-list');
  const restEl = document.getElementById('rest-day');
  const progressEl = document.getElementById('progress');

  if (exercises.length === 0) {
    listEl.innerHTML = '';
    restEl.classList.remove('hidden');
    progressEl.classList.add('hidden');
  } else {
    restEl.classList.add('hidden');
    progressEl.classList.remove('hidden');

    listEl.innerHTML = '';
    exercises.forEach((ex) => {
      const checked = !!done[ex.id];
      const li = document.createElement('li');
      li.className = 'exercise' + (checked ? ' done' : '');
      li.innerHTML = `
        <button class="check" data-id="${ex.id}">${checked ? '✓' : ''}</button>
        <div class="info">
          <span class="name">${escapeHtml(ex.name)}</span>
          <span class="detail">${ex.sets} 组 × ${ex.reps} 次</span>
        </div>
      `;
      li.querySelector('.check').addEventListener('click', () => toggleExercise(ex.id));
      listEl.appendChild(li);
    });

    const total = exercises.length;
    const completed = exercises.filter((ex) => done[ex.id]).length;
    document.getElementById('progress-text').textContent = `${completed}/${total}`;
    document.getElementById('progress-bar').style.width = `${(completed / total) * 100}%`;
  }

  renderWeekOverview();
}

function toggleExercise(id) {
  const logs = loadLogs();
  const key = dateKeyOf(new Date());
  if (!logs[key]) logs[key] = {};
  logs[key][id] = !logs[key][id];
  saveLogs(logs);
  renderToday();
}

// 本周 7 天概览：小方块显示每天是否练完
function renderWeekOverview() {
  const plan = loadPlan();
  const logs = loadLogs();
  const todayIdx = todayDayIndex();
  const el = document.getElementById('week-overview');
  el.innerHTML = '';

  for (let i = 1; i <= 7; i++) {
    const dayLogs = logs[dateKeyOf(dateOfThisWeek(i))] || {};
    const exercises = plan[i] || [];
    const completed = exercises.filter((ex) => dayLogs[ex.id]).length;

    const dot = document.createElement('div');
    dot.className = 'dot';
    if (i === todayIdx) dot.classList.add('today');
    if (exercises.length > 0 && completed === exercises.length) dot.classList.add('full');
    else if (completed > 0) dot.classList.add('partial');
    dot.textContent = DAY_NAMES[i].charAt(1); // '一' '二' ...
    el.appendChild(dot);
  }
}

// ============ 计划编辑 ============

let editingDay = null;

function renderPlanEditor() {
  const plan = loadPlan();
  if (!editingDay) editingDay = todayDayIndex();

  const tabsEl = document.getElementById('day-tabs');
  tabsEl.innerHTML = '';
  for (let i = 1; i <= 7; i++) {
    const btn = document.createElement('button');
    btn.textContent = DAY_NAMES[i];
    btn.className = 'day-tab' + (i === editingDay ? ' active' : '');
    btn.addEventListener('click', () => { editingDay = i; renderPlanEditor(); });
    tabsEl.appendChild(btn);
  }

  const listEl = document.getElementById('edit-list');
  listEl.innerHTML = '';
  const exercises = plan[editingDay] || [];
  exercises.forEach((ex, idx) => listEl.appendChild(buildEditRow(ex, idx)));
}

function buildEditRow(ex, idx) {
  const li = document.createElement('li');
  li.className = 'edit-row';
  li.innerHTML = `
    <input class="edit-name" value="${escapeHtml(ex.name)}" placeholder="动作名">
    <div class="edit-nums">
      <input class="edit-sets" type="number" min="1" inputmode="numeric" value="${ex.sets}">组
      <input class="edit-reps" type="number" min="1" inputmode="numeric" value="${ex.reps}">次
    </div>
    <button class="del">删</button>
  `;
  li.querySelector('.edit-name').addEventListener('change', (e) => updateExercise(idx, 'name', e.target.value.trim()));
  li.querySelector('.edit-sets').addEventListener('change', (e) => updateExercise(idx, 'sets', parseInt(e.target.value) || 1));
  li.querySelector('.edit-reps').addEventListener('change', (e) => updateExercise(idx, 'reps', parseInt(e.target.value) || 1));
  li.querySelector('.del').addEventListener('click', () => deleteExercise(idx));
  return li;
}

function updateExercise(idx, field, value) {
  const plan = loadPlan();
  plan[editingDay][idx][field] = value;
  savePlan(plan);
  renderToday();      // 若编辑的是今天，同步刷新今日页
}

function addExercise() {
  const plan = loadPlan();
  if (!plan[editingDay]) plan[editingDay] = [];
  plan[editingDay].push({ id: 'ex-' + Date.now(), name: '新动作', sets: 3, reps: 10 });
  savePlan(plan);
  renderPlanEditor();
}

function deleteExercise(idx) {
  const plan = loadPlan();
  plan[editingDay].splice(idx, 1);
  savePlan(plan);
  renderPlanEditor();
  renderToday();
}

// ============ 标签切换 ============

function switchTab(name) {
  document.getElementById('view-today').classList.toggle('hidden', name !== 'today');
  document.getElementById('view-plan').classList.toggle('hidden', name !== 'plan');
  document.getElementById('tab-today').classList.toggle('active', name === 'today');
  document.getElementById('tab-plan').classList.toggle('active', name === 'plan');
  if (name === 'plan') renderPlanEditor();
  if (name === 'today') renderToday();
}

// ============ 初始化 ============

document.getElementById('tab-today').addEventListener('click', () => switchTab('today'));
document.getElementById('tab-plan').addEventListener('click', () => switchTab('plan'));
document.getElementById('add-exercise').addEventListener('click', addExercise);

renderToday();

// 注册 Service Worker（仅 http/https 下生效，file:// 会被忽略）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
