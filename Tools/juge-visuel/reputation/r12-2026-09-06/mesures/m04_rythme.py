import sys; sys.path.insert(0,'.')
from lib import *

def frontieres(im, x0, x1, y0, y1, seuil=6):
    """lignes ou la moyenne de luminance saute par rapport a la ligne precedente"""
    p = px(im)
    moy=[]
    for y in range(y0,y1):
        s=0
        for x in range(x0,x1,2): s+=lum(p[x,y])
        moy.append(s/len(range(x0,x1,2)))
    out=[]
    for i in range(1,len(moy)):
        d = moy[i]-moy[i-1]
        if abs(d) > seuil: out.append((y0+i, round(moy[i-1],1), round(moy[i],1), round(d,1)))
    return out

CAS = [
 ('REF   ','../reference-1080x2102.png', 452, 2078, 1626),
 ('C2400 ','../capture-1080x2400.png',   482, 2109, 1627),
 ('C1920 ','../capture-1080x1920.png',   250, 1629, 1379),
 ('S2400 ','../capture-ecran-seul-1080x2400.png', 730, 2109, 1379),
]
print("=== m04 : frontieres horizontales dans le cadre (x = pleine largeur interieure) ===")
for nom,f,ct,cb,h in CAS:
    im = ouvrir(f)
    fr = frontieres(im, 40, 1040, ct, cb, seuil=5)
    # regrouper
    g=[]
    for y,a,b,d in fr:
        if g and y-g[-1][0][0] <= 4: g[-1].append((y,a,b,d))
        else: g.append([(y,a,b,d)])
    res=[(x[0][0], round(sum(t[3] for t in x),1)) for x in g]
    print(f"  {nom} cadre {ct}..{cb} h={h}")
    print(f"    frontieres (y absolu, y relatif au haut du cadre, %h) :")
    for y,d in res:
        print(f"      y={y:5d}  rel={y-ct:5d}  {100*(y-ct)/h:6.2f}%  saut={d:+.1f}")
