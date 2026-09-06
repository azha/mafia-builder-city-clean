# m45 — couleur du filet du bandeau : pic sur 40 colonnes, hors medaillon et hors barre de ratio
from lib import *
def filet_cols(im,y0,y1,xs,s,label):
    cols=[]
    for xc in xs:
        x=int(xc*s)
        best=max(((y,im.getpixel((x,y))) for y in range(y0,y1)), key=lambda t:t[1][0]-t[1][2])
        cols.append(best[1])
    m=tuple(int(median([c[k] for c in cols])) for k in range(3))
    mx=max(cols,key=lambda c:lum(c))
    print(f"    {label}: n={len(cols)} colonnes ; couleur MEDIANE du pic {m} L={lum(m):.1f} ; pic le plus clair {mx}")
    return m
print("== m45 couleur du filet du bandeau ==")
r=load(REF); c=load(CAP19); d=load(DIS24)
XS=[x for x in range(240,360,4)]   # x 240..356 CSS : hors medaillon (162..229) et hors ratio (64..165)
filet_cols(r,148,160,XS,S_REF,'REFERENCE (y 49..53 CSS)')
filet_cols(c,132,146,XS,S_CAP,'JEU 1920 (y 48..53 CSS)')
filet_cols(d,132,146,XS,S_CAP,'JEU district 2400 (y 48..53 CSS)')
print()
print("  couleur du CERCLAGE du medaillon au sommet (trait horizontal)")
print(f"    REF : {r.getpixel((588,29))} {r.getpixel((588,30))} {r.getpixel((588,31))}")
print(f"    JEU : {d.getpixel((539,20))} {d.getpixel((539,21))} {d.getpixel((539,22))} {d.getpixel((539,23))}")
