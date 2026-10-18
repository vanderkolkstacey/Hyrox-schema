/* ============================================================
   schema.js — de vaste basisdata van het trainingsschema.
   Deze data wordt NOOIT door de app aangepast. Alle wijzigingen
   (verplaatsen, bewerken, week herhalen) worden als aparte laag
   opgeslagen, zodat "herstel origineel" altijd mogelijk is.
   ============================================================ */

const SCHEMA_START = '2026-10-19';   // maandag week 1
const RACE_DATUM = '2027-04-03';     // zaterdag week 24
const AANTAL_WEKEN = 24;

const FASES = {
  1: { naam: 'Basis', periode: '19 okt – 13 dec', weken: [1, 8],
       uitleg: 'In deze fase went je lichaam aan 3 loopjes per week en komt je oude snelheid terug met korte, snelle stukken.' },
  2: { naam: 'Opbouw', periode: '14 dec – 7 feb', weken: [9, 16],
       uitleg: 'De intervallen worden langer en sneller, en vanaf week 9 leer je op donderdag lopen met vermoeide benen (compromised running). In week 9 en 10 is dat een lichte versie.' },
  3: { naam: 'Hyrox-specifiek', periode: '8 feb – 21 mrt', weken: [17, 22],
       uitleg: 'Nu train je op racetempo 5:00 en doe je simulaties met je partner, met de volledige simulatie op 13 maart.' },
  4: { naam: 'Fris naar de start', periode: '22 mrt – 3 apr', weken: [23, 24],
       uitleg: 'Minder kilometers, maar wel kort op racetempo, zodat je benen fris en scherp zijn.' }
};

const TIPS = {
  vakantie: 'Zet de loopband op 1% helling, dan lijkt het meer op buiten lopen. Lukt het maar 2x lopen, sla dan de donderdag over en houd de maandag en de lange loop. Kracht doe je met wat de sportschool daar heeft, benen 1x per week. Mis je een week, haal hem dan niet in maar ga verder met de week die je wel hebt gedaan.',
  herstel: 'Herstelweek: je loopt ongeveer 20% minder, zodat je lichaam kan bijkomen. Kracht iets lichter, Hyrox-les rustiger.',
  simulatie: 'Simulatie! Vul je tijden per ronde in het simulatielogboek in.'
};
const VAKANTIE_WEKEN = [9, 10, 11];
const SIMULATIE_WEKEN = [19, 21];

const HYROX_STATIONS = ['SkiErg', 'Sled Push', 'Sled Pull', 'Burpee Broad Jumps',
  'Roeien', 'Farmers Carry', 'Sandbag Lunges', 'Wall Balls'];

const KNIE_HEUP_OEFENINGEN = [
  'Glute bridge op één been — 2× 12–15 per been',
  'Zijwaartse plank — 2× 30 sec per kant',
  'Zijwaarts stappen met weerstandsband om je knieën — 2× 12–15 per kant',
  'Step-down van een traptrede, langzaam (knie recht boven je voet) — 2× 12–15 per been'
];

const TEMPO_ZONES = [
  { soort: 'Rustig', tempo: '5:50–6:20', gevoel: 'Je kunt in hele zinnen praten', zone: 'Zone 2', kleur: 'rustig' },
  { soort: 'Tempoloop', tempo: '5:40 → 5:15', gevoel: 'Comfortabel zwaar, korte zinnen', zone: 'Zone 3–4', kleur: 'kwaliteit' },
  { soort: 'Intervallen 1–2 km', tempo: '5:15 → 4:55', gevoel: 'Zwaar, praten lukt nauwelijks', zone: 'Zone 4', kleur: 'kwaliteit' },
  { soort: 'Intervallen 200–400 m', tempo: '5:10 → 4:45', gevoel: 'Snel maar ontspannen', zone: 'Zone 4–5', kleur: 'kwaliteit' },
  { soort: 'Racetempo Hyrox', tempo: '5:00', gevoel: 'Het tempo voor elke ronde op 3 april', zone: 'Zone 4', kleur: 'compromised' }
];

