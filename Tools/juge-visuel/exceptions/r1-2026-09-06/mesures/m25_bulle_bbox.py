# m25 — bbox EXACTE de la bulle et du médaillon .parle de la référence (le remplissage est un
# DÉGRADÉ : le repérer par sa couleur du haut sous-estime la boîte — piège corrigé ici).
# Contrôle : la bulle et le médaillon .parle doivent avoir le MÊME bas (align-items:flex-end).
from util import *
print("== m25 bulle (bbox exacte) ==")
ref=ouvrir(REF); px=ref.load()
# colonne x=700 : traverser la bulle de haut en bas
col=[(y,px[700,y]) for y in range(1150,1700)]
def bleute(c): return c[2]>c[0]+6 and 12<=c[2]<=60
ys=[y for y,c in col if bleute(c)]
print(f"  x=700 : px 'bleutés' de y={min(ys)} à y={max(ys)} ({len(ys)} lignes)")
print("   bas :", [(y,px[700,y]) for y in range(max(ys)-6,max(ys)+8)])
# bord gauche/droit au milieu
ymid=(min(ys)+max(ys))//2
row=[(x,px[x,ymid]) for x in range(250,1080)]
xs=[x for x,c in row if bleute(c)]
print(f"  y={ymid} : px 'bleutés' de x={min(xs)} à x={max(xs)}")
print("   droite :", [(x,px[x,ymid]) for x in range(max(xs)-6,min(1080,max(xs)+8))])
# médaillon .parle : liseré or-vif
import colorsys
pts=[(x,y) for y in range(1350,1700) for x in range(0,300)
     if (lambda c:(lambda h,s,v: 33/360<=h<=58/360 and s>=0.35 and v>=0.55)(*colorsys.rgb_to_hsv(c[0]/255,c[1]/255,c[2]/255)))(px[x,y])]
print(f"  médaillon .parle : liseré or {len(pts)} px bbox=({min(p[0] for p in pts)},{min(p[1] for p in pts)})-({max(p[0] for p in pts)},{max(p[1] for p in pts)})")
a=min(p[0] for p in pts); b=min(p[1] for p in pts); c=max(p[0] for p in pts); d=max(p[1] for p in pts)
print(f"    -> {c-a+1}x{d-b+1} px  (CSS attendu 60x60 -> 216x216)")
# queue de bulle : entre le médaillon (x<=c) et la bulle (x>=min(xs))
print(f"  queue : px bleutés entre x={c+1} et x={min(xs)-1}, y {b}..{d} : "
      f"{sum(1 for y in range(b,d) for x in range(c+1,max(c+2,min(xs))) if bleute(px[x,y]))}")
