# m36 - SENS DE L'AIGUILLE du manometre (piege documente au socle : une aiguille inversee
# satisfait toutes les gardes de "valeurs distinctes / croissantes").
# CONVENTION D'ANGLE : 0 deg = vers le HAUT depuis le pivot ; POSITIF = HORAIRE.
# On repere : le PIVOT (disque or #b08d3e), l'ARC FROID (cyan #7fd4d9) et l'ARC CHAUD
# (braise #e0664a), puis l'AIGUILLE (encre creme claire, la plus claire du cadran).
# CONTROLE : l'arc froid doit sortir a GAUCHE (angle negatif) et l'arc chaud a DROITE des DEUX
# cotes ; si ce n'est pas le cas, c'est l'instrument qui est faux.
from PIL import Image
import math, statistics
CAN=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
CAP=Image.open('../capture-1080x2400.png').convert('RGB')
print('canon',CAN.size,'capture',CAP.size)
def L(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
def etude(im,K,lab):
    px=im.load(); W,H=im.size
    cx0,cy0=196.0*K,39.0*K            # centre du medaillon (CSS 196 ; 7+64/2 = 39)
    R=int(30*K)
    def sel(pred):
        return [(x,y) for y in range(int(cy0-R),int(cy0+R)) for x in range(int(cx0-R),int(cx0+R))
                if (x-cx0)**2+(y-cy0)**2 < R*R and pred(px[x,y])]
    pivot=sel(lambda p: abs(p[0]-176)<26 and abs(p[1]-141)<26 and abs(p[2]-62)<32)
    if pivot:
        pxm=statistics.median([p[0] for p in pivot]); pym=statistics.median([p[1] for p in pivot])
    else:
        pxm,pym=cx0,cy0+int(6*K)
    def ang(x,y):   # 0 = vers le HAUT, positif = HORAIRE
        return math.degrees(math.atan2(x-pxm, pym-y))
    froid=sel(lambda p: p[2]>=p[1]>p[0] and (p[1]-p[0])>18 and L(p)>60)
    chaud=sel(lambda p: p[0]>p[1]>=p[2] and (p[0]-p[1])>28 and L(p)>60)
    aig=sel(lambda p: min(p)>150 and max(p)-min(p)<40)
    print(f'  {lab}  pivot=({pxm:.0f},{pym:.0f}) px')
    for nom,s in (('arc FROID (cyan)',froid),('arc CHAUD (braise)',chaud),('AIGUILLE (creme clair)',aig)):
        if len(s)<10: print(f'     {nom:24s} n={len(s)} — insuffisant'); continue
        a=sorted(ang(x,y) for x,y in s)
        # pour l'aiguille : angle du point le PLUS LOIN du pivot
        far=max(s,key=lambda p:(p[0]-pxm)**2+(p[1]-pym)**2)
        d=math.hypot(far[0]-pxm,far[1]-pym)
        print(f'     {nom:24s} n={len(s):5d}  angles p10 {a[len(a)//10]:+7.1f}  median {a[len(a)//2]:+7.1f}  p90 {a[9*len(a)//10]:+7.1f}   bout le plus loin : {ang(*far):+7.1f} deg a {d/K:.1f} CSS')
etude(CAN,CAN.size[0]/392.,'canon  ')
etude(CAP,CAP.size[0]/392.,'capture')
