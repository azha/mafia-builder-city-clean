# Carte ASCII de luminance autour d'un point : le lecteur voit la frontiere sans me croire.
#  T = encre de libelle (L>=140 et neutre)   # = L>=80   : = 60..79   . = L<60
#  A = position de l'ancrage
from PIL import Image
import sys
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
def carte(nom,x0,y0,x1,y1,ax,ay):
    print(f'--- {nom} : x {x0}..{x1}, y {y0}..{y1} ; A = ancrage ({ax},{ay}) ---')
    print('      ' + ''.join(str((x//10)%10) for x in range(x0,x1+1)))
    print('      ' + ''.join(str(x%10) for x in range(x0,x1+1)))
    for y in range(y0,y1+1):
        s=''
        for x in range(x0,x1+1):
            if abs(x-ax)<1 and abs(y-ay)<1: s+='A'; continue
            r,g,b=px[x,y]; L=(r*299+g*587+b*114)//1000
            if L>=140 and max(r,g,b)-min(r,g,b)<=25: s+='T'
            elif L>=80: s+='#'
            elif L>=60: s+=':'
            else: s+='.'
        print(f'  {y:4d} {s}')
carte('G5 "Serre"',315,745,382,800,347,765)
