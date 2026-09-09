# -- m42 : DOCK. (a) indicateur d'onglet actif (trait dore) ; (b) ronds : remplissage vs fond du dock, cerclage ;
#          (c) fond du dock (dispersion = transparence a l'art).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222,'t24':174.222}
dore = lambda p: (p[0]-p[2])>60 and p[0]>120 and p[1]>90
print("=== (a) INDICATEUR d'onglet actif : pixels dores dans la bande sous les ronds ===")
for key in ['ref','c19','c24','t24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    xs=[];ys=[];n=0
    for yp in range(int((660+dy)*s),int((672+dy)*s)):
        for xp in range(0,im.width):
            if dore(d[xp,yp]): xs.append(xp/s); ys.append(yp/s-dy); n+=1
    if n: print("   %-4s n=%4d px  x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)  centre x=%.2f"%(key,n,min(xs),max(xs),max(xs)-min(xs),min(ys),max(ys),max(ys)-min(ys),(min(xs)+max(xs))/2))
    else: print("   %-4s AUCUN pixel dore"%key)
print()
print("=== (b) ronds : couleur au CENTRE, cerclage, fond du dock a cote ===")
for key in ['ref','c19','c24']:
    dy=DY[key]
    for i,cx in enumerate([94,162,230,298]):
        c1,_=median_box(key,cx-6,634+dy,cx+6,646+dy)
        c2,_=median_box(key,cx-30,634+dy,cx-25,646+dy)
        print("   %-4s rond %d : interieur %-16s L=%5.1f | fond du dock a cote %-16s L=%5.1f | ecart L=%+.1f"
              %(key,i+1,str(c1),lum(c1),str(c2),lum(c2),lum(c1)-lum(c2)))
print()
print("=== (c) fond du dock : dispersion (transparence a l'art) ===")
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    vals=[]
    for yp in range(int((610+dy)*s),int((628+dy)*s)):
        for xp in range(int(10*s),int(382*s)): vals.append(lum(d[xp,yp]))
    n=len(vals); m=sum(vals)/n; sd=math.sqrt(sum((v-m)**2 for v in vals)/n); vals.sort()
    print("   %-4s bande y 610..628 : moyenne L=%.1f  ecart-type=%.2f  p2=%.1f p98=%.1f (etendue %.1f)"%(key,m,sd,vals[int(0.02*n)],vals[int(0.98*n)],vals[int(0.98*n)]-vals[int(0.02*n)]))
