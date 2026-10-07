import sys
from PIL import Image
src, dst, x0,y0,x1,y1 = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
sc = float(sys.argv[7]) if len(sys.argv)>7 else 1.0
im = Image.open(src); print(src, im.size)
c = im.crop((x0,y0,x1,y1))
if sc!=1.0: c = c.resize((int(c.width*sc), int(c.height*sc)), Image.LANCZOS)
c.save(dst); print(dst, c.size)
