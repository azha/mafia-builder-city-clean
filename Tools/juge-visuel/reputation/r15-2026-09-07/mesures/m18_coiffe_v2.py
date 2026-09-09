"""m18 — coiffe v2. m17 a rendu un resultat UNIFORME (124/129/130 rangees = TOUTES) :
l'instrument mesurait la frange d'anti-crenelage, pas le contour. Correction : on saute
3 px de frange, puis on classe le pixel a 4 px du bord de peau.
  SOMBRE : (B-R) <= 12 et lum < 45  |  FOND : (B-R) >= 15
Controle positif : dans la REFERENCE la coiffe descend sur les tempes -> SOMBRE attendu
                   aux 10/15/20 % de la hauteur du visage.
Controle negatif : a 70 % (joue basse) la reference doit deja etre au FOND d'un cote au moins
                   -> l'instrument doit savoir dire FOND.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def sombre(c): return (c[2]-c[0])<=12 and lum(c)<45
def fond(c):   return (c[2]-c[0])>=15 and lum(c)<45
def peau(c): return max(abs(c[0]-185),abs(c[1]-173),abs(c[2]-146))<=20
def classe(c): return 'SOMBRE' if sombre(c) else ('FOND' if fond(c) else '?')
CAS={
 'reference-1080x2102.png': (90,500,1020,1330),
 'capture-1080x2400.png'  : (86,498,1020,1360),
 'capture-1080x1920.png'  : (86,498, 788,1128),
}
for nom,(x0,x1,y0,y1) in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    lig={}
    for y in range(y0,y1+1):
        xs=[x for x in range(x0,x1+1) if peau(p[x,y])]
        if xs: lig[y]=(min(xs),max(xs))
    ys=sorted(lig); larg={y:lig[y][1]-lig[y][0]+1 for y in ys}; lmax=max(larg.values())
    ycou=next((y for y in ys if y>ys[0]+40 and larg[y]<0.45*lmax), None)
    yv0,yv1=ys[0],(ycou-1 if ycou else ys[-1]); hv=yv1-yv0+1
    print(f"  visage y{yv0}..{yv1} (h={hv}) largeur max {lmax}")
    nS=0
    for pc in (5,10,15,20,30,50,70):
        y=yv0+int(hv*pc/100)
        if y not in lig: continue
        xg,xd=lig[y]
        cg=classe(p[max(x0,xg-4),y]); cd=classe(p[min(x1,xd+4),y])
        # longueur du run sombre a gauche/droite en partant de 4 px
        g=0
        while xg-4-g>x0 and sombre(p[xg-4-g,y]): g+=1
        d=0
        while xd+4+d<x1 and sombre(p[xd+4+d,y]): d+=1
        if cg=='SOMBRE': nS+=1
        if cd=='SOMBRE': nS+=1
        print(f"    {pc:2d}% (y={y}) : gauche a 4px = {cg:6s} (run {g:3d} px) | droite a 4px = {cd:6s} (run {d:3d} px)")
    print(f"  => flancs SOMBRES sur {nS}/14 sondes")
    # largeur de la silhouette sombre par rangee, au-dessus et dans le visage
    print("  largeur de la silhouette SOMBRE par rangee (sommet -> bas du visage) :")
    for y in range(yv0-60, yv1+1, 12):
        xs=[x for x in range(x0,x1+1) if sombre(p[x,y])]
        w=(max(xs)-min(xs)+1) if xs else 0
        sk=(lig[y][1]-lig[y][0]+1) if y in lig else 0
        print(f"    y={y:5d} : sombre {w:4d} px | peau {sk:4d} px")
