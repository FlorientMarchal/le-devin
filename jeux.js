/* Deux jeux de plus, sur les mêmes fiches que le Devin :
   Les Indices — le Devin choisit, révèle des indices du plus vague au plus précis ; moins il en faut, plus on marque.
   L'Intrus    — quatre noms, trois partagent un point commun ; trouver celui qui ne l'a pas. */

const ROUNDS_INDICES = 5, ROUNDS_INTRUS = 10, MAX_CLUES = 8;
// traits trop évidents ou trop flous pour faire un bon indice ou un bon point commun
const SKIP = new Set("humain europe deurope damerique asie afrique jeune vivant passe siecle20 proche famille toi".split(" "));
const WHOQ = { personnage: "Qui est-ce ?", oeuvre: "Quel est ce titre ?", chose: "Qu'est-ce que c'est ?" };
// pour L'Intrus : l'intrus vient du même « monde » que les trois autres, sinon c'est trop facile
const WORLD = { personnage: ["reel"], oeuvre: ["film"], chose: ["animal", "mangeable", "objet", "plante"] };
// Points communs « visibles de tous » pour les personnages (pas de double nationalité ni de détail de carrière)
const INTRUS_PERSONNAGE = new Set(("sport foot basket tennis combat musique rap chanteur acteur politique science art ecrivain humour internet " +
  "royal mechant heros pouvoir animal robot monstre anime jeu bd dessin disney marvel film serie livre francais americain anglais japon " +
  "femme blond roux chauve barbe lunettes chapeau espace mer vole enfant vieux riche detective starwars harrypotter pokemon nintendo " +
  "mythe arme costume rouge bleu vert jaune").split(" "));

// Valeur certaine d'un trait : 1, 0, ou null si la fiche ne permet pas de l'affirmer
function sureValue(c, a) {
  if (a in c.t) return c.t[a] >= 0.95 ? 1 : c.t[a] <= 0.05 ? 0 : null;
  if (c.kind) { const d = DEFAULTS[c.kind]; return d && d.zero.has(a) ? 0 : null; }
  return c.custom ? null : 0;
}

