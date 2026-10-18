/* ============================================================
   app.js — Hyrox Rotterdam trainings-app
   Alle gegevens staan in localStorage onder één sleutel
   ('hyrox-app') met een versienummer. De basisdata in schema.js
   wordt nooit aangepast: aanpassingen zijn een laag eroverheen.
   ============================================================ */
'use strict';

/* ---------- Constanten ---------- */
const OPSLAG_SLEUTEL = 'hyrox-app';
const DATA_VERSIE = 1;
const APP_VERSIE = '1.0';
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const DAGNAMEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const LOOP_TYPES = ['kwaliteit', 'rustig', 'lang', 'compromised', 'simulatie', 'race'];
const TYPE_NAAM = {
  kwaliteit: 'Kwaliteit', rustig: 'Rustig', lang: 'Lange loop', compromised: 'Compromised',
  simulatie: 'Simulatie', race: 'Race', 'kracht-benen': 'Kracht benen',
  'kracht-boven': 'Kracht bovenlichaam', les: 'Hyrox-les'
};
const SOORT_NAAM = { kort: 'Intervallen 200–400 m', 'lang-interval': 'Intervallen 1–2 km', tempo: 'Tempoloop' };
const TEMPO_CATS = {
  rustig: { naam: 'Rustig / lang', kleur: '--c-rustig' },
  tempo: { naam: 'Tempoloop', kleur: '--c-kracht' },
  interval: { naam: 'Intervallen', kleur: '--c-kwaliteit' },
  compromised: { naam: 'Compromised / simulatie', kleur: '--c-compromised' }
};
const STATUS_ICOON = { gedaan: '✅', overgeslagen: '⏭️', open: '⚪' };
const KNIE_ICOON = { groen: '🟢', geel: '🟡', rood: '🔴' };
const RACETEMPO = 300; // 5:00 min/km in seconden

/* ---------- Opslag ---------- */
function legeStaat() {
  return {
    versie: DATA_VERSIE,
    toewijzing: Array.from({ length: AANTAL_WEKEN }, (_, i) => i + 1), // kalenderweek → inhoudsweek
    historie: [],       // eerdere toewijzingen, voor "ongedaan maken"
    logs: {},           // 'kalenderweek|trainingId' → ingevulde gegevens
    aanpassingen: {},   // 'kalenderweek|trainingId' → gewijzigde velden (laag over de basis)
    extra: {},          // kalenderweek → extra trainingen
    laatsteBackup: null,
    testDatum: null
  };
}

function migreer(d) {
  const basis = legeStaat();
  if (!d || typeof d !== 'object') return basis;
  // Versie 1 is de eerste versie. Komen er later nieuwe versies, dan
  // worden oude gegevens hier omgezet.
  const s = Object.assign(basis, d);
  if (!Array.isArray(s.toewijzing) || s.toewijzing.length !== AANTAL_WEKEN) s.toewijzing = legeStaat().toewijzing;
  s.versie = DATA_VERSIE;
  return s;
}

function laad() {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL);
    return ruw ? migreer(JSON.parse(ruw)) : legeStaat();
  } catch (e) {
    return legeStaat();
  }
}

let S = laad();

function bewaar() {
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(S));
  } catch (e) {
    toast('Opslaan is mislukt. Maak een backup!');
  }
}

