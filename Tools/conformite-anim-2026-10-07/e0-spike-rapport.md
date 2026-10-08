# E0 — spike des inconnues d'uGUI (design §4) — rapport du créneau du 08/10/2026 (CLIENT-3)

Test : `Assets/Tests/PlayMode/E0SpikeUguiPlayModeTests.cs` (catégorie `SpikeE0`), batchmode Unity 6000.4.6f1 sur
`~/project/mafia-unity-anim`. Données brutes : `e0-spike-2026-10-08.tsv` (même dossier). 48 cibles animées par la VRAIE
régie (E1), 15 images de chauffe puis 90 mesurées, 60 images/s simulées.

## Les runs

| run | quoi | verdict |
|---|---|---|
| 1 | import + compilation batchmode des 17 assemblies (vraies frontières) + 78 tests E1 (`Mouvement`) | **78/78 VERTS**, 0 `error CS`, compilation réelle (5,6 s), 0-alloc réel du `Tick` vérifié |
| 2 | E0, mesure par compteurs de rendu | **ROUGE, et c'est la garde qui a parlé** : en batchmode, `Batches Count` est invalide et `Draw Calls Count` lit 0 ; l'anti-vacuité a refusé des zéros plausibles. (d) mesuré quand même |
| 3 | E0, mesure par chronomètre et allocation du thread | **2/2 VERTS** |

## Ce que les mesures disent

| scénario (48 cibles) | `Tick` régie (µs) | mise à jour des canvas (µs) | rendu caméra (µs) | alloc. du `Tick` (o) | SetPass |
|---|---:|---:|---:|---:|---:|
| statique | 0,6 | 1,3 | 171 | 0 | 2 |
| `Alpha` × 1 | 2,2 | 1,2 | 196 | 0 | 2 |
| `Alpha` × 48 | 20,6 | 1,3 | 198 | 0 | 2 |
| `Melange` × 48 | 13,8 | **125,0** | 221 | 0 | 2 |
| `Alpha` × 48, Canvas imbriqués | 21,8 | 1,3 | **400** | 0 | 2 |
| `Melange` × 48, Canvas imbriqués | 15,0 | 134,6 | **422** | 0 | 2 |
| `Alpha` × 48 sous `RectMask2D` | 20,3 | 30,4 | 248 | 0 | 2 |
| `Alpha` × 48 sous `RectMask2D`, Canvas imbriqués | 21,2 | 31,2 | **500** | 0 | **96** |

1. **(a) `CanvasGroup.alpha`** ne reconstruit pas le canvas : 1,3 µs de mise à jour, comme le statique. C'est le canal le moins cher.
2. **(b) `Graphic.color` (`Melange`)** reconstruit les lots : **≈ 100 fois** le coût de mise à jour de l'`Alpha` (125 µs pour 48 cibles).
3. **(c) Canvas imbriqués** : le rendu CPU **double** (171 → 400 µs) ; sous un masque, les SetPass passent de **2 à 96** (le lot est cassé par cible).
4. **(d) `RectMask2D` découpe une cible posée dans un Canvas imbriqué** : pixel hors masque à 0, dedans à 0,683 — comme le témoin sans imbrication. Mesuré au pixel (rendu dans une `RenderTexture`, `ReadPixels`).
5. **La régie** : 0 octet alloué par `Tick` dans les 8 scénarios ; ≤ 22 µs pour 48 pistes.

## Décisions proposées (à ratifier par f2)

- **Pas de Canvas imbriqué** — le défaut du design §4 est confirmé par la mesure (rendu × 2, SetPass × 48 sous masque). La découpe, elle, n'aurait pas été un obstacle (d).
- **`Alpha` d'abord** : un mouvement qui peut s'écrire en `Alpha` s'écrit en `Alpha`. `Melange` reste admis (le catalogue en a 8 entrées, dont au plus 6 voyants de ⑮ en régime ensemble), mais un écran ne devrait pas en faire tourner des dizaines à la fois. Pas de nouveau plafond chiffré : voir la limite ci-dessous.
- **Sous un masque** : aucun canal de transformation n'y est posé par le catalogue v4 ; le plafond de 6 pistes du design reste le défaut, sans mesure qui le contredise.

## Limite (f2, 08/10)

**Coût CPU mesuré, coût de rendu réel au test sur appareil.** Ces temps sont ceux d'un éditeur en batchmode sur poste de
travail, sans rendu à l'écran : ils classent les mécanismes entre eux (l'`Alpha` contre le `Melange`, avec ou sans Canvas
imbriqué), ils ne disent PAS le coût GPU sur un téléphone. Aucun seuil GPU n'en est tiré. Les compteurs de rendu
(batches, draw calls) sont invalides en batchmode : ils se liront au profileur, sur appareil.

## Suite : règles ratifiées (f2, 08/10) et conséquence pour ce spike

Règles écrites dans le design §4 et appliquées par la régie : aucun Canvas créé par le mécanisme (G7) ; `Alpha` d'abord ;
`Melange` interdit aux `Ambiance` ; au plus **8** pistes `Melange` vivantes, refus compté (`Regie.RefusMelange`). ⚠️ Les
scénarios `melange_48` et `melange_48_imbrique` de ce rapport sont donc une **mesure historique** : rejoués avec la régie
actuelle, 40 des 48 cibles seraient refusées (et les 32 `Ambiance` le sont d'office). Ils ont servi à fonder la règle, ils
ne se reproduisent plus tels quels.
