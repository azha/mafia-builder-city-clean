# Dossier du juge données — ④ L'ouverture : la carte de tête QUI AGIT — maquette r2 BORNÉ — SHA atelier b2ceebeb

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
| `~/project/atelier3d-mafia-c2/ecrans-brennar-accueil.html` — cadres **1** (avant geste), **6** (après geste, executed), **7** (NOUVEAU : échec de la 1re cible) ; le cadre 5 reste la référence de la carte de tête | source HTML/CSS — lis-la ÉPINGLÉE : `git -C ~/project/atelier3d-mafia-c2 show b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1:ecrans-brennar-accueil.html` |
| `reference/cadre-1-avant-geste.png`, `reference/cadre-6.png`, `reference/cadre-7.png` (1080×2102, ×3,6, rendus depuis ce SHA) | rendus |
| `reference/variantes-textes-392643c3.txt` | textes FR+EN des issues SANS cadre dessiné (sortie de `generateur-q5-apres-2026-10-11.py --variantes`) |

- **SHA atelier** : `b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1`, branche `atelier/client2-q5-apres-2026-10-11`, arbre `~/project/atelier3d-mafia-c2` (propre). Mots ratifiés par f2 : « La carte reste sur la table », « Retour à l'accueil / La carte vous attend encore. », « C'était déjà tranché » ; petit texte du jeton : « votre grande décision du jour » (EN « your big call of the day »). « structurelle » et « session » sont bannis (mots du système).
- Contraste / largeur non remesurés (rendu gelé pendant un gate) : ne pas conclure dessus.

## Back (B)
- **Cumul back** : `gate/cumul-2026-10-10` @ `7807d6c8` (merge lot/hl-card-agit : la carte exécute ; `target_count`, `projected_consequence`).
- **Stack locale** : NE PAS LA TOUCHER (ruling f2 11/11 : la pile de dev tourne `main`, le gate arrive). **Au moment 1, la colonne B est DÉDUITE du source du cumul `gate/cumul-2026-10-10` @ `7807d6c8`** — à déclarer ainsi dans le rapport. Les corps RÉELS se mesurent au moment 2, après le gate, sur la pile reconstruite (f2 signalera).
- **Compte** : aucun au moment 1 (B déduite) ; au moment 2 : frais, `POST /v1/auth/signup` puis `POST /v1/session/open`.
- **Seed** : au moment 2 seulement ; au moment 1, dire quel état est productible d'après le source (« déduit »).

## Front (F) : sans objet au moment 1.


## Tour BORNÉ — ce que tu vérifies (rien d'autre n'est rouvert)
Au tour précédent la maquette a été jugée non ratifiable ; elle a été corrigée. Tu confrontes la maquette corrigée au back et tu dis, point par point, CORRIGÉ / PARTIEL / NON CORRIGÉ, avec la preuve (cadre + ligne de source). Puis tu signales tout constat NOUVEAU que la correction a introduit (un mot sans source servie, une issue servie sans cadre ni variante).
1. Issue `executed` du plaidoyer : a-t-elle un texte (variante) ? Les 4 fournisseurs exécutants (codes 101, 102, 105, 107) sont-ils tous couverts ?
2. Échec de la 1re cible (erreur propre de la route, carte non tranchée) : cadre 7 — conforme à ce que le back sert ? Le « repli » (jamais le code brut) a-t-il une source ?
3. Ligne-or du cadre 6 : lit-elle la file (queue / backlog_badge / queue_pressure_band servis) ? Les deux cas (vide / non vide) sont-ils conformes aux clés ?
4. Jeton : plus de chiffre, « libre » / « pris » : sources `used` / `cap_reached` suffisantes ?
5. Mot-or de executed avec `executed_ids.length` (« …pour 2 locaux », pluriel ICU) et arrêt partiel « Fait pour {n} sur {total} » : sources servies (executed_ids, stopped_at…) et dérivation client table decision_type_key × outcome × stopped_at.
6. Variantes : 409 déjà tranchée (pastille .deja), options vides (`options: []`/`target_count: 0`) : couvertes ?
7. `target_count` est maintenant affiché : sa source et sa valeur possible (0 inclus).
8. Toute issue servie par `commit`/`skip` qui n'a NI cadre NI variante : lister celles qui restent (liste exhaustive, compte).

## Écarts ASSUMÉS — le juge les re-vérifie, il ne les rouvre pas comme défauts
| point | décision f2 |
|---|---|
| geste `skip` (POST …/skip) sans cadre ; « Pas maintenant » retiré | ASSUMÉ (décision du 08/10) |
| carte structurelle (noted même sur choix 0, 409 STRUCTURAL_CAP_EXHAUSTED) | ASSUMÉ (non producible en v1) |
| noms des cibles (forme F), `status: skipped` | DETTE back, pas maintenant |
| 2 gestes = `commit {0}` / `commit {1}`, 2 options exactement | conforme, structurel |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation ; les rapports de juges précédents (visuels ou données) ; les choix non sourcés ci-dessus.
- le dossier `maquette-9fa533b5/` (tour précédent) : N'Y TOUCHE PAS, ne l'ouvre pas.
