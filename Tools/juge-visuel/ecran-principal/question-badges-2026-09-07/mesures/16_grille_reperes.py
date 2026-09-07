# Tuile avec grille de reperes tous les 50 px (labels tous les 100) : permet de LIRE des coordonnees
# sur l'image a l'oeil, et de rendre chaque boite de batiment verifiable par le lecteur.
import sys
from PIL import Image, ImageDraw
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC)
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
x0,y0,x1,y1,z,out = int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),sys.argv[6]
c=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*z,(y1-y0)*z),Image.NEAREST)
d=ImageDraw.Draw(c)
for X in range(x0-(x0%50), x1+1, 50):
    px_=(X-x0)*z
    if 0<=px_<c.width:
        d.line([px_,0,px_,c.height],fill=(255,0,255) if X%100==0 else (120,0,120),width=1)
        if X%100==0: d.text((px_+2,2),str(X),fill=(255,0,255))
for Y in range(y0-(y0%50), y1+1, 50):
    py_=(Y-y0)*z
    if 0<=py_<c.height:
        d.line([0,py_,c.width,py_],fill=(255,0,255) if Y%100==0 else (120,0,120),width=1)
        if Y%100==0: d.text((2,py_+2),str(Y),fill=(255,0,255))
c.save(out)
print(f'ecrit {out} : source=({x0},{y0})-({x1},{y1}) zoom={z} taille={c.size}')
