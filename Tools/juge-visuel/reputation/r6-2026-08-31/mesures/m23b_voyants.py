# m23b - voyants isoles (fenetre entre le bord de la rangee et le debut du texte).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
ir=Image.open(D+"reference/m-120.png").convert("RGB"); pr=ir.load()
ic=Image.open(S+"screen_b3_reputation_1080x1920.png").convert("RGB"); pc=ic.load()
print("REF",ir.size,"CAP",ic.size)
def v(px,ox,oy,sc,x0c,x1c,y0c,y1c,lab):
    x0=int(ox+x0c*sc);x1=int(ox+x1c*sc);y0=int(oy+y0c*sc);y1=int(oy+y1c*sc)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if max(px[x,y])>50]
    ax=min(p[0] for p in pts);bx=max(p[0] for p in pts);ay=min(p[1] for p in pts);by=max(p[1] for p in pts)
    cols=sorted((sum(px[x,y]),px[x,y]) for x,y in pts); top=[c for _,c in cols[int(0.7*len(cols)):]]
    C=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    print(f"  {lab}: CSS {(bx-ax+1)/sc:.1f}x{(by-ay+1)/sc:.1f} centre=({((ax+bx)/2-ox)/sc:.1f},{((ay+by)/2-oy)/sc:.1f}) aire/bbox={len(pts)/((bx-ax+1)*(by-ay+1)):.2f} RGB={C}")
for i,(ry,cy) in enumerate([(185.33,173.47),(217.67,203.33),(250.0,233.19)],2):
    v(pr,18,376,3.0,147,167,ry+2,ry+25,f"REF voyant r{i}")
    v(pc,18,18,3.6,146,164,cy+2,cy+23,f"CAP voyant r{i}")