/* ---------- Hulpfuncties ---------- */
const $ = sel => document.querySelector(sel);
const kloon = o => JSON.parse(JSON.stringify(o));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtKm(x) {
  if (x === null || x === undefined || x === '' || isNaN(x)) return '–';
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

function parseKm(s) {
  if (s === null || s === undefined) return null;
  const v = parseFloat(String(s).replace(',', '.'));
  return isNaN(v) || v <= 0 ? null : v;
}

// "5:42", "5.42", "5,42" of "542" → 342 seconden per km
function parseTempo(s) {
  s = String(s ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[:.,](\d{1,2})$/);
  let min, sec;
  if (m) {
    min = +m[1];
    sec = m[2].length === 1 ? +m[2] * 10 : +m[2];
  } else if ((m = s.match(/^(\d)(\d\d)$/))) {
    min = +m[1]; sec = +m[2];
  } else if ((m = s.match(/^(\d{1,2})$/))) {
    min = +m[1]; sec = 0;
  } else return null;
  if (sec >= 60) return null;
  const t = min * 60 + sec;
  return t >= 120 && t <= 900 ? t : null;
}

// "25:30" (mm:ss), "1:05:30" (uu:mm:ss), ook met punten of komma's; "45" = 45 min
function parseTijd(s) {
  s = String(s ?? '').trim();
  if (!s) return null;
  const delen = s.split(/[:.,]/).map(x => x.trim());
  if (delen.some(x => !/^\d+$/.test(x))) return null;
  const n = delen.map(Number);
  let t;
  if (n.length === 1) t = n[0] * 60;
  else if (n.length === 2) { if (n[1] >= 60) return null; t = n[0] * 60 + n[1]; }
  else if (n.length === 3) { if (n[1] >= 60 || n[2] >= 60) return null; t = n[0] * 3600 + n[1] * 60 + n[2]; }
  else return null;
  return t > 0 ? t : null;
}

function fmtTempo(sec) {
  if (!sec && sec !== 0) return '–';
  sec = Math.round(sec);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

function fmtTijd(sec) {
  if (!sec && sec !== 0) return '–';
  sec = Math.round(sec);
  const u = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return u ? `${u}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

// Doeltempo "4:55–5:00" → 300 (de langzaamste grens telt)
function doeltempoSec(dt) {
  if (!dt) return null;
  const delen = String(dt).split(/[–-]/).map(x => parseTempo(x)).filter(Boolean);
  return delen.length ? Math.max(...delen) : null;
}

function gemiddelde(arr) {
  const a = arr.filter(x => typeof x === 'number' && !isNaN(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
}

/* ---------- Datum ---------- */
function parseDatum(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
// Dagnummer (aantal dagen sinds 1970) op basis van de lokale datum, zonder last van zomertijd.
function dagNr(d) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
function datumVanNr(n) { const d = new Date(n * 86400000); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
function isoVanNr(n) { const d = datumVanNr(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

const START_NR = dagNr(parseDatum(SCHEMA_START));
const RACE_NR = dagNr(parseDatum(RACE_DATUM));

function vandaagNr() { return dagNr(S.testDatum ? parseDatum(S.testDatum) : new Date()); }

function positie(nr = vandaagNr()) {
  const i = nr - START_NR;
  if (i < 0) return { fase: 'voor', dagenTotStart: -i };
  if (nr > RACE_NR) return { fase: 'na', week: AANTAL_WEKEN, dag: 6 };
  return { fase: 'loopt', week: Math.floor(i / 7) + 1, dag: i % 7 };
}
function huidigeWeek() {
  const p = positie();
  return p.fase === 'voor' ? 1 : p.week;
}
function weekDagNr(cal, dag) { return START_NR + (cal - 1) * 7 + dag; }

function fmtDatum(nr, metDag = false) {
  const d = datumVanNr(nr);
  const dag = metDag ? DAGEN[(nr - START_NR + 7000) % 7] + ' ' : '';
  return `${dag}${d.getDate()} ${MAANDEN[d.getMonth()]}`;
}
function weekBereik(cal) {
  const a = datumVanNr(weekDagNr(cal, 0)), b = datumVanNr(weekDagNr(cal, 6));
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MAANDEN[b.getMonth()]}`
    : `${a.getDate()} ${MAANDEN[a.getMonth()]} – ${b.getDate()} ${MAANDEN[b.getMonth()]}`;
}
function faseVanWeek(cal) {
  return Object.entries(FASES).find(([, f]) => cal >= f.weken[0] && cal <= f.weken[1]);
}

/* ---------- Trainingen opbouwen ---------- */
function inhoudVan(cal) { return S.toewijzing[cal - 1]; }
function isHerstel(inhoud) { return !!SCHEMA_WEKEN[inhoud - 1].herstel; }
function isLoop(t) { return LOOP_TYPES.includes(t.type); }
function sleutel(cal, tid) { return cal + '|' + tid; }

// De vaste weekindeling (sectie 8.1) plus de looptrainingen uit de weekdata.
function basisTrainingen(w) {
  const wk = SCHEMA_WEKEN[w - 1];
  const herstel = wk.herstel;
  const lijst = [];

  wk.runs.forEach(r => {
    const t = {
      tid: `w${w}-${r.dag}-${r.type}`, dag: DAGEN.indexOf(r.dag), type: r.type,
      soort: r.soort || null, km: r.km, doeltempo: r.doeltempo || null,
      titel: r.titel, stappen: r.stappen.slice(), simulatie: r.simulatie || null, notities: []
    };
    if (r.type === 'kwaliteit' && w < 24) t.stappen.push('Optioneel: kort bovenlichaam erna (borst, schouders, armen)');
    if (r.type === 'compromised') t.notities.push('Donderdag volgt op de Hyrox-les: waren je benen woensdag erg zwaar belast, loop het compromised-deel dan rustiger of maak er een rustige loop van.');
    if (w === 11 && r.type === 'kwaliteit') t.notities.push('Deze week staat de kwaliteitsloop op dinsdag 29 december en de beentraining op maandag. Schuiven mag, zolang de regels kloppen. Let op: zo valt de kwaliteitsloop op de dag na de beentraining. Houd de beentraining maandag dan wat lichter, of schuif een van beide.');
    lijst.push(t);
  });

  if (w !== 24) {
    const licht = w === 23;
    lijst.push({
      tid: `w${w}-kracht-benen`, dag: w === 11 ? 0 : 1, type: 'kracht-benen', km: 0,
      titel: licht ? 'Kracht benen (licht)' : 'Kracht benen (zwaar)',
      stappen: [
        licht ? 'Kracht benen licht: minder gewicht en minder sets dan normaal'
          : herstel ? 'Kracht benen zwaar, maar met iets minder gewicht of minder sets (herstelweek)'
            : 'Kracht benen zwaar',
        'Knie- en heupoefeningen (±10 min, 2× 12–15 herhalingen):',
        ...KNIE_HEUP_OEFENINGEN
      ],
      notities: w === 11 ? ['Deze week op maandag, omdat de kwaliteitsloop op dinsdag staat.'] : []
    });
    const lesRustig = herstel || w === 21 || w === 23;
    lijst.push({
      tid: `w${w}-les`, dag: 2, type: 'les', km: 0,
      titel: lesRustig ? 'Hyrox-les (rustig aan)' : 'Hyrox-les',
      stappen: ['Hyrox-les volgen', ...(lesRustig ? ['Doe het deze week rustiger aan'] : [])],
      notities: ['De kilometers die je in de Hyrox-les loopt tellen niet mee in het schema.']
    });
    lijst.push({
      tid: `w${w}-kracht-boven`, dag: 4, type: 'kracht-boven', km: 0,
      titel: 'Kracht bovenlichaam',
      stappen: ['Borst, schouders en armen', ...(herstel ? ['Herstelweek: iets minder gewicht of minder sets'] : [])],
      notities: []
    });
  }
  return lijst;
}

const TYPE_VOLGORDE = ['kwaliteit', 'rustig', 'lang', 'compromised', 'simulatie', 'race', 'kracht-benen', 'les', 'kracht-boven'];

// Alle trainingen van een kalenderweek, mét aanpassingen en extra trainingen.
function trainingenVanWeek(cal) {
  const inhoud = inhoudVan(cal);
  const ruw = basisTrainingen(inhoud).concat((S.extra[cal] || []).map(t => ({ ...kloon(t), extra: true })));
  return ruw.map(t => {
    const key = sleutel(cal, t.tid);
    const a = S.aanpassingen[key];
    return { ...t, ...(a ? kloon(a) : {}), aangepast: !!a, key, cal, inhoud };
  }).sort((a, b) => a.dag - b.dag || TYPE_VOLGORDE.indexOf(a.type) - TYPE_VOLGORDE.indexOf(b.type));
}

function vindTraining(key) {
  const cal = +key.split('|')[0];
  return trainingenVanWeek(cal).find(t => t.key === key) || null;
}

function basisVan(t) {
  if (t.extra) return kloon((S.extra[t.cal] || []).find(x => x.tid === t.tid) || {});
  return basisTrainingen(t.inhoud).find(x => x.tid === t.tid) || {};
}

// Sla wijzigingen op als laag; velden die gelijk zijn aan het origineel vervallen.
function zetAanpassing(t, wijzigingen) {
  const basis = basisVan(t);
  const nieuw = { ...(S.aanpassingen[t.key] || {}), ...wijzigingen };
  Object.keys(nieuw).forEach(k => {
    if (JSON.stringify(nieuw[k]) === JSON.stringify(basis[k] ?? null)) delete nieuw[k];
  });
  if (Object.keys(nieuw).length) S.aanpassingen[t.key] = nieuw;
  else delete S.aanpassingen[t.key];
}

function statusVan(t) { return (S.logs[t.key] && S.logs[t.key].status) || 'open'; }
function weekGepland(lijst) { return lijst.filter(isLoop).reduce((s, t) => s + (+t.km || 0), 0); }
function weekGelopen(lijst) {
  return lijst.filter(isLoop).reduce((s, t) => {
    const l = S.logs[t.key];
    return s + (l && l.status === 'gedaan' ? (+l.km || 0) : 0);
  }, 0);
}
function tempoCat(t) {
  if (t.type === 'rustig' || t.type === 'lang') return 'rustig';
  if (t.type === 'kwaliteit') return t.soort === 'tempo' ? 'tempo' : 'interval';
  return 'compromised';
}

function weekTips(cal) {
  const inhoud = inhoudVan(cal);
  const tips = [];
  if (VAKANTIE_WEKEN.includes(cal)) tips.push({ soort: 'tip', tekst: '🌴 ' + TIPS.vakantie });
  if (isHerstel(inhoud)) tips.push({ soort: 'herstel', tekst: '🔋 ' + TIPS.herstel });
  if (SIMULATIE_WEKEN.includes(inhoud)) tips.push({ soort: 'tip', tekst: '⏱️ ' + TIPS.simulatie });
  if (inhoud === 21) tips.push({ soort: 'tip', tekst: 'Doe de Hyrox-les deze week rustiger aan.' });
  return tips;
}

/* ---------- Tempo en zone per stap ---------- */
function zoneVoor(t) {
  if (t.type === 'kwaliteit') return { kort: 'Zone 4–5', 'lang-interval': 'Zone 4', tempo: 'Zone 3–4' }[t.soort] || 'Zone 4';
  if (['compromised', 'simulatie', 'race'].includes(t.type)) return 'Zone 4';
  return 'Zone 2';
}
function stapInfo(stap, t) {
  if (!isLoop(t)) return null;
  const s = stap.toLowerCase();
  if (s.startsWith('optioneel')) return null;
  if (/versnelling/.test(s)) return '15 sec vlot en ontspannen · daarna 45 sec wandelen';
  const m = s.match(/op (?:max )?(\d:\d\d(?:–\d:\d\d)?) min\/km/);
  if (m) return `Doeltempo ${m[1]} min/km · ${zoneVoor(t)}`;
  if (/inlopen|uitlopen|rustig/.test(s)) return 'Rustig 5:50–6:20 min/km · Zone 2';
  return null;
}

const BEGRIP_REGEX = /\b(inlopen|uitlopen|versnellingen|versnelling|compromised|wall balls|tempoloop|dribbelen|lunges|roeien|station)\b/gi;
function metBegrippen(tekst) {
  return esc(tekst).replace(BEGRIP_REGEX, w => {
    let k = w.toLowerCase();
    if (k === 'versnelling') k = 'versnellingen';
    return `<button class="begrip" data-actie="begrip" data-k="${k}">${w}</button>`;
  });
}

/* ---------- UI-basis: tabs, sheet, toast ---------- */
const ui = { tab: 'vandaag', week: null, testKlikken: 0 };
let grafieken = [];

function ruimGrafiekenOp() { grafieken.forEach(g => g.destroy()); grafieken = []; }

function toast(tekst) {
  const el = $('#toast');
  el.textContent = tekst;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, Math.max(2600, tekst.length * 60));
}

function openSheet(titel, html) {
  $('#sheetTitel').textContent = titel;
  $('#sheetInhoud').innerHTML = html;
  $('#sheetLaag').hidden = false;
  $('#sheetInhoud').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function sluitSheet() {
  $('#sheetLaag').hidden = true;
  $('#sheetInhoud').innerHTML = '';
  document.body.style.overflow = '';
}

const PAGINA_TITELS = { vandaag: 'Vandaag', week: 'Week', schema: 'Schema', voortgang: 'Voortgang', instellingen: 'Instellingen' };

function render() {
  ruimGrafiekenOp();
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('actief', b.dataset.tab === ui.tab));
  $('#paginaTitel').textContent = PAGINA_TITELS[ui.tab];
  const app = $('#app');
  const testbalk = S.testDatum ? `<div class="testbalk">Testdatum actief: ${esc(fmtDatum(vandaagNr(), true))} — zet terug bij Instellingen</div>` : '';
  const pagina = { vandaag: renderVandaag, week: renderWeek, schema: renderSchema, voortgang: renderVoortgang, instellingen: renderInstellingen }[ui.tab];
  app.innerHTML = testbalk + pagina();
  if (ui.tab === 'voortgang') tekenGrafieken();
}

function gaNaar(tab, week) {
  ui.tab = tab;
  if (week) ui.week = week;
  render();
  window.scrollTo(0, 0);
}

/* ---------- Training-kaart ---------- */
function typeLabel(t) {
  const sub = t.type === 'kwaliteit' && t.soort ? ` · ${SOORT_NAAM[t.soort]}` : '';
  return `<span class="label type-label type-${t.type}">${esc(TYPE_NAAM[t.type] || t.type)}${sub}</span>`;
}

function logSamenvatting(t) {
  const l = S.logs[t.key];
  if (!l) return '';
  if (l.status === 'overgeslagen') return '⏭️ Overgeslagen';
  const delen = ['✅ Gedaan'];
  if (isLoop(t)) {
    if (l.km) delen.push(fmtKm(l.km) + ' km');
    if (l.tempo) delen.push(fmtTempo(l.tempo) + '/km');
    if (l.gevoel) delen.push('gevoel ' + l.gevoel);
    if (l.knie) delen.push(KNIE_ICOON[l.knie]);
  }
  return delen.join(' · ');
}

function trainingKaart(t, opties = {}) {
  const st = statusVan(t);
  const stats = isLoop(t) ? `
    <div class="stats">
      <div class="stat"><b>${fmtKm(t.km)}</b><span>km gepland</span></div>
      ${t.doeltempo ? `<div class="stat"><b>${esc(t.doeltempo)}</b><span>doeltempo /km</span></div>` : ''}
      <div class="stat"><b>${esc(zoneVoor(t).replace('Zone ', 'Z'))}</b><span>${t.doeltempo ? 'zone snelle stukken' : 'zone'}</span></div>
    </div>` : '';
  const stappen = (t.stappen || []).map(s => {
    const info = stapInfo(s, t);
    return `<li>${metBegrippen(s)}${info ? `<span class="stap-zone">${esc(info)}</span>` : ''}</li>`;
  }).join('');
  const notities = (t.notities || []).map(n => `<div class="notitie">${metBegrippen(n)}</div>`).join('')
    + (t.omschrijving ? `<div class="notitie">${esc(t.omschrijving)}</div>` : '');
  const samenvatting = logSamenvatting(t);
  const knop = opties.knoppen === false ? '' : (st === 'open'
    ? `<button class="knop primair groot breed mt" data-actie="afvinken" data-key="${esc(t.key)}">Afvinken</button>`
    : `<button class="knop groot breed mt" data-actie="afvinken" data-key="${esc(t.key)}">Invoer bekijken of aanpassen</button>`);
  const beheer = opties.beheer ? `
    <div class="knoppen">
      <button class="knop klein" data-actie="verplaats-kies-dag" data-key="${esc(t.key)}">↔️ Verplaatsen</button>
      <button class="knop klein" data-actie="bewerk" data-key="${esc(t.key)}">✏️ Bewerken</button>
      ${t.aangepast ? `<button class="knop klein" data-actie="herstel-origineel" data-key="${esc(t.key)}">↩️ Herstel origineel</button>` : ''}
      ${t.extra ? `<button class="knop klein gevaar" data-actie="extra-verwijder" data-key="${esc(t.key)}">🗑️ Verwijderen</button>` : ''}
    </div>` : '';
  return `
    <div class="${opties.zonderKaart ? '' : 'kaart '}training type-${t.type}">
      <div class="rij">${typeLabel(t)}${t.aangepast ? '<span class="label">aangepast</span>' : ''}${t.extra ? '<span class="label">extra</span>' : ''}</div>
      <div class="training-titel">${esc(t.titel)}</div>
      ${opties.datum ? `<div class="subtiel">${esc(fmtDatum(weekDagNr(t.cal, t.dag), true))} · week ${t.cal}</div>` : ''}
      ${stats}
      ${stappen ? `<ol class="stappen">${stappen}</ol>` : ''}
      ${notities}
      ${samenvatting ? `<div class="notitie"><b>${esc(samenvatting)}</b>${S.logs[t.key].notitie ? `<br>${esc(S.logs[t.key].notitie)}` : ''}</div>` : ''}
      ${knop}
      ${beheer}
    </div>`;
}

/* ---------- Scherm: Vandaag ---------- */
function isIosBrowser() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
}

function backupHerinnering() {
  if (!Object.keys(S.logs).length) return '';
  const dagen = S.laatsteBackup ? Math.floor((Date.now() - S.laatsteBackup) / 86400000) : null;
  if (dagen !== null && dagen <= 14) return '';
  return `<div class="kaart notitie waarsch">💾 ${dagen === null ? 'Je hebt nog nooit een backup gemaakt.' : `Laatste backup: ${dagen} dagen geleden.`}
    <button class="knop klein mt" data-actie="tab" data-tab="instellingen">Backup maken</button></div>`;
}

