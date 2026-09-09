# ⑤ F13 et F15 — les deux sont VECTORIELS. Aucun PNG à produire.

**Réponse à la question posée : formes vectorielles de la maquette, pas des rendus.**
Mesuré dans `ecrans-brennar-4.html` / `-6.html`, cadres 4-8 : **0 `<img>`, 0 base64** dans tout le
segment. Ni SVG d'ailleurs — c'est du **CSS pur**, deux cercles et leurs dégradés.
⇒ **C'est le correcteur, avec sa primitive à chemin.** L'atelier n'a rien à rendre, et je ne
livre pas de PNG : un raster pour ce qui est deux gradients et une bordure serait plus lourd,
moins net à toute résolution, et impossible à re-teinter.

⚠️ **Correction de cible.** La demande visait `ecrans-brennar-2.html`, cadres 3-5 : ils ne portent
ni image, ni SVG, ni aucun des deux motifs. ⑤ vit dans `ecrans-brennar-4.html` **et**
`ecrans-brennar-6.html`, **cadres 4-8** (INDEX, ligne ⑤). C'est là que sont les valeurs ci-dessous.

---

## F13 — le cachet de cire

    forme        cercle 40 × 40, border-radius 50 %
    remplissage  radial-gradient(circle at 40% 35%, #c9432c → #7a1f12 à 70 %)
    anneau       inset 0 0 0 3px  #8a2a18          (le bourrelet de cire)
    ombre        0 3px 8px #000c
    contenu      « ♦ » — Georgia 14 px, #f2c96b, centré
    pose         rotate(−12°) · absolu, right 14 px, top −14 px (il DÉBORDE du coin, c'est le
                 geste : un cachet se pose à cheval sur le bord, pas à l'intérieur)

## F15 — le moletage du jeton

    forme        cercle 34 × 34, border-radius 50 %
    remplissage  radial-gradient(circle at 40% 32%, #f2d9a0 → #b08d3e à 60 % → #7a5a14)
    ⇒ MOLETAGE   **border: 2px dashed #fff5**  — c'est TOUT le finding F15.
                 `#fff5` = blanc à **α = 0,333**. Le tiret alterne blanc translucide et vide :
                 c'est cette alternance qui crante le bord.
    anneau       inset 0 0 0 3px #b08d3e        (la tranche dorée, sous le moletage)
    ombre        0 3px 6px #000b
    contenu      chiffre — Georgia 10 px, 700, #2b1d0e
    variante     `.jeton-mini i` : 18 × 18, même recette, bordure **1,5 px** dashed
    variante     `.jeton.pris` : dégradé éteint #3a3f4a → #1c2029, bordure `#ffffff22`

★ **Pourquoi la mesure du juge tombe juste** : il relève un écart-type de **71,31 → 1,25** sur la
couronne à 0,44 × D. Un dégradé radial seul ne produit pas 71 — il est lisse. **C'est la bordure
pointillée qui fait la variance**, et un disque plat la fait tomber à 1,25. La grandeur qu'il a
choisie mesure donc exactement la bonne chose : l'alternance, pas la couleur.

---

## ⚠️ LE PIÈGE QUI ATTEND LES DEUX — espace colorimétrique

`#fff5` (α 0,333), `#000c` (α 0,8), `#000b` (α 0,733) sont composés par le NAVIGATEUR en **sRGB**.
Le projet Unity compose en **LINÉAIRE** (`m_ActiveColorSpace: 1`). Recopier ces alphas tels quels
rend **1,7× à 4× trop fort**, et l'écart croît avec le contraste — donc il sera pire sur le
moletage clair que sur les ombres. Mesuré au socle sur cinq opacités d'un autre écran.
⇒ La conversion est **dérivable**, elle ne se tâtonne pas : garder l'opacité du CSS et déplacer la
COULEUR donne trois équations pour trois inconnues, donc une solution exacte (0,00/255 mesuré sur
six superpositions), là où ajuster l'opacité seule est un compromis à un nombre pour trois canaux
et laisse une dispersion visible.

## Ce qu'il ne faut PAS faire

⛔ Rendre ces deux objets en PNG « pour aller plus vite ». Ils seraient figés en taille, en teinte
   et en état (`pris`, `pose`, `rendu`, `perdu` sont quatre variantes du MÊME cercle — quatre
   rasters là où c'est un paramètre).
⛔ Remplacer le moletage par un contour continu : c'est précisément le défaut mesuré, et un
   contour plein satisfait « il y a une bordure » sans rien craneler. La garde qui mord est
   l'écart-type de la couronne, pas la présence d'un bord.
