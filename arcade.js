/* D'autres jeux de culture, réunis sur la page « Changer de jeu » :
   Chronologie du cinéma, Le Pendu, Devine l'année. (Le Duel contre le Devin est dans duel.js.) */

const ARCADE_SCREENS = new Set(["chrono", "pendu", "annee", "arcadeEnd", "echecs", "sudoku", "calcul", "suites"]);
let arcadeLoop = null;
function stopArcade() { if (arcadeLoop) cancelAnimationFrame(arcadeLoop); arcadeLoop = null; }
function goGames() {
  stopArcade();
  game = null; busy = false; current = null; guessing = null;
  screen = "hub"; orb.mood = "idle"; orb.conf = 0.04;
  sfx("tick");
  render();
}
// petite note jouée à chaque prise, de plus en plus aiguë avec la série
function ping(freq, type = "triangle", dur = 0.18) {
  if (!mem.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    tone(freq, 0, dur, type, 0.06);
  } catch (e) {}
}
// record : le plus haut score, ou le plus petit nombre de coups
function arcadeRecord(key, value, lowerIsBetter) {
  mem.best = mem.best || {};
  const prev = mem.best[key];
  const better = prev === undefined || (lowerIsBetter ? value < prev : value > prev);
  if (better) { mem.best[key] = value; saveMem(); }
  return { better, best: better ? value : prev };
}
const bestOf = key => (mem.best || {})[key];

/* ---------- Page des jeux ---------- */
const GAME_LIST = [
  { go: "devin", cat: "culture", title: "Le Devin", kind: "Devinettes", text: "Il lit dans tes pensées, ou c'est toi qui le questionnes. Cinq façons de jouer, dont Les Indices et L'Intrus." },
  { go: "duel", cat: "culture", title: "Le Duel", kind: "Face au Devin", text: "Chacun choisit un secret. Questions à tour de rôle : le premier qui trouve le secret de l'autre gagne.", best: () => bestOf("duel") !== undefined ? `Victoires : ${bestOf("duel")}` : "" },
  { go: "pendu", cat: "culture", title: "Le Pendu", kind: "Mots", text: "Un titre de film, une célébrité ou une chose à reconstituer lettre par lettre. Sept erreurs permises, enchaîne les mots.", best: () => bestOf("pendu") !== undefined ? `Record : ${bestOf("pendu")} mots d'affilée` : "" },
  { go: "annee", cat: "culture", title: "Devine l'année", kind: "Culture", text: "Un film ou une série connu : en quelle année est-il sorti ? Plus tu es proche, plus tu marques. Dix manches.", best: () => bestOf("annee") !== undefined ? `Record : ${bestOf("annee")} / 1000` : "" },
  { go: "echecs", cat: "logique", title: "Échecs", kind: "Stratégie", text: "Une partie complète contre le Devin, avec roque, prise en passant et promotion. Trois niveaux.", best: () => bestOf("echecs") !== undefined ? `Victoires : ${bestOf("echecs")}` : "" },
  { go: "sudoku", cat: "logique", title: "Sudoku", kind: "Logique", text: "Une nouvelle grille à chaque fois, avec une seule solution. Trois niveaux, erreurs signalées.", best: () => { const b = ["facile", "moyen", "difficile"].filter(l => bestOf("sudoku-" + l) !== undefined).map(l => `${l} ${clock(bestOf("sudoku-" + l))}`); return b.length ? "Records : " + b.join(" · ") : ""; } },
  { go: "calcul", cat: "logique", title: "Calcul mental", kind: "Maths", text: "60 secondes pour enchaîner un maximum de calculs, de plus en plus corsés.", best: () => bestOf("calcul") !== undefined ? `Record : ${bestOf("calcul")} bonnes réponses` : "" },
  { go: "suites", cat: "logique", title: "Suites logiques", kind: "Logique", text: "2, 6, 18, 54… ? Trouve le nombre suivant, et découvre la règle. Dix manches.", best: () => bestOf("suites") !== undefined ? `Record : ${bestOf("suites")} / 10` : "" },
  { go: "chrono", cat: "culture", title: "Chronologie du cinéma", kind: "Culture", text: "Cinq films et séries connus : remets-les dans l'ordre de sortie, du plus ancien au plus récent. Dix manches.", best: () => bestOf("chrono") !== undefined ? `Record : ${bestOf("chrono")} / 50` : "" }
];
GAMES.hub = {
  free: true,
  html() {
    say(pick(["À quoi on joue ?", "J'ai plus d'un tour dans mon orbe.", "Choisis ton jeu."]));
    const tab = mem.hubTab === "logique" ? "logique" : "culture";
    return `
      <span class="eyebrow">Tous les jeux</span>
      <h1>À quoi veux-tu jouer ?</h1>
      <div class="modes" role="tablist" aria-label="Catégorie de jeux">
        <button class="mode" type="button" role="tab" data-act="tabCulture" aria-selected="${tab === "culture"}">Culture et devinettes</button>
        <button class="mode" type="button" role="tab" data-act="tabLogique" aria-selected="${tab === "logique"}">Logique et maths</button>
      </div>
      <div class="gamecards">${GAME_LIST.filter(g => g.cat === tab).map(g => `
        <button class="gamecard" type="button" data-act="${g.go}">
          <span class="tag">${g.kind}</span>
          <b>${g.title}</b>
          <small>${g.text}</small>
          ${g.best && g.best() ? `<em>${g.best()}</em>` : ""}
        </button>`).join("")}</div>`;
  },
  act: {
    devin: async () => { await ensureMode(mode); screen = "intro"; render(); },
    tabCulture: () => { mem.hubTab = "culture"; saveMem(); sfx("tick"); render(); },
    tabLogique: () => { mem.hubTab = "logique"; saveMem(); sfx("tick"); render(); },
    echecs: () => newChess(),
    sudoku: () => newSudoku(),
    calcul: () => newCalc(),
    suites: () => newSuites(),
    duel: async () => { await ensureMode(mode); newDuel(); },
    pendu: async () => { await loadData(DATA_FILE.oeuvre); newPendu(); },
    annee: async () => { await loadData(DATA_FILE.oeuvre); newAnnee(); },
    chrono: async () => { await loadData(DATA_FILE.oeuvre); newChrono(); }
  }
};

