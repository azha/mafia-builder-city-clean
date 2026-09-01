# m05 - traits du portrait: bbox de chaque trait par classification couleur, en % de la carte.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
# carte: (x0,y0,x1,y1) mesures par m04
CASES=[("ref_m120",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]

def cls(p):
    r,g,b=p
    mx,mn=max(p),min(p)
    if r>170 and g>160 and b>130 and b<r-15 and mx-mn<70: return "peau/cou"      # beige chair
    if r>215 and g>210 and b>195: return "col(creme)"                            # cream
    if 70<r<140 and 70<g<140 and 70<b<140 and mx-mn<28: return "montre(gris)"    # grey
    return None
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); print(f"== {k} size={im.size} carte=({x0},{y0},{x1},{y1}) scale={sc}")
    px=im.load(); Wc=(x1-x0); Hc=(y1-y0)
    acc={}
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=cls(px[x,y])
            if c:
                a=acc.setdefault(c,[x,y,x,y,0])
                a[0]=min(a[0],x);a[1]=min(a[1],y);a[2]=max(a[2],x);a[3]=max(a[3],y);a[4]+=1
    for c,(ax,ay,bx,by,n) in sorted(acc.items()):
        w=(bx-ax+1); h=(by-ay+1)
        print(f"  {c:12s} bbox px=({ax},{ay},{bx},{by}) taille CSS={w/sc:.1f}x{h/sc:.1f} "
              f"| %carte x={(ax-x0)/Wc*100:.1f}..{(bx-x0)/Wc*100:.1f} y={(ay-y0)/Hc*100:.1f}..{(by-y0)/Hc*100:.1f} "
              f"| aire={n} remplissage_bbox={n/(w*h):.3f}")
