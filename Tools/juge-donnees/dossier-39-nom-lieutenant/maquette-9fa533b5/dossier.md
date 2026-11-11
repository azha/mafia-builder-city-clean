# Dossier du juge données — ㊴ Le dossier : piste « train de vie » AVEC le nom du lieutenant — maquette — SHA atelier 9fa533b5 (relancé par JUGE)

> Gabarit `.claude/skills/juge-donnees/dossier-gabarit.md`. Les cadres neufs ont été livrés par CLIENT-2 (SHA ci-dessous).
> Aucun rapport de juge précédent n'est fourni ni ne doit être cherché.

## Mode : maquette (moment 1 — maquette contre ce que le back renvoie)

## L'écran
- **Nom** : ㊴ Le dossier — « ce qu'ils ont sur vous », vue des pistes, piste « le train de vie »
- **Ce qu'on vient y faire** : voir par où ça fuit (comptabilité · rejets · train de vie) et, pour le train de vie, DE QUI il s'agit (un lieutenant nommé).
- **Domaine présumé** : `services/game-back/src/operational/forensic/` (`forensic.projection.service.ts`, `forensic-lifestyle-lieutenant.ts`), route `GET /v1/me/forensic` — le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `~/project/atelier3d-mafia-c2/ecrans-brennar-6.html` — cadre **152** (piste « le train de vie de Lt. Marrek », nom SERVI, bande watched) et cadre **153** (nom NON servi = null, option B) | source HTML/CSS |
| `reference/cadre-152-piste-nommee.png`, `reference/cadre-153-null.png` (1080×2102, ×3,6, rendus depuis ce SHA, étiquette vérifiée) | rendu — ratification f2 en attente |

- **SHA atelier** : `8b79f946fd664f16c54999c199f08d7ea9551c41`, branche `atelier/client2-q5-apres-2026-10-11`, arbre `~/project/atelier3d-mafia-c2` (propre). Cadres NEUFS, rien renuméroté. Mots PROPOSÉS (note des pistes…) en attente de f2.
- La bande `watched` se dit « On vous regarde » (cadres 131, 143, 152, 153). Mots ratifiés par f2 le 11/11. Le juge ne reçoit aucun « avant » : il juge 152/153 contre le back.

## Back (B)
- **Cumul back** : branche `gate/cumul-2026-10-10` @ `7807d6c8` (dépôt ~/project/mafia-clean-city) — B lu dans ce cumul.
- **Stack locale** : NE PAS LA TOUCHER (ruling f2 11/11 : la pile de dev tourne `main`, le gate arrive). **Au moment 1, la colonne B est DÉDUITE du source du cumul `gate/cumul-2026-10-10` @ `7807d6c8`** — à déclarer ainsi dans le rapport. Les corps RÉELS se mesurent au moment 2, après le gate, sur la pile reconstruite (f2 signalera).
- **Compte** : aucun au moment 1 (B déduite) ; au moment 2 : frais, `POST /v1/auth/signup` puis `POST /v1/session/open`.
- **Seed** : au moment 2 seulement ; au moment 1, dire quel état est productible d'après le source (« déduit »).

## Front (F) : sans objet au moment 1.

## Écarts ASSUMÉS déjà connus
| information | raison mesurée | source |
|---|---|---|
| acteurs de la vue « acteurs » : `actorRef` seul, aucun nom | non projeté | `generateur-dossier.py` en-tête de l'atelier (à re-vérifier dans le back) |
| prix du renseignement | jamais servi | idem |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation ; les rapports de juges précédents (visuels ou données) ; les choix non sourcés ci-dessus.
