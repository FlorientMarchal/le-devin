// Construit wikidata.js : des milliers de personnalités et de personnages de fiction tirés de Wikidata,
// avec leurs traits déduits des propriétés (genre, dates, pays, métiers, œuvres, univers…).
// Usage : node tools/build-wikidata.mjs   (depuis la racine du dépôt, Node 18+)

import fs from "node:fs";
import vm from "node:vm";

const ENDPOINT = "https://qlever.dev/api/wikidata";
const PREFIX = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
`;

// Seuils de notoriété (nombre d'articles Wikipédia dans toutes les langues)
const HUMAN_MIN = 45, HUMAN_FR_MIN = 25, HUMAN_RECENT_MIN = 30, FICTION_MIN = 7;

async function sparql(body) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await new Promise(r => setTimeout(r, 400));
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/sparql-results+json" },
      body: new URLSearchParams({ query: PREFIX + body })
    });
    if (res.ok) {
      try {
        const json = JSON.parse(await res.text());
        return json.results.bindings.map(b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
      } catch (e) {
        console.warn("  réponse illisible, nouvel essai…");
      }
    } else console.warn(`  requête refusée (${res.status}), nouvel essai…`);
    await new Promise(r => setTimeout(r, 3000 * attempt));
  }
  throw new Error("QLever ne répond pas");
}
const qid = uri => uri.split("/").pop();

const HUMANS = `{ SELECT DISTINCT ?p WHERE {
  ?p wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl .
  OPTIONAL { ?p wdt:P27 ?c } OPTIONAL { ?p wdt:P569 ?b }
  FILTER(?sl >= ${HUMAN_MIN} || (?c = wd:Q142 && ?sl >= ${HUMAN_FR_MIN}) || (YEAR(?b) >= 1975 && ?sl >= ${HUMAN_RECENT_MIN}))
} }`;
const FICTION = `{ SELECT DISTINCT ?p WHERE {
  ?p wdt:P31/wdt:P279* wd:Q95074 ; wikibase:sitelinks ?sl .
  FILTER(?sl >= ${FICTION_MIN})
  MINUS { ?p wdt:P31 wd:Q5 }
} }`;

/* ---------- Correspondances ---------- */
const OCCUPATIONS = {
  Q33999: "acteur film", Q10798782: "acteur ~serie", Q2526255: "realisateur film",
  Q639669: "musique", Q177220: "musique", Q36834: "musique", Q130857: "musique", Q2252262: "rap",
  Q2066131: "sport", Q937857: "foot", Q628099: "foot", Q3665646: "basket", Q10833314: "tennis",
  Q11338576: "combat", Q11607585: "combat", Q6665249: "combat", Q13474373: "combat", Q9017214: "combat",
  Q378622: "voiture", Q82955: "politique", Q30461: "politique", Q116: "royal politique", Q39018: "royal politique",
  Q901: "science", Q205375: "science", Q81096: "science", Q82594: "science", Q11631: "espace science",
  Q1028181: "art", Q1281618: "art", Q36180: "ecrivain art", Q49757: "ecrivain art", Q214917: "ecrivain art",
  Q245068: "humour", Q18545066: "humour", Q947873: "television",
  Q17125263: "internet", Q57414145: "internet", Q2906862: "internet",
  Q43845: "~riche", Q131524: "~riche", Q47064: "militaire", Q1250916: "militaire arme",
  Q4964182: "philosophe", Q19546: "religion", Q250867: "religion", Q4610556: "mannequin", Q3499072: "nourriture",
  Q177220: "chanteur", Q36834: "compositeur", Q1930187: "journaliste", Q39631: "medecin", Q170790: "maths", Q169470: "maths",
  Q2309784: "cyclisme", Q11513337: "athletisme", Q10843402: "natation", Q14089670: "rugby", Q11774891: "hockey",
  Q5716684: "danseur", Q33231: "photographe", Q42973: "architecte", Q188094: "economiste", Q40348: "avocat",
  Q131524: "~riche entrepreneur", Q11900058: "explorateur", Q4144610: "ski", Q15117302: "volley", Q3282637: "producteur film",
  Q2865819: "opera musique chanteur", Q158852: "cheforchestre musique",
  Q2405480: "doubleur", Q628099: "foot entraineur", Q10841764: "voiture f1",
  Q13156709: "golf", Q10873124: "echecs", Q10871364: "baseball", Q12299841: "cricket", Q19204627: "footus", Q13365117: "handball"
};
// les métiers ci-dessus qui figurent deux fois : on fusionne
OCCUPATIONS.Q177220 = "musique chanteur"; OCCUPATIONS.Q36834 = "musique compositeur";
const COUNTRY = {
  Q142: "francais", Q30: "americain", Q145: "anglais", Q174193: "anglais", Q161885: "anglais", Q179876: "anglais",
  Q29: "espagne", Q17: "japon", Q38: "italie", Q172579: "italie", Q183: "allemagne", Q7318: "allemagne", Q43287: "allemagne",
  Q41304: "allemagne", Q27306: "allemagne", Q713750: "allemagne", Q16957: "allemagne", Q159: "russie", Q15180: "russie", Q34266: "russie",
  Q155: "bresil", Q414: "argentine", Q96: "mexique", Q16: "canada", Q148: "chine", Q13426199: "chine", Q8733: "chine", Q668: "inde",
  Q884: "coree", Q423: "coree", Q31: "belgique", Q39: "suisse", Q55: "paysbas", Q29999: "paysbas", Q45: "portugal", Q36: "pologne",
  Q34: "nordique", Q20: "nordique", Q35: "nordique", Q33: "nordique", Q189: "nordique", Q41: "grece", Q11772: "grece europe",
  Q43: "turquie", Q12560: "turquie", Q79: "egypte afrique", Q11768: "egypte afrique", Q408: "australie", Q27: "irlande", Q40: "autriche", Q131964: "autriche",
  Q1747689: "italie europe", Q2277: "italie europe", Q17167: "italie europe",
  Q1028: "maghreb", Q262: "maghreb", Q948: "maghreb", Q1016: "maghreb",
  Q801: "moyenorient", Q794: "moyenorient", Q796: "moyenorient", Q822: "moyenorient", Q858: "moyenorient", Q851: "moyenorient",
  Q810: "moyenorient", Q878: "moyenorient", Q817: "moyenorient", Q846: "moyenorient", Q805: "moyenorient",
  Q212: "europeest", Q213: "europeest", Q33946: "europeest", Q28: "europeest", Q218: "europeest", Q403: "europeest", Q83286: "europeest",
  Q36704: "europeest", Q224: "europeest", Q219: "europeest", Q214: "europeest", Q215: "europeest", Q184: "europeest", Q37: "europeest",
  Q211: "europeest", Q191: "europeest", Q225: "europeest", Q236: "europeest", Q221: "europeest", Q222: "europeest", Q217: "europeest",
  Q230: "europeest", Q399: "europeest", Q36: "pologne europeest"
};
const LATAM = new Set(["Q96", "Q155", "Q414", "Q739", "Q298", "Q419", "Q717", "Q241", "Q77", "Q736", "Q750", "Q733", "Q786", "Q1183", "Q774", "Q783", "Q792", "Q811", "Q800", "Q804", "Q790", "Q766"]);
const CONTINENT = { Q46: "europe", Q15: "afrique", Q48: "asie", Q18: "amlatine" };
const DISNEY = new Set(["Q191224", "Q7414", "Q127552", "Q1047410", "Q8704", "Q1323594"]);

// Mots-clés anglais (types, œuvres, univers, franchises) -> traits pour la fiction
const KEYWORDS = [
  [/\bhuman\b|\bperson\b|\bwizard|\bwitch|\bdetective|\bspy\b|\bpirate|\bsoldier|\bprincess|\bprince\b|\bking\b|\bqueen\b|\bknight/, "humain"],
  [/\bdog\b|\bpuppy|canine/, "chien"], [/\bcat\b|feline|kitten/, "chat"],
  [/animal|\bmouse\b|\bduck\b|\brabbit|\bbear\b|\bpig\b|\bfox\b|\bwolf\b|\blion\b|\bbird\b|\bfish\b|\bhorse|\bmonkey|\bape\b|\bfrog|\bturtle|\btiger|\belephant|\bcow\b|\bsheep|\bgoat\b|\bdinosaur|\bhedgehog|\bsquirrel|\bpenguin|\bowl\b|\bpokémon|\bdeer\b/, "animal"],
  [/robot|android|cyborg|\bmachine|\bai\b|artificial intelligence|droid/, "robot"],
  [/monster|vampire|dragon|demon|ghost|zombie|\bgiant|kaiju|werewolf|\btroll|\bogre|alien|extraterrestrial|creature|undead|\borc\b|pokémon|digimon|yōkai|youkai/, "monstre"],
  [/deity|\bgod\b|goddess|mytholog|legendary|\bhero of\b|demigod|folklore|mythical/, "mythe"],
  [/superhero|superhuman|mutant|wizard|witch|mage|sorcer|magic|jedi|\bsith\b|\bdemigod|\bgod\b|deity|\bsuper\b|esper|shinigami/, "pouvoir"],
  [/superhero/, "heros costume"],
  [/villain|antagonist|\bdemon lord|dark lord|criminal mastermind|serial killer/, "mechant"],
  [/\bfilm\b|\bmovie|feature film|film series/, "film"],
  [/television series|tv series|\bsitcom|web series|television program|soap opera|miniseries|drama series|television character/, "serie"],
  [/\banime\b|\bmanga\b|light novel/, "anime dessin"],
  [/video game|game series|\bgame character|role-playing game|fighting game|platform game/, "jeu"],
  [/\bcomic|comics|bande dessinée|graphic novel|webcomic|comic strip/, "bd"],
  [/\bnovel|\bbook\b|literary|\bplay\b|fairy tale|short story|poem|\bepic\b|tragedy|comedy play|opera\b/, "livre"],
  [/animated|animation|cartoon/, "dessin"],
  [/marvel|\bdc comics|\bdc universe|dc extended|batman|superman/, "marvel"],
  [/star wars|star trek|space opera|science fiction|starship|galax|alien/, "espace"],
  [/harry potter|wizarding world/, "pouvoir anglais"],
  [/disney|pixar/, "disney"],
  [/pokémon|nintendo|super mario|zelda|sonic/, "jeu"],
  [/sherlock|detective|police procedural|crime fiction|mystery/, "detective"],
  [/pirate|ocean|\bsea\b|mermaid|underwater|\bnavy/, "mer"],
  [/school|student|high school|academy/, "ecole"],
  [/\bchild\b|\bboy\b|\bgirl\b|teenage|teen\b|\bkid\b/, "enfant"],
  [/star wars/, "starwars espace"], [/harry potter|wizarding world|fantastic beasts/, "harrypotter"],
  [/middle-earth|lord of the rings|\bhobbit|tolkien|silmarillion/, "tolkien livre"], [/pokémon/, "pokemon jeu anime"],
  [/nintendo|super mario|\bmario\b|zelda|kirby|metroid|donkey kong/, "nintendo jeu japon"], [/simpsons/, "simpsons dessin serie americain"],
  [/game of thrones|song of ice and fire|house of the dragon/, "got serie livre"], [/dragon ball/, "dragonball anime"],
  [/one piece/, "onepiece anime"], [/naruto|boruto/, "naruto anime"], [/star trek/, "startrek espace serie"],
  [/doctor who|torchwood/, "doctorwho serie anglais espace"], [/\bdc comics|\bdc universe|dc extended|batman|superman|justice league/, "dc"],
  [/greek mytholog|greek deit|olympian/, "grece mythe"], [/norse mytholog|norse deit|\baesir/, "nordique mythe"],
  [/egyptian mytholog|egyptian deit/, "egypte mythe afrique"], [/hindu|ramayana|mahabharata/, "inde mythe"],
  [/bible|biblical|gospel|testament|quran/, "religion"], [/arthurian/, "anglais mythe"]
];

/* ---------- Extraction ---------- */
const people = new Map();
const get = (uri, kind) => {
  const id = qid(uri);
  if (!people.has(id)) people.set(id, { id, kind, tags: {}, words: [] });
  return people.get(id);
};
const tag = (e, spec, weight = 1) => {
  for (let t of spec.split(" ").filter(Boolean)) {
    let w = weight;
    if (t[0] === "~") { t = t.slice(1); w = Math.min(w, 0.5); }
    e.tags[t] = Math.max(e.tags[t] ?? 0, w);
  }
};

async function base(sel, kind) {
  const rows = await sparql(`SELECT ?p ?sl ?fr ?en ?dfr ?den ?g ?b ?d WHERE { ${sel}
    ?p wikibase:sitelinks ?sl .
    OPTIONAL { ?p rdfs:label ?fr FILTER(LANG(?fr) = "fr") } OPTIONAL { ?p rdfs:label ?en FILTER(LANG(?en) = "en") }
    OPTIONAL { ?p schema:description ?dfr FILTER(LANG(?dfr) = "fr") } OPTIONAL { ?p schema:description ?den FILTER(LANG(?den) = "en") }
    OPTIONAL { ?p wdt:P21 ?g } OPTIONAL { ?p wdt:P569 ?b } OPTIONAL { ?p wdt:P570 ?d } }`);
  for (const r of rows) {
    const e = get(r.p, kind);
    e.sl = +r.sl;
    e.name = e.name || r.fr || r.en;
    e.desc = e.desc || r.dfr || r.den || "";
    if (r.g) e.gender = qid(r.g);
    if (r.b && !e.born) e.born = parseInt(r.b.slice(0, r.b[0] === "-" ? 6 : 5));
    if (r.d) e.dead = true;
  }
  console.log(`  ${kind === "h" ? "personnalités" : "personnages"} : ${rows.length} lignes`);
}

async function humans() {
  console.log("Personnalités…");
  await base(HUMANS, "h");
  const occ = Object.keys(OCCUPATIONS).map(q => "wd:" + q).join(" ");
  const rows = await sparql(`SELECT DISTINCT ?p ?cat WHERE { ${HUMANS} VALUES ?cat { ${occ} } { ?p wdt:P106 ?cat } UNION { ?p wdt:P106 ?o . ?o wdt:P279 ?cat } }`);
  for (const r of rows) tag(get(r.p, "h"), OCCUPATIONS[qid(r.cat)]);
  const royal = await sparql(`SELECT DISTINCT ?p WHERE { ${HUMANS} { ?p wdt:P39/wdt:P279* wd:Q116 } UNION { ?p wdt:P39/wdt:P279* wd:Q39018 } UNION { ?p wdt:P97 ?t } }`);
  for (const r of royal) tag(get(r.p, "h"), "royal");
  const saints = await sparql(`SELECT DISTINCT ?p WHERE { ${HUMANS} ?p wdt:P411 ?s }`);
  for (const r of saints) tag(get(r.p, "h"), "religion");
  const rich = await sparql(`SELECT DISTINCT ?p WHERE { ${HUMANS} ?p wdt:P2218 ?w . FILTER(?w > 1000000000) }`);
  for (const r of rich) tag(get(r.p, "h"), "riche");
  await countries(HUMANS, "?p wdt:P27 ?c", "h");
  const extra = [
    [`?p wdt:P166/wdt:P279* wd:Q7191`, "nobel"], [`?p wdt:P166/wdt:P361* wd:Q19020`, "oscar"], [`?p wdt:P166/wdt:P361* wd:Q41254`, "grammy"],
    [`?p wdt:P166 wd:Q166177`, "ballondor"], [`?p wdt:P1344/wdt:P31/wdt:P279* wd:Q5389`, "olympique"],
    [`?p wdt:P39/wdt:P279* wd:Q48352`, "chefetat politique"], [`?p wdt:P463/wdt:P31/wdt:P279* wd:Q215380`, "groupe"],
    [`?p wdt:P1196 wd:Q149086`, "assassine"], [`?p wdt:P136/wdt:P279* wd:Q11399`, "rock"], [`?p wdt:P136/wdt:P279* wd:Q38848`, "rock"],
    [`?p wdt:P136/wdt:P279* wd:Q37073`, "pop"], [`?p wdt:P136/wdt:P279* wd:Q8341`, "jazz"], [`?p wdt:P136/wdt:P279* wd:Q9730`, "classique"]
  ];
  for (const [path, spec] of extra) {
    for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${HUMANS} ${path} }`)) tag(get(r.p, "h"), spec);
  }
  const CLUBS = {
    Q483020: "psg", Q132885: "om", Q704: "ol", Q180305: "monaco", Q8682: "realmadrid", Q7156: "barca", Q8701: "atletico",
    Q18656: "manutd", Q1130849: "liverpool", Q9616: "chelsea", Q9617: "arsenal", Q50602: "mancity",
    Q15789: "bayern", Q41420: "dortmund", Q1422: "juventus", Q1543: "milan", Q631: "inter"
  };
  const clubs = Object.keys(CLUBS).map(q => "wd:" + q).join(" ");
  for (const r of await sparql(`SELECT DISTINCT ?p ?c WHERE { ${HUMANS} VALUES ?c { ${clubs} } ?p p:P54/ps:P54 ?c }  # tous les clubs de la carrière, pas seulement l'actuel`)) tag(get(r.p, "h"), CLUBS[qid(r.c)]);
  const POS = { Q201330: "gardien", Q336286: "defenseur", Q193592: "milieu", Q280658: "attaquant" };
  const pos = Object.keys(POS).map(q => "wd:" + q).join(" ");
  for (const r of await sparql(`SELECT DISTINCT ?p ?c WHERE { ${HUMANS} VALUES ?c { ${pos} } { ?p wdt:P413 ?c } UNION { ?p wdt:P413/wdt:P279 ?c } }`)) tag(get(r.p, "h"), POS[qid(r.c)]);
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${HUMANS} ?p wdt:P54/wdt:P118 wd:Q155223 }`)) tag(get(r.p, "h"), "nba basket");
  const SAGAS = { Q642878: "filmmarvel", Q216930: "filmhp", Q462: "filmstarwars", Q22092344: "filmstarwars", Q2484680: "filmbond" };
  const sagas = Object.keys(SAGAS).map(q => "wd:" + q).join(" ");
  for (const r of await sparql(`SELECT DISTINCT ?p ?s WHERE { ${HUMANS} VALUES ?s { ${sagas} } ?film (wdt:P179|wdt:P8345|wdt:P1080|wdt:P361) ?s . ?film wdt:P161 ?p }`)) tag(get(r.p, "h"), SAGAS[qid(r.s)] + " acteur");
  const INSTR = { Q6607: "guitare", Q5994: "piano", Q128309: "batterie", Q11404: "batterie" };
  const instr = Object.keys(INSTR).map(q => "wd:" + q).join(" ");
  for (const r of await sparql(`SELECT DISTINCT ?p ?i WHERE { ${HUMANS} VALUES ?i { ${instr} } { ?p wdt:P1303 ?i } UNION { ?p wdt:P1303/wdt:P279 ?i } }`)) tag(get(r.p, "h"), INSTR[qid(r.i)] + " musique");
  const POSTS = { Q11696: "presidentus politique chefetat", Q191954: "presidentfr politique chefetat", Q18384454: "roifrance royal" };
  const posts = Object.keys(POSTS).map(q => "wd:" + q).join(" ");
  for (const r of await sparql(`SELECT DISTINCT ?p ?x WHERE { ${HUMANS} VALUES ?x { ${posts} } ?p wdt:P39 ?x }`)) tag(get(r.p, "h"), POSTS[qid(r.x)]);
  for (const r of await sparql(`SELECT ?p ?v ?u WHERE { ${HUMANS} ?p p:P2048/psv:P2048 ?n . ?n wikibase:quantityAmount ?v ; wikibase:quantityUnit ?u }`)) {
    const v = parseFloat(r.v), unit = qid(r.u);
    const cm = unit === "Q11573" ? v * 100 : unit === "Q174728" ? v : null;
    if (cm && cm > 100 && cm < 260) get(r.p, "h").height = cm;
  }
  for (const r of await sparql(`SELECT ?p ?d WHERE { ${HUMANS} ?p wdt:P570 ?d }`)) {
    const e = get(r.p, "h");
    e.diedYear = parseInt(r.d.slice(0, r.d[0] === "-" ? 6 : 5));
  }
}

async function countries(sel, path, kind) {
  const rows = await sparql(`SELECT ?p ?c ?cont WHERE { ${sel} ${path} . OPTIONAL { ?c wdt:P30 ?cont } }`);
  const conts = new Map(), seen = new Map();
  for (const r of rows) {
    const c = qid(r.c);
    if (!conts.has(c)) conts.set(c, new Set());
    if (r.cont) conts.get(c).add(qid(r.cont));
    const key = r.p + " " + c;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const perItem = new Map();
  for (const [key, n] of seen) {
    const [p, c] = key.split(" ");
    if (!perItem.has(p)) perItem.set(p, []);
    perItem.get(p).push([c, n]);
  }
  for (const [p, list] of perItem) {
    const e = get(p, kind);
    // la fiction hérite des pays de toutes ses adaptations : on ne garde que le plus fréquent
    const keep = kind === "f" ? [list.sort((a, b) => b[1] - a[1])[0]] : list;
    for (const [c] of keep) {
      if (COUNTRY[c]) tag(e, COUNTRY[c]);
      if (LATAM.has(c)) tag(e, "amlatine");
      const cs = [...conts.get(c)];
      if (cs.length === 1 && CONTINENT[cs[0]]) tag(e, CONTINENT[cs[0]]);
    }
  }
}

async function fiction() {
  console.log("Personnages de fiction…");
  await base(FICTION, "f");
  const label = v => `?${v} rdfs:label ?${v}l FILTER(LANG(?${v}l) = "en")`;
  const queries = [
    `SELECT DISTINCT ?p ?xl WHERE { ${FICTION} ?p wdt:P31 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${FICTION} ?p wdt:P31/wdt:P279 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${FICTION} ?p wdt:P1441/wdt:P31 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${FICTION} ?p wdt:P1441 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${FICTION} ?p wdt:P1080 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${FICTION} ?p wdt:P8345 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${FICTION} ?p wdt:P1441/wdt:P136 ?x . ${label("x")} }`
  ];
  for (const q of queries) for (const r of await sparql(q)) get(r.p, "f").words.push(r.xl.toLowerCase());
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${FICTION} ?p wdt:P2563 ?a }`)) tag(get(r.p, "f"), "pouvoir");
  for (const r of await sparql(`SELECT DISTINCT ?p ?pr WHERE { ${FICTION} ?p wdt:P1441 ?w . ?w wdt:P272|wdt:P750|wdt:P170 ?pr }`)) {
    if (DISNEY.has(qid(r.pr))) tag(get(r.p, "f"), "disney");
  }
  await countries(FICTION, "?p wdt:P1441/wdt:P495 ?c", "f");
  for (const e of people.values()) if (e.kind === "f") {
    const text = e.words.join(" | ");
    for (const [re, spec] of KEYWORDS) if (re.test(text)) tag(e, spec);
    if (e.tags.japon && (e.tags.serie || e.tags.film) && e.tags.dessin) tag(e, "anime");
  }
}

