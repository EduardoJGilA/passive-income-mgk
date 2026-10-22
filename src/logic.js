export const r2 = x => Math.round(x * 100) / 100;
export const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const lc = s => String(s ?? '').trim().toLowerCase();
// stats: value * perPoint; units: count * (income - upkeep)
export const passive = h => r2(sum(h.stats, s => s.value * s.perPoint) + sum(h.units, u => u.count * (u.income - u.upkeep)));

// named numeric target: a stat (value) or a unit (count)
const find = (h, n) => {
  const s = h.stats.find(x => lc(x.name) === lc(n)), u = h.units.find(x => lc(x.name) === lc(n));
  return s ? [s, 'value'] : u ? [u, 'count'] : [];
};

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
    const [o, k] = find(h, name), n = /^(fund|fondo)$/i.test(name) ? h.fund : o?.[k];
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
  seasons: h.seasons, value: h.value, stats: h.stats, units: h.units, events: h.events,
  upgrades: h.upgrades.map(({ id, offered, done, left, ...u }) => u)
});
