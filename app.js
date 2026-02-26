'use strict';
/* =============================================
   SwimTrack Pro — app.js
   All app logic: timers, localStorage, CSV, leaderboards
   John Vorster Hoërskool Swim Coaching
   © 2025 Schanke Sync Freelance Developers
   ============================================= */

(function () {

  // ── Constants ──────────────────────────────────────────────
  const KEYS = {
    swimmers: 'stp_swimmers',
    lapSessions: 'stp_lap_sessions',
    jumpSessions: 'stp_jump_sessions'
  };

  // ── Helpers ────────────────────────────────────────────────
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /** Format milliseconds → 'MM:SS.cc' (centiseconds) */
  function formatTimerDisplay(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60);
    return (
      String(min).padStart(2, '0') + ':' +
      String(sec).padStart(2, '0') + '.' +
      String(cs).padStart(2, '0')
    );
  }

  /** Format milliseconds → 'S.cc' for display in tables */
  function formatTime(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    return totalSec + '.' + String(cs).padStart(2, '0') + 's';
  }

  /** Format timestamp → 'YYYY-MM-DD HH:mm' */
  function formatDate(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes())
    );
  }

  // ── Storage ────────────────────────────────────────────────
  function getSwimmers()     { return JSON.parse(localStorage.getItem(KEYS.swimmers) || '[]'); }
  function saveSwimmers(arr) { localStorage.setItem(KEYS.swimmers, JSON.stringify(arr)); }
  function getLapRecords()     { return JSON.parse(localStorage.getItem(KEYS.lapSessions) || '[]'); }
  function saveLapRecords(arr) { localStorage.setItem(KEYS.lapSessions, JSON.stringify(arr)); }
  function getJumpRecords()     { return JSON.parse(localStorage.getItem(KEYS.jumpSessions) || '[]'); }
  function saveJumpRecords(arr) { localStorage.setItem(KEYS.jumpSessions, JSON.stringify(arr)); }

  // ── DOM refs ───────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // Lap Timer
  const lapTimerDisplay  = $('lap-timer-display');
  const lapCurrentDisplay = $('lap-current-display');
  const lapListBody      = $('lap-list-body');
  const lapSwimmerSelect = $('lap-swimmer-select');
  const btnLapStart      = $('btn-lap-start');
  const btnLapLap        = $('btn-lap-lap');
  const btnLapStop       = $('btn-lap-stop');
  const btnLapReset      = $('btn-lap-reset');
  const btnLapSave       = $('btn-lap-save');
  const lapNewName       = $('lap-new-name');
  const lapNewStroke     = $('lap-new-stroke');
  const btnLapQuickAdd   = $('btn-lap-quick-add');

  // Jump Timer
  const jumpPhaseDisplay    = $('jump-phase-display');
  const jumpReactionDisplay = $('jump-reaction-display');
  const jumpResultBadge     = $('jump-result-badge');
  const jumpSwimmerSelect   = $('jump-swimmer-select');
  const jumpRecentList      = $('jump-recent-list');
  const btnJumpArm          = $('btn-jump-arm');
  const btnJumpSave         = $('btn-jump-save');

  // Swimmers
  const addSwimmerForm  = $('add-swimmer-form');
  const swimmerNameInput = $('swimmer-name');
  const swimmerStrokeInput = $('swimmer-stroke');
  const swimmerListEl   = $('swimmer-list');

  // Leaderboard
  const leaderboardBody = $('leaderboard-body');
  const leaderboardTabs = $$('.leaderboard-tab');

  // History
  const historyListEl       = $('history-list');
  const historyTypeFilter   = $('history-type-filter');
  const historySwimmerFilter = $('history-swimmer-filter');

  // Settings
  const btnClearData = $('btn-clear-data');

  // ═══════════════════════════════════════════════════════════
  // TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════
  let activeTab = 'lap';

  function showTab(tabId) {
    $$('.tab-section').forEach(s => s.classList.remove('active'));
    $$('[data-tab]').forEach(b => b.classList.remove('active'));

    const section = document.querySelector(`.tab-section[data-tab="${tabId}"]`);
    if (section) section.classList.add('active');

    // highlight nav + header buttons for same tab
    $$(`[data-tab="${tabId}"]`).forEach(b => {
      if (b.closest('.tab-nav') || b.closest('.app-header')) b.classList.add('active');
    });

    activeTab = tabId;

    // Re-render on tab switch for freshness
    if (tabId === 'leaderboard') renderLeaderboard(currentBoardStroke);
    if (tabId === 'history')    renderHistory();
    if (tabId === 'swimmers')   renderSwimmerList();
  }

  function setupTabNav() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', function () {
        showTab(this.dataset.tab);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SWIMMER MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  function addSwimmer(name, stroke) {
    if (!name.trim()) { alert('Please enter a swimmer name.'); return; }
    const swimmer = { id: generateId(), name: name.trim(), stroke, createdAt: Date.now() };
    const swimmers = getSwimmers();
    swimmers.push(swimmer);
    saveSwimmers(swimmers);
    refreshSwimmerDropdowns();
    renderSwimmerList();
    if (activeTab === 'leaderboard') renderLeaderboard(currentBoardStroke);
    if (activeTab === 'history') renderHistory();
    return swimmer;
  }

  function deleteSwimmer(swimmerId) {
    if (!confirm('Delete this swimmer and all their records?')) return;
    saveSwimmers(getSwimmers().filter(s => s.id !== swimmerId));
    saveLapRecords(getLapRecords().filter(r => r.swimmerId !== swimmerId));
    saveJumpRecords(getJumpRecords().filter(r => r.swimmerId !== swimmerId));
    refreshSwimmerDropdowns();
    renderSwimmerList();
    renderLeaderboard(currentBoardStroke);
    renderHistory();
  }

  function getSwimmerStats(swimmerId) {
    const laps  = getLapRecords().filter(r => r.swimmerId === swimmerId);
    const jumps = getJumpRecords().filter(r => r.swimmerId === swimmerId);
    const validJumps = jumps.filter(r => !r.falseStart);

    const bestLap   = laps.length   ? Math.min(...laps.map(r => r.lapTime)) : null;
    const avgLap    = laps.length   ? laps.reduce((s, r) => s + r.lapTime, 0) / laps.length : null;
    const avgJump   = validJumps.length ? validJumps.reduce((s, r) => s + r.reactionTime, 0) / validJumps.length : null;
    const falseStarts = jumps.filter(r => r.falseStart).length;

    return { bestLap, avgLap, totalLaps: laps.length, avgJump, falseStarts };
  }

  function renderSwimmerList() {
    const swimmers = getSwimmers();
    if (!swimmers.length) {
      swimmerListEl.innerHTML = '<p class="empty-state">No swimmers yet. Add one above.</p>';
      return;
    }
    swimmerListEl.innerHTML = '';
    swimmers.forEach(sw => {
      const stats = getSwimmerStats(sw.id);
      const card = document.createElement('div');
      card.className = 'swimmer-card';
      card.innerHTML = `
        <div class="swimmer-card-header">
          <h3>${escHtml(sw.name)}</h3>
          <span class="stroke-badge">${escHtml(sw.stroke)}</span>
          <button class="btn btn-danger btn-sm" data-delete="${sw.id}">✕</button>
        </div>
        <div class="swimmer-stats">
          <span>Best lap <span class="stat-val">${stats.bestLap !== null ? formatTime(stats.bestLap) : '—'}</span></span>
          <span>Avg lap <span class="stat-val">${stats.avgLap !== null ? formatTime(stats.avgLap) : '—'}</span></span>
          <span>Total laps <span class="stat-val">${stats.totalLaps}</span></span>
          <span>Avg reaction <span class="stat-val">${stats.avgJump !== null ? Math.round(stats.avgJump) + 'ms' : '—'}</span></span>
          <span>False starts <span class="stat-val">${stats.falseStarts}</span></span>
        </div>
      `;
      card.querySelector('[data-delete]').addEventListener('click', function () {
        deleteSwimmer(this.dataset.delete);
      });
      swimmerListEl.appendChild(card);
    });
  }

  function refreshSwimmerDropdowns() {
    const swimmers = getSwimmers();
    [lapSwimmerSelect, jumpSwimmerSelect].forEach(sel => {
      const prev = sel.value;
      sel.innerHTML = '<option value="">— Select swimmer —</option>';
      swimmers.forEach(sw => {
        const o = document.createElement('option');
        o.value = sw.id;
        o.textContent = sw.name;
        sel.appendChild(o);
      });
      if (prev) sel.value = prev;
    });

    // History swimmer filter
    const prevH = historySwimmerFilter.value;
    historySwimmerFilter.innerHTML = '<option value="">All swimmers</option>';
    swimmers.forEach(sw => {
      const o = document.createElement('option');
      o.value = sw.id;
      o.textContent = sw.name;
      historySwimmerFilter.appendChild(o);
    });
    if (prevH) historySwimmerFilter.value = prevH;
  }

  // Swimmer form
  addSwimmerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addSwimmer(swimmerNameInput.value, swimmerStrokeInput.value);
    this.reset();
  });

  // Lap section quick-add
  btnLapQuickAdd.addEventListener('click', function () {
    if (!lapNewName.value.trim()) { lapNewName.focus(); return; }
    const sw = addSwimmer(lapNewName.value, lapNewStroke.value);
    if (sw) {
      lapSwimmerSelect.value = sw.id;
      lapNewName.value = '';
    }
  });

  // ═══════════════════════════════════════════════════════════
  // LAP TIMER
  // ═══════════════════════════════════════════════════════════
  const lapState = {
    running: false,
    startTime: null,
    lapStartTime: null,
    elapsed: 0,
    intervalId: null,
    laps: [],          // array of split times in ms
    sessionId: null
  };

  function lapTimerStart() {
    if (lapState.running) return;
    lapState.sessionId = lapState.sessionId || generateId();
    lapState.startTime = Date.now() - lapState.elapsed;
    lapState.lapStartTime = Date.now();
    lapState.running = true;

    lapState.intervalId = setInterval(function () {
      lapState.elapsed = Date.now() - lapState.startTime;
      lapTimerDisplay.textContent = formatTimerDisplay(lapState.elapsed);
    }, 33); // ~30fps

    lapTimerDisplay.classList.add('running');
    lapTimerDisplay.classList.remove('stopped');
    btnLapStart.disabled = true;
    btnLapLap.disabled   = false;
    btnLapStop.disabled  = false;
  }

  function lapTimerLap() {
    if (!lapState.running) return;
    const split = Date.now() - lapState.lapStartTime;
    lapState.laps.push(split);
    lapState.lapStartTime = Date.now();
    lapCurrentDisplay.textContent = 'Lap ' + lapState.laps.length;
    renderLapTable();
  }

  function lapTimerStop() {
    clearInterval(lapState.intervalId);
    lapState.elapsed = Date.now() - lapState.startTime;
    lapState.running = false;
    lapTimerDisplay.classList.remove('running');
    lapTimerDisplay.classList.add('stopped');
    btnLapStart.disabled = false;
    btnLapLap.disabled   = true;
    btnLapStop.disabled  = true;
  }

  function lapTimerReset() {
    clearInterval(lapState.intervalId);
    Object.assign(lapState, {
      running: false, startTime: null, lapStartTime: null,
      elapsed: 0, intervalId: null, laps: [], sessionId: null
    });
    lapTimerDisplay.textContent = '00:00.00';
    lapTimerDisplay.classList.remove('running', 'stopped');
    lapCurrentDisplay.textContent = 'Lap 0';
    lapListBody.innerHTML = '';
    btnLapStart.disabled = false;
    btnLapLap.disabled   = true;
    btnLapStop.disabled  = true;
  }

  function lapTimerSave() {
    const swimmerId = lapSwimmerSelect.value;
    if (!swimmerId) { alert('Select a swimmer before saving.'); return; }
    if (!lapState.laps.length) { alert('No laps recorded yet.'); return; }

    const swimmer = getSwimmers().find(s => s.id === swimmerId);
    if (!swimmer) { alert('Swimmer not found.'); return; }

    const existing = getLapRecords();
    const sessionId = lapState.sessionId || generateId();
    const now = Date.now();

    lapState.laps.forEach((lapTime, i) => {
      existing.push({
        id: generateId(),
        swimmerId,
        stroke: swimmer.stroke,
        lapTime,
        lapNumber: i + 1,
        sessionId,
        timestamp: now + i
      });
    });

    saveLapRecords(existing);
    alert('Session saved — ' + lapState.laps.length + ' lap(s) recorded!');
    lapTimerReset();
    renderSwimmerList();
    renderLeaderboard(currentBoardStroke);
    renderHistory();
  }

  function renderLapTable() {
    lapListBody.innerHTML = '';
    let cum = 0;
    lapState.laps.forEach((split, i) => {
      cum += split;
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + formatTimerDisplay(split) + '</td><td>' + formatTimerDisplay(cum) + '</td>';
      lapListBody.appendChild(tr);
    });
  }

  btnLapStart.addEventListener('click', lapTimerStart);
  btnLapLap.addEventListener('click', lapTimerLap);
  btnLapStop.addEventListener('click', lapTimerStop);
  btnLapReset.addEventListener('click', lapTimerReset);
  btnLapSave.addEventListener('click', lapTimerSave);

  // ═══════════════════════════════════════════════════════════
  // JUMP / REACTION TIMER
  // ═══════════════════════════════════════════════════════════
  const jumpState = {
    phase: 'ready',   // 'ready' | 'waiting' | 'go' | 'result'
    startTime: null,
    reactionTime: null,
    timeoutId: null
  };

  function jumpSetPhase(phase) {
    jumpState.phase = phase;
    jumpPhaseDisplay.className = 'jump-phase phase-' + phase;
    const msgs = { ready: 'Tap ARM to begin', waiting: 'Get ready…', go: 'GO!', result: 'Result' };
    if (phase !== 'result') jumpPhaseDisplay.textContent = msgs[phase] || '';
  }

  function jumpArm() {
    if (jumpState.phase === 'ready' || jumpState.phase === 'result') {
      jumpReactionDisplay.textContent = '';
      jumpResultBadge.className = 'result-badge';
      jumpResultBadge.textContent = '';
      jumpSetPhase('waiting');
      btnJumpArm.textContent = '⏳ Waiting…';
      btnJumpArm.disabled = true;

      const delay = 1000 + Math.random() * 2000;
      jumpState.timeoutId = setTimeout(function () {
        jumpState.startTime = Date.now();
        jumpSetPhase('go');
        btnJumpArm.textContent = 'TAP!';
        btnJumpArm.disabled = false;
      }, delay);

    } else if (jumpState.phase === 'go') {
      // Swimmer tapped on ARM button
      jumpRecordReaction();
    }
  }

  function jumpRecordReaction() {
    if (jumpState.phase !== 'go') return;
    const rt = Date.now() - jumpState.startTime;
    jumpState.reactionTime = rt;
    const falseStart = rt < 100;

    jumpSetPhase('result');
    jumpPhaseDisplay.textContent = falseStart ? '⛔ FALSE START' : '✓ Recorded';
    jumpReactionDisplay.textContent = falseStart ? '' : rt + 'ms';

    if (falseStart) {
      jumpResultBadge.className = 'result-badge false-start';
      jumpResultBadge.textContent = 'FALSE START — reaction < 100ms';
    } else {
      let rating = 'slow';
      let label = 'Slow';
      if (rt < 150) { rating = 'excellent'; label = 'Excellent!'; }
      else if (rt < 200) { rating = 'good'; label = 'Good'; }
      else if (rt < 300) { rating = 'average'; label = 'Average'; }
      jumpResultBadge.className = 'result-badge ' + rating;
      jumpResultBadge.textContent = label + ' — ' + rt + 'ms';
    }

    btnJumpArm.textContent = '↺ Retry';
    btnJumpArm.disabled = false;
  }

  function jumpSaveAndReset() {
    if (jumpState.phase !== 'result') {
      // Just reset
      jumpReset();
      return;
    }
    const swimmerId = jumpSwimmerSelect.value;
    if (!swimmerId) { alert('Select a swimmer before saving.'); return; }

    const records = getJumpRecords();
    records.push({
      id: generateId(),
      swimmerId,
      reactionTime: jumpState.reactionTime,
      falseStart: jumpState.reactionTime < 100,
      timestamp: Date.now()
    });
    saveJumpRecords(records);
    renderRecentJumps(swimmerId);
    renderSwimmerList();
    renderLeaderboard(currentBoardStroke);
    renderHistory();
    jumpReset();
  }

  function jumpReset() {
    clearTimeout(jumpState.timeoutId);
    jumpState.phase = 'ready';
    jumpState.startTime = null;
    jumpState.reactionTime = null;
    jumpSetPhase('ready');
    jumpReactionDisplay.textContent = '';
    jumpResultBadge.className = 'result-badge';
    jumpResultBadge.textContent = '';
    btnJumpArm.textContent = 'ARM';
    btnJumpArm.disabled = false;
  }

  function renderRecentJumps(swimmerId) {
    if (!swimmerId) { jumpRecentList.innerHTML = ''; return; }
    const records = getJumpRecords()
      .filter(r => r.swimmerId === swimmerId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    if (!records.length) {
      jumpRecentList.innerHTML = '<li style="color:var(--text-muted);font-size:0.875rem;">No jumps recorded yet.</li>';
      return;
    }

    jumpRecentList.innerHTML = records.map(r => {
      const badge = r.falseStart
        ? '<span class="type-badge false-start">FALSE</span>'
        : '<span class="type-badge jump">' + r.reactionTime + 'ms</span>';
      return '<li style="padding:0.3rem 0;font-size:0.875rem;">' + badge + ' ' + formatDate(r.timestamp) + '</li>';
    }).join('');
  }

  btnJumpArm.addEventListener('click', jumpArm);
  btnJumpSave.addEventListener('click', jumpSaveAndReset);
  jumpSwimmerSelect.addEventListener('change', function () {
    renderRecentJumps(this.value);
  });

  // ═══════════════════════════════════════════════════════════
  // LEADERBOARD
  // ═══════════════════════════════════════════════════════════
  let currentBoardStroke = 'Free';

  function renderLeaderboard(stroke) {
    currentBoardStroke = stroke;
    const swimmers = getSwimmers();
    const getName = id => { const s = swimmers.find(x => x.id === id); return s ? s.name : 'Unknown'; };

    let rows = [];

    if (stroke === 'Jump') {
      // Min reaction time per swimmer (excluding false starts)
      const grouped = {};
      getJumpRecords().filter(r => !r.falseStart).forEach(r => {
        if (grouped[r.swimmerId] === undefined || r.reactionTime < grouped[r.swimmerId]) {
          grouped[r.swimmerId] = r.reactionTime;
        }
      });
      rows = Object.entries(grouped)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 10)
        .map(([id, ms], i) => ({ rank: i + 1, name: getName(id), display: ms + 'ms' }));
    } else {
      // Min lap time per swimmer for this stroke
      const grouped = {};
      getLapRecords().filter(r => r.stroke === stroke).forEach(r => {
        if (grouped[r.swimmerId] === undefined || r.lapTime < grouped[r.swimmerId]) {
          grouped[r.swimmerId] = r.lapTime;
        }
      });
      rows = Object.entries(grouped)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 10)
        .map(([id, ms], i) => ({ rank: i + 1, name: getName(id), display: formatTime(ms) }));
    }

    if (!rows.length) {
      leaderboardBody.innerHTML = '<tr><td colspan="3" class="empty-state">No records yet for ' + stroke + '.</td></tr>';
      return;
    }

    const rankClass = ['rank-gold', 'rank-silver', 'rank-bronze'];
    leaderboardBody.innerHTML = rows.map(r => {
      const cls = rankClass[r.rank - 1] || '';
      const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank;
      return `<tr class="${cls}"><td>${medal}</td><td>${escHtml(r.name)}</td><td>${r.display}</td></tr>`;
    }).join('');
  }

  leaderboardTabs.forEach(tab => {
    tab.addEventListener('click', function () {
      leaderboardTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      renderLeaderboard(this.dataset.stroke);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════
  function renderHistory() {
    const typeFilter    = historyTypeFilter.value;
    const swimmerFilter = historySwimmerFilter.value;
    const swimmers      = getSwimmers();
    const getName = id => { const s = swimmers.find(x => x.id === id); return s ? s.name : 'Unknown'; };

    let laps  = typeFilter === 'Jumps' ? [] : getLapRecords();
    let jumps = typeFilter === 'Laps'  ? [] : getJumpRecords();

    if (swimmerFilter) {
      laps  = laps.filter(r => r.swimmerId === swimmerFilter);
      jumps = jumps.filter(r => r.swimmerId === swimmerFilter);
    }

    const combined = [
      ...laps.map(r => ({ ...r, _type: 'lap' })),
      ...jumps.map(r => ({ ...r, _type: 'jump' }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    if (!combined.length) {
      historyListEl.innerHTML = '<p class="empty-state">No records to display.</p>';
      return;
    }

    historyListEl.innerHTML = '';
    combined.forEach(r => {
      const div = document.createElement('div');
      div.className = 'history-item';

      let badge, detail;
      if (r._type === 'lap') {
        badge  = '<span class="type-badge lap">LAP</span>';
        detail = 'Lap #' + r.lapNumber + ' — ' + formatTime(r.lapTime) + ' — ' + r.stroke;
      } else {
        const fs = r.falseStart;
        badge  = fs ? '<span class="type-badge false-start">FALSE</span>' : '<span class="type-badge jump">JUMP</span>';
        detail = (fs ? 'False Start' : r.reactionTime + 'ms');
      }

      div.innerHTML = `
        <div class="history-item-info">
          <div class="swimmer-name">${badge} ${escHtml(getName(r.swimmerId))}</div>
          <div class="record-detail">${detail} &nbsp;·&nbsp; ${formatDate(r.timestamp)}</div>
        </div>
        <button class="btn btn-danger btn-sm" data-rid="${r.id}" data-rtype="${r._type}">✕</button>
      `;
      div.querySelector('[data-rid]').addEventListener('click', function () {
        deleteRecord(this.dataset.rid, this.dataset.rtype);
      });
      historyListEl.appendChild(div);
    });
  }

  function deleteRecord(id, type) {
    if (!confirm('Delete this record?')) return;
    if (type === 'lap') {
      saveLapRecords(getLapRecords().filter(r => r.id !== id));
    } else {
      saveJumpRecords(getJumpRecords().filter(r => r.id !== id));
    }
    renderHistory();
    renderSwimmerList();
    renderLeaderboard(currentBoardStroke);
  }

  historyTypeFilter.addEventListener('change', renderHistory);
  historySwimmerFilter.addEventListener('change', renderHistory);

  // ═══════════════════════════════════════════════════════════
  // CSV EXPORT
  // ═══════════════════════════════════════════════════════════
  function csvDownload(content, prefix) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    a.href     = url;
    a.download = prefix + '_' + today + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportLaps() {
    const swimmers = getSwimmers();
    const getName = id => { const s = swimmers.find(x => x.id === id); return s ? s.name : 'Unknown'; };
    let csv = 'Swimmer,Stroke,Lap#,Time(s),Date\r\n';
    getLapRecords().forEach(r => {
      csv += [getName(r.swimmerId), r.stroke, r.lapNumber, formatTime(r.lapTime), formatDate(r.timestamp)].join(',') + '\r\n';
    });
    csvDownload(csv, 'swimtrack_laps');
  }

  function exportJumps() {
    const swimmers = getSwimmers();
    const getName = id => { const s = swimmers.find(x => x.id === id); return s ? s.name : 'Unknown'; };
    let csv = 'Swimmer,Reaction(ms),FalseStart,Date\r\n';
    getJumpRecords().forEach(r => {
      csv += [getName(r.swimmerId), r.reactionTime, r.falseStart, formatDate(r.timestamp)].join(',') + '\r\n';
    });
    csvDownload(csv, 'swimtrack_jumps');
  }

  function exportAll() {
    const swimmers = getSwimmers();
    const getName = id => { const s = swimmers.find(x => x.id === id); return s ? s.name : 'Unknown'; };
    let csv = 'Type,Swimmer,Stroke,Value,FalseStart,Date\r\n';
    getLapRecords().forEach(r => {
      csv += ['Lap', getName(r.swimmerId), r.stroke, formatTime(r.lapTime), '', formatDate(r.timestamp)].join(',') + '\r\n';
    });
    getJumpRecords().forEach(r => {
      csv += ['Jump', getName(r.swimmerId), '', r.reactionTime + 'ms', r.falseStart, formatDate(r.timestamp)].join(',') + '\r\n';
    });
    csvDownload(csv, 'swimtrack_all');
  }

  $('btn-export-laps').addEventListener('click', exportLaps);
  $('btn-export-jumps').addEventListener('click', exportJumps);
  $('btn-export-all').addEventListener('click', exportAll);

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════
  btnClearData.addEventListener('click', function () {
    if (!confirm('Clear ALL data? This cannot be undone.')) return;
    localStorage.removeItem(KEYS.swimmers);
    localStorage.removeItem(KEYS.lapSessions);
    localStorage.removeItem(KEYS.jumpSessions);
    lapTimerReset();
    jumpReset();
    refreshSwimmerDropdowns();
    renderSwimmerList();
    renderLeaderboard(currentBoardStroke);
    renderHistory();
    alert('All data cleared.');
  });

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(function (reg) { console.log('SW registered:', reg.scope); })
        .catch(function (err) { console.warn('SW registration failed:', err); });
    }

    setupTabNav();
    refreshSwimmerDropdowns();
    renderSwimmerList();
    renderLeaderboard('Free');
    renderHistory();

    // Default tab
    showTab('lap');
  });

})();
