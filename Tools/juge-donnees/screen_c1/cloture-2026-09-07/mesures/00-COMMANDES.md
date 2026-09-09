# Commandes exécutées — juge données ⊥ screen_c1, 2026-09-07

Toutes vers `http://localhost` (Traefik → `game-back` recréé le 07/09). **Compte FRAIS créé par moi**
(callsign dans `compte-frais.txt`). ⛔ Aucun `operational_demo@…`, aucun `demo_capture@…`, aucune
route `_test`, aucun tick/advance, **aucun POST de mutation du domaine**.
Tout compte qui décide vient d'un oracle `python3` (jamais lu au terminal).
`token.txt` = jeton d'un compte jetable, sans valeur au-delà de cette session.

```bash
# 1. bundle i18n (route PUBLIQUE, i18n.controller.ts:32 — sans garde)
curl -s -o i18n_bundle_fr.json -w 'http=%{http_code} bytes=%{size_download}\n' \
  'http://localhost/v1/i18n/bundle?locale=fr'
# -> http=200 bytes=82145 ; JSON valide (contrôle : une sortie décorée ne parserait pas)
# -> locale=fr, n_messages=886

# 2. signup — Idempotency-Key REQUIS (auth.controller.ts:41-43 @Idempotent({required:true})),
#    jeton à payload.data.access_token
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-c1-$(date +%s)"
curl -s -o signup.json -w 'signup http=%{http_code}\n' -X POST http://localhost/v1/auth/signup \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
  -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\",\"locale\":\"fr\"}"
# -> 201 ; data = access_token, account_kind, expires_in_s, game_back_access_token,
#    game_back_session_id, refresh_expires_in_s, refresh_token, session_id, token_type

# 3. session/open — client_version REQUIS (session.controller.ts:29-31), octroie le kit de départ
KEY2=$(python3 -c 'import uuid;print(uuid.uuid4())'); TOKEN=$(cat token.txt)
curl -s -o session_open.json -w 'session/open http=%{http_code}\n' -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $KEY2" \
  -d '{"client_version":"juge-donnees-c1-2026-09-07"}'
# -> 200 ; 12 clés

# 4. les 4 routes de LECTURE du domaine
for r in news/feed ambient/feed random-world/active random-world/known-couplings; do
  curl -s -o "FRAIS_GET_$(echo $r|tr / _).json" -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" "http://localhost/v1/$r"
done
# -> 200 / 200 / 200 / 200

# 5. dimensionnement de la PAGINATION (question 2) — lecture seule, paramètre de requête
curl -s -o FRAIS_GET_news_feed_limit100.json    -H "Authorization: Bearer $TOKEN" 'http://localhost/v1/news/feed?limit=100'
curl -s -o FRAIS_GET_ambient_feed_limit100.json -H "Authorization: Bearer $TOKEN" 'http://localhost/v1/ambient/feed?limit=100'
# -> news : 20 beats, nextCursor=null  (donc 20 EST le total, pas un plafond)
# -> ambient : 3 events, total=3

# 6. le DÉTAIL d'une brève (route L4, jamais ouverte par un écran)
BID=$(cat premier_beat_id.txt)
curl -s -o FRAIS_GET_news_beats_id.json -H "Authorization: Bearer $TOKEN" "http://localhost/v1/news/beats/$BID"
# -> 200 ; 14 clés
```

## Analyses (oracles python, chacune avec contrôle positif ET négatif)

| fichier | ce qu'il mesure |
|---|---|
| `i18n_bundle_fr_prefixes.txt` | 886 messages, 39 préfixes racine ; `news_beat.`=154, `press.`=9, `ambient.`=7, `random_world.`=16, `journal.`=25 |
| `i18n_news_beat_keys.txt` | les 154 `news_beat.*` par sous-préfixe ; les 32 `digest.*` et les 8 `frame_tag.*` avec leur texte |
| `Q1-cles-planches-vs-bundle.txt` | les 10 occurrences de clé brute de CHAQUE planche vs le bundle — 13/13 distinctes PRÉSENTES ; contrôle négatif ABSENT |
| `Q3-existe-t-il-une-une.txt` | 15 colonnes de `news_beat`, 12 mots de rang cherchés → 0 ; ordre du feed ; contrôle positif `categ`→`beat_category` |
| `Q4-district-et-recency-dans-le-bundle.txt` | 26 clés `district.*` (toutes `type_batiment`) ; 0 clé pour les 11 valeurs de bande ; contrôle positif `coupling`→2 |
| `Q4-resolveur-phase-vs-union-back.txt` | union back (5) vs cases front (5) → couverture 3/5 ; où vit le mot partagé `settling` |
| `A1-routes-du-domaine.txt` | 14 motifs du domaine sur TOUS les contrôleurs, lignes actives → 10 touchés, 3 hors test/admin ; contrôle négatif 0 |
| `B-ensembles-de-cles.txt` | ensembles de clés + valeurs distinctes par colonne, des 4 routes mesurées |
| `F-inventaire-usages-dto.txt` | chaque champ DTO → nb de sites ACTIFS dans le contrôleur + la ligne ; 4/7 méthodes client jamais appelées |
| `F-litteraux-affiches-sans-champ.txt` | 33 appels `Lib(` ; littéraux directs ; valeurs dérivées |
| `F-litteraux-vs-bundle-journal-bloc.txt` | 26 littéraux distincts appariés au bundle **par VALEUR** → 25/26, 0 clé orpheline |
| `F-parametres-de-requete-jamais-passes.txt` | les 7 URL construites par `JournalClient` → 0 paramètre de requête |
| `M-maquette-cadres-125-130.txt` | les 6 cadres de `ecrans-brennar-6.html:6118-6139`, remis en forme |
| `T5-arithmetique-couverture.txt` | \|B\| = 49 par route |
