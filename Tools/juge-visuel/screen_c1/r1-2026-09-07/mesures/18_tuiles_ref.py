#!/usr/bin/env python3
"""Largeur des 3 tuiles .fen de la REFERENCE, mesuree sur leur BORDURE haute
(#2a3648) et non sur la luminance (le remplissage #0a0e16 est plus SOMBRE que
le fond du panneau : c'est ce qui a fait echouer 17_compteurs sur la reference).
Controle positif : 3 segments, gouttieres ~6 CSS, total ~274 CSS.
Controle negatif : une rangee 20 px plus haut (hors bordure) -> 0 segment."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FROID=(42,54,72)
def froid(p): return all(abs(p[i]-FROID[i])<=22 for i in range(3))
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
W,H=im.size; px=im.load(); print(f"OUVERT reference-1080x2102.png taille={W}x{H}")
def seg(y,nom):
    dans=[x for x in range(W) if froid(px[x,y])]
    grp,prev=[],None
    for x in dans:
        if prev is None or x!=prev+1: grp.append([x,x])
        else: grp[-1][1]=x
        prev=x
    grp=[g for g in grp if g[1]-g[0]>30]
    print(f"  {nom} y={y} : {len(grp)} segment(s)")
    for i,(a,b) in enumerate(grp):
        print(f"     tuile {i+1}: x={a}..{b}  largeur={b-a+1:4d}px = {(b-a+1)/3.6:6.2f} CSS")
    for i in range(len(grp)-1):
        g=grp[i+1][0]-grp[i][1]-1
        print(f"     gouttiere {i+1}: {g}px = {g/3.6:.2f} CSS")
    if grp:
        s=grp[-1][1]-grp[0][0]+1
        print(f"     ETENDUE = {s}px = {s/3.6:.2f} CSS")
    return grp
g=seg(680,'bordure haute des .fen')
print(f"  CONTROLE POSITIF : {len(g)} segments (attendu 3) -> {'OK' if len(g)==3 else 'ECHEC'}")
g2=seg(660,'CONTROLE NEGATIF (hors bordure)')
print(f"  CONTROLE NEGATIF : {len(g2)} segments (attendu 0) -> {'OK' if len(g2)==0 else 'ECHEC'}")
print()
print("  CAPTURE (rappel 17_compteurs) : 80.83 / 97.50 / 84.44 CSS, gouttieres 5.83 CSS")
if len(g)==3:
    l=[(b-a+1)/3.6 for a,b in g]
    print(f"  REFERENCE : {l[0]:.2f} / {l[1]:.2f} / {l[2]:.2f} CSS")
    print(f"  ecart max entre tuiles  REFERENCE = {max(l)-min(l):.2f} CSS "
          f"({100*(max(l)-min(l))/min(l):.1f} %)")
    print(f"  ecart max entre tuiles  CAPTURE   = {97.50-80.83:.2f} CSS "
          f"({100*(97.50-80.83)/80.83:.1f} %)")
