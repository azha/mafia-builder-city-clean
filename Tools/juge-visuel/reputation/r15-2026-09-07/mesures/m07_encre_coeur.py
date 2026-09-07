"""m07 — coeur de l'encre cyan (distance de Chebyshev <= TOL au jeton (127,212,217)).
Controle positif : le meme detecteur doit rendre des largeurs voisines pour les 2 premiers
compteurs de la REFERENCE (memes glyphes "00").
Controle negatif : sur le fond de la boite (pas de glyphe) il doit rendre 0.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
JET=(127,212,217)
def coeur(c,tol=28):
    return max(abs(c[0]-JET[0]),abs(c[1]-JET[1]),abs(c[2]-JET[2]))<=tol

CFG={
 'reference-1080x2102.png': dict(boite=(702,819), cols=[(52,358),(386,692),(720,1026)]),
 'capture-1080x2400.png'  : dict(boite=(727,845), cols=[(49,357),(385,694),(721,1030)]),
 'capture-1080x1920.png'  : dict(boite=(494,613), cols=[(49,357),(385,694),(721,1030)]),
}
for nom,c in CFG.items():
    print("="*74); im=ouvrir(nom); p=im.load(); y0,y1=c['boite']
    for i,(cx0,cx1) in enumerate(c['cols'],1):
        pts=[(x,y) for y in range(y0,y1+1) for x in range(cx0,cx1+1) if coeur(p[x,y])]
        if not pts:
            print(f"  compteur {i} : AUCUN coeur cyan"); continue
        xs=[q[0] for q in pts]; ys=[q[1] for q in pts]
        bx=sum(xs)/len(xs); by=sum(ys)/len(ys)
        print(f"  compteur {i} : x{min(xs)}..{max(xs)} (w={max(xs)-min(xs)+1})  y{min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})  n={len(pts)}  barycentre=({bx:.1f},{by:.1f})")
    # ctrl negatif : bande de fond de la boite 1 (sous le glyphe, au-dessus du libelle)
    n=sum(1 for y in range(y1-14,y1-4) for x in range(c['cols'][0][0]+6,c['cols'][0][1]-6) if coeur(p[x,y]))
    print(f"  [ctrl negatif] coeur cyan dans le bas de la boite 1 = {n} (attendu 0)")
