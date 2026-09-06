from common import *
from txt import *
print('--- a) valeurs des DEUX ailes, hauteur par glyphe (canon) ---')
r=op(REF)
def glyphes(im,box,scale,label):
    cols,base=colonnes(im,box,40)
    lt=segments(cols,gap=1,minw=2)
    out=[]
    for s in lt:
        ys=[y for x,yy in cols for y in yy if s[0]<=x<=s[1]]
        out.append(((max(ys)-min(ys)+1)/scale,(s[1]-s[0]+1)/scale,min(ys)/scale,(max(ys)+1)/scale))
    print(f'  {label}: ' + ' | '.join(f'h={h:.2f}' for h,_,_,_ in out))
glyphes(r,(55,58,240,110),REF_S,'REF gauche "$ 24 850"')
glyphes(r,(1000,60,1145,110),REF_S,'REF droite "21:40"')
print('--- b) fond du cadran du medaillon, 4 sondes symetriques (F15) ---')
c=op(C24)
print('  REF (centre 587.5,116.5 R=95.5) : ', [med(r,int(587.5+dx-9),int(116.5+dy-9),int(587.5+dx+9),int(116.5+dy+9)) for dx,dy in ((-55,-45),(55,-45),(-55,45),(55,45))])
print('  CAP (centre 539.5,130.0 R=110.5): ', [med(c,int(539.5+dx-9),int(130+dy-9),int(539.5+dx+9),int(130+dy+9)) for dx,dy in ((-64,-52),(64,-52),(-64,52),(64,52))])
print('--- c) le dock du client est-il translucide ? (1920, l art court jusqu en bas) ---')
c19=op(C19); px=c19.load()
for x in (60,300,520,1000):
    for y in (1700,1740,1790,1850,1900):
        pass
print('    colonne / ligne : couleur dans le panneau du dock')
for y in (1740,1800,1860,1910):
    print(f'    y={y} ({y/CAP_S:6.2f} CSS) : ' + '  '.join(f'x={x}:{px[x,y]}' for x in (20,60,300,520,760,1000,1060)))
print('--- d) palette globale restreinte au CHROME + FICHE ---')
def palette(im,zones,label,n=6):
    from collections import Counter
    cnt=Counter()
    for (x0,y0,x1,y1) in zones:
        for y in range(y0,y1,2):
            for x in range(x0,x1,2):
                c=im.getpixel((x,y)); cnt[(c[0]//16*16,c[1]//16*16,c[2]//16*16)]+=1
    tot=sum(cnt.values())
    print(f'  {label} (n={tot}) : ' + ' | '.join(f'{k} {v*100/tot:.1f}%' for k,v in cnt.most_common(n)))
palette(r,[(0,0,1176,156),(39,1283,1140,1790)],'REF chrome+fiche')
palette(c19,[(0,0,1080,170),(33,1129,1046,1592)],'CAP1920 chrome+fiche')
