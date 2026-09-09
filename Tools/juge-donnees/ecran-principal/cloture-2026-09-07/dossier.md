# Dossier du juge données — ① L'intérieur de district (« le HUD de Brennar ») + ② la fiche — clôture — 2026-09-07

> Généré le 2026-09-07 par l'orchestrateur `mafia-juge` (demande f2 : *le juge-données n'a jamais tourné sur ces écrans, et le conteneur back vient
> d'être RECRÉÉ*). Tu es ⊥ : ni auteur de l'écran, ni juge visuel. Lis ce fichier, puis le mandat qu'on t'a passé verbatim.

## Mode : clôture — trois côtés, B (back) · M (maquette) · F (front)

**Ta question** : de tout ce que le back renvoie pour cet écran, qu'est-ce que la maquette montre, qu'est-ce que le front affiche — et
qu'est-ce qui est passé à côté ? Rends la table de couverture **dans sa forme canonique** : les DÉFAUTS (dessiné + disponible + non affiché ·
affiché sans source) et, **À PART**, les QUESTIONS « passé à côté ? » (disponible, jamais dessiné) — ces dernières sont pour l'user, elles
ne se fondent pas dans les défauts.

### Questions prioritaires (réponds-y d'abord, chacune avec ses preuves — puis la table complète)

1. **11 marqueurs pour 17 bâtiments** (journal : 17 bâtiments possédés ; la planche montre 11 pastilles, 9 bit-identiques) — `GET /v1/city/district/:id/interior` sert-il 17 entrées, 11, ou moins ? Pour le district affiché (16 ? le journal dit district=16) : combien de bâtiments du joueur y sont ; les 6 manquants sont-ils dans d'autres districts, ou servis et non rendus (F) ?
2. **Chaque pastille est-elle distinguable par la DONNÉE** : la route sert-elle un type (`icon_archetype`, `operational_type`), un nom (`name_i18n`), un état par bâtiment ? Si oui et que 9/11 sont identiques à l'écran ⇒ défaut F.
3. **La piste du ratio** (absente OU ratio à 100 %), **le bandeau d'alerte** (absent OU aucune alerte), **la 3ᵉ stat de la fiche en crème** (valeur « Sain » ?) — trois « ou » du juge visuel que seule la donnée tranche : quelle clé, quelle valeur servie sur ce compte.
4. **La fiche** : les 3 bandes (revenu, chaîne, état) et les 3 actions (COLLECTER · BLANCHIR · AMÉLIORER) ↔ routes `POST` ; le nom du bâtiment (`name_i18n`) ; ce que la route sert et que la fiche ignore (B⁻ / F ignoré).

