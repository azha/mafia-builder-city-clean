# m07 - traits du portrait, segmentation confinee a la zone figure (20%..88% de la carte)
# Controle positif: la couleur de peau (attendue EGALE) ; controle negatif: la carte (fond) ne doit
# etre classee dans aucun trait.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref_m120",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
def classes(p):
    r,g,b=p
    if r>160 and g>150 and b>120 and 200>r and r-b>25: return "peau"
    if r>215 and g>208 and b>180: return "creme(col)"
    if 60<r<150 and 60<g<160 and 55<b<150 and max(p)-min(p)<45: return "gris(montre)"
    return None
def med(vals):
    vals=sorted(vals); return vals[len(vals)//2]
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); print(f"== {k} size={im.size} carte px=({x0},{y0},{x1},{y1}) largeur_carte_CSS={(x1-x0)/sc:.1f} hauteur={(y1-y0)/sc:.1f}")
    px=im.load(); Wc=x1-x0; Hc=y1-y0
    ya,yb=y0+int(0.20*Hc), y0+int(0.88*Hc)
    acc={}
    for y in range(ya,yb):
        for x in range(x0+3,x1-2):
            c=classes(px[x,y])
            if c:
                a=acc.setdefault(c,[x,y,x,y,0,[]])
                a[0]=min(a[0],x);a[1]=min(a[1],y);a[2]=max(a[2],x);a[3]=max(a[3],y);a[4]+=1;a[5].append(px[x,y])
    for c in ("peau","creme(col)","gris(montre)"):
        if c not in acc: print(f"  {c:12s} ABSENT"); continue
        ax,ay,bx,by,n,sm=acc[c]; w=bx-ax+1; h=by-ay+1
        R=med([s[0] for s in sm]);G=med([s[1] for s in sm]);B=med([s[2] for s in sm])
        print(f"  {c:12s} bbox CSS {w/sc:6.1f}x{h/sc:6.1f} | centre %carte x={((ax+bx)/2-x0)/Wc*100:5.1f} y={((ay+by)/2-y0)/Hc*100:5.1f}"
              f" | largeur %carte={w/Wc*100:5.1f} | aire/bbox={n/(w*h):.3f} | mediane RGB=({R},{G},{B})")
    # controle negatif : fond de carte
    print("   [ctrl neg] fond carte (x0+8,y0+8) =",px[x0+8,y0+8],"classe=",classes(px[x0+8,y0+8]))
