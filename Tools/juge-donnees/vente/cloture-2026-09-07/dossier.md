# Dossier du juge données — ㉟ La vente (« les points de vente ») — clôture — 2026-09-07

> Généré le 2026-09-07 par l'orchestrateur `mafia-juge` (demande f2 : *le juge-données n'a jamais tourné sur ces écrans, et le conteneur back vient
> d'être RECRÉÉ*). Tu es ⊥ : ni auteur de l'écran, ni juge visuel. Lis ce fichier, puis le mandat qu'on t'a passé verbatim.

## Mode : clôture — trois côtés, B (back) · M (maquette) · F (front)

**Ta question** : de tout ce que le back renvoie pour cet écran, qu'est-ce que la maquette montre, qu'est-ce que le front affiche — et
qu'est-ce qui est passé à côté ? Rends la table de couverture **dans sa forme canonique** : les DÉFAUTS (dessiné + disponible + non affiché ·
affiché sans source) et, **À PART**, les QUESTIONS « passé à côté ? » (disponible, jamais dessiné) — ces dernières sont pour l'user, elles
ne se fondent pas dans les défauts.

### Questions prioritaires (réponds-y d'abord, chacune avec ses preuves — puis la table complète)

1. **Les 8 clés servies** par `GET /v1/operational/dealers` / `dealer/:id` — f2 (back `a71e64a8`) déclare : `dealer · name_i18n · activity_band · cash_band · substance · margin_band · addiction_loyalty_status · withdrawn`, le contrôleur n'en ajoute aucune. Mesure-le sur le conteneur RECRÉÉ et confronte : toute clé en plus ou en moins est le finding.
2. **« Brindle »** — f2 déclare `substance: "BRINDLE"`, enum fermée servie ⇒ la capitale vient du client. Vérifie l'enum (CHECK / union) et le résolveur client.
3. **District et lek** — f2 déclare deux formes F REFERMÉES (`district_name` sous le nom de fiction, `lek_band` — 4 valeurs là où le canon en déclare 3). Le conteneur recréé les sert-il ? Sinon : forme F toujours ouverte.
4. **Tarif** — f2 (back `ef7a4095`) déclare que `p_cents` n'a AUCUN `UPDATE` (forme B : la transition n'est jamais écrite, les deux lanes valent la graine 2 500) et qu'une **`lane_band` FAST / STEADY / SCATTERED** a été livrée à la place. Le conteneur la sert-il ? Le client la lit-il ?
5. **Ce que la planche AFFICHE** : « Moderate » / « Standard » (buckets), « aucune planque n'existe encore » contre 2 planques dans l'empreinte du compte, statut « AU POSTE », jauges à 5 carrés — pour chaque affichage : quel champ, quel résolveur, ou valeur en dur ?

⚠️ Les nombres attribués à « f2 » ci-dessus sont des **DÉCLARATIONS** (mesures d'une autre session, commits du dépôt back cités). Tu ne les
recopies pas : tu mesures, tu confrontes, et **si vous divergez, la divergence est le finding**.

## L'écran

- **㉟ La vente (« les points de vente »)** — contrôleur `SellingScreenController` (client), dossier visuel `Tools/juge-visuel/vente/`.
- Modules back du domaine (proposés, à VÉRIFIER par grep du mot du domaine dans tous les contrôleurs) : operational/selling (+ dealers, leks : `deal_leks`, `buildings → blocks` pour le district).
- Routes lues dans le dossier de code du contrôleur et ses clients (`capturer-corps-reels.py`, 04/09) :

| méthode | route | état le 04/09 | corps du 04/09 (ancien monde) |
|---|---|---|---|
| `GET` | `/v1/operational/dealer/{id}` | sans instance | `corps-reels-04-09/GET_operational_dealer_id.json` |
| `POST` | `/v1/operational/dealer/{id}/collect` | mutation | `corps-reels-04-09/POST_operational_dealer_id_collect.json` |
| `GET` | `/v1/operational/dealers` | appelée | `corps-reels-04-09/GET_operational_dealers.json` |

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

- Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`, cadres #107–112 (nominal #107 « la vente » ; le juge visuel a jugé contre #107 et #109 en source). Référence rendue : `reference-reference-1080x2102.png` (lien, 1080×2102 = 300 CSS × 3,6).
- Inventaire M : chaque élément porteur d'information (texte, valeur en dur, état visuel, liste et son cardinal), `Mxx → représente`.

## Front (F)

| archive (dans ce dossier, `git archive <SHA de la planche>`) | contenu |
|---|---|
| `front-fd0e21e/` | `Assets/Scripts/Operational/Selling`, `Assets/Scripts/Shell` au SHA `fd0e21e` — le client qui a rendu la planche |

- Contrôleur d'écran, DTO (`*Dtos.cs`), clients (`*Client.cs`), résolveurs i18n (`Libelle`, `Lisible`, `Label*`) : pour chaque champ DTO,
  compter puis LIRE chaque site (RENDU / LOGIQUE / IGNORÉ) ; lister tout ce qui est affiché sans champ (littéral, valeur en dur, dérivée).
- Planches (copies, jamais de lien) :

| fichier | source | sha256 | note |
|---|---|---|---|
| `planche-la_vente_1080x2400.png` | `Assets/Screenshots/la_vente_1080x2400.png` @ `fd0e21e` | `5371053c4796f377…` | sous chrome, suite LaVenteCapturePlayModeTests — compte demo_capture, horloge 72 155, campagne 20:53 du 06/09 |

## Écarts ASSUMÉS déjà connus (à re-vérifier, pas à recopier)

| information | raison | note |
|---|---|---|
| « AFFECTER UN DEALER » absent (CTA de la maquette) | dépendance BACK : aucune route ne sert la liste des dealers affectables (lot L3) — tranché f2 07/09 | route ↔ CTA : à porter dans la table des actions, pas en défaut d'écran |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les rapports des juges (visuels `Tools/juge-visuel/vente/r*/`, données `Tools/juge-donnees/*/`), les notes d'implémentation,
  l'inventaire de dette — tu ne les ouvres pas ; ce dossier te donne les questions ;
- l'arbre de travail vivant du client (`Assets/Scripts` hors des archives `front-*/` de ce dossier) ;
- une capture neuve, un rendu, un run Unity.

## Contraintes machine — NON NÉGOCIABLES

Aucun `docker`, Unity, `npm`, `dotnet`, Chrome, rendu ni compilation. Outils : `curl` vers `http://localhost` (recette ci-dessus, compte
frais SEULEMENT), `python3`, `grep`, `sed`, `ls`, `cat`, `git log`/`git show` en LECTURE. Tu n'écris que dans ce dossier (`mesures/`,
`rapport.md`). Un compte qui décide va dans un `$( )` (jamais lu au terminal) ; un motif avec `|` passe en `grep -E`.
