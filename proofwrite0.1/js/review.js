/* =========================================================
   Review page — individual student diagnostics
   Reads ?student=<id> from the URL, loads that submission
   from SUBMISSIONS, and renders the replay player + metrics.
   ========================================================= */

/* ---------- FETCH STUDENT FROM URL PARAM ---------- */

// URLSearchParams is the standard way to read ?key=value from
// a URL in modern browsers. No libraries needed.
const params = new URLSearchParams(window.location.search);
const studentId = parseInt(params.get('student'), 10);
const submission = SUBMISSIONS.find(s => s.id === studentId);

if (!submission) {
  document.body.innerHTML = `
    <div style="padding: 80px; text-align: center; font-family: 'Fraunces', serif;">
      <h1 style="font-size: 28px; margin-bottom: 12px;">Submission not found</h1>
      <p><a href="teacher.html" style="color: var(--accent);">\u2190 Back to class dashboard</a></p>
    </div>
  `;
  throw new Error(`Student ${studentId} not found`);
}

/* ---------- RENDER HEADER ---------- */

document.getElementById('review-student-name').textContent = submission.name;
document.getElementById('review-assignment').textContent = ASSIGNMENT.title;
document.getElementById('review-submitted').textContent =
  `Submitted ${submission.submittedAt} \u00b7 ${submission.email}`;

/* ---------- RENDER FLAG BANNER ---------- */

const flagLabels = {
  green: 'Clean — no concerns detected',
  yellow: 'Some activity worth reviewing',
  red: 'Significant indicators of academic dishonesty',
};

const banner = document.getElementById('flag-banner');
banner.classList.add(submission.flag);
document.getElementById('flag-banner-title').textContent = flagLabels[submission.flag];

const reasonsEl = document.getElementById('flag-banner-reasons');
if (submission.reasons.length === 0) {
  reasonsEl.innerHTML = `<em>No anomalies in typing pattern, pasting behavior, or tab activity.</em>`;
} else {
  reasonsEl.innerHTML = `<ul>${submission.reasons.map(r => `<li>${r}</li>`).join('')}</ul>`;
}

/* ---------- RENDER METRICS ---------- */

function fmtDuration(ms) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

const metricsEl = document.getElementById('review-metrics');
const wpmClass = submission.wpm > 80 ? 'alert' : submission.wpm > 55 ? 'warn' : '';
const pasteClass = submission.pastes > 0 ? (submission.pastes > 2 ? 'alert' : 'warn') : '';
const tabClass = submission.tabSwitches > 3 ? 'warn' : '';

metricsEl.innerHTML = `
  <div class="review-metric">
    <div class="review-metric-value">${submission.wordCount}</div>
    <div class="review-metric-label">Words</div>
  </div>
  <div class="review-metric">
    <div class="review-metric-value">${fmtDuration(submission.activeMs)}</div>
    <div class="review-metric-label">Active Time</div>
  </div>
  <div class="review-metric">
    <div class="review-metric-value ${wpmClass}">${submission.wpm}</div>
    <div class="review-metric-label">Avg WPM</div>
  </div>
  <div class="review-metric">
    <div class="review-metric-value ${tabClass}">${submission.tabSwitches}</div>
    <div class="review-metric-label">Tab Switches</div>
  </div>
  <div class="review-metric">
    <div class="review-metric-value ${pasteClass}">${submission.pastes}</div>
    <div class="review-metric-label">Pastes</div>
  </div>
  <div class="review-metric">
    <div class="review-metric-value">${submission.events.length}</div>
    <div class="review-metric-label">Events Logged</div>
  </div>
`;

/* ---------- RENDER EVENT LOG ---------- */

