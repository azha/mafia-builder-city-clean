"""04 - Reference : bords horizontaux, en partant de la couleur au CENTRE de la ligne
(le cadre telephone + bordure or occupent les 20 premiers px, ce qui piegeait le script 03).
Controle positif : sur y=1000 (echelle des barres), on doit trouver 3 colonnes.
Controle negatif : y=1300 (zone vide) ne doit donner qu'un seul bloc large."""
from PIL import Image
from statistics import median

def runs(path, y, tol=10):
    im = Image.open(path).convert('RGB'); p = im.load(); w,h=im.size
    out=[]; start=0; cur=p[0,y][:3]
    for x in range(1,w):
        c=p[x,y][:3]
        if max(abs(c[i]-cur[i]) for i in range(3))>tol:
            out.append((start,x-1,cur)); start=x; cur=c
    out.append((start,w-1,cur))
    return im.size, [r for r in out if r[1]-r[0]>=4]

for y in [1000, 1300, 500, 760, 1700, 2050]:
    sz, r = runs('../reference-1080x2102.png', y)
    print(f"reference {sz}  y={y}")
    for a,b,c in r: print(f"    x {a:4d}..{b:4d} (l={b-a+1:4d}) {c}")
    print()
