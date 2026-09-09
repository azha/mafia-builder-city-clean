#!/usr/bin/env python3
"""Hauteur de CAPITALE : pour une bande, on isole la colonne du 1er glyphe (une
capitale ou un chiffre) et on mesure l'extension verticale de son encre.
Controle positif : le sous-titre est en CAPITALES dans les deux images et la CSS
lui donne 6.4px -> 23.0 px attendus a l'echelle x3.6 dans la reference.
Controle negatif : une bande sans texte doit rendre 'aucune encre'."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def bbox_encre(f,x0,x1,y0,y1,seuil=70):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(px[x,y])>seuil: xs.append(x);ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys),len(xs)) if xs else None

def mesure(f,nom,x0,x1,y0,y1,seuil=70,note=''):
    im=Image.open(os.path.join(D,f)); W,H=im.size
    r=bbox_encre(f,x0,x1,y0,y1,seuil)
    if not r: print(f"  [{f[:26]:26s} {W}x{H}] {nom:34s} AUCUNE ENCRE"); return None
    xa,ya,xb,yb,n=r
    h=yb-ya+1
    print(f"  [{f[:26]:26s} {W}x{H}] {nom:34s} encre x={xa}..{xb} y={ya}..{yb} "
          f"h={h:3d}px = {h/3.6:5.2f} CSS  n={n} {note}")
    return h

print("=== hauteur de CAPITALE / de CHIFFRE ===")
print("-- reference --")
mesure('reference-1080x2102.png','titre : capitale L',       288, 330, 480, 570)
h_ref_st=mesure('reference-1080x2102.png','sous-titre CAPS (bande entiere)', 290, 800, 580, 610)
mesure('reference-1080x2102.png','compteur chiffres "01"',   150, 260, 680, 740)
mesure('reference-1080x2102.png','libelle "A LA UNE" CAPS',  130, 270, 750, 780)
mesure('reference-1080x2102.png','manchette CAPS (L de LE)', 115, 145, 880, 920)
mesure('reference-1080x2102.png','titre une : capitale U',   115, 155, 940, 1000)
mesure('reference-1080x2102.png','breve : capitale U',       152, 190, 1215, 1260)
mesure('reference-1080x2102.png','CTA capitale Y',           330, 365, 1925, 1970)
mesure('reference-1080x2102.png','CTRL NEGATIF bande vide',  200, 900, 1620, 1700)
print("-- capture principale --")
mesure('capture-1080x2400.png','titre : capitale L',         320, 360, 280, 370)
h_cap_st=mesure('capture-1080x2400.png','sous-titre CAPS (bande entiere)',290, 800, 370, 400)
mesure('capture-1080x2400.png','compteur chiffres "20"',     160, 240, 495, 560)
mesure('capture-1080x2400.png','libelle "A LA UNE" CAPS',    130, 270, 560, 595)
mesure('capture-1080x2400.png','cle outlet (bas-de-casse)',   75, 110, 695, 730)
mesure('capture-1080x2400.png','titre carte : "n" de news',   75, 110, 735, 790)
mesure('capture-1080x2400.png','sur-titre CE QUE LE SERV.',   80, 620, 1845, 1875)
mesure('capture-1080x2400.png','titre panneau : capitale A',  80, 120, 1880, 1945)
mesure('capture-1080x2400.png','CTRL NEGATIF bande vide',    200, 900, 2130, 2160)
print()
print(f"CONTROLE POSITIF sous-titre reference : {h_ref_st} px ; CSS 6.4px x3.6 = 23.0 attendu "
      f"-> {'OK' if h_ref_st and abs(h_ref_st-23)<=3 else 'ECHEC'}")
print(f"sous-titre capture : {h_cap_st} px ; delta = {h_cap_st-h_ref_st:+d} px "
      f"({100*(h_cap_st-h_ref_st)/h_ref_st:+.1f} %)")
