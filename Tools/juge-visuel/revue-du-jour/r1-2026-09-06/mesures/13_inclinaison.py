#!/usr/bin/env python3
"""Inclinaison de la plaque du registre, mesuree sur la REFERENCE NATIVE
(1080x2102, aucun reechantillonnage) pour ecarter tout artefact de mise a
l'echelle, puis sur la capture.
Controle negatif : la capture doit rendre une pente NULLE."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
for nom,p,y0,y1 in [('REFERENCE native (3 jetons)','reference-1080x2102.png',1650,1700),
                    ('CAPTURE 2026-09-04','capture-1080x2400.png',1980,2020)]:
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"\n=== {nom} : {p} {im.size} ===")
    px=im.load(); pts=[]
    for x in range(120,960,60):
        ys=[y for y in range(y0,y1) if lum(px[x,y])>=140]
        if ys: pts.append((x,ys[0]))
    print(f"  bord haut par x : {pts}")
    if len(pts)>=2:
        dx=pts[-1][0]-pts[0][0]; dy=pts[-1][1]-pts[0][1]
        import math
        print(f"  pente = {dy} px sur {dx} px  -> {math.degrees(math.atan2(dy,dx)):+.3f} deg")
