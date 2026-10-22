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
// trade: 30-day period, contract ends after 1 month and short delivery is announced
store.periodDays = 30;
store.holdings = [{ id: 'v1', name: 'Viñedo', income: '0', upkeep: '0', eventChance: 0, shares: { A: 100 }, good: 'botellas', spot: 0,
  stats: [{ name: 'Viñas', value: 1, perPoint: 0, max: 0 }], units: [{ name: 'Vend', count: 3, upkeep: 1, income: 0, hire: 0, max: 0, cap: 'Viñas*2', prod: 10 }],
  contracts: [{ buyer: 'Druida', qty: 30, price: 2, months: 1 }], events: [], upgrades: [] }];
const chatBefore = chat.length;
await ops.tick();
const V = store.holdings[0];
assert.equal(V.bal.A, 20 * 2 - 3 * 1, 'income = 20 bottles sold - upkeep of 3 workers');
assert.equal(V.contracts.length, 0, 'contract expired');
assert.ok(chat.slice(chatBefore).some(m => m.includes('ContractShort')) && chat.slice(chatBefore).some(m => m.includes('ContractEnded')));
console.log('chat lines', chat.length, 'ok');
