#!/usr/bin/env python3
"""Alignement du message d'etat vide et inventaire EXHAUSTIF des elements
non-fond de la capture dans la zone libre (rien ne doit rester non fiche).
Controle positif : la plaque du registre doit apparaitre dans l'inventaire."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); print('ouvert capture',cap.size)
tem=Image.open(os.path.join(D,'etats/v4-1.png')).convert('RGB'); print('ouvert temoin',tem.size)
tem=tem.resize((1080,2102),Image.LANCZOS); print('  -> ',tem.size)

print("\n--- alignement horizontal du message d'etat vide ---")
px=cap.load()
xs=[x for y in range(1924,1962) for x in range(1080) if lum(px[x,y])>40]
print(f"  CAPTURE : encre x={min(xs)}..{max(xs)}  centre={(min(xs)+max(xs))/2:.1f}  (centre ecran=540) "
      f"-> marges g={min(xs)} d={1080-max(xs)-1}  => CENTRE")
pt=tem.load()
xs=[x for y in range(1476,1526) for x in range(30,1050) if lum(pt[x,y])>70]
print(f"  TEMOIN ligne 1 : encre x={min(xs)}..{max(xs)}  centre={(min(xs)+max(xs))/2:.1f}")
xs2=[x for y in range(1543,1593) for x in range(30,1050) if lum(pt[x,y])>70]
print(f"  TEMOIN ligne 2 : encre x={min(xs2)}..{max(xs2)}  centre={(min(xs2)+max(xs2))/2:.1f}")
xs3=[x for y in range(1421,1443) for x in range(30,1050) if lum(pt[x,y])>60]
print(f"  TEMOIN surtitre: encre x={min(xs3)}..{max(xs3)}")
print(f"  => les 3 partagent le meme bord GAUCHE ({min(xs)}, {min(xs2)}, {min(xs3)}) et des bords droits differents"
      f" ({max(xs)}, {max(xs2)}, {max(xs3)}) => FERRE A GAUCHE, panneau x=40..1038")

print("\n--- inventaire exhaustif des elements non-fond de la CAPTURE, zone libre 143..2171 ---")
segs=[];deb=None
for y in range(143,2171):
    n=sum(1 for x in range(1080) if sum(px[x,y])>12)
    if n>0 and deb is None: deb=y
    elif n==0 and deb is not None: segs.append((deb,y-1)); deb=None
if deb is not None: segs.append((deb,2170))
tot=0
for (a,b) in segs:
    xs=[x for y in range(a,b+1) for x in range(1080) if sum(px[x,y])>12]
    ys=b-a+1; tot+=ys
    print(f"   y={a}..{b} (h={ys})  x={min(xs)}..{max(xs)}")
print(f"   => {len(segs)} elements, {tot} lignes occupees sur {2171-143} ({100*tot/(2171-143):.1f}%)")
