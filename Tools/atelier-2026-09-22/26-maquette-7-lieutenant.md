# ⑦ La fiche du lieutenant — une maquette autour des données servies (série 6, matière « fiche d'identité »)

> Atelier / DA, 2026-09-23. Commande f2 (point 2 de sa liste) : redessiner ⑦ autour des données SERVIES (ARBITRAGES 07/09 point 19),
> silhouette contemporaine (capuche, décision du 02/09), une question « passé à côté ? » par donnée servie non dessinée ; dessiner les champs
> qui portent une DÉCISION du joueur, lister les autres. Page : `~/project/atelier3d-mafia/ecrans-brennar-7-lieutenant.html` (atelier `363f1eb`), générée par
> `Tools/atelier-2026-09-22/generer-maquette-7-2026-09-23.py` (tête, styles, scènes et silhouettes de la série 6 ; chrome à jour du cadre 131).
> Données : `25-…` §3 et `25-annexe-07-lieutenant.md` (corps réel `GET /v1/lieutenants/{id}`, Lt. Quist). **Aucun rendu** : il passe par f2.
> Contrôle des mots : chaque mot NON marqué est une valeur servie (44 mots, 0 non servi — vérifié contre `FR_MESSAGES` du back `0f92ea00`) ;
> chaque mot sans clé est marqué `class="prop"` (souligné pointillé) et listé au §3.

## 1. Les trois cadres

| # | cadre | ce qu'il montre | données |
|---|---|---|---|
| 0 | La fiche — ce que le back sert | la carte d'identité (buste à capuche `#buste-lieutenant`, nom, archétype · rôle · mode, état), 7 lignes, l'autonomie par catégorie, les gestes « Réaffecter… » et « + Ajouter une règle » | les 14 champs LUS par le client (`name`, `archetype`, `granted_role`, `mode`, `op_state_band`, `rule_count_band`, `tenure_bucket`, `script_revision_cost`, `reassignment_disruption`, `role_efficiency_bonus`, `reassign_availability`, `budget_bands`) + `drift_phase` et `standing_order` au repos |
| 1 | Le signal dérive — trois façons de le recaler | `drift_phase` = DRIFTING (tampon « dérive », ligne braise), la question, les 3 décisions, les repères | `drift_phase` (servi, NON lu) ; `POST /v1/lieutenants/:id/signal-drift/decision` : `reinforce_direct_order`, `reset_observation_window`, `disrupt_cue` + `target_cue` (∈ `CUE_KINDS`) |
| 2 | L'ordre permanent expire — en faire la règle ? | `standing_order.freshness` = EXPIRES_SOON, `promotion_suggested` = vrai, la question, les 3 décisions | `standing_order` (servi, NON lu) ; `POST …/standing-order/decision` : `PROMOTE_TO_DEFAULT`, `RENEW`, `REVOKE` |

Ce que la maquette du 25/08 montrait et qui **disparaît**, faute de donnée (`12-…` §3.2, §4) : « Loyauté 82 % », « 3/8 », « 8/12 »,
« Probation ACCOMPLIE », « Préfère / Rejette », « Veto », le surnom « Sal », « Relever de ses fonctions » (aucune route) ; et le chapeau
(la capuche le remplace, décision du 02/09).

## 2. Les données servies non dessinées — les questions « passé à côté ? »

| champ | ce qu'il dit | pourquoi pas dessiné sur ⑦ |
|---|---|---|
| `trust_budget_bucket` | la réserve de confiance | aucune décision du joueur sur ⑦ ; ⑯ la montre déjà (« réserve normale / élevée / faible », maquette ratifiée) — passé à côté sur ⑦ ? |
| `flag_frequency_band` | à quelle fréquence il signale | aucune décision sur ⑦ ; ⑯ la montre (`revue.chip.signale_souvent` / `signale_rarement`) — passé à côté sur ⑦ ? |
| `cue_bands` (servi au back d'aujourd'hui, absent du corps du 22/09) | la fiabilité de chaque repère (`ReliabilityBucket` par `CUE_KINDS`) | il éclaire le geste « brouiller un repère » du cadre 1 ; la maquette montre les repères SANS leur fiabilité, faute d'avoir vu un corps qui la porte — à redessiner quand un corps réel l'aura |

