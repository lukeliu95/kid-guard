// KidGuard blocked page renderer
// Hard rule: textContent only (pitfall-20260416). No innerHTML for any user-influenced data.

const CATEGORY_LABEL = {
  games: '游戏',
  adult: '成人',
  social_short_video: '短视频',
  douyin_like: '抖音类',
  gambling: '赌博',
  gacha_recharge: '抽卡充值',
  vpn_proxy: 'VPN/代理',
};

const REASON_TITLE = {
  category: '已拦截',
  manual_deny: '已拦截',
  schedule_lock: '时段锁中',
  keyword: '搜索已拦截',
};

const REASON_SUBTITLE = {
  category: '该网页已被 KidGuard 阻止访问',
  manual_deny: '该网页在家长设置的黑名单中',
  schedule_lock: '现在是作息时间, 网页已锁定',
  keyword: '该搜索关键词已被 KidGuard 拦截',
};

function getQuery() {
  const out = {};
  const usp = new URLSearchParams(window.location.search || '');
  for (const [k, v] of usp.entries()) out[k] = v;
  return out;
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = text == null ? '' : String(text);
}

function safeHost(raw) {
  if (!raw) return '';
  // strict whitelist: hostname chars only
  const s = String(raw).toLowerCase();
  if (!/^[a-z0-9.\-:]{1,253}$/.test(s)) return '';
  return s;
}

function safeCategory(raw) {
  if (!raw) return '';
  const s = String(raw).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(CATEGORY_LABEL, s)) return s;
  return '';
}

function safeReason(raw) {
  const s = String(raw || '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(REASON_TITLE, s)) return s;
  return 'category';
}

async function pickQuote() {
  try {
    const url = chrome.runtime.getURL('data/quotes.json');
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const list = await resp.json();
    if (!Array.isArray(list) || list.length === 0) return null;
    const idx = Math.floor(Math.random() * list.length);
    const item = list[idx] || {};
    return typeof item.text === 'string' ? item.text : null;
  } catch (e) {
    return null;
  }
}

async function init() {
  const q = getQuery();
  const reason = safeReason(q.reason);
  const host = safeHost(q.host);
  const category = safeCategory(q.category);

  setText('kg-title', REASON_TITLE[reason]);
  setText('kg-subtitle', REASON_SUBTITLE[reason]);
  setText('kg-host', host);

  const tagEl = document.getElementById('kg-category');
  if (category) {
    tagEl.textContent = CATEGORY_LABEL[category];
    tagEl.hidden = false;
  } else {
    tagEl.hidden = true;
  }

  const quoteText = await pickQuote();
  if (quoteText) setText('kg-quote-text', quoteText);
}

document.addEventListener('DOMContentLoaded', init);
