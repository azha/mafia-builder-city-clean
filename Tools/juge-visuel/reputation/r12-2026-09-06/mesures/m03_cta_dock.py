import sys; sys.path.insert(0,'.')
from lib import *

print("=== m03 : boite du CTA (filet or) + haut du dock, et leur recouvrement ===")
def cta_box(im, y0, y1):
    """cherche les 2 lignes or les plus larges dans [y0,y1] et les 2 colonnes or"""
    p = px(im); W,H = im.size
    lig = [(y, sum(1 for x in range(0,W) if est_or(p[x,y]))) for y in range(y0,y1)]
    fortes = [ (y,n) for y,n in lig if n > 0.55*W ]
    col = [(x, sum(1 for y in range(y0,y1) if est_or(p[x,y]))) for x in range(W)]
    fc = [ (x,n) for x,n in col if n > 0.45*(y1-y0) ]
    return fortes, fc

for nom, f, y0, y1 in [
  ('REF   ','../reference-1080x2102.png',1900,2102),
  ('C2400 ','../capture-1080x2400.png',1950,2400),
  ('C1920 ','../capture-1080x1920.png',1630,1920),
  ('S2400 ','../capture-ecran-seul-1080x2400.png',2110,2400),
  ('S1920T','../capture-ecran-seul-1080x1920-T.png',1630,1920),
]:
    im = ouvrir(f)
    fortes, fc = cta_box(im, y0, y1)
    print(f"  {nom} lignes-or fortes: {[y for y,_ in fortes]}")
    print(f"  {nom} colonnes-or     : {[x for x,_ in fc]}")

print()
print("=== dock : cercles (anneaux) et libelles, par la LUMINANCE hors zone du cadre ===")
def dock_top(im, ystart):
    p = px(im); W,H = im.size
    for y in range(ystart, H):
        vals = sorted(lum(p[x,y]) for x in range(W))
        med = vals[len(vals)//2]
        n = sum(1 for x in range(W) if lum(p[x,y]) - med > 8)
        if n > 40:
            return y, n, med
    return None
for nom, f, ys in [('C2400 ','../capture-1080x2400.png',2110),('C1920 ','../capture-1080x1920.png',1630)]:
    im = ouvrir(f)
    print(f"  {nom} premiere ligne 'claire' apres le cadre : {dock_top(im, ys)}")
