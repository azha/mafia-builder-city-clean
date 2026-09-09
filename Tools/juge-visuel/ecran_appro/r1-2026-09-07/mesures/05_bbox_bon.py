# -*- coding: utf-8 -*-
"""BBOX du bon de commande par RUN CONTIGU de lignes 'papier' (>=40% de la largeur).
CONTROLE POSITIF : la largeur du bon en % de la largeur d'ecran doit valoir ~91,3% des deux cotes
                   (CSS : 274/300 = 91,33%).
CONTROLE NEGATIF : une bande hors du bon (ref y=1400) doit donner 0% de papier."""
from PIL import Image
def pap(p): return p[0]>170 and p[1]>160 and p[2]>135 and (p[0]-p[2])<80
def go(path):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print("OUVERT %s taille=%dx%d"%(path,W,H)); px=im.load()
    frac=[sum(1 for x in range(0,W,3) if pap(px[x,y]))/len(range(0,W,3)) for y in range(H)]
    runs=[];s=None
    for y in range(H):
        if frac[y]>=0.40 and s is None: s=y
        elif frac[y]<0.40 and s is not None:
            if y-s>=30: runs.append((s,y-1))
            s=None
    if s is not None and H-s>=30: runs.append((s,H-1))
    print("  runs contigus de papier (>=30 lignes) :",runs)
    for (y0,y1) in runs:
        xs=[]
        for y in range(y0,y1+1,7):
            r=[x for x in range(W) if pap(px[x,y])]
            if r: xs.append((min(r),max(r)))
        x0=min(a for a,b in xs); x1=max(b for a,b in xs)
        print("   y=%d..%d h=%d | x=%d..%d larg=%d = %.2f%% de l'ecran | marges g=%d d=%d"
              %(y0,y1,y1-y0+1,x0,x1,x1-x0+1,100*(x1-x0+1)/W,x0,W-1-x1))
    return frac
fr=go("../reference-1080x2102.png")
fc=go("../capture-1080x2400.png")
print("CONTROLE NEGATIF ref y=1400 : part de papier = %.3f"%fr[1400])
print("CONTROLE POSITIF attendu CSS : 274/300 = %.2f%%"%(100*274/300))
