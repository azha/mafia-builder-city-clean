# Cartes ASCII de luminance/teal autour des 11 ancrages -> fichier cartes-ascii.txt
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
hdr=f'ouvre {SRC} : taille={im.size} mode={im.mode}'
print(hdr)
A=[(1,347.5,573),(2,539.5,573),(3,731.5,573),(4,155.5,766),(5,347.5,765),(6,539.5,765),
   (7,923.5,765),(8,155.5,957),(9,539.5,957),(10,155.5,1343),(11,731.5,1341)]
out=[hdr,'legende : A=ancrage  W=eau(B-R>=45,L>=55)  T=tres clair neutre(L>=140)  #=L>=80  :=L 60..79  .=L<60','']
for k,ax,ay in A:
    x0,x1,y0,y1=int(ax)-34,int(ax)+34,int(ay)-20,int(ay)+20
    out.append(f'--- G{k} : ancrage ({ax},{ay}) ; x {x0}..{x1}, y {y0}..{y1} ---')
    out.append('      ' + ''.join(str((x//10)%10) for x in range(x0,x1+1)))
    out.append('      ' + ''.join(str(x%10) for x in range(x0,x1+1)))
    for y in range(y0,y1+1):
        s=''
        for x in range(x0,x1+1):
            if x<0 or x>=W or y<0 or y>=H: s+=' '; continue
            if abs(x-ax)<1 and abs(y-ay)<1: s+='A'; continue
            r,g,b=px[x,y]; L=(r*299+g*587+b*114)//1000
            if (b-r)>=45 and L>=55: s+='W'
            elif L>=140 and max(r,g,b)-min(r,g,b)<=25: s+='T'
            elif L>=80: s+='#'
            elif L>=60: s+=':'
            else: s+='.'
        out.append(f'  {y:4d} {s}')
    r,g,b=px[int(ax),int(ay)]
    out.append(f'  pixel exact a l ancrage ({int(ax)},{int(ay)}) = rgb({r},{g},{b})  L={(r*299+g*587+b*114)//1000}')
    out.append('')
open('cartes-ascii.txt','w').write('\n'.join(out))
print('ecrit cartes-ascii.txt', len(out), 'lignes')
for k,ax,ay in A:
    r,g,b=px[int(ax),int(ay)]
    print(f'  G{k:<2d} pixel a l ancrage ({int(ax)},{int(ay)}) = rgb({r:3d},{g:3d},{b:3d}) L={(r*299+g*587+b*114)//1000:3d} B-R={b-r:+4d}')
