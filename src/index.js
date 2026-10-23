import './style.css';
import { r2, sum, passive, effects, credit, check, pick, seasonMult, okSeason, parseCoins, split, exportable, working, sales, ageContracts, staffBonus, wages, promote, book, unpaid, ledger } from './logic.js';
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
const season = () => {
  const s = sc()?.getCurrentSeason?.();
  if (!s) return null;
  const seasons = sc()?.getCurrentCalendar?.()?.seasons ?? [];
  const idx = seasons.findIndex(x => x.name === s.name);
  return { name: s.name, index: idx >= 0 ? idx + 1 : null };
};
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
const defImg = h => (!h.img || h.img === 'icons/svg/house.svg' ? 'icons/environment/settlement/house-farmland.webp' : h.img);
const get = () => foundry.utils.deepClone(set('holdings')).map(h => ({
  fund: h.balance ?? 0, stats: [], units: [], upgrades: [], events: [], log: [], income: '0', upkeep: '0', eventChance: 0, seasons: '', value: 0, products: [], contracts: [], staff: [], retain: 0, unpaidFx: '', strikes: 0, pending: null, ...h,
  img: defImg(h),
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

const purse = () => { const c = parseCoins(set('coins')); return c.length ? c : set('currencyPath') ? [{ path: set('currencyPath'), ratio: 1 }] : []; };
async function pay(actorId, n) {
  const a = game.actors.get(actorId), list = purse();
  if (!a || !list.length) return false;
  const upd = {};
  for (const { path, k } of split(n, list)) upd[path] = (foundry.utils.getProperty(a, path) || 0) + k;
  await a.update(upd);
  return true;
}

// take n from an actor's purse; coins are re-made into the largest denominations (ponytail: no exact change-making)
async function charge(actorId, n) {
  const a = game.actors.get(actorId), list = purse();
  if (!a || !list.length) return false;
  const total = r2(sum(list, c => (foundry.utils.getProperty(a, c.path) || 0) * c.ratio));
  if (total < n) return false;
  const upd = Object.fromEntries(list.map(c => [c.path, 0]));
  for (const { path, k } of split(r2(total - n), list)) upd[path] = k;
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
          if (book(h, m) > 0) await say(t('EventUnpaid', { name: h.name }), h);
          effects(h, h.pending.missedFx);
          await say(t('Missed', { name: h.name, title: h.pending.title, amount: fmt(m) }), h);
          h.pending = null;
        }
        for (const u of h.upgrades) if (u.left > 0 && !--u.left) { u.done = true; effects(h, u.fx); await say(t('Bought', { name: h.name, upgrade: u.name }), h); }
        for (const s of h.staff) if (s.hired && s.left > 0 && !--s.left) { promote(s); await say(t('StaffTrained', { name: h.name, staff: s.name, stars: s.stars }), h); }
        const mult = seasonMult(h.seasons, season()), inc = r2(await roll(h.income) * mult);
        const days = set('periodDays'), s = sales(h, days, mult);
        for (const p of s.products) { const hp = h.products.find(x => x.name === p.name); if (hp) hp.stock = p.left; } // ponytail: no spoilage, add a cap if stock piles up
        const L = ledger(h, inc, await roll(h.upkeep), s.total), short = book(h, L.net);
        await say(t('Books', { name: h.name, gross: L.gross, costs: L.costs, amount: fmt(L.net), fund: `${h.fund} ${cur()}` }), h);
        const gone = short > 0 ? unpaid(h) : null;
        if (gone) await say(t('Unpaid', { name: h.name, amount: `${short} ${cur()}`, gone: gone.join(', ') || '—', n: h.strikes }), h);
        else if (short > 0) await say(t('FundShort', { name: h.name, amount: `${short} ${cur()}` }), h);
        else h.strikes = 0;
        for (const r of s.rows) if (r.short > 0) await say(t('ContractShort', { name: h.name, buyer: r.buyer, n: r.short, good: r.product || '' }), h);
        for (const c of ageContracts(h, days)) await say(t('ContractEnded', { name: h.name, buyer: c.buyer }), h);
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
    if (book(h, n) > 0) await say(t('EventUnpaid', { name: h.name }), h);
    effects(h, e.fx);
    h.pending = null;
    await say(t('Attended', { name: h.name, title: e.title, text: e.text, amount: fmt(n) }), h);
    const item = e.item && await fromUuid(e.item), a = game.actors.get(who(h, user));
    if (item && a) await a.createEmbeddedDocuments('Item', [item.toObject()]);
  }),
  collect: (id, { aid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), n = h?.bal[aid];
    if (!n || n <= 0 || !(ctl(aid, user) || game.users.get(user)?.isGM)) return;
    const ok = await pay(aid, n);
    if (!ok) return void ui.notifications.warn(t('NoCurrencyPath'));
    h.bal[aid] = 0;
    await say(t('Collected', { name: h.name, amount: `${n} ${cur()}` }), h);
  }),
  // a character puts money into the holding fund, from their purse or from what the holding owes them
  deposit: (id, { aid, n, from }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), a = game.actors.get(aid);
    n = r2(+n);
    if (!h || !a || !(n > 0) || !(ctl(aid, user) || game.users.get(user)?.isGM)) return;
    if (from === 'bal') {
      if ((h.bal[aid] ?? 0) < n) return void ui.notifications.warn(t('NotEnough'));
      h.bal[aid] = r2(h.bal[aid] - n);
    } else if (!await charge(aid, n)) return void ui.notifications.warn(t('NotEnough'));
    h.fund = r2(h.fund + n);
    await say(t('Deposited', { name: h.name, actor: a.name, amount: `${n} ${cur()}` }), h);
  }),
  // owners pay themselves out of the fund (split by shares)
  distribute: (id, { n }, user) => mutate(async d => {
    const h = d.find(x => x.id === id);
    n = r2(+n);
    if (!h || !(n > 0) || n > h.fund || !owns(h, user)) return;
    h.fund = r2(h.fund - n);
    credit(h, n);
    await say(t('Distributed', { name: h.name, amount: `${n} ${cur()}` }), h);
  }),
  // one-off sale agreed in play (any buyer, any place): stock -> fund
  sellNow: (id, { i, qty, price, buyer }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), p = h?.products[i];
    qty = r2(+qty); price = r2(+price);
    if (!p || !(qty > 0) || !(price >= 0) || qty > (+p.stock || 0) || !owns(h, user)) return void ui.notifications.warn(t('NotEnough'));
    p.stock = r2(p.stock - qty);
    book(h, r2(qty * price));
    await say(t('SoldNow', { name: h.name, qty, unit: p.unit || p.name, buyer: buyer || '—', amount: `${r2(qty * price)} ${cur()}` }), h);
  }),
  collectAll: (id, _, user) => mutate(async d => {
    if (!game.users.get(user)?.isGM) return;
    const h = d.find(x => x.id === id);
    if (!h) return;
    for (const [aid, bal] of Object.entries(h.bal)) {
      if (bal > 0) {
        const ok = await pay(aid, bal);
        if (ok) {
          h.bal[aid] = 0;
          await say(t('Collected', { name: h.name, amount: `${bal} ${cur()}` }), h);
        } else {
          ui.notifications.warn(t('NoCurrencyPath'));
          break;
        }
      }
    }
  }),
  buy: (id, { uid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), u = h?.upgrades.find(x => x.id === uid);
    if (!u?.offered || u.done || u.left || h.fund < u.cost || !check(h, u.req) || !owns(h, user)) return;
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
  // owners set their own prices; the market reacts (see demand)
  setPrice: (id, { i, price }, user) => mutate(d => {
    const h = d.find(x => x.id === id), p = h?.products[i];
    if (p && owns(h, user) && +price >= 0) p.price = r2(+price);
  }),
  // owners may launch a product; it sells nothing on the open market until the GM sets its base price
  addProduct: (id, { name }, user) => mutate(async d => {
    const h = d.find(x => x.id === id);
    name = String(name ?? '').trim();
    if (!h || !name || !owns(h, user) || h.products.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
    h.products.push({ name, unit: '', base: 0, price: 0, quality: '', demand: '', stock: 0 });
    await say(t('ProductAdded', { name: h.name, product: name }), h);
  }),
  // staff: GM offers candidates (found in play), owners hire / fire / train them
  offerStaff: (id, { sid }) => mutate(d => { const s = d.find(x => x.id === id)?.staff.find(x => x.id === sid); if (s && !s.hired) s.offered = !s.offered; }),
  hireStaff: (id, { sid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), s = h?.staff.find(x => x.id === sid);
    if (!s?.offered || s.hired || !owns(h, user) || h.fund < (+s.fee || 0)) return;
    h.fund = r2(h.fund - (+s.fee || 0));
    Object.assign(s, { hired: true, offered: false, left: 0 });
    await say(t('StaffHired', { name: h.name, staff: s.name, role: s.role, wage: `${s.wage} ${cur()}` }), h);
  }),
  fireStaff: (id, { sid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), s = h?.staff.find(x => x.id === sid);
    if (!s?.hired || !owns(h, user)) return;
    Object.assign(s, { hired: false, offered: false, left: 0 });
    await say(t('StaffFired', { name: h.name, staff: s.name }), h);
  }),
  trainStaff: (id, { sid }, user) => mutate(async d => {
    const h = d.find(x => x.id === id), s = h?.staff.find(x => x.id === sid), cost = r2((+s?.train || 0) * (s?.stars || 0));
    if (!s?.hired || s.left || s.stars >= 5 || !(+s.train > 0) || !owns(h, user) || h.fund < cost) return;
    h.fund = r2(h.fund - cost);
    s.left = s.stars; // takes as many periods as current stars
    await say(t('StaffTraining', { name: h.name, staff: s.name, n: s.left }), h);
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
const GM_ONLY = new Set(['tick', 'fire', 'offer', 'offerStaff', 'sell', 'collectAll']);

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
  const totalPeriods = Math.floor((now - last) / len);
  const n = Math.min(totalPeriods, 12); // ponytail: cap to avoid chat flood after long jumps
  if (!n) return;
  const skipped = totalPeriods - n;
  if (skipped > 0) ui.notifications.warn(t('PeriodsSkipped', { count: skipped }));
  await game.settings.set(ID, 'lastTs', last + totalPeriods * len);
  for (let i = 0; i < n; i++) await ops.tick();
}

// --- view model ---
function view(uid) {
  const isGM = game.users.get(uid).isGM;
  const holdings = get().filter(h => owns(h, uid)).map(h => ({
    ...h, incomeTxt: bonus(h) ? `${h.income || 0}+${bonus(h)}` : h.income, passive: passive(h), log: h.log.slice(0, 15),
    owners: Object.entries(h.shares).map(([id, share]) => {
      const a = game.actors.get(id), bal = h.bal[id] ?? 0, mine = isGM || ctl(id, uid);
      return { id, name: a?.name ?? '?', img: a?.img, share, bal, isDebt: bal < 0, canCollect: bal > 0 && mine, canMove: mine };
    }),
    stats: h.stats.map(x => { const b = staffBonus(h, x.name), v = r2(x.value + b); return { ...x, value: v, extra: b, pct: x.max ? Math.min(100, Math.round(v / x.max * 100)) : null }; }),
    staff: h.staff.filter(s => isGM || s.hired || s.offered).map(s => ({
      ...s, starTxt: '★'.repeat(s.stars) + '☆'.repeat(Math.max(0, 5 - s.stars)), fee: +s.fee || 0,
      fxTxt: String(s.fx || '').split(';').map(m => m.trim().match(/^(.+?)\s*([+-]\d*\.?\d+)$/)).filter(Boolean).map(([, n, k]) => `${n} ${+k * s.stars > 0 ? '+' : ''}${r2(+k * s.stars)}`).join(', '),
      trainCost: r2((+s.train || 0) * s.stars), canHire: s.offered && !s.hired && h.fund >= (+s.fee || 0),
      canTrain: s.hired && !s.left && s.stars < 5 && +s.train > 0 && h.fund >= (+s.train || 0) * s.stars,
      pct: s.left ? Math.round((s.stars - s.left) / s.stars * 100) : 0
    })),
    wages: wages(h),
    week: ledger(h, 0, 0, sales(h, set('periodDays'), seasonMult(h.seasons, season())).total), // expected books per period, without dice income/upkeep
    units: h.units.map(u => ({ ...u, working: working(h, u), idle: u.count > working(h, u), canHire: h.fund >= u.hire && (!u.max || u.count < u.max) })),
    trade: sales(h, 30, seasonMult(h.seasons, season())), // shown per month; ticks use the real period length
    upgrades: h.upgrades.map(u => ({ ...u, show: isGM || u.offered || u.done || u.left, locked: !u.done && !check(h, u.req), afford: h.fund >= u.cost && !u.left && check(h, u.req), pct: u.time ? Math.round((u.time - u.left) / u.time * 100) : 0 }))
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
class HoldingSheetApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instances = new Map();
  static get instances() { return this.#instances; }

  static open(hid) {
    let s = this.#instances.get(hid);
    if (!s) {
      s = new HoldingSheetApp({ hid });
      this.#instances.set(hid, s);
    }
    return s.render(true);
  }

  static close(hid) {
    const s = this.#instances.get(hid);
    if (s) {
      s.close();
      this.#instances.delete(hid);
    }
  }

  static DEFAULT_OPTIONS = {
    classes: ['pim-window', 'pim-sheet-window'],
    window: { title: 'PIM.Title', icon: 'fa-solid fa-landmark', resizable: true },
    position: { width: 880, height: 720 },
    actions: {
      goTab(event, target) {
        this.tab = target.dataset.tab;
        this.render();
      },
      fire(event, target) {
        request('fire', this.getHid(target));
      },
      edit(event, target) {
        const hid = this.getHid(target);
        if (hid) new EditApp({ hid }).render(true);
      },
      export(event, target) {
        HoldingsApp.exportHolding(this.getHid(target));
      },
      saveTemplate(event, target) {
        HoldingsApp.saveTemplate(this.getHid(target));
      },
      sell(event, target) {
        HoldingsApp.sellHolding(this.getHid(target));
      },
      remove(event, target) {
        HoldingsApp.removeHolding(this.getHid(target));
      },
      attend(event, target) {
        request('attend', this.getHid(target));
      },
      collect(event, target) {
        const aid = target.dataset.aid || target.closest('[data-aid]')?.dataset.aid;
        request('collect', this.getHid(target), { aid });
      },
      collectAll(event, target) {
        request('collectAll', this.getHid(target));
      },
      deposit(event, target) {
        HoldingsApp.depositHolding(this.getHid(target));
      },
      async distribute(event, target) {
        const hid = this.getHid(target);
        const n = await DialogV2.prompt({ window: { title: t('Distribute') }, rejectClose: false,
          content: `<div class="form-group"><label>${t('Amount')}</label><div class="form-fields"><input type="number" name="n" min="0" step="any"></div></div><p class="hint">${t('DistributeHint')}</p>`,
          ok: { label: t('Distribute'), callback: (_, b) => +b.form.elements.n.value } });
        if (n > 0) request('distribute', hid, { n });
      },
      async sellNow(event, target) {
        const hid = this.getHid(target), i = +target.closest('[data-p]').dataset.p, p = get().find(x => x.id === hid)?.products[i];
        if (!p) return;
        const r = await DialogV2.prompt({ window: { title: `${t('SellNow')}: ${p.name}` }, rejectClose: false,
          content: `<div class="form-group"><label>${t('Buyer')}</label><div class="form-fields"><input type="text" name="buyer"></div></div>
            <div class="form-group"><label>${t('Amount')} (${t('Stock')} ${p.stock ?? 0})</label><div class="form-fields"><input type="number" name="qty" min="0" step="any" max="${p.stock ?? 0}"></div></div>
            <div class="form-group"><label>${t('F.price')}</label><div class="form-fields"><input type="number" name="price" min="0" step="any" value="${p.price || p.base || 0}"></div></div><p class="hint">${t('SellNowHint')}</p>`,
          ok: { label: t('SellNow'), callback: (_, b) => ({ buyer: b.form.elements.buyer.value, qty: +b.form.elements.qty.value, price: +b.form.elements.price.value }) } });
        if (r?.qty > 0) request('sellNow', hid, { i, ...r });
      },
      buy(event, target) {
        const uid = target.dataset.uid || target.closest('[data-uid]')?.dataset.uid;
        request('buy', this.getHid(target), { uid });
      },
      offer(event, target) {
        const uid = target.dataset.uid || target.closest('[data-uid]')?.dataset.uid;
        request('offer', this.getHid(target), { uid });
      },
      hire(event, target) {
        const i = +(target.dataset.i ?? target.closest('[data-i]')?.dataset.i);
        if (!Number.isNaN(i)) request('hire', this.getHid(target), { i });
      },
      dismiss(event, target) {
        const i = +(target.dataset.i ?? target.closest('[data-i]')?.dataset.i);
        if (!Number.isNaN(i)) request('dismiss', this.getHid(target), { i });
      },
      transfer(event, target) {
        HoldingsApp.transferHolding(this.getHid(target), target);
      },
      setPrice(event, target) {
        const card = target.closest('[data-p]');
        request('setPrice', this.getHid(target), { i: +card.dataset.p, price: +card.querySelector('input').value });
      },
      staffAct(event, target) {
        request(target.dataset.op, this.getHid(target), { sid: target.closest('[data-sid]').dataset.sid });
      },
      async addProduct(event, target) {
        const hid = this.getHid(target);
        const name = await DialogV2.prompt({
          window: { title: t('AddProduct') }, rejectClose: false,
          content: `<div class="form-group"><label>${t('F.name')}</label><div class="form-fields"><input type="text" name="n" autofocus></div></div>`,
          ok: { label: t('AddProduct'), callback: (_, b) => b.form.elements.n.value }
        });
        if (name) request('addProduct', hid, { name });
      }
    }
  };
  static PARTS = { main: { template: `${T}sheet.hbs`, root: true, scrollable: ['.pim-pane'] } };

  tab = 'overview';
  hid = null;

  constructor(options = {}) {
    super(options);
    this.hid = options.hid;
    this.options = { ...options, ...this.options, id: `pim-sheet-${options.hid}` };
  }

  getHid(target) {
    return this.hid || this.options?.hid || target?.dataset?.id || target?.closest?.('[data-id]')?.dataset?.id;
  }

  async _prepareContext(o) {
    const hid = this.getHid();
    const v = view(game.user.id), h = v.holdings.find(x => x.id === hid);
    if (!h) {
      setTimeout(() => this.close(), 0);
      return { isGM: v.isGM };
    }
    const icons = { overview: 'fa-gauge-high', owners: 'fa-users', units: 'fa-people-group', staff: 'fa-user-tie', trade: 'fa-scale-balanced', builds: 'fa-hammer', log: 'fa-scroll' };
    const tabs = Object.entries(icons).map(([id, icon]) => ({ id, icon, label: t(`Tab.${id}`), active: this.tab === id }));
    const curSeason = season();
    const curSeasonMult = seasonMult(h.seasons, curSeason);
    return { ...await super._prepareContext(o), isGM: v.isGM, h, tabs, tab: this.tab, cur: cur(), currentSeason: curSeason?.name, currentSeasonMult: curSeasonMult };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    if (context.h?.name) {
      const titleEl = this.element?.querySelector?.('.window-header .window-title');
      if (titleEl) titleEl.textContent = context.h.name;
    }
  }

  async close(options) {
    HoldingSheetApp.#instances.delete(this.getHid());
    return super.close ? super.close(options) : undefined;
  }
}

class HoldingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'pim-dir', classes: ['pim-window', 'pim-dir-window'],
    window: { title: 'PIM.Title', icon: 'fa-solid fa-landmark', resizable: true },
    position: { width: 840, height: 640 },
    actions: {
      openHolding(event, target) {
        const id = target.dataset.id || target.closest('[data-id]')?.dataset.id;
        if (id) HoldingSheetApp.open(id);
      },
      filterHoldings(event, target) {
        const q = target.value.trim().toLowerCase();
        for (const card of this.element.querySelectorAll('.pim-dir-card')) {
          const match = !q || card.textContent.toLowerCase().includes(q);
          card.style.display = match ? '' : 'none';
        }
      },
      create: HoldingsApp.#create,
      edit(event, target) {
        const id = target.dataset.id || target.closest('[data-id]')?.dataset.id;
        if (id) new EditApp({ hid: id }).render(true);
      },
      remove(event, target) {
        const id = target.dataset.id || target.closest('[data-id]')?.dataset.id;
        if (id) HoldingsApp.removeHolding(id);
      },
      tick: HoldingsApp.#tick,
      import: HoldingsApp.#import
    }
  };
  static PARTS = { main: { template: `${T}main.hbs`, root: true, scrollable: ['.pim-dir-body'] } };
  static #id = el => el.dataset.id || el.closest('[data-id]')?.dataset.id;

  async _prepareContext(o) {
    return { ...await super._prepareContext(o), ...view(game.user.id), cur: cur() };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector('.pim-dir-search input');
    if (search && !search.hasAttribute('data-bound')) {
      search.setAttribute('data-bound', '1');
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        for (const card of this.element.querySelectorAll('.pim-dir-card')) {
          const match = !q || card.textContent.toLowerCase().includes(q);
          card.style.display = match ? '' : 'none';
        }
      });
    }
  }

  static async #create() {
    const list = [...PRESETS(), ...set('templates').map(p => ({ ...p, custom: true }))];
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
          <div class="pim-preset-title"><b>${esc(p.name)}</b> <span class="pim-pill">${esc(p.kind)}</span>${p.custom ? ` <span class="pim-pill">${t('Mine')}</span> <a class="pim-tpl-del" data-tooltip="${t('Delete')}" onclick="event.stopPropagation();game.modules.get('${ID}').api.deleteTemplate('${esc(p.key)}');this.closest('.pim-preset-card').remove();"><i class="fa-solid fa-trash"></i></a>` : ''}</div>
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
  static async removeHolding(id) {
    if (await DialogV2.confirm({ content: t('DeleteConfirm') })) {
      await mutate(d => d.splice(d.findIndex(h => h.id === id), 1));
      HoldingSheetApp.close(id);
    }
  }
  static async sellHolding(id) { if (await DialogV2.confirm({ content: t('SellConfirm') })) request('sell', id); }
  static async #tick() { if (await DialogV2.confirm({ content: t('TickConfirm') })) ops.tick(); }
  // GM keeps a holding (without balances, owners or progress) as a reusable template in this world
  static async saveTemplate(id) {
    const h = get().find(x => x.id === id);
    if (!h) return;
    const key = `custom-${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const tpl = { ...exportable(h), key, icon: 'fa-bookmark' };
    await game.settings.set(ID, 'templates', [...set('templates').filter(x => x.key !== key), tpl]);
    ui.notifications.info(t('TemplateSaved', { name: h.name }));
  }
  static exportHolding(id) {
    const h = get().find(x => x.id === id);
    if (h) foundry.utils.saveDataToFile(JSON.stringify(exportable(h), null, 2), 'application/json', `${h.name}.json`);
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
        products: arr('products').map(p => ({ ...p, stock: 0 })), staff: arr('staff').map(s => ({ ...s, id: foundry.utils.randomID(), hired: false, offered: false, left: 0 })), contracts: arr('contracts'), stats: arr('stats'), units: arr('units'), events: arr('events'), id: foundry.utils.randomID(), fund: 0, bal: {}, shares: {}, pending: null, log: [],
        upgrades: arr('upgrades').map(u => ({ ...u, id: foundry.utils.randomID(), offered: false, done: false, left: 0 }))
      }));
    } catch { ui.notifications.error(t('ImportErr')); }
  }
  // pick which of your characters pays: owners you control first, then any other actor you own (GM: everyone)
  static async depositHolding(id) {
    const h = get().find(x => x.id === id);
    if (!h) return;
    const mine = game.actors.contents.filter(a => a.isOwner && (game.user.isGM ? a.hasPlayerOwner || a.id in h.shares : true));
    const list = [...mine.filter(a => a.id in h.shares), ...mine.filter(a => !(a.id in h.shares))];
    if (!list.length) return ui.notifications.warn(t('NoActor'));
    const wealth = a => r2(sum(purse(), c => (foundry.utils.getProperty(a, c.path) || 0) * c.ratio));
    const opts = list.map(a => `<option value="${a.id}">${esc(a.name)} — ${t('Purse')} ${wealth(a)} · ${t('Owed')} ${h.bal[a.id] ?? 0} ${cur()}</option>`).join('');
    const r = await DialogV2.prompt({
      window: { title: t('Deposit') }, rejectClose: false,
      content: `<div class="form-group"><label>${t('F.actor')}</label><div class="form-fields"><select name="aid">${opts}</select></div></div>
        <div class="form-group"><label>${t('Amount')}</label><div class="form-fields"><input type="number" name="n" min="0" step="any" value="10"></div></div>
        <div class="form-group"><label>${t('From')}</label><div class="form-fields"><select name="from"><option value="purse">${t('Purse')}</option><option value="bal">${t('Owed')}</option></select></div></div>
        <p class="hint">${t('DepositHint')}</p>`,
      ok: { label: t('Deposit'), callback: (_, b) => ({ aid: b.form.elements.aid.value, n: +b.form.elements.n.value, from: b.form.elements.from.value }) }
    });
    if (r?.aid && r.n > 0) request('deposit', id, r);
  }
  static async transferHolding(id, el) {
    const from = el.closest('[data-aid]')?.dataset.aid;
    if (!from) return;
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
const PANE = { owners: 'owners', stats: 'mgmt', units: 'mgmt', staff: 'mgmt', products: 'economy', contracts: 'economy', upgrades: 'mgmt', events: 'events' };
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
    C('max', 1, 'number', { def: 0, icon: 'fa-shield', ph: '0' }),
    C('cap', 2, 'text', { icon: 'fa-briefcase', ph: 'e.g. Vines*2' }),
    C('prod', 2, 'text', { icon: 'fa-boxes-stacked', ph: 'e.g. 10 / Tools*5' }),
    C('makes', 2, 'text', { icon: 'fa-box', ph: 'e.g. Wine' }),
    C('img', 2, 'image', { icon: 'fa-image' }),
    C('desc', 4, 'text', { icon: 'fa-align-left', ph: 'What they do...' })
  ],
  staff: [
    C('name', 2, 'text', { icon: 'fa-user-tie', ph: 'e.g. Ilsa Varn' }),
    C('role', 2, 'text', { icon: 'fa-id-badge', ph: 'e.g. Overseer' }),
    C('stars', 1, 'number', { def: 1, icon: 'fa-star', ph: '1-5' }),
    C('wage', 1, 'number', { def: 0, icon: 'fa-arrow-trend-down', ph: '3' }),
    C('fee', 1, 'number', { def: 0, icon: 'fa-coins', ph: '20' }),
    C('train', 1, 'number', { def: 0, icon: 'fa-graduation-cap', ph: '15' }),
    C('fx', 3, 'text', { icon: 'fa-wand-magic-sparkles', ph: 'per star, e.g. Quality+0.5' }),
    C('desc', 3, 'text', { icon: 'fa-align-left', ph: 'Who they are...' }),
    C('img', 2, 'image', { icon: 'fa-image' })
  ],
  products: [
    C('name', 2, 'text', { icon: 'fa-box', ph: 'e.g. Wine' }),
    C('unit', 1, 'text', { icon: 'fa-ruler', ph: 'bottles' }),
    C('base', 1, 'number', { def: 0, icon: 'fa-scale-balanced', ph: '2' }),
    C('price', 1, 'number', { def: 0, icon: 'fa-tag', ph: '2' }),
    C('quality', 2, 'text', { icon: 'fa-star', ph: 'e.g. Quality / 2' }),
    C('demand', 2, 'text', { icon: 'fa-people-arrows', ph: 'e.g. 40 / Prestige*10' }),
    C('stock', 1, 'number', { def: 0, icon: 'fa-warehouse', ph: '0' }),
    C('spoil', 1, 'number', { def: 0, icon: 'fa-hourglass-end', ph: '0' }),
    C('cond', 3, 'text', { icon: 'fa-lock', ph: 'e.g. Cellar>=1' }),
    C('img', 2, 'image', { icon: 'fa-image' }),
    C('desc', 4, 'text', { icon: 'fa-align-left', ph: 'What it is...' })
  ],
  contracts: [
    C('buyer', 3, 'text', { icon: 'fa-handshake', ph: 'e.g. El Druida de Oro' }),
    C('product', 2, 'text', { icon: 'fa-box', ph: 'e.g. Wine' }),
    C('qty', 1, 'number', { def: 0, icon: 'fa-boxes-stacked', ph: '20' }),
    C('price', 1, 'number', { def: 0, icon: 'fa-coins', ph: '1.5' }),
    C('months', 1, 'number', { def: 0, icon: 'fa-calendar', ph: '0' }),
    C('desc', 4, 'text', { icon: 'fa-align-left', ph: 'Terms, who agreed it...' })
  ],
  upgrades: [
    C('name', 3, 'text', { icon: 'fa-tag', ph: 'e.g. Stone Wall' }),
    C('cost', 1, 'number', { def: 0, icon: 'fa-coins', ph: '500' }),
    C('bonus', 1, 'number', { def: 0, icon: 'fa-chart-line', ph: '15' }),
    C('time', 1, 'number', { def: 0, icon: 'fa-hourglass-start', ph: '2' }),
    C('desc', 3, 'text', { icon: 'fa-align-left', ph: 'Description of upgrade...' }),
    C('fx', 3, 'text', { icon: 'fa-wand-magic-sparkles', ph: 'e.g. Morale+5;Defense+10' }),
    C('req', 3, 'text', { icon: 'fa-lock', ph: 'e.g. Vines>=3' }),
    C('img', 2, 'image', { icon: 'fa-image' })
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
    c.type === 'image'
      ? `<file-picker data-k="${c.k}" type="image" value="${esc(v)}"></file-picker>`
      : c.type === 'select'
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
      ?? (preset && foundry.utils.deepClone([...PRESETS(), ...set('templates')].find(p => p.key === preset)))
      ?? { name: t('New'), kind: '', income: '0', upkeep: '0', eventChance: 25, seasons: '', value: 0, retain: 100, unpaidFx: '', stats: [], units: [], staff: [], products: [], contracts: [], events: [], upgrades: [] };
  }

  async _prepareContext(o) {
    const h = { img: 'icons/environment/settlement/house-farmland.webp', desc: '', shares: {}, ...this.#base() };
    const data = { ...h, owners: Object.entries(h.shares).map(([actor, pct]) => ({ actor, pct })) };
    const editIcons = { general: 'fa-sliders', economy: 'fa-coins', owners: 'fa-users', mgmt: 'fa-toolbox', events: 'fa-bolt' };
    return {
      ...await super._prepareContext(o), h, curSeason: season(),
      tabs: ['general', 'economy', 'owners', 'mgmt', 'events'].map((id, i) => ({ id, icon: editIcons[id], label: t(`ETab.${id}`), active: !i })),
      sections: Object.keys(SECS).map(key => ({ key, pane: PANE[key], title: t(`Sec.${key}`), hint: game.i18n.has(`PIM.Hint.${key}`) ? t(`Hint.${key}`) : '', rows: (data[key] ?? []).map(r => row(key, r)).join(''), tpl: row(key) }))
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

      const statRows = rows('stats').filter(r => r.name);
      const unitRows = rows('units').filter(r => r.name);
      const eventRows = rows('events').filter(r => r.title);
      const upgradeRows = rows('upgrades').filter(r => r.name);

      const validNames = new Set([
        'fund', 'fondo',
        ...statRows.map(r => r.name.trim().toLowerCase()),
        ...unitRows.map(r => r.name.trim().toLowerCase())
      ]);
      const unknownNames = new Set();
      const checkFx = str => {
        for (const m of String(str || '').split(';')) {
          const [, name] = m.trim().match(/^(.+?)\s*[+-]\d+(?:\.\d+)?$/) ?? [];
          if (name && !validNames.has(name.trim().toLowerCase())) unknownNames.add(name.trim());
        }
      };
      const checkCond = cond => {
        for (const c of String(cond || '').split(';')) {
          const [, name] = c.trim().match(/^(.+?)\s*(?:<=|>=|<|>|=)/) ?? [];
          if (name && !validNames.has(name.trim().toLowerCase())) unknownNames.add(name.trim());
        }
      };
      for (const ev of eventRows) { checkCond(ev.cond); checkFx(ev.fx); checkFx(ev.missedFx); }
      for (const up of upgradeRows) { checkFx(up.fx); checkCond(up.req); }
      const staffRows = rows('staff').filter(r => r.name);
      for (const s of staffRows) checkFx(s.fx);
      checkFx(f.unpaidFx);
      const productRows = rows('products').filter(r => r.name);
      const checkVal = expr => {
        const [, name] = String(expr || '').trim().match(/^(.+?)\s*(?:\*\s*\d*\.?\d+)?$/) ?? [];
        if (name && isNaN(name) && !validNames.has(name.trim().toLowerCase())) unknownNames.add(name.trim());
      };
      for (const u of unitRows) { checkVal(u.cap); checkVal(u.prod); }
      for (const p of productRows) { checkVal(p.quality); checkVal(p.demand); checkCond(p.cond); }
      const pnames = new Set(productRows.map(p => p.name.trim().toLowerCase()));
      for (const n of [...unitRows.map(u => u.makes), ...rows('contracts').map(c => c.product)]) if (n && !pnames.has(n.trim().toLowerCase())) unknownNames.add(n.trim());
      if (unknownNames.size) ui.notifications.warn(t('UnknownName', { names: [...unknownNames].join(', ') }));

      Object.assign(h, {
        name: f.name, img: f.img, desc: f.desc, kind: f.kind, income: f.income || '0', upkeep: f.upkeep || '0',
        eventChance: +f.eventChance || 0, seasons: f.seasons, value: +f.value || 0, retain: Math.min(100, Math.max(0, +f.retain || 0)), unpaidFx: f.unpaidFx || '', shares,
        products: productRows.map(r => ({ name: r.name, unit: r.unit || '', quality: r.quality || '', demand: r.demand || '', cond: r.cond || '', img: r.img || '', desc: r.desc || '', ...num(r, 'base', 'price', 'stock', 'spoil') })),
        contracts: rows('contracts').filter(r => r.buyer).map(r => ({ buyer: r.buyer, product: r.product || '', desc: r.desc || '', ...num(r, 'qty', 'price', 'months') })),
        stats: statRows.map(r => ({ name: r.name, ...num(r, 'value', 'perPoint', 'max') })),
        units: unitRows.map(r => ({ name: r.name, cap: r.cap || '', prod: r.prod || '', makes: r.makes || '', img: r.img || '', desc: r.desc || '', ...num(r, 'count', 'upkeep', 'income', 'hire', 'max') })),
        events: eventRows.map(r => ({ ...r, ...num(r, 'weight', 'deadline'), amount: r.amount || '0', missed: r.missed || '0' })),
        staff: staffRows.map(r => {
          const p = old?.staff?.find(s => s.id === r.id);
          return { id: p?.id ?? foundry.utils.randomID(), name: r.name, role: r.role || '', fx: r.fx || '', desc: r.desc || '', img: r.img || '', ...num(r, 'wage', 'fee', 'train'),
            stars: Math.min(5, Math.max(1, Math.round(+r.stars || 1))), hired: p?.hired ?? false, offered: p?.offered ?? false, left: p?.left ?? 0 };
        }),
        upgrades: upgradeRows.map(r => {
          const p = old?.upgrades.find(u => u.id === r.id);
          return { id: p?.id ?? foundry.utils.randomID(), name: r.name, desc: r.desc, fx: r.fx, req: r.req || '', img: r.img || '', ...num(r, 'cost', 'bonus', 'time'), offered: p?.offered ?? false, done: p?.done ?? false, left: p?.left ?? 0 };
        })
      });
      if (!old) d.push(h);
    });
    for (const [a, n] of orphans) await pay(a, n); // owner removed: pay out what they had earned
  }
}

let app;
function rerenderAll() {
  if (app?.rendered) app.render();
  for (const s of HoldingSheetApp.instances.values()) {
    if (s.rendered) s.render();
  }
}
const open = hid => (typeof hid === 'string' && hid) ? HoldingSheetApp.open(hid) : (app ??= new HoldingsApp()).render(true);

Hooks.once('init', () => {
  const cfg = (key, type, def, extra = {}) => game.settings.register(ID, key, { name: `PIM.S.${key}`, hint: `PIM.S.${key}Hint`, scope: 'world', config: true, type, default: def, ...extra });
  game.settings.register(ID, 'holdings', { scope: 'world', config: false, type: Array, default: [], onChange: rerenderAll });
  game.settings.register(ID, 'lastTs', { scope: 'world', config: false, type: Number, default: 0 });
  game.settings.register(ID, 'templates', { scope: 'world', config: false, type: Array, default: [] });
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
      rerenderAll();
    }
  });
});

Hooks.once('ready', () => {
  applyLanguage();
  game.modules.get(ID).api = { open, openHolding: hid => HoldingSheetApp.open(hid), tick: () => request('tick'),
    deleteTemplate: key => game.user.isGM && game.settings.set(ID, 'templates', set('templates').filter(x => x.key !== key)) };
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
