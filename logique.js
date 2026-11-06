/* Jeux de logique et de maths (onglet « Logique et maths ») : Sudoku, Calcul mental, Suites logiques.
   Les échecs sont dans echecs.js. */

/* ---------- Sudoku ---------- */
const SUDOKU_HOLES = { facile: 38, moyen: 47, difficile: 54 };
const peersOf = (() => {
  const out = [];
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3, set = new Set();
    for (let k = 0; k < 9; k++) { set.add(r * 9 + k); set.add(k * 9 + c); set.add((br + Math.floor(k / 3)) * 9 + bc + k % 3); }
    set.delete(i); out.push([...set]);
  }
  return out;
})();
// nombre de solutions (on s'arrête à « limit ») ; remplit la grille si « fill » et qu'une solution existe
function sudokuCount(grid, limit = 2, fill = false, random = false) {
  let best = -1, bestOpts = null;
  for (let i = 0; i < 81; i++) {
    if (grid[i]) continue;
    const used = new Set(peersOf[i].map(j => grid[j]));
    const opts = [];
    for (let d = 1; d <= 9; d++) if (!used.has(d)) opts.push(d);
    if (!opts.length) return 0;
    if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; if (opts.length === 1) break; }
  }
  if (best < 0) return 1;
  let n = 0;
  for (const d of random ? shuffled(bestOpts) : bestOpts) {
    grid[best] = d;
    n += sudokuCount(grid, limit - n, fill, random);
    if (n >= limit || (fill && n)) { if (!fill) grid[best] = 0; return n; }
  }
  grid[best] = 0;
  return n;
}
function makeSudoku(level) {
  const solution = Array(81).fill(0);
  sudokuCount(solution, 1, true, true);
  const puzzle = solution.slice();
  let holes = 0;
  // on retire des chiffres tant que la grille garde une seule solution
  for (const i of shuffled([...Array(81).keys()])) {
    if (holes >= SUDOKU_HOLES[level]) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (sudokuCount(puzzle.slice(), 2) !== 1) puzzle[i] = keep; else holes++;
  }
  return { puzzle, solution };
}
function newSudoku() {
  const level = mem.sudokuLevel in SUDOKU_HOLES ? mem.sudokuLevel : "moyen";
  const { puzzle, solution } = makeSudoku(level);
  game = { kind: "sudoku", level, given: puzzle.map(Boolean), cells: puzzle.slice(), solution, sel: puzzle.indexOf(0), errors: 0, t0: performance.now() };
  screen = "sudoku"; orb.mood = "sure";
  render();
}
const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function sudokuPut(d) {
  const i = game.sel;
  if (i < 0 || game.given[i] || game.done) return;
  game.cells[i] = d;
  if (d && d !== game.solution[i]) { game.errors++; sfx("wrong"); }
  else if (d) ping(500 + d * 30, "sine", 0.1);
  if (game.cells.every((v, k) => v === game.solution[k])) {
    game.done = true;
    const secs = Math.round((performance.now() - game.t0) / 1000);
    sudokuPaint();
    return setTimeout(() => screen === "sudoku" && endArcade("sudoku", secs, " s", true, `sudoku-${game.level}`), 600);
  }
  sudokuPaint();
}
// classes d'une case : donnée, sélectionnée, même ligne/colonne/bloc, même chiffre, erreur, bordures des blocs
function cellClass(i) {
  const sel = game.sel, v = game.cells[i], r = Math.floor(i / 9), c = i % 9;
  return ["cell", game.given[i] ? "given" : "", i === sel ? "sel" : sel >= 0 && peersOf[sel].includes(i) ? "peer" : "",
    v && sel >= 0 && v === game.cells[sel] ? "same" : "", v && !game.given[i] && v !== game.solution[i] ? "err" : "",
    c % 3 === 2 && c < 8 ? "br" : "", r % 3 === 2 && r < 8 ? "bb" : ""].join(" ");
}
const cellLabel = i => `Ligne ${Math.floor(i / 9) + 1}, colonne ${i % 9 + 1}${game.cells[i] ? ", " + game.cells[i] : ", vide"}`;
// met à jour la grille sur place, sans la reconstruire
function sudokuPaint() {
  document.querySelectorAll(".cell").forEach(b => {
    const i = +b.dataset.i;
    b.className = cellClass(i);
    b.textContent = game.cells[i] || "";
    b.setAttribute("aria-label", cellLabel(i));
  });
  const e = $("sdErr"); if (e) e.textContent = game.errors;
}
GAMES.sudoku = {
  html() {
    say("");
    return `
      <div class="hud"><span>Niveau <b>${game.level}</b></span><span>Temps <b id="sdTime">${clock(Math.round((performance.now() - game.t0) / 1000))}</b></span><span>Erreurs <b id="sdErr">${game.errors}</b></span></div>
      <div class="sudoku" role="grid" aria-label="Grille de sudoku">${game.cells.map((v, i) =>
        `<button class="${cellClass(i)}" type="button" data-i="${i}" aria-label="${cellLabel(i)}">${v || ""}</button>`).join("")}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="key" type="button" data-d="${d}">${d}</button>`).join("")}<button class="key wide" type="button" data-d="0">Effacer</button></div>
      <div class="row"><label class="level">Niveau
        <select id="sdLevel">${Object.keys(SUDOKU_HOLES).map(l => `<option value="${l}" ${l === game.level ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <button class="btn ghost" type="button" data-act="fresh">Nouvelle grille</button></div>`;
  },
  after() {
    document.querySelectorAll(".cell").forEach(b => b.onclick = () => { game.sel = +b.dataset.i; sudokuPaint(); });
    document.querySelectorAll(".pad .key").forEach(b => b.onclick = () => sudokuPut(+b.dataset.d));
    const s = $("sdLevel");
    if (s) s.onchange = () => { mem.sudokuLevel = s.value; saveMem(); newSudoku(); };
    clearInterval(GAMES.sudoku.timer);
    GAMES.sudoku.timer = setInterval(() => {
      if (screen !== "sudoku" || !game || game.done) return clearInterval(GAMES.sudoku.timer);
      const el = $("sdTime"); if (el) el.textContent = clock(Math.round((performance.now() - game.t0) / 1000));
    }, 500);
  },
  act: { fresh: () => newSudoku() }
};
document.addEventListener("keydown", e => {
  if (screen !== "sudoku" || !game || game.done || e.target.tagName === "SELECT") return;
  if (/^[1-9]$/.test(e.key)) sudokuPut(+e.key);
  else if (["Backspace", "Delete", "0"].includes(e.key)) { e.preventDefault(); sudokuPut(0); }
  else {
    const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key];
    if (mv) { e.preventDefault(); game.sel = Math.min(80, Math.max(0, (game.sel < 0 ? 0 : game.sel) + mv)); sudokuPaint(); }
  }
});

