# m14 - bbox des panneaux (bordure (42,54,72)) : plaque titre, panneau portrait, panneau verdict,
# rangees de regles. Sortie en CSS relatif au cadre.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",18,376,3.0),("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6)]
def bord(p):
    r,g,b=p; return abs(r-42)<14 and abs(g-53)<16 and abs(b-72)<18
for k,f,ox,oy,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); W,H=im.size
    print(f"== {k} size={W}x{H}")
    # lignes horizontales de bordure longues (>50% largeur du cadre)
    xa,xb=ox+8,ox+int(287*sc)-8
    rows=[]
    for y in range(oy,oy+int(452*sc)):
        c=sum(1 for x in range(xa,xb,2) if bord(px[x,y]))
        if c>0.45*((xb-xa)//2): rows.append(y)
    grp=[];cur=[]
    for y in rows:
        if cur and y-cur[-1]<=2: cur.append(y)
        else:
            if cur: grp.append((cur[0],cur[-1]))
            cur=[y]
    if cur: grp.append((cur[0],cur[-1]))
    print("  bordures horizontales pleine largeur (y0,y1)->CSS:")
    for a,b in grp: print(f"    {a}-{b}  css {(a-oy)/sc:7.2f}..{(b-oy)/sc:7.2f}")
