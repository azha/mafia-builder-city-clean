# TD-690 — le reste : `building`, `game`, `pipeline`, `tutorial`, `onboarding` (14 en à écrire, 20 fr à écrire)

> Atelier / DA, 2026-09-23. Classement du back : `_en-egal-fr-classement.txt` (`e75cf69d`, TD-690). Deux sens :
> `DEFAUT_FR_DANS_EN` — le fr (servi, recopié à l'octet) reste, l'en est proposé ; `DEFAUT_EN_DANS_FR` — l'en (servi, recopié à l'octet)
> reste, **le fr est proposé**. Placeholders identiques (`{tier}`).
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-en-egal-fr.py <ce fichier> "## TD-690" building. game. pipeline. tutorial. onboarding.`

## TD-690 — les 34 clés

| clé | classe | fr | en |
|---|---|---|---|
| `building.row.entretien` | `DEFAUT_FR_DANS_EN` | Entretien | Upkeep |
| `game.progression.tier_label` | `DEFAUT_FR_DANS_EN` | Palier {tier} | Tier {tier} |
| `onboarding.preseed_exception.card` | `DEFAUT_FR_DANS_EN` | Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement). | Lt. Hara — tonight’s cook is stuck: out of solvent. Order now (cost) or wait for tomorrow (yield). |
| `tutorial.exception_card.onboarding_preseed` | `DEFAUT_FR_DANS_EN` | Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement). | Lt. Hara — tonight’s cook is stuck: out of solvent. Order now (cost) or wait for tomorrow (yield). |
| `tutorial.audit_pin_intro` | `DEFAUT_FR_DANS_EN` | Un audit est épinglé sur ce bâtiment. Ses comptes seront relus. | An audit is pinned on this building. Its books will be gone over. |
| `tutorial.city_map_heat_intro` | `DEFAUT_FR_DANS_EN` | La carte montre la chaleur par îlot. Plus c'est chaud, plus la police regarde. | The map shows the heat block by block. The hotter it is, the closer the police look. |
| `tutorial.compression_week` | `DEFAUT_FR_DANS_EN` | Semaine de compression : l'organisation est sous tension. Réduis, ou encaisse. | Compression week: the organization is under strain. Cut back, or take the hit. |
| `tutorial.cue_stack_intro` | `DEFAUT_FR_DANS_EN` | La pile du jour ordonne tes consignes. Le premier créneau part en premier. | The day’s stack puts your orders in sequence. The first slot goes first. |
| `tutorial.daily_review_intro` | `DEFAUT_FR_DANS_EN` | Chaque matin, la Revue liste ce qui a dévié de la routine. Tranche, ou laisse. | Every morning, the Review lists what strayed from the routine. Decide, or let it be. |
| `tutorial.graduation` | `DEFAUT_FR_DANS_EN` | Un lieutenant a fini son apprentissage. Il décide seul, dans le cadre que tu fixes. | A lieutenant has finished their apprenticeship. They decide alone, within the limits you set. |
| `tutorial.graduation_eligibility_intro` | `DEFAUT_FR_DANS_EN` | Un lieutenant est prêt à passer. Sa promotion se prépare ici. | A lieutenant is ready to move up. Their promotion is prepared here. |
| `tutorial.possibility_horizon_intro` | `DEFAUT_FR_DANS_EN` | L'horizon montre ce que tes lieutenants peuvent apprendre ensuite. | The horizon shows what your lieutenants can learn next. |
| `tutorial.queue_runs_dry` | `DEFAUT_FR_DANS_EN` | La file est vide. Rien n'attend ta décision : la ville tourne sans toi. | The queue is empty. Nothing is waiting on your decision: the city runs without you. |
| `tutorial.vacancy` | `DEFAUT_FR_DANS_EN` | Un poste est vacant. Sans titulaire, la routine s'arrête là. | A post is vacant. With no one in it, the routine stops there. |
| `building.cover.none` | `DEFAUT_EN_DANS_FR` | Aucune | None |
| `building.cover.weak` | `DEFAUT_EN_DANS_FR` | Fragile | Weak |
| `building.cover.strong` | `DEFAUT_EN_DANS_FR` | Solide | Strong |
| `building.raid_risk.low` | `DEFAUT_EN_DANS_FR` | Faible | Low |
| `building.raid_risk.elevated` | `DEFAUT_EN_DANS_FR` | Accru | Elevated |
| `building.raid_risk.high` | `DEFAUT_EN_DANS_FR` | Élevé | High |
| `building.setup.not_converted` | `DEFAUT_EN_DANS_FR` | Pas encore converti | Not converted |
| `building.setup.in_setup` | `DEFAUT_EN_DANS_FR` | En installation | In setup |
| `building.setup.operational` | `DEFAUT_EN_DANS_FR` | Opérationnel | Operational |
| `building.structural.damaged` | `DEFAUT_EN_DANS_FR` | Endommagé | Damaged |
| `building.structural.repairing` | `DEFAUT_EN_DANS_FR` | En réparation | Repairing |
| `building.temperature.optimal_cold` | `DEFAUT_EN_DANS_FR` | Froide, idéale | Optimal (cold) |
| `building.temperature.warming` | `DEFAUT_EN_DANS_FR` | Se réchauffe | Warming |
| `building.temperature.hot` | `DEFAUT_EN_DANS_FR` | Trop chaude | Hot |
| `game.legal.lawyer_tier.public_defender` | `DEFAUT_EN_DANS_FR` | Commis d'office | Public Defender |
| `game.legal.lawyer_tier.boutique` | `DEFAUT_EN_DANS_FR` | Un cabinet | Boutique Counsel |
| `game.legal.lawyer_tier.corruption_pipeline` | `DEFAUT_EN_DANS_FR` | La filière | Corruption Pipeline |
| `pipeline.etat.clean` | `DEFAUT_EN_DANS_FR` | Propre | Clean |
| `pipeline.etat.mostly_clean` | `DEFAUT_EN_DANS_FR` | Presque propre | Mostly clean |
| `pipeline.etat.dirty` | `DEFAUT_EN_DANS_FR` | Sale | Dirty |

## Notes

- **Les trois avocats** prennent les noms de la maquette ratifiée de ㉛ (« Commis d'office », « Un cabinet », « La filière »), déjà ceux du
  client (`LoiScreenController.cs:332-337`, arbre F).
- **Les trois risques de descente** montent : « Faible » → « Accru » → « Élevé ». **La couverture** d'une façade : « Aucune » → « Fragile »
  → « Solide ». **La température** (féminin, celle du bâtiment) : « Froide, idéale » → « Se réchauffe » → « Trop chaude » — « Trop » dit
  ce que « Hot » veut dire ici : un défaut, pas un état neutre.
- « En réparation » est le mot du cachet de ⑨ (`11-…` §3.7, « EN RÉPARATION ») : une seule forme pour un seul état.
- ⚠️ **Registre des tutoriels** : ils **tutoient** (« tes consignes », « Tranche », « la ville tourne sans toi »), alors que le jeu
  **vouvoie** partout ailleurs (« Vos lieutenants ont tenu la ligne », « votre parole », « vous n'avez encore donné aucune règle »). L'en
  ne voit pas la différence ; le fr, si. Hors de ce paquet (le fr servi est recopié tel quel) : **à trancher par l'user** — je recommande
  le vouvoiement, celui de tous les écrans cités dans ces paquets.
- `onboarding.preseed_exception.card` et `tutorial.exception_card.onboarding_preseed` portent la **même** phrase : deux clés pour une
  carte. Le back dira laquelle a un demandeur.
- Les 14 clés `building.{cover,raid_risk,setup,structural,temperature}.*` n'ont **aucun littéral** qui les demande dans les deux arbres
  client ; elles peuvent arriver par une clé servie (`*_i18n`) que le client traduit telle quelle. Le fr est donné dans les deux cas.
