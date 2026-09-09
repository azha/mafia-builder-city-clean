#!/usr/bin/env python3
"""Reprise des hauteurs de capitale avec des bandes LARGES (pour ne pas rogner
l'encre) : on cherche les BANDES DE LIGNE (rangees d'encre contigues) dans une
fenetre, puis on donne la hauteur de chacune.
Controle : la 1re bande de la reference (titre) doit valoir ~45 px, deja mesuree."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def lignes(f,x0,x1,y0,y1,nom,seuil=70,minpx=3):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>seuil)
        rows.append((y,n))
    grp,prev=[],False
    for y,n in rows:
        a=n>=minpx
        if a and not prev: grp.append([y,y])
        elif a: grp[-1][1]=y
        prev=a
    print(f"  [{f[:26]:26s} {W}x{H}] {nom}  fenetre x{x0}..{x1} y{y0}..{y1}")
    for a,b in grp:
        print(f"      bande y={a}..{b}  h={b-a+1:3d}px = {(b-a+1)/3.6:5.2f} CSS")
    return grp

print("=== REFERENCE : enseigne ===")
lignes('reference-1080x2102.png',300,780,470,650,'enseigne (titre + sous-titre)')
print("=== CAPTURE : enseigne ===")
lignes('capture-1080x2400.png',300,780,260,460,'enseigne (titre + sous-titre)')
print()
print("=== REFERENCE : compteur gauche ===")
lignes('reference-1080x2102.png',140,270,670,800,'fen 01 / A LA UNE')
print("=== CAPTURE : compteur gauche ===")
lignes('capture-1080x2400.png',120,280,480,645,'fen 20 / A LA UNE')
print()
print("=== REFERENCE : hero .une ===")
lignes('reference-1080x2102.png',110,950,850,1190,'une : manchette/h5/cle/chip')
print("=== CAPTURE : carte 1 ===")
lignes('capture-1080x2400.png',70,1010,670,890,'carte 1 : outlet/headline/district')
print()
print("=== CAPTURE : panneau explicatif ===")
lignes('capture-1080x2400.png',70,1010,1790,2115,'panneau explicatif')
print("=== REFERENCE : pied (CTA + note) ===")
lignes('reference-1080x2102.png',60,1020,1890,2070,'CTA + note')
