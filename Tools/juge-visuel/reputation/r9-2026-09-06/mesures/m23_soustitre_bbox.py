# -*- coding: utf-8 -*-
"""m23 — (a) le sous-titre .enseigne i, meme instrument que les autres textes (seuil 70,
fenetre bornee par le bloc .enseigne mesure en m03) : hauteur de capitale et chasse par
caractere (les deux chaines DIFFERENT, donc on compare la hauteur et l'avance MOYENNE).
 (b) bbox EXTERIEURE du buste dans sa carte (tout ce qui n'est pas le fond de carte, dans
la bande verticale du dessin seulement — les libelles sont exclus par les bornes en y).
Contrôle positif (a) : .fen span mesure 233/234 px pour la meme chaine (m08).
Contrôle positif (b) : en REF, les deux marges doivent etre egales a quelques px pres.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def runs(im,box,seuil,minpx=3):
    px=im.load();x0,y0,x1,y1=box;out=[];cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if lum(px[x,y])>=seuil]
        if len(xs)>=minpx:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y;cur[2]=min(cur[2],min(xs));cur[3]=max(cur[3],max(xs))
        else:
            if cur: out.append(tuple(cur));cur=None
    if cur: out.append(tuple(cur))
    return out
print('(a) sous-titre .enseigne i  (seuil 70)')
print('   REF "UN LIEUTENANT NEUF N A ENCORE RIEN / ABSORBE"  (34 + 8 car.)')
for a,b,x0,x1 in runs(R,(60,575,1020,655),70): print('      y=%d..%d h=%2d (%.2fCSS) x=%d..%d w=%3d'%(a,b,b-a+1,(b-a+1)/3.6,x0,x1,x1-x0+1))
print('   CAP "PERSONNE NE VOUS A ENCORE JUGE"  (30 car.)')
for a,b,x0,x1 in runs(C,(55,370,1025,450),70): print('      y=%d..%d h=%2d (%.2fCSS) x=%d..%d w=%3d'%(a,b,b-a+1,(b-a+1)/3.6,x0,x1,x1-x0+1))
print('   avance moyenne par caractere : REF %.2f px  CAP %.2f px'%(775/33.0,691/29.0))
print()
print('(b) bbox exterieure du buste (bande du dessin seulement)')
def prox(p,q,t): return all(abs(p[k]-q[k])<=t for k in range(3))
for nom,im,fond,card,(ya,yb) in (('REF',R,(0x11,0x18,0x23),(82,505),(1020,1410)),
                                 ('CAP',C,(0x0d,0x16,0x22),(72,496),(820,1205))):
    p=im.load();xs=[]
    for y in range(ya,yb):
        for x in range(card[0]+6,card[1]-5):
            if not prox(p[x,y],fond,10): xs.append(x)
    a,b=min(xs),max(xs)
    # bord interieur de la carte : bord 1px (3,6) + padding 8 CSS (28,8) — mais on mesure le
    # bord au pixel : on prend card+4 comme premiere colonne de fond
    ig=card[0]+4; idr=card[1]-4
    print('   %s buste x=%d..%d (w=%d)  |  interieur de carte %d..%d  |  marge G=%d  marge D=%d  (asymetrie %+d px)'
          %(nom,a,b,b-a+1,ig,idr,a-ig,idr-b,(a-ig)-(idr-b)))
