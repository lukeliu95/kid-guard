// KidGuard options - main controller (PIN gate, tab routing, shared utils)
// Inline messaging helper. Loaded LAST so tab module bootstrap functions are defined.

window.KG = window.KG || {};

const KG = window.KG;

// ============= Messaging =============
KG.MSG = {
  PIN_VERIFY: 'PIN_VERIFY',
  PIN_SETUP: 'PIN_SETUP',
  PIN_RECOVER: 'PIN_RECOVER',
  CATEGORY_TOGGLE: 'CATEGORY_TOGGLE',
  BLOCKLIST_UPDATE: 'BLOCKLIST_UPDATE',
  SCHEDULE_UPDATE: 'SCHEDULE_UPDATE',
  KEYWORDS_UPDATE: 'KEYWORDS_UPDATE',
  STATS_GET_TOP10: 'STATS_GET_TOP10',
};

KG.STORAGE_KEYS = {
  pinUnlockUntil: 'pin.unlock_until.v1',
  categoryEnabled: 'cat.enabled.v1',
  customAllow: 'cat.allow.v1',
  customDeny: 'cat.deny.v1',
  schedule: 'schedule.v1',
  keywordsEnabled: 'keywords.enabled.v1',
  keywordsCustom: 'keywords.custom.v1',
};

KG.CATEGORIES = [
  { id: 'games', name: '游戏', meta: '4399 / 7K7K / Steam 等' },
  { id: 'adult', name: '成人内容', meta: 'NSFW 类站点' },
  { id: 'social_short_video', name: '短视频/泛社交', meta: '泛娱乐短视频站' },
  { id: 'douyin_like', name: '抖音类', meta: '抖音/快手 web 入口' },
  { id: 'gambling', name: '赌博', meta: '彩票/博彩' },
  { id: 'gacha_recharge', name: '抽卡充值', meta: '游戏充值/抽卡引导' },
  { id: 'vpn_proxy', name: 'VPN/代理', meta: '科学上网类' },
];

KG.send = function (type, payload = {}) {
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
};

KG.getStorage = function (keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (data) => resolve(data || {}));
    } catch (e) {
      resolve({});
    }
  });
};

// ============= Toast =============
let toastTimer = null;
KG.toast = function (msg, kind = 'success') {
  const t = document.getElementById('kg-toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'kg-toast ' + (kind === 'error' ? 'kg-toast--error' : 'kg-toast--success');
  t.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
};

// ============= Hostname normalize =============
KG.normalizeHost = function (raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  if (!s) return null;
  // strip protocol + path
  s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  // strip leading www. (kept domain remains, www. would be redundant given subdomain match)
  s = s.replace(/^www\./, '');
  if (!/^[a-z0-9.\-]{1,253}$/.test(s)) return null;
  if (!s.includes('.')) return null;
  if (s.startsWith('.') || s.endsWith('.')) return null;
  return s;
};

// ============= PIN gate =============
KG.unlocked = false;
KG.unlockUntil = 0;

KG.isUnlocked = function () {
  return KG.unlocked && Date.now() < KG.unlockUntil;
};

KG.requireUnlock = function () {
  if (KG.isUnlocked()) return true;
  KG.toast('请先输入 PIN 解锁', 'error');
  showPinModal();
  return false;
};

KG.gateButtons = function () {
  // Disable [data-mut] elements until unlocked
  const muts = document.querySelectorAll('[data-mut]');
  muts.forEach((b) => {
    if (KG.isUnlocked()) {
      b.disabled = false;
      b.removeAttribute('aria-disabled');
    } else {
      b.disabled = true;
      b.setAttribute('aria-disabled', 'true');
    }
  });
  const lock = document.getElementById('kg-lock-status');
  if (lock) {
    if (KG.isUnlocked()) {
      lock.className = 'kg-lock-pill kg-lock-pill--unlocked';
      lock.textContent = '已解锁 (5 分钟)';
    } else {
      lock.className = 'kg-lock-pill kg-lock-pill--locked';
      lock.textContent = '仅浏览模式';
    }
  }
};

// ============= PIN modal =============
const focusableSel = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
let lastFocused = null;

function trapFocus(modal, ev) {
  if (ev.key !== 'Tab') return;
  const nodes = Array.from(modal.querySelectorAll(focusableSel));
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (ev.shiftKey && document.activeElement === first) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && document.activeElement === last) {
    ev.preventDefault();
    first.focus();
  }
}

