# m7 — reperage des boutons sans zone devinee : pour chaque ligne y, longueur du PLUS LONG RUN
# horizontal de pixels plus clairs que le fond du panneau, dans la moitie droite.
# Les bords haut/bas d'un bouton donnent un run long (> 120 px) ; le texte donne des runs courts.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

def runs(im,nom,ypan,fond,xg=560,xd=1030,seuil=5):
    px=im.load(); lf=lum(fond)
    print(f'  --- {nom} : runs clairs x{xg}..{xd} ---')
    out=[]
    for y in range(*ypan):
        best=0;cur=0;bx=0;cx0=None;bx0=None
        for x in range(xg,xd):
            if lum(px[x,y])>lf+seuil:
                if cur==0: cx0=x
                cur+=1
                if cur>best: best=cur; bx0=cx0
            else: cur=0
        out.append((y,best,bx0))
    # imprime les lignes ou le run depasse 120
    prev=False
    for y,b,x0 in out:
        g=b>120
        if g!=prev:
            print(f'    y={y:5d}  run={b:4d}  x0={x0}  {"DEBUT" if g else "fin"}')
            prev=g
    return out

runs(charge(REF),'REF',(850,1620),(10,16,27))
runs(charge(J19),'JEU1920',(760,1500),(11,16,27))
runs(charge(J24),'JEU2400',(1160,1900),(10,16,27))
