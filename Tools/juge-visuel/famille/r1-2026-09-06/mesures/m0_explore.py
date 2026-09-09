from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('ref',ref.size,'cap',cap.size)
# profil de luminance par colonne, sur une bande verticale
def colprofile(im,y0,y1,label):
    W,H=im.size
    out=[]
    for x in range(W):
        s=0
        for y in range(y0,y1,4):
            r,g,b=im.getpixel((x,y)); s+=(r*299+g*587+b*114)//1000
        out.append(s/len(range(y0,y1,4)))
    print(label, 'W=',W)
    # transitions
    prev=out[0]
    for x in range(1,W):
        if abs(out[x]-prev)>3:
            print('  x=%d %.1f -> %.1f'%(x,prev,out[x]))
        prev=out[x]
print('--- CAPTURE colonnes, bande y=1400..1500 (entre deux rangs) ---')
colprofile(cap,1400,1500,'cap')
