# m13b - aplats surs (fenetres au centre des blocs, >=3px de tout bord) : tuiles, verdict, CTA, buste, montre.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
ir=Image.open(D+"reference/m-120.png").convert("RGB"); ic=Image.open(S+"screen_b3_reputation_1080x1920.png").convert("RGB")
print("REF",ir.size,"CAP",ic.size)
def med(im,x0,y0,x1,y1):
    px=im.load(); v=[px[x,y] for x in range(x0,x1) for y in range(y0,y1)]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
for lab,r,c in [("T1 fond",(50,592,80,610),(56,270,92,292)),("T2 fond",(328,592,358,610),(392,270,428,292)),
                ("T3 fond",(606,592,636,610),(729,270,765,292)),("CTA fond",(60,1640,150,1690),(70,1535,180,1600)),
                ("buste",(200,1180,280,1220),(240,930,320,970))]:
    a=med(ir,*r); b=med(ic,*c); print(f"  {lab:10s} REF={a} CAP={b} delta={tuple(b[i]-a[i] for i in range(3))}")
