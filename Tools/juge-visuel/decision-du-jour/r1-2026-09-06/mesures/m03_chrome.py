#!/usr/bin/env python3
"""m03 - frontieres du chrome (bandeau haut, dock bas) et rect libre, sur les DEUX images.
Methode : luminance moyenne par ligne, on cherche les ruptures. Le bandeau du HUD porte un
filet or ; le dock porte des pastilles + libelles.
Controle positif : le bandeau mesure doit valoir 143 px +-3 dans la capture (52 CSS-HUD x2,755, dossier).
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

for name, fn in (('REF','reference-1080x2102.png'), ('CAP','capture-1080x2400.png')):
    im = Image.open(os.path.join(D, fn)).convert('RGB'); W,H = im.size
    print(f"\n=== [{name}] {fn} {W}x{H} ===")
    px = im.load()
    # profil fin sur les 300 premieres lignes et les 500 dernieres
    def bloc(y0,y1,titre):
        print(f"  -- {titre} --")
        prev=None
        for y in range(y0,y1):
            s=sum(L(px[x,y]) for x in range(0,W,6))/(W//6)
            if prev is None or abs(s-prev)>4.0:
                print(f"     y={y:5d} lum_moy={s:7.2f}   (rupture {s-prev:+.1f})" if prev is not None else f"     y={y:5d} lum_moy={s:7.2f}")
            prev=s
    bloc(0,260,'haut')
    bloc(H-500,H,'bas')
