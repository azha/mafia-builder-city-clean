# Palette seule — 2026-09-22 23:50, session mafia-builder-city-clean-91

Objet : inscrire la garde TD-612 (`LitterauxDeCouleurPlayModeTests`, catégorie `Palette`) au filtre par défaut. Née le 06/09 pour rougir
(d665720d, 28696e43), JAMAIS inscrite (`git log --all -S'"Palette"' -- Assets/Editor/MafiaCI.cs` : vide). CLIENT-2 l'a trouvée rouge sur 34
littéraux antérieurs à ses lots ; fermés ici par assembly (6d3e5bfc Account 34→28, d2354db8 CitySim →20, 45165322 Economy →14,
65fc606b Onboarding →11, 15ba04fb Operational →0 — port Python `apparier-litteraux-aux-tokens.py --bilan` : 91 → 57 actifs, 34 → 0).
Compteur avant le run : 5 déclarés, 5 exécutés, aucune paire, aucune relation de préfixe.

Porte prise sur le signal de l'orchestrateur (libre à 23:49), `MAFIA_CI_CATEGORIES=Palette`, sans la paire (`env -u` des quatre,
absence de `MAFIA_DEMO_*` vérifiée dans le même `bash -c`), HEAD 15ba04fb.

| | |
|---|---|
| lancement → fin | 23:50:11 → 23:50:32 (elapsed=21s) · RC_RUN=0 |
| DÉCLARÉS SOUS LE FILTRE | 5 |
| fin | `passed=5 failed=0 skipped=0 inconclusive=0 declares=5 comptes=5` |
| catégories RÉELLEMENT exécutées | `[Palette]` |
| la mesure réelle | `AucunLitteralDeCouleurNeRecopieUnTokenNomme` PASSED — la garde, lisant les tokens par réflexion sur l'asset, confirme le 0 du port Python |
| contrôles | positif (recopie vue), négatifs ×2 (blanc, #7a5a14 hors palette), balayage des quatre formes : PASSED |

Après le run : `git checkout -- Assets/Fonts/`, aucun PNG écrit ; porte rendue à 23:50:40 (`release … --atlas-vus`, RC_REL=0).

⇒ Inscrite au filtre par défaut, en PARTIE 1 : partie 1 = 35 catégories / 445, partie 2 = 58, filtre = 53 / 503, étape 8 = 63.
