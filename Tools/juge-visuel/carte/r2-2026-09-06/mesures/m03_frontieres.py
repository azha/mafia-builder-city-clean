# m03 — frontieres du chrome dans la CAPTURE et dans la REFERENCE, par profil de ligne.
# Convention : je cherche les lignes ou la variance horizontale s'effondre (bandeau/dock unis)
# et les sauts de luminance moyenne.
# Controle positif : la largeur du bandeau doit valoir 1080 (pleine largeur) — verifie plus bas.
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def prof(path, name):
    im = Image.open(os.path.join(D, path)).convert("RGB")
    print(f"OUVERT {name}: {im.size}")
    px = im.load(); W,H = im.size
    rows = []
    for y in range(H):
        vals = [px[x,y] for x in range(0, W, 4)]
        L = [0.2126*r+0.7152*g+0.0722*b for r,g,b in vals]
        rows.append((y, statistics.mean(L), statistics.pstdev(L)))
    return im, rows

for path, name, wins in (("capture-1080x2400.png","CAPTURE",[(150,260),(2080,2200)]),
                         ("reference-1080x2102.png","REFERENCE",[(160,260),(1850,2102)])):
    im, rows = prof(path, name)
    print(f"--- {name} : profil (y, Lmoy, ecart-type) sur les fenetres d'interet")
    for y0,y1 in wins:
        for y in range(y0, min(y1, len(rows))):
            y_, m, s = rows[y]
            print(f"  y={y_:4d} L={m:6.2f} sd={s:6.2f}")
        print("  ---")
