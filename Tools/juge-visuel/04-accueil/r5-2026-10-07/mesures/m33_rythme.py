# m33 — rythme vertical : haut et bas du panneau LA SUITE (par son liseré lateral, x fixes verifies
# en m5), puis tous les ecarts internes. Les captures n'ont pas la hauteur de la reference :
# on compare donc les ECARTS INTERNES (invariants d'echelle), pas les y absolus.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
BORD={'REF':((46,49),(1031,1034),(31,37,46)),'JEU1920':((47,50),(1030,1033),(34,38,46)),
      'JEU2400':((47,50),(1030,1033),(34,38,46))}
ZONE={'REF':(800,1700),'JEU1920':(720,1470),'JEU2400':(1130,1880)}
def pr(p,b,tol=11): return max(abs(p[i]-b[i]) for i in range(3))<=tol
def panneau(im,nom):
    px=im.load(); (ga,gb),(da,db),b=BORD[nom]; y0,y1=ZONE[nom]
    ok=[y for y in range(y0,y1)
        if any(pr(px[x,y],b) for x in range(ga,gb)) and any(pr(px[x,y],b) for x in range(da,db))]
    print(f'  {nom}: cotes droits du panneau y {ok[0]}..{ok[-1]} (hauteur droite={ok[-1]-ok[0]+1})')
    return ok[0],ok[-1]
R={}
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: R[n]=panneau(charge(p),n)
# reperes deja mesures (m7, m11, m13)
REP={
 'REF':      dict(lasuite=(871,889), t1=(948,976), s1=(1007,1030), b1=(945,1036), sep1=1075,
                  t2=(1117,1145), sep2=1334, b3=(1418,1509), dernier_texte=1557),
 'JEU1920':  dict(lasuite=(797,813), t1=(870,896), s1=(928,952), b1=(865,956), sep1=994,
                  t2=(1036,1063), sep2=1198, b3=(1275,1367), dernier_texte=1409),
 'JEU2400':  dict(lasuite=(1203,1219), t1=(1276,1303), s1=(1335,1358), b1=(1271,1363), sep1=1401,
                  t2=(1443,1469), sep2=1605, b3=(1682,1774), dernier_texte=1816),
}
print('\n  ecarts internes (px) :')
print(f"  {'grandeur':34s} {'REF':>7s} {'1920':>7s} {'2400':>7s}   {'1920/REF':>9s} {'2400/REF':>9s}")
def ligne(lib,f):
    v={n:f(R[n],REP[n]) for n in R}
    print(f"  {lib:34s} {v['REF']:7d} {v['JEU1920']:7d} {v['JEU2400']:7d}   {v['JEU1920']/v['REF']:9.3f} {v['JEU2400']/v['REF']:9.3f}")
ligne('cotes droits (hauteur panneau)', lambda r,p: r[1]-r[0]+1)
ligne('haut panneau -> LA SUITE',       lambda r,p: p['lasuite'][0]-r[0])
ligne('LA SUITE -> titre 1',            lambda r,p: p['t1'][0]-p['lasuite'][1])
ligne('titre 1 -> sous-ligne 1',        lambda r,p: p['s1'][0]-p['t1'][1])
ligne('bas bouton 1 -> separateur 1',   lambda r,p: p['sep1']-p['b1'][1])
ligne('separateur 1 -> titre 2',        lambda r,p: p['t2'][0]-p['sep1'])
ligne('pas separateur 1 -> 2',          lambda r,p: p['sep2']-p['sep1'])
ligne('dernier texte -> bas panneau',   lambda r,p: r[1]-p['dernier_texte'])
ligne('bas bouton 3 -> bas panneau',    lambda r,p: r[1]-p['b3'][1])
