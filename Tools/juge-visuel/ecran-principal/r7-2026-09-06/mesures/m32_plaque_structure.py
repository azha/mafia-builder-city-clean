# -- m32 : STRUCTURE du fond de la plaque. Vue a contraste etire (L 10..30 -> 0..255), canon vs jeu.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
from PIL import Image
def etire(key, box, out, lo=10.0, hi=32.0):
    s=sc(key); im=img(key)
    c=im.crop((int(box[0]*s),int(box[1]*s),int(box[2]*s),int(box[3]*s))).convert('RGB')
    d=c.load()
    for y in range(c.height):
        for x in range(c.width):
            L=lum(d[x,y]); v=int(max(0,min(255,(L-lo)/(hi-lo)*255)))
            d[x,y]=(v,v,v)
    c=c.resize((int(c.width/s*2),int(c.height/s*2)),Image.LANCZOS)
    c.save(D+"mesures/"+out); print("  ",out,c.size)
etire('ref',(14,426,379,593),'z_plaque_struct_ref.png')
etire('c19',(14,426,379,593),'z_plaque_struct_c19.png')
