// KidGuard options - categories tab

(function () {
  window.KG = window.KG || {};
  window.KG.tabBootstrap = window.KG.tabBootstrap || {};
  const KG = window.KG;

  let enabled = {};

  function render() {
    const list = document.getElementById('kg-cat-list');
    list.innerHTML = '';
    KG.CATEGORIES.forEach((cat) => {
      const isOn = enabled[cat.id] !== false; // default true
      const li = document.createElement('li');

      const left = document.createElement('div');
      const name = document.createElement('span');
      name.className = 'kg-cat-name';
      name.textContent = cat.name;
      const meta = document.createElement('span');
      meta.className = 'kg-cat-meta';
      meta.textContent = cat.meta;
      left.appendChild(name);
      left.appendChild(meta);

      const tg = document.createElement('label');
      tg.className = 'kg-toggle';
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.checked = isOn;
      inp.setAttribute('data-mut', '');
      inp.setAttribute('aria-label', cat.name);
      const track = document.createElement('span');
      track.className = 'kg-toggle-track';
      const thumb = document.createElement('span');
      thumb.className = 'kg-toggle-thumb';
      track.appendChild(thumb);
      tg.appendChild(inp);
      tg.appendChild(track);

      inp.addEventListener('change', async (ev) => {
        if (!KG.requireUnlock()) {
          inp.checked = !inp.checked;
          return;
        }
        const next = inp.checked;
        const reply = await KG.send(KG.MSG.CATEGORY_TOGGLE, { category: cat.id, enabled: next });
        if (reply && reply.ok) {
          enabled[cat.id] = next;
          updateAllToggle();
          KG.toast(next ? `已启用 "${cat.name}"` : `已停用 "${cat.name}"`, 'success');
        } else {
          inp.checked = !next;
          KG.toast('操作失败: ' + (reply && reply.error || '未知错误'), 'error');
        }
      });

      li.appendChild(left);
      li.appendChild(tg);
      list.appendChild(li);
    });
    updateAllToggle();
  }

  function updateAllToggle() {
    const all = document.getElementById('kg-cat-all');
    if (!all) return;
    const allOn = KG.CATEGORIES.every((c) => enabled[c.id] !== false);
    all.checked = allOn;
  }

  function bindOnce() {
    if (KG._catBound) return;
    KG._catBound = true;
    const all = document.getElementById('kg-cat-all');
    all.addEventListener('change', async () => {
      if (!KG.requireUnlock()) {
        all.checked = !all.checked;
        return;
      }
      const next = all.checked;
      // toggle each in sequence
      for (const cat of KG.CATEGORIES) {
        const reply = await KG.send(KG.MSG.CATEGORY_TOGGLE, { category: cat.id, enabled: next });
        if (reply && reply.ok) enabled[cat.id] = next;
      }
      render();
      KG.toast(next ? '已全部启用' : '已全部停用', 'success');
    });
  }

  async function load() {
    const data = await KG.getStorage([KG.STORAGE_KEYS.categoryEnabled]);
    enabled = data[KG.STORAGE_KEYS.categoryEnabled] || {};
    render();
  }

  KG.tabBootstrap.categories = function () {
    bindOnce();
    load();
  };
})();
