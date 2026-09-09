# -*- coding: utf-8 -*-
"""m02 — profil d'ENCRE (pixels au-dessus du fond) ligne par ligne : bandeau, contenu, zone morte, dock.
Contrôle positif : la ligne du filet braise du bandeau (y~142) doit ressortir avec ~1080 px d'encre.
Contrôle negatif : une ligne prise au milieu du grand vide (y=1500) doit rendre 0 px d'encre.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ouvrir(rel):
    p = os.path.join(D, rel); im = Image.open(p).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

def encre_par_ligne(im, seuil):
    g = im.convert('L'); w, h = g.size; px = g.load()
    out = []
    for y in range(h):
        c = 0
        for x in range(w):
            if px[x, y] > seuil: c += 1
        out.append(c)
    return out

def blocs(prof, mini):
    b = []; cur = None
    for y, v in enumerate(prof):
        if v >= mini:
            if cur is None: cur = [y, y]
            else: cur[1] = y
        else:
            if cur is not None and y - cur[1] > 6:
                b.append(tuple(cur)); cur = None
    if cur is not None: b.append(tuple(cur))
    return b

cap = ouvrir('capture-1080x2400.png')
SEUIL = 45   # le fond de la capture est tres sombre (<=25) ; 45 = encre franche
prof = encre_par_ligne(cap, SEUIL)
print("CONTROLE POSITIF filet du bandeau y=142 -> encre =", prof[142], "(attendu ~1080)")
print("CONTROLE NEGATIF milieu du vide  y=1500 -> encre =", prof[1500], "(attendu 0)")
print()
bs = blocs(prof, 2)
print("BLOCS D'ENCRE (seuil lum>%d, >=2 px, fusion si trou<=6) : %d" % (SEUIL, len(bs)))
for a, b in bs:
    m = max(prof[a:b+1])
    print("   y %4d..%-4d  hauteur=%3d  encre max/ligne=%4d" % (a, b, b-a+1, m))

# plus grande zone SANS encre
vides = []; cur = None
for y, v in enumerate(prof):
    if v == 0:
        if cur is None: cur = [y, y]
        else: cur[1] = y
    else:
        if cur: vides.append(tuple(cur)); cur = None
if cur: vides.append(tuple(cur))
vides.sort(key=lambda t: t[0]-t[1])
print()
print("PLUS GRANDES ZONES SANS AUCUNE ENCRE :")
for a, b in vides[:5]:
    print("   y %4d..%-4d  hauteur=%4d px  = %.1f %% de la hauteur d'ecran" % (a, b, b-a+1, 100.0*(b-a+1)/2400))
