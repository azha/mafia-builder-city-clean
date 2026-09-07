# Extrait, pour chaque badge, (a) une decoupe zoomee du libelle pour lecture humaine,
# (b) le masque d'encre du texte (clair ET neutre) avec sa bbox et son profil de colonnes.
from PIL import Image, ImageDraw
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
BADGES=[(347.5,552.5),(539.5,552.5),(731.5,552.5),
        (155.5,744.5),(347.5,744.5),(539.5,744.5),(923.5,744.5),
        (155.5,936.5),(539.5,936.5),
        (155.5,1320.5),(731.5,1320.5)]
def encre(x,y):
    r,g,b=px[x,y]
    return min(r,g,b)>=150 and (max(r,g,b)-min(r,g,b))<=25
bands=[]
print('  #   bande y        bbox encre (x0,y0,x1,y1)      largeur  centre_x   dx vs badge')
for k,(cx,cy) in enumerate(BADGES,1):
    y0,y1=int(cy)+8,int(cy)+34
    x0,x1=max(0,int(cx)-120),min(W,int(cx)+120)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if encre(x,y)]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        bx0,bx1,by0,by1=min(xs),max(xs),min(ys),max(ys)
        w=bx1-bx0+1; c=(bx0+bx1)/2
        print(f'  G{k:<2d} {y0}-{y1}   ({bx0},{by0},{bx1},{by1})      {w:4d}   {c:7.1f}   {c-cx:+6.1f}   npx={len(pts)}')
        bands.append((k,bx0,by0,bx1,by1))
    else:
        print(f'  G{k:<2d} {y0}-{y1}   AUCUNE ENCRE')
        bands.append((k,int(cx)-40,y0,int(cx)+40,y1))
# contact sheet
Z=6
maxw=max(b[3]-b[1]+1 for b in bands)+8
rows=[]
for k,bx0,by0,bx1,by1 in bands:
    c=im.crop((bx0-4,by0-3,bx0-4+maxw,by1+4))
    rows.append((k,c))
th=sum(c.height for _,c in rows)
sheet=Image.new('RGB',(maxw*Z+60, th*Z+len(rows)*6),(20,20,20))
d=ImageDraw.Draw(sheet); yy=0
for k,c in rows:
    c2=c.resize((c.width*Z,c.height*Z),Image.NEAREST)
    sheet.paste(c2,(60,yy)); d.text((6,yy+10),f'G{k}',fill=(255,255,255)); yy+=c2.height+6
sheet.save('libelles-contact.png')
print('ecrit libelles-contact.png', sheet.size)
