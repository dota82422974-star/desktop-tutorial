/* Spot Jurnal — spot savdo uchun hisob-kitob daftari
   Barcha ma'lumot localStorage'da, qurilmaning o'zida saqlanadi. */

const VERSION = '1.0.0';
const KEY = 'spot_jurnal_v1';

/* ---------------- state ---------------- */

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { trades: s.trades || [], prices: s.prices || {} };
    }
  } catch (e) { /* buzilgan ma'lumot — bo'sh boshlaymiz */ }
  return { trades: [], prices: {} };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    toast('Saqlashda xato: xotira to\'lgan bo\'lishi mumkin');
  }
}

/* ---------------- yordamchilar ---------------- */

const $ = (id) => document.getElementById(id);

function num(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
}

// pul: 2 xona; lekin juda kichik sonlarni ham ko'rsatamiz
function money(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  const d = abs > 0 && abs < 1 ? 4 : 2;
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function signed(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? '+' : '−') + money(Math.abs(n));
}

// miqdor: keraksiz nollarsiz, 8 xonagacha
function qtyFmt(v) {
  const n = Number(v) || 0;
  return parseFloat(n.toFixed(8)).toString();
}

function pct(v) {
  const n = Number(v) || 0;
  return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%';
}

function cls(v) { return (Number(v) || 0) >= 0 ? 'pos' : 'neg'; }

// "btcusdt", "BTC/USDT", " btc " -> "BTC"
function normCoin(v) {
  const s = String(v).trim().toUpperCase().replace(/[\s/_-]/g, '');
  if (!s || s === 'USDT') return s;
  return s.replace(/USDT$/, '') || s;
}

