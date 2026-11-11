# Diff pixel des planches — Accueil, retour d'appui v5

Seuil : 3/255 (plus grand canal). AVANT = `avant`, APRÈS = `apres`.

## Contrôle positif (exigé)
- un pixel à +10 : **1** pixel vu (attendu 1) · un pixel à +2 (sous le seuil) : **0** (attendu 0)

## Stabilité du banc (paire -1/-2 d'un même run)
| cadrage | AVANT | APRÈS |
|---|---|---|
| c1-rien-a-trancher-1080x1920 | 0 px | 0 px |
| c1-rien-a-trancher-1080x2400 | 0 px | 0 px |
| c2-une-carte-de-tete-1080x1920 | 936 px | 936 px |
|  ⚠ banc instable sur c2-une-carte-de-tete-1080x1920 : le diff avant/après de ce cadrage est entaché | | |
| c2-une-carte-de-tete-1080x2400 | 0 px | 0 px |
| c3-des-rapports-a-lire-1080x1920 | 1063 px | 1063 px |
|  ⚠ banc instable sur c3-des-rapports-a-lire-1080x1920 : le diff avant/après de ce cadrage est entaché | | |
| c3-des-rapports-a-lire-1080x2400 | 0 px | 0 px |
| c4-la-file-sous-pression-1080x1920 | 0 px | 0 px |
| c4-la-file-sous-pression-1080x2400 | 0 px | 0 px |
| c5-joueur-neuf-la-suite-1080x1920 | 0 px | 0 px |
| c5-joueur-neuf-la-suite-1080x2400 | 0 px | 0 px |
| c6-carte-de-tete-au-dessus-de-la-file-1080x1920 | 1019 px | 1019 px |
|  ⚠ banc instable sur c6-carte-de-tete-au-dessus-de-la-file-1080x1920 : le diff avant/après de ce cadrage est entaché | | |
| c6-carte-de-tete-au-dessus-de-la-file-1080x2400 | 0 px | 0 px |

## Diff AVANT → APRÈS
| cadrage | dimensions | pixels différents | boîte englobante (x0,y0,x1,y1 ; y du haut) | image |
|---|---|---|---|---|
| c1-rien-a-trancher-1080x1920 | 1080x1920 | **0** | None | `diff-c1-rien-a-trancher-1080x1920.png` |
| c1-rien-a-trancher-1080x2400 | 1080x2400 | **0** | None | `diff-c1-rien-a-trancher-1080x2400.png` |
| c2-une-carte-de-tete-1080x1920 | 1080x1920 | **0** | None | `diff-c2-une-carte-de-tete-1080x1920.png` |
| c2-une-carte-de-tete-1080x2400 | 1080x2400 | **0** | None | `diff-c2-une-carte-de-tete-1080x2400.png` |
| c3-des-rapports-a-lire-1080x1920 | 1080x1920 | **0** | None | `diff-c3-des-rapports-a-lire-1080x1920.png` |
| c3-des-rapports-a-lire-1080x2400 | 1080x2400 | **0** | None | `diff-c3-des-rapports-a-lire-1080x2400.png` |
| c4-la-file-sous-pression-1080x1920 | 1080x1920 | **0** | None | `diff-c4-la-file-sous-pression-1080x1920.png` |
| c4-la-file-sous-pression-1080x2400 | 1080x2400 | **0** | None | `diff-c4-la-file-sous-pression-1080x2400.png` |
| c5-joueur-neuf-la-suite-1080x1920 | 1080x1920 | **0** | None | `diff-c5-joueur-neuf-la-suite-1080x1920.png` |
| c5-joueur-neuf-la-suite-1080x2400 | 1080x2400 | **0** | None | `diff-c5-joueur-neuf-la-suite-1080x2400.png` |
| c6-carte-de-tete-au-dessus-de-la-file-1080x1920 | 1080x1920 | **0** | None | `diff-c6-carte-de-tete-au-dessus-de-la-file-1080x1920.png` |
| c6-carte-de-tete-au-dessus-de-la-file-1080x2400 | 1080x2400 | **0** | None | `diff-c6-carte-de-tete-au-dessus-de-la-file-1080x2400.png` |
