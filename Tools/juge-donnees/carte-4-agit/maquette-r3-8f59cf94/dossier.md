# Dossier du juge données — ④ L'ouverture : la carte de tête QUI AGIT — maquette r3 BORNÉ (3e et dernier tour) — atelier 8f59cf94 + design back 464defd1

> Gabarit `.claude/skills/juge-donnees/dossier-gabarit.md`. Les cadres neufs ont été livrés par CLIENT-2 (SHA ci-dessous).
> Aucun rapport de juge précédent n'est fourni ni ne doit être cherché.

## Mode : maquette (moment 1 — maquette contre ce que le back renvoie)

## L'écran
- **Nom** : ④ L'ouverture — la carte de tête (décision du jour) : avant et APRÈS le geste
- **Ce qu'on vient y faire** : trancher la carte du jour (deux options, une conséquence sous chacune) et voir ce que le geste a fait.
- **Domaine présumé** : `services/game-back/src/progression/loop10/` (`hl-card.controller.ts`, `hl-card.service.ts`, `hl-card-projection.ts`), `session/open` (clé `hl_card`), routes `POST /v1/session/hl-card/:id/commit` et `…/skip` — le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `~/project/atelier3d-mafia-c2/ecrans-brennar-accueil.html` — cadres **1** (avant geste), **6** (après geste, executed), **7** (échec de la 1re cible) ; le cadre 5 reste la référence de la carte de tête | source — lis-la ÉPINGLÉE : `git -C ~/project/atelier3d-mafia-c2 show 8f59cf9409546bc9a078dbb91ca48f91be68da95:ecrans-brennar-accueil.html` |
| `reference/cadre-1.png`, `reference/cadre-6.png`, `reference/cadre-7.png` (1080×2102, ×3,6, rendus depuis ce SHA) | rendus |
| `reference/variantes-textes-8f59cf94.txt` | textes FR+EN des issues SANS cadre dessiné (sortie de `generateur-q5-apres-2026-10-11.py --variantes` @ ce SHA) ; tous les textes d'après-geste et d'erreur y sont des valeurs PROPOSÉES À SERVIR par le back (aucune dérivation client) |

- **SHA atelier** : `8f59cf9409546bc9a078dbb91ca48f91be68da95`, branche `atelier/client2-q5-apres-2026-10-11`, arbre `~/project/atelier3d-mafia-c2` (propre). Mots PROPOSÉS ratifiés par f2 (jeton « votre grande décision du jour », « La carte reste sur la table », « C'était déjà tranché »…).
- Contraste / largeur non remesurés (rendu gelé pendant un gate) : ne pas conclure dessus.

## Back (B) — pour CE tour : le DESIGN APPROUVÉ du lot, plus le cumul pour le reste

- **Design approuvé** : `~/project/mafia-design-aprespgeste/docs/superpowers/specs/2026-11-11-hl-card-apres-geste-servi-design.md` — branche `design/hl-card-apres-geste`, commit `464defd1d209a2d1f24f3074d9a5228acc44a84d` (arbre propre). Lis-le épinglé : `git -C ~/project/mafia-design-aprespgeste show 464defd1d209a2d1f24f3074d9a5228acc44a84d:docs/superpowers/specs/2026-11-11-hl-card-apres-geste-servi-design.md`. Ce que le lot SERVIRA (f2) : clés `hl.after_choice.noted` / `.partial_stop` + 4 `hl.outcome.<fournisseur>.executed` ; réponse de `commit` à 10 clés (`outcome_i18n_key`, `stopped_at_i18n_key`) ; 3 codes d'erreur distincts (`reason` discriminé par `reasonCode`).
- **Ce que B vaut** : le lot n'est PAS encore codé. B = le design (CE QUI SERA servi, DÉDUIT, ligne « DESIGN ») + le cumul `gate/cumul-2026-10-10` @ `7807d6c8` (dépôt ~/project/mafia-clean-city, lu par `git show`/`git grep`, jamais de checkout, jamais d'écriture) pour l'existant. Distingue dans chaque ligne « servi aujourd'hui » de « servi après le lot ». Vérifie que les clés du design sont COHÉRENTES avec le source existant qu'elles modifient (sites d'émission, enveloppe 200).
- **Stack locale** : NE PAS LA TOUCHER (ruling f2 : la pile de dev tourne `main`, le gate arrive). Aucun corps réel au moment 1.

