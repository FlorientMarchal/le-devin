/* Échecs contre le Devin : règles complètes (roque, prise en passant, promotion, échec et mat, pat)
   et un adversaire qui cherche le meilleur coup par alpha-bêta, à 1, 2 ou 4 demi-coups selon le niveau.
   Plateau : tableau de 64 cases, index = ligne * 8 + colonne, ligne 0 = 8e rangée (en haut).
   Pièces : majuscules = blancs (le joueur), minuscules = noirs (le Devin). */

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// tables de position (point de vue des blancs, ligne 0 en haut) : encouragent le centre, le développement, la sécurité du roi
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
};
const isWhite = p => p && p === p.toUpperCase();
const colorOf = p => (p ? (isWhite(p) ? "w" : "b") : null);
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]], BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function initialChess() {
  const back = "rnbqkbnr";
  const board = Array(64).fill(null);
  for (let c = 0; c < 8; c++) {
    board[c] = back[c]; board[8 + c] = "p";
    board[48 + c] = "P"; board[56 + c] = back[c].toUpperCase();
  }
  return { board, turn: "w", castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, moves: 0 };
}
// la case sq est-elle attaquée par la couleur by ?
function attacked(board, sq, by) {
  const r = sq >> 3, c = sq & 7;
  const own = p => p && colorOf(p) === by;
  const at = (rr, cc) => (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? board[rr * 8 + cc] : undefined);
  const pr = by === "w" ? r + 1 : r - 1;   // un pion blanc attaque vers le haut, il se trouve donc une ligne plus bas
  for (const dc of [-1, 1]) { const p = at(pr, c + dc); if (own(p) && p.toLowerCase() === "p") return true; }
  for (const [dr, dc] of KNIGHT) { const p = at(r + dr, c + dc); if (own(p) && p.toLowerCase() === "n") return true; }
  for (const [dr, dc] of KING) { const p = at(r + dr, c + dc); if (own(p) && p.toLowerCase() === "k") return true; }
  for (const [dirs, kinds] of [[ROOK_D, "rq"], [BISHOP_D, "bq"]]) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = board[rr * 8 + cc];
        if (p) { if (own(p) && kinds.includes(p.toLowerCase())) return true; break; }
        rr += dr; cc += dc;
      }
    }
  }
  return false;
}
const kingSq = (board, color) => board.findIndex(p => p === (color === "w" ? "K" : "k"));
const inCheck = (st, color) => attacked(st.board, kingSq(st.board, color), color === "w" ? "b" : "w");

// coups possibles sans vérifier que le roi reste hors d'échec
function pseudoMoves(st) {
  const { board, turn } = st, out = [];
  const enemy = p => p && colorOf(p) !== turn;
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p || colorOf(p) !== turn) continue;
    const r = sq >> 3, c = sq & 7, kind = p.toLowerCase();
    const add = (to, extra = {}) => out.push({ from: sq, to, piece: p, cap: board[to], ...extra });
    if (kind === "p") {
      const dir = turn === "w" ? -1 : 1, start = turn === "w" ? 6 : 1, last = turn === "w" ? 0 : 7;
      const one = (r + dir) * 8 + c;
      if (r + dir >= 0 && r + dir < 8 && !board[one]) {
        add(one, r + dir === last ? { promo: turn === "w" ? "Q" : "q" } : {});
        const two = (r + 2 * dir) * 8 + c;
        if (r === start && !board[two]) add(two, { double: true });
      }
      for (const dc of [-1, 1]) {
        const cc = c + dc, rr = r + dir;
        if (cc < 0 || cc > 7 || rr < 0 || rr > 7) continue;
        const to = rr * 8 + cc;
        if (enemy(board[to])) add(to, rr === last ? { promo: turn === "w" ? "Q" : "q" } : {});
        else if (to === st.ep) add(to, { enPassant: true, cap: turn === "w" ? "p" : "P" });
      }
    } else if (kind === "n" || kind === "k") {
      for (const [dr, dc] of kind === "n" ? KNIGHT : KING) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const to = rr * 8 + cc;
        if (!board[to] || enemy(board[to])) add(to);
      }
      if (kind === "k") {
        // roque : roi et tour à leur place, cases libres, roi jamais en échec sur son chemin
        const home = turn === "w" ? 60 : 4, foe = turn === "w" ? "b" : "w";
        const [kSide, qSide] = turn === "w" ? ["K", "Q"] : ["k", "q"];
        if (sq === home && !attacked(board, home, foe)) {
          if (st.castle[kSide] && !board[home + 1] && !board[home + 2] && !attacked(board, home + 1, foe) && !attacked(board, home + 2, foe)) add(home + 2, { castle: "k" });
          if (st.castle[qSide] && !board[home - 1] && !board[home - 2] && !board[home - 3] && !attacked(board, home - 1, foe) && !attacked(board, home - 2, foe)) add(home - 2, { castle: "q" });
        }
      }
    } else {
      const dirs = kind === "r" ? ROOK_D : kind === "b" ? BISHOP_D : [...ROOK_D, ...BISHOP_D];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const to = rr * 8 + cc;
          if (board[to]) { if (enemy(board[to])) add(to); break; }
          add(to);
          rr += dr; cc += dc;
        }
      }
    }
  }
  return out;
}
function applyMove(st, m) {
  const board = st.board.slice();
  board[m.to] = m.promo || m.piece;
  board[m.from] = null;
  if (m.enPassant) board[m.to + (st.turn === "w" ? 8 : -8)] = null;
  if (m.castle) {
    const row = m.from & ~7;
    if (m.castle === "k") { board[row + 5] = board[row + 7]; board[row + 7] = null; }
    else { board[row + 3] = board[row]; board[row] = null; }
  }
  const castle = { ...st.castle };
  const touch = sq => { if (sq === 60) castle.K = castle.Q = false; if (sq === 4) castle.k = castle.q = false; if (sq === 63) castle.K = false; if (sq === 56) castle.Q = false; if (sq === 7) castle.k = false; if (sq === 0) castle.q = false; };
  touch(m.from); touch(m.to);
  return {
    board, castle, turn: st.turn === "w" ? "b" : "w",
    ep: m.double ? (m.from + m.to) / 2 : -1,
    half: m.cap || m.piece.toLowerCase() === "p" ? 0 : st.half + 1,
    moves: st.moves + 1
  };
}
function legalMoves(st) {
  return pseudoMoves(st).filter(m => !inCheck(applyMove(st, m), st.turn));
}
// évaluation du point de vue de la couleur qui joue
function evaluate(st) {
  let s = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = st.board[sq];
    if (!p) continue;
    const k = p.toLowerCase();
    if (isWhite(p)) s += VAL[k] + PST[k][sq];
    else s -= VAL[k] + PST[k][(7 - (sq >> 3)) * 8 + (sq & 7)];
  }
  return st.turn === "w" ? s : -s;
}
const order = moves => moves.sort((a, b) => ((b.cap ? VAL[b.cap.toLowerCase()] * 10 - VAL[b.piece.toLowerCase()] : 0) + (b.promo ? 800 : 0)) -
  ((a.cap ? VAL[a.cap.toLowerCase()] * 10 - VAL[a.piece.toLowerCase()] : 0) + (a.promo ? 800 : 0)));
