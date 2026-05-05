// KidGuard popup - reads stats + schedule status, renders TOP10 lists
// Inline messaging helper (no cross-dir module import; per spec)

const MSG = {
  STATS_GET_TOP10: 'STATS_GET_TOP10',
};

function send(type, payload = {}) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type, payload }, (reply) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(reply || { ok: false, error: 'NO_REPLY' });
      });
    } catch (e) {
      resolve({ ok: false, error: String(e && e.message || e) });
    }
  });
}

function getStorage(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (data) => resolve(data || {}));
    } catch (e) {
      resolve({});
    }
  });
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'text') node.textContent = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function renderList(rootEl, rows) {
  rootEl.setAttribute('aria-busy', 'false');
  rootEl.innerHTML = '';
  if (!rows || rows.length === 0) {
    rootEl.appendChild(el('li', { class: 'kg-empty', text: '近 7 天暂无数据' }));
    return;
  }
  rows.slice(0, 10).forEach((row, i) => {
    const li = el('li');
    li.appendChild(el('span', { class: 'kg-rank', text: String(i + 1) }));
    li.appendChild(el('span', { class: 'kg-host', text: row.host || '' }));
    li.appendChild(el('span', { class: 'kg-count', text: String(row.count || 0) }));
    rootEl.appendChild(li);
  });
}

function renderError(rootEl, msg) {
  rootEl.setAttribute('aria-busy', 'false');
  rootEl.innerHTML = '';
  rootEl.appendChild(el('li', { class: 'kg-empty', text: msg }));
}

// Schedule evaluation - same logic shape as service worker for popup-side display
function isInWindow(now, win) {
  const day = now.getDay() === 0 ? 7 : now.getDay(); // 1..7 Mon..Sun
  if (Array.isArray(win.days) && !win.days.includes(day)) return false;
  const [fh, fm] = String(win.from || '00:00').split(':').map(Number);
  const [th, tm] = String(win.to || '00:00').split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  if (from === to) return false;
  if (from < to) return cur >= from && cur < to;
  // cross-midnight window: covers from..2400 + 0..to
  return cur >= from || cur < to;
}

function evalSchedule(schedule, now = new Date()) {
  if (!schedule || !schedule.enabled || !Array.isArray(schedule.windows)) return { active: false };
  for (const win of schedule.windows) {
    if (isInWindow(now, win)) {
      // compute remaining minutes until 'to'
      const [th, tm] = String(win.to || '00:00').split(':').map(Number);
      const cur = now.getHours() * 60 + now.getMinutes();
      const to = th * 60 + tm;
      let diff = to - cur;
      if (diff <= 0) diff += 24 * 60;
      return { active: true, remainingMin: diff, win };
    }
  }
  return { active: false };
}

function setStatusPill(state) {
  const pill = document.getElementById('kg-status-pill');
  pill.classList.remove('kg-pill--normal', 'kg-pill--locked', 'kg-pill--schedule');
  if (state === 'schedule') {
    pill.classList.add('kg-pill--schedule');
    pill.textContent = '时段锁中';
  } else if (state === 'locked') {
    pill.classList.add('kg-pill--locked');
    pill.textContent = '已锁定';
  } else {
    pill.classList.add('kg-pill--normal');
    pill.textContent = '正常';
  }
}

function setBanner(text) {
  const banner = document.getElementById('kg-banner');
  const t = document.getElementById('kg-banner-text');
  if (text) {
    t.textContent = text;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

async function init() {
  // open-options button
  document.getElementById('kg-open-options').addEventListener('click', () => {
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    }
    window.close();
  });

  // schedule pill
  const data = await getStorage(['schedule.v1']);
  const schedule = data['schedule.v1'];
  const sc = evalSchedule(schedule);
  if (sc.active) {
    setStatusPill('schedule');
    setBanner(`时段锁中, ${sc.remainingMin} 分钟后解除`);
  } else {
    setStatusPill('normal');
    setBanner(null);
  }

  // TOP10 blocked + visited
  const blockedRoot = document.getElementById('kg-list-blocked');
  const visitedRoot = document.getElementById('kg-list-visited');

  const [blocked, visited] = await Promise.all([
    send(MSG.STATS_GET_TOP10, { kind: 'blocked', days: 7 }),
    send(MSG.STATS_GET_TOP10, { kind: 'visited', days: 7 }),
  ]);

  if (blocked && blocked.ok && blocked.data) {
    renderList(blockedRoot, blocked.data.rows || []);
  } else {
    renderError(blockedRoot, '近 7 天暂无数据');
  }

  if (visited && visited.ok && visited.data) {
    renderList(visitedRoot, visited.data.rows || []);
  } else {
    renderError(visitedRoot, '近 7 天暂无数据');
  }
}

document.addEventListener('DOMContentLoaded', init);
