# Le Devin

Pense à quelqu'un — une star, un héros de manga, un personnage de dessin animé, toi-même ou quelqu'un de ta famille — et le Devin le trouve en quelques questions.

**Jouer :** https://florientmarchal.github.io/le-devin/

## Ce qu'il sait faire

- **493 personnages** et **76 questions** : sportifs, chanteurs, rappeurs, présidents, youtubeurs, Marvel, Disney, manga, jeux vidéo, BD, séries, contes… et toi et tes proches.
- **Il tolère les erreurs** : chaque réponse ajuste une probabilité (raisonnement bayésien), aucune n'élimine un personnage d'office.
- **Il pose la question la plus utile** à chaque tour (celle qui réduit le plus l'incertitude).
- **Il apprend** : quand il perd, tu lui dis à qui tu pensais et il retient tes réponses (stocké dans ton navigateur).
- Retour en arrière, carnet de pistes en direct, sons et animations.

## Fichiers

- `index.html` — l'interface et le moteur.
- `personnages.js` — la base de connaissances. Pour ajouter un personnage, ajoute une ligne `"Nom|Description|traits"` (les traits sont les clés de `QUESTIONS`, `~trait` = en partie, `-trait` = forcément non).

Aucune dépendance, aucun build : il suffit d'ouvrir `index.html` via un serveur web.
