#!/usr/bin/env python3
"""Profil de couleur A TRAVERS le bord d'un boitier, sans supposer aucun hex :
un BORD existe si, entre le fond exterieur et le remplissage interieur, une ou
plusieurs rangees ont une couleur qui n'est NI l'un NI l'autre (distance > 8).
Controle positif : la reference (breve, bord #2a3648) doit rendre BORD=OUI.
Controle negatif : une coupe en plein milieu d'un aplat doit rendre BORD=NON."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))

def coupe_v(f,x,y0,y1,nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    vals=[(y,px[x,y]) for y in range(y0,y1)]
    ext=vals[0][1]; inte=vals[-1][1]
    etr=[(y,p) for y,p in vals if d(p,ext)>8 and d(p,inte)>8]
    print(f"  [{f[:26]:26s} {W}x{H}] {nom:32s} x={x} y={y0}..{y1}")
    print(f"      ext={ext} int={inte}  rangees etrangeres={len(etr)} "
          f"{'-> BORD OUI' if etr else '-> BORD NON'}")
    print("      " + " ".join(f"{y}:{p}" for y,p in vals))
    return len(etr)

print("=== REFERENCE (temoins) ===")
a=coupe_v('reference-1080x2102.png', 540, 1178, 1196, 'CTRL+ bord haut breve 1')
b=coupe_v('reference-1080x2102.png', 540, 1250, 1262, 'CTRL- plein aplat interieur')
print(f"  CONTROLE POSITIF : {a} rangees etrangeres (attendu >=1) -> {'OK' if a>=1 else 'ECHEC'}")
print(f"  CONTROLE NEGATIF : {b} rangees etrangeres (attendu 0)   -> {'OK' if b==0 else 'ECHEC'}")
print()
print("=== CAPTURE PRINCIPALE ===")
coupe_v('capture-1080x2400.png', 540, 666, 684, 'bord haut carte 1')
coupe_v('capture-1080x2400.png', 540, 880, 898, 'bord bas carte 1')
coupe_v('capture-1080x2400.png', 540, 475, 493, 'bord haut compteur central')
coupe_v('capture-1080x2400.png', 540, 259, 277, 'bord haut enseigne')
coupe_v('capture-1080x2400.png', 540,1776,1794, 'bord haut panneau explicatif')
print()
print("=== bords LATERAUX (colonnes) : y fixe, x variable ===")
def coupe_h(f,y,x0,x1,nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    vals=[(x,px[x,y]) for x in range(x0,x1)]
    ext=vals[0][1]; inte=vals[-1][1]
    etr=[(x,p) for x,p in vals if d(p,ext)>8 and d(p,inte)>8]
    print(f"  [{f[:26]:26s} {W}x{H}] {nom:32s} y={y} x={x0}..{x1}")
    print(f"      ext={ext} int={inte}  colonnes etrangeres={len(etr)} "
          f"{'-> BORD OUI' if etr else '-> BORD NON'}")
    print("      " + " ".join(f"{x}:{p}" for x,p in vals))
coupe_h('reference-1080x2102.png', 1250, 74, 92, 'CTRL+ bord gauche breve')
coupe_h('capture-1080x2400.png',    780, 30, 48, 'bord gauche carte 1')
coupe_h('capture-1080x2400.png',    780,1032,1050,'bord droit carte 1')