/* ---------- Fin de partie commune ---------- */
function endArcade(kind, value, label, lowerIsBetter, key = kind) {
  stopArcade();
  const rec = arcadeRecord(key, value, lowerIsBetter);
  game = { kind, arcadeEnd: true, value, label, rec };
  screen = "arcadeEnd"; orb.mood = rec.better ? "happy" : "idle";
  sfx(rec.better ? "win" : "guess");
  render();
  if (rec.better) { const m = document.querySelector(".score-big"); if (m) confetti(m); }
}
GAMES.arcadeEnd = {
  html() {
    const g = GAME_LIST.find(x => x.go === game.kind);
    say(game.rec.better ? "Nouveau record !" : "Encore une ?");
    return `
      <span class="eyebrow">${g.title} · partie terminée</span>
      <div class="score-big">${game.kind === "sudoku" ? clock(game.value) : game.value}<small>${game.kind === "sudoku" ? "" : game.label}</small></div>
      <p class="lede">${game.kind === "sudoku" ? "Grille terminée. " : ""}${game.rec.better ? "C'est ton nouveau record." : `Ton record : ${game.kind === "sudoku" ? clock(game.rec.best) : game.rec.best + " " + game.label.trim()}.`}</p>
      <div class="row"><button class="btn primary big" type="button" data-act="again">Rejouer</button><button class="btn" type="button" data-act="games">Changer de jeu</button></div>`;
  },
  act: {
    again: () => ({ pendu: newPendu, annee: newAnnee, chrono: newChrono, sudoku: newSudoku, calcul: newCalc, suites: newSuites }[game.kind])(),
    games: () => goGames()
  }
};

