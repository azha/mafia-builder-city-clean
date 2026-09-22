# Provenance des captures — `Tools/juge-visuel/vente/` (racine du dossier, hors tours r<N>)

> Reconstituée le 2026-09-22 par l'atelier (DA) depuis le corps du commit `a55d2eb5` et le journal qu'il a commité à côté
> (`journal-capture-composite-2026-09-07.md`). Rien n'a été re-capturé. ⚠️ « dernier commit » = le commit du PNG, pas l'arbre qui l'a
> rendu ; ici l'arbre de rendu est connu parce que le journal le déclare, et il n'existe sur AUCUNE branche.

| capture | source | dernier commit du PNG | sha256 | arbre de rendu | identité (ligne du journal) | note |
|---|---|---|---|---|---|---|
| `planche-arbre-composite-2026-09-07.png` | la planche `planche_la_vente_1080x2400.png` écrite par la suite `PhotoPlanche` (`MAFIA_CI_CATEGORIES=PhotoPlanche · declares=1 comptes=1 · passed=1 failed=0`), copiée hors de `Assets/Screenshots/` parce qu'elle n'est reproductible depuis aucune branche | `a55d2eb5 2026-09-07 06:23:04 +0200` | `faf910319141046f135bd0ba2ab0d5c22f1a66bd94b097c44c4727d3ced3ed7a` | **COMPOSITE** (déclaré) : `origin/pilote-F@a4b2afa6896cf844090f77edfbf2923c5ddb2e21` pour `Operational/Selling/SellingScreenController.cs`, `ShellContracts/EtatsVidesIllustres.cs`, `ShellContracts/FamilleDIcones.cs`, `Art/EtatsVides/Resources/EtatsVides/vide-vente.png` (+ `.meta`) ; tout le reste `correcteur/ecrans@230fbe6ebe1b4029460a672f1a14df8aa5e4d9d8` ; arbre restauré après le run. Back : image du conteneur construite le `2026-09-07T04:04:54Z` (886 messages i18n servis) | **déclarée, NON prouvée** : le journal écrit « régime `MAFIA_CAPTURE_*` — `demo_capture@example.test`, garde EXPECT_PLAYER posée » | 1080×2400. Voir la réserve d'identité ci-dessous. |

## ⚠️ Réserve d'identité — mesurée le 2026-09-22, après coup

La ligne d'identité que le journal recopie est celle de `[IDENTITE-CAPTURE]`, qui dit ce que contient l'environnement, pas le compte que le
shell a signé. Mesuré dans le code (RECAPTURE-2026-09-22 §2.4, corrigé par le client en `55e674db`) : avant `55e674db`, le shell ne lisait
que `MAFIA_DEMO_*`, et `CapturerLocataire` jetait la paire qu'il vérifiait ; quant à `MAFIA_CAPTURE_EXPECT_PLAYER`, elle n'armait
qu'une capture (`CaptureFiliere`), pas `PhotoPlanche`. ⇒ Cette planche photographie `demo_capture` **si** `MAFIA_DEMO_*` était aussi
exportée ce jour-là, et `operational_demo` sinon. Le journal ne permet pas de trancher.
⇒ **La FORME de la planche se juge ; ses VALEURS ne se comparent à aucun corps.** Pour la refaire opposable : la recapture du créneau
(RECAPTURE-2026-09-22) sur un arbre unique, avec la ligne `[IDENTITE-CONNECTEE] planche_la_vente : … CONFORME` jointe.
