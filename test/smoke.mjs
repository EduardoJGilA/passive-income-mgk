// Runs src/index.js against a minimal fake Foundry to exercise the GM-side ops end to end.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const SRC = new URL('../src/', import.meta.url), TMP = new URL('_smoke.mjs', SRC);
fs.writeFileSync(TMP, fs.readFileSync(new URL('index.js', SRC), 'utf8').replace(/^import '\.\/style\.css';\n/, '') + '\nglobalThis.__ops = ops;\n');
const hooks = {}; const store = { holdings: [], lastTs: 0, auto: false, periodDays: 7, currency: 'gp', currencyPath: '', coins: 'gp=sys.gp:1;sp=sys.sp:0.1' };
const chat = [];
const mk = (id, extra = {}) => ({ id, name: id, isGM: false, ...extra });
const gm = mk('GM', { isGM: true, isSelf: true });
const p1 = mk('P1'), actorA = { id: 'A', name: 'A', img: '', sys: { gp: 0, sp: 0 }, own: ['P1'], testUserPermission(u) { return u.isGM || this.own.includes(u.id); }, async update(o) { for (const [k, v] of Object.entries(o)) { const [, f] = k.split('.'); this.sys[f] = v; } }, async createEmbeddedDocuments() {} };
const actorB = { id: 'B', name: 'B', img: '', sys: {}, own: ['P2'], testUserPermission(u) { return u.isGM || this.own.includes(u.id); }, async update() {} };
const p2 = mk('P2');
globalThis.Hooks = { once: (n, f) => (hooks[n] = f), on: (n, f) => (hooks[n] = f) };
const mixin = B => class extends B {};
globalThis.foundry = {
  applications: { api: { ApplicationV2: class { async _prepareContext() { return {}; } }, HandlebarsApplicationMixin: mixin, DialogV2: {} } },
  utils: { deepClone: o => JSON.parse(JSON.stringify(o)), randomID: () => Math.random().toString(36).slice(2, 10), getProperty: (o, p) => p.split('.').reduce((a, k) => a?.[k], o) }
};
const users = [gm, p1, p2];
globalThis.game = {
  user: gm, users: Object.assign(users, { get: id => users.find(u => u.id === id), activeGM: gm }),
  actors: Object.assign([actorA, actorB], { get: id => [actorA, actorB].find(a => a.id === id), contents: [actorA, actorB] }),
  settings: { register: () => {}, get: (_, k) => store[k], set: async (_, k, v) => { store[k] = v; } },
  i18n: { localize: k => k, format: (k, d) => k + JSON.stringify(d), lang: 'en', has: () => true },
  modules: new Map([['passive-income-mgk', {}]]), socket: { on() {}, emit() {} }
};
globalThis.ChatMessage = { create: async m => chat.push(m.content) };
globalThis.Roll = class { constructor(f) { this.f = f; } async evaluate() { this.total = Function(`return ${this.f.replace(/(\d+)d(\d+)/g, '$1')}`)(); return this; } };
globalThis.ui = { notifications: { warn: console.warn, info: console.log, error: console.error } };
globalThis.document = { createElement: () => ({ addEventListener() {} }) };
try { await import(TMP.href); } finally { fs.unlinkSync(TMP); }
hooks.init(); hooks.ready();
const api = game.modules.get('passive-income-mgk').api;
store.holdings = [{ id: 'h1', name: 'Vin', income: '10', upkeep: '2', eventChance: 100, shares: { A: 50, B: 30 }, stats: [{ name: 'Moral', value: 10, perPoint: 1, max: 100 }], units: [{ name: 'G', count: 2, upkeep: 1, income: 0, hire: 5, max: 5 }],
  events: [{ kind: 'bad', title: 'E', text: 'x', amount: '-3', missed: '-4', fx: 'Moral+5', missedFx: 'Moral-5', weight: 1, deadline: 2, cond: 'Moral>=0', season: '' }],
  upgrades: [{ id: 'u1', name: 'Up', cost: 5, bonus: 3, time: 1, fx: 'Moral+1', offered: true, done: false, left: 0 }] }];
await api.tick();
let h = store.holdings[0];
console.log('after tick1', h.fund, h.bal, h.pending?.left, h.log.length);
await api.tick(); h = store.holdings[0];
console.log('after tick2 (deadline 2 -> still pending)', h.pending?.left);

