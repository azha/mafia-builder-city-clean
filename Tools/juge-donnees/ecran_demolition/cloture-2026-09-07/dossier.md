# Dossier du juge données — ㉝ Raser un site (« la fiche et la parcelle libérée ») — clôture — 2026-09-07

> Généré le 2026-09-07 par l'orchestrateur `mafia-juge` (demande f2 : *le juge-données n'a jamais tourné sur ces écrans, et le conteneur back vient
> d'être RECRÉÉ*). Tu es ⊥ : ni auteur de l'écran, ni juge visuel. Lis ce fichier, puis le mandat qu'on t'a passé verbatim.

## Mode : clôture — trois côtés, B (back) · M (maquette) · F (front)

**Ta question** : de tout ce que le back renvoie pour cet écran, qu'est-ce que la maquette montre, qu'est-ce que le front affiche — et
qu'est-ce qui est passé à côté ? Rends la table de couverture **dans sa forme canonique** : les DÉFAUTS (dessiné + disponible + non affiché ·
affiché sans source) et, **À PART**, les QUESTIONS « passé à côté ? » (disponible, jamais dessiné) — ces dernières sont pour l'user, elles
ne se fondent pas dans les défauts.

### Questions prioritaires (réponds-y d'abord, chacune avec ses preuves — puis la table complète)

1. **13 / 17 / 20** — f2 (back `ac93c8c1`, `7b0e6ea3`) déclare : la route sert `friction_bucket · penalty_active · friction_node_count` (**13** sur `demo_capture` = le CACHE de `friction_org_size` évalué au tick 72 000 ; **17** = bâtiments OPÉRATIONNELS = « VOS 17 SITES » ; **20** = périmètre réel possédés non rasés, affiché nulle part), cache en retard de 155 minutes ; correctif additif : `perimeter_site_count` ajouté à la route (`7b0e6ea3`). Mesure sur le conteneur recréé, compte frais + le compte que tu peux dimensionner : la clé neuve est-elle servie ? les deux clés portent-elles le même nombre ?
2. **« Ça tient »** — verdict affiché par le client : quel champ (`friction_bucket` = `balanced` ?) et quel résolveur ; « Ça grince partout » existe-t-il dans le résolveur ? (TD-662 : le libellé est faux, pas le nombre — « combien de sites » affiché comme « combien se gênent »).
3. **La liste « VOS N SITES »** (8 rangées, tranchée à mi-carte) — de quelle route vient chaque rangée (nom de site, type, statut) ? Le qualifiant de lieu (« Les Friches, îlot 1604 » dans la maquette) est-il servi (B) ? projeté ? (forme F candidate).
4. Le CTA « VOIR CE QUI COÛTE LE PLUS » ↔ route ? et l'action de démolition (`POST` ?) ↔ CTA ?

