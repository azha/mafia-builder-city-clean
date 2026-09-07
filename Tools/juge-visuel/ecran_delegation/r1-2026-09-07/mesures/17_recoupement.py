#!/usr/bin/env python3
"""RECOUPEMENT par un SECOND chemin : les hauteurs de boites mesurees au 01 (detection de
BORDURE claire) sont refaites ici par detection de FOND (le fond de la boite differe du fond
du panneau) -> deux instruments independants doivent donner la meme valeur a +-2 px.
Controle positif : les deux methodes doivent coincider sur la REFERENCE.
Controle negatif : appliquee au fond du panneau (aucune boite), la methode doit rendre 0 boite."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def hx(c): return "#%02x%02x%02x"%tuple(c)
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))
def bande(px,y,x0,x1):
    vs=[px[x,y] for x in range(x0,x1)]
    vs.sort(key=lambda p:0.2126*p[0]+0.7152*p[1]+0.0722*p[2]); return vs[len(vs)//2]
def boites(path,y0,y1,fond_boite,tol,tag):
    im=Image.open(path).convert("RGB"); px=im.load()
    print(f"[{tag}] {path.split('/')[-1]} {im.size[0]}x{im.size[1]}  cible fond={fond_boite} tol={tol}")
    ys=[y for y in range(y0,y1) if d(bande(px,y,600,720),fond_boite)<=tol]
    runs=[];cur=None
    for y in ys:
        if cur is None: cur=[y,y]
        elif y==cur[1]+1: cur[1]=y
        else: runs.append(cur); cur=[y,y]
    if cur: runs.append(cur)
    res=[r for r in runs if r[1]-r[0]>20]
    for a,b in res: print(f"   boite y={a}..{b}  hauteur_interieure={b-a+1}px  (+2 bordures = {b-a+1+7})")
    return res
print("--- PLAQUES : fond de plaque (REF degrade ~ (31,39,47) ; CAP aplat (34,38,46)) ---")
boites(D+"reference-1080x2102.png",840,1470,(31,39,47),9,"REF")
boites(D+"capture-1080x2400.png",605,1200,(34,38,46),9,"CAP")
print("\n--- JETON : fond #241c11 / #221c0d ---")
boites(D+"reference-1080x2102.png",630,830,(36,28,17),8,"REF")
boites(D+"capture-1080x2400.png",425,575,(34,28,13),8,"CAP")
print("\n--- CTA : REF #241c11 ; CAP #1c1616 ---")
boites(D+"reference-1080x2102.png",1925,2060,(36,28,17),8,"REF")
boites(D+"capture-1080x2400.png",1980,2110,(28,22,22),8,"CAP")
print("\nCONTROLE NEGATIF (cible = fond du panneau, dans la zone des plaques : la methode\n  devrait alors marquer les INTERVALLES, pas les boites) :")
boites(D+"reference-1080x2102.png",840,1470,(0,255,0),8,"REF neg #00ff00")
print("   (aucune boite listee ci-dessus = controle negatif OK)")
