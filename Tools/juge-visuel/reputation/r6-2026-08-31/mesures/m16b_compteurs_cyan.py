# m16b - masque cyan strict : hauteur de capitale et chasse des compteurs, et le tiret d'ENFREINTES.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
def cyan(p):
    r,g,b=p; return b>150 and g>145 and b-r>50
for k,f,ox,oy,sc,tiles,band in [("ref",D+"reference/m-120.png",18,376,3.0,[(45,299),(323,577),(601,855)],(590,700)),
                                ("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,[(49,358),(385,694),(722,1031)],(266,340))]:
    im=Image.open(f).convert("RGB"); px=im.load(); print(f"== {k} {im.size}")
    for i,(x0,x1) in enumerate(tiles,1):
        pts=[(x,y) for y in range(*band) for x in range(x0+4,x1-4) if cyan(px[x,y])]
        ax=min(p[0] for p in pts);bx=max(p[0] for p in pts);ay=min(p[1] for p in pts);by=max(p[1] for p in pts)
        print(f"  T{i} h_cap={(by-ay+1)/sc:5.2f}CSS chasse={(bx-ax+1)/sc:5.2f}CSS "
              f"centre_x={((ax+bx)/2-ox)/sc:6.1f} (tuile {((x0+x1)/2-ox)/sc:6.1f}) "
              f"mediane_y={(((ay+by)/2)-oy)/sc:5.1f} RGB={px[(ax+bx)//2,(ay+by)//2]}")