function renderVandaag() {
  const p = positie();
  const nr = vandaagNr();
  let html = '';
  if (isIosBrowser()) {
    html += `<div class="kaart installeer"><b>Installeer de app:</b> tik in Safari op <b>Deel</b> (vierkantje met pijl) → <b>Zet op beginscherm</b>.</div>`;
  }
  html += backupHerinnering();

  if (p.fase === 'voor') {
    const morgen = p.dagenTotStart === 1;
    html += `
      <div class="kaart vandaag-rand">
        <div class="aftel-label">Hyrox Duo Rotterdam · za 3 april 2027</div>
        <div class="aftel-getal mt">${morgen ? 'Morgen!' : `Start over ${p.dagenTotStart} dagen`}</div>
        <div class="subtiel mt">Week 1 begint op maandag 19 oktober. Nog ${RACE_NR - nr} dagen tot de race.</div>
      </div>
      <h3 class="subtiel" style="margin:16px 0 8px">Je eerste training</h3>`;
    const eerste = trainingenVanWeek(1).find(t => t.dag === 0);
    if (eerste) html += trainingKaart(eerste, { knoppen: false, datum: true });
    return html;
  }

  if (p.fase === 'na') {
    const race = trainingenVanWeek(AANTAL_WEKEN).find(t => t.type === 'race');
    const raceLog = race && S.logs[race.key];
    html += `
      <div class="kaart vandaag-rand">
        <div class="aftel-getal">🎉 Gefeliciteerd!</div>
        <p>Je hebt 24 weken getraind voor Hyrox Duo Rotterdam. Wat een prestatie!</p>
        ${race ? `<button class="knop primair groot breed" data-actie="afvinken" data-key="${esc(race.key)}">${raceLog ? 'Racetijden bekijken' : 'Racetijden invullen'}</button>` : ''}
        <button class="knop breed mt" data-actie="tab" data-tab="voortgang">Bekijk je voortgang</button>
      </div>`;
    return html;
  }

  const cal = p.week;
  const inhoud = inhoudVan(cal);
  const fase = faseVanWeek(cal);
  const dagenTot = RACE_NR - nr;
  html += `
    <div class="kaart">
      <div class="aftel">
        <div>
          <div class="aftel-label">${dagenTot === 0 ? 'Racedag' : 'Tot de race'}</div>
          <div class="aftel-getal">${dagenTot === 0 ? 'Vandaag!' : `Nog ${dagenTot} ${dagenTot === 1 ? 'dag' : 'dagen'}`}</div>
        </div>
        <div class="aftel-rechts">
          <div class="aftel-label">Week</div>
          <div class="weeknr">${cal}<span class="subtiel">/24</span></div>
        </div>
      </div>
      <div class="rij mt">
        <span class="label">${esc(DAGNAMEN[p.dag])} ${esc(fmtDatum(nr))}</span>
        <span class="label">Fase ${fase[0]}: ${esc(fase[1].naam)}</span>
        ${isHerstel(inhoud) ? '<span class="label herstel">Herstelweek</span>' : ''}
        ${inhoud !== cal ? `<span class="label accent">Inhoud week ${inhoud}</span>` : ''}
      </div>
    </div>`;

  const lijst = trainingenVanWeek(cal).filter(t => t.dag === p.dag);
  if (lijst.length) {
    html += lijst.map(t => trainingKaart(t)).join('');
  } else {
    const morgenNr = nr + 1;
    const pm = positie(morgenNr);
    const morgen = pm.fase === 'loopt' ? trainingenVanWeek(pm.week).filter(t => t.dag === pm.dag) : [];
    html += `
      <div class="kaart type-rust training">
        <div class="training-titel">Rustdag 😴</div>
        <p class="subtiel">Vandaag staat er niets op het schema. Herstellen hoort bij trainen.</p>
        <h3>Morgen</h3>
        ${morgen.length ? morgen.map(t => `<div class="item type-${t.type}" data-actie="detail" data-key="${esc(t.key)}"><span class="item-tekst"><b>${esc(t.titel)}</b><span>${esc(TYPE_NAAM[t.type])}</span></span>${isLoop(t) ? `<span class="item-km">${fmtKm(t.km)} km</span>` : ''}</div>`).join('') : '<p class="subtiel">Morgen is ook een rustdag.</p>'}
      </div>`;
  }

  weekTips(cal).forEach(tip => { html += `<div class="kaart notitie ${tip.soort}">${esc(tip.tekst)}</div>`; });
  if (p.dag === 6) html += `<button class="knop breed" data-actie="tab" data-tab="week">📊 Bekijk je weekoverzicht</button>`;
  return html;
}

/* ---------- Scherm: Week ---------- */
function renderWeek() {
  const cal = ui.week || huidigeWeek();
  ui.week = cal;
  const inhoud = inhoudVan(cal);
  const lijst = trainingenVanWeek(cal);
  const fase = faseVanWeek(cal);
  const vNr = vandaagNr();
  const gepland = weekGepland(lijst), gelopen = weekGelopen(lijst);
  const pct = gepland ? Math.min(100, Math.round(gelopen / gepland * 100)) : 0;

  let html = `
    <div class="week-nav">
      <button class="knop" data-actie="week-nav" data-d="-1" ${cal <= 1 ? 'disabled' : ''} aria-label="Vorige week">‹</button>
      <div class="week-nav-midden"><b>Week ${cal}</b><span class="subtiel">${esc(weekBereik(cal))}</span></div>
      <button class="knop" data-actie="week-nav" data-d="1" ${cal >= AANTAL_WEKEN ? 'disabled' : ''} aria-label="Volgende week">›</button>
    </div>
    <div class="kaart">
      <div class="rij">
        <span class="label">Fase ${fase[0]}: ${esc(fase[1].naam)}</span>
        ${isHerstel(inhoud) ? '<span class="label herstel">Herstelweek</span>' : ''}
        ${inhoud !== cal ? `<span class="label accent">Inhoud van week ${inhoud}</span>` : ''}
      </div>
      <div class="rij-tussen mt">
        <div><div class="groot-getal">${fmtKm(gelopen)} <span class="subtiel">/ ${fmtKm(gepland)} km</span></div><div class="subtiel klein">gelopen / gepland</div></div>
        <div class="groot-getal">${pct}%</div>
      </div>
      <div class="voortgangsbalk"><div style="width:${pct}%"></div></div>
    </div>`;

  weekTips(cal).forEach(tip => { html += `<div class="kaart notitie ${tip.soort}">${esc(tip.tekst)}</div>`; });

  html += '<div class="kaart">';
  for (let d = 0; d < 7; d++) {
    const nr = weekDagNr(cal, d);
    const items = lijst.filter(t => t.dag === d);
    html += `
      <div class="dag ${nr === vNr ? 'is-vandaag' : ''}">
        <div class="dag-kop">${DAGEN[d]}<small>${esc(fmtDatum(nr))}</small></div>
        <div class="dag-items">
          ${items.length ? items.map(t => `
            <button class="item type-${t.type}" data-actie="detail" data-key="${esc(t.key)}">
              <span class="item-status">${STATUS_ICOON[statusVan(t)]}</span>
              <span class="item-tekst"><b>${esc(t.titel)}</b><span>${esc(TYPE_NAAM[t.type])}${t.aangepast ? ' · aangepast' : ''}</span></span>
              ${isLoop(t) ? `<span class="item-km">${fmtKm(t.km)} km</span>` : ''}
            </button>`).join('') : '<div class="rust-tekst">Rust 😴</div>'}
        </div>
      </div>`;
  }
  html += '</div>';

  html += `
    <div class="knoppen">
      <button class="knop" data-actie="kies-training" data-doel="verplaats">↔️ Training verplaatsen</button>
      <button class="knop" data-actie="kies-training" data-doel="bewerk">✏️ Training bewerken</button>
      <button class="knop" data-actie="herhaal" data-cal="${cal}">🔁 Week herhalen</button>
      <button class="knop" data-actie="ziek" data-cal="${cal}">🤒 Week ziek/gemist</button>
      <button class="knop" data-actie="extra-nieuw" data-cal="${cal}">➕ Extra loop</button>
      ${S.historie.length ? '<button class="knop" data-actie="ongedaan">↶ Ongedaan maken</button>' : ''}
    </div>`;

  const p = positie();
  const toonOverzicht = p.fase === 'na' || (p.fase === 'loopt' && (cal < p.week || (cal === p.week && p.dag === 6)));
  if (toonOverzicht) html += weekOverzicht(cal, lijst);
  return html;
}

function weekOverzicht(cal, lijst) {
  const plan = lijst.length;
  const gedaan = lijst.filter(t => statusVan(t) === 'gedaan').length;
  const logs = lijst.filter(t => isLoop(t) && statusVan(t) === 'gedaan').map(t => ({ t, l: S.logs[t.key] }));
  const gevoel = gemiddelde(logs.map(x => x.l.gevoel));
  const knie = { groen: 0, geel: 0, rood: 0 };
  logs.forEach(x => { if (x.l.knie) knie[x.l.knie]++; });
  const perCat = {};
  logs.forEach(x => { if (x.l.tempo) (perCat[tempoCat(x.t)] = perCat[tempoCat(x.t)] || []).push(x.l.tempo); });
  return `
    <div class="kaart mt">
      <h2>📊 Weekoverzicht</h2>
      <div class="stats">
        <div class="stat"><b>${gedaan}/${plan}</b><span>trainingen gedaan</span></div>
        <div class="stat"><b>${fmtKm(weekGelopen(lijst))}</b><span>km gelopen</span></div>
        <div class="stat"><b>${gevoel ? fmtKm(gevoel) : '–'}</b><span>gem. gevoel</span></div>
      </div>
      <div class="rij"><span class="label">🟢 ${knie.groen}</span><span class="label">🟡 ${knie.geel}</span><span class="label">🔴 ${knie.rood}</span><span class="subtiel klein">kniecheck</span></div>
      <h3>Gemiddeld tempo per soort loop</h3>
      ${Object.keys(perCat).length ? Object.entries(perCat).map(([c, arr]) => `<div class="vergelijk"><span>${esc(TEMPO_CATS[c].naam)}</span><b>${fmtTempo(gemiddelde(arr))}/km</b></div>`).join('') : '<p class="subtiel">Nog geen tempo\'s ingevuld deze week.</p>'}
    </div>`;
}

/* ---------- Scherm: Schema ---------- */
function weekVoltooiing(cal) {
  const lijst = trainingenVanWeek(cal);
  if (!lijst.length) return null;
  return Math.round(lijst.filter(t => statusVan(t) === 'gedaan').length / lijst.length * 100);
}

function renderSchema() {
  const p = positie();
  let html = `
    <div class="knoppen">
      <button class="knop" data-actie="uitgangspunten">📋 Uitgangspunten & regels</button>
      <button class="knop" data-actie="zones">🎯 Tempo-zones</button>
      ${S.historie.length ? '<button class="knop" data-actie="ongedaan">↶ Ongedaan maken</button>' : ''}
    </div>`;
  Object.entries(FASES).forEach(([n, f]) => {
    html += `<div class="fase-kop"><h2>Fase ${n}: ${esc(f.naam)}</h2><div class="subtiel klein">Week ${f.weken[0]}–${f.weken[1]} · ${esc(f.periode)}</div><p class="subtiel">${esc(f.uitleg)}</p></div>`;
    for (let cal = f.weken[0]; cal <= f.weken[1]; cal++) {
      const inhoud = inhoudVan(cal);
      const lijst = trainingenVanWeek(cal);
      const runs = lijst.filter(isLoop);
      const voorbij = p.fase === 'na' || (p.fase === 'loopt' && cal < p.week);
      const isNu = p.fase === 'loopt' && cal === p.week;
      const rechts = voorbij ? `${weekVoltooiing(cal)}%<small>voltooid</small>` : `${fmtKm(weekGepland(lijst))}<small>km</small>`;
      html += `
        <button class="schemaweek ${isHerstel(inhoud) ? 'herstel' : ''} ${isNu ? 'is-nu' : ''}" data-actie="naar-week" data-cal="${cal}">
          <span class="schemaweek-nr">${cal}<small>week</small></span>
          <span>
            <span class="rij" style="gap:6px"><b>${esc(weekBereik(cal))}</b>
              ${isHerstel(inhoud) ? '<span class="label herstel">Herstel</span>' : ''}
              ${inhoud !== cal ? `<span class="label accent">inhoud wk ${inhoud}</span>` : ''}
              ${isNu ? '<span class="label accent">nu</span>' : ''}</span>
            <span class="schemaweek-dagen">${runs.map(t => `${DAGEN[t.dag]} <b>${t.type === 'race' ? '🏁' : fmtKm(t.km)}</b>`).join(' · ')}</span>
          </span>
          <span class="schemaweek-km">${rechts}</span>
        </button>`;
    }
  });
  return html;
}

