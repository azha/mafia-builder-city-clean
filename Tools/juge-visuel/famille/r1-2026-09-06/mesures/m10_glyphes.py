# m10 — decoupe en glyphes (projection sur x) + hauteur de CAPITALE mesuree sur la 1re lettre.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
creme=lambda p: p[0]>150 and p[1]>140 and 15<=p[0]-p[2]<=70
cyan =lambda p: p[2]>120 and p[2]-p[0]>35 and p[1]>110
orv  =lambda p: p[0]>140 and p[0]-p[2]>40
def glyphs(im,x0,y0,x1,y1,pred,label,S,OX,OY):
    px=im.load()
    cols=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if pred(px[x,y]))
        cols.append(n)
    runs=[];s=None
    for i,v in enumerate(cols):
        if v and s is None: s=i
        if not v and s is not None:
            runs.append((x0+s,x0+i-1)); s=None
    if s is not None: runs.append((x0+s,x1-1))
    print('\n %s  (%d glyphes/groupes)'%(label,len(runs)))
    out=[]
    for a,b in runs:
        ys=[y for y in range(y0,y1) for x in range(a,b+1) if pred(px[x,y])]
        if not ys: continue
        h=(max(ys)-min(ys)+1)/S
        out.append((a,b,min(ys),max(ys),h))
        print('   x=%4d..%4d (l=%5.2f CSS)  y=%4d..%4d  h=%5.2f CSS'%(a,b,(b-a+1)/S,min(ys),max(ys),h))
    return out
SR,OXR,OYR=2.0,0,0
SC,OXC,OYC=1.88036,13,232
print('\n=== NOM du rang (temoin : ref rang3 "Blanchiment" / cap rang3 "Cuisinier") ===')
glyphs(ref,300,1300,600,1360,creme,'REF Blanchiment',SR,OXR,OYR)
glyphs(cap,295,1525,540,1580,creme,'CAP Cuisinier',SC,OXC,OYC)
print('\n=== ETAT : colonne de droite, tout l ink creme du rang ===')
glyphs(ref,900,1300,1080,1410,creme,'REF etat (Actif + ETAT) — projection x',SR,OXR,OYR)
glyphs(cap,840,1530,1010,1620,creme,'CAP etat (Repos + Etat) — projection x',SC,OXC,OYC)
