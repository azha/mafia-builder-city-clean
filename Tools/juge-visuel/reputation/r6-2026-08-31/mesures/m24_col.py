# m24 - le col : triangle creme (largeur/hauteur/remplissage), le cou (rect peau), leur recouvrement,
# et tout element supplementaire sous le triangle.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
def creme(p): r,g,b=p; return r>210 and g>202 and b>175
def peau(p): r,g,b=p; return 160<r<205 and 145<g<195 and 115<b<175 and r-b>25
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); Wc=x1-x0;Hc=y1-y0
    print(f"== {k} size={im.size} carte CSS {Wc/sc:.1f}x{Hc/sc:.1f}")
    C=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if creme(px[x,y])]
    P=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if peau(px[x,y])]
    for nom,S_ in (("triangle creme",C),):
        ax=min(p[0] for p in S_);bx=max(p[0] for p in S_);ay=min(p[1] for p in S_);by=max(p[1] for p in S_)
        print(f"  {nom}: bbox CSS {(bx-ax+1)/sc:.1f}x{(by-ay+1)/sc:.1f} "
              f"larg%carte={(bx-ax+1)/Wc*100:.1f} centre_x%carte={((ax+bx)/2-x0)/Wc*100:.1f} "
              f"aire/bbox={len(S_)/((bx-ax+1)*(by-ay+1)):.3f}")
        # largeur par ligne (doit decroitre lineairement pour un triangle)
        for yy in range(ay,by+1,max(1,(by-ay)//8)):
            xs=[x for x,y in S_ if y==yy]
            print(f"     y={((yy-y0)/Hc*100):5.1f}%carte  largeur={((max(xs)-min(xs)+1)/sc if xs else 0):5.1f}CSS  n={len(xs)}")
    # cou : rectangle peau le plus bas
    ys=sorted(set(y for x,y in P))
    # le cou = la partie sous le visage : prendre les lignes ou la largeur peau < 22 CSS
    cou=[(x,y) for x,y in P if len([1 for xx,yy in P if yy==y])<int(22*sc)]
    if cou:
        ax=min(p[0] for p in cou);bx=max(p[0] for p in cou);ay=min(p[1] for p in cou);by=max(p[1] for p in cou)
        print(f"  cou: bbox CSS {(bx-ax+1)/sc:.1f}x{(by-ay+1)/sc:.1f} bas%carte={(by-y0)/Hc*100:.1f} haut%carte={(ay-y0)/Hc*100:.1f}")
        tay=min(p[1] for p in C)
        print(f"  -> haut du triangle %carte={(tay-y0)/Hc*100:.1f} ; bas du cou %carte={(by-y0)/Hc*100:.1f} ; "
              f"RECOUVREMENT vertical = {(by-tay)/sc:.1f} CSS ({'OUI' if by>tay else 'non'})")
