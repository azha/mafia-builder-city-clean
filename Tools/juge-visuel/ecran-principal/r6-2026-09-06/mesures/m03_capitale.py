# m03 — capitale SOUS-PIXEL par profil de couverture (bord a MI-AMPLITUDE du plateau)
# Controle POSITIF : la meme grandeur mesuree sur la reference par deux fenetres differentes.
from lib import *

def cover_rows(im,x0,y0,x1,y1):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    s=sorted(ls); bg=s[len(s)//8]; pk=s[-max(1,len(s)//60)]
    rows=[]
    for y in range(y0,y1):
        c=0.0
        for x in range(x0,x1):
            v=(lum(im.getpixel((x,y)))-bg)/(pk-bg)
            c+= 0.0 if v<0 else (1.0 if v>1 else v)
        rows.append(c)
    return rows,bg,pk

def cap(im,box,label,s):
    rows,bg,pk=cover_rows(im,*box)
    y0=box[1]
    plateau=median([r for r in rows if r>0.35*max(rows)])
    half=0.5*plateau
    # premier passage montant
    top=None;bot=None
    for i in range(1,len(rows)):
        if rows[i-1]<half<=rows[i] and top is None:
            top=y0+i-1+(half-rows[i-1])/(rows[i]-rows[i-1])
    for i in range(len(rows)-1,0,-1):
        if rows[i]<half<=rows[i-1] and bot is None:
            bot=y0+i-1+(rows[i-1]-half)/(rows[i-1]-rows[i])
    h=(bot-top)
    print(f"    {label:30s} plateau={plateau:6.2f}  haut={top:7.2f} bas={bot:7.2f}  "
          f"capitale = {h:6.2f} px = {h/s:5.2f} CSS")
    return h/s

print("== m03 capitale sous-pixel ==")
r=load(REF)
print("  --- REFERENCE (x3) ---")
a1=cap(r,(48,26,178,52),'ARGENT ref  (fenetre A)',S_REF)
a2=cap(r,(48,24,178,54),'ARGENT ref  (fenetre B, +/-2px)',S_REF)   # CONTROLE POSITIF
print(f"    controle positif : |A-B| = {abs(a1-a2):.3f} CSS")
#cap(r,(1002,26,1122,56),'SOIREE ref',S_REF)
print()
for p,nm in [(CAP19,'1080x1920'),(CAP24,'1080x2400'),(DIS24,'district 2400')]:
    im=load(p); print(f"  --- {nm} (x2.7551) ---")
    b1=cap(im,(177,24,284,50),'ARGENT jeu  (fenetre A)',S_CAP)
    b2=cap(im,(177,22,284,52),'ARGENT jeu  (fenetre B)',S_CAP)
    print(f"    controle positif : |A-B| = {abs(b1-b2):.3f} CSS")
    print()
