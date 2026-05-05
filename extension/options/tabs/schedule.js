// KidGuard options - schedule tab (multi-window)

(function () {
  window.KG = window.KG || {};
  window.KG.tabBootstrap = window.KG.tabBootstrap || {};
  const KG = window.KG;

  const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']; // 1..7 Mon..Sun

  let schedule = { enabled: false, windows: [] };

  function timeRegex(s) { return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s); }

  function renderRow(idx, win) {
    const li = document.createElement('li');
    li.setAttribute('data-row', String(idx));

    // days
    const days = document.createElement('div');
    days.className = 'kg-sched-days';
    DAY_LABELS.forEach((label, i) => {
      const day = i + 1;
      const wrap = document.createElement('label');
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.value = String(day);
      inp.checked = Array.isArray(win.days) ? win.days.includes(day) : true;
      inp.setAttribute('data-mut', '');
      inp.setAttribute('aria-label', '星期' + label);
      const span = document.createElement('span');
      span.textContent = label;
      wrap.appendChild(inp);
      wrap.appendChild(span);
      days.appendChild(wrap);
    });

    // time from
    const tWrap = document.createElement('div');
    tWrap.className = 'kg-sched-time';
    const fromInp = document.createElement('input');
    fromInp.type = 'time';
    fromInp.className = 'kg-input';
    fromInp.value = win.from || '22:00';
    fromInp.setAttribute('data-mut', '');
    fromInp.setAttribute('aria-label', '起始时间');
    const sep = document.createElement('span');
    sep.className = 'kg-sched-time-sep';
    sep.textContent = '至';
    const toInp = document.createElement('input');
    toInp.type = 'time';
    toInp.className = 'kg-input';
    toInp.value = win.to || '06:00';
    toInp.setAttribute('data-mut', '');
    toInp.setAttribute('aria-label', '结束时间');
    tWrap.appendChild(fromInp);
    tWrap.appendChild(sep);
    tWrap.appendChild(toInp);

    // delete
    const actions = document.createElement('div');
    actions.className = 'kg-sched-row-actions';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'kg-btn kg-btn--icon';
    del.setAttribute('aria-label', '删除该时段');
    del.setAttribute('data-mut', '');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.innerHTML = '<path d="M3.5 4.5h9M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 4.5l.6 8.4A1.5 1.5 0 0 0 7.1 14.5h1.8a1.5 1.5 0 0 0 1.5-1.6l.6-8.4M7 7v5M9 7v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';
    del.appendChild(svg);
    del.addEventListener('click', () => {
      if (!KG.requireUnlock()) return;
      schedule.windows.splice(idx, 1);
      renderAll();
    });
    actions.appendChild(del);

    li.appendChild(days);
    li.appendChild(tWrap);
    li.appendChild(actions);
    return li;
  }

  function renderAll() {
    const list = document.getElementById('kg-sched-list');
    list.innerHTML = '';
    if (!schedule.windows || schedule.windows.length === 0) {
      const li = document.createElement('li');
      li.className = 'kg-empty';
      li.textContent = '暂无时段, 点击"添加时段"创建';
      li.style.justifyContent = 'center';
      li.style.color = 'var(--kg-text-muted)';
      list.appendChild(li);
    } else {
      schedule.windows.forEach((win, i) => list.appendChild(renderRow(i, win)));
    }
    document.getElementById('kg-sched-enabled').checked = !!schedule.enabled;
  }

  function collectFromUI() {
    const list = document.getElementById('kg-sched-list');
    const rows = list.querySelectorAll('[data-row]');
    const wins = [];
    let err = null;
    rows.forEach((row) => {
      const dayInps = row.querySelectorAll('.kg-sched-days input[type="checkbox"]');
      const days = [];
      dayInps.forEach((d) => { if (d.checked) days.push(Number(d.value)); });
      const inputs = row.querySelectorAll('.kg-sched-time input[type="time"]');
      const from = inputs[0] ? inputs[0].value : '';
      const to = inputs[1] ? inputs[1].value : '';
      if (days.length === 0) err = err || '每个时段至少选择 1 天';
      if (!timeRegex(from) || !timeRegex(to)) err = err || '时间格式应为 HH:MM';
      if (from === to) err = err || '起止时间不能相同';
      wins.push({ days, from, to });
    });
    return { wins, err };
  }

  function setError(msg) {
    const e = document.getElementById('kg-sched-error');
    if (msg) { e.textContent = msg; e.hidden = false; }
    else { e.textContent = ''; e.hidden = true; }
  }

  async function save() {
    setError('');
    if (!KG.requireUnlock()) return;
    const { wins, err } = collectFromUI();
    if (err) { setError(err); return; }
    schedule.windows = wins;
    schedule.enabled = document.getElementById('kg-sched-enabled').checked;
    const reply = await KG.send(KG.MSG.SCHEDULE_UPDATE, { schedule });
    if (reply && reply.ok) {
      schedule = (reply.data && reply.data.schedule) || schedule;
      renderAll();
      KG.toast('已保存时段', 'success');
    } else {
      setError('保存失败: ' + (reply && reply.error || '未知错误'));
    }
  }

  function bindOnce() {
    if (KG._schedBound) return;
    KG._schedBound = true;
    document.getElementById('kg-sched-add').addEventListener('click', () => {
      if (!KG.requireUnlock()) return;
      schedule.windows.push({ days: [1, 2, 3, 4, 5, 6, 7], from: '22:00', to: '06:00' });
      renderAll();
    });
    document.getElementById('kg-sched-save').addEventListener('click', save);
    document.getElementById('kg-sched-enabled').addEventListener('change', (ev) => {
      if (!KG.requireUnlock()) {
        ev.target.checked = !ev.target.checked;
        return;
      }
      schedule.enabled = ev.target.checked;
    });
  }

  async function load() {
    const data = await KG.getStorage([KG.STORAGE_KEYS.schedule]);
    schedule = data[KG.STORAGE_KEYS.schedule] || { enabled: false, windows: [] };
    if (!Array.isArray(schedule.windows)) schedule.windows = [];
    renderAll();
  }

  KG.tabBootstrap.schedule = function () {
    bindOnce();
    load();
  };
})();
