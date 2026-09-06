import sys; sys.path.insert(0,'.')
from lib import *
from statistics import median
print("=== m25 : fut median (largeur de trait) — zones LOCALISEES automatiquement ===")
def zone_encre(im,x0,y0,x1,y1,frac=0.55):
    p=px(im)
    L=[[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat=sorted(v for r in L for v in r); fond=plat[len(plat)//5]; haut=plat[-max(1,len(plat)//120)]
    s=fond+frac*(haut-fond)
    pts=[(x0+i,y0+j) for j,r in enumerate(L) for i,v in enumerate(r) if v>=s]
    xs=[a for a,_ in pts]; ys=[b for _,b in pts]
    return min(xs),min(ys),max(xs)+1,max(ys)+1,s,fond,haut
def futs(im,x0,y0,x1,y1,s):
    p=px(im); runs=[]
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1):
            if lum(p[x,y])>=s: n+=1
            else:
                if n>=2: runs.append(n)
                n=0
        if n>=2: runs.append(n)
    return runs
def cmp(nom, imr,zr, imc,zc, frac=0.55):
    a=zone_encre(imr,*zr,frac=frac); b=zone_encre(imc,*zc,frac=frac)
    ra=futs(imr,a[0],a[1],a[2],a[3],a[4]); rb=futs(imc,b[0],b[1],b[2],b[3],b[4])
    ma, mb = median(ra), median(rb)
    print(f"  {nom}")
    print(f"     REF boite x{a[0]}..{a[2]-1} y{a[1]}..{a[3]-1} (cap {a[3]-a[1]}) seuil={a[4]:.0f}  n_runs={len(ra)} fut median={ma}")
    print(f"     JEU boite x{b[0]}..{b[2]-1} y{b[1]}..{b[3]-1} (cap {b[3]-b[1]}) seuil={b[4]:.0f}  n_runs={len(rb)} fut median={mb}")
    print(f"     -> fut {100*(mb/ma-1):+.1f} %")
ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
cmp("CTA caps (gras)",            ref,(60,1975,1020,2025),  cap,(56,2010,1024,2060))
cmp("chiffres compteur 1 (gras)", ref,(150,715,262,770),    cap,(152,742,258,792), frac=0.75)
cmp("sous-titre caps (gras)",     ref,(240,585,470,610),    cap,(246,621,478,646))
cmp("libelle compteur (gras)",    ref,(78,780,318,800),     cap,(70,806,312,826))
cmp("tuile « col ouvert » (gras)",ref,(620,1018,770,1046),  cap,(614,1013,764,1041))
cmp("titre serif panneau (gras)", ref,(88,1715,706,1765),   cap,(84,1757,700,1807))
cmp("paragraphe (TEMOIN maigre)", ref,(88,1786,955,1818),   cap,(84,1824,951,1856))
cmp("sous-texte tuile (TEMOIN)",  ref,(620,1050,800,1076),  cap,(614,1044,794,1070))
