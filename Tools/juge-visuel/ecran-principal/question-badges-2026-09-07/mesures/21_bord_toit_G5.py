# Ou passe exactement le bord du toit sous G5 ? Pour chaque ligne y, on cherche la transition
# sol sombre (L~52) -> structure claire (L>=80) en balayant de la DROITE vers la GAUCHE,
# sur des lignes HORS du libelle (y >= 778, le libelle occupe 757..768).
from PIL import Image
import math
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
AX,AY=347.5,765.0
pts=[]
print('  y    x_transition (premier L>=80 en venant de la droite)   L avant/apres')
for y in range(772,806,2):
    xt=None
    for x in range(420,280,-1):
        r,g,b=px[x,y]; L=(r*299+g*587+b*114)//1000
        if L>=80:
            xt=x; break
    if xt is not None:
        r0,g0,b0=px[xt+3,y]; L0=(r0*299+g0*587+b0*114)//1000
        r1,g1,b1=px[xt,y]; L1=(r1*299+g1*587+b1*114)//1000
        print(f'  {y}   x={xt}    L(x+3)={L0:3d} -> L(x)={L1:3d}')
        pts.append((xt,y))
# regression lineaire x = a*y + b sur les points
n=len(pts); sy=sum(p[1] for p in pts); sx=sum(p[0] for p in pts)
syy=sum(p[1]*p[1] for p in pts); sxy=sum(p[0]*p[1] for p in pts)
a=(n*sxy-sx*sy)/(n*syy-sy*sy); b=(sx-a*sy)/n
print(f'droite de bord ajustee : x = {a:.4f}*y + {b:.2f}  ({n} points)')
# distance perpendiculaire de l'ancrage a la droite  (x - a*y - b = 0)
d=abs(AX-a*AY-b)/math.sqrt(1+a*a)
print(f'distance perpendiculaire ancrage({AX},{AY}) -> bord de toit = {d:.1f} px')
print(f'cote : x_bord(y={AY}) = {a*AY+b:.1f} ; ancrage x={AX} => ancrage {"A DROITE (hors toit)" if AX> a*AY+b else "A GAUCHE (sur toit)"} du bord')
