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

async function applyLanguage(l) {
  if (typeof fetch !== 'function' || !globalThis.game?.modules?.get(ID)) return;
  try {
    l ??= set('language') || 'auto';
    const code = (l === 'auto' ? game.i18n.lang : l) === 'es' ? 'es' : 'en';
    const res = await fetch(`modules/${ID}/lang/${code}.json`);
    if (res.ok) {
      const json = await res.json();
      foundry.utils.mergeObject(game.i18n.translations, json);
    }
  } catch {}
}

// shares/bal are keyed by actor id; legacy user-id keys map to that user's character
const byActor = o => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [game.users.get(k)?.character?.id ?? k, v]));
const get = () => foundry.utils.deepClone(set('holdings')).map(h => ({
  fund: h.balance ?? 0, stats: [], units: [], upgrades: [], events: [], log: [], income: '0', upkeep: '0', eventChance: 0, seasons: '', value: 0, pending: null, ...h,
  shares: byActor(h.shares ?? Object.fromEntries((h.owners ?? []).map(u => [u, Math.floor(100 / h.owners.length)]))), bal: byActor(h.bal)
}));
// serialized read-modify-write: ops await rolls/chat, so concurrent ones would overwrite each other
let queue = Promise.resolve();
const mutate = fn => (queue = queue.catch(() => {}).then(async () => { const d = get(); await fn(d); await game.settings.set(ID, 'holdings', d); }));

// a user acts on a holding if GM or owner of any actor holding a share
const ctl = (a, u) => game.actors.get(a)?.testUserPermission(game.users.get(u), 'OWNER');
const owns = (h, u) => game.users.get(u)?.isGM || Object.keys(h.shares).some(a => ctl(a, u));
const who = (h, u) => Object.keys(h.shares).find(a => ctl(a, u)) ?? Object.keys(h.shares)[0];
// chat (whisper to owners + GM) and per-holding log
const say = (content, h) => {
  h.log.unshift({ at: stamp(), text: content });
  h.log.length = Math.min(h.log.length, 40);
  return ChatMessage.create({ content: esc(content), whisper: game.users.filter(u => owns(h, u.id)).map(u => u.id) });
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
  if (!ev) return false;
  h.pending = { ...ev, left: +ev.deadline || 1 };
  return say(t('NewEvent', { name: h.name, title: ev.title }), h).then(() => true);
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
  fire: id => mutate(async d => { const h = d.find(x => x.id === id); if (h && !await draw(h)) ui.notifications.warn(t('NoEvents')); }),
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
  if (!game.users.activeGM) return ui.notifications.warn(t('NoGM'));
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
    stats: h.stats.map(x => ({ ...x, pct: x.max ? Math.min(100, Math.round(x.value / x.max * 100)) : null })),
    units: h.units.map(u => ({ ...u, canHire: h.fund >= u.hire && (!u.max || u.count < u.max) })),
    upgrades: h.upgrades.map(u => ({ ...u, show: isGM || u.offered || u.done || u.left, afford: h.fund >= u.cost && !u.left, pct: u.time ? Math.round((u.time - u.left) / u.time * 100) : 0 }))
  })).map(h => ({
    ...h, upgrades: h.upgrades.filter(u => u.show),
    ready: h.upgrades.filter(u => u.offered && !u.done && !u.left && u.afford).length,
    due: r2(sum(h.owners.filter(o => o.canCollect), o => o.bal))
  }));
  const sm = {
    events: holdings.filter(h => h.pending).length,
    builds: sum(holdings, h => h.ready),
    collect: r2(sum(holdings, h => h.due))
  };
  sm.any = !!(sm.events || sm.builds || sm.collect);
  return { isGM, holdings, summary: sm };
}

