#!/usr/bin/env python3
"""Bloc 'etat vide' : comparaison du temoin v4-1 (panneau + surtitre + 2 lignes)
avec la capture (une ligne nue). Grandeurs : bbox du panneau, couleur de
remplissage, surtitre, hauteur de capitale des lignes, couleur du texte.
Controle positif : la plaque du registre, mesuree juste en dessous, est bien
detectee des deux cotes par le meme code (deja prouvee egale a 1/255 au 07)."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def med(im,cx,cy,r=8):
    px=im.load(); v=[px[x,y] for x in range(cx-r,cx+r+1) for y in range(cy-r,cy+r+1)]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))

cap=charge('capture-1080x2400.png'); tem=charge('etats/v4-1.png',1.2)

print("\n--- CAPTURE : ligne 'Personne au comptoir ce matin.' ---")
px=cap.load()
xs=[];ys=[]
for y in range(1900,1985):
    for x in range(1080):
        if lum(px[x,y])>40: xs.append(x);ys.append(y)
print(f"  bbox encre = ({min(xs)},{min(ys)},{max(xs)},{max(ys)})  l={max(xs)-min(xs)+1} h={max(ys)-min(ys)+1}")
# hauteur de capitale : le 'P' initial
xs2=[];ys2=[]
for y in range(1900,1985):
    for x in range(min(xs),min(xs)+34):
        if lum(px[x,y])>40: xs2.append(x);ys2.append(y)
print(f"  'P' initial : y={min(ys2)}..{max(ys2)}  hauteur de capitale = {max(ys2)-min(ys2)+1} px")
cols=[px[x,y] for y in range(1930,1955) for x in range(230,850) if lum(px[x,y])>90]
print(f"  couleur du texte (mediane des px clairs, n={len(cols)}) = "
      f"{tuple(sorted(c[i] for c in cols)[len(cols)//2] for i in range(3))}")
print(f"  fond derriere le texte (mediane 17x17 en (150,1940)) = {med(cap,150,1940)}")

print("\n--- TEMOIN : panneau etat-vide ---")
pt=tem.load()
# panneau : bleu nuit -> mesure au 06 : y=1367..1643
print(f"  remplissage du panneau (mediane, centre (540,1420)) = {med(tem,540,1420)}")
print(f"  fond hors panneau (mediane, (18,1500)) = {med(tem,18,1500)}")
# bord gauche/droit du panneau a mi-hauteur
y=1500; xs=[x for x in range(1080) if pt[x,y][2]-pt[x,y][0]>=8 and 8<=pt[x,y][2]<=70]
print(f"  panneau a y=1500 : x={xs[0]}..{xs[-1]}  l={xs[-1]-xs[0]+1}")
print("  segments d'encre CLAIRE dans le panneau (surtitre + 2 lignes) :")
segs=[];deb=None
for y in range(1370,1645):
    n=sum(1 for x in range(100,1000) if lum(pt[x,y])>70)
    if n>3 and deb is None: deb=y
    elif n<=3 and deb is not None: segs.append((deb,y-1,y-deb)); deb=None
for s in segs: print(f"     y={s[0]}..{s[1]} (h={s[2]})")
# hauteur de capitale de la 1re ligne serif : 'V' de 'Vos'
xs3=[];ys3=[]
for y in range(1476,1526):
    for x in range(110,155):
        if lum(pt[x,y])>70: xs3.append(x);ys3.append(y)
print(f"  'V' de 'Vos' : y={min(ys3)}..{max(ys3)} hauteur de capitale = {max(ys3)-min(ys3)+1} px")
cols=[pt[x,y] for y in range(1445,1495) for x in range(110,900) if lum(pt[x,y])>100]
print(f"  couleur du message (mediane, n={len(cols)}) = "
      f"{tuple(sorted(c[i] for c in cols)[len(cols)//2] for i in range(3))}")
cols=[pt[x,y] for y in range(1421,1443) for x in range(110,700) if lum(pt[x,y])>60]
print(f"  couleur du surtitre (mediane, n={len(cols)}) = "
      f"{tuple(sorted(c[i] for c in cols)[len(cols)//2] for i in range(3))}")

print("\n--- panneau etat-vide : bords reels (on exclut le liseré du cadre, x>=20) ---")
y=1500
xs=[x for x in range(20,1060) if pt[x,y][2]-pt[x,y][0]>=8 and 8<=pt[x,y][2]<=70]
print(f"  a y=1500 : x={xs[0]}..{xs[-1]} l={xs[-1]-xs[0]+1}")
ys=[y for y in range(1340,1670) if pt[560,y][2]-pt[560,y][0]>=8 and 8<=pt[560,y][2]<=70]
print(f"  a x=560  : y={ys[0]}..{ys[-1]} h={ys[-1]-ys[0]+1}")
print("\n--- position du bloc etat-vide dans la zone libre ---")
print("  temoin : bas du panneau -> haut de la plaque du registre")
print(f"     panneau bas={ys[-1]}, plaque haut=1662  -> ecart={1662-ys[-1]} px")
print("  capture : bas du texte -> haut de la plaque")
print(f"     texte bas=1961, plaque haut=1992 -> ecart={1992-1961} px")