⚠️ Les nombres attribués à « f2 » ci-dessus sont des **DÉCLARATIONS** (mesures d'une autre session, commits du dépôt back cités). Tu ne les
recopies pas : tu mesures, tu confrontes, et **si vous divergez, la divergence est le finding**.

## L'écran

- **① L'intérieur de district (« le HUD de Brennar ») + ② la fiche** — contrôleur `DistrictInteriorScreenController` (client), dossier visuel `Tools/juge-visuel/ecran-principal/`.
- Modules back du domaine (proposés, à VÉRIFIER par grep du mot du domaine dans tous les contrôleurs) : citysim/district_interior (`city/district/:id/interior`, `…/heat`), world (`world/districts`), session (`session/open`), economy (`wallet`), operational/dealer (`collect`).
- Routes lues dans le dossier de code du contrôleur et ses clients (`capturer-corps-reels.py`, 04/09) :

| méthode | route | état le 04/09 | corps du 04/09 (ancien monde) |
|---|---|---|---|
| `POST` | `/v1/auth/signin` | mutation | `corps-reels-04-09/POST_auth_signin.json` |
| `POST` | `/v1/auth/signup` | mutation | `corps-reels-04-09/POST_auth_signup.json` |
| `GET` | `/v1/city/district/{districtId}/heat` | appelée | `corps-reels-04-09/GET_city_district_districtId_heat.json` |
| `GET` | `/v1/city/district/{id}/interior` | appelée | `corps-reels-04-09/GET_city_district_id_interior.json` |
| `GET` | `/v1/i18n/bundle?locale=` | appelée | `corps-reels-04-09/GET_i18n_bundle_locale.json` |
| `POST` | `/v1/operational/dealer/{id}/collect` | mutation | `corps-reels-04-09/POST_operational_dealer_id_collect.json` |
| `POST` | `/v1/operational/laundering/inject` | mutation | `corps-reels-04-09/POST_operational_laundering_inject.json` |
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

- Source : `/home/erutheone/project/atelier3d-mafia/hud-brennar.html` (canon du HUD, `.tel` 392 CSS ; `ecran-principal/ecran-canon.png` = rendu ratifié, pastilles ①..⑥ = annotations) ; la fiche = `.fiche` du même canon. Référence rendue : `reference-ecran-canon.png` (lien, canon HUD 1176 px = 392 CSS × 3).
- Inventaire M : chaque élément porteur d'information (texte, valeur en dur, état visuel, liste et son cardinal), `Mxx → représente`.

## Front (F)

| archive (dans ce dossier, `git archive <SHA de la planche>`) | contenu |
|---|---|
| `front-d5ddc40/` | `Assets/Scripts/CityMap`, `Assets/Scripts/Shell` au SHA `d5ddc40` — le client qui a rendu la planche |

- Contrôleur d'écran, DTO (`*Dtos.cs`), clients (`*Client.cs`), résolveurs i18n (`Libelle`, `Lisible`, `Label*`) : pour chaque champ DTO,
  compter puis LIRE chaque site (RENDU / LOGIQUE / IGNORÉ) ; lister tout ce qui est affiché sans champ (littéral, valeur en dur, dérivée).
- Planches (copies, jamais de lien) :

| fichier | source | sha256 | note |
|---|---|---|---|
| `planche-screen_1_district_sous_chrome_1080x2400.png` | `Assets/Screenshots/screen_1_district_sous_chrome_1080x2400.png` @ `d5ddc40` | `b94df80445523159…` | district sous chrome APRÈS le correctif du snap — compte operational_demo (régime=défaut), empreinte 77 353 · 17 bâtiments · 3 lt · 2 planques · 314 cartes, journal JOINT |
| `planche-vue_principale_fiche_1080x2400.png` | `Assets/Screenshots/vue_principale_fiche_1080x2400.png` @ `d5ddc40` | `3bfeffeed0c08012…` | fiche ouverte sur le premier bâtiment, même compte |

## Écarts ASSUMÉS déjà connus (à re-vérifier, pas à recopier)

| information | raison | note |
|---|---|---|
| 3 chiffres de la fiche rendus en BANDES | R2.2 : jamais de scalaire en projection joueur | — |
| « 37 % » du médaillon → un MOT (« Brûlant ») | R2.2, bucket de chaleur | — |
| phase « — » hors district = état voulu ; ronds du dock = arbitrage | rulings | — |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les rapports des juges (visuels `Tools/juge-visuel/ecran-principal/r*/`, données `Tools/juge-donnees/*/`), les notes d'implémentation,
  l'inventaire de dette — tu ne les ouvres pas ; ce dossier te donne les questions ;
- l'arbre de travail vivant du client (`Assets/Scripts` hors des archives `front-*/` de ce dossier) ;
- une capture neuve, un rendu, un run Unity.

## Contraintes machine — NON NÉGOCIABLES

Aucun `docker`, Unity, `npm`, `dotnet`, Chrome, rendu ni compilation. Outils : `curl` vers `http://localhost` (recette ci-dessus, compte
frais SEULEMENT), `python3`, `grep`, `sed`, `ls`, `cat`, `git log`/`git show` en LECTURE. Tu n'écris que dans ce dossier (`mesures/`,
`rapport.md`). Un compte qui décide va dans un `$( )` (jamais lu au terminal) ; un motif avec `|` passe en `grep -E`.
