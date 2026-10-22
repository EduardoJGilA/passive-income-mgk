// Starter templates. Text follows the Foundry UI language (es / en).
export function PRESETS() {
  const es = game.i18n.lang === 'es', L = (e, s) => (es ? s : e);
  const S = (name, value, perPoint = 0, max = 100) => ({ name, value, perPoint, max });
  const U = (name, count, upkeep, income, hire, max) => ({ name, count, upkeep, income, hire, max });
  const E = (kind, title, text, amount, missed, o = {}) => ({ kind, title, text, amount, missed, item: '', fx: '', missedFx: '', weight: 1, cond: '', deadline: 1, season: '', ...o });
  const B = (name, cost, bonus, time, fx, desc) => ({ name, cost, bonus, time, fx, desc });
  const Mor = L('Morale', 'Moral'), Rep = L('Reputation', 'Reputación'), Grd = L('Guards', 'Guardias');
  return [
    {
      key: 'vineyard', name: L('Vineyard', 'Viñedo'), kind: L('Farm', 'Agrícola'), income: '2d6*5', upkeep: '10', eventChance: 35,
      seasons: L('Fall:2.5;Winter:0.3', 'Otoño:2.5;Invierno:0.3'), value: 3000, desc: L('Rolling vines and a modest press.', 'Hileras de vides y una prensa modesta.'),
      stats: [S(L('Quality', 'Calidad'), 50, 0.4), S(Rep, 10, 0.5)],
      units: [U(L('Pickers', 'Vendimiadores'), 6, 1, 3, 20, 20), U(Grd, 1, 2, 0, 40, 6)],
      events: [
        E('good', L('Noble visit', 'Visita de un noble'), L('A noble tastes the wine and wants more.', 'Un noble prueba el vino y quiere más.'), '3d10*5', '0', { weight: 2, fx: `${Rep}+5` }),
        E('bad', L('Blight on the vines', 'Plaga en las vides'), L('Leaves are spotting. Treat it now.', 'Las hojas se manchan. Hay que tratarlo ya.'), '-1d6*5', '-4d6*5', { weight: 2, missedFx: `${L('Quality', 'Calidad')}-10` }),
        E('neutral', L('Barrel merchant', 'Comerciante de barriles'), L('A merchant offers barrels in bulk.', 'Un comerciante ofrece barriles al por mayor.'), '2d6*10', '0'),
        E('bad', L('Bandits prowl', 'Bandidos rondan'), L('Strangers watch the cellar at night.', 'Extraños vigilan la bodega de noche.'), '-2d6', '-5d10*5', { cond: `${Grd}<3`, weight: 2, fx: `${Grd}-1`, missedFx: `${L('Pickers', 'Vendimiadores')}-2` }),
        E('good', L('Exceptional harvest', 'Cosecha excepcional'), L('The grapes ripen perfectly.', 'Las uvas maduran de forma perfecta.'), '6d10*5', '0', { season: L('Fall', 'Otoño'), deadline: 2, fx: `${L('Quality', 'Calidad')}+5` })
      ],
      upgrades: [B(L('New press', 'Prensa nueva'), 300, 15, 2, `${L('Quality', 'Calidad')}+10`, ''), B(L('Wine cellar', 'Bodega'), 500, 30, 3, `${Rep}+10`, ''), B(L('Wall and watch', 'Muro y guardia'), 200, 0, 2, `${Grd}+2`, '')]
    },
    {
      key: 'quarry', name: L('Quarry', 'Cantera'), kind: L('Industry', 'Industria'), income: '3d6*5', upkeep: '15', eventChance: 30, seasons: '', value: 4000,
      desc: L('Stone and gravel for every builder in the region.', 'Piedra y grava para todos los constructores de la región.'),
      stats: [S(L('Safety', 'Seguridad'), 60, 0.3), S(Mor, 50, 0.2)],
      units: [U(L('Miners', 'Canteros'), 8, 1, 4, 25, 30), U(Grd, 2, 2, 0, 40, 8)],
      events: [
        E('bad', L('Cave-in', 'Derrumbe'), L('Part of the face collapsed.', 'Parte del frente se derrumbó.'), '-2d6*5', '-6d6*5', { weight: 2, cond: `${L('Safety', 'Seguridad')}<50`, fx: `${Mor}-5`, missedFx: `${L('Miners', 'Canteros')}-3` }),
        E('good', L('Rich vein', 'Veta rica'), L('The crew hit a rich seam.', 'La cuadrilla dio con una veta rica.'), '4d10*5', '0', { fx: `${Mor}+5` }),
        E('neutral', L('Builder contract', 'Contrato de obra'), L('A guild wants a bulk order.', 'Un gremio quiere un pedido grande.'), '3d6*10', '0', { deadline: 2 })
      ],
      upgrades: [B(L('Support beams', 'Vigas de soporte'), 250, 0, 2, `${L('Safety', 'Seguridad')}+15`, ''), B(L('Crane', 'Grúa'), 600, 35, 3, '', '')]
    },
    {
      key: 'tavern', name: L('Tavern', 'Taberna'), kind: L('Commerce', 'Comercio'), income: '2d8*3', upkeep: '8', eventChance: 45, seasons: '', value: 1500,
      desc: L('Warm hearth, cold ale, loose tongues.', 'Hogar cálido, cerveza fría, lenguas sueltas.'),
      stats: [S(Rep, 20, 0.6), S(L('Comfort', 'Comodidad'), 40, 0.2)],
      units: [U(L('Staff', 'Personal'), 3, 1, 2, 15, 12), U(L('Bouncers', 'Gorilas'), 1, 2, 0, 30, 4)],
      events: [
        E('bad', L('Brawl', 'Pelea'), L('Chairs are flying.', 'Vuelan las sillas.'), '-1d10*2', '-3d10*2', { cond: `${L('Bouncers', 'Gorilas')}<2`, missedFx: `${Rep}-5` }),
        E('good', L('Bard night', 'Noche de bardo'), L('A famous bard plays for free.', 'Un bardo famoso toca gratis.'), '4d8*3', '0', { weight: 2, fx: `${Rep}+5` }),
        E('neutral', L('Rumor for sale', 'Rumor en venta'), L('A drunk sells a rumor for the price of a drink.', 'Un borracho vende un rumor por una copa.'), '0', '0', { weight: 2 })
      ],
      upgrades: [B(L('Extra rooms', 'Cuartos extra'), 300, 20, 2, `${L('Comfort', 'Comodidad')}+10`, ''), B(L('Stage', 'Escenario'), 400, 15, 2, `${Rep}+10`, '')]
    },
    {
      key: 'village', name: L('Village', 'Aldea'), kind: L('Settlement', 'Asentamiento'), income: '1d10*5', upkeep: '20', eventChance: 40, seasons: L('Fall:1.5;Winter:0.5', 'Otoño:1.5;Invierno:0.5'), value: 8000,
      desc: L('A small settlement that pays you tribute.', 'Un pequeño asentamiento que te rinde tributo.'),
      stats: [S(L('Population', 'Población'), 200, 0.15, 1000), S(Mor, 50, 0), S(L('Defense', 'Defensa'), 10, 0, 50)],
      units: [U(L('Militia', 'Milicia'), 6, 1, 0, 30, 30), U(L('Farmers', 'Granjeros'), 40, 0, 0.5, 5, 200)],
      events: [
        E('bad', L('Raid', 'Saqueo'), L('Raiders approach at dusk.', 'Saqueadores se acercan al anochecer.'), '-1d10*5', '-4d10*5', { weight: 2, cond: `${L('Defense', 'Defensa')}<30`, fx: `${Mor}-5`, missedFx: `${L('Population', 'Población')}-15;${Mor}-10` }),
        E('good', L('Festival', 'Festival'), L('The villagers celebrate your name.', 'Los aldeanos celebran tu nombre.'), '2d10*5', '0', { fx: `${Mor}+10` }),
        E('bad', L('Illness', 'Enfermedad'), L('A fever spreads through the huts.', 'Una fiebre corre por las chozas.'), '-2d6*5', '-3d6*5', { missedFx: `${L('Population', 'Población')}-10;${L('Farmers', 'Granjeros')}-5` }),
        E('good', L('Settlers arrive', 'Llegan colonos'), L('A caravan asks to settle.', 'Una caravana pide asentarse.'), '0', '0', { fx: `${L('Population', 'Población')}+20;${L('Farmers', 'Granjeros')}+5` })
      ],
      upgrades: [B(L('Palisade', 'Empalizada'), 300, 0, 3, `${L('Defense', 'Defensa')}+15`, ''), B(L('Market', 'Mercado'), 500, 40, 3, `${Mor}+5`, ''), B(L('Well', 'Pozo'), 150, 5, 1, `${L('Population', 'Población')}+30`, '')]
    },
    {
      key: 'castle', name: L('Castle', 'Castillo'), kind: L('Stronghold', 'Fortaleza'), income: '4d10*5', upkeep: '120', eventChance: 40, seasons: '', value: 50000,
      desc: L('Walls, a garrison and the lands around.', 'Muros, una guarnición y las tierras alrededor.'),
      stats: [S(L('Defense', 'Defensa'), 40, 0, 100), S(Mor, 60, 0), S(L('Prestige', 'Prestigio'), 20, 1, 100)],
      units: [U(L('Soldiers', 'Soldados'), 20, 2, 0, 50, 100), U(L('Servants', 'Sirvientes'), 10, 1, 0, 10, 40), U(L('Knights', 'Caballeros'), 2, 8, 0, 300, 10)],
      events: [
        E('bad', L('Siege', 'Asedio'), L('An enemy host appears at the walls.', 'Un ejército enemigo aparece ante los muros.'), '-4d10*5', '-10d10*5', { weight: 2, cond: `${L('Defense', 'Defensa')}<60`, fx: `${L('Soldiers', 'Soldados')}-5`, missedFx: `${L('Soldiers', 'Soldados')}-15;${Mor}-15`, deadline: 2 }),
        E('good', L('Royal envoy', 'Enviado real'), L('The crown sends gifts and praise.', 'La corona envía regalos y elogios.'), '5d10*10', '0', { fx: `${L('Prestige', 'Prestigio')}+10` }),
        E('bad', L('Intrigue', 'Intriga'), L('A servant is selling secrets.', 'Un sirviente vende secretos.'), '-1d10*5', '-3d10*10', { missedFx: `${Mor}-10;${L('Prestige', 'Prestigio')}-5` }),
        E('neutral', L('Tournament', 'Torneo'), L('Neighbors ask to host a tournament.', 'Los vecinos piden organizar un torneo.'), '-2d10*10', '0', { fx: `${L('Prestige', 'Prestigio')}+15` })
      ],
      upgrades: [B(L('Higher walls', 'Muros más altos'), 2000, 0, 4, `${L('Defense', 'Defensa')}+20`, ''), B(L('Barracks', 'Barracones'), 1500, 0, 3, `${L('Soldiers', 'Soldados')}+10;${Mor}+5`, ''), B(L('Great hall', 'Gran salón'), 3000, 150, 5, `${L('Prestige', 'Prestigio')}+15`, '')]
    },
    {
      key: 'mine', name: L('Mine', 'Mina'), kind: L('Industry', 'Industria'), income: '4d10*8', upkeep: '40', eventChance: 40, seasons: '', value: 12000,
      desc: L('Deep shafts and a stubborn seam of ore.', 'Túneles profundos y una veta de mineral obstinada.'),
      stats: [S(L('Ore reserve', 'Reserva de mineral'), 100, 0.5, 200), S(L('Safety', 'Seguridad'), 50, 0.2)],
      units: [U(L('Miners', 'Mineros'), 12, 1, 5, 30, 50), U(Grd, 2, 2, 0, 40, 8)],
      events: [
        E('bad', L('Flooding', 'Inundación'), L('Water seeps into the lower shaft.', 'El agua se filtra al túnel inferior.'), '-2d6*10', '-5d6*10', { cond: `${L('Safety', 'Seguridad')}<40`, missedFx: `${L('Miners', 'Mineros')}-4` }),
        E('good', L('New seam', 'Nueva veta'), L('The drills hit a fresh seam.', 'Las perforadoras dan con una veta nueva.'), '3d10*10', '0', { weight: 2, fx: `${L('Ore reserve', 'Reserva de mineral')}+20` }),
        E('bad', L('Strike', 'Huelga'), L('The miners demand better pay.', 'Los mineros exigen mejor paga.'), '-2d10*5', '-4d10*5', { missedFx: `${L('Miners', 'Mineros')}-3` })
      ],
      upgrades: [B(L('Pumps', 'Bombas'), 600, 0, 2, `${L('Safety', 'Seguridad')}+20`, ''), B(L('Deeper shaft', 'Túnel profundo'), 1200, 60, 4, `${L('Ore reserve', 'Reserva de mineral')}+50`, '')]
    }
  ];
}
