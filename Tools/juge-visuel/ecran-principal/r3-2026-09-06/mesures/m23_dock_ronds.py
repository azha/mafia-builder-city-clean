# m23 — les ronds du dock : detection du CONTOUR clair sur une ligne mediane.
# Controle positif : canon -> 4 ronds de 46 CSS, 1er a x=71, ecart 22 (mesure-canon.txt + CSS .dock gap:22px).
import sys; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,638.7,671.0),('district','../capture-district-1080x2400.png',2.755,811.0,843.6),
   ('fiche19','../capture-fiche-1080x1920.png',2.755,637.0,669.3),('fiche24','../capture-fiche-1080x2400.png',2.755,811.0,843.6)]
for name,f,fac,ymid,ylib in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    C=lambda v:int(round(v*fac)); print(f'== {name} {w}x{h}  ligne mediane y={ymid} CSS')
    y=C(ymid); vals=[lum(px[x,y]) for x in range(w)]
    base=med(vals)
    pk=[];cur=None
    for x,L in enumerate(vals):
        if L>base+6:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: pk.append(cur);cur=None
    if cur: pk.append(cur)
    print(f'   fond L={base:.1f} ; contours (L>fond+6) aux x CSS : ' + ', '.join(f'{a/fac:.1f}-{(b+1)/fac:.1f}' for a,b in pk))
    if len(pk)>=8:
        for i in range(0,len(pk)-1,2):
            a=pk[i][0]/fac; b=(pk[i+1][1]+1)/fac
            print(f'      rond {i//2+1}: x {a:.1f}..{b:.1f}  diametre={b-a:.2f} CSS  centre={(a+b)/2:.2f}')
    # libelles : groupes de colonnes
    yl0,yl1=C(ylib-1),C(ylib+7)
    cnt=[sum(1 for yy in range(yl0,yl1) if lum(px[x,yy])>110) for x in range(w)]
    gr=[];cur=None;bl=0
    for i,c in enumerate(cnt):
        if c>=1:
            if cur is None: cur=[i,i]
            else: cur[1]=i
            bl=0
        else:
            if cur is not None:
                bl+=1
                if bl>C(5): gr.append(cur);cur=None
    if cur: gr.append(cur)
    print('   libelles x CSS : ' + ', '.join(f'{a/fac:.1f}-{(b+1)/fac:.1f} (c={(a+b)/2/fac:.1f})' for a,b in gr))
