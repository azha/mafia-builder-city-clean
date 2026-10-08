# Commande f2 (24/09) — 16 conséquences projetées de la carte de tête ④ (HL v7.1, back/s5 @ 4f7e1102)

Champ servi : `projected_consequence` (frère de CandidateActionView, exceptions.projection.service.ts:86-107).
Forme des clés : `hl.option.<fournisseur>.<option>.projected_consequence`. Le back n'a écrit AUCUNE valeur.

| # | fournisseur.option | situation / ce que fait le jeu |
|---|---|---|
| 1 | damaged_building.repair_via_queue | réparation, agir : met les bâtiments endommagés en travaux ; coût prélevé tout de suite, pour chacun |
| 2 | damaged_building.leave_damaged | réparation, laisser : ils restent endommagés, rien n'est prélevé, ils ne produisent pas |
| 3 | severed_route.reroute_now | route coupée, agir : reroutage minimal payant ; routes rouvertes après travaux par un chemin qui contourne les blocs usés |
| 4 | severed_route.leave_severed | route coupée, laisser : restent coupées, aucun envoi ne passe |
| 5 | legal_case.accept_plea_deal | affaire, agir : l'arrangement referme l'affaire tout de suite, sans verdict ni son risque |
| 6 | legal_case.let_ride | affaire, laisser : suit son cours jusqu'au verdict, favorable ou non |
| 7 | mycelial_stressed_leg.maintain_now | tronçon, agir : correctif rapide, l'usure retombe après une courte intervention, coût modeste, livraisons non interrompues |
| 8 | mycelial_stressed_leg.leave_stressed | tronçon, laisser : restent sous tension, s'usent à chaque passage |
| 9 | backpressure_critical_trace.trace_now | engorgement, agir : NAVIGATION vers l'écran de traçage ; rien n'est modifié ni prélevé |
| 10 | backpressure_critical_trace.leave_pending | engorgement, laisser : le point reste saturé et freine ce qui passe |
| 11 | autonomy_reports.review_now | rapports, agir : NAVIGATION vers l'écran des rapports ; rien n'est décidé à la place du joueur |
| 12 | autonomy_reports.leave_pending | rapports, laisser : restent en attente, reviennent à la prochaine session |
| 13 | cue_cascade_fallout.review_now | cascade, agir : NAVIGATION vers la file d'exceptions ; rien n'est résolu automatiquement |
| 14 | cue_cascade_fallout.leave_pending | cascade, laisser : restent dans la file et pèsent sur la charge |
| 15 | escalation_backlog.review_now | escalades, agir : NAVIGATION vers l'écran des escalades. ⚠️ une escalade est DÉFINITIVE : ne promettre ni résolution ni reprise en main |
| 16 | escalation_backlog.leave_pending | escalades, laisser : restent telles quelles, la carte revient tant qu'elles s'accumulent |

## Cadre
- La phrase répond à « que se passe-t-il si je choisis ça ? ».
- Qualitative : jamais un montant, jamais un nombre de tours (le seul nombre de la carte est `target_count`, servi à part).
- Le nombre de cibles VARIE : la phrase reste juste au singulier comme au pluriel.
- 8 des 16 décrivent une navigation, pas un effet.
- Les 4 « agir » qui mutent prélèvent PAR cible : dire qu'il y a un coût, sans dire lequel.
- f2-D10 / D13 / D17. Statut : PROPOSÉ.

## Retour attendu
`<NN>-hl-consequences-2026-09-24.tsv`, colonnes `clé · fr · en · statut`. Le chunk P du back attend le SHA de ce fichier.
