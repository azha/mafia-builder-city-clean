# -- m19 : COULEUR des arcs, avec le FOND LOCAL adjacent (les deux fonds different : on compare les deux couples).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}
ARC={'ref':{'teal':(13.0,(100,140)),'braise':(14.5,(15,45))},
     'c19':{'teal':(15.2,(100,140)),'braise':(15.9,(20,50))},
     'c24':{'teal':(15.2,(100,140)),'braise':(15.9,(20,50))}}
FOND={'ref':{'teal':(19.0,(100,140)),'braise':(19.0,(15,45))},
      'c19':{'teal':(21.0,(100,140)),'braise':(21.0,(20,50))},
      'c24':{'teal':(21.0,(100,140)),'braise':(21.0,(20,50))}}
def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))
def med(key,r,a0,a1,step=0.25):
    s=sc(key); im=img(key); cx,cy=C[key]; V=[]
    a=a0
    while a<=a1:
        V.append(bil(im,s,cx+r*math.cos(math.radians(a)),cy-r*math.sin(math.radians(a)))); a+=step
    return tuple(round(sorted(v[c] for v in V)[len(V)//2],1) for c in range(3)), len(V)
print("  | cle | arc | couleur ARC (mediane sur le secteur) | L | fond local | L |")
for key in ['ref','c19','c24']:
    for nom in ['teal','braise']:
        r,(a0,a1)=ARC[key][nom]; rf,_=FOND[key][nom]
        ca,n=med(key,r,a0,a1); cf,_=med(key,rf,a0,a1)
        print("  %-4s %-7s r=%.1f  arc %-18s L=%6.1f | fond r=%.1f %-18s L=%6.1f | Δ arc−fond %s"
              %(key,nom,r,str(ca),lum(ca),rf,str(cf),lum(cf),str(tuple(round(ca[i]-cf[i],1) for i in range(3)))))
