# Le Devin

Pense à quelqu'un (une star, un héros de manga, toi-même, quelqu'un de ta famille), à un film ou une série, ou à une chose (un animal, un fruit, un plat, un objet) : le Devin le trouve en quelques questions.

**Jouer :** https://florientmarchal.github.io/le-devin/

## Ce qu'il sait faire

- **Deux façons de jouer** : le Devin devine ce à quoi tu penses, ou c'est lui qui choisit en secret une célébrité ou un personnage connu de tous et toi qui poses tes questions avec tes propres mots (« c'est un footballeur français ? », « elle est blonde ? », « c'est Zidane ? »), avec le nombre de possibilités restantes.
- **Trois modes** : personnages ; films et séries (environ 6 600 titres tirés de Wikidata, 100 questions : genre, époque, pays, saga, réalisateur, acteurs, plateforme, prix) ; animaux, objets et aliments (334 choses, 100 questions).
- **Plus de 28 000 personnages** et **213 questions** (dont régions du monde, métiers, clubs de foot, postes, taille, sagas de films, instruments) : environ 23 000 personnalités du monde entier et 4 600 personnages de séries, films, mangas, jeux vidéo, BD, livres et mythologies, tirés de Wikidata, plus près de 500 fiches faites main (avec toi et tes proches).
- **Il connaît la notoriété** : un personnage célèbre est jugé plus probable qu'un inconnu.
- **Il tolère les erreurs** : chaque réponse ajuste une probabilité (raisonnement bayésien), aucune n'élimine un personnage d'office.
- **Il pose la question la plus utile** à chaque tour (celle qui réduit le plus l'incertitude), dans un ordre logique : du général au précis, sans jamais reposer une question déjà tranchée (après « homme », pas de « femme »). Les réponses sont toujours oui / plutôt oui / je ne sais pas / plutôt non / non. Chaque question est pondérée par la chance que le joueur connaisse la réponse, pour poser les questions évidentes avant les détails pointus.
- **Il apprend** : quand il perd, tu lui dis à qui tu pensais et il retient tes réponses (stocké dans ton navigateur).
- Retour en arrière, bouton pour changer de thème, sons et animations, adapté au téléphone.

## Fichiers

- `index.html` — l'interface et le moteur.
- `personnages.js` — les questions et les fiches faites main. Pour ajouter un personnage, ajoute une ligne `"Nom|Description|traits"` (les traits sont les clés de `QUESTIONS`, `~trait` = en partie, `-trait` = forcément non).
- `comprendre.js` — la compréhension des questions libres (synonymes, noms propres, question la plus proche).
- `choses.js` — les questions et les entrées du mode animaux, objets et aliments.
- `oeuvres.js` — les questions du mode films et séries ; `oeuvres-data.js` les titres générés (`node tools/build-oeuvres.mjs`).
- `wikidata.js` — les entrées générées. Pour les régénérer : `node tools/build-wikidata.mjs` (Node 18+, interroge le service public QLever, environ 5 minutes).

Aucune dépendance, aucun build : il suffit d'ouvrir `index.html` via un serveur web.
