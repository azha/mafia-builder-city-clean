#!/usr/bin/env python3
"""m20 - (a) metrique du SOURCIL (seul texte capitale-a-capitale des deux cotes) ;
        (b) RYTHME VERTICAL : position de chaque bloc, en % du rect libre ;
        (c) FILET SEPARATEUR a l'interieur de la carte (present dans la reference ?).
Controle positif (a) : la chaine est la meme des deux cotes -> une mesure de largeur a hauteur de
capitale egale mesure l'interlettrage, pas le contenu.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def bbox_texte(im,x0,x1,y0,y1,pred,label,quoi):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(px[x,y]): xs.append(x);ys.append(y)
    if not xs: print(f"[{label}] {quoi} : RIEN"); return None
    bb=(min(xs),min(ys),max(xs),max(ys))
    print(f"[{label}] {quoi}: x={bb[0]}..{bb[2]} (l={bb[2]-bb[0]+1})  y={bb[1]}..{bb[3]} (hcap={bb[3]-bb[1]+1})")
    return bb

print("\n(a) SOURCIL 'CE QUI PESE LE PLUS AUJOURD'HUI' — meme chaine des deux cotes")
br=bbox_texte(ref,120,900,900,940,lambda p:L(p)<150,'REF','sourcil')
bc=bbox_texte(cap,60,700,1380,1418,lambda p:L(p)>70,'CAP','sourcil')
lr,hr=br[2]-br[0]+1,br[3]-br[1]+1
lc,hc=bc[2]-bc[0]+1,bc[3]-bc[1]+1
print(f"   REF l={lr} hcap={hr} -> l/hcap={lr/hr:.2f}")
print(f"   CAP l={lc} hcap={hc} -> l/hcap={lc/hc:.2f}")
print(f"   ecart de hauteur de capitale = {hc-hr:+d} px ({(hc-hr)/hr*100:+.1f}%)")
print(f"   ecart de CHASSE a hauteur egale (l/hcap) = {(lc/hc)/(lr/hr)-1:+.1%}")

print("\n(b) RYTHME VERTICAL — position des blocs en % du rect libre")
# rect libre : REF y=211..2101 (h=1891) ; CAP y=143..2178 (h=2036)
def pct(y,y0,h): return (y-y0)/h*100
blocs_ref = [('haut de la carte',765),('bas de la carte',1537),('legende italique',1565),
             ('haut CTA2',1622),('bas CTA2',1774),('haut CTA1 (bandeau or)',1784),('bas CTA1',2053)]
blocs_cap = [('haut de la carte',1278),('bas de la carte',1687),('legende',1720),
             ('haut CTA2',1779),('bas CTA2',1901),('haut CTA1',1931),('bas CTA1',2130)]
print("   REF (rect libre 211..2101, h=1891) | CAP (rect libre 143..2178, h=2036)")
for (n1,y1),(n2,y2) in zip(blocs_ref,blocs_cap):
    p1=pct(y1,211,1891); p2=pct(y2,143,2036)
    print(f"     {n1:26s} REF {p1:6.1f}%   CAP {p2:6.1f}%   ecart {p2-p1:+6.1f} pts")
print(f"   -> DEBUT du contenu : REF a {pct(765,211,1891):.1f}% du rect libre, CAP a {pct(1278,143,2036):.1f}%")
print(f"   -> le contenu occupe : REF {pct(2053,211,1891)-pct(765,211,1891):.1f}% du rect libre,"
      f" CAP {pct(2130,143,2036)-pct(1278,143,2036):.1f}%")

print("\n(c) FILET SEPARATEUR dans la carte")
# REF : trait clair-rose horizontal sous le titre. On cherche une ligne longue et fine.
def filet(im,x0,x1,y0,y1,label,pred):
    px=im.load(); best=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if pred(px[x,y]))
        if best is None or n>best[1]: best=(y,n)
    print(f"[{label}] meilleure ligne y={best[0]} : {best[1]}/{x1-x0} colonnes = {best[1]/(x1-x0)*100:.1f}%")
    return best
print("   REF : un trait plus SOMBRE que la creme, dans la bande sous le titre")
filet(ref,150,660,1280,1340,'REF',lambda p: L(p)<195)
print("   CAP : meme recherche dans la bande homologue de la carte")
filet(cap,80,640,1545,1570,'CAP',lambda p: L(p)>40)
