"""m31 — ADDENDUM (v3) : le meme releve sur la REFERENCE, comme TEMOIN de l'instrument.
Si la reference (rendu navigateur) montre le meme groupement des parties fractionnaires,
c'est la SONDE qui les fabrique, pas le rendu du client.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def bord(im,x0,x1,yc,demi=10):
    p=im.load()
    prof=[(y, sum(lum(p[x,y]) for x in range(x0,x1+1))/(x1-x0+1)) for y in range(yc-demi,yc+demi+1)]
    v=[q for _,q in prof]; pic=max(v); i=v.index(pic); f=percentile(v,10)
    return (mi_alpha(prof,i,-1,fond=f,pic=pic), mi_alpha(prof,i,+1,fond=f,pic=pic))
def bordx(im,y0,y1,xc,demi=10):
    p=im.load()
    prof=[(x, sum(lum(p[x,y]) for y in range(y0,y1+1))/(y1-y0+1)) for x in range(xc-demi,xc+demi+1)]
    v=[q for _,q in prof]; pic=max(v); i=v.index(pic); f=percentile(v,10)
    return (mi_alpha(prof,i,-1,fond=f,pic=pic), mi_alpha(prof,i,+1,fond=f,pic=pic))
im=ouvrir('reference-1080x2102.png')
H=[("filet haut du cadre",(200,900),453),("bord haut panneau titre",(200,900),485),
   ("filet or sous l'enseigne",(200,900),666),("compteurs haut",(100,300),705),
   ("compteurs bas",(100,300),816),("elast. haut",(600,1000),851),
   ("carte haut",(150,450),878),("tuile1 haut",(560,940),1003),("tuile3 haut",(560,940),1234),
   ("tuile4 haut",(560,940),1349),("tuile4 bas",(560,940),1447),("elast. bas",(600,1000),1614),
   ("carte bas",(150,450),1531),("pann. bas haut",(200,900),1650),("pann. bas bas",(200,900),1920),
   ("CTA haut",(200,900),1955),("CTA bas",(200,900),2047),("filet bas du cadre",(200,900),2076)]
vals=[]
for lab,(x0,x1),yc in H:
    a,b=bord(im,x0,x1,yc); c=(a+b)/2; vals.append(c)
    print(f"    {lab:26s} ext={a:8.3f} int={b:8.3f} centre={c:8.3f} frac={c%1:.3f}")
pr=[v for v in vals if min(v%1,1-(v%1))<0.05 or abs((v%1)-0.5)<0.05]
print(f"  REFERENCE : {len(pr)}/{len(vals)} bords a moins de 0,05 px d'un entier ou d'un demi")
V=[("rail gauche cadre",(600,1900),22),("rail droit cadre",(600,1900),1057),
   ("rail gauche carte",(1000,1500),83),("rail droit carte",(1000,1500),504),
   ("boite1 gauche",(740,810),51),("boite1 droite",(740,810),360),
   ("boite2 gauche",(740,810),385),("boite3 gauche",(740,810),719),("boite3 droite",(740,810),1028)]
vx=[]
for lab,(y0,y1),xc in V:
    a,b=bordx(im,y0,y1,xc); c=(a+b)/2; vx.append(c)
    print(f"    {lab:26s} ext={a:8.3f} int={b:8.3f} centre={c:8.3f} frac={c%1:.3f}")
print("  pitch des boites (REF) :", round(vx[6]-vx[4],3), round(vx[7]-vx[6],3), " | (largeur boite1)", round(vx[5]-vx[4],3))
