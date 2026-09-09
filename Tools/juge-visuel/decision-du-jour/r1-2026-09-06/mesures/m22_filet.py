#!/usr/bin/env python3
"""m22 - FILET SEPARATEUR de la carte, mesure CORRIGEE DE L'INCLINAISON.
m20/m21 balayaient des lignes HORIZONTALES : la carte de reference etant inclinee de 2,00 deg
(m14), un filet de 1-2 px ne reste sur une meme ligne que ~57 px sur 470 -> le controle positif
avait echoue (23,6%). Ici on suit la pente dx/dy=+0,0350 mesuree en m14.
Controle positif : le filet de la reference doit couvrir > 90% de la largeur utile une fois la
pente prise en compte. Controle negatif : la meme sonde 40 px PLUS BAS (creme nue) doit rendre ~0%.
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
PENTE = 0.0350   # dx/dy mesure en m14 -> dy/dx = 1/0.0350 ... non : x = a*y + b, donc y varie de dx/a
# le bord gauche avance de +0,035 px en x quand y avance de 1 -> une horizontale de la carte
# descend de 0,035 px en y quand x avance de 1 (rotation rigide)
def sonde_inclinee(im,x0,x1,y_ref,x_ref,label,sens,tol=4.0,demi=3):
    px=im.load(); n=0
    for x in range(x0,x1):
        y=int(round(y_ref + (x-x_ref)*PENTE))
        v=min(L(px[x,yy]) for yy in range(y-1,y+2)) if sens<0 else max(L(px[x,yy]) for yy in range(y-1,y+2))
        voisins=statistics.median([L(px[x,y-9]),L(px[x,y-8]),L(px[x,y+8]),L(px[x,y+9])])
        if (sens<0 and v<voisins-tol) or (sens>0 and v>voisins+tol): n+=1
    print(f"[{label}] sonde (y_ref={y_ref} a x_ref={x_ref}, pente {PENTE}) x={x0}..{x1} : "
          f"{n}/{x1-x0} colonnes = {n/(x1-x0)*100:.1f}%")
    return n/(x1-x0)*100

print("\n-- REFERENCE : filet sous le titre --")
best=None
for y in range(1295,1330):
    v=sonde_inclinee(ref,170,640,y,400,f'REF y={y}',-1)
    if best is None or v>best[1]: best=(y,v)
print(f"  -> MEILLEURE ligne : y={best[0]} couverture={best[1]:.1f}%")
print("\n-- CONTROLE NEGATIF : meme sonde 45 px plus bas (creme nue) --")
neg=sonde_inclinee(ref,170,640,best[0]+45,400,'REF creme nue',-1)
print(f"  CONTROLE POSITIF filet REF > 90% : {best[1]:.1f}% -> {'OK' if best[1]>90 else 'ECHEC'}")
print(f"  CONTROLE NEGATIF creme nue < 10% : {neg:.1f}% -> {'OK' if neg<10 else 'ECHEC'}")

print("\n-- CAPTURE : recherche d'un filet homologue dans toute la moitie basse de la carte --")
bestc=None
for y in range(1480,1575):
    n=0
    px=cap.load()
    for x in range(90,620):
        v=max(L(px[x,yy]) for yy in range(y-1,y+2))
        voisins=statistics.median([L(px[x,y-9]),L(px[x,y-8]),L(px[x,y+8]),L(px[x,y+9])])
        if v>voisins+4: n+=1
    if bestc is None or n>bestc[1]: bestc=(y,n)
print(f"[CAP] meilleure ligne y={bestc[0]} : {bestc[1]}/530 = {bestc[1]/530*100:.1f}%"
      f"   (NB : cette bande contient le TITRE, donc un score eleve peut etre du TEXTE)")
# discriminant : un filet est CONTINU, un texte est fragmente -> compter les segments
px=cap.load(); y=bestc[0]
seg=0; dedans=False
for x in range(90,620):
    v=max(L(px[x,yy]) for yy in range(y-1,y+2))
    voisins=statistics.median([L(px[x,y-9]),L(px[x,y-8]),L(px[x,y+8]),L(px[x,y+9])])
    on = v>voisins+4
    if on and not dedans: seg+=1
    dedans=on
print(f"[CAP] cette ligne est faite de {seg} segments -> {'un FILET (continu)' if seg<=3 else 'du TEXTE (fragmente)'}")
y=best[0]; pr=ref.load(); seg=0; dedans=False
for x in range(170,640):
    yy0=int(round(y+(x-400)*PENTE))
    v=min(L(pr[x,z]) for z in range(yy0-1,yy0+2))
    voisins=statistics.median([L(pr[x,yy0-9]),L(pr[x,yy0-8]),L(pr[x,yy0+8]),L(pr[x,yy0+9])])
    on = v<voisins-4
    if on and not dedans: seg+=1
    dedans=on
print(f"[REF] la ligne y={y} est faite de {seg} segments -> {'un FILET (continu)' if seg<=3 else 'du TEXTE (fragmente)'}")
