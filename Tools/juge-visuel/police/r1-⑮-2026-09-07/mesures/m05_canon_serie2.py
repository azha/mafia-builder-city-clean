# -*- coding: utf-8 -*-
"""m05 — inventaire geometrique du CANON de serie 2 (garni + vide), 900 px = 300 CSS (x3,0).
Toutes les grandeurs sont converties en CSS px pour etre comparables a la capture (1080 = 300 CSS, x3,6).
Contrôle positif : la largeur des deux canons DOIT valoir 900 (declaree par le dossier).
Contrôle negatif : le filet de tete (~y229) doit etre present dans le canon et ABSENT du fond a y=600.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

can = ouvrir('etats/inspections-canon.png')
vid = ouvrir('etats/inspections-vide.png')
print("CONTROLE POSITIF largeurs == 900 :", can.size[0] == 900 and vid.size[0] == 900)

def outils(im, seuil):
    g = im.convert('L'); px = g.load(); W, H = g.size
    def segments(y0, y1, trou=12, x0=0, x1=None):
        x1 = W-1 if x1 is None else x1
        cols = []
        for x in range(x0, x1+1):
            cols.append(1 if any(px[x, y] > seuil for y in range(y0, y1+1)) else 0)
        seg = []; cur = None
        for i, v in enumerate(cols):
            x = x0+i
            if v:
                if cur is None: cur = [x, x]
                else: cur[1] = x
            else:
                if cur is not None and x - cur[1] > trou: seg.append(tuple(cur)); cur = None
        if cur is not None: seg.append(tuple(cur))
        return seg
    def hbox(y0, y1, x0, x1):
        ys = [y for y in range(y0, y1+1) if any(px[x, y] > seuil for x in range(x0, x1+1))]
        return (min(ys), max(ys), max(ys)-min(ys)+1) if ys else (None, None, 0)
    return segments, hbox, px

# ---- canon garni : bornes lues sur le profil m01 puis affinees, x borne a l'interieur du cadre .tel
segC, hbC, pxC = outils(can, 46)
print()
print("== CANON GARNI (x3,0 ; 1 px CSS = 3,0 px) ==")
for nom, a, b in [('titre LES INSPECTIONS', 60, 97), ('sous-titre l1', 125, 152), ('sous-titre l2', 166, 195),
                  ('filet de tete', 226, 233), ('carte Verge-A haut', 285, 345), ('carte Verge-A entiere', 262, 640),
                  ('carte Spine-A entiere', 672, 1090), ('bandeau vide (16 districts)', 1190, 1340),
                  ('CTA secondaire', 1440, 1700)]:
    s = segC(a, b, trou=12, x0=25, x1=875)
    hh = hbC(a, b, 25, 875)
    print("  %-28s y=%4d..%-4d encre y=%s..%s (h=%s / %.1f CSS)  %d seg" %
          (nom, a, b, hh[0], hh[1], hh[2], (hh[2] or 0)/3.0, len(s)))
    for x0, x1 in s[:8]:
        print("        x %3d..%-3d (l=%3d / %.1f CSS)" % (x0, x1, x1-x0+1, (x1-x0+1)/3.0))

print()
print("CONTROLE NEGATIF filet de tete present a y=229, absent a y=600 :")
n229 = sum(1 for x in range(25, 875) if pxC[x, 229] > 46)
n600 = sum(1 for x in range(25, 875) if pxC[x, 600] > 46)
print("   y=229 -> %d px clairs ; y=600 -> %d px clairs" % (n229, n600))

segV, hbV, pxV = outils(vid, 40)
print()
print("== CANON VIDE ==")
for nom, a, b in [('titre', 60, 97), ('sous-titre l1', 125, 152), ('filet de tete', 226, 233),
                  ('bandeau du message', 870, 1105)]:
    s = segV(a, b, trou=12, x0=25, x1=875); hh = hbV(a, b, 25, 875)
    print("  %-24s y=%4d..%-4d encre y=%s..%s (h=%s / %.1f CSS) %d seg" %
          (nom, a, b, hh[0], hh[1], hh[2], (hh[2] or 0)/3.0, len(s)))
    for x0, x1 in s[:6]:
        print("        x %3d..%-3d (l=%3d / %.1f CSS)" % (x0, x1, x1-x0+1, (x1-x0+1)/3.0))
