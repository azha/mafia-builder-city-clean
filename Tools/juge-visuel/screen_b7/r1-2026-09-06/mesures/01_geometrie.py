"""01 - Geometrie : profils de luminance par ligne, frontieres horizontales.
Controle positif : la largeur des deux images doit etre 1080 (echelle x3.6 des deux cotes,
cf dossier.md "Echelle"). Controle negatif : les hauteurs doivent differer (2102 vs 2400)."""
from PIL import Image

def lum(px):
    r,g,b = px[:3]
    return 0.2126*r + 0.7152*g + 0.0722*b

def profil(path):
    im = Image.open(path).convert('RGB')
    print(f"{path}: {im.size}")
    w,h = im.size
    p = im.load()
    out = []
    for y in range(h):
        s = 0.0
        for x in range(0, w, 4):
            s += lum(p[x,y])
        out.append(s/((w+3)//4))
    return im, out

for f in ['../reference-1080x2102.png','../capture-1080x2400.png']:
    im, pr = profil(f)
    print("  largeur:", im.width, "hauteur:", im.height)
    # frontieres : |delta| > 3 sur le profil lisse
    print("  frontieres (|d lum| > 3.0):")
    prev = None
    for y in range(1, len(pr)):
        d = pr[y]-pr[y-1]
        if abs(d) > 3.0:
            print(f"    y={y:4d}  lum {pr[y-1]:6.2f} -> {pr[y]:6.2f}  d={d:+6.2f}")
    print()
