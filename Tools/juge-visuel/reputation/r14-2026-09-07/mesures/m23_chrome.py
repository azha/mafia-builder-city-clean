"""m23 — le CHROME contre le canon du HUD. Le canon fait 1176 px pour 392 CSS (x3),
la capture 1080 px pour 392 CSS (x2,755) : facteur de ramene = 1080/1176 = 0,9184.
Toute grandeur du canon est multipliee par 0,9184 avant comparaison.
Les bulles d'annotation ①..⑥ du canon sont de l'echafaudage : les fenetres les evitent.
Controle positif : le filet du bandeau doit tomber a la meme rangee des deux cotes.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane, contraste

K = 1080/1176.0
CAN = ouvrir('../hud-canon-1176.png'); J = ouvrir('../capture-1080x2400.png')

def bande(im, x0, y0, x1, y1, nom, frac=0.5):
    px = im.load()
    vals = [lum(px[x, y]) for y in range(y0, y1+1) for x in range(x0, x1+1)]
    lo = sorted(vals)[len(vals)//10]; hi = sorted(vals)[int(len(vals)*0.995)]
    s = lo + frac*(hi-lo)
    E = [(x, y) for y in range(y0, y1+1) for x in range(x0, x1+1) if lum(px[x, y]) >= s]
    if not E: print(f"   {nom}: rien"); return None
    xs = [p[0] for p in E]; ys = [p[1] for p in E]
    cm = tuple(int(round(mediane([px[x, y][i] for x, y in E]))) for i in range(3))
    print(f"   {nom:34s} x{min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1})"
          f" y{min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})  n={len(E)}  couleur {cm}")
    return (min(xs), min(ys), max(xs), max(ys), len(E), cm)

print("\n== filet du bandeau ==")
for nom, im, y0, y1, xa, xb in [('CANON', CAN, 140, 175, 100, 400), ('JEU', J, 130, 160, 100, 400)]:
    px = im.load()
    for y in range(y0, y1):
        c = tuple(int(round(mediane([px[x, y][i] for x in range(xa, xb)]))) for i in range(3))
        if lum(c) > 25: print(f"   {nom} y={y} : {c}  (canon ramene y={y*K:.0f})" if nom == 'CANON'
                              else f"   {nom} y={y} : {c}")

print("\n== libelle ARGENT ==")
a = bande(CAN, 40, 25, 260, 60, 'CANON ARGENT')
b = bande(J, 30, 15, 260, 50, 'JEU ARGENT')
if a and b:
    print(f"   canon ramene : largeur {(a[2]-a[0]+1)*K:.0f} px · capitale {(a[3]-a[1]+1)*K:.0f} px")
    print(f"   jeu          : largeur {b[2]-b[0]+1} px · capitale {b[3]-b[1]+1} px")

print("\n== medaillon : anneau ==")
for nom, im, cx, cy, r in [('CANON', CAN, 563, 100, 100), ('JEU', J, 540, 88, 92)]:
    px = im.load()
    # couleur de l'anneau : mediane sur la couronne au rayon r
    import math
    vals = []
    for k in range(360):
        x = int(cx + r*math.cos(math.radians(k))); y = int(cy + r*math.sin(math.radians(k)))
        if 0 <= x < im.size[0] and 0 <= y < im.size[1]: vals.append(px[x, y])
    cm = tuple(int(round(mediane([v[i] for v in vals]))) for i in range(3))
    br = max(vals, key=lambda v: lum(v))
    print(f"   {nom} : anneau r={r} mediane {cm} · px le plus clair {br}")

print("\n== dock : ronds et libelles (JEU 2400) ==")
px = J.load()
for y in range(2180, 2400):
    ref = mediane([lum(px[x, y]) for x in range(20, 1060)])
    xs = [x for x in range(20, 1060) if lum(px[x, y]) > ref + 10]
    if len(xs) > 20:
        print(f"   premiere rangee de ronds : y={y} x{min(xs)}..{max(xs)} n={len(xs)}"); break
b = bande(J, 100, 2320, 1000, 2360, 'libelles du dock')
print("\n== aile droite (JOUR / phase) ==")
bande(J, 700, 15, 1060, 60, 'JEU aile droite')
bande(CAN, 780, 25, 1160, 120, 'CANON aile droite (JOUR + heure)')
