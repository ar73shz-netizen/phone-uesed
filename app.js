import { createLocalStore, createFirebaseStore, getFirebaseConfig, setFirebaseConfig, DEFAULT_BRANDS } from './store.js';

/* ---------- ابزارها ---------- */
const $ = (s, r = document) => r.querySelector(s);
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const faNum = (n) => Number(n).toLocaleString('fa-IR', { useGrouping: false });
const fmtPrice = (n) => Number(n || 0).toLocaleString('fa-IR');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fa2en = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const toNum = (s) => Number(fa2en(s).replace(/[^\d.]/g, '')) || 0;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const st = (i) => i.status || 'in';

function todayJalali() {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: g('year'), m: g('month'), d: g('day') };
}
const todayStr = () => { const t = todayJalali(); return `${t.y}/${String(t.m).padStart(2, '0')}/${String(t.d).padStart(2, '0')}`; };
function showDate(s, withYear = true) {
  if (!s) return '—';
  const [y, m, d] = s.split('/').map(Number);
  return `${faNum(d)} ${MONTHS[m - 1]}${withYear ? ' ' + faNum(y) : ''}`;
}

/* ---------- آیکون‌ها (SVG) ---------- */
const ICONS = {
  add: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  out: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  exit: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  back: '<path d="M9 6l6 6-6 6"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
};
const ic = (n, s = 18) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- رنگ برندها ---------- */
const BUILTIN_COLORS = { 'آیفون': '#39ff88', 'سامسونگ': '#29c7ff', 'شیائومی': '#ff8a1f' };
const EXTRA_COLORS = ['#ff3b4e', '#b45cff', '#ff4fd8', '#19f0d2', '#c6ff3d', '#5c7cff', '#ff6b9a', '#00e5a8'];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const brandColor = (b) => BUILTIN_COLORS[b] || state.colors?.[b] || EXTRA_COLORS[hash(b) % EXTRA_COLORS.length];
const colorStyle = (c) => `--c:${c};--cg:${c}66;`;
function pickColor() {
  const used = new Set([...Object.values(BUILTIN_COLORS), ...Object.values(state.colors || {})]);
  const free = EXTRA_COLORS.filter((c) => !used.has(c));
  const pool = free.length ? free : EXTRA_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- تعریف فیلدها ---------- */
const HEADING = { t: 'heading', l: 'مشخصات' };
const CODE = { k: 'code', l: 'کد کالا', req: 1, ltr: 1, ph: 'مثلاً 1001' };
const IPHONE_FIELDS = [
  HEADING, CODE,
  { k: 'model', l: 'مدل', ph: 'مثلاً iPhone 15 Pro Max', req: 1 },
  { k: 'storage', l: 'حافظه', list: ['64', '128', '256', '512', '1TB'] },
  { k: 'partNumber', l: 'پارت نامبر', ltr: 1, ph: 'MTUW3' },
  { k: 'battery', l: 'سلامت باتری (٪)', t: 'num' },
  { k: 'cycle', l: 'سایکل', t: 'cycle' },
  { k: 'series', l: 'سری' },
  { k: 'color', l: 'رنگ' },
  { k: 'imei', l: 'IMEI', t: 'imei' },
  { k: 'desc', l: 'توضیحات گوشی', t: 'area' },
  { k: 'buyDate', l: 'تاریخ خرید', t: 'date' },
  { k: 'buyPrice', l: 'قیمت خرید (تومان)', t: 'price' },
  { k: 'sellPrice', l: 'قیمت فروش (تومان)', t: 'price' },
  { k: 'buyNote', l: 'توضیحات خرید', t: 'area' },
  { k: 'ownership', l: 'وضعیت مالکیت', ph: 'مثلاً ملک فروشگاه، امانی از ...' },
];
const OTHER_FIELDS = [
  HEADING, CODE,
  { k: 'model', l: 'مدل', ph: 'مثلاً Galaxy S24 Ultra', req: 1 },
  { k: 'ram', l: 'رم', list: ['2', '3', '4', '6', '8', '12', '16'] },
  { k: 'storage', l: 'حافظه', list: ['32', '64', '128', '256', '512', '1TB'] },
  { k: 'color', l: 'رنگ' },
  { k: 'imei', l: 'IMEI', t: 'imei' },
  { k: 'desc', l: 'توضیحات', t: 'area' },
  { k: 'buyDate', l: 'تاریخ خرید', t: 'date' },
  { k: 'buyPrice', l: 'قیمت خرید (تومان)', t: 'price' },
  { k: 'sellPrice', l: 'قیمت فروش (تومان)', t: 'price' },
  { k: 'buyNote', l: 'توضیحات خرید', t: 'area' },
  { k: 'ownership', l: 'وضعیت مالکیت', ph: 'مثلاً ملک فروشگاه، امانی از ...' },
];
const isIphone = (b) => b === 'آیفون';
const fieldsFor = (b) => (isIphone(b) ? IPHONE_FIELDS : OTHER_FIELDS);
function splitFields(brand) {
  const list = fieldsFor(brand).filter((f) => f.t !== 'heading');
  const di = list.findIndex((f) => f.k === 'desc');
  return { main: list.slice(0, di + 1), more: list.slice(di + 1) };
}
const fieldLabel = (f) => f.l.replace(/\s*\(.*\)$/, '');

/* ---------- هزینه و تعمیرات ---------- */
const repairSum = (it) => (it.repairs || []).reduce((s, r) => s + (r.cost || 0), 0);
const costOf = (it) => (it.buyPrice || 0) + repairSum(it);

/* ---------- مشخصات به‌صورت متن ساده ---------- */
function fmtField(it, f, v) {
  if (f.t === 'date') return showDate(v);
  if (f.k === 'buyPrice') {
    const r = repairSum(it);
    return r ? `${fmtPrice(v)} + ${fmtPrice(r)} (تعمیرات) = ${fmtPrice(v + r)} تومان` : `${fmtPrice(v)} تومان`;
  }
  if (f.t === 'price') return `${fmtPrice(v)} تومان`;
  if (f.k === 'battery') return /^\d+(\.\d+)?$/.test(v) ? `${faNum(v)}٪` : String(v);
  if (['storage', 'ram'].includes(f.k)) return /^\d+$/.test(v) ? `${faNum(v)} گیگ` : String(v);
  if (f.k === 'cycle') return /^\d+$/.test(v) ? faNum(v) : String(v);
  if (f.t === 'imei') return v.join('\n');
  return String(v);
}
function pairs(it, part, skip = []) {
  const { main, more } = splitFields(it.brand);
  const fs = (part === 'main' ? main : more).filter((f) => !['model', 'sellPrice', ...skip].includes(f.k));
  const out = [];
  for (const f of fs) {
    const v = it[f.k];
    const empty = v === '' || v == null || v === 0 || (Array.isArray(v) && !v.length);
    if (empty && !(f.k === 'buyPrice' && repairSum(it))) continue;
    out.push([fieldLabel(f), fmtField(it, f, v || 0)]);
  }
  if (part === 'more' && it.repairs?.length) {
    out.push(['تعمیرات انجام‌شده', it.repairs.map((r) => `${r.desc}${r.cost ? ` — ${fmtPrice(r.cost)} تومان` : ''}`).join('\n')]);
  }
  return out;
}

/* ---------- وضعیت برنامه ---------- */
let store, state = { items: [], brands: DEFAULT_BRANDS, colors: {} };
let user = null;
const ui = {
  tab: 'in', entryBrand: null, brandFilter: 'all', minP: '', maxP: '', q: '',
  outYear: null, outMonth: null, editId: null, dirty: false,
  expanded: new Set(), shareMode: false, sel: new Set(),
};

/* ---------- راه‌اندازی ---------- */
async function boot() {
  const cfg = getFirebaseConfig();
  if (cfg) {
    try {
      store = await createFirebaseStore(cfg);
      store.onAuth((u) => { user = u; if (!u) render(); else attach(); });
      render();
      return;
    } catch (e) { console.error(e); alert('اتصال آنلاین برقرار نشد؛ برنامه در حالت محلی باز می‌شود.'); }
  }
  store = createLocalStore();
  attach();
}
let attached = false;
function attach() {
  if (attached) return; attached = true;
  store.subscribe((s, changes) => {
    state = s;
    changes.forEach(announce);
    if (ui.tab === 'in' && ui.dirty) { $('.nav').innerHTML = navInner(); bindNav(); return; } // فرم نیمه‌پر پاک نشود
    render();
  });
}
function announce(c) {
  const it = c.item; const name = `${it.brand} ${it.model || ''}`;
  const who = it.updatedBy ? ` (${it.updatedBy.split('@')[0]})` : '';
  if (c.type === 'added') toast(`📥 ورود جدید: ${name}${who}`, true);
  else if (c.type === 'removed') toast(`🗑 حذف شد: ${name}`, true);
  else if (it.status === 'out') toast(`📤 خروج کالا: ${name}${who}`, true);
  else if (it.status === 'repair') toast(`🛠 به تعمیر رفت: ${name}${who}`, true);
  else toast(`✏️ به‌روزرسانی: ${name}${who}`, true);
}
function toast(msg, live) {
  const el = document.createElement('div');
  el.className = 'toast' + (live ? ' live' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------- رندر اصلی ---------- */
function navInner() {
  const inStock = state.items.filter((i) => st(i) === 'in').length;
  const inRepair = state.items.filter((i) => st(i) === 'repair').length;
  const tabs = [['in', 'add', 'ورود کالا'], ['stock', 'box', 'موجودی', inStock], ['repair', 'wrench', 'در حال تعمیر', inRepair], ['out', 'out', 'خروجی'], ['set', 'sliders', 'تنظیمات']];
  return tabs.map(([k, icon, l, n]) => `<button data-tab="${k}" class="${ui.tab === k ? 'act' : ''}">${ic(icon, 22)}${l}${n ? `<span class="badge">${faNum(n)}</span>` : ''}</button>`).join('');
}
function bindNav() {
  document.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => {
    ui.tab = b.dataset.tab; ui.editId = null; ui.outMonth = null; ui.shareMode = false; ui.sel.clear();
    render(); window.scrollTo(0, 0);
  });
}
function render() {
  ui.dirty = false;
  const app = $('#app');
  if (store.needsAuth && !user) return (app.innerHTML = loginView(), bindLogin());
  const titles = { in: ui.editId ? 'ویرایش گوشی' : 'ورود کالا', stock: 'موجودی', repair: 'در حال تعمیر', out: 'کالاهای خروجی', set: 'تنظیمات و پشتیبان' };
  const body = { in: entryView, stock: stockView, repair: repairView, out: outView, set: settingsView }[ui.tab]();
  app.innerHTML = `
    <header class="topbar"><div class="brandbar"><img class="logo" src="logo.png" alt=""><span class="appname">Rasa used phone</span></div>
      <div class="status"><span class="dot ${store.mode === 'online' ? 'on' : ''}"></span>${store.mode === 'online' ? 'آنلاین' : 'محلی'}</div></header>
    <main class="wrap"><h1 class="ptitle">${titles[ui.tab]}</h1>${body}</main>
    <nav class="nav">${navInner()}</nav>`;
  bindNav();
  ({ in: bindEntry, stock: bindStock, repair: bindRepair, out: bindOut, set: bindSettings })[ui.tab]();
}

/* ---------- ورود به سیستم ---------- */
function loginView() {
  return `<div class="login card"><img class="logo" src="logo.png" alt=""><h2 class="title" style="text-align:center">ورود کارکنان</h2>
    <label class="f"><span>ایمیل</span><input type="email" id="em" class="ltr" autocomplete="username"></label>
    <label class="f"><span>رمز عبور</span><input type="password" id="pw" class="ltr" autocomplete="current-password"></label>
    <button class="btn block" id="go">ورود</button>
    <p class="hint">حساب‌ها را مدیر در بخش Authentication فایربیس می‌سازد.</p>
    <button class="btn sec sm block" id="local">بازگشت به حالت محلی</button></div>`;
}
function bindLogin() {
  $('#go').onclick = async () => {
    try { await store.login($('#em').value.trim(), $('#pw').value); } catch { toast('ایمیل یا رمز عبور درست نیست'); }
  };
  $('#local').onclick = () => { setFirebaseConfig(null); location.reload(); };
}

/* ---------- فرم داینامیک ---------- */
function dateWidget(k, val) {
  const t = todayJalali();
  const [y, m, d] = (val || todayStr()).split('/').map(Number);
  const years = []; for (let i = t.y - 6; i <= t.y + 1; i++) years.push(i);
  return `<div class="dates" data-date="${k}">
    <select aria-label="روز">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${i + 1 === d ? 'selected' : ''}>${faNum(i + 1)}</option>`).join('')}</select>
    <select aria-label="ماه">${MONTHS.map((n, i) => `<option value="${i + 1}" ${i + 1 === m ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <select aria-label="سال">${years.map((yy) => `<option value="${yy}" ${yy === y ? 'selected' : ''}>${faNum(yy)}</option>`).join('')}</select></div>`;
}
function readDate(root, k) {
  const [d, m, y] = [...$(`[data-date="${k}"]`, root).querySelectorAll('select')].map((s) => Number(s.value));
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}
const imeiRow = (v) => `<div class="row imei-row"><input type="text" inputmode="numeric" class="ltr imei" maxlength="17" value="${esc(v)}" placeholder="شماره IMEI"><button type="button" class="btn sm sec rm-imei" aria-label="حذف IMEI">${ic('x', 16)}</button></div>`;
function suggestCode() {
  const nums = state.items.map((i) => String(i.code || '')).filter((c) => /^\d+$/.test(c)).map(Number);
  return String(nums.length ? Math.max(...nums) + 1 : 1001);
}
function fieldHtml(f, v) {
  const id = `f_${f.k}`;
  if (f.t === 'heading') return `<h3 class="sec">${f.l}</h3>`;
  if (f.t === 'date') return `<label class="f"><span>${f.l}</span>${dateWidget(f.k, v)}</label>`;
  if (f.t === 'imei') {
    const list = v && v.length ? v : [''];
    return `<div class="f"><span class="lab">${f.l}</span><div id="imeis">${list.map(imeiRow).join('')}</div>
      <button type="button" class="btn sm sec" id="addImei">${ic('plus', 16)} افزودن IMEI دیگر</button></div>`;
  }
  if (f.t === 'cycle') {
    return `<label class="f"><span>${f.l}</span><div class="inline"><input type="text" id="${id}" value="${esc(v)}" placeholder="عدد یا ندارد">
      <button type="button" class="btn sm sec" data-quick="ندارد" data-k="${f.k}">ندارد</button></div></label>`;
  }
  let inner;
  if (f.t === 'area') inner = `<textarea id="${id}">${esc(v)}</textarea>`;
  else if (f.t === 'price') inner = `<input type="text" inputmode="numeric" id="${id}" class="ltr price" value="${v ? Number(v).toLocaleString('en-US') : ''}">`;
  else if (f.t === 'num') inner = `<input type="text" inputmode="numeric" id="${id}" class="ltr" value="${esc(v)}">`;
  else inner = `<input type="text" id="${id}" class="${f.ltr ? 'ltr' : ''}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${f.list ? `list="dl_${f.k}"` : ''}>${f.list ? `<datalist id="dl_${f.k}">${f.list.map((o) => `<option value="${o}">`).join('')}</datalist>` : ''}`;
  return `<label class="f"><span>${f.l}${f.req ? ' *' : ''}</span>${inner}</label>`;
}
function bindPriceInputs(root) {
  root.querySelectorAll('.price').forEach((el) => el.addEventListener('input', () => {
    const n = toNum(el.value); el.value = n ? n.toLocaleString('en-US') : '';
  }));
}
function readForm(root, brand) {
  const out = {};
  for (const f of fieldsFor(brand)) {
    if (f.t === 'heading') continue;
    if (f.t === 'date') out[f.k] = readDate(root, f.k);
    else if (f.t === 'price') out[f.k] = toNum($(`#f_${f.k}`, root).value);
    else if (f.t === 'imei') out[f.k] = [...root.querySelectorAll('.imei')].map((i) => fa2en(i.value).replace(/\D/g, '')).filter(Boolean);
    else if (f.t === 'num') out[f.k] = fa2en($(`#f_${f.k}`, root).value).replace(/[^\d.]/g, '');
    else out[f.k] = fa2en($(`#f_${f.k}`, root).value.trim());
  }
  return out;
}

/* ---------- ورود کالا ---------- */
function brandChips(selected) {
  return `<div class="chips">${state.brands.map((b) => `<button class="chip ${b === selected ? 'act' : ''}" style="${colorStyle(brandColor(b))}" data-brand="${esc(b)}">${esc(b)}</button>`).join('')}<button class="chip add" id="addBrand">+ برند جدید</button><button class="chip add" id="manageBrands">حذف / مدیریت برندها</button></div>`;
}
function entryView() {
  if (ui.editId) return editView();
  const b = ui.entryBrand;
  return `${brandChips(b)}
    ${b ? `<form id="entryForm" class="card">${fieldsFor(b).map((f) => fieldHtml(f, f.k === 'code' ? suggestCode() : '')).join('')}
      <button class="btn block" type="submit">ثبت ورود ${esc(b)}</button></form>` : `<div class="empty">${ic('add', 36)}برند گوشی را انتخاب کنید تا فرم ورود باز شود.</div>`}`;
}
function editView() {
  const it = state.items.find((x) => x.id === ui.editId);
  if (!it) { ui.editId = null; return entryView(); }
  return `<form id="entryForm" class="card">${fieldsFor(it.brand).map((f) => fieldHtml(f, it[f.k])).join('')}
      <div class="row"><button class="btn" type="submit">ذخیره تغییرات</button>
      <button class="btn sec" type="button" id="cancelEdit">انصراف</button></div>
      <button class="btn danger sm block" type="button" id="delItem" style="margin-top:14px">حذف این گوشی</button></form>`;
}
async function addBrandFlow() {
  const name = (prompt('نام برند جدید را وارد کنید:') || '').trim();
  if (!name) return;
  if (state.brands.includes(name)) return toast('این برند قبلاً ثبت شده است');
  await store.saveBrands([...state.brands, name], { ...(state.colors || {}), [name]: pickColor() });
  ui.entryBrand = name; render();
}

function manageBrandsSheet() {
  const counts = {};
  state.items.forEach((i) => { counts[i.brand] = (counts[i.brand] || 0) + 1; });
  const root = openModal(`<h3>مدیریت برندها</h3>
    <p class="hint">برندی که هیچ گوشی (موجود، تعمیری یا خروجی) ندارد قابل حذف است. برند جدید را هم می‌توانید دوباره اضافه کنید.</p>
    <div>${state.brands.map((b) => `<div class="brow" style="${colorStyle(brandColor(b))}"><span class="bn">${esc(b)}</span>${counts[b]
      ? `<small>${faNum(counts[b])} گوشی ثبت شده</small>`
      : `<button class="btn danger sm" data-delbrand="${esc(b)}">حذف</button>`}</div>`).join('') || '<div class="empty">برندی وجود ندارد.</div>'}</div>
    <button class="btn sec block" id="closeBrands" style="margin-top:8px">بستن</button>`);
  $('#closeBrands', root).onclick = closeModal;
  root.querySelectorAll('[data-delbrand]').forEach((btn) => btn.onclick = async () => {
    const name = btn.dataset.delbrand;
    if (!confirm(`برند «${name}» حذف شود؟`)) return;
    const colors = { ...(state.colors || {}) }; delete colors[name];
    await store.saveBrands(state.brands.filter((b) => b !== name), colors);
    if (ui.entryBrand === name) ui.entryBrand = null;
    toast('برند حذف شد');
    render(); manageBrandsSheet();
  });
}
function bindEntry() {
  document.querySelectorAll('[data-brand]').forEach((b) => b.onclick = () => { ui.entryBrand = b.dataset.brand; render(); });
  $('#addBrand') && ($('#addBrand').onclick = addBrandFlow);
  $('#manageBrands') && ($('#manageBrands').onclick = manageBrandsSheet);
  const form = $('#entryForm'); if (!form) return;
  bindPriceInputs(form);
  form.addEventListener('input', (e) => {
    ui.dirty = true;
    if (e.target.classList.contains('imei')) e.target.value = fa2en(e.target.value).replace(/\D/g, '');
  });
  form.addEventListener('click', (e) => {
    if (e.target.closest('#addImei')) {
      $('#imeis', form).insertAdjacentHTML('beforeend', imeiRow('')); ui.dirty = true;
      [...form.querySelectorAll('.imei')].pop().focus();
    }
    const rm = e.target.closest('.rm-imei');
    if (rm) {
      const rows = form.querySelectorAll('.imei-row');
      if (rows.length > 1) rm.closest('.imei-row').remove(); else rows[0].querySelector('input').value = '';
    }
    const q = e.target.closest('[data-quick]');
    if (q) { $(`#f_${q.dataset.k}`, form).value = q.dataset.quick; ui.dirty = true; }
  });
  $('#cancelEdit') && ($('#cancelEdit').onclick = () => { ui.editId = null; ui.tab = 'stock'; render(); });
  $('#delItem') && ($('#delItem').onclick = async () => {
    if (!confirm('این گوشی برای همیشه حذف شود؟')) return;
    await store.deleteItem(ui.editId); ui.editId = null; ui.tab = 'stock'; render();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const existing = ui.editId && state.items.find((x) => x.id === ui.editId);
    const brand = existing ? existing.brand : ui.entryBrand;
    const vals = readForm(form, brand);
    if (!vals.code) return toast('کد کالا را وارد کنید');
    if (!vals.model) return toast('مدل گوشی را وارد کنید');
    const dup = state.items.find((x) => x.id !== existing?.id && String(x.code || '').toLowerCase() === vals.code.toLowerCase());
    if (dup) return toast(`کد کالا تکراری است (${dup.brand} ${dup.model || ''})`);
    const item = existing ? { ...existing, ...vals } : { id: uid(), brand, status: 'in', sale: null, repairs: [], createdAt: Date.now(), ...vals };
    if (!existing || existing.sellPrice !== vals.sellPrice) item.sellPriceDate = todayStr();
    await store.saveItem(item);
    toast(existing ? '✅ تغییرات ذخیره شد' : '✅ گوشی وارد انبار شد');
    ui.editId = null; ui.dirty = false;
    if (existing) ui.tab = 'stock'; else ui.entryBrand = brand;
    render();
  };
}

/* ---------- کارت گوشی ---------- */
const kvHtml = (arr, cls = '') => (arr.length
  ? `<dl class="kv ${cls}">${arr.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v).replace(/\n/g, '<br>')}</dd>`).join('')}</dl>` : '');
function phoneCard(it, mode) {
  const c = brandColor(it.brand);
  const sale = it.sale;
  const exp = mode !== 'stock' || ui.expanded.has(it.id);
  const main = pairs(it, 'main'), more = pairs(it, 'more');
  let tag;
  if (mode === 'out') tag = `<div class="lbl">قیمت نهایی</div><div class="price">${fmtPrice(sale.finalPrice)}</div><div class="unit">تومان</div><div class="when">${showDate(sale.date)}</div>`;
  else tag = `<div class="lbl">قیمت فروش</div><div class="price">${it.sellPrice ? fmtPrice(it.sellPrice) : '—'}</div><div class="unit">تومان</div><div class="when">آخرین تغییر قیمت<br>${showDate(it.sellPriceDate, false)}</div>`;

  let html = `<div class="head"><span class="brand">${esc(it.brand)}</span><span class="model">${esc(it.model)}</span>
    ${mode === 'stock' && ui.shareMode ? `<input type="checkbox" class="sel" data-sel="${it.id}" ${ui.sel.has(it.id) ? 'checked' : ''} aria-label="انتخاب">` : ''}</div>`;
  if (mode === 'repair') html += `<div class="issue"><b>مشکل گوشی:</b> ${esc(it.repairIssue || '—').replace(/\n/g, '<br>')}<br><small>ورود به تعمیر: ${showDate(it.repairSince)}</small></div>`;
  html += kvHtml(main);
  if (mode === 'stock') {
    html += `<button class="link" data-more="${it.id}">${exp ? `کمتر ${ic('up', 16)}` : `بیشتر ${ic('down', 16)}`}</button>`;
  }
  if (exp) {
    html += kvHtml(more, 'more');
    if (mode === 'out') {
      const profit = sale.finalPrice - costOf(it);
      html += kvHtml([['خریدار', sale.buyer]], 'more');
      html += `<dl class="kv"><dt>سود نقدی</dt><dd class="profit ${profit >= 0 ? 'pos' : 'neg'}">${fmtPrice(profit)} تومان</dd></dl>`;
    }
    if (mode === 'stock') html += `<label class="chk"><input type="checkbox" data-repair="${it.id}"><span>نیاز به تعمیر</span></label>`;
    if (mode === 'repair') html += `<label class="chk fix"><input type="checkbox" data-fixed="${it.id}"><span>تعمیر شد</span></label>`;
  }
  if (mode === 'stock') html += `<div class="actions"><button class="btn sm" data-exit="${it.id}">${ic('exit', 16)} خروج کالا</button>
    <button class="btn sm sec" data-share="${it.id}">${ic('share', 16)} اشتراک</button><button class="btn sm sec" data-edit="${it.id}">${ic('edit', 16)} ویرایش</button></div>`;
  if (mode === 'out') html += `<div class="actions"><button class="btn sm sec" data-undo="${it.id}">${ic('undo', 16)} بازگشت به موجودی</button></div>`;
  return `<article class="phone ${mode === 'stock' ? '' : mode}" style="${colorStyle(c)}"><div class="body">${html}</div><div class="tagcol">${tag}</div></article>`;
}

/* ---------- موجودی ---------- */
function stockList() {
  const list = state.items.filter((i) => st(i) === 'in');
  const min = toNum(ui.minP), max = toNum(ui.maxP), q = fa2en(ui.q).trim().toLowerCase();
  return list.filter((i) =>
    (ui.brandFilter === 'all' || i.brand === ui.brandFilter) &&
    (!min || (i.sellPrice || 0) >= min) && (!max || (i.sellPrice || 0) <= max) &&
    (!q || `${i.model} ${i.color || ''} ${i.partNumber || ''} ${i.code || ''} ${(i.imei || []).join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt - a.createdAt);
}
function stockListHtml() {
  const total = state.items.filter((i) => st(i) === 'in').length;
  const shown = stockList();
  const toolbar = ui.shareMode
    ? `<div class="toolbar"><button class="btn sm sec" id="selAll">انتخاب همه</button>
        <button class="btn sm green" id="shareSel">${ic('share', 16)} اشتراک‌گذاری (${faNum(ui.sel.size)})</button>
        <button class="btn sm sec" id="selCancel">لغو</button></div>`
    : `<div class="toolbar"><span class="hint grow">${faNum(shown.length)} گوشی از ${faNum(total)} گوشی موجود</span>
        ${shown.length ? `<button class="btn sm blue" id="selMode">${ic('share', 16)} اشتراک چند گوشی</button>` : ''}</div>`;
  return `${toolbar}${shown.length ? shown.map((i) => phoneCard(i, 'stock')).join('') : `<div class="empty">${ic('box', 36)}گوشی‌ای با این فیلتر پیدا نشد.</div>`}`;
}
function stockView() {
  const list = state.items.filter((i) => st(i) === 'in');
  const brands = [...new Set([...state.brands, ...list.map((i) => i.brand)])];
  return `<div class="chips"><button class="chip ${ui.brandFilter === 'all' ? 'act' : ''}" data-bf="all">همه</button>
      ${brands.map((b) => `<button class="chip ${ui.brandFilter === b ? 'act' : ''}" style="${colorStyle(brandColor(b))}" data-bf="${esc(b)}">${esc(b)}</button>`).join('')}</div>
    <div class="filters"><input type="text" inputmode="numeric" class="ltr price" id="minP" placeholder="قیمت فروش از" value="${ui.minP}">
      <input type="text" inputmode="numeric" class="ltr price" id="maxP" placeholder="تا" value="${ui.maxP}">
      <input type="text" class="full" id="q" placeholder="جستجو: مدل، رنگ، کد کالا، IMEI" value="${esc(ui.q)}"></div>
    <div id="stockList">${stockListHtml()}</div>`;
}
function refreshStock() { $('#stockList').innerHTML = stockListHtml(); bindStockList(); }
function bindStock() {
  document.querySelectorAll('[data-bf]').forEach((b) => b.onclick = () => { ui.brandFilter = b.dataset.bf; render(); });
  bindPriceInputs(document);
  const live = (id, key) => $('#' + id).addEventListener('input', (e) => { ui[key] = e.target.value; refreshStock(); });
  live('minP', 'minP'); live('maxP', 'maxP'); live('q', 'q');
  bindStockList();
}
function bindStockList() {
  const r = $('#stockList');
  r.querySelectorAll('[data-more]').forEach((b) => b.onclick = () => {
    const id = b.dataset.more; ui.expanded.has(id) ? ui.expanded.delete(id) : ui.expanded.add(id); refreshStock();
  });
  r.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => { ui.editId = b.dataset.edit; ui.tab = 'in'; render(); window.scrollTo(0, 0); });
  r.querySelectorAll('[data-exit]').forEach((b) => b.onclick = () => exitSheet(b.dataset.exit));
  r.querySelectorAll('[data-share]').forEach((b) => b.onclick = () => shareSheet([b.dataset.share]));
  r.querySelectorAll('[data-repair]').forEach((cb) => cb.onchange = () => { cb.checked = false; askNeedRepair(cb.dataset.repair); });
  r.querySelectorAll('[data-sel]').forEach((cb) => cb.onchange = () => {
    cb.checked ? ui.sel.add(cb.dataset.sel) : ui.sel.delete(cb.dataset.sel);
    const btn = $('#shareSel'); if (btn) btn.innerHTML = `${ic('share', 16)} اشتراک‌گذاری (${faNum(ui.sel.size)})`;
  });
  $('#selMode') && ($('#selMode').onclick = () => { ui.shareMode = true; ui.sel.clear(); refreshStock(); });
  $('#selCancel') && ($('#selCancel').onclick = () => { ui.shareMode = false; ui.sel.clear(); refreshStock(); });
  $('#selAll') && ($('#selAll').onclick = () => { stockList().forEach((i) => ui.sel.add(i.id)); refreshStock(); });
  $('#shareSel') && ($('#shareSel').onclick = () => shareSheet([...ui.sel]));
}