/* ---------- Calcul mental ---------- */
const CALC_TIME = 60;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// des calculs de plus en plus durs à mesure que le score monte
function makeCalc(level) {
  const kinds = level < 4 ? ["+", "-"] : level < 8 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
  const op = pick(kinds), big = level >= 12;
  if (op === "+") { const a = rnd(2, big ? 99 : 20 + level * 3), b = rnd(2, big ? 99 : 20 + level * 3); return [`${a} + ${b}`, a + b]; }
  if (op === "-") { const a = rnd(10, big ? 150 : 30 + level * 4), b = rnd(1, a); return [`${a} − ${b}`, a - b]; }
  if (op === "×") { const a = rnd(2, big ? 15 : 10), b = rnd(2, big ? 25 : 10); return [`${a} × ${b}`, a * b]; }
  const b = rnd(2, big ? 15 : 10), q = rnd(2, big ? 15 : 10); return [`${b * q} ÷ ${b}`, q];
}
function newCalc() {
  game = { kind: "calcul", score: 0, t0: performance.now(), flash: null };
  [game.q, game.answer] = makeCalc(0);
  screen = "calcul"; orb.mood = "sure";
  render();
}
function calcSubmit(v) {
  if (v.trim() === "") return;
  if (+v === game.answer) { game.score++; game.flash = "ok"; ping(520 + Math.min(game.score, 20) * 20, "triangle", 0.1); orb.kick = 1; }
  else { game.flash = `${game.q} = ${game.answer}`; sfx("wrong"); }
  [game.q, game.answer] = makeCalc(game.score);
  $("calcQ").textContent = `${game.q} = ?`;
  $("clScore").textContent = game.score;
  const msg = $("calcMsg");
  msg.textContent = game.flash === "ok" ? "Juste !" : `Non : ${game.flash}`;
  msg.classList.toggle("bad", game.flash !== "ok");
  const input = $("calcIn"); input.value = ""; input.focus();
}
GAMES.calcul = {
  html() {
    say("");
    const left = Math.max(0, CALC_TIME - Math.floor((performance.now() - game.t0) / 1000));
    return `
      <div class="hud"><span>Temps <b id="clTime">${left}</b></span><span>Bonnes réponses <b id="clScore">${game.score}</b></span></div>
      <div class="calc-q" id="calcQ">${game.q} = ?</div>
      <form class="calc-form" id="calcForm" autocomplete="off">
        <input id="calcIn" inputmode="numeric" pattern="[0-9]*" aria-label="Ta réponse" placeholder="?">
        <button class="btn primary big" type="submit">Valider</button>
      </form>
      <p class="hint-line ${game.flash && game.flash !== "ok" ? "bad" : ""}" id="calcMsg" aria-live="polite">${game.flash === "ok" ? "Juste !" : game.flash ? `Non : ${esc(game.flash)}` : "Tape le résultat puis Entrée."}</p>`;
  },
  after() {
    const input = $("calcIn");
    input.focus();
    $("calcForm").onsubmit = e => { e.preventDefault(); calcSubmit(input.value); };
    clearInterval(GAMES.calcul.timer);
    GAMES.calcul.timer = setInterval(() => {
      if (screen !== "calcul" || !game || game.kind !== "calcul") return clearInterval(GAMES.calcul.timer);
      const left = Math.max(0, CALC_TIME - Math.floor((performance.now() - game.t0) / 1000));
      const el = $("clTime"); if (el) el.textContent = left;
      if (left <= 0) { clearInterval(GAMES.calcul.timer); endArcade("calcul", game.score, " bonnes réponses"); }
    }, 250);
  }
};

