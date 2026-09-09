# -*- coding: utf-8 -*-
"""Decoupes pour inspection visuelle. Chaque sortie imprime sa taille (preuve de lecture)."""
from PIL import Image
import sys
jobs=[
 ("capture-1080x2400.png","c_bandeau",(0,0,1080,250),1.6),
 ("capture-1080x2400.png","c_tete_glob",(0,230,1080,640),1.4),
 ("capture-1080x2400.png","c_coupe",(0,1690,1080,2000),1.6),
 ("capture-1080x2400.png","c_cta",(0,1860,1080,2180),1.5),
 ("capture-1080x2400.png","c_dock",(0,2140,1080,2400),1.6),
 ("capture-1080x2400.png","c_rang",(0,700,1080,880),1.6),
 ("reference-1080x2102.png","r_bas",(0,1760,1080,2102),1.5),
 ("reference-1080x2102.png","r_tete",(0,420,1080,620),1.6),
 ("hud-canon-1176.png","h_bandeau",(0,0,1176,250),1.5),
]
for src,name,box,z in jobs:
    im=Image.open(src).convert('RGB')
    print("OUVERT %s %s"%(src,im.size))
    c=im.crop(box)
    c=c.resize((int(c.width*z),int(c.height*z)),Image.LANCZOS)
    out="mesures/%s.png"%name
    c.save(out)
    print("   -> %s  box=%s  sortie=%s"%(out,box,c.size))
