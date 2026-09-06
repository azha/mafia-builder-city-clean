# Couverture mesurée à la clôture du 2026-09-06 (avant correctifs) — ⑥ La Famille

> Les TRIPLETS B / M / F mesurés par le juge-données de clôture sur le code `76ee3cc` — SANS la colonne `statut`
> (le verdict). Tu mesures F à nouveau sur le code `8e982ab` (`front-8e982ab/`) et tu ne rends que les lignes
> qui BOUGENT (une clé passe de jetée à rendue, un rendu change de source, une ligne apparaît ou disparaît),
> avec la preuve `fichier:ligne`. Une ligne dont le triplet ne change pas n'est pas rapportée.

| # | information | B | M | F (au 76ee3cc) |
|---|---|---|---|---|
| 1 | `lieutenant_id` | ● | – | ◐ (fermeture du `Button`, `:2431`) |
| 2 | `name` | ● | – | – |
| 3 | `archetype` | ● | ● M08 | ● (`:2352`, slot `.nom`) |
| 4 | `op_state_band` | ● | ● M10 | ● (`:2414`) |
| 5 | `rule_count_band` | ● | – | – |
| 6 | `tenure_bucket` | ● | – | ● (`:2369`, la puce) |
| 7 | `name` | ● | – | – |
| 8 | `archetype` | ● | – | ● partiel |
| 9 | `granted_role` | ● | – | ● (`:853`) |
| 10 | `mode` | ● | – | ● (`:855`) |
| 11 | `op_state_band` | ● | – | ● (`:857`) |
| 12 | `rule_count_band` | ● | – | ● (`:859`) |
| 13 | `tenure_bucket` | ● | – | ● (`:864`, `:2684`) |
| 14 | `script_revision_cost` | ● | – | ● (`:867`) |
| 15 | `reassignment_disruption` | ● | – | ● (`:869`, `:2682`) |
| 16 | `role_efficiency_bonus` | ● | – | ● (`:871`, `:2685`) |
| 17 | `script_source` | ● | – | ● (`:873`) |
| 18 | `reassign_availability` | ● | – | – |
| 19 | `budget_bands` | ● | – | ● (via 2ᵉ GET + regex, D-9) |
| 20 | `cue_bands` | ● | – | – |
| 21 | `drift_phase` | ● | – | – |
| 22 | `standing_order` (`freshness`, `promotion_suggested`) | ● | – | – |
| 23 | `trust_budget_bucket` | ● | – | – |
| 24 | `flag_frequency_band` | ● | – | – |
| 25 | `vocabulary_tier` | ● | – | ● (`:2948-2966`) + ◐ (palette de règles) |
| 26 | `progress_to_next` | ● | – | – |
| 27 | `next_tier` | ● | – | – |
| 28 | `tier_label_i18n` | ● | – | – |
| 29 | nom du Don — `player.callsign` | **B⁻** | ● M05 « Don V. » | – (« VOUS ») |
| 30 | M01 « ‹ » retour | – | ● | ● |
| 31 | M02 titre « La Famille » | – | ● | ● |
| 32 | M03 « 3 lieutenants » | ◐ cardinal du tableau | ● | ● (`RefreshFamilySubtitle:1617-1629`) |
| 33 | M04 médaillon Don (anneau or-vif + halo) | – | ● | ● (`:2300`, `BuildMedaillon(… don: true)`) |
| 34 | M06 rôle du Don « Vous » | – | ● | ● **déplacé** : « VOUS » en slot NOM (`:2308`), « LE DON » en slot RÔLE (`:2314`) |
| 35 | M07 médaillon lieutenant (anneau laiton) | – | ● | ● (`:2344`) |
| 36 | M09 puce « DÉLÉGUÉ / DIRECT » | roster – / détail ● | ● | – (la puce porte l'ancienneté) |
| 37 | M11 libellé « État » | – | ● | ● (`:2425`) |
| 38 | M12 `.rang.actif` | – | ● | – |
| 39 | M13 « Aucune équipe rattachée » | – | ● | ● (`:2481`) |
| 40 | M14 « Voir l'équipe » | – | ● | – |
| 41 | M16 filets de l'arbre (3 niveaux) | – | ● | ● (`BuildRailVertical`, `BuildRailTick`) |
| 42 | « Aucun lieutenant recruté » (roster vide) | – | – | ● (`:1874`) |
