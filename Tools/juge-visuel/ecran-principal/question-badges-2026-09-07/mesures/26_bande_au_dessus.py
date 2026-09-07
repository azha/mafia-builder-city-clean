# Bande de 30 px AU-DESSUS de chaque anneau (ou se trouvent les 3 pastilles vues sur G2) :
# y a-t-il des pastilles ailleurs ? On compte aussi les px de couleur d'anneau dans cette bande.
from PIL import Image, ImageDraw
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
C=[(1,347.5,552.5),(2,539.5,552.5),(3,731.5,552.5),(4,155.5,744.5),(5,347.5,744.5),(6,539.5,744.5),
   (7,923.5,744.5),(8,155.5,936.5),(9,539.5,936.5),(10,155.5,1320.5),(11,731.5,1320.5)]
Z=6; Wb=90; Hb=22
sheet=Image.new('RGB',(Wb*Z+70,(Hb*Z+6)*len(C)),(15,15,15)); d=ImageDraw.Draw(sheet); yy=0
print('  #  px couleur-anneau dans la bande [cy-30, cy-9] x [cx-45, cx+45]')
for k,cx,cy in C:
    x0=int(cx)-Wb//2; y0=int(cy)-30
    n=0
    for y in range(y0,y0+Hb):
        for x in range(x0,x0+Wb):
            if 0<=x<W and 0<=y<H:
                r,g,b=px[x,y]
                if abs(r-176)<=30 and abs(g-141)<=30 and abs(b-62)<=30: n+=1
    print(f'  G{k:<2d} {n}')
    c=im.crop((x0,y0,x0+Wb,y0+Hb)).resize((Wb*Z,Hb*Z),Image.NEAREST)
    sheet.paste(c,(70,yy)); d.text((8,yy+Hb*Z//2-4),f'G{k}',fill=(255,255,0)); yy+=Hb*Z+6
sheet.save('bande-dessus-contact.png'); print('ecrit bande-dessus-contact.png',sheet.size)
