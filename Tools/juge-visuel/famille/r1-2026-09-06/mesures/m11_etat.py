# m11 — bloc "etat" (valeur + libelle) : separation par projection sur y, puis bbox de chaque ligne.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
creme=lambda p: p[0]>150 and p[1]>140 and 15<=p[0]-p[2]<=70
def lines(im,x0,y0,x1,y1,pred,label,S,OX,OY):
    px=im.load(); rows=[]
    for y in range(y0,y1):
        rows.append(sum(1 for x in range(x0,x1) if pred(px[x,y])))
    runs=[];s=None
    for i,v in enumerate(rows):
        if v and s is None: s=i
        if not v and s is not None: runs.append((y0+s,y0+i-1)); s=None
    if s is not None: runs.append((y0+s,y1-1))
    print('\n %s'%label)
    res=[]
    for a,b in runs:
        xs=[x for y in range(a,b+1) for x in range(x0,x1) if pred(px[x,y])]
        print('   ligne y=%4d..%4d  h=%5.2f CSS | x=%4d..%4d  chasse=%5.2f CSS | droite=%.1f CSS'%(
            a,b,(b-a+1)/S,min(xs),max(xs),(max(xs)-min(xs)+1)/S,(max(xs)-OX)/S))
        res.append((a,b,min(xs),max(xs)))
    return res
SR,OXR,OYR=2.0,0,0
SC,OXC,OYC=1.88036,13,232
lines(ref,900,1300,1080,1420,creme,'REF rang3 etat (Actif / ETAT)',SR,OXR,OYR)
lines(cap,830,1520,1030,1640,creme,'CAP rang3 etat (Repos / Etat)',SC,OXC,OYC)
print('\n--- meme chose sur le rang2 (temoin secondaire) ---')
lines(ref,900,950,1080,1070,creme,'REF rang2 etat (Repos / ETAT)',SR,OXR,OYR)
lines(cap,830,1140,1030,1260,creme,'CAP rang2 etat',SC,OXC,OYC)
