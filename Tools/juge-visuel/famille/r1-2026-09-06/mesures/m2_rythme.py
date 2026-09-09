# m2 (v2) — rythme vertical : bandes "panneau bleute" vs fond de feuille.
# Discriminant : B-R >= 10.  Controle NEGATIF : le fond de feuille des DEUX images doit rendre < 10.
# Controle POSITIF : un pixel connu de panneau doit rendre >= 10.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
THR=10
def br(p): return p[2]-p[0]
print('CTRL NEG fond ref (10,1790) B-R=%d  | fond cap (20,1950) B-R=%d  (doivent etre <%d)'%(
    br(ref.getpixel((10,1790))), br(cap.getpixel((20,1950))), THR))
print('CTRL POS panneau ref (700,600) B-R=%d | panneau cap (700,800) B-R=%d (doivent etre >=%d)'%(
    br(ref.getpixel((700,600))), br(cap.getpixel((700,800))), THR))

def bands(im,x0,x1,y0,y1,label):
    px=im.load(); res=[]
    cols=list(range(x0,x1,2))
    for y in range(y0,y1):
        n=sum(1 for x in cols if br(px[x,y])>=THR)
        res.append(n)
    on=[1 if v>0.6*len(cols) else 0 for v in res]
    segs=[];s=None
    for i,v in enumerate(on):
        if v and s is None: s=i
        if not v and s is not None:
            if i-s>=8: segs.append((y0+s,y0+i-1))
            s=None
    if s is not None and len(on)-s>=8: segs.append((y0+s,y0+len(on)-1))
    print('\n%s bandes panneau (colonnes %d..%d)'%(label,x0,x1))
    prev=None
    for a,b in segs:
        gap='' if prev is None else '   (gap %d depuis la bande precedente)'%(a-prev-1)
        print('   y=%4d..%4d  h=%3d%s'%(a,b,b-a+1,gap)); prev=b
    return segs
sref=bands(ref,150,980,200,1850,'REFERENCE')
scap=bands(cap,150,940,380,2120,'CAPTURE')
