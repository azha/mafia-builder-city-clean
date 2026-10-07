# m26 — dock : centres et diametres des 4 ronds, soulignement de l'onglet actif, pastille FAMILLE,
# libelles (bande d'encre + largeur).
# Controle positif : les 4 ronds doivent avoir le MEME diametre dans une image donnee.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
# ligne horizontale passant par le centre des ronds
Y={'REF':1953,'JEU1920':1763,'JEU2400':2243}
def dock(im,nom):
    px=im.load(); w,h=im.size; y=Y[nom]
    base=med([lum(px[x,y]) for x in range(0,w)])
    xs=[x for x in range(0,w) if lum(px[x,y])-base>6]
    grp=[];cur=[xs[0]]
    for x in xs[1:]:
        if x-cur[-1]<=4: cur.append(x)
        else: grp.append(cur); cur=[x]
    grp.append(cur)
    print(f'  --- {nom} dock, ligne y={y} ---')
    for g in grp:
        if len(g)>=4: print(f'    arc x {g[0]}..{g[-1]}  centre={(g[0]+g[-1])/2:.1f}  diametre={g[-1]-g[0]+1}')
    # pastille or (FAMILLE) et soulignement or
    pts=[(x,yy) for yy in range(y-160,y+160) for x in range(0,w)
         if 0<=yy<h and px[x,yy][0]>120 and px[x,yy][0]-px[x,yy][2]>50]
    if pts:
        gx=sorted(set(p[0] for p in pts))
        gr=[];cur=[gx[0]]
        for x in gx[1:]:
            if x-cur[-1]<=6: cur.append(x)
            else: gr.append(cur); cur=[x]
        gr.append(cur)
        for g in gr:
            yy=[p[1] for p in pts if g[0]<=p[0]<=g[-1]]
            print(f'    OR x {g[0]}..{g[-1]} (l={g[-1]-g[0]+1})  y {min(yy)}..{max(yy)} (h={max(yy)-min(yy)+1})')
    else: print('    aucun pixel or dans la bande du dock')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: dock(charge(p),n)
