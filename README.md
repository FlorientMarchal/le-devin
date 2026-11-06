# Le Devin

Pense à quelqu'un (une star, un héros de manga, toi-même, quelqu'un de ta famille), à un film ou une série, ou à une chose (un animal, un fruit, un plat, un objet) : le Devin le trouve en quelques questions.

**Jouer :** https://florientmarchal.github.io/le-devin/

## D'autres jeux

Le bouton « Changer de jeu », en haut de l'écran, mène à tous les jeux :

- **Le Devin** : les jeux de devinettes décrits plus bas.
- **Le Duel** : toi et le Devin choisissez chacun un secret et vous interrogez à tour de rôle ; le premier qui trouve gagne.
- **Le Pendu** : un titre de film, une célébrité ou une chose à reconstituer lettre par lettre, sept erreurs permises, enchaîne les mots.
- **Devine l'année** : en quelle année est sorti ce film ou cette série ? 100 points pour l'année exacte, moins 8 par année d'écart. Dix manches.
- **Chronologie du cinéma** : remets cinq films et séries connus dans l'ordre de sortie. Dix manches.

Chaque jeu garde ton record dans ton navigateur.

## Ce qu'il sait faire

- **Cinq façons de jouer avec le Devin** :
  - **Le Devin devine** ce à quoi tu penses ;
  - **Tu devines** : il choisit en secret, tu poses tes questions ;
  - **Les Indices** : il révèle des indices du plus vague au plus précis, moins il t'en faut, plus tu marques (5 manches) ;
  - **L'Intrus** : quatre noms, trois partagent un point commun, trouve l'intrus (10 manches, record par thème) ;
  - **Le Duel** : chacun son secret, questions à tour de rôle.
- **Les deux premiers en détail** : le Devin devine ce à quoi tu penses, ou c'est lui qui choisit en secret une célébrité ou un personnage connu de tous et toi qui poses tes questions avec tes propres mots (« c'est un footballeur français ? », « elle est blonde ? », « c'est Zidane ? »), avec le nombre de possibilités restantes.
- **Trois modes** : personnages ; films et séries (environ 6 600 titres tirés de Wikidata, 100 questions : genre, époque, pays, saga, réalisateur, acteurs, plateforme, prix) ; animaux, objets et aliments (334 choses, 100 questions).
- **Environ 4 100 personnages connus de tous** et **213 questions** : 3 200 personnalités et 400 personnages de fiction tirés de Wikidata, retenus parce qu'ils figurent parmi les pages Wikipédia les plus lues (en français ou en anglais, sur 3 ans) ou qu'ils sont présents dans plus de 150 langues, plus près de 500 fiches faites main (avec toi et tes proches).
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
- `jeux.js` — Les Indices et L'Intrus.
- `arcade.js` — la page des jeux, Le Pendu, Devine l'année et Chronologie du cinéma.
- `duel.js` — Le Duel contre le Devin.
- `oeuvres.js` — les questions du mode films et séries ; `oeuvres-data.js` les titres générés (`node tools/build-oeuvres.mjs`).
- `wikidata.js` — les entrées générées. Pour les régénérer : `node tools/build-wikidata.mjs` (Node 18+, interroge le service public QLever et les statistiques de lecture de Wikipédia, environ 10 minutes).

Aucune dépendance, aucun build : il suffit d'ouvrir `index.html` via un serveur web.
