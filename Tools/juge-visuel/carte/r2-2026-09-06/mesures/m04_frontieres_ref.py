# m04 — frontieres du contenu dans la REFERENCE (bas du bandeau evoque, bas de l'image).
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D, "reference-1080x2102.png")).convert("RGB")
print("OUVERT reference:", im.size)
px = im.load(); W,H = im.size
def row(y):
    v=[px[x,y] for x in range(0,W,4)]
    L=[0.2126*r+0.7152*g+0.0722*b for r,g,b in v]
    return statistics.mean(L), statistics.pstdev(L)
print("-- haut : recherche du bas du bandeau evoque")
for y in range(185, 225):
    m,s=row(y); print(f"  y={y} L={m:6.2f} sd={s:6.2f}  px(540,y)={px[540,y]} px(60,y)={px[60,y]}")
print("-- bas : derniere ligne de contenu")
for y in range(2060, 2102):
    m,s=row(y); print(f"  y={y} L={m:6.2f} sd={s:6.2f}  px(540,y)={px[540,y]}")
