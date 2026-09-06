#!/usr/bin/env python3
"""m14 - INCLINAISON de la carte : on suit le bord GAUCHE de la carte sur toute sa hauteur et on
regresse une droite. Une carte 'posee sur la table' est inclinee ; un panneau d'UI ne l'est pas.
Controle positif : sur la CAPTURE (panneau aligne sur les axes), l'angle mesure doit valoir ~0.
Controle negatif : le meme instrument doit rendre un angle NON nul sur la REFERENCE.
"""
from PIL import Image
import os, math, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def bord_gauche(im,y0,y1,xmax,seuil,label):
    px=im.load(); pts=[]
    for y in range(y0,y1):
        for x in range(0,xmax):
            if L(px[x,y])>seuil: pts.append((x,y)); break
    if len(pts)<50: print(f"[{label}] trop peu de points ({len(pts)})"); return None
    # regression x = a*y + b
    my=statistics.mean(p[1] for p in pts); mx=statistics.mean(p[0] for p in pts)
    num=sum((p[1]-my)*(p[0]-mx) for p in pts); den=sum((p[1]-my)**2 for p in pts)
    a=num/den
    ang=math.degrees(math.atan(a))
    res=statistics.pstdev([p[0]-(a*(p[1]-my)+mx) for p in pts])
    print(f"[{label}] bord gauche sur {len(pts)} lignes (y={y0}..{y1}) : pente dx/dy={a:+.4f}"
          f"  -> angle={ang:+.2f} deg par rapport a la verticale   residu={res:.2f} px")
    return ang

print("  (seuil choisi au-dessus du fond local de chaque image)")
ar=bord_gauche(ref,830,1480,200,110,'REF carte creme')
ac=bord_gauche(cap,1330,1640,120,45,'CAP panneau')
print(f"  CONTROLE POSITIF CAP ~0 deg : {ac:+.2f} -> {'OK' if abs(ac)<0.35 else 'ECHEC'}")
print(f"  CONTROLE NEGATIF REF != 0  : {ar:+.2f} -> {'OK' if abs(ar)>0.8 else 'ECHEC'}")
print(f"  ECART D'INCLINAISON = {ac-ar:+.2f} deg")