/* ---------- Chronologie du cinéma ---------- */
const CHRONO_ROUNDS = 10, CHRONO_CARDS = 5;
// les titres connus de tous, avec leur année de sortie (surtout les plus répandus, pour mêler classiques et nouveautés)
function chronoPool() {
  const data = typeof OEUVRES_DATA !== "undefined" ? OEUVRES_DATA : [];
  return data.filter(e => e[5] > 1900).map(([name, desc, sl, tags, hot = 0, year]) => ({ name, desc, year, fame: sl + 4 * hot, serie: / serie( |$)/.test(" " + tags + " ") }))
    .sort((a, b) => b.fame - a.fame).slice(0, 400);
}
function newChrono() {
  stopArcade();
  game = { kind: "chrono", round: 0, score: 0, used: new Set(), pool: chronoPool() };
  nextChrono();
}
function nextChrono() {
  if (game.round >= CHRONO_ROUNDS) return endArcade("chrono", game.score, " / 50");
  // cinq titres d'années toutes différentes
  let cards = [];
  for (let tries = 0; tries < 50 && cards.length < CHRONO_CARDS; tries++) {
    cards = [];
    for (const c of shuffled(game.pool)) {
      if (game.used.has(c.name) || cards.some(x => x.year === c.year)) continue;
      cards.push(c);
      if (cards.length === CHRONO_CARDS) break;
    }
  }
  if (cards.length < CHRONO_CARDS) return goGames();   // données incomplètes (ancienne version en cache)
  cards.forEach(c => game.used.add(c.name));
  Object.assign(game, { round: game.round + 1, cards, order: [], checked: false });
  screen = "chrono";
  render();
}
// numéros posés sur les cartes et boutons, mis à jour sur place
function chronoPaint() {
  document.querySelectorAll(".ccard").forEach(b => {
    const pos = game.order.indexOf(b.dataset.n);
    b.classList.toggle("set", pos >= 0);
    b.querySelector(".num").textContent = pos >= 0 ? pos + 1 : "";
  });
  const check = document.querySelector('[data-act="check"]'), reset = document.querySelector('[data-act="reset"]');
  if (check) check.disabled = game.order.length < CHRONO_CARDS;
  if (reset) reset.disabled = !game.order.length;
}
GAMES.chrono = {
  html() {
    const sorted = game.cards.slice().sort((a, b) => a.year - b.year);
    if (!game.checked) say(game.order.length ? "" : pick(["Du plus ancien au plus récent.", "Lequel est sorti en premier ?"]));
    return `
      <span class="eyebrow">Manche ${game.round} sur ${CHRONO_ROUNDS} · score ${game.score}</span>
      <h2 class="question">${game.checked ? "Le bon ordre" : "Touche-les du plus ancien au plus récent"}</h2>
      <div class="chrono">${(game.checked ? sorted : game.cards).map(c => {
        const pos = game.order.indexOf(c.name);
        const right = game.checked && sorted[pos] === c;
        return `<button class="ccard ${pos >= 0 ? "set" : ""} ${game.checked ? (right ? "right" : "wrong") : ""}" type="button" data-n="${esc(c.name)}" ${game.checked ? "disabled" : ""}>
          <span class="num">${game.checked ? c.year : pos >= 0 ? pos + 1 : ""}</span>
          <b>${esc(c.name)}</b><small>${c.serie ? "Série" : "Film"}${game.checked && pos >= 0 ? ` · tu l'avais mis ${pos + 1}${pos ? "e" : "er"}` : ""}</small></button>`;
      }).join("")}</div>
      ${game.checked ? `<p class="lede">${game.last} bien placé${game.last > 1 ? "s" : ""} sur ${CHRONO_CARDS}.</p>
        <div class="row"><button class="btn primary big" type="button" data-act="next">${game.round < CHRONO_ROUNDS ? "Manche suivante" : "Voir mon score"}</button></div>`
        : `<div class="row"><button class="btn primary big" type="button" data-act="check" ${game.order.length < CHRONO_CARDS ? "disabled" : ""}>Valider</button>
           <button class="btn ghost" type="button" data-act="reset" ${game.order.length ? "" : "disabled"}>Recommencer</button></div>`}`;
  },
  after() {
    document.querySelectorAll(".ccard").forEach(b => b.onclick = () => {
      const n = b.dataset.n, k = game.order.indexOf(n);
      if (k >= 0) game.order.splice(k, 1); else game.order.push(n);
      ping(400 + game.order.length * 80, "sine", 0.1);
      chronoPaint();
    });
  },
  act: {
    reset: () => { game.order = []; chronoPaint(); },
    check: () => {
      const sorted = game.cards.slice().sort((a, b) => a.year - b.year);
      game.last = game.order.filter((n, k) => sorted[k].name === n).length;
      game.score += game.last; game.checked = true;
      sfx(game.last >= 4 ? "win" : game.last >= 2 ? "guess" : "wrong");
      orb.mood = game.last >= 4 ? "happy" : "idle";
      say(game.last === CHRONO_CARDS ? "Parfait !" : game.last >= 3 ? "Pas mal du tout." : "Le cinéma, c'est compliqué.");
      render();
    },
    next: () => nextChrono()
  }
};

