"""03 - Geometrie HORIZONTALE : bords gauche/droit des panneaux sur des lignes choisies.
Controle positif : la largeur totale vaut 1080 dans les deux images.
Controle negatif : la ligne de fond (hors panneau) ne doit produire AUCUN bord."""
from PIL import Image
from statistics import median

def bords(path, ys, fond_tol=8):
    im = Image.open(path).convert('RGB'); print(f"{path}: {im.size}")
    p = im.load(); w,h = im.size
    for y in ys:
        # couleur de fond = mediane des 20 px les plus a gauche
        f = tuple(int(median([p[x,y][i] for x in range(0,20)])) for i in range(3))
        xs = [x for x in range(w) if max(abs(p[x,y][i]-f[i]) for i in range(3)) > fond_tol]
        if xs:
            print(f"   y={y:4d} fond={f} -> x {min(xs)}..{max(xs)}  largeur={max(xs)-min(xs)+1}")
        else:
            print(f"   y={y:4d} fond={f} -> AUCUN bord (ligne de fond pur)")
    print()

bords('../reference-1080x2102.png', [300, 500, 690, 760, 1000, 1300, 1700, 1980, 2050])
bords('../capture-1080x2400.png',  [200, 300, 400, 560, 645, 820, 1080, 1400, 1700, 2050, 2150])
