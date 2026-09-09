# Vignette par badge : 200x200 px autour du POINT D'ANCRAGE bas-centre, zoom 4,
# avec la croix d'ancrage et le cercle de rayon 40 px dessines.
from PIL import Image, ImageDraw
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
A=[(1,347.5,573),(2,539.5,573),(3,731.5,573),(4,155.5,766),(5,347.5,765),(6,539.5,765),
   (7,923.5,765),(8,155.5,957),(9,539.5,957),(10,155.5,1343),(11,731.5,1341)]
R=100; Z=4
for k,ax,ay in A:
    x0,y0=int(ax)-R,int(ay)-R
    c=im.crop((x0,y0,x0+2*R,y0+2*R)).resize((2*R*Z,2*R*Z),Image.NEAREST)
    d=ImageDraw.Draw(c)
    px_,py_=(ax-x0)*Z,(ay-y0)*Z
    d.ellipse([px_-40*Z,py_-40*Z,px_+40*Z,py_+40*Z],outline=(255,0,255),width=3)
    d.line([px_-14*Z,py_,px_+14*Z,py_],fill=(255,0,255),width=3)
    d.line([px_,py_-14*Z,px_,py_+14*Z],fill=(255,0,255),width=3)
    d.text((6,6),f'G{k} ancrage=({ax},{ay})  fenetre=({x0},{y0})-({x0+2*R},{y0+2*R})',fill=(255,0,255))
    c.save(f'ancrage-G{k}.png')
    print(f'  ecrit ancrage-G{k}.png  ancrage=({ax},{ay}) fenetre=({x0},{y0})-({x0+2*R},{y0+2*R}) taille={c.size}')
