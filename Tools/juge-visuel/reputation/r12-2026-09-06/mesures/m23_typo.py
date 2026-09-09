import sys; sys.path.insert(0,'.')
from lib import *
print("=== m23 : typographie — hauteur de capitale sur une portion SANS accent ni apostrophe ===")
def encre_bbox(im, x0,y0,x1,y1, frac=0.45):
    p=px(im)
    L=[[lum(p[x,y]) for x in range(x0,x1)] for y in range(y0,y1)]
    plat=sorted(v for r in L for v in r); fond=plat[len(plat)//5]; haut=plat[-max(1,len(plat)//100)]
    s=fond+frac*(haut-fond)
    pts=[(x0+i,y0+j) for j,r in enumerate(L) for i,v in enumerate(r) if v>=s]
    xs=[a for a,_ in pts]; ys=[b for _,b in pts]
    # nombre de lettres = groupes de colonnes
    cols=sorted(set(xs)); g=[]
    for x in cols:
        if g and x-g[-1][-1]<=2: g[-1].append(x)
        else: g.append([x])
    return (min(xs),max(xs),min(ys),max(ys),len(pts),len(g),round(fond,1),round(haut,1))

def cmp(nom, imr, zr, imc, zc):
    a=encre_bbox(imr,*zr); b=encre_bbox(imc,*zc)
    print(f"  {nom}")
    print(f"     REF x{a[0]}..{a[1]} ({a[1]-a[0]+1})  capitale {a[3]-a[2]+1} px  encre {a[4]} px  {a[5]} groupes (fond {a[6]} encre {a[7]})")
    print(f"     JEU x{b[0]}..{b[1]} ({b[1]-b[0]+1})  capitale {b[3]-b[2]+1} px  encre {b[4]} px  {b[5]} groupes (fond {b[6]} encre {b[7]})")
    print(f"     -> capitale {100*((b[3]-b[2]+1)/(a[3]-a[2]+1)-1):+.1f} % ; largeur {100*((b[1]-b[0]+1)/(a[1]-a[0]+1)-1):+.1f} % ; encre a boite egale : {b[4]/a[4]*(a[1]-a[0]+1)*(a[3]-a[2]+1)/((b[1]-b[0]+1)*(b[3]-b[2]+1)):.3f}")

ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
cmp("titre « Le miroir » (serif or)",        ref,(300,505,780,570),  cap,(300,537,780,602))
cmp("sous-titre, portion « LIEUTENANT »",    ref,(232,585,470,614),  cap,(240,620,478,650))
cmp("libelle « REGLES DONNEES »",            ref,(78,742,318,772),   cap,(70,770,312,800))
cmp("titre serif « Rien n'a encore deteint »",ref,(88,1715,706,1765),cap,(84,1757,700,1807))
cmp("paragraphe, 1re ligne (temoin)",        ref,(88,1786,955,1818), cap,(84,1824,951,1856))
cmp("« Il vous ecoute » (serif vert)",       ref,(170,1428,420,1464),cap,(166,1456,416,1492))
cmp("tuile 1, « col ouvert »",               ref,(590,1018,760,1046),cap,(588,1013,758,1041))
cmp("tuile 1, sous-texte (temoin)",          ref,(590,1050,800,1076),cap,(588,1044,798,1070))
