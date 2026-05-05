// KidGuard onboarding - 7-step wizard
// 1 welcome - 2 PIN - 3 confirm - 4 recovery - 5 categories - 6 advanced - 7 done
// PIN gate strategy: after step 4 we PIN_SETUP + PIN_VERIFY immediately so the
// 5-min unlock window covers steps 5/6 mutations. No prompt/alert/confirm anywhere.

const MSG_PIN_SETUP = 'PIN_SETUP';
const MSG_PIN_VERIFY = 'PIN_VERIFY';
const MSG_CATEGORY_TOGGLE = 'CATEGORY_TOGGLE';
const MSG_BLOCKLIST_UPDATE = 'BLOCKLIST_UPDATE';
const MSG_SCHEDULE_UPDATE = 'SCHEDULE_UPDATE';

const ALL_CATEGORIES = [
  'games', 'adult', 'social_short_video', 'douyin_like',
  'gambling', 'gacha_recharge', 'vpn_proxy',
];
const TOTAL_STEPS = 7;

const state = {
  step: 1,
  pin: '',
  recoveryQ: '',
  recoveryA: '',
  pinSet: false,
  // step 5 collected
  categoriesEnabled: {},
  // step 6 collected
  customDeny: [],
  scheduleEnabled: false,
  scheduleFrom: '22:00',
  scheduleTo: '06:00',
  summary: [],
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

function $(id) { return document.getElementById(id); }

function setError(id, msg) {
  const el = $(id);
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

function clearAllErrors() {
  ['kg-err1', 'kg-err2', 'kg-err3', 'kg-err4', 'kg-err5', 'kg-err6a', 'kg-err6b'].forEach((id) => setError(id, ''));
}

function showPage(stepKey) {
  const pages = document.querySelectorAll('.kg-page');
  pages.forEach((p) => {
    p.hidden = p.getAttribute('data-page') !== String(stepKey);
  });
  const stepperItems = document.querySelectorAll('.kg-step');
  stepperItems.forEach((li) => {
    const n = Number(li.getAttribute('data-step'));
    li.classList.remove('is-active', 'is-done');
    if (typeof stepKey === 'number') {
      if (n < stepKey) li.classList.add('is-done');
      else if (n === stepKey) li.classList.add('is-active');
    } else {
      li.classList.add('is-done');
    }
  });
  // Hide footnote on done page
  const fn = $('kg-footnote');
  if (fn) fn.hidden = (stepKey === 'done');
  // Focus strategy: prefer the page heading (announce title to screen readers),
  // fall back to the first input/textarea, then primary button. The h1 needs
  // tabindex=-1 so it can receive programmatic focus without entering tab order.
  setTimeout(() => {
    const page = document.querySelector('.kg-page:not([hidden])');
    if (!page) return;
    const heading = page.querySelector('.kg-h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      return;
    }
    const fallback = page.querySelector('input, textarea, button.kg-btn--primary');
    if (fallback) fallback.focus();
  }, 200);
}

function isPinValid(pin) {
  return /^[0-9]{4,6}$/.test(pin);
}

function normalizeHost(s) {
  if (!s) return '';
  let v = String(s).trim().toLowerCase();
  v = v.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').split(':')[0];
  if (!v) return '';
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(v)) return '';
  return v;
}

function onNext1() {
  state.step = 2;
  showPage(2);
}

function onNext2() {
  clearAllErrors();
  const v = $('kg-pin1').value.trim();
  if (!isPinValid(v)) {
    setError('kg-err1', 'PIN 必须是 4-6 位数字');
    return;
  }
  state.pin = v;
  $('kg-pin2').value = '';
  state.step = 3;
  showPage(3);
}

function onNext3() {
  clearAllErrors();
  const v = $('kg-pin2').value.trim();
  if (!isPinValid(v)) {
    setError('kg-err2', 'PIN 必须是 4-6 位数字');
    return;
  }
  if (v !== state.pin) {
    setError('kg-err2', '两次输入不一致, 请重新输入');
    return;
  }
  state.step = 4;
  showPage(4);
}

async function onNext4() {
  clearAllErrors();
  const checked = document.querySelector('input[name="recq"]:checked');
  if (!checked) {
    setError('kg-err4', '请选择一个退出问题');
    return;
  }
  let q = checked.value;
  if (q === 'custom') {
    q = ($('kg-recq-custom').value || '').trim();
    if (q.length < 2) { setError('kg-err4', '自定义问题至少 2 个字符'); return; }
    if (q.length > 60) { setError('kg-err4', '自定义问题不能超过 60 字符'); return; }
  }
  const a = ($('kg-reca').value || '').trim();
  if (a.length < 2) { setError('kg-err4', '答案至少 2 个字符'); return; }
  if (a.length > 60) { setError('kg-err4', '答案不能超过 60 字符'); return; }

  state.recoveryQ = q;
  state.recoveryA = a;

  // Save PIN now so 5/6 mutations are PIN-gated through the unlock window
  const setupReply = await send(MSG_PIN_SETUP, {
    pin: state.pin,
    recoveryQ: state.recoveryQ,
    recoveryA: state.recoveryA,
  });
  if (!setupReply || !setupReply.ok) {
    setError('kg-err4', '保存失败: ' + (setupReply && setupReply.error || '未知错误'));
    return;
  }
  state.pinSet = true;

  // Verify to obtain unlock window
  const verifyReply = await send(MSG_PIN_VERIFY, { pin: state.pin });
  if (!verifyReply || !verifyReply.ok) {
    setError('kg-err4', 'PIN 解锁失败: ' + (verifyReply && verifyReply.error || '未知错误'));
    return;
  }

  // Footnote no longer applies after PIN saved
  const fn = $('kg-footnote');
  if (fn) fn.textContent = 'PIN 已保存。后续步骤可随时关闭页面 - 已保存的设置不会丢失。';

  state.step = 5;
  showPage(5);
}

async function onNext5() {
  clearAllErrors();
  // Collect 7 toggles
  const boxes = document.querySelectorAll('#kg-cat-list input[type="checkbox"][data-cat]');
  const enabled = {};
  boxes.forEach((b) => { enabled[b.getAttribute('data-cat')] = b.checked; });
  state.categoriesEnabled = enabled;

  // Push only the disabled categories to sw (default state in sw is all-enabled).
  let failed = null;
  for (const cat of ALL_CATEGORIES) {
    if (enabled[cat] === false) {
      const r = await send(MSG_CATEGORY_TOGGLE, { category: cat, enabled: false });
      if (!r || !r.ok) { failed = `${cat}: ${r && r.error || '未知'}`; break; }
    }
  }
  if (failed) {
    setError('kg-err5', '保存分类失败: ' + failed);
    return;
  }

  state.summary.push(`已启用 ${ALL_CATEGORIES.filter((c) => enabled[c] !== false).length}/7 个分类`);
  state.step = 6;
  showPage(6);
}

async function onNext6(skip) {
  clearAllErrors();
  if (skip) {
    state.step = 'done';
    finalizeAndShow();
    return;
  }

  // Custom deny
  const raw = ($('kg-custom-deny').value || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const denyValid = [];
  const denyInvalid = [];
  raw.forEach((line) => {
    const h = normalizeHost(line);
    if (h) denyValid.push(h);
    else denyInvalid.push(line);
  });
  if (denyInvalid.length) {
    setError('kg-err6a', `${denyInvalid.length} 行无法识别为合法域名: ${denyInvalid.slice(0, 3).join(', ')}${denyInvalid.length > 3 ? '...' : ''}`);
    return;
  }
  state.customDeny = denyValid;

  if (denyValid.length) {
    const r = await send(MSG_BLOCKLIST_UPDATE, { deny: denyValid });
    if (!r || !r.ok) {
      setError('kg-err6a', '保存自定义屏蔽失败: ' + (r && r.error || '未知错误'));
      return;
    }
    state.summary.push(`已添加 ${denyValid.length} 条自定义屏蔽`);
  }

  // Schedule
  const enable = $('kg-sched-enable').checked;
  state.scheduleEnabled = enable;
  if (enable) {
    const from = $('kg-sched-from').value || '22:00';
    const to = $('kg-sched-to').value || '06:00';
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) {
      setError('kg-err6b', '时间格式不对, 请用 HH:MM');
      return;
    }
    if (from === to) {
      setError('kg-err6b', '开始时间与结束时间不能相同');
      return;
    }
    state.scheduleFrom = from;
    state.scheduleTo = to;
    const schedule = {
      enabled: true,
      windows: [{ days: [1, 2, 3, 4, 5, 6, 7], from, to }],
    };
    const r = await send(MSG_SCHEDULE_UPDATE, { schedule });
    if (!r || !r.ok) {
      setError('kg-err6b', '保存时段失败: ' + (r && r.error || '未知错误'));
      return;
    }
    state.summary.push(`时段锁: 每天 ${from} - ${to}`);
  }

  state.step = 'done';
  finalizeAndShow();
}

function finalizeAndShow() {
  try {
    chrome.storage.local.set({ 'onboarding.done.v1': true });
  } catch (e) { /* ignore */ }

  const summary = $('kg-done-summary');
  if (summary && state.summary.length) {
    summary.textContent = '已完成: ' + state.summary.join(' / ');
  }
  showPage('done');
}

function onBack(target) {
  clearAllErrors();
  state.step = target;
  showPage(target);
}

function openPopupAndClose() {
  // The browserAction popup is not directly openable by tab.create on chromium-mv3,
  // so we just close this tab and leave the icon in toolbar to invite a click.
  try { window.close(); } catch (e) { /* ignore */ }
}

function openOptions() {
  try {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    window.close();
  } catch (e) {
    window.location.href = chrome.runtime.getURL('options/options.html');
  }
}

function bind() {
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-action]');
    if (!t) return;
    const a = t.getAttribute('data-action');
    if (a === 'next-1') onNext1();
    else if (a === 'next-2') onNext2();
    else if (a === 'next-3') onNext3();
    else if (a === 'next-4') onNext4();
    else if (a === 'next-5') onNext5();
    else if (a === 'next-6') onNext6(false);
    else if (a === 'skip-6') onNext6(true);
    else if (a === 'back-2') onBack(1);
    else if (a === 'back-3') onBack(2);
    else if (a === 'back-4') onBack(3);
    else if (a === 'back-5') onBack(4);
    else if (a === 'back-6') onBack(5);
    else if (a === 'open-popup') openPopupAndClose();
    else if (a === 'open-options') openOptions();
  });

  // Enter advances on input/text fields only
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    if (ev.target && (ev.target.tagName === 'TEXTAREA')) return;
    const cur = state.step;
    if (typeof cur !== 'number') return;
    ev.preventDefault();
    if (cur === 1) onNext1();
    else if (cur === 2) onNext2();
    else if (cur === 3) onNext3();
    else if (cur === 4) onNext4();
    else if (cur === 5) onNext5();
    else if (cur === 6) onNext6(false);
  });

  // PIN inputs - filter to digits
  ['kg-pin1', 'kg-pin2'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.replace(/[^0-9]/g, '').slice(0, 6);
    });
  });

  // Custom radio - focus its input checks the radio
  const customLabel = document.querySelector('.kg-radio--custom');
  if (customLabel) {
    const customInput = $('kg-recq-custom');
    customInput.addEventListener('focus', () => {
      const r = document.querySelector('input[name="recq"][value="custom"]');
      if (r) r.checked = true;
    });
  }

  // Schedule enable toggle reveals time row
  const schedEnable = $('kg-sched-enable');
  const schedRow = $('kg-sched-row');
  if (schedEnable && schedRow) {
    schedEnable.addEventListener('change', () => {
      schedRow.hidden = !schedEnable.checked;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bind();
  showPage(1);
});
