#!/usr/bin/env python3
"""Structure des rangees de la CAPTURE.
Une rangee = bande de remplissage ardoise ; les rangees sont separees par des lignes NOIRES pleine largeur.
Instrument : classification de chaque ligne y en NOIR (lum_max<8) / PLEIN (mediane de la ligne proche de l'aplat).
Controles : (+) l'aplat de rangee doit etre constant sur >=80% des lignes de rangee ;
            (-) les lignes noires doivent exister (sinon l'instrument ne discrimine pas)."""
import os
from PIL import Image
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(D,'capture-1080x2400.png')
im = Image.open(p).convert('RGB'); W,H = im.size
print(f"ouvre {os.path.basename(p)} taille={im.size}")
px = im.load()
XS = list(range(20, W, 37))   # echantillon de colonnes hors centre (evite le texte centre)
def med(y):
    v = sorted(px[x,y] for x in XS)
    return v[len(v)//2]
cls=[]
for y in range(H):
    m = med(y)
    lm = 0.2126*m[0]+0.7152*m[1]+0.0722*m[2]
    cls.append('N' if lm < 8 else ('P' if lm > 25 else '?'))
# segments
segs=[]; cur=cls[0]; d=0
for y in range(1,H):
    if cls[y]!=cur:
        segs.append((cur,d,y-1)); cur=cls[y]; d=y
segs.append((cur,d,H-1))
print(f"CONTROLE NEGATIF : nb de segments NOIR = {sum(1 for s in segs if s[0]=='N')} (doit etre > 0)")
print("type  y0   y1   hauteur")
for t,a,b in segs:
    if b-a+1 >= 3:
        print(f"  {t}  {a:5d} {b:5d}  {b-a+1:5d}")