// prolonge la recherche sur les prises, pour ne pas s'arrêter au milieu d'un échange
function quiesce(st, alpha, beta, depth) {
  const stand = evaluate(st);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (depth <= 0) return alpha;
  for (const m of order(pseudoMoves(st).filter(m => m.cap))) {
    const next = applyMove(st, m);
    if (inCheck(next, st.turn)) continue;
    const v = -quiesce(next, -beta, -alpha, depth - 1);
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}
function negamax(st, depth, alpha, beta) {
  if (depth === 0) return quiesce(st, alpha, beta, 4);
  const moves = order(legalMoves(st));
  if (!moves.length) return inCheck(st, st.turn) ? -100000 - depth : 0;
  for (const m of moves) {
    const v = -negamax(applyMove(st, m), depth - 1, -beta, -alpha);
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}
// Meilleur coup. Avec du hasard (niveaux faciles), chaque coup est évalué complètement :
// une borne d'élagage plus un tirage au sort pourrait sinon faire passer une gaffe pour un bon coup.
function bestMove(st, depth, noise) {
  let best = null, bestV = -Infinity, bound = -Infinity;
  for (const m of order(legalMoves(st))) {
    const exact = -negamax(applyMove(st, m), depth - 1, -Infinity, noise ? Infinity : -bound);
    const v = exact + (noise ? (Math.random() - 0.5) * noise : 0);
    if (v > bestV) { bestV = v; best = m; }
    if (!noise) bound = bestV;
  }
  return best;
}

/* ---------- Partie ---------- */
// niveau : [profondeur de recherche en demi-coups, part de hasard en centièmes de pion]
const LEVELS = { facile: [1, 150], moyen: [2, 30], difficile: [4, 0] };
const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const NAMES = { k: "roi", q: "dame", r: "tour", b: "fou", n: "cavalier", p: "pion" };
function newChess() {
  const level = (mem.chessLevel in LEVELS) ? mem.chessLevel : "moyen";
  game = { kind: "echecs", st: initialChess(), level, sel: -1, last: null, history: [], over: null, thinking: false };
  screen = "echecs"; orb.mood = "sure"; orb.conf = 0.5;
  sfx("start");
  render();
}
function chessStatus() {
  const st = game.st, moves = legalMoves(st);
  if (!moves.length) return inCheck(st, st.turn) ? (st.turn === "w" ? "lost" : "won") : "draw";
  if (st.half >= 100) return "draw";
  return null;
}
function playerMove(m) {
  game.history.push(game.st);
  game.st = applyMove(game.st, m);
  game.last = m; game.sel = -1;
  ping(m.cap ? 330 : 440, "triangle", 0.12);
  game.over = chessStatus();
  if (game.over) return finishChess();
  game.thinking = true;
  render();
  // laisse l'écran se mettre à jour avant que le Devin réfléchisse
  setTimeout(() => {
    if (screen !== "echecs" || !game || game.kind !== "echecs") return;
    const [depth, noise] = LEVELS[game.level];
    const reply = bestMove(game.st, depth, noise);
    game.st = applyMove(game.st, reply);
    game.last = reply; game.thinking = false;
    ping(reply.cap ? 260 : 360, "triangle", 0.12);
    game.over = chessStatus();
    if (game.over) return finishChess();
    orb.mood = inCheck(game.st, "w") ? "happy" : "sure";
    render();
  }, 60);
}
function finishChess() {
  game.thinking = false;
  if (game.over === "won") { mem.best = mem.best || {}; mem.best.echecs = (mem.best.echecs || 0) + 1; saveMem(); sfx("win"); orb.mood = "sad"; }
  else if (game.over === "lost") { sfx("lose"); orb.mood = "happy"; }
  else { sfx("guess"); orb.mood = "idle"; }
  render();
  if (game.over === "won") { const m = document.querySelector(".chessboard"); if (m) confetti(m); }
}
function clickSquare(sq) {
  if (game.over || game.thinking || game.st.turn !== "w") return;
  const p = game.st.board[sq];
  if (game.sel >= 0) {
    const m = legalMoves(game.st).find(x => x.from === game.sel && x.to === sq);
    if (m) return playerMove(m);
  }
  game.sel = p && isWhite(p) ? (game.sel === sq ? -1 : sq) : -1;
  render();
}
GAMES.echecs = {
  html() {
    const st = game.st, targets = game.sel >= 0 ? legalMoves(st).filter(m => m.from === game.sel).map(m => m.to) : [];
    const check = !game.over && inCheck(st, st.turn);
    const status = game.over === "won" ? "Échec et mat : tu as battu le Devin !" : game.over === "lost" ? "Échec et mat : le Devin gagne." : game.over === "draw" ? "Partie nulle (pat)." :
      game.thinking ? "Le Devin réfléchit…" : check ? "Échec ! Protège ton roi." : "À toi de jouer (blancs).";
    say(game.over === "won" ? "Bravo… je n'ai rien vu venir." : game.over === "lost" ? "Échec et mat !" : game.thinking ? "Hmm…" : check ? "Échec !" : "");
    const lastTxt = game.last && !game.thinking && st.turn === "w" && game.history.length ? `Le Devin a joué ${NAMES[game.last.piece.toLowerCase()]} ${sqName(game.last.from)}–${sqName(game.last.to)}.` : "";
    return `
      <span class="eyebrow">Échecs · niveau ${game.level}</span>
      <p class="chess-status ${check ? "warn" : ""}">${status}</p>
      <div class="chessboard" role="grid" aria-label="Échiquier">${st.board.map((p, sq) => {
        const dark = ((sq >> 3) + (sq & 7)) % 2 === 1;
        const cls = [dark ? "d" : "l", sq === game.sel ? "sel" : "", targets.includes(sq) ? (p ? "cap" : "dot") : "",
          game.last && (sq === game.last.from || sq === game.last.to) ? "last" : "", check && p === "K" ? "chk" : ""].join(" ");
        return `<button class="sq ${cls}" type="button" data-sq="${sq}" aria-label="${sqName(sq)}${p ? " " + NAMES[p.toLowerCase()] + (isWhite(p) ? " blanc" : " noir") : ""}">${p ? `<span class="pc ${isWhite(p) ? "w" : "b"}">${GLYPH[p.toLowerCase()]}︎</span>` : ""}</button>`;
      }).join("")}</div>
      ${lastTxt ? `<p class="hint-line">${lastTxt}</p>` : ""}
      <div class="row">
        ${game.over ? `<button class="btn primary big" type="button" data-act="again">Nouvelle partie</button>` : `<button class="btn ghost" type="button" data-act="undo" ${game.history.length && !game.thinking ? "" : "disabled"}>Annuler mon coup</button>`}
        <label class="level">Niveau
          <select id="chessLevel">${Object.keys(LEVELS).map(l => `<option value="${l}" ${l === game.level ? "selected" : ""}>${l}</option>`).join("")}</select>
        </label>
      </div>`;
  },
  after() {
    document.querySelectorAll(".sq").forEach(b => b.onclick = () => clickSquare(+b.dataset.sq));
    const sel = $("chessLevel");
    if (sel) sel.onchange = () => { mem.chessLevel = sel.value; saveMem(); game.level = sel.value; render(); };
  },
  act: {
    again: () => newChess(),
    undo: () => {
      if (!game.history.length || game.thinking) return;
      game.st = game.history.pop(); game.last = null; game.sel = -1; game.over = null;
      render();
    }
  }
};
const sqName = sq => "abcdefgh"[sq & 7] + (8 - (sq >> 3));
