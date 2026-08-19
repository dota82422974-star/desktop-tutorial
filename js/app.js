/* Hisob-kitob — spot savdo foyda/zarar daftari.
   Bitta ekran. Ma'lumot faqat qurilmaning o'zida (localStorage) saqlanadi. */

const VERSION = '2.1.0';
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

// coin nomidan barqaror rang — har bir coin o'z rangini oladi
function coinHue(coin) {
  let h = 0;
  for (let i = 0; i < coin.length; i++) h = (h * 131 + coin.charCodeAt(i) * 7) >>> 0;
  return (h * 137) % 360;
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
   miqdor    = qo'yilgan pul ÷ olgan narx
   sotuv     = miqdor × sotgan narx
   komissiya = (qo'yilgan pul + sotuv) × komissiya% ÷ 100
   foyda     = sotuv − qo'yilgan pul − komissiya                  */

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

  const box = $('result'), big = $('resBig'), cap = $('resCap');
  const pill = $('resPill'), rows = $('resRows'), hint = $('resHint');

  box.className = 'screen';
  big.className = 'res-big';

  // 1-holat: yetarli ma'lumot yo'q
  if (!(sum > 0 && inP > 0)) {
    cap.textContent = 'Natija';
    big.textContent = '0.00 $';
    big.classList.add('dim');
    pill.classList.add('hidden');
    rows.classList.add('hidden');
    hint.classList.remove('hidden');
    hint.textContent = 'Qancha pul qo\'yganingiz va olgan narxingizni yozing';
    return;
  }

  const qty = sum / inP;

  // 2-holat: hali sotilmagan — faqat nechta dona olinganini ko'rsatamiz
  if (!(outP > 0)) {
    cap.textContent = 'Nechta oldingiz';
    big.textContent = qtyFmt(qty) + (coin ? ' ' + coin : '');
    pill.classList.add('hidden');
    rows.classList.add('hidden');
    hint.classList.remove('hidden');
    hint.textContent = 'Sotgan narxingizni yozsangiz — foyda ko\'rinadi';
    return;
  }

  // 3-holat: to'liq hisob
  const r = calc(sum, inP, outP, fee);
  const up = r.pnl >= 0;

  box.classList.add(up ? 'up' : 'down');
  cap.textContent = up ? 'Foyda' : 'Zarar';
  big.textContent = signed(r.pnl) + ' $';
  big.classList.add(cls(r.pnl));

  pill.textContent = pct(r.pct);
  pill.className = 'res-pill ' + cls(r.pnl);

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

  if (!coin) return toast('Coin nomini yozing — SOL, BTC...');
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
  toast(has(outRaw) ? 'Savdo saqlandi' : 'Ochiq savdo saqlandi');
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

  const hero = $('hero');
  hero.className = 'glass hero' + (closed.length ? (total >= 0 ? ' up' : ' down') : '');
  $('heroPnl').innerHTML =
    (closed.length ? signed(total) : '0.00') + '<i>$</i>';
  $('chipCount').textContent = items.length + ' savdo';
  $('chipWin').textContent =
    (closed.length ? Math.round((wins / closed.length) * 100) + '%' : '—') + ' yutuq';

  renderSpark(closed.map((i) => calc(i.sum, i.inPrice, i.outPrice, i.fee).pnl).reverse());

  $('listCount').textContent = items.length;
  $('listHead').style.display = items.length ? '' : 'none';

  $('list').innerHTML = items.length
    ? items.map(itemHtml).join('')
    : `<div class="empty-state">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round">
           <path d="M5 20V11M12 20V4m7 16v-6"/>
         </svg>
         <p>Hali savdo qo'shilmagan.<br>Yuqoridagi kataklarni to'ldirib
            <b>“Savdoni saqlash”</b> ni bosing.</p>
       </div>`;

  $('coinList').innerHTML = [...new Set(state.items.map((i) => i.coin))]
    .sort().map((c) => `<option value="${escapeHtml(c)}">`).join('');

  bindItems();
}

// oxirgi savdolarning mini ustunlari
function renderSpark(pnls) {
  const el = $('spark');
  const list = pnls.slice(-14);
  if (list.length < 2) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  const max = Math.max(...list.map((p) => Math.abs(p))) || 1;
  el.innerHTML = list.map((p, n) => {
    const hgt = Math.max(20, Math.round((Math.abs(p) / max) * 100));
    return `<b class="${p >= 0 ? 'u' : 'd'}" style="height:${hgt}%;animation-delay:${n * 28}ms"></b>`;
  }).join('');
}

function itemHtml(i) {
  const open = !(i.outPrice > 0);
  const qty = i.inPrice > 0 ? i.sum / i.inPrice : 0;
  const h = coinHue(i.coin);
  const av = `background:linear-gradient(140deg,hsl(${h} 62% 48%),hsl(${(h + 45) % 360} 58% 34%))`;

  let right, flow, mood;
  if (open) {
    mood = 'open';
    right = `<div class="item-pnl" style="color:var(--muted)">${money(i.sum)} $</div>
             <div class="item-pct" style="color:var(--dim)">qo'yilgan</div>`;
    flow = `${money(i.inPrice)} $ narxda olingan`;
  } else {
    const r = calc(i.sum, i.inPrice, i.outPrice, i.fee);
    mood = r.pnl >= 0 ? 'win' : 'lose';
    right = `<div class="item-pnl ${cls(r.pnl)}">${signed(r.pnl)} $</div>
             <div class="item-pct ${cls(r.pnl)}">${pct(r.pct)}</div>`;
    flow = `${money(i.sum)} → ${money(r.net)} $`;
  }

  const closeRow = open ? `
    <div class="close-row">
      <div class="box">
        <span class="box-lbl">Sotgan narxim</span>
        <div class="box-in">
          <input type="text" inputmode="decimal" placeholder="0.00" data-out="${i.id}">
          <span class="unit">$</span>
        </div>
      </div>
      <button class="mini-cta" data-close="${i.id}">Yopish</button>
    </div>` : '';

  return `<div class="item ${mood}">
    <div class="item-top">
      <div class="avatar" style="${av}">${escapeHtml(i.coin.slice(0, 4))}</div>
      <div class="item-id">
        <div class="item-coin">${escapeHtml(i.coin)}${open ? '<span class="tag">OCHIQ</span>' : ''}</div>
        <div class="item-flow">${flow}</div>
      </div>
      <div class="item-right">${right}</div>
    </div>
    ${closeRow}
    <div class="item-meta">
      <div class="meta-info">
        <span>${money(i.inPrice)}${open ? '' : ' → ' + money(i.outPrice)} $</span>
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
  save(); resetForm(); render(); closeSettings();
  toast('Hammasi tozalandi');
});

/* ---------------- ishga tushirish ---------------- */

resetForm();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').catch(() => {}));
}