/* ---------- اشتراک‌گذاری ---------- */
const DISCLAIMER = '(قیمت‌های فروش درج‌شده قطعی نیست؛ لطفاً برای اطلاع از قیمت قطعی استعلام بگیرید)';
function shareText(items) {
  const blocks = items.map((it) => {
    const lines = [`📱 ${it.brand} ${it.model}`];
    pairs(it, 'main', ['imei']).forEach(([l, v]) => lines.push(`${l}: ${v.replace(/\n/g, ' / ')}`));
    lines.push(`💰 قیمت فروش: ${it.sellPrice ? `${fmtPrice(it.sellPrice)} تومان` : 'استعلام بگیرید'}`);
    return lines.join('\n');
  });
  return `${blocks.join('\n\n— — — — —\n\n')}\n\n${DISCLAIMER}`;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* ادامه */ }
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
  const ok = document.execCommand('copy'); ta.remove(); return ok;
}
function shareSheet(ids) {
  const items = ids.map((id) => state.items.find((x) => x.id === id)).filter(Boolean);
  if (!items.length) return toast('گوشی‌ای انتخاب نشده است');
  const root = openModal(`<h3>پیام اشتراک‌گذاری (قابل ویرایش)</h3>
    <textarea id="msg" class="msg">${esc(shareText(items))}</textarea>
    <button class="btn green block" id="doShare">${ic('share', 18)} اشتراک‌گذاری (انتخاب برنامه)</button>
    <div class="sharegrid">
      <a class="btn sm wa" id="shWa" target="_blank" rel="noopener">واتساپ</a>
      <a class="btn sm tg" id="shTg" target="_blank" rel="noopener">تلگرام</a>
      <a class="btn sm sms" id="shSms" target="_blank" rel="noopener">پیامک</a>
      <button class="btn sm sec" id="doCopy">کپی متن</button>
    </div>
    <button class="btn sec sm block" id="cancel" style="margin-top:10px">بستن</button>`);
  const ta = $('#msg', root);
  const links = () => {
    const t = encodeURIComponent(ta.value);
    $('#shWa', root).href = `https://wa.me/?text=${t}`;
    $('#shTg', root).href = `https://t.me/share/url?url=%20&text=${t}`;
    $('#shSms', root).href = `sms:?body=${t}`;
  };
  links(); ta.addEventListener('input', links);
  $('#cancel', root).onclick = closeModal;
  $('#doCopy', root).onclick = async () => toast((await copyText(ta.value)) ? 'متن کپی شد' : 'کپی انجام نشد');
  $('#doShare', root).onclick = async () => {
    const text = ta.value, cap = window.Capacitor;
    const native = !!cap?.isNativePlatform?.();
    try {
      if (native) { await cap.registerPlugin('Share').share({ text, dialogTitle: 'اشتراک‌گذاری' }); return; }
      if (navigator.share) { await navigator.share({ text }); return; }
      throw new Error('unsupported');
    } catch (e) {
      if (/cancel|abort/i.test(`${e?.name} ${e?.message}`)) return;
      if (native && navigator.share) { try { await navigator.share({ text }); return; } catch { /* ادامه */ } }
      toast('اشتراک مستقیم در این دستگاه در دسترس نیست؛ از دکمه‌های واتساپ، تلگرام یا پیامک استفاده کنید');
    }
  };
}

