export const r2 = x => Math.round(x * 100) / 100;
export const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const lc = s => String(s ?? '').trim().toLowerCase();
// named numeric target: a stat (value) or a unit (count)
const find = (h, n) => {
  const s = h.stats.find(x => lc(x.name) === lc(n)), u = h.units.find(x => lc(x.name) === lc(n));
  return s ? [s, 'value'] : u ? [u, 'count'] : [];
};

// hired staff add fx per star to stats/units while employed: "Calidad+0.5;Prestigio+1" at 3 stars -> +1.5 / +3
export function staffBonus(h, name) {
  let b = 0;
  for (const s of h.staff ?? []) if (s.hired) for (const m of String(s.fx || '').split(';')) {
    const [, n, k] = m.trim().match(/^(.+?)\s*([+-]\d*\.?\d+)$/) ?? [];
    if (n && lc(n) === lc(name)) b += +k * (+s.stars || 0);
  }
  return r2(b);
}
// effective value of a stat (value) or unit (count): base + staff bonus
const eff = (h, name) => { const [o, k] = find(h, name); return o ? r2(o[k] + staffBonus(h, name)) : undefined; };
export const wages = h => r2(sum((h.staff ?? []).filter(s => s.hired), s => +s.wage || 0));
// one more star; wage grows in proportion (a 2-star on 4 becomes a 3-star on 6)
export function promote(s) {
  if (s.stars < 5) { s.wage = r2(s.wage * (s.stars + 1) / (s.stars || 1)); s.stars++; }
  s.left = 0;
  return s;
}

// number, stat/unit name, or name*factor: "12", "Calidad", "Herramientas*5"; empty -> def
export function val(h, expr, def = 0) {
  const s = String(expr ?? '').trim();
  if (!s) return def;
  if (!isNaN(s)) return +s;
  const [, name, k] = s.match(/^(.+?)\s*(?:\*\s*(\d*\.?\d+))?$/) ?? [];
  return (eff(h, name) ?? 0) * (+k || 1);
}
// unit job cap ("" = unlimited); workers beyond it still cost upkeep but earn and produce nothing
export const capOf = (h, u) => val(h, u.cap, Infinity);
export const working = (h, u) => Math.max(0, Math.min(eff(h, u.name) ?? u.count, capOf(h, u)));

// stats: value * perPoint; units: working * income - count * upkeep
export const passive = h => r2(sum(h.stats, s => eff(h, s.name) * s.perPoint) + sum(h.units, u => working(h, u) * u.income - u.count * u.upkeep));

// each quality point makes the product worth 20% more
export const fair = (h, p) => r2((+p.base || 0) * (1 + 0.2 * val(h, p.quality, 0)));
// units per month the open market buys: product `demand` at fair price, scaled by (fair/price)^2 (no reference price -> 0)
export function demand(h, p) {
  const f = fair(h, p), price = +p.price || f;
  return f && price ? r2(Math.max(0, val(h, p.demand, 0)) * (f / price) ** 2) : 0;
}
// production and demand (per 30 days, prorated to the period, times season mult): contracts are filled first, the open market buys from the rest.
// units make the product named in `makes` (empty = first product). Unsold stock carries over, losing `spoil`% per month.
// A product whose `cond` fails (e.g. "Bodega>=1") is not made or sold: it is locked.
export function sales(h, days = 30, mult = 1) {
  const f = days / 30, prods = h.products ?? [];
  const out = prods.map((p, i) => {
    if (!check(h, p.cond)) return { ...p, locked: true, made: 0, avail: +p.stock || 0 };
    const made = r2(sum(h.units.filter(u => (u.makes ? lc(u.makes) === lc(p.name) : i === 0)), u => working(h, u) * val(h, u.prod, 0)) * f * mult);
    return { ...p, made, avail: r2((+p.stock || 0) + made) };
  });
  const by = n => out.find(p => lc(p.name) === lc(n)) ?? (n ? null : out[0]);
  const rows = (h.contracts ?? []).map(c => {
    const p = by(c.product), want = r2((+c.qty || 0) * f), got = p ? r2(Math.min(want, p.avail)) : 0;
    if (p) p.avail = r2(p.avail - got);
    return { ...c, product: p?.name ?? c.product, want, got, short: r2(want - got), revenue: r2(got * (+c.price || 0)) };
  });
  for (const p of out) {
    p.fair = fair(h, p); p.want = p.locked ? 0 : r2(demand(h, p) * f * mult);
    p.sold = r2(Math.min(p.avail, p.want)); p.revenue = r2(p.sold * (+p.price || p.fair)); p.left = r2(p.avail - p.sold);
    p.spoiled = r2(p.left * Math.min(1, (+p.spoil || 0) / 100 * f)); p.left = r2(p.left - p.spoiled);
  }
  return { products: out, rows, total: r2(sum(rows, r => r.revenue) + sum(out, p => p.revenue)) };
}
// age contracts by elapsed months; returns the ones that just ended (months 0 = no end)
export function ageContracts(h, days) {
  const ended = [];
  h.contracts = (h.contracts ?? []).filter(c => {
    if (!(+c.months > 0)) return true;
    c.months = r2(c.months - days / 30);
    if (c.months > 0) return true;
    ended.push(c);
    return false;
  });
  return ended;
}

