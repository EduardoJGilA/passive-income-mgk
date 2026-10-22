import './style.css';
import { r2, sum, passive, effects, credit, check, pick, seasonMult, okSeason, parseCoins, split, exportable } from './logic.js';
import { PRESETS } from './presets.js';

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const ID = 'passive-income-mgk';
const T = `modules/${ID}/templates/`;
const t = (k, d) => d ? game.i18n.format(`PIM.${k}`, d) : game.i18n.localize(`PIM.${k}`);
const set = k => game.settings.get(ID, k);
const cur = () => set('currency');
const fmt = n => `${n > 0 ? '+' : ''}${n} ${cur()}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sc = () => globalThis.SimpleCalendar?.api;
const season = () => sc()?.getCurrentSeason?.()?.name;
const stamp = () => { try { return sc().formatTimestamp(sc().timestamp()).date; } catch { return new Date().toLocaleDateString(); } };
const roll = async f => {
  try { return r2((await new Roll(String(f || 0)).evaluate()).total) || 0; } catch { ui.notifications.warn(`${ID}: bad formula "${f}"`); return 0; }
};
const bonus = h => sum(h.upgrades.filter(u => u.done), u => u.bonus);

// shares/bal are keyed by actor id; legacy user-id keys map to that user's character
const byActor = o => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [game.users.get(k)?.character?.id ?? k, v]));
const get = () => foundry.utils.deepClone(set('holdings')).map(h => ({
  fund: h.balance ?? 0, stats: [], units: [], upgrades: [], events: [], log: [], income: '0', upkeep: '0', eventChance: 0, seasons: '', value: 0, pending: null, ...h,
  shares: byActor(h.shares ?? Object.fromEntries((h.owners ?? []).map(u => [u, Math.floor(100 / h.owners.length)]))), bal: byActor(h.bal)
}));
async function mutate(fn) { const d = get(); await fn(d); await game.settings.set(ID, 'holdings', d); }

// a user acts on a holding if GM or owner of any actor holding a share
const ctl = (a, u) => game.actors.get(a)?.testUserPermission(game.users.get(u), 'OWNER');
const owns = (h, u) => game.users.get(u)?.isGM || Object.keys(h.shares).some(a => ctl(a, u));
const who = (h, u) => Object.keys(h.shares).find(a => ctl(a, u)) ?? Object.keys(h.shares)[0];
// chat (whisper to owners + GM) and per-holding log
const say = (content, h) => {
  h.log.unshift({ at: stamp(), text: content });
  h.log.length = Math.min(h.log.length, 40);
  return ChatMessage.create({ content, whisper: game.users.filter(u => owns(h, u.id)).map(u => u.id) });
};

async function pay(actorId, n) {
  const a = game.actors.get(actorId);
  const coins = parseCoins(set('coins')), list = coins.length ? coins : set('currencyPath') ? [{ path: set('currencyPath'), ratio: 1 }] : [];
  if (!a || !list.length) return false;
  const upd = {};
  for (const { path, k } of split(n, list)) upd[path] = (foundry.utils.getProperty(a, path) || 0) + k;
  await a.update(upd);
  return true;
}

const eligible = h => h.events.filter(e => check(h, e.cond) && okSeason(e.season, season()));
const draw = (h, ev) => {
  ev ??= pick(eligible(h));
  if (!ev) return;
  h.pending = { ...ev, left: +ev.deadline || 1 };
  return say(t('NewEvent', { name: h.name, title: ev.title }), h);
};

const ops = {
  async tick() {
    await mutate(async d => {
      for (const h of d) {
        if (h.pending && --h.pending.left <= 0) {
          const m = await roll(h.pending.missed);
          credit(h, m);
          effects(h, h.pending.missedFx);
          await say(t('Missed', { name: h.name, title: h.pending.title, amount: fmt(m) }), h);
          h.pending = null;
        }
        for (const u of h.upgrades) if (u.left > 0 && !--u.left) { u.done = true; effects(h, u.fx); await say(t('Bought', { name: h.name, upgrade: u.name }), h); }
        const inc = r2(await roll(h.income) * seasonMult(h.seasons, season()));
        const n = r2(inc + bonus(h) + passive(h) - await roll(h.upkeep));
        credit(h, n);
        await say(t('Income_', { name: h.name, amount: fmt(n) }), h);
        if (!h.pending && h.events.length && Math.random() * 100 < h.eventChance) await draw(h);
      }
    });
  },
  fire: id => mutate(async d => { const h = d.find(x => x.id === id); if (h) await draw(h); }),
  offer: (id, { uid }) => mutate(d => { const u = d.find(x => x.id === id)?.upgrades.find(x => x.id === uid); if (u) u.offered = !u.offered; }),
  attend: (id, _, user) => mutate(async d => {
    const h = d.find(x => x.id === id);
    if (!h?.pending || !owns(h, user)) return;
    const e = h.pending, n = await roll(e.amount);
    credit(h, n);
    effects(h, e.fx);
    h.pending = null;
    await say(t('Attended', { name: h.name, title: e.title, text: e.text, amount: fmt(n) }), h);
    const item = e.item && await fromUuid(e.item), a = game.actors.get(who(h, user));
    if (item && a) await a.createEmbeddedDocuments('Item', [item.toObject()]);
  }),
  collect: (id, { aid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), n = h?.bal[aid];
    if (!n || !(ctl(aid, user) || game.users.get(user)?.isGM)) return;
    h.bal[aid] = 0;
    await pay(aid, n);
    await say(t('Collected', { name: h.name, amount: `${n} ${cur()}` }), h);
  }),
  buy: (id, { uid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), u = h?.upgrades.find(x => x.id === uid);
    if (!u?.offered || u.done || u.left || h.fund < u.cost || !owns(h, user)) return;
    h.fund = r2(h.fund - u.cost);
    if (u.time > 0) return void (u.left = u.time);
    u.done = true;
    effects(h, u.fx);
    await say(t('Bought', { name: h.name, upgrade: u.name }), h);
  }),
  hire: (id, { i }, user) => mutate(d => {
    const h = d.find(x => x.id === id), u = h?.units[i];
    if (!u || !owns(h, user) || h.fund < u.hire || (u.max && u.count >= u.max)) return;
    h.fund = r2(h.fund - u.hire);
    u.count++;
  }),
  dismiss: (id, { i }, user) => mutate(d => {
    const h = d.find(x => x.id === id), u = h?.units[i];
    if (u?.count > 0 && owns(h, user)) u.count--;
  }),
  // move part of a share (and its pending balance) from one actor to another
  transfer: (id, { from, to, pct }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), have = h?.shares[from];
    pct = Math.min(+pct, have);
    if (!have || !(pct > 0) || from === to || !game.actors.get(to) || !(ctl(from, user) || game.users.get(user)?.isGM)) return;
    const frac = pct / have, b = h.bal[from] ?? 0;
    h.bal[to] = r2((h.bal[to] ?? 0) + b * frac);
    h.bal[from] = r2(b * (1 - frac));
    h.shares[to] = (h.shares[to] ?? 0) + pct;
    h.shares[from] -= pct;
    if (h.shares[from] <= 0) { delete h.shares[from]; delete h.bal[from]; }
    await say(t('Transferred', { name: h.name, from: game.actors.get(from).name, to: game.actors.get(to).name, pct }), h);
  }),
  // pay everyone: pending balances + (sale value + fund) by share, then remove
  sell: id => mutate(async d => {
    const i = d.findIndex(x => x.id === id), h = d[i];
    if (!h) return;
    const pool = r2((+h.value || 0) + h.fund), total = sum(Object.values(h.shares), x => x) || 1;
    for (const [a, p] of Object.entries(h.shares)) await pay(a, r2((h.bal[a] ?? 0) + pool * p / total));
    await say(t('Sold', { name: h.name, amount: `${r2(pool + sum(Object.values(h.bal), x => x))} ${cur()}` }), h);
    d.splice(i, 1);
  })
};
const GM_ONLY = new Set(['tick', 'fire', 'offer', 'sell']);

function request(action, id, data = {}) {
  if (game.user.isGM) return ops[action](id, data, game.user.id);
  if (GM_ONLY.has(action)) return;
  game.socket.emit(`module.${ID}`, { action, id, data, user: game.user.id });
}

// Simple Calendar: tick once per elapsed period
async function onTime() {
  const api = sc();
  if (!api || !game.users.activeGM?.isSelf || !set('auto')) return;
  const now = api.timestamp(), last = set('lastTs');
  const len = api.timestampPlusInterval(0, { day: set('periodDays') }) || 86400;
  if (!last || now < last) return game.settings.set(ID, 'lastTs', now);
  const n = Math.min(Math.floor((now - last) / len), 12); // ponytail: cap to avoid chat flood after long jumps
  if (!n) return;
  await game.settings.set(ID, 'lastTs', last + Math.floor((now - last) / len) * len);
  for (let i = 0; i < n; i++) await ops.tick();
}

// --- view model ---
function view(uid) {
  const isGM = game.users.get(uid).isGM;
  const holdings = get().filter(h => owns(h, uid)).map(h => ({
    ...h, incomeTxt: bonus(h) ? `${h.income || 0}+${bonus(h)}` : h.income, passive: passive(h), log: h.log.slice(0, 15),
    owners: Object.entries(h.shares).map(([id, share]) => {
      const a = game.actors.get(id), bal = h.bal[id] ?? 0, mine = isGM || ctl(id, uid);
      return { id, name: a?.name ?? '?', img: a?.img, share, bal, canCollect: bal > 0 && mine, canMove: mine };
    }),
    units: h.units.map(u => ({ ...u, canHire: h.fund >= u.hire && (!u.max || u.count < u.max) })),
    upgrades: h.upgrades.map(u => ({ ...u, show: isGM || u.offered || u.done || u.left, afford: h.fund >= u.cost && !u.left }))
  }));
  const sm = {
    events: holdings.filter(h => h.pending).length,
    builds: sum(holdings, h => h.upgrades.filter(u => u.offered && !u.done && !u.left && u.afford).length),
    collect: r2(sum(holdings, h => sum(h.owners.filter(o => o.canCollect), o => o.bal)))
  };
  sm.any = !!(sm.events || sm.builds || sm.collect);
  return { isGM, holdings, summary: sm };
}

// --- UI ---
class HoldingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'pim-app', classes: ['pim-window'],
    window: { title: 'PIM.Title', icon: 'fa-solid fa-coins', resizable: true },
    position: { width: 780, height: 780 },
    actions: {
      create: HoldingsApp.#create,
      edit: (_, el) => new EditApp({ hid: HoldingsApp.#id(el) }).render(true),
      remove: HoldingsApp.#remove,
      tick: HoldingsApp.#tick,
      sell: HoldingsApp.#sell,
      export: HoldingsApp.#export,
      import: HoldingsApp.#import,
      transfer: HoldingsApp.#transfer,
      fire: (_, el) => request('fire', HoldingsApp.#id(el)),
      attend: (_, el) => request('attend', HoldingsApp.#id(el)),
      collect: (_, el) => request('collect', HoldingsApp.#id(el), { aid: el.dataset.aid }),
      buy: (_, el) => request('buy', HoldingsApp.#id(el), { uid: el.closest('[data-uid]').dataset.uid }),
      offer: (_, el) => request('offer', HoldingsApp.#id(el), { uid: el.closest('[data-uid]').dataset.uid }),
      hire: (_, el) => request('hire', HoldingsApp.#id(el), { i: +el.closest('[data-i]').dataset.i }),
      dismiss: (_, el) => request('dismiss', HoldingsApp.#id(el), { i: +el.closest('[data-i]').dataset.i })
    }
  };
  static PARTS = { main: { template: `${T}main.hbs`, root: true } };
  static #id = el => el.closest('[data-id]').dataset.id;

  async _prepareContext(o) { return { ...await super._prepareContext(o), ...view(game.user.id), cur: cur() }; }

  static async #create() {
    const opts = PRESETS().map(p => `<option value="${p.key}">${esc(p.name)}</option>`).join('');
    const key = await DialogV2.prompt({
      window: { title: t('New') }, rejectClose: false,
      content: `<div class="form-group"><label>${t('Preset')}</label><div class="form-fields"><select name="p"><option value="">${t('Blank')}</option>${opts}</select></div></div>`,
      ok: { label: t('New'), callback: (_, b) => b.form.elements.p.value }
    });
    if (key !== null && key !== undefined) new EditApp({ preset: key }).render(true);
  }
  static async #remove(_, el) {
    const id = HoldingsApp.#id(el);
    if (await DialogV2.confirm({ content: t('DeleteConfirm') })) mutate(d => d.splice(d.findIndex(h => h.id === id), 1));
  }
  static async #sell(_, el) { if (await DialogV2.confirm({ content: t('SellConfirm') })) request('sell', HoldingsApp.#id(el)); }
  static async #tick() { if (await DialogV2.confirm({ content: t('TickConfirm') })) ops.tick(); }
  static #export(_, el) {
    const h = get().find(x => x.id === HoldingsApp.#id(el));
    foundry.utils.saveDataToFile(JSON.stringify(exportable(h), null, 2), 'application/json', `${h.name}.json`);
  }
  static async #import() {
    const file = await DialogV2.prompt({
      window: { title: t('Import') }, rejectClose: false,
      content: '<div class="form-group"><input type="file" name="f" accept=".json"></div>',
      ok: { label: t('Import'), callback: (_, b) => b.form.elements.f.files[0] }
    });
    if (!file) return;
    try {
      const o = JSON.parse(await foundry.utils.readTextFromFile(file));
      if (!o.name) throw new Error('name');
      await mutate(d => d.push({
        ...o, id: foundry.utils.randomID(), fund: 0, bal: {}, shares: {}, pending: null, log: [],
        upgrades: (o.upgrades ?? []).map(u => ({ ...u, id: foundry.utils.randomID(), offered: false, done: false, left: 0 }))
      }));
    } catch { ui.notifications.error(t('ImportErr')); }
  }
  static async #transfer(_, el) {
    const id = HoldingsApp.#id(el), from = el.closest('[data-aid]').dataset.aid;
    const opts = game.actors.contents.filter(a => a.id !== from).sort((a, b) => a.name.localeCompare(b.name)).map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
    const r = await DialogV2.prompt({
      window: { title: t('Transfer') }, rejectClose: false,
      content: `<div class="form-group"><label>${t('F.actor')}</label><div class="form-fields"><select name="to">${opts}</select></div></div>
        <div class="form-group"><label>${t('F.pct')}</label><div class="form-fields"><input type="number" name="pct" value="10" min="1" max="100"></div></div>`,
      ok: { label: t('Transfer'), callback: (_, b) => ({ to: b.form.elements.to.value, pct: +b.form.elements.pct.value }) }
    });
    if (r) request('transfer', id, { from, ...r });
  }
}

// --- editor: scalar fields via form data, row sections read straight from the DOM ---
const kinds = () => [['good', t('K.good')], ['neutral', t('K.neutral')], ['bad', t('K.bad')]];
const C = (k, span, type = 'text', o = {}) => ({ k, span, type, ...o });
const SECS = {
  owners: [C('actor', 4, 'select', { opts: () => game.actors.contents.map(a => [a.id, a.name]).sort((a, b) => a[1].localeCompare(b[1])).concat([['', '—']]) }), C('pct', 2, 'number', { def: 0 })],
  stats: [C('name', 3), C('value', 1, 'number', { def: 0 }), C('perPoint', 1, 'number', { def: 0 }), C('max', 1, 'number', { def: 0 })],
  units: [C('name', 2), C('count', 1, 'number', { def: 0 }), C('upkeep', 1, 'number', { def: 0 }), C('income', 1, 'number', { def: 0 }), C('hire', 1, 'number', { def: 0 }), C('max', 1, 'number', { def: 0 })],
  upgrades: [C('name', 3), C('cost', 1, 'number', { def: 0 }), C('bonus', 1, 'number', { def: 0 }), C('time', 1, 'number', { def: 0 }), C('fx', 3), C('desc', 3)],
  events: [C('kind', 2, 'select', { opts: kinds, def: 'neutral' }), C('title', 4), C('text', 6), C('amount', 2, 'text', { def: '0' }), C('missed', 2, 'text', { def: '0' }), C('weight', 1, 'number', { def: 1 }),
    C('deadline', 1, 'number', { def: 1 }), C('fx', 3), C('missedFx', 3), C('cond', 3), C('season', 2), C('item', 4)]
};
const field = (sec, c, v) => `<label class="pim-f" style="grid-column:span ${c.span * 2}"><span>${t(`F.${c.k}`)}</span>${
  c.type === 'select'
    ? `<select data-k="${c.k}">${c.opts().map(([val, lab]) => `<option value="${esc(val)}" ${val == v ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`
    : `<input data-k="${c.k}" type="${c.type}" ${c.type === 'number' ? 'step="any"' : ''} value="${esc(v)}">`}</label>`;
const row = (sec, o) => `<div class="pim-tr">${SECS[sec].map(c => field(sec, c, o?.[c.k] ?? c.def ?? '')).join('')}<button type="button" data-action="delRow" title="${t('Delete')}"><i class="fa-solid fa-trash"></i></button></div>`;

class EditApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'pim-edit', tag: 'form', classes: ['pim-window'],
    window: { title: 'PIM.Edit', icon: 'fa-solid fa-pen', resizable: true },
    position: { width: 760, height: 780 },
    actions: {
      addRow(_, el) { const f = el.closest('fieldset'); f.querySelector('.pim-rows').append(f.querySelector('template').content.cloneNode(true)); },
      delRow(_, el) { el.closest('.pim-tr').remove(); }
    },
    form: { handler: EditApp.#submit, closeOnSubmit: true }
  };
  static PARTS = { main: { template: `${T}edit.hbs`, root: true } };

  #base() {
    const { hid, preset } = this.options;
    return get().find(x => x.id === hid)
      ?? (preset && foundry.utils.deepClone(PRESETS().find(p => p.key === preset)))
      ?? { name: t('New'), kind: '', income: '0', upkeep: '0', eventChance: 25, seasons: '', value: 0, stats: [], units: [], events: [], upgrades: [] };
  }

  async _prepareContext(o) {
    const h = { img: 'icons/svg/house.svg', desc: '', shares: {}, ...this.#base() };
    const data = { ...h, owners: Object.entries(h.shares).map(([actor, pct]) => ({ actor, pct })) };
    return {
      ...await super._prepareContext(o), h,
      sections: Object.keys(SECS).map(key => ({ key, title: t(`Sec.${key}`), hint: game.i18n.has(`PIM.Hint.${key}`) ? t(`Hint.${key}`) : '', rows: data[key].map(r => row(key, r)).join(''), tpl: row(key) }))
    };
  }

  static async #submit(_ev, form, fd) {
    const f = fd.object, hid = this.options.hid;
    const rows = sec => [...form.querySelectorAll(`.pim-rows[data-sec="${sec}"] .pim-tr`)]
      .map(tr => Object.fromEntries([...tr.querySelectorAll('[data-k]')].map(i => [i.dataset.k, i.value])));
    const num = (r, ...ks) => Object.fromEntries(ks.map(k => [k, +r[k] || 0]));
    await mutate(d => {
      const old = d.find(x => x.id === hid);
      const h = old ?? { id: foundry.utils.randomID(), fund: 0, bal: {}, pending: null, log: [] };
      const shares = {};
      for (const r of rows('owners')) if (r.actor && +r.pct > 0) shares[r.actor] = (shares[r.actor] ?? 0) + +r.pct;
      Object.assign(h, {
        name: f.name, img: f.img, desc: f.desc, kind: f.kind, income: f.income || '0', upkeep: f.upkeep || '0',
        eventChance: +f.eventChance || 0, seasons: f.seasons, value: +f.value || 0, shares,
        stats: rows('stats').filter(r => r.name).map(r => ({ name: r.name, ...num(r, 'value', 'perPoint', 'max') })),
        units: rows('units').filter(r => r.name).map(r => ({ name: r.name, ...num(r, 'count', 'upkeep', 'income', 'hire', 'max') })),
        events: rows('events').filter(r => r.title).map(r => ({ ...r, ...num(r, 'weight', 'deadline'), amount: r.amount || '0', missed: r.missed || '0' })),
        upgrades: rows('upgrades').filter(r => r.name).map(r => {
          const p = old?.upgrades.find(u => u.name === r.name);
          return { id: p?.id ?? foundry.utils.randomID(), name: r.name, desc: r.desc, fx: r.fx, ...num(r, 'cost', 'bonus', 'time'), offered: p?.offered ?? false, done: p?.done ?? false, left: p?.left ?? 0 };
        })
      });
      if (!old) d.push(h);
    });
  }
}

