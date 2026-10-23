import assert from 'node:assert/strict';
const r2x = x => Math.round(x * 100) / 100;
import { passive, effects, credit, check, pick, seasonMult, okSeason, parseCoins, split, exportable, val, capOf, working, fair, demand, sales, ageContracts, staffBonus, wages, promote } from './src/logic.js';
const mk = () => ({ shares: { a: 50, b: 30 }, bal: {}, fund: 0, stats: [{ name: 'Moral', value: 50, perPoint: 0, max: 60 }, { name: 'Pob', value: 10, perPoint: 0.5, max: 0 }], units: [{ name: 'Guardias', count: 5, income: 0, upkeep: 2, max: 8 }] });
const h = mk();
credit(h, 100);
assert.deepEqual([h.bal.a, h.bal.b, h.fund], [50, 30, 20]);
credit(h, -1000);
assert.deepEqual([h.bal.a, h.bal.b, h.fund], [-450, -270, 0]);
assert.equal(passive(h), 5 - 10);
effects(h, 'moral+20;Pob-99;nada+1;guardias+9;Guardias-1.5');
assert.deepEqual([h.stats[0].value, h.stats[1].value, h.units[0].count], [60, 0, 6.5]);
h.fund = 120;
assert.ok(check(h, 'Moral>=60;Fondo>100;guardias<7'));
assert.ok(!check(h, 'Moral<30'));
assert.ok(!check(h, 'Inexistente>0'));
assert.ok(check(h, ''));
const ev = [{ weight: 0 }, { weight: 1, id: 'b' }, { weight: 3, id: 'c' }];
assert.equal(pick(ev, () => 0).id, 'b');
assert.equal(pick(ev, () => 0.99).id, 'c');
assert.equal(pick([{ weight: 0 }]), null);
assert.equal(seasonMult('Fall:2;Winter:0.3', 'winter'), 0.3);
assert.equal(seasonMult('Fall:2', 'Spring'), 1);
assert.equal(seasonMult('Fall:2', undefined), 1);
assert.equal(seasonMult('Fall:2;Winter:0.3', { name: 'Choref', index: 4 }), 0.3);
assert.equal(seasonMult('4:0.5', { name: 'Choref', index: 4 }), 0.5);
assert.ok(okSeason('Fall, Summer', 'summer') && !okSeason('Fall', 'Winter') && okSeason('', 'Winter') && okSeason('Fall', undefined));
assert.ok(okSeason('Stav, Choref', { name: 'Stav', index: 3 }) && okSeason('Fall', { name: 'Stav', index: 3 }));
const coins = parseCoins('gp=system.currency.gp:1;sp=system.currency.sp:0.1;cp=system.currency.cp:0.01');
assert.deepEqual(split(12.34, coins), [{ path: 'system.currency.gp', k: 12 }, { path: 'system.currency.sp', k: 3 }, { path: 'system.currency.cp', k: 4 }]);
assert.deepEqual(split(5, parseCoins('system.currency.gp')), [{ path: 'system.currency.gp', k: 5 }]);
const x = exportable({ ...mk(), name: 'N', upgrades: [{ id: 'q', name: 'U', done: true, offered: true, left: 2, cost: 5 }] });
assert.deepEqual(x.upgrades, [{ name: 'U', cost: 5 }]);
// val: number / stat / stat*factor; cap: overstaffing costs upkeep without output
const v = { stats: [{ name: 'Viñas', value: 3, perPoint: 0 }, { name: 'Calidad', value: 2, perPoint: 0 }, { name: 'Herramientas', value: 2, perPoint: 0 }],
  units: [{ name: 'Vendimiadores', count: 8, income: 1, upkeep: 2, cap: 'viñas*2', prod: 'Herramientas*5' }],
  products: [{ name: 'Vino', base: 2, price: 2.8, quality: 'Calidad', demand: '30', stock: 10 }],
  contracts: [{ buyer: 'Druida', product: 'vino', qty: 40, price: 3, months: 2 }] };