async function aliases(ids) {
  const out = new Map();
  const list = [...ids];
  for (let i = 0; i < list.length; i += 1500) {
    const values = list.slice(i, i + 1500).map(q => "wd:" + q).join(" ");
    const rows = await sparql(`SELECT ?p ?a WHERE { VALUES ?p { ${values} } { ?p skos:altLabel ?a } UNION { ?p rdfs:label ?a } FILTER(LANG(?a) = "fr" || LANG(?a) = "en") }`);
    for (const r of rows) {
      const k = norm(r.a);
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(qid(r.p));
    }
  }
  return out;
}
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");

/* ---------- Traits finaux ---------- */
function finalize(e) {
  const t = e.tags;
  if (e.gender === "Q6581097" || e.gender === "Q44148" || e.gender === "Q2449503") t.homme = 1;
  if (e.gender === "Q6581072" || e.gender === "Q43445" || e.gender === "Q1052281") t.femme = 1;
  if (e.kind === "h") {
    t.reel = 1; t.humain = 1;
    const b = e.born;
    if (!e.dead && b && b > 1915) t.vivant = 1;
    if (t.vivant && b >= 1987) t.jeune = 1;
    if (t.vivant && b >= 2008) t.enfant = 1;
    if (t.vivant && b <= 1956) t.vieux = 1;
    if (b !== undefined) {
      if (b < 1870) t.passe = 1;
      if (b < 450) t.antiquite = 1;
      else if (b < 1480) t.moyenage = 1;
      if (b >= 1880 && b <= 1950) t.siecle20 = 1;
    }
    if (t.sport && b) t.retraite = b < 1982 ? 1 : b < 1990 ? 0.5 : 0;
    if (e.height) { if (e.height >= 190) t.grand = 1; if (e.height < 165) t.petit = 1; }
    // date de naissance inconnue (papes, saints, figures anciennes) : l'époque reste « inconnue », pas « non »
    if (b === undefined) for (const k of ["neavant1945", "neapres1960", "neapres1970", "neapres1980", "neapres1990", "neapres2000", "passe", "siecle20", "antiquite", "moyenage", "jeune"]) if (!(k in t)) t[k] = 0.5;
    if (b !== undefined) {
      if (b < 1945) t.neavant1945 = 1;
      for (const y of [1960, 1970, 1980, 1990, 2000]) if (b >= y) t["neapres" + y] = 1;
      if (e.diedYear !== undefined && e.diedYear - b < 45) t.mortjeune = 1;
    }
    if (t.musique && t.rap) t.musique = 1;
  }
  if (t.foot || t.basket || t.tennis || t.combat || t.voiture || t.cyclisme || t.athletisme || t.natation || t.rugby || t.hockey || t.golf || t.baseball || t.cricket || t.footus || t.handball) t.sport = 1;
  if (t.ballondor) t.foot = 1;
  if (t.dc) t.marvel = 1;
  if (t.anglais || t.espagne || t.italie || t.allemagne || t.russie || t.belgique || t.suisse || t.paysbas || t.portugal || t.pologne || t.nordique || t.grece || t.irlande || t.autriche) t.europe = 1;
  if (t.bresil || t.argentine || t.mexique) t.amlatine = 1;
  if (t.chine || t.inde || t.coree || t.moyenorient) t.asie = 1;
  if (t.maghreb) t.afrique = 1;
  if (t.afrique && !t.maghreb && !t.egypte) t.afriquenoire = 1;
  if (t.europeest) t.europe = 1;
  if (t.japon) t.asie = 1;
  if (t.chien || t.chat) t.animal = 1;
  if (t.animal || t.robot) delete t.humain;
  if (t.marvel) t.bd = 1;
}