let app;
const open = () => (app ??= new HoldingsApp()).render(true);

Hooks.once('init', () => {
  const cfg = (key, type, def, extra = {}) => game.settings.register(ID, key, { name: `PIM.S.${key}`, hint: `PIM.S.${key}Hint`, scope: 'world', config: true, type, default: def, ...extra });
  game.settings.register(ID, 'holdings', { scope: 'world', config: false, type: Array, default: [], onChange: () => { if (app?.rendered) app.render(); } });
  game.settings.register(ID, 'lastTs', { scope: 'world', config: false, type: Number, default: 0 });
  cfg('auto', Boolean, true);
  cfg('periodDays', Number, 7);
  cfg('currency', String, 'gp');
  cfg('currencyPath', String, '');
  cfg('coins', String, '');
});

Hooks.once('ready', () => {
  game.modules.get(ID).api = { open, tick: () => request('tick') };
  game.socket.on(`module.${ID}`, ({ action, id, data, user }) => {
    if (game.users.activeGM?.isSelf && ops[action] && !GM_ONLY.has(action)) ops[action](id, data, user);
  });
  if (!game.user.isGM) {
    const s = view(game.user.id).summary;
    if (s.any) ui.notifications.info(t('Notice', s));
  }
});

Hooks.on('simple-calendar-date-time-change', onTime);
Hooks.on('renderActorDirectory', (_, el) => {
  if (el.querySelector('.pim-open')) return;
  const b = Object.assign(document.createElement('button'), { type: 'button', className: 'pim-open', innerHTML: `<i class="fa-solid fa-coins"></i> ${t('Open')}` });
  b.addEventListener('click', open);
  el.querySelector('header')?.append(b);
});
Hooks.on('getSceneControlButtons', c => {
  c.tokens?.tools && (c.tokens.tools[ID] = { name: ID, title: 'PIM.Open', icon: 'fa-solid fa-coins', button: true, order: 99, onChange: open });
});
