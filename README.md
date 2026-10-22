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

## Production and contracts
- **Job cap** per unit: empty = unlimited, a number (`12`), a stat/unit name (`Vines`) or name times factor (`Vines*2`). Workers above the cap still cost upkeep but earn and produce nothing, so overstaffing lowers profit.
- **Prod**: product units per month per working unit (e.g. 10 bottles). Set the product name and the market price for surplus in Edit → Economy.
- **Contracts** (Edit → Economy): buyer, quantity per month, price each, months (0 = no end). Filled in order from production each period (prorated by period length); shortfalls and expiries are announced in chat. The Trade tab shows everything per month.

## Effects, conditions
- Effects: `Morale+5;Guards-2` (stat or unit names, clamped between 0 and max).
- Conditions: `Morale<30;Fund>100` (all must hold; `Fund`/`Fondo` is the holding fund).
- Amounts accept dice formulas.

## Usage
Open from the Actors tab ("Holdings" button), the Token controls (coins icon) or `game.modules.get("passive-income-mgk").api.open()`. The GM creates holdings and offers buildings; owners collect, attend events, hire/dismiss units, buy buildings and transfer shares.

## Development
`npm install && npm test && npm run build`
