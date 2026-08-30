# Dossier du juge données — La réputation (screen_b3) — maquette — 2026-08-30

> Rempli par l'orchestrateur (session pilote-B). Tout ce qui ne peut pas être rempli se dit
> « non fourni » avec la raison.

## Mode : maquette

## L'écran

- **Nom** : ㊲ La réputation — `screen_b3` — « le miroir »
- **Ce qu'on vient y faire** : lire comment vos gens vous lisent — votre portrait tel qu'on vous
  voit (tenue), celui de votre lieutenant tel qu'il vous regarde (attitude), les règles de maison
  que VOUS avez déclarées publiquement — et en déclarer une nouvelle.
- **Domaine présumé** : `services/game-back/src/operational/reputation/` (contrôleur
  `reputation.controller.ts`, projection `reputation-hub.service.ts`, sous-services
  `boss-mirror.service.ts`, `restraint-index.service.ts`, `hidden-curriculum.service.ts`) —
  le juge vérifie et complète (une clé du domaine peut vivre sur une route `me/` ou `session/`).
- **Dépôt back** : `/home/erutheone/project/mafia-clean-city`

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` — section « LA RÉPUTATION (screen_b3) » (à partir de la ligne 5974) | source HTML/CSS (l'information dessinée) |
| `/home/erutheone/project/atelier3d-mafia/generateur-reputation.py` (+ `chassis6.py`) | le générateur qui a produit la section — données démo et primitives lisibles à la source |
| `/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/v6/m-119.png` … `m-124.png` | rendus PNG (900×1752 = rendu 3× d'un téléphone de 300 px CSS) |

Correspondance PNG ↔ cadres du générateur (fonction `reputation(cadre=…)`) :
m-119 = `canon` · m-120 = `regles` · m-121 = `derive` · m-122 = `gages` · m-123 = `vide` ·
m-124 = `lots`.

⚠️ La maquette n'est **pas encore ratifiée** — c'est le juge d'avant-ratification (mode maquette
du skill). Le bandeau haut de chaque cadre (argent / médaillon HEAT / jour+phase, ~121 px CSS)
est le **chrome commun du shell**, déjà livré par un autre lot et commun à toute la série 6 ;
l'écran commence sous lui. L'inventaire M peut le traiter à part.

## Back (B)

- **Stack locale** : montée (mesuré 2026-08-30 21:28, charge 1.43) :

      mafia-clean-city-traefik-1
      mafia-clean-city-game-back-1
      mafia-clean-city-bo-back-1
      mafia-clean-city-pg-1
      mafia-clean-city-redis-1
      mafia-clean-city-docker-socket-shim-1
      mafia-clean-city-bo-front-1

- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis
  `POST /v1/session/open`.
  ⛔ **Ne jamais employer** `operational_demo@example.test` ni `citymap_demo` : comptes partagés
  avec des éditeurs Unity pilotés par d'autres sessions — un `session/open` dessus casserait
  leurs fixtures (incident mesuré du 2026-08-21).
- **Particularité mesurée** : `GET /v1/me/reputation` exige `lieutenant_id` en query
  (`reputation.controller.ts:126` — 404 sans lui, 404 si non possédé). Le juge devra mesurer
  **comment un compte frais obtient un lieutenant** (kit de départ de `session/open` ?
  routes de recrutement ?) — et si aucun chemin joueur n'en donne, le dire.
- **Seed si nécessaire** : pas de seeder dédié réputation connu de ce dossier ; dimensionner par
  actions réelles (déclarer une règle via `POST /v1/me/house-rules`, etc.), sinon « corps à vide ».
- ⚠️ Machine partagée : rien de lourd (pas de gate, pas de stack supplémentaire — celle-ci suffit).

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| libellé de fiction des règles (« On ne touche pas aux familles ») | `rule_id` est libre, écrit par le joueur ; aucun libellé n'existe (bundle i18n : 67 clés, toutes `error.*`) — la maquette écrit un libellé de fiction ET l'identifiant réel dessous, et le déclare elle-même en maillon manquant (cadre m-124, L1) | `reputation.controller.ts:84-86` (« free-form, player-authored ») · en-tête de `generateur-reputation.py` |
| retirer une règle | `BossMirrorService.retractRule` existe sans appelant de production (seul appelant : `reputation-test.controller.ts:729`) — cadre m-124, L2 | `boss-mirror.service.ts:206` |
| section `restraint` (gages + noms des réglés) | omise du corps sans `counterparty_id` (query optionnelle) | `reputation-hub.service.ts:454` |
| `lieutenant_id` | paramètre appelant obligatoire — l'écran doit déjà savoir de qui il parle | `reputation.controller.ts:126` |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (l'écran Unity n'existe pas encore — mode maquette,
  pas de côté F) ;
- les rapports de juges précédents (visuels ou données), pour cet écran ou d'autres ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
