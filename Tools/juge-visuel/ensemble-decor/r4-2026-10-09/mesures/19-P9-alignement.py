#!/usr/bin/env python3
"""P9 — E10 ㊵ : alignement horizontal du libelle du geste — centre de l'ENCRE contre le centre
du CADRE (le bouton), contre les cadres 140 / 141.

On mesure deux choses dans la MEME image, donc sans aucune hypothese d'echelle :
  cadre  : bbox du filet d'or du bouton (predicat : R>120 et R-B>45), bords gauche et droit
  encre  : bbox des pixels de texte a l'INTERIEUR du cadre (fond = mediane de l'interieur)
  ecart  : centre(encre) - centre(cadre), en px image et en % de la largeur du cadre
Le cadre 141 n'a pas de bouton de geste (bloc « COMMENT CA SE MONTE » a sa place) : on le dit.

Echelle : 1 px CSS = 3,6 px image des deux cotes. Tolerance de position : 2 px / 1,5 % du parent.
Controle positif : le cadre du bouton doit etre lui-meme centre dans l'ecran (maquette comme jeu).
Controle negatif : on decale volontairement la fenetre de 40 px -> le centre de l'encre ne doit PAS bouger.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

ordoree = lambda p: p[0] > 120 and p[0] - p[2] > 45

def bouton(im, box):
    pts = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2])
           if ordoree(im.getpixel((x, y)))]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def encre(im, bb, marge=8):
    box = (bb[0] + marge, bb[1] + marge, bb[2] - marge, bb[3] - marge)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    a, b = bs[0]
    m = metrique(bits, W, a, b)
    return box[0] + m['x0'], box[0] + m['x1'], box[1] + a, box[1] + b, f, m

CAS = [("ref", "E10-cadre-140-pas-encore-de-filiere", (40, 1930, 1040, 2030), "INJECTER"),
       ("cap", "E10_Filire_1080x2400",                 (40, 1930, 1040, 2060), "BLANCHIR"),
       ("cap", "E10_Filire_1080x1920",                 (40, 1540, 1040, 1660), "BLANCHIR")]
print("=== P9 : centrage du libelle du geste dans son cadre (E10 ㊵) ===")
for kind, nom, box, mot in CAS:
    im = ouvrir(kind, nom)
    bb = bouton(im, box)
    cx_cadre = (bb[0] + bb[2]) / 2
    x0, x1, y0, y1, f, m = encre(im, bb)
    cx_encre = (x0 + x1) / 2
    L = bb[2] - bb[0] + 1
    d = cx_encre - cx_cadre
    print(f"   {nom}  « {mot} »")
    print(f"      cadre  x={bb[0]}..{bb[2]} (L={L}px = {L/K:.1f} css)  centre={cx_cadre:.1f}  "
          f"y={bb[1]}..{bb[3]} (H={bb[3]-bb[1]+1}px = {(bb[3]-bb[1]+1)/K:.1f} css)")
    print(f"      encre  x={x0}..{x1} (l={x1-x0+1}px = {(x1-x0+1)/K:.1f} css)  centre={cx_encre:.1f}  "
          f"capH={m['capH']}px = {m['capH']/K:.2f} css")
    print(f"      ECART centre encre - centre cadre = {d:+.1f}px = {d/K:+.2f} css = "
          f"{100*d/L:+.2f} % de la largeur du cadre")
    print(f"      marges interieures : gauche={x0-bb[0]}px droite={bb[2]-x1}px  "
          f"(ecart={abs((x0-bb[0])-(bb[2]-x1))}px = {abs((x0-bb[0])-(bb[2]-x1))/K:.2f} css)")
    print(f"      CONTROLE POSITIF : centre du cadre vs centre de l'ecran (539,5) = "
          f"{cx_cadre-539.5:+.1f}px")

print()
print("=== CONTROLE NEGATIF : fenetre de recherche decalee de 40 px, le centre doit tenir ===")
im = ouvrir("cap", "E10_Filire_1080x2400")
bb = bouton(im, (80, 1930, 1000, 2060))
x0, x1, _, _, _, _ = encre(im, bb)
print(f"   fenetre (80..1000) : centre de l'encre = {(x0+x1)/2:.1f}  (attendu identique)")

print()
print("=== Le cadre 141 porte-t-il un bouton de geste ? ===")
im = ouvrir("ref", "E10-cadre-141-aucune-filiere-montee")
pts = sum(1 for y in range(1930, 2030) for x in range(40, 1040) if ordoree(im.getpixel((x, y))))
print(f"   pixels d'or dans la bande du geste (y 1930..2030) : {pts} "
      + ("-> pas de bouton" if pts < 200 else "-> bouton present"))
