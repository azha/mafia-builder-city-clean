# Ce qui a été modifié dans ces mesures après le run du juge — et ce qui ne l'a pas été

Les mesures d'un juge sont son evidence : on n'y touche pas en silence. Deux fichiers ont été
modifiés **après** le rendu du rapport, par l'orchestrateur (session pilote-B), pour une seule
raison : ils portaient des **jetons d'authentification en clair**.

| fichier | ce qui a été remplacé | par |
|---|---|---|
| `token.txt` | le JWT complet | `<JETON-CAVIARDÉ>` |
| `signup.json` | `payload.data.access_token` (JWT) et `payload.data.refresh_token` (hex 64) | `<JETON-CAVIARDÉ>` · `<REFRESH-CAVIARDÉ>` |

**Rien d'autre n'a été touché** — aucun corps de réponse du domaine, aucun ensemble de clés,
aucune valeur mesurée. Ce qui fait la preuve du juge est l'**ensemble de clés** de chaque réponse
et les valeurs d'enum qu'elle porte : les deux sont intacts, y compris dans `signup.json`
(`token_type`, `account_kind`, `session_id`, `expires_in_s`, `refresh_expires_in_s`,
`game_back_access_token`, `game_back_session_id` — tous conservés tels que mesurés).

Contrôle exécuté après le caviardage : `grep -rlE 'eyJ[A-Za-z0-9_-]{10,}\.' .` → **0 fichier**.

Le risque réel était nul (stack locale de dev, compte jetable `jd-1788118317`, jeton de 900 s
expiré depuis) — mais un jeton ne se commite pas, et c'est l'habitude qui protège, pas
l'évaluation au cas par cas.
