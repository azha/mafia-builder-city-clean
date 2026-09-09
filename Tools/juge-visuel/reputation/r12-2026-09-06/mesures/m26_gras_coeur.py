import sys; sys.path.insert(0,'.')
from lib import *
from statistics import median, mean
print("=== m26 : GRAS au COEUR (seuil 75 %) — fut moyen + encre a boite egale ===")
def mesure(im,x0,y0,x1,y1,frac=0.75):
    p=px(im)
    L=[[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat=sorted(v for r in L for v in r); fond=plat[len(plat)//5]; haut=plat[-max(1,len(plat)//120)]
    s=fond+frac*(haut-fond)
    pts=[(x0+i,y0+j) for j,r in enumerate(L) for i,v in enumerate(r) if v>=s]
    if not pts: return None
    xs=[a for a,_ in pts]; ys=[b for _,b in pts]
    bx=(min(xs),min(ys),max(xs),max(ys))
    runs=[]
    for y in range(bx[1],bx[3]+1):
        n=0
        for x in range(bx[0],bx[2]+1):
            if lum(p[x,y])>=s: n+=1
            else:
                if n>=1: runs.append(n)
                n=0
        if n>=1: runs.append(n)
    aire=(bx[2]-bx[0]+1)*(bx[3]-bx[1]+1)
    return dict(bbox=bx, n=len(pts), aire=aire, densite=len(pts)/aire,
                futmoy=mean(runs), futmed=median(runs), nruns=len(runs), seuil=s)
Z=[
 ("CTA caps (gras)",            (60,1975,1020,2025),  (56,2010,1024,2060)),
 ("chiffres compteur 1 (gras)", (150,715,262,770),    (152,742,258,792)),
 ("sous-titre caps (gras)",     (240,585,470,610),    (246,621,478,646)),
 ("libelle compteur (gras)",    (78,780,318,800),     (70,806,312,826)),
 ("tuile « col ouvert » (gras)",(620,1018,770,1046),  (614,1013,764,1041)),
 ("titre serif panneau (gras)", (88,1715,706,1765),   (84,1757,700,1807)),
 ("titre « Le miroir » (gras)", (300,505,780,570),    (300,537,780,602)),
 ("paragraphe (TEMOIN maigre)", (88,1786,955,1818),   (84,1824,951,1856)),
 ("sous-texte tuile (TEMOIN)",  (620,1050,800,1076),  (614,1044,794,1070)),
 ("« Il vous ecoute » (gras)",  (170,1428,420,1464),  (166,1456,416,1492)),
]
ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
print(f"  {'zone':30s} {'densite REF':>11s} {'densite JEU':>11s} {'delta':>8s}   {'fut moy REF':>11s} {'fut moy JEU':>11s} {'delta':>8s}")
for nom,zr,zc in Z:
    a=mesure(ref,*zr); b=mesure(cap,*zc)
    print(f"  {nom:30s} {a['densite']:11.3f} {b['densite']:11.3f} {100*(b['densite']/a['densite']-1):+7.1f}%   {a['futmoy']:11.2f} {b['futmoy']:11.2f} {100*(b['futmoy']/a['futmoy']-1):+7.1f}%")
