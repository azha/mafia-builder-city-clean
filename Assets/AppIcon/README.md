# Icône d'application Android

Générée le 2026-09-06 via `Tools/fal/generer.py` (fal.ai, `fal-ai/flux/dev`, seed 11) — source, prompt et
sidecar de provenance dans `Source/`. Motif : trois conteneurs empilés sous une lampe au sodium, nuit, pluie
(registre `art_direction.md` : port industriel, sodium, pluie sur béton ; aucun texte, aucun personnage).

Dérivés par `Tools/fal/icone-android.py` — la boîte englobante du sujet est MESURÉE sur la source (pixels
qui s'écartent du ciel, hors marges de pluie et hors sol), puis l'image est recentrée et DÉZOOMÉE par
réplication des bords jusqu'à ce que cette boîte tienne dans le cercle sûr adaptive (66 dp sur 108) ;
le script refuse d'écrire si une part du sujet reste hors du cercle, et il exige d'abord que la découpe
brute ROUGISSE (contrôle positif : 18,6 % hors cercle → 0,0 % composé). Sorties :
- `icone_adaptive_fond_432.png` — couche pleine (le launcher ne montre que les 288 px centraux) ;
- `icone_adaptive_avant_432.png` — couche entièrement transparente ;
- `icone_legacy_192.png`, `icone_round_192.png` — même composition.

**Régime déclaré : `sujet-en-fond`** — fond = image opaque entière, avant-plan entièrement transparent.
Depuis la revue de l'APK du 2026-09-06 (orchestration : « la couche prévue pour le sujet est vide »), le
script ASSERTE ce régime au lieu de le supposer : plancher anti-vacuité sur la couche déclarée porteuse,
avant-plan exigé à 0 pixel opaque sous ce régime, fond exigé opaque à 100 %, et trois contrôles exécutés
avant d'écrire (P1 découpe brute rouge sur la boîte · P2 avant-plan vide rouge sur le plancher · N1 un
pixel opaque hors cercle ≠ 0). Sous le régime `sujet-en-avant`, l'avant-plan livré ici ROUGIT (0,000 <
0,03) — c'est le contrôle qui manquait à la première version.

**Proposition en attente (décision DA, user)** : `Tools/fal/generees/2026-09-06/icone-variantes/` — A
`sujet-en-fond` (celui-ci) contre B `sujet-en-avant` (conteneurs détourés en avant-plan, ciel/sol
reconstruits en fond ; le launcher anime alors l'avant-plan en parallaxe). Planche
`comparaison-A-fond-vs-B-avant.png`. Rien n'est remplacé ici avant la décision.

Ce qui reste DÉDUIT : l'ordre fond/avant des deux couches dans `m_Textures` n'est pas documenté par Unity ;
sous A l'ordre est indifférent à l'affichage (fond opaque, avant vide). Détecteur : l'icône sur l'appareil au
prochain APK — Unity a déjà mesuré dans l'APK du 06/09 que les 6 `ic_launcher_foreground` sont à 0 pixel
opaque et que la pile remplit la zone visible (`scratchpad/apk-icones/` de son arbre).