/* ---------- پنجره‌ها ---------- */
function openModal(html, center) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay ${center ? 'mid' : ''}"><div class="sheet ${center ? 'center' : ''}">${html}</div></div>`;
  return root;
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };

/* ---------- خروج کالا ---------- */
function exitSheet(id) {
  const it = state.items.find((x) => x.id === id); if (!it) return;
  const root = openModal(`<h3>خروج کالا: ${esc(it.brand)} ${esc(it.model)}</h3>
    <label class="f"><span>نام و نام خانوادگی خریدار *</span><input type="text" id="buyer"></label>
    <label class="f"><span>تاریخ فروش</span>${dateWidget('sdate', todayStr())}</label>
    <label class="f"><span>قیمت نهایی (تومان) *</span><input type="text" inputmode="numeric" id="final" class="ltr price" value="${it.sellPrice ? Number(it.sellPrice).toLocaleString('en-US') : ''}"></label>
    <div class="row"><button class="btn" id="next">ثبت خروج</button><button class="btn sec" id="cancel">انصراف</button></div>`);
  bindPriceInputs(root);
  $('#cancel', root).onclick = closeModal;
  $('#next', root).onclick = () => {
    const buyer = $('#buyer', root).value.trim(), finalPrice = toNum($('#final', root).value), date = readDate(root, 'sdate');
    if (!buyer || !finalPrice) return toast('نام خریدار و قیمت نهایی را وارد کنید');
    openModal(`<h3>آیا از خروج کالا مطمئن هستید؟</h3>
      <p>${esc(it.brand)} ${esc(it.model)} به <b>${esc(buyer)}</b> با قیمت <b>${fmtPrice(finalPrice)}</b> تومان</p>
      <div class="row"><button class="btn green" id="yes">بله</button><button class="btn sec" id="no">خیر</button></div>`, true);
    $('#no').onclick = closeModal;
    $('#yes').onclick = async () => {
      await store.saveItem({ ...it, status: 'out', sale: { buyer, date, finalPrice } });
      closeModal(); toast('📤 گوشی به کالاهای خروجی منتقل شد');
    };
  };
}