⚠️ Les nombres attribués à « f2 » ci-dessus sont des **DÉCLARATIONS** (mesures d'une autre session, commits du dépôt back cités). Tu ne les
recopies pas : tu mesures, tu confrontes, et **si vous divergez, la divergence est le finding**.

## L'écran

- **㉝ Raser un site (« la fiche et la parcelle libérée »)** — contrôleur `DemolitionScreenController` (client), dossier visuel `Tools/juge-visuel/ecran_demolition/`.
- Modules back du domaine (proposés, à VÉRIFIER par grep du mot du domaine dans tous les contrôleurs) : core_loops/demolition (friction : `friction_*`, `replacement-options`), citysim/district_interior.
- Routes lues dans le dossier de code du contrôleur et ses clients (`capturer-corps-reels.py`, 04/09) :

| méthode | route | état le 04/09 | corps du 04/09 (ancien monde) |
|---|---|---|---|
| `GET` | `/v1/city/district/{districtId}/interior` | appelée | `corps-reels-04-09/GET_city_district_districtId_interior.json` |
| `GET` | `/v1/city/district/{id}/interior` | appelée | `corps-reels-04-09/GET_city_district_id_interior.json` |
| `GET` | `/v1/friction/nodes/` | appelée | `corps-reels-04-09/GET_friction_nodes.json` |
| `GET` | `/v1/friction/nodes/{buildingId}` | appelée | `corps-reels-04-09/GET_friction_nodes_buildingId.json` |
| `POST` | `/v1/friction/nodes/{buildingId}/decommission` | mutation | `corps-reels-04-09/POST_friction_nodes_buildingId_decommission.json` |
| `GET` | `/v1/friction/replacement-options` | appelée | `corps-reels-04-09/GET_friction_replacement-options.json` |
| `GET` | `/v1/friction/replacement-options/` | sans instance | `corps-reels-04-09/GET_friction_replacement-options.json` |
| `POST` | `/v1/friction/replacement-options/{id}/pick` | mutation | `corps-reels-04-09/POST_friction_replacement-options_id_pick.json` |
| `GET` | `/v1/friction/state` | appelée | `corps-reels-04-09/GET_friction_state.json` |
| `GET` | `/v1/world/districts` | appelée | `corps-reels-04-09/GET_world_districts.json` |

## Back (B) — la stack dev est JOIGNABLE, et le conteneur est RECRÉÉ

- `http://localhost` (Traefik) → `game-back` **recréé le 07/09 ~13:50** (image fraîche ; `GET /v1/i18n/bundle?locale=fr` → 200). Le SHA du back
  dans l'image n'est PAS imprimé par une route : `main` du dépôt back = `3117f159` au moment de ce dossier — **DÉDUIT** pour l'image, à
  écrire comme tel. Source back en LECTURE : `/home/erutheone/project/mafia-clean-city/services/game-back/src/` (contrôleurs, projections,
  schéma Drizzle `db/schema/`, migrations), `tests/e2e/` — jamais modifiée.
- **Mesure B sur COMPTE FRAIS**, recette du mandat (signup avec `Idempotency-Key`, puis `session/open`, puis chaque route de lecture avec
  le jeton) — commande ET sortie dans `mesures/`. ⛔ **Jamais** `operational_demo@…` ni `demo_capture@…` (comptes partagés, captures en
  cours chez le correcteur) ; ⛔ **aucune route `_test`**, aucun `advance`/tick, aucune mutation qui n'est pas nécessaire à dimensionner
  (si tu dois dimensionner, dis-le et fais-le sur TON compte frais). Un corps vide n'est pas un ensemble de clés : dimensionne ou écris
  « mesuré à vide ».
- **Corps du 04/09** (`corps-reels-04-09/`, compte `operational_demo`, image du 04-09 ⇒ **ANCIEN MONDE**) : utiles pour la FORME (ensemble de
  clés d'alors) et comme témoin de ce que les planches ont photographié — **jamais opposables en valeur** au conteneur recréé.
- **B⁻** : colonnes des tables du domaine qu'aucune projection joueur ne porte (`db/schema/`), candidates forme F.

## Maquette (M)

- Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`, cadres #79–84 (l'homologue de la capture est **#79** « L'organisation frotte » — pas #80). Référence rendue : `reference-reference-1080x2102.png` (lien, 1080×2102 = 300 CSS × 3,6).
- Inventaire M : chaque élément porteur d'information (texte, valeur en dur, état visuel, liste et son cardinal), `Mxx → représente`.

## Front (F)

| archive (dans ce dossier, `git archive <SHA de la planche>`) | contenu |
|---|---|
| `front-03efb90/` | `Assets/Scripts/Operational/Demolition`, `Assets/Scripts/Shell` au SHA `03efb90` — le client qui a rendu la planche |

- Contrôleur d'écran, DTO (`*Dtos.cs`), clients (`*Client.cs`), résolveurs i18n (`Libelle`, `Lisible`, `Label*`) : pour chaque champ DTO,
  compter puis LIRE chaque site (RENDU / LOGIQUE / IGNORÉ) ; lister tout ce qui est affiché sans champ (littéral, valeur en dur, dérivée).
- Planches (copies, jamais de lien) :

| fichier | source | sha256 | note |
|---|---|---|---|
| `planche-planche_raser_un_site_1080x2400.png` | `Assets/Screenshots/planche_raser_un_site_1080x2400.png` @ `03efb90` | `173534a519d41ae4…` | surimpression sous chrome (suite de planches) — compte demo_capture, horloge 72 118, campagne 14:56 du 06/09 |

## Écarts ASSUMÉS déjà connus (à re-vérifier, pas à recopier)

| information | raison | note |
|---|---|---|
| liste « VOS N SITES » absente de la maquette | point d'entrée de menu ⇒ liste nécessaire, maquette incomplète — tranché f2 07/09 (blender) | juge sa SOURCE de données, pas sa présence |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les rapports des juges (visuels `Tools/juge-visuel/ecran_demolition/r*/`, données `Tools/juge-donnees/*/`), les notes d'implémentation,
  l'inventaire de dette — tu ne les ouvres pas ; ce dossier te donne les questions ;
- l'arbre de travail vivant du client (`Assets/Scripts` hors des archives `front-*/` de ce dossier) ;
- une capture neuve, un rendu, un run Unity.

## Contraintes machine — NON NÉGOCIABLES

Aucun `docker`, Unity, `npm`, `dotnet`, Chrome, rendu ni compilation. Outils : `curl` vers `http://localhost` (recette ci-dessus, compte
frais SEULEMENT), `python3`, `grep`, `sed`, `ls`, `cat`, `git log`/`git show` en LECTURE. Tu n'écris que dans ce dossier (`mesures/`,
`rapport.md`). Un compte qui décide va dans un `$( )` (jamais lu au terminal) ; un motif avec `|` passe en `grep -E`.
