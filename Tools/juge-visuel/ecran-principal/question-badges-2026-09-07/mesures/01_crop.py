# Découpe une région à pleine résolution, agrandie N fois (NEAREST), pour lecture humaine.
# usage: python3 01_crop.py x0 y0 x1 y1 zoom sortie.png
import sys
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im = Image.open(SRC)
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
x0,y0,x1,y1,z = int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5])
out = sys.argv[6]
c = im.crop((x0,y0,x1,y1))
c = c.resize((c.width*z, c.height*z), Image.NEAREST)
c.save(out)
print(f'ecrit {out} : source=({x0},{y0})-({x1},{y1}) zoom={z} taille={c.size}')