function uitgangspuntenHTML() {
  return `
    <ul class="lijst">${UITGANGSPUNTEN.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
    <h3 class="mt">Waarschuwingen in de app</h3>
    <ul class="lijst">
      <li>Verplaatsen: twee zware looptrainingen (kwaliteit, compromised/simulatie vanaf week 9, lange loop) op opeenvolgende dagen, of intervallen/tempoloop op de dag na zware beentraining.</li>
      <li>Bewerken: weektotaal meer dan 10% boven de zwaarste week tot dan toe, een weektotaal boven 26 km, of één loop boven 11 km.</li>
      <li>Knie: ${esc(KNIE_REGEL)}</li>
      <li>Week gemist of ziek geweest? Niet inhalen; begin weer bij de laatste week die goed ging.</li>
    </ul>`;
}

function zonesHTML() {
  return `
    <table class="zone-tabel">
      <tr><th>Soort</th><th>Tempo</th><th>Gevoel</th><th>Zone</th></tr>
      ${TEMPO_ZONES.map(z => `<tr><td><b>${esc(z.soort)}</b></td><td>${esc(z.tempo)}</td><td>${esc(z.gevoel)}</td><td>${esc(z.zone)}</td></tr>`).join('')}
    </table>
    <ul class="lijst mt">${TEMPO_NOTITIES.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
}

/* ---------- Afvinken en invullen ---------- */
let formulier = null;

function rondesAantal(sim) { return sim.set === 'alle' ? 8 : 4; }
function stationStart(sim) { return sim.set === '5-8' ? 4 : 0; }

function openAfvinken(key) {
  const t = vindTraining(key);
  if (!t) return;
  const l = S.logs[key] || {};
  const isSim = t.type === 'simulatie' || t.type === 'race';
  const f = {
    status: l.status || 'gedaan',
    gevoel: l.gevoel || null,
    doel: l.doel || null,
    knie: l.knie || null,
    sim: l.sim ? kloon(l.sim) : (isSim ? { set: t.simulatie === 'half' ? '1-4' : 'alle', rondes: [] } : null)
  };
  formulier = { t, f, auto: null };
  const km = l.km ?? (t.km || '');
  let html = `
    <div class="subtiel">${esc(fmtDatum(weekDagNr(t.cal, t.dag), true))} · week ${t.cal} · ${esc(TYPE_NAAM[t.type])}</div>
    <div class="veld"><span class="veld-label">Status</span>
      <div class="segment" data-groep="status">
        ${['gedaan', 'overgeslagen', 'open'].map(s => `<button data-actie="f-kies" data-veld="status" data-w="${s}" class="${f.status === s ? 'aan' : ''}">${STATUS_ICOON[s]} ${s === 'open' ? 'Nog te doen' : s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
      </div>
    </div>
    <div id="fDetails" ${f.status === 'gedaan' ? '' : 'hidden'}>`;

  if (isLoop(t)) {
    html += `
      <div class="veld">
        <span class="veld-label">Afstand, tempo en tijd</span>
        <div class="velden-3">
          <div><input type="text" inputmode="decimal" id="fKm" value="${esc(km === '' ? '' : fmtKm(km))}" placeholder="km"><small>km</small></div>
          <div><input type="text" inputmode="decimal" id="fTempo" value="${esc(l.tempo ? fmtTempo(l.tempo) : '')}" placeholder="5:42"><small>tempo /km</small></div>
          <div><input type="text" inputmode="decimal" id="fTijd" value="${esc(l.tijd ? fmtTijd(l.tijd) : '')}" placeholder="mm:ss"><small>tijd (optioneel)</small></div>
        </div>
        <div class="hint">Tempo zoals op je Apple Watch, bijv. 5:42 (of 5.42). Vul je alleen de tijd in, dan rekent de app het tempo uit — en andersom.</div>
      </div>`;
    if (isSim) html += simulatieHTML(f.sim, t);
    html += `
      <div class="veld"><span class="veld-label">Hoe zwaar was het? (1 = heel licht, 10 = maximaal)</span>
        <div class="gevoel-schaal">${Array.from({ length: 10 }, (_, i) => `<button data-actie="f-kies" data-veld="gevoel" data-w="${i + 1}" class="${f.gevoel === i + 1 ? 'aan' : ''}">${i + 1}</button>`).join('')}</div>
      </div>`;
    if (t.doeltempo) html += `
      <div class="veld"><span class="veld-label">Doeltempo (${esc(t.doeltempo)}) gehaald?</span>
        <div class="segment">${['ja', 'deels', 'nee'].map(w => `<button data-actie="f-kies" data-veld="doel" data-w="${w}" class="${f.doel === w ? 'aan' : ''}">${w[0].toUpperCase() + w.slice(1)}</button>`).join('')}</div>
      </div>`;
    html += `
      <div class="veld"><span class="veld-label">Kniecheck</span>
        <div class="segment">${['groen', 'geel', 'rood'].map(w => `<button data-actie="f-kies" data-veld="knie" data-w="${w}" class="${f.knie === w ? 'aan' : ''}">${KNIE_ICOON[w]} ${{ groen: 'Geen klachten', geel: 'Voelbaar', rood: 'Pijn' }[w]}</button>`).join('')}</div>
        <div id="knieRegel" class="notitie waarsch" ${f.knie === 'geel' || f.knie === 'rood' ? '' : 'hidden'}>
          ${esc(KNIE_REGEL)}
          <button class="knop breed mt" data-actie="f-knie-herhaal">🔁 Week herhalen</button>
        </div>
      </div>
      <div class="veld"><label for="fNotitie">Hoe ging het?</label><textarea id="fNotitie" placeholder="Bijv. benen zwaar na de les, laatste interval lastig…">${esc(l.notitie || '')}</textarea></div>`;
  } else if (t.type === 'kracht-benen' || t.type === 'kracht-boven') {
    html += `<div class="veld"><label for="fNotitie">Wat heb je gedaan? (korte notitie)</label><textarea id="fNotitie" placeholder="Bijv. squats, lunges, step-downs…">${esc(l.notitie || '')}</textarea></div>`;
  } else {
    html += `<p class="subtiel mt">Alleen afvinken is genoeg.</p>`;
  }
  html += `</div>
    <button class="knop primair groot breed mt" data-actie="f-opslaan">Opslaan</button>`;

  openSheet(t.titel, html);
  ['fKm', 'fTempo', 'fTijd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => herbereken(id));
  });
  document.querySelectorAll('.sim-in').forEach(el => el.addEventListener('input', simBijwerken));
}

function simulatieHTML(sim, t) {
  const halfKeuze = t.simulatie === 'half' ? `
    <div class="segment mt">${['1-4', '5-8'].map(s => `<button data-actie="f-sim-set" data-w="${s}" class="${sim.set === s ? 'aan' : ''}">Stations ${s.replace('-', '–')}</button>`).join('')}</div>` : '';
  return `
    <div class="veld" id="simBlok"><span class="veld-label">${t.type === 'race' ? '🏁 Racetijden' : '⏱️ Simulatielogboek'}</span>
      <div class="hint">Per ronde: tijd van de 1 km looprun en tijd op het station (mm:ss).</div>
      ${halfKeuze}
      <div id="simRondes">${simRondesHTML(sim)}</div>
    </div>`;
}

function simRondesHTML(sim) {
  const start = stationStart(sim);
  let rijen = '';
  for (let i = 0; i < rondesAantal(sim); i++) {
    const r = sim.rondes[i] || {};
    rijen += `<tr><td>${i + 1}. ${esc(HYROX_STATIONS[start + i])}</td>
      <td><input class="sim-in" data-r="${i}" data-k="loop" inputmode="decimal" value="${r.loop ? fmtTijd(r.loop) : ''}" placeholder="5:00"></td>
      <td><input class="sim-in" data-r="${i}" data-k="station" inputmode="decimal" value="${r.station ? fmtTijd(r.station) : ''}" placeholder="mm:ss"></td></tr>`;
  }
  return `<table class="sim-tabel"><tr><th>Ronde · station</th><th>1 km</th><th>Station</th></tr>${rijen}</table>
    <div class="sim-totaal"><span>Totaal: <span id="simTotaal">${fmtTijd(simTotaal(sim)) || '–'}</span></span><span>Gem. looptempo: <span id="simTempo">${simGemTempo(sim) ? fmtTempo(simGemTempo(sim)) : '–'}</span></span></div>`;
}

function simTotaal(sim) {
  const t = (sim.rondes || []).slice(0, rondesAantal(sim)).reduce((s, r) => s + (r && r.loop || 0) + (r && r.station || 0), 0);
  return t || null;
}
function simGemTempo(sim) { return gemiddelde((sim.rondes || []).slice(0, rondesAantal(sim)).map(r => r && r.loop)); }

function simBijwerken(e) {
  const sim = formulier.f.sim;
  const i = +e.target.dataset.r, k = e.target.dataset.k;
  sim.rondes[i] = sim.rondes[i] || {};
  sim.rondes[i][k] = parseTijd(e.target.value);
  $('#simTotaal').textContent = simTotaal(sim) ? fmtTijd(simTotaal(sim)) : '–';
  $('#simTempo').textContent = simGemTempo(sim) ? fmtTempo(simGemTempo(sim)) : '–';
}

// Tijd ↔ tempo automatisch uitrekenen. Een automatisch ingevuld veld is grijs.
function herbereken(bron) {
  const fKm = $('#fKm'), fTempo = $('#fTempo'), fTijd = $('#fTijd');
  const km = parseKm(fKm.value), tempo = parseTempo(fTempo.value), tijd = parseTijd(fTijd.value);
  const zetAuto = (el, waarde, naam) => { el.value = waarde; el.classList.toggle('auto', !!naam); formulier.auto = naam; };
  if ((bron === 'fTempo' && formulier.auto === 'tempo') || (bron === 'fTijd' && formulier.auto === 'tijd')) {
    formulier.auto = null;
    document.getElementById(bron).classList.remove('auto');
  }
  const tempoVrij = !fTempo.value.trim() || formulier.auto === 'tempo';
  const tijdVrij = !fTijd.value.trim() || formulier.auto === 'tijd';
  if (bron !== 'fTempo' && tempoVrij && km && tijd) zetAuto(fTempo, fmtTempo(tijd / km), 'tempo');
  else if (bron !== 'fTijd' && tijdVrij && km && tempo) zetAuto(fTijd, fmtTijd(tempo * km), 'tijd');
  else if (formulier.auto === 'tempo' && !(km && tijd)) zetAuto(fTempo, '', null);
  else if (formulier.auto === 'tijd' && !(km && tempo)) zetAuto(fTijd, '', null);
}

function formKies(el) {
  const { veld, w } = el.dataset;
  const f = formulier.f;
  let waarde = veld === 'gevoel' ? +w : w;
  if (veld !== 'status' && f[veld] === waarde) waarde = null; // nogmaals tikken = uitzetten
  f[veld] = waarde;
  el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('aan', b === el && waarde !== null));
  if (veld === 'status') $('#fDetails').hidden = waarde !== 'gedaan';
  if (veld === 'knie') $('#knieRegel').hidden = !(waarde === 'geel' || waarde === 'rood');
}

