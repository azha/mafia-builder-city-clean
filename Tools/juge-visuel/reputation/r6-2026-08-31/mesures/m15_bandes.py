# m15 - bandes de bordure (42,54,72) avec leur etendue en x -> identification sure des blocs.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",18,376,3.0),("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6)]
def bord(p):
    r,g,b=p; return abs(r-42)<16 and abs(g-53)<18 and abs(b-72)<20
for k,f,ox,oy,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); W,H=im.size
    print(f"== {k} size={W}x{H}")
    xa,xb=ox+4,ox+int(288*sc)
    prev=None
    for y in range(oy,oy+int(452*sc)):
        xs=[x for x in range(xa,xb) if bord(px[x,y])]
        if len(xs)<40: continue
        # segments contigus
        segs=[];cur=[xs[0]]
        for x in xs[1:]:
            if x-cur[-1]<=6: cur.append(x)
            else: segs.append((cur[0],cur[-1])); cur=[x]
        segs.append((cur[0],cur[-1]))
        segs=[(a,b) for a,b in segs if b-a>40]
        if not segs: continue
        key=tuple((round((a-ox)/sc),round((b-ox)/sc)) for a,b in segs)
        if key!=prev:
            print(f"  y={y:5d} css={(y-oy)/sc:7.2f}  segments x CSS={key}")
            prev=key
