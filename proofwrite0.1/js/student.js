/* =========================================================
   ProofWrite — student editor logic
   All state lives in-memory for the demo.
   ========================================================= */

const editor = document.getElementById('editor');
const log = document.getElementById('log');
const mActive = document.getElementById('m-active');
const mWpm = document.getElementById('m-wpm');
const mBlurs = document.getElementById('m-blurs');
const mPastes = document.getElementById('m-pastes');
const flagDot = document.getElementById('flag-dot');
const flagLabel = document.getElementById('flag-label');
const flagDesc = document.getElementById('flag-desc');
const wordCountEl = document.getElementById('word-count');
const charCountEl = document.getElementById('char-count');

// Teacher settings — controlled by toggles in sidebar
const settings = {
  blockPaste: true,
  flagTabs: true,
  flagBurst: true,
};

// Session state
const session = {
  startTime: null,
  lastActiveTime: null,
  totalActiveMs: 0,
  events: [],
  pasteCount: 0,
  blurCount: 0,
  snapshots: [],
};

const IDLE_THRESHOLD_MS = 5000;

/* ---------- UTILITIES ---------- */

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function addLog(msg, level = 'info') {
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();

  const elapsed = session.startTime ? performance.now() - session.startTime : 0;
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.innerHTML = `<span class="ts">[${fmtTime(elapsed)}]</span>${msg}`;
  log.insertBefore(entry, log.firstChild);

  while (log.children.length > 40) log.removeChild(log.lastChild);
}

function getText() { return editor.innerText || ''; }

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function updateMetrics() {
  const text = getText();
  const words = countWords(text);
  wordCountEl.textContent = words;
  charCountEl.textContent = text.length;
  mActive.textContent = fmtTime(session.totalActiveMs);
  mBlurs.textContent = session.blurCount;
  mPastes.textContent = session.pasteCount;
  const minutes = session.totalActiveMs / 60000;
  const wpm = minutes > 0.1 ? Math.round(words / minutes) : 0;
  mWpm.textContent = wpm;
}

function recomputeFlag() {
  const text = getText();
  const words = countWords(text);

  let level = 'green';
  const reasons = [];

  if (settings.flagBurst) {
    const bigPaste = session.events.find(e =>
      e.type === 'paste' && e.text && e.text.length > 60
    );
    if (bigPaste) {
      level = 'red';
      reasons.push('Large paste detected.');
    }
  }

  if (settings.flagTabs && session.blurCount >= 3) {
    if (level === 'green') level = 'yellow';
    reasons.push(`${session.blurCount} tab-switches during independent work.`);
  }

  const minutes = session.totalActiveMs / 60000;
  const wpm = minutes > 0.3 ? words / minutes : 0;
  if (wpm > 80) {
    level = 'red';
    reasons.push(`Typing speed ${Math.round(wpm)} WPM is unusually fast.`);
  } else if (wpm > 55) {
    if (level === 'green') level = 'yellow';
    reasons.push(`Typing speed ${Math.round(wpm)} WPM is above grade norm.`);
  }

  flagDot.classList.remove('yellow', 'red');
  if (level === 'yellow') flagDot.classList.add('yellow');
  if (level === 'red') flagDot.classList.add('red');

  flagLabel.textContent = level.charAt(0).toUpperCase() + level.slice(1);
  flagDesc.textContent = reasons.length ? reasons.join(' ') : 'Nothing unusual detected.';
}

function touchActivity() {
  const now = performance.now();
  if (!session.startTime) {
    session.startTime = now;
    session.lastActiveTime = now;
    return;
  }
  const gap = now - session.lastActiveTime;
  if (gap < IDLE_THRESHOLD_MS) {
    session.totalActiveMs += gap;
  }
  session.lastActiveTime = now;
}

function recordEvent(evt) {
  const t = session.startTime ? performance.now() - session.startTime : 0;
  session.events.push({ t, ...evt });
}

function snapshotContent() {
  const t = session.startTime ? performance.now() - session.startTime : 0;
  session.snapshots.push({ t, text: getText() });
}

/* ---------- EDITOR EVENT LISTENERS ---------- */

editor.addEventListener('input', (e) => {
  touchActivity();
  if (e.inputType !== 'insertFromPaste') {
    recordEvent({
      type: 'keystroke',
      inputType: e.inputType,
      data: e.data,
    });
  }
  snapshotContent();
  updateMetrics();
  recomputeFlag();
});

editor.addEventListener('paste', (e) => {
  const pastedText = (e.clipboardData || window.clipboardData).getData('text');
  const allowedByQuote = charBeforeCaretIsQuoteOrParen();

  if (settings.blockPaste && !allowedByQuote) {
    e.preventDefault();
    editor.classList.remove('paste-blocked');
    void editor.offsetWidth;
    editor.classList.add('paste-blocked');
    addLog(`Paste blocked (${pastedText.length} chars)`, 'warn');
    recordEvent({ type: 'paste_blocked', length: pastedText.length });
    return;
  }

  session.pasteCount++;
  touchActivity();
  recordEvent({ type: 'paste', text: pastedText, length: pastedText.length });
  const level = pastedText.length > 60 ? 'alert' : 'warn';
  addLog(`Paste allowed (${pastedText.length} chars)`, level);
});

