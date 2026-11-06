/* Des jeux complètement différents des devinettes, réunis sur la page « Changer de jeu » :
   Pluie d'étoiles (réflexes), Paires d'étoiles (mémoire), Chronologie du cinéma (culture). */

const ARCADE_SCREENS = new Set(["etoiles", "paires", "chrono", "arcadeEnd"]);
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
  { go: "devin", title: "Le Devin", kind: "Devinettes", text: "Il lit dans tes pensées, ou c'est toi qui le questionnes. Quatre façons de jouer : Le Devin devine, Tu devines, Les Indices, L'Intrus." },
  { go: "etoiles", title: "Pluie d'étoiles", kind: "Réflexes", text: "Attrape les étoiles avant qu'elles touchent le sol, enchaîne pour multiplier tes points, évite les comètes. 45 secondes.", best: () => bestOf("etoiles") !== undefined ? `Record : ${bestOf("etoiles")} points` : "" },
  { go: "paires", title: "Paires d'étoiles", kind: "Mémoire", text: "Seize cartes face cachée, huit symboles célestes. Retrouve toutes les paires en un minimum de coups.", best: () => bestOf("paires") !== undefined ? `Record : ${bestOf("paires")} coups` : "" },
  { go: "chrono", title: "Chronologie du cinéma", kind: "Culture", text: "Cinq films et séries connus : remets-les dans l'ordre de sortie, du plus ancien au plus récent. Dix manches.", best: () => bestOf("chrono") !== undefined ? `Record : ${bestOf("chrono")} / 50` : "" }
];
GAMES.hub = {
  free: true,
  html() {
    say(pick(["À quoi on joue ?", "J'ai plus d'un tour dans mon orbe.", "Choisis ton jeu."]));
    return `
      <span class="eyebrow">Tous les jeux</span>
      <h1>À quoi veux-tu jouer ?</h1>
      <div class="gamecards">${GAME_LIST.map(g => `
        <button class="gamecard" type="button" data-act="${g.go}">
          <span class="tag">${g.kind}</span>
          <b>${g.title}</b>
          <small>${g.text}</small>
          ${g.best && g.best() ? `<em>${g.best()}</em>` : ""}
        </button>`).join("")}</div>`;
  },
  act: {
    devin: () => { screen = "intro"; render(); },
    etoiles: () => newStars(),
    paires: () => newPairs(),
    chrono: () => newChrono()
  }
};

