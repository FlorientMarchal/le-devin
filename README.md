# Le Devin

Pense à quelqu'un (une star, un héros de manga, toi-même, quelqu'un de ta famille) ou à une chose (un animal, un fruit, un plat, un objet) : le Devin le trouve en quelques questions.

**Jouer :** https://florientmarchal.github.io/le-devin/

## Ce qu'il sait faire

- **Deux modes** : personnages, ou animaux, objets et aliments (334 choses, 100 questions).
- **Plus de 28 000 personnages** et **195 questions** (dont clubs de foot, postes, taille, sagas de films, instruments) : environ 23 000 personnalités du monde entier et 4 600 personnages de séries, films, mangas, jeux vidéo, BD, livres et mythologies, tirés de Wikidata, plus près de 500 fiches faites main (avec toi et tes proches).
- **Il connaît la notoriété** : un personnage célèbre est jugé plus probable qu'un inconnu.
- **Il tolère les erreurs** : chaque réponse ajuste une probabilité (raisonnement bayésien), aucune n'élimine un personnage d'office.
- **Il pose la question la plus utile** à chaque tour (celle qui réduit le plus l'incertitude), dans un ordre logique : du général au précis, sans jamais reposer une question déjà tranchée (après « homme », pas de « femme »).
- **Il apprend** : quand il perd, tu lui dis à qui tu pensais et il retient tes réponses (stocké dans ton navigateur).
- Retour en arrière, carnet de pistes en direct, sons et animations.

## Fichiers

- `index.html` — l'interface et le moteur.
- `personnages.js` — les questions et les fiches faites main. Pour ajouter un personnage, ajoute une ligne `"Nom|Description|traits"` (les traits sont les clés de `QUESTIONS`, `~trait` = en partie, `-trait` = forcément non).
- `choses.js` — les questions et les entrées du mode animaux, objets et aliments.
- `wikidata.js` — les entrées générées. Pour les régénérer : `node tools/build-wikidata.mjs` (Node 18+, interroge le service public QLever, environ 5 minutes).

Aucune dépendance, aucun build : il suffit d'ouvrir `index.html` via un serveur web.
