# Les replis « inconnu » — le minimum de clés (proposé, non ratifié)

> Atelier / DA, 2026-09-23. Règle tranchée par f2 : un joueur ne voit **jamais** une valeur machine brute ; chaque résolveur rend, hors
> domaine, le mot « inconnu » de sa famille, par `Libelle`. Relevé de CLIENT-2 (53 sites, par familles — message f2 ; le relevé lui-même
> n'est pas versionné). Mesuré : FR_MESSAGES du back `e355ba63`, littéraux de l'arbre `mafia-unity-F` à `e9db74eb`.
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-28.py`.

## 1. Les formes déjà en usage

- **Servies, accordées à leur nom** (12) : `famille.category.categorie_inconnue` « Catégorie inconnue », `famille.mode.mode_inconnu` « Mode
  inconnu », `famille.archetype.inconnu` « Inconnu », `famille.band.inconnu` / `autonomie.etat.inconnu` « [?] Inconnu », `accueil.etat.inconnu`
  « Inconnu », `blanchiment.purete.proprete_inconnue` « Propreté inconnue », `journal.bloc.phase_inconnue` « PHASE INCONNUE »,
  `reputation.etat.{coherence,offre,posture}_inconnue`, et **`horizon.bloc.etat_inconnu` « état inconnu » / « unknown state »**.
- **Écrites par le client, sans clé** : « traversée : état inconnu », « stock : état inconnu », « prix : état inconnu », « état inconnu » (×3),
  « véhicule inconnu », « tier inconnu », « pression inconnue » (×2), « raison inconnue ».

## 2. La réponse : deux formes neutres suffisent, plus deux noms de repli

« état inconnu » **tient partout où la valeur est un ÉTAT** — une bande affichée après le titre de sa ligne — parce que le mot porte son
propre nom (« état », masculin) : il ne s'accorde avec rien, ni avec le titre (« Couverture : état inconnu », « Traversée : état inconnu »).
Il ne tient **pas** quand la valeur est une **SORTE** (un type de bâtiment, un véhicule, une substance, un rôle, un palier d'avocat) : une
sorte n'est pas un état. D'où une seconde forme neutre, « type inconnu », qui porte aussi son nom.

| clé | fr | en | pour |
|---|---|---|---|
| `commun.repli.etat_inconnu` | état inconnu | unknown state | toute BANDE hors domaine (la liste au §3) |
| `commun.repli.type_inconnu` | type inconnu | unknown type | toute SORTE hors domaine (la liste au §3) |
| `commun.repli.le_batiment` | le bâtiment | the building | le repli de NOM de Distribution, quand le nom du bâtiment n'est pas servi |
| `commun.repli.un_batiment` | Un bâtiment | A building | le repli de NOM de Démolition (en tête de phrase) |

- Clés dérivées : `Libelle.De("commun", "repli", littéral)` ; aucune n'est servie aujourd'hui.
- Minuscule : comme la forme servie de l'horizon ; un écran qui veut la capitale la met au rendu, pas dans le catalogue.
- Les **12 clés servies** du §1 restent : elles nomment déjà leur famille, accordées. Les deux formes neutres couvrent les familles qui
  n'ont rien — elles ne remplacent pas ce qui existe.

## 3. Famille par famille (le relevé de CLIENT-2)

| famille | sites | forme |
|---|---|---|
| ② fiche bâtiment | les bandes : Setup, Cover, Structural, RaidRisk, Temperature, SeizedAmount, RepairCost, LabTier, Purity, Appointment, Payout, GrowStage, Husbandry, HubTier, Roster, MoneyHoldingTier, Held, Capacity, Yield ; TransferAmount, RefiningPasses | **état inconnu** |
| ② fiche bâtiment | Type, Substance, Precursor, Vehicle | **type inconnu** |
| Distribution | chemin, traversée, état | **état inconnu** (déjà écrit ainsi pour la traversée) |
| Distribution | véhicule | **type inconnu** (au lieu de « véhicule inconnu ») |
| Distribution | le nom du bâtiment absent | **le bâtiment** |
| Lieutenant ⑥/⑦ | nombre de règles, coût de révision, perturbation, bonus d'efficacité | **état inconnu** |
| Lieutenant ⑥/⑦ | rôle accordé | **type inconnu** |
| Famille | archétype | `famille.archetype.inconnu` « Inconnu » (servi) |
| Famille | ancienneté, état | **état inconnu** |
| Chrome | chaleur, phase du jour, bande de portefeuille, portée, urgence | **état inconnu** (seul dans le médaillon ou l'aile : il se lit tel quel) |
| Chrome | type de bâtiment | **type inconnu** |
| Chaîne d'appro | prix, stock | **état inconnu** (déjà écrit ainsi) |
| Règles | comparateur, action | **type inconnu** (un jeton de règle est une sorte ; « action inconnue » s'accorderait) |
| Loi | palier d'avocat | **type inconnu** (au lieu de « tier inconnu », qui garde un mot anglais) |
| Démolition | le nom du bâtiment absent | **Un bâtiment** |
| Forensic | les bandes | **état inconnu** |
| District | « Tissu » (`TissuDeDistrict`, le profil : tidewater, spine, lattice, stack, glass, verge) | **type inconnu** (choix confirmé par f2, 23/09) |

⚠️ Hors relevé, vu en mesurant : `"__inconnu__"` (11 littéraux du client) est une SENTINELLE de code, pas un mot affiché — si l'une
atteint l'écran, c'est un défaut, et elle prend alors la forme de sa famille.
