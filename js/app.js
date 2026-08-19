/* Hisob-kitob — spot savdo foyda/zarar daftari.
   Bitta ekran. Ma'lumot faqat qurilmaning o'zida (localStorage) saqlanadi. */

const VERSION = '3.0.0';
const KEY = 'spot_hisob_v2';

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.items)) {
      return { items: s.items, fee: s.fee != null ? s.fee : 0.1 };
    }
  } catch (e) { /* buzilgan ma'lumot — bo'shdan boshlaymiz */ }
  return { items: [], fee: 0.1 };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    toast('Saqlanmadi: xotira to\'lgan bo\'lishi mumkin');
  }
}

/* ---------------- yordamchilar ---------------- */

const $ = (id) => document.getElementById(id);

function num(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function has(v) { return String(v == null ? '' : v).trim() !== '' && num(v) > 0; }

function money(v) {
  const n = Number(v) || 0;
  // 1 dan kichik narxlarda (masalan 0.045) aniqlik kerak, keraksiz nollar kesiladi
  if (n !== 0 && Math.abs(n) < 1) return String(parseFloat(n.toFixed(6)));
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function signed(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? '+' : '−') + money(Math.abs(n));
}

function pct(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%';
}

function tone(v) { return (Number(v) || 0) >= 0 ? 'up' : 'down'; }

function qtyFmt(v) {
  const n = Number(v) || 0;
  if (n === 0) return '0';
  return String(parseFloat(n.toPrecision(6)));
}

function dateFmt(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : '';
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function normCoin(v) {
  const s = String(v).trim().toUpperCase().replace(/[\s/_-]/g, '');
  if (!s || s === 'USDT') return s;
  return s.replace(/USDT$/, '') || s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2400);
}

/* ---------------- asosiy hisob ----------------
   miqdor    = qo'ygan pul ÷ olgan narx
   sotuv     = miqdor × sotgan narx
   komissiya = (qo'ygan pul + sotuv) × komissiya% ÷ 100
   foyda     = sotuv − qo'ygan pul − komissiya                  */

function calc(sum, inPrice, outPrice, feePct) {
  const qty = inPrice > 0 ? sum / inPrice : 0;
  const out = qty * outPrice;
  const fee = (sum + out) * (feePct / 100);
  const pnl = out - sum - fee;
  return {
    qty, out, fee, pnl,
    pct: sum > 0 ? (pnl / sum) * 100 : 0,
    net: sum + pnl            // qo'lga tegadigan pul
  };
}

/* ---------------- jonli natija ---------------- */

function updateResult() {
  const coin = normCoin($('fCoin').value);
  const sum = num($('fSum').value);
  const inP = num($('fIn').value);
  const outP = num($('fOut').value);
  const fee = state.fee;

  const cap = $('resCap'), big = $('resBig');
  const p = $('resPill'), rows = $('resRows'), hint = $('resHint');

  // 1) yetarli ma'lumot yo'q
  if (!(sum > 0 && inP > 0)) {
    cap.textContent = 'Natija';
    big.className = 'figure void';
    big.innerHTML = '0.00<i>$</i>';
    p.classList.add('hidden');
    rows.classList.add('hidden');
    hint.classList.remove('hidden');
    hint.textContent = 'Qo\'ygan pulingiz va olgan narxingizni yozing';
    return;
  }

  const qty = sum / inP;

  // 2) hali sotilmagan
  if (!(outP > 0)) {
    cap.textContent = 'Nechta oldingiz';
    big.className = 'figure';
    big.innerHTML = qtyFmt(qty) + (coin ? `<i>${escapeHtml(coin)}</i>` : '');
    p.classList.add('hidden');
    rows.classList.add('hidden');
    hint.classList.remove('hidden');
    hint.textContent = 'Sotgan narxingizni yozsangiz, foyda ko\'rinadi';
    return;
  }

  // 3) to'liq hisob
  const r = calc(sum, inP, outP, fee);
  const t = tone(r.pnl);

  cap.textContent = r.pnl >= 0 ? 'Foyda' : 'Zarar';
  big.className = 'figure ' + t;
  big.innerHTML = signed(r.pnl) + '<i>$</i>';

  p.textContent = pct(r.pct);
  p.className = 'pct ' + t;

  rows.classList.remove('hidden');
  $('rQty').textContent = qtyFmt(r.qty) + (coin ? ' ' + coin : '');
  $('rOut').textContent = money(r.out) + ' $';
  $('rFee').textContent = money(r.fee) + ' $';
  $('rNet').textContent = money(r.net) + ' $';

  hint.classList.add('hidden');
}

['fCoin', 'fSum', 'fIn', 'fOut'].forEach((id) =>
  $(id).addEventListener('input', updateResult));

/* ---------------- saqlash ---------------- */

$('btnSave').addEventListener('click', () => {
  const coin = normCoin($('fCoin').value);
  const sum = num($('fSum').value);
  const inP = num($('fIn').value);
  const outRaw = $('fOut').value;
  const date = $('fDate').value || todayISO();

  if (!coin) return toast('Coin nomini yozing');
  if (!(sum > 0)) return toast('Qancha pul qo\'yganingizni yozing');
  if (!(inP > 0)) return toast('Olgan narxingizni yozing');

  state.items.push({
    id: Date.now(),
    coin, sum, inPrice: inP,
    outPrice: has(outRaw) ? num(outRaw) : null,
    fee: state.fee,
    date
  });
  save();
  resetForm();
  render();
  toast(has(outRaw) ? 'Saqlandi' : 'Ochiq savdo saqlandi');
});

$('btnReset').addEventListener('click', () => { resetForm(); toast('Tozalandi'); });

function resetForm() {
  ['fCoin', 'fSum', 'fIn', 'fOut'].forEach((id) => { $(id).value = ''; });
  $('fDate').value = todayISO();
  $('feeBtn').textContent = state.fee + '%';
  updateResult();
}

/* ---------------- ro'yxat ---------------- */

function render() {
  const items = [...state.items].sort(
    (a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id
  );

  const closed = items.filter((i) => i.outPrice > 0);
  const results = closed.map((i) => calc(i.sum, i.inPrice, i.outPrice, i.fee));
  const total = results.reduce((s, r) => s + r.pnl, 0);
  const wins = results.filter((r) => r.pnl >= 0).length;

  const big = $('heroPnl');
  big.className = 'figure' + (closed.length ? ' ' + tone(total) : ' void');
  big.innerHTML = (closed.length ? signed(total) : '0.00') + '<i>$</i>';

  $('chipCount').textContent = items.length + ' savdo';
  $('chipWin').textContent =
    (closed.length ? Math.round((wins / closed.length) * 100) + '%' : '—') + ' yutuq';

  $('listCount').textContent = items.length;
  const show = items.length > 0;
  $('listHead').style.display = show ? '' : 'none';
  $('listRule').style.display = show ? '' : 'none';

  $('list').innerHTML = show
    ? items.map(itemHtml).join('')
    : '';

  $('coinList').innerHTML = [...new Set(state.items.map((i) => i.coin))]
    .sort().map((c) => `<option value="${escapeHtml(c)}">`).join('');

  bindItems();
}

function itemHtml(i) {
  const open = !(i.outPrice > 0);
  const qty = i.inPrice > 0 ? i.sum / i.inPrice : 0;

  let mood, right, sub;
  if (open) {
    mood = 'open';
    right = `<div class="t-pnl idle">${money(i.sum)}</div>
             <div class="t-pct">qo'yilgan</div>`;
    sub = `${money(i.inPrice)} $ narxda olingan`;
  } else {
    const r = calc(i.sum, i.inPrice, i.outPrice, i.fee);
    mood = r.pnl >= 0 ? 'win' : 'lose';
    right = `<div class="t-pnl ${tone(r.pnl)}">${signed(r.pnl)}</div>
             <div class="t-pct">${pct(r.pct)}</div>`;
    sub = `${money(i.sum)} → ${money(r.net)} $`;
  }

  const closeRow = open ? `
    <div class="t-close">
      <span class="t-close-lbl">Sotgan narxim</span>
      <div class="val">
        <input type="text" inputmode="decimal" placeholder="0.00" data-out="${i.id}">
        <u>$</u>
      </div>
      <button data-close="${i.id}">Yopish</button>
    </div>` : '';

  const fine = `${money(i.inPrice)}${open ? '' : ' → ' + money(i.outPrice)} · `
    + `${qtyFmt(qty)} dona · ${dateFmt(i.date)}`;

  return `<div class="trade ${mood}">
    <span class="t-mark"></span>
    <div class="t-main">
      <div class="t-coin">${escapeHtml(i.coin)}${open ? '<em>ochiq</em>' : ''}</div>
      <div class="t-sub">${sub}</div>
      <div class="t-fine">${fine}</div>
      ${closeRow}
    </div>
    <div class="t-right">${right}</div>
    <button class="t-del" data-del="${i.id}" aria-label="O'chirish">✕</button>
  </div>`;
}

function bindItems() {
  document.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!confirm('Bu yozuv o\'chirilsinmi?')) return;
      state.items = state.items.filter((i) => String(i.id) !== b.dataset.del);
      save(); render(); toast('O\'chirildi');
    }));

  document.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.close;
      const inp = document.querySelector(`[data-out="${id}"]`);
      const v = num(inp && inp.value);
      if (!(v > 0)) { if (inp) inp.focus(); return toast('Sotgan narxingizni yozing'); }
      const item = state.items.find((i) => String(i.id) === id);
      if (!item) return;
      item.outPrice = v;
      save(); render(); toast('Savdo yopildi');
    }));
}