function fmtTimestamp(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const eventLogEl = document.getElementById('event-log');
eventLogEl.innerHTML = submission.events.map(e => `
  <div class="event-log-entry ${e.level || ''}">
    <span class="ts">[${fmtTimestamp(e.t)}]</span>${e.label}
  </div>
`).join('');

/* ---------- REPLAY PLAYER ---------- */

const replayText = document.getElementById('replay-text');
const replayPlay = document.getElementById('replay-play');
const replayFill = document.getElementById('replay-fill');
const replayTime = document.getElementById('replay-time');
const replaySpeed = document.getElementById('replay-speed');
const replayProgress = document.getElementById('replay-progress');

const snapshots = submission.snapshots;
const pasteEvents = submission.events.filter(e => e.type === 'paste');
const duration = snapshots[snapshots.length - 1].t;

let replayState = {
  playing: false,
  startedAt: 0,
  startedFrom: 0,
  rafId: null,
};

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderFrame(sessionMs) {
  let snap = snapshots[0];
  for (const s of snapshots) {
    if (s.t <= sessionMs) snap = s;
    else break;
  }

  let text = snap.text;

  // Interpolate forward for smoother feel on long snapshot gaps
  const nextSnap = snapshots.find(s => s.t > sessionMs);
  if (nextSnap && snap !== nextSnap) {
    const span = nextSnap.t - snap.t;
    const progress = span > 0 ? (sessionMs - snap.t) / span : 0;
    const fromLen = snap.text.length;
    const toLen = nextSnap.text.length;
    if (toLen > fromLen) {
      const interpLen = Math.round(fromLen + (toLen - fromLen) * progress);
      text = nextSnap.text.slice(0, interpLen);
    }
  }

  let html = escapeHtml(text);

  // Highlight pastes that have occurred by this timestamp.
  // For the big-paste student (Felix), this visually shows
  // the whole essay arriving at once.
  for (const pe of pasteEvents) {
    if (pe.t <= sessionMs) {
      // If the paste is the entire essay (big paste case), highlight everything
      if (submission.id === 6 && text.length > 200) {
        html = `<span class="paste-mark">${escapeHtml(text)}</span>`;
        break;
      }
    }
  }

  replayText.innerHTML = html + '<span class="replay-caret"></span>';
  const pct = duration > 0 ? (sessionMs / duration) * 100 : 0;
  replayFill.style.width = `${Math.min(100, pct)}%`;
  replayTime.textContent = `${fmtTimestamp(sessionMs)} / ${fmtTimestamp(duration)}`;
}

replayPlay.addEventListener('click', () => {
  if (replayState.playing) stopReplay();
  else startReplay();
});

replayProgress.addEventListener('click', (e) => {
  const rect = replayProgress.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const targetMs = pct * duration;
  stopReplay();
  replayState.startedFrom = targetMs;
  renderFrame(targetMs);
});

function startReplay() {
  if (replayState.startedFrom >= duration) replayState.startedFrom = 0;
  replayState.playing = true;
  replayState.startedAt = performance.now();
  replayPlay.textContent = '\u275a\u275a';
  tickReplay();
}

function stopReplay() {
  replayState.playing = false;
  if (replayState.rafId) cancelAnimationFrame(replayState.rafId);
  replayPlay.textContent = '\u25b6';
}

function tickReplay() {
  if (!replayState.playing) return;
  const speed = parseFloat(replaySpeed.value);
  const elapsed = (performance.now() - replayState.startedAt) * speed;
  const sessionMs = replayState.startedFrom + elapsed;

  if (sessionMs >= duration) {
    renderFrame(duration);
    stopReplay();
    replayState.startedFrom = duration;
    return;
  }
  renderFrame(sessionMs);
  replayState.rafId = requestAnimationFrame(tickReplay);
}

replaySpeed.addEventListener('change', () => {
  if (replayState.playing) {
    const current = replayState.startedFrom +
      (performance.now() - replayState.startedAt) * parseFloat(replaySpeed.value);
    replayState.startedFrom = current;
    replayState.startedAt = performance.now();
  }
});

// For red-flagged students, default playback to a faster speed
// since the interesting part is the pattern not the text
if (submission.flag === 'red') {
  replaySpeed.value = '4';
}

renderFrame(0);

/* ---------- DECISION BUTTONS (mock) ---------- */

document.querySelectorAll('.decision-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const messages = {
      accept: `Marked as authentic. ${submission.name}'s submission will be graded normally.`,
      flag: `Flagged for follow-up. ${submission.name} will be contacted for discussion.`,
      dismiss: `Dismissed without action.`,
      note: `Note saved to ${submission.name}'s record.`,
    };
    alert(messages[action] || 'Action recorded.');
  });
});
