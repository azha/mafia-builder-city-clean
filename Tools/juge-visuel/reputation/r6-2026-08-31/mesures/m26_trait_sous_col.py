# m26 - element horizontal clair sous la pointe du col : present en jeu ? present dans la maquette ?
# Meme critere, meme fenetre relative (65%..82% de la hauteur de carte, 30%..70% de la largeur).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); Wc=x1-x0;Hc=y1-y0
    print(f"== {k} size={im.size}")
    xa,xb=x0+int(0.28*Wc),x0+int(0.72*Wc)
    for yy in range(y0+int(0.65*Hc), y0+int(0.84*Hc)):
        xs=[x for x in range(xa,xb) if max(px[x,yy])>90]
        if xs:
            # segments
            segs=[];cur=[xs[0]]
            for x in xs[1:]:
                if x-cur[-1]<=3: cur.append(x)
                else: segs.append((cur[0],cur[-1])); cur=[x]
            segs.append((cur[0],cur[-1]))
            for a,b in segs:
                if b-a>int(6*sc):
                    C=px[(a+b)//2,yy]
                    print(f"   y%carte={(yy-y0)/Hc*100:5.2f}  segment x%carte={(a-x0)/Wc*100:5.1f}..{(b-x0)/Wc*100:5.1f} "
                          f"largeur={(b-a+1)/sc:5.1f}CSS RGB={C}")
