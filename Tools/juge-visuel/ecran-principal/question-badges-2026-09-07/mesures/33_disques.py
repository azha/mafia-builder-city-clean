# Planche des 11 disques (20x20 autour du centre d anneau), zoom 12 : le glyphe interieur varie-t-il ?
from PIL import Image, ImageDraw
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC)
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
C=[(1,347.5,552.5),(2,539.5,552.5),(3,731.5,552.5),(4,155.5,744.5),(5,347.5,744.5),(6,539.5,744.5),
   (7,923.5,744.5),(8,155.5,936.5),(9,539.5,936.5),(10,155.5,1320.5),(11,731.5,1320.5)]
Z=12; S=20
sheet=Image.new('RGB',(11*(S*Z+6)+6, S*Z+30),(15,15,15)); d=ImageDraw.Draw(sheet)
for i,(k,cx,cy) in enumerate(C):
    c=im.crop((int(cx)-S//2,int(cy)-S//2,int(cx)-S//2+S,int(cy)-S//2+S)).resize((S*Z,S*Z),Image.NEAREST)
    sheet.paste(c,(6+i*(S*Z+6),24)); d.text((6+i*(S*Z+6)+4,6),f'G{k}',fill=(255,255,0))
sheet.save('disques-contact.png'); print('ecrit disques-contact.png',sheet.size)