/* ---------- نیاز به تعمیر ---------- */
function askNeedRepair(id) {
  const it = state.items.find((x) => x.id === id); if (!it) return;
  openModal(`<h3>آیا مطمئن هستید گوشی نیاز به تعمیر دارد؟</h3><p>${esc(it.brand)} ${esc(it.model)}</p>
    <div class="row"><button class="btn orange" id="yes">بله</button><button class="btn sec" id="no">خیر</button></div>`, true);
  $('#no').onclick = closeModal;
  $('#yes').onclick = () => {
    const root = openModal(`<h3>مشکلات گوشی چیست؟</h3>
      <label class="f"><span>توضیح مشکل *</span><textarea id="issue" placeholder="مثلاً: ال‌سی‌دی خط دارد، شارژ نمی‌شود"></textarea></label>
      <div class="row"><button class="btn orange" id="ok">تایید و انتقال به تعمیر</button><button class="btn sec" id="cancel">انصراف</button></div>`);
    $('#cancel', root).onclick = closeModal;
    $('#ok', root).onclick = async () => {
      const issue = $('#issue', root).value.trim();
      if (!issue) return toast('مشکل گوشی را بنویسید');
      await store.saveItem({ ...it, status: 'repair', repairIssue: issue, repairSince: todayStr() });
      closeModal(); toast('🛠 گوشی به بخش «در حال تعمیر» رفت');
    };
  };
}

