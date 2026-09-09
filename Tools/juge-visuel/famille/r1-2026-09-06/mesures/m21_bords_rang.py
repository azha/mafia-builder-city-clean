# m21 — bords du rang : liseré interne haut (rgba(255,255,255,.15)), ombre interne bas (rgba(0,0,0,.5)),
# et ombre portee (0 4px 12px #000a) sous le rang.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def med(im,xs,y):
    px=im.load(); v=[[],[],[]]
    for x in xs:
        p=px[x,y]
        for i in range(3): v[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in v)
def edge(im,xs,y0,y1,label):
    print(' %s'%label)
    for y in range(y0,y1): print('   y=%4d %s'%(y,med(im,xs,y)))
print('\nREFERENCE rang2 : haut (y 903..916) puis bas (y 1100..1125)')
edge(ref,range(600,880),903,917,'REF haut')
edge(ref,range(600,880),1100,1126,'REF bas + ombre portee')
print('\nCAPTURE rang2 : haut (y 1102..1116) puis bas (y 1288..1315)')
edge(cap,range(577,840),1102,1116,'CAP haut')
edge(cap,range(577,840),1288,1316,'CAP bas + ombre portee')
