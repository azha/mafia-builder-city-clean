# -*- coding: utf-8 -*-
"""02 - decoupes de lecture (zoom x1 ou x2) pour inspection visuelle."""
from PIL import Image
import os
def crop(src,box,dst,scale=1):
    im=Image.open(src).convert('RGB')
    print("  ouvert %-34s %s" % (os.path.basename(src), im.size))
    c=im.crop(box)
    if scale!=1: c=c.resize((int(c.size[0]*scale),int(c.size[1]*scale)),Image.LANCZOS)
    c.save(dst); print("   ->",dst,c.size,"box",box)
C='../capture-1080x2400.png'; P='../capture-planche-1080x2400.png'; R='../reference-㉓-1080x2102.png'
crop(C,(0,0,1080,340),'c-chrome-haut.png',1)
crop(P,(0,0,1080,340),'p-chrome-haut.png',1)
crop(C,(0,2050,1080,2400),'c-chrome-bas.png',1)
crop(R,(0,0,1080,460),'r-chrome-haut.png',1)
crop(C,(0,330,1080,560),'c-banniere.png',1)
crop(C,(0,520,1080,920),'c-carte1.png',1)
crop(R,(0,600,1080,1200),'r-planche1.png',1)
crop(R,(0,1770,1080,2102),'r-voix.png',1)
