"""m32 — le fond de la boite de compteur : degrade vertical ou aplat ?
Mediane de rangee dans la boite 1, colonnes hors encre.
Controle positif : le panneau bas (fond connu uniforme) doit rendre une amplitude ~0.
Controle negatif : le fond de CADRE (degrade connu) doit rendre une amplitude > 3 pts.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
CAS={'reference-1080x2102.png':dict(b=(706,815),x=(58,160),pb=(1660,1700),cad=(460,650)),
     'capture-1080x2400.png'  :dict(b=(732,841),x=(55,160),pb=(1596,1640),cad=(490,680))}
for nom,c in CAS.items():
    im=ouvrir(nom); p=im.load()
    for lab,(y0,y1),(x0,x1) in (("boite de compteur 1",c['b'],c['x']),
                                ("panneau bas [ctrl+]",c['pb'],(120,900)),
                                ("fond de cadre  [ctrl-]",c['cad'],(60,200))):
        prof=[(y, mediane([lum(p[x,y]) for x in range(x0,x1+1)])) for y in range(y0,y1+1)]
        v=[q for _,q in prof]
        cols=[mediane_couleur(im,x0,y,x1,y) for y in (y0+3,(y0+y1)//2,y1-3)]
        print(f"  [{nom}] {lab:24s} amplitude = {max(v)-min(v):.2f} pts ; haut {cols[0]} milieu {cols[1]} bas {cols[2]}")
    print()
