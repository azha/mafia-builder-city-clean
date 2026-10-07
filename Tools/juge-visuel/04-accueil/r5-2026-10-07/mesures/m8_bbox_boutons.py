# m8 — bbox exactes des 3 boutons (bandes y trouvees par m7), largeur a MI-HAUTEUR,
# rayon d'arrondi (par la demi-largeur perdue a 1 px du bord), remplissage et bord.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

BANDES={
 'REF':[(945,1036),(1159,1250),(1418,1509)],
 'JEU1920':[(865,956),(1050,1142),(1275,1367)],
 'JEU2400':[(1271,1363),(1456,1548),(1682,1774)],
}
FOND={'REF':(10,16,27),'JEU1920':(11,16,27),'JEU2400':(10,16,27)}

def largeur(px,y,lf,xg=560,xd=1032,seuil=5):
    xs=[x for x in range(xg,xd) if lum(px[x,y])>lf+seuil]
    if not xs: return None
    return min(xs),max(xs)

def fiche(im,nom):
    px=im.load(); lf=lum(FOND[nom])
    print(f'  --- {nom} ---')
    for i,(y0,y1) in enumerate(BANDES[nom],1):
        ym=(y0+y1)//2
        g,d=largeur(px,ym,lf)
        print(f'    B{i}: y {y0}..{y1} h={y1-y0+1}  x {g}..{d} l={d-g+1}  bordD a 1032-{d}={1032-d}')
        # rayon : largeur a y0+k pour k=0..14
        prof=[]
        for k in range(0,16,2):
            r=largeur(px,y0+k,lf)
            prof.append('-' if r is None else f'{r[1]-r[0]+1}')
        print(f'      largeur a y0+0,2,..14 : {prof}')
        # remplissage et bord au centre
        cx=(g+d)//2
        print(f'      centre {px[cx,ym]}  bord haut {px[cx,y0]} {px[cx,y0+1]} {px[cx,y0+2]}  bord gauche {px[g,ym]} {px[g+1,ym]} {px[g+2,ym]} {px[g+4,ym]}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]:
    fiche(charge(p),n)
