/* Compréhension des questions libres du joueur, pour le jeu inversé.
   Chaque question connue est indexée par les mots de son texte et par une liste de synonymes ;
   une question libre est rapprochée de la (ou des deux) question(s) connue(s) la/les plus proche(s). */

const SYNONYMES = {
  personnage: {
    reel: "reel reelle existe existant existait vrai vraie humain historique fictif fictive imaginaire invente inventee fiction",
    vivant: "vivant vivante vie mort morte decede decedee",
    homme: "homme garcon masculin mec gars monsieur male",
    femme: "femme fille feminin meuf dame madame",
    humain: "humain humaine personne",
    animal: "animal bete",
    jeune: "jeune",
    vieux: "vieux vieille age agee",
    enfant: "enfant ado adolescent adolescente gamin gamine bebe",
    sport: "sport sportif sportive athlete",
    foot: "foot football footballeur footballeuse ballon",
    basket: "basket basketteur basketteuse",
    tennis: "tennis tennisman joueuse",
    combat: "boxe boxeur judo judoka karate catch catcheur mma lutte",
    voiture: "voiture pilote course",
    f1: "formule f1",
    musique: "musique musicien musicienne",
    chanteur: "chanteur chanteuse chante chanson chansons chanter",
    rap: "rap rappeur rappeuse",
    acteur: "acteur actrice comedien comedienne joue",
    film: "film films cinema",
    serie: "serie series",
    anime: "manga mangas anime animes",
    jeu: "jeu jeux gamer",
    bd: "bd bande dessinee comics comic",
    dessin: "dessin anime cartoon",
    disney: "disney pixar",
    marvel: "marvel super heros superheros",
    dc: "dc batman superman",
    pouvoir: "pouvoir pouvoirs magie magique sorcier sorciere superpouvoir",
    mechant: "mechant mechante vilain mechants",
    heros: "heros heroine principal",
    politique: "politique politicien politicienne ministre depute",
    chefetat: "president presidente chef etat",
    royal: "roi reine prince princesse empereur imperatrice royal royale",
    riche: "riche milliardaire millionnaire",
    internet: "youtube youtubeur youtubeuse influenceur influenceuse twitch streamer tiktok instagram reseaux",
    television: "tele television animateur animatrice emission",
    humour: "humoriste drole marrant rigolo comique",
    science: "scientifique savant inventeur chercheur",
    art: "peintre artiste peinture",
    ecrivain: "ecrivain ecrivaine auteur autrice livres poete romancier",
    blond: "blond blonde",
    roux: "roux rousse",
    chauve: "chauve",
    barbe: "barbe moustache barbu",
    lunettes: "lunettes",
    chapeau: "chapeau casquette casque",
    longs: "cheveux longs",
    grand: "grand grande taille",
    petit: "petit petite",
    espace: "espace astronaute etoiles planete",
    mer: "mer ocean eau pirate",
    francais: "francais francaise france",
    americain: "americain americaine usa etats unis amerique",
    anglais: "anglais anglaise angleterre britannique uk londres",
    japon: "japon japonais japonaise",
    psg: "psg paris",
    om: "om marseille",
    ol: "ol lyon",
    realmadrid: "real madrid",
    barca: "barca barcelone",
    proche: "connais connait connaissais",
    famille: "famille",
    toi: "moi",
    chien: "chien",
    chat: "chat",
    robot: "robot",
    monstre: "monstre creature",
    mythe: "mythologie legende dieu deesse",
    starwars: "star wars jedi",
    harrypotter: "harry potter poudlard",
    pokemon: "pokemon",
    oscar: "oscar oscars",
    nobel: "nobel"
  },
  oeuvre: {
    film: "film films cinema long metrage",
    serie: "serie series saison saisons episode episodes",
    animation: "animation anime dessin cartoon",
    anime: "anime animes japonaise",
    comedie: "comedie drole marrant rigolo humour comique",
    action: "action baston combats explosions",
    horreur: "horreur peur flippant effrayant terrifiant",
    sf: "science fiction sf futur futuriste espace robots extraterrestres aliens",
    fantastique: "fantastique magie magique sorcier dragons",
    drame: "drame triste dramatique",
    romance: "romance amour romantique love",
    thriller: "thriller suspense",
    policier: "policier enquete crime crimes flic meurtre detective",
    guerre: "guerre soldats",
    western: "western cowboy cowboys",
    musical: "musical chansons chante",
    aventure: "aventure",
    historique: "historique epoque",
    biopic: "biopic vraie histoire vie",
    enfants: "enfants famille gamins",
    superheros: "super heros superheros",
    ado: "ado ados adolescents lycee",
    saga: "saga suite suites trilogie",
    adaptlivre: "livre roman",
    adaptbd: "bd comics manga",
    adaptjeu: "jeu video",
    netflix: "netflix",
    hbo: "hbo",
    disneyplus: "disney plus",
    canalplus: "canal",
    oscar: "oscar oscars",
    palme: "palme cannes",
    cesar: "cesar",
    longue: "longue saisons",
    terminee: "finie terminee fini",
    americain: "americain americaine usa hollywood",
    francais: "francais francaise france",
    anglais: "anglais anglaise britannique",
    japon: "japonais japonaise japon",
    coree: "coreen coreenne coree",
    medical: "hopital medecin docteur medical"
  },
  chose: {
    animal: "animal animaux bete bestiole",
    mangeable: "mange manger mangeable comestible nourriture aliment bouffe boit boire",
    objet: "objet truc machin fabrique",
    plante: "plante fleur arbre vegetal",
    fruit: "fruit",
    legume: "legume",
    boisson: "boisson boire boit",
    alcool: "alcool",
    sucre: "sucre sucree",
    plat: "plat recette",
    dessert: "dessert gouter",
    viande: "viande poisson",
    laitier: "lait fromage laitier",
    chaud: "chaud",
    electrique: "electrique electronique electricite batterie brancher pile",
    ecran: "ecran",
    vehicule: "vehicule transport voiture rouler conduire",
    roues: "roues roue",
    moteur: "moteur",
    vole: "vole voler ailes",
    eau: "eau nage nager aquatique",
    vetement: "vetement habit porter porte",
    jouet: "jouet jouer jeu",
    instrument: "instrument musique",
    sportobj: "sport",
    outil: "outil bricolage",
    coupe: "coupe coupant pointu piquant",
    nettoyer: "nettoyer laver lave",
    ecrire: "ecrire dessiner",
    poche: "poche",
    cher: "cher prix",
    dangereux: "dangereux mord pique venin",
    carnivore: "carnivore viande",
    domestique: "domestique compagnie",
    ferme: "ferme",
    savane: "savane afrique",
    foret: "foret bois",
    gros: "gros grand enorme",
    petit: "petit minuscule main",
    mammifere: "mammifere",
    oiseau: "oiseau plumes",
    poisson: "poisson",
    insecte: "insecte bestiole araignee",
    poils: "poils fourrure poilu",
    pattes4: "pattes quatre",
    maison: "maison",
    cuisine: "cuisine",
    sdb: "salle bain",
    ecole: "ecole bureau classe"
  }
};

