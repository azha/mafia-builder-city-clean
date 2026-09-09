# m11 — le cadran (arc) : centre = moyeu de l'aiguille ; balayage radial pour rayon interne/externe
# et etendue angulaire, par famille de teinte (teal = b>r ; braise = r>b nettement).
# Controle positif : les couleurs canon doivent tomber sur --cyan #7fd4d9 (127,212,217) et --braise #e0664a (224,102,74).
import sys,math; sys.path.insert(0,'.')
from PIL import Image
from lib import *
F=[('canon','../ecran-canon.png',3.0,196.0,43.8),('district','../capture-district-1080x2400.png',2.755,196.0,35.0)]
for name,f,fac,cx,cy in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    print(f'== {name} {w}x{h}  moyeu=({cx},{cy}) CSS')
    teal=[];braise=[]
    for adeg in range(150,391,2):
        a=math.radians(adeg)
        hits=[]
        for rr in [x*0.25 for x in range(8,140)]:
            X=int(round((cx+rr*math.cos(a))*fac)); Y=int(round((cy-rr*math.sin(a))*fac))
            if X<0 or Y<0 or X>=w or Y>=h: continue
            p=px[X,Y]
            if p[2]>p[0]+25 and p[1]>90: hits.append(('T',rr,p))
            elif p[0]>p[2]+45 and p[0]>120 and p[1]<p[0]-40: hits.append(('B',rr,p))
        if hits:
            T=[x for x in hits if x[0]=='T']; B=[x for x in hits if x[0]=='B']
            if T: teal.append((adeg,T[0][1],T[-1][1],T[len(T)//2][2]))
            if B: braise.append((adeg,B[0][1],B[-1][1],B[len(B)//2][2]))
    def rep(lbl,L):
        if not L: print(f'   {lbl}: rien'); return
        print(f'   {lbl}: angles {L[0][0]}..{L[-1][0]} deg ({L[-1][0]-L[0][0]} deg)  r_int~{min(x[1] for x in L):.1f} r_ext~{max(x[2] for x in L):.1f} CSS  ep~{sum(x[2]-x[1] for x in L)/len(L):.2f}  couleur mediane {L[len(L)//2][3]}')
    rep('teal  ',teal); rep('braise',braise)
    print(f'   [ctrl] cyan canon attendu (127,212,217) ; braise attendue (224,102,74)')
