#!/usr/bin/env python3
"""Bords GAUCHE/DROIT des boites (jeton, plaques, CTA) par balayage d'une LIGNE traversant
leur bordure haute. Donne l'inset lateral du contenu -> compare l'echelle horizontale.
Controle positif: la largeur de la plaque en REFERENCE doit valoir 300-2*13-2*1(bordure .tel)
= 272 CSS = 979,2 px a +-3 px (CSS lue dans ecrans-brennar-6.html: .sv-body padding 13px).
Controle negatif: la meme mesure prise sur une ligne SANS boite doit rendre 'aucun bord'."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

# xa/xb : la REFERENCE porte la bordure 1 CSS du chassis .tel (#3a4356, lum 66) en x=0..3
# et x=1076..1079 -> un balayage de 0 a W la compte comme un bord et le CONTROLE NEGATIF
# echoue (une ligne vide rend 0..1079). Piege attrape par ce controle, corrige ici.
def bords_h(path,y,seuil,tag,label,xa=10,xb=1070):
    im=Image.open(path).convert("RGB"); px=im.load(); W,H=im.size
    xs=[x for x in range(xa,min(xb,W)) if lum(px[x,y])>=seuil]
    if not xs:
        print(f"[{tag}] {label:26s} y={y:4d} : AUCUN bord (seuil {seuil})"); return None
    print(f"[{tag}] {label:26s} y={y:4d} : x={xs[0]}..{xs[-1]}  largeur={xs[-1]-xs[0]+1}  (= {(xs[-1]-xs[0]+1)/3.6:.1f} CSS)")
    return xs[0],xs[-1]

im=Image.open(D+"reference-1080x2102.png"); print("REF",im.size)
im=Image.open(D+"capture-1080x2400.png"); print("CAP",im.size)
print()
print("--- REFERENCE ---")
bords_h(D+"reference-1080x2102.png",644,60,"REF","jeton bord haut")
bords_h(D+"reference-1080x2102.png",852,58,"REF","plaque1 bord haut")
bords_h(D+"reference-1080x2102.png",1006,58,"REF","plaque2 bord haut")
bords_h(D+"reference-1080x2102.png",1446,58,"REF","plaque4 bord bas")
bords_h(D+"reference-1080x2102.png",1939,60,"REF","CTA bord haut")
bords_h(D+"reference-1080x2102.png",1783,40,"REF","sv-bas bord haut(2px)")
bords_h(D+"reference-1080x2102.png",605,45,"REF","sv-tete bord bas")
print("CONTROLE NEGATIF:")
bords_h(D+"reference-1080x2102.png",1600,58,"REF","ligne vide du panneau")
print()
print("--- CAPTURE ---")
bords_h(D+"capture-1080x2400.png",436,60,"CAP","jeton bord haut")
bords_h(D+"capture-1080x2400.png",617,58,"CAP","plaque1 bord haut")
bords_h(D+"capture-1080x2400.png",765,58,"CAP","plaque2 bord haut")
bords_h(D+"capture-1080x2400.png",1187,58,"CAP","plaque4 bord bas")
bords_h(D+"capture-1080x2400.png",1995,58,"CAP","CTA bord haut")
bords_h(D+"capture-1080x2400.png",396,45,"CAP","sv-tete bord bas")
print("CONTROLE NEGATIF:")
bords_h(D+"capture-1080x2400.png",1500,58,"CAP","ligne vide du panneau")
