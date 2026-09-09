#!/usr/bin/env python3
"""CORRECTIF du 18 : ses deux premieres sondes ont mesure AUTRE CHOSE que ce qu'elles
nommaient, et c'est son CONTROLE NEGATIF qui l'a dit (les deux 'filets' rendaient la meme
couleur d'or alors que l'un devait etre braise) -> elles avaient trouve le SOULIGNEMENT de
la valeur ARGENT, puis le filet pleine largeur au lieu de l'anneau du medaillon.
Ici : (a) filet du bandeau = 1re ligne CLAIRE sur >=80 % de la largeur ; (b) medaillon detecte
SOUS ce filet ; (c) dock repere par ses LIBELLES (texte clair), jamais par le fond.
Controle positif (a) : la couleur du filet doit etre LAITON au canon (etat calme) et BRAISE
a la capture (etat brulant) -> les deux DOIVENT differer de >40 sur R-G.
Controle negatif (c) : le meme detecteur de libelles applique 300 px plus haut doit rendre
un nombre de blocs DIFFERENT de 4."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def hx(c): return "#%02x%02x%02x"%tuple(c)
can=Image.open(D+"hud-canon-1176.png").convert("RGB"); pc=can.load()
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pk=cap.load()
SC,SK=3.0,1080/392.0
print("CANON",can.size,"  CAPTURE",cap.size)
print(f"CONTROLE POSITIF largeur : {can.size[0]/SC:.1f} / {cap.size[0]/SK:.1f} CSS-HUD (392 attendu)")

print("\n=== (a) filet PLEINE LARGEUR sous le bandeau (>=80 % de la largeur nettement clair) ===")
# le filet est un TRAIT COLORE (laiton calme / braise chaud) : on le detecte par la TEINTE,
# pas par la clarte locale -- au canon il court sur de l'art dont certaines zones sont claires.
def filet_pleine_largeur(px,W,y0,y1,tag):
    for y in range(y0,y1):
        n=0;cs=[]
        for x in range(20,W-20,3):
            c=px[x,y]
            if c[0]>140 and c[0]-c[2]>60: n+=1; cs.append(c)
        if n>=0.80*len(range(20,W-20,3)):
            m=tuple(sorted(c[i] for c in cs)[len(cs)//2] for i in range(3))
            print(f"   [{tag}] y={y}  couleur mediane={hx(m)} {m}  couverture={100*n/len(range(20,W-20,3)):.0f} %")
            return y,m
    print(f"   [{tag}] aucun filet pleine largeur"); return None
a=filet_pleine_largeur(pc,1176,100,300,"CANON")
b=filet_pleine_largeur(pk,1080,100,300,"CAPTURE")
if a and b:
    print(f"   hauteur du bandeau : canon {a[0]/SC:.1f} CSS-HUD   capture {b[0]/SK:.1f} CSS-HUD   ecart={b[0]/SK-a[0]/SC:+.1f} CSS")
    ra=a[1][0]-a[1][1]; rb=b[1][0]-b[1][1]
    print(f"   CONTROLE POSITIF etat : R-G canon={ra} (laiton) vs capture={rb} (braise) -> ecart={abs(rb-ra)} (>40 exige)")

print("\n=== (b) medaillon : anneau detecte SOUS le filet ===")
def anneau(px,W,y0,y1,seuil,tag):
    best=(0,None)
    for y in range(y0,y1):
        xs=[x for x in range(W//2-200,W//2+200) if lum(px[x,y])>=seuil]
        if xs:
            l=xs[-1]-xs[0]+1
            if l>best[0]: best=(l,(y,xs[0],xs[-1]))
    print(f"   [{tag}] largeur max sous le filet : y={best[1][0]} x={best[1][1]}..{best[1][2]} -> {best[0]} px")
    return best
ya=anneau(pc,1176,a[0]+6,a[0]+120,95,"CANON") if a else None
yb=anneau(pk,1080,b[0]+6,b[0]+120,80,"CAPTURE") if b else None
if ya and yb:
    print(f"   diametre apparent : canon {ya[0]/SC:.1f} CSS-HUD   capture {yb[0]/SK:.1f} CSS-HUD   ecart={100*(yb[0]/SK)/(ya[0]/SC)-100:+.1f} %")
    print(f"   centre : canon {100*(ya[1][1]+ya[1][2])/2/1176:.2f} % de la largeur   capture {100*(yb[1][1]+yb[1][2])/2/1080:.2f} %")

print("\n=== (c) dock : les 4 LIBELLES (texte clair) ===")
def libelles(px,W,y0,y1,seuil,tag):
    prof=[sum(1 for y in range(y0,y1) if lum(px[x,y])>=seuil) for x in range(W)]
    out=[];cur=None;vide=0
    for x,v in enumerate(prof):
        if v>0:
            if cur is None: cur=[x,x]
            else:
                if vide>26: out.append(tuple(cur)); cur=[x,x]
                else: cur[1]=x
            vide=0
        else: vide+=1
    if cur: out.append(tuple(cur))
    out=[t for t in out if t[1]-t[0]>25]
    print(f"   [{tag}] {len(out)} bloc(s) : {[(x0,x1,x1-x0+1) for x0,x1 in out]}")
    return out
la=libelles(pc,1176,1955,1995,110,"CANON  y=1955..1995")
lb=libelles(pk,1080,2320,2360,110,"CAPTURE y=2320..2360")
if len(la)==4 and len(lb)==4:
    ca=[(x0+x1)/2 for x0,x1 in la]; cb=[(x0+x1)/2 for x0,x1 in lb]
    print(f"   pas des libelles : canon {[round((ca[i+1]-ca[i])/SC,1) for i in range(3)]} CSS-HUD")
    print(f"                      capture {[round((cb[i+1]-cb[i])/SK,1) for i in range(3)]} CSS-HUD")
    print(f"   centre du groupe : canon {100*sum(ca)/4/1176:.2f} %   capture {100*sum(cb)/4/1080:.2f} % de la largeur")
print("   CONTROLE NEGATIF (meme detecteur 300 px plus haut, doit rendre != 4 blocs) :")
libelles(pc,1176,1655,1695,110,"CANON  -300")
libelles(pk,1080,2020,2060,110,"CAPTURE -300")
