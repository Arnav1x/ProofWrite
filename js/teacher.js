/* =========================================================
   Teacher dashboard — class overview
   Renders a table of submissions with filter/sort controls.
   Clicking a row navigates to review.html?student=<id>.
   ========================================================= */

const tableEl = document.getElementById('submissions-body');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sort-select');

let currentFilter = 'all';
let currentSort = 'name';

/* ---------- SUMMARY STATS (top bar) ---------- */

function renderStats() {
  const total = SUBMISSIONS.length;
  const green = SUBMISSIONS.filter(s => s.flag === 'green').length;
  const yellow = SUBMISSIONS.filter(s => s.flag === 'yellow').length;
  const red = SUBMISSIONS.filter(s => s.flag === 'red').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-green').textContent = green;
  document.getElementById('stat-yellow').textContent = yellow;
  document.getElementById('stat-red').textContent = red;
}

/* ---------- SUBMISSIONS TABLE ---------- */

function fmtDuration(ms) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function renderSubmissions() {
  let rows = [...SUBMISSIONS];

  // Filter
  if (currentFilter !== 'all') {
    rows = rows.filter(s => s.flag === currentFilter);
  }

  // Sort
  const sorts = {
    name: (a, b) => a.name.localeCompare(b.name),
    flag: (a, b) => {
      const order = {red: 0, yellow: 1, green: 2};
      return order[a.flag] - order[b.flag];
    },
    words: (a, b) => b.wordCount - a.wordCount,
    time: (a, b) => b.activeMs - a.activeMs,
    wpm: (a, b) => b.wpm - a.wpm,
  };
  rows.sort(sorts[currentSort] || sorts.name);

  if (rows.length === 0) {
    tableEl.innerHTML = `<div class="empty-state">No submissions match this filter.</div>`;
    return;
  }

  tableEl.innerHTML = rows.map(s => `
    <a class="submission-row" href="review.html?student=${s.id}">
      <span class="pill ${s.flag}">${s.flag}</span>
      <div>
        <div class="student-name">${s.name}</div>
        <div class="student-email">${s.email}</div>
      </div>
      <div>
        <div class="row-value">${s.wordCount}</div>
        <div class="row-sub">words</div>
      </div>
      <div class="col-time">
        <div class="row-value">${fmtDuration(s.activeMs)}</div>
        <div class="row-sub">active</div>
      </div>
      <div class="col-speed">
        <div class="row-value">${s.wpm}</div>
        <div class="row-sub">wpm</div>
      </div>
      <div class="col-pastes">
        <div class="row-value">${s.pastes}p \u00b7 ${s.tabSwitches}t</div>
        <div class="row-sub">paste / tab</div>
      </div>
      <div class="row-arrow">Review \u2192</div>
    </a>
  `).join('');
}

/* ---------- EVENT LISTENERS ---------- */

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderSubmissions();
  });
});

sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderSubmissions();
});

/* ---------- INIT ---------- */

document.getElementById('dashboard-title').textContent = ASSIGNMENT.title;
document.getElementById('dashboard-meta').textContent =
  `Due ${ASSIGNMENT.dueDate} \u00b7 ${ASSIGNMENT.class} \u00b7 Target: ${ASSIGNMENT.wordTarget}`;

renderStats();
renderSubmissions();
