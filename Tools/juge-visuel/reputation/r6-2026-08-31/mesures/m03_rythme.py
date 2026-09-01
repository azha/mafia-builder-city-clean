# m03 - rythme vertical: frontieres horizontales fortes dans le cadre, en px CSS depuis le haut du cadre.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref_m120",D+"reference/m-120.png",18,376,881,1731,3.0),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",18,18,1061,1644,3.6)]
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); print(f"== {k} size={im.size} scale={sc}")
    px=im.load()
    W=x1-x0
    prof=[]
    for y in range(y0,y1):
        s=0
        for x in range(x0+4,x1-4,3):
            a=px[x,y]; b=px[x,y-1]
            s+=abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2])
        prof.append((y,s/((W-8)//3)))
    thr=14
    peaks=[]
    for i,(y,v) in enumerate(prof):
        if v>thr:
            if peaks and y-peaks[-1][-1][0]<=2: peaks[-1].append((y,v))
            else: peaks.append([(y,v)])
    print("  frontieres (y_px, y_CSS depuis haut cadre, force):")
    for g in peaks:
        y=max(g,key=lambda t:t[1])[0]; v=max(t[1] for t in g)
        print(f"    y={y:5d}  css={(y-y0)/sc:7.1f}  force={v:5.1f}")
