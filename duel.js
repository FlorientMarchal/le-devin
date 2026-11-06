/* Le Duel : le joueur et le Devin choisissent chacun un secret, puis s'interrogent à tour de rôle.
   Côté Devin : game.answers / game.rejected (ce qu'il sait du secret du joueur), comme dans « Le Devin devine ».
   Côté joueur : game.mine / game.myRejected (ce qu'il sait du secret du Devin), comme dans « Tu devines ». */

function newDuel() {
  game = {
    kind: "duel", secret: pick(famousPool()), turn: "you",
    answers: [], rejected: new Set(), guesses: 0, nextForced: 25,     // le Devin
    mine: [], myRejected: new Set(), myGuesses: 0,                    // le joueur
    last: null, devinLast: null, devinMove: null, winner: null
  };
  screen = "duel"; orb.mood = "sure"; orb.conf = 0.04;
  sfx("start");
  render();
}
// calcule quelque chose du point de vue du joueur (ses réponses à lui)
function asPlayer(fn) {
  const a = game.answers, r = game.rejected;
  game.answers = game.mine; game.rejected = game.myRejected;
  try { return fn(); } finally { game.answers = a; game.rejected = r; }
}

/* ---------- Tour du joueur ---------- */
function duelQuestion(text) {
  text = text.trim();
  if (!text || game.turn !== "you" || game.winner) return;
  const named = detectName(text, candidates());
  if (named !== null) return duelGuess(CHARS[named].name);
  const { keys, close } = understand(text, mode, QS);
  if (!keys.length) {
    say(pick(["Je n'ai pas compris ta question.", "Pose-la autrement ?"]));
    $("duelHint").textContent = close.length ? "Tu voulais dire : " + close.map(k => `« ${QS[k]} »`).join(", ") : "Essaie avec d'autres mots.";
    return;
  }
  const items = keys.map(attr => {
    const prev = game.mine.find(a => a.attr === attr);
    if (prev) return { attr, label: prev.label, c: prev.c };
    const r = reply(attr);
    game.mine.push({ attr, w: r.w, label: r.label, c: r.c, inferred: [] });
    return { attr, ...r };
  });
  game.last = { text, items };
  sfx("answer", items[0].label === "Oui" ? 1 : items[0].label === "Non" ? 0 : 0.5);
  game.turn = "devin"; game.devinMove = null;
  render();
}
function duelGuess(name) {
  if (game.turn !== "you" || game.winner || !name.trim()) return;
  const i = BY_NAME.has(name) ? BY_NAME.get(name) : CHARS.findIndex(c => norm(c.name) === norm(name));
  game.myGuesses++;
  if (i === game.secret) return duelEnd("you");
  if (i >= 0) game.myRejected.add(CHARS[i].name);
  game.last = { text: name, items: [], miss: i >= 0 ? CHARS[i].name : name };
  sfx("wrong"); orb.mood = "happy";
  game.turn = "devin"; game.devinMove = null;
  render();
}

/* ---------- Tour du Devin ---------- */
function devinMove() {
  if (game.devinMove) return game.devinMove;
  const post = posterior();
  const top = ranked(post, 2);
  const n = game.answers.length;
  if (!top.length || n >= MAX_Q) return (game.devinMove = { type: "giveup" });
  const p1 = post[top[0]], p2 = top[1] !== undefined ? post[top[1]] : 0;
  orb.conf = p1;
  if (((p1 > 0.8 || (p1 > 0.6 && p1 > 6 * p2)) && n >= 6) || n >= game.nextForced) return (game.devinMove = { type: "guess", i: top[0] });
  const q = pickQuestion(post);
  return (game.devinMove = q ? { type: "question", attr: q } : { type: "guess", i: top[0] });
}
function duelAnswer(w) {
  const m = game.devinMove;
  if (game.turn !== "devin" || !m || m.type !== "question") return;
  game.answers.push({ attr: m.attr, w, inferred: inferFrom(m.attr, w) });
  game.devinLast = { q: QS[m.attr], label: ANSWERS.find(a => a.w === w).label };
  sfx("answer", w);
  game.turn = "you"; game.last = null;
  render();
}
function duelVerdict(yes) {
  const m = game.devinMove;
  if (game.turn !== "devin" || !m || m.type !== "guess") return;
  if (yes) { learn(CHARS[m.i].name); saveMem(); return duelEnd("devin"); }
  game.guesses++;
  game.rejected.add(CHARS[m.i].name);
  game.nextForced = game.answers.length + 6;
  game.devinLast = { q: `Est-ce ${CHARS[m.i].name} ?`, label: "Non" };
  sfx("wrong"); orb.mood = "surprised";
  game.turn = "you"; game.last = null;
  render();
}
function duelEnd(winner) {
  game.winner = winner;
  if (winner === "you") { mem.best = mem.best || {}; mem.best.duel = (mem.best.duel || 0) + 1; saveMem(); }
  orb.mood = winner === "you" ? "sad" : "happy";
  sfx(winner === "you" ? "win" : "lose");
  screen = "duelEnd";
  render();
  if (winner === "you") { const m = document.querySelector(".medal"); if (m) confetti(m); }
}

