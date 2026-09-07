#!/usr/bin/env python3
"""Echantillonne la couleur REELLE des elements, au lieu de la supposer.
Pour une bande donnee : couleur des pixels les plus LUMINEUX (l'encre du texte,
loin de la frange) et couleur MEDIANE du fond (pixels sombres).
Controle positif : la bande de fond nu doit rendre encre==fond (aucun texte)."""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def bande(f, y0, y1, x0, x1, nom, pct=0.985):
    im = Image.open(os.path.join(D, f)).convert('RGB'); W,H=im.size; px=im.load()
    ps = [px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum)
    n = len(ps)
    hi = ps[int(n*pct):]                       # encre (pixels les plus clairs)
    lo = ps[:int(n*0.55)]                      # fond
    def med(l): return tuple(int(statistics.median([p[i] for p in l])) for i in range(3))
    e, fo = med(hi) if hi else (0,0,0), med(lo)
    print(f"  [{f[:28]:28s} {W}x{H}] {nom:34s} y={y0}-{y1}  encre={e}  fond={fo}  Lencre={lum(e):.1f} Lfond={lum(fo):.1f}")
    return e, fo

print("=== REFERENCE ===")
bande('reference-1080x2102.png', 490, 560, 260, 820, 'titre "Le journal"')
bande('reference-1080x2102.png', 585, 605, 280, 800, 'sous-titre CE QUI SE DIT')
bande('reference-1080x2102.png', 690, 730, 120, 280, 'compteur "01"')
bande('reference-1080x2102.png', 755, 775, 120, 280, 'libelle A LA UNE')
bande('reference-1080x2102.png', 885, 915, 115, 640, 'manchette LE CLAIRON')
bande('reference-1080x2102.png', 950, 1010, 115, 900, 'titre une (h5)')
bande('reference-1080x2102.png',1060, 1090, 130, 320, 'chip FAIT DIVERS')
bande('reference-1080x2102.png',1225, 1255, 155, 810, 'breve b')
bande('reference-1080x2102.png',1265, 1290, 155, 560, 'breve cle')
bande('reference-1080x2102.png',1930, 1965, 320, 760, 'CTA Y PRETER ATTENTION')
bande('reference-1080x2102.png',2100, 2102,   5,1075, 'CONTROLE NEGATIF bord bas')
print()
print("=== CAPTURE PRINCIPALE (sous chrome) ===")
bande('capture-1080x2400.png', 290, 350, 260, 820, 'titre "Le journal"')
bande('capture-1080x2400.png', 375, 400, 280, 800, 'sous-titre CE QUI SE DIT')
bande('capture-1080x2400.png', 505, 555, 120, 300, 'compteur "20"')
bande('capture-1080x2400.png', 565, 590, 120, 300, 'libelle A LA UNE')
bande('capture-1080x2400.png', 700, 725, 75, 490, 'cle outlet (or)')
bande('capture-1080x2400.png', 740, 800, 75, 990, 'cle headline (titre)')
bande('capture-1080x2400.png', 835, 860, 75, 300, 'district-N . fresh')
bande('capture-1080x2400.png',1855, 1885, 80, 620, 'sur-titre CE QUE LE SERVEUR')
bande('capture-1080x2400.png',1875, 1935, 80, 900, 'titre panneau explicatif')
bande('capture-1080x2400.png',2350, 2400,   0,1080, 'CONTROLE NEGATIF bas nu')
