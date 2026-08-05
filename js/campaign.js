// ===========================================================================
// campaign.js — the 100-LEVEL WORLD TOUR, generated from data.
//
// Same rhythm as the hand-built 22 (levels.js, kept for reference): 25 city
// arcs of 4 —  vocab → vocab → sentence → RETO — across 6 sports. Every level
// points at one curriculum LESSON (10 themed words); which of the three
// 1,000-word tracks those come from is decided at load time by the difficulty
// picker (see curriculum-data.js). So the tour is the same in every
// difficulty, but Principiante rides through "los colores" where El Jefe rides
// through "el subjuntivo".
//
// The mission framing lives here too: a level isn't "Level 23", it's
// "MISIÓN: la comida callejera — Cartagena". Themes come from the lesson.
// ===========================================================================

import { TRICKS, BMX_TRICKS, BLADE_TRICKS, POGO_TRICKS, DIRT_TRICKS, JET_TRICKS } from './tricks.js';

// One entry per place on the tour. `bgs` are env art keys (single-segment
// cities pan across one painting; dual-segment ones crossfade mid-level).
const CITIES = {
  cdmx:        { name: 'CIUDAD DE MÉXICO',  bgs: ['cdmx_a', 'cdmx_b'],           tone: 'cdmx',        palette: 'sunset',   props: ['cone', 'tire', 'crate'],  laneColor: '#ffd36e', laneGlow: '#ff2fb9' },
  teotihuacan: { name: 'TEOTIHUACÁN',       bgs: ['teotihuacan_a'],              tone: 'teotihuacan', palette: 'canyon',   props: ['crate', 'barrel', 'hay'], laneColor: '#ffb64d', laneGlow: '#ffe11a' },
  selva:       { name: 'SELVA MAYA',        bgs: ['selva_a', 'selva_b'],         tone: 'selva',       palette: 'park',     props: ['crate', 'hay', 'tire'],   laneColor: '#b6ff2b', laneGlow: '#21e6ff' },
  tulum:       { name: 'TULUM',             bgs: ['tulum_a', 'tulum_b'],         tone: 'tulum',       palette: 'sunset',   props: ['cone', 'tire', 'barrel'], laneColor: '#21e6ff', laneGlow: '#ffe11a' },
  oaxaca:      { name: 'HIERVE EL AGUA',    bgs: ['oaxaca_a'],                   tone: 'oaxaca',      palette: 'park',     props: ['hay', 'crate', 'tire'],   laneColor: '#7dffc9', laneGlow: '#ffe11a' },
  antigua:     { name: 'ANTIGUA GUATEMALA', bgs: ['antigua_a'],                  tone: 'antigua',     palette: 'sunset',   props: ['cone', 'barrel', 'crate'],laneColor: '#ff9a5c', laneGlow: '#a12bff' },
  atitlan:     { name: 'LAGO DE ATITLÁN',   bgs: ['atitlan_a'],                  tone: 'atitlan',     palette: 'skycity',  props: ['crate', 'hay', 'barrel'], laneColor: '#21a9ff', laneGlow: '#ffe11a' },
  cartagena:   { name: 'CARTAGENA',         bgs: ['cartagena_a', 'cartagena_b'], tone: 'cartagena',   palette: 'carnival', props: ['barrel', 'crate', 'cone'],laneColor: '#ff7a1a', laneGlow: '#ffe11a' },
  medellin:    { name: 'MEDELLÍN',          bgs: ['medellin_a', 'medellin_b'],   tone: 'medellin',    palette: 'subway',   props: ['cone', 'crate', 'tire'],  laneColor: '#b6ff2b', laneGlow: '#ff2fb9' },
  sanjuan:     { name: 'SAN JUAN',          bgs: ['sanjuan_a'],                  tone: 'sanjuan',     palette: 'skycity',  props: ['cone', 'barrel', 'tire'], laneColor: '#3df0ff', laneGlow: '#ffe11a' },
  havana:      { name: 'LA HABANA',         bgs: ['havana_a', 'havana_b'],       tone: 'havana',      palette: 'carnival', props: ['cone', 'barrel', 'crate'],laneColor: '#ff9a5c', laneGlow: '#21e6ff' },
  bsas:        { name: 'BUENOS AIRES',      bgs: ['bsas_a', 'bsas_b'],           tone: 'bsas',        palette: 'park',     props: ['cone', 'barrel', 'tire'], laneColor: '#7ec8ff', laneGlow: '#ffe11a' },
  iguazu:      { name: 'CATARATAS DEL IGUAZÚ', bgs: ['iguazu_a', 'iguazu_b'],    tone: 'iguazu',      palette: 'skycity',  props: ['hay', 'crate', 'tire'],   laneColor: '#21e6ff', laneGlow: '#b6ff2b' },
  pamplona:    { name: 'PAMPLONA',          bgs: ['pamplona_a', 'pamplona_b'],   tone: 'pamplona',    palette: 'arena',    props: ['barrel', 'crate', 'hay'], laneColor: '#ff4040', laneGlow: '#fff6fb' },
  bcn:         { name: 'BARCELONA',         bgs: ['bcn_a', 'bcn_b'],             tone: 'bcn',         palette: 'skycity',  props: ['cone', 'crate', 'barrel'],laneColor: '#ffd36e', laneGlow: '#a12bff' },
  santiago:    { name: 'CERRO SAN CRISTÓBAL', bgs: ['santiago_a'],               tone: 'santiago',    palette: 'downtown', props: ['cone', 'tire', 'crate'],  laneColor: '#9db9ff', laneGlow: '#ffe11a' },
  atacama:     { name: 'VALLE DE LA LUNA',  bgs: ['atacama_a'],                  tone: 'atacama',     palette: 'canyon',   props: ['hay', 'tire', 'barrel'],  laneColor: '#ff7a1a', laneGlow: '#ffe11a' },
  machu:       { name: 'MACHU PICCHU',      bgs: ['machu_a', 'machu_b'],         tone: 'machu',       palette: 'canyon',   props: ['hay', 'crate', 'tire'],   laneColor: '#b6ff2b', laneGlow: '#ffe11a' },
  cusco:       { name: 'SACSAYHUAMÁN',      bgs: ['cusco_a'],                    tone: 'cusco',       palette: 'canyon',   props: ['crate', 'hay', 'barrel'], laneColor: '#d9ff7a', laneGlow: '#ffb64d' },
  colca:       { name: 'CAÑÓN DEL COLCA',   bgs: ['canyon'],                     tone: 'canyon',      palette: 'canyon',   props: ['hay', 'tire', 'crate'],   laneColor: '#ff7a1a', laneGlow: '#ffe11a' },
  lapaz:       { name: 'LA PAZ · TELEFÉRICO', bgs: ['lapaz_a'],                  tone: 'lapaz',       palette: 'skycity',  props: ['cone', 'crate', 'tire'],  laneColor: '#8fd0ff', laneGlow: '#ff2fb9' },
  uyuni:       { name: 'SALAR DE UYUNI',    bgs: ['uyuni_a'],                    tone: 'uyuni',       palette: 'skycity',  props: ['crate', 'tire', 'hay'],   laneColor: '#bfeaff', laneGlow: '#21e6ff' },
  nubes:       { name: 'SOBRE LAS NUBES',   bgs: ['skycity'],                    tone: 'skycity',     palette: 'skycity',  props: ['hay', 'tire', 'crate'],   laneColor: '#21e6ff', laneGlow: '#ff2fb9' },
  galapagos:   { name: 'GALÁPAGOS',         bgs: ['galapagos_a'],                tone: 'tulum',       palette: 'skycity',  props: ['crate', 'tire', 'hay'],   laneColor: '#4de8c2', laneGlow: '#ffe11a' },
};

