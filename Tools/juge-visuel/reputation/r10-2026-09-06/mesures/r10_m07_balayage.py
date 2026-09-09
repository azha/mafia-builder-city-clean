# r10-m07 : la ligne de balayage teal (.elast::after) : position v, epaisseur, profil d'intensite.
# Score teal = (G+B)/2 - R, mesure dans une colonne de FOND du panneau (hors carte, hors tuiles).
# Controle positif : hors de la ligne, le score doit etre proche de 0 (fond bleu-nuit neutre).
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452),
    "CAP":(D+"capture-1080x2400.png",18,18)}
def score(p): return (p[1]+p[2])/2.0-p[0]
for k,(p,x0,y0) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"{k} taille={im.size}")
    # colonne u=500..515 : gouttiere entre carte portrait et tuiles (fond du .elast)
    best=[]
    for v in range(400,1160):
        s=sum(score(px[x0+u,y0+v]) for u in range(492,512))/20.0
        best.append((s,v))
    best.sort(reverse=True)
    print("   pic teal dans la gouttiere u=492..512 : v=",best[0][1]," score=",round(best[0][0],1))
    vpic=best[0][1]
    for v in range(vpic-8,vpic+9):
        s=sum(score(px[x0+u,y0+v]) for u in range(492,512))/20.0
        print(f"      v={v:5d}  score={s:6.1f}")
    # profil horizontal a v = pic, sur toute la largeur du .elast
    print("   profil horizontal au pic (u de 40 a 1000, pas 60) :")
    row=[]
    for u in range(40,1001,60):
        s=sum(score(px[x0+u+d,y0+vpic]) for d in range(0,6))/6.0
        row.append((u,round(s,1)))
    print("     ",row)