/* ---------- در حال تعمیر ---------- */
function repairView() {
  const list = state.items.filter((i) => st(i) === 'repair').sort((a, b) => (b.repairSince || '').localeCompare(a.repairSince || ''));
  if (!list.length) return `<div class="empty">${ic('wrench', 36)}گوشی‌ای در حال تعمیر نیست.</div>`;
  return `<p class="hint">${faNum(list.length)} گوشی در حال تعمیر</p>${list.map((i) => phoneCard(i, 'repair')).join('')}`;
}
function bindRepair() {
  document.querySelectorAll('[data-fixed]').forEach((cb) => cb.onchange = () => { cb.checked = false; fixedSheet(cb.dataset.fixed); });
}
function fixedSheet(id) {
  const it = state.items.find((x) => x.id === id); if (!it) return;
  const root = openModal(`<h3>تعمیر شد: ${esc(it.brand)} ${esc(it.model)}</h3>
    <label class="f"><span>تعمیرات صورت‌گرفته *</span><textarea id="rdesc" placeholder="مثلاً: تعویض ال‌سی‌دی"></textarea></label>
    <label class="f"><span>مبلغ تعمیرات (تومان)</span><input type="text" inputmode="numeric" id="rcost" class="ltr price"></label>
    <p class="hint">مبلغ تعمیرات به قیمت خرید اضافه می‌شود و گوشی به موجودی برمی‌گردد.</p>
    <div class="row"><button class="btn green" id="ok">تایید</button><button class="btn sec" id="cancel">انصراف</button></div>`);
  bindPriceInputs(root);
  $('#cancel', root).onclick = closeModal;
  $('#ok', root).onclick = async () => {
    const desc = $('#rdesc', root).value.trim(), cost = toNum($('#rcost', root).value);
    if (!desc) return toast('تعمیرات انجام‌شده را بنویسید');
    await store.saveItem({ ...it, status: 'in', repairIssue: null, repairSince: null,
      repairs: [...(it.repairs || []), { issue: it.repairIssue || '', desc, cost, date: todayStr() }] });
    closeModal(); toast('✅ گوشی به موجودی برگشت');
  };
}

