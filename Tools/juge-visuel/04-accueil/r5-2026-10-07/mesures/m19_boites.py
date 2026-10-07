# m19 — bornes verticales des deux boites (panneau LA SUITE, plaque TRANCHER) par leur LISERE :
# lignes ou la mediane sur x 900..1000 est proche de la couleur du liseré lateral mesuree en m5
# (REF (31,37,46) · JEU (34,38,46)).
# Controle positif : le liseré LATERAL (m5) doit tomber dans la meme tolerance.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
BORD={'REF':(31,37,46),'JEU1920':(34,38,46),'JEU2400':(34,38,46)}
def boites(im,nom,y0,y1,tol=8):
    px=im.load(); b=BORD[nom]
    hits=[]
    for y in range(y0,y1):
        c=tuple(med([px[x,y][k] for x in range(880,1000)]) for k in range(3))
        if max(abs(c[i]-b[i]) for i in range(3))<=tol: hits.append(y)
    # regrouper
    grp=[];cur=[hits[0]]
    for y in hits[1:]:
        if y-cur[-1]<=2: cur.append(y)
        else: grp.append(cur); cur=[y]
    grp.append(cur)
    print(f'  --- {nom} : lignes "liseré" sur x880..1000 ---')
    for g in grp: print(f'     y {g[0]}..{g[-1]}  ({len(g)} lignes)')
boites(charge(REF),'REF',700,2102)
boites(charge(J19),'JEU1920',600,1920)
boites(charge(J24),'JEU2400',1000,2400)
