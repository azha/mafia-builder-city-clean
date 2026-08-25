# -*- coding: utf-8 -*-
"""Vignettes cote a cote (canon | 1920 | 2400) ramenees a la MEME echelle CSS (x3)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from PIL import Image
OUT=os.path.join(D,'mesures')

def crop(im,c,x0,y0,x1,y1,scale=3.0):
    box=(int(x0*c),int(y0*c),int(x1*c),int(y1*c))
    r=im.crop(box)
    w=int((x1-x0)*scale); h=int((y1-y0)*scale)
    return r.resize((w,h), Image.LANCZOS)

def trio(name, zones):
    ims=[]
    for path,(x0,y0,x1,y1) in zones:
        im=open_img(path); ims.append(crop(im,css(im),x0,y0,x1,y1))
    W=max(i.width for i in ims); H=sum(i.height for i in ims)+20*len(ims)
    out=Image.new('RGB',(W,H),(90,20,20))
    y=0
    for i in ims:
        out.paste(i,(0,y)); y+=i.height+20
    p=os.path.join(OUT,name); out.save(p); print("  ecrit",p,out.size)

trio('cmp-bandeau.png',[(CANON,(0,0,392,100)),(CAP16,(0,0,392,100)),(CAP24,(0,0,392,100))])
trio('cmp-fiche.png',[(CANON,(8,420,384,600)),(CAP16,(8,419,384,599)),(CAP24,(8,593,384,773))])
trio('cmp-dock.png',[(CANON,(40,605,352,690)),(CAP16,(40,604,352,689)),(CAP24,(40,778,352,863))])
