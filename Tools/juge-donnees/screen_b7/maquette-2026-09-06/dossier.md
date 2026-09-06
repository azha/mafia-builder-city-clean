# Dossier du juge données — ㊴ Le dossier (« ce qu'ils ont sur vous ») — maquette — 2026-09-06

> Rempli par l'orchestrateur (session `mafia-juge`), lu en premier par le juge. Tout ce qui ne peut pas être rempli
> est dit « non fourni » avec la raison — jamais supprimé.

## Mode : **maquette** (B vs M) — avec une particularité

L'écran est déjà CONSTRUIT dans le client, mais **aucun `juge-donnees` n'a jamais tourné sur lui** et le `juge-visuel`
n'a pas encore rendu : on est donc en mode maquette (deux côtés, B et M). Ce que ce rapport produit sert
immédiatement de **table des écarts ASSUMÉS** au dossier `juge-visuel` qui suit — écris-la comme telle (§Écarts à
consigner : chaque « dessiné sans source » avec sa raison mesurée et sa source).

## L'écran

- **Nom** : Le dossier (« ce qu'ils ont sur vous ») (㊴)
- **Ce qu'on vient y faire** : trois pistes indépendantes — audit, effluent, train de vie — qui ne se mélangent pas ; le dernier palier de chacune est un ÉVÉNEMENT (ils sont venus) ; qui parle, qui a peur, qui ne reviendra pas ; et ce qu'on peut acheter comme renseignement.
- **Domaine présumé** : `services/game-back/src/operational/forensic/` (ou `citysim/forensic`), `internal-affairs` (`me/internal-affairs/actors`, `…/:ref/intel`), `me/` — le juge vérifie et complète (grep le mot du domaine dans TOUS les contrôleurs).

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` — cadres 131 à 136 (l.6221-6236 — nominal #131 « trois pistes qui ne se mélangent pas ») (`<div class="cadre">`, index 0-based) | source HTML/CSS : l'information dessinée. Châssis : `/home/erutheone/project/atelier3d-mafia/chassis6.py` |
| `/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_b7/reference-1080x2102.png` | rendu du cadre NOMINAL (1080×2102, ×3,6) — ce que l'user a approuvé (ratification par délégation, 2026-09-02) |

## Back (B) — ⛔ AUCUNE stack à monter : un gate E2E occupe la machine

- **`docker ps` n'est PAS à lancer et `docker compose up` est INTERDIT pendant ce tour** : le gate E2E de la session
  `mafia-back` exige la machine (ruling : pendant un gate on ne lance RIEN d'autre). Un `curl` vers `http://localhost`
  n'atteindrait pas la pile dev de toute façon sans la perturber.
- ⇒ **B = les corps de réponse RÉELS déjà capturés** sous `Tools/juge-visuel/<dossier>/corps-reels/` (§DA-4,
  `capturer-corps-reels.py`) : une réponse réelle par route du dossier de code du contrôleur, sur la pile dev, compte
  de démo `operational_demo@example.test`, **provenance dans chaque fichier** (date 2026-09-04, `back_main 6ff684db`,
  image, X-Request-Id, statut, paramètres et leur source). Le manifeste `_index.json` donne l'état de chaque route :
  `appelée` (2xx) · `sans instance` (rien sur ce compte) · `mutation` (POST jamais appelé — le corps d'un compte
  modifié serait celui d'un autre monde) · `erreur` (404/409/403 réels du back = des faits).
- **Fraîcheur, mesurée le 2026-09-06** par `Tools/juge-visuel/verifier-fraicheur-corps.py` (branche `da/corps-reels`) :
  240 corps, tous `6ff684db` ; `main` back a avancé de 30 commits, **1 seule source back touchée**
  (`i18n/string_table.ts`) ⇒ **2 corps périmés sur 240** (les deux `GET_i18n_bundle_locale.json`, dossiers `carte` et
  `ecran-principal`), **238 opposables**. Traite un corps comme une mesure DATÉE : cite sa provenance.
- **Les valeurs possibles** de chaque clé se lisent dans le code back : `/home/erutheone/project/mafia-clean-city/services/game-back/src/` (`main` `b0cbde96`),
  migrations `db/migrations/`, schéma `db/schema/`, specs `/home/erutheone/project/mafia-clean-city/tests/e2e/`. Lecture seule — aucune commande qui
  compile, teste ou monte quoi que ce soit.
- Une route dont le corps est `sans instance` ou `mutation` n'a PAS d'ensemble de clés mesuré : B vient alors de
  l'interface de projection + la spec E2E qui épingle les clés, et la ligne porte **DÉDUIT** avec la raison.

- **Corps de ce dossier** (`/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_b7/corps-reels/`) : `GET_me_forensic.json`, `_index.json`.
  ⚠️ Le dossier de code du contrôleur n'expose qu'UNE route (`GET /v1/me/forensic`) ; front.md en nomme TROIS (`GET me/internal-affairs/actors`, `POST …/:ref/intel`) — leurs corps ne sont PAS capturés : à classer DÉDUIT depuis la projection et la spec, ou « non vérifié ».

## Front (F) — non fourni (mode maquette)

L'écran existe (`Assets/Scripts/…`), mais **tu ne le lis pas ce tour-ci** : F n'entre qu'au mode clôture, après le
juge visuel. Si tu as besoin de savoir « ce que le front affiche » pour classer une ligne, écris « F : non mesuré
(mode maquette) ».

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| le contrôleur accepte 5 types de cible (`clerk`, `port_inspector`, `lawyer`, `broker`, `judge_aide`), la projection n'en liste que 2 (`lawyer`, `clerk`) | désaccord route/projection mesuré au 2026-08-27 (front.md ㊴) — l'écran ne dessine que ce qui est listé et le déclare | front.md ㊴ |
| le PRIX du renseignement n'est jamais servi | aucune clé de prix (front.md ㊴) — le cadre #136 « ce qui manque encore » le dit | front.md ㊴ |
| `gone` ≠ `unavailable` | l'un revient, l'autre est définitif ; le back distingue, l'écran doit distinguer | front.md ㊴ |

⚠️ Ces trois lignes datent du 2026-08-27 et n'ont jamais été re-mesurées : **re-mesure-les** (le contrôleur, la projection, la spec) avant de les reprendre.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ;
- les rapports de juges précédents (visuels ou données) — il n'y en a AUCUN pour cet écran, et c'est délibéré ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas ;
- une stack montée, un compte frais, un `curl` : **pas ce tour-ci** (gate E2E). Tout ce qui l'exigerait va en
  « non vérifié » avec la commande qui trancherait, à rejouer après le gate.