// The ITALIAN tour — Dylan's 40-painting batch. Multi-segment cities move you
// through a place (the Colosseum level runs outside -> interior corridor ->
// arena floor). Same engine, same arc rhythm, different country.
const CITIES_IT = {
  colosseo:   { name: 'IL COLOSSEO',        bgs: ['colosseo_a', 'colosseo_b', 'colosseo_c'], tone: 'cdmx',   palette: 'sunset',   props: ['crate', 'barrel', 'cone'], laneColor: '#ffd36e', laneGlow: '#ff2fb9' },
  foro:       { name: 'FORO ROMANO',        bgs: ['foro_a'],                 tone: 'teotihuacan', palette: 'canyon',   props: ['crate', 'hay', 'barrel'],  laneColor: '#ffb64d', laneGlow: '#ffe11a' },
  pompei:     { name: 'POMPEI',             bgs: ['pompei_a'],               tone: 'canyon',      palette: 'canyon',   props: ['crate', 'barrel', 'tire'], laneColor: '#ff9a5c', laneGlow: '#ffe11a' },
  napoli:     { name: 'NAPOLI · VESUVIO',   bgs: ['napoli_a'],               tone: 'havana',      palette: 'carnival', props: ['cone', 'crate', 'barrel'], laneColor: '#ff7a1a', laneGlow: '#21e6ff' },
  amalfi:     { name: 'COSTIERA AMALFITANA', bgs: ['amalfi_a', 'amalfi_b'],  tone: 'tulum',       palette: 'skycity',  props: ['cone', 'barrel', 'crate'], laneColor: '#21e6ff', laneGlow: '#ffe11a' },
  matera:     { name: 'MATERA · I SASSI',   bgs: ['matera_a'],               tone: 'cusco',       palette: 'canyon',   props: ['crate', 'hay', 'barrel'],  laneColor: '#d9b98a', laneGlow: '#ffb64d' },
  alberobello:{ name: 'ALBEROBELLO',        bgs: ['alberobello_a'],          tone: 'antigua',     palette: 'sunset',   props: ['cone', 'crate', 'hay'],    laneColor: '#ffd36e', laneGlow: '#a12bff' },
  puglia:     { name: 'PUGLIA · IL MARE',   bgs: ['puglia_a', 'puglia_b'],   tone: 'sanjuan',     palette: 'skycity',  props: ['barrel', 'crate', 'tire'], laneColor: '#3df0ff', laneGlow: '#ffe11a' },
  lecce:      { name: 'LECCE',              bgs: ['lecce_a'],                tone: 'bcn',         palette: 'arena',    props: ['cone', 'crate', 'barrel'], laneColor: '#ffd700', laneGlow: '#ff2fb9' },
  palermo:    { name: 'PALERMO',            bgs: ['palermo_a', 'palermo_b'], tone: 'cartagena',   palette: 'carnival', props: ['barrel', 'crate', 'cone'], laneColor: '#ff7a1a', laneGlow: '#ffe11a' },
  siracusa:   { name: 'SIRACUSA · ORTIGIA', bgs: ['siracusa_a'],             tone: 'tulum',       palette: 'skycity',  props: ['cone', 'barrel', 'tire'],  laneColor: '#7ec8ff', laneGlow: '#ffe11a' },
  taormina:   { name: 'TAORMINA · ETNA',    bgs: ['taormina_a'],             tone: 'atacama',     palette: 'canyon',   props: ['hay', 'crate', 'tire'],    laneColor: '#ff4040', laneGlow: '#ffe11a' },
  cagliari:   { name: 'CAGLIARI',           bgs: ['cagliari_a'],             tone: 'bcn',         palette: 'sunset',   props: ['cone', 'crate', 'barrel'], laneColor: '#ffd36e', laneGlow: '#a12bff' },
  sardegna:   { name: 'SARDEGNA',           bgs: ['sardegna_a'],             tone: 'sanjuan',     palette: 'skycity',  props: ['crate', 'tire', 'hay'],    laneColor: '#4de8c2', laneGlow: '#21e6ff' },
  pisa:       { name: 'PISA',               bgs: ['pisa_a'],                 tone: 'bcn',         palette: 'arena',    props: ['cone', 'crate', 'barrel'], laneColor: '#ffd700', laneGlow: '#ff2fb9' },
  cinque:     { name: 'CINQUE TERRE',       bgs: ['cinque_a', 'cinque_b'],   tone: 'medellin',    palette: 'carnival', props: ['cone', 'barrel', 'crate'], laneColor: '#ff9a5c', laneGlow: '#21e6ff' },
  valdorcia:  { name: "VAL D'ORCIA",        bgs: ['valdorcia_a'],            tone: 'oaxaca',      palette: 'park',     props: ['hay', 'crate', 'tire'],    laneColor: '#b6ff2b', laneGlow: '#ffe11a' },
  siena:      { name: 'SIENA · SAN GIMIGNANO', bgs: ['siena_a', 'siena_b'],  tone: 'cdmx',        palette: 'sunset',   props: ['hay', 'barrel', 'crate'],  laneColor: '#ffb64d', laneGlow: '#ff2fb9' },
  umbria:     { name: 'UMBRIA · ASSISI',    bgs: ['umbria_a', 'umbria_b'],   tone: 'machu',       palette: 'canyon',   props: ['hay', 'crate', 'tire'],    laneColor: '#d9ff7a', laneGlow: '#ffb64d' },
  dolomiti:   { name: 'LE DOLOMITI',        bgs: ['dolomiti_a', 'dolomiti_b'], tone: 'lapaz',     palette: 'skycity',  props: ['hay', 'tire', 'crate'],    laneColor: '#8fd0ff', laneGlow: '#ffe11a' },
  aosta:      { name: "VALLE D'AOSTA",      bgs: ['aosta_a'],                tone: 'santiago',    palette: 'downtown', props: ['crate', 'tire', 'cone'],   laneColor: '#9db9ff', laneGlow: '#ffe11a' },
  nord:       { name: 'TORINO · MILANO',    bgs: ['nord_a', 'nord_b'],       tone: 'bsas',        palette: 'park',     props: ['cone', 'tire', 'crate'],   laneColor: '#7ec8ff', laneGlow: '#ffe11a' },
  firenze:    { name: 'FIRENZE',            bgs: ['firenze_a', 'firenze_b'], tone: 'cdmx',        palette: 'sunset',   props: ['cone', 'crate', 'barrel'], laneColor: '#ffd36e', laneGlow: '#ff2fb9' },
  como:       { name: 'LAGO DI COMO',       bgs: ['como_a', 'como_b'],       tone: 'atitlan',     palette: 'skycity',  props: ['cone', 'barrel', 'tire'],  laneColor: '#21a9ff', laneGlow: '#ffe11a' },
  venezia:    { name: 'VENEZIA',            bgs: ['venezia_a'],              tone: 'iguazu',      palette: 'skycity',  props: ['crate', 'barrel', 'tire'], laneColor: '#21e6ff', laneGlow: '#b6ff2b' },
};

