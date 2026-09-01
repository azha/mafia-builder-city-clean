# m08 - composantes connexes par classe de couleur dans la carte du portrait.
# Controle positif : la peau doit donner UNE grande composante (le visage) dans les deux images.
# Controle negatif : le fond de carte n'appartient a aucune classe (verifie en m07).
from PIL import Image
from collections import deque
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref_m120",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap1920",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
def cl(p):
    r,g,b=p
    if 160<r<205 and 145<g<195 and 115<b<175 and r-b>25: return "peau"
    if r>215 and g>208 and b>180: return "creme"
    if 60<r<155 and 60<g<165 and 55<b<155 and max(p)-min(p)<45: return "gris"
    return None
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); print(f"== {k} size={im.size} carte CSS {(x1-x0)/sc:.1f}x{(y1-y0)/sc:.1f}")
    px=im.load(); Wc=x1-x0; Hc=y1-y0
    lab={}
    for y in range(y0+2,y1-1):
        for x in range(x0+3,x1-2):
            c=cl(px[x,y])
            if c: lab[(x,y)]=c
    seen=set(); comps=[]
    for p0 in lab:
        if p0 in seen: continue
        c=lab[p0]; q=deque([p0]); seen.add(p0); pts=[]
        while q:
            x,y=q.popleft(); pts.append((x,y))
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                n=(x+dx,y+dy)
                if n in lab and n not in seen and lab[n]==c: seen.add(n); q.append(n)
        comps.append((len(pts),c,pts))
    comps.sort(reverse=True,key=lambda t:t[0])
    for n,c,pts in comps[:8]:
        if n<40: break
        ax=min(p[0] for p in pts);bx=max(p[0] for p in pts)
        ay=min(p[1] for p in pts);by=max(p[1] for p in pts)
        w=bx-ax+1;h=by-ay+1
        print(f"  {c:6s} aire={n:6d} bboxCSS={w/sc:6.1f}x{h/sc:6.1f} "
              f"centre%carte=({((ax+bx)/2-x0)/Wc*100:5.1f},{((ay+by)/2-y0)/Hc*100:5.1f}) "
              f"larg%carte={w/Wc*100:5.1f} haut%carte={h/Hc*100:5.1f} aire/bbox={n/(w*h):.3f}")