/* ---------- Le Pendu ---------- */
// des noms connus de tous : titres de films et séries, célébrités et personnages, choses du quotidien
const PENDU_LIVES = 7;
const plainUpper = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
function penduPool() {
  const fit = name => { const letters = plainUpper(name).replace(/[^A-Z]/g, ""); return letters.length >= 4 && name.length <= 30 && letters.length / name.length > 0.7; };
  const films = chronoPool().slice(0, 250).map(c => ({ word: c.name, kind: c.serie ? "Une série" : "Un film", hint: c.desc }));
  const people = PERSONNAGES.map(s => s.split("|")).filter(([, , t = ""]) => !/(^| )(proche|famille|toi)( |$)/.test(t))
    .map(([name, desc, t = ""]) => ({ word: name, kind: /(^| )(reel|vivant)( |$)/.test(t) ? "Une personne réelle" : "Un personnage de fiction", hint: desc }));
  const things = CHOSES.map(s => s.split("|")).map(([name, desc]) => ({ word: name, kind: "Une chose (animal, objet, aliment…)", hint: desc }));
  return [...films, ...people, ...things].filter(x => fit(x.word));
}
function newPendu() {
  game = { kind: "pendu", streak: 0, used: new Set(), pool: penduPool() };
  nextPendu();
}
function nextPendu() {
  const item = pick(game.pool.filter(x => !game.used.has(x.word)));
  game.used.add(item.word);
  Object.assign(game, { item, letters: new Set(), misses: 0, done: null });
  screen = "pendu"; orb.mood = "idle"; orb.conf = 1;
  render();
}
const penduSolved = () => [...plainUpper(game.item.word)].every(ch => !/[A-Z]/.test(ch) || game.letters.has(ch));
function penduLetter(L) {
  if (game.done || game.letters.has(L)) return;
  game.letters.add(L);
  if (plainUpper(game.item.word).includes(L)) {
    ping(500 + game.letters.size * 20, "sine", 0.12);
    if (penduSolved()) {
      game.streak++; game.done = "win";
      orb.mood = "surprised"; sfx("win");
      render();
      const m = document.querySelector(".word"); if (m) confetti(m);
      return;
    }
  } else {
    game.misses++;
    sfx("wrong"); orb.kick = 1;
    orb.mood = game.misses >= PENDU_LIVES - 2 ? "sad" : "think";
    if (game.misses >= PENDU_LIVES) { game.done = "lose"; sfx("lose"); }
  }
  orb.conf = 1 - game.misses / PENDU_LIVES;
  // la manche continue : seules les pièces qui changent sont mises à jour ; elle se termine : on affiche la suite
  if (game.done) render(); else penduPaint(L);
}
// le mot (cases et lettres trouvées) et les essais restants
function penduWord() {
  return [...game.item.word].map(ch => {
    const u = plainUpper(ch);
    if (!/[A-Z]/.test(u)) return ch === " " ? '<span class="gap"></span>' : `<span class="sym">${esc(ch)}</span>`;
    const shown = game.letters.has(u) || game.done;
    return `<span class="slot ${shown ? "on" : ""} ${game.done === "lose" && !game.letters.has(u) ? "missed" : ""}">${shown ? esc(ch.toUpperCase()) : ""}</span>`;
  }).join("");
}
const penduLives = () => Array.from({ length: PENDU_LIVES }, (_, k) => `<i class="${k < PENDU_LIVES - game.misses ? "on" : ""}"></i>`).join("");
const penduHint = () => (game.misses >= 4 && game.item.hint ? `Indice : « ${esc(game.item.hint)} »` : "");
// met à jour le mot, les essais et la touche jouée sur place
function penduPaint(L) {
  $("pdWord").innerHTML = penduWord();
  $("pdLives").innerHTML = penduLives();
  $("pdLives").setAttribute("aria-label", `${PENDU_LIVES - game.misses} essais restants`);
  $("pdHint").innerHTML = penduHint();
  const k = document.querySelector(`.key[data-l="${L}"]`);
  if (k) { k.disabled = true; k.classList.add(plainUpper(game.item.word).includes(L) ? "good" : "bad"); }
  say(game.misses >= PENDU_LIVES - 2 ? "Attention, ma lumière faiblit…" : "");
}
GAMES.pendu = {
  html() {
    const word = penduWord(), lives = penduLives();
    if (!game.done) say(game.misses === 0 && !game.letters.size ? "Trouve le nom caché, lettre par lettre." : game.misses >= PENDU_LIVES - 2 ? "Attention, ma lumière faiblit…" : "");
    else say(game.done === "win" ? pick(["Bravo !", "Bien joué.", "Rien ne t'échappe."]) : "Perdu !");
    return `
      <span class="eyebrow">Série en cours : ${game.streak} mot${game.streak > 1 ? "s" : ""}</span>
      <span class="tag">${esc(game.item.kind)}</span>
      <div class="word" id="pdWord">${word}</div>
      <div class="lives" id="pdLives" aria-label="${PENDU_LIVES - game.misses} essais restants">${lives}</div>
      <p class="lede" id="pdHint">${game.done ? "" : penduHint()}</p>
      ${game.done ? `<div class="row"><button class="btn primary big" type="button" data-act="${game.done === "win" ? "next" : "end"}">${game.done === "win" ? "Mot suivant" : "Voir mon score"}</button></div>`
        : `<div class="keys">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(L => {
            const used = game.letters.has(L), good = used && plainUpper(game.item.word).includes(L);
            return `<button class="key ${used ? (good ? "good" : "bad") : ""}" type="button" data-l="${L}" ${used ? "disabled" : ""}>${L}</button>`;
          }).join("")}</div>`}`;
  },
  after() {
    document.querySelectorAll(".key").forEach(b => b.onclick = () => penduLetter(b.dataset.l));
  },
  act: { next: () => nextPendu(), end: () => endArcade("pendu", game.streak, " mots") }
};
// clavier physique
document.addEventListener("keydown", e => {
  if (screen !== "pendu" || !game || game.done || e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey) return;
  const L = plainUpper(e.key);
  if (/^[A-Z]$/.test(L)) penduLetter(L);
});

