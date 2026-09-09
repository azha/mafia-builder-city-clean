# Dossier du juge données — ① Le HUD de district (écran principal) — clôture PARTIELLE — 2026-09-06

> Préparé par l'orchestrateur `mafia-juge` le 2026-09-06 (soir). Lu en premier par le juge. Tout ce qui ne peut pas être
> rempli est dit « non fourni » avec la raison — jamais supprimé.

## Mode : clôture — PARTIELLE, sur demande explicite de f2

⚠️ L'écran ① n'est PAS `juge-visuel` APPROUVÉ (r8 du jour : NON APPROUVÉ 0B/3M/20m). Ce n'est donc pas la clôture de doctrine
(« un écran n'est fini qu'après ses deux juges »). C'est une passe DONNÉES commandée par l'orchestrateur de programme (f2) pour
deux questions que l'image ne sait pas trancher — et, si tu as la portée, la table de couverture complète de ①, qui servira telle
quelle à la clôture réelle. **Les captures sont SUSPENDUES** (le compte de capture a perdu 14 bâtiments et 2 planques vers 16:08Z ;
écrivain non identifié) : aucune stack, aucune capture neuve — tout ce que tu compares est FIGÉ et daté ci-dessous.

### Les deux questions prioritaires (réponds-y d'abord, chacune avec ses preuves)

