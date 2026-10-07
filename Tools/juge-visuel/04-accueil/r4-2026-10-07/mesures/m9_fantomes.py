# m9 — boutons FANTOMES (VOIR LA VENTE / BLANCHIR) : bbox par leur BORD (plus clair que le panneau)
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",[(1080,1250),(1340,1500)]),
     'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",[(1060,1240),(1250,1440)]),
     'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",[(1465,1645),(1655,1845)])}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def med(px,x0,y0,x1,y1):
    c=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): c[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in c)
for nom,(ch,zones) in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {im.size} ===")
    for (ya,yb) in zones:
        # bord : lum entre 22 et 60, dans x 600..1040 ; on compte par ligne et colonne
        pts=[(x,y) for y in range(ya,yb) for x in range(600,1040) if 22<lum(px[x,y])<62]
        if not pts: print(f"  zone {ya}..{yb} : rien"); continue
        # lignes avec >=120 px de bord -> bord haut/bas
        from collections import Counter
        cl=Counter(y for x,y in pts); cc=Counter(x for x,y in pts)
        lh=sorted([y for y,n in cl.items() if n>=120])
        cv=sorted([x for x,n in cc.items() if n>=50])
        if lh and cv:
            print(f"  zone {ya}..{yb} : bbox=({min(cv)},{min(lh)})..({max(cv)},{max(lh)}) l={max(cv)-min(cv)+1} h={max(lh)-min(lh)+1}")
            yc=(min(lh)+max(lh))//2; xc=(min(cv)+max(cv))//2
            print(f"     bord gauche RGB x={min(cv)-1}..{min(cv)+3} a y={yc} :", [px[x,yc] for x in range(min(cv)-1,min(cv)+4)])
            print(f"     interieur (hors texte) = {med(px,min(cv)+8,min(lh)+8,min(cv)+30,min(lh)+20)}   fond du panneau a gauche = {med(px,620,min(lh)+8,660,min(lh)+20)}")
            # rayon : retrait du bord gauche selon dy
            for dy in range(0,22,2):
                xs=[x for x in range(600,1040) if 22<lum(px[x,min(lh)+dy])<62]
                if xs: print(f"       dy={dy} : x {min(xs)}..{max(xs)} retrait={min(xs)-min(cv)}")
