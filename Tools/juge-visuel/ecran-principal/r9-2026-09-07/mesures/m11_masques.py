# m11 — masques de classification des arcs (controle VISUEL de l'instrument avant toute mesure)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
from PIL import Image
print('=== m11 masques de classification (controle de l instrument) ===')
def teal(c):
    r,g,b=c; return b-r>32 and g-r>22 and b>85
def brais(c):
    r,g,b=c; return r-b>62 and r-g>52 and r>112
def creme(c):
    r,g,b=c; return r>170 and g>165 and b>140 and abs(r-g)<28 and r-b<70

CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56)]
for path,nom,sc,mcx,mcy,mR in CFG:
    im=ouvrir(path,nom); px=im.load()
    x0,y0=int(mcx-mR-4),int(mcy-mR-4); x1,y1=int(mcx+mR+4),int(mcy+mR+4)
    out=Image.new('RGB',(x1-x0,y1-y0),(0,0,0)); o=out.load()
    nt=nb=nc=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if teal(c): o[x-x0,y-y0]=(0,255,255); nt+=1
            elif brais(c): o[x-x0,y-y0]=(255,0,0); nb+=1
            elif creme(c): o[x-x0,y-y0]=(255,255,0); nc+=1
            else: o[x-x0,y-y0]=(20,20,20)
    out.resize(((x1-x0)*3,(y1-y0)*3),Image.NEAREST).save('vues/masque-%s.png'%nom)
    print('   [%s] teal=%d braise=%d creme=%d -> vues/masque-%s.png' % (nom,nt,nb,nc,nom))