function dateFmt(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${d}.${m}.${y}`;
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ---------------- hisob-kitob (o'rtacha narx usuli) ----------------
   Har bir sotishda foyda = (sotuv summasi − komissiya) − (o'rtacha tannarx × miqdor)
   Sotib olish komissiyasi tannarxga qo'shiladi.                       */

function compute() {
  const coins = {};           // coin -> pozitsiya holati
  const pnlById = {};         // sotuv id -> realizatsiya qilingan foyda
  let realized = 0, fees = 0;

  const sorted = [...state.trades].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id
  );

  for (const t of sorted) {
    if (!coins[t.coin]) {
      coins[t.coin] = { coin: t.coin, qty: 0, cost: 0, realized: 0, buys: 0, sells: 0, wins: 0, fees: 0 };
    }
    const c = coins[t.coin];
    const fee = num(t.fee);
    fees += fee;
    c.fees += fee;

    if (t.type === 'buy') {
      c.qty += t.qty;
      c.cost += t.price * t.qty + fee;
      c.buys++;
    } else {
      const avg = c.qty > 0 ? c.cost / c.qty : 0;
      const pnl = (t.price * t.qty - fee) - avg * t.qty;
      pnlById[t.id] = pnl;
      c.realized += pnl;
      realized += pnl;
      c.cost -= avg * t.qty;
      c.qty -= t.qty;
      c.sells++;
      if (pnl >= 0) c.wins++;
      // qoldiq nolga yaqin bo'lsa — pozitsiya yopilgan
      if (c.qty < 1e-10) { c.qty = 0; c.cost = 0; }
    }
  }

  // ochiq pozitsiyalar
  const open = [];
  let invested = 0, value = 0;
  for (const c of Object.values(coins)) {
    if (c.qty <= 0) continue;
    const avg = c.cost / c.qty;
    const price = state.prices[c.coin] != null ? state.prices[c.coin] : avg;
    const val = price * c.qty;
    invested += c.cost;
    value += val;
    open.push({
      coin: c.coin, qty: c.qty, cost: c.cost, avg, price, value: val,
      pnl: val - c.cost,
      pnlPct: c.cost > 0 ? ((val - c.cost) / c.cost) * 100 : 0,
      manual: state.prices[c.coin] == null
    });
  }
  open.sort((a, b) => b.value - a.value);

  return {
    coins, pnlById, open, sorted,
    realized, fees, invested, value,
    unrealized: value - invested,
    total: realized + (value - invested)
  };
}

/* ---------------- sahifalarni chizish ---------------- */

const TITLES = { home: 'Umumiy', positions: 'Pozitsiyalar', trades: 'Savdolar', stats: 'Statistika' };
let currentPage = 'home';

function render() {
  const r = compute();
  renderHome(r);
  renderPositions(r);
  renderTrades(r);
  renderStats(r);
  renderCoinList();
}

/* --- Umumiy --- */
function renderHome(r) {
  $('heroPnl').textContent = signed(r.total);
  $('heroPnl').className = 'hero-value ' + cls(r.total);

  // foiz — ochiq pozitsiyalarga qo'yilgan pulga nisbatan
  $('heroPct').textContent = r.invested > 0 ? pct((r.total / r.invested) * 100) : '—';
  $('heroPct').className = 'hero-sub ' + cls(r.total);

  $('statInvested').textContent = money(r.invested);
  $('statValue').textContent = money(r.value);
  $('statUnreal').textContent = signed(r.unrealized);
  $('statUnreal').className = 'stat-value ' + cls(r.unrealized);
  $('statReal').textContent = signed(r.realized);
  $('statReal').className = 'stat-value ' + cls(r.realized);

  const recent = [...r.sorted].reverse().slice(0, 5);
  $('recentList').innerHTML = recent.length
    ? recent.map((t) => tradeRow(t, r.pnlById[t.id])).join('')
    : '<div class="empty">Hali savdo qo\'shilmagan.<br>Pastdagi <b>+</b> tugmasini bosing.</div>';
}

function tradeRow(t, pnl) {
  const isSell = t.type === 'sell';
  const right = isSell && pnl != null
    ? `<div class="row-val ${cls(pnl)}">${signed(pnl)}</div>
       <div class="row-sub">${money(t.price * t.qty)}</div>`
    : `<div class="row-val">${money(t.price * t.qty)}</div>
       <div class="row-sub">USDT</div>`;
  return `<div class="row">
    <div class="row-main">
      <div class="row-title">
        <span class="badge ${t.type}">${isSell ? 'SOT' : 'OL'}</span>${t.coin}
      </div>
      <div class="row-sub">${qtyFmt(t.qty)} × ${money(t.price)} · ${dateFmt(t.date)}</div>
    </div>
    <div class="row-right">${right}</div>
  </div>`;
}

/* --- Pozitsiyalar --- */
function renderPositions(r) {
  const el = $('positionsList');
  if (!r.open.length) {
    el.innerHTML = '<div class="empty">Ochiq pozitsiya yo\'q.</div>';
    return;
  }
  el.innerHTML = r.open.map((p) => `
    <div class="pos-card">
      <div class="pos-top">
        <div>
          <div class="pos-coin">${p.coin}</div>
          <div class="pos-qty">${qtyFmt(p.qty)} dona</div>
        </div>
        <div class="pos-pnl">
          <b class="${cls(p.pnl)}">${signed(p.pnl)}</b>
          <span class="${cls(p.pnl)}">${pct(p.pnlPct)}</span>
        </div>
      </div>
      <div class="pos-grid">
        <div><span>O'rtacha narx</span><b>${money(p.avg)}</b></div>
        <div><span>Xarajat</span><b>${money(p.cost)}</b></div>
        <div><span>Joriy qiymat</span><b>${money(p.value)}</b></div>
      </div>
      <div class="price-edit">
        <label>Joriy narx${p.manual ? ' *' : ''}</label>
        <input type="text" inputmode="decimal" value="${p.price}" data-price-coin="${p.coin}">
        <button class="btn primary sm" data-sell-coin="${p.coin}">Sotish</button>
      </div>
    </div>`).join('');

  el.querySelectorAll('[data-price-coin]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const v = num(inp.value);
      if (v > 0) { state.prices[inp.dataset.priceCoin] = v; save(); render(); }
    });
  });
  el.querySelectorAll('[data-sell-coin]').forEach((b) => {
    b.addEventListener('click', () => openModal('sell', b.dataset.sellCoin));
  });
}

/* --- Savdolar --- */
function renderTrades(r) {
  const q = $('searchTrades').value.trim().toUpperCase();
  const type = $('filterType').value;
  let list = [...r.sorted].reverse();
  if (q) list = list.filter((t) => t.coin.includes(q));
  if (type !== 'all') list = list.filter((t) => t.type === type);

  const el = $('tradesList');
  if (!list.length) {
    el.innerHTML = '<div class="empty">Savdo topilmadi.</div>';
    return;
  }
  el.innerHTML = list.map((t) => {
    const pnl = r.pnlById[t.id];
    return `<div class="card" style="margin-bottom:0">
      ${tradeRow(t, pnl)}
      <div class="row-actions" style="margin:8px 0 0">
        ${t.note ? `<span class="hint">💬 ${escapeHtml(t.note)}</span>` : ''}
        ${t.fee ? `<span class="hint">Komissiya: ${money(t.fee)}</span>` : ''}
        <button class="btn danger sm" data-del="${t.id}" style="margin-left:auto">O'chirish</button>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', () => {
      if (!confirm('Bu savdo o\'chirilsinmi?')) return;
      state.trades = state.trades.filter((t) => t.id != b.dataset.del);
      save(); render(); toast('O\'chirildi');
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* --- Statistika --- */
function renderStats(r) {
  const sells = r.sorted.filter((t) => t.type === 'sell');
  const pnls = sells.map((t) => r.pnlById[t.id] || 0);
  const wins = pnls.filter((p) => p >= 0);
  const losses = pnls.filter((p) => p < 0);
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  $('sClosed').textContent = sells.length;
  $('sWinrate').textContent = sells.length ? Math.round((wins.length / sells.length) * 100) + '%' : '—';
  $('sBest').textContent = pnls.length ? signed(Math.max(...pnls)) : '—';
  $('sWorst').textContent = pnls.length ? signed(Math.min(...pnls)) : '—';
  $('sAvgWin').textContent = wins.length ? signed(sum(wins) / wins.length) : '—';
  $('sAvgLoss').textContent = losses.length ? signed(sum(losses) / losses.length) : '—';

  const gross = sum(wins), loss = Math.abs(sum(losses));
  $('sPf').textContent = loss > 0 ? (gross / loss).toFixed(2) : (gross > 0 ? '∞' : '—');
  $('sPf').className = 'stat-value ' + (loss > 0 && gross / loss >= 1 ? 'pos' : loss > 0 ? 'neg' : '');
  $('sFees').textContent = money(r.fees);

  // oylar kesimida
  const months = {};
  for (const t of sells) {
    const m = t.date.slice(0, 7);
    months[m] = (months[m] || 0) + (r.pnlById[t.id] || 0);
  }
  const mk = Object.keys(months).sort().reverse();
  $('monthsList').innerHTML = mk.length ? mk.map((m) => {
    const [y, mo] = m.split('-');
    const names = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return `<div class="row">
      <div class="row-main"><div class="row-title">${names[+mo - 1]} ${y}</div></div>
      <div class="row-right"><div class="row-val ${cls(months[m])}">${signed(months[m])}</div></div>
    </div>`;
  }).join('') : '<div class="empty">Yopilgan savdo yo\'q.</div>';

  // coinlar kesimida
  const cs = Object.values(r.coins).filter((c) => c.sells > 0 || c.qty > 0);
  cs.sort((a, b) => b.realized - a.realized);
  $('coinStatsList').innerHTML = cs.length ? cs.map((c) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${c.coin}</div>
        <div class="row-sub">${c.buys} olish · ${c.sells} sotish${c.sells ? ' · ' + Math.round((c.wins / c.sells) * 100) + '% yutuq' : ''}</div>
      </div>
      <div class="row-right">
        <div class="row-val ${cls(c.realized)}">${signed(c.realized)}</div>
        <div class="row-sub">${c.qty > 0 ? 'ochiq: ' + qtyFmt(c.qty) : 'yopilgan'}</div>
      </div>
    </div>`).join('') : '<div class="empty">Ma\'lumot yo\'q.</div>';
}

function renderCoinList() {
  const coins = [...new Set(state.trades.map((t) => t.coin))].sort();
  $('coinList').innerHTML = coins.map((c) => `<option value="${c}">`).join('');
}

/* ---------------- navigatsiya ---------------- */

function goto(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach((p) => p.classList.add('hidden'));
  $('page-' + page).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.page === page));
  $('pageTitle').textContent = TITLES[page];
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => goto(t.dataset.page)));
document.querySelectorAll('[data-goto]').forEach((b) =>
  b.addEventListener('click', () => goto(b.dataset.goto)));

/* ---------------- savdo qo'shish modali ---------------- */

let formType = 'buy';

function openModal(type, coin) {
  formType = type || 'buy';
  document.querySelectorAll('.seg-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.type === formType));
  $('modalTitle').textContent = formType === 'buy' ? 'Sotib olish' : 'Sotish';
  $('tradeForm').reset();
  $('fDate').value = todayISO();
  $('fCoin').value = coin || '';
  $('formWarn').classList.add('hidden');
  updateSummary();
  $('tradeModal').classList.remove('hidden');
  if (!coin) setTimeout(() => $('fCoin').focus(), 120);
}

function closeModal() { $('tradeModal').classList.add('hidden'); }

$('btnAdd').addEventListener('click', () => openModal(currentPage === 'positions' ? 'sell' : 'buy'));
$('btnCloseModal').addEventListener('click', closeModal);
$('tradeModal').addEventListener('click', (e) => { if (e.target.id === 'tradeModal') closeModal(); });

document.querySelectorAll('.seg-btn').forEach((b) =>
  b.addEventListener('click', () => {
    formType = b.dataset.type;
    document.querySelectorAll('.seg-btn').forEach((x) =>
      x.classList.toggle('active', x === b));
    $('modalTitle').textContent = formType === 'buy' ? 'Sotib olish' : 'Sotish';
    updateSummary();
  }));

['fCoin', 'fPrice', 'fQty', 'fFee'].forEach((id) =>
  $(id).addEventListener('input', updateSummary));

function updateSummary() {
  const price = num($('fPrice').value);
  const qty = num($('fQty').value);
  const fee = num($('fFee').value);
  const coin = normCoin($('fCoin').value);
  const gross = price * qty;

  let txt;
  if (formType === 'buy') {
    txt = `Jami xarajat: <b>${money(gross + fee)}</b> USDT`;
  } else {
    txt = `Qo'lga tegadi: <b>${money(gross - fee)}</b> USDT`;
    const r = compute();
    const c = r.coins[coin];
    if (c && c.qty > 0 && qty > 0) {
      const avg = c.cost / c.qty;
      const pnl = (gross - fee) - avg * Math.min(qty, c.qty);
      txt += `<br>Taxminiy foyda: <b class="${cls(pnl)}">${signed(pnl)}</b> USDT
              <br><span class="small">O'rtacha tannarx: ${money(avg)}</span>`;
    }
  }
  $('formSummary').innerHTML = txt;

  // ogohlantirish: bor miqdordan ko'p sotish
  const w = $('formWarn');
  if (formType === 'sell' && coin && qty > 0) {
    const c = compute().coins[coin];
    const have = c ? c.qty : 0;
    if (qty > have + 1e-10) {
      w.textContent = `Diqqat: sizda ${coin} bo'yicha faqat ${qtyFmt(have)} dona bor.`;
      w.classList.remove('hidden');
      return;
    }
  }
  w.classList.add('hidden');
}

$('tradeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const coin = normCoin($('fCoin').value);
  const price = num($('fPrice').value);
  const qty = num($('fQty').value);
  const fee = num($('fFee').value);
  const date = $('fDate').value || todayISO();

  if (!coin) return toast('Coin nomini yozing');
  if (price <= 0) return toast('Narx 0 dan katta bo\'lsin');
  if (qty <= 0) return toast('Miqdor 0 dan katta bo\'lsin');

  if (formType === 'sell') {
    const c = compute().coins[coin];
    const have = c ? c.qty : 0;
    if (qty > have + 1e-10) {
      if (!confirm(`Sizda ${coin} bo'yicha ${qtyFmt(have)} dona bor, siz ${qtyFmt(qty)} sotmoqchisiz. Baribir saqlansinmi?`)) return;
    }
  }

  state.trades.push({
    id: Date.now(),
    type: formType,
    coin, price, qty, fee, date,
    note: $('fNote').value.trim()
  });
  save();
  closeModal();
  render();
  toast(formType === 'buy' ? 'Sotib olish qo\'shildi' : 'Sotish qo\'shildi');
});

/* ---------------- narxlarni yangilash (Binance, bepul) ---------------- */

$('btnRefreshPrices').addEventListener('click', async () => {
  const r = compute();
  if (!r.open.length) return toast('Ochiq pozitsiya yo\'q');
  const btn = $('btnRefreshPrices');
  btn.disabled = true;
  btn.textContent = '⟳ Yuklanmoqda...';
  let ok = 0;
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price');
    if (!res.ok) throw new Error('status ' + res.status);
    const all = await res.json();
    const map = {};
    for (const p of all) map[p.symbol] = parseFloat(p.price);
    for (const pos of r.open) {
      if (pos.coin === 'USDT') { state.prices.USDT = 1; ok++; continue; }
      const p = map[pos.coin + 'USDT'];
      if (p) { state.prices[pos.coin] = p; ok++; }
    }
    save(); render();
    toast(ok ? `${ok} ta narx yangilandi` : 'Mos juftlik topilmadi');
  } catch (e) {
    toast('Narxni olib bo\'lmadi — qo\'lda kiriting');
  } finally {
    btn.disabled = false;
    btn.textContent = '⟳ Narxlarni yangilash';
  }
});

