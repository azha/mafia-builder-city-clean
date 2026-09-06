# m04 — le cadre exterieur et la carte portrait (filets or) : boites hors-tout, REF et captures.
# Controle positif : largeur de carte ~424-425 px et cadre ~1038-1044 px (grandeurs ETABLIES au r12).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def est_or(c):
    r,g,b=c
    return r>120 and g>90 and b<120 and r>b+55 and r>=g

def rails_v(im, y0, y1):
    p=px(im); W,H=im.size
    cols=[x for x in range(W) if sum(1 for y in range(y0,y1) if est_or(p[x,y])) > (y1-y0)*0.5]
    grp=[]
    for x in cols:
        if grp and x==grp[-1][-1]+1: grp[-1].append(x)
        else: grp.append([x])
    return [(g[0],g[-1]) for g in grp]

def rails_h(im, x0, x1, y0, y1):
    p=px(im)
    lignes=[y for y in range(y0,y1) if sum(1 for x in range(x0,x1) if est_or(p[x,y])) > (x1-x0)*0.5]
    grp=[]
    for y in lignes:
        if grp and y==grp[-1][-1]+1: grp[-1].append(y)
        else: grp.append([y])
    return [(g[0],g[-1]) for g in grp]

for nom,f,ybande,ycherche in (('REFERENCE','reference-1080x2102.png',(1000,1400),(800,1600)),
                              ('CAPTURE 2400','capture-1080x2400.png',(1050,1450),(850,1650)),
                              ('CAPTURE 1920','capture-1080x1920.png',(830,1150),(600,1350)),
                              ('ECRAN SEUL 2400','capture-ecran-seul-1080x2400.png',(1050,1450),(850,1650)),
                              ('ECRAN SEUL 1920 T','capture-ecran-seul-1080x1920-T.png',(830,1150),(600,1350))):
    im=ouvrir(f)
    v=rails_v(im,*ybande)
    print(f"=== {nom} : rails verticaux (bande y {ybande}) : {v}")
    if len(v)>=4:
        cg,cd = v[1][0], v[2][1]
        print(f"    cadre hors-tout {v[0][0]}..{v[-1][-1]} = {v[-1][-1]-v[0][0]+1} px ;"
              f" carte {cg}..{cd} = {cd-cg+1} px")
        h=rails_h(im, cg+10, cd-10, *ycherche)
        print(f"    filets horizontaux de la carte : {h}")
