# -*- coding: utf-8 -*-
"""m16 — couche globale de la REFERENCE #31 (serie 6, 'le tableau : ce qu'ils savent') et
        argument d'HOMOLOGIE : la reference fournie n'est pas l'homologue de la capture.
Contrôle positif : #31 doit etre CLAIR (liege) — luminance moyenne > 90 sur la zone de panneau.
Contrôle negatif : la capture doit etre SOMBRE — luminance moyenne < 40 sur la meme zone relative.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im
ref = ouvrir('reference-⑮-1080x2102.png')
cap = ouvrir('capture-1080x2400.png')
can = ouvrir('etats/inspections-canon.png')

def couche(nom, im, box):
    sub = im.crop(box); g = sub.convert('L')
    n = g.size[0]*g.size[1]
    h = g.histogram(); moy = sum(i*h[i] for i in range(256))/float(n)
    q = sub.quantize(colors=8, method=Image.MEDIANCUT).convert('RGB')
    cols = q.getcolors(4096); cols.sort(reverse=True); tot = sum(c for c, _ in cols)
    print("-- %s  zone=%s  aire=%d  luminance moyenne=%.1f" % (nom, box, n, moy))
    for c, rgb in cols[:6]:
        print("     %5.1f %%  RGB=%s  R-B=%+d" % (100.0*c/tot, rgb, rgb[0]-rgb[2]))
    return moy

print()
lr = couche('REFERENCE #31 (panneau, sous la barre)', ref, (0, 230, 1080, 2020))
lk = couche('CAPTURE (contenu)',                      cap, (0, 143, 1080, 2210))
lc = couche('CANON serie 2 garni (corps)',            can, (0, 231,  900, 1745))
print()
print("CONTROLE POSITIF #31 clair (>90) : %s (%.1f)" % (lr > 90, lr))
print("CONTROLE NEGATIF capture sombre (<40) : %s (%.1f)" % (lk < 40, lk))
print()
print("ARGUMENT D'HOMOLOGIE (mesure, pas opinion) :")
print("  luminance moyenne  #31=%.1f   canon serie 2=%.1f   capture=%.1f" % (lr, lc, lk))
print("  ecart capture/#31 = %.1f ; ecart capture/canon serie 2 = %.1f" % (abs(lk-lr), abs(lk-lc)))
