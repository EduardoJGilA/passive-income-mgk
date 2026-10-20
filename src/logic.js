export const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
// stats: value * perPoint; units: count * (income - upkeep)
export const passive = h => Math.round(sum(h.stats, s => s.value * s.perPoint) + sum(h.units, u => u.count * (u.income - u.upkeep)));
// "Moral+5;Defensa-2" -> adjust stats by name, clamped to 0..max
export function effects(h, str) {
  for (const m of String(str || '').split(';')) {
    const [, name, n] = m.trim().match(/^(.+?)\s*([+-]\d+)$/) ?? [];
    const s = h.stats.find(x => x.name.toLowerCase() === name?.toLowerCase());
    if (s) s.value = Math.min(s.max || Infinity, Math.max(0, s.value + +n));
  }
}

// split n between owners by share %; remainder -> fund
export function credit(h, n) {
  let rest = 100;
  for (const [u, p] of Object.entries(h.shares)) { h.bal[u] = Math.max(0, (h.bal[u] ?? 0) + Math.round(n * p / 100)); rest -= p; }
  h.fund = Math.max(0, h.fund + Math.round(n * Math.max(rest, 0) / 100));
}
