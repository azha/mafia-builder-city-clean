# r10-m03 : structure verticale. Pour une bande x donnee, mediane de la ligne -> frontieres.
# Repere : coordonnees RELATIVES au haut du filet dore du cadre (ref y0=452 ; cap y0=18).
# Controle positif : la hauteur du cadre vaut 1626 px des deux cotes (imprime).
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(Image.open(D+"reference-1080x2102.png").convert("RGB"),21,452,1058,2078),
    "CAP":(Image.open(D+"capture-1080x2400.png").convert("RGB"),18,18,1061,1644)}
for k,(im,x0,y0,x1,y1) in IM.items():
    print(f"{k}: taille={im.size} cadre x[{x0},{x1}] y[{y0},{y1}] -> h={y1-y0} l={x1-x0}")

def med(vals):
    vals=sorted(vals); return vals[len(vals)//2]

def profil(k, xa, xb, label):
    im,x0,y0,x1,y1=IM[k]; px=im.load()
    print(f"\n--- {k} {label}  bande x abs [{xa},{xb}] ---")
    prev=None; out=[]
    for y in range(y0, y1+1):
        r=med([px[x,y][0] for x in range(xa,xb)])
        g=med([px[x,y][1] for x in range(xa,xb)])
        b=med([px[x,y][2] for x in range(xa,xb)])
        cur=(r,g,b)
        if prev is None or max(abs(cur[i]-prev[i]) for i in range(3))>4:
            out.append((y-y0, cur))
        prev=cur
    for v,c in out: print(f"   v={v:5d}  {c}")
