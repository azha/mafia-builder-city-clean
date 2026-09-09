import sys; sys.path.insert(0,'.')
from lib import *
print("=== m36 : le panneau elastique a 1920 — d'ou vient le retrecissement ? ===")
def bords(im,x0,x1,y0,y1,dl=2.5):
    p=px(im); prof=[sum(lum(p[x,y]) for x in range(x0,x1))/(x1-x0) for y in range(y0,y1)]
    out=[]
    for i in range(2,len(prof)-2):
        if prof[i]-min(prof[i-2],prof[i+2])>dl and prof[i]>=prof[i-1] and prof[i]>=prof[i+1]:
            if out and y0+i-out[-1]<=4: continue
            out.append(y0+i)
    return out
def bornes_or(im,x,y0,y1):
    p=px(im); ys=[y for y in range(y0,y1) if est_or(p[x,y])]
    return (min(ys),max(ys))
for nom,f,ct,er0,er1 in [('C2400','../capture-1080x2400.png',482,876,1655),
                         ('C1920','../capture-1080x1920.png',250,644,1316)]:
    im=ouvrir(f)
    t=bords(im,960,995,er0+90,er1-30)
    c=bornes_or(im,80,er0,er1)
    print(f"  {nom} elast abs {er0}..{er1} (h={er1-er0+1}, rel {er0-ct}..{er1-ct})")
    print(f"       bords detectes (colonne vide des tuiles) : {t}  -> rel {[y-ct for y in t]}")
    print(f"       carte portrait (filet or) : {c[0]}..{c[1]} h={c[1]-c[0]+1} rel {c[0]-ct}..{c[1]-ct}")
    print(f"       vide sous la carte : {er1-c[1]} px")
