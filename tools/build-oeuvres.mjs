// Construit oeuvres-data.js : les films et séries les plus connus, tirés de Wikidata,
// avec leurs traits (type, genres, pays, date, saga, adaptation, réalisateur, acteurs, plateforme, prix).
// Usage : node tools/build-oeuvres.mjs   (depuis la racine du dépôt, Node 18+)

import fs from "node:fs";
import { mostRead } from "./most-read.mjs";

const ENDPOINT = "https://qlever.dev/api/wikidata";
const PREFIX = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
`;
const FILM_MIN = 35, SERIE_MIN = 20;  // seuils plus bas pour les œuvres françaises (voir WORKS)

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
      } catch (e) { console.warn("  réponse illisible, nouvel essai…"); }
    } else console.warn(`  requête refusée (${res.status}), nouvel essai…`);
    await new Promise(r => setTimeout(r, 3000 * attempt));
  }
  throw new Error("QLever ne répond pas");
}
const qid = uri => uri.split("/").pop();
const vals = obj => Object.keys(obj).map(q => "wd:" + q).join(" ");

const WORKS = `{ SELECT DISTINCT ?p WHERE {
  { ?p wdt:P31/wdt:P279* wd:Q11424 ; wikibase:sitelinks ?sl . FILTER(?sl >= ${FILM_MIN}) }
  UNION { ?p wdt:P31/wdt:P279* wd:Q5398426 ; wikibase:sitelinks ?sl . FILTER(?sl >= ${SERIE_MIN}) }
  UNION { ?p wdt:P31/wdt:P279* wd:Q11424 ; wdt:P495 wd:Q142 ; wikibase:sitelinks ?sl . FILTER(?sl >= 15) }
  UNION { ?p wdt:P31/wdt:P279* wd:Q5398426 ; wdt:P495 wd:Q142 ; wikibase:sitelinks ?sl . FILTER(?sl >= 8) }
} }`;

const COUNTRY = { Q142: "francais", Q30: "americain", Q145: "anglais", Q17: "japon", Q884: "coree", Q29: "espagne", Q38: "italie", Q668: "inde", Q183: "allemagne", Q16: "canada" };
const DIRECTORS = {
  Q8877: "r_spielberg", Q25191: "r_nolan", Q3772: "r_tarantino", Q42574: "r_cameron", Q41148: "r_scorsese", Q2001: "r_kubrick",
  Q55400: "r_miyazaki", Q38222: "r_lucas", Q56008: "r_burton", Q484779: "r_besson", Q4465: "r_jackson", Q56005: "r_scott",
  Q7374: "r_hitchcock", Q43203: "r_eastwood", Q223687: "r_anderson", Q548823: "r_villeneuve", Q495980: "r_bong"
};
const ACTORS = {
  Q38111: "a_dicaprio", Q2263: "a_hanks", Q35332: "a_pitt", Q37175: "a_depp", Q37079: "a_cruise", Q40096: "a_wsmith",
  Q81328: "a_ford", Q48337: "a_freeman", Q34436: "a_johansson", Q165219: "a_rdj", Q357387: "a_omarsy", Q189422: "a_dujardin",
  Q2737: "a_defunes", Q106508: "a_depardieu", Q310692: "a_clavier", Q43697: "a_reno", Q8927: "a_cotillard", Q43203: "a_eastwood"
};
const PLATFORMS = { Q907311: "netflix", Q23633: "hbo", Q54958752: "disneyplus", Q1032540: "canalplus" };
const STUDIOS = { Q191224: "disney", Q7414: "disney", Q1047410: "disney", Q127552: "pixar disney", Q2732470: "pixar disney", Q367466: "marvel", Q182950: "ghibli anime japon" };

const KEYWORDS = [
  [/comedy|sitcom|comédie/, "comedie"], [/\baction\b|martial arts/, "action"], [/horror|slasher|zombie|vampire/, "horreur"],
  [/science fiction|sci-fi|space opera|cyberpunk/, "sf"], [/fantasy/, "fantastique"], [/\bdrama\b/, "drame"],
  [/romance|romantic/, "romance"], [/thriller|suspense/, "thriller"], [/crime|detective|police|mystery|heist|gangster|neo-noir|film noir/, "policier"],
  [/\bwar\b/, "guerre"], [/western/, "western"], [/musical/, "musical"], [/adventure/, "aventure"], [/historical|period drama|period film/, "historique"],
  [/biographical|biopic/, "biopic"], [/children|family|kids/, "enfants"], [/superhero/, "superheros action"], [/animated|animation|computer-animated|cartoon/, "animation"],
  [/\banime\b/, "anime animation japon"], [/teen|coming-of-age|high school/, "ado"], [/documentary/, "documentaire"], [/medical/, "medical"],
  [/marvel/, "marvel superheros"], [/\bdc\b|batman|superman|justice league/, "dc superheros"], [/star wars/, "starwars sf"], [/harry potter|wizarding world|fantastic beasts/, "harrypotter fantastique"],
  [/james bond/, "bond action"], [/middle-earth|lord of the rings|hobbit/, "tolkien fantastique"], [/pokémon/, "pokemon anime"], [/disney/, "disney"], [/pixar/, "pixar disney animation"]
];

const works = new Map();
const get = uri => { const id = qid(uri); if (!works.has(id)) works.set(id, { id, tags: {}, words: [] }); return works.get(id); };
const tag = (e, spec) => { for (const t of spec.split(" ").filter(Boolean)) e.tags[t] = 1; };

async function main() {
  console.log("Films et séries…");
  const base = await sparql(`SELECT ?p ?sl ?fr ?en ?dfr ?den ?d ?s ?film WHERE { ${WORKS}
    ?p wikibase:sitelinks ?sl .
    OPTIONAL { ?p rdfs:label ?fr FILTER(LANG(?fr) = "fr") } OPTIONAL { ?p rdfs:label ?en FILTER(LANG(?en) = "en") }
    OPTIONAL { ?p schema:description ?dfr FILTER(LANG(?dfr) = "fr") } OPTIONAL { ?p schema:description ?den FILTER(LANG(?den) = "en") }
    OPTIONAL { ?p wdt:P577 ?d } OPTIONAL { ?p wdt:P580 ?s }
    BIND(EXISTS { ?p wdt:P31/wdt:P279* wd:Q11424 } AS ?film) }`);
  for (const r of base) {
    const e = get(r.p);
    e.sl = +r.sl;
    e.name = e.name || r.fr || r.en;
    e.desc = e.desc || r.dfr || r.den || "";
    const y = parseInt((r.d || r.s || "").slice(0, 4));
    if (y && (!e.year || y < e.year)) e.year = y;
    tag(e, r.film === "true" ? "film" : "serie");
  }
  console.log(`  ${works.size} œuvres`);
  const label = v => `?${v} rdfs:label ?${v}l FILTER(LANG(?${v}l) = "en")`;
  for (const q of [
    `SELECT DISTINCT ?p ?xl WHERE { ${WORKS} ?p wdt:P136 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${WORKS} ?p wdt:P31 ?x . ${label("x")} }`,
    `SELECT DISTINCT ?p ?xl WHERE { ${WORKS} ?p wdt:P179|wdt:P8345 ?x . ${label("x")} }`
  ]) for (const r of await sparql(q)) get(r.p).words.push(r.xl.toLowerCase());
  // saga : un film qui fait partie d'une série de films
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${WORKS} ?p wdt:P31/wdt:P279* wd:Q11424 ; wdt:P179 ?x }`)) tag(get(r.p), "saga");
  for (const r of await sparql(`SELECT DISTINCT ?p ?xl WHERE { ${WORKS} ?p wdt:P144/wdt:P31 ?x . ${label("x")} }`)) {
    const w = r.xl.toLowerCase(), e = get(r.p);
    if (/novel|book|literary|short story|play|fairy tale|novella/.test(w)) tag(e, "adaptlivre");
    if (/comic|manga|graphic novel|bande dessinée/.test(w)) tag(e, "adaptbd");
    if (/video game/.test(w)) tag(e, "adaptjeu");
  }
  for (const r of await sparql(`SELECT DISTINCT ?p ?c WHERE { ${WORKS} ?p wdt:P495 ?c }`)) {
    const e = get(r.p), c = qid(r.c);
    (e.countries = e.countries || []).push(c);
  }
  for (const r of await sparql(`SELECT DISTINCT ?p ?c WHERE { ${WORKS} VALUES ?c { ${vals(DIRECTORS)} } ?p wdt:P57 ?c }`)) tag(get(r.p), DIRECTORS[qid(r.c)]);
  for (const r of await sparql(`SELECT DISTINCT ?p ?c WHERE { ${WORKS} VALUES ?c { ${vals(ACTORS)} } ?p wdt:P161 ?c }`)) tag(get(r.p), ACTORS[qid(r.c)]);
  for (const r of await sparql(`SELECT DISTINCT ?p ?c WHERE { ${WORKS} VALUES ?c { ${vals(PLATFORMS)} } ?p wdt:P449 ?c }`)) tag(get(r.p), PLATFORMS[qid(r.c)]);  // diffuseur d'origine seulement
  for (const r of await sparql(`SELECT DISTINCT ?p ?c WHERE { ${WORKS} VALUES ?c { ${vals(STUDIOS)} } ?p wdt:P272 ?c }`)) tag(get(r.p), STUDIOS[qid(r.c)]);
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${WORKS} ?p (wdt:P179|wdt:P8345|wdt:P1080|wdt:P361) wd:Q642878 }`)) tag(get(r.p), "marvel superheros");
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${WORKS} ?p p:P166/ps:P166 wd:Q102427 }`)) tag(get(r.p), "oscarfilm oscar");
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${WORKS} ?p wdt:P166/wdt:P361 wd:Q19020 }`)) tag(get(r.p), "oscar");
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${WORKS} ?p wdt:P166 wd:Q179808 }`)) tag(get(r.p), "palme");
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${WORKS} ?p wdt:P166 wd:Q645595 }`)) tag(get(r.p), "cesar francais");
  for (const r of await sparql(`SELECT ?p ?n WHERE { ${WORKS} ?p wdt:P2437 ?n }`)) { const e = get(r.p); e.seasons = Math.max(e.seasons || 0, +r.n); }
  for (const r of await sparql(`SELECT DISTINCT ?p WHERE { ${WORKS} ?p wdt:P582 ?end }`)) get(r.p).ended = true;

  // popularité réelle : nombre de mois où le titre figure parmi les pages Wikipédia les plus lues (fr ou en)
  console.log("Popularité (pages les plus lues de Wikipédia)…");
  const hot = await mostRead();
  for (const r of await sparql(`SELECT ?p ?t ?w WHERE { ${WORKS} ?a schema:about ?p ; schema:isPartOf ?w ; schema:name ?t .
      VALUES ?w { <https://fr.wikipedia.org/> <https://en.wikipedia.org/> } }`)) {
    const e = works.get(qid(r.p));
    if (e) e.hot = Math.max(e.hot || 0, hot.get((r.w.includes("//fr.") ? "fr:" : "en:") + r.t.replace(/ /g, "_")) || 0);
  }

  const entries = [];
  const seen = new Map();
  for (const e of works.values()) {
    if (!e.name || /^Q\d+$/.test(e.name)) continue;
    e.name = e.name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const t = e.tags;
    const text = e.words.join(" | ");
    for (const [re, spec] of KEYWORDS) if (re.test(text)) tag(e, spec);
    // le pays principal : le premier de la liste suffit (coproductions)
    for (const c of (e.countries || []).slice(0, 2)) if (COUNTRY[c]) t[COUNTRY[c]] = 1;
    if (e.year) {
      for (const y of [1970, 1980, 1990, 2000, 2010, 2020]) if (e.year >= y) t["apres" + y] = 1;
    } else for (const y of [1970, 1980, 1990, 2000, 2010, 2020]) t["apres" + y] = 0.5;
    if (t.serie) {
      if (e.seasons >= 5) t.longue = 1;
      if (e.ended) t.terminee = 1;
      if (/miniseries|mini-series/.test(text)) t.minis = 1;
    }
    if (t.anime) t.japon = 1;
    if (t.pixar) t.animation = 1;
    const key = e.name.toLowerCase();
    if (seen.has(key) && seen.get(key).sl >= e.sl) continue;
    seen.set(key, e);
  }
  for (const e of seen.values()) {
    entries.push([e.name, (e.desc || "").slice(0, 90), e.sl,
      Object.entries(e.tags).filter(([, v]) => v > 0).map(([k, v]) => (v === 1 ? k : `~${k}`)).join(" "), e.hot || 0]);
  }
  entries.sort((a, b) => b[2] - a[2]);
  const out = `/* Généré par tools/build-oeuvres.mjs le ${new Date().toISOString().slice(0, 10)} à partir de Wikidata (CC0). Ne pas modifier à la main. */
const OEUVRES_DATA = ${JSON.stringify(entries).replace(/\],\[/g, "],\n[")};
`;
  fs.writeFileSync("oeuvres-data.js", out);
  const films = entries.filter(e => / film( |$)/.test(" " + e[3] + " ")).length;
  console.log(`OK : ${films} films, ${entries.length - films} séries, ${(out.length / 1e6).toFixed(1)} Mo`);
}
main().catch(e => { console.error(e); process.exit(1); });