/* ---------- Fin de partie commune ---------- */
function endArcade(kind, value, label, lowerIsBetter) {
  stopArcade();
  const rec = arcadeRecord(kind, value, lowerIsBetter);
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
      <div class="score-big">${game.value}<small>${game.label}</small></div>
      <p class="lede">${game.rec.better ? "C'est ton nouveau record." : `Ton record : ${game.rec.best} ${game.label.trim()}.`}</p>
      <div class="row"><button class="btn primary big" type="button" data-act="again">Rejouer</button><button class="btn" type="button" data-act="games">Changer de jeu</button></div>`;
  },
  act: {
    again: () => ({ etoiles: newStars, paires: newPairs, chrono: newChrono }[game.kind])(),
    games: () => goGames()
  }
};

/* ---------- Pluie d'étoiles ---------- */
const STARS_DURATION = 45;
function newStars() {
  stopArcade();
  game = { kind: "etoiles", score: 0, combo: 0, best: 0, objs: [], parts: [], elapsed: 0, spawn: 0, shake: 0, last: performance.now() };
  screen = "etoiles";
  render();
}
GAMES.etoiles = {
  html() {
    say("");
    return `
      <div class="hud"><span>Temps <b id="sTime">${STARS_DURATION}</b></span><span>Score <b id="sScore">0</b></span><span>Série <b id="sCombo">×1</b></span></div>
      <canvas id="playfield" class="playfield" aria-label="Zone de jeu : touche les étoiles dorées, évite les comètes"></canvas>
      <p class="hint-line">Touche les étoiles dorées · les grosses valent 5 · évite les comètes rouges</p>`;
  },
  after() {
    const cv = $("playfield"), ctx = cv.getContext("2d");
    const size = () => { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); cv.width = r.width * d; cv.height = r.height * d; };
    size();
    cv.onpointerdown = e => {
      const r = cv.getBoundingClientRect(), d = cv.width / r.width;
      const x = (e.clientX - r.left) * d, y = (e.clientY - r.top) * d;
      let hit = null, bestDist = Infinity;
      for (const o of game.objs) {
        const dist = Math.hypot(o.x - x, o.y - y);
        if (dist < o.r * 1.6 && dist < bestDist) { hit = o; bestDist = dist; }
      }
      if (hit) catchObj(hit);
    };
    const step = now => {
      if (screen !== "etoiles") return;
      const dt = Math.min(0.05, (now - game.last) / 1000); game.last = now;
      updateStars(dt, cv);
      drawStars(ctx, cv);
      if (game.elapsed >= STARS_DURATION) return endArcade("etoiles", game.score, " points");
      arcadeLoop = requestAnimationFrame(step);
    };
    arcadeLoop = requestAnimationFrame(step);
  }
};
function catchObj(o) {
  game.objs.splice(game.objs.indexOf(o), 1);
  const burst = (n, color) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220; game.parts.push({ x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, color }); } };
  if (o.type === "comet") {
    game.score = Math.max(0, game.score - 3); game.combo = 0; game.shake = 0.3;
    burst(14, "#e88a72"); sfx("wrong");
  } else {
    game.combo++;
    const mult = 1 + Math.floor(game.combo / 5);
    game.score += (o.type === "big" ? 5 : 1) * mult;
    burst(o.type === "big" ? 22 : 10, o.type === "big" ? "#f0e7d4" : "#e0b25c");
    ping(440 * Math.pow(2, Math.min(game.combo, 24) / 12));
  }
  orb.kick = 1;
}
function updateStars(dt, cv) {
  const W = cv.width, H = cv.height, k = H / 600;
  game.elapsed += dt;
  game.spawn -= dt;
  if (game.spawn <= 0) {
    game.spawn = Math.max(0.22, 0.75 - game.elapsed * 0.012);
    const r = Math.random(), cometShare = 0.16 + game.elapsed * 0.003;
    const type = r < 0.06 ? "big" : r < 0.06 + cometShare ? "comet" : "star";
    const rad = (type === "big" ? 26 : type === "comet" ? 20 : 17) * Math.max(k, 0.8);
    game.objs.push({ type, r: rad, x: rad + Math.random() * (W - 2 * rad), y: -rad, vy: (95 + game.elapsed * 5 + Math.random() * 70) * k, spin: Math.random() * 6, vx: (Math.random() - 0.5) * 30 * k });
  }
  for (const o of game.objs) { o.y += o.vy * dt; o.x += o.vx * dt; o.spin += dt * 2; }
  // une étoile ratée casse la série (sans perdre de points)
  const missed = game.objs.filter(o => o.y - o.r > H);
  if (missed.some(o => o.type !== "comet")) game.combo = 0;
  game.objs = game.objs.filter(o => o.y - o.r <= H);
  for (const p of game.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
  game.parts = game.parts.filter(p => p.life > 0);
  game.shake = Math.max(0, game.shake - dt);
  $("sTime").textContent = Math.max(0, Math.ceil(STARS_DURATION - game.elapsed));
  $("sScore").textContent = game.score;
  $("sCombo").textContent = "×" + (1 + Math.floor(game.combo / 5));
}
function starPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function drawStars(ctx, cv) {
  const W = cv.width, H = cv.height;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (game.shake) ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
  for (const o of game.objs) {
    if (o.type === "comet") {
      const g = ctx.createLinearGradient(o.x, o.y, o.x - o.vx * 0.4, o.y - o.r * 4);
      g.addColorStop(0, "rgba(232,138,114,0.7)"); g.addColorStop(1, "rgba(232,138,114,0)");
      ctx.strokeStyle = g; ctx.lineWidth = o.r * 1.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - o.vx * 0.4, o.y - o.r * 4); ctx.stroke();
      ctx.fillStyle = "#7a2f25"; ctx.strokeStyle = "#e88a72"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.shadowColor = "#e0b25c"; ctx.shadowBlur = o.type === "big" ? 30 : 16;
      ctx.fillStyle = o.type === "big" ? "#f6d58b" : "#e0b25c";
      starPath(ctx, o.x, o.y, o.r, o.spin); ctx.fill();
      ctx.shadowBlur = 0;
      if (o.type === "big") { ctx.strokeStyle = "rgba(240,231,212,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.35, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  for (const p of game.parts) {
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ---------- Paires d'étoiles ---------- */
// huit symboles célestes dessinés en SVG (traits simples, couleur propre à chacun)
const SYMBOLS = [
  ["#e0b25c", '<polygon points="50,8 61,38 93,38 67,57 77,89 50,70 23,89 33,57 7,38 39,38"/>'],
  ["#f0e7d4", '<path d="M62 10a40 40 0 1 0 0 80a32 32 0 1 1 0-80z"/>'],
  ["#93cfa9", '<circle cx="50" cy="50" r="24"/><ellipse cx="50" cy="52" rx="44" ry="12" fill="none" stroke-width="6"/>'],
  ["#e88a72", '<circle cx="66" cy="34" r="16"/><path d="M54 46L14 86M48 38L12 62M60 52L36 90" fill="none" stroke-width="7" stroke-linecap="round"/>'],
  ["#f6d58b", '<circle cx="50" cy="50" r="20"/><path d="M50 6v14M50 80v14M6 50h14M80 50h14M19 19l10 10M71 71l10 10M19 81l10-10M71 29l10-10" fill="none" stroke-width="7" stroke-linecap="round"/>'],
  ["#7fc3d6", '<path d="M8 50Q50 10 92 50Q50 90 8 50z"/><circle cx="50" cy="50" r="14" fill="#0b1517"/>'],
  ["#c8a2e8", '<polygon points="50,6 86,50 50,94 14,50"/>'],
  ["#b9cf93", '<path d="M50 50m-6 0a6 6 0 1 1 12 0a12 12 0 1 1-24 0a18 18 0 1 1 36 0a24 24 0 1 1-48 0a30 30 0 1 1 60 0" fill="none" stroke-width="6" stroke-linecap="round"/>']
];
const symbolSvg = n => { const [c, body] = SYMBOLS[n]; return `<svg viewBox="0 0 100 100" aria-hidden="true" fill="${c}" stroke="${c}">${body}</svg>`; };
function newPairs() {
  stopArcade();
  const deck = shuffled([...Array(8).keys(), ...Array(8).keys()]);
  game = { kind: "paires", deck, open: [], found: new Set(), moves: 0, lock: false, t0: 0 };
  screen = "paires";
  render();
}
GAMES.paires = {
  html() {
    if (!game.moves) say("Retrouve les paires.");
    return `
      <div class="hud"><span>Coups <b id="pMoves">${game.moves}</b></span><span>Paires <b>${game.found.size} / 8</b></span></div>
      <div class="memory">${game.deck.map((s, i) => {
        const up = game.open.includes(i) || game.found.has(s);
        return `<button class="mcard ${up ? "up" : ""} ${game.found.has(s) ? "done" : ""}" type="button" data-i="${i}" aria-label="${up ? "Carte retournée" : "Carte face cachée"}">
          <span class="face back"></span><span class="face front">${symbolSvg(s)}</span></button>`;
      }).join("")}</div>`;
  },
  after() {
    document.querySelectorAll(".mcard").forEach(b => b.onclick = () => flipCard(+b.dataset.i));
  }
};
function flipCard(i) {
  if (game.lock || game.open.includes(i) || game.found.has(game.deck[i])) return;
  if (!game.t0) game.t0 = performance.now();
  game.open.push(i);
  ping(520, "sine", 0.12);
  if (game.open.length === 2) {
    game.moves++;
    const [a, b] = game.open;
    if (game.deck[a] === game.deck[b]) {
      game.found.add(game.deck[a]); game.open = [];
      ping(780, "triangle", 0.3); orb.kick = 1;
      if (game.found.size === 8) { render(); return setTimeout(() => screen === "paires" && endArcade("paires", game.moves, " coups", true), 700); }
    } else {
      game.lock = true;
      setTimeout(() => { if (screen !== "paires") return; game.open = []; game.lock = false; render(); }, 800);
    }
  }
  render();
}

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
      render();
    });
  },
  act: {
    reset: () => { game.order = []; render(); },
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
