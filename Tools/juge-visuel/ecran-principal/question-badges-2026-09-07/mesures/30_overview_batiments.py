# Vue d'ensemble annotee : les 11 ancrages (magenta) + les boites de masses batiees (cyan, LUES A L'OEIL).
# Ce fichier est l'INSTRUMENT de lecture : si une boite est fausse, elle se voit ici.
from PIL import Image, ImageDraw
import json,sys
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC).convert('RGB'); W,H=im.size
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
BAT=json.load(open('batiments.json'))
A=[(1,347.5,573),(2,539.5,573),(3,731.5,573),(4,155.5,766),(5,347.5,765),(6,539.5,765),
   (7,923.5,765),(8,155.5,957),(9,539.5,957),(10,155.5,1343),(11,731.5,1341)]
Z=1
ov=im.copy(); d=ImageDraw.Draw(ov)
for b in BAT:
    x0,y0,x1,y1=b['box']
    d.rectangle([x0,y0,x1,y1],outline=(0,255,255),width=2)
    d.text((x0+3,y0+3),b['id'],fill=(0,255,255))
for k,ax,ay in A:
    d.ellipse([ax-40,ay-40,ax+40,ay+40],outline=(255,0,255),width=2)
    d.line([ax-12,ay,ax+12,ay],fill=(255,0,255),width=2)
    d.line([ax,ay-12,ax,ay+12],fill=(255,0,255),width=2)
    d.text((ax+6,ay+6),f'G{k}',fill=(255,0,255))
ov.save('overview-annote.png')
ov.resize((W//2,H//2),Image.LANCZOS).save('overview-annote-half.png')
print(f'ecrit overview-annote.png {ov.size} et overview-annote-half.png ({W//2}x{H//2}) ; {len(BAT)} boites')
