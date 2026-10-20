# Passive Income MGK

System-agnostic holdings for Foundry VTT v14: castles, villages, taverns, quarries. They earn income while the party is away, trigger events the players must attend, and grow through GM-approved buildings.

## Features
- **Income** per period (dice formulas: `2d6*10`) minus upkeep, split between several owners by share %. The unassigned remainder goes to the holding fund.
- **Events**: random, good/bad/neutral. Owners must attend before the next period or the "missed" outcome applies. Can grant items and change stats.
- **Management**: custom stats (population, defense, morale...) that add income per point; units/staff (garrison, miners...) hired from the fund; buildings with build time and effects, offered by the GM.
- **Simple Calendar** (optional): every elapsed period (days, configurable) collects income and rolls events automatically. Otherwise use "Advance period" or `game.modules.get("passive-income-mgk").api.tick()`.
- Currency is a label plus an optional actor path (e.g. `system.currency.gp`), so it works with any system.

## Editor formats (one entry per line)
| Field | Format |
|---|---|
| Stats | `name\|value\|income per point\|max` |
| Units | `name\|count\|upkeep each\|income each\|hire cost\|max` |
| Events | `kind\|title\|text\|amount\|missed\|itemUUID\|effects\|effects if missed` |
| Buildings | `name\|cost\|income bonus\|description\|build periods\|effects` |

Effects: `Morale+5;Defense-2` (stat names, clamped between 0 and max). Amounts accept dice formulas.

## Usage
Open from the Token controls (coins icon) or `game.modules.get("passive-income-mgk").api.open()`. The GM creates holdings and offers buildings; owners collect, attend events, hire/dismiss units and buy buildings.

## Development
`npm install && npm test && npm run build`
