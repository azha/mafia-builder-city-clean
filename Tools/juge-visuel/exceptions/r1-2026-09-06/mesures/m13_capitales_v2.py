# m13 — hauteur de capitale, v2 : test par PROXIMITÉ DE COULEUR à l'encre du texte (et non par
# luminance), et sens inversé pour un texte sombre sur plaque claire.
# Contrôles : (+) .attendant b = Georgia 10 px -> ~25 px attendus ; (-) .bulle p = Georgia 13 px
#   -> ~32 px : les deux doivent DIFFÉRER.
from util import *
print("== m13 hauteur de capitale (v2) ==")
def glyphe(im, fen, encre, tol, inverse=False):
    px=im.load(); x0,y0,x1,y1=fen
    def t(c):
        d=abs(c[0]-encre[0])+abs(c[1]-encre[1])+abs(c[2]-encre[2])
        return d<=tol
    cols=[]
    for x in range(x0,x1):
        cols.append(sum(1 for y in range(y0,y1) if t(px[x,y])))
    i=0
    while i<len(cols) and cols[i]==0: i+=1
    if i>=len(cols): return None
    j=i
    while j<len(cols) and cols[j]>0: j+=1
    xa,xb=x0+i,x0+j-1
    ya,yb=10**9,-1
    for x in range(xa,xb+1):
        for y in range(y0,y1):
            if t(px[x,y]): ya=min(ya,y); yb=max(yb,y)
    return (xa,ya,xb,yb,xb-xa+1,yb-ya+1)

cas=[
 ("RÉF  .ligne-soir 'T'",   REF,(150,655,400,705),(234,224,200),95),
 ("CAP  titre 'C'",         CAP,( 60,1288,400,1332),(150,163,168),100),
 ("RÉF  .attendant b 'L' (+ctrl 10px→~25)", REF,(120,1040,320,1085),(234,224,200),95),
 ("CAP  nom rangée 1 'V'",  CAP,( 40,1528,340,1570),(255,255,255),150),
 ("RÉF  .bulle p '«' (-ctrl 13px→~32)", REF,(330,1400,1000,1470),(234,224,200),95),
 ("RÉF  .bulle .qui b 'L'", REF,(330,1230,700,1280),(242,201,107),110),
 ("RÉF  .filet.lien 'E'",   REF,( 60,1960,700,2010),(234,224,200),110),
 ("CAP  'Escalades' 'E'",   CAP,(320,2020,800,2070),(255,255,255),150),
]
for lbl,P,fen,enc,tol in cas:
    im=Image.open(P).convert("RGB")
    g=glyphe(im,fen,enc,tol)
    if g is None: print(f"  {lbl:42s} : RIEN trouvé (fenêtre ou encre fausse)"); continue
    print(f"  {lbl:42s} x{g[0]}..{g[2]} y{g[1]}..{g[3]}  {g[4]}x{g[5]} px = {g[5]/3.6:.2f} CSS")

# textes SOMBRES sur plaque claire : tampon (réf) et CTA (capture, texte clair sur saumon)
print("  -- tampon / CTA --")
im=Image.open(REF).convert("RGB")
g=glyphe(im,(180,1715,1010,1795),(147,64,44),90); print(f"  RÉF  .tampon 'R' (encre #93402c)     x{g[0]}..{g[2]} y{g[1]}..{g[3]} {g[4]}x{g[5]} px = {g[5]/3.6:.2f} CSS")
g=glyphe(im,(150,1800,1000,1850),(147,64,44),120); print(f"  RÉF  .tampon small                   x{g[0]}..{g[2]} y{g[1]}..{g[3]} {g[4]}x{g[5]} px = {g[5]/3.6:.2f} CSS")
im=Image.open(CAP).convert("RGB")
g=glyphe(im,(100,1855,1000,1915),(255,255,255),120); print(f"  CAP  CTA 'T' (encre blanche)         x{g[0]}..{g[2]} y{g[1]}..{g[3]} {g[4]}x{g[5]} px = {g[5]/3.6:.2f} CSS")
g=glyphe(im,(300,1920,900,1965),(255,255,255),200); print(f"  CAP  CTA sous-titre                  x{g[0]}..{g[2]} y{g[1]}..{g[3]} {g[4]}x{g[5]} px = {g[5]/3.6:.2f} CSS")
