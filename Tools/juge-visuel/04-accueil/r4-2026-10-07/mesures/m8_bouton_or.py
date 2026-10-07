# m8 — bouton OR (COMMANDER) : bbox par composante connexe du masque or vif.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",830,1100),
     'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",830,1100),
     'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1240,1500)}
def med(px,x0,y0,x1,y1):
    c=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): c[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in c)
for nom,(ch,y0,y1) in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {im.size} ===")
    masque=lambda p: p[0]>130 and (p[0]-p[2])>70
    # lignes contenant >=50 px or dans x 560..1045
    lg=[y for y in range(y0,y1) if sum(1 for x in range(640,1046) if masque(px[x,y]))>=50]
    if not lg: print("  aucun"); continue
    by0,by1=min(lg),max(lg)
    cl=[x for x in range(640,1046) if sum(1 for y in range(by0,by1+1) if masque(px[x,y]))>=20]
    bx0,bx1=min(cl),max(cl)
    print(f"  COMMANDER bbox=({bx0},{by0})..({bx1},{by1}) l={bx1-bx0+1} h={by1-by0+1}")
    yc=(by0+by1)//2
    print(f"   remplissage : haut(y={by0+8})={med(px,bx0+60,by0+5,bx1-60,by0+11)}  milieu={med(px,bx0+20,yc-3,bx0+60,yc+3)}  bas={med(px,bx0+60,by1-11,bx1-60,by1-5)}")
    # rayon : largeur de la plage or ligne par ligne depuis le haut
    for dy in range(0,26,2):
        xs=[x for x in range(640,1046) if masque(px[x,by0+dy])]
        if xs: print(f"   y={by0+dy}: x {min(xs)}..{max(xs)} (retrait gauche {min(xs)-bx0})")
    # bord
    print(f"   bord haut au centre : ", [px[(bx0+bx1)//2, by0-2+k] for k in range(0,7)])
    print(f"   bord gauche au milieu: ", [px[bx0-3+k, yc] for k in range(0,8)])