function formOpslaan() {
  const { t, f } = formulier;
  if (f.status === 'open') {
    delete S.logs[t.key];
    bewaar();
    return true;
  }
  const log = { status: f.status, bijgewerkt: Date.now() };
  if (f.status === 'gedaan') {
    const notitie = $('#fNotitie') ? $('#fNotitie').value.trim() : '';
    if (notitie) log.notitie = notitie;
    if (isLoop(t)) {
      const km = parseKm($('#fKm').value);
      const tempoTekst = $('#fTempo').value.trim(), tijdTekst = $('#fTijd').value.trim();
      let tempo = parseTempo(tempoTekst), tijd = parseTijd(tijdTekst);
      if (tempoTekst && !tempo) { toast('Tempo niet herkend. Gebruik bijv. 5:42'); return false; }
      if (tijdTekst && !tijd) { toast('Tijd niet herkend. Gebruik mm:ss of uu:mm:ss'); return false; }
      if (!tempo && tijd && km) tempo = Math.round(tijd / km);
      if (!tijd && tempo && km) tijd = Math.round(tempo * km);
      if (f.sim && !tempo && simGemTempo(f.sim)) tempo = Math.round(simGemTempo(f.sim));
      if (km) log.km = km;
      if (tempo) log.tempo = tempo;
      if (tijd) log.tijd = tijd;
      if (f.gevoel) log.gevoel = f.gevoel;
      if (f.doel && t.doeltempo) log.doel = f.doel;
      if (f.knie) log.knie = f.knie;
      if (f.sim && f.sim.rondes.some(r => r && (r.loop || r.station))) {
        log.sim = { set: f.sim.set, rondes: f.sim.rondes.slice(0, rondesAantal(f.sim)) };
      }
    }
  }
  S.logs[t.key] = log;
  bewaar();
  return true;
}

/* ---------- Regels en waarschuwingen ---------- */
function isZwaar(t) {
  return ['kwaliteit', 'lang', 'simulatie', 'race'].includes(t.type) || (t.type === 'compromised' && t.inhoud >= 9);
}
function isZwareBenen(t) { return t.type === 'kracht-benen' && t.inhoud !== 23; }

function regelWaarschuwingen(cal, lijst) {
  const items = [];
  [cal - 1, cal, cal + 1].forEach(c => {
    if (c < 1 || c > AANTAL_WEKEN) return;
    (c === cal ? lijst : trainingenVanWeek(c)).forEach(t => items.push({ nr: weekDagNr(c, t.dag), t }));
  });
  const naam = i => `${i.t.titel} (${fmtDatum(i.nr, true)})`;
  const w = [];
  const zwaar = items.filter(i => isZwaar(i.t)).sort((a, b) => a.nr - b.nr);
  for (let a = 0; a < zwaar.length; a++) {
    for (let b = a + 1; b < zwaar.length; b++) {
      const d = zwaar[b].nr - zwaar[a].nr;
      if (d === 1) w.push(`Twee zware looptrainingen op opeenvolgende dagen: ${naam(zwaar[a])} en ${naam(zwaar[b])}.`);
      if (d === 0) w.push(`Twee zware looptrainingen op dezelfde dag: ${naam(zwaar[a])} en ${naam(zwaar[b])}.`);
    }
  }
  items.filter(i => isZwareBenen(i.t)).forEach(b => {
    items.filter(i => i.t.type === 'kwaliteit' && i.nr - b.nr === 1).forEach(k => {
      w.push(`Intervallen of tempoloop op de dag na zware beentraining: ${naam(k)} na ${naam(b)}.`);
    });
  });
  return w;
}

function zwaarsteWeekVoor(cal) {
  let max = STARTPUNT.kmPerWeek;
  for (let c = 1; c < cal; c++) max = Math.max(max, weekGepland(trainingenVanWeek(c)));
  return max;
}

function kmWaarschuwingen(cal, lijst, t) {
  const w = [];
  const totaal = weekGepland(lijst);
  const max = zwaarsteWeekVoor(cal);
  if (totaal > max * 1.1 + 0.001) w.push(`10%-regel: het weektotaal wordt ${fmtKm(totaal)} km. Dat is meer dan 10% boven je zwaarste week tot nu toe (${fmtKm(max)} km).`);
  if (totaal > 26) w.push(`Plafond: het weektotaal wordt ${fmtKm(totaal)} km, boven de 26 km.`);
  if (t && isLoop(t) && +t.km > 11) w.push(`Langste loop: ${fmtKm(t.km)} km is meer dan 11 km. Let op: je knieklachten kwamen door lange afstanden.`);
  return w;
}

function waarschuwingHTML(lijst) {
  return lijst.map(w => `<div class="notitie waarsch">⚠️ ${esc(w)}</div>`).join('');
}

/* ---------- Verplaatsen ---------- */
function openKiesTraining(doel) {
  const lijst = trainingenVanWeek(ui.week);
  openSheet(doel === 'verplaats' ? 'Welke training verplaatsen?' : 'Welke training bewerken?',
    lijst.map(t => `
      <button class="keuze" data-actie="${doel === 'verplaats' ? 'verplaats-kies-dag' : 'bewerk'}" data-key="${esc(t.key)}">
        <span><b>${esc(t.titel)}</b><br><span class="subtiel klein">${esc(DAGNAMEN[t.dag])} · ${esc(TYPE_NAAM[t.type])}</span></span>
        <span>${isLoop(t) ? fmtKm(t.km) + ' km' : ''}</span>
      </button>`).join(''));
}

function openVerplaats(key) {
  const t = vindTraining(key);
  openSheet('Verplaatsen', `
    <p><b>${esc(t.titel)}</b><br><span class="subtiel">Kies een andere dag in week ${t.cal}.</span></p>
    ${DAGEN.map((d, i) => `<button class="keuze ${i === t.dag ? 'aan' : ''}" data-actie="verplaats-naar" data-key="${esc(key)}" data-dag="${i}" ${i === t.dag ? 'disabled' : ''}>
      <span><b>${DAGNAMEN[i]}</b> ${esc(fmtDatum(weekDagNr(t.cal, i)))}</span>
      <span class="subtiel klein">${esc(trainingenVanWeek(t.cal).filter(x => x.dag === i && x.key !== key).map(x => x.titel).join(', ') || 'rust')}</span></button>`).join('')}`);
}

function verplaatsNaar(key, dag, bevestigd) {
  const t = vindTraining(key);
  const huidig = trainingenVanWeek(t.cal);
  const nieuw = huidig.map(x => x.key === key ? { ...x, dag } : x);
  const oud = regelWaarschuwingen(t.cal, huidig);
  const extra = regelWaarschuwingen(t.cal, nieuw).filter(w => !oud.includes(w));
  if (extra.length && !bevestigd) {
    openSheet('Let op', `
      ${waarschuwingHTML(extra)}
      <p class="subtiel">Dit is een waarschuwing, geen verbod. Je mag het toch doen.</p>
      <div class="knoppen">
        <button class="knop" data-actie="verplaats-kies-dag" data-key="${esc(key)}">Andere dag</button>
        <button class="knop primair" data-actie="verplaats-naar" data-key="${esc(key)}" data-dag="${dag}" data-bevestigd="1">Toch verplaatsen</button>
      </div>`);
    return;
  }
  zetAanpassing(t, { dag });
  bewaar();
  sluitSheet();
  render();
  toast(`Verplaatst naar ${DAGNAMEN[dag]}`);
}

/* ---------- Bewerken ---------- */
function openBewerk(key) {
  const t = vindTraining(key);
  const loop = isLoop(t);
  openSheet('Training bewerken', `
    <div class="subtiel">${esc(DAGNAMEN[t.dag])} ${esc(fmtDatum(weekDagNr(t.cal, t.dag)))} · week ${t.cal}</div>
    <div class="veld"><label for="bTitel">Titel</label><input type="text" id="bTitel" value="${esc(t.titel)}"></div>
    ${loop ? `
      <div class="veld"><label for="bKm">Afstand (km)</label><input type="text" inputmode="decimal" id="bKm" value="${esc(t.km ? fmtKm(t.km) : '')}"></div>
      <div class="veld"><label for="bDoel">Doeltempo (min/km, mag leeg)</label><input type="text" inputmode="decimal" id="bDoel" value="${esc(t.doeltempo || '')}" placeholder="bijv. 5:05"></div>` : ''}
    <div class="veld"><label for="bOmschr">Omschrijving (extra uitleg)</label><textarea id="bOmschr">${esc(t.omschrijving || '')}</textarea></div>
    <div class="veld"><label for="bStappen">Stappen (één stap per regel)</label><textarea id="bStappen" style="min-height:150px">${esc((t.stappen || []).join('\n'))}</textarea></div>
    <div id="bWaarsch"></div>
    <button class="knop primair groot breed mt" data-actie="bewerk-opslaan" data-key="${esc(key)}">Opslaan</button>
    ${t.aangepast ? `<button class="knop breed mt" data-actie="herstel-origineel" data-key="${esc(key)}">↩️ Herstel origineel</button>` : ''}`);
}

