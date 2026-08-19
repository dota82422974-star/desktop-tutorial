/* Hisob-kitob — spot savdo foyda/zarar daftari.
   Bitta ekran. Ma'lumot faqat qurilmaning o'zida (localStorage) saqlanadi. */

const VERSION = '2.0.0';
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

function cls(v) { return (Number(v) || 0) >= 0 ? 'pos' : 'neg'; }

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
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ---------------- asosiy hisob ----------------
   sum      — kirishda qo'yilgan pul (USDT)
   inPrice  — kirish narxi
   outPrice — chiqish narxi
   feePct   — har ikki tomondagi komissiya foizi

   miqdor   = sum / inPrice
   chiqish  = miqdor × outPrice
   komissiya= (sum + chiqish) × feePct/100
   foyda    = chiqish − sum − komissiya                                */

function calc(sum, inPrice, outPrice, feePct) {
  const qty = inPrice > 0 ? sum / inPrice : 0;
  const out = qty * outPrice;
  const fee = (sum + out) * (feePct / 100);
  const pnl = out - sum - fee;
  return {
    qty, out, fee, pnl,
    pct: sum > 0 ? (pnl / sum) * 100 : 0,
    net: sum + pnl           // qo'lga tegadigan pul
  };
}

/* ---------------- hisoblagich (jonli natija) ---------------- */

function updateResult() {
  const sum = num($('fSum').value);
  const inP = num($('fIn').value);
  const outP = num($('fOut').value);
  const fee = num($('fFee').value);

  const elPnl = $('resPnl'), elPct = $('resPct'), elSub = $('resSub');

  if (!(sum > 0 && inP > 0)) {
    elPnl.textContent = '0.00';
    elPnl.className = 'res-main';
    elPct.textContent = '';
    elSub.textContent = 'Summa va kirish narxini kiriting';
    return;
  }

  const qty = sum / inP;

  if (!(outP > 0)) {
    elPnl.textContent = qtyFmt(qty);
    elPnl.className = 'res-main';
    elPct.textContent = 'dona';
    elSub.innerHTML = `${money(sum)} USDT ÷ ${money(inP)}
      <br>Chiqish narxini kiritsangiz foyda ko'rinadi`;
    return;
  }

  const r = calc(sum, inP, outP, fee);
  elPnl.textContent = signed(r.pnl);
  elPnl.className = 'res-main ' + cls(r.pnl);
  elPct.textContent = pct(r.pct);
  elPct.className = 'res-pct ' + cls(r.pct);
  elSub.innerHTML = `${qtyFmt(r.qty)} dona · qo'lga: <b>${money(r.net)}</b> USDT`
    + (r.fee > 0 ? ` · komissiya: ${money(r.fee)}` : '');
}

['fSum', 'fIn', 'fOut', 'fFee'].forEach((id) =>
  $(id).addEventListener('input', updateResult));

/* ---------------- saqlash ---------------- */

$('btnSave').addEventListener('click', () => {
  const coin = normCoin($('fCoin').value);
  const sum = num($('fSum').value);
  const inP = num($('fIn').value);
  const outRaw = $('fOut').value;
  const fee = num($('fFee').value);
  const date = $('fDate').value || todayISO();

  if (!coin) return toast('Coin nomini yozing (SOL, BTC...)');
  if (!(sum > 0)) return toast('Qancha pul kirganingizni yozing');
  if (!(inP > 0)) return toast('Kirish narxini yozing');

  state.items.push({
    id: Date.now(),
    coin, sum, inPrice: inP,
    outPrice: has(outRaw) ? num(outRaw) : null,
    fee, date
  });
  save();
  resetForm();
  render();
  toast('Saqlandi');
});

$('btnReset').addEventListener('click', () => { resetForm(); toast('Tozalandi'); });

function resetForm() {
  ['fCoin', 'fSum', 'fIn', 'fOut'].forEach((id) => { $(id).value = ''; });
  $('fFee').value = state.fee;
  $('fDate').value = todayISO();
  updateResult();
}