// The tours: 6 sport blocks, 25 arcs each.
const BLOCKS = [
  { vehicle: 'skateboard',   arcs: ['cdmx', 'teotihuacan', 'selva', 'tulum'],            unlocks: 'bmx' },
  { vehicle: 'bmx',          arcs: ['oaxaca', 'antigua', 'atitlan', 'cartagena'],        unlocks: 'rollerblades' },
  { vehicle: 'rollerblades', arcs: ['medellin', 'sanjuan', 'bsas', 'iguazu'],            unlocks: 'pogo' },
  { vehicle: 'pogo',         arcs: ['pamplona', 'bcn', 'santiago', 'atacama'],           unlocks: 'dirtbike' },
  { vehicle: 'dirtbike',     arcs: ['machu', 'cusco', 'colca', 'lapaz', 'uyuni'],        unlocks: 'jetpack' },
  { vehicle: 'jetpack',      arcs: ['havana', 'nubes', 'galapagos', 'iguazu'],           unlocks: null },
];

// Italy: Rome south to Sicily/Sardinia, back up through Tuscany to the Alps,
// finishing with a jetpack run over the northern lakes into Venice.
const BLOCKS_IT = [
  { vehicle: 'skateboard',   arcs: ['colosseo', 'foro', 'pompei', 'napoli'],             unlocks: 'bmx' },
  { vehicle: 'bmx',          arcs: ['amalfi', 'matera', 'alberobello', 'puglia'],        unlocks: 'rollerblades' },
  { vehicle: 'rollerblades', arcs: ['lecce', 'palermo', 'siracusa', 'taormina'],         unlocks: 'pogo' },
  { vehicle: 'pogo',         arcs: ['cagliari', 'sardegna', 'pisa', 'cinque'],           unlocks: 'dirtbike' },
  { vehicle: 'dirtbike',     arcs: ['valdorcia', 'siena', 'umbria', 'dolomiti', 'aosta'], unlocks: 'jetpack' },
  { vehicle: 'jetpack',      arcs: ['nord', 'firenze', 'como', 'venezia'],               unlocks: null },
];

