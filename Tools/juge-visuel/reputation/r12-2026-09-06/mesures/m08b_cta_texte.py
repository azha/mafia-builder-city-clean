import sys; sys.path.insert(0,'.')
from lib import *
print("=== m08b : encre du LIBELLE seul (interieur de la boite, filets exclus) ===")
CAS = [
 ('REF   ','../reference-1080x2102.png', 1952,2046, 21,1058),
 ('C2400 ','../capture-1080x2400.png',   1989,2076, 18,1061),
 ('S1920T','../capture-ecran-seul-1080x1920-T.png', 1650,1737, 46,1033),
 ('C1920 ','../capture-1080x1920.png',   1650,1737, 46,1033),
]
res={}
for nom,f,yt,yb,xl,xr in CAS:
    im = ouvrir(f)
    bb = bbox_masque(im, lambda c: est_or(c,50) and lum(c)>90, xl+10, yt+8, xr-9, yb-7)
    res[nom.strip()] = (bb, yt, yb)
    print(f"  {nom} boite {yt}..{yb} (h={yb-yt+1})  encre libelle : x {bb[0]}..{bb[2]} ({bb[2]-bb[0]+1}), y {bb[1]}..{bb[3]} (capitale {bb[3]-bb[1]+1}), n={bb[4]}")
print()
bb,_,_ = res['S1920T']
print(f"  a 1920, dock a partir de y=1684 : lignes d'encre du LIBELLE couvertes = {max(0,bb[3]-1684+1)} / {bb[3]-bb[1]+1} = {100*max(0,bb[3]-1684+1)/(bb[3]-bb[1]+1):.0f} %")
bbc,_,_ = res['C1920']
print(f"  encre du libelle survivante sous chrome : n={bbc[4]} contre {bb[4]} sans chrome -> {100*bbc[4]/bb[4]:.1f} %")
