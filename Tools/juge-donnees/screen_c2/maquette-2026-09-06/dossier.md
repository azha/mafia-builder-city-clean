# Dossier du juge données — ㊵ Le blanchiment (« la filière ») — maquette — 2026-09-06

> Rempli par l'orchestrateur (session `mafia-juge`), lu en premier par le juge. Tout ce qui ne peut pas être rempli
> est dit « non fourni » avec la raison — jamais supprimé.

## Mode : **maquette** (B vs M) — avec une particularité

L'écran est déjà CONSTRUIT dans le client, mais **aucun `juge-donnees` n'a jamais tourné sur lui** et le `juge-visuel`
n'a pas encore rendu : on est donc en mode maquette (deux côtés, B et M). Ce que ce rapport produit sert
immédiatement de **table des écarts ASSUMÉS** au dossier `juge-visuel` qui suit — écris-la comme telle (§Écarts à
consigner : chaque « dessiné sans source » avec sa raison mesurée et sa source).

## L'écran

- **Nom** : Le blanchiment (« la filière ») (㊵)
- **Ce qu'on vient y faire** : où en est chaque étape de la filière, si elle s'écarte de son profil, où la chaîne casse, ce qu'on ne peut pas commencer — et ce qui manque encore.
- **Domaine présumé** : `services/game-back/src/operational/laundering/` (`laundering/inject`, `laundering/stage`, `laundering/:nodeId`, `laundering/:nodeId/pipeline`, liste des nœuds), safehouses (`laundering-persistence`), `dealer/:id/collect` — le juge vérifie et complète (grep le mot du domaine dans TOUS les contrôleurs).

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` — cadres 137 à 142 (l.6329-6344 — nominal #137 « où en est chaque étape ») (`<div class="cadre">`, index 0-based) | source HTML/CSS : l'information dessinée. Châssis : `/home/erutheone/project/atelier3d-mafia/chassis6.py` |
| `/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/reference-1080x2102.png` | rendu du cadre NOMINAL (1080×2102, ×3,6) — ce que l'user a approuvé (ratification par délégation, 2026-09-02) |

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

- **Corps de ce dossier** (`/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/corps-reels/`) : `GET_operational_laundering.json`, `GET_operational_laundering_nodeId.json`, `GET_operational_laundering_nodeId_pipeline.json`, `POST_operational_dealer_id_collect.json`, `POST_operational_laundering_inject.json`, `_index.json`.
  `_index.json` : 1 appelée · 2 sans instance · 2 mutations — lis-le avant de conclure quoi que ce soit sur un corps vide (un compte sans nœud rend une liste vide : ce n'est pas un ensemble de clés).

## Front (F) — non fourni (mode maquette)

L'écran existe (`Assets/Scripts/…`), mais **tu ne le lis pas ce tour-ci** : F n'entre qu'au mode clôture, après le
juge visuel. Si tu as besoin de savoir « ce que le front affiche » pour classer une ligne, écris « F : non mesuré
(mode maquette) ».

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| chaîne morte à 4 maillons (TD-358) : planque sans écrivain ⇒ `inject` refuse ⇒ `transaction_profile` jamais écrit ⇒ `audit_pin` jamais posé — **le maillon 1 est REFERMÉ** depuis le lot planque (`8079915b`, 2026-08-31 : `createSafehouse` appelé par le welcome grant) | les maillons 2-4 ne sont PAS re-mesurés ; TD-358 encore OPEN à l'inventaire — c'est exactement ce que ce juge doit mesurer | CLAUDE.md §faits contre-intuitifs · `laundering-persistence.service.ts:82` · `onboarding-grant.service.ts:404` |
| `amount_cents` circule en entrée et aucune lecture ne le rend | on met de l'argent dans une filière qui ne dit jamais combien elle contient (front.md ㊵) | front.md ㊵ |
| `deviation_active` est le SEUL signal d'alerte : un booléen, sans cause ni ampleur | l'écran le pose en voyant, pas en mesure | front.md ㊵ |
| TD-572 réfutée : la liste des nœuds existe, le joueur neuf n'en a aucun | front.md ㊵ (état) — un compte de démo garni peut en avoir | front.md ㊵ |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ;
- les rapports de juges précédents (visuels ou données) — il n'y en a AUCUN pour cet écran, et c'est délibéré ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas ;
- une stack montée, un compte frais, un `curl` : **pas ce tour-ci** (gate E2E). Tout ce qui l'exigerait va en
  « non vérifié » avec la commande qui trancherait, à rejouer après le gate.
