# m20 — fond du rang : profil vertical du degrade dans une colonne SANS texte (CSS x 300..440).
# Temoin : ref rang2 (plain) vs cap rang2. Normalise en % de la hauteur du rang.
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
def profil(im,xs,y0,y1,label):
    print('\n %s (rang y=%d..%d, h=%d)'%(label,y0,y1,y1-y0+1))
    for f in (0.0,0.05,0.15,0.3,0.5,0.7,0.85,0.95,1.0):
        y=int(round(y0+f*(y1-y0)))
        print('   %3d%% y=%4d  %s'%(int(f*100),y,med(im,xs,y)))
profil(ref,range(600,880),909,1107,'REFERENCE rang2 (plain)')
profil(cap,range(577,840),1108,1295,'CAPTURE rang2')
profil(ref,range(600,880),505,706,'REFERENCE rang1 (.actif)')
profil(ref,range(600,880),272,472,'REFERENCE don-rang')
profil(cap,range(577,840),514,697,'CAPTURE don-rang')
print('\n--- rail principal : degrade haut->bas ---')
def railprof(im,x,y0,y1,label,S,OY):
    px=im.load(); print(' %s'%label)
    for f in (0.02,0.2,0.4,0.6,0.8,0.98):
        y=int(round(y0+f*(y1-y0)))
        print('   %3d%%  y=%4d  %s'%(int(f*100),y,px[x,y]))
railprof(ref,64,470,1592,'REF rail x=64',2.0,0)
railprof(cap,73,697,1799,'CAP rail x=73',1.88036,232)
