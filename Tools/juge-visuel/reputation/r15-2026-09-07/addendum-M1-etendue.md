# Addendum ㊲ r15 — M1 : le halo n'est pas ABSENT, il est trop COURT (f2 / correcteur, 2026-09-07 07:10)

- Le correcteur a rendu et compté l'effet à la résolution livrée : à 1080×1920, α = 0 ⇒ 1 276 px changés (l'effet existe et il est
  fort) ; dilatation 0,00 ⇒ 990 px · 0,25 ⇒ 1 182 · 0,40 ⇒ 1 520 · 0,60 ⇒ 2 193 (saturation : 0,80 et 1,00 rendent 2 208) ; le livré
  est à 0,12 ⇒ **le halo colle au glyphe**.
- Le juge échantillonnait à 2, 4, 10, 20, 30 px : `P(1) = 4,46` (classé « frange »), `P(2) = 0,02`, `P(d≥3) = 0,00 exactement`, brute
  à 3 px = fond lointain au bit près ⇒ **mesures exactes et complètes ; c'est l'inférence « aucun pixel » qui manquait** — un zéro
  exact au-delà d'une distance dit « rien AU-DELÀ ». Le finding tient (écart de 25 pt à d2 contre la maquette) ; la classe passe de
  « garde sur les paramètres ≠ effet » à « fenêtre d'observation plus large que l'effet ». Réconciliation cohérente avec tout, **non
  prouvée** (le chemin de capture n'a pas été mesuré) — borne du correcteur, portée telle quelle.
- Cible transmise au correcteur : la COURBE de la référence (`m09_halo_profil.py`, compteur 1) — d1 26,81 · d2 25,11 · d3 22,25 ·
  d4 17,48 · d5 14,27 · d6 12,67 · d7 11,18 · d8 9,84 · d9 8,65 · d10 7,49 · d11 6,42 · d12 5,45 · d13 4,51 · d14 3,82 · d15 2,95 ·
  d16 2,41 · d17 1,60 · d18 0,60 · d19 0,24 · d20 −0,10 ; portée ≈ 18 px, mi-valeur ~d6, plateau 1 px, vallée +1,57, symétrie 1,14,
  largeur = encre. Le tour suivant mesure aussi d = 1 et la brute au bord.
