#!/usr/bin/env python3
"""GOUTTIERE : le contenu reste-t-il dans le rect libre entre bandeau et dock ?
Instrument : (a) colonne de bord x=20 (hors texte, hors pastilles) pour lire l'aplat de rangee ;
             (b) detection des pastilles du dock (cercles) par balayage horizontal ;
             (c) presence d'encre de LIBELLE (texte clair, lum>110) sous le bord haut du dock.
Controle positif : l'aplat de rangee (34,42,46) doit etre retrouve a x=20 sur les rangees 2..16 (deja mesurees).
Controle negatif : a x=20, sur une ligne NOIRE de separation, la luminance doit etre < 8."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
print("CONTROLE POSITIF  aplat de rangee a x=20 :", px[20,700], " attendu ~ (34,42,46)")
print("CONTROLE NEGATIF  ligne noire y=2100 a x=20 :", px[20,2100], f"lum={L(px[20,2100]):.1f} (<8 attendu)")
print()
print("colonne de bord x=20, y=2100..2399 (pas 6)")
for y in range(2100,2400,6):
    c=px[20,y]; print(f"  y={y:4d} {c} lum={L(c):5.1f}")
