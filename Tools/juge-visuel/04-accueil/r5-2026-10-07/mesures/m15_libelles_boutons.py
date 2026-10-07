# m15 — libelles des 3 boutons : encre (largeur, hauteur de capitale), couleur du libelle,
# et PADDING (libelle -> bord du bouton) a gauche et a droite.
# Tout majuscules => la hauteur d'encre EST la hauteur de capitale.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
# bouton : (x0,x1,y0,y1) mesure en m10
BTN={'REF':[(651,979,945,1036),(605,979,1159,1250),(705,979,1418,1509)],
     'JEU1920':[(678,979,865,956),(636,979,1050,1142),(729,979,1275,1367)],
     'JEU2400':[(678,979,1271,1363),(636,979,1456,1548),(729,979,1682,1774)]}
LIB=['COMMANDER','VOIR LA VENTE','BLANCHIR']
def mesure(im,nom):
    px=im.load(); print(f'  --- {nom} ---')
    for i,(x0,x1,y0,y1) in enumerate(BTN[nom]):
        # fenetre interieure (on ecarte 8 px de bord pour ne pas prendre le liseré)
        xg,xd,ya,yb=x0+8,x1-7,y0+8,y1-7
        vals=[lum(px[x,y]) for y in range(ya,yb) for x in range(xg,xd)]
        base=med(vals)
        # le libelle est soit plus sombre (bouton or) soit plus clair (fantome) que le fond du bouton
        clair=[(x,y) for y in range(ya,yb) for x in range(xg,xd) if lum(px[x,y])-base>30]
        sombre=[(x,y) for y in range(ya,yb) for x in range(xg,xd) if base-lum(px[x,y])>30]
        pts=clair if len(clair)>len(sombre) else sombre
        sens='clair' if pts is clair else 'sombre'
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        cx=sorted(pts,key=lambda p:(p[1],p[0]))
        # couleur du libelle : mediane des 40 pixels les plus extremes
        pts2=sorted(pts,key=lambda p:lum(px[p[0],p[1]]),reverse=(sens=='clair'))[:60]
        col=tuple(med([px[p[0],p[1]][k] for p in pts2]) for k in range(3))
        print(f'    {LIB[i]:14s} encre x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1})  y {min(ys)}..{max(ys)} (CAP h={max(ys)-min(ys)+1})')
        print(f'      padding G={min(xs)-x0}  D={x1-max(xs)}  centrage dx={(min(xs)-x0)-(x1-max(xs))}  fond bouton lum={base:.0f}  libelle {sens} {col}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: mesure(charge(p),n)