/* ---------------- ro'yxat va jami ---------------- */

function render() {
  const items = [...state.items].sort(
    (a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id
  );

  const closed = items.filter((i) => i.outPrice > 0);
  const results = closed.map((i) => calc(i.sum, i.inPrice, i.outPrice, i.fee));
  const total = results.reduce((s, r) => s + r.pnl, 0);
  const wins = results.filter((r) => r.pnl >= 0).length;

  $('totPnl').textContent = signed(total);
  $('totPnl').className = cls(total);
  $('totWin').textContent = closed.length ? Math.round((wins / closed.length) * 100) + '%' : '—';
  $('totCount').textContent = items.length;

  $('list').innerHTML = items.length ? items.map(itemHtml).join('')
    : `<div class="empty">Hali yozuv yo'q.<br>Yuqorida coin, summa va narxlarni kiriting.</div>`;

  $('coinList').innerHTML = [...new Set(state.items.map((i) => i.coin))]
    .sort().map((c) => `<option value="${escapeHtml(c)}">`).join('');

  bindItems();
}

function itemHtml(i) {
  const open = !(i.outPrice > 0);
  const qty = i.inPrice > 0 ? i.sum / i.inPrice : 0;

  const right = open
    ? `<div class="item-pnl muted">${money(i.sum)}</div>
       <div class="item-pct muted">qo'yilgan</div>`
    : (() => {
        const r = calc(i.sum, i.inPrice, i.outPrice, i.fee);
        return `<div class="item-pnl ${cls(r.pnl)}">${signed(r.pnl)}</div>
                <div class="item-pct ${cls(r.pnl)}">${pct(r.pct)}</div>`;
      })();

  const flow = open
    ? `${money(i.sum)} USDT · ${money(i.inPrice)} da kirdi`
    : `${money(i.sum)} → ${money(calc(i.sum, i.inPrice, i.outPrice, i.fee).net)} USDT`;

  const closeRow = open
    ? `<div class="close-row">
         <input type="text" inputmode="decimal" placeholder="Chiqish narxi" data-out="${i.id}">
         <button class="btn primary sm" data-close="${i.id}">Yopish</button>
       </div>`
    : '';

  return `<div class="item ${open ? 'open' : ''}">
    <div class="item-top">
      <div>
        <div class="item-coin">${escapeHtml(i.coin)}${open ? '<span class="tag">OCHIQ</span>' : ''}</div>
        <div class="item-flow">${flow}</div>
      </div>
      <div class="item-right">${right}</div>
    </div>
    ${closeRow}
    <div class="item-meta">
      <div class="meta-info">
        <span>${money(i.inPrice)}${open ? '' : ' → ' + money(i.outPrice)}</span>
        <span>${qtyFmt(qty)} dona</span>
        <span>${dateFmt(i.date)}</span>
      </div>
      <button class="del" data-del="${i.id}" aria-label="O'chirish">✕</button>
    </div>
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
      if (!(v > 0)) return toast('Chiqish narxini yozing');
      const item = state.items.find((i) => String(i.id) === id);
      if (!item) return;
      item.outPrice = v;
      save(); render(); toast('Savdo yopildi');
    }));
}

/* ---------------- sozlamalar ---------------- */

$('btnSettings').addEventListener('click', () => {
  $('sFee').value = state.fee;
  $('settingsModal').classList.remove('hidden');
});
$('btnCloseSettings').addEventListener('click', closeSettings);
$('settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') closeSettings();
});
function closeSettings() { $('settingsModal').classList.add('hidden'); }

$('sFee').addEventListener('change', () => {
  state.fee = num($('sFee').value);
  save();
  $('fFee').value = state.fee;
  updateResult();
  toast('Komissiya saqlandi');
});

$('version').textContent = 'Hisob-kitob v' + VERSION;

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
  save(); render(); closeSettings();
  toast('Tozalandi');
});

/* ---------------- ishga tushirish ---------------- */

resetForm();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').catch(() => {}));
}