/* ---------------- sozlamalar ---------------- */

function openSettings() {
  $('sFee').value = state.fee;
  $('settingsModal').classList.remove('hidden');
}
function closeSettings() { $('settingsModal').classList.add('hidden'); }

$('btnSettings').addEventListener('click', openSettings);
$('feeBtn').addEventListener('click', openSettings);
$('btnCloseSettings').addEventListener('click', closeSettings);
$('settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') closeSettings();
});

$('sFee').addEventListener('input', () => {
  state.fee = num($('sFee').value);
  save();
  $('feeBtn').textContent = state.fee + '%';
  updateResult();
});

$('version').textContent = 'v' + VERSION;

$('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hisob-kitob-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});

$('btnImport').addEventListener('click', () => $('fileImport').click());
$('fileImport').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const s = JSON.parse(rd.result);
      if (!Array.isArray(s.items)) throw new Error('format');
      if (!confirm(`${s.items.length} ta yozuv tiklansinmi? Hozirgi ma'lumot almashtiriladi.`)) return;
      state = { items: s.items, fee: s.fee != null ? s.fee : 0.1 };
      save(); resetForm(); render(); closeSettings();
      toast('Tiklandi');
    } catch (err) {
      toast('Fayl noto\'g\'ri');
    }
  };
  rd.readAsText(f);
  e.target.value = '';
});

$('btnClear').addEventListener('click', () => {
  if (!confirm('HAMMA yozuv o\'chiriladi. Ishonchingiz komilmi?')) return;
  if (!confirm('Oxirgi ogohlantirish — qaytarib bo\'lmaydi!')) return;
  state = { items: [], fee: state.fee };
  save(); resetForm(); render(); closeSettings();
  toast('Tozalandi');
});

/* ---------------- ishga tushirish ---------------- */

resetForm();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').catch(() => {}));
}
