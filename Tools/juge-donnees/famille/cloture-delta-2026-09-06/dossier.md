# Dossier du juge données — ⑥ La Famille — clôture en DELTA — 2026-09-06

> Rempli par l'orchestrateur (session `mafia-juge`). Lis-le en premier, puis `couverture-precedente.md`.

## Mode : **clôture, en delta** (B ↔ F, sur les lignes qui bougent)

Une clôture complète a été mesurée le même jour sur le code `76ee3cc` (42 lignes de couverture). Depuis, **trois
commits** ont changé le front de cet écran ; le back et les corps sont INCHANGÉS. Ton mandat est le même, restreint :
**re-mesurer F sur le code `8e982ab` et rendre uniquement les lignes dont le triplet B/M/F change**, plus toute
ligne NOUVELLE (une clé rendue qui ne l'était pas, un rendu sans source apparu). Tu ne refais pas M ni B.

## Ce qui a changé côté FRONT (fait de provenance, pas verdict) — client `76ee3cc` → `8e982ab` (`correcteur/ecrans`)

- Fichiers de cet écran touchés : `LieutenantDtos.cs` (+21), `LieutenantScreenController.cs` (+130/−87 lignes de
  diff), `FamilleLabels.cs` (+60) — gelés dans `front-8e982ab/Assets/Scripts/Operational/Lieutenant/` (blobs
  `efeed89e…`, `9d8dbce1…`, `18fd483a…`). `LieutenantClient.cs` et `RuleModel.cs` : inchangés.
- Les trois commits, tels que le correcteur les annonce (à VÉRIFIER dans le code, pas à croire) : `33ffa6a` « `name`
  repris dans le DTO » · `3e57e98` « un seul résolveur par grandeur adossé au catalogue » (TD-611) · `67b9493`
  « `reassign_availability` lu, `ON_COOLDOWN` refusé côté client ».
- Hors écran, le même delta touche 9 autres fichiers (`AppShell.cs` +69, `DesignTokens.cs` +14, Filière, Forensic,
  Journal, Carnet, Reputation, Laundering) — hors de ton périmètre sauf si une ligne de couverture de ⑥ y renvoie.
- **Les deux CTA d'action (« Recruter », réassignation) restent sans source de bâtiment** : lot front ouvert à part —
  si leurs lignes ne bougent pas, ne les rapporte pas.

## Back (B) — inchangé

- Corps réels : `../cloture-2026-09-06/corps-reels/` (compte `demo_capture`, minute 72 013, `back_main b357e7a4`),
  dont `GET_lieutenants.json` (roster, 3 lieutenants, clés `archetype, lieutenant_id, name, op_state_band,
  rule_count_band, tenure_bucket`). ⛔ Aucune stack, aucun `curl`. Code back en lecture seule :
  `/home/erutheone/project/mafia-clean-city/services/game-back/src`.

## Maquette (M) — inchangée

`/home/erutheone/project/mafia-unity-J/Tools/family-organigramme-reference-source.html`.

## Planche

`../../../juge-visuel/famille/r2-2026-09-06/capture-1080x2400.png` — commit `8e982ab`, run `CaptureFamille`,
`régime=env identité=demo_capture@example.test`, minute 72 013 (prouvé par le journal cité au commit, pas garanti
par une assertion — TD-640). Sers-t'en pour confronter une valeur affichée à une valeur servie (PIL disponible).

## Forme du rapport — `rapport.md`

- **En une phrase** : N lignes bougent sur 42 ; D défauts fermés, D' ouverts, D'' nouveaux.
- **Table des lignes qui bougent** : `| # (de couverture-precedente) | information | B | M | F avant | F après (8e982ab) | preuve fichier:ligne | statut |`
- **Lignes nouvelles** (même colonnes, `#` = « nouveau »).
- **Défauts de la clôture précédente** : pour chacun de D-1, D-1b, D-2, D-3, D-3b, D-6 — **FERMÉ / OUVERT / DÉPLACÉ**,
  avec la preuve (un commit peut fermer une INSTANCE et laisser la CLASSE : dis lequel des deux tu as mesuré).
- **Non vérifié** (obligatoire).
- Contrôle d'arithmétique : lignes rapportées = lignes changées + lignes nouvelles ; comptes écrits.

## Ce qui N'EST PAS fourni

- le rapport de la clôture précédente (`../cloture-2026-09-06/rapport.md`) et le rapport visuel r2 — seule la table
  des triplets (`couverture-precedente.md`) t'est donnée, sans verdicts ; la liste des défauts ci-dessus est nommée
  pour que tu dises s'ils sont fermés, pas décrite ;
- les notes du correcteur ; une stack ; une suite PlayMode (non lancée).
