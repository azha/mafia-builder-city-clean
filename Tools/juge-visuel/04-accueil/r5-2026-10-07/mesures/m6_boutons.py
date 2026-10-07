# m6 — les trois boutons : bbox, hauteur, rayon, remplissage, bord, libelle.
# Bouton or : detecte par saturation chaude (R>G>B et R-B>40).
# Boutons fantomes : detectes par leur BORD (liseré plus clair que le fond du panneau).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

def bbox_or(im, zone):
    px=im.load(); x0,y0,x1,y1=zone
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1)
         if px[x,y][0]>120 and px[x,y][0]-px[x,y][2]>50]
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return min(xs),min(ys),max(xs),max(ys)

def bbox_fantome(im, zone, fond):
    """bord du bouton fantome : pixels dont la luminance depasse celle du fond du panneau de >6
    ET qui ne sont pas du texte (on prend l'enveloppe la plus externe)."""
    px=im.load(); x0,y0,x1,y1=zone
    lf=lum(fond)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>lf+5]
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return min(xs),min(ys),max(xs),max(ys)

def fiche(im,nom,zones,fond):
    print(f'  --- {nom} (fond panneau {fond}) ---')
    b=bbox_or(im,zones['or'])
    print(f'    BOUTON OR      bbox={b}  l={b[2]-b[0]+1} h={b[3]-b[1]+1}')
    px=im.load()
    cx=(b[0]+b[2])//2; cy=(b[1]+b[3])//2
    print(f'      remplissage centre {px[cx,cy]}  haut {px[cx,b[1]+6]}  bas {px[cx,b[3]-6]}')
    for k in ('f1','f2'):
        bb=bbox_fantome(im,zones[k],fond)
        print(f'    BOUTON {k.upper()}      bbox={bb}  l={bb[2]-bb[0]+1} h={bb[3]-bb[1]+1}')
        cx=(bb[0]+bb[2])//2
        print(f'      bord haut {px[cx,bb[1]]} {px[cx,bb[1]+1]} ; interieur {px[cx,bb[1]+14]}')
    return

# zones de recherche determinees sur les vignettes, larges exprès
fiche(charge(REF),'REF',
      {'or':(620,920,1030,1060),'f1':(580,1150,1030,1280),'f2':(680,1400,1030,1520)},(10,16,27))
fiche(charge(J19),'JEU1920',
      {'or':(620,800,1030,920),'f1':(600,1050,1030,1180),'f2':(640,1180,1030,1300)},(11,16,27))
fiche(charge(J24),'JEU2400',
      {'or':(620,1270,1030,1400),'f1':(600,1420,1030,1560),'f2':(640,1580,1030,1700)},(10,16,27))
