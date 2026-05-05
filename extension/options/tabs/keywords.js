// KidGuard options - keywords tab

(function () {
  window.KG = window.KG || {};
  window.KG.tabBootstrap = window.KG.tabBootstrap || {};
  const KG = window.KG;

  let custom = [];
  let enabled = false;

  function setError(msg) {
    const e = document.getElementById('kg-kw-error');
    if (msg) { e.textContent = msg; e.hidden = false; }
    else { e.textContent = ''; e.hidden = true; }
  }

  function render() {
    document.getElementById('kg-kw-enabled').checked = !!enabled;
    const list = document.getElementById('kg-kw-list');
    list.innerHTML = '';
    if (!custom || custom.length === 0) {
      const li = document.createElement('li');
      li.className = 'kg-empty';
      li.textContent = '暂无自定义关键词';
      list.appendChild(li);
      return;
    }
    custom.forEach((kw) => {
      const li = document.createElement('li');
      const text = document.createElement('span');
      text.className = 'kg-host-text';
      text.textContent = kw;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'kg-btn kg-btn--icon';
      del.setAttribute('aria-label', `删除 ${kw}`);
      del.setAttribute('data-mut', '');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.innerHTML = '<path d="M3.5 4.5h9M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 4.5l.6 8.4A1.5 1.5 0 0 0 7.1 14.5h1.8a1.5 1.5 0 0 0 1.5-1.6l.6-8.4M7 7v5M9 7v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';
      del.appendChild(svg);
      del.addEventListener('click', async () => {
        if (!KG.requireUnlock()) return;
        const next = custom.filter((k) => k !== kw);
        await update({ custom: next });
      });
      li.appendChild(text);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  async function update(payload) {
    const reply = await KG.send(KG.MSG.KEYWORDS_UPDATE, payload);
    if (reply && reply.ok && reply.data) {
      enabled = !!reply.data.enabled;
      custom = Array.isArray(reply.data.custom) ? reply.data.custom : [];
      render();
      KG.toast('已保存', 'success');
    } else {
      KG.toast('保存失败: ' + (reply && reply.error || '未知错误'), 'error');
    }
  }

  function bindOnce() {
    if (KG._kwBound) return;
    KG._kwBound = true;
    document.getElementById('kg-kw-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      setError('');
      if (!KG.requireUnlock()) return;
      const inp = document.getElementById('kg-kw-input');
      const raw = (inp.value || '').trim();
      if (raw.length < 2) { setError('关键词至少 2 个字符'); return; }
      if (raw.length > 60) { setError('关键词不能超过 60 字符'); return; }
      if (custom.includes(raw)) { setError('该关键词已存在'); return; }
      const next = custom.concat(raw);
      inp.value = '';
      await update({ custom: next });
    });
    document.getElementById('kg-kw-enabled').addEventListener('change', async (ev) => {
      if (!KG.requireUnlock()) {
        ev.target.checked = !ev.target.checked;
        return;
      }
      await update({ enabled: ev.target.checked });
    });
  }

  async function load() {
    const data = await KG.getStorage([KG.STORAGE_KEYS.keywordsEnabled, KG.STORAGE_KEYS.keywordsCustom]);
    enabled = !!data[KG.STORAGE_KEYS.keywordsEnabled];
    custom = Array.isArray(data[KG.STORAGE_KEYS.keywordsCustom]) ? data[KG.STORAGE_KEYS.keywordsCustom] : [];
    render();
  }

  KG.tabBootstrap.keywords = function () {
    bindOnce();
    load();
  };
})();
