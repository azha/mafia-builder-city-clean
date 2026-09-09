# m02 — reperage des bandes de chrome : lignes ou une couleur OR/ORANGE domine, et lignes "vides"
# Controle positif : dans la reference, la ligne y=452 (trait dore sous le sous-titre) doit sortir en OR.
# Controle negatif : y=1500 de la capture (zone vide) ne doit PAS sortir en OR.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
def is_or(p):
    r,g,b=p
    return r>110 and g>75 and b<r*0.72 and r-b>45
def scan(name):
    im=Image.open(D+name).convert("RGB"); W,H=im.size
    print("=== %s taille=%dx%d"%(name,W,H))
    px=im.load()
    runs=[]; cur=None
    for y in range(H):
        c=sum(1 for x in range(W) if is_or(px[x,y]))
        if c>W*0.30:
            if cur is None: cur=[y,y,c,c]
            else: cur[1]=y; cur[2]=min(cur[2],c); cur[3]=max(cur[3],c)
        else:
            if cur is not None: runs.append(cur); cur=None
    if cur is not None: runs.append(cur)
    for a,b,cmin,cmax in runs:
        print("   bande OR y=%d..%d (h=%d) px_or/ligne %d..%d sur %d"%(a,b,b-a+1,cmin,cmax,W))
    # lignes quasi-noires (aucun contenu)
    vides=[]; cur=None
    for y in range(H):
        mx=max(max(px[x,y]) for x in range(0,W,3))
        if mx<=22:
            if cur is None: cur=[y,y]
            else: cur[1]=y
        else:
            if cur is not None: vides.append(cur); cur=None
    if cur is not None: vides.append(cur)
    for a,b in vides:
        if b-a>=25: print("   bande VIDE (max canal<=22) y=%d..%d  h=%d"%(a,b,b-a+1))
    return px,W,H
pr,_,_=scan("reference-1080x2102.png")
pc,_,_=scan("capture-1080x2400.png")
print("CTRL+ ref y=452 nb or =", sum(1 for x in range(1080) if is_or(pr[x,452])))
print("CTRL- cap y=1500 nb or =", sum(1 for x in range(1080) if is_or(pc[x,1500])))