function charBeforeCaretIsQuoteOrParen() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;
  if (node.nodeType !== Node.TEXT_NODE || offset === 0) return false;
  const prev = node.textContent[offset - 1];
  return prev === '"' || prev === '\u201C' || prev === '(' || prev === "'";
}

window.addEventListener('blur', () => {
  if (!session.startTime) return;
  session.blurCount++;
  recordEvent({ type: 'blur' });
  if (settings.flagTabs) {
    addLog(`Left the page (switch #${session.blurCount})`, 'warn');
  } else {
    addLog(`Left the page`);
  }
  updateMetrics();
  recomputeFlag();
});

window.addEventListener('focus', () => {
  if (!session.startTime) return;
  recordEvent({ type: 'focus' });
});

document.querySelectorAll('.toggle').forEach(tog => {
  tog.addEventListener('click', () => {
    tog.classList.toggle('on');
    const setting = tog.dataset.setting;
    settings[setting] = tog.classList.contains('on');
    addLog(`Setting "${setting}" \u2192 ${settings[setting] ? 'ON' : 'OFF'}`);
    recomputeFlag();
  });
});

document.getElementById('submit-btn').addEventListener('click', () => {
  const words = countWords(getText());
  if (words < 10) {
    alert('Your essay is too short to submit.');
    return;
  }
  addLog(`Assignment submitted (${words} words)`);
  alert(`Submitted!\n\n${words} words \u00b7 ${fmtTime(session.totalActiveMs)} active time\n\nYour teacher can now review your writing session.`);
});

/* ---------- REPLAY MODAL ---------- */

const modal = document.getElementById('modal');
const replayText = document.getElementById('replay-text');
const replayPlay = document.getElementById('replay-play');
const replayFill = document.getElementById('replay-fill');
const replayTime = document.getElementById('replay-time');
const replaySpeed = document.getElementById('replay-speed');
const replayProgress = document.getElementById('replay-progress');

let replayState = {
  playing: false,
  startedAt: 0,
  startedFrom: 0,
  rafId: null,
  duration: 0,
};

document.getElementById('review-btn').addEventListener('click', openReplay);
document.getElementById('modal-close').addEventListener('click', closeReplay);
modal.addEventListener('click', (e) => { if (e.target === modal) closeReplay(); });

function openReplay() {
  if (session.snapshots.length === 0) {
    alert('No writing session recorded yet.');
    return;
  }
  replayState.duration = session.snapshots[session.snapshots.length - 1].t;
  replayState.startedFrom = 0;
  renderFrame(0);
  modal.classList.add('open');
}

function closeReplay() {
  stopReplay();
  modal.classList.remove('open');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderFrame(sessionMs) {
  let snap = session.snapshots[0];
  for (const s of session.snapshots) {
    if (s.t <= sessionMs) snap = s;
    else break;
  }

  let html = escapeHtml(snap.text);
  const pasteEvents = session.events.filter(
    e => e.type === 'paste' && e.t <= sessionMs && e.text
  );
  for (const pe of pasteEvents) {
    const esc = escapeHtml(pe.text);
    const idx = html.indexOf(esc);
    if (idx !== -1) {
      html = html.slice(0, idx) +
        `<span class="paste-mark">${esc}</span>` +
        html.slice(idx + esc.length);
    }
  }

  const nextSnap = session.snapshots.find(s => s.t > sessionMs);
  if (nextSnap && snap !== nextSnap) {
    const span = nextSnap.t - snap.t;
    const progress = span > 0 ? (sessionMs - snap.t) / span : 0;
    const fromLen = snap.text.length;
    const toLen = nextSnap.text.length;
    if (toLen > fromLen) {
      const interpLen = Math.round(fromLen + (toLen - fromLen) * progress);
      html = escapeHtml(nextSnap.text.slice(0, interpLen));
    }
  }

  replayText.innerHTML = html + '<span class="replay-caret"></span>';
  const pct = replayState.duration > 0 ? (sessionMs / replayState.duration) * 100 : 0;
  replayFill.style.width = `${Math.min(100, pct)}%`;
  replayTime.textContent = `${fmtTime(sessionMs)} / ${fmtTime(replayState.duration)}`;
}

replayPlay.addEventListener('click', () => {
  if (replayState.playing) stopReplay();
  else startReplay();
});

replayProgress.addEventListener('click', (e) => {
  const rect = replayProgress.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const targetMs = pct * replayState.duration;
  stopReplay();
  replayState.startedFrom = targetMs;
  renderFrame(targetMs);
});

function startReplay() {
  if (replayState.startedFrom >= replayState.duration) {
    replayState.startedFrom = 0;
  }
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

  if (sessionMs >= replayState.duration) {
    renderFrame(replayState.duration);
    stopReplay();
    replayState.startedFrom = replayState.duration;
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

/* ---------- LIVE ACTIVE-TIME TICKER ---------- */

setInterval(() => {
  if (!session.startTime || !session.lastActiveTime) return;
  const sinceLast = performance.now() - session.lastActiveTime;
  if (sinceLast < IDLE_THRESHOLD_MS) {
    mActive.textContent = fmtTime(session.totalActiveMs + sinceLast);
  }
}, 500);

addLog('Session ready. Waiting for first keystroke\u2026');
updateMetrics();
recomputeFlag();
editor.focus();
