import sys; sys.path.insert(0,'.')
from lib import *
print("=== m10 : CTA — boite, filets, libelle (encre strictement interieure) ===")
CAS = [
 ('REF   ','../reference-1080x2102.png', 1952,2046, 60,1020),
 ('C2400 ','../capture-1080x2400.png',   1989,2076, 56,1024),
 ('S1920T','../capture-ecran-seul-1080x1920-T.png', 1650,1737, 56,1024),
]
for nom,f,yt,yb,xl,xr in CAS:
    im = ouvrir(f); p = px(im)
    bb = bbox_masque(im, lambda c: est_or(c,50) and lum(c)>90, xl, yt+8, xr, yb-7)
    # epaisseur du filet haut
    W,H = im.size
    xm = 540
    ep_h = sum(1 for y in range(yt-3,yt+12) if est_or(p[xm,y]))
    ep_b = sum(1 for y in range(yb-11,yb+4) if est_or(p[xm,y]))
    print(f"  {nom} boite {yt}..{yb} h={yb-yt+1} | filet haut={ep_h}px filet bas={ep_b}px")
    print(f"        libelle : x {bb[0]}..{bb[2]} (largeur {bb[2]-bb[0]+1}), capitale {bb[3]-bb[1]+1} px, n={bb[4]}")

print()
print("=== filet bas du CTA a 1920 : combien de colonnes restent visibles sous le dock ? ===")
a = ouvrir('../capture-1080x1920.png'); pa=px(a)
b = ouvrir('../capture-ecran-seul-1080x1920-T.png'); pb=px(b)
def cols_or(p, y): return set(x for x in range(46,1034) if est_or(p[x,y]))
for y in (1735,1736,1737):
    ca, cb = cols_or(pa,y), cols_or(pb,y)
    print(f"  y={y} : sans chrome {len(cb)} colonnes or ; sous chrome {len(ca)} -> perdues {len(cb-ca)} ({100*len(cb-ca)/max(1,len(cb)):.0f} %)")
