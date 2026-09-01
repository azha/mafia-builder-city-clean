# m02 - palette globale + luminance + densite, sur la ZONE DU CADRE seulement (comparable).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref_m120",D+"reference/m-120.png",18,376,881,1731),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",18,18,1061,1644),
       ("cap2400",S+"screen_b3_reputation_1080x2400.png",18,18,1061,1644)]
for k,f,x0,y0,x1,y1 in CASES:
    im=Image.open(f).convert("RGB"); print(f"== {k} size={im.size} cadre=({x0},{y0},{x1},{y1})")
    c=im.crop((x0,y0,x1,y1))
    q=c.quantize(colors=8,method=Image.MEDIANCUT).convert("RGB")
    cols=sorted(q.getcolors(1<<20),reverse=True)
    tot=sum(n for n,_ in cols)
    for n,rgb in cols[:8]:
        print(f"   {rgb}  {100*n/tot:5.1f}%")
    g=c.convert("L"); h=g.histogram(); N=sum(h)
    lum=sum(i*h[i] for i in range(256))/N
    ink=sum(h[i] for i in range(60,256))/N
    print(f"   luminance moyenne={lum:.1f}  part 'encre' (L>=60)={100*ink:.1f}%")
