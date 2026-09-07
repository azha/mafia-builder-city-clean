#!/usr/bin/env python3
"""3e version des sondes de chrome. Les deux precedentes (18, 19) ont ete REFUTEES par leurs
propres controles : 18 mesurait le soulignement de la valeur ARGENT en croyant tenir le filet
du bandeau, puis le filet en croyant tenir l'anneau ; 19 exigeait 80 % de couverture alors que
le MEDAILLON coupe le filet sur ~27 % de la largeur. Ici on IMPRIME la couverture au lieu de la
seuiller, et on cherche le maximum.
Controle positif : la couleur du filet doit valoir --braise (224,102,74) a la capture (etat
BRULANT declare par le medaillon) et un LAITON au canon (etat calme 37 %) -> ecart R-G > 40.
Controle negatif : la meme sonde 400 px plus bas ne doit trouver aucun filet (couverture < 20 %)."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def hx(c): return "#%02x%02x%02x"%tuple(c)
can=Image.open(D+"hud-canon-1176.png").convert("RGB"); pc=can.load()
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pk=cap.load()
SC,SK=3.0,1080/392.0
print("CANON",can.size,"  CAPTURE",cap.size)
print(f"CONTROLE POSITIF largeur : {can.size[0]/SC:.1f} / {cap.size[0]/SK:.1f} CSS-HUD (392 attendu)")
def meilleur_filet(px,W,y0,y1,tag):
    best=(0,None,None)
    xs=list(range(20,W-20,3))
    for y in range(y0,y1):
        cs=[px[x,y] for x in xs if px[x,y][0]>140 and px[x,y][0]-px[x,y][2]>60]
        if len(cs)>best[0]:
            m=tuple(sorted(c[i] for c in cs)[len(cs)//2] for i in range(3))
            best=(len(cs),y,m)
    if best[2] is None:
        print(f"   [{tag}] couverture=0 % — AUCUN pixel laiton/braise dans la bande")
        return (0,None,None)
    print(f"   [{tag}] y={best[1]}  couverture={100*best[0]/len(xs):.0f} %  couleur={hx(best[2])} {best[2]}")
    return best
print("\n=== filet du bandeau (max de couverture teintee) ===")
a=meilleur_filet(pc,1176,110,260,"CANON  ")
b=meilleur_filet(pk,1080,110,260,"CAPTURE")
print(f"   bandeau : canon {a[1]/SC:.1f} CSS-HUD   capture {b[1]/SK:.1f} CSS-HUD   ecart={b[1]/SK-a[1]/SC:+.1f} CSS")
print(f"   CONTROLE POSITIF etat : R-G canon={a[2][0]-a[2][1]} vs capture={b[2][0]-b[2][1]} -> ecart={abs((b[2][0]-b[2][1])-(a[2][0]-a[2][1]))} (>40 exige)")
print(f"   capture vs --braise (224,102,74) : d={max(abs(b[2][i]-(224,102,74)[i]) for i in range(3))}")
print("   CONTROLE NEGATIF (400 px plus bas, couverture attendue < 20 %) :")
meilleur_filet(pc,1176,560,660,"CANON  ")
meilleur_filet(pk,1080,560,660,"CAPTURE")
print("\n=== libelles du dock ===")
def libelles(px,W,y0,y1,seuil,tag):
    prof=[sum(1 for y in range(y0,y1) if lum(px[x,y])>=seuil) for x in range(W)]
    out=[];cur=None;vide=0
    for x,v in enumerate(prof):
        if v>0:
            if cur is None: cur=[x,x]
            elif vide>26: out.append(tuple(cur)); cur=[x,x]
            else: cur[1]=x
            vide=0
        else: vide+=1
    if cur: out.append(tuple(cur))
    out=[t for t in out if t[1]-t[0]>25]
    print(f"   [{tag}] {len(out)} bloc(s) : {[(x0,x1,x1-x0+1) for x0,x1 in out]}")
    return out
la=libelles(pc,1176,2010,2060,110,"CANON   y=2010..2060")
lb=libelles(pk,1080,2320,2360,110,"CAPTURE y=2320..2360")
if len(la)==4 and len(lb)==4:
    ca=[(x0+x1)/2 for x0,x1 in la]; cb=[(x0+x1)/2 for x0,x1 in lb]
    print(f"   pas : canon {[round((ca[i+1]-ca[i])/SC,1) for i in range(3)]} CSS-HUD | capture {[round((cb[i+1]-cb[i])/SK,1) for i in range(3)]} CSS-HUD")
    print(f"   centre du groupe : canon {100*sum(ca)/4/1176:.2f} % | capture {100*sum(cb)/4/1080:.2f} % de la largeur")
    print(f"   1er libelle (bord gauche) : canon {100*la[0][0]/1176:.2f} % | capture {100*lb[0][0]/1080:.2f} %")
print("   CONTROLE NEGATIF (400 px plus haut) :")
libelles(pc,1176,1610,1660,110,"CANON  ")
libelles(pk,1080,1920,1970,110,"CAPTURE")

# NOTE : une sonde de la JAUGE sous la valeur ARGENT a ete ecrite puis RETIREE : sa plage
# (x jusqu'a W/2) fusionne la barre avec l'anneau du medaillon, elle rendait 100 % de
# remplissage des deux cotes alors que le canon montre une barre a moitie grise. Grandeur
# NON MESUREE plutot qu'un chiffre faux.

# NOTE : une sonde du DEBORD du medaillon sous le filet a aussi ete ecrite puis RETIREE.
# Elle rendait 74,3 CSS-HUD au canon et 31,9 a la capture : au canon les FENETRES ECLAIREES
# de l'art de district passent le critere de teinte chaude (faux positifs jusqu'a y=377), et
# a la capture le dernier hit est le LOSANGE d'or, pas l'anneau. Deux contaminations
# differentes -> grandeur NON MESUREE. Ce qui EST mesurable et suffit (script 03) : l'encre de
# chrome de la capture s'arrete a y=231 (bbox du losange 478..601 x 180..231) et la capitale du
# titre commence a y=277, soit 46 px plus bas -- exactement les 46 px de la reference.
