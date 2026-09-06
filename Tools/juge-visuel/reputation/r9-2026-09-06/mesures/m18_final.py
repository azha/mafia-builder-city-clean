# -*- coding: utf-8 -*-
"""m18 — (a) textes de la carte portrait, fenetres INSEREES de 8 px pour exclure le bord or
(la v1, m17, mesurait le bord et rendait la largeur de la fenetre) ;
(b) interligne : runs de lignes d'encre dans .pann small et dans une tuile ;
(c) contrastes (WCAG) des textes principaux sur leur fond mesure ;
(d) geometrie des 3 fenetres .fen ;
(e) couche globale : luminance moyenne et densite d'encre de la zone de CONTENU (le cadre).
Contrôle positif : la carte .prt = 424/425 px, le cadre = 1662 px des deux cotes (m01/m02).
"""
from PIL import Image
import os,math
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
print('(a) carte portrait, fenetres inserees')
for nom,im,xa,xb,bandes in (('REF',R,92,496,[(890,970,70,'prt i'),(1420,1480,95,'prt b')]),
                            ('CAP',C,82,487,[(680,760,70,'prt i'),(1180,1255,95,'prt b')])):
    cx=(xa+xb)/2
    for (ya,yb,s,lab) in bandes:
        for (a,b,x0,x1) in runs(im,(xa,ya,xb,yb),s):
            print('   %s %-7s y=%4d..%4d h=%2d (%.2f CSS) x=%4d..%4d w=%3d centre=%.1f (fenetre %.1f, ecart %+.1f)'
                  %(nom,lab,a,b,b-a+1,(b-a+1)/3.6,x0,x1,x1-x0+1,(x0+x1)/2,cx,(x0+x1)/2-cx))
print()
print('(b) interligne')
print('   REF .pann small :',[(a,b,b-a+1) for a,b,_,_ in runs(R,(90,1780,1015,1900),70)])
print('   CAP .pann small :',[(a,b,b-a+1) for a,b,_,_ in runs(C,(84,1585,1010,1700),70)])
print('   REF tuile2 texte:',[(a,b,b-a+1) for a,b,_,_ in runs(R,(620,1125,995,1210),70)])
print('   CAP tuile2 texte:',[(a,b,b-a+1) for a,b,_,_ in runs(C,(610,880,1000,962),70)])
print()
print('(c) contrastes (relatif WCAG)')
def L(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def ratio(a,b):
    la,lb=L(a),L(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
paires=[('titre or_vif / enseigne',(0xf2,0xc9,0x6b),(0x0d,0x16,0x22)),
        ('sous-titre creme2 / enseigne',(0xb9,0xad,0x92),(0x0d,0x16,0x22)),
        ('libelle muet / fen',(0x8a,0x97,0x9c),(0x0d,0x0d,0x16)),
        ('chiffre cyan / fen',(0x7f,0xd4,0xd9),(0x0d,0x0d,0x16)),
        ('tl b creme2 / tuile OFF',(0xb9,0xad,0x92),(0x0d,0x16,0x22)),
        ('tl small eteint / tuile OFF',(0x6b,0x73,0x7d),(0x0d,0x16,0x22)),
        ('pann small creme2 / pann',(0xb9,0xad,0x92),(0x0d,0x16,0x22)),
        ('cta or_vif / carte2',(0xf2,0xc9,0x6b),(0x16,0x16,0x1c))]
for n,a,b in paires: print('   %-30s %.2f:1'%(n,ratio(a,b)))
print()
print('(d) fenetres .fen — colonnes de bord (lisere) dans la bande des compteurs')
def colb(im,ya,yb,frac=.8):
    px=im.load();m=yb-ya+1;cc=[]
    for x in range(0,1080):
        cc.append((x,sum(1 for y in range(ya,yb) if all(abs(px[x,y][k]-(0x2a,0x36,0x48)[k])<=26 for k in range(3)))))
    out=[];i=0
    while i<len(cc):
        if cc[i][1]>=m*frac:
            a=cc[i][0]
            while i<len(cc) and cc[i][1]>=m*frac: i+=1
            out.append((a,cc[i-1][0]))
        else: i+=1
    return out
print('   REF :',colb(R,704,812)); print('   CAP :',colb(C,498,605))
print()
print('(e) couche globale sur la zone de CONTENU (cadre : REF y 434..2096, CAP y 232..1894)')
def globale(im,y0,y1,nom):
    px=im.load();s=0;n=0;enc=0
    for y in range(y0,y1,3):
        for x in range(0,1080,3):
            c=px[x,y];l=lum(c);s+=l;n+=1
            if l>=60: enc+=1
    print('   %s luminance moyenne=%.2f   densite d encre (lum>=60)=%.2f%%'%(nom,s/n,100*enc/n))
globale(R,434,2096,'REF'); globale(C,232,1894,'CAP')
