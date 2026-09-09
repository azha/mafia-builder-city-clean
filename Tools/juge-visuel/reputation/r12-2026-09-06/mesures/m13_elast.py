import sys; sys.path.insert(0,'.')
from lib import *
print("=== m13 : interieur du panneau elastique — carte, tuiles, vide du pied ===")
def bornes_or_verticales(im, x, y0, y1):
    p=px(im); ys=[y for y in range(y0,y1) if est_or(p[x,y])]
    return (min(ys), max(ys)) if ys else None
def tuiles(im, x0,x1,y0,y1, dl=3.0):
    """bords haut/bas des 4 tuiles via le lisere clair, le long d'une colonne"""
    p=px(im); prof=[sum(lum(p[x,y]) for x in range(x0,x0+18))/18 for y in range(y0,y1)]
    pics=[]
    for i in range(2,len(prof)-2):
        if prof[i]-min(prof[i-2],prof[i+2])>dl and prof[i]>=prof[i-1] and prof[i]>=prof[i+1]:
            if pics and y0+i-pics[-1]<=4: continue
            pics.append(y0+i)
    return pics

CAS=[('REF','../reference-1080x2102.png',452,1626, 84, 850,1611, 545),
     ('JEU','../capture-1080x2400.png',  482,1627, 80, 876,1655, 542)]
for nom,f,ct,h,xcarte,ey0,ey1,xtuile in CAS:
    im=ouvrir(f)
    b = bornes_or_verticales(im, xcarte, ey0, ey1)
    print(f"  {nom} carte portrait (filet or, colonne x={xcarte}) : y {b[0]}..{b[1]}  h={b[1]-b[0]+1}  rel {b[0]-ct}..{b[1]-ct}")
    t = tuiles(im, xtuile, xtuile+18, ey0, ey1)
    print(f"     bords de tuiles (colonne x={xtuile}) : {t}")
    print(f"       -> rel : {[y-ct for y in t]}")
    print(f"     panneau elast : rel {ey0-ct}..{ey1-ct} (h={ey1-ey0+1})")
    if len(t)>=8:
        haut=[t[i] for i in range(0,8,2)]; bas=[t[i] for i in range(1,8,2)]
        hs=[bas[i]-haut[i]+1 for i in range(4)]
        pas=[haut[i+1]-haut[i] for i in range(3)]
        print(f"     hauteurs de tuile = {hs} ; pas = {pas} ; gouttieres = {[haut[i+1]-bas[i]-1 for i in range(3)]}")
        print(f"     VIDE sous la derniere tuile : {ey1-bas[-1]} px = {100*(ey1-bas[-1])/(ey1-ey0+1):.1f} % du panneau")
        print(f"     VIDE sous la carte           : {ey1-b[1]} px")
