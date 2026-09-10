// ============ 数据模型 ============

// 1 = 周一 ... 7 = 周日（0 号位留空，方便下标直接取）
const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 固定训练计划（不可修改）：每个动作有 id（唯一）、name、detail（组数×次数说明）
// 训练周期从周三开始排，到下周二「完全休息」
const DEFAULT_PLAN = {
  1: [ // 周一：全身补强（可选）
    { id: 'fullbody-mix', name: '俯卧撑 / 引体 / 分腿蹲（任选 2 项）', detail: '中低强度' },
  ],
  2: [], // 周二：完全休息
  3: [ // 周三：推（肩+胸）
    { id: 'pike-pushup', name: '派克俯卧撑', detail: '4×8-12' },
    { id: 'pushup', name: '俯卧撑', detail: '3×尽量多' },
    { id: 'lateral-raise', name: '侧平举', detail: '4×12-15' },
    { id: 'reverse-fly', name: '俯身飞鸟', detail: '3×12-15' },
  ],
  4: [ // 周四：拉（背+腹）
    { id: 'pullup', name: '引体', detail: '4×尽量多' },
    { id: 'chinup', name: '反手/窄距引体（或离心引体）', detail: '3×尽量多' },
    { id: 'hanging-leg-raise', name: '悬垂举腿', detail: '3×8-12' },
    { id: 'ab-wheel', name: '健腹轮', detail: '3×8-12' },
  ],
  5: [ // 周五：腿（+腹）
    { id: 'bw-squat', name: '徒手深蹲（热身）', detail: '2×10' },
    { id: 'bulgarian-split-squat', name: '保加利亚分腿蹲', detail: '3×8-12/腿' },
    { id: 'single-leg-hip-bridge', name: '单腿臀桥', detail: '3×12/腿' },
    { id: 'calf-raise', name: '提踵', detail: '3×20' },
    { id: 'crunch', name: '卷腹', detail: '3×15' },
  ],
  6: [ // 周六：肩变式进阶（+腹）
    { id: 'elevated-pike-pushup', name: '高位派克俯卧撑（脚垫更高）', detail: '4×6-10' },
    { id: 'lateral-raise-slow', name: '侧平举（慢速离心）', detail: '4×15' },
    { id: 'wall-handstand', name: '靠墙倒立', detail: '3×30-60s' },
    { id: 'ab-wheel', name: '健腹轮', detail: '3×10-12' },
    { id: 'hanging-leg-raise', name: '悬垂举腿', detail: '3×10-12' },
  ],
  7: [ // 周日：主动恢复
    { id: 'stretch-posture', name: '拉伸 + 体态（靠墙站立/肩胛后缩）', detail: '' },
    { id: 'face-pull', name: '面拉（有弹力带就做）', detail: '2×15' },
    { id: 'plank', name: '平板', detail: '2×30s' },
  ],
};

const PLAN_KEY = 'fitness-plan-v2';
const LOGS_KEY = 'fitness-logs-v2';

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
          ${ex.detail ? `<span class="detail">${escapeHtml(ex.detail)}</span>` : ''}
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

// ============ 初始化 ============

// 一开始就显示日期（开始页也能看到今天周几）
document.getElementById('date-label').textContent = `${DAY_NAMES[todayDayIndex()]} · ${dateKeyOf(new Date())}`;

// 点「开始」→ 进入今日训练计划
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('view-today').classList.remove('hidden');
  renderToday();
});

// 注册 Service Worker（仅 http/https 下生效，file:// 会被忽略）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
