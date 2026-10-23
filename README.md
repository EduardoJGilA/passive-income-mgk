# Passive Income MGK

System-agnostic holdings for Foundry VTT v14: vineyards, quarries, taverns, villages, castles. They earn income while the party is away, trigger events the players must attend, and grow through GM-approved buildings.

## Features
- **Templates**: vineyard, quarry, tavern, village, castle and mine to start from, or blank. Export any holding as a reusable JSON template and import it in another world.
- **Owners are actors** (PCs or NPCs) with a share %. Each owner has a balance and collects it; the unassigned remainder is the holding fund. Owners can transfer part of their share to another actor, and the GM can sell a holding.
- **Income** per period (dice formulas like `2d6*10`) minus upkeep, with optional **season multipliers** (`Fall:2;Winter:0.3` or by index `3:2.5;4:0.3` or custom calendar season names like `Kayitz:2;Stav:0.5`, powered by Simple Calendar). The editor and holding header display the current season and multiplier.
- **Events**: random, weighted, with conditions (`Morale<30`), season filter and a deadline in periods. Missing the deadline applies the "missed" outcome. Events can grant items and change stats or unit counts.
- **Management**: custom stats (population, defense, morale...) that add income per point; units/staff (garrison, workers...) hired from the fund; buildings with build time and effects, offered by the GM.
- **Visual editor** with rows for owners, stats, units, buildings and events; a per-holding **log**; and a player summary banner (events waiting, buildings ready, balance to collect).
- **Simple Calendar** (optional): every elapsed period (days, configurable) collects income and rolls events automatically. Otherwise use "Advance period" or `game.modules.get("passive-income-mgk").api.tick()`.
- **Currency** is a label plus an actor path (e.g. `system.currency.gp`), or several denominations (`gp=system.currency.gp:1;sp=system.currency.sp:0.1`) paid out largest first. Works with any system.

## Production, products and contracts
Generic for any holding (vineyard, quarry, mine, tavern...). Numeric fields marked *expr* take a number, a stat/unit name, or `name*factor` (e.g. `Tools*5`), so upgrades and events that change stats change the economy.
- **Units**: *job cap* (expr, empty = unlimited) — workers above it are paid but earn and produce nothing; *prod/month* (expr) of the product in *makes* (empty = first product).
- **Products** (Edit → Economy): reference price (GM), price (owners change it on the sheet), *quality* (expr, +20% fair price per point), *demand* (expr, units/month the open market buys at fair price, scaled by (fair/price)²), stock. Owners can launch new products from the Trade tab; the market ignores them until the GM sets a reference price.
- **Contracts** (Edit → Economy): deals won in roleplay — buyer, product, qty/month, agreed price, months (0 = no end). Filled before the market; shortfalls and expiries go to chat.
- **Managers** (Edit → Management → Managers; Managers tab on the sheet): named people with 1-5 stars, wage per period, signing fee, training cost per star and effects *per star* (e.g. `Quality+0.5`) applied while employed — every place a stat is read sees them. The GM reveals candidates with Offer when they turn up in play; owners hire, dismiss and train them (+1 star after as many periods as current stars, wage rises in proportion).
- **Images & descriptions** on units, managers, products, contracts and upgrades so players can manage them from the sheet.
- **Requirements**: upgrades (`req`) can only be bought and products (`cond`) are only made/sold when their condition holds (e.g. `Vines>=3`) — build upgrade trees and unlockable products. **Spoilage**: % of a product's stock lost per month.
- **Templates**: 18 built-ins (vineyard, tavern, quarry, village, fortress, mine, mage tower, thieves' den, port, temple, smithy, farmstead, sawmill, fishery, apothecary, trade caravan, stables, playhouse) with products and manager candidates; the GM can save any holding as a world template (bookmark button) and reuse or delete it from the template picker.
- **Fund it**: upgrades, hiring, signing fees and training are paid from the holding fund. Any owner (or the GM) picks which of their characters pays in — from the character's purse (needs a currency path or coins setting) or from what the holding owes them. Players with several characters choose in the dialog.
- **Fund-centric books (each period, default 7 days = weekly)**: sales and income go into the fund; crew wages (upkeep per unit), manager wages and upkeep come out of it. Of any profit, `retain`% stays in the fund and the rest goes to owners by share (default 100% for new holdings — owners use **Pay out** to split the fund when they decide). Losses never charge owners.
- **Unpaid payroll**: if the fund cannot cover a period, a quarter of each paid crew walks out, managers quit on the second unpaid period in a row, and the holding's `unpaidFx` applies (e.g. `Morale-10;Renown-1`). The sheet shows the streak.
- **One-off sales**: owners sell stock to any buyer agreed in play (sheet → Trade → handshake), money into the fund.
- Production and demand are per 30 days, prorated to the period and multiplied by the season. Unsold goods stay in stock (no spoilage).

## Effects, conditions
- Effects: `Morale+5;Guards-2` (stat or unit names, clamped between 0 and max).
- Conditions: `Morale<30;Fund>100` (all must hold; `Fund`/`Fondo` is the holding fund).
- Amounts accept dice formulas.

## Usage
Open from the Actors tab ("Holdings" button), the Token controls (coins icon) or `game.modules.get("passive-income-mgk").api.open()`. The GM creates holdings and offers buildings; owners collect, attend events, hire/dismiss units, buy buildings and transfer shares.

## Development
`npm install && npm test && npm run build`
