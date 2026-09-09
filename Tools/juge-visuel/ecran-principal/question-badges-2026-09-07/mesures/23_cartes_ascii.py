# Cartes ASCII (luminance + indice teal) autour des ancrages ambigus.
#  T = tres clair neutre (L>=140)   # = L>=80   : = 60..79   . = L<60      W = eau (B-R>=45 et L>=55)
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
def carte(nom,ax,ay,rx,ry):
    x0,x1,y0,y1=int(ax)-rx,int(ax)+rx,int(ay)-ry,int(ay)+ry
    print(f'\n--- {nom} : ancrage ({ax},{ay}) ; x {x0}..{x1}, y {y0}..{y1} ---')
    print('      ' + ''.join(str((x//10)%10) for x in range(x0,x1+1)))
    print('      ' + ''.join(str(x%10) for x in range(x0,x1+1)))
    for y in range(y0,y1+1):
        s=''
        for x in range(x0,x1+1):
            if abs(x-ax)<1 and abs(y-ay)<1: s+='A'; continue
            r,g,b=px[x,y]; L=(r*299+g*587+b*114)//1000
            if (b-r)>=45 and L>=55: s+='W'
            elif L>=140 and max(r,g,b)-min(r,g,b)<=25: s+='T'
            elif L>=80: s+='#'
            elif L>=60: s+=':'
            else: s+='.'
        print(f'  {y:4d} {s}')
carte('G3 "Cache"',731.5,573,34,16)
carte('G7 "Planque"',923.5,765,34,16)
carte('G9 "Planque"',539.5,957,34,16)
carte('G10 "Commerce-ecran"',155.5,1343,34,22)
