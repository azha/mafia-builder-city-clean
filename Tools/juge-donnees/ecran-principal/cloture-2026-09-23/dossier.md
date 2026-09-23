# Dossier du juge données — ① Intérieur de district — clôture (préparée) — 2026-09-23

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `Tools/juge-visuel/ecran-principal/r11-2026-09-23/dossier.md` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : Intérieur de district (①) — contrôleur `DistrictInteriorScreenController`
- **Ce qu'on vient y faire / travaillé cette nuit** : le bandeau éphémère, la descente, la couche du district (libellés par ancre + anneau de sélection), le titre du district
- **Routes** : `/v1/city/district/:id/interior`, `…/heat`, `…/stash`, `/v1/world/districts`, `/v1/operational/dealer/:id/collect`, `/v1/operational/laundering/inject` ; shell : `/v1/session/open` (queue, escalated, phase), `GET /v1/autonomy-reports`, `/v1/economy/wallet`, `/v1/i18n/bundle`

## Maquette (M)

- Voir la table des références du dossier visuel jumeau (statut ratifié / « maquette à ratifier » écrit ligne par ligne).
- Mots : les tables de l'atelier (`Tools/atelier-2026-09-22/`) — une clé proposée n'est pas une clé ratifiée.

## Back (B)

- **Stack locale** : NON FOURNIE — `docker ps` se colle au créneau (la pile se monte après le gate ; jamais pendant un gate E2E).
- **Back de référence** : `main` du dépôt back `30360c8d` au moment de la préparation ; corps réels datés et leur fraîcheur : dossier jumeau.
- **Compte** : le compte de capture (paire sous `MAFIA_CAPTURE_*`), ou un compte frais par `POST /v1/auth/signup` + `POST /v1/session/open`.

## Front (F)

| fichier | état |
|---|---|
| `Assets/Scripts/CityMap/DistrictInteriorScreenController.cs` | présent au cumul |
| `Assets/Scripts/Shell/TopBarController.cs` | présent au cumul |
| `Assets/Scripts/Shell/AppShell.cs` | présent au cumul |

- **Cumul** : `mafia-builder-city-clean` `fc3033ec`. les lots ①-0 à ①-5 et le format monétaire sont dans le cumul (vérifié par merge-base, relevé du 23/09)
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `Tools/juge-visuel/ecran-principal/r11-2026-09-23/rapport.md`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée / source |
|---|---|
| la bande du nom de district sous la barre, absente du canon ; elle cède la place au bandeau quand il parle | D3 ; front.md §4 L (25/08) ; `hud-brennar.html` l.82/176 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `0b49a634` (CanvasGroup) |
| l'anneau **crème** autour du badge du bâtiment dont la fiche est ouverte (la sélection) | D4 ; r9 M6 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `e9db74eb` |
| le bandeau « {nom} a un rapport pour vous — lire » (le canon : « ✉ Sal a un rapport du soir — lire ») | D5 (un rapport OUVERT, une fois par session) ; Tools/atelier-2026-09-22/22 §7.1 C (« du soir » tombe) ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `c5ab2a6e` |
| les autres bandeaux : « La brigade quadrille le quartier — planquez la caisse », « Les indics parlent : la brigade s’agite », « {nom} attend vos ordres » / « La ville attend vos ordres », mot d'action or « trancher » / « lire » ; un seul à la fois (descente > ville > carte > rapport), 5 s puis fondu | Tools/atelier-2026-09-22/22 §7.1 C ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `0b49a634` |
| aucun glyphe dans le bandeau (✉ ⚠ 🚨 retirés) | D11 |
| la descente : médaillon « DESCENTE » en braise, cerclage et filet qui battent, aiguille qui tremble | mot du canon `hud-brennar.html:255` (Tools/atelier-2026-09-22/23 §2, tranché) ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `881c17f6` |
| le gyrophare CACHÉ le jour ; la nuit, sa lueur est centrée sur la voiture de police du district D (pas à la place du canon) | D7 ; `hud-brennar.html:75` ; Tools/atelier-2026-09-22/22 §7.2 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `881c17f6` |
| « CHALEUR » (canon « Heat ») ; bandes Froid · Tiède · Chaud · Brûlant au lieu de « 37 % » | points 11 et 19 du 07/09 ; Tools/atelier-2026-09-22/22 §7.1 A |
| le médaillon dit la VILLE, la case 3 le DISTRICT | points 7 et 8 du 07/09 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `9b6625ba` |
| les cases « À COLLECTER · REVENUS · CHALEUR LOCALE » en bandes (Rien / Prêt / Plein · Au repos / Rapporte · la chaleur) ; « — » quand la donnée manque | point 8 ; Tools/atelier-2026-09-22/22 §7.1 A ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `9b6625ba` |
| l'argent « 24 850 € », sans centimes, espace fine U+202F ; AUCUN fil de ratio sous l'argent | point 10 ; D2 (option b) |
| la phase seule (« Soirée », « Plein jour »), sans heure | point 16 ; D16 |
| le dock Empire · Famille · Filière · Plus, ronds VIDES | D6 ; point 15 |
| le titre de fiche = l'enseigne seule, en capitales ; sous-titre « {type} · {district}, îlot {block}[, n° {rang}] » | point 12 ; Tools/atelier-2026-09-22/22 §7.1 B ; D12 |
| la couche du district : un libellé par ancre, 9 px CSS, sans chiffre, pas de glyphe sur une ancre qui porte plusieurs types | CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `e9db74eb` (r9 B1, B3) |
| « état inconnu » / « type inconnu » / « — » | D8 |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
