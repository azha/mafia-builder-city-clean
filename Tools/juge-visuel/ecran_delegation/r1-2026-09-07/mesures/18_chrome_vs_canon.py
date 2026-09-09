#!/usr/bin/env python3
"""Le CHROME (bandeau + dock) de la capture contre le CANON HUD hud-canon-1176.png.
Le canon fait 1176 px = 392 CSS-HUD (x3) ; la capture 1080 px = 392 CSS-HUD (x2,755).
=> toute grandeur est ramenee en CSS-HUD : canon/3 et capture/2,755.
Controle positif : la LARGEUR des deux images doit valoir 392 CSS-HUD apres division.
Controle negatif : le canon est l'etat CALME (37 %), la capture est BRULANT -> le filet du
bandeau doit etre LAITON au canon et BRAISE a la capture (doctrine .tel.chaud) : les deux
sondes de couleur doivent donc DIFFERER, sinon l'une des deux ne mesure pas le filet.
!! Le canon porte des pastilles d'annotation numerotees (1..6) qui ne font PAS partie du HUD :
   aucune mesure ne doit tomber dessus (elles sont a y>=180 et hors des bandes mesurees)."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def hx(c): return "#%02x%02x%02x"%tuple(c)
def bande(px,y,x0,x1):
    vs=[px[x,y] for x in range(x0,x1)]
    vs.sort(key=lum); return vs[len(vs)//2]
can=Image.open(D+"hud-canon-1176.png").convert("RGB"); pc=can.load()
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pk=cap.load()
print("CANON",can.size,"(x3, 392 CSS-HUD)   CAPTURE",cap.size,"(x2,755, 392 CSS-HUD)")
SC, SK = 3.0, 1080/392.0
print(f"CONTROLE POSITIF largeur : canon {can.size[0]/SC:.1f} CSS-HUD  capture {cap.size[0]/SK:.1f} CSS-HUD  (392 attendu)")

def filet(px,y0,y1,x0,x1,tag):
    """1re ligne, de haut en bas, nettement plus claire que ses voisines sur toute la largeur"""
    best=None
    for y in range(y0,y1):
        c=bande(px,y,x0,x1); l=lum(c)
        a=lum(bande(px,y-4,x0,x1)); b=lum(bande(px,y+4,x0,x1))
        if l-max(a,b)>12 and (best is None or l>best[1]):
            best=(y,l,c)
    print(f"   [{tag}] filet du bandeau : y={best[0]}  couleur={hx(best[2])} {best[2]}  lum={best[1]:.1f}" if best else f"   [{tag}] aucun filet")
    return best
print("\n=== BANDEAU : filet bas ===")
a=filet(pc,80,260,60,300,"CANON")
b=filet(pk,80,260,60,300,"CAPTURE")
print(f"   hauteur du bandeau : canon {a[0]}/3 = {a[0]/SC:.1f} CSS-HUD   capture {b[0]}/2,755 = {b[0]/SK:.1f} CSS-HUD   ecart={b[0]/SK-a[0]/SC:+.1f} CSS")
print(f"   CONTROLE NEGATIF (etat) : les deux couleurs de filet doivent DIFFERER -> ecart={max(abs(a[2][i]-b[2][i]) for i in range(3))} (laiton calme vs braise)")

def medaillon(px,y0,y1,seuil,tag,W):
    """diametre horizontal de l'anneau du medaillon sur sa ligne la plus large"""
    best=(0,None)
    for y in range(y0,y1):
        xs=[x for x in range(W//2-260,W//2+260) if lum(px[x,y])>=seuil]
        if xs and xs[-1]-xs[0]+1>best[0]: best=(xs[-1]-xs[0]+1,(y,xs[0],xs[-1]))
    print(f"   [{tag}] anneau : y={best[1][0]} x={best[1][1]}..{best[1][2]}  diametre={best[0]} px")
    return best
print("\n=== MEDAILLON (anneau) ===")
a=medaillon(pc,30,220,95,"CANON",1176)
b=medaillon(pk,20,200,80,"CAPTURE",1080)
print(f"   diametre : canon {a[0]/SC:.1f} CSS-HUD   capture {b[0]/SK:.1f} CSS-HUD   ecart={b[0]/SK-a[0]/SC:+.1f} CSS ({100*(b[0]/SK)/(a[0]/SC)-100:+.1f} %)")
cxa=(a[1][1]+a[1][2])/2; cxb=(b[1][1]+b[1][2])/2
print(f"   centre horizontal : canon {cxa:.1f} (= {100*cxa/1176:.2f} % de la largeur)  capture {cxb:.1f} (= {100*cxb/1080:.2f} %)")

print("\n=== DOCK ===")
def dock_top(px,H,W,tag):
    for y in range(H-600,H-40):
        a=bande(px,y,60,W-60); b=bande(px,y+10,60,W-60)
        if max(abs(a[i]-b[i]) for i in range(3))>=4:
            print(f"   [{tag}] changement de fond vers y={y} : {hx(a)} -> {hx(b)}   (= {y} px du haut, {(H-y)} px du bas)")
            return y
    print(f"   [{tag}] aucun changement net"); return None
ya=dock_top(pc,2091,1176,"CANON"); yb=dock_top(pk,2400,1080,"CAPTURE")
if ya and yb:
    print(f"   hauteur du dock : canon {(2091-ya)/SC:.1f} CSS-HUD   capture {(2400-yb)/SK:.1f} CSS-HUD   ecart={(2400-yb)/SK-(2091-ya)/SC:+.1f} CSS")
def ronds(px,y0,y1,W,seuil,tag):
    prof=[]
    for x in range(0,W):
        prof.append(sum(1 for y in range(y0,y1) if lum(px[x,y])>=seuil))
    out=[];cur=None
    for x,v in enumerate(prof):
        if v>0:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur and cur[1]-cur[0]>20: out.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>20: out.append(tuple(cur))
    print(f"   [{tag}] blocs des ronds x = {[(a,b,b-a+1) for a,b in out]}")
    return out
print("   (les ronds sont tres sombres : seuil bas)")
ronds(pc,1800,1920,1176,30,"CANON")
ronds(pk,2170,2330,1080,26,"CAPTURE")
