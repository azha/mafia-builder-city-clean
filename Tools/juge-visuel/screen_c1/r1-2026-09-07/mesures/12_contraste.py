#!/usr/bin/env python3
"""Contraste WCAG des textes principaux, mesure sur l'encre et le fond REELS
echantillonnes (medianes deja obtenues par 04_echantillon.py, recalculees ici).
Controle positif : blanc pur sur noir pur doit rendre 21.00.
Controle negatif : une couleur sur elle-meme doit rendre 1.00."""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lin(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def ratio(a,b):
    la,lb=L(a),L(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def ech(f,y0,y1,x0,x1,pct=0.985):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]; ps.sort(key=lum); n=len(ps)
    med=lambda l: tuple(int(statistics.median([p[i] for p in l])) for i in range(3))
    return med(ps[int(n*pct):]), med(ps[:int(n*0.55)]), (W,H)

print(f"CONTROLE POSITIF blanc/noir = {ratio((255,255,255),(0,0,0)):.2f} (attendu 21.00) "
      f"-> {'OK' if abs(ratio((255,255,255),(0,0,0))-21)<0.01 else 'ECHEC'}")
print(f"CONTROLE NEGATIF (22,22,28) sur lui-meme = {ratio((22,22,28),(22,22,28)):.2f} (attendu 1.00) "
      f"-> {'OK' if abs(ratio((22,22,28),(22,22,28))-1)<0.01 else 'ECHEC'}")
print()
CAS=[('reference-1080x2102.png','titre Le journal (grand)',513,573,300,780,3.0),
     ('reference-1080x2102.png','sous-titre CAPS (petit)',589,608,300,780,4.5),
     ('reference-1080x2102.png','libelle compteur (petit)',761,774,140,270,4.5),
     ('reference-1080x2102.png','titre une h5 (grand)',957,998,115,900,3.0),
     ('reference-1080x2102.png','cle .cle (petit)',1009,1041,115,560,4.5),
     ('reference-1080x2102.png','chip FAIT DIVERS (petit)',1066,1086,130,300,4.5),
     ('reference-1080x2102.png','note6 pied (petit)',2019,2041,100,980,4.5),
     ('capture-1080x2400.png','titre Le journal (grand)',304,370,300,780,3.0),
     ('capture-1080x2400.png','sous-titre CAPS (petit)',384,406,300,780,4.5),
     ('capture-1080x2400.png','libelle compteur (petit)',569,585,120,280,4.5),
     ('capture-1080x2400.png','cle outlet or (petit)',703,727,75,500,4.5),
     ('capture-1080x2400.png','titre carte serif (grand)',742,826,75,1000,3.0),
     ('capture-1080x2400.png','district . fresh (petit)',839,857,75,300,4.5),
     ('capture-1080x2400.png','corps panneau explicatif (petit)',1928,2035,80,1000,4.5)]
for f,nom,y0,y1,x0,x1,seuil in CAS:
    e,fo,(W,H)=ech(f,y0,y1,x0,x1)
    r=ratio(e,fo)
    print(f"  [{f[:26]:26s} {W}x{H}] {nom:32s} encre={str(e):17s} fond={str(fo):15s} "
          f"ratio={r:6.2f}:1  seuil={seuil}  {'OK' if r>=seuil else '*** SOUS LE SEUIL ***'}")
