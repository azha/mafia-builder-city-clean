# m27 : jetons de couleur — median du coeur de chaque aplat (>=3 px de tout bord).
# Controle positif : le rail or du cadre, connu egal au r15 (1/255).
# Controle negatif : deux jetons volontairement differents (cyan vs creme) doivent sortir differents.
import sys; sys.path.insert(0,'.')
from lib import *

def coeur(px, xs, ys, test):
    """median des pixels satisfaisant test, eroded : on garde ceux dont les 8 voisins satisfont aussi"""
    ok=[(x,y) for y in ys for x in xs if test(px[x,y])]
    ok2=[(x,y) for (x,y) in ok if all(test(px[x+i,y+j]) for i in (-2,-1,0,1,2) for j in (-2,-1,0,1,2))]
    src=ok2 if len(ok2)>=20 else ok
    if not src: return None,0
    return (int(mediane([px[x,y][0] for x,y in src])),
            int(mediane([px[x,y][1] for x,y in src])),
            int(mediane([px[x,y][2] for x,y in src]))), len(src)

def prox(c,ref,t): return all(abs(c[i]-ref[i])<=t for i in range(3))

JETONS=[
 ("or vif (titre)",      (242,201,107), 60, {'reference-1080x2102.png':(range(320,760),range(510,565)),
                                             'capture-1080x2400.png':(range(320,760),range(542,596)),
                                             'capture-1080x1920.png':(range(320,760),range(310,364))}),
 ("rail or du cadre",    (176,141,62), 40, {'reference-1080x2102.png':(range(19,26),range(600,1600)),
                                            'capture-1080x2400.png':(range(16,23),range(600,1600)),
                                            'capture-1080x1920.png':(range(16,23),range(400,1400))}),
 ("cyan du chiffre",     (127,212,217), 30, {'reference-1080x2102.png':(range(165,245),range(720,766)),
                                             'capture-1080x2400.png':(range(168,240),range(744,790)),
                                             'capture-1080x1920.png':(range(168,240),range(512,558))}),
 ("vert 'Il vous ecoute'",(125,179,106), 45, {'reference-1080x2102.png':(range(160,420),range(1425,1465)),
                                              'capture-1080x2400.png':(range(160,420),range(1455,1495)),
                                              'capture-1080x1920.png':(range(160,420),range(1223,1263))}),
 ("creme du libelle",    (234,224,200), 40, {'reference-1080x2102.png':(range(80,330),range(778,800)),
                                             'capture-1080x2400.png':(range(70,320),range(804,828)),
                                             'capture-1080x1920.png':(range(70,320),range(570,596))}),
 ("peau du visage",      (185,173,146), 30, {'reference-1080x2102.png':(range(230,360),range(1090,1180)),
                                             'capture-1080x2400.png':(range(190,320),range(970,1060)),
                                             'capture-1080x1920.png':(range(220,360),range(940,1030))}),
]
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
print()
for nom,ref,tol,zones in JETONS:
    res={}
    for f,(xs,ys) in zones.items():
        c,n=coeur(PX[f],xs,ys, lambda cc: prox(cc,ref,tol))
        res[f]=(c,n)
    r=res['reference-1080x2102.png'][0]; a=res['capture-1080x2400.png'][0]; b=res['capture-1080x1920.png'][0]
    d=max(abs(a[i]-r[i]) for i in range(3)) if (r and a) else None
    print("   %-24s ref=%-16s 2400=%-16s 1920=%-16s  Dmax=%s/255  (n=%d/%d/%d)"
          % (nom, r, a, b, d, res['reference-1080x2102.png'][1], res['capture-1080x2400.png'][1], res['capture-1080x1920.png'][1]))

print("\n   fonds (mediane d'une fenetre 7x7 au coeur d'un aplat) :")
FONDS=[("fond du cadre (hors panneaux)", {'reference-1080x2102.png':(540,1590),'capture-1080x2400.png':(540,1570),'capture-1080x1920.png':(540,1338)}),
       ("interieur boite compteur 1",    {'reference-1080x2102.png':(320,760),'capture-1080x2400.png':(320,780),'capture-1080x1920.png':(320,548)}),
       ("interieur panneau de titre",    {'reference-1080x2102.png':(120,495),'capture-1080x2400.png':(120,525),'capture-1080x1920.png':(120,292)}),
       ("interieur tuile 1",             {'reference-1080x2102.png':(950,1035),'capture-1080x2400.png':(950,1030),'capture-1080x1920.png':(950,798)}),
       ("interieur carte portrait",      {'reference-1080x2102.png':(140,930),'capture-1080x2400.png':(140,950),'capture-1080x1920.png':(140,718)}),
       ("interieur panneau bas",         {'reference-1080x2102.png':(900,1680),'capture-1080x2400.png':(900,1615),'capture-1080x1920.png':(900,1382)}),
       ("interieur boite CTA",           {'reference-1080x2102.png':(120,2000),'capture-1080x2400.png':(120,1927),'capture-1080x1920.png':None}),
      ]
for nom,z in FONDS:
    out=[]
    for f in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'):
        p=z.get(f)
        out.append(str(mediane_fenetre(PX[f],p[0],p[1],3)) if p else '—')
    print("   %-30s ref=%-16s 2400=%-16s 1920=%s" % ((nom,)+tuple(out)))
