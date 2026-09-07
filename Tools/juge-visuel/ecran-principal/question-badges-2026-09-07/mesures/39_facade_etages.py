# Rangees de fenetres eclairees sur une colonne de facade : maxima locaux de luminance.
# + arete de coin de T3 sur le segment PROPRE (y 510..630).
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
def L(x,y):
    r,g,b=px[x,y]; return (r*299+g*587+b*114)//1000
print('arete de coin T3, segment propre y=510..630 :')
xs=[]
for y in range(510,631,10):
    for x in range(690,760):
        if L(x,y)>=80 and L(x+4,y)<60: xs.append((x,y)); break
print('  ',xs)
print(f'   dx = {xs[-1][0]-xs[0][0]:+d} px pour dy = {xs[-1][1]-xs[0][1]:+d} px  => pente {abs(xs[-1][0]-xs[0][0])/(xs[-1][1]-xs[0][1]):.3f} (une VERTICALE du monde reste VERTICALE dans l image)')
for X in (770,800,860,900,960,205,250):
    seq=[L(X,y) for y in range(470,800)]
    n=0
    for i in range(2,len(seq)-2):
        if seq[i]>=110 and seq[i]>=seq[i-2] and seq[i]>seq[i+2] and seq[i]-min(seq[max(0,i-12):i+12])>=40: n+=1
    # fusion des maxima proches
    pics=[]
    for i in range(2,len(seq)-2):
        if seq[i]>=110 and seq[i]>=seq[i-2] and seq[i]>seq[i+2] and seq[i]-min(seq[max(0,i-12):i+12])>=40:
            if not pics or 470+i-pics[-1]>12: pics.append(470+i)
    print(f'  colonne x={X:4d} : {len(pics)} rangees claires distinctes entre y=470 et y=800  -> y = {pics}')
