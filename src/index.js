import './style.css';
import { passive, effects, credit } from './logic.js';
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const ID = 'passive-income-mgk';
const T = `modules/${ID}/templates/`;
const t = (k, d) => d ? game.i18n.format(`PIM.${k}`, d) : game.i18n.localize(`PIM.${k}`);
// fill defaults so holdings saved by older versions keep working
const get = () => foundry.utils.deepClone(game.settings.get(ID, 'holdings')).map(h => ({
  fund: h.balance ?? 0, bal: {}, stats: [], units: [], upgrades: [], events: [], income: '0', upkeep: '0', eventChance: 0, pending: null, ...h,
  shares: h.shares ?? Object.fromEntries((h.owners ?? []).map(u => [u, Math.floor(100 / h.owners.length)]))
}));
const cur = () => game.settings.get(ID, 'currency');
const fmt = n => `${n > 0 ? '+' : ''}${n} ${cur()}`;
const lines = s => String(s || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split('|').map(x => x.trim()));
const roll = async f => Math.round((await new Roll(String(f || 0)).evaluate()).total) || 0;
const bonus = h => h.upgrades.filter(u => u.done).reduce((s, u) => s + u.bonus, 0);
const say = (content, h) => ChatMessage.create({ content, whisper: [...new Set([...Object.keys(h.shares), ...game.users.filter(u => u.isGM).map(u => u.id)])] });
const owns = (h, u) => (h.shares[u] ?? 0) > 0 || game.users.get(u)?.isGM;
async function mutate(fn) { const d = get(); await fn(d); await game.settings.set(ID, 'holdings', d); }


async function pay(userId, n) {
  const a = game.users.get(userId)?.character, p = game.settings.get(ID, 'currencyPath');
  if (!a || !p) return false;
  await a.update({ [p]: (foundry.utils.getProperty(a, p) || 0) + n });
  return true;
}

const draw = (h, ev) => { h.pending = { ...(ev ?? h.events[Math.floor(Math.random() * h.events.length)]) }; return say(t('NewEvent', { name: h.name, title: h.pending.title }), h); };

const ops = {
  async tick() {
    await mutate(async d => {
      for (const h of d) {
        if (h.pending) {
          const m = await roll(h.pending.missed);
          credit(h, m);
          effects(h, h.pending.missedFx);
          await say(t('Missed', { name: h.name, title: h.pending.title, amount: fmt(m) }), h);
          h.pending = null;
        }
        for (const u of h.upgrades) if (u.left > 0 && !--u.left) { u.done = true; effects(h, u.fx); await say(t('Bought', { name: h.name, upgrade: u.name }), h); }
        const n = await roll(h.income) + bonus(h) + passive(h) - await roll(h.upkeep);
        credit(h, n);
        await say(t('Income_', { name: h.name, amount: fmt(n) }), h);
        if (h.events.length && Math.random() * 100 < h.eventChance) await draw(h);
      }
    });
  },
  fire: id => mutate(async d => { const h = d.find(x => x.id === id); if (h?.events.length) await draw(h); }),
  offer: (id, { uid }) => mutate(d => { const u = d.find(x => x.id === id)?.upgrades.find(x => x.id === uid); if (u) u.offered = !u.offered; }),
  attend: (id, _, user) => mutate(async d => {
    const h = d.find(x => x.id === id);
    if (!h?.pending || !owns(h, user)) return;
    const e = h.pending, n = await roll(e.amount);
    credit(h, n);
    effects(h, e.fx);
    h.pending = null;
    await say(t('Attended', { name: h.name, title: e.title, text: e.text, amount: fmt(n) }), h);
    const item = e.item && await fromUuid(e.item), a = game.users.get(user)?.character;
    if (item && a) await a.createEmbeddedDocuments('Item', [item.toObject()]);
  }),
  collect: (id, _, user) => mutate(async d => {
    const h = d.find(x => x.id === id), n = h?.bal[user];
    if (!n) return;
    h.bal[user] = 0;
    await pay(user, n);
    await say(t('Collected', { name: h.name, amount: `${n} ${cur()}` }), h);
  }),
  buy: (id, { uid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), u = h?.upgrades.find(x => x.id === uid);
    if (!u?.offered || u.done || u.left || h.fund < u.cost || !owns(h, user)) return;
    h.fund -= u.cost;
    if (u.time > 0) return void (u.left = u.time);
    u.done = true;
    effects(h, u.fx);
    await say(t('Bought', { name: h.name, upgrade: u.name }), h);
  }),
  hire: (id, { i }, user) => mutate(d => {
    const h = d.find(x => x.id === id), u = h?.units[i];
    if (!u || !owns(h, user) || h.fund < u.hire || (u.max && u.count >= u.max)) return;
    h.fund -= u.hire;
    u.count++;
  }),
  dismiss: (id, { i }, user) => mutate(d => {
    const h = d.find(x => x.id === id), u = h?.units[i];
    if (u?.count > 0 && owns(h, user)) u.count--;
  })
};
const GM_ONLY = new Set(['tick', 'fire', 'offer']);

