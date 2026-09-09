# Dossier du juge données — ⑮ Les inspections (MIS Inspection Queue) — clôture — 2026-09-07

> Généré le 2026-09-07 par l'orchestrateur `mafia-juge` (demande f2 : *le juge-données n'a jamais tourné sur ces écrans, et le conteneur back vient
> d'être RECRÉÉ*). Tu es ⊥ : ni auteur de l'écran, ni juge visuel. Lis ce fichier, puis le mandat qu'on t'a passé verbatim.

## Mode : clôture — trois côtés, B (back) · M (maquette) · F (front)

**Ta question** : de tout ce que le back renvoie pour cet écran, qu'est-ce que la maquette montre, qu'est-ce que le front affiche — et
qu'est-ce qui est passé à côté ? Rends la table de couverture **dans sa forme canonique** : les DÉFAUTS (dessiné + disponible + non affiché ·
affiché sans source) et, **À PART**, les QUESTIONS « passé à côté ? » (disponible, jamais dessiné) — ces dernières sont pour l'user, elles
ne se fondent pas dans les défauts.

### Questions prioritaires (réponds-y d'abord, chacune avec ses preuves — puis la table complète)

1. **Les onze valeurs affichées** (« None » ×8, « Predominant » ×2, « Moderate » ×1 ; « district district-1 · Nominal » ; charge · régime · gravité · 6 origines) — pour chacune : quelle clé de `GET /v1/city/district/:id/inspection`, quelle contrainte de valeurs (CHECK / union), quel résolveur client — et lesquelles sont des enums bruts (classe `Lisible()`, 4 écrans).
2. **Vue d'ensemble → district unique** : la maquette résume la ville (« JOUR 26 · 2 DISTRICTS SOUS CHARGE · 16 AU CALME ») et nomme le district (« Verge-A ») ; le back sert-il un agrégat ville (route ?) et le nom du district (`world/districts.name`, forme F ?) ; l'écran appelle-t-il 1 district ou 18 ?
3. **L'action** « Déposer un signalement sur un bâtiment / 50 $ facturés plus tard » ↔ `POST /v1/city/inspection/report` (paramètres ? le tarif est-il servi ?) — absente de l'écran.
4. **8 rangées sur 11 répètent « rien »** : le back sert-il les zéros (la maquette les regroupe en un jeton) — c'est une question de projection ou de client ?

⚠️ Les nombres attribués à « f2 » ci-dessus sont des **DÉCLARATIONS** (mesures d'une autre session, commits du dépôt back cités). Tu ne les
recopies pas : tu mesures, tu confrontes, et **si vous divergez, la divergence est le finding**.

## L'écran

- **⑮ Les inspections (MIS Inspection Queue)** — contrôleur `InspectionScreenController` (client), dossier visuel `Tools/juge-visuel/police/`.
- Modules back du domaine (proposés, à VÉRIFIER par grep du mot du domaine dans tous les contrôleurs) : citysim/inspection (`city/district/:id/inspection`, `city/inspection/report`), MIS.
- Routes lues dans le dossier de code du contrôleur et ses clients (`capturer-corps-reels.py`, 04/09) :

| méthode | route | état le 04/09 | corps du 04/09 (ancien monde) |
|---|---|---|---|
| `GET` | `/v1/city/district/{id}/inspection` | appelée | `corps-reels-04-09/GET_city_district_id_inspection.json` |
| `POST` | `/v1/city/inspection/report` | mutation | `corps-reels-04-09/POST_city_inspection_report.json` |

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

- Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`, cadre **#32** « le registre de dispatch » (⚠️ le dossier visuel rendait #31 par erreur — #31 est le commissariat ⑰) ; et le canon de série 2 « LES INSPECTIONS — par district » (`police/inspections-canon.png`, direction REJETÉE par l'user mais c'est ce que le client implémente). Référence rendue : `reference-reference-⑮-1080x2102.png` (lien, 1080×2102 = 300 CSS × 3,6).
- Inventaire M : chaque élément porteur d'information (texte, valeur en dur, état visuel, liste et son cardinal), `Mxx → représente`.

## Front (F)

| archive (dans ce dossier, `git archive <SHA de la planche>`) | contenu |
|---|---|
| `front-03efb90/` | `Assets/Scripts/CitySim/Inspection`, `Assets/Scripts/Shell` au SHA `03efb90` — le client qui a rendu la planche |

- Contrôleur d'écran, DTO (`*Dtos.cs`), clients (`*Client.cs`), résolveurs i18n (`Libelle`, `Lisible`, `Label*`) : pour chaque champ DTO,
  compter puis LIRE chaque site (RENDU / LOGIQUE / IGNORÉ) ; lister tout ce qui est affiché sans champ (littéral, valeur en dur, dérivée).
- Planches (copies, jamais de lien) :

| fichier | source | sha256 | note |
|---|---|---|---|
| `planche-planche_les_inspections_1080x2400.png` | `Assets/Screenshots/planche_les_inspections_1080x2400.png` @ `03efb90` | `473697b885e7ef4e…` | surimpression sous chrome — demo_capture 72 118, campagne 14:56 du 06/09 |

## Écarts ASSUMÉS déjà connus (à re-vérifier, pas à recopier)

| information | raison | note |
|---|---|---|
| direction série 2 (« tableau de débogage ») vs série 6 | série 2 = REJETÉE par l'user (front.md:315-317) — écart de forme, hors de ton périmètre données | — |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les rapports des juges (visuels `Tools/juge-visuel/police/r*/`, données `Tools/juge-donnees/*/`), les notes d'implémentation,
  l'inventaire de dette — tu ne les ouvres pas ; ce dossier te donne les questions ;
- l'arbre de travail vivant du client (`Assets/Scripts` hors des archives `front-*/` de ce dossier) ;
- une capture neuve, un rendu, un run Unity.

## Contraintes machine — NON NÉGOCIABLES

Aucun `docker`, Unity, `npm`, `dotnet`, Chrome, rendu ni compilation. Outils : `curl` vers `http://localhost` (recette ci-dessus, compte
frais SEULEMENT), `python3`, `grep`, `sed`, `ls`, `cat`, `git log`/`git show` en LECTURE. Tu n'écris que dans ce dossier (`mesures/`,
`rapport.md`). Un compte qui décide va dans un `$( )` (jamais lu au terminal) ; un motif avec `|` passe en `grep -E`.