assert.deepEqual([val(v, ''), val(v, '7'), val(v, 'calidad'), val(v, 'Herramientas*5'), val(v, 'Nada')], [0, 7, 2, 10, 0]);
assert.equal(capOf(v, v.units[0]), 6);
assert.equal(capOf(v, { cap: '' }), Infinity);
assert.equal(working(v, v.units[0]), 6);
assert.equal(passive(v), 6 * 1 - 8 * 2);
assert.equal(fair(v, v.products[0]), 2.8); // 2 * (1 + 0.2*2)
assert.equal(demand(v, v.products[0]), 30); // demand 30/month at fair price
assert.equal(demand(v, { ...v.products[0], price: 5.6 }), 7.5); // double price -> quarter
assert.equal(demand(v, { ...v.products[0], price: 1.4 }), 120); // half price -> 4x
assert.equal(demand(v, { ...v.products[0], base: 0 }), 0); // no reference price -> market ignores it
let s = sales(v, 30); // made 6*10=60, +10 stock = 70; contract takes 40 -> 30 left, market wants 30 at 2.8
assert.deepEqual([s.products[0].made, s.rows[0].got, s.products[0].sold, s.products[0].left, s.total], [60, 40, 30, 0, r2x(40 * 3 + 30 * 2.8)]);
v.products[0].price = 5.6; // greedy price: market takes only 7.5, the rest piles up
s = sales(v, 30);
assert.deepEqual([s.products[0].sold, s.products[0].left], [7.5, 22.5]);
v.products[0].price = 2.8;
s = sales(v, 15, 2); // half a month at harvest x2: same production and demand
assert.deepEqual([s.products[0].made, s.products[0].want], [60, 30]);
v.stats[2].value = 0; // no tools -> nothing made, contract short
s = sales(v, 30);
assert.deepEqual([s.products[0].made, s.rows[0].got, s.rows[0].short], [0, 10, 30]);
assert.equal(sales({ units: [] }, 7).total, 0);
assert.deepEqual(ageContracts(v, 30).map(c => c.buyer), []);
assert.deepEqual(ageContracts(v, 30).map(c => c.buyer), ['Druida']);
assert.equal(v.contracts.length, 0);
// staff: per-star fx while hired, read everywhere stats are read; wages; promotion
v.stats[2].value = 2;
v.staff = [{ name: 'Ilsa', role: 'Capataz', stars: 3, wage: 6, fx: 'Herramientas+1;Calidad+0.5', hired: true }, { name: 'X', stars: 5, wage: 99, fx: 'Calidad+9', hired: false }];
assert.deepEqual([staffBonus(v, 'herramientas'), staffBonus(v, 'Calidad'), staffBonus(v, 'Nada')], [3, 1.5, 0]);
assert.equal(val(v, 'Herramientas*5'), 25); // (2 + 3) * 5
assert.equal(fair(v, v.products[0]), 3.4); // 2 * (1 + 0.2 * (2 + 1.5))
assert.ok(check(v, 'Calidad>=3.5') && !check(v, 'Calidad>=4'));
assert.equal(wages(v), 6);
const pr = promote({ stars: 2, wage: 4, left: 1 });
assert.deepEqual([pr.stars, pr.wage, pr.left], [3, 6, 0]);
assert.equal(promote({ stars: 5, wage: 10 }).stars, 5);
// locked products (cond) are not made or sold; spoilage eats stock per month
const g = { stats: [{ name: 'Bodega', value: 0 }], units: [{ name: 'W', count: 2, upkeep: 0, income: 0, prod: '10' }],
  products: [{ name: 'Vino', base: 1, price: 1, demand: '0', stock: 0, spoil: 50 }, { name: 'Reserva', base: 5, price: 5, demand: '100', stock: 4, cond: 'Bodega>=1' }], contracts: [] };
s = sales(g, 30);
assert.deepEqual([s.products[0].made, s.products[0].spoiled, s.products[0].left], [20, 10, 10]);
assert.deepEqual([s.products[1].locked, s.products[1].sold, s.products[1].left], [true, 0, 4]);
g.stats[0].value = 1; g.units[0].makes = 'Reserva';
s = sales(g, 30);
assert.deepEqual([!!s.products[1].locked, s.products[1].made, s.products[1].sold], [false, 20, 24]);
const ex = exportable({ ...v, name: 'V', upgrades: [], events: [] });
assert.equal('hired' in ex.staff[0], false);
assert.equal('stock' in ex.products[0], false);
console.log('ok');
