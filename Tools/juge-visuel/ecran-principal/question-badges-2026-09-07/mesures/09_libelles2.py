# v2 : bande de texte serree (cy+13..cy+24, calee sur les 5 badges dont l'encre est propre),
# masque encre = clair ET neutre, et rendu zoom 8 pour lecture humaine.
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
print('  #  bbox encre                largeur  centre_x  dx   npx  colonnes_avec_encre')
res=[]
for k,(cx,cy) in enumerate(BADGES,1):
    y0,y1=int(cy)+13,int(cy)+25
    x0,x1=max(0,int(cx)-130),min(W,int(cx)+130)
    cols={}
    for y in range(y0,y1):
        for x in range(x0,x1):
            if encre(x,y): cols.setdefault(x,0); cols[x]+=1
    if cols:
        xs=sorted(cols); bx0,bx1=xs[0],xs[-1]
        # elaguer les colonnes isolees (> 6 px de trou du groupe principal)
        groups=[[xs[0]]]
        for x in xs[1:]:
            if x-groups[-1][-1]<=6: groups[-1].append(x)
            else: groups.append([x])
        g=max(groups,key=lambda G:sum(cols[x] for x in G))
        bx0,bx1=g[0],g[-1]
        npx=sum(cols[x] for x in g)
        c=(bx0+bx1)/2
        print(f'  G{k:<2d} ({bx0},{y0},{bx1},{y1-1})  {bx1-bx0+1:5d}  {c:8.1f} {c-cx:+6.1f} {npx:5d}  {len(g)} (groupes={len(groups)})')
        res.append((k,bx0,y0,bx1,y1-1))
    else:
        print(f'  G{k:<2d} AUCUNE ENCRE'); res.append((k,int(cx)-40,y0,int(cx)+40,y1-1))
Z=8; PAD=6
maxw=max(b[3]-b[1] for b in res)+2*PAD
sheet_h=0; crops=[]
for k,bx0,by0,bx1,by1 in res:
    cx=(bx0+bx1)//2
    c=im.crop((cx-maxw//2, by0-PAD, cx+maxw//2, by1+PAD))
    crops.append((k,c)); sheet_h+=c.height*Z+8
sheet=Image.new('RGB',(maxw*Z+70, sheet_h),(15,15,15))
d=ImageDraw.Draw(sheet); yy=0
for k,c in crops:
    c2=c.resize((c.width*Z,c.height*Z),Image.NEAREST)
    sheet.paste(c2,(70,yy)); d.text((8,yy+c2.height//2-4),f'G{k}',fill=(255,255,0)); yy+=c2.height+8
sheet.save('libelles-contact2.png'); print('ecrit libelles-contact2.png',sheet.size)
