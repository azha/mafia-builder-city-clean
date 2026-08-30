# Dossier du juge données — La Boutique (screen_c2 « IAP Shop ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « La Boutique » (canon : `docs/tech/08c_remaining_screens/screen_c2_iap_shop.md`).
- **Ce qu'on vient y faire** : voir son solde de Marks, acheter des packs de Marks au magasin (Play/App Store), acheter des cosmétiques en Marks, voir ce qu'on possède.
- **Domaine présumé** : `services/game-back/src/iap/` (`GET /v1/iap/catalogue`, `GET /v1/me/iap/balance`, `GET /v1/me/iap/entitlements`, `POST /v1/me/iap/items/purchase`, `POST /v1/iap/purchase/validate` — `iap.controller.ts` ; catalogue `iap-catalogue.service.ts` ; tables du domaine dans `db/schema/`). Le juge vérifie et complète — notamment ce qui advient d'un SKU `SAVE_SLOT` acheté, et s'il existe une restauration d'achats.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Boutique — le catalogue » (index 35) et « Boutique — un extra possédé, plus de Marks » (index 36) ; CSS propre : bloc `<style>` « SÉRIE 2 : LE COMPTE » (partagé) ; annexe « Ce que les écrans du compte fixent » (le paragraphe boutique) | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/compte/boutique-canon.png`, `boutique-extra-possede.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les deux cadres prétendent avoir une clé réelle derrière chaque ligne ; les deux SKU `SAVE_SLOT` du catalogue ne sont **pas dessinés** (écart assumé ci-dessous). Les libellés sont des rendus FR de `display_name` (servi en anglais).

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : rien à semer pour le catalogue et le solde (50 Marks sur compte frais) ; mesurer un achat en Marks réel (`POST /v1/me/iap/items/purchase` sur `cosm_callsign_color`, 50 Marks) puis relire `balance` et `entitlements` ; mesurer le refus quand le solde ne suffit pas ; `purchase/validate` avec un reçu quelconque pour la forme du refus.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| « prix affiché par le magasin » sur les packs | le corps ne porte que `price_store_product_id` ; le prix vient du store | à vérifier |
| les deux emplacements de sauvegarde non dessinés | SKU achetables qui ne matérialisent rien (aucun domaine de sauvegarde) | à vérifier |
| absence de « Restaurer les achats » | aucune route ; `validate` traite un reçu à la fois | à vérifier |
| « il vous manque 80 Marks » | `marks_balance` < `price_marks` — dérivation client | à vérifier |
| « Possédé ✓ » | `entitlements.skus` contient le `sku_id` | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