const STOP = new Set(("est ce que qu il ils elle elles un une le la les des du de d l a au aux ton ta tes son sa ses personnage perso " +
  "chose c ca cela se on en dans pour avec par sur t y ou et plus tres souvent connu connue connus etre avoir fait faire ete " +
  "vient cet cette quelqu quelque qui quoi lui leur leurs s n ne pas tu te toi mon ma je j me mes question dis dit si oui non " +
  "joue jouer joues ete deja tout toute tous peut peux est-ce estce parle parler parlent y a").split(" "));

const plain = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function stem(w) {
  if (w.length > 4 && w.endsWith("s")) w = w.slice(0, -1);
  return w.length > 5 ? w.slice(0, 5) : w;
}
const tokens = s => plain(s).split(" ").filter(w => w && !STOP.has(w)).map(stem);

// index par mode : mot → poids, pour chaque question
const INDEX = {};
function buildIndex(modeName, questions) {
  const keys = Object.keys(questions), syn = SYNONYMES[modeName] || {};
  const bag = {};
  for (const k of keys) {
    bag[k] = new Map();
    for (const t of tokens(questions[k])) bag[k].set(t, 1);
    for (const t of tokens(syn[k] || "")) bag[k].set(t, 1.6);
  }
  const df = new Map();
  for (const k of keys) for (const t of bag[k].keys()) df.set(t, (df.get(t) || 0) + 1);
  const idf = t => Math.log(1 + keys.length / df.get(t));
  INDEX[modeName] = { keys, bag, idf };
}

// Questions connues les plus proches d'une question libre, avec leur score
function rankQuestions(text, modeName, questions) {
  if (!INDEX[modeName]) buildIndex(modeName, questions);
  const { keys, bag, idf } = INDEX[modeName];
  const q = [...new Set(tokens(text))];
  const out = [];
  for (const k of keys) {
    let score = 0;
    const hit = [];
    for (const t of q) {
      const w = bag[k].get(t);
      if (w) { score += w * idf(t); hit.push(t); }
    }
    if (score > 0) out.push({ key: k, score, hit });
  }
  return { tokens: q, ranked: out.sort((a, b) => b.score - a.score) };
}

// Une ou deux questions comprises (« un footballeur français ? » → foot + francais)
function understand(text, modeName, questions) {
  const { tokens: q, ranked } = rankQuestions(text, modeName, questions);
  const MIN = 1.2;
  if (!ranked.length || ranked[0].score < MIN) return { keys: [], close: ranked.slice(0, 3).map(r => r.key) };
  const keys = [ranked[0].key];
  const used = new Set(ranked[0].hit);
  const rest = q.filter(t => !used.has(t));
  if (rest.length) {
    const second = ranked.find(r => r.key !== keys[0] && r.score >= MIN && r.hit.some(t => !used.has(t)) && !r.hit.every(t => used.has(t)));
    if (second) keys.push(second.key);
  }
  return { keys, close: ranked.slice(0, 3).map(r => r.key) };
}

// « c'est Zidane ? », « est-ce une pomme ? » : une proposition plutôt qu'une question
const GUESS_PATTERN = /^(c ?est|est ce|serait ce|ce serait|ca serait|ca ne serait pas|tu penses? a|t as choisi|c etait|je pense que c est)\b/;
function detectName(text, candidates) {
  const p = plain(text);
  const looksLikeGuess = GUESS_PATTERN.test(p);
  const words = new Set(p.split(" "));
  const content = tokens(p);
  let best = null;
  for (const { name, i, famous } of candidates) {
    const n = plain(name);
    if (n.length < 3) continue;
    let hit = (" " + p + " ").includes(" " + n + " ");
    // le nom de famille seul (« Zidane ») : seulement pour les plus connus, et dans une tournure de proposition
    if (!hit && famous && looksLikeGuess && n.includes(" ")) {
      const last = n.split(" ").pop();
      hit = last.length >= 5 && words.has(last);
    }
    if (hit && (!best || n.length > best.len)) best = { i, len: n.length, n };
  }
  if (!best) return null;
  // sans tournure de proposition, la phrase doit se réduire au nom (« Orange » seul, pas « est-il orange ? »)
  if (!looksLikeGuess && content.length > tokens(best.n).length) return null;
  return best.i;
}
