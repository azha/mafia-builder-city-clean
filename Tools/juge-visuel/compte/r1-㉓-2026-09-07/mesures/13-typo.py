# -*- coding: utf-8 -*-
"""13 - Hauteurs de CAPITALE et couleurs des textes (capture) vs valeurs CSS de la reference.
Methode : bbox d'encre bornee en x sur une LETTRE capitale sans jambage ni accent.
CONTROLE POSITIF : sur la REFERENCE, .ens (11 px CSS x3,6 = 39,6 px) doit rendre une capitale
de 29 px -> rapport 0,732, qui est la hauteur de capitale de DejaVu (0,729 em). Mesure faite
plus haut : 29 px. On la rejoue ici, plus la couleur ecrite dans la CSS.
CONTROLE NEGATIF : une fenetre de fond doit rendre None."""
from PIL import Image
import os, statistics
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def mesure(im,box,seuil,nom):
    px=im.load(); x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>seuil]
    if not pts:
        print("   %-34s : AUCUNE ENCRE"%nom); return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    cols=[px[x,y] for x,y in pts]; cols.sort(key=lum)
    top=cols[int(len(cols)*0.85):]
    c=tuple(int(statistics.median([p[k] for p in top])) for k in range(3))
    h=max(ys)-min(ys)+1
    print("   %-34s : h=%3d px (%5.2f CSS a x3,6)  bbox=(%d,%d,%d,%d)  coeur=%s  L=%.0f"
          %(nom,h,h/3.6,min(xs),min(ys),max(xs),max(ys),c,lum(c)))
    return h,c
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')
print()
print("=== REFERENCE (temoins CSS) ===")
mesure(R,(48,485,120,525),70,"'L' de LA VITRINE (.ens)")        # CP : 29 px
mesure(R,(285,890,320,935),60,"'C' de Couleurs (.art .nom)")
mesure(R,(295,955,330,990),40,"'C' de Callsign (.art .en)")
mesure(R,(60,1150,1030,1180),30,"h3 'LES EXTRAS' (.etag h3)")
print("   CN fenetre de fond REF :"); mesure(R,(30,1690,120,1730),40,"fond")
print()
print("=== CAPTURE ===")
mesure(C,(367,265,400,315),70,"'L' de LA VITRINE")
mesure(C,(430,375,470,440),60,"'0' de 0 jetons")
mesure(C,(90,455,120,490),40,"'l' de 'le don...' (ligne d'alerte)")
mesure(C,(233,565,270,610),60,"'P' de Pack (titre de carte)")
mesure(C,(70,610,100,650),40,"'e' de 'en boutique' (bas-de-casse)")
mesure(C,(70,665,110,705),40,"'d' de 'donne 100 jetons'")
mesure(C,(70,1090,105,1130),40,"'+' / '2' de '+20 %'")
mesure(C,(345,765,380,800),40,"'D' de DERRIERE LA VITRE")
mesure(C,(133,790,165,825),40,"'a' de 'aucun verificateur'")

print()
print("=== reprises : fenetres recalees ===")
mesure(C,(225,555,300,625),60,"CAP 'P' de Pack (large)")
mesure(C,(225,555,540,625),60,"CAP 'Pack' entier")
mesure(R,(120,1240,180,1290),60,"REF 'D' de Deuxieme dossier (.art .nom)")
mesure(R,(60,1160,420,1200),35,"REF h3 'LES EXTRAS...' (recale)")
mesure(R,(300,1005,420,1050),35,"REF 'Callsign Color Pack' (.art .en)")
mesure(R,(365,1075,420,1120),60,"REF etiquette de prix '50' (.etiq b)")
