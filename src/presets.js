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
  const I = 'icons/environment/people/', C = 'icons/consumables/', M = 'icons/commodities/';
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
  return list.map(p => {
    const x = X[p.key] ?? {};
    return {
      ...p, products: x.products ?? [], staff: x.staff ?? [], contracts: [],
      units: p.units.map((u, i) => ({ cap: '', prod: '', makes: '', img: '', desc: '', ...u, ...(x.units?.[i] ?? {}) })),
      upgrades: p.upgrades.map((u, i) => ({ req: '', img: '', ...u, req: x.req?.[i] ?? '' }))
    };
  });
}