function request(action, id, data = {}) {
  if (game.user.isGM) return ops[action](id, data, game.user.id);
  if (GM_ONLY.has(action)) return;
  game.socket.emit(`module.${ID}`, { action, id, data, user: game.user.id });
}

// Simple Calendar: tick once per elapsed period
async function onTime() {
  const sc = globalThis.SimpleCalendar?.api;
  if (!sc || !game.users.activeGM?.isSelf || !game.settings.get(ID, 'auto')) return;
  const now = sc.timestamp(), last = game.settings.get(ID, 'lastTs');
  const len = sc.timestampPlusInterval(0, { day: game.settings.get(ID, 'periodDays') }) || 86400;
  if (!last || now < last) return game.settings.set(ID, 'lastTs', now);
  const n = Math.min(Math.floor((now - last) / len), 12); // ponytail: cap to avoid chat flood after long jumps
  if (!n) return;
  await game.settings.set(ID, 'lastTs', last + Math.floor((now - last) / len) * len);
  for (let i = 0; i < n; i++) await ops.tick();
}

// --- UI ---
class HoldingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'pim-app', classes: ['pim-window'],
    window: { title: 'PIM.Title', icon: 'fa-solid fa-coins', resizable: true },
    position: { width: 520, height: 600 },
    actions: {
      create: () => HoldingsApp.#edit(),
      edit: (_, el) => HoldingsApp.#edit(el.closest('[data-id]').dataset.id),
      remove: HoldingsApp.#remove,
      tick: HoldingsApp.#tick,
      fire: (_, el) => request('fire', el.closest('[data-id]').dataset.id),
      attend: (_, el) => request('attend', el.closest('[data-id]').dataset.id),
      hire: (_, el) => request('hire', el.closest('[data-id]').dataset.id, { i: +el.closest('[data-i]').dataset.i }),
      dismiss: (_, el) => request('dismiss', el.closest('[data-id]').dataset.id, { i: +el.closest('[data-i]').dataset.i }),
      collect: (_, el) => request('collect', el.closest('[data-id]').dataset.id),
      buy: (_, el) => request('buy', el.closest('[data-id]').dataset.id, { uid: el.closest('[data-uid]').dataset.uid }),
      offer: (_, el) => request('offer', el.closest('[data-id]').dataset.id, { uid: el.closest('[data-uid]').dataset.uid })
    }
  };
  static PARTS = { main: { template: `${T}main.hbs`, root: true } };

  async _prepareContext(o) {
    const isGM = game.user.isGM, uid = game.user.id;
    const holdings = get().filter(h => isGM || owns(h, uid)).map(h => ({
      ...h, mine: h.bal[uid] ?? 0, incomeTxt: bonus(h) ? `${h.income || 0}+${bonus(h)}` : h.income,
      sharesTxt: Object.entries(h.shares).map(([u, p]) => `${game.users.get(u)?.name ?? '?'} ${p}%`).join(', '),
      passive: passive(h),
      units: h.units.map(u => ({ ...u, canHire: h.fund >= u.hire && (!u.max || u.count < u.max) })),
      upgrades: h.upgrades.map(u => ({ ...u, show: isGM || u.offered || u.done || u.left, afford: h.fund >= u.cost && !u.left }))
    }));
    return { ...await super._prepareContext(o), isGM, holdings, cur: cur() };
  }

  static #edit(id) { new EditApp({ hid: id }).render(true); }
  static async #remove(_, el) {
    const id = el.closest('[data-id]').dataset.id;
    if (await DialogV2.confirm({ content: t('DeleteConfirm') })) mutate(d => d.splice(d.findIndex(h => h.id === id), 1));
  }
  static async #tick() { if (await DialogV2.confirm({ content: t('TickConfirm') })) ops.tick(); }
}

class EditApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'pim-edit', tag: 'form', classes: ['pim-window'],
    window: { title: 'PIM.Edit', icon: 'fa-solid fa-pen' },
    position: { width: 480, height: 'auto' },
    form: { handler: EditApp.#submit, closeOnSubmit: true }
  };
  static PARTS = { main: { template: `${T}edit.hbs`, root: true } };

  async _prepareContext(o) {
    const h = get().find(x => x.id === this.options.hid) ?? { name: t('New'), img: 'icons/svg/house.svg', kind: '', stats: [], units: [], income: '0', upkeep: '0', eventChance: 25, shares: {}, events: [], upgrades: [] };
    return {
      ...await super._prepareContext(o), h,
      users: game.users.filter(u => !u.isGM).map(u => ({ id: u.id, name: u.name, share: h.shares[u.id] ?? 0 })),
      events: h.events.map(e => [e.kind, e.title, e.text, e.amount, e.missed, e.item, e.fx, e.missedFx].join('|')).join('\n'),
      upgrades: h.upgrades.map(u => [u.name, u.cost, u.bonus, u.desc, u.time, u.fx].join('|')).join('\n'),
      stats: h.stats.map(s => [s.name, s.value, s.perPoint, s.max].join('|')).join('\n'),
      units: h.units.map(u => [u.name, u.count, u.upkeep, u.income, u.hire, u.max].join('|')).join('\n')
    };
  }

  static async #submit(_ev, _form, fd) {
    const f = foundry.utils.expandObject(fd.object), hid = this.options.hid;
    await mutate(d => {
      const old = d.find(x => x.id === hid);
      const h = old ?? { id: foundry.utils.randomID(), fund: 0, bal: {}, pending: null };
      Object.assign(h, {
        name: f.name, img: f.img, desc: f.desc, kind: f.kind, income: f.income || '0', upkeep: f.upkeep || '0', eventChance: +f.eventChance || 0,
        shares: Object.fromEntries(Object.entries(f.share ?? {}).map(([k, v]) => [k, +v || 0]).filter(([, v]) => v > 0)),
        events: lines(f.events).map(([kind, title, text, a, m, item, fx, missedFx]) => ({ kind: kind || 'neutral', title, text: text || '', amount: a || '0', missed: m || '0', item: item || '', fx: fx || '', missedFx: missedFx || '' })),
        stats: lines(f.stats).map(([name, v, pp, max]) => ({ name, value: +v || 0, perPoint: +pp || 0, max: +max || 0 })),
        units: lines(f.units).map(([name, c, up, inc, hire, max]) => ({ name, count: +c || 0, upkeep: +up || 0, income: +inc || 0, hire: +hire || 0, max: +max || 0 })),
        upgrades: lines(f.upgrades).map(([name, cost, bonus, desc, time, fx]) => {
          const p = old?.upgrades.find(u => u.name === name);
          return { id: p?.id ?? foundry.utils.randomID(), name, cost: +cost || 0, bonus: +bonus || 0, desc: desc || '', time: +time || 0, fx: fx || '', left: p?.left ?? 0, offered: p?.offered ?? false, done: p?.done ?? false };
        })
      });
      if (!old) d.push(h);
    });
  }
}

let app;
const open = () => (app ??= new HoldingsApp()).render(true);

Hooks.once('init', () => {
  game.settings.register(ID, 'holdings', { scope: 'world', config: false, type: Array, default: [], onChange: () => { if (app?.rendered) app.render(); } });
  game.settings.register(ID, 'currency', { name: 'PIM.Currency', scope: 'world', config: true, type: String, default: 'gp' });
  game.settings.register(ID, 'auto', { name: 'PIM.Auto', hint: 'PIM.AutoHint', scope: 'world', config: true, type: Boolean, default: true });
  game.settings.register(ID, 'periodDays', { name: 'PIM.Period', scope: 'world', config: true, type: Number, default: 7 });
  game.settings.register(ID, 'lastTs', { scope: 'world', config: false, type: Number, default: 0 });
  game.settings.register(ID, 'currencyPath', { name: 'PIM.CurrencyPath', hint: 'PIM.CurrencyPathHint', scope: 'world', config: true, type: String, default: '' });
});

Hooks.once('ready', () => {
  game.modules.get(ID).api = { open, tick: () => request('tick') };
  game.socket.on(`module.${ID}`, ({ action, id, data, user }) => {
    if (game.users.activeGM?.isSelf && ops[action] && !GM_ONLY.has(action)) ops[action](id, data, user);
  });
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
