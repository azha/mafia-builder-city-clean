# m18 — fond du cadran : gradient radial directionnel ou aplat ?
# Methode : mediane par SECTEUR de 45 deg dans l'anneau 0.58..0.72 R, pixels d'arc et de texte exclus
#   (exclusion : L>70 ou classe teal/braise). Controle positif : le canon DOIT montrer un gradient
#   (CSS : radial-gradient(circle at 38% 30%, #2c3242, #141a26 60%, #0a0e16)).
from lib import *
import math, json
C=json.load(open('centres.json'))
def classify(c):
    r,g,b=c
    if g>r+8 and b>r+8 and g>45: return 'teal'
    if r>g+25 and r>b+25 and r>70: return 'braise'
    return None
def sectors(im,cx,cy,R,label,rin=0.58,rout=0.72):
    buck={i:[] for i in range(8)}
    for y in range(int(cy-R),int(cy+R)):
        for x in range(int(cx-R),int(cx+R)):
            if not(0<=x<im.size[0] and 0<=y<im.size[1]): continue
            dx=x-cx;dy=y-cy;rr=math.hypot(dx,dy)/R
            if not(rin<=rr<=rout): continue
            c=im.getpixel((x,y))
            if lum(c)>70 or classify(c): continue
            th=(math.degrees(math.atan2(-dy,dx)))%360
            buck[int(th//45)].append(c)
    print(f"    {label} — anneau {rin}..{rout} R, secteurs de 45 deg")
    meds=[]
    for i in range(8):
        v=buck[i]
        if len(v)<15: print(f"       secteur {i*45:3d}-{i*45+45:3d} : n={len(v)} (insuffisant)"); continue
        m=tuple(int(median([c[k] for c in v])) for k in range(3))
        meds.append((i,m))
        print(f"       secteur {i*45:3d}-{i*45+45:3d} : n={len(v):4d}  {m}  L={lum(m):5.1f}")
    if meds:
        amp=tuple(max(m[1][k] for m in meds)-min(m[1][k] for m in meds) for k in range(3))
        Ls=[lum(m[1]) for m in meds]
        print(f"       AMPLITUDE inter-secteurs : RGB {amp}   L {max(Ls)-min(Ls):.1f}")
        hi=max(meds,key=lambda m:lum(m[1])); lo=min(meds,key=lambda m:lum(m[1]))
        print(f"       plus clair : secteur {hi[0]*45}-{hi[0]*45+45}  |  plus sombre : secteur {lo[0]*45}-{lo[0]*45+45}")
print("== m18 fond du cadran ==")
r=load(REF); d=load(DIS24); c=load(CAP19)
sectors(r,*C['ref'],'REFERENCE (controle positif : gradient attendu, clair en haut-gauche = secteur 135-180)')
sectors(d,*C['dis24'],'JEU district 2400')
sectors(c,*C['cap19'],'JEU fiche 1920')
