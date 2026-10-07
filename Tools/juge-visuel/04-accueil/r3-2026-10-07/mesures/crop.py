# Outil de decoupe : imprime la taille de chaque image lue (preuve de lecture du bon fichier).
import sys
from PIL import Image
src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
z = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
im = Image.open(src)
print("LU", src, im.size, im.mode)
c = im.crop((x0, y0, x1, y1))
if z != 1.0:
    c = c.resize((int(c.width*z), int(c.height*z)), Image.LANCZOS)
c.save(out)
print("ECRIT", out, c.size)