function bewerkOpslaan(key, bevestigd) {
  const t = vindTraining(key);
  const w = {
    titel: $('#bTitel').value.trim() || t.titel,
    stappen: $('#bStappen').value.split('\n').map(s => s.trim()).filter(Boolean),
    omschrijving: $('#bOmschr').value.trim() || null
  };
  if (isLoop(t)) {
    const kmTekst = $('#bKm').value.trim();
    const km = parseKm(kmTekst);
    if (kmTekst && !km) { toast('Afstand niet herkend'); return; }
    w.km = km || 0;
    const doel = $('#bDoel').value.trim().replace(/\./g, ':').replace(/-/g, '–');
    if (doel && !doeltempoSec(doel)) { toast('Doeltempo niet herkend. Gebruik bijv. 5:05'); return; }
    w.doeltempo = doel || null;
    if (!bevestigd) {
      const nieuwT = { ...t, ...w };
      const lijst = trainingenVanWeek(t.cal).map(x => x.key === key ? nieuwT : x);
      const oud = kmWaarschuwingen(t.cal, trainingenVanWeek(t.cal), t);
      const extra = kmWaarschuwingen(t.cal, lijst, nieuwT).filter(x => !oud.includes(x) || nieuwT.km > t.km);
      if (extra.length) {
        $('#bWaarsch').innerHTML = waarschuwingHTML(extra) + `
          <p class="subtiel">Dit is een waarschuwing, geen verbod.</p>
          <button class="knop breed" data-actie="bewerk-opslaan" data-key="${esc(key)}" data-bevestigd="1">Toch opslaan</button>`;
        $('#bWaarsch').scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
  }
  zetAanpassing(t, w);
  bewaar();
  sluitSheet();
  render();
  toast('Training aangepast');
}

function herstelOrigineel(key) {
  delete S.aanpassingen[key];
  bewaar();
  sluitSheet();
  render();
  toast('Origineel hersteld');
}

/* ---------- Extra loop ---------- */
function openExtra(cal) {
  openSheet('Extra loop toevoegen', `
    <p class="subtiel">Week ${cal} · ${esc(weekBereik(cal))}</p>
    <div class="veld"><label for="xType">Soort</label>
      <select id="xType">
        <option value="rustig">Rustig</option><option value="lang">Lange loop</option>
        <option value="kwaliteit">Kwaliteit (intervallen)</option><option value="compromised">Compromised</option>
      </select></div>
    <div class="veld"><label for="xDag">Dag</label>
      <select id="xDag">${DAGNAMEN.map((d, i) => `<option value="${i}">${d} ${esc(fmtDatum(weekDagNr(cal, i)))}</option>`).join('')}</select></div>
    <div class="veld"><label for="xKm">Afstand (km)</label><input type="text" inputmode="decimal" id="xKm" placeholder="bijv. 4"></div>
    <div class="veld"><label for="xTitel">Titel</label><input type="text" id="xTitel" placeholder="bijv. Extra rustig loopje"></div>
    <div id="xWaarsch"></div>
    <button class="knop primair groot breed mt" data-actie="extra-opslaan" data-cal="${cal}">Toevoegen</button>`);
}

function extraOpslaan(cal, bevestigd) {
  const type = $('#xType').value;
  const km = parseKm($('#xKm').value) || 0;
  const t = {
    tid: 'x' + Date.now(), dag: +$('#xDag').value, type, soort: type === 'kwaliteit' ? 'kort' : null,
    km, doeltempo: null, titel: $('#xTitel').value.trim() || `Extra: ${TYPE_NAAM[type].toLowerCase()}${km ? ' ' + fmtKm(km) + ' km' : ''}`,
    stappen: [], notities: []
  };
  if (!bevestigd) {
    const nieuw = { ...t, key: sleutel(cal, t.tid), cal, inhoud: inhoudVan(cal) };
    const huidig = trainingenVanWeek(cal);
    const lijst = huidig.concat([nieuw]);
    const w = kmWaarschuwingen(cal, lijst, nieuw).concat(regelWaarschuwingen(cal, lijst).filter(x => !regelWaarschuwingen(cal, huidig).includes(x)));
    if (w.length) {
      $('#xWaarsch').innerHTML = waarschuwingHTML(w) + `<button class="knop breed mt" data-actie="extra-opslaan" data-cal="${cal}" data-bevestigd="1">Toch toevoegen</button>`;
      return;
    }
  }
  (S.extra[cal] = S.extra[cal] || []).push(t);
  bewaar();
  sluitSheet();
  render();
  toast('Extra loop toegevoegd');
}

function extraVerwijder(key) {
  const t = vindTraining(key);
  S.extra[t.cal] = (S.extra[t.cal] || []).filter(x => x.tid !== t.tid);
  delete S.logs[key];
  delete S.aanpassingen[key];
  bewaar();
  sluitSheet();
  render();
  toast('Verwijderd');
}

/* ---------- Week herhalen ---------- */
// De inhoud X komt in kalenderweek cal+1; alles schuift één op tot de gekozen week, die vervalt.
function nieuweToewijzing(cal, inhoudX, vervalt) {
  const a = S.toewijzing;
  const rest = a.slice(cal).slice();
  const idx = rest.indexOf(vervalt);
  rest.splice(idx, 1);
  return a.slice(0, cal).concat([inhoudX], rest);
}

function openHerhaal(cal, inhoudX, intro) {
  inhoudX = inhoudX || inhoudVan(cal);
  const opties = S.toewijzing.slice(cal).filter(w => w !== 23 && w !== 24);
  let html = intro || '';
  html += `<p>Je herhaalt <b>week ${inhoudX}</b>: die komt ook in kalenderweek ${cal + 1}. De racedatum staat vast, dus er moet een latere week vervallen. Welke?</p>`;
  if (!opties.length || cal >= AANTAL_WEKEN) {
    html += `<div class="notitie waarsch">Er is geen week meer die kan vervallen. Week 23 en 24 (afbouw) blijven altijd staan.</div>`;
    openSheet('Week herhalen', html);
    return;
  }
  html += opties.map(w => {
    const k = S.toewijzing.indexOf(w, cal) + 1;
    return `<button class="keuze" data-actie="herhaal-kies" data-cal="${cal}" data-x="${inhoudX}" data-v="${w}">
      <span><b>Week ${w} vervalt</b><br><span class="subtiel klein">nu in kalenderweek ${k} (${esc(weekBereik(k))})</span></span>
      <span>${isHerstel(w) ? '<span class="label herstel">Herstel</span>' : ''}${w === 21 ? '<span class="label waarsch">Simulatie</span>' : ''}</span>
    </button>`;
  }).join('');
  html += `<button class="keuze" disabled><span><b>Week 23 en 24</b><br><span class="subtiel klein">Afbouw — kunnen niet vervallen</span></span><span>🔒</span></button>`;
  openSheet('Week herhalen', html);
}

function openHerhaalVoorbeeld(cal, inhoudX, vervalt) {
  const nieuw = nieuweToewijzing(cal, inhoudX, vervalt);
  let waarsch = '';
  if (isHerstel(vervalt)) waarsch += `<div class="notitie waarsch">⚠️ Week ${vervalt} is een herstelweek. Herstelweken geven je lichaam de kans om bij te komen. Weet je zeker dat je die wilt laten vervallen?</div>`;
  if (vervalt === 21) waarsch += `<div class="notitie waarsch">⚠️ Week 21 is de volledige simulatie met je partner (13 maart). Weet je zeker dat je die wilt laten vervallen?</div>`;
  let rijen = '';
  for (let c = cal + 1; c <= AANTAL_WEKEN; c++) {
    const oud = S.toewijzing[c - 1], nw = nieuw[c - 1];
    rijen += `<tr><td>Kalenderweek ${c}<br><span class="subtiel klein">${esc(weekBereik(c))}</span></td>
      <td class="${oud !== nw ? 'anders' : ''}">${oud !== nw ? `week ${oud} → <b>week ${nw}</b>` : `week ${nw}`}</td></tr>`;
  }
  openSheet('Wat verandert er?', `
    ${waarsch}
    <p>Kalenderweek ${cal + 1} krijgt de inhoud van <b>week ${inhoudX}</b>. <span class="vervalt">Week ${vervalt}</span> vervalt.</p>
    <table class="verschil">${rijen}</table>
    <div class="knoppen mt">
      <button class="knop" data-actie="herhaal" data-cal="${cal}" data-x="${inhoudX}">Terug</button>
      <button class="knop primair" data-actie="herhaal-bevestig" data-cal="${cal}" data-x="${inhoudX}" data-v="${vervalt}">Bevestigen</button>
    </div>`);
}

function herhaalBevestig(cal, inhoudX, vervalt) {
  S.historie.push({ toewijzing: S.toewijzing.slice(), wanneer: Date.now(), wat: `Week ${inhoudX} herhaald in kalenderweek ${cal + 1}, week ${vervalt} vervallen` });
  S.toewijzing = nieuweToewijzing(cal, inhoudX, vervalt);
  bewaar();
  sluitSheet();
  ui.tab = 'week';
  ui.week = cal + 1;
  render();
  toast(`Week ${inhoudX} staat nu ook in kalenderweek ${cal + 1}`);
}

function ongedaan() {
  const vorige = S.historie.pop();
  if (!vorige) return;
  S.toewijzing = vorige.toewijzing;
  bewaar();
  render();
  toast('Laatste aanpassing ongedaan gemaakt');
}

/* ---------- Week ziek/gemist ---------- */
function laatsteGoedeWeek(cal) {
  for (let c = cal - 1; c >= 1; c--) {
    const runs = trainingenVanWeek(c).filter(isLoop);
    if (runs.some(t => statusVan(t) === 'gedaan') && !runs.some(t => statusVan(t) === 'overgeslagen')) return inhoudVan(c);
  }
  return cal > 1 ? inhoudVan(cal - 1) : inhoudVan(cal);
}

function openZiek(cal) {
  openSheet('Week ziek/gemist', `
    <p>Alle trainingen van week ${cal} die nog niet gedaan zijn, worden op <b>overgeslagen</b> gezet.</p>
    <button class="knop primair groot breed" data-actie="ziek-bevestig" data-cal="${cal}">Week ${cal} op overgeslagen zetten</button>`);
}

function ziekBevestig(cal) {
  trainingenVanWeek(cal).forEach(t => {
    if (statusVan(t) !== 'gedaan') S.logs[t.key] = { status: 'overgeslagen', bijgewerkt: Date.now() };
  });
  bewaar();
  render();
  const goed = laatsteGoedeWeek(cal);
  openSheet('Week gemist', `
    <div class="notitie tip"><b>Week gemist of ziek geweest? Niet inhalen; begin weer bij de laatste week die goed ging.</b></div>
    <p class="mt">De laatste week die goed ging: <b>week ${goed}</b>.</p>
    <button class="knop primair groot breed" data-actie="herhaal" data-cal="${cal}" data-x="${goed}">🔁 Week ${goed} herhalen</button>
    <button class="knop breed mt" data-actie="sluit">Nee, verder met het schema</button>`);
}

/* ---------- Scherm: Voortgang ---------- */
function verzamelLoopLogs() {
  const uit = [];
  for (let c = 1; c <= AANTAL_WEKEN; c++) {
    trainingenVanWeek(c).forEach(t => {
      const l = S.logs[t.key];
      if (isLoop(t) && l && l.status === 'gedaan') uit.push({ t, l, nr: weekDagNr(c, t.dag), x: (weekDagNr(c, t.dag) - START_NR) / 7 + 1 });
    });
  }
  return uit.sort((a, b) => a.nr - b.nr);
}

function leeg(tekst = 'Na een paar trainingen zie je hier je voortgang.') {
  return `<div class="leeg"><span class="groot">🌱</span>${esc(tekst)}</div>`;
}

function renderVoortgang() {
  const logs = verzamelLoopLogs();
  const vNr = vandaagNr();
  let html = '';

  // 7. Totalen
  const kmTotaal = logs.reduce((s, x) => s + (+x.l.km || 0), 0);
  let gepland = 0, gedaan = 0;
  for (let c = 1; c <= AANTAL_WEKEN; c++) {
    trainingenVanWeek(c).forEach(t => {
      if (weekDagNr(c, t.dag) <= vNr) { gepland++; if (statusVan(t) === 'gedaan') gedaan++; }
    });
  }
  html += `
    <div class="kaart">
      <h2>Totalen</h2>
      <div class="stats">
        <div class="stat"><b>${fmtKm(kmTotaal)}</b><span>km gelopen</span></div>
        <div class="stat"><b>${gedaan}/${gepland}</b><span>trainingen (${gepland ? Math.round(gedaan / gepland * 100) : 0}%)</span></div>
        <div class="stat"><b>${reeksWeken()}</b><span>weken op rij alle runs</span></div>
      </div>
    </div>`;

  // 9. Startpunt
  html += startpuntHTML(logs);

  if (logs.length < 2) {
    html += `<div class="kaart">${leeg()}</div>`;
    return html;
  }
  if (typeof Chart === 'undefined') {
    html += `<div class="kaart notitie waarsch">De grafieken konden niet laden. Open de app één keer met internet, daarna werken ze ook offline.</div>`;
  }

  html += `
    <div class="kaart"><h2>Km per week</h2><div class="subtiel klein">Gepland en gelopen. Herstelweken hebben een andere kleur.</div><div class="grafiek"><canvas id="gKm"></canvas></div></div>
    <div class="kaart"><h2>Tempo per soort loop</h2><div class="subtiel klein">Hoger = sneller. De stippellijn is je racetempo 5:00.</div><div class="grafiek hoog"><canvas id="gTempo"></canvas></div></div>
    <div class="kaart"><h2>Doeltempo gehaald</h2><div class="subtiel klein">Per week, kwaliteitstrainingen (ja = 100%, deels = 50%).</div>
      ${logs.some(x => x.t.type === 'kwaliteit' && x.l.doel) ? '<div class="grafiek"><canvas id="gDoel"></canvas></div>' : leeg('Vul bij een kwaliteitstraining in of je het doeltempo haalde.')}
      <h3>Doeltempo's in je schema</h3>${doelReeksHTML()}
    </div>
    <div class="kaart"><h2>Hetzelfde tempo, minder moeite</h2>
      ${logs.filter(x => tempoCat(x.t) === 'rustig' && x.l.gevoel).length >= 2 ? `<div class="grafiek"><canvas id="gGevoel"></canvas></div>${gevoelVergelijking(logs)}` : leeg('Vul bij rustige loopjes je gevoelscijfer en tempo in.')}
      <p class="subtiel klein">Daalt je gevoelscijfer bij hetzelfde of een sneller tempo, dan wordt je conditie beter.</p>
    </div>
    <div class="kaart"><h2>Simulaties vergelijken</h2>${simulatieVergelijking(logs)}</div>
    <div class="kaart"><h2>Records</h2>${recordsHTML(logs)}</div>
    <div class="kaart"><h2>Knietijdlijn</h2>
      <div class="knie-stippen">${logs.map(x => `<span class="knie-stip ${x.l.knie || 'geen'}" title="${esc(fmtDatum(x.nr, true))}: ${esc(x.t.titel)}"></span>`).join('')}</div>
      <p class="subtiel klein mt">🟢 geen klachten · 🟡 voelbaar · 🔴 pijn · grijs = niet ingevuld. Eén stip per loop, oud → nieuw.</p>
    </div>`;
  return html;
}

function reeksWeken() {
  const p = positie();
  if (p.fase === 'voor') return 0;
  let reeks = 0;
  for (let c = p.week; c >= 1; c--) {
    const runs = trainingenVanWeek(c).filter(isLoop);
    const alles = runs.length && runs.every(t => statusVan(t) === 'gedaan');
    if (alles) reeks++;
    else if (c === p.week && p.fase === 'loopt') continue; // lopende week telt nog niet mee
    else break;
  }
  return reeks;
}

function startpuntHTML(logs) {
  const rustig = logs.filter(x => tempoCat(x.t) === 'rustig' && x.l.tempo).slice(-3);
  const nuRustig = gemiddelde(rustig.map(x => x.l.tempo));
  const start = parseTempo(STARTPUNT.rustigTempo);
  const doorlopen = logs.filter(x => tempoCat(x.t) === 'rustig' && x.l.tempo && x.l.km >= 5);
  const best5 = doorlopen.length ? Math.min(...doorlopen.map(x => x.l.tempo)) : null;
  const verschil = (nu, ref) => {
    const d = Math.round(nu - ref);
    return d < 0 ? `<span class="sneller">${-d} sec sneller</span>` : d > 0 ? `<span class="trager">${d} sec langzamer</span>` : 'gelijk';
  };
  return `
    <div class="kaart">
      <h2>Startpunt</h2>
      <div class="subtiel klein">Eind 2025: rustig ${STARTPUNT.rustigTempo}, 5 km doorlopen op ${STARTPUNT.vijfKmTempo} (beste tijd ${STARTPUNT.vijfKmBest}). Doel race: 5:00 per km.</div>
      <div class="vergelijk mt"><span>Rustig tempo<br><span class="subtiel klein">gem. laatste ${rustig.length || 3} rustige loopjes</span></span>
        <span style="text-align:right"><b>${nuRustig ? fmtTempo(nuRustig) : '–'}</b><br><span class="klein">${nuRustig ? verschil(nuRustig, start) : 'start ' + STARTPUNT.rustigTempo}</span></span></div>
      <div class="vergelijk"><span>Snelste doorlopen loop ≥ 5 km<br><span class="subtiel klein">rustig of lang</span></span>
        <span style="text-align:right"><b>${best5 ? fmtTempo(best5) : '–'}</b><br><span class="klein">${best5 ? verschil(best5, parseTempo(STARTPUNT.vijfKmTempo)) + ' dan 5:38' : 'start ' + STARTPUNT.vijfKmTempo}</span></span></div>
    </div>`;
}

function doelReeksHTML() {
  const reeksen = { 'lang-interval': [], kort: [], tempo: [], compromised: [] };
  const namen = { 'lang-interval': 'Intervallen 1–2 km', kort: 'Intervallen 200–400 m', tempo: 'Tempoloop', compromised: 'Compromised / simulatie' };
  for (let c = 1; c <= AANTAL_WEKEN; c++) {
    trainingenVanWeek(c).forEach(t => {
      if (!t.doeltempo) return;
      const k = t.type === 'kwaliteit' ? (t.soort || 'kort') : (['compromised', 'simulatie'].includes(t.type) ? 'compromised' : null);
      if (k) reeksen[k].push(`<span class="chip">wk ${c}: ${esc(t.doeltempo)}</span>`);
    });
  }
  return Object.entries(reeksen).filter(([, r]) => r.length)
    .map(([k, r]) => `<div class="doelreeks"><b>${namen[k]}</b>${r.join(' → ')}</div>`).join('');
}

function gevoelVergelijking(logs) {
  const r = logs.filter(x => tempoCat(x.t) === 'rustig' && x.l.gevoel && x.l.tempo);
  if (r.length < 4) return '';
  const n = Math.min(3, Math.floor(r.length / 2));
  const eerst = r.slice(0, n), laatst = r.slice(-n);
  const regel = (lijst, naam) => `<div class="vergelijk"><span>${naam}</span><b>${fmtTempo(gemiddelde(lijst.map(x => x.l.tempo)))}/km · gevoel ${fmtKm(gemiddelde(lijst.map(x => x.l.gevoel)))}</b></div>`;
  return `<div class="mt">${regel(eerst, `Eerste ${n} rustige loopjes`)}${regel(laatst, `Laatste ${n} rustige loopjes`)}</div>`;
}

function simulatieGegevens(logs) {
  return logs.filter(x => (x.t.type === 'simulatie' || x.t.type === 'race') && x.l.sim).map(x => {
    const sim = x.l.sim;
    const start = stationStart(sim);
    const naam = x.t.type === 'race' ? 'Race' : (x.t.simulatie === 'half' ? `Halve simulatie (wk ${x.t.cal})` : `Volledige simulatie (wk ${x.t.cal})`);
    const punten = Array(8).fill(null);
    sim.rondes.forEach((r, i) => { if (r && r.loop) punten[start + i] = r.loop; });
    return { naam, punten, totaal: simTotaal(sim), gem: simGemTempo(sim), type: x.t.type, half: x.t.simulatie === 'half' };
  });
}

function simulatieVergelijking(logs) {
  const sims = simulatieGegevens(logs);
  if (!sims.length) return leeg('Vul bij de halve simulatie (week 19), de volledige simulatie (week 21) en de race je tijden per ronde in.');
  return `<div class="grafiek"><canvas id="gSim"></canvas></div>
    ${sims.map(s => `<div class="vergelijk"><span>${esc(s.naam)}</span><b>${s.totaal ? fmtTijd(s.totaal) : '–'} · ${s.gem ? fmtTempo(s.gem) + '/km' : '–'}</b></div>`).join('')}`;
}

function recordsHTML(logs) {
  let html = '';
  Object.entries(TEMPO_CATS).forEach(([k, c]) => {
    const r = logs.filter(x => tempoCat(x.t) === k && x.l.tempo);
    if (!r.length) return;
    const best = r.reduce((a, b) => (b.l.tempo < a.l.tempo ? b : a));
    html += `<div class="vergelijk"><span>Snelste ${esc(c.naam.toLowerCase())}<br><span class="subtiel klein">${esc(fmtDatum(best.nr, true))} · ${fmtKm(best.l.km)} km</span></span><b>${fmtTempo(best.l.tempo)}/km</b></div>`;
  });
  const metKm = logs.filter(x => x.l.km);
  if (metKm.length) {
    const lang = metKm.reduce((a, b) => (b.l.km > a.l.km ? b : a));
    html += `<div class="vergelijk"><span>Langste loop<br><span class="subtiel klein">${esc(fmtDatum(lang.nr, true))} · ${esc(lang.t.titel)}</span></span><b>${fmtKm(lang.l.km)} km</b></div>`;
  }
  return html || leeg('Vul afstand en tempo in om records te zien.');
}

function cssVar(naam) { return getComputedStyle(document.documentElement).getPropertyValue(naam).trim(); }

function tekenGrafieken() {
  if (typeof Chart === 'undefined') return;
  const logs = verzamelLoopLogs();
  if (logs.length < 2) return;
  Chart.defaults.color = cssVar('--tekst-2');
  Chart.defaults.borderColor = cssVar('--rand');
  Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, sans-serif';
  const basis = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { labels: { boxWidth: 12, usePointStyle: true } } } };
  const tempoAs = { reverse: true, ticks: { callback: v => fmtTempo(v) }, title: { display: true, text: 'min/km' } };

  // 1. Km per week
  const weken = Array.from({ length: AANTAL_WEKEN }, (_, i) => i + 1);
  const lijsten = weken.map(c => trainingenVanWeek(c));
  const herstel = weken.map(c => isHerstel(inhoudVan(c)));
  const el1 = document.getElementById('gKm');
  if (el1) grafieken.push(new Chart(el1, {
    type: 'bar',
    data: {
      labels: weken.map((c, i) => herstel[i] ? `${c}H` : `${c}`),
      datasets: [
        { label: 'Gepland', data: lijsten.map(weekGepland), backgroundColor: herstel.map(h => h ? cssVar('--c-herstel') : cssVar('--rand')) },
        { label: 'Gelopen', data: lijsten.map(weekGelopen), backgroundColor: cssVar('--accent') }
      ]
    },
    options: { ...basis, scales: { y: { beginAtZero: true, title: { display: true, text: 'km' } }, x: { title: { display: true, text: 'week (H = herstelweek)' } } } }
  }));

  // 2. Tempo per soort loop
  const el2 = document.getElementById('gTempo');
  if (el2) {
    const sets = Object.entries(TEMPO_CATS).map(([k, c]) => ({
      label: c.naam, borderColor: cssVar(c.kleur), backgroundColor: cssVar(c.kleur), tension: .25, pointRadius: 4,
      data: logs.filter(x => tempoCat(x.t) === k && x.l.tempo).map(x => ({ x: x.x, y: x.l.tempo, titel: x.t.titel, nr: x.nr }))
    })).filter(d => d.data.length);
    sets.push({ label: 'Racetempo 5:00', data: [{ x: 1, y: RACETEMPO }, { x: 25, y: RACETEMPO }], borderColor: cssVar('--tekst'), borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 });
    grafieken.push(new Chart(el2, {
      type: 'line', data: { datasets: sets },
      options: {
        ...basis,
        scales: { x: { type: 'linear', min: 1, max: 25, ticks: { stepSize: 2, callback: v => 'wk ' + v } }, y: tempoAs },
        plugins: { ...basis.plugins, tooltip: { callbacks: { label: c => `${c.raw.titel || c.dataset.label}: ${fmtTempo(c.raw.y)}/km`, title: c => c[0].raw.nr ? fmtDatum(c[0].raw.nr, true) : '' } } }
      }
    }));
  }

  // 3. Doeltempo gehaald
  const el3 = document.getElementById('gDoel');
  if (el3) {
    const score = { ja: 100, deels: 50, nee: 0 };
    const perWeek = weken.map(c => gemiddelde(logs.filter(x => x.t.cal === c && x.t.type === 'kwaliteit' && x.l.doel).map(x => score[x.l.doel])));
    grafieken.push(new Chart(el3, {
      type: 'bar',
      data: { labels: weken.map(String), datasets: [{ label: '% doeltempo gehaald', data: perWeek, backgroundColor: cssVar('--c-kwaliteit') }] },
      options: { ...basis, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }, x: { title: { display: true, text: 'week' } } } }
    }));
  }

  // 4. Gevoel bij rustige loopjes
  const el4 = document.getElementById('gGevoel');
  if (el4) {
    const r = logs.filter(x => tempoCat(x.t) === 'rustig' && x.l.gevoel);
    grafieken.push(new Chart(el4, {
      type: 'line',
      data: {
        datasets: [
          { label: 'Gevoel (1–10)', yAxisID: 'y', data: r.map(x => ({ x: x.x, y: x.l.gevoel })), borderColor: cssVar('--c-les'), backgroundColor: cssVar('--c-les'), tension: .25 },
          { label: 'Tempo', yAxisID: 'y2', data: r.filter(x => x.l.tempo).map(x => ({ x: x.x, y: x.l.tempo })), borderColor: cssVar('--c-rustig'), backgroundColor: cssVar('--c-rustig'), tension: .25 }
        ]
      },
      options: {
        ...basis,
        scales: {
          x: { type: 'linear', min: 1, max: 25, ticks: { stepSize: 2, callback: v => 'wk ' + v } },
          y: { min: 1, max: 10, position: 'left', title: { display: true, text: 'gevoel' } },
          y2: { ...tempoAs, position: 'right', grid: { drawOnChartArea: false } }
        },
        plugins: { ...basis.plugins, tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y2' ? `Tempo ${fmtTempo(c.raw.y)}/km` : `Gevoel ${c.raw.y}` } } }
      }
    }));
  }

  // 5. Simulaties
  const el5 = document.getElementById('gSim');
  if (el5) {
    const kleuren = [cssVar('--c-compromised'), cssVar('--c-kwaliteit'), cssVar('--accent'), cssVar('--c-rustig')];
    grafieken.push(new Chart(el5, {
      type: 'line',
      data: {
        labels: HYROX_STATIONS.map((s, i) => `${i + 1}`),
        datasets: simulatieGegevens(logs).map((s, i) => ({ label: s.naam, data: s.punten, borderColor: kleuren[i % 4], backgroundColor: kleuren[i % 4], pointRadius: 5, spanGaps: false }))
          .concat([{ label: 'Racetempo 5:00', data: Array(8).fill(RACETEMPO), borderColor: cssVar('--tekst'), borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 }])
      },
      options: {
        ...basis,
        scales: { y: tempoAs, x: { title: { display: true, text: 'ronde (1 km vóór station)' } } },
        plugins: { ...basis.plugins, tooltip: { callbacks: { title: c => `Ronde ${c[0].dataIndex + 1} · ${HYROX_STATIONS[c[0].dataIndex]}`, label: c => `${c.dataset.label}: ${fmtTempo(c.raw)}/km` } } }
      }
    }));
  }
}

