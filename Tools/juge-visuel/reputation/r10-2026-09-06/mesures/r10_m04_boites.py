# r10-m04 : bbox des BOITES a liseré (fenetres .fen, tuiles .tl, panneau .pann, carte .prt, .elast)
# Detecteur : pixel "liseré" = luminance nettement > fond ET faible saturation bleue-grise.
# Controle positif : le nombre de filets horizontaux trouves pour les 3 fenetres = 2 par fenetre.
# Controle negatif : la meme detection sur une bande de FOND pur (gouttiere du cadre) rend 0.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,1058,2078),
    "CAP":(D+"capture-1080x2400.png",18,18,1061,1644)}

def load(k):
    p,x0,y0,x1,y1=IM[k]; im=Image.open(p).convert("RGB")
    print(f"{k}: {p.split('/')[-1]} taille={im.size} cadre y[{y0},{y1}] x[{x0},{x1}] h={y1-y0}")
    return im.load(),x0,y0,x1,y1

def runs_h(px, xa, xb, ya, yb, pred, minfrac=0.85):
    """lignes ou pred() est vrai sur >= minfrac de [xa,xb)"""
    out=[]
    for y in range(ya,yb):
        c=sum(1 for x in range(xa,xb) if pred(px[x,y]))
        if c>=minfrac*(xb-xa): out.append(y)
    # regrouper
    grp=[]; 
    for y in out:
        if grp and y-grp[-1][-1]<=2: grp[-1].append(y)
        else: grp.append([y])
    return [(g[0],g[-1]) for g in grp]

def runs_v(px, xa, xb, ya, yb, pred, minfrac=0.85):
    out=[]
    for x in range(xa,xb):
        c=sum(1 for y in range(ya,yb) if pred(px[x,y]))
        if c>=minfrac*(yb-ya): out.append(x)
    grp=[]
    for x in out:
        if grp and x-grp[-1][-1]<=2: grp[-1].append(x)
        else: grp.append([x])
    return [(g[0],g[-1]) for g in grp]

def lisere(p):
    r,g,b=p
    return 28<=r<=95 and 38<=g<=110 and 50<=b<=130 and b>r+6 and (r+g+b)>110
