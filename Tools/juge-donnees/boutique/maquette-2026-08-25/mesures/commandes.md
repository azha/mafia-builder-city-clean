# Commandes de mesure — juge données ⊥ boutique (maquette) — 2026-08-25

Stack locale dev, 7 conteneurs `mafia-clean-city-*`, Traefik sur http://localhost.
Compte FRAIS (jamais le compte de démo). Toutes les sorties passent par `curl -o <fichier>`
puis sont validées par `json.load` (jamais lues au terminal — couche d'affichage RTK).

```
# 01 — signup (Idempotency-Key REQUIS, auth.controller.ts:238-241 @Idempotent({required:true}))
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
curl -s -o 01-signup.json -w 'HTTP %{http_code}\n' -X POST http://localhost/v1/auth/signup \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
  -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"                      # → 201
```

## ⚠️ Quel jeton ? — mesuré, pas déduit
`payload.data` porte DEUX jetons : `access_token` et `game_back_access_token`.
Le dossier dit que le client lit `access_token` (AuthClient.cs:50 — vérifié).
Mesure des deux sur `GET /v1/me/iap/balance` :

```
access_token           -> 200
game_back_access_token -> 401
```
⇒ `access_token` est le bon. `game_back_access_token` est un leurre pour ce chemin.

```
# 02 — session/open (client_version obligatoire)
curl -s -o 02-session-open.json -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $AT" -H "Idempotency-Key: $K" \
  -d '{"client_version":"jd-2026-08-25"}'                                   # → 200

# 03..06 — les 4 routes de lecture
curl -s -o 03-catalogue.json        -H "Authorization: Bearer $AT" http://localhost/v1/iap/catalogue        # 200
curl -s -o 04-balance.json          -H "Authorization: Bearer $AT" http://localhost/v1/me/iap/balance       # 200
curl -s -o 05-entitlements.json     -H "Authorization: Bearer $AT" http://localhost/v1/me/iap/entitlements  # 200
curl -s -o 06-economy-wallet.json   -H "Authorization: Bearer $AT" http://localhost/v1/economy/wallet       # 200

# 07 — bundle i18n (pour savoir si les libellés du catalogue ont une clé)
curl -s -o 07-i18n-fr.json -H "Authorization: Bearer $AT" 'http://localhost/v1/i18n/bundle?locale=fr'       # 200
# → 67 messages, 0 clé catalogue/produit (toutes des clés error.*). Mesure, pas grep.

# 08..10 — un achat en Marks RÉEL, puis relecture (dimensionne le cadre 41)
curl -s -o 08-purchase-cosm-ok.json -X POST http://localhost/v1/me/iap/items/purchase \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $AT" -H "Idempotency-Key: $K1" \
  -d '{"sku_id":"cosm_callsign_color"}'                                     # → 200 {"sku_id":"cosm_callsign_color"}
curl -s -o 09-balance-after.json      -H "Authorization: Bearer $AT" http://localhost/v1/me/iap/balance      # 200 {"marks_balance":0}
curl -s -o 10-entitlements-after.json -H "Authorization: Bearer $AT" http://localhost/v1/me/iap/entitlements # 200 {"skus":["cosm_callsign_color"]}

# 11..14 — les refus
11 purchase cosm_dashboard_theme_1 (80) avec solde 0   -> 409 RESOURCE_STATE_CONFLICT
12 purchase cosm_callsign_color une 2e fois            -> 409 RESOURCE_STATE_CONFLICT
13 purchase marks_pack_small par la route Marks        -> 422 VALIDATION_FAILED
14 purchase/validate {platform:"google",receipt:"jd-bogus-receipt"} -> 422 VALIDATION_FAILED

# 15 — sans jeton
GET /v1/iap/catalogue        sans Authorization -> 401
GET /v1/me/iap/entitlements  sans Authorization -> 401
```

## Contrôles positifs exécutés (un grep à zéro ne prouve rien sans eux)
- `COSMETIC` dans `services/game-back/src` → **13** hits ⇒ le motif mord ; le balayage
  « un cosmétique produit-il un effet ailleurs ? » qui rend 0 est donc probant.
- `marks_ledger` (toutes formes) → **24** hits ⇒ le motif mord ; **0** est un SELECT.
- `pgTable(` dans `db/schema/` → **180** tables ⇒ le motif mord ; **0** dont le nom porte
  `save`/`slot`.
- ⚠️ Contrôle positif **ÉCHOUÉ** et donc conclusion abandonnée : `grep 'error.auth'`
  dans `i18n/string_table.ts` rend **0** — ce fichier ne porte pas les clés, il les
  DÉRIVE de `protocol/error-codes.ts`. La question « le bundle porte-t-il des clés
  produit ? » a donc été tranchée par la **mesure du bundle servi** (07), pas par grep.
