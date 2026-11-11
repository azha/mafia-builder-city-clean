# ㉚ V15 coûts par mode — client sur le contrat BACK-1 (CLIENT-1, 11/11) — petit ticket, une page

Source unique : CODE `lot/couts-30` @87820327 (`~/project/mafia-lot-couts`) + contrat §1 `mafia-design-couts/docs/superpowers/specs/2026-11-13-couts-30-contrat-page.md` @0e1e4c1f.
Base : `lot/client1-gestes-30-2026-11-11` @cec8de29. Rien n'est servi sur la pile (back main 51cece7d : 0/22 clés, pas de route) ⇒ tout reste éteint aujourd'hui ;
le lot rend l'écran **juste le jour où c'est servi**, sans autre retouche.

## 1. Ce qui change
1. **Coûts** — `GET /v1/supply-chain/upkeep-costs` (JwtAuthGuard, enveloppe `payload.data`) → `{maintenance[3], rebuild[3]}`, ligne `{mode, cost_cents, duration_band}`.
   `ChaineDApproClient.GetSupplyChainUpkeepCosts` + `static LireCouts(string corps)` → `CoutsServis : ICoutsParMode`. Présence lue dans le CORPS BRUT, ligne par
   ligne (JsonUtility ne distingue pas l'absent de 0, patron `LireGraphe`/`MaintainingServi`) : `cost_cents` absent ou non entier ⇒ ce mode NON servi ;
   `mode` en double ⇒ ce mode NON servi (on ne choisit pas). `duration_band` ∉ {immediate, brief, extended} ⇒ bande nulle. La ligne `MODERATE_RESTRUCTURE`
   est lue et jamais demandée (la feuille n'a pas ce mode). Aucun montant, seuil ou bande codé en dur (les 6 valeurs du contrat sont des illustrations).
2. **Interface** — `ICoutsParMode` gagne `string BandeServie(string modeId)` (null = non servie). `CoutsNonServis` rend null ; `CoutsDeTest` (tests) l'implémente.
3. **Branchement** — `RechargerChaine` lit les coûts AVANT le graphe, SEULEMENT si `Couts` est `CoutsNonServis.Instance` ou un `CoutsServis` (un test qui injecte
   garde son injection). 2xx lisible ⇒ `Couts = CoutsServis` ; tout échec (404 sur la pile d'aujourd'hui, réseau, corps illisible) ⇒ `CoutsNonServis.Instance`,
   **silencieux** : ni `DerniereErreur`, ni `PhraseDuRefus`, ni état indisponible (une route absente n'est pas une panne de l'écran).
4. **Mots — renommage aux clés SERVIES (§1.5), repli = FR servi à l'octet** :
   | avant (dérivée) | après (servie) | entrée |
   |---|---|---|
   | `appro.geste.{entretenir_la_liaison,reconstruire_la_route}` | `appro.titre.*` | `De("appro","titre",…)` |
   | `appro.mode.<s>` (5) | `appro.etiquette.<s>` | `De("appro","etiquette",…)` |
   | `appro.mode_sous.<s>` (5) | `appro.consequence.<s>` | **`Gabarit`** (valeur ≠ slug) |
   | `appro.bloc.pendant_les_travaux_…` | `appro.sous_titre.pendant_les_travaux_…` | `De("appro","sous_titre",…)` |
   | `appro.cout.on_ne_sait_pas_encore_combien` repli « on ne sait pas encore combien » | même clé, repli **« On ne sait pas encore combien. »** | `De("appro","cout",…)` |
   Repli de `consequence.contourner` : **U+00A0** devant « : » (aujourd'hui espace ordinaire). Apostrophes U+2019.
5. **Sous-titre d'un mode d'ENTRETIEN** = `<mot de la bande servie> · <conséquence>` (séparateur du poseur, `poser-chaine-gestes.py:50-52`). Mot :
   `immediate`→`De("appro","etiquette","tout de suite")`, `brief`→`"quelques minutes"`, `extended`→`"plus longtemps"` (la bande n'entre jamais dans l'espace
   i18n, §1.2). **Bande non servie ⇒ conséquence seule** (on ne devine pas une durée ; le mode est alors éteint de toute façon). Modes de RECONSTRUCTION :
   conséquence seule, comme le cadre ratifié (la durée est dite par la phrase commune « Pendant les travaux… » ; `rebuild[].duration_band` est identique
   sur les 3 lignes par construction, il ne discrimine rien) — lue, non affichée.
6. **`accueil.jeton.votre_grande_decision_du_jour` n'est PAS servie** (0 à back main 51cece7d et au cumul 74c5a0b0 ; le lot BACK-1 l'ajoute, contrat « 22 libres
   sur 22 »). La branche F la tenait pour un REUSE servi : faux. Elle sort d'`EstUnReuse` et entre en DetteDatee.
7. **Refus d'argent** — `INSUFFICIENT_FUNDS` 409 `error.funds.insufficient` : rien à coder, `RefusServi.Phrase` lit la clé du corps. Commentaires « le back dit
   state_conflict » mis à jour ; une garde le prouve (G-V4).
8. **`legs[].maintaining`** — déjà lu par présence (`MaintainingServi`) ; nom et définition confirmés par le code (`legMaintaining`). Commentaires seuls.
9. **Réponses POST** (`maintenance_duration_band`, `rebuildDurationBand`) : non lues, non déclarées (l'après-geste se relit sur le graphe, E2) — pas de champ fantôme.

## 2. DetteDatee (ZeroRepli + `ClesNeuves` du test) — les clés restent jusqu'à être SERVIES sur la pile
Retirées (13 noms disparus du code) : `appro.geste.*` ×2, `appro.mode.*` ×5, `appro.mode_sous.*` ×5, `appro.bloc.pendant_…` ×1. Bloc ㉚ gestes : 20 → 24.
Ajoutées (servies par BACK-1, non encore sur la pile) : `appro.titre.entretenir_la_liaison|reconstruire_la_route`, `appro.etiquette.rafistoler|renforcer|contourner|
petit_detour|remise_a_plat|quelques_minutes|plus_longtemps|tout_de_suite`, `appro.consequence.rafistoler|renforcer|contourner|petit_detour|remise_a_plat`,
`appro.sous_titre.pendant_les_travaux_plus_rien_ne_passe_sur_cette_route`, `accueil.jeton.votre_grande_decision_du_jour` (17). Inchangées : `appro.cout.on_ne_sait_pas_encore_combien`,
`appro.etiquette.en_entretien`, `appro.titre.les_routes`, `appro.etat.*` ×4. Non lues par le client : `appro.etiquette.remaniement`, `appro.consequence.remaniement`,
`error.funds.insufficient` (par le corps). Compter avant/après.

## 3. Gardes (chacune avec son contrôle positif qui DOIT rougir)
| # | Garde | Contrôle positif |
|---|---|---|
| G-V1 | `LireCouts` sur le corps du contrat §1.1 (6 lignes) ⇒ 6 centimes et 6 bandes lus ; les 5 modes de la feuille actionnables (jeton libre) | `cost_cents` retiré d'une ligne ⇒ CE mode éteint, « On ne sait pas encore combien. » |
| G-V2 | Mêmes valeurs ×7 (corps de test ≠ contrat) ⇒ la feuille montre les montants du CORPS (`Argent.DepuisCentimes`), aucun montant du contrat | — (anti-dur : les montants du contrat n'apparaissent pas) |
| G-V3 | Bande `brief` servie pour `structural_reinforce` ⇒ sous-titre « quelques minutes · l’usure est effacée » ; bande absente ⇒ conséquence seule | bande `extended` ⇒ « plus longtemps · … » |
| G-V4 | Corps 409 `{user_facing_i18n_key:"error.funds.insufficient"}` + clé servie au bundle de test ⇒ la feuille montre « Pas assez d’argent pour ça. » | clé non servie ⇒ aucune phrase |
| G-V5 | `RechargerChaine` n'écrase pas un `Couts` injecté par un test ; échec du GET ⇒ `CoutsNonServis`, `DerniereErreur` inchangée | — |
| G-V6 | Clés : chaque clé lue par la feuille ∈ (22 du contrat ∪ REUSE servis ∪ dérivées restantes) ; repli de chaque clé ㉚ == FR du contrat À L'OCTET (table écrite à la main dans le test) | altérer U+00A0 de `consequence.contourner` ⇒ rouge |
Les gardes G-D1..D6 existantes sont rebasées sur les nouvelles clés, sans être affaiblies. Statiques : typecheck `--frais` + `--controle` par fichier touché, cliquet,
TD-612 `--bilan`, N3 ternaires. Dettes : TD-1046 → « code client prêt, en attente de service » (reste OUVERTE) ; TD-1047/1048 idem ; TD-1080 inchangée.