// « Est-il lié au football ? » → « Il est lié au football. »
function statement(q, femme) {
  let s = q.replace(/\s*\?\s*$/, "");
  const P = femme ? "Elle" : "Il";
  const rules = [
    [/^Est-ce que /, ""],
    [/^Ton personnage (\S+)-t-il /, `${P} $1 `], [/^Ton personnage (\S+)-il /, `${P} $1 `],
    [/^Y a-t-il /, "Il y a "],
    [/^Est-ce /, "C'est "],
    [/^(L'|Le |La )(\S+)-t-on /, (m, a, v) => "On " + a.toLowerCase() + v + " "],
    [/^(\S+)-t-(il|elle|on) /, (m, v, p) => (p === "on" ? "On" : P) + " " + v.toLowerCase() + " "],
    [/^(\S+)-(il|elle|on) /, (m, v, p) => (p === "on" ? "On" : P) + " " + v.toLowerCase() + " "],
    [/^(.+?) (\S+)-t-(il|elle) /, "$1 $2 "],
    [/^(.+?) (\S+)-(il|elle) /, "$1 $2 "]
  ];
  for (const [re, r] of rules) if (re.test(s)) { s = s.replace(re, r); break; }
  if (femme && /^Elle /.test(s)) for (const [m, f] of FEMININ) s = s.replace(new RegExp(`(^|[ '])${m}(?=[ .,]|$)`, "g"), `$1${f}`);
  return s[0].toUpperCase() + s.slice(1) + ".";
}
// accords au féminin des tournures qu'on trouve dans les questions
const FEMININ = [["français", "française"], ["américain", "américaine"], ["britannique", "britannique"], ["allemand", "allemande"],
  ["italien", "italienne"], ["espagnol", "espagnole"], ["canadien", "canadienne"], ["belge", "belge"], ["suisse", "suisse"],
  ["né", "née"], ["connu", "connue"], ["lié", "liée"], ["considéré", "considérée"], ["représenté", "représentée"],
  ["assassiné", "assassinée"], ["mort", "morte"], ["un acteur", "une actrice"], ["un méchant", "une méchante"], ["un héros", "une héroïne"], ["un chanteur", "une chanteuse"],
  ["argentin", "argentine"], ["brésilien", "brésilienne"], ["mexicain", "mexicaine"], ["chinois", "chinoise"], ["coréen", "coréenne"],
  ["polonais", "polonaise"], ["portugais", "portugaise"], ["néerlandais", "néerlandaise"], ["irlandais", "irlandaise"],
  ["autrichien", "autrichienne"], ["australien", "australienne"], ["grec", "grecque"], ["turc", "turque"], ["russe", "russe"]];

const shuffled = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bestKey = () => `${who}:${mode}`;
function saveBest(score) {
  mem.best = mem.best || {};
  const prev = mem.best[bestKey()] || 0;
  if (score > prev) mem.best[bestKey()] = score;
  saveMem();
  return score > prev;
}
// accepte le nom complet, ou le nom de famille seul pour une personne (« Zidane »)
function sameName(guess, c) {
  const g = norm(guess), n = norm(c.name);
  if (!g) return false;
  if (g === n) return true;
  const last = c.name.split(/\s+/).pop();
  return mode === "personnage" && last.length >= 4 && g === norm(last);
}
function nameSuggestions(input, box, onPick) {
  const q = norm(input.value);
  if (q.length < 2) { box.innerHTML = ""; return; }
  const hits = [];
  for (const i of byFame()) {
    if (norm(CHARS[i].name).includes(q)) { hits.push(CHARS[i].name); if (hits.length >= 6) break; }
  }
  box.innerHTML = chips(hits);
  box.querySelectorAll(".chip").forEach(b => b.onclick = () => onPick(b.dataset.name));
}

/* ---------- Les Indices ---------- */
function newIndices() {
  game = { kind: "indices", round: 0, score: 0, used: new Set(), answers: [], rejected: new Set() };
  nextIndices();
}
function nextIndices() {
  if (game.round >= ROUNDS_INDICES) return endGame();
  const pool = famousPool();
  const secret = pick(pool.filter(i => !game.used.has(i)));
  game.used.add(secret);
  Object.assign(game, { round: game.round + 1, secret, clues: buildClues(secret, pool), shown: 1, wrong: 0, done: null, last: 0 });
  screen = "indices"; orb.mood = "sure"; orb.conf = 0.05;
  sfx("start");
  render();
}
// Indices : les traits certains du secret, du plus courant au plus rare dans le groupe, puis la description et l'initiale
function buildClues(i, pool) {
  const c = CHARS[i];
  const femme = c.t.femme === 1;
  let keys = KEYS.filter(a => !SKIP.has(a) && sureValue(c, a) === 1 && ((MODE.know && MODE.know[a]) || 1) >= 0.6);
  // dates en cascade (« après 1970 », « après 1980 »…) : un seul indice, le plus précis
  for (const chain of MODE.logic.chains || []) {
    const inChain = chain.filter(a => keys.includes(a));
    keys = keys.filter(a => !inChain.includes(a) || a === inChain[inChain.length - 1]);
  }
  const share = {};
  for (const a of keys) {
    let n = 0;
    for (const j of pool) if (sureValue(CHARS[j], a) === 1) n++;
    share[a] = n / pool.length;
  }
  let sorted = keys.filter(a => share[a] < 0.9).sort((x, y) => share[y] - share[x]);
  if (sorted.length > MAX_CLUES) sorted = Array.from({ length: MAX_CLUES }, (_, k) => sorted[Math.round(k * (sorted.length - 1) / (MAX_CLUES - 1))]);
  const clues = sorted.map(a => statement(QS[a], femme));
  if (c.desc) clues.push(`On ${femme ? "la" : "le"} décrit ainsi : « ${c.desc} ».`);
  clues.push(`Son nom commence par « ${c.name.replace(/^(Le|La|Les|L')\s*/i, "")[0].toUpperCase()} ».`);
  return clues;
}
const indicesPoints = () => Math.max(1, 10 - (game.shown - 1) - game.wrong);
function moreClue() {
  if (game.done || game.shown >= game.clues.length) return;
  game.shown++;
  sfx("tick");
  render();
}
function guessIndices(name) {
  if (game.done || !name.trim()) return;
  if (sameName(name, CHARS[game.secret])) {
    game.last = indicesPoints(); game.score += game.last; game.done = "win";
    orb.mood = "surprised"; orb.conf = 1; sfx("win");
    render();
    const m = document.querySelector(".medal"); if (m) confetti(m);
    return;
  }
  game.wrong++;
  sfx("wrong"); orb.mood = "happy";
  if (game.shown >= game.clues.length) return passIndices();
  game.shown++;
  render();
  say(pick(["Non ! Voici un indice de plus.", "Raté. Un autre indice ?", "Ce n'est pas ça."]));
}
function passIndices() {
  game.done = "lose"; game.last = 0;
  orb.mood = "happy"; sfx("lose");
  render();
}
GAMES.indices = {
  html() {
    const c = CHARS[game.secret];
    const head = `<span class="eyebrow">Manche ${game.round} sur ${ROUNDS_INDICES} · score ${game.score}</span>`;
    if (game.done) {
      say(game.done === "win" ? pick(["Bien trouvé !", "Bravo, rien ne t'échappe.", "Joli !"]) : pick(["Hé hé, celui-là était coriace.", "Dommage !"]));
      return `${head}
        ${medal(c)}
        <h1>${esc(c.name)}</h1>
        <p class="lede">${game.done === "win" ? `Trouvé avec ${game.shown} indice${game.shown > 1 ? "s" : ""} : <b>+${game.last} point${game.last > 1 ? "s" : ""}</b>.` : "Raté pour cette fois : 0 point."}</p>
        <div class="row"><button class="btn primary big" data-act="next" type="button">${game.round < ROUNDS_INDICES ? "Manche suivante" : "Voir mon score"}</button></div>`;
    }
    const pts = indicesPoints();
    say(game.shown === 1 ? pick(["Premier indice. Facile ?", "J'ai choisi. À toi !", "Voyons si tu me lis dans les pensées."]) : pick(["Ça t'aide ?", "Tu chauffes ?", "Allez…"]));
    return `${head}
      <h2 class="question">${WHOQ[mode]}</h2>
      <ol class="clues">${game.clues.slice(0, game.shown).map((t, k) => `<li class="${k === game.shown - 1 ? "new" : ""}"><span>${k + 1}</span>${esc(t)}</li>`).join("")}</ol>
      <form class="learn" id="indForm" autocomplete="off">
        <label for="indIn">${pts} point${pts > 1 ? "s" : ""} si tu trouves maintenant</label>
        <div class="guess-row"><input id="indIn" placeholder="${T().guessPh}"><button class="btn primary" type="submit">Proposer</button></div>
        <div class="sugg" id="indSugg"></div>
      </form>
      <div class="row">
        <button class="btn" data-act="clue" type="button" ${game.shown >= game.clues.length ? "disabled" : ""}>Un indice de plus (−1)</button>
        <button class="btn ghost" data-act="pass" type="button">Je passe</button>
      </div>`;
  },
  after() {
    const f = $("indForm");
    if (f) {
      f.onsubmit = e => { e.preventDefault(); guessIndices($("indIn").value); };
      $("indIn").oninput = () => nameSuggestions($("indIn"), $("indSugg"), guessIndices);
    }
  },
  act: { clue: moreClue, pass: passIndices, next: nextIndices }
};

/* ---------- L'Intrus ---------- */
function newIntrus() {
  game = { kind: "intrus", round: 0, score: 0, usedTraits: new Set(), answers: [], rejected: new Set() };
  nextIntrus();
}
function nextIntrus() {
  if (game.round >= ROUNDS_INTRUS) return endGame();
  const pool = famousPool();
  const world = WORLD[mode];
  for (let tries = 0; tries < 400; tries++) {
    const a = pick(KEYS);
    if (SKIP.has(a) || game.usedTraits.has(a) || ((MODE.know && MODE.know[a]) || 1) < 0.8) continue;
    if (mode === "personnage" && !INTRUS_PERSONNAGE.has(a)) continue;
    const yes = pool.filter(i => sureValue(CHARS[i], a) === 1);
    if (yes.length < 3 || yes.length > pool.length * 0.6) continue;
    // les trois du même monde (tous réels ou tous fictifs, tous films ou toutes séries…), et l'intrus aussi si possible
    const ref = pick(yes);
    const sameWorld = i => world.every(w => sureValue(CHARS[i], w) === sureValue(CHARS[ref], w));
    const kin = yes.filter(sameWorld);
    if (kin.length < 3) continue;
    const three = shuffled(kin).slice(0, 3);
    const no = pool.filter(i => sureValue(CHARS[i], a) === 0);
    const close = no.filter(sameWorld);
    if (!no.length) continue;
    const odd = pick(close.length ? close : no);
    game.usedTraits.add(a);
    Object.assign(game, { round: game.round + 1, trait: a, items: shuffled([...three, odd]), odd, picked: null });
    screen = "intrus"; orb.mood = "sure"; orb.conf = game.score / ROUNDS_INTRUS;
    sfx("start");
    return render();
  }
  endGame();
}
function pickIntrus(i) {
  if (game.picked !== null) return;
  game.picked = i;
  const ok = i === game.odd;
  if (ok) { game.score++; sfx("win"); orb.mood = "surprised"; } else { sfx("wrong"); orb.mood = "happy"; }
  orb.conf = game.score / ROUNDS_INTRUS;
  render();
}
GAMES.intrus = {
  html() {
    const done = game.picked !== null;
    const others = game.items.filter(i => i !== game.odd);
    const femme = others.every(i => CHARS[i].t.femme === 1);
    if (!done) say(pick(["Trois se ressemblent. Lequel détonne ?", "Cherche le point commun…", "Un seul n'a rien à faire là."]));
    else say(game.picked === game.odd ? pick(["Bien vu !", "Exactement.", "Rien ne t'échappe."]) : pick(["Raté !", "Presque…", "Hé non !"]));
    return `
      <span class="eyebrow">Manche ${game.round} sur ${ROUNDS_INTRUS} · score ${game.score}</span>
      <h2 class="question">Lequel est l'intrus ?</h2>
      <div class="cards4">${game.items.map(i => {
        const c = CHARS[i];
        const state = !done ? "" : i === game.odd ? "odd" : i === game.picked ? "wrong" : "dim";
        return `<button class="pickcard ${state}" type="button" data-i="${i}" ${done ? "disabled" : ""}>
          <span class="mini" style="background:${swatch(c.name)}">${esc(initials(c.name))}</span>
          <b>${esc(c.name)}</b><small>${esc(c.desc || "")}</small></button>`;
      }).join("")}</div>
      ${done ? `<p class="lede">Point commun des trois autres : <b>${esc(statement(QS[game.trait], femme))}</b><br>${esc(CHARS[game.odd].name)}, non.</p>
        <div class="row"><button class="btn primary big" data-act="next" type="button">${game.round < ROUNDS_INTRUS ? "Suivant" : "Voir mon score"}</button></div>` : ""}`;
  },
  after() {
    document.querySelectorAll(".pickcard").forEach(b => b.onclick = () => pickIntrus(+b.dataset.i));
  },
  act: { next: nextIntrus }
};

/* ---------- Fin de partie (les deux jeux) ---------- */
function endGame() {
  const max = game.kind === "indices" ? ROUNDS_INDICES * 10 : ROUNDS_INTRUS;
  game.max = max;
  game.record = saveBest(game.score);
  screen = "gameEnd"; orb.mood = game.score >= max * 0.6 ? "happy" : "sad"; orb.conf = game.score / max;
  sfx(game.score >= max * 0.6 ? "win" : "lose");
  render();
  if (game.record) { const m = document.querySelector(".score-big"); if (m) confetti(m); }
}
GAMES.gameEnd = {
  html() {
    const best = (mem.best && mem.best[bestKey()]) || game.score;
    say(game.record ? "Nouveau record !" : game.score >= game.max * 0.6 ? "Belle partie." : "Tu feras mieux la prochaine fois.");
    return `
      <span class="eyebrow">${game.kind === "indices" ? "Les Indices" : "L'Intrus"} · partie terminée</span>
      <div class="score-big">${game.score}<small>/ ${game.max}</small></div>
      <p class="lede">${game.record ? "C'est ton nouveau record pour ce thème." : `Ton record pour ce thème : ${best} / ${game.max}.`}</p>
      <div class="row"><button class="btn primary big" id="again" type="button">Rejouer</button><button class="btn" id="home" type="button">Changer de thème</button></div>`;
  }
};