/* ---------- Suites logiques ---------- */
const SUITES_ROUNDS = 10;
// chaque générateur renvoie [termes, suivant, explication] ; classés du plus simple au plus retors
const SUITES = [
  () => { const a = rnd(1, 20), d = rnd(2, 9); const t = [0, 1, 2, 3, 4, 5].map(n => a + n * d); return [t, `On ajoute ${d} à chaque fois.`]; },
  () => { const a = rnd(60, 120), d = rnd(3, 11); const t = [0, 1, 2, 3, 4, 5].map(n => a - n * d); return [t, `On retire ${d} à chaque fois.`]; },
  () => { const a = rnd(1, 4), q = rnd(2, 3); const t = [0, 1, 2, 3, 4, 5].map(n => a * q ** n); return [t, `On multiplie par ${q} à chaque fois.`]; },
  () => { const k = rnd(1, 6); const t = [0, 1, 2, 3, 4, 5].map(n => (n + k) ** 2); return [t, `Ce sont les carrés : ${k}², ${k + 1}², ${k + 2}²…`]; },
  () => { const a = rnd(1, 10), d = rnd(1, 4); const t = [a]; for (let n = 0; n < 5; n++) t.push(t[n] + d + n); return [t, `On ajoute ${d}, puis ${d + 1}, puis ${d + 2}… un de plus à chaque fois.`]; },
  () => { const a = rnd(1, 5), b = rnd(1, 6); const t = [a, b]; while (t.length < 6) t.push(t[t.length - 1] + t[t.length - 2]); return [t, "Chaque nombre est la somme des deux précédents."]; },
  () => { const a = rnd(1, 9), x = rnd(2, 6); const t = [a]; for (let n = 0; n < 5; n++) t.push(n % 2 ? t[n] * 2 : t[n] + x); return [t, `On alterne : +${x}, puis ×2.`]; },
  () => { const a = rnd(1, 9), b = rnd(20, 40), d = rnd(2, 5), e = rnd(2, 5); const t = [a, b, a + d, b + e, a + 2 * d, b + 2 * e]; return [t, `Deux suites mêlées : une sur deux augmente de ${d}, l'autre de ${e}.`]; },
  () => { const a = rnd(1, 6); const t = [a]; for (let n = 0; n < 5; n++) t.push(t[n] * 2 + 1); return [t, "On multiplie par 2 et on ajoute 1."]; },
  () => { const P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53], s = rnd(0, 9); return [P.slice(s, s + 6), "Ce sont les nombres premiers à la suite."]; },
  () => { const k = rnd(1, 3); const t = [0, 1, 2, 3, 4, 5].map(n => (n + k) ** 3); return [t, "Ce sont les cubes."]; },
  () => { const a = rnd(2, 6); const t = [0, 1, 2, 3, 4, 5].map(n => a * (n + 1) * (n + 2) / 2); return [t, `Ce sont ${a} fois les nombres triangulaires (1, 3, 6, 10…).`]; }
];
function newSuites() {
  game = { kind: "suites", round: 0, score: 0 };
  nextSuite();
}
function nextSuite() {
  if (game.round >= SUITES_ROUNDS) return endArcade("suites", game.score, " / 10");
  // les premières manches piochent parmi les suites simples, puis on élargit
  const max = Math.min(SUITES.length, 4 + game.round);
  const [t, explain] = SUITES[rnd(0, max - 1)]();
  Object.assign(game, { round: game.round + 1, shown: t.slice(0, 5), next: t[5], explain, answered: null });
  screen = "suites"; orb.mood = "sure";
  render();
}
GAMES.suites = {
  html() {
    if (game.answered === null) say(pick(["Quel nombre vient ensuite ?", "Trouve la logique.", "Facile… ou pas ?"]));
    else say(game.answered === game.next ? "Exactement !" : "Raté.");
    return `
      <span class="eyebrow">Manche ${game.round} sur ${SUITES_ROUNDS} · score ${game.score}</span>
      <div class="calc-q seq">${game.shown.join(", ")}, <b>${game.answered === null ? "?" : game.next}</b></div>
      ${game.answered === null ? `<form class="calc-form" id="seqForm" autocomplete="off">
          <input id="seqIn" inputmode="numeric" aria-label="Nombre suivant" placeholder="?"><button class="btn primary big" type="submit">Valider</button></form>`
        : `<p class="lede">${game.answered === game.next ? "Bien vu." : `Tu as répondu ${game.answered}.`} ${esc(game.explain)}</p>
           <div class="row"><button class="btn primary big" type="button" data-act="next">${game.round < SUITES_ROUNDS ? "Suivante" : "Voir mon score"}</button></div>`}`;
  },
  after() {
    const f = $("seqForm");
    if (f) {
      $("seqIn").focus();
      f.onsubmit = e => {
        e.preventDefault();
        const v = $("seqIn").value.trim();
        if (v === "" || isNaN(+v)) return;
        game.answered = +v;
        if (game.answered === game.next) { game.score++; sfx("win"); } else sfx("wrong");
        render();
      };
    }
  },
  act: { next: () => nextSuite() }
};
