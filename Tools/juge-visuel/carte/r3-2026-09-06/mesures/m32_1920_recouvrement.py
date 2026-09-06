# m32 - 1920 : quelles parties du CONTENU sont sous le CHROME ?
# Recalage retenu (deux chemins concordants) : s=0.9966, tx=+1.75, ty=-202.25 (optimiseur)
#                                              s=1.0000, tx=+0.70, ty=-206.0  (reperes peints)
# On prend s=0.998, tx=1.2, ty=-204 (moyenne). Bandeau du HUD = 52 CSS x 2,7551 = 143,3 px.
# Le dock : on mesure le HAUT des pastilles sur l'image.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import statistics
c19=Image.open('../capture-1080x1920.png').convert('RGB'); P=c19.load()
c24=Image.open('../capture-1080x2400.png').convert('RGB'); Q=c24.load()
print('cap1920',c19.size,'cap2400',c24.size)
S19,TX19,TY19=0.998,1.2,-204.0
def r2c19(x,y): return x*S19+TX19, y*S19+TY19
BANDEAU=143.3
# haut des pastilles a 1920 : on cherche les anneaux clairs comme a 2400 (44,6 CSS de diametre,
# x 71,5..116,1 CSS -> px 197..320 a 1080 de large)
print('\n--- haut du dock a 1920 : colonne au centre de la 1re pastille (x=259) ---')
col=[(y,P[259,y]) for y in range(1650,1920)]
prev=None
for y,p in col:
    if prev is None or max(abs(p[i]-prev[i]) for i in range(3))>12:
        print(f'   y={y} {p}'); prev=p
print('\n--- meme colonne a 2400 (temoin) ---')
prev=None
for y in range(2150,2400):
    p=Q[259,y]
    if prev is None or max(abs(p[i]-prev[i]) for i in range(3))>12:
        print(f'   y={y} {p}'); prev=p
print('\n--- ou tombent les 18 noms a 1920 ? (ancre de la maquette -> repere 1920) ---')
print(f"{'quartier':19s} {'y ref':>7s} {'y 1920':>7s} {'sous le bandeau ?':>18s}")
for nom,xs,ys,src in NOMS:
    rx,ry=svg2ref(xs,ys)
    cx,cy=r2c19(rx,ry)
    print(f'{nom:19s} {ry:7.1f} {cy:7.1f}')
print('\n--- reperes peints ---')
for lab,(sx,sy) in (('LE PORT',(236,16)),('LE THRENNY',(150,257))):
    rx,ry=svg2ref(sx,sy); cx,cy=r2c19(rx,ry)
    print(f'  {lab:12s} y ref {ry:7.1f} -> y 1920 {cy:7.1f}  ({"SOUS LE BANDEAU" if cy<BANDEAU else "libre"})')
