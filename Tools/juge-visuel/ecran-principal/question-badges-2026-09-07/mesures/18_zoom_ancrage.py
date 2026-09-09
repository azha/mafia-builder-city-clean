# Vignette serree (rayon 50 px, zoom 8) autour de l'ancrage, croix + cercle 40 px.
from PIL import Image, ImageDraw
import sys
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC)
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
A={3:(731.5,573),5:(347.5,765),7:(923.5,765),9:(539.5,957),10:(155.5,1343),8:(155.5,957),6:(539.5,765)}
R=50; Z=8
for k,(ax,ay) in A.items():
    x0,y0=int(ax)-R,int(ay)-R
    c=im.crop((x0,y0,x0+2*R,y0+2*R)).resize((2*R*Z,2*R*Z),Image.NEAREST)
    d=ImageDraw.Draw(c); pxx,pyy=(ax-x0)*Z,(ay-y0)*Z
    d.ellipse([pxx-40*Z,pyy-40*Z,pxx+40*Z,pyy+40*Z],outline=(255,0,255),width=3)
    d.line([pxx-10*Z,pyy,pxx+10*Z,pyy],fill=(255,0,255),width=2)
    d.line([pxx,pyy-10*Z,pxx,pyy+10*Z],fill=(255,0,255),width=2)
    d.ellipse([pxx-3,pyy-3,pxx+3,pyy+3],fill=(255,0,255))
    d.text((6,6),f'G{k} ancrage ({ax},{ay}) fenetre ({x0},{y0})-({x0+2*R},{y0+2*R}) zoom {Z}',fill=(255,0,255))
    c.save(f'zoom-G{k}.png'); print(f'  ecrit zoom-G{k}.png  fenetre=({x0},{y0})-({x0+2*R},{y0+2*R}) taille={c.size}')
