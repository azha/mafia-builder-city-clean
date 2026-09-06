# m02 : reperes geometriques communs aux deux images (la ville EST la meme peinture).
#  - le fleuve LE THRENNY : bande teal (b nettement > r) -> bornes hautes/basses par colonne
#  - les 3 pylones du port : colonnes sombres a pastilles or, en haut de la carte
# Controle positif : la largeur des deux images (1080) imprimee ; controle negatif :
# une colonne HORS fleuve (y borne) doit rendre 0 ligne teal.
from PIL import Image

def teal(p):
    r,g,b = p
    return b > 55 and b - r > 28 and g - r > 12

def bande_fleuve(path, cols, ymin, ymax):
    im = Image.open(path).convert('RGB'); print(f"  ouvert {path} -> {im.size}")
    px = im.load()
    res = {}
    for c in cols:
        ys = [y for y in range(ymin, ymax) if teal(px[c, y])]
        if ys:
            # plus longue plage contigue
            best=(ys[0],ys[0]); cur=(ys[0],ys[0])
            for y in ys[1:]:
                if y-cur[1] <= 4: cur=(cur[0],y)
                else:
                    if cur[1]-cur[0] > best[1]-best[0]: best=cur
                    cur=(y,y)
            if cur[1]-cur[0] > best[1]-best[0]: best=cur
            res[c]=best
        else: res[c]=None
    return res

print("=== FLEUVE (bande teal), colonnes x=100,300,540,780,980")
cols=[100,300,540,780,980]
R = bande_fleuve('reference-1080x2102.png', cols, 900, 1400)
C = bande_fleuve('capture-1080x2400.png',   cols, 900, 1700)
print(f"{'x':>5} {'ref haut':>9} {'ref bas':>8} {'ref h':>6} | {'cap haut':>9} {'cap bas':>8} {'cap h':>6} | h cap/ref")
for c in cols:
    r,k = R[c], C[c]
    if r and k:
        hr=r[1]-r[0]+1; hk=k[1]-k[0]+1
        print(f"{c:>5} {r[0]:>9} {r[1]:>8} {hr:>6} | {k[0]:>9} {k[1]:>8} {hk:>6} | {hk/hr:.3f}")
    else:
        print(f"{c:>5} {r} | {k}")

print()
print("=== CONTROLE NEGATIF : colonne x=540 bornee 300..500 (hors fleuve) doit etre vide")
print("  ref:", bande_fleuve('reference-1080x2102.png',[540],300,500)[540])
print("  cap:", bande_fleuve('capture-1080x2400.png',[540],300,500)[540])
