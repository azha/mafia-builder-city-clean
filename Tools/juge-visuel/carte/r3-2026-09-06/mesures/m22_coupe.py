# m22 - COUPES de luminance a travers les fûts, pour trancher l'epaisseur de trait sans dependre
# d'une convention de bord discutable. On imprime le profil brut L(x) sur une ligne qui traverse
# les fûts de SARNES et de LE VERRE, cote maquette et cote jeu (ligne homologue par le recalage).
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'cap',cap.size)
def coupe(px,W,y,x0,x1,lab):
    vals=[int(round(L(px[x,y]))) for x in range(x0,x1)]
    print(f'  {lab} y={y} x={x0}..{x1-1}')
    print('    '+' '.join('%3d'%v for v in vals))
# SARNES : centre d'encre ref (908, 460) environ ; on coupe au milieu de la capitale
for (nom,xr,yr,w) in [('SARNES',862,459,70),('LE VERRE',900,1380,70),('PONT-GRIS',860,1908,70)]:
    print(f'--- {nom} ---')
    coupe(R,1080,yr,xr,xr+w,'REF')
    cx,cy=r2c(xr,yr)
    coupe(C,1080,int(round(cy)),int(round(cx)),int(round(cx))+w,'CAP')
