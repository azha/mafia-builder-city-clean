# m32 — table consolidee : pour chaque rang, bandes, nom, puce, ecart nom->puce (CSS, origine feuille).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
creme=lambda p: p[0]>150 and p[1]>140 and 15<=p[0]-p[2]<=70
chipbord=lambda p: (p[2]-p[0]>12 and p[2]>45 and p[1]>=p[0]) or (p[0]>45 and abs(p[0]-p[2])<25 and p[0]<120 and p[1]>40)
def yspan(im,x0,y0,x1,y1,pred,S,OY):
    px=im.load(); ys=[y for y in range(y0,y1) for x in range(x0,x1) if pred(px[x,y])]
    if not ys: return None
    return ((min(ys)-OY)/S,(max(ys)-OY)/S)
SR,OYR=2.0,0
SC,OYC=1.88036,232
print('\n%-8s %-22s %-22s %-22s %s'%('','bande du rang (CSS)','nom (CSS y)','puce (CSS y)','ecart nom->puce'))
def ligne(im,label,band,nomw,chipw,S,OY):
    n=yspan(im,nomw[0],nomw[1],nomw[2],nomw[3],creme,S,OY)
    c=yspan(im,chipw[0],chipw[1],chipw[2],chipw[3],chipbord,S,OY)
    b=((band[0]-OY)/S,(band[1]-OY)/S)
    print('%-8s %-22s %-22s %-22s %.2f'%(label,'%.1f..%.1f (h=%.1f)'%(b[0],b[1],b[1]-b[0]+1/S),
        '%.1f..%.1f'%n if n else '-', '%.1f..%.1f'%c if c else '-', (c[0]-n[1]) if (n and c) else -1))
ligne(ref,'REF r1',(505,706),(300,530,700,600),(295,595,560,675),SR,OYR)
ligne(ref,'REF r2',(909,1107),(300,935,700,1000),(295,1000,560,1075),SR,OYR)
ligne(ref,'REF r3',(1259,1457),(300,1285,700,1355),(295,1355,560,1425),SR,OYR)
ligne(cap,'CAP r1',(729,916),(245,745,700,800),(240,800,560,880),SC,OYC)
ligne(cap,'CAP r2',(1108,1295),(245,1125,700,1180),(240,1180,560,1260),SC,OYC)
ligne(cap,'CAP r3',(1487,1674),(245,1505,700,1560),(240,1560,560,1640),SC,OYC)