/* ---------------- filtrlar ---------------- */

$('searchTrades').addEventListener('input', () => renderTrades(compute()));
$('filterType').addEventListener('change', () => renderTrades(compute()));

/* ---------------- sozlamalar ---------------- */

$('btnSettings').addEventListener('click', () => $('settingsModal').classList.remove('hidden'));
$('btnCloseSettings').addEventListener('click', () => $('settingsModal').classList.add('hidden'));
$('settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') e.currentTarget.classList.add('hidden');
});
$('version').textContent = 'Spot Jurnal v' + VERSION;

$('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `spot-jurnal-${todayISO()}.json`;
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
      if (!Array.isArray(s.trades)) throw new Error('format');
      if (!confirm(`${s.trades.length} ta savdo tiklansinmi? Hozirgi ma'lumot almashtiriladi.`)) return;
      state = { trades: s.trades, prices: s.prices || {} };
      save(); render();
      $('settingsModal').classList.add('hidden');
      toast('Tiklandi');
    } catch (err) {
      toast('Fayl noto\'g\'ri');
    }
  };
  rd.readAsText(f);
  e.target.value = '';
});

$('btnClear').addEventListener('click', () => {
  if (!confirm('HAMMA savdo o\'chiriladi. Ishonchingiz komilmi?')) return;
  if (!confirm('Oxirgi ogohlantirish — bu amalni qaytarib bo\'lmaydi!')) return;
  state = { trades: [], prices: {} };
  save(); render();
  $('settingsModal').classList.add('hidden');
  toast('Tozalandi');
});

/* ---------------- ishga tushirish ---------------- */

render();
goto('home');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').catch(() => {}));
}
