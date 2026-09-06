# Addendum au dossier ③ r3 — deux planches sur trois photographient un monde POST-lapse (2026-09-06, 18:50)

**Fait établi après le rendu du rapport** (f2, journaux du back, fuseau mesuré : conteneur en UTC) : deux ticks d'avance du
monde sur `demo_capture` par le seam `_test/citysim/advance` à **2026-09-06T15:15:06–07Z** (`gameMinute` 72 118 → 72 119 → 72 120),
chacun suivi de la maintenance mycélienne (lapse en 4 phases : détruit bâtiments et planques non entretenus — 17 → 3 bâtiments,
2 → 0 planques ; lieutenants et cartes intacts). 15:15Z = **17:15 heure locale** = la minute du run de capture qui a produit
`screen_2_carte_sous_chrome_1080x1920.png` et `carte_ville_hors_chrome_1080x2400.png` (commit `d779d50`, 17:15:51 +0200, suites
`ScreenCarte` + `CaptureCarte`). Les suites de ③ sont le premier suspect nommé — à confirmer par le corps du test, pas par
l'heure seule (une coïncidence de minute est une corrélation).

**Conséquences sur ce dossier :**

| planche | commit | minute photographiée | monde |
|---|---|---|---|
| `capture-1080x2400.png` (PRINCIPALE, sous chrome) | `43ac9cb` 17:08 +0200 | **72 118** | AVANT le lapse — empreinte 72118 · 17 · 3 · 2 |
| `capture-1080x1920.png` (sous chrome) | `d779d50` 17:15 +0200 | **72 120** | POST-lapse (3 bâtiments, 0 planque) |
| `capture-hors-chrome-1080x2400.png` | `d779d50` 17:15 +0200 | **72 120** | POST-lapse |

- **Le verdict ③ r3 TIENT** : tout ce que le rapport mesure sur ces deux planches est du DESIGN (la ville peinte, le fleuve, les
  18 noms, leurs angles, le chrome) — aucun bâtiment ni planque n'y est dessiné ; le contrôle C25 du rapport (sous / hors chrome à
  596 px ≤ 3/255) montre que la carte n'a pas bougé entre les deux minutes.
- **« Même minute » est INVALIDE pour toute clôture DONNÉES de ③ sur ces deux planches** : le corps ↔ front ne se compare qu'à
  minute égale (72 118 dans la base `a0623a5`). La clôture données de ③ attend la refonte de la base et une recapture unique.
- La planche 2400 principale reste comparable à la base `a0623a5` (même minute).
