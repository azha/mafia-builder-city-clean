# -*- coding: utf-8 -*-
"""Découpe une bande d'une image et l'écrit (pour lecture visuelle). Imprime la taille lue."""
import sys, os
from PIL import Image
src, dst, x0, y0, x1, y1 = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
im = Image.open(src).convert('RGB')
print('lu : %s %dx%d  →  crop (%d,%d,%d,%d)' % (os.path.basename(src), im.size[0], im.size[1], x0, y0, x1, y1))
c = im.crop((x0, y0, x1, y1))
c.save(dst)
print('écrit : %s %dx%d' % (dst, c.size[0], c.size[1]))
