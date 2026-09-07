#!/usr/bin/env python3
"""Profil de COLONNES d'encre dans la boite du jeton -> les 'vallees' vides separent
rond | b | i. Aucune fenetre choisie a l'avance : la boite entiere est balayee.
Controle positif : en REFERENCE le 1er bloc doit faire ~57 px (le rond, 16 CSS mesure au 09).
Controle negatif : les 20 px sous le bord haut de la boite ne portent AUCUNE encre."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def blocs(im,x0,x1,y0,y1,seuil,creux):
    px=im.load(); col=[]
    for x in range(x0,x1):
        col.append(sum(1 for y in range(y0,y1) if lum(px[x,y])>=seuil))
    out=[];cur=None;vide=0
    for i,c in enumerate(col):
        if c>0:
            if cur is None: cur=[i,i]
            else:
                if vide>creux and cur: out.append(cur); cur=[i,i]
                else: cur[1]=i
            vide=0
        else:
            vide+=1
    if cur: out.append(cur)
    return [(x0+a,x0+b) for a,b in out]
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)
print("\n=== blocs de colonnes dans le JETON (creux minimal 18 px) ===")
print("REF (boite x=53..1026, interieur y=650..808) :")
for a,b in blocs(ref,57,1023,650,808,70,18): print(f"   bloc x={a}..{b}  (l={b-a+1})")
print("CAP (boite x=50..1029, interieur y=442..556) :")
for a,b in blocs(cap,54,1026,442,556,70,18): print(f"   bloc x={a}..{b}  (l={b-a+1})")
print("\nCONTROLE NEGATIF : encre dans la bande y=647..660 (sous le bord haut) ")
for tag,im,y0,y1,x0,x1 in (("REF",ref,647,660,57,1023),("CAP",cap,439,452,54,1026)):
    n=sum(1 for y in range(y0,y1) for x in range(x0,x1) if lum(im.load()[x,y])>=70)
    print(f"   [{tag}] y=[{y0},{y1}) pixels clairs = {n}")
print("\n=== meme mesure sur la PLAQUE 1 (temoin: q a gauche, tenu a droite) ===")
print("REF (y=860..980) :")
for a,b in blocs(ref,57,1023,860,980,70,18): print(f"   bloc x={a}..{b} (l={b-a+1})")
print("CAP (y=624..738) :")
for a,b in blocs(cap,54,1026,624,738,70,18): print(f"   bloc x={a}..{b} (l={b-a+1})")