/* ---------- Devine l'année ---------- */
// Entrée valide (ou passe à la suite), les flèches ajustent l'année
document.addEventListener("keydown", e => {
  if (screen !== "annee" || !game || game.kind !== "annee" || e.target.tagName === "SELECT") return;
  const acts = GAMES.annee.act;
  if (e.key === "Enter") { e.preventDefault(); game.done ? acts.next() : acts.check(); }
  else if (!game.done && e.target.id !== "yearIn" && (e.key === "ArrowLeft" || e.key === "ArrowDown")) { e.preventDefault(); acts.minus(); }
  else if (!game.done && e.target.id !== "yearIn" && (e.key === "ArrowRight" || e.key === "ArrowUp")) { e.preventDefault(); acts.plus(); }
});
const YEAR_ROUNDS = 10, YEAR_MIN = 1920, YEAR_MAX = new Date().getFullYear();
const GENRES = [["comedie", "comédie"], ["drame", "drame"], ["action", "action"], ["horreur", "horreur"], ["sf", "science-fiction"],
  ["fantastique", "fantastique"], ["animation", "animation"], ["policier", "policier"], ["romance", "romance"], ["superheros", "super-héros"], ["guerre", "guerre"], ["western", "western"]];
function newAnnee() {
  const pool = chronoPool();
  const tags = new Map((typeof OEUVRES_DATA !== "undefined" ? OEUVRES_DATA : []).map(e => [e[0], " " + e[3] + " "]));
  game = { kind: "annee", round: 0, score: 0, items: shuffled(pool).slice(0, YEAR_ROUNDS).map(c => ({ ...c, genres: GENRES.filter(([k]) => (tags.get(c.name) || "").includes(" " + k + " ")).map(([, l]) => l).slice(0, 2) })) };
  if (game.items.length < YEAR_ROUNDS) return goGames();
  nextAnnee();
}
function nextAnnee() {
  if (game.round >= YEAR_ROUNDS) return endArcade("annee", game.score, " / 1000");
  Object.assign(game, { round: game.round + 1, item: game.items[game.round], guess: 2000, done: false, last: 0 });
  screen = "annee"; orb.mood = "idle";
  render();
}
GAMES.annee = {
  html() {
    const it = game.item;
    const diff = Math.abs(game.guess - it.year);
    if (!game.done) say(pick(["En quelle année ?", "Fais confiance à ta mémoire.", "Plutôt récent, ou vieux classique ?"]));
    else say(diff === 0 ? "L'année exacte !" : diff <= 2 ? "Tout près !" : diff <= 6 ? "Pas mal." : "Raté de loin.");
    return `
      <span class="eyebrow">Manche ${game.round} sur ${YEAR_ROUNDS} · score ${game.score}</span>
      <span class="tag">${it.serie ? "Série" : "Film"}${it.genres.length ? " · " + it.genres.join(", ") : ""}</span>
      <h2 class="question">${esc(it.name)}</h2>
      <div class="year-big" id="yearBig">${game.guess}</div>
      ${game.done ? `<p class="lede">Sorti en <b>${it.year}</b> : ${diff === 0 ? "dans le mille" : `écart de ${diff} an${diff > 1 ? "s" : ""}`}, <b>+${game.last} points</b>.</p>
        <div class="row"><button class="btn primary big" type="button" data-act="next">${game.round < YEAR_ROUNDS ? "Suivant" : "Voir mon score"}</button></div>`
        : `<input class="year-range" id="yearIn" type="range" min="${YEAR_MIN}" max="${YEAR_MAX}" step="1" value="${game.guess}" aria-label="Année de sortie">
           <div class="year-scale"><span>${YEAR_MIN}</span><span>${YEAR_MAX}</span></div>
           <div class="row"><button class="btn" type="button" data-act="minus">−1</button><button class="btn primary big" type="button" data-act="check">Valider</button><button class="btn" type="button" data-act="plus">+1</button></div>
           <p class="hint-line">Glisse le curseur, ou utilise les flèches du clavier et Entrée.</p>`}`;
  },
  after() {
    const r = $("yearIn");
    if (r) r.oninput = () => { game.guess = +r.value; $("yearBig").textContent = game.guess; };
  },
  act: {
    minus: () => { game.guess = Math.max(YEAR_MIN, game.guess - 1); $("yearIn").value = game.guess; $("yearBig").textContent = game.guess; },
    plus: () => { game.guess = Math.min(YEAR_MAX, game.guess + 1); $("yearIn").value = game.guess; $("yearBig").textContent = game.guess; },
    check: () => {
      const diff = Math.abs(game.guess - game.item.year);
      game.last = Math.max(0, 100 - 8 * diff);
      game.score += game.last; game.done = true;
      sfx(diff <= 2 ? "win" : diff <= 6 ? "guess" : "wrong");
      orb.mood = diff <= 2 ? "happy" : "idle";
      render();
    },
    next: () => nextAnnee()
  }
};

