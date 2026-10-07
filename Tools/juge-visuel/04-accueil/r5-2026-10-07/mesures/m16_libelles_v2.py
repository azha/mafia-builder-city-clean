# m16 — libelles des boutons, v2 : fenetre interieure a 22 px des bords (le liseré et la rampe
# du degrade or vivaient dans la fenetre de m15 et saturaient la detection).
# Controle positif : les 3 libelles doivent etre CENTRES (dx ~ 0) dans leur bouton, des deux cotes.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
BTN={'REF':[(651,979,945,1036),(605,979,1159,1250),(705,979,1418,1509)],
     'JEU1920':[(678,979,865,956),(636,979,1050,1142),(729,979,1275,1367)],
     'JEU2400':[(678,979,1271,1363),(636,979,1456,1548),(729,979,1682,1774)]}
LIB=['COMMANDER','VOIR LA VENTE','BLANCHIR']
def mesure(im,nom):
    px=im.load(); print(f'  --- {nom} ---')
    for i,(x0,x1,y0,y1) in enumerate(BTN[nom]):
        xg,xd,ya,yb=x0+22,x1-21,y0+22,y1-21
        base=med([lum(px[x,y]) for y in range(ya,yb) for x in range(xg,xd)])
        cl=[(x,y) for y in range(ya,yb) for x in range(xg,xd) if lum(px[x,y])-base>35]
        so=[(x,y) for y in range(ya,yb) for x in range(xg,xd) if base-lum(px[x,y])>35]
        pts=cl if len(cl)>len(so) else so; sens='clair' if pts is cl else 'sombre'
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        pts2=sorted(pts,key=lambda p:lum(px[p[0],p[1]]),reverse=(sens=='clair'))[:80]
        col=tuple(med([px[p[0],p[1]][k] for p in pts2]) for k in range(3))
        pg=min(xs)-x0; pd=x1-max(xs)
        print(f'    {LIB[i]:14s} encre l={max(xs)-min(xs)+1}  CAP h={max(ys)-min(ys)+1}  x {min(xs)}..{max(xs)}')
        print(f'      padding G={pg} D={pd} dx={pg-pd}  fond lum={base:.0f}  libelle {sens} {col}  n={len(pts)}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: mesure(charge(p),n)
