#!/usr/bin/env python3
"""Le bloc 'etat vide' : panneau + surtitre + message.
Grandeurs : bbox d'ENCRE (pas de rectangle suppose), hauteur de capitale,
couleur du remplissage du panneau, position verticale dans la zone libre.
Controle positif : la plaque du registre, presente des deux cotes, doit rendre
une bbox comparable (largeur ~981 px cote maquette) -> imprime aussi."""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def charge(p, e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB')
    print(f"  ouvert: {p} taille={im.size}")
    if e!=1.0:
        im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im

def bbox_encre(im, y0,y1, fond, seuil=20):
    px=im.load(); w,h=im.size
    xs=[];ys=[]
    for y in range(y0,min(y1,h)):
        for x in range(w):
            r,g,b=px[x,y]
            if abs(r-fond[0])+abs(g-fond[1])+abs(b-fond[2])>seuil:
                xs.append(x); ys.append(y)
    if not xs: return None
    return (min(xs),min(ys),max(xs),max(ys))

def lignes_encre(im,y0,y1,fond,seuil=20):
    """segments verticaux continus ou il y a de l'encre"""
    px=im.load(); w,h=im.size; out=[]; deb=None
    for y in range(y0,min(y1,h)):
        n=sum(1 for x in range(w) if abs(px[x,y][0]-fond[0])+abs(px[x,y][1]-fond[1])+abs(px[x,y][2]-fond[2])>seuil)
        if n>0 and deb is None: deb=y
        elif n==0 and deb is not None:
            out.append((deb,y-1,y-deb)); deb=None
    if deb is not None: out.append((deb,min(y1,h)-1,min(y1,h)-deb))
    return out

print("=== CAPTURE 2026-09-04 : segments d'encre dans la zone libre 143..2171 (fond=noir pur) ===")
cap=charge('capture-1080x2400.png')
for (a,b,n) in lignes_encre(cap,143,2171,(0,0,0)):
    bb=bbox_encre(cap,a,b+1,(0,0,0))
    print(f"   y={a}..{b} (h={n})  bbox={bb}  largeur={bb[2]-bb[0]+1}")

print("\n=== TEMOIN v4-1 x1.2 : bloc etat vide ===")
t=charge('etats/v4-1.png',1.2)
px=t.load()
# fond de la zone au-dessus du panneau (echantillon a 3px de tout bord)
print("   echantillons de fond dans le temoin :")
for (x,y) in [(30,1330),(1050,1330),(540,1345)]:
    print(f"      ({x},{y}) = {px[x,y]}")
# panneau etat vide : mesure sa bbox par difference au fond local
bb=bbox_encre(t,1330,1620,px[30,1345],seuil=14)
print(f"   bbox du bloc etat-vide (y 1330..1620, fond={px[30,1345]}) = {bb}")
print("   remplissage au centre du panneau (mediane 21x21) :")
def med(im,cx,cy,r=10):
    px=im.load(); v=[px[x,y] for x in range(cx-r,cx+r+1) for y in range(cy-r,cy+r+1)]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
print(f"      centre panneau temoin (540,1500) = {med(t,540,1500)}")
print(f"      fond hors panneau temoin (18,1500) = {med(t,18,1500)}")
print("\n   segments d'encre du temoin dans 1330..1660 :")
for (a,b,n) in lignes_encre(t,1330,1660,px[30,1345],14):
    print(f"      y={a}..{b} (h={n})")

print("\n=== plaque du registre : bbox des deux cotes (controle positif) ===")
print(f"   capture   : {bbox_encre(cap,1985,2140,(0,0,0),seuil=40)}")
print(f"   temoin    : {bbox_encre(t,1655,1830,(8,10,13),seuil=60)}")
ref=charge('reference-1080x2102.png')
print(f"   reference : {bbox_encre(ref,1655,1832,(8,10,13),seuil=60)}")
