# Mesures du juge données ⊥ — ㉟ La vente — clôture 2026-09-07

Compte FRAIS créé par le juge (`00-compte.txt`), jamais `operational_demo@…` ni `demo_capture@…`.
Aucune route `_test`, aucun `advance`/tick. Toutes les mutations listées ci-dessous sont sur CE compte.

| fichier | ce qu'il mesure |
|---|---|
| `00-compte.txt` | callsign + Idempotency-Key du compte frais |
| `01-signup.sh/.json` | `POST /v1/auth/signup` — 201, jeton à `payload.data.access_token` |
| `02-session-open.sh/.json` | `POST /v1/session/open` — 200, 12 clés |
| `03-dealers.sh/.json` | `GET /v1/operational/dealers` — **200, `{"dealers":[]}`** (compte frais = 0 dealer) |
| `04-headers-dealers.txt` | en-têtes de réponse — **aucun tampon de build/SHA** (la datation par en-tête est impossible) |
| `05-sonde-millesime.sh/.json` | `GET /v1/friction/state` — sonde de MILLÉSIME de l'image (voir rapport §Q1) |
| `06-planque.sh/.json` | `GET /v1/operational/laundering` — `{"nodes":[]}` (liste les nœuds PROMUS, pas les planques) |
| `07-maquette-cadres.txt` | les 6 cadres `vnt6` de la maquette, extraits de `ecrans-brennar-6.html` |
| `08-planque-stash.sh/.json` | `GET /v1/city/district/16/stash` — **1 planque, 4 slots**, sur compte frais sans tick |
| `09-collect-corps-vide.sh/.json` | `POST …/collect` avec le corps `{}` du client → **422 `safehouse_id must be a UUID`** |
| `09b-collect-avec-safehouse.json` | contrôle positif : le MÊME appel AVEC `safehouse_id` → 404 (l'erreur CHANGE) |
| `10-i18n.sh/10-i18n-fr.json` | `GET /v1/i18n/bundle?locale=fr` — 886 clés, dont `game.fiction.dealer.name` |
| `11-inventaire-F.txt` | usages de chaque champ DTO côté client (comptes + contrôles positif/négatif) |
| `12-B-moins.txt` | colonnes du domaine non projetées (comptes en `$( )`, contrôles positif/négatif) |
| `13-routes-domaine.txt` | balayage du mot du domaine dans les 148 `*.controller.ts` |

## Mutations effectuées (toutes sur le compte frais du juge)
1. `POST /v1/auth/signup` — création du compte.
2. `POST /v1/session/open` — ouverture de session (déclenche le welcome grant).
3. `POST /v1/operational/dealer/<uuid inexistant>/collect` ×2 — **sondes de contrat de corps** ;
   la 1ʳᵉ 422 avant le service, la 2ᵈ 404 sur le dealer : **aucune des deux n'écrit**.
Aucun tick, aucun `advance`, aucune route `_test`.