## Tour BORNÉ — ce que tu vérifies (rien d'autre n'est rouvert)
Au tour précédent la maquette a été jugée non ratifiable (1 A, 6 B). f2 a arbitré : le back sert désormais les textes et discriminants (design ci-dessus), l'atelier a corrigé le reste. Pour CHAQUE point : CORRIGÉ / PARTIEL / NON CORRIGÉ + preuve (cadre ou ligne de variante + fichier:ligne du design/source). Puis les constats NOUVEAUX.
1. **Discernabilité** : le cadre 7 (échec de la 1re cible, carte non tranchée) et la variante « déjà tranchée » (409) recevaient jusqu'ici le même code, la même clé et `details` à null. Avec les 3 codes d'erreur du design et le discriminant `reasonCode`, le client peut-il les distinguer SANS lire `message` ? Chaque issue d'erreur de `commit` (liste exhaustive des sites d'émission) correspond-elle à un cadre ou une variante et UN SEUL texte ?
2. **Après-geste servi** : les textes du cadre 6 et des variantes (executed ×4 fournisseurs, noted, arrêt partiel) ont-ils chacun une clé servie (`outcome_i18n_key`, `hl.outcome.<fournisseur>.executed`, `hl.after_choice.*`) dont le texte du design = le texte de la maquette (octet près, apostrophes et U+202F compris) ?
3. **Arrêt partiel** : `stopped_at_error` était un code brut en 200 : `stopped_at_i18n_key` (clé joueur) existe-t-elle au design, avec un texte par code d'erreur possible ? Y a-t-il encore un chemin où le code brut atteint l'écran ?
4. **Pluriel** : les variantes route (102) et maillon (107) au pluriel ICU sur `executed_ids.length` ; le « n » ne vaut jamais 0 sur un 200 (le design le mesure : vérifie). Les clés servies sont-elles ICU pluriel ?
5. **Mot** : « maillon » pour 107, aligné sur le servi (titre/conséquence).
6. **Jeton** : 3 états sans chiffre (libre / pris / fermée aujourd'hui = cap atteint ET used = 0) : `used` et `cap_reached` suffisent-ils à distinguer les 3 ? (cap = 0 en fenêtre T4.)
7. **404 et 409 « rien à agir »** : variantes « Cette carte n'est plus là. » et « Plus rien à faire sur cette carte. » : clés distinctes servies par le design ?
8. Liste exhaustive de ce qui reste servi (200 comme erreurs) SANS cadre ni variante, avec leur compte.

## Écarts ASSUMÉS — le juge les re-vérifie, il ne les rouvre pas comme défauts
| point | décision f2 |
|---|---|
| `noted` sur la branche STRUCTURELLE : inatteignable en v1 | consigné TD-929(b) — N'EST PAS un écart |
| geste `skip` (POST …/skip) sans cadre ; « Pas maintenant » retiré | ASSUMÉ (décision du 08/10) |
| carte structurelle (409 STRUCTURAL_CAP_EXHAUSTED) | ASSUMÉ (non producible en v1) |
| noms des cibles (forme F), `status: skipped` | DETTE back, pas maintenant |
| 2 gestes = `commit {0}` / `commit {1}`, 2 options exactement | conforme, structurel |
| constats C des tours précédents | consignés, ni correctif ni tour |
| le lot n'est pas codé ; un amendement DOC seul suivra, sans changer clés ni textes | information, pas écart |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation (`*implementation-notes*`) ; tout rapport de juge ou de revue précédent — dont `…/carte-4-agit/maquette-9fa533b5/` et `…/maquette-r2-392643c3/` (INTERDITS : ils contiennent des rapports) et tout `REVUE*.md` du scratchpad ;
- les choix non sourcés ci-dessus.