function showPinModal() {
  const modal = document.getElementById('kg-pin-modal');
  if (!modal) return;
  lastFocused = document.activeElement;
  modal.hidden = false;
  modal.removeAttribute('hidden');
  const inp = document.getElementById('kg-pin-input');
  inp.value = '';
  document.getElementById('kg-pin-error').hidden = true;
  setTimeout(() => inp.focus(), 60);
}

function hidePinModal() {
  const modal = document.getElementById('kg-pin-modal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('hidden', '');
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

async function submitPin() {
  const inp = document.getElementById('kg-pin-input');
  const err = document.getElementById('kg-pin-error');
  const pin = (inp.value || '').trim();
  err.hidden = true;
  if (!/^[0-9]{4,6}$/.test(pin)) {
    err.textContent = 'PIN 必须是 4-6 位数字';
    err.hidden = false;
    return;
  }
  const reply = await KG.send(KG.MSG.PIN_VERIFY, { pin });
  if (reply && reply.ok && reply.data && reply.data.unlocked) {
    KG.unlocked = true;
    KG.unlockUntil = reply.data.until || (Date.now() + 5 * 60 * 1000);
    KG.gateButtons();
    KG.toast('已解锁, 5 分钟后自动锁定', 'success');
    hidePinModal();
    // refresh active tab
    KG.refreshActiveTab();
  } else {
    err.textContent = (reply && reply.error) ? `验证失败: ${reply.error}` : 'PIN 错误';
    err.hidden = false;
    inp.value = '';
    inp.focus();
  }
}

// ============= Tab routing =============
KG.activeTab = 'blocklist';

KG.refreshActiveTab = function () {
  const fn = KG.tabBootstrap && KG.tabBootstrap[KG.activeTab];
  if (typeof fn === 'function') fn();
};

function selectTab(name) {
  if (!name) return;
  KG.activeTab = name;
  document.querySelectorAll('.kg-tab').forEach((b) => {
    const on = b.getAttribute('data-tab') === name;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.kg-tabpanel').forEach((p) => {
    p.hidden = p.getAttribute('data-panel') !== name;
  });
  KG.refreshActiveTab();
}

// ============= Init =============
async function checkInitialUnlock() {
  // If sw already has a valid unlock_until, mirror it
  const data = await KG.getStorage([KG.STORAGE_KEYS.pinUnlockUntil]);
  const until = Number(data[KG.STORAGE_KEYS.pinUnlockUntil] || 0);
  if (until > Date.now()) {
    KG.unlocked = true;
    KG.unlockUntil = until;
  }
}

function bindGlobal() {
  // tab clicks
  document.querySelectorAll('.kg-tab').forEach((b) => {
    b.addEventListener('click', () => selectTab(b.getAttribute('data-tab')));
  });

  // PIN modal handlers
  const modal = document.getElementById('kg-pin-modal');
  document.getElementById('kg-pin-submit').addEventListener('click', submitPin);
  document.getElementById('kg-pin-skip').addEventListener('click', hidePinModal);
  document.getElementById('kg-pin-input').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); submitPin(); }
  });
  document.getElementById('kg-pin-input').addEventListener('input', (ev) => {
    ev.target.value = ev.target.value.replace(/[^0-9]/g, '').slice(0, 6);
  });
  modal.addEventListener('keydown', (ev) => trapFocus(modal, ev));

  // ESC does NOT close (per safety policy) - swallow it
  modal.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') ev.preventDefault();
  });

  // Intercept any [data-mut] click while locked to show PIN modal
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-mut]');
    if (!t) return;
    if (KG.isUnlocked()) return;
    ev.preventDefault();
    ev.stopPropagation();
    showPinModal();
  }, true);

  // Recheck unlock every 30s
  setInterval(() => {
    if (KG.unlocked && Date.now() >= KG.unlockUntil) {
      KG.unlocked = false;
      KG.unlockUntil = 0;
      KG.gateButtons();
      KG.toast('已自动锁定', 'error');
    }
  }, 5000);
}

document.addEventListener('DOMContentLoaded', async () => {
  bindGlobal();
  await checkInitialUnlock();
  KG.gateButtons();

  // Always show modal first (per spec - PIN required for any mutation, but skip allowed for browse-only)
  if (!KG.isUnlocked()) {
    showPinModal();
  }

  // initial tab
  selectTab('blocklist');
});
