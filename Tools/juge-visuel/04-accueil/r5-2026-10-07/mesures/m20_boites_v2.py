# m20 — bornes verticales des boites par leurs liserés LATERAUX (les seuls deja verifies, m5) :
# une ligne appartient a une boite si le liseré est present A GAUCHE ET A DROITE.
# Controle positif : le nombre de boites trouvees doit etre 2 (panneau LA SUITE + plaque TRANCHER).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
BORD={'REF':(31,37,46),'JEU1920':(34,38,46),'JEU2400':(34,38,46)}
XG={'REF':(46,49),'JEU1920':(47,50),'JEU2400':(47,50)}
XD={'REF':(1031,1034),'JEU1920':(1030,1033),'JEU2400':(1030,1033)}
def proche(p,b,tol): return max(abs(p[i]-b[i]) for i in range(3))<=tol
def boites(im,nom,tol=10):
    px=im.load(); w,h=im.size; b=BORD[nom]
    xg=XG[nom]; xd=XD[nom]
    ok=[]
    for y in range(h):
        g=any(proche(px[x,y],b,tol) for x in range(*xg))
        d=any(proche(px[x,y],b,tol) for x in range(*xd))
        ok.append(g and d)
    grp=[];cur=None
    for y,v in enumerate(ok):
        if v and cur is None: cur=y
        elif not v and cur is not None:
            if y-cur>20: grp.append((cur,y-1))
            cur=None
    if cur is not None and len(ok)-cur>20: grp.append((cur,len(ok)-1))
    print(f'  --- {nom} : {len(grp)} boite(s) ---')
    for a,z in grp: print(f'     y {a}..{z}  hauteur={z-a+1}')
    return grp
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: boites(charge(p),n)
