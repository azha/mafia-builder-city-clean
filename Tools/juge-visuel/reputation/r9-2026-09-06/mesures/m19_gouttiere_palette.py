# -*- coding: utf-8 -*-
"""m19 — (a) GOUTTIERE : bas du bandeau, haut du dock, extremites du cadre sur la capture,
et la bande morte entre le bas du cadre et le haut du dock ;
(b) profil HORIZONTAL de la ligne de balayage (forme du degrade) ;
(c) palette : 6 couleurs dominantes de la zone de contenu, avec leur part d'aire ;
(d) contrastes recalcules sur les pixels MESURES (pas sur les jetons).
Contrôle positif (c) : les deux palettes doivent partager leurs 3 premieres familles —
  sinon la quantification ne mesure pas la meme chose.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
print('(a) GOUTTIERE (capture)')
px=C.load()
# haut du dock : premiere ligne, en partant du bas, ou de l'encre apparait sur x 150..950
prem=None
for y in range(2399,1800,-1):
    xs=[x for x in range(150,950) if lum(px[x,y])>=55]
    if len(xs)>=6: prem=y
for y in range(1900,2400):
    xs=[x for x in range(150,950) if lum(px[x,y])>=55]
    if len(xs)>=6:
        print('   1re encre du dock : y=%d  (x=%d..%d)'%(y,min(xs),max(xs))); break
print('   derniere encre du dock : y=%d'%prem)
for y in range(120,300):
    xs=[x for x in range(20,1060) if lum(px[x,y])>=55]
    if len(xs)>=6:
        pass
# bas du bandeau : derniere ligne d'encre au-dessus de y=250 sur x 20..1060
der=None
for y in range(0,250):
    xs=[x for x in range(20,1060) if lum(px[x,y])>=55]
    if len(xs)>=4: der=(y,min(xs),max(xs))
print('   derniere encre du chrome haut : y=%d (x=%d..%d)  |  haut du cadre (cerne) y=250'%der)
print('   bande morte bas : cadre bas 1876 -> 1re encre du dock ; bande morte haut : chrome -> 250')
print()
print('(b) profil horizontal de la ligne de balayage (score G+B-2R au pic)')
def sc(c): return c[1]+c[2]-2*c[0]
for nom,im,y in (('REF',R,1090),('CAP',C,871)):
    p=im.load()
    ech=[(x,sc(p[x,y])) for x in range(52,1030,54)]
    print('   %s y=%d : %s'%(nom,y,' '.join('%d:%d'%(x,v) for x,v in ech)))
print()
print('(c) palette (zone de contenu, quantifiee 16 couleurs)')
for nom,im,box in (('REF',R,(22,452,1058,2078)),('CAP',C,(19,250,1061,1876))):
    q=im.crop(box).quantize(colors=16, method=Image.MEDIANCUT).convert('RGB')
    n=q.size[0]*q.size[1]
    cols=sorted(q.getcolors(65536),reverse=True)[:6]
    print('   %s : %s'%(nom,'  '.join('#%02x%02x%02x %.1f%%'%(c[0],c[1],c[2],100*k/n) for k,c in cols)))
print()
print('(d) contrastes sur pixels MESURES')
def Lr(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def rat(a,b):
    la,lb=Lr(a),Lr(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def med(im,cx,cy,r=8):
    p=im.load();ch=[[],[],[]]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            for k in range(3): ch[k].append(p[x,y][k])
    return tuple(sorted(v)[len(v)//2] for v in ch)
paires=[('tl small (eteint) / tuile OFF',(107,115,125),med(R,960,1165),med(C,970,920)),
        ('tl b (creme2) / tuile OFF',(185,173,146),med(R,960,1165),med(C,970,920)),
        ('libelle .fen (muet) / .fen',(138,151,156),med(R,300,745),med(C,300,540)),
        ('titre or_vif / enseigne',(242,201,107),med(R,120,500),med(C,120,300))]
for n,t,fr,fc in paires:
    print('   %-32s REF %.2f:1 (fond %s)   CAP %.2f:1 (fond %s)'%(n,rat(t,fr),'#%02x%02x%02x'%fr,rat(t,fc),'#%02x%02x%02x'%fc))