const TEMPO_NOTITIES = [
  'Inl / uitl = rustig inlopen en uitlopen in je rustige tempo.',
  'Een versnelling = 15 seconden vlot lopen aan het eind van je rustige loop, ontspannen en niet sprinten. Daarna 45 seconden wandelen.',
  'Compromised running = lopen met vermoeide benen, afgewisseld met een Hyrox-oefening.',
  'Te zwaar? Lukt een interval niet in het opgegeven tempo, loop dan 5 seconden per km langzamer. Liever alle herhalingen netjes dan de laatste niet afmaken.',
  'Gebruik geen standaardformule voor de hartslag. Kijk de eerste 3–4 weken vooral naar hoe het voelt.'
];

/* Korte uitleg bij begrippen: tik in de app op een onderstreept woord. */
const BEGRIPPEN = {
  'inlopen': 'Inlopen = rustig beginnen in je rustige tempo (5:50–6:20, zone 2), zodat je spieren en gewrichten warm worden.',
  'uitlopen': 'Uitlopen = rustig afsluiten in je rustige tempo (5:50–6:20, zone 2), zodat je lichaam kan afkoelen.',
  'versnellingen': 'Een versnelling = 15 seconden vlot lopen aan het eind van je rustige loop, ontspannen en niet sprinten. Daarna 45 seconden wandelen.',
  'compromised': 'Compromised running = lopen met vermoeide benen, afgewisseld met een Hyrox-oefening. Zo oefen je hoe de race voelt.',
  'wall balls': 'Wall balls = vanuit een diepe squat een medicijnbal tegen een doel op de muur gooien en weer vangen. Station 8 bij Hyrox.',
  'tempoloop': 'Tempoloop = een aaneengesloten stuk op "comfortabel zwaar" tempo: je kunt nog korte zinnen zeggen (zone 3–4).',
  'dribbelen': 'Dribbelen = heel rustig joggen tussen de snelle stukken door, zodat je herstelt maar wel in beweging blijft.',
  'lunges': 'Lunges = uitvalspassen: grote stap naar voren en door je achterste knie zakken. Bij Hyrox met een zandzak op je schouders.',
  'roeien': 'Roeien op de roeitrainer. Station 5 bij Hyrox (1000 m in de race).',
  'station': 'Een Hyrox-station is een van de 8 oefeningen tussen de looprondes: SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Roeien, Farmers Carry, Sandbag Lunges en Wall Balls.'
};

const UITGANGSPUNTEN = [
  'Nu: ongeveer 12 km per week, rustig tempo 5:50 min/km, 5 km doorlopen op 5:38 (beste tijd 5:25, eind 2025).',
  '10%-regel: je kilometers per week stijgen nooit meer dan 10% ten opzichte van je zwaarste week tot dan toe.',
  'Herstelweek: elke 4e week loop je ongeveer 20% minder.',
  'Plafond: vanaf half januari blijf je rond 25–26 km per week.',
  'Langste loop: maximaal 11 km.',
  'De kilometers die je in de Hyrox-les loopt tellen niet mee in het schema.',
  'Dagen schuiven mag, maar: nooit twee zware looptrainingen op opeenvolgende dagen, en geen intervallen de dag na zware beentraining. Donderdag volgt op de Hyrox-les: waren je benen woensdag erg zwaar belast, loop het compromised-deel dan rustiger of maak er een rustige loop van.',
  'Kracht: benen zwaar 1x per week (dinsdag), in week 23 licht, in week 24 geen. Bovenlichaam 2x per week (vrijdag, en maandag na het lopen of zaterdag na de lange loop). In herstelweken minder gewicht of minder sets.',
  'Knie- en heupoefeningen (2–3x per week, ±10 min, 2× 12–15 herhalingen): glute bridge op één been, zijwaartse plank (2× 30 sec per kant), zijwaarts stappen met een weerstandsband om je knieën, langzaam afstappen van een traptrede (step-down, knie recht boven je voet).',
  'In herstelweken en in week 21 doe je de Hyrox-les rustiger aan.'
];