// --- UI ---
class HoldingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'pim-app', classes: ['pim-window'],
    window: { title: 'PIM.Title', icon: 'fa-solid fa-coins', resizable: true },
    position: { width: 960, height: 720 },
    actions: {
      select(_, el) { this.sel = el.dataset.id; this.render(); },
      goTab(_, el) { this.tab = el.dataset.tab; this.render(); },
      filterHoldings(_, el) {
        const q = el.value.trim().toLowerCase();
        for (const item of this.element.querySelectorAll('.pim-item')) {
          const match = !q || item.querySelector('.pim-item-txt').textContent.toLowerCase().includes(q);
          item.style.display = match ? '' : 'none';
        }
      },
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
  static PARTS = { main: { template: `${T}main.hbs`, root: true, scrollable: ['.pim-side', '.pim-pane'] } };
  static #id = el => el.closest('[data-id]').dataset.id;

  sel = null;
  tab = 'overview';

  async _prepareContext(o) {
    const v = view(game.user.id), h = v.holdings.find(x => x.id === this.sel) ?? v.holdings[0];
    this.sel = h?.id;
    const icons = { overview: 'fa-gauge-high', owners: 'fa-users', units: 'fa-people-group', builds: 'fa-hammer', log: 'fa-scroll' };
    const tabs = Object.entries(icons).map(([id, icon]) => ({ id, icon, label: t(`Tab.${id}`), active: this.tab === id }));
    return { ...await super._prepareContext(o), ...v, h, tabs, tab: this.tab, cur: cur() };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector('.pim-side-search input');
    if (search && !search.hasAttribute('data-bound')) {
      search.setAttribute('data-bound', '1');
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        for (const item of this.element.querySelectorAll('.pim-item')) {
          const match = !q || item.querySelector('.pim-item-txt').textContent.toLowerCase().includes(q);
          item.style.display = match ? '' : 'none';
        }
      });
    }
  }

  static async #create() {
    const list = PRESETS();
    const blankHtml = `
      <label class="pim-preset-card selected" data-key="" onclick="for(const c of this.closest('.pim-preset-grid').querySelectorAll('.pim-preset-card'))c.classList.remove('selected');this.classList.add('selected');" ondblclick="const r=this.querySelector('.pim-preset-radio');if(r)r.checked=true;this.closest('form')?.querySelector('button.ok,button[data-action=\\'ok\\']')?.click();">
        <input type="radio" name="p" value="" checked class="pim-preset-radio">
        <div class="pim-preset-icon"><i class="fa-solid fa-feather-pointed"></i></div>
        <div class="pim-preset-info">
          <div class="pim-preset-title"><b>${t('Blank')}</b> <span class="pim-pill">${t('Custom')}</span></div>
          <p class="pim-preset-desc">${t('BlankDesc')}</p>
        </div>
      </label>`;
    const cardsHtml = list.map(p => `
      <label class="pim-preset-card" data-key="${esc(p.key)}" onclick="for(const c of this.closest('.pim-preset-grid').querySelectorAll('.pim-preset-card'))c.classList.remove('selected');this.classList.add('selected');" ondblclick="const r=this.querySelector('.pim-preset-radio');if(r)r.checked=true;this.closest('form')?.querySelector('button.ok,button[data-action=\\'ok\\']')?.click();">
        <input type="radio" name="p" value="${esc(p.key)}" class="pim-preset-radio">
        <div class="pim-preset-icon"><i class="fa-solid ${p.icon || 'fa-building'}"></i></div>
        <div class="pim-preset-info">
          <div class="pim-preset-title"><b>${esc(p.name)}</b> <span class="pim-pill">${esc(p.kind)}</span></div>
          <p class="pim-preset-desc">${esc(p.desc)}</p>
          <div class="pim-preset-stats">
            <span><i class="fa-solid fa-coins"></i> ${esc(p.income)}</span>
            <span><i class="fa-solid fa-arrow-trend-down"></i> ${esc(p.upkeep)}</span>
            <span><i class="fa-solid fa-users"></i> ${p.units?.length || 0}</span>
            <span><i class="fa-solid fa-hammer"></i> ${p.upgrades?.length || 0}</span>
            <span><i class="fa-solid fa-bolt"></i> ${p.events?.length || 0}</span>
          </div>
        </div>
      </label>`).join('');

    const content = `
      <div class="pim-preset-picker">
        <div class="pim-preset-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="search" class="pim-preset-filter-input" placeholder="${t('FilterTemplates')}" autocomplete="off" oninput="const q=this.value.trim().toLowerCase();for(const c of this.closest('.pim-preset-picker').querySelectorAll('.pim-preset-card'))c.style.display=!q||c.textContent.toLowerCase().includes(q)?'':'none';">
        </div>
        <div class="pim-preset-grid">${blankHtml}${cardsHtml}</div>
      </div>`;

    let hookId;
    const bindDialog = (dialog, html) => {
      const root = html ?? dialog?.element;
      if (!root?.querySelector?.('.pim-preset-picker')) return;
      if (hookId && globalThis.Hooks?.off) Hooks.off('renderDialogV2', hookId);
      const filter = root.querySelector('.pim-preset-filter-input');
      const cards = root.querySelectorAll('.pim-preset-card');
      filter?.addEventListener('input', () => {
        const q = filter.value.trim().toLowerCase();
        for (const c of cards) c.style.display = !q || c.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      for (const card of cards) {
        card.addEventListener('click', () => {
          for (const c of cards) c.classList.remove('selected');
          card.classList.add('selected');
          const radio = card.querySelector('.pim-preset-radio');
          if (radio) radio.checked = true;
        });
        card.addEventListener('dblclick', () => {
          const radio = card.querySelector('.pim-preset-radio');
          if (radio) radio.checked = true;
          root.querySelector('button[data-action="ok"], button.ok')?.click();
        });
      }
    };
    hookId = Hooks.on('renderDialogV2', bindDialog);

    const key = await DialogV2.prompt({
      window: { title: t('TemplateSelect'), icon: 'fa-solid fa-shapes' },
      classes: ['pim-window', 'pim-preset-dialog'],
      position: { width: 840, height: 600 },
      rejectClose: false,
      content,
      ok: {
        label: t('SelectTemplate'),
        callback: (_, b) => {
          const checked = b.form?.querySelector?.('.pim-preset-radio:checked');
          return checked ? checked.value : (b.form ? new FormData(b.form).get('p') : '') ?? '';
        }
      }
    });
    if (hookId && globalThis.Hooks?.off) Hooks.off('renderDialogV2', hookId);
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
      const arr = k => (Array.isArray(o[k]) ? o[k] : []);
      await mutate(d => d.push({
        name: String(o.name), img: o.img, desc: o.desc, kind: o.kind, income: o.income, upkeep: o.upkeep, eventChance: o.eventChance, seasons: o.seasons, value: o.value,
        stats: arr('stats'), units: arr('units'), events: arr('events'), id: foundry.utils.randomID(), fund: 0, bal: {}, shares: {}, pending: null, log: [],
        upgrades: arr('upgrades').map(u => ({ ...u, id: foundry.utils.randomID(), offered: false, done: false, left: 0 }))
      }));
    } catch { ui.notifications.error(t('ImportErr')); }
  }
  static async #transfer(_, el) {
    const id = HoldingsApp.#id(el), from = el.closest('[data-aid]').dataset.aid;
    const opts = game.actors.contents.filter(a => a.id !== from).sort((a, b) => a.name.localeCompare(b.name)).map(a => `<option value="${a.id}" data-name="${esc(a.name.toLowerCase())}">${esc(a.name)}</option>`).join('');
    const r = await DialogV2.prompt({
      window: { title: t('Transfer') }, rejectClose: false,
      content: `<div class="form-group"><label>${t('F.actor')}</label><div class="form-fields" style="flex-direction:column;align-items:stretch"><input type="search" class="pim-transfer-search" placeholder="${t('SearchActor')}" style="margin-bottom:6px" oninput="const q=this.value.trim().toLowerCase();for(const opt of this.nextElementSibling.options)opt.hidden=q&&!opt.dataset.name.includes(q);"><select name="to" size="6" style="width:100%">${opts}</select></div></div>
        <div class="form-group"><label>${t('F.pct')}</label><div class="form-fields"><input type="number" name="pct" value="10" min="1" max="100"></div></div>`,
      ok: { label: t('Transfer'), callback: (_, b) => ({ to: b.form.elements.to.value, pct: +b.form.elements.pct.value }) }
    });
    if (r?.to) request('transfer', id, { from, ...r });
  }
}

