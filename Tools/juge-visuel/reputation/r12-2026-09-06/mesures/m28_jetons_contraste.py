import sys; sys.path.insert(0,'.')
from lib import *
print("=== m28 : couverture des JETONS + contrastes WCAG ===")
ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
JETONS=[('or vif (titre)',(242,201,106)),('or filet',(176,141,62)),('cyan chiffre',(127,212,217)),
        ('creme (col)',(234,224,200)),('peau',(185,173,146)),('vert (verdict)',(125,179,106)),
        ('creme texte',(230,224,209)),('gris muet',(138,146,157))]
def couverture(im, box, col, tol=10):
    p=px(im); x0,y0,x1,y1=box; n=0; tot=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            tot+=1
            c=p[x,y]
            if all(abs(c[i]-col[i])<=tol for i in range(3)): n+=1
    return 100*n/tot
BR=(21,452,1059,2079); BC=(18,482,1062,2110)
print(f"  {'jeton':20s} {'couleur':>18s} {'REF %':>8s} {'JEU %':>8s} {'ecart pt':>9s}")
for nom,col in JETONS:
    a=couverture(ref,BR,col); b=couverture(cap,BC,col)
    print(f"  {nom:20s} {str(col):>18s} {a:8.3f} {b:8.3f} {b-a:+9.3f}")
print()
print("=== contrastes WCAG (encre au coeur / fond local median) ===")
def coeur(im, box):
    p=px(im); x0,y0,x1,y1=box
    L=[(lum(p[x,y]),p[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    L.sort()
    n=len(L)
    fond=L[n//5][1]
    haut=[c for _,c in L[-max(3,n//50):]]
    m=tuple(sorted(v[i] for v in haut)[len(haut)//2] for i in range(3))
    return m, fond
CAS=[('titre « Le miroir »', (328,505,742,560),(332,537,750,592)),
     ('sous-titre enseigne', (241,585,447,610),(247,621,449,646)),
     ('chiffre cyan',        (171,725,237,762),(173,749,234,786)),
     ('libelle compteur',    (88,780,317,797),(87,806,311,823)),
     ('« col ouvert »',      (626,1025,769,1045),(620,1019,763,1039)),
     ('sous-texte tuile',    (626,1060,799,1075),(620,1052,793,1069)),
     ('titre du panneau bas',(91,1721,703,1759),(85,1763,691,1800)),
     ('paragraphe',          (90,1790,951,1813),(84,1829,942,1852)),
     ('CTA',                 (234,1980,842,2008),(237,2015,843,2043)),
     ('« Il vous ecoute »',  (174,1433,413,1458),(170,1461,411,1486)),
     ('LT. …, VOTRE LIEUT.', (180,913,405,930),(181,935,420,952)),
    ]
print(f"  {'texte':24s} {'encre REF':>16s} {'fond REF':>14s} {'C REF':>7s}   {'encre JEU':>16s} {'fond JEU':>14s} {'C JEU':>7s}  delta")
for nom,zr,zc in CAS:
    er,fr=coeur(ref,zr); ec,fc=coeur(cap,zc)
    a=contraste(er,fr); b=contraste(ec,fc)
    print(f"  {nom:24s} {str(er):>16s} {str(fr):>14s} {a:7.2f}   {str(ec):>16s} {str(fc):>14s} {b:7.2f}  {b-a:+.2f}")