1. **`.bandeau-alerte`** — la maquette pose un ruban plein-largeur « ✉ **Sal** a un rapport du soir — **lire** »
   (`hud-brennar.html:176`, CSS l. 82–85, `top:78px`). Le juge visuel r8 mesure **0 px** de ce ruban sur les trois planches et
   écrit : « composant non livré ou aucune alerte en attente sur ce compte ? ». Tranche : (a) quelle route / quelles clés du back
   portent « un rapport du soir à lire » (autonomy-reports ? file d'exceptions ? session/open ?) — corps réels fournis ; (b) sur le
   compte gelé, y a-t-il quelque chose en attente (valeur lue dans le corps, `fichier:clé`) ; (c) le front porte-t-il un composant
   qui dessine ce ruban (grep dans `front-43ac9cb/`, contrôle positif sur un composant qui existe). Conclusion en une ligne :
   **composant absent** / **composant présent, donnée vide** / **composant présent, donnée présente, non affiché** — et la classe.
2. **La barre de ratio du bandeau** — la maquette pose `.ratio` (74 px de piste `#5a6376`, remplissage `--or` ; `hud-brennar.html:59–60`,
   valeur codée en dur dans le canon — `.ratio i { width: … }`, lis-la). Le juge visuel mesure en jeu **73,68 CSS entièrement en or**
   (99,6 % de la piste) et ne sait pas distinguer « ratio à 100 % » de « pas de piste dessinée ». Tranche : (a) quelle clé du back
   donne ce ratio (session/open ? une bande ? un scalaire — note toute dérogation R2.2) ; (b) sa valeur sur le compte gelé ;
   (c) comment le front calcule la largeur (`fichier:ligne`) et s'il dessine une piste sous le remplissage. Conclusion : **100 %
   réel** / **piste absente** / **valeur en dur ou dérivée** — et la classe.

Ensuite, si tu as la portée : la table de couverture complète de ① (temps 1 → 7 du mandat), avec le contrôle d'arithmétique.
Une table PARTIELLE est recevable si elle dit sur quelles routes elle porte et applique le contrôle d'arithmétique à ces routes.

## L'écran

- **Nom** : ① Le HUD de district — l'écran principal (district sous chrome, fiche de bâtiment ouverte).
- **Ce qu'on vient y faire** : voir son quartier, lire la fiche d'un bâtiment (revenu, chaîne, état), collecter / blanchir /
  améliorer ; le bandeau dit l'argent, le jour, la phase du jour et la chaleur (médaillon).
- **Domaine présumé** : `services/game-back/src/city/`, `world/`, `session/`, `operational/` (collecte, blanchiment),
  `autonomy` (rapports), `exceptions` — le juge vérifie et complète (grep du mot du domaine dans TOUS les contrôleurs).

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/hud-brennar.html` — tout le fichier (bandeau, médaillon, `.bandeau-alerte`, `.ratio`, dock, fiche) | source HTML/CSS (l'information dessinée) |
| `reference-ecran-canon.png` (→ `Tools/juge-visuel/ecran-principal/r8-2026-09-06/ecran-canon.png`, 1176×2091 = 392 CSS ×3) | ce que l'user a approuvé — ⚠️ il porte de l'échafaudage d'atelier (6 pastilles `.co`, bascules 🌙/🔥, `.floater`) : ce n'est pas de l'information d'écran |

## Back (B) — stack NON disponible ⇒ B = corps RÉELS figés de la base gelée

- **Stack locale** : `docker` est INTERDIT à cette session et au juge (pile partagée d'autres sessions, captures suspendues). Pas de
  `docker ps`, pas de curl. **B vient des corps réels déjà capturés** sur le compte gelé, copiés dans `corps-reels/` :
  base `da/corps-reels` **`a0623a5`** (2026-09-06 11:02, back `main` **`fc944b62`**, compte `demo_capture@example.test`, **jour 50,
  minute 72 118**, district du joueur 1) — **le MÊME monde que les planches** (17:08, empreinte inchangée 72118 · 17 · 3 · 2, AVANT
  la perte de 16:08Z). Chaque corps porte sa provenance (`provenance`) et le corps sous `payload`/`response_meta`.
- **Corps fournis** (16 fichiers) : `GET_city_district_districtId_heat.json`, `GET_city_district_id_heat.json`, `GET_city_district_id_interior.json`, `GET_i18n_bundle_locale.json`, `GET_i18n_bundle_locale_fr.json`, `GET_world_districts.json`, `POST_auth_signin.json`, `POST_auth_signup.json`, `POST_operational_dealer_dealerId_collect.json`, `POST_operational_dealer_id_collect.json`, `POST_operational_laundering_inject.json`, `_index.json`, `_voisin_GET_autonomy-reports.json`, `_voisin_GET_exceptions_queue.json`, `_voisin_POST_session_open.json`, `empreinte-reference.json`. Les `_voisin_*` viennent du dossier ④ (accueil, même compte,
  même minute) : `session/open`, `autonomy-reports`, `exceptions/queue` — ce sont les routes candidates pour les deux questions.
- **Source back figée** : `back-fc944b62/services/game-back/src/` (`git archive fc944b62`) — contrôleurs, projections, schéma
  Drizzle, migrations. Lis-la pour les routes, les clés, les valeurs possibles (CHECK, unions) et B⁻. Les specs E2E ne sont pas
  archivées ici : `/home/erutheone/project/mafia-clean-city/tests/e2e/` en lecture seule (⚠️ `main` a avancé depuis `fc944b62` —
  cite `git log -1 -- <fichier>` si tu t'en sers, ou marque DÉDUIT).
- Toute route de lecture du domaine SANS corps fourni ⇒ ligne **DÉDUIT** (interface de projection + spec E2E), avec la raison
  « corps non capturé ». Un corps de mutation (`POST_*collect`, `*inject`) n'a pas été appelé (statut `None`) : il dit la route et
  ses paramètres, pas un ensemble de clés de réponse.

## Front (F)

| fichier (dans `front-43ac9cb/Assets/Scripts/`, `git archive 43ac9cb` du client `correcteur/ecrans` — le SHA des planches) | rôle |
|---|---|
| `CityMap/DistrictInteriorScreenController.cs` | contrôleur d'écran ① (district + fiche) |
| `Shell/TopBarController.cs`, `Shell/AppShell.cs`, `Shell/HomeChromeController.cs` | chrome : bandeau (ARGENT, JOUR, phase), médaillon, `.bandeau-alerte` ?, `.ratio` ?, dock |
| `Shell/SessionDtos.cs`, `Shell/SessionClient.cs` | `session/open` — DTO et route |
| `CityMap/CityProjectionDtos.cs`, `CityMap/CityProjectionsClient.cs`, `CityMap/WorldDtos.cs`, `CityMap/WorldApiClient.cs`, `CityMap/VillePeinteDtos.cs` | DTO désérialisés et routes appelées |
| `Shell/OrgVitalsPanelController.cs`, `Shell/DailyReviewDtos.cs` | voisins possibles (résolveurs de bandes, rapports) |
| résolveurs i18n : grep `Libelle|Label|Resolver` dans `front-43ac9cb/` | valeur → libellé |

- **Rapport `juge-visuel`** : `Tools/juge-visuel/ecran-principal/r8-2026-09-06/rapport.md` — **NON APPROUVÉ** (ne le lis pas ; le
  dossier te donne ce qu'il faut : les deux questions ci-dessus).
- **Planches** (liens) : `planche-capture-fiche-1080x1920.png`, `planche-capture-fiche-1080x2400.png`, `planche-capture-district-1080x2400.png`
  — client `43ac9cb`, compte gelé, journal `[CHROME-ALIMENTE] montant=«9 627 820,00 €» jour=50 chaleur=«BURNING» phase=«Aube» district=16`.
- **SHA du client** : `43ac9cb` · suite PlayMode : 49/51 (deux rouges connus : TD-648 fixture, TD-654 oracle de lunette).

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| les 3 chiffres de la fiche (revenu, chaîne, état) rendus en BANDES qualitatives (« Au repos · Coupée · Sain ») | R2.2 : le back projette des bandes, jamais de scalaire | doctrine du programme |
| « 37 % » du médaillon canon → un MOT (« Brûlant ») | même règle R2.2 ; bucket de chaleur | corps `GET_city_district_*_heat.json` |
| ronds du dock sans icône | arbitrage user connu (« j'aime pas les icônes ») | table ARBITRAGE ① |
| phase « Aube » : quart de journée depuis l'heure | résolveur nommé, pas d'enum brut | à vérifier dans `TopBarController.cs` |
| bloc ARGENT déplacé par la flèche retour | arbitrage user ouvert | — |
| nom du bâtiment de la fiche : servi (i18n) | bundle `GET_i18n_bundle_locale_fr.json` | — |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- la stack (interdite), toute capture neuve (suspendues), le journal complet du run ;
- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) — les répertoires
  `Tools/juge-visuel/ecran-principal/r*` et `Tools/juge-donnees/*/` voisins existent, tu ne les ouvres pas ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.

## Contraintes machine — NON NÉGOCIABLES

Aucun `docker`, Unity, `npm`, `dotnet`, Chrome, rendu ni compilation. Outils : `python3` (+PIL), `grep`, `sed`, `ls`, `cat`,
`git log`/`git show` en LECTURE. Tu n'écris que dans ce dossier (`mesures/`, `rapport.md`). Tu lis `front-43ac9cb/` et
`back-fc944b62/` ici, jamais les arbres de travail vivants des autres sessions.
