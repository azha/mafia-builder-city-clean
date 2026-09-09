# Dossier du juge données — ㊳ Le journal & la rue (« ce qui se dit ce matin ») — clôture — 2026-09-07

> Généré le 2026-09-07 par l'orchestrateur `mafia-juge` (demande f2 : *le juge-données n'a jamais tourné sur ces écrans, et le conteneur back vient
> d'être RECRÉÉ*). Tu es ⊥ : ni auteur de l'écran, ni juge visuel. Lis ce fichier, puis le mandat qu'on t'a passé verbatim.

## Mode : clôture — trois côtés, B (back) · M (maquette) · F (front)

**Ta question** : de tout ce que le back renvoie pour cet écran, qu'est-ce que la maquette montre, qu'est-ce que le front affiche — et
qu'est-ce qui est passé à côté ? Rends la table de couverture **dans sa forme canonique** : les DÉFAUTS (dessiné + disponible + non affiché ·
affiché sans source) et, **À PART**, les QUESTIONS « passé à côté ? » (disponible, jamais dessiné) — ces dernières sont pour l'user, elles
ne se fondent pas dans les défauts.

### Questions prioritaires (réponds-y d'abord, chacune avec ses preuves — puis la table complète)

1. **Les 10 clés i18n brutes** affichées en TITRE (`press.outlet.free_weekly.name`, `news_beat.digest.ambient_micro.*.headline`) — f2 (back `2078d7b0`) déclare : l'image de dev du 04-09 servait **0** `news_beat.*` / **0** `press.*` (674 messages) ; après recréation **154 / 9** (886). Mesure le bundle `GET /v1/i18n/bundle?locale=fr` sur le conteneur recréé : les 10 clés de la planche y sont-elles ? ⇒ si oui, le finding B1 du juge visuel est un artefact d'image, pas un trou de contenu — dis-le comme une mesure.
2. **20 + 13 + 02 = 35 annoncés contre 5 cartes** — f2 déclare « le back en sert 36 sur trois routes ». Quelles routes, combien d'entrées chacune, et pourquoi l'écran n'en montre que 5 (troncature client ? pagination ? clipping) : F doit dire où les 31 autres passent.
3. **Le bloc « à la une »** (1 héros + 3 brèves dans la maquette, 5 rangées identiques en jeu) : le back distingue-t-il une « une » (clé de rang, poids, `is_headline` ?) — B ou B⁻ ?
4. **`district-13 · fresh`** affiché : quel champ, quel résolveur (mot anglais = valeur brute ?) ; le CTA « Y PRÊTER ATTENTION » ↔ `POST ambient/attend/:id` (maillon L3 déclaré par #130).

⚠️ Les nombres attribués à « f2 » ci-dessus sont des **DÉCLARATIONS** (mesures d'une autre session, commits du dépôt back cités). Tu ne les
recopies pas : tu mesures, tu confrontes, et **si vous divergez, la divergence est le finding**.

## L'écran

- **㊳ Le journal & la rue (« ce qui se dit ce matin »)** — contrôleur `JournalScreenController` (client), dossier visuel `Tools/juge-visuel/screen_c1/`.
- Modules back du domaine (proposés, à VÉRIFIER par grep du mot du domaine dans tous les contrôleurs) : operational/news_beat (`news/feed`, `news/beats`, `ambient/feed`, `random-world/*`), i18n (`press.outlet.*`, `news_beat.*`).
- Routes lues dans le dossier de code du contrôleur et ses clients (`capturer-corps-reels.py`, 04/09) :

| méthode | route | état le 04/09 | corps du 04/09 (ancien monde) |
|---|---|---|---|
| `POST` | `/v1/ambient/attend/` | mutation | `corps-reels-04-09/POST_ambient_attend.json` |
| `POST` | `/v1/ambient/attend/{id}` | mutation | `corps-reels-04-09/POST_ambient_attend_id.json` |
| `GET` | `/v1/ambient/feed` | appelée | `corps-reels-04-09/GET_ambient_feed.json` |
| `GET` | `/v1/news/beats/` | appelée | `corps-reels-04-09/GET_news_beats.json` |
| `GET` | `/v1/news/beats/{id}` | appelée | `corps-reels-04-09/GET_news_beats_id.json` |
| `GET` | `/v1/news/feed` | appelée | `corps-reels-04-09/GET_news_feed.json` |
| `GET` | `/v1/random-world/active` | appelée | `corps-reels-04-09/GET_random-world_active.json` |
| `POST` | `/v1/random-world/hollow/` | mutation | `corps-reels-04-09/POST_random-world_hollow.json` |
| `POST` | `/v1/random-world/hollow/{eventId}/attend-funeral` | mutation | `corps-reels-04-09/POST_random-world_hollow_eventId_attend-funeral.json` |
| `GET` | `/v1/random-world/known-couplings` | appelée | `corps-reels-04-09/GET_random-world_known-couplings.json` |

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

- Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`, cadres #125–130 (nominal #125 ; #129 = état vide ; #130 = fiche de dette qui déclare les maillons L1/L3). Référence rendue : `reference-reference-1080x2102.png` (lien, 1080×2102 = 300 CSS × 3,6).
- Inventaire M : chaque élément porteur d'information (texte, valeur en dur, état visuel, liste et son cardinal), `Mxx → représente`.

## Front (F)

| archive (dans ce dossier, `git archive <SHA de la planche>`) | contenu |
|---|---|
| `front-31d8e43/` | `Assets/Scripts/Operational/Journal`, `Assets/Scripts/Shell` au SHA `31d8e43` — le client qui a rendu la planche |
| `front-fd0e21e/` | `Assets/Scripts/Operational/Journal`, `Assets/Scripts/Shell` au SHA `fd0e21e` — le client qui a rendu la planche |

- Contrôleur d'écran, DTO (`*Dtos.cs`), clients (`*Client.cs`), résolveurs i18n (`Libelle`, `Lisible`, `Label*`) : pour chaque champ DTO,
  compter puis LIRE chaque site (RENDU / LOGIQUE / IGNORÉ) ; lister tout ce qui est affiché sans champ (littéral, valeur en dur, dérivée).
- Planches (copies, jamais de lien) :

| fichier | source | sha256 | note |
|---|---|---|---|
| `planche-screen_c1_journal_sous_chrome_1080x2400.png` | `Assets/Screenshots/screen_c1_journal_sous_chrome_1080x2400.png` @ `31d8e43` | `616f11dcbe4027be…` | sous chrome via Plus — identité MUETTE (aucune déclaration), campagne 10:50 du 06/09 |
| `planche-screen_c1_1080x2400.png` | `Assets/Screenshots/screen_c1_1080x2400.png` @ `fd0e21e` | `b0c65031c8502071…` | écran seul (JournalScreenPlayModeTests) — demo_capture 72 155, 20:53 |

## Écarts ASSUMÉS déjà connus (à re-vérifier, pas à recopier)

| information | raison | note |
|---|---|---|
| pied / CTA « Y PRÊTER ATTENTION » absent | maillon L3 déclaré par la maquette (#130) — route `POST ambient/attend` existe-t-elle ? c'est ta table des actions | — |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les rapports des juges (visuels `Tools/juge-visuel/screen_c1/r*/`, données `Tools/juge-donnees/*/`), les notes d'implémentation,
  l'inventaire de dette — tu ne les ouvres pas ; ce dossier te donne les questions ;
- l'arbre de travail vivant du client (`Assets/Scripts` hors des archives `front-*/` de ce dossier) ;
- une capture neuve, un rendu, un run Unity.

## Contraintes machine — NON NÉGOCIABLES

Aucun `docker`, Unity, `npm`, `dotnet`, Chrome, rendu ni compilation. Outils : `curl` vers `http://localhost` (recette ci-dessus, compte
frais SEULEMENT), `python3`, `grep`, `sed`, `ls`, `cat`, `git log`/`git show` en LECTURE. Tu n'écris que dans ce dossier (`mesures/`,
`rapport.md`). Un compte qui décide va dans un `$( )` (jamais lu au terminal) ; un motif avec `|` passe en `grep -E`.
