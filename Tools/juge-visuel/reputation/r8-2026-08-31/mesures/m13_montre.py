#!/usr/bin/env python3
"""m13 — la MONTRE (poignet gauche du buste). Deux sorties :
 1) un crop apparie, ramene a 12 px/CSS, empile REF puis CAP -> crop_montre.png ;
 2) la mesure : dans la fenetre, tout pixel plus CLAIR que le buste (luminance > 45) est
    considere comme la montre ; bbox, aire, couleur mediane.
Repere m01 ; fenetre en CSS depuis le haut du cadre.
Controle positif: la fenetre couvre la meme zone CSS des deux cotes (imprimee).
Controle negatif: la meme mesure dans une fenetre de MEME TAILLE prise au centre du buste
(sans montre) doit donner une aire tres inferieure."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376, 0.0)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18, -2.7)
OUT = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/mesures/crop_montre.png"

WIN = (28, 250, 68, 275)     # x0,y0,x1,y1 CSS depuis le cadre (REF) ; CAP decale de dy
NEG = (75, 250, 115, 275)    # meme taille, centre/droite du buste
K = 12.0
outs = []
for n, (p, sc, l, t, dy) in (("REF", REF), ("CAP", CAP)):
    im = Image.open(p).convert("RGB"); px = im.load()
    print(f"{n} {p.split('/')[-1]} {im.size}  dy={dy}")
    for lbl, w in (("montre", WIN), ("[ctrl neg] buste nu", NEG)):
        x0 = int(l + w[0] * sc); y0 = int(t + (w[1] + dy) * sc)
        x1 = int(l + w[2] * sc); y1 = int(t + (w[3] + dy) * sc)
        pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1)
               if sum(px[x, y][:3]) / 3 > 45]
        if not pts:
            print(f"  {lbl:20s} fenetre CSS x{w[0]}..{w[2]} y{w[1]+dy:.1f}..{w[3]+dy:.1f} : RIEN")
            continue
        X = [q[0] for q in pts]; Y = [q[1] for q in pts]
        med = tuple(sorted(px[q[0], q[1]][i] for q in pts)[len(pts) // 2] for i in range(3))
        print(f"  {lbl:20s} fenetre CSS x{w[0]}..{w[2]} y{w[1]+dy:.1f}..{w[3]+dy:.1f} : "
              f"bbox_css=({(min(X)-l)/sc:.1f},{(min(Y)-t)/sc:.1f},{(max(X)-l)/sc:.1f},{(max(Y)-t)/sc:.1f}) "
              f"l={(max(X)-min(X))/sc:.1f} h={(max(Y)-min(Y))/sc:.1f} aire={len(pts)/sc/sc:.1f} couleur={med}")
    x0 = int(l + WIN[0] * sc); y0 = int(t + (WIN[1] + dy) * sc)
    x1 = int(l + WIN[2] * sc); y1 = int(t + (WIN[3] + dy) * sc)
    outs.append(im.crop((x0, y0, x1, y1)).resize((int((WIN[2]-WIN[0])*K), int((WIN[3]-WIN[1])*K)), Image.LANCZOS))

W = max(o.width for o in outs); H = sum(o.height for o in outs) + 10
c = Image.new("RGB", (W, H), (255, 0, 255)); y = 0
for o in outs:
    c.paste(o, (0, y)); y += o.height + 10
c.save(OUT)
print("->", OUT, c.size)