// --- editor: scalar fields via form data, row sections read straight from the DOM ---
const PANE = { owners: 'owners', stats: 'mgmt', units: 'mgmt', upgrades: 'mgmt', events: 'events' };
const kinds = () => [['good', t('K.good')], ['neutral', t('K.neutral')], ['bad', t('K.bad')]];
const C = (k, span, type = 'text', o = {}) => ({ k, span, type, ...o });
const SECS = {
  owners: [C('actor', 4, 'actor', { icon: 'fa-user' }), C('pct', 2, 'number', { def: 0, icon: 'fa-percent', ph: '0' })],
  stats: [
    C('name', 3, 'text', { icon: 'fa-tag', ph: 'e.g. Morale' }),
    C('value', 1, 'number', { def: 0, icon: 'fa-hashtag', ph: '0' }),
    C('perPoint', 1, 'number', { def: 0, icon: 'fa-chart-line', ph: '0' }),
    C('max', 1, 'number', { def: 0, icon: 'fa-arrows-left-right', ph: '100' })
  ],
  units: [
    C('name', 2, 'text', { icon: 'fa-user-shield', ph: 'e.g. Guard' }),
    C('count', 1, 'number', { def: 0, icon: 'fa-users', ph: '0' }),
    C('upkeep', 1, 'number', { def: 0, icon: 'fa-arrow-trend-down', ph: '0' }),
    C('income', 1, 'number', { def: 0, icon: 'fa-arrow-trend-up', ph: '0' }),
    C('hire', 1, 'number', { def: 0, icon: 'fa-coins', ph: '0' }),
    C('max', 1, 'number', { def: 0, icon: 'fa-shield', ph: '0' })
  ],
  upgrades: [
    C('name', 3, 'text', { icon: 'fa-tag', ph: 'e.g. Stone Wall' }),
    C('cost', 1, 'number', { def: 0, icon: 'fa-coins', ph: '500' }),
    C('bonus', 1, 'number', { def: 0, icon: 'fa-chart-line', ph: '15' }),
    C('time', 1, 'number', { def: 0, icon: 'fa-hourglass-start', ph: '2' }),
    C('desc', 3, 'text', { icon: 'fa-align-left', ph: 'Description of upgrade...' }),
    C('fx', 3, 'text', { icon: 'fa-wand-magic-sparkles', ph: 'e.g. Morale+5;Defense+10' })
  ],
  events: [
    C('kind', 2, 'select', { opts: kinds, def: 'neutral', icon: 'fa-circle-dot' }),
    C('title', 4, 'text', { icon: 'fa-heading', ph: 'Event title...' }),
    C('weight', 1, 'number', { def: 1, icon: 'fa-scale-balanced', ph: '1' }),
    C('deadline', 1, 'number', { def: 1, icon: 'fa-clock', ph: '1' }),
    C('text', 6, 'text', { icon: 'fa-scroll', ph: 'Event narrative text...' }),
    C('amount', 2, 'text', { def: '0', icon: 'fa-hand-holding-dollar', ph: '3d10*5 or 50' }),
    C('missed', 2, 'text', { def: '0', icon: 'fa-skull', ph: '-2d6*5 or -20' }),
    C('item', 2, 'text', { icon: 'fa-box-open', ph: 'Compendium.pack.Item.xyz' }),
    C('cond', 3, 'text', { icon: 'fa-filter', ph: 'e.g. Defense<30;Fund>100' }),
    C('season', 3, 'text', { icon: 'fa-cloud-sun', ph: 'e.g. Fall, Winter' }),
    C('fx', 3, 'text', { icon: 'fa-wand-magic-sparkles', ph: 'e.g. Morale+5;Guards-2' }),
    C('missedFx', 3, 'text', { icon: 'fa-triangle-exclamation', ph: 'e.g. Morale-10;Pickers-2' })
  ]
};