const ops = globalThis.__ops, H = () => store.holdings[0];
assert.ok(H().pending && H().pending.left === 1, 'deadline 2: after 2nd tick left=1');
await ops.attend('h1', {}, 'P1'); // owner of A
assert.equal(H().pending, null);
assert.ok(H().stats[0].value > 10);
await ops.collect('h1', { aid: 'A' }, 'P2'); // P2 not owner of A -> no-op
const before = H().bal.A;
assert.ok(before > 0);
await ops.collect('h1', { aid: 'A' }, 'P1');
assert.equal(H().bal.A, 0);
console.log('actor A paid', actorA.sys);

// Bug 1: Saldo se conserva si falla el pago (sin moneda configurada)
H().bal.A = 42;
const savedCoins = store.coins, savedPath = store.currencyPath;
store.coins = ''; store.currencyPath = '';
await ops.collect('h1', { aid: 'A' }, 'P1');
assert.equal(H().bal.A, 42, 'saldo conservado si falla pago por falta de moneda');
store.coins = savedCoins; store.currencyPath = savedPath;
await ops.collect('h1', { aid: 'A' }, 'P1');
assert.equal(H().bal.A, 0, 'saldo cobrado tras restaurar moneda');

// collectAll para GM
H().bal.A = 15;
await ops.collectAll('h1', {}, 'GM');
assert.equal(H().bal.A, 0, 'collectAll liquida saldo');

H().fund = 50;
await ops.buy('h1', { uid: 'u1' }, 'P1');
assert.equal(H().upgrades[0].left, 1);
await Promise.all([ops.hire('h1', { i: 0 }, 'P1'), ops.hire('h1', { i: 0 }, 'P1')]); // concurrent writes must not clobber each other
assert.equal(H().units[0].count, 4);
await ops.dismiss('h1', { i: 0 }, 'P1');
assert.equal(H().units[0].count, 3);
await ops.tick();
assert.ok(H().upgrades[0].done, 'build finished');
await ops.transfer('h1', { from: 'A', to: 'B', pct: 20 }, 'P1');
assert.deepEqual([H().shares.A, H().shares.B], [30, 50]);
await ops.transfer('h1', { from: 'B', to: 'A', pct: 10 }, 'P1'); // P1 does not own B -> no-op
assert.equal(H().shares.B, 50);
await ops.sell('h1');
assert.equal(store.holdings.length, 0);
// trade: 30-day period, contract ends after 1 month and short delivery is announced; owners set price / add product
store.periodDays = 30;
store.holdings = [{ id: 'v1', name: 'Viñedo', income: '0', upkeep: '0', eventChance: 0, shares: { A: 100 },
  stats: [{ name: 'Viñas', value: 1, perPoint: 0, max: 0 }], units: [{ name: 'Vend', count: 3, upkeep: 1, income: 0, hire: 0, max: 0, cap: 'Viñas*2', prod: '10', makes: '' }],
  products: [{ name: 'Vino', unit: 'botellas', base: 2, price: 2, quality: '', demand: '0', stock: 0 }],
  contracts: [{ buyer: 'Druida', product: 'Vino', qty: 30, price: 2, months: 1 }], events: [], upgrades: [] }];
