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

⚠️ DÉDUIT : l'ordre des deux couches adaptive dans `m_Textures` (fond puis avant-plan) n'est pas documenté
par Unity (`PlatformIcon.SetTextures` : « array of size maxLayerCount », sans ordre). Le choix
fond = image OPAQUE / avant = transparent rend l'ordre indifférent à l'affichage : inversé, l'image est
masquée par le launcher de la même façon. Vérification due : l'icône sur l'appareil au prochain APK.
