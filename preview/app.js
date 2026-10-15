/* 资产账本 · 功能预览
   一个可在浏览器点击的交互原型：总览 / 资产 / 统计 / 我的 + 记支出 / 资产编辑 / 汇率管理。
   数据存在 localStorage，逻辑与 React Native 端（expo-sqlite）保持一致：
     · 多币种 + 手工汇率，基准人民币；净资产 = Σ(金额 × 汇率)
     · 记支出从所选账户扣减余额；删除支出自动回滚
   图标使用开源图标库 lucide（本地 vendored 的 UMD 包）。 */

(function () {
  'use strict';

  // ── 常量字典 ───────────────────────────────────────────────
  const CURRENCIES = [
    { code: 'CNY', name: '人民币', sym: '¥' },
    { code: 'USD', name: '美元', sym: '$' },
    { code: 'HKD', name: '港币', sym: 'HK$' },
    { code: 'EUR', name: '欧元', sym: '€' },
    { code: 'JPY', name: '日元', sym: '¥' },
    { code: 'GBP', name: '英镑', sym: '£' },
    { code: 'SGD', name: '新加坡元', sym: 'S$' },
    { code: 'TWD', name: '新台币', sym: 'NT$' },
    { code: 'KRW', name: '韩元', sym: '₩' },
    { code: 'AUD', name: '澳元', sym: 'A$' },
    { code: 'CAD', name: '加元', sym: 'C$' },
    { code: 'CHF', name: '瑞士法郎', sym: 'CHF ' },
    { code: 'NZD', name: '新西兰元', sym: 'NZ$' },
    { code: 'MOP', name: '澳门元', sym: 'MOP$' },
    { code: 'THB', name: '泰铢', sym: '฿' },
    { code: 'MYR', name: '林吉特', sym: 'RM ' },
    { code: 'PHP', name: '菲律宾比索', sym: '₱' },
    { code: 'IDR', name: '印尼盾', sym: 'Rp ' },
    { code: 'VND', name: '越南盾', sym: '₫' },
    { code: 'INR', name: '印度卢比', sym: '₹' },
    { code: 'RUB', name: '卢布', sym: '₽' },
    { code: 'AED', name: '阿联酋迪拉姆', sym: 'AED ' },
    { code: 'SAR', name: '沙特里亚尔', sym: 'SAR ' },
    { code: 'TRY', name: '土耳其里拉', sym: '₺' },
    { code: 'BRL', name: '巴西雷亚尔', sym: 'R$' },
    { code: 'MXN', name: '墨西哥比索', sym: 'MX$' },
    { code: 'ZAR', name: '南非兰特', sym: 'R ' },
    { code: 'SEK', name: '瑞典克朗', sym: 'kr ' },
    { code: 'NOK', name: '挪威克朗', sym: 'kr ' },
    { code: 'DKK', name: '丹麦克朗', sym: 'kr ' },
    { code: 'USDT', name: '泰达币', sym: '₮' },
  ];
  const SYM = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.sym]));
  const CNAME = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]));
  // 联网汇率来源：1 CNY = X 外币，故 toCny = 1 / X
  const FX_API = 'https://open.er-api.com/v6/latest/CNY';
  const FX_SOURCE = 'open.er-api.com';
  const TYPE_LABEL = {
    cash: '现金/储蓄', investment: '投资持仓', receivable: '应收账款',
    payable: '应付账款', physical: '固定资产',
  };
  const TYPE_ORDER = ['cash', 'investment', 'receivable', 'payable', 'physical'];
  const STORAGE_KEY = 'assetbook.preview.v2';

  // ── 工具 ───────────────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const sym = (c) => SYM[c] || c + ' ';
  const rateOf = (c) => { const r = S.rates.find((x) => x.currency === c); return r ? r.toCny : 1; };
  const toCny = (v, c) => v * rateOf(c);
  let _uid = 0;
  const uid = (p) => `${p || 'x'}${Date.now().toString(36)}${(_uid++).toString(36)}`;

  function grp(abs) {
    const hasCent = Math.round(abs * 100) % 100 !== 0;
    return abs.toLocaleString('en-US', { minimumFractionDigits: hasCent ? 2 : 0, maximumFractionDigits: 2 });
  }
  const fmtNum = (v) => `${v < 0 ? '-' : ''}${grp(Math.abs(v))}`;
  const fmtFixed = (v) => fmtNum(Math.round(Math.abs(v) * 100) / 100);
  const fmtMoney = (v, c) => `${v < 0 ? '-' : ''}${sym(c || 'CNY')}${grp(Math.abs(v))}`;

  function isoLocal(off) {
    const t = new Date();
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - (off || 0));
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function dayDiff(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const a = new Date(y, m - 1, d);
    const t = new Date();
    const b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((b - a) / 86400000);
  }
  function relDay(iso) {
    const n = dayDiff(iso);
    if (n === 0) return '今天';
    if (n === 1) return '昨天';
    const [, m, d] = iso.split('-').map(Number);
    return `${m}月${d}日`;
  }
  function nowStamp() {
    const t = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  const icn = (name, size, sw) =>
    `<i data-lucide="${name}" width="${size || 20}" height="${size || 20}" stroke-width="${sw || 1.6}"></i>`;

  // ── 初始数据（与 src/data/sample.ts 对齐） ─────────────────
  function defaultState() {
    const assets = [
      { id: 'a1', name: '招商银行储蓄卡', value: 268400, currency: 'CNY', group: 'liquid', type: 'cash' },
      { id: 'a2', name: '微信零钱', value: 3215, currency: 'CNY', group: 'liquid', type: 'cash' },
      { id: 'a3', name: '支付宝余额', value: 8760, currency: 'CNY', group: 'liquid', type: 'cash' },
      { id: 'a4', name: '美元活期', value: 12000, currency: 'USD', group: 'liquid', type: 'cash' },
      { id: 'a5', name: '借出款·老周', value: 100000, currency: 'CNY', group: 'liquid', type: 'receivable', note: '2026-06 借出，年底归还' },
      { id: 'a6', name: '信用卡待还', value: -12000, currency: 'CNY', group: 'liquid', type: 'payable' },
      { id: 'a7', name: '自住房产', value: 620000, currency: 'CNY', group: 'fixed', type: 'physical' },
      { id: 'a8', name: '代步车', value: 128000, currency: 'CNY', group: 'fixed', type: 'physical' },
      { id: 'a9', name: '基金持仓', value: 45300, currency: 'CNY', group: 'fixed', type: 'investment' },
      { id: 'a10', name: '黄金积存', value: 26000, currency: 'CNY', group: 'fixed', type: 'investment' },
    ];
    const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
    // [几天前, 金额, 备注, 账户]
    const rows = [
      [13, 128, '超市采购', 'a1'], [12, 60, '咖啡', 'a2'], [10, 245, '加油', 'a1'],
      [9, 88, '打车', 'a2'], [8, 40, '便利店', 'a3'], [7, 312, '家电维修', 'a1'],
      [6, 76, '水果', 'a2'], [5, 55, '早餐', 'a2'], [4, 190, '网购·日用', 'a3'],
      [3, 42, '奶茶', 'a2'], [1, 168, '晚餐·朋友', 'a1'], [0, 224, '话费+宽带', 'a1'],
    ];
    const expenses = rows.map(([off, amt, note, acc], i) => ({
      id: `e${i + 1}`, amount: amt, currency: byId[acc].currency, note, accountId: acc, date: isoLocal(off),
    }));
    const rates = [
      { currency: 'CNY', toCny: 1 }, { currency: 'USD', toCny: 7.1 }, { currency: 'HKD', toCny: 0.91 },
      { currency: 'EUR', toCny: 7.72 }, { currency: 'JPY', toCny: 0.0475 }, { currency: 'GBP', toCny: 9.05 },
      { currency: 'SGD', toCny: 5.28 }, { currency: 'TWD', toCny: 0.216 }, { currency: 'KRW', toCny: 0.0049 },
      { currency: 'THB', toCny: 0.198 }, { currency: 'AUD', toCny: 4.68 }, { currency: 'CAD', toCny: 4.72 },
    ];
    return { base: 'CNY', rates, ratesUpdatedAt: null, assets, expenses };
  }

  // ── 状态与持久化 ───────────────────────────────────────────
  let S, tab = 'home', statsRange = 'week', sheet = null, draft = null, fxBusy = false;
  let _shownTab = null;          // 上一帧的 tab：仅切页时播入场动画
  const prevNums = {};           // 数字滚动：记录上一次显示的值

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const p = JSON.parse(raw); if (p && p.assets && p.expenses && p.rates) return p; }
    } catch (e) { /* ignore */ }
    return defaultState();
  }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  function summarize() {
    let liquid = 0, fixed = 0;
    for (const a of S.assets) {
      const v = toCny(a.value, a.currency);
      if (a.group === 'liquid') liquid += v; else fixed += v;
    }
    return { net: liquid + fixed, liquid, fixed };
  }

  // 净资产按基准货币展示（基准币种可切换）
  function baseDisplay(net) {
    const r = rateOf(S.base) || 1;
    return { sym: sym(S.base), value: net / r };
  }
  /** 把人民币金额折算成当前计价货币 */
  function baseOf(cny) { return cny / (rateOf(S.base) || 1); }
  /** 计价货币金额文本（如 ¥85,200） */
  function fmtBase(cny) { return `${sym(S.base)}${fmtNum(Math.round(baseOf(cny) * 100) / 100)}`; }

  // ── 汇总计算 ───────────────────────────────────────────────
  function last14() {
    const out = new Array(14).fill(0);
    for (const e of S.expenses) {
      const off = dayDiff(e.date);
      if (off >= 0 && off < 14) out[13 - off] += toCny(e.amount, e.currency);
    }
    return out;
  }
  function rangeData() {
    // 返回 { days:[{off,label,sum}], total, count, avg, span }
    let span, days = [];
    if (statsRange === 'week') {
      span = 7;
      for (let off = 6; off >= 0; off--) days.push({ off, sum: 0 });
    } else {
      const t = new Date();
      const today = t.getDate();
      span = today;
      for (let off = today - 1; off >= 0; off--) days.push({ off, sum: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.off, i]));
    let total = 0, count = 0;
    for (const e of S.expenses) {
      const off = dayDiff(e.date);
      if (off in idx) { const v = toCny(e.amount, e.currency); days[idx[off]].sum += v; total += v; count++; }
    }
    return { days, total, count, avg: span ? total / span : 0, span };
  }
  function byAccount() {
    const m = {};
    for (const e of S.expenses) m[e.accountId] = (m[e.accountId] || 0) + toCny(e.amount, e.currency);
    return Object.entries(m).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  }
  const acctName = (id) => { const a = S.assets.find((x) => x.id === id); return a ? a.name : '已删除账户'; };
  const since = (days) => S.expenses.filter((e) => { const n = dayDiff(e.date); return n >= 0 && n < days; });

  // ── 图标 ───────────────────────────────────────────────────
  function paintIcons(root) {
    if (window.lucide && window.lucide.createIcons) {
      try { window.lucide.createIcons(root ? { root } : undefined); } catch (e) { /* ignore */ }
    }
  }

  // ── 模板片段 ───────────────────────────────────────────────
  function dashed(extra) { return `<hr class="dash"${extra ? ` style="${extra}"` : ''}>`; }

  function itemRow(label, valueHTML, opt) {
    opt = opt || {};
    return `<div class="item${opt.cls ? ' ' + opt.cls : ''}">` +
      `<span class="name${opt.cn ? ' cn' : ''}">${label}</span>` +
      `<span class="lead"></span><span class="amt${opt.big ? ' big' : ''}">${valueHTML}</span></div>`;
  }

  function assetRow(a) {
    const sub = `<span class="tag">${TYPE_LABEL[a.type] || a.type}</span>${a.currency !== 'CNY' ? ' · ' + a.currency : ''}`;
    // 外币资产补一行折算：$12,000 ≈ ¥85,200
    const conv = a.currency !== S.base ? `<em class="conv">≈ ${fmtBase(toCny(a.value, a.currency))}</em>` : '';
    return `<div class="item clickable" data-act="edit-asset" data-id="${a.id}">` +
      `<span class="name cn">${esc(a.name)}<span class="sub">${sub}</span></span>` +
      `<span class="lead"></span>` +
      `<span class="amt">${fmtMoney(a.value, a.currency)}${conv}</span>` +
      `<span class="icon-btn" style="margin-left:8px">${icn('chevron-right', 15, 1.6)}</span></div>`;
  }

  function expenseRow(e, withDelete) {
    const sub = `${esc(acctName(e.accountId))} · ${relDay(e.date)}`;
    return `<div class="item">` +
      `<span class="name cn">${esc(e.note)}<span class="sub">${sub}</span></span>` +
      `<span class="lead"></span><span class="amt">−${fmtMoney(Math.abs(e.amount), e.currency)}</span>` +
      (withDelete ? `<span class="icon-btn" data-act="del-expense" data-id="${e.id}" style="margin-left:8px">${icn('trash-2', 13, 1.6)}</span>` : '') +
      `</div>`;
  }

  // ── 数字滚动（仅 3 处：净资产 / 分组小计 / 记账金额） ──────
  // 每个数字位是一列 0-9 的竖条，靠位移取出目标位；值变化时从旧位滚到新位。
  // 关键：目标值直接写在行内样式里（终态永远正确），动画只是叠在上面的
  // 一次性 overlay —— 后台标签页 rAF/动画被节流时，数字仍是正确的。
  const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const STRIP = DIGITS.map((d) => `<span>${d}</span>`).join('');
  const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  const REDUCED = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function anim(el, frames, ms) {
    if (REDUCED || !el || typeof el.animate !== 'function') return;
    try {
      const a = el.animate(frames, { duration: ms, easing: EASE });
      // 兜底：标签页被挂起时动画不会推进，到点直接取消，回到「静止终态」
      if (a && typeof a.cancel === 'function') setTimeout(() => { try { a.cancel(); } catch (e) { /* ignore */ } }, ms + 120);
    } catch (e) { /* 忽略：终态已在行内/自然样式里 */ }
  }
  function digitCol(from, to) {
    const roll = from != null && from !== to;
    return `<span class="col" aria-hidden="true"><span class="strip"` +
      (roll ? ` data-from="${from}" data-to="${to}"` : '') +
      ` style="transform:translateY(-${to * 10}%)">${STRIP}</span></span>`;
  }
  /** 按位渲染数字；非数字字符原样输出。prev 为 null（首帧）时不滚动。
   *  按位左对齐：新出现的位从 0 落下，已有的位只在数值真的变了时才滚动。
   *  竖条只作视觉，真实数值放进 .sr 供读屏使用。 */
  function rollHTML(key, text) {
    const prev = key in prevNums ? prevNums[key] : null;
    prevNums[key] = text;
    const prevI = [];
    if (prev != null) for (let i = 0; i < prev.length; i++) if (prev[i] >= '0' && prev[i] <= '9') prevI.push(i);
    let out = `<span class="sr">${esc(text)}</span>`, k = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch < '0' || ch > '9') { out += `<span aria-hidden="true">${esc(ch)}</span>`; continue; }
      const from = prev != null ? (k < prevI.length ? +prev[prevI[k]] : 0) : null;
      out += digitCol(from, +ch);
      k++;
    }
    return out;
  }
  // 渲染后触发滚动：从旧位滚到行内已写好的目标位
  function applyRolls(root) {
    root.querySelectorAll('.strip[data-from]').forEach((el) => {
      anim(el, [
        { transform: `translateY(-${(+el.dataset.from) * 10}%)` },
        { transform: `translateY(-${(+el.dataset.to) * 10}%)` },
      ], 180);
    });
  }

  function chartHTML(values) {
    const max = Math.max.apply(null, values.concat([1]));
    const peak = values.indexOf(Math.max.apply(null, values));
    // 终态高度直接写在行内；生长动画是叠加的 overlay
    return `<div class="chart">` + values.map((v, i) => {
      const h = v <= 0 ? 0 : Math.max((v / max) * 100, 3);
      const cls = v <= 0 ? ' zero' : (i === peak ? ' peak' : '');
      return `<div class="bar${cls}" data-h="${h}" style="height:${h}%"></div>`;
    }).join('') + `</div>`;
  }
  function applyBars(root) {
    root.querySelectorAll('.bar[data-h]').forEach((el) => {
      const h = el.dataset.h + '%';
      anim(el, [{ height: '0%' }, { height: h }], 200);
    });
  }

  function header(title, latin, serial) {
    return `<div class="head">${serial === false ? '' : '<div class="serial">NO.0001</div>'}` +
      `<div class="t">${title}</div><div class="s">${latin}</div></div>` + dashed();
  }

  // ── 页面：总览 ─────────────────────────────────────────────
  function viewHome() {
    const s = summarize();
    const bd = baseDisplay(s.net);
    const daily = last14();
    const total = daily.reduce((a, b) => a + b, 0);
    const avg = total / 14;
    const recent = S.expenses.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 6);

    const liquid = baseDisplay(s.liquid), fixed = baseDisplay(s.fixed);
    const now = new Date();
    const stampTime = `${isoLocal(0)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    return header('资产账本', 'ASSET&nbsp;&nbsp;STATEMENT') +
      `<div class="total"><div class="lab">NET WORTH 净资产</div>` +
      `<div class="num"><span class="cur">${bd.sym}</span>${rollHTML('home.net', fmtFixed(bd.value))}</div></div>` + dashed() +
      itemRow('可流动现金等值物', fmtNum(liquid.value), { cn: true }) +
      itemRow('固定资产与实物', fmtNum(fixed.value), { cn: true }) +
      `<div class="sec-label">— EXPENSE 支出 / 近14天 —</div>` +
      chartHTML(daily) +
      dashed('margin:10px 0 2px') +
      itemRow('合计 TOTAL', fmtFixed(total), { big: true }) +
      itemRow('日均 DAILY AVG', fmtFixed(avg), {}) +
      `<div class="sec-label" style="margin-top:16px">— RECENT 最近记录 —</div>` +
      (recent.length ? recent.map((e) => expenseRow(e, true)).join('') : `<div class="empty">暂无记录</div>`) +
      `<div class="foot">${stampTime}<br>THANK YOU　·　请核对后再行结算</div>`;
  }

  // ── 页面：资产 ─────────────────────────────────────────────
  function viewAssets() {
    const liquid = S.assets.filter((a) => a.group === 'liquid');
    const fixed = S.assets.filter((a) => a.group === 'fixed');
    const s = summarize();
    const sumOf = (list) => list.reduce((acc, a) => acc + toCny(a.value, a.currency), 0);
    const group = (title, latin, list, g) =>
      `<div class="sec-label left">${title} · ${latin}</div>` +
      (list.length ? list.map(assetRow).join('') : `<div class="empty">暂无项目</div>`) +
      `<div class="subtotal">${itemRow('小计 SUBTOTAL', rollHTML('sub.' + g, fmtBase(sumOf(list))), { big: true })}</div>` +
      `<button class="btn block" data-act="add-asset" data-group="${g}" style="margin:10px 0 2px">${icn('plus', 14)} 添加项目</button>`;

    return header('资产明细', 'PORTFOLIO') +
      group('可流动现金等值物', 'LIQUID', liquid, 'liquid') + dashed('margin:14px 0 2px') +
      group('固定资产与实物', 'FIXED', fixed, 'fixed') +
      `<div class="foot">合计 ${fmtBase(s.net)}<br>共 ${S.assets.length} 项</div>`;
  }

  // ── 页面：统计 ─────────────────────────────────────────────
  function viewStats() {
    const r = rangeData();
    const labels = { week: '本周', month: '本月' };
    const chip = (k) => `<div class="chip${statsRange === k ? ' on' : ''}" data-act="range" data-r="${k}">${labels[k]}</div>`;
    const br = byAccount().slice(0, 5);
    const inRange = S.expenses.filter((e) => { const off = dayDiff(e.date); return off >= 0 && off < r.span; })
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    return header('统计', 'STATISTICS') +
      `<div class="chips" style="justify-content:center;margin:12px 0">${chip('week')}${chip('month')}</div>` +
      `<div class="total" style="padding:2px 0 12px"><div class="lab">${labels[statsRange]}合计</div>` +
      `<div class="num" style="font-size:34px"><span class="cur">¥</span>${fmtFixed(r.total)}</div></div>` +
      itemRow('日均 DAILY AVG', fmtFixed(r.avg), {}) +
      itemRow('笔数 COUNT', String(r.count), {}) +
      `<div class="sec-label">— TREND 每日 —</div>` + chartHTML(r.days.map((d) => d.sum)) +
      `<div class="sec-label" style="margin-top:16px">— BY ACCOUNT 分账户 —</div>` +
      (br.length ? br.map((x) => itemRow(esc(acctName(x.id)), fmtFixed(x.v), { cn: true })).join('') : `<div class="empty">暂无数据</div>`) +
      `<div class="sec-label" style="margin-top:16px">— DETAIL 明细 —</div>` +
      (inRange.length ? inRange.map((e) => expenseRow(e, true)).join('') : `<div class="empty">本期无记录</div>`);
  }

  // ── 页面：我的 ─────────────────────────────────────────────
  function viewMe() {
    const rateRows = S.rates.map((r) => {
      const del = r.currency !== 'CNY'
        ? `<span class="icon-btn" data-act="del-rate" data-c="${r.currency}">${icn('trash-2', 14, 1.6)}</span>` : '';
      return `<div class="rate-row"><span class="code">${r.currency}</span>` +
        `<span class="cname">${CNAME[r.currency] || ''}</span>` +
        `<input type="text" inputmode="decimal" value="${r.toCny}" data-rate="${r.currency}"${r.currency === 'CNY' ? ' disabled' : ''}>` + del + `</div>`;
    }).join('');
    const baseChips = S.rates.map((r) =>
      `<div class="chip${S.base === r.currency ? ' on' : ''}" data-act="pick-base" data-c="${r.currency}">${r.currency}</div>`).join('');
    const fxNote = S.ratesUpdatedAt
      ? `已联网更新 · ${esc(S.ratesUpdatedAt)} · 来源 ${FX_SOURCE}`
      : '当前为示例汇率 · 点「联网更新汇率」取实时价';

    return header('我的', 'SETTINGS') +
      `<div class="sec-label left">汇率 FX RATES · 1 单位 = ? 人民币</div>` + rateRows +
      `<div class="row-actions" style="margin-top:10px">` +
      `<button class="btn" data-act="fetch-rates"${fxBusy ? ' disabled' : ''}>${icn('cloud-download', 14)} ${fxBusy ? '获取中…' : '联网更新汇率'}</button>` +
      `<button class="btn" data-act="add-currency">${icn('plus', 14)} 添加币种</button>` +
      `</div><div class="fx-note">${fxNote}</div>` +
      `<div class="sec-label left" style="margin-top:18px">计价货币 BASE CURRENCY</div>` +
      `<div class="chips">${baseChips}</div>` +
      `<div class="sec-label left" style="margin-top:18px">数据 DATA</div>` +
      `<div class="row-actions"><button class="btn" data-act="reset-data">${icn('refresh-cw', 14)} 恢复示例数据</button>` +
      `<button class="btn danger" data-act="clear-data">${icn('trash-2', 14)} 清空全部数据</button></div>` +
      `<div class="foot">资产账本 v1.0 · 功能预览<br>本地存储 · 无账户 · 无后端</div>`;
  }

  // ── 弹层 ───────────────────────────────────────────────────
  function sheetHTML() {
    if (!sheet) return '';
    if (sheet.kind === 'expense') return expenseSheetHTML();
    if (sheet.kind === 'asset') return assetSheetHTML();
    if (sheet.kind === 'currency') return currencySheetHTML();
    return '';
  }

  function expenseSheetHTML() {
    const d = draft;
    const accounts = S.assets.filter((a) => a.group === 'liquid');
    const amtTxt = d.amountStr || '0.00';
    const accChips = accounts.length ? accounts.map((a) =>
      `<div class="chip${d.accountId === a.id ? ' on' : ''}" data-act="pick-account" data-id="${a.id}">${esc(a.name)}<span class="csub">${fmtMoney(a.value, a.currency)}</span></div>`
    ).join('') : `<div class="empty" style="padding:8px 0;text-align:left">请先在「资产」页添加资金账户</div>`;

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
    const canConfirm = parseFloat(d.amountStr) > 0 && !!d.accountId;
    // 退格键用标准图标库（lucide）的 delete，而不是文字符号
    const keyHTML = (k) => (k === '⌫'
      ? `<div class="key del" data-act="key" data-k="⌫">${icn('delete', 22, 1.7)}</div>`
      : `<div class="key" data-act="key" data-k="${k}">${k}</div>`);

    return `<div class="sheet-head"><div><div class="st">记一笔支出</div><div class="sx">NEW EXPENSE</div></div>` +
      `<div class="icon-btn" data-act="close-sheet">${icn('x', 18)}</div></div>` +
      `<div class="sheet-body">` +
      `<div class="amount-disp${d.amountStr ? '' : ' empty'}"><span class="cur">${sym(d.currency || 'CNY')}</span>${rollHTML('sheet.amt', amtTxt)}</div>` +
      `<div class="field"><label>备注 note</label><input id="exp-note" class="cn" placeholder="例如：午餐" value="${esc(d.note)}"></div>` +
      `<div class="field"><label>从哪个账户支出 account</label><div class="chips">${accChips}</div></div>` +
      `<div class="keypad">${keys.map(keyHTML).join('')}</div>` +
      `<button class="btn-primary" data-act="confirm-expense"${canConfirm ? '' : ' disabled'}>记 账</button>` +
      `</div>`;
  }

  function assetSheetHTML() {
    const d = draft;
    const isNew = !d.id;
    const curChips = S.rates.map((r) =>
      `<div class="chip${d.currency === r.currency ? ' on' : ''}" data-act="pick-cur" data-c="${r.currency}">${r.currency}</div>`).join('');
    const grpChips = [['liquid', '可流动'], ['fixed', '固定资产']].map(([k, n]) =>
      `<div class="chip${d.group === k ? ' on' : ''}" data-act="pick-group" data-g="${k}">${n}</div>`).join('');
    const typChips = TYPE_ORDER.map((t) =>
      `<div class="chip${d.type === t ? ' on' : ''}" data-act="pick-type" data-t="${t}">${TYPE_LABEL[t]}</div>`).join('');
    const photo = d.type === 'physical'
      ? `<div class="field"><label>照片 photo</label>` +
        (d.photoUri ? `<img src="${d.photoUri}" class="photo-thumb" alt="">` : '') +
        `<input type="file" id="asset-photo" accept="image/*" style="display:none">` +
        `<button class="btn block" data-act="pick-photo" style="margin-top:6px">${icn('image-plus', 14)} ${d.photoUri ? '更换照片' : '选择照片'}</button></div>`
      : '';

    return `<div class="sheet-head"><div><div class="st">${isNew ? '新增资产项' : '编辑资产项'}</div><div class="sx">${isNew ? 'NEW ASSET' : 'EDIT ASSET'}</div></div>` +
      `<div class="icon-btn" data-act="close-sheet">${icn('x', 18)}</div></div>` +
      `<div class="sheet-body">` +
      `<div class="field"><label>名称 name</label><input id="as-name" class="cn" placeholder="例如：招商银行储蓄卡" value="${esc(d.name)}"></div>` +
      `<div class="field"><label>金额 amount</label><input id="as-value" inputmode="decimal" placeholder="应付账款请填负数，如 -12000" value="${esc(d.value)}"></div>` +
      `<div class="field"><label>币种 currency</label><div class="chips">${curChips}</div></div>` +
      `<div class="field"><label>分组 group</label><div class="chips">${grpChips}</div></div>` +
      `<div class="field"><label>类型 type</label><div class="chips">${typChips}</div></div>` +
      photo +
      `<div class="field"><label>备注 note（选填）</label><input id="as-note" class="cn" value="${esc(d.note)}"></div>` +
      `<div class="row-actions">` +
      (isNew ? '' : `<button class="btn danger" data-act="del-asset">${icn('trash-2', 14)} 删除</button>`) +
      `<button class="btn" data-act="save-asset" style="background:var(--ink);color:var(--paper);border-color:var(--ink)">${icn('check', 14)} 保存</button>` +
      `</div></div>`;
  }

  function currencySheetHTML() {
    const have = S.rates.map((r) => r.currency);
    const rest = CURRENCIES.filter((c) => !have.includes(c.code));
    return `<div class="sheet-head"><div><div class="st">添加币种</div><div class="sx">ADD CURRENCY</div></div>` +
      `<div class="icon-btn" data-act="close-sheet">${icn('x', 18)}</div></div>` +
      `<div class="sheet-body">` +
      (rest.length ? `<div class="chips">${rest.map((c) => `<div class="chip wide" data-act="add-rate" data-c="${c.code}"><span>${c.code}</span><span class="csub">${c.name}</span></div>`).join('')}</div>`
        : `<div class="empty">所有内置币种都已添加</div>`) +
      `</div>`;
  }

  // ── 渲染 ───────────────────────────────────────────────────
  const VIEWS = { home: viewHome, assets: viewAssets, stats: viewStats, me: viewMe };

  function render() {
    const changed = _shownTab !== tab;
    _shownTab = tab;
    const scr = $('#screen');
    scr.innerHTML = `<div class="page">${VIEWS[tab]()}</div>`;
    $('#tabbar').innerHTML = tabbarHTML();
    renderSheet();
    paintIcons();
    applyRolls(scr); applyBars(scr);
    // 仅在切页时播放入场：上浮 8px + 淡入（叠加动画，静止态即可见终态）
    if (changed) anim(scr.firstElementChild,
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 160);
  }
  function renderSheet() {
    const scrim = $('#scrim'), el = $('#sheet');
    if (!sheet) { scrim.classList.remove('show'); el.classList.remove('show'); el.innerHTML = ''; return; }
    el.innerHTML = sheetHTML();
    scrim.classList.add('show'); el.classList.add('show');
    paintIcons(el);
    applyRolls(el);
  }
  function rerenderSheet() {
    const a = document.activeElement;
    const fid = a && a.id ? a.id : null;
    let sel = null;
    if (fid) { try { sel = a.selectionStart; } catch (e) { /* ignore */ } }
    renderSheet();
    if (fid) { const el = document.getElementById(fid); if (el && el.focus) { el.focus(); try { el.setSelectionRange(sel, sel); } catch (e) { /* ignore */ } } }
  }

  function tabbarHTML() {
    const t = (k, ic, name) => `<div class="tab${tab === k ? ' active' : ''}" data-act="tab" data-tab="${k}">${icn(ic)}<span>${name}</span></div>`;
    return t('home', 'layout-grid', '总览') + t('assets', 'wallet', '资产') +
      `<div class="tab mid"><div class="mid-btn" data-act="add-expense">${icn('plus', 22, 2)}</div></div>` +
      t('stats', 'trending-up', '统计') + t('me', 'user', '我的');
  }

  // ── 提示 ───────────────────────────────────────────────────
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  // ── 行为 ───────────────────────────────────────────────────
  function openExpense() {
    const accounts = S.assets.filter((a) => a.group === 'liquid');
    draft = { amountStr: '', note: '', accountId: accounts[0] ? accounts[0].id : null, currency: accounts[0] ? accounts[0].currency : 'CNY' };
    delete prevNums['sheet.amt'];   // 新开一笔：金额从 0 起，不做跨次滚动
    sheet = { kind: 'expense' }; renderSheet();
  }
  function openAsset(id, group) {
    const a = id ? S.assets.find((x) => x.id === id) : null;
    draft = a
      ? { id: a.id, name: a.name, value: String(a.value), currency: a.currency, group: a.group, type: a.type, note: a.note || '', photoUri: a.photoUri || '' }
      : { id: null, name: '', value: '', currency: S.base, group: group || 'liquid', type: group === 'fixed' ? 'physical' : 'cash', note: '', photoUri: '' };
    sheet = { kind: 'asset' }; renderSheet();
  }
  const closeSheet = () => { sheet = null; draft = null; renderSheet(); };

  function keyPress(k) {
    let s = draft.amountStr || '';
    if (k === '⌫') { s = s.slice(0, -1); }
    else if (k === '.') { if (!s.includes('.')) s = (s || '0') + '.'; }
    else {
      if (s.includes('.') && s.split('.')[1].length >= 2) return;
      if (s.replace('.', '').length >= 12) return;
      s = s === '0' ? k : s + k;
    }
    draft.amountStr = s; rerenderSheet();
  }

  function confirmExpense() {
    const amt = parseFloat(draft.amountStr);
    const acc = S.assets.find((a) => a.id === draft.accountId);
    if (!(amt > 0) || !acc) return;
    acc.value = Math.round((acc.value - amt) * 100) / 100;   // 从账户扣减
    S.expenses.push({ id: uid('e'), amount: amt, currency: acc.currency, note: (draft.note || '').trim() || '未备注', accountId: acc.id, date: isoLocal(0) });
    save(); closeSheet(); render();
    toast(`已记入 ${acc.name} −${fmtMoney(amt, acc.currency)}`);
  }
  function delExpense(id) {
    const i = S.expenses.findIndex((e) => e.id === id);
    if (i < 0) return;
    const e = S.expenses[i];
    const acc = S.assets.find((a) => a.id === e.accountId);
    if (acc) acc.value = Math.round((acc.value + e.amount) * 100) / 100;   // 回滚
    S.expenses.splice(i, 1);
    save(); render(); toast('已删除并回滚余额');
  }

  function syncDraftFromInputs() {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
    const n = g('as-name'); if (n !== undefined) draft.name = n;
    const v = g('as-value'); if (v !== undefined) draft.value = v;
    const nt = g('as-note'); if (nt !== undefined) draft.note = nt;
  }
  function saveAsset() {
    syncDraftFromInputs();
    const name = (draft.name || '').trim();
    const value = parseFloat(draft.value);
    if (!name) { toast('请填写名称'); return; }
    if (isNaN(value)) { toast('请填写有效金额'); return; }
    if (draft.id) {
      const a = S.assets.find((x) => x.id === draft.id);
      Object.assign(a, { name, value, currency: draft.currency, group: draft.group, type: draft.type, note: draft.note.trim(), photoUri: draft.photoUri || undefined });
    } else {
      S.assets.push({ id: uid('a'), name, value, currency: draft.currency, group: draft.group, type: draft.type, note: draft.note.trim(), photoUri: draft.photoUri || undefined });
    }
    save(); closeSheet(); render(); toast(draft.id ? '已保存' : '已新增');
  }
  function delAsset() {
    if (!draft.id) return;
    S.assets = S.assets.filter((a) => a.id !== draft.id);
    save(); closeSheet(); render(); toast('已删除资产项');
  }

  function confirmClear() {
    if (!window.confirm('确定清空全部资产与记录？此操作不可撤销。')) return;
    S.assets = []; S.expenses = [];
    save(); render(); toast('已清空数据');
  }
  function resetData() {
    S = defaultState(); save(); render(); toast('已恢复示例数据');
  }

  /** 联网取实时汇率：接口给的是「1 CNY = X 外币」，故 toCny = 1 / X */
  async function fetchRates() {
    if (fxBusy) return;
    fxBusy = true; render();
    try {
      const res = await fetch(FX_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const table = data && data.rates;
      if (!table) throw new Error('unexpected payload');
      let n = 0;
      for (const r of S.rates) {
        if (r.currency === 'CNY') continue;
        const x = table[r.currency];
        if (typeof x === 'number' && x > 0) { r.toCny = Number((1 / x).toPrecision(5)); n++; }
      }
      S.ratesUpdatedAt = nowStamp();
      fxBusy = false; save(); render();
      toast(`已更新 ${n} 种汇率 · ${FX_SOURCE}`);
    } catch (e) {
      fxBusy = false; render();
      toast('联网获取失败，请检查网络后重试');
    }
  }

  // ── 事件 ───────────────────────────────────────────────────
  const ACTIONS = {
    'tab': (el) => { tab = el.dataset.tab; closeSheet(); render(); $('#screen').scrollTop = 0; },
    'add-expense': () => openExpense(),
    'close-sheet': () => closeSheet(),
    'key': (el) => keyPress(el.dataset.k),
    'pick-account': (el) => { const a = S.assets.find((x) => x.id === el.dataset.id); draft.accountId = a.id; draft.currency = a.currency; rerenderSheet(); },
    'confirm-expense': () => confirmExpense(),
    'del-expense': (el) => delExpense(el.dataset.id),
    'add-asset': (el) => openAsset(null, el.dataset.group),
    'edit-asset': (el) => openAsset(el.dataset.id),
    'pick-cur': (el) => { draft.currency = el.dataset.c; syncDraftFromInputs(); renderSheet(); },
    'pick-group': (el) => { draft.group = el.dataset.g; syncDraftFromInputs(); renderSheet(); },
    'pick-type': (el) => { draft.type = el.dataset.t; syncDraftFromInputs(); renderSheet(); },
    'pick-photo': () => { const f = document.getElementById('asset-photo'); if (f) f.click(); },
    'save-asset': () => saveAsset(),
    'del-asset': () => delAsset(),
    'range': (el) => { statsRange = el.dataset.r; render(); },
    'add-currency': () => { sheet = { kind: 'currency' }; draft = {}; renderSheet(); },
    'fetch-rates': () => fetchRates(),
    'add-rate': (el) => { S.rates.push({ currency: el.dataset.c, toCny: 1 }); save(); closeSheet(); render(); toast(`已添加 ${el.dataset.c}`); },
    'del-rate': (el) => { const c = el.dataset.c; if (c === 'CNY') return; S.rates = S.rates.filter((r) => r.currency !== c); if (S.base === c) S.base = 'CNY'; save(); render(); toast(`已移除 ${c}`); },
    'pick-base': (el) => { S.base = el.dataset.c; save(); render(); },
    'clear-data': () => confirmClear(),
    'reset-data': () => resetData(),
  };

  function onClick(ev) {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el); }
  }
  function onInput(ev) {
    const t = ev.target;
    if (!t || !t.dataset) return;
    if (t.dataset.rate) {
      const v = parseFloat(t.value);
      const r = S.rates.find((x) => x.currency === t.dataset.rate);
      if (r && !isNaN(v) && v > 0) { r.toCny = v; save(); }
      return;
    }
    if (!draft) return;
    if (t.id === 'exp-note') draft.note = t.value;
    else if (t.id === 'as-name') draft.name = t.value;
    else if (t.id === 'as-value') draft.value = t.value;
    else if (t.id === 'as-note') draft.note = t.value;
  }
  function onChange(ev) {
    const t = ev.target;
    if (t && t.id === 'asset-photo' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => { draft.photoUri = reader.result; syncDraftFromInputs(); renderSheet(); };
      reader.readAsDataURL(t.files[0]);
    }
  }

  // ── 启动 ───────────────────────────────────────────────────
  function fitToViewport() {
    const s = Math.min(1, (window.innerHeight - 40) / 844);
    document.documentElement.style.setProperty('--fit', s < 1 ? String(s) : '1');
  }

  function boot() {
    S = load();
    fitToViewport();
    window.addEventListener('resize', fitToViewport);
    // 状态栏时间
    const now = new Date();
    $('#sb-time').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', (ev) => {
      if (!sheet) return;
      if (ev.key === 'Escape') { closeSheet(); return; }
      if (sheet.kind !== 'expense') return;
      if (/^[0-9]$/.test(ev.key)) keyPress(ev.key);
      else if (ev.key === '.') keyPress('.');
      else if (ev.key === 'Backspace') keyPress('⌫');
      else if (ev.key === 'Enter') confirmExpense();
    });
    $('#scrim').addEventListener('click', closeSheet);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
