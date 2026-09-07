# -*- coding: utf-8 -*-
"""Repères horizontaux : bandes de l'image, par transition de couleur mediane de ligne.
Controle positif : la largeur des deux images doit etre 1080 (echelle x3,6 CSS=300 des deux cotes).
Controle negatif : les hauteurs different (2102 vs 2400) -> l'instrument doit le dire.
PIL seulement."""
from PIL import Image

def med(vals):
    v=sorted(vals); n=len(v)
    return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2

def profil(path, x0=20, x1=1060, pas=8):
    im=Image.open(path).convert('RGB')
    W,H=im.size
    print("OUVERT %s  taille=%dx%d  mode=%s"%(path,W,H,im.mode))
    px=im.load()
    rows=[]
    xs=list(range(x0,min(x1,W),pas))
    for y in range(H):
        r=med([px[x,y][0] for x in xs]); g=med([px[x,y][1] for x in xs]); b=med([px[x,y][2] for x in xs])
        rows.append((r,g,b))
    return (W,H,rows)

def transitions(rows, seuil=18):
    out=[]
    for y in range(1,len(rows)):
        d=sum(abs(rows[y][c]-rows[y-1][c]) for c in range(3))
        if d>=seuil: out.append((y,d,rows[y-1],rows[y]))
    return out

for p,lab in [("reference-1080x2102.png","REF"),("capture-1080x2400.png","CAP"),("hud-canon-1176.png","HUD")]:
    W,H,rows=profil(p)
    tr=transitions(rows)
    # fusionne les transitions adjacentes (<4 px) en gardant la plus forte
    grp=[]
    for t in tr:
        if grp and t[0]-grp[-1][-1][0]<=4: grp[-1].append(t)
        else: grp.append([t])
    print("  %s : %d transitions groupees (seuil somme|dRGB|>=18)"%(lab,len(grp)))
    for g in grp:
        best=max(g,key=lambda t:t[1])
        print("    y=%4d  d=%3d  avant=%s  apres=%s   (groupe %d..%d)"%(best[0],best[1],best[2],best[3],g[0][0],g[-1][0]))
    print()
