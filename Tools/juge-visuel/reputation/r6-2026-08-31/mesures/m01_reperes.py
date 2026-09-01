# m01 - reperes: trouve le cadre dore (bordure) sur reference et captures, pose l'echelle.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
FILES={"ref_m120":D+"reference/m-120.png","ref_m119":D+"reference/m-119.png",
       "cap1920":S+"screen_b3_reputation_1080x1920.png","cap2400":S+"screen_b3_reputation_1080x2400.png",
       "cap_t1s":S+"screen_b3_reputation_1080x1920_t1s.png"}

def gold(p):
    r,g,b=p[:3]
    return r>120 and g>90 and b<110 and r>=g>b+30

for k,f in FILES.items():
    im=Image.open(f).convert("RGB"); W,H=im.size; px=im.load()
    print(f"== {k} {f.split('/')[-1]} size={W}x{H}")
    # colonnes: pour chaque y, compte pixels dores
    rows=[]
    for y in range(H):
        c=sum(1 for x in range(0,W,2) if gold(px[x,y]))
        rows.append(c)
    # lignes horizontales dorees longues (>60% largeur)
    thr=0.55*(W//2)
    hl=[y for y,c in enumerate(rows) if c>thr]
    # regroupe
    grp=[];cur=[hl[0]] if hl else []
    for y in hl[1:]:
        if y-cur[-1]<=2: cur.append(y)
        else: grp.append((cur[0],cur[-1])); cur=[y]
    if cur: grp.append((cur[0],cur[-1]))
    print("  lignes dorees horizontales (y0,y1):",grp)
    cols=[]
    for x in range(W):
        c=sum(1 for y in range(0,H,2) if gold(px[x,y]))
        cols.append(c)
    thc=0.20*(H//2)
    vl=[x for x,c in enumerate(cols) if c>thc]
    grp2=[];cur=[vl[0]] if vl else []
    for x in vl[1:]:
        if x-cur[-1]<=2: cur.append(x)
        else: grp2.append((cur[0],cur[-1])); cur=[x]
    if cur: grp2.append((cur[0],cur[-1]))
    print("  colonnes dorees verticales (x0,x1):",grp2)
