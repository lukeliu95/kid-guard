// KidGuard options - PIN / recovery question tab

(function () {
  window.KG = window.KG || {};
  window.KG.tabBootstrap = window.KG.tabBootstrap || {};
  const KG = window.KG;

  function setErr(id, msg) {
    const e = document.getElementById(id);
    if (msg) { e.textContent = msg; e.hidden = false; }
    else { e.textContent = ''; e.hidden = true; }
  }

  async function changePin() {
    setErr('kg-pin-change-error', '');
    if (!KG.requireUnlock()) return;
    const oldPin = document.getElementById('kg-pin-old').value.trim();
    const new1 = document.getElementById('kg-pin-new1').value.trim();
    const new2 = document.getElementById('kg-pin-new2').value.trim();
    if (!/^[0-9]{4,6}$/.test(oldPin)) { setErr('kg-pin-change-error', '原 PIN 必须是 4-6 位数字'); return; }
    if (!/^[0-9]{4,6}$/.test(new1)) { setErr('kg-pin-change-error', '新 PIN 必须是 4-6 位数字'); return; }
    if (new1 !== new2) { setErr('kg-pin-change-error', '两次新 PIN 不一致'); return; }
    if (new1 === oldPin) { setErr('kg-pin-change-error', '新 PIN 不能与原 PIN 相同'); return; }

    // Verify old PIN first
    const verify = await KG.send(KG.MSG.PIN_VERIFY, { pin: oldPin });
    if (!verify || !verify.ok || !verify.data || !verify.data.unlocked) {
      setErr('kg-pin-change-error', '原 PIN 错误');
      return;
    }
    // Reuse PIN_SETUP to overwrite hash. Server-side must accept overwrite when unlocked.
    // We pass empty recovery fields - service worker should preserve existing recovery if not provided.
    const reply = await KG.send(KG.MSG.PIN_SETUP, { pin: new1 });
    if (reply && reply.ok) {
      document.getElementById('kg-pin-old').value = '';
      document.getElementById('kg-pin-new1').value = '';
      document.getElementById('kg-pin-new2').value = '';
      KG.toast('PIN 已更新', 'success');
    } else {
      setErr('kg-pin-change-error', '保存失败: ' + (reply && reply.error || '未知错误'));
    }
  }

  async function changeRecovery() {
    setErr('kg-recq-error', '');
    if (!KG.requireUnlock()) return;
    const q = document.getElementById('kg-recq-new').value.trim();
    const a = document.getElementById('kg-reca-new').value.trim();
    if (q.length < 2 || q.length > 60) { setErr('kg-recq-error', '问题需 2-60 字符'); return; }
    if (a.length < 2 || a.length > 60) { setErr('kg-recq-error', '答案需 2-60 字符'); return; }
    const reply = await KG.send(KG.MSG.PIN_SETUP, { recoveryQ: q, recoveryA: a });
    if (reply && reply.ok) {
      document.getElementById('kg-recq-new').value = '';
      document.getElementById('kg-reca-new').value = '';
      KG.toast('退出问题已更新', 'success');
    } else {
      setErr('kg-recq-error', '保存失败: ' + (reply && reply.error || '未知错误'));
    }
  }

  function bindOnce() {
    if (KG._pinTabBound) return;
    KG._pinTabBound = true;
    ['kg-pin-old', 'kg-pin-new1', 'kg-pin-new2'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => {
        el.value = el.value.replace(/[^0-9]/g, '').slice(0, 6);
      });
    });
    document.getElementById('kg-pin-change-submit').addEventListener('click', changePin);
    document.getElementById('kg-recq-submit').addEventListener('click', changeRecovery);
  }

  KG.tabBootstrap.pin = function () {
    bindOnce();
    setErr('kg-pin-change-error', '');
    setErr('kg-recq-error', '');
  };
})();