/* ---------- Écrans ---------- */
function duelBar() {
  const left = asPlayer(() => remaining(posterior()));
  const post = posterior(), top = ranked(post, 1);
  orb.conf = top.length ? post[top[0]] : 0;
  return `<div class="duelbar">
    <div class="${game.turn === "you" ? "now" : ""}"><b>Toi</b><span>${game.mine.length + game.myGuesses} coup${game.mine.length + game.myGuesses > 1 ? "s" : ""} · ≈ ${left.toLocaleString("fr-FR")} possibilités</span></div>
    <div class="${game.turn === "devin" ? "now" : ""}"><b>Le Devin</b><span>${game.answers.length + game.guesses} coup${game.answers.length + game.guesses > 1 ? "s" : ""} · certitude ${Math.round(orb.conf * 100)} %</span></div>
  </div>`;
}
GAMES.duel = {
  html() {
    if (game.turn === "devin") {
      const m = devinMove();
      if (m.type === "giveup") { setTimeout(() => screen === "duel" && duelEnd("you"), 0); return duelBar(); }
      const recap = game.last ? `<div class="reply">${game.last.miss ? `<em>Tu as proposé « ${esc(game.last.miss)} »</em><div><b style="color:var(--rose)">Raté</b></div>`
        : `<em>« ${esc(game.last.text)} »</em>` + game.last.items.map(it => `<div><span>${esc(QS[it.attr])}</span><b style="color:${it.c}">${it.label}</b></div>`).join("")}</div>` : "";
      orb.mood = "think";
      if (m.type === "guess") {
        const c = CHARS[m.i];
        say("Je crois que je te tiens…");
        return `${duelBar()}${recap}
          <span class="eyebrow">Au tour du Devin</span>
          <h2 class="question">Est-ce que tu penses à ${esc(c.name)} ?</h2>
          <div class="row"><button class="btn primary" type="button" data-act="yes">Oui, c'est ça</button><button class="btn" type="button" data-act="no">Non</button></div>`;
      }
      say(pick(["À moi !", "Mon tour…", "Voyons ton secret."]));
      return `${duelBar()}${recap}
        <span class="eyebrow">Au tour du Devin</span>
        <h2 class="question">${esc(QS[m.attr])}</h2>
        <div class="answers">${ANSWERS.map(a => `
          <button class="ans ${a.cls || ""}" type="button" data-w="${a.w}" style="--c:${a.c}">
            <span class="glyph"><i style="width:${a.g}px;height:${a.g}px"></i></span><span class="w">${a.label}</span>
          </button>`).join("")}</div>`;
    }
    orb.mood = "sure";
    const sugg = asPlayer(() => scoreQuestions(posterior()).slice(0, 3).map(s => s.a));
    say(game.devinLast ? pick(["À toi.", "Ton tour.", "Vas-y, interroge-moi."]) : `${T().secret.replace("Interroge-moi.", "")}Pense au tien, et commence.`);
    return `${duelBar()}
      ${game.devinLast ? `<p class="lede">Le Devin a demandé : « ${esc(game.devinLast.q)} » · tu as répondu <b>${esc(game.devinLast.label.toLowerCase())}</b>.</p>` : ""}
      <span class="eyebrow">À toi</span>
      <form class="ask" id="duelForm" autocomplete="off">
        <label for="duelIn">Pose ta question, ou propose un nom (« c'est … ? »)</label>
        <div class="guess-row"><input id="duelIn" placeholder="${T().askPh}"><button class="btn primary" type="submit">Jouer</button></div>
        <span class="hint" id="duelHint" aria-live="polite"></span>
        <div class="sugg" id="duelSugg"></div>
        <span class="hint">Besoin d'idées ?</span>
        <div class="qlist">${sugg.map(k => `<button class="qbtn" type="button" data-q="${k}">${esc(QS[k])}</button>`).join("")}</div>
      </form>
      ${game.mine.length ? `<details class="mine"><summary>Tes réponses (${game.mine.length})</summary>${game.mine.slice().reverse().map(a => `<div><span>${esc(QS[a.attr])}</span><b style="color:${a.c}">${a.label}</b></div>`).join("")}</details>` : ""}`;
  },
  after() {
    document.querySelectorAll(".ans").forEach(b => b.onclick = () => duelAnswer(+b.dataset.w));
    document.querySelectorAll(".qbtn").forEach(b => b.onclick = () => duelQuestion(QS[b.dataset.q]));
    const f = $("duelForm");
    if (f) {
      f.onsubmit = e => { e.preventDefault(); duelQuestion($("duelIn").value); };
      $("duelIn").oninput = () => {
        const text = $("duelIn").value.trim();
        if (text.length < 3) { $("duelHint").textContent = ""; $("duelSugg").innerHTML = ""; return; }
        const named = detectName(text, candidates());
        if (named !== null) { $("duelHint").textContent = `Je comprends : tu proposes « ${CHARS[named].name} ».`; return; }
        const { keys } = understand(text, mode, QS);
        $("duelHint").textContent = keys.length ? "Je comprends : " + keys.map(k => `« ${QS[k]} »`).join(" et ") : "…";
      };
    }
  },
  act: { yes: () => duelVerdict(true), no: () => duelVerdict(false) }
};
GAMES.duelEnd = {
  html() {
    const c = CHARS[game.secret], youWon = game.winner === "you";
    const found = game.devinMove && game.devinMove.type === "guess" ? CHARS[game.devinMove.i] : null;
    say(youWon ? pick(["Tu m'as eu… cette fois.", "Bien joué, tu as été plus rapide."]) : pick(["Je t'ai trouvé avant !", "Le Devin gagne !"]));
    return `
      <span class="eyebrow">${youWon ? "Tu gagnes le duel" : "Le Devin gagne le duel"}</span>
      ${medal(c)}
      <h1>${esc(c.name)}</h1>
      <p class="lede">${youWon ? `C'était bien mon secret. Tu l'as trouvé en ${game.mine.length + game.myGuesses} coups.` : `Mon secret était ${esc(c.name)}.${found ? ` Et toi, tu pensais à ${esc(found.name)}.` : ""}`}</p>
      <div class="row"><button class="btn primary big" type="button" data-act="again">Revanche</button><button class="btn" type="button" data-act="games">Changer de jeu</button></div>`;
  },
  act: { again: () => newDuel(), games: () => goGames() }
};