const chatBefore = chat.length;
await ops.setPrice('v1', { i: 0, price: 9 }, 'P2'); // P2 owns nothing here -> ignored
assert.equal(store.holdings[0].products[0].price, 2);
await ops.tick();
const V = store.holdings[0];
assert.equal(V.bal.A, 20 * 2 - 3 * 1, 'income = 20 bottles to the contract - upkeep of 3 workers');
assert.equal(V.products[0].stock, 0);
assert.equal(V.contracts.length, 0, 'contract expired');
assert.ok(chat.slice(chatBefore).some(m => m.includes('ContractShort')) && chat.slice(chatBefore).some(m => m.includes('ContractEnded')));
await ops.setPrice('v1', { i: 0, price: 3 }, 'P1');
await ops.addProduct('v1', { name: 'Mosto' }, 'P1');
await ops.addProduct('v1', { name: 'mosto' }, 'P1'); // duplicate ignored
assert.deepEqual([store.holdings[0].products[0].price, store.holdings[0].products.length], [3, 2]);
// staff: GM offers, owner hires (fee), wages hit income, training adds a star after N periods
const Z = () => store.holdings[0];
Z().fund = 100; Z().bal = {};
Z().staff = [{ id: 's1', name: 'Ilsa', role: 'Capataz', stars: 1, wage: 2, fee: 10, train: 20, fx: 'Viñas+1', hired: false, offered: false, left: 0 }];
await ops.hireStaff('v1', { sid: 's1' }, 'P1'); // not offered yet
assert.equal(Z().staff[0].hired, false);
await ops.offerStaff('v1', { sid: 's1' });
await ops.hireStaff('v1', { sid: 's1' }, 'P1');
assert.deepEqual([Z().staff[0].hired, Z().fund], [true, 90]);
await ops.trainStaff('v1', { sid: 's1' }, 'P1');
assert.deepEqual([Z().staff[0].left, Z().fund], [1, 70]);
await ops.trainStaff('v1', { sid: 's1' }, 'P1'); // already training -> ignored
assert.equal(Z().fund, 70);
Z().contracts = []; Z().products[0].demand = '0';
await ops.tick();
assert.deepEqual([Z().staff[0].stars, Z().staff[0].wage, Z().staff[0].left], [2, 4, 0]);
await ops.fireStaff('v1', { sid: 's1' }, 'P1');
assert.equal(Z().staff[0].hired, false);
// upgrade requirement blocks buying until met
Z().upgrades = [{ id: 'u9', name: 'Segunda terraza', cost: 10, bonus: 0, time: 0, fx: 'Viñas+4', req: 'Viñas>=3', offered: true, done: false, left: 0 }];
Z().fund = 50;
await ops.buy('v1', { uid: 'u9' }, 'P1');
assert.deepEqual([Z().upgrades[0].done, Z().fund], [false, 50]);
Z().stats[0].value = 3;
await ops.buy('v1', { uid: 'u9' }, 'P1');
assert.deepEqual([Z().upgrades[0].done, Z().fund, Z().stats[0].value], [true, 40, 7]);
// deposit: a character pays into the fund from their purse or owed balance; no overdraft
store.coins = 'gp=sys.gp:1;sp=sys.sp:0.1'; store.currencyPath = '';
actorA.sys = { gp: 12, sp: 5 };
Z().fund = 0; Z().bal = { A: 8 };
await ops.deposit('v1', { aid: 'A', n: 10, from: 'purse' }, 'P2'); // P2 does not control A
assert.equal(Z().fund, 0);
await ops.deposit('v1', { aid: 'A', n: 10.5, from: 'purse' }, 'P1');
assert.deepEqual([Z().fund, actorA.sys.gp, actorA.sys.sp], [10.5, 2, 0]);
await ops.deposit('v1', { aid: 'A', n: 50, from: 'purse' }, 'P1'); // can't afford
assert.equal(Z().fund, 10.5);
await ops.deposit('v1', { aid: 'A', n: 5, from: 'bal' }, 'P1');
assert.deepEqual([Z().fund, Z().bal.A], [15.5, 3]);
await ops.deposit('v1', { aid: 'A', n: 5, from: 'bal' }, 'P1'); // owed only 3
assert.equal(Z().fund, 15.5);
// fund-centric week: retain 100 keeps everything; payroll it can't meet makes people leave
Z().retain = 100; Z().fund = 0; Z().bal = { A: 0 }; Z().strikes = 0; Z().contracts = [];
Z().units = [{ name: 'Vend', count: 4, upkeep: 3, income: 0, hire: 0, max: 0, cap: '', prod: '0', makes: '' }];
Z().staff = [{ id: 's2', name: 'Ilsa', role: 'x', stars: 1, wage: 2, fee: 0, train: 0, fx: '', hired: true, offered: false, left: 0 }];
Z().upgrades = []; Z().unpaidFx = 'Viñas-1';
await ops.tick();
assert.deepEqual([Z().fund, Z().units[0].count, Z().staff[0].hired, Z().strikes, Z().stats[0].value], [0, 3, true, 1, 6]);
await ops.tick();
assert.deepEqual([Z().units[0].count, Z().staff[0].hired, Z().strikes], [2, false, 2]);
Z().units = []; Z().products[0].stock = 10;
await ops.tick();
assert.equal(Z().strikes, 0, 'paid period resets');
// one-off sale and payout
await ops.sellNow('v1', { i: 0, qty: 4, price: 3, buyer: 'Mercader' }, 'P1');
assert.deepEqual([Z().products[0].stock, Z().fund], [6, 12]);
await ops.sellNow('v1', { i: 0, qty: 99, price: 3 }, 'P1'); // not in stock
assert.equal(Z().fund, 12);
await ops.distribute('v1', { n: 10 }, 'P1');
assert.deepEqual([Z().fund, Z().bal.A], [2, 10]);
console.log('chat lines', chat.length, 'ok');