/* ---------- Scherm: Instellingen ---------- */
function renderInstellingen() {
  const dagen = S.laatsteBackup ? Math.floor((Date.now() - S.laatsteBackup) / 86400000) : null;
  return `
    <div class="kaart">
      <h2>💾 Backup</h2>
      <p>Je gegevens staan <b>alleen op deze telefoon</b>. Wis je Safari-gegevens, verwijder je de app of raak je je telefoon kwijt, dan ben je alles kwijt. Maak daarom regelmatig een backup en bewaar die in iCloud Drive (Bestanden-app) of mail hem naar jezelf.</p>
      <p class="${dagen === null || dagen > 14 ? 'trager' : 'subtiel'}">${dagen === null ? 'Nog nooit een backup gemaakt.' : dagen === 0 ? 'Laatste backup: vandaag.' : `Laatste backup: ${dagen} ${dagen === 1 ? 'dag' : 'dagen'} geleden.`}</p>
      <button class="knop primair groot breed" data-actie="export">Backup exporteren</button>
      <button class="knop breed mt" data-actie="import">Backup importeren</button>
      <input type="file" id="importBestand" accept=".json,application/json" hidden>
    </div>
    <div class="kaart">
      <h2>Schema</h2>
      <button class="knop breed" data-actie="uitgangspunten">📋 Uitgangspunten & regels</button>
      <button class="knop breed mt" data-actie="zones">🎯 Tempo-zones</button>
    </div>
    <div class="kaart">
      <h2>Alles resetten</h2>
      <p class="subtiel">Wist alle ingevulde trainingen en aanpassingen. Maak eerst een backup.</p>
      <button class="knop gevaar breed" data-actie="reset-1">Alles resetten</button>
    </div>
    ${S.testDatum || ui.testKlikken >= 5 ? `
    <div class="kaart">
      <h2>🧪 Testdatum</h2>
      <p class="subtiel">Doe alsof het een andere dag is, om de app te testen. Vergeet niet terug te zetten.</p>
      <div class="veld"><input type="date" id="testDatum" value="${esc(S.testDatum || isoVanNr(vandaagNr()))}"></div>
      <div class="knoppen">
        <button class="knop primair" data-actie="test-zet">Gebruik testdatum</button>
        <button class="knop" data-actie="test-uit">Echte datum</button>
      </div>
    </div>` : ''}
    <p class="subtiel klein" style="text-align:center" data-actie="versie">Hyrox-app versie ${APP_VERSIE} · gegevensformaat v${DATA_VERSIE}</p>`;
}

