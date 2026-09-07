# -*- coding: utf-8 -*-
"""m01 — geometrie verticale : bandeau, dock, bbox d'encre, zones vides.
Contrôle positif : la largeur de la capture DOIT valoir 1080 (declaree par le dossier).
Contrôle negatif : la hauteur de la capture (2400) DOIT differer de celle de la reference (2102).
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ouvrir(rel):
    p = os.path.join(D, rel)
    im = Image.open(p).convert('RGB')
    print("OUVERT %-34s %s  taille=%s" % (rel, os.path.realpath(p).split('/')[-1], im.size))
    return im

def profil_lignes(im):
    """moyenne de luminance par ligne, via redimensionnement BOX en largeur 1."""
    g = im.convert('L').resize((1, im.size[1]), Image.BOX)
    return list(g.getdata())

def profil_colonnes(im):
    g = im.convert('L').resize((im.size[0], 1), Image.BOX)
    return list(g.getdata())

cap = ouvrir('capture-1080x2400.png')
ref = ouvrir('reference-⑮-1080x2102.png')
can = ouvrir('etats/inspections-canon.png')
vid = ouvrir('etats/inspections-vide.png')

print()
print("CONTROLE POSITIF  largeur capture == 1080 :", cap.size[0] == 1080, cap.size[0])
print("CONTROLE NEGATIF  hauteur capture != hauteur reference :", cap.size[1] != ref.size[1], cap.size[1], ref.size[1])
print()

for nom, im in (('capture', cap), ('reference#31', ref), ('canon-serie2-garni', can), ('canon-serie2-vide', vid)):
    pl = profil_lignes(im)
    h = len(pl)
    print("== %s  h=%d  lum moy=%.2f  min=%d max=%d" % (nom, h, sum(pl)/h, min(pl), max(pl)))
    # lignes "claires" (au dessus de moy+8) = frontieres / texte
    moy = sum(pl)/h
    pics = [(y, v) for y, v in enumerate(pl) if v > moy + 12]
    # regrouper
    grp = []
    for y, v in pics:
        if grp and y - grp[-1][-1][0] <= 3:
            grp[-1].append((y, v))
        else:
            grp.append([(y, v)])
    print("   bandes claires (>moy+12) : %d groupes" % len(grp))
    for g in grp[:24]:
        ys = [a for a, _ in g]
        print("     y %4d..%-4d  (%3d px)  pic=%.1f" % (ys[0], ys[-1], len(ys), max(b for _, b in g)))
