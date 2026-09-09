import sys; sys.path.insert(0,'.')
from lib import *
print("=== m17 : masques du buste (peau, creme du col, calotte) dans la carte ===")
# cartes : REF interieur x85..502 y880..1529 ; JEU x81..497 y908..1555
CAS=[('REF','../reference-1080x2102.png',85,880,502,1529),
     ('JEU','../capture-1080x2400.png',  81,908,497,1555)]
def peau(c):
    r,g,b=c; return 150<r<215 and 140<g<205 and 110<b<175 and r>g>b
def creme(c):
    r,g,b=c; return r>215 and g>210 and b>185
for nom,f,x0,y0,x1,y1 in CAS:
    im=ouvrir(f)
    bp=bbox_masque(im, peau, x0,y0,x1,y1)
    bc=bbox_masque(im, creme, x0,y0,x1,y1)
    print(f"  {nom} PEAU  bbox x{bp[0]}..{bp[2]} ({bp[2]-bp[0]+1}) y{bp[1]}..{bp[3]} ({bp[3]-bp[1]+1}) n={bp[4]}")
    if bc: print(f"  {nom} CREME bbox x{bc[0]}..{bc[2]} ({bc[2]-bc[0]+1}) y{bc[1]}..{bc[3]} ({bc[3]-bc[1]+1}) n={bc[4]}")
    else:  print(f"  {nom} CREME : aucun pixel")
    # histogramme des couleurs dominantes de la carte
    im2 = im.crop((x0,y0,x1,y1)).quantize(colors=10).convert('RGB')
    cs = sorted(im2.getcolors(100000), reverse=True)[:8]
    tot=sum(n for n,_ in im2.getcolors(100000))
    print(f"  {nom} palette de la carte : " + " ".join(f"{c}:{100*n/tot:.1f}%" for n,c in cs))