## 3. Les mots proposés (non ratifiés) — et leur source

| mot | pour | source |
|---|---|---|
| Signal · à l'écoute · dérive | titre de ligne, `DIRECT_ALIGNED`, `DRIFTING` | `12-…` §3.2 (proposé le 22/09 ; « n'écoute que le terrain », « se recale » pour `INCIDENTAL_LOCKED`, `RESETTING`) |
| Ordre permanent · aucun ordre · expire bientôt · en faire la règle ? | titre, `NONE`, `EXPIRES_SOON`, `promotion_suggested` | `12-…` §3.2 |
| Autonomie | titre du bloc `budget_bands` | `12-…` §3.2 |
| nouveau venu | `tenure_bucket` = FRESH | neuf : le client écrit « Fresh » en anglais, sans clé (`LieutenantScreenController`, commentaires `:167-168`) |
| Rappeler l'ordre direct · Remettre l'écoute à zéro · Brouiller un repère | `reinforce_direct_order`, `reset_observation_window`, `disrupt_cue` | neuf |
| l'état du terrain · ce qu'il reste · l'heure · ce que font les autres | `TERRITORY_STATE`, `RESOURCE_AVAILABILITY`, `TIME_SLOT`, `PEER_BEHAVIOR` (`DIRECT_ORDER` n'est pas un repère à brouiller : c'est l'ordre direct) | neuf |
| En faire la règle · Renouveler · Retirer | `PROMOTE_TO_DEFAULT`, `RENEW`, `REVOKE` | neuf |
| Il écoute autre chose que vos ordres (+ sa phrase) · Son ordre du moment a tenu (+ sa phrase) | les questions des cadres 1 et 2 | neuf ; vouvoiement ; « il » reprend « le lieutenant » (⚠️ même tension de genre que « il est sûr », `23-…` §2) |
| il s'installe vite ailleurs | sous-titre de « Réaffecter… » (`reassignment_disruption`) | neuf |

Les mots servis employés : `famille.archetype.cuisinier`, `famille.grantedrole.executant`, `famille.mode.delegue`, `famille.opstate.{au_repos,actif}`,
`famille.ecran.{anciennete,regles,cout_de_reecriture,gain_de_rendement,stabilisation_apres_transfert…,reaffecter,ajouter_une_regle}`,
`famille.rulecount.aucune_regle`, `famille.revisioncost.reecrire_coute_peu`, `famille.efficiencybonus.aucun_gain_de_rendement`,
`famille.disruption.s_installe_vite`, `famille.category.*`, `famille.band.*`.

## 4. À ratifier (user, via f2)

1. La forme : une fiche d'identité sur la ville (série 6), trois cadres.
2. Les mots du §3.
3. Le « il » des deux questions : garder la voix de « il est sûr » (ratifiée sur ⑨), ou une tournure sans pronom.

## 5. Corrigé après relecture des rendus (2026-09-23, atelier `d3319eb`)

- **Le dock** : la série 6 n'en dessine aucun (0 sur 146 cadres) — convention de cadrage ; mais ⑦ est un onglet de l'application : le dock du
  canon HUD est ajouté, ronds VIDES (point 15), onglet Famille actif, le point or du canon (son sens reste ouvert, `22-…` §7.3).
- **Les bandes d'autonomie** : les valeurs SERVIES `famille.band.*` portent une jauge ASCII dans le texte (« [....] Épuisé », « [####] Plein »).
  La maquette montre le MOT seul (R2.2, comme toutes les bandes de la série 6). ⚠️ C'est au catalogue de retirer la jauge de la valeur servie
  (même question que les glyphes à lettres du client).
- Retirés : le sous-titre « il s'installe vite ailleurs » (un « il », et redondant avec la ligne) ; la phrase d'explication du cadre 1 (les
  trois boutons la disent). Débordement du cadre 1 corrigé (les quatre repères visibles).
- Rendus : `Tools/juge-visuel/famille/maquette-7-2026-09-23/cadre-{0,1,2}-1080x2102.png` — MAQUETTE À RATIFIER, pas une référence.
