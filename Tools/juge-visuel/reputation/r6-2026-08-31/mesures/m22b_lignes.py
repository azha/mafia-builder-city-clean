# m22b - decoupage en lignes de texte (seuil 88 : au-dessus du lisere 42,53,73) des 4 rangees de regles.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
ir=Image.open(D+"reference/m-120.png").convert("RGB"); pr=ir.load()
ic=Image.open(S+"screen_b3_reputation_1080x1920.png").convert("RGB"); pc=ic.load()
print("REF",ir.size,"CAP",ic.size)
def lignes(px,x0,y0,x1,y1,thr,ox,oy,sc,lab):
    print(" ",lab); cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if max(px[x,y])>thr]
        if len(xs)>=2:
            cur=[y,y,min(xs),max(xs)] if cur is None else [cur[0],y,min(cur[2],min(xs)),max(cur[3],max(xs))]
        else:
            if cur and cur[1]-cur[0]>=2:
                print(f"    y {(cur[0]-oy)/sc:6.1f}..{(cur[1]-oy)/sc:6.1f} h={(cur[1]-cur[0]+1)/sc:4.1f}  x {(cur[2]-ox)/sc:6.1f}..{(cur[3]-ox)/sc:6.1f} l={(cur[3]-cur[2]+1)/sc:5.1f}")
            cur=None
for i,(ry0,ry1,cy0,cy1) in enumerate([(838,914,538,622),(920,1010,640,730),(1017,1108,750,838),(1129,1205,860,945)],1):
    lignes(pr,470,ry0,850,ry1,88,18,376,3.0,f"REF rangee {i}")
    lignes(pc,545,cy0,1010,cy1,88,18,18,3.6,f"CAP rangee {i}")
