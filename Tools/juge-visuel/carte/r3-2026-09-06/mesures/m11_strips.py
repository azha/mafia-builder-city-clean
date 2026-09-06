# m11 - bandes comparatives : REFERENCE RECALEE (haut) / CAPTURE (bas) autour de chaque nom
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, os
w=Image.open('ref_warp.png').convert('RGB')   # reference dans le repere capture
c=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
print('ref_warp',w.size,'cap',c.size)
os.makedirs('vues/noms',exist_ok=True)
for nom,xs,ys,src in NOMS:
    rx,ry=svg2ref(xs,ys); cx,cy=r2c(rx,ry)
    hw=len(nom)*12+40; dy=abs(math.sin(math.radians(src)))*hw
    box=(int(cx-hw),int(cy-34-dy),int(cx+hw),int(cy+dy+16))
    a=w.crop(box); b=c.crop(box)
    W,H=a.size
    out=Image.new('RGB',(W,H*2+4),(255,0,0))
    out.paste(a,(0,0)); out.paste(b,(0,H+4))
    out=out.resize((W*2,(H*2+4)*2),Image.NEAREST)
    f='vues/noms/%s.png'%nom.replace(' ','_')
    out.save(f)
print('18 bandes ecrites dans vues/noms/')
# planche de 6 noms empiles
sel=['LES BASSINS','SARNES','HAUTES-MARCHES','DEPOT-EST','MARNE-BASSE','PLACE DES COMPTES']
ims=[Image.open('vues/noms/%s.png'%s.replace(' ','_')) for s in sel]
Wm=max(i.size[0] for i in ims); Hs=sum(i.size[1]+8 for i in ims)
pl=Image.new('RGB',(Wm,Hs),(40,40,40)); y=0
for i in ims: pl.paste(i,(0,y)); y+=i.size[1]+8
pl.save('vues/planche_noms_A.png'); print('vues/planche_noms_A.png',pl.size)
sel2=['QUAI-NORD','LA COLONNE','VERRIER','SAINT-BRAND','LES ENTREPOTS','LE TREILLIS']
ims=[Image.open('vues/noms/%s.png'%s.replace(' ','_')) for s in sel2]
Wm=max(i.size[0] for i in ims); Hs=sum(i.size[1]+8 for i in ims)
pl=Image.new('RGB',(Wm,Hs),(40,40,40)); y=0
for i in ims: pl.paste(i,(0,y)); y+=i.size[1]+8
pl.save('vues/planche_noms_B.png'); print('vues/planche_noms_B.png',pl.size)
sel3=['LE VERRE','ORSEL','LA LISIERE','LA CHANCELLERIE','LES FRICHES','PONT-GRIS']
ims=[Image.open('vues/noms/%s.png'%s.replace(' ','_')) for s in sel3]
Wm=max(i.size[0] for i in ims); Hs=sum(i.size[1]+8 for i in ims)
pl=Image.new('RGB',(Wm,Hs),(40,40,40)); y=0
for i in ims: pl.paste(i,(0,y)); y+=i.size[1]+8
pl.save('vues/planche_noms_C.png'); print('vues/planche_noms_C.png',pl.size)
