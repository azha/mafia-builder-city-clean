#!/usr/bin/env python3
"""10 - Decoupage de l'ECRAN en 5 bandes aux frontieres MESUREES, composition et
luminance de chacune ; largeur d'eau nue par ligne ; controle 'somme = total'."""
from PIL import Image, ImageFilter, ImageChops
import os
D=os.path.dirname(__file__)
im=Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H=im.size; p=im.load(); print("taille source : %d x %d = %d px"%(W,H,W*H))
Y0,Y1,B=142,1684,24
L=im.convert('L')
amp=ImageChops.subtract(L.filter(ImageFilter.MaxFilter(9)),L.filter(ImageFilter.MinFilter(9))); pa=amp.load()
def is_eau(c): return (c[1]-c[0])>=30 and (c[2]-c[0])>=45
def overlay(x,y): return (228<=y<=266) or ((x-540)**2+(y-97)**2<=92*92) or (abs(x-540)<12 and 214<=y<=232)
bat=set()
for by in range(Y0,Y1,B):
    for bx in range(0,W,B):
        n=h=e=0
        for x in range(bx,min(bx+B,W)):
            for y in range(by,min(by+B,Y1)):
                n+=1
                if pa[x,y]>=12: h+=1
                if is_eau(p[x,y]): e+=1
        if n and e/n<0.5 and h/n>=0.60: bat.add((bx,by))
def isbat(x,y): return ((x//B)*B,((y-Y0)//B)*B+Y0) in bat

print("\n== 1. OU COMMENCE ET FINIT LA VILLE (part batie par ligne, hors eau/overlay) ==")
def frac_row(y):
    n=b=0
    for x in range(0,W,2):
        if overlay(x,y) or is_eau(p[x,y]): continue
        n+=1
        if isbat(x,y): b+=1
    return b/n if n else 0.0
deb=fin=None
for y in range(Y0,Y1):
    f=frac_row(y)
    if deb is None and f>=0.30: deb=y
for y in range(Y1-1,Y0,-1):
    if frac_row(y)>=0.30: fin=y; break
print("  premiere ligne a >=30%% de bati : y=%d" % deb)
print("  derniere ligne a >=30%% de bati : y=%d" % fin)

BANDES=[("bandeau (chrome)",0,142),("plan vide du haut",142,deb),
        ("bande batie (la ville)",deb,fin+1),("eau nue",fin+1,Y1),("dock (chrome)",Y1,H)]
print("\n== 2. LES 5 BANDES DE L'ECRAN ==")
tot=0
for nom,a,b_ in BANDES:
    px=W*(b_-a); tot+=px
    print("  %-24s y %4d-%4d  %4d px de haut  %6.2f%% de l'ecran" % (nom,a,b_-1,b_-a,100*px/(W*H)))
print("  CONTROLE somme = total : %d px vs %d px -> %s" % (tot,W*H,"OK" if tot==W*H else "ECHEC"))

print("\n== 3. COMPOSITION ET LUMINANCE DE CHAQUE BANDE ==")
for nom,a,b_ in BANDES:
    n=0; c={'bati':0,'sol_nu':0,'eau':0,'overlay':0,'chrome':0}; s=0.0; chaud=0
    for y in range(a,b_):
        for x in range(0,W,2):
            n+=1; r,g,bb=p[x,y]; s+=0.2126*r+0.7152*g+0.0722*bb
            if r-bb>=8: chaud+=1
            if y<Y0 or y>=Y1: c['chrome']+=1
            elif overlay(x,y): c['overlay']+=1
            elif is_eau((r,g,bb)): c['eau']+=1
            elif isbat(x,y): c['bati']+=1
            else: c['sol_nu']+=1
    print("  %-24s L_moy=%6.1f  chauds=%5.2f%%  | %s" % (nom,s/n,100*chaud/n,
          "  ".join("%s=%4.1f%%"%(k,100*v/n) for k,v in c.items() if v)))

print("\n== 4. L'EAU : largeur d'eau NUE par ligne (part de la largeur d'ecran) ==")
for y in range(1400,Y1,20):
    w=sum(1 for x in range(W) if is_eau(p[x,y]))
    print("  y=%4d  eau sur %4d/%d px = %5.1f%% de la largeur  %s" % (y,w,W,100*w/W,'~'*int(60*w/W)))
tot_eau=sum(1 for y in range(Y0,Y1) for x in range(0,W,2) if is_eau(p[x,y]))*2
print("  aire d'eau totale dans la scene : %d px = %.1f%% de l'ecran" % (tot_eau,100*tot_eau/(W*H)))

print("\n== 5. CONTRASTE ENTRE LE VIDE DU HAUT ET LA VILLE ==")
def moy(a,b_):
    s=0;n=0
    for y in range(a,b_):
        for x in range(0,W,2):
            if overlay(x,y): continue
            r,g,bb=p[x,y]; s+=0.2126*r+0.7152*g+0.0722*bb; n+=1
    return s/n
mv=moy(142,deb); mb=moy(deb,fin+1); me=moy(fin+1,Y1)
print("  plan vide du haut : L=%.1f" % mv)
print("  bande batie       : L=%.1f" % mb)
print("  eau nue           : L=%.1f" % me)
print("  la ville est %.2fx plus lumineuse que le plan vide du haut" % (mb/mv))
