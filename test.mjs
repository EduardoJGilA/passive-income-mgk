import assert from 'node:assert/strict';
import { passive, effects, credit, check, pick, seasonMult, okSeason, parseCoins, split, exportable, capOf, working, sales, ageContracts } from './src/logic.js';
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
// production: cap by number / stat / stat*factor; overstaffing costs upkeep without output
const v = { stats: [{ name: 'Viñas', value: 3, perPoint: 0 }], units: [{ name: 'Vendimiadores', count: 8, income: 1, upkeep: 2, cap: 'viñas*2', prod: 10 }], spot: 0.5,
  contracts: [{ buyer: 'Druida', qty: 40, price: 2, months: 2 }, { buyer: 'Il Thalor', qty: 30, price: 1, months: 0 }] };
assert.equal(capOf(v, v.units[0]), 6);
assert.equal(capOf(v, { cap: '' }), Infinity);
assert.equal(capOf(v, { cap: '4' }), 4);
assert.equal(capOf(v, { cap: 'Nada' }), 0);
assert.equal(working(v, v.units[0]), 6);
assert.equal(passive(v), 6 * 1 - 8 * 2);
let s = sales(v, 30); // 60 made: Druida 40 full, Il Thalor 20 of 30, no spare
assert.deepEqual([s.made, s.rows[0].got, s.rows[1].got, s.rows[1].short, s.spare, s.total], [60, 40, 20, 10, 0, 100]);
v.stats[0].value = 10; // cap 20 -> 8 working -> 80 made, 10 spare at 0.5
s = sales(v, 30);
assert.deepEqual([s.made, s.spare, s.spot, s.total], [80, 10, 5, 115]);
s = sales(v, 15); // half a month: everything halves
assert.deepEqual([s.made, s.rows[0].want, s.total], [40, 20, 57.5]);
assert.deepEqual(sales({ units: [] }, 7).total, 0);
assert.deepEqual(ageContracts(v, 30).map(c => c.buyer), []);
assert.deepEqual(ageContracts(v, 30).map(c => c.buyer), ['Druida']);
assert.deepEqual(v.contracts.map(c => c.buyer), ['Il Thalor']);
console.log('ok');
