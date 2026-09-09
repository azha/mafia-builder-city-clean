#!/usr/bin/env python3
"""Reprise de 14 avec des bandes VRAIMENT vides (verifiees : aucune encre).
1) decor entre bandeau et panneau ; 2) degrade du fond du panneau.
Controle negatif : une bande choisie DANS un aplat sans texte doit rendre sd~0."""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def struct(f,x0,x1,y0,y1,nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    vals=[];cols=set()
    for y in range(y0,y1):
        for x in range(x0,x1,2):
            p=px[x,y]; vals.append(lum(p)); cols.add(p)
    sd=statistics.pstdev(vals)
    print(f"  [{f[:26]:26s} {W}x{H}] {nom:40s} x{x0}..{x1} y{y0}..{y1}  "
          f"L_moy={statistics.mean(vals):6.2f}  sd={sd:6.2f}  teintes={len(cols):5d}")
    return sd,len(cols)
print("=== 1. DECOR entre bandeau et panneau (centre exclu : le medaillon/losange y sont) ===")
a,_=struct('reference-1080x2102.png', 60, 420, 210, 420,'REFERENCE gauche (decor ville attendu)')
struct('reference-1080x2102.png',660,1020, 210, 420,'REFERENCE droite')
struct('capture-1080x2400.png',      60, 420, 155, 262,'CAPTURE sous chrome gauche')
struct('capture-1080x2400.png',     660,1020, 155, 262,'CAPTURE sous chrome droite')
print()
print("=== 2. CONTROLES ===")
b,nb=struct('capture-1080x2400.png', 200, 900, 660, 672,'CTRL NEGATIF vrai aplat (gouttiere)')
print(f"  CONTROLE POSITIF decor reference sd={a:.2f} (attendu >4) -> {'OK' if a>4 else 'ECHEC'}")
print(f"  CONTROLE NEGATIF aplat sd={b:.2f} teintes={nb} (attendu sd<1, teintes<=3) -> "
      f"{'OK' if b<1 and nb<=3 else 'ECHEC'}")
print()
print("=== 3. DEGRADE du fond du panneau (echantillons dans les GOUTTIERES, sans encre) ===")
for f,pts,nom in [('reference-1080x2102.png',
                   [(540,462),(540,668),(540,838),(540,1197),(540,1316),(540,1560),(540,1880),(540,2065)],
                   'REFERENCE .jrn6'),
                  ('capture-1080x2400.png',
                   [(540,270),(540,468),(540,666),(540,898),(540,1362),(540,1594),(540,1768),(540,2110)],
                   'CAPTURE')]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    print(f"  [{f[:26]:26s} {W}x{H}] {nom}")
    for x,y in pts:
        p=px[x,y]; print(f"      y={y:4d}  {str(p):16s}  L={lum(p):5.1f}  B-R={p[2]-p[0]:+3d}")
