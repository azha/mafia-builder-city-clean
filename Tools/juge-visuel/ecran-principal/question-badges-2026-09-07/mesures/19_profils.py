# Profils de couleur autour d'un ancrage : ligne horizontale, ligne verticale, et la distance
# au premier pixel "clair" (bord de parapet / arete de toit) le long de rayons.
from PIL import Image
import math,sys
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
def prof(nom,ax,ay,dxs,axis):
    print(f'--- {nom} : profil {axis} ---')
    for t in dxs:
        x,y=(int(ax)+t,int(ay)) if axis=='H' else (int(ax),int(ay)+t)
        if 0<=x<W and 0<=y<H:
            r,g,b=px[x,y]; L=(r*299+g*587+b*114)//1000
            print(f'   {axis}{t:+4d} ({x},{y}) rgb=({r:3d},{g:3d},{b:3d}) L={L:3d}')
prof('G5 ancrage (347,765)',347,765,range(-40,41,2),'H')
prof('G5 ancrage (347,765)',347,765,range(-40,41,2),'V')
