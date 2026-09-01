# Juge données ⊥ — ㊲ La réputation (`screen_b3`) — clôture — 2026-09-01

> Rapport écrit AU FIL DE L'EAU. Les sections marquées ⏳ étaient encore en cours au moment
> du dernier `git commit` ; la version finale ne les porte plus.

## En une phrase

(à remplir au temps 5)

## Compte de mesure

- Compte **frais**, jamais `operational_demo` : callsign `jd-rep-1788286842`,
  `player_id = 01a05e33-b777-7804-9cba-ee517eadda6c` (`mesures/03-me.json`).
- Session ouverte par `POST /v1/session/open` (`mesures/02-session-open.json`), **fermée
  explicitement** en sortie (`mesures/90-close.sh` + `mesures/90-session-close.json`).
- Aucun dénombrement pris sur une table entière : tout est filtré sur ce `player_id`.
- Stack : `docker ps` → 7 conteneurs **Up 28 hours** au moment de la mesure. ⚠️ Le dossier
  annonçait un redémarrage « il y a ~9 min » ; ce n'est pas l'état observé. Aucune conséquence
  sur mes mesures (je n'utilise pas `seed_operational_demo.mjs`), mais la prémisse du dossier
  sur ce point est périmée.

## Annexe 1 — Routes du domaine (compte et ancres)

Le dossier proposait `services/game-back/src/reputation/` et `…/lieutenant/` : **ces chemins
n'existent pas**. Le domaine est sous `operational/` :

- `services/game-back/src/operational/reputation/` (11 fichiers)
- `services/game-back/src/operational/lieutenant/` (+ 4 sous-dossiers)

**Routes JOUEUR** (`@UseGuards(JwtAuthGuard)`, hors `-test`/`-admin`) :

| # | route | ancre | rôle pour ㊲ |
|---|---|---|---|
| 1 | `GET  /v1/me/reputation` | `reputation.controller.ts:127` | **la** route de lecture de l'écran |
| 2 | `POST /v1/me/house-rules` | `reputation.controller.ts:93` | **la** route d'action de l'écran |
| 3 | `GET  /v1/lieutenants` | `lieutenant.controller.ts:316` | roster — d'où vient le `lieutenant_id` |
| 4 | `GET  /v1/lieutenants/:id` | `lieutenant.controller.ts:333` | détail par lieutenant |
| 5..12 | 8 `@Post` lieutenant | `lieutenant.controller.ts:178,220,256,293,357,424,508,546` | actions hors ㊲ |
| 13 | `GET  /v1/autonomy-reports` | `autonomy/autonomy-reports.controller.ts:41` | hors ㊲ |
| 14 | `POST /v1/autonomy-reports/:r/issues/:i/resolve` | `…:56` | hors ㊲ |

Grep de contrôle sur tous les `*.controller.ts` du dépôt (`reputation|mirror|house-rule|
curriculum|lieutenant|restraint|triad|lek`) : 13 hits hors test/admin, tous couverts ci-dessus,
plus `GET /v1/city/district/:id/leks` (`citysim/deal_lek/deal-lek.controller.ts:50`) — domaine
voisin, pas cet écran.

⚠️ **Écart des deux listes (temps 1)** : `ReputationClient.cs` ne connaît que les routes 1 et 2.
Les routes 3 et 4 sont appelées par un AUTRE client (voir Annexe 5) — l'écran a donc bien deux
sources, pas une.

## Annexe 2 — Corps réels

Tous dans `mesures/`, avec l'instrument `mesures/00-mesure.sh` :

| fichier | mesure |
|---|---|
| `10-reputation-vierge.json` | `GET /v1/me/reputation` — compte neuf, 0 règle |
| `21-reputation-apres-regles.json` | idem après 4 `declareRule` |
| `31-cp-uuid-inexistant.json` | idem avec `counterparty_id` → la branche `restraint` |
| `11-lieutenant-detail.json` | `GET /v1/lieutenants/:id` |
| `05-lieutenants-avant.json` | `GET /v1/lieutenants` |
| `20-declare-*.json` | les 5 `POST /v1/me/house-rules` (4×201, 1×409) |
| `30/32/33-*.json` | branches d'erreur (422 / 404 / 404) |

### Ensemble de clés — `GET /v1/me/reputation` (trié)

```
boss_mirror.consistency_cue
boss_mirror.declared_rules[].rule_id
boss_mirror.portrait_posture
hidden_curriculum.uniform_tells.collar
hidden_curriculum.uniform_tells.gloves
hidden_curriculum.uniform_tells.sleeves
hidden_curriculum.uniform_tells.watch
player_id
restraint.marginalia[]          (présent SEULEMENT si counterparty_id fourni)
restraint.offer_posture         (idem)
```

**|clés B| = 10.**

### Annexe 3 — Valeurs possibles, à la source qui les contraint

| clé | type | valeurs possibles | contrainte source |
|---|---|---|---|
| `player_id` | id opaque | uuid | `reputation-hub.service.ts:248` |
| `portrait_posture` | bande | `attentive` \| `cautious` \| `withdrawn` \| `hostile` | union TS `reputation-hub.service.ts:65` ; seuils `densityToPostureBand` `:181-189` |
| `consistency_cue` | bande | `aligned` \| `drifting` \| `indeterminate` | union TS `:69` ; seuils `consistencyToCue` `:201-206` |
| `declared_rules[].rule_id` | **texte libre** | ⛔ **AUCUN enum** — chaîne joueur libre | `reputation.controller.ts:28` (« free-form player-authored string — NOT a closed enum ») ; mesuré : `settle_fair`, `no_children_harmed`… acceptés tels quels |
| `offer_posture` | bande | `standard` \| `wary` | union TS `:81` |
| `marginalia[]` | liste de noms | chaînes libres | `:83` |
| `uniform_tells.collar` | enum | `buttoned` \| `open` | union TS `:116` |
| `uniform_tells.sleeves` | enum | `rolled` \| `down` | union TS `:117` |
| `uniform_tells.watch` | enum | `visible` \| `hidden` | union TS `:118` |
| `uniform_tells.gloves` | enum | `clean` \| `dirty` | union TS `:119` |

### Branches d'erreur mesurées

| cas | attendu (doc) | **mesuré** |
|---|---|---|
| `lieutenant_id` absent | 404 | **404** ✔ |
| `lieutenant_id` non possédé | 404 | **404** ✔ |
| `counterparty_id` non-UUID | *client dit 500* | **422 `VALIDATION_FAILED`** ⚠️ |
| `counterparty_id` UUID inexistant | 200, `restraint` neutre | **200**, `offer_posture:"standard"`, `marginalia:[]` ✔ |
| 5ᵉ `house-rule` | 409 | **409**, message `(4/4)` ✔ |

⏳ suite : B⁻, M, F, table de couverture.
