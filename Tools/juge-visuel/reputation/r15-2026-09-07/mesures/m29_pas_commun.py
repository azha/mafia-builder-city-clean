"""m29 — ADDENDUM : les positions sont-elles suspectement RONDES ou REGULIERES ?
Bords mesures en mi-alpha SOUS-PIXEL sur le profil de luminance moyenne d'une bande.
On teste : (a) la partie fractionnaire des bords, (b) un pas commun p minimisant le residu
           max_i |dist(v_i, multiple de p)|, p balaye de 2 a 260 px par 1/16 px.
Controle positif : une serie construite EXPRES sur un pas de 107,5 doit rendre p=107,5.
Controle negatif : une serie de valeurs aleatoires ne doit PAS rendre de petit residu.
"""
import sys, os, random, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def bord(im,x0,x1,ycentre,demi=10,sens=None):
    p=im.load()
    prof=[(y, sum(lum(p[x,y]) for x in range(x0,x1+1))/(x1-x0+1)) for y in range(ycentre-demi,ycentre+demi+1)]
    vals=[v for _,v in prof]; pic=max(vals); i=vals.index(pic); f=percentile(vals,10)
    return (mi_alpha(prof,i,-1,fond=f,pic=pic), mi_alpha(prof,i,+1,fond=f,pic=pic))

def bordx(im,y0,y1,xcentre,demi=10):
    p=im.load()
    prof=[(x, sum(lum(p[x,y]) for y in range(y0,y1+1))/(y1-y0+1)) for x in range(xcentre-demi,xcentre+demi+1)]
    vals=[v for _,v in prof]; pic=max(vals); i=vals.index(pic); f=percentile(vals,10)
    return (mi_alpha(prof,i,-1,fond=f,pic=pic), mi_alpha(prof,i,+1,fond=f,pic=pic))

def pas_commun(vals, pmin=2.0, pmax=260.0, pas=1/16):
    best=None
    p=pmin
    while p<=pmax:
        r=max(min(v%p, p-(v%p)) for v in vals)
        if best is None or r<best[1]: best=(p,r)
        p+=pas
    return best

im=ouvrir('capture-1080x2400.png')
print("  --- bords HORIZONTAUX (mi-alpha sous-pixel), capture 1080x2400 ---")
H=[("filet haut du cadre",        (200,900), 483),
   ("bord haut panneau titre",    (200,900), 514),
   ("filet or sous l'enseigne",   (200,900), 690),
   ("bord haut boites compteurs", (100,300), 730),
   ("bord bas boites compteurs",  (100,300), 841),
   ("bord haut panneau elastique",(600,1000),877),
   ("filet haut carte portrait",  (150,450), 904),
   ("bord haut tuile 1",          (560,940), 1000),
   ("bord bas  tuile 1",          (560,940), 1089),
   ("bord haut tuile 2",          (560,940), 1107),
   ("bord haut tuile 3",          (560,940), 1214),
   ("bord haut tuile 4",          (560,940), 1322),
   ("bord bas  tuile 4",          (560,940), 1411),
   ("bord bas panneau elastique", (600,1000),1549),
   ("filet bas carte portrait",   (150,450), 1558),
   ("bord haut panneau bas",      (200,900), 1587),
   ("bord bas panneau bas",       (200,900), 1849),
   ("filet haut boite CTA",       (200,900), 1885),
   ("filet bas boite CTA",        (200,900), 1969),
   ("filet bas du cadre",         (200,900), 2108),
]
res=[]
for lab,(x0,x1),yc in H:
    a,b=bord(im,x0,x1,yc)
    c=(a+b)/2
    res.append((lab,a,b,c))
    print(f"    {lab:30s} : ext={a:8.3f}  int={b:8.3f}  centre={c:8.3f}   frac(centre)={c%1:.3f}")
print()
print("  --- bords VERTICAUX ---")
V=[("rail gauche du cadre",   (600,1900), 19),
   ("rail droit du cadre",    (600,1900), 1060),
   ("rail gauche carte",      (1000,1500), 80),
   ("rail droit carte",       (1000,1500), 501),
   ("bord gauche boite compt.1",(760,830), 47),
   ("bord droit boite compt.1", (760,830), 357),
   ("bord gauche boite compt.2",(760,830), 384),
   ("bord gauche boite compt.3",(760,830), 720),
   ("bord droit boite compt.3", (760,830), 1031),
]
resv=[]
for lab,(y0,y1),xc in V:
    a,b=bordx(im,y0,y1,xc)
    c=(a+b)/2; resv.append((lab,a,b,c))
    print(f"    {lab:30s} : ext={a:8.3f}  int={b:8.3f}  centre={c:8.3f}   frac(centre)={c%1:.3f}")
print()
cy=[c for _,_,_,c in res]; cx=[c for _,_,_,c in resv]
print("  --- recherche d'un pas commun ---")
for lab,vals in (("centres des 20 bords horizontaux", cy),
                 ("centres des 9 bords verticaux", cx),
                 ("les 4 tuiles (bords hauts)", [res[7][3],res[9][3],res[10][3],res[11][3]])):
    p,r=pas_commun(vals)
    print(f"    {lab:36s} : meilleur pas = {p:.4f} px, residu max = {r:.3f} px")
print()
print("  [ctrl positif] serie construite sur 107,5 :", pas_commun([107.5*k+0.0 for k in range(1,9)]))
random.seed(7)
print("  [ctrl negatif] 20 valeurs aleatoires        :", pas_commun([random.uniform(400,2100) for _ in range(20)]))
