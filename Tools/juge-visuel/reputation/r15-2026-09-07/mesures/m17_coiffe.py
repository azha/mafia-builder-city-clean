"""m17 — la coiffe (M7 du r14), avec un discriminant de TEINTE et non de luminance :
  SOMBRE (cheveux/torse) : (B-R) <= 12 et lum < 45     [ref (22,25,27) / jeu (22,22,28)]
  FOND de carte          : (B-R) >= 15                 [ref (17,24,35) / jeu (13,22,34)]
  PEAU                   : |c-(185,173,146)| <= 20
Controle positif : la PEAU doit former un bloc unique de >120 px de large.
Controle negatif : sur le FOND de la carte, le test SOMBRE doit rendre 0.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def sombre(c): return (c[2]-c[0])<=12 and lum(c)<45
def peau(c): return max(abs(c[0]-185),abs(c[1]-173),abs(c[2]-146))<=20
CAS={
 'reference-1080x2102.png': (90,500,1020,1330),
 'capture-1080x2400.png'  : (86,498,1020,1360),
 'capture-1080x1920.png'  : (86,498, 788,1128),
}
for nom,(x0,x1,y0,y1) in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    print(f"  [ctrl negatif] SOMBRE sur le fond de carte (x{x0+4},y{y0}) = {sombre(p[x0+4,y0])} (attendu False)")
    lig={}
    for y in range(y0,y1+1):
        xs=[x for x in range(x0,x1+1) if peau(p[x,y])]
        if xs: lig[y]=(min(xs),max(xs),len(xs))
    ys=sorted(lig)
    # visage = du haut jusqu'a la chute de largeur (cou)
    larg={y:lig[y][1]-lig[y][0]+1 for y in ys}
    lmax=max(larg.values())
    ycou=None
    for y in ys:
        if y>ys[0]+40 and larg[y]<0.45*lmax: ycou=y; break
    yv0,yv1=ys[0],(ycou-1 if ycou else ys[-1])
    hv=yv1-yv0+1
    print(f"  VISAGE : y{yv0}..{yv1} (h={hv})  largeur max = {lmax} px")
    print("  epaisseur laterale de SOMBRE au bord de la peau (gauche/droite) :")
    prof=[]
    for pc in (5,10,15,20,30,50,70):
        y=yv0+int(hv*pc/100)
        if y not in lig: prof.append((pc,None,None)); continue
        xg,xd,_=lig[y]
        g=0
        while xg-1-g>x0 and sombre(p[xg-1-g,y]): g+=1
        d=0
        while xd+1+d<x1 and sombre(p[xd+1+d,y]): d+=1
        prof.append((pc,g,d))
        print(f"    {pc:2d}% (y={y}) : {g:3d} / {d:3d} px")
    # rangees ou la peau touche le FOND sans sombre
    n=0; exs=[]
    for y in range(yv0,yv1+1):
        if y not in lig: continue
        xg,xd,_=lig[y]
        if not sombre(p[xg-1,y]) or not sombre(p[xd+1,y]):
            n+=1; exs.append(y)
    print(f"  rangees ou la peau touche le fond SANS sombre : {n}  {exs[:12]}")
    # hauteur sous le sommet de la coiffe ou 80% de la largeur max de sombre est atteinte
    sl={}
    for y in range(y0,yv1+1):
        xs=[x for x in range(x0,x1+1) if sombre(p[x,y])]
        if xs: sl[y]=max(xs)-min(xs)+1
    if sl:
        smax=max(sl.values()); ysom=min(sl)
        y80=[y for y in sorted(sl) if sl[y]>=0.8*smax]
        print(f"  SILHOUETTE sombre : sommet y={ysom}, largeur max={smax} px, 80% atteint a y={y80[0]} ({y80[0]-ysom} px sous le sommet)")
