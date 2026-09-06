import sys; sys.path.insert(0,'.')
from lib import *
print("=== m08 : libelle du CTA — bbox d'encre, et couverture par le dock a 1920 ===")
def bbox_or_clair(im, y0,y1,x0=0,x1=1080):
    return bbox_masque(im, lambda c: est_or(c,50) and lum(c)>90, x0,y0,x1,y1)
for nom,f,y0,y1 in [
  ('REF   ','../reference-1080x2102.png',1950,2050),
  ('C2400 ','../capture-1080x2400.png',1985,2080),
  ('S1920T','../capture-ecran-seul-1080x1920-T.png',1650,1740),
  ('C1920 ','../capture-1080x1920.png',1650,1740),
]:
    im = ouvrir(f)
    bb = bbox_or_clair(im,y0,y1)
    print(f"  {nom} encre du libelle : x {bb[0]}..{bb[2]} ({bb[2]-bb[0]+1} px), y {bb[1]}..{bb[3]} ({bb[3]-bb[1]+1} px), n={bb[4]}")

print()
print("  Boites du CTA (filets or) : REF 1952..2046 (95) | C2400 1989..2076 (88) | S1920T 1650..1737 (88)")
print("  A 1920 le dock commence a y=1684 (m07).")
im = ouvrir('../capture-ecran-seul-1080x1920-T.png')
bb = bbox_or_clair(im,1650,1740)
print(f"  encre du libelle a 1920 : y {bb[1]}..{bb[3]}  -> lignes d'encre couvertes par le dock : {max(0,bb[3]-1684+1)} / {bb[3]-bb[1]+1}")