/* ---------- کالاهای خروجی ---------- */
function outView() {
  const outs = state.items.filter((i) => st(i) === 'out' && i.sale);
  if (!outs.length) return `<div class="empty">${ic('out', 36)}هنوز گوشی‌ای خارج نشده است.</div>`;
  const years = [...new Set(outs.map((i) => i.sale.date.split('/')[0]))].sort().reverse();
  if (!ui.outYear || !years.includes(ui.outYear)) ui.outYear = years[0];
  const ofYear = outs.filter((i) => i.sale.date.startsWith(ui.outYear + '/'));
  const agg = (arr) => ({
    count: arr.length,
    sales: arr.reduce((s, i) => s + i.sale.finalPrice, 0),
    profit: arr.reduce((s, i) => s + i.sale.finalPrice - costOf(i), 0),
  });
  const yearChips = `<div class="chips">${years.map((y) => `<button class="chip ${y === ui.outYear ? 'act' : ''}" style="${colorStyle('#ffd23f')}" data-oy="${y}">${faNum(y)}</button>`).join('')}</div>`;

  if (ui.outMonth) {
    const arr = ofYear.filter((i) => Number(i.sale.date.split('/')[1]) === ui.outMonth).sort((a, b) => b.sale.date.localeCompare(a.sale.date));
    const t = agg(arr);
    return `${yearChips}<button class="link" id="backMonths">${ic('back', 16)} ماه‌های سال ${faNum(ui.outYear)}</button>
      <h2 class="title" style="margin-top:6px">${MONTHS[ui.outMonth - 1]} ${faNum(ui.outYear)} — ${faNum(t.count)} گوشی</h2>
      <div class="summary"><div class="card"><div class="n">${fmtPrice(t.sales)}</div><div class="l">جمع فروش (تومان)</div></div>
      <div class="card"><div class="n profit ${t.profit >= 0 ? 'pos' : 'neg'}">${fmtPrice(t.profit)}</div><div class="l">جمع سود نقدی (تومان)</div></div></div>
      ${arr.map((i) => phoneCard(i, 'out')).join('')}`;
  }
  const y = agg(ofYear);
  const months = MONTHS.map((name, i) => ({ name, m: i + 1, ...agg(ofYear.filter((x) => Number(x.sale.date.split('/')[1]) === i + 1)) }))
    .filter((x) => x.count > 0).reverse();
  return `${yearChips}
    <div class="summary"><div class="card"><div class="n">${faNum(y.count)}</div><div class="l">گوشی فروخته‌شده در ${faNum(ui.outYear)}</div></div>
      <div class="card"><div class="n">${fmtPrice(y.sales)}</div><div class="l">جمع فروش سال (تومان)</div></div></div>
    <h2 class="title">ماه‌ها</h2>
    ${months.map((m) => `<button class="mrow" data-om="${m.m}"><span class="m">${m.name}</span><small>${faNum(m.count)} گوشی</small></button>`).join('')}
    <p class="hint">برای دیدن جمع فروش و سود نقدی، وارد هر ماه شوید.</p>`;
}
function bindOut() {
  document.querySelectorAll('[data-oy]').forEach((b) => b.onclick = () => { ui.outYear = b.dataset.oy; ui.outMonth = null; render(); });
  document.querySelectorAll('[data-om]').forEach((b) => b.onclick = () => { ui.outMonth = Number(b.dataset.om); render(); window.scrollTo(0, 0); });
  $('#backMonths') && ($('#backMonths').onclick = () => { ui.outMonth = null; render(); });
  document.querySelectorAll('[data-undo]').forEach((b) => b.onclick = async () => {
    if (!confirm('این گوشی به موجودی برگردد؟ اطلاعات فروش پاک می‌شود.')) return;
    const it = state.items.find((x) => x.id === b.dataset.undo);
    await store.saveItem({ ...it, status: 'in', sale: null }); toast('به موجودی برگشت');
  });
}