const field = (sec, c, v) => {
  if (c.type === 'actor') {
    const a = game.actors.get(v);
    const name = a?.name ?? '';
    const img = a?.img || 'icons/svg/mystery-man.svg';
    return `<div class="pim-f pim-f-actor"><label><span>${c.icon ? `<i class="fa-solid ${c.icon}"></i> ` : ''}${t(`F.${c.k}`)}</span></label><div class="pim-actor-picker" data-id="${esc(v)}"><input type="hidden" data-k="actor" value="${esc(v)}"><div class="pim-actor-box"><img class="pim-actor-avatar" src="${esc(img)}" alt=""><input type="text" class="pim-actor-search" value="${esc(name)}" placeholder="${t('SearchActor')}"><button type="button" class="pim-actor-clear ${v ? '' : 'hidden'}" title="Clear"><i class="fa-solid fa-xmark"></i></button></div><div class="pim-actor-popover hidden"></div></div></div>`;
  }
  return `<label class="pim-f pim-f-${c.k}"><span>${c.icon ? `<i class="fa-solid ${c.icon}"></i> ` : ''}${t(`F.${c.k}`)}</span>${
    c.type === 'select'
      ? `<select data-k="${c.k}">${c.opts().map(([val, lab]) => `<option value="${esc(val)}" ${val == v ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`
      : `<input data-k="${c.k}" type="${c.type}" ${c.type === 'number' ? 'step="any"' : ''} value="${esc(v)}" placeholder="${esc(c.ph ?? '')}">`}</label>`;
};

const row = (sec, o) => `<div class="pim-tr pim-tr-${sec}">${o?.id ? `<input type="hidden" data-k="id" value="${esc(o.id)}">` : ''}<div class="pim-tr-fields">${SECS[sec].map(c => field(sec, c, o?.[c.k] ?? c.def ?? '')).join('')}</div><button type="button" class="pim-del-row" data-action="delRow" title="${t('Delete')}"><i class="fa-solid fa-trash"></i></button></div>`;

class EditApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'pim-edit', tag: 'form', classes: ['pim-window', 'pim-edit'],
    window: { title: 'PIM.Edit', icon: 'fa-solid fa-pen-to-square', resizable: true },
    position: { width: 860, height: 760 },
    actions: {
      etab(_, el) {
        for (const e of this.element.querySelectorAll('[data-tab],[data-pane]')) e.classList.toggle('active', (e.dataset.tab ?? e.dataset.pane) === el.dataset.tab);
      },
      addRow(_, el) {
        const sec = el.closest('.pim-sec');
        const clone = sec.querySelector('template').content.cloneNode(true);
        sec.querySelector('.pim-rows').append(clone);
        EditApp.#bindPickers(sec);
      },
      delRow(_, el) { el.closest('.pim-tr').remove(); }
    },
    form: { handler: EditApp.#submit, closeOnSubmit: true }
  };
  static PARTS = { main: { template: `${T}edit.hbs`, root: true, scrollable: ['.pim-edit-body'] } };

  _onRender(context, options) {
    super._onRender(context, options);
    EditApp.#bindPickers(this.element);
  }

  static #bindPickers(root) {
    for (const picker of root.querySelectorAll('.pim-actor-picker:not([data-bound])')) {
      picker.setAttribute('data-bound', '1');
      const input = picker.querySelector('.pim-actor-search');
      const hidden = picker.querySelector('[data-k="actor"]');
      const avatar = picker.querySelector('.pim-actor-avatar');
      const popover = picker.querySelector('.pim-actor-popover');
      const clearBtn = picker.querySelector('.pim-actor-clear');
      if (!input || !hidden || !popover) continue;

      const renderMatches = () => {
        const q = input.value.trim().toLowerCase();
        const matches = game.actors.contents.filter(a => !q || a.name.toLowerCase().includes(q)).slice(0, 30);
        if (!matches.length) {
          popover.innerHTML = `<div class="pim-actor-empty">${t('NoActorMatch')}</div>`;
        } else {
          popover.innerHTML = matches.map(a => `<div class="pim-actor-opt" data-id="${a.id}"><img src="${esc(a.img || 'icons/svg/mystery-man.svg')}"><span>${esc(a.name)}</span></div>`).join('');
        }
        popover.classList.remove('hidden');
      };

      input.addEventListener('focus', renderMatches);
      input.addEventListener('input', renderMatches);

      popover.addEventListener('mousedown', ev => {
        const opt = ev.target.closest('.pim-actor-opt');
        if (!opt) return;
        const a = game.actors.get(opt.dataset.id);
        if (a) {
          hidden.value = a.id;
          input.value = a.name;
          avatar.src = a.img || 'icons/svg/mystery-man.svg';
          clearBtn?.classList.remove('hidden');
          popover.classList.add('hidden');
        }
      });

      input.addEventListener('blur', () => {
        setTimeout(() => popover.classList.add('hidden'), 200);
      });

      clearBtn?.addEventListener('click', () => {
        hidden.value = '';
        input.value = '';
        avatar.src = 'icons/svg/mystery-man.svg';
        clearBtn.classList.add('hidden');
        renderMatches();
      });

      picker.addEventListener('dragover', ev => { ev.preventDefault(); picker.classList.add('drag-over'); });
      picker.addEventListener('dragleave', () => picker.classList.remove('drag-over'));
      picker.addEventListener('drop', async ev => {
        ev.preventDefault();
        picker.classList.remove('drag-over');
        let data;
        try { data = typeof TextEditor?.getDragEventData === 'function' ? TextEditor.getDragEventData(ev) : JSON.parse(ev.dataTransfer.getData('text/plain')); } catch {}
        if (data?.type !== 'Actor') return;
        const a = data.uuid ? await fromUuid(data.uuid) : game.actors.get(data.id);
        if (!a) return;
        hidden.value = a.id;
        input.value = a.name;
        avatar.src = a.img || 'icons/svg/mystery-man.svg';
        clearBtn?.classList.remove('hidden');
        popover.classList.add('hidden');
      });
    }

    const ownersSec = root.querySelector?.('.pim-sec[data-sec="owners"]') ?? root.closest?.('.pim-sec[data-sec="owners"]');
    if (ownersSec && !ownersSec.hasAttribute('data-drop-bound')) {
      ownersSec.setAttribute('data-drop-bound', '1');
      ownersSec.addEventListener('dragover', ev => { ev.preventDefault(); ownersSec.classList.add('drag-over'); });
      ownersSec.addEventListener('dragleave', () => ownersSec.classList.remove('drag-over'));
      ownersSec.addEventListener('drop', async ev => {
        if (ev.target.closest('.pim-actor-picker')) return;
        ev.preventDefault();
        ownersSec.classList.remove('drag-over');
        let data;
        try { data = typeof TextEditor?.getDragEventData === 'function' ? TextEditor.getDragEventData(ev) : JSON.parse(ev.dataTransfer.getData('text/plain')); } catch {}
        if (data?.type !== 'Actor') return;
        const a = data.uuid ? await fromUuid(data.uuid) : game.actors.get(data.id);
        if (!a) return;
        const tpl = ownersSec.querySelector('template');
        const clone = tpl.content.cloneNode(true);
        const p = clone.querySelector('.pim-actor-picker');
        if (p) {
          p.querySelector('[data-k="actor"]').value = a.id;
          p.querySelector('.pim-actor-search').value = a.name;
          p.querySelector('.pim-actor-avatar').src = a.img || 'icons/svg/mystery-man.svg';
          p.querySelector('.pim-actor-clear')?.classList.remove('hidden');
        }
        ownersSec.querySelector('.pim-rows').append(clone);
        EditApp.#bindPickers(ownersSec);
      });
    }
  }

  #base() {
    const { hid, preset } = this.options;
    return get().find(x => x.id === hid)
      ?? (preset && foundry.utils.deepClone(PRESETS().find(p => p.key === preset)))
      ?? { name: t('New'), kind: '', income: '0', upkeep: '0', eventChance: 25, seasons: '', value: 0, stats: [], units: [], events: [], upgrades: [] };
  }

  async _prepareContext(o) {
    const h = { img: 'icons/svg/house.svg', desc: '', shares: {}, ...this.#base() };
    const data = { ...h, owners: Object.entries(h.shares).map(([actor, pct]) => ({ actor, pct })) };
    const editIcons = { general: 'fa-sliders', economy: 'fa-coins', owners: 'fa-users', mgmt: 'fa-toolbox', events: 'fa-bolt' };
    return {
      ...await super._prepareContext(o), h,
      tabs: ['general', 'economy', 'owners', 'mgmt', 'events'].map((id, i) => ({ id, icon: editIcons[id], label: t(`ETab.${id}`), active: !i })),
      sections: Object.keys(SECS).map(key => ({ key, pane: PANE[key], title: t(`Sec.${key}`), hint: game.i18n.has(`PIM.Hint.${key}`) ? t(`Hint.${key}`) : '', rows: data[key].map(r => row(key, r)).join(''), tpl: row(key) }))
    };
  }

  static async #submit(_ev, form, fd) {
    const f = fd.object, hid = this.options.hid;
    const rows = sec => [...form.querySelectorAll(`.pim-rows[data-sec="${sec}"] .pim-tr`)]
      .map(tr => Object.fromEntries([...tr.querySelectorAll('[data-k]')].map(i => [i.dataset.k, i.value])));
    const num = (r, ...ks) => Object.fromEntries(ks.map(k => [k, +r[k] || 0]));
    const orphans = [];
    await mutate(d => {
      const old = d.find(x => x.id === hid);
      const h = old ?? { id: foundry.utils.randomID(), fund: 0, bal: {}, pending: null, log: [] };
      const shares = {};
      for (const r of rows('owners')) if (r.actor && +r.pct > 0) shares[r.actor] = (shares[r.actor] ?? 0) + +r.pct;
      const total = sum(Object.values(shares), x => x);
      if (total > 100) { ui.notifications.warn(t('OverShare')); for (const a in shares) shares[a] = r2(shares[a] * 100 / total); }
      for (const a of Object.keys(h.shares ?? {})) if (!(a in shares) && h.bal?.[a] > 0) { orphans.push([a, h.bal[a]]); delete h.bal[a]; }
      Object.assign(h, {
        name: f.name, img: f.img, desc: f.desc, kind: f.kind, income: f.income || '0', upkeep: f.upkeep || '0',
        eventChance: +f.eventChance || 0, seasons: f.seasons, value: +f.value || 0, shares,
        stats: rows('stats').filter(r => r.name).map(r => ({ name: r.name, ...num(r, 'value', 'perPoint', 'max') })),
        units: rows('units').filter(r => r.name).map(r => ({ name: r.name, ...num(r, 'count', 'upkeep', 'income', 'hire', 'max') })),
        events: rows('events').filter(r => r.title).map(r => ({ ...r, ...num(r, 'weight', 'deadline'), amount: r.amount || '0', missed: r.missed || '0' })),
        upgrades: rows('upgrades').filter(r => r.name).map(r => {
          const p = old?.upgrades.find(u => u.id === r.id);
          return { id: p?.id ?? foundry.utils.randomID(), name: r.name, desc: r.desc, fx: r.fx, ...num(r, 'cost', 'bonus', 'time'), offered: p?.offered ?? false, done: p?.done ?? false, left: p?.left ?? 0 };
        })
      });
      if (!old) d.push(h);
    });
    for (const [a, n] of orphans) await pay(a, n); // owner removed: pay out what they had earned
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
  game.settings.register(ID, 'language', {
    name: 'PIM.S.language',
    hint: 'PIM.S.languageHint',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      auto: 'PIM.Lang.auto',
      es: 'Español',
      en: 'English'
    },
    default: 'auto',
    onChange: async v => {
      await applyLanguage(v);
      if (app?.rendered) app.render();
    }
  });
});

Hooks.once('ready', () => {
  applyLanguage();
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
