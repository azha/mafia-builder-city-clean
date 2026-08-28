# Dossier du juge données — Le compte : le tutoriel, le profil, les réglages (screen_c8 « First-time Tutorial » + screen_c1 « Player Profile » + screen_14 « Settings ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « Le Tutoriel » (une bulle sur l'écran cœur), « Le Profil », « Les Réglages ». Canon : `docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md`, `screen_c1_player_profile.md`, `docs/tech/08_ui_screens/screen_14_settings.md`. Trois surfaces d'un même domaine (le compte) — un rapport, en distinguant M-tutoriel, M-profil, M-réglages.
- **Ce qu'on vient y faire** : recevoir une explication la première fois (et pouvoir la couper) ; lire qui l'on est — nom de joueur, état du compte, langue, argent et sa bande, palier, Marks, extras — et se déconnecter ; régler ce qui se règle.
- **Domaine présumé** : `services/game-back/src/onboarding/` (`GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial`, `PATCH /v1/ui/tutorial-opt-out` — `tutorial-overlay.controller.ts`), `auth/` (`GET /v1/me`, `POST /v1/auth/signout`), `economy/` (`GET /v1/economy/wallet`), `progression/` (`GET /v1/progression`), `iap/` (`GET /v1/me/iap/balance`, `entitlements`), `i18n/` (`GET /v1/i18n/bundle`), tables `account`, `player`, `player_progression_state`, `gameplay_sessions`. Le juge vérifie et complète — notamment s'il existe une route qui ÉCRIT `player.locale` ou quoi que ce soit de `player_settings`.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Tutoriel — la première carte » (index 31), « Tutoriel — rien à montrer » (32), « Profil — le compte » (33), « Profil — avec les lots back L1 → L4 » (34), « Réglages — ce qui existe » (37), « Réglages — avec les lots back L1 → L4 » (38) ; CSS propre : bloc `<style>` « SÉRIE 2 : LE COMPTE » ; annexe « Ce que les écrans du compte fixent » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/compte/tutoriel-canon.png`, `tutoriel-vide.png`, `profil-canon.png`, `profil-avec-lots-back.png`, `reglages-canon.png`, `reglages-avec-lots-back.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les cadres 31, 32, 33, 37 prétendent avoir une clé réelle derrière chaque ligne ; 34 et 38 sont **par construction** des cadres « avec lots back » — leurs ajouts n'ont pas de source aujourd'hui, les juger comme des propositions de lots. Les réglages d'accessibilité (cadre 37, en pointillés) sont déclarés locaux à l'appareil, sans back. Le nom de joueur « Le Renard » est le `handle` choisi à l'inscription.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : rien à semer — mesurer les corps sur compte frais ; pour le tutoriel, mesurer `PATCH ui/tutorial` avec l'id éligible puis relire `tutorial-state`, et `PATCH ui/tutorial-opt-out` dans les deux sens.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| le texte de la bulle | clé i18n de `tutorial.exception_card.onboarding_preseed`, rendue en français ; aucune table côté back | à vérifier |
| « $ 10 000 · modéré » | `cash_cents` (chaîne, ÷100) + `wallet_band` du wallet — le seul montant brut servi | à vérifier |
| « Adresse : absente » | `email: null` sur un compte créé sans adresse ; le canon exige un masquage que le back ne fait pas | à vérifier |
| Langue « ne se change pas encore » | `locale` lu dans `/v1/me`, aucune route ne l'écrit | à vérifier |
| réglages d'accessibilité en pointillés | locaux à l'appareil, aucune route | (décision de maquette) |
| absence de suppression de compte, de notifications, de « déconnecter partout » (cadre 37) | aucune route ; `signout` ne révoque que la session du jeton | à vérifier |
| absence des emplacements de sauvegarde | le SKU existe mais aucun domaine de sauvegarde ne le matérialise | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
