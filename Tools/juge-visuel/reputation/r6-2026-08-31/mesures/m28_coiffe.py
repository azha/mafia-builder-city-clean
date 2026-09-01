# m28 - la coiffe : largeur de la masse sombre par ligne, du sommet du crane au menton,
# rapportee a la largeur du VISAGE (peau). Invariant d'echelle.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
def sombre(p): return max(p)<70 and (p[2]-p[0])<12
def peau(p):
    r,g,b=p; return 160<r<205 and 145<g<195 and 115<b<175 and r-b>25
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); Wc=x1-x0;Hc=y1-y0
    print(f"== {k} size={im.size}")
    # largeur max du visage
    wf=0
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if peau(px[x,y])]
        if xs and max(xs)-min(xs)+1>wf and max(xs)-min(xs)<int(60*sc): wf=max(xs)-min(xs)+1
    print(f"  largeur max du visage = {wf/sc:.1f} CSS")
    print("  y%carte | largeur masse sombre (CSS) | /largeur visage | largeur peau (CSS)")
    for yp in [x/10 for x in range(200,560,20)]:
        y=y0+int(yp/100*Hc)
        xs=[x for x in range(x0+4,x1-3) if sombre(px[x,y])]
        ps=[x for x in range(x0+4,x1-3) if peau(px[x,y])]
        w=(max(xs)-min(xs)+1)/sc if xs else 0
        wp=(max(ps)-min(ps)+1)/sc if ps else 0
        print(f"   {yp:5.1f} | {w:6.1f} | {w/(wf/sc):5.2f} | {wp:6.1f}")
