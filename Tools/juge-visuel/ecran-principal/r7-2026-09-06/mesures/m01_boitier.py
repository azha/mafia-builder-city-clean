# -- m01 : geometrie du boitier du medaillon (centre, rayons) par masque de couleur du cerclage
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def ring_bbox(key, target, tol, box_css):
    s=sc(key); im=img(key)
    x0,y0,x1,y1=[int(round(v*s)) for v in box_css]
    a=im.crop((x0,y0,x1,y1)); W,H=a.size; d=a.load()
    xs=[];ys=[];n=0
    for y in range(H):
        for x in range(W):
            p=d[x,y]
            if all(abs(p[c]-target[c])<=tol for c in range(3)):
                xs.append(x);ys.append(y);n+=1
    if not n: return None
    bb=(min(xs),min(ys),max(xs),max(ys))
    # en CSS absolu
    return dict(n=n,
        x0=(x0+bb[0])/s, y0=(y0+bb[1])/s, x1=(x0+bb[2]+1)/s, y1=(y0+bb[3]+1)/s,
        cx=(x0+(bb[0]+bb[2]+1)/2)/s, cy=(y0+(bb[1]+bb[3]+1)/2)/s,
        w=(bb[2]-bb[0]+1)/s, h=(bb[3]-bb[1]+1)/s)

print("=== CONTROLE POSITIF : .medaillon du canon doit sortir 64x64 CSS a (164,8) ===")
r = ring_bbox('ref',(176,141,62),26,(150,0,245,80))
print("ref laiton", {k:(round(v,2) if isinstance(v,float) else v) for k,v in r.items()})
print("   attendu bbox css x 164..228  y 8..72  centre (196,40)")

print()
print("=== CAPTURES : cerclage braise (224,102,74) attendu a l'etat BRULANT ===")
for k in ['c19','c24','d24']:
    r = ring_bbox(k,(224,102,74),30,(150,0,245,80))
    print(k,"braise", {kk:(round(v,2) if isinstance(v,float) else v) for kk,v in r.items()} if r else None)
print()
print("=== CONTROLE NEGATIF : y a-t-il du LAITON (176,141,62) dans le cerclage des captures ? ===")
for k in ['c19','c24']:
    r = ring_bbox(k,(176,141,62),12,(150,0,245,80))
    print(k,"laiton", ({kk:(round(v,2) if isinstance(v,float) else v) for kk,v in r.items()} if r else "AUCUN"))
