# EcranDistribution seule — 2026-09-22 23:29, session mafia-builder-city-clean-91

Objet : décider l'inscription d'`EcranDistribution` au filtre par défaut, absente depuis le 03/09 (MafiaCI.cs:112 : sa capture C1
rendait une image uniforme). Cette capture a été retirée par 6f4a57a3 ; la planche de ㉘ est `PhotoChantierC` (étape 8, sous la
garde d'effet). Compteur avant le run : 20 déclarés, 20 exécutés, aucun n'exige la paire, aucune relation de préfixe.

Porte prise sur le signal de l'orchestrateur, `MAFIA_CI_CATEGORIES=EcranDistribution`, sans la paire (`env -u` des quatre variables,
absence de `MAFIA_DEMO_*` vérifiée dans le même `bash -c`), HEAD 3bb151f8.

| | |
|---|---|
| lancement → fin | 23:29:06 → 23:29:29 (elapsed=23s) · RC_RUN=0 |
| DÉCLARÉS SOUS LE FILTRE | 20 |
| fin | `passed=20 failed=0 skipped=0 inconclusive=0 declares=20 comptes=20` |
| catégories RÉELLEMENT exécutées | `[EcranDistribution]` |
| « capture refusée » | 0 |

Après le run : `git checkout -- Assets/Fonts/`, porte rendue à 23:29:48 (`release … --atlas-vus`, RC_REL=0).

⇒ Inscrite au filtre par défaut, en PARTIE 1 du gate : partie 1 = 34 catégories / 435 tests, partie 2 = 58, filtre = 493, étape 8 = 63
(`gate-deux-parties.md`).