// Pour une entrée automatique : traits connus avec certitude (absents = « non ») et traits incomplets (absents = « peu probable »)
const DEFAULTS = {
  h: {
    zero: "homme femme psg om ol monaco realmadrid barca atletico manutd liverpool chelsea arsenal mancity bayern dortmund juventus milan inter nba f1 filmmarvel filmhp filmstarwars filmbond presidentus presidentfr roifrance neapres1960 neapres1980 neapres1990 neapres2000 animal chien chat robot monstre mythe anime jeu bd dessin disney marvel pouvoir proche famille toi ecole livre neavant1945 neapres1970 mortjeune nobel oscar grammy ballondor olympique chefetat starwars harrypotter tolkien pokemon nintendo simpsons got dragonball onepiece naruto startrek doctorwho dc",
    soft: "deurope damerique maghreb afriquenoire moyenorient europeest danseur photographe architecte economiste avocat entrepreneur explorateur producteur opera cheforchestre ski volley gardien defenseur milieu attaquant entraineur doubleur guitare piano batterie grand petit bresil argentine mexique canada chine inde coree belgique suisse paysbas portugal pologne nordique grece turquie egypte australie irlande autriche assassine rock pop jazz classique chanteur compositeur journaliste medecin maths cyclisme athletisme natation rugby hockey golf echecs baseball cricket footus handball groupe vivant jeune enfant vieux passe antiquite moyenage siecle20 francais europe anglais americain japon espagne italie allemagne russie afrique asie amlatine film serie musique rap sport foot basket tennis combat voiture retraite politique science art ecrivain acteur realisateur humour television internet espace royal militaire religion philosophe mannequin"
  },
  f: {
    zero: "danseur photographe architecte economiste avocat entrepreneur producteur opera cheforchestre ski volley psg om ol monaco realmadrid barca atletico manutd liverpool chelsea arsenal mancity bayern dortmund juventus milan inter nba f1 filmmarvel filmhp filmstarwars filmbond presidentus presidentfr roifrance neapres1960 neapres1980 neapres1990 neapres2000 gardien defenseur milieu attaquant entraineur doubleur guitare piano batterie reel vivant jeune proche famille toi retraite realisateur mannequin philosophe internet television nobel oscar grammy ballondor olympique chefetat groupe assassine rock pop jazz classique compositeur journaliste cyclisme athletisme natation rugby hockey golf echecs baseball cricket footus handball",
    soft: "deurope damerique maghreb afriquenoire moyenorient europeest starwars harrypotter tolkien pokemon nintendo simpsons got dragonball onepiece naruto startrek doctorwho dc bresil argentine mexique canada chine inde coree belgique suisse paysbas portugal pologne nordique grece turquie egypte australie irlande autriche humain animal chien chat robot monstre mythe film serie anime jeu livre bd dessin disney marvel pouvoir francais americain anglais japon espagne italie allemagne russie europe afrique asie amlatine"
  }
};