// "Moral+5;Guardias-2" -> adjust stats/units by name, clamped to 0..max
export function effects(h, str) {
  for (const m of String(str || '').split(';')) {
    const [, name, n] = m.trim().match(/^(.+?)\s*([+-]\d+(?:\.\d+)?)$/) ?? [];
    const [o, k] = find(h, name);
    if (o) o[k] = Math.min(o.max || Infinity, Math.max(0, r2(o[k] + +n)));
  }
}

// "Moral<30;Fondo>=100" -> all must hold; unknown names fail
export function check(h, cond) {
  const ops = { '<': (a, b) => a < b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b, '=': (a, b) => a === b };
  return String(cond || '').split(';').map(c => c.trim()).filter(Boolean).every(c => {
    const [, name, op, v] = c.match(/^(.+?)\s*(<=|>=|<|>|=)\s*(-?\d+(?:\.\d+)?)$/) ?? [];
    if (!op) return true;
    const n = /^(fund|fondo)$/i.test(name) ? h.fund : eff(h, name);
    return n !== undefined && ops[op](n, +v);
  });
}

// weighted random pick (weight default 1)
export function pick(list, rnd = Math.random) {
  const w = list.map(e => Math.max(0, e.weight ?? 1)), total = sum(w, x => x);
  if (!total) return null;
  let r = rnd() * total;
  return list.find((_, i) => (r -= w[i]) < 0) ?? list.at(-1);
}

const seasonMatches = (target, current) => {
  if (!current) return false;
  const k = lc(target);
  const name = typeof current === 'object' ? current.name : current;
  const idx = typeof current === 'object' ? String(current.index) : null;
  if (name && k === lc(name)) return true;
  if (idx && k === idx) return true;
  const map = { 1: ['spring', 'primavera'], 2: ['summer', 'verano'], 3: ['fall', 'autumn', 'otoño'], 4: ['winter', 'invierno'] };
  return Boolean(idx && map[idx]?.includes(k));
};

// "Fall:2;Winter:0.3" or "3:2.5;4:0.3" -> income multiplier for the season (default 1)
export function seasonMult(str, season) {
  if (!season) return 1;
  const e = String(str || '').split(';').map(x => x.split(':')).find(([n]) => seasonMatches(n, season));
  return e ? +e[1] || 0 : 1;
}
export const okSeason = (list, season) => !lc(list) || !season || String(list).split(',').some(s => seasonMatches(s, season));

// split n between owners by share %; remainder -> fund; allow debt for owners on negative periods
export function credit(h, n) {
  let rest = 100;
  for (const [u, p] of Object.entries(h.shares)) {
    h.bal[u] = r2((h.bal[u] ?? 0) + n * p / 100);
    rest -= p;
  }
  h.fund = Math.max(0, r2(h.fund + n * Math.max(rest, 0) / 100));
}

// "gp=system.currency.gp:1;sp=system.currency.sp:0.1" -> [{path, ratio}] (ratio vs base unit)
export const parseCoins = s => String(s || '').split(';').map(x => x.trim()).filter(Boolean).map(x => {
  const [, path, ratio] = x.match(/^(?:[^=]+=)?([^:]+?)(?::(\d*\.?\d+))?$/);
  return { path, ratio: +ratio || 1 };
});

// pay n base units using the largest denominations first
export function split(n, coins) {
  let rem = r2(n);
  const out = [], sorted = [...coins].sort((a, b) => b.ratio - a.ratio);
  sorted.forEach((c, i) => {
    const k = i === sorted.length - 1 ? Math.round(rem / c.ratio) : Math.floor(rem / c.ratio + 1e-9);
    if (k) { out.push({ path: c.path, k }); rem = r2(rem - k * c.ratio); }
  });
  return out;
}

// reusable template: no balances, owners, log or build progress
export const exportable = h => ({
  name: h.name, img: h.img, desc: h.desc, kind: h.kind, income: h.income, upkeep: h.upkeep, eventChance: h.eventChance,
  seasons: h.seasons, value: h.value, stats: h.stats, units: h.units, events: h.events, contracts: h.contracts,
  products: (h.products ?? []).map(({ stock, ...p }) => p),
  staff: (h.staff ?? []).map(({ id, hired, offered, left, ...s }) => s),
  upgrades: h.upgrades.map(({ id, offered, done, left, ...u }) => u)
});
