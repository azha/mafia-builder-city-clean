# m7 — boutons : bbox, rayon, remplissage, bord, libelle.
# Le bouton OR se detecte par R-B>40 ; les boutons FANTOMES par leur bord plus clair que le panneau.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",(820,1630)),
     'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",(826,1455)),
     'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",(1233,1862))}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def med(px,x0,y0,x1,y1):
    c=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): c[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in c)
for nom,(ch,(y0,y1)) in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {ch.split('/')[-1]} {im.size} ===")
    # BOUTON OR : masque R-B>60 et lum>90, dans x 600..1040
    pts=[(x,y) for y in range(y0,y1) for x in range(600,1045) if (px[x,y][0]-px[x,y][2])>60 and lum(px[x,y])>90]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        bx0,bx1,by0,by1=min(xs),max(xs),min(ys),max(ys)
        print(f"  BOUTON OR bbox=({bx0},{by0})..({bx1},{by1})  l={bx1-bx0+1} h={by1-by0+1}")
        print(f"     remplissage haut={med(px,bx0+40,by0+6,bx1-40,by0+12)}  centre={med(px,bx0+40,(by0+by1)//2-3,bx0+120,(by0+by1)//2+3)}  bas={med(px,bx0+40,by1-12,bx1-40,by1-6)}")
        # rayon : sur la ligne du haut, x du premier pixel or ; on compare au bord
        ligne_h=[x for x in range(600,1045) if (px[x,by0+1][0]-px[x,by0+1][2])>60]
        ligne_m=[x for x in range(600,1045) if (px[x,(by0+by1)//2][0]-px[x,(by0+by1)//2][2])>60]
        if ligne_h and ligne_m: print(f"     rayon approx = {min(ligne_h)-min(ligne_m)} px (retrait du bord gauche a 1px du haut)")
    # BOUTONS FANTOMES : bord plus clair, x 600..1045 ; on detecte les lignes verticales de bord
    print("  boutons fantomes : lignes de bord detectees (col la plus claire par bande)")
    for (ya,yb,nomr) in [(y0,y1,'tout')]:
        pass
    # detection : pixels de bord = lum entre 25 et 60 et forme contigue verticale
    cols={}
    for y in range(y0,y1):
        for x in range(600,1045):
            p=px[x,y]
            if 25<lum(p)<75 and abs(p[2]-p[0])>3:
                cols.setdefault(x,0); cols[x]+=1
    forts=sorted([(n,x) for x,n in cols.items() if n>20], reverse=True)[:12]
    print("   colonnes a fort compte de bord :", sorted([(x,n) for n,x in forts]))
