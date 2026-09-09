# m5 — bbox horizontale des panneaux (don-rang, rangs) + rails + boites pointillees.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def br(p): return p[2]-p[0]
THR=10
def hextent(im,y0,y1,label,xmin,xmax):
    px=im.load(); ys=list(range(y0,y1,3))
    lo=[];hi=[]
    for y in ys:
        xs=[x for x in range(xmin,xmax) if br(px[x,y])>=THR]
        if xs: lo.append(xs[0]); hi.append(xs[-1])
    lo.sort(); hi.sort()
    print('  %-22s x=%d..%d  largeur=%d'%(label,lo[len(lo)//2],hi[len(hi)//2],hi[len(hi)//2]-lo[len(lo)//2]+1))
    return lo[len(lo)//2],hi[len(hi)//2]
print('\nREFERENCE (facteur x2.0, feuille x=0..1119)')
R={}
R['don']=hextent(ref,300,450,'don-rang',0,1120)
R['r1']=hextent(ref,540,680,'rang1 (actif)',0,1120)
R['r2']=hextent(ref,940,1080,'rang2',0,1120)
R['r3']=hextent(ref,1290,1430,'rang3',0,1120)
print('\nCAPTURE (facteur x1.88036, feuille x=13..1065)')
C={}
C['don']=hextent(cap,540,670,'don-rang',13,1066)
C['r1']=hextent(cap,760,890,'rang1',13,1066)
C['r2']=hextent(cap,1140,1270,'rang2',13,1066)
C['r3']=hextent(cap,1520,1650,'rang3',13,1066)
print('\n--- normalise en px CSS (ref/2.0 ; (cap-13)/1.88036) ---')
for k in ['don','r1','r2','r3']:
    a,b=R[k]; c,d=C[k]
    print('  %-6s ref x0=%.1f x1=%.1f l=%.1f | cap x0=%.1f x1=%.1f l=%.1f'%(
        k,a/2.0,b/2.0,(b-a+1)/2.0,(c-13)/1.88036,(d-13)/1.88036,(d-c+1)/1.88036))
