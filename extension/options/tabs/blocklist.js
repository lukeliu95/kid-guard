// KidGuard options - blocklist tab (allow + deny)

(function () {
  window.KG = window.KG || {};
  window.KG.tabBootstrap = window.KG.tabBootstrap || {};
  const KG = window.KG;

  let currentAllow = [];
  let currentDeny = [];

  function listEl(kind) { return document.querySelector(`[data-list="${kind}"]`); }
  function inputEl(kind) { return document.querySelector(`[data-input="${kind}"]`); }
  function errorEl(kind) { return document.querySelector(`[data-error="${kind}"]`); }
  function formEl(kind) { return document.querySelector(`[data-form="${kind}"]`); }

  function setError(kind, msg) {
    const el = errorEl(kind);
    if (!el) return;
    if (msg) { el.textContent = msg; el.hidden = false; }
    else { el.textContent = ''; el.hidden = true; }
  }

  function renderList(kind, items) {
    const ul = listEl(kind);
    ul.innerHTML = '';
    if (!items || items.length === 0) {
      const li = document.createElement('li');
      li.className = 'kg-empty';
      li.textContent = '暂无条目';
      ul.appendChild(li);
      return;
    }
    items.forEach((host) => {
      const li = document.createElement('li');
      const text = document.createElement('span');
      text.className = 'kg-host-text';
      text.textContent = host;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'kg-btn kg-btn--icon';
      del.setAttribute('aria-label', `删除 ${host}`);
      del.setAttribute('data-mut', '');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.innerHTML = '<path d="M3.5 4.5h9M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 4.5l.6 8.4A1.5 1.5 0 0 0 7.1 14.5h1.8a1.5 1.5 0 0 0 1.5-1.6l.6-8.4M7 7v5M9 7v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';
      del.appendChild(svg);
      del.addEventListener('click', async () => {
        if (!KG.requireUnlock()) return;
        const arr = (kind === 'allow' ? currentAllow : currentDeny).filter((h) => h !== host);
        await update(kind, arr);
      });
      li.appendChild(text);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function setCount(kind, n) {
    const id = kind === 'allow' ? 'kg-allow-count' : 'kg-deny-count';
    const el = document.getElementById(id);
    if (el) el.textContent = String(n) + ' 条';
  }

  async function update(kind, arr) {
    const payload = {};
    payload[kind] = arr;
    const reply = await KG.send(KG.MSG.BLOCKLIST_UPDATE, payload);
    if (reply && reply.ok && reply.data) {
      currentAllow = reply.data.allow || [];
      currentDeny = reply.data.deny || [];
      renderList('allow', currentAllow);
      renderList('deny', currentDeny);
      setCount('allow', currentAllow.length);
      setCount('deny', currentDeny.length);
      KG.toast('已保存', 'success');
    } else {
      KG.toast('保存失败: ' + (reply && reply.error || '未知错误'), 'error');
    }
  }

  async function handleAdd(kind, ev) {
    ev.preventDefault();
    setError(kind, '');
    if (!KG.requireUnlock()) return;
    const inp = inputEl(kind);
    const raw = inp.value;
    const host = KG.normalizeHost(raw);
    if (!host) {
      setError(kind, '不是合法的 hostname (例如 example.com)');
      return;
    }
    const arr = kind === 'allow' ? currentAllow.slice() : currentDeny.slice();
    if (arr.includes(host)) {
      setError(kind, '该 hostname 已在列表中');
      return;
    }
    arr.push(host);
    inp.value = '';
    await update(kind, arr);
  }

  async function load() {
    const data = await KG.getStorage([KG.STORAGE_KEYS.customAllow, KG.STORAGE_KEYS.customDeny]);
    currentAllow = data[KG.STORAGE_KEYS.customAllow] || [];
    currentDeny = data[KG.STORAGE_KEYS.customDeny] || [];
    renderList('allow', currentAllow);
    renderList('deny', currentDeny);
    setCount('allow', currentAllow.length);
    setCount('deny', currentDeny.length);
  }

  function bindOnce() {
    if (KG._blocklistBound) return;
    KG._blocklistBound = true;
    formEl('allow').addEventListener('submit', (ev) => handleAdd('allow', ev));
    formEl('deny').addEventListener('submit', (ev) => handleAdd('deny', ev));
  }

  KG.tabBootstrap.blocklist = function () {
    bindOnce();
    load();
  };
})();
