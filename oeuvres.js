/* Troisième mode du Devin : films et séries.
   Les entrées sont générées dans oeuvres-data.js (tools/build-oeuvres.mjs) ; ici, les questions et leurs liens. */

const REALISATEURS = {
  r_spielberg: "Steven Spielberg", r_nolan: "Christopher Nolan", r_tarantino: "Quentin Tarantino", r_cameron: "James Cameron",
  r_scorsese: "Martin Scorsese", r_kubrick: "Stanley Kubrick", r_miyazaki: "Hayao Miyazaki", r_lucas: "George Lucas",
  r_burton: "Tim Burton", r_besson: "Luc Besson", r_jackson: "Peter Jackson", r_scott: "Ridley Scott", r_hitchcock: "Alfred Hitchcock",
  r_eastwood: "Clint Eastwood", r_anderson: "Wes Anderson", r_villeneuve: "Denis Villeneuve", r_bong: "Bong Joon-ho"
};
const ACTEURS = {
  a_dicaprio: "Leonardo DiCaprio", a_hanks: "Tom Hanks", a_pitt: "Brad Pitt", a_depp: "Johnny Depp", a_cruise: "Tom Cruise",
  a_wsmith: "Will Smith", a_ford: "Harrison Ford", a_freeman: "Morgan Freeman", a_johansson: "Scarlett Johansson",
  a_rdj: "Robert Downey Jr.", a_omarsy: "Omar Sy", a_dujardin: "Jean Dujardin", a_defunes: "Louis de Funès",
  a_depardieu: "Gérard Depardieu", a_clavier: "Christian Clavier", a_reno: "Jean Reno", a_cotillard: "Marion Cotillard", a_eastwood: "Clint Eastwood"
};

const OEUVRES_QUESTIONS = Object.assign({
  film: "Est-ce un film ?",
  serie: "Est-ce une série ?",
  animation: "Est-ce un dessin animé ou de l'animation ?",
  anime: "Est-ce un anime japonais ?",
  comedie: "Est-ce une comédie ?",
  action: "Y a-t-il beaucoup d'action ?",
  horreur: "Est-ce de l'horreur ?",
  sf: "Est-ce de la science-fiction ?",
  fantastique: "Y a-t-il de la magie ou du fantastique ?",
  drame: "Est-ce un drame ?",
  romance: "Est-ce une histoire d'amour ?",
  thriller: "Est-ce un thriller, avec du suspense ?",
  policier: "Y a-t-il des crimes ou une enquête ?",
  guerre: "Parle-t-il de guerre ?",
  western: "Est-ce un western ?",
  musical: "Y a-t-il des chansons (comédie musicale) ?",
  aventure: "Est-ce une aventure ?",
  historique: "L'histoire se passe-t-elle dans le passé ?",
  biopic: "Raconte-t-il la vie d'une personne réelle ?",
  enfants: "Est-ce fait pour les enfants ?",
  superheros: "Y a-t-il des super-héros ?",
  ado: "Parle-t-il d'adolescents ?",
  documentaire: "Est-ce un documentaire ?",
  medical: "Se passe-t-il dans un hôpital ?",
  saga: "Fait-il partie d'une saga, avec des suites ?",
  adaptlivre: "Est-il adapté d'un livre ?",
  adaptbd: "Est-il adapté d'une BD, d'un comic ou d'un manga ?",
  adaptjeu: "Est-il adapté d'un jeu vidéo ?",
  francais: "Est-ce une production française ?",
  americain: "Est-ce américain ?",
  anglais: "Est-ce britannique ?",
  japon: "Est-ce japonais ?",
  coree: "Est-ce sud-coréen ?",
  espagne: "Est-ce espagnol ?",
  italie: "Est-ce italien ?",
  inde: "Est-ce indien ?",
  allemagne: "Est-ce allemand ?",
  canada: "Est-ce canadien ?",
  apres1970: "Est-il sorti après 1970 ?",
  apres1980: "Est-il sorti après 1980 ?",
  apres1990: "Est-il sorti après 1990 ?",
  apres2000: "Est-il sorti après 2000 ?",
  apres2010: "Est-il sorti après 2010 ?",
  apres2020: "Est-il sorti après 2020 ?",
  marvel: "Fait-il partie de l'univers Marvel ?",
  dc: "Fait-il partie de l'univers DC (Batman, Superman…) ?",
  starwars: "Fait-il partie de Star Wars ?",
  harrypotter: "Fait-il partie de l'univers de Harry Potter ?",
  bond: "Est-ce un James Bond ?",
  tolkien: "Se passe-t-il dans l'univers de Tolkien ?",
  pokemon: "Est-ce un Pokémon ?",
  disney: "Est-ce un Disney ?",
  pixar: "Est-ce un Pixar ?",
  ghibli: "Est-ce un film du studio Ghibli ?",
  netflix: "Est-ce une création Netflix ?",
  hbo: "Est-ce une série HBO ?",
  disneyplus: "Est-ce une création Disney+ ?",
  canalplus: "Est-ce une création Canal+ ?",
  oscar: "A-t-il gagné au moins un Oscar ?",
  oscarfilm: "A-t-il gagné l'Oscar du meilleur film ?",
  palme: "A-t-il gagné la Palme d'or ?",
  cesar: "A-t-il gagné le César du meilleur film ?",
  longue: "La série a-t-elle au moins 5 saisons ?",
  terminee: "La série est-elle terminée ?",
  minis: "Est-ce une mini-série ?"
},
  Object.fromEntries(Object.entries(REALISATEURS).map(([k, n]) => [k, `A-t-il été réalisé par ${n} ?`])),
  Object.fromEntries(Object.entries(ACTEURS).map(([k, n]) => [k, `${n} joue-t-il dedans ?`])));

const OEUVRES_IMPLIQUE = Object.assign({
  anime: ["animation", "japon"], pixar: ["animation", "disney"], ghibli: ["anime"], marvel: ["superheros"], dc: ["superheros"],
  oscarfilm: ["oscar"], longue: ["serie"], terminee: ["serie"], minis: ["serie"], bond: ["saga", "action"],
  starwars: ["sf", "saga"], harrypotter: ["fantastique", "adaptlivre", "saga"], tolkien: ["fantastique", "adaptlivre"]
}, Object.fromEntries(Object.keys(REALISATEURS).map(k => [k, ["film"]])));

// Pour une entrée générée : traits sûrs (absents = « non ») et traits incomplets (absents = « peu probable »)
const OEUVRES_DEFAULTS = {
  zero: ["film", "serie", "netflix", "hbo", "disneyplus", "canalplus", "oscar", "oscarfilm", "palme", "cesar", "marvel", "dc", "starwars",
    "harrypotter", "bond", "tolkien", "pokemon", "pixar", "ghibli", "francais", "americain", "anglais", "japon", "coree", "espagne",
    "italie", "inde", "allemagne", "canada", "apres1970", "apres1980", "apres1990", "apres2000", "apres2010", "apres2020",
    ...Object.keys(REALISATEURS), ...Object.keys(ACTEURS)].join(" "),
  soft: "animation anime comedie action horreur sf fantastique drame romance thriller policier guerre western musical aventure historique biopic enfants superheros ado documentaire medical saga adaptlivre adaptbd adaptjeu disney longue terminee minis"
};
