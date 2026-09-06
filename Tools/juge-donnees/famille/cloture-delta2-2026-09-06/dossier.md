# Dossier du juge données — ⑥ La Famille — clôture en DELTA (2) — 2026-09-06, base refondée

> Rempli par l'orchestrateur (session `mafia-juge`). Lis-le en premier, puis `couverture-precedente.md`.

## Mode : **clôture, en delta** (B ↔ F, sur les lignes qui bougent) — sur la BASE REFONDÉE

Une clôture complète (code `76ee3cc`) puis un delta 1 (code `8e982ab`) ont été mesurés le même jour. Depuis : **deux
commits** de correctif (`5349ac2`, `77bd229`) et **une refonte de la base de preuve** (compte re-semé, TD-642). Ton
mandat : **re-mesurer F sur le code `77bd229`** (gelé dans `front-77bd229/`) et rendre uniquement les lignes de
`couverture-precedente.md` dont le triplet change, les lignes nouvelles, et l'état des défauts nommés ci-dessous.

## Ce qui a changé côté FRONT (fait de provenance, pas verdict) — `8e982ab` → `77bd229`

- `FamilleLabels.cs` (+36), `LieutenantDtos.cs` (+10), `LieutenantScreenController.cs` (+193/−31) — gelés dans
  `front-77bd229/Assets/Scripts/Operational/Lieutenant/`. `LieutenantClient.cs`, `RuleModel.cs` : inchangés.
- Les deux commits, tels que le correcteur les annonce (à VÉRIFIER, pas à croire) : `5349ac2` « le rang porte le nom ET
  l'archétype ; en-tête ; rampe d'alpha ; F9 ; F13 » · `77bd229` « `name` sur les 2 DTO ; replis catalogue conservés pour
  les 3 clés non servies et `inconnu` ; garde à 9 valeurs ; bouton de réaffectation désactivé selon la bande ; deux
  commentaires faux retirés ».
- **Défauts à statuer** (FERMÉ / OUVERT / DÉPLACÉ, instance ET classe) : **D-1b** (`name` déclaré sur les DEUX DTO —
  roster et détail — et rendu par `RenderBands`) · **ⓐ** (archétype ET nom sur chaque rang de l'organigramme) · **ⓑ** (les
  9 archétypes ont un libellé : 3 clés non servies par le back → repli catalogue conservé ; `UNKNOWN` → `famille.archetype.inconnu`
  servie ; la garde `RendreTousLesLibelles` énumère 9 valeurs) · **D-6 classe** (le bouton de réaffectation est désactivé
  quand `reassign_availability == ON_COOLDOWN`, pas seulement le POST refusé) · **D-3b commentaire** (`FamilleLabels.cs`
  ne dit plus « les deux étaient appelés ») · **commentaire ⓐ** (« descend sur la ligne d'état » retiré).
- Les deux CTA d'action restent sans source de bâtiment : lot ouvert à part — ne pas rapporter si leurs lignes ne bougent pas.

## Back (B) — base REFONDÉE (corps de la même passe que la planche)

- `corps-reels/` : copiés depuis `da/corps-reels` **`a0623a5`** (instrument `c08f0f6`) — compte `demo_capture@example.test`,
  **minute 72 118**, `back_main fc944b62`, empreinte de référence `empreinte-reference.json` (Lt. Halde · Lt. Rook · Lt. Sallo ·
  17 bâtiments · 2 planques · 7 leviers), identique avant/après la passe. **Le dossier `famille` porte désormais le ROSTER**
  (`GET_lieutenants.json`, `route_appelee /v1/lieutenants`, 3 lieutenants) et `city/district/{id}/interior` en plus.
- ⛔ Aucune stack, aucun `curl`. Code back en lecture seule : `/home/erutheone/project/mafia-clean-city/services/game-back/src`
  — vérifie que le back lu est byte-identique à `fc944b62` sur `operational/lieutenant/` (le juge précédent l'a fait pour
  `b357e7a4` ; refais-le, ne le reprends pas).

## Maquette (M) — inchangée

`/home/erutheone/project/mafia-unity-J/Tools/family-organigramme-reference-source.html`.

## Planche

`../../../juge-visuel/famille/r3-2026-09-06/capture-1080x2400.png` — commit `5349ac2`, run `CaptureFamille`,
`régime=env identité=demo_capture@example.test` LU avant l'image, **minute 72 118 = celle des corps** : une valeur affichée
se compare à une valeur servie (PIL disponible).

## Forme du rapport — `rapport.md`

- **En une phrase** : N lignes bougent sur 43 ; défauts FERMÉS / OUVERTS / DÉPLACÉS / NEUFS.
- **Table des lignes qui bougent** : `| # | information | B | M | F avant (8e982ab) | F après (77bd229) | preuve fichier:ligne | statut |`
- **Lignes nouvelles** (même colonnes, `#` = « nouveau »).
- **Défauts nommés ci-dessus** : pour chacun, FERMÉ / OUVERT / DÉPLACÉ avec la preuve — instance ET classe, et un
  contrôle POSITIF pour chaque « 0 occurrence ».
- **Non vérifié** (obligatoire). Contrôle d'arithmétique : lignes rapportées = changées + nouvelles ; comptes écrits.

## Ce qui N'EST PAS fourni

- les rapports de la clôture précédente et du delta 1, et le rapport visuel r3 — seule la table des triplets t'est donnée ;
- les notes du correcteur ; une stack ; une suite PlayMode (non lancée).