async function exporteer() {
  const data = kloon(S);
  delete data.testDatum;
  const nu = new Date();
  const json = JSON.stringify({ app: 'hyrox-rotterdam', versie: DATA_VERSIE, geexporteerd: nu.toISOString(), data }, null, 2);
  const naam = `hyrox-backup-${isoVanNr(dagNr(nu))}.json`;
  const klaar = () => { S.laatsteBackup = Date.now(); bewaar(); render(); toast('Backup gemaakt ✅'); };
  try {
    const bestand = new File([json], naam, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [bestand] })) {
      await navigator.share({ files: [bestand], title: 'Hyrox backup' });
      klaar();
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // gebruiker annuleerde
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = naam;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  klaar();
}

function importeer(bestand) {
  const lezer = new FileReader();
  lezer.onload = () => {
    try {
      const obj = JSON.parse(lezer.result);
      const data = obj && obj.data;
      if (!obj || obj.app !== 'hyrox-rotterdam' || !data || !Array.isArray(data.toewijzing)) throw new Error('onbekend');
      ui.importData = data;
      const aantal = Object.keys(data.logs || {}).length;
      openSheet('Backup importeren', `
        <p>Backup van <b>${esc(new Date(obj.geexporteerd).toLocaleDateString('nl-NL'))}</b> met ${aantal} ingevulde trainingen.</p>
        <div class="notitie waarsch">Dit vervangt alle gegevens die nu in de app staan.</div>
        <button class="knop primair groot breed mt" data-actie="import-bevestig">Importeren</button>`);
    } catch (e) {
      toast('Dit is geen geldig Hyrox-backupbestand');
    }
  };
  lezer.readAsText(bestand);
}

/* ---------- Acties (alle knoppen) ---------- */
const ACTIES = {
  tab: el => gaNaar(el.dataset.tab),
  detail: el => {
    const t = vindTraining(el.dataset.key);
    if (t) openSheet(TYPE_NAAM[t.type], trainingKaart(t, { beheer: true, datum: true, zonderKaart: true }));
  },
  afvinken: el => openAfvinken(el.dataset.key),
  begrip: el => {
    const tekst = BEGRIPPEN[el.dataset.k];
    if (!tekst) return;
    if (!$('#sheetLaag').hidden) { toast(tekst); return; } // sheet al open: korte melding
    openSheet(el.dataset.k[0].toUpperCase() + el.dataset.k.slice(1), `<p>${esc(tekst)}</p><button class="knop breed" data-actie="zones">🎯 Alle tempo-zones</button>`);
  },
  sluit: () => sluitSheet(),
  'f-kies': el => formKies(el),
  'f-sim-set': el => {
    formulier.f.sim.set = el.dataset.w;
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('aan', b === el));
    $('#simRondes').innerHTML = simRondesHTML(formulier.f.sim);
    document.querySelectorAll('.sim-in').forEach(i => i.addEventListener('input', simBijwerken));
  },
  'f-opslaan': () => {
    if (!formOpslaan()) return;
    sluitSheet();
    render();
    toast(formulier.f.status === 'gedaan' ? 'Opgeslagen ✅' : formulier.f.status === 'overgeslagen' ? 'Overgeslagen ⏭️' : 'Teruggezet naar nog te doen');
  },
  'f-knie-herhaal': () => {
    if (!formOpslaan()) return;
    render();
    openHerhaal(formulier.t.cal);
  },
  'week-nav': el => { ui.week = Math.min(AANTAL_WEKEN, Math.max(1, ui.week + +el.dataset.d)); render(); },
  'naar-week': el => gaNaar('week', +el.dataset.cal),
  'kies-training': el => openKiesTraining(el.dataset.doel),
  'verplaats-kies-dag': el => openVerplaats(el.dataset.key),
  'verplaats-naar': el => verplaatsNaar(el.dataset.key, +el.dataset.dag, !!el.dataset.bevestigd),
  bewerk: el => openBewerk(el.dataset.key),
  'bewerk-opslaan': el => bewerkOpslaan(el.dataset.key, !!el.dataset.bevestigd),
  'herstel-origineel': el => herstelOrigineel(el.dataset.key),
  'extra-nieuw': el => openExtra(+el.dataset.cal),
  'extra-opslaan': el => extraOpslaan(+el.dataset.cal, !!el.dataset.bevestigd),
  'extra-verwijder': el => extraVerwijder(el.dataset.key),
  herhaal: el => openHerhaal(+el.dataset.cal, el.dataset.x ? +el.dataset.x : null),
  'herhaal-kies': el => openHerhaalVoorbeeld(+el.dataset.cal, +el.dataset.x, +el.dataset.v),
  'herhaal-bevestig': el => herhaalBevestig(+el.dataset.cal, +el.dataset.x, +el.dataset.v),
  ongedaan: () => ongedaan(),
  ziek: el => openZiek(+el.dataset.cal),
  'ziek-bevestig': el => ziekBevestig(+el.dataset.cal),
  uitgangspunten: () => openSheet('Uitgangspunten & regels', uitgangspuntenHTML()),
  zones: () => openSheet('Tempo-zones', zonesHTML()),
  export: () => exporteer(),
  import: () => $('#importBestand').click(),
  'import-bevestig': () => {
    S = migreer(ui.importData);
    S.laatsteBackup = Date.now();
    bewaar();
    sluitSheet();
    ui.week = null;
    render();
    toast('Backup teruggezet ✅');
  },
  'reset-1': () => openSheet('Alles resetten?', `
    <p>Alle ingevulde trainingen, aanpassingen en herhaalde weken worden gewist. Het originele schema blijft.</p>
    <button class="knop gevaar groot breed" data-actie="reset-2">Ja, ik wil resetten</button>
    <button class="knop breed mt" data-actie="sluit">Annuleren</button>`),
  'reset-2': () => openSheet('Echt alles wissen?', `
    <div class="notitie waarsch"><b>Laatste waarschuwing.</b> Dit kun je niet ongedaan maken${S.laatsteBackup ? '' : ', en je hebt nog geen backup gemaakt'}.</div>
    <button class="knop gevaar groot breed mt" data-actie="reset-3">Alles definitief wissen</button>
    <button class="knop breed mt" data-actie="sluit">Annuleren</button>`),
  'reset-3': () => {
    S = legeStaat();
    bewaar();
    sluitSheet();
    ui.week = null;
    gaNaar('vandaag');
    toast('Alles is gereset');
  },
  versie: () => { ui.testKlikken++; if (ui.testKlikken === 5) { render(); toast('Testoptie zichtbaar'); } },
  'test-zet': () => {
    const v = $('#testDatum').value;
    if (!v) return;
    S.testDatum = v;
    bewaar();
    ui.week = null;
    render();
    toast('Testdatum: ' + fmtDatum(vandaagNr(), true));
  },
  'test-uit': () => { S.testDatum = null; ui.testKlikken = 0; bewaar(); ui.week = null; render(); toast('Echte datum'); }
};

document.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) { ui.week = ui.tab === 'week' && tab.dataset.tab === 'week' ? null : ui.week; gaNaar(tab.dataset.tab); return; }
  const el = e.target.closest('[data-actie]');
  if (!el || el.disabled) return;
  const actie = ACTIES[el.dataset.actie];
  if (actie) { e.preventDefault(); actie(el); }
});

document.addEventListener('change', e => {
  if (e.target.id === 'importBestand' && e.target.files[0]) {
    importeer(e.target.files[0]);
    e.target.value = '';
  }
});

$('#sheetSluit').addEventListener('click', sluitSheet);
$('#sheetLaag').addEventListener('click', e => { if (e.target.id === 'sheetLaag') sluitSheet(); });

// Bij terugkomen in de app (bijv. de volgende ochtend) de datum opnieuw bepalen.
let laatsteDag = vandaagNr();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && vandaagNr() !== laatsteDag) {
    laatsteDag = vandaagNr();
    ui.week = null;
    if ($('#sheetLaag').hidden) render();
  }
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ui.tab === 'voortgang') render(); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
}

render();