const KNIE_REGEL = 'Voel je je knie tijdens of na het lopen, of de ochtend erna? Herhaal dan die week, of ga een week terug. Houdt de pijn langer dan 2 dagen aan? Ga dan eerst langs een fysiotherapeut.';

const STARTPUNT = { rustigTempo: '5:50', vijfKmTempo: '5:38', vijfKmBest: '5:25', kmPerWeek: 12 };

/* Looptrainingen per week (sectie 8.2 van het schema). */
const SCHEMA_WEKEN = [
  {"week": 1, "start": "2026-10-19", "fase": 1, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "kort", "km": 4, "doeltempo": "5:10", "titel": "6× 200 m op 5:10", "stappen": ["1,5 km inlopen rustig", "6× 200 m op 5:10 min/km, tussendoor 200 m wandelen", "1 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig", "stappen": ["3 km rustig (5:50–6:20)"]},
    {"dag": "za", "type": "lang", "km": 5, "titel": "5 km lang rustig", "stappen": ["5 km rustig (5:50–6:20)"]}]},
  {"week": 2, "start": "2026-10-26", "fase": 1, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "kort", "km": 4.5, "doeltempo": "5:05", "titel": "8× 200 m op 5:05", "stappen": ["1,5 km inlopen rustig", "8× 200 m op 5:05 min/km, tussendoor 200 m wandelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig", "stappen": ["3 km rustig (5:50–6:20)"]},
    {"dag": "za", "type": "lang", "km": 5.5, "titel": "5,5 km lang rustig", "stappen": ["5,5 km rustig (5:50–6:20)"]}]},
  {"week": 3, "start": "2026-11-02", "fase": 1, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "kort", "km": 5, "doeltempo": "5:05", "titel": "6× 400 m op 5:05", "stappen": ["1,5 km inlopen rustig", "6× 400 m op 5:05 min/km, tussendoor 90 sec dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig + 4 versnellingen", "stappen": ["3 km rustig (5:50–6:20)", "4 versnellingen: 15 sec vlot, 45 sec wandelen"]},
    {"dag": "za", "type": "lang", "km": 6, "titel": "6 km lang rustig", "stappen": ["6 km rustig (5:50–6:20)"]}]},
  {"week": 4, "start": "2026-11-09", "fase": 1, "herstel": true,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "kort", "km": 4, "doeltempo": "5:05", "titel": "4× 400 m op 5:05", "stappen": ["1,5 km inlopen rustig", "4× 400 m op 5:05 min/km (pauze staat niet in het schema; bijvoorbeeld 90 sec dribbelen zoals week 3)", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 2, "titel": "2 km rustig", "stappen": ["2 km rustig (5:50–6:20)"]},
    {"dag": "za", "type": "lang", "km": 5, "titel": "5 km lang rustig", "stappen": ["5 km rustig (5:50–6:20)"]}]},
  {"week": 5, "start": "2026-11-16", "fase": 1, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "kort", "km": 5.5, "doeltempo": "5:00", "titel": "8× 400 m op 5:00", "stappen": ["1,5 km inlopen rustig", "8× 400 m op 5:00 min/km, tussendoor 90 sec dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig + 4 versnellingen", "stappen": ["3 km rustig (5:50–6:20)", "4 versnellingen: 15 sec vlot, 45 sec wandelen"]},
    {"dag": "za", "type": "lang", "km": 6.5, "titel": "6,5 km lang rustig", "stappen": ["6,5 km rustig (5:50–6:20)"]}]},
  {"week": 6, "start": "2026-11-23", "fase": 1, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 6.5, "doeltempo": "5:15", "titel": "3× 1 km op 5:15", "stappen": ["2 km inlopen rustig", "3× 1 km op 5:15 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig + 4 versnellingen", "stappen": ["3 km rustig (5:50–6:20)", "4 versnellingen: 15 sec vlot, 45 sec wandelen"]},
    {"dag": "za", "type": "lang", "km": 7, "titel": "7 km lang rustig", "stappen": ["7 km rustig (5:50–6:20)"]}]},
  {"week": 7, "start": "2026-11-30", "fase": 1, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "tempo", "km": 7, "doeltempo": "5:40", "titel": "20 min tempo op 5:40", "stappen": ["2 km inlopen rustig", "20 min tempoloop op 5:40 min/km", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3.5, "titel": "3,5 km rustig + 4 versnellingen", "stappen": ["3,5 km rustig (5:50–6:20)", "4 versnellingen: 15 sec vlot, 45 sec wandelen"]},
    {"dag": "za", "type": "lang", "km": 7.5, "titel": "7,5 km lang rustig", "stappen": ["7,5 km rustig (5:50–6:20)"]}]},
  {"week": 8, "start": "2026-12-07", "fase": 1, "herstel": true,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "kort", "km": 5, "doeltempo": "5:00", "titel": "6× 400 m op 5:00", "stappen": ["1,5 km inlopen rustig", "6× 400 m op 5:00 min/km (pauze staat niet in het schema; bijvoorbeeld 90 sec dribbelen)", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig", "stappen": ["3 km rustig (5:50–6:20)"]},
    {"dag": "za", "type": "lang", "km": 6, "titel": "6 km lang rustig", "stappen": ["6 km rustig (5:50–6:20)"]}]},
  {"week": 9, "start": "2026-12-14", "fase": 2, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 8, "doeltempo": "5:10", "titel": "4× 1 km op 5:10", "stappen": ["2 km inlopen rustig", "4× 1 km op 5:10 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 3.5, "doeltempo": "5:20", "titel": "2× (800 m + 15 wall balls)", "stappen": ["1 km inlopen rustig", "2× (800 m op 5:20 min/km + 15 wall balls)", "1 km uitlopen rustig"]},
    {"dag": "za", "type": "lang", "km": 8, "titel": "8 km lang rustig", "stappen": ["8 km rustig (5:50–6:20) — op za of zo, op vakantie op de loopband"]}]},
  {"week": 10, "start": "2026-12-21", "fase": 2, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "tempo", "km": 8, "doeltempo": "5:35", "titel": "25 min tempo op 5:35 (loopband)", "stappen": ["2 km inlopen rustig", "25 min tempoloop op 5:35 min/km", "1,5 km uitlopen rustig", "Loopband op 1% helling"]},
    {"dag": "do", "type": "compromised", "km": 4.5, "doeltempo": "5:20", "titel": "2× (1 km + 500 m roeien) (loopband)", "stappen": ["1,5 km inlopen rustig", "2× (1 km op 5:20 min/km + 500 m roeien; zonder roeitrainer 20 lunges)", "1 km uitlopen rustig", "Loopband op 1% helling"]},
    {"dag": "za", "type": "lang", "km": 8.5, "titel": "8,5 km lang rustig (loopband)", "stappen": ["8,5 km rustig (5:50–6:20), loopband op 1% helling"]}]},
  {"week": 11, "start": "2026-12-28", "fase": 2, "herstel": false,"runs":[
    {"dag": "di", "type": "kwaliteit", "soort": "kort", "km": 8, "doeltempo": "4:50", "titel": "10× 400 m op 4:50", "stappen": ["2 km inlopen rustig", "10× 400 m op 4:50 min/km, tussendoor 90 sec dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 5.5, "doeltempo": "5:15", "titel": "3× (1 km + 15 wall balls)", "stappen": ["1,5 km inlopen rustig", "3× (1 km op 5:15 min/km + 15 wall balls)", "1 km uitlopen rustig"]},
    {"dag": "za", "type": "lang", "km": 9, "titel": "9 km lang rustig", "stappen": ["9 km rustig (5:50–6:20)"]}]},
  {"week": 12, "start": "2027-01-04", "fase": 2, "herstel": true,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 6.5, "doeltempo": "5:10", "titel": "3× 1 km op 5:10", "stappen": ["2 km inlopen rustig", "3× 1 km op 5:10 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3.5, "titel": "3,5 km rustig", "stappen": ["3,5 km rustig (5:50–6:20)"]},
    {"dag": "za", "type": "lang", "km": 7, "titel": "7 km lang rustig", "stappen": ["7 km rustig (5:50–6:20)"]}]},
  {"week": 13, "start": "2027-01-11", "fase": 2, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 9, "doeltempo": "5:05", "titel": "5× 1 km op 5:05", "stappen": ["2 km inlopen rustig", "5× 1 km op 5:05 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 5.5, "doeltempo": "5:10", "titel": "4× (800 m + 20 wall balls)", "stappen": ["1,5 km inlopen rustig", "4× (800 m op 5:10 min/km + 20 wall balls)", "1 km uitlopen rustig"]},
    {"dag": "za", "type": "lang", "km": 9.5, "titel": "9,5 km lang rustig", "stappen": ["9,5 km rustig (5:50–6:20)"]}]},
  {"week": 14, "start": "2027-01-18", "fase": 2, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "tempo", "km": 9, "doeltempo": "5:25", "titel": "2× 15 min tempo op 5:25", "stappen": ["2 km inlopen rustig", "2× 15 min tempoloop op 5:25 min/km, tussendoor 3 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 6, "doeltempo": "5:10", "titel": "4× (1 km + 500 m roeien)", "stappen": ["1,5 km inlopen rustig", "4× (1 km op 5:10 min/km + 500 m roeien)", "0,5 km uitlopen rustig"]},
    {"dag": "za", "type": "lang", "km": 10, "titel": "10 km lang rustig", "stappen": ["10 km rustig (5:50–6:20)"]}]},
  {"week": 15, "start": "2027-01-25", "fase": 2, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "kort", "km": 9, "doeltempo": "4:45", "titel": "12× 400 m op 4:45", "stappen": ["2 km inlopen rustig", "12× 400 m op 4:45 min/km, tussendoor 90 sec dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 6, "doeltempo": "5:10", "titel": "4× (1 km + 20 lunges)", "stappen": ["1,5 km inlopen rustig", "4× (1 km op 5:10 min/km + 20 lunges)", "0,5 km uitlopen rustig"]},
    {"dag": "za", "type": "lang", "km": 10, "titel": "10 km lang rustig", "stappen": ["10 km rustig (5:50–6:20)"]}]},
  {"week": 16, "start": "2027-02-01", "fase": 2, "herstel": true,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 8, "doeltempo": "5:05", "titel": "4× 1 km op 5:05", "stappen": ["2 km inlopen rustig", "4× 1 km op 5:05 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 4, "titel": "4 km rustig", "stappen": ["4 km rustig (5:50–6:20)"]},
    {"dag": "za", "type": "lang", "km": 8, "titel": "8 km lang rustig", "stappen": ["8 km rustig (5:50–6:20)"]}]},
  {"week": 17, "start": "2027-02-08", "fase": 3, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 9, "doeltempo": "5:00", "titel": "5× 1 km op 5:00", "stappen": ["2 km inlopen rustig", "5× 1 km op 5:00 min/km, tussendoor 90 sec dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 5.5, "doeltempo": "5:05", "titel": "4× (1 km + wisselend station)", "stappen": ["1,5 km inlopen rustig", "4× (1 km op 5:05 min/km + wisselend Hyrox-station)"]},
    {"dag": "za", "type": "lang", "km": 10.5, "titel": "10,5 km lang rustig", "stappen": ["10,5 km rustig (5:50–6:20)"]}]},
  {"week": 18, "start": "2027-02-15", "fase": 3, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 10, "doeltempo": "5:10", "titel": "3× 2 km op 5:10", "stappen": ["2 km inlopen rustig", "3× 2 km op 5:10 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 5, "doeltempo": "5:00", "titel": "4× (1 km + wisselend station)", "stappen": ["1 km inlopen rustig", "4× (1 km op 5:00 min/km + wisselend Hyrox-station)"]},
    {"dag": "za", "type": "lang", "km": 11, "titel": "11 km lang rustig", "stappen": ["11 km rustig (5:50–6:20)"]}]},
  {"week": 19, "start": "2027-02-22", "fase": 3, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "tempo", "km": 8.5, "doeltempo": "5:15", "titel": "25 min tempo op 5:15", "stappen": ["2 km inlopen rustig", "25 min tempoloop op 5:15 min/km", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "simulatie", "simulatie": "half", "km": 6.5, "doeltempo": "5:00", "titel": "Halve simulatie", "stappen": ["4× (1 km op 5:00 min/km + station), stations 1–4 of 5–8"]},
    {"dag": "za", "type": "lang", "km": 11, "titel": "11 km lang rustig", "stappen": ["11 km rustig (5:50–6:20)"]}]},
  {"week": 20, "start": "2027-03-01", "fase": 3, "herstel": true,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 8, "doeltempo": "4:55–5:00", "titel": "4× 1 km op 4:55–5:00", "stappen": ["2 km inlopen rustig", "4× 1 km op 4:55–5:00 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 4, "titel": "4 km rustig", "stappen": ["4 km rustig (5:50–6:20)"]},
    {"dag": "za", "type": "lang", "km": 8, "titel": "8 km lang rustig", "stappen": ["8 km rustig (5:50–6:20)"]}]},
  {"week": 21, "start": "2027-03-08", "fase": 3, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 9, "doeltempo": "5:00", "titel": "5× 1 km op 5:00", "stappen": ["2 km inlopen rustig", "5× 1 km op 5:00 min/km, tussendoor 90 sec dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig + 4 versnellingen", "stappen": ["3 km rustig (5:50–6:20)", "4 versnellingen: 15 sec vlot, 45 sec wandelen"]},
    {"dag": "za", "type": "simulatie", "simulatie": "volledig", "km": 10, "doeltempo": "5:00", "titel": "Volledige simulatie met partner (13 maart)", "stappen": ["8× (1 km + station), alle 8 stations, samen met je partner"]}]},
  {"week": 22, "start": "2027-03-15", "fase": 3, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 8, "doeltempo": "5:00", "titel": "3× 1,5 km op 5:00", "stappen": ["2 km inlopen rustig", "3× 1,5 km op 5:00 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "compromised", "km": 6, "doeltempo": "5:00", "titel": "4× (1 km + station)", "stappen": ["1,5 km inlopen rustig", "4× (1 km op 5:00 min/km + Hyrox-station)", "0,5 km uitlopen rustig"]},
    {"dag": "za", "type": "lang", "km": 10, "titel": "10 km lang rustig", "stappen": ["10 km rustig (5:50–6:20)"]}]},
  {"week": 23, "start": "2027-03-22", "fase": 4, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 8, "doeltempo": "5:00", "titel": "4× 1 km op 5:00", "stappen": ["2 km inlopen rustig", "4× 1 km op 5:00 min/km, tussendoor 2 min dribbelen", "1,5 km uitlopen rustig"]},
    {"dag": "do", "type": "rustig", "km": 3, "titel": "3 km rustig + 4 versnellingen", "stappen": ["3 km rustig (5:50–6:20)", "4 versnellingen: 15 sec vlot, 45 sec wandelen"]},
    {"dag": "za", "type": "lang", "km": 7, "titel": "7 km rustig", "stappen": ["7 km rustig (5:50–6:20)"]}]},
  {"week": 24, "start": "2027-03-29", "fase": 4, "herstel": false,"runs":[
    {"dag": "ma", "type": "kwaliteit", "soort": "lang-interval", "km": 6, "doeltempo": "5:00", "titel": "3× 1 km op 5:00", "stappen": ["2 km inlopen rustig", "3× 1 km op 5:00 min/km, tussendoor 2 min dribbelen", "1 km uitlopen rustig"]},
    {"dag": "wo", "type": "rustig", "km": 3, "titel": "3 km rustig + 4 versnellingen", "stappen": ["3 km rustig (5:50–6:20)", "4 versnellingen: 15 sec vlot, 45 sec wandelen", "Geen Hyrox-les deze week"]},
    {"dag": "za", "type": "race", "km": 8, "doeltempo": "5:00", "titel": "🏁 RACE — Hyrox Duo Rotterdam", "stappen": ["8× (1 km op max 5:00 min/km + station)", "Succes!"]}]}
];
