# -*- coding: utf-8 -*-
"""25 - Ce qui separe les deux planches : la fleche retour du bandeau.
CONTROLE POSITIF : hors du coin haut-gauche, la difference doit rester du bruit d'anti-crenelage
(< 30/255 par canal sur >99 % des pixels).
CONTROLE NEGATIF : dans le coin haut-gauche, la difference doit etre franche."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
C=ouvrir('../capture-1080x2400.png'); P=ouvrir('../capture-planche-1080x2400.png')
pc=C.load(); pp=P.load()
def zone(x0,y0,x1,y1,nom):
    n=0; tot=0; mx=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            a=pc[x,y]; b=pp[x,y]; d=max(abs(a[i]-b[i]) for i in range(3))
            tot+=1
            if d>30: n+=1
            mx=max(mx,d)
    print("   %-34s %5d/%6d pixels a |d|>30 (%.2f %%)  ecart max=%d"%(nom,n,tot,100.0*n/tot,mx))
zone(20,20,120,90,"coin haut-gauche (fleche) CN")
zone(200,300,900,2100,"corps de l'ecran  CP")
zone(150,2200,950,2360,"dock              CP")
# bbox de la fleche
seuil=30; pts=[]
for y in range(10,120):
    for x in range(10,160):
        a=pc[x,y]; b=pp[x,y]
        if max(abs(a[i]-b[i]) for i in range(3))>seuil: pts.append((x,y))
if pts:
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print("   bbox de ce qui n'existe QUE sur la planche : (%d,%d,%d,%d)  %dx%d px"
          %(min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1))

print()
print("--- les 0,88 % de pixels qui different sont-ils sur des BORDS ? ---")
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
import random
random.seed(1)
diff=[];meme=[]
for _ in range(200000):
    x=random.randrange(205,895); y=random.randrange(305,2095)
    a=pc[x,y]; b=pp[x,y]
    d=max(abs(a[i]-b[i]) for i in range(3))
    vois=[lum(pc[x+dx,y+dy]) for dx in(-2,0,2) for dy in(-2,0,2)]
    amp=max(vois)-min(vois)
    (diff if d>30 else meme).append(amp)
print("   amplitude locale (max-min sur 3x3 a pas 2) :")
print("     pixels QUI DIFFERENT  : n=%5d  amplitude moyenne = %.1f"%(len(diff),sum(diff)/max(len(diff),1)))
print("     pixels IDENTIQUES     : n=%5d  amplitude moyenne = %.1f"%(len(meme),sum(meme)/max(len(meme),1)))
