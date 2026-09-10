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

// 计划和日志在内存里留一份，避免每次点勾都重新读 localStorage + JSON.parse
// （本应用是唯一的写入方，内存里的就是最新的）
const plan = loadPlan();
let logs = loadLogs();

// ============ DOM 元素 ============

const el = {
  dateLabel: document.getElementById('date-label'),
  todayList: document.getElementById('today-list'),
  restDay: document.getElementById('rest-day'),
  progress: document.getElementById('progress'),
  progressText: document.getElementById('progress-text'),
  progressBar: document.getElementById('progress-bar'),
  timerText: document.getElementById('timer-text'),
  timerBtn: document.getElementById('timer-btn'),
  ringFg: document.querySelector('.ring-fg'),
  startBtn: document.getElementById('start-btn'),
  startScreen: document.getElementById('start-screen'),
  viewToday: document.getElementById('view-today'),
};

// ============ 今日打卡 ============

function renderToday() {
  const key = dateKeyOf(new Date());
  const dayIndex = todayDayIndex();
  const exercises = plan[dayIndex] || [];
  const done = logs[key] || {};

  el.dateLabel.textContent = `${DAY_NAMES[dayIndex]} · ${key}`;

  if (exercises.length === 0) {
    el.todayList.innerHTML = '';
    el.restDay.classList.remove('hidden');
    el.progress.classList.add('hidden');
  } else {
    el.restDay.classList.add('hidden');
    el.progress.classList.remove('hidden');

    el.todayList.innerHTML = '';
    exercises.forEach((ex) => {
      const checked = !!done[ex.id];
      const li = document.createElement('li');
      li.className = 'exercise' + (checked ? ' done' : '');
      li.innerHTML = `
        <button class="check" data-id="${escapeHtml(ex.id)}">${checked ? '✓' : ''}</button>
        <div class="info">
          <span class="name">${escapeHtml(ex.name)}</span>
          ${ex.detail ? `<span class="detail">${escapeHtml(ex.detail)}</span>` : ''}
        </div>
      `;
      li.querySelector('.check').addEventListener('click', () => toggleExercise(ex.id));
      el.todayList.appendChild(li);
    });

    const total = exercises.length;
    const completed = exercises.filter((ex) => done[ex.id]).length;
    el.progressText.textContent = `${completed}/${total}`;
    el.progressBar.style.width = `${(completed / total) * 100}%`;
  }
}

function toggleExercise(id) {
  const key = dateKeyOf(new Date());
  if (!logs[key]) logs[key] = {};
  logs[key][id] = !logs[key][id];
  saveLogs(logs);
  renderToday();
}

// ============ 组间休息计时器 ============

const TIMER_DURATION = 90; // 90 秒一圈
const RING_RADIUS = 52; // 和 index.html 里 circle 的 r 保持一致
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

let timerEndAt = null;    // 倒计时结束的时间点（Date.now() 毫秒），没在跑时为 null
let timerInterval = null;
let timerRunning = false;

// 还剩几秒；用时间戳计算，锁屏/切后台回来也依然准确
function timerSecondsLeft() {
  return timerRunning
    ? Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000))
    : TIMER_DURATION;
}

function updateTimer() {
  const remaining = timerSecondsLeft();
  el.timerText.textContent = remaining;
  const offset = RING_CIRCUMFERENCE * (remaining / TIMER_DURATION);
  el.ringFg.style.strokeDashoffset = offset;
}

function startTimer() {
  if (timerRunning) return; // 已经在跑，忽略重复点击
  timerRunning = true;
  timerEndAt = Date.now() + TIMER_DURATION * 1000;
  updateTimer();
  el.timerBtn.textContent = '休息中…';
  timerInterval = setInterval(() => {
    updateTimer();
    if (timerSecondsLeft() <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      el.timerBtn.textContent = '开始';
      if (navigator.vibrate) navigator.vibrate(200); // 安卓真震动
      flashRing(); // iPhone 用闪烁提醒
    }
  }, 1000);
}

function flashRing() {
  let flashes = 0;
  const t = setInterval(() => {
    el.ringFg.style.stroke = flashes % 2 === 0 ? '#ffffff' : '#34d399';
    flashes++;
    if (flashes >= 6) {
      clearInterval(t);
      el.ringFg.style.stroke = '#34d399';
    }
  }, 200);
}

// ============ 初始化 ============

// 让 JS 成为圆环周长的唯一来源，CSS 里不再写死 326.73
el.ringFg.style.strokeDasharray = RING_CIRCUMFERENCE;

// 一开始就显示日期（开始页也能看到今天周几）
el.dateLabel.textContent = `${DAY_NAMES[todayDayIndex()]} · ${dateKeyOf(new Date())}`;

// 点「开始」→ 进入今日训练计划
el.startBtn.addEventListener('click', () => {
  el.startScreen.classList.add('hidden');
  el.viewToday.classList.remove('hidden');
  renderToday();
});

// 组间休息计时器
updateTimer();
el.timerBtn.addEventListener('click', startTimer);

// 注册 Service Worker（仅 http/https 下生效，file:// 会被忽略）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