async function main() {
  const data = fs.readFileSync("personnages.js", "utf8");
  const ctx = {};
  vm.runInNewContext(data + ";this.P=PERSONNAGES;", ctx);
  await humans();
  await fiction();

  for (const e of people.values()) {
    if (!e.name || /^Q\d+$/.test(e.name)) { people.delete(e.id); continue; }
    e.name = e.name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    finalize(e);
  }
  // Fusion avec la liste faite main : on garde la fiche manuelle, enrichie de la notoriété et des traits Wikidata
  console.log("Rapprochement avec la liste faite main…");
  const alias = await aliases(people.keys());
  const curated = {};
  const taken = new Set();
  for (const line of ctx.P) {
    const [name, , tags = ""] = line.split("|");
    const real = /(^| )(reel|vivant)( |$)/.test(tags);
    if (/(^| )proche|famille|toi( |$)/.test(tags)) continue;
    const hits = (alias.get(norm(name)) || []).filter(id => !taken.has(id)).map(id => people.get(id))
      .filter(e => e && (e.kind === "h") === real);
    if (!hits.length) continue;
    const best = hits.sort((a, b) => b.sl - a.sl)[0];
    taken.add(best.id);
    curated[name] = [best.sl, Object.entries(best.tags).filter(([, v]) => v > 0).map(([k, v]) => (v === 1 ? k : `~${k}`)).join(" ")];
  }
  // Une seule entrée par nom : la plus connue
  const byName = new Map();
  for (const e of people.values()) {
    if (taken.has(e.id)) continue;
    const k = norm(e.name);
    if (!k || (byName.has(k) && byName.get(k).sl >= e.sl)) continue;
    byName.set(k, e);
  }
  const entries = [...byName.values()].sort((a, b) => b.sl - a.sl).map(e => [
    e.name, e.desc.slice(0, 90), e.sl, e.kind,
    Object.entries(e.tags).filter(([, v]) => v > 0).map(([k, v]) => (v === 1 ? k : `~${k}`)).join(" ")
  ]);
  const out = `/* Généré par tools/build-wikidata.mjs le ${new Date().toISOString().slice(0, 10)} à partir de Wikidata (CC0). Ne pas modifier à la main. */
const WIKI = ${JSON.stringify({ defaults: DEFAULTS, newKeys: "deurope damerique maghreb afriquenoire moyenorient europeest danseur photographe architecte economiste avocat entrepreneur explorateur producteur opera cheforchestre ski volley psg om ol monaco realmadrid barca atletico manutd liverpool chelsea arsenal mancity bayern dortmund juventus milan inter gardien defenseur milieu attaquant entraineur nba f1 filmmarvel filmhp filmstarwars filmbond doubleur guitare piano batterie presidentus presidentfr roifrance grand neapres1960 neapres1980 neapres1990 neapres2000 petit bresil argentine mexique canada chine inde coree belgique suisse paysbas portugal pologne nordique grece turquie egypte australie irlande autriche neavant1945 neapres1970 mortjeune assassine nobel oscar grammy ballondor olympique chefetat groupe rock pop jazz classique chanteur compositeur journaliste medecin maths cyclisme athletisme natation rugby hockey golf echecs baseball cricket footus handball starwars harrypotter tolkien pokemon nintendo simpsons got dragonball onepiece naruto startrek doctorwho dc italie allemagne russie afrique asie amlatine antiquite moyenage siecle20 ecrivain philosophe religion militaire realisateur mannequin tennis".split(" "), curated, entries })
    .replace(/\],\[/g, "],\n[")};
`;
  fs.writeFileSync("wikidata.js", out);
  const h = entries.filter(e => e[3] === "h").length;
  console.log(`OK : ${h} personnalités, ${entries.length - h} personnages de fiction, ${Object.keys(curated).length} fiches manuelles enrichies, ${(out.length / 1e6).toFixed(1)} Mo`);
}
main().catch(e => { console.error(e); process.exit(1); });
