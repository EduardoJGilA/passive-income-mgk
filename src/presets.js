// Starter templates. Text follows module setting or Foundry UI language (es / en).
export function PRESETS() {
  let lang = 'auto';
  try { lang = game.settings.get('passive-income-mgk', 'language') || 'auto'; } catch {}
  const es = (lang === 'auto' ? game.i18n.lang : lang) === 'es', L = (e, s) => (es ? s : e);
  const S = (name, value, perPoint = 0, max = 100) => ({ name, value, perPoint, max });
  const U = (name, count, upkeep, income, hire, max) => ({ name, count, upkeep, income, hire, max });
  const E = (kind, title, text, amount, missed, o = {}) => ({ kind, title, text, amount, missed, item: '', fx: '', missedFx: '', weight: 1, cond: '', deadline: 1, season: '', ...o });
  const B = (name, cost, bonus, time, fx, desc) => ({ name, cost, bonus, time, fx, desc });
  const Mor = L('Morale', 'Moral'), Rep = L('Reputation', 'Reputación'), Grd = L('Guards', 'Guardias');

  const list = [
    {
      key: 'vineyard', img: 'icons/environment/settlement/winemaker-still-vintner.webp', icon: 'fa-wine-bottle', name: L('Veil Terraces Vineyard', 'Viñedo de las Terrazas del Velo'), kind: L('Agriculture', 'Agricultura'), income: '1d6+1', upkeep: '10', eventChance: 35,
      seasons: L('Fall:2.5;Winter:0.3;Stav:2.5;Choref:0.3;3:2.5;4:0.3', 'Otoño:2.5;Invierno:0.3;Stav:2.5;Choref:0.3;3:2.5;4:0.3'), value: 3000, desc: L('Rolling vines, lush hillside terraces, and a modest oak wine press.', 'Hileras de vides, terrazas verdes y una modesta prensa de roble.'),
      stats: [S(L('Quality', 'Calidad'), 50, 0.1), S(Rep, 10, 0.1)],
      units: [U(L('Pickers', 'Vendimiadores'), 6, 1, 1, 20, 20), U(Grd, 1, 2, 0, 40, 6)],
      events: [
        E('good', L('Order from the Golden Druid', 'Pedido del Druida de Oro'), L('An emissary of the silent cloister orders sacred wine barrels.', 'Un emisario del claustro encarga barricas de vino sagrado para ofrendas.'), '2d10*5', '0', { weight: 2, fx: `${Rep}+6` }),
        E('bad', L('Rotting root', 'Raíz podrida'), L('Dark mold seeps from the cloister boundary, fouling the lowest terrace.', 'Moho oscuro avanza desde los lindes del claustro y pudre la terraza baja.'), '-1d6*5', '-3d6*5', { weight: 2, missedFx: `${L('Quality', 'Calidad')}-8` }),
        E('good', L('Noble visit', 'Visita de un noble'), L('A noble connoisseur tastes the vintage and places a massive order.', 'Un noble catador prueba la cosecha y hace un pedido cuantioso.'), '3d10*5', '0', { weight: 2, fx: `${Rep}+5` }),
        E('bad', L('Blight on the vines', 'Plaga en las vides'), L('Leaves are spotting black. Treat the vines or lose part of the harvest.', 'Hojas manchadas de negro. Hay que tratar las vides de inmediato.'), '-1d6*5', '-4d6*5', { weight: 2, missedFx: `${L('Quality', 'Calidad')}-10` }),
        E('neutral', L('Barrel merchant', 'Comerciante de barriles'), L('A cooper offers seasoned oak barrels in bulk.', 'Un tonelero ofrece barriles de roble curado al por mayor.'), '2d6*10', '0'),
        E('bad', L('Bandits prowl', 'Bandidos rondan'), L('Suspicious scouts watch the wine cellar at night.', 'Exploradores sospechosos vigilan la bodega al anochecer.'), '-2d6', '-5d10*5', { cond: `${Grd}<3`, weight: 2, fx: `${Grd}-1`, missedFx: `${L('Pickers', 'Vendimiadores')}-2` }),
        E('good', L('Exceptional vintage', 'Cosecha excepcional'), L('The grapes ripen perfectly with ideal autumn sun.', 'Las uvas maduran con dulzura perfecta bajo el sol otoñal.'), '6d10*5', '0', { season: L('Fall,Stav,3', 'Otoño,Stav,3'), deadline: 2, fx: `${L('Quality', 'Calidad')}+5` })
      ],
      upgrades: [
        B(L('Heavy screw press', 'Prensa de tornillo'), 300, 15, 2, `${L('Quality', 'Calidad')}+10`, L('Improves grape extraction rate.', 'Mejora el rendimiento de prensado.')),
        B(L('Stone wine cellar', 'Bodega de piedra subterránea'), 500, 30, 3, `${Rep}+10`, L('Regulates barrel aging temperature.', 'Estabiliza la crianza del vino en barricas.')),
        B(L('Perimeter wall & watchtower', 'Muro y atalaya'), 200, 0, 2, `${Grd}+2`, L('Deters bandits and nighttime thieves.', 'Disuade a bandidos y merodeadores.'))
      ]
    },
    {
      key: 'tavern', img: 'icons/environment/settlement/tavern.webp', icon: 'fa-beer-mug-empty', name: L('Tavern & Inn', 'Taberna y Posada'), kind: L('Commerce', 'Comercio'), income: '2d8*4', upkeep: '12', eventChance: 45, seasons: '', value: 2000,
      desc: L('Roaring hearth, cold foaming ale, and adventurers swapping rumors.', 'Hogar ardiente, cerveza espumosa y aventureros compartiendo rumores.'),
      stats: [S(Rep, 25, 0.6), S(L('Comfort', 'Comodidad'), 40, 0.3)],
      units: [U(L('Staff', 'Personal'), 3, 1, 3, 15, 12), U(L('Bouncers', 'Gorilas'), 1, 2, 0, 30, 4)],
      events: [
        E('bad', L('Tavern brawl', 'Pelea de taberna'), L('Tables shatter and tankards fly.', 'Mesas destrozadas y jarras volando.'), '-1d10*2', '-3d10*2', { cond: `${L('Bouncers', 'Gorilas')}<2`, missedFx: `${Rep}-5` }),
        E('good', L('Celebrated bard', 'Bardo famoso'), L('A master musician plays for packed crowds.', 'Un trovador de renombre llena el local hasta los topes.'), '4d8*4', '0', { weight: 2, fx: `${Rep}+8` }),
        E('neutral', L('Adventurers trade', 'Pacto de aventureros'), L('Mercenaries celebrate a bounty and spend freely.', 'Mercenarios gastan sus monedas celebrando una cacería.'), '3d8*5', '0', { weight: 2 })
      ],
      upgrades: [
        B(L('Upstairs guest rooms', 'Habitaciones superiores'), 350, 25, 2, `${L('Comfort', 'Comodidad')}+15`, L('Attracts wealthier travelers and merchants.', 'Atrae a viajeros acomodados y mercaderes.')),
        B(L('Entertainment stage', 'Escenario para espectáculos'), 450, 20, 2, `${Rep}+12`, L('Attracts prominent performers and gamblers.', 'Atrae a artistas y apostadores destacados.'))
      ]
    },
    {
      key: 'quarry', img: 'icons/environment/settlement/quarry.webp', icon: 'fa-mountain', name: L('Stone Quarry', 'Cantera de Canteros'), kind: L('Industry', 'Industria'), income: '3d6*6', upkeep: '18', eventChance: 30, seasons: '', value: 4500,
      desc: L('Granite blocks and building gravel supplied to fortifications and towns.', 'Bloques de granito y grava para murallas y ciudades de toda la región.'),
      stats: [S(L('Safety', 'Seguridad'), 65, 0.3), S(Mor, 50, 0.2)],
      units: [U(L('Miners', 'Canteros'), 8, 1, 4, 25, 30), U(Grd, 2, 2, 0, 40, 8)],
      events: [
        E('bad', L('Rockslide', 'Desprendimiento'), L('A rock wall collapsed over the lower cut.', 'Parte del frente rocoso colapsó sobre el corte inferior.'), '-2d6*5', '-6d6*5', { weight: 2, cond: `${L('Safety', 'Seguridad')}<50`, fx: `${Mor}-5`, missedFx: `${L('Miners', 'Canteros')}-3` }),
        E('good', L('High-grade marble', 'Veta de mármol noble'), L('Workers reveal a pristine deposit of white marble.', 'Los obreros descubren un veteado de mármol blanco de gran valor.'), '5d10*6', '0', { fx: `${Mor}+5` }),
        E('neutral', L('Civic guild contract', 'Contrato del gremio'), L('The crown places a priority order for ramparts.', 'La corona encarga sillería prioritaria para defensas.'), '4d8*6', '0', { deadline: 2 })
      ],
      upgrades: [
        B(L('Timber shoring', 'Entibado de madera'), 300, 0, 2, `${L('Safety', 'Seguridad')}+20`, L('Prevents accidents and dangerous rockfalls.', 'Previene accidentes y desprendimientos.')),
        B(L('Steam crane', 'Grúa de contrapeso'), 700, 45, 3, '', L('Accelerates loading and heavy stone cutting.', 'Acelera la extracción y carga de grandes bloques.'))
      ]
    },
    {
      key: 'village', img: 'icons/environment/settlement/house-farmland.webp', icon: 'fa-tree', name: L('Farming Village', 'Aldea Rural'), kind: L('Settlement', 'Asentamiento'), income: '2d8*5', upkeep: '20', eventChance: 40, seasons: L('Fall:1.5;Winter:0.5', 'Otoño:1.5;Invierno:0.5'), value: 8500,
      desc: L('A humble settlement paying tithes in exchange for protection and law.', 'Un humilde asentamiento que rinde tributo a cambio de protección y justicia.'),
      stats: [S(L('Population', 'Población'), 200, 0.15, 1000), S(Mor, 50, 0), S(L('Defense', 'Defensa'), 15, 0, 60)],
      units: [U(L('Militia', 'Milicia'), 6, 1, 0, 30, 30), U(L('Farmers', 'Campesinos'), 40, 0, 0.5, 5, 200)],
      events: [
        E('bad', L('Raiders attack', 'Incursión hostil'), L('Outlaws raid farms on the outskirts.', 'Forajidos asaltan las granjas periféricas.'), '-1d10*5', '-4d10*5', { weight: 2, cond: `${L('Defense', 'Defensa')}<35`, fx: `${Mor}-5`, missedFx: `${L('Population', 'Población')}-15;${Mor}-10` }),
        E('good', L('Village festival', 'Fiestas patronales'), L('A bountiful fair brings music, dances and tithes.', 'Una gran feria atrae música, danzas y diezmos generosos.'), '3d10*6', '0', { fx: `${Mor}+12` }),
        E('good', L('Caravan settlement', 'Llegada de colonos'), L('Refugees and artisans swear fealty and settle down.', 'Familias de artesanos y colonos se asientan formalmente.'), '0', '0', { fx: `${L('Population', 'Población')}+25;${L('Farmers', 'Campesinos')}+6` })
      ],
      upgrades: [
        B(L('Stout palisade', 'Empalizada de robles'), 350, 0, 3, `${L('Defense', 'Defensa')}+20`, L('Fortifies perimeter against wild beasts and raiders.', 'Refuerza el perímetro frente a asaltos.')),
        B(L('Market square', 'Plaza del mercado'), 550, 45, 3, `${Mor}+8`, L('Invites wandering merchants and itinerant peddlers.', 'Fomenta el comercio ambulante y las ferias.')),
        B(L('Deep stone well', 'Pozo comunal de cantería'), 200, 5, 1, `${L('Population', 'Población')}+30`, L('Provides clean water and sustains expansion.', 'Garantiza agua pura y fomenta el crecimiento.'))
      ]
    },
    {
      key: 'castle', img: 'icons/environment/settlement/castle.webp', icon: 'fa-chess-rook', name: L('Border Fortress', 'Fortaleza Fronteriza'), kind: L('Military', 'Militar'), income: '4d10*6', upkeep: '100', eventChance: 40, seasons: '', value: 45000,
      desc: L('Towering battlements, an armed garrison, and sovereign authority over the lands.', 'Almenas imponentes, guarnición juramentada y autoridad sobre la comarca.'),
      stats: [S(L('Defense', 'Defensa'), 50, 0, 100), S(Mor, 60, 0), S(L('Prestige', 'Prestigio'), 25, 1.2, 100)],
      units: [U(L('Soldiers', 'Soldados'), 20, 2, 0, 50, 100), U(L('Servants', 'Sirvientes'), 10, 1, 0, 10, 40), U(L('Knights', 'Caballeros'), 2, 8, 0, 300, 10)],
      events: [
        E('bad', L('Hostile siege', 'Asedio enemigo'), L('A hostile host surrounds the valley road.', 'Fuerzas enemigas sitian el paso del valle.'), '-4d10*6', '-10d10*6', { weight: 2, cond: `${L('Defense', 'Defensa')}<70`, fx: `${L('Soldiers', 'Soldados')}-5`, missedFx: `${L('Soldiers', 'Soldados')}-15;${Mor}-15`, deadline: 2 }),
        E('good', L('Crown recognition', 'Reconocimiento regio'), L('The realm honors your guard with royal subsidies.', 'La corona reconoce el bastión y otorga subsidios reales.'), '6d10*10', '0', { fx: `${L('Prestige', 'Prestigio')}+15` }),
        E('neutral', L('Grand tournament', 'Gran torneo de caballería'), L('Lords compete in jousting and festivities.', 'Señores vecinos compiten en justas y celebraciones.'), '-2d10*10', '0', { fx: `${L('Prestige', 'Prestigio')}+20` })
      ],
      upgrades: [
        B(L('Machicolated ramparts', 'Matacanes y parapetos'), 1800, 0, 4, `${L('Defense', 'Defensa')}+25`, L('Deadly defense against scaling ladders.', 'Defensa letal contra escalas y asaltos.')),
        B(L('Reinforced barracks', 'Barracones fortificados'), 1400, 0, 3, `${L('Soldiers', 'Soldados')}+10;${Mor}+6`, L('Houses additional fighting forces.', 'Aumenta el cupo y la moral de la tropa.')),
        B(L('Feasting hall', 'Gran salón de banquetes'), 2800, 140, 5, `${L('Prestige', 'Prestigio')}+18`, L('Generates tribute and lordly alliances.', 'Genera alianzas señoriales y mayor prestigio.'))
      ]
    },
    {
      key: 'mine', img: 'icons/environment/settlement/mine-cart-rocks-red.webp', icon: 'fa-gem', name: L('Deep Silver Mine', 'Mina de Plata'), kind: L('Mining', 'Minería'), income: '4d10*8', upkeep: '40', eventChance: 40, seasons: '', value: 14000,
      desc: L('Subterranean shafts penetrating deep into glittering silver seams.', 'Galerías subterráneas que horadan vetas ricas de plata y metales nobles.'),
      stats: [S(L('Ore reserve', 'Reserva de plata'), 100, 0.6, 250), S(L('Safety', 'Seguridad'), 50, 0.2)],
      units: [U(L('Miners', 'Mineros'), 12, 1, 5, 30, 60), U(Grd, 2, 2, 0, 40, 10)],
      events: [
        E('bad', L('Subterranean flood', 'Inundación subterránea'), L('Water breaches the lowest gallery.', 'El agua inunda la galería más profunda.'), '-2d6*10', '-6d6*10', { cond: `${L('Safety', 'Seguridad')}<45`, missedFx: `${L('Miners', 'Mineros')}-4` }),
        E('good', L('Mother lode', 'Veta madre'), L('Drills reveal a sparkling wall of pure native silver.', 'Los picos alcanzan una pared maciza de plata nativa.'), '4d10*10', '0', { weight: 2, fx: `${L('Ore reserve', 'Reserva de plata')}+25` }),
        E('bad', L('Miner grievances', 'Huelga minera'), L('Workers demand hazard bonuses after tremors.', 'Los obreros reclaman primas de riesgo tras los temblores.'), '-2d10*5', '-4d10*5', { missedFx: `${L('Miners', 'Mineros')}-3` })
      ],
      upgrades: [
        B(L('Hydraulic drainage pumps', 'Bombas hidráulicas de achique'), 700, 0, 2, `${L('Safety', 'Seguridad')}+20`, L('Keeps galleries dry and prevents cave flooding.', 'Mantiene los túneles a salvo de filtraciones.')),
        B(L('Deep blast tunnel', 'Túnel de voladura profunda'), 1400, 70, 4, `${L('Ore reserve', 'Reserva de plata')}+60`, L('Opens rich veins in subterranean depths.', 'Desbloquea reservas masivas en niveles inferiores.'))
      ]
    },
    {
      key: 'tower', img: 'icons/environment/settlement/tower-stone-blue.webp', icon: 'fa-hat-wizard', name: L('Mage Tower & Spire', 'Torre del Mago'), kind: L('Arcane', 'Arcano'), income: '3d10*8', upkeep: '45', eventChance: 45, seasons: '', value: 18000,
      desc: L('A soaring spire channeling ley lines, scribing scrolls, and distilling reagents.', 'Una aguja mágica que canaliza líneas ley, transcribe pergaminos y destila esencias.'),
      stats: [S(L('Arcane energy', 'Energía arcana'), 60, 0.5, 150), S(L('Stability', 'Estabilidad'), 70, 0.3, 100)],
      units: [U(L('Apprentices', 'Aprendices'), 4, 1, 4, 35, 12), U(L('Golems', 'Golems'), 1, 3, 0, 120, 4)],
      events: [
        E('bad', L('Wild magic surge', 'Descarga de magia salvaje'), L('Spells unravel and crystals shatter across the laboratory.', 'Chispas etéreas desestabilizan el laboratorio alquímico.'), '-2d8*8', '-5d8*8', { cond: `${L('Stability', 'Estabilidad')}<50`, fx: `${L('Stability', 'Estabilidad')}-10`, missedFx: `${L('Apprentices', 'Aprendices')}-1` }),
        E('good', L('Philosopher discovery', 'Descubrimiento alquímico'), L('An experiment yields valuable alchemical transmutations.', 'Un experimento produce transmutaciones de gran valor.'), '4d10*8', '0', { weight: 2, fx: `${L('Arcane energy', 'Energía arcana')}+15` }),
        E('neutral', L('Guild request', 'Petición del consejo'), L('A wizard circle commissions rare scrolls and enchanted elixirs.', 'El cónclave arcano encarga pergaminos y elixires.'), '3d10*10', '0')
      ],
      upgrades: [
        B(L('Astral observatory', 'Observatorio astral'), 900, 40, 3, `${L('Arcane energy', 'Energía arcana')}+25`, L('Aligns lenses with celestial conjunctions.', 'Mejora la captación cósmica.')),
        B(L('Warding sigils', 'Sellos de contención'), 600, 0, 2, `${L('Stability', 'Estabilidad')}+25`, L('Prevents dangerous arcane surges.', 'Disminuye la volatilidad mágica.'))
      ]
    },
    {
      key: 'thieves', img: 'icons/environment/settlement/sewer-entrance.webp', icon: 'fa-mask', name: L('Shadow Den & Guild', 'Guarida de Ladrones'), kind: L('Underworld', 'Bajos fondos'), income: '3d8*8', upkeep: '25', eventChance: 50, seasons: '', value: 7500,
      desc: L('Hidden cellars, forged passes, and black-market syndicates skimming the city.', 'Sótanos secretos, salvoconductos falsificados y redes de contrabando.'),
      stats: [S(L('Infiltration', 'Infiltración'), 40, 0.5, 100), S(L('Heat', 'Alerta de la guardia'), 20, 0, 100)],
      units: [U(L('Footpads', 'Rateros'), 8, 1, 3, 15, 30), U(L('Fences', 'Peristas'), 2, 2, 6, 45, 6)],
      events: [
        E('bad', L('City guard raid', 'Batida de la guardia'), L('Watchmen storm a front tavern looking for contraband.', 'La guardia urbana registra un callejón clave buscando pruebas.'), '-2d8*6', '-5d8*6', { cond: `${L('Heat', 'Alerta de la guardia')}>50`, missedFx: `${L('Footpads', 'Rateros')}-3` }),
        E('good', L('High-profile heist', 'Golpe maestro'), L('A nobleman carriage loses its lockbox in the night.', 'Un cofre diplomático se extravía oportunamente en las sombras.'), '6d10*6', '0', { weight: 2, fx: `${L('Infiltration', 'Infiltración')}+10;${L('Heat', 'Alerta de la guardia')}+15` }),
        E('neutral', L('Blackmail leverage', 'Información privilegiada'), L('Compromising letters offer leverage over local officials.', 'Cartas indiscretas garantizan silencio y favores.'), '2d10*8', '0')
      ],
      upgrades: [
        B(L('Smuggler tunnels', 'Túneles de fuga'), 500, 20, 2, `${L('Infiltration', 'Infiltración')}+15`, L('Secret routes connecting the sewers and docks.', 'Rutas de escape bajo las alcantarillas.')),
        B(L('Counterfeit workshop', 'Taller de falsificación'), 800, 45, 3, '', L('Stamps false coins, seals and passage deeds.', 'Troquela sellos oficiales y salvoconductos.'))
      ]
    },
    {
      key: 'port', img: 'icons/environment/settlement/ship.webp', icon: 'fa-ship', name: L('Merchant Port & Docks', 'Puerto Mercante'), kind: L('Maritime', 'Marítimo'), income: '4d8*7', upkeep: '50', eventChance: 45, seasons: L('Winter:0.4', 'Invierno:0.4'), value: 22000,
      desc: L('Wharves packed with galleons, warehouses, customs tariffs, and spices from across the seas.', 'Muelles con galeones, aduanas, almacenes de ultramar y especias exóticas.'),
      stats: [S(L('Trade volume', 'Flujo comercial'), 60, 0.7, 200), S(L('Naval safety', 'Seguridad marítima'), 50, 0.3, 100)],
      units: [U(L('Dockworkers', 'Estibadores'), 15, 1, 2, 15, 50), U(L('Marines', 'Infantería naval'), 4, 3, 0, 60, 15)],
      events: [
        E('bad', L('Pirate raiders', 'Asalto corsario'), L('Pirates harass shipping lanes outside the bay.', 'Barcos piratas bloquean las rutas de entrada a la bahía.'), '-3d10*6', '-7d10*6', { cond: `${L('Naval safety', 'Seguridad marítima')}<50`, missedFx: `${L('Trade volume', 'Flujo comercial')}-20` }),
        E('good', L('Treasure galleon', 'Galeón de ultramar'), L('A storm redirects a rich merchant vessel to your moorings.', 'Un navío cargado de seda y plata fondea en vuestros muelles.'), '6d10*8', '0', { weight: 2, fx: `${L('Trade volume', 'Flujo comercial')}+15` }),
        E('neutral', L('Harbor customs boom', 'Auge arancelario'), L('Favorable winds bring an influx of commercial fleets.', 'Vientos propicios llenan los fondeaderos de flotas extranjeras.'), '4d10*6', '0')
      ],
      upgrades: [
        B(L('Deep-water pier', 'Muelle de aguas profundas'), 1200, 60, 3, `${L('Trade volume', 'Flujo comercial')}+25`, L('Accommodates three-masted carracks and heavy haulers.', 'Permite atracar a carracas y naos pesadas.')),
        B(L('Harbor beacon & lighthouse', 'Faro de la bahía'), 800, 20, 2, `${L('Naval safety', 'Seguridad marítima')}+25`, L('Guides ships through fog and reefs.', 'Navegación nocturna segura entre escollos.'))
      ]
    },
    {
      key: 'temple', img: 'icons/environment/settlement/church.webp', icon: 'fa-place-of-worship', name: L('Sacred Sanctuary', 'Santuario Sagrado'), kind: L('Faith', 'Religión'), income: '2d10*6', upkeep: '20', eventChance: 35, seasons: '', value: 12000,
      desc: L('Marble colonnades, sacred relics, incense altars, and devout pilgrims seeking boons.', 'Columnatas de mármol, reliquias veneradas y peregrinos buscando bendiciones.'),
      stats: [S(L('Devotion', 'Devoción'), 50, 0.5, 150), S(L('Pilgrims', 'Peregrinos'), 40, 0.3, 200)],
      units: [U(L('Acolytes', 'Acólitos'), 6, 1, 2, 20, 25), U(L('Templars', 'Templarios'), 2, 3, 0, 80, 8)],
      events: [
        E('good', L('Miraculous recovery', 'Milagro constatado'), L('A notable cure draws thousands of devout followers.', 'Una curación inexplicable atrae a multitudes devotas.'), '5d10*6', '0', { weight: 2, fx: `${L('Devotion', 'Devoción')}+15;${L('Pilgrims', 'Peregrinos')}+20` }),
        E('bad', L('Heresy rumors', 'Sospechas de cisma'), L('An inquisitor visits to examine sacred doctrines.', 'Un emisario eclesiástico audita los ritos del santuario.'), '-2d8*5', '-4d8*5', { missedFx: `${L('Devotion', 'Devoción')}-15` }),
        E('neutral', L('Pilgrim tithe', 'Diezmo de peregrinos'), L('A high holiday sees gold poured into the offering basins.', 'Una festividad mayor llena las pilas de ofrendas.'), '3d10*8', '0')
      ],
      upgrades: [
        B(L('Reliquary vault', 'Cámara de reliquias'), 900, 35, 3, `${L('Devotion', 'Devoción')}+20`, L('Houses blessed bones and sacred relics.', 'Conserva reliquias insignes que atraen devotos.')),
        B(L('Hospice of charity', 'Hospicio de caridad'), 600, 15, 2, `${L('Pilgrims', 'Peregrinos')}+30`, L('Cares for the weary, increasing renown.', 'Da asilo a los enfermos, aumentando la fama sagrada.'))
      ]
    }
  ];

  // products (reference price, demand per month, quality expr), named manager candidates (hidden until the GM offers them),
  // unit production and portraits, upgrade requirements. All amounts per 30 days; fx of managers is per star.
  const I = 'icons/environment/people/', C = 'icons/consumables/', M = 'icons/commodities/', ES = 'icons/environment/settlement/';
  const P = (name, unit, base, demand, quality, img, desc, o = {}) => ({ name, unit, base, price: base, demand, quality, img, desc, stock: 0, spoil: 0, cond: '', ...o });
  const St = (name, role, stars, wage, fee, train, fx, img, desc) => ({ name, role, stars, wage, fee, train, fx, img, desc });
  const X = {
    vineyard: {
      products: [
        P(L('Wine', 'Vino'), L('bottles', 'botellas'), 2, `${Rep}*3`, `${L('Quality', 'Calidad')}*0.04`, C + 'drinks/wine-bottle-glass-white.webp', L('House wine from the terraces.', 'Vino de la casa, de las terrazas.')),
        P(L('Grand Reserve', 'Gran Reserva'), L('bottles', 'botellas'), 8, `${Rep}*0.5`, `${L('Quality', 'Calidad')}*0.04`, C + 'drinks/wine-amphora-clay-red.webp', L('Long-aged wine for nobles. Needs the stone cellar.', 'Crianza larga para nobles. Requiere la bodega de piedra.'), { cond: `${L('Quality', 'Calidad')}>=70` })
      ],
      units: [{ prod: '6', makes: L('Wine', 'Vino'), img: I + 'commoner.webp', desc: L('Seasonal hands for pruning and harvest.', 'Jornaleros para poda y vendimia.') }, { img: I + 'spearfighter.webp' }],
      staff: [
        St(L('Brenn Deeproot', 'Brenn Raízhonda'), L('Overseer', 'Capataz'), 1, 1, 3, 12, `${L('Pickers', 'Vendimiadores')}+1`, I + 'commoner.webp', L('Honest day labourer; slow but steady.', 'Jornalero honrado; lento pero constante.')),
        St('Ondine Lisár', L('Winemaker', 'Enóloga'), 4, 10, 80, 35, `${L('Quality', 'Calidad')}+4`, I + 'cleric-grey.webp', L('Elven master of a legendary reserve. Demanding and expensive.', 'Maestra élfica de una reserva legendaria. Exigente y cara.')),
        St(L('Pell Silvertongue', 'Pell «Lengua de Plata»'), L('Sales agent', 'Agente comercial'), 2, 3, 12, 15, `${Rep}+2`, I + 'group.webp', L('Knows every tavern keeper and half their debts.', 'Conoce a todos los taberneros y a la mitad de sus deudas.'))
      ],
      req: { 1: `${L('Quality', 'Calidad')}>=60` }
    },
    tavern: {
      products: [P(L('Meals & drinks', 'Comidas y bebidas'), L('servings', 'raciones'), 0.3, `${Rep}*4`, `${L('Comfort', 'Comodidad')}*0.03`, C + 'food/bowl-stew-brown.webp', L('Stew, bread and ale for travellers.', 'Guiso, pan y cerveza para viajeros.'), { spoil: 60 })],
      units: [{ prod: '30', img: I + 'commoner.webp', desc: L('Cooks, maids and servers.', 'Cocineros, criadas y meseros.') }, { img: I + 'infantry.webp' }],
      staff: [
        St(L('Marta Cinderpot', 'Marta Ollahumo'), L('Head cook', 'Cocinera mayor'), 2, 3, 10, 15, `${L('Comfort', 'Comodidad')}+5`, I + 'commoner.webp', L('Her stew is talked about two villages away.', 'Su guiso tiene fama a dos aldeas de distancia.')),
        St(L('Old Gaspard', 'El viejo Gaspard'), L('Innkeeper', 'Posadero'), 3, 5, 25, 20, `${Rep}+3`, I + 'group.webp', L('Remembers every face and every rumour.', 'Recuerda cada cara y cada rumor.')),
        St('Brutus', L('Head of security', 'Jefe de seguridad'), 1, 2, 5, 10, `${L('Bouncers', 'Gorilas')}+1`, I + 'infantry-armored.webp', L('Few words, big fists.', 'Pocas palabras, puños grandes.'))
      ]
    },
    quarry: {
      products: [P(L('Ashlar blocks', 'Sillares'), L('blocks', 'bloques'), 3, '60', '', M + 'stone/boulder-grey.webp', L('Dressed stone for walls and towers.', 'Piedra labrada para murallas y torres.'))],
      units: [{ prod: '8', img: I + 'commoner.webp', desc: L('Cutters, haulers and masons.', 'Cortadores, acarreadores y canteros.') }, { img: I + 'spearfighter.webp' }],
      staff: [
        St(L('Master Hilde', 'Maestra Hilde'), L('Master mason', 'Maestra cantera'), 3, 5, 30, 20, `${L('Safety', 'Seguridad')}+5`, I + 'infantry-armored.webp', L('Reads the rock like a book.', 'Lee la roca como un libro.')),
        St('Dorn', L('Foreman', 'Capataz'), 2, 3, 10, 15, `${L('Miners', 'Canteros')}+2`, I + 'commoner.webp', L('Keeps the gangs moving.', 'Mantiene las cuadrillas en marcha.'))
      ],
      req: { 1: `${L('Safety', 'Seguridad')}>=70` }
    },
    village: {
      products: [P(L('Grain', 'Grano'), L('sacks', 'sacos'), 0.5, '200', '', C + 'grains/bread-loaf-boule-rustic-brown.webp', L('Wheat and barley surplus.', 'Excedente de trigo y cebada.'), { spoil: 5 })],
      units: [{ img: I + 'spearfighter.webp' }, { prod: '2', img: I + 'commoner.webp', desc: L('Families working the fields.', 'Familias que trabajan los campos.') }],
      staff: [
        St(L('Reeve Aldous', 'Alguacil Aldous'), L('Reeve', 'Alguacil'), 2, 3, 15, 15, `${L('Defense', 'Defensa')}+5`, I + 'archer.webp', L('Organises the watch.', 'Organiza la ronda.')),
        St(L('Mother Wenna', 'Madre Wenna'), L('Healer', 'Sanadora'), 2, 2, 10, 15, `${L('Population', 'Población')}+10;${Mor}+3`, I + 'cleric-orange.webp', L('Herbs, births and burials.', 'Hierbas, partos y entierros.'))
      ]
    },
    castle: {
      products: [P(L('Tolls', 'Peajes'), L('wagons', 'carros'), 1.5, '80', `${L('Prestige', 'Prestigio')}*0.01`, ES + 'castle-gatehouse.webp', L('Tolls on the valley road.', 'Peajes del camino del valle.'))],
      units: [{ prod: '4', img: I + 'infantry-army.webp', desc: L('Garrison that also mans the toll gate.', 'Guarnición que también cobra en la puerta.') }, { img: I + 'commoner.webp' }, { img: I + 'cavalry-heavy.webp' }],
      staff: [
        St(L('Seneschal Varro', 'Senescal Varro'), L('Seneschal', 'Senescal'), 3, 12, 100, 60, `${L('Prestige', 'Prestigio')}+3`, I + 'cleric-grey.webp', L('Runs the household with an iron ledger.', 'Lleva la casa con un libro de cuentas de hierro.')),
        St(L('Ser Maud', 'Ser Maud'), L('Master-at-arms', 'Maestra de armas'), 3, 15, 120, 70, `${Mor}+4;${L('Soldiers', 'Soldados')}+2`, I + 'cavalry-heavy.webp', L('Veteran of three sieges.', 'Veterana de tres asedios.'))
      ]
    },
    mine: {
      products: [P(L('Silver', 'Plata'), L('ingots', 'lingotes'), 10, '20', '', M + 'metal/ingot-engraved-silver.webp', L('Refined silver bars.', 'Barras de plata refinada.'))],
      units: [{ prod: '1.5', cap: `${L('Ore reserve', 'Reserva de plata')}*0.2`, img: I + 'commoner.webp', desc: L('Diggers; the reserve limits how many can work.', 'Picadores; la reserva limita cuántos pueden trabajar.') }, { img: I + 'spearfighter.webp' }],
      staff: [
        St(L('Engineer Kessa', 'Ingeniera Kessa'), L('Mining engineer', 'Ingeniera de minas'), 3, 8, 60, 30, `${L('Safety', 'Seguridad')}+5`, I + 'infantry-armored.webp', L('Pumps, props and plans.', 'Bombas, puntales y planos.')),
        St(L('Assayer Ludo', 'Ensayador Ludo'), L('Assayer', 'Ensayador'), 2, 5, 30, 25, `${L('Ore reserve', 'Reserva de plata')}+10`, I + 'cleric-grey.webp', L('Finds veins others miss.', 'Encuentra vetas que otros no ven.'))
      ]
    },
    tower: {
      products: [
        P(L('Scrolls', 'Pergaminos'), L('scrolls', 'pergaminos'), 25, '6', `${L('Arcane energy', 'Energía arcana')}*0.02`, 'icons/sundries/scrolls/scroll-bound-blue-brown.webp', L('Common spell scrolls.', 'Pergaminos de conjuros comunes.')),
        P(L('Potions', 'Pociones'), L('vials', 'viales'), 50, '4', '', C + 'potions/bottle-bulb-corked-labeled-blue.webp', L('Healing draughts. Need a stable laboratory.', 'Pociones curativas. Requieren un laboratorio estable.'), { cond: `${L('Stability', 'Estabilidad')}>=80` })
      ],
      units: [{ prod: '1.5', img: I + 'cleric-grey.webp' }, {}],
      staff: [St(L('Archmage Ysolde', 'Archimaga Ysolde'), L('Visiting archmage', 'Archimaga visitante'), 4, 25, 200, 80, `${L('Arcane energy', 'Energía arcana')}+6`, I + 'cleric-orange.webp', L('Brilliant, distracted, expensive.', 'Brillante, distraída y cara.'))]
    },
    thieves: {
      products: [P(L('Contraband', 'Contrabando'), L('bundles', 'fardos'), 5, '10', '', 'icons/containers/bags/sack-simple-leather-brown.webp', L('Goods nobody asks about.', 'Mercancía sobre la que nadie pregunta.'), { spoil: 15 })],
      units: [{ prod: '2', img: I + 'archer.webp' }, { img: I + 'group.webp' }],
      staff: [
        St(L('Velvet Mirel', 'Mirel «Terciopelo»'), L('Master fence', 'Perista maestra'), 3, 6, 40, 25, `${L('Infiltration', 'Infiltración')}+5`, I + 'group.webp', L('Can sell a crown back to its king.', 'Puede venderle la corona a su propio rey.')),
        St(L('Captain Orso', 'Capitán Orso'), L('Bought guard captain', 'Capitán comprado'), 2, 8, 50, 30, `${L('Heat', 'Alerta de la guardia')}-5`, I + 'infantry-armored.webp', L('Looks the other way, for a price.', 'Mira hacia otro lado, por un precio.'))
      ]
    },
    port: {
      products: [P(L('Cargo handling', 'Carga y descarga'), L('loads', 'cargas'), 2, `${L('Trade volume', 'Flujo comercial')}*1.5`, '', ES + 'ship.webp', L('Fees for every load moved on the docks.', 'Tarifa por cada carga movida en los muelles.'))],
      units: [{ prod: '6', img: I + 'commoner.webp', desc: L('Dockworkers moving crates and barrels.', 'Estibadores que mueven cajas y barriles.') }, { img: I + 'spearfighter.webp' }],
      staff: [
        St(L('Harbourmaster Quill', 'Capitana de puerto Quill'), L('Harbourmaster', 'Capitana de puerto'), 3, 10, 80, 40, `${L('Naval safety', 'Seguridad marítima')}+5`, I + 'cavalry.webp', L('Knows every reef and every smuggler.', 'Conoce cada arrecife y cada contrabandista.')),
        St(L('Factor Benedek', 'Factor Benedek'), L('Trade factor', 'Factor comercial'), 2, 6, 40, 30, `${L('Trade volume', 'Flujo comercial')}+8`, I + 'group.webp', L('Brings foreign houses to your docks.', 'Trae casas extranjeras a tus muelles.'))
      ]
    },
    temple: {
      products: [P(L('Votive candles', 'Velas votivas'), L('candles', 'velas'), 0.2, `${L('Pilgrims', 'Peregrinos')}*3`, '', 'icons/sundries/lights/candle-lit-yellow.webp', L('Blessed candles for pilgrims.', 'Velas benditas para peregrinos.'))],
      units: [{ prod: '20', img: I + 'cleric-grey.webp' }, { img: I + 'infantry-armored.webp' }],
      staff: [
        St(L('High Priestess Amaris', 'Suma sacerdotisa Amaris'), L('High priestess', 'Suma sacerdotisa'), 3, 8, 60, 40, `${L('Devotion', 'Devoción')}+6`, I + 'cleric-orange.webp', L('Her sermons fill the nave.', 'Sus sermones llenan la nave.')),
        St(L('Brother Tobin', 'Hermano Tobin'), L('Hospitaller', 'Hospitalario'), 2, 3, 15, 15, `${L('Pilgrims', 'Peregrinos')}+8`, I + 'cleric-grey.webp', L('Tends the sick at the gate.', 'Atiende a los enfermos en la puerta.'))
      ]
    }
  };
  // businesses built on the full model (bare start, crews with job caps, products, manager candidates, upgrade trees)
  const Q = L('Quality', 'Calidad'), Tools = L('Tools', 'Herramientas'), Fame = L('Renown', 'Fama');
  const W = (name, upkeep, hire, max, cap, prod, makes, img, desc) => ({ name, count: 0, upkeep, income: 0, hire, max, cap, prod, makes, img, desc });
  const Bq = (name, cost, time, fx, desc, req = '', img = '') => ({ name, cost, bonus: 0, time, fx, desc, req, img });
  const biz = (key, icon, img, name, kind, value, desc, stats, units, products, staff, upgrades, events, seasons = '') => ({
    key, icon, img, name, kind, income: '0', upkeep: '1', eventChance: 25, seasons, value, desc, retain: 100, unpaidFx: `${Fame}-1`, stats, units, products, staff, upgrades, events
  });
  list.push(
    biz('smithy', 'fa-hammer', ES + 'blacksmith.webp', L('Smithy', 'Herrería'), L('Craft', 'Oficio'), 600,
      L('A cold forge and an anvil. Light it, hire hands, win orders.', 'Una fragua fría y un yunque. Enciéndela, contrata manos y consigue encargos.'),
      [S(L('Forges', 'Fraguas'), 1, 0, 4), S(Tools, 2, 0, 10), S(Q, 0, 0, 5), S(Fame, 1, 0, 10)],
      [W(L('Smiths', 'Herreros'), 2, 8, 12, `${L('Forges', 'Fraguas')}*2`, `${Tools}*5`, L('Tools & nails', 'Herramientas y clavos'), I + 'infantry-armored.webp', L('Hammer, bellows and sweat.', 'Martillo, fuelle y sudor.'))],
      [P(L('Tools & nails', 'Herramientas y clavos'), L('pieces', 'piezas'), 1, `${Fame}*20`, `${Q}`, 'icons/tools/smithing/anvil.webp', L('Everyday ironwork for farms and carts.', 'Herraje diario para granjas y carros.')),
       P(L('Weapons', 'Armas'), L('blades', 'hojas'), 12, `${Fame}*1.5`, `${Q}`, 'icons/weapons/swords/shortsword-broad-blue.webp', L('Swords and spearheads. Needs a weaponsmith forge.', 'Espadas y puntas de lanza. Requiere fragua de armero.'), { cond: `${Q}>=2` })],
      [St(L('Old Bran', 'El viejo Bran'), L('Master smith', 'Maestro herrero'), 3, 5, 30, 25, `${Q}+0.5`, I + 'infantry-armored.webp', L('Forty years at the anvil; burnt hands, perfect edges.', 'Cuarenta años al yunque; manos quemadas, filos perfectos.')),
       St(L('Ida Coal', 'Ida Carbón'), L('Apprentice', 'Aprendiz'), 1, 1, 3, 10, `${Tools}+1`, I + 'commoner.webp', L('Eager, quick, breaks things.', 'Entusiasta, rápida, rompe cosas.'))],
      [Bq(L('Second forge', 'Segunda fragua'), 60, 2, `${L('Forges', 'Fraguas')}+1`, L('Room for two more smiths.', 'Espacio para dos herreros más.'), '', ES + 'blacksmith.webp'),
       Bq(L('Good steel tools', 'Herramientas de buen acero'), 40, 1, `${Tools}+2`, L('Each smith turns out more.', 'Cada herrero produce más.'), '', 'icons/tools/smithing/anvil.webp'),
       Bq(L('Weaponsmith forge', 'Fragua de armero'), 120, 3, `${Q}+2`, L('Hotter fire, finer steel: unlocks weapons.', 'Fuego más vivo, acero más fino: desbloquea armas.'), `${L('Forges', 'Fraguas')}>=2`, 'icons/tools/smithing/crucible.webp'),
       Bq(L('Sign over the door', 'Letrero sobre la puerta'), 15, 1, `${Fame}+1`, L('People find you.', 'La gente te encuentra.'))],
      [E('good', L('Militia order', 'Encargo de la milicia'), L('The watch needs spearheads by next week.', 'La guardia necesita puntas de lanza para la semana que viene.'), '4d6', '0', { cond: `${Q}>=1`, fx: `${Fame}+1`, deadline: 2 }),
       E('bad', L('Cracked anvil', 'Yunque rajado'), L('The anvil splits under a heavy blow.', 'El yunque se raja con un golpe fuerte.'), '-2d6', '-4d6', { missedFx: `${Tools}-1` })]),
    biz('farm', 'fa-wheat-awn', ES + 'house-farmland.webp', L('Farmstead', 'Granja'), L('Agriculture', 'Agricultura'), 400,
      L('Fallow fields, an empty barn and a well. Everything to plant.', 'Campos en barbecho, un granero vacío y un pozo. Todo por sembrar.'),
      [S(L('Fields', 'Campos'), 0, 0, 20), S(L('Livestock', 'Ganado'), 0, 0, 30), S(L('Fertility', 'Fertilidad'), 10, 0, 20), S(Fame, 1, 0, 10)],
      [W(L('Farmhands', 'Peones'), 1, 3, 30, `${L('Fields', 'Campos')}*2`, L('Fertility', 'Fertilidad'), L('Grain', 'Grano'), I + 'commoner.webp', L('Plough, sow, reap.', 'Arar, sembrar, cosechar.')),
       W(L('Herders', 'Pastores'), 1, 3, 10, `${L('Livestock', 'Ganado')}*0.3`, '8', L('Cheese & meat', 'Queso y carne'), I + 'commoner.webp', L('Mind the herd.', 'Cuidan el rebaño.'))],
      [P(L('Grain', 'Grano'), L('sacks', 'sacos'), 0.5, `${Fame}*60`, '', C + 'grains/bread-loaf-boule-rustic-brown.webp', L('Wheat and barley.', 'Trigo y cebada.'), { spoil: 4 }),
       P(L('Cheese & meat', 'Queso y carne'), L('lots', 'lotes'), 2, `${Fame}*10`, '', C + 'meat/round-steak-fat-brown.webp', L('From the herd. Spoils fast.', 'Del rebaño. Se echa a perder rápido.'), { spoil: 40, cond: `${L('Livestock', 'Ganado')}>=5` })],
      [St(L('Widow Hesk', 'Viuda Hesk'), L('Steward', 'Mayordoma'), 2, 2, 8, 12, `${L('Fertility', 'Fertilidad')}+1`, I + 'commoner.webp', L('Knows every field by smell.', 'Conoce cada campo por el olor.'))],
      [Bq(L('Clear the fields', 'Desbrozar los campos'), 20, 2, `${L('Fields', 'Campos')}+4`, L('Work for 8 hands.', 'Trabajo para 8 peones.'), '', ES + 'house-farmland-small.webp'),
       Bq(L('Buy a small herd', 'Comprar un rebaño'), 50, 1, `${L('Livestock', 'Ganado')}+10`, L('Sheep and a few cows.', 'Ovejas y unas vacas.'), '', 'icons/creatures/mammals/livestock-sheep-green.webp'),
       Bq(L('Irrigation ditches', 'Acequias'), 60, 3, `${L('Fertility', 'Fertilidad')}+4`, L('More grain per hand.', 'Más grano por peón.'), `${L('Fields', 'Campos')}>=4`),
       Bq(L('Silo & windmill', 'Silo y molino'), 90, 3, `${L('Fields', 'Campos')}+6;${Fame}+1`, L('Store and grind more.', 'Almacenar y moler más.'), `${L('Fields', 'Campos')}>=4`, ES + 'farm-silo-windmill.webp')],
      [E('bad', L('Drought', 'Sequía'), L('No rain for weeks.', 'Semanas sin lluvia.'), '0', '-2d6', { missedFx: `${L('Fertility', 'Fertilidad')}-2` }),
       E('good', L('Bumper harvest', 'Cosecha abundante'), L('The fields overflow.', 'Los campos rebosan.'), '3d6', '0', { cond: `${L('Fields', 'Campos')}>=4` })],
      L('Summer:1.3;Fall:1.6;Winter:0.2;2:1.3;3:1.6;4:0.2', 'Verano:1.3;Otoño:1.6;Invierno:0.2;2:1.3;3:1.6;4:0.2')),
    biz('sawmill', 'fa-tree', ES + 'sawmill-shed-red.webp', L('Sawmill', 'Aserradero'), L('Industry', 'Industria'), 500,
      L('A river wheel and a rusted saw. The forest is right there.', 'Una rueda en el río y una sierra oxidada. El bosque está al lado.'),
      [S(L('Saws', 'Sierras'), 1, 0, 6), S(L('Felling rights', 'Derechos de tala'), 2, 0, 10), S(Tools, 6, 0, 16), S(Fame, 1, 0, 10)],
      [W(L('Lumberjacks', 'Leñadores'), 1, 4, 20, `${L('Felling rights', 'Derechos de tala')}*2`, `${Tools}*3`, L('Planks', 'Tablones'), I + 'commoner.webp', L('Fell and haul.', 'Talan y acarrean.'))],
      [P(L('Planks', 'Tablones'), L('planks', 'tablones'), 0.6, `${Fame}*40`, '', 'icons/commodities/wood/log-cut-ash-brown.webp', L('Sawn timber for builders.', 'Madera aserrada para constructores.'))],
      [St(L('Gunnar Ash', 'Gunnar Fresno'), L('Woodward', 'Guardabosques'), 2, 3, 12, 15, `${L('Felling rights', 'Derechos de tala')}+1`, I + 'archer.webp', L('Knows which trees the druids allow.', 'Sabe qué árboles permiten los druidas.'))],
      [Bq(L('New saw blade', 'Hoja de sierra nueva'), 30, 1, `${Tools}+2`, '', '', 'icons/tools/smithing/anvil.webp'),
       Bq(L('Felling licence', 'Licencia de tala'), 50, 2, `${L('Felling rights', 'Derechos de tala')}+3`, L('Negotiated with whoever owns the woods.', 'Negociada con quien sea dueño del bosque.')),
       Bq(L('Second wheel', 'Segunda rueda'), 80, 3, `${L('Saws', 'Sierras')}+1;${Tools}+2`, '', `${L('Felling rights', 'Derechos de tala')}>=4`, ES + 'lumbermill.webp')],
      [E('bad', L('Flooded river', 'Crecida del río'), L('The wheel jams.', 'La rueda se atasca.'), '-1d6', '-3d6', { missedFx: `${Tools}-1` })]),
    biz('fishery', 'fa-fish', ES + 'abandoned-pier.webp', L('Fishery', 'Pesquería'), L('Maritime', 'Marítimo'), 450,
      L('A rotting pier and a beached boat.', 'Un muelle podrido y una barca varada.'),
      [S(L('Boats', 'Barcas'), 0, 0, 8), S(L('Nets', 'Redes'), 5, 0, 15), S(Fame, 1, 0, 10)],
      [W(L('Fishers', 'Pescadores'), 1, 3, 24, `${L('Boats', 'Barcas')}*3`, L('Nets', 'Redes'), L('Fish', 'Pescado'), I + 'commoner.webp', L('Out before dawn.', 'Salen antes del alba.'))],
      [P(L('Fish', 'Pescado'), L('baskets', 'cestas'), 0.8, `${Fame}*40`, '', C + 'meat/fillet-fish-pink-silver-gray.webp', L('Fresh catch. Rots in days.', 'Pesca fresca. Se pudre en días.'), { spoil: 70 }),
       P(L('Salted fish', 'Pescado salado'), L('barrels', 'barriles'), 3, `${Fame}*6`, '', 'icons/containers/barrels/barrel-oak-tan.webp', L('Keeps all winter.', 'Aguanta todo el invierno.'), { spoil: 2, cond: `${Fame}>=3` })],
      [St(L('Captain Marr', 'Patrón Marr'), L('Skipper', 'Patrón'), 2, 3, 10, 15, `${L('Nets', 'Redes')}+1`, I + 'cavalry.webp', L('Reads the weather in the gulls.', 'Lee el tiempo en las gaviotas.'))],
      [Bq(L('Repair the boat', 'Reparar la barca'), 20, 1, `${L('Boats', 'Barcas')}+1`, '', '', ES + 'abandoned-pier.webp'),
       Bq(L('New nets', 'Redes nuevas'), 25, 1, `${L('Nets', 'Redes')}+2`),
       Bq(L('Salting shed', 'Saladero'), 60, 2, `${Fame}+2`, L('Lets you sell salted fish far away.', 'Permite vender pescado salado lejos.'), `${L('Boats', 'Barcas')}>=2`)],
      [E('bad', L('Storm', 'Temporal'), L('Nobody goes out.', 'Nadie sale a faenar.'), '0', '-2d6', { missedFx: `${L('Boats', 'Barcas')}-1` })],
      L('Winter:0.4;4:0.4', 'Invierno:0.4;4:0.4')),
    biz('apothecary', 'fa-flask', ES + 'pottery-shop-shed-red.webp', L('Apothecary', 'Botica'), L('Craft', 'Oficio'), 700,
      L('Dusty shelves, a cracked alembic.', 'Estantes polvorientos, un alambique rajado.'),
      [S(L('Benches', 'Mesas de trabajo'), 1, 0, 4), S(L('Herbs', 'Hierbas'), 3, 0, 10), S(Q, 0, 0, 5), S(Fame, 1, 0, 10)],
      [W(L('Assistants', 'Ayudantes'), 2, 6, 8, `${L('Benches', 'Mesas de trabajo')}*2`, L('Herbs', 'Hierbas'), L('Remedies', 'Remedios'), I + 'cleric-grey.webp', L('Grind, steep, bottle.', 'Muelen, maceran, embotellan.'))],
      [P(L('Remedies', 'Remedios'), L('jars', 'frascos'), 1.5, `${Fame}*12`, Q, C + 'potions/bottle-corked-red.webp', L('Salves and tonics.', 'Ungüentos y tónicos.'), { spoil: 5 }),
       P(L('Healing potions', 'Pociones de curación'), L('vials', 'viales'), 50, `${Fame}*0.5`, Q, C + 'potions/bottle-bulb-corked-glowing-red.webp', L('Real magic. Needs a proper lab.', 'Magia de verdad. Requiere laboratorio.'), { cond: `${Q}>=3` })],
      [St(L('Sister Lume', 'Hermana Lume'), L('Herbalist', 'Herbolaria'), 3, 5, 30, 25, `${Q}+0.5;${L('Herbs', 'Hierbas')}+1`, I + 'cleric-orange.webp', L('Druid-trained; sells only what heals.', 'Formada por druidas; solo vende lo que cura.'))],
      [Bq(L('New alembic', 'Alambique nuevo'), 40, 1, `${Q}+1`, '', '', 'icons/tools/laboratory/alembic-glass-ball-blue.webp'),
       Bq(L('Herb garden', 'Huerto de hierbas'), 50, 2, `${L('Herbs', 'Hierbas')}+3`),
       Bq(L('Alchemical lab', 'Laboratorio alquímico'), 150, 4, `${Q}+2;${L('Benches', 'Mesas de trabajo')}+1`, L('Unlocks potions.', 'Desbloquea pociones.'), `${Q}>=1`)],
      [E('bad', L('Bad batch', 'Lote malo'), L('A tonic made someone sick.', 'Un tónico enfermó a alguien.'), '-1d6', '0', { missedFx: `${Fame}-2` })]),
    biz('caravan', 'fa-horse', ES + 'wagon.webp', L('Trade Caravan', 'Caravana comercial'), L('Commerce', 'Comercio'), 800,
      L('One wagon, one tired horse, many roads.', 'Un carro, un caballo cansado y muchos caminos.'),
      [S(L('Wagons', 'Carros'), 1, 0, 8), S(L('Routes', 'Rutas'), 1, 0, 6), S(L('Safety', 'Seguridad'), 2, 0, 10), S(Fame, 1, 0, 10)],
      [W(L('Drovers', 'Carreteros'), 2, 6, 16, `${L('Wagons', 'Carros')}*2`, L('Routes', 'Rutas'), L('Freight', 'Fletes'), I + 'cavalry.webp', L('Drive and load.', 'Conducen y cargan.')),
       W(L('Outriders', 'Escoltas'), 3, 12, 8, '', '', '', I + 'archer.webp', L('Keep bandits away.', 'Mantienen lejos a los bandidos.'))],
      [P(L('Freight', 'Fletes'), L('runs', 'viajes'), 15, `${L('Routes', 'Rutas')}*3`, `${L('Safety', 'Seguridad')}*0.1`, ES + 'wagon-black.webp', L("Paid to carry other people's goods.", 'Te pagan por llevar mercancía ajena.'))],
      [St(L('Yara Dust', 'Yara Polvo'), L('Caravan master', 'Jefa de caravana'), 3, 6, 40, 30, `${L('Routes', 'Rutas')}+0.5;${L('Safety', 'Seguridad')}+1`, I + 'cavalry.webp', L('Has crossed every border twice.', 'Ha cruzado cada frontera dos veces.'))],
      [Bq(L('Another wagon', 'Otro carro'), 50, 1, `${L('Wagons', 'Carros')}+1`, '', '', ES + 'wagon.webp'),
       Bq(L('New route charter', 'Carta de ruta nueva'), 70, 2, `${L('Routes', 'Rutas')}+1`, L('Permission to trade in another town.', 'Permiso para comerciar en otro pueblo.')),
       Bq(L('Waystation', 'Posta en el camino'), 120, 3, `${L('Safety', 'Seguridad')}+3;${Fame}+1`, '', `${L('Routes', 'Rutas')}>=2`)],
      [E('bad', L('Ambush', 'Emboscada'), L('Bandits block the road.', 'Bandidos cortan el camino.'), '-2d6', '-5d6', { cond: `${L('Outriders', 'Escoltas')}<2`, missedFx: `${L('Wagons', 'Carros')}-1` })]),
    biz('stables', 'fa-horse-head', ES + 'stables-horses.webp', L('Stables', 'Establos'), L('Services', 'Servicios'), 500,
      L('Empty stalls and a dry trough.', 'Cuadras vacías y un abrevadero seco.'),
      [S(L('Stalls', 'Cuadras'), 2, 0, 20), S(L('Bloodline', 'Linaje'), 0, 0, 5), S(Fame, 1, 0, 10)],
      [W(L('Grooms', 'Mozos de cuadra'), 1, 3, 10, `${L('Stalls', 'Cuadras')}*0.5`, '20', L('Stabling', 'Hospedaje de caballos'), I + 'commoner.webp', L('Feed, brush, muck out.', 'Alimentan, cepillan, limpian.'))],
      [P(L('Stabling', 'Hospedaje de caballos'), L('horse-nights', 'noches-caballo'), 0.2, `${Fame}*60`, '', ES + 'stable.webp', L('Travellers pay to rest their mounts.', 'Los viajeros pagan por el descanso de sus monturas.'), { spoil: 100 }),
       P(L('Horses', 'Caballos'), L('horses', 'caballos'), 75, `${Fame}*0.3`, L('Bloodline', 'Linaje'), ES + 'stables-logo.webp', L('Bred and broken. Needs a breeding pair.', 'Criados y domados. Requiere una pareja de cría.'), { cond: `${L('Bloodline', 'Linaje')}>=1` })],
      [St(L('Old Pim', 'El viejo Pim'), L('Horse master', 'Maestro de caballos'), 2, 3, 15, 20, `${L('Bloodline', 'Linaje')}+0.5`, I + 'cavalry.webp', L('Talks to horses. They listen.', 'Les habla a los caballos. Le escuchan.'))],
      [Bq(L('More stalls', 'Más cuadras'), 40, 2, `${L('Stalls', 'Cuadras')}+4`, '', '', ES + 'stable.webp'),
       Bq(L('Breeding pair', 'Pareja de cría'), 150, 1, `${L('Bloodline', 'Linaje')}+1`, L('Unlocks horse sales.', 'Desbloquea la venta de caballos.'), `${L('Stalls', 'Cuadras')}>=4`),
       Bq(L('Sign on the road', 'Cartel en el camino'), 15, 1, `${Fame}+1`)],
      [E('bad', L('Horse sickness', 'Enfermedad equina'), L('A cough spreads through the stalls.', 'Una tos se extiende por las cuadras.'), '-1d6', '-3d6', { missedFx: `${L('Bloodline', 'Linaje')}-1` })]),
    biz('theater', 'fa-masks-theater', ES + 'columned-forum.webp', L('Playhouse', 'Teatro'), L('Entertainment', 'Espectáculos'), 900,
      L('A bare stage and creaking benches.', 'Un escenario desnudo y bancos que crujen.'),
      [S(L('Seats', 'Asientos'), 40, 0, 300), S(L('Repertoire', 'Repertorio'), 1, 0, 10), S(Fame, 1, 0, 10)],
      [W(L('Players', 'Actores'), 3, 10, 12, `${L('Repertoire', 'Repertorio')}*2`, `${L('Seats', 'Asientos')}*0.5`, L('Tickets', 'Entradas'), I + 'group.webp', L('Every night a different face.', 'Cada noche una cara distinta.'))],
      [P(L('Tickets', 'Entradas'), L('tickets', 'entradas'), 0.5, `${Fame}*50`, L('Repertoire', 'Repertorio'), 'icons/sundries/misc/admission-ticket-white.webp', L('An unsold seat is lost.', 'Un asiento sin vender se pierde.'), { spoil: 100 })],
      [St(L('Lysandre', 'Lysandre'), L('Playwright', 'Dramaturgo'), 3, 6, 40, 30, `${L('Repertoire', 'Repertorio')}+1`, I + 'cleric-orange.webp', L('Writes scandal; sells out.', 'Escribe escándalos; llena la sala.'))],
      [Bq(L('Gallery', 'Galería'), 80, 2, `${L('Seats', 'Asientos')}+60`, '', '', ES + 'columned-forum.webp'),
       Bq(L('Costumes & sets', 'Vestuario y decorados'), 50, 2, `${L('Repertoire', 'Repertorio')}+1;${Fame}+1`)],
      [E('good', L('A noble attends', 'Asiste un noble'), L('Everyone wants a seat now.', 'Ahora todos quieren un asiento.'), '2d6', '0', { fx: `${Fame}+1` })])
  );
  return list.map(p => {
    const x = X[p.key] ?? {};
    return {
      retain: 100, unpaidFx: '', ...p, products: p.products ?? x.products ?? [], staff: p.staff ?? x.staff ?? [], contracts: [],
      units: p.units.map((u, i) => ({ cap: '', prod: '', makes: '', img: '', desc: '', ...u, ...(x.units?.[i] ?? {}) })),
      upgrades: p.upgrades.map((u, i) => ({ req: '', img: '', ...u, req: u.req || x.req?.[i] || '' }))
    };
  });
}
