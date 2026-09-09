#!/usr/bin/env python3
# 04 — couche globale : palette quantifiee, luminance moyenne, DENSITE d'encre
#      sur la ZONE DE CONTENU de chaque image (entre bandeau et dock / bord).
# Controle positif : le noir de fond du dossier doit ressortir comme couleur dominante partout.
# Controle negatif : la reference (decor peint) doit avoir une palette PLUS RICHE que la capture.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

CIBLES = [
  ('capture-1080x2400.png',  150, 2170, 'capture (contenu : sous le filet 142 -> haut du dock 2170)'),
  ('reference-1080x2102.png',225, 2102, 'reference v4-25 (sous la barre evoquee -> bas)'),
  ('etats/v4-29.png',        190, 1752, 'v4-29 au calme (sous la barre evoquee -> bas)'),
  ('etats/ecran-canon-vide.png', 0, 1752, 'canon serie 2 aucune semaine (pleine hauteur)'),
]
for f, y0, y1, nom in CIBLES:
    im = Image.open(os.path.join(D,f)).convert('RGB'); W,H = im.size
    z = im.crop((0,y0,W,min(y1,H)))
    zw,zh = z.size
    print(f"=== {nom}")
    print(f"    OUVERT {f} -> {W}x{H} ; zone {zw}x{zh} (y {y0}..{min(y1,H)})")
    # palette quantifiee
    q = z.quantize(colors=8, method=Image.MEDIANCUT).convert('RGB')
    cols = sorted(q.getcolors(zw*zh), reverse=True)
    tot = zw*zh
    print("    palette (part, RGB) :", ", ".join(f"{100*c/tot:.1f}% {rgb}" for c,rgb in cols[:6]))
    # luminance moyenne (echantillon 1/9)
    px = z.load()
    vals = [lum(px[x,y]) for y in range(0,zh,3) for x in range(0,zw,3)]
    moy = sum(vals)/len(vals)
    # densite d'encre : ecart > 20 a la mediane globale de la zone
    vt = sorted(vals); med = vt[len(vt)//2]
    enc = sum(1 for v in vals if abs(v-med) > 20)
    # nombre de teintes distinctes (quantifie a 5 bits/canal)
    teintes = set()
    for y in range(0,zh,3):
        for x in range(0,zw,3):
            p = px[x,y]; teintes.add((p[0]>>3,p[1]>>3,p[2]>>3))
    print(f"    lum moyenne={moy:6.2f}  lum mediane={med:6.2f}  densite d'encre={100*enc/len(vals):5.2f}%  teintes distinctes(5bit)={len(teintes)}")
