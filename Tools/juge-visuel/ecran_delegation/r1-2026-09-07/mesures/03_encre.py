#!/usr/bin/env python3
"""Bbox d'ENCRE dans une fenetre: pixels dont la luminance s'ecarte du fond local de > seuil.
Sert a mesurer hauteurs de capitale, largeurs de texte, et boites reelles (pas supposees).
Controle positif : sur la REFERENCE, la hauteur de capitale du h3 (.sv-tete h3, 12px CSS
DejaVu Serif -> cap ~0,729*12*3,6 = 31,5 px) doit tomber a +-2 px.
Controle negatif : une fenetre VIDE (fond du panneau) doit rendre bbox=None."""
from PIL import Image
import sys
D = "/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def bbox(im, x0,y0,x1,y1, seuil=18, fond=None):
    px=im.load()
    if fond is None:
        # fond = mediane de la fenetre
        vals=sorted(lum(px[x,y]) for y in range(y0,y1,3) for x in range(x0,x1,3))
        fond=vals[len(vals)//2]
    bx0=by0=10**9; bx1=by1=-1; n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if abs(lum(px[x,y])-fond)>seuil:
                n+=1
                if x<bx0:bx0=x
                if x>bx1:bx1=x
                if y<by0:by0=y
                if y>by1:by1=y
    if bx1<0: return None,fond,0
    return (bx0,by0,bx1,by1),fond,n

def go(path,tag,zones):
    im=Image.open(path).convert("RGB")
    print(f"[{tag}] {path.split('/')[-1]} {im.size[0]}x{im.size[1]}")
    for nom,(x0,y0,x1,y1),s in zones:
        b,f,n=bbox(im,x0,y0,x1,y1,s)
        if b is None:
            print(f"   {nom:34s} VIDE (fond lum={f:.1f})")
        else:
            print(f"   {nom:34s} bbox=({b[0]},{b[1]})-({b[2]},{b[3]})  l={b[2]-b[0]+1:4d} h={b[3]-b[1]+1:4d}  n={n:6d} fond_lum={f:.1f}")

REF=[("h3 titre (cap)",(50,450,1030,540),25),
     ("p sous-titre",(50,540,1030,600),18),
     ("jeton: bloc entier",(60,650,1020,810),12),
     ("jeton: rond",(60,650,200,810),12),
     ("jeton: b (gras or)",(150,650,520,810),12),
     ("jeton: i (droite)",(540,650,1020,810),12),
     ("plaque1: cro",(80,860,130,980),12),
     ("plaque1: q b 'Les tournees'",(150,860,700,915),18),
     ("plaque1: q i",(150,915,700,975),12),
     ("plaque1: tenu b 'vous'",(700,860,1020,915),18),
     ("plaque1: tenu i",(700,915,1020,975),12),
     ("sv-dit (2 lignes)",(50,1795,1030,1925),18),
     ("CTA libelle",(60,1950,700,2030),18),
     ("CTA small",(700,1950,1025,2030),12),
     ("ZONE VIDE (controle neg)",(400,1500,700,1700),18),
     ]
CAP=[("h3 titre (cap)",(50,250,1030,340),25),
     ("p sous-titre",(50,340,1030,392),18),
     ("ornement ?",(400,180,700,270),12),
     ("jeton: bloc entier",(60,440,1020,558),12),
     ("jeton: rond",(60,440,200,558),12),
     ("jeton: b (gras or)",(130,440,560,558),12),
     ("jeton: i (droite)",(560,440,1020,558),12),
     ("plaque1: cro",(80,625,130,740),12),
     ("plaque1: q b 'Les tournees'",(120,625,700,680),18),
     ("plaque1: q i",(120,680,700,740),12),
     ("plaque1: tenu b 'vous'",(700,625,1020,680),18),
     ("plaque1: tenu i",(700,680,1020,740),12),
     ("titron EN TROP",(30,1200,1050,1290),12),
     ("sv-dit (2 lignes)",(30,1860,1050,1985),18),
     ("CTA libelle",(50,2005,700,2090),18),
     ("CTA small",(650,2005,1030,2090),12),
     ("ZONE VIDE (controle neg)",(400,1400,700,1600),18),
     ]
go(D+"reference-1080x2102.png","REF",REF)
print()
go(D+"capture-1080x2400.png","CAP",CAP)
