#!/usr/bin/env python3
"""(a) Chrome de la CAPTURE : hauteur du bandeau (filet braise), haut du dock, gouttiere.
(b) Segment gras de .sv-dit : ou est-il, et de quelle couleur, des deux cotes ?
(c) Debordements : l'encre touche-t-elle un bord de boite / de l'ecran ?
Controle positif (a) : le filet du bandeau doit etre TROUVE (le dossier derive 52 CSS-HUD
= 143 px ; la mesure doit tomber a +-3 px).
Controle negatif (a) : le meme motif braise ne doit PAS exister dans la moitie basse."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def hx(c): return "#%02x%02x%02x"%tuple(c)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); px=cap.load()
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load()
print("CAP",cap.size,"REF",ref.size)
print("\n=== (a) CHROME de la capture ===")
def braise(p): return p[0]>70 and p[0]-p[1]>25 and p[0]-p[2]>25
hits=[y for y in range(0,1200) if sum(1 for x in range(60,300) if braise(px[x,y]))>150]
print("   filet braise du bandeau (>150 px braise sur x=60..300) :", hits)
hits2=[y for y in range(1200,2400) if sum(1 for x in range(60,300) if braise(px[x,y]))>150]
print("   CONTROLE NEGATIF meme motif y>1200 :", hits2 if hits2 else "aucun")
# dock : premiere ligne, en partant du bas, ou la couleur change durablement
for y in range(2100,2250):
    a=[px[x,y] for x in (100,300,700,1000)]
    b=[px[x,y+8] for x in (100,300,700,1000)]
    if max(abs(a[i][k]-b[i][k]) for i in range(4) for k in range(3))>=4:
        print(f"   changement de fond vers y={y} : {[hx(c) for c in a]} -> {[hx(c) for c in b]}"); break
print("   fond a y=2160 :", hx(px[300,2160]), " a y=2300 :", hx(px[300,2300]), " a y=2390 :", hx(px[300,2390]))
# ronds du dock
ys=[]
for y in range(2150,2400):
    n=sum(1 for x in range(150,1000) if lum(px[x,y])>=38)
    ys.append((y,n))
top=[y for y,n in ys if n>200]
print(f"   ronds du dock : premieres/dernieres lignes 'claires' = {top[0] if top else '-'} .. {top[-1] if top else '-'}")
print("\n=== (b) segment GRAS de .sv-dit (encre >= 230 de luminance) ===")
def gras(im,y0,y1,x0,x1,tag):
    p=im.load()
    cols=[x for x in range(x0,x1) if any(lum(p[x,y])>=225 for y in range(y0,y1))]
    if not cols: print(f"   [{tag}] AUCUN pixel >=225 -> pas de segment gras clair"); return
    runs=[];cur=[cols[0],cols[0]]
    for x in cols[1:]:
        if x-cur[1]<=25: cur[1]=x
        else: runs.append(cur); cur=[x,x]
    runs.append(cur)
    big=[r for r in runs if r[1]-r[0]>50]
    print(f"   [{tag}] segments clairs (>=225) larges : {[(a,b,b-a+1) for a,b in big]}")
gras(ref,1826,1858,45,1035,"REF sv-dit L1")
gras(cap,1894,1926,35,1045,"CAP sv-dit L1")
print("\n=== (c) DEBORDEMENTS ===")
def encre_bornes(im,y0,y1,x0,x1,seuil=70):
    p=im.load(); xs=[x for y in range(y0,y1) for x in range(x0,x1) if lum(p[x,y])>=seuil]
    return (min(xs),max(xs)) if xs else None
print("   CAP CTA : boite x=50..1029 (mesuree au 04) ; encre du contenu :",
      encre_bornes(cap,2020,2075,55,1026))
print("   CAP jeton: boite x=50..1029 ; encre du contenu :", encre_bornes(cap,445,555,55,1026))
print("   CAP plaques: boite x=50..1029 ; encre plaque1 :", encre_bornes(cap,622,740,55,1026))
print("   CAP titron : encre :", encre_bornes(cap,1225,1265,10,1070,50))
print("   CAP ecran  : encre la plus a gauche/droite dans le panneau :", encre_bornes(cap,400,2150,2,1078,50))
print("   REF ecran  : idem (bordure .tel exclue, x>=8) :", encre_bornes(ref,440,2090,8,1072,50))