/* ---------- تنظیمات، پشتیبان و آنلاین ---------- */
function settingsView() {
  return `<div class="card"><h2 class="title">پشتیبان‌گیری</h2>
      <p class="hint">قبل از هر آپدیت برنامه یک فایل پشتیبان بگیرید. با بازیابی، گوشی‌های فایل به اطلاعات فعلی اضافه می‌شوند.</p>
      <div class="row"><button class="btn" id="bk">دانلود پشتیبان</button><button class="btn sec" id="rs">بازیابی از فایل</button></div>
      <input type="file" id="file" accept="application/json,.json" hidden></div>
    <div class="card"><h2 class="title">همگام‌سازی آنلاین کارکنان</h2>
      ${store.mode === 'online' ? `<p>وضعیت: <b>متصل</b>${user ? ` — ${esc(user.email)}` : ''}</p>
        <div class="row"><button class="btn sec" id="logout">خروج از حساب</button><button class="btn danger" id="offline">قطع اتصال آنلاین</button></div>`
      : `<p class="hint">برای استفاده چندنفره، تنظیمات پروژه Firebase را اینجا بچسبانید (راهنما در فایل README).</p>
        <label class="f"><span>firebaseConfig</span><textarea id="cfg" class="ltr" placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }'></textarea></label>
        <button class="btn block" id="saveCfg">اتصال</button>`}</div>
    <p class="hint" style="text-align:center">تعداد کل رکوردها: ${faNum(state.items.length)}</p>`;
}
function bindSettings() {
  $('#bk').onclick = () => {
    const blob = new Blob([JSON.stringify({ app: 'rasa-used-phone', version: 2, exportedAt: todayStr(), ...store.exportAll() }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `rasa-backup-${todayStr().replace(/\//g, '-')}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  $('#rs').onclick = () => $('#file').click();
  $('#file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.items)) throw 0;
      if (!confirm(`${faNum(d.items.length)} گوشی از فایل بازیابی شود؟`)) return;
      await store.importAll(d); toast('✅ بازیابی انجام شد');
    } catch { toast('فایل پشتیبان معتبر نیست'); }
    e.target.value = '';
  };
  if ($('#saveCfg')) $('#saveCfg').onclick = () => {
    const cfg = parseConfig($('#cfg').value);
    if (!cfg?.apiKey || !cfg?.projectId) return toast('تنظیمات معتبر نیست');
    setFirebaseConfig(cfg); location.reload();
  };
  if ($('#logout')) $('#logout').onclick = () => store.logout();
  if ($('#offline')) $('#offline').onclick = () => { if (confirm('به حالت محلی برگردیم؟')) { setFirebaseConfig(null); location.reload(); } };
}
function parseConfig(txt) {
  const m = txt.match(/\{[\s\S]*\}/); if (!m) return null;
  try { return JSON.parse(m[0]); } catch { /* ادامه */ }
  try { return JSON.parse(m[0].replace(/'/g, '"').replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/,\s*}/g, '}')); } catch { return null; }
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