// Per-sport ride feel (bases lifted from the hand-tuned 22-level campaign).
const FEEL = {
  skateboard:   { speed: 450, rampGap: 600, kicker: 165, bridgeEvery: 2 },
  bmx:          { speed: 475, rampGap: 615, kicker: 185, bridgeEvery: 2 },
  rollerblades: { speed: 555, rampGap: 490, kicker: 185, bridgeEvery: 2 },
  pogo:         { speed: 335, rampGap: 695, kicker: 150, bridgeEvery: 2 },
  dirtbike:     { speed: 610, rampGap: 760, kicker: 210, bridgeEvery: 2 },
  jetpack:      { speed: 505, rampGap: 720, kicker: 170, bridgeEvery: 3 },
};

const TRICK_LISTS = {
  skateboard: TRICKS, bmx: BMX_TRICKS, rollerblades: BLADE_TRICKS,
  pogo: POGO_TRICKS, dirtbike: DIRT_TRICKS, jetpack: JET_TRICKS,
};

function buildLevels(lang = 'es') {
  const cities = lang === 'it' ? CITIES_IT : CITIES;
  const blocks = lang === 'it' ? BLOCKS_IT : BLOCKS;
  const finaleName = lang === 'it' ? 'SFIDA FINALE: ANELLI DI VENEZIA' : 'RETO FINAL: ANILLOS DE IGUAZÚ';
  const retoWord = lang === 'it' ? 'SFIDA: HALF-PIPE' : 'RETO: HALF-PIPE';
  const levels = [];
  let arcGlobal = 0;
  for (const block of blocks) {
    const feel = FEEL[block.vehicle];
    const tricks = TRICK_LISTS[block.vehicle] || TRICKS;
    // Award the sport's tricks in ascending-tier order across its block, so
    // the arsenal audibly climbs from basics to legendary.
    const awards = [...tricks].sort((a, b) => a.tier - b.tier || (b.bonus || 0) - (a.bonus || 0));
    block.arcs.forEach((cityKey, arcInBlock) => {
      const city = cities[cityKey];
      const a = arcGlobal;                 // 0..24
      const lastOfBlock = arcInBlock === block.arcs.length - 1;
      const finale = a === 24;
      for (let pos = 0; pos < 4; pos++) {
        const idx = a * 4 + pos;           // 0..99
        const frac = idx / 99;
        const base = {
          id: idx + 1,
          vehicle: block.vehicle, region: true,
          lesson: idx,                     // curriculum lesson (track-agnostic)
          choices: 3,
          speed: feel.speed + arcInBlock * 15,
          answerTime: +(8.5 - 3.0 * frac).toFixed(2),
          rampGap: feel.rampGap, kicker: feel.kicker,
          bridgeEvery: feel.bridgeEvery,
          palette: city.palette, bg: city.bgs[0], bgs: city.bgs,
          tone: city.tone, props: city.props,
          laneColor: city.laneColor, laneGlow: city.laneGlow,
          // legacy fallback if a lesson ever fails to resolve
          tiers: [Math.min(5, 1 + Math.floor(idx / 20))],
        };
        if (pos === 3) {
          // RETO — half-pipe speed round (ring run for the grand finale).
          levels.push({
            ...base,
            name: finale ? finaleName : `${retoWord} ${city.name}`,
            mode: 'challenge',
            challenge: { time: 60, goal: 8 + Math.floor(a / 6), style: finale ? 'rings' : 'halfpipe' },
            answerTime: +(3.4 - 0.5 * frac).toFixed(2),
            speed: base.speed + 25, rampGap: 440, bridgeEvery: 99,
            trickTier: 4,
            ...(lastOfBlock && block.unlocks ? { unlocks: block.unlocks } : {}),
          });
        } else {
          const award = awards[(arcInBlock * 3 + pos) % awards.length];
          levels.push({
            ...base,
            name: pos === 0 ? city.name : `${city.name} ${pos === 1 ? 'II' : (lang === 'it' ? '· FRASI' : '· FRASES')}`,
            ...(pos === 2
              ? { mode: 'sentence',
                  // 40 track sentences spread across the 25 sentence levels
                  sentences: rangeSlice(a) }
              : { targetScore: 2200 + Math.round(3000 * frac) }),
            trickTier: Math.min(4, pos + 1 + Math.floor(arcInBlock / 2)),
            awardTrick: award.name,
          });
        }
      }
      arcGlobal++;
    });
  }
  return levels;
}

// Sentence level of arc `a` teaches track sentences [a*40/25 .. (a+1)*40/25).
function rangeSlice(a) {
  const s = Math.floor(a * 40 / 25), e = Math.floor((a + 1) * 40 / 25);
  const out = [];
  for (let i = s; i < Math.max(e, s + 1); i++) out.push(i);
  return out;
}

export const LEVELS = buildLevels('es');
const LEVELS_IT = buildLevels('it');

// The campaign for a language. Same rhythm, different country + words.
export function getCampaign(lang) {
  return lang === 'it' ? LEVELS_IT : LEVELS;
}

export function getLevel(index) {
  return LEVELS[Math.min(index, LEVELS.length - 1)];
}
