# m02 — ou sont les 5105 px de delta entre les deux "captures du meme run" ?
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap = Image.open(os.path.join(D, "capture-1080x2400.png")).convert("RGB")
cs  = Image.open(os.path.join(D, "capture-carte-seule-1080x2400.png")).convert("RGB")
print("OUVERT", cap.size, cs.size)
a = cap.load(); b = cs.load()
W, H = cap.size
runs = []   # regroupe les lignes touchees en blocs contigus
cur = None
per_row = []
for y in range(H):
    xs = [x for x in range(W) if max(abs(a[x,y][k]-b[x,y][k]) for k in range(3)) > 2]
    per_row.append(xs)
    if xs:
        if cur is None: cur = [y, y]
        else: cur[1] = y
    else:
        if cur: runs.append(cur); cur = None
if cur: runs.append(cur)
for y0, y1 in runs:
    xs = [x for y in range(y0, y1+1) for x in per_row[y]]
    n = len(xs)
    print(f"bloc y {y0}..{y1} ({y1-y0+1} lignes) : {n} px, x {min(xs)}..{max(xs)}")
