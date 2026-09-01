# m21 - etendue horizontale du reflet + ordre de superposition avec la coiffe.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",18,376,3.0,907,900),
       ("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,636,1080)]
for k,f,ox,oy,sc,yl,W in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); print(f"== {k} size={im.size} ligne y={yl}")
    on=[]
    for x in range(0,W):
        a=px[x,yl]; b=px[x,yl-8]  # meme x, 8px au-dessus (hors ligne)
        d=sum(a)-sum(b)
        if d>40: on.append(x)
    if on:
        segs=[];cur=[on[0]]
        for x in on[1:]:
            if x-cur[-1]<=4: cur.append(x)
            else: segs.append((cur[0],cur[-1])); cur=[x]
        segs.append((cur[0],cur[-1]))
        print("  segments eclaircis (px) ->CSS:", [(round((a-ox)/sc,1),round((b-ox)/sc,1)) for a,b in segs if b-a>3])
    # sur la coiffe : le reflet passe-t-il par-dessus ?
    print("  echantillons le long de la ligne (x CSS -> RGB ligne / RGB 8px au-dessus):")
    for xc in (30,45,60,75,90,105,120,140,180,220,260):
        x=int(ox+xc*sc)
        if 0<=x<W: print(f"    x={xc:4d}  {px[x,yl]}  /  {px[x,yl-8]}")
